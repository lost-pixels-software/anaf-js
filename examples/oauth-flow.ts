/// <reference types="bun-types" />

/**
 * Example: OAuth Authentication Flow
 *
 * This example shows how to authenticate with ANAF using OAuth 2.0.
 * You'll need valid ANAF SPV credentials (client ID and secret).
 *
 * Run with: bun examples/oauth-flow.ts
 */

import {
  AnafAuthenticator,
  runOAuthFlow,
  saveCredentials,
  loadCredentials,
  hasValidCredentials,
} from "../src";

// Configuration - replace with your credentials
const config = {
  clientId: process.env.ANAF_CLIENT_ID || "your-client-id",
  clientSecret: process.env.ANAF_CLIENT_SECRET || "your-client-secret",
  redirectUri:
    process.env.ANAF_REDIRECT_URI || "http://localhost:3000/callback",
};

async function main() {
  console.log("🔐 ANAF OAuth Authentication Example\n");

  // Check if we already have valid credentials
  if (hasValidCredentials()) {
    console.log("✅ Valid credentials found in .secret file");
    const creds = loadCredentials();
    console.log(
      `   Access token expires: ${new Date(creds!.expiresAt).toISOString()}`
    );
    return;
  }

  console.log("📝 No valid credentials found. Starting OAuth flow...\n");

  // Validate configuration
  if (config.clientId === "your-client-id") {
    console.log("⚠️  Please set your ANAF credentials:");
    console.log("   export ANAF_CLIENT_ID='your-client-id'");
    console.log("   export ANAF_CLIENT_SECRET='your-client-secret'");
    console.log("   export ANAF_REDIRECT_URI='http://localhost:3000/callback'");
    console.log("\n   Or edit the config in this file.");
    return;
  }

  // Create authenticator
  const auth = new AnafAuthenticator(config);

  // Generate authorization URL
  const authUrl = auth.getAuthorizationUrl();
  console.log("📋 Authorization URL generated\n");

  try {
    // Run OAuth flow (starts server, opens browser, waits for callback)
    const { code } = await runOAuthFlow(authUrl, { port: 3000 });
    console.log(
      `\n✅ Authorization code received: ${code.substring(0, 20)}...`
    );

    // Exchange code for tokens
    console.log("\n🔄 Exchanging code for tokens...");
    const tokens = await auth.exchangeCodeForToken(code);

    // Save credentials to .secret file
    const storedCredentials = AnafAuthenticator.toStoredCredentials(tokens);
    saveCredentials(storedCredentials);

    console.log("\n✅ Authentication successful!");
    console.log(
      `   Access token expires: ${new Date(
        storedCredentials.expiresAt
      ).toISOString()}`
    );
    console.log("   Credentials saved to .secret file");
  } catch (error) {
    console.error("\n❌ Authentication failed:", error);
  }
}

main().catch(console.error);
