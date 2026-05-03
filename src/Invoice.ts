/**
 * ANAF e-Invoice Generator
 *
 * A simple invoice generator for Romanian e-Factura (CIUS-RO compliant).
 * Pass your invoice config, get XML. All calculations are automatic.
 */

import { XMLBuilder } from "fast-xml-parser";

import type {
  Seller,
  Buyer,
  InvoiceLineInput,
  PaymentMeans,
  AllowanceCharge,
  InvoiceConfig,
  InvoicePeriod,
} from "./types";

import { type TaxCategoryCode, type TaxExemptionCode } from "./types/codes";

import { formatDate } from "./utils/format-date";
import {
  isBucharest,
  sanitizeCity,
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
 *   lines: [{ name: "Service", quantity: 1, unitPrice: 100, vatPercent: 21 }],
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
    const line = config.lines[i];
    if (line) {
      validateLine(line, i);
    }
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

  // County validation for Romanian addresses
  const countryCode = party.address.countryCode || DEFAULT_COUNTRY_CODE;
  if (countryCode === "RO") {
    const county = party.address.countrySubentity;
    if (!county?.trim()) {
      throw new Error(
        `${role} county (countrySubentity) is required for Romanian addresses`,
      );
    }

    const sanitized = sanitizeCounty(county);
    if (!/^RO-[A-Z]{1,2}$/.test(sanitized)) {
      throw new Error(
        `${role} county "${county}" is not recognized. Please use an ISO 3166-2:RO code (e.g., "RO-AG") or a standard county name (e.g., "Arges").`,
      );
    }
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
      `Line ${lineNum}: Unit price must be a non-negative number`,
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
        group.taxableAmount + line.lineExtensionAmount,
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
    taxSubtotals.reduce((sum, st) => sum + st.taxAmount, 0),
  );

  // Compute monetary totals
  const lineExtensionAmount = roundMoney(
    lines.reduce((sum, l) => sum + l.lineExtensionAmount, 0),
  );
  const allowanceTotalAmount = roundMoney(
    allowanceCharges
      .filter((ac) => !ac.chargeIndicator)
      .reduce((sum, ac) => sum + ac.amount, 0),
  );
  const chargeTotalAmount = roundMoney(
    allowanceCharges
      .filter((ac) => ac.chargeIndicator)
      .reduce((sum, ac) => sum + ac.amount, 0),
  );
  const taxExclusiveAmount = roundMoney(
    lineExtensionAmount - allowanceTotalAmount + chargeTotalAmount,
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

  // Invoice ID
  const invoiceId = config.invoiceSeries
    ? `${config.invoiceSeries}${config.invoiceNumber}`
    : config.invoiceNumber;

  // Build the Invoice object for serialisation
  const invoiceObj: Record<string, unknown> = {
    "@_xmlns": "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
    "@_xmlns:cbc":
      "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
    "@_xmlns:cac":
      "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
    "@_xmlns:ccts": "urn:un:unece:uncefact:documentation:2",
    "@_xmlns:qdt":
      "urn:oasis:names:specification:ubl:schema:xsd:QualifiedDataTypes-2",
    "@_xmlns:udt":
      "urn:oasis:names:specification:ubl:schema:xsd:UnqualifiedDataTypes-2",
    "@_xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
    "cbc:UBLVersionID": UBL_VERSION,
    "cbc:CustomizationID": UBL_CUSTOMIZATION_ID,
    "cbc:ID": invoiceId,
    "cbc:IssueDate": formatDate(config.issueDate),
    "cbc:DueDate": formatDate(config.dueDate || config.issueDate),
    "cbc:InvoiceTypeCode": config.invoiceTypeCode || "380",
  };

  if (config.note) {
    invoiceObj["cbc:Note"] = config.note;
  }
  if (config.taxPointDate) {
    invoiceObj["cbc:TaxPointDate"] = formatDate(config.taxPointDate);
  }

  invoiceObj["cbc:DocumentCurrencyCode"] = currency;

  // CIUS-RO BR-RO-030: when invoice currency is not RON, accounting currency
  // must also be stated so ANAF can record VAT amounts in RON.
  if (currency !== DEFAULT_CURRENCY) {
    invoiceObj["cbc:TaxCurrencyCode"] = DEFAULT_CURRENCY;
  }

  if (config.buyerReference) {
    invoiceObj["cbc:BuyerReference"] = config.buyerReference;
  }
  if (config.invoicePeriod) {
    invoiceObj["cac:InvoicePeriod"] = buildInvoicePeriod(config.invoicePeriod);
  }
  if (config.orderReference) {
    invoiceObj["cac:OrderReference"] = { "cbc:ID": config.orderReference.id };
  }

  // Preceding invoice references (for credit notes)
  if (config.precedingInvoiceReferences?.length) {
    invoiceObj["cac:BillingReference"] = config.precedingInvoiceReferences.map(
      (ref) => ({
        "cac:InvoiceDocumentReference": {
          "cbc:ID": ref.id,
          ...(ref.issueDate
            ? { "cbc:IssueDate": formatDate(ref.issueDate) }
            : {}),
        },
      }),
    );
  }

  if (config.contractReference) {
    invoiceObj["cac:ContractDocumentReference"] = {
      "cbc:ID": config.contractReference.id,
    };
  }

  invoiceObj["cac:AccountingSupplierParty"] = buildParty(config.seller, true);
  invoiceObj["cac:AccountingCustomerParty"] = buildParty(config.buyer, false);

  if (paymentMeans) {
    invoiceObj["cac:PaymentMeans"] = buildPaymentMeans(paymentMeans);
  }
  if (config.paymentTerms?.note) {
    invoiceObj["cac:PaymentTerms"] = { "cbc:Note": config.paymentTerms.note };
  }
  if (allowanceCharges.length > 0) {
    invoiceObj["cac:AllowanceCharge"] = allowanceCharges.map((ac) =>
      buildAllowanceCharge(ac, currency),
    );
  }

  // Tax total(s)
  const taxSubtotalObjs = taxSubtotals.map((subtotal) => {
    const taxCat: Record<string, unknown> = {
      "cbc:ID": subtotal.categoryId,
    };
    if (subtotal.taxPercent !== null) {
      taxCat["cbc:Percent"] = subtotal.taxPercent.toFixed(2);
    }
    if (subtotal.taxExemptionReasonCode) {
      taxCat["cbc:TaxExemptionReasonCode"] = subtotal.taxExemptionReasonCode;
    }
    if (subtotal.taxExemptionReason) {
      taxCat["cbc:TaxExemptionReason"] = subtotal.taxExemptionReason;
    }
    taxCat["cac:TaxScheme"] = { "cbc:ID": DEFAULT_TAX_SCHEME };

    return {
      "cbc:TaxableAmount": {
        "@_currencyID": currency,
        "#text": subtotal.taxableAmount.toFixed(2),
      },
      "cbc:TaxAmount": {
        "@_currencyID": currency,
        "#text": subtotal.taxAmount.toFixed(2),
      },
      "cac:TaxCategory": taxCat,
    };
  });

  const primaryTaxTotal: Record<string, unknown> = {
    "cbc:TaxAmount": {
      "@_currencyID": currency,
      "#text": totalTaxAmount.toFixed(2),
    },
    "cac:TaxSubtotal": taxSubtotalObjs,
  };

  // BR-53 / BT-111: when TaxCurrencyCode (BT-6) is present, emit a second
  // TaxTotal with the total VAT amount in the accounting currency (RON).
  // No subtotals are required in this second element.
  if (
    currency !== DEFAULT_CURRENCY &&
    config.taxCurrencyTaxAmount !== undefined
  ) {
    invoiceObj["cac:TaxTotal"] = [
      primaryTaxTotal,
      {
        "cbc:TaxAmount": {
          "@_currencyID": DEFAULT_CURRENCY,
          "#text": config.taxCurrencyTaxAmount.toFixed(2),
        },
      },
    ];
  } else {
    invoiceObj["cac:TaxTotal"] = primaryTaxTotal;
  }

  // Legal monetary total
  const lmt: Record<string, unknown> = {
    "cbc:LineExtensionAmount": {
      "@_currencyID": currency,
      "#text": lineExtensionAmount.toFixed(2),
    },
    "cbc:TaxExclusiveAmount": {
      "@_currencyID": currency,
      "#text": taxExclusiveAmount.toFixed(2),
    },
    "cbc:TaxInclusiveAmount": {
      "@_currencyID": currency,
      "#text": taxInclusiveAmount.toFixed(2),
    },
  };
  if (allowanceTotalAmount > 0) {
    lmt["cbc:AllowanceTotalAmount"] = {
      "@_currencyID": currency,
      "#text": allowanceTotalAmount.toFixed(2),
    };
  }
  if (chargeTotalAmount > 0) {
    lmt["cbc:ChargeTotalAmount"] = {
      "@_currencyID": currency,
      "#text": chargeTotalAmount.toFixed(2),
    };
  }
  lmt["cbc:PayableAmount"] = {
    "@_currencyID": currency,
    "#text": taxInclusiveAmount.toFixed(2),
  };
  invoiceObj["cac:LegalMonetaryTotal"] = lmt;

  // Invoice lines
  invoiceObj["cac:InvoiceLine"] = lines.map((line) => {
    const itemObj: Record<string, unknown> = {};
    if (line.description) {
      itemObj["cbc:Description"] = line.description;
    }
    itemObj["cbc:Name"] = line.name;
    if (line.sellerItemId) {
      itemObj["cac:SellersItemIdentification"] = {
        "cbc:ID": line.sellerItemId,
      };
    }
    const classifiedTaxCat: Record<string, unknown> = {
      "cbc:ID": line.taxCategoryCode,
    };
    if (line.vatPercent > 0) {
      classifiedTaxCat["cbc:Percent"] = line.vatPercent.toFixed(2);
    }
    classifiedTaxCat["cac:TaxScheme"] = { "cbc:ID": "VAT" };
    itemObj["cac:ClassifiedTaxCategory"] = classifiedTaxCat;

    return {
      "cbc:ID": String(line.id),
      "cbc:InvoicedQuantity": {
        "@_unitCode": line.unitCode,
        "#text": line.quantity.toString(),
      },
      "cbc:LineExtensionAmount": {
        "@_currencyID": currency,
        "#text": line.lineExtensionAmount.toFixed(2),
      },
      "cac:Item": itemObj,
      "cac:Price": {
        "cbc:PriceAmount": {
          "@_currencyID": currency,
          "#text": roundMoney(line.unitPrice).toFixed(2),
        },
      },
    };
  });

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
    format: true,
    indentBy: "  ",
    suppressEmptyNode: true,
  });

  const xml = builder.build({ Invoice: invoiceObj }) as string;
  return `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`;
}

