# Booking fra rekruttering og HR

Hovedknappene på `/tjeneste/rekruttering/` og `/hr-partner/` bruker de samme kontakttemaene som lenkene i tjenestetekstene. Hovedknappen på kontaktsiden går til bookingseksjonen og beholder valgt tema.

## Klargjør i WordPress-testmiljøet

1. Ta vare på en fersk kopi av malene `ridderset//single-services`, `ridderset//page` og `ridderset//wp-custom-template-pages-simple-header`, og av kontaktsidens HTML-blokk. Bruk rå blokkmarkering. Kontroller at bare kontaktsiden er tilordnet simple-header-malen før den oppdateres.
2. Generer oppdaterte maler og kontaktblokk.

   ```sh
   node scripts/prepare-recruitment-template.mjs single-services.html single-services-rekruttering.html
   node scripts/prepare-recruitment-template.mjs page.html page-hr-partner.html hr
   node scripts/prepare-recruitment-template.mjs simple-header.html simple-header-booking.html kontakt
   node scripts/prepare-contact-booking.mjs kontakt-original.html kontakt-booking.html
   ```

3. Installer den oppdaterte HTML-blokken på kontaktsiden først. Opprett `single-services-rekruttering` for tjenesten og `page-hr-partner` for HR-siden. Oppdater simple-header-malen for kontaktsiden. Ta vare på de delte sidemalene som grunnlag for øvrige sider. Ved innlegging i WordPress, sammenlign gjeldende mal og blokk med kildene som ble brukt til generering.
4. Test rekruttering, HR og direkte kontakt på mobil og desktop, med tastatur og med en simulert kalender. Kontroller valgt tema, fokus på bookingseksjonen, korrekt kalender, kontaktlenker uten JavaScript og generiske maler på to andre sider.

Skriptene stopper ved tvetydig eller endret kilde. Generer de spesifikke malene på nytt når de delte malene endres.

## Tilbakeføring og måling

Tilbakefør malene `single-services-rekruttering` og `page-hr-partner` ved å fjerne overstyringene. Gjenopprett simple-header-malen og kontaktsidens HTML-blokk fra de lagrede versjonene. Verifiser de opprinnelige lenkene etter oppdatering av eventuell sidecache.

Kontaktsiden måler valg av tema og bruk av telefon, e-post eller den direkte kalenderlenken. Temaet sendes som én av de fire faste verdiene. En kobling til bekreftede bookinger og kvalifiserte henvendelser trengs for å måle konvertering.
