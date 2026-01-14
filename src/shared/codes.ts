/**
 * CIUS-RO Compliant Code Constants for Romanian e-Invoicing
 *
 * Reference: https://mfinante.gov.ro/static/10/eFactura/
 *
 * All code constants use the `as const` pattern to provide better IDE autocomplete.
 */

// =============================================================================
// Invoice Type Codes (UNCL1001)
// =============================================================================

export const InvoiceTypeCodes = {
  "380": "Commercial Invoice (Factură comercială)",
  "381": "Credit Note (Notă de credit)",
  "384": "Corrected Invoice (Factură corectată)",
  "389": "Self-billed Invoice (Autofactură)",
  "751":
    "Invoice information for accounting purposes (Factură - informații în scopuri contabile)",
} as const;

// =============================================================================
// Tax Category Codes (UNCL5305)
// =============================================================================

export const TaxCategoryCodes = {
  S: "Standard rate (Cotă standard)",
  Z: "Zero rated goods (Cotă zero)",
  E: "Exempt from tax (Scutit de TVA)",
  AE: "VAT Reverse Charge (Taxare inversă)",
  K: "VAT exempt for EEA intra-community (Scutit pentru comunitatea intra-UE)",
  G: "Free export item, tax not charged (Export - fără TVA)",
  O: "Services outside scope of tax (Servicii în afara sferei de aplicare)",
  L: "Canary Islands general indirect tax (IGIC)",
  M: "Tax for production, services and importation (IPSI)",
} as const;

// =============================================================================
// Tax Exemption Reason Codes (VATEX)
// =============================================================================

export const TaxExemptionCodes = {
  "VATEX-EU-79-C": "Exempt under Article 79(c)",
  "VATEX-EU-132": "Exempt under Article 132",
  "VATEX-EU-132-1A": "Hospital and medical care",
  "VATEX-EU-132-1B": "Medical care by certified professionals",
  "VATEX-EU-132-1C": "Supply of medical goods",
  "VATEX-EU-132-1D": "Supply of human organs, blood",
  "VATEX-EU-132-1E": "Dental technicians services",
  "VATEX-EU-132-1F": "Services by independent groups",
  "VATEX-EU-132-1G": "Social welfare services",
  "VATEX-EU-132-1H": "Protection of children and young persons",
  "VATEX-EU-132-1I": "Education of children or young persons",
  "VATEX-EU-132-1J": "School or university education",
  "VATEX-EU-132-1K": "Vocational training or retraining",
  "VATEX-EU-132-1L": "Staff, supplies for exempted activities",
  "VATEX-EU-132-1M": "Cultural services and goods",
  "VATEX-EU-132-1N": "Transport services for sick or injured",
  "VATEX-EU-132-1O": "Non-commercial radio and TV broadcasts",
  "VATEX-EU-132-1P": "Fund-raising events by charities",
  "VATEX-EU-132-1Q": "Services and supplies by member organizations",
  "VATEX-EU-143": "Exempt under Article 143",
  "VATEX-EU-143-1A": "Import of goods for final import",
  "VATEX-EU-143-1B": "Import for intra-Community supply",
  "VATEX-EU-143-1C": "Import for customs warehousing",
  "VATEX-EU-143-1D": "Import for free zone",
  "VATEX-EU-143-1E": "Import for temporary storage",
  "VATEX-EU-143-1F": "Import under transit",
  "VATEX-EU-143-1FA": "Import of electricity, gas, heating",
  "VATEX-EU-143-1G": "Import related to diplomatic missions",
  "VATEX-EU-143-1H": "Import for international organizations",
  "VATEX-EU-143-1I": "Import for NATO forces",
  "VATEX-EU-143-1J": "Import under temporary import arrangements",
  "VATEX-EU-143-1K": "Import under customs arrangements",
  "VATEX-EU-143-1L": "Import under outward processing",
  "VATEX-EU-148": "Exempt under Article 148",
  "VATEX-EU-148-A": "Fuel for shipping vessels",
  "VATEX-EU-148-B": "Fuel for rescue vessels",
  "VATEX-EU-148-C": "Fuel for warships",
  "VATEX-EU-148-D": "Fuel for aircraft on international routes",
  "VATEX-EU-148-E": "Fuel for diplomatic flights",
  "VATEX-EU-148-F": "Fuel and provisions for fishing",
  "VATEX-EU-148-G": "Fuel and provisions for commercial vessels",
  "VATEX-EU-151": "Exempt under Article 151",
  "VATEX-EU-151-1A": "Supplies to diplomatic missions",
  "VATEX-EU-151-1AA": "Supplies under customs procedures",
  "VATEX-EU-151-1B": "Supplies to international organizations",
  "VATEX-EU-151-1C": "Supplies to NATO forces",
  "VATEX-EU-151-1D": "Supplies to UK forces in Cyprus",
  "VATEX-EU-151-1E": "Supplies for use in diplomatic or consular missions",
  "VATEX-EU-309": "Exempt under Article 309",
  "VATEX-EU-AE": "Intra-community acquisition from small enterprises",
  "VATEX-EU-D": "Intra-community acquisition for diplomats",
  "VATEX-EU-F": "Intra-community acquisition for NATO forces",
  "VATEX-EU-G": "Export outside EU",
  "VATEX-EU-I": "Intra-community supply",
  "VATEX-EU-IC": "Intra-community supply (transfer)",
  "VATEX-EU-J": "Reverse charge",
  "VATEX-EU-O": "Not subject to VAT",
} as const;

