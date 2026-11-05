import concurrent.futures
import json
import urllib.request
from pathlib import Path

root = Path(__file__).resolve().parents[1]
items = json.loads((root/'src/data/catalog.json').read_text(encoding='utf8'))['items']
target = root/'public/assets/items'
target.mkdir(parents=True,exist_ok=True)
def download(item):
    path = target/(item['id']+'.png')
    if path.exists(): return True
    try:
        image = urllib.request.urlopen('https://raw.githubusercontent.com/hexaov91/abi-assets/main/image/Normal/'+item['id']+'.png',timeout=25).read()
        if not image.startswith(b'\x89PNG'): return False
        path.write_bytes(image)
        return True
    except Exception:
        return False
with concurrent.futures.ThreadPoolExecutor(max_workers=16) as pool:
    results = list(pool.map(download,items))
print(f'Cached {sum(results)} of {len(items)} icons.')
