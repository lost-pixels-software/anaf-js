/**
 * ANAF API Constants
 */

// =============================================================================
// Base API Paths
// =============================================================================

/** OAuth-based API - Test environment */
export const BASE_PATH_OAUTH_TEST = "https://api.anaf.ro/test/FCTEL/rest";

/** OAuth-based API - Production environment */
export const BASE_PATH_OAUTH_PROD = "https://api.anaf.ro/prod/FCTEL/rest";

// =============================================================================
// OAuth 2.0 Authentication Endpoints
// =============================================================================

/** OAuth authorization endpoint */
export const OAUTH_AUTHORIZE_URL =
  "https://logincert.anaf.ro/anaf-oauth2/v1/authorize";

/** OAuth token endpoint */
export const OAUTH_TOKEN_URL = "https://logincert.anaf.ro/anaf-oauth2/v1/token";

// =============================================================================
// Public API Endpoints
// =============================================================================

/** Company info API (no auth required) */
export const COMPANY_INFO_URL =
  "https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva";

// =============================================================================
// e-Factura API Paths (relative)
// =============================================================================

/** Upload document */
export const UPLOAD_PATH = "/upload";

/** Upload B2C document */
export const UPLOAD_B2C_PATH = "/uploadb2c";

/** Check upload status */
export const STATUS_MESSAGE_PATH = "/stareMesaj";

/** Download processed document */
export const DOWNLOAD_PATH = "/descarcare";

/** List messages */
export const LIST_MESSAGES_PATH = "/listaMesajeFactura";

/** List messages with pagination */
export const LIST_MESSAGES_PAGINATED_PATH = "/listaMesajePaginatieFactura";

/** XML validation */
export const VALIDATE_XML_PATH = "/validare";

/** XML to PDF conversion */
export const XML_TO_PDF_PATH = "/transformare";

// =============================================================================
// Default Configuration
// =============================================================================

/** Default request timeout in milliseconds */
export const DEFAULT_TIMEOUT = 30000;

/** Default currency */
export const DEFAULT_CURRENCY = "RON";

/** Default country code */
export const DEFAULT_COUNTRY_CODE = "RO";

/** UBL customization ID for CIUS-RO */
export const UBL_CUSTOMIZATION_ID =
  "urn:cen.eu:en16931:2017#compliant#urn:efactura.mfinante.ro:CIUS-RO:1.0.1";

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get base path for e-Factura API
 */
export function getBasePath(testMode: boolean = false): string {
  return testMode ? BASE_PATH_OAUTH_TEST : BASE_PATH_OAUTH_PROD;
}
