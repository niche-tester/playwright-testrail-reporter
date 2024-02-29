import TestRail, { AddResultsForCases } from "@dlenroc/testrail"
import {
    Reporter,
    TestCase,
    TestError,
    TestResult,
} from "@playwright/test/reporter"
import logger from "./logger"
import dotenv from "dotenv"

// Read from default ".env" file.
dotenv.config()

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

const api = new TestRail({
    host: process.env.TESTRAIL_HOST as string,
    password: process.env.TESTRAIL_PASSWORD as string,
    username: process.env.TESTRAIL_USERNAME as string,
})

const testResults: AddResultsForCases[] = []

export class TestRailReporter implements Reporter {
    async onBegin?() {
        if (!process.env.TESTRAIL_RUN_ID) {
            logger("No Existing 'TESTRAIL_RUN_ID' provided by user...")
            logger("Skipping reporting...")
        } else {
            logger(
                "Existing Test Run with ID " +
                    process.env.TESTRAIL_RUN_ID +
                    " will be used",
            )
        }
    }

    onTestEnd(test: TestCase, result: TestResult) {
        if (process.env.TESTRAIL_RUN_ID) {
            logger(
                `Test Case Completed : ${test.title} Status : ${result.status}`,
            )

            //Return no test case match with TestRail Case ID Regex
            const testCaseMatches = getTestCaseName(test.title)
            if (testCaseMatches != null) {
                try {
                    testCaseMatches.forEach((testCaseMatch) => {
                        const testId = parseInt(testCaseMatch.substring(1), 10)
                        //  Update test status if test case is not skipped
                        if (result.status != "skipped") {
                            const testComment = setTestComment(result)
                            const payload = {
                                case_id: testId,
                                status_id: StatusMap.get(result.status),
                                comment: testComment,
                            }
                            testResults.push(payload)
                        }
                    })
                } catch (error) {
                    console.log(error)
                }
            } else {
                logger("Test case could not be found WHY?")
            }
        }
    }

    async onEnd(): Promise<void> {
        if (process.env.TESTRAIL_RUN_ID) {
            const runId = parseInt(process.env.TESTRAIL_RUN_ID as string)
            logger(
                "Updating test status for the following TestRail Run ID: " +
                    runId,
            )
            await updateResultCases(runId, testResults)
        }
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
    } else {
        logger("No test case matches available")
    }
    return testCaseMatches[0]
}

// /**
//  * Create TestRail Test Run ID
//  * @param projectId
//  * @returns
//  */
// async function addTestRailRun(projectId: number) {
//     return await api
//         .addRun(projectId, {
//             include_all: true,
//             name: runName,
//             suite_id: suiteId,
//         })
//         .then(
//             (res) => {
//                 logger(
//                     'New TestRail run has been created: ' +
//                         process.env.TESTRAIL_HOST +
//                         '/index.php?/runs/view/' +
//                         res.id,
//                 );
//                 process.env.TESTRAIL_RUN_ID = res.id.toString();
//             },
//             (reason) => {
//                 logger('Failed to create new TestRail run: ' + reason);
//             },
//         );
// }

// /**
//  * Add Test Result for TestSuite by Test Case ID/s
//  * @param api
//  * @param runId
//  * @param caseId
//  * @param status
//  */
// async function addResultForSuite(
//     api: TestRail,
//     runId: number,
//     caseId: number,
//     status: number,
//     comment: string,
// ) {
//     await api
//         .addResultForCase(runId, caseId, {
//             status_id: status,
//             comment: comment,
//         })
//         .then(
//             (res) => {
//                 logger(
//                     'Updated status for caseId ' +
//                         caseId +
//                         ' for runId ' +
//                         runId,
//                 );
//             },
//             (reason) => {
//                 logger(
//                     'Failed to call Update Api due to ' +
//                         JSON.stringify(reason),
//                 );
//             },
//         );
// }
/**
 * Set Test comment for TestCase Failed | Passed
 * @param result
 * @returns
 */
function setTestComment(result: TestResult) {
    if (
        result.status == "failed" ||
        result.status == "timedOut" ||
        result.status == "interrupted"
    ) {
        return (
            "Test Status is " +
            result.status +
            " " +
            JSON.stringify(result.error)
        )
    } else {
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
    logger(payload)
    await api.addResultsForCases(runId, {
        results: payload,
    })
}
