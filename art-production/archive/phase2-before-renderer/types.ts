export type AnimState = 'idle' | 'walk' | 'attack';
export type EntityKind = 'player' | 'npc' | 'monster';

export type GroundTileId = 0 | 1 | 2 | 3 | 4;

export interface MapObjectDef {
  id: string;
  type:
    | 'torii_gate'
    | 'torii_shrine'
    | 'plaza_tree_fountain'
    | 'cave_entrance'
    | 'village_house_a'
    | 'village_house_b'
    | 'village_shop'
    | 'market_stall_striped'
    | 'market_stall_blue'
    | 'training_dummy'
    | 'wooden_bridge'
    | 'waterwheel_mill'
    | 'treasure_chest'
    | 'sakura_tree'
    | 'maple_tree'
    | 'pine_tree';
  tx: number;
  ty: number;
  wTiles: number;
  hTiles: number;
  collides: boolean;
  label?: string;
}

export interface NpcSpawnDef {
  id: string;
  name: string;
  role: string;
  spriteId: string;
  tx: number;
  ty: number;
  dialogue: string;
}

export interface MonsterSpawnDef {
  id: string;
  name: string;
  level: number;
  hp: number;
  spriteId: string;
  tx: number;
  ty: number;
}

export interface VillageMapData {
  id: string;
  name: string;
  subtitle: string;
  cols: number;
  rows: number;
  tileSize: number;
  layers: {
    ground: GroundTileId[][];
    objects: MapObjectDef[];
    collision: (0 | 1)[][];
  };
  spawns: {
    player: { tx: number; ty: number; name: string; level: number };
    npcs: NpcSpawnDef[];
    monsters: MonsterSpawnDef[];
  };
}

export interface AnimationClipMeta {
  row: number;
  frames: number;
  fps: number;
  loop: boolean;
}

export interface SpriteSheetMeta {
  frameWidth: number;
  frameHeight: number;
  anchorX: number;
  anchorY: number;
  spriteSheetUrl: string | null;
  animations: Record<AnimState, AnimationClipMeta>;
}

export interface SpriteRegistryDoc {
  schemaVersion: string;
  sheets: Record<string, SpriteSheetMeta>;
}

export interface TilePoint {
  tx: number;
  ty: number;
}

export interface WorldPoint {
  x: number;
  y: number;
}

export interface SkillSlotDef {
  id: string;
  key: string;
  name: string;
  desc: string;
  mpCost: number;
  cooldownSec: number;
  rangePx: number;
  damage: number;
  iconKey: string;
  color: string;
  locked?: boolean;
}

export interface QuestProgressState {
  title: string;
  giver: string;
  objective: string;
  current: number;
  required: number;
  completed: boolean;
}

export type ItemCategory = 'equip' | 'consumable' | 'material';
export type ItemRarity = 'common' | 'rare' | 'epic';
export type EquipSlotKey = 'weapon' | 'offhand' | 'helm' | 'armor' | 'gloves' | 'boots';

export interface InventoryItemDef {
  id: string;
  name: string;
  category: ItemCategory;
  rarity: ItemRarity;
  iconKey: string;
  qty: number;
  equipSlot?: EquipSlotKey;
  atkBonus?: number;
  defBonus?: number;
  hpRestore?: number;
  mpRestore?: number;
  desc: string;
}

export interface PlayerStatsSummary {
  atk: number;
  def: number;
  gold: number;
  silver: number;
}
