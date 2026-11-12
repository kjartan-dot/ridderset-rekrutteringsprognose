# Arkitektur – fase 0 og 1

## Beslutning

React/TypeScript bygges med Vite til eksterne, innholdshashede JS/CSS-filer.
En Node 24 / Express 5-tjeneste serverer frontend og `/api` fra samme origin.
Kildeadapterne kjører bare på serveren. WordPress beholder publiseringsrollen.
Legacy-arkivet og produksjonssiden er uendret.

En selvstendig API-tjeneste er valgt fremfor å implementere alle adapterne på nytt
i PHP: samme typede kontrakter, kildevalidering og tester kan brukes lokalt og i
staging. `integrations/wordpress/` er en inaktiv shortcode-bro for staging.
Den laster en isolert HTTPS-app i iframe og inneholder ingen JavaScript-logikk.
En eventuell WP REST-bro til denne API-en må bruke fast origin og serverkonfigurasjon.
Ingen eksterne URL-er fra besøkende skal videresendes som proxy-mål.

```text
WordPress publiseringsflate (fremtidig staging-shortcode)
  └── isolert app / compiled JS + CSS
        └── samme origin /api
              ├── BrregAdapter → Enhetsregisteret v2
              ├── SsbAdapter → PxWeb API v2 / metadata + én lønnscelle
              ├── navMarket → versjonert NAV-snapshot + originalfiler
              └── buildReport → markedsdata / arbeidsgiver / scenario / fortolkning
```

## Struktur og ansvar

- `src/client/`: tilgjengelige søk, trinnflyt, Worklife, kildevisning og rapport.
- `src/shared/`: domene, Zod-kontrakter, rene beregninger, rapporttekst og formattering.
- `src/server/adapters/`: separate kilder. Ingen browserkall til tredjeparts-API-er.
- `src/server/http.ts`: 8 sekunders timeout, ett kontrollert nytt forsøk ved nettverks-/5xx-feil, bounded TTL-cache og samling av identiske samtidige oppslag.
- `data/`: yrkeskatalog, gjennomgåtte synonymer, originale publiserte NAV-filer, kontrollsummer, versjonert statistikk og testfixtures.
- `tests/`: enhetstester, API-kontrakter og Playwright. Egne fixtureservere finnes bare under `tests/`.

## Kontrakter

Alle rutene under `/api`. Feil har `{ error: { code, message, fields?, upstreamStatus? } }`.
Inndata avvises med 400; kildefeil med 502; slettet enhet med 410; ukjent enhet
med 404; lokal trafikkbegrensning med 429. Et eksakt Brreg-søk som får 404 gir
en tom resultatliste. SSB-feil gir en observasjon med `value: null`, status
`unavailable` og forklaring, slik at andre kilder fortsatt kan vises.

| Rute                               | Inndata / virkning                                                                      |
| ---------------------------------- | --------------------------------------------------------------------------------------- |
| `GET /companies/search`            | `q`, `kind=entity                                                                       | unit`, `page`; treff + total og sideantall |
| `GET /companies/:orgnr`            | `kind`; én faktisk enhet, ikke en syntetisk hovedenhet                                  |
| `GET /companies/:orgnr/units`      | `page`; egne underenheter, 20 pr. side                                                  |
| `GET /occupations/search`          | `q`; rangerte forslag, kodereferanse og flertydighetsflagg                              |
| `GET /salary`                      | `occupation`; SSB median for siste publiserte år                                        |
| `GET /sources/ssb/:table/metadata` | Bare de sju gjennomgåtte tabellene                                                      |
| `GET /market/vacancies`            | `occupation`, `county`; historiske publikasjoner og eksplisitt utilgjengelig aktiv feed |
| `GET /market/shortage`             | Samme avgrensning; nasjonal yrkesmangel og separat fylkesmangel                         |
| `POST /assessment/worklife`        | Seks nullable svar, HR-valg og valg av illustrasjon                                     |
| `POST /assessment`, `POST /report` | Bestilling → rapport og TXT. Registerdata og lønn kontrolleres på serveren              |
| `GET /health`                      | Prosesshelse og aktiv feed-status; ingen persondata                                     |

## Domene og kvalitet

`Company` skiller hovedenhet, underenhet og manuell opplysning. Org.nr. er stabil
identitet. Underenhetens `parentOrgnr` er en referanse; ved manglende hovedenhet
finner vi ikke på et navn. Registrert fysisk adresse, postadresse og manuelt
oppgitt arbeidssted holdes adskilt. Arbeidssted må bekreftes eksplisitt.

`Occupation` er STYRK08-kode/navn. `Role.title` er den konkrete bestillingen.
Synonymer er redaksjonelle forslag, og prosjektleder/driftstekniker kan ha flere
koder. Valget skal kontrolleres av brukeren.

`Source` følger hver `Observation`: kilde, tabell/rad, periode, oppdatering,
hentedato, utvalg, geografi, status og begrensning. `null` betyr ikke null
personer eller null stillinger. Klient/eksport viser «Mangler tall» eller
«Utilgjengelig». JSON bevarer maskinlesbar null for manglende verdier.

`Report.market`, `Report.employer`, `Report.scenario`, `Report.interpretation`
er fire adskilte nivåer. Ingen statistisk risikoscore eller prediksjon brukes.
Hele rapporten ugyldiggjøres i UI når en opplysning endres og bygges på nytt
fra gjeldende bestilling. Rapporten er et tidspunktsspesifikt dokument.

## Personvern og sikkerhet

Ingen kandidatdata, e-postkrav, sporing, cookies, lokal lagring eller database.
Ingen profil eller rapport lagres på serveren. POST-kroppen behandles flyktig;
serverlogger inneholder ikke spørsmål, svar, virksomhetssøk eller rå kildepayload.
Kun offentlige kildeoppslag mellomlagres i RAM. Nedlasting er brukerinitiert.

API-et validerer lengder, enumerasjoner, antall, skalaer og kodeformat. React
escaper tekst. Eksterne adapteradresser er faste. JSON-kropp begrenses til 32 KB.
Helmet leverer CSP, MIME- og øvrige sikkerhetshoder. CORS åpnes ikke: frontend
og API skal ha samme origin. Ingen admin- eller lagringsendepunkter finnes.
WordPress-administrasjon håndteres av WordPress, og broen gjør ingen adminskriving.
Det finnes ingen NAV-token i klient eller repo.

120 forespørsler/minutt/IP begrenser offentlig API. Bak en proxy må faktisk
proxyoppsett og `trust proxy` gjennomgås; ikke stol blindt på `X-Forwarded-For`.
RAM-cache (maks 500 nøkler) er beregnet på én instans. Brreg: 10 min, SSB metadata:
6 timer, lønn: 12 timer. Ingen stille visning av utløpt cache etter kildefeil.
Flere instanser trenger delt cache/rate-limit før skalering.

## Videre faser

NAV-worker, cursor, database, ACTIVE/INACTIVE, utløp, deduplisering og
overvåket ferskhet er fase 2. Å angi et token alene aktiverer aldri tall i MVP-en.
Ingen feed per sidevisning. Historisk annonselevetid skal ikke bli time-to-hire.
Regional kandidatmodell, kalibrering, samtykkebasert historikk og delbare
rapportlenker er egne oppgaver. Se `release-plan.md` før staging eller produksjon.
