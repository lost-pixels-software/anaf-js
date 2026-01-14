import { EfacturaClient, loadCredentials, hasValidCredentials } from "../src";
import { writeFileSync } from "fs";

// ===========================================================================
// CONFIGURATION
// ===========================================================================
// Replace this with the upload index you want to check
const UPLOAD_INDEX = "5029597395";
const VAT_NUMBER = process.env.ANAF_VAT_NUMBER || "RO12345678";
const TEST_MODE = true;
// ===========================================================================

async function main() {
  console.log("🔍 ANAF e-Factura Status Check\n");

  // Check credentials
  if (!hasValidCredentials()) {
    console.log("❌ No valid credentials found.");
    console.log("   Run 'bun examples/oauth-flow.ts' first to authenticate.");
    return;
  }

  const creds = loadCredentials()!;
  console.log("✅ Credentials loaded\n");

  // Create e-Factura client
  const client = new EfacturaClient({
    vatNumber: VAT_NUMBER,
    testMode: TEST_MODE,
    accessToken: creds.accessToken,
    refreshToken: creds.refreshToken,
    expiresAt: creds.expiresAt,
  });

  console.log(`📋 Checking Upload Index: ${UPLOAD_INDEX}`);
  console.log(`   VAT: ${VAT_NUMBER}`);
  console.log(`   Mode: ${TEST_MODE ? "TEST" : "PRODUCTION"}\n`);

  try {
    const status = await client.getStatusMessage(UPLOAD_INDEX);
    console.log(`   Status: ${status.status}`);

    if (status.errors && status.errors.length > 0) {
      console.log(`   Errors: ${status.errors.join(", ")}`);
    }

    if (status.downloadId) {
      console.log(`   ✅ Download ID: ${status.downloadId}`);
      console.log(`   ⬇️  Downloading document...`);

      const docBuffer = await client.downloadDocument(status.downloadId);
      const filename = `document_${UPLOAD_INDEX}.zip`;

      writeFileSync(filename, Buffer.from(docBuffer));
      console.log(`   ✅ Saved to ${filename}`);
      console.log(`   Size: ${docBuffer.byteLength} bytes`);
    } else {
      console.log("   ⏳ Document is not ready for download yet.");
      console.log("      Try running this script again in a few moments.");
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error}`);
  }

  console.log("\nDone!");
}

main().catch(console.error);
