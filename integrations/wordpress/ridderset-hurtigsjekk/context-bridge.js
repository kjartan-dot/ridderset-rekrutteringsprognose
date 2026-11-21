/* Continue the selected recruitment context in the existing analysis. No requests or persistence. */
(function () {
  'use strict';

  function init() {
    const quick = document.querySelector('#rr-hurtigsjekk[data-guided="true"]');
    const advanced = document.getElementById('grundig-analyse');
    if (!quick || !advanced || advanced.dataset.rrhBridge === 'ready') return;
    advanced.dataset.rrhBridge = 'ready';

    const originalHidden = new WeakMap();
    const section = document.createElement('section');
    section.id = 'rrh-legacy-context';
    section.className = 'rrh-continuation';
    section.setAttribute('aria-labelledby', 'rrh-legacy-context-title');
    const heading = document.createElement('h3');
    heading.id = 'rrh-legacy-context-title';
    heading.textContent = 'Fortsett med valgene dine';
    const summary = document.createElement('p');
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    const salary = document.createElement('p');
    salary.className = 'rrh-continuation-note';
    const actions = document.createElement('p');
    actions.className = 'rrh-continuation-actions';
    section.append(heading, summary, status, salary, actions);
    const detailsSummary = advanced.querySelector(':scope > summary');
    if (detailsSummary) detailsSummary.after(section);
    else advanced.prepend(section);

    // Put the unanswered planning questions first; keep the existing background tools accessible.
    const workspace = advanced.querySelector('#rrp-v02 .rrp-workspace');
    const scenario = document.getElementById('rrp-scenario');
    if (workspace && scenario) {
      workspace.prepend(scenario);
      const label = scenario.querySelector('.rrp-label');
      if (label) label.textContent = 'STEG 4 · TILPASS REKRUTTERINGEN';
      const confirmation = document.getElementById('rrp-diff-confirm-wrap');
      const outcome = scenario.querySelector('.rrp-sim-result');
      if (confirmation && outcome) {
        outcome.before(confirmation);
        const text = confirmation.querySelector('label');
        if (text) text.textContent = 'Disse fire valgene beskriver rekrutteringen vår. Bruk dem i vurderingen.';
      }
      const background = document.createElement('details');
      background.className = 'rrh-legacy-background';
      const title = document.createElement('summary');
      title.textContent = 'Se bakgrunnstall, vurderingsmodell og metode';
      background.append(title);
      for (const node of Array.from(workspace.children)) {
        if (node === scenario || ['SCRIPT', 'STYLE'].includes(node.tagName)) continue;
        background.append(node);
      }
      workspace.append(background);
      const mode = document.getElementById('rrp-diff-mode');
      if (mode) { mode.value = 'specific'; mode.dispatchEvent(new Event('change', { bubbles: true })); }
      const next = document.createElement('a');
      next.href = '#rrwl-v1'; next.textContent = 'Neste: vurder arbeidsgivertilbudet';
      next.className = 'rrh-guided-next';
      scenario.append(next);
    }
    const worklife = document.querySelector('#rrwl-v1 .rrwl-wrap');
    if (worklife) {
      const next = document.createElement('a');
      next.href = '#rrp-decision-v1'; next.textContent = 'Neste: se handlingsplanen';
      next.className = 'rrh-guided-next'; worklife.append(next);
    }

    const content = Array.from(advanced.children).filter(node =>
      node !== section && node !== detailsSummary && !['SCRIPT', 'STYLE'].includes(node.tagName));
    let highestRevision = -1;
    let lastEmployer = '';
    let resetPending = false;
    let applying = false;

    function hide(node, hidden) {
      if (!node) return;
      if (!originalHidden.has(node)) originalHidden.set(node, node.hidden);
      if (hidden) {
        node.setAttribute('data-rrh-hidden', 'true');
        node.hidden = true;
      } else {
        node.removeAttribute('data-rrh-hidden');
        node.hidden = originalHidden.get(node);
      }
    }

    function gate(blocked) {
      for (const node of content) hide(node, blocked);
      advanced.dataset.rrhContextState = blocked ? 'incomplete' : 'applied';
    }

    function action(text, step) {
      const link = document.createElement('a');
      link.textContent = text;
      link.href = step === 'company' ? '#rrh-start' : '#rrh-role-step';
      link.dataset.rrhStep = step;
      return link;
    }

    function employerKey(ctx) {
      const chosen = ctx.selectedCompany;
      const org = ctx.mainCompany?.org || (chosen?.kind === 'underenheter' ? chosen.parent : chosen?.org);
      if (org) return 'org:' + org;
      if (chosen?.org) return 'unit:' + chosen.org;
      return ctx.manual ? 'manual' : '';
    }

    function resetEmployerAnswers(api) {
      if (!resetPending || !api.worklifeReady) return;
      const reset = document.getElementById('rrwl-reset');
      if (!reset) return;
      // The existing reset clears its private touched set. Never synthesize slider answers.
      reset.click();
      const confirmation = document.getElementById('rrp-diff-confirm');
      if (confirmation) {
        confirmation.checked = false;
        confirmation.dispatchEvent(new Event('change', { bubbles: true }));
      }
      resetPending = false;
    }

    function describe(ctx, message) {
      const chosen = ctx?.selectedCompany;
      const main = ctx?.mainCompany;
      const company = chosen ? (main && main.org !== chosen.org ? main.name + ' · ' + chosen.name : chosen.name)
        : ctx?.manual ? 'Arbeidsplass uten registeroppslag' : 'Bedrift er ikke valgt';
      const job = ctx?.occupation;
      summary.textContent = [company, job ? job.name + ' (STYRK08 ' + job.code + ')' : null,
        ctx?.workplace?.municipalityName].filter(Boolean).join(' · ');
      status.textContent = message;
      const offer = ctx?.salary?.measure === 'base' ? ctx.salary.offeredMonthlyBase : null;
      salary.textContent = offer > 0
        ? 'Grunnlønn: ' + new Intl.NumberFormat('nb-NO').format(offer) + ' kr per måned. Lønnsvurderingen følger hurtigsjekken. Grunnlønn og samlet månedslønn er ulike mål.'
        : 'Lønnsrammen kan legges inn i hurtigsjekken. Her fortsetter du med rekrutteringsopplegget og egne Worklife-vurderinger.';
      actions.replaceChildren(action('Endre bedrift', 'company'), document.createTextNode(' · '),
        action('Endre rolle eller arbeidssted', 'role'));
    }

    function hideRepeatedFields(ctx) {
      for (const selector of ['#rrpc-company', '#rrp-v02 .rrp-controls', '#rrp-v02 .rrp-hero']) {
        const node = document.querySelector(selector);
        hide(node, true);
        if (node) for (const field of node.querySelectorAll('input, select, button')) field.disabled = true;
      }
      const town = document.getElementById('rrpd-town');
      if (town) { town.readOnly = true; hide(town.closest('.rrpd-field'), true); }
      // The older chart uses total monthly salary. The quick check owns the base-salary comparison.
      hide(document.getElementById('rrp-stat-salary')?.closest('article'), true);
      hide(document.getElementById('rrp-bar-offer')?.closest('.rrp-panel'), true);
      const advice = document.getElementById('rrp-advice-salary');
      if (advice) advice.textContent = ctx.salary?.offeredMonthlyBase > 0
        ? 'Vurder grunnlønnen som er lagt inn i hurtigsjekken mot ansvar, erfaring og sektor. Kontroller også hva aktuelle kandidater forventer.'
        : 'Avklar lønnsrammen og legg den eventuelt inn i hurtigsjekken. Vurder ansvar, erfaring og relevant kompetanse.';
      const intro = document.querySelector('#rrp-decision-v1 .rrpd-head p');
      if (intro) intro.textContent = 'Bedrift, rolle og arbeidssted er allerede med. Legg til antall ansettelser og eventuell ønsket oppstart. Vurderingen samler dette med rekrutteringsopplegget og Worklife-svarene dine.';
      const contextNote = document.querySelector('#rrp-decision-v1 .rrpd-intro');
      if (contextNote) contextNote.textContent = 'Valgene i hurtigsjekken følger med videre. Arbeidskommunen er kontekst; fylkestall er ikke lokale yrkestall.';
    }

    function apply(candidate) {
      if (applying) return;
      // The current snapshot also covers events emitted before this asset or the hooks loaded.
      const ctx = window.__rrhContext || candidate;
      if (!ctx || ctx.version !== 1 || ctx.source !== 'rr-hurtigsjekk') {
        gate(true);
        describe(null, 'Velg bedrift eller start uten registeroppslag øverst. Deretter velger du rolle og arbeidssted.');
        return;
      }
      if (!Number.isSafeInteger(ctx.revision) || ctx.revision < highestRevision) return;
      highestRevision = ctx.revision;
      const employer = employerKey(ctx);
      if (employer) {
        if (lastEmployer && employer !== lastEmployer) resetPending = true;
        lastEmployer = employer;
      }
      const api = window.RRPLegacyContext;
      if (!api || typeof api.setCompany !== 'function' || typeof api.setSelection !== 'function' ||
          typeof api.clearSelection !== 'function') {
        gate(true);
        describe(ctx, 'Valgene er tatt med. Fordypningen klargjøres.');
        return;
      }
      applying = true;
      try {
        api.setCompany(ctx);
        resetEmployerAnswers(api);
        let message = '';
        if (!ctx.selectedCompany && !ctx.manual) message = 'Velg bedrift eller start uten registeroppslag i hurtigsjekken.';
        else if (!ctx.occupation) message = 'Velg rollen øverst før du fortsetter. Bedriftsvalget er allerede tatt med.';
        else if (!ctx.workplace?.municipalityNumber) message = 'Velg arbeidskommune øverst før du fortsetter.';
        else if (!['18', '55', '56'].includes(ctx.workplace.countyCode)) {
          message = 'Denne fordypningen har fylkestall for Nordland, Troms og Finnmark. Bruk hurtigsjekken og markedstallene for valgt arbeidssted; vi viser ikke tall fra et annet fylke.';
        }
        let applied = false;
        if (message) api.clearSelection(ctx);
        else {
          applied = api.setSelection(ctx) === true;
          if (!applied) message = 'Yrkesgruppen er ikke tilgjengelig i denne fordypningen. Valgene dine er beholdt i hurtigsjekken.';
        }
        gate(!applied);
        if (applied) hideRepeatedFields(ctx);
        describe(ctx, message || 'Valgene dine er tatt med. Avklar først de fire valgene nedenfor. Deretter kan du vurdere arbeidsgivertilbudet og se handlingsplanen.');
        // Legacy report and difficulty listeners re-render from their shared context, without a search.
        window.dispatchEvent(new CustomEvent('rrp-company-selected', { detail: window.__rrpCompany || null }));
        window.dispatchEvent(new CustomEvent('rrh-legacy-context-applied', {
          detail: { revision: ctx.revision, applied, workplace: ctx.workplace?.municipalityNumber || null }
        }));
      } finally { applying = false; }
    }

    advanced.addEventListener('click', event => {
      const link = event.target.closest('a[data-rrh-step], a[href="#rrh-role-step"]');
      if (!link || !window.RRHFlow?.openStep) return;
      const step = link.dataset.rrhStep || 'role';
      if (window.RRHFlow.openStep(step)) event.preventDefault();
    });
    window.addEventListener('rrh-context-changed', event => apply(event.detail));
    window.addEventListener('rrh-legacy-ready', () => apply());
    window.addEventListener('rrh-context-reset', () => {
      lastEmployer = '';
      resetPending = true;
      resetEmployerAnswers(window.RRPLegacyContext || {});
    });
    gate(true);
    apply();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
