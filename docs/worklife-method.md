# Etterprøvbare målsammenligninger i Worklife

Resultatvisningen og teksteksporten bruker samme mål fra Worklife-beregningen. Avvik i prosentpoeng vises når modellen har et gyldig løfte og en måleperiode med et mål fastsatt senest ved periodens start. Et mål brukeren har skrevet inn, kan fortsatt leses i tekstfilen som «Oppgitt mål». Loggverdier og medarbeidersvar som kan rapporteres, vises også når målet må avklares.

Eksportrapporten sier fra om manglende kontrollpunkter og beskriver profilsammenligningen som seks spørsmål fordelt på tre temaer. Den eksisterende merkingen av egne tall og fiktive eksempler gjelder fortsatt.

## Klargjør og test i WordPress

1. Lagre rå blokkmarkering fra Worklife-siden (side 2459) som `worklife-original.html`. Behold kildemarkeringen som grunnlag for eventuell tilbakeføring.
2. Generer den oppdaterte blokkmarkeringen.

   ```sh
   node scripts/prepare-worklife-method.mjs worklife-original.html worklife-oppdatert.html
   ```

3. Sett den oppdaterte blokken inn i en lokal WordPress-testside. Bruk syntetiske inndata og sperr eksterne forespørsler under testen.

   ```sh
   python3 tests/worklife-method.e2e.py http://127.0.0.1:3186/qa-worklife-method/
   ```

Skriptet stopper dersom de forventede delene av originalblokken er endret. Ved tilbakeføring gjenopprettes den lagrede blokkmarkeringen.
