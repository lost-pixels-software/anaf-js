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
  AnafAuthenticator,
  CompanyInfoClient,
  Invoice,
  loadCredentials,
  saveCredentials,
  hasValidCredentials,
  enrichMessagesWithCompanyNames,
  MessageFilter,
  UploadStatusValue,
  type InvoiceConfig,
} from "../src";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

// Your OAuth credentials from ANAF SPV
const CLIENT_ID = process.env.ANAF_CLIENT_ID || "";
const CLIENT_SECRET = process.env.ANAF_CLIENT_SECRET || "";
const REDIRECT_URI =
  process.env.ANAF_REDIRECT_URI || "http://localhost:3000/callback";

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

  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.log(
      "❌ Missing ANAF_CLIENT_ID or ANAF_CLIENT_SECRET env variables.",
    );
    console.log("   These are required for automatic token refresh.");
    return;
  }

  const creds = loadCredentials()!;
  console.log("✅ Credentials loaded from token.secret file\n");

  // Create authenticator for token refresh
  const authenticator = new AnafAuthenticator({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    redirectUri: REDIRECT_URI,
  });

  // Create e-Factura client
  const client = new EfacturaClient(
    {
      vatNumber: VAT_NUMBER,
      testMode: TEST_MODE,
      accessToken: creds.accessToken,
      refreshToken: creds.refreshToken,
      expiresAt: creds.expiresAt,
      onTokenRefresh: (newCreds) => {
        saveCredentials(newCreds);
      },
    },
    authenticator,
  );

  // Company client for enriching messages with emitter names (no auth required)
  const companyClient = new CompanyInfoClient();

  console.log(`📋 Using VAT: ${VAT_NUMBER}`);
  console.log(`🔧 Mode: ${TEST_MODE ? "TEST" : "PRODUCTION"}\n`);

  // =========================================================================
  // Example 1: Generate invoice XML
  // =========================================================================
  console.log("─".repeat(50));
  console.log("1️⃣  Generate Invoice XML\n");

  const sampleInvoiceConfig: InvoiceConfig = {
    invoiceNumber: "TEST-2024-001",
    issueDate: new Date(),
    seller: {
      registrationName: "Lost Pixels Software SRL",
      registrationCode: "52179481",
      vatCode: "RO52179481",
      address: {
        streetName: "Str. Test",
        cityName: "Sector 3",
        countrySubentity: "Bucuresti",
      },
    },
    buyer: {
      registrationName: "Lost Pixels Software SRL",
      registrationCode: "52179481",
      vatCode: "RO52179481",
      address: {
        streetName: "Str. Negru Voda",
        cityName: "Curtea de Arges",
        countrySubentity: "Arges",
      },
    },
    lines: [
      {
        name: "Test",
        quantity: 1,
        unitPrice: 100,
        vatPercent: 21,
      },
    ],
  };

  const xml = Invoice.buildXml(sampleInvoiceConfig);
  console.log("   ✅ Generated invoice XML");
  console.log(`   Size: ${xml.length} characters`);

  // =========================================================================
  // Example 2: Validate XML
  // =========================================================================
  console.log("\n" + "─".repeat(50));
  console.log("2️⃣  Validate XML\n");

  try {
    const validation = await client.validateXml(xml);
    console.log(`   Valid: ${validation.valid ? "✅" : "❌"}`);
    console.log(`   Status: ${validation.status}`);
    if (validation.messages && validation.messages.length > 0) {
      console.log(`   Messages: ${validation.messages.join(", ")}`);
    }
    if (validation.traceId) {
      console.log(`   Trace ID: ${validation.traceId}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error}`);
  }

  // =========================================================================
  // Example 3: Upload + combined status flow
  // =========================================================================
  console.log("\n" + "─".repeat(50));
  console.log("3️⃣  Upload Document + getUploadStatus\n");

  try {
    // 1. Upload
    const uploadResult = await client.uploadDocument(xml);
    console.log(`   Execution status: ${uploadResult.executionStatus}`);
    console.log(`   Upload ID: ${uploadResult.uploadIndex}`);

    if (uploadResult.errors && uploadResult.errors.length > 0) {
      console.log(`   Upload errors: ${uploadResult.errors.join(", ")}`);
    }

    if (uploadResult.uploadIndex) {
      // 2. Combined status + download + error extraction in one call.
      //    - If still processing: returns { status: "in prelucrare", data: undefined }
      //    - If ok:  returns { status: "ok",  data: Buffer (ZIP) }
      //    - If nok: returns { status: "nok", data: Buffer (ZIP), errors: [...] }
      //      with error messages already extracted from the ANAF response XML
      //      inside the archive.
      const result = await client.getUploadStatus(uploadResult.uploadIndex);

      console.log(`   Processing status: ${result.status}`);

      if (result.status === UploadStatusValue.Ok) {
        console.log(`   ✅ Processed — ZIP: ${result.data?.byteLength} bytes`);
      } else if (result.status === UploadStatusValue.Failed) {
        console.log(`   ❌ Failed`);
        if (result.errors && result.errors.length > 0) {
          console.log(`   ANAF errors:`);
          for (const err of result.errors) {
            console.log(`     • ${err}`);
          }
        }
      } else {
        // UploadStatusValue.InProgress — poll again later
        console.log(`   ⏳ Still processing — poll again in a few seconds`);
      }
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error}`);
  }

  // =========================================================================
  // Example 4: List messages + detalii parsing
  // =========================================================================
  console.log("\n" + "─".repeat(50));
  console.log("4️⃣  List Messages (last 7 days) + structured fields\n");

  try {
    const messages = await client.getMessages({
      days: 7,
      filter: MessageFilter.InvoiceReceived,
    });

    if (messages.messages && messages.messages.length > 0) {
      console.log(`   Found ${messages.messages.length} messages:`);
      for (const msg of messages.messages.slice(0, 5)) {
        // uploadIndex, cifEmitent, cifBeneficiar are parsed automatically
        // from the raw detalii string — no extra calls needed.
        console.log(
          `   - [${msg.type}] uploadIndex=${msg.uploadIndex ?? "—"} ` +
            `emitent=${msg.cifEmitent ?? "—"} beneficiar=${msg.cifBeneficiar ?? "—"} ` +
            `(${msg.creationDate})`,
        );
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
  // Example 5: Enrich messages with company names
  // =========================================================================
  console.log("\n" + "─".repeat(50));
  console.log("5️⃣  Message Enrichment (company names)\n");

  try {
    const messages = await client.getMessages({
      days: 7,
      filter: MessageFilter.InvoiceReceived,
    });

    // A single batch lookup resolves all emitter CIFs to company names.
    // If the lookup fails for any reason the original response is returned
    // unchanged — no error is thrown.
    const enriched = await enrichMessagesWithCompanyNames(
      messages,
      companyClient,
    );

    if (enriched.messages && enriched.messages.length > 0) {
      console.log(`   Enriched ${enriched.messages.length} messages:`);
      for (const msg of enriched.messages.slice(0, 5)) {
        const emitter = msg.emitentName ?? msg.cifEmitent ?? "unknown";
        console.log(`   - [${msg.type}] from: ${emitter}`);
      }
    } else {
      console.log("   No messages to enrich");
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error}`);
  }

  // =========================================================================
  // Example 6: Paginated messages
  // =========================================================================
  console.log("\n" + "─".repeat(50));
  console.log("6️⃣  Paginated Messages\n");

  try {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    const paginatedMessages = await client.getMessagesPaginated({
      startTime: sevenDaysAgo,
      endTime: now,
      page: 1,
      filter: MessageFilter.InvoiceSent,
    });

    console.log(`   Total records: ${paginatedMessages.totalRecords ?? 0}`);
    console.log(`   Total pages:   ${paginatedMessages.totalPages ?? 0}`);
    console.log(`   Current page:  ${paginatedMessages.currentPage ?? 1}`);
    console.log(`   On this page:  ${paginatedMessages.messages?.length ?? 0}`);

    if (paginatedMessages.error) {
      console.log(`   ⚠️  ${paginatedMessages.error}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error}`);
  }

  // =========================================================================
  // Example 7: XML to PDF conversion
  // =========================================================================
  console.log("\n" + "─".repeat(50));
  console.log("7️⃣  XML to PDF Conversion\n");

  try {
    const pdfBuffer = await client.xmlToPdf(xml, "FACT1", false);
    const outputDir = join(process.cwd(), "downloads");
    mkdirSync(outputDir, { recursive: true });
    const pdfPath = join(outputDir, "invoice.pdf");

    try {
      writeFileSync(pdfPath, Buffer.from(pdfBuffer));
      console.log(`   ✅ PDF saved to ${pdfPath}`);
      console.log(`   Size: ${pdfBuffer.byteLength} bytes`);
    } catch {
      console.log(`   ⚠️  Could not save PDF (output directory may not exist)`);
      console.log(`   PDF size: ${pdfBuffer.byteLength} bytes`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error}`);
  }

  console.log("\n✅ Done!");
}

main().catch(console.error);
