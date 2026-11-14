# NAV: det som gjenstår før aktivering

Servermodulen src/nav-feed.js er bygget og testet med fiktive kontraktsdata. Den har URL-begrensning, token kun på server, cursor, ETag, atomisk retur av sideoppdatering, sletting av inaktive/utløpte annonser, separate annonse-/posisjonstall og avvisning av ufullstendige/utdaterte tellinger. Kontaktopplysninger og annonsebeskrivelser lagres ikke i modellen.

Den er IKKE koblet til den publiserte demonstrasjonen. Ingen produksjonstoken, konsumentregistrering, full førstegangssynk eller driftsplan er etablert.

Aktivering:
1. Ridderset bekrefter NAVs bruksvilkår og registreres som konsument. Offisiell dokumentasjon: https://navikt.github.io/pam-stilling-feed/ . Kontakt: nav.team.arbeidsplassen@nav.no. Ingen henvendelse er sendt.
2. Legg token i serverens hemmelighetslager. Aldri i offentlig repo, nettleser eller chat.
3. Legg til varig lagring og en seriell, planlagt jobb. Lagre tilstand først etter vellykket syncPage; retry av samme side skal være idempotent. Overvåk feil og siste vellykkede synk.
4. Førstegangssynk må dekke hele relevante aktive vindu (dokumentasjonen sier opptil seks måneder). Sett fullWindow bare når startvinduet faktisk er tilstrekkelig. complete skal ikke settes manuelt for en delvis import.
5. Verifiser faktisk categoryType og STYRK-koding mot levende data før yrkesfiltrering. Ikke anta at enhver kategorikode er STYRK08. Behold ukodede annonser som separat dekningsmangel.
6. Koble /api/market til kvalitetssikret indeks. UI viser synktid, dekningsgrad og ukjente posisjonstall. Stillingsannonser dokumenterer etterspørsel, ikke kandidattilgang eller forventet antall søkere.

Dette er klargjort integrasjonskode, ikke en påstand om at NAV-data er live. Finn.no-annonser inngår ikke i feeden.
