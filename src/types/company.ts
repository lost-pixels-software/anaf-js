/**
 * Company Data Types
 *
 * Comprehensive types for ANAF company lookup API responses.
 * Based on the PHP library's complete data structure.
 */

// =============================================================================
// Address Types
// =============================================================================

/**
 * Headquarters (Sediu Social) Address
 */
export interface HqAddress {
  /** Street name */
  street: string;
  /** Street number */
  number: string;
  /** City/locality name */
  city: string;
  /** City code */
  cityCode: string;
  /** County name */
  county: string;
  /** County code */
  countyCode: string;
  /** County short code (auto plates) */
  countyShort: string;
  /** Country name */
  country: string;
  /** Additional address details */
  details: string;
  /** Postal code */
  postalCode: string;
}

/**
 * Fiscal Domicile (Domiciliu Fiscal) Address
 */
export interface FiscalAddress {
  /** Street name */
  street: string;
  /** Street number */
  number: string;
  /** City/locality name */
  city: string;
  /** City code */
  cityCode: string;
  /** County name */
  county: string;
  /** County code */
  countyCode: string;
  /** County short code (auto plates) */
  countyShort: string;
  /** Country name */
  country: string;
  /** Additional address details */
  details: string;
  /** Postal code */
  postalCode: string;
}

// =============================================================================
// General Data Types
// =============================================================================

/**
 * General company information
 */
export interface GeneralData {
  /** Tax identification number (CUI) */
  taxId: number;
  /** Search/query date */
  searchDate: string;
  /** Company legal name */
  companyName: string;
  /** Full address string (legacy) */
  address: string;
  /** Trade registry number (J00/000/0000) */
  registrationNumber: string;
  /** Contact phone */
  phone: string;
  /** Contact fax */
  fax: string;
  /** Postal code */
  postalCode: string;
  /** Incorporation document */
  document: string;
  /** Registration status message */
  registrationStatus: string;
  /** Registration date */
  registrationDate: string;
  /** CAEN activity code */
  activityCode: string;
  /** Bank account IBAN */
  bankAccount: string;
  /** e-Factura enrollment status */
  eFacturaStatus: boolean;
  /** Competent fiscal authority name */
  fiscalAuthority: string;
  /** Form of ownership */
  ownershipForm: string;
  /** Organizational form */
  organizationalForm: string;
  /** Legal form */
  legalForm: string;
}

// =============================================================================
// VAT Registration Types
// =============================================================================

/**
 * VAT registration period
 */
export interface VatPeriod {
  /** Start date of VAT registration */
  startDate: string | null;
  /** End date of VAT registration */
  stopDate: string | null;
  /** Effective stop date */
  stopEffectiveDate: string | null;
  /** Period message/note */
  message: string | null;
}

/**
 * VAT registration status
 */
export interface VatRegistration {
  /** Is currently VAT registered */
  status: boolean;
  /** VAT registration periods */
  periods: VatPeriod[];
}

/**
 * VAT at checkout (TVA la incasare) status
 */
export interface VatAtCheckout {
  /** Start date */
  startDate: string;
  /** End date */
  stopDate: string;
  /** Update date */
  updateDate: string;
  /** Publish date */
  publishDate: string;
  /** Update type */
  updateType: string;
  /** Is currently using TVA la incasare */
  status: boolean;
}

// =============================================================================
// Company State Types
// =============================================================================

/**
 * Inactive state information
 */
export interface InactiveState {
  /** Inactivation date */
  inactivationDate: string;
  /** Reactivation date */
  reactivationDate: string;
  /** Publish date */
  publishDate: string;
  /** Deletion/radiation date */
  deletionDate: string;
  /** Is currently inactive */
  status: boolean;
}

/**
 * Split VAT payment status
 */
export interface SplitVat {
  /** Start date */
  startDate: string;
  /** End date */
  stopDate: string;
  /** Is currently using split VAT */
  status: boolean;
}

// =============================================================================
// Complete Company Data
// =============================================================================

/**
 * Complete company information from ANAF
 */
