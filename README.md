# anaf-js

A comprehensive TypeScript library for the Romanian ANAF e-Factura system.

## Features

- ✅ **Invoice XML Generation** - CIUS-RO compliant UBL 2.1 invoices
- ✅ **Company Info Lookup** - Public ANAF API (no auth required)
- ✅ **e-Factura API** - Upload, download, validate, messages
- ✅ **OAuth 2.0 Authentication** - Full OAuth flow with Bun server
- ✅ **Type-Safe** - Full TypeScript support
- ✅ **Zero External HTTP Dependencies** - Uses native `fetch`

## Installation

```bash
bun add anaf-js
# or
npm install anaf-js
```

---

## ANAF API Usage

### Company Info Lookup (No Auth Required)

```typescript
import { CompanyInfoClient } from "anaf-js";

const client = new CompanyInfoClient();

// Single company
const result = await client.getCompanyData("RO12345678");

if (result.success) {
  const company = result.data[0];
  console.log(company.generalData.companyName);
  console.log(company.hqAddress); // HQ address
  console.log(company.fiscalAddress); // Fiscal address
  console.log(company.vatRegistration); // VAT status
  console.log(company.generalData.eFacturaStatus); // e-Factura enrollment
}

// Batch lookup (max 100)
const batch = await client.batchGetCompanyData(["RO123", "RO456"]);
```

### OAuth Authentication

#### Local Development & Testing

When testing locally, the internal OAuth server listens on `localhost:3000` by default. However, ANAF requires a public HTTPS URL for redirects.

You do **not** need to change the local server configuration. Instead:

1. Use a tool like **ngrok** to forward traffic: `ngrok http 3000`.
2. Set the `redirectUri` in your `.env` (and in the ANAF portal) to your ngrok URL (e.g., `https://xxxx.ngrok-free.app/callback`).
3. The internal server will automatically handle the callback on `localhost:3000`.

```typescript
import { AnafAuthenticator, runOAuthFlow, saveCredentials } from "anaf-js";

const auth = new AnafAuthenticator({
  clientId: "your-client-id",
  clientSecret: "your-client-secret",
  redirectUri: "http://localhost:3000/callback",
});

// Generate auth URL and run OAuth flow
const url = auth.getAuthorizationUrl();
const { code } = await runOAuthFlow(url, { port: 3000 });

// Exchange code for tokens
const tokens = await auth.exchangeCodeForToken(code);
saveCredentials(AnafAuthenticator.toStoredCredentials(tokens));
```

### e-Factura Operations (Requires OAuth)

```typescript
import { EfacturaClient, Invoice, loadCredentials } from "anaf-js";

const creds = loadCredentials();
const client = new EfacturaClient({
  vatNumber: "RO12345678",
  testMode: true,
  accessToken: creds.accessToken,
  refreshToken: creds.refreshToken,
});

// Generate and upload invoice
const xml = Invoice.buildXml({ ... });
const upload = await client.uploadDocument(xml);

// Check status
const status = await client.getStatusMessage(upload.uploadIndex);

// Download result
const file = await client.downloadDocument(status.downloadId);

// List messages
const messages = await client.getMessages({ days: 7 });

// Validate XML (no auth required)
const validation = await client.validateXml(xml);

// Convert to PDF
const pdf = await client.xmlToPdf(xml);
```

---

## Invoice XML Generation

## Quick Start

