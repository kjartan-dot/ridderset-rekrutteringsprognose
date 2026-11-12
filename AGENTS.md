# AGENTS.md – Oppdrag til Codex

## Mandat

Bygg **Ridderset Rekrutteringsinnsikt**, et troverdig og operativt beslutningsverktøy for norske arbeidsgivere og Ridderset Rekruttering. Det skal vise *hvor krevende det kan bli å rekruttere en konkret stilling, hva som driver vanskelighetsgraden, hvilke forhold arbeidsgiveren kan påvirke, og hva man konkret bør gjøre før rekrutteringen starter*.

Hovedmål: gå fra en statisk «rekutteringsprognose» i WordPress til en profesjonell, testbar, datadrevet tjeneste som er integrert på https://ridderset.no/rekrutteringsprognose/. Produktet skal være mobilvennlig, tilgjengelig, etterprøvbart og uten oppdiktede tall.

**Les først** legacy/wordpress-page-2124.html. Dette er et kildearkiv fra den eksisterende publiserte WordPress-siden (side ID 2124), ikke en fungerende kodebase. Ikke deploy arkivet som det er. Gjeldende WordPress-side ligger fortsatt i produksjon. Det har vært gjentatte alvorlige feil der WordPress transformerte '&&' til HTML-entiteter inne i inline JavaScript. Besøkendes mobilnettlesere fikk da ugyldig JavaScript og alle søk stoppet. Hovedregelen er derfor: **ingen stor inline JavaScript i Gutenberg core/html**.

Dette repositoryet er offentlig. Aldri legg inn API-token, passord, kundedata, upubliserte dokumenter, identifiserbare kandidatopplysninger eller andre hemmeligheter.

## Produktet må løse fire konkrete brukeroppgaver

1. **Finn arbeidsgiver**: skriv «Nordlaks», få faktiske treff fra Brønnøysundregistrenes Enhetsregister, velg korrekt hovedenhet eller underenhet, og bekreft faktisk arbeidssted. Hent offisielle opplysninger: navn, org.nr., næringskode/-beskrivelse, antall *registrerte personer* (ikke årsverk), registrert adresse, organisasjonsform, og tidspunkt for oppslag. HR-avdeling og turnover kan IKKE antas fra Enhetsregisteret. Dersom registeret er nede: tydelig feilmelding og valgfri manuell utfylling, merket «oppgitt av arbeidsgiver».
2. **Finn yrke og konkret rolle**: søk på vanlige stillingstitler, for eksempel salgsjef, prosjektsjef, tømrer, sykepleier, rekrutterer, elektriker, driftstekniker. Vis beste forslag og offisiell STYRK08-kode. Tillat å endre mappet yrke. Skille alltid stillingstittel, yrkesgruppe og faktisk stillingsannonse. Relevant geografisk marked (kommune, fylke, pendleområde, mulighet for nasjonalt/remote-søk), antall ønskede ansettelser, krav, lønn, fleksibilitet og starttid.
3. **Analyser arbeidsmarked og arbeidsgiver**: dokumentert etterspørsel (aktive annonser og antall utlyste posisjoner, to separate størrelser, geografi og STYRK), relevante historiske annonser, sesong og utvikling, lønnsmessig konkurranseevne mot dokumentert SSB-statistikk, NAV-undersøkelser og arbeidsledighet i korrekt aggregeringsnivå. På arbeidsgiversiden skal Worklife Brand (ekstern omdømme/vurdert synlighet), Worklife Index (intern opplevelse / om løfter blir innfridd) og rekrutteringskapasitet (intern HR, ekstern partner, lederansvar) presenteres atskilt. Nåværende bruker-scores er **egenvurderinger**, IKKE validerte Worklife-målinger.
4. **Få et nyttig resultat**: en side med konkrete markedsfakta, årsaker/risiko, forklarbar samlet vurdering når datagrunnlaget er tilstrekkelig, 3–5 prioriterte tiltak, sensitivitet for endring i lønn/geografi/krav/HR-kapasitet og en 30/60/90-dagers plan. Eksport til PDF og delbar rapport uten å kreve personopplysninger (PDF som senere fase hvis nødvendig).

## Viktigste innsikt – to sider av samme rekruttering

Hold disse analytiske nivåene *helt adskilt* i datamodellen, i UI og i eksport:

- **Markedsdata**: offentlig statistikk og observerte utlysninger (faktiske tall og dokumentert dekningsgrad).
- **Arbeidsgiverprofil**: selvrapportert/udokumentert omdømme, oppfølging og HR-kapasitet.
- **Scenario**: hypotetiske justeringer, ikke faktiske tall.
- **Modelloutput**: fortolkning ut fra datagrunnlag, ikke en automatisk «statistisk prognose».

