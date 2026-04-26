/**
 * Parse structured fields from the ANAF message `detalii` string.
 *
 * Different message types produce different formats:
 *   FACTURA PRIMITA/TRIMISA:
 *     "Factura cu id_incarcare=6185977462 emisa de cif_emitent=38600525 pentru cif_beneficiar=51218787"
 *   ERORI FACTURA:
 *     "Erori de validare identificate la factura primita cu id_incarcare=5001130147"
 *
 * The parser is defensive — it returns only the fields it finds and ignores
 * unknown formats.
 */

export interface ParsedMessageDetails {
  /** Upload/request ID extracted from detalii (id_incarcare) */
  uploadIndex?: string;
  /** Emitter CIF extracted from detalii (cif_emitent) */
  cifEmitent?: string;
  /** Beneficiary CIF extracted from detalii (cif_beneficiar) */
  cifBeneficiar?: string;
}

const UPLOAD_INDEX_RE = /id_incarcare=(\d+)/;
const CIF_EMITENT_RE = /cif_emitent=(\d+)/;
const CIF_BENEFICIAR_RE = /cif_beneficiar=(\d+)/;

/**
 * Parse structured fields from the raw ANAF `detalii` string.
 *
 * @param detalii - Raw details string from ANAF message
 * @returns Parsed fields, only those found in the string
 *
 * @example
 * ```typescript
 * const parsed = parseMessageDetails(
 *   "Factura cu id_incarcare=6185977462 emisa de cif_emitent=38600525 pentru cif_beneficiar=51218787"
 * );
 * // { uploadIndex: "6185977462", cifEmitent: "38600525", cifBeneficiar: "51218787" }
 * ```
 */
export function parseMessageDetails(detalii: string): ParsedMessageDetails {
  if (!detalii) return {};

  const result: ParsedMessageDetails = {};

  const uploadIndexMatch = UPLOAD_INDEX_RE.exec(detalii);
  if (uploadIndexMatch) result.uploadIndex = uploadIndexMatch[1];

  const cifEmitentMatch = CIF_EMITENT_RE.exec(detalii);
  if (cifEmitentMatch) result.cifEmitent = cifEmitentMatch[1];

  const cifBeneficiarMatch = CIF_BENEFICIAR_RE.exec(detalii);
  if (cifBeneficiarMatch) result.cifBeneficiar = cifBeneficiarMatch[1];

  return result;
}
