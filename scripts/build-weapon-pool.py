import json
import re
from pathlib import Path

root = Path(__file__).resolve().parents[1]
catalog = json.loads((root / 'src/data/catalog.json').read_text(encoding='utf-8'))['items']
items = {item['id']: item for item in catalog}
curated = json.loads((root / 'data/curated-weapon-plans.json').read_text(encoding='utf-8'))
weapons = json.loads((root / 'data/source-cache/weapon-detail.json').read_text(encoding='utf-8'))
weapon_data = {str(item['id']): item for item in weapons['weapons']}
accessory_tags = {str(item['id']): item['tag'] for item in weapons['accessories']}
sources = ['https://github.com/hexaov91/abi-assets/blob/main/data/weapon-detail.json', 'https://github.com/hexaov91/abi-assets/blob/main/localization/game/en.json']

def mags(*ids):
    return [str(201050000 + value) for value in ids]

def modern(*ids):
    return [str(291050000 + value) for value in ids]

families = {
    'AR': mags(6, 7, 26, 27, 28, 29, 49, 50, 130) + modern(1, 4),
    'AKM': mags(14, 1, 45, 46, 47, 48, 128) + modern(19),
    'AK': mags(39, 40, 85, 91, 41) + modern(2, 3),
    'AK12': mags(152) + modern(21), '74N': mags(39),
    'FAL': mags(13, 12, 105), 'AUG': mags(80, 81),
    'F2000': mags(74), 'Stanag30': mags(6), 'GEN30': mags(28), 'AR40': mags(29), 'Window30': mags(130),
    'AKM40': mags(1), 'AKM30': mags(14), 'AKM75': mags(46),
    'AK30': mags(39), 'AK60': mags(40), 'AK95': mags(41), 'AN94': mags(123),
    'FAMAS': mags(138), 'T': mags(142) + modern(13), 'T75': mags(143),
    'SG550': mags(145, 146), 'G3': mags(147, 148),
    'MP5': mags(2, 3, 51), 'MPX': mags(16, 52, 53), 'P90': mags(18, 19),
    'UZI': mags(37, 101, 157), 'UMP': mags(64, 88) + modern(20),
    'MP40': mags(75), 'MAC10': mags(76, 89), 'M3A1': mags(73, 90),
    'T79': mags(77, 78), 'QC61': mags(95, 96), 'MPF45': mags(97, 98), 'T85': mags(108),
    'MKGS': mags(169), 'SVDS': mags(20, 21), 'VSS': mags(30, 31, 32, 99),
    'MK14': mags(68), 'M14': mags(42, 43), 'SR25': mags(65, 66, 67) + modern(5),
    '88': mags(160, 161), 'Mosin': mags(8, 35), 'AX50': mags(58, 59),
    'AR30': mags(111, 126), 'SJ16': mags(112, 113), 'M24': mags(121, 122),
    'M870': mags(9, 10, 11), 'MP133': mags(22, 23),
    'Saiga12': mags(63, 62, 61), 'USAS12': mags(109, 110),
    'SKS': mags(15, 36, 79), 'M96': mags(54), 'Mini14': mags(55, 56, 57),
    'BM59': mags(82, 103), 'SVT': mags(117, 118),
    'Glock': mags(4, 5, 38, 86), 'M9A3': mags(17, 87), 'MP9': mags(44, 102),
    'DE': mags(60, 92), 'T54': mags(69), 'M1911': mags(71, 72), 'M45A1': mags(84),
    'CZ52': mags(116), 'F57': mags(120, 119), 'CZ807': modern(12, 17),
    'AMB17': modern(18), 'PP19': modern(9, 10, 11), 'Marlin': modern(6, 7, 8),
}
aliases = {
    'M4A1': ['M4A1', 'AR', 'M4'], 'HK416': ['H416', 'HK416'], 'SA58': ['FAL'],
    'DTMDR': ['MDR'], 'AK102': ['AK-102', 'AK-100'], 'AK74N': ['AK-74', 'AK74', 'AKM', 'AK-series'],
    'AKS74U': ['AKS-74U', 'AKS 74U'], 'AR57': ['AR-57', 'AR57'], 'SCAR': ['SCAR'],
    'QBZ191': ['T191', '191 Automatic'], 'QBZ192': ['T192', 'T-192', '192 Short'],
    'QBU191': ['U191', '191 Precision'], 'MKGS': ['Banshee'], 'SVD': ['SVD', 'SVDS'],
    'SR25': ['M110'], 'Saiga12': ['S12K'], 'XM1014': ['M870'], 'MP133': ['MP-133', 'MP 133'],
    'Glock17': ['G17', 'G Series'], 'Glock18c': ['G18C', 'G Series'],
    'DesertEagle': ['Desert Eagle'], 'EPC9': ['PCC-9', 'PCC9'],
    'CZ807': ['ZC807', 'ZC 807', 'CZ807'], 'AMB17': ['AMB-17'], 'AK15SC': ['AK-15SC'],
    'PP19': ['PP19', 'PP19-01'], 'Marlin': ['ML Lever-Action', 'ML Rifle'],
    'MP40': ['MP40', 'MP 40'], 'USAS12': ['USAS-12'], 'Mosin': ['Mosin', 'Mosin-Nagant'],
    'AR30': ['AR-30'], 'Vector45': ['Vector 45', 'Vector'], 'Vector9': ['Vector 9', 'Vector'],
}
shared = {
    'M4A1': ['AR'], 'HK416': ['AR'], 'AR57': ['AR'], 'M16': ['AR'], 'EPC9': ['AR'], 'SR25': ['AR'], 'MCX': ['AR'], 'MKGS': ['AR'],
    'AKM': ['AK-series', 'AK Series', 'AKM'], 'AK74N': ['AK Series'],
    'AK102': ['AK-series', 'AK Series'], 'AK15SC': ['AK Series'],
}

