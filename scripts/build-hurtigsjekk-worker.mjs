import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const out=process.argv[2];
if(!out)throw new Error('Provide the preview checkout path.');
const plugin=new URL('../integrations/wordpress/ridderset-hurtigsjekk/',import.meta.url);
const assets={};
for(const file of ['front.js','core.js','style.css','catalog.json','nav-2026.json'])assets['/assets/'+file]=await readFile(new URL(file,plugin),'utf8');
assets['/assets/preview.css']='body{margin:0;background:#f5f2eb;font-family:Inter,system-ui,sans-serif}.preview-top{min-height:70px;max-width:1108px;padding:15px 24px;margin:auto;display:flex;justify-content:space-between;align-items:center;gap:15px;color:#173a43}.preview-top strong{font-size:23px;letter-spacing:-.04em}.preview-top span{font-size:13px;background:#e2eae7;padding:5px 10px;border-radius:20px}.preview-top a{font-size:14px;color:#173a43;text-underline-offset:3px}@media(max-width:500px){.preview-top{padding:13px 20px;min-height:64px}.preview-top a{display:none}.preview-top strong{font-size:21px}}';
const fragment=(await readFile(new URL('view.html',plugin),'utf8')).replaceAll('{{RRH_API}}','/api/').replaceAll('{{RRH_ASSETS}}','/assets/').replaceAll('{{RRH_MARKET_API}}','/market/').replace('Ingen innlogging. Søket','Testversjon. Søket');
const html='<!doctype html><html lang="nb"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="description" content="Prøv en enklere rekrutteringsanalyse: bedriftssøk, rolleforslag og dokumenterte markedstall."><title>Rekrutteringsinnsikt · Ridderset</title><link rel="stylesheet" href="/assets/preview.css"><link rel="stylesheet" href="/assets/style.css"></head><body><header class="preview-top"><strong>Ridderset</strong><span>Privat testversjon</span><a href="https://ridderset.no/innsikt/">Innsikt og verktøy</a></header><main>'+fragment+'</main><script src="/assets/core.js"></script><script src="/assets/front.js"></script></body></html>';
let adapter=await readFile(new URL('./hurtigsjekk-server.mjs',import.meta.url),'utf8');
adapter=adapter.slice(adapter.indexOf('const brreg ='),adapter.indexOf('const securityHeaders =')).replaceAll('export function ','function ').replaceAll('export async function ','async function ');
const handler=String.raw`
const headers={'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'"};
const types={js:'text/javascript',css:'text/css',json:'application/json'};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{...headers,'Content-Type':'application/json; charset=utf-8'}});
export default {async fetch(request){
 if(request.method!=='GET' && request.method!=='HEAD')return json({error:'Kun GET er tillatt.'},405);
 const url=new URL(request.url);
 try{
  if(url.pathname==='/' || url.pathname==='/index.html')return new Response(request.method==='HEAD'?null:HTML,{headers:{...headers,'Content-Type':'text/html; charset=utf-8'}});
  if(Object.hasOwn(ASSETS,url.pathname))return new Response(request.method==='HEAD'?null:ASSETS[url.pathname],{headers:{...headers,'Content-Type':types[url.pathname.split('.').at(-1)]+'; charset=utf-8'}});
  if(url.pathname==='/api/companies')return json(await searchCompanies(url.searchParams.get('q'),url.searchParams.get('kind')||'enheter'));
  if(url.pathname==='/api/units')return json(await companyUnits(url.searchParams.get('org')||''));
  const match=url.pathname.match(/^\/market\/(annonser|lonn|pendling)$/);
  if(match){const target=new URL(market+match[1]);target.search=marketParams(match[1],url.searchParams);const data=await readJson(target,{ttl:match[1]==='annonser'?60000:300000,timeoutMs:20000});if(data.missing)return json({error:'Markedskilden er utilgjengelig.'},503);return json(data.body);}
  return json({error:'Fant ikke adressen.'},404);
 }catch(error){const status=error.status||503;return json({error:status===400?'Ugyldig oppslag.':status===429?'Mange oppslag på kort tid. Prøv igjen snart.':'Datakilden er utilgjengelig. Prøv igjen eller velg arbeidssted selv.'},status);}
}};
`;
await mkdir(resolve(out,'worker'),{recursive:true});
await writeFile(resolve(out,'worker/index.js'),'const HTML='+JSON.stringify(html)+';\nconst ASSETS='+JSON.stringify(assets)+';\n'+adapter+'\n'+handler);
console.log('Built preview from WordPress assets and the tested adapter.');
