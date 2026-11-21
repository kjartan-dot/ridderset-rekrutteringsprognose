# Bedrift først: leveranse og utrulling

## Status: publisert 21. november 2026

Versjon 0.2.1 er installert og aktivert i WordPress. Etter den første produksjonssettingen av 0.1.0 og brukerens tilbakemelding om gjentatt valg av KUPA, er hele analyseflyten nå koblet sammen. Den er publisert på [Rekrutteringsprognose](https://ridderset.no/rekrutteringsprognose/), side 2124. Publiseringsautorisasjonen «Kjør den ut» gjelder fortsatt, og rettingen er kontrollert privat før aktivering på hovedsiden.

## Sammenhengende analyse, versjon 0.2.1

Aktiv shortcode er `[rr_hurtigsjekk guided="1"]`. Ett sett med inngangsverdier styrer hurtigsjekken, markedssjekken og den grundige analysen. Bedrift, hovedenhet/avdeling, STYRK08-kode og faktisk arbeidskommune overføres uten et nytt registeroppslag. Endringer gjøres i hurtigsjekken; parallelle redigerbare bedrifts- og yrkesfelt skjules i fordypningene.

Stegknapper og «Neste»-lenker leder fra bedrift til rolle, vurdering, fire rekrutteringsvalg, arbeidsgivervurdering og handlingsplan. I fordypningen kommer de fire konkrete rekrutteringsvalgene først. Bakgrunnstall og den eldre vurderingsmodellen er tilgjengelige i et eget åpne/lukke-felt.

`context.js` oppretter og validerer den felles kontrakten. `front.js` husker kun inngangsvalg i `sessionStorage` i inntil åtte timer. Feilformatert, utdatert eller inkompatibel lagring avvises. Resultater, skårer, NAV-treff og Worklife-svar lagres ikke i denne sesjonskopien. Brukeren kan tømme valgene med «Start ny analyse». Blokkert nettleserlagring hindrer ikke analysen på den åpne siden.

`context-bridge.js` og avgrensede hooks i den eksisterende sidekoden oppdaterer faktisk intern tilstand, ikke bare synlig tekst. Sideendringene er dokumentert i `integrations/wordpress/guided-context.patch`. Worklife-svar og aktivt valgte rekrutteringsforutsetninger beholdes innen samme juridiske virksomhet, også ved avdelingsbytte. Ved ny juridisk bedrift nullstilles Worklife via den eksisterende reset-funksjonen, og scenariobekreftelsen fjernes. «Start ny analyse» gjør dette eksplisitt. Ingen urørte startverdier registreres som nye svar.

Grunnlønn og sektor følger markedssjekken. Den eldre analysen bruker et annet lønnsmål, derfor lagres grunnlønnen separat som `salary_input`, og den gamle lønnsgrafen skjules i den guidede flyten. Registrert bedriftsadresse og brukerens arbeidskommune holdes adskilt. Ustøttet fylke eller ukjent yrke gir en tydelig begrensning; ingen standardrolle eller tilfeldig nordnorsk fylke velges.

WordPress-pluginen erstatter den registrerte kilden for `ridderset-markedssjekk/marked.js` med `marked-guided.js` bare på den guidede siden. Dette skjer før footer- og Page Optimize-behandlingen, med opprinnelig script-handle og avhengigheter. Et `script_loader_src`-filter alene var utilstrekkelig i faktisk WordPress og ble supplert under privat QA.

### Kontroll av rettingen

- 57 Node-tester bestått. De 17 nye testene dekker kontrakt/lagring og den faktiske markedsruntime, blant annet sen kataloglasting, gamle revisjoner, avbrutte oppslag, ugyldige valg og arbeidskommune utenfor Nord-Norge.
- De faktiske åtte legacy-scriptblokkene og broen ble kjørt i en avgrenset DOM-kontroll før WordPress-test. Den bekreftet riktig intern rolle og bedriftsidentitet, separat grunnlønn, Worklife-bevaring og nullstilling, manglende valg og ingen ekstra nettverkskall.
- Privat WordPress-test med KUPA AS, org.nr. 986954848, og organisasjonsrådgivere, STYRK08 2421: markedssjekk og fordypning fikk samme bedrift, rolle og kommune uten et nytt søk eller «Bruk bedrift»-klikk.
- Manuell endring fra Harstad til Tromsø ble videreført som arbeidskommune, mens registeradressen forble Harstad. Testbeløpet 75 000 i grunnlønn ble videreført separat.
- Bytte til KUPA AS AVD. TROMSØ beholdt yrket, lønnsrammen, ett aktivt Worklife-svar og det bekreftede regionale søkeopplegget. Etter ny lasting ble avdeling, yrke, arbeidskommune og lønnsramme gjenopprettet fra sesjonsvalgene.
- Mobilkontroll i en 390 × 844 iframe av den faktiske WordPress-testen: `clientWidth` og `scrollWidth` var begge 373 px. Stegknapper og fortsett-lenke ble kontrollert visuelt.
- Etter aktivering på side 2124 ble KUPA AS, STYRK08 2421 og Harstad kontrollert i de faktiske feltene i begge fordypninger. Bedriftssøket var skjult, og rekrutteringsvalgene kom først.
- Utlogget HTTP-kontroll ga 200 for siden og den samlede JavaScript-filen. Den inneholdt den nye frontend, kontrakt, bro og guidede markedsruntime.

Siste WordPress-verdier etter publisering: `modified: 2026-11-21T12:42:08`, innholdshash `35a2810793aa9416f560326bc93566e4e975e0fd`. Tidsverdien er lagret slik API-et returnerte den, uten antatt tidssone.

### Tilbakerulling av den guidede flyten

Endre bare shortcoden til `[rr_hurtigsjekk]` etter fersk seksjonslesing og optimistisk lås. Pluginen inneholder den tidligere frontend i `previous/`. De nye legacy-hookene er inaktive uten `data-guided="true"`, og markedssjekken bruker da sin opprinnelige runtime. Tilbakerulling trenger ingen databaseendring eller deaktivering av andre utvidelser.

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

## Verifisering før publisering, 21. november 2026

- 40 Node-tester bestått, inkludert 12 nye tester for yrkessøk, bransjeregler, skala, ukjent data, rangering og usikkerhet.
- Syntakskontroll for frontend, adapter og preview-generator bestått.
- Reelt Brreg-oppslag: Nordlaks Oppdrett AS og underenheten i Stokmarknes. Riktig kommune og virksomhetsaktivitet kommer inn.
- Direkte nettleserkontroll via godkjent nettleser: bedriftssøk, avdelingsvalg, bransjekort, nasjonal indikator, kildevisning, ukjent skår og endret kommune.
- Den private demonstrasjonens mobilvisning ble kontrollert i en 390 × 844 iframe. Innholdets bredde var 375 px med rullefelt og ingen horisontal overflyt. Søkefeltet var synlig på første skjerm. Desktop ble kontrollert visuelt. Dette er ikke en produksjonstest.
- Live SSB-svar for havbruksarbeidere: år 2025, avtalt median månedslønn 52 370 kroner, median med bonus/uregelmessige tillegg 59 710 kroner. Første forespørsel var treg; proxyens tidsavbrudd for markedsdata ble utvidet til 20 sekunder. Feil gir en synlig utilgjengelig-tilstand.
- Det automatiserte Playwright-scriptet `tests/hurtigsjekk.e2e.py` er skrevet og Python-syntakskontrollert. Det kunne ikke startes i executorens Chromium på grunn av en socket-restriksjon. Det er ikke rapportert som bestått.
- Lokal PHP-runtime var ikke tilgjengelig. PHP-adapteren ble gjennomgått før installasjon; faktisk kjøring i WordPress er dokumentert nedenfor.

## Produksjonssetting og kontroll

Den private demonstrasjonen ble levert før brukeren godkjente produksjonssetting. Pluginen er installert og aktivert via WordPress-administrasjonen. Bare inngangen til side 2124 og den tilhørende, avgrensede utformingen er endret:

- Toppen er erstattet med `[rr_hurtigsjekk]`.
- Den eksisterende markedssjekken ligger i et lukket `core/details`-felt.
- Den opprinnelige blokken `grundig-analyse` og kontaktblokken er uendret.
- Fire CSS-regler avgrenset med `body.page-id-2124` fjerner temamellomrom over innholdet og gir fordypningsfeltene samme visuelle inngang som den nye løsningen.

WordPress registrerte `modified: 2026-11-21T09:37:49`. Dette er WordPress-feltet som returnert, uten en antatt tidssone. Sidens innholdshash etter publisering er `8928035d3b640f5fa28d31fc5bb24435ba248644`. Bevarte blokkhasher: grundig analyse `bdcabb868503964ffd9fd637f478530aceb6d02e`, kontaktblokk `7bd80b3f1fd7e220c83166b777da6ae9a8d4490e`.

Kontrollert i den publiserte WordPress-løsningen:

- PHP-pluginen er aktiv og de reelle endepunktene for bedriftssøk og underenheter returnerer HTTP 200 med Brreg-data.
- Nettleserflyten for Nordlaks Oppdrett AS viser bransjeforslag og havbruksarbeidere med nasjonal yrkesindikator 8 av 10. Tallet gjelder relativt nasjonalt mangelpress, ikke bedriftens forventede søkerantall.
- SSB-kallet for havbruksarbeidere viser 2025-medianen for avtalt månedslønn, 52 370 kroner.
- Den offentlige siden returnerer HTTP 200 uten innlogging. PageOptimize sin samlede lasting av kjerne-JavaScript, frontend og CSS er kontrollert med HTTP 200.
- Rapportknappen fullfører filnedlasting på den publiserte siden.
- Den publiserte WordPress-siden er kontrollert i en 390 × 844 iframe fra samme nettsted. Innholdets `clientWidth` og `scrollWidth` er begge 373 px: ingen horisontal overflyt. Det første søkefeltet og søkeknappen er synlige på første skjerm.

## Enkel tilbakerulling

1. Hent den nyeste versjonen av side 2124. Bruk WordPress-versjonen umiddelbart før produksjonssettingen som kilde for de tidligere toppblokkene.
2. Erstatt bare den nye shortcode-inngangen med disse toppblokkene. Flytt den eksisterende markedssjekken ut av det nye åpne/lukke-feltet dersom hele den tidligere inngangen skal gjenopprettes. Bevar den grundige analysen, kontaktblokken og eventuelle senere, urelaterte endringer.
3. Kontroller siden utlogget. Deaktiver pluginen først etter at shortcoden er fjernet fra siden. Pluginen påvirker ingen side uten shortcoden; de nye tematilpasningene er også avgrenset til side 2124.

Ingen full WordPress-sidekopi, API-token eller andre tilganger lagres i dette offentlige repositoryet.

## Det som kreves for faktisk modelltrening

Den eksisterende tabellen for rekrutteringsutfall er tom ved kontroll. Trening er derfor ikke gjennomført. En senere modell må få et fast utfallsmål, for eksempel kvalifiserte kandidater etter en definert periode, samt rolle, faktisk arbeidssted, krav, lønnsramme og rekrutteringsopplegg. Treningsdata må skilles fra senere testdata og modellens sannsynligheter kontrolleres mot faktiske utfall. Antall annonser er ikke et treningsmål for antall kvalifiserte kandidater.
