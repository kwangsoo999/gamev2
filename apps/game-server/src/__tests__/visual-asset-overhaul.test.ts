import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { validateWorldPlacement } from '@elysia/game-data-schema';
import { ENV } from '../config/env.js';

const PUBLIC_DIR = path.resolve(ENV.WORLD_DATA_PATH, '../..');
const ROOT_DIR = path.resolve(PUBLIC_DIR, '../../..');
const WORLD_DIR = path.join(PUBLIC_DIR, 'data/world');
const MAPS_DIR = path.join(PUBLIC_DIR, 'data/maps');
const DOCS_DIR = path.join(ROOT_DIR, 'docs');

function readPngDimensions(filePath: string): [number, number] {
  const buf = fs.readFileSync(filePath);
  assert.equal(buf.toString('ascii', 1, 4), 'PNG', `File is not a valid PNG: ${filePath}`);
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}

test('Master Visual Asset Overhaul: all 8 required audit & validation docs exist in docs/', () => {
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
    const fullPath = path.join(DOCS_DIR, doc);
    assert.equal(fs.existsSync(fullPath), true, `Missing doc: ${doc}`);
    assert.ok(fs.statSync(fullPath).size > 500, `Doc is unexpectedly small: ${doc}`);
  }
});

test('Master Visual Asset Overhaul: every asset in manifest.json exists on disk with exact PNG dimensions and eager monster loading', () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(PUBLIC_DIR, 'assets', 'elysia', 'manifest.json'), 'utf8'),
  );
  assert.ok(manifest.assets.length >= 280, 'Expected at least 280 assets in manifest.json');

  for (const asset of manifest.assets) {
    const assetPath: string = asset.path || asset.url;
    const fullPath = path.join(PUBLIC_DIR, assetPath.replace(/^\//, ''));
    assert.equal(fs.existsSync(fullPath), true, `Missing asset on disk: ${assetPath}`);
    if (fullPath.endsWith('.png')) {
      const [w, h] = readPngDimensions(fullPath);
      assert.deepEqual([w, h], asset.dimensions, `Dimension mismatch for ${asset.id}`);
    }
    if (asset.category === 'monsters' || String(asset.id).startsWith('monsters/')) {
      assert.equal(asset.loading, 'eager', `Monster ${asset.id} must be eagerly loaded`);
    }
  }
});

test('Master Visual Asset Overhaul: all 80 monsters have unique 128x128 PNGs and species-matched animated sprite sheets', () => {
  const monsters = JSON.parse(fs.readFileSync(path.join(WORLD_DIR, 'monsters.json'), 'utf8'));
  const entities = JSON.parse(
    fs.readFileSync(path.join(PUBLIC_DIR, 'data', 'sprites', 'entities.json'), 'utf8'),
  );
  const sheetMap = entities.sheets || entities.entities || entities;
  assert.equal(monsters.length, 80);

  const hashes = new Set<string>();
  for (const m of monsters) {
    const pngPath = path.join(PUBLIC_DIR, 'assets', 'elysia', 'monsters', `${m.id}.png`);
    assert.equal(fs.existsSync(pngPath), true, `Missing monster PNG: ${m.id}.png`);
    const [w, h] = readPngDimensions(pngPath);
    assert.deepEqual([w, h], [128, 128]);
    const hash = crypto.createHash('sha256').update(fs.readFileSync(pngPath)).digest('hex');
    assert.equal(hashes.has(hash), false, `Duplicate PNG hash for monster ${m.id}`);
    hashes.add(hash);
    assert.equal(Boolean(sheetMap[m.spriteId]), true, `Unknown spriteId ${m.spriteId} for ${m.id}`);
  }

  const byId = Object.fromEntries(monsters.map((m: any) => [m.id, m]));
  assert.equal(byId.mon_forest_rabbit.spriteId, 'monster_rabbit');
  assert.equal(byId.mon_horn_rabbit.spriteId, 'monster_rabbit');
  assert.equal(byId.mon_one_horned_rabbit.spriteId, 'monster_rabbit');
  assert.equal(byId.mon_gray_wolf.spriteId, 'monster_wolf');
  assert.equal(byId.mon_wild_wolf.spriteId, 'monster_wolf');
  assert.equal(byId.mon_wild_boar.spriteId, 'monster_boar');
  assert.equal(byId.mon_elite_boar.spriteId, 'monster_boar');
  assert.equal(byId.mon_giant_bee.spriteId, 'monster_bee');
  assert.equal(byId.mon_hardwing_bee.spriteId, 'monster_bee');
  assert.equal(byId.mon_forest_goblin.spriteId, 'monster_goblin');
  assert.equal(byId.mon_meadow_slime.spriteId, 'monster_slime');
});

