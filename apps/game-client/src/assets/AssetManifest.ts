import type { AnimState, EquipSlotKey } from '../engine/types';

export type EightDirectionName =
  | 'south'
  | 'south_west'
  | 'west'
  | 'north_west'
  | 'north'
  | 'north_east'
  | 'east'
  | 'south_east';

export type LayerCategory =
  | 'shadow'
  | 'back_equipment'
  | 'body'
  | 'armor'
  | 'hair'
  | 'headgear'
  | 'front_equipment'
  | 'accessories'
  | 'vfx';

export interface LogicalCanvasSize {
  width: number;
  height: number;
}

export interface PivotPoint {
  x: number;
  y: number;
}

export interface CharacterManifest {
  schemaVersion: number;
  id: string;
  type: 'character' | 'npc' | 'monster' | 'boss';
  gender: 'male' | 'female' | 'neutral';
  job: string;
  artStyle: 'anime_fantasy' | string;
  resolutionMode: 'adaptive' | 'fixed';
  referenceHeight: number;
  pixelsPerUnit: number;
  directions: EightDirectionName[];
  layers: LayerCategory[];
  animations: Record<
    string,
    { fps: number; loop: boolean; required?: boolean }
  >;
}

export interface AnimationMetadata {
  schemaVersion: number;
  clipId: AnimState | string;
  source: string;
  format: 'spritesheet' | 'strip' | 'individual_frames';
  directions: EightDirectionName[];
  frameSize: { width: number; height: number };
  framesPerDirection: number;
  layout: {
    type: 'grid' | 'horizontal_strip' | 'vertical_strip';
    columns: number;
    rows: number;
    directionOrder: 'manifest' | 'clockwise';
  };
  fps: number;
  loop: boolean;
  pivot: PivotPoint;
  logicalCanvas: LogicalCanvasSize;
  frameDurationsMs?: number[];
}

export interface EquipmentManifest {
  schemaVersion: number;
  id: string;
  type: 'weapon' | 'armor' | 'headgear' | 'gloves' | 'boots' | 'cloak' | 'accessory' | 'shield';
  slot: EquipSlotKey;
  weaponType?: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
  allowedJobs: string[];
  levelRequirement: number;
  layer: LayerCategory;
  renderOrder: {
    south: number;
    south_west?: number;
    west?: number;
    north_west?: number;
    north: number;
    north_east?: number;
    east?: number;
    south_east?: number;
  };
  animations: Record<string, string>;
  anchorProfile: 'right_hand' | 'left_hand' | 'head' | 'torso' | 'feet' | 'back';
  stats?: Record<string, number>;
}

export function validateCharacterManifest(data: any): CharacterManifest {
  if (!data || typeof data !== 'object') throw new Error('Character manifest must be an object');
  if (data.schemaVersion !== 1 && data.schemaVersion !== '1') throw new Error('Invalid schemaVersion: expected 1');
  if (!data.id || typeof data.id !== 'string') throw new Error('Character manifest missing required string "id"');
  if (!['male', 'female', 'neutral'].includes(data.gender)) throw new Error(`Invalid gender: ${data.gender}`);
  if (!Array.isArray(data.directions) || data.directions.length === 0) throw new Error('Missing directions array');
  if (!Array.isArray(data.layers) || data.layers.length === 0) throw new Error('Missing layers array');
  if (!data.animations || typeof data.animations !== 'object') throw new Error('Missing animations map');
  return data as CharacterManifest;
}

export function validateAnimationMetadata(data: any): AnimationMetadata {
  if (!data || typeof data !== 'object') throw new Error('Animation metadata must be an object');
  if (data.schemaVersion !== 1 && data.schemaVersion !== '1') throw new Error('Invalid schemaVersion: expected 1');
  if (!data.clipId || typeof data.clipId !== 'string') throw new Error('Missing clipId');
  if (!data.source || typeof data.source !== 'string') throw new Error('Missing source path');
  if (!data.frameSize || typeof data.frameSize.width !== 'number' || typeof data.frameSize.height !== 'number') {
    throw new Error('Missing valid frameSize {width, height}');
  }
  if (!data.pivot || typeof data.pivot.x !== 'number' || typeof data.pivot.y !== 'number') {
    throw new Error('Missing valid pivot {x, y}');
  }
  if (typeof data.framesPerDirection !== 'number' || data.framesPerDirection <= 0) {
    throw new Error('Invalid framesPerDirection');
  }
  return data as AnimationMetadata;
}

export function validateEquipmentManifest(data: any): EquipmentManifest {
  if (!data || typeof data !== 'object') throw new Error('Equipment manifest must be an object');
  if (data.schemaVersion !== 1 && data.schemaVersion !== '1') throw new Error('Invalid schemaVersion: expected 1');
  if (!data.id || typeof data.id !== 'string') throw new Error('Missing equipment id');
  if (!data.slot || typeof data.slot !== 'string') throw new Error('Missing equipment slot');
  if (!data.layer || typeof data.layer !== 'string') throw new Error('Missing equipment layer category');
  if (!data.renderOrder || typeof data.renderOrder.south !== 'number' || typeof data.renderOrder.north !== 'number') {
    throw new Error('Missing directional renderOrder (must specify at least south and north)');
  }
  return data as EquipmentManifest;
}
