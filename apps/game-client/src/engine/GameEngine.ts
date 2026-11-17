import { Entity, MonsterEntity, NpcEntity, PlayerEntity, expRequiredForLevel } from '../entities/Entity';
import { SpriteManager } from './SpriteManager';
import { TilemapEngine } from './TilemapEngine';
import { ArtworkLibrary } from './ArtworkLibrary';
import {
  ActiveQuestProgress,
  AwakeningResult,
  CharacterEntity,
  ExpBalanceConfig,
  FirstJobClassId,
  JobScoreBreakdown,
  PassivePointTransaction,
  QuestChainDefinition,
  QuestChainProgressState,
  QuestDefinition,
  TitleBonusLimits,
  TitleBonusSummary,
  TitleDefinition,
  UniqueEquipmentDefinition,
} from '@elysia/game-types';
import type { AutoCombatConfig, DeathPenaltyState } from '@elysia/game-types';
import {
  DEFAULT_AUTO_COMBAT_CONFIG,
  GAME_BRANDING,
  SAFE_VILLAGE_CHECKPOINTS,
  computeDeathPenaltyApplication,
  getActiveDeathPenaltyReductionPct,
  isSafeVillageId,
  isTrainingRegionId,
  resolveResurrectionCheckpoint,
} from '@elysia/game-data-schema';
import {
  syncCharacterStateApi,
  setCheckpointApi,
  reportDeathApi,
  resurrectAtCheckpointApi,
  getAuthHeaders,
  getAuthToken,
} from '../services/apiClient';
import {
  allocateCharacterStatsApi,
  allocatePassiveApi,
  getActiveCharacterCache,
  guestAuthApi,
  respecPassivesApi,
  setActiveCharacterCache,
  acceptQuestApi,
  trackQuestApi,
  abandonQuestApi,
  claimQuestRewardApi,
  recordQuestProgressApi,
  buyShopItemApi,
  sellShopItemApi,
  discardInventoryItemApi,
  sortInventoryApi,
  repairEquipmentApi,
  equipCharacterItemApi,
  unequipCharacterSlotApi,
} from '../services/apiClient';
import { MultiplayerClient } from '../services/multiplayerClient';
import type { RemotePlayerState } from '@elysia/game-types';
import { modalManager } from '../ui/ModalManager';
import {
  DEFAULT_EXP_BALANCE_CONFIG,
  DEFAULT_TITLE_BONUS_LIMITS,
  FIRST_JOB_STARTER_GEAR,
  PROFESSION_GATHERING_NODES,
  PROFESSION_NPCS,
  PROFESSION_RECIPES,
  INITIAL_BOSS_CONFIGS,
  INITIAL_BOSS_DROP_TABLES,
  INITIAL_CLASSES,
  INITIAL_CRAFTING_RECIPES,
  INITIAL_EQUIPMENT_SETS,
  INITIAL_ITEMS,
  INITIAL_SKILLS,
  RARITY_CONFIGS,
  canClassEquipItem,
  checkUniqueEquipmentBinding,
  classifyJobFromBaseStats,
  computeEquippedSetBonuses,
  computeLevelAdjustedExp,
  computePassiveAndBuffModifiers,
  computePermanentTitleBonuses,
  computeSkillActionPower,
  computeUniqueEquipmentBonuses,
  getSkillTreeForClass,
  isPreJobClass,
  normalizeEquipSlot,
  rollBossLootForParticipant,
  ADVANCED_JOB_BY_ID,
  applyCombatMasteryGain,
  getAdvancedBranchesForClass,
  getMasteryRankFromPoints,
  normalizeBaseClassId,
  resolveSkillEvolutionState,
  PASSIVE_PROGRESSION_CONFIG,
  aggregateCharacterStats,
  computeEarnedPassivePoints,
  computePassivePointsSpent,
  validatePassiveAllocation,
} from '@elysia/game-data-schema';
import { VFXManager, computeVisualEvolutionTier } from '@elysia/vfx-engine';
import {
  learnOrUpgradeSkillApi,
  selectLv80AdvancedJobApi,
} from '../services/apiClient';
import {
  BossHudState,
  CraftingRecipeView,
  EquipSlotKey,
  InventoryItemDef,
  ItemRarity,
  MapExitDef,
  MapObjectDef,
  PlayerStatsSummary,
  PrimaryAttributesState,
  QuestChainClientView,
  QuestProgressState,
  SkillSlotDef,
  SpriteRegistryDoc,
  TitleClientView,
  VillageMapData,
  WorldQuestClientView,
} from './types';

interface ActiveVfxInstance {
  assetId: string;
  x: number;
  y: number;
  size: number;
  elapsedMs: number;
  totalFrames: number;
  fps: number;
}

interface LootBeamEffect {
  x: number;
  y: number;
  color: string;
  label: string;
  ttlMs: number;
}

export interface DungeonProgressState {
  instanceId?: string;
  active: boolean;
  mode: 'solo' | 'party';
  currentFloor: number;
  collectedFragments: string[];
  activatedPillars: string[];
  bossDefeated: boolean;
  rewardClaimed: boolean;
}

export interface WorldRegionSummary {
  id: string;
  name: string;
  nameVi?: string;
  subtitle?: string;
  type: string;
  hubId?: string;
  recommendedLevelMin: number;
  recommendedLevelMax: number;
  requiredLevel: number;
  isSafeZone: boolean;
  combatEnabled: boolean;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  ttlMs: number;
  maxTtlMs?: number;
  isCrit?: boolean;
  comboCount?: number;
}

interface EnergyBeamEffect {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  color: string;
  width: number;
  ttlMs: number;
  maxTtlMs: number;
}

interface PetalParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
}

interface ActiveProjectile {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  targetMonsterId?: string;
  speedPxPerSec: number;
  radiusPx: number;
  explosionRadiusPx: number;
  damage: number;
  isCrit: boolean;
  color: string;
  label: string;
  vfxKey: string;
  remoteOnly?: boolean;
  ttlMs: number;
  embers: Array<{ x: number; y: number; r: number; alpha: number }>;
}

interface DirectionalSlashEffect {
  x: number;
  y: number;
  angleRad: number;
  radiusPx: number;
  elapsedMs: number;
  durationMs: number;
  color: string;
}

interface CompactSmokeBurst {
  x: number;
  y: number;
  elapsedMs: number;
  durationMs: number;
  radiusPx: number;
}

interface RemotePlayerView extends RemotePlayerState {
  renderX: number;
  renderY: number;
  entity: Entity;
}

export interface HudSnapshot {
  playerName: string;
  classId: string;
  fps?: number;
  secondJobName?: string | null;
  advancedJobId?: string | null;
  advancedJobName?: string | null;
  availableAdvancedBranches?: any[];
  skillMastery?: Record<string, any>;
  onlineCount?: number;
  pingMs?: number;
  isOnlineConnected?: boolean;
  jobAdvancementCompleted: boolean;
  evolutionTier: number;
  level: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  tx: number;
  ty: number;
  regionId: string;
  regionName: string;
  regionSubtitle: string;
  isSafeZone: boolean;
  combatEnabled: boolean;
  exits: MapExitDef[];
  hasAwakeningCertificate: boolean;
  beginnerQuestCompleted: boolean;
  sanctumCompleted: boolean;
  baseStats: PrimaryAttributesState;
  compatibilityBreakdown: JobScoreBreakdown[];
  awakeningResult: AwakeningResult | null;
  dungeon: DungeonProgressState;
  worldRegions: WorldRegionSummary[];
  availableClasses: any[];
  quest: QuestProgressState;
  quests: QuestProgressState[];
  skills: SkillSlotDef[];
  cooldowns: Record<string, number>;
  stats: PlayerStatsSummary;
  equipment: Partial<Record<EquipSlotKey, InventoryItemDef>>;
  inventory: InventoryItemDef[];
  storage: InventoryItemDef[];
  shopCatalog: InventoryItemDef[];
  skillPoints: number;
  activeBoss: BossHudState | null;
  craftingRecipes: CraftingRecipeView[];
  worldQuests: WorldQuestClientView[];
  discoveredHiddenQuests: WorldQuestClientView[];
  questChains: QuestChainClientView[];
  titles: TitleClientView[];
  titleBonuses: TitleBonusSummary;
  equippedCosmeticTitleId: string | null;
  ownedUniqueEquipmentIds: string[];
  uniqueEquipmentCatalog: UniqueEquipmentDefinition[];
  visitedMaps: string[];
  passiveAllocations: Record<string, number>;
  passivePoints: { earned: number; spent: number; available: number; masteryBonusPoints: number };
  passiveTransactions: PassivePointTransaction[];
  respecCostGold: number;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  public tilemap: TilemapEngine;
  public readonly sprites: SpriteManager;

  public readonly player: PlayerEntity;
  public readonly npcs: NpcEntity[] = [];
  public readonly monsters: MonsterEntity[] = [];
  private spriteDoc: SpriteRegistryDoc;

  public regionId = 'THON_KHOI_NGUYEN';
  public worldRegions: WorldRegionSummary[] = [];
  public worldClasses: any[] = [];
  public worldSkills: any[] = [];
  public worldCities: any[] = [];
  public worldItems: any[] = [...INITIAL_ITEMS];
  public worldEquipmentSets: any[] = [...INITIAL_EQUIPMENT_SETS];
  public worldCraftingRecipes: any[] = [...INITIAL_CRAFTING_RECIPES];
  public worldBossConfigs: any[] = [...INITIAL_BOSS_CONFIGS];
  public worldDropTables: any[] = [...INITIAL_BOSS_DROP_TABLES];
  public worldMonsters: any[] = [];
  public worldQuestsCatalog: QuestDefinition[] = [
    {
      id: 'QUEST_001_SLIME_CLEAR',
      name: 'Dọn Sạch Ngoại Ô Làng',
      description: 'Giúp Trưởng Thôn Kiên tiêu diệt 3 Slime Thảo Nguyên để bảo vệ ruộng đồng Thôn Khởi Nguyên.',
      questType: 'MAIN_QUEST',
      requiredLevel: 1,
      prerequisiteQuestIds: [],
      startNpcId: 'npc_elder',
      endNpcId: 'npc_elder',
      regionId: 'THON_KHOI_NGUYEN',
      objectives: [
        {
          id: 'obj_1',
          type: 'KILL_MONSTER',
          targetId: 'MONSTER_GREEN_SLIME',
          requiredCount: 3,
          description: 'Tiêu diệt 3 Slime Thảo Nguyên',
        },
      ],
      rewards: {
        exp: 120,
        gold: 250,
        items: [{ itemId: 'ITEM_POTION_HP_SMALL', quantity: 5 }],
      },
      repeatable: false,
      status: 'published',
    },
    {
      id: 'QUEST_002_GOBLIN_SCOUT',
      name: 'Trinh Sát Rừng Goblin',
      description: 'Đánh đuổi 3 Goblin Trinh Sát quấy phá tuyến đường phía Đông Thôn.',
      questType: 'MAIN_QUEST',
      requiredLevel: 3,
      prerequisiteQuestIds: ['QUEST_001_SLIME_CLEAR'],
      startNpcId: 'npc_trainer',
      endNpcId: 'npc_trainer',
      regionId: 'THON_KHOI_NGUYEN',
      objectives: [
        {
          id: 'obj_1',
          type: 'KILL_MONSTER',
          targetId: 'MONSTER_GOBLIN_SCOUT',
          requiredCount: 3,
          description: 'Tiêu diệt 3 Goblin Trinh Sát',
        },
      ],
      rewards: {
        exp: 260,
        gold: 400,
        items: [{ itemId: 'ITEM_POTION_HP_MEDIUM', quantity: 3 }],
      },
      repeatable: false,
      status: 'published',
    },
  ];
  public worldQuestChains: QuestChainDefinition[] = [];
  public worldUniqueEquipment: UniqueEquipmentDefinition[] = [];
  public worldTitles: TitleDefinition[] = [];
  public worldTitleBonusLimits: Partial<TitleBonusLimits> = { ...DEFAULT_TITLE_BONUS_LIMITS };
  public worldExpTables: any[] = [];
  public worldSpawnZones: any[] = [];
  public worldExpBalanceConfig: ExpBalanceConfig = { ...DEFAULT_EXP_BALANCE_CONFIG };
  public activeWorldQuests: Record<string, ActiveQuestProgress> = {};
  public trackedQuestId: string | null = null;
  public completedQuestHistory: Record<string, { completedAt: string; rewards?: any }> = {};
  public discoveredHiddenQuests: string[] = [];
  public questChainProgress: Record<string, QuestChainProgressState> = {};
  public visitedMaps: string[] = ['THON_KHOI_NGUYEN'];
  public monsterKillCounts: Record<string, number> = {};
  public dialogueFlags: string[] = [];
  public ownedUniqueEquipmentIds: string[] = [];
  public unlockedTitles: string[] = [];
  public equippedCosmeticTitleId: string | null = null;
  public claimedRewardKeys: string[] = [];
  public cachedTitleBonuses: TitleBonusSummary | null = null;
  public serverCharacterId: string | null = null;
  public showDamageNumbers = true;
  public showPetals = true;
  public skillPoints = 2;
  public skillLevels: Record<string, number> = { SKILL_NOVICE_SLASH: 1, SKILL_NOVICE_FIREBALL: 1 };
  public pityCounters: Record<string, number> = {};
  public engagedBossId: string | null = null;
  private activeBuffs: Record<string, { stat: string; valuePct?: number; flatValue?: number; expiresAt: number }> = {};
  private shieldHp = 0;
  private activeVfx: ActiveVfxInstance[] = [];
  private activeProjectiles: ActiveProjectile[] = [];
  private directionalSlashes: DirectionalSlashEffect[] = [];
  private smokeBursts: CompactSmokeBurst[] = [];
  private vfxEngine: VFXManager = new VFXManager(null, 1280, 720);
  private advancedJobId: string | null = null;
  private advancedJobName: string | null = null;
  private skillMastery: Record<string, any> = {};
  public passiveAllocations: Record<string, number> = {};
  public passiveTransactions: PassivePointTransaction[] = [];
  public passiveRespecCount = 0;
  private lootBeams: LootBeamEffect[] = [];
  private monsterDoTs = new Map<string, { tickDamage: number; remainingTicks: number; tickAccumMs: number; color: string }>();
  private multiplayer: MultiplayerClient | null = null;
  public remotePlayers = new Map<string, RemotePlayerView>();
  public awakeningResult: AwakeningResult | null = null;
  public dungeonState: DungeonProgressState = {
    active: false,
    mode: 'solo',
    currentFloor: 1,
    collectedFragments: [],
    activatedPillars: [],
    bossDefeated: false,
    rewardClaimed: false,
  };
  private isSwitchingRegion = false;

  public discoveredVillageIds: string[] = ['THON_KHOI_NGUYEN'];
  public latestVillageCheckpointId = 'THON_KHOI_NGUYEN';
  public preferredResurrectionVillageId: string | null = null;
  public deathPenalty: DeathPenaltyState | null = null;
  public deathCount = 0;
  public reducedEffects = false;
  public autoCombatConfig: AutoCombatConfig = { ...DEFAULT_AUTO_COMBAT_CONFIG };
  private autoCombatCooldownMs = 0;
  private lastAutoPotionMs = 0;
  private lastLocalMonsterHitMs = 0;
  private selectedTargetId: string | null = null;
  private syncDebounceTimer: number | null = null;
  private lastServerSyncAtMs = 0;
  private deathModalActive = false;

  public onPlayerDiedUi?: (payload: any) => void;
  public onPlayerResurrectedUi?: (payload: any) => void;
  public onMapTransitionState?: (state: { active: boolean; title?: string; subtitle?: string; reduced?: boolean }) => void;

  private keysDown = new Set<string>();
  private camX = 0;
  private camY = 0;
  private viewW = window.innerWidth;
  private viewH = window.innerHeight;
  private zoom = 1.15;
  private rafId = 0;
  private lastTimeMs = 0;
  private lastHudEmitMs = 0;
  private lastMoveEmitMs = 0;
  private lastSentMoveSig = '';

  private floatingTexts: FloatingText[] = [];
  private petals: PetalParticle[] = [];
  private cooldowns: Record<string, number> = {};
  private energyBeams: EnergyBeamEffect[] = [];
  public currentFps = 60;
  public joystickVector: { dx: number; dy: number } | null = null;
  public onLootDrop?: (text: string) => void;

  public readonly skills: SkillSlotDef[] = [
    {
      id: 'SKILL_NOVICE_SLASH',
      key: '1',
      name: 'Trảm Kích',
      desc: 'Nhát chém vật lý đơn mục tiêu về phía trước.',
      mpCost: 0,
      cooldownSec: 0.7,
      rangePx: 96,
      damage: 42,
      iconKey: 'skill_azure_wave',
      vfxKey: 'vfx_sword_slash',
      iconUrl: '/assets/elysia/vfx/vfx_sword_slash_thumb.png',
      color: '#38bdf8',
      tier: 'starter',
      skillType: 'active',
      skillLevel: 1,
      maxLevel: 5,
    },
    {
      id: 'SKILL_NOVICE_FIREBALL',
      key: '2',
      name: 'Tiểu Hỏa Cầu',
      desc: 'Tụ ma lực phóng một quả cầu lửa nhỏ phát nổ tại mục tiêu.',
      mpCost: 14,
      cooldownSec: 2.2,
      rangePx: 310,
      damage: 58,
      iconKey: 'skill_flame_slash',
      vfxKey: 'vfx_fireball',
      iconUrl: '/assets/elysia/vfx/vfx_fireball_thumb.png',
      color: '#f97316',
      tier: 'starter',
      skillType: 'active',
      skillLevel: 1,
      maxLevel: 5,
    },
    {
      id: 'SKILL_NOVICE_DASH',
      key: '3',
      name: 'Thần Tốc Bộ',
      desc: 'Lướt nhanh về phía trước tăng tốc độ di chuyển và độ né tránh.',
      mpCost: 8,
      cooldownSec: 4.0,
      rangePx: 140,
      damage: 0,
      iconKey: 'skill_sonic_thrust',
      vfxKey: 'vfx_sword_slash',
      iconUrl: '/assets/elysia/vfx/vfx_sword_slash_thumb.png',
      color: '#34d399',
      tier: 'starter',
      skillType: 'active',
      skillLevel: 1,
      maxLevel: 5,
    },
    {
      id: 'SKILL_NOVICE_SPIN',
      key: '4',
      name: 'Toàn Phong Trảm',
      desc: 'Xoay kiếm quét quanh bản thân gây sát thương diện rộng lên toàn bộ quái xung quanh.',
      mpCost: 18,
      cooldownSec: 5.5,
      rangePx: 120,
      damage: 65,
      iconKey: 'skill_cyclone_slash',
      vfxKey: 'vfx_sword_slash',
      iconUrl: '/assets/elysia/vfx/vfx_sword_slash_thumb.png',
      color: '#a78bfa',
      tier: 'starter',
      skillType: 'active',
      skillLevel: 1,
      maxLevel: 5,
    },
    {
      id: 'SKILL_NOVICE_SHIELD',
      key: '5',
      name: 'Kim Cang Hộ Thể',
      desc: 'Ngưng tụ chân khí tạo lớp khiên bảo hộ giảm sát thương nhận vào.',
      mpCost: 20,
      cooldownSec: 8.0,
      rangePx: 0,
      damage: 0,
      iconKey: 'skill_iron_defense',
      vfxKey: 'vfx_sword_slash',
      iconUrl: '/assets/elysia/vfx/vfx_sword_slash_thumb.png',
      color: '#fbbf24',
      tier: 'starter',
      skillType: 'active',
      skillLevel: 1,
      maxLevel: 5,
    },
  ];

  public equipment: Partial<Record<EquipSlotKey, InventoryItemDef>> = {
    weapon: {
      id: 'eq_sword_starter',
      name: 'Thanh Kiếm Khởi Nguyên',
      category: 'equip',
      rarity: 'common',
      iconKey: 'sword_novice',
      qty: 1,
      equipSlot: 'weapon',
      weaponType: 'sword',
      atkBonus: 14,
      desc: 'Thanh kiếm sắt rèn tại Lò Rèn Thôn Khởi Nguyên.',
    },
    shoulder: {
      id: 'eq_shoulder_oak',
      name: 'Cầu Vai Gỗ Sồi',
      category: 'equip',
      rarity: 'common',
      iconKey: 'shoulder_plate',
      qty: 1,
      equipSlot: 'shoulder',
      defBonus: 8,
      desc: 'Cầu vai gỗ bọc thép nhẹ giúp đỡ đòn Slime và Goblin.',
    },
    armor: {
      id: 'eq_tunic_novice',
      name: 'Áo Choàng Lữ Khách',
      category: 'equip',
      rarity: 'common',
      iconKey: 'tunic_explorer',
      qty: 1,
      equipSlot: 'armor',
      defBonus: 10,
      desc: 'Trang phục vải dày xanh lục đặc trưng của mạo hiểm giả.',
    },
  };

  public inventory: InventoryItemDef[] = [
    { id: 'inv_helm_bronze', name: 'Mũ Đồng Tân Thủ', category: 'equip', rarity: 'rare', iconKey: 'helm_bronze', qty: 1, equipSlot: 'head', defBonus: 7, desc: 'Mũ chiến đồng nhẹ bảo vệ đầu khi tiến vào Hang Động.' },
    { id: 'inv_gloves_leather', name: 'Găng Tay Da Săn', category: 'equip', rarity: 'uncommon', iconKey: 'gloves_leather', qty: 1, equipSlot: 'gloves', atkBonus: 5, defBonus: 3, desc: 'Tăng độ bám cán kiếm và lực chém nhẹ.' },
    { id: 'inv_boots_leather', name: 'Ủng Da Thảo Nguyên', category: 'equip', rarity: 'rare', iconKey: 'boots_leather', qty: 1, equipSlot: 'boots', defBonus: 6, desc: 'Ủng da bền bỉ phù hợp di chuyển đường dài.' },
    { id: 'inv_amulet_jade', name: 'Dây Chuyền Ngọc Lục Bảo', category: 'equip', rarity: 'epic', iconKey: 'amulet_jade', qty: 1, equipSlot: 'necklace', atkBonus: 18, matkBonus: 14, defBonus: 4, desc: 'Cổ vật Thôn Khởi Nguyên tăng mạnh uy lực kiếm khí & phép thuật.' },
    { id: 'inv_ring_novice', name: 'Nhẫn Đồng Khởi Nguyên', category: 'equip', rarity: 'uncommon', iconKey: 'ring_band', qty: 1, equipSlot: 'ring1', atkBonus: 6, critRate: 3, desc: 'Nhẫn đồng chạm khắc cổ giúp tăng tỷ lệ bạo kích.' },
    { id: 'ITEM_UPGRADE_STONE_BASIC', name: 'Đá Cường Hóa Sơ Cấp', category: 'material', rarity: 'uncommon', iconKey: 'upgrade_stone', qty: 4, desc: 'Dùng tại Lò Rèn để cường hóa trang bị lên +5.' },
    { id: 'FRAG_APPRENTICE_SET', name: 'Mảnh Bộ Tập Sự Lv.15', category: 'material', rarity: 'rare', iconKey: 'fragment_crystal', qty: 10, desc: 'Thu thập 10 mảnh để đổi lấy 1 trang bị Bộ Tập Sự Lv.15.' },
    { id: 'inv_potion_hp', name: 'Bình Sinh Lực Nhỏ', category: 'consumable', rarity: 'common', iconKey: 'potion_hp', qty: 15, hpRestore: 120, desc: 'Hồi phục ngay 120 HP khi sử dụng.' },
    { id: 'inv_potion_mp', name: 'Bình Ma Pháp Nhỏ', category: 'consumable', rarity: 'common', iconKey: 'potion_mp', qty: 8, mpRestore: 80, desc: 'Hồi phục ngay 80 MP để tung chiêu liên hoàn.' },
    { id: 'inv_bread', name: 'Bánh Mì Nướng Ấm', category: 'consumable', rarity: 'common', iconKey: 'bread_loaf', qty: 5, hpRestore: 60, desc: 'Khẩu phần ấm bụng hồi 60 HP.' },
    { id: 'inv_scroll_town', name: 'Cuộn Giấy Hồi Thành', category: 'consumable', rarity: 'rare', iconKey: 'scroll_town', qty: 4, desc: 'Đưa lữ khách trở về quảng trường Giếng Làng tức thì.' },
    { id: 'inv_herb', name: 'Thảo Dược Xanh', category: 'material', rarity: 'common', iconKey: 'herb_green', qty: 12, desc: 'Nguyên liệu bào chế thuốc trị thương cơ bản.' },
    { id: 'inv_wood', name: 'Gỗ Sồi Thôn Làng', category: 'material', rarity: 'common', iconKey: 'wood_oak', qty: 20, desc: 'Gỗ chắc dùng gia cố vũ khí và khiên.' },
    { id: 'inv_ore', name: 'Quặng Sắt Thô', category: 'material', rarity: 'common', iconKey: 'ore_iron', qty: 6, desc: 'Nguyên liệu rèn luyện trang bị bậc cao.' },
    { id: 'inv_gem', name: 'Thủy Tinh Tím Cổ', category: 'material', rarity: 'epic', iconKey: 'gem_amethyst', qty: 1, desc: 'Tinh thể hiếm rơi gần khu vực Hang Động Bóng Tối.' },
  ];

  public gold = 1240;
  public silver = 350;

  public storage: InventoryItemDef[] = [
    { id: 'st_gem_amber', name: 'Hổ Phách Minh Nguyệt', category: 'material', rarity: 'rare', iconKey: 'gem_amethyst', qty: 3, desc: 'Bảo vật cất giữ tại Kho Làng Khởi Nguyên.' },
    { id: 'st_wood_stack', name: 'Gỗ Tuyết Tùng Cổ', category: 'material', rarity: 'common', iconKey: 'wood_oak', qty: 15, desc: 'Nguyên liệu chế tác khiên và cung thủ công.' },
  ];

  public readonly shopCatalog: InventoryItemDef[] = [
    { id: 'shop_hp', name: 'Bình Sinh Lực Nhỏ', category: 'consumable', rarity: 'common', iconKey: 'potion_hp', qty: 1, price: 35, hpRestore: 120, desc: 'Hồi phục ngay 120 HP khi sử dụng.' },
    { id: 'shop_mp', name: 'Bình Ma Pháp Nhỏ', category: 'consumable', rarity: 'common', iconKey: 'potion_mp', qty: 1, price: 30, mpRestore: 80, desc: 'Hồi phục ngay 80 MP để tung chiêu.' },
    { id: 'shop_bread', name: 'Bánh Mì Nướng Ấm', category: 'consumable', rarity: 'common', iconKey: 'bread_loaf', qty: 1, price: 20, hpRestore: 60, desc: 'Khẩu phần ấm bụng hồi 60 HP.' },
    { id: 'shop_scroll', name: 'Cuộn Giấy Hồi Thành', category: 'consumable', rarity: 'rare', iconKey: 'scroll_town', qty: 1, price: 80, desc: 'Đưa lữ khách trở về quảng trường Giếng Làng tức thì.' },
    { id: 'shop_sword_steel', name: 'Kiếm Thép Tinh Luyện', category: 'equip', rarity: 'rare', iconKey: 'sword_novice', qty: 1, price: 320, equipSlot: 'weapon', weaponType: 'sword', atkBonus: 24, desc: 'Kiếm rèn thép xanh gia tăng uy lực cận chiến.' },
    { id: 'shop_cloak_wind', name: 'Áo Choàng Lục Phong', category: 'equip', rarity: 'rare', iconKey: 'cloak_wind', qty: 1, price: 280, equipSlot: 'cloak', defBonus: 16, desc: 'Áo choàng thợ săn giúp giảm sát thương từ quái vật.' },
    { id: 'ITEM_UPGRADE_STONE_BASIC', name: 'Đá Cường Hóa Sơ Cấp', category: 'material', rarity: 'uncommon', iconKey: 'upgrade_stone', qty: 1, price: 150, desc: 'Cường hóa trang bị tại Lò Rèn.' },
  ];

  public quests: QuestProgressState[] = [
    {
      id: 'q_slime',
      title: 'Dọn Sạch Ngoại Ô Làng',
      giver: 'Trưởng Thôn Kiên',
      description: 'Đám Slime Thảo Nguyên đang tràn qua cầu gỗ phía Đông. Hãy tiêu diệt 3 Slime rồi quay lại báo cho Trưởng Thôn Kiên.',
      objective: 'Tiêu diệt Slime Thảo Nguyên',
      targetSpriteId: 'monster_slime',
      current: 0,
      required: 3,
      rewardGold: 250,
      rewardExp: 120,
      completed: false,
      claimed: false,
    },
    {
      id: 'q_forest',
      title: 'Trinh Sát Bìa Rừng Đông',
      giver: 'Giáo Đầu Lực',
      description: 'Thử nghiệm kiếm thuật bằng cách hạ 2 Quái Mầm Rừng gần Hang Động Bóng Tối.',
      objective: 'Hạ Quái Rừng (Goblin/Mầm)',
      targetSpriteId: 'monster_goblin',
      current: 0,
      required: 2,
      rewardGold: 360,
      rewardExp: 160,
      completed: false,
      claimed: false,
    },
    {
      id: 'q_dragon',
      title: 'Hộ Vệ Hang Động Bóng Tối',
      giver: 'Trưởng Thôn Kiên',
      description: 'Đánh bại Hắc Long Hộ Vệ đang canh giữ lối vào Hang Động phía Đông Bắc.',
      objective: 'Đánh bại Hắc Long Hộ Vệ',
      targetSpriteId: 'boss_dark_dragon',
      current: 0,
      required: 1,
      rewardGold: 800,
      rewardExp: 350,
      completed: false,
      claimed: false,
    },
  ];

  public get quest(): QuestProgressState {
    return this.quests.find((q) => !q.claimed) ?? this.quests[this.quests.length - 1];
  }

  public onHudSync?: (snapshot: HudSnapshot) => void;
  public onMinimapDraw?: (tilemap: TilemapEngine, player: PlayerEntity, npcs: NpcEntity[], monsters: MonsterEntity[]) => void;
  public onNpcTalk?: (npc: NpcEntity) => void;
  public onToast?: (msg: string) => void;
  public onToggleBalo?: () => void;
  public onToggleSkills?: () => void;
  public onToggleQuest?: () => void;
  public onToggleShop?: () => void;
  public onToggleStorage?: () => void;
  public onToggleWorldMap?: () => void;
  public onToggleJob?: () => void;
  public onToggleCrafting?: () => void;
  public onToggleParty?: () => void;
  public onToggleProfession?: (profId?: string) => void;
  public onToggleGuildMerchant?: (sec?: 'guild' | 'merchant' | 'territory') => void;
  public onAwakeningReveal?: (result: AwakeningResult) => void;
  public onRegionChange?: (regionName: string, subtitle: string, isSafeZone: boolean) => void;

  constructor(canvas: HTMLCanvasElement, mapData: VillageMapData, spriteDoc: SpriteRegistryDoc, public readonly artwork: ArtworkLibrary) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D Canvas context unavailable');
    this.ctx = ctx;
    this.spriteDoc = spriteDoc;

    this.tilemap = new TilemapEngine(mapData, artwork);
    this.tilemap.activeInteractableFilter = (id) =>
      this.dungeonState.collectedFragments.includes(id) ||
      this.dungeonState.activatedPillars.includes(id) ||
      (id === 'boss_altar' && this.dungeonState.bossDefeated);
    this.sprites = new SpriteManager(artwork);
    this.sprites.loadRegistry(spriteDoc);
    this.sprites.setEquipment(this.equipment);

    const ps = this.tilemap.tileToWorldCenter(mapData.spawns.player.tx, mapData.spawns.player.ty);
    this.player = new PlayerEntity({
      id: 'player_main',
      name: mapData.spawns.player.name,
      spriteId: 'player_adventurer',
      x: ps.x,
      y: ps.y,
      level: mapData.spawns.player.level,
      hp: 320,
      mp: 180,
    });
    this.populateMapEntities(mapData);
    this.restoreLocalProgress();
    void this.loadWorldCatalog();

    for (let i = 0; i < 24; i++) {
      this.petals.push({
        x: Math.random() * this.tilemap.worldWidth,
        y: Math.random() * this.tilemap.worldHeight,
        vx: 14 + Math.random() * 14,
        vy: 18 + Math.random() * 16,
        size: 3 + Math.random() * 3,
        alpha: 0.45 + Math.random() * 0.35,
      });
    }

