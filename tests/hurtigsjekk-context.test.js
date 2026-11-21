import test from 'node:test';
import assert from 'node:assert/strict';
import '../integrations/wordpress/ridderset-hurtigsjekk/context.js';

const { create, serialize, restore } = globalThis.RRHContext;
const catalog = { roles: { '0123': ['Testyrke med innledende null', ''], '2223': ['Sykepleiere', 'sykepleier'] },
  towns: { '5503': 'Harstad', '5501': 'Tromsø', '0301': 'Oslo' } };
const main = { name: 'Testbedrift AS', org: '987654321', kind: 'enheter', employees: null,
  town: '5503', townName: 'HARSTAD', address: 'Registrert hovedadresse', industryCode: '71.121',
  industry: 'Byggeteknisk konsulentvirksomhet', retrievedAt: '2026-11-21T10:00:00Z' };
const unit = { name: 'Avdeling Tromsø', org: '912345678', kind: 'underenheter', parent: main.org,
  employees: 0, town: '5501', townName: 'TROMSØ', address: 'Registrert avdelingsadresse' };
const state = () => ({ company: main, main, units: [unit], role: { code: '0123', label: 'Et eldre navn',
  kind: 'industry', searchTerm: 'fagrolle' }, town: '0301', nav: { count: 91 }, pay: { median: 80000 }, indicator: { score: 9 } });
const input = overrides => ({ state: state(), catalog, revision: 4, sector: 'ALLE', offeredMonthlyBase: '65000', ...overrides });
const now = Date.UTC(2026, 10, 21, 12);

test('handoff preserves separate registered address and explicitly selected workplace without mutation', () => {
  const source = input();
  const before = JSON.stringify(source);
  const context = create(source);
  assert.equal(context.selectedCompany.town, '5503');
  assert.equal(context.selectedCompany.townName, 'HARSTAD');
  assert.equal(context.selectedCompany.address, 'Registrert hovedadresse');
  assert.deepEqual(context.workplace, { municipalityNumber: '0301', municipalityName: 'Oslo', countyCode: '03' });
  assert.deepEqual(context.salary, { offeredMonthlyBase: 65000, sector: 'ALLE', measure: 'base' });
  assert.equal(context.occupation.code, '0123');
  assert.equal(context.occupation.name, catalog.roles['0123'][0]);
  assert.equal(context.occupation.kind, 'industry');
  assert.equal(context.occupation.searchTerm, 'fagrolle');
  assert.equal(JSON.stringify(source), before);
  context.selectedCompany.name = 'Changed copy';
  context.availableUnits[0].name = 'Changed unit copy';
  assert.equal(main.name, 'Testbedrift AS');
  assert.equal(unit.name, 'Avdeling Tromsø');
});

test('direct underenhet keeps its known parent number without inventing a main company', () => {
  const context = create(input({ state: { company: unit, main: unit, units: [], town: '5501', role: null } }));
  assert.equal(context.mainCompany, null);
  assert.equal(context.selectedCompany.parent, main.org);
  assert.equal(context.selectedCompany.org, unit.org);
  assert.equal(context.selectedCompany.employees, 0);
  assert.deepEqual(restore(serialize(context, now), catalog, now), context);
});

test('selected unit retains a verified main company and independent workplace choice', () => {
  const context = create(input({ state: { company: unit, main, units: [unit], town: '0301', role: null } }));
  assert.equal(context.mainCompany.org, main.org);
  assert.equal(context.selectedCompany.town, '5501');
  assert.equal(context.workplace.municipalityNumber, '0301');
  assert.equal(context.mainCompany.employees, null);
});

