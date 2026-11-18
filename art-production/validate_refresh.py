"""Validate runtime image contracts and reproducible atlas exports without writes."""
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'apps/game-client/public'
manifest = json.loads((PUBLIC / 'assets/elysia/manifest.json').read_text())
report = json.loads((ROOT / 'art-production/refresh-exports.json').read_text())
errors = []

for asset in manifest['assets']:
    try:
        with Image.open(PUBLIC / asset['path'].lstrip('/')) as image:
            image.load()
            if list(image.size) != asset['dimensions']:
                errors.append(f"Manifest dimensions differ: {asset['id']}")
            if asset.get('transparency') and 'A' not in image.getbands():
                errors.append(f"Alpha channel missing: {asset['id']}")
    except Exception as error:
        errors.append(f"{asset['id']}: {error}")

if len(report['exports']) != report['exportCount']:
    errors.append('Export count does not match report')
for url, export in report['exports'].items():
    try:
        file = PUBLIC / url.lstrip('/')
        if not file.resolve().is_relative_to(PUBLIC):
            raise ValueError('Export escapes the public directory')
        if hashlib.sha256(file.read_bytes()).hexdigest() != export['sha256']:
            errors.append(f'Export hash differs: {url}')
        with Image.open(file) as image:
            image.load()
            if list(image.size) != export['dimensions']:
                errors.append(f'Export dimensions differ: {url}')
            if image.convert('RGBA').getchannel('A').getextrema()[1] == 0:
                errors.append(f'Blank export: {url}')
        if not (ROOT / 'art-production/source/refresh' / export['source']).is_file():
            errors.append(f'Source atlas missing: {url}')
    except Exception as error:
        errors.append(f'{url}: {error}')

if errors:
    raise SystemExit('\n'.join(errors))
print(f"PASS: {len(manifest['assets'])} runtime assets; {len(report['exports'])} verified exports.")
