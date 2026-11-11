import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(CLIENT_ROOT, 'public');
const LANDING_ASSETS_DIR = path.join(PUBLIC_DIR, 'assets', 'elysia', 'landing');
const LANDING_DATA_PATH = path.join(CLIENT_ROOT, 'src', 'landing', 'landingData.json');

test('Landing Page: Static landing data matches canonical game databases', () => {
  assert.equal(fs.existsSync(LANDING_DATA_PATH), true, 'landingData.json must exist');
  const landingData = JSON.parse(fs.readFileSync(LANDING_DATA_PATH, 'utf8'));

  // 1. Verify 8 canonical first-job classes
  assert.equal(landingData.jobs.length, 8, 'Must have exactly 8 canonical first jobs');
  const expectedClassIds = [
    'swordsman',
    'spearman',
    'knight',
    'monk',
    'mage',
    'assassin',
    'fighter',
    'archer',
  ];
  for (const cid of expectedClassIds) {
    const job = landingData.jobs.find((j) => j.id === cid);
    assert.ok(job, `Class ${cid} must be present in landing jobs`);
    assert.ok(job.nameVi, `Class ${cid} must have Vietnamese name`);
    assert.ok(job.description, `Class ${cid} must have description`);
    assert.equal(job.advancedBranches?.length, 2, `Class ${cid} must have 2 advanced branches`);

    // Verify both male and female illustration files exist on disk
    const malePath = path.join(PUBLIC_DIR, job.maleImg.replace(/^\//, ''));
    const femalePath = path.join(PUBLIC_DIR, job.femaleImg.replace(/^\//, ''));
    assert.equal(fs.existsSync(malePath), true, `Missing male illustration: ${job.maleImg}`);
    assert.equal(fs.existsSync(femalePath), true, `Missing female illustration: ${job.femaleImg}`);
  }

  // 2. Verify hero keyart exists
  const heroJpg = path.join(LANDING_ASSETS_DIR, 'hero', 'hero_keyart.jpg');
  assert.equal(fs.existsSync(heroJpg), true, 'Hero keyart jpg must exist on disk');

  // 3. Verify showcase skills exist
  assert.ok(landingData.skills.length >= 10, 'Must have at least 10 showcase skills');
  for (const sk of landingData.skills) {
    assert.ok(sk.id && sk.nameVi, 'Skill must have valid id and name');
  }

  // 4. Verify world regions
  assert.ok(landingData.regions.length >= 10, 'Must have at least 10 world regions');
  for (const reg of landingData.regions) {
    assert.ok(reg.id && reg.nameVi, 'Region must have valid id and name');
    const miniPath = path.join(PUBLIC_DIR, reg.minimap.replace(/^\//, ''));
    assert.equal(fs.existsSync(miniPath), true, `Minimap missing on disk: ${reg.minimap}`);
  }

  // 5. Verify Bosses
  assert.ok(landingData.bosses.length >= 5, 'Must have at least 5 bosses');
  for (const b of landingData.bosses) {
    const spritePath = path.join(PUBLIC_DIR, b.sprite.replace(/^\//, ''));
    assert.equal(fs.existsSync(spritePath), true, `Boss sprite missing on disk: ${b.sprite}`);
  }
});

test('Landing Page: index.html has complete SEO and OpenGraph metadata', () => {
  const indexHtml = fs.readFileSync(path.join(CLIENT_ROOT, 'index.html'), 'utf8');
  assert.ok(indexHtml.includes('<title>ELYSIA NO DENSETSU – Become Wibu, Save the Worlds</title>'));
  assert.ok(indexHtml.includes('property="og:title"'));
  assert.ok(indexHtml.includes('property="og:image"'));
  assert.ok(indexHtml.includes('property="twitter:card"'));
  assert.ok(indexHtml.includes('meta name="description"'));
  assert.ok(indexHtml.includes('fonts.googleapis.com'));
});
