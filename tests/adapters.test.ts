import { describe, expect, it, vi } from "vitest";
import { ApiError, JsonClient } from "../src/server/http";
import { BrregAdapter, normalizeCompany } from "../src/server/adapters/brreg";
import { SsbAdapter } from "../src/server/adapters/ssb";
import { navMarket } from "../src/server/adapters/nav";
import { fixtureFetch, json, retrievedAt } from "./helpers";
import metadata from "../data/fixtures/ssb-metadata.json";
import salary from "../data/fixtures/ssb-salary.json";
describe("HTTP-grense", () => {
  it("samler samtidige oppslag, bruker TTL og henter på nytt etter utløp", async () => {
    let now = 0;
    const fn = vi.fn(async () => json({ value: 12 }));
    const client = new JsonClient(fn, () => now);
    const [a, b] = await Promise.all([
      client.get("https://example.test", 100),
      client.get("https://example.test", 100),
    ]);
    expect(a.body).toEqual(b.body);
    expect(fn).toHaveBeenCalledTimes(1);
    expect((await client.get("https://example.test", 100)).fromCache).toBe(
      true,
    );
    now = 101;
    await client.get("https://example.test", 100);
    expect(fn).toHaveBeenCalledTimes(2);
  });
  it("prøver 5xx én gang, men cacher ikke transportfeil", async () => {
    const fn = vi.fn(async () => json({}, 503));
    const client = new JsonClient(fn);
    await expect(client.get("https://example.test")).rejects.toMatchObject({
      code: "UPSTREAM_UNAVAILABLE",
      upstreamStatus: 503,
    });
    expect(fn).toHaveBeenCalledTimes(2);
    await expect(client.get("https://example.test")).rejects.toBeInstanceOf(
      ApiError,
    );
    expect(fn).toHaveBeenCalledTimes(4);
  });
  it.each([404, 410, 429])("behandler %i uten skjult retry", async (status) => {
    const fn = vi.fn(async () => json({}, status));
    await expect(
      new JsonClient(fn).get("https://example.test"),
    ).rejects.toMatchObject({ upstreamStatus: status });
    expect(fn).toHaveBeenCalledTimes(1);
  });
  it("avviser ødelagt JSON og tidsavbrudd", async () => {
    await expect(
      new JsonClient(async () => new Response("broken")).get(
        "https://example.test",
      ),
    ).rejects.toMatchObject({ code: "INVALID_UPSTREAM" });
    const fail = vi.fn(async () => {
      throw new Error("Timeout");
    });
    await expect(
      new JsonClient(fail).get("https://example.test"),
    ).rejects.toMatchObject({ status: 502 });
    expect(fail).toHaveBeenCalledTimes(2);
  });
});
describe("Brreg", () => {
  it("holder 0 personer og ukjent antall adskilt og lager ikke HR-data", () => {
    const minimal = { navn: "Test", organisasjonsnummer: "123456789" };
    expect(
      normalizeCompany({ ...minimal, antallAnsatte: 0 }, "entity", retrievedAt)
        .employees,
    ).toBe(0);
    expect(
      normalizeCompany(minimal, "entity", retrievedAt).employees,
    ).toBeNull();
    expect(normalizeCompany(minimal, "entity", retrievedAt)).not.toHaveProperty(
      "hrSupport",
    );
  });
  it("leser hovedenheter, underenheter og pagineringsmetadata", async () => {
    const brreg = new BrregAdapter(new JsonClient(fixtureFetch));
    const units = await brreg.search("", "unit", 0, "976725859");
    expect(units.items).toHaveLength(3);
    const unit = await brreg.get("973149636", "unit");
    expect(unit).toMatchObject({
      kind: "unit",
      parentOrgnr: "976725859",
      municipality: "HADSEL",
      orgnr: "973149636",
    });
    expect((await brreg.search("000000000", "entity")).items).toEqual([]);
  });
  it("beholder postadresse som postadresse og avviser nedlagte enheter", async () => {
    expect(
      normalizeCompany(
        {
          navn: "Test",
          organisasjonsnummer: "123456789",
          postadresse: { kommune: "OSLO" },
        },
        "entity",
        retrievedAt,
      ).addressType,
    ).toBe("postal");
    const brreg = new BrregAdapter(
      new JsonClient(async () =>
        json({
          navn: "Test",
          organisasjonsnummer: "123456789",
          nedleggelsesdato: "2026-01-01",
        }),
      ),
    );
    await expect(brreg.get("123456789", "unit")).rejects.toMatchObject({
      status: 410,
    });
  });
});
describe("SSB", () => {
  it("spørrer median, siste år, alle sektorer/arbeidstider og bevarer metadata", async () => {
    const fn = vi.fn(fixtureFetch);
    const adapter = new SsbAdapter(new JsonClient(fn));
    const s = await adapter.salary("1221");
    expect(s).toMatchObject({
      value: 89170,
      source: {
        period: "2025",
        table: "11418",
        geography: "Norge",
        updatedAt: "2026-08-28T06:00:00Z",
      },
    });
    const url = new URL(String(fn.mock.calls[1][0]));
    expect(url.searchParams.get("valueCodes[MaaleMetode]")).toBe("01");
    expect(url.searchParams.get("valueCodes[Sektor]")).toBe("ALLE");
    expect(url.searchParams.get("valueCodes[AvtaltVanlig]")).toBe("0");
    expect((await adapter.salary("1221")).source.status).toBe("cache");
  });
  it("gjør skjermet celle til manglende tall; ingen null-konvertering til 0", async () => {
    const missing = { ...salary, value: [null] };
    const adapter = new SsbAdapter(
      new JsonClient(async (url) =>
        json(String(url).includes("metadata") ? metadata : missing),
      ),
    );
    expect(await adapter.salary("1221")).toMatchObject({
      value: null,
      source: { status: "missing" },
    });
  });
  it("avviser en annen yrkes-/måleavgrensning og ikke-gjennomgåtte tabeller", async () => {
    const adapter = new SsbAdapter(
      new JsonClient(async (url) =>
        json(String(url).includes("metadata") ? metadata : salary),
      ),
    );
    await expect(adapter.salary("2223")).rejects.toMatchObject({
      code: "INVALID_UPSTREAM",
    });
    await expect(adapter.metadata("99999")).rejects.toMatchObject({
      status: 400,
    });
  });
});
describe("NAV", () => {
  it("bevarer faktisk publiseringsnivå, periode og KI", () => {
    const d = navMarket("2223", "18");
    expect(d.occupationVacancies).toMatchObject({
      value: 2257,
      source: {
        period: "2026-10",
        geography: "Norge",
        population: "STYRK08 2223",
        status: "snapshot",
      },
    });
    expect(d.countyVacancies).toMatchObject({
      value: 1589,
      source: { geography: "Nordland", population: "Alle yrker" },
    });
    expect(d.occupationShortage).toMatchObject({
      value: 1850,
      interval: { low: 1550, high: 2400, confidence: 95 },
    });
  });
  it("holder utilgjengelige aktive tall og ikke-publiserte yrkestall adskilt fra null", () => {
    const d = navMarket("1221", "55");
    expect(d.activeAdvertisements.value).toBeNull();
    expect(d.activePositions.source.status).toBe("unavailable");
    expect(d.occupationVacancies.value).toBeNull();
    expect(d.history).toEqual([]);
    expect(d.countyVacancies.source.geography).toBe("Troms");
  });
});
