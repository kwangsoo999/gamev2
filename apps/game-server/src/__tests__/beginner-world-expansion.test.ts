import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { computeLevelAdjustedExp, DEFAULT_EXP_BALANCE_CONFIG } from '@elysia/game-data-schema';
import { createApp } from '../app.js';
import { ENV } from '../config/env.js';
import { JsonStore } from '../database/jsonStore.js';
import { runMigrationsAndSeeds } from '../database/migrations.js';
import { CharacterService } from '../services/character.service.js';
import { CombatService } from '../services/combat.service.js';
import { QuestTitleService } from '../services/quest-title.service.js';
import { WorldAdminService } from '../services/world-admin.service.js';
import { WorldService } from '../services/world.service.js';

const BEGINNER_MAP_CHAIN = [
  'THON_KHOI_NGUYEN',
  'map_beginner_meadow',
  'map_green_rabbit_forest',
  'map_ancient_bee_forest',
  'map_wild_wolf_valley',
  'map_wild_boar_forest',
  'map_goblin_outpost',
  'map_goblin_cave',
];

const BEGINNER_MONSTER_IDS = [
  'mon_green_slime',
  'mon_red_slime',
  'mon_forest_rabbit',
  'mon_one_horned_rabbit',
  'mon_elite_rabbit',
  'mon_hardwing_bee',
  'mon_guardian_bee',
  'mon_elite_bee',
  'mon_wild_wolf',
  'mon_elite_wolf',
  'mon_blood_wolf',
  'mon_wild_boar',
  'mon_elite_boar',
  'mon_outpost_goblin',
  'mon_goblin_warrior',
  'mon_elite_goblin',
  'boss_goblin_chieftain',
];

function readWorldJson(fileName: string): any {
  const fullPath = path.join(ENV.WORLD_DATA_PATH, fileName);
  return JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
}

