import { describe, expect, it } from "bun:test";
import { Invoice } from "../src";

describe("Invoice addresses", () => {
  it("writes a Bucharest address as ANAF gives it with the sector code", () => {
    const xml = Invoice.buildXml({
      invoiceNumber: "T-1",
      issueDate: new Date("2026-01-15"),
      seller: {
        registrationName: "Furnizor S.R.L.",
        registrationCode: "12345678",
        vatCode: "RO12345678",
        address: {
          streetName: "Strada Exemplu 10",
          cityName: "Sector 2 Mun. Bucureşti",
          countrySubentity: "MUNICIPIUL BUCUREŞTI",
        },
      },
      buyer: {
        registrationName: "Client S.R.L.",
        registrationCode: "87654321",
        address: {
          streetName: "Strada Principala 1",
          cityName: "Barasti (Cicanesti)",
          countrySubentity: "Arges",
        },
      },
      lines: [{ name: "Produs", quantity: 1, unitPrice: 100, vatPercent: 21 }],
    });

    expect(xml).toContain("<cbc:CityName>SECTOR2</cbc:CityName>");
    expect(xml).toContain("<cbc:CountrySubentity>RO-B</cbc:CountrySubentity>");
    expect(xml).toContain("<cbc:CityName>Barasti (Cicanesti)</cbc:CityName>");
    expect(xml).toContain("<cbc:CountrySubentity>RO-AG</cbc:CountrySubentity>");
  });
});
