/**
 * Address sanitization utilities for CIUS-RO compliance
 *
 * ANAF requires specific formatting for Romanian addresses,
 * especially for Bucharest sectors and county codes.
 */

import { BucharestSectors } from "../shared/codes";
import type { BucharestSector, RomanianCountyCode } from "../types/codes";

/**
 * Check if a county code represents Bucharest
 * @param county - County code or name
 * @returns True if Bucharest
 */
export function isBucharest(county: string): boolean {
  const normalized = normalizeForMapping(county);
  return (
    normalized === "ROB" ||
    normalized === "BUCURESTI" ||
    normalized === "B"
  );
}

/**
 * Sanitize a city/sector name to CIUS-RO format.
 * For Bucharest, converts variations like "Sector 1", "Sect. 1", "S1", "Sectorul 1" to "SECTOR1".
 *
 * @param city - City/sector name
 * @returns Sanitized city/sector name
 */
export function sanitizeCity(city: string): BucharestSector | string {
  const normalized = city.toUpperCase().trim();

  // 1. Check if it's already a perfect match
  if (BucharestSectors.includes(normalized as BucharestSector)) {
    return normalized as BucharestSector;
  }

  // 2. Extract sector number from various formats:
  // "Sector 1", "Sect. 1", "S1", "Sectorul 1", etc.
  const sectorMatch = normalized.match(/(?:SECTOR(?:UL)?|SECT|S)?\s*(\d+)/);
  if (sectorMatch && sectorMatch[1]) {
    const sectorNum = parseInt(sectorMatch[1], 10);
    if (sectorNum >= 1 && sectorNum <= 6) {
      return `SECTOR${sectorNum}` as BucharestSector;
    }
  }

  return city;
}

/**
 * Internal helper to normalize a string for mapping lookups.
 * Strips all diacritics, spaces, and special characters.
 */
function normalizeForMapping(str: string): string {
  return str
    .toUpperCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove common accents
    .replace(/Ș/g, "S") // Handle Romanian specific comma-below
    .replace(/Ț/g, "T")
    .replace(/Ş/g, "S") // Handle cedilla variants
    .replace(/Ţ/g, "T")
    .replace(/Ă/g, "A")
    .replace(/Â/g, "A")
    .replace(/Î/g, "I")
    .replace(/[^A-Z0-9]/g, ""); // Remove spaces, dashes, etc.
}

/**
 * Sanitize county name/code to CIUS-RO format
 * @param county - County name or code
 * @returns Sanitized county code or name
 */
export function sanitizeCounty(county: string | undefined): string {
  if (!county) return "";

  const input = county.toUpperCase().trim();

  // If already in correct ISO format (RO-XX), return as is
  if (/^RO-[A-Z]{1,2}$/.test(input)) {
    return input;
  }

  const normalized = normalizeForMapping(input);

  // Common county short code and name mappings
  // All keys are normalized (ASCII only, no spaces/dashes)
  const countyMappings: Record<string, RomanianCountyCode> = {
    // Short codes
    B: "RO-B",
    AB: "RO-AB",
    AR: "RO-AR",
    AG: "RO-AG",
    BC: "RO-BC",
    BH: "RO-BH",
    BN: "RO-BN",
    BT: "RO-BT",
    BR: "RO-BR",
    BV: "RO-BV",
    BZ: "RO-BZ",
    CL: "RO-CL",
    CS: "RO-CS",
    CJ: "RO-CJ",
    CT: "RO-CT",
    CV: "RO-CV",
    DB: "RO-DB",
    DJ: "RO-DJ",
    GL: "RO-GL",
    GR: "RO-GR",
    GJ: "RO-GJ",
    HR: "RO-HR",
    HD: "RO-HD",
    IL: "RO-IL",
    IS: "RO-IS",
    IF: "RO-IF",
    MM: "RO-MM",
    MH: "RO-MH",
    MS: "RO-MS",
    NT: "RO-NT",
    OT: "RO-OT",
    PH: "RO-PH",
    SJ: "RO-SJ",
    SM: "RO-SM",
    SB: "RO-SB",
    SV: "RO-SV",
    TR: "RO-TR",
    TM: "RO-TM",
    TL: "RO-TL",
    VL: "RO-VL",
    VS: "RO-VS",
    VN: "RO-VN",

    // Names
    BUCURESTI: "RO-B",
    ALBA: "RO-AB",
    ARAD: "RO-AR",
    ARGES: "RO-AG",
    BACAU: "RO-BC",
    BIHOR: "RO-BH",
    BISTRITANASAUD: "RO-BN",
    BOTOSANI: "RO-BT",
    BRAILA: "RO-BR",
    BRASOV: "RO-BV",
    BUZAU: "RO-BZ",
    CALARASI: "RO-CL",
    CARASSEVERIN: "RO-CS",
    CLUJ: "RO-CJ",
    CONSTANTA: "RO-CT",
    COVASNA: "RO-CV",
    DAMBOVITA: "RO-DB",
    DOLJ: "RO-DJ",
    GALATI: "RO-GL",
    GIURGIU: "RO-GR",
    GORJ: "RO-GJ",
    HARGHITA: "RO-HR",
    HUNEDOARA: "RO-HD",
    IALOMITA: "RO-IL",
    IASI: "RO-IS",
    ILFOV: "RO-IF",
    MARAMURES: "RO-MM",
    MEHEDINTI: "RO-MH",
    MURES: "RO-MS",
    NEAMT: "RO-NT",
    OLT: "RO-OT",
    PRAHOVA: "RO-PH",
    SALAJ: "RO-SJ",
    SATUMARE: "RO-SM",
    SIBIU: "RO-SB",
    SUCEAVA: "RO-SV",
    TELEORMAN: "RO-TR",
    TIMIS: "RO-TM",
    TULCEA: "RO-TL",
    VALCEA: "RO-VL",
    VASLUI: "RO-VS",
    VRANCEA: "RO-VN",
  };

  return countyMappings[normalized] || county;
}

/**
 * Normalize a VAT number (CIF/CUI) to include RO prefix if Romanian
 * @param vatNumber - VAT number to normalize
 * @returns Normalized VAT number
 */
export function normalizeVatNumber(vatNumber: string): string {
  const cleaned = vatNumber.replace(/\s/g, "").toUpperCase();

  // If it's just digits and looks like a Romanian VAT, add RO prefix
  if (/^\d+$/.test(cleaned) && cleaned.length >= 2 && cleaned.length <= 10) {
    return `RO${cleaned}`;
  }

  return cleaned;
}
