import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const plugin = new URL('../integrations/wordpress/ridderset-hurtigsjekk/', import.meta.url);
const brreg = 'https://data.brreg.no/enhetsregisteret/api/';
const market = 'https://ridderset.no/wp-json/ridderset-marked/v1/';
const cache = new Map();
const clean = (value, max = 250) => typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, max) : '';

export function normalizeCompany(row, kind, retrievedAt = new Date().toISOString()) {
  if (!row || row.slettedato || row.nedleggelsesdato || !/^\d{9}$/.test(String(row.organisasjonsnummer)) || !row.navn) return null;
  const address = (kind === 'underenheter' ? row.beliggenhetsadresse : row.forretningsadresse) || {};
  const industry = row.naeringskode1 || {};
  const lines = Array.isArray(address.adresse) ? address.adresse.map(x => clean(x)) : [];
  lines.push([clean(address.postnummer), clean(address.poststed)].filter(Boolean).join(' '));
  return {
    name: clean(row.navn), org: String(row.organisasjonsnummer),
    industryCode: clean(industry.kode, 20), industry: clean(industry.beskrivelse, 400),
    organization_type_code: clean(row.organisasjonsform?.kode, 20),
    employees: row.harRegistrertAntallAnsatte !== false && Number.isInteger(row.antallAnsatte) && row.antallAnsatte >= 0 ? row.antallAnsatte : null,
    town: /^\d{4}$/.test(String(address.kommunenummer)) ? String(address.kommunenummer) : null,
    townName: clean(address.kommune, 100), address: lines.filter(Boolean).join(', '),
    kind, parent: /^\d{9}$/.test(String(row.overordnetEnhet)) ? String(row.overordnetEnhet) : null,
    source: 'Brønnøysundregistrene / Enhetsregisteret', sourceUrl: brreg + kind + '/' + row.organisasjonsnummer,
    retrievedAt,
  };
}

async function readJson(url, {kind, ttl = 300000, timeoutMs = 8000, fetcher = fetch} = {}) {
  const key = String(url), hit = cache.get(key);
  if (hit && hit.until > Date.now()) return hit.data;
  const media = kind ? `application/vnd.brreg.enhetsregisteret.${kind === 'underenheter' ? 'underenhet' : 'enhet'}.v2+json` : 'application/json';
  const response = await fetcher(url, {signal: AbortSignal.timeout(timeoutMs), redirect: 'error', headers: {Accept: media}});
  if (response.status === 404 || response.status === 410) return {missing: true};
  if (!response.ok) throw Object.assign(new Error('source-unavailable'), {status: response.status === 429 ? 429 : 503});
  const text = await response.text();
  if (text.length > 2 * 1024 * 1024) throw new Error('source-size');
  const body = JSON.parse(text);
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('source-format');
  const data = {body, retrievedAt: new Date().toISOString()};
  if (cache.size >= 300) cache.delete(cache.keys().next().value);
  cache.set(key, {data, until: Date.now() + ttl});
  return data;
}

function companyList(data, kind, direct = false) {
  if (data.missing) return {companies: [], hasMore: false};
  if ((direct && !data.body.organisasjonsnummer) || (!direct && !data.body._embedded?.[kind] && data.body.page?.totalElements !== 0)) throw new Error('source-format');
  const rows = direct ? [data.body] : data.body._embedded?.[kind] || [];
  if (!Array.isArray(rows)) throw new Error('source-format');
  return {companies: rows.map(x => normalizeCompany(x, kind, data.retrievedAt)).filter(Boolean), hasMore: !direct && (data.body.page?.totalElements || rows.length) > rows.length};
}

export async function searchCompanies(query, kind = 'enheter', fetcher = fetch) {
  if (typeof query !== 'string' || query.trim().length < 2 || query.length > 100 || !['enheter', 'underenheter'].includes(kind)) throw Object.assign(new Error('invalid-query'), {status: 400});
  query = query.trim();
  const number = query.replace(/\s+/g, '');
  if (/^\d{9}$/.test(number)) {
    let data = await readJson(brreg + kind + '/' + number, {kind, fetcher});
    if (data.missing && kind === 'enheter') {
      kind = 'underenheter';
      data = await readJson(brreg + kind + '/' + number, {kind, fetcher});
    }
    return companyList(data, kind, true);
  }
  const url = new URL(brreg + kind);
  url.search = new URLSearchParams({navn: query, size: '12'});
  return companyList(await readJson(url, {kind, fetcher}), kind);
}

