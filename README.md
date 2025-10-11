[![npm version](https://img.shields.io/npm/v/playwright-testrail-reporter.svg)](https://www.npmjs.com/package/playwright-testrail-reporter)

# playwright-testrail-reporter

playwright-testrail-reporter is a custom reporter for Playwright Test to seamlessly integrate with TestRail. The reporter automatically creates TestRail Runs and adds test results by matching test case IDs.

## Installation

```bash
npm install playwright-testrail-reporter
```

## Setup Guide

### Step 1: Get TestRail API Key

1. Log in to your TestRail instance
2. Click on your profile (top right) → "My Settings"
3. In the "API Keys" section, generate a new API key or copy an existing one
4. **Important**: Save this API key - you'll need it for the `TESTRAIL_API_KEY` variable

### Step 2: Find Your TestRail IDs

You'll need to find these IDs in your TestRail instance:

**Project ID:**
1. Go to your TestRail dashboard
2. Click on your project
3. Look at the URL: `https://yourinstance.testrail.io/index.php?/projects/overview/123`
4. The number at the end (`123`) is your Project ID

**Suite ID:**
1. In your project, click on "Test Suites & Cases"
2. Click on your test suite
3. Look at the URL: `https://yourinstance.testrail.io/index.php?/suites/view/456`
4. The number at the end (`456`) is your Suite ID

### Step 3: Create Environment Variables

Create a `.env` file in your project root with the following variables:

```bash
# Your TestRail instance URL (include https://)
TESTRAIL_HOST=https://yourcompany.testrail.io

# Your TestRail login email
TESTRAIL_USERNAME=your.email@company.com

# Your TestRail API key (from Step 1)
TESTRAIL_API_KEY=your_api_key_here

# Project ID (from Step 2)
TESTRAIL_PROJECT_ID=123

# Suite ID (from Step 2)  
TESTRAIL_SUITE_ID=456

# Name for your test runs (timestamp will be auto-added)
TESTRAIL_RUN_NAME=Automated Test Run

# Optional: Use existing run instead of creating new one
# TESTRAIL_RUN_ID=789

# Optional: Custom status mappings (check your TestRail → Administration → Customizations → Result Statuses)
# TESTRAIL_STATUS_PASSED=1        # Default: 1 (Passed)
# TESTRAIL_STATUS_FAILED=5        # Default: 5 (Failed)  
# TESTRAIL_STATUS_SKIPPED=6       # Required if you want to report skipped tests (no default)
# TESTRAIL_STATUS_TIMEDOUT=5      # Default: 5 (Failed)
# TESTRAIL_STATUS_INTERRUPTED=5   # Default: 5 (Failed)
```

**⚠️ Important Notes:**
- Use your **API key** for `TESTRAIL_API_KEY`, not your regular password
- Include `https://` in your `TESTRAIL_HOST`
- Don't commit the `.env` file to version control (add it to `.gitignore`)

**🔄 Backward Compatibility:**
- If you're upgrading from an older version, you can keep using `TESTRAIL_PASSWORD` (you'll see a deprecation warning)
- New projects should use `TESTRAIL_API_KEY` for clarity
- The reporter will show: `⚠️  DEPRECATION WARNING: TESTRAIL_PASSWORD is deprecated. Please rename it to TESTRAIL_API_KEY for better clarity.`

## Usage

### Step 4: Configure Playwright

Add the TestRail reporter to your `playwright.config.ts` file:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  // Your other Playwright config...
  reporter: [
    ['list'], // Keep the default list reporter
    ['playwright-testrail-reporter'] // Add TestRail reporter
  ],
});
```

### Step 5: Tag Your Tests

Add TestRail case IDs to your test names using the format `C12345`:

**Single test case:**
```typescript
test("C12345: Login with valid credentials should succeed", async ({ page }) => {
  // Your test code here...
});
```

**Multiple test cases:**
```typescript
test("C12345 C12346 C12347: Login flow should work end-to-end", async ({ page }) => {
  // This test will update results for all 3 TestRail cases
});
```

### Step 6: Run Your Tests

Execute your Playwright tests normally:

```bash
npx playwright test
```

You should see output like this:

```
[playwright-testrail-reporter] ℹ️  No existing 'TESTRAIL_RUN_ID' provided by user. Creating a new TestRail run with all available test cases...
[playwright-testrail-reporter] 📋 Found 25 test cases to add to the run
[playwright-testrail-reporter] 🎉 New TestRail run created: https://yourcompany.testrail.io/index.php?/runs/view/1234
[playwright-testrail-reporter] Test completed: C12345 Login test (passed)
[playwright-testrail-reporter] 🎯 Matched TestRail Case ID: 12345
[playwright-testrail-reporter] 📊 Updating 1 test results for TestRail Run ID: 1234
[playwright-testrail-reporter] ✅ Successfully updated test results: https://yourcompany.testrail.io/index.php?/runs/view/1234
```

That's it! Check your TestRail instance to see the updated test results.

## Advanced Usage

### Using Existing Test Runs

By default, when no `TESTRAIL_RUN_ID` is provided, the reporter automatically creates a new test run for each execution and includes all discovered test cases (those with `C` IDs in test names). To use an existing test run instead:

1. Create a test run manually in TestRail
2. Note the run ID from the URL (e.g., `1234` in `/runs/view/1234`)
3. Add it to your `.env` file:
   ```bash
   TESTRAIL_RUN_ID=1234
   ```

### Test Case Matching

The reporter automatically matches tests to TestRail cases by looking for `C` followed by numbers in test names:
- ✅ `C12345` - matches case 12345
- ✅ `C12345 C67890` - matches both cases 12345 and 67890
- ❌ `Case12345` - won't match
- ❌ `c12345` - won't match (case sensitive)

## Troubleshooting

### Common Issues

**"Only absolute URLs are supported" error:**
- Make sure your `TESTRAIL_HOST` includes `https://`
- Example: `https://yourcompany.testrail.io` ✅
- Not: `yourcompany.testrail.io` ❌

