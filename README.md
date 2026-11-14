# Ridderset Rekrutteringsinnsikt

**Status 14. november 2026: lokal testversjon, ikke produksjonsklar.** Dagens WordPress-verktøy er ikke erstattet.

Testversjonen har serverbasert Brreg-søk for hoved-/underenheter, 407 yrkesnavn, SSB-lønnsoppslag, stillingsavklaring, seks eksplisitt bekreftede egenvurderinger og nedlastbar tekstrapport. Ingen NAV-feed, innlogging, database eller validert prognose.

## Kjør lokalt

Node 22 eller nyere. Ingen npm-pakker må installeres.

```sh
npm run check
npm test
npm start
```

Åpne http://127.0.0.1:3100. Brreg/SSB krever internett. Appen lagrer ikke svar; omlasting tømmer dem. Ikke legg inn kandidatopplysninger. Kun testbruk inntil nettleser-, mobil- og driftstester er fullført.

## Dokumentasjon

- [Teknisk revisjon](docs/legacy-audit.md)
- [Arkitektur og utrulling](docs/architecture.md)
- [Datakilderegister](docs/data-source-registry.md)
- [Beregningsmetode](docs/calculation-method.md)
- [Teststatus](docs/test-report.md)

13 automatiserte tester består. Visuell E2E-test er ikke fullført i dette miljøet. Se teststatus før demonstrasjon eller installasjon. Legacy-kilden er et urørt arkiv, ikke deploykode. Ingen hemmeligheter eller private dokumenter skal legges i dette offentlige repoet.
