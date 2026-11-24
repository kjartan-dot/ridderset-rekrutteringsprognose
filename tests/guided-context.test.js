import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const runtime = readFileSync(new URL('../integrations/wordpress/ridderset-hurtigsjekk/marked-guided.js', import.meta.url), 'utf8');
const catalog = { roles: { '3112': ['Bygningsingeniører', 'byggingeniør'], '2223': ['Sykepleiere', 'sykepleier'] },
  towns: { '5503': 'Harstad', '5501': 'Tromsø', '0301': 'Oslo' }, navMunicipalities: {} };

// These doubles implement only browser primitives used by the real runtime.
// State transitions, context validation and request scheduling remain in marked-guided.js.
class EventTargetDouble {
  listeners = new Map();
  addEventListener(type, callback) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(callback);
  }
  dispatchEvent(event) {
    for (const callback of this.listeners.get(event.type) || []) callback(event);
    return true;
  }
}

class NodeDouble extends EventTargetDouble {
  constructor(tagName = 'div') {
    super(); this.tagName = tagName.toUpperCase(); this.children = []; this.parentElement = null;
    this.dataset = {}; this.style = {}; this.attributes = {}; this._text = ''; this._value = '';
    this.hidden = false; this.disabled = false; this.className = ''; this.open = false;
  }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
  set textContent(value) { this._text = String(value); this.children = []; }
  get innerText() { return this.textContent; }
  get value() { return this._value; }
  set value(value) {
    value = String(value);
    this._value = this.tagName === 'SELECT' && !this.options.some(option => option.value === value) ? '' : value;
  }
  get options() { return this.querySelectorAll('option'); }
  get selectedOptions() { return this.options.filter(option => option.value === this.value); }
  append(...children) {
    for (const child of children) {
      const node = typeof child === 'string' ? Object.assign(new NodeDouble('#text'), { textContent: child }) : child;
      node.parentElement = this; this.children.push(node);
    }
  }
  replaceChildren(...children) {
    for (const child of this.children) child.parentElement = null;
    this.children = []; this._text = ''; this.append(...children);
    if (this.tagName === 'SELECT' && !this.options.some(option => option.value === this._value)) this._value = '';
  }
  before(node) {
    const parent = this.parentElement;
    node.parentElement = parent; parent.children.splice(parent.children.indexOf(this), 0, node);
  }
  replaceWith(node) {
    const parent = this.parentElement;
    if (!parent) return;
    node.parentElement = parent; parent.children.splice(parent.children.indexOf(this), 1, node); this.parentElement = null;
  }
  remove() { if (this.parentElement) this.parentElement.children.splice(this.parentElement.children.indexOf(this), 1); this.parentElement = null; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  setCustomValidity(message) { this.validationMessage = message; }
  querySelectorAll(selector) {
    const matches = node => selector.startsWith('.') ? node.className.split(/\s+/).includes(selector.slice(1))
      : selector === '[type=submit]' ? node.type === 'submit' : node.tagName === selector.toUpperCase();
    const found = [];
    for (const child of this.children) { if (matches(child)) found.push(child); found.push(...child.querySelectorAll(selector)); }
    return found;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
}

const tick = () => new Promise(resolve => setImmediate(resolve));
const option = (value, label) => { const node = new NodeDouble('option'); node.value = value; node.textContent = label; return node; };
const context = (revision = 1, town = '5503') => ({ version: 1, revision, source: 'rr-hurtigsjekk', manual: false,
  mainCompany: null, availableUnits: [],
  selectedCompany: { name: 'KUPA AS', org: '912345678', kind: 'enheter', town: '5503', townName: 'HARSTAD' },
  occupation: { code: '3112', name: 'Bygningsingeniører', searchTerm: 'byggingeniør' },
  workplace: { municipalityNumber: town, municipalityName: catalog.towns[town], countyCode: town.slice(0, 2) },
  salary: { offeredMonthlyBase: 65000, sector: 'ALLE', measure: 'base' } });

function harness({ initialContext = null, opened = false, guided = true } = {}) {
  const window = new EventTargetDouble(); window.__rrhContext = initialContext;
  const swift = new NodeDouble('section'); swift.dataset.guided = String(guided);
  const details = new NodeDouble('details'); details.open = opened;
  const root = new NodeDouble('section'); details.append(root);
  Object.assign(root.dataset, { api: 'https://example.test/market/', catalog: 'https://example.test/catalog.json',
    skills: 'https://example.test/skills/', education: 'https://example.test/education.json' });
  const form = new NodeDouble('form'); const fields = {};
  for (const name of ['company', 'term', 'town', 'role', 'offer', 'sector']) {
    fields[name] = new NodeDouble(['town', 'role', 'sector'].includes(name) ? 'select' : 'input');
    form.append(fields[name]);
  }
  fields.town.append(option('', 'Velg arbeidskommune')); fields.role.append(option('', 'Velg yrke'));
  for (const [value, label] of [['ALLE', 'Alle sektorer'], ['A+B+D+E', 'Privat'], ['6500', 'Kommune'], ['6100', 'Stat']]) fields.sector.append(option(value, label));
  fields.sector.value = 'ALLE';
  form.elements = fields;
  form.reportValidity = () => !Object.values(fields).some(field => field.validationMessage);
  const submit = new NodeDouble('button'); submit.type = 'submit'; form.append(submit);
  const status = new NodeDouble(); status.className = 'rr-ms-status';
  const results = new NodeDouble(); results.className = 'rr-ms-results'; results.hidden = true;
  const unitList = new NodeDouble(); unitList.className = 'rr-ms-unit-list';
  root.append(form, status, results, unitList);
  const document = { getElementById: id => id === 'markedssjekk' ? root : id === 'rr-hurtigsjekk' ? swift : null,
    createElement: tag => new NodeDouble(tag), createTextNode: text => Object.assign(new NodeDouble('#text'), { textContent: text }) };
  const requests = []; const timers = new Map(); let timerId = 0;
  const sandbox = { window, document, URL, URLSearchParams, Intl, AbortController, Blob,
    CustomEvent: class { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } },
    setTimeout(callback, delay) { const id = ++timerId; timers.set(id, { callback, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    fetch(url, options = {}) {
      let resolve, reject;
      const pending = new Promise((yes, no) => { resolve = yes; reject = no; });
      requests.push({ url: new URL(url), signal: options.signal, settled: false,
        resolve(data) { this.settled = true; resolve({ ok: true, json: async () => data }); },
        reject(error = new Error('source unavailable')) { this.settled = true; reject(error); } });
      return pending;
    } };
  vm.runInNewContext(runtime, sandbox, { filename: 'marked-guided.js' });
  return { window, details, root, form, fields, status, results, unitList, requests,
    emit(detail) { window.dispatchEvent({ type: 'rrh-context-changed', detail }); },
    async ready() { requests.find(request => request.url.pathname === '/catalog.json').resolve(catalog); await tick(); },
    async flushTimers() {
      const queued = [...timers]; timers.clear();
      for (const [, item] of queued) item.callback();
      await tick();
    },
    open() { details.open = true; details.dispatchEvent({ type: 'toggle' }); },
    jobs() { return requests.filter(request => request.url.pathname !== '/catalog.json'); },
    resolveJobs(jobs = this.jobs(), marker = 1) {
      for (const request of jobs.filter(item => !item.settled)) {
        const path = request.url.pathname;
        request.resolve(path.endsWith('/annonser') ? { coverage: request.url.searchParams.get('kommune') !== '0301',
          ads: marker, backfilled: true, employers: [], listings: [], checked_at: '2026-11-21T10:00:00Z' }
          : path.endsWith('/lonn') ? { base: 60000 + marker, total: 65000, year: 2025 }
            : path.endsWith('/pendling') ? { areas: [], year: 2025 } : {});
      }
    },
  };
}

test('latest context before catalog readiness survives, and collapsed details defer requests', async () => {
  const h = harness({ initialContext: context(1) });
  h.emit(context(2, '5501'));
  assert.equal(h.window.RRMarketContext.setContext(context(3, '0301')), false);
  h.emit(context(2, '5503')); // Older event must not replace the pending latest choice.
  await h.ready(); await h.flushTimers();
  assert.equal(h.form.hidden, true);
  assert.equal(h.fields.town.value, '0301');
  assert.equal(h.fields.role.value, '3112');
  assert.equal(h.jobs().length, 0);
  h.open(); await h.flushTimers();
  assert.equal(h.jobs().length, 4);
  assert.equal(h.jobs().find(request => request.url.pathname.endsWith('/annonser')).url.searchParams.get('kommune'), '0301');
});

test('company identity and selected workplace transfer without another company lookup or legacy takeover', async () => {
  const ctx = context(7, '5501');
  const h = harness({ initialContext: ctx, opened: true });
  await h.ready(); await h.flushTimers();
  const summary = h.root.querySelector('.rr-ms-context').textContent;
  assert.match(summary, /KUPA AS/); assert.match(summary, /912345678/); assert.match(summary, /Tromsø/);
  assert.equal(h.fields.company.value, 'KUPA AS');
  assert.equal(h.fields.town.value, '5501');
  assert.equal(ctx.selectedCompany.town, '5503');
  assert.equal(h.requests.some(request => /arbeidssteder|companies|units/.test(request.url.pathname)), false);
  h.window.dispatchEvent({ type: 'rrp-company-selected', detail: { name: 'Annen bedrift', organization_number: '999999999', municipality_number: '5503' } });
  assert.equal(h.fields.company.value, 'KUPA AS'); assert.equal(h.fields.town.value, '5501');
  assert.equal(h.unitList.children.length, 0);
});

test('duplicate choices and older revisions do not abort or repeat active requests', async () => {
  const ctx = context(9);
  const h = harness({ initialContext: ctx, opened: true });
  await h.ready(); await h.flushTimers();
  const active = h.jobs();
  h.emit(ctx); h.emit({ ...ctx, revision: 10 }); h.emit(context(8, '5501'));
  await h.flushTimers();
  assert.equal(h.jobs().length, 4);
  assert.equal(h.fields.town.value, '5503');
  assert.ok(active.every(request => !request.signal.aborted));
});

test('clearing context aborts requests and late responses cannot recreate previous results', async () => {
  const h = harness({ initialContext: context(), opened: true });
  await h.ready(); await h.flushTimers();
  const oldJobs = h.jobs();
  assert.equal(h.results.hidden, false);
  h.window.RRMarketContext.clearContext();
  assert.ok(oldJobs.every(request => request.signal.aborted));
  assert.equal(h.results.hidden, true);
  assert.equal(h.fields.role.value, ''); assert.equal(h.fields.town.value, '');
  h.resolveJobs(oldJobs, 999); await tick();
  assert.equal(h.results.hidden, true); assert.equal(h.results.textContent, '');
  assert.match(h.status.textContent, /Velg rolle og arbeidskommune/);
  assert.equal(h.status.textContent.includes('klar.'), false);
});

test('clearing context retains the revision boundary against a delayed older context event', async () => {
  const h = harness({ initialContext: context(10), opened: true });
  await h.ready(); await h.flushTimers();
  h.window.RRMarketContext.clearContext();
  h.emit(context(9, '5501')); await h.flushTimers();
  assert.equal(h.fields.role.value, '');
  assert.equal(h.fields.town.value, '');
  assert.equal(h.results.hidden, true);
  assert.equal(h.jobs().length, 4);
});

test('changing workplace protects new results from a previous request finishing late', async () => {
  const h = harness({ initialContext: context(1), opened: true });
  await h.ready(); await h.flushTimers();
  const oldJobs = h.jobs();
  h.emit(context(2, '5501')); await h.flushTimers();
  const newJobs = h.jobs().filter(request => !oldJobs.includes(request));
  assert.ok(oldJobs.every(request => request.signal.aborted));
  assert.equal(newJobs.length, 4);
  h.resolveJobs(oldJobs, 999); await tick();
  assert.match(h.results.textContent, /Tromsø/); assert.doesNotMatch(h.results.textContent, /999/);
  h.resolveJobs(newJobs, 2); await tick();
  assert.equal(h.status.textContent, 'Markedssjekken er klar.');
  assert.match(h.results.textContent, /Tromsø/); assert.doesNotMatch(h.results.textContent, /999/);
});

test('unknown role or municipality never selects a convenient default', async () => {
  const h = harness({ opened: true }); await h.ready();
  h.emit({ ...context(1), occupation: { code: '9999', name: 'Ukjent yrke', searchTerm: 'sykepleier' } });
  await h.flushTimers();
  assert.equal(h.fields.role.value, ''); assert.equal(h.jobs().length, 0);
  h.emit({ ...context(2), workplace: { municipalityNumber: '9999', municipalityName: 'Ukjent', countyCode: '99' } });
  await h.flushTimers();
  assert.equal(h.fields.town.value, ''); assert.equal(h.jobs().length, 0);
  assert.equal(h.results.hidden, true);
});

test('Oslo is retained with an explicit coverage explanation rather than changed to a northern municipality', async () => {
  const h = harness({ initialContext: context(1, '0301'), opened: true });
  await h.ready(); await h.flushTimers();
  assert.equal(h.fields.town.value, '0301');
  assert.match(h.root.querySelector('.rr-ms-context').textContent, /Annonsetall dekker Nordland, Troms og Finnmark/);
  for (const request of h.jobs().filter(item => item.url.searchParams.has('kommune'))) {
    assert.equal(request.url.searchParams.get('kommune'), '0301');
  }
  h.resolveJobs(); await tick();
  assert.match(h.results.textContent, /utlysninger i Oslo/);
  assert.equal(h.status.textContent, 'Markedssjekken er klar.');
});

test('a widget without the explicit guided attribute keeps the standalone form and legacy handoff', async () => {
  const h = harness({ guided: false, initialContext: context(), opened: true });
  await h.ready(); await h.flushTimers();
  assert.equal(h.form.hidden, false);
  assert.equal(h.window.RRMarketContext, undefined);
  assert.equal(h.jobs().length, 0);
  h.window.dispatchEvent({ type: 'rrp-company-selected', detail: { name: 'Legacybedrift', organization_number: '999999999', municipality_number: '5503' } });
  assert.match(h.unitList.textContent, /Bruk Legacybedrift i Harstad/);
});