export interface CompanyData {
  /** General company information */
  generalData: GeneralData;
  /** VAT registration information */
  vatRegistration: VatRegistration;
  /** TVA la incasare status */
  vatAtCheckout: VatAtCheckout;
  /** Inactive state */
  inactiveState: InactiveState;
  /** Split VAT status */
  splitVat: SplitVat;
  /** Headquarters address */
  hqAddress: HqAddress;
  /** Fiscal domicile address */
  fiscalAddress: FiscalAddress;
}

// =============================================================================
// API Response Types
// =============================================================================

/**
 * Raw ANAF API general data response
 */
export interface AnafGeneralDataRaw {
  cui: number;
  data: string;
  denumire: string;
  adresa: string;
  nrRegCom: string;
  telefon: string;
  fax: string;
  codPostal: string;
  act: string;
  stare_inregistrare: string;
  data_inregistrare: string;
  cod_CAEN: string;
  iban: string;
  statusRO_e_Factura: boolean;
  organFiscalCompetent: string;
  forma_de_proprietate: string;
  forma_organizare: string;
  forma_juridica: string;
}

/**
 * Raw ANAF API VAT registration response
 */
export interface AnafVatRegistrationRaw {
  scpTVA: boolean;
  perioade_TVA?: Array<{
    data_inceput_ScpTVA: string | null;
    data_sfarsit_ScpTVA: string | null;
    data_anul_imp_ScpTVA: string | null;
    mesaj_ScpTVA: string | null;
  }>;
}

/**
 * Raw ANAF API TVA la incasare response
 */
export interface AnafVatAtCheckoutRaw {
  dataInceputTvaInc: string;
  dataSfarsitTvaInc: string;
  dataActualizareTvaInc: string;
  dataPublicareTvaInc: string;
  tipActTvaInc: string;
  statusTvaIncasare: boolean;
}

/**
 * Raw ANAF API inactive state response
 */
export interface AnafInactiveStateRaw {
  dataInactivare: string;
  dataReactivare: string;
  dataPublicare: string;
  dataRadiere: string;
  statusInactivi: boolean;
}

/**
 * Raw ANAF API split VAT response
 */
export interface AnafSplitVatRaw {
  dataInceputSplitTVA: string;
  dataAnulareSplitTVA: string;
  statusSplitTVA: boolean;
}

/**
 * Raw ANAF API HQ address response
 */
export interface AnafHqAddressRaw {
  sdenumire_Strada: string;
  snumar_Strada: string;
  sdenumire_Localitate: string;
  scod_Localitate: string;
  sdenumire_Judet: string;
  scod_Judet: string;
  scod_JudetAuto: string;
  stara: string;
  sdetalii_Adresa: string;
  scod_Postal: string;
}

/**
 * Raw ANAF API fiscal address response
 */
export interface AnafFiscalAddressRaw {
  ddenumire_Strada: string;
  dnumar_Strada: string;
  ddenumire_Localitate: string;
  dcod_Localitate: string;
  ddenumire_Judet: string;
  dcod_Judet: string;
  dcod_JudetAuto: string;
  dtara: string;
  ddetalii_Adresa: string;
  dcod_Postal: string;
}

/**
 * Raw ANAF API found company structure
 */
export interface AnafFoundCompanyRaw {
  date_generale: AnafGeneralDataRaw;
  inregistrare_scop_Tva: AnafVatRegistrationRaw;
  inregistrare_RTVAI: AnafVatAtCheckoutRaw;
  stare_inactiv: AnafInactiveStateRaw;
  inregistrare_SplitTVA: AnafSplitVatRaw;
  adresa_sediu_social: AnafHqAddressRaw;
  adresa_domiciliu_fiscal: AnafFiscalAddressRaw;
}

/**
 * Raw ANAF API response
 */
export interface AnafApiResponseRaw {
  cod: number;
  message: string;
  found: AnafFoundCompanyRaw[];
  notFound: Array<{ cui: number }>;
}

// =============================================================================
// Result Types
// =============================================================================

/**
 * Company lookup result
 */
export interface CompanyResult {
  /** Whether the lookup was successful */
  success: boolean;
  /** Found companies */
  data?: CompanyData[];
  /** Companies not found (CUI numbers) */
  notFound?: number[];
  /** Error message */
  error?: string;
}
