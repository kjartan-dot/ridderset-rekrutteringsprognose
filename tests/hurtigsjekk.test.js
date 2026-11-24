import test from 'node:test';
import assert from 'node:assert/strict';
import '../integrations/wordpress/ridderset-hurtigsjekk/core.js';

const { normalize, searchRoles, suggestRoles, nationalIndicator } = globalThis.RRHCore;
const roles = {
  '0110': ['Offiserer fra fenrik og høyere grad', 'offiser'],
  '1221': ['Salgs- og markedssjefer', 'salgsjef,salgssjef'],
  '1312': ['Ledere innen akvakultur mv.', 'lokalitetsleder'],
  '1321': ['Ledere av industriproduksjon', 'produksjonssjef'],
  '1323': ['Ledere av bygge- og anleggsvirksomhet', 'anleggsleder'],
  '2223': ['Sykepleiere', 'sykepleier'],
  '2341': ['Grunnskolelærere', 'lærer'],
  '2411': ['Revisorer, regnskapsrådgivere', 'revisor'],
  '2512': ['Programvareutviklere', 'utvikler'],
  '2522': ['Systemadministratorer', ''],
  '3112': ['Bygningsingeniører', 'byggingeniør'],
  '3113': ['Elkraftingeniører', 'elektroingeniør'],
  '3313': ['Regnskapsførere', 'regnskapsfører'],
  '3512': ['Brukerstøtte, IKT', ''],
  '4311': ['Regnskapsmedarbeidere', ''],
  '5321': ['Helsefagarbeidere', ''],
  '6221': ['Havbruksarbeidere', 'røkter,akvatekniker'],
  '7115': ['Tømrere og snekkere', 'tømrer,snekker'],
  '7233': ['Anleggsmaskin- og industrimekanikere', 'industrimekaniker'],
  '7411': ['Elektrikere', 'elektriker'],
  '8160': ['Operatører innen næringsmiddelproduksjon', 'fiskeindustri']
};
const row = (code, tightness, estimate = 100, extra = {}) => ({ code, tightness_percent: tightness,
  shortage_estimate: estimate, shortage_ci95_low: 50, shortage_ci95_high: 150, quality_flags: [], ...extra });
const dataset = occupations => ({ year: 2026, source: { publisher: 'NAV', title: 'Bedriftsundersøkelsen 2026' }, occupations });

test('Norwegian normalization and exact alias/code search preserve occupational identity', () => {
  assert.equal(normalize('  RØKTER / Ærlig–fag  '), 'rokter aerlig fag');
  assert.equal(normalize(null), '');
  assert.equal(searchRoles('salgsjef', roles)[0].code, '1221');
  assert.equal(searchRoles('røkter', roles)[0].code, '6221');
  assert.equal(searchRoles('TØMRER', roles)[0].code, '7115');
  assert.equal(searchRoles('0110', roles)[0].code, '0110');
  assert.deepEqual(searchRoles(' ', roles), []);
  assert.deepEqual(searchRoles('ingen slik stilling', roles), []);
});

test('exact alias outranks prefix, search is bounded and does not mutate the catalog', () => {
  const catalog = { ...roles, '9991': ['Salgsjef assistenter', ''],
    ...Object.fromEntries(Array.from({ length: 12 }, (_, index) => [String(9000 + index), [`Salg ${index}`, '']])) };
  const before = JSON.stringify(catalog);
  assert.equal(searchRoles('salgsjef', catalog)[0].code, '1221');
  assert.equal(searchRoles('salg', catalog).length, 8);
  assert.equal(JSON.stringify(catalog), before);
});

