/**
 * Example usage of the ANAF e-Factura Invoice Generator
 *
 * This file demonstrates Invoice.buildXml() with various configurations.
 */

import { Invoice } from "./index";
import type { Seller, Buyer, PaymentMeans } from "./types";

// =============================================================================
// Example 1: Simple Invoice
// =============================================================================

function createSimpleInvoice(): string {
  return Invoice.buildXml({
    invoiceNumber: "001",
    invoiceSeries: "ABC",
    issueDate: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    note: "Mulțumim pentru colaborare!",

    seller: {
      registrationName: "Furnizor Example S.R.L.",
      registrationCode: "12345678",
      vatCode: "RO12345678",
      registrationNumber: "J40/123/2020",
      legalFormData: "Capital social: 200 LEI",
      address: {
        streetName: "Strada Exemplu nr. 10",
        cityName: "București",
        postalZone: "010101",
        countrySubentity: "RO-B",
        countryCode: "RO",
      },
      email: "contact@furnizor.ro",
      phone: "+40721000000",
    },

    buyer: {
      registrationName: "Client Example S.A.",
      registrationCode: "87654321",
      vatCode: "RO87654321",
      registrationNumber: "J12/456/2019",
      address: {
        streetName: "Bulevardul Client nr. 25",
        cityName: "Cluj-Napoca",
        postalZone: "400001",
        countrySubentity: "RO-CJ",
        countryCode: "RO",
      },
    },

    lines: [
      {
        name: "Servicii consultanță IT",
        description: "Consultanță pentru implementare sistem ERP",
        quantity: 40,
        unitCode: "HUR", // Hours
        unitPrice: 150,
        vatPercent: 19,
      },
      {
        name: "Licență software",
        quantity: 5,
        unitCode: "C62", // Units
        unitPrice: 500,
        vatPercent: 19,
      },
      {
        name: "Manuale utilizare",
        description: "Documentație tehnică și manuale",
        quantity: 1,
        unitCode: "SET",
        unitPrice: 200,
        vatPercent: 19,
      },
    ],

    paymentIban: "RO49AAAA1B31007593840000",
    defaultVatPercent: 19,
  });
}

// =============================================================================
// Example 2: Advanced Invoice with Full Payment Means
// =============================================================================

function createAdvancedInvoice(): string {
  const seller: Seller = {
    registrationName: "Tech Solutions S.R.L.",
    registrationCode: "11223344",
    vatCode: "RO11223344",
    registrationNumber: "J40/789/2018",
    legalFormData: "Capital social: 10.000 LEI",
    address: {
      streetName: "Calea Victoriei 100",
      additionalStreetName: "Etaj 5, Birou 501",
      cityName: "SECTOR1",
      postalZone: "010271",
      countrySubentity: "RO-B",
      countryCode: "RO",
    },
    bankAccount: "RO49AAAA1B31007593840000",
    bankName: "BCR",
    email: "facturi@techsolutions.ro",
    phone: "+40213000000",
  };

  const buyer: Buyer = {
    registrationName: "Client Premium S.R.L.",
    registrationCode: "99887766",
    vatCode: "RO99887766",
    address: {
      streetName: "Strada Businessului 42",
      cityName: "Timișoara",
      postalZone: "300001",
      countrySubentity: "RO-TM",
      countryCode: "RO",
    },
    email: "accounting@clientpremium.ro",
  };

  const paymentMeans: PaymentMeans = {
    paymentMeansCode: "30",
    paymentMeansDescription: "Transfer bancar",
    paymentId: "REF-2024-001",
    bankTransfer: {
      accountId: "RO49AAAA1B31007593840000",
      accountName: "Tech Solutions S.R.L.",
      bankId: "BTRLRO22",
    },
  };

  return Invoice.buildXml({
    invoiceSeries: "TS",
    invoiceNumber: "2024-001",
    issueDate: new Date("2024-01-15"),
    dueDate: new Date("2024-02-15"),
    invoiceTypeCode: "380",
    note: "Servicii de dezvoltare software",
    buyerReference: "PO-12345",
    invoicePeriod: {
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      descriptionCode: "35",
    },

    seller,
    buyer,
    paymentMeans,
    paymentTerms: { note: "Net 30 zile" },

    lines: [
      {
        name: "Servicii dezvoltare software",
        description: "Dezvoltare aplicație web - Ianuarie 2024",
        sellerItemId: "SRV-DEV-001",
        quantity: 160,
        unitCode: "HUR",
        unitPrice: 75,
        vatPercent: 19,
      },
      {
        name: "Hosting cloud - Ianuarie",
        sellerItemId: "SRV-HOST-001",
        quantity: 1,
        unitCode: "MON",
        unitPrice: 500,
        vatPercent: 19,
      },
    ],
  });
}

// =============================================================================
// Example 3: Credit Note
// =============================================================================

function createCreditNote(): string {
  return Invoice.buildXml({
    invoiceSeries: "CN",
    invoiceNumber: "2024-001",
    issueDate: new Date(),
    invoiceTypeCode: "381",
    note: "Notă de credit pentru factura ABC001",

    seller: {
      registrationName: "Furnizor Example S.R.L.",
      registrationCode: "12345678",
      vatCode: "RO12345678",
      registrationNumber: "J40/123/2020",
      address: {
        streetName: "Strada Exemplu nr. 10",
        cityName: "București",
        countrySubentity: "RO-B",
        countryCode: "RO",
      },
    },

    buyer: {
      registrationName: "Client Example S.A.",
      registrationCode: "87654321",
      vatCode: "RO87654321",
      address: {
        streetName: "Bulevardul Client nr. 25",
        cityName: "Cluj-Napoca",
        countrySubentity: "RO-CJ",
        countryCode: "RO",
      },
    },

    precedingInvoiceReferences: [
      {
        id: "ABC001",
        issueDate: new Date("2024-01-01"),
      },
    ],

    lines: [
      {
        name: "Discount produs returnat",
        quantity: -1,
        unitPrice: 500,
        vatPercent: 19,
      },
    ],
  });
}

