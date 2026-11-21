import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../integrations/wordpress/ridderset-hurtigsjekk/process-plan.js', import.meta.url), 'utf8');
const sandbox = { window: {}, module: { exports: {} }, Intl };
vm.createContext(sandbox);vm.runInContext(source, sandbox);
const api = sandbox.window.RRHProcessPlan;
const ids = ['brief', 'reach', 'selection', 'communication', 'onboarding'];
const plain = value => JSON.parse(JSON.stringify(value));

test('module loads without a DOM, storage or network and supports browser and CommonJS', () => {
  assert.equal(sandbox.module.exports, api);
  assert.deepEqual(Array.from(api.questions, item => item.id), ids);
  assert.equal(api.questions.length, 5);
  assert.ok(api.questions.every(item => item.title && item.description && item.owner && item.deliverable && item.readyText));
});

test('unanswered defaults produce a labelled standard plan, never five negative answers or a score', () => {
  const plan = api.build();
  assert.equal(plan.answered, 0);assert.equal(plan.unanswered, 5);assert.equal(plan.allReady, false);
  assert.deepEqual(plain(plan.answers), Object.fromEntries(ids.map(id => [id, null])));
  assert.ok(plan.statuses.every(item => item.status === null && item.statusLabel === 'Ikke vurdert'));
  assert.deepEqual(Array.from(plan.priorities, item => item.id), ['brief', 'reach', 'selection']);
  assert.ok(plan.priorities.every(item => item.kind === 'standard'));
  assert.match(plan.summary, /standardplan/);
  assert.equal('score' in plan, false);assert.equal('risk' in plan, false);
});

test('explicit missing then partial then unanswered outrank ready, with phase order inside each status', () => {
  const input = { brief: 'ready', reach: 'partial', selection: 'missing', communication: 'missing' };
  const before = JSON.stringify(input);
  const plan = api.build(input);
  assert.equal(plan.answered, 4);assert.equal(plan.unanswered, 1);
  assert.deepEqual(Array.from(plan.priorities, item => item.id), ['selection', 'communication', 'reach']);
  assert.deepEqual(Array.from(plan.priorities, item => item.status), ['missing', 'missing', 'partial']);
  assert.equal(JSON.stringify(input), before);
  const partlyReady = api.build({ brief: 'ready', reach: 'ready', selection: 'ready', communication: 'partial' });
  assert.deepEqual(Array.from(partlyReady.priorities, item => item.id), ['communication', 'onboarding', 'brief']);
});

test('invalid and inherited answers stay unanswered instead of becoming an observation', () => {
  for (const invalid of ['klart', 'READY', '', false, true, 0, 5, {}, [], undefined]) {
    assert.equal(api.build({ brief: invalid }).answers.brief, null);
  }
  assert.equal(api.build(Object.create({ brief: 'missing' })).answered, 0);
  assert.equal(api.build(['ready', 'ready']).answered, 0);
  assert.equal(api.build(null).answered, 0);
  assert.equal(api.build({ unknown: 'missing' }).answered, 0);
});

test('all ready gives three quality and execution tasks without declaring recruitment solved', () => {
  const plan = api.build(Object.fromEntries(ids.map(id => [id, 'ready'])));
  assert.equal(plan.allReady, true);assert.equal(plan.answered, 5);assert.equal(plan.unanswered, 0);
  assert.equal(plan.priorities.length, 3);
  assert.ok(plan.priorities.every(item => item.status === 'ready' && item.kind === 'quality_check'));
  assert.match(plan.summary, /Dere oppgir/);
  assert.match(plan.summary, /kvalitetssikre/);
  assert.doesNotMatch(JSON.stringify(plan), /garantert|løst|mange kvalifiserte søkere|lav risiko/i);
});

test('build has no hidden memory between companies or repeated assessments', () => {
  const first = api.build({ communication: 'missing' });
  first.answers.brief = 'ready';first.priorities[0].title = 'Changed by caller';
  const next = api.build();
  assert.equal(next.answered, 0);
  assert.notEqual(next.priorities[0].title, 'Changed by caller');
  assert.ok(Object.isFrozen(api.questions));
  assert.ok(Object.isFrozen(api.questions[0].actions));
});

test('report shares the same priorities, identifies the selected unit and preserves the actual workplace', () => {
  const context = {
    mainCompany: { name: 'KUPA AS', org: '123456789' },
    selectedCompany: { name: 'KUPA AS AVD TEST', org: '987654321', townName: 'Harstad' },
    occupation: { code: '3112', name: 'Bygningsingeniører' },
    workplace: { municipalityNumber: '5501', municipalityName: 'Tromsø' },
    salary: { offeredMonthlyBase: 60000, sector: 'A+B+D+E', measure: 'base' },
  };
  const answers = { brief: 'ready', reach: 'partial', selection: 'missing' };
  const plan = api.build(answers), report = api.report(context, answers);
  assert.match(report, /KUPA AS AVD TEST/);assert.match(report, /Hovedenhet: KUPA AS · 123456789/);
  assert.match(report, /Arbeidskommune: Tromsø/);assert.doesNotMatch(report, /Arbeidskommune: Harstad/);
  assert.match(report, /STYRK08 3112/);assert.match(report.replace(/\s/g, ''), /60000krpermåned/);
  for (const priority of plan.priorities) { assert.ok(report.includes(priority.title));assert.ok(report.includes(priority.action)); }
  assert.match(report, /Oppdrag og krav: Klart/);
  assert.match(report, /Kandidatmarked og arbeidsgivertilbud: Delvis/);
  assert.match(report, /Strukturert intervju og vurdering: Ikke avklart/);
  assert.match(report, /Kandidatkommunikasjon og ansvar: Ikke vurdert/);
  assert.match(report, /INTERVJUGUIDE/);assert.match(report, /KANDIDATKOMMUNIKASJON/);
  for (const day of [30, 60, 90]) assert.ok(report.includes('INNEN ' + day + ' DAGER'));
  assert.equal(api.supportOptions.length, 3);
});

test('report does not turn missing context, zero salary or unchosen answers into facts', () => {
  const report = api.report({ salary: { measure: 'base', offeredMonthlyBase: 0 } });
  assert.match(report, /standardplan/);assert.match(report, /Oppgitt grunnlønn: Ikke oppgitt/);
  assert.doesNotMatch(report, /null|undefined|50\/100|8 av 8|0 kr per måned/);
  const otherMeasure = api.report({ salary: { measure: 'total', offeredMonthlyBase: 60000 } });
  assert.match(otherMeasure, /Oppgitt grunnlønn: Ikke oppgitt/);
  const injected = api.report({ selectedCompany: { name: 'Test\nFALSK STATUS\u0000', org: '123456789' } });
  assert.match(injected, /avdeling: Test FALSK STATUS\n/);
  assert.doesNotMatch(injected, /\u0000/);
});
