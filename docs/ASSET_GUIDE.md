# ELYSIA NO DENSETSU – MASTER ASSET GUIDE

This document serves as the canonical directory standard and pipeline guide for all visual and audio assets in **ELYSIA NO DENSETSU**.

---

## 1. Directory Architecture

All production game assets reside inside `apps/game-client/public/assets/` under isolated, domain-specific folders:

```
public/assets/
├── characters/         # Player characters (male, female, jobs, paper doll parts)
├── npcs/               # Village, town, dungeon, and special NPCs
├── monsters/           # Field, elite, dungeon monsters, and world bosses
├── equipment/          # Weapons, armor, helms, gloves, boots, cloaks, accessories
├── items/              # Consumables, crafting materials, quest items, special tokens
├── effects/            # Skill VFX, combat impacts, environmental particles
├── maps/               # Tilesets, tilemaps (JSON), backgrounds, parallax skies
├── ui/                 # Frames, window panels, buttons, icons, inventory elements
└── audio/              # Background music (BGM) and sound effects (SFX)
```

---

## 2. General File Requirements

1. **Format:**
   - 2D Sprites, Sheets & UI: Transparent PNG (RGBA 32-bit).
   - Large Backdrops & Banners: High-quality WebP (lossless/95%).
   - Audio: Stereo MP3 (192 kbps) or OGG Vorbis (-14 LUFS for BGM, -6 dB peak for SFX).
2. **Color Profile:** sRGB standard.
3. **Naming Convention:** Lowercase snake_case (e.g., `job_swordsman.png`, `wooden_sword_sprite.png`).
4. **Resolution Standards:**
   - Standard Tile: 64×32 px (2.5D Isometric Diamond).
   - Character Frame: 64×64 px or 128×128 px (pixel-aligned grid).
   - Item Icon: 48×48 px or 64×64 px square.
   - Dialogue Portrait: 256×256 px.

---

## 3. Asset Registration Workflow

When adding new assets:
1. Place PNG / WebP files into the appropriate folder (e.g., `equipment/weapons/sword/iron_blade.png`).
2. Add metadata entry to `apps/game-client/src/engine/SpriteAssetManager.ts` or `manifest.json`.
3. No hardcoded file paths inside components; components query assets via asset IDs or icon keys.
