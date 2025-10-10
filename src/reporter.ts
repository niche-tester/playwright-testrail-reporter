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
 * Sanitize environment variable by removing surrounding quotes
 */
function sanitizeEnvVar(value: string | undefined): string {
	if (!value) return ''
	
	// Remove surrounding single or double quotes
	return value.replace(/^['"]|['"]$/g, '').trim()
}

/**
 * Validate required environment variables
 */
function validateEnvironmentVariables(): void {
	const requiredVars = [
		'TESTRAIL_HOST',
		'TESTRAIL_USERNAME', 
		'TESTRAIL_PROJECT_ID',
		'TESTRAIL_SUITE_ID'
	]
	
	const missingVars: string[] = []
	const invalidVars: string[] = []
	const warnings: string[] = []
	
	// Check for missing required variables
	for (const varName of requiredVars) {
		const value = sanitizeEnvVar(process.env[varName])
		if (!value) {
			missingVars.push(varName)
		}
	}
	
	// Validate TESTRAIL_HOST
	const host = sanitizeEnvVar(process.env.TESTRAIL_HOST || '')
	if (host) {
		// Check for common host mistakes
		if (host === 'localhost' || host.includes('localhost')) {
			invalidVars.push('TESTRAIL_HOST (localhost not supported - use your TestRail cloud URL)')
		} else if (host.includes('your-domain') || host.includes('<') || host.includes('>')) {
			invalidVars.push('TESTRAIL_HOST (contains placeholder text - replace with actual domain)')
		} else if (host.includes('testrai.io')) {
			invalidVars.push('TESTRAIL_HOST (typo detected - should be "testrail.io" not "testrai.io")')
		} else if (!host.includes('.')) {
			invalidVars.push('TESTRAIL_HOST (invalid domain format - should be like "company.testrail.io")')
		} else if (host.startsWith('http://')) {
			warnings.push('TESTRAIL_HOST uses http:// - consider using https:// for security')
		} else if (host.endsWith('//')) {
			invalidVars.push('TESTRAIL_HOST (has extra trailing slashes)')
		}
	}
	
	// Validate USERNAME
	const username = sanitizeEnvVar(process.env.TESTRAIL_USERNAME || '')
	if (username) {
		if (username.includes('@example.com') || username === 'your-username') {
			invalidVars.push('TESTRAIL_USERNAME (contains placeholder text - use your actual email)')
		} else if (!username.includes('@')) {
			warnings.push('TESTRAIL_USERNAME typically should be an email address')
		}
	}
	
	// Validate API KEY/PASSWORD
	const apiKey = sanitizeEnvVar(process.env.TESTRAIL_API_KEY) || sanitizeEnvVar(process.env.TESTRAIL_PASSWORD)
	if (apiKey) {
		if (apiKey === 'your-api-key' || apiKey === 'your-password' || apiKey === 'example-api-key') {
			invalidVars.push('TESTRAIL_API_KEY/PASSWORD (contains placeholder text - use your actual API key)')
		} else if (apiKey.length < 10) {
			warnings.push('TESTRAIL_API_KEY/PASSWORD seems unusually short - verify it\'s correct')
		}
	}
	
	// Check for invalid numeric values
	const projectIdStr = sanitizeEnvVar(process.env.TESTRAIL_PROJECT_ID) || '0'
	const suiteIdStr = sanitizeEnvVar(process.env.TESTRAIL_SUITE_ID) || '0'
	
	// Check for common numeric mistakes
	if (projectIdStr === 'null' || projectIdStr === 'undefined') {
		invalidVars.push('TESTRAIL_PROJECT_ID (contains literal "null" or "undefined" - use actual number)')
	} else if (projectIdStr.includes('.')) {
		invalidVars.push('TESTRAIL_PROJECT_ID (decimal numbers not allowed - use whole numbers)')
	} else if (projectIdStr === 'true' || projectIdStr === 'false') {
		invalidVars.push('TESTRAIL_PROJECT_ID (boolean not allowed - use actual project ID number)')
	} else {
		const projectId = parseInt(projectIdStr)
		if (isNaN(projectId) || projectId <= 0) {
			invalidVars.push('TESTRAIL_PROJECT_ID (must be a positive number)')
		}
	}
	
	if (suiteIdStr === 'null' || suiteIdStr === 'undefined') {
		invalidVars.push('TESTRAIL_SUITE_ID (contains literal "null" or "undefined" - use actual number)')
	} else if (suiteIdStr.includes('.')) {
		invalidVars.push('TESTRAIL_SUITE_ID (decimal numbers not allowed - use whole numbers)')
	} else if (suiteIdStr === 'true' || suiteIdStr === 'false') {
		invalidVars.push('TESTRAIL_SUITE_ID (boolean not allowed - use actual suite ID number)')
	} else {
		const suiteId = parseInt(suiteIdStr)
		if (isNaN(suiteId) || suiteId <= 0) {
			invalidVars.push('TESTRAIL_SUITE_ID (must be a positive number)')
		}
	}
	
	// Check for missing API credentials
	if (!apiKey) {
		missingVars.push('TESTRAIL_API_KEY or TESTRAIL_PASSWORD')
	}
	
	// Report errors and warnings
	if (missingVars.length > 0 || invalidVars.length > 0) {
		logger('❌ TestRail configuration errors detected:')
		
		if (missingVars.length > 0) {
			logger(`   Missing required variables: ${missingVars.join(', ')}`)
		}
		
		if (invalidVars.length > 0) {
			logger(`   Invalid values: ${invalidVars.join(', ')}`)
		}
		
		logger('ℹ️  Please check your environment variables. Common issues:')
		logger('   - Remove extra quotes: Use TESTRAIL_HOST=https://... not TESTRAIL_HOST="\'https://...\'"')
		logger('   - Replace placeholder text with actual values')
		logger('   - Ensure numeric IDs are valid positive integers')
		logger('   - Use your actual TestRail domain (e.g., company.testrail.io)')
		logger('   - Set all required variables listed above')
		
		throw new Error('Invalid TestRail configuration')
	}
	
	// Show warnings (non-fatal)
	if (warnings.length > 0) {
		warnings.forEach(warning => logger(`⚠️  ${warning}`))
	}
}

/**
 * Initialise TestRail API credential auth
 */
const executionDateTime =  Date().toString().slice(4, 25)

// Validate environment variables before proceeding (skip during testing)
if (process.env.NODE_ENV !== 'test') {
	validateEnvironmentVariables()
}

// Support both TESTRAIL_API_KEY (new) and TESTRAIL_PASSWORD (legacy) for backward compatibility
const apiKey = sanitizeEnvVar(process.env.TESTRAIL_API_KEY) || sanitizeEnvVar(process.env.TESTRAIL_PASSWORD) || ''

const api = new TestRail({
	domain: sanitizeEnvVar(process.env.TESTRAIL_HOST || '').replace(/^https?:\/\//, ''),
	password: apiKey,
	username: sanitizeEnvVar(process.env.TESTRAIL_USERNAME || '')
})

const runName = (sanitizeEnvVar(process.env.TESTRAIL_RUN_NAME) || 'Test Run') + " - Created On " + executionDateTime
const projectId = parseInt(sanitizeEnvVar(process.env.TESTRAIL_PROJECT_ID) || '0')
const suiteId = parseInt(sanitizeEnvVar(process.env.TESTRAIL_SUITE_ID) || '0')

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
		logger(`🎉 New TestRail run created: ${sanitizeEnvVar(process.env.TESTRAIL_HOST)}/index.php?/runs/view/${runId}`)
		process.env.TESTRAIL_RUN_ID = runId.toString()
	} catch (reason: any) {
		logger(`❌ Failed to create TestRail run: ${reason.message || reason}`)
		
		// Provide helpful error messages for common issues
		if (reason.message && reason.message.includes('Authentication failed')) {
			logger('💡 Check your TESTRAIL_USERNAME and TESTRAIL_API_KEY/TESTRAIL_PASSWORD')
		} else if (reason.message && reason.message.includes('not found')) {
			logger('💡 Check your TESTRAIL_PROJECT_ID and TESTRAIL_SUITE_ID are correct')
		} else if (reason.message && reason.message.includes('permission')) {
			logger('💡 Your TestRail user may not have permission to create test runs')
		} else if (reason.code === 'ENOTFOUND' || reason.code === 'ECONNREFUSED') {
			logger('💡 Check your TESTRAIL_HOST and network connectivity')
		}
		
		if (reason.response && reason.response.data) {
			logger(`❌ TestRail API Response: ${stringify(reason.response.data)}`)
		}
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
		// Validate runId before making API call
		if (!runId || isNaN(runId)) {
			throw new Error(`Invalid run ID: ${runId}. This usually means TestRail run creation failed earlier.`)
		}
		
		await api.addResultsForCases(runId, payload)
		logger(`✅ Successfully updated test results: ${sanitizeEnvVar(process.env.TESTRAIL_HOST)}/index.php?/runs/view/${runId}`)
	} catch (reason: any) {
		logger(`❌ Failed to update test results. Error: ${reason.message || reason}`)
		
		// Provide helpful error messages for common issues
		if (reason.message && reason.message.includes('Invalid run ID')) {
			logger('💡 The TestRail run was not created successfully. Check the error messages above.')
		} else if (reason.message && reason.message.includes('Authentication failed')) {
			logger('💡 Check your TESTRAIL_USERNAME and TESTRAIL_API_KEY/TESTRAIL_PASSWORD')
		} else if (reason.message && reason.message.includes('not found')) {
			logger('💡 The TestRail run may have been deleted or you may not have access to it')
		}
		
		// Show TestRail API response if available (usually contains specific error details)
		if (reason.response && reason.response.data) {
			logger(`❌ TestRail API Response: ${stringify(reason.response.data)}`)
		}
		
		// Only show payload details in debug mode
		if (process.env.DEBUG === 'true' && Array.isArray(payload)) {
			logger(`🔍 Debug: Attempted to update ${payload.length} test result(s)`)
			logger(`🔍 Debug: Payload details: ${stringify(payload, null, 2)}`)
		}
	}
}
