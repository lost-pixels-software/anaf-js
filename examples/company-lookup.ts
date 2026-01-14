/**
 * Example: Company Info Lookup
 *
 * This example shows how to look up company information from ANAF.
 * No authentication required - this uses the public API.
 *
 * Run with: bun examples/company-lookup.ts
 */

import { CompanyInfoClient } from "../src";

async function main() {
  const client = new CompanyInfoClient();

  // Single company lookup
  console.log("🔍 Looking up company RO18189442...\n");

  const result = await client.getCompanyData("RO18189442");

  if (result.success && result.data) {
    const company = result.data[0];

    console.log("✅ Company found:\n");
    console.log("📋 General Data:");
    console.log(`   Name: ${company.generalData.companyName}`);
    console.log(`   CUI: ${company.generalData.taxId}`);
    console.log(`   Reg. Number: ${company.generalData.registrationNumber}`);
    console.log(`   Activity Code: ${company.generalData.activityCode}`);
    console.log(
      `   e-Factura: ${
        company.generalData.eFacturaStatus ? "✅ Enrolled" : "❌ Not enrolled"
      }`
    );

    console.log("\n🏢 HQ Address:");
    console.log(`   ${company.hqAddress.street} ${company.hqAddress.number}`);
    console.log(`   ${company.hqAddress.city}, ${company.hqAddress.county}`);
    if (company.hqAddress.details) {
      console.log(`   ${company.hqAddress.details}`);
    }

    console.log("\n💼 VAT Status:");
    console.log(
      `   VAT Payer: ${company.vatRegistration.status ? "Yes" : "No"}`
    );
    console.log(`   Inactive: ${company.inactiveState.status ? "Yes" : "No"}`);
    console.log(`   Split VAT: ${company.splitVat.status ? "Yes" : "No"}`);
  } else {
    console.log("❌ Company not found:", result.error);
  }

  // Batch lookup example
  console.log("\n\n🔍 Batch lookup (multiple companies)...\n");

  const batchResult = await client.batchGetCompanyData([
    "RO18189442", // Bitdefender
    "RO14399840", // UiPath
    "RO99999999", // Invalid - should be in notFound
  ]);

  if (batchResult.success && batchResult.data) {
    console.log(`✅ Found ${batchResult.data.length} companies:`);
    for (const company of batchResult.data) {
      console.log(
        `   - ${company.generalData.companyName} (CUI: ${company.generalData.taxId})`
      );
    }
  }

  if (batchResult.notFound && batchResult.notFound.length > 0) {
    console.log(`\n❌ Not found: ${batchResult.notFound.join(", ")}`);
  }
}

main().catch(console.error);
