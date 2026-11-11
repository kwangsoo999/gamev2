import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { ENV } from '../config/env.js';
import { JsonStore } from '../database/jsonStore.js';
import { runMigrationsAndSeeds } from '../database/migrations.js';
import { CharacterService } from '../services/character.service.js';
import { DungeonService } from '../services/dungeon.service.js';
import { JobService } from '../services/job.service.js';
import { WorldAdminService } from '../services/world-admin.service.js';
import { classifyJobFromBaseStats } from '@elysia/game-data-schema';

async function clearSanctumAndAwaken(char: any) {
  const dungeon = DungeonService.getInstance();
  const job = JobService.getInstance();
  const inst = dungeon.enterDungeon(char.id, 'dungeon_sanctum_of_awakening', { mode: 'solo' });
  dungeon.collectFragment(inst.instanceId, char.id, 'frag_ember');
  dungeon.collectFragment(inst.instanceId, char.id, 'frag_tide');
  dungeon.collectFragment(inst.instanceId, char.id, 'frag_gale');
  dungeon.advanceFloor(inst.instanceId, char.id, 2);
  dungeon.activatePillar(inst.instanceId, char.id, 'pillar_fire');
  dungeon.activatePillar(inst.instanceId, char.id, 'pillar_water');
  dungeon.activatePillar(inst.instanceId, char.id, 'pillar_earth');
  dungeon.activatePillar(inst.instanceId, char.id, 'pillar_wind');
  dungeon.advanceFloor(inst.instanceId, char.id, 3);
  let res = dungeon.attackBoss(inst.instanceId, char.id, 25);
  let i = 0;
  while (!res.bossDefeated && i++ < 10) {
    res = dungeon.attackBoss(inst.instanceId, char.id, 25);
  }
  assert.equal(res.bossDefeated, true);
  return job.awakenCharacter(char.id);
}

function cleanupChar(store: JsonStore, charId: string) {
  const idx = store.characters.findIndex((c) => c.id === charId);
  if (idx >= 0) {
    store.characters.splice(idx, 1);
    store.save();
  }
}

test.before(async () => {
  await runMigrationsAndSeeds();
});

test('1. Character Start & Lv.1-14 Base Stat Allocation Rules', async () => {
  const store = JsonStore.getInstance();
  const charService = new CharacterService();
  const tempUserId = `USR_TEST_${Date.now()}`;

  // Reject creating character with a permanent First Job directly
  await assert.rejects(
    () =>
      charService.createCharacter(tempUserId, {
        name: `NoSkip_${Date.now().toString().slice(-4)}`,
        gender: 'female',
        classId: 'mage',
      }),
    /bắt buộc khởi đầu là Adventurer/
  );

  const c = await charService.createCharacter(tempUserId, {
    name: `Adv_${Date.now().toString().slice(-5)}`,
    gender: 'male',
    classId: 'adventurer',
  });

  try {
    assert.equal(c.level, 1);
    assert.equal(c.classId, 'adventurer');
    assert.equal(c.jobAdvancementCompleted, false);
    assert.equal(c.availableAttributePoints, 3);

    // Reject negative and overspend allocations
    await assert.rejects(() => charService.allocateAttributePoints(c.id, { str: -1 }), /không âm/);
    await assert.rejects(() => charService.allocateAttributePoints(c.id, { int: 10 }), /Không đủ điểm thuộc tính/);

    // Spend 3 starter points cleanly
    const prevInt = c.baseStats.int;
    const prevDex = c.baseStats.dex;
    const updated = await charService.allocateAttributePoints(c.id, { int: 2, dex: 1 });
    assert.equal(updated.baseStats.int, prevInt + 2);
    assert.equal(updated.baseStats.dex, prevDex + 1);
    assert.equal(updated.availableAttributePoints, 0);
  } finally {
    cleanupChar(store, c.id);
  }
});

