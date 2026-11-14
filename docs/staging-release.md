# Staging, test og utrulling

**Status:** Koden i grenen feature/mvp-beslutningsstudio er utviklingskode, ikke godkjent for produksjon. Ridderset.no er ikke endret av dette repoet.

## Lokal test

1. Installer Node 20 eller nyere.
2. Kjør npm install (for Playwright-tester).
3. Kjør npm run dev. Åpne http://localhost:4173. Dette er eksplisitte fiktive testbedrifter; søk «DEMO».
4. Kjør npm run check:syntax og npm run test:unit.
5. Kjør npx playwright install chromium og npm run test:e2e.
6. Med MOCK_API=0 npm run dev brukes offentlig Enhetsregister-API via lokal Node-server. Ekstern tilgang må fungere. Ikke forveksle dette med godkjent WordPress-produksjonsintegrasjon.

## WordPress staging

1. Opprett en WordPress-testinstallasjon med samme hovedversjon som ridderset.no.
2. Pakk følgende i én plugin-mappe kalt ridderset-rekrutteringsinnsikt:
   - ridderset-rekrutteringsinnsikt.php
   - assets/app.js, assets/template.html, assets/style.css
   - src/core.mjs
   - data/occupations.json
3. Lag ZIP av plugin-mappen; installer og aktiver kun på staging.
4. Lag en testside med kortkoden [ridderset_rekrutteringsinnsikt]. Ikke lim inn innholdet i en Custom HTML-blokk.
5. Kontroller WordPress REST-endepunktene /wp-json/ridderset/v1/health, /companies?q=Nordlaks&type=enheter og /units?parent=... .
6. Test fysisk mobil og desktop: søk, enheter, 404/429/5xx, validering, sliders, endring av arbeidssted og eksport. Kontroller feil i nettleserkonsollen og at CSS/ES-moduler lastes.
7. Sjekk tilgjengelighet og responsiv layout; gjennomfør personvern- og sikkerhetsvurdering. Legg på cache/rate-limit i ingress før offentlig åpning.

## Forutsetning for go-live

- Alle unit- og E2E-tester grønne, og PHP-syntaks valid.
- Ekte Brreg-oppslag verifisert fra staging og dokumentert.
- Alle SSB-data korrekt merket som historisk snapshot, ikke live.
- NAV-feedtall skjules/merkes utilgjengelige til autorisert datainnhenting er i drift.
- Faglig godkjenning av formuleringer, metode og arbeidsflyt.
- Teknisk rollback: behold gammel WordPress-side, bytt tilbake til opprinnelig innhold ved feil; deaktiver ny plugin om nødvendig.

## Ikke bland miljøer

Fiktive testbedrifter i scripts/mock-data.mjs må aldri fremstå som faktiske virksomheter. Lokal Node-server er for testing, ikke en sikker produksjonsserver. Ingen API-nøkler eller kunde-/kandidatinformasjon skal i repoet.