// =============================================================================
// XML Helper Functions
// =============================================================================

function buildInvoicePeriod(period: InvoicePeriod): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  if (period.startDate) {
    obj["cbc:StartDate"] = formatDate(period.startDate);
  }
  if (period.endDate) {
    obj["cbc:EndDate"] = formatDate(period.endDate);
  }
  if (period.descriptionCode) {
    obj["cbc:DescriptionCode"] = period.descriptionCode;
  }
  return obj;
}

function buildParty(
  party: Seller | Buyer,
  isSeller: boolean,
): Record<string, unknown> {
  const address = party.address;
  const county = sanitizeCounty(address.countrySubentity);
  const city = isBucharest(county)
    ? sanitizeCity(address.cityName)
    : address.cityName;

  // Postal Address
  const postalAddress: Record<string, unknown> = {
    "cbc:StreetName": address.streetName,
  };
  if (address.additionalStreetName) {
    postalAddress["cbc:AdditionalStreetName"] = address.additionalStreetName;
  }
  postalAddress["cbc:CityName"] = city;
  if (address.postalZone) {
    postalAddress["cbc:PostalZone"] = address.postalZone;
  }
  if (county) {
    postalAddress["cbc:CountrySubentity"] = county;
  }
  postalAddress["cac:Country"] = {
    "cbc:IdentificationCode": address.countryCode || DEFAULT_COUNTRY_CODE,
  };

  // Party
  const partyObj: Record<string, unknown> = {
    // Party Name — required by UBL 2.1 schema before PostalAddress
    "cac:PartyName": { "cbc:Name": party.registrationName },
    "cac:PostalAddress": postalAddress,
  };

  // Party Tax Scheme — only emitted when the party has a VAT registration.
  // Omitting this block entirely for non-VAT payers avoids emitting an invalid
  // empty <cac:TaxScheme/> element which triggers ANAF BR-RO warnings.
  const vatCode = isSeller
    ? (party as Seller).vatCode
    : (party as Buyer).vatCode;
  if (vatCode) {
    partyObj["cac:PartyTaxScheme"] = {
      "cbc:CompanyID": normalizeVatNumber(vatCode),
      "cac:TaxScheme": { "cbc:ID": "VAT" },
    };
  }

  // Party Legal Entity
  const legalEntity: Record<string, unknown> = {
    "cbc:RegistrationName": party.registrationName,
  };
  if (party.registrationNumber) {
    legalEntity["cbc:CompanyID"] = party.registrationNumber;
  }
  if (isSeller && (party as Seller).legalFormData) {
    legalEntity["cbc:CompanyLegalForm"] = (party as Seller).legalFormData!;
  }
  partyObj["cac:PartyLegalEntity"] = legalEntity;

  // Contact
  if (party.email || party.phone) {
    const contact: Record<string, unknown> = {};
    if (party.phone) {
      contact["cbc:Telephone"] = party.phone;
    }
    if (party.email) {
      contact["cbc:ElectronicMail"] = party.email;
    }
    partyObj["cac:Contact"] = contact;
  }

  return { "cac:Party": partyObj };
}

