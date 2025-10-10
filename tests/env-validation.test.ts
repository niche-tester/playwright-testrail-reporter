import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'

// Mock the validation function to test it directly
const mockValidateEnvironmentVariables = () => {
  // Clear module cache to get fresh instance
  jest.resetModules()
  
  // Temporarily set NODE_ENV to something other than 'test' to trigger validation
  const originalNodeEnv = process.env.NODE_ENV
  process.env.NODE_ENV = 'production'
  
  try {
    require('../src/reporter')
  } finally {
    // Restore NODE_ENV
    process.env.NODE_ENV = originalNodeEnv
  }
}

describe('Environment Variable Validation', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env }
    
    // Clear TestRail env vars
    delete process.env.TESTRAIL_HOST
    delete process.env.TESTRAIL_USERNAME
    delete process.env.TESTRAIL_API_KEY
    delete process.env.TESTRAIL_PASSWORD
    delete process.env.TESTRAIL_PROJECT_ID
    delete process.env.TESTRAIL_SUITE_ID
    delete process.env.TESTRAIL_RUN_NAME
    
    // Clear module cache to force re-evaluation
    jest.resetModules()
  })

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv
    jest.resetModules()
  })

  it('should throw error when required environment variables are missing', () => {
    expect(() => {
      mockValidateEnvironmentVariables()
    }).toThrow('Invalid TestRail configuration')
  })

  it('should sanitize environment variables with extra quotes', () => {
    // Set environment variables with problematic quotes (like the user's original issue)
    process.env.TESTRAIL_HOST = "'https://company.testrail.io'"
    process.env.TESTRAIL_USERNAME = "'user@company.com'"
    process.env.TESTRAIL_API_KEY = "'test-api-key-12345'"
    process.env.TESTRAIL_PROJECT_ID = "'123'"
    process.env.TESTRAIL_SUITE_ID = "'456'"

    // Should not throw error because quotes are sanitized
    expect(() => {
      mockValidateEnvironmentVariables()
    }).not.toThrow()
  })

  it('should throw error for invalid numeric IDs', () => {
    process.env.TESTRAIL_HOST = "https://company.testrail.io"
    process.env.TESTRAIL_USERNAME = "user@company.com"
    process.env.TESTRAIL_API_KEY = "test-api-key-12345"
    process.env.TESTRAIL_PROJECT_ID = "invalid"
    process.env.TESTRAIL_SUITE_ID = "456"

    expect(() => {
      mockValidateEnvironmentVariables()
    }).toThrow('Invalid TestRail configuration')
  })

  it('should throw error for zero or negative numeric IDs', () => {
    process.env.TESTRAIL_HOST = "https://company.testrail.io"
    process.env.TESTRAIL_USERNAME = "user@company.com"
    process.env.TESTRAIL_API_KEY = "test-api-key-12345"
    process.env.TESTRAIL_PROJECT_ID = "0"
    process.env.TESTRAIL_SUITE_ID = "-1"

    expect(() => {
      mockValidateEnvironmentVariables()
    }).toThrow('Invalid TestRail configuration')
  })

  it('should accept legacy TESTRAIL_PASSWORD instead of TESTRAIL_API_KEY', () => {
    process.env.TESTRAIL_HOST = "https://company.testrail.io"
    process.env.TESTRAIL_USERNAME = "user@company.com"
    process.env.TESTRAIL_PASSWORD = "test-password-12345"  // Using legacy var
    process.env.TESTRAIL_PROJECT_ID = "123"
    process.env.TESTRAIL_SUITE_ID = "456"

    expect(() => {
      mockValidateEnvironmentVariables()
    }).not.toThrow()
  })

  it('should handle mixed quote types in environment variables', () => {
    process.env.TESTRAIL_HOST = "'https://company.testrail.io'"      // Single quotes
    process.env.TESTRAIL_USERNAME = '"user@company.com"'            // Double quotes
    process.env.TESTRAIL_API_KEY = "mixed-quotes-12345"             // No quotes
    process.env.TESTRAIL_PROJECT_ID = "'123'"
    process.env.TESTRAIL_SUITE_ID = '"456"'

    expect(() => {
      mockValidateEnvironmentVariables()
    }).not.toThrow()
  })

  // Test common user mistakes
  it('should detect localhost URLs', () => {
    process.env.TESTRAIL_HOST = "localhost:3000"
    process.env.TESTRAIL_USERNAME = "user@company.com"
    process.env.TESTRAIL_API_KEY = "test-key-12345"
    process.env.TESTRAIL_PROJECT_ID = "123"
    process.env.TESTRAIL_SUITE_ID = "456"

    expect(() => {
      mockValidateEnvironmentVariables()
    }).toThrow('Invalid TestRail configuration')
  })

  it('should detect placeholder text in environment variables', () => {
    process.env.TESTRAIL_HOST = "https://your-domain.testrail.io"
    process.env.TESTRAIL_USERNAME = "your-username"
    process.env.TESTRAIL_API_KEY = "your-api-key"
    process.env.TESTRAIL_PROJECT_ID = "123"
    process.env.TESTRAIL_SUITE_ID = "456"

    expect(() => {
      mockValidateEnvironmentVariables()
    }).toThrow('Invalid TestRail configuration')
  })

  it('should detect common typos in domain', () => {
    process.env.TESTRAIL_HOST = "https://company.testrai.io"  // Missing 'l'
    process.env.TESTRAIL_USERNAME = "user@company.com"
    process.env.TESTRAIL_API_KEY = "test-key-12345"
    process.env.TESTRAIL_PROJECT_ID = "123"
    process.env.TESTRAIL_SUITE_ID = "456"

    expect(() => {
      mockValidateEnvironmentVariables()
    }).toThrow('Invalid TestRail configuration')
  })

  it('should detect boolean values in numeric fields', () => {
    process.env.TESTRAIL_HOST = "https://company.testrail.io"
    process.env.TESTRAIL_USERNAME = "user@company.com"
    process.env.TESTRAIL_API_KEY = "test-key-12345"
    process.env.TESTRAIL_PROJECT_ID = "true"  // Boolean instead of number
    process.env.TESTRAIL_SUITE_ID = "false"   // Boolean instead of number

    expect(() => {
      mockValidateEnvironmentVariables()
    }).toThrow('Invalid TestRail configuration')
  })

  it('should detect decimal numbers in ID fields', () => {
    process.env.TESTRAIL_HOST = "https://company.testrail.io"
    process.env.TESTRAIL_USERNAME = "user@company.com"
    process.env.TESTRAIL_API_KEY = "test-key-12345"
    process.env.TESTRAIL_PROJECT_ID = "123.5"  // Decimal not allowed
    process.env.TESTRAIL_SUITE_ID = "456.0"    // Decimal not allowed

    expect(() => {
      mockValidateEnvironmentVariables()
    }).toThrow('Invalid TestRail configuration')
  })

  it('should detect literal null/undefined strings', () => {
    process.env.TESTRAIL_HOST = "https://company.testrail.io"
    process.env.TESTRAIL_USERNAME = "user@company.com"
    process.env.TESTRAIL_API_KEY = "test-key-12345"
    process.env.TESTRAIL_PROJECT_ID = "null"      // Literal string "null"
    process.env.TESTRAIL_SUITE_ID = "undefined"   // Literal string "undefined"

    expect(() => {
      mockValidateEnvironmentVariables()
    }).toThrow('Invalid TestRail configuration')
  })

  it('should detect invalid domain formats', () => {
    process.env.TESTRAIL_HOST = "testrail"  // No domain extension
    process.env.TESTRAIL_USERNAME = "user@company.com"
    process.env.TESTRAIL_API_KEY = "test-key-12345"
    process.env.TESTRAIL_PROJECT_ID = "123"
    process.env.TESTRAIL_SUITE_ID = "456"

    expect(() => {
      mockValidateEnvironmentVariables()
    }).toThrow('Invalid TestRail configuration')
  })

  it('should detect extra trailing slashes in URL', () => {
    process.env.TESTRAIL_HOST = "https://company.testrail.io//"  // Extra slashes
    process.env.TESTRAIL_USERNAME = "user@company.com"
    process.env.TESTRAIL_API_KEY = "test-key-12345"
    process.env.TESTRAIL_PROJECT_ID = "123"
    process.env.TESTRAIL_SUITE_ID = "456"

    expect(() => {
      mockValidateEnvironmentVariables()
    }).toThrow('Invalid TestRail configuration')
  })
})