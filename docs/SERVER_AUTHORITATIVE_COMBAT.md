# Server-Authoritative Combat Core

## Status
This branch introduces the first server-owned combat loop. It is a gameplay foundation, not a production-readiness claim. Run the workspace typecheck/build and multiplayer integration tests before merging.

## Trust boundary
- Socket.IO connections require a valid JWT in `handshake.auth.token`.
- `player:join` accepts only `characterId`; identity is derived from the verified JWT.
- Character APIs require JWT authentication and enforce character ownership.
- Client movement is treated as a requested position and checked against a server-side speed budget.
- Client combat messages contain intent only: action type, skill ID, and server-issued monster instance ID.
- Client-supplied damage, HP, MP, EXP, Gold, loot, position, class, level, and monster state are never accepted as authoritative values.

## Implemented systems
- Server-owned player combat state: HP/MP, derived maxima, ATK/MATK/DEF/MDEF, death state, position, cooldowns.
- Server-owned monster instances from canonical world monster definitions and spawn points.
- Basic attacks and configured damaging skills with server-side class/level, MP, cooldown, range, and target checks.
- Monster retaliation, player death, and village respawn.
- EXP and Gold rewards; level progression uses `floor(100 * level^1.35)` as the current initial curve.
- Drop-table rolls use configured percentage chances and quantity bounds; player level requirements are enforced.
- Drops are granted to the character inventory, stacking up to each item's configured stack limit.
- HP/MP consumables and the configured self-heal skill are processed by the server.
- Monster respawn timers are processed server-side and announced to the region.
- Character combat resources and progression are persisted to the existing JSON store.

## Socket event contract
Client -> server:
- `player:join`: `{ characterId }`
- `player:move`: `{ x, y }`
- `player:combat_action`: `{ actionType: "basic_attack" | "skill", skillId?, targetId }`
- `player:use_item`: `{ itemId }`
- `player:change_region`: `{ targetRegionId }`
- `player:respawn`: `{}`

Server -> client:
- `player:state`: authoritative player snapshot
- `world:monsters`: initial monster instances for the joined region
- `combat:result`: validated damage, critical state, monster HP, player resources and rewards
- `combat:rewards`: EXP, Gold, drops and levels gained
- `inventory:item_used`: validated consumable result
- `world:monster_respawned`: respawned monster state

## Initial balancing formulas
- Max HP = `100 + CON * 20 + (level - 1) * 12 + equipment.maxHp`
- Max MP = `40 + INT * 15 + (level - 1) * 6 + equipment.maxMp`
- ATK = `STR * 2 + DEX * 0.35 + equipment ATK`
- MATK = `INT * 2 + equipment MATK`
- DEF = `CON * 0.7 + equipment DEF`
- Damage uses server-side attack power, skill multiplier, bounded random variance, monster defense and critical roll.

These are prototype balance formulas and should later be moved to versioned game configuration managed by Admin.

## Known follow-up work
- Render authoritative monster instances with their animation assets in Phaser; the current client still contains legacy local training dummies.
- Connect all skill definitions and hotbar entries to real server skill IDs; only currently configured skills are authoritative.
- Add authoritative monster AI ticks (aggro, chase, attack cadence, return-to-spawn), status effects, party contribution and anti-farming rules.
- Add persistent ground-loot pickup if the game design requires loot to appear in the world rather than be granted directly to inventory.
- Replace JSON persistence with transactional storage before multi-process or production deployment.
- Add automated service/socket tests and run `pnpm --filter @elysia/game-server typecheck`, workspace builds, and real two-client integration tests.

## Security note
The legacy demo credentials and default JWT/CORS configuration remain outside this combat-core change and must be corrected before public deployment.
