# Datagrunnlag for bedriftssøk og nasjonal yrkesindikator

Kontrollert 21. november 2026. Førsteversjonen viser registrerte bedriftsfakta, redaksjonelle rolleforslag og en relativ nasjonal yrkesindikator. Den predikerer ikke neste ansettelse eller lokal søkermengde.

## Brreg og rolleforslag

Enhetsregisterets API gir blant annet organisasjonsnummer, næringskode/-beskrivelse, registrert adresse og publisert antall ansatte. Underenhetens aktivitet og beliggenhet kan være mer relevant enn hovedenhetens. Næringskode beskriver hovedaktivitet, ikke bedriftens faktiske yrkesfordeling. `antallAnsatte: null` skal ikke bli null ansatte.

Kilder: [Brreg API v2](https://data.brreg.no/enhetsregisteret/api/dokumentasjon/no/index.html), [forklaring av næringskoder](https://www.brreg.no/bedrift/naeringskoder/).

Rolleforslag basert på næring er redaksjonelle regler. De skal merkes som forslag og kunne korrigeres. De er ikke estimerte stillingsbestander eller dokumentert kommende rekrutteringsbehov. Et aktivt NAV-annonsetreff dokumenterer en offentlig utlysning, ikke arbeidsstokkens sammensetning.

Brreg tok i bruk SN2025 1. september 2025. Regler må bruke SN2025 og kontrollere næringsbeskrivelsen. Verifisert mot [SSB Klass, versjon 3218](https://data.ssb.no/api/klass/v1/versions/3218.json):

| Kode | Betydning |
| --- | --- |
| 41.000 | Oppføring av bygninger |
| 43.210 | Elektrisk installasjonsarbeid |
| 43.221 | Rørleggerarbeid |
| 43.222 | Kuldeanlegg-, varmepumpearbeid og installasjon av peiser |
| 43.223 | Ventilasjonsarbeid |
| 62.100 | Dataprogrammeringstjenester |
| 62.200 | IT-konsulentvirksomhet og forvaltning/drift av IT-systemer |
| 69.201 | Revisjon |
| 69.202 | Regnskapsføring og bokføring |
| 69.203 | Skatterådgivning |
| 71.121 | Byggeteknisk konsulentvirksomhet |
| 78.100 | Rekruttering og formidling av arbeidskraft |
| 78.200 | Utleie av arbeidskraft og andre personaladministrative tjenester |
| 84.110 | Generell offentlig administrasjon |
| 85.100 | Førskoleundervisning og drift av barnehager |

Brede grupper er tvetydige. Eksempelvis omfatter 35 også krafthandel og meglere, 71.12 også geologi og oppmåling, og 78.20 kan omfatte mange ulike yrker som leies ut. Kommunens generelle administrasjonskode er ikke grunnlag for å velge én bestemt tjenestegren. Ukjent næring skal gi et åpent yrkessøk.

## NAV Bedriftsundersøkelsen 2026

Versjonert kildeuttrekk: `integrations/wordpress/ridderset-hurtigsjekk/nav-2026.json`.

- [NAVs kildeside](https://www.nav.no/no/nav-og-samfunn/kunnskap/analyser-fra-nav/arbeid-og-velferd/arbeid-og-velferd/bedriftsundersokelsen).
- [Arbeidsbok med figurer og tabeller](https://www.nav.no/_/attachment/download/4849fd6f-b3c8-4608-aab6-a30a14023370%3Ad323c9fb1ebd14d3096a146aafcf3f890926b032/Navs%20bedriftsunders%C3%B8kelse%202026%20Figurer%20og%20tabeller.xlsx).
- [Rapporten](https://bibliotek.nav.no/nanna/record/6225/files/Bedriftsunders%C3%B8kelsen_2026.pdf?registerDownload=1&version=1&withMetadata=0&withWatermark=0), definisjon side 11, yrkestabell side 31–37, metode side 38–39.

Undersøkelsen ble gjennomført 26. januar–6. mars 2026 blant virksomheter med minst tre ansatte. Den har 13 119 svar og en svarandel på 77 prosent. Sysselsettingsnevneren kommer fra SSBs registerstatistikk for fjerde kvartal 2025.

Stramhetsindikatoren måler `100 × estimert mangel / (faktisk sysselsetting + estimert mangel)`. `tightness_percent: 3.7` betyr 3,7 prosent. Det er normalisert mangel, ikke et absolutt mangeltall og ikke andelen som søker på en annonse.

Arbeidsbokens `Tabell V2 - 26` tilsvarer **Tabell V1** i PDF-rapporten. Uttrekket bevarer alle 262 yrkesrader, antall, 95 prosent konfidensgrenser og stramhetsindikator. 258 rader er koblet til katalogens STYRK-koder. Katalogen som ble brukt hadde 406 roller. Matchingen dekoder OOXML-escaper, normaliserer Unicode/aksenter og store/små bokstaver, og fjerner tegnsetting/mellomrom. Den bruker ikke bøyningsendringer, synonymer eller fuzzy matching. Ingen normaliserte katalognavn kolliderte.

Fire rader har `code: null` og er beholdt i referansegrunnlaget:

| NAVs yrkesnavn | Excel-rad | Grunn |
| --- | --- | --- |
| Førskolelærere | 11 | Ikke eksakt navnetreff i katalogen |
| Jernbanetrafikkoperatører | 94 | Ikke eksakt navnetreff i katalogen |
| Ledere av bygge- og | 99 | Kilden har avkortet yrkesnavn |
| Plante- og husdyrprodusenter | 232 | Ikke eksakt navnetreff i katalogen |

Ingen kildeverdi er gjort om fra manglende til null. Alle 262 yrkesrader har positiv stramhetsindikator; 116 har publisert mangel lik null, 175 har nedre konfidensgrense lik null og fire har stramhetsindikator 100 prosent. Disse forholdene er bevart med deskriptive `quality_flags`. Publisert null er ikke bevis for at mangel ikke finnes. NAV beskriver tilnærmet null og yrker som ikke fanges opp på rapportens side 11. Ikke rekonstruer sysselsettingsnevneren fra avrundede mangeltall.

**Ikke bruk næringsstramheten i Excel-arket Tabell 5.** Selv om kolonnen inneholder tall, sier NAV uttrykkelig at næringsfordelt stramhetsindikator ikke publiseres i 2026, fordi undersøkelsen bruker SN2025 mens sysselsettingstallene bruker SN2007. PDF-rapporten side 11 forklarer dette, og næringstabellen på side 15 utelater indikatoren. Nasjonal yrkesindikator og fylkets samlede indikator kan ikke multipliseres til et lokalt yrkesestimat.

## Betydningen av en relativ skår

En invers percentil/rangering av stramheten kan gi en lesbar 1–10-skala. Det er Riddersets presentasjonsregel, ikke en offisiell NAV-skår. Referansegruppe, årgang, behandling av like verdier og eventuelle utelatelser må beskrives i modellmetoden. Nullkoder skal ikke stille forsvinne fra referansegruppen bare fordi de ikke kunne kobles til katalogen.

Skalaen må omtales som **relativt nasjonalt yrkespress** eller en tilsvarende presis nasjonal indikator. En høy skår betyr relativt lavere press blant yrkene i referansegruppen. Hvert yrke får lik rangvekt uansett antall sysselsatte. Små yrker, restkategorier og vide konfidensintervaller kan gi ustabile rangeringer. Det finnes ikke et dokumentert konfidensintervall for produktets 1–10-skår i dette datasettet.

Skalaen er ikke kalibrert mot rekrutteringsutfall. Den gir verken antall kvalifiserte søkere, sannsynlighet for å lykkes, tid til ansettelse eller bedriftens neste ansettelsesbehov. Bedriftsvise forhold som krav, lønn, mobilitet og kanalbruk er ikke observert i denne indikatoren. Slike prediksjoner krever faktiske prosessutfall og separat validering.

## NAV-annonser

[NAVs feed](https://navikt.github.io/pam-stilling-feed/) kan brukes for arbeidsgiver- og yrkesmatch når feltene finnes, med deduplisering per annonse-ID og korrekt aktiv status. Feedens dekning omfatter ikke FINN. [Gjeldende vilkår](https://arbeidsplassen.nav.no/vilkar-api) tillater statistiske og analytiske formål, men republiserte annonser skal oppdateres og inaktive annonser fjernes fra resultatlistene. Aggregerte annonsemål er egne markedsobservasjoner og skal ikke omtales som antall tilgjengelige kandidater.
