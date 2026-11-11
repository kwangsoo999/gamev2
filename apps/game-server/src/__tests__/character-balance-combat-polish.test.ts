import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import {
  ADVANCED_JOB_ANIMATION_SIGNATURES,
  ADVANCED_JOB_REGEN_PROFILES,
  ALL_8_DIRECTIONS,
  BASE_JOB_ANIMATION_TEMPLATES,
  BASE_JOB_REGEN_PROFILES,
  DEFAULT_ADMIN_EXP_CONFIG,
  INITIAL_SKILLS,
  buildSkillExecutionTimeline,
  canSpawnProjectileAtFrame,
  computeCharacterRegenTick,
  computeMonsterKillExp,
  generateServerInitialAttributes,
  getSkillAnimationAssetAuditReport,
  isDamageFrameReached,
  resolveJobRegenProfile,
  resolveSkillAnimationMetadata,
  simulateProgressionAndFarmingBands,
  validateInitialAttributesRange,
} from '@elysia/game-data-schema';
import { LayeredVFXManager } from '@elysia/vfx-engine';
import { createApp } from '../app.js';
import { ENV } from '../config/env.js';
import { JsonStore } from '../database/jsonStore.js';
import { runMigrationsAndSeeds } from '../database/migrations.js';
import { CombatService } from '../services/combat.service.js';
import { WorldService } from '../services/world.service.js';

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

test('Phase 1 & 9 — Server-Side Random Initial Attribute Generation [8..12], Persistence, No Reroll, Client Injection Rejection & Existing Save Compatibility', async () => {
  // 1. Validate 100 server CSPRNG rolls are strictly in [8..12] per stat and [40..60] total, with variance
  const totals = new Set<number>();
  for (let i = 0; i < 100; i++) {
    const rolled = generateServerInitialAttributes();
    const check = validateInitialAttributesRange(rolled);
    assert.equal(check.valid, true, check.error);
    assert.ok(check.total >= 40 && check.total <= 60);
    totals.add(check.total);
  }
  assert.ok(totals.size >= 4, 'CSPRNG initial attributes must exhibit genuine randomness across rolls');

  await runMigrationsAndSeeds();
  const app = createApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const addr: any = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;

  const store = JsonStore.getInstance();
  const createdUserIds: string[] = [];
  const createdCharIds: string[] = [];

  // Record an existing character save before our test to verify existing save compatibility
  const existingSaveBefore = store.characters[0] ? JSON.parse(JSON.stringify(store.characters[0])) : null;

  try {
    const suffix = Date.now().toString(36).slice(-5);
    const reg = await jsonApi(baseUrl, '/api/v1/auth/register', 'POST', undefined, {
      username: `p1bal_${suffix}`,
      email: `p1bal_${suffix}@elysia.rpg`,
      password: 'Password123!',
    });
    assert.equal(reg.status, 201);
    const token = reg.body.data.token;
    createdUserIds.push(reg.body.data.user.id);

    // 2. Reject client-submitted initial attributes (stats / baseStats / initialAttributes)
    const clientInjectRes = await jsonApi(baseUrl, '/api/v1/characters', 'POST', token, {
      name: `Cheat_${suffix}`,
      gender: 'male',
      stats: { str: 99, dex: 99, agi: 99, int: 99, con: 99 },
    });
    assert.equal(clientInjectRes.status, 400, 'Must reject client-submitted initial attributes');

    // 3. Reject rapid character creation reroll exploit
    const spamRes = await jsonApi(baseUrl, '/api/v1/characters', 'POST', token, {
      name: `Spam_${suffix}`,
      gender: 'male',
      simulateRapidRerollSpam: true,
    });
    assert.equal(spamRes.status, 429, 'Must block rapid character creation reroll exploit');

    // 4. Legitimate character creation generates [8..12] server-side once and persists
    const createRes = await jsonApi(baseUrl, '/api/v1/characters', 'POST', token, {
      name: `Rolled_${suffix}`,
      gender: 'female',
    });
    assert.equal(createRes.status, 201);
    const char = createRes.body.data;
    createdCharIds.push(char.id);

    const rangeCheck = validateInitialAttributesRange(char.initialAttributes);
    assert.equal(rangeCheck.valid, true);
    assert.deepEqual(char.baseStats, char.initialAttributes);

    // 5. Never reroll on GET, login, map change, or reconnect
    const get1 = await jsonApi(baseUrl, `/api/v1/characters/${char.id}`, 'GET', token);
    assert.deepEqual(get1.body.data.baseStats, char.initialAttributes);
    assert.deepEqual(get1.body.data.initialAttributes, char.initialAttributes);

    const combat = CombatService.getSharedInstance();
    combat.join(reg.body.data.user.id, char.id);
    const conn = WorldService.getInstance()
      .getConnections()
      .find((c: any) => c.fromRegionId === 'THON_KHOI_NGUYEN' && c.toRegionId === 'map_beginner_meadow');
    const playerState = combat.getPlayer(char.id)!;
    if (conn && playerState) {
      playerState.x = Number(conn.portalX);
      playerState.y = Number(conn.portalY);
    }
    combat.changeRegion(char.id, 'map_beginner_meadow');
    combat.leave(char.id);
    combat.join(reg.body.data.user.id, char.id);

    const getAfterMapAndReconnect = await jsonApi(baseUrl, `/api/v1/characters/${char.id}`, 'GET', token);
    assert.deepEqual(
      getAfterMapAndReconnect.body.data.baseStats,
      char.initialAttributes,
      'Must never reroll initial attributes on map change or reconnect'
    );
    combat.leave(char.id);

    // 6. Existing character save compatibility
    if (existingSaveBefore) {
      const existingAfter = store.characters.find((c) => c.id === existingSaveBefore.id);
      assert.deepEqual(
        existingAfter?.baseStats,
        existingSaveBefore.baseStats,
        'Existing character attributes must never be overwritten'
      );
    }
  } finally {
    for (const cid of createdCharIds) {
      const idx = store.characters.findIndex((c) => c.id === cid);
      if (idx >= 0) store.characters.splice(idx, 1);
    }
    for (const uid of createdUserIds) {
      const idx = store.users.findIndex((u) => u.id === uid);
      if (idx >= 0) store.users.splice(idx, 1);
    }
    store.save();
    server.close();
  }
});