test('manual and incomplete selections round trip without filling in defaults as observations', () => {
  const context = create(input({ state: { company: null, main: null, units: [], role: null, town: '' }, manual: true,
    offeredMonthlyBase: '', sector: '6500' }));
  assert.equal(context.manual, true);
  assert.equal(context.occupation, null);
  assert.equal(context.selectedCompany, null);
  assert.deepEqual(context.workplace, { municipalityNumber: null, municipalityName: null, countyCode: null });
  assert.equal(context.salary.offeredMonthlyBase, null);
  assert.deepEqual(restore(serialize(context, now), catalog, now + 1000), context);
});

test('serialization removes computed values even if a caller attaches them to the handoff', () => {
  const context = create(input());
  Object.assign(context, { nav: { count: 9 }, pay: { median: 90000 }, score: 8,
    worklife: { index: 99 }, results: ['old result'] });
  context.selectedCompany.score = 8;
  context.occupation.nav = { count: 9 };
  context.salary.benchmark = 80000;
  const raw = serialize(context, now);
  for (const forbidden of ['"nav"', '"pay"', '"score"', '"worklife"', '"results"', '"benchmark"']) {
    assert.equal(raw.includes(forbidden), false, forbidden);
  }
  const restored = restore(raw, catalog, now);
  assert.equal(restored.occupation.code, '0123');
  assert.equal(restored.salary.offeredMonthlyBase, 65000);
});

test('restore rejects expired, future, malformed and incompatible session envelopes', () => {
  const context = create(input());
  const raw = serialize(context, now);
  assert.ok(restore(raw, catalog, now + 8 * 3600000 - 1));
  assert.equal(restore(raw, catalog, now + 8 * 3600000), null);
  assert.equal(restore(raw, catalog, now - 1), null);
  for (const malformed of [null, '', '{', 'null', '[]', '{}']) assert.equal(restore(malformed, catalog, now), null);
  const changed = (key, value) => { const item = JSON.parse(raw); item[key] = value; return JSON.stringify(item); };
  assert.equal(restore(changed('version', 2), catalog, now), null);
  assert.equal(restore(changed('savedAt', String(now)), catalog, now), null);
  assert.equal(restore(changed('context', { ...context, version: 2 }), catalog, now), null);
  assert.equal(restore(changed('context', { ...context, source: 'other-widget' }), catalog, now), null);
});

test('restore validates current catalog identities and reconstructs their canonical names', () => {
  const context = create(input());
  const raw = serialize(context, now);
  assert.equal(restore(raw, { ...catalog, roles: {} }, now), null);
  assert.equal(restore(raw, { ...catalog, towns: {} }, now), null);
  const changed = JSON.parse(raw);
  changed.context.occupation.name = 'Injected old name';
  changed.context.workplace.municipalityName = 'Incorrect town';
  changed.context.workplace.countyCode = '99';
  const restored = restore(JSON.stringify(changed), catalog, now);
  assert.equal(restored.occupation.name, catalog.roles['0123'][0]);
  assert.equal(restored.workplace.municipalityName, 'Oslo');
  assert.equal(restored.workplace.countyCode, '03');
});

test('invalid identities, unrelated parents and invalid salary never persist as a plausible context', () => {
  assert.equal(create(input({ state: { ...state(), role: { code: 123, label: 'Test' } } })), null);
  assert.equal(create(input({ state: { ...state(), role: { code: '9999', label: 'Test' } } })), null);
  assert.equal(create(input({ state: { ...state(), town: '9999' } })), null);
  assert.equal(create(input({ state: { ...state(), company: { ...main, org: 987654321 } } })), null);
  assert.equal(create(input({ state: { ...state(), company: { ...main, kind: 'company' } } })), null);
  assert.equal(create(input({ state: { ...state(), company: { ...unit, parent: '900000001' } } })), null);
  for (const offeredMonthlyBase of [-1, 0, Infinity, 'not a salary', 10000000]) {
    assert.equal(create(input({ offeredMonthlyBase })), null);
  }
  assert.equal(create(input({ sector: 'UNKNOWN' })), null);
  assert.throws(() => serialize(null, now), TypeError);
});
