import csv
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parents[1]
source = root / 'data/source-cache'
def read(name):
    return json.loads((source / name).read_text(encoding='utf8'))

index = read('items-index.json')['items']
details = read('items-details.json')['items']
locale = read('localization-en.json')['UACommonItemTable']
weapons = {str(row['id']): row for row in read('weapon-detail.json')['weapons']}
bullets = {str(row['id']): row for row in read('bullet-detail.json')['bullets']}
armor = {str(row['id']): row for row in read('armor-detail.json')['armors']}
def normalized(name):
    return re.sub(r'[^a-z0-9]', '', name.lower().replace('headset', '').replace('chest', ''))

categories = {'Weapons':'weapon','Ammo':'ammo','Armoredrigs':'armoredRig','Backpacks':'backpack','Unarmoredrigs':'rig','Medicalkit':'healing','Surgicalkit':'surgery','Bandages':'bandage','Helmets':'helmet','Bodyarmors':'armor','Headsets':'headset','Masks':'face','Gasmasks':'gasMask','Throwables':'grenade','Beverages':'drink','Food':'food','Painkillers':'painkiller','Stimulants':'stim'}
csv_records = {}
for filename, category in categories.items():
    for row in csv.DictReader((source / 'abidb' / (filename + '.csv')).read_text(encoding='utf-8-sig').splitlines(), delimiter=';'):
        if row.get('NomeItem'):
            csv_records[normalized(row['NomeItem'])] = (category, row)

items = []
for key, row in index.items():
    name = locale['Name'].get(key)
    if not name or (not row.get('iconAvailable') and row.get('kind') not in ['accessory', 'ammo']):
        continue
    detail = details.get(key, {})
    match = csv_records.get(normalized(name))
    category = match[0] if match else row['kind']
    extra = match[1] if match else {}
    w = weapons.get(key, {})
    b = bullets.get(key, {})
    a = armor.get(key, {})
    compartments = []
    for count, width, height in re.findall(r'(?:\((\d+)\))?\s*(\d+)x(\d+)', extra.get('LayoutInterno', '')):
        compartments.extend([[int(width), int(height)]] * int(count or 1))
    item = {'id':key,'name':name,'category':category,'kind':row['kind'],'size':row.get('size',[1,1]),'price':row.get('referencePrice',0),'weight':detail.get('weightKg',0),'icon':f'assets/items/{key}.png','source':'tracker','wiki':'https://arena-breakout-infinite.fandom.com/wiki/' + name.replace(' ', '_'),'stats':detail.get('stats',[]),'description':locale.get('Describe',{}).get(key,''),'seasonal':detail.get('seasonal',False),'eligible':bool(match) and not detail.get('seasonal',False)}
    for field in ['name', 'description']:
        item[field] = item[field].replace('\u2014', '; ').replace('\u2013', '-')
    if not (root/'public'/item['icon']).exists(): item['icon'] = 'assets/missing-item.svg'
    if compartments: item['compartments'] = compartments
    if a: item['tier'] = a.get('stats',{}).get('armor_level',0)
    if w: item.update({'ammoTag':(w.get('ammoTag') or next((tag for tag in w.get('supportedTags', []) if tag.startswith('Ammo.')), '')),'caliber':w.get('caliber',''),'weaponClass':extra.get('Classe',''),'supportedTags':w.get('supportedTags',[])})
    if b: item.update({'ammoTag':b.get('ammoTag',''),'tier':b.get('stats',{}).get('PenetrationLevel',0)})
    if category == 'accessory':
        cap = re.search(r'(\d+)[- ](?:[Rr]ound|[Ss]hell)',name)
        if cap: item['capacity'] = int(cap.group(1))
        elif key == '201050008': item['capacity'] = 5
        elif key in ['201050166', '201050167']: item['capacity'] = 30
    items.append(item)

for key, bullet in bullets.items():
    if key != '202110001' or any(item['id'] == key for item in items) or key not in locale['Name']:
        continue
    items.append({'id':key,'name':locale['Name'][key],'category':'ammo','kind':'ammo','size':[1,1],'price':0,'priceKnown':False,'weight':0,'icon':'assets/missing-item.svg','source':'tracker','wiki':'https://arena-breakout-infinite.fandom.com/wiki/' + locale['Name'][key].replace(' ', '_'),'stats':[{'key':k,'value':v,'unit':''} for k,v in bullet.get('stats',{}).items() if isinstance(v,(int,float))],'description':locale.get('Describe',{}).get(key,''),'seasonal':False,'eligible':True,'ammoTag':bullet['ammoTag'],'tier':bullet.get('stats',{}).get('PenetrationLevel',0)})

out = root / 'src/data'
out.mkdir(parents=True, exist_ok=True)
(out/'catalog.json').write_text(json.dumps({'version':'2026-11-05.3','captured':'2026-11-05','items':items},ensure_ascii=False,separators=(',',':')),encoding='utf8')
print(f'Normalized {len(items)} items; {sum(i["eligible"] for i in items)} matched published catalog entries.')
print('Storage layouts:',sum('compartments' in i for i in items))
print('Categories:',{c:sum(i['category']==c for i in items) for c in categories.values()})
