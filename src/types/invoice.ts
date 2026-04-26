/**
 * Parsed Invoice Types
 *
 * Type definitions for invoices extracted from UBL XML.
 */

// =============================================================================
// Party Types
// =============================================================================

export interface ParsedAddress {
  streetName?: string;
  additionalStreetName?: string;
  cityName?: string;
  postalZone?: string;
  countrySubentity?: string;
  countryCode?: string;
}

export interface ParsedParty {
  name?: string;
  registrationName?: string;
  registrationCode?: string;
  vatCode?: string;
  registrationNumber?: string;
  legalFormData?: string;
  address?: ParsedAddress;
  phone?: string;
  email?: string;
}

// =============================================================================
// Line Item Types
// =============================================================================

export interface ParsedInvoiceLine {
  id?: string;
  name?: string;
  description?: string;
  sellerItemId?: string;
  quantity?: number;
  unitCode?: string;
  unitPrice?: number;
  lineExtensionAmount?: number;
  vatPercent?: number;
  taxCategoryCode?: string;
}

// =============================================================================
// Tax Types
// =============================================================================

export interface ParsedTaxSubtotal {
  taxableAmount?: number;
  taxAmount?: number;
  categoryId?: string;
  taxPercent?: number | null;
  taxExemptionReasonCode?: string;
  taxExemptionReason?: string;
}

export interface ParsedTaxTotal {
  taxAmount?: number;
  currency?: string;
  subtotals?: ParsedTaxSubtotal[];
}

// =============================================================================
// Monetary Totals
// =============================================================================

export interface ParsedMonetaryTotal {
  lineExtensionAmount?: number;
  taxExclusiveAmount?: number;
  taxInclusiveAmount?: number;
  allowanceTotalAmount?: number;
  chargeTotalAmount?: number;
  payableAmount?: number;
  currency?: string;
}

// =============================================================================
// Payment & Allowance Types
// =============================================================================

export interface ParsedPaymentMeans {
  paymentMeansCode?: string;
  paymentMeansDescription?: string;
  paymentId?: string;
  bankTransfer?: {
    accountId?: string;
    accountName?: string;
    bankId?: string;
  };
  cardPayment?: {
    primaryAccountNumber?: string;
    networkId?: string;
    holderName?: string;
  };
}

export interface ParsedAllowanceCharge {
  chargeIndicator?: boolean;
  reasonCode?: string;
  reason?: string;
  percentage?: number;
  amount?: number;
  baseAmount?: number;
  taxCategoryCode?: string;
  vatPercent?: number;
}

// =============================================================================
// Document References
// =============================================================================

export interface ParsedDocumentReference {
  id?: string;
  issueDate?: string;
}

export interface ParsedInvoicePeriod {
  startDate?: string;
  endDate?: string;
  descriptionCode?: string;
}

// =============================================================================
// Main Invoice Data
// =============================================================================

export interface InvoiceData {
  /** Invoice ID */
  invoiceId?: string;
  /** Invoice series (if embedded in ID) */
  invoiceSeries?: string;
  /** Invoice number (if embedded in ID) */
  invoiceNumber?: string;
  /** Issue date (YYYY-MM-DD) */
  issueDate?: string;
  /** Due date (YYYY-MM-DD) */
  dueDate?: string;
  /** Tax point date (YYYY-MM-DD) */
  taxPointDate?: string;
  /** Invoice type code (380 = invoice, 381 = credit note, etc.) */
  invoiceTypeCode?: string;
  /** Document currency */
  currency?: string;
  /** Tax currency (when different from document currency) */
  taxCurrency?: string;
  /** Free-text note */
  note?: string;
  /** Buyer reference */
  buyerReference?: string;
  /** Invoice period */
  invoicePeriod?: ParsedInvoicePeriod;
  /** Order reference ID */
  orderReference?: string;
  /** Contract reference ID */
  contractReference?: string;
  /** Preceding invoice references (for credit notes) */
  precedingInvoiceReferences?: ParsedDocumentReference[];
  /** Seller information */
  seller?: ParsedParty;
  /** Buyer information */
  buyer?: ParsedParty;
  /** Payment means */
  paymentMeans?: ParsedPaymentMeans;
  /** Payment terms note */
  paymentTerms?: string;
  /** Document-level allowances and charges */
  allowanceCharges?: ParsedAllowanceCharge[];
  /** Tax totals */
  taxTotals?: ParsedTaxTotal[];
  /** Legal monetary totals */
  monetaryTotal?: ParsedMonetaryTotal;
  /** Invoice lines */
  lines?: ParsedInvoiceLine[];
  /** Number of invoice lines */
  lineCount?: number;
}