test('2. Exact Formula & Dominant Attribute Classification Across All 8 Jobs + Tie-Breakers', () => {
  const cases: Array<{ label: string; stats: { str: number; dex: number; agi: number; int: number; con: number }; expected: string }> = [
    // STR dominant (+ DEX) -> Swordsman
    { label: 'Swordsman (STR*2+DEX)', stats: { str: 30, dex: 20, agi: 10, int: 10, con: 12 }, expected: 'swordsman' },
    // AGI dominant (+ STR) -> Spearman
    { label: 'Spearman (AGI*2+STR)', stats: { str: 20, dex: 10, agi: 30, int: 10, con: 10 }, expected: 'spearman' },
    // CON dominant (+ STR) -> Knight
    { label: 'Knight (CON*2+STR)', stats: { str: 20, dex: 10, agi: 10, int: 12, con: 30 }, expected: 'knight' },
    // CON dominant (+ INT) -> Monk
    { label: 'Monk (CON*2+INT)', stats: { str: 10, dex: 10, agi: 10, int: 22, con: 30 }, expected: 'monk' },
    // INT dominant (+ DEX) -> Mage
    { label: 'Mage (INT*2+DEX)', stats: { str: 10, dex: 18, agi: 10, int: 32, con: 10 }, expected: 'mage' },
    // AGI dominant (+ DEX) -> Assassin
    { label: 'Assassin (AGI*2+DEX)', stats: { str: 12, dex: 21, agi: 30, int: 10, con: 10 }, expected: 'assassin' },
    // STR dominant (+ CON) -> Fighter
    { label: 'Fighter (STR*2+CON)', stats: { str: 30, dex: 12, agi: 10, int: 10, con: 22 }, expected: 'fighter' },
    // DEX dominant (+ AGI) -> Archer
    { label: 'Archer (DEX*2+AGI)', stats: { str: 10, dex: 32, agi: 20, int: 10, con: 10 }, expected: 'archer' },
  ];

  for (const tc of cases) {
    const res = classifyJobFromBaseStats(tc.stats);
    assert.equal(res.assignedClassId, tc.expected, `${tc.label} failed`);
  }

  // Tie-break test 1: Equal JobScore -> Higher Primary Base Stat wins
  // STR=28, DEX=4 => Swordsman = 28*2 + 4 = 60 (Primary 28)
  // AGI=16, STR=28 => Spearman = 16*2 + 28 = 60 (Primary 16), CON=3 => Fighter = 59
  const tiePrimary = classifyJobFromBaseStats({ str: 28, dex: 4, agi: 16, int: 3, con: 3 });
  assert.equal(tiePrimary.scores[0].score, 60);
  assert.equal(tiePrimary.scores[1].score, 60);
  assert.equal(tiePrimary.assignedClassId, 'swordsman', 'Higher Primary (28 vs 16) must win equal-score tie');

  // Tie-break test 2: Equal JobScore & Primary -> Higher Secondary wins
  const customEqualWeights = [
    { id: 'swordsman', name: 'Swordsman', role: 'r', description: '', baseStats: { str: 10, dex: 10, agi: 10, int: 10, con: 10 }, allowedWeapons: ['sword'], startingSkills: [], primaryAttribute: 'str', secondaryAttribute: 'dex', classificationMultiplier: { primary: 1, secondary: 2 }, priorityRank: 1 },
    { id: 'fighter', name: 'Fighter', role: 'r', description: '', baseStats: { str: 10, dex: 10, agi: 10, int: 10, con: 10 }, allowedWeapons: ['fist'], startingSkills: [], primaryAttribute: 'str', secondaryAttribute: 'con', classificationMultiplier: { primary: 1, secondary: 1 }, priorityRank: 7 },
    { id: 'spearman', name: 'Spearman', role: 'r', description: '', baseStats: { str: 10, dex: 10, agi: 10, int: 10, con: 10 }, allowedWeapons: ['spear'], startingSkills: [], primaryAttribute: 'agi', secondaryAttribute: 'str', classificationMultiplier: { primary: 0.5, secondary: 0.5 }, priorityRank: 2 },
    { id: 'knight', name: 'Knight', role: 'r', description: '', baseStats: { str: 10, dex: 10, agi: 10, int: 10, con: 10 }, allowedWeapons: ['shield'], startingSkills: [], primaryAttribute: 'con', secondaryAttribute: 'str', classificationMultiplier: { primary: 0.5, secondary: 0.5 }, priorityRank: 3 },
    { id: 'monk', name: 'Monk', role: 'r', description: '', baseStats: { str: 10, dex: 10, agi: 10, int: 10, con: 10 }, allowedWeapons: ['staff'], startingSkills: [], primaryAttribute: 'con', secondaryAttribute: 'int', classificationMultiplier: { primary: 0.5, secondary: 0.5 }, priorityRank: 4 },
    { id: 'mage', name: 'Mage', role: 'r', description: '', baseStats: { str: 10, dex: 10, agi: 10, int: 10, con: 10 }, allowedWeapons: ['book'], startingSkills: [], primaryAttribute: 'int', secondaryAttribute: 'dex', classificationMultiplier: { primary: 0.5, secondary: 0.5 }, priorityRank: 5 },
    { id: 'assassin', name: 'Assassin', role: 'r', description: '', baseStats: { str: 10, dex: 10, agi: 10, int: 10, con: 10 }, allowedWeapons: ['dagger'], startingSkills: [], primaryAttribute: 'agi', secondaryAttribute: 'dex', classificationMultiplier: { primary: 0.5, secondary: 0.5 }, priorityRank: 6 },
    { id: 'archer', name: 'Archer', role: 'r', description: '', baseStats: { str: 10, dex: 10, agi: 10, int: 10, con: 10 }, allowedWeapons: ['bow'], startingSkills: [], primaryAttribute: 'dex', secondaryAttribute: 'agi', classificationMultiplier: { primary: 0.5, secondary: 0.5 }, priorityRank: 8 },
  ] as any;
  // Swordsman: STR=20 + DEX=10*2 = 40 (Pri 20, Sec 10) vs Fighter: STR=20 + CON=20 = 40 (Pri 20, Sec 20) -> Fighter wins on Secondary (20 > 10)!
  const secWin = classifyJobFromBaseStats({ str: 20, dex: 10, agi: 5, int: 5, con: 20 }, customEqualWeights);
  assert.equal(secWin.assignedClassId, 'fighter', 'Higher Secondary (20 vs 10) must win equal Score & Primary tie');

  // Tie-break test 3: Exact Equal Score, Primary & Secondary -> Stable Class Priority (All stats = 15)
  const fullTie = classifyJobFromBaseStats({ str: 15, dex: 15, agi: 15, int: 15, con: 15 });
  assert.equal(fullTie.assignedClassId, 'swordsman', 'Priority #1 Swordsman wins complete 8-way tie');
});

