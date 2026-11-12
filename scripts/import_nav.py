"""Refresh reviewed NAV snapshots from official XLSX publications (openpyxl).

Fails on an unexpected year/layout. Commit raw files, manifest and JSON together.
Never infer a local occupation value from independent county/occupation tables.
"""
import argparse
import hashlib
import html
import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parent.parent
MONTHS = ['Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Desember']
PAGES = {
    'vacancies': 'https://www.nav.no/no/nav-og-samfunn/statistikk/arbeidssokere-og-stillinger-statistikk/ledige-stillinger',
    'survey': 'https://www.nav.no/no/nav-og-samfunn/kunnskap/analyser-fra-nav/arbeid-og-velferd/arbeid-og-velferd/bedriftsundersokelsen',
}

def download(url, path):
    subprocess.run(['curl', '--fail', '--silent', '--show-error', '--location', '--max-time', '40', url, '-o', str(path)], check=True)

def norm(value):
    return re.sub(r'[^\w]+', '', value.lower())

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--refresh', action='store_true')
    args = parser.parse_args()
    manifest_path = ROOT / 'data/nav-sources.json'
    if args.refresh:
        manifest = []
        for page, token, file in [('vacancies', 'STIL030', 'nav-vacancies-county.xlsx'), ('vacancies', 'STIL040', 'nav-vacancies-occupation.xlsx'), ('survey', '2026', 'nav-survey-2026.xlsx')]:
            page_path = ROOT / f'work/nav-{page}.html'
            page_path.parent.mkdir(exist_ok=True)
            download(PAGES[page], page_path)
            links = [html.unescape(link) for link in re.findall(r'href="([^"]+)"', page_path.read_text()) if token in link and '.xlsx' in link]
            if not links:
                raise ValueError(f'Ingen gjennomgått kilde for {file}')
            url = 'https://www.nav.no' + links[0]
            download(url, ROOT / 'data/raw' / file)
            manifest.append({'file': file, 'url': url, 'page': PAGES[page]})
    else:
        manifest = json.loads(manifest_path.read_text())
    retrieved = datetime.now(timezone.utc).isoformat()
    for item in manifest:
        item['sha256'] = hashlib.sha256((ROOT / 'data/raw' / item['file']).read_bytes()).hexdigest()
        if args.refresh or 'retrievedAt' not in item:
            item['retrievedAt'] = retrieved
    by_file = {item['file']: item for item in manifest}

    def monthly(file, sheet, code_col, name_col):
        ws = load_workbook(ROOT / 'data/raw' / file, data_only=True)[sheet]
        assert '2026' in str(ws.cell(6, 2).value), 'Ny periode må gjennomgås'
        cols = [(c.column, MONTHS.index(c.value) + 1) for c in ws[8] if c.value in MONTHS]
        assert len(cols) >= 1
        records = []
        for row in range(9, ws.max_row + 1):
            name, code = ws.cell(row, name_col).value, ws.cell(row, code_col).value
            if not isinstance(name, str):
                continue
            if not code and name == 'I alt':
                code = '00'
            if not re.fullmatch(r'\d{2}|\d{4}', str(code)):
                continue
            series = [{'period': f'2026-{month:02}', 'value': ws.cell(row, col).value} for col, month in cols]
            assert all(v['value'] is None or (isinstance(v['value'], (int, float)) and v['value'] >= 0) for v in series)
            records.append({'code': str(code), 'name': name.strip(), 'series': series, 'sheet': sheet, 'row': row})
        assert records
        return records

    counties = monthly('nav-vacancies-county.xlsx', '1. Antall. Fylke', 2, 3)
    occupations = monthly('nav-vacancies-occupation.xlsx', '4. Antall. Top 30 i perioden', 2, 3)
    catalog = json.loads((ROOT / 'data/occupations.json').read_text())
    mapping = {norm(row['name']): row['code'] for row in catalog}
    mapping.update({norm('Førskolelærere'): '2342'})
    survey = load_workbook(ROOT / 'data/raw/nav-survey-2026.xlsx', data_only=True)

    def shortage(sheet, names):
        records = []
        ws = survey[sheet]
        assert '2026' in ws.cell(1, 1).value
        for i, row in enumerate(ws.values, 1):
            name, value, low, high = row[:4]
            if not isinstance(name, str) or not isinstance(value, (int, float)):
                continue
            code = names.get(norm(name))
            if not code:
                continue
            assert all(isinstance(n, (int, float)) for n in [value, low, high]) and low <= high
            records.append({'code': code, 'name': name.strip(), 'value': value, 'low': low, 'high': high, 'sheet': sheet, 'row': i})
        return records

    county_codes = {norm(x['name'].split(' - ')[0]): x['code'] for x in counties}
    county_codes[norm('I alt')] = '00'
    result = {
        'version': 1,
        'period': '2026-10',
        'surveyPeriod': '2026',
        'sources': by_file,
        'countyVacancies': counties,
        'occupationVacancies': occupations,
        'countyShortages': shortage('Tabell 1 - 26', county_codes),
        'occupationShortages': shortage('Tabell V2 - 26', mapping),
        'notes': ['Stillinger er tilgang i perioden, ikke aktive annonser.', 'STYRK-tabellen omfatter bare publisert topp 30.', 'Mangel er et utvalgsanslag med 95 % konfidensintervall. Ingen lokalisering av nasjonale yrkestall.'],
    }
    assert len(counties) >= 16 and len(occupations) == 30 and len(result['occupationShortages']) >= 6
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    (ROOT / 'data/nav-snapshot.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(f'NAV: {len(counties)} områder, {len(occupations)} yrkesserier, {len(result["occupationShortages"])} kontrollerte mangelanslag.')

if __name__ == '__main__':
    main()
