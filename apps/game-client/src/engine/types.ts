export type AnimState = 'idle' | 'walk' | 'run' | 'attack' | 'skill' | 'hurt' | 'death';
export type FacingDirection = 'south' | 'west' | 'east' | 'north';
export type EntityKind = 'player' | 'npc' | 'monster';

export type GroundTileId = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type MapObjectType =
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
  | 'pine_tree'
  | 'street_lantern'
  | 'village_bench'
  | 'wooden_barrel'
  | 'wooden_crate'
  | 'village_fence'
  | 'water_lilies'
  | 'bush_cluster'
  | 'boulder_rock';

export interface MapObjectDef {
  id: string;
  type: MapObjectType;
  tx: number;
  ty: number;
  wTiles: number;
  hTiles: number;
  collides: boolean;
  label?: string;
}

export interface MapExitDef {
  id: string;
  direction: FacingDirection | 'portal';
  portalType?: 'village' | 'regional' | 'sanctuary' | 'dungeon' | 'boss' | 'event';
  vfxProfile?: string;
  visualAsset?: string;
  interactionRadius?: number;
  name: string;
  targetRegion: string;
  requiredLevel: number;
  tx: number;
  ty: number;
  targetTx?: number;
  targetTy?: number;
  dungeonId?: string | null;
  requiresFloorClear?: number | null;
}

export interface NpcSpawnDef {
  id: string;
  name: string;
  role: string;
  district?: string;
  serviceType?: string;
  associatedBuildingId?: string;
  direction?: FacingDirection;
  interactionRadius?: number;
  movementBehavior?: 'stationary' | 'gentle_turn' | 'patrol_short';
  idleAnimation?: string;
  dialogueId?: string;
  spriteId: string;
  tx: number;
  ty: number;
  x?: number;
  y?: number;
  dialogue: string;
}

export interface MonsterSpawnDef {
  id: string;
  monsterId?: string;
  name: string;
  level: number;
  hp: number;
  expReward?: number;
  goldReward?: number;
  spriteId: string;
  visualFilter?: string;
  isBoss?: boolean;
  tx: number;
  ty: number;
}

export interface MapInteractableDef {
  id: string;
  type: 'fragment' | 'pillar' | 'boss_altar' | 'exit_portal';
  name: string;
  element?: string;
  tx: number;
  ty: number;
  x?: number;
  y?: number;
}

export interface BiomeVisualConfig {
  biomeId?: string;
  groundFilter?: string;
  ambientTint?: string;
  ambientAlpha?: number;
  particleType?: 'sakura' | 'fireflies' | 'embers' | 'sand' | 'void' | 'spores' | 'none';
}

