"""Pack approved generated atlases. No recoloring, drawn substitutes or fabricated frames.

Run from any directory: python art-production/pack_refresh.py
Requires Pillow. Sources remain intact so every exported sprite is reproducible.
"""
from pathlib import Path
import hashlib
import json
import os
from functools import cache
from collections import deque
from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'art-production/source/refresh'
PUBLIC = ROOT / 'apps/game-client/public'
ART = PUBLIC / 'assets/elysia'
manifest = json.loads((ART / 'manifest.json').read_text())
definitions = {a['path']: a for a in manifest['assets']}
exports = {}
# Measured gutters in the approved sources; generated sheets are not perfectly uniform.
ROW_EDGES = {
    'inventory': [0, 225, 434, 629, 838, 1028, 1247],
    'props': [0, 317, 645, 935, 1246],
    'village': [0, 305, 606, 913, 1244],
    'classes': [0, 342, 710, 1073, 1448],
    'hud': [0, 286, 599, 899, 1247],
}


@cache
def atlas(source):
    with Image.open(SOURCE / f'{source}.png') as image:
        return image.convert('RGBA')


def extract_silhouette(sprite):
    """Extract the main cutout when a tightly packed cell contains a neighbor's tip."""
    alpha = sprite.getchannel('A')
    width, height = sprite.size
    pixels = alpha.load()
    visited = set()
    largest = []
    for y in range(height):
        for x in range(width):
            if pixels[x, y] <= 100 or (x, y) in visited:
                continue
            component = []
            queue = deque([(x, y)])
            visited.add((x, y))
            while queue:
                px, py = queue.popleft()
                component.append((px, py))
                for dx, dy in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
                    nx, ny = px+dx, py+dy
                    if 0 <= nx < width and 0 <= ny < height and (nx, ny) not in visited and pixels[nx, ny] > 100:
                        visited.add((nx, ny))
                        queue.append((nx, ny))
            if len(component) > len(largest):
                largest = component
    mask = Image.new('L', (width+4, height+4))
    draw = ImageDraw.Draw(mask)
    draw.point([(x+2, y+2) for x, y in largest], fill=255)
    # Retain translucent wing interiors enclosed by the authored outline.
    outside = mask.copy()
    ImageDraw.floodfill(outside, (0, 0), 128)
    mask = outside.point(lambda a: 0 if a == 128 else 255)
    mask = mask.filter(ImageFilter.MaxFilter(5)).crop((2, 2, width+2, height+2))
    sprite.putalpha(ImageChops.multiply(alpha, mask))
    return sprite


def cell(source, index, columns=4, rows=4, trim=True):
    image = atlas(source)
    w, h = image.size
    x, y = index % columns, index // columns
    sprite = image.convert('RGBA').crop((round(x*w/columns), round(y*h/rows),
                                         round((x+1)*w/columns), round((y+1)*h/rows)))
    if source in ROW_EDGES:
        edges = ROW_EDGES[source]
        sprite = image.crop((round(x*w/columns), edges[y], round((x+1)*w/columns), edges[y+1]))
    if source == 'monsters-bosses':
        # This approved source has three shorter rows and five final-row creatures.
        if index < 12:
            edges = [0, 288, 600, 898]
            row = index//4
            sprite = image.convert('RGBA').crop((round(x*w/4), edges[row],
                                                 round((x+1)*w/4), edges[row+1]))
        else:
            column = index-12
            bounds = [(0, 310), (260, 515), (485, 780), (760, 1010), (1007, w)]
            left, right = bounds[column]
            sprite = extract_silhouette(image.crop((left, 890, right, h)))
    if trim:
        # Ignore nearly invisible pixels for bounds only; preserve original alpha.
        bounds = sprite.getchannel('A').point(lambda a: 255 if a > 40 else 0).getbbox()
        if not bounds:
            raise ValueError(f'Empty cell: {source}/{index}')
        sprite = sprite.crop(bounds)
    return sprite


