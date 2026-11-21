#!/usr/bin/env python3
"""Patch an existing WordPress page without changing its block/shortcode structure.

Defaults target the approved local 0.2.1 snapshot. Nothing is sent to WordPress.
The patch fails closed if expected source text has changed.
"""

from argparse import ArgumentParser
from hashlib import sha256
from pathlib import Path
import re


def once(source, before, after):
    count = source.count(before)
    if count != 1:
        raise ValueError(f"Expected one match, found {count}: {before[:100]!r}")
    return source.replace(before, after, 1)


def script(source, identifier, transform):
    pattern = r'(<script id="' + re.escape(identifier) + r'">)([\s\S]*?)(</script>)'
    match = re.search(pattern, source)
    if not match:
        raise ValueError(f"Missing script: {identifier}")
    return source[:match.start(2)] + transform(match[2]) + source[match.end(2):]


def worklife(body):
    body = once(body, ' const s=vals();', ''' const s=vals();
 const brandAnswered=fields.slice(0,2).every(key=>touched.has(key));
 const indexAnswered=fields.slice(2).every(key=>touched.has(key));''')
    body = once(body, ' const brand=round((s.reputation*.65+s.visibility*.35)*10);',
                ' const brand=brandAnswered?round((s.reputation*.65+s.visibility*.35)*10):null;')
    body = once(body, ' const index=round((s.promise*.35+s.onboarding*.2+s.development*.3+s.leadership*.15)*10);',
                ' const index=indexAnswered?round((s.promise*.35+s.onboarding*.2+s.development*.3+s.leadership*.15)*10):null;')
    body = once(body, ' const composite=round(brand*.4+index*.6);',
                ' const composite=brand!==null&&index!==null?round(brand*.4+index*.6):null;')
    body = once(body, ' const low=fields.slice().sort((a,b)=>s[a]-s[b])[0];',
                ' const ranked=fields.slice().sort((a,b)=>s[a]-s[b]);\n const low=touched.size===fields.length&&s[ranked[0]]<s[ranked[1]]?ranked[0]:null;')
    body = once(body, ' for(const key of fields){$("rrwl-"+key+"-value").textContent=s[key]+"/10";}',
                ' for(const key of fields){$("rrwl-"+key+"-value").textContent=touched.has(key)?s[key]+"/10":"Ikke vurdert";}')
    body = once(body, ' $("rrwl-brand-score").textContent=brand+"/100";',
                ' $("rrwl-brand-score").textContent=brand===null?"Ikke vurdert":brand+"/100";')
    body = once(body, ' $("rrwl-index-score").textContent=index+"/100";',
                ' $("rrwl-index-score").textContent=index===null?"Ikke vurdert":index+"/100";')
    body = once(body, ' $("rrwl-brand-bar").style.width=brand+"%";$("rrwl-index-bar").style.width=index+"%";',
                ' $("rrwl-brand-bar").style.width=brand===null?"0%":brand+"%";$("rrwl-index-bar").style.width=index===null?"0%":index+"%";')
    body = once(body,
                ' let label="Foreløpig: flere forhold bør undersøkes",expl="Resultatet er basert på arbeidsgiverens egne vurderinger, ikke på en kandidatundersøkelse eller ansattmåling.";',
                ' let label=touched.size?"Egenvurderingen er ikke fullført":"Ikke vurdert",expl="Brand vises når begge spørsmålene er besvart. Index vises når alle fire spørsmålene er besvart. Ubesvarte felt inngår ikke som observasjoner.";')
    body = once(body, ' if((s.reputation>=7 ? s.promise<=4 : false))',
                ' if(touched.has("reputation")&&touched.has("promise")&&(s.reputation>=7 ? s.promise<=4 : false))')
    body = once(body, ' if((s.reputation<=4 ? s.development>=7 : false))',
                ' if(touched.has("reputation")&&touched.has("development")&&(s.reputation<=4 ? s.development>=7 : false))')
    body = once(body, ' $("rrwl-action").textContent="Prioriter "+names[low]+". "+',
                ' $("rrwl-action").textContent=low===null?(assessed?"Flere forhold er vurdert likt. Velg hva dere bør arbeide med først ut fra dokumentasjon og aktuelle behov.":"Vurder de seks forholdene før dere prioriterer et område. Bare spørsmål dere har besvart brukes i egenvurderingen."):"Prioriter "+names[low]+". "+')
    body = once(body, 'assessed_dimensions:touched.size,all_dimensions_assessed:assessed,',
                'assessed_dimensions:touched.size,assessed_dimension_keys:[...touched],all_dimensions_assessed:assessed,brand_dimensions_assessed:brandAnswered,index_dimensions_assessed:indexAnswered,')
    body = once(body, 'illustrative_readiness:composite,dimensions:s,weakest_dimension:low,',
                'illustrative_readiness:composite,dimensions:Object.fromEntries(fields.map(key=>[key,touched.has(key)?s[key]:null])),weakest_dimension:low,')
    return body