function makeTestCharacter(store: JsonStore, overrides: Record<string, any> = {}): any {
  const id = `CHAR_BEG_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const char: any = {
    id,
    userId: `USR_BEG_${id.slice(-4)}`,
    name: `Novice_${id.slice(-4)}`,
    gender: 'female',
    classId: 'adventurer',
    level: 1,
    exp: 0,
    gold: 1000,
    hp: 600,
    maxHp: 600,
    mp: 300,
    maxMp: 300,
    baseStats: { str: 18, dex: 12, agi: 12, int: 10, con: 14 },
    attributes: { str: 18, dex: 12, agi: 12, int: 10, con: 14 },
    availableAttributePoints: 3,
    skillPoints: 1,
    unlockedSkills: ['skill_basic_strike'],
    skillLevels: { skill_basic_strike: 1 },
    equipment: {},
    inventory: [],
    completedQuests: [],
    activeQuests: {},
    discoveredHiddenQuests: [],
    questChainProgress: {},
    visitedMaps: ['THON_KHOI_NGUYEN'],
    monsterKillCounts: {},
    dialogueFlags: [],
    ownedUniqueEquipmentIds: [],
    unlockedTitles: [],
    equippedCosmeticTitleId: null,
    claimedRewardKeys: [],
    regionId: 'THON_KHOI_NGUYEN',
    x: 552,
    y: 984,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
  store.characters.push(char);
  store.save();
  return char;
}

function cleanupChar(store: JsonStore, charId: string) {
  const idx = store.characters.findIndex((c) => c.id === charId);
  if (idx >= 0) {
    store.characters.splice(idx, 1);
    store.save();
  }
}

function getRuntimeMonster(combat: CombatService, instanceId: string): any {
  return (combat as any).monsters.get(instanceId);
}

function killMonsterViaCombat(combat: CombatService, charId: string, monster: any): any {
  const player = combat.getPlayer(charId)!;
  player.x = monster.x;
  player.y = monster.y;
  player.hp = player.maxHp;
  player.mp = player.maxMp;
  player.cooldowns.clear();

  let res: any = null;
  let guard = 0;
  while (guard++ < 50) {
    player.cooldowns.clear();
    player.hp = player.maxHp;
    res = combat.attack(charId, { actionType: 'basic_attack', targetId: monster.id });
    if (!res.monster.alive) break;
  }
  assert.equal(res?.monster?.alive, false, `Failed to slay ${monster.monsterId} within 50 hits`);
  return res;
}

test.before(async () => {
  await runMigrationsAndSeeds();
});

test('1. Data Integrity, Zero Duplicate IDs & Verified Map/Minimap/Sprite Files on Disk', () => {
  const clientPublicDir = path.resolve(ENV.WORLD_DATA_PATH, '../..');

  const maps = readWorldJson('maps.json');
  const connections = readWorldJson('connections.json');
  const monsters = readWorldJson('monsters.json');
  const spawnZones = readWorldJson('monster_spawn_zones.json');
  const dropTables = readWorldJson('drop_tables.json');
  const expTables = readWorldJson('exp_tables.json');
  const bossConfigs = readWorldJson('boss_config.json');
  const uniqueEquip = readWorldJson('unique_equipment.json');
  const titles = readWorldJson('titles.json');

  const assertNoDuplicates = (rows: any[], key: string, label: string) => {
    const seen = new Set<string>();
    for (const r of rows) {
      const id = String(r[key]);
      assert.ok(id && id !== 'undefined', `${label} missing ${key}`);
      assert.equal(seen.has(id), false, `Duplicate ${label} ID detected: ${id}`);
      seen.add(id);
    }
    return seen;
  };

  const mapIds = assertNoDuplicates(maps, 'id', 'maps.json');
  assertNoDuplicates(connections, 'id', 'connections.json');
  assertNoDuplicates(monsters, 'id', 'monsters.json');
  assertNoDuplicates(spawnZones, 'id', 'monster_spawn_zones.json');
  const dropIds = assertNoDuplicates(dropTables, 'tableId', 'drop_tables.json');
  assertNoDuplicates(expTables, 'level', 'exp_tables.json');
  assertNoDuplicates(bossConfigs, 'monsterId', 'boss_config.json');
  assertNoDuplicates(uniqueEquip, 'id', 'unique_equipment.json');
  const titleIds = assertNoDuplicates(titles, 'id', 'titles.json');

  // Verify 7 new Beginner Maps + existing 10 EXP_FIELD maps stay intact (>=24 total maps)
  const beginnerMaps = maps.filter((m: any) => m.type === 'BEGINNER_FIELD');
  const expFields = maps.filter((m: any) => m.type === 'EXP_FIELD');
  assert.equal(beginnerMaps.length, 7, `Expected 7 BEGINNER_FIELD maps, got ${beginnerMaps.length}`);
  assert.equal(expFields.length, 10, `Expected 10 EXP_FIELD maps preserved, got ${expFields.length}`);
  assert.ok(maps.length >= 24);

  for (const mapId of BEGINNER_MAP_CHAIN) {
    assert.ok(mapIds.has(mapId), `Missing beginner map ${mapId}`);
  }

  // Verify ALL maps have valid clientMapFile + minimapImage on disk
  for (const m of maps) {
    if (m.clientMapFile) {
      const mapFilePath = path.join(clientPublicDir, m.clientMapFile.replace(/^\//, ''));
      assert.equal(fs.existsSync(mapFilePath), true, `Missing client map JSON: ${mapFilePath}`);
      const parsedMap = JSON.parse(fs.readFileSync(mapFilePath, 'utf-8'));
      assert.ok(parsedMap.layers?.ground && parsedMap.layers?.collision, `${m.id} lacks tiled ground/collision`);
    }
    if (m.minimapImage) {
      const mmPath = path.join(clientPublicDir, m.minimapImage.replace(/^\//, ''));
      assert.equal(fs.existsSync(mmPath), true, `Missing minimap PNG: ${mmPath}`);
    }
  }

  // Verify Novice Village North Exit connects to map_beginner_meadow
  const noviceMapJson = JSON.parse(
    fs.readFileSync(path.join(clientPublicDir, 'data/maps/thon_khoi_nguyen.json'), 'utf-8')
  );
  const northExit = (noviceMapJson.exits || []).find((e: any) => e.id === 'CONN_NOVICE_TO_BEG_MEADOW');
  assert.ok(northExit, 'Novice Village missing CONN_NOVICE_TO_BEG_MEADOW exit');
  assert.equal(northExit.targetRegion, 'map_beginner_meadow');

  // Verify all 17 Beginner Monsters + drop table + sprite thumbnail PNG on disk
  for (const monId of BEGINNER_MONSTER_IDS) {
    const mon = monsters.find((x: any) => x.id === monId);
    assert.ok(mon, `Missing monster definition: ${monId}`);
    assert.ok(mon.nameVi, `${monId} missing nameVi`);
    assert.ok(dropIds.has(mon.dropTableId), `${monId} missing dropTable ${mon.dropTableId}`);
    const thumbPath = path.join(clientPublicDir, `assets/elysia/monsters/${monId}.png`);
    assert.equal(fs.existsSync(thumbPath), true, `Missing monster sprite PNG: ${thumbPath}`);
  }

  // Verify new Boss Portraits & Beginner Titles
  for (const portrait of ['portrait-blood-wolf.png', 'portrait-goblin-chieftain.png']) {
    const p = path.join(clientPublicDir, 'assets/elysia/ui', portrait);
    assert.equal(fs.existsSync(p), true, `Missing boss portrait: ${p}`);
  }
  for (const tid of ['TITLE_SLIME_HUNTER', 'TITLE_BEAST_TAMER', 'TITLE_GOBLIN_CHIEFTAIN_SLAYER']) {
    assert.ok(titleIds.has(tid), `Missing beginner title ${tid}`);
  }

  // Verify Quest/Title cross-reference validator passes with 0 errors
  const integrity = QuestTitleService.getInstance().validateAllDataReferences();
  assert.equal(integrity.valid, true, `Reference errors: ${integrity.errors.join('; ')}`);
});

function warpThroughPortal(combat: CombatService, charId: string, toRegionId: string) {
  const player = combat.getPlayer(charId)!;
  const conn = (WorldService.getInstance().getConnections() || []).find(
    (c: any) => c.enabled !== false && c.fromRegionId === player.regionId && c.toRegionId === toRegionId
  );
  assert.ok(conn, `Missing connection ${player.regionId} -> ${toRegionId}`);
  player.x = Number(conn.portalX);
  player.y = Number(conn.portalY);
  return combat.changeRegion(charId, toRegionId);
}

test('2. Lv.1-15 Linear Traversal, Level-Gated Portals & Dispersed Multi-Zone Monster Spawns', () => {
  const store = JsonStore.getInstance();
  const combat = new CombatService();
  const char = makeTestCharacter(store, { level: 1, regionId: 'THON_KHOI_NGUYEN' });

  try {
    const joined = combat.join(char.userId, char.id);
    assert.equal(joined.snapshot.regionId, 'THON_KHOI_NGUYEN');

    // Novice Village is Lv.1 starting hub; major Safe Cities spawn 0 mobs
    assert.ok(WorldService.getInstance().getMapById('THON_KHOI_NGUYEN', false), 'THON_KHOI_NGUYEN exists');
    assert.equal(combat.getRegionMonsters('city_elysia_capital').length, 0, 'Safe city must not spawn hostile mobs');

    // Cannot jump directly across disconnected maps
    assert.throws(
      () => combat.changeRegion(char.id, 'map_goblin_cave'),
      /Không có cổng kết nối/
    );

    // Progress linearly Lv.1 -> Lv.15 across all 7 beginner maps and back to Novice Village
    const targetLevels = [1, 1, 3, 5, 7, 9, 11, 13];
    for (let i = 1; i < BEGINNER_MAP_CHAIN.length; i++) {
      const mapId = BEGINNER_MAP_CHAIN[i];
      const player = combat.getPlayer(char.id)!;

      // Before bumping to Lv.3, verify Lv.1 player standing at Meadow East gate cannot enter Lv.3+ Rabbit Forest
      if (mapId === 'map_green_rabbit_forest') {
        assert.throws(() => warpThroughPortal(combat, char.id, mapId), /Cấp độ chưa đủ/);
      }

      player.character.level = targetLevels[i];
      const snap = warpThroughPortal(combat, char.id, mapId);
      assert.equal(snap.regionId, mapId);

      const spawned = combat.getRegionMonsters(mapId);
      assert.ok(spawned.length >= 4, `${mapId} should spawn >=4 monsters, got ${spawned.length}`);

      // Verify dispersed spawn coordinates (not all stacked on one single point)
      const uniqueCoords = new Set(
        spawned.map((m) => {
          const rt = getRuntimeMonster(combat, m.id);
          return `${Math.round((rt?.spawnOriginX ?? m.x) / 48)}:${Math.round((rt?.spawnOriginY ?? m.y) / 48)}`;
        })
      );
      assert.ok(uniqueCoords.size >= 2, `${mapId} monsters must spawn across dispersed zones`);

      // Verify maxAlive per spawnZone respected
      const byZone = new Map<string, number>();
      for (const m of spawned) {
        const rt = getRuntimeMonster(combat, m.id);
        if (rt?.spawnZoneId) byZone.set(rt.spawnZoneId, (byZone.get(rt.spawnZoneId) || 0) + 1);
      }
      const ops = WorldService.getInstance().getOperationsConfig();
      const allMonsters = WorldService.getInstance().getMonsters(false);
      const zones = WorldService.getInstance().getSpawnPoints(false).filter((z: any) => z.regionId === mapId);
      for (const z of zones) {
        const def = allMonsters.find((d: any) => d.id === z.monsterId);
        const isNormal = def && !def.isBoss && !def.isElite && def.category !== 'ELITE' && def.category !== 'MINI_BOSS' && def.category !== 'FIELD_BOSS' && def.category !== 'WORLD_BOSS';
        const cap = Math.min(36, Number(z.maxAlive || z.count || 6) * (isNormal ? ops.normalSpawnMultiplier : 1));
        assert.ok((byZone.get(z.id) || 0) <= cap, `Zone ${z.id} exceeded scaled maxAlive (${cap})`);
      }
    }

    // Traverse back from Goblin Cave East portal to Novice Village
    const backHome = warpThroughPortal(combat, char.id, 'THON_KHOI_NGUYEN');
    assert.equal(backHome.regionId, 'THON_KHOI_NGUYEN');
  } finally {
    combat.leave(char.id);
    cleanupChar(store, char.id);
  }
});

test('3. Balanced EXP Scaling, Gold Rewards & Admin Global Multipliers', () => {
  // Pure formula unit assertions
  const cfg = DEFAULT_EXP_BALANCE_CONFIG;
  assert.equal(computeLevelAdjustedExp(100, 10, 10, cfg), 100, 'Equal level -> 100% EXP');
  assert.equal(computeLevelAdjustedExp(100, 12, 10, cfg), 100, 'Within grace diff -> 100% EXP');
  const highLvlPenalty = computeLevelAdjustedExp(100, 25, 2, cfg);
  assert.equal(highLvlPenalty, 25, 'Over-leveled hunting hits 25% min floor instead of zero');
  const underdogBonus = computeLevelAdjustedExp(100, 5, 10, cfg);
  assert.ok(underdogBonus > 100 && underdogBonus <= 125, `Higher-level mob grants bonus <=125, got ${underdogBonus}`);

  const boosted = computeLevelAdjustedExp(100, 10, 10, { ...cfg, expMultiplier: 2.0 });
  assert.equal(boosted, 200, 'Global 2.0x EXP multiplier doubles awarded EXP');

  // Live CombatService integration test
  const store = JsonStore.getInstance();
  const world = WorldService.getInstance();
  const combat = new CombatService();
  const originalCfg = { ...world.getExpBalanceConfig() };
  const char = makeTestCharacter(store, {
    level: 1,
    exp: 0,
    gold: 0,
    baseStats: { str: 40, dex: 20, agi: 18, int: 10, con: 20 },
    regionId: 'map_beginner_meadow',
    x: 480,
    y: 480,
  });

  try {
    combat.join(char.userId, char.id);
    const mobs = combat.getRegionMonsters('map_beginner_meadow');
    const slimeA = mobs.find((m) => m.monsterId === 'mon_green_slime' && m.alive)!;
    assert.ok(slimeA, 'mon_green_slime should exist in map_beginner_meadow');

    const kill1 = killMonsterViaCombat(combat, char.id, slimeA);
    assert.ok((kill1.rewards?.exp ?? 0) > 0, 'Kill must grant EXP');
    assert.ok((kill1.rewards?.gold ?? 0) > 0, 'Kill must grant Gold');

    // Update global multipliers to 2.0x EXP & 2.0x Gold via WorldService
    world.updateExpBalanceConfig({ expMultiplier: 2.0, goldMultiplier: 2.0 });
    const player = combat.getPlayer(char.id)!;
    player.character.level = 1;
    player.character.exp = 0;

    const slimeB = combat
      .getRegionMonsters('map_beginner_meadow')
      .find((m) => m.monsterId === 'mon_green_slime' && m.alive)!;
    assert.ok(slimeB);
    const kill2 = killMonsterViaCombat(combat, char.id, slimeB);
    assert.ok(
      kill2.rewards.exp >= kill1.rewards.exp * 1.9,
      `2.0x EXP multiplier should ~double EXP (${kill1.rewards.exp} -> ${kill2.rewards.exp})`
    );
  } finally {
    world.updateExpBalanceConfig(originalCfg);
    combat.leave(char.id);
    cleanupChar(store, char.id);
  }
});

test('4. Tiered Respawn Timers (Normal/Elite/MiniBoss/FieldBoss), Elite Drops & Goblin Chieftain Boss Title/Unique', () => {
  const store = JsonStore.getInstance();
  const combat = new CombatService();
  const qt = QuestTitleService.getInstance();
  const charSvc = new CharacterService();

  // High-stat tester to solo Normal, Elite, Mini Boss & Field Boss reliably
  const char = makeTestCharacter(store, {
    level: 15,
    baseStats: { str: 360, dex: 120, agi: 120, int: 50, con: 250 },
    regionId: 'map_beginner_meadow',
  });

  try {
    combat.join(char.userId, char.id);

    // A. Normal mob respawn (6-10s)
    const normalMob = combat.getRegionMonsters('map_beginner_meadow').find((m) => m.monsterId === 'mon_green_slime' && m.alive)!;
    killMonsterViaCombat(combat, char.id, normalMob);
    const normalRt = getRuntimeMonster(combat, normalMob.id);
    const normalDelaySec = ((normalRt?.respawnAt || 0) - Date.now()) / 1000;
    assert.ok(normalDelaySec >= 4 && normalDelaySec <= 15, `Normal respawn expected 4-15s, got ${normalDelaySec}s`);

    // Fast-forward respawn and verify combat.tick() brings it back alive
    normalRt.respawnAt = Date.now() - 50;
    const respawned = combat.tick();
    assert.ok(respawned.some((m) => m.id === normalMob.id), 'combat.tick() should respawn expired monster');
    assert.equal(normalRt.alive, true);

    // B. Elite monster respawn (70s) & stronger EXP/Drop rewards than normal mobs
    warpThroughPortal(combat, char.id, 'map_green_rabbit_forest');
    const forestRabbit = combat
      .getRegionMonsters('map_green_rabbit_forest')
      .find((m) => m.monsterId === 'mon_forest_rabbit' && m.alive)!;
    const normalRabbitKill = killMonsterViaCombat(combat, char.id, forestRabbit);
    const eliteRabbit = combat
      .getRegionMonsters('map_green_rabbit_forest')
      .find((m) => m.monsterId === 'mon_elite_rabbit' && m.alive)!;
    assert.ok(eliteRabbit, 'mon_elite_rabbit must spawn in Green Rabbit Forest');
    const eliteKill = killMonsterViaCombat(combat, char.id, eliteRabbit);
    assert.ok(
      (eliteKill.rewards?.exp ?? 0) >= (normalRabbitKill.rewards?.exp ?? 1) * 2.5,
      `Elite EXP (${eliteKill.rewards?.exp}) should vastly exceed normal EXP (${normalRabbitKill.rewards?.exp})`
    );
    const eliteDropTable = readWorldJson('drop_tables.json').find((d: any) => d.tableId === 'DROP_MON_ELITE_RABBIT');
    assert.ok(eliteDropTable.drops.some((e: any) => e.itemId === 'ITEM_UPGRADE_STONE_BASIC'));
    assert.ok(eliteDropTable.drops.some((e: any) => e.rarity === 'uncommon' || e.rarity === 'rare'));
    const eliteRt = getRuntimeMonster(combat, eliteRabbit.id);
    const eliteDelaySec = ((eliteRt?.respawnAt || 0) - Date.now()) / 1000;
    assert.ok(eliteDelaySec >= 55 && eliteDelaySec <= 120, `Elite respawn expected 55-120s, got ${eliteDelaySec}s`);

    // C. Walk through Bee Forest -> Wolf Valley and check Mini Boss Huyết Lang respawn (300s)
    warpThroughPortal(combat, char.id, 'map_ancient_bee_forest');
    warpThroughPortal(combat, char.id, 'map_wild_wolf_valley');
    const bloodWolf = combat
      .getRegionMonsters('map_wild_wolf_valley')
      .find((m) => m.monsterId === 'mon_blood_wolf' && m.alive)!;
    assert.ok(bloodWolf, 'mon_blood_wolf Mini Boss must spawn in Wild Wolf Valley');
    killMonsterViaCombat(combat, char.id, bloodWolf);
    const miniRt = getRuntimeMonster(combat, bloodWolf.id);
    const miniDelaySec = ((miniRt?.respawnAt || 0) - Date.now()) / 1000;
    assert.ok(miniDelaySec >= 240 && miniDelaySec <= 360, `Mini Boss respawn expected ~300s, got ${miniDelaySec}s`);

    // D. Walk through Boar Forest -> Goblin Outpost -> Goblin Cave and defeat Field Boss Goblin Thủ Lĩnh
    warpThroughPortal(combat, char.id, 'map_wild_boar_forest');
    warpThroughPortal(combat, char.id, 'map_goblin_outpost');
    warpThroughPortal(combat, char.id, 'map_goblin_cave');
    const chieftain = combat
      .getRegionMonsters('map_goblin_cave')
      .find((m) => m.monsterId === 'boss_goblin_chieftain' && m.alive)!;
    assert.ok(chieftain, 'boss_goblin_chieftain must spawn in Goblin Cave');

    const statsBeforeBoss = charSvc.getComputedStatsSummary(char.id).computed.atk;
    killMonsterViaCombat(combat, char.id, chieftain);
    const chieftainRt = getRuntimeMonster(combat, chieftain.id);
    const bossDelaySec = ((chieftainRt?.respawnAt || 0) - Date.now()) / 1000;
    assert.ok(bossDelaySec >= 800 && bossDelaySec <= 960, `Field Boss respawn expected ~900s, got ${bossDelaySec}s`);

    // Guaranteed war orders drop
    assert.ok(
      char.inventory.some((it: any) => it.itemId === 'ITEM_GOBLIN_WAR_ORDERS'),
      'Slaying Goblin Chieftain must guarantee ITEM_GOBLIN_WAR_ORDERS drop'
    );

    // Title auto-unlocks permanently without cosmetic equip & stacks ATK
    assert.ok(
      char.unlockedTitles.includes('TITLE_GOBLIN_CHIEFTAIN_SLAYER'),
      `Expected TITLE_GOBLIN_CHIEFTAIN_SLAYER auto-unlocked, got ${JSON.stringify(char.unlockedTitles)}`
    );
    assert.equal(char.equippedCosmeticTitleId, null);
    const statsAfterBoss = charSvc.getComputedStatsSummary(char.id).computed.atk;
    assert.ok(statsAfterBoss > statsBeforeBoss, `Title must boost ATK automatically (${statsBeforeBoss} -> ${statsAfterBoss})`);

    // Boss Unique Crest non-repeatability check
    if (!char.ownedUniqueEquipmentIds.includes('UEQ_GOBLIN_CHIEFTAIN_CREST')) {
      const granted = qt.grantUniqueEquipment(char.id, 'UEQ_GOBLIN_CHIEFTAIN_CREST');
      assert.equal(granted.success, true);
    }
    assert.throws(
      () => qt.grantUniqueEquipment(char.id, 'UEQ_GOBLIN_CHIEFTAIN_CREST'),
      /đã nhận|Không thể nhận trùng lặp/
    );

    // E. Verify Slime Hunter & Beast Tamer auto-unlock thresholds
    char.monsterKillCounts.mon_green_slime = 12;
    char.monsterKillCounts.mon_red_slime = 8;
    char.monsterKillCounts.mon_wild_wolf = 10;
    char.monsterKillCounts.mon_wild_boar = 10;
    const newlyUnlocked = qt.evaluateTitleUnlocks(char);
    assert.ok(
      newlyUnlocked.some((t) => t.id === 'TITLE_SLIME_HUNTER') || char.unlockedTitles.includes('TITLE_SLIME_HUNTER'),
      'TITLE_SLIME_HUNTER must auto-unlock at 20 slimes'
    );
    assert.ok(
      newlyUnlocked.some((t) => t.id === 'TITLE_BEAST_TAMER') || char.unlockedTitles.includes('TITLE_BEAST_TAMER'),
      'TITLE_BEAST_TAMER must auto-unlock at 20 beasts'
    );
  } finally {
    combat.leave(char.id);
    cleanupChar(store, char.id);
  }
});

test('5. HTTP API & Admin Lifecycle (Draft -> Testing -> Published), Version History & Rollback', async () => {
  const app = createApp();
  const server = app.listen(0);
  const addr: any = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  const world = WorldService.getInstance();
  const worldAdmin = new WorldAdminService();
  const originalExpCfg = { ...world.getExpBalanceConfig() };
  const tempZoneId = `ZONE_VERIFY_${Date.now().toString(36)}`;

  try {
    // Public game endpoints return 200 without 404
    for (const ep of [
      '/api/v1/game/maps',
      '/api/v1/game/monsters',
      '/api/v1/game/spawn-zones',
      '/api/v1/game/exp-balance',
      '/api/v1/game/drop-tables',
      '/api/v1/game/boss-configs',
      '/api/v1/game/exp-tables',
    ]) {
      const res = await fetch(`${baseUrl}${ep}`);
      assert.equal(res.status, 200, `Expected 200 from ${ep}, got ${res.status}`);
      const json: any = await res.json();
      assert.equal(json.success, true);
    }

    // Admin EXP Balance PATCH & restore
    const patchCfgRes = await fetch(`${baseUrl}/api/v1/admin/world/exp-balance`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expMultiplier: 1.75 }),
    });
    assert.equal(patchCfgRes.status, 200);
    const patchCfgJson: any = await patchCfgRes.json();
    assert.equal(patchCfgJson.data.expMultiplier, 1.75);

    // Spawn Zone Draft -> Testing -> Published -> Edit -> Version History -> Rollback
    const createRes = await fetch(`${baseUrl}/api/v1/admin/world/spawn_zones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: tempZoneId,
        regionId: 'map_beginner_meadow',
        monsterId: 'mon_green_slime',
        name: 'Verify Temp Spawn Zone',
        zoneTier: 'entrance',
        x: 640,
        y: 640,
        radius: 90,
        maxAlive: 3,
        respawnTime: 8,
      }),
    });
    assert.equal(createRes.status, 201);

    // Draft hidden from live game
    assert.equal(world.getSpawnPoints(false).some((z: any) => z.id === tempZoneId), false, 'Draft must not be live');

    // Transition to testing (still hidden from live, visible in admin)
    const testRes = await fetch(`${baseUrl}/api/v1/admin/world/spawn_zones/${tempZoneId}/testing`, { method: 'POST' });
    assert.equal(testRes.status, 200);
    assert.equal(world.getSpawnPoints(false).some((z: any) => z.id === tempZoneId), false, 'Testing must stay isolated');
    assert.equal(world.getSpawnPoints(true).some((z: any) => z.id === tempZoneId), true);

    // Transition to published -> immediately live
    const pubRes = await fetch(`${baseUrl}/api/v1/admin/world/spawn_zones/${tempZoneId}/publish`, { method: 'POST' });
    assert.equal(pubRes.status, 200);
    assert.equal(world.getSpawnPoints(false).some((z: any) => z.id === tempZoneId), true, 'Published must go live');

    // Update maxAlive from 3 -> 7
    const updRes = await fetch(`${baseUrl}/api/v1/admin/world/spawn_zones/${tempZoneId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxAlive: 7 }),
    });
    assert.equal(updRes.status, 200);
    assert.equal(((await updRes.json()) as any).data.maxAlive, 7);

    // Fetch versions & rollback to first snapshot (maxAlive: 3)
    const verRes = await fetch(`${baseUrl}/api/v1/admin/world/spawn_zones/${tempZoneId}/versions`);
    assert.equal(verRes.status, 200);
    const verJson: any = await verRes.json();
    assert.ok(Array.isArray(verJson.data) && verJson.data.length >= 2, 'Expected >=2 version snapshots');
    const firstVer = verJson.data.find((v: any) => v.snapshot?.maxAlive === 3);
    assert.ok(firstVer, 'Expected a version snapshot with maxAlive=3');

    const rbRes = await fetch(`${baseUrl}/api/v1/admin/world/spawn_zones/${tempZoneId}/rollback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: firstVer.version }),
    });
    assert.equal(rbRes.status, 200);
    const rbJson: any = await rbRes.json();
    assert.equal(rbJson.data.maxAlive, 3, 'Rollback must restore maxAlive=3');
  } finally {
    try {
      worldAdmin.remove('spawn_zones', tempZoneId);
    } catch {
      // ignore if creation failed early
    }
    world.updateExpBalanceConfig(originalExpCfg);
    world.invalidateCache();
    server.close();
  }
});