Ingen estimat for ansettelsessannsynlighet, tid-til-ansettelse eller sannsynlig fremtidig søkertall før modellen er trent/validert mot faktiske prosessutfall. **Annonselevetid er ikke det samme som time-to-hire.** Tall for ledighet, publiserte annonser og NAVs anslåtte kompetansemangel må heller ikke blandes som om de var samme mål.

## Prioriterte datakilder og tekniske vilkår

### A – Må fungere i første produksjonsklare versjon

1. **Brønnøysundregistrenes Enhetsregister, API v2.** Dokumentasjon: https://data.brreg.no/enhetsregisteret/api/dokumentasjon/no/index.html. Endepunkter: /api/enheter, /api/enheter/{orgnr}, /api/underenheter, /api/underenheter/{orgnr}. Bruk separat hovedenhet-/underenhetssøk, stabil org.nr.-identitet og kontrollert adresse. Opplysninger og attributter varierer. Behandle 404, 410, 429, 5xx og utilgjengelige felt korrekt. Aldri bruk falske erstatningstall.
2. **SSB Statistikkbanken PxWeb API v2.** https://www.ssb.no/api/pxwebapiv2. Begynn med tabell 11418 for median månedslønn per STYRK08. Etabler også kildeadapter for tilgjengelige SSB-data om sysselsetting, næring, pendling, utdanning, befolkning/alder og flytting; undersøk tabeller og geografiske oppløsninger før valg. Oppgi år, statistikkmål (median vs. gjennomsnitt), sektor, heltids-/deltidsavgrensning og lands-/regionnivå. SSBs data har publiseringslag. Korrekt oppdatert cache og begrensning på spørringer. Ingen oppkonstruert lokal median.
3. **NAVs publiserte statistikk:** https://www.nav.no/no/nav-og-samfunn/statistikk/arbeidssokere-og-stillinger-statistikk/ledige-stillinger og https://www.nav.no/no/nav-og-samfunn/kunnskap/analyser-fra-nav/arbeid-og-velferd/arbeid-og-velferd/bedriftsundersokelsen. NAV publiserer publiserte stillinger etter yrke og fylke og nasjonale/fylkesvise arbeidsmarkedsrapporter; geografisk nivå, periode og estimatenes konfidensintervall beholdes. Bedriftsundersøkelsen er en *utvalgsundersøkelse*, ikke antallet kandidater tilgjengelig for et gitt selskap.

### B – Den viktigste videre integrasjonen: NAV stilling-feed

Dokumentasjon: https://navikt.github.io/pam-stilling-feed/.
Den gamle public-feed ble avviklet i 2025. Ny stilling-feed er en hendelsesfeed, krever JWT-bearer-token og kan bruke eksperimentelt offentlig token under utvikling. For produksjon må Ridderset registreres som konsument hos nav.team.arbeidsplassen@nav.no og godta vilkårene. Token skal KUN ligge server-side i hemmelighetslager/miljøvariabler, aldri i klient-JS eller offentlig repo.

Implementer en robust konsumeringstjeneste med cursor/next_url, siste endringsdato, ETag/Last-Modified, initialimport, idempotente oppdateringer, status ACTIVE/INACTIVE, historikk, deduplisering, kontroll av utløpsdato, fjern/oppdater inaktive annonser ihht. NAV-vilkår, og søkeindeks for STYRK08, fylke, kommune, søketerm, virksomhet/org.nr. Ingen scraping av arbeidsplassen.no. Feed dekker ikke alle stillinger i Norge og utelater bl.a. Finn.no; vis dekningsforbehold. Ingen live-analyser av aktive utlysninger dersom sync ikke kjører eller token mangler. Bruk «utilgjengelig» fremfor «0».

Skille:
- **Annonser**: antall ulike aktive annonser.
- **Utlyste stillinger**: summen av angitte posisjoner, med ukjente antall holdt separat.
- **Historisk konkurranse**: datointervall og unike annonser, deduplisert.
- **Sted**: stillingens arbeidssted, ikke hovedkontor når disse er forskjellige.

### C – Evaluér etter A/B, ikke bygg blindt

- Kartverket/Geonorge: kommuner, geografiske data og reell pendleavgrensning. SSB pendling/mobilitet for grunnlag, ikke oppdiktede reisetider.
- Utdanning.no API https://api.utdanning.no/ for yrkesbeskrivelser, utdanningsveier og kompetanse. Merk at dokumentasjonen sier interne API-er kan endres uten varsel. Sjekk vilkår før bruk.
- HK-dir/DBH og offentlig utdanningsstatistikk: kandidattilgang på aggregerte nivåer, alder/utdanningsnivå og relevante avgangskull.
- NHO Kompetansebarometer, KS Arbeidsgivermonitor, SSB KOSTRA, NAVs kompetanseundersøkelser: rapport-/bransjesignaler, med klare rettigheter/lisens og begrensninger.
- DFØ/Doffin, Brønnøysund regnskap: brukes eventuelt til innsikt om bransje/vekst eller bedrift, aldri som automatisk bevist HR-kapasitet eller rekrutteringsvanskelighetsgrad.

