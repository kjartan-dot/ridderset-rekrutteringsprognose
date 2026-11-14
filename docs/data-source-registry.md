# Datakilderegister – Ridderset Rekrutteringsinnsikt

Dato: 14. november 2026. Sjekk alltid nyeste API-beskrivelser før produksjonsintegrasjon.

| Kilde | Bruksområde | Status i repoet | Geografi/yrke | Rettighet/tilgang | Feilkilde og avgrensning |
|---|---|---|---|---|---|
| Brønnøysundregistrene, Enhetsregisteret | Organisasjonsidentitet, næring, ansatte og registrert adresse | **Serveradapter implementert, ikke funksjonstestet mot live WordPress staging** | Juridisk enhet og underenhet | Åpen NLOD, ikke autoriserte personroller | Registrert antall ansatte er ikke årsverk; registrert adresse er ikke alltid arbeidssted; HR-avdeling er ikke kjent |
| SSB 11418 | Nasjonal median månedslønn etter STYRK08 | **Historisk snapshot 2024–2025 fra tidligere Ridderset-side** | Nasjonalt, 4-sifret yrkesgruppe | SSB CC BY 4.0; PxWeb v2 | Historisk kopi er ikke gjeldende lønn eller lokalt lønnsnivå; må verifiseres mot originaltabell |
| NAV stilling-feed | Faktisk aktive annonser, posisjoner og historikk | **Ikke integrert** | Sted, STYRK/ESCO der data finnes | Krever registrert konsument/token; vilkår må godkjennes | Dekker ikke samtlige annonsekanaler; synkronisering av endringer/utløp nødvendig |
| NAV ledige stillinger-statistikk | Etterspørsel per yrke/fylke over tid | **Ikke integrert** | Aggregerte fylkes-/yrkestabeller | Offentlig statistikk | Registrerte stillinger er ikke lik ledige stillinger i hele markedet |
| NAV bedriftsundersøkelsen | Yrkesvis mangel og bedriftsforventninger | **Ikke integrert** | Publisert yrke/region, avhenger av år | Publiserte estimater | Utvalgsundersøkelse, konfidensintervall og mulig småutvalgsusikkerhet |
| SSB sysselsetting etter yrke/næring | Struktur for arbeidstaker- og bedriftsmarked | **Planlagt, spesifikke tabeller må velges** | Yrke/næring/region etter publisering | PxWeb v2 | Ikke direkte antall tilgjengelige kandidater |
| SSB pendling | Reelt geografisk rekrutteringsområde | **Planlagt** | Kommune/pendlingsstrøm | PxWeb v2 | Arbeids- og bosted er ulike; pendling er ikke en reisetidsmodell |
| SSB befolkning/aldersstruktur | Eldrebølge, rekrutteringsgrunnlag | **Planlagt** | Kommune/fylke | PxWeb v2 | Befolkningsendring er ikke en årsaksspesifikk rekrutteringsprognose |
| HK-dir/DBH | Utdanningskapasitet, avgangskull | **Planlagt / vilkår undersøkes** | Utdanning/institusjon, ikke entydig kommune for arbeid | Offentlig aggregert statistikk | Utdanningstype må krysses korrekt mot stilling og yrkeskrav |
| Utdanning.no | Yrkesbeskrivelser og utdanningsveier | **Planlagt / API og vilkår må bekreftes** | Yrke/utdanning | Undersøk API-dokumentasjon | Kvalitative beskrivelser er ikke kvantitativ kandidattilgang |
| Kartverket/Geonorge | Kommunekoder, geografi | **Planlagt** | Geografi/kommuner | Offentlige geodata, sjekk lisens | Kartavstander alene sier lite om pendling |
| NHO Kompetansebarometer | Kompetansebehov i næringslivet | **Mulig faglig kilde, ikke API-tilkoblet** | Næring/region etter rapport | Kontroller rapportlisens | Utvalg og respondentgrunnlag, ikke lokale søkertall |
| KS Arbeidsgivermonitor | Kommunale arbeidsgiverutfordringer | **Mulig faglig kilde** | Kommune/sektor etter publisering | Kontroller vilkår | Ikke objektivt mål på enkeltkommunes HR-kvalitet |
| Brønnøysundregistrene regnskap | Offentlige økonomiske bedriftsdata | **Planlagt, etter faglig behov** | Foretak/år | Offentlige registerdata; API/vilkår verifiseres | Økonomiske resultater er ikke et direkte mål på rekrutteringsevne |
| Doffin offentlige anskaffelser | Identifisering av kommende behov/anbud | **Evaluering** | Oppdragsgiver/anskaffelse | Undersøk åpne data og vilkår | Anbud er ikke en utlysning av en stilling |
| Worklife Brand og Index | Omdømme, leverte løfter, utvikling | **Seks egenrapporteringsfelt, ingen uavhengig datainnhenting** | Den valgte bedriften | Svar oppgitt i nettleseren | Ikke uavhengig kandidat- eller medarbeidermåling. Selvseleksjonsbias |
| HR-kapasitet | Intern/ekstern støtte i rekrutteringen | **Egenrapportert valg** | Den valgte bedriften | Arbeidsgiverens egne svar | En HR-avdeling finnes ikke pålitelig i Enhetsregisteret, og tilstedeværelse garanterer ikke kvalitet |

## Kildelenker

- Enhetsregisteret: https://data.brreg.no/enhetsregisteret/api/dokumentasjon/no/
- SSB PxWeb v2: https://www.ssb.no/api/pxwebapiv2
- NAV stilling-feed: https://navikt.github.io/pam-stilling-feed/
- NAV statistikk: https://www.nav.no/no/nav-og-samfunn/statistikk/arbeidssokere-og-stillinger-statistikk/ledige-stillinger

## Krav før en kilde brukes i scoring

1. Dokumenter presis definisjon, telleenhet, periode, geografi og yrkesklassifisering.
2. Lag kildeadapter, cache/tidsstempel, feilhåndtering og tydelig null-versus-mangler.
3. Verifiser dekning og om den aktuelle variabelen faktisk kan støtte en beslutning om rekruttering.
4. Definer behandling av databrudd, nedetid, endrede koder og tilbakeføringer.
5. Ikke bygg en prediktiv score uten uavhengige rekrutteringsutfall og backtesting.
