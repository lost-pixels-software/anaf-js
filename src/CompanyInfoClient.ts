/**
 * Company Info Client
 *
 * Client for fetching Romanian company data from the public ANAF API.
 * No authentication required.
 */

import { HttpClient } from "./utils/http-client";
import { AnafValidationError, AnafNotFoundError } from "./errors";
import { COMPANY_INFO_URL, DEFAULT_TIMEOUT } from "./constants";
import type {
  CompanyData,
  CompanyResult,
  GeneralData,
  HqAddress,
  FiscalAddress,
  VatRegistration,
  VatAtCheckout,
  InactiveState,
  SplitVat,
  AnafApiResponseRaw,
  AnafFoundCompanyRaw,
} from "./types/company";

export interface CompanyInfoConfig {
  /** Request timeout in milliseconds */
  timeout?: number;
  /** API URL override */
  url?: string;
}

/**
 * Client for fetching Romanian company data from the public ANAF API
 */
export class CompanyInfoClient {
  private readonly httpClient: HttpClient;
  private readonly url: string;

  constructor(config: CompanyInfoConfig = {}) {
    this.url = config.url ?? COMPANY_INFO_URL;
    this.httpClient = new HttpClient({
      timeout: config.timeout ?? DEFAULT_TIMEOUT,
    });
  }

  /**
   * Get current date string in YYYY-MM-DD format
   */
  private getCurrentDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  /**
   * Extract CUI number from VAT code
   */
  private extractCui(vatCode: string): number | null {
    if (!vatCode || typeof vatCode !== "string") {
      return null;
    }

    // Remove RO prefix if present
    const cuiString = vatCode.trim().toUpperCase().replace(/^RO/i, "");
    const cuiNumber = parseInt(cuiString, 10);

    if (isNaN(cuiNumber) || cuiNumber <= 0) {
      return null;
    }

    return cuiNumber;
  }

  /**
   * Transform raw ANAF response to our format
   */
  private transformCompany(raw: AnafFoundCompanyRaw): CompanyData {
    const generalData: GeneralData = {
      taxId: raw.date_generale.cui,
      searchDate: raw.date_generale.data,
      companyName: raw.date_generale.denumire,
      address: raw.date_generale.adresa,
      registrationNumber: raw.date_generale.nrRegCom,
      phone: raw.date_generale.telefon,
      fax: raw.date_generale.fax,
      postalCode: raw.date_generale.codPostal,
      document: raw.date_generale.act,
      registrationStatus: raw.date_generale.stare_inregistrare,
      registrationDate: raw.date_generale.data_inregistrare,
      activityCode: raw.date_generale.cod_CAEN,
      bankAccount: raw.date_generale.iban,
      eFacturaStatus: raw.date_generale.statusRO_e_Factura,
      fiscalAuthority: raw.date_generale.organFiscalCompetent,
      ownershipForm: raw.date_generale.forma_de_proprietate,
      organizationalForm: raw.date_generale.forma_organizare,
      legalForm: raw.date_generale.forma_juridica,
    };

    const vatRegistration: VatRegistration = {
      status: raw.inregistrare_scop_Tva.scpTVA,
      periods: (raw.inregistrare_scop_Tva.perioade_TVA || []).map((p) => ({
        startDate: p.data_inceput_ScpTVA,
        stopDate: p.data_sfarsit_ScpTVA,
        stopEffectiveDate: p.data_anul_imp_ScpTVA,
        message: p.mesaj_ScpTVA,
      })),
    };

    const vatAtCheckout: VatAtCheckout = {
      startDate: raw.inregistrare_RTVAI.dataInceputTvaInc,
      stopDate: raw.inregistrare_RTVAI.dataSfarsitTvaInc,
      updateDate: raw.inregistrare_RTVAI.dataActualizareTvaInc,
      publishDate: raw.inregistrare_RTVAI.dataPublicareTvaInc,
      updateType: raw.inregistrare_RTVAI.tipActTvaInc,
      status: raw.inregistrare_RTVAI.statusTvaIncasare,
    };

    const inactiveState: InactiveState = {
      inactivationDate: raw.stare_inactiv.dataInactivare,
      reactivationDate: raw.stare_inactiv.dataReactivare,
      publishDate: raw.stare_inactiv.dataPublicare,
      deletionDate: raw.stare_inactiv.dataRadiere,
      status: raw.stare_inactiv.statusInactivi,
    };

    const splitVat: SplitVat = {
      startDate: raw.inregistrare_SplitTVA.dataInceputSplitTVA,
      stopDate: raw.inregistrare_SplitTVA.dataAnulareSplitTVA,
      status: raw.inregistrare_SplitTVA.statusSplitTVA,
    };

    const hqAddress: HqAddress = {
      street: raw.adresa_sediu_social.sdenumire_Strada,
      number: raw.adresa_sediu_social.snumar_Strada,
      city: raw.adresa_sediu_social.sdenumire_Localitate,
      cityCode: raw.adresa_sediu_social.scod_Localitate,
      county: raw.adresa_sediu_social.sdenumire_Judet,
      countyCode: raw.adresa_sediu_social.scod_Judet,
      countyShort: raw.adresa_sediu_social.scod_JudetAuto,
      country: raw.adresa_sediu_social.stara,
      details: raw.adresa_sediu_social.sdetalii_Adresa,
      postalCode: raw.adresa_sediu_social.scod_Postal,
    };

    const fiscalAddress: FiscalAddress = {
      street: raw.adresa_domiciliu_fiscal.ddenumire_Strada,
      number: raw.adresa_domiciliu_fiscal.dnumar_Strada,
      city: raw.adresa_domiciliu_fiscal.ddenumire_Localitate,
      cityCode: raw.adresa_domiciliu_fiscal.dcod_Localitate,
      county: raw.adresa_domiciliu_fiscal.ddenumire_Judet,
      countyCode: raw.adresa_domiciliu_fiscal.dcod_Judet,
      countyShort: raw.adresa_domiciliu_fiscal.dcod_JudetAuto,
      country: raw.adresa_domiciliu_fiscal.dtara,
      details: raw.adresa_domiciliu_fiscal.ddetalii_Adresa,
      postalCode: raw.adresa_domiciliu_fiscal.dcod_Postal,
    };

    return {
      generalData,
      vatRegistration,
      vatAtCheckout,
      inactiveState,
      splitVat,
      hqAddress,
      fiscalAddress,
    };
  }

