import snapshot from "../../../data/nav-snapshot.json";
import {
  countyName,
  type MarketData,
  type Observation,
  type Source,
} from "../../shared/types";
type Monthly = {
  code: string;
  name: string;
  series: { period: string; value: number | null }[];
  sheet: string;
  row: number;
};
type Shortage = {
  code: string;
  name: string;
  value: number;
  low: number;
  high: number;
  sheet: string;
  row: number;
};
function source(
  file: keyof typeof snapshot.sources,
  geography: string,
  population: string,
  period = snapshot.period,
): Source {
  const s = snapshot.sources[file];
  return {
    name: "NAV",
    url: s.url,
    status: "snapshot",
    retrievedAt: s.retrievedAt,
    updatedAt: null,
    table: file,
    period,
    geography,
    population,
    note: "Versjonert originalpublikasjon. Hentedato er ikke publiseringsdato.",
  };
}
function vacancies(
  row: Monthly | undefined,
  file: keyof typeof snapshot.sources,
  geography: string,
  population: string,
): Observation {
  const value = row?.series.at(-1)?.value ?? null;
  const s = source(file, geography, population);
  return {
    value,
    unit: "publiserte stillinger i perioden",
    source: {
      ...s,
      status: value === null ? "missing" : "snapshot",
      table: row ? `${row.sheet}, rad ${row.row}` : file,
      note: "Tilgang i måneden, ikke beholdning av aktive annonser. Ingen kobling mellom fylkes- og yrkestabell.",
    },
    reason: row
      ? null
      : "Yrket er ikke i publisert topp 30-utvalg. Stillinger kan finnes selv om tallet mangler her.",
  };
}
function shortage(
  row: Shortage | undefined,
  geography: string,
  population: string,
): Observation {
  const s = source(
    "nav-survey-2026.xlsx",
    geography,
    population,
    snapshot.surveyPeriod,
  );
  return {
    value: row?.value ?? null,
    unit: "personer (anslått mangel)",
    source: {
      ...s,
      status: row ? "snapshot" : "missing",
      table: row
        ? `${row.sheet}, rad ${row.row}`
        : "Bedriftsundersøkelsen 2026",
      note: "Utvalgsundersøkelse, 95 % konfidensintervall. Anslått udekket behov; ikke antall tilgjengelige kandidater.",
    },
    reason: row
      ? null
      : "Ingen kontrollert kobling til publisert yrkesanslag. Fravær av anslag dokumenterer ikke at det er lett å rekruttere.",
    ...(row
      ? { interval: { low: row.low, high: row.high, confidence: 95 } }
      : {}),
  };
}
export function navMarket(occupation: string, county: string): MarketData {
  const occupationRow = snapshot.occupationVacancies.find(
    (r) => r.code === occupation,
  );
  const countyRow = snapshot.countyVacancies.find((r) => r.code === county);
  const unavailable = (unit: string): Observation => ({
    value: null,
    unit,
    reason:
      "NAV-feed er ikke aktivert. Ingen synkronisering eller søkeindeks kjører i fase 1.",
    source: {
      name: "NAV stilling-feed",
      url: "https://navikt.github.io/pam-stilling-feed/",
      status: "unavailable",
      retrievedAt: null,
      updatedAt: null,
      table: "stilling-feed",
      period: "Ikke hentet",
      geography: countyName(county),
      population: `STYRK08 ${occupation}`,
      note: "Feed dekker ikke hele markedet, blant annet ikke Finn.no. Krever konsumenttilgang og serverstyrt synkronisering i fase 2.",
    },
  });
  return {
    countyVacancies: vacancies(
      countyRow,
      "nav-vacancies-county.xlsx",
      countyName(county),
      "Alle yrker",
    ),
    occupationVacancies: vacancies(
      occupationRow,
      "nav-vacancies-occupation.xlsx",
      "Norge",
      `STYRK08 ${occupation}`,
    ),
    countyShortage: shortage(
      snapshot.countyShortages.find((r) => r.code === county),
      countyName(county),
      "Alle yrker",
    ),
    occupationShortage: shortage(
      snapshot.occupationShortages.find((r) => r.code === occupation),
      "Norge",
      `STYRK08 ${occupation}`,
    ),
    history: occupationRow?.series ?? [],
    activeAdvertisements: unavailable("aktive annonser"),
    activePositions: unavailable("utlyste posisjoner i aktive annonser"),
  };
}
