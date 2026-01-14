/**
 * XML Parser Utility
 *
 * Centralized XML parsing for ANAF API responses.
 */

import type { UploadResponseRaw, StatusResponseRaw } from "../types/efactura";

/**
 * Extract an attribute value from XML
 */
export function extractXmlAttribute(
  xml: string,
  attr: string
): string | undefined {
  const match = xml.match(new RegExp(`${attr}="([^"]+)"`));
  return match?.[1];
}

/**
 * Extract error messages from XML
 */
export function extractXmlErrors(xml: string): Array<{ errorMessage: string }> {
  const errors: Array<{ errorMessage: string }> = [];
  const errorMatches = xml.matchAll(/errorMessage="([^"]+)"/g);
  for (const match of errorMatches) {
    if (match[1]) {
      errors.push({ errorMessage: match[1] });
    }
  }
  return errors;
}

/**
 * Parse upload document XML response
 */
export function parseUploadResponse(xml: string): UploadResponseRaw {
  const dateResponse = extractXmlAttribute(xml, "dateResponse") ?? "";
  const executionStatusStr = extractXmlAttribute(xml, "ExecutionStatus");
  const indexIncarcare = extractXmlAttribute(xml, "index_incarcare");

  const errors: Array<{ errorMessage: string }> = [];
  const errorMatches = xml.matchAll(/errorMessage="([^"]+)"/g);
  for (const match of errorMatches) {
    if (match[1]) {
      errors.push({ errorMessage: match[1] });
    }
  }

  return {
    dateResponse,
    ExecutionStatus: executionStatusStr ? parseInt(executionStatusStr, 10) : 1,
    index_incarcare: indexIncarcare,
    Errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Parse status message XML response
 */
export function parseStatusResponse(xml: string): StatusResponseRaw {
  const stare = extractXmlAttribute(xml, "stare");
  const idDescarcare = extractXmlAttribute(xml, "id_descarcare");

  const errors: Array<{ errorMessage: string }> = [];
  const errorMatches = xml.matchAll(/errorMessage="([^"]+)"/g);
  for (const match of errorMatches) {
    if (match[1]) {
      errors.push({ errorMessage: match[1] });
    }
  }

  return {
    stare,
    id_descarcare: idDescarcare,
    Errors: errors.length > 0 ? errors : undefined,
  };
}
