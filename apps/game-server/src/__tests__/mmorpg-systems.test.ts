import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { JsonStore } from '../database/jsonStore.js';
import { runMigrationsAndSeeds } from '../database/migrations.js';
import { CombatService } from '../services/combat.service.js';
import { WorldService } from '../services/world.service.js';

function cleanupUsersAndChars(store: JsonStore, userIds: string[]) {
  for (let i = store.characters.length - 1; i >= 0; i--) {
    if (userIds.includes(store.characters[i].userId || '')) {
      store.characters.splice(i, 1);
    }
  }
  for (let i = store.users.length - 1; i >= 0; i--) {
    if (userIds.includes(store.users[i].id)) {
      store.users.splice(i, 1);
    }
  }
  store.save();
}

test.before(async () => {
  await runMigrationsAndSeeds();
});

test('1. Account Register, Brute-Force Lock, Password Reset/Change & Logout JTI Revocation', async () => {
  const store = JsonStore.getInstance();
  const app = createApp();
  const server = app.listen(0);
  const addr: any = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  const createdUserIds: string[] = [];

  try {
    const suffix = Date.now().toString(36).slice(-5);
    const username = `sec_${suffix}`;
    const email = `${username}@elysia.test`;

    // Register
    const regRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password: 'Password123!' }),
    });
    assert.equal(regRes.status, 201);
    const regJson: any = await regRes.json();
    const userId = regJson.data.user.id;
    const token1 = regJson.data.token;
    createdUserIds.push(userId);

    // /me works initially
    const me1 = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token1}` },
    });
    assert.equal(me1.status, 200);

    // Trigger 5 failed logins -> lock out on 6th attempt
    for (let i = 0; i < 5; i++) {
      const bad = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail: username, password: 'WrongPassword!' }),
      });
      assert.equal(bad.status, 401);
    }
    const lockedRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernameOrEmail: username, password: 'Password123!' }),
    });
    assert.equal(lockedRes.status, 401);
    const lockedJson: any = await lockedRes.json();
    assert.match(String(lockedJson.error || ''), /khóa bảo vệ/i);

    // Forgot & Reset Password (also clears brute-force lock cleanly)
    const forgotRes = await fetch(`${baseUrl}/api/v1/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernameOrEmail: email }),
    });
    assert.equal(forgotRes.status, 200);
    const forgotJson: any = await forgotRes.json();
    assert.ok(forgotJson.data?.devResetCode);

    const resetRes = await fetch(`${baseUrl}/api/v1/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usernameOrEmail: email,
        resetCode: forgotJson.data.devResetCode,
        newPassword: 'ResetPassword99!',
      }),
    });
    assert.equal(resetRes.status, 200);

    // Change Password after logging in with reset password
    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernameOrEmail: username, password: 'ResetPassword99!' }),
    });
    assert.equal(loginRes.status, 200);
    const loginJson: any = await loginRes.json();
    const token2 = loginJson.data.token;

    const chgRes = await fetch(`${baseUrl}/api/v1/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token2}`,
      },
      body: JSON.stringify({ currentPassword: 'ResetPassword99!', newPassword: 'FinalPassword77!' }),
    });
    assert.equal(chgRes.status, 200);

    // Logout revokes token2 immediately via JTI blocklist
    const outRes = await fetch(`${baseUrl}/api/v1/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token2}` },
    });
    assert.equal(outRes.status, 200);

    const afterLogoutMe = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token2}` },
    });
    assert.equal(afterLogoutMe.status, 401);
  } finally {
    cleanupUsersAndChars(store, createdUserIds);
    server.close();
  }
});

