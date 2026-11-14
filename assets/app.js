import { DIMENSIONS,HR_OPTIONS,occupationMatches,companyFromRegistry,worklifeScore,salaryComparison,employerActions,buildReport,money,percentage } from "../src/core.mjs";

const root=document.querySelector(".rr-insight-root");
const byId=key=>root.querySelector("#rr-"+key);
const fmt=value=>typeof value==="number"?new Intl.NumberFormat("nb-NO").format(value):"Ikke oppgitt";
const listen=(key,type,fn)=>byId(key)?.addEventListener(type,fn);
const click=(key,fn)=>listen(key,"click",fn);
function status(message,type="info"){
  const node=byId("notice");node.className="rr-notice rr-"+type;node.textContent=message;
}
async function loadJson(url){
  const response=await fetch(url,{headers:{Accept:"application/json"}});
  let json;try{json=await response.json()}catch{throw new Error("Ugyldig svar fra datatjenesten.");}
  if(!response.ok)throw new Error(json.message||json.error||"Datatjenesten svarer ikke.");
  return json;
}
async function initialize(){
  if(!root)return;
  const templateUrl=root.dataset.templateUrl;
  if(!templateUrl)throw new Error("Mangler malfil.");
  const template=await fetch(templateUrl);
  if(!template.ok)throw new Error("Malfilen kan ikke lastes.");
  root.innerHTML=await template.text();
  const state={company:null,companyRaw:null,occupation:null,location:"",region:"18",positions:1,offer:null,answers:{},touched:[],hr:"unknown"};
  const base=root.dataset.apiBase||"/wp-json/ridderset/v1/";
  let occupations=[],units=[],companyRequest=0,companyDebounce=null;
  const worklife=()=>worklifeScore(state.answers,state.touched);
  function apiUrl(path,parameters){
    const url=new URL(path,new URL(base,window.location.href));
    for(const [key,value] of Object.entries(parameters))url.searchParams.set(key,value);
    return url.toString();
  }
  function update(){
    const median=state.occupation?.median2025??null,delta=salaryComparison(median,state.offer);
    byId("salary").textContent=state.occupation?money(median):"Velg yrke";
    byId("salary-delta").textContent=delta===null?"Ikke beregnbart":(delta>0?"+":"")+percentage(delta);
    const wl=worklife(),score=x=>x===null?"Ikke fullført":x+"/100";
    byId("brand-score").textContent=score(wl.brand);byId("index-score").textContent=score(wl.index);
    byId("brand-inline").textContent=score(wl.brand);byId("index-inline").textContent=score(wl.index);
    byId("answered").textContent=wl.answered+" av 6 forhold vurdert.";
    byId("hr-status").textContent=HR_OPTIONS[state.hr]||HR_OPTIONS.unknown;
    byId("worklife-hint").textContent=wl.gap!==null&&wl.gap>25
      ?"Et stort egenrapportert gap mellom omdømme og intern opplevelse bør undersøkes hos ansatte og kandidater."
      :wl.allAnswered?"Disse to scorene er kun arbeidsgiverens egenvurderinger, ikke uavhengige målinger."
      :"Brand og Index vises hver for seg først når alle tilhørende spørsmål er vurdert.";
    const advice=employerActions({worklife:wl,answers:state.answers,touched:state.touched,hr:state.hr,salaryDelta:delta,occupation:state.occupation});
    const list=byId("actions");list.replaceChildren();
    for(const value of advice){const li=document.createElement("li");li.textContent=value;list.appendChild(li);}
  }
  function selectOccupation(item){
    state.occupation=item;
    byId("job-chosen").hidden=false;
    byId("job-name").textContent=item.name;
    byId("job-code").textContent="STYRK08 "+item.code+" · yrkesgruppe, ikke stillingsannonse";
    byId("job-query").value=item.name;byId("job-results").hidden=true;
    byId("job-status").textContent="Kontroller at yrkesgruppen dekker stillingen.";
    update();
  }
  function suggestions(){
    const search=byId("job-query").value.trim(),div=byId("job-results");
    div.replaceChildren();if(!search){div.hidden=true;return;}
    const found=occupationMatches(occupations,search,12);
    if(!found.length){byId("job-status").textContent="Ingen treff. Prøv et annet navn eller søk på fagområdet.";div.hidden=true;return;}
    for(const item of found){
      const btn=document.createElement("button");btn.type="button";btn.className="rr-suggestion";
      const title=document.createElement("strong");title.textContent=item.name;
      const detail=document.createElement("small");detail.textContent="STYRK08 "+item.code;
      btn.append(title,detail);btn.addEventListener("click",()=>selectOccupation(item));div.append(btn);
    }
    div.hidden=false;byId("job-status").textContent=found.length+" forslag. Velg en yrkesgruppe.";
  }
  listen("job-query","input",suggestions);
  listen("job-query","keydown",event=>{if(event.key==="Enter"){event.preventDefault();byId("job-results").querySelector("button")?.click();}});
  click("job-clear",()=>{
    state.occupation=null;byId("job-chosen").hidden=true;byId("job-query").value="";
    byId("job-query").focus();update();
  });
  function displayCompany(){
    const company=state.company;if(!company)return;
    byId("company-chosen").hidden=false;byId("company-name").textContent=company.name;
    byId("company-meta").textContent=(company.org||"Org.nr. ikke oppgitt")+" · "+company.municipality+" · "
      +(company.employees===null?"Ansatte ikke registrert":fmt(company.employees)+" registrerte ansatte")+" · "
      +(company.reported?"Egenrapportert":"Enhetsregisteret");
  }
  async function getUnits(raw){
    const org=raw.organisasjonsnummer;
    if(!/^\d{9}$/.test(String(org||"")))return;
    try{
      const result=await loadJson(apiUrl("units",{parent:org}));
      if(state.companyRaw!==raw)return;
      units=result.items||[];
      if(!units.length){byId("unit-zone").hidden=true;return;}
      const dropdown=byId("unit-select");dropdown.replaceChildren();
      const option=document.createElement("option");option.value="";option.textContent="Hovedenhetens registrerte adresse";dropdown.append(option);
      for(const unit of units){
        const child=document.createElement("option");child.value=unit.organisasjonsnummer;
        child.textContent=(unit.navn||"Underenhet")+" · "+(unit.beliggenhetsadresse?.kommune||"Ukjent kommune");
        dropdown.append(child);
      }
      byId("unit-zone").hidden=false;
      byId("units-note").textContent=result.truncated
        ?"Viser de første 100 underenhetene. Søk direkte på arbeidsstedet om du ikke finner riktig avdeling."
        :"Kontroller at valgt enhet er det faktiske arbeidsstedet.";
    }catch{
      byId("units-note").textContent="Avdelinger kunne ikke hentes. Kontroller arbeidsstedet manuelt.";
    }
  }
  function selectCompany(raw,kind){
    state.companyRaw=raw;
    state.company=companyFromRegistry(raw,kind);
    byId("company-query").value=state.company.name;byId("company-results").hidden=true;
    byId("company-status").textContent="Virksomheten er valgt. Kontroller riktig arbeidssted.";
    if(!byId("location").value.trim()&&state.company.municipality!=="Ikke oppgitt"){
      byId("location").value=state.company.municipality;state.location=state.company.municipality;
    }
    byId("unit-zone").hidden=true;units=[];displayCompany();update();
    if(kind==="enheter")getUnits(raw);
  }
  async function searchCompany(){
    const query=byId("company-query").value.trim(),kind=byId("search-units").checked?"underenheter":"enheter";
    if(query.length<2){byId("company-status").textContent="Skriv minst to tegn.";return;}
    const requested=++companyRequest;
    byId("company-status").textContent="Søker i Enhetsregisteret …";
    byId("company-results").hidden=true;
    try{
      const data=await loadJson(apiUrl("companies",{q:query,type:kind}));
      if(requested!==companyRequest)return;
      const div=byId("company-results");div.replaceChildren();
      if(!Array.isArray(data.items)||!data.items.length){
        byId("company-status").textContent="Ingen treff. Kontroller stavemåte eller søk etter underenhet.";
        return;
      }
      for(const raw of data.items){
        const btn=document.createElement("button");btn.type="button";btn.className="rr-suggestion";
        const title=document.createElement("strong");title.textContent=raw.navn||"Navn ikke registrert";
        const description=document.createElement("small");
        description.textContent=(raw.organisasjonsnummer||"")+" · "+(raw.beliggenhetsadresse?.kommune||"Sted ikke oppgitt")+" · "+(kind==="enheter"?"Hovedenhet":"Underenhet");
        btn.append(title,description);btn.addEventListener("click",()=>selectCompany(raw,kind));div.append(btn);
      }
      div.hidden=false;byId("company-status").textContent="Fant "+data.items.length+" forslag. Velg riktig virksomhet.";
    }catch(error){
      if(requested!==companyRequest)return;
      byId("company-status").textContent="Oppslaget svarte ikke: "+error.message+" Bruk manuell registrering dersom feilen vedvarer.";
      byId("company-results").hidden=true;
    }
  }
  click("company-search",searchCompany);
  listen("company-query","input",()=>{clearTimeout(companyDebounce);companyDebounce=setTimeout(searchCompany,480);});
  listen("company-query","keydown",event=>{if(event.key==="Enter"){
    event.preventDefault();
    const first=!byId("company-results").hidden?byId("company-results").querySelector("button"):null;
    if(first)first.click();else searchCompany();
  }});
  listen("search-units","change",()=>{++companyRequest;byId("company-results").hidden=true;byId("company-status").textContent="Søkemodus er endret. Søk igjen.";});
  listen("unit-select","change",()=>{
    const number=byId("unit-select").value;
    if(!number){
      if(state.companyRaw){
        state.company=companyFromRegistry(state.companyRaw,"enheter");
        displayCompany();update();
      }
      return;
    }
    const unit=units.find(x=>x.organisasjonsnummer===number);
    if(!unit)return;
    state.company=companyFromRegistry(unit,"underenheter");
    state.location=state.company.municipality;byId("location").value=state.location;
    byId("company-status").textContent="Underenhet valgt. Bekreft arbeidsstedet.";displayCompany();update();
  });
  click("company-clear",()=>{
    state.company=null;state.companyRaw=null;units=[];byId("company-chosen").hidden=true;
    byId("unit-zone").hidden=true;byId("company-query").value="";byId("company-query").focus();
    byId("company-status").textContent="Søk etter en annen virksomhet.";update();
  });
  click("manual-save",()=>{
    const name=byId("manual-name").value.trim(),org=byId("manual-org").value.replace(/\s/g,"").trim();
    if(name.length<2){byId("company-status").textContent="Skriv inn bedriftens navn.";byId("manual-name").focus();return;}
    if(org&&!/^\d{9}$/.test(org)){byId("company-status").textContent="Organisasjonsnummeret skal ha ni siffer eller stå tomt.";return;}
    const raw=byId("manual-employees").value,employees=raw===""?null:Number(raw);
    if(employees!==null&&(!Number.isInteger(employees)||employees<0)){byId("company-status").textContent="Antall ansatte må være et heltall.";return;}
    const municipality=byId("manual-location").value.trim();
    state.company={name,org:org||null,unitType:"Manuelt oppgitt",parentOrg:null,
      industry:byId("manual-industry").value.trim()||"Ikke oppgitt",industryCode:null,employees,
      employeeCountSource:"egenrapportert",municipality:municipality||"Ikke oppgitt",
      municipalityNumber:null,address:"Ikke kontrollert",source:"Egenrapportert av arbeidsgiver",reported:true};
    state.companyRaw=null;units=[];byId("unit-zone").hidden=true;
    byId("company-query").value=name;
    if(municipality){byId("location").value=municipality;state.location=municipality;}
    byId("company-status").textContent="Opplysningene er registrert manuelt, ikke hentet fra Enhetsregisteret.";
    displayCompany();update();
  });
  for(const name of ["location","region","positions","offer"]){
    listen(name,"input",()=>{
      state.location=byId("location").value.trim();state.region=byId("region").value;
      const positions=Number(byId("positions").value);
      state.positions=Number.isInteger(positions)?Math.max(1,Math.min(100,positions)):1;
      const salary=byId("offer").value;state.offer=salary===""?null:Number(salary);
      if(state.offer!==null&&(!Number.isFinite(state.offer)||state.offer<=0))state.offer=null;
      update();
    });
  }
  for(const dimension of DIMENSIONS){
    listen("dim-"+dimension.key,"input",()=>{
      state.answers[dimension.key]=Number(byId("dim-"+dimension.key).value);
      if(!state.touched.includes(dimension.key))state.touched.push(dimension.key);
      byId("out-"+dimension.key).textContent=state.answers[dimension.key]+"/10";update();
    });
  }
  listen("hr","change",()=>{state.hr=byId("hr").value;update();});
  click("reset",()=>{
    state.answers={};state.touched=[];state.hr="unknown";byId("hr").value="unknown";
    for(const d of DIMENSIONS){byId("dim-"+d.key).value="5";byId("out-"+d.key).textContent="Ikke besvart";}
    update();
  });
  click("download",()=>{
    const report=buildReport({...state,worklife:worklife()});
    const blob=new Blob([report],{type:"text/plain;charset=utf-8"}),url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download="ridderset-rekrutteringsinnsikt.txt";document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1200);
    byId("download-status").textContent="Beslutningsnotatet er laget.";
  });
  click("print",()=>window.print());
  update();
  try{
    const response=await loadJson(root.dataset.occupationsUrl);
    if(!Array.isArray(response.occupations)||response.occupations.length<400)throw new Error("Mangelfull yrkesfil.");
    occupations=response.occupations;
    byId("job-status").textContent=occupations.length+" yrkesgrupper tilgjengelig.";
    status("Modellen er aktiv. Bruk søkefeltene og vurderingene nedenfor.","success");
  }catch(error){
    byId("job-status").textContent="Yrkesdata er utilgjengelige. Søk kan ikke brukes.";
    status("Kunne ikke laste yrkesgruppene: "+error.message,"error");
  }
}
if(root){
  initialize().catch(error=>{
    root.textContent="";
    const box=document.createElement("div");box.className="rr-bootstrap-error";box.setAttribute("role","alert");
    box.textContent="Verktøyet kunne ikke starte. Oppdater siden, eller kontakt Ridderset dersom feilen vedvarer.";
    root.append(box);
    console.error("Ridderset Innsikt: feil ved oppstart",error.message);
  });
}
