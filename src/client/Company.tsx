import { useEffect, useState } from "react";
import { Building2, Check, MapPin, Search, ArrowUpRight } from "lucide-react";
import type {
  Company as CompanyModel,
  CompanyPage,
  Role,
} from "../shared/types";
import { counties } from "../shared/types";
import { date, number } from "../shared/format";
import { api } from "./api";
import { SearchBox } from "./SearchBox";
interface Props {
  company: CompanyModel | null;
  onCompany: (v: CompanyModel | null) => void;
  role: Role;
  onRole: (v: Role) => void;
}
export function Company({ company, onCompany, role, onRole }: Props) {
  const [query, setQuery] = useState(company?.name ?? ""),
    [kind, setKind] = useState<"entity" | "unit">(
      company?.kind === "unit" ? "unit" : "entity",
    );
  const [parent, setParent] = useState<CompanyModel | null>(
      company?.kind === "entity" ? company : null,
    ),
    [units, setUnits] = useState<CompanyPage | null>(null),
    [unitError, setUnitError] = useState("");
  const [unitPage, setUnitPage] = useState(0),
    [manualOpen, setManualOpen] = useState(false),
    [loadingUnits, setLoadingUnits] = useState(false);
  useEffect(() => {
    if (!parent?.orgnr || parent.kind !== "entity") return;
    const controller = new AbortController();
    setLoadingUnits(true);
    setUnitError("");
    api<CompanyPage>(`/companies/${parent.orgnr}/units?page=${unitPage}`, {
      signal: controller.signal,
    })
      .then((v) => {
        if (!controller.signal.aborted) setUnits(v);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setUnitError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingUnits(false);
      });
    return () => controller.abort();
  }, [parent, unitPage]);
  function choose(value: CompanyModel) {
    onCompany(value);
    setQuery(value.name);
    setUnitPage(0);
    setUnits(null);
    setUnitError("");
    setParent(value.kind === "entity" ? value : null);
    onRole({ ...role, workplaceConfirmed: false });
  }
  function applyAddress() {
    if (!company?.municipality) return;
    const code = company.municipalityCode?.slice(0, 2);
    onRole({
      ...role,
      municipality: company.municipality,
      county: counties.some((c) => c[0] === code) ? code! : role.county,
      workplaceConfirmed: false,
    });
  }
  return (
    <>
      <div className="section-intro">
        <span className="eyebrow">01 / ARBEIDSGIVER OG ARBEIDSSTED</span>
        <h3>Hvem skal ansette?</h3>
        <p>
          Finn riktig juridisk virksomhet eller underenhet. Bekreft deretter
          hvor den nye medarbeideren faktisk skal jobbe.
        </p>
      </div>
      <div className="segmented" role="group" aria-label="Type bedriftssøk">
        <button
          type="button"
          aria-pressed={kind === "entity"}
          onClick={() => {
            setKind("entity");
            onCompany(null);
            setParent(null);
            setUnits(null);
          }}
        >
          Hovedenhet
        </button>
        <button
          type="button"
          aria-pressed={kind === "unit"}
          onClick={() => {
            setKind("unit");
            onCompany(null);
            setParent(null);
            setUnits(null);
          }}
        >
          Underenhet / arbeidssted
        </button>
      </div>
      <SearchBox<CompanyModel>
        label="Søk etter virksomhet"
        query={query}
        onQuery={(v) => {
          setQuery(v);
          onCompany(null);
          setParent(null);
          setUnits(null);
        }}
        endpoint={`/companies/search?kind=${kind}`}
        onPick={choose}
        itemKey={(c) => c.orgnr!}
        itemTitle={(c) => c.name}
        itemDetail={(c) =>
          `Org.nr. ${c.orgnr} · ${c.municipality ?? "Kommune ikke oppgitt"} · ${c.kind === "unit" ? "Underenhet" : "Hovedenhet"}`
        }
        placeholder="Bedriftsnavn eller organisasjonsnummer"
        hint="Live oppslag i Brønnøysundregistrene. Skriv minst to tegn."
      />
      <div className="search-backup">
        <Search size={14} />
        <span>Eksempel: Nordlaks</span>
        <a
          href="https://virksomhet.brreg.no/nb/oppslag/enheter"
          target="_blank"
          rel="noreferrer"
        >
          Offisielt bedriftssøk <ArrowUpRight size={13} />
        </a>
      </div>
      {company && (
        <div className="company-card" data-testid="company-card">
          <div className="company-card-head">
            <div className="company-icon">
              <Building2 size={24} />
            </div>
            <div>
              <span className="eyebrow">
                {company.source === "employer"
                  ? "OPPGITT AV ARBEIDSGIVER"
                  : company.kind === "unit"
                    ? "VALGT UNDERENHET"
                    : "VALGT HOVEDENHET"}
              </span>
              <h4>{company.name}</h4>
              <p>
                Org.nr. {company.orgnr ?? "Ikke oppgitt"}
                {company.parentOrgnr && ` · Hovedenhet ${company.parentOrgnr}`}
              </p>
            </div>
            <Check size={19} className="selected-check" />
          </div>
          <dl className="company-facts">
            <div>
              <dt>
                {company.source === "employer"
                  ? "Oppgitt antall personer"
                  : "Registrerte personer"}
              </dt>
              <dd>
                {company.employees === null
                  ? company.source === "employer"
                    ? "Ikke oppgitt"
                    : "Ikke oppgitt i registeret"
                  : number(company.employees)}
                <small>Antall personer, ikke årsverk</small>
              </dd>
            </div>
            <div>
              <dt>Organisasjonsform</dt>
              <dd>{company.organizationForm ?? "Ikke oppgitt"}</dd>
            </div>
            <div>
              <dt>Næring</dt>
              <dd>
                {company.industryCode ?? "Ikke oppgitt"}
                {company.industry && ` · ${company.industry}`}
              </dd>
            </div>
            <div>
              <dt>
                {company.addressType === "postal"
                  ? "Postadresse (ikke arbeidssted)"
                  : "Registrert adresse"}
              </dt>
              <dd>{company.address}</dd>
            </div>
          </dl>
          <div className="company-source">
            <span>
              {company.source === "brreg"
                ? `Brønnøysundregistrene · oppslag ${date(company.retrievedAt)}`
                : "Manuelle opplysninger · ikke verifisert mot registeret"}
            </span>
            {company.source === "brreg" && (
              <a
                href={`https://data.brreg.no/enhetsregisteret/api/${company.kind === "unit" ? "underenheter" : "enheter"}/${company.orgnr}`}
                target="_blank"
                rel="noreferrer"
              >
                Kontroller kilde ↗
              </a>
            )}
          </div>
        </div>
      )}
      {parent && (
        <div className="unit-panel">
          <div className="field">
            <label htmlFor="company-unit">Velg underenhet / avdeling</label>
            <select
              id="company-unit"
              value={company?.kind === "unit" ? (company.orgnr ?? "") : ""}
              onChange={(e) => {
                const item = e.target.value
                  ? units?.items.find((c) => c.orgnr === e.target.value)
                  : parent;
                if (item) {
                  onCompany(item);
                  onRole({ ...role, workplaceConfirmed: false });
                }
              }}
              disabled={loadingUnits}
            >
              <option value="">{parent.name} · hovedenhet</option>
              {units?.items.map((u) => (
                <option key={u.orgnr} value={u.orgnr!}>
                  {u.name} · {u.municipality ?? "Ukjent kommune"} · {u.orgnr}
                </option>
              ))}
            </select>
          </div>
          <p role="status">
            {loadingUnits
              ? "Henter underenheter …"
              : unitError ||
                (units
                  ? `${units.items.length} underenheter vist av ${units.total} registertreff. Hovedkontor er ikke alltid arbeidssted.`
                  : "")}
          </p>
          {units && units.totalPages > 1 && (
            <div className="pagination">
              <button
                type="button"
                disabled={unitPage === 0}
                onClick={() => setUnitPage((p) => p - 1)}
              >
                Forrige
              </button>
              <span>
                Side {unitPage + 1} av {units.totalPages}
              </span>
              <button
                type="button"
                disabled={unitPage + 1 >= units.totalPages}
                onClick={() => setUnitPage((p) => p + 1)}
              >
                Neste
              </button>
            </div>
          )}
          {unitError && (
            <button
              className="text-button"
              type="button"
              onClick={() => setParent({ ...parent })}
            >
              Prøv underenheter igjen
            </button>
          )}
        </div>
      )}
      <details
        className="manual"
        open={manualOpen}
        onToggle={(e) => setManualOpen(e.currentTarget.open)}
      >
        <summary>Legg inn virksomheten manuelt</summary>
        <p>
          Bruk dette hvis registeret er utilgjengelig eller opplysninger
          mangler. Alt merkes «oppgitt av arbeidsgiver».
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const value = (key: string) => String(f.get(key) ?? "").trim();
            const manual: CompanyModel = {
              kind: "manual",
              orgnr: value("orgnr") || null,
              name: value("name"),
              employees:
                value("employees") === "" ? null : Number(value("employees")),
              industry: value("industry") || null,
              industryCode: null,
              organizationForm: null,
              parentOrgnr: null,
              address: value("address") || "Ikke oppgitt",
              municipality: null,
              municipalityCode: null,
              addressType: "manual",
              source: "employer",
              retrievedAt: new Date().toISOString(),
            };
            choose(manual);
            setManualOpen(false);
          }}
        >
          <div className="form-grid">
            <div className="field">
              <label htmlFor="manual-name">Virksomhetens navn</label>
              <input
                id="manual-name"
                name="name"
                required
                minLength={2}
                maxLength={200}
                defaultValue={query}
              />
            </div>
            <div className="field">
              <label htmlFor="manual-org">
                Organisasjonsnummer (valgfritt)
              </label>
              <input
                id="manual-org"
                name="orgnr"
                inputMode="numeric"
                pattern="[0-9]{9}"
                title="Ni siffer, eller la feltet stå tomt"
                maxLength={9}
              />
            </div>
            <div className="field">
              <label htmlFor="manual-people">Antall personer (valgfritt)</label>
              <input
                id="manual-people"
                name="employees"
                type="number"
                min={0}
                max={10000000}
                step={1}
              />
            </div>
            <div className="field">
              <label htmlFor="manual-industry">Næring (valgfritt)</label>
              <input id="manual-industry" name="industry" maxLength={200} />
            </div>
            <div className="field span-two">
              <label htmlFor="manual-address">Adresse (valgfritt)</label>
              <input id="manual-address" name="address" maxLength={500} />
            </div>
          </div>
          <button type="submit" className="button secondary">
            Bruk manuelle opplysninger
          </button>
        </form>
      </details>
      <div className="workplace">
        <div className="subheading">
          <MapPin size={19} />
          <h4>Bekreft faktisk arbeidssted</h4>
        </div>
        <p>
          Arbeidsstedet kan være et annet enn virksomhetens registrerte adresse.
        </p>
        {company?.municipality && company.addressType === "physical" && (
          <button type="button" className="text-button" onClick={applyAddress}>
            Foreslå {company.municipality} fra registeret <MapPin size={14} />
          </button>
        )}
        <div className="form-grid">
          <div className="field">
            <label htmlFor="municipality">Kommune / arbeidssted</label>
            <input
              id="municipality"
              value={role.municipality}
              maxLength={90}
              placeholder="For eksempel Hadsel"
              onChange={(e) =>
                onRole({
                  ...role,
                  municipality: e.target.value,
                  workplaceConfirmed: false,
                })
              }
            />
          </div>
          <div className="field">
            <label htmlFor="county">Fylke</label>
            <select
              id="county"
              value={role.county}
              onChange={(e) =>
                onRole({
                  ...role,
                  county: e.target.value,
                  workplaceConfirmed: false,
                })
              }
            >
              <option value="">Velg fylke</option>
              {counties.map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <label className="check-row">
          <input
            type="checkbox"
            checked={role.workplaceConfirmed}
            onChange={(e) =>
              onRole({ ...role, workplaceConfirmed: e.target.checked })
            }
          />
          <span>
            Jeg bekrefter at dette er stillingens faktiske arbeidssted.
          </span>
        </label>
      </div>
    </>
  );
}
