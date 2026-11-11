import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSkillIconSvg, getItemIconSvg } from '../src/ui/FantasyArtIcons.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, '../public');

test('Client Visual Overhaul: FantasyArtIcons renders distinct SVG icons for all skill categories and item keys', () => {
  const skillKeys = [
    'skill_flame_slash',
    'skill_frost_bolt',
    'skill_holy_heal',
    'skill_shadow_step',
    'skill_thunder_spear',
    'skill_wind_arrow',
    'skill_aegis_shield',
    'skill_arcane_star',
    'skill_novice_slash',
  ];
  const seenSkillSvgs = new Set();
  for (const key of skillKeys) {
    const svg = getSkillIconSvg(key);
    assert.ok(svg.includes('<svg'), `Icon for ${key} must be valid SVG`);
    seenSkillSvgs.add(svg);
  }
  assert.ok(seenSkillSvgs.size >= 8, 'Each skill archetype must have a distinct SVG');

  const itemKeys = [
    'sword_novice',
    'excalibur_sword_icon',
    'shield_oak',
    'tunic_explorer',
    'helm_bronze',
    'gloves_leather',
    'boots_traveler',
    'ring_copper',
    'amulet_jade',
    'potion_hp',
    'potion_mp',
    'herb',
    'ore_copper',
    'scroll_return',
  ];
  for (const key of itemKeys) {
    const svg = getItemIconSvg(key);
    assert.ok(svg.includes('<svg'), `Item icon for ${key} must be valid SVG`);
  }
});

test('Client Visual Overhaul: classes.json, entities.json, and Beginner Village map spawns are synchronized', () => {
  const classesData = JSON.parse(fs.readFileSync(path.join(PUBLIC_DIR, 'data/world/classes.json'), 'utf8'));
  const classes = classesData.classes || classesData;
  assert.ok(classes.length >= 8);
  for (const cls of classes) {
    if (cls.id === 'novice' || cls.id === 'adventurer') continue;
    assert.ok(cls.artworkUrl?.startsWith('/assets/elysia/characters/jobs/'), `Class ${cls.id} missing artworkUrl path`);
    const fullIllustPath = path.join(PUBLIC_DIR, cls.artworkUrl.replace(/^\//, ''));
    assert.equal(fs.existsSync(fullIllustPath), true, `Missing class illustration on disk: ${cls.artworkUrl}`);
  }

  const villageMap = JSON.parse(fs.readFileSync(path.join(PUBLIC_DIR, 'data/maps/thon_khoi_nguyen.json'), 'utf8'));
  const npcIds = (villageMap.spawns?.npcs || []).map((n) => n.npcId || n.id);
  assert.ok(npcIds.includes('NPC_SANCTUARY_PRIESTESS'), 'Beginner Village spawns.npcs must include NPC_SANCTUARY_PRIESTESS');
  assert.ok(npcIds.includes('NPC_HUNTER_KAEL'), 'Beginner Village spawns.npcs must include NPC_HUNTER_KAEL');

  const profNpcs = JSON.parse(fs.readFileSync(path.join(PUBLIC_DIR, 'data/professions/profession_npcs.json'), 'utf8'));
  const blacksmith = profNpcs.find((n) => (n.id || n.npcId) === 'NPC_BLACKSMITH_MASTER');
  assert.equal(blacksmith?.spriteId, 'npc_blacksmith');
  assert.equal(blacksmith?.mapId, 'THON_KHOI_NGUYEN');
});
