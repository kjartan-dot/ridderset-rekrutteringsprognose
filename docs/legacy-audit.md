# Teknisk kartlegging og oppgaveliste – fase 0

Referanse: uendret `legacy/wordpress-page-2124.html` (WordPress-side 2124).
Arkivet er ikke en applikasjon eller en godkjent statistikkilde.

## Funksjoner og data

| Del                                      | Funksjon / tilstand                                  | Ny løsning                                                 |
| ---------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------- |
| `__rrpOccupations`                       | 407 kode/navn, median 2024/2025 og gjennomsnitt 2025 | Bare kode/navn migreres; lønn hentes fra SSB               |
| `__rrpAreas`, `__rrpOccupationShortages` | Hardkodede fylkestall og seks mangelanslag           | Ny, kildeverifisert NAV-snapshot med originalfiler         |
| `showMatches`, `choose`                  | Synonymsøk, første treff velges med Enter            | Rangert søk, kodevalg, piltaster, Enter/Escape             |
| `search`, `loadUnits`, `selectCompany`   | Direkte nettleserkall til Brreg                      | Serveradapter, eksplisitt hoved-/underenhet, timeout/cache |
| `render`                                 | Lønn, fylkesdata, globale eksportdata                | Typede observasjoner med periode og avgrensninger          |
| `rrp-scenario-v03`                       | 0–8 illustrative hindringspoeng                      | Kvalitative scenarioråd uten uvalidert totalscore          |
| `calculate`                              | Worklife 65/35 og 35/20/30/15, totalscore 40/60      | Ubesvart = null; separate, valgfrie illustrasjoner         |
| `rrpd update`                            | Beslutningsnotat, 30-dagers plan, TXT                | Sammenhengende rapport med 30/60/90, TXT/JSON/utskrift     |

## Feil og antakelser som må fjernes

1. Store inline-skript i Gutenberg er sårbare for `&&` → HTML-entiteter. Alle nye skript bygges som filer og serveres utenfor editoren.
2. Worklife beregner og eksporterer 50/100 selv ved null besvarte spørsmål. Startverdier er ikke observasjoner. Ubesvarte verdier skal aldri inngå i en delscore.
3. Vilkårlige vekter, hindringspoeng og sammensatt «beredskap» er ikke validerte rekrutteringsprediktorer. Sammensatt risiko fjernes.
4. Lønnstall og NAV-tall er statiske påstander uten maskinlesbar proveniens eller oppdateringskontroll. Ingen er automatisk godkjent fordi de står i arkivet. Tallene er ikke bevist falske, men må verifiseres før videre bruk.
5. Fylkestall for alle yrker kan ikke beskrive konkurransen i ett STYRK-yrke. Median på landsnivå må aldri lokaliseres.
6. Brreg gir registrerte personer, ikke årsverk, HR-kvalitet, turnover eller faktisk arbeidssted. Manuell bekreftelse av arbeidssted kreves.
7. `selectCompany` lager en syntetisk hovedenhet ved feil på foreldreoppslag. Ny modell beholder faktisk underenhet og org.nr.-referanse; manglende hovedenhet forblir ukjent.
8. Brreg-utvalg stopper ved 100 underenheter. Ny API har paginering og angir total/viste treff.
9. Globale `window`-objekter, DOM-observatører og separate skript kan overskrive rapporttilstand eller vise feil ved raske valg. Ny app har én tilstand, avbrutte søk og servergenerert rapport.
10. Bare tre fylker og en håndkodet kommuneliste. Ny app støtter alle fylker; kommune/arbeidssted oppgis eksplisitt uten oppdiktet pendleavstand.

## Prioritert gjennomføring

- [x] Kartlegg arkivet; behold produksjon og kildearkiv uendret.
- [x] Etabler TypeScript-frontend, separat API, kontrakter, validering og CI.
- [x] Brreg live med hovedenhet/underenhet, feiltilstander, manuell fallback.
- [x] 407 yrker og kontrollerte, også flertydige, synonymforslag.
- [x] SSB 11418 live, metadata og cache; NAV-snapshots fra originalpublikasjoner.
- [x] Worklife, HR, rapport, scenario og 30/60/90-plan.
- [x] Enhets-/kontrakttester og Playwright mobil/PC; visuell demo.
- [x] Dokumenter begrensninger, staging og rollback. Ingen produksjonsendring.
