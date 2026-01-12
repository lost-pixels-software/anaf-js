/**
 * ANAF e-Invoice Generator
 *
 * A simple invoice generator for Romanian e-Factura (CIUS-RO compliant).
 * Pass your invoice config, get XML. All calculations are automatic.
 */

import { create } from "xmlbuilder2";
import type { XMLBuilder } from "xmlbuilder2/lib/interfaces";

import type {
  Seller,
  Buyer,
  InvoiceLineInput,
  PaymentMeans,
  AllowanceCharge,
  InvoiceConfig,
  DocumentReference,
  InvoicePeriod,
} from "./types";

import { type TaxCategoryCode, type TaxExemptionCode } from "./utils/codes";

import { formatDate } from "./utils/format-date";
import {
  isBucharest,
  sanitizeBucharestSector,
  sanitizeCounty,
  normalizeVatNumber,
} from "./utils/address-sanitizer";
import { roundMoney } from "./utils/currency";

// =============================================================================
// Constants
// =============================================================================

const UBL_CUSTOMIZATION_ID =
  "urn:cen.eu:en16931:2017#compliant#urn:efactura.mfinante.ro:CIUS-RO:1.0.1";
const UBL_VERSION = "2.1";
const DEFAULT_CURRENCY = "RON";
const DEFAULT_COUNTRY_CODE = "RO";
const DEFAULT_UNIT_CODE = "EA";
const DEFAULT_TAX_SCHEME = "VAT";

// =============================================================================
// Invoice Builder
// =============================================================================

/**
 * Build a CIUS-RO compliant invoice XML from a configuration object.
 *
 * All calculations (line amounts, VAT, totals) are automatic.
 * TypeScript enforces required fields at compile time.
 *
 * @example
 * ```typescript
 * import { Invoice } from "anaf-js";
 *
 * const xml = Invoice.buildXml({
 *   invoiceNumber: "2024-001",
 *   issueDate: new Date(),
 *   seller: { ... },
 *   buyer: { ... },
 *   lines: [{ name: "Service", quantity: 1, unitPrice: 100, vatPercent: 19 }],
 * });
 * ```
 */
export class Invoice {
  /**
   * Build an invoice XML from configuration.
   *
   * Required fields:
   * - `invoiceNumber` - Invoice number/ID
   * - `issueDate` - Issue date
   * - `seller` - Seller information (name, CUI, address, vatCode)
   * - `buyer` - Buyer information (name, CUI, address)
   * - `lines` - At least one line item (name, quantity, unitPrice)
   *
   * Optional fields (all have sensible defaults):
   * - `invoiceSeries` - Invoice prefix
   * - `dueDate` - Payment due date (defaults to issueDate)
   * - `invoiceTypeCode` - "380" (invoice), "381" (credit note), etc.
   * - `defaultVatPercent` - Default VAT for lines without vatPercent
   * - `paymentIban` - Shortcut for bank transfer payment
   * - `paymentMeans` - Full payment configuration
   * - `allowanceCharges` - Document-level discounts/surcharges
   * - `note`, `buyerReference`, `orderReference`, `contractReference`, etc.
   */
  static buildXml(config: InvoiceConfig): string {
    validateConfig(config);
    return generateXml(config);
  }
}

// =============================================================================
// Validation
// =============================================================================

function validateConfig(config: InvoiceConfig): void {
  if (!config.invoiceNumber?.trim()) {
    throw new Error("Invoice number is required");
  }

  if (!config.issueDate) {
    throw new Error("Issue date is required");
  }

  if (!config.seller) {
    throw new Error("Seller information is required");
  }
  validateParty(config.seller, "Seller");

  if (!config.buyer) {
    throw new Error("Buyer information is required");
  }
  validateParty(config.buyer, "Buyer");

  if (!config.lines || config.lines.length === 0) {
    throw new Error("At least one invoice line is required");
  }

  for (let i = 0; i < config.lines.length; i++) {
    validateLine(config.lines[i], i);
  }
}

function validateParty(party: Seller | Buyer, role: string): void {
  if (!party.registrationName?.trim()) {
    throw new Error(`${role} registration name is required`);
  }

  if (!party.registrationCode?.trim()) {
    throw new Error(`${role} registration code (CUI/CIF) is required`);
  }

  if (!party.address) {
    throw new Error(`${role} address is required`);
  }

  if (!party.address.streetName?.trim()) {
    throw new Error(`${role} street name is required`);
  }

  if (!party.address.cityName?.trim()) {
    throw new Error(`${role} city name is required`);
  }
}

