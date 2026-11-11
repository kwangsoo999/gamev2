import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { createApp } from '../app.js';
import { JsonStore } from '../database/jsonStore.js';
import { runMigrationsAndSeeds } from '../database/migrations.js';

async function apiRequest(
  baseUrl: string,
  method: string,
  route: string,
  token?: string,
  body?: unknown
): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${baseUrl}${route}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json };
}

test('ELYSIA NO DENSETSU – Master Bug Fix, 4-Tab Quest Categorization, Single HUD Tracker, Hidden Quests & Shop Interactions', async () => {
  await runMigrationsAndSeeds();
  const store = JsonStore.getInstance();
  const app = createApp();
  const server = app.listen(0);
  const addr: any = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;

  const uniqueSuffix = `${Date.now().toString(36)}_${Math.floor(Math.random() * 9999)}`;
  const username = `opt_${uniqueSuffix}`.slice(0, 20);
  const email = `${username}@elysia.test`;
  const password = 'Password123!';
  let userId = '';
  let characterId = '';

  try {
    // Scenario 1: Create an account and log in
    const regRes = await apiRequest(baseUrl, 'POST', '/api/v1/auth/register', undefined, {
      username,
      email,
      password,
    });
    assert.equal(regRes.status, 201);
    assert.equal(regRes.body.success, true);

    const loginRes = await apiRequest(baseUrl, 'POST', '/api/v1/auth/login', undefined, {
      username,
      password,
    });
    assert.equal(loginRes.status, 200);
    assert.equal(loginRes.body.success, true);
    const token: string = loginRes.body.data.token;
    userId = loginRes.body.data.user.id;
    assert.ok(token);

    // Scenario 2 & 3: Create and select a character, enter the game world
    const charRes = await apiRequest(baseUrl, 'POST', '/api/v1/characters', token, {
      name: `Kenshin_${uniqueSuffix}`.slice(0, 18),
      gender: 'male',
    });
    assert.equal(charRes.status, 201);
    assert.equal(charRes.body.success, true);
    characterId = charRes.body.data.id;
    assert.equal(charRes.body.data.regionId, 'THON_KHOI_NGUYEN');

    // Scenario 4 & 5: Move character, sync state, and interact with NPC
    const syncRes = await apiRequest(baseUrl, 'POST', `/api/v1/characters/${characterId}/sync-state`, token, {
      x: 750,
      y: 845,
      regionId: 'THON_KHOI_NGUYEN',
    });
    assert.equal(syncRes.status, 200);
    assert.equal(syncRes.body.success, true);

    const npcRes = await apiRequest(baseUrl, 'POST', '/api/v1/game/npc/interact', token, {
      characterId,
      npcId: 'npc_elder',
    });
    assert.equal(npcRes.status, 200);
    assert.equal(npcRes.body.success, true);
    assert.equal(npcRes.body.data.npcId, 'npc_elder');

    // Test A (Scenario 6): Quest Acceptance moves quest from Available to Active and auto-tracks first quest
    const beforeJournal = await apiRequest(baseUrl, 'GET', `/api/v1/characters/${characterId}/quests`, token);
    assert.equal(beforeJournal.status, 200);
    const availBefore = beforeJournal.body.data.availableQuests.map((q: any) => q.id);
    assert.ok(availBefore.includes('QUEST_001_SLIME_CLEAR'));

    const acceptRes = await apiRequest(
      baseUrl,
      'POST',
      `/api/v1/characters/${characterId}/quests/QUEST_001_SLIME_CLEAR/accept`,
      token,
      {}
    );
    assert.equal(acceptRes.status, 200);
    assert.equal(acceptRes.body.success, true);
    assert.equal(acceptRes.body.data.trackedQuestId, 'QUEST_001_SLIME_CLEAR');
    assert.equal(acceptRes.body.data.trackedQuest?.questId, 'QUEST_001_SLIME_CLEAR');

    const afterJournal = await apiRequest(baseUrl, 'GET', `/api/v1/characters/${characterId}/quests`, token);
    assert.equal(afterJournal.status, 200);
    const availAfter = afterJournal.body.data.availableQuests.map((q: any) => q.id);
    const activeAfter = afterJournal.body.data.activeQuests.map((q: any) => q.questId);
    assert.ok(!availAfter.includes('QUEST_001_SLIME_CLEAR'));
    assert.ok(activeAfter.includes('QUEST_001_SLIME_CLEAR'));

    // Test B (Scenario 7): Multiple Quests & Strict Single-Quest HUD Tracker Rule (at most 1 tracked quest)
    const char = store.characters.find((c: any) => c.id === characterId)!;
    char.level = 16;
    store.save();

    const r2 = await apiRequest(
      baseUrl,
      'POST',
      `/api/v1/characters/${characterId}/quests/QUEST_REG_ELYSIA_01/accept`,
      token,
      {}
    );
    assert.equal(r2.status, 200);

    const r3 = await apiRequest(
      baseUrl,
      'POST',
      `/api/v1/characters/${characterId}/quests/QUEST_SIDE_EXPLORE_ELYSIA/accept`,
      token,
      {}
    );
    assert.equal(r3.status, 200);
    // Accepting Quest 2 & Quest 3 does NOT overwrite existing tracked quest
    assert.equal(r3.body.data.trackedQuestId, 'QUEST_001_SLIME_CLEAR');

    // Explicitly track Quest 2 -> replaces Quest 1 with Quest 2
    const track2 = await apiRequest(baseUrl, 'POST', '/api/v1/game/quests/track', token, {
      characterId,
      questId: 'QUEST_REG_ELYSIA_01',
    });
    assert.equal(track2.status, 200);
    assert.equal(track2.body.data.trackedQuestId, 'QUEST_REG_ELYSIA_01');
    assert.equal(track2.body.data.trackedQuest?.questId, 'QUEST_REG_ELYSIA_01');

    // Verify GET /api/v1/characters/:id/quests/tracked returns strictly 1 quest object (never an array)
    const getTracked = await apiRequest(baseUrl, 'GET', `/api/v1/characters/${characterId}/quests/tracked`, token);
    assert.equal(getTracked.status, 200);
    assert.equal(getTracked.body.data.trackedQuestId, 'QUEST_REG_ELYSIA_01');
    assert.equal(Array.isArray(getTracked.body.data.trackedQuest), false);
    assert.equal(getTracked.body.data.trackedQuest.questId, 'QUEST_REG_ELYSIA_01');

    const journalB = await apiRequest(baseUrl, 'GET', `/api/v1/characters/${characterId}/quests`, token);
    const trackedInActive = journalB.body.data.activeQuests.filter((q: any) => q.isTracked);
    assert.equal(trackedInActive.length, 1);
    assert.equal(trackedInActive[0].questId, 'QUEST_REG_ELYSIA_01');

    // Untrack quest -> HUD tracker becomes null
    const untrackRes = await apiRequest(baseUrl, 'POST', '/api/v1/game/quests/track', token, {
      characterId,
      questId: null,
    });
    assert.equal(untrackRes.status, 200);
    assert.equal(untrackRes.body.data.trackedQuestId, null);
    assert.equal(untrackRes.body.data.trackedQuest, null);

    // Track QUEST_001_SLIME_CLEAR again and abandon QUEST_SIDE_EXPLORE_ELYSIA
    await apiRequest(baseUrl, 'POST', '/api/v1/game/quests/track', token, {
      characterId,
      questId: 'QUEST_001_SLIME_CLEAR',
    });
    const abandonRes = await apiRequest(baseUrl, 'POST', '/api/v1/game/quests/abandon', token, {
      characterId,
      questId: 'QUEST_SIDE_EXPLORE_ELYSIA',
    });
    assert.equal(abandonRes.status, 200);
    assert.equal(abandonRes.body.success, true);

    // Test C (Scenario 6, 8, 9): Quest Completion & Categorization moves quest to Completed tab and NEVER back to Available
    const progRes = await apiRequest(baseUrl, 'POST', `/api/v1/characters/${characterId}/quests/progress`, token, {
      type: 'KILL_MONSTER',
      targetId: 'MONSTER_GREEN_SLIME',
      amount: 3,
    });
    assert.equal(progRes.status, 200);
    assert.equal(progRes.body.data.trackedQuest.completed, true);
    assert.equal(progRes.body.data.trackedQuest.status, 'READY_TO_COMPLETE');

    const goldBefore = store.characters.find((c: any) => c.id === characterId)!.gold;

    const claimRes = await apiRequest(baseUrl, 'POST', '/api/v1/game/quests/complete', token, {
      characterId,
      questId: 'QUEST_001_SLIME_CLEAR',
    });
    assert.equal(claimRes.status, 200);
    assert.equal(claimRes.body.success, true);
    assert.equal(claimRes.body.data.goldGranted, 250);
    assert.equal(claimRes.body.data.expGranted, 120);
    assert.equal(claimRes.body.data.goldTotal, goldBefore + 250);
    assert.equal(claimRes.body.data.trackedQuestId, null);

    const journalC = await apiRequest(baseUrl, 'GET', `/api/v1/characters/${characterId}/quests`, token);
    assert.equal(journalC.status, 200);
    const availableIds = journalC.body.data.availableQuests.map((q: any) => q.id);
    const activeIds = journalC.body.data.activeQuests.map((q: any) => q.questId);
    const completedIds = journalC.body.data.completedQuests;
    const completedDetailIds = journalC.body.data.completedQuestDetails.map((q: any) => q.id);

    assert.ok(completedIds.includes('QUEST_001_SLIME_CLEAR'));
    assert.ok(completedDetailIds.includes('QUEST_001_SLIME_CLEAR'));
    assert.ok(!activeIds.includes('QUEST_001_SLIME_CLEAR'));
    assert.ok(!availableIds.includes('QUEST_001_SLIME_CLEAR'));

    const reAcceptRes = await apiRequest(
      baseUrl,
      'POST',
      `/api/v1/characters/${characterId}/quests/QUEST_001_SLIME_CLEAR/accept`,
      token,
      {}
    );
    assert.equal(reAcceptRes.status, 400);

    // Test D (Scenario 8): Hidden Quests never appear in Available or Public API before trigger, and unlock upon secret condition
    const pubQuestsRes = await apiRequest(baseUrl, 'GET', '/api/v1/game/quests');
    assert.equal(pubQuestsRes.status, 200);
    const pubHidden = pubQuestsRes.body.data.filter((q: any) => q.isHidden || q.questType === 'HIDDEN_QUEST');
    assert.equal(pubHidden.length, 0);

    const beforeHidden = await apiRequest(baseUrl, 'GET', `/api/v1/characters/${characterId}/quests`, token);
    assert.ok(!beforeHidden.body.data.availableQuests.some((q: any) => q.id === 'QUEST_HIDDEN_ANCIENT_WELL'));
    assert.ok(!beforeHidden.body.data.unlockedHiddenQuests.some((q: any) => q.id === 'QUEST_HIDDEN_ANCIENT_WELL'));

    const manualHiddenRes = await apiRequest(
      baseUrl,
      'POST',
      `/api/v1/characters/${characterId}/quests/QUEST_HIDDEN_ANCIENT_WELL/accept`,
      token,
      {}
    );
    assert.ok([400, 403].includes(manualHiddenRes.status));

    const trigRes = await apiRequest(baseUrl, 'POST', `/api/v1/characters/${characterId}/quests/progress`, token, {
      type: 'NPC_DIALOGUE',
      targetId: 'npc_elder',
      keyword: 'ancient_well',
    });
    assert.equal(trigRes.status, 200);
    assert.ok(trigRes.body.data.newlyDiscoveredHiddenQuests.includes('QUEST_HIDDEN_ANCIENT_WELL'));

    const afterHidden = await apiRequest(baseUrl, 'GET', `/api/v1/characters/${characterId}/quests`, token);
    assert.ok(!afterHidden.body.data.availableQuests.some((q: any) => q.id === 'QUEST_HIDDEN_ANCIENT_WELL'));
    assert.ok(afterHidden.body.data.unlockedHiddenQuests.some((q: any) => q.id === 'QUEST_HIDDEN_ANCIENT_WELL'));
    assert.ok(afterHidden.body.data.activeQuests.some((q: any) => q.questId === 'QUEST_HIDDEN_ANCIENT_WELL'));

    // Test E (Scenario 10 & 11): Shop Buy, Sell, Insufficient Gold, Full Inventory, and Non-Tradable Protection
    char.gold = 500;
    store.save();

    const buyRes = await apiRequest(baseUrl, 'POST', '/api/v1/game/shop/buy', token, {
      characterId,
      itemId: 'shop_hp_pot',
      quantity: 2,
    });
    assert.equal(buyRes.status, 200);
    assert.equal(buyRes.body.success, true);
    assert.equal(buyRes.body.data.totalCost, 70);
    assert.equal(buyRes.body.data.goldRemaining, 430);

    const poorRes = await apiRequest(baseUrl, 'POST', '/api/v1/game/shop/buy', token, {
      characterId,
      itemId: 'shop_sword_iron',
      quantity: 10,
    });
    assert.equal(poorRes.status, 400);
    assert.equal(poorRes.body.error, 'Không đủ vàng để mua vật phẩm.');

    const sellRes = await apiRequest(baseUrl, 'POST', '/api/v1/game/shop/sell', token, {
      characterId,
      itemId: 'ITEM_POTION_HP_SMALL',
      quantity: 1,
    });
    assert.equal(sellRes.status, 200);
    assert.equal(sellRes.body.success, true);
    assert.ok(sellRes.body.data.totalGoldEarned > 0);

    char.inventory.push({
      slotId: 28,
      itemId: 'ITEM_AWAKENING_CERTIFICATE',
      name: 'Chứng Chỉ Thức Tỉnh',
      isUnique: true,
      quantity: 1,
    });
    store.save();

    const sellQuestItemRes = await apiRequest(baseUrl, 'POST', '/api/v1/game/shop/sell', token, {
      characterId,
      itemId: 'ITEM_AWAKENING_CERTIFICATE',
      quantity: 1,
    });
    assert.equal(sellQuestItemRes.status, 400);

    const savedInv = [...char.inventory];
    char.gold = 50000;
    char.inventory = Array.from({ length: 30 }, (_, idx) => ({
      slotId: idx,
      itemId: `FILLER_EQUIP_${idx}`,
      name: `Trang Bị ${idx}`,
      category: 'equip',
      quantity: 1,
    }));
    store.save();

    const fullInvRes = await apiRequest(baseUrl, 'POST', '/api/v1/game/shop/buy', token, {
      characterId,
      itemId: 'shop_sword_iron',
      quantity: 1,
    });
    assert.equal(fullInvRes.status, 400);
    assert.equal(fullInvRes.body.error, 'Túi đồ không còn chỗ trống.');

    char.inventory = savedInv;
    store.save();

    // Test F (Scenario 10 & 13): Inventory Sort, Discard, Equipment Repair, and UI Source Verification
    const sortRes = await apiRequest(baseUrl, 'POST', '/api/v1/game/inventory/sort', token, { characterId });
    assert.equal(sortRes.status, 200);
    assert.equal(sortRes.body.success, true);

    const discardRes = await apiRequest(baseUrl, 'POST', '/api/v1/game/inventory/discard', token, {
      characterId,
      itemId: 'ITEM_POTION_HP_SMALL',
      quantity: 1,
    });
    assert.equal(discardRes.status, 200);
    assert.equal(discardRes.body.success, true);

    const repairRes = await apiRequest(baseUrl, 'POST', `/api/v1/characters/${characterId}/equipment/repair`, token, {});
    assert.equal(repairRes.status, 200);
    assert.equal(repairRes.body.success, true);

    const rootDir = path.resolve(__dirname, '../../../../');
    const indexHtml = fs.readFileSync(path.join(rootDir, 'apps/game-client/index.html'), 'utf-8');
    assert.ok(!indexHtml.includes('Dọn Sạch Ngoại Ô Làng'));
    assert.ok(indexHtml.includes('Chưa theo dõi nhiệm vụ'));
    assert.ok(indexHtml.includes('btn-hud-quest-untrack'));

    const worldModalsTs = fs.readFileSync(path.join(rootDir, 'apps/game-client/src/ui/WorldModals.ts'), 'utf-8');
    assert.ok(worldModalsTs.includes('1. NV Có Thể Nhận'));
    assert.ok(worldModalsTs.includes('2. NV Đang Làm'));
    assert.ok(worldModalsTs.includes('3. NV Hoàn Thành'));
    assert.ok(worldModalsTs.includes('4. NV Bí Ẩn'));

    const spriteManagerTs = fs.readFileSync(path.join(rootDir, 'apps/game-client/src/engine/SpriteManager.ts'), 'utf-8');
    assert.ok(spriteManagerTs.includes('questMarker'));

    // Test G (Scenario 14 & 15): Persistence across Re-Login / Reload
    await apiRequest(baseUrl, 'POST', '/api/v1/game/quests/track', token, {
      characterId,
      questId: 'QUEST_REG_ELYSIA_01',
    });

    const reLogin = await apiRequest(baseUrl, 'POST', '/api/v1/auth/login', undefined, { username, password });
    assert.equal(reLogin.status, 200);
    const freshToken = reLogin.body.data.token;

    const charFetch = await apiRequest(baseUrl, 'GET', `/api/v1/characters/${characterId}`, freshToken);
    assert.equal(charFetch.status, 200);
    const persistedChar = charFetch.body.data.character || charFetch.body.data;
    assert.equal(persistedChar.trackedQuestId, 'QUEST_REG_ELYSIA_01');
    assert.ok(persistedChar.completedQuests.includes('QUEST_001_SLIME_CLEAR'));
    assert.ok(persistedChar.discoveredHiddenQuests.includes('QUEST_HIDDEN_ANCIENT_WELL'));
    assert.ok(persistedChar.completedQuestHistory?.QUEST_001_SLIME_CLEAR?.completedAt);
  } finally {
    server.close();
    if (characterId) {
      const cIdx = store.characters.findIndex((c: any) => c.id === characterId);
      if (cIdx >= 0) store.characters.splice(cIdx, 1);
    }
    if (userId) {
      const uIdx = store.users.findIndex((u: any) => u.id === userId);
      if (uIdx >= 0) store.users.splice(uIdx, 1);
    }
    store.save();
  }
});
