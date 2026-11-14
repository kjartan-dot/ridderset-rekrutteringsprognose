import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {companies,salary} from './adapters.js';
const occupations=JSON.parse(await readFile(new URL('./occupations.json',import.meta.url),'utf8'));
const synonyms={salgsjef:['1221'],tømrer:['7115'],sykepleier:['2223'],rekrutterer:['2423','3333'],elektriker:['7411'],prosjektleder:['1323','2142','2421'],prosjektsjef:['1323'],driftstekniker:['3511','3119'],regnskapsfører:['3313'],barnehagelærer:['2342'],ingeniør:['2142','3112']};
export function occupationSearch(q){
 q=q.toLocaleLowerCase('nb-NO').trim();if(!q)return [];
 const mapped=synonyms[q]??[];
 return occupations.filter(x=>mapped.includes(x.code)||x.name.toLocaleLowerCase('nb-NO').includes(q)||x.code===q).sort((a,b)=>Number(mapped.includes(b.code))-Number(mapped.includes(a.code))).slice(0,20);
}
const assets={'/':['index.html','text/html'],'/app.js':['app.js','text/javascript'],'/market.js':['market.js','text/javascript'],'/model.js':['model.js','text/javascript'],'/style.css':['style.css','text/css']};
export function makeServer(){return http.createServer(async(req,res)=>{
 const headers={'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"};
 const json=(status,data)=>{res.writeHead(status,{...headers,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 if(req.method!=='GET')return json(405,{error:'Kun GET er tillatt'});
 try{
 const u=new URL(req.url,'http://localhost');
 if(u.pathname==='/api/occupations')return json(200,occupationSearch((u.searchParams.get('q')??'').slice(0,100)));
 if(u.pathname==='/api/companies'){
 const q=u.searchParams.get('q')??'',kind=u.searchParams.get('kind')??'enheter';
 if(q.trim().length<2||q.length>100||!['enheter','underenheter'].includes(kind))return json(400,{error:'Velg enhetstype og skriv minst to tegn.'});
 return json(200,await companies(q,kind));}
 if(u.pathname==='/api/salary'){
 const code=u.searchParams.get('code')??'';if(!/^\d{4}$/.test(code))return json(400,{error:'Velg en gyldig yrkesgruppe.'});
 return json(200,await salary(code));}
 if(u.pathname==='/api/market')return json(200,{status:'unavailable',ads:null,positions:null,reason:'NAV-feed er ikke tilkoblet.'});
 if(assets[u.pathname]){const [file,type]=assets[u.pathname];res.writeHead(200,{...headers,'Content-Type':type+'; charset=utf-8','Cache-Control':'no-store'});return res.end(await readFile(new URL('../public/'+file,import.meta.url)));}
 json(404,{error:'Fant ikke siden'});
 }catch{json(503,{error:'Datakilden er utilgjengelig eller returnerte uventede data. Prøv igjen senere. Bedriften kan registreres manuelt.'});}
 });}
if(process.argv[1]===fileURLToPath(import.meta.url))makeServer().listen(Number(process.env.PORT??(process.argv.includes('--port')?process.argv[process.argv.indexOf('--port')+1]:3100)),process.env.HOST??'127.0.0.1',()=>console.log('Testversjon: http://127.0.0.1:3100'));
