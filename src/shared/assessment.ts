import type {
  AssessmentInput,
  MarketData,
  Observation,
  Occupation,
  Report,
} from "./types";
import { assessWorklife, dimensions, hrAdvice, hrLabels } from "./worklife";
import { date, difference, differenceText, money, number } from "./format";
import { countyName } from "./types";
export function buildReport(
  input: AssessmentInput,
  occupation: Occupation,
  salary: Observation,
  nav: MarketData,
): Report {
  const employer = assessWorklife(input.worklife);
  const delta = difference(input.role.salary, salary.value);
  const low = dimensions.filter(
    (d) =>
      input.worklife.answers[d.key] !== null &&
      input.worklife.answers[d.key]! <= 4,
  );
  const actions = [
    `Kontroller at «${input.role.title}» faktisk tilhører STYRK08 ${occupation.code} (${occupation.name}). Skill nødvendige krav fra kompetanse som kan læres.`,
    delta !== null && delta < 0
      ? `Lønnstilbudet er ${Math.abs(delta)} % under nasjonal median. Undersøk ansvar, tillegg, erfaring og sektor før dere fastsetter lønnsrammen.`
      : "Kontroller lønnsrammen mot ansvar, erfaring og sektor. Nasjonal median dokumenterer ikke lokal konkurranseevne.",
    employer.hrAdvice,
    low.length
      ? `Undersøk følgende forhold sammen med ansatte og kandidater: ${low.map((d) => `«${d.label}»`).join(", ")}. Lav egenvurdering gir grunn til å undersøke videre.`
      : employer.answered < 6
        ? "Fullfør de ubesvarte Worklife-spørsmålene og innhent uavhengige tilbakemeldinger før dere konkluderer om arbeidsplassen."
        : "Etterprøv Worklife-egenvurderingen med ansatte og kandidater; avtal hvordan løftene følges opp ved oppstart.",
    input.role.searchArea === "local"
      ? "Test regionalt eller nasjonalt søk og praktisk fleksibilitet. Kartlegg faktiske reisemuligheter før dere lover et pendleområde."
      : "Kartlegg det valgte søkeområdet og avtal hvordan kandidater utenfor kommunen kan inkluderes.",
  ];
  const notes = input.scenario.enabled
    ? [
        "Scenarioet er hypotetisk og endrer ikke markedsdataene eller den oppgitte bestillingen.",
        input.scenario.searchArea === "national"
          ? "Nasjonalt søk åpner en større geografi; faktisk kandidattilgang er ikke beregnet."
          : input.scenario.searchArea === "regional"
            ? "Regionalt søk krever kontroll av pendling og praktiske løsninger."
            : "Lokalt søk avgrenser geografien. Kandidattilgangen må undersøkes.",
        input.scenario.requirements === "train"
          ? "Et opplæringsløp kan åpne for annen bakgrunn. Sett av ledertid, opplæring og budsjett."
          : input.scenario.requirements === "essential"
            ? "Fjern krav som ikke er nødvendige for oppgavene, og avklar hvordan kompetanse vurderes."
            : "Kravene er uendret. Test dem mot reelle kandidater.",
        hrAdvice[input.scenario.hrSupport],
      ]
    : [];
  return {
    version: "1.0",
    createdAt: new Date().toISOString(),
    input,
    occupation,
    market: { salary, nav },
    employer,
    interpretation: {
      status: "insufficient",
      title: "Avklar markedet før dere konkluderer",
      reasons: [
        "Det finnes ikke et tilstrekkelig grunnlag for å beregne samlet rekrutteringsrisiko, sannsynlighet eller tid til ansettelse.",
        "Aktive yrkesvise annonser og posisjoner er utilgjengelige. Publisert tilgang og mangelanslag måler andre forhold.",
        "Kvalifisert kandidattilgang og faktiske prosessutfall er ikke dokumentert. Worklife-svarene er arbeidsgiverens egne anslag.",
      ],
      actions,
      salaryDifference: delta,
    },
    scenario: {
      enabled: input.scenario.enabled,
      salaryDifference: input.scenario.enabled
        ? difference(input.scenario.salary, salary.value)
        : null,
      notes,
    },
    plan: [
      {
        days: 30,
        title: "Avklar og undersøk",
        actions: [
          "Fastsett oppgaver, ufravikelige krav, lønnsramme og prosesseier.",
          "Kartlegg relevante kandidater og søkekanaler; kontroller arbeidssted og yrkeskode.",
        ],
      },
      {
        days: 60,
        title: "Test og juster",
        actions: [
          "Følg kvalifiserte kandidater, tilbakemeldinger og årsaker til frafall.",
          "Juster krav, lønn eller søkeområde på bakgrunn av observerte signaler.",
        ],
      },
      {
        days: 90,
        title: "Følg opp og lær",
        actions: [
          "Evaluer prosessen og dokumenter hva som faktisk virket.",
          "Følg opp forventninger og onboarding hvis noen er ansatt; fortsett markedstesten hvis stillingen står åpen.",
        ],
      },
    ],
  };
}
export function reportText(r: Report): string {
  const { company: c, role, worklife } = r.input;
  const observation = (label: string, o: Observation) =>
    `${label}: ${o.value === null ? (o.reason ?? "Mangler tall") : `${number(o.value)} ${o.unit}`}${o.interval ? ` (95 % KI ${number(o.interval.low)}–${number(o.interval.high)})` : ""}\n${o.source.name} · ${o.source.table} · ${o.source.period} · ${o.source.geography} · ${o.source.population} · ${o.source.status}\nHentet ${date(o.source.retrievedAt)}, oppdatert ${date(o.source.updatedAt)}. ${o.source.note}\nKilde: ${o.source.url}`;
  return [
    "RIDDERSET | REKRUTTERINGSINNSIKT",
    `Utarbeidet ${date(r.createdAt)} · metode ${r.version}`,
    "",
    "BESTILLING",
    `${c.name} · ${c.kind === "unit" ? "underenhet" : c.kind === "manual" ? "oppgitt av arbeidsgiver" : "hovedenhet"} · org.nr. ${c.orgnr ?? "Ikke oppgitt"}`,
    `Hovedenhet: ${c.parentOrgnr ?? "Ikke relevant / ikke oppgitt"}`,
    `Kilde til virksomhet: ${c.source === "brreg" ? "Brønnøysundregistrene" : "Oppgitt av arbeidsgiver"} · oppslag ${date(c.retrievedAt)}`,
    `${c.source === "employer" ? "Personer oppgitt av arbeidsgiver" : "Registrerte personer"}: ${c.employees === null ? "Ikke oppgitt" : number(c.employees)} (ikke årsverk)`,
    `Næring: ${c.industryCode ?? "Ikke oppgitt"} · ${c.industry ?? "Ikke oppgitt"}`,
    `Organisasjonsform: ${c.organizationForm ?? "Ikke oppgitt"}`,
    `Registrert adresse: ${c.address}`,
    `Bekreftet arbeidssted: ${role.municipality}, ${countyName(role.county)}`,
    `Stillingstittel: ${role.title}`,
    `Yrkesgruppe: ${r.occupation.name} · STYRK08 ${r.occupation.code}`,
    `Antall ansettelser: ${role.count}`,
    `Tilbudt månedslønn: ${role.salary === null ? "Ikke oppgitt" : money(role.salary)}`,
    `Krav: ${role.requirements || "Ikke oppgitt"}`,
    `Ønsket oppstart: ${role.startDate ? date(role.startDate) : "Ikke oppgitt (ingen beregnet ansettelsesdato)"}`,
    `Søkeområde: ${{ local: "Lokalt", regional: "Regionalt", national: "Nasjonalt" }[role.searchArea]} · fleksibilitet: ${{ onsite: "På arbeidsstedet", hybrid: "Hybrid", remote: "Remote" }[role.flexibility]}`,
    "",
    "MARKEDSDATA",
    observation("Median månedslønn", r.market.salary),
    differenceText(r.interpretation.salaryDifference),
    observation(
      "Publiserte stillinger, fylke / alle yrker",
      r.market.nav.countyVacancies,
    ),
    observation(
      "Publiserte stillinger, yrke / Norge",
      r.market.nav.occupationVacancies,
    ),
    observation(
      "Anslått mangel, yrke / Norge",
      r.market.nav.occupationShortage,
    ),
    observation(
      "Anslått mangel, fylke / alle yrker",
      r.market.nav.countyShortage,
    ),
    observation("Aktive annonser", r.market.nav.activeAdvertisements),
    observation(
      "Utlyste posisjoner i aktive annonser",
      r.market.nav.activePositions,
    ),
    "",
    "ARBEIDSGIVERPROFIL · EGENVURDERING",
    `${r.employer.answered} av 6 spørsmål besvart. Ingen validerte kandidat- eller medarbeidermålinger.`,
    ...dimensions.map(
      (d) =>
        `${d.label}: ${worklife.answers[d.key] === null ? "Ubesvart" : `${worklife.answers[d.key]}/10`}`,
    ),
    `Brand: ${r.employer.brand.score === null ? "Ikke beregnet" : `${r.employer.brand.score}/100 (illustrasjon, ${r.employer.brand.answered}/2 besvart)`}`,
    `Index: ${r.employer.index.score === null ? "Ikke beregnet" : `${r.employer.index.score}/100 (illustrasjon, ${r.employer.index.answered}/4 besvart)`}`,
    `HR-støtte: ${hrLabels[worklife.hrSupport]}. ${r.employer.hrAdvice}`,
    "",
    "FORTOLKNING",
    ...r.interpretation.reasons,
    "",
    "PRIORITERTE TILTAK",
    ...r.interpretation.actions.map((a, i) => `${i + 1}. ${a}`),
    "",
    "SCENARIO · HYPOTETISK",
    ...(r.scenario.enabled
      ? [
          `Tenkt lønn: ${r.input.scenario.salary === null ? "Ikke oppgitt" : money(r.input.scenario.salary)} · ${differenceText(r.scenario.salaryDifference)}`,
          ...r.scenario.notes,
        ]
      : ["Ingen scenarioendringer aktivert."]),
    "",
    "30/60/90-DAGERS PLAN",
    ...r.plan.flatMap((p) => [
      `Innen ${p.days} dager: ${p.title}`,
      ...p.actions,
    ]),
    "Planen er milepæler for arbeidet, ingen prognose for når stillingen blir besatt.",
  ].join("\n");
}