test('specific industry precedes generic manufacturing and construction', () => {
  const fish = suggestRoles({ naeringskode1: { kode: '10.203', beskrivelse: 'Frysing og videre bearbeiding av fisk' } }, roles);
  assert.deepEqual(fish.map(role => role.code), ['8160', '1321', '7233']);
  assert.equal(fish[0].kind, 'industry');
  assert.match(fish[0].reason, /Ikke en bekreftet stilling/);
  const electric = suggestRoles({ industry_code: '43.210', industry: 'Elektrisk installasjonsarbeid' }, roles);
  assert.equal(electric[0].code, '7411');
  const building = suggestRoles({ industryCode: '41.000', industryDescription: 'Oppføring av bygninger' }, roles);
  assert.equal(building[0].code, '7115');
});

test('SN2025 accounting codes are not interpreted as the old classification', () => {
  assert.equal(suggestRoles({ industry_code: '69.201' }, roles)[0].code, '2411');
  assert.equal(suggestRoles({ industry_code: '69.202' }, roles)[0].code, '3313');
  assert.equal(suggestRoles({ industry_code: '62.100' }, roles)[0].code, '2512');
  assert.equal(suggestRoles({ industry_code: '03.211' }, roles)[0].code, '6221');
});

test('company name, missing industry and holding entities never invent roles', () => {
  assert.deepEqual(suggestRoles({ navn: 'Elektro Havbruk Regnskap AS' }, roles), []);
  assert.deepEqual(suggestRoles({ navn: 'Nordlaks', industry_code: '64.220' }, roles), []);
  assert.deepEqual(suggestRoles({ industry: 'Holdingforetak i finanskonsern' }, roles), []);
  assert.deepEqual(suggestRoles({ industry_code: '70.100' }, roles), []);
  assert.deepEqual(suggestRoles({ industry_code: '35.150', industry: 'Handel med elektrisitet' }, roles), []);
  assert.deepEqual(suggestRoles({ industry_code: '99.000' }, roles), []);
  assert.deepEqual(suggestRoles(null, roles), []);
});

test('municipality uses registered organizational form and absent catalog entries are omitted', () => {
  const company = { naeringskode1: { kode: '84.110', beskrivelse: 'Generell offentlig administrasjon' }, organisasjonsform: { kode: 'KOMM' } };
  assert.deepEqual(suggestRoles(company, roles).map(role => role.code), ['2223', '5321', '2341']);
  assert.deepEqual(suggestRoles({ industry_code: '03.211' }, { '6221': roles['6221'] }).map(role => role.code), ['6221']);
  assert.deepEqual(suggestRoles({ industry_code: '03.211' }, {}), []);
});

test('national indicator inverts normalized tightness, not absolute shortage', () => {
  const data = dataset([row('1111', 1, 5000), row('2222', 4, 100), row('3333', 10, 50)]);
  assert.equal(nationalIndicator('1111', data).score, 10);
  assert.equal(nationalIndicator('3333', data).score, 1);
  const result = nationalIndicator('2222', data);
  assert.equal(result.score, 6);
  assert.equal(result.scope, 'national');
  assert.equal(result.sourceYear, 2026);
  assert.equal(result.referenceCount, 3);
  assert.deepEqual(result.comparison, { lower: 1, tied: 1 });
  assert.equal(result.tightnessPercent, 4);
  assert.equal(result.shortageEstimate, 100);
  assert.equal(result.source.publisher, 'NAV');
  assert.match(result.methodVersion, /midrank/);
});

test('equal tightness produces equal midrank scores independent of row order', () => {
  const rows = [row('1111', 1), row('2222', 4), row('3333', 4), row('4444', 10)];
  const before = JSON.stringify(rows);
  assert.equal(nationalIndicator('2222', dataset(rows)).score, nationalIndicator('3333', dataset([...rows].reverse())).score);
  assert.equal(nationalIndicator('2222', dataset(rows)).percentile, 0.5);
  assert.equal(JSON.stringify(rows), before);
});

