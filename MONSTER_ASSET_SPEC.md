# ELYSIA NO DENSETSU — MONSTER ASSET AUDIT & ANIMATION SPEC

- **Total Audited Monsters**: 80
- **Verified 128x128 Transparent RGBA Monster PNGs on Disk**: 80/80
- **Manifest Entries Added/Synced**: 0
- **Broken Sheet References Repaired**: 0
- **Runtime Visual Pipeline**: Unique per-monster RGBA raster sprite rendering in `SpriteManager.ts` with multi-state procedural animation (`idle`, `walk`, `attack`, `hurt`, `death`), directional mirroring, Elite pulsing auras, Boss crowns, plus fallback 1536x1120 archetype sheets (`monster_slime`, `monster_goblin`, `boss_dark_dragon`).

## Complete Monster Registry Inventory

| Monster ID | Name | Tier | Family | Region | Unique 128x128 RGBA | Scale | Fallback Sheet |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `mon_meadow_slime` | Meadow Slime | NORMAL | slime | `map_whispering_meadow` | OK (128x128) | 1x | `monster_slime` |
| `mon_horn_rabbit` | Horn Rabbit | NORMAL | horn_rabbit | `map_whispering_meadow` | OK (128x128) | 1x | `monster_slime` |
| `mon_grassland_wolf` | Grassland Wolf | NORMAL | wolf | `map_whispering_meadow` | OK (128x128) | 1x | `monster_goblin` |
| `mon_gray_wolf` | Gray Wolf | NORMAL | wolf | `map_windmill_plains` | OK (128x128) | 1x | `monster_goblin` |
| `mon_giant_bee` | Giant Bee | NORMAL | giant_bee | `map_windmill_plains` | OK (128x128) | 1x | `monster_slime` |
| `mon_carnivorous_plant` | Carnivorous Plant | NORMAL | forest_flora_fauna | `map_windmill_plains` | OK (128x128) | 1x | `monster_goblin` |
| `mon_forest_goblin` | Forest Goblin | NORMAL | goblin | `map_spirit_forest_outskirts` | OK (128x128) | 1x | `monster_goblin` |
| `mon_poison_spider` | Poison Spider | NORMAL | forest_flora_fauna | `map_spirit_forest_outskirts` | OK (128x128) | 1x | `monster_slime` |
| `mon_mushroom_beast` | Mushroom Beast | NORMAL | forest_flora_fauna | `map_spirit_forest_outskirts` | OK (128x128) | 1x | `monster_goblin` |
| `mon_forest_spirit` | Forest Spirit | NORMAL | fantasy_beast | `map_spirit_forest` | OK (128x128) | 1x | `monster_slime` |
| `mon_soul_wolf` | Soul Wolf | NORMAL | wolf | `map_spirit_forest` | OK (128x128) | 1x | `monster_goblin` |
| `mon_ancient_treant` | Ancient Treant | NORMAL | forest_flora_fauna | `map_spirit_forest` | OK (128x128) | 1x | `boss_dark_dragon` |
| `mon_water_slime` | Water Slime | NORMAL | slime | `map_moonlit_lake` | OK (128x128) | 1x | `monster_slime` |
| `mon_giant_frog` | Giant Frog | NORMAL | aquatic_beast | `map_moonlit_lake` | OK (128x128) | 1x | `monster_goblin` |
| `mon_water_phantom` | Water Phantom | NORMAL | aquatic_beast | `map_moonlit_lake` | OK (128x128) | 1x | `monster_goblin` |
| `mon_skeleton_warrior` | Skeleton Warrior | NORMAL | undead_arcane | `map_ancient_ruins` | OK (128x128) | 1x | `monster_goblin` |
| `mon_stone_golem` | Stone Golem | NORMAL | construct_guardian | `map_ancient_ruins` | OK (128x128) | 1x | `boss_dark_dragon` |
| `mon_ancient_mage` | Ancient Mage | NORMAL | undead_arcane | `map_ancient_ruins` | OK (128x128) | 1x | `monster_goblin` |
| `mon_fire_lizard` | Fire Lizard | NORMAL | draconic_flame | `map_ember_canyon` | OK (128x128) | 1x | `monster_goblin` |
| `mon_lava_bat` | Lava Bat | NORMAL | draconic_flame | `map_ember_canyon` | OK (128x128) | 1x | `monster_slime` |
| `mon_flame_spirit` | Flame Spirit | NORMAL | draconic_flame | `map_ember_canyon` | OK (128x128) | 1x | `boss_dark_dragon` |
| `mon_young_dragon` | Young Dragon | NORMAL | draconic_flame | `map_dragon_valley` | OK (128x128) | 1x | `boss_dark_dragon` |
| `mon_dragonkin` | Dragonkin | NORMAL | draconic_flame | `map_dragon_valley` | OK (128x128) | 1x | `monster_goblin` |
| `mon_dragon_knight` | Dragon Knight | NORMAL | draconic_flame | `map_dragon_valley` | OK (128x128) | 1x | `boss_dark_dragon` |
| `mon_blood_scorpion` | Blood Scorpion | NORMAL | fantasy_beast | `map_crimson_desert` | OK (128x128) | 1x | `monster_slime` |
| `mon_sand_wraith` | Sand Wraith | NORMAL | undead_arcane | `map_crimson_desert` | OK (128x128) | 1x | `monster_goblin` |
| `mon_desert_guardian` | Desert Guardian | NORMAL | construct_guardian | `map_crimson_desert` | OK (128x128) | 1x | `boss_dark_dragon` |
| `mon_void_creature` | Void Creature | NORMAL | abyssal_void | `map_shadow_realm_border` | OK (128x128) | 1x | `monster_slime` |
| `mon_shadow_spirit` | Shadow Spirit | NORMAL | abyssal_void | `map_shadow_realm_border` | OK (128x128) | 1x | `monster_goblin` |
| `mon_dark_knight` | Dark Knight | NORMAL | abyssal_void | `map_shadow_realm_border` | OK (128x128) | 1x | `boss_dark_dragon` |
| `MONSTER_GREEN_SLIME` | Slime Thảo Nguyên | NORMAL | slime | `THON_KHOI_NGUYEN` | OK (128x128) | 1x | `monster_slime` |
| `MONSTER_GOBLIN_SCOUT` | Goblin Trinh Sát | NORMAL | goblin | `THON_KHOI_NGUYEN` | OK (128x128) | 1x | `monster_goblin` |
| `BOSS_DARK_DRAGON_STARTER` | Hắc Long Hộ Vệ | MINI_BOSS | draconic_flame | `THON_KHOI_NGUYEN` | OK (128x128) | 1.32x | `boss_dark_dragon` |
| `mon_sanctum_sentinel` | Sanctum Trial Sentinel | NORMAL | construct_guardian | `dungeon_sanctum_f1` | OK (128x128) | 1x | `monster_slime` |
| `mon_sanctum_acolyte` | Sanctum Rune Keeper | NORMAL | undead_arcane | `dungeon_sanctum_f2` | OK (128x128) | 1x | `monster_goblin` |
| `boss_guardian_of_awakening` | Guardian of Awakening | MINI_BOSS | construct_guardian | `dungeon_sanctum_f3` | OK (128x128) | 1.32x | `boss_dark_dragon` |
| `boss_crimson_overlord` | Crimson Wyrm Overlord | FIELD_BOSS | fantasy_beast | `map_dragon_valley` | OK (128x128) | 1.5x | `boss_dark_dragon` |
| `boss_abyssal_sovereign` | Abyssal Void Sovereign | WORLD_BOSS | abyssal_void | `map_shadow_realm_border` | OK (128x128) | 1.65x | `boss_dark_dragon` |
| `boss_ancient_treant` | Ancient Treant (Field Boss Lv.38) | FIELD_BOSS | forest_flora_fauna | `map_spirit_forest` | OK (128x128) | 1.5x | `boss_dark_dragon` |
| `boss_moon_hydra` | Moon Hydra (Field Boss Lv.45) | FIELD_BOSS | aquatic_beast | `map_moonlit_lake` | OK (128x128) | 1.5x | `boss_dark_dragon` |
| `boss_ancient_titan` | Ancient Titan (Field Boss Lv.55) | FIELD_BOSS | construct_guardian | `map_ancient_ruins` | OK (128x128) | 1.5x | `boss_dark_dragon` |
| `boss_ignis_dragon` | Ignis Dragon (World Boss Lv.75) | WORLD_BOSS | draconic_flame | `map_dragon_valley` | OK (128x128) | 1.65x | `boss_dark_dragon` |
| `boss_abyss_overlord` | Abyss Overlord (World Boss Lv.110) | WORLD_BOSS | abyssal_void | `map_shadow_realm_border` | OK (128x128) | 1.65x | `boss_dark_dragon` |
| `elite_whispering_meadow` | Elite Whispering Meadow Sentinel | ELITE | fantasy_beast | `map_whispering_meadow` | OK (128x128) | 1.25x | `monster_goblin` |
| `miniboss_whispering_meadow` | Mini Boss · Whispering Meadow Warden | MINI_BOSS | fantasy_beast | `map_whispering_meadow` | OK (128x128) | 1.32x | `boss_dark_dragon` |
| `elite_windmill_plains` | Elite Windmill Plains Sentinel | ELITE | fantasy_beast | `map_windmill_plains` | OK (128x128) | 1.25x | `monster_goblin` |
| `miniboss_windmill_plains` | Mini Boss · Windmill Plains Warden | MINI_BOSS | fantasy_beast | `map_windmill_plains` | OK (128x128) | 1.32x | `boss_dark_dragon` |
| `elite_spirit_outskirts` | Elite Spirit Outskirts Sentinel | ELITE | fantasy_beast | `map_spirit_forest_outskirts` | OK (128x128) | 1.25x | `monster_goblin` |
| `miniboss_spirit_outskirts` | Mini Boss · Spirit Outskirts Warden | MINI_BOSS | fantasy_beast | `map_spirit_forest_outskirts` | OK (128x128) | 1.32x | `boss_dark_dragon` |
| `elite_spirit_forest` | Elite Spirit Forest Sentinel | ELITE | fantasy_beast | `map_spirit_forest` | OK (128x128) | 1.25x | `monster_goblin` |
| `miniboss_spirit_forest` | Mini Boss · Spirit Forest Warden | MINI_BOSS | fantasy_beast | `map_spirit_forest` | OK (128x128) | 1.32x | `boss_dark_dragon` |
| `elite_moonlit_lake` | Elite Moonlit Lake Sentinel | ELITE | fantasy_beast | `map_moonlit_lake` | OK (128x128) | 1.25x | `monster_slime` |
| `miniboss_moonlit_lake` | Mini Boss · Moonlit Lake Warden | MINI_BOSS | fantasy_beast | `map_moonlit_lake` | OK (128x128) | 1.32x | `boss_dark_dragon` |
| `elite_ancient_ruins` | Elite Ancient Ruins Sentinel | ELITE | fantasy_beast | `map_ancient_ruins` | OK (128x128) | 1.25x | `monster_goblin` |
| `miniboss_ancient_ruins` | Mini Boss · Ancient Ruins Warden | MINI_BOSS | fantasy_beast | `map_ancient_ruins` | OK (128x128) | 1.32x | `boss_dark_dragon` |
| `elite_ember_canyon` | Elite Ember Canyon Sentinel | ELITE | fantasy_beast | `map_ember_canyon` | OK (128x128) | 1.25x | `monster_goblin` |
| `miniboss_ember_canyon` | Mini Boss · Ember Canyon Warden | MINI_BOSS | fantasy_beast | `map_ember_canyon` | OK (128x128) | 1.32x | `boss_dark_dragon` |
| `elite_dragon_valley` | Elite Dragon Valley Sentinel | ELITE | draconic_flame | `map_dragon_valley` | OK (128x128) | 1.25x | `monster_goblin` |
| `miniboss_dragon_valley` | Mini Boss · Dragon Valley Warden | MINI_BOSS | draconic_flame | `map_dragon_valley` | OK (128x128) | 1.32x | `boss_dark_dragon` |
| `elite_crimson_desert` | Elite Crimson Desert Sentinel | ELITE | fantasy_beast | `map_crimson_desert` | OK (128x128) | 1.25x | `monster_goblin` |
| `miniboss_crimson_desert` | Mini Boss · Crimson Desert Warden | MINI_BOSS | fantasy_beast | `map_crimson_desert` | OK (128x128) | 1.32x | `boss_dark_dragon` |
| `elite_shadow_border` | Elite Shadow Border Sentinel | ELITE | abyssal_void | `map_shadow_realm_border` | OK (128x128) | 1.25x | `monster_goblin` |
| `miniboss_shadow_border` | Mini Boss · Shadow Border Warden | MINI_BOSS | abyssal_void | `map_shadow_realm_border` | OK (128x128) | 1.32x | `boss_dark_dragon` |
| `mon_green_slime` | Green Slime | NORMAL | slime | `map_beginner_meadow` | OK (128x128) | 1x | `monster_slime` |
| `mon_red_slime` | Red Slime | NORMAL | slime | `map_beginner_meadow` | OK (128x128) | 1x | `monster_slime` |
| `mon_forest_rabbit` | Forest Rabbit | NORMAL | horn_rabbit | `map_green_rabbit_forest` | OK (128x128) | 1x | `monster_slime` |
| `mon_one_horned_rabbit` | One-Horned Rabbit | NORMAL | horn_rabbit | `map_green_rabbit_forest` | OK (128x128) | 1x | `monster_slime` |
| `mon_elite_rabbit` | Elite Forest Rabbit | ELITE | horn_rabbit | `map_green_rabbit_forest` | OK (128x128) | 1.25x | `monster_slime` |
| `mon_hardwing_bee` | Hardwing Bee | NORMAL | giant_bee | `map_ancient_bee_forest` | OK (128x128) | 1x | `monster_goblin` |
| `mon_guardian_bee` | Guardian Bee | NORMAL | giant_bee | `map_ancient_bee_forest` | OK (128x128) | 1x | `monster_goblin` |
| `mon_elite_bee` | Elite Honeyguard Bee | ELITE | giant_bee | `map_ancient_bee_forest` | OK (128x128) | 1.25x | `monster_goblin` |
| `mon_wild_wolf` | Wild Wolf | NORMAL | wolf | `map_wild_wolf_valley` | OK (128x128) | 1x | `monster_goblin` |
| `mon_elite_wolf` | Elite Pack Wolf | ELITE | wolf | `map_wild_wolf_valley` | OK (128x128) | 1.25x | `monster_goblin` |
| `mon_blood_wolf` | Blood Wolf | MINI_BOSS | wolf | `map_wild_wolf_valley` | OK (128x128) | 1.32x | `boss_dark_dragon` |
| `mon_wild_boar` | Wild Boar | NORMAL | wild_boar | `map_wild_boar_forest` | OK (128x128) | 1x | `monster_goblin` |
| `mon_elite_boar` | Elite Tusker Boar | ELITE | wild_boar | `map_wild_boar_forest` | OK (128x128) | 1.25x | `monster_goblin` |
| `mon_outpost_goblin` | Outpost Goblin | NORMAL | goblin | `map_goblin_outpost` | OK (128x128) | 1x | `monster_goblin` |
| `mon_goblin_warrior` | Goblin Warrior | NORMAL | goblin | `map_goblin_outpost` | OK (128x128) | 1x | `monster_goblin` |
| `mon_elite_goblin` | Elite Goblin Berserker | ELITE | goblin | `map_goblin_cave` | OK (128x128) | 1.25x | `monster_goblin` |
| `boss_goblin_chieftain` | Goblin Chieftain | FIELD_BOSS | goblin | `map_goblin_cave` | OK (128x128) | 1.5x | `boss_dark_dragon` |

