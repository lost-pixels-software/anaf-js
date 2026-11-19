import { describe, expect, it } from "bun:test";
import {
  counties,
  findCounty,
  loadLocalities,
  matchLocality,
  normalizeAddress,
} from "../src/localities";
import { sanitizeCity, sanitizeCounty } from "../src/utils/address-sanitizer";

describe("counties", () => {
  it("lists all 42 with a locality list each", async () => {
    expect(counties).toHaveLength(42);
    for (const county of counties) {
      expect((await loadLocalities(county.code)).length).toBeGreaterThan(0);
    }
  });

  it("are all accepted by the invoice sanitizer as they are", () => {
    for (const county of counties) expect(sanitizeCounty(county.name)).toBe(county.code);
  });
});

describe("findCounty", () => {
  it("finds a county however it is written", () => {
    expect(findCounty("Argeș")?.code).toBe("RO-AG");
    expect(findCounty("ARGEŞ")?.code).toBe("RO-AG");
    expect(findCounty("JUD. ARGEŞ")?.code).toBe("RO-AG");
    expect(findCounty("MUNICIPIUL BUCUREŞTI")?.name).toBe("Bucuresti");
    expect(findCounty("RO-CJ")?.name).toBe("Cluj");
    expect(findCounty("cj")?.name).toBe("Cluj");
    expect(findCounty("Bavaria")).toBeUndefined();
    expect(findCounty("")).toBeUndefined();
  });
});

describe("matchLocality", () => {
  it("matches ANAF's localities to the list", async () => {
    const arges = await loadLocalities("RO-AG");
    expect(matchLocality("Sat Bărăşti Com. Cicăneşti", arges)).toBe("Barasti (Cicanesti)");
    expect(matchLocality("Mun. Piteşti", arges)).toBe("Pitesti");
    expect(matchLocality("Com. Cicăneşti", arges)).toBe("Cicanesti");

    const bucuresti = await loadLocalities("Bucuresti");
    expect(matchLocality("Sector 2 Mun. Bucureşti", bucuresti)).toBe("Sectorul 2");
  });

  it("leaves an unknown locality unmatched", async () => {
    expect(matchLocality("Oraş Inexistent", await loadLocalities("RO-AG"))).toBeUndefined();
  });
});

describe("normalizeAddress", () => {
  it("writes ANAF's county and locality as the list does", async () => {
    expect(
      await normalizeAddress({ county: "MUNICIPIUL BUCUREŞTI", city: "Sector 2 Mun. Bucureşti" }),
    ).toEqual({ countyCode: "RO-B", county: "Bucuresti", locality: "Sectorul 2" });
    expect(await normalizeAddress({ county: "Bavaria", city: "München" })).toEqual({
      countyCode: null,
      county: null,
      locality: null,
    });
  });
});

describe("Bucharest on invoices", () => {
  it("turns ANAF's county and sector into what e-Factura accepts", () => {
    expect(sanitizeCounty("MUNICIPIUL BUCUREŞTI")).toBe("RO-B");
    expect(sanitizeCounty("JUD. ARGEŞ")).toBe("RO-AG");
    expect(sanitizeCity("Sector 2 Mun. Bucureşti")).toBe("SECTOR2");
    expect(sanitizeCity("Sectorul 2")).toBe("SECTOR2");
  });
});
