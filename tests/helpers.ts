import search from "../data/fixtures/brreg-search.json";
import entity from "../data/fixtures/brreg-entity.json";
import units from "../data/fixtures/brreg-units.json";
import metadata from "../data/fixtures/ssb-metadata.json";
import salary from "../data/fixtures/ssb-salary.json";
import { normalizeCompany } from "../src/server/adapters/brreg";
import { emptyAnswers } from "../src/shared/worklife";
import type { AssessmentInput } from "../src/shared/types";
import type { Fetcher } from "../src/server/http";
export const retrievedAt = "2026-11-12T20:00:00.000Z";
export const fixtureCompany = normalizeCompany(entity, "entity", retrievedAt);
export const fixtureUnits = units._embedded.underenheter.map((u) =>
  normalizeCompany(u, "unit", retrievedAt),
);
export const fixtureInput = (): AssessmentInput => ({
  company: fixtureCompany,
  role: {
    title: "Salgsjef sjømat",
    occupationCode: "1221",
    count: 2,
    salary: 75000,
    municipality: "Hadsel",
    county: "18",
    workplaceConfirmed: true,
    requirements: "Salgsledelse",
    startDate: "",
    searchArea: "regional",
    flexibility: "hybrid",
  },
  worklife: {
    answers: emptyAnswers(),
    hrSupport: "unknown",
    showIllustration: true,
  },
  scenario: {
    enabled: false,
    salary: null,
    searchArea: "regional",
    requirements: "same",
    hrSupport: "unknown",
  },
});
export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
export const fixtureFetch: Fetcher = async (input) => {
  const url = new URL(String(input));
  if (url.hostname === "data.brreg.no") {
    if (url.pathname.endsWith("/enheter/976725859")) return json(entity);
    const unit = units._embedded.underenheter.find((u) =>
      url.pathname.endsWith("/underenheter/" + u.organisasjonsnummer),
    );
    if (unit) return json(unit);
    if (url.pathname.endsWith("/underenheter"))
      return url.searchParams.get("overordnetEnhet") &&
        url.searchParams.get("overordnetEnhet") !== "976725859"
        ? json({ page: { totalElements: 0, totalPages: 0, number: 0 } })
        : json(units);
    if (url.pathname.endsWith("/enheter")) return json(search);
    return json({}, 404);
  }
  if (url.pathname.endsWith("/11418/metadata")) return json(metadata);
  if (url.pathname.endsWith("/11418/data")) {
    const row = structuredClone(salary);
    const code = url.searchParams.get("valueCodes[Yrke]")!;
    row.dimension.Yrke.category.label = {
      [code]: "Testavgrensning",
    } as typeof row.dimension.Yrke.category.label;
    return json(row);
  }
  throw new Error("Unexpected fixture request: " + url.hostname + url.pathname);
};