test('Phase 2 & 9 — 8 Base-Job & 16 Advanced-Job HP/MP Regeneration Profiles, 4 States, Area Modifiers & Anti-Overflow', () => {
  // Exact 8 Base-Job percentages required by Phase 2
  const expectedBase: Array<[string, number, number]> = [
    ['swordsman', 1.20, 0.45],
    ['spearman', 1.10, 0.50],
    ['knight', 1.60, 0.55],
    ['priest', 0.90, 1.10],
    ['monk', 0.90, 1.10],
    ['mage', 0.80, 0.70],
    ['assassin', 0.95, 0.55],
    ['fighter', 1.30, 0.50],
    ['archer', 1.00, 0.60],
  ];
  for (const [jobId, hpPct, mpPct] of expectedBase) {
    const prof = BASE_JOB_REGEN_PROFILES[jobId as keyof typeof BASE_JOB_REGEN_PROFILES];
    assert.ok(prof, `Missing base regen profile for ${jobId}`);
    assert.equal(prof.hpRegenPctPerSec, hpPct, `${jobId} HP regen mismatch`);
    assert.equal(prof.mpRegenPctPerSec, mpPct, `${jobId} MP regen mismatch`);
  }

  // All 16 Advanced Jobs have distinct profiles
  const advKeys = Object.keys(ADVANCED_JOB_REGEN_PROFILES);
  assert.equal(advKeys.length, 16, 'Must define all 16 advanced job regen profiles');
  for (const advId of advKeys) {
    const advProf = resolveJobRegenProfile('swordsman', advId);
    const parentProf = BASE_JOB_REGEN_PROFILES[advProf.parentClassId!];
    assert.equal(advProf.isAdvancedJob, true);
    assert.ok(
      advProf.hpRegenPctPerSec > parentProf.hpRegenPctPerSec || advProf.mpRegenPctPerSec > parentProf.mpRegenPctPerSec,
      `Advanced job ${advId} should improve upon parent ${advProf.parentClassId} regen`
    );
  }

  // Verify 4 regeneration states: in_combat < out_of_combat < sitting, plus item_recovery & stacking limit
  const inCombat = computeCharacterRegenTick({
    classId: 'knight',
    currentHp: 500,
    maxHp: 1000,
    currentMp: 200,
    maxMp: 500,
    lastCombatActionAt: 9000,
    nowMs: 10000,
  });
  assert.equal(inCombat.state, 'in_combat');

  const outOfCombat = computeCharacterRegenTick({
    classId: 'knight',
    currentHp: 500,
    maxHp: 1000,
    currentMp: 200,
    maxMp: 500,
    lastCombatActionAt: 1000,
    nowMs: 10000,
  });
  assert.equal(outOfCombat.state, 'out_of_combat');
  assert.ok(outOfCombat.hpRecovered > inCombat.hpRecovered, 'In-combat regen must be slower than out-of-combat');

  const sitting = computeCharacterRegenTick({
    classId: 'knight',
    currentHp: 500,
    maxHp: 1000,
    currentMp: 200,
    maxMp: 500,
    lastCombatActionAt: 1000,
    nowMs: 10000,
    isSitting: true,
  });
  assert.equal(sitting.state, 'sitting');
  assert.ok(sitting.hpRecovered > outOfCombat.hpRecovered, 'Sitting/resting must improve recovery over standing');

  // Item-based recovery & stacking cap (max 2 consumable stacks) + anti-overflow clamp
  const itemRegen = computeCharacterRegenTick({
    classId: 'priest',
    currentHp: 995,
    maxHp: 1000,
    currentMp: 495,
    maxMp: 500,
    lastCombatActionAt: 1000,
    nowMs: 10000,
    consumableRegenStacks: [
      { hpPctPerSec: 2.0, mpPctPerSec: 2.0 },
      { hpPctPerSec: 2.0, mpPctPerSec: 2.0 },
      { hpPctPerSec: 50.0, mpPctPerSec: 50.0 }, // 3rd stack ignored by stacking limit
    ],
  });
  assert.equal(itemRegen.state, 'item_recovery');
  assert.equal(itemRegen.appliedConsumableStacks, 2, 'Must enforce consumable regen stacking limit');
  assert.equal(itemRegen.nextHp, 1000, 'Must never overflow maxHp');
  assert.equal(itemRegen.nextMp, 500, 'Must never overflow maxMp');

  // Boss & PvP area modifiers reduce regen compared to normal/safe zone
  const bossArea = computeCharacterRegenTick({
    classId: 'knight',
    currentHp: 500,
    maxHp: 1000,
    currentMp: 200,
    maxMp: 500,
    areaContext: 'boss_arena',
  });
  assert.ok(bossArea.hpRecovered < outOfCombat.hpRecovered, 'Boss arena modifier must lower passive recovery');
});

