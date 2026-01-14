/**
 * ANAF e-Factura Library
 *
 * A comprehensive TypeScript library for the Romanian ANAF e-Factura system.
 * Features:
 * - Invoice XML generation (CIUS-RO compliant)
 * - OAuth 2.0 authentication
 * - Company info lookup
 * - e-Factura API operations
 *
 * @example
 * ```typescript
 * import { Invoice, CompanyInfoClient, EfacturaClient } from 'anaf-js';
 *
 * // Generate invoice XML
 * const xml = Invoice.buildXml({
 *   invoiceNumber: '2024-001',
 *   issueDate: new Date(),
 *   seller: { ... },
 *   buyer: { ... },
 *   lines: [{ name: 'Product', quantity: 1, unitPrice: 100, vatPercent: 21 }],
 * });
 *
 * // Lookup company info (no auth required)
 * const companyClient = new CompanyInfoClient();
 * const companyData = await companyClient.getCompanyData('RO12345678');
 *
 * // Upload invoice to ANAF (requires OAuth)
 * const efacturaClient = new EfacturaClient({
 *   vatNumber: 'RO12345678',
 *   accessToken: '...',
 *   refreshToken: '...',
 * });
 * const uploadResult = await efacturaClient.uploadDocument(xml);
 * ```
 */

// =============================================================================
// Main Classes
// =============================================================================

export { Invoice } from "./Invoice";
export { CompanyInfoClient } from "./CompanyInfoClient";
export { EfacturaClient } from "./EfacturaClient";
export { AnafAuthenticator } from "./AnafAuthenticator";

// =============================================================================
// Errors
// =============================================================================

export {
  AnafError,
  AnafValidationError,
  AnafApiError,
  AnafAuthenticationError,
  AnafNotFoundError,
} from "./shared/errors";

// =============================================================================
// OAuth & Credentials Utilities
// =============================================================================

export { startAuthServer, runOAuthFlow } from "./utils/auth-server";
export {
  loadCredentials,
  saveCredentials,
  hasValidCredentials,
  clearCredentials,
} from "./utils/credentials";

// =============================================================================
// Invoice Types
// =============================================================================

export type {
  // Address & Party types
  Address,
  Seller,
  Buyer,
  PartyBase,

  // Invoice line types
  InvoiceLineInput,

  // Payment types
  PaymentMeans,
  PaymentTerms,
  BankTransferPayment,
  CardPayment,
  DirectDebitPayment,

  // Invoice structure types
  InvoiceConfig,
  AllowanceCharge,
  InvoicePeriod,
  DocumentReference,
} from "./types";

// Code types
export type {
  InvoiceTypeCode,
  TaxCategoryCode,
  TaxDueCode,
  PaymentMeansCode,
  TaxExemptionCode,
  UnitCode,
} from "./types/codes";

// =============================================================================
// Company Types
// =============================================================================

export type {
  CompanyData,
  CompanyResult,
  GeneralData,
  HqAddress,
  FiscalAddress,
  VatRegistration,
  VatAtCheckout,
  InactiveState,
  SplitVat,
  VatPeriod,
} from "./types/company";

// =============================================================================
// e-Factura Types
// =============================================================================

export type {
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
} from "./types/efactura";

export {
  ExecutionStatus,
  UploadStatusValue,
  MessageFilter,
} from "./types/efactura";

export type { UploadStandard, ValidationStandard } from "./types/efactura";

// =============================================================================
// Auth Types
// =============================================================================

export type {
  AnafAuthConfig,
  AuthUrlSettings,
  TokenResponse,
  StoredCredentials,
} from "./AnafAuthenticator";

export type { CompanyInfoConfig } from "./CompanyInfoClient";

// =============================================================================
// Utility Functions
// =============================================================================

export {
  formatDate,
  isValidDateFormat,
  getToday,
  addDays,
} from "./utils/format-date";

export {
  isBucharest,
  sanitizeCity,
  sanitizeCounty,
  normalizeVatNumber,
} from "./utils/address-sanitizer";

export { roundMoney } from "./utils/currency";

// =============================================================================
// Constants
// =============================================================================

export {
  // Invoice type codes
  InvoiceTypeCodes,
  // Tax category codes
  TaxCategoryCodes,
  // Tax exemption codes
  TaxExemptionCodes,
  // Tax due codes
  TaxDueCodes,
  // Payment means codes
  PaymentMeansCodes,
  // Unit codes
  CommonUnitCodes,
  // Romanian county codes
  RomanianCountyCodes,
  BucharestSectors,
} from "./shared/codes";

export {
  getBasePath,
  DEFAULT_TIMEOUT,
  DEFAULT_CURRENCY,
  DEFAULT_COUNTRY_CODE,
} from "./shared/constants";
