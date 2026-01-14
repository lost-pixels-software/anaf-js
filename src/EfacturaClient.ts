/**
 * e-Factura Client
 *
 * Client for ANAF e-Factura API operations.
 * Requires OAuth authentication.
 */

import { HttpClient } from "./utils/http-client";
import { parseUploadResponse, parseStatusResponse } from "./utils/xml-parser";
import {
  AnafValidationError,
  AnafApiError,
  AnafAuthenticationError,
} from "./shared/errors";
import {
  getBasePath,
  BASE_PATH_OAUTH_PROD,
  UPLOAD_PATH,
  UPLOAD_B2C_PATH,
  STATUS_MESSAGE_PATH,
  DOWNLOAD_PATH,
  LIST_MESSAGES_PATH,
  LIST_MESSAGES_PAGINATED_PATH,
  VALIDATE_XML_PATH,
  XML_TO_PDF_PATH,
  DEFAULT_TIMEOUT,
} from "./shared/constants";
import { AnafAuthenticator, type StoredCredentials } from "./AnafAuthenticator";
import type {
  EfacturaClientConfig,
  UploadOptions,
  UploadResponse,
  StatusResponse,
  Message,
  ListMessagesParams,
  ListMessagesResponse,
  PaginatedMessagesParams,
  PaginatedMessagesResponse,
  ValidationResult,
  UploadResponseRaw,
  StatusResponseRaw,
  ListMessagesResponseRaw,
  PaginatedMessagesResponseRaw,
  ValidationResponseRaw,
  ExecutionStatus,
  UploadStatusValue,
} from "./types/efactura";

/**
 * ANAF e-Factura API Client
 */
export class EfacturaClient {
  private readonly config: EfacturaClientConfig;
  private readonly httpClient: HttpClient;
  private readonly basePath: string;
  private accessToken: string;
  private refreshToken: string;
  private expiresAt: number;
  private readonly authenticator: AnafAuthenticator;

  constructor(config: EfacturaClientConfig, authenticator: AnafAuthenticator) {
    this.validateConfig(config);

    this.config = config;
    this.basePath = getBasePath(config.testMode ?? false);
    this.httpClient = new HttpClient({
      timeout: config.timeout ?? DEFAULT_TIMEOUT,
      baseUrl: this.basePath,
    });

    this.accessToken = config.accessToken;
    this.refreshToken = config.refreshToken;
    this.expiresAt = config.expiresAt ?? 0;
    this.authenticator = authenticator;
  }

  /**
   * Get authorization headers
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    // Check if token needs refresh
    if (this.expiresAt > 0) {
      const bufferMs = 60000; // 1 minute buffer
      if (Date.now() >= this.expiresAt - bufferMs) {
        try {
          const tokens = await this.authenticator.refreshAccessToken(
            this.refreshToken
          );
          this.accessToken = tokens.access_token;
          this.refreshToken = tokens.refresh_token;
          this.expiresAt = Date.now() + tokens.expires_in * 1000;
          console.log("🔄 Access token refreshed");
        } catch (error) {
          throw new AnafAuthenticationError(
            `Failed to refresh token: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      }
    }

    return {
      Authorization: `Bearer ${this.accessToken}`,
    };
  }

  /**
   * Strip RO prefix from VAT number
   */
  private getCleanVatNumber(): string {
    return this.config.vatNumber.replace(/^RO/i, "").trim();
  }

  // ===========================================================================
  // Upload Operations
  // ===========================================================================

  /**
   * Upload document to ANAF
   */
  async uploadDocument(
    xmlContent: string,
    options: UploadOptions = {}
  ): Promise<UploadResponse> {
    if (!xmlContent?.trim()) {
      throw new AnafValidationError("XML content is required");
    }

    const params = new URLSearchParams({
      cif: this.getCleanVatNumber(),
      standard: options.standard ?? "UBL",
    });

    if (options.extern) params.append("extern", "DA");
    if (options.autofactura) params.append("autofactura", "DA");
    if (options.executare) params.append("executare", "DA");

    const url = `${UPLOAD_PATH}?${params.toString()}`;
    const headers = await this.getAuthHeaders();

    try {
      const response = await this.httpClient.postXml<
        UploadResponseRaw | string
      >(url, xmlContent, {
        headers,
      });

      let rawData: UploadResponseRaw;
      if (typeof response.data === "string") {
        rawData = parseUploadResponse(response.data);
      } else {
        rawData = response.data;
      }

      return this.transformUploadResponse(rawData);
    } catch (error) {
      if (error instanceof AnafApiError && error.statusCode === 401) {
        throw new AnafAuthenticationError(
          "Authentication failed. Token may be expired."
        );
      }
      throw error;
    }
  }

