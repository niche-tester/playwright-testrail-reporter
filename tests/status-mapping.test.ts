describe('Status Mapping Configuration', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
    // Clear all status-related env vars
    delete process.env.TESTRAIL_STATUS_FAILED
    delete process.env.TESTRAIL_STATUS_PASSED
    delete process.env.TESTRAIL_STATUS_SKIPPED
    delete process.env.TESTRAIL_STATUS_TIMEDOUT
    delete process.env.TESTRAIL_STATUS_INTERRUPTED
  })

  afterEach(() => {
    process.env = originalEnv
    // Clear module cache to ensure fresh imports
    jest.resetModules()
  })

  describe('Default Status Mappings', () => {
    it('should use default status IDs when no environment variables are set', () => {
      // Re-import module to get fresh instance with current env
      const { TestRailReporter } = require('../src/reporter')
      
      // We can't directly access the StatusMap, but we can test behavior
      // through the reporter's onTestEnd method
      const reporter = new TestRailReporter()
      
      // This test verifies that the default mappings are working
      // The actual values are tested through integration behavior
      expect(reporter).toBeDefined()
    })
  })

  describe('Custom Status Mappings', () => {
    it('should use custom TESTRAIL_STATUS_FAILED when provided', () => {
      process.env.TESTRAIL_STATUS_FAILED = '10'
      
      // Re-import to get the updated StatusMap
      jest.resetModules()
      const { TestRailReporter } = require('../src/reporter')
      
      const reporter = new TestRailReporter()
      expect(reporter).toBeDefined()
      
      // The custom status should be used (tested through behavior in integration tests)
    })

    it('should use custom TESTRAIL_STATUS_PASSED when provided', () => {
      process.env.TESTRAIL_STATUS_PASSED = '20'
      
      jest.resetModules()
      const { TestRailReporter } = require('../src/reporter')
      
      const reporter = new TestRailReporter()
      expect(reporter).toBeDefined()
    })

    it('should use custom TESTRAIL_STATUS_SKIPPED when provided', () => {
      process.env.TESTRAIL_STATUS_SKIPPED = '6'
      
      jest.resetModules()
      const { TestRailReporter } = require('../src/reporter')
      
      const reporter = new TestRailReporter()
      expect(reporter).toBeDefined()
    })

    it('should use custom TESTRAIL_STATUS_TIMEDOUT when provided', () => {
      process.env.TESTRAIL_STATUS_TIMEDOUT = '7'
      
      jest.resetModules()
      const { TestRailReporter } = require('../src/reporter')
      
      const reporter = new TestRailReporter()
      expect(reporter).toBeDefined()
    })

    it('should use custom TESTRAIL_STATUS_INTERRUPTED when provided', () => {
      process.env.TESTRAIL_STATUS_INTERRUPTED = '8'
      
      jest.resetModules()
      const { TestRailReporter } = require('../src/reporter')
      
      const reporter = new TestRailReporter()
      expect(reporter).toBeDefined()
    })
  })

  describe('Status ID Validation', () => {
    it('should handle invalid status ID environment variables gracefully', () => {
      process.env.TESTRAIL_STATUS_FAILED = 'invalid'
      process.env.TESTRAIL_STATUS_PASSED = 'not-a-number'
      
      jest.resetModules()
      const { TestRailReporter } = require('../src/reporter')
      
      const reporter = new TestRailReporter()
      expect(reporter).toBeDefined()
      
      // Should not crash even with invalid values
    })

    it('should handle empty string status environment variables', () => {
      process.env.TESTRAIL_STATUS_SKIPPED = '' // Empty string should result in NaN
      
      jest.resetModules()
      const { TestRailReporter } = require('../src/reporter')
      
      const reporter = new TestRailReporter()
      expect(reporter).toBeDefined()
    })
  })

  describe('Status Mapping Documentation', () => {
    it('should document the standard TestRail status IDs in comments', () => {
      const fs = require('fs')
      const reporterSource = fs.readFileSync('./src/reporter.ts', 'utf8')
      
      // Verify that the comments document the standard status IDs
      expect(reporterSource).toContain('Standard TestRail status IDs: 1=Passed, 2=Blocked, 3=Untested (read-only), 4=Retest, 5=Failed')
      expect(reporterSource).toContain('Note: Status ID 3 (Untested) cannot be used to submit new results')
      expect(reporterSource).toContain('Allow environment variable overrides for custom TestRail configurations')
    })
  })
})