(() => {
  'use strict';
  const root = document.getElementById('rr-hurtigsjekk');
  if (!root || root.dataset.ready) return;
  root.dataset.ready = 'true';
  const core = window.RRHCore;
  const $ = id => root.querySelector('#rrh-' + id);
  const nf = new Intl.NumberFormat('nb-NO');
  const pf = new Intl.NumberFormat('nb-NO', {maximumFractionDigits:1});
  let catalog, survey, companySeq=0, unitSeq=0, revision=0, contextRevision=0, timer, companyController, resultController;
  let manual=false, restoring=false;
  const storageKey='ridderset-recruitment-context-v1';
  let state = {company:null, main:null, units:[], role:null, town:'', nav:null, pay:null, indicator:null};
  const asset = name => new URL(name, new URL(root.dataset.assets, location.href));
  const endpoint = (base, path, params={}) => {
    const u = new URL(path, new URL(base, location.href));
    Object.entries(params).forEach(([k,v]) => u.searchParams.set(k,String(v)));
    return u;
  };
  const api = (path,params,signal) => read(endpoint(root.dataset.api,path,params),signal);
  const market = (path,params,signal) => read(endpoint(root.dataset.marketApi,path,params),signal);
  async function read(url,signal) {
    const response=await fetch(url,{headers:{Accept:'application/json'},signal,credentials:'omit'});
    if(!response.ok)throw new Error('source-unavailable');
    return response.json();
  }
  function el(tag,text,cls) {
    const node=document.createElement(tag);
    if(text!==undefined)node.textContent=text;
    if(cls)node.className=cls;
    return node;
  }
  function link(text,href) {
    const a=el('a',text);a.href=href;a.target='_blank';a.rel='noopener noreferrer';return a;
  }
  function option(value,text){const o=el('option',text);o.value=value;return o;}
  function number(value){return typeof value==='number' && Number.isFinite(value);}
  function date(value){if(!value)return 'ukjent dato';const d=new Date(value);return Number.isNaN(d.getTime())?'ukjent dato':d.toLocaleString('nb-NO',{timeZone:'Europe/Oslo',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});}
  function openStep(step){
    const ids={company:'rrh-start',role:'rrh-role-step',result:'rrh-result',advanced:'grundig-analyse',market:'markedstall'};
    const section=document.getElementById(ids[step]);
    if(!section || section.hidden)return false;
    if(section.tagName==='DETAILS')section.open=true;
    const heading=section.querySelector('h2,summary,input');
    if(heading){heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});}
    section.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    window.dispatchEvent(new CustomEvent('rrh-open-step',{detail:{step}}));
    return true;
  }
  window.RRHFlow=Object.freeze({openStep});
  function updateGuide(){
    const hasStart=Boolean(state.company||manual),complete=Boolean(state.role&&catalog?.towns[state.town]);
    $('step-role').disabled=!hasStart;$('step-result').disabled=!complete;
    const current=complete?'result':hasStart?'role':'company';
    for(const step of ['company','role','result']){
      const button=$('step-'+step);button.removeAttribute('aria-current');
      if(step===current)button.setAttribute('aria-current','step');
    }
    $('guide-status').textContent=complete?'Valgene dine følger med videre i analysen.':hasStart?'Neste: velg rollen og kontroller arbeidsstedet.':'Velg bedrift én gang. Vi tar valgene med videre.';
    const next=$('company-next');if(next)next.textContent=complete?'Se vurderingen':'Neste: velg rolle';
    $('reset').hidden=!hasStart;
  }
  function publishContext(){
    if(restoring||!catalog)return;
    const raw=$('offer').value;
    const context=window.RRHContext.create({state,catalog,sector:$('sector').value,
      offeredMonthlyBase:raw&&$('offer').checkValidity()?Number(raw):null,
      searchTerm:state.role?marketTerm(state.role):'',revision:++contextRevision,manual});
    if(!context)return;
    window.__rrhContext=context;
    updateGuide();
    try{
      if(state.company||manual)sessionStorage.setItem(storageKey,window.RRHContext.serialize(context));
      else sessionStorage.removeItem(storageKey);
    }catch{}
    window.dispatchEvent(new CustomEvent('rrh-context-changed',{detail:context}));
  }
  function clearResult(){
    revision++;resultController?.abort();state.nav=null;state.pay=null;state.indicator=null;
    $('result').hidden=true;$('commute').replaceChildren();$('offer-comparison').textContent='';
    $('commute-btn').disabled=false;
  }
  function resetCompany(notify=true){
    clearTimeout(timer);++unitSeq;clearResult();state={company:null,main:null,units:[],role:null,town:'',nav:null,pay:null,indicator:null};
    manual=false;
    $('company-summary').hidden=true;$('unit-wrap').hidden=true;$('role-step').hidden=true;
    $('company-form').hidden=false;$('manual').hidden=false;$('search-title').textContent='Hvilken bedrift gjelder det?';
    $('company-results').replaceChildren();$('role-results').replaceChildren();$('role-search').value='';$('town').value='';
    $('offer').value='';$('sector').value='ALLE';
    if(notify)publishContext();
  }
  async function searchCompany(){
    if(!catalog)return;
    clearTimeout(timer);const q=$('company').value.trim();
    const ticket=++companySeq;companyController?.abort();companyController=new AbortController();
    $('company-results').replaceChildren();
    if(q.length<2){$('company-status').textContent='Skriv minst to tegn.';return;}
    $('company-status').textContent='Søker i Brønnøysundregistrene …';
    try {
      const data=await api('companies',{q,kind:$('search-units').checked?'underenheter':'enheter'},companyController.signal);
      if(ticket!==companySeq)return;
      const rows=Array.isArray(data.companies)?data.companies:[];
      $('company-status').textContent=rows.length?'Velg riktig bedrift eller avdeling.':'Ingen treff. Prøv et annet navn, eller start med rolle og kommune.';
      for(const row of rows){
        const b=el('button',row.name);b.type='button';
        b.append(el('small',[row.townName||'Arbeidskommune ikke oppgitt','Org.nr. '+row.org,row.industry].filter(Boolean).join(' · ')));
        b.addEventListener('click',()=>selectCompany(row));$('company-results').append(b);
      }
      if(data.hasMore)$('company-results').append(el('p','Det finnes flere treff. Skriv et mer presist navn.','rrh-meta'));
    }catch(e){if(ticket===companySeq && e.name!=='AbortError')$('company-status').textContent='Bedriftsregisteret svarer ikke akkurat nå. Prøv igjen, eller start med rolle og kommune.';}
  }
  function companySummary(){
    const c=state.company,box=$('company-summary');box.replaceChildren();box.hidden=false;
    box.append(el('p',c.name,'rrh-company-name'));
    box.append(el('p',[c.townName||'Kommune ikke oppgitt',c.industry||'Bransje ikke oppgitt'].join(' · '),'rrh-company-facts'));
    const details=el('details');details.append(el('summary','Se registrerte bedriftsopplysninger'));
    const facts=el('p',[
      'Org.nr. '+c.org,
      number(c.employees)?nf.format(c.employees)+' registrerte ansatte (personer, ikke årsverk)':'Antall ansatte er ikke offentlig oppgitt',
      c.address||'Registrert arbeidsadresse mangler',
      c.industryCode?'Næringskode '+c.industryCode:null
    ].filter(Boolean).join(' · '),'rrh-meta');details.append(facts);
    details.append(el('p','Brønnøysundregistrene. Hentet '+date(c.retrievedAt)+'.','rrh-meta'));
    box.append(details);
    const change=el('button','Bytt bedrift','rrh-textbutton');change.type='button';
    change.onclick=()=>{resetCompany();$('company').value='';$('company-status').textContent='';$('company').focus();};
    const actions=el('div',undefined,'rrh-company-actions');
    const next=el('button',state.role?'Se vurderingen':'Neste: velg rolle');next.id='rrh-company-next';next.type='button';
    next.onclick=()=>openStep(state.role&&state.town?'result':'role');actions.append(change,next);box.append(actions);
  }
  async function selectCompany(c){
    ++companySeq;companyController?.abort();resetCompany(false);state.company=c;state.main=c;
    $('company-form').hidden=true;$('manual').hidden=true;$('company-results').replaceChildren();$('company-status').textContent='';
    $('search-title').textContent='Valgt bedrift';companySummary();populateRoles(c);
    if(c.kind==='underenheter')return;
    const ticket=++unitSeq;$('unit-status').textContent='Ser etter avdelinger …';
    try{
      const data=await api('units',{org:c.org});if(ticket!==unitSeq)return;
      state.units=(data.companies||[]).filter(u=>u.org!==c.org);
      publishContext();
      if(!state.units.length)return;
      const select=$('unit');select.replaceChildren(option('','Hovedadresse: '+(c.townName||c.name)));
      for(const u of state.units)select.append(option(u.org,u.name+' · '+(u.townName||'Ukjent kommune')));
      $('unit-wrap').hidden=false;$('unit-status').textContent=data.hasMore?'Viser inntil 100 avdelinger. Søk etter avdelingsnavnet hvis den mangler.':'Velg avdeling dersom jobben gjelder et annet arbeidssted.';
    }catch{if(ticket===unitSeq){$('unit-wrap').hidden=false;$('unit').replaceChildren(option('','Hovedadresse: '+(c.townName||c.name)));$('unit-status').textContent='Kunne ikke hente avdelingene. Arbeidskommunen kan endres under rollevalget.';}}
  }
  function populateRoles(c,keepRole=false){
    const role=keepRole?state.role:null;
    if(!keepRole)$('offer').value='';
    clearResult();state.role=role;$('role-step').hidden=false;$('role-results').replaceChildren();$('role-search').value='';$('role-status').textContent='';
    state.town=c?.town && catalog.towns[c.town]?c.town:'';$('town').value=state.town;
    $('town-origin').textContent=state.town?'fra bedriftsregisteret':'';
    const suggestions=c?core.suggestRoles(c,catalog.roles):[];
    $('role-suggestions').replaceChildren();
    $('role-reason').textContent=suggestions.length?'Forslag ut fra registrert bransje. Velg rollen dere vil undersøke.':'Velg en rolle. Vi har ikke et godt nok bransjegrunnlag til å foreslå den automatisk.';
    $('role-heading').textContent=c?'Hva kan neste behov være?':'Hvilken rolle gjelder det?';
    for(const role of suggestions){
      const b=el('button',role.label);b.type='button';b.dataset.code=role.code;b.setAttribute('aria-pressed','false');
      b.append(el('small','Bransjebasert forslag'));b.onclick=()=>chooseRole(role,true);$('role-suggestions').append(b);
    }
    $('other-role').open=!suggestions.length;
    if(role)chooseRole(role,false);else publishContext();
  }
  function chooseRole(role,scroll){
    if(state.role?.code!==role.code)$('offer').value='';
    state.role=role;
    root.querySelectorAll('[data-code]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.code===role.code)));
    $('role-status').textContent='Valgt: '+role.label+'.';
    if(!state.town){clearResult();publishContext();$('role-status').textContent+=' Velg arbeidskommune for å se vurderingen.';$('town').focus();return;}
    analyse(scroll);
  }
  function drawIndicator(){
    let indicator;
    try{indicator=core.nationalIndicator(state.role.code,survey);}catch{indicator={status:'unknown',score:null,reason:'Vi kunne ikke lese datagrunnlaget.'};}
    state.indicator=indicator;
    const score=indicator.score,hasScore=indicator.status==='available' && number(score);
    const out=$('score-output');out.replaceChildren();
    if(hasScore){
      const line=el('div',undefined,'rrh-scoreline'),num=el('div',String(score),'rrh-scorevalue');num.append(el('span',' / 10'));
      const text=el('div');text.append(el('h4',score<=3?'Større nasjonalt mangelpress':score<=6?'Middels nasjonalt mangelpress':'Mindre nasjonalt mangelpress'));
      text.append(el('p',indicator.ci95?.low===0?'Foreløpig indikator. Mangelanslaget har stor usikkerhet.':'Foreløpig indikator basert på NAVs bedriftsundersøkelse.'));line.append(num,text);out.append(line);
    }else{out.append(el('p','For lite grunnlag til en skår','rrh-no-score'),el('p','Se lønn og lokale utlysninger nedenfor. Manglende skår betyr ikke at rekrutteringen er enkel.','rrh-muted'));}
    const scale=root.querySelector('.rrh-scale');scale.classList.toggle('is-unknown',!hasScore);
    [...scale.children].forEach((s,i)=>s.classList.toggle('is-current',hasScore && i+1===score));
    const evidence=$('score-evidence');evidence.replaceChildren();
    evidence.append(el('p','Yrkesgruppe: '+catalog.roles[state.role.code][0]+' · STYRK-08 '+state.role.code+'.','rrh-meta'));
    const row=survey?.occupations?.find(r=>r.code===state.role.code);
    if(row){
      if(number(row.tightness_percent))evidence.append(el('p','NAVs nasjonale stramhetsindikator: '+pf.format(row.tightness_percent)+' %.','rrh-meta'));
      if(number(row.shortage_estimate))evidence.append(el('p','Anslått mangel: '+nf.format(row.shortage_estimate)+' personer nasjonalt'+(number(row.shortage_ci95_low)&&number(row.shortage_ci95_high)?'. 95 % konfidensintervall: '+nf.format(row.shortage_ci95_low)+'–'+nf.format(row.shortage_ci95_high)+' personer.':'.'),'rrh-meta'));
    }
    if(!hasScore)evidence.append(el('p',indicator.reason||'Yrket mangler et tilstrekkelig publisert mangelgrunnlag i denne versjonen.','rrh-meta'));
    evidence.append(el('p','Skåren rangerer relativt mangelpress blant yrker med et brukbart, positivt publisert mangelanslag. Like indikatorverdier får samme skår. Den er ikke trent på Riddersets rekrutteringsutfall.','rrh-meta'));
    if(indicator.referenceCount)evidence.append(el('p','Referansegrunnlag: '+indicator.referenceCount+' yrker. Skalaen er Riddersets presentasjon av statistikken, ikke en offisiell NAV-skår.','rrh-meta'));
    evidence.append(el('p','Tallene gjelder hele Norge i 2026. Kommunen, bedriftens størrelse og lønnsvalget endrer ikke denne indikatoren. Utvalgsusikkerhet og forskjeller innad i yrket kan være store.','rrh-meta'));
    evidence.append(link('NAV · Bedriftsundersøkelsen 2026',survey?.source?.url||'https://www.nav.no/no/nav-og-samfunn/kunnskap/analyser-fra-nav/arbeid-og-velferd/arbeid-og-velferd/bedriftsundersokelsen'));
    if(hasScore && score<=3){$('action-title').textContent='Start søket bredere fra første dag';$('action-text').textContent='Yrket har et tydelig nasjonalt mangelsignal. Avklar de ufravikelige kravene, lønnsrammen og hvilke nærliggende fagmiljøer som kan være aktuelle.';}
    else if(hasScore){$('action-title').textContent='Avklar krav og tilbud før dere lyser ut';$('action-text').textContent='Bruk lønnstallet og de lokale utlysningene til å vurdere tilbudet deres. Det nasjonale signalet alene avgjør ikke hvor lett det blir å finne den riktige personen.';}
    else{$('action-title').textContent='Avklar det konkrete kandidatmarkedet';$('action-text').textContent='Vi har ikke grunnlag for en samlet tallskår. Begynn med nødvendige krav, lønnsramme og hvor langt dere kan søke. En konkret markedskartlegging kan gi et sikrere svar.';}
  }
  function drawNav(data,s){
    state.nav=data;const box=$('nav-card');box.replaceChildren(el('h3','Utlysninger i '+s.townName));
    if(!data){box.append(el('p','Ferske NAV-treff er utilgjengelige akkurat nå. Prøv igjen senere.'));}
    else if(!data.coverage){box.append(el('p','Denne annonsesjekken dekker Nordland, Troms og Finnmark.'));}
    else if(!number(data.ads)){box.append(el('p','Vi kunne ikke bekrefte et annonsetall.'));}
    else{
      box.append(el('strong',(data.backfilled?'':'Minst ')+nf.format(data.ads)+(data.ads===1?' annonse':' annonser'),'rrh-factvalue'));
      box.append(el('p','Aktive NAV-treff på «'+s.term+'» i kommunen.'));
      if(data.employers?.length){const ul=el('ul');data.employers.slice(0,3).forEach(e=>ul.append(el('li',e.name+' · '+e.ads+(e.ads===1?' annonse':' annonser'))));box.append(ul);}
      if(data.ads===0)box.append(el('p','Ingen treff er ikke det samme som god kandidattilgang.'));
      box.append(el('small','Kontrollert '+date(data.checked_at)+'. '+(!data.backfilled?'Innlesingen er ikke komplett. ':'')+'Søket bygger på tekst i tittel og yrkesfelt. Det omfatter ikke FINN-annonsene.'));
      box.append(el('small','Vi teller annonser, ikke antall stillinger eller kvalifiserte kandidater.'));
    }
    const params=new URLSearchParams({q:s.term});const municipal=catalog.navMunicipalities?.[s.town];
    if(municipal){params.set('county',municipal.split('.')[0]);params.set('municipal',municipal);}
    box.append(link('Se utlysningene hos NAV','https://arbeidsplassen.nav.no/stillinger?'+params));
  }
  function drawPay(data,s){
    state.pay=data;const box=$('pay-card');box.replaceChildren(el('h3','Lønn i yrket'));
    if(!data)box.append(el('p','Lønnstallet kunne ikke hentes fra SSB akkurat nå.'));
    else{
      box.append(el('strong',number(data.base)?nf.format(data.base)+' kr/mnd':'Mangler publisert median','rrh-factvalue'));
      box.append(el('p','Median avtalt månedslønn før skatt. '+s.role.label+'.'));
      box.append(el('small','SSB '+data.year+' · Norge · heltid · '+s.sectorName.toLowerCase()+'. Grunnlønn uten bonus, uregelmessige tillegg og overtid.'));
      if(number(data.total))box.append(el('small','Median med bonus og uregelmessige tillegg: '+nf.format(data.total)+' kr/mnd.'));
    }
    box.append(link('SSB · lønn etter yrke, tabell 11418','https://www.ssb.no/statbank/table/11418/'));compareOffer();
  }
  function compareOffer(){
    const raw=$('offer').value;const value=Number(raw),median=state.pay?.base,box=$('offer-comparison');box.textContent='';
    if(!raw)return;
    if(!$('offer').checkValidity()||!Number.isFinite(value)||value<=0){box.textContent='Skriv et gyldig beløp i kroner per måned.';return;}
    if(!number(median)||median<=0){box.textContent='Lønnstilbudet kan ikke sammenlignes før vi har et gyldig SSB-tall.';return;}
    const delta=value-median;box.textContent='Tilbudet er '+(delta===0?'likt medianen.':nf.format(Math.abs(delta))+' kr ('+pf.format(Math.abs(delta/median)*100)+' %) '+(delta>0?'over':'under')+' medianen.');
  }
  const marketTerms={
    '1120':'daglig leder','1212':'personalsjef','1221':'salgssjef','1312':'driftsleder','1321':'produksjonsleder','1323':'byggeleder','1324':'logistikk',
    '2142':'byggingeniør','2151':'elektroingeniør','2223':'sykepleier','2341':'lærer','2411':'revisor','2422':'rådgiver','2423':'personal',
    '2512':'utvikler','2522':'systemadministrator','3112':'bygg','3113':'elektro','3115':'maskin','3119':'tekniker','3131':'energi','3139':'prosess',
    '3152':'skipsfører','3313':'regnskap','3512':'brukerstøtte','4110':'administrasjon','4311':'regnskap','4321':'lager','4323':'transport',
    '5321':'helsefagarbeider','6221':'havbruk','7115':'tømrer','7126':'rørlegger','7233':'industrimekaniker','7411':'elektriker',
    '8160':'produksjon','8331':'bussjåfør','8332':'lastebilsjåfør','8350':'matros'
  };
  function marketTerm(role){
    const raw=String(role.searchTerm||'').trim();
    const aliases=[catalog.roles[role.code]?.[0],...String(catalog.roles[role.code]?.[1]||'').split(',')].filter(Boolean).map(core.normalize);
    if(raw.length>=3 && !/^\d+$/.test(raw) && aliases.includes(core.normalize(raw)))return raw;
    const candidate=marketTerms[role.code]||String(catalog.roles[role.code]?.[1]||'').split(',').find(x=>x.trim().length>=3)||role.label;
    return candidate.length<3?role.label.slice(0,80):candidate.slice(0,80);
  }
  function snapshot(){const role=state.role;return {role,town:state.town,townName:catalog.towns[state.town],term:marketTerm(role),sector:$('sector').value,sectorName:$('sector').selectedOptions[0].textContent};}
  async function analyse(scroll=false){
    clearResult();publishContext();if(!state.role||!catalog.towns[state.town])return;
    const ticket=revision,s=snapshot();resultController=new AbortController();const signal=resultController.signal;
    $('result-title').textContent=s.role.label;$('result-location').textContent=(state.company?state.company.name+' · ':'')+s.townName;
    $('result').hidden=false;$('download').disabled=true;drawIndicator();
    $('nav-card').replaceChildren(el('h3','Utlysninger i '+s.townName),el('p','Henter NAV-treff …'));
    $('pay-card').replaceChildren(el('h3','Lønn i yrket'),el('p','Henter SSB-tall …'));
    if(scroll){$('result-title').focus({preventScroll:true});$('result').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
    await Promise.allSettled([
      (async()=>{let d=null;try{d=await market('annonser',{kommune:s.town,q:s.term},signal);}catch{}if(ticket===revision)drawNav(d,s);})(),
      (async()=>{let d=null;try{d=await market('lonn',{yrke:s.role.code,sektor:s.sector},signal);}catch{}if(ticket===revision)drawPay(d,s);})()
    ]);
    if(ticket===revision)$('download').disabled=false;
  }
  $('company-form').addEventListener('submit',e=>{e.preventDefault();if(catalog)searchCompany();});
  $('company').addEventListener('input',()=>{++companySeq;companyController?.abort();resetCompany();clearTimeout(timer);$('company-status').textContent='';if($('company').value.trim().length>=2)timer=setTimeout(searchCompany,350);});
  $('search-units').addEventListener('change',()=>{if($('company').value.trim().length>=2)searchCompany();});
  $('manual').onclick=()=>{++companySeq;companyController?.abort();resetCompany(false);manual=true;$('company-status').textContent='Du kan gjøre analysen uten bedriftsoppslag.';populateRoles(null);openStep('role');$('role-search').focus({preventScroll:true});};
  $('unit').addEventListener('change',()=>{const c=state.units.find(u=>u.org===$('unit').value)||state.main;state.company=c;companySummary();populateRoles(c,true);});
  $('role-search').addEventListener('input',()=>{
    clearResult();state.role=null;$('role-status').textContent='';root.querySelectorAll('[data-code]').forEach(b=>b.setAttribute('aria-pressed','false'));
    publishContext();const q=$('role-search').value.trim();$('role-results').replaceChildren();if(q.length<2)return;
    const roles=core.searchRoles(q,catalog.roles);
    for(const r of roles){const b=el('button',r.label);b.type='button';b.dataset.code=r.code;b.setAttribute('aria-pressed','false');b.onclick=()=>chooseRole({...r,searchTerm:q},true);$('role-results').append(b);}
    if(!roles.length)$('role-results').append(el('p','Ingen treff. Prøv en bredere yrkestittel.','rrh-meta'));
  });
  $('town').addEventListener('change',()=>{state.town=$('town').value;$('town-origin').textContent='valgt av deg';if(state.role)analyse();else{clearResult();publishContext();}});
  $('sector').addEventListener('change',()=>{if(state.role)analyse();else publishContext();});
  $('offer').addEventListener('input',()=>{compareOffer();publishContext();});
  for(const step of ['company','role','result'])$('step-'+step).onclick=()=>openStep(step);
  for(const step of ['advanced','market'])$(step+'-link').onclick=e=>{if(openStep(step))e.preventDefault();};
  $('reset').onclick=()=>{++companySeq;companyController?.abort();resetCompany();window.dispatchEvent(new CustomEvent('rrh-context-reset'));$('company').value='';$('company-status').textContent='';openStep('company');$('company').focus({preventScroll:true});};
  $('commute-btn').onclick=async()=>{
    if(!state.town)return;const ticket=revision,s=snapshot();$('commute-btn').disabled=true;$('commute').textContent='Henter pendling fra SSB …';
    try{const d=await market('pendling',{kommune:s.town},resultController?.signal);if(ticket!==revision)return;$('commute').replaceChildren();
      if(d.areas?.length){const ul=el('ul');d.areas.slice(0,5).forEach(a=>ul.append(el('li',a.name+' · '+nf.format(a.count)+' personer')));$('commute').append(ul);}else $('commute').append(el('p','Ingen publiserte positive tall i oppslaget.'));
      $('commute').append(el('p','SSB '+d.year+'. Bostedskommuner med flest sysselsatte som jobber i '+s.townName+'. Alle yrker samlet. Dette er ikke en oversikt over tilgjengelige kandidater.','rrh-meta'),link('SSB · pendlingsstrømmer','https://www.ssb.no/statbank/table/03321/'));
    }catch{if(ticket===revision)$('commute').textContent='Pendlingstallene er utilgjengelige akkurat nå.';}finally{if(ticket===revision)$('commute-btn').disabled=false;}
  };
  $('download').onclick=()=>{
    if(!state.role)return;const s=snapshot();
    const lines=['Ridderset · Rekrutteringsinnsikt','Oppslag: '+new Date().toLocaleString('nb-NO',{timeZone:'Europe/Oslo'}),
      state.company?'Bedrift: '+state.company.name+' · org.nr. '+state.company.org:'Ingen bedrift valgt',
      'Rolle: '+s.role.label+' · STYRK-08 '+s.role.code,'Arbeidskommune: '+s.townName,
      state.role.kind==='industry'?'Du valgte et bransjebasert rolleforslag. Dette er ikke en observert stilling hos bedriften.':'Rollen er valgt av brukeren.',
      $('score-output').innerText,$('score-evidence').textContent,$('nav-card').innerText,$('pay-card').innerText,
      $('offer-comparison').textContent,$('action-title').textContent,$('action-text').textContent,
      'Metodeversjon: '+(state.indicator?.methodVersion||'rrh-v1'),
      ...Array.from($('result').querySelectorAll('a')).map(a=>a.textContent+': '+a.href)
    ].filter(Boolean);
    const url=URL.createObjectURL(new Blob([lines.join('\n\n')],{type:'text/plain;charset=utf-8'}));const a=el('a');a.href=url;a.download='ridderset-rekrutteringsinnsikt.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
  };
  async function init(){
    $('search-btn').disabled=true;$('manual').disabled=true;$('company').disabled=true;$('search-units').disabled=true;$('company-status').textContent='Klargjør bedrifts- og yrkessøket …';
    const results=await Promise.allSettled([read(asset('catalog.json')),read(asset('nav-2026.json'))]);
    if(!core || !window.RRHContext || results[0].status!=='fulfilled' || !results[0].value.roles || !results[0].value.towns){
      $('company-status').textContent='Yrkeslisten kunne ikke lastes. ';const retry=el('button','Prøv igjen','rrh-textbutton');retry.type='button';retry.onclick=init;$('company-status').append(retry);return;
    }
    catalog=results[0].value;survey=results[1].status==='fulfilled'?results[1].value:null;
    const groups=new Map();for(const [key,label] of [['18','Nordland'],['55','Troms'],['56','Finnmark'],['other','Andre kommuner']]){const group=el('optgroup');group.label=label;groups.set(key,group);}
    for(const [code,name] of Object.entries(catalog.towns).sort((a,b)=>a[1].localeCompare(b[1],'nb')))(groups.get(code.slice(0,2))||groups.get('other')).append(option(code,name));
    $('town').replaceChildren(option('','Velg kommune'),...groups.values());$('company-status').textContent='';$('search-btn').disabled=false;$('manual').disabled=false;$('company').disabled=false;$('search-units').disabled=false;
    let saved=null;
    try{saved=window.RRHContext.restore(sessionStorage.getItem(storageKey),catalog);}catch{}
    if(saved){
      restoring=true;resetCompany(false);manual=saved.manual;
      state.company=saved.selectedCompany;state.main=saved.mainCompany||saved.selectedCompany;state.units=saved.availableUnits;
      if(state.company){$('company-form').hidden=true;$('manual').hidden=true;$('search-title').textContent='Valgt bedrift';companySummary();}
      populateRoles(state.company);
      if(state.units.length&&state.main){
        $('unit').replaceChildren(option('','Hovedadresse: '+(state.main.townName||state.main.name)),...state.units.map(u=>option(u.org,u.name+' · '+(u.townName||'Ukjent kommune'))));
        $('unit').value=state.company?.org===state.main.org?'':state.company?.org||'';$('unit-wrap').hidden=false;
        $('unit-status').textContent='Velg avdeling dersom jobben gjelder et annet arbeidssted.';
      }
      state.town=saved.workplace.municipalityNumber||'';$('town').value=state.town;$('town-origin').textContent=state.town?'beholdt fra ditt forrige valg':'';
      state.role=saved.occupation?{code:saved.occupation.code,label:saved.occupation.name,searchTerm:saved.occupation.searchTerm,kind:saved.occupation.kind}:null;
      $('sector').value=saved.salary.sector;$('offer').value=saved.salary.offeredMonthlyBase??'';
      restoring=false;
      if(state.role)chooseRole(state.role,false);else publishContext();
      $('guide-status').textContent='Vi har beholdt valgene dine i denne fanen. Du kan fortsette der du slapp.';
    }else publishContext();
  }
  init();
})();
