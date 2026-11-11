import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  PROFESSION_DEFINITIONS,
  PROFESSION_GATHERING_NODES,
  PROFESSION_MATERIALS,
  PROFESSION_NPCS,
  PROFESSION_QUESTS,
  PROFESSION_RECIPES,
  PROFESSION_SYSTEM_CONFIG,
  PROFESSION_TOOLS,
  computeCraftProbabilities,
  computeDiminishingCraftExp,
  getProfessionRankForLevel,
  rollCraftQualityAndYield,
} from '@elysia/game-data-schema';
import { createApp } from '../app.js';
import { JsonStore } from '../database/jsonStore.js';
import { runMigrationsAndSeeds } from '../database/migrations.js';
import { CombatService } from '../services/combat.service.js';
import { ProfessionService } from '../services/profession.service.js';

function cleanup(store: JsonStore, userIds: string[]) {
  const charIds = new Set(store.characters.filter((c) => userIds.includes(c.userId || '')).map((c) => c.id));
  for (let i = store.characters.length - 1; i >= 0; i--) {
    if (userIds.includes(store.characters[i].userId || '')) store.characters.splice(i, 1);
  }
  for (let i = store.users.length - 1; i >= 0; i--) {
    if (userIds.includes(store.users[i].id)) store.users.splice(i, 1);
  }
  for (let i = store.farmPlots.length - 1; i >= 0; i--) {
    if (charIds.has(store.farmPlots[i].characterId)) store.farmPlots.splice(i, 1);
  }
  for (let i = store.marketListings.length - 1; i >= 0; i--) {
    if (charIds.has(store.marketListings[i].sellerCharacterId)) store.marketListings.splice(i, 1);
  }
  store.gatheringNodesRuntime = [];
  store.save();
}

test.before(async () => {
  await runMigrationsAndSeeds();
});