// =============================================================================
// Tax Due Codes (UNCL2005)
// =============================================================================

export const TaxDueCodes = {
  "3": "Invoice issue date (Data emiterii facturii)",
  "35": "Actual delivery date (Data reală a livrării)",
  "432": "Paid amount on that date (Suma plătită în acea zi)",
} as const;

// =============================================================================
// Payment Means Codes (UNCL4461)
// =============================================================================

export const PaymentMeansCodes = {
  "1": "Instrument not defined",
  "2": "Automated clearing house credit",
  "3": "Automated clearing house debit",
  "4": "ACH demand debit reversal",
  "5": "ACH demand credit reversal",
  "6": "ACH demand credit",
  "7": "ACH demand debit",
  "8": "Hold",
  "9": "National or regional clearing",
  "10": "In cash",
  "11": "ACH savings credit reversal",
  "12": "ACH savings debit reversal",
  "13": "ACH savings credit",
  "14": "ACH savings debit",
  "15": "Bookentry credit",
  "16": "Bookentry debit",
  "17": "ACH demand cash concentration",
  "18": "ACH demand cash disbursement",
  "19": "ACH demand corporate trade payment credit",
  "20": "Cheque",
  "21": "Banker's draft",
  "22": "Certified banker's draft",
  "23": "Bank cheque",
  "24": "Bill of exchange awaiting acceptance",
  "25": "Certified cheque",
  "26": "Local cheque",
  "27": "ACH demand corporate trade payment debit",
  "28": "ACH demand CTP credit",
  "29": "ACH demand CTP debit",
  "30": "Credit transfer",
  "31": "Debit transfer",
  "32": "ACH demand CCD plus",
  "33": "ACH demand CCD plus",
  "34": "ACH PPD",
  "35": "ACH savings CCD",
  "36": "ACH savings corporate trade payment credit",
  "37": "ACH corporate trade payment debit",
  "38": "ACH corporate trade exchange",
  "39": "ACH corporate trade exchange",
  "40": "ACH savings cash concentration",
  "41": "ACH savings cash disbursement",
  "42": "Payment to bank account",
  "43": "ACH savings CTP credit",
  "44": "Accepted bill of exchange",
  "45": "Referenced home-banking credit transfer",
  "46": "Interbank debit transfer",
  "47": "Reference credit transfer",
  "48": "Bank card",
  "49": "Direct debit",
  "50": "Payment by postgiro",
  "51": "FR - NORME 6-97-Telereglement",
  "52": "Urgent commercial payment",
  "53": "Urgent Treasury Payment",
  "54": "Credit card",
  "55": "Debit card",
  "56": "Bankgiro",
  "57": "Standing agreement",
  "58": "SEPA credit transfer",
  "59": "SEPA direct debit",
  "60": "Promissory note",
  "61": "Promissory note signed by debtor",
  "62": "Promissory note signed by debtor and endorsed",
  "63": "Promissory note signed by creditor",
  "64": "Promissory note signed by creditor and endorsed",
  "65": "Promissory note signed by bank",
  "66": "Promissory note signed by bank and endorsed",
  "67": "Bill drawn by creditor on debtor",
  "68": "Bill drawn by creditor on bank",
  "69": "Bill drawn by creditor on third party",
  "70": "Bill drawn by creditor",
  "74": "Bill drawn by creditor on debtor - accepted",
  "75": "Bill drawn by creditor on bank - accepted",
  "76": "Bill drawn by creditor on third party - accepted",
  "77": "Bill drawn by creditor - accepted",
  "78": "Bill drawn for collection",
  "91": "Not transferable banker's draft",
  "92": "Not transferable local cheque",
  "93": "Reference giro",
  "94": "Urgent giro",
  "95": "Free format giro",
  "96": "Clearing between partners",
  "97": "Mutual offset agreement",
  ZZZ: "Mutually defined (Altă metodă - definită reciproc)",
} as const;

