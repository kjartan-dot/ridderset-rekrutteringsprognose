# Booking fra rekrutteringssiden

På `/tjeneste/rekruttering/` går knappen øverst i dag direkte til den generelle Google-kalenderen. Lenker i tjenesteteksten fører til kontaktsidens rekrutteringsspor, som gir valg mellom rekrutteringskalender, telefon og e-post. Bruk den samme kontaktsiden fra hovedknappen.

## Klargjør i WordPress-testmiljøet

1. Hent fersk, rå blokkmarkering fra `ridderset//single-services` i miljøet som skal testes. Før godkjenning ble endringen bygget fra den publiserte malens blokkmarkering. Testinnhold og kontaktmottak kan erstattes med lokale eksempler.
2. Generer en mal for den ene tjenesten.

   ```sh
   node scripts/prepare-recruitment-template.mjs single-services.html single-services-rekruttering.html
   ```

3. Opprett blokkmalen med slug `single-services-rekruttering` under det aktive Ridderset-temaet. Bruk den genererte markeringen som innhold. WordPress velger denne malen for `services`-innlegget med slug `rekruttering`. Den delte `single-services`-malen brukes fortsatt for de øvrige tjenestene.
4. Sammenlign på mobil og desktop. Kontroller at samme knapp har samme etikett og stil, at tastaturaktivering åpner `/kontakt/?tema=rekruttering#book-mote`, og at rekruttering er valgt ved ankomst. Kontroller en annen tjeneste som referanse. Bruk en lokalt simulert kalender for innsendingstester.

Skriptet stopper hvis den opprinnelige lenken eller hovedseksjonen har endret seg slik at treffet blir uklart. Når fellestemplaten endres senere, generer tjenestemalen på nytt fra den nye kilden.

## Tilbakeføring og måling

Ta bort overstyringen `single-services-rekruttering` for å gå tilbake til den delte malen. Verifiser at den opprinnelige knappen vises igjen etter oppdatering av eventuell sidecache.

Kontaktsiden måler kontaktintensjon. Sammenlign gjennomførte, kvalifiserte samtaler per besøk på tjenestesiden når kobling til bekreftede bookinger og øvrige henvendelser er verifisert.