// =============================================================================
// Example 4: Invoice from Non-VAT Payer
// =============================================================================

function createNonVatPayerInvoice(): string {
  return Invoice.buildXml({
    invoiceNumber: "NV-001",
    issueDate: new Date(),

    seller: {
      registrationName: "Freelancer PFA",
      registrationCode: "12345678",
      vatCode: null,
      registrationNumber: "F40/123/2020",
      address: {
        streetName: "Strada Liber Profesionist 5",
        cityName: "Timișoara",
        postalZone: "300001",
        countrySubentity: "RO-TM",
        countryCode: "RO",
      },
    },

    buyer: {
      registrationName: "Client Corp S.R.L.",
      registrationCode: "99887766",
      vatCode: "RO99887766",
      address: {
        streetName: "Aleea Business 12",
        cityName: "Iași",
        postalZone: "700001",
        countrySubentity: "RO-IS",
        countryCode: "RO",
      },
    },

    lines: [
      {
        name: "Servicii web design",
        quantity: 1,
        unitPrice: 2000,
        // No VAT - seller is not VAT registered
      },
    ],

    paymentIban: "RO49AAAA1B31007593840000",
  });
}

// =============================================================================
// Example 5: Invoice with Allowances and Charges
// =============================================================================

function createInvoiceWithAllowancesAndCharges(): string {
  return Invoice.buildXml({
    invoiceNumber: "AC-001",
    issueDate: new Date(),

    seller: {
      registrationName: "Magazin Online S.R.L.",
      registrationCode: "11111111",
      vatCode: "RO11111111",
      registrationNumber: "J40/111/2020",
      address: {
        streetName: "Strada Comercială 1",
        cityName: "București",
        countrySubentity: "RO-B",
      },
    },

    buyer: {
      registrationName: "Client Fidel S.R.L.",
      registrationCode: "22222222",
      vatCode: "RO22222222",
      address: {
        streetName: "Strada Cumpărăturilor 2",
        cityName: "Brașov",
        countrySubentity: "RO-BV",
      },
    },

    lines: [
      {
        name: "Laptop Business Pro",
        quantity: 5,
        unitPrice: 4000,
        vatPercent: 19,
      },
      {
        name: "Mouse wireless",
        quantity: 5,
        unitPrice: 150,
        vatPercent: 19,
      },
    ],

    allowanceCharges: [
      // Document-level discount
      {
        chargeIndicator: false,
        reason: "Discount client fidel 10%",
        reasonCode: "95",
        amount: 2075, // 10% of (5*4000 + 5*150)
        taxCategoryCode: "S",
        vatPercent: 19,
      },
      // Document-level charge (shipping)
      {
        chargeIndicator: true,
        reason: "Transport și livrare",
        reasonCode: "FC",
        amount: 100,
        taxCategoryCode: "S",
        vatPercent: 19,
      },
    ],
  });
}

// =============================================================================
// Run Examples
// =============================================================================

async function main() {
  console.log("=".repeat(80));
  console.log("ANAF e-Factura Invoice Generator - Examples");
  console.log("=".repeat(80));
  console.log();

  // Example 1
  console.log("📄 Example 1: Simple Invoice");
  console.log("-".repeat(40));
  const simpleXml = createSimpleInvoice();
  console.log(simpleXml.substring(0, 500) + "...\n");

  // Example 2
  console.log("📄 Example 2: Advanced Invoice");
  console.log("-".repeat(40));
  const advancedXml = createAdvancedInvoice();
  console.log(advancedXml.substring(0, 500) + "...\n");

  // Example 3
  console.log("📄 Example 3: Credit Note");
  console.log("-".repeat(40));
  const creditNoteXml = createCreditNote();
  console.log(creditNoteXml.substring(0, 500) + "...\n");

  // Example 4
  console.log("📄 Example 4: Non-VAT Payer Invoice");
  console.log("-".repeat(40));
  const nonVatXml = createNonVatPayerInvoice();
  console.log(nonVatXml.substring(0, 500) + "...\n");

  // Example 5
  console.log("📄 Example 5: Invoice with Allowances & Charges");
  console.log("-".repeat(40));
  const acXml = createInvoiceWithAllowancesAndCharges();
  console.log(acXml.substring(0, 500) + "...\n");

  // Save full XML to file for inspection
  const fs = await import("fs");
  const path = await import("path");

  const outputDir = path.join(import.meta.dir, "../examples");

  try {
    fs.mkdirSync(outputDir, { recursive: true });

    fs.writeFileSync(
      path.join(outputDir, "simple-invoice.xml"),
      simpleXml,
      "utf-8"
    );
    fs.writeFileSync(
      path.join(outputDir, "advanced-invoice.xml"),
      advancedXml,
      "utf-8"
    );
    fs.writeFileSync(
      path.join(outputDir, "credit-note.xml"),
      creditNoteXml,
      "utf-8"
    );
    fs.writeFileSync(
      path.join(outputDir, "non-vat-payer.xml"),
      nonVatXml,
      "utf-8"
    );
    fs.writeFileSync(
      path.join(outputDir, "allowances-charges.xml"),
      acXml,
      "utf-8"
    );

    console.log(`✅ Full XML files saved to: ${outputDir}`);
  } catch (err) {
    console.log("⚠️  Could not save XML files:", err);
  }
}

main().catch(console.error);