// =============================================================================
// Unit Codes (UN/ECE Recommendation 20)
// =============================================================================

export const CommonUnitCodes = {
  C62: "One (Bucată)",
  EA: "Each (Fiecare)",
  H87: "Piece (Piesă)",
  HUR: "Hour (Oră)",
  DAY: "Day (Zi)",
  MON: "Month (Lună)",
  ANN: "Year (An)",
  KGM: "Kilogram",
  GRM: "Gram",
  MTR: "Metre (Metru)",
  LTR: "Litre (Litru)",
  MTK: "Square metre (Metru pătrat)",
  MTQ: "Cubic metre (Metru cub)",
  KWH: "Kilowatt hour (Kilowatt-oră)",
  SET: "Set",
  PR: "Pair (Pereche)",
  XPK: "Package (Pachet)",
  XBX: "Box (Cutie)",
} as const;

// =============================================================================
// Romanian County Codes (ISO 3166-2:RO)
// =============================================================================

export const RomanianCountyCodes = {
  "RO-AB": "Alba",
  "RO-AR": "Arad",
  "RO-AG": "Argeș",
  "RO-BC": "Bacău",
  "RO-BH": "Bihor",
  "RO-BN": "Bistrița-Năsăud",
  "RO-BT": "Botoșani",
  "RO-BR": "Brăila",
  "RO-BV": "Brașov",
  "RO-B": "București",
  "RO-BZ": "Buzău",
  "RO-CL": "Călărași",
  "RO-CS": "Caraș-Severin",
  "RO-CJ": "Cluj",
  "RO-CT": "Constanța",
  "RO-CV": "Covasna",
  "RO-DB": "Dâmbovița",
  "RO-DJ": "Dolj",
  "RO-GL": "Galați",
  "RO-GR": "Giurgiu",
  "RO-GJ": "Gorj",
  "RO-HR": "Harghita",
  "RO-HD": "Hunedoara",
  "RO-IL": "Ialomița",
  "RO-IS": "Iași",
  "RO-IF": "Ilfov",
  "RO-MM": "Maramureș",
  "RO-MH": "Mehedinți",
  "RO-MS": "Mureș",
  "RO-NT": "Neamț",
  "RO-OT": "Olt",
  "RO-PH": "Prahova",
  "RO-SJ": "Sălaj",
  "RO-SM": "Satu Mare",
  "RO-SB": "Sibiu",
  "RO-SV": "Suceava",
  "RO-TR": "Teleorman",
  "RO-TM": "Timiș",
  "RO-TL": "Tulcea",
  "RO-VL": "Vâlcea",
  "RO-VS": "Vaslui",
  "RO-VN": "Vrancea",
} as const;

// =============================================================================
// Bucharest Sectors
// =============================================================================

export const BucharestSectors = [
  "SECTOR1",
  "SECTOR2",
  "SECTOR3",
  "SECTOR4",
  "SECTOR5",
  "SECTOR6",
] as const;
