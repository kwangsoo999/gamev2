import {
  AutoCombatConfig,
  CharacterEntity,
  DeathPenaltyConfig,
  DeathPenaltyState,
  DeathPenaltyTier,
  WorldOperationsConfig,
} from '@elysia/game-types';
import { isPreJobClass } from './index.js';

export const GAME_BRANDING = {
  title: 'ELYSIA NO DENSETSU',
  worldName: 'Elysia Frontier',
  slogan: 'Become Wibu, Save the Worlds.',
  fullHeader: 'ELYSIA NO DENSETSU – Elysia Frontier',
} as const;

export interface SafeVillageCheckpointDef {
  id: string;
  name: string;
  nameVi: string;
  spawnX: number;
  spawnY: number;
  spawnTx: number;
  spawnTy: number;
  requiredLevel: number;
  worldOrder: number;
  worldX: number;
  worldY: number;
  isDefaultStarter?: boolean;
}

export const SAFE_VILLAGE_CHECKPOINTS: SafeVillageCheckpointDef[] = [
  {
    id: 'THON_KHOI_NGUYEN',
    name: 'Novice Village',
    nameVi: 'Thôn Khởi Nguyên',
    spawnX: 552,
    spawnY: 984,
    spawnTx: 11,
    spawnTy: 20,
    requiredLevel: 1,
    worldOrder: 1,
    worldX: 0,
    worldY: 0,
    isDefaultStarter: true,
  },
  {
    id: 'city_elysia_capital',
    name: 'Elysia Capital',
    nameVi: 'Kinh Đô Elysia',
    spawnX: 504,
    spawnY: 744,
    spawnTx: 10,
    spawnTy: 15,
    requiredLevel: 15,
    worldOrder: 2,
    worldX: 1,
    worldY: 0.4,
  },
  {
    id: 'city_sylvaris',
    name: 'Sylvaris',
    nameVi: 'Thị Trấn Sylvaris',
    spawnX: 504,
    spawnY: 744,
    spawnTx: 10,
    spawnTy: 15,
    requiredLevel: 35,
    worldOrder: 3,
    worldX: 2.5,
    worldY: 0.6,
  },
  {
    id: 'city_drakhen',
    name: 'Drakhen',
    nameVi: 'Thành Pháo Đài Drakhen',
    spawnX: 504,
    spawnY: 744,
    spawnTx: 10,
    spawnTy: 15,
    requiredLevel: 60,
    worldOrder: 4,
    worldX: 4.0,
    worldY: 0.8,
  },
];

export const REGION_WORLD_COORDS: Record<string, { x: number; y: number; nearestVillageId: string; isTrainingMap: boolean }> = {
  THON_KHOI_NGUYEN: { x: 0, y: 0, nearestVillageId: 'THON_KHOI_NGUYEN', isTrainingMap: false },
  map_beginner_meadow: { x: 0.25, y: 0, nearestVillageId: 'THON_KHOI_NGUYEN', isTrainingMap: true },
  map_green_rabbit_forest: { x: 0.45, y: 0.05, nearestVillageId: 'THON_KHOI_NGUYEN', isTrainingMap: true },
  map_ancient_bee_forest: { x: 0.65, y: 0.1, nearestVillageId: 'THON_KHOI_NGUYEN', isTrainingMap: true },
  map_wild_wolf_valley: { x: 0.78, y: 0.15, nearestVillageId: 'THON_KHOI_NGUYEN', isTrainingMap: true },
  map_wild_boar_forest: { x: 0.85, y: 0.2, nearestVillageId: 'THON_KHOI_NGUYEN', isTrainingMap: true },
  map_goblin_outpost: { x: 0.9, y: 0.25, nearestVillageId: 'THON_KHOI_NGUYEN', isTrainingMap: true },
  map_goblin_cave: { x: 0.95, y: 0.3, nearestVillageId: 'THON_KHOI_NGUYEN', isTrainingMap: true },
  city_elysia_capital: { x: 1, y: 0.4, nearestVillageId: 'city_elysia_capital', isTrainingMap: false },
  dungeon_sanctum_f1: { x: 1.02, y: 0.42, nearestVillageId: 'THON_KHOI_NGUYEN', isTrainingMap: false },
  dungeon_sanctum_f2: { x: 1.04, y: 0.42, nearestVillageId: 'THON_KHOI_NGUYEN', isTrainingMap: false },
  dungeon_sanctum_f3: { x: 1.06, y: 0.42, nearestVillageId: 'THON_KHOI_NGUYEN', isTrainingMap: false },
  map_whispering_meadow: { x: 1.35, y: 0.45, nearestVillageId: 'city_elysia_capital', isTrainingMap: true },
  map_windmill_plains: { x: 1.65, y: 0.48, nearestVillageId: 'city_elysia_capital', isTrainingMap: true },
  map_spirit_forest_outskirts: { x: 2.0, y: 0.52, nearestVillageId: 'city_sylvaris', isTrainingMap: true },
  city_sylvaris: { x: 2.5, y: 0.6, nearestVillageId: 'city_sylvaris', isTrainingMap: false },
  map_spirit_forest: { x: 2.75, y: 0.62, nearestVillageId: 'city_sylvaris', isTrainingMap: true },
  map_moonlit_lake: { x: 3.1, y: 0.68, nearestVillageId: 'city_sylvaris', isTrainingMap: true },
  map_ancient_ruins: { x: 3.45, y: 0.72, nearestVillageId: 'city_drakhen', isTrainingMap: true },
  city_drakhen: { x: 4.0, y: 0.8, nearestVillageId: 'city_drakhen', isTrainingMap: false },
  map_ember_canyon: { x: 4.35, y: 0.85, nearestVillageId: 'city_drakhen', isTrainingMap: true },
  map_dragon_valley: { x: 4.7, y: 0.9, nearestVillageId: 'city_drakhen', isTrainingMap: true },
  map_crimson_desert: { x: 5.05, y: 0.95, nearestVillageId: 'city_drakhen', isTrainingMap: true },
  map_shadow_realm_border: { x: 5.4, y: 1.0, nearestVillageId: 'city_drakhen', isTrainingMap: true },
};

