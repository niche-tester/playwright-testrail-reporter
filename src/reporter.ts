// eslint-disable-next-line @typescript-eslint/no-var-requires
const TestRail = require("testrail-api-client").default
import { FullConfig, FullResult, Reporter, Suite, TestCase, TestError, TestResult } from "@playwright/test/reporter"
import logger from "./logger"
import stringify from "json-stringify-safe"

/**
 * Mapping status within Playwright & TestRail
 */
const StatusMap = new Map<string, number>([
	["failed", 5],
	["passed", 1],
	["skipped", 3],
	["timedOut", 5],
	["interrupted", 5],
])
/**
 * Initialise TestRail API credential auth
 */
const executionDateTime =  Date().toString().slice(4, 25)

const api = new TestRail({
	domain: (process.env.TESTRAIL_HOST || '').replace(/^https?:\/\//, ''),
	password: process.env.TESTRAIL_PASSWORD || '',
	username: process.env.TESTRAIL_USERNAME || ''
})

const runName = (process.env.TESTRAIL_RUN_NAME || 'Test Run') + " - Created On " + executionDateTime
const projectId = parseInt(process.env.TESTRAIL_PROJECT_ID || '0')
const suiteId = parseInt(process.env.TESTRAIL_SUITE_ID || '0')

const testResults: Array<{case_id: number, status_id: number | undefined, comment: string}> = []

export class TestRailReporter implements Reporter {
	async onBegin?(config: FullConfig, suite: Suite) {
		if (!process.env.TESTRAIL_RUN_ID) {
			logger("No Existing 'TESTRAIL_RUN_ID' provided by user...")
			logger("Automatically creating a run...")
			await addTestRailRun(projectId)

		} else {
			logger("Existing Test Run with ID " + process.env.TESTRAIL_RUN_ID + " will be used")
		}
	}

	onTestEnd(test: TestCase, result: TestResult) {
		logger(`Test Case Completed : ${test.title} Status : ${result.status}`)

		//Return no test case match with TestRail Case ID Regex
		const testCaseMatches = getTestCaseName(test.title)
		if (testCaseMatches != null) {

			testCaseMatches.forEach(testCaseMatch => {
				const testId = parseInt(testCaseMatch.substring(1), 10)
				//Update test status if test case is not skipped
				if (result.status != "skipped") {
					const testComment = setTestComment(result)
					const statusId = StatusMap.get(result.status)
					
					if (statusId === undefined) {
						logger(`Warning: Unknown test status '${result.status}' for case ${testId}. Using status 5 (failed) as fallback.`)
					}
					
					const payload = {
						case_id: testId,
						status_id: statusId || 5, // Fallback to failed status if unknown
						comment: testComment
					}
					testResults.push(payload)
				}
			})
		}
	}

	async onEnd(result: FullResult): Promise<void> {
		const runId = parseInt(process.env.TESTRAIL_RUN_ID as string)
		logger("Updating test status for the following TestRail Run ID: " + runId)
		await updateResultCases(runId, testResults)
	}
	onError(error: TestError): void {
		logger(error.message)
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
			logger("Matched Test Case ID: " + testCaseId)
		})
	}
	else {
		logger("No test case matches available")
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
		logger(`Including ${caseIds.length} test cases in the run`)
		
		const runId = await api.addRun(runName, "", projectId, suiteId, caseIds)
		logger("New TestRail run has been created: " + process.env.TESTRAIL_HOST +
			"/index.php?/runs/view/"+ runId)
		process.env.TESTRAIL_RUN_ID = runId.toString()
	} catch (reason: any) {
		logger("Failed to create new TestRail run: " + reason)
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
		// Remove ANSI escape sequences and truncate very long error messages
		// eslint-disable-next-line no-control-regex
		const cleanedError = errorString.replace(/\u001b\[[0-9;]*m/g, '')
		const maxLength = 1000
		const truncatedError = cleanedError.length > maxLength 
			? cleanedError.substring(0, maxLength) + "... [truncated]"
			: cleanedError
		return "Test Status is " + result.status + " " + truncatedError
	}
	else {
		return "Test Passed within " + result.duration + " ms"
	}
}

/**
 * Update TestResult for Multiple Cases
 * @param api
 * @param runId
 * @param payload
 */
async function updateResultCases(runId: number, payload: any) {
	await api.addResultsForCases(runId, payload).then(
		(_result: any) => {
			logger("Updated test results for Test Run: " + process.env.TESTRAIL_HOST +
				"/index.php?/runs/view/" + runId)
		},
		(reason: any) => {
			logger("Failed to update test results: " + stringify(reason))
		})
}
