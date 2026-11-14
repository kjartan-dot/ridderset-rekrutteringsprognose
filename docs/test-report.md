# Teststatus 14. november 2026

## Bestått
- Syntakskontroll og 28 automatiserte tester. Inkluderer modell, API-ruter, prosessvisninger og NAV-kontrakter med fiktive data.
- Ny app testet i nettleser via administrert forhåndsvisning: automatisk Nordlaks-søk, valg av Nordlaks Havbruk AS, Salgsjef/1221, SSB 89 170 kr/mnd for 2025, oppgitt lønn 70 000 med beregnet avvik 21 %, fjernarbeid og hasteoppstart med tilpassede råd.
- Nullscore eksplisitt bekreftet på to spørsmål ga 0/100; rapporten viste dette. Nullstilling fjernet score fra rapporten.
- Faktisk tekstrapport lastet ned og kontrollert i fil.
- Desktoplayout og smal layout ved nettleserzoom, 545 og 340 CSS-piksler, uten horisontal rulling. Skjermbilde viste enkeltkolonne ved 340.
- Privat Site publisert: https://ridderset-arbeidsmarkedsanalyse-test.snappyhake21.chatgpt.site . Tilgangssiden krever ChatGPT-innlogging, som forventet.

## Begrensninger
- Test på fysisk mobil og eksakt 390×844-emulering ikke gjennomført. Nettleserens DevTools er sperret; zoomkontroll er ikke det samme som mobiltest.
- Den publiserte appen bak privat innlogging er ikke sluttkontrollert med brukerens sesjon. Lokal appflyt er kontrollert; vellykket publisering er bekreftet av vertstjenesten.
- Ingen full WCAG-revisjon, lasttest eller garanti for skjemalevering på ridderset.no.
- NAV-modul er kontraktstestet, ikke aktivert. Konsumenttilgang, varig tilstand, jobbplan og full synk gjenstår. Den er ikke brukt som grunnlag for tall i demonstrasjonen.
- Produksjonssiden 2124 på ridderset.no er fortsatt urørt. Demonstrasjonen må vurderes før bytte.

## Feil rettet
Ved endring av bedriftssøk fjernes tidligere valgt virksomhet. Ved endring av stillingsnavn fjernes yrkesvalg og lønn, og pågående svar gjøres ugyldige. Dette hindrer blanding av gamle og nye analysegrunnlag. Nytt yrke må bekreftes.