  /**
   * Upload B2C document
   */
  async uploadB2CDocument(
    xmlContent: string,
    options: UploadOptions = {}
  ): Promise<UploadResponse> {
    if (!xmlContent?.trim()) {
      throw new AnafValidationError("XML content is required");
    }

    const params = new URLSearchParams({
      cif: this.getCleanVatNumber(),
    });

    if (options.standard) params.append("standard", options.standard);
    if (options.extern) params.append("extern", "DA");
    if (options.autofactura) params.append("autofactura", "DA");

    const url = `${UPLOAD_B2C_PATH}?${params.toString()}`;
    const headers = await this.getAuthHeaders();

    try {
      const response = await this.httpClient.postXml<
        UploadResponseRaw | string
      >(url, xmlContent, {
        headers,
      });

      let rawData: UploadResponseRaw;
      if (typeof response.data === "string") {
        rawData = parseUploadResponse(response.data);
      } else {
        rawData = response.data;
      }

      return this.transformUploadResponse(rawData);
    } catch (error) {
      if (error instanceof AnafApiError && error.statusCode === 401) {
        throw new AnafAuthenticationError(
          "Authentication failed. Token may be expired."
        );
      }
      throw error;
    }
  }

  private transformUploadResponse(raw: UploadResponseRaw): UploadResponse {
    return {
      executionStatus: raw.ExecutionStatus as unknown as ExecutionStatus,
      uploadIndex: raw.index_incarcare,
      responseDate: raw.dateResponse,
      errors: raw.Errors?.map((e) => e.errorMessage),
    };
  }

  // ===========================================================================
  // Status Operations
  // ===========================================================================

  /**
   * Get upload status
   */
  async getStatusMessage(uploadId: string): Promise<StatusResponse> {
    if (!uploadId?.trim()) {
      throw new AnafValidationError("Upload ID is required");
    }

    const params = new URLSearchParams({
      id_incarcare: uploadId,
    });

    const url = `${STATUS_MESSAGE_PATH}?${params.toString()}`;
    const headers = await this.getAuthHeaders();

    try {
      const response = await this.httpClient.get<StatusResponseRaw | string>(
        url,
        {
          headers,
        }
      );

      let rawData: StatusResponseRaw;
      if (typeof response.data === "string") {
        rawData = parseStatusResponse(response.data);
      } else {
        rawData = response.data;
      }

      return {
        status: rawData.stare as UploadStatusValue | undefined,
        downloadId: rawData.id_descarcare,
        errors: rawData.Errors?.map((e) => e.errorMessage),
      };
    } catch (error) {
      if (error instanceof AnafApiError && error.statusCode === 401) {
        throw new AnafAuthenticationError(
          "Authentication failed. Token may be expired."
        );
      }
      throw error;
    }
  }

  /**
   * Download processed document
   */
  async downloadDocument(downloadId: string): Promise<ArrayBuffer> {
    if (!downloadId?.trim()) {
      throw new AnafValidationError("Download ID is required");
    }

    const params = new URLSearchParams({
      id: downloadId,
    });

    const url = `${DOWNLOAD_PATH}?${params.toString()}`;
    const headers = await this.getAuthHeaders();

    try {
      const response = await this.httpClient.getBuffer(
        `${this.basePath}${url}`,
        { headers }
      );
      return response.data;
    } catch (error) {
      if (error instanceof AnafApiError && error.statusCode === 401) {
        throw new AnafAuthenticationError(
          "Authentication failed. Token may be expired."
        );
      }
      throw error;
    }
  }

  // ===========================================================================
  // Message Operations
  // ===========================================================================

  /**
   * Get messages list
   */
  async getMessages(params: ListMessagesParams): Promise<ListMessagesResponse> {
    if (params.days < 1 || params.days > 60) {
      throw new AnafValidationError("Days must be between 1 and 60");
    }

    const urlParams = new URLSearchParams({
      cif: this.getCleanVatNumber(),
      zile: params.days.toString(),
    });

    if (params.filter) urlParams.append("filtru", params.filter);

    const url = `${LIST_MESSAGES_PATH}?${urlParams.toString()}`;
    const headers = await this.getAuthHeaders();

    try {
      const response = await this.httpClient.get<ListMessagesResponseRaw>(url, {
        headers,
      });

      return {
        messages: response.data.mesaje?.map(this.transformMessage),
        serial: response.data.serial,
        cui: response.data.cui,
        title: response.data.titlu,
        error: response.data.eroare,
      };
    } catch (error) {
      if (error instanceof AnafApiError && error.statusCode === 401) {
        throw new AnafAuthenticationError(
          "Authentication failed. Token may be expired."
        );
      }
      throw error;
    }
  }

