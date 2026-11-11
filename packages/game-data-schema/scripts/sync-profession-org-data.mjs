import fs from 'fs';
import path from 'path';
import assert from 'node:assert/strict';
import {
  PROFESSION_SYSTEM_CONFIG,
  PROFESSION_DEFINITIONS,
  PROFESSION_MASTERY_RANKS,
  PROFESSION_RECIPES,
  PROFESSION_MATERIALS,
  PROFESSION_TOOLS,
  PROFESSION_GATHERING_NODES,
  PROFESSION_QUALITY_RULES,
  PROFESSION_QUESTS,
  PROFESSION_NPCS,
  PROFESSION_ECONOMY_RULES,
  computeProfessionExpRequired,
} from '../dist/professions.js';
import {
  GUILD_SYSTEM_CONFIG,
  GUILD_LEVEL_EXP_TABLE,
  DEFAULT_GUILD_RANKS,
  DEFAULT_GUILD_BUILDINGS,
  DEFAULT_GUILD_SKILLS,
  GUILD_QUEST_DEFINITIONS,
  GUILD_BOSS_CATALOG,
  MERCHANT_SYSTEM_CONFIG,
  MERCHANT_LEVEL_EXP_TABLE,
  DEFAULT_MERCHANT_RANKS,
  CARAVAN_ROUTES,
  INITIAL_SUPPLY_CONTRACT_TEMPLATES,
  TERRITORY_DEFINITIONS,
  ORGANIZATION_AND_PROFESSION_ITEM_CATALOG,
} from '../dist/organizations.js';

const ROOT = path.resolve(import.meta.dirname, '../../..');
const PROF_DIR = path.join(ROOT, 'game-data', 'professions');
const ORG_DIR = path.join(ROOT, 'game-data', 'organizations');
const WORLD_DIR = path.join(ROOT, 'apps', 'game-client', 'public', 'data', 'world');

fs.mkdirSync(PROF_DIR, { recursive: true });
fs.mkdirSync(ORG_DIR, { recursive: true });

