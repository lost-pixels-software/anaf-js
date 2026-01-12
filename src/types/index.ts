/**
 * CIUS-RO Compliant Invoice Types
 * 
 * These types are designed to provide flexibility while ensuring
 * compliance with Romanian e-Invoice requirements.
 */

import type {
  InvoiceTypeCode,
  TaxCategoryCode,
  TaxDueCode,
  PaymentMeansCode,
  TaxExemptionCode,
  UnitCode,
} from '../utils/codes';

// =============================================================================
// Address Types
// =============================================================================

export interface Address {
  /** Street name and number */
  streetName: string;
  /** Additional street info (building, floor, etc.) */
  additionalStreetName?: string;
  /** City name */
  cityName: string;
  /** Postal/ZIP code */
  postalZone?: string;
  /** County/Region code (e.g., RO-CJ for Cluj) */
  countrySubentity?: string;
  /** Country code (ISO 3166-1 alpha-2, default: RO) */
  countryCode?: string;
}

// =============================================================================
// Party/Entity Types
// =============================================================================

export interface PartyBase {
  /** Company/Entity legal name */
  registrationName: string;
  /** Company identification code (CUI/CIF without RO prefix) */
  registrationCode: string;
  /** Trade Registry number (J00/000/0000) */
  registrationNumber?: string;
  /** Address information */
  address: Address;
  /** Contact email */
  email?: string;
  /** Contact phone */
  phone?: string;
}

export interface Seller extends PartyBase {
  /** VAT registration code (with country prefix, e.g., RO12345678) - null if not VAT registered */
  vatCode: string | null;
  /** Legal form data (e.g., "Capital social: 200 LEI") - required by CIUS-RO */
  legalFormData?: string;
  /** Bank account IBAN */
  bankAccount?: string;
  /** Bank name */
  bankName?: string;
}

export interface Buyer extends PartyBase {
  /** VAT registration code (with country prefix) - null if not VAT registered */
  vatCode?: string | null;
}

// =============================================================================
// Invoice Line Types
// =============================================================================

export interface InvoiceLineInput {
  /** Line ID (auto-generated if not provided) */
  id?: string | number;
  /** Item/service name */
  name: string;
  /** Item description (optional) */
  description?: string;
  /** Seller's item identification code (optional) */
  sellerItemId?: string;
  /** Quantity */
  quantity: number;
  /** Unit of measure code (default: EA) */
  unitCode?: UnitCode;
  /** Unit price excluding VAT */
  unitPrice: number;
  /** VAT percentage (e.g., 19 for 19%) - if not provided, will use invoice default or 0 */
  vatPercent?: number;
  /** Tax category code - auto-determined if not provided */
  taxCategoryCode?: TaxCategoryCode;
  /** Tax exemption reason code (required for E, AE, K, G, O categories) */
  taxExemptionReasonCode?: TaxExemptionCode;
  /** Tax exemption reason description */
  taxExemptionReason?: string;
}

export interface InvoiceLineComputed extends InvoiceLineInput {
  /** Computed line extension amount (quantity × unitPrice) */
  lineExtensionAmount: number;
  /** Computed VAT amount for this line */
  vatAmount: number;
  /** Resolved tax category */
  resolvedTaxCategoryCode: TaxCategoryCode;
  /** Resolved VAT percent (always a number after computation) */
  vatPercent: number;
}

// =============================================================================
// Tax Data Types
// =============================================================================

export interface TaxSubtotalData {
  /** Tax category ID */
  categoryId: TaxCategoryCode;
  /** Tax scheme ID (usually "VAT") */
  taxSchemeId: string;
  /** Tax percentage (null for exempt categories) */
  taxPercent: number | null;
  /** Sum of line amounts for this tax category */
  taxableAmount: number;
  /** Calculated tax amount */
  taxAmount: number;
  /** Tax exemption reason code */
  taxExemptionReasonCode?: TaxExemptionCode;
  /** Tax exemption reason description */
  taxExemptionReason?: string;
}

export interface TaxTotalData {
  /** Total VAT amount */
  taxAmount: number;
  /** Tax subtotals grouped by category/percentage */
  taxSubtotals: TaxSubtotalData[];
}

// =============================================================================
// Monetary Totals Types
// =============================================================================

export interface MonetaryTotals {
  /** Sum of all line extension amounts (before VAT) */
  lineExtensionAmount: number;
  /** Total amount before VAT */
  taxExclusiveAmount: number;
  /** Total amount including VAT */
  taxInclusiveAmount: number;
  /** Amount prepaid (optional) */
  prepaidAmount?: number;
  /** Rounding amount (optional) */
  payableRoundingAmount?: number;
  /** Final amount to be paid */
  payableAmount: number;
  /** Allowances total (optional) */
  allowanceTotalAmount?: number;
  /** Charges total (optional) */
  chargeTotalAmount?: number;
}

// =============================================================================
// Payment Types
// =============================================================================

export interface BankTransferPayment {
  /** Payee account IBAN */
  accountId: string;
  /** Account holder name */
  accountName?: string;
  /** Bank/Institution name or BIC */
  bankId?: string;
}

