# Teststatus 14. november 2026

## Bestått
- `npm run check`: syntaks i server, frontend og beregningsmodul.
- `npm test`: 13 automatiserte tester. Manglende/ugyldige svar, reell nullscore, rapport, lik prioritet, Brreg-formatering, underenheter, feilhåndtering, SSB-dimensjoner, ti stillingstitler og HTTP-ruter.
- Brreg live fra serveradapter: Nordlaks gir 10 hovedenheter, underenhetssøket gir første 12 treff. Ukjent antall personer beholdes som ukjent.
- SSB direkte API-kontroll: 1221, år 2025, nasjonal median månedslønn 89 170 kr, tabellmetadata oppdatert 28.08.2026.

## Ikke bestått / ikke gjennomført
- Full nettlesertest av ny app er ikke gjennomført. Lokal Chromium kunne ikke starte på grunn av socket-rettigheter i miljøet. Det er ikke dokumentasjon på feil i appen, men produksjonskravet er fortsatt åpent.
- Mobil 390×844, desktop 1280×800, tastatur, eksportknapp og feilstater må verifiseres i staging. CSS alene er ikke en mobiltest.
- Ingen lasttest, tilgjengelighetssertifisering, driftstest eller sikkerhetsrevisjon.
- NAV-feed, WordPress-integrasjon, innlogging og kundelagring er ikke implementert.

## Eksisterende nettsted
Forsidens to hovedinnganger og HR-partnersidens nye innhold er lest tilbake i nettleser. Bedriftssøk og yrkessøk på eksisterende rekrutteringsside fungerte i desktopkontrollen. Kontaktskjemaet vises, men er ikke sendt inn; e-postlevering og CAPTCHA er ikke testet. Ingen påstand om at hele nettstedet er ferdig kvalitetssikret.

## Manuell test som må utføres før produksjon
1. Begge skjermstørrelser: ingen horisontal rulling; alle knapper og etiketter synlige.
2. Søk Nordlaks, velg hovedenhet og underenhet separat; bekreft arbeidssted.
3. Velg salgsjef/1221, bytt til annet yrke mens lønn hentes; gamle svar må ikke overskrive nytt valg.
4. Simuler 429/5xx; feilmelding og manuell utfylling, ingen falske tall.
5. Bekreft 0, 5 og 10; la spørsmål stå ubesvart; nullstill; verifiser rapporten.
6. Last ned rapport og kontroller at den samsvarer med synlig informasjon og kildevalg.