test('3. Equipment Bonuses & Temporary Buffs Must Not Influence Awakening Classification', async () => {
  const store = JsonStore.getInstance();
  const job = JobService.getInstance();
  const id = `CHAR_BUFF_EXCLUDE_${Date.now().toString().slice(-5)}`;
  const char: any = {
    id,
    userId: 'USR_PLAYER_001',
    name: `MagePure_${id.slice(-4)}`,
    gender: 'female',
    classId: 'adventurer',
    jobAdvancementCompleted: false,
    level: 15,
    exp: 0,
    gold: 1000,
    baseStats: { str: 10, dex: 14, agi: 10, int: 28, con: 10 },
    attributes: { str: 10, dex: 14, agi: 10, int: 28, con: 10 },
    // Simulated inflated STR gear + temporary STR potions/buffs
    equipment: { mainHand: 'ITEM_EXCALIBUR_HOLY' },
    temporaryBuffs: { str: 500, physicalAttack: 999 },
    completedQuests: ['QUEST_001_SLIME_CLEAR'],
    inventory: [],
    regionId: 'THON_KHOI_NGUYEN',
  };
  store.characters.push(char);

  try {
    const res = await clearSanctumAndAwaken(char);
    assert.equal(res.newClassId, 'mage', 'Equipment/temporary buffs must be ignored; pure INT baseStat yields Mage');
    assert.ok(res.grantedItems.some((g) => g.itemId === 'ITEM_SPELLBOOK_ARCANE'));
    assert.ok(res.grantedItems.some((g) => g.itemId === 'ITEM_ARMOR_MAGE_ROBE'));

    // Class-specific equipment restriction: Mage cannot equip Bow or Greatsword/Swordsman Blade
    const charService = new CharacterService();
    await assert.rejects(
      () => charService.equipItem(char.id, 'mainHand', 'ITEM_BOW_RANGER'),
      /không tương thích với chức nghiệp mage/
    );
  } finally {
    cleanupChar(store, id);
  }
});

