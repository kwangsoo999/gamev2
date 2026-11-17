import test from 'node:test';
import assert from 'node:assert/strict';

import { AnimationClock } from '../src/rendering/animation/AnimationClock.ts';
import { DirectionResolver } from '../src/rendering/animation/DirectionResolver.ts';
import { AnimationSynchronizer } from '../src/rendering/animation/AnimationSynchronizer.ts';
import { AnimationController, ANIM_PRIORITIES } from '../src/rendering/animation/AnimationController.ts';
import { LayerSortManager } from '../src/rendering/sprites/LayerSortManager.ts';
import { SpriteAnchorManager } from '../src/rendering/sprites/SpriteAnchorManager.ts';
import { AdaptiveSpriteScaler } from '../src/rendering/sprites/AdaptiveSpriteScaler.ts';
import { SpriteLayer } from '../src/rendering/sprites/SpriteLayer.ts';
import { SpriteComposer } from '../src/rendering/sprites/SpriteComposer.ts';
import { CharacterAppearance } from '../src/characters/CharacterAppearance.ts';
import { EquipmentLayerMapper } from '../src/equipment/EquipmentLayerMapper.ts';
import { AssetValidator } from '../src/assets/AssetValidator.ts';
import { assetRegistry } from '../src/assets/AssetRegistry.ts';

test('1. AnimationClock provides consistent delta time and master heartbeat', () => {
  const clock = AnimationClock.getInstance();
  const delta1 = clock.tick(1000);
  assert.ok(delta1 > 0, 'Delta time should be positive');

  const delta2 = clock.tick(1016.67);
  assert.ok(delta2 >= 15 && delta2 <= 18, `Delta time should be ~16.67ms (got ${delta2})`);
  assert.equal(clock.getTimeMs(), 1016.67);

  clock.pause();
  const deltaPaused = clock.tick(1050);
  assert.equal(deltaPaused, delta2, 'Clock should not update when paused');
  clock.resume();
});

test('2. DirectionResolver accurately maps 8-direction vectors and cardinal fallback', () => {
  // Vector to 8-directions: (0, 1) is South in screen coords (downwards y)
  assert.equal(DirectionResolver.fromVector(0, 1), 'south');
  assert.equal(DirectionResolver.fromVector(0, -1), 'north');
  assert.equal(DirectionResolver.fromVector(1, 0), 'east');
  assert.equal(DirectionResolver.fromVector(-1, 0), 'west');
  assert.equal(DirectionResolver.fromVector(1, 1), 'south_east');
  assert.equal(DirectionResolver.fromVector(-1, 1), 'south_west');
  assert.equal(DirectionResolver.fromVector(1, -1), 'north_east');
  assert.equal(DirectionResolver.fromVector(-1, -1), 'north_west');

  // Index mapping (0=South, 1=SW, 2=W, 3=NW, 4=N, 5=NE, 6=E, 7=SE)
  assert.equal(DirectionResolver.getIndex('south'), 0);
  assert.equal(DirectionResolver.getIndex('west'), 2);
  assert.equal(DirectionResolver.getIndex('north'), 4);
  assert.equal(DirectionResolver.getIndex('east'), 6);

  assert.equal(DirectionResolver.fromIndex(0), 'south');
  assert.equal(DirectionResolver.fromIndex(4), 'north');
  assert.equal(DirectionResolver.fromIndex(7), 'south_east');

  // Cardinal fallbacks
  assert.equal(DirectionResolver.getCardinalFallback('south_west'), 'west');
  assert.equal(DirectionResolver.getCardinalFallback('north_east'), 'east');
  assert.equal(DirectionResolver.getCardinalFallback('north_west'), 'west');
  assert.equal(DirectionResolver.getCardinalFallback('south_east'), 'east');
});

test('3. AnimationSynchronizer locks multiple equipment layers to the same frame progress', () => {
  const sync = new AnimationSynchronizer({
    clipId: 'attack',
    fps: 10, // 100ms per frame
    totalFrames: 5,
    loop: false,
    direction: 'south',
  });

  sync.registerLayer('body');
  sync.registerLayer('weapon');
  sync.registerLayer('armor');

  assert.equal(sync.getCurrentFrame(), 0);
  assert.equal(sync.getProgress(), 0);

  // Advance by 100ms -> Frame 1
  sync.update(100);
  assert.equal(sync.getCurrentFrame(), 1);
  assert.equal(sync.getProgress(), 0.25);

  // Advance by 300ms -> Frame 4 (final frame displayed)
  sync.update(300);
  assert.equal(sync.getCurrentFrame(), 4);
  assert.equal(sync.getProgress(), 1.0);

  // Advance by 100ms -> Completes final frame
  sync.update(100);
  assert.equal(sync.isComplete(), true);
});

