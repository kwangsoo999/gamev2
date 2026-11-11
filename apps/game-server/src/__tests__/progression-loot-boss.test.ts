import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CANONICAL_EQUIP_SLOTS,
  FIRST_JOB_CLASS_IDS,
  INITIAL_BOSS_CONFIGS,
  INITIAL_BOSS_DROP_TABLES,
  INITIAL_EQUIPMENT_SETS,
  INITIAL_ITEMS,
  INITIAL_SKILLS,
  RARITY_CONFIGS,
  computeBossParticipantScores,
  computeEquippedSetBonuses,
  computeSkillActionPower,
  getSkillTreeForClass,
  rollBossLootForParticipant,
} from '@elysia/game-data-schema';
import { runMigrationsAndSeeds } from '../database/migrations.js';
import { JsonStore } from '../database/jsonStore.js';
import { CharacterService } from '../services/character.service.js';
import { CombatService } from '../services/combat.service.js';
import { CraftingService } from '../services/crafting.service.js';
import { WorldAdminService } from '../services/world-admin.service.js';
import { WorldService } from '../services/world.service.js';

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

test('1. Eight First-Job Class Skill Trees (8x13=104+1=105) Load, Upgrade via SP & Enforce MP/CD/Effects', async () => {
  assert.ok(INITIAL_SKILLS.length >= 105, `Expected >=105 skills, got ${INITIAL_SKILLS.length}`);

  for (const jobId of FIRST_JOB_CLASS_IDS) {
    const tree = getSkillTreeForClass(jobId, INITIAL_SKILLS);
    assert.equal(tree.length, 13, `Expected 13 skills for ${jobId}, got ${tree.length}`);
    assert.equal(tree.filter((s) => s.tier === 'basic').length, 4, `${jobId} basic skills`);
    assert.equal(tree.filter((s) => s.tier === 'passive').length, 4, `${jobId} passive skills`);
    assert.equal(tree.filter((s) => s.tier === 'advanced').length, 4, `${jobId} advanced skills`);
    assert.equal(tree.filter((s) => s.tier === 'ultimate').length, 1, `${jobId} ultimate skill`);
  }

  const store = JsonStore.getInstance();
  const charSvc = new CharacterService();
  const char = await charSvc.createCharacter(`USR_SK_${Date.now()}`, {
    name: `SkillTest_${Date.now().toString().slice(-4)}`,
    gender: 'female',
    classId: 'adventurer',
  });

  try {
    char.classId = 'monk';
    char.level = 55;
    char.jobAdvancementCompleted = true;
    char.skillPoints = 4;
    char.unlockedSkills = ['skill_holy_light', 'skill_faith', 'skill_holy_bolt'];
    char.skillLevels = { skill_holy_light: 1, skill_faith: 1, skill_holy_bolt: 1 };
    char.regionId = 'map_whispering_meadow';
    char.x = 400;
    char.y = 400;
    store.save();

    // Reject cross-class skill learning
    await assert.rejects(() => charSvc.learnOrUpgradeSkill(char.id, 'skill_slash'), /chỉ dành cho nghề/);

    // Upgrade Monk Holy Light with SP and verify scaling boost
    const holyLight = INITIAL_SKILLS.find((s) => s.id === 'skill_holy_light')!;
    const lv1Power = computeSkillActionPower(holyLight, 1, char.baseStats, 50, 120, 40, {
      atkPct: 0, matkPct: 0, defPct: 0, mdefPct: 0, hpPct: 0, mpPct: 0,
      critRatePct: 0, critDamagePct: 0, aspdPct: 0, moveSpeedPct: 0,
      fleeFlat: 0, hitFlat: 0, skillDamagePct: 0, healingPowerPct: 0,
      damageReductionPct: 0, mpCostReductionPct: 0, lifestealPct: 0, bonusRange: 0,
    });
    const upgRes = await charSvc.learnOrUpgradeSkill(char.id, 'skill_holy_light');
    assert.equal(upgRes.newLevel, 2);
    assert.equal(upgRes.remainingSkillPoints, 3);

    const lv2Power = computeSkillActionPower(holyLight, 2, char.baseStats, 50, 120, 40, {
      atkPct: 0, matkPct: 0, defPct: 0, mdefPct: 0, hpPct: 0, mpPct: 0,
      critRatePct: 0, critDamagePct: 0, aspdPct: 0, moveSpeedPct: 0,
      fleeFlat: 0, hitFlat: 0, skillDamagePct: 0, healingPowerPct: 0,
      damageReductionPct: 0, mpCostReductionPct: 0, lifestealPct: 0, bonusRange: 0,
    });
    assert.ok(lv2Power.healPower > lv1Power.healPower, 'Upgraded heal skill must scale upward');

    // CombatService executes support skill with MP deduction and cooldown guard
    const combat = new CombatService();
    const joined = combat.join(char.userId!, char.id);
    const mpBefore = joined.snapshot.mp;
    const castRes = combat.castSupportSkill(char.id, 'skill_holy_light');
    assert.ok(castRes.healedHp >= 0);
    assert.ok(castRes.player.mp < mpBefore, 'MP should be deducted after skill cast');
    assert.throws(() => combat.castSupportSkill(char.id, 'skill_holy_light'), /đang hồi chiêu/);
  } finally {
    cleanupChar(store, char.id);
  }
});

