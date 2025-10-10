// eslint-disable-next-line @typescript-eslint/no-var-requires
const TestRail = require("testrail-api-client").default
import { FullConfig, FullResult, Reporter, Suite, TestCase, TestError, TestResult } from "@playwright/test/reporter"
import logger from "./logger"
import stringify from "json-stringify-safe"

/**
 * Mapping status within Playwright & TestRail
 * Standard TestRail status IDs: 1=Passed, 2=Blocked, 3=Untested (read-only), 4=Retest, 5=Failed
 * Note: Status ID 3 (Untested) cannot be used to submit new results
 * Allow environment variable overrides for custom TestRail configurations
 */
const StatusMap = new Map<string, number>([
	["failed", parseInt(process.env.TESTRAIL_STATUS_FAILED || "5")],
	["passed", parseInt(process.env.TESTRAIL_STATUS_PASSED || "1")],
	["skipped", parseInt(process.env.TESTRAIL_STATUS_SKIPPED || "")], // No default - must be configured
	["timedOut", parseInt(process.env.TESTRAIL_STATUS_TIMEDOUT || "5")],
	["interrupted", parseInt(process.env.TESTRAIL_STATUS_INTERRUPTED || "5")],
])
/**
 * Initialise TestRail API credential auth
 */
const executionDateTime =  Date().toString().slice(4, 25)

// Support both TESTRAIL_API_KEY (new) and TESTRAIL_PASSWORD (legacy) for backward compatibility
const apiKey = process.env.TESTRAIL_API_KEY || process.env.TESTRAIL_PASSWORD || ''

