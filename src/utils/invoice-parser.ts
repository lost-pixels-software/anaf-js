/**
 * Invoice XML Parser
 *
 * Parses CIUS-RO UBL 2.1 invoice XML into a structured JSON object.
 * Used for extracting invoice data from downloaded ZIP archives.
 */

import { XMLParser } from "fast-xml-parser";
import type {
  InvoiceData,
  ParsedAllowanceCharge,
  ParsedInvoiceLine,
} from "../types/invoice";

// =============================================================================
// XML Parser Setup
// =============================================================================

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: true,
  removeNSPrefix: true, // Strip cbc:, cac: namespaces
});

// =============================================================================
// Text Extraction Helpers
// =============================================================================

function getText(node: unknown): string | undefined {
  if (node === null || node === undefined) return undefined;
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (typeof node === "object" && node !== null) {
    const obj = node as Record<string, unknown>;
    if ("#text" in obj) return String(obj["#text"]);
    // Some parsers return the text directly as the value
    const keys = Object.keys(obj);
    if (keys.length === 0) return undefined;
  }
  return undefined;
}

function getNumber(node: unknown): number | undefined {
  const text = getText(node);
  if (!text) return undefined;
  const num = parseFloat(text);
  return isNaN(num) ? undefined : num;
}

function getAttr(node: unknown, attr: string): string | undefined {
  if (node === null || node === undefined) return undefined;
  if (typeof node === "object" && node !== null) {
    const obj = node as Record<string, unknown>;
    return getText(obj[`@_${attr}`]);
  }
  return undefined;
}

function ensureArray<T>(node: T | T[] | undefined): T[] {
  if (node === undefined || node === null) return [];
  if (Array.isArray(node)) return node;
  return [node];
}

// =============================================================================
// Party Parser
// =============================================================================

function parseParty(node: unknown) {
  if (!node || typeof node !== "object") return undefined;
  const partyNode = (node as Record<string, unknown>).Party;
  if (!partyNode || typeof partyNode !== "object") return undefined;
  const party = partyNode as Record<string, unknown>;

  const partyName = ensureArray(party.PartyName)[0];
  const postalAddress = ensureArray(party.PostalAddress)[0];
  const partyTaxScheme = ensureArray(party.PartyTaxScheme)[0];
  const partyLegalEntity = ensureArray(party.PartyLegalEntity)[0];
  const contact = ensureArray(party.Contact)[0];

  let address;
  if (postalAddress && typeof postalAddress === "object") {
    const addr = postalAddress as Record<string, unknown>;
    const country = ensureArray(addr.Country)[0];
    address = {
      streetName: getText(addr.StreetName),
      additionalStreetName: getText(addr.AdditionalStreetName),
      cityName: getText(addr.CityName),
      postalZone: getText(addr.PostalZone),
      countrySubentity: getText(addr.CountrySubentity),
      countryCode: country && typeof country === "object" ? getText((country as Record<string, unknown>).IdentificationCode) : undefined,
    };
  }

  let vatCode: string | undefined;
  if (partyTaxScheme && typeof partyTaxScheme === "object") {
    const pts = partyTaxScheme as Record<string, unknown>;
    vatCode = getText(pts.CompanyID);
  }

  let registrationName: string | undefined;
  let registrationCode: string | undefined;
  let legalFormData: string | undefined;
  if (partyLegalEntity && typeof partyLegalEntity === "object") {
    const ple = partyLegalEntity as Record<string, unknown>;
    registrationName = getText(ple.RegistrationName);
    registrationCode = getText(ple.CompanyID);
    legalFormData = getText(ple.CompanyLegalForm);
  }

  let phone: string | undefined;
  let email: string | undefined;
  if (contact && typeof contact === "object") {
    const c = contact as Record<string, unknown>;
    phone = getText(c.Telephone);
    email = getText(c.ElectronicMail);
  }

  return {
    name: partyName && typeof partyName === "object" ? getText((partyName as Record<string, unknown>).Name) : undefined,
    registrationName,
    registrationCode,
    vatCode,
    registrationNumber: registrationCode,
    legalFormData,
    address,
    phone,
    email,
  };
}

