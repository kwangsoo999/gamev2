import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, 'apps', 'game-client', 'public');
const WORLD_DIR = path.join(PUBLIC_DIR, 'data', 'world');
const MAPS_DIR = path.join(PUBLIC_DIR, 'data', 'maps');
const DOCS_DIR = path.join(ROOT, 'docs');

function readPngDimensions(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.length < 24 || buf.toString('ascii', 1, 4) !== 'PNG') {
    throw new Error(`Not a valid PNG file: ${filePath}`);
  }
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return [width, height];
}

let errors = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error(`[FAIL] ${msg}`);
    errors++;
  }
}

// 1. Required docs
const requiredDocs = [
  'VISUAL_ASSET_AUDIT.md',
  'ASSET_MASTER_INDEX.md',
  'VISUAL_STYLE_GUIDE.md',
  'ASSET_MISSING_REPORT.md',
  'NPC_PLACEMENT_AUDIT.md',
  'MONSTER_VISUAL_VALIDATION.md',
  'SKILL_VFX_VALIDATION.md',
  'VISUAL_QA_REPORT.md',
];
for (const doc of requiredDocs) {
  const p = path.join(DOCS_DIR, doc);
  assert(fs.existsSync(p) && fs.statSync(p).size > 500, `Missing or empty required doc: docs/${doc}`);
}