const api = new TestRail({
	domain: (process.env.TESTRAIL_HOST || '').replace(/^https?:\/\//, ''),
	password: apiKey,
	username: process.env.TESTRAIL_USERNAME || ''
})

const runName = (process.env.TESTRAIL_RUN_NAME || 'Test Run') + " - Created On " + executionDateTime
const projectId = parseInt(process.env.TESTRAIL_PROJECT_ID || '0')
const suiteId = parseInt(process.env.TESTRAIL_SUITE_ID || '0')

const testResults: Array<{case_id: number, status_id: number | undefined, comment: string}> = []

export class TestRailReporter implements Reporter {
	async onBegin?(config: FullConfig, suite: Suite) {
		// Log deprecation warning if using old variable name
		if (process.env.TESTRAIL_PASSWORD && !process.env.TESTRAIL_API_KEY) {
			logger("⚠️  DEPRECATION WARNING: TESTRAIL_PASSWORD is deprecated. Please rename it to TESTRAIL_API_KEY for better clarity.")
		}
		
		if (!process.env.TESTRAIL_RUN_ID) {
			logger("ℹ️  No existing 'TESTRAIL_RUN_ID' provided by user. Creating a new TestRail run with all available test cases...")
			await addTestRailRun(projectId)

		} else {
			logger(`✅ Using existing Test Run with ID ${process.env.TESTRAIL_RUN_ID}`)
		}
	}

	onTestEnd(test: TestCase, result: TestResult) {
		logger(`Test completed: ${test.title} (${result.status})`)

		//Return no test case match with TestRail Case ID Regex
		const testCaseMatches = getTestCaseName(test.title)
		if (testCaseMatches != null) {

			testCaseMatches.forEach(testCaseMatch => {
				const testId = parseInt(testCaseMatch.substring(1), 10)
				const testComment = setTestComment(result)
				const statusId = StatusMap.get(result.status)
				
				// Handle skipped tests when no custom status is configured
				if (result.status === "skipped" && (!statusId || isNaN(statusId))) {
					logger(`⚠️ Detected skipped test case ${testId} but TESTRAIL_STATUS_SKIPPED environment variable is not configured. Cannot update TestRail with skipped status.`)
					logger(`ℹ️ To report skipped tests, set TESTRAIL_STATUS_SKIPPED to your TestRail's skipped status ID`)
					return // Skip this result
				}
				
				if (statusId === undefined || isNaN(statusId)) {
					logger(`⚠️ Unknown test status '${result.status}' for case ${testId}. Using failed status as fallback.`)
				}
				
				const payload = {
					case_id: testId,
					status_id: statusId || 5, // Fallback to failed status if unknown
					comment: testComment
				}
				testResults.push(payload)
			})
		}
	}

	async onEnd(result: FullResult): Promise<void> {
		const runId = parseInt(process.env.TESTRAIL_RUN_ID as string)
		logger(`📊 Updating ${testResults.length} test results for TestRail Run ID: ${runId}`)
		await updateResultCases(runId, testResults)
	}
	onError(error: TestError): void {
		logger(`💥 Reporter error: ${error.message}`)
	}
}
/**
 * Get list of matching Test IDs
 */
export function getTestCaseName(testname: string) {
	const testCaseIdRegex = /\bC(\d+)\b/g
	const testCaseMatches = [testname.match(testCaseIdRegex)]

	if (testCaseMatches[0] != null) {
		testCaseMatches[0].forEach((testCaseMatch) => {
			const testCaseId = parseInt(testCaseMatch.substring(1), 10)
			logger(`🎯 Matched TestRail Case ID: ${testCaseId}`)
		})
	}
	else {
		logger("⚠️ No TestRail case IDs found in test name")
	}
	return testCaseMatches[0]
}

/**
 * Create TestRail Test Run ID
 * @param projectId
 * @returns
 */
async function addTestRailRun(projectId: number) {
	try {
		// Get all test cases from the suite to include them in the run
		const cases = await api.getCases(projectId, suiteId)
		const caseIds = cases.map((testCase: any) => testCase.id)
		logger(`📋 Found ${caseIds.length} test cases to add to the run`)
		
		const runId = await api.addRun(runName, "", projectId, suiteId, caseIds)
		logger(`🎉 New TestRail run created: ${process.env.TESTRAIL_HOST}/index.php?/runs/view/${runId}`)
		process.env.TESTRAIL_RUN_ID = runId.toString()
	} catch (reason: any) {
		logger(`❌ Failed to create TestRail run: ${reason}`)
	}
}

/**
 * Set Test comment for TestCase Failed | Passed
 * @param result
 * @returns
 */
function setTestComment(result: TestResult) {
	if (result.status == "failed" || result.status == "timedOut" || result.status == "interrupted") {
		const errorString = stringify(result.error)
		// Basic cleanup for any remaining ANSI codes and string formatting
		const cleanedError = errorString
			.replace(/\\"/g, '"')                 // Unescape quotes
			.replace(/\\\\/g, '\\')               // Unescape backslashes
			.replace(/\\n/g, '\n')                // Convert literal \n to newlines
			.replace(/\\t/g, '\t')                // Convert literal \t to tabs
		
		const maxLength = 500
		const truncatedError = cleanedError.length > maxLength 
			? cleanedError.substring(0, maxLength) + "... [truncated]"
			: cleanedError
		return "Test Status: " + result.status + "\n" + truncatedError
	}
	else if (result.status == "skipped") {
		return "Test was skipped"
	}
	else {
		return "Test passed in " + result.duration + "ms"
	}
}

/**
 * Update TestResult for Multiple Cases
 * @param api
 * @param runId
 * @param payload
 */
async function updateResultCases(runId: number, payload: any) {
	try {
		await api.addResultsForCases(runId, payload)
		logger(`✅ Successfully updated test results: ${process.env.TESTRAIL_HOST}/index.php?/runs/view/${runId}`)
	} catch (reason: any) {
		logger(`❌ Failed to update test results. Error: ${reason.message || reason}`)
		if (reason.response && reason.response.data) {
			logger(`❌ TestRail API Response: ${stringify(reason.response.data)}`)
		}
		// Log the payload being sent for debugging
		logger(`❌ Payload sent: ${stringify(payload, null, 2)}`)
	}
}
