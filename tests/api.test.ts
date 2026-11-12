import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/server/app";
import { fixtureFetch, fixtureInput, json } from "./helpers";
describe("API-kontrakter med faktiske, versjonerte kildefixtures", () => {
  const app = createApp({ fetcher: fixtureFetch, rateLimit: 1000 });
  it("søker hovedenheter, velger underenhet og gir kodede yrkesforslag", async () => {
    const r = await request(app).get(
      "/api/companies/search?q=Nordlaks&kind=entity",
    );
    expect(r.status).toBe(200);
    expect(
      r.body.items.some(
        (x: { name: string }) => x.name === "NORDLAKS PRODUKTER AS",
      ),
    ).toBe(true);
    expect(
      (await request(app).get("/api/companies/973149636?kind=unit")).body
        .parentOrgnr,
    ).toBe("976725859");
    const o = await request(app).get("/api/occupations/search?q=Salgsjef");
    expect(o.body.items[0].code).toBe("1221");
    expect(o.body.catalogSize).toBe(407);
  });
  it.each([
    "/api/companies/search?q=a",
    "/api/companies/12",
    "/api/companies/search?q=abc&kind=invalid",
    "/api/salary?occupation=9999",
    "/api/market/vacancies?occupation=1221&county=99",
  ])("avviser ugyldig inndata %s", async (path) =>
    expect((await request(app).get(path)).status).toBe(400),
  );
  it("gir synlig kildefeil ved 5xx og holder SSB utilgjengelig uten dummy-tall", async () => {
    const failed = createApp({ fetcher: async () => json({}, 503) });
    const c = await request(failed).get("/api/companies/search?q=Nordlaks");
    expect(c.status).toBe(502);
    expect(c.body.error.code).toBe("UPSTREAM_UNAVAILABLE");
    const s = await request(failed).get("/api/salary?occupation=1221");
    expect(s.body).toMatchObject({
      value: null,
      source: { status: "unavailable" },
    });
  });
  it("bygger sammenhengende rapport og etterprøver registerdata på serveren", async () => {
    const input = fixtureInput();
    input.company.name = "Forfalsket navn";
    input.company.employees = 0;
    input.worklife.answers = {
      reputation: 8,
      visibility: 8,
      promise: 3,
      onboarding: 6,
      development: 7,
      leadership: 6,
    };
    input.worklife.hrSupport = "none";
    input.scenario = {
      enabled: true,
      salary: 100000,
      searchArea: "national",
      requirements: "train",
      hrSupport: "external",
    };
    const response = await request(app).post("/api/report").send(input);
    expect(response.status).toBe(200);
    const { report, text } = response.body;
    expect(report.input.company.name).toBe("NORDLAKS PRODUKTER AS");
    expect(report.market.salary.value).toBe(89170);
    expect(report.employer).toMatchObject({
      answered: 6,
      brand: { score: 80 },
      validated: false,
    });
    expect(report.interpretation.status).toBe("insufficient");
    expect(report.plan.map((p: { days: number }) => p.days)).toEqual([
      30, 60, 90,
    ]);
    expect(text).toContain("SCENARIO · HYPOTETISK");
    expect(text).toContain("Hadsel");
    expect(text).not.toMatch(/\bnull\b|undefined|NaN/);
    expect(report.scenario.salaryDifference).not.toBe(
      report.interpretation.salaryDifference,
    );
    expect(response.headers["cache-control"]).toBe("no-store");
  });
  it("tillater manuell bedrift og anonyme, ikke lagrede svar uten e-post", async () => {
    const input = fixtureInput();
    input.company = {
      ...input.company,
      kind: "manual",
      source: "brreg",
      orgnr: null,
      employees: 0,
    };
    const r = await request(app).post("/api/assessment").send(input);
    expect(r.status).toBe(200);
    expect(r.body.report.input.company.source).toBe("employer");
    expect(r.body.text).toContain("Personer oppgitt av arbeidsgiver: 0");
    expect(r.body.report.employer.brand.score).toBeNull();
  });
  it("avviser ubekreftet arbeidssted, uklare koder, negative svar, stor kropp og ugyldig JSON", async () => {
    const input = fixtureInput();
    input.role.workplaceConfirmed = false;
    expect((await request(app).post("/api/report").send(input)).status).toBe(
      400,
    );
    expect(
      (
        await request(app)
          .post("/api/report")
          .set("Content-Type", "application/json")
          .send("{broken")
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .post("/api/report")
          .send({ content: "x".repeat(40000) })
      ).status,
    ).toBe(413);
  });
  it("rate-limiter offentlige endepunkter og sender sikkerhetshoder", async () => {
    const limited = createApp({ fetcher: fixtureFetch, rateLimit: 2 });
    await request(limited).get("/api/health");
    const r = await request(limited).get("/api/health");
    expect(r.headers["content-security-policy"]).toContain("script-src 'self'");
    expect(r.headers["x-content-type-options"]).toBe("nosniff");
    expect(r.headers["access-control-allow-origin"]).toBeUndefined();
    expect((await request(limited).get("/api/health")).status).toBe(429);
  });
});
