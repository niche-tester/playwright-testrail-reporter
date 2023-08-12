[![npm version](https://badge.fury.io/js/playwright-testrail-reporter.svg)](https://badge.fury.io/js/playwright-testrail-reporter)

# playwright-testrail-reporter

playwright-testrail-reporter is a custom reporter for Playwright Test to seamlessly integrate with TestRail. The reporter automatically creates TestRail Runs and adds test results by matching test case IDs.

## Installation

```bash
npm install @playwright-testrail-reporter
```
## Prerequisites

To use TestRail Reporter, you will need to set up the following environment variables:

```
TESTRAIL_HOST: TestRail instance domain name e.g ```https://testrail.instance.io```
TESTRAIL_USERNAME: TestRail email 
TESTRAIL_PASSWORD: TestRail API key (Generate this or use an existing one from the 'My Settings' page on your TestRail instance)
TESTRAIL_PROJECT_ID: TestRail project ID where test runs and results will be added
TESTRAIL_SUITE_ID: The TestRail suite ID associated with the test cases
TESTRAIL_RUN_NAME: The name of the TestRail test run. (the execution time will be appended to this name on when created on TestRail)
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

4. When you execute your tests, you should see this output logs on your terminal:

```
[playwright-testrail-reporter]: No Existing 'TESTRAIL_RUN_ID' provided by user... 
[playwright-testrail-reporter]: Automatically creating a run... (If you did not provide a run ID)
[playwright-testrail-reporter]: New TestRail run has been created: https://<testrail-host>/index.php?/runs/view/<run-id>
[playwright-testrail-reporter]: Matched Test Case ID: 12345
[playwright-testrail-reporter]: Updating test status for the following TestRail Run ID: <run-id>
[playwright-testrail-reporter]: Updated test results for Test Run: https://<testrail-host>/index.php?/runs/view/<run-id>

```
5. Test Run and test case results should be updated

Note:
The default behaviour is to include all test cases in the automatically generate test run. If you prefer to select specific tests cases, then manually create the run on TestRail, select the relevant test cases and pass the run id to the ```TESTRAIL_RUN_ID``` environment variable

## License
This project is licensed under the [MIT License](/README.md)

## Support

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/wufazu)
