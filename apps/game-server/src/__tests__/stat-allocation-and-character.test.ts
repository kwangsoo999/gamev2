import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { CREATION_BONUS_POOL, validatePendingStatAllocations } from '@elysia/validation';
import { createApp } from '../app.js';
import { ENV } from '../config/env.js';
import { JsonStore } from '../database/jsonStore.js';
import { runMigrationsAndSeeds } from '../database/migrations.js';
import { CharacterService } from '../services/character.service.js';

function cleanupUserAndChars(store: JsonStore, userIds: string[]) {
  for (let i = store.characters.length - 1; i >= 0; i--) {
    if (userIds.includes(store.characters[i].userId || '')) store.characters.splice(i, 1);
  }
  for (let i = store.users.length - 1; i >= 0; i--) {
    if (userIds.includes(store.users[i].id)) store.users.splice(i, 1);
  }
  store.save();
}

test.before(async () => {
  await runMigrationsAndSeeds();
});

test('1. Validation Helper Enforces 6-Point Pool, Non-Negative Integers & Stat Cap', () => {
  assert.equal(CREATION_BONUS_POOL, 6);
  assert.equal(validatePendingStatAllocations({ str: 2, dex: 1 }, 6, { str: 10, dex: 10, agi: 10, int: 10, con: 10 }).isValid, true);
  assert.equal(validatePendingStatAllocations({ str: 7 }, 6, { str: 10, dex: 10, agi: 10, int: 10, con: 10 }).isValid, false);
  assert.equal(validatePendingStatAllocations({ str: -1 }, 6).isValid, false);
  assert.equal(validatePendingStatAllocations({ str: 1.5 }, 6).isValid, false);
  assert.equal(validatePendingStatAllocations({}, 6).isValid, false);
  assert.equal(validatePendingStatAllocations({ str: 5 }, 6, { str: 248, dex: 10, agi: 10, int: 10, con: 10 }, 250).isValid, false);
});

test('2. Guest Session & Character Creation Initialize 6 Unspent Points with Zero Pre-Allocation', async () => {
  const store = JsonStore.getInstance();
  const app = createApp();
  const server = app.listen(0);
  const addr: any = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  const createdUserIds: string[] = [];

  try {
    // A. Guest Auth provisions Lv.1 Adventurer with 6 unspent points
    const guestRes = await fetch(`${baseUrl}/api/v1/auth/guest`, { method: 'POST' });
    assert.equal(guestRes.status, 201);
    const guestJson: any = await guestRes.json();
    assert.equal(guestJson.success, true);
    const token = guestJson.data.token;
    const guestUserId = guestJson.data.user.id;
    createdUserIds.push(guestUserId);

    const starterChar = guestJson.data.character;
    assert.equal(starterChar.unspentStatPoints, 6);
    assert.equal(starterChar.availableAttributePoints, 6);
    for (const k of ['str', 'dex', 'agi', 'int', 'con'] as const) {
      assert.ok(starterChar.baseStats[k] >= 8 && starterChar.baseStats[k] <= 12);
    }

    // B. Creating a second character with 0 pre-spent bonus retains 6 unspent points
    const charName = `HeroZero_${Date.now().toString(36).slice(-5)}`;
    const createRes = await fetch(`${baseUrl}/api/v1/characters`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: charName,
        gender: 'female',
        classId: 'adventurer',
        useCreationBonusPool: true,
        bonusAllocations: { str: 0, dex: 0, agi: 0, int: 0, con: 0 },
      }),
    });
    assert.equal(createRes.status, 201);
    const createJson: any = await createRes.json();
    assert.equal(createJson.data.unspentStatPoints, 6);
    for (const k of ['str', 'dex', 'agi', 'int', 'con'] as const) {
      assert.ok(createJson.data.baseStats[k] >= 8 && createJson.data.baseStats[k] <= 12);
    }

    // C. Reject creation cheat exceeding 6 bonus points
    const cheatCreateRes = await fetch(`${baseUrl}/api/v1/characters`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: `CheatHero_${Date.now().toString(36).slice(-4)}`,
        gender: 'male',
        classId: 'adventurer',
        useCreationBonusPool: true,
        bonusAllocations: { str: 8, dex: 0, agi: 0, int: 0, con: 0 },
      }),
    });
    assert.equal(cheatCreateRes.status, 400);
  } finally {
    cleanupUserAndChars(store, createdUserIds);
    server.close();
  }
});

