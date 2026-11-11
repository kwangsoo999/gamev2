import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {
  ADVANCED_BRANCH_SKILLS,
  ADVANCED_JOB_BY_ID,
  ADVANCED_JOB_DEFINITIONS,
  FIRST_JOB_CLASS_IDS,
  INITIAL_SKILLS,
  applyCombatMasteryGain,
  computeSkillActionPower,
  getAdvancedBranchesForClass,
  getMasteryRankFromPoints,
  getSkillTreeForClass,
  normalizeBaseClassId,
  resolveSkillEvolutionState,
} from '@elysia/game-data-schema';
import {
  CLASS_VFX_PROFILES,
  VFXManager,
  computeVisualEvolutionTier,
} from '@elysia/vfx-engine';
import { createApp } from '../app.js';
import { JsonStore } from '../database/jsonStore.js';
import { runMigrationsAndSeeds } from '../database/migrations.js';
import { CharacterService } from '../services/character.service.js';
import { CombatService } from '../services/combat.service.js';
import { DungeonService } from '../services/dungeon.service.js';
import { JobService } from '../services/job.service.js';
import { setupGameSockets } from '../sockets/gameSocket.js';

function cleanupChar(store: JsonStore, charId: string) {
  const idx = store.characters.findIndex((c) => c.id === charId);
  if (idx >= 0) {
    store.characters.splice(idx, 1);
    store.save();
  }
}

async function awakenDirectForTest(char: any, classId: 'swordsman' | 'monk' | 'mage' | 'assassin' | 'knight' | 'spearman' | 'fighter' | 'archer') {
  const statPresets: Record<string, any> = {
    swordsman: { str: 36, dex: 24, agi: 14, int: 10, con: 14 },
    spearman: { str: 24, dex: 36, agi: 16, int: 10, con: 14 },
    knight: { str: 20, dex: 14, agi: 10, int: 10, con: 38 },
    monk: { str: 10, dex: 14, agi: 12, int: 34, con: 28 },
    mage: { str: 10, dex: 20, agi: 14, int: 42, con: 12 },
    assassin: { str: 16, dex: 24, agi: 40, int: 10, con: 10 },
    fighter: { str: 32, dex: 16, agi: 32, int: 10, con: 14 },
    archer: { str: 12, dex: 40, agi: 30, int: 10, con: 10 },
  };
  char.baseStats = { ...statPresets[classId] };
  char.attributes = { ...char.baseStats };
  char.level = 15;
  if (!Array.isArray(char.completedQuests)) char.completedQuests = [];
  if (!char.completedQuests.includes('QUEST_001_SLIME_CLEAR')) {
    char.completedQuests.push('QUEST_001_SLIME_CLEAR');
  }
  JsonStore.getInstance().save();

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
  let res = dungeon.attackBoss(inst.instanceId, char.id, 30);
  let i = 0;
  while (!res.bossDefeated && i++ < 12) {
    res = dungeon.attackBoss(inst.instanceId, char.id, 30);
  }
  assert.equal(res.bossDefeated, true);
  return job.awakenCharacter(char.id);
}

test.before(async () => {
  await runMigrationsAndSeeds();
});

test('1. Eight Base Classes -> 16 Lv.80 Branches, 64 Exclusive Skills & Distinct VFX Profiles', () => {
  assert.equal(ADVANCED_JOB_DEFINITIONS.length, 16);
  assert.equal(ADVANCED_BRANCH_SKILLS.length, 64);

  for (const baseJob of FIRST_JOB_CLASS_IDS) {
    const branches = getAdvancedBranchesForClass(baseJob);
    assert.equal(branches.length, 2, `Expected 2 Lv.80 branches for ${baseJob}`);
    assert.equal(branches[0].incompatibleBranchId, branches[1].id);
    assert.equal(branches[1].incompatibleBranchId, branches[0].id);

    // Distinct visual styling between twin branches
    assert.notEqual(branches[0].vfxProfile.styleCategory, branches[1].vfxProfile.styleCategory);
    assert.notEqual(branches[0].vfxProfile.trailStyle, branches[1].vfxProfile.trailStyle);
    assert.notEqual(branches[0].vfxProfile.primaryColor, branches[1].vfxProfile.primaryColor);

    // Without branch ID: base skill tree preserves 13 skills
    const baseTree = getSkillTreeForClass(baseJob, INITIAL_SKILLS);
    assert.equal(baseTree.length, 13);

    // With branch ID: includes 13 base + 4 exclusive branch skills = 17 skills
    for (const br of branches) {
      assert.equal(br.unlockLevel, 80);
      assert.equal(br.isPermanent, true);
      assert.equal(br.exclusiveSkillIds.length, 4);
      const branchTree = getSkillTreeForClass(baseJob, INITIAL_SKILLS, br.id);
      assert.equal(branchTree.length, 17);
      assert.ok(CLASS_VFX_PROFILES[br.id], `Missing VFX profile for ${br.id}`);
    }
  }

  // Priest alias maps cleanly to Monk base + Saint / Exorcist branches
  assert.equal(normalizeBaseClassId('priest'), 'monk');
  const priestBranches = getAdvancedBranchesForClass('priest').map((b) => b.id).sort();
  assert.deepEqual(priestBranches, ['exorcist', 'saint']);
});

