# anaf-js

A TypeScript/JavaScript library for generating **CIUS-RO compliant** UBL 2.1 invoices for the Romanian ANAF e-Factura system.

## Features

- ✅ **CIUS-RO Compliant** - Generates XML invoices that pass ANAF validation
- ✅ **Automatic Calculations** - VAT, totals, and tax subtotals computed automatically
- ✅ **Type-Safe** - TypeScript enforces required fields at compile time
- ✅ **Simple API** - One method: `Invoice.buildXml(config)`
- ✅ **Full Invoice Types** - Commercial invoices, credit notes, self-invoices
- ✅ **VAT Categories** - Standard, zero-rated, exempt, reverse charge
- ✅ **Address Sanitization** - Auto-formats Bucharest sectors and county codes

## Installation

```bash
bun add anaf-js
# or
npm install anaf-js
```

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
      vatPercent: 19, // Optional: uses defaultVatPercent if omitted
    },
    {
      name: "Licență software",
      quantity: 1,
      unitPrice: 500,
      vatPercent: 19,
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // OPTIONAL - Omit any you don't need
  // ═══════════════════════════════════════════════════════════════════════════

  invoiceSeries: "ABC", // Invoice prefix
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  defaultVatPercent: 19, // Default VAT for lines without vatPercent
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
| `S`  | Standard rate (e.g., 19% VAT) |
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
    vatPercent: 19,
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
      vatPercent: 19,
    },
    // Document-level surcharge
    {
      chargeIndicator: true, // true = surcharge
      reason: "Shipping",
      reasonCode: "FC",
      amount: 50,
      taxCategoryCode: "S",
      vatPercent: 19,
    },
  ],
});
```

## InvoiceConfig Reference

### Required Fields

| Field           | Type                 | Description                          |
| --------------- | -------------------- | ------------------------------------ |
| `invoiceNumber` | `string`             | Invoice number/ID                    |
| `issueDate`     | `Date \| string`     | Issue date                           |
| `seller`        | `Seller`             | Seller info (name, CUI, vatCode, address) |
| `buyer`         | `Buyer`              | Buyer info (name, CUI, address)      |
| `lines`         | `InvoiceLineInput[]` | At least one line item               |

### Optional Fields

| Field                        | Type                 | Default      | Description              |
| ---------------------------- | -------------------- | ------------ | ------------------------ |
| `invoiceSeries`              | `string`             | -            | Invoice prefix           |
| `dueDate`                    | `Date \| string`     | issueDate    | Payment due date         |
| `invoiceTypeCode`            | `string`             | `"380"`      | Invoice type             |
| `currencyCode`               | `string`             | `"RON"`      | Currency                 |
| `defaultVatPercent`          | `number`             | `0`          | Default VAT for lines    |
| `note`                       | `string`             | -            | Invoice note             |
| `paymentIban`                | `string`             | -            | Shortcut for bank transfer |
| `paymentMeans`               | `PaymentMeans`       | -            | Full payment config      |
| `paymentTerms`               | `PaymentTerms`       | -            | Payment terms            |
| `buyerReference`             | `string`             | -            | Buyer's reference        |
| `taxPointDate`               | `Date \| string`     | -            | VAT point date           |
| `orderReference`             | `DocumentReference`  | -            | Purchase order ref       |
| `contractReference`          | `DocumentReference`  | -            | Contract ref             |
| `invoicePeriod`              | `InvoicePeriod`      | -            | Billing period           |
| `allowanceCharges`           | `AllowanceCharge[]`  | -            | Discounts/surcharges     |
| `precedingInvoiceReferences` | `DocumentReference[]`| -            | For credit notes         |

### Line Item Fields

| Field             | Type     | Required | Description                    |
| ----------------- | -------- | -------- | ------------------------------ |
| `name`            | `string` | ✓        | Item/service name              |
| `quantity`        | `number` | ✓        | Quantity                       |
| `unitPrice`       | `number` | ✓        | Unit price (excl. VAT)         |
| `vatPercent`      | `number` | -        | VAT % (uses default if omitted)|
| `unitCode`        | `string` | -        | Unit code (default: "EA")      |
| `description`     | `string` | -        | Item description               |
| `sellerItemId`    | `string` | -        | Seller's item code             |
| `taxCategoryCode` | `string` | -        | Tax category (auto-determined) |

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