Opprett docs/data-source-registry.md der hver integrasjon har: rett kilde, API/dokument, lisens, autentisering, kostnad, metadata, geografisk/yrkesfaglig oppløsning, oppdateringsfrekvens, rate limits, status (live/snapshot/planlagt), feilhåndtering, relevans, risiko og eksplisitt om data i det hele tatt er egnet som prediktor.

## Worklife og HR

Begrepene bygger på Riddersets egne Worklife-dokumenter; fullstendig kilde finnes ikke i dette offentlige repoet.

- **Worklife Brand**: kandidatmarkedets oppfatning av attraktivitet, synlighet og troverdighet.
- **Worklife Index**: medarbeideropplevelse, oppstart/onboarding, ledelse, faglig utvikling og leverte forventninger.
- **Løfte–leveranse-gap**: forskjell mellom employer value proposition i markedet og reell medarbeiderhverdag.
- **HR-kapasitet**: egen HR-avdeling / dedikert HR, leder- og administrasjonsressurser, ekstern partner, begge deler, ingen eller ukjent. Ikke anta at egen HR = kvalitet eller at ingen HR = dårlig bedrift.

MVP: seks skyvefelt 0–10 som allerede finnes i legacy, pluss HR-støttevalg. Nøytrale startverdier er **ikke innsendte målinger** og skal ikke rapporteres som målt score. Vis hvilke spørsmål som faktisk er besvart. Første resultater er egenvurdering; reell Worklife Index krever anonymiserte målinger fra ansatte, Brand uavhengige kandidatmålinger. Ikke offentliggjør sertifisering eller benchmark uten verifisert metode og tillatelse. Eksperimenter med skala/vekting skal merkes eksplisitt som illustrasjon, dokumenteres og være mulige å deaktivere.

## Foreslått arkitektur – Codex vurderer og dokumenterer endelig valg

- WordPress beholder ridderset.no som publiseringsflate og bruker et isolert, versjonert plugin-/app-integrasjonspunkt. Eks: [ridderset_rekrutteringsinnsikt] shortcode, eller egen fullbredde-/embed-blokk.
- Frontend: TypeScript med et robust, tilgjengelig, testbart UI (React/Vite akseptabelt). Ingen JS-logikk lagret i Gutenberg HTML-blokk; last genererte JS/CSS-assets som filer, ikke tekst direkte i editor.
- Backend: server-side WP REST-adapter for begrensede proxykall til Brreg og SSB med caching og validering. NAV-feed legges i egen langvarig synkroniseringsworker og indeks/database (Postgres eller annen begrunnet lagring). Ikke forsøk å konsumere hele feeden i hver besøkendes nettleser eller per sidevisning.
- API-design med separate adaptre: /companies/search, /companies/{orgnr}, /occupations/search, /salary, /market/vacancies, /market/shortage, /assessment, /report. Vurder behov for autentisering/rate-limit på offentlige endepunkter.
- Datamodell: Company/Unit, Occupation/STYRK, Geography, Vacancy/Position, PublishedStatistic, Observation, WorklifeSelfAssessment, Scenario, Report med kilde- og kvalitetsmetadata. Ingen kandidat-PersonData i MVP.
- Personvern: minimal datalagring, tydelig samtykke ved lagring, ingen skjult registrering av bedriftens svar, logg uten personopplysninger, sikker drift, API-token server-side.
- Sikkerhet: inputvalidering, escaping, CORS-policy på backend, WP nonces/autorisasjon for adminhandlinger, caching, timeout, retries, rate limiting, overvåkning, feilhendelser.

## Foreslått brukergrensesnitt

Profesjonelt, konsistent med Ridderset-palett (petrol/dyp turkis/sand), og minst like godt som et moderne BI-beslutningsverktøy. Ikke generisk AI-dashboard. Store, brukbare berøringsflater, tydelig typografi, faktisk responsivt design for 360/390/768/1280/1920 px.

Én tydelig flyt:
1. Velg bedrift/arbeidssted.
2. Velg yrke, antall personer, krav og lønn.
3. Se *dokumenterte markedssignaler* med oppdateringsdato og kilde.
4. Besvar arbeidsgivers egenvurdering, Worklife og HR-kapasitet.
5. Juster scenarioer og få forklarlig plan.
6. Eksporter/lagre resultat (uten tvungen epost).

Oppgi «ikke hentet», «mangler tall», «ikke relevant» og «ikke dokumentert» forskjellig fra tallet null. Kildeknapper for hver tallverdi; tilgjengelig kontrast, klikk-/tastaturnavigasjon, reell autoutfylling og søkeforslag.

