// Explainable decision support, not a prediction of recruitment outcomes.
export function marketBrief(s){
 const facts=[],unknowns=[],actions=[];
 if(s.company)facts.push(`${s.company.name}: ${s.company.source}.`);else unknowns.push('Virksomheten er ikke valgt.');
 if(s.occupation)facts.push(`Yrkesgruppe ${s.occupation.code}: ${s.occupation.name}.`);else unknowns.push('Yrkesgruppen må bekreftes før lønn kan sammenlignes.');
 if(s.workplace?.trim())facts.push(`Arbeidssted oppgitt av deg: ${s.workplace}.`);else unknowns.push('Faktisk arbeidssted er ikke avklart.');
 const salary=Number(s.offeredSalary),valid=Number.isFinite(salary)&&salary>0;
 if(s.salary?.value!=null){facts.push(`Nasjonal median månedslønn: ${s.salary.value.toLocaleString('nb-NO')} kr (${s.salary.year}).`);if(valid){const difference=Math.round((salary/s.salary.value-1)*100);facts.push(`Oppgitt sammenlignbar månedslønn er ${Math.abs(difference)} % ${difference<0?'under':'over eller lik'} den nasjonale medianen.`);if(difference<0)actions.push('Undersøk om lønnsrammen er konkurransedyktig i relevant bransje og lokalt marked. Nasjonal median alene avgjør ikke dette.');}}
 else unknowns.push('Lønnsreferanse fra SSB mangler.');
 if(!valid)unknowns.push('Sammenlignbar månedslønn er ikke oppgitt.');
 if(s.flexibility==='remote')actions.push('Undersøk et bredere geografisk kandidatmarked. Avklar hvor ofte fysisk oppmøte faktisk er nødvendig.');
 if(s.flexibility==='onsite')actions.push('Kartlegg reelt pendleområde og muligheter for flytting. Ikke bruk kommunens størrelse som mål på rekrutteringsvanskelighet.');
 if(s.startWindow==='urgent')actions.push('Avklar hvilke krav som må være oppfylt ved start, og hva som kan læres. Vurder midlertidig intern oppgavefordeling mens søket pågår.');
 if(!s.mission?.trim())actions.push('Beskriv det viktigste den nye medarbeideren skal levere, før kravlisten fastsettes.');
 actions.push('Undersøk relevante kandidatmiljøer og konkurrerende utlysninger før dere velger annonsering alene eller aktivt søk.');
 unknowns.push('Aktive NAV-utlysninger og antall relevante tilgjengelige kandidater er ikke dokumentert.');
 return {headline:'Dette vet vi om neste rekruttering',assessment:'Rekrutteringsvanskeligheten er foreløpig uavklart. Vi har ikke tilstrekkelige markedsdata til å gi en samlet prognose.',facts,unknowns,actions:[...new Set(actions)],method:'Rådene følger eksplisitte valg og datakilder. Ingen beregnet søkerprognose, tid til ansettelse eller risikoprosent.'};
}
