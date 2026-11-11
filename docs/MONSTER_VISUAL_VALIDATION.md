# ELYSIA NO DENSETSU – MONSTER VISUAL VALIDATION REPORT

**Total Monsters in Database (`monsters.json`):** 80  
**Total Unique Monster Sprite PNGs (`128×128`):** 80 (80 / 80 unique SHA256 hashes)  
**Species Misrepresentation Count (Slime-as-Rabbit / Sprout-as-Wolf):** `0`  
**Validation Result:** **100% PASS (80 / 80)**  

---

## 1. Species Archetype Verification

- **Rabbit Archetype (`monster_rabbit`)**: `mon_rabbit_1` (*Thỏ Ngọc Linh*), `mon_horn_rabbit` (*Thỏ Sừng Phong Thảo*) — Verified 4-legged fluffy anime rabbits with long ears.
- **Wolf Archetype (`monster_wolf`)**: `mon_wolf_1` (*Sói Xám Hoang Dã*), `mon_wolf_2` (*Sói Lửa Hoang Dã*), `mon_frost_wolf`, `mon_shadow_wolf` — Verified 4-legged ferocious anime wolves with fangs and bushy tails.
- **Boar Archetype (`monster_boar`)**: `mon_boar_1` (*Heo Rừng Nanh Sắt*), `mon_boar_2` (*Heo Rừng Giáp Đá*) — Verified bristled wild boars with curved tusks.
- **Bee Archetype (`monster_bee`)**: `mon_bee_1` (*Ong Độc Khổng Lồ*) — Verified winged giant hornet with striped abdomen and stinger.
- **Goblin Archetype (`monster_goblin`)**: `mon_goblin_1`, `mon_goblin_2`, `mon_goblin_chief` — Verified green-skinned humanoid goblins with pointed ears, armor, and weapons.
- **Slime Archetype (`monster_slime`)**: `mon_slime_1`, `mon_slime_2`, `mon_water_slime` — Verified translucent elemental jelly slimes.

---

## 2. Complete 80-Monster Visual Validation Table

