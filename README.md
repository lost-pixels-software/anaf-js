# anaf-efactura

A TypeScript/JavaScript library for generating **CIUS-RO compliant** UBL 2.1 invoices for the Romanian ANAF e-Factura system.

## Features

- ✅ **CIUS-RO Compliant** - Generates XML invoices that pass ANAF validation
- ✅ **Automatic Calculations** - VAT, totals, and tax subtotals computed automatically
- ✅ **Flexible API** - Simple one-liner or detailed builder pattern
- ✅ **Full Invoice Types** - Commercial invoices, credit notes, self-invoices
- ✅ **VAT Categories** - Standard, zero-rated, exempt, reverse charge
- ✅ **Address Sanitization** - Auto-formats Bucharest sectors and county codes
- ✅ **TypeScript First** - Full type safety and IntelliSense support
- ✅ **Works in JS & TS** - ESM and CommonJS exports

## Installation

```bash
npm install anaf-efactura
# or
bun add anaf-efactura
# or
yarn add anaf-efactura
```

## Quick Start

### Simple Invoice (Automatic Calculations)

```typescript
import { Invoice } from "anaf-efactura";

const invoice = Invoice.fromSimpleInput({
  invoiceNumber: "INV-2024-001",
  invoiceSeries: "ABC",
  issueDate: new Date(),
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days

  seller: {
    registrationName: "Furnizor S.R.L.",
    registrationCode: "12345678",
    vatCode: "RO12345678",
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
      unitCode: "HUR", // Hours
      unitPrice: 150,
      vatPercent: 19,
    },
    {
      name: "Licență software",
      quantity: 1,
      unitPrice: 500,
      vatPercent: 19,
    },
  ],

  paymentIban: "RO49AAAA1B31007593840000",
});

const xml = invoice.generateXml();
console.log(xml);
```

### Builder Pattern (Full Control)

```typescript
import { Invoice } from "anaf-efactura";

const invoice = new Invoice()
  .setGeneralData({
    invoiceSeries: "TS",
    invoiceNumber: "2024-001",
    issueDate: new Date(),
    dueDate: new Date(),
    invoiceTypeCode: "380", // Commercial invoice
    note: "Mulțumim pentru colaborare!",
  })
  .setSeller({
    registrationName: "Tech Solutions S.R.L.",
    registrationCode: "11223344",
    vatCode: "RO11223344",
    registrationNumber: "J40/789/2018",
    legalFormData: "Capital social: 10.000 LEI",
    address: {
      streetName: "Calea Victoriei 100",
      cityName: "SECTOR1",
      postalZone: "010271",
      countrySubentity: "RO-B",
    },
  })
  .setBuyer({
    registrationName: "Client Premium S.R.L.",
    registrationCode: "99887766",
    vatCode: "RO99887766",
    address: {
      streetName: "Strada Business 42",
      cityName: "Timișoara",
      postalZone: "300001",
      countrySubentity: "RO-TM",
    },
  })
  .setPaymentMeans({
    paymentMeansCode: "30",
    bankTransfer: {
      accountId: "RO49AAAA1B31007593840000",
      accountName: "Tech Solutions S.R.L.",
      bankId: "BTRLRO22",
    },
  })
  .addLine({
    name: "Software Development",
    quantity: 160,
    unitCode: "HUR",
    unitPrice: 75,
    vatPercent: 19,
  });

const xml = invoice.generateXml();
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
| `S`  | Standard rate (e.g., 19% VAT) |
| `Z`  | Zero rated                    |
| `E`  | Exempt from VAT               |
| `AE` | VAT Reverse Charge            |
| `K`  | Intra-community (EU export)   |
| `G`  | Free export                   |
| `O`  | Not subject to VAT            |

## Credit Notes

```typescript
const creditNote = new Invoice()
  .setGeneralData({
    invoiceNumber: 'CN-001',
    issueDate: new Date(),
    invoiceTypeCode: '381', // Credit note
  })
  .setSeller({ ... })
  .setBuyer({ ... })
  .addPrecedingInvoiceReference({
    id: 'INV-2024-001',
    issueDate: new Date('2024-01-01'),
  })
  .addLine({
    name: 'Returned product',
    quantity: -1, // Negative for credits
    unitPrice: 500,
    vatPercent: 19,
  });
