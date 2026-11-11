import fs from 'node:fs';
import path from 'node:path';
import { validateWorldPlacement } from '../packages/game-data-schema/dist/index.js';

const ROOT = process.cwd();
const mapsDir = path.join(ROOT, 'apps', 'game-client', 'public', 'data', 'maps');
const worldDir = path.join(ROOT, 'apps', 'game-client', 'public', 'data', 'world');
const profDir = path.join(ROOT, 'apps', 'game-client', 'public', 'data', 'professions');

const mapsById = {};
for (const file of fs.readdirSync(mapsDir)) {
  if (!file.endsWith('.json')) continue;
  const doc = JSON.parse(fs.readFileSync(path.join(mapsDir, file), 'utf-8').replace(/^\uFEFF/, ''));
  if (doc?.id) mapsById[doc.id] = doc;
}

const npcs = JSON.parse(fs.readFileSync(path.join(worldDir, 'npcs.json'), 'utf-8').replace(/^\uFEFF/, ''));
const profNpcs = JSON.parse(fs.readFileSync(path.join(profDir, 'profession_npcs.json'), 'utf-8').replace(/^\uFEFF/, ''));

const report = validateWorldPlacement(mapsById, npcs, profNpcs);
console.log(`[WorldPlacement] Checked ${report.checkedMaps} maps, ${report.checkedNpcs} NPCs, ${report.checkedPortals} portals -> errors=${report.errorCount}, warnings=${report.warningCount}`);

if (!report.valid) {
  for (const issue of report.issues) {
    console.error(`  [${issue.severity.toUpperCase()}] (${issue.code}) ${issue.regionId}/${issue.entityId}: ${issue.message}`);
  }
  process.exit(1);
}
console.log('[OK] All NPC placements, Sanctuary interior, portals, and Beginner Village safety rules passed.');
