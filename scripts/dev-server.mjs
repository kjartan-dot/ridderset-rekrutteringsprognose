import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import path from "node:path";
import {demoCompany,demoUnit} from "./mock-data.mjs";

const folder=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const port=Number(process.env.PORT||4173);
const mockMode=process.env.MOCK_API!=="0";
const cache=new Map();
const types={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".json":"application/json; charset=utf-8"};
function json(res,code,payload){
  res.writeHead(code,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"});
  res.end(JSON.stringify(payload));
}
function project(data){
  const address=data.beliggenhetsadresse||data.forretningsadresse||data.postadresse||{};
  return {
    navn:data.navn,organisasjonsnummer:data.organisasjonsnummer,
    overordnetEnhet:data.overordnetEnhet||null,
    naeringskode1:data.naeringskode1||null,
    antallAnsatte:typeof data.antallAnsatte==="number"?data.antallAnsatte:null,
    organisasjonsform:data.organisasjonsform||{},
    beliggenhetsadresse:address
  };
}
async function live(pathname,params){
  const url=new URL(pathname,"https://data.brreg.no/enhetsregisteret/api/");
  for(const [key,value] of Object.entries(params))url.searchParams.set(key,String(value));
  const key=url.toString(),recent=cache.get(key);
  if(recent&&Date.now()-recent.time<300000)return recent.data;
  const reply=await fetch(url,{headers:{Accept:"application/json"},signal:AbortSignal.timeout(9000)});
  if(reply.status===404)return {};
  if(!reply.ok)throw new Error("Brønnøysundregistrene HTTP "+reply.status);
  const body=await reply.json();cache.set(key,{time:Date.now(),data:body});return body;
}
async function api(req,res,url){
  const endpoint=url.pathname.replace(/^\/wp-json\/ridderset\/v1\/?/,"");
  if(endpoint==="health")return json(res,200,{status:"ok",mock:mockMode,navFeed:"not-connected",salary:"SSB snapshot 2025"});
  if(!["companies","units"].includes(endpoint))return json(res,404,{message:"Ukjent endepunkt."});
  const parent=url.searchParams.get("parent")||"";
  const type=url.searchParams.get("type")||"enheter";
  const q=(url.searchParams.get("q")||"").trim();
  if(endpoint==="companies"&&(!["enheter","underenheter"].includes(type)||q.length<2||q.length>120))return json(res,400,{message:"Ugyldig søk."});
  if(endpoint==="units"&&!/^\d{9}$/.test(parent))return json(res,400,{message:"Ugyldig organisasjonsnummer."});
  if(mockMode){
    if(endpoint==="units"){
      const items=parent==="999999999"?[demoUnit]:[];
      return json(res,200,{items:items.map(project),truncated:false,source:"TESTDATA, ikke register",mock:true});
    }
    const sample=type==="underenheter"?demoUnit:demoCompany;
    const exists=q.toLowerCase().includes("demo")||q.replace(/\s/g,"")===sample.organisasjonsnummer;
    return json(res,200,{items:exists?[project(sample)]:[],kind:type,source:"TESTDATA, ikke register",mock:true});
  }
  try{
    if(endpoint==="units"){
      const data=await live("underenheter",{overordnetEnhet:parent,size:100});
      const items=data._embedded?.underenheter||[];
      return json(res,200,{items:items.map(project),truncated:(data.page?.totalElements||0)>100,source:"Brønnøysundregistrene"});
    }
    const compact=q.replace(/\s/g,"");
    const sub=/^\d{9}$/.test(compact)?type+"/"+compact:type;
    const data=await live(sub,sub===type?{navn:q,size:12}:{});
    const items=data._embedded?.[type]||(data.organisasjonsnummer?[data]:[]);
    return json(res,200,{items:items.map(project),kind:type,source:"Brønnøysundregistrene",mock:false});
  }catch(e){return json(res,503,{message:"Det eksterne registeret er midlertidig utilgjengelig. Bruk manuell registrering."});}
}
async function staticFile(res,pathname){
  const requested=pathname==="/"?"/index.html":pathname;
  let decoded;
  try{decoded=decodeURIComponent(requested)}catch{return json(res,400,{message:"Ugyldig sti."});}
  const target=path.resolve(folder,"."+decoded);
  if(!target.startsWith(folder+path.sep))return json(res,403,{message:"Forbudt sti."});
  const mime=types[path.extname(target)];
  if(!mime)return json(res,404,{message:"Filen finnes ikke."});
  try{
    const bytes=await readFile(target);
    res.writeHead(200,{"Content-Type":mime,"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"});
    res.end(bytes);
  }catch{return json(res,404,{message:"Filen finnes ikke."});}
}
const server=createServer(async(req,res)=>{
  try{
    if(req.method!=="GET")return json(res,405,{message:"Bare GET støttes."});
    const url=new URL(req.url||"/","http://localhost");
    if(url.pathname.startsWith("/wp-json/ridderset/v1/"))return await api(req,res,url);
    return await staticFile(res,url.pathname);
  }catch{return json(res,500,{message:"En uventet feil oppsto."});}
});
server.listen(port,()=>console.log("Ridderset dev: http://localhost:"+port+" ("+(mockMode?"TESTDATA":"Brreg live proxy")+")"));
