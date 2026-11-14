import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {
  normalized,occupationMatches,worklifeScore,salaryComparison,companyFromRegistry,
  employerActions,buildReport,DIMENSIONS,money
} from "../../src/core.mjs";

const file=JSON.parse(await readFile(new URL("../../data/occupations.json",import.meta.url),"utf8"));
const occupations=file.occupations;

test("407 STYRK08 labels with explicit SSB snapshot metadata",()=>{
  assert.equal(occupations.length,407);
  assert.equal(file.verifiedLive,false);
  assert.equal(occupations.find(x=>x.code==="1221").median2025,89170);
});
test("searches common title salgsjef as STYRK08 1221",()=>{
  assert.equal(occupationMatches(occupations,"Salgsjef")[0].code,"1221");
});
test("searches ten common role aliases and occupational groups",()=>{
  const examples=["tømrer","sykepleier","elektriker","hr rådgiver","daglig leder","rekrutterer","kokk","salgsdirektør","regnskapsfører","sveiser"];
  for(const term of examples){
    assert.ok(occupationMatches(occupations,term).length>0,"No match for "+term);
  }
});
test("supports accent-agnostic Norwegian matching and numeric codes",()=>{
  assert.equal(normalized("SjøMAT / TØMRER"),"sjomat tomrer");
  assert.equal(occupationMatches(occupations,"1221")[0].code,"1221");
  assert.deepEqual(occupationMatches(occupations,""),[]);
});
test("keeps 0 registered employees distinct from unknown",()=>{
  const company={navn:"DEMO AS",organisasjonsnummer:"999999999",antallAnsatte:0,naeringskode1:{kode:"00.000",beskrivelse:"TEST"},forretningsadresse:{kommune:"HARSTAD"}};
  assert.equal(companyFromRegistry(company).employees,0);
  assert.equal(companyFromRegistry({...company,antallAnsatte:undefined}).employees,null);
});
test("normalizes registry units and location",()=>{
  const raw={navn:"DEMO SORTLAND",organisasjonsnummer:"999999998",overordnetEnhet:"999999999",naeringskode1:{kode:"00.000",beskrivelse:"TEST"},beliggenhetsadresse:{kommune:"SORTLAND",adresse:["Testveien"],postnummer:"8400",poststed:"SORTLAND"}};
  const out=companyFromRegistry(raw,"underenheter");
  assert.equal(out.unitType,"Underenhet");assert.equal(out.parentOrg,"999999999");
  assert.equal(out.municipality,"SORTLAND");assert.ok(out.address.includes("Testveien"));
});
test("rejects invalid register entities",()=>{
  assert.throws(()=>companyFromRegistry({organisasjonsnummer:"NOT AN ORG"}),/Ugyldig/);
});
test("Worklife untouched neutral values are not measurements",()=>{
  const values=Object.fromEntries(DIMENSIONS.map(x=>[x.key,5]));
  const w=worklifeScore(values,[]);
  assert.equal(w.brand,null);assert.equal(w.index,null);assert.equal(w.answered,0);
});
test("Worklife gives separate Brand and Index only when completed",()=>{
  const values={reputation:8,visibility:6,promise:7,onboarding:8,development:9,leadership:6};
  const w=worklifeScore(values,Object.keys(values));
  assert.equal(w.brand,73);assert.equal(w.index,77);
  assert.equal(w.allAnswered,true);assert.equal(w.selfReported,true);assert.equal(w.validated,false);
});
test("Worklife partial answer does not report full index score",()=>{
  const w=worklifeScore({reputation:8,visibility:6,development:7},["reputation","visibility","development"]);
  assert.equal(w.brand,73);assert.equal(w.index,null);assert.equal(w.answered,3);
});
test("salary comparison never assumes local pay or guesses missing values",()=>{
  assert.equal(salaryComparison(100000,110000),10);
  assert.equal(salaryComparison(100000,90000),-10);
  assert.equal(salaryComparison(null,90000),null);
  assert.equal(salaryComparison(0,90000),null);
  assert.equal(money(null),"Ikke tilgjengelig");
});
test("advice treats HR and self-reported risk as qualitative, not probabilities",()=>{
  const actions=employerActions({hr:"none",answers:{development:2},touched:["development"],salaryDelta:-10,worklife:{gap:null}});
  assert.ok(actions.some(x=>x.includes("HR")));
  assert.ok(actions.some(x=>x.includes("lønn")));
  assert.ok(actions.some(x=>x.includes("utviklingsplan")));
  assert.ok(actions.every(x=>!x.includes("% sannsynlighet")));
});
test("report contains provenance, source limitations and no null placeholders",()=>{
  const occupation=occupations.find(x=>x.code==="1221");
  const report=buildReport({
    company:{name:"DEMO AS",org:null,municipality:"Harstad",source:"Egenrapportert"},
    occupation,location:"Harstad",positions:2,offer:100000,
    answers:{},touched:[],hr:"shared",
    worklife:worklifeScore({},[])
  });
  assert.ok(report.includes("Salgs- og markedssjefer"));
  assert.ok(report.includes("SSB tabell 11418"));
  assert.ok(report.includes("NAV"));
  assert.ok(report.includes("Ikke oppgitt"));
  assert.ok(!report.includes("null"));
  assert.ok(!report.includes("ansettelsessannsynlighet: 75"));
});
