/**
 * e-Factura Types
 *
 * Types for ANAF e-Factura API operations.
 */

// =============================================================================
// Enums
// =============================================================================

/**
 * Document upload standard
 */
export type UploadStandard = "UBL" | "CN" | "CII" | "RASP";

/**
 * Document validation standard
 */
export type ValidationStandard = "FACT1" | "FCN";

/**
 * Execution status
 */
export enum ExecutionStatus {
  Success = 0,
  Error = 1,
}

/**
 * Upload processing status
 */
export enum UploadStatusValue {
  Ok = "ok",
  Failed = "nok",
  InProgress = "in prelucrare",
}

/**
 * Message filter types
 */
export enum MessageFilter {
  /** Invoice sent by you */
  InvoiceSent = "T",
  /** Invoice received by you */
  InvoiceReceived = "P",
  /** Error messages */
  InvoiceErrors = "E",
  /** Buyer/seller messages */
  BuyerMessage = "R",
}

import type { StoredCredentials } from "../AnafAuthenticator";

/**
 * e-Factura client configuration
 */
export interface EfacturaClientConfig {
  /** VAT number (CIF) for the company */
  vatNumber: string;
  /** Use test environment */
  testMode?: boolean;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** OAuth access token */
  accessToken: string;
  /** OAuth refresh token */
  refreshToken: string;
  /** Token expiration time (Unix timestamp in ms) */
  expiresAt?: number;
  /** Callback for when token is refreshed */
  onTokenRefresh?: (credentials: StoredCredentials) => void | Promise<void>;
}

// =============================================================================
// Upload Types
// =============================================================================

/**
 * Upload options
 */
export interface UploadOptions {
  /** Document standard */
  standard?: UploadStandard;
  /** External invoice flag */
  extern?: boolean;
  /** Self-invoice (autofactura) flag */
  autofactura?: boolean;
  /** Execute immediately flag */
  executare?: boolean;
}

/**
 * Upload response
 */
export interface UploadResponse {
  /** Execution status */
  executionStatus: ExecutionStatus;
  /** Upload ID for status checking */
  uploadIndex?: string;
  /** Response timestamp */
  responseDate?: string;
  /** Error messages */
  errors?: string[];
}

// =============================================================================
// Status Types
// =============================================================================

/**
 * Status message response
 */
export interface StatusResponse {
  /** Processing status */
  status?: UploadStatusValue;
  /** Download ID (when status is OK) */
  downloadId?: string;
  /** Error messages */
  errors?: string[];
}

// =============================================================================
// Message Types
// =============================================================================

/**
 * Message details
 */
export interface Message {
  /** Request ID */
  solicitationId: string;
  /** Message type */
  type: string;
  /** Creation date */
  creationDate: string;
  /** Download ID */
  id: string;
  /** Raw details string from ANAF */
  details: string;
  /** CIF number */
  cif: string;

  // Fields parsed from the `details` string:

  /** Upload/request ID (parsed from details — id_incarcare) */
  uploadIndex?: string;
  /** Emitter CIF (parsed from details — cif_emitent) */
  cifEmitent?: string;
  /** Beneficiary CIF (parsed from details — cif_beneficiar) */
  cifBeneficiar?: string;
  /** Emitter company name (resolved via CompanyInfoClient batch lookup) */
  emitentName?: string;
}

/**
 * List messages parameters
 */
export interface ListMessagesParams {
  /** Days to search (1-60) */
  days: number;
  /** Message filter */
  filter?: MessageFilter;
}

/**
 * List messages response
 */
export interface ListMessagesResponse {
  /** Messages */
  messages?: Message[];
  /** Serial number */
  serial?: string;
  /** CIF */
  cui?: string;
  /** Title */
  title?: string;
  /** Error */
  error?: string;
}

/**
 * Paginated messages parameters
 */
export interface PaginatedMessagesParams {
  /** Start time (Unix timestamp in ms) */
  startTime: number;
  /** End time (Unix timestamp in ms) */
  endTime: number;
  /** Page number */
  page: number;
  /** Message filter */
  filter?: MessageFilter;
}

/**
 * Paginated messages response
 */
export interface PaginatedMessagesResponse {
  /** Messages */
  messages?: Message[];
  /** Records in current page */
  recordsInPage?: number;
  /** Records per page */
  recordsPerPage?: number;
  /** Total records */
  totalRecords?: number;
  /** Total pages */
  totalPages?: number;
  /** Current page index */
  currentPage?: number;
  /** Serial */
  serial?: string;
  /** CIF */
  cui?: string;
  /** Title */
  title?: string;
  /** Error */
  error?: string;
}

// =============================================================================
// Validation Types
// =============================================================================

/**
 * Validation result
 */
export interface ValidationResult {
  /** Is valid */
  valid: boolean;
  /** Status string */
  status: string;
  /** Validation messages */
  messages?: string[];
  /** Trace ID */
  traceId?: string;
}

// =============================================================================
// Raw API Response Types
// =============================================================================

/**
 * Raw upload response from ANAF
 */
export interface UploadResponseRaw {
  dateResponse: string;
  ExecutionStatus: number;
  index_incarcare?: string;
  Errors?: Array<{ errorMessage: string }>;
}

/**
 * Raw status response from ANAF
 */
export interface StatusResponseRaw {
  stare?: string;
  id_descarcare?: string;
  Errors?: Array<{ errorMessage: string }>;
}

/**
 * Raw message from ANAF
 */
export interface MessageRaw {
  id_solicitare: string;
  tip: string;
  data_creare: string;
  id: string;
  detalii: string;
  cif: string;
}

/**
 * Raw messages response from ANAF
 */
export interface ListMessagesResponseRaw {
  mesaje?: MessageRaw[];
  serial?: string;
  cui?: string;
  titlu?: string;
  eroare?: string;
}

/**
 * Raw paginated messages response from ANAF
 */
export interface PaginatedMessagesResponseRaw {
  mesaje?: MessageRaw[];
  numar_inregistrari_in_pagina?: number;
  numar_total_inregistrari_per_pagina?: number;
  numar_total_inregistrari?: number;
  numar_total_pagini?: number;
  index_pagina_curenta?: number;
  serial?: string;
  cui?: string;
  titlu?: string;
  eroare?: string;
}

/**
 * Raw validation response from ANAF
 */
export interface ValidationResponseRaw {
  stare: string;
  Messages?: Array<{ message: string }>;
  trace_id?: string;
}
