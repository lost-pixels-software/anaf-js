import {
  EfacturaClient,
  AnafAuthenticator,
  loadCredentials,
  hasValidCredentials,
  saveCredentials,
} from "../src";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

// ===========================================================================
// CONFIGURATION
// ===========================================================================
// Replace this with the upload index you want to check
// const UPLOAD_INDEX = "5032650150";
const UPLOAD_INDEX = "5032853961";

const VAT_NUMBER = process.env.ANAF_VAT_NUMBER || "RO12345678";
const TEST_MODE = true;

// OAuth credentials for token refresh
const CLIENT_ID = process.env.ANAF_CLIENT_ID || "";
const CLIENT_SECRET = process.env.ANAF_CLIENT_SECRET || "";
const REDIRECT_URI =
  process.env.ANAF_REDIRECT_URI || "http://localhost:3000/callback";
// ===========================================================================

async function main() {
  console.log("🔍 ANAF e-Factura Status Check\n");

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
    return;
  }

  const creds = loadCredentials()!;
  console.log("✅ Credentials loaded\n");

  // Create authenticator for token refresh
  const authenticator = new AnafAuthenticator({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    redirectUri: REDIRECT_URI,
  });

  // Create e-Factura client with authenticator
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

  // ── Part 1: Check upload status of a sent invoice ────────────────────────
  console.log(`📋 Checking Upload Index: ${UPLOAD_INDEX}`);
  console.log(`   VAT: ${VAT_NUMBER}`);
  console.log(`   Mode: ${TEST_MODE ? "TEST" : "PRODUCTION"}\n`);

  let statusResult;
  try {
    // getUploadStatus is a higher-level method that also downloads the result ZIP
    // and extracts detailed errors from it if the status is "nok" (failed).
    statusResult = await client.getUploadStatus(UPLOAD_INDEX);
    console.log(`   Status: ${statusResult.status}`);

    if (statusResult.errors && statusResult.errors.length > 0) {
      console.log(`   Errors Found:`);
      statusResult.errors.forEach((err, i) => console.log(`     ${i + 1}. ${err}`));
    }

    if (statusResult.status === "in prelucrare") {
      console.log("   ⏳ Document is still processing. Try again in a few seconds.");
    } else if (statusResult.data) {
      // getUploadStatus already downloaded the buffer for us
      const docBuffer = statusResult.data;
      console.log(`   ✅ Download ID: ${statusResult.downloadId}`);
      
      const outputDir = join(process.cwd(), "downloads");
      mkdirSync(outputDir, { recursive: true });

      const filename = `document_${UPLOAD_INDEX}.zip`;
      const filePath = join(outputDir, filename);

      writeFileSync(filePath, Buffer.from(docBuffer));
      console.log(`   ✅ Saved to ${filePath}`);
      console.log(`   Size: ${docBuffer.byteLength} bytes`);
    } else if (statusResult.status === "nok" && !statusResult.downloadId) {
      console.log("   ❌ Document failed with no download ID available.");
    }
  } catch (error) {
    console.log(`   ❌ Error checking status: ${error}`);
  }

  // ── Part 2: Parse a received invoice directly into JSON ──────────────────
  const idToParse =
    statusResult?.status === "ok" ? statusResult.downloadId : null;

  if (idToParse) {
    console.log("\n📥 Invoice Parsing (JSON)\n");
    console.log(
      `   ID: ${idToParse}${idToParse === statusResult?.downloadId ? " (from current upload)" : ""}`,
    );

    try {
      const invoice = await client.getInvoiceData(idToParse);

      console.log(`   ✅ Invoice parsed successfully\n`);
      console.log(`   Invoice ID:        ${invoice.invoiceId}`);
      console.log(`   Issue Date:        ${invoice.issueDate}`);
      console.log(`   Due Date:          ${invoice.dueDate}`);
      console.log(`   Currency:          ${invoice.currency}`);
      console.log(`   Type:              ${invoice.invoiceTypeCode}`);
      console.log(`   Lines:             ${invoice.lineCount}`);
      console.log();
      console.log(`   Seller:            ${invoice.seller?.registrationName}`);
      console.log(`   Seller CIF:        ${invoice.seller?.registrationCode}`);
      console.log(`   Seller VAT:        ${invoice.seller?.vatCode}`);
      console.log();
      console.log(`   Buyer:             ${invoice.buyer?.registrationName}`);
      console.log(`   Buyer CIF:         ${invoice.buyer?.registrationCode}`);
      console.log(`   Buyer VAT:         ${invoice.buyer?.vatCode}`);
      console.log();

      if (invoice.monetaryTotal) {
        console.log(
          `   Line Total:        ${invoice.monetaryTotal.lineExtensionAmount}`,
        );
        console.log(
          `   Tax Exclusive:     ${invoice.monetaryTotal.taxExclusiveAmount}`,
        );
        console.log(
          `   Tax Inclusive:     ${invoice.monetaryTotal.taxInclusiveAmount}`,
        );
        console.log(
          `   Payable:           ${invoice.monetaryTotal.payableAmount}`,
        );
      }

      if (invoice.lines && invoice.lines.length > 0) {
        console.log("\n   Line Items:");
        for (const line of invoice.lines) {
          console.log(
            `     - ${line.name} | Qty: ${line.quantity} ${line.unitCode} | ` +
              `Price: ${line.unitPrice} | VAT: ${line.vatPercent}% | ` +
              `Total: ${line.lineExtensionAmount}`,
          );
        }
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error}`);
    }
  } else {
    console.log(
      "\n💡 Tip: Set RECEIVED_INVOICE_DOWNLOAD_ID to try parsing a received invoice.",
    );
    console.log(
      "   You can get a download ID from client.getMessages({ days: 7 }).",
    );
  }

  // ── Part 3: List messages from the last 7 days ───────────────────────────
  console.log("\n📋 Recent Messages (Last 7 Days)\n");

  try {
    const messages = await client.getMessages({ days: 7 });

    if (messages.messages && messages.messages.length > 0) {
      console.log(`   Found ${messages.messages.length} messages:`);
      for (const msg of messages.messages) {
        console.log(
          `   - [${msg.type}] ID: ${msg.id} | Date: ${msg.creationDate} | Index: ${msg.uploadIndex ?? "N/A"}`,
        );
      }
    } else {
      console.log("   No messages found in the last 7 days.");
    }
  } catch (error) {
    console.log(`   ❌ Failed to fetch messages: ${error}`);
  }

  console.log("\nDone!");
}

main().catch(console.error);
