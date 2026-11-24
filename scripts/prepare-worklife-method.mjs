import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const worklifeScript = /<script id="rr-worklife-proof-script">([\s\S]*?)<\/script>/g;

function replaceOnce(source, before, after, label) {
  const index = source.indexOf(before);
  if (index === -1 || source.indexOf(before, index + before.length) !== -1) {
    throw new Error(`Expected one original ${label} in the Worklife block.`);
  }
  return source.slice(0, index) + after + source.slice(index + before.length);
}

export function prepareWorklifeMethod(source) {
  const scripts = [...source.matchAll(worklifeScript)];
  if (scripts.length !== 1) throw new Error('Expected one Worklife proof script.');
  const [[originalTag, originalScript]] = scripts;

  let runtime = replaceOnce(originalScript,
    'const output=(code,title,why)=>({code,title,why,log,voice,market,bounds});',
    'let target=null;\n    const output=(code,title,why)=>({code,title,why,log,voice,market,bounds,target});',
    'model result');
  runtime = replaceOnce(runtime, 'const target=Number(c.target);', 'target=Number(c.target);', 'model target');
  runtime = replaceOnce(runtime,
    'const target=worklifeAnd((worklifeAnd((M.integer(c.target)), () => (+c.target>=1))), () => (worklifeAtMost((+c.target), (100))));',
    'const target=r.target;', 'target in the result view');
  runtime = replaceOnce(runtime,
    'M.percent(+c.target)',
    'M.percent(target)', 'target percentage in the result view');
  runtime = replaceOnce(runtime,
    'r.log.rate-Number(c.target)',
    'r.log.rate-target', 'practice gap in the result view');
  runtime = replaceOnce(runtime,
    'r.voice.rate-Number(c.target)',
    'r.voice.rate-target', 'employee gap in the result view');
  runtime = replaceOnce(runtime,
    'if (worklifeAnd((worklifeAnd((M.integer(c.target)), () => (+c.target>=1))), () => (worklifeAtMost((+c.target), (100))))) {',
    'if (r.target!==null) {', 'target filter in the export');
  runtime = replaceOnce(runtime,
    'r.log.rate-(+c.target)',
    'r.log.rate-r.target', 'practice gap in the export');
  runtime = replaceOnce(runtime,
    'r.voice.rate-(+c.target)',
    'r.voice.rate-r.target', 'employee gap in the export');
  runtime = replaceOnce(runtime,
    "'Periode: '+shown(c.start)+' til '+shown(c.end),'Mål: '+(M.blank(c.target)?'Ikke oppgitt':c.target+' %')+'. Avtalt: '+shown(c.agreed),",
    "'Periode: '+shown(c.start)+' til '+shown(c.end),'Oppgitt mål: '+(M.blank(c.target)?'Ikke oppgitt':c.target+' %')+'. Oppgitt dato: '+shown(c.agreed),",
    'target input in the export');
  runtime = replaceOnce(runtime,
    "lines.push('ARBEIDSGIVERLØFTENE',supported+' av '+registered.length+' registrerte kontrollpunkter har støtte i begge kilder.');",
    "lines.push('ARBEIDSGIVERLØFTENE',registered.length?supported+' av '+registered.length+' registrerte kontrollpunkter har støtte i begge kilder.':'Ingen kontrollpunkter er registrert.');",
    'summary of registered claims');
  runtime = replaceOnce(runtime,
    "const list=data().claims;\n    get('#pf-summary').textContent='Samlet har '+list.filter(c=>M.evaluate(c).code==='supported').length+' av '+list.filter(c=>M.filled(c.name)).length+' registrerte kontrollpunkter støtte i begge kilder.';",
    "const list=data().claims.filter(c=>M.filled(c.name));\n    get('#pf-summary').textContent=list.length?'Samlet har '+list.filter(c=>M.evaluate(c).code==='supported').length+' av '+list.length+' registrerte kontrollpunkter støtte i begge kilder.':'';",
    'summary in the result view');
  runtime = replaceOnce(runtime,
    'Forventning minus erfaring for de seks felles temaene',
    'Forventning minus erfaring for de seks felles spørsmålene fordelt på tre temaer',
    'comparison wording in the export');

  let updated = replaceOnce(source, originalTag, originalTag.replace(originalScript, () => runtime), 'proof script');
  updated = replaceOnce(updated,
    'Dater kriteriet før måleperioden.',
    'Dater kriteriet senest ved starten av måleperioden.',
    'method wording for the criterion date');
  return replaceOnce(updated,
    'For hvert mål vises forskjellen i prosentpoeng.',
    'Når modellen godtar målet og datoen, vises forskjellen i prosentpoeng.',
    'method wording for the comparison');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [, , input, output] = process.argv;
  if (!input || !output) {
    console.error('Usage: node scripts/prepare-worklife-method.mjs <original-worklife.html> <updated-worklife.html>');
    process.exitCode = 1;
  } else {
    try {
      const source = await readFile(input, 'utf8');
      await writeFile(output, prepareWorklifeMethod(source), {flag: 'wx'});
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
  }
}
