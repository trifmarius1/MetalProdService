import { describe, expect, it } from "vitest";
import { LOCALES, LOCALE_META, dictionaries, extraKeys, missingKeys, t } from "../src/i18n";

const NAV = {
  "nav.home": { en: "Home", ro: "Acasă", de: "Startseite", hu: "Főoldal", fr: "Accueil", es: "Inicio", it: "Home" },
  "nav.about": { en: "About Us", ro: "Despre Noi", de: "Über Uns", hu: "Rólunk", fr: "À Propos", es: "Sobre Nosotros", it: "Chi Siamo" },
  "nav.services": { en: "Services", ro: "Servicii", de: "Leistungen", hu: "Szolgáltatások", fr: "Services", es: "Servicios", it: "Servizi" },
  "nav.catalogue": { en: "Catalogue", ro: "Catalog Piese", de: "Katalog", hu: "Katalógus", fr: "Catalogue", es: "Catálogo", it: "Catalogo" },
  "nav.equipment": { en: "Equipment", ro: "Echipamente", de: "Maschinenpark", hu: "Géppark", fr: "Équipements", es: "Equipamiento", it: "Macchinari" },
  "nav.contact": { en: "Contact", ro: "Contact", de: "Kontakt", hu: "Kapcsolat", fr: "Contact", es: "Contacto", it: "Contatti" },
  "cta.quote": {
    en: "Request Offer",
    ro: "Cere Ofertă",
    de: "Angebot anfragen",
    hu: "Ajánlatkérés",
    fr: "Demander un devis",
    es: "Solicitar oferta",
    it: "Richiedi preventivo",
  },
} as const;

describe("i18n completeness", () => {
  it("covers all seven ISO locales", () => {
    expect(LOCALES).toEqual(["en", "ro", "de", "hu", "fr", "es", "it"]);
  });

  it("has matching key sets and no empty strings", () => {
    for (const locale of LOCALES) {
      expect(missingKeys(locale), locale).toEqual([]);
      expect(extraKeys(locale), locale).toEqual([]);
      for (const [key, value] of Object.entries(dictionaries[locale])) {
        expect(value.trim().length, `${locale}.${key}`).toBeGreaterThan(0);
      }
    }
  });

  it("matches the specification header dictionary", () => {
    for (const [key, expected] of Object.entries(NAV)) {
      for (const locale of LOCALES) {
        expect(t(locale, key)).toBe(expected[locale]);
      }
    }
  });

  it("does not fall back to English for unique body copy", () => {
    const probe = "hero.sub";
    const values = new Set(LOCALES.map((l) => t(l, probe)));
    expect(values.size).toBe(7);
  });

  it("exposes native language names", () => {
    expect(LOCALE_META.ro.native).toBe("Română");
    expect(LOCALE_META.hu.native).toBe("Magyar");
    expect(LOCALE_META.de.native).toBe("Deutsch");
  });

  it("English copy has no Romanian glosses", () => {
    const banned = [
      "strungire",
      "așchiere",
      "călire",
      "revenire",
      "cementare",
      "detensionare",
      "unicat",
      "prototipuri",
      "piese unicat",
      "cementat",
    ];
    for (const [key, value] of Object.entries(dictionaries.en)) {
      const lower = value.toLowerCase();
      for (const word of banned) {
        expect(lower, `en.${key}`).not.toContain(word);
      }
    }
  });

  it("Romanian copy has no leftover English words", () => {
    const banned = ["straightforward", "overhead-ul", "overhead"];
    for (const [key, value] of Object.entries(dictionaries.ro)) {
      const lower = value.toLowerCase();
      for (const word of banned) {
        expect(lower, `ro.${key}`).not.toContain(word);
      }
    }
  });

  it("non-Romanian locales do not mix in Romanian process glosses", () => {
    const leak = /strungire|așchiere automată|piese unicat|prototipuri\)/i;
    for (const locale of ["de", "hu", "fr", "es", "it"] as const) {
      for (const [key, value] of Object.entries(dictionaries[locale])) {
        expect(value, `${locale}.${key}`).not.toMatch(leak);
      }
    }
  });

  it("renders the turning overview in the selected language only", () => {
    expect(t("en", "svc.turning.overview")).toBe(
      "High-throughput cylindrical turning, grooving, boring, threading, and part-off operations.",
    );
    expect(t("en", "svc.turning.overview")).not.toMatch(/strungire|așchiere|unicat/i);
    expect(t("ro", "svc.turning.overview")).toMatch(/Strunjire/i);
    expect(t("de", "svc.turning.overview")).toMatch(/Drehen|Abstechen/i);
    expect(t("fr", "svc.turning.overview")).toMatch(/Tournage/i);
    expect(t("es", "svc.turning.overview")).toMatch(/Torneado/i);
    expect(t("it", "svc.turning.overview")).toMatch(/Tornitura/i);
    expect(t("hu", "svc.turning.overview")).toMatch(/esztergálás/i);
  });
});