test('2. Server Authoritative Lv.80 Evolution, Permanent Lock & Incompatible Branch Enforcement', async () => {
  const store = JsonStore.getInstance();
  const charSvc = new CharacterService();
  const jobSvc = JobService.getInstance();
  const combat = CombatService.getSharedInstance();

  const char = await charSvc.createCharacter(`USR_EVO_${Date.now()}`, {
    name: `EvoHero_${Date.now().toString().slice(-4)}`,
    gender: 'male',
    classId: 'adventurer',
  });

  try {
    await awakenDirectForTest(char, 'swordsman');
    assert.equal(char.classId, 'swordsman');

    // Reject Lv. < 80
    char.level = 79;
    store.save();
    assert.throws(() => jobSvc.selectLv80AdvancedJob(char.id, 'sword_saint'), /Lv\.80/);

    // Reach Lv.80, still reject wrong parent class branch (Dragoon belongs to Spearman)
    char.level = 80;
    store.save();
    assert.throws(() => jobSvc.selectLv80AdvancedJob(char.id, 'dragoon'), /chỉ dành cho nghề Spearman/i);

    // Valid Sword Saint permanent lock
    const evoRes = jobSvc.selectLv80AdvancedJob(char.id, 'sword_saint');
    assert.equal(evoRes.success, true);
    assert.equal(evoRes.advancedJobId, 'sword_saint');
    assert.equal(evoRes.isPermanent, true);
    assert.equal(char.advancedJobId, 'sword_saint');
    assert.equal(char.evolutionTier, 3);

    // Reject attempting to change to twin branch Berserker after permanent lock
    assert.throws(() => jobSvc.selectLv80AdvancedJob(char.id, 'berserker'), /khóa vĩnh viễn/i);

    // Reject learning Berserker exclusive skill
    await assert.rejects(
      () => charSvc.learnOrUpgradeSkill(char.id, 'skill_bk_crimson_guillotine'),
      /không thể học hoặc trang bị kỹ năng độc quyền của nhánh berserker/i
    );

    // Reject casting Berserker exclusive skill in CombatService
    char.regionId = 'map_goblin_outpost';
    char.x = 400;
    char.y = 400;
    store.save();
    combat.join(char.userId!, char.id);
    const mons = combat.getRegionMonsters(char.regionId);
    const target = mons[0];
    assert.ok(target, 'Expected monster in map_goblin_outpost');
    combat.move(char.id, target.x - 40, target.y);

    assert.throws(
      () => combat.attack(char.id, { actionType: 'skill', skillId: 'skill_bk_crimson_guillotine', targetId: target.id }),
      /không tương thích/i
    );

    // Can learn & upgrade Sword Saint exclusive skill up to Lv.10!
    char.skillPoints = 12;
    store.save();
    for (let lv = 2; lv <= 10; lv++) {
      const upg = await charSvc.learnOrUpgradeSkill(char.id, 'skill_ss_iaido_flash');
      assert.equal(upg.newLevel, lv);
    }
    await assert.rejects(() => charSvc.learnOrUpgradeSkill(char.id, 'skill_ss_iaido_flash'), /tối đa/);
  } finally {
    combat.leave(char.id);
    cleanupChar(store, char.id);
  }
});