def export(sprite, relative, source, index, size=None, full=False, bottom=True):
    path = (ART / relative).resolve()
    url = '/' + path.relative_to(PUBLIC).as_posix()
    definition = definitions.get(url)
    if size is None:
        if definition:
            size = tuple(definition['dimensions'])
        elif path.exists():
            with Image.open(path) as old:
                size = old.size
        else:
            size = (192, 192)
    if full:
        output = sprite.resize(size, Image.Resampling.LANCZOS)
    else:
        output = Image.new('RGBA', size)
        sprite = sprite.copy()
        sprite.thumbnail((max(1, round(size[0]*.94)), max(1, round(size[1]*.90))), Image.Resampling.LANCZOS)
        x = (size[0]-sprite.width)//2
        y = round(size[1]*.94)-sprite.height if bottom else (size[1]-sprite.height)//2
        output.alpha_composite(sprite, (x, max(0, y)))
    path.parent.mkdir(parents=True, exist_ok=True)
    output.save(path, optimize=True)
    exports[url] = {'source': f'{source}.png', 'cell': index, 'dimensions': list(size),
                    'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}


def named(source, names, directory, columns=4, rows=4):
    for index, name in enumerate(names):
        if name:
            export(cell(source, index, columns, rows), f'{directory}/{name}.png', source, index)


named('village', ['house', 'training', 'item-shop', 'blacksmith', 'equipment-shop', 'storage',
                 'market-cream', 'market-blue', 'sakura', 'maple', 'pine', 'sacred-fountain',
                 'torii', 'bridge', 'cave', 'watermill'], 'environment/buildings')
named('props', ['training-dummy', 'chest', 'flowers', 'bush', 'rock', 'fence', 'lantern', 'barrel',
               'crate', 'bench', 'splash', 'lilies', 'shadow', 'petal', 'destination', 'grass-tuft'],
      'environment/props')
named('cathedral', ['cathedral', None, None, None, None, None, None, None], 'environment/buildings', rows=2)
for index, name in enumerate(['cathedral-altar', 'cathedral-statue', 'cathedral-pillar',
                              'cathedral-pew', 'cathedral-candelabra', 'cathedral-banner'], start=2):
    export(cell('cathedral', index, rows=2), f'environment/props/{name}.png', 'cathedral', index)
for index, path in enumerate(['environment/props/cathedral-stained-glass.png', 'ui/icon-crafting-anvil.png',
                              'ui/paperdoll-player.png', 'ui/paperdoll-player-female.png']):
    export(cell('extras', index, columns=2, rows=2), path, 'extras', index)

for index, material in enumerate(['road', 'shore', 'dirt', 'plaza']):
    tile = cell('transitions', index, columns=2, rows=2, trim=False)
    for direction, turns in [('north', 0), ('east', 3), ('south', 2), ('west', 1)]:
        export(tile.rotate(turns*90, expand=True), f'environment/transitions/{material}-{direction}.png',
               'transitions', index, full=True)

terrain = ['grass-a', 'grass-b', 'grass-c', 'grass-shade', 'stone-a', 'stone-b', 'stone-c', 'plaza',
           'dirt-a', 'dirt-b', 'dirt-c', 'soil', 'water-0', 'water-1', 'water-2', 'water-3']
# Match the actual existing water names instead of creating unused textures.
terrain[12:] = [a.rsplit('/', 1)[-1] for a in manifest['waterFrames']]
for index, name in enumerate(terrain):
    export(cell('terrain', index, trim=False), f'environment/terrain/{name}.png', 'terrain', index, full=True)

portrait_names = ['portrait-player', 'portrait-elder', 'portrait-merchant', 'portrait-trainer',
                  'portrait-slime', 'portrait-dragon', 'portrait-high-priest', 'portrait-blacksmith',
                  'portrait-hunter', 'portrait-priestess', 'portrait-ancient-treant', 'portrait-moon-hydra',
                  'portrait-ancient-titan', 'portrait-ignis-dragon', 'portrait-abyss-overlord',
                  'portrait-blood-wolf', None, 'portrait-goblin-chieftain', None, None]
for index, name in enumerate(portrait_names):
    if name:
        export(cell('portraits', index, rows=5, trim=False), f'ui/{name}.png', 'portraits', index, full=True)

classes = ['swordsman', 'spearman', 'knight', 'monk', 'mage', 'assassin', 'fighter', 'archer']
aliases = {'warrior': 'fighter', 'priest': 'monk', 'paladin': 'knight', 'lancer': 'spearman'}
for index, job in enumerate(classes):
    for gender_index, gender in enumerate(['male', 'female']):
        frame = index*2+gender_index
        sprite = cell('classes', frame)
        export(sprite, f'landing/classes/{job}_{gender}.png', 'classes', frame)
        export(sprite, f'characters/jobs/{job}_{gender}.png', 'classes', frame)
        if gender == 'male':
            export(sprite, f'characters/jobs/{job}.png', 'classes', frame)
            for alias, canonical in aliases.items():
                if job == canonical:
                    export(sprite, f'characters/jobs/{alias}.png', 'classes', frame)

items = ['sword_novice', 'excalibur_sword_icon', 'shield_oak', 'tunic_explorer', 'helm_bronze',
         'gloves_leather', 'boots_leather', 'amulet_jade', 'potion_hp', 'potion_mp', 'bread_loaf',
         'herb_green', 'wood_oak', 'ore_iron', 'mushroom_cap', 'gem_amethyst', 'scroll_town',
         'spear_iron', 'staff_holy', 'spellbook_arcane', 'dual_daggers', 'gauntlets_fist',
         'bow_ranger', 'armor_plate', 'shoulder_plate', 'cloak_wind', 'ring_band', 'gold_coins',
         'gem_blue', 'gem_amber', 'fish', 'leather', 'flower_purple', 'tea_leaves', 'arrows', 'backpack']
named('inventory', items, 'ui/items', columns=6, rows=6)
named('hud', ['rank', 'shop', 'book', 'settings', 'map', 'guild', 'profession', 'job',
              'craft', 'quest', 'merchant', 'storage', 'bag', 'attack', 'compass', 'events'], 'ui/hud')
legacy_items = {'boots': 6, 'tea_leaves': 33, 'iron_ore': 13, 'equip_tunic': 3, 'purple_flower': 32,
                'equip_amulet': 7, 'blue_gem': 28, 'equip_gloves': 5, 'amber_gem': 29, 'shield': 2,
                'potion_hp': 8, 'leather': 31, 'purple_crystal': 15, 'scroll': 16, 'mushroom': 14,
                'herbs': 11, 'sword': 0, 'fish': 30, 'potion_mp': 9, 'wood': 12, 'bread': 10}
for name, index in legacy_items.items():
    sprite = cell('inventory', index, columns=6, rows=6)
    path = PUBLIC / f'assets/items/mien_mong/{name}.png'
    if path.exists():
        export(sprite, f'../items/mien_mong/{name}.png', 'inventory', index)
for directory in ['items', 'weapons']:
    for name, index in {'wooden_sword_icon': 0, 'novice_sword_icon': 0, 'excalibur_sword_icon': 1,
                        'novice_bow_icon': 22, 'wooden_arrows_icon': 34, 'potion_hp_small_icon': 8}.items():
        export(cell('inventory', index, columns=6, rows=6), f'../{directory}/{name}.png', 'inventory', index)

skills = ['fire', 'double-slash', 'whirlwind', 'cleave', 'wind', 'ice', 'lightning', 'holy',
          'shadow', 'bow', 'spear', 'shield', 'arcane', 'nature', 'resurrection', 'water']
named('skills', skills, 'ui/skills')

def skill_index(key):
    key = key.lower()
    rules = [(14, ['resurrect', 'angel']), (1, ['double', 'triple']), (2, ['spin', 'whirlwind']),
             (3, ['cleave', 'heavy', 'break']), (0, ['fire', 'flame', 'meteor', 'berserk']),
             (5, ['ice', 'frost', 'blizzard']), (6, ['lightning', 'thunder', 'railshot']),
             (7, ['holy', 'heal', 'divine', 'bless', 'saint', 'exorcist', 'sunburst']),
             (8, ['shadow', 'dagger', 'poison', 'phantom', 'dark', 'assassin']),
             (9, ['arrow', 'bow', 'ranger', 'sniper']), (10, ['spear', 'thrust', 'lance', 'dragoon']),
             (11, ['shield', 'guardian', 'aegis', 'paladin']), (12, ['arcane', 'star', 'mana']),
             (13, ['root', 'leaf', 'nature', 'vine']), (15, ['water', 'wave', 'hydro']), (4, ['wind', 'tornado'])]
    return next((index for index, words in rules if any(word in key for word in words)), 3)

registered_thumbs = {Path(a['path']).name for a in manifest['assets'] if a['category'] == 'vfx.icons'}
for path in sorted((PUBLIC / 'assets/vfx').glob('*_thumb.png')):
    if path.name not in registered_thumbs:
        continue
    index = skill_index(path.stem)
    export(cell('skills', index, trim=False), os.path.relpath(path, ART), 'skills', index, full=True)
for asset in manifest['assets']:
    if asset['category'] == 'vfx.icons':
        index = skill_index(asset['id'])
        export(cell('skills', index, trim=False), asset['path'].removeprefix('/assets/elysia/'),
               'skills', index, full=True)

monster_assets = [a for a in manifest['assets'] if a['category'] == 'monsters.sprites']
sources = ['monsters-meadow', 'monsters-wilds', 'monsters-bosses', 'monsters-regions', 'monsters-frontier']
for position, asset in enumerate(monster_assets):
    source = sources[position//16]
    index = position % 16
    if 32 <= position <= 48:
        source, index = 'monsters-bosses', position-32
    elif 49 <= position <= 64:
        source, index = 'monsters-regions', position-49
    elif position >= 65:
        source, index = 'monsters-frontier', position-65
    export(cell(source, index), asset['path'].removeprefix('/assets/elysia/'), source, index)

hero = atlas('hero').convert('RGB')
for extension in ['jpg', 'webp']:
    path = ART / f'landing/hero/hero_keyart.{extension}'
    hero.save(path, quality=92, optimize=True)
    exports['/' + path.relative_to(PUBLIC).as_posix()] = {
        'source': 'hero.png', 'dimensions': list(hero.size),
        'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}

report = {'artDirection': 'Hand-painted anime fantasy; jade roofs, ivory stone, warm wood and gold',
          'exportCount': len(exports), 'exports': dict(sorted(exports.items()))}
(ROOT / 'art-production/refresh-exports.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
print(f'Packed {len(exports)} assets from original generated artwork.')