    this.centerCameraImmediate();
    this.bindInputs();
    this.resize();
  }

  private populateMapEntities(mapData: VillageMapData) {
    this.npcs.length = 0;
    this.monsters.length = 0;

    for (const n of mapData.spawns.npcs) {
      const pos = this.tilemap.tileToWorldCenter(n.tx, n.ty);
      this.npcs.push(
        new NpcEntity({
          id: n.id,
          name: n.name,
          role: n.role,
          district: n.district,
          serviceType: n.serviceType,
          associatedBuildingId: n.associatedBuildingId,
          direction: n.direction,
          interactionRadius: n.interactionRadius,
          dialogue: n.dialogue,
          spriteId: n.id === 'npc_trainer' ? 'npc_trainer' : (this.spriteDoc.sheets[n.spriteId] ? n.spriteId : 'npc_villager_elder'),
          x: pos.x,
          y: pos.y,
        })
      );
    }

    // Spawn 8 Life-Skill Profession NPCs cleanly on matching maps
    for (const pnpc of PROFESSION_NPCS) {
      if (pnpc.mapId !== mapData.id || this.npcs.some((x) => x.id === pnpc.id)) continue;
      const pos = this.tilemap.tileToWorldCenter(pnpc.tx, pnpc.ty);
      this.npcs.push(
        new NpcEntity({
          id: pnpc.id,
          name: pnpc.nameVi,
          role: pnpc.title,
          serviceType: `profession:${pnpc.professionId}`,
          dialogue: pnpc.dialogueIntro,
          spriteId: this.spriteDoc.sheets[pnpc.spriteId] ? pnpc.spriteId : 'npc_merchant',
          x: pos.x,
          y: pos.y,
        })
      );
    }

    // Strict Safe Zone City Rule: Never spawn monsters inside cities where monster spawning/combat is disabled
    if (mapData.isSafeZone && mapData.combatEnabled === false) {
      return;
    }

    for (const m of mapData.spawns.monsters) {
      const pos = this.tilemap.tileToWorldCenter(m.tx, m.ty);
      const monMeta = this.worldMonsters.find((wm: any) => wm.id === m.monsterId || wm.id === m.id);
      const bossCfg = this.worldBossConfigs.find((bc: any) => bc.monsterId === m.monsterId || bc.monsterId === m.id);
      this.monsters.push(
        new MonsterEntity({
          id: m.id,
          monsterId: m.monsterId,
          name: m.name,
          level: m.level,
          hp: m.hp,
          expReward: m.expReward ?? monMeta?.expReward,
          goldReward: m.goldReward ?? monMeta?.goldReward,
          isBoss: Boolean(m.isBoss || monMeta?.isBoss || bossCfg),
          category: (m as any).category || monMeta?.category || (bossCfg ? 'FIELD_BOSS' : m.isBoss ? 'MINI_BOSS' : 'NORMAL'),
          portraitUrl: (m as any).portraitUrl || monMeta?.portraitUrl || bossCfg?.portraitUrl,
          respawnSec: (m as any).respawnSec ?? monMeta?.respawnTimeSeconds ?? 7,
          aiBehavior: (m as any).aiBehavior ?? monMeta?.aiBehavior ?? 'passive',
          aggroRange: (m as any).aggroRange ?? monMeta?.aggroRange ?? 160,
          visualFilter: m.visualFilter || monMeta?.visualFilter,
          spriteId: this.spriteDoc.sheets[m.spriteId] ? m.spriteId : 'monster_slime',
          x: pos.x,
          y: pos.y,
        })
      );
    }
  }

  private async loadWorldCatalog() {
    try {
      const [
        mapsRes,
        classesRes,
        skillsRes,
        citiesRes,
        itemsRes,
        setsRes,
        recipesRes,
        bossRes,
        dropsRes,
        monRes,
        questsRes,
        chainsRes,
        uniqueRes,
        titlesRes,
        configRes,
        expRes,
        spawnsRes,
      ] = await Promise.all([
        fetch('/data/world/maps.json'),
        fetch('/data/world/classes.json'),
        fetch('/data/world/skills.json'),
        fetch('/data/world/cities.json'),
        fetch('/data/world/world_items.json'),
        fetch('/data/world/equipment_sets.json'),
        fetch('/data/world/crafting_recipes.json'),
        fetch('/data/world/boss_configs.json'),
        fetch('/data/world/drop_tables.json'),
        fetch('/data/world/monsters.json'),
        fetch('/data/world/quests.json'),
        fetch('/data/world/quest_chains.json'),
        fetch('/data/world/unique_equipment.json'),
        fetch('/data/world/titles.json'),
        fetch('/data/world/world_config.json'),
        fetch('/data/world/exp_tables.json'),
        fetch('/data/world/monster_spawn_zones.json'),
      ]);
      if (mapsRes.ok) this.worldRegions = await mapsRes.json();
      if (classesRes.ok) this.worldClasses = await classesRes.json();
      if (skillsRes.ok) this.worldSkills = await skillsRes.json();
      if (citiesRes.ok) this.worldCities = await citiesRes.json();
      if (itemsRes.ok) this.worldItems = await itemsRes.json();
      if (setsRes.ok) this.worldEquipmentSets = await setsRes.json();
      if (recipesRes.ok) this.worldCraftingRecipes = await recipesRes.json();
      if (bossRes.ok) this.worldBossConfigs = await bossRes.json();
      if (dropsRes.ok) this.worldDropTables = await dropsRes.json();
      if (expRes.ok) this.worldExpTables = await expRes.json();
      if (spawnsRes.ok) this.worldSpawnZones = await spawnsRes.json();
      if (questsRes.ok) {
        const list = (await questsRes.json()) as QuestDefinition[];
        this.worldQuestsCatalog = list.filter((q) => q.status !== 'archived');
      }
      if (chainsRes.ok) {
        const list = (await chainsRes.json()) as QuestChainDefinition[];
        this.worldQuestChains = list.filter((c) => c.status !== 'archived');
      }
      if (uniqueRes.ok) {
        const list = (await uniqueRes.json()) as UniqueEquipmentDefinition[];
        this.worldUniqueEquipment = list.filter((u) => u.status !== 'archived');
      }
      if (titlesRes.ok) {
        const list = (await titlesRes.json()) as TitleDefinition[];
        this.worldTitles = list.filter((t) => t.status !== 'archived');
      }
      if (configRes.ok) {
        const cfg = await configRes.json();
        if (cfg?.titleBonusLimits) {
          this.worldTitleBonusLimits = { ...DEFAULT_TITLE_BONUS_LIMITS, ...cfg.titleBonusLimits };
        }
        if (cfg?.expBalanceConfig) {
          this.worldExpBalanceConfig = {
            ...DEFAULT_EXP_BALANCE_CONFIG,
            ...cfg.expBalanceConfig,
            levelPenalty: {
              ...DEFAULT_EXP_BALANCE_CONFIG.levelPenalty,
              ...(cfg.expBalanceConfig.levelPenalty || {}),
            },
          };
        }
      }
      if (monRes.ok) {
        this.worldMonsters = await monRes.json();
        for (const m of this.monsters) {
          const meta = this.worldMonsters.find((wm: any) => wm.id === m.monsterId || wm.id === m.id);
          const bossCfg = this.worldBossConfigs.find((bc: any) => bc.monsterId === m.monsterId || bc.monsterId === m.id);
          if (meta) {
            m.category = meta.category || m.category;
            m.isElite = Boolean(meta.isElite || m.category === 'ELITE');
            m.portraitUrl = meta.portraitUrl || bossCfg?.portraitUrl || m.portraitUrl;
            m.spriteAsset = meta.spriteAsset || m.spriteAsset;
            m.visualScale = Number(meta.visualScale || m.visualScale || 1);
            if (!m.visualFilter && meta.visualFilter) m.visualFilter = meta.visualFilter;
            if (meta.isBoss) m.isBoss = true;
          }
        }
        this.expandOfflineTrainingSpawns();
      }
      this.rebuildClassSkillTree();
      this.evaluateClientTitleUnlocks();
      this.recalculateClientTitleBonuses(false);
      this.emitHudSnapshot();
    } catch (err) {
      console.warn('[GameEngine] World catalog preload failed:', err);
    }
  }

  private expandOfflineTrainingSpawns() {
    if (this.monsters.some((m) => m.serverControlled)) return;
    if (!isTrainingRegionId(this.regionId) || isSafeVillageId(this.regionId)) return;
    if (this.monsters.some((m) => m.id.includes('__x3_'))) return;

    const clones: MonsterEntity[] = [];
    for (const orig of this.monsters) {
      const meta = this.worldMonsters.find((wm: any) => wm.id === orig.monsterId);
      const isBossOrElite = Boolean(orig.isBoss || orig.isElite || orig.category === 'ELITE' || meta?.isBoss || meta?.isElite);
      if (isBossOrElite) continue;
      for (let copyIdx = 1; copyIdx <= 2; copyIdx++) {
        const ang = copyIdx * 2.1 + Math.random() * 1.1;
        const rad = 36 + copyIdx * 22;
        const candX = Math.max(64, Math.min(this.tilemap.worldWidth - 64, orig.x + Math.cos(ang) * rad));
        const candY = Math.max(64, Math.min(this.tilemap.worldHeight - 64, orig.y + Math.sin(ang) * rad));
        const resolved = this.tilemap.canOccupyFootprint(candX, candY) ? { x: candX, y: candY } : { x: orig.x, y: orig.y };
        clones.push(
          new MonsterEntity({
            id: `${orig.id}__x3_${copyIdx}`,
            monsterId: orig.monsterId,
            name: orig.name,
            spriteId: orig.spriteId,
            visualFilter: orig.visualFilter,
            category: orig.category,
            isBoss: false,
            isElite: false,
            portraitUrl: orig.portraitUrl,
            spriteAsset: orig.spriteAsset,
            visualScale: orig.visualScale,
            respawnSec: orig.respawnSec,
            aiBehavior: orig.aiBehavior,
            aggroRange: orig.aggroRange,
            expReward: orig.expReward,
            goldReward: orig.goldReward,
            x: resolved.x,
            y: resolved.y,
            level: orig.level,
            hp: orig.maxHp,
            mp: orig.maxMp,
          })
        );
      }
    }
    this.monsters.push(...clones);
  }

  public hasAwakeningCertificate(): boolean {
    return this.inventory.some((i) => i.id === 'ITEM_AWAKENING_CERTIFICATE' || i.name.includes('Awakening Certificate'));
  }

  public async switchRegion(targetRegionId: string, options?: { fromExit?: MapExitDef; targetTx?: number; targetTy?: number; mode?: 'solo' | 'party'; silentTransition?: boolean }) {
    if (this.isSwitchingRegion) return false;
    const regionMeta = this.worldRegions.find((r) => r.id === targetRegionId);
    const reqLevel = options?.fromExit?.requiredLevel ?? regionMeta?.requiredLevel ?? 1;

    if (this.player.level < reqLevel) {
      this.onToast?.(`Khu vực yêu cầu Cấp ${reqLevel} (hiện tại Lv.${this.player.level}). Hãy luyện cấp thêm!`);
      return false;
    }

    // Sanctum of Awakening rules (Lv.15+, beginner quest done, Floor sequencing, no unauthorized re-entry once completed)
    if (targetRegionId === 'dungeon_sanctum_of_awakening' || targetRegionId === 'dungeon_sanctum_f1') {
      targetRegionId = 'dungeon_sanctum_f1';
      if (this.player.level < 15) {
        this.onToast?.('Thánh Điện Thức Tỉnh yêu cầu đạt Lv.15 trở lên!');
        return false;
      }
      if (!this.isBeginnerQuestCompleted()) {
        this.onToast?.('Cần hoàn thành nhiệm vụ tân thủ "Dọn Sạch Ngoại Ô Làng" trước khi bước vào Thánh Điện Thức Tỉnh!');
        return false;
      }
      if (this.player.sanctumCompleted || this.player.jobAdvancementCompleted || this.hasAwakeningCertificate() || !isPreJobClass(this.player.classId)) {
        this.onToast?.('Bạn đã hoàn thành Thánh Điện Thức Tỉnh rồi! Không thể vào lại để nhận thưởng trùng.');
        return false;
      }
      this.dungeonState = {
        instanceId: `LOCAL_DUN_${Date.now().toString(36)}`,
        active: true,
        mode: options?.mode || 'solo',
        currentFloor: 1,
        collectedFragments: this.dungeonState.active ? this.dungeonState.collectedFragments : [],
        activatedPillars: this.dungeonState.active ? this.dungeonState.activatedPillars : [],
        bossDefeated: false,
        rewardClaimed: false,
      };
    } else if (targetRegionId === 'dungeon_sanctum_f2') {
      if (this.dungeonState.collectedFragments.length < 3) {
        this.onToast?.(`Cần thu thập đủ 3/3 Mảnh Nguyên Tố ở Tầng 1 trước khi sang Tầng 2 (${this.dungeonState.collectedFragments.length}/3).`);
        return false;
      }
      this.dungeonState.currentFloor = 2;
    } else if (targetRegionId === 'dungeon_sanctum_f3') {
      if (this.dungeonState.activatedPillars.length < 4) {
        this.onToast?.(`Cần kích hoạt đủ 4/4 Trụ Nguyên Tố ở Tầng 2 trước khi vào Tầng 3 (${this.dungeonState.activatedPillars.length}/4).`);
        return false;
      }
      this.dungeonState.currentFloor = 3;
    }

    const fileSlug = targetRegionId === 'THON_KHOI_NGUYEN' || targetRegionId === 'VIL_STARTER' ? 'thon_khoi_nguyen' : targetRegionId;
    this.isSwitchingRegion = true;
    this.autoCombatConfig.enabled = false;

    if (!options?.silentTransition) {
      this.spawnVfx('vfx_sacred_bless', this.player.x, this.player.y - 14, 128);
      this.onMapTransitionState?.({
        active: true,
        title: regionMeta?.name || targetRegionId,
        subtitle: regionMeta?.subtitle || GAME_BRANDING.slogan,
        reduced: this.reducedEffects,
      });
    }

    try {
      const waitDelay = options?.silentTransition ? 0 : (this.reducedEffects ? 90 : 280);
      const [res] = await Promise.all([
        fetch(`/data/maps/${fileSlug}.json`),
        waitDelay > 0 ? new Promise((r) => setTimeout(r, waitDelay)) : Promise.resolve(),
      ]);
      if (!res.ok) {
        this.onToast?.(`Không tải được dữ liệu bản đồ ${targetRegionId}.`);
        return false;
      }
      const nextMap = (await res.json()) as VillageMapData;
      this.regionId = nextMap.id;
      this.tilemap = new TilemapEngine(nextMap, this.artwork);
      this.tilemap.activeInteractableFilter = (id) =>
        this.dungeonState.collectedFragments.includes(id) ||
        this.dungeonState.activatedPillars.includes(id) ||
        (id === 'boss_altar' && this.dungeonState.bossDefeated);

      const spawnTx = options?.targetTx ?? options?.fromExit?.targetTx ?? nextMap.spawns.player.tx;
      const spawnTy = options?.targetTy ?? options?.fromExit?.targetTy ?? nextMap.spawns.player.ty;
      const worldPt = this.tilemap.tileToWorldCenter(spawnTx, spawnTy);
      this.player.x = worldPt.x;
      this.player.y = worldPt.y;
      this.player.pathQueue = [];
      this.populateMapEntities(nextMap);
      for (const m of this.monsters) {
        const meta = this.worldMonsters.find((wm: any) => wm.id === m.monsterId);
        if (meta) {
          m.category = meta.category || m.category;
          m.isElite = Boolean(meta.isElite || m.category === 'ELITE');
          m.portraitUrl = meta.portraitUrl || m.portraitUrl;
          m.spriteAsset = meta.spriteAsset || m.spriteAsset;
          m.visualScale = Number(meta.visualScale || m.visualScale || 1);
        }
      }
      this.expandOfflineTrainingSpawns();
      this.remotePlayers.clear();

      if (isSafeVillageId(nextMap.id)) {
        if (!this.discoveredVillageIds.includes(nextMap.id)) {
          this.discoveredVillageIds.push(nextMap.id);
          const cp = SAFE_VILLAGE_CHECKPOINTS.find((v) => v.id === nextMap.id);
          this.onToast?.(`🏰 Đã mở khóa Điểm Hồi Sinh An Toàn: ${cp?.nameVi || nextMap.name}!`);
        }
        this.latestVillageCheckpointId = nextMap.id;
        if (this.serverCharacterId) {
          void setCheckpointApi(this.serverCharacterId, nextMap.id, false);
        }
      }

      this.multiplayer?.emitChangeRegion(nextMap.id);
      this.centerCameraImmediate();
      this.resize();
      if (!options?.silentTransition) {
        this.spawnVfx('vfx_divine_heal', this.player.x, this.player.y - 16, 136);
        this.onRegionChange?.(nextMap.name, nextMap.subtitle, Boolean(nextMap.isSafeZone));
        this.onToast?.(`Đã tiến vào ${nextMap.name} (${nextMap.subtitle})`);
      }
      this.recordClientQuestProgress({ type: 'EXPLORE_MAP', targetId: nextMap.id });
      this.saveLocalProgress();
      this.scheduleServerStateSync(true);
      this.onMinimapDraw?.(this.tilemap, this.player, this.npcs, this.monsters);
      return true;
    } finally {
      this.isSwitchingRegion = false;
      this.onMapTransitionState?.({ active: false, reduced: this.reducedEffects });
    }
  }

  public interactDungeonObject(objId: string) {
    const item = this.tilemap.map.spawns.interactables?.find((it) => it.id === objId);
    if (!item) return false;
    if (item.type === 'fragment') {
      if (this.dungeonState.collectedFragments.includes(item.id)) {
        this.onToast?.(`${item.name} đã được thu thập trước đó.`);
        return false;
      }
      this.dungeonState.collectedFragments.push(item.id);
      const n = this.dungeonState.collectedFragments.length;
      this.floatingTexts.push({ x: this.player.x, y: this.player.y - 48, text: `Mảnh Nguyên Tố ${n}/3`, color: '#fde047', ttlMs: 1100 });
      this.onToast?.(n >= 3 ? `Đã đủ 3/3 Mảnh Nguyên Tố! Hãy tiến qua Cổng Tầng 2 ở phía Đông.` : `Thu thập ${item.name} (${n}/3).`);
      this.emitHudSnapshot();
      return true;
    }
    if (item.type === 'pillar') {
      if (this.dungeonState.activatedPillars.includes(item.id)) {
        this.onToast?.(`${item.name} đã kích hoạt!`);
        return false;
      }
      this.dungeonState.activatedPillars.push(item.id);
      const n = this.dungeonState.activatedPillars.length;
      this.floatingTexts.push({ x: this.player.x, y: this.player.y - 48, text: `Trụ Nguyên Tố ${n}/4`, color: '#38bdf8', ttlMs: 1100 });
      this.onToast?.(n >= 4 ? `Tứ Trụ Khai Ấn (4/4)! Cánh cửa vào Thánh Điện Boss Tầng 3 đã mở!` : `Kích hoạt ${item.name} (${n}/4).`);
      this.emitHudSnapshot();
      return true;
    }
    if (item.type === 'boss_altar') {
      this.onToast?.('Guardian of Awakening đang chờ ở chính điện — hãy đánh bại nó để nhận Chứng Chỉ Thức Tỉnh!');
      return true;
    }
    return false;
  }

  public isBeginnerQuestCompleted(): boolean {
    const q1 = this.quests.find((q) => q.id === 'q_slime');
    return Boolean(this.player.completedQuests.includes('QUEST_001_SLIME_CLEAR') || q1?.claimed);
  }

  private convertWorldItemToInventoryDef(itemMeta: any, qty = 1): InventoryItemDef {
    const slotRaw = itemMeta.equipSlot || itemMeta.equip_slot;
    const isEquip =
      itemMeta.category === 'weapon' ||
      itemMeta.category === 'armor' ||
      itemMeta.category === 'accessory' ||
      itemMeta.category === 'equip';
    const eqStats = itemMeta.equipmentStats || itemMeta.equipment_stats || {};
    const iconKey =
      itemMeta.iconKey ||
      (slotRaw === 'head'
        ? 'helm_bronze'
        : slotRaw === 'armor'
        ? 'armor_plate'
        : slotRaw === 'gloves'
        ? 'gloves_leather'
        : slotRaw === 'boots'
        ? 'boots_leather'
        : slotRaw === 'shoulder'
        ? 'shoulder_plate'
        : slotRaw === 'necklace'
        ? 'amulet_jade'
        : slotRaw === 'ring1' || slotRaw === 'ring2'
        ? 'ring_band'
        : slotRaw === 'cloak'
        ? 'cloak_wind'
        : itemMeta.weaponType === 'bow' || itemMeta.weaponType === 'crossbow'
        ? 'bow_ranger'
        : itemMeta.weaponType === 'staff' || itemMeta.weaponType === 'holy_staff'
        ? 'staff_holy'
        : itemMeta.weaponType === 'spellbook'
        ? 'spellbook_arcane'
        : itemMeta.weaponType === 'dual_daggers'
        ? 'dual_daggers'
        : itemMeta.weaponType === 'spear' || itemMeta.weaponType === 'halberd' || itemMeta.weaponType === 'lance'
        ? 'spear_iron'
        : itemMeta.weaponType === 'gauntlets' || itemMeta.weaponType === 'fist'
        ? 'gauntlets_fist'
        : itemMeta.id?.startsWith('FRAG_')
        ? 'fragment_crystal'
        : itemMeta.id?.startsWith('MAT_')
        ? 'boss_core'
        : itemMeta.id?.startsWith('ITEM_UPGRADE_')
        ? 'upgrade_stone'
        : 'sword_novice');

    return {
      id: itemMeta.id,
      name: itemMeta.nameVi || itemMeta.name || itemMeta.id,
      category: isEquip ? 'equip' : itemMeta.category === 'consumable' ? 'consumable' : 'material',
      rarity: (itemMeta.rarity || 'common') as ItemRarity,
      iconKey,
      iconUrl: itemMeta.iconAsset || itemMeta.iconUrl,
      qty,
      equipSlot: isEquip ? (normalizeEquipSlot(slotRaw, itemMeta.category, slotRaw) as EquipSlotKey) : undefined,
      weaponType: itemMeta.weaponType || itemMeta.weapon_type,
      allowedClasses: itemMeta.allowedClasses || itemMeta.jobRestriction,
      requiredLevel: itemMeta.requiredLevel,
      setId: itemMeta.setId,
      upgradeLevel: itemMeta.upgradeLevel || 0,
      maxUpgradeLevel: itemMeta.maxUpgradeLevel || RARITY_CONFIGS[(itemMeta.rarity || 'common') as ItemRarity]?.maxUpgradeLevel || 10,
      isUnique: Boolean(itemMeta.isUnique),
      isAccountBound: Boolean(itemMeta.isAccountBound),
      isCharacterBound: Boolean(itemMeta.isCharacterBound),
      passiveEffects: itemMeta.passiveEffects,
      acquisitionCondition: itemMeta.acquisitionCondition,
      atkBonus: eqStats.attack ?? itemMeta.attackPower ?? itemMeta.atkBonus ?? 0,
      matkBonus: eqStats.magicAttack ?? itemMeta.magicAttackPower ?? itemMeta.matkBonus ?? 0,
      defBonus: eqStats.physicalDefense ?? itemMeta.defBonus ?? 0,
      mdefBonus: eqStats.magicalDefense ?? itemMeta.mdefBonus ?? 0,
      hpBonus: eqStats.maxHp ?? itemMeta.hpBonus ?? 0,
      mpBonus: eqStats.maxMp ?? itemMeta.mpBonus ?? 0,
      critRate: eqStats.critRatePct ?? itemMeta.critRate ?? 0,
      hpRestore: itemMeta.hpRestore,
      mpRestore: itemMeta.mpRestore,
      desc: itemMeta.description || itemMeta.desc || '',
    };
  }

  public rebuildClassSkillTree() {
    const catalog = this.worldSkills.length ? this.worldSkills : INITIAL_SKILLS;
    if (isPreJobClass(this.player.classId)) {
      const noviceList = getSkillTreeForClass('adventurer', catalog).filter((s) =>
        ['SKILL_NOVICE_SLASH', 'SKILL_NOVICE_FIREBALL'].includes(s.id)
      );
      const source = noviceList.length === 2 ? noviceList : INITIAL_SKILLS.filter((s) => s.classId === 'adventurer');
      const mappedNovice: SkillSlotDef[] = source.slice(0, 2).map((s, idx) => ({
        id: s.id,
        key: s.hotkey || String(idx + 1),
        name: s.nameVi || s.name,
        desc: s.description || '',
        mpCost: Number(s.mpCost ?? s.manaCost ?? 0),
        cooldownSec: Number(s.cooldown ?? 1),
        rangePx: Number(s.range || 100),
        damage: Math.round(45 * Number(s.damageMultiplier || 1.25)),
        iconKey: s.element === 'fire' ? 'skill_flame_slash' : 'skill_azure_wave',
        vfxKey: s.vfxKey || 'vfx_sword_slash',
        iconUrl: s.vfxKey ? `/assets/elysia/vfx/${s.vfxKey}_thumb.png` : undefined,
        color: s.element === 'fire' ? '#f97316' : '#38bdf8',
        locked: false,
        classId: 'adventurer',
        tier: 'starter',
        skillType: 'active',
        skillKind: 'attack',
        targetType: s.targetType,
        requiredLevel: 1,
        spCost: 1,
        skillLevel: Number(this.skillLevels[s.id] || 1),
        maxLevel: s.maxLevel ?? 5,
      }));
      this.skills.splice(0, this.skills.length, ...mappedNovice);
      return;
    }

    const tree = getSkillTreeForClass(this.player.classId, catalog, this.advancedJobId || undefined);
    if (!tree.length) return;

    let hotbarCounter = 1;
    const mapped: SkillSlotDef[] = tree.map((s) => {
      const isPassive = s.skillType === 'passive' || s.tier === 'passive';
      const locked =
        this.player.level < Number(s.requiredLevel || 15) ||
        (Boolean(s.advancedBranchId) && s.advancedBranchId !== this.advancedJobId);
      const key = isPassive ? '' : s.hotkey || (hotbarCounter <= 6 ? String(hotbarCounter++) : '');
      const lv = Math.max(1, Number(this.skillLevels[s.id] || 1));
      if (!this.skillLevels[s.id] && !locked) {
        this.skillLevels[s.id] = 1;
      }
      const mProg = this.skillMastery[s.id];
      const mPts = Number(mProg?.points || 0);
      const evo = resolveSkillEvolutionState(s, locked ? 1 : lv, mPts);
      return {
        id: s.id,
        key,
        name: s.nameVi || s.name,
        desc: s.description || s.damageFormula || '',
        mpCost: Number(s.mpCost || 0),
        cooldownSec: Number((evo.effectiveCooldownMs / 1000).toFixed(2)),
        rangePx: Number(s.range || 120),
        damage: Math.round(90 * Number(evo.totalDamageMultiplier || s.damageMultiplier || 1.2)),
        iconKey: s.element === 'fire' ? 'skill_flame_slash' : s.element === 'holy' ? 'skill_golden_aura' : 'skill_azure_wave',
        vfxKey: s.vfxKey || 'vfx_sword_slash',
        vfxId: s.vfxId || s.vfxKey || 'vfx_sword_slash',
        iconUrl: s.vfxKey ? `/assets/elysia/vfx/${s.vfxKey}_thumb.png` : undefined,
        color:
          s.element === 'fire'
            ? '#f97316'
            : s.element === 'water' || s.element === 'ice'
            ? '#38bdf8'
            : s.element === 'holy'
            ? '#facc15'
            : s.element === 'shadow' || s.element === 'arcane'
            ? '#a855f7'
            : '#22c55e',
        locked,
        classId: s.classId,
        advancedBranchId: s.advancedBranchId,
        executionType: s.executionType,
        areaRadius: evo.effectiveAreaRadius,
        hitCount: evo.totalHitCount,
        tier: s.tier,
        skillType: s.skillType === 'passive' ? 'passive' : s.tier === 'ultimate' ? 'ultimate' : 'active',
        skillKind: Number(s.healMultiplier || 0) > 0 ? 'heal' : 'attack',
        targetType: s.targetType,
        requiredLevel: s.requiredLevel,
        spCost: s.skillPointCost ?? 1,
        skillLevel: locked ? 0 : lv,
        maxLevel: s.maxLevel ?? 10,
        masteryPoints: mPts,
        masteryRank: mProg?.rank || getMasteryRankFromPoints(mPts),
        evolutionTier: evo.evolutionTier,
        evolutionMilestones: s.evolutionMilestones || [],
        prerequisiteSkillIds: s.prerequisiteSkillIds,
        effects: s.effects?.map((e: any) => ({
          kind: e.kind,
          stat: e.stat,
          value: e.valuePct ?? e.flatValue,
          durationSec: e.durationSec,
        })),
      };
    });

    this.skills.splice(0, this.skills.length, ...mapped);
  }

  private buildSyncStatePayload() {
    return {
      level: this.player.level,
      exp: this.player.exp,
      gold: this.gold,
      potentialPoints: this.player.potentialPoints,
      skillPoints: this.skillPoints,
      skillLevels: this.skillLevels,
      regionId: this.regionId,
      x: Math.round(this.player.x),
      y: Math.round(this.player.y),
      hp: Math.round(this.player.hp),
      mp: Math.round(this.player.mp),
      visitedMaps: this.visitedMaps,
      completedQuests: this.player.completedQuests,
      completedQuestHistory: this.completedQuestHistory,
      activeQuests: this.activeWorldQuests,
      trackedQuestId: this.trackedQuestId,
      discoveredHiddenQuests: this.discoveredHiddenQuests,
      monsterKillCounts: this.monsterKillCounts,
      inventory: this.inventory.map((i) => ({
        itemId: i.id,
        name: i.name,
        category: i.category,
        rarity: i.rarity,
        quantity: i.qty,
      })),
      autoCombatConfig: this.autoCombatConfig,
    };
  }

  public scheduleServerStateSync(immediate = false) {
    if (!this.serverCharacterId) return;
    if (this.syncDebounceTimer) {
      window.clearTimeout(this.syncDebounceTimer);
      this.syncDebounceTimer = null;
    }
    const run = () => {
      if (!this.serverCharacterId) return;
      this.lastServerSyncAtMs = Date.now();
      void syncCharacterStateApi(this.serverCharacterId, this.buildSyncStatePayload());
    };
    if (immediate) {
      run();
    } else {
      this.syncDebounceTimer = window.setTimeout(run, 1100);
    }
  }

  public flushServerSyncOnUnload() {
    this.saveLocalProgress();
    if (!this.serverCharacterId) return;
    const token = getAuthToken();
    if (!token) return;
    const base = ((import.meta as any).env?.VITE_API_URL || 'http://localhost:4000/api/v1');
    try {
      void fetch(`${base}/characters/${encodeURIComponent(this.serverCharacterId)}/sync-state`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(this.buildSyncStatePayload()),
        keepalive: true,
      });
    } catch {
      // ignore unload fetch restrictions
    }
  }

  private saveLocalProgress() {
    try {
      const payload = {
        saveVersion: 2,
        updatedAtMs: Date.now(),
        serverCharacterId: this.serverCharacterId,
        level: this.player.level,
        exp: this.player.exp,
        hp: Math.round(this.player.hp),
        mp: Math.round(this.player.mp),
        dead: this.player.dead,
        regionId: this.regionId,
        x: Math.round(this.player.x),
        y: Math.round(this.player.y),
        gold: this.gold,
        potentialPoints: this.player.potentialPoints,
        skillPoints: this.skillPoints,
        skillLevels: this.skillLevels,
        pityCounters: this.pityCounters,
        classId: this.player.classId,
        jobAdvancementCompleted: this.player.jobAdvancementCompleted,
        advancedJobId: this.advancedJobId,
        advancedJobName: this.advancedJobName,
        skillMastery: this.skillMastery,
        passiveAllocations: this.passiveAllocations,
        passiveTransactions: this.passiveTransactions,
        passiveRespecCount: this.passiveRespecCount,
        evolutionTier: this.player.evolutionTier,
        sanctumCompleted: this.player.sanctumCompleted,
        completedQuests: this.player.completedQuests,
        completedQuestHistory: this.completedQuestHistory,
        activeWorldQuests: this.activeWorldQuests,
        trackedQuestId: this.trackedQuestId,
        discoveredHiddenQuests: this.discoveredHiddenQuests,
        questChainProgress: this.questChainProgress,
        visitedMaps: this.visitedMaps,
        discoveredVillageIds: this.discoveredVillageIds,
        latestVillageCheckpointId: this.latestVillageCheckpointId,
        preferredResurrectionVillageId: this.preferredResurrectionVillageId,
        deathPenalty: this.deathPenalty,
        deathCount: this.deathCount,
        autoCombatConfig: this.autoCombatConfig,
        monsterKillCounts: this.monsterKillCounts,
        dialogueFlags: this.dialogueFlags,
        ownedUniqueEquipmentIds: this.ownedUniqueEquipmentIds,
        unlockedTitles: this.unlockedTitles,
        equippedCosmeticTitleId: this.equippedCosmeticTitleId,
        claimedRewardKeys: this.claimedRewardKeys,
        cachedTitleBonuses: this.cachedTitleBonuses,
        baseStats: this.player.baseStats,
        attributes: this.player.attributes,
        equipment: this.equipment,
        inventory: this.inventory,
        awakeningResult: this.awakeningResult,
      };
      const serialized = JSON.stringify(payload);
      localStorage.setItem('elysia_character_save_v1', serialized);
      if (this.serverCharacterId) {
        localStorage.setItem(`elysia_char_save_v2_${this.serverCharacterId}`, serialized);
      }
    } catch {
      // ignore storage quota errors
    }
  }

  private readLocalSaveForCharacter(characterId?: string | null): any | null {
    try {
      if (characterId) {
        const scopedRaw = localStorage.getItem(`elysia_char_save_v2_${characterId}`);
        if (scopedRaw) {
          const parsed = JSON.parse(scopedRaw);
          if (parsed && typeof parsed.level === 'number') return parsed;
        }
      }
      const raw = localStorage.getItem('elysia_character_save_v1');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.level !== 'number') return null;
      if (characterId && parsed.serverCharacterId && parsed.serverCharacterId !== characterId) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private restoreLocalProgress() {
    try {
      if (window.location.search.includes('fresh=1')) {
        localStorage.removeItem('elysia_character_save_v1');
        return;
      }
      const cached = getActiveCharacterCache();
      const saved = this.readLocalSaveForCharacter(cached?.id || null);
      if (!saved) return;
      if (saved && typeof saved.level === 'number') {
        if (typeof saved.serverCharacterId === 'string') {
          this.serverCharacterId = saved.serverCharacterId;
        }
        this.player.level = saved.level;
        this.player.exp = Number(saved.exp || 0);
        this.player.maxExp = expRequiredForLevel(this.player.level);
        this.gold = Number(saved.gold ?? this.gold);
        this.player.potentialPoints = Number(saved.potentialPoints ?? 0);
        this.skillPoints = Number(saved.skillPoints ?? this.skillPoints);
        if (saved.skillLevels) this.skillLevels = { ...saved.skillLevels };
        if (saved.pityCounters) this.pityCounters = { ...saved.pityCounters };
        if (Array.isArray(saved.discoveredVillageIds) && saved.discoveredVillageIds.length > 0) {
          this.discoveredVillageIds = saved.discoveredVillageIds;
        }
        if (typeof saved.latestVillageCheckpointId === 'string') {
          this.latestVillageCheckpointId = saved.latestVillageCheckpointId;
        }
        if (saved.preferredResurrectionVillageId !== undefined) {
          this.preferredResurrectionVillageId = saved.preferredResurrectionVillageId;
        }
        if (saved.deathPenalty && Number(saved.deathPenalty.expiresAt || 0) > Date.now()) {
          this.deathPenalty = saved.deathPenalty;
        } else {
          this.deathPenalty = null;
        }
        this.deathCount = Number(saved.deathCount || 0);
        if (saved.autoCombatConfig && typeof saved.autoCombatConfig === 'object') {
          this.autoCombatConfig = { ...DEFAULT_AUTO_COMBAT_CONFIG, ...saved.autoCombatConfig, enabled: false };
        }
        this.player.classId = saved.classId || 'adventurer';
        this.player.jobAdvancementCompleted = Boolean(saved.jobAdvancementCompleted);
        this.advancedJobId = typeof saved.advancedJobId === 'string' ? saved.advancedJobId : null;
        this.advancedJobName = typeof saved.advancedJobName === 'string' ? saved.advancedJobName : null;
        if (saved.skillMastery && typeof saved.skillMastery === 'object') {
          this.skillMastery = { ...saved.skillMastery };
        }
        if (saved.passiveAllocations && typeof saved.passiveAllocations === 'object') {
          this.passiveAllocations = { ...saved.passiveAllocations };
        }
        if (Array.isArray(saved.passiveTransactions)) {
          this.passiveTransactions = saved.passiveTransactions.slice(-30);
        }
        this.passiveRespecCount = Number(saved.passiveRespecCount || 0);
        this.player.evolutionTier = Number(saved.evolutionTier || 0);
        this.player.sanctumCompleted = Boolean(saved.sanctumCompleted);
        this.player.completedQuests = Array.isArray(saved.completedQuests) ? saved.completedQuests : [];
        if (saved.completedQuestHistory && typeof saved.completedQuestHistory === 'object') {
          this.completedQuestHistory = { ...saved.completedQuestHistory };
        }
        if (saved.activeWorldQuests && typeof saved.activeWorldQuests === 'object') {
          this.activeWorldQuests = { ...saved.activeWorldQuests };
        }
        if (saved.trackedQuestId !== undefined) {
          this.trackedQuestId = saved.trackedQuestId && this.activeWorldQuests[saved.trackedQuestId] ? saved.trackedQuestId : null;
        }
        if (Array.isArray(saved.discoveredHiddenQuests)) {
          this.discoveredHiddenQuests = saved.discoveredHiddenQuests;
        }
        if (saved.questChainProgress && typeof saved.questChainProgress === 'object') {
          this.questChainProgress = { ...saved.questChainProgress };
        }
        if (Array.isArray(saved.visitedMaps) && saved.visitedMaps.length > 0) {
          this.visitedMaps = saved.visitedMaps;
        }
        if (saved.monsterKillCounts && typeof saved.monsterKillCounts === 'object') {
          this.monsterKillCounts = { ...saved.monsterKillCounts };
        }
        if (Array.isArray(saved.dialogueFlags)) {
          this.dialogueFlags = saved.dialogueFlags;
        }
        if (Array.isArray(saved.ownedUniqueEquipmentIds)) {
          this.ownedUniqueEquipmentIds = saved.ownedUniqueEquipmentIds;
        }
        if (Array.isArray(saved.unlockedTitles)) {
          this.unlockedTitles = saved.unlockedTitles;
        }
        if (saved.equippedCosmeticTitleId !== undefined) {
          this.equippedCosmeticTitleId = saved.equippedCosmeticTitleId;
        }
        if (Array.isArray(saved.claimedRewardKeys)) {
          this.claimedRewardKeys = saved.claimedRewardKeys;
        }
        if (saved.baseStats) {
          this.player.baseStats = { ...saved.baseStats };
          this.player.attributes = { ...(saved.attributes || saved.baseStats) };
        }
        if (saved.equipment && typeof saved.equipment === 'object') {
          const migrated: Partial<Record<EquipSlotKey, InventoryItemDef>> = {};
          for (const [k, v] of Object.entries(saved.equipment as Record<string, InventoryItemDef>)) {
            if (!v) continue;
            const slot = normalizeEquipSlot(k, v.category, v.equipSlot) as EquipSlotKey;
            migrated[slot] = { ...v, equipSlot: slot };
          }
          this.equipment = migrated;
        }
        if (Array.isArray(saved.inventory) && saved.inventory.length > 0) {
          this.inventory = saved.inventory.map((it: any) =>
            it.equipSlot ? { ...it, equipSlot: normalizeEquipSlot(it.equipSlot, it.category, it.equipSlot) as EquipSlotKey } : it
          );
        }
        if (saved.awakeningResult) {
          this.awakeningResult = saved.awakeningResult;
        }
        if (isPreJobClass(this.player.classId)) {
          this.skillLevels = {
            SKILL_NOVICE_SLASH: Math.max(1, Number(this.skillLevels.SKILL_NOVICE_SLASH || 1)),
            SKILL_NOVICE_FIREBALL: Math.max(1, Number(this.skillLevels.SKILL_NOVICE_FIREBALL || 1)),
          };
        }
        this.recalculateClientTitleBonuses(false);
        this.rebuildClassSkillTree();
      }
    } catch {
      // ignore invalid storage
    }
  }

  /**
   * Automatic First-Job Awakening (Server-Formula Parity · Zero Manual Choice).
   * Rejects manual class parameter; computes score purely from player Base Stats.
   */
  public triggerAutomaticJobAwakening(forbiddenManualClass?: string) {
    if (forbiddenManualClass) {
      this.onToast?.('Không thể tự chọn nghề thủ công! Hệ thống tự động đánh giá 5 chỉ số cơ bản.');
      return null;
    }

    // Idempotent replay when already awakened (supports disconnect/reload cinematic replay)
    if (this.player.jobAdvancementCompleted && !isPreJobClass(this.player.classId) && this.awakeningResult) {
      this.onAwakeningReveal?.(this.awakeningResult);
      return this.awakeningResult;
    }

    if (this.player.level < 15) {
      this.onToast?.(`Cần đạt Lv.15 để thực hiện Thức Tỉnh Nghề Nghiệp (hiện tại Lv.${this.player.level}).`);
      return null;
    }
    if (!this.isBeginnerQuestCompleted()) {
      this.onToast?.('Cần hoàn thành nhiệm vụ tân thủ "Dọn Sạch Ngoại Ô Làng" trước khi thức tỉnh!');
      return null;
    }
    if (!this.player.sanctumCompleted || !this.hasAwakeningCertificate()) {
      this.onToast?.('Cần vượt qua Thánh Điện Thức Tỉnh & có Chứng Chỉ Thức Tỉnh để thức tỉnh!');
      return null;
    }

    const certIdx = this.inventory.findIndex((i) => i.id === 'ITEM_AWAKENING_CERTIFICATE');
    if (certIdx >= 0) this.inventory.splice(certIdx, 1);

    // Evaluate purely from baseStats (NEVER equipment bonuses or consumables)
    const pureBase = { ...this.player.baseStats };
    const classDefs = this.worldClasses.length ? this.worldClasses : INITIAL_CLASSES;
    const { assignedClassId, scores } = classifyJobFromBaseStats(pureBase, classDefs);
    const classMeta = classDefs.find((c) => c.id === assignedClassId) || INITIAL_CLASSES.find((c) => c.id === assignedClassId)!;
    const gearPack = FIRST_JOB_STARTER_GEAR[assignedClassId as FirstJobClassId];

    this.player.classId = assignedClassId;
    this.player.jobAdvancementCompleted = true;
    this.player.evolutionTier = 1;
    this.skillPoints += 3;
    this.player.maxHp += 180;
    this.player.maxMp += 90;
    this.player.hp = this.player.maxHp;
    this.player.mp = this.player.maxMp;

    const skillCatalog = this.worldSkills.length ? this.worldSkills : INITIAL_SKILLS;
    const matchingSkills = getSkillTreeForClass(assignedClassId, skillCatalog);
    const labelName = classMeta ? `${classMeta.nameVi || classMeta.name} (${classMeta.name})` : assignedClassId.toUpperCase();
    const weaponIconMap: Record<string, string> = {
      swordsman: 'sword_novice',
      spearman: 'spear_iron',
      knight: 'shield_oak',
      monk: 'staff_holy',
      mage: 'spellbook_arcane',
      assassin: 'dual_daggers',
      fighter: 'gauntlets_fist',
      archer: 'bow_ranger',
    };

    this.rebuildClassSkillTree();

    const itemCatalog = this.worldItems.length ? this.worldItems : INITIAL_ITEMS;
    const wMeta = itemCatalog.find((i: any) => i.id === gearPack.weapon.itemId);
    const aMeta = itemCatalog.find((i: any) => i.id === gearPack.armor.itemId);

    const newWeapon: InventoryItemDef = wMeta
      ? this.convertWorldItemToInventoryDef(wMeta, 1)
      : {
          id: gearPack.weapon.itemId,
          name: gearPack.weapon.name,
          category: 'equip',
          rarity: 'uncommon',
          iconKey: weaponIconMap[assignedClassId] || 'sword_novice',
          qty: 1,
          equipSlot: 'weapon',
          weaponType: gearPack.weapon.weaponType,
          allowedClasses: [assignedClassId],
          atkBonus: gearPack.weapon.atkBonus,
          desc: `Vũ khí định mệnh dành riêng cho ${labelName}.`,
        };
    const newArmor: InventoryItemDef = aMeta
      ? this.convertWorldItemToInventoryDef(aMeta, 1)
      : {
          id: gearPack.armor.itemId,
          name: gearPack.armor.name,
          category: 'equip',
          rarity: 'uncommon',
          iconKey: 'armor_plate',
          qty: 1,
          equipSlot: 'armor',
          allowedClasses: [assignedClassId],
          defBonus: gearPack.armor.defBonus,
          desc: `Giáp thức tỉnh chuyên dụng của ${labelName}.`,
        };

    // Unequip starter equipment into Balo cleanly & equip class rewards
    if (this.equipment.weapon) this.inventory.unshift(this.equipment.weapon);
    if (this.equipment.armor) this.inventory.unshift(this.equipment.armor);
    this.equipment.weapon = newWeapon;
    this.equipment.armor = newArmor;

    const result: AwakeningResult = {
      characterId: 'player_main',
      characterName: this.player.name,
      assignedClassId: assignedClassId as FirstJobClassId,
      assignedClassName: labelName,
      assignedClassRole: classMeta.role,
      baseStatsSnapshot: pureBase,
      jobScores: scores,
      unlockedSkills: matchingSkills.map((ms) => ({
        id: ms.id,
        name: ms.name,
        nameVi: ms.nameVi || ms.name,
        description: ms.description || `Kỹ năng chuyên biệt của ${labelName}`,
        element: ms.element || 'neutral',
      })),
      grantedEquipment: {
        weapon: gearPack.weapon,
        armor: gearPack.armor,
      },
      artworkUrl: classMeta.artworkUrl || '/assets/elysia/ui/paperdoll-player.png',
      weaponArtworkUrl: classMeta.weaponArtworkUrl || '/assets/elysia/ui/portrait-player.png',
      awakenedAt: new Date().toISOString(),
    };

    this.awakeningResult = result;
    if (!this.player.completedQuests.includes('QUEST_JOB_05_DESTINY')) {
      this.player.completedQuests.push('QUEST_JOB_05_DESTINY');
    }
    this.evaluateClientTitleUnlocks();
    this.recalculateClientTitleBonuses(false);
    this.saveLocalProgress();
    this.playJobRitualVfx(assignedClassId);
    this.floatingTexts.push({ x: this.player.x, y: this.player.y - 72, text: `THỨC TỈNH: ${labelName}!`, color: '#fde047', ttlMs: 1800 });
    this.onToast?.(`Nghi lễ hoàn tất! 5 chỉ số của bạn thức tỉnh thành ${labelName}!`);
    this.emitHudSnapshot();
    const revealDelay = this.reducedEffects ? 350 : 1200;
    window.setTimeout(() => {
      this.onAwakeningReveal?.(result);
    }, revealDelay);
    return result;
  }

  public playJobRitualVfx(jobId: string, onComplete?: () => void) {
    const priest = this.npcs.find((n) => n.id === 'NPC_HIGH_PRIEST' || n.serviceType === 'job_advancement');
    if (priest) {
      priest.faceVector(this.player.x - priest.x, this.player.y - priest.y);
      priest.setState('skill');
    }
    const ritualPt = this.tilemap.map.ritualCircle
      ? this.tilemap.tileToWorldCenter(this.tilemap.map.ritualCircle.tx, this.tilemap.map.ritualCircle.ty)
      : { x: this.player.x, y: this.player.y };
    const profile = this.vfxEngine.playJobAdvancementRitual(jobId, ritualPt.x, ritualPt.y, {
      casterX: priest?.x,
      casterY: priest?.y,
      reducedEffects: this.reducedEffects,
      onComplete: () => {
        if (priest && priest.state === 'skill') priest.setState('idle');
        onComplete?.();
      },
    });
    return profile;
  }

  public replayJobRitualVfx(jobId?: string) {
    const targetJob = jobId || this.advancedJobId || (isPreJobClass(this.player.classId) ? 'swordsman' : this.player.classId);
    this.playJobRitualVfx(targetJob);
  }

  public async selectLv80AdvancedBranch(branchId: string): Promise<boolean> {
    if (isPreJobClass(this.player.classId) || !this.player.jobAdvancementCompleted) {
      this.onToast?.('Cần hoàn thành Thức Tỉnh Nghề Lv.15 trước khi Chuyển Chức Lv.80!');
      return false;
    }
    if (this.player.level < 80) {
      this.onToast?.(`Cần đạt Lv.80 để Chuyển Chức Nâng Cao (hiện tại Lv.${this.player.level}).`);
      return false;
    }
    if (this.advancedJobId) {
      this.onToast?.(`Bạn đã khóa vĩnh viễn nhánh ${this.advancedJobName || this.advancedJobId}!`);
      return false;
    }
    const branch = ADVANCED_JOB_BY_ID[String(branchId || '').toLowerCase()];
    if (!branch) {
      this.onToast?.('Nhánh nghề Lv.80 không tồn tại.');
      return false;
    }
    if (branch.parentClassId !== normalizeBaseClassId(this.player.classId)) {
      this.onToast?.(`Nhánh ${branch.name} không tương thích với nghề hiện tại (${this.player.classId})!`);
      return false;
    }

    if (this.serverCharacterId) {
      const apiRes = await selectLv80AdvancedJobApi(this.serverCharacterId, branch.id);
      if (!apiRes.success) {
        this.onToast?.(apiRes.error || 'Chuyển chức Lv.80 thất bại trên máy chủ.');
        return false;
      }
    }

    this.advancedJobId = branch.id;
    this.advancedJobName = branch.name;
    this.player.evolutionTier = 3;
    this.skillPoints += 4;
    for (const sid of branch.exclusiveSkillIds.slice(0, 2)) {
      if (!this.skillLevels[sid]) this.skillLevels[sid] = 1;
    }
    this.rebuildClassSkillTree();
    this.playJobRitualVfx(branch.id);
    this.vfxEngine.spawnLayeredSkillVfx({
      skillKey: `vfx_${branch.id}_ult`,
      classOrBranchId: branch.id,
      skillType: 'ultimate',
      source: { x: this.player.x, y: this.player.y - 18 },
      target: { x: this.player.x, y: this.player.y - 18 },
      areaRadius: 185,
      evolutionTier: 5,
      isCrit: true,
    });
    this.floatingTexts.push({
      x: this.player.x,
      y: this.player.y - 80,
      text: `CHUYỂN CHỨC LV.80: ${branch.name.toUpperCase()}!`,
      color: branch.vfxProfile.primaryColor || '#fde047',
      ttlMs: 2200,
    });
    this.saveLocalProgress();
    this.onToast?.(`Chuyển chức vĩnh viễn thành công sang nhánh ${branch.nameVi}!`);
    this.emitHudSnapshot();
    return true;
  }

  public start() {
    this.lastTimeMs = performance.now();
    const tick = (now: number) => {
      const dtSec = Math.min(0.05, (now - this.lastTimeMs) / 1000);
      this.lastTimeMs = now;
      this.update(dtSec, now);
      this.render(now);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  public destroy() {
    cancelAnimationFrame(this.rafId);
  }

  public resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.viewW = window.innerWidth;
    this.viewH = window.innerHeight;
    this.canvas.width = Math.floor(this.viewW * dpr);
    this.canvas.height = Math.floor(this.viewH * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    this.zoom = Math.max(this.zoom, this.minimumZoom());
  }

  private buildCharacterAggregateInput(options?: {
    previewPassiveAllocations?: Record<string, number>;
    previewBaseAttributes?: Partial<PrimaryAttributesState>;
    mode?: 'pve' | 'pvp' | 'boss';
  }) {
    const baseItems = this.worldItems.length ? this.worldItems : INITIAL_ITEMS;
    const itemCatalog = this.worldUniqueEquipment.length ? [...baseItems, ...this.worldUniqueEquipment] : baseItems;
    const setCatalog = this.worldEquipmentSets.length ? this.worldEquipmentSets : INITIAL_EQUIPMENT_SETS;
    const skillCatalog = this.worldSkills.length ? this.worldSkills : INITIAL_SKILLS;

    const eqIdsMap: Record<string, { id: string; upgradeLevel?: number }> = {};
    const upgradeLevels: Record<string, number> = {};
    const inlineEquipmentList: any[] = [];
    for (const [slot, g] of Object.entries(this.equipment)) {
      if (!g) continue;
      eqIdsMap[slot] = { id: g.id, upgradeLevel: g.upgradeLevel || 0 };
      upgradeLevels[slot] = g.upgradeLevel || 0;
      inlineEquipmentList.push(g);
    }

    const nowMs = Date.now();
    const activeFoodBuffs = Object.values(this.activeBuffs)
      .filter((b) => b && b.expiresAt > nowMs && (b.stat === 'allCombatAndExp' || b.stat === 'maxHpPct' || b.stat === 'moveSpeedPct' || b.stat === 'expBonusPct'))
      .map((b) => ({ stat: b.stat, valuePct: b.valuePct, flatValue: b.flatValue }));

    const characterSnapshot: Partial<CharacterEntity> & { equipmentUpgradeLevels?: Record<string, number> } = {
      id: this.serverCharacterId || 'local_player',
      name: this.player.name,
      classId: this.player.classId as any,
      level: this.player.level,
      jobAdvancementCompleted: this.player.jobAdvancementCompleted,
      advancedJobId: (this.advancedJobId || undefined) as any,
      advancedJobName: this.advancedJobName || undefined,
      baseStats: { ...this.player.baseStats },
      attributes: { ...this.player.attributes },
      equipment: eqIdsMap as any,
      equipmentUpgradeLevels: upgradeLevels,
      unlockedSkills: this.skills.filter((s) => !s.locked).map((s) => s.id),
      skillLevels: { ...this.skillLevels },
      skillMastery: { ...this.skillMastery },
      activeBuffs: { ...this.activeBuffs },
      unlockedTitles: [...this.unlockedTitles],
      equippedCosmeticTitleId: this.equippedCosmeticTitleId,
      passiveAllocations: { ...this.passiveAllocations },
      passiveRespecCount: this.passiveRespecCount,
    };

    const aggregationInput = {
      character: characterSnapshot,
      itemsCatalog: itemCatalog,
      setsCatalog: setCatalog,
      uniqueCatalog: this.worldUniqueEquipment,
      titlesCatalog: this.worldTitles,
      titleBonusLimits: this.worldTitleBonusLimits,
      skillsCatalog: skillCatalog,
      foodAndConsumableBuffs: activeFoodBuffs,
      inlineEquipmentList,
      previewPassiveAllocations: options?.previewPassiveAllocations,
      previewBaseAttributes: options?.previewBaseAttributes,
      mode: options?.mode || 'pve',
      nowMs,
    };

    return {
      characterSnapshot,
      aggregationInput,
      itemCatalog,
      setCatalog,
      eqIdsMap,
      upgradeLevels,
    };
  }

  public getComputedStats(): PlayerStatsSummary {
    const { itemCatalog, setCatalog, eqIdsMap, upgradeLevels, aggregationInput } =
      this.buildCharacterAggregateInput({ mode: 'pve' });
    aggregationInput.character.deathPenalty = this.deathPenalty;
    aggregationInput.nowMs = Date.now();
    const agg = aggregateCharacterStats(aggregationInput);
    const setSummary = computeEquippedSetBonuses(eqIdsMap, itemCatalog, setCatalog, upgradeLevels);
    const uniquePassives = computeUniqueEquipmentBonuses(eqIdsMap, this.worldUniqueEquipment, upgradeLevels);
    const titleSummary = computePermanentTitleBonuses(
      this.unlockedTitles,
      this.worldTitles,
      this.worldTitleBonusLimits,
      this.equippedCosmeticTitleId
    );
    this.cachedTitleBonuses = titleSummary;
    const activeCosmeticDef = titleSummary.equippedCosmeticTitleId
      ? this.worldTitles.find((t) => t.id === titleSummary.equippedCosmeticTitleId)
      : undefined;
    this.player.cosmeticTitleLabel = activeCosmeticDef ? (activeCosmeticDef.nameVi || activeCosmeticDef.name) : null;

    const sec = agg.secondaryStats;
    const spent = computePassivePointsSpent(this.passiveAllocations);
    const earnedInfo = computeEarnedPassivePoints(aggregationInput.character);

    return {
      atk: sec.atk,
      matk: sec.matk,
      def: sec.def,
      mdef: sec.mdef,
      critRate: sec.critRatePct,
      damageReductionPct: sec.damageReductionPct,
      gold: this.gold,
      silver: this.silver,
      exp: this.player.exp,
      maxExp: this.player.maxExp,
      potentialPoints: this.player.potentialPoints,
      skillPoints: this.skillPoints,
      attributes: { ...agg.effectiveAttributes },
      equippedCosmeticTitleId: titleSummary.equippedCosmeticTitleId,
      equippedCosmeticTitleName: this.player.cosmeticTitleLabel,
      unlockedTitleCount: titleSummary.unlockedTitleIds.length,
      uniqueEquippedCount: uniquePassives.equippedUniqueIds.length,
      activeSetBonuses: setSummary.activeSets.map((entry) => ({
        setId: entry.set.id,
        setName: entry.set.nameVi || entry.set.name,
        equippedCount: entry.equippedCount,
        activeTiers: entry.activeTiers.map((pieces) => {
          const tier = entry.set.bonusTiers.find((bt) => bt.requiredPieces === pieces);
          return { piecesRequired: pieces, description: tier?.summary || `+${pieces} món` };
        }),
      })),
      critDamageMultiplierPct: sec.critDamageMultiplierPct,
      aspdPct: sec.aspdPct,
      cooldownReductionPct: sec.cooldownReductionPct,
      moveSpeedPct: sec.moveSpeedPct,
      evasionPct: sec.evasionPct,
      accuracy: sec.accuracy,
      armorPenetrationPct: sec.armorPenetrationPct,
      magicPenetrationPct: sec.magicPenetrationPct,
      healingBonusPct: sec.healingBonusPct,
      lifestealPct: sec.lifestealPct,
      statusResistancePct: sec.statusResistancePct,
      effectiveHp: sec.effectiveHp,
      breakdowns: agg.breakdowns,
      warningsVi: agg.warningsVi,
      jobAffinity: agg.jobAffinity,
      passivePointsSummary: {
        earned: earnedInfo.earned,
        spent,
        available: Math.max(0, earnedInfo.earned - spent),
        masteryBonusPoints: earnedInfo.fromMastery,
      },
      activePassives: agg.activePassives,
    };
  }

  public previewAttributeAllocationStats(pendingDeltas: Partial<Record<keyof PrimaryAttributesState, number>>) {
    const previewBaseAttributes: PrimaryAttributesState = {
      str: Math.max(1, Math.round((this.player.baseStats.str || 10) + Number(pendingDeltas.str || 0))),
      dex: Math.max(1, Math.round((this.player.baseStats.dex || 10) + Number(pendingDeltas.dex || 0))),
      agi: Math.max(1, Math.round((this.player.baseStats.agi || 10) + Number(pendingDeltas.agi || 0))),
      int: Math.max(1, Math.round((this.player.baseStats.int || 10) + Number(pendingDeltas.int || 0))),
      con: Math.max(1, Math.round((this.player.baseStats.con || 10) + Number(pendingDeltas.con || 0))),
    };
    const { aggregationInput } = this.buildCharacterAggregateInput({ previewBaseAttributes, mode: 'pve' });
    aggregationInput.character.deathPenalty = this.deathPenalty;
    aggregationInput.nowMs = Date.now();
    return aggregateCharacterStats(aggregationInput);
  }

  public previewPassiveAllocationStats(passiveId: string, deltaRank = 1) {
    const { characterSnapshot, aggregationInput } = this.buildCharacterAggregateInput({ mode: 'pve' });
    const check = validatePassiveAllocation(characterSnapshot, passiveId, deltaRank);
    const before = aggregateCharacterStats(aggregationInput);
    const nextAllocations = {
      ...this.passiveAllocations,
      [passiveId]: Math.max(0, Number(this.passiveAllocations[passiveId] || 0) + deltaRank),
    };
    const afterInput = this.buildCharacterAggregateInput({ previewPassiveAllocations: nextAllocations, mode: 'pve' }).aggregationInput;
    const after = aggregateCharacterStats(afterInput);
    return {
      valid: check.valid,
      reason: check.valid ? undefined : check.reason,
      before,
      after,
    };
  }

  public async allocatePassive(passiveId: string, deltaRank = 1): Promise<{ success: boolean; error?: string }> {
    const { characterSnapshot } = this.buildCharacterAggregateInput({ mode: 'pve' });
    const check = validatePassiveAllocation(characterSnapshot, passiveId, deltaRank);
    if (!check.valid) {
      this.onToast?.(check.reason);
      return { success: false, error: check.reason };
    }

    const prevMaxHp = this.player.maxHp;
    const prevMaxMp = this.player.maxMp;
    const charId = this.serverCharacterId || getActiveCharacterCache()?.id || null;

    if (charId) {
      try {
        const res = await allocatePassiveApi(charId, passiveId, deltaRank);
        if (!res.success || !res.data) {
          const msg = res.error || 'Không thể nâng nội tại trên máy chủ.';
          this.onToast?.(msg);
          return { success: false, error: msg };
        }
        const payload: any = res.data;
        const ov = payload.overview;
        if (ov?.allocations) this.passiveAllocations = { ...ov.allocations };
        else this.passiveAllocations = { ...this.passiveAllocations, [passiveId]: Number(payload.newRank ?? check.nextRank) };
        if (Array.isArray(ov?.recentTransactions)) {
          this.passiveTransactions = ov.recentTransactions.slice(-30);
        } else if (payload.transaction) {
          this.passiveTransactions = [...this.passiveTransactions, payload.transaction].slice(-30);
        }
        const aggSec = ov?.computedStats?.secondaryStats ?? (res as any).aggregated?.secondaryStats;
        this.player.maxHp = Math.max(1, Number(aggSec?.maxHp ?? this.player.maxHp));
        this.player.maxMp = Math.max(1, Number(aggSec?.maxMp ?? this.player.maxMp));
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + Math.max(0, this.player.maxHp - prevMaxHp));
        this.player.mp = Math.min(this.player.maxMp, this.player.mp + Math.max(0, this.player.maxMp - prevMaxMp));
        const cached = getActiveCharacterCache();
        if (cached) {
          setActiveCharacterCache({
            ...cached,
            passiveAllocations: { ...this.passiveAllocations },
            passivePoints: payload.pointsRemaining ?? ov?.points?.available,
            passivePointsSpent: payload.pointsSpent ?? ov?.points?.spent,
          });
        }
        this.saveLocalProgress();
        this.emitHudSnapshot();
        this.onToast?.(`Đã nâng nội tại: ${check.passive.nameVi} (Hạng ${check.nextRank}/${check.passive.maxRank})`);
        return { success: true };
      } catch {
        // Fallback below if offline mode
      }
    }

    this.passiveAllocations = { ...this.passiveAllocations, [passiveId]: check.nextRank };
    const afterStats = aggregateCharacterStats(this.buildCharacterAggregateInput({ mode: 'pve' }).aggregationInput).secondaryStats;
    this.player.maxHp = Math.max(1, afterStats.maxHp);
    this.player.maxMp = Math.max(1, afterStats.maxMp);
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + Math.max(0, this.player.maxHp - prevMaxHp));
    this.player.mp = Math.min(this.player.maxMp, this.player.mp + Math.max(0, this.player.maxMp - prevMaxMp));
    this.saveLocalProgress();
    this.emitHudSnapshot();
    this.onToast?.(`Đã nâng nội tại: ${check.passive.nameVi} (Hạng ${check.nextRank}/${check.passive.maxRank})`);
    return { success: true };
  }

  public async respecPassives(method: 'gold' | 'item' = 'gold'): Promise<{ success: boolean; error?: string }> {
    const spent = computePassivePointsSpent(this.passiveAllocations);
    if (spent <= 0) {
      const msg = 'Bạn chưa phân bổ điểm nội tại nào để tẩy.';
      this.onToast?.(msg);
      return { success: false, error: msg };
    }

    const respecCostGold = spent * PASSIVE_PROGRESSION_CONFIG.respecGoldPerSpentPoint;
    const charId = this.serverCharacterId || getActiveCharacterCache()?.id || null;

    if (charId) {
      try {
        const res = await respecPassivesApi(charId, method);
        if (!res.success || !res.data) {
          const msg = res.error || 'Không thể tẩy điểm nội tại.';
          this.onToast?.(msg);
          return { success: false, error: msg };
        }
        const payload: any = res.data;
        const ov = payload.overview;
        this.passiveAllocations = { ...(ov?.allocations || {}) };
        this.passiveRespecCount = Number(this.passiveRespecCount + 1);
        if (Array.isArray(ov?.recentTransactions)) {
          this.passiveTransactions = ov.recentTransactions.slice(-30);
        } else if (payload.transaction) {
          this.passiveTransactions = [...this.passiveTransactions, payload.transaction].slice(-30);
        }
        if (typeof payload.goldSpent === 'number') {
          this.gold = Math.max(0, this.gold - payload.goldSpent);
        }
        const aggSec = ov?.computedStats?.secondaryStats ?? (res as any).aggregated?.secondaryStats;
        this.player.maxHp = Math.max(1, Number(aggSec?.maxHp ?? this.player.maxHp));
        this.player.hp = Math.min(this.player.maxHp, this.player.hp);
        this.player.maxMp = Math.max(1, Number(aggSec?.maxMp ?? this.player.maxMp));
        this.player.mp = Math.min(this.player.maxMp, this.player.mp);
        if (method === 'item') {
          const idx = this.inventory.findIndex((i) => i.id === 'ITEM_PASSIVE_RESET_SCROLL');
          if (idx >= 0) {
            if (this.inventory[idx].qty > 1) this.inventory[idx].qty -= 1;
            else this.inventory.splice(idx, 1);
          }
        }
        const cached = getActiveCharacterCache();
        if (cached) {
          setActiveCharacterCache({
            ...cached,
            gold: this.gold,
            passiveAllocations: {},
            passivePoints: payload.availablePoints ?? ov?.points?.available,
            passivePointsSpent: 0,
            passiveRespecCount: this.passiveRespecCount,
          });
        }
        this.saveLocalProgress();
        this.emitHudSnapshot();
        this.onToast?.('Tẩy điểm nội tại thành công! Nhánh chuyển chức Lv.80 được giữ nguyên.');
        return { success: true };
      } catch {
        // Fallback below if offline mode
      }
    }

    if (method === 'item') {
      const idx = this.inventory.findIndex((i) => i.id === 'ITEM_PASSIVE_RESET_SCROLL');
      if (idx < 0) {
        const msg = 'Không có Cuộn Tẩy Tủy Nội Tại (ITEM_PASSIVE_RESET_SCROLL) trong Balo!';
        this.onToast?.(msg);
        return { success: false, error: msg };
      }
      if (this.inventory[idx].qty > 1) this.inventory[idx].qty -= 1;
      else this.inventory.splice(idx, 1);
    } else {
      if (this.gold < respecCostGold) {
        const msg = `Không đủ Vàng để tẩy nội tại! Cần ${respecCostGold} Vàng.`;
        this.onToast?.(msg);
        return { success: false, error: msg };
      }
      this.gold -= respecCostGold;
    }

    this.passiveAllocations = {};
    this.passiveRespecCount += 1;
    const afterStats = aggregateCharacterStats(this.buildCharacterAggregateInput({ mode: 'pve' }).aggregationInput).secondaryStats;
    this.player.maxHp = Math.max(1, afterStats.maxHp);
    this.player.hp = Math.min(this.player.maxHp, this.player.hp);
    this.player.maxMp = Math.max(1, afterStats.maxMp);
    this.player.mp = Math.min(this.player.maxMp, this.player.mp);
    this.saveLocalProgress();
    this.emitHudSnapshot();
    this.onToast?.('Tẩy điểm nội tại thành công! Nhánh chuyển chức Lv.80 được giữ nguyên.');
    return { success: true };
  }

  public upgradeSkill(skillId: string) {
    const skill = this.skills.find((s) => s.id === skillId);
    if (!skill || skill.locked) {
      this.onToast?.('Kỹ năng chưa được mở khóa!');
      return;
    }
    const maxLv = Number(skill.maxLevel ?? 10);
    const curLv = Number(this.skillLevels[skillId] ?? skill.skillLevel ?? 1);
    if (curLv >= maxLv) {
      this.onToast?.(`Kỹ năng ${skill.name} đã đạt cấp tối đa (${maxLv}).`);
      return;
    }
    const spCost = Number(skill.spCost ?? 1);
    if (this.skillPoints < spCost) {
      this.onToast?.(`Không đủ Điểm Kỹ Năng (SP)! Cần ${spCost} SP.`);
      return;
    }
    this.skillPoints -= spCost;
    this.skillLevels[skillId] = curLv + 1;
    this.rebuildClassSkillTree();
    this.saveLocalProgress();
    if (this.serverCharacterId) {
      void learnOrUpgradeSkillApi(this.serverCharacterId, skillId).then((res) => {
        if (res.success && res.data) {
          this.skillPoints = Number(res.data.remainingSkillPoints ?? this.skillPoints);
          this.skillLevels[skillId] = Number(res.data.newLevel ?? this.skillLevels[skillId]);
          this.rebuildClassSkillTree();
          this.emitHudSnapshot();
        }
      });
    }
    this.onToast?.(`Đã nâng cấp ${skill.name} lên Lv.${curLv + 1}!`);
    this.emitHudSnapshot();
  }

  public craftRecipe(recipeId: string): boolean {
    const recipes = this.worldCraftingRecipes.length ? this.worldCraftingRecipes : INITIAL_CRAFTING_RECIPES;
    const recipe = recipes.find((r: any) => r.id === recipeId);
    if (!recipe) {
      this.onToast?.('Không tìm thấy công thức chế tác.');
      return false;
    }
    if (this.player.level < Number(recipe.requiredLevel || 1)) {
      this.onToast?.(`Cần đạt Lv.${recipe.requiredLevel} để chế tác ${recipe.name}!`);
      return false;
    }
    const goldCost = Number(recipe.goldCost || 0);
    if (this.gold < goldCost) {
      this.onToast?.(`Không đủ Vàng! Cần ${goldCost.toLocaleString()}G.`);
      return false;
    }
    for (const mat of recipe.materials || []) {
      const owned = this.inventory.reduce((s, it) => (it.id === mat.itemId ? s + it.qty : s), 0);
      if (owned < Number(mat.quantity || 1)) {
        this.onToast?.(`Không đủ nguyên liệu ${mat.itemId}!`);
        return false;
      }
    }

    // Consume Gold and Materials
    this.gold -= goldCost;
    for (const mat of recipe.materials || []) {
      let rem = Number(mat.quantity || 1);
      for (let i = this.inventory.length - 1; i >= 0 && rem > 0; i--) {
        const it = this.inventory[i];
        if (it.id !== mat.itemId) continue;
        if (it.qty <= rem) {
          rem -= it.qty;
          this.inventory.splice(i, 1);
        } else {
          it.qty -= rem;
          rem = 0;
        }
      }
    }

    const itemCatalog = this.worldItems.length ? this.worldItems : INITIAL_ITEMS;
    const outMeta = itemCatalog.find((i: any) => i.id === recipe.outputItemId || i.itemId === recipe.outputItemId);
    const outDef = outMeta
      ? this.convertWorldItemToInventoryDef(outMeta, Number(recipe.outputQuantity || 1))
      : {
          id: recipe.outputItemId,
          name: recipe.name,
          category: 'material' as const,
          rarity: 'rare' as const,
          iconKey: 'gem_amethyst',
          qty: Number(recipe.outputQuantity || 1),
          desc: recipe.description || 'Vật phẩm chế tác.',
        };

    const existingStack =
      outDef.category !== 'equip' ? this.inventory.find((i) => i.id === outDef.id) : null;
    if (existingStack) {
      existingStack.qty += outDef.qty;
    } else {
      this.inventory.unshift(outDef);
    }

    this.floatingTexts.push({
      x: this.player.x,
      y: this.player.y - 68,
      text: `Chế Tạo Thành Công: ${outDef.name}!`,
      color: '#fde047',
      ttlMs: 1400,
    });
    this.saveLocalProgress();
    this.onToast?.(`Chế tạo thành công: ${outDef.name} (x${outDef.qty})!`);
    this.emitHudSnapshot();
    return true;
  }

  public upgradeEquippedSlot(slot: EquipSlotKey): boolean {
    const gear = this.equipment[slot];
    if (!gear) {
      this.onToast?.('Ô trang bị đang trống.');
      return false;
    }
    const curLv = Number(gear.upgradeLevel || 0);
    const maxLv = Number(gear.maxUpgradeLevel || RARITY_CONFIGS[gear.rarity]?.maxUpgradeLevel || 10);
    if (curLv >= maxLv) {
      this.onToast?.(`${gear.name} đã đạt cấp cường hóa tối đa (+${maxLv}).`);
      return false;
    }
    const stoneId = curLv >= 5 ? 'ITEM_UPGRADE_STONE_MYSTIC' : 'ITEM_UPGRADE_STONE_BASIC';
    const stoneNeed = curLv >= 5 ? 2 : 1;
    const goldCost = 250 * (curLv + 1);
    const ownedStone = this.inventory.reduce((s, it) => (it.id === stoneId ? s + it.qty : s), 0);

    if (this.gold < goldCost || ownedStone < stoneNeed) {
      this.onToast?.(`Cần ${goldCost}G và ${stoneNeed}x ${stoneId}!`);
      return false;
    }

    this.gold -= goldCost;
    let rem = stoneNeed;
    for (let i = this.inventory.length - 1; i >= 0 && rem > 0; i--) {
      if (this.inventory[i].id !== stoneId) continue;
      if (this.inventory[i].qty <= rem) {
        rem -= this.inventory[i].qty;
        this.inventory.splice(i, 1);
      } else {
        this.inventory[i].qty -= rem;
        rem = 0;
      }
    }

    gear.upgradeLevel = curLv + 1;
    this.floatingTexts.push({
      x: this.player.x,
      y: this.player.y - 68,
      text: `Cường Hóa Thành Công +${gear.upgradeLevel}!`,
      color: '#facc15',
      ttlMs: 1300,
    });
    this.saveLocalProgress();
    this.onToast?.(`Đã cường hóa ${gear.name} lên +${gear.upgradeLevel}!`);
    this.emitHudSnapshot();
    return true;
  }

  public hydrateFromServerCharacter(char: CharacterEntity, computedStats?: any) {
    if (!char || !char.id) return;
    const localMatch = this.readLocalSaveForCharacter(char.id);
    const localIsAhead =
      Boolean(localMatch) &&
      !char.deathPenalty &&
      (Number(localMatch.level || 1) > Number(char.level || 1) ||
        (Number(localMatch.level || 1) === Number(char.level || 1) && Number(localMatch.exp || 0) > Number(char.exp || 0)));

    this.serverCharacterId = char.id;
    this.player.name = char.name || this.player.name;
    this.player.level = Math.max(1, Number(localIsAhead ? localMatch.level : (char.level || 1)));
    this.player.exp = Number(localIsAhead ? localMatch.exp : (char.exp || 0));
    this.player.maxExp = expRequiredForLevel(this.player.level);
    this.gold = Math.max(Number(char.gold ?? 0), Number(localIsAhead ? (localMatch.gold ?? 0) : 0));
    this.player.classId = char.classId || 'adventurer';
    this.player.jobAdvancementCompleted = Boolean(char.jobAdvancementCompleted);
    this.player.evolutionTier = Number(char.evolutionTier || 0);
    this.player.sanctumCompleted = Boolean(char.sanctumCompleted);
    this.advancedJobId = char.advancedJobId || null;
    this.advancedJobName = char.advancedJobName || null;
    this.discoveredVillageIds = Array.isArray(char.discoveredVillageIds) && char.discoveredVillageIds.length > 0
      ? [...char.discoveredVillageIds]
      : ['THON_KHOI_NGUYEN'];
    this.latestVillageCheckpointId = char.latestVillageCheckpointId || 'THON_KHOI_NGUYEN';
    this.preferredResurrectionVillageId = char.preferredResurrectionVillageId ?? null;
    this.deathCount = Number(char.deathCount || 0);
    if (char.deathPenalty && Number(char.deathPenalty.expiresAt || 0) > Date.now()) {
      this.deathPenalty = { ...char.deathPenalty };
    } else if (localMatch?.deathPenalty && Number(localMatch.deathPenalty.expiresAt || 0) > Date.now()) {
      this.deathPenalty = { ...localMatch.deathPenalty };
    } else {
      this.deathPenalty = null;
    }
    if (char.autoCombatConfig) {
      this.autoCombatConfig = { ...DEFAULT_AUTO_COMBAT_CONFIG, ...char.autoCombatConfig, enabled: false };
    }
    if (char.skillMastery && typeof char.skillMastery === 'object') {
      this.skillMastery = { ...char.skillMastery };
    }
    this.passiveAllocations = char.passiveAllocations && typeof char.passiveAllocations === 'object'
      ? { ...char.passiveAllocations }
      : {};
    this.passiveTransactions = Array.isArray(char.passiveTransactions)
      ? char.passiveTransactions.slice(-30)
      : [];
    this.passiveRespecCount = Number(char.passiveRespecCount || 0);

    const unspent = Number(char.unspentStatPoints ?? char.availableAttributePoints ?? 0);
    this.player.potentialPoints = Math.max(0, unspent);

    const nextBase = {
      str: Number(char.baseStats?.str ?? char.stats?.str ?? 10),
      dex: Number(char.baseStats?.dex ?? char.stats?.dex ?? 10),
      agi: Number(char.baseStats?.agi ?? char.stats?.agi ?? 10),
      int: Number(char.baseStats?.int ?? char.stats?.int ?? 10),
      con: Number(char.baseStats?.con ?? char.stats?.con ?? 10),
    };
    this.player.baseStats = { ...nextBase };
    this.player.attributes = {
      str: Number(char.attributes?.str ?? nextBase.str),
      dex: Number(char.attributes?.dex ?? nextBase.dex),
      agi: Number(char.attributes?.agi ?? nextBase.agi),
      int: Number(char.attributes?.int ?? nextBase.int),
      con: Number(char.attributes?.con ?? nextBase.con),
    };

    const nextMaxHp = Number(computedStats?.computed?.maxHp ?? char.maxHp ?? 100 + nextBase.con * 20);
    const nextMaxMp = Number(computedStats?.computed?.maxMp ?? char.maxMp ?? 50 + nextBase.int * 15);
    this.player.maxHp = Math.max(1, nextMaxHp);
    this.player.hp = Math.min(this.player.maxHp, Number(char.hp ?? this.player.maxHp));
    this.player.maxMp = Math.max(1, nextMaxMp);
    this.player.mp = Math.min(this.player.maxMp, Number(char.mp ?? this.player.maxMp));

    if (Array.isArray(char.unlockedTitles)) this.unlockedTitles = [...char.unlockedTitles];
    if (char.equippedCosmeticTitleId !== undefined) this.equippedCosmeticTitleId = char.equippedCosmeticTitleId ?? null;
    if (Array.isArray(char.visitedMaps) && char.visitedMaps.length > 0) this.visitedMaps = [...char.visitedMaps];
    if (Array.isArray(char.ownedUniqueEquipmentIds)) this.ownedUniqueEquipmentIds = [...char.ownedUniqueEquipmentIds];
    if (Array.isArray(char.completedQuests)) this.player.completedQuests = [...char.completedQuests];
    if (char.completedQuestHistory && typeof char.completedQuestHistory === 'object') {
      this.completedQuestHistory = { ...char.completedQuestHistory };
    }
    if (char.activeQuests && typeof char.activeQuests === 'object') {
      this.activeWorldQuests = { ...char.activeQuests };
    }
    if (Array.isArray(char.discoveredHiddenQuests)) {
      this.discoveredHiddenQuests = [...char.discoveredHiddenQuests];
    }
    if (char.trackedQuestId !== undefined) {
      this.trackedQuestId = char.trackedQuestId && this.activeWorldQuests[char.trackedQuestId] ? char.trackedQuestId : null;
    } else if (this.trackedQuestId && !this.activeWorldQuests[this.trackedQuestId]) {
      this.trackedQuestId = null;
    }

    if (isPreJobClass(this.player.classId)) {
      this.skillLevels = {
        SKILL_NOVICE_SLASH: Math.max(1, Number((char as any).skillLevels?.SKILL_NOVICE_SLASH || 1)),
        SKILL_NOVICE_FIREBALL: Math.max(1, Number((char as any).skillLevels?.SKILL_NOVICE_FIREBALL || 1)),
      };
    } else if ((char as any).skillLevels && typeof (char as any).skillLevels === 'object') {
      this.skillLevels = { ...(char as any).skillLevels };
    }

    if (Array.isArray(char.inventory) && char.inventory.length > 0) {
      const serverCounts = new Map<string, { qty: number; sample: any }>();
      for (const s of char.inventory) {
        const sid = s.itemId || s.item_id;
        if (!sid) continue;
        const prev = serverCounts.get(sid);
        const qty = Number(s.quantity ?? s.qty ?? 1);
        if (prev) prev.qty += qty;
        else serverCounts.set(sid, { qty, sample: s });
      }
      for (const [sid, info] of serverCounts.entries()) {
        const existingIdx = this.inventory.findIndex((i) => i.id === sid);
        const catMeta = this.worldItems.find((w: any) => w.id === sid);
        const def = catMeta
          ? this.convertWorldItemToInventoryDef(catMeta, info.qty)
          : {
              id: sid,
              name: info.sample.name || sid,
              category: (info.sample.category === 'equip' ? 'equip' : info.sample.category === 'consumable' ? 'consumable' : 'material') as 'equip' | 'consumable' | 'material',
              rarity: (info.sample.quality || info.sample.rarity || 'common') as ItemRarity,
              iconKey: sid.includes('WOOD') ? 'wood_oak' : sid.includes('HERB') ? 'herb_green' : sid.includes('ORE') ? 'ore_iron' : 'gem_amethyst',
              qty: info.qty,
              desc: info.sample.description || 'Vật phẩm đồng bộ từ máy chủ.',
            };
        if (existingIdx >= 0) this.inventory[existingIdx] = { ...this.inventory[existingIdx], ...def, qty: info.qty };
        else this.inventory.push(def);
      }
      this.inventory = this.inventory.filter(
        (i) => !i.id.startsWith('MAT_PROF_') && !i.id.startsWith('PROF_ITEM_') && !i.id.startsWith('TOOL_')
          ? true
          : serverCounts.has(i.id)
      );
    }

    setActiveCharacterCache(char);
    this.recalculateClientTitleBonuses(false);
    this.rebuildClassSkillTree();
    const afterStats = this.getComputedStats();
    this.player.maxHp = Math.max(1, Number(computedStats?.computed?.maxHp ?? this.player.maxHp));
    this.player.maxMp = Math.max(1, Number(computedStats?.computed?.maxMp ?? this.player.maxMp));
    this.player.dead = Number(char.hp ?? this.player.maxHp) <= 0;
    if (this.player.dead) {
      this.player.hp = 0;
    } else {
      this.player.hp = Math.min(this.player.maxHp, Math.max(1, Number(char.hp ?? this.player.maxHp)));
    }
    if (afterStats.atk > 0) this.player.mp = Math.min(this.player.maxMp, Number(char.mp ?? this.player.maxMp));

    const targetRegion = localIsAhead && localMatch.regionId ? localMatch.regionId : (char.regionId || 'THON_KHOI_NGUYEN');
    if (targetRegion && targetRegion !== this.regionId) {
      const targetTx = typeof char.x === 'number' ? Math.floor(char.x / 48) : undefined;
      const targetTy = typeof char.y === 'number' ? Math.floor(char.y / 48) : undefined;
      void this.switchRegion(targetRegion, { targetTx, targetTy, silentTransition: true });
    } else if (typeof char.x === 'number' && typeof char.y === 'number') {
      this.player.x = char.x;
      this.player.y = char.y;
      this.centerCameraImmediate();
    }

    this.saveLocalProgress();
    if (localIsAhead) {
      this.scheduleServerStateSync(true);
    }
    this.emitHudSnapshot();
    if (this.multiplayer) {
      void this.multiplayer.connectAndJoin(char.id);
    }
    if (this.player.dead && !this.deathModalActive) {
      const cp = resolveResurrectionCheckpoint(
        { discoveredVillageIds: this.discoveredVillageIds, latestVillageCheckpointId: this.latestVillageCheckpointId, preferredResurrectionVillageId: this.preferredResurrectionVillageId ?? undefined },
        this.regionId
      );
      this.deathModalActive = true;
      this.onPlayerDiedUi?.({
        killerName: this.deathPenalty?.killerName || 'Quái Vật Elysia',
        reason: this.deathPenalty?.reason || 'Nhân vật đã gục trước khi tải lại trang',
        levelPreserved: this.player.level,
        expLost: Number(this.deathPenalty?.expLost || 0),
        penalty: this.deathPenalty,
        checkpointNameVi: cp.nameVi,
        checkpointId: cp.id,
      });
    }
  }

  public setMultiplayerClient(mp: MultiplayerClient) {
    this.multiplayer = mp;
    mp.onWorldPlayers = (list) => {
      this.remotePlayers.clear();
      for (const rp of list) this.upsertRemotePlayer(rp);
    };
    mp.onPlayerJoined = (rp) => this.upsertRemotePlayer(rp);
    mp.onPlayerMoved = (d) => {
      const existing = this.remotePlayers.get(d.characterId);
      if (!existing) return;
      existing.x = d.x;
      existing.y = d.y;
      if (typeof d.hp === 'number') existing.hp = d.hp;
      if (typeof d.maxHp === 'number') existing.maxHp = d.maxHp;
      if (d.direction) {
        existing.entity.direction = d.direction as any;
        existing.entity.facing = d.direction === 'west' ? -1 : 1;
      }
      if (d.animState) existing.entity.setState(d.animState as any);
    };
    mp.onPlayerLeft = (cid) => {
      this.remotePlayers.delete(cid);
    };
    mp.onPlayerState = (snap) => {
      if (!snap || snap.characterId !== this.serverCharacterId) return;
      this.player.maxHp = Math.max(1, Number(snap.maxHp ?? this.player.maxHp));
      this.player.maxMp = Math.max(1, Number(snap.maxMp ?? this.player.maxMp));
      this.player.hp = Math.min(this.player.maxHp, Number(snap.hp ?? this.player.hp));
      this.player.mp = Math.min(this.player.maxMp, Number(snap.mp ?? this.player.mp));
      this.player.dead = Boolean(snap.dead || this.player.hp <= 0);
      if (typeof snap.gold === 'number') this.gold = snap.gold;
      if (typeof snap.skillPoints === 'number') this.skillPoints = snap.skillPoints;
      if (snap.advancedJobId) this.advancedJobId = snap.advancedJobId;
      if (snap.advancedJobName) this.advancedJobName = snap.advancedJobName;
      if (snap.deathPenalty !== undefined) {
        this.deathPenalty = snap.deathPenalty && Number(snap.deathPenalty.expiresAt || 0) > Date.now() ? snap.deathPenalty : null;
      }
      if (Array.isArray(snap.discoveredVillageIds) && snap.discoveredVillageIds.length > 0) {
        this.discoveredVillageIds = [...snap.discoveredVillageIds];
      }
      if (snap.latestVillageCheckpointId) {
        this.latestVillageCheckpointId = snap.latestVillageCheckpointId;
      }
      if (snap.skillMastery && typeof snap.skillMastery === 'object') {
        this.skillMastery = { ...snap.skillMastery };
        this.rebuildClassSkillTree();
      }
      this.saveLocalProgress();
      this.emitHudSnapshot();
    };
    mp.onWorldMonsters = (list) => {
      this.syncMonstersFromServer(list, true);
    };
    mp.onWorldMonsterUpdates = (updates) => {
      this.syncMonstersFromServer(updates, false);
    };
    mp.onWorldMonsterRespawned = (mon) => {
      this.syncMonstersFromServer([mon], false);
    };
    mp.onWorldEliteSpawned = (elite) => {
      this.syncMonstersFromServer([elite], false);
      this.spawnVfx('vfx_sacred_bless', elite.x, elite.y - 16, 150);
      this.floatingTexts.push({ x: elite.x, y: elite.y - 68, text: `★ ${elite.name} XUẤT HIỆN!`, color: '#fbbf24', ttlMs: 2200 });
      this.onToast?.(`⚡ TINH ANH HIẾM XUẤT HIỆN: ${elite.name} (Lv.${elite.level})!`);
    };
    mp.onWorldMonsterAttack = (atk) => {
      const m = this.monsters.find((it) => it.id === atk.monsterId);
      if (m) {
        m.setState('attack');
        if (atk.telegraphName) {
          this.spawnVfx('vfx_fire_burst', m.x, m.y - 12, 130);
        }
      }
    };
    mp.onPlayerDamaged = (dmg) => {
      if (!dmg || dmg.targetCharacterId !== this.serverCharacterId) return;
      this.player.hp = Math.max(0, Number(dmg.playerHp ?? this.player.hp));
      if (dmg.damage > 0) {
        this.player.setState('hurt');
        this.floatingTexts.push({ x: this.player.x, y: this.player.y - 44, text: `-${dmg.damage}`, color: '#ef4444', ttlMs: 850 });
      }
      this.emitHudSnapshot();
    };
    mp.onPlayerDied = (deathPayload) => {
      this.handleServerPlayerDeath(deathPayload);
    };
    mp.onPlayerResurrected = (payload) => {
      this.handleServerPlayerResurrected(payload);
    };
    mp.onCombatResult = (res) => {
      if (!res) return;
      if (res.characterId === this.serverCharacterId) {
        if (res.monster) {
          const mon = this.monsters.find((m) => m.id === res.monster.id);
          if (mon) {
            mon.hp = Number(res.monster.hp ?? mon.hp);
            mon.alive = Boolean(res.monster.alive);
            if (!mon.alive) mon.setState('death');
          }
        }
        if (res.deathEvent) {
          this.handleServerPlayerDeath(res.deathEvent);
        }
        if (res.rewards && (res.rewards.exp > 0 || res.rewards.gold > 0 || res.rewards.levelsGained?.length)) {
          if (res.player) {
            const oldLv = this.player.level;
            this.player.level = Math.max(1, Number(res.player.level ?? this.player.level));
            this.player.exp = Number(res.player.exp ?? this.player.exp);
            this.player.maxExp = expRequiredForLevel(this.player.level);
            this.gold = Number(res.player.gold ?? this.gold);
            this.skillPoints = Number(res.player.skillPoints ?? this.skillPoints);
            if (this.player.level > oldLv) {
              this.floatingTexts.push({ x: this.player.x, y: this.player.y - 74, text: `THĂNG CẤP Lv.${this.player.level}!`, color: '#fde047', ttlMs: 1400 });
            }
          }
          if (res.rewards.monsterId) {
            this.recordClientQuestProgress({ type: 'KILL_MONSTER', targetId: res.rewards.monsterId, amount: 1 });
          }
          this.floatingTexts.push({ x: res.targetX ?? this.player.x, y: (res.targetY ?? this.player.y) - 62, text: `+${res.rewards.exp} EXP +${res.rewards.gold}G`, color: '#fde047', ttlMs: 950 });
          this.saveLocalProgress();
        }
        if (res.skillId && typeof res.masteryPoints === 'number') {
          if (!this.skillMastery) this.skillMastery = {};
          this.skillMastery[res.skillId] = {
            ...(this.skillMastery[res.skillId] || { exp: 0, castsCount: 0, validCombatHits: 0 }),
            points: res.masteryPoints,
            rank: res.masteryRank || getMasteryRankFromPoints(res.masteryPoints),
          };
          this.rebuildClassSkillTree();
          this.emitHudSnapshot();
        }
        return;
      }
      const rp = this.remotePlayers.get(res.characterId);
      const ax = Number(res.attackerX ?? rp?.renderX ?? 0);
      const ay = Number(res.attackerY ?? rp?.renderY ?? 0);
      const tx = Number(res.targetX ?? res.monster?.x ?? ax + 48);
      const ty = Number(res.targetY ?? res.monster?.y ?? ay);
      this.vfxEngine.spawnLayeredSkillVfx({
        skillKey: res.vfxId || res.vfxKey || 'vfx_sword_slash',
        classOrBranchId: res.advancedJobId || res.classId || 'swordsman',
        skillType: res.projectile ? 'projectile' : res.healedHp > 0 ? 'healing' : res.areaRadius > 120 ? 'aoe' : 'slash',
        source: { x: ax, y: ay - 18 },
        target: { x: tx, y: ty - 16 },
        areaRadius: res.areaRadius || 95,
        skillLevel: res.skillLevel || 1,
        masteryPoints: res.masteryPoints || 0,
        evolutionTier: res.evolutionTier ?? computeVisualEvolutionTier(res.skillLevel || 1, res.masteryPoints || 0),
        hitCount: res.hitCount || 1,
        projectileCount: res.projectileCount || 1,
        isCrit: Boolean(res.critical),
        isHeal: Boolean(res.healedHp > 0),
        vfxTags: res.vfxTags || [],
      });
      if (res.vfxKey) {
        this.spawnVfx(res.vfxKey, tx, ty - 16, Math.min(220, res.areaRadius || 120));
      }
      if (res.monster) {
        const mon = this.monsters.find((m) => m.id === res.monster.id);
        if (mon) {
          mon.hp = res.monster.hp;
          mon.alive = res.monster.alive;
        }
      }
      if (res.damage > 0) {
        this.floatingTexts.push({ x: tx, y: ty - 40, text: `-${res.damage}`, color: res.critical ? '#f97316' : '#fef08a', ttlMs: 750 });
      }
    };
    if (this.serverCharacterId) {
      void mp.connectAndJoin(this.serverCharacterId);
    }
  }

  private upsertRemotePlayer(rp: RemotePlayerState) {
    if (!rp?.characterId || rp.characterId === this.serverCharacterId) return;
    const prev = this.remotePlayers.get(rp.characterId);
    if (prev) {
      Object.assign(prev, rp);
      prev.entity.name = rp.name;
      prev.entity.level = rp.level;
      prev.entity.hp = rp.hp;
      prev.entity.maxHp = rp.maxHp;
      (prev.entity as any).remoteJobLabel = rp.secondJobName || rp.classId || 'Tân Thủ';
      return;
    }
    const ent = new Entity({
      id: rp.characterId,
      kind: 'player',
      name: rp.name,
      spriteId: 'player_adventurer',
      x: rp.x,
      y: rp.y,
      level: rp.level,
      hp: rp.hp,
      mp: rp.mp ?? 100,
    });
    (ent as any).remoteJobLabel = rp.secondJobName || rp.classId || 'Tân Thủ';
    this.remotePlayers.set(rp.characterId, {
      ...rp,
      renderX: rp.x,
      renderY: rp.y,
      entity: ent,
    });
  }

  public addGoldBonus(amount: number, label?: string) {
    const clean = Math.max(0, Math.round(Number(amount || 0)));
    if (clean <= 0) return;
    this.gold += clean;
    this.floatingTexts.push({
      x: this.player.x,
      y: this.player.y - 60,
      text: `+${clean} Vàng${label ? ` (${label})` : ''}`,
      color: '#fde047',
      ttlMs: 1200,
    });
    this.saveLocalProgress();
    this.emitHudSnapshot();
  }

  public applySettings(settings: { showDamageNumbers?: boolean; showPetals?: boolean; reducedEffects?: boolean }) {
    if (typeof settings.showDamageNumbers === 'boolean') this.showDamageNumbers = settings.showDamageNumbers;
    if (typeof settings.showPetals === 'boolean') this.showPetals = settings.showPetals;
    if (typeof settings.reducedEffects === 'boolean') this.reducedEffects = settings.reducedEffects;
  }

  public toggleAutoCombat(): boolean {
    return this.setAutoCombatEnabled(!this.autoCombatConfig.enabled);
  }

  public setAutoCombatEnabled(enabled: boolean): boolean {
    if (enabled && (this.player.dead || this.tilemap.map.type === 'CITY_SAFE_ZONE' || this.tilemap.map.combatEnabled === false)) {
      this.autoCombatConfig.enabled = false;
      this.onToast?.(this.player.dead ? 'Nhân vật đã gục — không thể bật Tự Động Chiến Đấu.' : 'Không thể bật Tự Động Chiến Đấu trong Thành Phố An Toàn!');
      this.emitHudSnapshot();
      return false;
    }
    this.autoCombatConfig.enabled = enabled;
    if (enabled) {
      this.autoCombatConfig.anchorX = Math.round(this.player.x);
      this.autoCombatConfig.anchorY = Math.round(this.player.y);
      this.autoCombatConfig.anchorRegionId = this.regionId;
      this.onToast?.('⚔️ Đã BẬT Tự Động Chiến Đấu [Z]!');
    } else {
      this.onToast?.('Đã TẮT Tự Động Chiến Đấu.');
    }
    this.saveLocalProgress();
    this.scheduleServerStateSync();
    this.emitHudSnapshot();
    return this.autoCombatConfig.enabled;
  }

  public updateAutoCombatConfig(patch: Partial<AutoCombatConfig>) {
    this.autoCombatConfig = {
      ...this.autoCombatConfig,
      ...patch,
      hpThresholdPct: Math.max(10, Math.min(95, Math.round(Number(patch.hpThresholdPct ?? this.autoCombatConfig.hpThresholdPct)))),
      mpThresholdPct: Math.max(10, Math.min(95, Math.round(Number(patch.mpThresholdPct ?? this.autoCombatConfig.mpThresholdPct)))),
    };
    this.saveLocalProgress();
    this.scheduleServerStateSync();
    this.emitHudSnapshot();
  }

  private syncMonstersFromServer(serverList: any[], replaceRegionList: boolean) {
    if (!Array.isArray(serverList)) return;
    if (replaceRegionList && serverList.length > 0 && serverList[0]?.regionId && serverList[0].regionId !== this.regionId) {
      return;
    }

    const upsertOne = (sm: any) => {
      if (!sm || (sm.regionId && sm.regionId !== this.regionId)) return;
      const meta = this.worldMonsters.find((wm: any) => wm.id === sm.monsterId);
      let existing = this.monsters.find((m) => m.id === sm.id);
      if (!existing) {
        existing = new MonsterEntity({
          id: sm.id,
          monsterId: sm.monsterId,
          name: sm.name || meta?.name || sm.monsterId,
          spriteId: sm.spriteId || meta?.spriteId || (sm.isBoss ? 'boss_dark_dragon' : 'monster_goblin'),
          visualFilter: meta?.visualFilter,
          category: sm.category || meta?.category || 'NORMAL',
          isBoss: Boolean(sm.isBoss),
          isElite: Boolean(sm.isElite || sm.isRandomElite),
          isRandomElite: Boolean(sm.isRandomElite),
          aiState: sm.aiState || 'IDLE',
          serverControlled: true,
          portraitUrl: sm.portraitUrl || meta?.portraitUrl,
          spriteAsset: sm.sprite_asset || meta?.spriteAsset,
          visualScale: Number(meta?.visualScale || (sm.isBoss ? 1.5 : sm.isElite ? 1.25 : 1)),
          respawnSec: Number(sm.respawnTimeSeconds ?? meta?.respawnTimeSeconds ?? 9),
          aiBehavior: sm.aiBehavior || meta?.aiBehavior || 'passive',
          aggroRange: Number(sm.aggroRange ?? meta?.aggroRange ?? 150),
          expReward: Number(sm.expReward ?? meta?.expReward ?? 38),
          goldReward: Number(sm.goldReward ?? meta?.goldReward ?? 22),
          x: Number(sm.x),
          y: Number(sm.y),
          level: Number(sm.level || 1),
          hp: Number(sm.maxHp || 120),
          mp: 100,
        });
        existing.hp = Number(sm.hp ?? existing.maxHp);
        existing.alive = Boolean(sm.alive);
        this.monsters.push(existing);
      } else {
        existing.serverControlled = true;
        const oldX = existing.x;
        const oldY = existing.y;
        const nextX = Number(sm.x ?? oldX);
        const nextY = Number(sm.y ?? oldY);
        const dx = nextX - oldX;
        const dy = nextY - oldY;
        if (Math.abs(dx) + Math.abs(dy) > 2) {
          existing.faceVector(dx, dy);
          if (existing.alive && existing.state !== 'attack' && existing.state !== 'hurt') {
            existing.setState('walk');
          }
        } else if (existing.alive && existing.state === 'walk') {
          existing.setState('idle');
        }
        existing.x = nextX;
        existing.y = nextY;
        existing.hp = Number(sm.hp ?? existing.hp);
        existing.maxHp = Number(sm.maxHp ?? existing.maxHp);
        existing.alive = Boolean(sm.alive);
        existing.aiState = sm.aiState || existing.aiState;
        existing.enraged = Boolean(sm.enraged);
        existing.activePhase = Number(sm.activePhase || existing.activePhase);
        existing.isRandomElite = Boolean(sm.isRandomElite || existing.isRandomElite);
        existing.telegraph = sm.telegraph
          ? {
              skillName: sm.telegraph.skillName || 'Đòn Trọng Kích',
              warningRadiusPx: Number(sm.telegraph.aoeRadius || 120),
              remainingMs: Math.max(200, Number(sm.telegraph.executesAt || Date.now() + 1500) - Date.now()),
            }
          : null;
        if (!existing.alive) existing.setState('death');
        else if (existing.state === 'death') existing.setState('idle');
      }
    };

    if (replaceRegionList && serverList.length > 0) {
      const keepIds = new Set(serverList.map((s) => s.id));
      for (let i = this.monsters.length - 1; i >= 0; i--) {
        if (!keepIds.has(this.monsters[i].id)) {
          this.monsters.splice(i, 1);
        }
      }
    }
    for (const sm of serverList) {
      upsertOne(sm);
    }
  }

  private applyClientDamageToPlayer(dmg: number, killerName: string, reason?: string) {
    if (this.player.dead || dmg <= 0) return;
    this.player.hp = Math.max(0, Math.round(this.player.hp - dmg));
    this.player.setState('hurt');
    this.floatingTexts.push({ x: this.player.x, y: this.player.y - 44, text: `-${dmg}`, color: '#ef4444', ttlMs: 850 });
    if (this.player.hp <= 0) {
      void this.triggerLocalOrServerDeath(killerName, reason);
    }
  }

  public async triggerLocalOrServerDeath(killerName: string, reason?: string) {
    if (this.player.dead && this.deathModalActive) return;
    this.player.dead = true;
    this.player.hp = 0;
    this.player.setState('death');
    this.autoCombatConfig.enabled = false;
    this.selectedTargetId = null;

    if (this.multiplayer?.connected && this.serverCharacterId) {
      const sockRes = await this.multiplayer.emitReportFatal(killerName, reason);
      if (sockRes?.success && sockRes.data) {
        this.handleServerPlayerDeath(sockRes.data);
        return;
      }
    }
    if (this.serverCharacterId) {
      const apiRes = await reportDeathApi(this.serverCharacterId, killerName, reason);
      if (apiRes.success && apiRes.data) {
        this.handleServerPlayerDeath(apiRes.data);
        return;
      }
    }

    // Pure offline solo death penalty fallback using exact shared rules (never resets Level!)
    const cp = resolveResurrectionCheckpoint(
      { discoveredVillageIds: this.discoveredVillageIds, latestVillageCheckpointId: this.latestVillageCheckpointId, preferredResurrectionVillageId: this.preferredResurrectionVillageId ?? undefined },
      this.regionId
    );
    const outcome = computeDeathPenaltyApplication({
      character: {
        level: this.player.level,
        exp: this.player.exp,
        classId: this.player.classId as any,
        jobAdvancementCompleted: this.player.jobAdvancementCompleted,
        advancedJobId: this.advancedJobId as any,
        evolutionTier: this.player.evolutionTier,
        deathPenalty: this.deathPenalty,
      },
      resurrectionMapId: cp.id,
      killerName,
      reason,
      nowMs: Date.now(),
    });
    this.player.exp = outcome.nextExp;
    this.player.level = outcome.nextLevel; // Level never resets
    this.deathPenalty = outcome.penalty;
    this.deathCount += 1;
    this.deathModalActive = true;
    this.saveLocalProgress();
    this.emitHudSnapshot();
    this.onPlayerDiedUi?.({
      killerName,
      reason: reason || 'Sinh lực cạn kiệt',
      levelPreserved: this.player.level,
      expLost: outcome.expLost,
      penalty: outcome.penalty,
      checkpointNameVi: cp.nameVi,
      checkpointId: cp.id,
    });
  }

  private handleServerPlayerDeath(deathPayload: any) {
    if (!deathPayload) return;
    this.player.dead = true;
    this.player.hp = 0;
    this.player.setState('death');
    this.autoCombatConfig.enabled = false;
    this.selectedTargetId = null;

    if (deathPayload.player) {
      this.player.exp = Number(deathPayload.player.exp ?? this.player.exp);
      this.player.level = Math.max(1, Number(deathPayload.player.level ?? this.player.level));
    }
    this.deathPenalty = deathPayload.penalty || null;
    this.deathCount += 1;
    this.deathModalActive = true;
    this.saveLocalProgress();
    this.emitHudSnapshot();

    const cp = deathPayload.checkpoint || resolveResurrectionCheckpoint(
      { discoveredVillageIds: this.discoveredVillageIds, latestVillageCheckpointId: this.latestVillageCheckpointId },
      this.regionId
    );
    this.onPlayerDiedUi?.({
      killerName: deathPayload.killerName || 'Quái Vật',
      reason: deathPayload.reason || 'Bị hạ gục',
      levelPreserved: this.player.level,
      expLost: Number(deathPayload.expLost || 0),
      penalty: this.deathPenalty,
      checkpointNameVi: cp.nameVi || cp.name || 'Thôn Khởi Nguyên',
      checkpointId: cp.id || 'THON_KHOI_NGUYEN',
    });
  }

  public async requestCheckpointResurrection() {
    if (this.multiplayer?.connected && this.serverCharacterId) {
      const sockRes = await this.multiplayer.emitRespawn();
      if (sockRes.success && sockRes.data) {
        await this.handleServerPlayerResurrected({ snapshot: sockRes.data, checkpoint: sockRes.data.resurrectionCheckpoint, deathPenalty: sockRes.data.deathPenalty });
        return;
      }
    }
    if (this.serverCharacterId) {
      const apiRes = await resurrectAtCheckpointApi(this.serverCharacterId);
      if (apiRes.success && apiRes.data) {
        await this.handleServerPlayerResurrected({ snapshot: apiRes.data.character, checkpoint: apiRes.data.checkpoint, deathPenalty: apiRes.data.character?.deathPenalty });
        return;
      }
    }

    const cp = resolveResurrectionCheckpoint(
      { discoveredVillageIds: this.discoveredVillageIds, latestVillageCheckpointId: this.latestVillageCheckpointId, preferredResurrectionVillageId: this.preferredResurrectionVillageId ?? undefined },
      this.regionId
    );
    await this.handleServerPlayerResurrected({ checkpoint: cp, deathPenalty: this.deathPenalty });
  }

  private async handleServerPlayerResurrected(payload: any) {
    this.deathModalActive = false;
    this.player.dead = false;
    this.autoCombatConfig.enabled = false;
    const cp = payload?.checkpoint || resolveResurrectionCheckpoint(
      { discoveredVillageIds: this.discoveredVillageIds, latestVillageCheckpointId: this.latestVillageCheckpointId },
      this.regionId
    );
    if (payload?.deathPenalty !== undefined) {
      this.deathPenalty = payload.deathPenalty;
    }
    const targetVillageId = cp?.id || 'THON_KHOI_NGUYEN';
    if (!this.discoveredVillageIds.includes(targetVillageId)) {
      this.discoveredVillageIds.push(targetVillageId);
    }
    this.latestVillageCheckpointId = targetVillageId;

    if (this.regionId !== targetVillageId) {
      await this.switchRegion(targetVillageId, {
        targetTx: cp?.spawnTx ?? 11,
        targetTy: cp?.spawnTy ?? 20,
        silentTransition: false,
      });
    } else if (cp?.spawnX && cp?.spawnY) {
      this.player.x = cp.spawnX;
      this.player.y = cp.spawnY;
      this.centerCameraImmediate();
    }

    const afterStats = this.getComputedStats();
    this.player.maxHp = Math.max(100, Number(payload?.snapshot?.maxHp ?? this.player.maxHp));
    this.player.maxMp = Math.max(50, Number(payload?.snapshot?.maxMp ?? this.player.maxMp));
    this.player.hp = this.player.maxHp;
    this.player.mp = this.player.maxMp;
    this.player.setState('idle');
    if (afterStats.atk > 0) this.spawnVfx('vfx_divine_heal', this.player.x, this.player.y - 16, 156);
    this.saveLocalProgress();
    this.scheduleServerStateSync(true);
    this.emitHudSnapshot();
    this.onPlayerResurrectedUi?.(cp);
    this.onToast?.(`✨ Hồi sinh an toàn tại ${cp?.nameVi || targetVillageId}! (Cấp Lv.${this.player.level} được giữ nguyên)`);
  }

  public async confirmStatAllocations(
    allocations: Partial<Record<keyof PrimaryAttributesState, number>>
  ): Promise<{ success: boolean; error?: string }> {
    let charId = this.serverCharacterId || getActiveCharacterCache()?.id || null;
    if (!charId) {
      const guest = await guestAuthApi();
      if (guest.success && guest.character) {
        this.hydrateFromServerCharacter(guest.character, guest.computedStats);
        charId = guest.character.id;
      }
    }
    if (!charId) {
      return { success: false, error: 'Chưa kết nối được nhân vật trên máy chủ.' };
    }

    const res = await allocateCharacterStatsApi(charId, allocations);
    if (!res.success || !res.data) {
      this.onToast?.(res.error || 'Không thể lưu điểm thuộc tính.');
      return { success: false, error: res.error || 'Phân bổ chỉ số thất bại.' };
    }

    const updated = res.data;
    const prevMaxHp = this.player.maxHp;
    const prevMaxMp = this.player.maxMp;
    const nextUnspent = Number(updated.unspentStatPoints ?? updated.availableAttributePoints ?? 0);

    this.player.potentialPoints = Math.max(0, nextUnspent);
    this.player.baseStats = { ...updated.baseStats };
    this.player.attributes = { ...(updated.attributes || updated.baseStats) };
    this.player.maxHp = Number(res.computedStats?.computed?.maxHp ?? updated.maxHp ?? prevMaxHp);
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + Math.max(0, this.player.maxHp - prevMaxHp));
    this.player.maxMp = Number(res.computedStats?.computed?.maxMp ?? updated.maxMp ?? prevMaxMp);
    this.player.mp = Math.min(this.player.maxMp, this.player.mp + Math.max(0, this.player.maxMp - prevMaxMp));

    this.saveLocalProgress();
    this.emitHudSnapshot();
    return { success: true };
  }

  public allocateAttribute(stat: keyof PrimaryAttributesState) {
    if (this.player.potentialPoints <= 0) {
      this.onToast?.('Chưa có điểm tiềm năng khả dụng!');
      return;
    }
    void this.confirmStatAllocations({ [stat]: 1 });
  }

  public quickUseConsumable(iconKey: 'potion_hp' | 'potion_mp' | 'scroll_town') {
    const item = this.inventory.find((i) => i.category === 'consumable' && i.iconKey === iconKey);
    if (!item) {
      this.onToast?.('Đã hết vật phẩm này trong Balo!');
      return;
    }
    this.useOrEquipItem(item.id);
  }

  public buyShopItem(shopId: string, quantity = 1): boolean {
    const qty = Math.max(1, Math.min(99, Math.floor(Number(quantity) || 1)));
    const template = this.shopCatalog.find((s) => s.id === shopId);
    if (!template) {
      this.onToast?.('Vật phẩm không có trong cửa hàng.');
      return false;
    }
    const price = Number(template.price || 50);
    const totalCost = price * qty;
    if (this.gold < totalCost) {
      this.onToast?.('Không đủ vàng để mua vật phẩm.');
      return false;
    }
    const isStackable = template.category !== 'equip';
    const existing = isStackable ? this.inventory.find((i) => (i.id === template.id || i.iconKey === template.iconKey) && i.category === template.category) : null;
    const slotsNeeded = isStackable ? (existing ? 0 : 1) : qty;
    if (this.inventory.length + slotsNeeded > 30) {
      this.onToast?.('Túi đồ không còn chỗ trống.');
      return false;
    }
    this.gold -= totalCost;
    if (isStackable) {
      if (existing) existing.qty += qty;
      else this.inventory.push({ ...template, qty });
    } else {
      for (let i = 0; i < qty; i++) {
        this.inventory.unshift({ ...template, id: `${template.id}_${Date.now()}_${i}`, qty: 1 });
      }
    }
    this.recordClientQuestProgress({ type: 'OBTAIN_ITEM', targetId: template.id, amount: qty });
    if (this.serverCharacterId) {
      void buyShopItemApi(this.serverCharacterId, shopId, qty);
    }
    this.saveLocalProgress();
    this.onToast?.(`Đã mua ${qty}x ${template.name} (-${totalCost.toLocaleString()} Vàng)`);
    this.emitHudSnapshot();
    return true;
  }

  public sellShopItem(itemId: string, quantity = 1): boolean {
    const qty = Math.max(1, Math.min(99, Math.floor(Number(quantity) || 1)));
    const idx = this.inventory.findIndex((i) => i.id === itemId);
    if (idx < 0) {
      this.onToast?.('Không tìm thấy vật phẩm trong Balo.');
      return false;
    }
    const item = this.inventory[idx];
    const equippedIds = new Set(Object.values(this.equipment).filter(Boolean).map((e) => e!.id));
    if (equippedIds.has(item.id)) {
      this.onToast?.('Không thể bán vật phẩm đang mặc trên người.');
      return false;
    }
    if (item.isUnique || item.isCharacterBound || item.id === 'ITEM_AWAKENING_CERTIFICATE' || item.id.startsWith('QUEST_')) {
      this.onToast?.('Vật phẩm nhiệm vụ hoặc trang bị khóa định danh không thể bán.');
      return false;
    }
    const sellQty = Math.min(qty, Number(item.qty || 1));
    const unitPrice = Math.max(1, Math.floor(Number(item.price || 40) * 0.4));
    const totalGold = unitPrice * sellQty;
    if (item.qty > sellQty) {
      item.qty -= sellQty;
    } else {
      this.inventory.splice(idx, 1);
    }
    this.gold += totalGold;
    if (this.serverCharacterId) {
      void sellShopItemApi(this.serverCharacterId, itemId, sellQty);
    }
    this.saveLocalProgress();
    this.onToast?.(`Đã bán ${sellQty}x ${item.name} (+${totalGold.toLocaleString()} Vàng)`);
    this.emitHudSnapshot();
    return true;
  }

  public discardInventoryItem(itemId: string, quantity = 1): boolean {
    const qty = Math.max(1, Math.min(99, Math.floor(Number(quantity) || 1)));
    const idx = this.inventory.findIndex((i) => i.id === itemId);
    if (idx < 0) {
      this.onToast?.('Không tìm thấy vật phẩm trong Balo.');
      return false;
    }
    const item = this.inventory[idx];
    if (item.isUnique || item.id === 'ITEM_AWAKENING_CERTIFICATE' || item.id.startsWith('QUEST_')) {
      this.onToast?.('Không thể vứt bỏ vật phẩm nhiệm vụ hoặc trang bị Độc Nhất.');
      return false;
    }
    const discardQty = Math.min(qty, Number(item.qty || 1));
    if (item.qty > discardQty) {
      item.qty -= discardQty;
    } else {
      this.inventory.splice(idx, 1);
    }
    if (this.serverCharacterId) {
      void discardInventoryItemApi(this.serverCharacterId, itemId, discardQty);
    }
    this.saveLocalProgress();
    this.onToast?.(`Đã vứt bỏ ${discardQty}x ${item.name}.`);
    this.emitHudSnapshot();
    return true;
  }

  public sortInventory(): void {
    const catRank: Record<string, number> = { equip: 1, consumable: 2, material: 3 };
    const rarRank: Record<string, number> = { mythic: 1, legendary: 2, epic: 3, rare: 4, uncommon: 5, common: 6 };
    this.inventory.sort((a, b) => {
      const ca = catRank[a.category] || 9;
      const cb = catRank[b.category] || 9;
      if (ca !== cb) return ca - cb;
      const ra = rarRank[a.rarity] || 9;
      const rb = rarRank[b.rarity] || 9;
      if (ra !== rb) return ra - rb;
      return String(a.name || a.id).localeCompare(String(b.name || b.id), 'vi');
    });
    if (this.serverCharacterId) {
      void sortInventoryApi(this.serverCharacterId);
    }
    this.saveLocalProgress();
    this.onToast?.('Đã sắp xếp túi đồ gọn gàng.');
    this.emitHudSnapshot();
  }

  public repairEquipment(): boolean {
    const equippedList = Object.values(this.equipment).filter(Boolean) as InventoryItemDef[];
    if (equippedList.length === 0) {
      this.onToast?.('Chưa có trang bị nào đang mặc để sửa chữa.');
      return false;
    }
    const repairFee = Math.min(this.gold, equippedList.length * 15);
    this.gold = Math.max(0, this.gold - repairFee);
    if (this.serverCharacterId) {
      void repairEquipmentApi(this.serverCharacterId);
    }
    this.saveLocalProgress();
    this.onToast?.(`🔧 Đã sửa chữa toàn bộ ${equippedList.length} trang bị (Độ bền 100%, -${repairFee} Vàng)!`);
    this.emitHudSnapshot();
    return true;
  }

  public depositToStorage(itemId: string) {
    const idx = this.inventory.findIndex((i) => i.id === itemId);
    if (idx < 0) return;
    const item = this.inventory[idx];
    this.inventory.splice(idx, 1);
    const existing = item.category !== 'equip' ? this.storage.find((s) => s.name === item.name) : null;
    if (existing) existing.qty += item.qty;
    else this.storage.unshift({ ...item });
    this.onToast?.(`Đã cất vào Kho: ${item.name}`);
    this.emitHudSnapshot();
  }

  public withdrawFromStorage(itemId: string) {
    const idx = this.storage.findIndex((i) => i.id === itemId);
    if (idx < 0) return;
    if (this.inventory.length >= 24) {
      this.onToast?.('Balo đã đầy (24/24)!');
      return;
    }
    const item = this.storage[idx];
    this.storage.splice(idx, 1);
    this.inventory.unshift({ ...item });
    this.onToast?.(`Đã rút từ Kho: ${item.name}`);
    this.emitHudSnapshot();
  }

  public claimQuestReward(questId?: string) {
    if (questId && this.worldQuestsCatalog.some((wq) => wq.id === questId)) {
      return this.claimWorldQuestReward(questId);
    }
    const q = questId ? this.quests.find((x) => x.id === questId) : this.quests.find((x) => x.completed && !x.claimed);
    if (!q || !q.completed || q.claimed) return false;
    q.claimed = true;
    const goldGain = q.rewardGold || 200;
    const expGain = q.rewardExp || 100;
    this.gold += goldGain;
    const lvls = this.player.gainExp(expGain);
    if (q.id === 'q_slime' && !this.player.completedQuests.includes('QUEST_001_SLIME_CLEAR')) {
      this.player.completedQuests.push('QUEST_001_SLIME_CLEAR');
    }
    this.evaluateClientTitleUnlocks();
    this.recalculateClientTitleBonuses(false);
    this.saveLocalProgress();
    this.floatingTexts.push({ x: this.player.x, y: this.player.y - 52, text: `+${goldGain}G +${expGain} EXP`, color: '#fde047', ttlMs: 1200 });
    if (lvls > 0) this.onLevelUp();
    this.onToast?.(`Hoàn thành "${q.title}"! Nhận ${goldGain} Vàng & ${expGain} EXP.`);
    this.emitHudSnapshot();
    return true;
  }

  private countClientInventoryItem(itemId: string): number {
    return this.inventory.reduce((sum, it) => (it.id === itemId ? sum + Number(it.qty || 1) : sum), 0);
  }

  private doesClientQuestTargetMatch(objTargetId?: string, eventTargetId?: string): boolean {
    if (!objTargetId || objTargetId === 'ANY') return true;
    if (!eventTargetId) return false;
    if (objTargetId === eventTargetId) return true;
    const slimeAliases = new Set(['MONSTER_GREEN_SLIME', 'MONSTER_SLIME_MEADOW', 'mon_green_slime', 'mon_red_slime', 'monster_slime']);
    if (slimeAliases.has(objTargetId) && slimeAliases.has(eventTargetId)) return true;
    const goblinAliases = new Set(['MONSTER_GOBLIN_SCOUT', 'mon_goblin_scout', 'monster_goblin']);
    if (goblinAliases.has(objTargetId) && goblinAliases.has(eventTargetId)) return true;
    return false;
  }

  private getAggregatedKillCount(targetId: string): number {
    const slimeAliases = ['MONSTER_GREEN_SLIME', 'MONSTER_SLIME_MEADOW', 'mon_green_slime', 'mon_red_slime', 'monster_slime'];
    if (slimeAliases.includes(targetId)) {
      return slimeAliases.reduce((sum, k) => sum + Number(this.monsterKillCounts[k] || 0), 0);
    }
    const goblinAliases = ['MONSTER_GOBLIN_SCOUT', 'mon_goblin_scout', 'monster_goblin'];
    if (goblinAliases.includes(targetId)) {
      return goblinAliases.reduce((sum, k) => sum + Number(this.monsterKillCounts[k] || 0), 0);
    }
    return Number(this.monsterKillCounts[targetId] || 0);
  }

  private syncClientQuestProgressObj(progress: ActiveQuestProgress, def: QuestDefinition) {
    for (const obj of def.objectives || []) {
      const reqCount = Math.max(1, Number(obj.requiredCount ?? (obj as any).required ?? 1));
      const objNorm = (obj.type as string) === 'TALK_NPC' || (obj.type as string) === 'TALK_TO_NPC' ? 'NPC_DIALOGUE' : (obj.type as string);
      if (objNorm === 'COLLECT_ITEM' || objNorm === 'OBTAIN_ITEM') {
        const cnt = this.countClientInventoryItem(obj.targetId);
        progress.objectives[obj.id] = Math.min(reqCount, Math.max(Number(progress.objectives[obj.id] || 0), cnt));
      } else if ((objNorm === 'EXPLORE_MAP' || objNorm === 'ENTER_MAP' || objNorm === 'VISIT_LOCATION') && this.visitedMaps.includes(obj.targetId)) {
        progress.objectives[obj.id] = Math.max(Number(progress.objectives[obj.id] || 0), reqCount);
      } else if (objNorm === 'REACH_LEVEL') {
        const targetLv = Number(obj.targetId) || reqCount || 1;
        if (this.player.level >= targetLv) {
          progress.objectives[obj.id] = Math.max(Number(progress.objectives[obj.id] || 0), reqCount);
        }
      } else if (objNorm === 'KILL_MONSTER' || objNorm === 'DEFEAT_BOSS') {
        const kills = this.getAggregatedKillCount(obj.targetId);
        if (kills > Number(progress.objectives[obj.id] || 0)) {
          progress.objectives[obj.id] = Math.min(reqCount, kills);
        }
      }
    }
    progress.completed = (def.objectives || []).every((o) => {
      const req = Math.max(1, Number(o.requiredCount ?? (o as any).required ?? 1));
      return Number(progress.objectives[o.id] || 0) >= req;
    });
  }

  private syncClientChainProgress(quest: QuestDefinition, isCompleted: boolean) {
    if (!quest.chainId) return;
    const chain = this.worldQuestChains.find((c) => c.id === quest.chainId);
    if (!chain) return;
    const state: QuestChainProgressState = this.questChainProgress[chain.id] || {
      chainId: chain.id,
      currentStep: 1,
      completedSteps: [],
      completed: false,
    };
    if (isCompleted && !state.completedSteps.includes(quest.id)) {
      state.completedSteps.push(quest.id);
    }
    const doneAll = chain.quests.every((qid) => state.completedSteps.includes(qid));
    state.completed = doneAll;
    state.currentStep = doneAll
      ? chain.quests.length
      : Math.min(chain.quests.length, state.completedSteps.length + 1);
    this.questChainProgress[chain.id] = state;
  }

  public isWorldQuestHiddenFromPlayer(q: QuestDefinition): boolean {
    if (!(q.isHidden || q.questType === 'HIDDEN_QUEST')) return false;
    return (
      !this.discoveredHiddenQuests.includes(q.id) &&
      !this.activeWorldQuests[q.id] &&
      !this.player.completedQuests.includes(q.id)
    );
  }

  public acceptWorldQuest(questId: string, opts: { fromHiddenTrigger?: boolean; bypassPrerequisites?: boolean } = {}): boolean {
    const q = this.worldQuestsCatalog.find((x) => x.id === questId);
    if (!q) {
      this.onToast?.(`Không tìm thấy nhiệm vụ ${questId}.`);
      return false;
    }
    if (!opts.fromHiddenTrigger && !opts.bypassPrerequisites && this.isWorldQuestHiddenFromPlayer(q)) {
      this.onToast?.('Nhiệm vụ bí ẩn này chưa được kích hoạt.');
      return false;
    }
    if (!q.repeatable && (this.player.completedQuests.includes(q.id) || this.claimedRewardKeys.includes(`quest:${q.id}`))) {
      this.onToast?.(`Nhiệm vụ "${q.name}" đã hoàn thành trước đó.`);
      return false;
    }
    if (!opts.bypassPrerequisites) {
      if (this.player.level < Number(q.requiredLevel || 1)) {
        this.onToast?.(`Cần đạt Lv.${q.requiredLevel} để nhận "${q.name}".`);
        return false;
      }
      for (const pre of q.prerequisiteQuestIds || []) {
        if (!this.player.completedQuests.includes(pre)) {
          this.onToast?.(`Cần hoàn thành nhiệm vụ tiền đề "${pre}" trước.`);
          return false;
        }
      }
      for (const tid of q.requiredTitleIds || []) {
        if (!this.unlockedTitles.includes(tid)) {
          this.onToast?.(`Cần danh hiệu "${tid}" để mở khóa.`);
          return false;
        }
      }
    }
    if (!this.activeWorldQuests[q.id]) {
      const objectives: Record<string, number> = {};
      for (const obj of q.objectives || []) objectives[obj.id] = 0;
      const entry: ActiveQuestProgress = {
        questId: q.id,
        startedAt: new Date().toISOString(),
        objectives,
        completed: false,
        hiddenDiscovered: Boolean(q.isHidden || q.questType === 'HIDDEN_QUEST'),
      };
      this.syncClientQuestProgressObj(entry, q);
      this.activeWorldQuests[q.id] = entry;
      if ((q.isHidden || q.questType === 'HIDDEN_QUEST') && !this.discoveredHiddenQuests.includes(q.id)) {
        this.discoveredHiddenQuests.push(q.id);
      }
      // Single-Quest HUD Tracking Rule: only auto-track when no quest is currently tracked
      if (!this.trackedQuestId) {
        this.trackedQuestId = q.id;
      }
      this.syncClientChainProgress(q, false);
      if (this.serverCharacterId) {
        void acceptQuestApi(this.serverCharacterId, q.id);
      }
      this.saveLocalProgress();
      this.onToast?.(
        opts.fromHiddenTrigger
          ? `✨ KHAI MỞ NHIỆM VỤ BÍ ẨN: "${q.name}"!`
          : `Đã nhận nhiệm vụ: "${q.name}"`
      );
      this.emitHudSnapshot();
    }
    return true;
  }

  public trackWorldQuest(questId: string | null): boolean {
    if (!questId) {
      this.trackedQuestId = null;
      if (this.serverCharacterId) {
        void trackQuestApi(this.serverCharacterId, null);
      }
      this.saveLocalProgress();
      this.onToast?.('Đã bỏ theo dõi nhiệm vụ trên HUD.');
      this.emitHudSnapshot();
      return true;
    }
    if (!this.activeWorldQuests[questId]) {
      this.onToast?.('Chỉ có thể theo dõi nhiệm vụ đang thực hiện.');
      return false;
    }
    const q = this.worldQuestsCatalog.find((x) => x.id === questId);
    // Strict Single-Quest Rule: replaces any previously tracked quest immediately
    this.trackedQuestId = questId;
    if (this.serverCharacterId) {
      void trackQuestApi(this.serverCharacterId, questId);
    }
    this.saveLocalProgress();
    this.onToast?.(`🎯 Đang theo dõi nhiệm vụ: "${q?.name || questId}"`);
    this.emitHudSnapshot();
    return true;
  }

  public abandonWorldQuest(questId: string): boolean {
    const active = this.activeWorldQuests[questId];
    if (!active) {
      this.onToast?.('Bạn chưa nhận nhiệm vụ này.');
      return false;
    }
    const q = this.worldQuestsCatalog.find((x) => x.id === questId);
    if (q && q.abandonable === false) {
      this.onToast?.(`Nhiệm vụ cốt truyện "${q.name}" không thể hủy bỏ.`);
      return false;
    }
    delete this.activeWorldQuests[questId];
    if (this.trackedQuestId === questId) {
      this.trackedQuestId = null;
    }
    if (this.serverCharacterId) {
      void abandonQuestApi(this.serverCharacterId, questId);
    }
    this.saveLocalProgress();
    this.onToast?.(`Đã hủy nhiệm vụ "${q?.name || questId}". Nhiệm vụ đã quay lại danh sách Có Thể Nhận.`);
    this.emitHudSnapshot();
    return true;
  }

  public findTrackedQuestTarget(): void {
    const trackedId = this.trackedQuestId;
    if (!trackedId || !this.activeWorldQuests[trackedId]) {
      this.onToast?.('Chưa có nhiệm vụ đang theo dõi trên HUD.');
      return;
    }
    const prog = this.activeWorldQuests[trackedId];
    const q = this.worldQuestsCatalog.find((x) => x.id === trackedId);
    if (!q) return;
    this.syncClientQuestProgressObj(prog, q);

    if (prog.completed) {
      const turnInNpcId = q.endNpcId || q.startNpcId;
      const npc = this.npcs.find((n) => n.id === turnInNpcId);
      if (npc) {
        const path = this.tilemap.findPath(this.player.x, this.player.y, npc.x, npc.y);
        if (path.length > 0) this.player.assignPath(path);
        this.onToast?.(`🧭 Đang di chuyển tới ${npc.name} để báo cáo "${q.name}"!`);
        return;
      }
      this.onToast?.(`🧭 Hãy tới gặp NPC ${turnInNpcId} tại khu vực ${q.regionId} để trả nhiệm vụ "${q.name}"!`);
      return;
    }

    const nextObj = (q.objectives || []).find((o) => {
      const req = Math.max(1, Number(o.requiredCount ?? (o as any).required ?? 1));
      return Number(prog.objectives[o.id] || 0) < req;
    });
    if (!nextObj) return;

    if (nextObj.type === 'NPC_DIALOGUE' || nextObj.type === 'TALK_NPC' || nextObj.type === 'TALK_TO_NPC') {
      const npc = this.npcs.find((n) => n.id === nextObj.targetId);
      if (npc) {
        const path = this.tilemap.findPath(this.player.x, this.player.y, npc.x, npc.y);
        if (path.length > 0) this.player.assignPath(path);
        this.onToast?.(`🧭 Đang di chuyển tới gặp ${npc.name}!`);
        return;
      }
    }

    if (nextObj.type === 'KILL_MONSTER' || nextObj.type === 'DEFEAT_BOSS') {
      const mon = this.monsters
        .filter((m) => m.alive && this.doesClientQuestTargetMatch(nextObj.targetId, m.monsterId || (m.spriteId === 'monster_slime' ? 'MONSTER_GREEN_SLIME' : m.spriteId === 'monster_goblin' ? 'MONSTER_GOBLIN_SCOUT' : m.spriteId)))
        .sort((a, b) => Math.hypot(a.x - this.player.x, a.y - this.player.y) - Math.hypot(b.x - this.player.x, b.y - this.player.y))[0];
      if (mon) {
        this.selectedTargetId = mon.id;
        const path = this.tilemap.findPath(this.player.x, this.player.y, mon.x, mon.y);
        if (path.length > 0) this.player.assignPath(path);
        this.onToast?.(`🧭 Đã khóa mục tiêu: ${mon.name} (${nextObj.description})!`);
        return;
      }
    }

    this.onToast?.(`🧭 Mục tiêu "${nextObj.description}" — Khu vực: ${q.regionId}`);
  }

  public grantClientUniqueEquipment(uniqueId: string): boolean {
    const uq = this.worldUniqueEquipment.find((u) => u.id === uniqueId);
    if (!uq) return false;
    if (this.claimedRewardKeys.includes(`unique:${uq.id}`) || this.ownedUniqueEquipmentIds.includes(uq.id)) {
      return false; // Non-repeatable Unique protection
    }
    const bindCheck = checkUniqueEquipmentBinding(
      uq,
      {
        id: 'player_local',
        userId: 'local_user',
        ownedUniqueEquipmentIds: this.ownedUniqueEquipmentIds,
      } as any,
      [
        {
          id: 'player_local',
          userId: 'local_user',
          ownedUniqueEquipmentIds: this.ownedUniqueEquipmentIds,
        } as any,
      ]
    );
    if (!bindCheck.allowed) return false;
    this.ownedUniqueEquipmentIds.push(uq.id);
    this.claimedRewardKeys.push(`unique:${uq.id}`);
    const def = this.convertWorldItemToInventoryDef(uq, 1);
    this.inventory.unshift(def);
    this.floatingTexts.push({ x: this.player.x, y: this.player.y - 84, text: `UNIQUE: ${def.name}`, color: '#f59e0b', ttlMs: 1800 });
    this.onToast?.(`🏆 Nhận Trang Bị Độc Nhất (Unique): ${def.name}!`);
    return true;
  }

  public unlockClientTitle(titleId: string): boolean {
    const def = this.worldTitles.find((t) => t.id === titleId);
    if (!def) return false;
    if (this.unlockedTitles.includes(def.id) || this.claimedRewardKeys.includes(`title:${def.id}`)) {
      return false;
    }
    this.unlockedTitles.push(def.id);
    this.claimedRewardKeys.push(`title:${def.id}`);
    this.recalculateClientTitleBonuses(false);
    this.floatingTexts.push({ x: this.player.x, y: this.player.y - 96, text: `DANH HIỆU: ${def.nameVi || def.name}`, color: '#fde047', ttlMs: 1800 });
    this.onToast?.(`🎖 Mở Khóa Danh Hiệu Vĩnh Viễn: "${def.nameVi || def.name}"! (Chỉ số tự động cộng dồn vĩnh viễn)`);
    return true;
  }

  public evaluateClientTitleUnlocks(): string[] {
    const newlyUnlocked: string[] = [];
    for (const t of this.worldTitles) {
      if (this.unlockedTitles.includes(t.id) || this.claimedRewardKeys.includes(`title:${t.id}`)) continue;
      const cond = t.unlockConditions || {};
      if (cond.minLevel && this.player.level < cond.minLevel) continue;
      if ((cond.questIds || []).some((qid) => !this.player.completedQuests.includes(qid))) continue;
      if ((cond.completedChainIds || []).some((cid) => !this.questChainProgress[cid]?.completed)) continue;
      if ((cond.visitedMapIds || []).some((mid) => !this.visitedMaps.includes(mid))) continue;
      if ((cond.ownedUniqueItemIds || []).some((uid) => !this.ownedUniqueEquipmentIds.includes(uid))) continue;
      let killsOk = true;
      for (const [monId, reqKills] of Object.entries(cond.killedMonsterIds || {})) {
        if (Number(this.monsterKillCounts[monId] || 0) < Number(reqKills)) {
          killsOk = false;
          break;
        }
      }
      if (!killsOk) continue;
      if (this.unlockClientTitle(t.id)) {
        newlyUnlocked.push(t.id);
      }
    }
    return newlyUnlocked;
  }

  public recalculateClientTitleBonuses(emit = true): TitleBonusSummary {
    const summary = computePermanentTitleBonuses(
      this.unlockedTitles,
      this.worldTitles,
      this.worldTitleBonusLimits,
      this.equippedCosmeticTitleId
    );
    this.cachedTitleBonuses = summary;
    const activeCosmeticDef = summary.equippedCosmeticTitleId
      ? this.worldTitles.find((t) => t.id === summary.equippedCosmeticTitleId)
      : undefined;
    this.player.cosmeticTitleLabel = activeCosmeticDef ? (activeCosmeticDef.nameVi || activeCosmeticDef.name) : null;
    if (emit) {
      this.saveLocalProgress();
      this.emitHudSnapshot();
    }
    return summary;
  }

  public equipCosmeticTitle(titleId: string | null) {
    if (titleId && !this.unlockedTitles.includes(titleId)) {
      this.onToast?.('Bạn chưa mở khóa danh hiệu này.');
      return;
    }
    this.equippedCosmeticTitleId = titleId;
    const summary = this.recalculateClientTitleBonuses(true);
    const label = summary.equippedCosmeticTitleId
      ? this.worldTitles.find((t) => t.id === summary.equippedCosmeticTitleId)?.nameVi || summary.equippedCosmeticTitleId
      : 'Không hiển thị';
    this.onToast?.(`Hiển thị Danh Hiệu (Cosmetic): ${label}. (Chỉ số vĩnh viễn từ toàn bộ danh hiệu đã mở không thay đổi)`);
  }

  public claimWorldQuestReward(questId: string): boolean {
    const q = this.worldQuestsCatalog.find((x) => x.id === questId);
    if (!q) return false;
    const rewardKey = `quest:${questId}`;
    if (!q.repeatable && (this.claimedRewardKeys.includes(rewardKey) || this.player.completedQuests.includes(questId))) {
      this.onToast?.(`Phần thưởng "${q.name}" đã được nhận (Không thể nhận trùng).`);
      return false;
    }
    const prog = this.activeWorldQuests[questId];
    if (!prog) {
      this.onToast?.('Bạn chưa nhận nhiệm vụ này.');
      return false;
    }
    this.syncClientQuestProgressObj(prog, q);
    if (!prog.completed) {
      this.onToast?.(`Chưa hoàn thành đủ mục tiêu của "${q.name}".`);
      return false;
    }

    delete this.activeWorldQuests[questId];
    if (this.trackedQuestId === questId) {
      this.trackedQuestId = null;
    }
    if (!this.player.completedQuests.includes(questId)) this.player.completedQuests.push(questId);
    this.completedQuestHistory[questId] = {
      completedAt: new Date().toISOString(),
      rewards: q.rewards,
    };
    if (questId === 'QUEST_001_SLIME_CLEAR') {
      const qSlime = this.quests.find((x) => x.id === 'q_slime');
      if (qSlime) {
        qSlime.completed = true;
        qSlime.claimed = true;
      }
    }
    if (!q.repeatable) this.claimedRewardKeys.push(rewardKey);
    this.syncClientChainProgress(q, true);
    if (this.serverCharacterId) {
      void claimQuestRewardApi(this.serverCharacterId, questId);
    }

    const goldGain = Number(q.rewards?.gold || 0);
    const expGain = Number(q.rewards?.exp || 0);
    this.gold += goldGain;
    const lvls = this.player.gainExp(expGain);

    for (const it of q.rewards?.items || []) {
      const meta = [...this.worldItems, ...INITIAL_ITEMS].find((x: any) => x.id === it.itemId);
      const qty = Number(it.quantity || 1);
      const existing = this.inventory.find((x) => x.id === it.itemId && x.category !== 'equip');
      if (existing) existing.qty += qty;
      else if (meta) this.inventory.unshift(this.convertWorldItemToInventoryDef(meta, qty));
    }

    for (const ueId of q.rewards?.uniqueEquipmentIds || []) {
      this.grantClientUniqueEquipment(ueId);
    }
    for (const tid of q.rewards?.unlockTitleIds || []) {
      this.unlockClientTitle(tid);
    }

    if (q.chainId && this.questChainProgress[q.chainId]?.completed) {
      const chain = this.worldQuestChains.find((c) => c.id === q.chainId);
      const chainKey = `chain:${q.chainId}`;
      if (chain?.completionRewards && !this.claimedRewardKeys.includes(chainKey)) {
        this.claimedRewardKeys.push(chainKey);
        this.gold += Number(chain.completionRewards.gold || 0);
        this.player.gainExp(Number(chain.completionRewards.exp || 0));
        for (const ueId of chain.completionRewards.uniqueEquipmentIds || []) {
          this.grantClientUniqueEquipment(ueId);
        }
        for (const tid of chain.completionRewards.unlockTitleIds || []) {
          this.unlockClientTitle(tid);
        }
      }
    }

    this.evaluateClientTitleUnlocks();
    this.recalculateClientTitleBonuses(false);
    this.saveLocalProgress();
    if (lvls > 0) this.onLevelUp();
    this.floatingTexts.push({ x: this.player.x, y: this.player.y - 56, text: `+${goldGain}G +${expGain} EXP`, color: '#fde047', ttlMs: 1200 });
    this.onToast?.(`Hoàn thành "${q.name}"! Nhận ${goldGain.toLocaleString()}G & ${expGain.toLocaleString()} EXP.`);
    this.emitHudSnapshot();
    return true;
  }

  public recordClientQuestProgress(event: {
    type: 'NPC_DIALOGUE' | 'TALK_NPC' | 'EXPLORE_MAP' | 'ENTER_MAP' | 'KILL_MONSTER' | 'COLLECT_ITEM' | 'OBTAIN_ITEM';
    targetId: string;
    amount?: number;
    keyword?: string;
  }) {
    const normalizedType =
      event.type === 'ENTER_MAP'
        ? 'EXPLORE_MAP'
        : event.type === 'TALK_NPC'
        ? 'NPC_DIALOGUE'
        : event.type === 'OBTAIN_ITEM'
        ? 'COLLECT_ITEM'
        : event.type;

    if (normalizedType === 'EXPLORE_MAP' && event.targetId && !this.visitedMaps.includes(event.targetId)) {
      this.visitedMaps.push(event.targetId);
    } else if (normalizedType === 'KILL_MONSTER' && event.targetId) {
      this.monsterKillCounts[event.targetId] =
        Number(this.monsterKillCounts[event.targetId] || 0) + Math.max(1, Number(event.amount || 1));
    } else if (normalizedType === 'NPC_DIALOGUE' && event.targetId) {
      const flag = event.keyword ? `${event.targetId}:${event.keyword}` : event.targetId;
      if (!this.dialogueFlags.includes(flag)) this.dialogueFlags.push(flag);
    }

    // Evaluate Hidden Triggers without ever exposing untriggered hidden quests beforehand
    const trigType = normalizedType === 'EXPLORE_MAP' ? 'ENTER_MAP' : normalizedType === 'COLLECT_ITEM' ? 'OBTAIN_ITEM' : normalizedType;
    for (const q of this.worldQuestsCatalog) {
      if (!(q.isHidden || q.questType === 'HIDDEN_QUEST') || !q.hiddenTrigger) continue;
      if (this.discoveredHiddenQuests.includes(q.id) || this.player.completedQuests.includes(q.id) || this.activeWorldQuests[q.id]) {
        continue;
      }
      const trig = q.hiddenTrigger;
      if (this.player.level < Number(trig.minLevel ?? q.requiredLevel ?? 1)) continue;
      if ((trig.requiredCompletedQuestIds || []).some((reqId) => !this.player.completedQuests.includes(reqId))) continue;
      let matched = false;
      if (trig.type === trigType && trig.targetId === event.targetId) {
        matched = trig.type === 'NPC_DIALOGUE' ? !trig.dialogueKeyword || trig.dialogueKeyword === event.keyword : true;
      } else if (trig.type === 'LEVEL_AND_QUEST' && this.player.level >= Number(trig.minLevel || 1)) {
        matched = true;
      }
      if (matched) {
        this.acceptWorldQuest(q.id, { fromHiddenTrigger: true });
      }
    }

    for (const prog of Object.values(this.activeWorldQuests)) {
      const def = this.worldQuestsCatalog.find((q) => q.id === prog.questId);
      if (!def) continue;
      for (const obj of def.objectives || []) {
        const reqCount = Math.max(1, Number(obj.requiredCount ?? (obj as any).required ?? 1));
        const objNorm = (obj.type as string) === 'TALK_NPC' || (obj.type as string) === 'TALK_TO_NPC' ? 'NPC_DIALOGUE' : (obj.type as string);
        if (objNorm === 'COLLECT_ITEM' || objNorm === 'OBTAIN_ITEM') {
          prog.objectives[obj.id] = Math.min(reqCount, Math.max(Number(prog.objectives[obj.id] || 0), this.countClientInventoryItem(obj.targetId)));
          continue;
        }
        if (objNorm !== normalizedType || !this.doesClientQuestTargetMatch(obj.targetId, event.targetId)) continue;
        if (objNorm === 'NPC_DIALOGUE' && obj.dialogueKeyword && event.keyword !== obj.dialogueKeyword) continue;
        const delta = objNorm === 'EXPLORE_MAP' || objNorm === 'NPC_DIALOGUE' ? 1 : Math.max(1, Number(event.amount || 1));
        prog.objectives[obj.id] = Math.min(reqCount, Number(prog.objectives[obj.id] || 0) + delta);
      }
      prog.completed = (def.objectives || []).every((o) => {
        const req = Math.max(1, Number(o.requiredCount ?? (o as any).required ?? 1));
        return Number(prog.objectives[o.id] || 0) >= req;
      });
    }

    if (this.serverCharacterId) {
      void recordQuestProgressApi(this.serverCharacterId, event);
    }

    this.evaluateClientTitleUnlocks();
    this.saveLocalProgress();
    this.emitHudSnapshot();
  }

  public getNpcDialogueTopics(npcId: string): Array<{ keyword: string; label: string; isHiddenHint?: boolean }> {
    const topics: Array<{ keyword: string; label: string; isHiddenHint?: boolean }> = [];
    // Active quest NPC dialogue prompts
    for (const prog of Object.values(this.activeWorldQuests)) {
      const def = this.worldQuestsCatalog.find((q) => q.id === prog.questId);
      if (!def) continue;
      for (const obj of def.objectives || []) {
        if ((obj.type === 'NPC_DIALOGUE' || obj.type === 'TALK_NPC') && obj.targetId === npcId && Number(prog.objectives[obj.id] || 0) < obj.requiredCount) {
          topics.push({
            keyword: obj.dialogueKeyword || 'quest_talk',
            label: obj.description,
          });
        }
      }
    }
    // Hidden quest atmospheric prompts (NEVER spoiling quest title or ID before discovery!)
    const secretLabels: Record<string, string> = {
      ancient_well: 'Hỏi thăm về tiếng vọng lạ dưới Giếng Nước Cổ...',
      dragon_riddle: 'Cùng Học Giả giải mã câu đố Cổ Thư Long Tộc...',
    };
    for (const q of this.worldQuestsCatalog) {
      if (!(q.isHidden || q.questType === 'HIDDEN_QUEST') || q.hiddenTrigger?.type !== 'NPC_DIALOGUE') continue;
      if (q.hiddenTrigger.targetId !== npcId) continue;
      if (this.discoveredHiddenQuests.includes(q.id) || this.player.completedQuests.includes(q.id)) continue;
      if (this.player.level < Number(q.hiddenTrigger.minLevel ?? q.requiredLevel ?? 1)) continue;
      if ((q.hiddenTrigger.requiredCompletedQuestIds || []).some((req) => !this.player.completedQuests.includes(req))) continue;
      const kw = q.hiddenTrigger.dialogueKeyword || 'secret';
      topics.push({
        keyword: kw,
        label: secretLabels[kw] || 'Lắng nghe câu chuyện kỳ bí của vùng đất...',
        isHiddenHint: true,
      });
    }
    return topics;
  }

  public triggerNpcDialogueTopic(npcId: string, keyword: string) {
    this.recordClientQuestProgress({ type: 'NPC_DIALOGUE', targetId: npcId, keyword });
  }

  private onLevelUp() {
    this.skillPoints += 1;
    this.floatingTexts.push({ x: this.player.x, y: this.player.y - 74, text: `THĂNG CẤP Lv.${this.player.level}! (+1 SP)`, color: '#fde047', ttlMs: 1400 });
    if (!isPreJobClass(this.player.classId)) {
      this.rebuildClassSkillTree();
    } else {
      if (this.player.level >= 15 && isPreJobClass(this.player.classId)) {
        this.onToast?.('Bạn đã đạt Cấp 15! Thánh Điện Thức Tỉnh & Chuyển Chức Lần 1 đã mở khóa!');
      }
    }
    this.saveLocalProgress();
    this.scheduleServerStateSync(true);
  }

  public useOrEquipItem(itemId: string) {
    const idx = this.inventory.findIndex((i) => i.id === itemId);
    if (idx < 0) return;
    const item = this.inventory[idx];

    if (item.category === 'equip' && item.equipSlot) {
      const classDefs = this.worldClasses.length ? this.worldClasses : INITIAL_CLASSES;
      const classDef = classDefs.find((c: any) => c.id === this.player.classId);
      const check = canClassEquipItem(
        this.player.classId,
        this.player.level,
        {
          id: item.id,
          name: item.name,
          category: item.equipSlot === 'weapon' ? 'weapon' : ['necklace', 'ring1', 'ring2'].includes(item.equipSlot) ? 'accessory' : 'armor',
          equipSlot: item.equipSlot as any,
          weaponType: item.weaponType as any,
          allowedClasses: item.allowedClasses as any,
          requiredLevel: item.requiredLevel,
        } as any,
        classDef?.allowedWeapons
      );
      if (!check.allowed) {
        this.onToast?.(check.reason || `Trang bị "${item.name}" không tương thích với chức nghiệp ${this.player.classId.toUpperCase()}!`);
        return;
      }
      const uqDef = this.worldUniqueEquipment.find((u) => u.id === item.id);
      if (uqDef) {
        const otherOwned = this.ownedUniqueEquipmentIds.filter((id) => id !== uqDef.id);
        const bind = checkUniqueEquipmentBinding(
          uqDef,
          { id: 'player_local', userId: 'local_user', ownedUniqueEquipmentIds: otherOwned } as any,
          []
        );
        if (!bind.allowed) {
          this.onToast?.(bind.reason || `Không thể trang bị Unique "${item.name}".`);
          return;
        }
      }
      const slot = normalizeEquipSlot(item.equipSlot, item.category, item.equipSlot) as EquipSlotKey;
      const prevEquipped = this.equipment[slot];
      this.equipment[slot] = { ...item, equipSlot: slot, qty: 1 };
      this.inventory.splice(idx, 1);
      if (prevEquipped) {
        this.inventory.unshift(prevEquipped);
      }
      if (this.serverCharacterId) {
        void equipCharacterItemApi(this.serverCharacterId, slot, item.id);
      }
      this.saveLocalProgress();
      this.onToast?.(`Đã trang bị: ${item.name}`);
      this.emitHudSnapshot();
      return;
    }

    if (item.category === 'consumable') {
      if (item.iconKey === 'scroll_town') {
        const targetTown = this.player.level >= 15 ? 'city_elysia_capital' : 'THON_KHOI_NGUYEN';
        if (this.regionId !== targetTown) {
          void this.switchRegion(targetTown);
        } else {
          const home = this.tilemap.tileToWorldCenter(this.tilemap.map.spawns.player.tx, this.tilemap.map.spawns.player.ty);
          this.player.x = home.x;
          this.player.y = home.y;
          this.player.pathQueue = [];
          this.centerCameraImmediate();
        }
        this.floatingTexts.push({ x: this.player.x, y: this.player.y - 48, text: 'Hồi Thành!', color: '#7dd3fc', ttlMs: 950 });
      } else {
        if (item.hpRestore) {
          this.player.hp = Math.min(this.player.maxHp, this.player.hp + item.hpRestore);
          this.floatingTexts.push({ x: this.player.x, y: this.player.y - 44, text: `+${item.hpRestore} HP`, color: '#4ade80', ttlMs: 850 });
        }
        if (item.mpRestore) {
          this.player.mp = Math.min(this.player.maxMp, this.player.mp + item.mpRestore);
          this.floatingTexts.push({ x: this.player.x, y: this.player.y - 58, text: `+${item.mpRestore} MP`, color: '#60a5fa', ttlMs: 850 });
        }
        const buffRec = PROFESSION_RECIPES.find((r) => r.outputItemId === item.id && r.buffEffect);
        if (buffRec?.buffEffect) {
          const pctBonus = Number(buffRec.buffEffect.pctBonus || 0);
          this.activeBuffs[`food:${item.id}`] = {
            stat: buffRec.buffEffect.stat,
            valuePct: pctBonus,
            expiresAt: Date.now() + Math.max(30, buffRec.buffEffect.durationSec) * 1000,
          };
          const afterStats = this.getComputedStats();
          if (buffRec.buffEffect.stat === 'maxHpPct') {
            this.player.maxHp = Math.max(this.player.maxHp, Math.round(this.player.maxHp * (1 + pctBonus / 100)));
          }
          this.floatingTexts.push({ x: this.player.x, y: this.player.y - 74, text: `✦ ${buffRec.outputName}`, color: '#fde047', ttlMs: 1100 });
          this.onToast?.(`Đã kích hoạt hiệu ứng món/dược: ${buffRec.outputName} (ATK ${afterStats.atk})`);
        }
      }
      item.qty--;
      if (item.qty <= 0) this.inventory.splice(idx, 1);
      this.emitHudSnapshot();
      return;
    }

    this.onToast?.(`${item.name}: Nguyên liệu dùng cho rèn & luyện dược.`);
  }

  public unequipSlot(slot: EquipSlotKey) {
    const equipped = this.equipment[slot];
    if (!equipped) return;
    if (this.inventory.length >= 30) {
      this.onToast?.('Balo đã đầy (30/30), không thể tháo trang bị!');
      return;
    }
    delete this.equipment[slot];
    this.inventory.unshift(equipped);
    if (this.serverCharacterId) {
      void unequipCharacterSlotApi(this.serverCharacterId, slot);
    }
    this.saveLocalProgress();
    this.onToast?.(`Đã tháo vào Balo: ${equipped.name}`);
    this.emitHudSnapshot();
  }

  public emitHudSnapshot() {
    const tile = this.tilemap.worldToTile(this.player.x, this.player.y);
    const classDefs = this.worldClasses.length ? this.worldClasses : INITIAL_CLASSES;
    const preview = classifyJobFromBaseStats(this.player.baseStats, classDefs);

    const activeBossMon =
      this.monsters.find((m) => m.alive && m.id === this.engagedBossId) ||
      this.monsters.find(
        (m) =>
          m.alive &&
          (m.isBoss || m.category === 'FIELD_BOSS' || m.category === 'WORLD_BOSS' || m.category === 'MINI_BOSS') &&
          (m.hp < m.maxHp || Math.hypot(m.x - this.player.x, m.y - this.player.y) <= 340)
      ) ||
      null;

    const activeBoss: BossHudState | null = activeBossMon
      ? {
          runtimeId: activeBossMon.id,
          monsterId: activeBossMon.monsterId,
          name: activeBossMon.name,
          category:
            activeBossMon.category && activeBossMon.category !== 'NORMAL'
              ? activeBossMon.category
              : activeBossMon.isBoss
              ? 'MINI_BOSS'
              : 'ELITE',
          level: activeBossMon.level,
          hp: Math.round(activeBossMon.hp),
          maxHp: activeBossMon.maxHp,
          activePhase: activeBossMon.activePhase,
          enraged: activeBossMon.enraged,
          portraitUrl:
            activeBossMon.portraitUrl ||
            (activeBossMon.monsterId === 'boss_ancient_treant'
              ? '/assets/elysia/ui/portrait-ancient-treant.png'
              : '/assets/elysia/ui/portrait-dragon.png'),
          telegraph: activeBossMon.telegraph,
        }
      : null;

    const itemCatalog = this.worldItems.length ? this.worldItems : INITIAL_ITEMS;
    const recipeSource = this.worldCraftingRecipes.length ? this.worldCraftingRecipes : INITIAL_CRAFTING_RECIPES;
    const craftingRecipes: CraftingRecipeView[] = recipeSource.map((r: any) => {
      const outItem = itemCatalog.find((it: any) => it.id === r.outputItemId);
      return {
        id: r.id,
        name: r.name,
        category: r.category,
        outputItemId: r.outputItemId,
        outputItemName: outItem?.nameVi || outItem?.name || r.outputItemId,
        outputRarity: outItem?.rarity || 'rare',
        outputQuantity: Number(r.outputQuantity || 1),
        goldCost: Number(r.goldCost || 0),
        requiredLevel: Number(r.requiredLevel || 1),
        materials: (r.materials || []).map((m: any) => {
          const matItem = itemCatalog.find((it: any) => it.id === m.itemId);
          return { itemId: m.itemId, name: matItem?.nameVi || matItem?.name || m.itemId, quantity: Number(m.quantity || 1) };
        }),
        description: r.description,
      };
    });

    const activeCheckpoint = resolveResurrectionCheckpoint(
      {
        discoveredVillageIds: this.discoveredVillageIds,
        latestVillageCheckpointId: this.latestVillageCheckpointId,
        preferredResurrectionVillageId: this.preferredResurrectionVillageId ?? undefined,
      },
      this.regionId
    );
    const activeDp = getActiveDeathPenaltyReductionPct(
      { deathPenalty: this.deathPenalty },
      Date.now()
    ).penalty;

    if (this.trackedQuestId && !this.activeWorldQuests[this.trackedQuestId]) {
      this.trackedQuestId = null;
    }

    const mappedWorldQuests: WorldQuestClientView[] = this.worldQuestsCatalog
      .filter((q) => {
        if (this.isWorldQuestHiddenFromPlayer(q)) return false;
        const active = this.activeWorldQuests[q.id];
        const done = this.player.completedQuests.includes(q.id) || this.claimedRewardKeys.includes(`quest:${q.id}`);
        if (!active && !done && !(q.isHidden || q.questType === 'HIDDEN_QUEST')) {
          if (this.player.level < Number(q.requiredLevel || 1)) return false;
          if ((q.prerequisiteQuestIds || []).some((pre) => !this.player.completedQuests.includes(pre))) return false;
        }
        return true;
      })
      .map((q) => {
        const active = this.activeWorldQuests[q.id];
        const done = this.player.completedQuests.includes(q.id) || this.claimedRewardKeys.includes(`quest:${q.id}`);
        if (active) this.syncClientQuestProgressObj(active, q);
        const state: WorldQuestClientView['state'] = done
          ? 'completed'
          : active?.completed
          ? 'ready_to_claim'
          : active
          ? 'active'
          : (q.isHidden || q.questType === 'HIDDEN_QUEST')
          ? 'unlocked_hidden'
          : 'available';
        return {
          id: q.id,
          name: q.name,
          description: q.description,
          questType: q.questType || 'MAIN_QUEST',
          isHidden: Boolean(q.isHidden || q.questType === 'HIDDEN_QUEST'),
          chainId: q.chainId,
          stepNumber: q.stepNumber,
          requiredLevel: Number(q.requiredLevel || 1),
          startNpcId: q.startNpcId,
          endNpcId: q.endNpcId,
          regionId: q.regionId,
          state,
          isTracked: this.trackedQuestId === q.id,
          abandonable: q.abandonable !== false,
          completedAt: this.completedQuestHistory[q.id]?.completedAt,
          objectives: (q.objectives || []).map((o) => {
            const req = Math.max(1, Number(o.requiredCount ?? (o as any).required ?? 1));
            return {
              id: o.id,
              type: o.type,
              targetId: o.targetId,
              description: o.description,
              current: done ? req : Number(active?.objectives?.[o.id] || 0),
              required: req,
            };
          }),
          rewards: {
            exp: Number(q.rewards?.exp || 0),
            gold: Number(q.rewards?.gold || 0),
            uniqueEquipmentIds: q.rewards?.uniqueEquipmentIds,
            unlockTitleIds: q.rewards?.unlockTitleIds,
          },
        };
      });

    // Dynamic NPC overhead markers ('?' for READY_TO_COMPLETE, '!' for AVAILABLE non-hidden, null otherwise)
    for (const npc of this.npcs) {
      const hasReady = mappedWorldQuests.some(
        (wq) => wq.state === 'ready_to_claim' && (wq.endNpcId || wq.startNpcId) === npc.id
      );
      const hasAvailable = mappedWorldQuests.some(
        (wq) =>
          wq.state === 'available' &&
          !wq.isHidden &&
          wq.startNpcId === npc.id &&
          this.player.level >= Number(wq.requiredLevel || 1)
      );
      (npc as any).questMarker = hasReady ? '?' : hasAvailable ? '!' : null;
    }

    const singleTrackedQuest = this.trackedQuestId
      ? mappedWorldQuests.find((wq) => wq.id === this.trackedQuestId && (wq.state === 'active' || wq.state === 'ready_to_claim')) || null
      : null;

    this.onHudSync?.({
      playerName: this.player.name,
      classId: this.player.classId,
      fps: this.currentFps,
      secondJobName: getActiveCharacterCache()?.secondJobName || null,
      advancedJobId: this.advancedJobId,
      advancedJobName: this.advancedJobName,
      availableAdvancedBranches: getAdvancedBranchesForClass(this.player.classId),
      skillMastery: { ...this.skillMastery },
      onlineCount: Math.max(1, this.remotePlayers.size + 1),
      pingMs: this.multiplayer?.pingMs ?? 0,
      isOnlineConnected: Boolean(this.multiplayer?.connected),
      jobAdvancementCompleted: this.player.jobAdvancementCompleted,
      evolutionTier: this.player.evolutionTier,
      level: this.player.level,
      hp: Math.round(this.player.hp),
      maxHp: this.player.maxHp,
      mp: Math.round(this.player.mp),
      maxMp: this.player.maxMp,
      dead: this.player.dead,
      deathPenalty: activeDp,
      discoveredVillageIds: [...this.discoveredVillageIds],
      latestVillageCheckpointId: this.latestVillageCheckpointId,
      latestVillageCheckpointName: activeCheckpoint.nameVi,
      autoCombatConfig: { ...this.autoCombatConfig },
      tx: tile.tx,
      ty: tile.ty,
      regionId: this.regionId,
      regionName: this.tilemap.map.name,
      regionSubtitle: this.tilemap.map.subtitle,
      isSafeZone: Boolean(this.tilemap.map.isSafeZone),
      combatEnabled: this.tilemap.map.combatEnabled !== false,
      exits: this.tilemap.map.exits || [],
      hasAwakeningCertificate: this.hasAwakeningCertificate(),
      beginnerQuestCompleted: this.isBeginnerQuestCompleted(),
      sanctumCompleted: this.player.sanctumCompleted,
      baseStats: { ...this.player.baseStats },
      compatibilityBreakdown: preview.scores,
      awakeningResult: this.awakeningResult,
      dungeon: { ...this.dungeonState, collectedFragments: [...this.dungeonState.collectedFragments], activatedPillars: [...this.dungeonState.activatedPillars] },
      worldRegions: this.worldRegions,
      availableClasses: this.worldClasses,
      quest: this.quest,
      quests: this.quests.map((q) => ({ ...q })),
      trackedQuestId: singleTrackedQuest ? singleTrackedQuest.id : null,
      trackedQuest: singleTrackedQuest,
      skills: this.skills,
      cooldowns: { ...this.cooldowns },
      stats: this.getComputedStats(),
      equipment: { ...this.equipment },
      inventory: this.inventory.map((it) => ({ ...it })),
      storage: this.storage.map((it) => ({ ...it })),
      shopCatalog: this.shopCatalog,
      skillPoints: this.skillPoints,
      activeBoss,
      craftingRecipes,
      worldQuests: mappedWorldQuests,
      discoveredHiddenQuests: this.worldQuestsCatalog
        .filter((q) => (q.isHidden || q.questType === 'HIDDEN_QUEST') && !this.isWorldQuestHiddenFromPlayer(q))
        .map((q) => {
          const active = this.activeWorldQuests[q.id];
          const done = this.player.completedQuests.includes(q.id) || this.claimedRewardKeys.includes(`quest:${q.id}`);
          if (active) this.syncClientQuestProgressObj(active, q);
          return {
            id: q.id,
            name: q.name,
            description: q.description,
            questType: q.questType || 'HIDDEN_QUEST',
            isHidden: true,
            requiredLevel: Number(q.requiredLevel || 1),
            startNpcId: q.startNpcId,
            endNpcId: q.endNpcId,
            regionId: q.regionId,
            state: done ? 'completed' : active?.completed ? 'ready_to_claim' : active ? 'active' : 'unlocked_hidden',
            isTracked: this.trackedQuestId === q.id,
            abandonable: q.abandonable !== false,
            completedAt: this.completedQuestHistory[q.id]?.completedAt,
            objectives: (q.objectives || []).map((o) => {
              const req = Math.max(1, Number(o.requiredCount ?? (o as any).required ?? 1));
              return {
                id: o.id,
                type: o.type,
                targetId: o.targetId,
                description: o.description,
                current: done ? req : Number(active?.objectives?.[o.id] || 0),
                required: req,
              };
            }),
            rewards: {
              exp: Number(q.rewards?.exp || 0),
              gold: Number(q.rewards?.gold || 0),
              uniqueEquipmentIds: q.rewards?.uniqueEquipmentIds,
              unlockTitleIds: q.rewards?.unlockTitleIds,
            },
          };
        }),
      questChains: this.worldQuestChains.map((c) => {
        const st = this.questChainProgress[c.id];
        const doneCount = st?.completedSteps.length || c.quests.filter((qid) => this.player.completedQuests.includes(qid)).length;
        return {
          id: c.id,
          name: c.name,
          description: c.description,
          questIds: c.quests,
          completedCount: doneCount,
          totalCount: c.quests.length,
          completed: Boolean(st?.completed || doneCount >= c.quests.length),
          currentQuestId: c.quests.find((qid) => !this.player.completedQuests.includes(qid)),
        };
      }),
      titles: this.worldTitles.map((t) => ({
        id: t.id,
        name: t.name,
        nameVi: t.nameVi,
        description: t.description,
        category: t.category,
        rarity: ((t as any).rarity || 'rare') as ItemRarity,
        unlocked: this.unlockedTitles.includes(t.id),
        equippedCosmetic: this.equippedCosmeticTitleId === t.id,
        statBonuses: (t.statBonuses || {}) as Record<string, number>,
      })),
      titleBonuses: this.cachedTitleBonuses || this.recalculateClientTitleBonuses(false),
      equippedCosmeticTitleId: this.equippedCosmeticTitleId,
      ownedUniqueEquipmentIds: [...this.ownedUniqueEquipmentIds],
      uniqueEquipmentCatalog: this.worldUniqueEquipment,
      visitedMaps: [...this.visitedMaps],
      passiveAllocations: { ...this.passiveAllocations },
      passivePoints: (() => {
        const earnedInfo = computeEarnedPassivePoints({
          classId: this.player.classId as any,
          level: this.player.level,
          jobAdvancementCompleted: this.player.jobAdvancementCompleted,
          advancedJobId: (this.advancedJobId || undefined) as any,
          skillMastery: this.skillMastery,
        });
        const spent = computePassivePointsSpent(this.passiveAllocations);
        return {
          earned: earnedInfo.earned,
          spent,
          available: Math.max(0, earnedInfo.earned - spent),
          masteryBonusPoints: earnedInfo.fromMastery,
        };
      })(),
      passiveTransactions: this.passiveTransactions.slice(-20),
      respecCostGold: computePassivePointsSpent(this.passiveAllocations) * PASSIVE_PROGRESSION_CONFIG.respecGoldPerSpentPoint,
    } as any);
  }

  private spawnVfx(vfxKey: string | undefined, worldX: number, worldY: number, size = 128) {
    if (!vfxKey) return;
    const assetId = vfxKey.startsWith('vfx/') ? vfxKey : `vfx/${vfxKey}`;
    const def = this.artwork.manifest.assets.find((a) => a.id === assetId);
    if (!def) return;
    this.artwork.getOptional(assetId);
    this.activeVfx.push({
      assetId,
      x: worldX,
      y: worldY,
      size,
      elapsedMs: 0,
      totalFrames: def.animation?.frames ?? 24,
      fps: def.animation?.fps ?? 30,
    });
  }

  private getFacingVector(): { dx: number; dy: number; angle: number } {
    switch (this.player.direction) {
      case 'north':
        return { dx: 0, dy: -1, angle: -Math.PI / 2 };
      case 'south':
        return { dx: 0, dy: 1, angle: Math.PI / 2 };
      case 'west':
        return { dx: -1, dy: 0, angle: Math.PI };
      case 'east':
      default:
        return { dx: 1, dy: 0, angle: 0 };
    }
  }

  private selectBestCombatTarget(maxRangePx: number, preferFacing = true): MonsterEntity | null {
    const dir = this.getFacingVector();
    let best: MonsterEntity | null = null;
    let bestScore = Infinity;
    for (const m of this.monsters) {
      if (!m.alive) continue;
      const dx = m.x - this.player.x;
      const dy = m.y - this.player.y;
      const dist = Math.hypot(dx, dy);
      if (dist > maxRangePx) continue;
      let penalty = 0;
      if (preferFacing && dist > 18) {
        const dot = (dx / dist) * dir.dx + (dy / dist) * dir.dy;
        if (dot < -0.1) penalty = 140;
      }
      if (dist + penalty < bestScore) {
        bestScore = dist + penalty;
        best = m;
      }
    }
    return best;
  }

  public spawnFireballProjectile(
    originX: number,
    originY: number,
    targetX: number,
    targetY: number,
    targetMonsterId: string | undefined,
    damage: number,
    isCrit: boolean,
    remoteOnly = false,
    speedPxPerSec = 460,
    explosionRadiusPx = 64
  ) {
    this.activeProjectiles.push({
      x: originX,
      y: originY,
      targetX,
      targetY,
      targetMonsterId,
      speedPxPerSec,
      radiusPx: 14,
      explosionRadiusPx,
      damage,
      isCrit,
      color: isCrit ? '#fb7185' : '#f97316',
      label: isCrit ? 'Tiểu Hỏa Cầu (BẠO KÍCH!)' : 'Tiểu Hỏa Cầu',
      vfxKey: 'vfx_fire_burst',
      remoteOnly,
      ttlMs: 1400,
      embers: [],
    });
  }

  private detonateProjectile(proj: ActiveProjectile, impactX: number, impactY: number, directHitMonster?: MonsterEntity) {
    // Compact localized impact explosion + light smoke burst (never full-screen opaque blast)
    this.spawnVfx(proj.vfxKey || 'vfx_fire_burst', impactX, impactY, 84);
    this.smokeBursts.push({ x: impactX, y: impactY, elapsedMs: 0, durationMs: 340, radiusPx: 26 });

    if (proj.remoteOnly) return;

    let anyHit = false;
    const splashR = Math.max(42, proj.explosionRadiusPx || 64);
    for (const m of this.monsters) {
      if (!m.alive) continue;
      const isDirect = directHitMonster && m.id === directHitMonster.id;
      const dist = Math.hypot(m.x - impactX, (m.y - 14) - impactY);
      if (isDirect || dist <= splashR) {
        const dmg = isDirect ? proj.damage : Math.max(8, Math.round(proj.damage * 0.7));
        this.applyDamageToMonster(m, dmg, proj.color);
        anyHit = true;
      }
    }
    if (!anyHit) {
      this.floatingTexts.push({ x: impactX, y: impactY - 18, text: 'Bùm!', color: proj.color, ttlMs: 420 });
    }
  }

  private executeDirectionalSlash(
    damage: number,
    isCrit: boolean,
    rangePx: number,
    color: string,
    missLabel: string,
    target: MonsterEntity | null
  ) {
    if (target) {
      this.player.faceVector(target.x - this.player.x, target.y - this.player.y);
    }
    const dir = this.getFacingVector();
    const angle = target ? Math.atan2(target.y - this.player.y, target.x - this.player.x) : dir.angle;
    const slashX = this.player.x + Math.cos(angle) * 32;
    const slashY = this.player.y - 16 + Math.sin(angle) * 20;

    this.directionalSlashes.push({
      x: slashX,
      y: slashY,
      angleRad: angle,
      radiusPx: Math.max(42, Math.min(68, rangePx * 0.56)),
      elapsedMs: 0,
      durationMs: 210,
      color: isCrit ? '#f97316' : color,
    });

    // Forward directional melee hitbox
    let hitTarget: MonsterEntity | null = null;
    if (target && Math.hypot(target.x - this.player.x, target.y - this.player.y) <= rangePx + 14) {
      this.applyDamageToMonster(target, damage, isCrit ? '#f97316' : color, 'vfx_sword_slash');
      hitTarget = target;
    } else {
      for (const m of this.monsters) {
        if (!m.alive) continue;
        const dx = m.x - this.player.x;
        const dy = m.y - this.player.y;
        const d = Math.hypot(dx, dy);
        if (d <= rangePx) {
          const dot = d < 24 ? 1 : (dx / d) * Math.cos(angle) + (dy / d) * Math.sin(angle);
          if (dot >= 0.25) {
            this.applyDamageToMonster(m, damage, isCrit ? '#f97316' : color, 'vfx_sword_slash');
            hitTarget = m;
            break;
          }
        }
      }
    }
    if (!hitTarget) {
      this.floatingTexts.push({ x: slashX, y: slashY - 18, text: missLabel, color, ttlMs: 420 });
    }
    this.emitSyncedCombatAction('skill', 'SKILL_NOVICE_SLASH', hitTarget);
  }

  private emitSyncedCombatAction(actionType: 'basic_attack' | 'skill', skillId: string | undefined, target?: MonsterEntity | null) {
    if (!this.multiplayer?.connected || !this.serverCharacterId) return;
    this.multiplayer.emitMove(this.player.x, this.player.y, this.player.state, this.player.direction);
    void this.multiplayer.emitCombatAction(actionType, skillId, target?.id).then((res) => {
      if (!res?.success || !res.data) return;
      const d = res.data;
      if (d.monster && target) {
        target.hp = Number(d.monster.hp ?? target.hp);
        target.alive = Boolean(d.monster.alive);
        if (!target.alive) target.setState('death');
      }
      if (d.deathEvent) {
        this.handleServerPlayerDeath(d.deathEvent);
      }
      if (d.rewards && (d.rewards.exp > 0 || d.rewards.gold > 0) && target?.serverControlled) {
        if (d.player) {
          this.player.level = Math.max(1, Number(d.player.level ?? this.player.level));
          this.player.exp = Number(d.player.exp ?? this.player.exp);
          this.player.maxExp = expRequiredForLevel(this.player.level);
          this.gold = Number(d.player.gold ?? this.gold);
          this.skillPoints = Number(d.player.skillPoints ?? this.skillPoints);
        }
        this.saveLocalProgress();
        this.emitHudSnapshot();
      }
    });
  }

  public castSkill(skillId: string) {
    if (this.tilemap.map.isSafeZone && this.tilemap.map.combatEnabled === false) {
      this.onToast?.('Khu vực an toàn (Thành Phố) — không thể sử dụng kỹ năng chiến đấu!');
      return;
    }
    const skill = this.skills.find((s) => s.id === skillId);
    if (!skill || skill.locked) return;
    if (skill.skillType === 'passive' || skill.tier === 'passive') {
      this.onToast?.(`${skill.name} là kỹ năng Bị Động luôn tự động kích hoạt.`);
      return;
    }
    if ((this.cooldowns[skill.id] || 0) > 0) return;

    const skillCatalog = this.worldSkills.length ? this.worldSkills : INITIAL_SKILLS;
    const def = skillCatalog.find((s: any) => s.id === skill.id);
    const stats = this.getComputedStats();
    const mods = computePassiveAndBuffModifiers(
      this.player.classId,
      this.skillLevels,
      this.skills.filter((s) => !s.locked).map((s) => s.id),
      this.activeBuffs,
      skillCatalog,
      Date.now()
    );
    const curLv = Number(this.skillLevels[skill.id] ?? skill.skillLevel ?? 1);
    const curMasteryPts = Number(this.skillMastery[skill.id]?.points || 0);
    const power = def
      ? computeSkillActionPower(def, curLv, stats.attributes, stats.atk, stats.matk ?? stats.atk, stats.def, mods, curMasteryPts)
      : null;

    const mpCost = power ? power.mpCost : skill.mpCost;
    const cooldownSec = power ? power.cooldownSec : skill.cooldownSec;

    if (this.player.mp < mpCost) {
      this.onToast?.('Không đủ MP để thi triển chiêu thức!');
      return;
    }
    if (!this.player.triggerAttack()) return;

    this.player.mp = Math.max(0, this.player.mp - mpCost);
    this.cooldowns[skill.id] = cooldownSec;

    // Novice Skill 1: Trảm Kích — single forward directional physical blade slash
    if (skill.id === 'SKILL_NOVICE_SLASH') {
      this.player.setState('attack');
      this.player.attackLockMs = 260;
      const isCrit = Math.random() * 100 < (stats.critRate ?? 8);
      const raw = power ? power.rawPower : Math.round(stats.atk * 1.25 + 16);
      const finalDamage = Math.round(raw * (isCrit ? 1.55 : 1));
      const rangePx = Math.max(84, skill.rangePx || 96);
      const target = this.selectBestCombatTarget(rangePx + 18, true);
      this.executeDirectionalSlash(
        finalDamage,
        isCrit,
        rangePx,
        skill.color || '#38bdf8',
        isCrit ? 'Bạo Kích!' : 'Trảm Kích!',
        target
      );
      return;
    }

    // Novice Skill 2: Tiểu Hỏa Cầu — casting anim + flying orb projectile + compact explosion & smoke
    if (skill.id === 'SKILL_NOVICE_FIREBALL' || (def?.projectile && def.damageType === 'magic')) {
      this.player.setState('skill');
      this.player.attackLockMs = 300;
      const rangePx = Math.max(240, skill.rangePx || 310);
      const target = this.selectBestCombatTarget(rangePx, true);
      if (target) {
        this.player.faceVector(target.x - this.player.x, target.y - this.player.y);
      }
      const dir = this.getFacingVector();
      const ox = this.player.x + dir.dx * 20;
      const oy = this.player.y - 22 + dir.dy * 12;
      const tx = target ? target.x : this.player.x + dir.dx * (rangePx * 0.85);
      const ty = target ? target.y - 16 : this.player.y - 20 + dir.dy * (rangePx * 0.85);

      const isCrit = Math.random() * 100 < (stats.critRate ?? 8);
      const raw = power ? power.rawPower : Math.round((stats.matk ?? stats.atk) * 1.45 + 22);
      const finalDamage = Math.round(raw * (isCrit ? 1.55 + mods.critDamagePct / 100 : 1));
      const projSpeed = Number(def?.projectile?.speedPxPerSec ?? 460);
      const explosionR = Number(def?.projectile?.explosionRadiusPx ?? 64);

      this.spawnFireballProjectile(ox, oy, tx, ty, target?.id, finalDamage, isCrit, false, projSpeed, explosionR);
      this.multiplayer?.emitCombatAction('skill', skill.id, target?.id);
      return;
    }

    // Novice Skill 3: Thần Tốc Bộ (Dash / Sprint)
    if (skill.id === 'SKILL_NOVICE_DASH') {
      this.player.setState('walk');
      const dir = this.getFacingVector();
      const targetX = this.player.x + dir.dx * 130;
      const targetY = this.player.y + dir.dy * 130;
      const moved = this.tilemap.resolveMove(this.player.x, this.player.y, targetX, targetY);
      this.player.x = moved.x;
      this.player.y = moved.y;
      this.spawnVfx('vfx_sword_slash', this.player.x, this.player.y - 14, 96);
      this.floatingTexts.push({ x: this.player.x, y: this.player.y - 48, text: 'Thần Tốc Bộ!', color: '#34d399', ttlMs: 700 });
      this.multiplayer?.emitCombatAction('skill', skill.id);
      return;
    }

    // Novice Skill 4: Toàn Phong Trảm (Whirlwind AoE)
    if (skill.id === 'SKILL_NOVICE_SPIN') {
      this.player.setState('attack');
      this.player.attackLockMs = 380;
      this.spawnVfx('vfx_sword_slash', this.player.x, this.player.y - 16, 160);
      const isCrit = Math.random() * 100 < (stats.critRate ?? 8);
      const dmg = Math.round(stats.atk * 1.6 + 24) * (isCrit ? 1.5 : 1);
      let hitAny = false;
      for (const m of this.monsters) {
        if (!m.alive) continue;
        if (Math.hypot(m.x - this.player.x, m.y - this.player.y) <= 125) {
          this.applyDamageToMonster(m, dmg, isCrit ? '#f97316' : '#a78bfa', 'vfx_sword_slash');
          this.spawnEnergyBeam(this.player.x, this.player.y - 18, m.x, m.y - 16, '#a78bfa', 6, 260);
          hitAny = true;
        }
      }
      if (!hitAny) {
        this.floatingTexts.push({ x: this.player.x, y: this.player.y - 48, text: 'Toàn Phong Trảm!', color: '#a78bfa', ttlMs: 700 });
      }
      this.multiplayer?.emitCombatAction('skill', skill.id);
      return;
    }

    // Novice Skill 5: Kim Cang Hộ Thể (Shield / Barrier)
    if (skill.id === 'SKILL_NOVICE_SHIELD') {
      this.player.setState('skill');
      this.player.attackLockMs = 280;
      this.shieldHp = Math.min(this.player.maxHp, this.shieldHp + 65);
      this.spawnVfx('vfx_sword_slash', this.player.x, this.player.y - 16, 120);
      this.floatingTexts.push({ x: this.player.x, y: this.player.y - 56, text: '+65 Khiên Hộ Thể!', color: '#fbbf24', ttlMs: 1100 });
      this.activeBuffs['buff_sacred_shield'] = {
        stat: 'def',
        valuePct: 25,
        expiresAt: Date.now() + 12000,
      };
      this.emitHudSnapshot();
      this.multiplayer?.emitCombatAction('skill', skill.id);
      return;
    }

    this.player.setState('skill');
    this.player.attackLockMs = 420;
    const facingX = this.player.x + (this.player.facing >= 0 ? 54 : -54);
    const previewTarget = this.selectBestCombatTarget(Math.max(110, skill.rangePx || 120), false);
    const vfxTargetX = previewTarget ? previewTarget.x : facingX;
    const vfxTargetY = previewTarget ? previewTarget.y - 14 : this.player.y - 16;
    const evoState = power?.evolutionState;
    this.vfxEngine.spawnLayeredSkillVfx({
      skillKey: skill.vfxId || skill.vfxKey || def?.vfxKey || 'vfx_sword_slash',
      classOrBranchId: this.advancedJobId || this.player.classId,
      skillType: skill.executionType || def?.executionType || (skill.skillKind === 'heal' ? 'healing' : skill.tier === 'ultimate' ? 'ultimate' : 'slash'),
      element: def?.element,
      source: { x: this.player.x, y: this.player.y - 16 },
      target: { x: vfxTargetX, y: vfxTargetY },
      areaRadius: evoState?.effectiveAreaRadius ?? skill.areaRadius ?? (skill.tier === 'ultimate' ? 190 : 110),
      skillLevel: curLv,
      masteryPoints: curMasteryPts,
      evolutionTier: evoState?.evolutionTier ?? skill.evolutionTier ?? 0,
      hitCount: evoState?.totalHitCount ?? skill.hitCount ?? 1,
      projectileCount: evoState?.totalProjectiles ?? 1,
      isCrit: Math.random() * 100 < (stats.critRate ?? 10) + (evoState?.bonusCritChancePct || 0),
      isHeal: skill.skillKind === 'heal',
      vfxTags: evoState?.unlockedVfxTags || [],
    });
    if (!this.serverCharacterId && def && previewTarget && previewTarget.alive && !this.tilemap.map.isSafeZone) {
      const mGain = applyCombatMasteryGain(this.skillMastery[skill.id], def, {
        nowMs: Date.now(),
        isValidTargetAlive: true,
        isSafeZone: Boolean(this.tilemap.map.isSafeZone),
        didConnectEffect: true,
        targetIsBoss: Boolean(previewTarget.isBoss),
      });
      this.skillMastery[skill.id] = mGain.updated;
      this.rebuildClassSkillTree();
      this.emitHudSnapshot();
    }
    this.spawnVfx(skill.vfxKey || def?.vfxKey || 'vfx_sword_slash', this.player.x + this.player.facing * 24, this.player.y - 16, skill.tier === 'ultimate' ? 200 : 132);

    // Apply buffs, heals & shields
    if (power && power.healPower > 0) {
      const healAmt = power.healPower;
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + healAmt);
      this.floatingTexts.push({ x: this.player.x, y: this.player.y - 54, text: `+${healAmt} HP`, color: '#4ade80', ttlMs: 950 });
    }
    if (power && power.shieldPower > 0) {
      this.shieldHp = Math.min(this.player.maxHp, this.shieldHp + power.shieldPower);
      this.floatingTexts.push({ x: this.player.x, y: this.player.y - 68, text: `+${power.shieldPower} Khiên`, color: '#fde047', ttlMs: 950 });
    }
    for (const eff of def?.effects || []) {
      if (eff.kind === 'buff' && eff.stat && eff.durationSec) {
        this.activeBuffs[eff.id] = {
          stat: eff.stat,
          valuePct: eff.valuePct,
          flatValue: eff.flatValue,
          expiresAt: Date.now() + eff.durationSec * 1000,
        };
        this.floatingTexts.push({ x: this.player.x, y: this.player.y - 80, text: eff.description || `Buff: ${eff.stat}`, color: '#38bdf8', ttlMs: 1100 });
      }
      if (eff.kind === 'cleanse') {
        this.floatingTexts.push({ x: this.player.x, y: this.player.y - 64, text: 'Thanh Tẩy!', color: '#facc15', ttlMs: 900 });
      }
    }

    const rawDamage = power
      ? power.rawPower
      : skill.damage + Math.round(stats.atk * 0.6);

    if (rawDamage > 0) {
      const isCrit = Math.random() * 100 < (stats.critRate ?? 8);
      const finalDamage = Math.round(rawDamage * (isCrit ? 1.55 + mods.critDamagePct / 100 : 1));
      const dotEff = def?.effects?.find((e: any) => e.kind === 'dot');
      this.applyAreaAttack(
        Math.max(88, skill.rangePx || 120),
        finalDamage,
        skill.color,
        isCrit ? `${skill.name} (BẠO KÍCH!)` : skill.name,
        skill.vfxKey || def?.vfxKey,
        dotEff ? { tickDamage: Math.max(15, Math.round(finalDamage * 0.2)), remainingTicks: 3, tickAccumMs: 0, color: skill.color } : undefined
      );
      this.multiplayer?.emitCombatAction('skill', skill.id);
    }
  }

  public performBasicAttack() {
    if (this.tilemap.map.isSafeZone && this.tilemap.map.combatEnabled === false) {
      this.onToast?.('Khu vực an toàn (Thành Phố) — không thể chiến đấu trong khu vực an toàn!');
      return;
    }
    if (isPreJobClass(this.player.classId) && (this.cooldowns['SKILL_NOVICE_SLASH'] || 0) <= 0) {
      this.castSkill('SKILL_NOVICE_SLASH');
      return;
    }
    if (!this.player.triggerAttack()) return;
    const stats = this.getComputedStats();
    const isCrit = Math.random() * 100 < (stats.critRate ?? 8);
    const totalDmg = Math.round((12 + stats.atk) * (isCrit ? 1.5 : 1));
    const target = this.selectBestCombatTarget(96, true);
    this.executeDirectionalSlash(totalDmg, isCrit, 92, isCrit ? '#f97316' : '#fef08a', isCrit ? 'Bạo Kích!' : 'Chém Thường', target);
  }

  public interactNearestNpc() {
    let closest: NpcEntity | null = null;
    let bestDist = 92;
    for (const npc of this.npcs) {
      const d = Math.hypot(npc.x - this.player.x, npc.y - this.player.y);
      if (d < bestDist) {
        bestDist = d;
        closest = npc;
      }
    }
    if (closest) {
      this.recordClientQuestProgress({ type: 'NPC_DIALOGUE', targetId: closest.id });
      this.onNpcTalk?.(closest);
      return;
    }
    const nearObj = this.tilemap.map.spawns.interactables?.find((it) => {
      const p = this.tilemap.tileToWorldCenter(it.tx, it.ty);
      return Math.hypot(p.x - this.player.x, p.y - this.player.y) <= 84;
    });
    if (nearObj) {
      this.interactDungeonObject(nearObj.id);
      return;
    }
    const nearExit = this.tilemap.map.exits?.find((ex) => {
      const p = this.tilemap.tileToWorldCenter(ex.tx, ex.ty);
      return Math.hypot(p.x - this.player.x, p.y - this.player.y) <= 84;
    });
    if (nearExit) {
      void this.switchRegion(nearExit.targetRegion, { fromExit: nearExit });
      return;
    }
    const nearNode = PROFESSION_GATHERING_NODES.find((node) => {
      if (node.mapId !== this.regionId) return false;
      const p = this.tilemap.tileToWorldCenter(node.tx, node.ty);
      return Math.hypot(p.x - this.player.x, p.y - this.player.y) <= 84;
    });
    if (nearNode) {
      this.onToggleProfession?.(nearNode.professionId);
      return;
    }
    this.onToast?.('Hãy lại gần Dân Làng, Điểm Tài Nguyên [O], Vật Thể Thánh Điện hoặc Cổng Chuyển Vùng để tương tác [E].');
  }

  public spawnEnergyBeam(startX: number, startY: number, targetX: number, targetY: number, color = '#fbbf24', width = 6, durationMs = 280) {
    this.energyBeams.push({
      startX,
      startY,
      targetX,
      targetY,
      color,
      width,
      ttlMs: durationMs,
      maxTtlMs: durationMs,
    });
  }

  public setJoystickVector(vec: { dx: number; dy: number } | null) {
    this.joystickVector = vec;
  }

  private applyDamageToMonster(
    m: MonsterEntity,
    damage: number,
    color: string,
    vfxKey?: string,
    dotSpec?: { tickDamage: number; remainingTicks: number; tickAccumMs: number; color: string }
  ) {
    if (!m.alive) return false;
    this.selectedTargetId = m.id;
    if (m.isBoss || m.category === 'ELITE' || m.category === 'MINI_BOSS' || m.category === 'FIELD_BOSS' || m.category === 'WORLD_BOSS') {
      this.engagedBossId = m.id;
    }
    const defeated = m.applyDamage(damage);
    if (vfxKey) this.spawnVfx(vfxKey, m.x, m.y - 20, m.isBoss ? 148 : 98);
    this.spawnEnergyBeam(this.player.x, this.player.y - 18, m.x, m.y - 16, color.startsWith('#ef') || color.startsWith('#f9') ? '#f97316' : '#fde047', 7, 280);
    this.floatingTexts.push({ x: m.x, y: m.y - 44, text: `-${damage}`, color, ttlMs: 850, isCrit: color === '#f97316' || color === '#ef4444', comboCount: 7 });

    if (!defeated && dotSpec) {
      this.monsterDoTs.set(m.id, { ...dotSpec });
    }

    // Boss & Elite phase & telegraph progression
    if (!defeated && (m.isBoss || m.isElite || m.isRandomElite || m.category === 'ELITE' || m.category === 'FIELD_BOSS' || m.category === 'WORLD_BOSS')) {
      const bossCfg = this.worldBossConfigs.find((bc: any) => bc.monsterId === m.monsterId);
      const hpRatio = (m.hp / Math.max(1, m.maxHp)) * 100;
      const nextPhase = bossCfg?.phases?.slice().reverse().find((p: any) => hpRatio <= Number(p.hpThresholdPct ?? 50));
      if (nextPhase && nextPhase.phase > m.activePhase) {
        m.activePhase = nextPhase.phase;
        m.enraged = Boolean(nextPhase.isEnrage || hpRatio <= 30);
        m.telegraph = {
          skillName: nextPhase.skillName || 'Kỹ Năng Cuồng Nộ Boss!',
          warningRadiusPx: Number(nextPhase.aoeRadius || 145),
          remainingMs: Number(nextPhase.telegraphMs || 2600),
        };
        this.floatingTexts.push({ x: m.x, y: m.y - 78, text: `GIAI ĐOẠN ${m.activePhase}!`, color: '#f97316', ttlMs: 1400 });
        this.onToast?.(`⚠ ${m.name} bước vào Giai Đoạn ${m.activePhase}: ${m.telegraph.skillName}!`);
      } else if (!m.telegraph && (m.isBoss || hpRatio <= 50) && Math.random() < 0.25) {
        m.telegraph = { skillName: m.isBoss ? 'Chấn Động Địa Chấn' : 'Tinh Anh Bộc Phá', warningRadiusPx: 120, remainingMs: 2000 };
      }
    }

    if (defeated) {
      if (m.serverControlled && this.multiplayer?.connected && this.serverCharacterId) {
        // Server combat settlement authorizes rewards/quests cleanly via emitSyncedCombatAction
        return true;
      }
      this.handleMonsterDefeat(m);
    }
    return true;
  }

  private applyAreaAttack(
    rangePx: number,
    damage: number,
    color: string,
    label: string,
    vfxKey?: string,
    dotSpec?: { tickDamage: number; remainingTicks: number; tickAccumMs: number; color: string }
  ) {
    let hitCount = 0;
    for (const m of this.monsters) {
      if (!m.alive) continue;
      if (Math.hypot(m.x - this.player.x, m.y - this.player.y) <= rangePx) {
        if (this.applyDamageToMonster(m, damage, color, vfxKey, dotSpec)) {
          hitCount++;
        }
      }
    }
    if (hitCount === 0) {
      this.floatingTexts.push({ x: this.player.x + this.player.facing * 26, y: this.player.y - 36, text: label, color, ttlMs: 550 });
    }
  }

  private handleMonsterDefeat(m: MonsterEntity) {
    this.monsterDoTs.delete(m.id);
    if (this.engagedBossId === m.id) this.engagedBossId = null;

    const expMult = 1 + (this.cachedTitleBonuses?.cappedTotals.expBonusPct || 0) / 100;
    const goldMult = (1 + (this.cachedTitleBonuses?.cappedTotals.goldBonusPct || 0) / 100) * Number(this.worldExpBalanceConfig.goldMultiplier ?? 1);
    const rawBaseExp = m.expReward || (m.spriteId === 'boss_dark_dragon' ? 180 : m.spriteId === 'monster_goblin' ? 65 : 38);
    const baseGold = m.goldReward || (m.spriteId === 'boss_dark_dragon' ? 180 : m.spriteId === 'monster_goblin' ? 45 : 22);
    const levelScaledExp = computeLevelAdjustedExp(rawBaseExp, this.player.level, m.level, this.worldExpBalanceConfig);
    const expGain = Math.max(5, Math.round(levelScaledExp * expMult));
    const goldDrop = Math.max(1, Math.round(baseGold * goldMult));
    this.gold += goldDrop;
    const lvls = this.player.gainExp(expGain);
    this.floatingTexts.push({ x: m.x, y: m.y - 62, text: `+${expGain} EXP +${goldDrop}G`, color: '#fde047', ttlMs: 950 });
    this.onLootDrop?.(`Nhặt ${goldDrop} bạc`);
    if (lvls > 0) this.onLevelUp();

    if (m.monsterId === 'boss_guardian_of_awakening' && !this.dungeonState.bossDefeated) {
      this.dungeonState.bossDefeated = true;
      if (!this.dungeonState.rewardClaimed && !this.player.sanctumCompleted && !this.hasAwakeningCertificate()) {
        this.dungeonState.rewardClaimed = true;
        this.player.sanctumCompleted = true;
        this.inventory.unshift({
          id: 'ITEM_AWAKENING_CERTIFICATE',
          name: 'Chứng Chỉ Thức Tỉnh (Awakening Certificate)',
          category: 'material',
          rarity: 'epic',
          iconKey: 'gem_amethyst',
          qty: 1,
          desc: 'Chứng nhận đánh bại Guardian of Awakening. Hãy gặp Grand Sage of Awakening để hệ thống tự động thức tỉnh chức nghiệp!',
        });
        this.saveLocalProgress();
        this.onToast?.('BOSS HẠ GỤC! Nhận Chứng Chỉ Thức Tỉnh! Gặp Grand Sage of Awakening ngay trong điện để Thức Tỉnh Nghề Nghiệp Tự Động!');
      }
    }

    // Drop tables, boss drops & pity fragment rolls
    const itemCatalog = this.worldItems.length ? this.worldItems : INITIAL_ITEMS;
    const dropTable =
      this.worldDropTables.find((t: any) => t.monsterId === m.monsterId) ||
      INITIAL_BOSS_DROP_TABLES.find((t) => t.monsterId === m.monsterId);

    if (dropTable) {
      const pityBefore = Number(this.pityCounters[m.monsterId] || 0);
      const rolled = rollBossLootForParticipant(
        {
          characterId: 'player_main',
          characterName: this.player.name,
          classId: this.player.classId as any,
          damageDealt: 1000,
          healingProvided: 0,
          damageAbsorbed: 200,
          effectiveSupport: 0,
          validActions: 5,
          totalScore: 1000,
          lastActiveAt: Date.now(),
          eligible: true,
          rewardSharePct: 100,
        },
        this.player.level,
        dropTable,
        pityBefore,
        itemCatalog
      );
      this.pityCounters[m.monsterId] = rolled.newPityCounter;
      for (const dr of rolled.drops) {
        if (dr.itemId.startsWith('UEQ_')) {
          this.grantClientUniqueEquipment(dr.itemId);
          continue;
        }
        const meta = itemCatalog.find((it: any) => it.id === dr.itemId);
        const def = meta
          ? this.convertWorldItemToInventoryDef(meta, dr.quantity)
          : {
              id: dr.itemId,
              name: dr.itemId,
              category: 'material' as const,
              rarity: (dr.rarity || 'rare') as ItemRarity,
              iconKey: 'fragment_crystal',
              qty: dr.quantity,
              desc: 'Chiến lợi phẩm rơi từ quái vật.',
            };
        const existing = def.category !== 'equip' ? this.inventory.find((i) => i.id === def.id) : null;
        if (existing) existing.qty += def.qty;
        else if (this.inventory.length < 30) this.inventory.unshift(def);
        this.onLootDrop?.(`Nhặt ${def.name} x${def.qty}`);

        const beamColor = RARITY_CONFIGS[def.rarity]?.borderHex || '#38bdf8';
        this.lootBeams.push({ x: m.x, y: m.y, color: beamColor, label: `${def.name} x${def.qty}`, ttlMs: 3200 });
      }
      if (rolled.drops.length > 0 && m.isBoss) {
        this.onToast?.(`Chiến lợi phẩm Boss (${m.name}): ${rolled.drops.map((d) => `${d.itemId} x${d.quantity}`).join(', ')}`);
      }
    }

    for (const q of this.quests) {
      if (!q.completed && q.targetSpriteId === m.spriteId) {
        q.current = Math.min(q.required, q.current + 1);
        if (q.current >= q.required) {
          q.completed = true;
          q.objective = `Hoàn thành! Về gặp ${q.giver}`;
          this.onToast?.(`Hoàn thành mục tiêu "${q.title}"! Về gặp ${q.giver} để nhận thưởng.`);
        }
      }
    }
    const targetMonId =
      m.monsterId && m.monsterId !== m.spriteId
        ? m.monsterId
        : m.spriteId === 'monster_goblin'
        ? 'MONSTER_GOBLIN_SCOUT'
        : m.spriteId === 'monster_slime'
        ? 'MONSTER_SLIME_MEADOW'
        : m.spriteId;
    this.recordClientQuestProgress({ type: 'KILL_MONSTER', targetId: targetMonId, amount: 1 });
    this.saveLocalProgress();
    this.scheduleServerStateSync();
    this.emitHudSnapshot();
  }

  private tickAutoCombat(dtSec: number, nowMs: number) {
    if (!this.autoCombatConfig.enabled || this.player.dead || this.isSwitchingRegion) return;
    if (this.tilemap.map.type === 'CITY_SAFE_ZONE' || this.tilemap.map.combatEnabled === false) {
      this.autoCombatConfig.enabled = false;
      this.emitHudSnapshot();
      return;
    }
    if (modalManager.hasOpenModal()) return;

    // 1. Auto HP & MP Potion check
    if (nowMs - this.lastAutoPotionMs >= 1600) {
      const hpPct = (this.player.hp / Math.max(1, this.player.maxHp)) * 100;
      const mpPct = (this.player.mp / Math.max(1, this.player.maxMp)) * 100;
      if (this.autoCombatConfig.autoPotionHp && hpPct <= this.autoCombatConfig.hpThresholdPct) {
        const hasHp = this.inventory.some((i) => i.category === 'consumable' && i.iconKey === 'potion_hp' && i.qty > 0);
        if (hasHp) {
          this.lastAutoPotionMs = nowMs;
          this.quickUseConsumable('potion_hp');
        }
      } else if (this.autoCombatConfig.autoPotionMp && mpPct <= this.autoCombatConfig.mpThresholdPct) {
        const hasMp = this.inventory.some((i) => i.category === 'consumable' && i.iconKey === 'potion_mp' && i.qty > 0);
        if (hasMp) {
          this.lastAutoPotionMs = nowMs;
          this.quickUseConsumable('potion_mp');
        }
      }
    }

    if (this.autoCombatCooldownMs > 0) {
      this.autoCombatCooldownMs = Math.max(0, this.autoCombatCooldownMs - dtSec * 1000);
      return;
    }

    const searchAnchorX = this.autoCombatConfig.anchorRegionId === this.regionId && this.autoCombatConfig.anchorX !== null
      ? this.autoCombatConfig.anchorX
      : this.player.x;
    const searchAnchorY = this.autoCombatConfig.anchorRegionId === this.regionId && this.autoCombatConfig.anchorY !== null
      ? this.autoCombatConfig.anchorY
      : this.player.y;
    const maxSearchR = Math.max(180, Math.min(600, this.autoCombatConfig.searchRadiusPx || 420));

    // 2. Auto Target Selection
    let target = this.selectedTargetId
      ? this.monsters.find((m) => m.id === this.selectedTargetId && m.alive) || null
      : null;

    if ((!target || Math.hypot(target.x - searchAnchorX, target.y - searchAnchorY) > maxSearchR) && this.autoCombatConfig.autoTarget) {
      const candidates = this.monsters.filter((m) => {
        if (!m.alive) return false;
        if (this.autoCombatConfig.targetPriority === 'avoid_boss' && m.isBoss) return false;
        return Math.hypot(m.x - searchAnchorX, m.y - searchAnchorY) <= maxSearchR;
      });
      candidates.sort((a, b) => {
        if (this.autoCombatConfig.targetPriority === 'prefer_elite') {
          const ae = a.isElite || a.isRandomElite ? 1 : 0;
          const be = b.isElite || b.isRandomElite ? 1 : 0;
          if (ae !== be) return be - ae;
        } else if (this.autoCombatConfig.targetPriority === 'lowest_hp') {
          if (a.hp !== b.hp) return a.hp - b.hp;
        }
        return Math.hypot(a.x - this.player.x, a.y - this.player.y) - Math.hypot(b.x - this.player.x, b.y - this.player.y);
      });
      target = candidates[0] || null;
      this.selectedTargetId = target?.id || null;
    }

    // 3. Return to training anchor when idle
    if (!target) {
      if (this.autoCombatConfig.returnToAnchor && this.autoCombatConfig.anchorRegionId === this.regionId && this.autoCombatConfig.anchorX !== null && this.autoCombatConfig.anchorY !== null) {
        const distAnchor = Math.hypot(searchAnchorX - this.player.x, searchAnchorY - this.player.y);
        if (distAnchor > 64 && this.player.pathQueue.length === 0) {
          const path = this.tilemap.findPath(this.player.x, this.player.y, searchAnchorX, searchAnchorY);
          if (path.length > 0) this.player.assignPath(path);
        }
      }
      return;
    }

    const distToTarget = Math.hypot(target.x - this.player.x, target.y - this.player.y);
    const activeSkills = this.skills.filter(
      (s) =>
        !s.locked &&
        s.skillType !== 'passive' &&
        (this.cooldowns[s.id] || 0) <= 0.05 &&
        this.player.mp >= s.mpCost &&
        (!this.autoCombatConfig.selectedSkillIds?.length || this.autoCombatConfig.selectedSkillIds.includes(s.id))
    );
    const readySkill = this.autoCombatConfig.autoSkill ? activeSkills[0] : undefined;
    const desiredRange = readySkill ? Math.max(82, readySkill.rangePx * 0.85) : 78;

    if (distToTarget > desiredRange) {
      const path = this.tilemap.findPath(this.player.x, this.player.y, target.x, target.y);
      if (path.length > 0) {
        this.player.assignPath(path);
      } else {
        const vx = (target.x - this.player.x) / Math.max(1, distToTarget);
        const vy = (target.y - this.player.y) / Math.max(1, distToTarget);
        this.player.updateMovement(dtSec, vx, vy, this.tilemap, false);
      }
      return;
    }

    this.player.pathQueue = [];
    this.player.faceVector(target.x - this.player.x, target.y - this.player.y);
    if (readySkill) {
      this.castSkill(readySkill.id);
      this.autoCombatCooldownMs = 480;
    } else if (this.autoCombatConfig.autoAttack) {
      this.performBasicAttack();
      this.autoCombatCooldownMs = 520;
    }
  }

  private tickLocalMonsterRetaliation(nowMs: number) {
    if (this.player.dead || this.tilemap.map.type === 'CITY_SAFE_ZONE' || this.tilemap.map.combatEnabled === false) return;
    if (nowMs - this.lastLocalMonsterHitMs < 1350) return;
    for (const mon of this.monsters) {
      if (!mon.alive || mon.serverControlled) continue;
      const hostile = mon.aiBehavior === 'aggressive' || mon.aiBehavior === 'boss' || mon.isElite || mon.hp < mon.maxHp;
      if (!hostile) continue;
      if (Math.hypot(mon.x - this.player.x, mon.y - this.player.y) <= 78) {
        this.lastLocalMonsterHitMs = nowMs;
        mon.faceVector(this.player.x - mon.x, this.player.y - mon.y);
        mon.setState('attack');
        const stats = this.getComputedStats();
        const rawAtk = 10 + mon.level * (mon.isBoss ? 14 : mon.isElite ? 9 : 6);
        const dmg = Math.max(2, Math.round(rawAtk - stats.def * 0.45));
        this.applyClientDamageToPlayer(dmg, mon.name, 'Bị quái vật tấn công');
        break;
      }
    }
  }

  private update(dtSec: number, nowMs: number) {
    if (dtSec > 0) {
      const instantFps = 1 / dtSec;
      this.currentFps = Math.round(this.currentFps * 0.92 + instantFps * 0.08);
    }
    this.vfxEngine.update(dtSec);
    // Decrement active skill cooldowns
    for (const key of Object.keys(this.cooldowns)) {
      if (this.cooldowns[key] > 0) {
        this.cooldowns[key] = Math.max(0, this.cooldowns[key] - dtSec);
      }
    }
    for (let i = this.energyBeams.length - 1; i >= 0; i--) {
      const b = this.energyBeams[i];
      b.ttlMs -= dtSec * 1000;
      if (b.ttlMs <= 0) this.energyBeams.splice(i, 1);
    }
    // Prune expired buffs
    const nowEpoch = Date.now();
    for (const [bId, bVal] of Object.entries(this.activeBuffs)) {
      if (bVal.expiresAt <= nowEpoch) delete this.activeBuffs[bId];
    }

    // Gather keyboard vector (strictly locked during map transitions or active job ritual)
    let vx = 0;
    let vy = 0;
    if (this.isSwitchingRegion) {
      this.player.pathQueue = [];
    } else {
      if (this.keysDown.has('KeyA') || this.keysDown.has('ArrowLeft')) vx -= 1;
      if (this.keysDown.has('KeyD') || this.keysDown.has('ArrowRight')) vx += 1;
      if (this.keysDown.has('KeyW') || this.keysDown.has('ArrowUp')) vy -= 1;
      if (this.keysDown.has('KeyS') || this.keysDown.has('ArrowDown')) vy += 1;
      if (this.joystickVector) {
        vx += this.joystickVector.dx;
        vy += this.joystickVector.dy;
      }
    }

    this.sprites.setEquipment(this.equipment);
    const ritualCam = this.vfxEngine.getActiveRitualCameraHint();
    const targetZoom = ritualCam?.active ? ritualCam.zoomTarget : 1.0;
    this.zoom += (targetZoom - this.zoom) * Math.min(1, dtSec * 6);
    this.tickAutoCombat(dtSec, nowMs);
    this.tickLocalMonsterRetaliation(nowMs);
    this.player.updateMovement(dtSec, vx, vy, this.tilemap, this.keysDown.has('ShiftLeft') || this.keysDown.has('ShiftRight'));
    this.player.updateAnimation(dtSec, this.sprites.getMeta(this.player.spriteId));

    // Sync local player movement to Socket.IO room at <= 15 Hz when state/position changes
    if (this.multiplayer?.connected && this.serverCharacterId) {
      const moveSig = `${Math.round(this.player.x)},${Math.round(this.player.y)},${this.player.state},${this.player.direction}`;
      if (moveSig !== this.lastSentMoveSig && nowMs - this.lastMoveEmitMs >= 65) {
        this.lastMoveEmitMs = nowMs;
        this.lastSentMoveSig = moveSig;
        this.multiplayer.emitMove(this.player.x, this.player.y, this.player.state, this.player.direction);
      }
    }

    // Smooth remote player interpolation
    const playerMeta = this.sprites.getMeta(this.player.spriteId);
    for (const rp of this.remotePlayers.values()) {
      rp.renderX += (rp.x - rp.renderX) * Math.min(1, dtSec * 12);
      rp.renderY += (rp.y - rp.renderY) * Math.min(1, dtSec * 12);
      rp.entity.x = rp.renderX;
      rp.entity.y = rp.renderY;
      rp.entity.updateAnimation(dtSec, playerMeta);
    }

    for (const npc of this.npcs) {
      npc.updateAnimation(dtSec, this.sprites.getMeta(npc.spriteId));
    }
    for (const mon of this.monsters) {
      mon.updateAi(dtSec, this.tilemap, { x: this.player.x, y: this.player.y });
      mon.updateAnimation(dtSec, this.sprites.getMeta(mon.spriteId));
      // Tick DoTs
      const dot = mon.alive ? this.monsterDoTs.get(mon.id) : null;
      if (dot) {
        dot.tickAccumMs += dtSec * 1000;
        if (dot.tickAccumMs >= 1000) {
          dot.tickAccumMs -= 1000;
          dot.remainingTicks -= 1;
          this.floatingTexts.push({ x: mon.x, y: mon.y - 38, text: `-${dot.tickDamage}`, color: dot.color, ttlMs: 650 });
          const killedByDot = mon.applyDamage(dot.tickDamage);
          if (killedByDot) this.handleMonsterDefeat(mon);
          else if (dot.remainingTicks <= 0) this.monsterDoTs.delete(mon.id);
        }
      }
      // Tick Boss telegraphed AoE
      if (mon.alive && mon.telegraph) {
        mon.telegraph.remainingMs -= dtSec * 1000;
        if (mon.telegraph.remainingMs <= 0) {
          const rad = mon.telegraph.warningRadiusPx || 120;
          this.spawnVfx('vfx_fire_burst', mon.x, mon.y - 10, rad * 1.6);
          if (Math.hypot(this.player.x - mon.x, this.player.y - mon.y) <= rad) {
            const dmg = Math.max(15, Math.round(mon.level * 1.8));
            this.applyClientDamageToPlayer(dmg, mon.name, mon.telegraph?.skillName || 'Kỹ năng Boss');
          }
          mon.telegraph = null;
        }
      }
    }

    // Tick animated sprite-sheet VFX, directional slashes, flying projectiles, compact smoke bursts & loot beams
    for (let i = this.activeVfx.length - 1; i >= 0; i--) {
      const v = this.activeVfx[i];
      v.elapsedMs += dtSec * 1000;
      const durationMs = (v.totalFrames / Math.max(1, v.fps)) * 1000;
      if (v.elapsedMs >= durationMs) this.activeVfx.splice(i, 1);
    }
    for (let i = this.directionalSlashes.length - 1; i >= 0; i--) {
      this.directionalSlashes[i].elapsedMs += dtSec * 1000;
      if (this.directionalSlashes[i].elapsedMs >= this.directionalSlashes[i].durationMs) {
        this.directionalSlashes.splice(i, 1);
      }
    }
    for (let i = this.smokeBursts.length - 1; i >= 0; i--) {
      this.smokeBursts[i].elapsedMs += dtSec * 1000;
      if (this.smokeBursts[i].elapsedMs >= this.smokeBursts[i].durationMs) {
        this.smokeBursts.splice(i, 1);
      }
    }
    for (let i = this.activeProjectiles.length - 1; i >= 0; i--) {
      const proj = this.activeProjectiles[i];
      proj.ttlMs -= dtSec * 1000;
      if (proj.targetMonsterId && !proj.remoteOnly) {
        const tracked = this.monsters.find((m) => m.id === proj.targetMonsterId && m.alive);
        if (tracked) {
          proj.targetX = tracked.x;
          proj.targetY = tracked.y - 16;
        }
      }
      const dx = proj.targetX - proj.x;
      const dy = proj.targetY - proj.y;
      const dist = Math.hypot(dx, dy);
      const step = proj.speedPxPerSec * dtSec;

      // Ember trail
      proj.embers.push({
        x: proj.x + (Math.random() - 0.5) * 6,
        y: proj.y + (Math.random() - 0.5) * 6,
        r: 2 + Math.random() * 2.5,
        alpha: 0.9,
      });
      for (let e = proj.embers.length - 1; e >= 0; e--) {
        proj.embers[e].alpha -= dtSec * 3.2;
        proj.embers[e].r = Math.max(0.5, proj.embers[e].r - dtSec * 2.4);
        if (proj.embers[e].alpha <= 0) proj.embers.splice(e, 1);
      }

      // Hit check along trajectory
      const hitMonster = !proj.remoteOnly
        ? this.monsters.find((m) => m.alive && Math.hypot(m.x - proj.x, (m.y - 16) - proj.y) <= proj.radiusPx + 18)
        : undefined;

      if (hitMonster || dist <= step || proj.ttlMs <= 0) {
        const ix = hitMonster ? hitMonster.x : proj.targetX;
        const iy = hitMonster ? hitMonster.y - 16 : proj.targetY;
        this.detonateProjectile(proj, ix, iy, hitMonster);
        this.activeProjectiles.splice(i, 1);
      } else {
        proj.x += (dx / dist) * step;
        proj.y += (dy / dist) * step;
      }
    }
    for (let i = this.lootBeams.length - 1; i >= 0; i--) {
      this.lootBeams[i].ttlMs -= dtSec * 1000;
      if (this.lootBeams[i].ttlMs <= 0) this.lootBeams.splice(i, 1);
    }

    // Smooth Orthographic Camera Follow
    const targetCamX = Math.max(0, Math.min(this.tilemap.worldWidth - this.viewW / this.zoom, this.player.x - this.viewW / this.zoom * 0.5));
    const targetCamY = Math.max(0, Math.min(this.tilemap.worldHeight - this.viewH / this.zoom, this.player.y - this.viewH / this.zoom * 0.5));
    this.camX += (targetCamX - this.camX) * Math.min(1, dtSec * 8);
    this.camY += (targetCamY - this.camY) * Math.min(1, dtSec * 8);

    // Floating combat text & sakura wind petals
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= 34 * dtSec;
      ft.ttlMs -= dtSec * 1000;
      if (ft.ttlMs <= 0) this.floatingTexts.splice(i, 1);
    }
    for (const p of this.petals) {
      p.x = (p.x + p.vx * dtSec) % this.tilemap.worldWidth;
      p.y = (p.y + p.vy * dtSec) % this.tilemap.worldHeight;
    }

    // Throttled HUD & Minimap sync (~15Hz) so DOM updates stay ultra-lightweight
    if (nowMs - this.lastHudEmitMs >= 65) {
      this.lastHudEmitMs = nowMs;
      this.emitHudSnapshot();
      this.onMinimapDraw?.(this.tilemap, this.player, this.npcs, this.monsters);
    }
  }

  private render(timeMs: number) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.viewW, this.viewH);
    ctx.save();
    ctx.scale(this.zoom, this.zoom);
    const shake = this.vfxEngine.getScreenShakeOffset();
    if (shake.x !== 0 || shake.y !== 0) {
      ctx.translate(shake.x, shake.y);
    }
    const worldViewW = this.viewW / this.zoom;
    const worldViewH = this.viewH / this.zoom;

    // 1. Layer 0: Orthographic Ground + Stream Water + Illuminated Torii Portals
    this.tilemap.renderGroundLayer(ctx, this.camX, this.camY, worldViewW, worldViewH, timeMs, this.player.x, this.player.y);

    // 2. Click-to-move A* destination marker + Auto-Combat anchor & target ring
    if (this.player.pathQueue.length > 0) {
      const dest = this.player.pathQueue[this.player.pathQueue.length - 1];
      const marker = this.artwork.image(this.artwork.manifest.effects.destination);
      ctx.drawImage(marker, dest.x-this.camX-18, dest.y-this.camY-9, 36, 18);
    }
    if (this.autoCombatConfig.enabled && this.autoCombatConfig.anchorRegionId === this.regionId && this.autoCombatConfig.anchorX !== null && this.autoCombatConfig.anchorY !== null) {
      ctx.save();
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
      ctx.setLineDash([6, 5]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(this.autoCombatConfig.anchorX - this.camX, this.autoCombatConfig.anchorY - this.camY, Math.min(260, this.autoCombatConfig.searchRadiusPx), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (this.selectedTargetId) {
      const targetMon = this.monsters.find((m) => m.id === this.selectedTargetId && m.alive);
      if (targetMon) {
        ctx.save();
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(targetMon.x - this.camX, targetMon.y - this.camY - 2, 24, 11, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    // 3. Layer 1 + Active Entities unified Orthographic Y-Sorting
    type DrawItem = { sortY: number; draw: () => void };
    const queue: DrawItem[] = [];

    for (const obj of this.tilemap.map.layers.objects) {
      const ox = obj.tx * this.tilemap.tileSize - this.camX;
      const oy = obj.ty * this.tilemap.tileSize - this.camY;
      const ow = obj.wTiles * this.tilemap.tileSize;
      const oh = obj.hTiles * this.tilemap.tileSize;
      // Frustum cull offscreen objects
      if (ox + ow < -160 || ox > worldViewW + 160 || oy + oh < -220 || oy > worldViewH + 220) continue;

      const captured: MapObjectDef = obj;
      queue.push({
        sortY: this.tilemap.getObjectSortY(captured),
        draw: () => this.tilemap.renderObject(ctx, captured, this.camX, this.camY, timeMs),
      });
    }

    // 3a. Interactive Life-Skill Gathering Nodes on active map
    for (const node of PROFESSION_GATHERING_NODES) {
      if (node.mapId !== this.regionId) continue;
      const np = this.tilemap.tileToWorldCenter(node.tx, node.ty);
      const sx = np.x - this.camX;
      const sy = np.y - this.camY;
      if (sx < -60 || sx > worldViewW + 60 || sy < -60 || sy > worldViewH + 60) continue;
      queue.push({
        sortY: np.y,
        draw: () => {
          const pulse = 0.85 + Math.sin(timeMs * 0.004) * 0.15;
          const color =
            node.nodeType === 'ore'
              ? '#94a3b8'
              : node.nodeType === 'tree'
              ? '#854d0e'
              : node.nodeType === 'fishing_spot'
              ? '#38bdf8'
              : '#22c55e';
          ctx.save();
          ctx.globalAlpha = 0.25 * pulse;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(sx, sy, 19, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 0.95;
          ctx.fillStyle = color;
          ctx.strokeStyle = '#fef3c7';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(sx, sy, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.font = '700 10px "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#fef08a';
          const icon = node.nodeType === 'ore' ? '⛏' : node.nodeType === 'tree' ? '🪓' : node.nodeType === 'fishing_spot' ? '🎣' : '🌿';
          ctx.fillText(`${icon} ${node.nameVi}`, sx, sy - 16);
          ctx.restore();
        },
      });
    }

    const remoteEntities = Array.from(this.remotePlayers.values()).map((rp) => rp.entity);
    const allEntities: Entity[] = [this.player, ...remoteEntities, ...this.npcs, ...this.monsters];
    for (const ent of allEntities) {
      const sx = ent.x - this.camX;
      const sy = ent.y - this.camY;
      if (sx < -100 || sx > worldViewW + 100 || sy < -120 || sy > worldViewH + 120) continue;
      queue.push({
        sortY: ent.getSortY(),
        draw: () => this.sprites.drawMonsterOrEntity(ctx, ent, sx, sy, timeMs),
      });
    }

    queue.sort((a, b) => a.sortY - b.sortY);
    for (const item of queue) item.draw();

    // 3b. Boss Telegraphed AoE ground rings & Rarity Loot Beams
    ctx.save();
    for (const mon of this.monsters) {
      if (!mon.alive || !mon.telegraph) continue;
      const sx = mon.x - this.camX;
      const sy = mon.y - this.camY;
      const rad = mon.telegraph.warningRadiusPx || 120;
      ctx.beginPath();
      ctx.arc(sx, sy, rad, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.16)';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#ef4444';
      ctx.stroke();
    }
    for (const beam of this.lootBeams) {
      const sx = beam.x - this.camX;
      const sy = beam.y - this.camY;
      const alpha = Math.min(1, beam.ttlMs / 1000);
      ctx.globalAlpha = alpha * 0.72;
      const grad = ctx.createLinearGradient(sx, sy - 85, sx, sy);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(1, beam.color);
      ctx.fillStyle = grad;
      ctx.fillRect(sx - 6, sy - 85, 12, 85);
      ctx.globalAlpha = alpha;
      ctx.font = '700 11px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = beam.color;
      ctx.fillText(beam.label, sx, sy - 90);
    }

    // 3c. Animated Combat VFX Sprite Sheets (pixelfx)
    ctx.globalAlpha = 1;
    for (const vfx of this.activeVfx) {
      const img = this.artwork.getOptional(vfx.assetId);
      if (!img || !img.complete || img.naturalWidth === 0) continue;
      const frameIdx = Math.min(vfx.totalFrames - 1, Math.floor((vfx.elapsedMs / 1000) * vfx.fps));
      const cols = Math.max(1, Math.round(img.naturalWidth / 256));
      const col = frameIdx % cols;
      const row = Math.floor(frameIdx / cols);
      ctx.drawImage(
        img,
        col * 256,
        row * 256,
        256,
        256,
        vfx.x - this.camX - vfx.size * 0.5,
        vfx.y - this.camY - vfx.size * 0.5,
        vfx.size,
        vfx.size
      );
    }

    // 3d. Directional Blade Slash Arcs (strictly forward of caster)
    for (const sl of this.directionalSlashes) {
      const t = Math.min(1, sl.elapsedMs / Math.max(1, sl.durationMs));
      const sx = sl.x - this.camX;
      const sy = sl.y - this.camY;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(sl.angleRad);
      ctx.globalAlpha = 1 - t * 0.88;
      const sweepStart = -0.85 + t * 0.25;
      const sweepEnd = 0.85 + t * 0.25;
      ctx.beginPath();
      ctx.arc(0, 0, sl.radiusPx, sweepStart, sweepEnd);
      ctx.strokeStyle = sl.color;
      ctx.lineWidth = Math.max(2, 10 * (1 - t * 0.7));
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, sl.radiusPx - 4, sweepStart + 0.12, sweepEnd - 0.12);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1, 3.5 * (1 - t));
      ctx.stroke();
      ctx.restore();
    }

    // 3e. Fireball / Magic Projectiles + Glowing Ember Trail
    const branchOrClass = this.advancedJobId || this.player.classId;
    const maxPlayerEvoTier = Math.max(
      this.advancedJobId ? 2 : 0,
      ...this.skills.map((sk) => Number(sk.evolutionTier || 0))
    );
    this.vfxEngine.renderCasterWeaponAura(
      ctx,
      this.player.x - this.camX,
      this.player.y - this.camY - 6,
      branchOrClass,
      maxPlayerEvoTier,
      timeMs / 1000
    );
    this.vfxEngine.render(ctx, this.camX, this.camY);

    for (const proj of this.activeProjectiles) {
      for (const em of proj.embers) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, em.alpha);
        ctx.fillStyle = '#fb923c';
        ctx.beginPath();
        ctx.arc(em.x - this.camX, em.y - this.camY, em.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      const px = proj.x - this.camX;
      const py = proj.y - this.camY;
      ctx.save();
      const grad = ctx.createRadialGradient(px, py, 2, px, py, proj.radiusPx + 8);
      grad.addColorStop(0, '#fffbeb');
      grad.addColorStop(0.35, '#fb923c');
      grad.addColorStop(0.75, 'rgba(234, 88, 12, 0.55)');
      grad.addColorStop(1, 'rgba(234, 88, 12, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, proj.radiusPx + 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 3f. Compact Dissipating Impact Smoke Puffs
    for (const sm of this.smokeBursts) {
      const t = Math.min(1, sm.elapsedMs / Math.max(1, sm.durationMs));
      const sx = sm.x - this.camX;
      const sy = sm.y - this.camY;
      ctx.save();
      ctx.globalAlpha = (1 - t) * 0.48;
      ctx.fillStyle = '#cbd5e1';
      for (let k = 0; k < 4; k++) {
        const ang = (Math.PI * 2 * k) / 4 + 0.4;
        const dist = sm.radiusPx * 0.45 * t;
        const r = Math.max(3, (1 - t * 0.3) * 9);
        ctx.beginPath();
        ctx.arc(sx + Math.cos(ang) * dist, sy + Math.sin(ang) * dist - t * 8, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    // 3g. Vibrant Golden Energy Beams
    for (const b of this.energyBeams) {
      const sx = b.startX - this.camX;
      const sy = b.startY - this.camY;
      const ex = b.targetX - this.camX;
      const ey = b.targetY - this.camY;
      const alpha = Math.max(0, b.ttlMs / Math.max(1, b.maxTtlMs));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.lineCap = 'round';
      ctx.strokeStyle = b.color;
      ctx.lineWidth = b.width;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(2, b.width * 0.35);
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    // 4. Floating Sakura Petals & Damage Numbers
    ctx.save();
    if (this.showPetals) {
      const petalImage = this.artwork.image(this.artwork.manifest.effects.petal);
      for (const p of this.petals) {
        const sx = p.x - this.camX;
        const sy = p.y - this.camY;
        if (sx < 0 || sx > worldViewW || sy < 0 || sy > worldViewH) continue;
        ctx.globalAlpha = p.alpha;
        ctx.drawImage(petalImage, sx, sy, p.size * 2, p.size * 2);
      }
    }

    // 4b. Floating "ĐANG AUTO" Banner above player
    if (this.autoCombatConfig.enabled) {
      ctx.save();
      const autoX = this.player.x - this.camX;
      const autoY = this.player.y - this.camY - 82;
      const pulse = 0.88 + 0.12 * Math.sin(timeMs * 0.007);
      ctx.globalAlpha = pulse;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.beginPath();
      if (typeof (ctx as any).roundRect === 'function') {
        (ctx as any).roundRect(autoX - 58, autoY - 14, 116, 26, 13);
      } else {
        ctx.rect(autoX - 58, autoY - 14, 116, 26);
      }
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = '900 13px "Cinzel", "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fde047';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 8;
      ctx.fillText('⚡ ĐANG AUTO ⚡', autoX, autoY);
      ctx.restore();
    }

    // 4c. Stylized High-Impact Floating Combat Damage Numbers
    if (this.showDamageNumbers) {
      ctx.save();
      for (const ft of this.floatingTexts) {
        const sx = ft.x - this.camX;
        const sy = ft.y - this.camY;
        if (sx < -80 || sx > worldViewW + 80 || sy < -80 || sy > worldViewH + 80) continue;

        const isDmg = ft.text.startsWith('-') || /^\d+$/.test(ft.text);
        if (isDmg) {
          const numStr = ft.text.replace(/^-/, '');
          ctx.font = '900 24px "Cinzel", "Impact", "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.lineWidth = 4.5;
          ctx.strokeStyle = '#000000';
          ctx.strokeText(numStr, sx, sy);

          const grad = ctx.createLinearGradient(sx, sy - 14, sx, sy + 14);
          if (ft.color === '#ef4444' || ft.isCrit) {
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.35, '#ff7875');
            grad.addColorStop(1, '#cf1322');
          } else {
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.35, '#fff566');
            grad.addColorStop(1, '#d48806');
          }
          ctx.fillStyle = grad;
          ctx.fillText(numStr, sx, sy);

          if (ft.comboCount || ft.isCrit) {
            ctx.font = '900 13px "Segoe UI", sans-serif';
            ctx.fillStyle = '#52c41a';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            ctx.strokeText(`+${ft.comboCount || 7}`, sx + 32, sy - 7);
            ctx.fillText(`+${ft.comboCount || 7}`, sx + 32, sy - 7);
          }
        } else {
          ctx.font = '800 12px "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.lineWidth = 3;
          ctx.strokeStyle = '#000000';
          ctx.strokeText(ft.text, sx, sy);
          ctx.fillStyle = ft.color;
          ctx.fillText(ft.text, sx, sy);
        }
      }
      ctx.restore();
    }
    ctx.restore();
    ctx.restore();
  }

  private centerCameraImmediate() {
    this.camX = Math.max(0, Math.min(this.tilemap.worldWidth - this.viewW / this.zoom, this.player.x - this.viewW / this.zoom * 0.5));
    this.camY = Math.max(0, Math.min(this.tilemap.worldHeight - this.viewH / this.zoom, this.player.y - this.viewH / this.zoom * 0.5));
  }

  private minimumZoom() {
    return Math.max(.65, this.viewW / this.tilemap.worldWidth, this.viewH / this.tilemap.worldHeight);
  }

  private bindInputs() {
    this.canvas.tabIndex = 0;
    modalManager.onOpenStateChange = (anyOpen) => {
      if (anyOpen) this.keysDown.clear();
    };
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('keydown', (e) => {
      const activeTag = (document.activeElement?.tagName || '').toUpperCase();
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') {
        return;
      }

      if (modalManager.hasOpenModal()) {
        // Allow toggling the matching modal hotkey off, while blocking combat/movement behind modals
        const topId = modalManager.getTopModalId();
        if ((e.code === 'KeyB' || e.code === 'KeyI') && topId === 'balo-equip') this.onToggleBalo?.();
        else if (e.code === 'KeyK' && topId === 'skill-frame') this.onToggleSkills?.();
        else if ((e.code === 'KeyC' || e.code === 'KeyL' || e.code === 'KeyM') && topId === 'world-panels') {
          if (e.code === 'KeyC') this.onToggleCrafting?.();
          else if (e.code === 'KeyL') this.onToggleQuest?.();
          else if (e.code === 'KeyM') this.onToggleWorldMap?.();
        } else if (e.code === 'KeyP' && topId === 'social-trade') {
          this.onToggleParty?.();
        } else if (e.code === 'KeyO' && topId === 'professions') {
          this.onToggleProfession?.();
        } else if (e.code === 'KeyG' && topId === 'guild-merchant') {
          this.onToggleGuildMerchant?.();
        }
        return;
      }

      this.keysDown.add(e.code);
      if (e.code === 'KeyJ' || e.code === 'Space') this.performBasicAttack();
      if (e.code === 'KeyE') {
        const nearNpc = this.npcs.find((n) => Math.hypot(n.x - this.player.x, n.y - this.player.y) <= 84);
        if (nearNpc) {
          this.interactNearestNpc();
        } else {
          this.quickUseConsumable('potion_mp');
        }
      }
      if (e.code === 'KeyF') this.interactNearestNpc();
      const digitMap: Record<string, string> = {
        Digit1: '1',
        Digit2: '2',
        Digit3: '3',
        Digit4: '4',
        Digit5: '5',
      };
      const hotKey = digitMap[e.code];
      if (hotKey) {
        const match = this.skills.find((s) => s.key === hotKey && !s.locked && s.skillType !== 'passive' && s.tier !== 'passive');
        if (match) this.castSkill(match.id);
      }
      if (e.code === 'KeyQ') this.quickUseConsumable('potion_hp');
      if (e.code === 'KeyR') this.quickUseConsumable('potion_mp');
      if (e.code === 'KeyT') this.quickUseConsumable('scroll_town');
      if (e.code === 'KeyB' || e.code === 'KeyI') this.onToggleBalo?.();
      if (e.code === 'KeyC') this.onToggleCrafting?.();
      if (e.code === 'KeyK') this.onToggleSkills?.();
      if (e.code === 'KeyL') this.onToggleQuest?.();
      if (e.code === 'KeyM') this.onToggleWorldMap?.();
      if (e.code === 'KeyP') this.onToggleParty?.();
      if (e.code === 'KeyO') this.onToggleProfession?.();
      if (e.code === 'KeyG') this.onToggleGuildMerchant?.();
      if (e.code === 'KeyZ') this.toggleAutoCombat();
    });
    window.addEventListener('keyup', (e) => this.keysDown.delete(e.code));
    window.addEventListener('blur', () => this.keysDown.clear());
    this.canvas.addEventListener('wheel', (e) => {
      if (modalManager.hasOpenModal()) return;
      e.preventDefault();
      this.zoom = Math.max(this.minimumZoom(), Math.min(2, this.zoom * Math.exp(-e.deltaY*.001)));
      this.centerCameraImmediate();
    }, { passive: false });

    this.canvas.addEventListener('pointerdown', (e) => {
      if (modalManager.hasOpenModal()) return;
      const rect = this.canvas.getBoundingClientRect();
      const worldX = (e.clientX - rect.left) / this.zoom + this.camX;
      const worldY = (e.clientY - rect.top) / this.zoom + this.camY;

      // Check click on NPC first
      for (const npc of this.npcs) {
        if (Math.hypot(worldX - npc.x, worldY - (npc.y - 20)) <= 36) {
          this.onNpcTalk?.(npc);
          return;
        }
      }

      // Check click on Life-Skill Gathering Node on current map
      const clickedNode = PROFESSION_GATHERING_NODES.find((node) => {
        if (node.mapId !== this.regionId) return false;
        const p = this.tilemap.tileToWorldCenter(node.tx, node.ty);
        return Math.hypot(worldX - p.x, worldY - p.y) <= 28;
      });
      if (clickedNode) {
        this.onToggleProfession?.(clickedNode.professionId);
        return;
      }

      // Check click on Dungeon interactable or Torii Portal
      const clickedExit = this.tilemap.map.exits?.find((ex) => {
        const p = this.tilemap.tileToWorldCenter(ex.tx, ex.ty);
        return Math.hypot(worldX - p.x, worldY - p.y) <= 44;
      });
      if (clickedExit) {
        const exitPt = this.tilemap.tileToWorldCenter(clickedExit.tx, clickedExit.ty);
        const radius = clickedExit.interactionRadius || 92;
        if (Math.hypot(exitPt.x - this.player.x, exitPt.y - this.player.y) <= radius) {
          void this.switchRegion(clickedExit.targetRegion, { fromExit: clickedExit });
          return;
        }
      }

      const clickedObj = this.tilemap.map.spawns.interactables?.find((it) => {
        const p = this.tilemap.tileToWorldCenter(it.tx, it.ty);
        return Math.hypot(worldX - p.x, worldY - p.y) <= 34;
      });
      if (clickedObj) {
        if (Math.hypot(this.tilemap.tileToWorldCenter(clickedObj.tx, clickedObj.ty).x - this.player.x, this.tilemap.tileToWorldCenter(clickedObj.tx, clickedObj.ty).y - this.player.y) <= 95) {
          this.interactDungeonObject(clickedObj.id);
          return;
        }
      }

      // Check click on Monster: attack if in melee range, otherwise path toward it
      for (const mon of this.monsters) {
        if (!mon.alive) continue;
        if (Math.hypot(worldX - mon.x, worldY - (mon.y - 20)) <= 38) {
          if (Math.hypot(mon.x - this.player.x, mon.y - this.player.y) <= 88) {
            this.player.faceVector(mon.x - this.player.x, mon.y - this.player.y);
            this.performBasicAttack();
            return;
          }
          break;
        }
      }

      const path = this.tilemap.findPath(this.player.x, this.player.y, worldX, worldY);
      if (path.length > 0) {
        this.player.assignPath(path);
      }
    });
  }
}
