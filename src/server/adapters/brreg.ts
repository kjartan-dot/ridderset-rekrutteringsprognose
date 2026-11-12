import { z } from "zod";
import type { Company, CompanyPage } from "../../shared/types";
import { ApiError, JsonClient } from "../http";
const base = "https://data.brreg.no/enhetsregisteret/api";
const addressSchema = z
  .object({
    adresse: z.array(z.string()).optional(),
    postnummer: z.string().optional(),
    poststed: z.string().optional(),
    kommune: z.string().optional(),
    kommunenummer: z.string().optional(),
  })
  .passthrough();
const entitySchema = z
  .object({
    organisasjonsnummer: z.string().regex(/^\d{9}$/),
    navn: z.string(),
    overordnetEnhet: z.string().optional(),
    antallAnsatte: z.number().nonnegative().nullable().optional(),
    naeringskode1: z
      .object({ kode: z.string(), beskrivelse: z.string() })
      .optional(),
    organisasjonsform: z.object({ beskrivelse: z.string() }).optional(),
    beliggenhetsadresse: addressSchema.optional(),
    forretningsadresse: addressSchema.optional(),
    postadresse: addressSchema.optional(),
    slettedato: z.string().optional(),
    nedleggelsesdato: z.string().optional(),
  })
  .passthrough();
type Entity = z.infer<typeof entitySchema>;
export function normalizeCompany(
  row: Entity,
  kind: "entity" | "unit",
  retrievedAt: string,
): Company {
  const physical = row.beliggenhetsadresse ?? row.forretningsadresse;
  const a = physical ?? row.postadresse;
  return {
    kind,
    orgnr: row.organisasjonsnummer,
    name: row.navn,
    parentOrgnr: row.overordnetEnhet ?? null,
    employees: row.antallAnsatte ?? null,
    industryCode: row.naeringskode1?.kode ?? null,
    industry: row.naeringskode1?.beskrivelse ?? null,
    organizationForm: row.organisasjonsform?.beskrivelse ?? null,
    address: a
      ? [
          ...(a.adresse ?? []),
          [a.postnummer, a.poststed].filter(Boolean).join(" "),
          a.kommune,
        ]
          .filter(Boolean)
          .join(", ")
      : "Ikke oppgitt i registeret",
    addressType: physical ? "physical" : a ? "postal" : "missing",
    municipality: a?.kommune ?? null,
    municipalityCode: a?.kommunenummer ?? null,
    source: "brreg",
    retrievedAt,
  };
}
export class BrregAdapter {
  constructor(private client: JsonClient) {}
  async get(
    orgnr: string,
    kind: "entity" | "unit" = "entity",
  ): Promise<Company> {
    const part = kind === "entity" ? "enheter" : "underenheter";
    const data = await this.client.get(
      `${base}/${part}/${orgnr}`,
      600_000,
      `application/vnd.brreg.enhetsregisteret.${kind === "entity" ? "enhet" : "underenhet"}.v2+json`,
    );
    const parsed = entitySchema.safeParse(data.body);
    if (!parsed.success || parsed.data.organisasjonsnummer !== orgnr)
      throw new ApiError(
        502,
        "INVALID_UPSTREAM",
        "Enhetsregisteret returnerte uventede opplysninger.",
      );
    if (parsed.data.slettedato || parsed.data.nedleggelsesdato)
      throw new ApiError(
        410,
        "GONE",
        "Enheten er slettet eller nedlagt i registeret.",
      );
    return normalizeCompany(parsed.data, kind, data.retrievedAt);
  }
  async search(
    query: string,
    kind: "entity" | "unit",
    page = 0,
    parent?: string,
  ): Promise<CompanyPage> {
    const digits = query.replace(/\s/g, "");
    if (/^\d{9}$/.test(digits) && !parent) {
      try {
        return {
          items: [await this.get(digits, kind)],
          total: 1,
          page: 0,
          totalPages: 1,
          status: "live",
        };
      } catch (e) {
        if (e instanceof ApiError && e.status === 404)
          return {
            items: [],
            total: 0,
            page: 0,
            totalPages: 0,
            status: "live",
          };
        throw e;
      }
    }
    const part = kind === "entity" ? "enheter" : "underenheter";
    const params = new URLSearchParams({
      size: "20",
      page: String(page),
      ...(parent ? { overordnetEnhet: parent } : { navn: query }),
    });
    const result = await this.client.get(`${base}/${part}?${params}`);
    const schema = z.object({
      _embedded: z.record(z.string(), z.array(entitySchema)).optional(),
      page: z.object({
        totalElements: z.number().int().nonnegative(),
        totalPages: z.number().int().nonnegative(),
        number: z.number().int(),
      }),
    });
    const data = schema.safeParse(result.body);
    if (!data.success)
      throw new ApiError(
        502,
        "INVALID_UPSTREAM",
        "Enhetsregisterets søkeresultat kunne ikke leses.",
      );
    const items = (data.data._embedded?.[part] ?? [])
      .filter((x) => !x.slettedato && !x.nedleggelsesdato)
      .map((x) => normalizeCompany(x, kind, result.retrievedAt));
    return {
      items,
      total: data.data.page.totalElements,
      page: data.data.page.number,
      totalPages: data.data.page.totalPages,
      status: result.fromCache ? "cache" : "live",
    };
  }
}