```typescript
import { Invoice } from "anaf-js";

const xml = Invoice.buildXml({
  // ═══════════════════════════════════════════════════════════════════════════
  // REQUIRED - TypeScript will error if you forget these
  // ═══════════════════════════════════════════════════════════════════════════

  invoiceNumber: "2024-001",
  issueDate: new Date(),

  seller: {
    registrationName: "Furnizor S.R.L.",
    registrationCode: "12345678",
    vatCode: "RO12345678", // null if not VAT registered
    registrationNumber: "J40/123/2020",
    legalFormData: "Capital social: 200 LEI",
    address: {
      streetName: "Strada Exemplu 10",
      cityName: "București",
      postalZone: "010101",
      countrySubentity: "RO-B",
    },
  },

  buyer: {
    registrationName: "Client S.A.",
    registrationCode: "87654321",
    vatCode: "RO87654321",
    address: {
      streetName: "Bulevardul Client 25",
      cityName: "Cluj-Napoca",
      postalZone: "400001",
      countrySubentity: "RO-CJ",
    },
  },

  lines: [
    {
      name: "Servicii consultanță",
      quantity: 10,
      unitCode: "HUR", // Optional: defaults to "EA"
      unitPrice: 150,
      vatPercent: 21, // Optional: uses defaultVatPercent if omitted
    },
    {
      name: "Licență software",
      quantity: 1,
      unitPrice: 500,
      vatPercent: 21,
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // OPTIONAL - Omit any you don't need
  // ═══════════════════════════════════════════════════════════════════════════

  invoiceSeries: "ABC", // Invoice prefix
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  defaultVatPercent: 21, // Default VAT for lines without vatPercent
  paymentIban: "RO49AAAA1B31007593840000",
  note: "Mulțumim pentru colaborare!",

  // invoiceTypeCode: "380",             // Default: Commercial Invoice
  // currencyCode: "RON",                // Default: RON
  // buyerReference: "PO-2024-001",
  // taxPointDate: new Date(),
  // orderReference: { id: "PO-001" },
  // contractReference: { id: "CONTRACT-001" },
  // invoicePeriod: { startDate: "2024-01-01", endDate: "2024-01-31" },
  // paymentTerms: { note: "Payment within 30 days" },
  // paymentMeans: { ... },              // Full payment config (alternative to paymentIban)
  // allowanceCharges: [...],            // Document-level discounts/surcharges
  // precedingInvoiceReferences: [...],  // Required for credit notes
});

console.log(xml);
```

## API

### `Invoice.buildXml(config)`

Returns the UBL 2.1 XML string directly.

## Invoice Types

| Code  | Description                       |
| ----- | --------------------------------- |
| `380` | Commercial Invoice (default)      |
| `381` | Credit Note                       |
| `384` | Corrected Invoice                 |
| `389` | Self-billed Invoice (Autofactură) |
| `751` | Invoice for accounting purposes   |

## Tax Categories

| Code | Description                   |
| ---- | ----------------------------- |
| `S`  | Standard rate (e.g., 21% VAT) |
| `Z`  | Zero rated                    |
| `E`  | Exempt from VAT               |
| `AE` | VAT Reverse Charge            |
| `K`  | Intra-community (EU export)   |
| `G`  | Free export                   |
| `O`  | Not subject to VAT            |

## Credit Notes

```typescript
const creditNote = Invoice.buildXml({
  invoiceNumber: "CN-001",
  issueDate: new Date(),
  invoiceTypeCode: "381",

  seller: { ... },
  buyer: { ... },

  // Link to original invoice
  precedingInvoiceReferences: [{
    id: "INV-2024-001",
    issueDate: new Date("2024-01-01"),
  }],

  lines: [{
    name: "Returned product",
    quantity: -1,  // Negative for credits
    unitPrice: 500,
    vatPercent: 21,
  }],
});
```

## Non-VAT Payer Invoices

```typescript
const invoice = Invoice.buildXml({
  invoiceNumber: "PFA-001",
  issueDate: new Date(),

  seller: {
    registrationName: "Freelancer PFA",
    registrationCode: "12345678",
    vatCode: null, // ← Not VAT registered
    address: { ... },
  },

  buyer: { ... },

  lines: [{
    name: "Consulting services",
    quantity: 1,
    unitPrice: 2000,
    // VAT automatically set to 0 with category 'O'
  }],
});
```

## Allowances & Charges

