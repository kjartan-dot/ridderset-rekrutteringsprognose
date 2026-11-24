(() => {
  'use strict';
  const root = document.getElementById('markedssjekk');
  if (!root || root.dataset.guidedRuntimeReady) return;
  root.dataset.guidedRuntimeReady='true';
  const form = root.querySelector('form'), fields = form.elements;
  const status = root.querySelector('.rr-ms-status'), results = root.querySelector('.rr-ms-results');
  const unitList = root.querySelector('.rr-ms-unit-list');
  const n = new Intl.NumberFormat('nb-NO');
  const compactDate = v => new Date(v).toLocaleString('nb-NO',{timeZone:'Europe/Oslo',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
  const collate = (a,b) => a.localeCompare(b,'nb');
  const normal = s => String(s).toLocaleLowerCase('nb-NO').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[ø]/g,'o').replace(/[æ]/g,'ae').replace(/[^a-z0-9]+/g,' ').trim();
  let catalog, selectedUnit=null, timer, unitRequest=0, revision=0, controller=null;
  const guided=document.getElementById('rr-hurtigsjekk')?.dataset.guided==='true';
  let pendingContext=window.__rrhContext||null, contextRevision=-1, clearedAtRevision=-1, contextKey=null;
  let contextReady=false, guidedTimer, analysedKey=null, guidedBox, guidedButton;
  function el(tag,text,cls) {
    const x=document.createElement(tag);
    if(text!==undefined) x.textContent=text;
    if(cls)x.className=cls;
    return x;
  }
  function link(text,href) {const a=el('a',text);a.href=href;a.target='_blank';a.rel='noopener noreferrer';return a;}
  function option(value,text){const o=el('option',text);o.value=value;return o;}
  async function read(url,signal) {
    const r=await fetch(url,{headers:{Accept:'application/json'},cache:'no-store',signal});
    if(!r.ok)throw Error(String(r.status));
    return r.json();
  }
  function api(path,params,signal) {
    const url=new URL(root.dataset.api+path);Object.entries(params).forEach(([k,v])=>url.searchParams.set(k,v));return read(url,signal);
  }
  function invalidate() {
    revision++;controller?.abort();
    if (!results.hidden) {results.hidden=true;results.replaceChildren();}
    if(catalog) status.textContent='';
    form.querySelector('[type=submit]').disabled=!catalog;
    if(guidedButton)guidedButton.disabled=!contextReady;
  }
  function isVisible(){
    for(let node=root;node;node=node.parentElement){
      if(node.hidden || node.style?.display==='none' || (node.tagName==='DETAILS' && !node.open))return false;
    }
    return true;
  }
  function runGuided(force=false){
    clearTimeout(guidedTimer);
    if(!guided || !catalog || !contextReady || !isVisible() || (!force && analysedKey===contextKey))return;
    guidedTimer=setTimeout(()=>{
      if(!contextReady || !isVisible())return;
      analysedKey=contextKey;analyse({preventDefault(){}});
    },250);
  }
  function showContext(ctx){
    if(!guidedBox)return;
    guidedBox.replaceChildren();
    const company=ctx?.selectedCompany;
    guidedBox.append(el('strong',company?.name||'Analyse uten valgt bedrift'));
    if(company?.org)guidedBox.append(el('p','Org.nr. '+company.org,'rr-ms-meta'));
    const role=catalog?.roles[fields.role.value]?.[0],town=catalog?.towns[fields.town.value];
    guidedBox.append(el('p',role && town?role+' · '+town:'Velg rolle og arbeidskommune i hurtigsjekken øverst.'));
    if(role && town && !['18','55','56'].includes(fields.town.value.slice(0,2))) {
      guidedBox.append(el('p','Annonsetall dekker Nordland, Troms og Finnmark. Lønn og pendling hentes for ditt valgte grunnlag uten å bytte arbeidskommune.','rr-ms-meta'));
    }
    const change=el('a','Endre valgene øverst');change.href='#rrh-title';guidedBox.append(change);
    guidedButton=el('button','Oppdater markedssjekken');guidedButton.type='button';guidedButton.disabled=!contextReady;
    guidedButton.addEventListener('click',()=>runGuided(true));guidedBox.append(guidedButton);
  }
  function setContext(ctx){
    if(!guided)return false;
    if(ctx && (ctx.version!==1 || ctx.source!=='rr-hurtigsjekk'))return false;
    const nextRevision=Number.isSafeInteger(ctx?.revision)?ctx.revision:-1;
    if(ctx && (nextRevision<0 || nextRevision<contextRevision || nextRevision<=clearedAtRevision))return false;
    if(ctx)contextRevision=nextRevision;
    else clearedAtRevision=contextRevision;
    pendingContext=ctx;
    if(!catalog)return false;
    const company=ctx?.selectedCompany||null;
    const code=String(ctx?.occupation?.code||'');
    const town=String(ctx?.workplace?.municipalityNumber||'');
    const term=String(ctx?.occupation?.searchTerm||ctx?.occupation?.name||'').trim().slice(0,80);
    const salary=ctx?.salary,amount=salary?.measure==='base' && scalar(salary.offeredMonthlyBase) && salary.offeredMonthlyBase>0 && salary.offeredMonthlyBase<=9999999?salary.offeredMonthlyBase:null;
    const sector=['ALLE','A+B+D+E','6500','6100'].includes(salary?.sector)?salary.sector:'ALLE';
    const nextKey=JSON.stringify([company?.org||'',company?.name||'',code,town,term,amount,sector]);
    if(contextKey===nextKey)return true;
    contextKey=nextKey;analysedKey=null;clearTimeout(guidedTimer);clearTimeout(timer);++unitRequest;
    contextReady=false;invalidate();selectedUnit=null;unitList.replaceChildren();
    // Copy the selected entity as registered. The workplace override remains separate.
    selectedUnit=company?{name:company.name,org:company.org,town:company.town||null}:null;
    fields.company.value=company?.name||'';
    fields.term.value=term;fields.term.setCustomValidity('');setRoles();
    fields.role.value=catalog.roles[code]?code:'';
    fields.town.value=catalog.towns[town]?town:'';
    fields.offer.value=amount===null?'':String(amount);fields.sector.value=sector;
    contextReady=Boolean(fields.role.value && fields.town.value && term.length>=3 && !/^\d+$/.test(term));
    showContext(ctx);
    status.textContent=contextReady?'Valgene dine er videreført. Markedssjekken oppdateres når du åpner den.':'Velg rolle og arbeidskommune i hurtigsjekken øverst.';
    runGuided();return true;
  }
  if(guided){
    root.dataset.rrhGuided='true';form.hidden=true;form.style.display='none';
    guidedBox=el('div',undefined,'rr-ms-card rr-ms-context');form.before(guidedBox);
    window.RRMarketContext=Object.freeze({setContext,clearContext:()=>setContext(null)});
    window.addEventListener('rrh-context-changed',event=>setContext(event.detail));
    for(let node=root.parentElement;node;node=node.parentElement)if(node.tagName==='DETAILS')node.addEventListener('toggle',()=>runGuided());
  }
  function optionsFor(term) {
    const q=normal(term),words=q.split(' ').filter(w=>w.length>2);
    return Object.entries(catalog.roles).map(([code,[label,aliases]])=>{
      const titles=[label,...aliases.split(',')].filter(Boolean).map(normal);
      let score=code===q?100:0;
      if(q)for(const t of titles){
        if(t===q)score=Math.max(score,90);
        else if(t.startsWith(q))score=Math.max(score,65);
        else if(t.includes(q))score=Math.max(score,45);
        else if(words.length && words.every(w=>t.includes(w)))score=Math.max(score,35);
      }
      return {code,label,score};
    }).sort((a,b)=>b.score-a.score||collate(a.label,b.label));
  }
  function setRoles() {
    const prev=fields.role.value, rows=optionsFor(fields.term.value);
    const matches=rows.filter(x=>x.score>0), rest=rows.filter(x=>!x.score);
    fields.role.replaceChildren(option('','Velg yrkesgruppe'));
    for(const [label,list] of [['Forslag fra stillingstittel',matches],['Alle yrkesgrupper',rest]]) {
      if(!list.length)continue;
      const group=el('optgroup');group.label=label;
      list.forEach(x=>group.append(option(x.code,x.label+' ('+x.code+')')));fields.role.append(group);
    }
    if(matches.length && matches[0].score>=65 && (!matches[1]||matches[0].score>matches[1].score))fields.role.value=matches[0].code;
    else if(matches.some(x=>x.code===prev))fields.role.value=prev;
  }
  function useUnit(unit) {
    selectedUnit=unit; fields.company.value=unit.name;fields.town.value=unit.town;
    unitList.replaceChildren(el('span',[unit.name,'Org.nr. '+unit.org,catalog.towns[unit.town]].join(' · '),'rr-ms-meta'));invalidate();
  }
  fields.company.addEventListener('input',()=>{
    const ticket=++unitRequest;clearTimeout(timer);selectedUnit=null;unitList.replaceChildren();invalidate();
    const q=fields.company.value.trim();if(q.length<2)return;
    timer=setTimeout(async()=>{
      unitList.textContent='Søker i Enhetsregisteret …';
      try {
        const {units}=await api('arbeidssteder',{q});if(ticket!==unitRequest)return;
        unitList.replaceChildren();
        if(!units.length)unitList.textContent='Ingen avdelinger funnet. Velg arbeidskommune i feltet over.';
        for(const u of units){const b=el('button',u.name+' · '+(u.place||catalog.towns[u.town])+' · '+u.org);b.type='button';b.addEventListener('click',()=>{++unitRequest;useUnit(u);});unitList.append(b);}
      }catch{if(ticket===unitRequest)unitList.textContent='Bedriftsregisteret er utilgjengelig. Du kan velge arbeidskommune selv.';}
    },320);
  });
  fields.term.addEventListener('input',()=>{fields.term.setCustomValidity('');if(catalog)setRoles();invalidate();});
  fields.town.addEventListener('change',()=>{
    if(selectedUnit && selectedUnit.town!==fields.town.value)unitList.textContent='Arbeidsstedet i analysen er endret til '+catalog.towns[fields.town.value]+'.';
    invalidate();
  });
  for(const field of [fields.sector,fields.role,fields.offer])field.addEventListener('input',invalidate);
  function card(title){const node=el('article',undefined,'rr-ms-card');node.append(el('h4',title));return node;}
  function listing(values){const ul=el('ul');for(const value of values)ul.append(el('li',value));return ul;}
  function scalar(value){return typeof value==='number'&&Number.isFinite(value);}
  function navCard(data,s){
    const c=card('Hvem søker etter de samme folkene?');
    if(!data)c.append(el('p','Vi får ikke bekreftet ferske annonser fra NAV akkurat nå. Prøv igjen senere.'));
    else if(!data.coverage)c.append(el('p','Annonseanalysen dekker Nordland, Troms og Finnmark. Bruk Arbeidsplassen for å se utlysninger i '+s.townName+'.'));
    else {
      if(data.ads>0 || data.backfilled){
        const count=(data.backfilled?'':'Minst ')+n.format(data.ads)+' '+(data.ads===1?'annonse':'annonser');
        c.append(el('strong',count,'rr-ms-number'));
        c.append(el('p','Aktive annonser med «'+s.term+'» i tittelen eller yrkesfeltet og oppgitt arbeidssted i '+s.townName+'.'));
        if(data.employers.length)c.append(listing(data.employers.map(x=>x.name+' ('+x.ads+')')));
        if(data.listings?.length) {
          const details=el('details'), items=el('ul');
          details.append(el('summary',data.ads>data.listings.length?'Se de fem nyeste annonsene':data.listings.length===1?'Se stillingsannonsen':'Se stillingsannonsene'));
          for(const ad of data.listings) {
            const li=el('li');
            li.append(link(ad.title,'https://arbeidsplassen.nav.no/stillinger/stilling/'+encodeURIComponent(ad.id)));
            if(ad.employer)li.append(document.createTextNode(' · '+ad.employer));
            items.append(li);
          }
          details.append(items);c.append(details);
        }
      } else {
        c.append(el('p','Foreløpig ingen treff for «'+s.term+'» i '+s.townName+'.'));
      }
      if(!data.backfilled)c.append(el('p','Vi leser fortsatt inn eldre utlysninger. Flere aktive annonser kan komme til.'));
      c.append(el('small','Kontrollert '+compactDate(data.checked_at)+'. Kilde: NAVs stillingsfeed. En annonse med flere arbeidssteder teller én gang i hver oppgitt kommune.'));
    }
    const params=new URLSearchParams({q:s.term});
    const municipal=catalog.navMunicipalities?.[s.town];
    if(municipal) {
      params.set('county',municipal.split('.')[0]);
      params.set('municipal',municipal);
    }
    c.append(link('Åpne søket hos NAV','https://arbeidsplassen.nav.no/stillinger?'+params));return c;
  }
  function payCard(data,s){
    const c=card('Hvordan ligger lønnsrammen an?');
    if(!s.code)c.append(el('p','Velg en yrkesgruppe for å hente lønn fra SSB.'));
    else if(!data)c.append(el('p','SSB-oppslaget er utilgjengelig akkurat nå.'));
    else {
      c.append(el('strong',scalar(data.base)?n.format(data.base)+' kr/mnd':'Mangler publisert median','rr-ms-number'));
      c.append(el('p','Avtalt månedslønn, median. '+s.role+' · Norge · '+data.year+' · heltid · '+s.sectorName.toLowerCase()+'.'));
      if(s.offer&&scalar(data.base)){
        const diff=s.offer-data.base;
        c.append(el('p','Tilbudt grunnlønn er '+n.format(s.offer)+' kr/mnd. '+(diff===0?'Den tilsvarer medianen.':'Det er '+n.format(Math.abs(diff))+' kr '+(diff>0?'over':'under')+' medianen.')));
      }
      if(scalar(data.total))c.append(el('small','Median månedslønn med bonus og uregelmessige tillegg er '+n.format(data.total)+' kr. Overtid inngår ikke.'));
    }
    c.append(link('SSB · lønn etter yrke, tabell 11418','https://www.ssb.no/statbank/table/11418/'));return c;
  }
  function commuteCard(data,s){
    const c=card('Hvorfra pendler folk til '+s.townName+'?');
    if(!data)c.append(el('p','SSB-oppslaget er utilgjengelig akkurat nå.'));
    else {
      if(data.areas.length)c.append(listing(data.areas.map(a=>a.name+' · '+n.format(a.count)+' personer')));
      else c.append(el('p','Ingen positive pendlertall i de oppgitte kommunene.'));
      c.append(el('small','Bostedskommuner med flest sysselsatte som arbeider i '+s.townName+', 4. kvartal '+data.year+'. Alle yrker samlet. Tallene sier ingenting om hvem som er på jobbjakt eller hvor ofte de reiser.'));
    }
    c.append(link('SSB · pendlingsstrømmer, tabell 03321','https://www.ssb.no/statbank/table/03321/'));return c;
  }
  function skillsCard(profiles,s) {
    const c=card('Hvilke andre fagmiljøer bør dere vurdere?');
    const data=profiles?.[s.code]||[];
    if(!data.length){c.append(el('p','Avklar hvilke oppgaver som må beherskes fra start. Undersøk deretter hvilke fagmiljøer som løser de samme oppgavene.'));return c;}
    c.append(el('p','Velg en ESCO-profil som passer oppgavene. Forslagene bygger på ferdigheter to yrker har til felles.'));
    const select=el('select');select.setAttribute('aria-label','Velg ESCO-profil');
    select.append(option('','Velg yrkesprofil'));data.forEach((d,i)=>select.append(option(String(i),d[0])));
    const out=el('div');c.append(select,out);
    function paint(){
      out.replaceChildren();if(select.value==='')return;const d=data[Number(select.value)];
      if(d[2].length)out.append(el('p','Eksempler på ferdigheter: '+d[2].join(', ')+'.'));
      if(d[3].length){const ul=el('ul');for(const related of d[3]){
        const li=el('li');li.append(link(related[0],'https://esco.ec.europa.eu/nb/classification/occupation?uri='+encodeURIComponent('http://data.europa.eu/esco/occupation/'+related[1])),document.createTextNode(' · '+related[2].join(', ')));ul.append(li);
      }out.append(ul);} else out.append(el('p','Ingen andre yrkesgrupper i uttrekket deler minst to av disse ferdighetene.'));
      out.append(el('small','Gå gjennom ufravikelige krav, sertifikater og hva dere kan lære bort i oppstarten.'));
    }
    const match=data.findIndex(d=>normal(d[0])===normal(s.term));
    if(match>=0||data.length===1){select.value=String(match>=0?match:0);paint();}
    select.addEventListener('change',paint);c.append(link('EU-kommisjonen · ESCO 1.2.1','https://esco.ec.europa.eu/en/use-esco/download'));return c;
  }
  function sourceLookup(container,label,path,town,render) {
    const button=el('button',label),out=el('div');button.type='button';
    out.setAttribute('aria-live','polite');container.append(button,out);
    button.addEventListener('click',async()=>{
      button.disabled=true;out.textContent='Henter opplysninger …';
      try {const data=await api(path,{kommune:town});out.replaceChildren();render(out,data);}
      catch {out.textContent='Kilden er midlertidig utilgjengelig. Du kan også åpne registeret nedenfor.';}
      finally {button.disabled=false;}
    });
  }
  let education;
  function educationSearch(body){
    const label=el('label','Søk i fullførte studieprogrammer ved UiT og Nord universitet');
    const input=el('input');input.type='search';input.placeholder='F.eks. automasjon eller sykepleie';label.append(input);
    const out=el('div');out.setAttribute('aria-live','polite');body.append(label,out);
    let ticket=0;
    input.addEventListener('input',async()=>{
      const id=++ticket,q=normal(input.value);out.replaceChildren();if(q.length<2)return;
      try {
        const d=education||await read(root.dataset.education);education=d;if(id!==ticket)return;
        const hits=d.programs.filter(row=>q.split(' ').every(word=>normal(row[0]+' '+row[1]).includes(word)));
        out.append(el('p',hits.length?('Programmer med minst fem fullføringer i '+d.year+': '+hits.length+' treff.'):'Ingen treff blant programmene med minst fem fullføringer i '+d.year+'.'));
        if(hits.length)out.append(listing(hits.slice(0,8).map(([name,school,count])=>school+' · '+name+' · '+n.format(count)+' fullføringer')));
        out.append(el('small','Kilde: HK-dir, DBH, tabell 118. Inntil åtte treff. Tallene gjelder hele lærestedet.'));
      }catch{if(id===ticket)out.textContent='Utdanningstallene kunne ikke hentes.';}
    });
  }
  function sources(s){
    const box=el('details');box.append(el('summary','Bransjeprosjekter og utdanningsmiljøer'));
    const body=el('div',undefined,'rr-ms-card');box.append(body);
    body.append(el('p','Se hvem som driver oppdrett i arbeidskommunen, følg energiprosjekter og finn fagmiljøer som utdanner relevante kandidater.'));
    sourceLookup(body,'Vis oppdrettslokaliteter i '+s.townName,'akvakultur',s.town,(out,d)=>{
      if(d.sites.length)out.append(el('p','Inntil ti aktive lokaliteter med tillatelsesinnehaver'),listing(d.sites.map(x=>[x.name,x.owner].filter(Boolean).join(' · '))));
      else out.textContent='Ingen aktive lokaliteter i registeroppslaget.';
    });
    sourceLookup(body,'Vis konsesjonssaker i '+s.townName,'konsesjoner',s.town,(out,d)=>{
      if(!d.cases.length){out.textContent='Ingen konsesjonssaker i oppslaget.';return;}
      const list=el('ul');
      for(const item of d.cases){const li=el('li');li.append(link(item.holder,item.url),document.createTextNode(' · '+[item.subject,item.stage,item.date].filter(Boolean).join(' · ')));list.append(li);}
      out.append(el('p','Inntil ti konsesjonssaker fra NVE. Sjekk framdriften før dere vurderer et bemanningsbehov.'),list);
    });
    educationSearch(body);
    const ul=el('ul');
    for(const [name,url] of [['Akvakulturregisteret · tillatelser og lokaliteter','https://www.fiskeridir.no/registre/akvakulturregisteret'],
      ['NVE · søk etter konsesjonssaker og tiltakshavere','https://www.nve.no/konsesjon/konsesjonssaker/'],
      ['HK-dir · fullførte studieprogrammer etter lærested','https://dbh.hkdir.no/tall-og-statistikk/statistikk-meny/studenter/statistikk-side/7.2'],
      ['FINN jobb · månedsrapporter om annonsemarkedet','https://www.finn.no/bedriftskunde/ressurser/manedsrapport-jobb']]){
      const li=el('li');li.append(link(name,url));ul.append(li);
    }body.append(ul);return box;
  }
  function sourceSnapshot(){return {company:selectedUnit?{...selectedUnit}:null,term:fields.term.value.trim(),town:fields.town.value,townName:catalog.towns[fields.town.value],
    code:fields.role.value,role:catalog.roles[fields.role.value]?.[0]||'',offer:Number(fields.offer.value)||0,
    sector:fields.sector.value,sectorName:fields.sector.selectedOptions[0].textContent};}
  const skillsCache=new Map();
  async function profiles(code,signal){
    if(!code)return null;const prefix=code[0];
    if(skillsCache.has(prefix))return skillsCache.get(prefix);
    const d=await read(new URL(prefix+'.json',root.dataset.skills),signal);skillsCache.set(prefix,d);return d;
  }
  async function analyse(event){
    event.preventDefault();
    if(guided && !contextReady)return;
    if(fields.term.value.trim().length<3)fields.term.setCustomValidity('Skriv minst tre tegn i stillingstittelen.');
    if(!catalog||(!guided && !form.reportValidity()))return;
    const s=sourceSnapshot(),ticket=++revision;controller?.abort();controller=new AbortController();
    const signal=controller.signal;
    const heading=el('h3','Markedet for «'+s.term+'» i '+s.townName);
    results.hidden=false;results.replaceChildren(heading);const grid=el('div',undefined,'rr-ms-cards');results.append(grid);
    status.textContent='Henter markedstall …';form.querySelector('[type=submit]').disabled=true;if(guidedButton)guidedButton.disabled=true;
    const jobs=[[()=>api('annonser',{kommune:s.town,q:s.term},signal),navCard],
      [()=>s.code?api('lonn',{yrke:s.code,sektor:s.sector},signal):null,payCard],
      [()=>api('pendling',{kommune:s.town},signal),commuteCard],[()=>profiles(s.code,signal),skillsCard]];
    await Promise.all(jobs.map(async([get,draw])=>{
      const slot=card('Henter opplysninger …');grid.append(slot);
      let d;try{d=await get();}catch{d=null;}
      if(ticket===revision)slot.replaceWith(draw(d,s));
    }));
    if(ticket!==revision)return;
    results.append(sources(s));
    const actions=el('div',undefined,'rr-ms-result-actions');const save=el('button','Last ned markedssjekken');save.type='button';
    save.onclick=()=>{
      const report=['Markedssjekk før utlysning · Ridderset Rekruttering',heading.textContent,s.company?'Bedrift: '+s.company.name+' ('+s.company.org+')':'',
        'Oppslag '+new Date().toLocaleString('nb-NO',{timeZone:'Europe/Oslo'}),...Array.from(grid.children).map(c=>Array.from(c.children).map(e=>e.tagName==='SELECT'?e.selectedOptions[0]?.textContent:e.innerText).filter(Boolean).join('\n')),
        ...Array.from(grid.querySelectorAll('a')).map(a=>a.textContent+' '+a.href)].filter(Boolean).join('\n\n');
      const url=URL.createObjectURL(new Blob([report],{type:'text/plain;charset=utf-8'}));const a=el('a');a.href=url;a.download='ridderset-markedssjekk-'+s.town+'.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
    };actions.append(save);results.append(actions);status.textContent='Markedssjekken er klar.';form.querySelector('[type=submit]').disabled=false;if(guidedButton)guidedButton.disabled=false;
  }
  form.addEventListener('submit',analyse);
  async function init(){
    try{
      catalog=await read(root.dataset.catalog);
      const towns=Object.entries(catalog.towns).sort((a,b)=>collate(a[1],b[1]));
      const groups=new Map();
      for (const [prefix,name] of [['18','Nordland'],['55','Troms'],['56','Finnmark'],['','Øvrige kommuner']]){
        const group=el('optgroup');group.label=name;groups.set(prefix,group);fields.town.append(group);
      }
      for (const [id,t] of towns) (groups.get(id.slice(0,2))||groups.get('')).append(option(id,t+' ('+id+')'));
      setRoles();
      form.querySelector('[type=submit]').disabled=false;status.textContent='';
      if(guided){
        setContext(pendingContext);
        window.dispatchEvent(new CustomEvent('rrh-market-ready'));
      }
      if(!guided)window.addEventListener('rrp-company-selected',e=>{
        const d=e.detail;if(!d||!catalog.towns[d.municipality_number])return;
        const btn=el('button','Bruk '+(d.unit_name||d.name)+' i '+catalog.towns[d.municipality_number]);btn.type='button';
        btn.onclick=()=>useUnit({name:d.unit_name||d.name,org:d.unit_organization_number||d.organization_number,town:d.municipality_number});
        unitList.replaceChildren(btn);
      });
    }catch{status.textContent='Kunne ikke laste yrker og kommuner.';const b=el('button','Prøv på nytt');b.type='button';b.onclick=()=>{b.remove();init();};status.append(' ',b);}
  }
  init();
})();
