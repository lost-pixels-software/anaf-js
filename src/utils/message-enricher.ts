/**
 * Message enricher utility
 *
 * Enriches ANAF messages with emitter company names via a batch lookup
 * against the public ANAF company info API.
 */

import type { CompanyInfoClient } from "../CompanyInfoClient";
import type { Message } from "../types/efactura";

/**
 * Enrich messages with emitter company names via a single batch lookup.
 *
 * Collects all unique `cifEmitent` values across the messages, performs one
 * batch call to `CompanyInfoClient.batchGetCompanyData`, and sets
 * `emitentName` on each message where a match is found.
 *
 * Fails gracefully: if the lookup throws or returns no data, the original
 * response is returned unchanged — no `emitentName` fields will be set.
 *
 * @param response - Any object that contains a `messages` array
 * @param companyClient - An initialised `CompanyInfoClient` instance
 * @returns The same response shape with `emitentName` populated where possible
 *
 * @example
 * ```typescript
 * const companyClient = new CompanyInfoClient();
 * const messages = await efacturaClient.getMessages({ days: 7 });
 * const enriched = await enrichMessagesWithCompanyNames(messages, companyClient);
 * // enriched.messages[n].emitentName === "Vodafone Romania SRL"
 * ```
 */
export async function enrichMessagesWithCompanyNames<
  T extends { messages?: Message[] }
>(response: T, companyClient: CompanyInfoClient): Promise<T> {
  if (!response.messages || response.messages.length === 0) {
    return response;
  }

  // Collect unique non-empty emitter CIFs
  const uniqueCifs = [
    ...new Set(
      response.messages
        .map((m) => m.cifEmitent)
        .filter((cif): cif is string => Boolean(cif))
    ),
  ];

  if (uniqueCifs.length === 0) {
    return response;
  }

  try {
    const result = await companyClient.batchGetCompanyData(uniqueCifs);

    if (!result.success || !result.data) {
      return response;
    }

    // Build CIF → company name map (taxId is a number, CIFs from detalii are numeric strings)
    const nameMap = new Map<string, string>();
    for (const company of result.data) {
      nameMap.set(
        String(company.generalData.taxId),
        company.generalData.companyName
      );
    }

    return {
      ...response,
      messages: response.messages.map((msg) => {
        if (msg.cifEmitent && nameMap.has(msg.cifEmitent)) {
          return { ...msg, emitentName: nameMap.get(msg.cifEmitent) };
        }
        return msg;
      }),
    };
  } catch {
    // Never let enrichment failures propagate — callers shouldn't have to
    // handle lookup errors just to display messages.
    return response;
  }
}