def scenario(body):
    body = once(body, 'let memo="";', '''let memo="";
const guided=Boolean(document.querySelector('#rr-hurtigsjekk[data-guided="true"]'));''')
    body = once(body, 'const state=calc(),steps=actions(state.chosen);', '''const state=calc(),confirmed=Boolean($("rrp-diff-confirm")?.checked);
const steps=confirmed?actions(state.chosen):[];''')
    body = once(body, 'tag.textContent=state.points===8?',
                'tag.textContent=!confirmed?"Ikke bekreftet":guided?"Bekreftede valg":state.points===8?')
    body = once(body, 'title.textContent=state.points>=6?',
                'title.textContent=!confirmed?"Gå gjennom valgene før de brukes":guided?"Tiltak ut fra rekrutteringsopplegget":state.points>=6?')
    body = once(body, 'desc.textContent=changed>0?',
                'desc.textContent=!confirmed?"Standardvalgene er eksempler. Juster feltene og bekreft at de beskriver rekrutteringen deres.":guided?"Rådene bygger på valgene dere har bekreftet. De beskriver hva dere kan gjøre, ikke sannsynligheten for å lykkes.":changed>0?')
    body = once(body, '$("rrp-sim-points").textContent=String(state.points);', '''$("rrp-sim-points").textContent=confirmed?String(state.points):"Ikke bekreftet";
const bars=root.querySelector(".rrp-sim-bars");
if(bars){bars.hidden=guided||!confirmed;bars.style.display=bars.hidden?"none":"";}
$("rrp-sim-copy").disabled=!confirmed;''')
    body = once(body,
                'choices:state.chosen,illustrative_points:state.points,illustrative_start_points:8,advice:steps,',
                'confirmed,choices:confirmed?state.chosen:null,illustrative_points:confirmed?state.points:null,illustrative_start_points:confirmed?8:null,advice:steps,')
    body = once(body, 'for(const k of ids)$("rrp-sim-"+k).addEventListener("change",update);', '''for(const k of ids){
 const changed=()=>{const confirmation=$("rrp-diff-confirm");if(confirmation)confirmation.checked=false;update();};
 $("rrp-sim-"+k).addEventListener("input",changed);
 $("rrp-sim-"+k).addEventListener("change",changed);
}
$("rrp-diff-confirm")?.addEventListener("change",update);''')
    body = once(body, '$("rrp-sim-copy").addEventListener("click",async()=>{', '''$("rrp-sim-copy").addEventListener("click",async()=>{
if(!$("rrp-diff-confirm")?.checked){$("rrp-sim-status").textContent="Bekreft rekrutteringsvalgene før du kopierer notatet.";return;}''')
    marker = 'return ["RIDDERSET | REKRUTTERINGSPROGNOSE | BESLUTNINGSNOTAT"'
    body = once(body, marker, '''if(!$("rrp-diff-confirm")?.checked)return ["RIDDERSET | REKRUTTERINGSOPPLEGG","Yrke: "+occupation,"Område: "+county,"Rekrutteringsopplegget er ikke bekreftet. Standardvalgene inngår ikke i vurderingen."].join("\\n");
''' + marker)
    body = once(body, '"ILLUSTRATIV VURDERING AV SELVVALGTE BEGRENSNINGER",result.points+" av 8 indikatorpoeng (startoppsett 8). Ikke en risiko- eller sannsynlighetsmodell.",',
                '(guided?"BEKREFTET REKRUTTERINGSOPPLEGG":"ILLUSTRATIV VURDERING AV SELVVALGTE BEGRENSNINGER"),(guided?"Rådene nedenfor bygger på bekreftede valg, ikke en totalskår eller prognose.":result.points+" av 8 indikatorpoeng (startoppsett 8). Ikke en risiko- eller sannsynlighetsmodell."),')
    marker = '\n}\nfor(const k of ids)'
    body = once(body, marker, '\nwindow.dispatchEvent(new CustomEvent("rrp-scenario-updated",{detail:window.__rrpCurrent?.recruitment_scenario||null}));' + marker)
    return body