test('4. AnimationController enforces strict interruption priority rules', () => {
  const ctrl = new AnimationController('south');
  assert.equal(ctrl.getState(), 'idle');

  // Idle -> Walk: Allowed
  assert.equal(ctrl.setState('walk'), true);
  assert.equal(ctrl.getState(), 'walk');

  // Walk -> Attack: Allowed
  assert.equal(ctrl.setState('attack'), true);
  assert.equal(ctrl.getState(), 'attack');

  // Attack -> Walk: Rejected (Walk priority 1 < Attack priority 3)
  assert.equal(ctrl.setState('walk'), false);
  assert.equal(ctrl.getState(), 'attack');

  // Attack -> Hurt: Allowed (Hurt priority 4 > Attack priority 3)
  assert.equal(ctrl.setState('hurt'), true);
  assert.equal(ctrl.getState(), 'hurt');

  // Hurt -> Death: Allowed (Death priority 5 > Hurt priority 4)
  assert.equal(ctrl.setState('death'), true);
  assert.equal(ctrl.getState(), 'death');

  // Death -> Attack: Rejected (Death cannot be interrupted except by revive)
  assert.equal(ctrl.setState('attack'), false);
  assert.equal(ctrl.getState(), 'death');
});

test('5. LayerSortManager resolves direction-dependent depth sorting (South vs North)', () => {
  // Facing South: Front equipment (weapon) must render IN FRONT of body (z=70 > z=30)
  // Back equipment (cloak) must render BEHIND body (z=20 < z=30)
  const zWeaponSouth = LayerSortManager.resolveZIndex('front_equipment', 'south');
  const zBodySouth = LayerSortManager.resolveZIndex('body', 'south');
  const zBackSouth = LayerSortManager.resolveZIndex('back_equipment', 'south');

  assert.ok(zWeaponSouth > zBodySouth, `Weapon South (${zWeaponSouth}) should be in front of Body (${zBodySouth})`);
  assert.ok(zBodySouth > zBackSouth, `Body South (${zBodySouth}) should be in front of Back equipment (${zBackSouth})`);

  // Facing North: Front equipment (weapon) must render BEHIND body (z=20 < z=30)
  // Back equipment (cloak) must render IN FRONT of body (z=70 > z=30)
  const zWeaponNorth = LayerSortManager.resolveZIndex('front_equipment', 'north');
  const zBodyNorth = LayerSortManager.resolveZIndex('body', 'north');
  const zBackNorth = LayerSortManager.resolveZIndex('back_equipment', 'north');

  assert.ok(zWeaponNorth < zBodyNorth, `Weapon North (${zWeaponNorth}) should be behind Body (${zBodyNorth})`);
  assert.ok(zBackNorth > zBodyNorth, `Back equipment North (${zBackNorth}) should be in front of Body (${zBodyNorth})`);

  // Test full list sort
  const unsorted = [
    { id: 'weapon', category: 'front_equipment' },
    { id: 'body', category: 'body' },
    { id: 'cloak', category: 'back_equipment' },
    { id: 'shadow', category: 'shadow' },
  ];

  const sortedSouth = LayerSortManager.sortLayers(unsorted, 'south');
  assert.deepEqual(
    sortedSouth.map((l) => l.id),
    ['shadow', 'cloak', 'body', 'weapon']
  );

  const sortedNorth = LayerSortManager.sortLayers(unsorted, 'north');
  assert.deepEqual(
    sortedNorth.map((l) => l.id),
    ['shadow', 'weapon', 'body', 'cloak']
  );
});

test('6. SpriteAnchorManager provides anatomically correct anchor positions', () => {
  const headSouth = SpriteAnchorManager.getAnchor('head', 'south');
  assert.equal(headSouth.x, 0.5);
  assert.ok(headSouth.y < 0.3, 'Head anchor should be in upper body quadrant');

  const feetSouth = SpriteAnchorManager.getAnchor('feet', 'south');
  assert.equal(feetSouth.x, 0.5);
  assert.ok(feetSouth.y > 0.9, 'Feet anchor should be at bottom ground contact');

  // Directional shift: Right hand moves more westward when facing West
  const rightHandSouth = SpriteAnchorManager.getAnchor('right_hand', 'south');
  const rightHandWest = SpriteAnchorManager.getAnchor('right_hand', 'west');
  assert.ok(rightHandWest.x < rightHandSouth.x, 'Right hand should shift westward when facing West');
});

