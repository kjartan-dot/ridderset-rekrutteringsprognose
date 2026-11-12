# Ridderset Rekrutteringsinnsikt

Utviklingsprosjekt for et datadrevet og faglig etterprøvbart rekrutteringsverktøy på https://ridderset.no/rekrutteringsprognose/.

**Status 12. november 2026:** Dette repoet inneholder en kravspesifikasjon og eksisterende WordPress-kildekode. Det er ennå ikke en ferdig app, NAV-integrasjon eller validert statistisk prognose. Produksjonssiden skal ikke endres uten separat godkjenning.

## Slik kommer du i gang i Codex

1. Åpne GitHub-repoet kjartan-dot/ridderset-rekrutteringsprognose i Codex.
2. Les AGENTS.md. Den inneholder hele bestillingen, datakilder, foreslått arkitektur og akseptansekriterier.
3. Les legacy/wordpress-page-2124.html. Dette er faktisk eldre WordPress-kode, ikke et fungerende prosjekt.
4. Bruk oppdragsteksten nedenfor.

### Kopier denne bestillingen til Codex

> Les AGENTS.md og legacy/wordpress-page-2124.html. Gjennomfør fase 0 og fase 1 som en faktisk fungerende, testbar lokal applikasjon. Start med teknisk kartlegging og prioritering. Sett opp TypeScript-frontend, serverbaserte adaptere for Brønnøysundregistrene og SSB, støtte for tilgjengelige NAV-statistikkilder, yrkessøk, Worklife-egenvurdering, HR-kapasitet og en nedlastbar beslutningsrapport. Bygg Playwright-tester for mobil og PC, inkludert feilsituasjoner og søk. Skill live API-data, snapshots, simulerte testdata og antakelser. Ikke skriv til ridderset.no eller publiser i produksjon. Lever kode, tester, kjøreinstruksjoner, datakilderegister, metodebeskrivelse og stagingplan.

## Prioriterte milepæler

| Fase | Leveranse | Akseptanse |
| --- | --- | --- |
| 0 | Kartlegging, kodeprosjekt og tester | Ingen endringer i publisert WordPress-side |
| 1 | Virkende bedriftssøk, yrkessøk, SSB, Worklife og rapport | E2E-testet på mobil og PC |
| 2 | NAV stilling-feed og søkbar annonsehistorikk | Godkjent tilgang, robust synkronisering og datakvalitet |
| 3 | Flere regionale data og validert modell | Etterprøvd med faktiske rekrutteringsutfall |

## Hvorfor egen kodebase?

Den tidligere WordPress-modellen brukte lange HTML-blokker. WordPress erstattet av og til JavaScript-tegn med HTML-entiteter, som gjorde at blant annet yrkes- og bedriftsøket sluttet å virke. En versjonsstyrt frontend/backend med tester og egne JS/CSS-filer er derfor nødvendig.

## Offentlige kilder

- Brønnøysundregistrenes API: https://data.brreg.no/enhetsregisteret/api/dokumentasjon/no/index.html
- SSB PxWeb API: https://www.ssb.no/api/pxwebapiv2
- NAV stilling-feed: https://navikt.github.io/pam-stilling-feed/
- NAV stillingsstatistikk: https://www.nav.no/no/nav-og-samfunn/statistikk/arbeidssokere-og-stillinger-statistikk/ledige-stillinger

**Sikkerhet:** Dette repoet er offentlig. Ikke publiser hemmeligheter, API-tokens, private kundedata eller kandidatopplysninger.

**Faglig grense:** Arbeidsgivers egenvurderte Worklife-score er ikke en dokumentert medarbeidermåling eller statistisk validert prognose.
