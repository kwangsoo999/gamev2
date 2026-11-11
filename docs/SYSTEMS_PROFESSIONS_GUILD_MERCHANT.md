# Elysia no Densetsu — Life Skills, Guilds, Merchant Associations & Territory Architecture

## 1. Data Files (`game-data/professions/` & `game-data/organizations/`)

### `game-data/professions/` (mirrored to `apps/game-client/public/data/professions/`)
1. `profession_config.json` — Global rules (`maxInitialProfessions: 3`, `absoluteMaxProfessions: 8`, `dailyGatherSoftCap: 120`, `dailyCraftSoftCap: 150`) and 8 professions (`herbalist`, `blacksmith`, `alchemist_jeweler`, `miner`, `farmer`, `fisherman`, `woodcutter`, `chef`).
2. `profession_mastery.json` — 7 ranks (`Apprentice` Lv.1–10 through `Legendary` Lv.61–70) + Lv.1–70 EXP progression curve.
3. `profession_materials.json` — Raw and refined materials mapped across gathering, mining, woodcutting, fishing, farming, and boss catalysts.
4. `profession_tools.json` — Tiered tools with durability, speed, quality, and extra yield bonuses.
5. `profession_gathering_nodes.json` — Interactive nodes across Elysia maps with respawn timers, required tool tiers, mastery requirements, and territory bindings.
6. `profession_recipes.json` — Tiered crafting recipes including Hidden Legendary Recipes unlocked via boss reagents and profession quests.
7. `profession_quality.json` — Quality stat & value multipliers for `common`, `uncommon`, `rare`, `epic`, `legendary`.
8. `profession_quests.json` — Intro, daily, mastery advancement, and hidden legendary unlock quests (unlocking `+1` profession slot where configured).
9. `profession_npcs.json` — All 8 dedicated profession NPC masters merged cleanly into `world/npcs.json`.
10. `profession_economy.json` — Market taxes, auction fees, anti-inflation listing caps, and supply contract limits.

### `game-data/organizations/` (mirrored to `apps/game-client/public/data/world/`)
- `guild_config.json` — Guild Lv.1–10 table, creation prerequisites (Lv.30, 500,000 Gold, `ITEM_GUILD_CREATION_SEAL`, 5 founders), ranks/permissions matrix, buildings, research skills, daily/weekly quests, and raid bosses.
- `merchant_config.json` — Merchant Association Lv.1–10 table, creation prerequisites (Lv.25, 300,000 Gold, `ITEM_MERCHANT_SEAL`, 5 founders), caravan trade routes, and supply contracts integrating all 8 Life Skills.
- `territories_config.json` — 5 strategic territories with capped taxes (`maxTaxRatePct: 8–10%`), `publicDailyGatherQuota` anti-monopoly guarantees, and seasonal resets.

## 2. Database Store (`apps/game-server/src/database/jsonStore.ts`)
Persistent normalized collections: `guilds`, `guildApplications`, `guildWars`, `merchantAssociations`, `marketListings`, `marketBuyOrders`, `auctions`, `supplyContracts`, `caravanMissions`, `territories`, `farmPlots`, `gatheringNodesRuntime`, `auditLogs`, `processedTxIds`.

## 3. REST & Socket.IO APIs (`apps/game-server`)
- **Professions**: `GET /api/v1/professions/catalog`, `GET /api/v1/professions/:charId`, `POST /learn`, `/tools/buy`, `/tools/repair`, `/gather/start`, `/gather/complete`, `/farm/plant`, `/farm/water`, `/farm/harvest`, `GET /craft/preview/:recipeId`, `POST /craft`, `/recipes/learn`, `/quests/complete`.
- **Guilds**: `GET /api/v1/guilds`, `GET /api/v1/guilds/rankings/season`, `GET /api/v1/guilds/:id`, `POST /api/v1/guilds`, `POST /:id/apply`, `POST /:id/applications/:appId/review`, `POST /:id/ranks/assign`, `PATCH /:id/ranks/:rankId`, `POST /:id/members/remove`, `PATCH /:id/announcement`, `POST /:id/chat`, `POST /:id/donate`, `POST /:id/storage/deposit`, `POST /:id/storage/withdraw`, `POST /:id/buildings/upgrade`, `POST /:id/skills/upgrade`, `POST /:id/boss/summon`, `POST /:id/boss/attack`, `POST /:id/wars/challenge`, `POST /wars/:warId/score`, `POST /:id/quests/claim`.
- **Merchants & Marketplace**: `GET /api/v1/merchants/*`, `POST /api/v1/merchants`, `POST /contracts/:id/fulfill`, `POST /:id/caravans/start`, `POST /caravans/:id/complete`, `GET/POST /api/v1/marketplace/listings`, `/listings/:id/buy`, `/listings/:id/cancel`, `/buy-orders`, `/buy-orders/:id/fulfill`, `/auctions`, `/auctions/:id/bid`, `/auctions/:id/settle`, `GET /api/v1/marketplace/audit-logs`.
- **Territories & Admin**: `GET /api/v1/territories`, `POST /territories/:id/siege`, `/tax`, `/buildings/upgrade`; `GET/PATCH /api/v1/admin/world/economy`, `POST /api/v1/admin/world/territories/reset-season`, `GET /api/v1/admin/world/audit-logs`.
- **Socket.IO Chat Channels**: `general`, `global`, `party`, `whisper`, `guild`, `merchant`.

## 4. Client UI & Admin Components
- **Game Client**: [ProfessionModal.ts](apps/game-client/src/ui/ProfessionModal.ts) (hotkey `O`), [GuildMerchantModal.ts](apps/game-client/src/ui/GuildMerchantModal.ts) (hotkey `G`), HUD quick rail & NPC dialogue integration in [ElysiaHUD.ts](apps/game-client/src/ui/ElysiaHUD.ts) & [GameEngine.ts](apps/game-client/src/engine/GameEngine.ts).
- **Admin Dashboard**: [ProfessionEconomyManager.tsx](apps/game-admin/src/components/ProfessionEconomyManager.tsx) mounted in `App.tsx`.
