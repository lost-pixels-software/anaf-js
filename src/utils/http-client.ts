/**
 * HTTP Client using native fetch
 */

import { AnafApiError } from "../shared/errors";
import { DEFAULT_TIMEOUT } from "../shared/constants";

export interface HttpClientConfig {
  timeout?: number;
  baseUrl?: string;
}

export interface RequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
}

export interface HttpResponse<T> {
  data: T;
  status: number;
  headers: Headers;
}

/**
 * Native fetch-based HTTP client
 */
export class HttpClient {
  private readonly timeout: number;
  private readonly baseUrl?: string;

  constructor(config: HttpClientConfig = {}) {
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
    this.baseUrl = config.baseUrl;
  }

  /**
   * Build full URL from path
   */
  private buildUrl(path: string): string {
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }
    if (this.baseUrl) {
      return `${this.baseUrl}${path}`;
    }
    return path;
  }

  /**
   * Execute fetch with timeout
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeout: number
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * POST request with JSON body
   */
  async post<T>(
    url: string,
    body: unknown,
    options: RequestOptions = {}
  ): Promise<HttpResponse<T>> {
    const fullUrl = this.buildUrl(url);
    const timeout = options.timeout ?? this.timeout;

    const response = await this.fetchWithTimeout(
      fullUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        body: JSON.stringify(body),
      },
      timeout
    );

    if (!response.ok) {
      throw await this.handleErrorResponse(response);
    }

    const data = (await response.json()) as T;
    return { data, status: response.status, headers: response.headers };
  }

  /**
   * POST request with XML body
   */
  async postXml<T>(
    url: string,
    xmlContent: string,
    options: RequestOptions = {}
  ): Promise<HttpResponse<T>> {
    const fullUrl = this.buildUrl(url);
    const timeout = options.timeout ?? this.timeout;

    const response = await this.fetchWithTimeout(
      fullUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/xml",
          ...options.headers,
        },
        body: xmlContent,
      },
      timeout
    );

    if (!response.ok) {
      throw await this.handleErrorResponse(response);
    }

    // Try to parse as JSON first, fall back to text
    const contentType = response.headers.get("content-type") || "";
    let data: T;

    if (contentType.includes("application/json")) {
      data = (await response.json()) as T;
    } else {
      data = (await response.text()) as unknown as T;
    }

    return { data, status: response.status, headers: response.headers };
  }

  /**
   * POST request with plain text body (for ANAF validation endpoints)
   */
  async postText<T>(
    url: string,
    textContent: string,
    options: RequestOptions = {}
  ): Promise<HttpResponse<T>> {
    const fullUrl = this.buildUrl(url);
    const timeout = options.timeout ?? this.timeout;

    const response = await this.fetchWithTimeout(
      fullUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
          ...options.headers,
        },
        body: textContent,
      },
      timeout
    );

    if (!response.ok) {
      throw await this.handleErrorResponse(response);
    }

    // Try to parse as JSON first, fall back to text
    const contentType = response.headers.get("content-type") || "";
    let data: T;

    if (contentType.includes("application/json")) {
      data = (await response.json()) as T;
    } else {
      data = (await response.text()) as unknown as T;
    }

    return { data, status: response.status, headers: response.headers };
  }

  /**
   * POST request with form-urlencoded body
   */
  async postForm<T>(
    url: string,
    params: URLSearchParams,
    options: RequestOptions = {}
  ): Promise<HttpResponse<T>> {
    const fullUrl = this.buildUrl(url);
    const timeout = options.timeout ?? this.timeout;

    const response = await this.fetchWithTimeout(
      fullUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          ...options.headers,
        },
        body: params.toString(),
      },
      timeout
    );

    if (!response.ok) {
      throw await this.handleErrorResponse(response);
    }

    const data = (await response.json()) as T;
    return { data, status: response.status, headers: response.headers };
  }

  /**
   * GET request
   */
  async get<T>(
    url: string,
    options: RequestOptions = {}
  ): Promise<HttpResponse<T>> {
    const fullUrl = this.buildUrl(url);
    const timeout = options.timeout ?? this.timeout;

    const response = await this.fetchWithTimeout(
      fullUrl,
      {
        method: "GET",
        headers: options.headers,
      },
      timeout
    );

    if (!response.ok) {
      throw await this.handleErrorResponse(response);
    }

    const contentType = response.headers.get("content-type") || "";
    let data: T;

    if (contentType.includes("application/json")) {
      data = (await response.json()) as T;
    } else {
      data = (await response.text()) as unknown as T;
    }

    return { data, status: response.status, headers: response.headers };
  }

  /**
   * GET request that returns a Node.js Buffer (for file downloads)
   */
  async getBuffer(
    url: string,
    options: RequestOptions = {}
  ): Promise<{ data: Buffer; status: number; headers: Headers }> {
    const fullUrl = this.buildUrl(url);
    const timeout = options.timeout ?? this.timeout;

    const response = await this.fetchWithTimeout(
      fullUrl,
      {
        method: "GET",
        headers: options.headers,
      },
      timeout
    );

    if (!response.ok) {
      throw await this.handleErrorResponse(response);
    }

    const arrayBuffer = await response.arrayBuffer();
    return {
      data: Buffer.from(arrayBuffer),
      status: response.status,
      headers: response.headers,
    };
  }
  /**
   * Handle error response and throw AnafApiError
   */
  private async handleErrorResponse(response: Response): Promise<AnafApiError> {
    const errorText = await response.text().catch(() => "Unknown error");
    let message = `HTTP ${response.status}: ${errorText}`;

    // Try to extract a better message if it's a JSON error (CustomErrorMessage)
    try {
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const errorJson = JSON.parse(errorText);
        if (errorJson.message) {
          message = `ANAF API Error (${response.status}): ${errorJson.message}`;
        } else if (errorJson.error) {
          message = `ANAF API Error (${response.status}): ${errorJson.error}`;
        }
      }
    } catch {
      // Not JSON or parse failed, keep default message
    }

    return new AnafApiError(message, response.status, errorText);
  }
}
