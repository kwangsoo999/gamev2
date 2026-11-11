import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, 'apps/game-client/public');
const WORLD_DIR = path.join(PUBLIC, 'data/world');
const MAPS_DIR = path.join(PUBLIC, 'data/maps');
const PROF_CLIENT = path.join(PUBLIC, 'data/professions/profession_npcs.json');
const PROF_REPO = path.join(ROOT, 'game-data/professions/profession_npcs.json');

// 1. Update profession_npcs.json
for (const pFile of [PROF_CLIENT, PROF_REPO]) {
  if (!fs.existsSync(pFile)) continue;
  const profs = JSON.parse(fs.readFileSync(pFile, 'utf8'));
  for (const pn of profs) {
    if (pn.id === 'NPC_BLACKSMITH_MASTER') {
      pn.spriteId = 'npc_blacksmith';
    }
  }
  fs.writeFileSync(pFile, `${JSON.stringify(profs, null, 2)}\n`, 'utf8');
}

const profNpcs = JSON.parse(fs.readFileSync(PROF_CLIENT, 'utf8'));

// 2. Update npcs.json and approved_layout_baseline.json
const npcsPath = path.join(WORLD_DIR, 'npcs.json');
const baselinePath = path.join(WORLD_DIR, 'approved_layout_baseline.json');

const npcs = JSON.parse(fs.readFileSync(npcsPath, 'utf8'));

const extraNpcs = [
  {
    id: 'NPC_SANCTUARY_PRIESTESS',
    name: 'Thánh Nữ Aria · Sứ Giả Thánh Đường',
    role: 'Sứ Giả Thánh Đường & Cầu Nguyện',
    district: 'holy_sanctuary_district',
    regionId: 'THON_KHOI_NGUYEN',
    spriteId: 'npc_priestess',
    tx: 9,
    ty: 7,
    direction: 'south',
    interactionRadius: 92,
    movementBehavior: 'stationary',
    idleAnimation: 'pray_idle',
    associatedBuildingId: 'obj_cathedral_novice',
    dialogueId: 'dlg_sanctuary_priestess',
    dialogue:
      'Bước qua cánh cửa Đại Thánh Đường phía sau ta để vào Nội Điện gặp Linh Mục Điện Thánh Seraphiel và thực hiện Nghi Lễ Chuyển Chức!',
    x: 9 * 48 + 24,
    y: 7 * 48 + 24,
  },
  {
    id: 'NPC_HUNTER_KAEL',
    name: 'Thợ Săn Kael · Trạm Săn Bắn',
    role: 'Bậc Thầy Săn Bắn & Thảo Phạt',
    district: 'adventurer_district',
    regionId: 'THON_KHOI_NGUYEN',
    spriteId: 'npc_hunter',
    tx: 23,
    ty: 20,
    direction: 'east',
    interactionRadius: 92,
    movementBehavior: 'stationary',
    idleAnimation: 'guard_idle',
    associatedBuildingId: 'obj_dummy_4',
    dialogueId: 'dlg_hunter_kael',
    dialogue:
      'Bên kia cầu gỗ phía Đông là bãi săn Thỏ Rừng, Sói Hoang và Goblin. Hãy kiểm tra vũ khí và dược phẩm trước khi xuất kích!',
    x: 23 * 48 + 24,
    y: 20 * 48 + 24,
  },
];

for (const ex of extraNpcs) {
  const existingIdx = npcs.findIndex((n) => n.id === ex.id);
  if (existingIdx >= 0) npcs[existingIdx] = ex;
  else npcs.push(ex);
}

for (const n of npcs) {
  if (
    n.id === 'NPC_BLACKSMITH_MASTER' ||
    n.id === 'NPC_ELYSIA_EQUIP_MERCHANT' ||
    n.id === 'NPC_DRAKHEN_BLACKSMITH'
  ) {
    n.spriteId = 'npc_blacksmith';
  } else if (n.id === 'NPC_SYLVARIS_RANGER_CAPTAIN' || n.id === 'NPC_HUNTER_KAEL') {
    n.spriteId = 'npc_hunter';
  } else if (n.id === 'NPC_JOB_MASTER_ASICA' || n.id === 'NPC_SANCTUARY_PRIESTESS') {
    n.spriteId = 'npc_priestess';
  } else if (n.id === 'NPC_HIGH_PRIEST') {
    n.spriteId = 'npc_high_priest';
  }
}

