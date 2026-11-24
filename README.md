# Ridderset Rekrutteringsinnsikt

Repoet inneholder en frittstående Node-app og den separate WordPress-integrasjonen for Hurtigsjekken. [WordPress-utgaven 0.3.3](docs/holistic-customer-journey.md) gir arbeidsgiveren en prioritert plan ved siden av dokumenterte markedssignaler.

Den frittstående appen har serverbasert Brreg-søk for hoved- og underenheter, 407 yrkesgrupper, SSB-lønnsoppslag, stillingsavklaring, bekreftede egenvurderinger og en nedlastbar tekstrapport.

## Kjør lokalt

Node 22 eller nyere. Ingen npm-pakker må installeres.

```sh
npm run check
npm test
npm start
```

Åpne http://127.0.0.1:3100 for den frittstående appen. Brreg- og SSB-oppslag krever internett. Bruk fiktive opplysninger i tester.

## Test den veiledede Hurtigsjekken

Start forhåndsvisningen i én terminal. Åpne http://127.0.0.1:3101.

```sh
node scripts/hurtigsjekk-server.mjs
```

Med Python Playwright og Chromium installert kan nettlesertestene kjøres i en annen terminal. De dekker mobil og desktop, og bruker syntetiske kildesvar.

```sh
python3 tests/hurtigsjekk.e2e.py
```

Med PHP installert kan WordPress-adapterens Brreg-buffer testes med syntetiske svar.

```sh
php tests/wordpress-brreg-cache.php
```

## Dokumentasjon

- [Teknisk revisjon](docs/legacy-audit.md)
- [Arkitektur og utrulling](docs/architecture.md)
- [Datakilderegister](docs/data-source-registry.md)
- [Beregningsmetode](docs/calculation-method.md)
- [Teststatus](docs/test-report.md)
- [Booking i WordPress](docs/recruitment-hero-booking.md)

Innholdet i `legacy/` er kildearkiv. Bruk syntetiske data og hold hemmeligheter og private dokumenter utenfor dette offentlige repoet.
