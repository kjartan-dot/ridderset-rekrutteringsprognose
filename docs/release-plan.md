# Staging og rollback

## Nåværende leveranse

Lokal MVP for fase 0/1. Ingen WordPress-kall, endring av side 2124, DNS-endring
eller produksjonsdeploy. CI deployer ikke. Brreg/SSB leses og NAVs offentlige
publikasjoner er lastet ned. Repoet inneholder ingen produksjonshemmeligheter.

## Staging

1. Bruk separat godkjent staging-origin, Node 24 og TLS. Frontend og `/api`
   skal dele origin. Egress: `data.brreg.no`, `data.ssb.no`, og `www.nav.no`
   ved vedlikehold av snapshots.
2. `npm ci`, `npm run check`, `npx playwright install chromium`,
   `npm run test:e2e` og `npm run test:live` fra staging-nettet.
3. `npm run build`; kjør `PORT=3001 npm start`. Behold tidligere release.
   Overvåk `/api/health`, tilgjengelighet og feil uten å logge profiler/søk.
4. Gjennomgå reverse proxy og faktisk klient-IP før `trust proxy` endres.
   Ikke stol blindt på `X-Forwarded-For`. Behold rate limiting og kilde-cache.
5. Kontroller mobil/PC, alle søk, underenhet, kildefeil, tekst/JSON og utskrift/PDF.
   Aktive NAV-tall skal fortsatt stå som utilgjengelige.
6. Valgfri WordPress-staging: installer broen i `integrations/wordpress/`, sett
   `RIDDERSET_INSIGHT_APP_URL` til appens HTTPS-URL i staging `wp-config.php`, og
   bruk `[ridderset_rekrutteringsinnsikt]` på en ny staging-side. Legg konkret
   staging-origin i appens CSP `frame-ancestors`, aldri `*`.
7. Kontroller scrolling, iframe-høyde, tastatur og utskrift i faktisk WP-tema.
   Broen er en integrasjonsskisse; den er ikke WordPress-testet i dette miljøet.
8. Vis staging for brukeren og innhent eksplisitt godkjenning før en separat
   produksjonsendring. Gjennomgå kildevilkår og Worklife-begreper før publisering.

## Produksjonsgate

Testgodkjenning eller merge er ikke brukerens produksjonsgodkjenning.
**ridderset.no skal ikke endres før demonstrasjonen er godkjent.** Ta kopi av
side 2124 og aktuell konfigurasjon før en senere godkjent utrulling.

## Rollback

- Behold forrige app/serverpakke og assets; bytt tilbake release og test helse/søk.
- Ingen databasemigrasjon eller profilpersistens finnes i fase 1.
- På staging: fjern shortcode eller deaktiver bro-pluginet for å vise tidligere side.
- Ved senere godkjent produksjonsutrulling: gjenopprett sikkerhetskopiert side
  2124 og plugin-konfigurasjon ved feil. Dette dokumentet utfører ingen endring.

## Neste faser

NAV konsumentvilkår, produksjonstoken, worker og indeks er fase 2. Delbare
rapportlenker krever lagringssamtykke, levetid og sletting; MVP deler filer.
Regionale SSB-modeller, anonymiserte Worklife-målinger og prediksjonskalibrering
krever egne gjennomganger og faktiske rekrutteringsutfall.
