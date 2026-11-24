/* Input-only handoff and tab-session persistence. No network or storage side effects. */
(function (root) {
  'use strict';

  const VERSION = 1;
  const SOURCE = 'rr-hurtigsjekk';
  const TTL = 8 * 60 * 60 * 1000;
  const SECTORS = new Set(['ALLE', 'A+B+D+E', '6500', '6100']);
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const fail = () => { throw new TypeError('Invalid recruitment context'); };
  const require = condition => { if (!condition) fail(); };

  function text(value, max = 400) {
    if (value === undefined || value === null) return '';
    require(typeof value === 'string' && value.length <= max);
    return value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function code(value, length, optional = false) {
    if (optional && (value === undefined || value === null || value === '')) return null;
    require(typeof value === 'string' && new RegExp('^\\d{' + length + '}$').test(value));
    return value;
  }

  function company(value) {
    if (value === null || value === undefined) return null;
    require(record(value));
    const org = code(value.org, 9);
    require(value.kind === 'enheter' || value.kind === 'underenheter');
    const name = text(value.name);
    require(Boolean(name));
    const employees = value.employees === undefined ? null : value.employees;
    require(employees === null || (Number.isSafeInteger(employees) && employees >= 0));
    const retrieved = value.retrievedAt === undefined || value.retrievedAt === null || value.retrievedAt === ''
      ? null : text(value.retrievedAt, 40);
    require(retrieved === null || Number.isFinite(Date.parse(retrieved)));
    return {
      name, org,
      industryCode: text(value.industryCode, 20),
      industry: text(value.industry),
      organization_type_code: text(value.organization_type_code, 20),
      employees,
      town: code(value.town, 4, true),
      townName: text(value.townName, 100),
      address: text(value.address, 1000),
      kind: value.kind,
      parent: code(value.parent, 9, true),
      source: 'Brønnøysundregistrene / Enhetsregisteret',
      sourceUrl: 'https://data.brreg.no/enhetsregisteret/api/' + value.kind + '/' + org,
      retrievedAt: retrieved,
    };
  }

  function salary(value) {
    require(record(value) && SECTORS.has(value.sector) && value.measure === 'base');
    let offered = value.offeredMonthlyBase;
    if (offered === undefined || offered === null || offered === '') offered = null;
    else if (typeof offered === 'string') {
      require(/^\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(offered.trim()));
      offered = Number(offered);
    }
    require(offered === null || (typeof offered === 'number' && Number.isFinite(offered) && offered > 0 && offered <= 9999999));
    return { offeredMonthlyBase: offered, sector: value.sector, measure: 'base' };
  }

  function sanitize(value, catalog) {
    require(record(value) && value.version === VERSION && value.source === SOURCE);
    require(Number.isSafeInteger(value.revision) && value.revision >= 0 && typeof value.manual === 'boolean');
    if (catalog !== null) require(record(catalog) && record(catalog.roles) && record(catalog.towns));
    const selectedCompany = company(value.selectedCompany);
    let mainCompany = company(value.mainCompany);
    // A selected unit is a real unit, not a fabricated object representing its parent.
    if (mainCompany && mainCompany.kind !== 'enheter') mainCompany = null;
    if (selectedCompany?.kind === 'enheter') {
      require(!mainCompany || mainCompany.org === selectedCompany.org);
      mainCompany = mainCompany || company(selectedCompany);
    }
    if (selectedCompany?.kind === 'underenheter' && mainCompany && selectedCompany.parent) {
      require(selectedCompany.parent === mainCompany.org);
    }
    require(selectedCompany !== null || mainCompany === null);
    require(Array.isArray(value.availableUnits) && value.availableUnits.length <= 100);
    const availableUnits = value.availableUnits.map(item => {
      const unit = company(item);
      require(unit !== null && unit.kind === 'underenheter');
      if (mainCompany && unit.parent) require(unit.parent === mainCompany.org);
      return unit;
    });
    require(new Set(availableUnits.map(unit => unit.org)).size === availableUnits.length);
    require(selectedCompany !== null || availableUnits.length === 0);

    let occupation = null;
    if (value.occupation !== null) {
      require(record(value.occupation));
      const roleCode = code(value.occupation.code, 4);
      let name = text(value.occupation.name);
      if (catalog !== null) {
        require(own(catalog.roles, roleCode) && Array.isArray(catalog.roles[roleCode]));
        name = text(catalog.roles[roleCode][0]);
      }
      require(Boolean(name));
      occupation = { code: roleCode, name, searchTerm: text(value.occupation.searchTerm, 200) };
      if (value.occupation.kind !== undefined && value.occupation.kind !== null && value.occupation.kind !== '') {
        const kind = text(value.occupation.kind, 40);
        require(/^[a-z][a-z0-9_-]*$/i.test(kind));
        occupation.kind = kind;
      }
    }

    require(record(value.workplace));
    const municipalityNumber = code(value.workplace.municipalityNumber, 4, true);
    let municipalityName = null;
    if (municipalityNumber !== null) {
      if (catalog !== null) {
        require(own(catalog.towns, municipalityNumber));
        municipalityName = text(catalog.towns[municipalityNumber], 100);
      } else municipalityName = text(value.workplace.municipalityName, 100);
      require(Boolean(municipalityName));
    }
    const workplace = { municipalityNumber, municipalityName,
      countyCode: municipalityNumber === null ? null : municipalityNumber.slice(0, 2) };

    return { version: VERSION, revision: value.revision, source: SOURCE,
      mainCompany, selectedCompany, availableUnits, occupation, workplace,
      salary: salary(value.salary), manual: value.manual };
  }

  function create({ state, catalog, sector = 'ALLE', offeredMonthlyBase = null,
    searchTerm, revision = 0, manual = false } = {}) {
    try {
      require(record(state) && catalog !== null && catalog !== undefined);
      const role = state.role;
      return sanitize({ version: VERSION, revision, source: SOURCE,
        mainCompany: state.main || null, selectedCompany: state.company || null,
        availableUnits: state.units === undefined ? [] : state.units,
        occupation: role === undefined || role === null ? null : {
          code: role.code, name: role.label,
          searchTerm: searchTerm === undefined ? role.searchTerm : searchTerm,
          kind: role.kind,
        },
        workplace: { municipalityNumber: state.town },
        salary: { offeredMonthlyBase, sector, measure: 'base' }, manual,
      }, catalog);
    } catch { return null; }
  }

  function serialize(context, now = Date.now()) {
    require(Number.isSafeInteger(now) && now >= 0);
    const inputs = sanitize(context, null);
    return JSON.stringify({ version: VERSION, savedAt: now, context: inputs });
  }

  function restore(raw, catalog, now = Date.now()) {
    try {
      require(typeof raw === 'string' && raw.length <= 256000);
      require(Number.isSafeInteger(now) && now >= 0 && catalog !== null && catalog !== undefined);
      const saved = JSON.parse(raw);
      require(record(saved) && saved.version === VERSION && Number.isSafeInteger(saved.savedAt));
      require(saved.savedAt >= 0 && now >= saved.savedAt && now - saved.savedAt < TTL);
      return sanitize(saved.context, catalog);
    } catch { return null; }
  }

  const api = Object.freeze({ create, serialize, restore });
  root.RRHContext = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