## Production Prompts for Full 8-Direction (1536x1120) Frame-by-Frame Upgrade

- **slime / aquatic_beast**: `Chibi 2D Japanese fantasy MMORPG sprite sheet, [Slime / Aquatic Creature], 8x7 grid (192x160 per cell, 1536x1120 total), 4 directions (south, west, east, north x2), rows: idle/walk/run/attack/skill/hurt/death, crisp anime outline, cel-shaded vibrant watercolor, transparent alpha background.`
- **horn_rabbit / wild_boar / wolf**: `Chibi 2D Japanese fantasy MMORPG sprite sheet, horned meadow beast / forest boar / fierce wolf, 8x7 grid (192x160 per cell, 1536x1120 total), south/west/east/north directional columns, rows: idle/walk/run/attack/skill/hurt/death, clean silhouette, no background clutter, transparent alpha PNG.`
- **giant_bee / draconic_flame**: `Chibi 2D Japanese fantasy MMORPG flying monster sprite sheet, honeyguard wasp / flame drake, 8x7 grid (192x160 per cell, 1536x1120 total), dynamic wingbeat idle, dash sting/breath attack, hit recoil, dissolve death, transparent background.`
- **goblin / undead_arcane / abyssal_void**: `Chibi 2D Japanese fantasy MMORPG humanoid monster sprite sheet, goblin raider / skeleton warrior / void knight, 8x7 grid (192x160 per cell, 1536x1120 total), crisp weapon swing attack, spell cast skill, 4 cardinal directions, transparent alpha background.`
- **construct_guardian / forest_flora_fauna / Bosses**: `Japanese fantasy MMORPG Boss & Elite 2.5D top-down 4-direction sprite sheet, ancient treant / stone golem / crimson wyrm / abyss overlord, 1536x1120 grid, glowing rune cores, heavy slam telegraph frame, enrage flame variant, transparent background.`