test('2. Ten-Slot Equipment, Class Restrictions, 24 Class Sets & 2/4/6-Piece Combat Bonuses', async () => {
  assert.equal(CANONICAL_EQUIP_SLOTS.length, 10);
  const classSets = INITIAL_EQUIPMENT_SETS.filter((s) => s.category === 'class_set');
  const bossSets = INITIAL_EQUIPMENT_SETS.filter((s) => s.category === 'boss_set');
  assert.equal(classSets.length, 24, `Expected 24 class sets (8x3), got ${classSets.length}`);
  assert.equal(bossSets.length, 5, `Expected 5 boss sets, got ${bossSets.length}`);
  assert.equal(Object.keys(RARITY_CONFIGS).length, 6, 'Expected 6 rarity tiers');

  const store = JsonStore.getInstance();
  const charSvc = new CharacterService();
  const char = await charSvc.createCharacter(`USR_EQ_${Date.now()}`, {
    name: `EquipTest_${Date.now().toString().slice(-4)}`,
    gender: 'male',
    classId: 'adventurer',
  });

  try {
    char.classId = 'swordsman';
    char.level = 65;
    char.jobAdvancementCompleted = true;
    store.save();

    // Class weapon/armor restrictions
    const mageBook = INITIAL_ITEMS.find((i: any) => i.id === 'ITEM_SPELLBOOK_ARCANE' || i.itemSubtype === 'spellbook')!;
    const archerBow = INITIAL_ITEMS.find((i: any) => i.id === 'ITEM_BOW_RANGER' || i.itemSubtype === 'bow')!;
    await assert.rejects(() => charSvc.equipItem(char.id, 'weapon', mageBook.id), /chức nghiệp|sử dụng|trang bị|class/i);
    await assert.rejects(() => charSvc.equipItem(char.id, 'weapon', archerBow.id), /chức nghiệp|sử dụng|trang bị|class/i);

    // Equip 6 pieces from Swordsman Lv.60 set + accessories across all 10 slots
    const swSet = INITIAL_EQUIPMENT_SETS.find((s) => s.id === 'set_swordsman_dragon_slayer')!;
    const baseStatsSummary = charSvc.getComputedStatsSummary(char.id);

    await charSvc.equipItem(char.id, 'weapon', swSet.pieceItemIds[0]);
    await charSvc.equipItem(char.id, 'head', swSet.pieceItemIds[1]);
    const stats2pc = charSvc.getComputedStatsSummary(char.id);
    assert.ok(stats2pc.computed.atk > baseStatsSummary.computed.atk, '2-piece bonus should boost ATK');
    assert.deepEqual(stats2pc.activeSets[0].activeTiers, [2]);

    await charSvc.equipItem(char.id, 'armor', swSet.pieceItemIds[2]);
    await charSvc.equipItem(char.id, 'gloves', swSet.pieceItemIds[3]);
    const stats4pc = charSvc.getComputedStatsSummary(char.id);
    assert.deepEqual(stats4pc.activeSets[0].activeTiers, [2, 4]);

    await charSvc.equipItem(char.id, 'boots', swSet.pieceItemIds[4]);
    await charSvc.equipItem(char.id, 'shoulder', swSet.pieceItemIds[5]);
    await charSvc.equipItem(char.id, 'necklace', swSet.pieceItemIds[6]);
    await charSvc.equipItem(char.id, 'ring1', 'ITEM_FOREST_GUARDIAN_RING');
    await charSvc.equipItem(char.id, 'ring2', 'ITEM_ANCIENT_TITAN_RING');
    await charSvc.equipItem(char.id, 'cloak', 'ITEM_FOREST_GUARDIAN_CLOAK');

    const stats10Slot = charSvc.getComputedStatsSummary(char.id);
    assert.deepEqual(stats10Slot.activeSets[0].activeTiers, [2, 4, 6]);
    assert.ok(stats10Slot.computed.atk > stats4pc.computed.atk, '6-piece + 10-slot gear should boost ATK further');

    const updatedChar = await charSvc.getCharacterById(char.id);
    for (const slot of CANONICAL_EQUIP_SLOTS) {
      assert.ok(updatedChar?.equipment?.[slot], `Expected canonical slot "${slot}" to be equipped`);
    }
  } finally {
    cleanupChar(store, char.id);
  }
});

