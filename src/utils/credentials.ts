/**
 * Credentials Storage Utility
 *
 * Load and save OAuth credentials from/to .secret file
 */

import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { StoredCredentials } from "../AnafAuthenticator";

const DEFAULT_SECRET_FILE = ".secret";

export interface CredentialsConfig {
  /** Path to the credentials file */
  filePath?: string;
}

/**
 * Load credentials from .secret file
 */
export function loadCredentials(
  config: CredentialsConfig = {}
): StoredCredentials | null {
  const filePath = config.filePath ?? join(process.cwd(), DEFAULT_SECRET_FILE);

  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const content = readFileSync(filePath, "utf-8");
    const data = JSON.parse(content);

    // Validate required fields
    if (!data.accessToken || !data.refreshToken || !data.expiresAt) {
      console.warn("⚠️ Invalid credentials file format");
      return null;
    }

    return data as StoredCredentials;
  } catch (error) {
    console.error("Failed to load credentials:", error);
    return null;
  }
}

/**
 * Save credentials to .secret file
 */
export function saveCredentials(
  credentials: StoredCredentials,
  config: CredentialsConfig = {}
): void {
  const filePath = config.filePath ?? join(process.cwd(), DEFAULT_SECRET_FILE);

  try {
    const content = JSON.stringify(credentials, null, 2);
    writeFileSync(filePath, content, "utf-8");
    console.log(`✅ Credentials saved to ${filePath}`);
  } catch (error) {
    console.error("Failed to save credentials:", error);
    throw error;
  }
}

/**
 * Check if credentials exist and are not expired
 */
export function hasValidCredentials(config: CredentialsConfig = {}): boolean {
  const credentials = loadCredentials(config);
  if (!credentials) {
    return false;
  }

  // Check if expired (with 1 minute buffer)
  const bufferMs = 60 * 1000;
  return Date.now() < credentials.expiresAt - bufferMs;
}

/**
 * Clear stored credentials
 */
export function clearCredentials(config: CredentialsConfig = {}): void {
  const filePath = config.filePath ?? join(process.cwd(), DEFAULT_SECRET_FILE);

  if (existsSync(filePath)) {
    const { unlinkSync } = require("fs");
    unlinkSync(filePath);
    console.log(`✅ Credentials cleared from ${filePath}`);
  }
}