function buildPaymentMeans(payment: PaymentMeans): Record<string, unknown> {
  const pmObj: Record<string, unknown> = {};

  if (payment.paymentMeansDescription) {
    pmObj["cbc:PaymentMeansCode"] = {
      "@_name": payment.paymentMeansDescription,
      "#text": payment.paymentMeansCode,
    };
  } else {
    pmObj["cbc:PaymentMeansCode"] = payment.paymentMeansCode;
  }

  if (payment.paymentId) {
    pmObj["cbc:PaymentID"] = payment.paymentId;
  }

  if (payment.cardPayment) {
    const cardObj: Record<string, unknown> = {
      "cbc:PrimaryAccountNumberID": payment.cardPayment.primaryAccountNumber,
      "cbc:NetworkID": payment.cardPayment.networkId,
    };
    if (payment.cardPayment.holderName) {
      cardObj["cbc:HolderName"] = payment.cardPayment.holderName;
    }
    pmObj["cac:CardAccount"] = cardObj;
  }

  if (payment.bankTransfer) {
    const bankObj: Record<string, unknown> = {
      "cbc:ID": payment.bankTransfer.accountId,
    };
    if (payment.bankTransfer.accountName) {
      bankObj["cbc:Name"] = payment.bankTransfer.accountName;
    }
    if (payment.bankTransfer.bankId) {
      bankObj["cac:FinancialInstitutionBranch"] = {
        "cbc:ID": payment.bankTransfer.bankId,
      };
    }
    pmObj["cac:PayeeFinancialAccount"] = bankObj;
  }

  if (payment.directDebit) {
    pmObj["cac:PaymentMandate"] = {
      "cbc:ID": payment.directDebit.mandateId,
      "cac:PayerFinancialAccount": {
        "cbc:ID": payment.directDebit.debitedAccountId,
      },
    };
  }

  return pmObj;
}