function validateLine(line: InvoiceLineInput, index: number): void {
  const lineNum = index + 1;

  if (!line.name?.trim()) {
    throw new Error(`Line ${lineNum}: Name is required`);
  }

  if (typeof line.quantity !== "number") {
    throw new Error(`Line ${lineNum}: Quantity must be a number`);
  }

  if (typeof line.unitPrice !== "number" || line.unitPrice < 0) {
    throw new Error(
      `Line ${lineNum}: Unit price must be a non-negative number`
    );
  }

  if (line.vatPercent !== undefined) {
    if (
      typeof line.vatPercent !== "number" ||
      line.vatPercent < 0 ||
      line.vatPercent > 100
    ) {
      throw new Error(`Line ${lineNum}: VAT percent must be between 0 and 100`);
    }
  }
}

// =============================================================================
// XML Generation
// =============================================================================

function generateXml(config: InvoiceConfig): string {
  const currency = config.currencyCode || DEFAULT_CURRENCY;
  const defaultVatPercent = config.defaultVatPercent ?? 0;
  const isSellerVatPayer = config.seller.vatCode !== null;
  const allowanceCharges = config.allowanceCharges ?? [];

  // Compute lines
  const lines = config.lines.map((line, index) => {
    const unitPrice = roundMoney(line.unitPrice);
    const lineExtensionAmount = roundMoney(line.quantity * unitPrice);
    const vatPercent = line.vatPercent ?? defaultVatPercent;
    const vatAmount = roundMoney(lineExtensionAmount * (vatPercent / 100));

    let taxCategoryCode: TaxCategoryCode;
    if (line.taxCategoryCode) {
      taxCategoryCode = line.taxCategoryCode;
    } else if (!isSellerVatPayer) {
      taxCategoryCode = "O";
    } else if (vatPercent > 0) {
      taxCategoryCode = "S";
    } else {
      taxCategoryCode = "Z";
    }

    return {
      ...line,
      id: line.id ?? index + 1,
      unitCode: line.unitCode || DEFAULT_UNIT_CODE,
      vatPercent,
      lineExtensionAmount,
      vatAmount,
      taxCategoryCode,
    };
  });

  // Compute tax totals
  const taxGroups = new Map<
    string,
    {
      categoryId: TaxCategoryCode;
      taxPercent: number | null;
      taxableAmount: number;
      taxAmount: number;
      taxExemptionReasonCode?: TaxExemptionCode;
      taxExemptionReason?: string;
    }
  >();

  for (const line of lines) {
    const key = `${line.taxCategoryCode}-${line.vatPercent}`;
    if (taxGroups.has(key)) {
      const group = taxGroups.get(key)!;
      group.taxableAmount = roundMoney(
        group.taxableAmount + line.lineExtensionAmount
      );
      group.taxAmount = roundMoney(group.taxAmount + line.vatAmount);
    } else {
      let taxExemptionReasonCode: TaxExemptionCode | undefined;
      let taxExemptionReason: string | undefined;

      if (line.taxExemptionReasonCode) {
        taxExemptionReasonCode = line.taxExemptionReasonCode;
        taxExemptionReason = line.taxExemptionReason;
      } else if (!isSellerVatPayer && line.taxCategoryCode === "O") {
        taxExemptionReasonCode = "VATEX-EU-O";
        taxExemptionReason = "Not subject to VAT";
      }

      taxGroups.set(key, {
        categoryId: line.taxCategoryCode,
        taxPercent: line.vatPercent > 0 ? line.vatPercent : null,
        taxableAmount: line.lineExtensionAmount,
        taxAmount: line.vatAmount,
        taxExemptionReasonCode,
        taxExemptionReason,
      });
    }
  }

  // Add allowance/charge tax contributions
  for (const ac of allowanceCharges) {
    const vatPercent = ac.vatPercent ?? 0;
    const taxCategoryCode = ac.taxCategoryCode ?? (vatPercent > 0 ? "S" : "Z");
    const key = `${taxCategoryCode}-${vatPercent}`;
    const taxAmount = roundMoney(ac.amount * (vatPercent / 100));

    if (taxGroups.has(key)) {
      const group = taxGroups.get(key)!;
      if (ac.chargeIndicator) {
        group.taxableAmount = roundMoney(group.taxableAmount + ac.amount);
        group.taxAmount = roundMoney(group.taxAmount + taxAmount);
      } else {
        group.taxableAmount = roundMoney(group.taxableAmount - ac.amount);
        group.taxAmount = roundMoney(group.taxAmount - taxAmount);
      }
    }
  }

  const taxSubtotals = Array.from(taxGroups.values());
  const totalTaxAmount = roundMoney(
    taxSubtotals.reduce((sum, st) => sum + st.taxAmount, 0)
  );

  // Compute monetary totals
  const lineExtensionAmount = roundMoney(
    lines.reduce((sum, l) => sum + l.lineExtensionAmount, 0)
  );
  const allowanceTotalAmount = roundMoney(
    allowanceCharges
      .filter((ac) => !ac.chargeIndicator)
      .reduce((sum, ac) => sum + ac.amount, 0)
  );
  const chargeTotalAmount = roundMoney(
    allowanceCharges
      .filter((ac) => ac.chargeIndicator)
      .reduce((sum, ac) => sum + ac.amount, 0)
  );
  const taxExclusiveAmount = roundMoney(
    lineExtensionAmount - allowanceTotalAmount + chargeTotalAmount
  );
  const taxInclusiveAmount = roundMoney(taxExclusiveAmount + totalTaxAmount);

  // Build payment means
  let paymentMeans: PaymentMeans | null = null;
  if (config.paymentMeans) {
    paymentMeans = config.paymentMeans;
  } else if (config.paymentIban) {
    paymentMeans = {
      paymentMeansCode: "30",
      bankTransfer: { accountId: config.paymentIban },
    };
  }

  // Create XML document
  const root = create({ version: "1.0", encoding: "UTF-8" }).ele("Invoice", {
    xmlns: "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
    "xmlns:cbc":
      "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
    "xmlns:cac":
      "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
    "xmlns:ccts": "urn:un:unece:uncefact:documentation:2",
    "xmlns:qdt":
      "urn:oasis:names:specification:ubl:schema:xsd:QualifiedDataTypes-2",
    "xmlns:udt":
      "urn:oasis:names:specification:ubl:schema:xsd:UnqualifiedDataTypes-2",
    "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
  });

  // Document header
  root.ele("cbc:UBLVersionID").txt(UBL_VERSION).up();
  root.ele("cbc:CustomizationID").txt(UBL_CUSTOMIZATION_ID).up();

  // Invoice ID
  const invoiceId = config.invoiceSeries
    ? `${config.invoiceSeries}${config.invoiceNumber}`
    : config.invoiceNumber;
  root.ele("cbc:ID").txt(invoiceId).up();

  // Dates
  root.ele("cbc:IssueDate").txt(formatDate(config.issueDate)).up();
  root
    .ele("cbc:DueDate")
    .txt(formatDate(config.dueDate || config.issueDate))
    .up();

  // Invoice type
  root
    .ele("cbc:InvoiceTypeCode")
    .txt(config.invoiceTypeCode || "380")
    .up();

  // Note
  if (config.note) {
    root.ele("cbc:Note").txt(config.note).up();
  }

  // Tax point date
  if (config.taxPointDate) {
    root.ele("cbc:TaxPointDate").txt(formatDate(config.taxPointDate)).up();
  }

  // Currency
  root.ele("cbc:DocumentCurrencyCode").txt(currency).up();

  // Buyer reference
  if (config.buyerReference) {
    root.ele("cbc:BuyerReference").txt(config.buyerReference).up();
  }

  // Invoice period
  if (config.invoicePeriod) {
    addInvoicePeriod(root, config.invoicePeriod);
  }

  // Order reference
  if (config.orderReference) {
    root
      .ele("cac:OrderReference")
      .ele("cbc:ID")
      .txt(config.orderReference.id)
      .up()
      .up();
  }

  // Preceding invoice references (for credit notes)
  for (const ref of config.precedingInvoiceReferences ?? []) {
    const billingRef = root
      .ele("cac:BillingReference")
      .ele("cac:InvoiceDocumentReference");
    billingRef.ele("cbc:ID").txt(ref.id).up();
    if (ref.issueDate) {
      billingRef.ele("cbc:IssueDate").txt(formatDate(ref.issueDate)).up();
    }
    billingRef.up().up();
  }

  // Contract reference
  if (config.contractReference) {
    root
      .ele("cac:ContractDocumentReference")
      .ele("cbc:ID")
      .txt(config.contractReference.id)
      .up()
      .up();
  }

  // Parties
  addParty(root, "cac:AccountingSupplierParty", config.seller, true);
  addParty(root, "cac:AccountingCustomerParty", config.buyer, false);

  // Payment means
  if (paymentMeans) {
    addPaymentMeans(root, paymentMeans);
  }

  // Payment terms
  if (config.paymentTerms?.note) {
    root
      .ele("cac:PaymentTerms")
      .ele("cbc:Note")
      .txt(config.paymentTerms.note)
      .up()
      .up();
  }

  // Allowance/Charge
  for (const ac of allowanceCharges) {
    addAllowanceCharge(root, ac, currency);
  }

  // Tax total
  const taxTotalEl = root.ele("cac:TaxTotal");
  taxTotalEl
    .ele("cbc:TaxAmount", { currencyID: currency })
    .txt(totalTaxAmount.toFixed(2))
    .up();

  for (const subtotal of taxSubtotals) {
    const subtotalEl = taxTotalEl.ele("cac:TaxSubtotal");
    subtotalEl
      .ele("cbc:TaxableAmount", { currencyID: currency })
      .txt(subtotal.taxableAmount.toFixed(2))
      .up();
    subtotalEl
      .ele("cbc:TaxAmount", { currencyID: currency })
      .txt(subtotal.taxAmount.toFixed(2))
      .up();

    const taxCatEl = subtotalEl.ele("cac:TaxCategory");
    taxCatEl.ele("cbc:ID").txt(subtotal.categoryId).up();
    if (subtotal.taxPercent !== null) {
      taxCatEl.ele("cbc:Percent").txt(subtotal.taxPercent.toFixed(2)).up();
    }
    if (subtotal.taxExemptionReasonCode) {
      taxCatEl
        .ele("cbc:TaxExemptionReasonCode")
        .txt(subtotal.taxExemptionReasonCode)
        .up();
    }
    if (subtotal.taxExemptionReason) {
      taxCatEl
        .ele("cbc:TaxExemptionReason")
        .txt(subtotal.taxExemptionReason)
        .up();
    }
    taxCatEl
      .ele("cac:TaxScheme")
      .ele("cbc:ID")
      .txt(DEFAULT_TAX_SCHEME)
      .up()
      .up();
    taxCatEl.up();
    subtotalEl.up();
  }
  taxTotalEl.up();

  // Monetary totals
  const mtEl = root.ele("cac:LegalMonetaryTotal");
  mtEl
    .ele("cbc:LineExtensionAmount", { currencyID: currency })
    .txt(lineExtensionAmount.toFixed(2))
    .up();
  mtEl
    .ele("cbc:TaxExclusiveAmount", { currencyID: currency })
    .txt(taxExclusiveAmount.toFixed(2))
    .up();
  mtEl
    .ele("cbc:TaxInclusiveAmount", { currencyID: currency })
    .txt(taxInclusiveAmount.toFixed(2))
    .up();
  if (allowanceTotalAmount > 0) {
    mtEl
      .ele("cbc:AllowanceTotalAmount", { currencyID: currency })
      .txt(allowanceTotalAmount.toFixed(2))
      .up();
  }
  if (chargeTotalAmount > 0) {
    mtEl
      .ele("cbc:ChargeTotalAmount", { currencyID: currency })
      .txt(chargeTotalAmount.toFixed(2))
      .up();
  }
  mtEl
    .ele("cbc:PayableAmount", { currencyID: currency })
    .txt(taxInclusiveAmount.toFixed(2))
    .up();
  mtEl.up();

  // Invoice lines
  for (const line of lines) {
    const lineEl = root.ele("cac:InvoiceLine");
    lineEl.ele("cbc:ID").txt(String(line.id)).up();
    lineEl
      .ele("cbc:InvoicedQuantity", { unitCode: line.unitCode })
      .txt(line.quantity.toString())
      .up();
    lineEl
      .ele("cbc:LineExtensionAmount", { currencyID: currency })
      .txt(line.lineExtensionAmount.toFixed(2))
      .up();

    const itemEl = lineEl.ele("cac:Item");
    if (line.description) {
      itemEl.ele("cbc:Description").txt(line.description).up();
    }
    itemEl.ele("cbc:Name").txt(line.name).up();
    if (line.sellerItemId) {
      itemEl
        .ele("cac:SellersItemIdentification")
        .ele("cbc:ID")
        .txt(line.sellerItemId)
        .up()
        .up();
    }

    const taxCatEl = itemEl.ele("cac:ClassifiedTaxCategory");
    taxCatEl.ele("cbc:ID").txt(line.taxCategoryCode).up();
    if (line.vatPercent > 0) {
      taxCatEl.ele("cbc:Percent").txt(line.vatPercent.toFixed(2)).up();
    }
    taxCatEl.ele("cac:TaxScheme").ele("cbc:ID").txt("VAT").up().up();
    taxCatEl.up();
    itemEl.up();

    lineEl
      .ele("cac:Price")
      .ele("cbc:PriceAmount", { currencyID: currency })
      .txt(roundMoney(line.unitPrice).toFixed(2))
      .up()
      .up();
    lineEl.up();
  }

  return root.end({ prettyPrint: true });
}