test('4. Security Gates: Lv.14 Blocked, Incomplete Dungeon Blocked, Repeat Reward Blocked, Persistence Check', async () => {
  const store = JsonStore.getInstance();
  const dungeon = DungeonService.getInstance();
  const job = JobService.getInstance();

  const lv14Id = `CHAR_LV14_${Date.now().toString().slice(-4)}`;
  store.characters.push({
    id: lv14Id,
    userId: 'USR_PLAYER_001',
    name: 'Lv14Denied',
    gender: 'male',
    classId: 'adventurer',
    jobAdvancementCompleted: false,
    level: 14,
    exp: 0,
    gold: 0,
    baseStats: { str: 10, dex: 26, agi: 18, int: 10, con: 10 },
    attributes: { str: 10, dex: 26, agi: 18, int: 10, con: 10 },
    completedQuests: ['QUEST_001_SLIME_CLEAR'],
    inventory: [],
  });

  try {
    assert.throws(() => dungeon.enterDungeon(lv14Id, 'dungeon_sanctum_of_awakening'), /Cấp độ chưa đủ/);

    // Bump to Lv.15 WITHOUT beginner quest completed -> still blocked
    const c14 = store.characters.find((c) => c.id === lv14Id)!;
    c14.level = 15;
    c14.completedQuests = [];
    assert.throws(() => dungeon.enterDungeon(lv14Id, 'dungeon_sanctum_of_awakening'), /nhiệm vụ tân thủ/);

    // Complete beginner quest, enter Floor 1 only, try Awakening before defeating Boss -> blocked!
    c14.completedQuests = ['QUEST_001_SLIME_CLEAR'];
    dungeon.enterDungeon(lv14Id, 'dungeon_sanctum_of_awakening');
    assert.throws(() => job.awakenCharacter(lv14Id), /Guardian of Awakening/);

    // Finish remaining floors manually & awaken -> Archer assigned automatically from DEX/AGI!
    const inst = dungeon.getActiveInstanceForCharacter(lv14Id)!;
    dungeon.collectFragment(inst.instanceId, lv14Id, 'frag_ember');
    dungeon.collectFragment(inst.instanceId, lv14Id, 'frag_tide');
    dungeon.collectFragment(inst.instanceId, lv14Id, 'frag_gale');
    dungeon.advanceFloor(inst.instanceId, lv14Id, 2);
    dungeon.activatePillar(inst.instanceId, lv14Id, 'pillar_fire');
    dungeon.activatePillar(inst.instanceId, lv14Id, 'pillar_water');
    dungeon.activatePillar(inst.instanceId, lv14Id, 'pillar_earth');
    dungeon.activatePillar(inst.instanceId, lv14Id, 'pillar_wind');
    dungeon.advanceFloor(inst.instanceId, lv14Id, 3);
    let b = dungeon.attackBoss(inst.instanceId, lv14Id, 25);
    while (!b.bossDefeated) b = dungeon.attackBoss(inst.instanceId, lv14Id, 25);

    const awakened = job.awakenCharacter(lv14Id);
    assert.equal(awakened.newClassId, 'archer');
    assert.ok(awakened.grantedItems.some((g) => g.itemId === 'ITEM_BOW_RANGER'));
    assert.ok(awakened.grantedItems.some((g) => g.itemId === 'ITEM_ARMOR_ARCHER_TUNIC'));

    // Disconnect / Relogin persistence: verify server_db.json retains awakened result and getAwakeningResult returns it
    await new Promise((r) => setTimeout(r, 30));
    const dbRaw = JSON.parse(fs.readFileSync(path.join(ENV.DATA_DIR, 'server_db.json'), 'utf-8'));
    const persisted = dbRaw.characters.find((x: any) => x.id === lv14Id);
    assert.equal(persisted?.classId, 'archer');
    assert.equal(persisted?.jobAdvancementCompleted, true);
    assert.equal(job.getAwakeningResult(lv14Id)?.assignedClassId, 'archer');

    // Repeated request cannot duplicate rewards
    const dup = job.awakenCharacter(lv14Id);
    assert.equal(dup.alreadyCompleted, true);
    assert.equal(dup.grantedItems.length, 0);
  } finally {
    cleanupChar(store, lv14Id);
  }
});