function writeJson(dir, name, data) {
  fs.writeFileSync(path.join(dir, name), JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

// Build Lv.1..70 curve table
const masteryCurve = Array.from({ length: 70 }, (_, idx) => {
  const lv = idx + 1;
  return { level: lv, requiredExp: computeProfessionExpRequired(lv) };
});

// 10 exact files under game-data/professions/
writeJson(PROF_DIR, 'profession_config.json', {
  rules: PROFESSION_SYSTEM_CONFIG,
  professions: PROFESSION_DEFINITIONS,
});
writeJson(PROF_DIR, 'profession_mastery.json', {
  ranks: PROFESSION_MASTERY_RANKS,
  levelCurve: masteryCurve,
});
writeJson(PROF_DIR, 'profession_recipes.json', PROFESSION_RECIPES);
writeJson(PROF_DIR, 'profession_materials.json', PROFESSION_MATERIALS);
writeJson(PROF_DIR, 'profession_tools.json', PROFESSION_TOOLS);
writeJson(PROF_DIR, 'profession_gathering_nodes.json', PROFESSION_GATHERING_NODES);
writeJson(PROF_DIR, 'profession_quality.json', PROFESSION_QUALITY_RULES);
writeJson(PROF_DIR, 'profession_quests.json', PROFESSION_QUESTS);
writeJson(PROF_DIR, 'profession_npcs.json', PROFESSION_NPCS);
writeJson(PROF_DIR, 'profession_economy.json', PROFESSION_ECONOMY_RULES);

// Organization configs under game-data/organizations/ & world/
const guildConfigDoc = {
  config: GUILD_SYSTEM_CONFIG,
  levelExpTable: GUILD_LEVEL_EXP_TABLE,
  defaultRanks: DEFAULT_GUILD_RANKS,
  defaultBuildings: DEFAULT_GUILD_BUILDINGS,
  defaultSkills: DEFAULT_GUILD_SKILLS,
  quests: GUILD_QUEST_DEFINITIONS,
  bosses: GUILD_BOSS_CATALOG,
};
const merchantConfigDoc = {
  config: MERCHANT_SYSTEM_CONFIG,
  levelExpTable: MERCHANT_LEVEL_EXP_TABLE,
  defaultRanks: DEFAULT_MERCHANT_RANKS,
  caravanRoutes: CARAVAN_ROUTES,
  supplyContracts: INITIAL_SUPPLY_CONTRACT_TEMPLATES,
};
writeJson(ORG_DIR, 'guild_config.json', guildConfigDoc);
writeJson(ORG_DIR, 'merchant_config.json', merchantConfigDoc);
writeJson(ORG_DIR, 'territories_config.json', TERRITORY_DEFINITIONS);

// Mirror JSON files into apps/game-client/public/data/professions/ & world/
const CLIENT_PROF_DIR = path.join(ROOT, 'apps', 'game-client', 'public', 'data', 'professions');
fs.mkdirSync(CLIENT_PROF_DIR, { recursive: true });
for (const fname of fs.readdirSync(PROF_DIR)) {
  fs.copyFileSync(path.join(PROF_DIR, fname), path.join(CLIENT_PROF_DIR, fname));
}
writeJson(WORLD_DIR, 'guild_config.json', guildConfigDoc);
writeJson(WORLD_DIR, 'merchant_config.json', merchantConfigDoc);
writeJson(WORLD_DIR, 'territories_config.json', TERRITORY_DEFINITIONS);

// Merge Profession NPCs cleanly into world/npcs.json (idempotent)
const npcsFile = path.join(WORLD_DIR, 'npcs.json');
const existingNpcs = JSON.parse(fs.readFileSync(npcsFile, 'utf-8').replace(/^\uFEFF/, ''));
for (const pnpc of PROFESSION_NPCS) {
  const rec = {
    id: pnpc.id,
    name: pnpc.nameVi,
    role: `${pnpc.title} (${pnpc.professionId})`,
    serviceType: `profession:${pnpc.professionId}`,
    regionId: pnpc.mapId,
    spriteId: pnpc.spriteId,
    tx: pnpc.tx,
    ty: pnpc.ty,
    dialogue: pnpc.dialogueIntro,
  };
  const idx = existingNpcs.findIndex((n) => n.id === pnpc.id);
  if (idx >= 0) existingNpcs[idx] = rec;
  else existingNpcs.push(rec);
}
writeJson(WORLD_DIR, 'npcs.json', existingNpcs);

// Merge Materials, Tools, Products & Seals cleanly into world/world_items.json (idempotent)
const itemsFile = path.join(WORLD_DIR, 'world_items.json');
const existingItems = JSON.parse(fs.readFileSync(itemsFile, 'utf-8').replace(/^\uFEFF/, ''));
const mergePool = [
  ...PROFESSION_MATERIALS.map((m) => ({
    id: m.id,
    name: m.name,
    nameVi: m.nameVi,
    category: 'material',
    rarity: m.rarity,
    iconKey: m.professionId === 'woodcutter' ? 'wood_oak' : m.professionId === 'miner' ? 'ore_iron' : 'herb_green',
    price: m.baseValueGold,
    stackable: true,
    stackLimit: m.stackLimit,
    isTradable: true,
    description: m.description,
  })),
  ...PROFESSION_TOOLS.map((t) => ({
    id: t.id,
    name: t.name,
    nameVi: t.nameVi,
    category: 'tool',
    rarity: t.rarity,
    iconKey: 'upgrade_stone',
    price: t.priceGold,
    stackable: false,
    isTradable: true,
    description: `Công cụ nghề ${t.professionId} Tier ${t.tier} (+${t.qualityBonusPct}% Quality, +${t.extraYieldBonusPct}% Bonus Yield).`,
  })),
  ...ORGANIZATION_AND_PROFESSION_ITEM_CATALOG,
];

for (const item of mergePool) {
  const idx = existingItems.findIndex((x) => x.id === item.id);
  if (idx >= 0) existingItems[idx] = { ...existingItems[idx], ...item };
  else existingItems.push(item);
}
writeJson(WORLD_DIR, 'world_items.json', existingItems);

// Validate uniqueness & cross-references
const assertUnique = (arr, label) => {
  const seen = new Set();
  for (const x of arr) {
    assert.ok(x.id, `${label} missing id`);
    assert.ok(!seen.has(x.id), `Duplicate ID in ${label}: ${x.id}`);
    seen.add(x.id);
  }
};
assertUnique(PROFESSION_DEFINITIONS, 'professions');
assertUnique(PROFESSION_MATERIALS, 'materials');
assertUnique(PROFESSION_TOOLS, 'tools');
assertUnique(PROFESSION_GATHERING_NODES, 'nodes');
assertUnique(PROFESSION_RECIPES, 'recipes');
assertUnique(PROFESSION_QUESTS, 'quests');
assertUnique(PROFESSION_NPCS, 'npcs');
assertUnique(TERRITORY_DEFINITIONS, 'territories');

const mapIds = new Set(JSON.parse(fs.readFileSync(path.join(WORLD_DIR, 'maps.json'), 'utf-8').replace(/^\uFEFF/, '')).map((m) => m.id));
for (const n of PROFESSION_GATHERING_NODES) assert.ok(mapIds.has(n.mapId), `Invalid node mapId: ${n.mapId}`);
for (const npc of PROFESSION_NPCS) assert.ok(mapIds.has(npc.mapId), `Invalid npc mapId: ${npc.mapId}`);
for (const t of TERRITORY_DEFINITIONS) assert.ok(mapIds.has(t.mapId), `Invalid territory mapId: ${t.mapId}`);

const itemIds = new Set(existingItems.map((i) => i.id));
for (const r of PROFESSION_RECIPES) {
  for (const mat of r.materials) {
    assert.ok(itemIds.has(mat.itemId), `Recipe ${r.id} references missing material: ${mat.itemId}`);
  }
  assert.ok(itemIds.has(r.outputItemId), `Recipe ${r.id} references missing output: ${r.outputItemId}`);
}
for (const q of PROFESSION_QUESTS) {
  if (q.requiredItemId) assert.ok(itemIds.has(q.requiredItemId), `Quest ${q.id} missing item: ${q.requiredItemId}`);
}

console.log('[Sync] All 10 game-data/professions/*.json, organizations/*.json, NPCs & world_items synced and cross-reference validated cleanly!');