fs.writeFileSync(npcsPath, `${JSON.stringify(npcs, null, 2)}\n`, 'utf8');

if (fs.existsSync(baselinePath)) {
  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  baseline.npcs = npcs;
  baseline.savedAt = new Date().toISOString();
  fs.writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`, 'utf8');
}

// 3. Load monsters.json to sync map spawns.monsters
const monstersCatalog = JSON.parse(fs.readFileSync(path.join(WORLD_DIR, 'monsters.json'), 'utf8'));
const monById = new Map(monstersCatalog.map((m) => [m.id, m]));

for (const f of fs.readdirSync(MAPS_DIR)) {
  if (!f.endsWith('.json')) continue;
  const fullPath = path.join(MAPS_DIR, f);
  const mapDoc = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

  // Sync spawns.npcs (non-profession NPCs for this region)
  mapDoc.spawns = mapDoc.spawns || {};
  const mapNpcs = npcs.filter(
    (n) => n.regionId === mapDoc.id && !profNpcs.some((pn) => pn.id === n.id)
  );
  mapDoc.spawns.npcs = mapNpcs;

  // Sync spawns.monsters
  if (mapDoc.id === 'THON_KHOI_NGUYEN') {
    mapDoc.spawns.monsters = [
      {
        id: 'mon_slime_1',
        monsterId: 'MONSTER_GREEN_SLIME',
        name: 'Slime Thảo Nguyên',
        level: 1,
        hp: 120,
        spriteId: 'monster_slime',
        tx: 21,
        ty: 8,
      },
      {
        id: 'mon_slime_2',
        monsterId: 'MONSTER_GREEN_SLIME',
        name: 'Slime Rêu Xanh',
        level: 2,
        hp: 140,
        spriteId: 'monster_slime',
        tx: 39,
        ty: 18,
      },
      {
        id: 'mon_slime_3',
        monsterId: 'mon_meadow_slime',
        type: 'slime',
        name: 'Slime Tinh Nghịch',
        level: 2,
        hp: 140,
        spriteId: 'monster_slime',
        tx: 41,
        ty: 19,
      },
      {
        id: 'mon_rabbit_1',
        monsterId: 'mon_forest_rabbit',
        name: 'Thỏ Rừng Khởi Nguyên',
        level: 2,
        hp: 150,
        spriteId: 'monster_rabbit',
        tx: 38,
        ty: 22,
      },
      {
        id: 'mon_wolf_1',
        monsterId: 'mon_wild_wolf',
        name: 'Sói Thảo Nguyên',
        level: 3,
        hp: 190,
        spriteId: 'monster_wolf',
        tx: 40,
        ty: 12,
      },
      {
        id: 'mon_goblin_1',
        monsterId: 'MONSTER_GOBLIN_SCOUT',
        name: 'Goblin Trinh Sát',
        level: 4,
        hp: 210,
        spriteId: 'monster_goblin',
        tx: 38,
        ty: 14,
      },
      {
        id: 'mon_goblin_2',
        monsterId: 'mon_forest_goblin',
        name: 'Goblin Hang Đá',
        level: 5,
        hp: 240,
        spriteId: 'monster_goblin',
        tx: 24,
        ty: 7,
      },
    ];
  } else if (Array.isArray(mapDoc.spawns.monsters)) {
    for (const sm of mapDoc.spawns.monsters) {
      const def = monById.get(sm.monsterId) || monById.get(sm.id);
      if (def) {
        sm.monsterId = def.id;
        sm.spriteId = def.spriteId;
        sm.visualFilter = '';
      }
    }
  }

  fs.writeFileSync(fullPath, `${JSON.stringify(mapDoc, null, 2)}\n`, 'utf8');
}

console.log('Synchronized all maps, NPCs, and monster spawns successfully.');
