/* Shared process copy and input-only planning rules. No DOM, network or persistence. */
(function (root) {
  'use strict';

  const METHOD_VERSION = 'rr-process-plan-1.0';
  const STATES = ['ready', 'partial', 'missing'];
  const STATUS_LABELS = { ready: 'Klart', partial: 'Delvis', missing: 'Ikke avklart', unanswered: 'Ikke vurdert' };
  const ORDER = { missing: 0, partial: 1, unanswered: 2, ready: 3 };
  const COPY = {
    title: 'Få et godt grunnlag før dere lyser ut',
    introduction: 'Markedstallene er et utgangspunkt. Avklar oppdraget, hva dere kan tilby og hvordan kandidatene skal bli vurdert og fulgt opp.',
    questionsTitle: 'Fem korte avklaringer',
    questionsHelp: 'Svar ut fra det dere faktisk har på plass. Du kan hoppe over spørsmålene og få en standardplan.',
    skipLabel: 'Vis standardplanen',
    prioritiesTitle: 'Tre prioriterte grep',
    standardSummary: 'Ingen avklaringer er besvart. Dette er en standardplan som dere kan kontrollere mot det som allerede er på plass.',
    answeredSummary: 'Planen prioriterer det dere har oppgitt som uavklart eller delvis klart. Ubesvarte punkter er merket «Ikke vurdert».',
    readySummary: 'Dere oppgir at alle fem områder er klare. Neste steg er å kvalitetssikre sammenhengen og gjennomføre som avtalt.',
    reputationTitle: 'Prosessen er også en del av omdømmet',
    reputationText: 'Kandidaten møter arbeidsgiveren i hver kontakt. Gjør rollen og vurderingene forståelige, gi kandidatene en ryddig mulighet til å vise relevant kompetanse, og følg opp som avtalt.',
    purpose: 'Planen hjelper dere å avklare oppdraget, vurdere relevant kompetanse og holde det dere lover gjennom rekruttering og oppstart.',
    downloadLabel: 'Last ned planen før utlysning',
  };

  const QUESTIONS = [
    {
      id: 'brief', title: 'Oppdrag og krav',
      description: 'Er det avklart hva den nye medarbeideren skal levere, og hvilke krav som er nødvendige fra start?',
      owner: 'Ansettende leder, sammen med fagansvarlig',
      deliverable: 'En kort oppdrags- og kravprofil med forventede resultater, nødvendige krav, læringsrom og beslutningsansvar.',
      when: 'Før annonse og første kandidatkontakt',
      readyText: 'Kontroller at leder og dem som skal vurdere kandidatene bruker samme oppdrag, krav og vurderingskriterier.',
      checklist: [
        'Beskriv to eller tre resultater rollen skal bidra til, og hvilke oppgaver som er viktigst.',
        'Skill mellom nødvendige krav fra start og det som kan læres etter ansettelse.',
        'Avtal hvordan kravene skal undersøkes, og hvem som tar beslutningen.',
      ],
      actions: {
        missing: { title: 'Avklar oppdraget før dere skriver annonsen', text: 'Beskriv hva rollen skal levere. Knytt hvert nødvendig krav til en oppgave, og avklar hva dere kan lære opp en ny medarbeider i.' },
        partial: { title: 'Fullfør oppdrags- og kravprofilen', text: 'Gå gjennom det som fortsatt er uklart. Avtal nødvendige krav, læringsrom og hvordan dere skal undersøke kompetansen.' },
        unanswered: { title: 'Kontroller oppdrag og krav', text: 'Se gjennom en eksisterende kravprofil, eller lag en kort versjon. Marker hvilke forventninger og krav som fortsatt må avklares.' },
        ready: { title: 'Kvalitetssikre det felles vurderingsgrunnlaget', text: 'La leder og vurderingsteam bekrefte at annonsen, intervjuspørsmålene og forventningene etter oppstart beskriver samme jobb.' },
      },
    },
    {
      id: 'reach', title: 'Kandidatmarked og arbeidsgivertilbud',
      description: 'Vet dere hvem dere vil nå, hvor dere skal lete og hva dere faktisk kan tilby?',
      owner: 'Ansettende leder og den som har ansvar for rekrutteringen',
      deliverable: 'En definert målgruppe, et begrunnet kanalvalg og et arbeidsgivertilbud dere kan stå inne for.',
      when: 'Før dere velger kanaler og publiserer budskapet',
      readyText: 'Kontroller at kanalene, lønnsrammen og arbeidsgiverløftene passer rollen og den valgte målgruppen.',
      checklist: [
        'Bruk markedstallene som bakgrunn, og avklar hvilke fagmiljøer og kandidater som er relevante for oppgavene.',
        'Velg kanaler ut fra målgruppen. Annonsering, nettverk, interne kandidater og direkte kontakt kan vurderes hver for seg.',
        'Avklar lønn, arbeidssted, arbeidsform og utviklingsmuligheter. Skill dokumenterte forhold fra egne antakelser.',
      ],
      actions: {
        missing: { title: 'Avklar hvem dere vil nå og hva dere tilbyr', text: 'Definer målgruppen og arbeidsgivertilbudet før dere velger kanaler. Konkretiser lønn, oppgaver, arbeidsform og utviklingsmuligheter.' },
        partial: { title: 'Tett hullene i målgruppe og arbeidsgivertilbud', text: 'Kontroller de usikre forutsetningene. Presiser tilbudet og velg kanaler som passer den aktuelle rollen og målgruppen.' },
        unanswered: { title: 'Kontroller målgruppe og arbeidsgivertilbud', text: 'Se om dere har et begrunnet kanalvalg og et konkret tilbud. Marker hvilke påstander om arbeidsplassen som er dokumentert, og hva som bør undersøkes.' },
        ready: { title: 'Sjekk at budskapet kan følges opp', text: 'Les annonsen og annet kandidatmateriell opp mot det dere faktisk kan tilby. Avtal hvem som svarer på spørsmål om rollen og arbeidsplassen.' },
      },
    },
    {
      id: 'selection', title: 'Strukturert intervju og vurdering',
      description: 'Har dere avtalte vurderingskriterier og en felles intervjustruktur?',
      owner: 'Ansettende leder og dem som skal vurdere kandidatene',
      deliverable: 'En intervjuguide og et vurderingsgrunnlag som knytter kandidatens eksempler til kravene i rollen.',
      when: 'Før første intervju',
      readyText: 'Gå gjennom kriterier og spørsmål med intervjuerne, og gjennomfør vurderingene på det avtalte grunnlaget.',
      checklist: [
        'Velg noen få kriterier som følger av oppdraget, og avtal hvilken informasjon dere trenger for hvert kriterium.',
        'Bruk en felles kjerne av spørsmål. Be om konkrete eksempler, og følg opp det som trenger avklaring.',
        'Noter observasjoner og usikkerhet før felles drøfting. Avklar hva dere fortsatt trenger å undersøke før beslutningen.',
      ],
      actions: {
        missing: { title: 'Lag vurderingsgrunnlaget før intervjuene', text: 'Knytt kriteriene til oppdraget og lag en felles intervjuguide. Avtal hva som skal dokumenteres, hvem som vurderer hva, og hvordan beslutningen tas.' },
        partial: { title: 'Samordne intervju og vurdering', text: 'Fullfør spørsmål og kriterier som mangler. Kontroller at kandidatene får anledning til å vise den kompetansen rollen krever.' },
        unanswered: { title: 'Kontroller hvordan kandidatene skal vurderes', text: 'Se om kriterier, intervjuspørsmål og beslutningsansvar er avtalt. Bruk intervjuguiden i planen som utgangspunkt der noe mangler.' },
        ready: { title: 'Gjennomfør med felles kriterier og tydelige notater', text: 'Bekreft rollefordelingen før intervjuene. Dokumenter eksempler opp mot kriteriene, og avklar usikkerhet før dere tar beslutningen.' },
      },
    },
    {
      id: 'communication', title: 'Kandidatkommunikasjon og ansvar',
      description: 'Er det avtalt hvem som følger opp kandidatene, hva de får vite og når de hører fra dere?',
      owner: 'En navngitt prosessansvarlig, i samarbeid med ansettende leder',
      deliverable: 'En enkel kommunikasjonsplan med kontaktperson, neste beskjed, frist og ansvar ved forsinkelser.',
      when: 'Før dere inviterer kandidater inn i prosessen',
      readyText: 'Følg opp til de avtalte tidene, og gi beskjed når prosessen endrer seg.',
      checklist: [
        'Fortell hvordan prosessen er lagt opp, hva som skal vurderes, og hvem kandidaten kan kontakte.',
        'Avtal neste beskjed og ansvarlig etter hver kontakt. Oppdater kandidaten også når en beslutning er forsinket.',
        'Avslutt dialogen ryddig. Knytt tilbakemeldinger til relevante vurderinger og det som faktisk er undersøkt.',
      ],
      actions: {
        missing: { title: 'Avtal kandidatoppfølgingen før dere starter', text: 'Utpek en kontaktperson og avtal når kandidatene skal få beskjed. Lag en enkel plan for invitasjoner, oppdateringer, avslag og tilbud.' },
        partial: { title: 'Tett hullene i kandidatkommunikasjonen', text: 'Avklar hvem som følger opp de ulike stegene, og hva som skjer ved forsinkelser. Sørg for at ingen kandidat blir stående uten en avtalt neste beskjed.' },
        unanswered: { title: 'Kontroller ansvar og beskjed til kandidatene', text: 'Se om kontaktperson, svarfrister og oppfølging ved forsinkelser er avtalt. Bruk kommunikasjonsplanen til å fylle eventuelle hull.' },
        ready: { title: 'Hold kandidatene oppdatert som avtalt', text: 'Følg opp fristene og kontroller at alle får en ryddig avslutning. Noter relevante tilbakemeldinger som kan forbedre neste prosess.' },
      },
    },
    {
      id: 'onboarding', title: 'Tilbud og oppstart',
      description: 'Er tilbud, forventninger og de første 90 dagene planlagt med ansvarlig leder?',
      owner: 'Ansettende leder, med praktisk støtte fra HR eller administrasjon',
      deliverable: 'Et tydelig tilbud og en plan for støtte, læring, leveranser og samtaler de første 30, 60 og 90 dagene.',
      when: 'Avklar rammen før utlysning og fullfør planen før oppstart',
      readyText: 'Kontroller at tilbud, intervju og oppstartsplan gir samme forventninger, og avtal de første samtalene.',
      checklist: [
        'Avklar hva tilbudet omfatter, og sørg for at det samsvarer med det som er formidlet gjennom prosessen.',
        'Utpek ansvarlig leder og praktisk støtte. Forbered utstyr, tilganger, introduksjon og første oppgaver.',
        'Planlegg samtaler etter 30, 60 og 90 dager, med rom for tilbakemelding begge veier og justering av forventninger.',
      ],
      actions: {
        missing: { title: 'Planlegg overgangen fra tilbud til arbeidshverdag', text: 'Avklar tilbudet og hva som skal være klart ved oppstart. Utpek ansvarlig leder og lag en enkel plan for støtte og oppfølging de første 90 dagene.' },
        partial: { title: 'Fullfør tilbud og oppstartsplan', text: 'Tett hullene i forventninger, praktiske forberedelser og lederoppfølging. Avtal samtaler etter 30, 60 og 90 dager.' },
        unanswered: { title: 'Kontroller tilbud og oppstart', text: 'Se om det dere lover i rekrutteringen følges opp i tilbudet og oppstartsplanen. Bruk 30–60–90-planen til å avklare ansvar og støtte.' },
        ready: { title: 'Gjennomfør oppstarten med tydelig lederansvar', text: 'Bekreft praktiske forberedelser og avtalte samtaler. Bruk tilbakemeldingene fra den nyansatte til å justere støtte og forventninger.' },
      },
    },
  ];

  const INTERVIEW_GUIDE = [
    { title: 'Forbered vurderingen', steps: [
      'Velg fire til seks kriterier som følger av oppdraget. Avtal hvem som spør, noterer og følger opp.',
      'Definer hvilke konkrete eksempler eller opplysninger dere trenger for å vurdere hvert kriterium.',
    ] },
    { title: 'Gi kandidaten en tydelig ramme', steps: [
      'Forklar rollen, hvordan samtalen gjennomføres og hvilke deler av kompetansen dere vil undersøke.',
      'Sett av plass til kandidatens spørsmål og avklaringer om arbeidsplassen.',
    ] },
    { title: 'Bruk en felles kjerne av spørsmål', steps: [
      '«Fortell om en oppgave som ligner en av de viktigste oppgavene i denne rollen.»',
      '«Hva var ditt ansvar, hva gjorde du konkret, og hva ble resultatet?»',
      '«Hva var vanskelig, og hva ville du gjort annerledes?»',
      '«Hva trenger du fra leder og arbeidsmiljø for å lykkes i denne rollen?»',
      'Følg opp uklare svar. Skill kandidatens egne bidrag fra det andre i teamet gjorde.',
    ] },
    { title: 'Undersøk det som krever mer belegg', steps: [
      'Bruk en kort, relevant arbeidsoppgave når det gir nyttig informasjon. Avtal ramme og vurderingskriterier på forhånd.',
      'Avklar med kandidaten hvordan eventuelle referanser skal brukes til å undersøke relevante, gjenstående spørsmål.',
    ] },
    { title: 'Dokumenter og avslutt ryddig', steps: [
      'Noter konkrete observasjoner opp mot kriteriene før felles drøfting. Marker hva dere fortsatt er usikre på.',
      'Avtal neste steg, ansvarlig kontaktperson og når kandidaten skal høre fra dere igjen.',
    ] },
  ];

  const COMMUNICATION_PLAN = [
    { title: 'Ved første kontakt', action: 'Forklar rollen, prosessen, forventet tidsløp og hvem kandidaten kan kontakte.' },
    { title: 'Etter hvert steg', action: 'Avtal neste beskjed, tidspunkt og ansvarlig. Følg opp også når det ennå ikke finnes en endelig beslutning.' },
    { title: 'Når noe endrer seg', action: 'Gi beskjed om endret fremdrift eller forutsetninger, og avtal en ny oppdatering.' },
    { title: 'Ved avslutning og tilbud', action: 'Gi en ryddig beskjed. Knytt tilbakemeldinger til relevante vurderinger, og gjør tilbud og forventninger tydelige.' },
  ];

  const ONBOARDING_PLAN = [
    { period: 'Før oppstart', title: 'Gjør forventninger og rammer tydelige', owner: 'Ansettende leder og praktisk støtte',
      deliverable: 'Avklart tilbud, første arbeidsuke, kontaktperson, utstyr og tilganger.',
      steps: ['Bekreft oppgaver, arbeidssted, avtalte vilkår og hvem som følger opp.', 'Forbered introduksjon, første oppgaver og nødvendige tilganger.'] },
    { period: 'Innen 30 dager', title: 'Skap oversikt og en god start', owner: 'Nærmeste leder, sammen med den nyansatte',
      deliverable: 'Felles forventninger og en prioritert plan for læring og første leveranser.',
      steps: ['Gå gjennom oppdrag, samarbeid, rutiner og støttebehov.', 'Spør hva som stemmer med forventningene fra rekrutteringen, og hva som må avklares.'] },
    { period: 'Innen 60 dager', title: 'Følg opp mestring og samarbeid', owner: 'Nærmeste leder, sammen med den nyansatte',
      deliverable: 'Justerte mål og avtalt støtte ut fra erfaringene så langt.',
      steps: ['Se på konkrete oppgaver og leveranser, og gi tilbakemelding begge veier.', 'Juster opplæring, støtte og prioriteringer der det er behov.'] },
    { period: 'Innen 90 dager', title: 'Avtal veien videre', owner: 'Nærmeste leder, sammen med den nyansatte',
      deliverable: 'En avtalt videre plan for ansvar, mål, utvikling og oppfølging.',
      steps: ['Gå gjennom leveranser, mestring og forventninger til rollen.', 'Avtal neste mål og utviklingsbehov. Følg opp eventuelle forskjeller mellom løftene i rekrutteringen og arbeidshverdagen.'] },
  ];

  const SUPPORT_OPTIONS = [
    { id: 'self', title: 'Gjennomfør selv med en plan', description: 'Bruk sjekklisten, intervjuguiden og oppstartsplanen sammen med leder og dem som skal bidra.', actionLabel: 'Last ned planen' },
    { id: 'review', title: 'Få kvalitetssikret utvalgte deler', description: 'Velg det dere ønsker en faglig gjennomgang av, for eksempel kravprofil, annonse, intervjuguide eller vurderingsgrunnlag.', actionLabel: 'Drøft utvalgte deler med Ridderset' },
    { id: 'support', title: 'Få bistand gjennom prosessen', description: 'Avklar hvilke oppgaver Ridderset skal bistå med, fra oppdrag og markedskartlegging til vurdering, tilbud og overlevering til leder.', actionLabel: 'Drøft bistand gjennom prosessen' },
  ];

  // Compact views for the UI, derived from the same full guide used by the report.
  const GUIDES = {
    brief: QUESTIONS[0].checklist.slice(),
    interview: INTERVIEW_GUIDE.map(section => section.title + ': ' + section.steps.join(' ')),
    communication: COMMUNICATION_PLAN.map(item => item.title + ': ' + item.action),
    onboarding: ONBOARDING_PLAN.map(stage => ({ when: stage.period, title: stage.title,
      action: stage.steps.join(' '), owner: stage.owner, deliverable: stage.deliverable })),
  };

  function freeze(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.values(value).forEach(freeze);Object.freeze(value);
    }
    return value;
  }
  function normalizeAnswers(answers) {
    const source = answers && typeof answers === 'object' && !Array.isArray(answers) ? answers : {};
    return Object.fromEntries(QUESTIONS.map(question => {
      const value = Object.prototype.hasOwnProperty.call(source, question.id) ? source[question.id] : null;
      return [question.id, STATES.includes(value) ? value : null];
    }));
  }
  function build(answers) {
    const normalized = normalizeAnswers(answers);
    const statuses = QUESTIONS.map(question => ({
      id: question.id, title: question.title, status: normalized[question.id],
      statusLabel: STATUS_LABELS[normalized[question.id] || 'unanswered'],
      owner: question.owner, deliverable: question.deliverable,
    }));
    const answered = statuses.filter(item => item.status !== null).length;
    const allReady = statuses.every(item => item.status === 'ready');
    const priorities = QUESTIONS.map((question, index) => ({ question, index, status: normalized[question.id] }))
      .sort((a, b) => ORDER[a.status || 'unanswered'] - ORDER[b.status || 'unanswered'] || a.index - b.index)
      .slice(0, 3).map(({ question, status }) => {
        const action = question.actions[status || 'unanswered'];
        const reason = status === 'missing' ? 'Dere har oppgitt at dette ikke er avklart.'
          : status === 'partial' ? 'Dere har oppgitt at dette er delvis klart.'
          : status === 'ready' ? 'Dere har oppgitt at dette er klart. Tiltaket gjelder kvalitetssikring og gjennomføring.'
          : 'Dette punktet er ikke vurdert. Tiltaket inngår i standardplanen.';
        return { id: question.id, status, statusLabel: STATUS_LABELS[status || 'unanswered'],
          title: action.title, reason, action: action.text, owner: question.owner,
          deliverable: question.deliverable, when: question.when,
          kind: status === 'ready' ? 'quality_check' : status === null ? 'standard' : 'clarification' };
      });
    return { answered, unanswered: QUESTIONS.length - answered, allReady, answers: normalized, statuses, priorities,
      summary: allReady ? COPY.readySummary : answered === 0 ? COPY.standardSummary : COPY.answeredSummary,
      methodVersion: METHOD_VERSION };
  }

  function clean(value) {
    return typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim() : '';
  }
  function report(context, answers) {
    const ctx = context && typeof context === 'object' ? context : {};
    const plan = build(answers);
    const chosen = ctx.selectedCompany || null, main = ctx.mainCompany || null;
    const job = ctx.occupation || null, workplace = ctx.workplace || null;
    const companyName = clean(chosen?.name), org = clean(chosen?.org);
    const jobName = clean(job?.name) || 'Ikke valgt', code = clean(job?.code);
    const amount = ctx.salary?.measure === 'base' ? ctx.salary.offeredMonthlyBase : null;
    const sectorLabels = { ALLE: 'Alle sektorer', 'A+B+D+E': 'Privat sektor og offentlig eide foretak', '6500': 'Kommuneforvaltningen', '6100': 'Statsforvaltningen' };
    const lines = ['RIDDERSET | PLAN FØR UTLYSNING', '',
      'Valgt virksomhet / avdeling: ' + (companyName || (ctx.manual ? 'Analyse uten registeroppslag' : 'Ikke valgt')),
      'Organisasjonsnummer: ' + (org || 'Ikke oppgitt')];
    if (main && chosen && clean(main.org) && main.org !== chosen.org) {
      lines.push('Hovedenhet: ' + (clean(main.name) || 'Navn ikke oppgitt') + ' · ' + clean(main.org));
    }
    lines.push('Rolle: ' + jobName + (code ? ' · STYRK08 ' + code : ''),
      'Arbeidskommune: ' + (clean(workplace?.municipalityName) || 'Ikke valgt'),
      'Oppgitt grunnlønn: ' + (typeof amount === 'number' && Number.isFinite(amount) && amount > 0
        ? new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 2 }).format(amount) + ' kr per måned' : 'Ikke oppgitt'),
      'Sektor for lønnssammenligning: ' + (sectorLabels[ctx.salary?.sector] || 'Ikke valgt'), '',
      'GRUNNLAG FOR PLANEN', plan.summary, COPY.purpose,
      'Planen bygger på deres valg og svar. Den gir ikke en prognose for søkerantall eller rekrutteringsutfall.', '',
      'FEM AVKLARINGER', ...plan.statuses.map(item => item.title + ': ' + item.statusLabel), '', 'TRE PRIORITERTE GREP');
    plan.priorities.forEach((priority, index) => lines.push('', (index + 1) + '. ' + priority.title,
      priority.reason, priority.action, 'Foreslått ansvar: ' + priority.owner,
      'Leveranse: ' + priority.deliverable, 'Tidspunkt: ' + priority.when));
    lines.push('', 'SJEKKLISTE FOR PROSESSEN');
    QUESTIONS.forEach(question => lines.push('', question.title.toLocaleUpperCase('nb-NO'),
      'Status: ' + STATUS_LABELS[plan.answers[question.id] || 'unanswered'],
      'Foreslått ansvar: ' + question.owner, ...question.checklist.map(item => '• ' + item),
      'Leveranse: ' + question.deliverable));
    lines.push('', 'INTERVJUGUIDE');
    INTERVIEW_GUIDE.forEach((section, index) => lines.push('', (index + 1) + '. ' + section.title, ...section.steps.map(item => '• ' + item)));
    lines.push('', 'KANDIDATKOMMUNIKASJON', COPY.reputationText);
    COMMUNICATION_PLAN.forEach(item => lines.push('• ' + item.title + ': ' + item.action));
    lines.push('', 'OPPSTART: FØR START OG DE FØRSTE 30, 60 OG 90 DAGENE');
    ONBOARDING_PLAN.forEach(stage => lines.push('', stage.period.toLocaleUpperCase('nb-NO') + ' · ' + stage.title,
      'Foreslått ansvar: ' + stage.owner, ...stage.steps.map(item => '• ' + item), 'Leveranse: ' + stage.deliverable));
    lines.push('', 'VELG HVORDAN DERE VIL GJENNOMFØRE');
    SUPPORT_OPTIONS.forEach(option => lines.push('• ' + option.title + ': ' + option.description));
    lines.push('', 'Ridderset Rekruttering · https://ridderset.no/kontakt/', 'Planregel: ' + METHOD_VERSION);
    return lines.join('\n');
  }

  freeze(QUESTIONS);freeze(INTERVIEW_GUIDE);freeze(COMMUNICATION_PLAN);freeze(ONBOARDING_PLAN);freeze(SUPPORT_OPTIONS);freeze(COPY);freeze(STATUS_LABELS);freeze(GUIDES);
  const api = Object.freeze({ questions: QUESTIONS, build, report, copy: COPY, statusLabels: STATUS_LABELS,
    interviewGuide: INTERVIEW_GUIDE, communicationPlan: COMMUNICATION_PLAN, onboardingPlan: ONBOARDING_PLAN,
    supportOptions: SUPPORT_OPTIONS, guides: GUIDES, methodVersion: METHOD_VERSION });
  root.RRHProcessPlan = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
