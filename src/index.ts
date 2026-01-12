/**
 * ANAF e-Factura Library
 * 
 * A comprehensive library for generating CIUS-RO compliant invoices
 * for the Romanian ANAF e-Factura system.
 * 
 * @example
 * ```typescript
 * import { Invoice } from 'anaf';
 * 
 * // Simple approach - automatic calculations
 * const invoice = Invoice.fromSimpleInput({
 *   invoiceNumber: 'INV-2024-001',
 *   issueDate: new Date(),
 *   seller: { ... },
 *   buyer: { ... },
 *   lines: [
 *     { name: 'Product', quantity: 1, unitPrice: 100, vatPercent: 19 }
 *   ],
 * });
 * 
 * const xml = invoice.generateXml();
 * 
 * // Or use the builder pattern for more control
 * const invoice2 = new Invoice()
 *   .setGeneralData({ ... })
 *   .setSeller({ ... })
 *   .setBuyer({ ... })
 *   .addLine({ ... })
 *   .setPaymentMeans({ ... })
 *   .generateXml();
 * ```
 */

// Main Invoice class
export { Invoice } from './Invoice';

// Types
export type {
  // Address & Party types
  Address,
  Seller,
  Buyer,
  PartyBase,
  
  // Invoice line types
  InvoiceLineInput,
  InvoiceLineComputed,
  
  // Tax types
  TaxSubtotalData,
  TaxTotalData,
  
  // Monetary types
  MonetaryTotals,
  
  // Payment types
  PaymentMeans,
  PaymentTerms,
  BankTransferPayment,
  CardPayment,
  DirectDebitPayment,
  
  // Invoice structure types
  InvoiceGeneralData,
  InvoiceData,
  SimpleInvoiceInput,
  AllowanceCharge,
  InvoicePeriod,
  DocumentReference,
  
  // Code types
  InvoiceTypeCode,
  TaxCategoryCode,
  TaxDueCode,
  PaymentMeansCode,
  TaxExemptionCode,
  UnitCode,
} from './types';

// Utility functions
export {
  formatDate,
  isValidDateFormat,
  getToday,
  addDays,
} from './utils/format-date';

export {
  isBucharest,
  sanitizeBucharestSector,
  sanitizeCounty,
  normalizeVatNumber,
} from './utils/address-sanitizer';

export {
  roundMoney,
} from './utils/currency';

// Code constants and helpers
export {
  // Invoice type codes
  InvoiceTypeCodes,
  InvoiceTypeCodesDescriptions,
  
  // Tax category codes
  TaxCategoryCodes,
  TaxCategoryCodesDescriptions,
  
  // Tax exemption codes
  TaxExemptionCodes,
  
  // Tax due codes
  TaxDueCodes,
  TaxDueCodesDescriptions,
  
  // Payment means codes
  PaymentMeansCodes,
  CommonPaymentMeansCodesDescriptions,
  
  // Unit codes
  CommonUnitCodes,
  
  // Romanian county codes
  RomanianCountyCodes,
  BucharestSectors,
} from './utils/codes';
