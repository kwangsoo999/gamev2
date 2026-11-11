"""Repository and optional dev-server audit for the v2 Elysia artwork manifest."""
from pathlib import Path
import json, sys, urllib.request
try:
    from PIL import Image
except ImportError:
    Image = None

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'apps/game-client/public'
MANIFEST = PUBLIC / 'assets/elysia/manifest.json'

def check():
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    assets = manifest['assets']
    rows=[]
    for asset in assets:
        relative=asset['path'].removeprefix('/').replace('/', '\\')
        file=PUBLIC / relative
        row={'id':asset['id'],'path':asset['path'],'exists':file.is_file(),'status':'missing' if not file.is_file() else 'present'}
        if file.is_file() and Image:
            try:
                with Image.open(file) as image:
                    row['decoded']=True; row['format']=image.format; row['dimensions']=list(image.size)
                    row['dimensionsMatch']=list(image.size)==asset['dimensions']
                    row['transparency']=('A' in image.getbands())
            except Exception as error:
                row['decoded']=False; row['decodeError']=str(error)
        if file.is_file():
            for port in (3000, 3001):
                try:
                    with urllib.request.urlopen(f'http://localhost:{port}'+asset['path'], timeout=3) as response:
                        row['httpStatus']=response.status; row['mime']=response.headers.get('Content-Type')
                        row.pop('httpError', None)
                        break
                except Exception as error:
                    row['httpError']=str(error)
        rows.append(row)
    result={'manifestEntries':len(rows),'existing':sum(x['exists'] for x in rows),'decoded':sum(x.get('decoded',False) for x in rows),'missing':[x['path'] for x in rows if not x['exists']],'incorrectDimensions':[x['path'] for x in rows if x.get('dimensionsMatch') is False],'assets':rows}
    output=ROOT/'art-production/asset-audit.json'; output.write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n',encoding='utf-8'); print(json.dumps({k:v for k,v in result.items() if k!='assets'},indent=2,ensure_ascii=False)); return 0 if not result['missing'] and not result['incorrectDimensions'] else 1

if __name__=='__main__': sys.exit(check())
