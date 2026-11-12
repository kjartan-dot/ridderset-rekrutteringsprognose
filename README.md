# Ridderset Rekrutteringsinnsikt

Fungerende lokal MVP for fase 0 og 1: offentlig markedsstatistikk,
arbeidsgivers egenvurdering og en konkret plan før rekruttering.
**Produksjon på ridderset.no er ikke endret.** Legacy-arkivet er bevart.

## Kjør lokalt

Node.js 24 og npm. Ingen API-nøkkel eller WordPress-tilgang kreves.

```sh
npm ci
npm run dev
```

Åpne <http://localhost:5173>. API: <http://localhost:3001/api/health>.
Brreg/SSB krever servernettverk. Nettleseren kaller bare appens egen origin.

Prøv produksjonsbygget **lokalt**, uten publisering:

```sh
npm run build
PORT=3001 npm start
```

Åpne <http://localhost:3001>. Eksterne JS/CSS-filer lastes uten Gutenberg.
Ved restriktiv hjemmemappe: `npm ci --cache /tmp/ridderset-npm-cache`.
Ingen hemmeligheter skal ligge i klientvariabler eller offentlig repo.

## Hva fungerer?

- Live Brreg-søk på navn/org.nr., hovedenhet/underenhet, avdeling, paginering,
  registermetadata og bekreftelse av faktisk arbeidssted.
- Synlige kildefeil og manuell fallback merket «oppgitt av arbeidsgiver».
- 407 yrker, kontrollerte synonymer og tastatursøk. «Salgsjef» → STYRK08 1221.
  Flertydige prosjektleder-/driftsteknikertitler får flere kodeforslag.
- Live SSB 11418: median månedslønn, siste publiserte år og kildeavgrensning.
  Avgrenset metadataadapter for pendling, sysselsetting/næring, utdanning,
  befolkning og flytting.
- NAV-snapshots: Bedriftsundersøkelsen 2026 med 257 kontrollerte yrkeskoblinger
  og 95 % KI; stillingstilgang januar–oktober 2026, fylker og nasjonal topp 30.
- Seks Worklife-spørsmål med ubesvart-status og frivillige illustrative
  delscorer. Brand, Index og HR holdes adskilt; ingen sertifisering/totalscore.
- Scenarioer, fem prioriterte tiltak, 30/60/90-plan, TXT/JSON og utskrift/PDF
  via nettleseren. Ingen innlogging, e-post eller serverlagring.

**Aktiv NAV-feed er utilgjengelig i fase 1.** Token, worker og indeks er ikke
aktivert. Ingen oppdiktede aktive annonse-/posisjonstall, ansettelsesdato,
lokal median eller sannsynlighet vises.

## Tester

```sh
npm run check
npx playwright install chromium
npm run test:e2e
```

Vitest/Supertest kjører enhets- og API-kontrakter. Playwright tester faktisk
produksjonsbygg og hele API-stakken med versjonerte kildesvar via en **egen
testserver**. Vanlig server har aldri fixture-fallback. CI deployer ikke.

Chromium: mobil 390×844 og PC 1280×800. Breddekontroll: 360, 390, 768, 1280,
1920. Dekker søkeforslag, underenhet, tastatur, seks skyvefelt, manuell fallback,
kildefeil/retry, scenario, rapportoppdatering og faktisk TXT-nedlasting.

```sh
npm run test:live             # egne read-only oppslag mot faktiske kilder
npx playwright show-report   # testbevis etter nettlesertester
```

I avgrensede miljøer kan `PLAYWRIGHT_BROWSERS_PATH=/tmp/ridderset-browsers`
settes ved installasjon/kjøring, eller bruk
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium`.

## Data og oppdatering

NAV-URL-er, SHA-256 og hentetid: `data/nav-sources.json`. Originaler: `data/raw/`.
Python 3.12 / openpyxl trengs bare for å oppdatere disse:

```sh
python -m venv work/venv
work/venv/bin/pip install -r scripts/requirements.txt
work/venv/bin/python scripts/import_nav.py           # eksisterende originaler
work/venv/bin/python scripts/import_nav.py --refresh # gjennomgått 2026-utgave
```

Ny periode eller arkstruktur må gjennomgås før importeren endres. Commit
original, manifest og snapshot sammen. Ingen scraping av arbeidsplassen.no.
`npm run data:occupations` henter kode/navn og redaksjonelle synonymer fra arkivet,
aldri lønnstall.

## Dokumentasjon og demonstrasjon

- [Demonstrasjon og leveransestatus](docs/demo.md)
- [Teknisk kartlegging og prioritert oppgaveliste](docs/legacy-audit.md)
- [Arkitektur, API og personvern](docs/architecture.md)
- [Kilderegister og begrensninger](docs/data-source-registry.md)
- [Beregninger og Worklife-metode](docs/calculation-method.md)
- [Staging, produksjonsgate og rollback](docs/release-plan.md)

WordPress-broen i `integrations/wordpress/` er for staging-utprøving; den er
ikke installert eller WordPress-testet her. Produksjonsintegrasjon krever
brukerens godkjenning etter demonstrasjonen.
