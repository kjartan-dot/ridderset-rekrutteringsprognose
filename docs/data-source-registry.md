# Kilderegister

Gjennomgått 12. november 2026. Hentetid følger dataene. Hentedato er ikke kildens
publiseringsdato. Live betyr oppslag med synlig cache; snapshot er en versjonert
publikasjon. Ingen numeriske verdier fra legacy brukes.

## Brønnøysundregistrene – Enhetsregisteret v2

| Egenskap          | Gjeldende implementasjon                                                                                                                                          |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kilde/API         | [Dokumentasjon](https://data.brreg.no/enhetsregisteret/api/dokumentasjon/no/index.html); `/enheter`, `/enheter/{orgnr}`, `/underenheter`, `/underenheter/{orgnr}` |
| Lisens            | Åpne registerdata, NLOD. Kilde oppgis; kontroller gjeldende vilkår ved utrulling                                                                                  |
| Tilgang/kostnad   | Offentlig lese-API, ingen nøkkel eller betaling brukt                                                                                                             |
| Status            | Live serveradapter, separate hoved-/underenhetssøk og paginering                                                                                                  |
| Metadata/nivå     | Org.nr., overordnet enhet, NACE, registrerte personer, organisasjonsform, adresse/kommunenummer, tidspunkt. Felt kan mangle                                       |
| Oppdatering/cache | Oppslag ved bruk, 10 minutters RAM-cache; underliggende registerlag garanteres ikke av appen                                                                      |
| Rate limits       | Ekstern kvote antas ikke; 429 vises uten umiddelbar retry. Lokalt 120 kall/minutt/IP, maks 500 cache-nøkler                                                       |
| Feil              | 404, 410, 429, 5xx, formatfeil og timeout. Ett nytt forsøk ved 5xx/nettverksfeil. Frivillig manuell fallback                                                      |
| Relevans/risiko   | Identitet og registrert organisasjon. Personer er ikke årsverk; HR, turnover og faktisk arbeidssted kan ikke utledes. Postadresse brukes ikke som arbeidssted     |
| Prediktor         | Ikke validert som prediktor for rekrutteringsutfall                                                                                                               |

## SSB – lønn 11418 / PxWeb API v2

| Egenskap        | Gjeldende implementasjon                                                                                                                                                            |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kilde           | [11418](https://www.ssb.no/statbank/table/11418), [API v2](https://www.ssb.no/api/pxwebapiv2); origin `https://data.ssb.no/api/pxwebapi/v2/tables/`                                 |
| Lisens          | SSBs offentlige data med kildeangivelse; [vilkår](https://www.ssb.no/omssb/bruk-av-ssbs-statistikk). Kontroller oppdaterte rettigheter ved redistribusjon                           |
| Tilgang/kostnad | Offentlig lese-API uten nøkkel/betaling                                                                                                                                             |
| Status          | Live metadata og én datacelle per valgt yrke                                                                                                                                        |
| Metadata/nivå   | Median, fire-sifret STYRK08, siste år, kildeoppdatering, hente-/cachetidspunkt, alle sektorer, begge kjønn, begge arbeidstider i heltidsekvivalenter; **Norge**, ingen lokal median |
| Publisering     | Årlig med lag og revisjoner. Kontrollert år 2025, kildeoppdatert 28.8.2026. Nyeste år oppdages dynamisk                                                                             |
| Rate/cache      | Metadata 6 t, lønn 12 t, samtidige kall samles. Én celle. Ekstern kvote antas ikke; 429 respekteres                                                                                 |
| Feil            | Manglende/skjermet celle → missing. Kilde-/formatfeil → unavailable. Svardimensjoner kontrolleres; ingen erstatningstall                                                            |
| Relevans/risiko | Månedslønn inkl. tillegg/bonus, uten overtid. Ansvar, erfaring, sektor og geografi påvirker sammenlignbarhet                                                                        |
| Prediktor       | Lønnsforskjell er beskrivende; ingen validert effekt på sannsynlighet/tid                                                                                                           |

## SSB – gjennomgått utvidelseskatalog

Metadata finnes via `/api/sources/ssb/{table}/metadata`. API-et tillater bare
tabellene nedenfor og 11418. `data/ssb-table-catalog.json` dokumenterer faktisk
tabelltittel, dimensjoner og perioder. Ingen regionale tall brukes som kandidatmodell.
Tilgang, lisens, kostnad og feilbehandling er som over; cache 6 timer.

| Tabell | Faktisk innhold/oppløsning                                       | Frekvens          | Status og risiko                                                |
| ------ | ---------------------------------------------------------------- | ----------------- | --------------------------------------------------------------- |
| 03321  | Sysselsatte 15–74 år, bosteds-/arbeidsstedskommune, pendling     | Årlig, 4. kvartal | Metadata live; ingen reisetider eller kandidatpendling beregnet |
| 07984  | Sysselsatte etter alder, 17 næringsgrupper, kjønn, kommune       | Årlig, 4. kvartal | Metadata live; SN2007 grovere enn bedriftens NACE               |
| 11615  | Sysselsatte etter fagfelt, utdanningsnivå, kjønn, alder, kommune | Årlig, 4. kvartal | Metadata live; utdanning er ikke ledige kandidater              |
| 07459  | Befolkning, alder/kjønn, kommune/fylke/land                      | Årlig             | Metadata live; ikke yrkesspesifikk kandidatpool                 |
| 09588  | Flytting inn/ut, kommune/fylke/land                              | Årlig             | Metadata live; ingen rekrutteringsprognose                      |
| 01222  | Befolkningsendringer, kommune/fylke/land                         | Kvartalsvis       | Metadata live; historiske og gjeldende grenser må kontrolleres  |

Ingen av tabellene er validert som prediktor i dette produktet. Kode/navn er
kontrollert mot API-et; 09588 er flytting, ikke utdanning.

## NAV – publiserte stillinger

| Egenskap        | Gjeldende implementasjon                                                                                                                                                   |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kildeside       | [Ledige stillinger](https://www.nav.no/no/nav-og-samfunn/statistikk/arbeidssokere-og-stillinger-statistikk/ledige-stillinger)                                              |
| Originaler      | `data/raw/nav-vacancies-county.xlsx` (STIL030) og `nav-vacancies-occupation.xlsx` (STIL040). URL/SHA-256/hentetid i `data/nav-sources.json`                                |
| Lisens          | Offentlig NAV-publikasjon med kildeangivelse. Ingen særskilt maskinlesbar lisens bekreftet i filene; avklar redistribusjon av hele originalarkivet før ekstern publisering |
| Tilgang/kostnad | Offentlig filnedlasting, ingen nøkkel/betaling                                                                                                                             |
| Status          | **Snapshot**, januar–oktober 2026. Ikke automatisk oppdatert per besøk                                                                                                     |
| Mål/nivå        | Tilgang på publiserte stillinger per måned. Fylke/alle yrker og separat nasjonal topp 30/fire-sifret STYRK. Kommuneark finnes i original, men brukes ikke i MVP            |
| Metadata        | Kilde, periode, ark/rad, geografi, yrkeskode, originalfil og kontrollsum. Ingen ubegrunnet oppdateringsdato                                                                |
| Frekvens/rate   | Månedlig publikasjon; gjennomgått import. Ingen hyppig polling, ekstern kvote ukjent                                                                                       |
| Feil            | Import stopper ved feil år/ark/celler. Checksums testes i CI. Snapshot erstattes først etter gjennomgang; NAV kan revidere historikk                                       |
| Relevans/risiko | Ikke aktive annonser nå eller unike konkurrenter. Ingen kommune×yrke fra to uavhengige tabeller; utenfor topp 30 er verdien manglende                                      |
| Prediktor       | Beskrivende etterspørsel, ikke validert kandidat-/sesong-/trendmodell                                                                                                      |

## NAV – Bedriftsundersøkelsen 2026

| Egenskap               | Gjeldende implementasjon                                                                                                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kilde                  | [Bedriftsundersøkelsen](https://www.nav.no/no/nav-og-samfunn/kunnskap/analyser-fra-nav/arbeid-og-velferd/arbeid-og-velferd/bedriftsundersokelsen), original `nav-survey-2026.xlsx` |
| Lisens/tilgang/kostnad | Offentlig publikasjon som over; ingen nøkkel/betaling. Avklar videre redistribusjon av hele filen                                                                                  |
| Status                 | **Snapshot**, våren 2026. 257 kontrollerte yrkeskoblinger                                                                                                                          |
| Metadata/nivå          | Tabell V2: yrke/Norge; tabell 1: fylke/alle yrker. Anslåtte personer i mangel, 95 % KI nedre/øvre, originalark/rad, år og hentedato                                                |
| Kobling                | Eksakt normalisert yrkesnavn til katalogen; eksplisitt gjennomgått variant for førskolelærere. Ingen ukontrollert fuzzy-mapping                                                    |
| Frekvens/rate          | Årlig utvalgsundersøkelse, gjennomgått import; ingen løpende API-kvote brukt                                                                                                       |
| Feil                   | Manglende kobling vises; original avrunding og KI bevares, heller enn «korrigerte» eller lokaliserte anslag                                                                        |
| Relevans/risiko        | Udekket kompetansebehov fra utvalg. Verken arbeidsledige, aktive stillinger eller kandidater tilgjengelig for én arbeidsgiver                                                      |
| Prediktor              | Ikke validert; kan begrunne kartlegging, ikke en automatisk lokal risiko                                                                                                           |

## NAV – aktiv stilling-feed (fase 2)

- **Dokumentasjon:** <https://navikt.github.io/pam-stilling-feed/>.
- **Status:** utilgjengelig, ikke implementert i fase 1. Ingen token, worker
  eller indeks; API/UI/eksport viser ingen aktive tall. Token alene aktiverer ikke data.
- **Autentisering/rettigheter:** JWT-bearer kun server-side. Produksjonskonsument
  må registreres og godta NAV-vilkår. Ingen henvendelse er sendt på brukerens vegne.
- **Kostnad/rate:** må bekreftes med konsumenttilgang; ingen kvote antas.
- **Oppdatering/feil:** fremtidig worker med cursor/next_url, ETag/Last-Modified,
  initialimport, idempotens, ACTIVE/INACTIVE/utløp, deduplisering og ferskhet.
  Stoppet sync skal slå av aktive tall.
- **Metadata/nivå:** fremtidig annonse/posisjon med STYRK, faktisk arbeidssted,
  synkroniseringstid, historikk, dekningsgrad og ukjent antall posisjoner separat.
- **Relevans/risiko:** ikke hele markedet; Finn.no er ikke dekket. Ingen scraping
  av arbeidsplassen.no. Annonselevetid er ikke time-to-hire.
- **Prediktor:** etterspørselssignal, ingen validert prediksjon.

## Worklife og videre kilder

Seks svar og HR-valg er selvrapportert, uten serverlagring og uten krav om
personopplysninger. Full Worklife-metode er ikke offentlig i repoet. Ingen
sertifisering/benchmark-lisens antas. Se `calculation-method.md`.

Kartverket/Geonorge, Utdanning.no, HK-dir/DBH, NHO, KS/KOSTRA, DFØ/Doffin og
Brreg-regnskap er **planlagt evaluert**, ikke integrert. Tilgang, lisens, kostnad,
rate limits, frekvens, oppløsning, risiko og egnethet må undersøkes før bruk.
