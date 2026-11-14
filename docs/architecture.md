# Arkitektur og utrulling, 14. november 2026

## Bygget nå
En lokal Node 22+-server med separat HTML, CSS og ES-moduler. Ingen eksterne produksjonspakker, inline JavaScript eller iframe. Brreg- og SSB-kall skjer server-side. 407 yrkesnavn/koder er gjenbrukt fra arkivet; gamle lønnstall er ikke kopiert til appen. Enkel stillingsavklaring og seks egenvurderinger samles i en tekstrapport uten e-postkrav.

Dette er en første testbar del av fase 1, ikke fullført MVP. JavaScript-modulene er foreløpig uten TypeScript-bygg. Neste kodefase bør innføre typer og kontraktsvalidering før flere integrasjoner eller lagring legges til. Ingen WordPress-plugin er installert. NAV og innlogget arbeidsrom er ikke bygget.

## Personvern og sikkerhet
Ingen svar sendes til backend eller lagres i nettleserlagring. Virksomhetssøk sendes til Brreg; yrkeskode sendes til SSB. Rapporter lastes ned av brukeren. Serveren har fast liste over ruter, ingen vilkårlig URL-proxy, begrensede søketekster, 12 sekunders timeout, avgrenset minnecache og en streng CSP. UI setter eksterne tekster med textContent. Serveren binder bare localhost. Det er ingen autentisering, database eller kandidatdata.

Dette er ikke tilstrekkelig for offentlig drift. Før staging: reverse proxy/TLS, begrensning av trafikk og samtidige API-kall, datakontraktvalidering, overvåkning og dokumentert driftsansvar. Før arbeidsrom: behandlingsformål, databehandleravtaler, tenant-isolasjon og autorisasjonstester. En HR-ressurs er ikke en automatisk indikator på kvalitet.

## Produksjonsløp og tilbakeføring
1. Kjør tester og manuell mobil-/desktoptest på isolert staging.
2. La Kjartan kontrollere demonstrasjonen og metodevalgene.
3. Integrer versjonerte assets via en avgrenset WordPress-plugin eller egen appflate. Ikke lim serverkode eller stor JS inn i Gutenberg.
4. Ta eksport av side 2124 og registrer aktiv appversjon før bytte.
5. Ved feil: tilbakefør siden til eksporten og deaktiver det nye integrasjonspunktet. Dagens side er ikke endret av denne kodeleveransen.

## Arbeidsrom
Utsett kundeinnlogging til det finnes en avklart pilotkunde og tydelig informasjonsbehov. Første versjon trenger virksomhetsprofil, tiltak, ansvarlig og oppfølging. Det er ikke undersøkt om eksisterende Supabase-oppsett er egnet, og det er ikke gjort databaseendringer.