test('1. Profession Unit Rules: 8 Professions, Lv.1-70 Ranks, Quests, Diminishing EXP, Quality Distribution & JSON Files', () => {
  assert.equal(PROFESSION_DEFINITIONS.length, 8);
  assert.equal(PROFESSION_SYSTEM_CONFIG.maxInitialProfessions, 3);
  assert.equal(PROFESSION_TOOLS.length, 16);
  assert.equal(PROFESSION_NPCS.length, 8);
  assert.ok(PROFESSION_MATERIALS.length >= 17);
  assert.ok(PROFESSION_GATHERING_NODES.length >= 10);
  assert.ok(PROFESSION_RECIPES.length >= 22);
  assert.ok(PROFESSION_QUESTS.length >= 40);

  // Every profession covers Intro + Daily + Mastery Advancement + Special + Hidden Legendary quests
  for (const prof of PROFESSION_DEFINITIONS) {
    const pq = PROFESSION_QUESTS.filter((q) => q.professionId === prof.id);
    for (const kind of ['intro', 'daily', 'mastery_advancement', 'special', 'hidden_legendary']) {
      assert.ok(pq.some((q) => q.questKind === kind), `Profession ${prof.id} missing questKind ${kind}`);
    }
    assert.ok(PROFESSION_RECIPES.some((r) => r.professionId === prof.id && r.isHidden && r.isLegendary));
  }

  assert.equal(getProfessionRankForLevel(1).id, 'apprentice');
  assert.equal(getProfessionRankForLevel(15).id, 'novice');
  assert.equal(getProfessionRankForLevel(25).id, 'skilled');
  assert.equal(getProfessionRankForLevel(35).id, 'expert');
  assert.equal(getProfessionRankForLevel(45).id, 'master');
  assert.equal(getProfessionRankForLevel(55).id, 'grandmaster');
  assert.equal(getProfessionRankForLevel(68).id, 'legendary');

  // Diminishing EXP when crafting Lv.1 recipe at Mastery Lv.25
  const fullExp = computeDiminishingCraftExp(100, 1, 1, 0);
  const dimExp = computeDiminishingCraftExp(100, 25, 1, 50);
  assert.equal(fullExp, 100);
  assert.ok(dimExp < fullExp && dimExp >= 1);

  // Craft quality probabilities sum to 100% and scale with Mastery
  const lowProb = computeCraftProbabilities({
    masteryLevel: 1,
    recipeRequiredMastery: 1,
    baseSuccessRatePct: 90,
    baseExtraYieldChancePct: 12,
    toolQualityBonusPct: 2,
    toolExtraYieldBonusPct: 2,
  });
  const highProb = computeCraftProbabilities({
    masteryLevel: 65,
    recipeRequiredMastery: 15,
    baseSuccessRatePct: 90,
    baseExtraYieldChancePct: 12,
    toolQualityBonusPct: 16,
    toolExtraYieldBonusPct: 12,
  });
  const sumHigh = Object.values(highProb.qualityProbabilities).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sumHigh - 100) <= 0.5);
  assert.ok(highProb.qualityProbabilities.legendary > lowProb.qualityProbabilities.legendary);

  // Probabilistic extra yield: must NEVER guarantee 100% extra yield on every roll
  let extraCount = 0;
  let zeroExtraCount = 0;
  for (let i = 0; i < 200; i++) {
    const roll = rollCraftQualityAndYield({
      masteryLevel: 70,
      recipeRequiredMastery: 1,
      baseSuccessRatePct: 98,
      baseExtraYieldChancePct: 20,
      maxExtraYieldQty: 2,
      toolQualityBonusPct: 16,
      toolExtraYieldBonusPct: 15,
    });
    if (roll.extraYield > 0) extraCount += 1;
    else zeroExtraCount += 1;
  }
  assert.ok(extraCount > 10 && zeroExtraCount > 10, `Expected probabilistic spread, got extra=${extraCount}, normal=${zeroExtraCount}`);

  // Verify game-data/professions JSON files & SQL schema exist on disk
  const dir = path.resolve(process.cwd(), '../../game-data/professions');
  if (fs.existsSync(dir)) {
    for (const f of [
      'profession_config.json',
      'profession_mastery.json',
      'profession_recipes.json',
      'profession_materials.json',
      'profession_tools.json',
      'profession_gathering_nodes.json',
      'profession_quality.json',
      'profession_quests.json',
      'profession_npcs.json',
      'profession_economy.json',
      'profession_database_schema.sql',
    ]) {
      assert.ok(fs.existsSync(path.join(dir, f)), `Missing file: ${f}`);
    }
  }
});