test('3. Five Monster Categories, Ancient Treant Drop Table, Pity & Fair Multi-Role Party Contribution', () => {
  const world = WorldService.getInstance();
  const monsters = world.getMonsters(false);
  const categories = new Set(monsters.map((m: any) => m.category || 'NORMAL'));
  for (const cat of ['NORMAL', 'ELITE', 'MINI_BOSS', 'FIELD_BOSS', 'WORLD_BOSS']) {
    assert.ok(categories.has(cat), `Expected monster category "${cat}" in world monsters`);
  }

  for (const bossId of ['boss_ancient_treant', 'boss_moon_hydra', 'boss_ancient_titan', 'boss_ignis_dragon', 'boss_abyss_overlord']) {
    assert.ok(INITIAL_BOSS_CONFIGS.some((b) => b.monsterId === bossId), `Missing boss config ${bossId}`);
  }

  const treantTable = INITIAL_BOSS_DROP_TABLES.find((d) => d.monsterId === 'boss_ancient_treant')!;
  assert.ok(treantTable);
  assert.equal(treantTable.drops.find((d) => d.itemId === 'MAT_TREANT_CORE')?.dropRate, 100);
  assert.equal(treantTable.drops.find((d) => d.itemId === 'MAT_FOREST_ESSENCE')?.dropRate, 60);
  assert.equal(treantTable.drops.find((d) => d.itemId === 'ITEM_FOREST_GUARDIAN_CROWN')?.dropRate, 15);
  assert.equal(treantTable.drops.find((d) => d.itemId === 'ITEM_FOREST_GUARDIAN_CLOAK')?.dropRate, 4);
  assert.equal(treantTable.drops.find((d) => d.itemId === 'FRAG_FOREST_SET')?.dropRate, 20);
  assert.equal(treantTable.drops.find((d) => d.itemId === 'ITEM_EXCALIBUR_HOLY')?.dropRate, 0.5);

  // Party contribution check: Tank, Healer, DPS all rewarded; inactive leecher excluded; last-hit snipe cannot monopolize
  const now = Date.now();
  const scored = computeBossParticipantScores(
    [
      { characterId: 'tank', characterName: 'Knight', classId: 'knight', damageDealt: 3500, healingProvided: 0, damageAbsorbed: 12000, effectiveSupport: 1500, validActions: 12, lastActiveAt: now },
      { characterId: 'healer', characterName: 'Monk', classId: 'monk', damageDealt: 1800, healingProvided: 9500, damageAbsorbed: 800, effectiveSupport: 3200, validActions: 14, lastActiveAt: now },
      { characterId: 'dps', characterName: 'Mage', classId: 'mage', damageDealt: 14000, healingProvided: 0, damageAbsorbed: 500, effectiveSupport: 0, validActions: 16, lastActiveAt: now },
      { characterId: 'snipe', characterName: 'Snipe', classId: 'assassin', damageDealt: 120, healingProvided: 0, damageAbsorbed: 0, effectiveSupport: 0, validActions: 1, lastActiveAt: now },
      { characterId: 'leech', characterName: 'AFK', classId: 'archer', damageDealt: 0, healingProvided: 0, damageAbsorbed: 0, effectiveSupport: 0, validActions: 0, lastActiveAt: now - 120_000 },
    ],
    { damageWeight: 1.0, healingWeight: 1.25, tankMitigationWeight: 1.2, supportWeight: 1.15, minContributionScore: 300, lastHitBonusPct: 5, inactiveTimeoutSec: 30 },
    now
  );

  const byId = Object.fromEntries(scored.map((s) => [s.characterId, s]));
  assert.equal(byId.tank.eligible, true);
  assert.equal(byId.healer.eligible, true);
  assert.equal(byId.dps.eligible, true);
  assert.equal(byId.snipe.eligible, false, 'Single last-hit snipe below threshold must be rejected');
  assert.equal(byId.leech.eligible, false, 'Inactive 0-action leecher must be rejected');
  assert.ok(byId.tank.rewardSharePct >= 15 && byId.healer.rewardSharePct >= 15);

  // Deterministic Pity Test: 5 dry rolls trigger guaranteed set fragments (not Legendary!)
  let pityCount = 4; // on 5th dry kill
  const pityRoll = rollBossLootForParticipant(byId.dps, 40, treantTable, pityCount, INITIAL_ITEMS, () => 0.99);
  assert.equal(pityRoll.pityTriggered, true);
  assert.equal(pityRoll.newPityCounter, 0);
  assert.ok(pityRoll.drops.some((d) => d.isPity && d.itemId === treantTable.pityFragmentItemId));
  assert.equal(pityRoll.drops.some((d) => d.rarity === 'legendary'), false, 'Pity must NOT guarantee Legendary');
});