// =============================================================================
// XML Helper Functions
// =============================================================================

function addInvoicePeriod(root: XMLBuilder, period: InvoicePeriod): void {
  const periodEl = root.ele("cac:InvoicePeriod");
  if (period.startDate) {
    periodEl.ele("cbc:StartDate").txt(formatDate(period.startDate)).up();
  }
  if (period.endDate) {
    periodEl.ele("cbc:EndDate").txt(formatDate(period.endDate)).up();
  }
  if (period.descriptionCode) {
    periodEl.ele("cbc:DescriptionCode").txt(period.descriptionCode).up();
  }
  periodEl.up();
}

function addParty(
  root: XMLBuilder,
  tagName: string,
  party: Seller | Buyer,
  isSeller: boolean
): void {
  const partyWrapper = root.ele(tagName);
  const partyEl = partyWrapper.ele("cac:Party");

  const address = party.address;
  const county = sanitizeCounty(address.countrySubentity);
  const city = isBucharest(county)
    ? sanitizeBucharestSector(address.cityName)
    : address.cityName;

  // Postal Address
  const postalAddress = partyEl.ele("cac:PostalAddress");
  postalAddress.ele("cbc:StreetName").txt(address.streetName).up();
  if (address.additionalStreetName) {
    postalAddress
      .ele("cbc:AdditionalStreetName")
      .txt(address.additionalStreetName)
      .up();
  }
  postalAddress.ele("cbc:CityName").txt(city).up();
  if (address.postalZone) {
    postalAddress.ele("cbc:PostalZone").txt(address.postalZone).up();
  }
  if (county) {
    postalAddress.ele("cbc:CountrySubentity").txt(county).up();
  }
  postalAddress
    .ele("cac:Country")
    .ele("cbc:IdentificationCode")
    .txt(address.countryCode || DEFAULT_COUNTRY_CODE)
    .up()
    .up();
  postalAddress.up();

  // Party Tax Scheme
  const vatCode = isSeller
    ? (party as Seller).vatCode
    : (party as Buyer).vatCode;
  const taxScheme = partyEl.ele("cac:PartyTaxScheme");
  if (vatCode) {
    taxScheme.ele("cbc:CompanyID").txt(normalizeVatNumber(vatCode)).up();
    taxScheme.ele("cac:TaxScheme").ele("cbc:ID").txt("VAT").up().up();
  } else {
    taxScheme.ele("cbc:CompanyID").txt(party.registrationCode).up();
    taxScheme.ele("cac:TaxScheme").up();
  }
  taxScheme.up();

  // Party Legal Entity
  const legalEntity = partyEl.ele("cac:PartyLegalEntity");
  legalEntity.ele("cbc:RegistrationName").txt(party.registrationName).up();
  if (party.registrationNumber) {
    legalEntity.ele("cbc:CompanyID").txt(party.registrationNumber).up();
  }
  if (isSeller && (party as Seller).legalFormData) {
    legalEntity
      .ele("cbc:CompanyLegalForm")
      .txt((party as Seller).legalFormData!)
      .up();
  }
  legalEntity.up();

  // Contact
  if (party.email || party.phone) {
    const contact = partyEl.ele("cac:Contact");
    if (party.phone) {
      contact.ele("cbc:Telephone").txt(party.phone).up();
    }
    if (party.email) {
      contact.ele("cbc:ElectronicMail").txt(party.email).up();
    }
    contact.up();
  }

  partyEl.up();
  partyWrapper.up();
}