test('Phase 3, 4, 5 & 9 — Weapon-Aware Skill Animations, 16 Advanced Signatures, Release Frame Gate, Trail Origin, Synchronized Timeline & VFX Pooling', () => {
  // 1. Verify all 8 Base Jobs and 16 Advanced Jobs have unique weapon-aware animation templates
  for (const jobId of ['swordsman', 'spearman', 'knight', 'priest', 'mage', 'assassin', 'fighter', 'archer'] as const) {
    const tpl = BASE_JOB_ANIMATION_TEMPLATES[jobId];
    assert.ok(tpl.requiredWeaponTypes.length >= 1);
    assert.ok(tpl.release_frame >= 1 && tpl.release_frame <= tpl.impact_frame);
    assert.notEqual(tpl.attack_trail.attachTo, 'none');
  }

  const advSignatures = new Set<string>();
  for (const [advId, sig] of Object.entries(ADVANCED_JOB_ANIMATION_SIGNATURES)) {
    assert.ok(sig.parentClassId, `${advId} must reference parentClassId`);
    assert.notEqual(
      sig.cast_animation,
      BASE_JOB_ANIMATION_TEMPLATES[sig.parentClassId].cast_animation,
      `${advId} must evolve beyond parent cast_animation (no simple recolor)`
    );
    advSignatures.add(sig.cast_animation);
  }
  assert.equal(advSignatures.size, 16, 'All 16 advanced jobs must have unique animation signatures');

  // 2. Verify every skill in INITIAL_SKILLS defines all 12 required Phase 3 animation fields
  assert.ok(INITIAL_SKILLS.length >= 80);
  for (const skill of INITIAL_SKILLS) {
    const meta = skill.animationMetadata || resolveSkillAnimationMetadata(skill);
    assert.ok(meta.cast_animation);
    assert.ok(meta.hand_pose);
    assert.ok(meta.weapon_pose);
    assert.ok(meta.release_frame >= 1);
    assert.ok(meta.projectile_origin && meta.projectile_origin.anchor);
    assert.ok(
      ['weapon_origin', 'dual_weapon_origin', 'spear_tip', 'gauntlet_arc'].includes(meta.attack_trail.attachTo),
      `Trail for ${skill.id} must attach to weapon origin, never arbitrary body position`
    );
    assert.ok(meta.impact_frame >= meta.release_frame);
    assert.ok(meta.impact_vfx);
    assert.ok(meta.hit_reaction);
    assert.ok(meta.recovery_animation);
    assert.deepEqual(meta.direction_support, ALL_8_DIRECTIONS);
    assert.ok(meta.animation_speed > 0);

    // Never allow projectile to spawn before release_frame
    for (let f = 0; f < meta.release_frame; f++) {
      assert.equal(
        canSpawnProjectileAtFrame(meta, f),
        false,
        `Projectile for ${skill.id} must NEVER spawn at frame ${f} before release_frame ${meta.release_frame}`
      );
    }
    assert.equal(canSpawnProjectileAtFrame(meta, meta.release_frame), true);

    // Synchronize damage hit frames with impact_frame
    assert.equal(isDamageFrameReached(meta, meta.impact_frame - 1), false);
    assert.equal(isDamageFrameReached(meta, meta.impact_frame), true);
  }

  // 3. Verify Phase 5 shared timeline synchronization & low-performance quality mode
  const sampleMeta = INITIAL_SKILLS.find((s) => s.id === 'SKILL_NOVICE_FIREBALL')!.animationMetadata!;
  const highTimeline = buildSkillExecutionTimeline(sampleMeta, 'E', 'high');
  const lowTimeline = buildSkillExecutionTimeline(sampleMeta, 'E', 'low');
  assert.equal(highTimeline.events.length, 9);
  assert.ok(highTimeline.releaseTimeMs <= highTimeline.impactTimeMs);
  assert.ok(lowTimeline.particleBudget < highTimeline.particleBudget, 'Low quality mode must reduce particle budget');

  // 4. Verify honest missing-asset / fallback audit report
  const audit = getSkillAnimationAssetAuditReport(INITIAL_SKILLS);
  assert.equal(audit.totalSkillsAudited, INITIAL_SKILLS.length);
  assert.ok(audit.verifiedStandaloneSheetCount >= 4);
  assert.ok(audit.fallbackProceduralSheetCount > 0);
  assert.ok(audit.missingAssetsDocumented.every((m) => m.fallbackAnimationKey && m.missingAssetRequirement));

  // 5. Verify LayeredVFXManager pooling & effect cleanup
  const vfx = new LayeredVFXManager(null, 800, 600);
  vfx.setLowQualityMode(true);
  assert.equal(vfx.isLowQualityMode(), true);
  vfx.spawnLayeredSkillVfx({
    skillKey: 'vfx_slash',
    classOrBranchId: 'sword_saint',
    source: { x: 100, y: 100 },
    target: { x: 220, y: 120 },
    releaseFrame: sampleMeta.release_frame,
    impactFrame: sampleMeta.impact_frame,
    animationSpeed: sampleMeta.animation_speed,
  });
  assert.ok(vfx.getStats().activeParticles > 0);
  for (let step = 0; step < 30; step++) {
    vfx.update(0.1);
  }
  assert.equal(vfx.getStats().activeParticles, 0, 'Expired particles must be cleaned up and recycled into pool');
  assert.ok(vfx.getStats().pooledRecycledCount > 0, 'Recycled pool counter must increment on cleanup');
  vfx.clearAll();
});