export const DEFAULT_DEATH_PENALTY_CONFIG: DeathPenaltyConfig = {
  enabled: true,
  expLossPct: 3,
  expFloorAtZero: true,
  maxStacks: 1,
  stackStatReductionCapPct: 25,
  tiers: {
    novice: {
      statReductionPct: 3,
      durationSec: 3600,
      labelVi: 'Suy Yếu Tân Thủ (-3% Chỉ Số · 1 Giờ)',
    },
    first_job: {
      statReductionPct: 6,
      durationSec: 7200,
      labelVi: 'Suy Yếu Chức Nghiệp I (-6% Chỉ Số · 2 Giờ)',
    },
    second_job: {
      statReductionPct: 12,
      durationSec: 14400,
      labelVi: 'Suy Yếu Chức Nghiệp II (-12% Chỉ Số · 4 Giờ)',
    },
    third_job: {
      statReductionPct: 20,
      durationSec: 36000,
      labelVi: 'Suy Yếu Chức Nghiệp III (-20% Chỉ Số · 10 Giờ)',
    },
  },
};

export const DEFAULT_WORLD_OPERATIONS_CONFIG: WorldOperationsConfig = {
  normalSpawnMultiplier: 3,
  maxNormalMonstersPerMap: 96,
  monsterAiAggroScale: 1.0,
  deathPenalty: DEFAULT_DEATH_PENALTY_CONFIG,
  eliteSpawn: {
    enabled: true,
    spawnChancePct: 18,
    checkIntervalSec: 45,
    maxActivePerMap: 2,
    respawnCooldownSec: 90,
    hpMultiplier: 2.6,
    atkMultiplier: 1.55,
    expMultiplier: 2.5,
    goldMultiplier: 2.2,
    announceRegion: true,
  },
  autoCombat: {
    enabled: true,
    maxSearchRadiusPx: 520,
    minActionIntervalMs: 320,
    allowInSafeZones: false,
  },
};

export const DEFAULT_AUTO_COMBAT_CONFIG: AutoCombatConfig = {
  enabled: false,
  autoAttack: true,
  autoSkill: true,
  selectedSkillIds: [],
  autoPotionHp: true,
  hpThresholdPct: 55,
  autoPotionMp: true,
  mpThresholdPct: 35,
  autoLoot: true,
  autoTarget: true,
  targetPriority: 'nearest',
  returnToAnchor: true,
  anchorX: null,
  anchorY: null,
  anchorRegionId: null,
  anchorRadiusPx: 260,
  searchRadiusPx: 420,
};

export function isSafeVillageId(regionId: string | undefined | null): boolean {
  if (!regionId) return false;
  return SAFE_VILLAGE_CHECKPOINTS.some((v) => v.id === regionId);
}

export function isTrainingRegionId(regionId: string | undefined | null): boolean {
  if (!regionId) return false;
  const meta = REGION_WORLD_COORDS[regionId];
  if (meta) return meta.isTrainingMap;
  return regionId.startsWith('map_');
}

export function getDeathPenaltyTierForCharacter(
  character: Partial<CharacterEntity>
): DeathPenaltyTier {
  if (character.thirdJobId || Number(character.evolutionTier || 0) >= 4) {
    return 'third_job';
  }
  if (character.advancedJobId || character.secondJobId || Number(character.evolutionTier || 0) >= 2) {
    return 'second_job';
  }
  if (character.jobAdvancementCompleted || !isPreJobClass(character.classId)) {
    return 'first_job';
  }
  return 'novice';
}