function buildAllowanceCharge(
  ac: AllowanceCharge,
  currency: string,
): Record<string, unknown> {
  const acObj: Record<string, unknown> = {
    "cbc:ChargeIndicator": ac.chargeIndicator ? "true" : "false",
  };

  if (ac.reasonCode) {
    acObj["cbc:AllowanceChargeReasonCode"] = ac.reasonCode;
  }
  if (ac.reason) {
    acObj["cbc:AllowanceChargeReason"] = ac.reason;
  }
  if (ac.percentage !== undefined) {
    acObj["cbc:MultiplierFactorNumeric"] = ac.percentage.toString();
  }

  acObj["cbc:Amount"] = {
    "@_currencyID": currency,
    "#text": ac.amount.toFixed(2),
  };

  if (ac.baseAmount !== undefined) {
    acObj["cbc:BaseAmount"] = {
      "@_currencyID": currency,
      "#text": ac.baseAmount.toFixed(2),
    };
  }

  if (ac.taxCategoryCode || ac.vatPercent !== undefined) {
    acObj["cac:TaxCategory"] = {
      "cbc:ID": ac.taxCategoryCode || "S",
      "cbc:Percent": (ac.vatPercent ?? 0).toFixed(2),
      "cac:TaxScheme": { "cbc:ID": "VAT" },
    };
  }

  return acObj;
}