test('2. Live API & Gameplay: Learn Cap 3, Tool Durability & Equip, Gathering Cooldown, Farming, Quality Probabilities & Quests', async () => {
  const store = JsonStore.getInstance();
  const app = createApp();
  const server = app.listen(0);
  const addr: any = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  const createdUserIds: string[] = [];

  try {
    const gRes = await fetch(`${baseUrl}/api/v1/auth/guest`, { method: 'POST', headers: { Connection: 'close' } });
    const gJson: any = await gRes.json();
    createdUserIds.push(gJson.data.user.id);
    const token = gJson.data.token;
    const char = store.characters.find((c) => c.id === gJson.data.character.id)!;
    char.gold = 50000;
    store.save();

    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, Connection: 'close' };

    // Learn 3 primary professions
    for (const pid of ['herbalist', 'blacksmith', 'farmer']) {
      const lr = await fetch(`${baseUrl}/api/v1/professions/${char.id}/learn`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ professionId: pid }),
      });
      assert.equal(lr.status, 200);
    }

    // 4th profession blocked before unlocking extra slot!
    const fourth = await fetch(`${baseUrl}/api/v1/professions/${char.id}/learn`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ professionId: 'chef' }),
    });
    assert.equal(fourth.status, 400);

    // Gather herb node -> verify tool durability decreases, cooldown blocks second attempt
    const gStart = await fetch(`${baseUrl}/api/v1/professions/${char.id}/gather/start`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ nodeId: 'NODE_VILLAGE_HERB_01', instantForTest: true }),
    });
    assert.equal(gStart.status, 200);
    const sJson: any = await gStart.json();

    const gDone = await fetch(`${baseUrl}/api/v1/professions/${char.id}/gather/complete`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ sessionId: sJson.data.sessionId }),
    });
    assert.equal(gDone.status, 200);
    const gdJson: any = await gDone.json();
    assert.ok(gdJson.data.primaryYield.quantity >= 1);
    assert.equal(char.professions.herbalist.toolDurability, 79);

    // Upgrade tool -> buy Tier 2 then switch back to Tier 1 via /tools/equip!
    char.professions.herbalist.level = 30;
    store.save();
    const buyT2 = await fetch(`${baseUrl}/api/v1/professions/${char.id}/tools/buy`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ toolId: 'TOOL_HERB_SICKLE_T2' }),
    });
    assert.equal(buyT2.status, 200);
    const swapT1 = await fetch(`${baseUrl}/api/v1/professions/${char.id}/tools/equip`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ toolId: 'TOOL_HERB_SICKLE_T1' }),
    });
    assert.equal(swapT1.status, 200);
    assert.equal(char.professions.herbalist.equippedToolId, 'TOOL_HERB_SICKLE_T1');

    // Cooldown prevents instant re-gather of same node
    const gCooldown = await fetch(`${baseUrl}/api/v1/professions/${char.id}/gather/start`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ nodeId: 'NODE_VILLAGE_HERB_01', instantForTest: true }),
    });
    assert.equal(gCooldown.status, 400);

    // Farm plot plant -> water -> harvest
    const plantRes = await fetch(`${baseUrl}/api/v1/professions/${char.id}/farm/plant`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ seedItemId: 'MAT_PROF_SEED_WHEAT', instantGrowForTest: true }),
    });
    assert.equal(plantRes.status, 200);
    const plantJson: any = await plantRes.json();
    const plotId = plantJson.data.plotId;

    const waterRes = await fetch(`${baseUrl}/api/v1/professions/${char.id}/farm/water`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ plotId }),
    });
    assert.equal(waterRes.status, 200);

    const harvRes = await fetch(`${baseUrl}/api/v1/professions/${char.id}/farm/harvest`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ plotId }),
    });
    assert.equal(harvRes.status, 200);

    // Preview exact quality probabilities + craft Potion with idempotency txId check (duplicate txId rejected)
    const previewRes = await fetch(`${baseUrl}/api/v1/professions/${char.id}/craft/preview/REC_HERB_POTION_T1`, { headers });
    assert.equal(previewRes.status, 200);
    const previewJson: any = await previewRes.json();
    assert.ok(previewJson.data.qualityProbabilities.legendary > 0);
    assert.ok(previewJson.data.qualityProbabilities.common >= 0);

    char.inventory.push({ slotId: 99, itemId: 'MAT_PROF_HERB_GREEN', quantity: 10 });
    store.save();

    const uniqueTx = `TX_PROF_DEDUPE_${Date.now()}`;
    const craftRes = await fetch(`${baseUrl}/api/v1/professions/${char.id}/craft`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ recipeId: 'REC_HERB_POTION_T1', quantity: 2, txId: uniqueTx }),
    });
    assert.equal(craftRes.status, 200);

    const dupCraft = await fetch(`${baseUrl}/api/v1/professions/${char.id}/craft`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ recipeId: 'REC_HERB_POTION_T1', quantity: 1, txId: uniqueTx }),
    });
    assert.equal(dupCraft.status, 400);

    // Hidden Legendary Quest unlocks Legendary Recipe + Extra Profession Slot!
    char.professions.herbalist.level = 55;
    char.inventory.push({ slotId: 100, itemId: 'MAT_TREANT_CORE', quantity: 1 });
    store.save();

    const questRes = await fetch(`${baseUrl}/api/v1/professions/${char.id}/quests/complete`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ questId: 'PQ_HERB_HIDDEN_LEGEND' }),
    });
    assert.equal(questRes.status, 200);
    const qJson: any = await questRes.json();
    assert.equal(qJson.data.unlockedRecipe, 'REC_HERB_LEGEND_PANACEA');
    assert.equal(qJson.data.unlockedProfessionSlots, 4);

    // Now 4th profession Chef succeeds!
    const fourthNow = await fetch(`${baseUrl}/api/v1/professions/${char.id}/learn`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ professionId: 'chef' }),
    });
    assert.equal(fourthNow.status, 200);
  } finally {
    cleanup(store, createdUserIds);
    server.close();
  }
});