// =============================================================================
// Allowance / charge helpers
// =============================================================================

/** Signed ex-VAT amount for one AllowanceCharge (UBL amount + chargeIndicator). */
export function signedAllowanceChargeAmount(
  chargeIndicator: boolean,
  rawAmount: number,
): number {
  const abs = Math.abs(rawAmount);
  if (chargeIndicator) {
    return rawAmount < 0 ? rawAmount : abs;
  }
  return rawAmount < 0 ? rawAmount : -abs;
}

function sumAllowanceChargeAdjustment(
  allowanceCharges: ParsedAllowanceCharge[],
): number {
  return allowanceCharges.reduce((sum, ac) => {
    if (ac.amount === undefined) return sum;
    return sum + signedAllowanceChargeAmount(!!ac.chargeIndicator, ac.amount);
  }, 0);
}

// =============================================================================
// Line Parser
// =============================================================================

function parseInvoiceLine(node: unknown): ParsedInvoiceLine | undefined {
  if (!node || typeof node !== "object") return undefined;
  const line = node as Record<string, unknown>;

  const item = ensureArray(line.Item)[0];
  const classifiedTaxCategory = item && typeof item === "object"
    ? ensureArray((item as Record<string, unknown>).ClassifiedTaxCategory)[0]
    : undefined;
  const price = ensureArray(line.Price)[0];

  let sellerItemId: string | undefined;
  if (item && typeof item === "object") {
    const sellersItemId = ensureArray((item as Record<string, unknown>).SellersItemIdentification)[0];
    if (sellersItemId && typeof sellersItemId === "object") {
      sellerItemId = getText((sellersItemId as Record<string, unknown>).ID);
    }
  }

  let vatPercent: number | undefined;
  if (classifiedTaxCategory && typeof classifiedTaxCategory === "object") {
    vatPercent = getNumber((classifiedTaxCategory as Record<string, unknown>).Percent);
  }

  let taxCategoryCode: string | undefined;
  if (classifiedTaxCategory && typeof classifiedTaxCategory === "object") {
    taxCategoryCode = getText((classifiedTaxCategory as Record<string, unknown>).ID);
  }

  const qtyNode = line.InvoicedQuantity;
  let quantity: number | undefined;
  let unitCode: string | undefined;
  if (qtyNode && typeof qtyNode === "object") {
    quantity = getNumber(qtyNode);
    unitCode = getAttr(qtyNode, "unitCode");
  } else if (typeof qtyNode === "string") {
    quantity = parseFloat(qtyNode);
  }

  let unitPrice: number | undefined;
  if (price && typeof price === "object") {
    unitPrice = getNumber((price as Record<string, unknown>).PriceAmount);
  }

  const allowanceCharges = ensureArray(line.AllowanceCharge)
    .map(parseAllowanceCharge)
    .filter((x): x is ParsedAllowanceCharge => x !== undefined);

  const allowanceChargeAdjustment = sumAllowanceChargeAdjustment(allowanceCharges);

  const lineExtensionAmount = getNumber(line.LineExtensionAmount);
  const grossLineExtensionAmount =
    lineExtensionAmount ??
    (quantity !== undefined && unitPrice !== undefined
      ? quantity * unitPrice
      : undefined);

  const netLineExtensionAmount =
    grossLineExtensionAmount !== undefined
      ? grossLineExtensionAmount + allowanceChargeAdjustment
      : undefined;

  const netUnitPrice =
    quantity !== undefined && quantity > 0 && netLineExtensionAmount !== undefined
      ? netLineExtensionAmount / quantity
      : undefined;

  return {
    id: getText(line.ID),
    name: item && typeof item === "object" ? getText((item as Record<string, unknown>).Name) : undefined,
    description: item && typeof item === "object" ? getText((item as Record<string, unknown>).Description) : undefined,
    sellerItemId,
    quantity,
    unitCode,
    unitPrice,
    lineExtensionAmount,
    allowanceCharges:
      allowanceCharges.length > 0 ? allowanceCharges : undefined,
    allowanceChargeAdjustment:
      allowanceChargeAdjustment !== 0 ? allowanceChargeAdjustment : undefined,
    netLineExtensionAmount,
    netUnitPrice,
    vatPercent,
    taxCategoryCode,
  };
}

