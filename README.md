# playwright-testrail-reporter

playwright-testrail-reporter is a custom reporter for Playwright Test to seamlessly integrate with TestRail. The reporter automatically creates TestRail Runs and adds test results by matching test case IDs.

## Installation

```bash
npm install @playwright-testrail-reporter
```
## Prerequisites

To use TestRail Reporter, you will need to set up the following environment variables:

```
TESTRAIL_HOST: Your TestRail instance URL
TESTRAIL_USERNAME: Your TestRail account username
TESTRAIL_PASSWORD: Your TestRail API key
TESTRAIL_PROJECT_ID: The TestRail project ID where test runs and results will be added
TESTRAIL_SUITE_ID: The TestRail suite ID associated with the test cases
TESTRAIL_RUN_NAME: The name of the TestRail test run. The execution time will be appended to this on TestRail
````

Additionally, you may provide the TESTRAIL_RUN_ID environment variable to use an existing TestRail test run instead of creating a new one.

## Usage

1. Add the TestRailReporter instance to the reporters array in your Playwright Test configuration file ```playwright.config.ts```

*Example*:
```
const config: PlaywrightTestConfig = {
 reporter: [
    ["list"],
    ["playwright-testrail-reporter"]
   ]
  // ...
};

export default config;
````

2. In your test files, add TestRail test case IDs to the test case names using the following format: C12345. 

*Example:*

```
test("C12345: Login with valid credentials should succeed", async ({ page }) => {
    // ...
});
```

or if you need to pass multiple case ids:

```
test("C12345 C12346 C12347 Login with valid credentials should succeed", async ({ page }) => {
  // ...
});
```