// 2. Manifest verification
const manifest = JSON.parse(fs.readFileSync(path.join(PUBLIC_DIR, 'assets', 'elysia', 'manifest.json'), 'utf8'));
assert(Array.isArray(manifest.assets) && manifest.assets.length >= 280, `Manifest assets array invalid: ${manifest.assets?.length}`);
for (const asset of manifest.assets) {
  const assetPath = asset.path || asset.url;
  const rel = assetPath.replace(/^\//, '');
  const fullPath = path.join(PUBLIC_DIR, rel);
  assert(fs.existsSync(fullPath), `Manifest asset missing on disk: ${assetPath}`);
  if (fs.existsSync(fullPath) && fullPath.endsWith('.png')) {
    const [w, h] = readPngDimensions(fullPath);
    assert(
      w === asset.dimensions[0] && h === asset.dimensions[1],
      `Dimension mismatch for ${asset.id}: manifest=${asset.dimensions.join('x')}, actual=${w}x${h}`,
    );
  }
  if (asset.category === 'monsters' || asset.id.startsWith('monsters/')) {
    assert(asset.loading === 'eager', `Monster asset ${asset.id} should have loading="eager"`);
  }
}

// 3. Monster visual identity & uniqueness verification
const monsters = JSON.parse(fs.readFileSync(path.join(WORLD_DIR, 'monsters.json'), 'utf8'));
const entities = JSON.parse(fs.readFileSync(path.join(PUBLIC_DIR, 'data', 'sprites', 'entities.json'), 'utf8'));
const sheetMap = entities.sheets || entities.entities || entities;
const monsterHashes = new Map();

for (const m of monsters) {
  const pngPath = path.join(PUBLIC_DIR, 'assets', 'elysia', 'monsters', `${m.id}.png`);
  assert(fs.existsSync(pngPath), `Missing monster PNG for ${m.id}`);
  if (fs.existsSync(pngPath)) {
    const [w, h] = readPngDimensions(pngPath);
    assert(w === 128 && h === 128, `Monster PNG ${m.id}.png must be 128x128, got ${w}x${h}`);
    const hash = crypto.createHash('sha256').update(fs.readFileSync(pngPath)).digest('hex');
    if (monsterHashes.has(hash)) {
      assert(false, `Duplicate monster PNG hash between ${m.id} and ${monsterHashes.get(hash)}`);
    } else {
      monsterHashes.set(hash, m.id);
    }
  }
  assert(Boolean(sheetMap[m.spriteId]), `Monster ${m.id} references unknown spriteId ${m.spriteId}`);
}

const byId = Object.fromEntries(monsters.map((m) => [m.id, m]));
assert(byId.mon_forest_rabbit?.spriteId === 'monster_rabbit', `mon_forest_rabbit must use monster_rabbit, got ${byId.mon_forest_rabbit?.spriteId}`);
assert(byId.mon_horn_rabbit?.spriteId === 'monster_rabbit', `mon_horn_rabbit must use monster_rabbit`);
assert(byId.mon_one_horned_rabbit?.spriteId === 'monster_rabbit', `mon_one_horned_rabbit must use monster_rabbit`);
assert(byId.mon_gray_wolf?.spriteId === 'monster_wolf', `mon_gray_wolf must use monster_wolf`);
assert(byId.mon_wild_wolf?.spriteId === 'monster_wolf', `mon_wild_wolf must use monster_wolf`);
assert(byId.mon_wild_boar?.spriteId === 'monster_boar', `mon_wild_boar must use monster_boar`);
assert(byId.mon_elite_boar?.spriteId === 'monster_boar', `mon_elite_boar must use monster_boar`);
assert(byId.mon_giant_bee?.spriteId === 'monster_bee', `mon_giant_bee must use monster_bee`);
assert(byId.mon_hardwing_bee?.spriteId === 'monster_bee', `mon_hardwing_bee must use monster_bee`);
assert(byId.mon_forest_goblin?.spriteId === 'monster_goblin', `mon_forest_goblin must use monster_goblin`);
assert(byId.mon_meadow_slime?.spriteId === 'monster_slime', `mon_meadow_slime must use monster_slime`);

// 4. NPC placement & sprite verification
const npcs = JSON.parse(fs.readFileSync(path.join(WORLD_DIR, 'npcs.json'), 'utf8'));
const profNpcs = JSON.parse(fs.readFileSync(path.join(PUBLIC_DIR, 'data', 'professions', 'profession_npcs.json'), 'utf8'));
const mapsById = new Map();
for (const f of fs.readdirSync(MAPS_DIR).filter((n) => n.endsWith('.json'))) {
  const m = JSON.parse(fs.readFileSync(path.join(MAPS_DIR, f), 'utf8'));
  if (m && m.id) mapsById.set(m.id, m);
}

for (const n of [...npcs, ...profNpcs]) {
  const npcId = n.id || n.npcId;
  const mapId = n.regionId || n.mapId;
  assert(Boolean(sheetMap[n.spriteId]), `NPC ${npcId} references unknown spriteId ${n.spriteId}`);
  const map = mapsById.get(mapId);
  assert(Boolean(map), `NPC ${npcId} references unknown map ${mapId}`);
  if (map) {
    const tx = n.tx ?? Math.floor((n.x || 0) / 48);
    const ty = n.ty ?? Math.floor((n.y || 0) / 48);
    const ground = map.layers?.ground?.[ty]?.[tx] ?? 0;
    const coll = map.layers?.collision?.[ty]?.[tx] ?? 0;
    assert(ground !== 3, `NPC ${npcId} is placed on water at ${mapId} (${tx},${ty})`);
    assert(coll !== 1, `NPC ${npcId} is placed on collision tile at ${mapId} (${tx},${ty})`);
  }
}

const npcById = Object.fromEntries([...npcs, ...profNpcs].map((n) => [n.id || n.npcId, n]));
assert(npcById.NPC_BLACKSMITH_MASTER?.spriteId === 'npc_blacksmith', 'NPC_BLACKSMITH_MASTER must use npc_blacksmith');
assert(npcById.NPC_SANCTUARY_PRIESTESS?.spriteId === 'npc_priestess', 'NPC_SANCTUARY_PRIESTESS must use npc_priestess');
assert(npcById.NPC_HIGH_PRIEST?.spriteId === 'npc_high_priest', 'NPC_HIGH_PRIEST must use npc_high_priest');
assert(npcById.NPC_HUNTER_KAEL?.spriteId === 'npc_hunter', 'NPC_HUNTER_KAEL must use npc_hunter');

// 5. Job sheets & illustrations
const baseJobs = ['warrior', 'swordsman', 'mage', 'assassin', 'archer', 'priest', 'paladin', 'lancer'];
for (const j of baseJobs) {
  const sheetPath = path.join(PUBLIC_DIR, 'assets', 'elysia', 'characters', 'animations', `job_${j}.png`);
  assert(fs.existsSync(sheetPath), `Missing job animated sheet: job_${j}.png`);
  const artPath = path.join(PUBLIC_DIR, 'assets', 'elysia', 'characters', 'jobs', `${j}.png`);
  assert(fs.existsSync(artPath), `Missing job illustration: jobs/${j}.png`);
}

if (errors > 0) {
  console.error(`Visual Asset Overhaul validation failed with ${errors} error(s).`);
  process.exit(1);
}
console.log(
  `[PASS] Visual Asset Overhaul validated: ${manifest.assets.length} manifest assets, ${monsters.length} unique monsters, ${npcs.length + profNpcs.length} NPCs, 8 base job sheets, 24 job illustrations, and 8 audit docs.`,
);
