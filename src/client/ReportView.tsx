import { Check, Download, FileText, Printer, RefreshCw } from "lucide-react";
import type { Report } from "../shared/types";
import { countyName } from "../shared/types";
import { date, differenceText, money, number } from "../shared/format";
import { dimensions, hrLabels } from "../shared/worklife";
import { download } from "./api";
import { Metric } from "./Market";
export function ReportView({
  report: r,
  text,
  onRebuild,
}: {
  report: Report;
  text: string;
  onRebuild: () => void;
}) {
  return (
    <article className="report" aria-label="Rekrutteringsvurdering">
      <div className="report-heading">
        <span className="eyebrow">RIDDERSET / BESLUTNINGSGRUNNLAG</span>
        <h3>{r.input.role.title}</h3>
        <p>
          {r.input.company.name} · {r.input.role.municipality},{" "}
          {countyName(r.input.role.county)}
        </p>
        <span className="report-stamp">
          <Check size={13} />
          Utarbeidet {date(r.createdAt)} · metode {r.version}
        </span>
      </div>
      <div className="report-actions">
        <button
          type="button"
          onClick={() => download("ridderset-vurdering.txt", text)}
        >
          <Download size={16} />
          Last ned rapport (.txt)
        </button>
        <button
          type="button"
          onClick={() =>
            download(
              "ridderset-grunnlag.json",
              JSON.stringify(r, null, 2),
              "application/json",
            )
          }
        >
          <FileText size={16} />
          Grunnlag (.json)
        </button>
        <button type="button" onClick={() => window.print()}>
          <Printer size={16} />
          Skriv ut / PDF
        </button>
        <button type="button" onClick={onRebuild}>
          <RefreshCw size={16} />
          Oppdater kilder
        </button>
      </div>
      <section className="report-section">
        <h4>Bestillingen</h4>
        <dl className="report-facts">
          <div>
            <dt>Virksomhet</dt>
            <dd>
              {r.input.company.name} ·{" "}
              {r.input.company.kind === "unit"
                ? "underenhet"
                : r.input.company.kind === "manual"
                  ? "oppgitt av arbeidsgiver"
                  : "hovedenhet"}{" "}
              · org.nr. {r.input.company.orgnr ?? "Ikke oppgitt"}
            </dd>
          </div>
          {r.input.company.parentOrgnr && (
            <div>
              <dt>Hovedenhet</dt>
              <dd>Org.nr. {r.input.company.parentOrgnr}</dd>
            </div>
          )}
          <div>
            <dt>Virksomhetsopplysninger</dt>
            <dd>
              {r.input.company.employees === null
                ? "Antall personer ikke registrert / ikke oppgitt"
                : `${number(r.input.company.employees)} ${r.input.company.source === "employer" ? "personer oppgitt av arbeidsgiver" : "registrerte personer"} (ikke årsverk)`}{" "}
              · {r.input.company.industry ?? "Næring ikke oppgitt"}
              {r.input.company.industryCode &&
                ` (${r.input.company.industryCode})`}
            </dd>
          </div>
          <div>
            <dt>Registrert adresse</dt>
            <dd>
              {r.input.company.address} ·{" "}
              {r.input.company.organizationForm ??
                "Organisasjonsform ikke oppgitt"}
            </dd>
          </div>
          <div>
            <dt>Virksomhetskilde</dt>
            <dd>
              {r.input.company.source === "brreg"
                ? "Brønnøysundregistrene"
                : "Oppgitt av arbeidsgiver"}{" "}
              · oppslag {date(r.input.company.retrievedAt)}
            </dd>
          </div>
          <div>
            <dt>Yrkesgruppe</dt>
            <dd>
              {r.occupation.name} · STYRK08 {r.occupation.code}
            </dd>
          </div>
          <div>
            <dt>Behov</dt>
            <dd>
              {r.input.role.count} ansettelser · {r.input.role.municipality},{" "}
              {countyName(r.input.role.county)} · arbeidssted bekreftet
            </dd>
          </div>
          <div>
            <dt>Månedslønn</dt>
            <dd>
              {r.input.role.salary === null
                ? "Ikke oppgitt"
                : money(r.input.role.salary)}{" "}
              · {differenceText(r.interpretation.salaryDifference)}
            </dd>
          </div>
          <div>
            <dt>Krav</dt>
            <dd>{r.input.role.requirements || "Ikke oppgitt"}</dd>
          </div>
          <div>
            <dt>Søk og fleksibilitet</dt>
            <dd>
              {
                {
                  local: "Lokalt",
                  regional: "Regionalt",
                  national: "Nasjonalt",
                }[r.input.role.searchArea]
              }{" "}
              ·{" "}
              {
                {
                  onsite: "På arbeidsstedet",
                  hybrid: "Hybrid",
                  remote: "Remote",
                }[r.input.role.flexibility]
              }
            </dd>
          </div>
          <div>
            <dt>Ønsket oppstart</dt>
            <dd>
              {r.input.role.startDate
                ? date(r.input.role.startDate)
                : "Ikke oppgitt"}{" "}
              · ønsket dato, ingen beregnet prognose
            </dd>
          </div>
        </dl>
      </section>
      <section className="report-section">
        <span className="eyebrow">MARKEDSDATA</span>
        <h4>Dokumenterte signaler</h4>
        <div className="metrics-grid">
          <Metric
            title="Median månedslønn"
            observation={r.market.salary}
            currency
          />
          <Metric
            title="Anslått mangel · Norge, yrket"
            observation={r.market.nav.occupationShortage}
          />
          <Metric
            title="Publiserte stillinger · fylket, alle yrker"
            observation={r.market.nav.countyVacancies}
          />
          <Metric
            title="Publiserte stillinger · Norge, yrket"
            observation={r.market.nav.occupationVacancies}
          />
          <Metric
            title="Anslått mangel · fylket, alle yrker"
            observation={r.market.nav.countyShortage}
          />
        </div>
        <p>
          Aktive annonser og utlyste posisjoner i aktive annonser er
          utilgjengelige. NAV-feed er ikke aktivert.
        </p>
      </section>
      <section className="report-section">
        <span className="eyebrow">ARBEIDSGIVERPROFIL</span>
        <h4>Worklife · arbeidsgivers egenvurdering</h4>
        <p>
          {r.employer.answered} av 6 spørsmål besvart. Dette er ingen validert
          Worklife-måling.
        </p>
        <dl className="report-facts">
          {dimensions.map((d) => (
            <div key={d.key}>
              <dt>{d.label}</dt>
              <dd>
                {r.input.worklife.answers[d.key] === null
                  ? "Ubesvart"
                  : `${r.input.worklife.answers[d.key]}/10`}
              </dd>
            </div>
          ))}
        </dl>
        <p>
          Brand:{" "}
          {r.employer.brand.score === null
            ? "Ikke beregnet"
            : `${r.employer.brand.score}/100 · ${r.employer.brand.answered}/2 besvart`}
          . Index:{" "}
          {r.employer.index.score === null
            ? "Ikke beregnet"
            : `${r.employer.index.score}/100 · ${r.employer.index.answered}/4 besvart`}
          . Delverdiene er illustrative gjennomsnitt.
        </p>
        <p>
          <b>HR-støtte: {hrLabels[r.input.worklife.hrSupport]}.</b>{" "}
          {r.employer.hrAdvice}
        </p>
      </section>
      <section className="report-section interpretation">
        <span className="eyebrow">FORTOLKNING</span>
        <h4>{r.interpretation.title}</h4>
        {r.interpretation.reasons.map((s) => (
          <p key={s}>{s}</p>
        ))}
      </section>
      <section className="report-section">
        <span className="eyebrow">PRIORITERTE TILTAK</span>
        <h4>Det dere kan gjøre nå</h4>
        <ol className="action-list">
          {r.interpretation.actions.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ol>
      </section>
      {r.scenario.enabled && (
        <section className="report-section">
          <span className="eyebrow">SCENARIO / HYPOTETISK</span>
          <h4>Hvis dere endrer opplegget</h4>
          <p>
            Tenkt lønn{" "}
            {r.input.scenario.salary === null
              ? "ikke oppgitt"
              : money(r.input.scenario.salary)}{" "}
            · {differenceText(r.scenario.salaryDifference)}
          </p>
          {r.scenario.notes.map((n) => (
            <p key={n}>{n}</p>
          ))}
        </section>
      )}
      <section className="report-section">
        <span className="eyebrow">30 / 60 / 90</span>
        <h4>En plan for gjennomføringen</h4>
        <div className="plan-grid">
          {r.plan.map((p) => (
            <div key={p.days}>
              <span>INNEN {p.days} DAGER</span>
              <h5>{p.title}</h5>
              <ul>
                {p.actions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="fine-print">
          Milepælene er en arbeidsplan. De angir ikke når stillingen vil bli
          besatt.
        </p>
      </section>
    </article>
  );
}