export async function companyUnits(org, fetcher = fetch) {
  if (!/^\d{9}$/.test(org)) throw Object.assign(new Error('invalid-org'), {status: 400});
  const url = new URL(brreg + 'underenheter');
  url.search = new URLSearchParams({overordnetEnhet: org, size: '100'});
  return companyList(await readJson(url, {kind: 'underenheter', fetcher}), 'underenheter');
}

function marketParams(route, params) {
  const out = new URLSearchParams();
  if (route === 'annonser' || route === 'pendling') {
    const town = params.get('kommune') || '';
    if (!/^\d{4}$/.test(town)) throw Object.assign(new Error('invalid-town'), {status: 400});
    out.set('kommune', town);
  }
  if (route === 'annonser') {
    const term = (params.get('q') || '').trim();
    if (term.length < 3 || term.length > 80) throw Object.assign(new Error('invalid-term'), {status: 400});
    out.set('q', term);
  }
  if (route === 'lonn') {
    const code = params.get('yrke') || '', sector = params.get('sektor') || 'ALLE';
    if (!/^\d{4}$/.test(code) || !['ALLE', 'A+B+D+E', '6500', '6100'].includes(sector)) throw Object.assign(new Error('invalid-salary'), {status: 400});
    out.set('yrke', code); out.set('sektor', sector);
  }
  return out;
}

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'",
};
const assetTypes = {'js': 'text/javascript', 'css': 'text/css', 'json': 'application/json', 'svg': 'image/svg+xml', 'png': 'image/png'};
export const journeyStyles = ['style.css', 'journey.css'];
export const journeyScripts = ['core.js', 'context.js', 'front.js', 'context-bridge.js', 'process-plan.js', 'journey.js'];

export function makeServer() {
  return http.createServer(async (request, response) => {
    const json = (status, value) => {
      response.writeHead(status, {...securityHeaders, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store'});
      response.end(JSON.stringify(value));
    };
    if (request.method !== 'GET') return json(405, {error: 'Kun GET er tillatt.'});
    try {
      const url = new URL(request.url, 'http://localhost');
      if (url.pathname === '/api/companies') return json(200, await searchCompanies(url.searchParams.get('q'), url.searchParams.get('kind') || 'enheter'));
      if (url.pathname === '/api/units') return json(200, await companyUnits(url.searchParams.get('org') || ''));
      const marketMatch = url.pathname.match(/^\/market\/(annonser|lonn|pendling)$/);
      if (marketMatch) {
        const target = new URL(market + marketMatch[1]);
        target.search = marketParams(marketMatch[1], url.searchParams);
        const data = await readJson(target, {ttl: marketMatch[1] === 'annonser' ? 60000 : 300000, timeoutMs: 20000});
        if (data.missing) return json(503, {error: 'Markedskilden er utilgjengelig.'});
        return json(200, data.body);
      }
      if (url.pathname === '/') {
        const fragment = (await readFile(new URL('view.html', plugin), 'utf8'))
          .replaceAll('{{RRH_API}}', '/api/').replaceAll('{{RRH_ASSETS}}', '/assets/').replaceAll('{{RRH_MARKET_API}}', '/market/');
        const styles = journeyStyles.map(file => `<link rel="stylesheet" href="/assets/${file}">`).join('\n');
        const scripts = journeyScripts.map(file => `<script src="/assets/${file}"></script>`).join('\n');
        response.writeHead(200, {...securityHeaders, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store'});
        return response.end(`<!doctype html>
<html lang="nb">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Rekrutteringsanalyse | Ridderset</title>
${styles}
</head>
<body>
${fragment}
${scripts}
</body>
</html>`);
      }
      const asset = url.pathname.match(/^\/assets\/([a-zA-Z0-9][a-zA-Z0-9_-]*\.(js|css|json|svg|png))$/);
      if (asset) {
        try {
          const body = await readFile(new URL(asset[1], plugin));
          response.writeHead(200, {...securityHeaders, 'Content-Type': assetTypes[asset[2]] + (asset[2] === 'png' ? '' : '; charset=utf-8'), 'Cache-Control': 'no-store'});
          return response.end(body);
        } catch (error) {
          if (error.code === 'ENOENT') return json(404, {error: 'Fant ikke filen.'});
          throw error;
        }
      }
      return json(404, {error: 'Fant ikke adressen.'});
    } catch (error) {
      const status = error.status || 503;
      return json(status, {error: status === 400 ? 'Ugyldig oppslag.' : status === 429 ? 'Mange oppslag på kort tid. Prøv igjen snart.' : 'Datakilden er utilgjengelig. Prøv igjen eller velg arbeidssted selv.'});
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3101);
  makeServer().listen(port, '0.0.0.0', () => console.log('Ridderset testversjon: http://127.0.0.1:' + port));
}
