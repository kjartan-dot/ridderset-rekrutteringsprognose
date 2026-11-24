/* Pure helpers shared by the WordPress widget and the Node test suite. */
(function (root) {
  'use strict';

  const METHOD_VERSION = 'rr-national-tightness-midrank-1.1';
  const REFERENCE = 'Publiserte yrker med positivt mangelanslag og stramhet over 0 og under 100 prosent, uten tvetydige yrkeskoder.';

  function normalize(value) {
    return String(value ?? '').toLocaleLowerCase('nb-NO')
      .replace(/æ/g, 'ae').replace(/ø/g, 'o').normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function catalogEntries(roles) {
    if (!roles || typeof roles !== 'object') return [];
    return Object.entries(roles).filter(([code, entry]) => /^\d{4}$/.test(code)
      && Array.isArray(entry) && typeof entry[0] === 'string' && entry[0].trim())
      .map(([code, entry]) => ({ code, label: entry[0], aliases: String(entry[1] ?? '').split(',').map(normalize).filter(Boolean) }));
  }

  function searchRoles(query, roles) {
    const term = normalize(query);
    if (!term) return [];
    const words = term.split(' ');
    return catalogEntries(roles).map(role => {
      const label = normalize(role.label);
      const names = [label, ...role.aliases];
      let rank = 0;
      if (role.code === term) rank = 100;
      else if (label === term) rank = 95;
      else if (role.aliases.includes(term)) rank = 90;
      else if (/^\d+$/.test(term) && role.code.startsWith(term)) rank = 80;
      else if (names.some(name => name.startsWith(term))) rank = 70;
      else if (names.some(name => words.every(word => name.split(' ').includes(word)))) rank = 60;
      else if (names.some(name => name.includes(term))) rank = 50;
      else if (names.some(name => words.every(word => name.includes(word)))) rank = 40;
      return { code: role.code, label: role.label, rank };
    }).filter(role => role.rank > 0)
      .sort((a, b) => b.rank - a.rank || a.label.localeCompare(b.label, 'nb-NO') || a.code.localeCompare(b.code))
      .slice(0, 8).map(({ code, label }) => ({ code, label }));
  }

  function suggestRoles(company, catalogRoles) {
    if (!company || typeof company !== 'object') return [];
    const industry = company.naeringskode1 || {};
    const rawCode = String(industry.kode ?? company.industry_code ?? company.industryCode ?? '').trim();
    const code = /^\d{2}(?:[.,]?\d{1,3})?$/.test(rawCode) ? rawCode.replace(/[.,]/g, '') : '';
    const description = String(industry.beskrivelse ?? company.industry_description ?? company.industryDescription
      ?? (typeof company.industry === 'string' ? company.industry : '')).trim();
    const text = normalize(description);
    const division = code ? Number(code.slice(0, 2)) : null;
    const starts = prefix => code.startsWith(prefix);
    const orgType = company.organisasjonsform?.kode ?? company.organization_type_code ?? '';

    // Names, registered headcount and geography are deliberately not used to infer occupations.
    if (starts('642') || starts('701') || /\bholding|hovedkontor|konsernledelse/.test(text)) return [];
    let selected;
    if (starts('032') || /akvakultur|havbruk|fiskeoppdrett|settefisk|matfisk/.test(text)) {
      selected = ['6221', '1312', '7233'];
    } else if (starts('102') || /fiskeindustri|(?:bearbeiding|konservering|slakting).*fisk/.test(text)) {
      selected = ['8160', '1321', '7233'];
    } else if (starts('4321') || /elektrisk.*installasjon|elektroinstallasjon/.test(text)) {
      selected = ['7411', '3113', '1323'];
    } else if (starts('43221') || /rorlegger/.test(text)) {
      selected = ['7126', '1323', '3112'];
    } else if ((division >= 41 && division <= 43) || /oppforing av bygninger|bygge.*anleggs|tomrer/.test(text)) {
      selected = ['7115', '1323', '3112'];
    } else if (starts('71121') || /byggeteknisk konsulent/.test(text)) {
      selected = ['3112', '2142', '1323'];
    } else if (starts('7112') || /teknisk konsulent|ingeniortjenester/.test(text)) {
      selected = ['3119', '3115', '2142'];
    } else if (division === 35 || /produksjon.*elektrisitet|distribusjon.*elektrisitet|kraftproduksjon/.test(text)) {
      // Power trading is not evidence of technical production occupations.
      if (starts('3515') || starts('3523') || starts('354') || /handel|megler|agent/.test(text)) return [];
      selected = ['3113', '2151', '3131'];
    } else if ((division >= 10 && division <= 33) || /industriproduksjon/.test(text)) {
      selected = ['7233', '1321', '3139'];
    } else if (division === 62 || /dataprogrammering|it konsulent|informasjonsteknologi/.test(text)) {
      selected = ['2512', '2522', '3512'];
    } else if (starts('69201') || /\brevisjon\b/.test(text)) {
      selected = ['2411', '3313', '4311'];
    } else if (starts('692') || /regnskapsforing|bokforing|skatteradgivning/.test(text)) {
      selected = ['3313', '2411', '4311'];
    } else if (division === 78 || /rekruttering|personaladministrasjon|arbeidskrafttjenester/.test(text)) {
      selected = ['2423', '1212', '4110'];
    } else if (division === 50 || /sjotransport/.test(text)) {
      selected = ['8350', '3152', '1324'];
    } else if (starts('493') || /busstransport|rutebiltransport/.test(text)) {
      selected = ['8331', '4323', '1324'];
    } else if (division === 52 || /lagring|logistikk/.test(text)) {
      selected = ['4321', '4323', '1324'];
    } else if (starts('494') || /godstransport.*veg|godstransport.*vei/.test(text)) {
      selected = ['8332', '4323', '1324'];
    } else if (starts('8411') || /generell offentlig administrasjon|kommunal administrasjon/.test(text)) {
      selected = orgType === 'KOMM' || /kommunal|kommune/.test(text)
        ? ['2223', '5321', '2341'] : ['2422', '4110', '1212'];
    } else {
      return [];
    }
    const catalog = new Map(catalogEntries(catalogRoles).map(role => [role.code, role.label]));
    const basis = description || (code ? `næringskode ${rawCode}` : 'registrert bransje');
    return [...new Set(selected)].filter(roleCode => catalog.has(roleCode)).slice(0, 3)
      .map(roleCode => ({ code: roleCode, label: catalog.get(roleCode), kind: 'industry',
        reason: `Bransjeforslag ut fra ${basis}. Ikke en bekreftet stilling eller et kjent rekrutteringsbehov.` }));
  }

  function nationalIndicator(code, dataset) {
    const rows = Array.isArray(dataset?.occupations) ? dataset.occupations : [];
    const sourceYear = Number.isInteger(dataset?.year) && dataset.year > 0 ? dataset.year : null;
    const common = { methodVersion: METHOD_VERSION, scope: 'national', source: dataset?.source ?? null,
      sourceYear, referenceDefinition: REFERENCE, referenceCount: 0, score: null, tightnessPercent: null,
      shortageEstimate: null, ci95: null, evidenceFlags: [] };
    const unknown = (reason, extra = {}) => ({ ...common, status: 'unknown', reason, ...extra, score: null });
    if (dataset?.scope && !['national', 'NO', 'Norge', 'Hele landet'].includes(dataset.scope)) {
      return unknown('Datakilden er ikke nasjonal og kan ikke brukes i denne indikatoren.', { source: null, sourceYear: null });
    }
    if (!/^\d{4}$/.test(String(code ?? ''))) return unknown('Velg et yrke med en gyldig STYRK08-kode.');
    const occupationCode = row => String(row?.code ?? row?.styrk08 ?? '');
    const matches = rows.filter(row => occupationCode(row) === String(code));
    if (!matches.length) return unknown('Vi mangler et publisert mangelanslag for dette yrket.');
    if (matches.length > 1) return unknown('Yrket har flere rader i datakilden. Grunnlaget må avklares før vi viser en indikator.');

    const row = matches[0];
    const suppressed = item => item.suppressed === true || item.published === false
      || (Array.isArray(item.quality_flags) && item.quality_flags.some(flag => /suppressed|not_published|missing|unreliable/i.test(flag)));
    if (suppressed(row)) return unknown('Tallgrunnlaget er undertrykt eller merket som utilgjengelig.');

    const rawTightness = row.tightness_percent ?? row.shortage_percent;
    const rawEstimate = row.shortage_estimate;
    const { shortage_ci95_low: low, shortage_ci95_high: high } = row;
    const flags = Array.isArray(row.quality_flags) ? row.quality_flags.filter(flag => typeof flag === 'string') : [];
    const finite = value => typeof value === 'number' && Number.isFinite(value);
    const tightness = finite(rawTightness) && rawTightness >= 0 && rawTightness <= 100 ? rawTightness : null;
    const estimate = finite(rawEstimate) && rawEstimate >= 0 ? rawEstimate : null;
    const evidence = {
      tightnessPercent: tightness,
      shortageEstimate: estimate,
      ci95: estimate !== null && finite(low) && finite(high) && low >= 0 && high >= low ? { low, high } : null,
      evidenceFlags: [...flags]
    };
    if (tightness === null || estimate === null) {
      return unknown('Datakilden mangler et gyldig tallgrunnlag for dette yrket.', evidence);
    }
    if (tightness === 0 || estimate === 0) {
      return unknown('Et publisert nullanslag er ikke tilstrekkelig til å tolke mangelpresset for dette yrket.', evidence);
    }
    if (tightness === 100) {
      return unknown('Stramhet på 100 prosent gir et usikkert sammenligningsgrunnlag. Vi viser ikke en skår.', evidence);
    }

    const countsByCode = new Map();
    for (const item of rows) {
      const mappedCode = occupationCode(item);
      if (/^\d{4}$/.test(mappedCode)) countsByCode.set(mappedCode, (countsByCode.get(mappedCode) ?? 0) + 1);
    }
    // Unmapped published occupations remain eligible. Ambiguous mapped codes contribute no observations.
    const comparable = rows.filter(item => {
      if (!item || suppressed(item) || countsByCode.get(occupationCode(item)) > 1) return false;
      const value = item.tightness_percent ?? item.shortage_percent;
      return finite(value) && value > 0 && value < 100
        && finite(item.shortage_estimate) && item.shortage_estimate > 0;
    }).map(item => item.tightness_percent ?? item.shortage_percent);
    const referenceCount = comparable.length;
    if (referenceCount < 2 || new Set(comparable).size < 2) {
      return unknown('Det er for få ulike publiserte sammenligningsverdier til å beregne en relativ indikator.', { ...evidence, referenceCount });
    }
    const lower = comparable.filter(value => value < tightness).length;
    const tied = comparable.filter(value => value === tightness).length;
    // Zero-based average rank, scaled from 0 to 1. Equal values receive equal scores.
    const percentile = (lower + (tied - 1) / 2) / (referenceCount - 1);
    const score = Math.max(1, Math.min(10, Math.round(10 - 9 * percentile)));
    if (evidence.ci95?.low === 0 && !evidence.evidenceFlags.includes('estimate_interval_includes_zero')) {
      evidence.evidenceFlags.push('estimate_interval_includes_zero');
    }
    return { ...common, ...evidence, status: 'available', score, referenceCount, percentile, comparison: { lower, tied },
      reason: 'Relativt nasjonalt mangelpress blant yrker med et brukbart publisert mangelanslag. 1 betyr mer press, 10 betyr mindre press. Indikatoren sier ikke hvor mange kandidater bedriften vil få.' };
  }

  const api = Object.freeze({ normalize, suggestRoles, searchRoles, nationalIndicator });
  root.RRHCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
