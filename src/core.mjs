/* Ridderset Innsikt – pure calculations and mappings; no network or DOM. */
export const DIMENSIONS = [
  { key:"reputation",label:"Omdømme i kandidatmarkedet",group:"brand",hint:"Hvor attraktiv oppleves virksomheten av relevante kandidater?" },
  { key:"visibility",label:"Synlighet og troverdighet",group:"brand",hint:"Finner kandidater et realistisk bilde av arbeidsmiljø og muligheter?" },
  { key:"promise",label:"Samsvar mellom løfter og virkelighet",group:"index",hint:"Får nyansatte det de ble lovet i utlysning og intervju?" },
  { key:"onboarding",label:"Oppstart og integrering",group:"index",hint:"Får nyansatte struktur, støtte og oppfølging?" },
  { key:"development",label:"Utvikling og mestring",group:"index",hint:"Blir kompetanse og karrieremuligheter fulgt opp?" },
  { key:"leadership",label:"Ledelse og oppfølging",group:"index",hint:"Gir lederne jevnlig tilbakemelding og tydelig retning?" }
];
export const HR_OPTIONS = {
  unknown:"Ikke avklart",
  dedicated:"Egen HR-avdeling eller dedikert HR-ressurs",
  shared:"HR fordelt mellom leder og administrasjon",
  external:"Ekstern HR-partner",
  both:"Både intern HR og ekstern støtte",
  none:"Ingen etablert HR-støtte"
};
export const REGIONS = [
  {code:"18",name:"Nordland"},{code:"55",name:"Troms"},{code:"56",name:"Finnmark"},
  {code:"other",name:"Andre fylker – markedsstatistikk avventer"}
];
export const ALIASES = {
  "1120":["daglig leder","administrerende direktør","ceo","toppsjef"],
  "1211":["økonomisjef","cfo","finansdirektør"],
  "1212":["hr sjef","hr leder","hr direktør","personalsjef"],
  "1221":["salgsjef","salgsdirektør","markedsdirektør","markedssjef","salgsleder","kommersiell leder"],
  "1323":["prosjektleder bygg","byggeleder","anleggsleder"],
  "1312":["oppdrettssjef","driftsleder havbruk"],
  "1330":["it sjef","it leder","teknologisjef"],
  "1420":["butikksjef"],
  "2423":["hr rådgiver","personalrådgiver","rekrutterer","karriererådgiver"],
  "2431":["markedsfører","markedsføringsrådgiver"],
  "2514":["programvareutvikler","utvikler","programmerer"],
  "3112":["byggingeniør","prosjektingeniør"],
  "3123":["arbeidsleder anlegg","bas","formann bygg"],
  "3313":["regnskapsfører"],
  "5120":["kokk"],
  "5321":["helsefagarbeider","hjelpepleier"],
  "7115":["tømrer","snekker"],
  "7212":["sveiser"],
  "7233":["industrimekaniker"],
  "7411":["elektriker","elektromontør"],
  "8342":["anleggsmaskinfører","gravemaskinfører"],
  "2223":["sykepleier"]
};
export function normalized(value) {
  return String(value??"").toLocaleLowerCase("nb-NO").normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"").replace(/æ/g,"ae").replace(/ø/g,"o").replace(/å/g,"a")
    .replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim();
}
export function occupationMatches(occupations, query, limit=12) {
  const term=normalized(query);
  if(!term) return [];
  const matches=[];
  for(const occupation of occupations) {
    const title=normalized(occupation.name);
    const aliases=(ALIASES[occupation.code]||[]).map(normalized);
    let score=0;
    if(occupation.code===query.trim())score=100;
    else if(title===term)score=95;
    else if(aliases.includes(term))score=90;
    else if(title.startsWith(term))score=78;
    else if(title.includes(term))score=62;
    else if(aliases.some(alias=>alias.includes(term)))score=55;
    else if(term.split(" ").every(part=>title.includes(part)||aliases.some(x=>x.includes(part))))score=35;
    if(score)matches.push({occupation,score});
  }
  return matches.sort((a,b)=>b.score-a.score||a.occupation.name.localeCompare(b.occupation.name,"nb-NO"))
    .slice(0,limit).map(({occupation})=>occupation);
}
export function money(value) {return typeof value==="number"&&Number.isFinite(value)?new Intl.NumberFormat("nb-NO",{maximumFractionDigits:0}).format(value)+" kr":"Ikke tilgjengelig";}
export function percentage(value) {return typeof value==="number"&&Number.isFinite(value)?new Intl.NumberFormat("nb-NO",{maximumFractionDigits:1}).format(value)+" %":"Ikke tilgjengelig";}
export function validScore(value) {return typeof value==="number"&&Number.isFinite(value)&&value>=0&&value<=10;}
export function worklifeScore(answers, touched=[]) {
  const seen=new Set(touched);
  const filled=DIMENSIONS.filter(x=>seen.has(x.key)&&validScore(answers[x.key]));
  const weights={reputation:.65,visibility:.35,promise:.35,onboarding:.20,development:.30,leadership:.15};
  const sum=keys=>Math.round(keys.reduce((total,k)=>total+Number(answers[k])*weights[k],0)*10);
  const brandComplete=["reputation","visibility"].every(x=>seen.has(x)&&validScore(answers[x]));
  const indexComplete=["promise","onboarding","development","leadership"].every(x=>seen.has(x)&&validScore(answers[x]));
  return {
    answered:filled.length,expected:DIMENSIONS.length,
    brand:brandComplete?sum(["reputation","visibility"]):null,
    index:indexComplete?sum(["promise","onboarding","development","leadership"]):null,
    allAnswered:filled.length===DIMENSIONS.length,
    selfReported:true,validated:false,
    gap:brandComplete&&indexComplete?sum(["reputation","visibility"])-sum(["promise","onboarding","development","leadership"]):null
  };
}
export function salaryComparison(median, offered) {
  if(typeof median!=="number"||median<=0||typeof offered!=="number"||offered<=0)return null;
  return Math.round((offered/median-1)*1000)/10;
}
export function companyFromRegistry(raw,kind="enheter") {
  if(!raw||typeof raw!=="object"||!/^\d{9}$/.test(String(raw.organisasjonsnummer||"")))throw new Error("Ugyldig virksomhetsdata.");
  const address=raw.beliggenhetsadresse||raw.forretningsadresse||raw.postadresse||{};
  const people=typeof raw.antallAnsatte==="number"&&Number.isFinite(raw.antallAnsatte)?raw.antallAnsatte:null;
  return {
    name:raw.navn||"Navn mangler",org:raw.organisasjonsnummer,unitType:kind==="underenheter"?"Underenhet":"Hovedenhet",
    parentOrg:raw.overordnetEnhet||null,industry:raw.naeringskode1?.beskrivelse||"Ikke oppgitt",
    industryCode:raw.naeringskode1?.kode||null,employees:people,
    employeeCountSource:people===null?"ikke-oppgitt":"register",
    municipality:address.kommune||"Ikke oppgitt",municipalityNumber:address.kommunenummer||null,
    address:[...(Array.isArray(address.adresse)?address.adresse:[]),[address.postnummer,address.poststed].filter(Boolean).join(" ")].filter(Boolean).join(", ")||"Ikke oppgitt",
    source:"Brønnøysundregistrene / Enhetsregisteret",reported:false
  };
}
export function employerActions({worklife,answers={},touched=[],hr="unknown",salaryDelta=null,occupation=null}={}) {
  const actions=[];
  if(salaryDelta!==null&&salaryDelta<0)actions.push("Undersøk om lønnstilbudet er konkurransedyktig for ansvaret og regionen. Nasjonal median er ikke lokal lønnsfasit.");
  const weak=DIMENSIONS.filter(d=>touched.includes(d.key)&&validScore(answers[d.key])).sort((a,b)=>answers[a.key]-answers[b.key]);
  const suggestions={
    reputation:"Undersøk hva relevante kandidater faktisk forbinder med virksomheten, ikke bare hvordan dere selv oppfatter omdømmet.",
    visibility:"Vis realistiske medarbeiderhistorier, ansvar, lønnsspenn og utviklingsmuligheter i kandidatreisen.",
    promise:"Sammenlign det dere lover i annonser og intervjuer, med det nye medarbeidere faktisk opplever.",
    onboarding:"Innfør planlagt oppstart og ledersamtaler med tydelige milepæler de første månedene.",
    development:"Gi ansatte dokumenterte utviklingsplaner og følg dem opp over tid.",
    leadership:"Etabler tydelige forventninger og fast lederoppfølging etter ansettelse."
  };
  for(const dim of weak.slice(0,2))if(answers[dim.key]<=6)actions.push(suggestions[dim.key]);
  if(hr==="unknown"||hr==="none"||hr==="shared")actions.push("Utpek ansvarlig for jobbanalyse, kandidatsøk, intervju, seleksjon og oppfølging. Vurder ekstern HR-støtte ved kapasitetsmangel.");
  if(worklife?.gap!==null&&worklife?.gap>25)actions.push("Undersøk avstanden mellom virksomhetens omdømme utad og egenrapportert medarbeideropplevelse før nye løfter gis.");
  actions.push("Kartlegg antall relevante kandidater og konkurrerende arbeidsgivere i riktig geografisk marked før krav og rekrutteringskanaler fastsettes.");
  actions.push("Følg kvalifiserte henvendelser, frafall og kandidatrespons gjennom prosessen. Endre tiltak når dere har egne observasjoner.");
  return [...new Set(actions)].slice(0,5);
}
export function buildReport(state) {
  const {company=null,occupation=null,location="",positions=1,offer=null,worklife=null,answers={},touched=[],hr="unknown",source=null}=state;
  const comparison=salaryComparison(occupation?.median2025,offer);
  const actions=employerActions({worklife,answers,touched,hr,salaryDelta:comparison,occupation});
  const companyName=company?.name||"Ikke valgt";
  const lines=[
    "RIDDERSET REKRUTTERINGSINNSIKT | BESLUTNINGSNOTAT",
    "Dato: "+new Date().toLocaleDateString("nb-NO"),
    "Status: faglig beslutningsstøtte, IKKE statistisk validert prognose",
    "",
    "BEDRIFT OG STILLING",
    "Virksomhet: "+companyName,
    "Organisasjonsnummer: "+(company?.org||"Ikke oppgitt"),
    "Kilde bedriftsdata: "+(company?.source||"Ikke oppgitt"),
    "Arbeidssted: "+(location||company?.municipality||"Ikke oppgitt"),
    "Yrke: "+(occupation?occupation.name+" (STYRK08 "+occupation.code+")":"Ikke valgt"),
    "Antall ønskede ansettelser: "+positions,
    "",
    "ARBEIDSMARKED OG LØNN",
    "Nasjonal median månedslønn 2025: "+money(occupation?.median2025),
    "Tilbudt månedslønn: "+money(offer),
    "Avvik fra nasjonal median: "+(comparison===null?"Ikke beregnbart":percentage(comparison)),
    "Kilde: SSB tabell 11418, historisk datasnapshot. Ikke oppdatert live i denne versjonen.",
    "NAV stilling-feed / aktive yrkesvise stillingsannonser: Ikke integrert, ikke 0.",
    "",
    "WORKLIFE OG KAPASITET",
    "Egenvurdert Brand (kun fullstendig besvart): "+(worklife?.brand===null||worklife?.brand===undefined?"Ikke fullført":worklife.brand+"/100"),
    "Egenvurdert Index (kun fullstendig besvart): "+(worklife?.index===null||worklife?.index===undefined?"Ikke fullført":worklife.index+"/100"),
    "Spørsmål besvart: "+(worklife?.answered||0)+" av 6",
    "HR-støtte: "+(HR_OPTIONS[hr]||HR_OPTIONS.unknown),
    "Kilde: arbeidsgiverens egenvurdering, ikke uavhengig Worklife-måling.",
    "",
    "PRIORITERTE TILTAK",
    ...actions.map((x,i)=>(i+1)+". "+x),
    "",
    "OPPFØLGINGSPLAN",
    "Innen 30 dager: bekreft rolle, krav, lønn, geografisk marked og rekrutteringskapasitet.",
    "Innen 60 dager: evaluer kandidatrespons og tiltak; dokumenter årsakene til eventuelt frafall.",
    "Innen 90 dager: gjennomfør erfaringsoverføring og følg opp lederansvar og nyansattes forventninger.",
    "",
    "Forbehold: arbeidsmarkedsdata og selvrapporterte opplysninger må holdes adskilt. Ingen estimert ansettelsessannsynlighet eller ansettelsestid.",
  ];
  return lines.join("\n");
}