def decision(body):
    body = once(body, ' const wl=window.__rrpWorklife||null;', ''' const wl=window.__rrpWorklife||null;
 const brandText=typeof wl?.brand_self_assessed==="number"?wl.brand_self_assessed+"/100":"Ikke vurdert (begge Brand-spørsmål må besvares)";
 const indexText=typeof wl?.index_self_assessed==="number"?wl.index_self_assessed+"/100":"Ikke vurdert (alle fire Index-spørsmål må besvares)";''')
    body = once(body, ' const restriction="Dere har valgt et rekrutteringsopplegg med "+pts+', ''' const confirmed=Boolean(el("rrp-diff-confirm")?.checked);
 const guided=Boolean(document.querySelector('#rr-hurtigsjekk[data-guided="true"]'));
 const chosenLabels=["area","criteria","flex","method"].map(k=>el("rrp-sim-"+k)?.selectedOptions?.[0]?.textContent||"").filter(Boolean);
 const restriction=!confirmed?"Rekrutteringsopplegget er ikke bekreftet. Standardvalgene brukes ikke som opplysninger om virksomheten.":guided?"Bekreftet opplegg: "+chosenLabels.join(". ")+". Kontroller at valgene passer oppgavene og kandidatmarkedet.":"Dere har valgt et rekrutteringsopplegg med "+pts+''')
    body = once(body,
                '" Arbeidsgiverens Worklife-egenvurdering: Brand "+wl.brand_self_assessed+"/100, Index "+wl.index_self_assessed+"/100. "+(wl.all_dimensions_assessed?"Alle seks forhold er vurdert.":"Noen faktorer står fortsatt på nøytral startverdi.")',
                '" Arbeidsgiverens Worklife-egenvurdering: Brand "+brandText+", Index "+indexText+". "+(wl.all_dimensions_assessed?"Alle seks forhold er vurdert.":wl.assessed_dimensions+" av 6 forhold er vurdert. Ubesvarte startverdier er ikke observasjoner.")')
    body = once(body, '(wl?wl.brand_self_assessed+"/100":"Ikke vurdert")', 'brandText')
    body = once(body, '(wl?wl.index_self_assessed+"/100":"Ikke vurdert")', 'indexText')
    body = once(body, ' el("rrpd-local").textContent="Ikke målt for "+(town||area.name||"arbeidsstedet");',
                ' el("rrpd-local").textContent="Kandidattilgang ikke målt";')
    body = once(body,
                ' el("rrpd-local-detail").textContent="Yrkesvise aktive stillinger, kandidater og rekrutteringstid er ennå ikke koblet til for "+place+".";',
                ' el("rrpd-local-detail").textContent="Se observerte NAV-treff i hurtigsjekken. Antall kvalifiserte kandidater og faktisk rekrutteringstid er ikke målt for "+place+".";')
    body = once(body,
                'for(const id of ["rrp-region","rrp-offer","rrp-sim-area","rrp-sim-criteria","rrp-sim-flex","rrp-sim-method"])',
                'for(const id of ["rrp-region","rrp-offer","rrp-sim-area","rrp-sim-criteria","rrp-sim-flex","rrp-sim-method","rrp-diff-confirm"])')
    return body


