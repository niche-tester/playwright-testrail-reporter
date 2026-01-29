/**
 * Native TestRail API Client
 * Replaces testrail-api-client to eliminate axios vulnerability
 * Uses native fetch (Node 18+)
 */

export interface TestRailOptions {
  domain: string
  username: string
  password: string
}

export interface TestCase {
  id: number
  title?: string
  [key: string]: unknown
}

export interface TestResult {
  case_id: number
  status_id: number | undefined
  comment: string
}

export class TestRailClient {
  private baseUrl: string
  private authHeader: string

  constructor(private options: TestRailOptions) {
    // Ensure domain doesn't have protocol prefix
    const domain = options.domain.replace(/^https?:\/\//, '')
    this.baseUrl = `https://${domain}/index.php?/api/v2`
    
    // Basic auth header
    const credentials = Buffer.from(`${options.username}:${options.password}`).toString('base64')
    this.authHeader = `Basic ${credentials}`
  }

  private async request<T>(
    method: 'GET' | 'POST',
    endpoint: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.authHeader,
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = `TestRail API error (${response.status}): ${response.statusText}`
      
      try {
        const errorJson = JSON.parse(errorText)
        if (errorJson.error) {
          errorMessage = `TestRail API error: ${errorJson.error}`
        }
      } catch {
        if (errorText) {
          errorMessage += ` - ${errorText}`
        }
      }
      
      throw new Error(errorMessage)
    }

    return response.json()
  }

  /**
   * Handle paginated GET requests
   * TestRail API returns _links.next for pagination
   */
  private async paginatedGet<T>(endpoint: string, itemName: string): Promise<T[]> {
    const items: T[] = []
    let nextUrl: string | null = endpoint

    while (nextUrl) {
      const requestUrl: string = nextUrl.startsWith('/api/v2') 
        ? `${this.baseUrl.replace('/api/v2', '')}${nextUrl}`
        : `${this.baseUrl}${nextUrl}`
      
      const response: Response = await fetch(requestUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.authHeader,
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`TestRail API error (${response.status}): ${errorText}`)
      }

      const data: { [key: string]: T[] } & { _links?: { next: string | null } } = await response.json()
      items.push(...data[itemName])
      nextUrl = data._links?.next || null
    }

    return items
  }

  /**
   * Create a new test run
   */
  async addRun(
    name: string,
    description: string,
    projectId: number,
    suiteId?: number,
    caseIds?: number[],
    milestoneId?: number,
    refs?: string
  ): Promise<number> {
    const body: Record<string, unknown> = {
      name,
      description,
      include_all: false,
      case_ids: caseIds || [],
    }

    if (suiteId) body.suite_id = suiteId
    if (milestoneId) body.milestone_id = milestoneId
    if (refs) body.refs = refs

    const response = await this.request<{ id: number }>(
      'POST',
      `/add_run/${projectId}`,
      body
    )
    
    return response.id
  }

  /**
   * Get test cases for a project/suite
   */
  async getCases(projectId: number, suiteId?: number): Promise<TestCase[]> {
    const params = suiteId ? `&suite_id=${suiteId}` : ''
    return this.paginatedGet<TestCase>(`/get_cases/${projectId}${params}`, 'cases')
  }

  /**
   * Get tests in a run
   */
  async getTests(runId: number): Promise<TestCase[]> {
    return this.paginatedGet<TestCase>(`/get_tests/${runId}`, 'tests')
  }

  /**
   * Add results for multiple test cases
   */
  async addResultsForCases(runId: number, results: TestResult[]): Promise<unknown> {
    return this.request(
      'POST',
      `/add_results_for_cases/${runId}`,
      { results }
    )
  }

  /**
   * Close a test run
   */
  async closeRun(runId: number): Promise<unknown> {
    return this.request('POST', `/close_run/${runId}`, {})
  }

  /**
   * Update run description
   */
  async updateRunDescription(runId: number, description: string): Promise<unknown> {
    return this.request(
      'POST',
      `/update_run/${runId}`,
      { description }
    )
  }

  /**
   * Add attachment to a result
   * Note: Uses FormData for multipart upload
   */
  async addAttachmentToResult(resultId: number, filePath: string): Promise<unknown> {
    const fs = await import('fs')
    const path = await import('path')
    
    const fileBuffer = fs.readFileSync(filePath)
    const fileName = path.basename(filePath)
    
    const formData = new FormData()
    formData.append('attachment', new Blob([fileBuffer]), fileName)

    const domain = this.options.domain.replace(/^https?:\/\//, '')
    const url = `https://${domain}/index.php?/api/v2/add_attachment_to_result/${resultId}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': this.authHeader,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`TestRail API error (${response.status}): ${errorText}`)
    }

    return response.json()
  }
}

export default TestRailClient
