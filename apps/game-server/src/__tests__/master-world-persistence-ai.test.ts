import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { Server } from 'socket.io';
import { JsonStore } from '../database/jsonStore.js';
import { ENV } from '../config/env.js';
import { runMigrationsAndSeeds } from '../database/migrations.js';
import { createApp } from '../app.js';
import { CombatService } from '../services/combat.service.js';
import { WorldService } from '../services/world.service.js';
import { setupGameSockets } from '../sockets/gameSocket.js';
import {
  GAME_BRANDING,
  aggregateCharacterStats,
  computeDeathPenaltyApplication,
  getAdvancedBranchesForClass,
  resolveResurrectionCheckpoint,
} from '@elysia/game-data-schema';

async function jsonApi(baseUrl: string, apiPath: string, method = 'GET', token?: string, body?: any) {
  const res = await fetch(`${baseUrl}${apiPath}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  return { status: res.status, body: data };
}

test('Master Suite 1 — Official Branding, Monster Asset Audit & 3x Normal Training Map Spawns', () => {
  assert.equal(GAME_BRANDING.title, 'ELYSIA NO DENSETSU');
  assert.equal(GAME_BRANDING.worldName, 'Elysia Frontier');
  assert.equal(GAME_BRANDING.slogan, 'Become Wibu, Save the Worlds.');

  const publicDir = path.resolve(ENV.WORLD_DATA_PATH, '../..');
  const monstersJson = JSON.parse(
    fs.readFileSync(path.join(ENV.WORLD_DATA_PATH, 'monsters.json'), 'utf8')
  );
  const manifestJson = JSON.parse(
    fs.readFileSync(path.join(publicDir, 'assets/elysia/manifest.json'), 'utf8')
  );
  const manifestIds = new Set(manifestJson.assets.map((a: any) => a.id));

  assert.ok(monstersJson.length >= 80, `Expected 80+ monsters, got ${monstersJson.length}`);
  for (const m of monstersJson) {
    assert.ok(!String(m.spriteId || '').startsWith('npc_'), `${m.id} must not point to NPC spriteId`);
    assert.ok(manifestIds.has(`monsters/${m.id}`), `Manifest missing monsters/${m.id}`);
    const diskPng = path.join(publicDir, String(m.spriteAsset || '').replace(/^\//, ''));
    assert.ok(fs.existsSync(diskPng), `Missing verified disk PNG for ${m.id}: ${diskPng}`);
  }

  // Verify 3x normal spawns on training maps, 0 in Safe Cities, 1x in Starter Village Safe Zone
  const combat = new CombatService();
  assert.equal(combat.getRegionMonsters('city_elysia_capital').length, 0, 'Safe City must have 0 monsters');
  assert.equal(combat.getRegionMonsters('city_sylvaris').length, 0, 'Sylvaris Safe City must have 0 monsters');

  const meadowZones = WorldService.getInstance()
    .getSpawnPoints(false)
    .filter((z: any) => z.regionId === 'map_beginner_meadow');
  const rawBaseTotal = meadowZones.reduce((sum: number, z: any) => sum + Number(z.maxAlive || 1), 0);
  const spawnedMeadow = combat.getRegionMonsters('map_beginner_meadow');
  assert.equal(
    spawnedMeadow.length,
    rawBaseTotal * 3,
    `Expected exact 3x normal spawn count (${rawBaseTotal * 3}) in Beginner Meadow, got ${spawnedMeadow.length}`
  );

  // Starter Safe Village does NOT multiply by 3
  const noviceVillageZones = WorldService.getInstance()
    .getSpawnPoints(false)
    .filter((z: any) => z.regionId === 'THON_KHOI_NGUYEN');
  const noviceRawTotal = noviceVillageZones.reduce((sum: number, z: any) => sum + Number(z.maxAlive || 1), 0);
  assert.equal(
    combat.getRegionMonsters('THON_KHOI_NGUYEN').length,
    noviceRawTotal,
    'Starter village safe zone should remain at 1x density'
  );
});

test('Master Suite 2 — Death Penalty Tiers, Anti-Stacking Cap, Stat Reduction & Closest Discovered Checkpoint', async () => {
  await runMigrationsAndSeeds();

  const advBranchId = getAdvancedBranchesForClass('swordsman')[0].id;
  const now = 1_700_000_000_000;
  const noviceOut = computeDeathPenaltyApplication({
    character: { level: 12, exp: 1000, classId: 'adventurer', jobAdvancementCompleted: false },
    resurrectionMapId: 'THON_KHOI_NGUYEN',
    nowMs: now,
  });
  assert.equal(noviceOut.penalty?.tier, 'novice');
  assert.equal(noviceOut.penalty?.statReductionPct, 3);
  assert.equal(noviceOut.penalty?.expiresAt, now + 3600 * 1000);
  assert.equal(noviceOut.expLost, 30);
  assert.equal(noviceOut.nextExp, 970);
  assert.equal(noviceOut.nextLevel, 12);

  // Zero-floor protection (0 EXP loses 0, never de-levels)
  const floorOut = computeDeathPenaltyApplication({
    character: { level: 25, exp: 0, classId: 'swordsman', jobAdvancementCompleted: true },
    resurrectionMapId: 'city_elysia_capital',
    nowMs: now,
  });
  assert.equal(floorOut.penalty?.tier, 'first_job');
  assert.equal(floorOut.penalty?.statReductionPct, 6);
  assert.equal(floorOut.penalty?.expiresAt, now + 7200 * 1000);
  assert.equal(floorOut.expLost, 0);
  assert.equal(floorOut.nextExp, 0);
  assert.equal(floorOut.nextLevel, 25);

  const secondJobOut = computeDeathPenaltyApplication({
    character: { level: 85, exp: 2000, classId: 'swordsman', jobAdvancementCompleted: true, advancedJobId: advBranchId },
    resurrectionMapId: 'city_sylvaris',
    nowMs: now,
  });
  assert.equal(secondJobOut.penalty?.tier, 'second_job');
  assert.equal(secondJobOut.penalty?.statReductionPct, 12);
  assert.equal(secondJobOut.penalty?.expiresAt, now + 14400 * 1000);

  const thirdJobOut = computeDeathPenaltyApplication({
    character: { level: 140, exp: 5000, classId: 'swordsman', jobAdvancementCompleted: true, advancedJobId: advBranchId, evolutionTier: 4 },
    resurrectionMapId: 'city_drakhen',
    nowMs: now,
  });
  assert.equal(thirdJobOut.penalty?.tier, 'third_job');
  assert.equal(thirdJobOut.penalty?.statReductionPct, 20);
  assert.equal(thirdJobOut.penalty?.expiresAt, now + 36000 * 1000);

  // Anti-stacking: repeated deaths do NOT multiply past maxStacks (1)
  const repeatOut = computeDeathPenaltyApplication({
    character: { level: 85, exp: 500, classId: 'swordsman', jobAdvancementCompleted: true, advancedJobId: advBranchId, deathPenalty: secondJobOut.penalty },
    resurrectionMapId: 'city_sylvaris',
    nowMs: now + 5000,
  });
  assert.equal(repeatOut.penalty?.stackingCount, 1);
  assert.equal(repeatOut.penalty?.statReductionPct, 12);

  // Central statAggregator reduces ATK/DEF/MaxHP cleanly while penalty active, restores when expired
  const cleanStats = aggregateCharacterStats({
    character: { id: 'stat_chk', level: 85, classId: 'swordsman', jobAdvancementCompleted: true, advancedJobId: advBranchId, baseStats: { str: 80, dex: 40, agi: 30, int: 20, con: 50 } },
    nowMs: now,
  });
  const penalizedStats = aggregateCharacterStats({
    character: { id: 'stat_chk', level: 85, classId: 'swordsman', jobAdvancementCompleted: true, advancedJobId: advBranchId, baseStats: { str: 80, dex: 40, agi: 30, int: 20, con: 50 }, deathPenalty: secondJobOut.penalty },
    nowMs: now + 1000,
  });
  const expiredStats = aggregateCharacterStats({
    character: { id: 'stat_chk', level: 85, classId: 'swordsman', jobAdvancementCompleted: true, advancedJobId: advBranchId, baseStats: { str: 80, dex: 40, agi: 30, int: 20, con: 50 }, deathPenalty: secondJobOut.penalty },
    nowMs: now + 15000 * 1000,
  });
  assert.equal(penalizedStats.deathPenaltyApplied?.active, true);
  assert.ok(penalizedStats.secondaryStats.atk < cleanStats.secondaryStats.atk, 'Active penalty must lower ATK');
  assert.ok(penalizedStats.secondaryStats.maxHp < cleanStats.secondaryStats.maxHp, 'Active penalty must lower MaxHP');
  assert.equal(expiredStats.deathPenaltyApplied?.active, false);
  assert.equal(expiredStats.secondaryStats.atk, cleanStats.secondaryStats.atk, 'Expired penalty must restore full ATK');

  // Checkpoint resolution picks closest discovered village (never an undiscovered one!)
  const cpUndiscovered = resolveResurrectionCheckpoint(
    { discoveredVillageIds: ['THON_KHOI_NGUYEN', 'city_elysia_capital'], regionId: 'map_spirit_forest' },
    'map_spirit_forest'
  );
  assert.equal(cpUndiscovered.id, 'city_elysia_capital', 'Must choose nearest DISCOVERED village when Sylvaris is undiscovered');

  const cpDiscovered = resolveResurrectionCheckpoint(
    { discoveredVillageIds: ['THON_KHOI_NGUYEN', 'city_elysia_capital', 'city_sylvaris'], regionId: 'map_spirit_forest' },
    'map_spirit_forest'
  );
  assert.equal(cpDiscovered.id, 'city_sylvaris', 'Must choose Sylvaris once discovered near Spirit Forest');
});

test('Master Suite 3 — Normal AI State Machine, Random Elite Spawn/AI & Live F5 Sync + Checkpoint Resurrection E2E', async () => {
  await runMigrationsAndSeeds();
  const app = createApp();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*' } });
  setupGameSockets(io);

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const addr = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${addr.port}`;

  const store = JsonStore.getInstance();
  let createdCharId: string | null = null;
  let createdUserId: string | null = null;

  try {
    // 1. Guest login & progress character to Lv.18
    const guestRes = await jsonApi(baseUrl, '/api/v1/auth/guest', 'POST');
    assert.ok(guestRes.status === 200 || guestRes.status === 201, `Unexpected /auth/guest status ${guestRes.status}`);
    const token = guestRes.body.data.token;
    const charId = guestRes.body.data.character.id;
    createdCharId = charId;
    createdUserId = guestRes.body.data.account?.id || guestRes.body.data.user?.id || null;

    // Sync progressed state (Lv.18, Auto Combat prefs, Elysia Capital checkpoint discovered)
    const syncRes = await jsonApi(baseUrl, `/api/v1/characters/${charId}/sync-state`, 'POST', token, {
      level: 18,
      exp: 600,
      gold: 9500,
      skillPoints: 5,
      regionId: 'city_elysia_capital',
      visitedMaps: ['THON_KHOI_NGUYEN', 'map_beginner_meadow', 'city_elysia_capital'],
      completedQuests: ['QUEST_001_SLIME_CLEAR'],
      autoCombatConfig: {
        enabled: true,
        autoAttack: true,
        autoSkill: true,
        hpThresholdPct: 60,
        targetPriority: 'prefer_elite',
      },
    });
    assert.equal(syncRes.status, 200);
    assert.equal(syncRes.body.data.level, 18);
    assert.equal(syncRes.body.data.gold, 9500);
    assert.ok(syncRes.body.data.discoveredVillageIds.includes('city_elysia_capital'));

    // Simulate F5 Browser Reload: stale Lv.1 sync CANNOT downgrade Lv.18!
    const downgradeAttempt = await jsonApi(baseUrl, `/api/v1/characters/${charId}/sync-state`, 'POST', token, {
      level: 1,
      exp: 0,
    });
    assert.equal(downgradeAttempt.status, 200);
    assert.equal(downgradeAttempt.body.data.level, 18, 'Stale Lv.1 payload must never overwrite Lv.18 progress');

    const reloadFetch = await jsonApi(baseUrl, `/api/v1/characters/${charId}`, 'GET', token);
    assert.equal(reloadFetch.status, 200);
    assert.equal(reloadFetch.body.data.level, 18);
    assert.equal(reloadFetch.body.data.exp, 600);
    assert.equal(reloadFetch.body.data.regionId, 'city_elysia_capital');
    assert.equal(reloadFetch.body.data.autoCombatConfig.hpThresholdPct, 60);

    // Move character into map_whispering_meadow and test CombatService AI & Random Elite Spawn
    const charObj = store.characters.find((c) => c.id === charId)!;
    charObj.classId = 'swordsman';
    charObj.jobAdvancementCompleted = true;
    charObj.regionId = 'map_whispering_meadow';
    charObj.x = 744;
    charObj.y = 600;
    store.save();

    const combat = CombatService.getSharedInstance();
    const forcedElite = combat.spawnRandomEliteInRegion('map_whispering_meadow', true);
    assert.ok(forcedElite, 'Must spawn Random Elite in training map');
    assert.equal(forcedElite.isRandomElite, true);
    assert.equal(forcedElite.isElite, true);
    assert.ok(forcedElite.name.includes('Tinh Anh'));

    // Join CombatService & run AI state machine tick (CHASE -> RETURN -> IDLE + lethal death transition)
    combat.join(charObj.userId!, charId);
    const playerCombat = combat.getPlayer(charId)!;
    playerCombat.maxHp = 5000;
    playerCombat.hp = 5000;
    // Step 1: Place player inside Elite aggro range but outside melee attack range so Elite CHASES away from home
    playerCombat.x = forcedElite.originX + 140;
    playerCombat.y = forcedElite.originY;
    const chaseResult = combat.tickAi(500, 'map_whispering_meadow');
    assert.ok(chaseResult.monsterUpdates.length > 0, 'AI tick should drive monsters in occupied region');
    const chasedElite = combat.getRegionMonsters('map_whispering_meadow').find((m) => m.id === forcedElite.id);
    assert.ok(
      chasedElite && (chasedElite.aiState === 'CHASE' || chasedElite.aiState === 'ATTACK' || chasedElite.aiState === 'DETECT'),
      `Expected active AI engage state for nearby Elite, got ${chasedElite?.aiState}`
    );
    // Ensure the Elite physically moved beyond the 16px home snap threshold before testing leash RETURN
    if (Math.hypot(forcedElite.x - forcedElite.originX, forcedElite.y - forcedElite.originY) <= 18) {
      combat.tickAi(500, 'map_whispering_meadow');
    }

    // Step 2: Move player beyond leash distance -> next tick transitions to RETURN
    playerCombat.x = forcedElite.originX + 1200;
    combat.tickAi(500, 'map_whispering_meadow');
    const returnedElite = combat.getRegionMonsters('map_whispering_meadow').find((m) => m.id === forcedElite.id);
    assert.equal(returnedElite?.aiState, 'RETURN');

    // Step 3: Advance ticks until Elite arrives back at home origin -> IDLE
    for (let i = 0; i < 16; i += 1) {
      combat.tickAi(500, 'map_whispering_meadow');
      const snap = combat.getRegionMonsters('map_whispering_meadow').find((m) => m.id === forcedElite.id);
      if (snap?.aiState === 'IDLE') break;
    }
    const idleElite = combat.getRegionMonsters('map_whispering_meadow').find((m) => m.id === forcedElite.id);
    assert.equal(idleElite?.aiState, 'IDLE');

    // Step 4: Place 1 HP player (0 evasion) in melee range and verify server AI lethal hit triggers playerDeaths without level reset
    playerCombat.x = (idleElite?.x ?? forcedElite.x) + 24;
    playerCombat.y = idleElite?.y ?? forcedElite.y;
    playerCombat.hp = 1;
    playerCombat.evasionPct = 0;
    playerCombat.dead = false;
    let lethalTick = combat.tickAi(500, 'map_whispering_meadow');
    for (let retry = 0; retry < 4 && lethalTick.playerDeaths.length === 0; retry += 1) {
      // Wait past 700ms monster attack cooldown only if an RNG miss occurred
      await new Promise((r) => setTimeout(r, 760));
      lethalTick = combat.tickAi(500, 'map_whispering_meadow');
    }
    assert.ok(lethalTick.playerDeaths.length > 0, 'Lethal AI attack must record player death event');
    assert.equal(playerCombat.dead, true);
    assert.equal(charObj.level, 18, 'Lethal AI hit must never reset level to 1');
    combat.leave(charId);

    // Test server-authoritative Death Penalty & Checkpoint Resurrection
    const fatalRes = await jsonApi(baseUrl, `/api/v1/characters/${charId}/death`, 'POST', token, {
      killerName: forcedElite.name,
      reason: 'Elite smash',
    });
    assert.equal(fatalRes.status, 200);
    assert.equal(fatalRes.body.data.character.level, 18, 'Death must NEVER reset level to 1');
    assert.equal(fatalRes.body.data.character.classId, 'swordsman', 'Death must preserve classId');
    assert.equal(fatalRes.body.data.penalty.tier, 'first_job');
    assert.equal(fatalRes.body.data.penalty.statReductionPct, 6);
    assert.equal(fatalRes.body.data.checkpoint.id, 'city_elysia_capital');

    const reviveRes = await jsonApi(baseUrl, `/api/v1/characters/${charId}/resurrect`, 'POST', token, {});
    assert.equal(reviveRes.status, 200);
    assert.equal(reviveRes.body.data.character.regionId, 'city_elysia_capital');
    assert.equal(reviveRes.body.data.character.level, 18);
    assert.equal(reviveRes.body.data.penaltyState.active, true);
    assert.equal(reviveRes.body.data.penaltyState.statReductionPct, 6);

    // Verify Operations Config + Persistence Monitor Admin endpoints
    const opsGet = await jsonApi(baseUrl, '/api/v1/admin/operations-config', 'GET');
    assert.equal(opsGet.status, 200);
    assert.equal(opsGet.body.data.normalSpawnMultiplier, 3);

    const monitorRes = await jsonApi(baseUrl, '/api/v1/admin/persistence-monitor', 'GET');
    assert.equal(monitorRes.status, 200);
    assert.ok(monitorRes.body.data.characters.some((c: any) => c.id === charId && c.level === 18));

    const recoverRes = await jsonApi(baseUrl, `/api/v1/admin/persistence/${charId}/recover`, 'POST');
    assert.equal(recoverRes.status, 200);
    assert.equal(recoverRes.body.data.character.level, 18);

    const gameCfg = await jsonApi(baseUrl, '/api/v1/game/config', 'GET');
    assert.equal(gameCfg.status, 200);
    assert.equal(gameCfg.body.data.branding.title, 'ELYSIA NO DENSETSU');
    assert.equal(gameCfg.body.data.branding.slogan, 'Become Wibu, Save the Worlds.');
  } finally {
    if (createdCharId) {
      const idx = store.characters.findIndex((c) => c.id === createdCharId);
      if (idx >= 0) store.characters.splice(idx, 1);
    }
    if (createdUserId) {
      const uidx = store.users.findIndex((u) => u.id === createdUserId);
      if (uidx >= 0) store.users.splice(uidx, 1);
    }
    store.save();
    io.close();
    server.close();
  }
});
