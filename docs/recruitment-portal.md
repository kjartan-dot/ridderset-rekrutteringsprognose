# Ridderset Arbeidsrom: kunde- og kandidatreise

## Beslutning 14. november 2026
Utvid prosjektet med en avgrenset prosessportal. WordPress beholder markedsføring, artikler, verktøy og kontaktinnganger. En separat portal med samme identitet håndterer innloggede prosesser. Supabase-prosjektet ridderset-rekrutteringsprognose er bekreftet aktivt i eu-north-1; egnethet for personopplysninger og driftsopplegg er ikke godkjent av dette alene.

WordPress kan utvides med egne roller og funksjoner, men standardroller er ikke tilstrekkelig tilgangsstyring mellom kunder og individuelle søknader. En ny portal skal ikke gjøre kunder eller kandidater til redaktører på nettstedet.

## Tre visninger
| Bruker | Innhold | Avgrensning |
|---|---|---|
| Kandidat | Egen søknad, uttrykkelig publisert status, neste steg, dato for ny oppdatering og kontaktperson | Ingen rangering, andre kandidater, interne notater eller udelte vurderinger |
| Kunde | Egne oppdrag, milepæler, kundens oppgaver, godkjente kandidatsammendrag og beslutninger | Bare prosesser vedkommende er eksplisitt tilordnet |
| Ridderset | Arbeidsliste, intern prosess, publisering av status, frister, ansvar og historikk | Tilgang etter konkret oppdrag og rolle |

## Status er et løfte
Intern flytting i en kandidatpipeline skal ikke automatisk publisere et avslag eller en vurdering. Rekruttereren publiserer en egen forståelig oppdatering med neste kontaktpunkt. Eksempel: «Intervjuet er gjennomført. Vi avklarer neste steg med arbeidsgiveren. Du får ny beskjed innen fredag.»

Hvis datoen passeres, får rekruttereren en oppgave. Systemet skal aldri finne på fremdrift. Kunde- og kandidatmeldinger godkjennes separat. E-postvarsler skal si at en oppdatering finnes, uten å ta med vurderinger. Ingen utsending er aktivert.

## Kommersielt løp
Relevant artikkel eller behovsverktøy → konkret behov → kvalifisert samtale → avtalt oppdrag → kundeportal → ryddig kandidatoppfølging → oppstart → videre HR-oppfølging.

Portalen skaper ikke trafikk alene. Den kan gjøre leveransen tydeligere, redusere usikkerhet og støtte gjenkjøp. Mål derfor kvalifiserte henvendelser, møter, tilbud, oppdrag og gjenkjøp separat fra kandidatopplevelse, overholdte oppdateringsfrister og fullførte søknader.

## Bygget i denne endringen
`src/process.js` har en ren domenemodell for filtrerte prosessvisninger, eksplisitt statuspublisering og forfalte oppdateringsløfter. Fem tester bruker utelukkende fiktive opplysninger. Sammen med eksisterende tester består 18 tester.

Dette er ikke autentisering eller databasebeskyttelse. Modulen er ikke koblet til en offentlig API-rute. Brukeridentitet må komme fra verifisert serversesjon, og medlemskap må hentes server-side. Klienten kan aldri velge sin rolle eller sende inn medlemslister som autoritativ tilgangskontroll.

## Før pilot med faktiske personer
1. Bygg staginggrensesnitt for kandidat, kunde og rekrutterer.
2. Implementer verifisert innlogging og oppdragsmedlemskap, databasepolicyer og private dokumenter. Test at kunde A ikke kan lese kunde B, og at kandidat A ikke kan lese kandidat B, også ved direkte API-kall.
3. Avklar behandlingsansvar, formål, sletting, eksport, sikkerhetskopier og driftsansvar. Ikke legg CV-er i offentlig WordPress-mediebibliotek.
4. Implementer hendelseslogg og varsler med idempotens og separat utsendelsesgodkjenning. Ingen ekte meldinger sendes under utvikling.
5. Test én prosess fra avtale til avslutning, inkludert tilbaketrekking, avslag, pause og endret frist.

Første pilot skal ikke forsøke å erstatte Teamtailors fulle funksjonsbredde. Kalender, annonsekanaler, søknadsbehandling, dokumenthåndtering og rapportering må prioriteres etter faktisk bruk og totale driftskostnader. Egenutvikling er ikke automatisk billigere enn en lisens.