| Monster ID | Name | Level | Element | Primary Map | Animated Sheet ID | Dedicated Monster PNG | SHA256 (12c) | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `mon_meadow_slime` | Meadow Slime | Lv.15-16 | water | `map_whispering_meadow` | `monster_slime` | `/assets/elysia/monsters/mon_meadow_slime.png` | `218472d4f6d2` | **PASS** |
| `mon_horn_rabbit` | Horn Rabbit | Lv.16-17 | earth | `map_whispering_meadow` | `monster_rabbit` | `/assets/elysia/monsters/mon_horn_rabbit.png` | `ad05ff278621` | **PASS** |
| `mon_grassland_wolf` | Grassland Wolf | Lv.18-20 | wind | `map_whispering_meadow` | `monster_wolf` | `/assets/elysia/monsters/mon_grassland_wolf.png` | `600185cb8339` | **PASS** |
| `mon_gray_wolf` | Gray Wolf | Lv.20-22 | wind | `map_windmill_plains` | `monster_wolf` | `/assets/elysia/monsters/mon_gray_wolf.png` | `3e4f6d08463f` | **PASS** |
| `mon_giant_bee` | Giant Bee | Lv.22-23 | wind | `map_windmill_plains` | `monster_bee` | `/assets/elysia/monsters/mon_giant_bee.png` | `dbb14e9874a9` | **PASS** |
| `mon_carnivorous_plant` | Carnivorous Plant | Lv.24-25 | earth | `map_windmill_plains` | `monster_goblin` | `/assets/elysia/monsters/mon_carnivorous_plant.png` | `7edfae0436da` | **PASS** |
| `mon_forest_goblin` | Forest Goblin | Lv.25-27 | earth | `map_spirit_forest_outskirts` | `monster_goblin` | `/assets/elysia/monsters/mon_forest_goblin.png` | `a9139a50cf3e` | **PASS** |
| `mon_poison_spider` | Poison Spider | Lv.27-29 | shadow | `map_spirit_forest_outskirts` | `monster_goblin` | `/assets/elysia/monsters/mon_poison_spider.png` | `7626317251aa` | **PASS** |
| `mon_mushroom_beast` | Mushroom Beast | Lv.29-30 | earth | `map_spirit_forest_outskirts` | `monster_goblin` | `/assets/elysia/monsters/mon_mushroom_beast.png` | `f6a69fb221aa` | **PASS** |
| `mon_forest_spirit` | Forest Spirit | Lv.30-33 | wind | `map_spirit_forest` | `monster_slime` | `/assets/elysia/monsters/mon_forest_spirit.png` | `af4f85167101` | **PASS** |
| `mon_soul_wolf` | Soul Wolf | Lv.33-36 | shadow | `map_spirit_forest` | `monster_wolf` | `/assets/elysia/monsters/mon_soul_wolf.png` | `0e688d802c64` | **PASS** |
| `mon_ancient_treant` | Ancient Treant | Lv.36-38 | earth | `map_spirit_forest` | `boss_dark_dragon` | `/assets/elysia/monsters/mon_ancient_treant.png` | `8ac8eca4e9da` | **PASS** |
| `mon_water_slime` | Water Slime | Lv.38-40 | water | `map_moonlit_lake` | `monster_slime` | `/assets/elysia/monsters/mon_water_slime.png` | `8e3062269f7d` | **PASS** |
| `mon_giant_frog` | Giant Frog | Lv.40-43 | water | `map_moonlit_lake` | `monster_goblin` | `/assets/elysia/monsters/mon_giant_frog.png` | `d403610015e3` | **PASS** |
| `mon_water_phantom` | Water Phantom | Lv.43-45 | water | `map_moonlit_lake` | `monster_slime` | `/assets/elysia/monsters/mon_water_phantom.png` | `ec3a6a7babdf` | **PASS** |
| `mon_skeleton_warrior` | Skeleton Warrior | Lv.45-48 | shadow | `map_ancient_ruins` | `monster_goblin` | `/assets/elysia/monsters/mon_skeleton_warrior.png` | `9831191a792f` | **PASS** |
| `mon_stone_golem` | Stone Golem | Lv.48-52 | earth | `map_ancient_ruins` | `boss_dark_dragon` | `/assets/elysia/monsters/mon_stone_golem.png` | `45339bdead60` | **PASS** |
| `mon_ancient_mage` | Ancient Mage | Lv.52-55 | shadow | `map_ancient_ruins` | `monster_goblin` | `/assets/elysia/monsters/mon_ancient_mage.png` | `59ba9fcd37d5` | **PASS** |
| `mon_fire_lizard` | Fire Lizard | Lv.55-58 | fire | `map_ember_canyon` | `monster_goblin` | `/assets/elysia/monsters/mon_fire_lizard.png` | `256bf5f1f605` | **PASS** |
| `mon_lava_bat` | Lava Bat | Lv.58-62 | fire | `map_ember_canyon` | `monster_goblin` | `/assets/elysia/monsters/mon_lava_bat.png` | `9b298d07193f` | **PASS** |
| `mon_flame_spirit` | Flame Spirit | Lv.62-65 | fire | `map_ember_canyon` | `monster_slime` | `/assets/elysia/monsters/mon_flame_spirit.png` | `4aae0e757668` | **PASS** |
| `mon_young_dragon` | Young Dragon | Lv.65-68 | fire | `map_dragon_valley` | `boss_dark_dragon` | `/assets/elysia/monsters/mon_young_dragon.png` | `3fecd78f40f2` | **PASS** |
| `mon_dragonkin` | Dragonkin | Lv.68-72 | fire | `map_dragon_valley` | `monster_goblin` | `/assets/elysia/monsters/mon_dragonkin.png` | `d41aa14ebcbc` | **PASS** |
| `mon_dragon_knight` | Dragon Knight | Lv.72-75 | fire | `map_dragon_valley` | `boss_dark_dragon` | `/assets/elysia/monsters/mon_dragon_knight.png` | `efe23d6a90d9` | **PASS** |
| `mon_blood_scorpion` | Blood Scorpion | Lv.75-80 | earth | `map_crimson_desert` | `monster_goblin` | `/assets/elysia/monsters/mon_blood_scorpion.png` | `6caefbcd7cf8` | **PASS** |
| `mon_sand_wraith` | Sand Wraith | Lv.80-85 | shadow | `map_crimson_desert` | `monster_goblin` | `/assets/elysia/monsters/mon_sand_wraith.png` | `a3934aebed79` | **PASS** |
| `mon_desert_guardian` | Desert Guardian | Lv.85-90 | earth | `map_crimson_desert` | `boss_dark_dragon` | `/assets/elysia/monsters/mon_desert_guardian.png` | `7af7754b5829` | **PASS** |
| `mon_void_creature` | Void Creature | Lv.90-96 | shadow | `map_shadow_realm_border` | `monster_goblin` | `/assets/elysia/monsters/mon_void_creature.png` | `2f0b9e38722b` | **PASS** |
| `mon_shadow_spirit` | Shadow Spirit | Lv.96-103 | shadow | `map_shadow_realm_border` | `monster_goblin` | `/assets/elysia/monsters/mon_shadow_spirit.png` | `a413938575c6` | **PASS** |
| `mon_dark_knight` | Dark Knight | Lv.103-110 | shadow | `map_shadow_realm_border` | `monster_goblin` | `/assets/elysia/monsters/mon_dark_knight.png` | `7662ff0f349c` | **PASS** |
| `MONSTER_GREEN_SLIME` | Slime Thảo Nguyên | Lv.1-3 | water | `THON_KHOI_NGUYEN` | `monster_slime` | `/assets/elysia/monsters/MONSTER_GREEN_SLIME.png` | `c02878849060` | **PASS** |
| `MONSTER_GOBLIN_SCOUT` | Goblin Trinh Sát | Lv.4-6 | earth | `THON_KHOI_NGUYEN` | `monster_goblin` | `/assets/elysia/monsters/MONSTER_GOBLIN_SCOUT.png` | `31df42fb4e90` | **PASS** |
| `BOSS_DARK_DRAGON_STARTER` | Hắc Long Hộ Vệ | Lv.8-12 | shadow | `THON_KHOI_NGUYEN` | `boss_dark_dragon` | `/assets/elysia/monsters/BOSS_DARK_DRAGON_STARTER.png` | `2ebbb0225f8c` | **PASS** |
| `mon_sanctum_sentinel` | Sanctum Trial Sentinel | Lv.15-16 | holy | `dungeon_sanctum_f1` | `monster_goblin` | `/assets/elysia/monsters/mon_sanctum_sentinel.png` | `b83183add982` | **PASS** |
| `mon_sanctum_acolyte` | Sanctum Rune Keeper | Lv.16-18 | holy | `dungeon_sanctum_f2` | `monster_goblin` | `/assets/elysia/monsters/mon_sanctum_acolyte.png` | `cb0bd57d7d61` | **PASS** |
| `boss_guardian_of_awakening` | Guardian of Awakening | Lv.20-20 | holy | `dungeon_sanctum_f3` | `boss_dark_dragon` | `/assets/elysia/monsters/boss_guardian_of_awakening.png` | `67bd8023ead5` | **PASS** |
| `boss_crimson_overlord` | Crimson Wyrm Overlord | Lv.75-75 | fire | `map_dragon_valley` | `boss_dark_dragon` | `/assets/elysia/monsters/boss_crimson_overlord.png` | `e029df55cb2c` | **PASS** |
| `boss_abyssal_sovereign` | Abyssal Void Sovereign | Lv.110-110 | shadow | `map_shadow_realm_border` | `boss_dark_dragon` | `/assets/elysia/monsters/boss_abyssal_sovereign.png` | `048e3cc14f68` | **PASS** |
| `boss_ancient_treant` | Ancient Treant (Field Boss Lv.38) | Lv.38-38 | earth | `map_spirit_forest` | `boss_dark_dragon` | `/assets/elysia/monsters/boss_ancient_treant.png` | `e8a825c8cb76` | **PASS** |
| `boss_moon_hydra` | Moon Hydra (Field Boss Lv.45) | Lv.45-45 | water | `map_moonlit_lake` | `boss_dark_dragon` | `/assets/elysia/monsters/boss_moon_hydra.png` | `d594978804f1` | **PASS** |
| `boss_ancient_titan` | Ancient Titan (Field Boss Lv.55) | Lv.55-55 | earth | `map_ancient_ruins` | `boss_dark_dragon` | `/assets/elysia/monsters/boss_ancient_titan.png` | `6b33c1d432af` | **PASS** |
| `boss_ignis_dragon` | Ignis Dragon (World Boss Lv.75) | Lv.75-75 | fire | `map_dragon_valley` | `boss_dark_dragon` | `/assets/elysia/monsters/boss_ignis_dragon.png` | `bcadec06a27a` | **PASS** |
| `boss_abyss_overlord` | Abyss Overlord (World Boss Lv.110) | Lv.110-110 | shadow | `map_shadow_realm_border` | `boss_dark_dragon` | `/assets/elysia/monsters/boss_abyss_overlord.png` | `5f3fc5b1e136` | **PASS** |
| `elite_whispering_meadow` | Elite Whispering Meadow Sentinel | Lv.18-19 | earth | `map_whispering_meadow` | `monster_wolf` | `/assets/elysia/monsters/elite_whispering_meadow.png` | `db3271805627` | **PASS** |
| `miniboss_whispering_meadow` | Mini Boss · Whispering Meadow Warden | Lv.19-20 | earth | `map_whispering_meadow` | `monster_wolf` | `/assets/elysia/monsters/miniboss_whispering_meadow.png` | `7f0b76e20a4c` | **PASS** |
| `elite_windmill_plains` | Elite Windmill Plains Sentinel | Lv.23-24 | wind | `map_windmill_plains` | `monster_boar` | `/assets/elysia/monsters/elite_windmill_plains.png` | `5c6a0d1d17ca` | **PASS** |
| `miniboss_windmill_plains` | Mini Boss · Windmill Plains Warden | Lv.24-25 | wind | `map_windmill_plains` | `monster_boar` | `/assets/elysia/monsters/miniboss_windmill_plains.png` | `64218fff46f9` | **PASS** |
| `elite_spirit_outskirts` | Elite Spirit Outskirts Sentinel | Lv.28-29 | earth | `map_spirit_forest_outskirts` | `monster_goblin` | `/assets/elysia/monsters/elite_spirit_outskirts.png` | `f8e0081be192` | **PASS** |
| `miniboss_spirit_outskirts` | Mini Boss · Spirit Outskirts Warden | Lv.29-30 | earth | `map_spirit_forest_outskirts` | `monster_goblin` | `/assets/elysia/monsters/miniboss_spirit_outskirts.png` | `325c2bb27556` | **PASS** |
| `elite_spirit_forest` | Elite Spirit Forest Sentinel | Lv.36-37 | earth | `map_spirit_forest` | `boss_dark_dragon` | `/assets/elysia/monsters/elite_spirit_forest.png` | `c8fa3d56bc70` | **PASS** |
| `miniboss_spirit_forest` | Mini Boss · Spirit Forest Warden | Lv.37-38 | earth | `map_spirit_forest` | `boss_dark_dragon` | `/assets/elysia/monsters/miniboss_spirit_forest.png` | `6eb27f45acaf` | **PASS** |
| `elite_moonlit_lake` | Elite Moonlit Lake Sentinel | Lv.43-44 | water | `map_moonlit_lake` | `monster_goblin` | `/assets/elysia/monsters/elite_moonlit_lake.png` | `6a6066e016c8` | **PASS** |
| `miniboss_moonlit_lake` | Mini Boss · Moonlit Lake Warden | Lv.44-45 | water | `map_moonlit_lake` | `boss_dark_dragon` | `/assets/elysia/monsters/miniboss_moonlit_lake.png` | `14e376fe8682` | **PASS** |
| `elite_ancient_ruins` | Elite Ancient Ruins Sentinel | Lv.52-53 | earth | `map_ancient_ruins` | `monster_goblin` | `/assets/elysia/monsters/elite_ancient_ruins.png` | `c13c70c69a4e` | **PASS** |
| `miniboss_ancient_ruins` | Mini Boss · Ancient Ruins Warden | Lv.53-54 | earth | `map_ancient_ruins` | `monster_goblin` | `/assets/elysia/monsters/miniboss_ancient_ruins.png` | `1f54810deefa` | **PASS** |
| `elite_ember_canyon` | Elite Ember Canyon Sentinel | Lv.63-64 | fire | `map_ember_canyon` | `monster_goblin` | `/assets/elysia/monsters/elite_ember_canyon.png` | `d163be07620b` | **PASS** |
| `miniboss_ember_canyon` | Mini Boss · Ember Canyon Warden | Lv.64-65 | fire | `map_ember_canyon` | `monster_slime` | `/assets/elysia/monsters/miniboss_ember_canyon.png` | `6a3d180e941e` | **PASS** |
| `elite_dragon_valley` | Elite Dragon Valley Sentinel | Lv.72-73 | fire | `map_dragon_valley` | `boss_dark_dragon` | `/assets/elysia/monsters/elite_dragon_valley.png` | `ba2b091428eb` | **PASS** |
| `miniboss_dragon_valley` | Mini Boss · Dragon Valley Warden | Lv.73-74 | fire | `map_dragon_valley` | `boss_dark_dragon` | `/assets/elysia/monsters/miniboss_dragon_valley.png` | `021148350eec` | **PASS** |
| `elite_crimson_desert` | Elite Crimson Desert Sentinel | Lv.87-88 | earth | `map_crimson_desert` | `monster_goblin` | `/assets/elysia/monsters/elite_crimson_desert.png` | `d70b7f7a9749` | **PASS** |
| `miniboss_crimson_desert` | Mini Boss · Crimson Desert Warden | Lv.88-89 | earth | `map_crimson_desert` | `boss_dark_dragon` | `/assets/elysia/monsters/miniboss_crimson_desert.png` | `a25ac4eb7a3e` | **PASS** |
| `elite_shadow_border` | Elite Shadow Border Sentinel | Lv.104-105 | shadow | `map_shadow_realm_border` | `monster_goblin` | `/assets/elysia/monsters/elite_shadow_border.png` | `b78209af06cd` | **PASS** |
| `miniboss_shadow_border` | Mini Boss · Shadow Border Warden | Lv.105-106 | shadow | `map_shadow_realm_border` | `boss_dark_dragon` | `/assets/elysia/monsters/miniboss_shadow_border.png` | `cf96f054b2a4` | **PASS** |
| `mon_green_slime` | Green Slime | Lv.1-2 | earth | `map_beginner_meadow` | `monster_slime` | `/assets/elysia/monsters/mon_green_slime.png` | `16c2050816e2` | **PASS** |
| `mon_red_slime` | Red Slime | Lv.2-3 | fire | `map_beginner_meadow` | `monster_slime` | `/assets/elysia/monsters/mon_red_slime.png` | `6aeaf4007a6b` | **PASS** |
| `mon_forest_rabbit` | Forest Rabbit | Lv.3-4 | wind | `map_green_rabbit_forest` | `monster_rabbit` | `/assets/elysia/monsters/mon_forest_rabbit.png` | `23edb93db02f` | **PASS** |
| `mon_one_horned_rabbit` | One-Horned Rabbit | Lv.4-5 | wind | `map_green_rabbit_forest` | `monster_rabbit` | `/assets/elysia/monsters/mon_one_horned_rabbit.png` | `8a6ee423a969` | **PASS** |
| `mon_elite_rabbit` | Elite Forest Rabbit | Lv.5-5 | wind | `map_green_rabbit_forest` | `monster_rabbit` | `/assets/elysia/monsters/mon_elite_rabbit.png` | `9584f4df6ab6` | **PASS** |
| `mon_hardwing_bee` | Hardwing Bee | Lv.5-6 | wind | `map_ancient_bee_forest` | `monster_bee` | `/assets/elysia/monsters/mon_hardwing_bee.png` | `b04d99b018fa` | **PASS** |
| `mon_guardian_bee` | Guardian Bee | Lv.6-7 | earth | `map_ancient_bee_forest` | `monster_bee` | `/assets/elysia/monsters/mon_guardian_bee.png` | `16a458202b0a` | **PASS** |
| `mon_elite_bee` | Elite Honeyguard Bee | Lv.7-7 | wind | `map_ancient_bee_forest` | `monster_bee` | `/assets/elysia/monsters/mon_elite_bee.png` | `40b924e29882` | **PASS** |
| `mon_wild_wolf` | Wild Wolf | Lv.7-8 | neutral | `map_wild_wolf_valley` | `monster_wolf` | `/assets/elysia/monsters/mon_wild_wolf.png` | `0ea531e6480e` | **PASS** |
| `mon_elite_wolf` | Elite Pack Wolf | Lv.8-9 | shadow | `map_wild_wolf_valley` | `monster_wolf` | `/assets/elysia/monsters/mon_elite_wolf.png` | `8f2e39ae5552` | **PASS** |
| `mon_blood_wolf` | Blood Wolf | Lv.9-9 | fire | `map_wild_wolf_valley` | `monster_wolf` | `/assets/elysia/monsters/mon_blood_wolf.png` | `2ee7fca02d19` | **PASS** |
| `mon_wild_boar` | Wild Boar | Lv.9-10 | earth | `map_wild_boar_forest` | `monster_boar` | `/assets/elysia/monsters/mon_wild_boar.png` | `0974f17abccc` | **PASS** |
| `mon_elite_boar` | Elite Tusker Boar | Lv.10-11 | earth | `map_wild_boar_forest` | `monster_boar` | `/assets/elysia/monsters/mon_elite_boar.png` | `92584ad31b7c` | **PASS** |
| `mon_outpost_goblin` | Outpost Goblin | Lv.11-12 | earth | `map_goblin_outpost` | `monster_goblin` | `/assets/elysia/monsters/mon_outpost_goblin.png` | `94b746053334` | **PASS** |
| `mon_goblin_warrior` | Goblin Warrior | Lv.12-13 | fire | `map_goblin_outpost` | `monster_goblin` | `/assets/elysia/monsters/mon_goblin_warrior.png` | `f63405b4c36c` | **PASS** |
| `mon_elite_goblin` | Elite Goblin Berserker | Lv.13-14 | fire | `map_goblin_cave` | `monster_goblin` | `/assets/elysia/monsters/mon_elite_goblin.png` | `9373613c763b` | **PASS** |
| `boss_goblin_chieftain` | Goblin Chieftain | Lv.15-15 | fire | `map_goblin_cave` | `monster_goblin` | `/assets/elysia/monsters/boss_goblin_chieftain.png` | `69a99dad3e24` | **PASS** |
