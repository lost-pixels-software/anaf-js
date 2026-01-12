/**
 * CIUS-RO Compliant Codes for Romanian e-Invoicing
 * 
 * Reference: https://mfinante.gov.ro/static/10/eFactura/
 */

// =============================================================================
// Invoice Type Codes (UNCL1001)
// =============================================================================

export const InvoiceTypeCodes = ['380', '381', '384', '389', '751'] as const;

export const InvoiceTypeCodesDescriptions = {
  '380': 'Commercial Invoice (Factură comercială)',
  '381': 'Credit Note (Notă de credit)',
  '384': 'Corrected Invoice (Factură corectată)',
  '389': 'Self-billed Invoice (Autofactură)',
  '751': 'Invoice information for accounting purposes (Factură - informații în scopuri contabile)',
} as const;

export type InvoiceTypeCode = typeof InvoiceTypeCodes[number];

// =============================================================================
// Tax Category Codes (UNCL5305)
// =============================================================================

export const TaxCategoryCodes = ['S', 'Z', 'E', 'AE', 'K', 'G', 'O', 'L', 'M'] as const;

export const TaxCategoryCodesDescriptions = {
  'S': 'Standard rate (Cotă standard)',
  'Z': 'Zero rated goods (Cotă zero)',
  'E': 'Exempt from tax (Scutit de TVA)',
  'AE': 'VAT Reverse Charge (Taxare inversă)',
  'K': 'VAT exempt for EEA intra-community (Scutit pentru comunitatea intra-UE)',
  'G': 'Free export item, tax not charged (Export - fără TVA)',
  'O': 'Services outside scope of tax (Servicii în afara sferei de aplicare)',
  'L': 'Canary Islands general indirect tax (IGIC)',
  'M': 'Tax for production, services and importation (IPSI)',
} as const;

export type TaxCategoryCode = typeof TaxCategoryCodes[number];

// =============================================================================
// Tax Exemption Reason Codes (VATEX)
// =============================================================================

export const TaxExemptionCodes = [
  'VATEX-EU-79-C',
  'VATEX-EU-132',
  'VATEX-EU-132-1A',
  'VATEX-EU-132-1B',
  'VATEX-EU-132-1C',
  'VATEX-EU-132-1D',
  'VATEX-EU-132-1E',
  'VATEX-EU-132-1F',
  'VATEX-EU-132-1G',
  'VATEX-EU-132-1H',
  'VATEX-EU-132-1I',
  'VATEX-EU-132-1J',
  'VATEX-EU-132-1K',
  'VATEX-EU-132-1L',
  'VATEX-EU-132-1M',
  'VATEX-EU-132-1N',
  'VATEX-EU-132-1O',
  'VATEX-EU-132-1P',
  'VATEX-EU-132-1Q',
  'VATEX-EU-143',
  'VATEX-EU-143-1A',
  'VATEX-EU-143-1B',
  'VATEX-EU-143-1C',
  'VATEX-EU-143-1D',
  'VATEX-EU-143-1E',
  'VATEX-EU-143-1F',
  'VATEX-EU-143-1FA',
  'VATEX-EU-143-1G',
  'VATEX-EU-143-1H',
  'VATEX-EU-143-1I',
  'VATEX-EU-143-1J',
  'VATEX-EU-143-1K',
  'VATEX-EU-143-1L',
  'VATEX-EU-148',
  'VATEX-EU-148-A',
  'VATEX-EU-148-B',
  'VATEX-EU-148-C',
  'VATEX-EU-148-D',
  'VATEX-EU-148-E',
  'VATEX-EU-148-F',
  'VATEX-EU-148-G',
  'VATEX-EU-151',
  'VATEX-EU-151-1A',
  'VATEX-EU-151-1AA',
  'VATEX-EU-151-1B',
  'VATEX-EU-151-1C',
  'VATEX-EU-151-1D',
  'VATEX-EU-151-1E',
  'VATEX-EU-309',
  'VATEX-EU-AE',
  'VATEX-EU-D',
  'VATEX-EU-F',
  'VATEX-EU-G',
  'VATEX-EU-I',
  'VATEX-EU-IC',
  'VATEX-EU-J',
  'VATEX-EU-O',
] as const;

export type TaxExemptionCode = typeof TaxExemptionCodes[number];

// =============================================================================
// Tax Due Codes (UNCL2005)
// =============================================================================

export const TaxDueCodes = ['3', '35', '432'] as const;

export const TaxDueCodesDescriptions = {
  '3': 'Invoice issue date (Data emiterii facturii)',
  '35': 'Actual delivery date (Data reală a livrării)',
  '432': 'Paid amount on that date (Suma plătită în acea zi)',
} as const;