test('Master Visual Asset Overhaul: NPC world placements, dedicated NPC sprites, and Grand Cathedral landmark', () => {
  const npcs = JSON.parse(fs.readFileSync(path.join(WORLD_DIR, 'npcs.json'), 'utf8'));
  const profNpcs = JSON.parse(
    fs.readFileSync(path.join(PUBLIC_DIR, 'data', 'professions', 'profession_npcs.json'), 'utf8'),
  );
  const mapsById: Record<string, any> = {};
  for (const file of fs.readdirSync(MAPS_DIR).filter((f) => f.endsWith('.json'))) {
    const m = JSON.parse(fs.readFileSync(path.join(MAPS_DIR, file), 'utf8'));
    if (m?.id) mapsById[m.id] = m;
  }

  const report = validateWorldPlacement(mapsById, npcs, profNpcs);
  assert.equal(report.valid, true, `Placement errors: ${JSON.stringify(report.issues.filter((i: any) => i.severity === 'error'))}`);
  assert.equal(report.errorCount, 0);

  const npcById = Object.fromEntries([...npcs, ...profNpcs].map((n: any) => [n.id || n.npcId, n]));
  assert.equal(npcById.NPC_BLACKSMITH_MASTER?.spriteId, 'npc_blacksmith');
  assert.equal(npcById.NPC_SANCTUARY_PRIESTESS?.spriteId, 'npc_priestess');
  assert.equal(npcById.NPC_HIGH_PRIEST?.spriteId, 'npc_high_priest');
  assert.equal(npcById.NPC_HUNTER_KAEL?.spriteId, 'npc_hunter');

  const cathedralPath = path.join(PUBLIC_DIR, 'assets', 'elysia', 'environment', 'buildings', 'cathedral.png');
  assert.equal(fs.existsSync(cathedralPath), true);
  assert.deepEqual(readPngDimensions(cathedralPath), [520, 520]);
});

test('Master Visual Asset Overhaul: all 8 base job animated sheets and 24 full-body job illustrations exist', () => {
  const baseJobs = ['warrior', 'swordsman', 'mage', 'assassin', 'archer', 'priest', 'paladin', 'lancer'];
  for (const job of baseJobs) {
    const sheetPath = path.join(PUBLIC_DIR, 'assets', 'elysia', 'characters', 'animations', `job_${job}.png`);
    assert.equal(fs.existsSync(sheetPath), true, `Missing job sheet: job_${job}.png`);
    assert.deepEqual(readPngDimensions(sheetPath), [1536, 1120]);
  }

  const allJobArts = [
    ...baseJobs,
    'berserker',
    'guardian',
    'sword_saint',
    'duelist',
    'elementalist',
    'arcanist',
    'shadowblade',
    'phantom',
    'sniper',
    'ranger',
    'saint',
    'exorcist',
    'knight',
    'monk',
    'dragoon',
    'warlancer',
  ];
  for (const job of allJobArts) {
    const artPath = path.join(PUBLIC_DIR, 'assets', 'elysia', 'characters', 'jobs', `${job}.png`);
    assert.equal(fs.existsSync(artPath), true, `Missing job art: ${job}.png`);
    assert.deepEqual(readPngDimensions(artPath), [256, 256]);
  }
});