test('2. Admin Max Characters Config, Creation Appearance Persistence, Confirm Delete & Strict Novice 2-Skill Rule', async () => {
  const store = JsonStore.getInstance();
  const ws = WorldService.getInstance();
  const prevLimit = ws.getMaxCharactersPerAccount();
  const app = createApp();
  const server = app.listen(0);
  const addr: any = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  const createdUserIds: string[] = [];

  try {
    // Admin updates maxCharactersPerAccount = 2
    const cfgPatch = await fetch(`${baseUrl}/api/v1/admin/world/config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxCharactersPerAccount: 2 }),
    });
    assert.equal(cfgPatch.status, 200);

    const suffix = Date.now().toString(36).slice(-5);
    const reg = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: `acct_${suffix}`,
        email: `acct_${suffix}@elysia.test`,
        password: 'Password123!',
      }),
    });
    const regJson: any = await reg.json();
    const token = regJson.data.token;
    createdUserIds.push(regJson.data.user.id);

    // Character 1 with full customization
    const name1 = `Aria_${suffix}`;
    const c1 = await fetch(`${baseUrl}/api/v1/characters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: name1,
        gender: 'female',
        appearance: {
          faceId: 'face_emerald_02',
          hairstyleId: 'hair_twintail',
          hairColor: '#f59e0b',
          eyeColor: '#10b981',
          outfitId: 'outfit_novice_tunics',
        },
        useCreationBonusPool: true,
        bonusAllocations: { int: 4, agi: 2 },
      }),
    });
    assert.equal(c1.status, 201);
    const c1Json: any = await c1.json();
    const char1 = c1Json.data;
    assert.equal(char1.classId, 'adventurer');
    assert.equal(char1.appearance.faceId, 'face_emerald_02');
    assert.equal(char1.appearance.hairstyleId, 'hair_twintail');
    assert.equal(char1.appearance.outfitId, 'outfit_novice_tunics');
    assert.deepEqual(char1.unlockedSkills, ['SKILL_NOVICE_SLASH', 'SKILL_NOVICE_FIREBALL']);

    // Novice cannot learn unauthorized fake skills
    const badSkill = await fetch(`${baseUrl}/api/v1/characters/${char1.id}/learn-skill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ skillId: 'skill_3' }),
    });
    assert.equal(badSkill.status, 400);

    // Character 2 allowed; Character 3 blocked by admin maxCharactersPerAccount = 2
    const c2 = await fetch(`${baseUrl}/api/v1/characters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: `Kaito_${suffix}`, gender: 'male' }),
    });
    assert.equal(c2.status, 201);

    const c3 = await fetch(`${baseUrl}/api/v1/characters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: `Blocked_${suffix}`, gender: 'male' }),
    });
    assert.equal(c3.status, 400);

    // List returns meta.maxCharactersPerAccount === 2
    const listRes = await fetch(`${baseUrl}/api/v1/characters`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const listJson: any = await listRes.json();
    assert.equal(listJson.meta?.maxCharactersPerAccount, 2);

    // Delete with mismatched confirmName fails; matching confirmName succeeds
    const badDel = await fetch(`${baseUrl}/api/v1/characters/${char1.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ confirmName: 'WRONG_NAME' }),
    });
    assert.equal(badDel.status, 400);

    const goodDel = await fetch(`${baseUrl}/api/v1/characters/${char1.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ confirmName: name1 }),
    });
    assert.equal(goodDel.status, 200);
  } finally {
    ws.updateWorldConfig({ maxCharactersPerAccount: prevLimit });
    cleanupUsersAndChars(store, createdUserIds);
    server.close();
  }
});

test('3. Exact 8 Second-Job Specializations & Server Combat Novice Slash/Fireball Rules', async () => {
  const store = JsonStore.getInstance();
  const app = createApp();
  const server = app.listen(0);
  const addr: any = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  const createdUserIds: string[] = [];

  try {
    const sjRes = await fetch(`${baseUrl}/api/v1/game/second-jobs`);
    assert.equal(sjRes.status, 200);
    const sjJson: any = await sjRes.json();
    const names = (sjJson.data || []).map((x: any) => x.name);
    for (const expected of [
      'Blazing Warrior',
      'Wind Lancer',
      'Divine Paladin',
      'Holy Priest',
      'Arcane Wizard',
      'Shadow Phantom',
      'Titan Champion',
      'Celestial Ranger',
    ]) {
      assert.ok(names.includes(expected), `Missing Second Job: ${expected}`);
    }

    // Guest session gives Novice
    const gRes = await fetch(`${baseUrl}/api/v1/auth/guest`, { method: 'POST' });
    const gJson: any = await gRes.json();
    createdUserIds.push(gJson.data.user.id);
    const char = gJson.data.character;

    const combat = CombatService.getSharedInstance();
    const joined = combat.join(gJson.data.user.id, char.id);
    const targetMon = combat.getRegionMonsters(joined.snapshot.regionId)[0];
    assert.ok(targetMon, 'Expected monster in starter region');

    // Move near target monster cleanly for combat range test
    const storedPlayer = combat.getPlayer(char.id)!;
    storedPlayer.x = targetMon.x - 40;
    storedPlayer.y = targetMon.y;

    // Physical Directional Slash
    const slashRes: any = combat.attack(char.id, {
      actionType: 'skill',
      skillId: 'SKILL_NOVICE_SLASH',
      targetId: targetMon.id,
    });
    assert.equal(slashRes.damageType, 'physical');
    assert.ok(slashRes.hitbox);

    // Magic Fireball Projectile
    const fbRes: any = combat.attack(char.id, {
      actionType: 'skill',
      skillId: 'SKILL_NOVICE_FIREBALL',
      targetId: targetMon.id,
    });
    assert.equal(fbRes.damageType, 'magic');
    assert.ok(fbRes.projectile);

    // Reject unauthorized Novice skill in combat
    assert.throws(() => {
      combat.attack(char.id, {
        actionType: 'skill',
        skillId: 'skill_3',
        targetId: targetMon.id,
      });
    });

    combat.leave(char.id);
  } finally {
    cleanupUsersAndChars(store, createdUserIds);
    server.close();
  }
});
