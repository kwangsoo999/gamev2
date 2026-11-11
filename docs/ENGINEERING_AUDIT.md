# ELYSIA NO DENSETSU – FULL SOURCE CODE ENGINEERING AUDIT (`PHASE 1`)

**Project:** ELYSIA NO DENSETSU – Elysia Frontier ("Become Wibu, Save the Worlds.")  
**Repository:** `https://github.com/HoangNhanTNT/ElysaMMO`  
**Audit Date:** 2026-11-11

---

## 1. Repository Architecture & Directory Responsibilities

The repository is structured as a TypeScript `pnpm` monorepo (`pnpm-workspace.yaml`) comprising 3 applications and 6 shared packages:

| Directory | Responsibility |
| :--- | :--- |
| `apps/game-client` | HTML5 2D/2.5D Canvas MMORPG client (`GameEngine.ts`, `TilemapEngine.ts`, `SpriteManager.ts`, `ArtworkLibrary.ts`) and modular DOM UI (`ElysiaHUD.ts`, `WorldModals.ts`, `BaloEquipModal.ts`, `SkillFrameModal.ts`, `ProfessionModal.ts`, `GuildMerchantModal.ts`, `SocialTradeModal.ts`, `AuthModal.ts`, `CharacterCreationModal.ts`, `SettingsModal.ts`, `EventModal.ts`, `DeathOverlayModal.ts`). |
| `apps/game-server` | Express + Socket.IO authoritative multiplayer backend (`app.ts`, `server.ts`, `multiplayer/worldSocket.ts`), REST routes (`auth`, `character`, `game`, `world`, `dungeon`, `profession`, `organizations`, `world-admin`, `admin`), domain services (`character`, `quest-title`, `combat`, `job`, `passive`, `crafting`, `profession`, `guild`, `merchant`, `territory`, `social`, `dungeon`), and JSON database persistence (`database/jsonStore.ts`). |
| `apps/game-admin` | React + Vite Game Master & World Operations dashboard (`ItemManager.tsx`, `WeaponManager.tsx`, `SkillVfxManager.tsx`, `App.tsx`) for live balance, spawn, quest, and asset management. |
| `packages/game-types` | Canonical TypeScript interfaces and domain types shared across client, server, and admin (`CharacterEntity`, `QuestDefinition`, `QuestStatusState`, `ActiveQuestProgress`, `TitleDefinition`, `UniqueEquipmentDefinition`, `PassiveSkillNode`, `EvolutionBranch`). |
| `packages/game-data-schema` | Authoritative game formulas, stat aggregator (`statAggregator.ts`), anti-stat overflow caps, initial catalogs (`INITIAL_CLASSES`, `INITIAL_SKILLS`, `INITIAL_ITEMS`, `INITIAL_EQUIPMENT_SETS`, `PROFESSION_RECIPES`), and world placement validators. |
| `packages/vfx-engine` | Layered 2D Canvas VFX runtime (`VFXManager`, `jobRituals.ts`, `profiles.ts`) supporting class evolution tiers and reduced-effects mode. |
| `packages/api-contracts` | Shared API response envelopes and endpoint contracts. |
| `packages/validation` | Input sanitization and schema validation helpers. |
| `packages/shared-utils` | Common math, RNG, and formatting utilities. |
| `game-data` & `apps/game-client/public/data` | World map definitions (`thon_khoi_nguyen.json`, `map_beginner_meadow.json`, `city_elysia_capital.json`, `map_holy_sanctuary_interior.json`, etc.), quests (`quests.json`), monsters, items, and sprite sheets. |

---

## 2. Key Audit Findings

