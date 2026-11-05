import csv
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parents[1]
items = json.loads((root / 'src/data/catalog.json').read_text(encoding='utf-8'))['items']
def normalized(value):
    return re.sub('[^a-z0-9]', '', value.lower().replace('headset','').replace('chest',''))
by_name = {normalized(item['name']):item for item in items}
def rows(name):
    return csv.DictReader((root / 'data/source-cache/abidb' / f'{name}.csv').read_text(encoding='utf-8-sig').splitlines(),delimiter=';')
helmets = {}
for row in rows('Helmets'):
    item = by_name.get(normalized(row['NomeItem']))
    if not item: raise ValueError('Unmatched helmet ' + row['NomeItem'])
    built_in = row['CaptacaoSom'] != '/////' or row['ReducaoRuido'] != '/////'
    helmets[item['id']] = {'externalHeadset':row['TemHeadset']=='Sim' and not built_in,'builtInAudio':built_in,'faceShields':[],'gasMasks': 'Face' not in row['AreaProtegida'] and row['AreaProtegida'].strip()=='Head','sourceName':row['NomeItem']}
for row in rows('MaskCompatibility'):
    mask = by_name.get(normalized(row['MaskName']))
    if not mask: raise ValueError('Unmatched mask ' + row['MaskName'])
    for name in row['CompatibleHelmets'].split(','):
        helmet = by_name.get(normalized(name))
        if not helmet or helmet['id'] not in helmets: raise ValueError('Unmatched mask host '+name)
        helmets[helmet['id']]['faceShields'].append(mask['id'])
result = {'checked':'2026-11-05','sources':['https://github.com/fabiopsyduck/ABIDB-WEB','https://arena-breakout-infinite.fandom.com/wiki/Face_Coverings'],'gasMaskRule':'Standalone or head-only open-face helmet coverage. This conservative coverage rule is inferred, not a per-mask socket table. Face shields and gas masks share one slot.','helmets':helmets}
(root / 'src/data/wearables.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
print(f'{len(helmets)} helmet profiles, {sum(len(h["faceShields"]) for h in helmets.values())} shield pairings. Gas-mask coverage is explicitly inferred.')