def patch(source):
    result = script(source, 'rrwl-script', worklife)
    result = script(result, 'rrp-scenario-v03', scenario)
    result = script(result, 'rrpd-v1-script', decision)
    for key in ['reputation', 'visibility', 'promise', 'onboarding', 'development', 'leadership']:
        result = once(result, f'id="rrwl-{key}-value">5/10</output>',
                      f'id="rrwl-{key}-value">Ikke vurdert</output>')
    for key in ['brand', 'index']:
        result = once(result, f'id="rrwl-{key}-score">50<span style="font-size:15px">/100</span></strong>',
                      f'id="rrwl-{key}-score">Ikke vurdert</strong>')
        result = once(result, f'id="rrwl-{key}-bar" style="width:50%"',
                      f'id="rrwl-{key}-bar" style="width:0%"')
    replacements = [
        ('id="rrp-sim-tag" class="rrp-pill">Startprofil</span>',
         'id="rrp-sim-tag" class="rrp-pill">Ikke bekreftet</span>'),
        ('id="rrp-sim-title">Flere unødvendige hindringer i startoppsettet</h3>',
         'id="rrp-sim-title">Gå gjennom valgene før de brukes</h3>'),
        ('id="rrp-sim-description">Juster valgene ovenfor for å se hvordan dere kan åpne kandidatmarkedet.</p>',
         'id="rrp-sim-description">Standardvalgene er eksempler. Bekreft at valgene beskriver rekrutteringen deres før de brukes.</p>'),
        ('class="rrp-sim-bars"><div class="rrp-sim-bar">',
         'class="rrp-sim-bars" hidden style="display:none"><div class="rrp-sim-bar">'),
        ('id="rrp-sim-points">8</strong>', 'id="rrp-sim-points">Ikke bekreftet</strong>'),
        ('Krever NAVs stillingsfeed og god yrkeskoding på riktig geografisk nivå.',
         'Se NAV-treff og kildebegrensninger i hurtigsjekken. Utlysninger viser aktivitet i markedet, ikke hvor mange kvalifiserte kandidater som er tilgjengelige.'),
        ('Yrkes- og regionspesifikk kandidattilgang og annonsekonkurranse må kobles til og kvalitetssikres først.',
         'Observerte utlysninger vises i hurtigsjekken. Faktisk kandidattilgang og resultater fra rekrutteringer er fortsatt ikke målt.'),
        ('Vi arbeider med å koble yrkesspesifikke utlysninger inn når tilgangen er klar.',
         'Hurtigsjekken viser tilgjengelige NAV-treff for valgt rolle og kommune, med søkemåte og kildebegrensninger. Treffene er ikke et mål på kandidattilgang.'),
        ('<small>03 · Lokal rekrutteringskonkurranse</small>', '<small>03 · Kandidattilgang</small>'),
        ('For dette yrket har vi ikke koblet et verifisert yrkesanslag fra NAV til STYRK08 i testdatabasen.',
         'Denne bakgrunnstabellen har ikke et eget mangelanslag for yrket. Se hurtigsjekkens yrkesindikator og kildegrunnlag for den valgte rollen.'),
        ('Mangler yrkesvise etterspørsels- og kandidatdata for regionen.',
         'Mangler dokumentert kandidattilgang og validerte rekrutteringsutfall for rollen og arbeidsstedet.'),
    ]
    for before, after in replacements:
        result = once(result, before, after)
    # Markers, identities and form defaults must survive the presentation/data correction.
    for pattern in [r'<!--\s*/?wp:[\s\S]*?-->', r'\[(?:rr_hurtigsjekk|rr_markedssjekk)\b[^\]]*\]', r'\bid="[^"]+"']:
        if re.findall(pattern, result) != re.findall(pattern, source):
            raise ValueError(f"Protected structure changed: {pattern}")
    return result


def main():
    parser = ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, default=Path('/workspace/scratch/ef3e496bd143/guided-2124-after.html'))
    parser.add_argument('--output', type=Path, default=Path('/workspace/scratch/ef3e496bd143/holistic-2124-after.html'))
    args = parser.parse_args()
    if args.input.resolve() == args.output.resolve():
        parser.error('Input and output must differ; the source snapshot is immutable.')
    original = args.input.read_text(encoding='utf-8')
    revised = patch(original)
    args.output.write_text(revised, encoding='utf-8')
    print(f'Input: {args.input} ({len(original)} chars, sha256 {sha256(original.encode()).hexdigest()})')
    print(f'Output: {args.output} ({len(revised)} chars, sha256 {sha256(revised.encode()).hexdigest()})')
    print('Preserved all WordPress block markers, shortcodes and IDs. No external writes.')


if __name__ == '__main__':
    main()
