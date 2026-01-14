<!-- ![anaf-js hero](./assets/anaf-js-hero.png) -->
<p align="center">
<img src="./assets/anaf-js-hero.png" alt="anaf-js hero" width="600">
</p>

<h3 align="center">anaf-js</h3>

<p align="center">A comprehensive TypeScript library for the Romanian ANAF e-Factura system.</p>

<p align="center">
  <img alt="Static Badge" src="https://img.shields.io/badge/license-MIT-green">
  <img alt="Static Badge" src="https://img.shields.io/badge/PRs-welcome-blue">
</p>

## About the project

The library helps you integrate the Romanian ANAF e-Factura system into your application. From authentication to invoice generation and eFactura management, it provides a set of tools to make the process as simple as possible. We've tried to make it as complete and as easy to use as possible but also unopinionated.

## Features

- **Invoice XML Generation** - CIUS-RO compliant UBL 2.1 invoices
- **Company Info Lookup** - Public ANAF API (no auth required)
- **e-Factura API** - Upload, download, validate, messages
- **OAuth 2.0 Authentication** - Full OAuth flow support
- **Type-Safe** - Full TypeScript support

## Installation

```bash
bun add anaf-js
# or
npm install anaf-js
```

## Usage

#### How to integrate ANAF OAuth in your app

To integrate ANAF OAuth into your own application, you'll need to handle the redirect and callback steps manually.

```typescript
import { AnafAuthenticator } from "anaf-js";

// 1. Initialize Authenticator
const auth = new AnafAuthenticator({
  clientId: process.env.ANAF_CLIENT_ID,
  clientSecret: process.env.ANAF_CLIENT_SECRET,
  redirectUri: "https://myapp.com/callback", // Must match the redirect URI in your ANAF account
});

// 2. Redirect User to ANAF Login
const url = auth.getAuthorizationUrl();
// Use this url to redirect the user to ANAF's login page
// He will be prompted to login with the usb stick

// 3. Handle Callback and Save Tokens
app.get("/callback", async (req, res) => {
  const code = req.query.code; // Get 'code' from query parameters

  try {
    // Exchange the authorization code for access tokens
    const tokens = await auth.exchangeCodeForToken(code);

    // Save tokens securely (e.g., in your database)
    await db.saveUserTokens(tokens);

    res.send("Authenticated successfully!");
  } catch (error) {
    console.error("Auth failed:", error);
    res.status(500).send("Authentication failed");
  }
});
```

#### Company Info Lookup (No Auth Required)

```typescript
import { CompanyInfoClient } from "anaf-js";

const client = new CompanyInfoClient();

// Single company
const result = await client.getCompanyData("RO12345678");

if (result.success && result.data) {
  const company = result.data;
  console.log(company.generalData.companyName);
  console.log(company.hqAddress); // HQ address
  console.log(company.fiscalAddress); // Fiscal address
  console.log(company.vatRegistration); // VAT status
  console.log(company.generalData.eFacturaStatus); // e-Factura enrollment
}

// Batch lookup (max 100)
const batch = await client.batchGetCompanyData(["RO123", "RO456"]);
```

#### e-Factura Operations (Requires OAuth)

```typescript
import { EfacturaClient, AnafAuthenticator, Invoice, loadCredentials } from "anaf-js";

// Create authenticator for automatic token refresh
const authenticator = new AnafAuthenticator({
  clientId: process.env.ANAF_CLIENT_ID,
  clientSecret: process.env.ANAF_CLIENT_SECRET,
  redirectUri: "https://myapp.com/callback",
});

// Create client - authenticator is required for automatic token refresh
const client = new EfacturaClient({
  vatNumber: "RO12345678",
  // Recommended to set to true in development
  testMode: true,
  // You should get these credentials from your database after the auth flow
  accessToken: accessToken,
  refreshToken: refreshToken,
}, authenticator);

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

## Invoice XML Generation

```typescript
import { Invoice } from "anaf-js";

const xml: string = Invoice.buildXml({
  // ═══════════════════════════════════════════════════════════════════════════
  // REQUIRED - TypeScript will error if you forget these
  // ═══════════════════════════════════════════════════════════════════════════

  invoiceNumber: "2024-001",
  issueDate: new Date(),

  seller: {
    registrationName: "Furnizor S.R.L.",
    registrationCode: "12345678",
    vatCode: "RO12345678",
    registrationNumber: "J40/123/2020",
    legalFormData: "Capital social: 200 LEI",
    address: {
      streetName: "Strada Exemplu 10",
      cityName: "Sector 1", // This gets sanitized to "SECTOR1" if București is the region
      postalZone: "010101", // Optional
      countrySubentity: "RO-B", // Works with Bucuresti also because it gets sanitized to "RO-B" automatically
    },
  },

  buyer: {
    registrationName: "Client S.A.",
    registrationCode: "87654321",
    vatCode: "RO87654321",
    address: {
      streetName: "Bulevardul Client 25",
      cityName: "Cluj-Napoca",
      postalZone: "400001", // Optional
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
  invoiceTypeCode: "380",             // Default: Commercial Invoice
  currencyCode: "RON",                // Default: RON
  buyerReference: "PO-2024-001",
  taxPointDate: new Date(),
  orderReference: { id: "PO-001" },
  contractReference: { id: "CONTRACT-001" },
  invoicePeriod: { startDate: "2024-01-01", endDate: "2024-01-31" },
  paymentTerms: { note: "Payment within 30 days" },
  paymentMeans: { ... },              // Full payment config (alternative to paymentIban)
  allowanceCharges: [...],            // Document-level discounts/surcharges
  precedingInvoiceReferences: [...],  // Required for credit notes
});
```

## API

### `Invoice.buildXml(config: InvoiceConfig)`

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

## Utility Functions

```typescript
import {
  formatDate,
  normalizeVatNumber,
  sanitizeCounty,
  sanitizeCity,
} from "anaf-js";

formatDate(new Date()); // "2024-01-15"
normalizeVatNumber("12345678"); // "RO12345678"
sanitizeCounty("Cluj"); // "RO-CJ"
sanitizeCity("Sector 1"); // "SECTOR1"
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

#### Local Testing Helper

For quick local testing or CLI tools, the library exports an optional internal server `runOAuthFlow` (which uses Bun's HTTP server) to handle the callback for you automatically.

When testing locally, the internal OAuth server listens on `localhost:3000` by default. However, ANAF requires a public HTTPS URL for redirects.

You do **not** need to change the local server configuration. Instead:

1. Use a tool like **ngrok** to forward traffic: `ngrok http 3000`.
2. Set the `ANAF_REDIRECT_URI` in your `.env` (and in the ANAF portal) to your ngrok URL (e.g., `https://xxxx.ngrok-free.app/callback`).
3. The internal server will automatically handle the callback on `localhost:3000`.

## Inspiration

This project takes inspiration from the following open-source projects:

- [efactura-anaf-ts-sdk](https://github.com/florin-szilagyi/efactura-anaf-ts-sdk)
- [anaf-php](https://github.com/andalisolutions/anaf-php)

## License

MIT
