import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SpriteAssetManager } from '../src/engine/SpriteAssetManager.ts';
import { CharacterPreview } from '../src/ui/CharacterPreview.ts';

test('Preview frame rectangles stay inside every registered character atlas', () => {
  const manager = new SpriteAssetManager();
  const jobs = ['novice', 'swordsman', 'warrior', 'knight', 'paladin', 'mage', 'priest',
    'monk', 'assassin', 'archer', 'lancer', 'spearman', 'fighter'];
  for (const gender of ['male', 'female']) for (const job of jobs) {
    const config = manager.getConfig(gender, job);
    const png = fs.readFileSync(new URL(`../public${config.atlasPath}`, import.meta.url));
    const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
    for (const [state, clip] of Object.entries(config.animations)) {
      for (const direction of SpriteAssetManager.DIRECTIONS_8) {
        const lastColumn = manager.resolveDirectionColumn(config, direction) * clip.frames + clip.frames;
        assert.ok(lastColumn * config.frameWidth <= width, `${gender}/${job}/${state}/${direction}: column out of bounds`);
        assert.ok((clip.row + 1) * config.frameHeight <= height, `${gender}/${job}/${state}: row out of bounds`);
      }
    }
  }
});

test('1. SpriteAssetManager registers default character configs across male and female jobs', () => {
  const manager = SpriteAssetManager.getInstance();
  assert.ok(manager, 'Manager instance must be defined');

  // Verify novice and jobs
  const maleNovice = manager.getConfig('male', 'novice');
  assert.equal(maleNovice.gender, 'male');
  assert.equal(maleNovice.jobId, 'novice');
  assert.equal(maleNovice.frameWidth, 192);
  assert.equal(maleNovice.frameHeight, 160);

  const femaleNovice = manager.getConfig('female', 'novice');
  assert.equal(femaleNovice.gender, 'female');
  assert.equal(femaleNovice.jobId, 'novice');
  assert.equal(femaleNovice.directions, 1);

  const maleSwordsman = manager.getConfig('male', 'swordsman');
  assert.equal(maleSwordsman.jobId, 'swordsman');
});

test('2. 8-Direction and 4-Direction fallback mapping correctly resolves all angles', () => {
  const manager = SpriteAssetManager.getInstance();
  const maleNovice = manager.getConfig('male', 'novice');

  // Male uses 4 directions with 8-direction fallback:
  assert.equal(manager.resolveDirectionColumn(maleNovice, 'south'), 0);
  assert.equal(manager.resolveDirectionColumn(maleNovice, 'south_west'), 1); // maps to west
  assert.equal(manager.resolveDirectionColumn(maleNovice, 'west'), 1);
  assert.equal(manager.resolveDirectionColumn(maleNovice, 'north_west'), 1); // maps to west
  assert.equal(manager.resolveDirectionColumn(maleNovice, 'north'), 3);
  assert.equal(manager.resolveDirectionColumn(maleNovice, 'north_east'), 2); // maps to east
  assert.equal(manager.resolveDirectionColumn(maleNovice, 'east'), 2);
  assert.equal(manager.resolveDirectionColumn(maleNovice, 'south_east'), 2); // maps to east

  const femaleNovice = manager.getConfig('female', 'novice');
  // The female novice source has only a front view; never read imaginary columns.
  for (const direction of SpriteAssetManager.DIRECTIONS_8) {
    assert.equal(manager.resolveDirectionColumn(femaleNovice, direction), 0);
  }
});

test('3. Paper Doll Layer Order complies with back-to-front rendering specification', () => {
  const order = SpriteAssetManager.PAPER_DOLL_LAYER_ORDER;
  assert.deepEqual(order, [
    'cloak',
    'boots',
    'armor',
    'gloves',
    'shoulder',
    'head',
    'weapon',
  ]);
  // Cloak must be at index 0 (rendered behind body)
  assert.equal(order[0], 'cloak');
  // Weapon must be at index 6 (rendered in front of body and hands)
  assert.equal(order[order.length - 1], 'weapon');
});

test('4. CharacterPreview component correctly handles rotation, zoom, gender and job preview', () => {
  // Mock DOM environment for node test
  if (typeof document === 'undefined') {
    globalThis.document = {
      createElement: (tag) => ({
        tagName: tag,
        className: '',
        innerHTML: '',
        style: {},
        width: 240,
        height: 280,
        getContext: () => ({
          clearRect: () => {},
          save: () => {},
          restore: () => {},
          drawImage: () => {},
          beginPath: () => {},
          ellipse: () => {},
          fill: () => {},
          arc: () => {},
        }),
        appendChild: () => {},
        querySelector: () => ({ textContent: '', appendChild: () => {}, addEventListener: () => {} }),
        querySelectorAll: () => [],
        addEventListener: () => {},
      }),
    };
  }

  const preview = new CharacterPreview({
    level: 15,
    jobId: 'swordsman',
    playerName: 'Tester',
    gender: 'male',
    equipment: {},
  });

  assert.ok(preview.getElement(), 'Preview element must exist');

  // Test rotation
  preview.rotateRight();
  preview.rotateLeft();

  // Test gender
  preview.setGender('female');

  // Test job preview
  preview.setJobId('paladin');

  // Test zoom
  preview.setZoom(1.25);
});
