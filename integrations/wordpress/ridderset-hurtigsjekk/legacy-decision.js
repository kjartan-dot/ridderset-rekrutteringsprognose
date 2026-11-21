(function(){
"use strict";
const el=id=>document.getElementById(id);
if(!el("rrp-decision-v1")||!el("rrpd-build"))return;
const money=n=>new Intl.NumberFormat("nb-NO",{maximumFractionDigits:0}).format(n)+" kr";
const fmt=n=>new Intl.NumberFormat("nb-NO",{maximumFractionDigits:0}).format(n);
const phrase=(s)=>String(s||"").trim();
let note="";
function update(){
 const city=phrase(el("rrpd-town").value).toLocaleLowerCase("nb-NO");
 const countyCodes={"harstad":"55","tromsø":"55","senja":"55","narvik":"18","sortland":"18","hadsel":"18","vågan":"18","vestvågøy":"18","bodø":"18","fauske":"18","rana":"18","alta":"56","hammerfest":"56","sør-varanger":"56","vadsø":"56"};
 const county=document.querySelector('#rr-hurtigsjekk[data-guided="true"]')?null:countyCodes[city],regionControl=el("rrp-region");
 if(county&&regionControl&&regionControl.value!==county){
   regionControl.value=county;
   regionControl.dispatchEvent(new Event("change",{bubbles:true}));
   return;
 }
 const m=window.__rrpCurrent||{};
 const company=window.__rrpCompany||null;
 const wl=window.__rrpWorklife||null;
 const brandText=typeof wl?.brand_self_assessed==="number"?wl.brand_self_assessed+"/100":"Ikke vurdert (begge Brand-spørsmål må besvares)";
 const indexText=typeof wl?.index_self_assessed==="number"?wl.index_self_assessed+"/100":"Ikke vurdert (alle fire Index-spørsmål må besvares)";
 const job=m.occupation||{},area=m.area||{}, med=Number.isFinite(Number(job.median25))&&job.median25!=null?Number(job.median25):null;
 const offer=m.monthly_salary_offer!=null&&Number.isFinite(Number(m.monthly_salary_offer))?Number(m.monthly_salary_offer):null;
 const lack=(window.__rrpOccupationShortages||{})[job.code];
 const town=phrase(el("rrpd-town").value),place=town?(town+", "+(area.name||"valgt fylke")):(area.name||"valgt fylke");
 const qty=Math.max(1,Math.min(100,Math.round(Number(el("rrpd-count").value)||1)));
 const wished=el("rrpd-date").value;
 const shortage=lack&&Number.isFinite(lack.estimate)?("NAV anslår en nasjonal mangel på "+fmt(lack.estimate)+" personer i "+(job.name||"dette yrket")+". Dette sier ikke hvor mange som mangler i "+place+"."):"NAVs utvalgte yrkesspesifikke mangelanslag i denne dataversjonen gir ikke et tilstrekkelig tallgrunnlag for "+(job.name||"dette yrket")+". Manglende anslag betyr ikke at det er lett å rekruttere.";
 el("rrpd-shortage").textContent=lack&&Number.isFinite(lack.estimate)?fmt(lack.estimate)+" personer":"Ikke dokumentert for yrket";
 el("rrpd-shortage-detail").textContent=lack&&Number.isFinite(lack.estimate)?("NAV 2026 · landsanslag"+(Number.isFinite(lack.low)&&Number.isFinite(lack.high)?" · 95 % KI "+fmt(lack.low)+"–"+fmt(lack.high):"")+" · ikke lokalt"):"NAV 2026 · manglende yrkestall er ikke lik null mangel";
 let pay="Lønnstilbud er ikke oppgitt. Sammenlign den konkrete lønnsrammen med riktig nivå for ansvar, erfaring og geografi.";
 if(med!=null&&offer!=null&&offer>0){
  const diff=(offer/med-1)*100,ab=Math.round(Math.abs(diff));
  pay="Tilbudt månedslønn ("+money(offer)+") er "+(Math.abs(diff)<2?"omtrent lik":diff<0?ab+" % under":ab+" % over")+" den nasjonale medianen for yrket ("+money(med)+") i 2025. Dette alene dokumenterer ikke lokal markedslønn.";
  el("rrpd-pay").textContent=Math.abs(diff)<2?"Omtrent på landsmedian":diff<0?ab+" % under landsmedian":ab+" % over landsmedian";
 }else if(med!=null){el("rrpd-pay").textContent="Median "+money(med);pay="SSB oppgir en nasjonal median på "+money(med)+" for dette yrket i 2025. Du har ikke oppgitt lønnstilbud.";}
 else{el("rrpd-pay").textContent="Mangler sammenlignbare tall";pay="Nasjonal yrkesvis medianlønn er ikke publisert for denne yrkeskoden i vårt datasett.";}
 el("rrpd-pay-detail").textContent=med!=null?"SSB tabell 11418 · Norge · 2025 · ikke lokalt nivå":"SSB tabell 11418 · yrkestall ikke tilgjengelig";
 if(document.querySelector('#rr-hurtigsjekk[data-guided="true"]')){
  const base=m.salary_input?.measure==="base"?m.salary_input.offeredMonthlyBase:null;
  pay=base>0?"Tilbudt grunnlønn er "+money(base)+" per måned, oppgitt i hurtigsjekken. Lønnssammenligningen med riktig SSB-mål vises der. Grunnlønn sammenlignes ikke med samlet månedslønn i fordypningen.":"Tilbudt grunnlønn er ikke oppgitt. Legg eventuelt inn lønnsrammen i hurtigsjekken.";
  el("rrpd-pay").textContent=base>0?money(base)+" i grunnlønn":"Grunnlønn ikke oppgitt";
  el("rrpd-pay-detail").textContent="Lønnsvurderingen følger valgene i hurtigsjekken. Grunnlønn og samlet månedslønn er ulike mål.";
 }
 el("rrpd-local").textContent="Kandidattilgang ikke målt";
 el("rrpd-local-detail").textContent="Se observerte NAV-treff i hurtigsjekken. Antall kvalifiserte kandidater og faktisk rekrutteringstid er ikke målt for "+place+".";
 const controls=["area","criteria","flex","method"].map(k=>el("rrp-sim-"+k)?.value||"");
 const penalties={area:{local:2,regional:1,national:0},criteria:{strict:2,focused:1,equivalent:0},flex:{onsite:2,some:1,flexible:0},method:{ads:2,mixed:1,active:0}};
 const pts=controls.reduce((sum,v,i)=>sum+(penalties[["area","criteria","flex","method"][i]][v]??0),0);
 const confirmed=Boolean(el("rrp-diff-confirm")?.checked);
 const guided=Boolean(document.querySelector('#rr-hurtigsjekk[data-guided="true"]'));
 const chosenLabels=["area","criteria","flex","method"].map(k=>el("rrp-sim-"+k)?.selectedOptions?.[0]?.textContent||"").filter(Boolean);
 const restriction=!confirmed?"Rekrutteringsopplegget er ikke bekreftet. Standardvalgene brukes ikke som opplysninger om virksomheten.":guided?"Bekreftet opplegg: "+chosenLabels.join(". ")+". Kontroller at valgene passer oppgavene og kandidatmarkedet.":"Dere har valgt et rekrutteringsopplegg med "+pts+" av 8 illustrative hindringspoeng. Dette er ikke rekrutteringsrisiko. "+(pts>=5?"En bredere kandidatkartlegging, færre unødvendige krav eller mer aktivt søk bør vurderes før utlysning.":pts<=2?"Opplegget åpner for flere søkekanaler, men tilgang på kvalifiserte kandidater er fortsatt uavklart.":"Det er fortsatt noen selvvalgte begrensninger dere bør teste mot behovet.");
 const timing=wished?("Ønsket oppstart: "+new Date(wished+"T12:00:00").toLocaleDateString("nb-NO")+". Dette er en ønsket dato, ikke en beregnet ansettelsesprognose."):"Ingen ønsket oppstartsdato er lagt inn.";
 const companyContext=company?("For virksomheten "+company.name+" (org.nr. "+(company.organization_number||"ikke oppgitt")+"), registrert i næringen "+company.industry+" med "+(company.registered_employees==null?"ukjent registrert antall ansatte":company.registered_employees+" registrerte ansatte")+". "):"";
 const worklifeContext=wl?(" Arbeidsgiverens Worklife-egenvurdering: Brand "+brandText+", Index "+indexText+". "+(wl.all_dimensions_assessed?"Alle seks forhold er vurdert.":wl.assessed_dimensions+" av 6 forhold er vurdert. Ubesvarte startverdier er ikke observasjoner.")+" HR-støtte: "+wl.hr_support_text+". Ingen av disse tallene er validert mot rekrutteringsutfall. "):"";
 const intro=companyContext+worklifeContext+"For "+qty+" "+(qty===1?"ansettelse":"ansettelser")+" innen "+(job.name||"valgt yrke")+" i "+place+": "+shortage+" "+pay+" "+timing;
 el("rrpd-report-head").textContent=(job.name||"Valgt yrke")+" · "+place;
 el("rrpd-report-text").textContent=intro;
 el("rrpd-restriction").textContent=restriction;
 el("rrpd-step1").textContent="Fastsett oppgaver og ufravikelige kvalifikasjoner for "+(job.name||"rollen")+". Kontroller om tilbudt lønn og mulighet for kompetanseutvikling faktisk er konkurransedyktig i "+place+".";
 el("rrpd-step2").textContent=(qty>1?"Planlegg parallelle kandidatløp for "+qty+" ansettelser. ":"")+"Undersøk NAV-utlysninger i relevant yrke og område, og gjennomfør en målrettet markedskartlegging. Ikke bruk fylkets samlede stillingstall som antall direkte konkurrenter.";
 el("rrpd-step3").textContent="Registrer kvalifiserte kandidater, årsaker til frafall og tilbakemeldinger fra kandidater og nyansatte. Revider søk, lønn og krav, og kontroller at arbeidsplassens løfter kan følges opp etter ansettelse.";
 note=["RIDDERSET REKRUTTERING | BESLUTNINGSNOTAT","Datagrunnlag: NAV 2026 og SSB 2025. Utarbeidet: "+new Date().toLocaleDateString("nb-NO"),"","Yrke: "+(job.name||"Ikke valgt")+" / STYRK08 "+(job.code||"–"),"Arbeidssted: "+place,"Virksomhet: "+(company?company.name:"Ikke valgt"),"Organisasjonsnummer: "+(company?company.organization_number:"Ikke oppgitt"),"Bransje: "+(company?company.industry:"Ikke oppgitt"),"Registerført antall ansatte: "+(company?(company.registered_employees??"Ikke oppgitt"):"Ikke oppgitt"),"Registrert forretningsadresse / underenhet: "+(company?company.registered_address:"Ikke oppgitt"),"Antall ansettelser: "+qty,"","WORKLIFE · ARBEIDSGIVERS EGENVURDERING","Brand (ikke målt): "+brandText,"Index (ikke målt): "+indexText,"HR-støtte: "+(wl?wl.hr_support_text:"Ikke vurdert"),"Seks faktorer vurdert: "+(wl?wl.assessed_dimensions:"0")+"/6","Egenvurdering er ikke en validert Worklife-måling.","","Ønsket oppstart: "+(wished||"Ikke oppgitt"),"","YRKE OG ARBEIDSMARKED",shortage,"","LØNN",pay,"","REKRUTTERINGSOPPLEGG",restriction,"","30-DAGERS PLAN","Dag 1–7: "+el("rrpd-step1").textContent,"Dag 8–14: "+el("rrpd-step2").textContent,"Dag 15–30: "+el("rrpd-step3").textContent,"","FORBEHOLD","Dette er ikke en validert sannsynlighetsmodell. Worklife-scorene er arbeidsgiverens egne anslag, ikke uavhengige kandidat-/ansattmålinger eller prediktive faktorer. NAVs nasjonale anslag kan ikke lokaliseres uten regional yrkesdata. Lønn er SSBs nasjonale median, ikke lønnskrav i kommunen. 0–8 er illustrativt og er ikke et empirisk risikoestimat.","Kilder: https://www.ssb.no/statbank/table/11418 | https://www.nav.no/no/nav-og-samfunn/kunnskap/analyser-fra-nav/arbeid-og-velferd/arbeid-og-velferd/bedriftsundersokelsen","www.ridderset.no"].join("\n");
}
for(const id of ["rrpd-town","rrpd-count","rrpd-date"]){el(id).addEventListener("input",update);el(id).addEventListener("change",update);}
for(const id of ["rrp-region","rrp-offer","rrp-sim-area","rrp-sim-criteria","rrp-sim-flex","rrp-sim-method","rrp-diff-confirm"]){el(id)?.addEventListener("change",update);el(id)?.addEventListener("input",update);}
const chosen=el("rrp-selected");
if(chosen&&typeof MutationObserver!=="undefined"){new MutationObserver(update).observe(chosen,{childList:true,subtree:true,characterData:true});}
el("rrpd-build").addEventListener("click",()=>{update();el("rrpd-status").textContent="Vurderingen er oppdatert ut fra opplysningene over.";});
window.addEventListener("rrp-company-selected",update);
window.addEventListener("rrp-worklife-updated",update);
el("rrpd-download").addEventListener("click",()=>{update();try{const url=URL.createObjectURL(new Blob([note],{type:"text/plain;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download="ridderset-rekrutteringsvurdering.txt";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);el("rrpd-status").textContent="Vurderingen er lastet ned.";}catch(e){el("rrpd-status").textContent="Nedlasting ble blokkert av nettleseren. Prøv igjen.";}});
update();
})();
