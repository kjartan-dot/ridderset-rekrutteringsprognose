// Server-only feed consumer. Caller owns durable storage, scheduling and token.
const ORIGIN='https://pam-stilling-feed.nav.no';
export function feedUrl(path){const u=new URL(path,ORIGIN);if(u.origin!==ORIGIN||!u.pathname.startsWith('/api/v1/feed')||u.username||u.password)throw new Error('Untrusted NAV URL');return u.href;}
export function normalizeVacancy(entry){
 const d=entry.json;if(!entry.uuid||!d||!entry.status)throw new Error('Invalid NAV entry');
 const expires=Date.parse(d.expires);if(!Number.isFinite(expires))throw new Error('Missing expiry');
 const count=typeof d.positioncount==='string'&&/^\d+$/.test(d.positioncount)?Number(d.positioncount):null;
 return {id:entry.uuid,status:entry.status,updated:entry.sistEndret,expires:d.expires,title:d.title??'',positions:Number.isSafeInteger(count)&&count>0?count:null,locations:(d.workLocations??[]).map(x=>({municipality:x.municipal??null,county:x.county??null})),categories:(d.categoryList??[]).map(x=>({type:x.categoryType,code:x.code})),source:'NAV stilling-feed'};
}
export async function syncPage(state,{token,fetcher=fetch,now=new Date().toISOString()}){
 if(!token)throw new Error('NAV_TOKEN is required');
 const url=feedUrl(state.cursor??'/api/v1/feed');const headers={Accept:'application/json',Authorization:'Bearer '+token};
 if(state.etag)headers['If-None-Match']=state.etag;
 if(!state.cursor&&state.since)headers['If-Modified-Since']=state.since;
 const request=async url=>fetcher(feedUrl(url),{headers,signal:AbortSignal.timeout(15000),redirect:'error'});
 const response=await request(url);
 if(response.status===304)return {...state,lastSyncAt:now};
 if(!response.ok)throw new Error('NAV feed unavailable: '+response.status);
 const page=await response.json();if(!Array.isArray(page.items)||!('next_url' in page))throw new Error('Invalid NAV page');
 const vacancies={...(state.vacancies??{})};
 for(const item of page.items){
 const header=item._feed_entry;if(!header?.uuid||!['ACTIVE','INACTIVE'].includes(header.status))throw new Error('Invalid NAV header');
 if(header.status==='INACTIVE'){delete vacancies[header.uuid];continue;}
 const detailResponse=await request(item.url);if(!detailResponse.ok)throw new Error('NAV detail unavailable: '+detailResponse.status);
 const detail=normalizeVacancy(await detailResponse.json());if(detail.id!==header.uuid)throw new Error('NAV identity mismatch');
 if(detail.status!=='ACTIVE'||Date.parse(detail.expires)<=Date.parse(now))delete vacancies[detail.id];else vacancies[detail.id]=detail;
 }
 for(const [id,ad]of Object.entries(vacancies))if(Date.parse(ad.expires)<=Date.parse(now))delete vacancies[id];
 return {...state,vacancies,cursor:page.next_url?feedUrl(page.next_url):url,etag:page.next_url?null:response.headers.get('etag'),lastSyncAt:now,complete:state.complete===true||(!page.next_url&&state.fullWindow===true)};
}
export function vacancySummary(state,{municipality,categoryType,code,now=Date.now(),maxAgeMs=900000}={}){
 if(!state?.complete||!state.lastSyncAt||now-Date.parse(state.lastSyncAt)>maxAgeMs)return {status:'unavailable',ads:null,positions:null,unknownPositionCounts:null};
 const rows=Object.values(state.vacancies??{}).filter(x=>x.status==='ACTIVE'&&Date.parse(x.expires)>now&&(!municipality||x.locations.some(l=>l.municipality?.toLocaleUpperCase('nb-NO')===municipality.toLocaleUpperCase('nb-NO')))&&(!code||x.categories.some(c=>c.type===categoryType&&c.code===code)));
 return {status:'available',ads:rows.length,positions:rows.reduce((n,x)=>n+(x.positions??0),0),unknownPositionCounts:rows.filter(x=>x.positions===null).length,lastSyncAt:state.lastSyncAt,coverage:'NAV-feed. Finn.no er ikke inkludert. Utlysninger er ikke antall tilgjengelige kandidater.'};
}
