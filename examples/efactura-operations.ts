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
  MessageFilter,
  type InvoiceConfig,
  sanitizeCity,
  sanitizeCounty,
} from "../src";
import { writeFileSync } from "fs";

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
      registrationName: "Lost Pixels Software SRL",
      registrationCode: "52179481",
      vatCode: "RO52179481",
      address: {
        streetName: "Str. Test",
        cityName: sanitizeCity("Sector 3"),
        countrySubentity: sanitizeCounty("Bucuresti"),
      },
    },
    buyer: {
      registrationName: "Lost Pixels Software SRL",
      registrationCode: "52179481",
      vatCode: "RO52179481",
      address: {
        streetName: "Str. Negru Voda",
        cityName: sanitizeCity("Curtea de Arges"),
        countrySubentity: sanitizeCounty("Arges"),
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
  // Example 3: Paginated Messages
  // =========================================================================
  console.log("\n" + "─".repeat(50));
  console.log("3️⃣  Paginated Messages\n");

  try {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    const paginatedMessages = await client.getMessagesPaginated({
      startTime: sevenDaysAgo,
      endTime: now,
      page: 1,
      filter: MessageFilter.InvoiceSent,
    });

    console.log(`   Total Records: ${paginatedMessages.totalRecords ?? 0}`);
    console.log(`   Total Pages: ${paginatedMessages.totalPages ?? 0}`);
    console.log(`   Current Page: ${paginatedMessages.currentPage ?? 1}`);
    console.log(
      `   Records on Page: ${paginatedMessages.messages?.length ?? 0}`
    );

    if (paginatedMessages.error) {
      console.log(`   ⚠️  ${paginatedMessages.error}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error}`);
  }

  // =========================================================================
  // Example 4: Upload Document
  // =========================================================================
  console.log("\n" + "─".repeat(50));
  console.log("4️⃣  Upload Document\n");

  let uploadIndex: string | undefined;

  try {
    const uploadResult = await client.uploadDocument(xml);
    console.log(`   Status: ${uploadResult.executionStatus}`);
    console.log(`   Upload ID: ${uploadResult.uploadIndex}`);
    uploadIndex = uploadResult.uploadIndex;

    if (uploadResult.uploadIndex) {
      // Check status
      const status = await client.getStatusMessage(uploadResult.uploadIndex);
      console.log(`   Processing: ${status.status}`);

      if (status.downloadId) {
        console.log(`   Download ID: ${status.downloadId}`);
      }
    }

    if (uploadResult.errors && uploadResult.errors.length > 0) {
      console.log(`   Errors: ${uploadResult.errors.join(", ")}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error}`);
  }

  // =========================================================================
  // Example 5: XML to PDF Conversion
  // =========================================================================
  console.log("\n" + "─".repeat(50));
  console.log("5️⃣  XML to PDF Conversion\n");

  try {
    const pdfBuffer = await client.xmlToPdf(xml, "FACT1", false);
    const pdfPath = "./examples/output/invoice.pdf";

    // Ensure output directory exists
    try {
      writeFileSync(pdfPath, Buffer.from(pdfBuffer));
      console.log(`   ✅ PDF saved to ${pdfPath}`);
      console.log(`   Size: ${pdfBuffer.byteLength} bytes`);
    } catch {
      console.log(`   ⚠️ Could not save PDF (directory may not exist)`);
      console.log(`   PDF size: ${pdfBuffer.byteLength} bytes`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error}`);
  }

  // =========================================================================
  // Example 6: Download Document (if available)
  // =========================================================================
  console.log("\n" + "─".repeat(50));
  console.log("6️⃣  Download Document\n");

  try {
    // Use uploadIndex from previous upload if available
    if (uploadIndex) {
      const status = await client.getStatusMessage(uploadIndex);
      if (status.downloadId) {
        const docBuffer = await client.downloadDocument(status.downloadId);
        console.log(`   ✅ Downloaded document`);
        console.log(`   Size: ${docBuffer.byteLength} bytes`);
      } else {
        console.log(
          `   ⏳ Document still processing (status: ${status.status})`
        );
      }
    } else {
      console.log("   ⚠️ No upload ID available from previous step");
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error}`);
  }

  // =========================================================================
  // Example 7: B2C Upload (commented - for reference)
  // =========================================================================
  console.log("\n" + "─".repeat(50));
  console.log("7️⃣  B2C Upload (Reference Only)\n");
  console.log("   // B2C upload is similar to regular upload:");
  console.log("   // const result = await client.uploadB2CDocument(xml);");
  console.log("   // Use for invoices to consumers (no CUI/VAT number)");

  console.log("\n✅ Done!");
}

main().catch(console.error);
