/**
 * e-Factura Client
 *
 * Client for ANAF e-Factura API operations.
 * Requires OAuth authentication.
 */

import { unzipSync } from "fflate";
import { HttpClient } from "./utils/http-client";
import {
  parseUploadResponse,
  parseStatusResponse,
  extractXmlErrors,
} from "./utils/xml-parser";
import { parseMessageDetails } from "./utils/message-parser";
import { parseInvoiceXml } from "./utils/invoice-parser";
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
import { UploadStatusValue } from "./types/efactura";
import type {
  EfacturaClientConfig,
  UploadOptions,
  UploadResponse,
  StatusResponse,
  UploadStatusResult,
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
} from "./types/efactura";
import type { InvoiceData } from "./types/invoice";

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

          // Trigger refresh callback if provided
          if (this.config.onTokenRefresh) {
            const newCreds = this.getCredentials();
            await Promise.resolve(this.config.onTokenRefresh(newCreds)).catch(
              (err) => {
                console.warn("⚠️ onTokenRefresh callback failed:", err);
              }
            );
          }
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

    if (options.standard && !["UBL", "CN", "CII", "RASP"].includes(options.standard)) {
      throw new AnafValidationError(
        "Standard must be one of: UBL, CN, CII, RASP"
      );
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

    if (options.standard && !["UBL", "CN", "CII", "RASP"].includes(options.standard)) {
      throw new AnafValidationError(
        "Standard must be one of: UBL, CN, CII, RASP"
      );
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
   * Download processed document as a raw ZIP buffer.
   *
   * ANAF returns a ZIP archive containing the processed XML (and signature).
   * Use `getUploadStatus` for a higher-level API that handles the full
   * status → download → error-extraction flow automatically.
   */
  async downloadDocument(downloadId: string): Promise<Buffer> {
    if (!downloadId?.trim()) {
      throw new AnafValidationError("Download ID is required");
    }

    const params = new URLSearchParams({
      id: downloadId,
    });

    const url = `${DOWNLOAD_PATH}?${params.toString()}`;
    const headers = await this.getAuthHeaders();

    try {
      const response = await this.httpClient.getBuffer(url, { headers });
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

  /**
   * Download and parse a received invoice by its download ID.
   *
   * ANAF returns a ZIP archive containing the UBL XML invoice.
   * This method downloads the archive, extracts the XML, and parses
   * it into a structured JSON object.
   *
   * @param downloadId - The download ID from a message (`message.id`)
   * @returns Parsed invoice data
   */
  async getInvoiceData(downloadId: string): Promise<InvoiceData> {
    if (!downloadId?.trim()) {
      throw new AnafValidationError("Download ID is required");
    }

    const zipBuffer = await this.downloadDocument(downloadId);

    // Validate ZIP header (PK\x03\x04)
    if (
      zipBuffer.length < 4 ||
      zipBuffer[0] !== 0x50 ||
      zipBuffer[1] !== 0x4b
    ) {
      const content = zipBuffer.toString("utf-8").substring(0, 100);
      throw new AnafApiError(
        `Invalid ZIP data received from ANAF. The response might be an error message or empty instead of a ZIP archive. Content starts with: ${content}`,
        0
      );
    }

    let xmlContent: string;
    try {
      const files = unzipSync(new Uint8Array(zipBuffer));
      const fileNames = Object.keys(files);

      // Find the correct XML file in the archive
      // Priority 1: Exact match for {downloadId}.xml
      // Priority 2: Any XML that doesn't start with "semnatura_"
      // Priority 3: First XML found
      const targetFileName = `${downloadId}.xml`;
      let xmlFileName = fileNames.find((name) => name === targetFileName);

      if (!xmlFileName) {
        xmlFileName = fileNames.find(
          (name) => name.endsWith(".xml") && !name.startsWith("semnatura_")
        );
      }

      if (!xmlFileName) {
        xmlFileName = fileNames.find((name) => name.endsWith(".xml"));
      }

      if (!xmlFileName) {
        throw new AnafValidationError(
          "No XML file found in the downloaded ZIP archive"
        );
      }

      xmlContent = Buffer.from(files[xmlFileName]!).toString("utf-8");
    } catch (error) {
      if (error instanceof AnafValidationError || error instanceof AnafApiError)
        throw error;
      throw new AnafApiError(
        `Failed to extract invoice from ZIP: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        0
      );
    }

    try {
      return parseInvoiceXml(xmlContent);
    } catch (error) {
      throw new AnafApiError(
        `Failed to parse invoice XML: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        0
      );
    }
  }

  /**
   * Combined status check + download + error extraction.
   *
   * Orchestrates the full post-upload flow:
   * 1. Checks the upload status via `getStatusMessage`.
   * 2. If still processing (`in prelucrare`), returns status immediately.
   * 3. If done, downloads the ZIP archive from ANAF.
   * 4. If the upload failed (`nok`), unzips the archive and extracts any
   *    error messages from the ANAF response XML file inside it.
   *
   * @param uploadId - The upload index returned by `uploadDocument`
   * @returns Status with optional `data` (ZIP buffer) and enriched `errors`
   */
  async getUploadStatus(uploadId: string): Promise<UploadStatusResult> {
    const status = await this.getStatusMessage(uploadId);

    // Still processing or no download ID yet — nothing to download
    if (!status.downloadId) {
      return status;
    }

    const zipBuffer = await this.downloadDocument(status.downloadId);

    // On failure, try to extract the ANAF error message from inside the ZIP
    if (status.status === UploadStatusValue.Failed) {
      try {
        // Validate ZIP header
        if (zipBuffer.length >= 4 && zipBuffer[0] === 0x50 && zipBuffer[1] === 0x4b) {
          const files = unzipSync(new Uint8Array(zipBuffer));
          
          // Look for {uploadId}.xml specifically as instructed
          const targetFileName = `${uploadId}.xml`;
          const xmlData = files[targetFileName] || 
                         files[Object.keys(files).find(n => n.endsWith(".xml") && !n.startsWith("semnatura_")) || ""];

          if (xmlData) {
            const xmlContent = Buffer.from(xmlData).toString("utf-8");
            const xmlErrors = extractXmlErrors(xmlContent);
            if (xmlErrors.length > 0) {
              return {
                ...status,
                errors: [
                  ...(status.errors ?? []),
                  ...xmlErrors.map((e) => e.errorMessage),
                ],
                data: zipBuffer,
              };
            }
          }
        }
      } catch {
        // ZIP parsing failure is non-fatal — return what we have
      }
    }

    return { ...status, data: zipBuffer };
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
    if (params.endTime <= params.startTime) {
      throw new AnafValidationError("End time must be after start time");
    }

    if (typeof params.page !== "number" || params.page < 1) {
      throw new AnafValidationError("Page number must be 1 or greater");
    }

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
    const parsed = parseMessageDetails(raw.detalii);
    return {
      solicitationId: raw.id_solicitare,
      type: raw.tip,
      creationDate: raw.data_creare,
      id: raw.id,
      details: raw.detalii,
      cif: raw.cif,
      // Fields parsed from the detalii string
      uploadIndex: parsed.uploadIndex,
      cifEmitent: parsed.cifEmitent,
      cifBeneficiar: parsed.cifBeneficiar,
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
