/// <reference types="bun-types" />

/**
 * Example: e-Factura Operations
 *
 * This example shows how to use the e-Factura client for various operations.
 * Requires valid OAuth credentials (run oauth-flow.ts first).
 *
 * Run with: bun examples/efactura-operations.ts
 */

import {
  EfacturaClient,
  Invoice,
  loadCredentials,
  hasValidCredentials,
  AnafAuthenticator,
  MessageFilter,
  type InvoiceConfig,
} from "../src";

// Your company VAT number
const VAT_NUMBER = process.env.ANAF_VAT_NUMBER || "RO12345678";
const TEST_MODE = true; // Use test environment

async function main() {
  console.log("📄 ANAF e-Factura Operations Example\n");

  // Check credentials
  if (!hasValidCredentials()) {
    console.log("❌ No valid credentials found.");
    console.log("   Run 'bun examples/oauth-flow.ts' first to authenticate.");
    return;
  }

  const creds = loadCredentials()!;
  console.log("✅ Credentials loaded from token.secret file\n");

  // Create e-Factura client
  const client = new EfacturaClient({
    vatNumber: VAT_NUMBER,
    testMode: TEST_MODE,
    accessToken: creds.accessToken,
    refreshToken: creds.refreshToken,
    expiresAt: creds.expiresAt,
  });

  console.log(`📋 Using VAT: ${VAT_NUMBER}`);
  console.log(`🔧 Mode: ${TEST_MODE ? "TEST" : "PRODUCTION"}\n`);

  // =========================================================================
  // Example 1: Validate XML
  // =========================================================================
  console.log("─".repeat(50));
  console.log("1️⃣  Validate XML\n");

  const sampleInvoiceConfig: InvoiceConfig = {
    invoiceNumber: "TEST-2024-001",
    issueDate: new Date(),
    seller: {
      registrationName: "Test Seller SRL",
      registrationCode: "12345678",
      vatCode: "RO12345678",
      address: {
        streetName: "Str. Test",
        cityName: "Bucuresti",
        countrySubentity: "RO-B",
      },
    },
    buyer: {
      registrationName: "Test Buyer SRL",
      registrationCode: "87654321",
      vatCode: "RO87654321",
      address: {
        streetName: "Str. Cumparator",
        cityName: "Cluj-Napoca",
        countrySubentity: "RO-CJ",
      },
    },
    lines: [
      {
        name: "Test Service",
        quantity: 1,
        unitPrice: 100,
        vatPercent: 19,
      },
    ],
  };

  const xml = Invoice.buildXml(sampleInvoiceConfig);
  console.log("📝 Generated invoice XML");

  try {
    const validation = await client.validateXml(xml);
    console.log(`   Valid: ${validation.valid ? "✅" : "❌"}`);
    console.log(`   Status: ${validation.status}`);
    if (validation.messages && validation.messages.length > 0) {
      console.log(`   Messages: ${validation.messages.join(", ")}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error}`);
  }

  // =========================================================================
  // Example 2: List Messages
  // =========================================================================
  console.log("\n" + "─".repeat(50));
  console.log("2️⃣  List Messages (last 7 days)\n");

  try {
    const messages = await client.getMessages({
      days: 7,
      filter: MessageFilter.InvoiceSent,
    });

    if (messages.messages && messages.messages.length > 0) {
      console.log(`   Found ${messages.messages.length} messages:`);
      for (const msg of messages.messages.slice(0, 5)) {
        console.log(`   - [${msg.type}] ${msg.details} (${msg.creationDate})`);
      }
    } else {
      console.log("   No messages found");
    }

    if (messages.error) {
      console.log(`   ⚠️  ${messages.error}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error}`);
  }

  // =========================================================================
  // Example 3: Upload Document (commented out by default)
  // =========================================================================
  console.log("\n" + "─".repeat(50));
  console.log("3️⃣  Upload Document (disabled by default)\n");
  console.log("   Uncomment the code below to test upload.");

  /*
  try {
    const uploadResult = await client.uploadDocument(xml);
    console.log(`   Status: ${uploadResult.executionStatus}`);
    console.log(`   Upload ID: ${uploadResult.uploadIndex}`);

    if (uploadResult.uploadIndex) {
      // Check status
      const status = await client.getStatusMessage(uploadResult.uploadIndex);
      console.log(`   Processing: ${status.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error}`);
  }
  */

  console.log("\n✅ Done!");
}

main().catch(console.error);
