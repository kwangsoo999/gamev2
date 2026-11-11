"""Process ORIGINAL generated atlases only. This tool never draws replacement art.

Splits sheets, extracts the magenta background, and writes production metadata.
Missing source sheets stay missing; no placeholder images are created.
"""
from pathlib import Path
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'art-production/source'
PUBLIC = ROOT / 'apps/game-client/public'
DEST = PUBLIC / 'assets/elysia'
STATES = ['idle', 'walk', 'run', 'attack', 'skill', 'hurt', 'death']
DIRECTIONS = {'south': 0, 'west': 2, 'east': 4, 'north': 6}
PROPS = ['house', 'training', 'item-shop', 'blacksmith', 'equipment-shop', 'storage',
         'market-cream', 'market-blue', 'sakura', 'maple', 'pine', 'sacred-fountain',
         'torii', 'bridge', 'cave', 'watermill']
TERRAIN = ['grass-a', 'grass-b', 'grass-c', 'grass-shade', 'stone-a', 'stone-b',
           'stone-c', 'plaza', 'dirt-a', 'dirt-b', 'dirt-c', 'soil',
           'water-0', 'water-1', 'water-2', 'water-3']
DETAILS = ['training-dummy', 'chest', 'flowers', 'bush', 'rock', 'fence', 'lantern',
           'barrel', 'crate', 'bench', 'splash', 'lilies', 'shadow', 'petal',
           'destination', 'grass-tuft']
ACTORS = {
    'player': ('player_adventurer', 86), 'elder': ('npc_villager_elder', 82),
    'trainer': ('npc_trainer', 84), 'merchant': ('npc_merchant', 80),
    'slime': ('monster_slime', 55), 'goblin': ('monster_goblin', 74),
}
TRANSITIONS = [f'{kind}-{direction}' for kind in ['road', 'shore', 'dirt', 'plaza']
               for direction in ['north', 'east', 'south', 'west']]


def extract_alpha(image):
    image = image.convert('RGBA')
    pixels = []
    for r, g, b, a in image.getdata():
        if r > 145 and b > 145 and g < 105 and min(r, b) - g > 65:
            pixels.append((0, 0, 0, 0))
        else:
            pixels.append((r, g, b, a))
    image.putdata(pixels)
    return image


def split_sheet(name, cells, folder, transparent):
    source = SOURCE / f'{name}.png'
    if not source.is_file():
        return
    image = Image.open(source).convert('RGBA')
    if transparent:
        image = extract_alpha(image)
    for i, item in enumerate(cells):
        col, row = i % 4, i // 4
        cell = image.crop((round(col*image.width/4), round(row*image.height/4),
                           round((col+1)*image.width/4), round((row+1)*image.height/4)))
        if transparent:
            bounds = cell.getchannel('A').getbbox()
            if not bounds:
                raise ValueError(f'Empty generated artwork: {name}/{item}')
            cell = cell.crop(bounds)
            # Keep a small transparent guard around the original illustration.
            framed = Image.new('RGBA', (cell.width+8, cell.height+8))
            framed.alpha_composite(cell, (4, 4))
            cell = framed
        else:
            cell = cell.convert('RGB').resize((256, 256), Image.Resampling.LANCZOS)
        target = DEST / folder / f'{item}.png'
        target.parent.mkdir(parents=True, exist_ok=True)
        cell.save(target)


def process_actors():
    for name in ACTORS:
        source = SOURCE / f'{name}.png'
        if not source.is_file():
            continue
        image = extract_alpha(Image.open(source))
        sheet = Image.new('RGBA', (1536, 1120))
        for row in range(7):
            for col in range(8):
                cell = image.crop((round(col*image.width/8), round(row*image.height/7),
                                   round((col+1)*image.width/8), round((row+1)*image.height/7)))
                cell = cell.resize((192, 160), Image.Resampling.LANCZOS)
                sheet.alpha_composite(cell, (col*192, row*160))
        target = DEST / 'characters/animations' / f'{name}.png'
        target.parent.mkdir(parents=True, exist_ok=True)
        sheet.save(target)


