import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Compass,
  Database,
  FileCheck2,
  Info,
  LockKeyhole,
  MapPin,
  RotateCcw,
} from "lucide-react";
import type {
  AssessmentInput,
  Company as CompanyModel,
  MarketData,
  Observation,
  Occupation,
  OccupationMatch,
  Report,
  Role,
  Scenario,
  WorklifeInput,
} from "../shared/types";
import { countyName } from "../shared/types";
import { assessmentSchema } from "../shared/contracts";
import { emptyAnswers } from "../shared/worklife";
import { difference, differenceText, money } from "../shared/format";
import { api } from "./api";
import { Company } from "./Company";
import { SearchBox } from "./SearchBox";
import { Market } from "./Market";
import { HrSelect, Worklife } from "./Worklife";
import { ReportView } from "./ReportView";
const initialRole = (): Role => ({
  title: "",
  occupationCode: "",
  count: 1,
  salary: null,
  municipality: "",
  county: "",
  workplaceConfirmed: false,
  requirements: "",
  startDate: "",
  searchArea: "regional",
  flexibility: "onsite",
});
const initialWorklife = (): WorklifeInput => ({
  answers: emptyAnswers(),
  hrSupport: "unknown",
  showIllustration: true,
});
const initialScenario = (): Scenario => ({
  enabled: false,
  salary: null,
  searchArea: "regional",
  requirements: "same",
  hrSupport: "unknown",
});
const steps = [
  "Arbeidsgiver",
  "Stilling",
  "Markedsbilde",
  "Worklife",
  "Din vurdering",
];
export default function App() {
  const [step, setStep] = useState(0),
    [company, setCompany] = useState<CompanyModel | null>(null),
    [role, setRole] = useState<Role>(initialRole);
  const [occupation, setOccupation] = useState<Occupation | null>(null),
    [occupationQuery, setOccupationQuery] = useState("");
  const [worklife, setWorklife] = useState<WorklifeInput>(initialWorklife),
    [scenario, setScenario] = useState<Scenario>(initialScenario);
  const [salary, setSalary] = useState<Observation | null>(null),
    [nav, setNav] = useState<MarketData | null>(null),
    [marketLoading, setMarketLoading] = useState(false),
    [marketError, setMarketError] = useState(""),
    [retry, setRetry] = useState(0);
  const [report, setReport] = useState<{ report: Report; text: string } | null>(
      null,
    ),
    [generating, setGenerating] = useState(false),
    [error, setError] = useState("");
  const stage = useRef<HTMLDivElement>(null);
  const reportRequest = useRef<AbortController | null>(null);
  const isCompanyReady =
    company !== null &&
    role.municipality.trim().length >= 2 &&
    !!role.county &&
    role.workplaceConfirmed;
  const isRoleReady =
    role.title.trim().length >= 2 &&
    !!occupation &&
    role.count >= 1 &&
    role.count <= 1000 &&
    Number.isInteger(role.count) &&
    (role.salary === null || (role.salary > 0 && role.salary <= 2000000));
  useEffect(() => {
    reportRequest.current?.abort();
    setGenerating(false);
    setReport(null);
    setError("");
  }, [company, role, worklife, scenario]);
  useEffect(() => {
    setSalary(null);
    setNav(null);
    setMarketError("");
    if (!role.occupationCode || !role.county) {
      setMarketLoading(false);
      return;
    }
    const controller = new AbortController();
    setMarketLoading(true);
    Promise.all([
      api<Observation>(`/salary?occupation=${role.occupationCode}`, {
        signal: controller.signal,
      }),
      api<MarketData>(
        `/market/vacancies?occupation=${role.occupationCode}&county=${role.county}`,
        { signal: controller.signal },
      ),
    ])
      .then(([s, n]) => {
        if (!controller.signal.aborted) {
          setSalary(s);
          setNav(n);
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) setMarketError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setMarketLoading(false);
      });
    return () => controller.abort();
  }, [role.occupationCode, role.county, retry]);
  function move(to: number) {
    setError("");
    setStep(to);
    requestAnimationFrame(() => stage.current?.focus());
  }
  function next() {
    if (step === 0 && !isCompanyReady) {
      setError(
        "Velg virksomhet, fyll inn kommune og fylke, og bekreft faktisk arbeidssted.",
      );
      return;
    }
    if (step === 1 && !isRoleReady) {
      setError(
        "Fyll inn stillingstittel, velg et yrkesforslag og oppgi et gyldig antall ansettelser. Lønn kan stå tomt.",
      );
      return;
    }
    move(Math.min(step + 1, 4));
  }
  async function generate() {
    const input = { company, role, worklife, scenario };
    const parsed = assessmentSchema.safeParse(input);
    if (!parsed.success || !occupation) {
      setError(
        "Fullfør arbeidsgiver og stilling først. Arbeidssted må bekreftes, og yrket må velges fra forslagslisten.",
      );
      return;
    }
    reportRequest.current?.abort();
    const controller = new AbortController();
    reportRequest.current = controller;
    setGenerating(true);
    setError("");
    try {
      const data = await api<{ report: Report; text: string }>("/report", {
        method: "POST",
        body: JSON.stringify(parsed.data satisfies AssessmentInput),
        signal: controller.signal,
      });
      if (!controller.signal.aborted) {
        setReport(data);
        requestAnimationFrame(() => stage.current?.focus());
      }
    } catch (e) {
      if (!controller.signal.aborted)
        setError(
          e instanceof Error ? e.message : "Rapporten kunne ikke lages.",
        );
    } finally {
      if (reportRequest.current === controller) setGenerating(false);
    }
  }
  function reset() {
    setCompany(null);
    setRole(initialRole());
    setOccupation(null);
    setOccupationQuery("");
    setWorklife(initialWorklife());
    setScenario(initialScenario());
    setReport(null);
    move(0);
  }
  return (
    <>
      <a className="skip-link" href="#workspace">
        Hopp til verktøyet
      </a>
      <div className="preview-banner">
        <span className="status-dot" />
        LOKAL FORHÅNDSVISNING <span className="banner-divider">/</span> FASE 0 +
        1<span className="preview-right">Ingen svar lagres på serveren</span>
      </div>
      <header className="site-header">
        <a className="wordmark" href="/" aria-label="Ridderset – startside">
          <span className="brand-symbol" aria-hidden="true">
            r
          </span>
          ridderset<span className="brand-dot">.</span>
        </a>
        <span className="header-product">REKRUTTERINGSINNSIKT</span>
        <button type="button" className="text-button reset" onClick={reset}>
          <RotateCcw size={15} />
          Start på nytt
        </button>
      </header>
      <main>
        <section className="hero">
          <div className="hero-content">
            <div className="eyebrow light">
              <span className="tiny-line" />
              INNSIKT FØR UTLYSNING
            </div>
            <h1>
              Et bedre grunnlag.
              <br />
              <em>Før dere rekrutterer.</em>
            </h1>
            <p>
              Forstå markedet. Vurder arbeidsplassen.
              <br className="desktop-break" /> Ta de riktige grepene før neste
              ansettelse.
            </p>
            <a className="hero-jump" href="#workspace">
              Start vurderingen <ArrowDown size={16} />
            </a>
          </div>
          <div className="hero-aside">
            <div className="orbit" aria-hidden="true">
              <span />
              <i />
              <Compass size={52} />
            </div>
            <span className="eyebrow light">FRA FAKTA TIL HANDLING</span>
            <p>
              Hva vet vi?
              <br />
              Hva må vi undersøke?
              <br />
              <strong>Hva bør dere gjøre?</strong>
            </p>
            <div className="hero-source">
              BRREG <span>+</span> SSB <span>+</span> NAV
            </div>
          </div>
          <div className="hero-number" aria-hidden="true">
            01—05
          </div>
        </section>
        <div className="workspace" id="workspace">
          <div className="workspace-heading">
            <div>
              <span className="eyebrow">DERES NESTE ANSETTELSE</span>
              <h2>Bygg et beslutningsgrunnlag</h2>
            </div>
            <span className="privacy">
              <LockKeyhole size={14} />
              Ingen innlogging eller e-post
            </span>
          </div>
          <nav className="stepper" aria-label="Steg i rekrutteringsvurderingen">
            {steps.map((label, i) => (
              <button
                key={label}
                type="button"
                aria-current={step === i ? "step" : undefined}
                onClick={() => move(i)}
              >
                <span className="step-number">
                  {i < step ? (
                    <Check size={15} />
                  ) : (
                    String(i + 1).padStart(2, "0")
                  )}
                </span>
                <span>{label}</span>
                {i < 4 && <ChevronRight className="step-chevron" size={15} />}
              </button>
            ))}
          </nav>
          <div
            className={`workspace-grid ${report && step === 4 ? "with-report" : ""}`}
          >
            <div
              className="stage"
              ref={stage}
              tabIndex={-1}
              aria-label={steps[step]}
            >
              <div className="stage-body">
                {step === 0 && (
                  <Company
                    company={company}
                    onCompany={setCompany}
                    role={role}
                    onRole={setRole}
                  />
                )}
                {step === 1 && (
                  <>
                    <div className="section-intro">
                      <span className="eyebrow">02 / STILLING OG KRAV</span>
                      <h3>Hvem trenger dere?</h3>
                      <p>
                        En stillingstittel kan passe flere yrkesgrupper. Velg
                        koden som beskriver arbeidsoppgavene, og korriger
                        forslaget ved behov.
                      </p>
                    </div>
                    <div className="field">
                      <label htmlFor="role-title">
                        Konkret stillingstittel
                      </label>
                      <input
                        id="role-title"
                        value={role.title}
                        onChange={(e) =>
                          setRole({ ...role, title: e.target.value })
                        }
                        maxLength={200}
                        placeholder="For eksempel salgsjef sjømat"
                      />
                    </div>
                    <SearchBox<OccupationMatch>
                      label="Søk etter yrke eller STYRK08-kode"
                      query={occupationQuery}
                      onQuery={(v) => {
                        setOccupationQuery(v);
                        setOccupation(null);
                        setRole({ ...role, occupationCode: "" });
                      }}
                      endpoint="/occupations/search"
                      minLength={1}
                      onPick={(o) => {
                        setOccupation(o);
                        setOccupationQuery(o.name);
                        setRole({
                          ...role,
                          occupationCode: o.code,
                          title: role.title || occupationQuery,
                        });
                      }}
                      itemKey={(o) => o.code}
                      itemTitle={(o) => o.name}
                      itemDetail={(o) =>
                        `STYRK08 ${o.code} · ${o.ambiguous ? "Flere mulige koder – kontroller fagområde" : "Yrkesgruppe, ikke stillingsannonse"}`
                      }
                      placeholder="Salgsjef, sykepleier, tømrer …"
                      hint="407 yrkesgrupper. Synonymer er forslag til kodevalg, ikke en offisiell klassifisering av stillingen."
                    />
                    {occupation && (
                      <div className="occupation-selected">
                        <Check size={17} />
                        <span>
                          <b>{occupation.name}</b>
                          <small>
                            Valgt STYRK08 {occupation.code} · søk på nytt for å
                            endre
                          </small>
                        </span>
                      </div>
                    )}
                    <div className="form-grid">
                      <div className="field">
                        <label htmlFor="role-count">
                          Antall ønskede ansettelser
                        </label>
                        <input
                          id="role-count"
                          type="number"
                          min={1}
                          max={1000}
                          step={1}
                          value={role.count || ""}
                          onChange={(e) =>
                            setRole({ ...role, count: Number(e.target.value) })
                          }
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="role-salary">
                          Tilbudt månedslønn i kr (valgfritt)
                        </label>
                        <input
                          id="role-salary"
                          type="number"
                          min={1}
                          max={2000000}
                          value={role.salary ?? ""}
                          onChange={(e) =>
                            setRole({
                              ...role,
                              salary:
                                e.target.value === ""
                                  ? null
                                  : Number(e.target.value),
                            })
                          }
                          placeholder="For eksempel 65 000"
                        />
                        <small>
                          Inkludert tillegg og bonus for sammenligning med SSB,
                          uten overtid.
                        </small>
                      </div>
                      <div className="field">
                        <label htmlFor="search-area">Relevant søkeområde</label>
                        <select
                          id="search-area"
                          value={role.searchArea}
                          onChange={(e) =>
                            setRole({
                              ...role,
                              searchArea: e.target.value as Role["searchArea"],
                            })
                          }
                        >
                          <option value="local">Lokalt / kommunen</option>
                          <option value="regional">
                            Regionalt / mulig pendling
                          </option>
                          <option value="national">Nasjonalt</option>
                        </select>
                        <small>
                          Pendlemuligheter må undersøkes; ingen reisetid
                          beregnes.
                        </small>
                      </div>
                      <div className="field">
                        <label htmlFor="role-flex">Fleksibilitet</label>
                        <select
                          id="role-flex"
                          value={role.flexibility}
                          onChange={(e) =>
                            setRole({
                              ...role,
                              flexibility: e.target
                                .value as Role["flexibility"],
                            })
                          }
                        >
                          <option value="onsite">På arbeidsstedet</option>
                          <option value="hybrid">Hybrid</option>
                          <option value="remote">Remote / fjernarbeid</option>
                        </select>
                      </div>
                      <div className="field span-two">
                        <label htmlFor="role-requirements">
                          Nødvendige krav og kompetanse (valgfritt)
                        </label>
                        <textarea
                          id="role-requirements"
                          value={role.requirements}
                          maxLength={2000}
                          rows={3}
                          onChange={(e) =>
                            setRole({ ...role, requirements: e.target.value })
                          }
                          placeholder="Hva må personen kunne fra dag én? Hva kan læres?"
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="role-start">
                          Ønsket oppstart (valgfritt)
                        </label>
                        <input
                          id="role-start"
                          type="date"
                          value={role.startDate}
                          onChange={(e) =>
                            setRole({ ...role, startDate: e.target.value })
                          }
                        />
                        <small>
                          En ønsket dato, ikke en beregnet prognose.
                        </small>
                      </div>
                    </div>
                  </>
                )}
                {step === 2 && (
                  <Market
                    salary={salary}
                    nav={nav}
                    offer={role.salary}
                    loading={marketLoading}
                    error={marketError}
                    onRetry={() => setRetry((r) => r + 1)}
                  />
                )}
                {step === 3 && (
                  <Worklife value={worklife} onChange={setWorklife} />
                )}
                {step === 4 &&
                  (report ? (
                    <ReportView
                      report={report.report}
                      text={report.text}
                      onRebuild={generate}
                    />
                  ) : (
                    <>
                      <div className="section-intro">
                        <span className="eyebrow">
                          05 / FRA INNSIKT TIL HANDLING
                        </span>
                        <h3>Hva bør dere gjøre før start?</h3>
                        <p>
                          Samle bestillingen, kildene og egenvurderingen i en
                          rapport med prioriterte tiltak og en 30/60/90-dagers
                          plan.
                        </p>
                      </div>
                      <div className="readiness">
                        <FileCheck2 size={28} />
                        <div>
                          <h4>
                            {isCompanyReady && isRoleReady
                              ? "Bestillingen er klar til vurdering"
                              : "Fullfør bestillingen først"}
                          </h4>
                          <p>
                            {company?.name ?? "Virksomhet ikke valgt"} ·{" "}
                            {role.title || "Stilling ikke oppgitt"}
                          </p>
                          <p>
                            {role.municipality || "Arbeidssted ikke oppgitt"}
                            {role.county && `, ${countyName(role.county)}`}
                          </p>
                        </div>
                      </div>
                      <div className="scenario">
                        <label className="check-row">
                          <input
                            type="checkbox"
                            checked={scenario.enabled}
                            onChange={(e) =>
                              setScenario({
                                ...scenario,
                                enabled: e.target.checked,
                              })
                            }
                          />
                          <span>
                            <b>Utforsk et hypotetisk scenario</b>
                            <small>
                              Se hvordan andre valg påvirker rådene.
                              Markedsdataene endres ikke.
                            </small>
                          </span>
                        </label>
                        {scenario.enabled && (
                          <div className="scenario-fields">
                            <span className="pill">SCENARIO · HYPOTETISK</span>
                            <div className="form-grid">
                              <div className="field">
                                <label htmlFor="scenario-salary">
                                  Tenkt månedslønn i kr
                                </label>
                                <input
                                  id="scenario-salary"
                                  type="number"
                                  min={1}
                                  max={2000000}
                                  value={scenario.salary ?? ""}
                                  onChange={(e) =>
                                    setScenario({
                                      ...scenario,
                                      salary:
                                        e.target.value === ""
                                          ? null
                                          : Number(e.target.value),
                                    })
                                  }
                                />
                                <small>
                                  {differenceText(
                                    difference(
                                      scenario.salary,
                                      salary?.value ?? null,
                                    ),
                                  )}
                                </small>
                              </div>
                              <div className="field">
                                <label htmlFor="scenario-area">
                                  Tenkt søkeområde
                                </label>
                                <select
                                  id="scenario-area"
                                  value={scenario.searchArea}
                                  onChange={(e) =>
                                    setScenario({
                                      ...scenario,
                                      searchArea: e.target
                                        .value as Scenario["searchArea"],
                                    })
                                  }
                                >
                                  <option value="local">Lokalt</option>
                                  <option value="regional">Regionalt</option>
                                  <option value="national">Nasjonalt</option>
                                </select>
                              </div>
                              <div className="field">
                                <label htmlFor="scenario-requirements">
                                  Alternativ kravprofil
                                </label>
                                <select
                                  id="scenario-requirements"
                                  value={scenario.requirements}
                                  onChange={(e) =>
                                    setScenario({
                                      ...scenario,
                                      requirements: e.target
                                        .value as Scenario["requirements"],
                                    })
                                  }
                                >
                                  <option value="same">Samme krav</option>
                                  <option value="essential">
                                    Bare nødvendige krav
                                  </option>
                                  <option value="train">
                                    Åpne for opplæring
                                  </option>
                                </select>
                              </div>
                              <HrSelect
                                id="scenario-hr"
                                value={scenario.hrSupport}
                                onChange={(hrSupport) =>
                                  setScenario({ ...scenario, hrSupport })
                                }
                              />
                            </div>
                            <p>
                              Ingen beregnet effekt på sannsynlighet,
                              kandidatantall eller ansettelsesdato.
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="notice">
                        <Info size={18} />
                        <p>
                          Rapporten lages uten lagring. Du kan laste ned tekst
                          og JSON eller bruke nettleserens utskrift til PDF.
                          Ingen e-postadresse kreves.
                        </p>
                      </div>
                    </>
                  ))}
                {error && (
                  <div className="notice error" role="alert">
                    <Info size={18} />
                    <p>{error}</p>
                  </div>
                )}
                {generating && (
                  <p className="generation-status" role="status">
                    Kontrollerer virksomhet og kilder, og bygger rapport …
                  </p>
                )}
              </div>
              {!(report && step === 4) && (
                <div className="stage-footer">
                  <span>STEG {step + 1} AV 5</span>
                  <div>
                    {step > 0 && (
                      <button
                        type="button"
                        className="button back"
                        onClick={() => move(step - 1)}
                      >
                        <ArrowLeft size={16} />
                        Tilbake
                      </button>
                    )}
                    {step < 4 ? (
                      <button
                        type="button"
                        className="button primary"
                        onClick={next}
                      >
                        {
                          [
                            "Til stillingen",
                            "Se markedsbildet",
                            "Til egenvurderingen",
                            "Til din vurdering",
                          ][step]
                        }
                        <ArrowRight size={16} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="button primary"
                        disabled={generating}
                        onClick={generate}
                      >
                        Lag rekrutteringsvurdering
                        <ArrowRight size={16} />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
            <aside className="context">
              <div className="context-top">
                <span className="eyebrow">DERES BESTILLING</span>
                <span className="pill">UTKAST</span>
              </div>
              <h3>{role.title || "Neste ansettelse"}</h3>
              <div className="context-company">
                <BuildingIcon />
                <span>{company?.name ?? "Velg arbeidsgiver"}</span>
              </div>
              <div className="context-company">
                <MapPin size={16} />
                <span>
                  {role.municipality
                    ? `${role.municipality}${role.county ? `, ${countyName(role.county)}` : ""}`
                    : "Bekreft arbeidssted"}
                </span>
              </div>
              <dl className="context-facts">
                <div>
                  <dt>Yrkesgruppe</dt>
                  <dd>
                    {occupation
                      ? `${occupation.name} · ${occupation.code}`
                      : "Ikke valgt"}
                  </dd>
                </div>
                <div>
                  <dt>Antall ansettelser</dt>
                  <dd>{role.count || "Ikke oppgitt"}</dd>
                </div>
                <div>
                  <dt>Lønnsramme / måned</dt>
                  <dd>
                    {role.salary === null ? "Ikke oppgitt" : money(role.salary)}
                  </dd>
                </div>
                <div>
                  <dt>Egenvurdering</dt>
                  <dd>
                    {
                      Object.values(worklife.answers).filter((v) => v !== null)
                        .length
                    }{" "}
                    av 6 besvart
                  </dd>
                </div>
              </dl>
              <div className="context-data">
                <Database size={18} />
                <div>
                  <b>Etterprøvbart grunnlag</b>
                  <p>
                    Offisielle tall, egne vurderinger og scenarioer vises hver
                    for seg.
                  </p>
                </div>
              </div>
              <p className="context-footnote">
                Du kan gå tilbake og endre valgene når som helst. Rapporten
                bygger på den siste bestillingen.
              </p>
            </aside>
          </div>
          <div className="method-strip">
            <div>
              <span>01</span>
              <p>
                <b>Dokumenterte markedssignaler</b>
                <small>Kilde, periode og geografisk nivå følger tallene.</small>
              </p>
            </div>
            <div>
              <span>02</span>
              <p>
                <b>En ærlig egenvurdering</b>
                <small>Arbeidsgivers perspektiv, uten uvaliderte løfter.</small>
              </p>
            </div>
            <div>
              <span>03</span>
              <p>
                <b>Konkrete neste steg</b>
                <small>
                  Prioriterte tiltak og en plan for gjennomføringen.
                </small>
              </p>
            </div>
          </div>
        </div>
      </main>
      <footer className="site-footer">
        <div className="footer-brand">ridderset.</div>
        <p>Bedre beslutninger begynner med bedre spørsmål.</p>
        <span>REKRUTTERINGSINNSIKT · LOKAL MVP</span>
      </footer>
    </>
  );
}
function BuildingIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      <path d="M4 21V3h12v18M16 9h4v12M2 21h20M8 7h4M8 11h4M8 15h4M8 21v-3h4v3" />
    </svg>
  );
}