export function computeDeathPenaltyApplication(params: {
  character: Partial<CharacterEntity>;
  resurrectionMapId: string;
  killerName?: string;
  reason?: string;
  config?: Partial<DeathPenaltyConfig>;
  nowMs?: number;
}): {
  penalty: DeathPenaltyState | null;
  expLost: number;
  nextExp: number;
  nextLevel: number;
} {
  const nowMs = params.nowMs ?? Date.now();
  const cfg: DeathPenaltyConfig = {
    ...DEFAULT_DEATH_PENALTY_CONFIG,
    ...(params.config || {}),
    tiers: {
      ...DEFAULT_DEATH_PENALTY_CONFIG.tiers,
      ...(params.config?.tiers || {}),
    },
  };

  const currentExp = Math.max(0, Number(params.character.exp || 0));
  const currentLevel = Math.max(1, Number(params.character.level || 1));

  if (!cfg.enabled) {
    return {
      penalty: null,
      expLost: 0,
      nextExp: currentExp,
      nextLevel: currentLevel,
    };
  }

  const lossPct = Math.max(0, Math.min(50, Number(cfg.expLossPct ?? 3)));
  const expLost = currentExp > 0 ? Math.min(currentExp, Math.max(1, Math.floor((currentExp * lossPct) / 100))) : 0;
  const nextExp = Math.max(0, currentExp - expLost);

  const tier = getDeathPenaltyTierForCharacter(params.character);
  const rule = cfg.tiers[tier] || DEFAULT_DEATH_PENALTY_CONFIG.tiers[tier];

  const existing = params.character.deathPenalty;
  const activeExisting = existing && existing.expiresAt > nowMs ? existing : null;
  const maxStacks = Math.max(1, Number(cfg.maxStacks ?? 1));
  const nextStacks = activeExisting ? Math.min(maxStacks, (activeExisting.stackingCount || 1) + 1) : 1;
  const rawReduction = rule.statReductionPct * nextStacks;
  const statReductionPct = Math.max(0, Math.min(Number(cfg.stackStatReductionCapPct || 25), rawReduction));

  return {
    penalty: {
      tier,
      statReductionPct,
      expLost,
      appliedAt: nowMs,
      expiresAt: nowMs + Math.max(60, Number(rule.durationSec || 3600)) * 1000,
      stackingCount: nextStacks,
      maxStacks,
      resurrectionMapId: params.resurrectionMapId,
      killerName: params.killerName,
      reason: params.reason,
    },
    expLost,
    nextExp,
    nextLevel: currentLevel, // Never resets player level on death!
  };
}

export function getActiveDeathPenaltyReductionPct(
  character: Partial<CharacterEntity>,
  nowMs = Date.now()
): { active: boolean; statReductionPct: number; penalty: DeathPenaltyState | null } {
  const dp = character.deathPenalty;
  if (!dp || Number(dp.expiresAt || 0) <= nowMs || Number(dp.statReductionPct || 0) <= 0) {
    return { active: false, statReductionPct: 0, penalty: null };
  }
  return {
    active: true,
    statReductionPct: Math.min(50, Math.max(0, Number(dp.statReductionPct))),
    penalty: dp,
  };
}

export function resolveResurrectionCheckpoint(
  character: Partial<CharacterEntity>,
  currentRegionId?: string
): SafeVillageCheckpointDef {
  const discovered = new Set<string>(
    Array.isArray(character.discoveredVillageIds) && character.discoveredVillageIds.length > 0
      ? character.discoveredVillageIds
      : ['THON_KHOI_NGUYEN']
  );
  discovered.add('THON_KHOI_NGUYEN');

  if (character.preferredResurrectionVillageId && discovered.has(character.preferredResurrectionVillageId)) {
    const preferred = SAFE_VILLAGE_CHECKPOINTS.find((v) => v.id === character.preferredResurrectionVillageId);
    if (preferred) return preferred;
  }

  const fromRegion = REGION_WORLD_COORDS[currentRegionId || character.regionId || 'THON_KHOI_NGUYEN'];
  const discoveredVillages = SAFE_VILLAGE_CHECKPOINTS.filter((v) => discovered.has(v.id));

  if (fromRegion) {
    // 1. Prefer discovered village specifically assigned as nearest hub
    if (discovered.has(fromRegion.nearestVillageId)) {
      const exactHub = discoveredVillages.find((v) => v.id === fromRegion.nearestVillageId);
      if (exactHub) return exactHub;
    }
    // 2. Otherwise choose spatially closest discovered safe village
    const sorted = [...discoveredVillages].sort((a, b) => {
      const da = Math.hypot(a.worldX - fromRegion.x, a.worldY - fromRegion.y);
      const db = Math.hypot(b.worldX - fromRegion.x, b.worldY - fromRegion.y);
      return da - db;
    });
    if (sorted[0]) return sorted[0];
  }

  if (character.latestVillageCheckpointId && discovered.has(character.latestVillageCheckpointId)) {
    const latest = discoveredVillages.find((v) => v.id === character.latestVillageCheckpointId);
    if (latest) return latest;
  }

  return SAFE_VILLAGE_CHECKPOINTS[0];
}