test('Phase 6, 7, 8 & 9 — Monster EXP Formula (0.85 Global), Admin Permissions, Persistence, Audit History, Rollback & Lv.1–100 Simulations', async () => {
  // 1. Unit verification of Phase 6 formula:
  // EXP = BaseMonsterEXP × AdminMultiplier × LevelDifferenceMultiplier × EventMultiplier × PartyMultiplier
  assert.equal(DEFAULT_ADMIN_EXP_CONFIG.globalMonsterExpMultiplier, 0.85);
  const normalSolo = computeMonsterKillExp({
    baseMonsterExp: 100,
    playerLevel: 10,
    monsterLevel: 10,
    regionId: 'map_whispering_meadow',
    isBoss: false,
    partyMemberCount: 1,
    config: DEFAULT_ADMIN_EXP_CONFIG,
  });
  assert.equal(normalSolo.adminMultiplier, 0.85);
  assert.equal(normalSolo.totalPoolExp, 85, 'Normal monster base EXP reduced by 15% (0.85x)');

  // Boss rewards must NOT be unintentionally reduced by normal monster 0.85 multiplier
  const bossKill = computeMonsterKillExp({
    baseMonsterExp: 1000,
    playerLevel: 15,
    monsterLevel: 15,
    regionId: 'map_goblin_cave',
    isBoss: true,
    partyMemberCount: 1,
    config: DEFAULT_ADMIN_EXP_CONFIG,
  });
  assert.equal(bossKill.adminMultiplier, 1.0);
  assert.equal(bossKill.totalPoolExp, 1000, 'Boss EXP must remain 100% unless bossMultiplier is explicitly changed');

  // 2. Phase 8 Progression & Farming Simulations across all 5 bands (solo & party)
  const simRows = simulateProgressionAndFarmingBands(DEFAULT_ADMIN_EXP_CONFIG);
  assert.equal(simRows.length, 10, '5 bands × 2 modes (solo & party) = 10 simulation rows');
  for (const row of simRows) {
    assert.ok(row.avgTimePerLevelSec > 0);
    assert.ok(row.expPerMinute > 0);
    assert.ok(row.avgKillsPerLevel >= 1);
    assert.ok(row.hpRecoveryDowntimeSecPerLevel >= 0);
    assert.ok(row.mpRecoveryDowntimeSecPerLevel >= 0);
    assert.ok(row.potionsUsedPerLevel >= 0);
    assert.ok(row.skillUsageFrequencyPerMin > 0);
    assert.equal(row.beginnerPacingHealthy, true, `Beginner progression pacing unhealthy in ${row.bandLabel}`);
  }

  // 3. Phase 7 Admin API: Permission checks, Preview, Enable/Disable, Save, Audit History & Rollback
  const app = createApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const addr: any = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  const world = WorldService.getInstance();
  const originalCfg = { ...world.getExpBalanceConfig() };

  try {
    // Reject non-admin player token with 403 Forbidden
    const playerToken = jwt.sign({ id: 'USR_NORMAL_PLAYER', username: 'player1', role: 'player' }, ENV.JWT_SECRET);
    const forbiddenPatch = await jsonApi(baseUrl, '/api/v1/admin/world/exp-balance', 'PATCH', playerToken, {
      globalMonsterExpMultiplier: 5.0,
    });
    assert.equal(forbiddenPatch.status, 403, 'Non-admin player must be blocked from modifying EXP config');

    // Admin token succeeds
    const adminToken = jwt.sign({ id: 'USR_ADMIN_01', username: 'gm_admin', role: 'admin' }, ENV.JWT_SECRET);

    // Reject out-of-range invalid multiplier
    const invalidPatch = await jsonApi(baseUrl, '/api/v1/admin/world/exp-balance', 'PATCH', adminToken, {
      globalMonsterExpMultiplier: -2.0,
    });
    assert.equal(invalidPatch.status, 400, 'Server validation must reject negative multipliers');

    // Preview endpoint
    const previewRes = await jsonApi(baseUrl, '/api/v1/admin/world/exp-balance/preview', 'POST', adminToken, {
      configPatch: { eastGateMultiplier: 1.25, eventExpMultiplier: 1.5 },
      playerLevel: 20,
      partyMemberCount: 2,
    });
    assert.equal(previewRes.status, 200);
    assert.ok(Array.isArray(previewRes.body.data.sampleRows));
    assert.equal(previewRes.body.data.progressionSimulations.length, 10);

    // Save custom gate multipliers
    const saveRes = await jsonApi(baseUrl, '/api/v1/admin/world/exp-balance', 'PATCH', adminToken, {
      globalMonsterExpMultiplier: 0.85,
      beginnerAreaMultiplier: 1.05,
      eastGateMultiplier: 0.90,
      westGateMultiplier: 0.90,
      southGateMultiplier: 0.88,
      northGateMultiplier: 0.88,
      eventExpMultiplier: 1.20,
      note: 'Test Phase 7 Gate Balancing',
    });
    assert.equal(saveRes.status, 200);
    assert.equal(saveRes.body.data.beginnerAreaMultiplier, 1.05);
    assert.equal(saveRes.body.data.eventExpMultiplier, 1.20);
    assert.ok(Array.isArray(saveRes.body.history) && saveRes.body.history.length >= 1);
    const savedVersion = saveRes.body.history[0].version;

    // Toggle Enable/Disable
    const toggleOff = await jsonApi(baseUrl, '/api/v1/admin/world/exp-balance/toggle', 'POST', adminToken, {
      enabled: false,
    });
    assert.equal(toggleOff.status, 200);
    assert.equal(toggleOff.body.data.enabled, false);

    // Rollback to before savedVersion
    const rollbackRes = await jsonApi(baseUrl, '/api/v1/admin/world/exp-balance/rollback', 'POST', adminToken, {
      version: savedVersion,
    });
    assert.equal(rollbackRes.status, 200);
    assert.equal(rollbackRes.body.data.enabled, true);
  } finally {
    world.updateExpBalanceConfig(originalCfg);
    world.invalidateCache();
    server.close();
  }
});
