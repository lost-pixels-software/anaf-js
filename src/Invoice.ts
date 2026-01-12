/**
 * ANAF e-Invoice Generator
 *
 * A flexible yet simple invoice generator for Romanian e-Factura (CIUS-RO compliant).
 * Combines automatic calculations with full control over invoice properties.
 */

import { create } from "xmlbuilder2";
import type { XMLBuilder } from "xmlbuilder2/lib/interfaces";

import type {
  Seller,
  Buyer,
  InvoiceLineInput,
  InvoiceLineComputed,
  TaxSubtotalData,
  TaxTotalData,
  MonetaryTotals,
  PaymentMeans,
  PaymentTerms,
  InvoiceGeneralData,
  AllowanceCharge,
  InvoiceData,
  SimpleInvoiceInput,
  DocumentReference,
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
// Invoice Builder Class
// =============================================================================

export class Invoice {
  private generalData: InvoiceGeneralData | null = null;
  private seller: Seller | null = null;
  private buyer: Buyer | null = null;
  private lines: InvoiceLineInput[] = [];
  private paymentMeans: PaymentMeans | null = null;
  private paymentTerms: PaymentTerms | null = null;
  private allowanceCharges: AllowanceCharge[] = [];
  private precedingInvoiceReferences: DocumentReference[] = [];
  private defaultVatPercent: number = 0;

  // Computed values (cached)
  private computedLines: InvoiceLineComputed[] | null = null;
  private computedTaxTotal: TaxTotalData | null = null;
  private computedMonetaryTotals: MonetaryTotals | null = null;

  constructor() {}

  // ===========================================================================
  // Static Factory Methods
  // ===========================================================================

  /**
   * Create an invoice from a simple input object
   * This provides the simplest way to generate an invoice with automatic calculations
   */
  static fromSimpleInput(input: SimpleInvoiceInput): Invoice {
    const invoice = new Invoice();

    invoice.setGeneralData({
      invoiceSeries: input.invoiceSeries,
      invoiceNumber: input.invoiceNumber,
      issueDate: input.issueDate,
      dueDate: input.dueDate,
      invoiceTypeCode: input.invoiceTypeCode || "380",
      currencyCode: DEFAULT_CURRENCY,
      note: input.note,
    });

    invoice.setSeller(input.seller);
    invoice.setBuyer(input.buyer);
    invoice.setLines(input.lines);

    if (input.defaultVatPercent !== undefined) {
      invoice.setDefaultVatPercent(input.defaultVatPercent);
    }

    if (input.paymentIban) {
      invoice.setPaymentMeans({
        paymentMeansCode: "30", // Credit transfer
        bankTransfer: {
          accountId: input.paymentIban,
        },
      });
    }

    return invoice;
  }

  // ===========================================================================
  // Setters (Builder Pattern)
  // ===========================================================================

  setGeneralData(data: InvoiceGeneralData): this {
    this.generalData = data;
    this.invalidateCache();
    return this;
  }

  setSeller(seller: Seller): this {
    this.seller = seller;
    this.invalidateCache();
    return this;
  }

  setBuyer(buyer: Buyer): this {
    this.buyer = buyer;
    this.invalidateCache();
    return this;
  }

  setLines(lines: InvoiceLineInput[]): this {
    this.lines = lines;
    this.invalidateCache();
    return this;
  }

  addLine(line: InvoiceLineInput): this {
    this.lines.push(line);
    this.invalidateCache();
    return this;
  }

  setPaymentMeans(paymentMeans: PaymentMeans): this {
    this.paymentMeans = paymentMeans;
    return this;
  }

  setPaymentTerms(paymentTerms: PaymentTerms): this {
    this.paymentTerms = paymentTerms;
    return this;
  }

  setAllowanceCharges(allowanceCharges: AllowanceCharge[]): this {
    this.allowanceCharges = allowanceCharges;
    this.invalidateCache();
    return this;
  }

  addAllowanceCharge(allowanceCharge: AllowanceCharge): this {
    this.allowanceCharges.push(allowanceCharge);
    this.invalidateCache();
    return this;
  }

  setPrecedingInvoiceReferences(refs: DocumentReference[]): this {
    this.precedingInvoiceReferences = refs;
    return this;
  }

  addPrecedingInvoiceReference(ref: DocumentReference): this {
    this.precedingInvoiceReferences.push(ref);
    return this;
  }

  setDefaultVatPercent(percent: number): this {
    this.defaultVatPercent = percent;
    this.invalidateCache();
    return this;
  }

  // ===========================================================================
  // Manual Overrides (for full flexibility)
  // ===========================================================================

  /**
   * Override computed tax totals with manual values
   * Use this when you need precise control over tax calculations
   */
  overrideTaxTotal(taxTotal: TaxTotalData): this {
    this.computedTaxTotal = taxTotal;
    return this;
  }

  /**
   * Override computed monetary totals with manual values
   * Use this when you need precise control over totals
   */
  overrideMonetaryTotals(totals: MonetaryTotals): this {
    this.computedMonetaryTotals = totals;
    return this;
  }

  // ===========================================================================
  // Getters
  // ===========================================================================

  getComputedLines(): InvoiceLineComputed[] {
    if (!this.computedLines) {
      this.computeLines();
    }
    return this.computedLines!;
  }

  getTaxTotal(): TaxTotalData {
    if (!this.computedTaxTotal) {
      this.computeTaxTotals();
    }
    return this.computedTaxTotal!;
  }

  getMonetaryTotals(): MonetaryTotals {
    if (!this.computedMonetaryTotals) {
      this.computeMonetaryTotals();
    }
    return this.computedMonetaryTotals!;
  }

  getInvoiceData(): InvoiceData {
    this.validate();

    const data: InvoiceData = {
      generalData: this.generalData!,
      seller: this.seller!,
      buyer: this.buyer!,
      paymentMeans: this.paymentMeans || undefined,
      paymentTerms: this.paymentTerms || undefined,
      allowanceCharges:
        this.allowanceCharges.length > 0 ? this.allowanceCharges : undefined,
      taxTotal: this.getTaxTotal(),
      monetaryTotals: this.getMonetaryTotals(),
      lines: this.getComputedLines(),
      precedingInvoiceReferences:
        this.precedingInvoiceReferences.length > 0
          ? this.precedingInvoiceReferences
          : undefined,
    };

    return data;
  }

  // ===========================================================================
  // Computation Methods
  // ===========================================================================

  private invalidateCache(): void {
    this.computedLines = null;
    this.computedTaxTotal = null;
    this.computedMonetaryTotals = null;
  }

  private computeLines(): void {
    const isSellerVatPayer = this.seller?.vatCode !== null;

    this.computedLines = this.lines.map((line, index) => {
      const unitPrice = roundMoney(line.unitPrice);
      const lineExtensionAmount = roundMoney(line.quantity * unitPrice);
      const vatPercent = line.vatPercent ?? this.defaultVatPercent;
      const vatAmount = roundMoney(lineExtensionAmount * (vatPercent / 100));

      // Determine tax category
      let resolvedTaxCategoryCode: TaxCategoryCode;
      if (line.taxCategoryCode) {
        resolvedTaxCategoryCode = line.taxCategoryCode;
      } else if (!isSellerVatPayer) {
        resolvedTaxCategoryCode = "O"; // Not subject to VAT
      } else if (vatPercent > 0) {
        resolvedTaxCategoryCode = "S"; // Standard rate
      } else {
        resolvedTaxCategoryCode = "Z"; // Zero rated
      }

      return {
        ...line,
        id: line.id ?? index + 1,
        unitCode: line.unitCode || DEFAULT_UNIT_CODE,
        vatPercent,
        lineExtensionAmount,
        vatAmount,
        resolvedTaxCategoryCode,
      };
    });
  }

  private computeTaxTotals(): void {
    const lines = this.getComputedLines();
    const isSellerVatPayer = this.seller?.vatCode !== null;

    // Group by tax category and percentage
    const taxGroups = new Map<string, TaxSubtotalData>();

    for (const line of lines) {
      const vatPercent = line.vatPercent;
      const key = `${line.resolvedTaxCategoryCode}-${vatPercent}`;

      if (taxGroups.has(key)) {
        const group = taxGroups.get(key)!;
        group.taxableAmount = roundMoney(
          group.taxableAmount + line.lineExtensionAmount
        );
        group.taxAmount = roundMoney(group.taxAmount + line.vatAmount);
      } else {
        // Determine exemption reason for non-VAT categories
        let taxExemptionReasonCode: TaxExemptionCode | undefined;
        let taxExemptionReason: string | undefined;

        if (line.taxExemptionReasonCode) {
          taxExemptionReasonCode = line.taxExemptionReasonCode;
          taxExemptionReason = line.taxExemptionReason;
        } else if (!isSellerVatPayer && line.resolvedTaxCategoryCode === "O") {
          taxExemptionReasonCode = "VATEX-EU-O";
          taxExemptionReason = "Not subject to VAT";
        }

        taxGroups.set(key, {
          categoryId: line.resolvedTaxCategoryCode,
          taxSchemeId: DEFAULT_TAX_SCHEME,
          taxPercent: vatPercent > 0 ? vatPercent : null,
          taxableAmount: line.lineExtensionAmount,
          taxAmount: line.vatAmount,
          taxExemptionReasonCode,
          taxExemptionReason,
        });
      }
    }

    // Add allowance/charge tax contributions
    for (const ac of this.allowanceCharges) {
      const vatPercent = ac.vatPercent ?? 0;
      const taxCategoryCode =
        ac.taxCategoryCode ?? (vatPercent > 0 ? "S" : "Z");
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

    this.computedTaxTotal = {
      taxAmount: totalTaxAmount,
      taxSubtotals,
    };
  }

  private computeMonetaryTotals(): void {
    const lines = this.getComputedLines();
    const taxTotal = this.getTaxTotal();

    const lineExtensionAmount = roundMoney(
      lines.reduce((sum, line) => sum + line.lineExtensionAmount, 0)
    );

    // Calculate allowances and charges
    const allowanceTotalAmount = roundMoney(
      this.allowanceCharges
        .filter((ac) => !ac.chargeIndicator)
        .reduce((sum, ac) => sum + ac.amount, 0)
    );

    const chargeTotalAmount = roundMoney(
      this.allowanceCharges
        .filter((ac) => ac.chargeIndicator)
        .reduce((sum, ac) => sum + ac.amount, 0)
    );

    const taxExclusiveAmount = roundMoney(
      lineExtensionAmount - allowanceTotalAmount + chargeTotalAmount
    );

    const taxInclusiveAmount = roundMoney(
      taxExclusiveAmount + taxTotal.taxAmount
    );

    this.computedMonetaryTotals = {
      lineExtensionAmount,
      taxExclusiveAmount,
      taxInclusiveAmount,
      payableAmount: taxInclusiveAmount,
      allowanceTotalAmount:
        allowanceTotalAmount > 0 ? allowanceTotalAmount : undefined,
      chargeTotalAmount: chargeTotalAmount > 0 ? chargeTotalAmount : undefined,
    };
  }

  // ===========================================================================
  // Validation
  // ===========================================================================

  private validate(): void {
    if (!this.generalData) {
      throw new Error("Invoice general data is required");
    }

    if (!this.generalData.invoiceNumber?.trim()) {
      throw new Error("Invoice number is required");
    }

    if (!this.generalData.issueDate) {
      throw new Error("Issue date is required");
    }

    if (!this.seller) {
      throw new Error("Seller information is required");
    }

    this.validateParty(this.seller, "Seller");

    if (!this.buyer) {
      throw new Error("Buyer information is required");
    }

    this.validateParty(this.buyer, "Buyer");

    if (this.lines.length === 0) {
      throw new Error("At least one invoice line is required");
    }

    for (let i = 0; i < this.lines.length; i++) {
      this.validateLine(this.lines[i], i);
    }
  }

  private validateParty(party: Seller | Buyer, role: string): void {
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

  private validateLine(line: InvoiceLineInput, index: number): void {
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
        throw new Error(
          `Line ${lineNum}: VAT percent must be between 0 and 100`
        );
      }
    }
  }

  // ===========================================================================
  // XML Generation
  // ===========================================================================

  /**
   * Generate UBL 2.1 XML invoice compliant with CIUS-RO
   * @returns XML string
   */
  generateXml(): string {
    this.validate();

    const data = this.getInvoiceData();
    const currency = DEFAULT_CURRENCY;

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

    // Invoice ID (series + number)
    const invoiceId = data.generalData.invoiceSeries
      ? `${data.generalData.invoiceSeries}${data.generalData.invoiceNumber}`
      : data.generalData.invoiceNumber;
    root.ele("cbc:ID").txt(invoiceId).up();

    // Dates
    root.ele("cbc:IssueDate").txt(formatDate(data.generalData.issueDate)).up();

    const dueDate = data.generalData.dueDate || data.generalData.issueDate;
    root.ele("cbc:DueDate").txt(formatDate(dueDate)).up();

    // Invoice type
    root
      .ele("cbc:InvoiceTypeCode")
      .txt(data.generalData.invoiceTypeCode || "380")
      .up();

    // Note
    if (data.generalData.note) {
      root.ele("cbc:Note").txt(data.generalData.note).up();
    }

    // Tax point date
    if (data.generalData.taxPointDate) {
      root
        .ele("cbc:TaxPointDate")
        .txt(formatDate(data.generalData.taxPointDate))
        .up();
    }

    // Currency code (always RON for Romanian invoices)
    root.ele("cbc:DocumentCurrencyCode").txt(currency).up();

    // Buyer reference
    if (data.generalData.buyerReference) {
      root.ele("cbc:BuyerReference").txt(data.generalData.buyerReference).up();
    }

    // Invoice period
    if (data.generalData.invoicePeriod) {
      this.addInvoicePeriodToXml(root, data.generalData.invoicePeriod);
    }

    // Order reference
    if (data.generalData.orderReference) {
      this.addOrderReferenceToXml(root, data.generalData.orderReference);
    }

    // Preceding invoice references (for credit notes)
    if (data.precedingInvoiceReferences) {
      for (const ref of data.precedingInvoiceReferences) {
        this.addBillingReferenceToXml(root, ref);
      }
    }

    // Contract reference
    if (data.generalData.contractReference) {
      this.addContractReferenceToXml(root, data.generalData.contractReference);
    }

    // Parties
    this.addPartyToXml(root, "cac:AccountingSupplierParty", data.seller, true);
    this.addPartyToXml(root, "cac:AccountingCustomerParty", data.buyer, false);

    // Payment means
    if (data.paymentMeans) {
      this.addPaymentMeansToXml(root, data.paymentMeans);
    }

    // Payment terms
    if (data.paymentTerms?.note) {
      root
        .ele("cac:PaymentTerms")
        .ele("cbc:Note")
        .txt(data.paymentTerms.note)
        .up()
        .up();
    }

    // Allowance/Charge at document level
    if (data.allowanceCharges) {
      for (const ac of data.allowanceCharges) {
        this.addAllowanceChargeToXml(root, ac, currency);
      }
    }

    // Tax total
    this.addTaxTotalToXml(root, data.taxTotal, currency);

    // Monetary totals
    this.addMonetaryTotalsToXml(root, data.monetaryTotals, currency);

    // Invoice lines
    for (const line of data.lines) {
      this.addInvoiceLineToXml(root, line, currency);
    }

    return root.end({ prettyPrint: true });
  }

  // ===========================================================================
  // XML Helper Methods
  // ===========================================================================

  private addInvoicePeriodToXml(root: XMLBuilder, period: any): void {
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

  private addOrderReferenceToXml(
    root: XMLBuilder,
    ref: DocumentReference
  ): void {
    const orderRef = root.ele("cac:OrderReference");
    orderRef.ele("cbc:ID").txt(ref.id).up();
    orderRef.up();
  }

  private addBillingReferenceToXml(
    root: XMLBuilder,
    ref: DocumentReference
  ): void {
    const billingRef = root
      .ele("cac:BillingReference")
      .ele("cac:InvoiceDocumentReference");

    billingRef.ele("cbc:ID").txt(ref.id).up();

    if (ref.issueDate) {
      billingRef.ele("cbc:IssueDate").txt(formatDate(ref.issueDate)).up();
    }

    billingRef.up().up();
  }

  private addContractReferenceToXml(
    root: XMLBuilder,
    ref: DocumentReference
  ): void {
    const contractRef = root.ele("cac:ContractDocumentReference");
    contractRef.ele("cbc:ID").txt(ref.id).up();
    contractRef.up();
  }

  private addPartyToXml(
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
      // Non-VAT payer: use registration code
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

    // Seller-specific: legal form data (required by CIUS-RO)
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

  private addPaymentMeansToXml(root: XMLBuilder, payment: PaymentMeans): void {
    const pmEl = root.ele("cac:PaymentMeans");

    // Payment means code with optional description
    if (payment.paymentMeansDescription) {
      pmEl
        .ele("cbc:PaymentMeansCode", { name: payment.paymentMeansDescription })
        .txt(payment.paymentMeansCode)
        .up();
    } else {
      pmEl.ele("cbc:PaymentMeansCode").txt(payment.paymentMeansCode).up();
    }

    // Payment ID
    if (payment.paymentId) {
      pmEl.ele("cbc:PaymentID").txt(payment.paymentId).up();
    }

    // Card payment
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

    // Bank transfer
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

    // Direct debit
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

  private addAllowanceChargeToXml(
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
      acEl
        .ele("cbc:MultiplierFactorNumeric")
        .txt(ac.percentage.toString())
        .up();
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

    // Tax category for the allowance/charge
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

  private addTaxTotalToXml(
    root: XMLBuilder,
    taxTotal: TaxTotalData,
    currency: string
  ): void {
    const taxTotalEl = root.ele("cac:TaxTotal");

    taxTotalEl
      .ele("cbc:TaxAmount", { currencyID: currency })
      .txt(taxTotal.taxAmount.toFixed(2))
      .up();

    for (const subtotal of taxTotal.taxSubtotals) {
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
        .txt(subtotal.taxSchemeId)
        .up()
        .up();
      taxCatEl.up();

      subtotalEl.up();
    }

    taxTotalEl.up();
  }

  private addMonetaryTotalsToXml(
    root: XMLBuilder,
    totals: MonetaryTotals,
    currency: string
  ): void {
    const mtEl = root.ele("cac:LegalMonetaryTotal");

    mtEl
      .ele("cbc:LineExtensionAmount", { currencyID: currency })
      .txt(totals.lineExtensionAmount.toFixed(2))
      .up();

    mtEl
      .ele("cbc:TaxExclusiveAmount", { currencyID: currency })
      .txt(totals.taxExclusiveAmount.toFixed(2))
      .up();

    mtEl
      .ele("cbc:TaxInclusiveAmount", { currencyID: currency })
      .txt(totals.taxInclusiveAmount.toFixed(2))
      .up();

    if (totals.allowanceTotalAmount !== undefined) {
      mtEl
        .ele("cbc:AllowanceTotalAmount", { currencyID: currency })
        .txt(totals.allowanceTotalAmount.toFixed(2))
        .up();
    }

    if (totals.chargeTotalAmount !== undefined) {
      mtEl
        .ele("cbc:ChargeTotalAmount", { currencyID: currency })
        .txt(totals.chargeTotalAmount.toFixed(2))
        .up();
    }

    if (totals.prepaidAmount !== undefined) {
      mtEl
        .ele("cbc:PrepaidAmount", { currencyID: currency })
        .txt(totals.prepaidAmount.toFixed(2))
        .up();
    }

    if (totals.payableRoundingAmount !== undefined) {
      mtEl
        .ele("cbc:PayableRoundingAmount", { currencyID: currency })
        .txt(totals.payableRoundingAmount.toFixed(2))
        .up();
    }

    mtEl
      .ele("cbc:PayableAmount", { currencyID: currency })
      .txt(totals.payableAmount.toFixed(2))
      .up();

    mtEl.up();
  }

  private addInvoiceLineToXml(
    root: XMLBuilder,
    line: InvoiceLineComputed,
    currency: string
  ): void {
    const lineEl = root.ele("cac:InvoiceLine");

    lineEl.ele("cbc:ID").txt(String(line.id)).up();

    lineEl
      .ele("cbc:InvoicedQuantity", {
        unitCode: line.unitCode || DEFAULT_UNIT_CODE,
      })
      .txt(line.quantity.toString())
      .up();

    lineEl
      .ele("cbc:LineExtensionAmount", { currencyID: currency })
      .txt(line.lineExtensionAmount.toFixed(2))
      .up();

    // Item
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

    // Classified tax category
    const taxCatEl = itemEl.ele("cac:ClassifiedTaxCategory");
    taxCatEl.ele("cbc:ID").txt(line.resolvedTaxCategoryCode).up();

    if (line.vatPercent > 0) {
      taxCatEl.ele("cbc:Percent").txt(line.vatPercent.toFixed(2)).up();
    }

    taxCatEl.ele("cac:TaxScheme").ele("cbc:ID").txt("VAT").up().up();
    taxCatEl.up();

    itemEl.up();

    // Price
    const priceEl = lineEl.ele("cac:Price");
    priceEl
      .ele("cbc:PriceAmount", { currencyID: currency })
      .txt(roundMoney(line.unitPrice).toFixed(2))
      .up();
    priceEl.up();

    lineEl.up();
  }
}
