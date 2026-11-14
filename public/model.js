import {marketBrief} from './market.js';
export const questions = [
 ['reputation','Hva tror dere aktuelle kandidater forbinder med arbeidsplassen?'],
 ['visibility','Hvor synlige og troverdige er dere for målgruppen?'],
 ['promise','Hvor godt samsvarer rekrutteringsløftene med arbeidshverdagen?'],
 ['onboarding','Hvor godt blir nyansatte fulgt opp?'],
 ['development','Hvor gode er de reelle utviklingsmulighetene?'],
 ['leadership','Hvor godt fungerer ledelse og oppfølging?']
];
export function assess(answers = {}) {
 const dimensions = Object.fromEntries(questions.map(([k]) => [k, typeof answers[k] === 'number' && Number.isFinite(answers[k]) && answers[k] >= 0 && answers[k] <= 10 ? answers[k] : null]));
 const score = keys => keys.every(k => dimensions[k] !== null) ? Math.round(keys.reduce((s,k) => s + dimensions[k],0) / keys.length * 10) : null;
 return {source:'Ledelsens egenvurdering',not_validated:true,method:'Lik vekt innen hvert tema. Illustrasjon, ingen terskler eller samlet risikoscore.',dimensions,answered:Object.values(dimensions).filter(v=>v!==null).length,brand:score(['reputation','visibility']),experience:score(['promise','onboarding','development','leadership'])};
}
export function displayScore(n) { return n === null ? 'Ikke ferdig vurdert' : `${n}/100`; }
export function priorities(answers) {
 const a=assess(answers);
 if(a.answered!==6) return ['Besvar eller avklar de seks forholdene før dere prioriterer ut fra egenvurderingen.'];
 const lowest=Math.min(...Object.values(a.dimensions));
 return questions.filter(([k])=>a.dimensions[k]===lowest).map(([,label])=>`Undersøk nærmere: ${label} Bekreft ledelsens bilde med relevante ansatte eller kandidater.`);
}
export function reportText(state) {
 const a=assess(state.answers);
 const company=state.company;
 return ['RIDDERSET · BESLUTNINGSGRUNNLAG · TESTVERSJON',`Dato: ${new Date().toISOString()}`,
 `Virksomhet: ${company?.name || 'Ikke valgt'}`,`Organisasjonsnummer: ${company?.orgnr || 'Ikke oppgitt'}`,`Opplysningskilde: ${company?.source || 'Ikke hentet'}`,`Arbeidssted, oppgitt av arbeidsgiver: ${state.workplace || 'Ikke bekreftet'}`,
 `Rolle: ${state.role || 'Ikke oppgitt'}`,`Yrkesgruppe: ${state.occupation ? state.occupation.code+' '+state.occupation.name : 'Ikke valgt'}`,
 `Hva skal rollen løse? ${state.mission || 'Ikke avklart'}`,`Nødvendige krav: ${state.requirements || 'Ikke avklart'}`,`Slik undersøkes kravene: ${state.evidence || 'Ikke avklart'}`,
 '\nMARKEDSDATA',state.salary ? `SSB 11418: ${state.salary.value === null ? 'Mangler tall' : state.salary.value+' kr per måned'}. ${state.salary.description}. År ${state.salary.year}. Oppdatert ${state.salary.updated}. Hentet ${state.salary.fetchedAt}. Kilde: ${state.salary.source}` : 'SSB: Ikke hentet.',
 'NAV aktive annonser og posisjoner: Utilgjengelig. Ingen aktiv feed i denne testversjonen.',
 '\nREKRUTTERINGSBILDE',marketBrief(state).assessment,...marketBrief(state).facts,...marketBrief(state).unknowns.map(x=>'Mangler: '+x),...marketBrief(state).actions.map(x=>'Tiltak: '+x),'\nLEDELSENS EGENVURDERING',`Besvart: ${a.answered}/6`,`Omdømme/synlighet: ${displayScore(a.brand)}`,`Arbeidshverdag/oppfølging: ${displayScore(a.experience)}`,
 ...questions.map(([k,q])=>`${q} ${a.dimensions[k]===null?'Ikke besvart':a.dimensions[k]+'/10'}`),`HR-kapasitet: ${state.hr || 'Ikke avklart'}`,a.method,'Dette er ikke en medarbeidermåling, ekstern omdømmemåling eller validert WorkLife-indeks.',
 '\nFORESLÅTT OPPFØLGING','30 dager: Bekreft oppgaver, arbeidssted og nødvendige krav. Avklar ansvarlig og lønnsramme.','60 dager: Undersøk kandidatmarkedet og velg søke- og vurderingsmetoder.','90 dager: Følg opp gjennomførte tiltak og juster planen. Tidspunktene er en arbeidsplan, ikke en prognose for ansettelse.',...priorities(state.answers)
 ].join('\n');
}
