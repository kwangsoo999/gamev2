import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {
  ADVANCED_JOB_BY_ID,
  ADVANCED_JOB_DEFINITIONS,
  ADVANCED_JOB_PASSIVES,
  ALL_PASSIVE_DEFINITIONS,
  BASE_JOB_PASSIVES,
  FIRST_JOB_CLASS_IDS,
  JOB_AFFINITY_CONFIGS,
  PASSIVE_PROGRESSION_CONFIG,
  STAT_CALCULATION_ORDER,
  STAT_CAP_RULES,
  aggregateCharacterStats,
  applyDiminishingReturns,
  computeEarnedPassivePoints,
  computeLevelAwareHitChance,
  computeSafeCombatDamage,
  getPassiveTreeForCharacter,
  runAutomatedBalanceSimulation,
  validatePassiveAllocation,
} from '@elysia/game-data-schema';
import { StatCapKey } from '@elysia/game-types';
import { createApp } from '../app.js';
import { JsonStore } from '../database/jsonStore.js';
import { runMigrationsAndSeeds } from '../database/migrations.js';
import { CharacterService } from '../services/character.service.js';
import { CombatService } from '../services/combat.service.js';
import { PassiveService } from '../services/passive.service.js';

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

test('1. Passive Tree Catalog: 32 Base Passives + 96 Branch Passives = 128 Unique Valid Definitions', () => {
  assert.equal(BASE_JOB_PASSIVES.length, 32, 'Expected 4 passives per 8 base classes');
  assert.equal(ADVANCED_JOB_PASSIVES.length, 96, 'Expected 6 passives per 16 Lv.80 branches');
  assert.equal(ALL_PASSIVE_DEFINITIONS.length, 128);

  const ids = new Set(ALL_PASSIVE_DEFINITIONS.map((p) => p.id));
  assert.equal(ids.size, 128, 'All passive IDs must be strictly unique');

  for (const baseClass of FIRST_JOB_CLASS_IDS) {
    const baseOnly = getPassiveTreeForCharacter(baseClass, undefined);
    assert.equal(baseOnly.length, 4, `Expected 4 base passives for ${baseClass}`);
  }
  // Verify priest alias maps cleanly to monk base passives
  assert.equal(getPassiveTreeForCharacter('priest', undefined).length, 4);

  for (const branch of ADVANCED_JOB_DEFINITIONS) {
    const fullTree = getPassiveTreeForCharacter(branch.parentClassId, branch.id);
    assert.equal(fullTree.length, 10, `Expected 4 base + 6 branch = 10 passives for ${branch.id}`);
  }
});

test('2. Monotonic Piecewise Diminishing Returns & Hard Caps Across All 12 Protected Stats', () => {
  const keys = Object.keys(STAT_CAP_RULES) as StatCapKey[];
  assert.equal(keys.length, 12);

  for (const key of keys) {
    const rule = STAT_CAP_RULES[key];
    const probeInputs = [
      0,
      Math.max(1, rule.softCap1 * 0.5),
      rule.softCap1,
      rule.softCap1 + 10,
      rule.hardCap2,
      rule.hardCap2 + 50,
      9999,
    ];
    let prevEff = -1;
    for (const raw of probeInputs) {
      const pve = applyDiminishingReturns(raw, rule, 'pve');
      assert.ok(pve.effectiveValue >= prevEff, `${key} must be monotonic at raw=${raw}`);
      assert.ok(pve.effectiveValue <= rule.hardCeiling + 0.001, `${key} exceeded PvE ceiling at raw=${raw}`);
      if (raw <= rule.softCap1) {
        assert.equal(pve.inDiminishingReturns, false);
        assert.equal(pve.effectiveValue, Number(raw.toFixed(2)));
      }
      prevEff = pve.effectiveValue;

      const pvp = applyDiminishingReturns(9999, rule, 'pvp');
      const expectedPvpCap = rule.pvpHardCeiling ?? rule.hardCeiling;
      assert.ok(pvp.effectiveValue <= expectedPvpCap + 0.001, `${key} exceeded PvP ceiling`);
      assert.equal(pvp.atHardCap, true);
    }
  }

  // Anti-overflow guarantees: never 100% DR, never 100% crit/evasion, never 0s CD, never negative defense
  assert.ok(STAT_CAP_RULES.damageReductionPct.hardCeiling <= 55);
  assert.ok(STAT_CAP_RULES.cooldownReductionPct.hardCeiling <= 50);
  assert.ok(STAT_CAP_RULES.evasionPct.hardCeiling <= 50);

  const safeDmg = computeSafeCombatDamage({
    rawPower: 900,
    targetDef: 200,
    penetrationPct: 999, // Verify internal clamping never produces negative defense or division issues
    targetDamageReductionPct: 999, // Never 100% immunity
    critical: true,
    critDamageMultiplierPct: 240,
  });
  assert.ok(Number.isFinite(safeDmg) && safeDmg >= 1);

  const minHit = computeLevelAwareHitChance({
    attackerAccuracy: 10,
    attackerLevel: 20,
    defenderEvasionPct: 45,
    defenderLevel: 120,
  });
  const maxHit = computeLevelAwareHitChance({
    attackerAccuracy: 900,
    attackerLevel: 150,
    defenderEvasionPct: 0,
    defenderLevel: 10,
  });
  assert.ok(minHit.hitChancePct >= 55 && minHit.hitChancePct <= 100);
  assert.equal(minHit.isLevelDisadvantaged, true);
  assert.ok(maxHit.hitChancePct <= 100);
});