  /**
   * Get messages with pagination
   */
  async getMessagesPaginated(
    params: PaginatedMessagesParams
  ): Promise<PaginatedMessagesResponse> {
    const urlParams = new URLSearchParams({
      cif: this.getCleanVatNumber(),
      startTime: params.startTime.toString(),
      endTime: params.endTime.toString(),
      pagina: params.page.toString(),
    });

    if (params.filter) urlParams.append("filtru", params.filter);

    const url = `${LIST_MESSAGES_PAGINATED_PATH}?${urlParams.toString()}`;
    const headers = await this.getAuthHeaders();

    try {
      const response = await this.httpClient.get<PaginatedMessagesResponseRaw>(
        url,
        {
          headers,
        }
      );

      return {
        messages: response.data.mesaje?.map(this.transformMessage),
        recordsInPage: response.data.numar_inregistrari_in_pagina,
        recordsPerPage: response.data.numar_total_inregistrari_per_pagina,
        totalRecords: response.data.numar_total_inregistrari,
        totalPages: response.data.numar_total_pagini,
        currentPage: response.data.index_pagina_curenta,
        serial: response.data.serial,
        cui: response.data.cui,
        title: response.data.titlu,
        error: response.data.eroare,
      };
    } catch (error) {
      if (error instanceof AnafApiError && error.statusCode === 401) {
        throw new AnafAuthenticationError(
          "Authentication failed. Token may be expired."
        );
      }
      throw error;
    }
  }

  private transformMessage(raw: {
    id_solicitare: string;
    tip: string;
    data_creare: string;
    id: string;
    detalii: string;
    cif: string;
  }): Message {
    return {
      solicitationId: raw.id_solicitare,
      type: raw.tip,
      creationDate: raw.data_creare,
      id: raw.id,
      details: raw.detalii,
      cif: raw.cif,
    };
  }

  // ===========================================================================
  // Validation & Conversion Operations
  // ===========================================================================

  /**
   * Validate XML document
   * Note: Validation endpoint only exists in PROD (no test environment)
   */
  async validateXml(
    xmlContent: string,
    standard: "FACT1" | "FCN" = "FACT1"
  ): Promise<ValidationResult> {
    if (!xmlContent?.trim()) {
      throw new AnafValidationError("XML content is required");
    }

    // Validation endpoint only exists in PROD, requires text/plain Content-Type
    const url = `${BASE_PATH_OAUTH_PROD}${VALIDATE_XML_PATH}/${standard}`;
    const headers = await this.getAuthHeaders();

    try {
      const response = await this.httpClient.postText<ValidationResponseRaw>(
        url,
        xmlContent,
        { headers }
      );

      const isValid = response.data.stare === "ok";

      return {
        valid: isValid,
        status: response.data.stare,
        messages: response.data.Messages?.map((m) => m.message),
        traceId: response.data.trace_id,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Convert XML to PDF
   * Note: Transformation endpoint only exists in PROD (no test environment)
   */
  async xmlToPdf(
    xmlContent: string,
    standard: "FACT1" | "FCN" = "FACT1",
    validate: boolean = true
  ): Promise<ArrayBuffer> {
    if (!xmlContent?.trim()) {
      throw new AnafValidationError("XML content is required");
    }

    // If validate is false, use /DA to skip validation
    const noValidatePath = validate ? "" : "/DA";

    // Transformation endpoint only exists in PROD, requires text/plain Content-Type
    const url = `${BASE_PATH_OAUTH_PROD}${XML_TO_PDF_PATH}/${standard}${noValidatePath}`;
    const headers = await this.getAuthHeaders();

    try {
      console.log(`[HttpClient] POST ${url}`);
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
          ...headers,
        },
        body: xmlContent,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new AnafApiError(
          `XML to PDF conversion failed: ${response.status}: ${errorText}`,
          response.status,
          errorText
        );
      }

      return await response.arrayBuffer();
    } catch (error) {
      throw error;
    }
  }

  // ===========================================================================
  // Utility
  // ===========================================================================

  /**
   * Get current credentials
   */
  getCredentials(): StoredCredentials {
    return {
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
      expiresAt: this.expiresAt,
      tokenType: "Bearer",
    };
  }

  private validateConfig(config: EfacturaClientConfig): void {
    if (!config) {
      throw new AnafValidationError("Configuration is required");
    }
    if (!config.vatNumber?.trim()) {
      throw new AnafValidationError("VAT number is required");
    }
    if (!config.accessToken?.trim()) {
      throw new AnafValidationError("Access token is required");
    }
    if (!config.refreshToken?.trim()) {
      throw new AnafValidationError("Refresh token is required");
    }
  }
}
