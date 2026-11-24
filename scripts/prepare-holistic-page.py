#!/usr/bin/env python3
"""Prepare the journey rollout after patch-holistic-legacy.py.

Move changed runtimes out of Gutenberg, whose rendering may entity-encode JS.
Preserve script execution positions. No network writes. Use --input/--output
with a fresh local snapshot, and package the written assets before page rollout.
"""
from argparse import ArgumentParser
from pathlib import Path
import re

parser = ArgumentParser(description=__doc__)
parser.add_argument('--input', type=Path, required=True)
parser.add_argument('--output', type=Path, required=True)
parser.add_argument('--version', default='0.3.3')
args = parser.parse_args()
plugin = Path(__file__).resolve().parents[1] / 'integrations/wordpress/ridderset-hurtigsjekk'
s = args.input.read_text()
s = s.replace('Kombiner en målrettet annonse med aktiv kartlegging og dialog med aktuelle kandidater.', 'Kontroller om annonsen når den aktuelle målgruppen. Vurder nettverk eller direkte kandidatkontakt når kartleggingen viser behov for det.')
s = s.replace('Kan vi gjøre denne stillingen enklere å rekruttere til?', 'Avklar søkeopplegget for rollen')
s = s.replace('Test hvordan geografisk søk, kravprofil, fleksibilitet og søkemetode påvirker hindringene dere selv legger inn i prosessen. Dette er en kvalitativ fagmodell, ikke en prognose for antall søkere.', 'Vurder søkeområde, nødvendige krav, arbeidsform og kanaler i sammenheng med oppgavene. Fysisk oppmøte og faglige krav kan være nødvendige rammer. Bekreft valgene før dere bruker rådene.')
s = s.replace('Skalaen viser antall poeng for selvvalgte begrensninger (0–8), ikke rekrutteringsrisiko, sannsynlighet eller antall søkere. Alle fire faktorer vektes likt som et transparent illustrativt utgangspunkt. Det er ingen validert modell for årsakssammenheng eller effektstørrelse.', 'Rådene følger de valgene dere bekrefter. De er praktiske forslag som må vurderes mot jobben og målgruppen, ikke en beregning av søkerantall eller ansettelsessannsynlighet.')
for identifier, name in [('rrwl-script','legacy-worklife.js'),('rrp-scenario-v03','legacy-scenario.js'),('rrpd-v1-script','legacy-decision.js')]:
    pattern = r'<script id="' + re.escape(identifier) + r'">([\s\S]*?)</script>'
    match = re.search(pattern, s)
    if not match: raise SystemExit('Missing exact inline script: ' + identifier)
    (plugin/name).write_text(match[1].strip() + '\n')
    tag = '<script id="' + identifier + '" src="https://ridderset.no/wp-content/plugins/ridderset-hurtigsjekk/' + name + '?ver=' + args.version + '"></script>'
    s = s[:match.start()] + tag + s[match.end():]
s = s.replace('[rr_hurtigsjekk guided="1"]', '[rr_hurtigsjekk guided="1" journey="1"]', 1)
s = s.replace('<summary>Neste steg: tilpass rekrutteringen</summary>', '<summary>Flere verktøy: søkevalg og Worklife</summary>', 1)
args.output.write_text(s)
print(f'Prepared {len(s)} characters; three changed runtimes are external files at version {args.version}.')
