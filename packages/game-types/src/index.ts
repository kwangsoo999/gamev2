// ==========================================
// ELYSIA NO DENSETSU – MASTER GAME TYPES
// ==========================================

import type {
  AdvancedJobId,
  SkillEvolutionMilestone,
  SkillExecutionType,
  SkillMasteryConfig,
  SkillMasteryProgress,
  SkillStatusEffectSpec,
} from './evolution.js';

import type {
  PassivePointTransaction,
} from './passives.js';

export * from './evolution.js';
export * from './passives.js';

export type ClassId =
  | 'adventurer'
  | 'novice'
  | 'swordsman'
  | 'spearman'
  | 'knight'
  | 'monk'
  | 'priest'
  | 'mage'
  | 'assassin'
  | 'fighter'
  | 'archer';

export type AttributeKey = keyof PrimaryAttributes;

export type Gender = 'male' | 'female';

export type ElementType =
  | 'neutral'
  | 'physical'
  | 'fire'
  | 'water'
  | 'ice'
  | 'earth'
  | 'wind'
  | 'lightning'
  | 'arcane'
  | 'nature'
  | 'holy'
  | 'shadow';

export type ContentStatus =
  | 'draft'
  | 'testing'
  | 'published'
  | 'archived'
  | 'DRAFT'
  | 'TESTING'
  | 'PUBLISHED'
  | 'ARCHIVED';

export type ItemRarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary'
  | 'mythic';

export type ItemCategory =
  | 'equipment'
  | 'weapon'
  | 'armor'
  | 'accessory'
  | 'consumable'
  | 'potion'
  | 'material'
  | 'quest_item'
  | string;

export type EquipmentSlotId =
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

export type WeaponType =
  | 'sword'
  | 'greatsword'
  | 'shield'
  | 'spear'
  | 'halberd'
  | 'lance'
  | 'staff'
  | 'holy_staff'
  | 'spellbook'
  | 'book'
  | 'dual_daggers'
  | 'dagger'
  | 'gauntlets'
  | 'fist'
  | 'bow'
  | 'crossbow'
  | string;

export interface PrimaryAttributes {
  str: number;
  dex: number;
  agi: number;
  int: number;
  con: number;
}

export interface SecondaryStats {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  atk: number;
  matk: number;
  def: number;
  mdef: number;
  hit: number;
  flee: number;
  crit: number;
  aspd: number;
  moveSpeed: number;
  accuracy?: number;
  resistance?: number;
}

export interface CharacterAppearance {
  gender?: Gender;
  faceId?: string;
  hairstyleId: string;
  hairColor: string;
  eyeColor: string;
  skinTone?: string;
  outfitId?: string;
  costumeId?: string;
}

