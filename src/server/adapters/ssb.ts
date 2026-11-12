import { z } from "zod";
import { ApiError, JsonClient } from "../http";
import type { Observation, Source } from "../../shared/types";
const base = "https://data.ssb.no/api/pxwebapi/v2/tables";
const dimension = z.object({
  label: z.string(),
  category: z.object({ label: z.record(z.string(), z.string()) }),
});
const metadataSchema = z.object({
  label: z.string(),
  updated: z.string(),
  dimension: z.record(z.string(), dimension),
});
const supportedTables = new Set([
  "11418",
  "03321",
  "07459",
  "09588",
  "01222",
  "07984",
  "11615",
]);
export class SsbAdapter {
  constructor(private client: JsonClient) {}
  async metadata(table: string) {
    if (!supportedTables.has(table))
      throw new ApiError(
        400,
        "INVALID_TABLE",
        "Tabellen er ikke i den gjennomgåtte kildekatalogen.",
      );
    const raw = await this.client.get(
      `${base}/${table}/metadata?lang=no`,
      6 * 3600_000,
    );
    const parsed = metadataSchema.safeParse(raw.body);
    if (!parsed.success)
      throw new ApiError(
        502,
        "INVALID_UPSTREAM",
        "SSBs tabellmetadata kunne ikke leses.",
      );
    return {
      ...parsed.data,
      retrievedAt: raw.retrievedAt,
      status: raw.fromCache ? ("cache" as const) : ("live" as const),
    };
  }
  async salary(occupation: string): Promise<Observation> {
    const meta = await this.metadata("11418");
    const year = Object.keys(meta.dimension.Tid.category.label).sort().at(-1)!;
    const source: Source = {
      name: "SSB Statistikkbanken",
      url: "https://www.ssb.no/statbank/table/11418",
      status: meta.status,
      retrievedAt: meta.retrievedAt,
      updatedAt: meta.updated,
      table: "11418",
      period: year,
      geography: "Norge",
      population:
        "Alle sektorer, begge kjønn, heltids- og deltidsansatte (heltidsekvivalenter)",
      note: "Median månedslønn inklusive uregelmessige tillegg og bonus, uten overtid. Nasjonalt nivå; ingen lokal median. Referansemåned november.",
    };
    if (!meta.dimension.Yrke.category.label[occupation])
      return {
        value: null,
        unit: "kr/måned",
        source: { ...source, status: "missing" },
        reason: "Yrket finnes ikke i tabellens publiserte utvalg.",
      };
    const values = {
      MaaleMetode: "01",
      Yrke: occupation,
      Sektor: "ALLE",
      Kjonn: "0",
      AvtaltVanlig: "0",
      ContentsCode: "Manedslonn",
      Tid: year,
    };
    const params = new URLSearchParams({ lang: "no" });
    Object.entries(values).forEach(([key, value]) =>
      params.set(`valueCodes[${key}]`, value),
    );
    const response = await this.client.get(
      `${base}/11418/data?${params}`,
      12 * 3600_000,
    );
    const parsed = z
      .object({
        updated: z.string(),
        size: z.array(z.number()),
        dimension: z.record(z.string(), dimension),
        value: z.union([
          z.array(z.number().nullable()),
          z.record(z.string(), z.number().nullable()),
        ]),
      })
      .safeParse(response.body);
    if (
      !parsed.success ||
      parsed.data.size.reduce((a, b) => a * b, 1) !== 1 ||
      Object.entries(values).some(
        ([k, v]) => !parsed.data.dimension[k]?.category.label[v],
      )
    )
      throw new ApiError(
        502,
        "INVALID_UPSTREAM",
        "SSB returnerte en annen avgrensning enn forespurt.",
      );
    const value =
      (Array.isArray(parsed.data.value)
        ? parsed.data.value[0]
        : parsed.data.value["0"]) ?? null;
    if (value !== null && value < 0)
      throw new ApiError(
        502,
        "INVALID_UPSTREAM",
        "SSB returnerte en ugyldig lønnsverdi.",
      );
    return {
      value,
      unit: "kr/måned",
      source: {
        ...source,
        retrievedAt: response.retrievedAt,
        updatedAt: parsed.data.updated,
        status:
          value === null ? "missing" : response.fromCache ? "cache" : "live",
      },
      reason:
        value === null
          ? "SSB har ikke publisert en tallverdi for denne avgrensningen (manglende eller skjermet)."
          : null,
    };
  }
}
export function unavailableSalary(reason: string): Observation {
  return {
    value: null,
    unit: "kr/måned",
    reason,
    source: {
      name: "SSB Statistikkbanken",
      url: "https://www.ssb.no/statbank/table/11418",
      status: "unavailable",
      retrievedAt: null,
      updatedAt: null,
      table: "11418",
      period: "Ikke hentet",
      geography: "Norge",
      population: "Ikke hentet",
      note: "Ingen erstatningstall fra legacy benyttes.",
    },
  };
}