test('3. Skill Level (1-10) vs Mastery (0-100), Combat Usage Rules & Anti-Exploit Protection', () => {
  const fireball = INITIAL_SKILLS.find((s) => s.id === 'skill_fireball')!;
  const shadowStrike = INITIAL_SKILLS.find((s) => s.id === 'skill_shadow_strike')!;
  const holyHeal = INITIAL_SKILLS.find((s) => s.id === 'skill_holy_light')!;

  // Rank thresholds 0..100
  assert.equal(getMasteryRankFromPoints(0), 'novice');
  assert.equal(getMasteryRankFromPoints(20), 'apprentice');
  assert.equal(getMasteryRankFromPoints(40), 'adept');
  assert.equal(getMasteryRankFromPoints(60), 'expert');
  assert.equal(getMasteryRankFromPoints(80), 'master');
  assert.equal(getMasteryRankFromPoints(100), 'grandmaster');

  // Anti-exploit: dead target, safe zone, or missed hit yield 0 mastery gain
  const deadRes = applyCombatMasteryGain(undefined, fireball, {
    nowMs: 1000,
    isValidTargetAlive: false,
    isSafeZone: false,
    didConnectEffect: true,
  });
  assert.equal(deadRes.gainedPoints, 0);

  const safeZoneRes = applyCombatMasteryGain(undefined, fireball, {
    nowMs: 1000,
    isValidTargetAlive: true,
    isSafeZone: true,
    didConnectEffect: true,
  });
  assert.equal(safeZoneRes.gainedPoints, 0);

  // Valid combat hit gains points & rate-window prevents instant macro spam
  const valid1 = applyCombatMasteryGain(undefined, fireball, {
    nowMs: 2000,
    isValidTargetAlive: true,
    isSafeZone: false,
    didConnectEffect: true,
  });
  assert.ok(valid1.gainedPoints > 0);
  const spamTooFast = applyCombatMasteryGain(valid1.updated, fireball, {
    nowMs: 2100,
    isValidTargetAlive: true,
    isSafeZone: false,
    didConnectEffect: true,
  });
  assert.equal(spamTooFast.gainedPoints, 0);

  // Identity-specific evolution milestones
  const fbLv1 = resolveSkillEvolutionState(fireball, 1, 0);
  const fbLv5 = resolveSkillEvolutionState(fireball, 5, 45);
  const fbLv7 = resolveSkillEvolutionState(fireball, 7, 65);
  const fbLv10Max = resolveSkillEvolutionState(fireball, 10, 100);
  assert.ok(fbLv5.effectiveAreaRadius > fbLv1.effectiveAreaRadius, 'Fireball Lv.5 widens AoE');
  assert.ok(fbLv7.totalProjectiles > fbLv1.totalProjectiles, 'Fireball Lv.7 splits shrapnel/projectiles');
  assert.ok(fbLv7.unlockedVfxTags.includes('shrapnel_fragments'));
  assert.equal(fbLv10Max.evolutionTier, 5);
  assert.equal(fbLv10Max.masteryRank, 'grandmaster');

  const ssLv1 = resolveSkillEvolutionState(shadowStrike, 1, 0);
  const ssLv10 = resolveSkillEvolutionState(shadowStrike, 10, 90);
  assert.equal(ssLv1.totalHitCount, 1);
  assert.equal(ssLv10.totalHitCount, 3);
  assert.equal(ssLv10.executeThresholdPct, 35);

  const healLv1 = resolveSkillEvolutionState(holyHeal, 1, 0);
  const healLv10 = resolveSkillEvolutionState(holyHeal, 10, 90);
  assert.equal(healLv1.cleanseCount, 0);
  assert.ok(healLv10.cleanseCount >= 2);
  assert.equal(healLv10.secondarySplashPct, 45);
  assert.equal(healLv10.unlocksGroundField, true);
  assert.ok(healLv10.unlockedVfxTags.includes('golden_field'));

  // Power calculation integrates skillLv AND masteryPoints separately
  const zeroMastery = computeSkillActionPower(
    fireball,
    10,
    { str: 10, dex: 20, agi: 14, int: 80, con: 14 },
    20,
    240,
    30,
    {
      atkPct: 0, matkPct: 0, defPct: 0, mdefPct: 0, hpPct: 0, mpPct: 0,
      critRatePct: 0, critDamagePct: 0, aspdPct: 0, moveSpeedPct: 0,
      fleeFlat: 0, hitFlat: 0, skillDamagePct: 0, healingPowerPct: 0,
      damageReductionPct: 0, mpCostReductionPct: 0, lifestealPct: 0, bonusRange: 0,
    },
    0
  );
  const grandMastery = computeSkillActionPower(
    fireball,
    10,
    { str: 10, dex: 20, agi: 14, int: 80, con: 14 },
    20,
    240,
    30,
    {
      atkPct: 0, matkPct: 0, defPct: 0, mdefPct: 0, hpPct: 0, mpPct: 0,
      critRatePct: 0, critDamagePct: 0, aspdPct: 0, moveSpeedPct: 0,
      fleeFlat: 0, hitFlat: 0, skillDamagePct: 0, healingPowerPct: 0,
      damageReductionPct: 0, mpCostReductionPct: 0, lifestealPct: 0, bonusRange: 0,
    },
    100
  );
  assert.ok(grandMastery.rawPower > zeroMastery.rawPower, 'Grandmaster Mastery boosts skill power above 0 Mastery');
});

