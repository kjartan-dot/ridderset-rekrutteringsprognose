# Bedrift først: leveranse og utrulling

## Resultat

Ny, isolert WordPress-modul: `integrations/wordpress/ridderset-hurtigsjekk/`. Shortcode: `[rr_hurtigsjekk]`.

Flyten er bedrift → valgt rolle → markedstall. Brreg foreslår kommune og næring. Inntil tre redaksjonelle rolleforslag følger registrert bransje; rollen bekreftes ved å klikke. Hovedenhet og avdeling kan velges separat. Rolle- og kommunesøk fungerer også uten bedrift. Et valg er ikke dokumentasjon på et faktisk kommende bemanningsbehov.

Resultatet viser en relativ nasjonal yrkesindikator, lokale teksttreff i NAV-annonser og SSBs nasjonale median for avtalt månedslønn. Lønnstilbud, sektor, pendling, kilder og metode ligger i åpne/lukke-felt. Rapport kan lastes ned uten å registrere kontaktinformasjon.

Ingen ny database, hemmelighet, e-postutsending eller endring i NAV-synk er nødvendig. API-forespørsler leser offentlige data. Valg i verktøyet lagres ikke som kundehenvendelser. WordPress-adapteren har kortvarig cache og en begrensning på antall oppslag. JavaScript lastes som egne filer.

## Metode

Se [company-first-data.md](company-first-data.md) for kilder og mapping. `core.js` beregner invers midtrang av NAVs normaliserte stramhetsindikator. Referansen har i denne årgangen 143 yrker med positivt publisert mangelanslag og stramhet over 0 og under 100 prosent. Høy verdi betyr mindre relativt nasjonalt mangelpress. Det er Riddersets presentasjonsregel, ikke en offisiell NAV-skår eller en trent sannsynlighetsmodell.

Manglende kilde, nullanslag, ikke-nasjonale data, duplikat for valgt kode, undertrykt verdi og stramhet på 100 prosent gir ingen skår. Usikkerhet justerer ikke skåren i skjul. Kildeår, konfidensintervall og referansegruppe vises separat.

NAV-kortet er et kontrollert tekstsøk etter én tittel eller fagterm i kommunen, ikke en komplett STYRK-opptelling. Null teksttreff betyr ikke mangel på konkurranse eller god kandidattilgang. Ingen summering av flere overlappende søkeord.

## Kjøring

```sh
npm test
node scripts/hurtigsjekk-server.mjs
```

Lokal adresse: `http://127.0.0.1:3101`. Bruk `node scripts/build-hurtigsjekk-worker.mjs /absolutt/preview-checkout` for å generere den private demonstrasjonen fra samme WordPress-filer og adapter. Ingen klientnøkler eller serverhemmeligheter inngår.

## Verifisering 21. november 2026

- 40 Node-tester bestått, inkludert 12 nye tester for yrkessøk, bransjeregler, skala, ukjent data, rangering og usikkerhet.
- Syntakskontroll for frontend, adapter og preview-generator bestått.
- Reelt Brreg-oppslag: Nordlaks Oppdrett AS og underenheten i Stokmarknes. Riktig kommune og virksomhetsaktivitet kommer inn.
- Direkte nettleserkontroll via godkjent nettleser: bedriftssøk, avdelingsvalg, bransjekort, nasjonal indikator, kildevisning, ukjent skår og endret kommune.
- Mobilvisning kontrollert i en 390 × 844 iframe. Innholdets bredde var 375 px med rullefelt og ingen horisontal overflyt. Søkefeltet var synlig på første skjerm. Desktop kontrollert visuelt.
- Live SSB-svar for havbruksarbeidere: år 2025, avtalt median månedslønn 52 370 kroner, median med bonus/uregelmessige tillegg 59 710 kroner. Første forespørsel var treg; proxyens tidsavbrudd for markedsdata ble utvidet til 20 sekunder. Feil gir en synlig utilgjengelig-tilstand.
- Det automatiserte Playwright-scriptet `tests/hurtigsjekk.e2e.py` er skrevet og Python-syntakskontrollert. Det kunne ikke startes i executorens Chromium på grunn av en socket-restriksjon. Det er ikke rapportert som bestått.
- PHP-runtime finnes ikke i dette miljøet. PHP-adapteren er gjennomgått, men er ikke kjørt i WordPress. Aktiv siden er ikke erstattet.

## Publisering etter gjennomgang

Prosjektets AGENTS.md krever at demonstrasjonen blir kontrollert før produksjon erstattes. Den private demonstrasjonen er derfor første leveranse.

1. Pakk plugin-mappen til en ZIP med `ridderset-hurtigsjekk/` som toppmappe.
2. Installer og aktiver på WordPress-staging. Opprett en testside med `[rr_hurtigsjekk]`. Kontroller Brreg, kildetall og mobilvisning i WordPress-temaet.
3. Etter godkjenning: hent siste versjon og seksjonslås av side 2124, ta vare på originalblokkene og erstatt bare den gamle introduksjonen med den nye shortcoden. Legg den eksisterende markedssjekken sammen med fordypningen, slik at to konkurrerende innganger ikke vises.
4. Behold den eksisterende grundige analysen og alle gamle inngående lenker. Pek snarveien i Innsikt og verktøy til den samme hovedadressen.
5. Kontroller publisert og utlogget visning. Tilbakerulling er å gjeninnføre de arkiverte toppblokkene; pluginen påvirker ingen side uten shortcoden.

## Det som kreves for faktisk modelltrening

Den eksisterende tabellen for rekrutteringsutfall er tom ved kontroll. Trening er derfor ikke gjennomført. En senere modell må få et fast utfallsmål, for eksempel kvalifiserte kandidater etter en definert periode, samt rolle, faktisk arbeidssted, krav, lønnsramme og rekrutteringsopplegg. Treningsdata må skilles fra senere testdata og modellens sannsynligheter kontrolleres mot faktiske utfall. Antall annonser er ikke et treningsmål for antall kvalifiserte kandidater.
