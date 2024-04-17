import { getTestCaseName } from '../src/reporter'

describe('getTestCaseName function', () => {
  it('should extract test case IDs from the given test name', () => {
    const testname = "Sample Test C123";
    const matchedIds = getTestCaseName(testname);
    expect(matchedIds).toEqual(['C123']);
  });

  it('should return null for test names without test case IDs', () => {
    const testname = "Sample Test without ID";
    const matchedIds = getTestCaseName(testname);
    expect(matchedIds).toBeNull();
  });

  it('should extract multiple test case IDs from the given test name', () => {
    const testname = "Sample Test C123 and C456";
    const matchedIds = getTestCaseName(testname);
    expect(matchedIds).toEqual(['C123', 'C456']);
  });

  it('should return null for an empty test name', () => {
    const testname = "";
    const matchedIds = getTestCaseName(testname);
    expect(matchedIds).toBeNull();
  });
  // ...existing tests...

  it('should return null for an empty test name', () => {
    const testname = "";
    const matchedIds = getTestCaseName(testname);
    expect(matchedIds).toBeNull();
  });

  it('should extract test case ID at the beginning of the test name', () => {
    const testname = "C123 Sample Test";
    const matchedIds = getTestCaseName(testname);
    expect(matchedIds).toEqual(['C123']);
  });

});
