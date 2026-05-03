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

The library helps you integrate the Romanian ANAF e-Factura system into your application. From authentication to invoice generation and e-Factura management, it provides a complete set of tools to make the process as simple as possible while staying unopinionated about your architecture.

## Features

- **Invoice XML Generation** — CIUS-RO compliant UBL 2.1 invoices with automatic VAT, totals, and allowance/charge calculations
- **Company Info Lookup** — Public ANAF API (no auth required), single or batch
- **e-Factura API** — Upload, status, download, validation, PDF conversion, message listing
- **Combined Upload Status** — Single call to check status, download the ZIP, and extract ANAF error messages automatically
- **Message Enrichment** — Parse structured fields from ANAF message details and resolve emitter company names via batch lookup
- **OAuth 2.0 Authentication** — Full OAuth flow with automatic token refresh
- **Non-RON Currency Support** — CIUS-RO BR-RO-030 compliant tax currency handling
- **Type-Safe** — Full TypeScript support with strict types throughout

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

// 3. Handle Callback and Save Tokens
app.get("/callback", async (req, res) => {
  const code = req.query.code;

  try {
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
  console.log(company.hqAddress);        // HQ address
  console.log(company.fiscalAddress);    // Fiscal address
  console.log(company.vatRegistration);  // VAT status
  console.log(company.generalData.eFacturaStatus); // e-Factura enrollment
}

// Batch lookup (max 100)
const batch = await client.batchGetCompanyData(["RO123", "RO456"]);
```

#### e-Factura Operations (Requires OAuth)

```typescript
import {
  EfacturaClient,
  AnafAuthenticator,
  Invoice,
  CompanyInfoClient,
  enrichMessagesWithCompanyNames,
  MessageFilter,
} from "anaf-js";

const authenticator = new AnafAuthenticator({
  clientId: process.env.ANAF_CLIENT_ID,
  clientSecret: process.env.ANAF_CLIENT_SECRET,
  redirectUri: "https://myapp.com/callback",
});

const client = new EfacturaClient({
  vatNumber: "RO12345678",
  testMode: true,             // Set to false in production
  accessToken: accessToken,   // From your database after OAuth flow
  refreshToken: refreshToken,
  expiresAt: expiresAt,
  onTokenRefresh: (newCreds) => {
    // Save new tokens to your database when automatically refreshed
    console.log("Tokens refreshed:", newCreds);
  },
}, authenticator);

// Generate and upload an invoice
const xml = Invoice.buildXml({ ... });
const upload = await client.uploadDocument(xml);

// ── Combined status + download + error extraction in one call ──────────────
// getUploadStatus checks the status, downloads the ZIP when ready, and
// automatically extracts ANAF error messages from inside the archive if
// the upload failed.
const result = await client.getUploadStatus(upload.uploadIndex);

if (result.status === "ok") {
  // result.data is the raw ZIP Buffer from ANAF
  console.log("Processed ZIP:", result.data.byteLength, "bytes");
} else if (result.status === "nok") {
  // result.errors includes both the raw XML errors and any message
  // extracted from the ANAF response file inside the ZIP
  console.log("Errors:", result.errors);
} else {
  console.log("Still processing...");
}

// ── List messages ──────────────────────────────────────────────────────────
const messages = await client.getMessages({ days: 7, filter: MessageFilter.InvoiceReceived });

// Every message now includes structured fields parsed from the detalii string:
//   message.uploadIndex  — the upload/request ID (id_incarcare)
//   message.cifEmitent   — sender's CIF
//   message.cifBeneficiar — receiver's CIF
for (const msg of messages.messages ?? []) {
  console.log(msg.type, msg.cifEmitent, msg.uploadIndex);
}

// ── Enrich messages with company names ────────────────────────────────────
// A single batch lookup resolves company names for all emitters at once.
const companyClient = new CompanyInfoClient();
const enriched = await enrichMessagesWithCompanyNames(messages, companyClient);

for (const msg of enriched.messages ?? []) {
  // msg.emitentName is set when the company lookup succeeds
  console.log(`${msg.emitentName ?? msg.cifEmitent} → ${msg.type}`);
}

// ── Validate XML ───────────────────────────────────────────────────────────
const validation = await client.validateXml(xml);

// ── Convert to PDF ─────────────────────────────────────────────────────────
const pdf = await client.xmlToPdf(xml);
```

## Invoice XML Generation

```typescript
import { Invoice } from "anaf-js";

const xml: string = Invoice.buildXml({
  // ═══════════════════════════════════════════════════════════════════════════
  // REQUIRED — TypeScript will error if you forget these
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
      cityName: "Sector 1",        // Sanitized to "SECTOR1" when county is București
      postalZone: "010101",
      countrySubentity: "RO-B",    // Also accepts "Bucuresti", "Cluj", etc.
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
      unitCode: "HUR",   // Optional: defaults to "EA"
      unitPrice: 150,
      vatPercent: 21,    // Optional: uses defaultVatPercent if omitted
    },
    {
      name: "Licență software",
      quantity: 1,
      unitPrice: 500,
      vatPercent: 21,
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // OPTIONAL — Omit any you don't need
  // ═══════════════════════════════════════════════════════════════════════════

  invoiceSeries: "ABC",
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  defaultVatPercent: 21,
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

### `EfacturaClient`

The main client for e-Factura operations.

| Method | Description |
| --- | --- |
| `uploadDocument(xml, options?)` | Upload a UBL/CII/CN invoice XML |
| `uploadB2CDocument(xml, options?)` | Upload a B2C invoice |
| `getUploadStatus(uploadId)` | **Combined**: status + download + automatic error extraction in one call |
| `downloadDocument(downloadId)` | Download the raw ZIP `Buffer` from ANAF |
| `getInvoiceData(downloadId)` | **Combined**: download ZIP + extract XML + parse into JSON in one call |
| `getMessages(params)` | List recent messages (up to 60 days) |
| `getMessagesPaginated(params)` | List messages with date range + pagination |
| `validateXml(xml, standard?)` | Validate XML against ANAF schema (prod only) |
| `xmlToPdf(xml, standard?, validate?)` | Convert XML to PDF (prod only) |

### `CompanyInfoClient`

Client for fetching Romanian company data from the public ANAF API. No authentication required.

| Method | Description |
| --- | --- |
| `getCompanyData(vatCode, date?)` | Get data for a single company |
| `batchGetCompanyData(vatCodes, date?)` | Fetch data for up to 100 companies at once |
| `isValidVatCode(vatCode)` | Validate if a VAT code format is correct |

### `AnafAuthenticator`

Handles the OAuth 2.0 flow with ANAF.

| Method | Description |
| --- | --- |
| `getAuthorizationUrl(settings?)` | Generate the ANAF login URL for the user |
| `exchangeCodeForToken(code)` | Exchange the auth code for access/refresh tokens |
| `refreshAccessToken(refreshToken)` | Manually refresh an expired access token |


### Automatic Token Refresh

The `EfacturaClient` automatically refreshes the access token when it is expired or near expiration (within 1 minute), provided you pass the `authenticator` to the constructor.

To persist the refreshed tokens, use the `onTokenRefresh` callback:

```typescript
const client = new EfacturaClient({
  // ...
  onTokenRefresh: async (newCreds) => {
    // newCreds: { accessToken, refreshToken, expiresAt, tokenType, scope }
    await db.saveUserTokens(newCreds);
  }
}, authenticator);
```

### `enrichMessagesWithCompanyNames(response, companyClient)`

Resolves company names for all message emitters in a single batch lookup. The function is generic and works with both `ListMessagesResponse` and `PaginatedMessagesResponse`. Fails gracefully if the lookup fails — the original response is returned unchanged.

```typescript
import { enrichMessagesWithCompanyNames, CompanyInfoClient } from "anaf-js";

const companyClient = new CompanyInfoClient();
const messages = await efacturaClient.getMessages({ days: 7 });
const enriched = await enrichMessagesWithCompanyNames(messages, companyClient);

// enriched.messages[n].emitentName === "Vodafone Romania SRL"
```

### `parseMessageDetails(detalii)`

Parses the structured fields ANAF embeds inside the `detalii` string of each message. Called automatically by the client — you only need this if you're parsing detalii strings from another source.

```typescript
import { parseMessageDetails } from "anaf-js";

const parsed = parseMessageDetails(
  "Factura cu id_incarcare=6185977462 emisa de cif_emitent=38600525 pentru cif_beneficiar=51218787"
);
// { uploadIndex: "6185977462", cifEmitent: "38600525", cifBeneficiar: "51218787" }
```

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
    vatCode: null, // ← Not VAT registered — PartyTaxScheme is omitted entirely
    address: { ... },
  },

  buyer: { ... },

  lines: [{
    name: "Consulting services",
    quantity: 1,
    unitPrice: 2000,
    // VAT automatically set to 0 with category "O" (not subject to VAT)
  }],
});
```

## Foreign Currency Invoices

When `currencyCode` is not `RON`, the library automatically emits `<cbc:TaxCurrencyCode>RON</cbc:TaxCurrencyCode>` as required by CIUS-RO BR-RO-030. If you also provide `taxCurrencyTaxAmount`, a second `<cac:TaxTotal>` is emitted with the RON-denominated VAT amount (BT-111 / BR-53).

```typescript
const invoice = Invoice.buildXml({
  invoiceNumber: "EUR-001",
  issueDate: new Date(),
  currencyCode: "EUR",

  // Total VAT in RON (you apply the exchange rate)
  // Required by CIUS-RO BR-53 when currencyCode is not RON
  taxCurrencyTaxAmount: 950, // e.g. 190 EUR × 5.0 RON/EUR

  seller: { ... },
  buyer: { ... },
  lines: [{ name: "Service", quantity: 1, unitPrice: 1000, vatPercent: 19 }],
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
  parseMessageDetails,
  enrichMessagesWithCompanyNames,
  roundMoney,
} from "anaf-js";

formatDate(new Date());           // "2024-01-15"
normalizeVatNumber("12345678");   // "RO12345678"
sanitizeCounty("Cluj");           // "RO-CJ"
sanitizeCounty("AG");             // "RO-AG" (Short codes also supported)
sanitizeCity("Sector 1");         // "SECTOR1"
roundMoney(1.005);                // 1.01

### Address Sanitization & Validation

The library automatically sanitizes Romanian addresses to ensure CIUS-RO compliance:
- **Counties**: Converts names ("Arges", "București") or short codes ("AG", "B") to ISO 3166-2:RO format ("RO-AG", "RO-B").
- **Bucharest**: Automatically converts city names like "Sector 1" or "S1" to "SECTOR1" (required format) when the county is Bucharest.
- **Validation**: `Invoice.buildXml` will throw an error if a Romanian address is missing a county or uses an unrecognized one, helping you catch errors before uploading to ANAF.

parseMessageDetails(
  "Factura cu id_incarcare=123 emisa de cif_emitent=456 pentru cif_beneficiar=789"
);
// { uploadIndex: "123", cifEmitent: "456", cifBeneficiar: "789" }
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
