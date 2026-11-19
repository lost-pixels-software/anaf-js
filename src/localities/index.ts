/**
 * Romanian counties and their localities: 41 counties plus București, about 13,800 localities.
 * A village is written with its commune, "Barasti (Cicanesti)"; București has its six sectors,
 * "Sectorul 1". Names have no diacritics, and every one is accepted by `Invoice.buildXml` as is.
 *
 * Imported on its own, `anaf-js/localities`, so the main entry never carries the list. Each
 * county's localities are a separate chunk loaded by `loadLocalities`: in a browser, load the
 * county the user picks, never all of them up front.
 */

import { sanitizeCounty } from "../utils/address-sanitizer";
import type { RomanianCountyCode } from "../types/codes";

export interface County {
  /** ISO 3166-2:RO code, as e-Factura wants it: "RO-AG", "RO-B" */
  code: RomanianCountyCode;
  /** The county's name in the list: "Arges", "Bucuresti" */
  name: string;
}

export interface NormalizedAddress {
  /** ISO 3166-2:RO code, "RO-AG"; null when the county is not recognized */
  countyCode: RomanianCountyCode | null;
  /** The county as the list writes it, "Arges"; null when not recognized */
  county: string | null;
  /** The locality as the list writes it, "Barasti (Cicanesti)", "Sectorul 2"; null when unsure */
  locality: string | null;
}

/** All counties, sorted by name. */
export const counties: readonly County[] = (
  [
    { code: "RO-AB", name: "Alba" },
    { code: "RO-AG", name: "Arges" },
    { code: "RO-AR", name: "Arad" },
    { code: "RO-B", name: "Bucuresti" },
    { code: "RO-BC", name: "Bacau" },
    { code: "RO-BH", name: "Bihor" },
    { code: "RO-BN", name: "Bistrita-Nasaud" },
    { code: "RO-BR", name: "Braila" },
    { code: "RO-BT", name: "Botosani" },
    { code: "RO-BV", name: "Brasov" },
    { code: "RO-BZ", name: "Buzau" },
    { code: "RO-CJ", name: "Cluj" },
    { code: "RO-CL", name: "Calarasi" },
    { code: "RO-CS", name: "Caras-Severin" },
    { code: "RO-CT", name: "Constanta" },
    { code: "RO-CV", name: "Covasna" },
    { code: "RO-DB", name: "Dambovita" },
    { code: "RO-DJ", name: "Dolj" },
    { code: "RO-GJ", name: "Gorj" },
    { code: "RO-GL", name: "Galati" },
    { code: "RO-GR", name: "Giurgiu" },
    { code: "RO-HD", name: "Hunedoara" },
    { code: "RO-HR", name: "Harghita" },
    { code: "RO-IF", name: "Ilfov" },
    { code: "RO-IL", name: "Ialomita" },
    { code: "RO-IS", name: "Iasi" },
    { code: "RO-MH", name: "Mehedinti" },
    { code: "RO-MM", name: "Maramures" },
    { code: "RO-MS", name: "Mures" },
    { code: "RO-NT", name: "Neamt" },
    { code: "RO-OT", name: "Olt" },
    { code: "RO-PH", name: "Prahova" },
    { code: "RO-SB", name: "Sibiu" },
    { code: "RO-SJ", name: "Salaj" },
    { code: "RO-SM", name: "Satu Mare" },
    { code: "RO-SV", name: "Suceava" },
    { code: "RO-TL", name: "Tulcea" },
    { code: "RO-TM", name: "Timis" },
    { code: "RO-TR", name: "Teleorman" },
    { code: "RO-VL", name: "Valcea" },
    { code: "RO-VN", name: "Vrancea" },
    { code: "RO-VS", name: "Vaslui" },
  ] satisfies County[]
).sort((a, b) => a.name.localeCompare(b.name, "ro"));

type LocalitiesModule = { default: string[] };

