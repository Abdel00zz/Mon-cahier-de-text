export interface ApiClientOptions {
  baseUrl?: string;
  timeoutMs?: number;
  retries?: number;
}

export class ApiClient {
  private baseUrl: string;
  private timeoutMs: number;
  private retries: number;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl || '';
    this.timeoutMs = options.timeoutMs || 10000;
    this.retries = options.retries || 2;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}, attempt = 0): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return (await response.json()) as T;
    } catch (err: any) {
      clearTimeout(timer);

      if (attempt < this.retries && (err.name === 'AbortError' || err.message?.includes('500'))) {
        const delay = Math.pow(2, attempt) * 500;
        await new Promise((res) => setTimeout(res, delay));
        return this.request<T>(endpoint, options, attempt + 1);
      }

      throw err;
    }
  }

  get<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', headers });
  }

  post<T>(endpoint: string, data?: any, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      headers,
    });
  }

  put<T>(endpoint: string, data?: any, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      headers,
    });
  }

  delete<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', headers });
  }
}

export const apiClient = new ApiClient();
