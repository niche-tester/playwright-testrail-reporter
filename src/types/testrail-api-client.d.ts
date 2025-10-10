declare module 'testrail-api-client' {
  interface TestRailOptions {
    domain: string;
    username: string;
    password: string;
  }

  class TestRail {
    constructor(options: TestRailOptions);
    addRun(runName: string, runDescription: string, projectId: number, testSuiteId?: number, caseIds?: number[], milestoneId?: number, refs?: string): Promise<number>;
    addResultsForCases(runId: number, reportTests: Array<{case_id: number, status_id: number, comment?: string}>): Promise<any>;
    addResultForCase(runId: number, caseId: number, result: {status_id: number, comment?: string}): Promise<any>;
    getTests(runId: number): Promise<any>;
    closeRun(runId: number): Promise<any>;
    getCases(projectId: number, suiteId?: number): Promise<any>;
    updateRunDescription(runId: number, description: string): Promise<any>;
    addAttachmentToResult(runId: number, filePath: string): Promise<any>;
  }

  export = TestRail;
}