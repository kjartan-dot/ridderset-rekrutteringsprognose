import {readFile,mkdir,writeFile} from 'node:fs/promises';
const assets={};for(const [path,file,type]of [['/','index.html','text/html'],['/app.js','app.js','text/javascript'],['/model.js','model.js','text/javascript'],['/market.js','market.js','text/javascript'],['/style.css','style.css','text/css']])assets[path]={body:await readFile('public/'+file,'utf8'),type};
const adapters=(await readFile('src/adapters.js','utf8')).replaceAll('export ','');
const server=await readFile('src/server.js','utf8');const search=server.slice(server.indexOf('const synonyms='),server.indexOf('const assets=')).replace('export function','function');
const occupations=await readFile('src/occupations.json','utf8');
const handler=`\nconst security={'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"};
const json=(status,data)=>new Response(JSON.stringify(data),{status,headers:{...security,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
export default {async fetch(request){
 if(request.method!=='GET')return json(405,{error:'Kun GET er tillatt'});
 const u=new URL(request.url);
 try{
 if(assets[u.pathname]){const a=assets[u.pathname];return new Response(a.body,{headers:{...security,'Content-Type':a.type+'; charset=utf-8'}});}
 if(u.pathname==='/api/occupations')return json(200,occupationSearch((u.searchParams.get('q')??'').slice(0,100)));
 if(u.pathname==='/api/companies'){
 const q=u.searchParams.get('q')??'',kind=u.searchParams.get('kind')??'enheter';
 if(q.trim().length<2||q.length>100||!['enheter','underenheter'].includes(kind))return json(400,{error:'Velg enhetstype og skriv minst to tegn.'});
 return json(200,await companies(q,kind));}
 if(u.pathname==='/api/salary'){const code=u.searchParams.get('code')??'';if(!/^\\d{4}$/.test(code))return json(400,{error:'Velg en gyldig yrkesgruppe.'});return json(200,await salary(code));}
 if(u.pathname==='/api/market')return json(200,{status:'unavailable',ads:null,positions:null,reason:'NAV-feed er ikke tilkoblet.'});
 return json(404,{error:'Fant ikke siden'});
 }catch{return json(503,{error:'Datakilden er utilgjengelig eller returnerte uventede data. Prøv igjen senere. Bedriften kan registreres manuelt.'});}
}};`;
await mkdir('dist/server',{recursive:true});await writeFile('dist/server/index.js',adapters+'\nconst occupations='+occupations+';\n'+search+'\nconst assets='+JSON.stringify(assets)+';\n'+handler);
console.log('Built worker with same UI and adapters as local server.');
