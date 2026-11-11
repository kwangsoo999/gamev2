import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {
  ORGANIZATION_AND_PROFESSION_ITEM_CATALOG,
  PROFESSION_DEFINITIONS,
  PROFESSION_ECONOMY_RULES,
  PROFESSION_GATHERING_NODES,
  PROFESSION_MASTERY_RANKS,
  PROFESSION_MATERIALS,
  PROFESSION_NPCS,
  PROFESSION_QUALITY_RULES,
  PROFESSION_QUESTS,
  PROFESSION_RECIPES,
  PROFESSION_SYSTEM_CONFIG,
  PROFESSION_TOOLS,
  computeCraftProbabilities,
  computeProfessionExpRequired,
} from '../packages/game-data-schema/dist/index.js';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'game-data', 'professions');
const CLIENT_OUT_DIR = path.join(ROOT, 'apps', 'game-client', 'public', 'data', 'professions');
const shouldSync = process.argv.includes('--sync');

if (shouldSync) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(CLIENT_OUT_DIR, { recursive: true });
  const levelCurve = Array.from({ length: PROFESSION_SYSTEM_CONFIG.maxMasteryLevel }, (_, idx) => ({
    level: idx + 1,
    requiredExp: computeProfessionExpRequired(idx + 1),
  }));
  const files = {
    'profession_config.json': { rules: PROFESSION_SYSTEM_CONFIG, professions: PROFESSION_DEFINITIONS },
    'profession_mastery.json': { ranks: PROFESSION_MASTERY_RANKS, levelCurve },
    'profession_recipes.json': PROFESSION_RECIPES,
    'profession_materials.json': PROFESSION_MATERIALS,
    'profession_tools.json': PROFESSION_TOOLS,
    'profession_gathering_nodes.json': PROFESSION_GATHERING_NODES,
    'profession_quality.json': PROFESSION_QUALITY_RULES,
    'profession_quests.json': PROFESSION_QUESTS,
    'profession_npcs.json': PROFESSION_NPCS,
    'profession_economy.json': PROFESSION_ECONOMY_RULES,
  };
  for (const [name, payload] of Object.entries(files)) {
    const serialized = `${JSON.stringify(payload, null, 2)}\n`;
    fs.writeFileSync(path.join(OUT_DIR, name), serialized, 'utf-8');
    fs.writeFileSync(path.join(CLIENT_OUT_DIR, name), serialized, 'utf-8');
  }
  console.log(`[sync] Synced ${Object.keys(files).length} canonical profession JSON files -> game-data/professions/ & apps/game-client/public/data/professions/`);
}

// Strict Validation Pass over all 10 JSON files + cross-references
const requiredFiles = [
  'profession_config.json',
  'profession_mastery.json',
  'profession_recipes.json',
  'profession_materials.json',
  'profession_tools.json',
  'profession_gathering_nodes.json',
  'profession_quality.json',
  'profession_quests.json',
  'profession_npcs.json',
  'profession_economy.json',
  'profession_database_schema.sql',
];
for (const f of requiredFiles) {
  assert.ok(fs.existsSync(path.join(OUT_DIR, f)), `Missing required profession data file: ${f}`);
}

const readJson = (f) => JSON.parse(fs.readFileSync(path.join(OUT_DIR, f), 'utf-8'));
const cfg = readJson('profession_config.json');
const mastery = readJson('profession_mastery.json');
const recipes = readJson('profession_recipes.json');
const materials = readJson('profession_materials.json');
const tools = readJson('profession_tools.json');
const nodes = readJson('profession_gathering_nodes.json');
const quality = readJson('profession_quality.json');
const quests = readJson('profession_quests.json');
const npcs = readJson('profession_npcs.json');
const economy = readJson('profession_economy.json');

