/**
 * ANAF API Error Classes
 */

/**
 * Base error class for ANAF API errors
 */
export class AnafError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnafError";
  }
}

/**
 * Validation error for invalid input parameters
 */
export class AnafValidationError extends AnafError {
  constructor(message: string) {
    super(message);
    this.name = "AnafValidationError";
  }
}

/**
 * API error for failed requests
 */
export class AnafApiError extends AnafError {
  public readonly statusCode?: number;
  public readonly response?: unknown;

  constructor(message: string, statusCode?: number, response?: unknown) {
    super(message);
    this.name = "AnafApiError";
    this.statusCode = statusCode;
    this.response = response;
  }
}

/**
 * Authentication error for OAuth issues
 */
export class AnafAuthenticationError extends AnafError {
  constructor(message: string) {
    super(message);
    this.name = "AnafAuthenticationError";
  }
}

/**
 * Not found error for missing companies
 */
export class AnafNotFoundError extends AnafError {
  constructor(message: string = "Company not found") {
    super(message);
    this.name = "AnafNotFoundError";
  }
}