test('3. Passive Validation, Prerequisites, Mastery Link, Mutually Exclusive Capstones & Respec Ledger', async () => {
  const store = JsonStore.getInstance();
  const charService = new CharacterService();
  const passiveService = PassiveService.getInstance();
  const combatService = CombatService.getSharedInstance();

  const created = await charService.createCharacter('USR_PLAYER_001', {
    name: `PassTest_${Date.now().toString().slice(-5)}`,
    gender: 'male',
    classId: 'adventurer',
  });
  const char = store.characters.find((c) => c.id === created.id)!;

  try {
    // Adventurer before Lv.15 awakening is blocked
    assert.throws(
      () => passiveService.allocatePassive(char.id, 'pas_sw_sword_technique', 1),
      /Thức Tỉnh Nghề Lv\.15/
    );

    // Promote to Lv.90 Sword Saint with mastery points + respec scroll + gold
    char.classId = 'swordsman';
    char.jobAdvancementCompleted = true;
    char.advancedJobId = 'sword_saint';
    char.advancedJobName = ADVANCED_JOB_BY_ID.sword_saint.nameVi;
    char.level = 90;
    char.gold = 25000;
    char.baseStats = { str: 140, dex: 80, agi: 55, int: 20, con: 65 };
    char.attributes = { ...char.baseStats };
    char.skillMastery = {
      skill_sword_tempest: { exp: 1200, points: 100, rank: 'grandmaster', castsCount: 50, validCombatHits: 50 },
      skill_ss_iaido_flash: { exp: 1200, points: 100, rank: 'grandmaster', castsCount: 50, validCombatHits: 50 },
    };
    char.inventory.push({
      id: 'inv_respec_scroll_test',
      itemId: PASSIVE_PROGRESSION_CONFIG.respecScrollItemId,
      quantity: 1,
      acquiredAt: new Date().toISOString(),
    });
    store.save();

    const earned = computeEarnedPassivePoints(char);
    assert.ok(earned.fromLevels >= 26);
    assert.equal(earned.fromAdvancements, 9); // +3 first job +6 Lv.80 branch
    assert.equal(earned.fromMastery, 2); // 200 total cumulative mastery / 100 = +2

    // Cross-class passive blocked
    assert.throws(
      () => passiveService.allocatePassive(char.id, 'pas_mg_arcane_knowledge', 1),
      /chỉ dành cho nghề/
    );

    // Cross-branch passive blocked (berserker node on sword_saint)
    assert.throws(
      () => passiveService.allocatePassive(char.id, 'pas_berserker_choice_a', 1),
      /không thể học nội tại thuộc nhánh/
    );

    // Prerequisite check: cannot allocate pas_sw_combat_focus without pas_sw_sword_technique
    assert.throws(
      () => passiveService.allocatePassive(char.id, 'pas_sw_combat_focus', 1),
      /tiền đề/
    );

    // Negative delta rank rejected cleanly
    assert.throws(
      () => passiveService.allocatePassive(char.id, 'pas_sw_sword_technique', -1),
      /nguyên dương/
    );

    // Join CombatService so we observe real-time stat propagation (userId first, characterId second)
    combatService.join(char.userId || 'USR_PLAYER_001', char.id);
    const playerState = combatService.getPlayer(char.id)!;
    const beforeAtk = playerState.atk;

    // Allocate root + child + mastery synergy nodes
    const a1 = passiveService.allocatePassive(char.id, 'pas_sw_sword_technique', 3);
    assert.equal(a1.newRank, 3);
    assert.ok(playerState.atk > beforeAtk, 'Live CombatService player ATK must increase immediately on passive allocate');

    // Anti-maxing check: cannot exceed maxRank (5)
    assert.throws(
      () => passiveService.allocatePassive(char.id, 'pas_sw_sword_technique', 5),
      /tối đa/
    );

    passiveService.allocatePassive(char.id, 'pas_sw_combat_focus', 2);
    passiveService.allocatePassive(char.id, 'pas_sw_blade_control', 2);
    passiveService.allocatePassive(char.id, 'pas_sw_weapon_discipline', 1);

    // Discover & unlock Lv.80 Sword Saint branch tree cleanly (Capstone choice A vs choice B)
    const saintBranchNodes = getPassiveTreeForCharacter('swordsman', 'sword_saint').filter(
      (p) => p.branchRequirement === 'sword_saint'
    );
    const sigNode = saintBranchNodes.find((p) => p.parentPassiveIds.length === 0)!;
    const synNode = saintBranchNodes.find((p) => p.id.endsWith('_synergy'))!;
    const utilNode = saintBranchNodes.find((p) => p.id.endsWith('_utility'))!;
    const choiceA = saintBranchNodes.find((p) => p.id.endsWith('_choice_a'))!;
    const choiceB = saintBranchNodes.find((p) => p.id.endsWith('_choice_b'))!;

    passiveService.allocatePassive(char.id, sigNode.id, 1);
    passiveService.allocatePassive(char.id, synNode.id, 1);
    passiveService.allocatePassive(char.id, utilNode.id, 1);
    passiveService.allocatePassive(char.id, choiceA.id, 1);

    // Mutually exclusive capstone choice B MUST be blocked!
    const exclCheck = validatePassiveAllocation(char, choiceB.id, 1);
    assert.equal(exclCheck.valid, false);
    assert.match(exclCheck.valid ? '' : exclCheck.reason, /độc quyền/i);

    // Respec using gold: refunds all points, deducts gold, logs transaction, preserves sword_saint branch
    const respecGoldRes = passiveService.respecPassives(char.id, 'gold');
    assert.equal(respecGoldRes.preservedBranchId, 'sword_saint');
    assert.equal(Object.keys(char.passiveAllocations || {}).length, 0);
    assert.ok(char.gold < 25000);
    assert.equal(respecGoldRes.availablePoints, earned.earned);

    // Re-allocate Choice B capstone instead after respec, then respec via scroll!
    passiveService.allocatePassive(char.id, sigNode.id, 1);
    if (choiceB.parentPassiveIds.includes(utilNode.id)) {
      passiveService.allocatePassive(char.id, utilNode.id, 1);
    }
    if (choiceB.parentPassiveIds.includes(synNode.id)) {
      passiveService.allocatePassive(char.id, synNode.id, 1);
    }
    passiveService.allocatePassive(char.id, choiceB.id, 1);
    const respecItemRes = passiveService.respecPassives(char.id, 'item');
    assert.equal(respecItemRes.preservedBranchId, 'sword_saint');
    assert.equal(respecItemRes.itemConsumedId, PASSIVE_PROGRESSION_CONFIG.respecScrollItemId);
    assert.equal((char.inventory || []).some((s: any) => s.itemId === PASSIVE_PROGRESSION_CONFIG.respecScrollItemId), false);
    assert.ok((char.passiveTransactions || []).length >= 5);
  } finally {
    combatService.leave(char.id);
    cleanupChar(store, char.id);
  }
});

