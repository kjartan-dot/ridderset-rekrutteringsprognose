"""Extract only codes/names and reviewable synonyms. Never execute legacy JS."""
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parent.parent
source = (root / 'legacy/wordpress-page-2124.html').read_text()
rows = json.loads(re.search(r'window\.__rrpOccupations=(\[.*?\]);', source).group(1))
assert len(rows) == len({r['code'] for r in rows}) == 407
(root / 'data/occupations.json').write_text(json.dumps(
    [{'code': r['code'], 'name': r['name']} for r in rows], ensure_ascii=False, indent=2) + '\n')
block = source.split('const aliases={', 1)[1].split('};', 1)[0]
aliases = {code: values.split(',') for code, values in re.findall(r'"(\d{4})":"([^"]+)"', block)}
aliases['1221'] += ['salgssjef']
aliases['1323'] += ['prosjektleder', 'prosjektsjef']
aliases['3112'] += ['prosjektleder']
aliases['2421'] = ['prosjektleder', 'prosjektsjef', 'organisasjonsrådgiver']
aliases['3511'] = ['driftstekniker', 'it-driftstekniker']
aliases['3115'] += ['driftstekniker', 'mekanisk driftstekniker']
assert all(code in {r['code'] for r in rows} for code in aliases)
(root / 'data/occupation-synonyms.json').write_text(json.dumps(aliases, ensure_ascii=False, indent=2) + '\n')
print(f'{len(rows)} yrker; {len(aliases)} synonymgrupper. Ingen legacy-lønn importert.')