test('4. Layered VFX Engine Object Pooling, Bounds Cap, Hit-Stop, Screen-Shake & Cleanup', () => {
  const vfx = new VFXManager(null, 1280, 720);
  assert.equal(computeVisualEvolutionTier(1, 0), 0);
  assert.equal(computeVisualEvolutionTier(5, 40), 2);
  assert.equal(computeVisualEvolutionTier(10, 100), 5);

  for (const job of ADVANCED_JOB_DEFINITIONS) {
    vfx.spawnLayeredSkillVfx({
      skillKey: `vfx_${job.id}_ult`,
      classOrBranchId: job.id,
      skillType: 'ultimate',
      source: { x: 400, y: 400 },
      target: { x: 520, y: 420 },
      areaRadius: 160,
      skillLevel: 10,
      masteryPoints: 100,
      hitCount: 3,
      projectileCount: 3,
      isCrit: true,
      vfxTags: ['shrapnel_fragments'],
    });
  }

  const midStats = vfx.getStats();
  assert.ok(midStats.activeParticles > 0 && midStats.activeParticles <= 420);
  assert.ok(midStats.activeSlashArcs > 0 && midStats.activeSlashArcs <= 48);
  assert.ok(midStats.activeCircles > 0 && midStats.activeCircles <= 32);
  assert.equal(vfx.isHitStopped(), true);
  const shakeBefore = vfx.getScreenShakeOffset();
  assert.ok(Math.hypot(shakeBefore.x, shakeBefore.y) > 0);

  // Advance frames until particles expire back into object pools
  for (let i = 0; i < 40; i++) {
    vfx.update(0.05);
  }
  const afterStats = vfx.getStats();
  assert.equal(afterStats.activeParticles, 0);
  assert.equal(afterStats.activeSlashArcs, 0);
  assert.equal(afterStats.activeCircles, 0);
  assert.equal(vfx.isHitStopped(), false);

  // Spawn again to confirm pool recycling
  vfx.spawnLayeredSkillVfx({
    skillKey: 'vfx_sword_saint_flash',
    classOrBranchId: 'sword_saint',
    skillType: 'slash',
    source: { x: 200, y: 200 },
    target: { x: 260, y: 210 },
  });
  assert.ok(vfx.getStats().pooledRecycledCount > 0, 'Expected recycled pooled objects');

  vfx.dispose();
  const disposed = vfx.getStats();
  assert.equal(disposed.activeParticles, 0);
  assert.equal(disposed.activeCircles, 0);
});

