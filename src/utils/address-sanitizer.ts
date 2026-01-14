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
  const normalizedCounty = county.toUpperCase().trim();
  return (
    normalizedCounty === "RO-B" ||
    normalizedCounty === "BUCUREȘTI" ||
    normalizedCounty === "BUCURESTI" ||
    normalizedCounty === "B"
  );
}

/**
 * Sanitize a city/sector name to CIUS-RO format
 * For Bucharest, converts variations like "Sector 1", "S1", "Sectorul 1" to "SECTOR1"
 * @param city - City/sector name
 * @returns Sanitized city/sector name
 */
export function sanitizeCity(city: string): BucharestSector | string {
  const normalized = city.toUpperCase().trim();

  // Already in correct format
  if (BucharestSectors.includes(normalized as BucharestSector)) {
    return normalized as BucharestSector;
  }

  // Extract sector number from various formats
  const sectorMatch = normalized.match(/(?:SECTOR(?:UL)?|S)?\s*(\d)/);
  if (sectorMatch && sectorMatch[1]) {
    const sectorNum = sectorMatch[1];
    if (parseInt(sectorNum) >= 1 && parseInt(sectorNum) <= 6) {
      return `SECTOR${sectorNum}` as BucharestSector;
    }
  }

  return city;
}

/**
 * Sanitize county name/code to CIUS-RO format
 * @param county - County name or code
 * @returns Sanitized county code or name
 */
export function sanitizeCounty(county: string | undefined): string {
  if (!county) return "";

  const normalized = county.toUpperCase().trim();

  // If already in ISO format (RO-XX), return as is
  if (/^RO-[A-Z]{1,2}$/.test(normalized)) {
    return normalized;
  }

  // Common county name mappings
  const countyMappings: Record<string, RomanianCountyCode> = {
    BUCURESTI: "RO-B",
    BUCUREȘTI: "RO-B",
    ALBA: "RO-AB",
    ARAD: "RO-AR",
    ARGES: "RO-AG",
    ARGEȘ: "RO-AG",
    BACAU: "RO-BC",
    BACĂU: "RO-BC",
    BIHOR: "RO-BH",
    "BISTRITA-NASAUD": "RO-BN",
    "BISTRIȚA-NĂSĂUD": "RO-BN",
    BOTOSANI: "RO-BT",
    BOTOȘANI: "RO-BT",
    BRAILA: "RO-BR",
    BRĂILA: "RO-BR",
    BRASOV: "RO-BV",
    BRAȘOV: "RO-BV",
    BUZAU: "RO-BZ",
    BUZĂU: "RO-BZ",
    CALARASI: "RO-CL",
    CĂLĂRAȘI: "RO-CL",
    "CARAS-SEVERIN": "RO-CS",
    "CARAȘ-SEVERIN": "RO-CS",
    CLUJ: "RO-CJ",
    CONSTANTA: "RO-CT",
    CONSTANȚA: "RO-CT",
    COVASNA: "RO-CV",
    DAMBOVITA: "RO-DB",
    DÂMBOVIȚA: "RO-DB",
    DOLJ: "RO-DJ",
    GALATI: "RO-GL",
    GALAȚI: "RO-GL",
    GIURGIU: "RO-GR",
    GORJ: "RO-GJ",
    HARGHITA: "RO-HR",
    HUNEDOARA: "RO-HD",
    IALOMITA: "RO-IL",
    IALOMIȚA: "RO-IL",
    IASI: "RO-IS",
    IAȘI: "RO-IS",
    ILFOV: "RO-IF",
    MARAMURES: "RO-MM",
    MARAMUREȘ: "RO-MM",
    MEHEDINTI: "RO-MH",
    MEHEDINȚI: "RO-MH",
    MURES: "RO-MS",
    MUREȘ: "RO-MS",
    NEAMT: "RO-NT",
    NEAMȚ: "RO-NT",
    OLT: "RO-OT",
    PRAHOVA: "RO-PH",
    SALAJ: "RO-SJ",
    SĂLAJ: "RO-SJ",
    "SATU MARE": "RO-SM",
    SIBIU: "RO-SB",
    SUCEAVA: "RO-SV",
    TELEORMAN: "RO-TR",
    TIMIS: "RO-TM",
    TIMIȘ: "RO-TM",
    TULCEA: "RO-TL",
    VALCEA: "RO-VL",
    VÂLCEA: "RO-VL",
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
