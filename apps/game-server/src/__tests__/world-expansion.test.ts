import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'http';
import { createApp } from '../app.js';
import { JsonStore } from '../database/jsonStore.js';
import { runMigrationsAndSeeds } from '../database/migrations.js';
import { WorldService } from '../services/world.service.js';
import { CombatService } from '../services/combat.service.js';
import { DungeonService } from '../services/dungeon.service.js';
import { JobService } from '../services/job.service.js';
import { WorldAdminService } from '../services/world-admin.service.js';
import { computeExpRequiredForLevel, FIRST_JOB_CLASS_IDS } from '@elysia/game-data-schema';

function makeTestCharacter(store: JsonStore, overrides: Record<string, any> = {}) {
  const id = `CHAR_TEST_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const char = {
    id,
    userId: 'USR_PLAYER_001',
    name: `Hero_${id.slice(-4)}`,
    gender: 'female',
    classId: 'novice',
    level: 1,
    exp: 0,
    gold: 1000,
    baseStats: { str: 12, dex: 12, agi: 12, int: 12, con: 12 },
    attributes: { str: 14, dex: 13, agi: 12, int: 12, con: 14 },
    equipment: {},
    inventory: [],
    regionId: 'THON_KHOI_NGUYEN',
    x: 552,
    y: 984,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
  store.characters.push(char);
  return char;
}

test.before(async () => {
  await runMigrationsAndSeeds();
});

test('World Data: 3 Safe-Zone Cities, 10 EXP Training Maps, 38+ Monsters, Lv.1-110 EXP Table', () => {
  const world = WorldService.getInstance();
  const cities = world.getCities(false);
  const maps = world.getMaps(false);
  const monsters = world.getMonsters(false);
  const expTable = world.getExpTables();
  const connections = world.getConnections();

  assert.equal(cities.length, 3, 'Should define exactly 3 major cities');
  assert.deepEqual(
    cities.map((c: any) => c.id),
    ['city_elysia_capital', 'city_sylvaris', 'city_drakhen']
  );
  for (const city of cities) {
    assert.equal(city.isSafeZone, true);
    assert.equal(city.combatEnabled, false);
    assert.equal(city.monsterSpawningEnabled, false);
  }

  const expMaps = maps.filter((m: any) => m.type === 'EXP_FIELD');
  assert.equal(expMaps.length, 10, 'Should define 10 EXP training maps');
  assert.ok(monsters.length >= 30, `Expected >= 30 monsters, found ${monsters.length}`);

  for (const mon of monsters) {
    assert.ok(mon.id && mon.name && mon.internalName);
    assert.ok(mon.hp > 0 && mon.expReward > 0 && mon.goldReward >= 0);
    assert.ok(mon.spawnCount > 0 && Array.isArray(mon.spawnCoordinates) && mon.spawnCoordinates.length > 0);
    assert.ok(mon.dropTableId && mon.aiBehavior && mon.element);
  }

  assert.equal(expTable.length, 110);
  for (let lvl = 1; lvl <= 109; lvl++) {
    assert.equal(expTable[lvl - 1].expRequired, computeExpRequiredForLevel(lvl));
    assert.ok(expTable[lvl].expRequired > expTable[lvl - 1].expRequired, `EXP must rise strictly at Lv.${lvl}`);
  }

  // Progression anti-skip: no direct portal from Novice Village to high-level zones (Dragon Valley / Crimson Desert / Drakhen)
  const noviceExits = connections.filter((c: any) => c.fromRegionId === 'THON_KHOI_NGUYEN').map((c: any) => c.toRegionId);
  assert.ok(!noviceExits.includes('map_dragon_valley'));
  assert.ok(!noviceExits.includes('map_crimson_desert'));
  assert.ok(!noviceExits.includes('city_drakhen'));
});

test('Safe Zones & Level-Gated Portals: Cities block combat & spawning, portals check requiredLevel', () => {
  const store = JsonStore.getInstance();
  const combat = new CombatService();
  const cLow = makeTestCharacter(store, { level: 5, regionId: 'THON_KHOI_NGUYEN', x: 11 * 48 + 24, y: 28 * 48 + 24 });

  combat.join('USR_PLAYER_001', cLow.id);
  assert.throws(() => combat.changeRegion(cLow.id, 'city_elysia_capital'), /Cấp độ chưa đủ/);

  // Promote to Lv.15 and walk through South Gate to Elysia Capital
  cLow.level = 15;
  const snap = combat.changeRegion(cLow.id, 'city_elysia_capital');
  assert.equal(snap.regionId, 'city_elysia_capital');
  assert.equal(combat.getRegionMonsters('city_elysia_capital').length, 0, 'Safe city must have 0 monsters');
  assert.equal(combat.getRegionMonsters('city_sylvaris').length, 0, 'Sylvaris must have 0 monsters');
  assert.equal(combat.getRegionMonsters('city_drakhen').length, 0, 'Drakhen must have 0 monsters');

  // Combat inside Safe City rejected
  assert.throws(
    () => combat.attack(cLow.id, { targetId: 'ANY_MOB', actionType: 'basic_attack' }),
    /Khu vực an toàn/
  );

  // Clean up test character
  store.characters.splice(store.characters.findIndex((c) => c.id === cLow.id), 1);
});

test('Sanctum of Awakening Lv.15 Dungeon & First Job Advancement End-to-End Flow', () => {
  const store = JsonStore.getInstance();
  const dungeon = DungeonService.getInstance();
  const job = JobService.getInstance();

  const charUnder = makeTestCharacter(store, { level: 10 });
  assert.throws(
    () => dungeon.enterDungeon(charUnder.id, 'dungeon_sanctum_of_awakening'),
    /Cấp độ chưa đủ/
  );
  store.characters.splice(store.characters.findIndex((c) => c.id === charUnder.id), 1);

  const hero = makeTestCharacter(store, {
    level: 15,
    classId: 'adventurer',
    completedQuests: ['QUEST_001_SLIME_CLEAR'],
    baseStats: { str: 24, dex: 16, agi: 10, int: 10, con: 10 },
  });

  // Enter Floor 1 (solo)
  const inst = dungeon.enterDungeon(hero.id, 'dungeon_sanctum_of_awakening', { mode: 'solo' });
  assert.equal(inst.currentFloor, 1);

  // Floor 2 blocked before 3 fragments
  assert.throws(() => dungeon.advanceFloor(inst.instanceId, hero.id, 2), /3\/3 Mảnh Nguyên Tố/);

  dungeon.collectFragment(inst.instanceId, hero.id, 'frag_ember');
  assert.throws(() => dungeon.collectFragment(inst.instanceId, hero.id, 'frag_ember'), /đã được thu thập/);
  dungeon.collectFragment(inst.instanceId, hero.id, 'frag_tide');
  dungeon.collectFragment(inst.instanceId, hero.id, 'frag_gale');

  // Advance Floor 2
  const f2 = dungeon.advanceFloor(inst.instanceId, hero.id, 2);
  assert.equal(f2.currentFloor, 2);

  // Floor 3 blocked before 4 pillars
  assert.throws(() => dungeon.advanceFloor(inst.instanceId, hero.id, 3), /4\/4 Trụ Nguyên Tố/);

  dungeon.activatePillar(inst.instanceId, hero.id, 'pillar_fire');
  dungeon.activatePillar(inst.instanceId, hero.id, 'pillar_water');
  dungeon.activatePillar(inst.instanceId, hero.id, 'pillar_earth');
  dungeon.activatePillar(inst.instanceId, hero.id, 'pillar_wind');

  // Advance Floor 3 & Defeat Guardian of Awakening
  const f3 = dungeon.advanceFloor(inst.instanceId, hero.id, 3);
  assert.equal(f3.currentFloor, 3);

  const partial = dungeon.attackBoss(inst.instanceId, hero.id, 3);
  assert.equal(partial.bossDefeated, false, 'Boss should survive initial 3 strikes');
  assert.ok(partial.instance.bossHp < partial.instance.bossMaxHp);

  let fight = partial;
  let guard = 0;
  while (!fight.bossDefeated && guard++ < 10) {
    fight = dungeon.attackBoss(inst.instanceId, hero.id, 20);
  }
  assert.equal(fight.bossDefeated, true);
  assert.equal(fight.certificateGranted, true);
  assert.ok(hero.inventory.some((it: any) => it.itemId === 'ITEM_AWAKENING_CERTIFICATE'));

  // Prevent unauthorized re-entry / reward duplication
  assert.throws(
    () => dungeon.enterDungeon(hero.id, 'dungeon_sanctum_of_awakening'),
    /Không thể vào lại để nhận thưởng trùng lặp/
  );

  // Automatic Job Awakening into 1 of 8 classes (no manual selection!)
  assert.equal(FIRST_JOB_CLASS_IDS.length, 8);
  const statusBefore = job.getStatus(hero.id);
  assert.equal(statusBefore.canTriggerAutomaticAwakening, true);

  // Manual class selection explicitly forbidden
  assert.throws(() => job.awakenCharacter(hero.id, 'mage'), /Từ chối chọn nghề thủ công/);

  const adv = job.awakenCharacter(hero.id);
  assert.equal(adv.success, true);
  assert.equal(hero.classId, 'swordsman');
  assert.ok(adv.unlockedSkills.includes('skill_slash'));
  assert.ok(adv.grantedItems.some((g: any) => g.itemId === 'ITEM_SWORD_AWAKENED_BLADE'));
  assert.ok(adv.grantedItems.some((g: any) => g.itemId === 'ITEM_ARMOR_SWORDSMAN_PLATE'));
  assert.ok(!hero.inventory.some((it: any) => it.itemId === 'ITEM_AWAKENING_CERTIFICATE'), 'Certificate must be redeemed');

  // Re-calling awakenCharacter is idempotent with zero duplicate rewards
  const replay = job.awakenCharacter(hero.id);
  assert.equal(replay.alreadyCompleted, true);
  assert.equal(replay.grantedItems.length, 0);

  store.characters.splice(store.characters.findIndex((c) => c.id === hero.id), 1);
  store.save();
});

test('Admin Draft -> Testing -> Published Workflow Persists and Syncs Live World', () => {
  const admin = new WorldAdminService();
  const world = WorldService.getInstance();
  const tempId = `mon_test_${Date.now()}`;

  const created = admin.create('monsters', {
    id: tempId,
    name: 'Test Mirage Slime',
    internalName: 'test_mirage_slime',
    regionId: 'map_whispering_meadow',
    levelMin: 15,
    levelMax: 16,
    hp: 1500,
    expReward: 200,
    goldReward: 50,
    status: 'draft',
  });
  assert.equal(created.status, 'draft');
  assert.ok(!world.getMonsters(false).some((m: any) => m.id === tempId), 'Draft must not appear in published pool');

  const testing = admin.transitionStatus('monsters', tempId, 'testing');
  assert.equal(testing.status, 'testing');
  assert.ok(!world.getMonsters(false).some((m: any) => m.id === tempId), 'Testing must not appear in published pool');

  const published = admin.transitionStatus('monsters', tempId, 'published');
  assert.equal(published.status, 'published');
  assert.ok(world.getMonsters(false).some((m: any) => m.id === tempId), 'Published must immediately appear in live game pool');

  // Cleanup so canonical monsters.json remains clean
  admin.remove('monsters', tempId);
  assert.ok(!world.getMonsters(false).some((m: any) => m.id === tempId));
});

test('Express HTTP API mounts /api/v1/game/* and /api/v1/admin/world/*', async () => {
  const app = createApp();
  const server = app.listen(0);
  const addr: any = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;

  const getJson = (p: string): Promise<any> =>
    new Promise((resolve, reject) => {
      request.get(`${baseUrl}${p}`, (res) => {
        let body = '';
        res.on('data', (d) => (body += d));
        res.on('end', () => resolve({ status: res.statusCode, json: JSON.parse(body) }));
      }).on('error', reject);
    });

  try {
    const cities = await getJson('/api/v1/game/cities');
    assert.equal(cities.status, 200);
    assert.equal(cities.json.data.length, 3);

    const maps = await getJson('/api/v1/game/maps');
    assert.equal(maps.status, 200);
    assert.ok(maps.json.data.length >= 24, `Expected >= 24 maps after Beginner expansion, got ${maps.json.data.length}`);

    const dungeons = await getJson('/api/v1/game/dungeons');
    assert.equal(dungeons.status, 200);
    assert.equal(dungeons.json.data[0].id, 'dungeon_sanctum_of_awakening');

    const adminQuests = await getJson('/api/v1/admin/world/quests');
    assert.equal(adminQuests.status, 200);
    assert.ok(adminQuests.json.data.length >= 7);
  } finally {
    server.close();
  }
});