assert.equal(cfg.professions.length, 8);
assert.equal(cfg.rules.maxInitialProfessions, 3);
assert.equal(mastery.ranks.length, 7);
assert.equal(mastery.levelCurve.length, 70);
assert.deepEqual(Object.keys(quality).sort(), ['common', 'epic', 'legendary', 'rare', 'uncommon']);
assert.ok(economy.defaultMarketTaxPct >= 1 && economy.maxActiveMarketListingsPerPlayer > 0);

const profIds = new Set(cfg.professions.map((p) => p.id));
const npcMap = new Map(npcs.map((n) => [n.id, n]));
const matIds = new Set(materials.map((m) => m.id));
const questMap = new Map(quests.map((q) => [q.id, q]));
const recipeMap = new Map(recipes.map((r) => [r.id, r]));

const assertUniqueIds = (arr, label) => {
  const seen = new Set();
  for (const x of arr) {
    assert.ok(!seen.has(x.id), `Duplicate ID in ${label}: ${x.id}`);
    seen.add(x.id);
  }
};
assertUniqueIds(recipes, 'recipes');
assertUniqueIds(materials, 'materials');
assertUniqueIds(tools, 'tools');
assertUniqueIds(nodes, 'nodes');
assertUniqueIds(quests, 'quests');
assertUniqueIds(npcs, 'npcs');

// Every profession must have NPC, tools, intro + daily + mastery_advancement + special + hidden_legendary quests, and hidden legendary recipe
for (const pid of profIds) {
  assert.ok(tools.some((t) => t.professionId === pid && t.tier === 1), `Missing tier 1 tool for ${pid}`);
  const pQuests = quests.filter((q) => q.professionId === pid);
  for (const kind of ['intro', 'daily', 'mastery_advancement', 'special', 'hidden_legendary']) {
    assert.ok(pQuests.some((q) => q.questKind === kind), `Profession ${pid} missing questKind "${kind}"`);
  }
  assert.ok(recipes.some((r) => r.professionId === pid && r.isHidden && r.isLegendary), `Profession ${pid} missing hidden legendary recipe`);
}

for (const n of nodes) {
  assert.ok(profIds.has(n.professionId));
  assert.ok(matIds.has(n.primaryMaterialId), `Node ${n.id} unknown primaryMaterialId ${n.primaryMaterialId}`);
  if (n.rareDropMaterialId) {
    assert.ok(matIds.has(n.rareDropMaterialId), `Node ${n.id} unknown rareDropMaterialId ${n.rareDropMaterialId}`);
  }
}

for (const q of quests) {
  assert.ok(npcMap.has(q.npcId), `Quest ${q.id} unknown npcId ${q.npcId}`);
  if (q.unlocksRecipeId) {
    assert.ok(recipeMap.has(q.unlocksRecipeId), `Quest ${q.id} unknown unlocksRecipeId ${q.unlocksRecipeId}`);
  }
}

for (const n of npcs) {
  assert.ok(profIds.has(n.professionId));
  for (const qid of n.questIds) {
    assert.ok(questMap.has(qid), `NPC ${n.id} links missing questId ${qid}`);
  }
}

// Verify Craft Probability distribution sums to ~100%
const pSample = computeCraftProbabilities({
  masteryLevel: 45,
  recipeRequiredMastery: 15,
  baseSuccessRatePct: 90,
  baseExtraYieldChancePct: 12,
  toolQualityBonusPct: 16,
  toolExtraYieldBonusPct: 10,
});
const qSum = Object.values(pSample.qualityProbabilities).reduce((a, b) => a + b, 0);
assert.ok(Math.abs(qSum - 100) <= 0.5, `Quality probabilities must sum to ~100, got ${qSum}`);
assert.ok(ORGANIZATION_AND_PROFESSION_ITEM_CATALOG.length >= 16);

console.log(
  `[OK] Validated 8 professions, ${tools.length} tools, ${materials.length} materials, ${nodes.length} nodes, ${recipes.length} recipes, ${quests.length} quests, ${npcs.length} NPCs.`
);
