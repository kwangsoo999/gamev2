import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { Server } from 'socket.io';
import { createApp } from '../app.js';
import { runMigrationsAndSeeds } from '../database/migrations.js';
import { setupGameSockets } from '../sockets/gameSocket.js';
import { JsonStore } from '../database/jsonStore.js';
import { CombatService } from '../services/combat.service.js';
import { JobService } from '../services/job.service.js';
import { validateWorldPlacement } from '@elysia/game-data-schema';
import { resolveJobRitualVfxProfile } from '@elysia/vfx-engine';
import { ENV } from '../config/env.js';

const ASSETS_PUBLIC = path.resolve(ENV.WORLD_DATA_PATH, '../..');
const WORLD_DIR = path.join(ASSETS_PUBLIC, 'data/world');
const MAPS_DIR = path.join(ASSETS_PUBLIC, 'data/maps');
const PROF_DIR = path.join(ASSETS_PUBLIC, 'data/professions');

async function jsonApi(baseUrl: string, urlPath: string, method = 'GET', token?: string, body?: any) {
  const res = await fetch(`${baseUrl}${urlPath}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let parsed: any = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { raw: text };
  }
  return { status: res.status, body: parsed };
}

test('Phase 18.1 & 18.2 — Holy Sanctuary Interior, Registered Assets & Black Dragon Removed from Beginner Village', () => {
  const interior = JSON.parse(fs.readFileSync(path.join(MAPS_DIR, 'map_holy_sanctuary_interior.json'), 'utf8'));
  assert.equal(interior.id, 'map_holy_sanctuary_interior');
  assert.equal(interior.isSafeZone, true);
  assert.equal(interior.combatEnabled, false);
  assert.ok(interior.ritualCircle, 'Sanctuary must define central Ritual Circle');

  const objTypes = new Set((interior.layers?.objects || []).map((o: any) => o.type));
  for (const required of ['cathedral_altar', 'cathedral_statue', 'cathedral_pillar', 'cathedral_pew', 'cathedral_candelabra', 'cathedral_banner', 'cathedral_stained_glass']) {
    assert.ok(objTypes.has(required), `Missing Cathedral interior prop type: ${required}`);
  }

  const manifest = JSON.parse(fs.readFileSync(path.join(ASSETS_PUBLIC, 'assets/elysia/manifest.json'), 'utf8'));
  for (const assetId of ['environment/buildings/cathedral', 'characters/animations/high_priest', 'ui/portrait-high-priest', 'environment/props/cathedral-altar']) {
    const entry = manifest.assets.find((a: any) => a.id === assetId);
    assert.ok(entry, `Manifest missing asset: ${assetId}`);
    assert.ok(fs.existsSync(path.join(ASSETS_PUBLIC, entry.path.replace(/^\//, ''))), `Asset missing on disk: ${entry.path}`);
  }

  // Black Dragon completely removed from Beginner Village
  const tk = JSON.parse(fs.readFileSync(path.join(MAPS_DIR, 'thon_khoi_nguyen.json'), 'utf8'));
  const hasDragonInMap = (tk.spawns?.monsters || []).some(
    (m: any) => m.isBoss || String(m.id || '').includes('boss_dragon') || String(m.spriteId || '') === 'boss_dark_dragon'
  );
  assert.equal(hasDragonInMap, false, 'THON_KHOI_NGUYEN map must NOT contain Black Dragon');

  const spawnPoints = JSON.parse(fs.readFileSync(path.join(WORLD_DIR, 'spawn_points.json'), 'utf8'));
  assert.equal(
    spawnPoints.some((s: any) => s.regionId === 'THON_KHOI_NGUYEN' && String(s.monsterId || '').includes('DARK_DRAGON')),
    false,
    'spawn_points.json must NOT spawn Black Dragon in THON_KHOI_NGUYEN'
  );

  // Black Dragon monster definition & drop table preserved
  const monsters = JSON.parse(fs.readFileSync(path.join(WORLD_DIR, 'monsters.json'), 'utf8'));
  const drops = JSON.parse(fs.readFileSync(path.join(WORLD_DIR, 'drop_tables.json'), 'utf8'));
  assert.ok(monsters.some((m: any) => m.id === 'BOSS_DARK_DRAGON_STARTER'), 'BOSS_DARK_DRAGON_STARTER definition must remain');
  assert.ok(drops.some((d: any) => d.monsterId === 'BOSS_DARK_DRAGON_STARTER'), 'Black Dragon drop table must remain');

  const combat = CombatService.getSharedInstance();
  combat.reloadRegion('THON_KHOI_NGUYEN');
  const activeThonMonsters = combat.getRegionMonsters('THON_KHOI_NGUYEN');
  assert.equal(
    activeThonMonsters.some((m: any) => m.isBoss || String(m.monsterId || '').includes('DARK_DRAGON')),
    false,
    'CombatService must never spawn Boss/Black Dragon in Beginner Village'
  );
});

test('Phase 18.3, 18.4, 18.5 & 18.9 — High Priest Exclusive Placement, All 24 Job Ritual VFX, NPC Districts & Portal Alignment', () => {
  const npcs = JSON.parse(fs.readFileSync(path.join(WORLD_DIR, 'npcs.json'), 'utf8'));
  const profNpcs = JSON.parse(fs.readFileSync(path.join(PROF_DIR, 'profession_npcs.json'), 'utf8'));
  const priests = npcs.filter((n: any) => n.id === 'NPC_HIGH_PRIEST');
  assert.equal(priests.length, 1, 'NPC_HIGH_PRIEST must exist exclusively once');
  assert.equal(priests[0].regionId, 'map_holy_sanctuary_interior');
  assert.equal(priests[0].associatedBuildingId, 'obj_sanctuary_altar');

  const mapsById: Record<string, any> = {};
  for (const f of fs.readdirSync(MAPS_DIR)) {
    if (!f.endsWith('.json')) continue;
    const d = JSON.parse(fs.readFileSync(path.join(MAPS_DIR, f), 'utf8'));
    mapsById[d.id] = d;
  }

  const report = validateWorldPlacement(mapsById, npcs, profNpcs);
  assert.equal(report.valid, true, `Placement issues found: ${JSON.stringify(report.issues)}`);
  assert.equal(report.errorCount, 0);

  // Verify ALL 8 Base Jobs + ALL 16 Advanced Jobs resolve unique Ritual VFX profiles
  const all24Jobs = [
    'swordsman', 'spearman', 'knight', 'monk', 'mage', 'assassin', 'fighter', 'archer',
    'sword_saint', 'berserker', 'dragoon', 'warlancer', 'paladin', 'guardian',
    'saint', 'exorcist', 'elementalist', 'arcanist', 'shadowblade', 'phantom',
    'martial_artist', 'duelist', 'sniper', 'ranger',
  ];
  const resolvedTitles = new Set<string>();
  for (const jobId of all24Jobs) {
    const prof = resolveJobRitualVfxProfile(jobId);
    assert.ok(prof.palette.primaryColor && prof.palette.secondaryColor);
    assert.ok(prof.durationMs >= 2800);
    resolvedTitles.add(prof.titleVi);
  }
  assert.equal(resolvedTitles.size, 24, 'Every one of 24 jobs must have a unique ritual VFX title/profile');
  assert.equal(resolveJobRitualVfxProfile('priest').jobId, 'monk');
});

test('Phase 18.6, 18.7 & 18.12 — Admin Layout Editor Validation, Standard Register -> Char Create -> Login Flow & Sanctuary Job Persistence', async () => {
  await runMigrationsAndSeeds();
  const app = createApp();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*' } });
  setupGameSockets(io);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const addr = server.address() as any;
  const baseUrl = `http://127.0.0.1:${addr.port}`;

  const store = JsonStore.getInstance();
  const createdUserIds: string[] = [];
  const createdCharIds: string[] = [];

  try {
    // 1. Register new account -> ZERO auto characters (redirect client -> Character Creation)
    const suffix = Date.now().toString(36).slice(-5);
    const uname = `p18hero_${suffix}`;
    const regRes = await jsonApi(baseUrl, '/api/v1/auth/register', 'POST', undefined, {
      username: uname,
      email: `${uname}@elysia.rpg`,
      password: 'Password123!',
    });
    assert.equal(regRes.status, 201);
    const token = regRes.body.data.token;
    createdUserIds.push(regRes.body.data.user.id);

    const charsAfterReg = await jsonApi(baseUrl, '/api/v1/characters', 'GET', token);
    assert.equal(charsAfterReg.status, 200);
    assert.equal(charsAfterReg.body.data.length, 0, 'Register must not auto-create characters');

    // Login before character creation also returns [] (never silent auto-char creation)
    const loginEmpty = await jsonApi(baseUrl, '/api/v1/auth/login', 'POST', undefined, {
      usernameOrEmail: uname,
      password: 'Password123!',
    });
    assert.equal(loginEmpty.status, 200);
    const charsAfterLoginEmpty = await jsonApi(baseUrl, '/api/v1/characters', 'GET', loginEmpty.body.data.token);
    assert.equal(charsAfterLoginEmpty.body.data.length, 0);

    // 2. Character Creation -> enters THON_KHOI_NGUYEN cleanly
    const charRes = await jsonApi(baseUrl, '/api/v1/characters', 'POST', token, {
      name: `Sanctum_${suffix}`,
      gender: 'female',
      classId: 'adventurer',
      useCreationBonusPool: true,
      bonusAllocations: { str: 4, con: 2, dex: 0, agi: 0, int: 0 },
    });
    assert.equal(charRes.status, 201);
    const charId = charRes.body.data.id;
    createdCharIds.push(charId);
    assert.equal(charRes.body.data.regionId, 'THON_KHOI_NGUYEN');

    // Login again -> sees created character list
    const loginExisting = await jsonApi(baseUrl, '/api/v1/auth/login', 'POST', undefined, {
      usernameOrEmail: uname,
      password: 'Password123!',
    });
    assert.equal(loginExisting.status, 200);
    const listExisting = await jsonApi(baseUrl, '/api/v1/characters', 'GET', loginExisting.body.data.token);
    assert.equal(listExisting.body.data.length, 1);

    // 3. Complete First-Job Requirements & Test Priest Awakening + Idempotency + Lv.80 Second Job Ritual Metadata
    const charObj = store.characters.find((c) => c.id === charId)!;
    charObj.level = 82;
    charObj.baseStats = { str: 28, dex: 16, agi: 10, int: 10, con: 12 };
    charObj.attributes = { ...charObj.baseStats };
    charObj.completedQuests = ['QUEST_001_SLIME_CLEAR'];
    charObj.sanctumCompleted = true;
    charObj.inventory = [{ slotId: 0, itemId: 'ITEM_AWAKENING_CERTIFICATE', name: 'Awakening Cert', category: 'material', quantity: 1 }];
    store.save();

    // Reject client manual class choice
    const manualReject = await jsonApi(baseUrl, '/api/v1/job/awaken', 'POST', token, { characterId: charId, classId: 'mage' });
    assert.equal(manualReject.status, 403);

    // Server authoritative Awakening -> swordsman (highest base str=initial+4) + High Priest metadata
    const awakenOk = await jsonApi(baseUrl, '/api/v1/job/awaken', 'POST', token, { characterId: charId });
    assert.equal(awakenOk.status, 200);
    assert.equal(awakenOk.body.data.performedByNpcId, 'NPC_HIGH_PRIEST');
    assert.equal(awakenOk.body.data.newClassId, 'swordsman');
    assert.equal(awakenOk.body.data.ritualVfxId, 'swordsman');

    // Re-calling awaken must NOT duplicate rewards (alreadyCompleted: true)
    const awakenReplay = await jsonApi(baseUrl, '/api/v1/job/awaken', 'POST', token, { characterId: charId });
    assert.equal(awakenReplay.status, 200);
    assert.equal(awakenReplay.body.data.alreadyCompleted, true);
    assert.equal(awakenReplay.body.data.grantedItems.length, 0, 'Cannot claim awakening rewards twice');

    // Lv.80 Second Job Advancement -> sword_saint
    const lv80Ok = await jsonApi(baseUrl, '/api/v1/job/advance-lv80', 'POST', token, { characterId: charId, branchId: 'sword_saint' });
    assert.equal(lv80Ok.status, 200);
    assert.equal(lv80Ok.body.data.advancedJobId, 'sword_saint');
    assert.equal(lv80Ok.body.data.ritualVfxId, 'sword_saint');
    assert.equal(lv80Ok.body.data.performedByNpcId, 'NPC_HIGH_PRIEST');

    // 4. Admin Layout API: Reject blocked tile placement, persist valid adjustment, reset approved layout cleanly
    const layoutGet = await jsonApi(baseUrl, '/api/v1/admin/world/layout', 'GET');
    assert.equal(layoutGet.status, 200);
    assert.equal(layoutGet.body.data.validation.valid, true);

    const invalidMove = await jsonApi(baseUrl, '/api/v1/admin/world/npcs/NPC_HIGH_PRIEST', 'PUT', undefined, { tx: 0, ty: 0 });
    assert.equal(invalidMove.status, 400, 'Admin layout editor must reject placing NPC onto wall/blocked tile');

    const validMove = await jsonApi(baseUrl, '/api/v1/admin/world/npcs/NPC_HIGH_PRIEST', 'PUT', undefined, { tx: 24, ty: 10, direction: 'south' });
    assert.equal(validMove.status, 200);
    assert.equal(validMove.body.data.npc.tx, 24);
    assert.equal(validMove.body.data.npc.ty, 10);

    const resetRes = await jsonApi(baseUrl, '/api/v1/admin/world/layout/reset-approved', 'POST');
    assert.equal(resetRes.status, 200);
    const restoredPriest = resetRes.body.data.npcs.find((n: any) => n.id === 'NPC_HIGH_PRIEST');
    assert.equal(restoredPriest.tx, 24);
    assert.equal(restoredPriest.ty, 9);
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
    io.close();
    server.close();
  }
});