export type TaxDueCode = typeof TaxDueCodes[number];

// =============================================================================
// Payment Means Codes (UNCL4461)
// =============================================================================

export const PaymentMeansCodes = [
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
  '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
  '21', '22', '23', '24', '25', '26', '27', '28', '29', '30',
  '31', '32', '33', '34', '35', '36', '37', '38', '39', '40',
  '41', '42', '43', '44', '45', '46', '47', '48', '49', '50',
  '51', '52', '53', '54', '55', '56', '57', '58', '59', '60',
  '61', '62', '63', '64', '65', '66', '67', '68', '69', '70',
  '74', '75', '76', '77', '78', '91', '92', '93', '94', '95',
  '96', '97', 'ZZZ',
] as const;

export const CommonPaymentMeansCodesDescriptions = {
  '1': 'Instrument not defined',
  '10': 'In cash',
  '20': 'Cheque',
  '30': 'Credit transfer',
  '31': 'Debit transfer',
  '42': 'Payment to bank account',
  '48': 'Bank card',
  '49': 'Direct debit',
  '54': 'Credit card',
  '55': 'Debit card',
  '57': 'Standing agreement',
  '58': 'SEPA credit transfer',
  '59': 'SEPA direct debit',
  'ZZZ': 'Mutually defined (Altă metodă - definită reciproc)',
} as const;

export type PaymentMeansCode = typeof PaymentMeansCodes[number];

// =============================================================================
// Unit Codes (UN/ECE Recommendation 20)
// =============================================================================

export const CommonUnitCodes = {
  'C62': 'One (Bucată)',
  'EA': 'Each (Fiecare)',
  'H87': 'Piece (Piesă)',
  'HUR': 'Hour (Oră)',
  'DAY': 'Day (Zi)',
  'MON': 'Month (Lună)',
  'ANN': 'Year (An)',
  'KGM': 'Kilogram',
  'GRM': 'Gram',
  'MTR': 'Metre (Metru)',
  'LTR': 'Litre (Litru)',
  'MTK': 'Square metre (Metru pătrat)',
  'MTQ': 'Cubic metre (Metru cub)',
  'KWH': 'Kilowatt hour (Kilowatt-oră)',
  'SET': 'Set',
  'PR': 'Pair (Pereche)',
  'XPK': 'Package (Pachet)',
  'XBX': 'Box (Cutie)',
} as const;

export type UnitCode = keyof typeof CommonUnitCodes | string;

// =============================================================================
// Romanian County Codes (ISO 3166-2:RO)
// =============================================================================

export const RomanianCountyCodes = {
  'RO-AB': 'Alba',
  'RO-AR': 'Arad',
  'RO-AG': 'Argeș',
  'RO-BC': 'Bacău',
  'RO-BH': 'Bihor',
  'RO-BN': 'Bistrița-Năsăud',
  'RO-BT': 'Botoșani',
  'RO-BR': 'Brăila',
  'RO-BV': 'Brașov',
  'RO-B': 'București',
  'RO-BZ': 'Buzău',
  'RO-CL': 'Călărași',
  'RO-CS': 'Caraș-Severin',
  'RO-CJ': 'Cluj',
  'RO-CT': 'Constanța',
  'RO-CV': 'Covasna',
  'RO-DB': 'Dâmbovița',
  'RO-DJ': 'Dolj',
  'RO-GL': 'Galați',
  'RO-GR': 'Giurgiu',
  'RO-GJ': 'Gorj',
  'RO-HR': 'Harghita',
  'RO-HD': 'Hunedoara',
  'RO-IL': 'Ialomița',
  'RO-IS': 'Iași',
  'RO-IF': 'Ilfov',
  'RO-MM': 'Maramureș',
  'RO-MH': 'Mehedinți',
  'RO-MS': 'Mureș',
  'RO-NT': 'Neamț',
  'RO-OT': 'Olt',
  'RO-PH': 'Prahova',
  'RO-SJ': 'Sălaj',
  'RO-SM': 'Satu Mare',
  'RO-SB': 'Sibiu',
  'RO-SV': 'Suceava',
  'RO-TR': 'Teleorman',
  'RO-TM': 'Timiș',
  'RO-TL': 'Tulcea',
  'RO-VL': 'Vâlcea',
  'RO-VS': 'Vaslui',
  'RO-VN': 'Vrancea',
} as const;

export type RomanianCountyCode = keyof typeof RomanianCountyCodes;

// =============================================================================
// Bucharest Sectors
// =============================================================================

export const BucharestSectors = [
  'SECTOR1',
  'SECTOR2', 
  'SECTOR3',
  'SECTOR4',
  'SECTOR5',
  'SECTOR6',
] as const;

export type BucharestSector = typeof BucharestSectors[number];