test('unknown and rounded zero are never converted to a neutral or favorable score', () => {
  for (const invalid of [undefined, null, '', '5', false, NaN, Infinity, -1, 101]) {
    const result = nationalIndicator('1111', dataset([row('1111', invalid), row('2222', 2)]));
    assert.equal(result.status, 'unknown');
    assert.equal(result.score, null);
  }
  for (const item of [row('1111', 0), row('1111', 1, 0), row('1111', 100), row('1111', 1, null)]) {
    const result = nationalIndicator('1111', dataset([item, row('2222', 2)]));
    assert.equal(result.status, 'unknown');
    assert.equal(result.score, null);
  }
  assert.equal(nationalIndicator('9999', dataset([row('1111', 1)])).status, 'unknown');
  assert.equal(nationalIndicator('not-a-code', dataset([])).status, 'unknown');
});

test('reference population excludes uncertain zero and 100 percent but retains unmapped published occupations', () => {
  const data = dataset([row('1111', 1), row('2222', 4), row(null, 7), row('3333', 0.01, 0), row('4444', 100)]);
  const result = nationalIndicator('2222', data);
  assert.equal(result.referenceCount, 3);
  assert.equal(result.score, 6);
});

test('suppressed, duplicate, single-valued and nonnational datasets abstain', () => {
  assert.equal(nationalIndicator('1111', dataset([row('1111', 1, 100, { suppressed: true }), row('2222', 2)])).score, null);
  assert.equal(nationalIndicator('1111', dataset([row('1111', 1), row('1111', 2)])).score, null);
  assert.equal(nationalIndicator('1111', dataset([row('1111', 1)])).score, null);
  assert.equal(nationalIndicator('1111', dataset([row('1111', 1), row('2222', 1)])).score, null);
  assert.equal(nationalIndicator('1111', { ...dataset([row('1111', 1), row('2222', 2)]), scope: 'Troms' }).score, null);
});

test('duplicate occupation codes do not distort the comparison for other occupations', () => {
  const data = dataset([row('1111', 1), row('2222', 3), row('2222', 3.5), row('3333', 4), row(null, 5)]);
  const result = nationalIndicator('3333', data);
  assert.equal(result.referenceCount, 3);
  assert.deepEqual(result.comparison, { lower: 1, tied: 1 });
  assert.equal(result.score, 6);
});

test('suppressed and out-of-range evidence is withheld while published zero is preserved', () => {
  const suppressed = nationalIndicator('1111', dataset([row('1111', 1, 100, { published: false }), row('2222', 2)]));
  assert.equal(suppressed.tightnessPercent, null);
  assert.equal(suppressed.shortageEstimate, null);
  assert.equal(suppressed.ci95, null);

  const invalid = nationalIndicator('1111', dataset([row('1111', 101, -100, { shortage_ci95_low: 200 }), row('2222', 2)]));
  assert.equal(invalid.tightnessPercent, null);
  assert.equal(invalid.shortageEstimate, null);
  assert.equal(invalid.ci95, null);

  const roundedZero = nationalIndicator('1111', dataset([row('1111', 1, 0, { shortage_ci95_low: 0 }), row('2222', 2)]));
  assert.equal(roundedZero.status, 'unknown');
  assert.equal(roundedZero.shortageEstimate, 0);
});

test('confidence interval and evidence flags remain separate from the score', () => {
  const regular = dataset([row('1111', 1), row('2222', 2)]);
  const uncertain = dataset([row('1111', 1, 100, { shortage_ci95_low: 0, quality_flags: ['wide_interval'] }), row('2222', 2)]);
  const result = nationalIndicator('1111', uncertain);
  assert.equal(result.score, nationalIndicator('1111', regular).score);
  assert.deepEqual(result.ci95, { low: 0, high: 150 });
  assert.ok(result.evidenceFlags.includes('wide_interval'));
  assert.ok(result.evidenceFlags.includes('estimate_interval_includes_zero'));
  assert.deepEqual(uncertain.occupations[0].quality_flags, ['wide_interval']);
});