def matches(name, terms):
    return any(re.search(r'(?<![a-z0-9])' + r'[- ]*'.join(re.escape(char) for char in re.sub(r'[^a-zA-Z0-9]', '', term)) + r'(?![a-z0-9])', name, re.I) for term in terms)

def group_for(item):
    text = item['name'].lower()
    prefix = item['id'][3:5]
    if prefix == '05': return None
    if prefix == '04':
        if any(word in text for word in ['adapter', 'tube']): return 'Stock adapter', True
        if any(word in text for word in ['pad', 'cushion', 'cheek', 'cover', 'buffer']): return 'Stock pad', True
        return 'Stock', False
    if prefix == '02': return 'Rear grip', False
    if prefix == '08': return 'Handguard', False
    if prefix == '10': return ('Dust cover' if 'dust cover' in text else 'Upper receiver'), False
    if prefix == '11': return 'Barrel', False
    if prefix == '14': return 'Gas block / tube', False
    if prefix == '15': return 'Charging handle', False
    if prefix == '07': return ('Muzzle adapter' if 'adapter' in text else 'Muzzle'), True
    if prefix == '06': return 'Sight rail', True
    if prefix == '03':
        if any(word in text for word in ['rear sight', ' rs', 'handle rear']): return 'Rear sight', False
        if any(word in text for word in ['front sight', ' fs']): return 'Front sight', False
        return 'Optic', True
    return None

def basic_score(id):
    text = items[id]['name'].lower()
    return (0 if any(word in text for word in ['standard', 'oem', 'classic', 'original']) else 1, 1 if any(word in text for word in ['extended', 'long', 'short', 'improved', 'premium', 'sd ', 'suppress']) else 0, id)

