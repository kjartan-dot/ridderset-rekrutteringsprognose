(function(){
"use strict";
const root=document.getElementById("rrwl-v1");if(!root)return;
const $=id=>document.getElementById(id);
const fields=["reputation","visibility","promise","onboarding","development","leadership"];
const names={reputation:"omdømme blant aktuelle kandidater",visibility:"synlighet og troverdighet",promise:"samsvar mellom rekrutteringsløfter og arbeidshverdag",onboarding:"oppstart og integrering",development:"medarbeiderutvikling",leadership:"ledelse og oppfølging"};
const hrLabels={unknown:"Ikke avklart",dedicated:"Intern HR-avdeling / dedikert HR-ressurs",shared:"HR-ansvar fordelt mellom ledere/administrasjon",external:"Ekstern HR-partner",both:"Intern HR og ekstern støtte",none:"Ingen etablert HR-støtte"};
const touched=new Set();
const vals=()=>Object.fromEntries(fields.map(key=>[key,Number($("rrwl-"+key).value)]));
const round=n=>Math.round(n);
function calculate(){
 const s=vals();
 const brandAnswered=fields.slice(0,2).every(key=>touched.has(key));
 const indexAnswered=fields.slice(2).every(key=>touched.has(key));
 const brand=brandAnswered?round((s.reputation*.65+s.visibility*.35)*10):null;
 const index=indexAnswered?round((s.promise*.35+s.onboarding*.2+s.development*.3+s.leadership*.15)*10):null;
 const composite=brand!==null&&index!==null?round(brand*.4+index*.6):null;
 const hr=$("rrwl-hr").value;
 const ranked=fields.slice().sort((a,b)=>s[a]-s[b]);
 const low=touched.size===fields.length&&s[ranked[0]]<s[ranked[1]]?ranked[0]:null;
 const assessed=touched.size===6;
 for(const key of fields){$("rrwl-"+key+"-value").textContent=touched.has(key)?s[key]+"/10":"Ikke vurdert";}
 $("rrwl-brand-score").textContent=brand===null?"Ikke vurdert":brand+"/100";
 $("rrwl-index-score").textContent=index===null?"Ikke vurdert":index+"/100";
 $("rrwl-brand-bar").style.width=brand===null?"0%":brand+"%";$("rrwl-index-bar").style.width=index===null?"0%":index+"%";
 let label=touched.size?"Egenvurderingen er ikke fullført":"Ikke vurdert",expl="Brand vises når begge spørsmålene er besvart. Index vises når alle fire spørsmålene er besvart. Ubesvarte felt inngår ikke som observasjoner.";
 if(assessed){
  label=composite>=75?"Gode oppgitte forutsetninger":composite>=55?"Blandet bilde, mulige svakheter":"Flere oppgitte forhold kan svekke tiltrekning og lojalitet";
  expl=composite>=75?"Egenvurderingen tyder på at virksomheten har flere forhold som kan gjøre den attraktiv. Kontroller om ansatte og kandidater bekrefter bildet.":composite>=55?"Noen forhold kan styrke rekrutteringen, mens andre bør dokumenteres og forbedres. Prioriter de svakeste faktorene.":"Lav egenvurdering på flere forhold tilsier at det kan bli vanskeligere å overbevise kandidater og beholde ansatte. Kartlegg hva som faktisk skjer før dere lover endringer.";
 }
 if(touched.has("reputation")&&touched.has("promise")&&(s.reputation>=7 ? s.promise<=4 : false))expl+=" Vær spesielt oppmerksom på gap mellom godt omdømme og en svak opplevelse etter oppstart.";
 if(touched.has("reputation")&&touched.has("development")&&(s.reputation<=4 ? s.development>=7 : false))expl+=" En styrke kan være å synliggjøre reelle utviklingsmuligheter gjennom ansatte og konkrete historier.";
 $("rrwl-readiness").textContent=label;
 $("rrwl-explanation").textContent=expl;
 $("rrwl-answered").textContent=touched.size+" av 6 forhold aktivt vurdert. "+(assessed?"Dette er fortsatt kun en egenvurdering.":"Uendret startverdi 5 er ikke en innrapportert observasjon.");
 $("rrwl-hr-note").textContent=hr==="none"?"Det er ikke oppgitt etablert HR-støtte. Utpek ansvarlig for stillingsanalyse, søk, vurdering og oppstart, eller vurder ekstern bistand.":hr==="unknown"?"HR-støtte er ennå ikke avklart. Avklar hvem som skal eie og gjennomføre prosessen.":hr==="shared"?"HR-ansvaret ligger hos ledere/administrasjon. Kontroller kapasitet og kompetanse før prosessen starter.":hr==="external"?"Ekstern HR-partner er oppgitt. Avklar oppgavefordeling mot leder og ansvar for oppfølging etter ansettelse.":"Det er oppgitt formalisert HR-støtte. Kontroller kapasitet, rollefordeling og samarbeid med ansettende leder.";
 $("rrwl-action").textContent=low===null?(assessed?"Flere forhold er vurdert likt. Velg hva dere bør arbeide med først ut fra dokumentasjon og aktuelle behov.":"Vurder de seks forholdene før dere prioriterer et område. Bare spørsmål dere har besvart brukes i egenvurderingen."):"Prioriter "+names[low]+". "+(low==="promise"?"Undersøk om nyansatte møter løftene fra utlysning og intervju, og korriger eventuelle gap.":low==="development"?"Lag konkrete kompetanse- og utviklingsløp som medarbeiderne faktisk får anledning til å følge.":low==="onboarding"?"Innfør en enkel plan med ledersamtaler og forventningsavklaring ved oppstart.":low==="reputation"?"Undersøk kandidatmarkedet før dere konkluderer: hva forbinder målgruppen med virksomheten?":low==="visibility"?"Vis dokumenterbare arbeidsoppgaver, medarbeiderhistorier og realistiske utviklingsmuligheter.":"Avtal tydelig lederoppfølging, tilbakemeldinger og ansvar for utvikling.");
 const profile={as_of:new Date().toISOString().slice(0,10),source:"Arbeidsgiverens egenvurdering, inspirert av Worklife Index og Worklife Brand",not_validated:true,assessed_dimensions:touched.size,assessed_dimension_keys:[...touched],all_dimensions_assessed:assessed,brand_dimensions_assessed:brandAnswered,index_dimensions_assessed:indexAnswered,brand_self_assessed:brand,index_self_assessed:index,illustrative_readiness:composite,dimensions:Object.fromEntries(fields.map(key=>[key,touched.has(key)?s[key]:null])),weakest_dimension:low,hr_support:hr,hr_support_text:hrLabels[hr],note:"Scorene er selvrapporterte og er ikke resultat fra medarbeidere eller kandidater. Ingen validert prediksjon av rekrutteringstid, sannsynlighet eller effekt."};
 window.__rrpWorklife=profile;
 if(window.__rrpCurrent)window.__rrpCurrent.worklife_self_assessment=profile;
 window.dispatchEvent(new CustomEvent("rrp-worklife-updated",{detail:profile}));
}
for(const key of fields){
 $("rrwl-"+key).addEventListener("input",()=>{touched.add(key);calculate()});
 $("rrwl-"+key).addEventListener("change",()=>{touched.add(key);calculate()});
}
$("rrwl-hr").addEventListener("change",calculate);
$("rrwl-reset").addEventListener("click",()=>{touched.clear();for(const key of fields)$("rrwl-"+key).value="5";$("rrwl-hr").value="unknown";calculate();});
calculate();
const contextApi=window.RRPLegacyContext=window.RRPLegacyContext||{};
contextApi.worklifeReady=true;
window.dispatchEvent(new CustomEvent("rrh-legacy-ready"));
})();
