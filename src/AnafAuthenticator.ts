/**
 * ANAF OAuth 2.0 Authenticator
 */

import { AnafAuthenticationError, AnafValidationError } from "./shared/errors";
import {
  OAUTH_AUTHORIZE_URL,
  OAUTH_TOKEN_URL,
  DEFAULT_TIMEOUT,
} from "./shared/constants";
import { HttpClient } from "./utils/http-client";

export interface AnafAuthConfig {
  /** OAuth 2.0 client ID from ANAF SPV */
  clientId: string;
  /** OAuth 2.0 client secret from ANAF SPV */
  clientSecret: string;
  /** OAuth 2.0 redirect URI registered with ANAF */
  redirectUri: string;
  /** Request timeout in milliseconds */
  timeout?: number;
}

export interface AuthUrlSettings {
  /** OAuth scope */
  scope?: string;
  /** State object to pass through OAuth flow */
  state?: Record<string, unknown>;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

export interface StoredCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  tokenType: string;
  scope?: string;
}

/**
 * Handles OAuth 2.0 authentication with ANAF e-Factura
 */
export class AnafAuthenticator {
  private readonly config: Required<AnafAuthConfig>;
  private readonly httpClient: HttpClient;

  constructor(config: AnafAuthConfig) {
    this.validateConfig(config);

    this.config = {
      ...config,
      timeout: config.timeout ?? DEFAULT_TIMEOUT,
    };

    this.httpClient = new HttpClient({
      timeout: this.config.timeout,
    });
  }

  /**
   * Generate OAuth authorization URL for user authentication
   */
  getAuthorizationUrl(settings?: AuthUrlSettings): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: "code",
      redirect_uri: this.config.redirectUri,
      token_content_type: "jwt",
    });

    if (settings?.scope) {
      params.append("scope", settings.scope);
    }

    if (settings?.state) {
      params.append("state", JSON.stringify(settings.state));
    }

    return `${OAUTH_AUTHORIZE_URL}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access and refresh tokens
   */
  async exchangeCodeForToken(code: string): Promise<TokenResponse> {
    if (!code?.trim()) {
      throw new AnafValidationError("Authorization code is required");
    }

    const params = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uri: this.config.redirectUri,
      code: code.trim(),
      token_content_type: "jwt",
    });

    try {
      const response = await this.httpClient.postForm<TokenResponse>(
        OAUTH_TOKEN_URL,
        params
      );

      if (!response.data?.access_token) {
        throw new AnafAuthenticationError(
          "Token response missing access token"
        );
      }

      return response.data;
    } catch (error) {
      if (error instanceof AnafAuthenticationError) {
        throw error;
      }
      throw new AnafAuthenticationError(
        `Failed to exchange authorization code: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    if (!refreshToken?.trim()) {
      throw new AnafValidationError("Refresh token is required");
    }

    const params = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uri: this.config.redirectUri,
      refresh_token: refreshToken.trim(),
      token_content_type: "jwt",
    });

    try {
      const response = await this.httpClient.postForm<TokenResponse>(
        OAUTH_TOKEN_URL,
        params
      );

      if (!response.data?.access_token) {
        throw new AnafAuthenticationError(
          "Token response missing access token"
        );
      }

      return response.data;
    } catch (error) {
      if (error instanceof AnafAuthenticationError) {
        throw error;
      }
      throw new AnafAuthenticationError(
        `Failed to refresh access token: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Convert token response to stored credentials format
   */
  static toStoredCredentials(tokens: TokenResponse): StoredCredentials {
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
      tokenType: tokens.token_type,
      scope: tokens.scope,
    };
  }

  /**
   * Check if credentials are expired or near expiry
   */
  static isExpired(
    credentials: StoredCredentials,
    bufferMs: number = 60000
  ): boolean {
    return Date.now() >= credentials.expiresAt - bufferMs;
  }

  private validateConfig(config: AnafAuthConfig): void {
    if (!config) {
      throw new AnafValidationError("Configuration is required");
    }
    if (!config.clientId?.trim()) {
      throw new AnafValidationError("OAuth client ID is required");
    }
    if (!config.clientSecret?.trim()) {
      throw new AnafValidationError("OAuth client secret is required");
    }
    if (!config.redirectUri?.trim()) {
      throw new AnafValidationError("OAuth redirect URI is required");
    }
  }
}