  /**
   * Get company data for a single VAT code
   *
   * @param vatCode - VAT code (with or without RO prefix)
   * @param date - Optional date for historical lookup (YYYY-MM-DD)
   */
  async getCompanyData(vatCode: string, date?: string): Promise<CompanyResult> {
    return this.batchGetCompanyData([vatCode], date);
  }

  /**
   * Batch fetch company data for multiple VAT codes
   *
   * @param vatCodes - Array of VAT codes (max 100)
   * @param date - Optional date for historical lookup (YYYY-MM-DD)
   */
  async batchGetCompanyData(
    vatCodes: string[],
    date?: string
  ): Promise<CompanyResult> {
    // Validation
    if (!vatCodes || vatCodes.length === 0) {
      return { success: false, error: "No VAT codes provided" };
    }

    if (vatCodes.length > 100) {
      throw new AnafValidationError(
        "Maximum 100 companies allowed per request"
      );
    }

    const requestDate = date ?? this.getCurrentDateString();
    const validPayload: Array<{ cui: number; data: string }> = [];
    const invalidCodes: string[] = [];

    // Validate each VAT code
    for (const vatCode of vatCodes) {
      const cui = this.extractCui(vatCode);
      if (!cui) {
        invalidCodes.push(vatCode);
        continue;
      }
      validPayload.push({ cui, data: requestDate });
    }

    if (validPayload.length === 0) {
      return {
        success: false,
        error: `All provided VAT codes are invalid: ${invalidCodes.join(", ")}`,
      };
    }

    try {
      const response = await this.httpClient.post<AnafApiResponseRaw>(
        this.url,
        validPayload
      );

      const companies: CompanyData[] = [];
      const notFound: number[] = [];

      // Process found companies
      if (response.data.found && response.data.found.length > 0) {
        for (const raw of response.data.found) {
          companies.push(this.transformCompany(raw));
        }
      }

      // Process not found
      if (response.data.notFound && response.data.notFound.length > 0) {
        for (const item of response.data.notFound) {
          notFound.push(item.cui);
        }
      }

      if (companies.length === 0 && notFound.length > 0) {
        return {
          success: false,
          notFound,
          error: "No companies found for the provided VAT codes",
        };
      }

      return {
        success: true,
        data: companies,
        notFound: notFound.length > 0 ? notFound : undefined,
      };
    } catch (error) {
      if (error instanceof AnafNotFoundError) {
        return {
          success: false,
          error: "Companies not found for the provided VAT codes",
        };
      }

      const message =
        error instanceof Error ? error.message : "Unknown error occurred";
      return {
        success: false,
        error: `Failed to fetch company data: ${message}`,
      };
    }
  }

  /**
   * Validate if a VAT code format is correct
   */
  isValidVatCode(vatCode: string): boolean {
    if (!vatCode) return false;

    const cui = this.extractCui(vatCode);
    if (!cui) return false;

    const cuiString = cui.toString();
    return cuiString.length >= 2 && cuiString.length <= 10;
  }
}