test('5. Admin Job Manager Asset Validation & Class Config Integrity', () => {
  const worldAdmin = new WorldAdminService();
  assert.throws(
    () =>
      worldAdmin.update('classes', 'swordsman', {
        artworkUrl: '/assets/non_existent_class_art.png',
      }),
    /không tồn tại trên ổ đĩa/
  );
  const swordsman = worldAdmin.getById('classes', 'swordsman');
  assert.equal(swordsman?.primaryAttribute, 'str');
  assert.equal(swordsman?.secondaryAttribute, 'dex');
});

test('6. Full End-to-End Sanctum Awakening & Class-Specific Rewards Across All 8 Jobs', async () => {
  const store = JsonStore.getInstance();
  const builds = [
    { expected: 'swordsman', weapon: 'ITEM_SWORD_AWAKENED_BLADE', armor: 'ITEM_ARMOR_SWORDSMAN_PLATE', stats: { str: 30, dex: 20, agi: 10, int: 10, con: 12 } },
    { expected: 'spearman', weapon: 'ITEM_SPEAR_IRON', armor: 'ITEM_ARMOR_SPEARMAN_MAIL', stats: { str: 20, dex: 10, agi: 30, int: 10, con: 10 } },
    { expected: 'knight', weapon: 'ITEM_SHIELD_IRON', armor: 'ITEM_ARMOR_KNIGHT_AEGIS', stats: { str: 20, dex: 10, agi: 10, int: 12, con: 30 } },
    { expected: 'monk', weapon: 'ITEM_STAFF_SANCTUM_ORB', armor: 'ITEM_ARMOR_MONK_VESTMENT', stats: { str: 10, dex: 10, agi: 10, int: 22, con: 30 } },
    { expected: 'mage', weapon: 'ITEM_SPELLBOOK_ARCANE', armor: 'ITEM_ARMOR_MAGE_ROBE', stats: { str: 10, dex: 18, agi: 10, int: 32, con: 10 } },
    { expected: 'assassin', weapon: 'ITEM_DAGGER_HUNTER', armor: 'ITEM_ARMOR_ASSASSIN_GARB', stats: { str: 12, dex: 21, agi: 30, int: 10, con: 10 } },
    { expected: 'fighter', weapon: 'ITEM_GAUNTLET_IRON_FIST', armor: 'ITEM_ARMOR_FIGHTER_GI', stats: { str: 30, dex: 12, agi: 10, int: 10, con: 22 } },
    { expected: 'archer', weapon: 'ITEM_BOW_RANGER', armor: 'ITEM_ARMOR_ARCHER_TUNIC', stats: { str: 10, dex: 32, agi: 20, int: 10, con: 10 } },
  ];

  for (const b of builds) {
    const id = `CHAR_ALL8_${b.expected}_${Date.now().toString().slice(-4)}`;
    const char: any = {
      id,
      userId: 'USR_PLAYER_001',
      name: `Trial_${b.expected}`,
      gender: 'female',
      classId: 'adventurer',
      jobAdvancementCompleted: false,
      level: 15,
      exp: 0,
      gold: 500,
      baseStats: { ...b.stats },
      attributes: { ...b.stats },
      completedQuests: ['QUEST_001_SLIME_CLEAR'],
      inventory: [],
      regionId: 'THON_KHOI_NGUYEN',
    };
    store.characters.push(char);
    try {
      const result = await clearSanctumAndAwaken(char);
      assert.equal(result.newClassId, b.expected);
      assert.equal(char.classId, b.expected);
      assert.equal(char.jobAdvancementCompleted, true);
      assert.ok(result.grantedItems.some((g) => g.itemId === b.weapon), `Missing starter weapon ${b.weapon} for ${b.expected}`);
      assert.ok(result.grantedItems.some((g) => g.itemId === b.armor), `Missing starter armor ${b.armor} for ${b.expected}`);
      assert.ok(result.unlockedSkills.length >= 1, `Expected starter skills for ${b.expected}`);
    } finally {
      cleanupChar(store, id);
    }
  }
});
