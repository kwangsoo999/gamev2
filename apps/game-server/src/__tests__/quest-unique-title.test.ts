import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { ENV } from '../config/env.js';
import { JsonStore } from '../database/jsonStore.js';
import { runMigrationsAndSeeds } from '../database/migrations.js';
import { CharacterService } from '../services/character.service.js';
import { CombatService } from '../services/combat.service.js';
import { QuestTitleService } from '../services/quest-title.service.js';
import { computePermanentTitleBonuses } from '@elysia/game-data-schema';

function makeTestCharacter(store: JsonStore, overrides: Record<string, any> = {}): any {
  const id = `CHAR_QT_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const char: any = {
    id,
    userId: 'USR_QT_ALPHA',
    name: `Hero_${id.slice(-4)}`,
    gender: 'female',
    classId: 'swordsman',
    level: 40,
    exp: 0,
    gold: 5000,
    baseStats: { str: 25, dex: 16, agi: 14, int: 10, con: 18 },
    attributes: { str: 25, dex: 16, agi: 14, int: 10, con: 18 },
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
  store.characters.push(char as any);
  return char;
}

test.before(async () => {
  await runMigrationsAndSeeds();
});

test('Data Integrity: All Quests, Hidden Quests, Chains, Unique Equipment & Titles have valid cross-references', () => {
  const qt = QuestTitleService.getInstance();
  const report = qt.validateAllDataReferences();
  assert.equal(report.valid, true, `Integrity errors: ${report.errors.join('; ')}`);
  assert.equal(report.errors.length, 0);
  assert.ok(report.summary.quests >= 19);
  assert.ok(report.summary.hiddenQuests >= 3);
  assert.ok(report.summary.questChains >= 2);
  assert.ok(report.summary.uniqueEquipment >= 5);
  assert.ok(report.summary.titles >= 7);
});

test('GoblinEvo 4-Stage Quest Chain Progression, Prerequisites, Collection, Hunting & Idempotent Rewards', () => {
  const store = JsonStore.getInstance();
  const qt = QuestTitleService.getInstance();
  const hero = makeTestCharacter(store, {
    level: 45,
    completedQuests: [],
  });

  try {
    // Prerequisite enforcement: QUEST_GOBLIN_EVO_01_SIGNALS requires QUEST_001_SLIME_CLEAR
    assert.throws(() => qt.acceptQuest(hero.id, 'QUEST_GOBLIN_EVO_01_SIGNALS'), /tiền đề|QUEST_001_SLIME_CLEAR/);

    // Complete stage prereq QUEST_001_SLIME_CLEAR via debug + claim
    qt.debugCompleteObjectives(hero.id, 'QUEST_001_SLIME_CLEAR');
    qt.claimQuestRewards(hero.id, 'QUEST_001_SLIME_CLEAR');
    assert.ok(hero.completedQuests.includes('QUEST_001_SLIME_CLEAR'));

    // Stage 1: NPC_DIALOGUE + KILL_MONSTER
    qt.acceptQuest(hero.id, 'QUEST_GOBLIN_EVO_01_SIGNALS');
    qt.recordProgress(hero.id, { type: 'NPC_DIALOGUE', targetId: 'npc_trainer', keyword: 'goblin_signals' });
    qt.recordProgress(hero.id, { type: 'KILL_MONSTER', targetId: 'MONSTER_GOBLIN_SCOUT', amount: 3 });
    assert.equal(hero.activeQuests['QUEST_GOBLIN_EVO_01_SIGNALS']?.completed, true);
    qt.claimQuestRewards(hero.id, 'QUEST_GOBLIN_EVO_01_SIGNALS');
    assert.equal(hero.questChainProgress['CHAIN_GOBLIN_EVO_CHRONICLES']?.completedSteps.length, 1);

    // Duplicate claim strictly blocked (409)
    assert.throws(() => qt.claimQuestRewards(hero.id, 'QUEST_GOBLIN_EVO_01_SIGNALS'), /đã được nhận trước đó/);

    // Stage 2: EXPLORE_MAP + KILL_MONSTER + COLLECT_ITEM
    qt.acceptQuest(hero.id, 'QUEST_GOBLIN_EVO_02_OUTSKIRTS');
    qt.recordProgress(hero.id, { type: 'EXPLORE_MAP', targetId: 'map_spirit_forest_outskirts' });
    qt.recordProgress(hero.id, { type: 'KILL_MONSTER', targetId: 'mon_forest_goblin', amount: 5 });
    hero.inventory.push({ slotId: 0, itemId: 'MAT_GOBLIN_EVO_CORE', name: 'Goblin Evo Core', quantity: 3 });
    qt.recordProgress(hero.id, { type: 'COLLECT_ITEM', targetId: 'MAT_GOBLIN_EVO_CORE', amount: 3 });
    assert.equal(hero.activeQuests['QUEST_GOBLIN_EVO_02_OUTSKIRTS']?.completed, true);
    const s2Claim = qt.claimQuestRewards(hero.id, 'QUEST_GOBLIN_EVO_02_OUTSKIRTS');
    assert.ok(s2Claim.unlockedTitleIds.includes('TITLE_GOBLIN_TRACKER'));

    // Stage 3 -> UEQ_GOBLIN_CROWN_OF_ORIGIN
    qt.acceptQuest(hero.id, 'QUEST_GOBLIN_EVO_03_SHAMAN_RELIC');
    qt.recordProgress(hero.id, { type: 'KILL_MONSTER', targetId: 'miniboss_spirit_outskirts', amount: 1 });
    qt.recordProgress(hero.id, { type: 'NPC_DIALOGUE', targetId: 'NPC_SYLVARIS_ELDER', keyword: 'ancient_crown' });
    const s3Claim = qt.claimQuestRewards(hero.id, 'QUEST_GOBLIN_EVO_03_SHAMAN_RELIC');
    assert.ok(s3Claim.grantedUniqueEquipmentIds.includes('UEQ_GOBLIN_CROWN_OF_ORIGIN'));
    assert.ok(hero.ownedUniqueEquipmentIds.includes('UEQ_GOBLIN_CROWN_OF_ORIGIN'));

    // Stage 4 -> UEQ_GOBLIN_EVO_EMBLEM_BLADE + TITLE_GOBLIN_EVO_CONQUEROR + Chain Completed
    qt.acceptQuest(hero.id, 'QUEST_GOBLIN_EVO_04_TREANT_PACT');
    qt.recordProgress(hero.id, { type: 'KILL_MONSTER', targetId: 'boss_ancient_treant', amount: 1 });
    const s4Claim = qt.claimQuestRewards(hero.id, 'QUEST_GOBLIN_EVO_04_TREANT_PACT');
    assert.ok(s4Claim.grantedUniqueEquipmentIds.includes('UEQ_GOBLIN_EVO_EMBLEM_BLADE'));
    assert.ok(s4Claim.unlockedTitleIds.includes('TITLE_GOBLIN_EVO_CONQUEROR'));
    assert.equal(hero.questChainProgress['CHAIN_GOBLIN_EVO_CHRONICLES']?.completed, true);
  } finally {
    store.characters.splice(store.characters.findIndex((c) => c.id === hero.id), 1);
    store.save();
  }
});

test('Hidden Quests: Strictly hidden from Player Journal before activation & discovered automatically on trigger', () => {
  const store = JsonStore.getInstance();
  const qt = QuestTitleService.getInstance();
  const hero = makeTestCharacter(store, { level: 30, completedQuests: [] });

  try {
    const journalBefore = qt.getPlayerJournal(hero.id);
    const leakedIds = [...journalBefore.visibleQuests, ...journalBefore.availableQuests].map((q) => q.id);
    assert.ok(!leakedIds.includes('QUEST_HIDDEN_ANCIENT_WELL'), 'Undiscovered hidden quest must NEVER appear in journal');
    assert.ok(!leakedIds.includes('QUEST_HIDDEN_GOBLIN_KING_MEMORY'));
    assert.ok(!leakedIds.includes('QUEST_HIDDEN_DRAGON_SCHOLAR_RIDDLE'));

    // Manual accept before discovery rejected with 403
    assert.throws(() => qt.acceptQuest(hero.id, 'QUEST_HIDDEN_ANCIENT_WELL'), /chưa được kích hoạt/);

    // Trigger NPC dialogue keyword -> discovers & activates hidden quest
    const progRes = qt.recordProgress(hero.id, {
      type: 'NPC_DIALOGUE',
      targetId: 'npc_elder',
      keyword: 'ancient_well',
    });
    assert.ok(progRes.newlyDiscoveredHiddenQuests.includes('QUEST_HIDDEN_ANCIENT_WELL'));
    assert.ok(hero.discoveredHiddenQuests.includes('QUEST_HIDDEN_ANCIENT_WELL'));

    const journalAfter = qt.getPlayerJournal(hero.id);
    assert.ok(journalAfter.visibleQuests.some((q) => q.id === 'QUEST_HIDDEN_ANCIENT_WELL'));
  } finally {
    store.characters.splice(store.characters.findIndex((c) => c.id === hero.id), 1);
    store.save();
  }
});

test('Unique Equipment: Non-repeatable acquisition, Character/Account binding & +N passive scaling', async () => {
  const store = JsonStore.getInstance();
  const qt = QuestTitleService.getInstance();
  const charService = new CharacterService();
  const combatService = new CombatService();

  const sameAccount = `USR_BIND_${Date.now().toString(36)}`;
  const otherAccount = `USR_OTHER_${Date.now().toString(36)}`;

  const charA = makeTestCharacter(store, { id: `CH_A_${Date.now()}`, userId: sameAccount, level: 45, classId: 'swordsman' });
  const charB = makeTestCharacter(store, { id: `CH_B_${Date.now()}`, userId: sameAccount, level: 45, classId: 'swordsman' });
  const charC = makeTestCharacter(store, { id: `CH_C_${Date.now()}`, userId: otherAccount, level: 45, classId: 'swordsman' });

  try {
    // 1. Account-bound Unique (UEQ_SHADOW_GOBLIN_CLOAK): charA claims OK -> same-account charB blocked (403) -> diff-account charC OK
    const gA = qt.grantUniqueEquipment(charA.id, 'UEQ_SHADOW_GOBLIN_CLOAK');
    assert.equal(gA.isAccountBound, true);

    assert.throws(() => qt.grantUniqueEquipment(charA.id, 'UEQ_SHADOW_GOBLIN_CLOAK'), /Không thể nhận trùng lặp/);
    assert.throws(() => qt.grantUniqueEquipment(charB.id, 'UEQ_SHADOW_GOBLIN_CLOAK'), /khóa tài khoản/);

    const gC = qt.grantUniqueEquipment(charC.id, 'UEQ_SHADOW_GOBLIN_CLOAK');
    assert.equal(gC.success, true);

    // 2. Character-bound Unique (UEQ_WELLSPRING_AMULET): same account charB CAN earn its own copy,
    //    but cannot equip a slot object bound specifically to charA!
    qt.grantUniqueEquipment(charA.id, 'UEQ_WELLSPRING_AMULET');
    qt.grantUniqueEquipment(charB.id, 'UEQ_WELLSPRING_AMULET');
    const slotOfA = charA.inventory.find((i: any) => i.itemId === 'UEQ_WELLSPRING_AMULET');
    assert.equal(slotOfA.boundCharacterId, charA.id);
    // Simulate illegitimate transfer of bound item into charB inventory
    charB.inventory = charB.inventory.map((i: any) =>
      i.itemId === 'UEQ_WELLSPRING_AMULET' ? { ...i, boundCharacterId: charA.id } : i
    );
    await assert.rejects(() => charService.equipItem(charB.id, 'necklace', 'UEQ_WELLSPRING_AMULET'), /đã khóa với nhân vật khác/);

    // 3. Unique Passive & +N Upgrade Scaling in Combat Stats
    qt.grantUniqueEquipment(charA.id, 'UEQ_GOBLIN_EVO_EMBLEM_BLADE');
    const statsBefore = charService.getComputedStatsSummary(charA.id);

    await charService.equipItem(charA.id, 'weapon', 'UEQ_GOBLIN_EVO_EMBLEM_BLADE');
    const statsAtZero = charService.getComputedStatsSummary(charA.id);
    assert.ok(statsAtZero.computed.atk > statsBefore.computed.atk);
    assert.ok(statsAtZero.uniqueEquipmentPassives.equippedUniqueIds.includes('UEQ_GOBLIN_EVO_EMBLEM_BLADE'));
    assert.ok(statsAtZero.uniqueEquipmentPassives.atk >= 42);
    assert.ok(statsAtZero.uniqueEquipmentPassives.skillDamagePct >= 10);

    (charA as any).equipmentUpgradeLevels = { weapon: 5 };
    const statsAtFive = charService.getComputedStatsSummary(charA.id);
    assert.ok(statsAtFive.computed.atk > statsAtZero.computed.atk, 'Unique weapon +5 must scale passive ATK higher than +0');
    assert.ok(statsAtFive.uniqueEquipmentPassives.atk > statsAtZero.uniqueEquipmentPassives.atk);

    // Verify CombatService reflects the exact Unique passive ATK boost
    const joined = combatService.join(charA.userId, charA.id);
    assert.ok(joined.snapshot.atk >= statsAtFive.computed.atk);
    combatService.leave(charA.id);
  } finally {
    for (const cid of [charA.id, charB.id, charC.id]) {
      const idx = store.characters.findIndex((c) => c.id === cid);
      if (idx >= 0) store.characters.splice(idx, 1);
    }
    store.save();
  }
});

test('Permanent Titles: Auto-unlock, Stacked without Equipping, Cap Enforcement, Cosmetic-Only Toggle & Reload Recalculation', async () => {
  const store = JsonStore.getInstance();
  const qt = QuestTitleService.getInstance();
  const charService = new CharacterService();

  const hero = makeTestCharacter(store, { level: 70 });

  try {
    // Auto-unlock via map exploration trigger & quest completion (non-duplicate check)
    qt.acceptQuest(hero.id, 'QUEST_SIDE_EXPLORE_ELYSIA');
    qt.recordProgress(hero.id, { type: 'EXPLORE_MAP', targetId: 'city_elysia_capital' });
    qt.recordProgress(hero.id, { type: 'EXPLORE_MAP', targetId: 'city_sylvaris' });
    const drakhenRes = qt.recordProgress(hero.id, { type: 'EXPLORE_MAP', targetId: 'city_drakhen' });
    assert.ok(drakhenRes.newlyUnlockedTitles.includes('TITLE_WORLD_EXPLORER'));
    assert.ok(hero.unlockedTitles.includes('TITLE_WORLD_EXPLORER'));
    qt.claimQuestRewards(hero.id, 'QUEST_SIDE_EXPLORE_ELYSIA');
    assert.equal(hero.unlockedTitles.filter((t: string) => t === 'TITLE_WORLD_EXPLORER').length, 1);

    // Unlock a second permanent title via debug helper
    qt.unlockTitle(hero.id, 'TITLE_DRAGON_CHRONICLER');
    // Calling unlock again is idempotent (no double claim / double stack)
    const repeat = qt.unlockTitle(hero.id, 'TITLE_DRAGON_CHRONICLER');
    assert.equal(repeat.newlyUnlocked, false);
    assert.equal(hero.unlockedTitles.filter((t: string) => t === 'TITLE_DRAGON_CHRONICLER').length, 1);

    // WITHOUT equipping any title cosmetically, both titles MUST stack stats!
    assert.equal(hero.equippedCosmeticTitleId, null);
    const statsNoCosmetic = charService.getComputedStatsSummary(hero.id);
    assert.ok(statsNoCosmetic.titleBonuses.cappedTotals.atk > 0);
    assert.ok(statsNoCosmetic.titleBonuses.cappedTotals.expBonusPct >= 5);

    // Equip cosmetic title -> Stats MUST remain 100% unchanged!
    qt.equipCosmeticTitle(hero.id, 'TITLE_WORLD_EXPLORER');
    assert.equal(hero.equippedCosmeticTitleId, 'TITLE_WORLD_EXPLORER');
    const statsCosmetic1 = charService.getComputedStatsSummary(hero.id);
    assert.equal(statsCosmetic1.computed.atk, statsNoCosmetic.computed.atk);
    assert.equal(statsCosmetic1.computed.matk, statsNoCosmetic.computed.matk);
    assert.equal(statsCosmetic1.computed.maxHp, statsNoCosmetic.computed.maxHp);
    assert.deepEqual(statsCosmetic1.titleBonuses.cappedTotals, statsNoCosmetic.titleBonuses.cappedTotals);

    // Switch cosmetic to another unlocked title -> still identical stats
    qt.equipCosmeticTitle(hero.id, 'TITLE_DRAGON_CHRONICLER');
    const statsCosmetic2 = charService.getComputedStatsSummary(hero.id);
    assert.equal(statsCosmetic2.computed.atk, statsNoCosmetic.computed.atk);

    // Equipping an unowned title fails
    assert.throws(() => qt.equipCosmeticTitle(hero.id, 'TITLE_GOBLIN_EVO_CONQUEROR'), /Chưa mở khóa/);

    // Configurable maximum cap limit enforcement
    const cappedTest = computePermanentTitleBonuses(
      ['TITLE_WORLD_EXPLORER', 'TITLE_DRAGON_CHRONICLER', 'TITLE_GOBLIN_EVO_CONQUEROR'],
      store.characters ? (qt as any).getTitlesCatalog(true) : [],
      { maxFlatAtk: 15, maxPctAtk: 4 }
    );
    assert.ok(cappedTest.uncappedTotals.atk > 15);
    assert.equal(cappedTest.cappedTotals.atk, 15);
    assert.equal(cappedTest.cappedTotals.atkPct, 4);

    // Recalculate bonuses on saved load (simulate missing cachedTitleBonuses before boot migration)
    delete hero.cachedTitleBonuses;
    await runMigrationsAndSeeds();
    assert.ok(hero.cachedTitleBonuses);
    assert.equal(hero.cachedTitleBonuses.cappedTotals.atk, statsNoCosmetic.titleBonuses.cappedTotals.atk);
  } finally {
    store.characters.splice(store.characters.findIndex((c) => c.id === hero.id), 1);
    store.save();
  }
});

test('HTTP API: Character Quest/Title/Unique Routes, Auth Enforcement & System 6 Admin Debug Endpoints', async () => {
  const store = JsonStore.getInstance();
  const userA = `USR_HTTP_A_${Date.now().toString(36)}`;
  const userB = `USR_HTTP_B_${Date.now().toString(36)}`;
  const hero = makeTestCharacter(store, { id: `CH_HTTP_${Date.now()}`, userId: userA, level: 20 });
  const tokenA = jwt.sign({ id: userA, username: 'alice', role: 'player' }, ENV.JWT_SECRET);
  const tokenB = jwt.sign({ id: userB, username: 'bob', role: 'player' }, ENV.JWT_SECRET);

  const app = createApp();
  const server = app.listen(0);
  const addr: any = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;

  try {
    // Ownership enforcement
    const forbiddenRes = await fetch(`${baseUrl}/api/v1/characters/${hero.id}/quests`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert.equal(forbiddenRes.status, 403);

    // Public game quests endpoint hides hidden quests by default
    const publicQuestsRes = await fetch(`${baseUrl}/api/v1/game/quests`);
    const publicQuestsJson: any = await publicQuestsRes.json();
    assert.equal(publicQuestsRes.status, 200);
    assert.ok(!publicQuestsJson.data.some((q: any) => q.isHidden || q.questType === 'HIDDEN_QUEST'));

    // Admin search hidden quests
    const adminHiddenRes = await fetch(`${baseUrl}/api/v1/admin/debug/quests?hiddenOnly=true&search=Well`);
    const adminHiddenJson: any = await adminHiddenRes.json();
    assert.equal(adminHiddenRes.status, 200);
    assert.ok(adminHiddenJson.data.some((q: any) => q.id === 'QUEST_HIDDEN_ANCIENT_WELL'));

    // Admin trigger hidden quest + complete objectives -> player claims via HTTP -> unlocks Title & Unique
    const trigRes = await fetch(`${baseUrl}/api/v1/admin/debug/quests/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ characterId: hero.id, questId: 'QUEST_HIDDEN_ANCIENT_WELL' }),
    });
    assert.equal(trigRes.status, 200);

    const compRes = await fetch(`${baseUrl}/api/v1/admin/debug/quests/complete-objectives`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ characterId: hero.id, questId: 'QUEST_HIDDEN_ANCIENT_WELL' }),
    });
    assert.equal(compRes.status, 200);

    const claimRes = await fetch(`${baseUrl}/api/v1/characters/${hero.id}/quests/QUEST_HIDDEN_ANCIENT_WELL/claim`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const claimJson: any = await claimRes.json();
    assert.equal(claimRes.status, 200);
    assert.ok(claimJson.data.grantedUniqueEquipmentIds.includes('UEQ_WELLSPRING_AMULET'));
    assert.ok(claimJson.data.unlockedTitleIds.includes('TITLE_SEEKER_OF_SECRETS'));

    // Equip cosmetic title via HTTP + recalculate
    const equipTitleRes = await fetch(`${baseUrl}/api/v1/characters/${hero.id}/titles/TITLE_SEEKER_OF_SECRETS/equip`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(equipTitleRes.status, 200);

    const recalcRes = await fetch(`${baseUrl}/api/v1/admin/debug/titles/recalculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ characterId: hero.id }),
    });
    const recalcJson: any = await recalcRes.json();
    assert.equal(recalcRes.status, 200);
    assert.equal(recalcJson.data.equippedCosmeticTitleId, 'TITLE_SEEKER_OF_SECRETS');
    assert.ok(recalcJson.data.cappedTotals.def >= 20);
    assert.ok(recalcJson.data.cappedTotals.maxHp >= 220);

    // Data integrity admin debug endpoint
    const intRes = await fetch(`${baseUrl}/api/v1/admin/debug/validation/references`);
    const intJson: any = await intRes.json();
    assert.equal(intRes.status, 200);
    assert.equal(intJson.data.valid, true);
  } finally {
    server.close();
    store.characters.splice(store.characters.findIndex((c) => c.id === hero.id), 1);
    store.save();
  }
});
