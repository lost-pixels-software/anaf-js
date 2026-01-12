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
} from "../utils/codes";

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
// Invoice Config
// =============================================================================

/**
 * Complete invoice configuration with ALL fields explicitly typed.
 *
 * Required fields MUST be provided - TypeScript enforces this at compile time.
 * Optional fields (marked with ?) can be omitted - they have sensible defaults.
 */
export interface InvoiceConfig {
  // ===========================================================================
  // REQUIRED: Invoice Identification
  // ===========================================================================

  /**
   * Invoice number (REQUIRED)
   * @example "2024-001", "INV001"
   */
  invoiceNumber: string;

  /**
   * Invoice issue date (REQUIRED)
   * @example new Date(), "2024-01-15"
   */
  issueDate: Date | string;

  // ===========================================================================
  // REQUIRED: Parties
  // ===========================================================================

  /**
   * Seller/Supplier information (REQUIRED)
   * Must include: registrationName, registrationCode, vatCode, address
   */
  seller: Seller;

  /**
   * Buyer/Customer information (REQUIRED)
   * Must include: registrationName, registrationCode, address
   */
  buyer: Buyer;

  // ===========================================================================
  // REQUIRED: Line Items
  // ===========================================================================

  /**
   * Invoice line items (REQUIRED - at least one)
   * Each line needs: name, quantity, unitPrice
   * Optional per line: vatPercent, unitCode, description, taxCategoryCode
   */
  lines: InvoiceLineInput[];

  // ===========================================================================
  // OPTIONAL: Invoice Metadata
  // ===========================================================================

  /**
   * Invoice series/prefix
   * @example "ABC", "TS"
   * @default undefined (no prefix)
   */
  invoiceSeries?: string;

  /**
   * Payment due date
   * @default Same as issueDate
   */
  dueDate?: Date | string;

  /**
   * Invoice type code
   * - "380": Commercial Invoice (default)
   * - "381": Credit Note
   * - "384": Corrected Invoice
   * - "389": Self-billed Invoice (Autofactură)
   * - "751": Invoice for accounting purposes
   * @default "380"
   */
  invoiceTypeCode?: InvoiceTypeCode;

  /**
   * Currency code (ISO 4217)
   * @default "RON"
   */
  currencyCode?: string;

  /**
   * Free-text note/comment on invoice
   * @example "Mulțumim pentru colaborare!"
   */
  note?: string;

  /**
   * Buyer's reference/order number
   * @example "PO-2024-001"
   */
  buyerReference?: string;

  /**
   * VAT point date (when tax becomes due)
   * @default undefined (uses issue date)
   */
  taxPointDate?: Date | string;

  // ===========================================================================
  // OPTIONAL: VAT Configuration
  // ===========================================================================

  /**
   * Default VAT percentage for lines without explicit vatPercent
   * @example 19 (for 19% VAT)
   * @default 0
   */
  defaultVatPercent?: number;

  // ===========================================================================
  // OPTIONAL: Payment Information
  // ===========================================================================

  /**
   * Full payment means configuration
   * Use this for detailed payment setup (card, direct debit, etc.)
   */
  paymentMeans?: PaymentMeans;

  /**
   * Shortcut: Payment IBAN for simple bank transfer
   * If provided, creates paymentMeans with code "30" (credit transfer)
   * @example "RO49AAAA1B31007593840000"
   */
  paymentIban?: string;

  /**
   * Payment terms/conditions
   * @example { note: "Payment within 30 days" }
   */
  paymentTerms?: PaymentTerms;

  // ===========================================================================
  // OPTIONAL: Document References
  // ===========================================================================

  /**
   * Order reference (purchase order number)
   * @example { id: "PO-2024-001" }
   */
  orderReference?: DocumentReference;

  /**
   * Contract reference
   * @example { id: "CONTRACT-2024-001" }
   */
  contractReference?: DocumentReference;

  /**
   * Preceding invoice references (REQUIRED for credit notes)
   * Links this document to the original invoice being credited
   * @example [{ id: "INV-2024-001", issueDate: "2024-01-01" }]
   */
  precedingInvoiceReferences?: DocumentReference[];

  // ===========================================================================
  // OPTIONAL: Invoice Period
  // ===========================================================================

  /**
   * Billing period (for services billed over time)
   * @example { startDate: "2024-01-01", endDate: "2024-01-31" }
   */
  invoicePeriod?: InvoicePeriod;

  // ===========================================================================
  // OPTIONAL: Allowances & Charges (Document Level)
  // ===========================================================================

  /**
   * Document-level discounts and surcharges
   * - chargeIndicator: false = discount, true = surcharge
   * @example [{ chargeIndicator: false, reason: "10% discount", amount: 100, vatPercent: 19 }]
   */
  allowanceCharges?: AllowanceCharge[];
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
} from "../utils/codes";
