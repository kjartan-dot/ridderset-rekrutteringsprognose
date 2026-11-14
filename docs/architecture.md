# Teknisk arkitektur – utviklingsversjon 0.1

## Valg

Vi prioriterer et selvstendig, versjonsstyrt WordPress-plugin med en liten ES-modul-frontend fremfor enda en stor Gutenberg HTML-blokk. Dette er en bevisst teknisk forenkling av den opprinnelige React/Vite-muligheten i AGENTS.md. Det kreves ikke en separat React-tjeneste for å levere første nyttige versjon.

- PHP-plugin: ridderset-rekrutteringsinnsikt.php. Registrerer kortkoden [ridderset_rekrutteringsinnsikt] og proxy-endepunktene /wp-json/ridderset/v1/companies, /units og /health.
- Brukerflate: assets/template.html + assets/style.css + assets/app.js. JavaScript er en ekstern ES-modul, ikke inline-kode fra WordPress.
- Ren domenelogikk: src/core.mjs. Her finnes STYRK-synonymer, Worklife-egenvurdering, lønnssammenligning, prioriterte tiltak og tekstbasert beslutningsnotat.
- Stillings- og lønnsgrunnlag: data/occupations.json med 407 yrkesgrupper og eksplisitt historisk SSB-kilde. Ingen skjult oppdatering.
- Lokal utviklingsserver: scripts/dev-server.mjs; standardinnstilling MOCK_API=1 (fiktive testbedrifter). MOCK_API=0 bruker Brønnøysundregistrene via separat Node-proxy i utviklingsmiljø. Denne tjenesten er ikke produksjonsbackend.
- Test: Node-assert for ren logikk og Playwright for mobil/desktop. CI sjekker også PHP-syntaks.

## Dataflyt

1. Frontend laster lokal yrkesliste, lagret som JSON. Kilden er en historisk kopi fra WordPress, merket 2024–2025; ikke et nåtidig API-oppslag.
2. Bedriftssøk går fra nettleseren til samme origins WordPress REST-endepunkt. PHP foretar validering, caching og et kontrollert kall til den faste Brreg-adressen. Forespørslene går ikke direkte fra nettleseren til Brreg.
3. Valgt bedrift, stilling, antall personer, lønn og arbeidssted ligger bare i nettleserens minne. Manuell bedriftsregistrering merkes egenrapportert.
4. Worklife-søyler blir vurdert separat fra arbeidsmarkedstallene. Ikke-besvarte spørsmål telles ikke som besvarte selv om skyveren visuelt står på 5.
5. Beslutningsnotat genereres lokalt i nettleseren (tekstfil), uten innsending av data til serveren.

## Bevisste avgrensninger

- Ingen NAV stilling-feed før tilgangen er godkjent, en synkronisering er satt opp og historikken kan kvalitetssikres.
- Ingen statistisk rekrutteringssannsynlighet, antatt søkerantall, tid til ansettelse eller validert samlet risikoscore. Slike mål trenger faktiske prosessutfall for kalibrering.
- Ingen live SSB-forespørsel ennå. Neste versjon må implementere en tabellspesifikk PxWeb v2-adapter og dokumentere variable/måleenhet, periode og endring i tabellmetadata.
- Ingen konto, CRM, e-postfangst, cookies eller kandidatpersonopplysninger i MVP.
- Ingen direkte produksjonssetting fra denne grenen. Først staging, nettlesertest og godkjenning.

## Sikkerhetsprinsipper

- WordPress REST-proxy bruker fast Brreg-domene, streng søkevalidering, svarbegrensning, tidsavbrudd og transient-cache i 15 minutter.
- Web-endepunkter for oppslag er bevisst åpne, fordi brukerflaten skal kunne brukes uten innlogging. Før produksjon: legg til IP-/proxybasert rate limiting, overvåkning og eventuell CDN-caching.
- Ingen dynamisk innsetting av bedriftsnavn eller yrkesdata via HTML-strenger: brukerdata skrives med textContent.
- Alle API-nøkler, inkludert eventuell NAV-feed-tilgang, skal ligge server-side utenfor git.
- Egenrapporterte tall fra arbeidsgivere er ikke uavhengig bekreftede data.
