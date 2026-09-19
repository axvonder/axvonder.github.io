"""Check publication downloads and their links: python3 publications/verify.py."""

import hashlib
import json
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.downloads = []
        self.toggles = []
        self.ids = {}

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            assert attrs['id'] not in self.ids, f"Duplicate id: {attrs['id']}"
            self.ids[attrs['id']] = attrs
        if tag == 'a' and 'download' in attrs:
            self.downloads.append(attrs)
        if tag == 'button' and 'abstract-toggle' in attrs.get('class', '').split():
            self.toggles.append(attrs)


root = Path(__file__).resolve().parents[1]
records = json.loads((root / 'publications/publications.json').read_text())
page = Page()
page.feed((root / 'index.html').read_text())
assert len(records) == 10, 'Expected the ten selected publications'
assert len(page.toggles) == 10, 'Each publication needs an abstract or summary'
expected = {record['downloadFile']: record for record in records if record.get('downloadFile')}
actual = {unquote(link['href']): link for link in page.downloads}
assert actual.keys() == expected.keys(), 'Download links must match verified files'
for relative, record in expected.items():
    path = (root / relative).resolve()
    assert path.is_relative_to(root / 'publications/PDFs'), 'PDF outside download folder'
    assert record['shareable'] is True and record['rightsNote'], 'Missing sharing basis'
    data = path.read_bytes()
    assert data.startswith(b'%PDF-'), f'Not a PDF: {relative}'
    assert hashlib.sha256(data).hexdigest() == record['sha256'], f'Changed PDF: {relative}'
    assert actual[relative]['download'] == path.name, 'Incorrect download filename'
for button in page.toggles:
    assert button['aria-expanded'] == 'false', 'Abstracts must start collapsed'
    assert 'hidden' in page.ids[button['aria-controls']], 'Missing collapsed abstract'
    assert button['aria-describedby'] in page.ids, 'Missing publication heading'
assert {str(path.relative_to(root)) for path in (root / 'publications/PDFs').glob('*.pdf')} == expected.keys(), 'Unlisted PDF in download folder'
print(f'Checked {len(records)} publications, {len(actual)} PDFs, and {len(page.toggles)} disclosures.')
