# Beregningsmetode og begrensninger – versjon 1.0

## Marked

SSB 11418 spørres med `MaaleMetode=01` (median), valgt fire-sifret `Yrke`,
`Sektor=ALLE`, `Kjonn=0`, `AvtaltVanlig=0`, `ContentsCode=Manedslonn` og siste
publiserte `Tid` fra metadata. Ett tall, én avgrensning. Metadata og cellens
dimensjoner valideres. Manglende/skjermede celler blir aldri 0.

Medianen gjelder Norge, alle sektorer, begge kjønn og begge arbeidstider
(omregnet til heltidsekvivalenter). Månedslønn inkluderer variable tillegg og
bonus, uten overtid. Tilbudet må være sammenlignbart. Årsverk i lønnsstatistikk
er ikke det samme som Brregs antall registrerte personer.

Lønnsforskjell i prosent = `100 × (tilbud / median − 1)`, avrundet til heltall.
Beregnes bare ved oppgitt positiv lønn og publisert positiv median.
Formelen dokumenterer en forskjell til landsmedian; den dokumenterer verken
lokal markedslønn, antall kandidater eller rekrutteringsrisiko.

NAVs historiske tall er **tilgang på publiserte stillinger i en periode**.
De er verken aktive annonser i dag eller unike konkurrerende arbeidsgivere.
Fylke/alle yrker og Norge/ett yrke vises hver for seg. Vi multipliserer, fordeler
eller kombinerer ikke disse til et lokalt yrkestall. Topp 30-utvalget gir manglende
tall for andre yrker. Månedshistorikken gjengis uten sesongjustering eller
trendekstrapolering; antall virkedager varierer.

Bedriftsundersøkelsen er et utvalgsbasert mangelanslag. Estimat, 95 %
konfidensintervall, originalrad, år og geografi beholdes. De publiserte verdiene
kan være avrundet, og lave avrundede estimater kan avvike fra intervallgrensene.
Vi korrigerer ikke kildens estimat og finner ikke på lokal kandidattilgang.

## Worklife-egenvurdering

De seks spørsmålene er fra legacy: omdømme, synlighet, innfrielse av løfter,
onboarding, utvikling og ledelse. Hvert svar er enten ubesvart (`null`) eller
et eksplisitt heltall 0–10. Skyvefeltet står visuelt på 5 før svar, men 5 inngår
ikke i datagrunnlaget før brukeren flytter feltet eller bekrefter verdien.
Brukeren kan fjerne ett svar eller nullstille alle. Et aktivt valgt 0 er gyldig.

Valgfrie illustrative delscorer:

- Brand = gjennomsnitt av **besvarte** omdømme-/synlighetsspørsmål × 10.
- Index = gjennomsnitt av **besvarte** løfte-/onboarding-/utviklings-/ledelsesspørsmål × 10.
- Avrundes til heltall. Antall besvarte og totalt antall følger hver delscore.
- Ingen besvarte spørsmål → ingen score. Delvis besvart → ufullstendig
  illustrasjon. Illustrasjonen kan deaktiveres; svarene beholdes.

Like vekter er valgt for enkel etterprøvbarhet. Legacy-vekter og sammensatt
40/60-score er fjernet. Dette er **ikke** en validert Worklife Index, kandidatmålt
Brand, sertifisering eller benchmark. Full Worklife-metode er ikke tilgjengelig
i det offentlige repoet. Målinger krever anonymiserte medarbeidersvar og
uavhengige kandidatmålinger med godkjent metode.

Oppgitt omdømme minus oppgitt løfteinnfrielse vises bare når begge er besvart.
Forskjellen angis som selvrapporterte skalapoeng, uten normalverdi eller
kausal fortolkning. Den er grunn til å undersøke forventninger, ingen måling
av et faktisk løfte–leveranse-gap.

HR-støtte er en separat kategori, uten poeng. Råd handler om prosesseier,
kapasitet og ansvarsfordeling. Egen HR antas ikke å være god kvalitet, og
fravær av HR antas ikke å være dårlig virksomhet.

## Fortolkning og scenario

Rapporten viser fem kvalitative tiltak: kontroller kode/krav, vurder lønn,
avklar kapasitet, undersøk Worklife-forhold og kontroller søkeområdet.
Lavt besvarte Worklife-forhold (0–4) gir et råd om videre undersøkelse,
uten at terskelen hevdes å være validert. Ubesvarte verdier brukes aldri som lave.

Scenarioet endrer bare hypotetisk lønn, geografi, krav og HR. En alternativ
lønnsforskjell kan beregnes mot samme dokumenterte median. Ingen effekt på
søkertall, kandidattilgang, sannsynlighet eller rekrutteringsdato beregnes.

Samlet status er «utilstrekkelig grunnlag for risiko/prediksjon» i fase 1.
Aktive yrkesvise annonser, kvalifisert kandidattilgang og empirisk modellvalidering
mangler. Rapporten gir en forklaring og 30/60/90-milepæler, ikke en prognose.
Planen gjelder også dersom stillingen fremdeles er ubesatt etter 90 dager.
