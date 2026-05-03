import {
  EfacturaClient,
  AnafAuthenticator,
  CompanyInfoClient,
  Invoice,
  loadCredentials,
  saveCredentials,
  hasValidCredentials,
  UploadStatusValue,
  type InvoiceConfig,
} from "../src";

/**
 * Example: Error Handling & Malformed Documents
 *
 * This example demonstrates how the library handles various error scenarios:
 * 1. Uploading a malformed XML document.
 * 2. Checking status for a non-existent upload index.
 * 3. Handling API errors (like invalid CIF).
 *
 * Run with: bun examples/malformed-invoice.ts
 */

const VAT_NUMBER = process.env.ANAF_VAT_NUMBER || "RO12345678";
const TEST_MODE = true;

// OAuth credentials for token refresh
const CLIENT_ID = process.env.ANAF_CLIENT_ID || "";
const CLIENT_SECRET = process.env.ANAF_CLIENT_SECRET || "";
const REDIRECT_URI =
  process.env.ANAF_REDIRECT_URI || "http://localhost:3000/callback";

async function main() {
  console.log("⚠️ ANAF e-Factura Error Handling Example\n");

  if (!hasValidCredentials()) {
    console.log(
      "❌ No valid credentials found. Run 'bun examples/oauth-flow.ts' first.",
    );
    return;
  }

  const creds = loadCredentials()!;
  const authenticator = new AnafAuthenticator({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    redirectUri: REDIRECT_URI,
  });

  const client = new EfacturaClient(
    {
      vatNumber: VAT_NUMBER,
      testMode: TEST_MODE,
      accessToken: creds.accessToken,
      refreshToken: creds.refreshToken,
      expiresAt: creds.expiresAt,
      onTokenRefresh: (newCreds) => saveCredentials(newCreds),
    },
    authenticator,
  );

  console.log(`📋 Using VAT: ${VAT_NUMBER}`);
  console.log(`🔧 Mode: ${TEST_MODE ? "TEST" : "PRODUCTION"}\n`);

  // ── Scenario 1: Malformed XML Upload ─────────────────────────────────────
  console.log("1️⃣  Uploading Malformed XML...");
  const malformedXml = `<?xml version="1.0" encoding="UTF-8"?>
<NotAnInvoice>
  <Invalid>This is not a valid UBL invoice</Invalid>
</NotAnInvoice>`;

  try {
    const uploadResult = await client.uploadDocument(malformedXml);
    console.log(`   Execution status: ${uploadResult.executionStatus}`);
    console.log(`   Upload ID: ${uploadResult.uploadIndex}`);

    if (uploadResult.errors && uploadResult.errors.length > 0) {
      console.log(`   Upload errors detected in response:`);
      uploadResult.errors.forEach((err, i) =>
        console.log(`     ${i + 1}. ${err}`),
      );
    }

    if (uploadResult.uploadIndex) {
      console.log(`   Checking status for this malformed upload...`);
      const status = await client.getUploadStatus(uploadResult.uploadIndex);
      console.log(`   Status: ${status.status}`);
      if (status.errors && status.errors.length > 0) {
        console.log(`   ANAF Processing Errors:`);
        status.errors.forEach((err, i) => console.log(`     ${i + 1}. ${err}`));
      }
    }
  } catch (error) {
    console.log(`   ❌ Caught Error: ${error}`);
  }

  // ── Scenario 2: Invalid Upload Index ─────────────────────────────────────
  console.log("\n2️⃣  Checking Status for Invalid Upload Index...");
  const invalidIndex = "1234567890"; // Junk ID

  try {
    const status = await client.getUploadStatus(invalidIndex);
    console.log(`   Status: ${status.status}`);
    if (status.errors && status.errors.length > 0) {
      console.log(`   Errors: ${status.errors.join(", ")}`);
    }
  } catch (error) {
    // This will likely trigger an ANAF API Error (400 or 404)
    console.log(`   ❌ Caught Expected Error: ${error}`);
  }

  // ── Scenario 3: Validation of Malformed XML ──────────────────────────────
  console.log("\n3️⃣  Validating Malformed XML...");
  try {
    const validation = await client.validateXml(malformedXml);
    console.log(`   Valid: ${validation.valid ? "✅" : "❌"}`);
    console.log(`   Status: ${validation.status}`);
    if (validation.messages && validation.messages.length > 0) {
      console.log(`   Validation Messages:`);
      validation.messages.forEach((msg, i) =>
        console.log(`     ${i + 1}. ${msg}`),
      );
    }
  } catch (error) {
    console.log(`   ❌ Caught Error: ${error}`);
  }

  // ── Scenario 4: Valid XML but Unauthorized CIF ──────────────────────────
  console.log("\n4️⃣  Uploading Valid XML with Unauthorized CIF...");

  // Generate a schema-perfect XML using the builder, but use a wrong Seller CIF
  const unauthorizedInvoiceConfig: InvoiceConfig = {
    invoiceNumber: "ERR-" + Math.floor(Math.random() * 1000000),
    issueDate: new Date(),
    seller: {
      registrationName: "Wrong Company SRL",
      registrationCode: "99999999",
      vatCode: "RO99999999", // This CIF won't match your authorized VAT_NUMBER
      address: {
        streetName: "Strada Eroare",
        cityName: "Bucuresti",
        countrySubentity: "Bucuresti",
      },
    },
    buyer: {
      registrationName: "Test Buyer SRL",
      registrationCode: "52179481",
      vatCode: "RO52179481",
      address: {
        streetName: "Strada Client",
        cityName: "Curtea de Arges",
        countrySubentity: "Arges",
      },
    },
    lines: [
      {
        name: "Testing Service",
        quantity: 1,
        unitPrice: 100,
        vatPercent: 19,
      },
    ],
  };

  const validXmlWrongCif = Invoice.buildXml(unauthorizedInvoiceConfig);

  try {
    console.log("   Uploading valid XML but with seller CIF RO99999999...");
    const uploadResult = await client.uploadDocument(validXmlWrongCif);

    console.log(`   Execution status: ${uploadResult.executionStatus}`);

    if (uploadResult.uploadIndex) {
      console.log(`   Upload ID: ${uploadResult.uploadIndex}`);
      console.log(`   Check the upload id with the status example.`);
    } else if (uploadResult.errors) {
      console.log(`   Upload rejected immediately:`);
      uploadResult.errors.forEach((err, i) =>
        console.log(`     ${i + 1}. ${err}`),
      );
    }
  } catch (error) {
    console.log(`   ❌ Caught Error: ${error}`);
  }

  console.log("\nDone!");
}

main().catch(console.error);
