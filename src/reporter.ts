import TestRail, { AddResultsForCases } from "@dlenroc/testrail"
import { FullConfig, FullResult, Reporter, Suite, TestCase, TestError, TestResult } from "@playwright/test/reporter"
import logger from "./logger"
  
/**
 * Mapping status within Playwright & TestRail
 */
const StatusMap = new Map<string, number>([
	["failed", 5],
	["passed", 1],
	["skipped", 3],
	["timedout", 5],
	["interrupted", 5],
])
/**
 * Initialise TestRail API credential auth
 */
const executionDateTime =  Date().toString().slice(4, 25)

const api = new TestRail({
	host: process.env.TESTRAIL_HOST as string,
	password: process.env.TESTRAIL_PASSWORD as string,
	username: process.env.TESTRAIL_USERNAME as string
})

const runName = process.env.TESTRAIL_RUN_NAME + " - Created On " + executionDateTime
const projectId = parseInt(process.env.TESTRAIL_PROJECT_ID as string)
const suiteId = parseInt(process.env.TESTRAIL_SUITE_ID as string)

const testResults: AddResultsForCases[] = []

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
					const payload = {
						case_id: testId,
						status_id: StatusMap.get(result.status),
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
	return await api.addRun(projectId, {
		include_all: true,
		name: runName,
		suite_id: suiteId,
	}).then(
		(res) => {
			logger("New TestRail run has been created: " + process.env.TESTRAIL_HOST +
				"/index.php?/runs/view/"+ res.id)
			process.env.TESTRAIL_RUN_ID = (res.id).toString()
		},
		(reason) => {
			logger("Failed to create new TestRail run: " + reason)
		})
}

/**
 * Add Test Result for TestSuite by Test Case ID/s
 * @param api
 * @param runId
 * @param caseId
 * @param status
 */
async function addResultForSuite(api: TestRail, runId: number, caseId: number, status: number, comment: string) {
	await api.addResultForCase(runId, caseId, {
		status_id: status,
		comment: comment
	}).then((res) => { logger("Updated status for caseId " + caseId + " for runId " + runId) }, 
	(reason) => { logger("Failed to call Update Api due to " + JSON.stringify(reason)) })
}
/**
 * Set Test comment for TestCase Failed | Passed
 * @param result
 * @returns
 */
function setTestComment(result: TestResult) {
	if (result.status == "failed" || result.status == "timedOut" || result.status == "interrupted") {
		return "Test Status is " + result.status + " " + JSON.stringify(result.error)
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
	await api.addResultsForCases(runId, {
		results: payload,
	}).then(
		(result) => {
			logger("Updated test results for Test Run: " + process.env.TESTRAIL_HOST +
				"/index.php?/runs/view/" + runId)
		},
		(reason) => {
			logger("Failed to update test results: " + JSON.stringify(reason))
		})
}