def write_metadata():
    assets = []
    for folder, names, alpha, default in [
        ('environment/buildings', PROPS, True, (384, 256)),
        ('environment/terrain', TERRAIN, False, (256, 256)),
        ('environment/props', DETAILS, True, (384, 256)),
        ('environment/transitions', TRANSITIONS, True, (256, 256)),
        ('characters/animations', ACTORS.keys(), True, (1536, 1120)),
    ]:
        for name in names:
            relative = f'{folder}/{name}.png'
            file = DEST / relative
            dimensions = Image.open(file).size if file.is_file() else default
            assets.append({'id': f'{folder}/{name}', 'path': f'/assets/elysia/{relative}',
                           'category': folder.replace('/', '.'), 'dimensions': list(dimensions),
                           'transparency': alpha, 'loading': 'eager',
                           **({'animation': {'frames': 112, 'fps': 8}} if folder == 'characters/animations' else {})})

    def p(name, **extra):
        return {'assetId': f'environment/buildings/{name}', **extra}
    manifest = {
        'schemaVersion': '2.0.0',
        'artDirection': 'Japanese hand-painted chibi anime fantasy; top-down three-quarter perspective',
        'assets': assets,
        'terrain': {'0': [f'environment/terrain/grass-{x}' for x in 'abc'],
                    '1': ['environment/terrain/grass-shade'],
                    '2': [f'environment/terrain/stone-{x}' for x in 'abc'],
                    '3': ['environment/terrain/water-0'], '4': ['environment/terrain/plaza']},
        'waterFrames': [f'environment/terrain/water-{i}' for i in range(4)],
        'transitions': {kind: {direction: f'environment/transitions/{prefix}-{direction}'
                              for direction in DIRECTIONS}
                        for kind, prefix in [('road', 'road'), ('water', 'shore')]},
        'objectTypes': {
            'torii_gate': p('torii'), 'torii_shrine': p('torii'),
            'plaza_tree_fountain': p('sacred-fountain'), 'cave_entrance': p('cave'),
            'village_house_a': p('house'), 'village_house_b': p('house'),
            'village_shop': p('item-shop'), 'market_stall_striped': p('market-cream'),
            'market_stall_blue': p('market-blue'),
            'training_dummy': {'assetId': 'environment/props/training-dummy'},
            'wooden_bridge': p('bridge', ground=True, widthScale=1.12),
            'waterwheel_mill': p('watermill'),
            'treasure_chest': {'assetId': 'environment/props/chest'},
            'sakura_tree': p('sakura'), 'maple_tree': p('maple'), 'pine_tree': p('pine'),
        },
        'objectOverrides': {
            'obj_house_smith': p('blacksmith'), 'obj_house_south1': p('equipment-shop'),
            'obj_tree_0': p('training'), 'obj_tree_9': p('storage'),
        },
        'decorations': [f'environment/props/{x}' for x in ['flowers', 'bush', 'rock', 'grass-tuft']],
        'effects': {name: f'environment/props/{name}' for name in ['shadow', 'petal', 'destination']},
    }
    sheets = {}
    for name, (actor_id, height) in ACTORS.items():
        sheets[actor_id] = {
            'assetId': f'characters/animations/{name}', 'frameWidth': 192, 'frameHeight': 160,
            'anchorX': .5, 'anchorY': .92, 'drawHeight': height, 'directionColumns': DIRECTIONS,
            'equipmentLayers': {},
            'animations': {state: {'row': i, 'frames': 2,
                                   'fps': [2, 8, 12, 7, 5, 6, 4][i],
                                   'loop': state in ['idle', 'walk', 'run']}
                           for i, state in enumerate(STATES)},
        }
    registry = {'schemaVersion': '2.0.0', 'sheets': sheets}
    DEST.mkdir(parents=True, exist_ok=True)
    (DEST / 'manifest.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False)+'\n', encoding='utf-8')
    (PUBLIC / 'data/sprites/entities.json').write_text(json.dumps(registry, indent=2)+'\n', encoding='utf-8')
    missing = [asset['path'] for asset in assets if not (PUBLIC / asset['path'].lstrip('/')).is_file()]
    report = {'productionReady': not missing, 'requiredAssetCount': len(assets),
              'availableAssetCount': len(assets)-len(missing), 'missingArtwork': missing,
              'equipmentArtwork': 'Missing layered equipment atlases. The renderer supports them but they have not been produced.',
              'visualInspection': 'Pending real running-game inspection and reference comparison.'}
    (ROOT / 'art-production/production-status.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    split_sheet('village-props', PROPS, 'environment/buildings', True)
    split_sheet('terrain', TERRAIN, 'environment/terrain', False)
    split_sheet('details', DETAILS, 'environment/props', True)
    split_sheet('transitions', TRANSITIONS, 'environment/transitions', True)
    process_actors()
    write_metadata()