test('7. AdaptiveSpriteScaler normalizes variable dimensions while preserving ground pivot', () => {
  // Scale a 64x64 Novice sprite (refHeight=64)
  const noviceScale = AdaptiveSpriteScaler.compute(64, 64, 64, { x: 0.5, y: 0.95 });
  assert.equal(noviceScale.scaleX, 1.0);
  assert.equal(noviceScale.renderWidth, 64);
  assert.equal(noviceScale.renderHeight, 64);
  assert.equal(noviceScale.pivotOffsetX, 32);
  assert.equal(noviceScale.pivotOffsetY, 61);

  // Scale a 160x160 Boss sprite down to 80px target height
  const bossScale = AdaptiveSpriteScaler.compute(160, 160, 80, { x: 0.5, y: 1.0 });
  assert.equal(bossScale.scaleX, 0.5);
  assert.equal(bossScale.renderWidth, 80);
  assert.equal(bossScale.renderHeight, 80);
  assert.equal(bossScale.pivotOffsetX, 40);
  assert.equal(bossScale.pivotOffsetY, 80);

  // World alignment check
  const aligned = AdaptiveSpriteScaler.alignToWorld(100, 200, noviceScale);
  assert.equal(aligned.drawX, 100 - 32); // 68
  assert.equal(aligned.drawY, 200 - 61); // 139
});

test('8. SpriteComposer manages layers and produces ordered draw lists', () => {
  const composer = new SpriteComposer('south');

  composer.setLayer(new SpriteLayer({ id: 'body', category: 'body' }));
  composer.setLayer(new SpriteLayer({ id: 'sword', category: 'front_equipment' }));
  composer.setLayer(new SpriteLayer({ id: 'shadow', category: 'shadow' }));

  assert.equal(composer.hasLayer('body'), true);
  assert.equal(composer.hasLayer('sword'), true);

  const drawListSouth = composer.getSortedDrawList();
  assert.deepEqual(
    drawListSouth.map((d) => d.id),
    ['shadow', 'body', 'sword']
  );

  // Flip direction to North -> sword moves behind body
  composer.setDirection('north');
  const drawListNorth = composer.getSortedDrawList();
  assert.deepEqual(
    drawListNorth.map((d) => d.id),
    ['shadow', 'sword', 'body']
  );
});

test('9. CharacterAppearance and EquipmentLayerMapper convert items to visual layers', () => {
  const appearance = new CharacterAppearance({
    gender: 'female',
    job: 'novice',
    hairStyle: 'twin_tails',
    hairColor: '#e06c75',
    equippedSlots: {
      weapon: 'wpn_golden_spear',
      chest: 'arm_iron_chainmail',
      head: 'hd_leather_cap',
    },
  });

  assert.equal(appearance.getEquippedItem('weapon'), 'wpn_golden_spear');
  assert.equal(appearance.getEquippedItem('chest'), 'arm_iron_chainmail');

  const layers = EquipmentLayerMapper.mapToLayers(appearance);
  const layerIds = layers.map((l) => l.id);

  assert.ok(layerIds.includes('layer_shadow'), 'Should include shadow layer');
  assert.ok(layerIds.includes('layer_body'), 'Should include base body layer');
  assert.ok(layerIds.includes('layer_hair'), 'Should include hair layer');
  assert.ok(layerIds.includes('layer_weapon_wpn_golden_spear'), 'Should include weapon layer');
  assert.ok(layerIds.includes('layer_chest_arm_iron_chainmail'), 'Should include armor layer');
  assert.ok(layerIds.includes('layer_head_hd_leather_cap'), 'Should include headgear layer');
});

test('10. AssetValidator successfully verifies all built-in manifests', () => {
  const report = AssetValidator.runFullValidation();
  assert.ok(report.totalChecked >= 4, `Should validate at least 4 manifests (checked ${report.totalChecked})`);
  assert.equal(report.errorCount, 0, `Should have 0 validation errors (found ${report.errorCount})`);
  assert.equal(report.passed, true, 'Validation report should pass');
});
