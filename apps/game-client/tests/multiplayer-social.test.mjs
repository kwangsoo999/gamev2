import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createRequire } from 'node:module';
import { io as ioClient } from 'socket.io-client';
const serverRequire = createRequire(new URL('../../game-server/package.json', import.meta.url));
const { Server } = serverRequire('socket.io');
import { createApp } from '../../game-server/dist/app.js';
import { setupGameSockets } from '../../game-server/dist/sockets/gameSocket.js';
import { runMigrationsAndSeeds } from '../../game-server/dist/database/migrations.js';
import { JsonStore } from '../../game-server/dist/database/jsonStore.js';
import { CombatService } from '../../game-server/dist/services/combat.service.js';

function cleanup(store, userIds) {
  for (let i = store.characters.length - 1; i >= 0; i--) {
    if (userIds.includes(store.characters[i].userId || '')) store.characters.splice(i, 1);
  }
  for (let i = store.users.length - 1; i >= 0; i--) {
    if (userIds.includes(store.users[i].id)) store.users.splice(i, 1);
  }
  store.save();
}

function waitForEvent(socket, eventName, predicate = () => true, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(eventName, handler);
      reject(new Error(`Timed out waiting for socket event: ${eventName}`));
    }, timeoutMs);
    function handler(payload) {
      if (predicate(payload)) {
        clearTimeout(timer);
        socket.off(eventName, handler);
        resolve(payload);
      }
    }
    socket.on(eventName, handler);
  });
}

function emitAck(socket, eventName, payload = {}) {
  return new Promise((resolve) => {
    socket.emit(eventName, payload, (res) => resolve(res));
  });
}