export interface VillageMapData {
  id: string;
  name: string;
  subtitle: string;
  type?: string;
  cols: number;
  rows: number;
  tileSize: number;
  isSafeZone?: boolean;
  combatEnabled?: boolean;
  biomeTheme?: BiomeVisualConfig;
  ritualCircle?: { tx: number; ty: number; radiusPx: number };
  layers: {
    ground: GroundTileId[][];
    objects: MapObjectDef[];
    collision: (0 | 1)[][];
  };
  exits?: MapExitDef[];
  spawns: {
    player: { tx: number; ty: number; name: string; level: number };
    npcs: NpcSpawnDef[];
    monsters: MonsterSpawnDef[];
    interactables?: MapInteractableDef[];
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
  assetId: string;
  drawHeight: number;
  directionColumns: Record<FacingDirection, number>;
  equipmentLayers?: Partial<Record<EquipSlotKey | 'helm' | 'offhand', Record<string, string>>>;
  animations: Record<AnimState, AnimationClipMeta>;
}

export interface ArtworkAssetDef {
  id: string;
  path: string;
  category: string;
  dimensions: [number, number];
  transparency: boolean;
  loading: 'eager' | 'deferred' | 'lazy';
  animation?: { frames: number; fps: number };
}

export interface ArtworkPlacement {
  assetId: string;
  anchorX?: number;
  anchorY?: number;
  widthScale?: number;
  heightScale?: number;
  ground?: boolean;
}

export interface ArtworkManifest {
  schemaVersion: '2.0.0';
  artDirection: string;
  assets: ArtworkAssetDef[];
  terrain: Record<GroundTileId, string[]>;
  waterFrames: string[];
  transitions: {
    road: Record<FacingDirection, string>;
    water: Record<FacingDirection, string>;
    dirt?: Record<FacingDirection, string>;
    plaza?: Record<FacingDirection, string>;
  };
  objectTypes: Record<MapObjectType, ArtworkPlacement>;
  objectOverrides: Record<string, ArtworkPlacement>;
  decorations: string[];
  effects: { shadow: string; petal: string; destination: string; splash?: string; lilies?: string };
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
  classId?: string;
  tier?: 'starter' | 'basic' | 'passive' | 'advanced' | 'ultimate';
  skillType?: 'active' | 'passive' | 'buff' | 'ultimate';
  skillKind?: 'attack' | 'aoe' | 'buff' | 'heal' | 'shield' | 'debuff' | 'dot' | 'cleanse' | 'passive' | 'summon';
  targetType?: 'single' | 'aoe' | 'self' | 'directional' | 'ground' | 'ally' | 'passive' | 'enemy' | 'party';
  requiredLevel?: number;
  spCost?: number;
  skillLevel?: number;
  maxLevel?: number;
  vfxKey?: string;
  vfxId?: string;
  iconUrl?: string;
  advancedBranchId?: string;
  executionType?: string;
  areaRadius?: number;
  hitCount?: number;
  masteryPoints?: number;
  masteryRank?: string;
  evolutionTier?: number;
  evolutionMilestones?: any[];
  prerequisiteSkillIds?: string[];
  effects?: Array<{ kind: string; stat?: string; value?: number; durationSec?: number }>;
}

export interface QuestProgressState {
  id?: string;
  title: string;
  giver: string;
  description?: string;
  objective: string;
  targetSpriteId?: string;
  current: number;
  required: number;
  rewardGold?: number;
  rewardExp?: number;
  completed: boolean;
  claimed?: boolean;
}

export type ItemCategory = 'equip' | 'consumable' | 'material' | 'quest';
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
export type EquipSlotKey =
  | 'weapon'
  | 'head'
  | 'armor'
  | 'gloves'
  | 'boots'
  | 'shoulder'
  | 'necklace'
  | 'ring1'
  | 'ring2'
  | 'cloak';

export interface InventoryItemDef {
  id: string;
  name: string;
  category: ItemCategory;
  rarity: ItemRarity;
  iconKey: string;
  iconUrl?: string;
  qty: number;
  price?: number;
  equipSlot?: EquipSlotKey;
  weaponType?: string;
  allowedClasses?: string[];
  requiredLevel?: number;
  setId?: string;
  upgradeLevel?: number;
  maxUpgradeLevel?: number;
  isUnique?: boolean;
  isAccountBound?: boolean;
  isCharacterBound?: boolean;
  isLocked?: boolean;
  bound?: boolean;
  durability?: number;
  maxDurability?: number;
  passiveEffects?: Array<{ id: string; label?: string; description: string }>;
  acquisitionCondition?: string;
  atkBonus?: number;
  matkBonus?: number;
  defBonus?: number;
  mdefBonus?: number;
  hpBonus?: number;
  mpBonus?: number;
  critRate?: number;
  hpRestore?: number;
  mpRestore?: number;
  desc: string;
}

export interface PrimaryAttributesState {
  str: number;
  dex: number;
  agi: number;
  int: number;
  con: number;
}

export interface ActiveSetBonusSummary {
  setId: string;
  setName: string;
  equippedCount: number;
  activeTiers: Array<{ piecesRequired: number; description: string }>;
}

export interface BossHudState {
  runtimeId: string;
  monsterId: string;
  name: string;
  category: string;
  level: number;
  hp: number;
  maxHp: number;
  activePhase: number;
  enraged: boolean;
  portraitUrl?: string;
  telegraph?: { skillName: string; warningRadiusPx?: number; remainingMs?: number } | null;
}

export interface CraftingRecipeView {
  id: string;
  name: string;
  category: string;
  outputItemId: string;
  outputItemName?: string;
  outputRarity?: ItemRarity;
  outputQuantity: number;
  goldCost: number;
  requiredLevel: number;
  materials: Array<{ itemId: string; name?: string; quantity: number }>;
  description?: string;
}

export interface WorldQuestClientView {
  id: string;
  name: string;
  description: string;
  questType: 'MAIN_QUEST' | 'SIDE_QUEST' | 'HIDDEN_QUEST' | string;
  isHidden: boolean;
  chainId?: string;
  stepNumber?: number;
  requiredLevel: number;
  startNpcId: string;
  endNpcId: string;
  startNpcName?: string;
  endNpcName?: string;
  regionId: string;
  state: 'available' | 'active' | 'ready_to_claim' | 'completed' | 'unlocked_hidden';
  isTracked?: boolean;
  abandonable?: boolean;
  completedAt?: string;
  objectives: Array<{
    id: string;
    type: string;
    targetId: string;
    description: string;
    current: number;
    required: number;
  }>;
  rewards: {
    exp: number;
    gold: number;
    items?: Array<{ itemId: string; quantity: number }>;
    uniqueEquipmentIds?: string[];
    unlockTitleIds?: string[];
  };
}

export interface QuestChainClientView {
  id: string;
  name: string;
  description: string;
  questIds: string[];
  completedCount: number;
  totalCount: number;
  completed: boolean;
  currentQuestId?: string;
}

export interface TitleClientView {
  id: string;
  name: string;
  nameVi?: string;
  description: string;
  category: string;
  rarity: ItemRarity;
  unlocked: boolean;
  equippedCosmetic: boolean;
  unlockHint?: string;
  statBonuses: Record<string, number>;
}

export interface PlayerStatsSummary {
  atk: number;
  matk?: number;
  def: number;
  mdef?: number;
  critRate?: number;
  damageReductionPct?: number;
  gold: number;
  silver: number;
  exp: number;
  maxExp: number;
  potentialPoints: number;
  skillPoints?: number;
  attributes: PrimaryAttributesState;
  activeSetBonuses?: ActiveSetBonusSummary[];
  equippedCosmeticTitleId?: string | null;
  equippedCosmeticTitleName?: string | null;
  unlockedTitleCount?: number;
  uniqueEquippedCount?: number;
  critDamageMultiplierPct?: number;
  aspdPct?: number;
  cooldownReductionPct?: number;
  moveSpeedPct?: number;
  evasionPct?: number;
  accuracy?: number;
  armorPenetrationPct?: number;
  magicPenetrationPct?: number;
  healingBonusPct?: number;
  lifestealPct?: number;
  statusResistancePct?: number;
  effectiveHp?: number;
  breakdowns?: Record<string, any>;
  warningsVi?: string[];
  jobAffinity?: any;
  passivePointsSummary?: { earned: number; spent: number; available: number; masteryBonusPoints: number };
  activePassives?: any[];
}