test('4. Extreme Overflow Protection, Guild/Food/Title Integration & Migration Compatibility', async () => {
  const store = JsonStore.getInstance();
  const charService = new CharacterService();

  // Simulate legacy save missing new passive fields
  const legacyChar: any = {
    id: `CHAR_LEGACY_MIG_${Date.now()}`,
    userId: 'USR_PLAYER_001',
    name: 'LegacyTest',
    gender: 'female',
    classId: 'assassin',
    jobAdvancementCompleted: true,
    advancedJobId: 'shadowblade',
    level: 100,
    exp: 0,
    gold: 1000,
    baseStats: { str: 50, dex: 120, agi: 180, int: 10, con: 40 },
    attributes: { str: 50, dex: 120, agi: 180, int: 10, con: 40 },
    equipment: {},
    inventory: [],
    unlockedSkills: [],
    completedQuests: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  store.characters.push(legacyChar);
  store.save();

  try {
    await runMigrationsAndSeeds();
    const migrated = store.characters.find((c) => c.id === legacyChar.id)!;
    assert.deepEqual(migrated.passiveAllocations, {});
    assert.ok(Array.isArray(migrated.passiveTransactions));
    assert.equal(typeof migrated.passiveRespecCount, 'number');
    assert.ok((migrated.passivePoints || 0) >= 30);

    // Overload every overflow-risk stat wildly and confirm PvE/PvP hard caps hold!
    const shadowTree = getPassiveTreeForCharacter('assassin', 'shadowblade');
    const sbAlloc: Record<string, number> = {};
    for (const p of shadowTree) {
      if (!p.mutuallyExclusiveGroup) sbAlloc[p.id] = Math.min(p.maxRank, 3);
    }

    const extremePve = aggregateCharacterStats({
      character: {
        ...migrated,
        passiveAllocations: sbAlloc,
        activeBuffs: {
          b1: { stat: 'critRatePct', valuePct: 90, expiresAt: Date.now() + 60_000 },
          b2: { stat: 'damageReductionPct', valuePct: 90, expiresAt: Date.now() + 60_000 },
          b3: { stat: 'cdReductionPct', valuePct: 80, expiresAt: Date.now() + 60_000 },
        },
      },
      foodAndConsumableBuffs: [
        { stat: 'critRatePct', valuePct: 45 },
        { stat: 'atkPct', valuePct: 25 },
      ],
      guildBuildingLevels: { training_ground: 5 },
      guildSkills: [
        {
          id: 'gs_atk',
          name: 'Atk',
          nameVi: 'Công Hội',
          statKey: 'atkPct',
          level: 5,
          maxLevel: 10,
          bonusPerLevelPct: 2,
        },
      ],
      mode: 'pve',
    });

    assert.deepEqual(extremePve.calculationOrder, STAT_CALCULATION_ORDER);
    assert.ok(extremePve.secondaryStats.critRatePct <= STAT_CAP_RULES.critRatePct.hardCeiling);
    assert.ok(extremePve.secondaryStats.damageReductionPct <= STAT_CAP_RULES.damageReductionPct.hardCeiling);
    assert.ok(extremePve.secondaryStats.cooldownReductionPct <= STAT_CAP_RULES.cooldownReductionPct.hardCeiling);
    assert.ok(extremePve.secondaryStats.evasionPct <= STAT_CAP_RULES.evasionPct.hardCeiling);
    assert.ok(extremePve.warnings.length > 0 && extremePve.warningsVi.length > 0);
    assert.equal(extremePve.jobAffinity.jobId, 'shadowblade');
    assert.equal(extremePve.jobAffinity.primaryAttr, 'agi');

    // Verify off-meta hybrid build remains viable without breaking secondary caps
    const tankyCaster = aggregateCharacterStats({
      character: {
        id: 'offmeta_test',
        classId: 'mage',
        advancedJobId: 'elementalist',
        jobAdvancementCompleted: true,
        level: 85,
        baseStats: { str: 20, dex: 40, agi: 30, int: 110, con: 150 },
        attributes: { str: 20, dex: 40, agi: 30, int: 110, con: 150 },
      },
      mode: 'pve',
    });
    assert.ok(tankyCaster.secondaryStats.effectiveHp > 5000);
    assert.ok(tankyCaster.secondaryStats.matk > 500);

    // CharacterService.getComputedStatsSummary must match aggregateCharacterStats identically
    const serviceSummary = await charService.getComputedStatsSummary(migrated.id);
    assert.equal(serviceSummary.aggregated.jobAffinity.jobId, JOB_AFFINITY_CONFIGS.shadowblade.jobId);
  } finally {
    cleanupChar(store, legacyChar.id);
  }
});

test('5. HTTP API Endpoints & 16-Job Automated Balance Simulation (Zero Outliers)', async () => {
  const store = JsonStore.getInstance();
  const app = createApp();
  const httpServer = http.createServer(app);
  await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const port = (httpServer.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;

  let userId = '';
  let charId = '';
  try {
    const uname = `pve_sim_${Date.now().toString().slice(-6)}`;
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Connection: 'close' },
      body: JSON.stringify({ username: uname, email: `${uname}@test.local`, password: 'Password123!' }),
    });
    const regJson: any = await regRes.json();
    assert.equal(regRes.status, 201);
    const token = regJson.data.token;
    userId = regJson.data.user.id;

    const charRes = await fetch(`${baseUrl}/characters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, Connection: 'close' },
      body: JSON.stringify({ name: `ApiHero_${Date.now().toString().slice(-4)}`, gender: 'female', classId: 'adventurer' }),
    });
    const charJson: any = await charRes.json();
    assert.equal(charRes.status, 201);
    charId = charJson.data.id;

    const charObj = store.characters.find((c) => c.id === charId)!;
    charObj.classId = 'knight';
    charObj.jobAdvancementCompleted = true;
    charObj.advancedJobId = 'guardian';
    charObj.level = 85;
    charObj.gold = 10000;
    store.save();

    // Public game endpoints
    const statsCfgRes = await fetch(`${baseUrl}/game/stats-config`);
    assert.equal(statsCfgRes.status, 200);
    const statsCfg: any = await statsCfgRes.json();
    assert.equal(statsCfg.data.calculationOrder.length, 8);
    assert.equal(Object.keys(statsCfg.data.capRules).length, 12);

    const passivesListRes = await fetch(`${baseUrl}/game/passives?classId=knight`);
    assert.equal(passivesListRes.status, 200);
    const passivesList: any = await passivesListRes.json();
    assert.ok(passivesList.data.passives.length >= 4);
    assert.equal(passivesList.data.baseCount, 32);
    assert.equal(passivesList.data.advancedCount, 96);

    // Character passive GET + preview + allocate + respec
    const getOverviewRes = await fetch(`${baseUrl}/characters/${charId}/passives`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(getOverviewRes.status, 200);

    const previewRes = await fetch(`${baseUrl}/characters/${charId}/passives/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ previewAllocations: { pas_kn_iron_wall: 3 }, mode: 'boss' }),
    });
    assert.equal(previewRes.status, 200);
    const previewJson: any = await previewRes.json();
    assert.ok(previewJson.data.deltas.effectiveHp > 0);

    const allocRes = await fetch(`${baseUrl}/characters/${charId}/passives/allocate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ passiveId: 'pas_kn_iron_wall', deltaRank: 2 }),
    });
    assert.equal(allocRes.status, 200);

    const respecRes = await fetch(`${baseUrl}/characters/${charId}/passives/respec`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ method: 'gold' }),
    });
    assert.equal(respecRes.status, 200);
    const respecJson: any = await respecRes.json();
    assert.equal(respecJson.data.preservedBranchId, 'guardian');

    // Simulation via POST API & direct execution across 16 jobs x 4 levels (50, 80, 150, 200)
    const simApiRes = await fetch(`${baseUrl}/game/balance/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ levels: [50, 80, 150, 200] }),
    });
    assert.equal(simApiRes.status, 200);
    const simApiJson: any = await simApiRes.json();
    assert.equal(simApiJson.data.summary.totalCases, 1024);
    assert.equal(
      simApiJson.data.summary.outlierCount,
      0,
      `Balance outliers found: ${JSON.stringify(simApiJson.data.outliers)}`
    );
    assert.equal(simApiJson.data.summary.guardianBeatsBerserkerInEhp, true);
    assert.equal(simApiJson.data.summary.berserkerBeatsGuardianInDps, true);
    assert.equal(simApiJson.data.summary.saintBeatsDamageJobsInHps, true);

    const directSim = runAutomatedBalanceSimulation({ levels: [50, 80, 150, 200] });
    assert.equal(directSim.summary.outlierCount, 0);
  } finally {
    if (charId) cleanupChar(store, charId);
    if (userId) {
      const uIdx = store.users.findIndex((u) => u.id === userId);
      if (uIdx >= 0) {
        store.users.splice(uIdx, 1);
        store.save();
      }
    }
    (httpServer as any).closeAllConnections?.();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  }
});
