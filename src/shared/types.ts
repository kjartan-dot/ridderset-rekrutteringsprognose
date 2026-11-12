export type SourceStatus =
  "live" | "cache" | "snapshot" | "unavailable" | "missing";
export interface Source {
  name: string;
  url: string;
  status: SourceStatus;
  retrievedAt: string | null;
  updatedAt: string | null;
  table: string;
  period: string;
  geography: string;
  population: string;
  note: string;
}
export interface Observation {
  value: number | null;
  unit: string;
  source: Source;
  reason: string | null;
  interval?: { low: number; high: number; confidence: number };
}
export interface Company {
  kind: "entity" | "unit" | "manual";
  orgnr: string | null;
  name: string;
  parentOrgnr: string | null;
  employees: number | null;
  industryCode: string | null;
  industry: string | null;
  organizationForm: string | null;
  address: string;
  addressType: "physical" | "postal" | "missing" | "manual";
  municipality: string | null;
  municipalityCode: string | null;
  source: "brreg" | "employer";
  retrievedAt: string;
}
export interface CompanyPage {
  items: Company[];
  total: number;
  page: number;
  totalPages: number;
  status: "live" | "cache";
}
export interface Occupation {
  code: string;
  name: string;
}
export interface OccupationMatch extends Occupation {
  match: "code" | "name" | "synonym";
  ambiguous: boolean;
}
export const counties = [
  ["03", "Oslo"],
  ["11", "Rogaland"],
  ["15", "Møre og Romsdal"],
  ["18", "Nordland"],
  ["31", "Østfold"],
  ["32", "Akershus"],
  ["33", "Buskerud"],
  ["34", "Innlandet"],
  ["39", "Vestfold"],
  ["40", "Telemark"],
  ["42", "Agder"],
  ["46", "Vestland"],
  ["50", "Trøndelag"],
  ["55", "Troms"],
  ["56", "Finnmark"],
] as const;
export const countyName = (code: string) =>
  counties.find((x) => x[0] === code)?.[1] ?? "Hele Norge";
export const dimensionKeys = [
  "reputation",
  "visibility",
  "promise",
  "onboarding",
  "development",
  "leadership",
] as const;
export type DimensionKey = (typeof dimensionKeys)[number];
export type Answers = Record<DimensionKey, number | null>;
export type HrSupport =
  "unknown" | "dedicated" | "shared" | "external" | "both" | "none";
export interface WorklifeInput {
  answers: Answers;
  hrSupport: HrSupport;
  showIllustration: boolean;
}
export interface WorklifeResult {
  answered: number;
  brand: { score: number | null; answered: number; total: number };
  index: { score: number | null; answered: number; total: number };
  promiseGap: number | null;
  hrAdvice: string;
  label: "Arbeidsgivers egenvurdering";
  validated: false;
}
export interface Role {
  title: string;
  occupationCode: string;
  count: number;
  salary: number | null;
  municipality: string;
  county: string;
  workplaceConfirmed: boolean;
  requirements: string;
  startDate: string;
  searchArea: "local" | "regional" | "national";
  flexibility: "onsite" | "hybrid" | "remote";
}
export interface Scenario {
  enabled: boolean;
  salary: number | null;
  searchArea: "local" | "regional" | "national";
  requirements: "same" | "essential" | "train";
  hrSupport: HrSupport;
}
export interface AssessmentInput {
  company: Company;
  role: Role;
  worklife: WorklifeInput;
  scenario: Scenario;
}
export interface MarketData {
  countyVacancies: Observation;
  occupationVacancies: Observation;
  occupationShortage: Observation;
  countyShortage: Observation;
  history: { period: string; value: number | null }[];
  activeAdvertisements: Observation;
  activePositions: Observation;
}
export interface Report {
  version: "1.0";
  createdAt: string;
  input: AssessmentInput;
  occupation: Occupation;
  market: { salary: Observation; nav: MarketData };
  employer: WorklifeResult;
  interpretation: {
    status: "insufficient";
    title: string;
    reasons: string[];
    actions: string[];
    salaryDifference: number | null;
  };
  scenario: {
    enabled: boolean;
    salaryDifference: number | null;
    notes: string[];
  };
  plan: { days: 30 | 60 | 90; title: string; actions: string[] }[];
}