test('3. Server-Authoritative Stat Allocation, Computed HP/MP/ATK/DEF Sync, Persistence & Anti-Cheat Rejection', async () => {
  const store = JsonStore.getInstance();
  const app = createApp();
  const server = app.listen(0);
  const addr: any = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  const createdUserIds: string[] = [];

  try {
    const guestRes = await fetch(`${baseUrl}/api/v1/auth/guest`, { method: 'POST' });
    const guestJson: any = await guestRes.json();
    const token = guestJson.data.token;
    const userId = guestJson.data.user.id;
    const charId = guestJson.data.character.id;
    const baseBefore = { ...guestJson.data.character.baseStats };
    const initialMaxHp = guestJson.data.computedStats.computed.maxHp;
    const initialMaxMp = guestJson.data.computedStats.computed.maxMp;
    const initialAtk = guestJson.data.computedStats.computed.atk;
    createdUserIds.push(userId);

    // 1. Allocate 3 STR, 2 CON, 1 INT (all 6 points) via /allocate-stats
    const allocRes = await fetch(`${baseUrl}/api/v1/characters/${charId}/allocate-stats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ allocations: { str: 3, con: 2, int: 1 } }),
    });
    assert.equal(allocRes.status, 200);
    const allocJson: any = await allocRes.json();
    assert.equal(allocJson.success, true);
    assert.equal(allocJson.data.unspentStatPoints, 0);
    assert.equal(allocJson.data.availableAttributePoints, 0);
    assert.equal(allocJson.data.baseStats.str, baseBefore.str + 3);
    assert.equal(allocJson.data.baseStats.con, baseBefore.con + 2);
    assert.equal(allocJson.data.baseStats.int, baseBefore.int + 1);
    assert.ok(allocJson.computedStats.computed.atk > initialAtk, 'ATK must increase after STR allocation');
    assert.ok(allocJson.computedStats.computed.maxHp > initialMaxHp, 'MaxHP must increase after CON allocation');
    assert.ok(allocJson.computedStats.computed.maxMp > initialMaxMp, 'MaxMP must increase after INT allocation');

    // 2. Simulate Reload -> GET /api/v1/characters/:id confirms persisted stats
    const reloadRes = await fetch(`${baseUrl}/api/v1/characters/${charId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(reloadRes.status, 200);
    const reloadJson: any = await reloadRes.json();
    assert.equal(reloadJson.data.baseStats.str, baseBefore.str + 3);
    assert.equal(reloadJson.data.baseStats.con, baseBefore.con + 2);
    assert.equal(reloadJson.data.unspentStatPoints, 0);

    // 3. Cheat attempt: overspend when remaining == 0 -> REJECTED 400
    const cheatOverRes = await fetch(`${baseUrl}/api/v1/characters/${charId}/stats/allocate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ str: 5 }),
    });
    assert.equal(cheatOverRes.status, 400);
    const afterCheat = await (await fetch(`${baseUrl}/api/v1/characters/${charId}`, { headers: { Authorization: `Bearer ${token}` } })).json() as any;
    assert.equal(afterCheat.data.baseStats.str, baseBefore.str + 3, 'Rejected cheat must leave committed stats untouched');

    // 4. Cheat attempt: negative value -> REJECTED 400
    const cheatNegRes = await fetch(`${baseUrl}/api/v1/characters/${charId}/allocate-stats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ str: -3 }),
    });
    assert.equal(cheatNegRes.status, 400);

    // 5. Ownership violation: another player token -> REJECTED 403
    const otherToken = jwt.sign({ id: 'USR_THIEF_999', username: 'thief', role: 'player' }, ENV.JWT_SECRET);
    const thiefRes = await fetch(`${baseUrl}/api/v1/characters/${charId}/allocate-stats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${otherToken}`,
      },
      body: JSON.stringify({ str: 1 }),
    });
    assert.equal(thiefRes.status, 403);
  } finally {
    cleanupUserAndChars(store, createdUserIds);
    server.close();
  }
});

test('4. Transactional Rollback Restores Exact Character Stats if Persistence Fails', async () => {
  const store = JsonStore.getInstance();
  const charSvc = new CharacterService();
  const userId = `USR_TX_${Date.now().toString(36)}`;
  const char = await charSvc.createCharacter(userId, {
    name: `TxHero_${Date.now().toString(36).slice(-4)}`,
    gender: 'male',
    classId: 'adventurer',
    useCreationBonusPool: true,
    bonusAllocations: { str: 0, dex: 0, agi: 0, int: 0, con: 0 },
  });

  const origStr = char.baseStats.str;
  const origCon = char.baseStats.con;
  const originalSave = store.save.bind(store);
  try {
    store.save = () => {
      throw new Error('Simulated DB disk failure');
    };
    await assert.rejects(() => charSvc.allocateAttributePoints(char.id, { str: 4, con: 2 }), /Simulated DB disk failure/);
    assert.equal(char.baseStats.str, origStr, 'STR must rollback to initial value');
    assert.equal(char.baseStats.con, origCon, 'CON must rollback to initial value');
    assert.equal(char.unspentStatPoints, 6, 'unspentStatPoints must rollback to 6');
  } finally {
    store.save = originalSave;
    cleanupUserAndChars(store, [userId]);
  }
});