test('4. Crafting 10-Fragment Exchange, Duplicate Guard & Admin Draft->Testing->Published Live Sync', async () => {
  const store = JsonStore.getInstance();
  const charSvc = new CharacterService();
  const craftSvc = CraftingService.getInstance();
  const char = await charSvc.createCharacter(`USR_CR_${Date.now()}`, {
    name: `CraftTest_${Date.now().toString().slice(-4)}`,
    gender: 'male',
    classId: 'adventurer',
  });

  try {
    char.classId = 'swordsman';
    char.level = 20;
    char.gold = 5000;
    char.inventory = [{ itemId: 'FRAG_APPRENTICE_SET', quantity: 10 }];
    store.save();

    const recipe = 'RECIPE_SET_SWORDSMAN_APPRENTICE_BLADE_WEAPON';
    const reqId = `REQ_${Date.now()}`;
    const res = craftSvc.craftRecipe(char.id, recipe, reqId);
    assert.equal(res.success, true);
    assert.ok(char.inventory.some((s) => s.itemId === 'ITEM_SWORD_AWAKENED_BLADE'));
    assert.equal(char.inventory.find((s) => s.itemId === 'FRAG_APPRENTICE_SET'), undefined, '10 fragments consumed');

    // Duplicate requestId must be rejected cleanly with zero duplicate items
    assert.throws(() => craftSvc.craftRecipe(char.id, recipe, reqId), /đã được xử lý|không trùng/);

    // Admin Draft -> Testing -> Published sync for Equipment Sets & Skills
    const worldAdmin = new WorldAdminService();
    const world = WorldService.getInstance();
    const tempSetId = `set_admin_test_${Date.now()}`;
    worldAdmin.create('equipment_sets', {
      id: tempSetId,
      name: 'Admin Test Set',
      nameVi: 'Bộ Test Admin',
      description: 'Verification set',
      classId: 'swordsman',
      tierLevel: 15,
      rarity: 'rare',
      category: 'class_set',
      pieceItemIds: [],
      bonusTiers: [{ requiredPieces: 2, summary: '+10 ATK', bonuses: { atk: 10 } }],
    });
    world.invalidateCache();
    try {
      assert.equal(world.getEquipmentSets(false).some((s: any) => s.id === tempSetId), false, 'Draft hidden from live game');
      worldAdmin.transitionStatus('equipment_sets', tempSetId, 'testing');
      world.invalidateCache();
      assert.equal(world.getEquipmentSets(false).some((s: any) => s.id === tempSetId), false, 'Testing still isolated from live');
      assert.equal(world.getEquipmentSets(true).some((s: any) => s.id === tempSetId), true, 'Testing visible to includeAll');
      worldAdmin.transitionStatus('equipment_sets', tempSetId, 'published');
      world.invalidateCache();
      assert.equal(world.getEquipmentSets(false).some((s: any) => s.id === tempSetId), true, 'Published immediately synced live');
    } finally {
      worldAdmin.remove('equipment_sets', tempSetId);
      world.invalidateCache();
    }
  } finally {
    cleanupChar(store, char.id);
  }
});
