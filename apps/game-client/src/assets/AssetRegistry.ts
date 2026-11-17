import type {
  AnimationMetadata,
  CharacterManifest,
  EquipmentManifest,
} from './AssetManifest.ts';
import {
  validateAnimationMetadata,
  validateCharacterManifest,
  validateEquipmentManifest,
} from './AssetManifest.ts';

/**
 * Enterprise Asset Registry for Elysia no Densetsu.
 * Stores, indexes, and validates all visual manifests for characters,
 * equipment, animations, NPCs, and monsters.
 */
export class AssetRegistry {
  private static instance: AssetRegistry | null = null;
  private characters = new Map<string, CharacterManifest>();
  private animations = new Map<string, AnimationMetadata>(); // key: `${entityId}_${clipId}`
  private equipment = new Map<string, EquipmentManifest>();

  constructor() {
    this.registerBuiltinManifests();
  }

  public static getInstance(): AssetRegistry {
    if (!AssetRegistry.instance) {
      AssetRegistry.instance = new AssetRegistry();
    }
    return AssetRegistry.instance;
  }

  private registerBuiltinManifests() {
    // 1. Male Novice Base Character Manifest
    this.registerCharacter({
      schemaVersion: 1,
      id: 'novice_male_01',
      type: 'character',
      gender: 'male',
      job: 'novice',
      artStyle: 'anime_fantasy',
      resolutionMode: 'adaptive',
      referenceHeight: 160,
      pixelsPerUnit: 160,
      directions: ['south', 'south_west', 'west', 'north_west', 'north', 'north_east', 'east', 'south_east'],
      layers: ['shadow', 'back_equipment', 'body', 'armor', 'hair', 'headgear', 'front_equipment', 'vfx'],
      animations: {
        idle: { fps: 8, loop: true, required: true },
        walk: { fps: 10, loop: true, required: true },
        attack: { fps: 12, loop: false, required: true },
        skill: { fps: 12, loop: false, required: false },
        hurt: { fps: 10, loop: false, required: false },
        death: { fps: 8, loop: false, required: false },
      },
    });

    // 2. Female Novice Base Character Manifest
    this.registerCharacter({
      schemaVersion: 1,
      id: 'novice_female_01',
      type: 'character',
      gender: 'female',
      job: 'novice',
      artStyle: 'anime_fantasy',
      resolutionMode: 'adaptive',
      referenceHeight: 160,
      pixelsPerUnit: 160,
      directions: ['south', 'south_west', 'west', 'north_west', 'north', 'north_east', 'east', 'south_east'],
      layers: ['shadow', 'back_equipment', 'body', 'armor', 'hair', 'headgear', 'front_equipment', 'vfx'],
      animations: {
        idle: { fps: 8, loop: true, required: true },
        walk: { fps: 10, loop: true, required: true },
        attack: { fps: 12, loop: false, required: true },
        skill: { fps: 12, loop: false, required: false },
        hurt: { fps: 10, loop: false, required: false },
        death: { fps: 8, loop: false, required: false },
      },
    });

    // 3. Builtin Animations Metadata
    this.registerAnimation('novice_male_01', {
      schemaVersion: 1,
      clipId: 'idle',
      source: '/assets/elysia/characters/animations/player.png',
      format: 'spritesheet',
      directions: ['south', 'south_west', 'west', 'north_west', 'north', 'north_east', 'east', 'south_east'],
      frameSize: { width: 64, height: 64 },
      framesPerDirection: 6,
      layout: { type: 'grid', columns: 6, rows: 4, directionOrder: 'manifest' },
      fps: 8,
      loop: true,
      pivot: { x: 32, y: 56 },
      logicalCanvas: { width: 64, height: 64 },
    });

    this.registerAnimation('novice_female_01', {
      schemaVersion: 1,
      clipId: 'idle',
      source: '/assets/characters/female/novice/animations/novice_female_master_atlas.png',
      format: 'spritesheet',
      directions: ['south', 'south_west', 'west', 'north_west', 'north', 'north_east', 'east', 'south_east'],
      frameSize: { width: 64, height: 64 },
      framesPerDirection: 6,
      layout: { type: 'grid', columns: 6, rows: 8, directionOrder: 'manifest' },
      fps: 8,
      loop: true,
      pivot: { x: 32, y: 56 },
      logicalCanvas: { width: 64, height: 64 },
    });

    // 4. Sample Equipment Manifests
    this.registerEquipment({
      schemaVersion: 1,
      id: 'iron_sword_001',
      type: 'weapon',
      slot: 'weapon',
      weaponType: 'sword',
      rarity: 'common',
      allowedJobs: ['novice', 'swordsman', 'knight', 'warrior'],
      levelRequirement: 1,
      layer: 'front_equipment',
      renderOrder: {
        south: 60,       // in front of body facing South
        south_west: 58,
        west: 55,
        north_west: 25,
        north: 20,       // behind body facing North
        north_east: 25,
        east: 55,
        south_east: 58,
      },
      animations: {
        idle: '/assets/weapons/wooden_sword_sprite.png',
        walk: '/assets/weapons/wooden_sword_sprite.png',
        attack: '/assets/weapons/wooden_sword_sprite.png',
      },
      anchorProfile: 'right_hand',
      stats: { physicalAttack: 15 },
    });

    this.registerEquipment({
      schemaVersion: 1,
      id: 'excalibur_001',
      type: 'weapon',
      slot: 'weapon',
      weaponType: 'greatsword',
      rarity: 'mythic',
      allowedJobs: ['swordsman', 'knight', 'paladin'],
      levelRequirement: 10,
      layer: 'front_equipment',
      renderOrder: { south: 65, north: 18 },
      animations: {
        idle: '/assets/weapons/excalibur_sword_sprite.png',
        walk: '/assets/weapons/excalibur_sword_sprite.png',
        attack: '/assets/weapons/excalibur_sword_sprite.png',
      },
      anchorProfile: 'right_hand',
      stats: { physicalAttack: 120, holyDamage: 45 },
    });
  }

  public registerCharacter(manifest: CharacterManifest) {
    const valid = validateCharacterManifest(manifest);
    this.characters.set(valid.id, valid);
  }

  public getCharacter(id: string): CharacterManifest | undefined {
    return this.characters.get(id);
  }

  public registerAnimation(entityId: string, metadata: AnimationMetadata) {
    const valid = validateAnimationMetadata(metadata);
    const key = `${entityId}_${valid.clipId}`;
    this.animations.set(key, valid);
  }

  public getAnimation(entityId: string, clipId: string): AnimationMetadata | undefined {
    return this.animations.get(`${entityId}_${clipId}`) || this.animations.get(`novice_male_01_${clipId}`);
  }

  public registerEquipment(manifest: EquipmentManifest) {
    const valid = validateEquipmentManifest(manifest);
    this.equipment.set(valid.id, valid);
  }

  public getEquipment(id: string): EquipmentManifest | undefined {
    return this.equipment.get(id);
  }

  public getAllCharacters(): CharacterManifest[] {
    return Array.from(this.characters.values());
  }

  public getAllEquipment(): EquipmentManifest[] {
    return Array.from(this.equipment.values());
  }
}

export const assetRegistry = AssetRegistry.getInstance();
