import { ArrowUpRight, Database, Info, RefreshCw } from "lucide-react";
import type { MarketData, Observation, Source } from "../shared/types";
import {
  date,
  difference,
  differenceText,
  money,
  number,
} from "../shared/format";
export function SourceDetails({ source }: { source: Source }) {
  return (
    <details className="source-details">
      <summary>
        Kilde og avgrensning <ArrowUpRight size={13} aria-hidden="true" />
      </summary>
      <dl>
        <div>
          <dt>Kilde</dt>
          <dd>
            <a href={source.url} target="_blank" rel="noreferrer">
              {source.name} · {source.table} ↗
            </a>
          </dd>
        </div>
        <div>
          <dt>Periode / nivå</dt>
          <dd>
            {source.period} · {source.geography}
          </dd>
        </div>
        <div>
          <dt>Utvalg</dt>
          <dd>{source.population}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>
            {
              {
                live: "Live oppslag",
                cache: "Mellomlagret oppslag",
                snapshot: "Versjonert snapshot",
                missing: "Mangler tall",
                unavailable: "Utilgjengelig",
              }[source.status]
            }
          </dd>
        </div>
        <div>
          <dt>Hentet</dt>
          <dd>{date(source.retrievedAt)}</dd>
        </div>
        <div>
          <dt>Kilden oppdatert</dt>
          <dd>{date(source.updatedAt)}</dd>
        </div>
      </dl>
      <p>{source.note}</p>
    </details>
  );
}
export function Metric({
  title,
  observation,
  currency = false,
}: {
  title: string;
  observation: Observation;
  currency?: boolean;
}) {
  const o = observation;
  return (
    <article className="metric">
      <div className="metric-title">{title}</div>
      <strong
        className={o.value === null ? "metric-value missing" : "metric-value"}
      >
        {o.value === null
          ? o.source.status === "unavailable"
            ? "Utilgjengelig"
            : "Mangler tall"
          : currency
            ? money(o.value)
            : number(o.value)}
      </strong>
      <p className="metric-unit">
        {o.value !== null && <>{o.unit} · </>}
        {o.source.geography} · {o.source.period}
      </p>
      <p className="metric-scope">{o.source.population}</p>
      {o.interval && (
        <p className="interval">
          95 % KI {number(o.interval.low)}–{number(o.interval.high)}
        </p>
      )}
      {o.reason && <p className="metric-reason">{o.reason}</p>}
      <SourceDetails source={o.source} />
      <div className="print-source">
        <p>
          Kilde: {o.source.name} · {o.source.table}
        </p>
        <p>
          {o.source.period} · {o.source.geography} · {o.source.population}
        </p>
        <p>
          Hentet {date(o.source.retrievedAt)} · oppdatert{" "}
          {date(o.source.updatedAt)} · {o.source.status}
        </p>
        <p>{o.source.note}</p>
        <p>{o.source.url}</p>
      </div>
    </article>
  );
}
export function Market({
  salary,
  nav,
  loading,
  error,
  offer,
  onRetry,
}: {
  salary: Observation | null;
  nav: MarketData | null;
  loading: boolean;
  error: string;
  offer: number | null;
  onRetry: () => void;
}) {
  if (loading)
    return (
      <div className="empty-state" role="status">
        <RefreshCw className="spin" size={28} />
        <h3>Henter dokumenterte markedssignaler</h3>
        <p>Lønn fra SSB og publisert statistikk fra NAV.</p>
      </div>
    );
  if (error)
    return (
      <div className="notice error" role="alert">
        <p>{error}</p>
        <button type="button" onClick={onRetry}>
          Prøv igjen
        </button>
      </div>
    );
  if (!salary || !nav)
    return (
      <div className="empty-state">
        <Database size={30} />
        <h3>Velg yrke og fylke først</h3>
        <p>Da kan vi hente statistikk med riktig avgrensning.</p>
      </div>
    );
  return (
    <>
      <div className="section-intro">
        <span className="eyebrow">OFFENTLIG STATISTIKK</span>
        <h3>Hva forteller markedet?</h3>
        <p>
          Les hvert signal på nivået det er publisert. Fylkestallene gjelder
          alle yrker; yrkestallene gjelder hele Norge.
        </p>
      </div>
      <div className="metrics-grid">
        <Metric title="Median månedslønn" observation={salary} currency />
        <Metric
          title="Anslått mangel i yrket"
          observation={nav.occupationShortage}
        />
      </div>
      {salary.value !== null && (
        <div className="salary-compare">
          <div>
            <span className="eyebrow">LØNNSRAMMEN DERES</span>
            <strong>{offer === null ? "Ikke oppgitt" : money(offer)}</strong>
            <p>
              {differenceText(difference(offer, salary.value))}. Vurder ansvar,
              erfaring og sektor.
            </p>
          </div>
          <div className="salary-bars" aria-label="Sammenligning av månedslønn">
            {[
              { name: "Nasjonal median", value: salary.value },
              { name: "Oppgitt tilbud", value: offer },
            ].map((v, i) => (
              <div className="salary-row" key={v.name}>
                <span>{v.name}</span>
                <div className={`bar-track bar-${i}`}>
                  <i
                    style={{
                      width: `${v.value === null ? 0 : (v.value / Math.max(salary.value!, offer ?? 0)) * 100}%`,
                    }}
                  />
                </div>
                <b>{v.value === null ? "Ikke oppgitt" : money(v.value)}</b>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="metrics-grid">
        <Metric
          title="Publiserte stillinger i fylket"
          observation={nav.countyVacancies}
        />
        <Metric
          title="Publiserte stillinger i yrket"
          observation={nav.occupationVacancies}
        />
      </div>
      {nav.history.length > 0 && (
        <details className="history">
          <summary>Se månedshistorikk · yrket i hele Norge</summary>
          <p>
            Tilgang per måned. Månedene har ulikt antall virkedager. Én del av
            ett år dokumenterer ikke sesongmønster eller en langsiktig trend.
          </p>
          <table>
            <caption>Publiserte stillinger i valgt STYRK08-yrke</caption>
            <thead>
              <tr>
                <th>Måned</th>
                <th>Stillinger</th>
              </tr>
            </thead>
            <tbody>
              {nav.history.map((p) => (
                <tr key={p.period}>
                  <td>{p.period}</td>
                  <td>{p.value === null ? "Mangler tall" : number(p.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
      <details className="history">
        <summary>Se fylkets samlede mangelanslag</summary>
        <Metric
          title="Anslått mangel · alle yrker i fylket"
          observation={nav.countyShortage}
        />
      </details>
      <div className="feed-status">
        <div className="feed-icon">
          <Database size={20} />
        </div>
        <div>
          <h4>Aktive annonser: utilgjengelig</h4>
          <p>
            Utlyste posisjoner i aktive annonser: utilgjengelig. NAV-feed er
            ikke aktivert i denne versjonen. Tilgang i måneden er et annet mål.
          </p>
          <a
            href="https://navikt.github.io/pam-stilling-feed/"
            target="_blank"
            rel="noreferrer"
          >
            Om NAVs stilling-feed ↗
          </a>
        </div>
      </div>
      <div className="notice">
        <Info size={18} />
        <p>
          Dette er markedssignaler. Datagrunnlaget gir ingen dokumentert
          sannsynlighet for en ansettelse eller tid til ansettelse.
        </p>
      </div>
    </>
  );
}
