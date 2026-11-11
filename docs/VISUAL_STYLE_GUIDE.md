# ELYSIA NO DENSETSU – MASTER VISUAL STYLE GUIDE

**Official Game Title:** ELYSIA NO DENSETSU (Elysia Frontier)  
**Art Direction:** Japanese Anime Fantasy MMORPG – 2D / 2.5D Isometric World  
**Reference Inspirations:** Ragnarok Online (2.5D isometric landmarks & readable monster silhouettes), Tree of Savior (hand-painted anime fantasy warmth), MapleStory / TalesWeaver (expressive chibi proportions), Granblue Fantasy / Genshin Impact (job costume details & elemental VFX).

---

## 1. Camera Angle & World Projection

- **Projection**: 3/4 top-down 2.5D isometric oblique camera (`35°–45°` elevation angle).
- **Ground & Terrain**: Lush hand-painted grass, warm cobblestone roads, sacred white marble plazas, clear azure water with shoreline foam, and regional biome palettes (Emerald Forest, Golden Plains, Scorching Desert, Volcanic Abyss, Frozen Glacier, Shadow Citadel).
- **Buildings & Landmarks**: All buildings show both their **front facade and side depth** with pitched roofs, warm interior doorway glow, and grounding contact shadows so they sit naturally on the tile grid.

---

## 2. Character & NPC Proportions

- **Chibi / Semi-Chibi Anime Proportion**: `2.5 to 3.5 heads tall` on the world map for instant silhouette readability; full-body anime illustrations (`256×256` and `320×320`) in character equipment paperdoll and NPC dialogue portraits.
- **Linework**: Crisp dark-brown / deep-indigo anime outlines (`2px–3px` at base resolution) — never harsh pure-black pixel jagging or unoutlined flat polygons.
- **Role Readability**:
  - **Blacksmith (`npc_blacksmith`)**: Heavy leather forge apron, muscular arms, glowing red-hot forging hammer.
  - **Hunter (`npc_hunter`)**: Forest-green hooded ranger cloak, feathered cap, recurve hunting bow & quiver.
  - **High Priest (`npc_high_priest`)**: Sacred white-and-gold cathedral vestments, haloed mitre, golden winged sun scepter.
  - **Sanctuary Priestess (`npc_priestess`)**: Blue-and-white shrine maiden/cathedral vestment, golden cross brooch, sacred prayer tome.

---

## 3. Job Class Visual Identity (8 Base Jobs & 16 Advanced Jobs)

| Base Job | Primary Palette | Weapon Silhouette | Advanced Job Branches (Lv.20) |
| :--- | :--- | :--- | :--- |
| **Warrior** (`warrior`) | Crimson & Burnished Gold | Two-Handed Greatsword | **Berserker** (Blood/Rage) • **Dragon Knight** (Flame/Scale) |
| **Swordsman** (`swordsman`) | Azure & Silver | Single-Edged Katana / Spirit Blade | **Blade Master** (Cyan Dual/Iaido) • **Spellblade** (Violet Rune Blade) |
| **Mage** (`mage`) | Royal Indigo & Starlight Gold | Crystal Staff & Floating Grimoire | **Archmage** (Solar/Elemental) • **Warlock** (Abyssal Void) |
| **Assassin** (`assassin`) | Nightshade Purple & Crimson | Twin Reverse-Grip Daggers | **Shadowblade** (Crimson Stealth) • **Phantom Dancer** (Mirage/Poison) |
| **Archer** (`archer`) | Emerald Forest & Wind Gold | Winged Recurve Bow & Quiver | **Marksman** (Golden Sniper) • **Windrunner** (Emerald Gale) |
| **Priest** (`priest`) | Sacred White, Sky Blue & Gold | Winged Sun Scepter & Halo | **High Priest** (Radiant Gold) • **Inquisitor** (Judgement Flame) |
| **Paladin** (`paladin`) | Silver Steel, Royal Blue & Gold | Golden Cross Tower Shield & Broadsword | **Holy Crusader** (Solar Aegis) • **Templar** (Sanctuary Bastion) |
| **Lancer** (`lancer`) | Cobalt Dragon-Scale & Cyan | Spiral Dragon War Lance | **Dragoon** (Sky Piercer) • **Valkyrie** (Celestial Halberd) |

---

## 4. Monster Species & Elemental Coding Rules

1. **Zero Species Misrepresentation**:
   - **Rabbits** (`mon_rabbit_1`, `mon_horn_rabbit`): Quadruped fluffy rabbits with long ears and cotton tail — NEVER slimes.
   - **Wolves** (`mon_wolf_1`, `mon_wolf_2`): Quadruped ferocious wolves with fangs, bushy tail, and fur mane — NEVER sprout balls.
   - **Boars** (`mon_boar_1`, `mon_boar_2`): Bristled wild boars with curved ivory tusks.
   - **Bees** (`mon_bee_1`): Winged giant hornets with yellow-black abdomen stripes and stinger.
   - **Goblins** (`mon_goblin_1`..): Green-skinned humanoid goblin scouts and chieftains with pointed ears, leather armor, and clubs/axes.
2. **Elemental Palette Coding**:
   - **Wood / Nature**: Emerald & Leaf Green
   - **Fire / Lava**: Crimson, Amber & Magma Orange
   - **Water / Ice**: Cerulean, Cyan & Frost Blue
   - **Light / Holy**: Ivory White & Radiant Gold
   - **Dark / Shadow**: Abyssal Violet & Obsidian
   - **Earth / Stone**: Ochre, Granite & Runic Amber

---

## 5. Sprite Sheet & Asset Pipeline Standards

- **World Animation Sheets (`characters/animations/*.png`)**: `1536×1120` RGBA PNG (8 columns × 7 rows of `192×160` cells: Row 0 Down, Row 1 Left, Row 2 Right, Row 3 Up, Row 4 Attack, Row 5 Hit, Row 6 KO).
- **Monster Individual Sprites (`monsters/*.png`)**: `128×128` RGBA PNG with transparent background, grounded contact shadow, and eager preloading (`"loading": "eager"`).
- **Job Illustrations (`characters/jobs/*.png`)**: `256×256` RGBA PNG with transparent background and subtle class aura.
- **Dialogue Portraits (`ui/portrait-*.png`)**: `320×320` RGBA PNG bust portraits.
