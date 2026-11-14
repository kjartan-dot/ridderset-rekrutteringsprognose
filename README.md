# Ridderset Rekrutteringsinnsikt

Interaktivt beslutningsverktøy for arbeidsgivere. Målet er å kartlegge markedet og arbeidsgivers forutsetninger, og foreslå tiltak uten falsk presisjon.

## Status: fungerende grunnstruktur i utviklingsgren, IKKE produksjon

**Utviklingsgren:** feature/mvp-beslutningsstudio. **Produksjonsnettsiden er ikke endret.**

Prosjektet inneholder kildekode for et WordPress-plugin, en mobiltilpasset frontend, 407 historiske STYRK08-yrker, Worklife-egenvurdering, serverbasert bedriftsoppslag og rapport. Koden er ikke satt opp på WordPress staging eller testet med levende Brreg-data i WordPress ennå. NAV stilling-feed er ikke tilkoblet. SSB 11418-datasettet er foreløpig en tydelig merket historisk kopi, ikke live.

## Lokal oppstart

1. Installer Node.js 20+.
2. Kjør npm install.
3. Kjør npm run dev, og åpne http://localhost:4173.
4. Søk etter DEMO. Opplysningene er fiktive TESTDATA, ikke en reell virksomhet.
5. Kjør npm run check:syntax og npm run test:unit.
6. Kjør npx playwright install chromium og npm run test:e2e.

Om du vil prøve et reelt Brreg-oppslag i lokal utvikling, sett miljøvariabelen MOCK_API=0 når du starter npm run dev. Da brukes fortsatt en lokal proxy. Ikke bland dette med verifisert produksjonsintegrasjon.

## Prosjektstruktur

| Mappe/fil | Innhold |
| --- | --- |
| ridderset-rekrutteringsinnsikt.php | WordPress-plugin, shortcode og server-side REST-adapter for Brreg |
| assets/template.html | HTML-mal, bare statisk struktur |
| assets/style.css | Responsivt Ridderset-design |
| assets/app.js | Nettleserinteraksjon: bedrift, yrke, Worklife og rapport |
| src/core.mjs | Rene beregninger, synonymer, kildebevisst rapport |
| data/occupations.json | 407 historiske STYRK08-grupper og SSB 2024/2025 snapshot |
| scripts/dev-server.mjs | Lokal testserver med fiktive data som standard |
| tests/unit og tests/e2e | Node-test og Playwright på mobil/PC |
| docs | Arkitektur, metode, datakilder, stagingplan og tidligere kodegjennomgang |
| legacy | Kopi av tidligere publiserte WordPress HTML-blokker, KUN REFERANSE |

## Installering på WordPress staging

Følg docs/staging-release.md. Plugin-mappen må inneholde PHP-filen, assets, src og data. Bruk kortkoden [ridderset_rekrutteringsinnsikt]. Ingen JavaScript skal limes inn i WordPress HTML-blokk. Test alle funksjoner på staging før publisering.

## Status for datakilder

- Brønnøysundregistrene: serveradapter implementert, oppsett på staging og faktisk live-søk gjenstår.
- SSB 11418: historisk kopi (2024 og 2025), ikke ny API-synkronisering.
- NAV: ingen live feed eller yrkesvise annonser ennå.
- Worklife: kun arbeidsgiverens selvrapportering, ikke medarbeider-/kandidatundersøkelse.
- Kartverket, SSB pendling, utdanning, HK-dir, NHO, KS og regnskapsdata: evaluert som fremtidige kilder, ikke integrert.

## Sikkerhet og metode

Repoet er offentlig. Ingen tokens eller personopplysninger skal legges inn. Fiktive testbedrifter må aldri presenteres som faktiske oppslag. Registrerte ansatte er ikke årsverk. Egenvurderte Worklife-scorer er ikke dokumenterte mål. Ingen rekrutteringssannsynlighet eller ansettelsestid vises uten kalibrerte utfallsdata.

Les AGENTS.md for produktmål og docs/data-source-registry.md for full kildevurdering.

**Ikke slå sammen til main eller deploy før testene er gjennomført og løsningen er kontrollert på staging.**