function addPaymentMeans(root: XMLBuilder, payment: PaymentMeans): void {
  const pmEl = root.ele("cac:PaymentMeans");

  if (payment.paymentMeansDescription) {
    pmEl
      .ele("cbc:PaymentMeansCode", { name: payment.paymentMeansDescription })
      .txt(payment.paymentMeansCode)
      .up();
  } else {
    pmEl.ele("cbc:PaymentMeansCode").txt(payment.paymentMeansCode).up();
  }

  if (payment.paymentId) {
    pmEl.ele("cbc:PaymentID").txt(payment.paymentId).up();
  }

  if (payment.cardPayment) {
    const cardEl = pmEl.ele("cac:CardAccount");
    cardEl
      .ele("cbc:PrimaryAccountNumberID")
      .txt(payment.cardPayment.primaryAccountNumber)
      .up();
    cardEl.ele("cbc:NetworkID").txt(payment.cardPayment.networkId).up();
    if (payment.cardPayment.holderName) {
      cardEl.ele("cbc:HolderName").txt(payment.cardPayment.holderName).up();
    }
    cardEl.up();
  }

  if (payment.bankTransfer) {
    const bankEl = pmEl.ele("cac:PayeeFinancialAccount");
    bankEl.ele("cbc:ID").txt(payment.bankTransfer.accountId).up();
    if (payment.bankTransfer.accountName) {
      bankEl.ele("cbc:Name").txt(payment.bankTransfer.accountName).up();
    }
    if (payment.bankTransfer.bankId) {
      bankEl
        .ele("cac:FinancialInstitutionBranch")
        .ele("cbc:ID")
        .txt(payment.bankTransfer.bankId)
        .up()
        .up();
    }
    bankEl.up();
  }

  if (payment.directDebit) {
    const ddEl = pmEl.ele("cac:PaymentMandate");
    ddEl.ele("cbc:ID").txt(payment.directDebit.mandateId).up();
    ddEl
      .ele("cac:PayerFinancialAccount")
      .ele("cbc:ID")
      .txt(payment.directDebit.debitedAccountId)
      .up()
      .up();
    ddEl.up();
  }

  pmEl.up();
}

