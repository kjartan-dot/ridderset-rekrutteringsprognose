/* A practical process plan. Answers stay in this document and are never sent or persisted. */
(function () {
  'use strict';
  const root = document.querySelector('#rr-hurtigsjekk[data-journey="true"]');
  const model = window.RRHProcessPlan;
  if (!root || !model || root.dataset.journeyReady) return;
  root.dataset.journeyReady = 'true';
  document.body.classList.add('rrh-journey');
  const $ = name => root.querySelector('#rrh-' + name);
  const answers = Object.create(null);
  const fields = new Map();
  let context = null, employer = '', occupation = '', town = '';
  function node(tag, text, className) {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  }
  function appendList(target, items) {
    if (!target || !items?.length) return;
    const list = node('ol');
    for (const item of items) list.append(node('li', typeof item === 'string' ? item : [item.title, item.action].filter(Boolean).join(': ')));
    target.append(list);
  }
  function reset() {
    for (const key of Object.keys(answers)) delete answers[key];
    for (const field of fields.values()) field.value = '';
    render();
  }
  function render() {
    const plan = model.build(answers);
    $('readiness-status').textContent = plan.answered
      ? plan.answered + ' av 5 forhold er vurdert. Svarene er deres egen vurdering. Planen nedenfor er oppdatert.'
      : 'Ingen svar er forhåndsutfylt. Ubesvart betyr at forholdet ikke er vurdert.';
    $('clear-readiness').hidden = !plan.answered;
    $('plan-intro').textContent = plan.allReady
      ? 'Dere oppgir at de fem forholdene er klare. Bruk neste steg til å kvalitetssikre opplegget og gjennomføre det som er avtalt.'
      : plan.answered
        ? 'Dette er foreslåtte neste steg ut fra det dere har svart. Se hele prosessen nedenfor før dere fordeler ansvar og frister.'
        : 'Her er et startpunkt dere kan bruke med en gang. Ingen av punktene er en konklusjon om bedriften. Svarene over kan gjøre prioriteringen mer relevant.';
    const list = $('plan-priorities'); list.replaceChildren();
    plan.priorities.forEach((priority, index) => {
      const item = node('li', undefined, 'rrh-priority');
      const header = node('div', undefined, 'rrh-priority-head');
      header.append(node('span', String(index + 1).padStart(2, '0'), 'rrh-priority-number'), node('span', priority.statusLabel || 'Neste steg', 'rrh-tag'));
      item.append(header, node('h3', priority.title), node('p', priority.action));
      if (priority.reason) item.append(node('p', priority.reason, 'rrh-meta'));
      const delivery = node('p', undefined, 'rrh-deliverable');
      delivery.append(node('strong', 'Dette skal dere sitte igjen med: '), document.createTextNode(priority.deliverable));
      item.append(delivery, node('p', 'Foreslått ansvar: ' + priority.owner, 'rrh-meta'));
      list.append(item);
    });
  }
  for (const question of model.questions) {
    const row = node('div', undefined, 'rrh-readiness-row');
    const copy = node('div');
    const label = node('label', question.title);
    const select = node('select'); select.id = 'rrh-ready-' + question.id;
    label.htmlFor = select.id;
    const description = node('p', question.description, 'rrh-meta');
    description.id = select.id + '-help'; select.setAttribute('aria-describedby', description.id);
    for (const [value, text] of [['', 'Ikke vurdert'], ['ready', 'Klart'], ['partial', 'Delvis'], ['missing', 'Ikke avklart']]) {
      const option = node('option', text); option.value = value; select.append(option);
    }
    select.addEventListener('change', () => {
      if (select.value) answers[question.id] = select.value;
      else delete answers[question.id];
      render();
    });
    fields.set(question.id, select); copy.append(label, description); row.append(copy, select);
    $('readiness-fields').append(row);
    const phase = node('article');
    phase.append(node('h3', question.title), node('p', question.deliverable), node('p', 'Foreslått ansvar: ' + question.owner, 'rrh-meta'));
    $('plan-phases').append(phase);
  }
  const guides = model.guides || {};
  $('plan-interview').append(node('h3', 'Avklar jobben først'));
  appendList($('plan-interview'), guides.brief);
  $('plan-interview').append(node('h3', 'Bruk samme grunnlag når dere intervjuer'));
  appendList($('plan-interview'), guides.interview);
  appendList($('plan-communication'), guides.communication);
  for (const point of guides.onboarding || []) {
    const article = node('article', undefined, 'rrh-onboarding-step');
    article.append(node('h3', [point.when, point.title].filter(Boolean).join(' · ')), node('p', point.action));
    $('plan-onboarding').append(article);
  }
  root.addEventListener('click', event => {
    const link = event.target.closest('[data-rrh-go]');
    if (link && window.RRHFlow?.openStep(link.dataset.rrhGo)) event.preventDefault();
  });
  $('show-plan').addEventListener('click', () => window.RRHFlow?.openStep('plan'));
  $('clear-readiness').addEventListener('click', () => { reset(); fields.get(model.questions[0].id)?.focus(); });
  function identity(ctx) {
    const chosen = ctx?.selectedCompany;
    return ctx?.mainCompany?.org || (chosen?.kind === 'underenheter' ? chosen.parent || chosen.org : chosen?.org) || (ctx?.manual ? 'manual' : '');
  }
  function apply(ctx) {
    if (!ctx || ctx.source !== 'rr-hurtigsjekk' || ctx.version !== 1) return;
    const nextEmployer = identity(ctx), nextOccupation = ctx.occupation?.code || '', nextTown = ctx.workplace?.municipalityNumber || '';
    if ((employer && nextEmployer && employer !== nextEmployer) || (occupation && nextOccupation && occupation !== nextOccupation)) reset();
    context = ctx;
    if (nextEmployer) employer = nextEmployer;
    if (nextOccupation) occupation = nextOccupation;
    $('plan-context').textContent = [ctx.selectedCompany?.name || (ctx.manual ? 'Uten bedriftsoppslag' : ''), ctx.occupation?.name, ctx.workplace?.municipalityName].filter(Boolean).join(' · ');
    if (town && nextTown && nextTown !== town && model.build(answers).answered) {
      $('readiness-status').textContent = 'Arbeidsstedet er endret. Svarene er beholdt. Kontroller at de fortsatt gjelder for denne rekrutteringen.';
    }
    if (nextTown) town = nextTown;
  }
  function download() {
    if (!context?.occupation || !context?.workplace?.municipalityNumber) return;
    const sources = [
      'FAGLIG GRUNNLAG',
      'Sjekklisten og prioriteringene er Riddersets praktiske anbefalinger, ikke en validert prediksjonsmodell.',
      'Jobbanalyse og utvelgelse: Sackett mfl. (2023), https://doi.org/10.1017/iop.2023.24',
      'Kandidatreaksjoner: Hausknecht mfl. (2004), https://ecommons.cornell.edu/entities/publication/4ab12de5-15ca-4de2-b9d4-efb3609b51ae',
      'Nyansattes tilpasning: Bauer mfl. (2007), https://pdxscholar.library.pdx.edu/busadmin_fac/27/',
      'Svarene er arbeidsgiverens egne opplysninger. Ubesvart er ikke det samme som en svakhet. Ingen svar er sendt til Ridderset.',
      'Ridderset Rekruttering: https://ridderset.no/tjeneste/rekruttering/'
    ];
    const extra = [];
    const worklife = window.__rrpWorklife;
    if (worklife?.assessed_dimensions > 0 || (worklife?.hr_support && worklife.hr_support !== 'unknown')) {
      extra.push('VALGFRI WORKLIFE-EGENVURDERING', 'Arbeidsgiverens egne svar. Dette er ikke en kandidat- eller medarbeiderundersøkelse.');
      const names = {reputation:'Omdømme i kandidatmarkedet',visibility:'Synlighet og troverdighet',promise:'Løfter og arbeidshverdag',onboarding:'Oppstart og integrering',development:'Utvikling og mestring',leadership:'Ledelse og oppfølging'};
      for (const [key, label] of Object.entries(names)) {
        const value = worklife.dimensions?.[key];
        extra.push(label + ': ' + (worklife.assessed_dimension_keys?.includes(key) && typeof value === 'number' ? value + '/10, egenvurdert' : 'Ikke vurdert'));
      }
      extra.push('HR-støtte: ' + (worklife.hr_support_text || 'Ikke avklart'));
    }
    const scenario = window.__rrpCurrent?.recruitment_scenario;
    if (scenario?.confirmed && scenario.choices && document.getElementById('grundig-analyse')?.dataset.rrhContextState === 'applied') {
      extra.push('VALGFRITT BEKREFTET SØKEOPPLEGG');
      for (const key of ['area', 'criteria', 'flex', 'method']) {
        const select = document.getElementById('rrp-sim-' + key);
        if (select?.selectedOptions?.[0]) extra.push(select.selectedOptions[0].textContent);
      }
      if (Array.isArray(scenario.advice)) extra.push(...scenario.advice);
      extra.push('Valgene gir praktiske råd, ikke en samlet skår eller prognose.');
    }
    const report = [model.report(context, answers), 'MARKEDSGRUNNLAG FRA DETTE OPPSLAGET', window.RRHFlow?.getMarketReport() || 'Markedstall er ikke tilgjengelige.', ...extra, ...sources].join('\n\n');
    const url = URL.createObjectURL(new Blob([report], {type:'text/plain;charset=utf-8'}));
    const link = node('a'); link.href = url; link.download = 'ridderset-plan-for-rekruttering.txt';
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    $('download-status').textContent = 'Planen er laget som tekstfil. Ta den med i oppstartsmøtet og avtal ansvar og frister.';
  }
  window.RRHJourney = Object.freeze({download});
  window.addEventListener('rrh-context-changed', event => apply(event.detail));
  window.addEventListener('rrh-context-reset', () => { employer = ''; occupation = ''; town = ''; context = null; reset(); });
  render(); apply(window.__rrhContext);
})();