## Leveranser og sekvens

### Fase 0 – Revider og sikre koden
- Inspect legacy source. List funksjoner og datadefinisjoner, identifiser falske data, antakelser og bugs. Behold dagens publiserte WordPress-side urørt.
- Sett opp prosjektstruktur, README, versjonsstyrte fixtures, linter, typer, tester, CI og lokal kjøreinstruks.
- Utform docs/architecture.md, docs/data-source-registry.md og docs/calculation-method.md med mål og begrensninger.

### Fase 1 – Fungerende MVP (minimum)
- Lokal frontend og backend. Brreg hovedenhet/underenhet live via testbar serveradapter, pålitelig søk og manuell fallback.
- 407 STYRK08-yrker fra legacy, med kontrollerte synonymtilordninger og tydelig kodevalg.
- SSB-innlesing av 11418 med korrekt år, statistikkmål, kilde og cache.
- NAV Bedriftsundersøkelsen og historisk stillingsstatistikk på deres faktiske publiseringsnivå.
- Worklife egenvurdering + HR-støtte + rapport.
- Ikke vis oppdiktet risikosannsynlighet eller «X dager til ansettelse».
- E2E-test med nettleser på mobil og desktop, feilmeldinger og knapper som faktisk fungerer.

### Fase 2 – Aktiv NAV-feed
- Søk eller be om NAV-token for produksjon (IKKE finn på eller commit token).
- Konsument/worker, persistens, stabile aktive/historiske annonsetall etter yrke/region, oppdateringer, synkroniseringsdashboard og synlig ferskhetsstatus.
- Test håndtering av utløpte/stoppede annonser og manglende token.

### Fase 3 – Bedre innsikt og metodisk kalibrering
- Regional statistikk, pendleområder, utdanningspipeline, sektor og kompetansebehov.
- Følsomhetsanalyser, scenarioer og måling av effekt med reelle (samtykkebaserte og anonymiserte) prosessutfall. Ikke tren prediksjonsmodell før tilstrekkelig historikk og grundig backtesting.

## Akseptansekriterier før første produksjonssetting

1. «Nordlaks» gir reelle forslag via Brreg. Velg hovedenhet eller underenhet, og få riktig org.nr., registrert antall personer, NACE og kommune. Ved 5xx vis feilmelding og manuell fallback. «0 ansatte» og «ikke registrert» må behandles forskjellig.
2. «Salgsjef» gir relevant forslag «Salgs- og markedssjefer», STYRK08 1221. Test også «Tømrer», «Sykepleier», «Prosjektleder» og 6 andre titler. Ingen stille, ødelagte søk.
3. Offisielt lønnstall har SSB-tabell, statistikkmål, periode og oppdateringsdato. Utilgjengelig region-spesifikt tall vises ikke som om det er beregnet.
4. Seks Worklife-skyvefelt oppdaterer delscorer umiddelbart. En egenvurdering får ikke etikett «målt Worklife Index». HR-valget lagres separat og gir konkrete anbefalinger.
5. NAV-tall presenteres korrekt når live-data finnes. Ved manglende tilgang vis tydelig begrensning, ikke 0 eller dummy-tall.
6. Rapporten gjengir konsekvent bedrift, underenhet, stilling, område, kilder, egenvurdering og tiltak. Ingen «null»-tekst i rapport.
7. Automatiserte enhetstester, API-kontrakttester og Playwright E2E-test i Chromium med mobile viewport 390x844 og desktop 1280x800. Kontroller at alle søkeforslag kan velges, underenheter kan velges, range-sliders virker og rapporten oppdateres.
8. Publiser bare på **staging** først. Ikke skriv til produksjon eller endre aktiv WordPress-side før bruker har kontrollert demonstrasjonen. Dokumenter utrullings- og rollback-plan.
9. Lever en konkret status med: hva fungerer, hvilke kilder er live, hvilke er snapshots, hva feiler, hva krever tredjeparts tilgang, og hva er neste skritt.

## Første oppgave til Codex

Start med å lese dette dokumentet og legacy/wordpress-page-2124.html. Opprett en kort teknisk kartlegging av dagens kildekode og en prioritert oppgaveliste. Bygg deretter Fase 0 og Fase 1 som en testbar lokal prototyp. Du skal gjøre arbeidet i kode og tester, ikke bare beskrive hva du kunne ha gjort. Hold produksjonssiden urørt, og lever fungerende testinstruks og en visuell demo når miljøet tillater det.

## Beslutningsprinsipp

Det viktigste er at verktøyet gir en arbeidsgiver et ærlig svar på «hva vet vi, hva vet vi ikke, og hva bør vi gjøre». Et attraktivt grensesnitt uten fungerende datainnhenting eller med oppdiktede sammenhenger er ikke et akseptabelt resultat.