export interface CharacterEntity {
  id: string;
  userId?: string;
  name: string;
  gender: Gender;
  classId: ClassId;
  jobAdvancementCompleted?: boolean;
  evolutionTier?: number;
  sanctumCompleted?: boolean;
  availableAttributePoints?: number;
  unspentStatPoints?: number;
  completedQuests?: string[];
  completedQuestHistory?: Record<string, { completedAt: string; rewards?: any }>;
  activeQuests?: Record<string, ActiveQuestProgress>;
  trackedQuestId?: string | null;
  discoveredHiddenQuests?: string[];
  questChainProgress?: Record<string, QuestChainProgressState>;
  visitedMaps?: string[];
  monsterKillCounts?: Record<string, number>;
  dialogueFlags?: string[];
  ownedUniqueEquipmentIds?: string[];
  unlockedTitles?: string[];
  equippedCosmeticTitleId?: string | null;
  claimedRewardKeys?: string[];
  cachedTitleBonuses?: TitleBonusSummary;
  unlockedSkills?: string[];
  skillPoints?: number;
  skillLevels?: Record<string, number>;
  skillMastery?: Record<string, SkillMasteryProgress>;
  passiveAllocations?: Record<string, number>;
  passivePoints?: number;
  passivePointsSpent?: number;
  passiveTransactions?: PassivePointTransaction[];
  passiveRespecCount?: number;
  pityCounters?: Record<string, number>;
  temporaryBuffs?: Record<string, any>;
  activeBuffs?: Record<string, any>;
  craftingHistory?: string[];
  awakeningResult?: AwakeningResult;
  secondJobId?: string;
  secondJobName?: string;
  advancedJobId?: AdvancedJobId;
  advancedJobName?: string;
  advancedJobChangedAt?: string;
  allocatedStats?: PrimaryAttributes;
  jobChangedAt?: string;
  lastLoginAt?: string;
  isOnline?: boolean;
  guildId?: string | null;
  guildRankId?: string | null;
  merchantAssocId?: string | null;
  merchantRankId?: string | null;
  unlockedProfessionSlots?: number;
  professions?: Record<string, PlayerProfessionProgress>;
  farmPlots?: FarmPlotState[];
  professionDailyStats?: {
    dateKey: string;
    gatherActions: number;
    craftActions: number;
    questsCompleted: string[];
  };
  saveVersion?: number;
  lastSavedAt?: string;
  discoveredVillageIds?: string[];
  latestVillageCheckpointId?: string;
  preferredResurrectionVillageId?: string;
  checkpointUpdatedAt?: string;
  deathPenalty?: DeathPenaltyState | null;
  deathCount?: number;
  autoCombatConfig?: AutoCombatConfig;
  equipmentUpgradeLevels?: Record<string, number>;
  thirdJobId?: string;
  level: number;
  exp: number;
  gold: number;
  hp?: number;
  maxHp?: number;
  mp?: number;
  maxMp?: number;
  baseStats: PrimaryAttributes;
  initialAttributes?: PrimaryAttributes;
  initialAttributesGeneratedAt?: string;
  isSitting?: boolean;
  attributes: PrimaryAttributes;
  stats?: PrimaryAttributes;
  appearance: CharacterAppearance;
  equipment?: Record<string, string>;
  inventory?: any[];
  regionId?: string;
  x?: number;
  y?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface WeaponPaperdollConfig {
  scale?: number;
  offsetX?: number;
  offsetY?: number;
  rotationDeg?: number;
  rotation?: number;
  zIndexOrder?: number;
  anchorX?: number;
  anchorY?: number;
}

export interface ItemEntity {
  id: string;
  itemId: string;
  internalName?: string;
  name: string;
  description?: string;
  itemType?: ItemCategory;
  category: string | ItemCategory;
  subcategory?: string;
  itemSubtype?: string;
  rarity: ItemRarity;
  requiredLevel: number;
  equipSlot?: EquipmentSlotId | string;
  setId?: string;
  element?: ElementType;
  upgradeLevel?: number;
  maxUpgradeLevel?: number;
  bonusAttributes?: Record<string, number>;
  dropSources?: string[];
  fragmentConfig?: SetFragmentConfig;
  icon?: string;
  image?: string;
  primaryAssetUrl?: string;
  inventoryAssetUrl?: string;
  iconAssetUrl?: string;
  groundAssetUrl?: string;
  stackable?: boolean;
  stackLimit?: number;
  maxStack?: number;
  weight?: number;
  sellPrice: number;
  buyPrice: number;
  equipmentStats?: Record<string, number>;
  properties?: Record<string, any>;
  effects?: Record<string, any>;
  usable?: boolean;
  tradable?: boolean;
  isTradable?: boolean;
  isDroppable?: boolean;
  isSellable?: boolean;
  isCharacterBound?: boolean;
  isAccountBound?: boolean;
  enabled?: boolean;
  status?: ContentStatus;
  allowedClasses?: (ClassId | 'any')[];
  requiredClasses?: (ClassId | 'any')[];
  createdAt?: string;
  updatedAt?: string;
}

export interface WeaponEntity extends ItemEntity {
  weaponType: WeaponType;
  element: ElementType;
  minAtk?: number;
  maxAtk?: number;
  attackPower?: number;
  magicAttackPower?: number;
  attackSpeed?: number;
  attackRange?: number;
  hit?: number;
  critRate?: number;
  criticalRate?: number;
  criticalDamage?: number;
  elementalBonus?: number;
  physicalBonus?: number;
  magicalBonus?: number;
  requirements?: any;
  durability?: number;
  maxDurability?: number;
  paperdollConfig?: WeaponPaperdollConfig;
  twoHanded?: boolean;
  item: ItemEntity;
  weaponId: string;
  spriteAssetUrl?: string;
  refinementLevel?: number;
  upgradeConfig?: any;
}

export interface SkillVfxObject {
  thumbnail?: string;
  spriteSheet?: string;
  key?: string;
  totalFrames?: number;
  fps?: number;
  frameWidth?: number;
  frameHeight?: number;
  pivot?: [number, number];
  pivotNorm?: [number, number];
  scale?: number;
}

export type SkillTier = 'starter' | 'basic' | 'passive' | 'advanced' | 'ultimate';
export type SkillKind = 'active' | 'passive' | 'ultimate';

export interface SkillScalingAttr {
  attr: AttributeKey | 'atk' | 'matk' | 'def' | 'maxHp' | 'con';
  ratio: number;
}

export interface SkillStatusEffect {
  id: string;
  kind: 'buff' | 'debuff' | 'hot' | 'dot' | 'shield' | 'stun' | 'taunt' | 'cleanse' | 'summon';
  stat?: string;
  valuePct?: number;
  flatValue?: number;
  durationSec: number;
  tickIntervalSec?: number;
  targetScope: 'self' | 'ally' | 'party' | 'enemy' | 'aoe_enemies';
  description: string;
}

export interface SkillHitboxConfig {
  shape: 'arc' | 'circle' | 'box';
  widthPx: number;
  lengthPx: number;
  angleDeg?: number;
}

export interface SkillProjectileConfig {
  speedPxPerSec: number;
  radiusPx: number;
  trailColor: string;
  explosionRadiusPx: number;
}

export interface SkillUpgradeLevelRow {
  level: number;
  damageRatio: number;
  manaCost: number;
  cooldown: number;
}

export interface SkillDefinition {
  id: string;
  skillId?: string;
  name: string;
  nameVi: string;
  description: string;
  classId: ClassId;
  jobRestriction?: ClassId;
  jobRequirement?: ClassId;
  tier?: SkillTier;
  skillType?: SkillKind;
  requiredLevel: number;
  levelRequirement?: number;
  hotkey?: string;
  spCost?: number;
  skillPointCost?: number;
  maxLevel?: number;
  mpCost?: number;
  manaCost?: number;
  cooldown: number;
  cooldownSeconds?: number;
  castTime: number;
  range: number;
  targetType: 'single' | 'aoe' | 'self' | 'directional' | 'ground' | 'ally' | 'passive';
  damageType?: 'physical' | 'magic';
  damageMultiplier: number;
  damageRatio?: number;
  healMultiplier?: number;
  basePower?: number;
  damageFormula?: string;
  scalingAttributes?: SkillScalingAttr[];
  effects?: SkillStatusEffect[];
  prerequisiteSkillIds?: string[];
  element: ElementType;
  icon: string;
  iconUrl?: string;
  animationRef?: 'attack' | 'skill';
  animation?: string;
  vfxKey?: string;
  vfxUrl?: string;
  sfx?: string;
  soundRef?: string;
  vfx?: string | SkillVfxObject | any;
  hitbox?: SkillHitboxConfig;
  projectile?: SkillProjectileConfig;
  statusEffect?: string | null;
  upgradeLevels?: SkillUpgradeLevelRow[];
  upgradeScaling?: {
    powerPerLevelPct: number;
    mpCostPerLevel: number;
    cooldownReductionPerLevelSec?: number;
  };
  executionType?: SkillExecutionType;
  targetLimit?: number;
  baseDamage?: number;
  damageScaling?: number;
  attackPowerCoefficient?: number;
  magicPowerCoefficient?: number;
  hitCount?: number;
  areaRadius?: number;
  castTimeMs?: number;
  statusEffectSpecs?: SkillStatusEffectSpec[];
  animationId?: string;
  vfxId?: string;
  advancedBranchId?: AdvancedJobId;
  masteryConfig?: SkillMasteryConfig;
  evolutionMilestones?: SkillEvolutionMilestone[];
  pveModifier?: number;
  pvpModifier?: number;
  bossModifier?: number;
  animationMetadata?: SkillAnimationMetadata;
  status?: ContentStatus;
  updatedAt?: string;
}

export interface ClassStarterEquipment {
  weaponItemId: string;
  armorItemId: string;
}

export interface ClassClassificationMultiplier {
  primary: number;
  secondary: number;
}

export interface ClassDefinition {
  id: ClassId;
  name: string;
  nameVi?: string;
  role: string;
  description: string;
  isPreJob?: boolean;
  primaryAttribute?: AttributeKey;
  secondaryAttribute?: AttributeKey;
  classificationMultiplier?: ClassClassificationMultiplier;
  priorityRank?: number;
  baseStats: PrimaryAttributes;
  weaponProficiency?: WeaponType[];
  allowedWeapons: string[];
  armorProficiency?: string[];
  startingSkills: string[];
  starterEquipment?: ClassStarterEquipment;
  artworkUrl?: string;
  weaponArtworkUrl?: string;
  status?: ContentStatus;
  updatedAt?: string;
}

export interface HealthServiceStatus {
  status: string;
  message: string;
  latencyMs?: number;
}

export interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  game: string;
  version: string;
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  services: {
    server: HealthServiceStatus;
    database: HealthServiceStatus;
    redis: HealthServiceStatus;
    [key: string]: HealthServiceStatus;
  };
}

// ==========================================
// PHASE 3 WORLD EXPANSION & DUNGEON TYPES
// ==========================================

export type FirstJobClassId =
  | 'swordsman'
  | 'spearman'
  | 'knight'
  | 'monk'
  | 'mage'
  | 'assassin'
  | 'fighter'
  | 'archer';

export interface JobScoreBreakdown {
  classId: FirstJobClassId;
  className: string;
  primaryAttribute: AttributeKey;
  secondaryAttribute: AttributeKey;
  primaryValue: number;
  secondaryValue: number;
  primaryMultiplier: number;
  secondaryMultiplier: number;
  score: number;
  priorityRank: number;
}

export interface AwakeningResult {
  characterId: string;
  characterName: string;
  assignedClassId: FirstJobClassId;
  assignedClassName: string;
  assignedClassRole: string;
  baseStatsSnapshot: PrimaryAttributes;
  jobScores: JobScoreBreakdown[];
  unlockedSkills: { id: string; name: string; nameVi: string; description: string; element: ElementType }[];
  grantedEquipment: {
    weapon: { itemId: string; name: string; atkBonus?: number; weaponType?: string };
    armor: { itemId: string; name: string; defBonus?: number };
  };
  artworkUrl: string;
  weaponArtworkUrl: string;
  awakenedAt: string;
}