function addAllowanceCharge(
  root: XMLBuilder,
  ac: AllowanceCharge,
  currency: string
): void {
  const acEl = root.ele("cac:AllowanceCharge");
  acEl
    .ele("cbc:ChargeIndicator")
    .txt(ac.chargeIndicator ? "true" : "false")
    .up();

  if (ac.reasonCode) {
    acEl.ele("cbc:AllowanceChargeReasonCode").txt(ac.reasonCode).up();
  }
  if (ac.reason) {
    acEl.ele("cbc:AllowanceChargeReason").txt(ac.reason).up();
  }
  if (ac.percentage !== undefined) {
    acEl.ele("cbc:MultiplierFactorNumeric").txt(ac.percentage.toString()).up();
  }

  acEl
    .ele("cbc:Amount", { currencyID: currency })
    .txt(ac.amount.toFixed(2))
    .up();

  if (ac.baseAmount !== undefined) {
    acEl
      .ele("cbc:BaseAmount", { currencyID: currency })
      .txt(ac.baseAmount.toFixed(2))
      .up();
  }

  if (ac.taxCategoryCode || ac.vatPercent !== undefined) {
    const taxCat = acEl.ele("cac:TaxCategory");
    taxCat
      .ele("cbc:ID")
      .txt(ac.taxCategoryCode || "S")
      .up();
    taxCat
      .ele("cbc:Percent")
      .txt((ac.vatPercent ?? 0).toFixed(2))
      .up();
    taxCat.ele("cac:TaxScheme").ele("cbc:ID").txt("VAT").up().up();
    taxCat.up();
  }

  acEl.up();
}