export interface CardPayment {
  /** Primary account number (last 4-6 digits) */
  primaryAccountNumber: string;
  /** Card network (VISA, MASTERCARD, etc.) */
  networkId: string;
  /** Cardholder name */
  holderName?: string;
}

export interface DirectDebitPayment {
  /** Mandate reference ID */
  mandateId: string;
  /** Debited account ID */
  debitedAccountId: string;
  /** Creditor ID (optional) */
  creditorId?: string;
}

export interface PaymentMeans {
  /** Payment means code (e.g., '30' for credit transfer) */
  paymentMeansCode: PaymentMeansCode;
  /** Payment means description */
  paymentMeansDescription?: string;
  /** Payment reference/ID */
  paymentId?: string;
  /** Bank transfer details */
  bankTransfer?: BankTransferPayment;
  /** Card payment details */
  cardPayment?: CardPayment;
  /** Direct debit details */
  directDebit?: DirectDebitPayment;
}

export interface PaymentTerms {
  /** Payment terms note/description */
  note?: string;
}

// =============================================================================
// Invoice Period Types
// =============================================================================

export interface InvoicePeriod {
  /** Period start date */
  startDate?: Date | string;
  /** Period end date */
  endDate?: Date | string;
  /** Description code for VAT date */
  descriptionCode?: TaxDueCode;
}

// =============================================================================
// Document Reference Types
// =============================================================================

export interface DocumentReference {
  /** Document ID/number */
  id: string;
  /** Issue date */
  issueDate?: Date | string;
  /** Document type code */
  documentTypeCode?: string;
  /** Document description */
  documentDescription?: string;
}

// =============================================================================
// Allowance/Charge Types
// =============================================================================

export interface AllowanceCharge {
  /** true = charge, false = allowance */
  chargeIndicator: boolean;
  /** Reason code */
  reasonCode?: string;
  /** Reason description */
  reason?: string;
  /** Amount */
  amount: number;
  /** Base amount for percentage calculation */
  baseAmount?: number;
  /** Percentage (if applicable) */
  percentage?: number;
  /** Tax category */
  taxCategoryCode?: TaxCategoryCode;
  /** VAT percentage */
  vatPercent?: number;
}

// =============================================================================
// Main Invoice Configuration Types
// =============================================================================

export interface InvoiceGeneralData {
  /** Invoice series (prefix) */
  invoiceSeries?: string;
  /** Invoice number */
  invoiceNumber: string;
  /** Issue date */
  issueDate: Date | string;
  /** Due date (defaults to issue date) */
  dueDate?: Date | string;
  /** Invoice type code (default: 380 - Commercial Invoice) */
  invoiceTypeCode?: InvoiceTypeCode;
  /** Currency code (always RON for Romanian invoices) */
  currencyCode?: string;
  /** Invoice note */
  note?: string;
  /** Buyer reference */
  buyerReference?: string;
  /** Order reference */
  orderReference?: DocumentReference;
  /** Contract reference */
  contractReference?: DocumentReference;
  /** Invoice period */
  invoicePeriod?: InvoicePeriod;
  /** VAT point date (tax point date) */
  taxPointDate?: Date | string;
}

// =============================================================================
// Invoice Input (for simple builder interface)
// =============================================================================

export interface SimpleInvoiceInput {
  /** Invoice number (with optional series) */
  invoiceNumber: string;
  /** Invoice series (optional, can be included in invoiceNumber) */
  invoiceSeries?: string;
  /** Issue date */
  issueDate: Date | string;
  /** Due date */
  dueDate?: Date | string;
  /** Invoice type */
  invoiceTypeCode?: InvoiceTypeCode;
  /** Note */
  note?: string;
  /** Seller information */
  seller: Seller;
  /** Buyer information */
  buyer: Buyer;
  /** Invoice line items */
  lines: InvoiceLineInput[];
  /** Payment IBAN (shortcut for simple bank transfer) */
  paymentIban?: string;
  /** Default VAT percentage for lines without explicit VAT */
  defaultVatPercent?: number;
}

// =============================================================================
// Full Invoice Data (computed/final)
// =============================================================================

export interface InvoiceData {
  /** General invoice information */
  generalData: InvoiceGeneralData;
  /** Seller party */
  seller: Seller;
  /** Buyer party */
  buyer: Buyer;
  /** Payment means (optional) */
  paymentMeans?: PaymentMeans;
  /** Payment terms (optional) */
  paymentTerms?: PaymentTerms;
  /** Document-level allowances/charges */
  allowanceCharges?: AllowanceCharge[];
  /** Tax totals */
  taxTotal: TaxTotalData;
  /** Monetary totals */
  monetaryTotals: MonetaryTotals;
  /** Invoice lines */
  lines: InvoiceLineComputed[];
  /** Preceding invoice references (for credit notes) */
  precedingInvoiceReferences?: DocumentReference[];
}

// =============================================================================
// Re-exports for convenience
// =============================================================================

export type {
  InvoiceTypeCode,
  TaxCategoryCode,
  TaxDueCode,
  PaymentMeansCode,
  TaxExemptionCode,
  UnitCode,
} from '../utils/codes';