export type WorldZoneCategory =
  | 'SAFE_ZONE'
  | 'CITY_SAFE_ZONE'
  | 'BEGINNER_FIELD'
  | 'EXP_FIELD'
  | 'DUNGEON_FLOOR';

export interface BiomeVisualTheme {
  biomeId: string;
  groundFilter?: string;
  ambientTint?: string;
  ambientAlpha?: number;
  particleType?: 'sakura' | 'fireflies' | 'embers' | 'sand' | 'void' | 'spores' | 'none';
  musicTheme?: string;
}

export interface MapPortalDefinition {
  id: string;
  name: string;
  fromRegionId: string;
  toRegionId: string;
  portalX: number;
  portalY: number;
  targetX: number;
  targetY: number;
  requiredLevel: number;
  enabled: boolean;
  bidirectional?: boolean;
  direction?: 'north' | 'south' | 'east' | 'west' | 'portal';
}

export interface MapDefinition {
  id: string;
  name: string;
  nameEn?: string;
  nameJp?: string;
  subtitle?: string;
  description: string;
  type: WorldZoneCategory;
  hubId?: string;
  distanceTier?: number;
  recommendedLevelMin: number;
  recommendedLevelMax: number;
  requiredLevel?: number;
  isSafeZone: boolean;
  combatEnabled: boolean;
  monsterSpawningEnabled: boolean;
  clientMapFile?: string;
  biomeTheme?: BiomeVisualTheme;
  dimensions?: { width: number; height: number; tileSize?: number; cols?: number; rows?: number };
  minimapImage?: string;
  bgmTrack?: string;
  background?: string;
  tileset?: string;
  spawnCoordinates?: { x: number; y: number; tx?: number; ty?: number };
  connectedMaps?: string[];
  teleportGates?: Array<{ id: string; name: string; tx: number; ty: number; x: number; y: number; targetRegionId?: string; requiredLevel?: number }>;
  monsterSpawnZoneIds?: string[];
  version?: number;
  status?: ContentStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface CityServiceFacility {
  id: string;
  type:
    | 'equipment_shop'
    | 'item_shop'
    | 'job_advancement'
    | 'guild_hq'
    | 'storage'
    | 'teleport'
    | 'quest_hq'
    | 'crafting'
    | 'enchantment'
    | 'blacksmith'
    | 'dragon_research';
  label: string;
  npcId: string;
}

export interface CityDefinition {
  id: string;
  name: string;
  regionHub: string;
  description: string;
  recommendedLevelMin: number;
  recommendedLevelMax: number;
  requiredLevel: number;
  isSafeZone: true;
  combatEnabled: false;
  monsterSpawningEnabled: false;
  spawnCoords: { x: number; y: number };
  connectedMapIds: string[];
  services: CityServiceFacility[];
  npcs: string[];
  clientMapFile: string;
  status?: ContentStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface MonsterSpawnCoordinate {
  x: number;
  y: number;
  tx?: number;
  ty?: number;
  radius?: number;
  count: number;
}

export type MonsterCategory = 'NORMAL' | 'ELITE' | 'MINI_BOSS' | 'FIELD_BOSS' | 'WORLD_BOSS';

export interface MonsterDefinition {
  id: string;
  name: string;
  nameVi?: string;
  internalName: string;
  description?: string;
  category?: MonsterCategory;
  regionId: string;
  levelMin: number;
  levelMax: number;
  hp: number;
  mp: number;
  physicalAttack: number;
  physicalDefense: number;
  magicalAttack: number;
  magicalDefense: number;
  agi: number;
  movementSpeed: number;
  attackRange: number;
  aggroRange?: number;
  detectionRange?: number;
  attackSpeed?: number;
  expReward: number;
  goldReward: number;
  element: ElementType;
  monsterType: string;
  aiBehavior: 'passive' | 'territorial' | 'aggressive' | 'ranged' | 'boss';
  spawnCoordinates: MonsterSpawnCoordinate[];
  spawnZoneIds?: string[];
  spawnCount: number;
  maxAlive?: number;
  respawnTimeSeconds: number;
  dropTableId: string;
  spriteAsset: string;
  spriteId?: string;
  portraitUrl?: string;
  visualFilter?: string;
  animationAssets?: Record<string, string>;
  skills?: string[];
  bossConfig?: BossEncounterConfig;
  lootConfig?: {
    guaranteedGoldMin?: number;
    guaranteedGoldMax?: number;
    rareDropBonusPct?: number;
  };
  deathAnimation?: string;
  telegraphColor?: string;
  isBoss?: boolean;
  isElite?: boolean;
  version?: number;
  status?: ContentStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface SpawnZoneDefinition {
  id: string;
  regionId: string;
  monsterId: string;
  name?: string;
  zoneTier?: 'entrance' | 'mid' | 'deep' | 'boss';
  x: number;
  y: number;
  tx?: number;
  ty?: number;
  radius: number;
  maxAlive: number;
  respawnTime: number;
  levelMin: number;
  levelMax: number;
  enabled: boolean;
  version?: number;
  status?: ContentStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExpLevelPenaltyConfig {
  graceLevelDiff: number;
  penaltyPerLevelPct: number;
  minExpFloorPct: number;
  higherLevelBonusPerLvPct: number;
  maxHigherLevelBonusPct: number;
}

export interface ExpBalanceConfig {
  enabled?: boolean;
  expMultiplier: number;
  globalMonsterExpMultiplier?: number;
  beginnerAreaMultiplier?: number;
  eastGateMultiplier?: number;
  westGateMultiplier?: number;
  southGateMultiplier?: number;
  northGateMultiplier?: number;
  bossMultiplier?: number;
  eliteMonsterMultiplier?: number;
  partyExpMultiplier?: number;
  eventExpMultiplier?: number;
  levelDifferenceMultiplier?: number;
  goldMultiplier: number;
  dropRateMultiplier: number;
  levelPenalty: ExpLevelPenaltyConfig;
  updatedAt?: string;
}

export interface VersionRecord {
  version: number;
  timestamp: string;
  note: string;
  snapshot: Record<string, any>;
}

export interface DropEntry {
  itemId: string;
  itemName?: string;
  dropRate: number;
  minQuantity: number;
  maxQuantity: number;
  requiredPlayerLevel?: number;
  firstClearOnly?: boolean;
  isGuaranteed?: boolean;
  isBossExclusive?: boolean;
  classCompatibleOnly?: boolean;
  lootType?: 'material' | 'equipment' | 'fragment' | 'consumable';
  rarity?: ItemRarity;
  pityWeight?: number;
}

export interface DropTableDefinition {
  tableId: string;
  monsterId: string;
  lootMode?: 'PERSONAL' | 'PARTY_ROLL' | 'CONTRIBUTION_WEIGHTED';
  pityThresholdKills?: number;
  pityFragmentItemId?: string;
  pityFragmentQuantity?: number;
  drops: DropEntry[];
  status?: ContentStatus;
  updatedAt?: string;
}

export interface ExpTableEntry {
  level: number;
  expRequired: number;
  cumulativeExp: number;
  recommendedRegion: string;
  milestoneReward?: string;
}

export interface DungeonInteractableDef {
  id: string;
  type: 'fragment' | 'pillar' | 'boss_altar' | 'exit_portal';
  name: string;
  element?: ElementType;
  tx: number;
  ty: number;
  x: number;
  y: number;
}

export interface DungeonFloorDefinition {
  floorNumber: number;
  id: string;
  name: string;
  description: string;
  objectiveType: 'COLLECT_FRAGMENTS' | 'ACTIVATE_PILLARS' | 'DEFEAT_BOSS';
  requiredCount: number;
  objectiveDescription: string;
  clientMapFile: string;
  spawnCoords: { x: number; y: number };
  interactables: DungeonInteractableDef[];
  monsterIds: string[];
  bossId?: string;
}

export interface DungeonDefinition {
  id: string;
  name: string;
  subtitle?: string;
  description: string;
  purpose: string;
  requiredLevel: number;
  entryModes: ('solo' | 'party')[];
  entryRegionIds: string[];
  exitRegionId: string;
  exitCoords: { x: number; y: number };
  rewardItemId: string;
  rewardQuestId: string;
  allowRewardRepeat: boolean;
  floors: DungeonFloorDefinition[];
  status?: ContentStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface DungeonInstanceState {
  instanceId: string;
  dungeonId: string;
  ownerCharacterId: string;
  partyId?: string;
  partyMemberIds: string[];
  mode: 'solo' | 'party';
  currentFloor: number;
  collectedFragments: string[];
  activatedPillars: string[];
  bossDefeated: boolean;
  bossHp: number;
  bossMaxHp: number;
  rewardClaimed: boolean;
  completed: boolean;
  status: 'active' | 'completed' | 'abandoned';
  enteredAt: string;
  completedAt?: string;
}

export type QuestStatusState =
  | 'LOCKED'
  | 'AVAILABLE'
  | 'ACTIVE'
  | 'READY_TO_COMPLETE'
  | 'COMPLETED'
  | 'HIDDEN'
  | 'UNLOCKED_HIDDEN';

export interface QuestObjectiveDefinition {
  id: string;
  type:
    | 'REACH_LEVEL'
    | 'TALK_NPC'
    | 'TALK_TO_NPC'
    | 'NPC_DIALOGUE'
    | 'ENTER_DUNGEON'
    | 'EXPLORE_MAP'
    | 'VISIT_LOCATION'
    | 'COLLECT_FRAGMENT'
    | 'ACTIVATE_PILLAR'
    | 'KILL_MONSTER'
    | 'DEFEAT_BOSS'
    | 'COLLECT_ITEM'
    | 'USE_ITEM'
    | 'EQUIP_ITEM'
    | 'COMPLETE_QUEST'
    | 'INTERACT_OBJECT'
    | 'CHOOSE_JOB'
    | 'AUTOMATIC_AWAKENING';
  targetId: string;
  targetName?: string;
  dialogueKeyword?: string;
  requiredCount: number;
  description: string;
}

export interface HiddenQuestTriggerDefinition {
  type:
    | 'NPC_DIALOGUE'
    | 'ENTER_MAP'
    | 'KILL_MONSTER'
    | 'OBTAIN_ITEM'
    | 'LEVEL_AND_QUEST'
    | 'COMBINATION'
    | 'EQUIP_ITEM'
    | 'USE_ITEM'
    | 'INTERACT_OBJECT';
  targetId?: string;
  dialogueKeyword?: string;
  minLevel?: number;
  requiredCompletedQuestIds?: string[];
  hint?: string;
}

export interface QuestDefinition {
  id: string;
  chainId?: string;
  stepNumber?: number;
  chainNextQuestId?: string;
  name: string;
  description: string;
  questType: 'MAIN_QUEST' | 'JOB_ADVANCEMENT' | 'SIDE_QUEST' | 'HIDDEN_QUEST' | 'DAILY_QUEST';
  isHidden?: boolean;
  hiddenTrigger?: HiddenQuestTriggerDefinition;
  requiredLevel: number;
  prerequisiteQuestIds: string[];
  requiredItemIds?: string[];
  requiredTitleIds?: string[];
  startNpcId: string;
  endNpcId: string;
  regionId: string;
  objectives: QuestObjectiveDefinition[];
  rewards: {
    exp: number;
    gold: number;
    items: { itemId: string; quantity: number }[];
    uniqueEquipmentIds?: string[];
    unlockTitleIds?: string[];
    unlockFeature?: string;
  };
  repeatable: boolean;
  abandonable?: boolean;
  status?: ContentStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface QuestChainDefinition {
  id: string;
  name: string;
  description: string;
  requiredLevel: number;
  quests: string[];
  completionRewards?: {
    exp?: number;
    gold?: number;
    uniqueEquipmentIds?: string[];
    unlockTitleIds?: string[];
  };
  status?: ContentStatus;
  updatedAt?: string;
}

export interface ActiveQuestProgress {
  questId: string;
  startedAt: string;
  objectives: Record<string, number>;
  completed: boolean;
  hiddenDiscovered?: boolean;
}

export interface QuestChainProgressState {
  chainId: string;
  currentStep: number;
  completedSteps: string[];
  completed: boolean;
}

export interface UniqueEquipmentPassiveEffect {
  id: string;
  kind: 'flat_stat' | 'pct_stat' | 'combat_proc' | 'utility';
  stat: string;
  valueFlat?: number;
  valuePct?: number;
  trigger?: string;
  description: string;
}

export interface UniqueEquipmentDefinition extends ItemEntity {
  isUnique: true;
  nonRepeatable: true;
  upgradeable?: boolean;
  upgradeScalingPerLevelPct?: number;
  acquisitionConditions: {
    questId?: string;
    hiddenQuestId?: string;
    bossId?: string;
    requiredTitleId?: string;
    requiredLevel?: number;
    accountUnique?: boolean;
    characterUnique?: boolean;
    description: string;
  };
  passiveEffects: UniqueEquipmentPassiveEffect[];
}

export interface TitleStatBonuses {
  atk?: number;
  matk?: number;
  def?: number;
  mdef?: number;
  maxHp?: number;
  maxMp?: number;
  str?: number;
  dex?: number;
  agi?: number;
  int?: number;
  con?: number;
  critRatePct?: number;
  atkPct?: number;
  matkPct?: number;
  defPct?: number;
  mdefPct?: number;
  hpPct?: number;
  mpPct?: number;
  skillDamagePct?: number;
  critDamagePct?: number;
  damageReductionPct?: number;
  healingPowerPct?: number;
  moveSpeedPct?: number;
  expBonusPct?: number;
  goldBonusPct?: number;
}

export interface TitleBonusLimits {
  maxFlatAtk: number;
  maxFlatMatk: number;
  maxFlatDef: number;
  maxFlatMdef: number;
  maxFlatMaxHp: number;
  maxFlatMaxMp: number;
  maxFlatPrimaryAttr: number;
  maxFlatCritRatePct: number;
  maxPctAtk: number;
  maxPctMatk: number;
  maxPctDef: number;
  maxPctHp: number;
  maxPctMp: number;
  maxPctSkillDamage: number;
  maxPctCritDamage: number;
  maxPctDamageReduction: number;
  maxPctHealingPower: number;
  maxPctMoveSpeed: number;
  maxPctExpBonus: number;
  maxPctGoldBonus: number;
}

export interface TitleDefinition {
  id: string;
  name: string;
  nameVi?: string;
  displayPrefix: string;
  colorHex: string;
  description: string;
  category: 'quest' | 'hidden_quest' | 'boss' | 'combat' | 'exploration' | 'collection';
  isCosmeticOnlyOnEquip: true;
  nonRepeatable: true;
  unlockConditions: {
    questIds?: string[];
    completedChainIds?: string[];
    killedMonsterIds?: Record<string, number>;
    visitedMapIds?: string[];
    ownedUniqueItemIds?: string[];
    minLevel?: number;
  };
  statBonuses: TitleStatBonuses;
  status?: ContentStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface TitleBonusSummary {
  unlockedTitleIds: string[];
  equippedCosmeticTitleId: string | null;
  uncappedTotals: Required<TitleStatBonuses>;
  cappedTotals: Required<TitleStatBonuses>;
  limitsApplied: TitleBonusLimits;
  recalculatedAt: string;
}

export interface ClassEvolutionStage {
  tier: 0 | 1 | 2 | 3 | 4;
  stageName: string;
  requiredLevel: number;
  requiresDungeon?: string;
  requiresQuest?: string;
  titlesByClass: Record<string, string>;
  statBonusPct: number;
  unlockedSkillTier: number;
}

export interface JobAdvancementResult {
  success: boolean;
  characterId: string;
  previousClassId: ClassId;
  newClassId: FirstJobClassId;
  evolutionTier: number;
  alreadyCompleted?: boolean;
  unlockedSkills: string[];
  grantedItems: { itemId: string; name: string; quantity: number }[];
  awakeningResult?: AwakeningResult;
  ritualVfxId?: string;
  performedByNpcId?: string;
  message: string;
}

// ==========================================
// PHASE 4: SKILLS, EQUIPMENT SETS, BOSSES, LOOT & CRAFTING
// ==========================================

export interface RarityTierConfig {
  rarity: ItemRarity;
  label: string;
  labelVi: string;
  colorHex: string;
  borderHex: string;
  bgHex: string;
  statMultiplier: number;
  minBonusLines: number;
  maxBonusLines: number;
  maxUpgradeLevel: number;
}

export interface SetBonusStats {
  atk?: number;
  matk?: number;
  def?: number;
  mdef?: number;
  maxHp?: number;
  maxMp?: number;
  critRatePct?: number;
  critDamagePct?: number;
  aspdPct?: number;
  moveSpeedPct?: number;
  skillDamagePct?: number;
  healingPowerPct?: number;
  damageReductionPct?: number;
  lifestealPct?: number;
  allStats?: number;
  str?: number;
  dex?: number;
  agi?: number;
  int?: number;
  con?: number;
}

export interface SetBonusTier {
  requiredPieces: 2 | 4 | 6;
  summary: string;
  bonuses: SetBonusStats;
}

export interface EquipmentSetDefinition {
  id: string;
  name: string;
  nameVi?: string;
  description: string;
  classId: ClassId | 'any';
  tierLevel: number;
  rarity: ItemRarity;
  category: 'class_set' | 'boss_set';
  pieceItemIds: string[];
  bonusTiers: SetBonusTier[];
  fragmentItemId?: string;
  sourceBossIds?: string[];
  previewImageUrl?: string;
  status?: ContentStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface SetFragmentConfig {
  fragmentItemId: string;
  name: string;
  setId: string;
  targetItemIds: string[];
  targetCategory: string;
  sourceBossIds: string[];
  requiredQuantity: number;
  goldCost: number;
  description?: string;
}

export interface CraftingRecipe {
  id: string;
  name: string;
  category: 'fragment_exchange' | 'boss_craft' | 'set_upgrade';
  outputItemId: string;
  outputQuantity: number;
  setId?: string;
  allowedClasses?: ClassId[];
  goldCost: number;
  materials: { itemId: string; quantity: number }[];
  requiredLevel: number;
  npcIds?: string[];
  status?: ContentStatus;
  updatedAt?: string;
}

export interface BossSkillPhase {
  phase: number;
  name: string;
  hpThresholdPct: number;
  atkMultiplier?: number;
  speedMultiplier?: number;
  telegraphMs: number;
  aoeRadius: number;
  skillName: string;
  damageMultiplier: number;
  element: ElementType;
  statusEffect?: string;
  warningText: string;
  vfxKey?: string;
  isEnrage?: boolean;
}

export interface PartyContributionConfig {
  damageWeight: number;
  healingWeight: number;
  tankMitigationWeight: number;
  supportWeight: number;
  minContributionScore: number;
  lastHitBonusPct: number;
  inactiveTimeoutSec: number;
  rewardTopN?: number;
}

export interface BossEncounterConfig {
  id?: string;
  monsterId: string;
  bossName: string;
  category: 'MINI_BOSS' | 'FIELD_BOSS' | 'WORLD_BOSS';
  regionId: string;
  portraitUrl?: string;
  respawnTimeSeconds: number;
  spawnScheduleCron?: string;
  phases: BossSkillPhase[];
  lootMode: 'PERSONAL' | 'PARTY_ROLL' | 'CONTRIBUTION_WEIGHTED';
  pityThresholdKills: number;
  pityFragmentItemId?: string;
  pityFragmentQuantity?: number;
  partyRules: PartyContributionConfig;
  status?: ContentStatus;
  updatedAt?: string;
}

export interface BossParticipantContribution {
  characterId: string;
  characterName: string;
  classId: ClassId;
  damageDealt: number;
  healingProvided: number;
  damageAbsorbed: number;
  effectiveSupport: number;
  validActions: number;
  totalScore: number;
  lastActiveAt: number;
  eligible: boolean;
  rewardSharePct: number;
}

// ==========================================
// SECOND JOBS & MULTIPLAYER SOCIAL TYPES
// ==========================================

export interface SecondJobSpecialization {
  id: string;
  baseClassId: FirstJobClassId;
  name: string;
  nameVi: string;
  orientation: string;
  weaponProficiency: WeaponType[];
  requiredLevel: number;
  bonusStatsPct: number;
  accentColor: string;
  description: string;
}

export interface RemotePlayerState {
  socketId?: string;
  characterId: string;
  name: string;
  classId: ClassId;
  secondJobName?: string;
  gender: Gender;
  level: number;
  guildName?: string;
  regionId: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  mp?: number;
  maxMp?: number;
  animState?: 'idle' | 'walk' | 'run' | 'attack' | 'skill' | 'hurt' | 'death';
  direction?: 'south' | 'west' | 'east' | 'north';
  appearance?: CharacterAppearance;
  equipment?: Record<string, string>;
}

export interface PartyMemberView {
  characterId: string;
  name: string;
  classId: ClassId;
  level: number;
  regionId: string;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  online: boolean;
  isLeader: boolean;
}

export interface PartyState {
  partyId: string;
  leaderCharacterId: string;
  members: PartyMemberView[];
}

export interface TradeOfferSide {
  characterId: string;
  characterName: string;
  gold: number;
  items: Array<{ itemId: string; name?: string; quantity: number }>;
  locked: boolean;
  confirmed: boolean;
}

export interface TradeSessionState {
  tradeId: string;
  status: 'active' | 'completed' | 'cancelled';
  parties: [TradeOfferSide, TradeOfferSide];
}

export interface MultiplayerChatMessage {
  id: string;
  sender: string;
  characterId: string;
  channel: 'general' | 'global' | 'party' | 'whisper' | 'system' | 'guild' | 'merchant';
  targetCharacterId?: string;
  targetName?: string;
  message: string;
  timestamp: string;
}

// ==========================================
// LIFE SKILLS & PROFESSION SYSTEM TYPES
// ==========================================

export type ProfessionId =
  | 'herbalist'
  | 'blacksmith'
  | 'alchemist_jeweler'
  | 'miner'
  | 'farmer'
  | 'fisherman'
  | 'woodcutter'
  | 'chef';

export type ProfessionRankId =
  | 'apprentice'
  | 'novice'
  | 'skilled'
  | 'expert'
  | 'master'
  | 'grandmaster'
  | 'legendary';

export type ItemQuality = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface ProfessionDefinition {
  id: ProfessionId;
  name: string;
  nameVi: string;
  category: 'gathering' | 'crafting' | 'hybrid';
  iconKey: string;
  npcId: string;
  description: string;
  primaryStatAffinity?: AttributeKey;
  unlockCostGold: number;
}

export interface ProfessionRankThreshold {
  id: ProfessionRankId;
  name: string;
  nameVi: string;
  minLevel: number;
  maxLevel: number;
  qualityBonusPct: number;
  extraYieldBonusPct: number;
  materialSaveChancePct: number;
}

export interface ProfessionToolDefinition {
  id: string;
  name: string;
  nameVi: string;
  professionId: ProfessionId;
  tier: number;
  requiredMastery: number;
  maxDurability: number;
  gatherSpeedBonusPct: number;
  qualityBonusPct: number;
  extraYieldBonusPct: number;
  priceGold: number;
  repairCostPerPoint: number;
  rarity: ItemQuality;
}

export interface ProfessionMaterialDefinition {
  id: string;
  name: string;
  nameVi: string;
  professionId: ProfessionId;
  tier: number;
  rarity: ItemQuality;
  baseValueGold: number;
  stackLimit: number;
  sourceType: 'gather' | 'farm' | 'fish' | 'mine' | 'woodcut' | 'boss_drop' | 'refined';
  description: string;
}

export interface GatheringNodeDefinition {
  id: string;
  name: string;
  nameVi: string;
  professionId: ProfessionId;
  nodeType: 'herb' | 'ore' | 'tree' | 'fishing_spot' | 'farm_plot';
  mapId: string;
  tx: number;
  ty: number;
  requiredToolId?: string;
  requiredToolTier: number;
  requiredMastery: number;
  gatherDurationMs: number;
  quantityMin: number;
  quantityMax: number;
  respawnSeconds: number;
  rarity: ItemQuality;
  expReward: number;
  primaryMaterialId: string;
  rareDropMaterialId?: string;
  rareDropChancePct?: number;
  territoryId?: string;
}

export interface ProfessionRecipeDefinition {
  id: string;
  name: string;
  nameVi: string;
  professionId: ProfessionId;
  tier: number;
  requiredMastery: number;
  isHidden?: boolean;
  isLegendary?: boolean;
  requiresQuestId?: string;
  requiresBossReagent?: boolean;
  materials: Array<{ itemId: string; quantity: number; minQuality?: ItemQuality }>;
  outputItemId: string;
  outputName: string;
  outputQuantity: number;
  craftCostGold: number;
  baseSuccessRatePct: number;
  baseExtraYieldChancePct: number;
  maxExtraYieldQty: number;
  expReward: number;
  craftTimeMs: number;
  buffEffect?: {
    stat: string;
    flatBonus?: number;
    pctBonus?: number;
    durationSec: number;
  };
  description: string;
}

export interface ProfessionQuestDefinition {
  id: string;
  name: string;
  nameVi: string;
  professionId: ProfessionId;
  npcId: string;
  questKind: 'intro' | 'daily' | 'mastery_advancement' | 'special' | 'hidden_legendary';
  requiredMastery: number;
  requiredItemId?: string;
  requiredQty: number;
  requiredActionType: 'gather' | 'craft' | 'deliver' | 'fish' | 'harvest';
  rewardExp: number;
  rewardGold: number;
  unlocksRecipeId?: string;
  unlocksProfessionSlot?: boolean;
  description: string;
}

export interface ProfessionNpcDefinition {
  id: string;
  name: string;
  nameVi: string;
  title: string;
  professionId: ProfessionId;
  mapId: string;
  tx: number;
  ty: number;
  spriteId: string;
  dialogueIntro: string;
  questIds: string[];
}

export interface ProfessionProductionLogEntry {
  id: string;
  recipeId: string;
  recipeName: string;
  outputItemId: string;
  quantity: number;
  extraYield: number;
  quality: ItemQuality;
  expGained: number;
  createdAt: string;
}

export interface PlayerProfessionProgress {
  professionId: ProfessionId;
  level: number;
  exp: number;
  nextLevelExp: number;
  rank: ProfessionRankId;
  learnedRecipeIds: string[];
  recipeCraftCounts: Record<string, number>;
  equippedToolId?: string;
  toolDurability: number;
  maxToolDurability: number;
  totalGathered: number;
  totalCrafted: number;
  completedQuestIds: string[];
  dailyQuestsDateKey?: string;
  dailyCompletedQuestIds: string[];
  productionHistory: ProfessionProductionLogEntry[];
}

export interface FarmPlotState {
  plotId: string;
  characterId: string;
  cropId: string;
  cropName: string;
  seedItemId: string;
  outputItemId: string;
  plantedAt: number;
  readyAt: number;
  watered: boolean;
  yieldBonusPct: number;
  status: 'growing' | 'ready' | 'harvested';
}

// ==========================================
// GUILD, MERCHANT ASSOCIATION & TERRITORY TYPES
// ==========================================

export type GuildPermission =
  | 'INVITE_MEMBER'
  | 'KICK_MEMBER'
  | 'MANAGE_RANKS'
  | 'EDIT_ANNOUNCEMENT'
  | 'DEPOSIT_STORAGE'
  | 'WITHDRAW_STORAGE'
  | 'START_RESEARCH'
  | 'UPGRADE_BUILDING'
  | 'SUMMON_BOSS'
  | 'DECLARE_WAR'
  | 'MANAGE_TERRITORY'
  | 'WITHDRAW_TREASURY';

export interface GuildRankConfig {
  id: string;
  name: string;
  nameVi: string;
  order: number;
  permissions: GuildPermission[];
}

export interface GuildMemberEntry {
  characterId: string;
  characterName: string;
  classId: ClassId;
  level: number;
  rankId: string;
  contributionTotal: number;
  contributionWeekly: number;
  joinedAt: string;
  online?: boolean;
}

export interface GuildBuildingState {
  id: 'guild_hall' | 'training_ground' | 'vault_annex' | 'alchemy_workshop' | 'war_citadel';
  name: string;
  nameVi: string;
  level: number;
  maxLevel: number;
  effectDescription: string;
}

export interface GuildSkillState {
  id: string;
  name: string;
  nameVi: string;
  level: number;
  maxLevel: number;
  bonusPerLevelPct: number;
  statKey: 'expBonusPct' | 'atkPct' | 'defPct' | 'craftQualityPct' | 'gatherYieldPct';
}

export interface GuildStorageItem {
  slotId: string;
  itemId: string;
  name: string;
  quantity: number;
  quality?: ItemQuality;
  rarity?: ItemRarity;
  depositedBy: string;
  depositedAt: string;
}

export interface GuildBossInstance {
  bossId: string;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  summonedAt: string;
  defeated: boolean;
  damageContributors: Record<string, { name: string; damage: number }>;
}

export interface GuildApplication {
  id: string;
  guildId: string;
  characterId: string;
  characterName: string;
  level: number;
  classId: ClassId;
  message: string;
  createdAt: string;
}

export interface GuildWarMatch {
  warId: string;
  challengerGuildId: string;
  challengerGuildName: string;
  defenderGuildId: string;
  defenderGuildName: string;
  challengerScore: number;
  defenderScore: number;
  status: 'matched' | 'active' | 'finished';
  winnerGuildId?: string;
  startedAt: string;
  endsAt: string;
}

export interface GuildEntity {
  id: string;
  name: string;
  tag: string;
  leaderCharacterId: string;
  leaderName: string;
  level: number;
  exp: number;
  nextLevelExp: number;
  treasuryGold: number;
  announcement: string;
  seasonPoints: number;
  ranks: GuildRankConfig[];
  members: GuildMemberEntry[];
  storage: GuildStorageItem[];
  storageCapacity: number;
  buildings: GuildBuildingState[];
  skills: GuildSkillState[];
  completedQuestIds: string[];
  activeBoss: GuildBossInstance | null;
  controlledTerritoryIds: string[];
  createdAt: string;
  chatHistory: Array<{ id: string; sender: string; message: string; timestamp: string }>;
}

export type MerchantPermission =
  | 'INVITE_MEMBER'
  | 'KICK_MEMBER'
  | 'MANAGE_RANKS'
  | 'MANAGE_WAREHOUSE'
  | 'APPROVE_CONTRACT'
  | 'LAUNCH_CARAVAN'
  | 'WITHDRAW_TREASURY';

export interface MerchantMemberEntry {
  characterId: string;
  characterName: string;
  level: number;
  rankId: string;
  reputationContribution: number;
  contractsCompleted: number;
  joinedAt: string;
}

export interface MerchantAssociationEntity {
  id: string;
  name: string;
  tag: string;
  masterCharacterId: string;
  masterName: string;
  level: number;
  exp: number;
  nextLevelExp: number;
  reputation: number;
  treasuryGold: number;
  announcement: string;
  ranks: Array<{ id: string; nameVi: string; order: number; permissions: MerchantPermission[] }>;
  members: MerchantMemberEntry[];
  warehouse: GuildStorageItem[];
  warehouseCapacity: number;
  completedContractIds: string[];
  activeCaravanCount: number;
  createdAt: string;
}

export interface MarketplaceListing {
  id: string;
  sellerCharacterId: string;
  sellerName: string;
  shopName?: string;
  itemId: string;
  itemName: string;
  professionId?: ProfessionId;
  quality: ItemQuality;
  rarity: ItemRarity;
  quantity: number;
  unitPriceGold: number;
  totalPriceGold: number;
  feePct: number;
  territoryId?: string;
  status: 'active' | 'sold' | 'cancelled';
  createdAt: string;
}

export interface MarketBuyOrder {
  id: string;
  buyerCharacterId: string;
  buyerName: string;
  itemId: string;
  itemName: string;
  minQuality: ItemQuality;
  quantityRemaining: number;
  quantityInitial: number;
  unitPriceGold: number;
  escrowGoldRemaining: number;
  status: 'active' | 'fulfilled' | 'cancelled';
  createdAt: string;
}

export interface AuctionListing {
  id: string;
  sellerCharacterId: string;
  sellerName: string;
  itemId: string;
  itemName: string;
  quality: ItemQuality;
  rarity: ItemRarity;
  quantity: number;
  startingPriceGold: number;
  buyoutPriceGold?: number;
  currentBidGold: number;
  highestBidderCharacterId?: string;
  highestBidderName?: string;
  minIncrementGold: number;
  endsAt: number;
  status: 'active' | 'settled' | 'cancelled';
  createdAt: string;
}

export interface MerchantSupplyContract {
  id: string;
  title: string;
  contractKind: 'material_supply' | 'equipment_order' | 'potion_supply' | 'food_supply' | 'guild_bulk_procurement';
  issuerType: 'npc' | 'guild' | 'merchant_association' | 'player';
  issuerId: string;
  issuerName: string;
  professionId: ProfessionId;
  requiredItemId: string;
  requiredItemName: string;
  minQuality: ItemQuality;
  requiredQty: number;
  deliveredQty: number;
  rewardGold: number;
  rewardReputation: number;
  rewardMerchantExp: number;
  claimedByCharacterId?: string;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface CaravanRouteDefinition {
  id: string;
  name: string;
  nameVi: string;
  fromMapId: string;
  toMapId: string;
  requiredMerchantLevel: number;
  durationMs: number;
  capitalCostGold: number;
  payoutGold: number;
  payoutReputation: number;
  payoutMerchantExp: number;
  riskLevel: 'low' | 'medium' | 'high';
  taxTerritoryId?: string;
}

export interface CaravanMission {
  id: string;
  associationId: string;
  leaderCharacterId: string;
  leaderName: string;
  routeId: string;
  routeName: string;
  cargoSummary: string;
  capitalInvestedGold: number;
  expectedPayoutGold: number;
  startedAt: number;
  arrivesAt: number;
  status: 'in_transit' | 'completed' | 'intercepted';
}

export interface TerritoryDefinition {
  id: string;
  name: string;
  nameVi: string;
  mapId: string;
  territoryType: 'herb_vale' | 'mining_outpost' | 'forest_outpost' | 'trade_station' | 'citadel';
  maxTaxRatePct: number;
  baseCaptureDefense: number;
  publicDailyGatherQuota: number;
  bonusYieldForOwnerPct: number;
  npcStewardName: string;
  description: string;
}

export interface TerritoryRuntimeState {
  territoryId: string;
  name: string;
  nameVi: string;
  mapId: string;
  territoryType: TerritoryDefinition['territoryType'];
  ownerGuildId: string | null;
  ownerGuildName: string | null;
  defensePoints: number;
  maxDefensePoints: number;
  taxRatePct: number;
  maxTaxRatePct: number;
  accumulatedTaxGold: number;
  seasonNumber: number;
  capturedAt: string | null;
  buildings: Array<{ id: string; nameVi: string; level: number; maxLevel: number }>;
}

export interface EconomyAuditLog {
  id: string;
  txId: string;
  category: 'profession' | 'marketplace' | 'auction' | 'contract' | 'guild_storage' | 'guild_bank' | 'caravan' | 'territory' | 'trade';
  actorCharacterId: string;
  targetCharacterId?: string;
  goldDelta: number;
  itemId?: string;
  quantity?: number;
  details: string;
  timestamp: string;
}

export type DeathPenaltyTier = 'novice' | 'first_job' | 'second_job' | 'third_job';

export interface DeathPenaltyState {
  tier: DeathPenaltyTier;
  statReductionPct: number;
  expLost: number;
  appliedAt: number;
  expiresAt: number;
  stackingCount: number;
  maxStacks: number;
  resurrectionMapId: string;
  killerName?: string;
  reason?: string;
}

export interface AutoCombatConfig {
  enabled: boolean;
  autoAttack: boolean;
  autoSkill: boolean;
  selectedSkillIds: string[];
  autoPotionHp: boolean;
  hpThresholdPct: number;
  autoPotionMp: boolean;
  mpThresholdPct: number;
  autoLoot: boolean;
  autoTarget: boolean;
  targetPriority: 'nearest' | 'lowest_hp' | 'prefer_elite' | 'avoid_boss';
  returnToAnchor: boolean;
  anchorX: number | null;
  anchorY: number | null;
  anchorRegionId: string | null;
  anchorRadiusPx: number;
  searchRadiusPx: number;
}

export interface DeathPenaltyTierRule {
  statReductionPct: number;
  durationSec: number;
  labelVi: string;
}

export interface DeathPenaltyConfig {
  enabled: boolean;
  expLossPct: number;
  expFloorAtZero: boolean;
  maxStacks: number;
  stackStatReductionCapPct: number;
  tiers: Record<DeathPenaltyTier, DeathPenaltyTierRule>;
}

export interface EliteSpawnConfig {
  enabled: boolean;
  spawnChancePct: number;
  checkIntervalSec: number;
  maxActivePerMap: number;
  respawnCooldownSec: number;
  hpMultiplier: number;
  atkMultiplier: number;
  expMultiplier: number;
  goldMultiplier: number;
  announceRegion: boolean;
}

export interface AutoCombatServerConfig {
  enabled: boolean;
  maxSearchRadiusPx: number;
  minActionIntervalMs: number;
  allowInSafeZones: boolean;
}

export interface WorldOperationsConfig {
  normalSpawnMultiplier: number;
  maxNormalMonstersPerMap: number;
  monsterAiAggroScale: number;
  deathPenalty: DeathPenaltyConfig;
  eliteSpawn: EliteSpawnConfig;
  autoCombat: AutoCombatServerConfig;
}

export type NpcDistrictType =
  | 'blacksmith_district'
  | 'merchant_district'
  | 'holy_sanctuary_district'
  | 'adventurer_district'
  | 'gathering_district'
  | 'village_center'
  | 'portal_district';

export type NpcMovementBehavior = 'stationary' | 'gentle_turn' | 'patrol_short';

export interface NpcPlacementRecord {
  id: string;
  name: string;
  role: string;
  district: NpcDistrictType;
  regionId: string;
  tx: number;
  ty: number;
  x: number;
  y: number;
  direction: 'north' | 'south' | 'east' | 'west';
  interactionRadius: number;
  movementBehavior: NpcMovementBehavior;
  idleAnimation: 'idle' | 'pray_idle' | 'forge_idle' | 'guard_idle';
  dialogueId: string;
  dialogue: string;
  associatedBuildingId?: string;
  serviceType?: string;
  spriteId: string;
}

export type PortalVisualType = 'village' | 'regional' | 'sanctuary' | 'dungeon' | 'boss' | 'event';

export interface PortalDef {
  id: string;
  name: string;
  mapId: string;
  destinationMapId: string;
  portalType: PortalVisualType;
  vfxProfile: PortalVisualType;
  visualAsset: string;
  tx: number;
  ty: number;
  x: number;
  y: number;
  targetTx: number;
  targetTy: number;
  direction: 'north' | 'south' | 'east' | 'west' | 'portal';
  interactionRadius: number;
  destinationSpawnId: string;
  requiredLevel: number;
  dungeonId?: string | null;
  requiresFloorClear?: number | null;
  enabled?: boolean;
}

export interface WorldLayoutValidationIssue {
  severity: 'error' | 'warning';
  code: string;
  entityType: 'npc' | 'portal' | 'building' | 'map';
  entityId: string;
  regionId: string;
  message: string;
}

export interface WorldLayoutValidationReport {
  valid: boolean;
  checkedMaps: number;
  checkedNpcs: number;
  checkedPortals: number;
  errorCount: number;
  warningCount: number;
  issues: WorldLayoutValidationIssue[];
}

export type MonsterAiState =
  | 'IDLE'
  | 'DETECT'
  | 'CHASE'
  | 'ATTACK'
  | 'RETURN'
  | 'DEATH'
  | 'RESPAWN';

// ==========================================
// CHARACTER BALANCE & COMBAT POLISH TYPES
// ==========================================

export type RegenerationState = 'in_combat' | 'out_of_combat' | 'sitting' | 'item_recovery';

export type RegenerationAreaContext = 'normal' | 'safe_zone' | 'boss_arena' | 'pvp_arena';

export interface JobRegenProfile {
  jobId: ClassId | AdvancedJobId;
  isAdvancedJob: boolean;
  parentClassId?: FirstJobClassId;
  hpRegenPctPerSec: number;
  mpRegenPctPerSec: number;
  combatHpMultiplierOverride?: number;
  combatMpMultiplierOverride?: number;
  sittingBonusMultiplier?: number;
  descriptionVi: string;
}

export interface RegenStateMultipliersConfig {
  inCombatHpMultiplier: number;
  inCombatMpMultiplier: number;
  outOfCombatDelayMs: number;
  outOfCombatHpMultiplier: number;
  outOfCombatMpMultiplier: number;
  sittingHpMultiplier: number;
  sittingMpMultiplier: number;
  bossAreaMultiplier: number;
  pvpAreaMultiplier: number;
  safeZoneMultiplier: number;
  maxConsumableRegenStackCount: number;
  maxTotalHpRegenPctCapPerSec: number;
  maxTotalMpRegenPctCapPerSec: number;
  minTickIntervalMs: number;
}

export type SkillDirectionCode = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

export interface SkillAnimationMetadata {
  skillId: string;
  jobId: ClassId | AdvancedJobId;
  isAdvancedJob: boolean;
  parentClassId?: FirstJobClassId;
  requiredWeaponTypes: WeaponType[];
  cast_animation: string;
  hand_pose: string;
  weapon_pose: string;
  release_frame: number;
  projectile_origin: {
    anchor: 'weapon_tip' | 'offhand' | 'bow_string' | 'staff_gem' | 'palm' | 'chest' | 'sky';
    offsetX: number;
    offsetY: number;
  };
  attack_trail: {
    enabled: boolean;
    attachTo: 'weapon_origin' | 'dual_weapon_origin' | 'spear_tip' | 'gauntlet_arc' | 'none';
    style: string;
    colorHex: string;
    startFrame: number;
    endFrame: number;
  };
  impact_frame: number;
  impact_vfx: string;
  hit_reaction: 'flinch' | 'knockback' | 'launch' | 'stagger' | 'electrocute' | 'freeze' | 'holy_blind' | 'none';
  recovery_animation: string;
  direction_support: SkillDirectionCode[];
  animation_speed: number;
  total_frames: number;
  assetStatus: 'verified_sheet' | 'fallback_procedural_sheet';
  fallbackAnimationKey?: string;
  missingAssetRequirement?: string;
}

export interface SkillTimelineEvent {
  phase:
    | 'cast_start'
    | 'character_pose'
    | 'weapon_pose'
    | 'particle_spawn'
    | 'projectile_release'
    | 'damage_frame'
    | 'hit_reaction'
    | 'impact_effect'
    | 'recovery';
  frame: number;
  timeMs: number;
  description: string;
  attachAnchor?: string;
}

export interface SkillExecutionTimeline {
  skillId: string;
  jobId: string;
  direction: SkillDirectionCode;
  qualityMode: 'high' | 'low';
  totalFrames: number;
  totalDurationMs: number;
  releaseFrame: number;
  releaseTimeMs: number;
  impactFrame: number;
  impactTimeMs: number;
  particleBudget: number;
  events: SkillTimelineEvent[];
}

export interface ExpAdminAuditRecord {
  id: string;
  version: number;
  actorId: string;
  actorRole: string;
  action: 'update' | 'toggle' | 'rollback';
  note: string;
  previousConfig: ExpBalanceConfig;
  newConfig: ExpBalanceConfig;
  timestamp: string;
}

export interface ProgressionBandSimulationResult {
  bandLabel: 'Lv.1-15' | 'Lv.15-40' | 'Lv.40-60' | 'Lv.60-80' | 'Lv.80-100';
  levelStart: number;
  levelEnd: number;
  mode: 'solo' | 'party';
  representativeRegionId: string;
  representativeMonsterId: string;
  avgTimePerLevelSec: number;
  expPerMinute: number;
  avgKillsPerLevel: number;
  hpRecoveryDowntimeSecPerLevel: number;
  mpRecoveryDowntimeSecPerLevel: number;
  potionsUsedPerLevel: number;
  skillUsageFrequencyPerMin: number;
  avgTimeToKillSec: number;
  travelTimeBetweenPacksSec: number;
  beginnerPacingHealthy: boolean;
}