// =============================================================================
// Tax Total Parser
// =============================================================================

function parseTaxTotal(node: unknown) {
  if (!node || typeof node !== "object") return undefined;
  const taxTotal = node as Record<string, unknown>;

  const taxAmountNode = taxTotal.TaxAmount;
  let taxAmount: number | undefined;
  let currency: string | undefined;
  if (taxAmountNode && typeof taxAmountNode === "object") {
    taxAmount = getNumber(taxAmountNode);
    currency = getAttr(taxAmountNode, "currencyID");
  }

  const subtotals = ensureArray(taxTotal.TaxSubtotal)
    .map((st) => {
      if (!st || typeof st !== "object") return undefined;
      const s = st as Record<string, unknown>;
      const taxCategory = ensureArray(s.TaxCategory)[0];
      let categoryId: string | undefined;
      let taxPercent: number | null | undefined;
      let taxExemptionReasonCode: string | undefined;
      let taxExemptionReason: string | undefined;

      if (taxCategory && typeof taxCategory === "object") {
        const tc = taxCategory as Record<string, unknown>;
        categoryId = getText(tc.ID);
        const pct = getNumber(tc.Percent);
        taxPercent = pct === undefined ? null : pct;
        taxExemptionReasonCode = getText(tc.TaxExemptionReasonCode);
        taxExemptionReason = getText(tc.TaxExemptionReason);
      }

      const taxableAmountNode = s.TaxableAmount;
      const taxAmtNode = s.TaxAmount;

      return {
        taxableAmount: taxableAmountNode && typeof taxableAmountNode === "object" ? getNumber(taxableAmountNode) : undefined,
        taxAmount: taxAmtNode && typeof taxAmtNode === "object" ? getNumber(taxAmtNode) : undefined,
        categoryId,
        taxPercent,
        taxExemptionReasonCode,
        taxExemptionReason,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== undefined);

  return {
    taxAmount,
    currency,
    subtotals,
  };
}

// =============================================================================
// Monetary Total Parser
// =============================================================================

function parseMonetaryTotal(node: unknown) {
  if (!node || typeof node !== "object") return undefined;
  const mt = node as Record<string, unknown>;

  const extract = (key: string) => {
    const n = mt[key];
    if (n && typeof n === "object") {
      return {
        value: getNumber(n),
        currency: getAttr(n, "currencyID"),
      };
    }
    return { value: undefined, currency: undefined };
  };

  const lineExt = extract("LineExtensionAmount");
  const taxExc = extract("TaxExclusiveAmount");
  const taxInc = extract("TaxInclusiveAmount");
  const allowance = extract("AllowanceTotalAmount");
  const charge = extract("ChargeTotalAmount");
  const payable = extract("PayableAmount");

  return {
    lineExtensionAmount: lineExt.value,
    taxExclusiveAmount: taxExc.value,
    taxInclusiveAmount: taxInc.value,
    allowanceTotalAmount: allowance.value,
    chargeTotalAmount: charge.value,
    payableAmount: payable.value,
    currency: lineExt.currency ?? taxExc.currency,
  };
}

// =============================================================================
// Payment Means Parser
// =============================================================================

function parsePaymentMeans(node: unknown) {
  if (!node || typeof node !== "object") return undefined;
  const pm = node as Record<string, unknown>;

  const paymentMeansCodeNode = pm.PaymentMeansCode;
  let paymentMeansCode: string | undefined;
  let paymentMeansDescription: string | undefined;
  if (paymentMeansCodeNode && typeof paymentMeansCodeNode === "object") {
    paymentMeansCode = getText(paymentMeansCodeNode);
    paymentMeansDescription = getAttr(paymentMeansCodeNode, "name");
  } else {
    paymentMeansCode = getText(paymentMeansCodeNode);
  }

  const payeeFinancialAccount = ensureArray(pm.PayeeFinancialAccount)[0];
  let bankTransfer;
  if (payeeFinancialAccount && typeof payeeFinancialAccount === "object") {
    const pfa = payeeFinancialAccount as Record<string, unknown>;
    const fiBranch = ensureArray(pfa.FinancialInstitutionBranch)[0];
    bankTransfer = {
      accountId: getText(pfa.ID),
      accountName: getText(pfa.Name),
      bankId: fiBranch && typeof fiBranch === "object" ? getText((fiBranch as Record<string, unknown>).ID) : undefined,
    };
  }

  const cardAccount = ensureArray(pm.CardAccount)[0];
  let cardPayment;
  if (cardAccount && typeof cardAccount === "object") {
    const ca = cardAccount as Record<string, unknown>;
    cardPayment = {
      primaryAccountNumber: getText(ca.PrimaryAccountNumberID),
      networkId: getText(ca.NetworkID),
      holderName: getText(ca.HolderName),
    };
  }

  return {
    paymentMeansCode,
    paymentMeansDescription,
    paymentId: getText(pm.PaymentID),
    bankTransfer,
    cardPayment,
  };
}

// =============================================================================
// Allowance Charge Parser
// =============================================================================

function parseAllowanceCharge(node: unknown): ParsedAllowanceCharge | undefined {
  if (!node || typeof node !== "object") return undefined;
  const ac = node as Record<string, unknown>;

  const indicator = getText(ac.ChargeIndicator);
  const taxCategory = ensureArray(ac.TaxCategory)[0];

  let taxCategoryCode: string | undefined;
  let vatPercent: number | undefined;
  if (taxCategory && typeof taxCategory === "object") {
    const tc = taxCategory as Record<string, unknown>;
    taxCategoryCode = getText(tc.ID);
    vatPercent = getNumber(tc.Percent);
  }

  const amountNode = ac.Amount;
  let amount: number | undefined;
  if (amountNode && typeof amountNode === "object") {
    amount = getNumber(amountNode);
  }

  const baseAmountNode = ac.BaseAmount;
  let baseAmount: number | undefined;
  if (baseAmountNode && typeof baseAmountNode === "object") {
    baseAmount = getNumber(baseAmountNode);
  }

  return {
    chargeIndicator: indicator === "true",
    reasonCode: getText(ac.AllowanceChargeReasonCode),
    reason: getText(ac.AllowanceChargeReason),
    percentage: getNumber(ac.MultiplierFactorNumeric),
    amount,
    baseAmount,
    taxCategoryCode,
    vatPercent,
  };
}

// =============================================================================
// Main Parser
// =============================================================================

/**
 * Parse a CIUS-RO UBL 2.1 invoice XML string into a structured JSON object.
 *
 * @param xml - The UBL invoice XML string
 * @returns Structured invoice data
 *
 * @example
 * ```typescript
 * const invoiceData = parseInvoiceXml(xmlString);
 * console.log(invoiceData.invoiceId);
 * console.log(invoiceData.seller?.registrationName);
 * console.log(invoiceData.lines?.length);
 * ```
 */
export function parseInvoiceXml(xml: string): InvoiceData {
  const parsed = parser.parse(xml);
  const invoice = parsed.Invoice;

  if (!invoice || typeof invoice !== "object") {
    throw new Error("Invalid invoice XML: missing <Invoice> root element");
  }

  const inv = invoice as Record<string, unknown>;

  // Invoice ID
  const invoiceId = getText(inv.ID);

  // Invoice period
  let invoicePeriod;
  const periodNode = ensureArray(inv.InvoicePeriod)[0];
  if (periodNode && typeof periodNode === "object") {
    const p = periodNode as Record<string, unknown>;
    invoicePeriod = {
      startDate: getText(p.StartDate),
      endDate: getText(p.EndDate),
      descriptionCode: getText(p.DescriptionCode),
    };
  }

  // Order reference
  let orderReference: string | undefined;
  const orderRefNode = ensureArray(inv.OrderReference)[0];
  if (orderRefNode && typeof orderRefNode === "object") {
    orderReference = getText((orderRefNode as Record<string, unknown>).ID);
  }

  // Contract reference
  let contractReference: string | undefined;
  const contractRefNode = ensureArray(inv.ContractDocumentReference)[0];
  if (contractRefNode && typeof contractRefNode === "object") {
    contractReference = getText((contractRefNode as Record<string, unknown>).ID);
  }

  // Billing / preceding invoice references
  const precedingInvoiceReferences = ensureArray(inv.BillingReference)
    .map((br) => {
      if (!br || typeof br !== "object") return undefined;
      const invoiceDocRef = ensureArray((br as Record<string, unknown>).InvoiceDocumentReference)[0];
      if (!invoiceDocRef || typeof invoiceDocRef !== "object") return undefined;
      return {
        id: getText((invoiceDocRef as Record<string, unknown>).ID),
        issueDate: getText((invoiceDocRef as Record<string, unknown>).IssueDate),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== undefined);

  // Tax totals
  const taxTotals = ensureArray(inv.TaxTotal)
    .map(parseTaxTotal)
    .filter((x): x is NonNullable<typeof x> => x !== undefined);

  // Monetary total
  const monetaryTotalNode = ensureArray(inv.LegalMonetaryTotal)[0];
  const monetaryTotal = parseMonetaryTotal(monetaryTotalNode);

  // Payment means
  const paymentMeans = ensureArray(inv.PaymentMeans)
    .map(parsePaymentMeans)
    .filter((x): x is NonNullable<typeof x> => x !== undefined)[0];

  // Payment terms
  let paymentTerms: string | undefined;
  const paymentTermsNode = ensureArray(inv.PaymentTerms)[0];
  if (paymentTermsNode && typeof paymentTermsNode === "object") {
    paymentTerms = getText((paymentTermsNode as Record<string, unknown>).Note);
  }

  // Allowance charges
  const allowanceCharges = ensureArray(inv.AllowanceCharge)
    .map(parseAllowanceCharge)
    .filter((x): x is NonNullable<typeof x> => x !== undefined);

  // Lines
  const lines = ensureArray(inv.InvoiceLine)
    .map(parseInvoiceLine)
    .filter((x): x is NonNullable<typeof x> => x !== undefined);

  // Seller / Buyer
  const seller = parseParty(inv.AccountingSupplierParty);
  const buyer = parseParty(inv.AccountingCustomerParty);

  return {
    invoiceId,
    issueDate: getText(inv.IssueDate),
    dueDate: getText(inv.DueDate),
    taxPointDate: getText(inv.TaxPointDate),
    invoiceTypeCode: getText(inv.InvoiceTypeCode),
    currency: getText(inv.DocumentCurrencyCode),
    taxCurrency: getText(inv.TaxCurrencyCode),
    note: getText(inv.Note),
    buyerReference: getText(inv.BuyerReference),
    invoicePeriod,
    orderReference,
    contractReference,
    precedingInvoiceReferences: precedingInvoiceReferences.length > 0 ? precedingInvoiceReferences : undefined,
    seller,
    buyer,
    paymentMeans,
    paymentTerms,
    allowanceCharges: allowanceCharges.length > 0 ? allowanceCharges : undefined,
    taxTotals: taxTotals.length > 0 ? taxTotals : undefined,
    monetaryTotal,
    lines: lines.length > 0 ? lines : undefined,
    lineCount: lines.length,
  };
}
