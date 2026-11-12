import { z } from "zod";
import { counties, dimensionKeys } from "./types";
const text = (max = 200) => z.string().trim().max(max);
const orgnr = z.string().regex(/^\d{9}$/);
export const companySchema = z
  .object({
    kind: z.enum(["entity", "unit", "manual"]),
    orgnr: orgnr.nullable(),
    name: text().min(2),
    parentOrgnr: orgnr.nullable(),
    employees: z.number().int().min(0).max(10_000_000).nullable(),
    industryCode: text().nullable(),
    industry: text().nullable(),
    organizationForm: text().nullable(),
    address: text(500),
    addressType: z.enum(["physical", "postal", "missing", "manual"]),
    municipality: text(90).nullable(),
    municipalityCode: z
      .string()
      .regex(/^\d{4}$/)
      .nullable(),
    source: z.enum(["brreg", "employer"]),
    retrievedAt: z.iso.datetime({ offset: true }),
  })
  .superRefine((company, context) => {
    if (company.kind !== "manual" && company.orgnr === null) {
      context.addIssue({
        code: "custom",
        path: ["orgnr"],
        message: "Registeroppslag krever organisasjonsnummer.",
      });
    }
  });
export const worklifeSchema = z.object({
  answers: z.object(
    Object.fromEntries(
      dimensionKeys.map((k) => [k, z.number().int().min(0).max(10).nullable()]),
    ) as Record<(typeof dimensionKeys)[number], z.ZodNullable<z.ZodNumber>>,
  ),
  hrSupport: z.enum([
    "unknown",
    "dedicated",
    "shared",
    "external",
    "both",
    "none",
  ]),
  showIllustration: z.boolean(),
});
const salary = z.number().min(1).max(2_000_000).nullable();
const searchArea = z.enum(["local", "regional", "national"]);
export const assessmentSchema = z.object({
  company: companySchema,
  role: z.object({
    title: text().min(2),
    occupationCode: z.string().regex(/^\d{4}$/),
    count: z.number().int().min(1).max(1000),
    salary,
    municipality: text(90).min(2),
    county: z.enum(counties.map((x) => x[0]) as [string, ...string[]]),
    workplaceConfirmed: z.literal(true),
    requirements: text(2000),
    startDate: z.union([z.literal(""), z.iso.date()]),
    searchArea,
    flexibility: z.enum(["onsite", "hybrid", "remote"]),
  }),
  worklife: worklifeSchema,
  scenario: z.object({
    enabled: z.boolean(),
    salary,
    searchArea,
    requirements: z.enum(["same", "essential", "train"]),
    hrSupport: worklifeSchema.shape.hrSupport,
  }),
});