```typescript
const invoice = Invoice.buildXml({
  invoiceNumber: "INV-001",
  issueDate: new Date(),
  seller: { ... },
  buyer: { ... },
  lines: [{ ... }],

  allowanceCharges: [
    // Document-level discount
    {
      chargeIndicator: false, // false = discount
      reason: "10% loyalty discount",
      reasonCode: "95",
      amount: 100,
      taxCategoryCode: "S",
      vatPercent: 21,
    },
    // Document-level surcharge
    {
      chargeIndicator: true, // true = surcharge
      reason: "Shipping",
      reasonCode: "FC",
      amount: 50,
      taxCategoryCode: "S",
      vatPercent: 21,
    },
  ],
});
```

## InvoiceConfig Reference

### Required Fields

| Field           | Type                 | Description                               |
| --------------- | -------------------- | ----------------------------------------- |
| `invoiceNumber` | `string`             | Invoice number/ID                         |
| `issueDate`     | `Date \| string`     | Issue date                                |
| `seller`        | `Seller`             | Seller info (name, CUI, vatCode, address) |
| `buyer`         | `Buyer`              | Buyer info (name, CUI, address)           |
| `lines`         | `InvoiceLineInput[]` | At least one line item                    |

### Optional Fields

| Field                        | Type                  | Default   | Description                |
| ---------------------------- | --------------------- | --------- | -------------------------- |
| `invoiceSeries`              | `string`              | -         | Invoice prefix             |
| `dueDate`                    | `Date \| string`      | issueDate | Payment due date           |
| `invoiceTypeCode`            | `string`              | `"380"`   | Invoice type               |
| `currencyCode`               | `string`              | `"RON"`   | Currency                   |
| `defaultVatPercent`          | `number`              | `0`       | Default VAT for lines      |
| `note`                       | `string`              | -         | Invoice note               |
| `paymentIban`                | `string`              | -         | Shortcut for bank transfer |
| `paymentMeans`               | `PaymentMeans`        | -         | Full payment config        |
| `paymentTerms`               | `PaymentTerms`        | -         | Payment terms              |
| `buyerReference`             | `string`              | -         | Buyer's reference          |
| `taxPointDate`               | `Date \| string`      | -         | VAT point date             |
| `orderReference`             | `DocumentReference`   | -         | Purchase order ref         |
| `contractReference`          | `DocumentReference`   | -         | Contract ref               |
| `invoicePeriod`              | `InvoicePeriod`       | -         | Billing period             |
| `allowanceCharges`           | `AllowanceCharge[]`   | -         | Discounts/surcharges       |
| `precedingInvoiceReferences` | `DocumentReference[]` | -         | For credit notes           |

### Line Item Fields

| Field             | Type     | Required | Description                     |
| ----------------- | -------- | -------- | ------------------------------- |
| `name`            | `string` | ✓        | Item/service name               |
| `quantity`        | `number` | ✓        | Quantity                        |
| `unitPrice`       | `number` | ✓        | Unit price (excl. VAT)          |
| `vatPercent`      | `number` | -        | VAT % (uses default if omitted) |
| `unitCode`        | `string` | -        | Unit code (default: "EA")       |
| `description`     | `string` | -        | Item description                |
| `sellerItemId`    | `string` | -        | Seller's item code              |
| `taxCategoryCode` | `string` | -        | Tax category (auto-determined)  |

## Utility Functions

```typescript
import {
  formatDate,
  normalizeVatNumber,
  sanitizeCounty,
  sanitizeBucharestSector,
} from "anaf-js";

formatDate(new Date()); // "2024-01-15"
normalizeVatNumber("12345678"); // "RO12345678"
sanitizeCounty("Cluj"); // "RO-CJ"
sanitizeBucharestSector("Sector 1"); // "SECTOR1"
```

## Available Constants

```typescript
import {
  InvoiceTypeCodes,
  TaxCategoryCodes,
  PaymentMeansCodes,
  CommonUnitCodes,
  RomanianCountyCodes,
} from "anaf-js";
```

## License

MIT