**"401 Unauthorized" error:**
- Check your `TESTRAIL_USERNAME` (should be your email)
- Check your `TESTRAIL_API_KEY` or `TESTRAIL_PASSWORD` (should be API key, not regular password)
- Verify the API key is active in TestRail → My Settings → API Keys

**"Field :results contains invalid results" error:**
- Check your `TESTRAIL_PROJECT_ID` and `TESTRAIL_SUITE_ID` are correct
- Make sure the TestRail case IDs in your test names actually exist
- Verify you have permission to update results in the project

**"Invalid status" error:**
- Your TestRail has different status IDs than expected
- Check your TestRail → Administration → Customizations → Result Statuses to see available status IDs
- Direct link: `https://yourinstance.testrail.io/index.php?/admin/custom/overview#`
- The status ID can be found in the URL when editing a result status (e.g., `.../admin/custom/result_status/edit/6` means ID is 6)
- Set the required environment variables (see Configuration section above)
- If you would like this reporter to update TestRail with your skipped tests, find your "Skipped" status ID and set `TESTRAIL_STATUS_SKIPPED=<ID>`
- You can also get status IDs via API: `GET /index.php?/api/v2/get_statuses`

**Tests don't appear in TestRail:**
- Make sure test names contain `C` followed by the case number
- Check that the case IDs exist in your TestRail suite
- Verify the test actually ran (wasn't skipped)

**Skipped tests not being reported:**
- If you see: `⚠️ Detected skipped test case X but TESTRAIL_STATUS_SKIPPED environment variable is not configured`
- Set `TESTRAIL_STATUS_SKIPPED` to your TestRail's skipped status ID (usually 6 or 3)
- The reporter will only update TestRail with skipped test results when this is configured

### Getting Help

If you're still having issues:
1. Check the console output for specific error messages
2. Verify all environment variables are set correctly
3. Test your TestRail API connection manually
4. Create an issue on GitHub with your error details

## License
This project is licensed under the [MIT License](/README.md)

## Support

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/wufazu)
