const cache=new Map();
export async function getJson(url,{fetcher=fetch,ttl=3600000}={}) {
 const hit=cache.get(url); if(hit && hit.until>Date.now()) return hit.value;
 const response=await fetcher(url,{signal:AbortSignal.timeout(12000),headers:{Accept:'application/json'}});
 if(!response.ok) throw Object.assign(new Error('Datakilden svarte ikke som forventet'),{upstreamStatus:response.status});
 const value=await response.json();
 if(cache.size>=300)cache.delete(cache.keys().next().value);
 cache.set(url,{value,until:Date.now()+ttl}); return value;
}
export function normalizeCompany(x,kind='enheter') {
 return {orgnr:x.organisasjonsnummer,name:x.navn,kind,parent:x.overordnetEnhet??null,employees:x.harRegistrertAntallAnsatte===false?null:(Number.isInteger(x.antallAnsatte)?x.antallAnsatte:null),address:x.beliggenhetsadresse??x.forretningsadresse??null,industry:x.naeringskode1??null,organizationForm:x.organisasjonsform?.beskrivelse??null,source:'Brønnøysundregistrene',sourceUrl:`https://data.brreg.no/enhetsregisteret/api/${kind}/${x.organisasjonsnummer}`,fetchedAt:new Date().toISOString()};
}
export async function companies(query,kind='enheter',get=getJson) {
 if(!['enheter','underenheter'].includes(kind))throw new Error('Ugyldig enhetstype');
 if(typeof query!=='string'||query.trim().length<2||query.length>100)throw new Error('Skriv mellom 2 og 100 tegn');
 const url=new URL(`https://data.brreg.no/enhetsregisteret/api/${kind}`);
 url.searchParams.set(/^\d{9}$/.test(query)?'organisasjonsnummer':'navn',query.trim());url.searchParams.set('size','12');
 const d=await get(url.href);
 return (d._embedded?.[kind]??[]).map(x=>normalizeCompany(x,kind));
}
export async function salary(code,get=getJson) {
 if(!/^\d{4}$/.test(code))throw new Error('Ugyldig yrkeskode');
 const base='https://data.ssb.no/api/pxwebapi/v2/tables/11418';
 const meta=await get(base+'/metadata?lang=no');
 if(!meta.dimension.Yrke.category.label[code])throw new Error('Yrket finnes ikke i lønnstabellen');
 const year=Object.keys(meta.dimension.Tid.category.label).sort().at(-1);
 const values={MaaleMetode:'01',Yrke:code,Sektor:'ALLE',Kjonn:'0',AvtaltVanlig:'0',ContentsCode:'Manedslonn',Tid:year};
 const url=new URL(base+'/data');url.searchParams.set('lang','no');
 for(const [k,v]of Object.entries(values))url.searchParams.set(`valueCodes[${k}]`,v);
 const d=await get(url.href);const raw=Array.isArray(d.value)?d.value[0]:d.value?.['0'];
 if(!d.id||d.size?.reduce((n,v)=>n*v,1)!==1)throw new Error('Uventet datastruktur fra SSB');
 return {value:typeof raw==='number'?raw:null,year,code,description:'Median månedslønn, hele landet, alle sektorer, begge kjønn, hel- og deltidsansatte. Deltid omregnet til heltid.',updated:meta.updated,fetchedAt:new Date().toISOString(),source:url.href};
}
