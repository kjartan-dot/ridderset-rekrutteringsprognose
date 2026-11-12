import { RotateCcw, Users } from "lucide-react";
import {
  assessWorklife,
  dimensions,
  emptyAnswers,
  hrLabels,
} from "../shared/worklife";
import type { HrSupport, WorklifeInput } from "../shared/types";
export function HrSelect({
  value,
  onChange,
  id = "hr-support",
}: {
  value: HrSupport;
  onChange: (v: HrSupport) => void;
  id?: string;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>HR-støtte og rekrutteringskapasitet</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as HrSupport)}
      >
        {Object.entries(hrLabels).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
export function Worklife({
  value,
  onChange,
}: {
  value: WorklifeInput;
  onChange: (v: WorklifeInput) => void;
}) {
  const result = assessWorklife(value);
  return (
    <>
      <div className="section-intro">
        <span className="eyebrow">ARBEIDSGIVERENS PERSPEKTIV</span>
        <h3>Arbeidsplassen bak stillingen</h3>
        <p>
          Hva tror dere kandidater og medarbeidere opplever? Dette er deres
          egenvurdering. En Worklife-måling krever uavhengige kandidat- og
          medarbeidersvar.
        </p>
      </div>
      <div className="worklife-summary" aria-live="polite">
        <div>
          <span>Worklife Brand · egenvurdering</span>
          <strong data-testid="brand-score">
            {!value.showIllustration
              ? "Illustrasjon av"
              : result.brand.score === null
                ? "Ikke vurdert"
                : `${result.brand.score}/100`}
          </strong>
          <small>
            {result.brand.answered}/2 besvart ·{" "}
            {result.brand.answered < 2 ? "ufullstendig" : "illustrasjon"}
          </small>
        </div>
        <div>
          <span>Worklife Index · egenvurdering</span>
          <strong data-testid="index-score">
            {!value.showIllustration
              ? "Illustrasjon av"
              : result.index.score === null
                ? "Ikke vurdert"
                : `${result.index.score}/100`}
          </strong>
          <small>
            {result.index.answered}/4 besvart ·{" "}
            {result.index.answered < 4 ? "ufullstendig" : "illustrasjon"}
          </small>
        </div>
        <div className="answered">
          <Users size={22} />
          <strong>{result.answered} av 6</strong>
          <small>spørsmål besvart</small>
        </div>
      </div>
      <label className="check-row illustration-toggle">
        <input
          type="checkbox"
          checked={value.showIllustration}
          onChange={(e) =>
            onChange({ ...value, showIllustration: e.target.checked })
          }
        />
        <span>
          Vis illustrative delscorer av besvarte spørsmål{" "}
          <small>
            Enkelt gjennomsnitt, uten validerte vekter eller benchmark. Kan slås
            av.
          </small>
        </span>
      </label>
      {(["Brand", "Index"] as const).map((group) => (
        <div className="worklife-group" key={group}>
          <div className="group-heading">
            <span className="eyebrow">WORKLIFE {group.toUpperCase()}</span>
            <p>
              {group === "Brand"
                ? "Attraktivitet sett fra kandidatmarkedet"
                : "Om løftene innfris i arbeidshverdagen"}
            </p>
          </div>
          {dimensions
            .filter((d) => d.group === group)
            .map((d) => (
              <div
                className={`range-field ${value.answers[d.key] !== null ? "is-answered" : ""}`}
                key={d.key}
              >
                <div className="range-heading">
                  <label htmlFor={`wl-${d.key}`}>{d.label}</label>
                  <output htmlFor={`wl-${d.key}`}>
                    {value.answers[d.key] === null
                      ? "Ubesvart"
                      : `${value.answers[d.key]}/10`}
                  </output>
                </div>
                <p id={`hint-${d.key}`}>{d.hint}</p>
                <input
                  id={`wl-${d.key}`}
                  type="range"
                  min={0}
                  max={10}
                  step={1}
                  value={value.answers[d.key] ?? 5}
                  aria-describedby={`hint-${d.key}`}
                  aria-valuetext={
                    value.answers[d.key] === null
                      ? "Ubesvart. Startposisjon 5 er ikke et svar."
                      : `${value.answers[d.key]} av 10`
                  }
                  onChange={(e) =>
                    onChange({
                      ...value,
                      answers: {
                        ...value.answers,
                        [d.key]: Number(e.target.value),
                      },
                    })
                  }
                />
                <div className="range-scale">
                  <span>0 · I liten grad</span>
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        ...value,
                        answers: {
                          ...value.answers,
                          [d.key]: value.answers[d.key] === null ? 5 : null,
                        },
                      })
                    }
                    aria-label={`${value.answers[d.key] === null ? "Bekreft 5 for" : "Fjern svar for"} ${d.label}`}
                  >
                    {value.answers[d.key] === null
                      ? "Bekreft 5 som svar"
                      : "Fjern svar"}
                  </button>
                  <span>10 · I stor grad</span>
                </div>
              </div>
            ))}
        </div>
      ))}
      {result.promiseGap !== null && (
        <div className="notice">
          <p>
            Oppgitt omdømme minus oppgitt innfrielse av løfter:{" "}
            {result.promiseGap} skalapoeng.{" "}
            {result.promiseGap > 0
              ? "Undersøk om forventningene i markedet innfris etter oppstart."
              : "Etterprøv bildet med ansatte og kandidater."}{" "}
            Forskjellen er en illustrasjon fra to egne anslag.
          </p>
        </div>
      )}
      <div className="hr-panel">
        <HrSelect
          value={value.hrSupport}
          onChange={(hrSupport) => onChange({ ...value, hrSupport })}
        />
        <p>{result.hrAdvice}</p>
        <small>
          Organisasjonsstørrelse og HR-form dokumenterer ikke kvalitet.
        </small>
      </div>
      <button
        type="button"
        className="text-button"
        onClick={() =>
          onChange({
            answers: emptyAnswers(),
            hrSupport: "unknown",
            showIllustration: true,
          })
        }
      >
        <RotateCcw size={15} />
        Nullstill egenvurderingen
      </button>
    </>
  );
}
