/**
 * ANAF e-Factura Library
 *
 * A simple library for generating CIUS-RO compliant invoices
 * for the Romanian ANAF e-Factura system.
 *
 * @example
 * ```typescript
 * import { Invoice, type InvoiceConfig } from 'anaf-js';
 *
 * const xml = Invoice.buildXml({
 *   invoiceNumber: '2024-001',
 *   issueDate: new Date(),
 *   seller: { ... },
 *   buyer: { ... },
 *   lines: [{ name: 'Product', quantity: 1, unitPrice: 100, vatPercent: 21 }],
 * });
 * ```
 */

// Main Invoice class
export { Invoice } from "./Invoice";

// Types
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

// Code types - exported directly from source to ensure proper .d.ts resolution
export type {
  InvoiceTypeCode,
  TaxCategoryCode,
  TaxDueCode,
  PaymentMeansCode,
  TaxExemptionCode,
  UnitCode,
} from "./utils/codes";

// Utility functions
export {
  formatDate,
  isValidDateFormat,
  getToday,
  addDays,
} from "./utils/format-date";

export {
  isBucharest,
  sanitizeBucharestSector,
  sanitizeCounty,
  normalizeVatNumber,
} from "./utils/address-sanitizer";

export { roundMoney } from "./utils/currency";

// Code constants and helpers
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
} from "./utils/codes";
