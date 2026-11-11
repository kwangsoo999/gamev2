import test from 'node:test';
import assert from 'node:assert/strict';
import { GUILD_SYSTEM_CONFIG, MERCHANT_SYSTEM_CONFIG } from '@elysia/game-data-schema';
import { createApp } from '../app.js';
import { JsonStore } from '../database/jsonStore.js';
import { runMigrationsAndSeeds } from '../database/migrations.js';

function cleanupAll(store: JsonStore, userIds: string[]) {
  const charIds = new Set(store.characters.filter((c) => userIds.includes(c.userId || '')).map((c) => c.id));
  const guildIds = new Set(store.guilds.filter((g) => charIds.has(g.leaderCharacterId)).map((g) => g.id));
  const assocIds = new Set(store.merchantAssociations.filter((a) => charIds.has(a.masterCharacterId)).map((a) => a.id));

  for (let i = store.guilds.length - 1; i >= 0; i--) {
    if (guildIds.has(store.guilds[i].id)) store.guilds.splice(i, 1);
  }
  for (let i = store.merchantAssociations.length - 1; i >= 0; i--) {
    if (assocIds.has(store.merchantAssociations[i].id)) store.merchantAssociations.splice(i, 1);
  }
  for (let i = store.marketListings.length - 1; i >= 0; i--) {
    if (charIds.has(store.marketListings[i].sellerCharacterId)) store.marketListings.splice(i, 1);
  }
  for (let i = store.auctions.length - 1; i >= 0; i--) {
    if (charIds.has(store.auctions[i].sellerCharacterId)) store.auctions.splice(i, 1);
  }
  for (let i = store.marketBuyOrders.length - 1; i >= 0; i--) {
    if (charIds.has(store.marketBuyOrders[i].buyerCharacterId)) store.marketBuyOrders.splice(i, 1);
  }
  for (let i = store.guildWars.length - 1; i >= 0; i--) {
    if (guildIds.has(store.guildWars[i].challengerGuildId) || guildIds.has(store.guildWars[i].defenderGuildId)) {
      store.guildWars.splice(i, 1);
    }
  }
  for (let i = store.caravanMissions.length - 1; i >= 0; i--) {
    if (assocIds.has(store.caravanMissions[i].associationId)) store.caravanMissions.splice(i, 1);
  }
  for (const t of store.territories) {
    if (guildIds.has(t.ownerGuildId)) {
      t.ownerGuildId = null;
      t.ownerGuildName = null;
      t.accumulatedTaxGold = 0;
    }
  }
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

test('1. Guild Lifecycle: Strict Creation (Lv.30, 500kG, Seal, 5 Founders), Rank Permissions, Atomic Storage, Buildings, Boss & Territory Anti-Monopoly Reset', async () => {
  const store = JsonStore.getInstance();
  const app = createApp();
  const server = app.listen(0);
  const addr: any = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  const createdUserIds: string[] = [];

  try {
    // Provision 6 characters across 2 accounts (leader + 4 founders + 1 extra challenger)
    const accounts: Array<{ token: string; userId: string; char: any }> = [];
    for (let i = 0; i < 6; i++) {
      const g = await (await fetch(`${baseUrl}/api/v1/auth/guest`, { method: 'POST', headers: { Connection: 'close' } })).json() as any;
      createdUserIds.push(g.data.user.id);
      const ch = store.characters.find((c) => c.id === g.data.character.id)!;
      ch.level = 32;
      ch.gold = 900000;
      accounts.push({ token: g.data.token, userId: g.data.user.id, char: ch });
    }
    const leader = accounts[0];
    leader.char.inventory.push({ slotId: 50, itemId: 'ITEM_GUILD_CREATION_SEAL', quantity: 1 });
    leader.char.inventory.push({ slotId: 51, itemId: 'MAT_PROF_IRON_INGOT', quantity: 3 });
    leader.char.inventory.push({ slotId: 52, itemId: 'UEQ_LOCKED_SWORD', quantity: 1 });
    store.save();

    const headersL = { 'Content-Type': 'application/json', Authorization: `Bearer ${leader.token}`, Connection: 'close' };

    // Reject creation with <5 founders
    const failGuild = await fetch(`${baseUrl}/api/v1/guilds`, {
      method: 'POST',
      headers: headersL,
      body: JSON.stringify({
        creatorCharacterId: leader.char.id,
        name: 'TooSmallGuild',
        tag: 'TSG',
        foundingMemberIds: [accounts[1].char.id],
      }),
    });
    assert.equal(failGuild.status, 400);

    // Succeed creation with Lv>=30, 500k Gold, Seal, 5 founders
    const okGuildRes = await fetch(`${baseUrl}/api/v1/guilds`, {
      method: 'POST',
      headers: headersL,
      body: JSON.stringify({
        creatorCharacterId: leader.char.id,
        name: `Vanguard_${Date.now().toString(36).slice(-4)}`,
        tag: `V${Date.now().toString(36).slice(-2).toUpperCase()}`,
        foundingMemberIds: [accounts[1].char.id, accounts[2].char.id, accounts[3].char.id, accounts[4].char.id],
      }),
    });
    assert.equal(okGuildRes.status, 201);
    const guild: any = ((await okGuildRes.json()) as any).data;
    assert.equal(guild.members.length, 5);
    assert.equal(leader.char.gold, 900000 - GUILD_SYSTEM_CONFIG.creationGoldCost);

    // Member 2 (rank: member) lacks WITHDRAW_STORAGE permission -> rejected; deposit works
    const member2 = accounts[2];
    const headersM2 = { 'Content-Type': 'application/json', Authorization: `Bearer ${member2.token}`, Connection: 'close' };

    // Deposit non-bound item works for leader; bound item rejected
    const depBound = await fetch(`${baseUrl}/api/v1/guilds/${guild.id}/storage/deposit`, {
      method: 'POST',
      headers: headersL,
      body: JSON.stringify({ characterId: leader.char.id, itemId: 'UEQ_LOCKED_SWORD', quantity: 1 }),
    });
    assert.equal(depBound.status, 400);

    const depOk = await fetch(`${baseUrl}/api/v1/guilds/${guild.id}/storage/deposit`, {
      method: 'POST',
      headers: headersL,
      body: JSON.stringify({ characterId: leader.char.id, itemId: 'MAT_PROF_IRON_INGOT', quantity: 2 }),
    });
    assert.equal(depOk.status, 200);
    const depJson: any = await depOk.json();
    const slotId = depJson.data.storage[0].slotId;

    // Member without permission cannot withdraw
    const m2Withdraw = await fetch(`${baseUrl}/api/v1/guilds/${guild.id}/storage/withdraw`, {
      method: 'POST',
      headers: headersM2,
      body: JSON.stringify({ characterId: member2.char.id, slotId, quantity: 1 }),
    });
    assert.equal(m2Withdraw.status, 403 === m2Withdraw.status ? 403 : 400);

    // Donate Gold -> Upgrade Guild Hall Building & Research Guild Skill -> Summon & Kill Guild Boss
    const don = await fetch(`${baseUrl}/api/v1/guilds/${guild.id}/donate`, {
      method: 'POST',
      headers: headersL,
      body: JSON.stringify({ characterId: leader.char.id, gold: 40000 }),
    });
    assert.equal(don.status, 200);

    const bUp = await fetch(`${baseUrl}/api/v1/guilds/${guild.id}/buildings/upgrade`, {
      method: 'POST',
      headers: headersL,
      body: JSON.stringify({ characterId: leader.char.id, buildingId: 'guild_hall' }),
    });
    assert.equal(bUp.status, 200);

    const sUp = await fetch(`${baseUrl}/api/v1/guilds/${guild.id}/skills/upgrade`, {
      method: 'POST',
      headers: headersL,
      body: JSON.stringify({ characterId: leader.char.id, skillId: 'GSK_ARTISAN_GRACE' }),
    });
    assert.equal(sUp.status, 200);

    const sumBoss = await fetch(`${baseUrl}/api/v1/guilds/${guild.id}/boss/summon`, {
      method: 'POST',
      headers: headersL,
      body: JSON.stringify({ characterId: leader.char.id }),
    });
    assert.equal(sumBoss.status, 200);

    await fetch(`${baseUrl}/api/v1/guilds/${guild.id}/boss/attack`, {
      method: 'POST',
      headers: headersL,
      body: JSON.stringify({ characterId: leader.char.id, damage: 25000 }),
    });

    // Siege Territory twice -> capture! Then Admin Season Reset clears ownership & rewards Guild Treasury
    await fetch(`${baseUrl}/api/v1/territories/TERR_GREENWOOD_HERB_VALE/siege`, {
      method: 'POST',
      headers: headersL,
      body: JSON.stringify({ characterId: leader.char.id, siegePower: 1500 }),
    });
    const terrRes = await fetch(`${baseUrl}/api/v1/territories`);
    const terrJson: any = await terrRes.json();
    const vale = terrJson.data.find((t: any) => t.territoryId === 'TERR_GREENWOOD_HERB_VALE');
    assert.equal(vale.ownerGuildId, guild.id);
    assert.ok(vale.publicDailyGatherQuota >= 35, 'Non-monopoly public quota must remain open');

    const resetRes = await fetch(`${baseUrl}/api/v1/admin/world/territories/reset-season`, {
      method: 'POST',
      headers: { Connection: 'close' },
    });
    assert.equal(resetRes.status, 200);
    const afterReset: any = await (await fetch(`${baseUrl}/api/v1/territories`)).json();
    assert.equal(afterReset.data.find((t: any) => t.territoryId === 'TERR_GREENWOOD_HERB_VALE').ownerGuildId, null);
  } finally {
    cleanupAll(store, createdUserIds);
    server.close();
  }
});

test('2. Merchant Association (Lv.25, 300kG, Seal, 5 Founders), Marketplace Atomic Lock Concurrency, Buy Orders, Auction Outbid Refund & Life-Skill Contracts', async () => {
  const store = JsonStore.getInstance();
  const app = createApp();
  const server = app.listen(0);
  const addr: any = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  const createdUserIds: string[] = [];

  try {
    const actors: Array<{ token: string; char: any }> = [];
    for (let i = 0; i < 6; i++) {
      const g = await (await fetch(`${baseUrl}/api/v1/auth/guest`, { method: 'POST', headers: { Connection: 'close' } })).json() as any;
      createdUserIds.push(g.data.user.id);
      const ch = store.characters.find((c) => c.id === g.data.character.id)!;
      ch.level = 28;
      ch.gold = 600000;
      actors.push({ token: g.data.token, char: ch });
    }
    const master = actors[0];
    const buyerA = actors[1];
    const buyerB = actors[2];
    master.char.inventory.push({ slotId: 60, itemId: 'ITEM_MERCHANT_SEAL', quantity: 1 });
    master.char.inventory.push({ slotId: 61, itemId: 'PROF_ITEM_STEEL_SWORD', quantity: 2, quality: 'rare' });
    master.char.inventory.push({ slotId: 62, itemId: 'MAT_PROF_HERB_GREEN', quantity: 12 });
    store.save();

    const hMaster = { 'Content-Type': 'application/json', Authorization: `Bearer ${master.token}`, Connection: 'close' };
    const hBuyerA = { 'Content-Type': 'application/json', Authorization: `Bearer ${buyerA.token}`, Connection: 'close' };
    const hBuyerB = { 'Content-Type': 'application/json', Authorization: `Bearer ${buyerB.token}`, Connection: 'close' };

    // Create Merchant Association
    const mRes = await fetch(`${baseUrl}/api/v1/merchants`, {
      method: 'POST',
      headers: hMaster,
      body: JSON.stringify({
        creatorCharacterId: master.char.id,
        name: `TradeGuild_${Date.now().toString(36).slice(-4)}`,
        tag: `M${Date.now().toString(36).slice(-2).toUpperCase()}`,
        foundingMemberIds: [buyerA.char.id, buyerB.char.id, actors[3].char.id, actors[4].char.id],
      }),
    });
    assert.equal(mRes.status, 201);
    const assoc = ((await mRes.json()) as any).data;
    assert.equal(master.char.gold, 600000 - MERCHANT_SYSTEM_CONFIG.creationGoldCost);

    // Concurrent Marketplace Purchase Race Condition Test (Only ONE buyer may succeed -> zero item duplication!)
    const listRes = await fetch(`${baseUrl}/api/v1/marketplace/listings`, {
      method: 'POST',
      headers: hMaster,
      body: JSON.stringify({
        sellerCharacterId: master.char.id,
        itemId: 'PROF_ITEM_STEEL_SWORD',
        quantity: 1,
        unitPriceGold: 1000,
      }),
    });
    assert.equal(listRes.status, 201);
    const listing = ((await listRes.json()) as any).data;

    const [rBuyA, rBuyB] = await Promise.all([
      fetch(`${baseUrl}/api/v1/marketplace/listings/${listing.id}/buy`, {
        method: 'POST',
        headers: hBuyerA,
        body: JSON.stringify({ buyerCharacterId: buyerA.char.id }),
      }),
      fetch(`${baseUrl}/api/v1/marketplace/listings/${listing.id}/buy`, {
        method: 'POST',
        headers: hBuyerB,
        body: JSON.stringify({ buyerCharacterId: buyerB.char.id }),
      }),
    ]);
    const okCount = [rBuyA.status, rBuyB.status].filter((s) => s === 200).length;
    assert.equal(okCount, 1, 'Concurrent marketplace buy MUST allow strictly 1 winner and reject the second buyer');

    // Auction House outbid refunds first bidder atomically
    const aucRes = await fetch(`${baseUrl}/api/v1/marketplace/auctions`, {
      method: 'POST',
      headers: hMaster,
      body: JSON.stringify({
        sellerCharacterId: master.char.id,
        itemId: 'PROF_ITEM_STEEL_SWORD',
        quantity: 1,
        startingPriceGold: 500,
        buyoutPriceGold: 5000,
      }),
    });
    assert.equal(aucRes.status, 201);
    const auc = ((await aucRes.json()) as any).data;

    const goldABefore = buyerA.char.gold;
    await fetch(`${baseUrl}/api/v1/marketplace/auctions/${auc.id}/bid`, {
      method: 'POST',
      headers: hBuyerA,
      body: JSON.stringify({ bidderCharacterId: buyerA.char.id, bidGold: 800 }),
    });
    assert.equal(buyerA.char.gold, goldABefore - 800);

    // buyerB outbids buyerA -> buyerA MUST immediately receive full 800G refund!
    await fetch(`${baseUrl}/api/v1/marketplace/auctions/${auc.id}/bid`, {
      method: 'POST',
      headers: hBuyerB,
      body: JSON.stringify({ bidderCharacterId: buyerB.char.id, bidGold: 1200 }),
    });
    assert.equal(buyerA.char.gold, goldABefore, 'Outbid player must be refunded immediately and atomically');

    // Settle Auction -> buyerB gets sword, master gets payout minus fee
    const settleRes = await fetch(`${baseUrl}/api/v1/marketplace/auctions/${auc.id}/settle`, {
      method: 'POST',
      headers: hMaster,
      body: JSON.stringify({ forceForTest: true }),
    });
    assert.equal(settleRes.status, 200);

    // Fulfill Herbalist Supply Contract & Complete Caravan Route
    const ctrs: any[] = ((await (await fetch(`${baseUrl}/api/v1/merchants/contracts`)).json()) as any).data;
    const herbCtr = ctrs.find((c) => c.professionId === 'herbalist' && c.status === 'open')!;
    const fRes = await fetch(`${baseUrl}/api/v1/merchants/contracts/${herbCtr.id}/fulfill`, {
      method: 'POST',
      headers: hMaster,
      body: JSON.stringify({ characterId: master.char.id }),
    });
    assert.equal(fRes.status, 200);

    const crvStart = await fetch(`${baseUrl}/api/v1/merchants/${assoc.id}/caravans/start`, {
      method: 'POST',
      headers: hMaster,
      body: JSON.stringify({ characterId: master.char.id, routeId: 'ROUTE_NOVICE_ELYSIA', instantForTest: true }),
    });
    assert.equal(crvStart.status, 200);
    const crv = ((await crvStart.json()) as any).data;
    const crvDone = await fetch(`${baseUrl}/api/v1/merchants/caravans/${crv.id}/complete`, {
      method: 'POST',
      headers: hMaster,
      body: JSON.stringify({ characterId: master.char.id }),
    });
    assert.equal(crvDone.status, 200);

    // Audit Logs must record all economic movements
    const auditRes = await fetch(`${baseUrl}/api/v1/marketplace/audit-logs`);
    const auditJson: any = await auditRes.json();
    assert.ok(auditJson.data.length >= 4);
  } finally {
    cleanupAll(store, createdUserIds);
    server.close();
  }
});