### 2.1 UI Buttons & NPC Interaction Audit
- **Hardcoded HUD Quest Text:** `apps/game-client/index.html` previously contained hardcoded static text (`"Dọn Sạch Ngoại Ô Làng"`, `"Tiêu diệt Slime Thảo Nguyên (0/3)"`) inside `#hud-quest-card`, causing the HUD to display a quest even before the player accepted any quest.
- **NPC Overhead Markers:** `apps/game-client/src/engine/SpriteManager.ts` previously rendered a static `!` badge over every `npc` entity regardless of whether the NPC had an available quest, a turn-in quest, or no quest at all.
- **NPC Dialogue Progression & Direct Quest Actions:** `ElysiaHUD.showNpcDialog` needed multi-line dialogue progression (`Tiếp theo ▸`), direct per-NPC Quest Accept (`📜 Nhận NV`) and Quest Turn-In (`✨ Báo Cáo & Nhận Thưởng`) buttons, and Blacksmith/Merchant equipment repair (`🔧 Sửa Chữa Trang Bị`).
- **Missing Action Buttons in Quest Journal, Shop & Balo:**
  - Quest Journal (`WorldModals.ts`) previously combined quests into a single list without separating `Available`, `Active`, `Completed`, and `Unlocked Hidden` tabs, and lacked `[🎯 Theo Dõi]`, `[Bỏ Theo Dõi]`, and `[✕ Hủy NV]` buttons.
  - Shop (`WorldModals.ts`) only supported single-item buying (`qty = 1`) and lacked a `Bán Vật Phẩm` (Sell) tab, quantity `-`/`+` controls, and equipment repair.
  - Balo (`BaloEquipModal.ts`) lacked `[⇅ Sắp Xếp]` (Sort), `[🗑 Vứt Bỏ]` (Discard), and `[🔧 Sửa Chữa]` (Repair) actions.

### 2.2 Quest System & Hidden Quest Leak Audit
- **Public API Leak:** `GET /api/v1/game/quests` previously called `questTitleService.getQuests(true)`, which returned `isHidden: true` (`HIDDEN_QUEST`) entries to unauthenticated/public callers.
- **Single-Quest HUD Tracking:** `CharacterEntity` lacked a persisted `trackedQuestId` field and `completedQuestHistory` map.
- **Monster Target ID Aliasing & Objective Schema:** Map spawns in `thon_khoi_nguyen.json` and `map_beginner_meadow.json` use `monster_slime` / `mon_green_slime` / `MONSTER_SLIME_MEADOW`, whereas `QUEST_001_SLIME_CLEAR` specifies `MONSTER_GREEN_SLIME`. Furthermore, `QUEST_SANCTUARY_BLESSING` in `quests.json` uses `"required": 1` instead of `"requiredCount": 1`. Both server (`quest-title.service.ts`) and client (`GameEngine.ts`) needed normalized target matching and `requiredCount ?? required` resolution.

### 2.3 Database & Persistence Audit
- **Windows Atomic Write Fallback & `.tmp` Leak:** `JsonStore.saveImmediate` in `apps/game-server/src/database/jsonStore.ts` wrote `${this.dbFilePath}.${process.pid}.${Date.now()}.tmp` and called `fs.renameSync(tempPath, this.dbFilePath)`. On Windows, brief file locks caused `renameSync` to throw `EPERM`, leaving 12 orphaned `server_db.json.*.tmp` files in `apps/game-server/data/`.
- **Character State Synchronization:** `CharacterService.saveCharacterProgressionState` needed to persist `trackedQuestId` and `completedQuestHistory` alongside `activeQuests`, `completedQuests`, and `discoveredHiddenQuests`.

### 2.4 Security & Configuration Audit
- **Protected Endpoints:** All character mutation endpoints (`/api/v1/characters/:id/*` and `/api/v1/game/*`) must verify JWT authentication (`authenticate`) and character ownership (`char.userId === req.user.userId`).
- **Server-Side Shop & Inventory Validation:** Shop buy/sell, inventory discard/sort, and equipment repair must validate quantities (`1..99`), gold balance, inventory slot limits (`30`), and non-tradable/equipped/unique item protections on the server.
- **Environment & Git Hygiene:** `.gitignore` needed rules for `*.tmp`, `apps/game-server/data/*.tmp`, `coverage/`, `playwright-report/`, and `test-results/`, and a safe `.env.example` template needed to be added.

---

## 3. Git Repository State Audit

- **Remote Origin:** `https://github.com/HoangNhanTNT/ElysaMMO.git`
- **Original Branch:** `main` (at commit `d3dbd2f`)
- **Existing Branches:** `main`, `feature/server-authoritative-combat`, `feature/starter-village-account-character`
- **Preserved Systems:** All existing 8 base jobs, 16 Lv.80 advanced jobs, automatic Lv.15 job awakening, passive skill tree & anti-stat overflow aggregator, 8 life-skill professions, guild & merchant association systems, Holy Sanctuary & Torii portals, elite monster AI, auto-combat, death penalty & village checkpoint resurrection are preserved intact.
