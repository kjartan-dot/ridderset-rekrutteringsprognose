# Teknisk gjennomgang av tidligere WordPress-side

Grunnlag: legacy/wordpress-page-2124.html, et arkiv av side 2124 på ridderset.no fra 12. november 2026.

## Det som kan gjenbrukes

- Yrkesgrunnlag: 407 STYRK08-grupper med historisk 2024/2025 nasjonal lønnsstatistikk.
- Praktisk yrkessøk med synonymer, men kun når JavaScript faktisk blir evaluert.
- Brreg-søk i hovedenheter/underenheter; tidligere implementert direkte fra nettleseren.
- Arbeidsgivers manuelle egenvurdering av Worklife Brand og Index.
- Skille mellom egenrapportert modell og offentlig datakilde.

## Viktige feil og begrensninger

1. WordPress omformet i enkelte renderinger logiske &&-operatorer til HTML-entiteter inne i skriptblokker. Dette gjorde scriptet ugyldig, og søke- og kalkulasjonsfeltene sto i starttilstand. Løsning: last JS fra egne filer med versjonskontroll.
2. «Stillingssøk» var i realiteten søk i yrkesgrupper, ikke faktiske aktive annonser. Løsning: presis terminologi og separat NAV-feed i en senere fase.
3. Bedriftsoppslag via direkte nettleserfetch var sårbart for feil, CORS, cache og registreringsadresse vs arbeidssted. Løsning: server-side WordPress REST-proxy med caching, feilmeldinger, hoved-/underenhetsvalg og manuell fallback.
4. Selvrapporterte Worklife-scorer ble fremstilt for likt uavhengige medarbeider- og kandidatmålinger. Løsning: tydelig dataklasse, svarstatus og ingen score før gruppen er fullstendig vurdert.
5. Historiske NAV-/SSB-tall og nasjonale arbeidsmarkedsmål gir ikke alene et lokalt prediktivt rekrutteringsestimat. Løsning: tydelig kilde, år, geografi og status; ingen fiktiv rekrutteringsrisiko.
6. Ingen robust automatisk QA før publisering. Løsning: Node-tester, Playwright, PHP-syntaks og staging-gate.

## Kontrollert funksjonalitet i ny kodebase

Repoet inneholder tester for beregninger og nettleserflyt, men faktisk ekstern Brreg-integrasjon på WordPress staging må gjennomføres før produksjonssetting. NAV-feed er ikke implementert. SSB-tabell 11418 er fortsatt en historisk kopi som må kontrolleres mot originalkilden.