test('5. HTTP Routes, Combat Mastery Gain & GameSocket combat:result VFX/Mastery Broadcast', async () => {
  const app = createApp();
  const httpServer = http.createServer(app);
  await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const addr = httpServer.address() as any;
  const baseUrl = `http://127.0.0.1:${addr.port}`;

  const store = JsonStore.getInstance();
  const charSvc = new CharacterService();

  const uname = `evo_${Date.now().toString().slice(-8)}`;
  const regHttp = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: uname, email: `${uname}@elysia.test`, password: 'StrongPass!123' }),
  });
  const regBody: any = await regHttp.json();
  assert.equal(regBody.success, true, JSON.stringify(regBody));
  const token = regBody.data.token || regBody.data.accessToken || regBody.data.tokens?.accessToken;
  const userId = regBody.data.user.id;
  const char = await charSvc.createCharacter(userId, {
    name: `VfxTester_${Date.now().toString().slice(-4)}`,
    gender: 'female',
    classId: 'adventurer',
  });

  try {
    await awakenDirectForTest(char, 'mage');
    char.level = 82;
    char.regionId = 'map_goblin_outpost';
    char.x = 400;
    char.y = 400;
    store.save();

    // Public advanced-jobs catalog endpoint
    const catRes = await fetch(`${baseUrl}/api/v1/game/advanced-jobs?parentClassId=mage`);
    const catJson = await catRes.json();
    assert.equal(catJson.success, true);
    assert.equal(catJson.data.length, 2);

    // Character-specific options + permanent Lv.80 selection
    const optRes = await fetch(`${baseUrl}/api/v1/job/advanced-jobs/${char.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const optJson = await optRes.json();
    assert.equal(optJson.success, true, `GET /advanced-jobs failed: ${JSON.stringify(optJson)}`);
    assert.equal(optJson.data.eligible, true, `Expected eligible=true, got: ${JSON.stringify(optJson.data)}`);

    const pickRes = await fetch(`${baseUrl}/api/v1/job/advance-lv80`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ characterId: char.id, branchId: 'elementalist' }),
    });
    const pickJson = await pickRes.json();
    assert.equal(pickJson.success, true);
    assert.equal(pickJson.data.advancedJobId, 'elementalist');

    // Re-check locked state on GET options + POST second branch blocked with 403
    const rePickRes = await fetch(`${baseUrl}/api/v1/job/advance-lv80`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ characterId: char.id, branchId: 'arcanist' }),
    });
    assert.equal(rePickRes.status, 403);

    // Verify setupGameSockets broadcasts full Lv.80 VFX & Mastery metadata on combat:result
    const emittedEvents: Array<{ room: string; event: string; payload: any }> = [];
    const handlers: Record<string, Function> = {};
    let connectionCb: Function | null = null;
    const fakeIo: any = {
      use: () => {},
      on: (evt: string, cb: Function) => {
        if (evt === 'connection') connectionCb = cb;
      },
      emit: () => {},
      to: (room: string) => ({
        emit: (event: string, payload: any) => emittedEvents.push({ room, event, payload }),
      }),
      sockets: { sockets: new Map() },
    };
    setupGameSockets(fakeIo);
    const fakeSocket: any = {
      id: `sock_${Date.now()}`,
      data: { user: { id: userId, username: uname, role: 'player' } },
      on: (evt: string, cb: Function) => {
        handlers[evt] = cb;
      },
      emit: () => {},
      join: () => {},
      leave: () => {},
      to: () => ({ emit: () => {} }),
      broadcast: { emit: () => {} },
    };
    connectionCb!(fakeSocket);

    const monsters = CombatService.getSharedInstance().getRegionMonsters('map_goblin_outpost');
    assert.ok(monsters.length > 0);
    const mon = monsters[0];
    char.x = mon.x - 30;
    char.y = mon.y;
    store.save();

    handlers['player:join']({ characterId: char.id }, () => {});
    handlers['player:change_region']({ targetRegionId: 'map_goblin_outpost' }, () => {});
    const pState = CombatService.getSharedInstance().getPlayer(char.id)!;
    pState.x = mon.x - 30;
    pState.y = mon.y;

    let ackData: any = null;
    handlers['player:combat_action'](
      { actionType: 'skill', skillId: 'skill_el_tri_convergence', targetId: mon.id },
      (res: any) => {
        ackData = res;
      }
    );
    assert.equal(ackData?.success, true, `combat_action failed: ${JSON.stringify(ackData)}`);

    const broadcastEvt = emittedEvents.find((e) => e.event === 'combat:result');
    assert.ok(broadcastEvt, 'Expected combat:result event emitted to region room');
    const broadcast = broadcastEvt!.payload;
    assert.equal(broadcast.skillId, 'skill_el_tri_convergence');
    assert.equal(broadcast.advancedJobId, 'elementalist');
    assert.equal(broadcast.vfxId, 'vfx_elementalist_triad');
    assert.ok(broadcast.damage > 0);
    assert.ok(broadcast.masteryPoints >= 2);
    assert.ok(broadcast.areaRadius >= 150);
  } finally {
    CombatService.getSharedInstance().leave(char.id);
    cleanupChar(store, char.id);
    const uIdx = store.users.findIndex((u) => u.id === userId);
    if (uIdx >= 0) {
      store.users.splice(uIdx, 1);
      store.save();
    }
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  }
});
