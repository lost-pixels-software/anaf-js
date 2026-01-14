/**
 * CIUS-RO Compliant Code Types for Romanian e-Invoicing
 *
 * These types are derived from the code constants in shared/codes.ts
 * using the `keyof typeof` pattern for better IDE autocomplete and type safety.
 */

import type {
  InvoiceTypeCodes,
  TaxCategoryCodes,
  TaxExemptionCodes,
  TaxDueCodes,
  PaymentMeansCodes,
  CommonUnitCodes,
  RomanianCountyCodes,
  BucharestSectors,
} from "../shared/codes";

// =============================================================================
// Invoice Type Codes (UNCL1001)
// =============================================================================

export type InvoiceTypeCode = keyof typeof InvoiceTypeCodes;

// =============================================================================
// Tax Category Codes (UNCL5305)
// =============================================================================

export type TaxCategoryCode = keyof typeof TaxCategoryCodes;

// =============================================================================
// Tax Exemption Reason Codes (VATEX)
// =============================================================================

export type TaxExemptionCode = keyof typeof TaxExemptionCodes;

// =============================================================================
// Tax Due Codes (UNCL2005)
// =============================================================================

export type TaxDueCode = keyof typeof TaxDueCodes;

// =============================================================================
// Payment Means Codes (UNCL4461)
// =============================================================================

export type PaymentMeansCode = keyof typeof PaymentMeansCodes;

// =============================================================================
// Unit Codes (UN/ECE Recommendation 20)
// =============================================================================

export type UnitCode = keyof typeof CommonUnitCodes;

// =============================================================================
// Romanian County Codes (ISO 3166-2:RO)
// =============================================================================

export type RomanianCountyCode = keyof typeof RomanianCountyCodes;

// =============================================================================
// Bucharest Sectors
// =============================================================================

export type BucharestSector = (typeof BucharestSectors)[number];