test('Real 2-Player Socket.IO Multiplayer: Movement Sync, Novice Combat VFX, Chat, Party & Rollback-Safe Atomic Trade', async () => {
  await runMigrationsAndSeeds();
  const store = JsonStore.getInstance();
  const app = createApp();
  const httpServer = http.createServer(app);
  const ioServer = new Server(httpServer, { cors: { origin: '*' } });
  setupGameSockets(ioServer);

  await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const addr = httpServer.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  const createdUserIds = [];
  let sockA;
  let sockB;

  try {
    const g1 = await (await fetch(`${baseUrl}/api/v1/auth/guest`, { method: 'POST', headers: { Connection: 'close' } })).json();
    const g2 = await (await fetch(`${baseUrl}/api/v1/auth/guest`, { method: 'POST', headers: { Connection: 'close' } })).json();
    createdUserIds.push(g1.data.user.id, g2.data.user.id);

    const tokenA = g1.data.token;
    const tokenB = g2.data.token;
    const charA = g1.data.character;
    const charB = g2.data.character;

    // Seed gold + tradeable item + bound item directly in server store for HeroAlpha
    const recA = store.characters.find((c) => c.id === charA.id);
    const recB = store.characters.find((c) => c.id === charB.id);
    recA.gold = 500;
    recA.inventory = [
      { itemId: 'potion_hp', name: 'Bình Sinh Lực Nhỏ', quantity: 3 },
      { itemId: 'UEQ_TEST_BOUND', name: 'Vũ Khí Khóa Linh Hồn', quantity: 1 },
    ];
    recB.gold = 100;
    recB.inventory = [];
    store.save();

    // 1. Connect Alpha and Beta via real Socket.IO WebSocket client
    sockA = ioClient(baseUrl, { auth: { token: tokenA }, transports: ['websocket'] });
    sockB = ioClient(baseUrl, { auth: { token: tokenB }, transports: ['websocket'] });

    await Promise.all([waitForEvent(sockA, 'connect'), waitForEvent(sockB, 'connect')]);

    const monstersPromise = waitForEvent(sockA, 'world:monsters', (arr) => Array.isArray(arr) && arr.length > 0);
    const joinA = await emitAck(sockA, 'player:join', { characterId: charA.id });
    assert.equal(joinA.success, true);
    const regionMonsters = await monstersPromise;

    const joinedNoticePromise = waitForEvent(sockA, 'player:joined', (p) => p.characterId === charB.id);
    const peersBPromise = waitForEvent(sockB, 'world:players', (list) => Array.isArray(list) && list.some((p) => p.characterId === charA.id));
    const joinB = await emitAck(sockB, 'player:join', { characterId: charB.id });
    assert.equal(joinB.success, true);

    await Promise.all([joinedNoticePromise, peersBPromise]);

    // 2. Real-Time Movement Sync
    const movedPromise = waitForEvent(sockB, 'player:moved', (d) => d.characterId === charA.id);
    const moveRes = await emitAck(sockA, 'player:move', {
      x: joinA.data.x + 28,
      y: joinA.data.y + 12,
      animState: 'walk',
      direction: 'east',
    });
    assert.equal(moveRes.success, true);
    const movedData = await movedPromise;
    assert.equal(movedData.direction, 'east');

    // 3. Novice Combat Broadcast (Slash + Fireball Projectile) over Socket.IO
    const targetMon = regionMonsters[0];
    const pStateA = CombatService.getSharedInstance().getPlayer(charA.id);
    pStateA.x = targetMon.x - 35;
    pStateA.y = targetMon.y;

    const fireballEvt = waitForEvent(
      sockB,
      'combat:result',
      (res) => res.characterId === charA.id && res.skillId === 'SKILL_NOVICE_FIREBALL'
    );
    const fbAck = await emitAck(sockA, 'player:combat_action', {
      actionType: 'skill',
      skillId: 'SKILL_NOVICE_FIREBALL',
      targetId: targetMon.id,
    });
    assert.equal(fbAck.success, true);
    const fbResult = await fireballEvt;
    assert.ok(fbResult.projectile, 'Remote peer should receive projectile payload on Fireball');
    assert.equal(fbResult.damageType, 'magic');

    const listRes = await emitAck(sockA, 'world:list_players', { regionOnly: false });
    assert.equal(listRes.success, true);
    assert.ok(listRes.data.length >= 2);

    const inspectRes = await emitAck(sockA, 'player:inspect', { characterId: charB.id });
    assert.equal(inspectRes.success, true);
    assert.equal(inspectRes.data.characterId, charB.id);

    // Ping/Pong
    const pong = await emitAck(sockA, 'net:ping', { ts: Date.now() - 15 });
    assert.ok(pong.serverTs);

    // 4. Multi-channel Chat (Global + Whisper)
    const globalPromise = waitForEvent(sockB, 'chat:broadcast', (m) => m.channel === 'global' && m.message === 'Hello Elysia!');
    const gChat = await emitAck(sockA, 'chat:message', { channel: 'global', message: 'Hello Elysia!' });
    assert.equal(gChat.success, true);
    await globalPromise;

    const whisperPromise = waitForEvent(sockB, 'chat:broadcast', (m) => m.channel === 'whisper' && m.message === 'Secret!');
    const wChat = await emitAck(sockA, 'chat:message', { channel: 'whisper', targetName: charB.name, message: 'Secret!' });
    assert.equal(wChat.success, true);
    await whisperPromise;

    // 5. Party System + Party Chat
    const pCreate = await emitAck(sockA, 'party:create', {});
    assert.equal(pCreate.success, true);
    const partyId = pCreate.data.partyId;

    const inviteEvt = waitForEvent(sockB, 'party:invite_received', (inv) => inv.partyId === partyId);
    const pInv = await emitAck(sockA, 'party:invite', { targetIdentifier: charB.name });
    assert.equal(pInv.success, true);
    await inviteEvt;

    const partyUpdatedA = waitForEvent(sockA, 'party:updated', (p) => p && p.members.length === 2);
    const pResp = await emitAck(sockB, 'party:respond', { partyId, accept: true });
    assert.equal(pResp.success, true);
    await partyUpdatedA;

    // 6. Server-Authoritative Atomic Trade + Anti-Scam Unlock + Bound Item Reject
    const tradeReqEvt = waitForEvent(sockB, 'trade:request_received', (r) => r.fromCharacterId === charA.id);
    const tReq = await emitAck(sockA, 'trade:request', { targetIdentifier: charB.name });
    assert.equal(tReq.success, true);
    await tradeReqEvt;

    const tAccept = await emitAck(sockB, 'trade:respond', { fromCharacterId: charA.id, accept: true });
    assert.equal(tAccept.success, true);
    const tradeId = tAccept.data.tradeId;

    // Bound equipment must be rejected
    const badBound = await emitAck(sockA, 'trade:update_offer', {
      tradeId,
      gold: 50,
      items: [{ itemId: 'UEQ_TEST_BOUND', quantity: 1 }],
    });
    assert.equal(badBound.success, false);

    // Valid offer + lock both + anti-scam reset test
    const okOffer1 = await emitAck(sockA, 'trade:update_offer', {
      tradeId,
      gold: 100,
      items: [{ itemId: 'potion_hp', quantity: 1 }],
    });
    assert.equal(okOffer1.success, true);
    await emitAck(sockA, 'trade:lock', { tradeId });
    const lockB = await emitAck(sockB, 'trade:lock', { tradeId });
    assert.equal(lockB.success, true);

    // Modify offer after lock -> BOTH locks must automatically unlock!
    const modified = await emitAck(sockA, 'trade:update_offer', {
      tradeId,
      gold: 50,
      items: [{ itemId: 'potion_hp', quantity: 1 }],
    });
    assert.equal(modified.success, true);
    assert.equal(modified.data.parties.every((s) => !s.locked && !s.confirmed), true);

    // Finalize atomic trade
    await emitAck(sockA, 'trade:lock', { tradeId });
    await emitAck(sockB, 'trade:lock', { tradeId });
    const completedEvt = waitForEvent(sockB, 'trade:completed', (s) => s.tradeId === tradeId);
    await emitAck(sockA, 'trade:confirm', { tradeId });
    await emitAck(sockB, 'trade:confirm', { tradeId });
    await completedEvt;

    // Verify zero duplication / exact server-authoritative inventory & gold transfer
    assert.equal(recA.gold, 450);
    assert.equal(recB.gold, 150);
    assert.equal(recA.inventory.find((i) => i.itemId === 'potion_hp').quantity, 2);
    assert.equal(recB.inventory.find((i) => i.itemId === 'potion_hp').quantity, 1);

    // 7. Revoked Token (Logout) cannot connect new Socket.IO session
    const outRes = await fetch(`${baseUrl}/api/v1/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}`, Connection: 'close' },
    });
    assert.equal(outRes.status, 200);
    const badSock = ioClient(baseUrl, { auth: { token: tokenA }, transports: ['websocket'], reconnection: false });
    const errEvt = await waitForEvent(badSock, 'connect_error', () => true);
    assert.match(String(errEvt.message || ''), /UNAUTHORIZED/i);
    badSock.close();
  } finally {
    sockA?.close();
    sockB?.close();
    cleanup(store, createdUserIds);
    ioServer.disconnectSockets?.(true);
    httpServer.closeAllConnections?.();
    await new Promise((resolve) => ioServer.close(resolve));
    await new Promise((resolve) => httpServer.close(() => resolve()));
  }
});
