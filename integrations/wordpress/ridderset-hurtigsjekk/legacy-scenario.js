(function(){
"use strict";
const root=document.getElementById("rrp-v02");if(!root)return;
const $=id=>document.getElementById(id);
const labels={
area:{local:"Kun lokalt",regional:"Innenfor regionen",national:"Nasjonalt / mulighet for flytting"},
criteria:{strict:"Mange absolutte krav",focused:"Kun tydelig dokumenterte må-krav",equivalent:"Realkompetanse og utviklingsmulighet vurderes"},
flex:{onsite:"Fast arbeidssted og oppmøte",some:"Noe fleksibilitet i arbeidstid / reise",flexible:"Fleksibilitet der oppgavene tillater det"},
method:{ads:"Kun stillingsannonse",mixed:"Annonse og nettverksarbeid",active:"Aktivt søk med målrettet kandidatdialog"}};
const pts={area:{local:2,regional:1,national:0},criteria:{strict:2,focused:1,equivalent:0},flex:{onsite:2,some:1,flexible:0},method:{ads:2,mixed:1,active:0}};
const ids=["area","criteria","flex","method"];
function calc(){const chosen=Object.fromEntries(ids.map(k=>[k,$("rrp-sim-"+k).value]));return {chosen,points:ids.reduce((n,k)=>n+pts[k][chosen[k]],0)};}
function actions(chosen){
const options=[];
if(chosen.criteria==="strict")options.push("Gå gjennom må-kravene med fagansvarlig. Behold bare krav som er nødvendige for å utføre oppgavene.");
else if(chosen.criteria==="focused")options.push("Vurder om dokumentert realkompetanse kan dekke deler av kompetansebehovet.");
else options.push("Beskriv hva kandidaten må beherske ved oppstart, og hva som kan læres etter ansettelse.");
if(chosen.area==="local")options.push("Test en regional kartlegging før dere konkluderer med at kandidatmarkedet er for lite.");
else if(chosen.area==="regional")options.push("Undersøk om pendling, flytting eller nasjonalt søk kan gi relevante kandidater.");
else options.push("Sett av tid til å avklare reise, flytting og lokalt nettverk når dere søker nasjonalt.");
if(chosen.method==="ads")options.push("Kontroller om annonsen når den aktuelle målgruppen. Vurder nettverk eller direkte kandidatkontakt når kartleggingen viser behov for det.");
else if(chosen.method==="mixed")options.push("Lag en konkret plan for hvem dere skal kontakte aktivt, og hvilke nettverk dere skal bruke.");
else options.push("Definer relevante fagmiljøer og en strukturert plan for direkte kandidatkontakt.");
if(chosen.flex==="onsite")options.push("Undersøk om noe fleksibilitet er mulig uten at arbeidets kvalitet eller sikkerhet svekkes.");
else if(chosen.flex==="some")options.push("Tydeliggjør hvilken fleksibilitet dere faktisk kan tilby, og hvor grensene går.");
else options.push("Beskriv fleksibiliteten presist i stillingsprofilen, ikke som et uforpliktende løfte.");
return options.slice(0,3);
}
function buildMemo(result,actionsList){
const current=window.__rrpCurrent||{};
const occupation=current.occupation?.name||"Yrke ikke oppgitt";
const county=current.area?.name||"Fylke ikke oppgitt";
const sal=current.occupation?.median25;
const offer=current.monthly_salary_offer;
const base=current.salary_input?.measure==="base"?current.salary_input.offeredMonthlyBase:null;
const guided=Boolean(document.querySelector('#rr-hurtigsjekk[data-guided="true"]'));
if(!$("rrp-diff-confirm")?.checked)return ["RIDDERSET | REKRUTTERINGSOPPLEGG","Yrke: "+occupation,"Område: "+county,"Rekrutteringsopplegget er ikke bekreftet. Standardvalgene inngår ikke i vurderingen."].join("\n");
return ["RIDDERSET | REKRUTTERINGSPROGNOSE | BESLUTNINGSNOTAT","Dato: "+new Date().toLocaleDateString("nb-NO"),"Yrke: "+occupation+" / STYRK08 "+(current.occupation?.code||"—"),"Område: "+county,"SSB median månedslønn 2025 (Norge): "+(sal==null?"Ikke publisert":new Intl.NumberFormat("nb-NO").format(sal)+" kr"),(guided?"Tilbudt grunnlønn: "+(base==null?"Ikke oppgitt":new Intl.NumberFormat("nb-NO").format(base)+" kr per måned. Vurderes mot grunnlønn i hurtigsjekken, ikke mot samlet månedslønn."):"Tilbudt månedslønn: "+(offer==null?"Ikke oppgitt":new Intl.NumberFormat("nb-NO").format(offer)+" kr")),"","VALGT REKRUTTERINGSOPPLEGG",...ids.map(k=>"- "+labels[k][result.chosen[k]]),"",(guided?"BEKREFTET REKRUTTERINGSOPPLEGG":"ILLUSTRATIV VURDERING AV SELVVALGTE BEGRENSNINGER"),(guided?"Rådene nedenfor bygger på bekreftede valg, ikke en totalskår eller prognose.":result.points+" av 8 indikatorpoeng (startoppsett 8). Ikke en risiko- eller sannsynlighetsmodell."),"","TRE FØRSTE TILTAK",...actionsList.map((v,i)=>(i+1)+". "+v),"","FORBEHOLD: SSB-tall gjelder landsgjennomsnitt og 2025. NAVs regionale tall gjelder fylkesnivå og er ikke yrkesspesifikke. Hindringsmodellen er kvalitativ og ikke validert mot faktisk tid til ansettelse eller antall søkere.","Kilder: https://www.ssb.no/statbank/table/11418 og https://www.nav.no/no/nav-og-samfunn/kunnskap/analyser-fra-nav/arbeid-og-velferd/arbeid-og-velferd/bedriftsundersokelsen"].join("\n");
}
let memo="";
const guided=Boolean(document.querySelector('#rr-hurtigsjekk[data-guided="true"]'));
function update(){
const state=calc(),confirmed=Boolean($("rrp-diff-confirm")?.checked);
const steps=confirmed?actions(state.chosen):[];
const tag=$("rrp-sim-tag"),title=$("rrp-sim-title"),desc=$("rrp-sim-description");
tag.textContent=!confirmed?"Ikke bekreftet":guided?"Bekreftede valg":state.points===8?"Startprofil":state.points<=2?"Færre selvvalgte hindringer":"Endret opplegg";
title.textContent=!confirmed?"Gå gjennom valgene før de brukes":guided?"Tiltak ut fra rekrutteringsopplegget":state.points>=6?"Flere selvvalgte begrensninger":state.points>=3?"Noen begrensninger kan fortsatt reduseres":"Færre selvvalgte hindringer i opplegget";
const changed=8-state.points;
desc.textContent=!confirmed?"Standardvalgene er eksempler. Juster feltene og bekreft at de beskriver rekrutteringen deres.":guided?"Rådene bygger på valgene dere har bekreftet. De beskriver hva dere kan gjøre, ikke sannsynligheten for å lykkes.":changed>0?"Du har redusert antallet illustrative hindringspoeng med "+changed+" fra startprofilen. Det kan gi flere muligheter i kandidatsøket, men sier ikke hvor mange kvalifiserte kandidater som faktisk finnes.":"Startopplegget er relativt snevert. Test bredere søkeområde, mer presise krav, fleksibilitet eller aktivt kandidatsøk for å se alternative grep.";
$("rrp-sim-progress").style.width=(state.points/8*100).toFixed(1)+"%";
$("rrp-sim-points").textContent=confirmed?String(state.points):"Ikke bekreftet";
const bars=root.querySelector(".rrp-sim-bars");
if(bars){bars.hidden=guided||!confirmed;bars.style.display=bars.hidden?"none":"";}
$("rrp-sim-copy").disabled=!confirmed;
const grid=$("rrp-sim-steps");grid.replaceChildren();
for(const step of steps){const card=document.createElement("article");card.textContent=step;grid.appendChild(card);}
memo=buildMemo(state,steps);
if(window.__rrpCurrent)window.__rrpCurrent.recruitment_scenario={source:"Ridderset kvalitativ hindringsmodell v0.3 – ikke validert",confirmed,choices:confirmed?state.chosen:null,illustrative_points:confirmed?state.points:null,illustrative_start_points:confirmed?8:null,advice:steps,note:"Poeng er ikke en empirisk eller regional rekrutteringsprognose."};
window.dispatchEvent(new CustomEvent("rrp-scenario-updated",{detail:window.__rrpCurrent?.recruitment_scenario||null}));
}
for(const k of ids){
 const changed=()=>{const confirmation=$("rrp-diff-confirm");if(confirmation)confirmation.checked=false;update();};
 $("rrp-sim-"+k).addEventListener("input",changed);
 $("rrp-sim-"+k).addEventListener("change",changed);
}
$("rrp-diff-confirm")?.addEventListener("change",update);
const selected=$("rrp-selected");if(selected&&"MutationObserver" in window){new MutationObserver(update).observe(selected,{childList:true,characterData:true,subtree:true});}
$("rrp-region").addEventListener("change",update);
$("rrp-offer").addEventListener("input",update);
$("rrp-sim-copy").addEventListener("click",async()=>{
if(!$("rrp-diff-confirm")?.checked){$("rrp-sim-status").textContent="Bekreft rekrutteringsvalgene før du kopierer notatet.";return;}
try{if(navigator.clipboard&&navigator.clipboard.writeText){await navigator.clipboard.writeText(memo);}else{
const ta=document.createElement("textarea");ta.value=memo;document.body.appendChild(ta);ta.select();document.execCommand("copy");ta.remove();}
$("rrp-sim-status").textContent="Beslutningsnotatet er kopiert.";}
catch(e){$("rrp-sim-status").textContent="Kopiering ble blokkert av nettleseren. Bruk Eksporter JSON nedenfor.";}
});
update();
})();
