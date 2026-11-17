# ELYSIA NO DENSETSU – CURRENT ASSET INVENTORY

**Audit Date:** 2026-11-17  
**Location:** `apps/game-client/public/assets/`  

---

## 1. Character & Job Assets

| Asset ID | File Path | Format | Dimensions | Direction Count | Supported Clips |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `char_male_novice` | `/assets/elysia/characters/animations/player.png` | PNG | 64×64 frame | 4 (Cardinal) | idle, walk, run, attack, skill, hurt, death |
| `char_female_novice` | `/assets/characters/female/novice/animations/novice_female_master_atlas.png` | PNG | 64×64 frame | 8 (Full) | idle, walk, run, attack, skill, hurt, death |
| `char_swordsman` | `/assets/elysia/characters/animations/job_swordsman.png` | PNG | 64×64 frame | 4 | idle, walk, run, attack, skill, hurt, death |
| `char_warrior` | `/assets/elysia/characters/animations/job_warrior.png` | PNG | 64×64 frame | 4 | idle, walk, run, attack, skill, hurt, death |
| `char_paladin` | `/assets/elysia/characters/animations/job_paladin.png` | PNG | 64×64 frame | 4 | idle, walk, run, attack, skill, hurt, death |
| `char_mage` | `/assets/elysia/characters/animations/job_mage.png` | PNG | 64×64 frame | 4 | idle, walk, run, attack, skill, hurt, death |
| `char_priest` | `/assets/elysia/characters/animations/job_priest.png` | PNG | 64×64 frame | 4 | idle, walk, run, attack, skill, hurt, death |
| `char_archer` | `/assets/elysia/characters/animations/job_archer.png` | PNG | 64×64 frame | 4 | idle, walk, run, attack, skill, hurt, death |
| `char_assassin` | `/assets/elysia/characters/animations/job_assassin.png` | PNG | 64×64 frame | 4 | idle, walk, run, attack, skill, hurt, death |
| `char_lancer` | `/assets/elysia/characters/animations/job_lancer.png` | PNG | 64×64 frame | 4 | idle, walk, run, attack, skill, hurt, death |

---

## 2. Equipment Layer Assets

| Equipment ID | Type / Slot | Sprite Path | Icon Path | Layer Category | Render Order Profile |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `WEAPON_WOODEN_SWORD` | weapon / sword | `/assets/weapons/wooden_sword_sprite.png` | `/assets/weapons/wooden_sword_icon.png` | `front_equipment` | South: 60, North: 20 |
| `WEAPON_EXCALIBUR` | weapon / greatsword | `/assets/weapons/excalibur_sword_sprite.png` | `/assets/weapons/excalibur_sword_icon.png` | `front_equipment` | South: 65, North: 15 |
| `WEAPON_NOVICE_BOW` | weapon / bow | `/assets/weapons/novice_bow_sprite.png` | `/assets/weapons/novice_bow_icon.png` | `front_equipment` | South: 55, North: 25 |
| `ARMOR_BRONZE_HELM` | headgear / helm | `/assets/weapons/test_shield_icon_1794157321383.png` | `/assets/weapons/test_shield_icon_1794157321383.png` | `headgear` | Constant: 50 |
| `female_hair_ponytail` | hair | `/assets/characters/female/novice/elements/01_hair_back_ponytail.png` | N/A | `hair` / `back_equipment` | South: 45, North: 55 |
| `female_armor_cuirass`| armor | `/assets/characters/female/novice/elements/11_chest_cuirass.png` | N/A | `armor` | Constant: 35 |
| `female_boots_armored`| boots | `/assets/characters/female/novice/elements/04_boots_armored.png` | N/A | `armor` | Constant: 30 |

---

## 3. Monster & Boss Assets

| Monster ID | Type | Sprite Sheet Path | Base Scale | Category |
| :--- | :--- | :--- | :---: | :--- |
| `MONSTER_GREEN_SLIME` | Field | `/assets/elysia/characters/animations/slime.png` | 48×48 px | NORMAL |
| `MONSTER_GOBLIN_SCOUT`| Field / Elite | `/assets/elysia/characters/animations/goblin.png` | 64×64 px | NORMAL / ELITE |
| `mon_wild_wolf` | Field | `/assets/elysia/characters/animations/wolf.png` | 64×64 px | NORMAL |
| `BOSS_DARK_DRAGON_STARTER`| World Boss | `/assets/elysia/characters/animations/dark_dragon.png` | 160×160 px | FIELD_BOSS |
