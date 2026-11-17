# ELYSIA NO DENSETSU – SPRITE SYSTEM AUDIT

**Date:** 2026-11-17  
**Engine:** Phaser 3.87.0 + Vite + TypeScript  
**Project:** ELYSIA NO DENSETSU – Elysia Frontier  

---

## 1. Executive Summary

This audit assesses the rendering, animation, asset loading, and equipment systems in `apps/game-client` to establish the baseline for the **Modular Layered Sprite System**.

---

## 2. Component Audit Table

| Subsystem | Existing Implementation | Identified Gaps / Technical Debt | Target Layered Architecture |
| :--- | :--- | :--- | :--- |
| **Phaser Engine** | `phaser@^3.87.0`, canvas 2D rendering overlay for 2.5D Isometric terrain & entities. | Entity drawing was previously monolithic in `SpriteManager.ts`. | Modular `SpriteComposer`, `LayerRenderer`, and `AnimationSynchronizer`. |
| **Directional Movement** | 8-directional logical movement grid, but character renderers often fell back to 4 cardinal directions. | Missing explicit directional sorting for equipment depth (e.g. weapon in front facing South vs behind facing North). | Unified 8-direction standard (0=South, 1=SW, 2=West, 3=NW, 4=North, 5=NE, 6=East, 7=SE) with `DirectionResolver` and `LayerSortManager`. |
| **Resolution & Scale** | Fixed 64×64 pixel frame expectations in legacy sheets. | Large monsters and bosses require custom scaling without stretching. | **Adaptive Resolution**: `pixelsPerUnit`, `referenceHeight`, `logicalCanvas`, and per-clip `pivot` anchors. |
| **Animation Synchronization** | Single frame index counter per entity. | Independent layers could desynchronize if they possessed different frame counts or timing. | Central **AnimationClock** & **AnimationSynchronizer** locking all active layers to the exact same animation timeline. |
| **Equipment Layering (Paper Doll)** | Basic modular layers in `SpriteManager` and `SpriteAssetManager`. | Hardcoded render order (`boots` -> `armor` -> `head` -> `weapon`). | Dynamic, direction-aware and animation-aware layer sorting: `shadow`, `back_equipment`, `body`, `armor`, `hair`, `headgear`, `front_equipment`, `vfx`. |
| **Asset Metadata** | `manifest.json` schema 2.0.0, `registry.json`. | Missing individual character manifests (`character.manifest.json`) and equipment metadata schemas. | Formalized JSON manifests with runtime schema validation. |
| **Validation Tooling** | Manual checking during startup. | No automated asset validation for alpha transparency, frame grid dimensions, and missing directions. | Automated **AssetValidator** script generating `ASSET_VALIDATION_REPORT.md`. |
| **Multiplayer State** | Authoritative Socket.IO server syncing position, state, equipment map. | Visual data was tied directly to stat updates. | Strict separation: Server syncs equipment item IDs; client resolves visual layers from verified cache. |

---

## 3. Reusable Assets & Code

1. **Existing Animations:**
   - Male Novice sheet: `/assets/elysia/characters/animations/player.png`
   - Female Novice atlas: `/assets/characters/female/novice/animations/novice_female_master_atlas.png`
   - 8 Base Job sheets: `job_swordsman.png`, `job_warrior.png`, `job_mage.png`, `job_paladin.png`, `job_priest.png`, `job_archer.png`, `job_assassin.png`, `job_lancer.png`
   - Weapon sprites: `wooden_sword_sprite.png`, `excalibur_sword_sprite.png`, `novice_bow_sprite.png`
   - Monster sheets: `slime.png`, `goblin.png`, `wolf.png`, `dark_dragon.png`, `rabbit.png`, `bee.png`, `boar.png`
   - NPC sheets: `blacksmith.png`, `elder.png`, `hunter.png`, `merchant.png`, `priestess.png`, `trainer.png`
2. **Existing UI & Modals:**
   - `CharacterPreview.ts`: Interactive canvas with 8 directions, zoom, gender toggle, and job selector.
   - `BaloEquipModal.ts`: 10 equipment slots, 48-slot inventory grid, 5 attributes allocation controls.