plans = {plan['id']: plan for plan in curated}
excluded = []
for weapon in catalog:
    if weapon['kind'] != 'weapon' or weapon['id'] in plans: continue
    id = weapon['id']
    if id == '102010014':
        excluded.append({'id': id, 'name': weapon['name'], 'reason': 'Signal gun, not a combat firearm.'})
        continue
    raw = weapon_data[id]
    family = raw['tag'].split('.')[-1]
    tags = raw['supportedTags']
    magazine_ids = []
    for tag in tags:
        if tag.startswith('Assemble.Magazine.'):
            key = tag.split('.')[-1]
            if family == 'AK102' and key == 'AK': candidates = mags(33, 34, 104)
            elif family == 'Vector45' and key == 'Vector': candidates = mags(106, 107)
            elif family == 'Vector9' and key == 'Vector': candidates = mags(114, 115)
            elif family == 'Vector9' and key in ['33', '50']: candidates = mags(5 if key == '33' else 38)
            elif family == 'ACE31' and key == 'Window30': candidates = modern(19)
            else: candidates = families.get(key, [])
            magazine_ids.extend(candidates)
    magazine_ids = list(dict.fromkeys(value for value in magazine_ids if value in items and items[value].get('capacity')))
    native_capacity = {'101030005': 2, '101060005': 2, '102010007': 6, '192010002': 6}.get(id)
    if not magazine_ids and not native_capacity: raise ValueError('Missing loading rules: ' + weapon['name'])
    own_aliases = aliases.get(family, [family])
    terms = list(dict.fromkeys(own_aliases + shared.get(family, [])))
    groups = {}
    for part in catalog:
        generic_stock = family in shared and 'AR' in shared[family] and part['id'] in ['201040104','201040112','201040147','201040150']
        if part['kind'] != 'accessory' or part['seasonal'] or (not generic_stock and not matches(part['name'], terms)): continue
        if family != 'AR30' and matches(part['name'], ['AR-30']): continue
        if family != 'AR57' and matches(part['name'], ['AR-57']): continue
        classification = group_for(part)
        if not classification: continue
        group, optional = classification
        if family == 'M4A1' and group == 'Barrel' and int(part['id']) not in raw.get('compatibleAccessoryIds',[]): continue
        if group in ['Muzzle', 'Muzzle adapter'] and family not in ['M4A1','M16','HK416'] and not matches(part['name'],own_aliases): continue
        if group in ['Barrel','Upper receiver','Handguard','Gas block / tube','Front sight','Rear sight','Charging handle'] and family not in ['M4A1','M16'] and not matches(part['name'], own_aliases):
            if group not in ['Handguard','Front sight','Rear sight'] or family not in ['AR57','EPC9','MKGS']: continue
        if group == 'Barrel' and family == 'Vector9' and matches(part['name'], ['Vector 45']): continue
        if group == 'Barrel' and family == 'Vector45' and matches(part['name'], ['Vector 9']): continue
        tag = accessory_tags.get(part['id'])
        if tag and tag not in tags: continue
        if re.search(r'\b(SD|9mm|7\.62)\b', part['name'], re.I) and family in ['M4A1', 'HK416', 'M16', 'AR57']: continue
        if group == 'Stock' and any(word in part['name'].lower() for word in ['integrated', 'cqr']): continue
        if group == 'Muzzle' and family in ['Vector9','Vector45'] and ('9' in part['name'] or '45' in part['name']) and not matches(part['name'], own_aliases[:1]): continue
        groups.setdefault(group, {'slot':group,'ids':[],'optional':optional})['ids'].append(part['id'])
    for group in groups.values(): group['ids'].sort(key=lambda id: (0 if matches(items[id]['name'],own_aliases) else 1, basic_score(id)))
    rules = {}
    def require(part, candidates):
        if candidates: rules.setdefault(part, {}).setdefault('requires', []).append(candidates)
    if family == 'M4A1' and 'Front sight' in groups and '201140003' in groups.get('Gas block / tube',{}).get('ids',[]):
        groups['Front sight']['optional'] = True
        for sight in groups['Front sight']['ids']: rules[sight] = {'excludes':['201140003']}
    for group in ['Stock adapter','Muzzle adapter']:
        if group not in groups: continue
        adapters = groups[group]['ids']
        target = 'Stock' if group == 'Stock adapter' else 'Muzzle'
        for part in groups.get(target, {}).get('ids', []):
            description = items[part]['description'].lower()
            if group == 'Stock adapter' and ('requires' in description or 'needs' in description):
                candidates = [a for a in adapters if ('pt' in items[part]['name'].lower()) == ('pt' in items[a]['name'].lower())]
                require(part, candidates)
            if group == 'Muzzle adapter' and ('adapter' in description or 'mount' in description): require(part, adapters)
        if group == 'Stock adapter' and family in ['M4A1','M16','AR57','EPC9','SR25','MKGS']:
            tubes = [a for a in adapters if 'tube' in items[a]['name'].lower()]
            for part in groups.get('Stock',{}).get('ids',[]): require(part,tubes)
        uses = {a:[part for part, rule in rules.items() if any(a in choices for choices in rule.get('requires',[]))] for a in adapters}
        kept = [a for a in adapters if uses[a]]
        for adapter in kept: require(adapter,uses[adapter])
        if kept: groups[group]['ids'] = kept
        else: del groups[group]
    rail_hosts = groups.get('Sight rail', {}).get('ids', [])
    direct_hosts = [id for group in ['Upper receiver','Dust cover','Handguard'] for id in groups.get(group,{}).get('ids',[]) if 'rail' in items[id]['description'].lower() and 'modular' not in items[id]['description'].lower()]
    if rail_hosts or direct_hosts:
        groups.setdefault('Optic', {'slot':'Optic','ids':[],'optional':True})['ids'].append('201030108')
        require('201030108', rail_hosts + direct_hosts)
    railed_handguards = [id for id in groups.get('Handguard',{}).get('ids',[]) if 'rail' in items[id]['description'].lower() and 'modular' not in items[id]['description'].lower()]
    if railed_handguards:
        grips = ['201010002','201010003','201010007','201010008','201010009']
        groups['Foregrip'] = {'slot':'Foregrip','ids':grips,'optional':True}
        for grip in grips: require(grip,railed_handguards)
    for group in groups.values(): group['ids'] = list(dict.fromkeys(group['ids']))
    order = ['Rear grip','Stock','Stock adapter','Stock pad','Upper receiver','Dust cover','Barrel','Gas block / tube','Handguard','Charging handle','Front sight','Rear sight','Muzzle adapter','Muzzle','Sight rail','Optic','Foregrip']
    parts = [groups[group] for group in order if group in groups]
    internal_ids = [value for value in magazine_ids if value in mags(8,9,10,11,15,22,23) + modern(6,7,8)]
    plan = {'id':id,'parts':parts,'magazines':magazine_ids,'rules':rules,'sources':sources,'verification':'best-guess','basis':'Weapon supported tags, platform names, item descriptions, and inferred required slots. Individual combinations have not been checked in Gunsmith.'}
    if native_capacity: plan['internalCapacity'] = native_capacity
    if internal_ids: plan['internalMagazines'] = internal_ids
    plans[id] = plan

for plan in plans.values():
    if plan['id'] in ['101030005','101040002','101040003']:
        plan['availability'] = 'unconfirmed'
        plan['availabilityNote'] = 'Owner reports some or all of AX50, AR-30, and DBR are unavailable. Excluded from automatic rolls until confirmed.'
    plan['basicParts'] = [part['ids'][0] for part in plan['parts'] if not part.get('optional')]
    if plan['magazines']: plan['basicMagazine'] = plan['magazines'][0]
    if plan['id'] == '101010001': plan['basicMagazine'] = '201050014'
out = [plans[id] for id in sorted(plans)]
(root / 'src/data/weapon-plans.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(root / 'data/excluded-weapons.json').write_text(json.dumps(excluded,indent=2)+'\n',encoding='utf-8')
print(f'Built {len(out)} combat firearm profiles; {len(excluded)} non-combat weapons excluded.')
for plan in out:
    print(items[plan['id']]['name'], '|', ', '.join(f"{p['slot']}:{len(p['ids'])}" for p in plan['parts']), '| magazines:',len(plan['magazines']), 'native:',plan.get('internalCapacity',0))