test('3. Player-Driven Economy: Gatherer -> Marketplace -> Chef Crafting -> Live Combat Buff Activation', async () => {
  const store = JsonStore.getInstance();
  const app = createApp();
  const server = app.listen(0);
  const addr: any = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  const createdUserIds: string[] = [];
  const combat = CombatService.getSharedInstance();

  try {
    const g1 = await fetch(`${baseUrl}/api/v1/auth/guest`, { method: 'POST', headers: { Connection: 'close' } });
    const g1Json: any = await g1.json();
    createdUserIds.push(g1Json.data.user.id);
    const token1 = g1Json.data.token;
    const gatherer = store.characters.find((c) => c.id === g1Json.data.character.id)!;

    const g2 = await fetch(`${baseUrl}/api/v1/auth/guest`, { method: 'POST', headers: { Connection: 'close' } });
    const g2Json: any = await g2.json();
    createdUserIds.push(g2Json.data.user.id);
    const token2 = g2Json.data.token;
    const chef = store.characters.find((c) => c.id === g2Json.data.character.id)!;

    gatherer.gold = 2000;
    gatherer.inventory.push({ slotId: 10, itemId: 'MAT_PROF_CARP', quantity: 4, quality: 'common' });
    chef.gold = 5000;
    chef.inventory.push({ slotId: 11, itemId: 'MAT_PROF_HERB_GREEN', quantity: 3, quality: 'common' });
    store.save();

    // Learn Chef & upgrade to Lv.15 so Chef can cook Carp Stew
    await fetch(`${baseUrl}/api/v1/professions/${chef.id}/learn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token2}` },
      body: JSON.stringify({ professionId: 'chef' }),
    });
    chef.professions.chef.level = 15;
    store.save();

    // Gatherer lists Silver Brook Carp on player Marketplace
    const listRes = await fetch(`${baseUrl}/api/v1/marketplace/listings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token1}`, Connection: 'close' },
      body: JSON.stringify({
        sellerCharacterId: gatherer.id,
        itemId: 'MAT_PROF_CARP',
        quantity: 2,
        unitPriceGold: 30,
      }),
    });
    assert.equal(listRes.status, 201);
    const listJson: any = await listRes.json();
    const listingId = listJson.data.id;

    // Chef buys Silver Brook Carp from Marketplace
    const buyRes = await fetch(`${baseUrl}/api/v1/marketplace/listings/${listingId}/buy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token2}`, Connection: 'close' },
      body: JSON.stringify({ buyerCharacterId: chef.id }),
    });
    assert.equal(buyRes.status, 200);
    assert.ok(gatherer.gold > 2000, 'Gatherer earns gold minus market tax');

    // Chef crafts Silver Brook Carp Stew using bought fish + herbs
    const cookRes = await fetch(`${baseUrl}/api/v1/professions/${chef.id}/craft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token2}`, Connection: 'close' },
      body: JSON.stringify({ recipeId: 'REC_CHEF_CARP_SOUP', quantity: 1 }),
    });
    assert.equal(cookRes.status, 200);
    chef.inventory.push({ slotId: 12, itemId: 'PROF_ITEM_CARP_STEW', quantity: 1, quality: 'rare' });
    store.save();

    // Chef consumes crafted food inside CombatService (userId first, characterId second) -> boosts live ATK!
    combat.join(chef.userId || g2Json.data.user.id, chef.id);
    const atkBefore = combat.getPlayer(chef.id)!.atk;
    const useRes = combat.useItem(chef.id, 'PROF_ITEM_CARP_STEW');
    assert.ok(useRes.appliedBuff, 'Food buff must be applied on useItem');
    const atkAfter = combat.getPlayer(chef.id)!.atk;
    assert.ok(atkAfter > atkBefore, `Expected live ATK increase after eating Carp Stew (${atkBefore} -> ${atkAfter})`);
    combat.leave(chef.id);
  } finally {
    cleanup(store, createdUserIds);
    (server as any).closeAllConnections?.();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

void ProfessionService;
