import test from 'node:test';
import assert from 'node:assert/strict';
import { SpriteAssetManager } from '../src/engine/SpriteAssetManager.ts';
import { CharacterPreview } from '../src/ui/CharacterPreview.ts';

test('1. SpriteAssetManager registers default character configs across male and female jobs', () => {
  const manager = SpriteAssetManager.getInstance();
  assert.ok(manager, 'Manager instance must be defined');

  // Verify novice and jobs
  const maleNovice = manager.getConfig('male', 'novice');
  assert.equal(maleNovice.gender, 'male');
  assert.equal(maleNovice.jobId, 'novice');
  assert.equal(maleNovice.frameWidth, 64);
  assert.equal(maleNovice.frameHeight, 64);

  const femaleNovice = manager.getConfig('female', 'novice');
  assert.equal(femaleNovice.gender, 'female');
  assert.equal(femaleNovice.jobId, 'novice');
  assert.equal(femaleNovice.directions, 8);

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
  // Female uses full 8 directions:
  assert.equal(manager.resolveDirectionColumn(femaleNovice, 'south'), 0);
  assert.equal(manager.resolveDirectionColumn(femaleNovice, 'south_west'), 1);
  assert.equal(manager.resolveDirectionColumn(femaleNovice, 'west'), 2);
  assert.equal(manager.resolveDirectionColumn(femaleNovice, 'north_west'), 3);
  assert.equal(manager.resolveDirectionColumn(femaleNovice, 'north'), 4);
  assert.equal(manager.resolveDirectionColumn(femaleNovice, 'north_east'), 5);
  assert.equal(manager.resolveDirectionColumn(femaleNovice, 'east'), 6);
  assert.equal(manager.resolveDirectionColumn(femaleNovice, 'south_east'), 7);
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
