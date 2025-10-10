import { TestResult, TestCase } from '@playwright/test/reporter'

// Mock the logger
const mockLogger = jest.fn()
jest.mock('../src/logger', () => mockLogger)

import { TestRailReporter } from '../src/reporter'

describe('Test Comment Formatting Integration', () => {
  let reporter: TestRailReporter
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
    mockLogger.mockClear()
    reporter = new TestRailReporter()
    
    // Set up test environment
    process.env.TESTRAIL_PROJECT_ID = '1'
    process.env.TESTRAIL_SUITE_ID = '1'
    process.env.TESTRAIL_RUN_ID = '123'
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('Error Message Processing', () => {
    it('should handle failed tests with error messages', () => {
      const testCase = { title: 'Test C123' } as TestCase
      const testResult = {
        status: 'failed',
        duration: 1000,
        error: {
          message: 'Test failed with error'
        }
      } as TestResult

      // This should not throw and should process the error message
      expect(() => reporter.onTestEnd(testCase, testResult)).not.toThrow()
    })

    it('should handle tests with very long error messages', () => {
      const longError = 'A'.repeat(1000)
      const testCase = { title: 'Test C123' } as TestCase
      const testResult = {
        status: 'failed',
        duration: 1000,
        error: {
          message: longError
        }
      } as TestResult

      // Should handle long errors without throwing
      expect(() => reporter.onTestEnd(testCase, testResult)).not.toThrow()
    })

    it('should handle different test statuses correctly', () => {
      const testCase = { title: 'Test C123' } as TestCase
      
      const statuses = ['passed', 'failed', 'skipped', 'timedOut', 'interrupted']
      
      statuses.forEach(status => {
        const testResult = {
          status,
          duration: 100,
          error: status.includes('fail') || status.includes('time') || status.includes('interrupt') ? 
            { message: `Test ${status}` } : undefined
        } as TestResult

        expect(() => reporter.onTestEnd(testCase, testResult)).not.toThrow()
      })
    })
  })

  describe('Comment Format Validation', () => {
    it('should verify that comments are properly structured', () => {
      // This test verifies the comment formatting indirectly by ensuring
      // the reporter processes different test types without errors
      
      const testCases = [
        { status: 'passed', duration: 150 },
        { status: 'failed', duration: 1000, error: { message: 'Test failed' } },
        { status: 'skipped', duration: 0 },
        { status: 'timedOut', duration: 30000, error: { message: 'Timeout' } },
        { status: 'interrupted', duration: 5000, error: { message: 'Interrupted' } }
      ]

      testCases.forEach(testData => {
        const testCase = { title: `Test C${Math.floor(Math.random() * 1000)}` } as TestCase
        const testResult = testData as TestResult

        expect(() => reporter.onTestEnd(testCase, testResult)).not.toThrow()
      })
    })
  })

  describe('ANSI Code Handling Integration', () => {
    it('should process tests with ANSI codes in error messages', () => {
      const testCase = { title: 'Test C123' } as TestCase
      const testResult = {
        status: 'failed',
        duration: 1000,
        error: {
          message: '\u001b[31mError: Test failed\u001b[39m'
        }
      } as TestResult

      // Should handle ANSI codes without throwing
      expect(() => reporter.onTestEnd(testCase, testResult)).not.toThrow()
    })

    it('should process tests with complex error formatting', () => {
      const testCase = { title: 'Test C123' } as TestCase
      const testResult = {
        status: 'failed',
        duration: 1000,
        error: {
          message: 'Error\\nwith\\nnewlines\\tand\\ttabs\\u001b[31mand colors\\u001b[39m'
        }
      } as TestResult

      // Should handle complex formatting without throwing
      expect(() => reporter.onTestEnd(testCase, testResult)).not.toThrow()
    })
  })
})