// One explicit import per county so bundlers split each into its own chunk.
const loaders: Record<RomanianCountyCode, () => Promise<LocalitiesModule>> = {
  "RO-AB": () => import("./data/ab.json"),
  "RO-AG": () => import("./data/ag.json"),
  "RO-AR": () => import("./data/ar.json"),
  "RO-B": () => import("./data/b.json"),
  "RO-BC": () => import("./data/bc.json"),
  "RO-BH": () => import("./data/bh.json"),
  "RO-BN": () => import("./data/bn.json"),
  "RO-BR": () => import("./data/br.json"),
  "RO-BT": () => import("./data/bt.json"),
  "RO-BV": () => import("./data/bv.json"),
  "RO-BZ": () => import("./data/bz.json"),
  "RO-CJ": () => import("./data/cj.json"),
  "RO-CL": () => import("./data/cl.json"),
  "RO-CS": () => import("./data/cs.json"),
  "RO-CT": () => import("./data/ct.json"),
  "RO-CV": () => import("./data/cv.json"),
  "RO-DB": () => import("./data/db.json"),
  "RO-DJ": () => import("./data/dj.json"),
  "RO-GJ": () => import("./data/gj.json"),
  "RO-GL": () => import("./data/gl.json"),
  "RO-GR": () => import("./data/gr.json"),
  "RO-HD": () => import("./data/hd.json"),
  "RO-HR": () => import("./data/hr.json"),
  "RO-IF": () => import("./data/if.json"),
  "RO-IL": () => import("./data/il.json"),
  "RO-IS": () => import("./data/is.json"),
  "RO-MH": () => import("./data/mh.json"),
  "RO-MM": () => import("./data/mm.json"),
  "RO-MS": () => import("./data/ms.json"),
  "RO-NT": () => import("./data/nt.json"),
  "RO-OT": () => import("./data/ot.json"),
  "RO-PH": () => import("./data/ph.json"),
  "RO-SB": () => import("./data/sb.json"),
  "RO-SJ": () => import("./data/sj.json"),
  "RO-SM": () => import("./data/sm.json"),
  "RO-SV": () => import("./data/sv.json"),
  "RO-TL": () => import("./data/tl.json"),
  "RO-TM": () => import("./data/tm.json"),
  "RO-TR": () => import("./data/tr.json"),
  "RO-VL": () => import("./data/vl.json"),
  "RO-VN": () => import("./data/vn.json"),
  "RO-VS": () => import("./data/vs.json"),
};

/** For comparing and searching: lower case, no diacritics (ş and ș alike), single spaces. */
export function normalizeText(text: string): string {
  return text
    .replace(/[şș]/gi, "s")
    .replace(/[ţț]/gi, "t")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The county by ISO code ("RO-AG"), short code ("AG"), or name with or without diacritics,
 * including ANAF's "JUD. ARGEŞ" and "MUNICIPIUL BUCUREŞTI".
 */
export function findCounty(value: string | null | undefined): County | undefined {
  if (!value?.trim()) return undefined;
  const code = sanitizeCounty(value);
  return counties.find((county) => county.code === code);
}

/** The county's localities, loaded on first use. Empty for an unknown county. */
export async function loadLocalities(county: string): Promise<readonly string[]> {
  const found = findCounty(county);
  if (!found) return [];
  const module = await loaders[found.code]();
  return module.default;
}

const PLACE_KIND = /^(?:municipiul|mun\.|orasul|oras|or\.|comuna|com\.|satul|sat|loc\.)\s+/;
const PARENT_KIND = /\s+(?:com\.|comuna|orasul|oras|or\.|mun\.|municipiul)\s+/;

/**
 * The list's own spelling of a locality written another way, as ANAF does:
 * "Sector 2 Mun. Bucureşti" → "Sectorul 2", "Sat Bărăşti Com. Cicăneşti" →
 * "Barasti (Cicanesti)", "Mun. Piteşti" → "Pitesti". Only exact matches: undefined when unsure,
 * so a person picks instead of getting a wrong guess.
 */
export function matchLocality(
  value: string | null | undefined,
  localities: readonly string[],
): string | undefined {
  if (!value?.trim()) return undefined;
  const byText = new Map(localities.map((locality) => [normalizeText(locality), locality]));
  const text = normalizeText(value);

  const sector = /^sector(?:ul)?\s*(\d)\b/.exec(text);
  if (sector) return byText.get(`sectorul ${sector[1]}`);

  const exact = byText.get(text);
  if (exact) return exact;

  // "sat X com. Y" → "X (Y)"; "X com. Y" without the "sat" too.
  const withoutKind = text.replace(PLACE_KIND, "");
  const [place, parent] = withoutKind.split(PARENT_KIND);
  if (place && parent) {
    return byText.get(`${place} (${parent.replace(PLACE_KIND, "")})`) ?? byText.get(place);
  }
  return byText.get(withoutKind);
}

/** A Romanian county and locality, written however, as the list writes them. */
export async function normalizeAddress(address: {
  county: string | null | undefined;
  city: string | null | undefined;
}): Promise<NormalizedAddress> {
  const county = findCounty(address.county);
  if (!county) return { countyCode: null, county: null, locality: null };
  const locality = matchLocality(address.city, await loadLocalities(county.code));
  return { countyCode: county.code, county: county.name, locality: locality ?? null };
}
