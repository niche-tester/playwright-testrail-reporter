# pw-simple-testrail-reporter

pw-simple-testrail-reporter is a custom reporter for Playwright Test to seamlessly integrate with TestRail. The reporter adds test results to given TEST Run by matching test case IDs.

## Installation

```bash
npm install pw-simple-testrail-reporter
```

## Prerequisites

To use TestRail Reporter, you will need to set up the following environment variables:

````
TESTRAIL_HOST: TestRail instance domain name e.g ```https://testrail.instance.io```
TESTRAIL_USERNAME: TestRail email
TESTRAIL_PASSWORD: TestRail API key (Generate this or use an existing one from the 'My Settings' page on your TestRail instance)
TESTRAIL_RUN_ID: TestRail Test Run ID, only number (Without R in the beginning)
````

## Usage

1. Add the TestRailReporter instance to the reporters array in your Playwright Test configuration file `playwright.config.ts`

_Example_:

```
const config: PlaywrightTestConfig = {
 reporter: [
    ["list"],
    ["pw-simple-testrail-reporter"]
   ]
  // ...
};

export default config;
```

2. In your test files, add TestRail test case IDs to the test case names using the following format: C12345.

_Example:_

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
[playwright-testrail-reporter]: Matched Test Case ID: 12345
[playwright-testrail-reporter]: Updating test status for the following TestRail Run ID: <run-id>
[playwright-testrail-reporter]: Updated test results for Test Run: https://<testrail-host>/index.php?/runs/view/<run-id>

```

5. Test Run and test case results should be updated

## License

This project is licensed under the [MIT License](/README.md)