```

## Non-VAT Payer Invoices

```typescript
const invoice = Invoice.fromSimpleInput({
  invoiceNumber: 'PFA-001',
  issueDate: new Date(),
  seller: {
    registrationName: 'Freelancer PFA',
    registrationCode: '12345678',
    vatCode: null, // ← Not VAT registered
    address: { ... },
  },
  buyer: { ... },
  lines: [
    {
      name: 'Consulting services',
      quantity: 1,
      unitPrice: 2000,
      // VAT will automatically be set to 0 with category 'O'
    },
  ],
});
```

## Allowances & Charges

```typescript
const invoice = new Invoice()
  .setGeneralData({ ... })
  .setSeller({ ... })
  .setBuyer({ ... })
  .addLine({ ... })
  // Document-level discount
  .addAllowanceCharge({
    chargeIndicator: false, // false = allowance (discount)
    reason: '10% loyalty discount',
    reasonCode: '95',
    amount: 100,
    taxCategoryCode: 'S',
    vatPercent: 19,
  })
  // Document-level charge (shipping)
  .addAllowanceCharge({
    chargeIndicator: true, // true = charge
    reason: 'Shipping',
    reasonCode: 'FC',
    amount: 50,
    taxCategoryCode: 'S',
    vatPercent: 19,
  });
```

## Manual Override

For edge cases where you need full control over calculations:

```typescript
const invoice = new Invoice()
  .setGeneralData({ ... })
  .setSeller({ ... })
  .setBuyer({ ... })
  .setLines([...])
  // Override automatic tax calculations
  .overrideTaxTotal({
    taxAmount: 190.00,
    taxSubtotals: [
      {
        categoryId: 'S',
        taxSchemeId: 'VAT',
        taxPercent: 19,
        taxableAmount: 1000.00,
        taxAmount: 190.00,
      },
    ],
  })
  // Override automatic monetary totals
  .overrideMonetaryTotals({
    lineExtensionAmount: 1000.00,
    taxExclusiveAmount: 1000.00,
    taxInclusiveAmount: 1190.00,
    payableAmount: 1190.00,
  });
```

## Utility Functions

```typescript
import {
  formatDate,
  normalizeVatNumber,
  sanitizeCounty,
  sanitizeBucharestSector,
} from "anaf-efactura";

formatDate(new Date()); // '2024-01-15'
normalizeVatNumber("12345678"); // 'RO12345678'
sanitizeCounty("Cluj"); // 'RO-CJ'
sanitizeBucharestSector("Sector 1"); // 'SECTOR1'
```

## Available Codes

```typescript
import {
  InvoiceTypeCodes,
  TaxCategoryCodes,
  PaymentMeansCodes,
  CommonUnitCodes,
  RomanianCountyCodes,
} from "anaf-efactura";
```

## JavaScript Usage

Works with CommonJS:

```javascript
const { Invoice } = require("anaf-efactura");

const invoice = Invoice.fromSimpleInput({
  invoiceNumber: "INV-001",
  issueDate: new Date(),
  // ...
});

const xml = invoice.generateXml();
```

## API Reference

### Invoice Class

#### Static Methods

- `Invoice.fromSimpleInput(input)` - Create invoice from simple input object

#### Builder Methods

- `.setGeneralData(data)` - Set invoice metadata
- `.setSeller(seller)` - Set seller/supplier information
- `.setBuyer(buyer)` - Set buyer/customer information
- `.setLines(lines)` / `.addLine(line)` - Set/add invoice lines
- `.setPaymentMeans(payment)` - Set payment information
- `.setPaymentTerms(terms)` - Set payment terms
- `.setAllowanceCharges(charges)` / `.addAllowanceCharge(charge)` - Set/add discounts or charges
- `.setPrecedingInvoiceReferences(refs)` / `.addPrecedingInvoiceReference(ref)` - For credit notes
- `.setDefaultVatPercent(percent)` - Default VAT for lines without explicit VAT

#### Override Methods

- `.overrideTaxTotal(taxTotal)` - Override automatic tax calculations
- `.overrideMonetaryTotals(totals)` - Override automatic totals

#### Output Methods

- `.generateXml()` - Generate UBL 2.1 XML string
- `.getInvoiceData()` - Get computed invoice data object
- `.getComputedLines()` - Get computed line items
- `.getTaxTotal()` - Get computed tax totals
- `.getMonetaryTotals()` - Get computed monetary totals

## License

MIT
