import {
  AdvancedJobId,
  ClassId,
  ExpBalanceConfig,
  FirstJobClassId,
  JobRegenProfile,
  PrimaryAttributes,
  ProgressionBandSimulationResult,
  RegenStateMultipliersConfig,
  RegenerationAreaContext,
  RegenerationState,
  SkillAnimationMetadata,
  SkillDefinition,
  SkillDirectionCode,
  SkillExecutionTimeline,
  WeaponType,
} from '@elysia/game-types';
import { computeExpRequiredForLevel } from './index.js';

const DEFAULT_LEVEL_PENALTY = {
  graceLevelDiff: 3,
  penaltyPerLevelPct: 12,
  minExpFloorPct: 25,
  higherLevelBonusPerLvPct: 5,
  maxHigherLevelBonusPct: 20,
};

// ==========================================
// PHASE 1: SERVER-SIDE INITIAL ATTRIBUTE GENERATION
// ==========================================

export const INITIAL_ATTRIBUTE_MIN = 8;
export const INITIAL_ATTRIBUTE_MAX = 12;
export const INITIAL_ATTRIBUTE_TOTAL_MIN = 40;
export const INITIAL_ATTRIBUTE_TOTAL_MAX = 60;

function secureRandomIntInclusive(min: number, max: number): number {
  const g: any = globalThis as any;
  if (g.crypto && typeof g.crypto.randomInt === 'function') {
    return g.crypto.randomInt(min, max + 1);
  }
  if (g.crypto && typeof g.crypto.getRandomValues === 'function') {
    const span = max - min + 1;
    const buf = new Uint32Array(1);
    g.crypto.getRandomValues(buf);
    return min + (buf[0] % span);
  }
  return min + Math.floor(Math.random() * (max - min + 1));
}

/**
 * Generates server-side initial attributes for a newly created character.
 * Each of STR, DEX, AGI, INT, CON is independently rolled in [8..12] inclusive (total 40..60).
 */
export function generateServerInitialAttributes(): PrimaryAttributes {
  return {
    str: secureRandomIntInclusive(INITIAL_ATTRIBUTE_MIN, INITIAL_ATTRIBUTE_MAX),
    dex: secureRandomIntInclusive(INITIAL_ATTRIBUTE_MIN, INITIAL_ATTRIBUTE_MAX),
    agi: secureRandomIntInclusive(INITIAL_ATTRIBUTE_MIN, INITIAL_ATTRIBUTE_MAX),
    int: secureRandomIntInclusive(INITIAL_ATTRIBUTE_MIN, INITIAL_ATTRIBUTE_MAX),
    con: secureRandomIntInclusive(INITIAL_ATTRIBUTE_MIN, INITIAL_ATTRIBUTE_MAX),
  };
}

export function validateInitialAttributesRange(attrs: PrimaryAttributes | undefined | null): {
  valid: boolean;
  total: number;
  error?: string;
} {
  if (!attrs || typeof attrs !== 'object') {
    return { valid: false, total: 0, error: 'Thiếu đối tượng thuộc tính khởi tạo.' };
  }
  const keys: (keyof PrimaryAttributes)[] = ['str', 'dex', 'agi', 'int', 'con'];
  let total = 0;
  for (const k of keys) {
    const val = Number(attrs[k]);
    if (!Number.isInteger(val) || val < INITIAL_ATTRIBUTE_MIN || val > INITIAL_ATTRIBUTE_MAX) {
      return {
        valid: false,
        total,
        error: `Chỉ số khởi tạo ${k.toUpperCase()}=${val} nằm ngoài phạm vi hợp lệ [${INITIAL_ATTRIBUTE_MIN}..${INITIAL_ATTRIBUTE_MAX}].`,
      };
    }
    total += val;
  }
  if (total < INITIAL_ATTRIBUTE_TOTAL_MIN || total > INITIAL_ATTRIBUTE_TOTAL_MAX) {
    return {
      valid: false,
      total,
      error: `Tổng điểm khởi tạo (${total}) nằm ngoài phạm vi [${INITIAL_ATTRIBUTE_TOTAL_MIN}..${INITIAL_ATTRIBUTE_TOTAL_MAX}].`,
    };
  }
  return { valid: true, total };
}

/**
 * Detects whether a character creation payload attempted to submit client-side base/initial attributes.
 */
export function hasClientSubmittedInitialAttributes(payload: any): boolean {
  if (!payload || typeof payload !== 'object') return false;
  return Boolean(
    payload.stats !== undefined ||
      payload.baseStats !== undefined ||
      payload.attributes !== undefined ||
      payload.initialAttributes !== undefined
  );
}

// ==========================================
// PHASE 2: JOB-SPECIFIC HP & MP REGENERATION
// ==========================================

export const BASE_JOB_REGEN_PROFILES: Record<ClassId, JobRegenProfile> = {
  adventurer: {
    jobId: 'adventurer',
    isAdvancedJob: false,
    hpRegenPctPerSec: 1.15,
    mpRegenPctPerSec: 0.60,
    descriptionVi: 'Tân Thủ cân bằng hồi phục sinh lực và ma lực cơ bản.',
  },
  novice: {
    jobId: 'novice',
    isAdvancedJob: false,
    hpRegenPctPerSec: 1.15,
    mpRegenPctPerSec: 0.60,
    descriptionVi: 'Tân Thủ cân bằng hồi phục sinh lực và ma lực cơ bản.',
  },
  swordsman: {
    jobId: 'swordsman',
    isAdvancedJob: false,
    hpRegenPctPerSec: 1.20,
    mpRegenPctPerSec: 0.45,
    descriptionVi: 'Kiếm Sĩ tiền tuyến hồi HP 1.20%/s và MP 0.45%/s.',
  },
  spearman: {
    jobId: 'spearman',
    isAdvancedJob: false,
    hpRegenPctPerSec: 1.10,
    mpRegenPctPerSec: 0.50,
    descriptionVi: 'Thương Thủ cơ động hồi HP 1.10%/s và MP 0.50%/s.',
  },
  knight: {
    jobId: 'knight',
    isAdvancedJob: false,
    hpRegenPctPerSec: 1.60,
    mpRegenPctPerSec: 0.55,
    descriptionVi: 'Kỵ Sĩ hộ vệ thể chất cao hồi HP 1.60%/s và MP 0.55%/s.',
  },
  priest: {
    jobId: 'priest',
    isAdvancedJob: false,
    hpRegenPctPerSec: 0.90,
    mpRegenPctPerSec: 1.10,
    descriptionVi: 'Tu Sĩ / Linh Mục thánh quang hồi HP 0.90%/s và MP 1.10%/s.',
  },
  monk: {
    jobId: 'monk',
    isAdvancedJob: false,
    hpRegenPctPerSec: 0.90,
    mpRegenPctPerSec: 1.10,
    descriptionVi: 'Tu Sĩ / Linh Mục thánh quang hồi HP 0.90%/s và MP 1.10%/s.',
  },
  mage: {
    jobId: 'mage',
    isAdvancedJob: false,
    hpRegenPctPerSec: 0.80,
    mpRegenPctPerSec: 0.70,
    descriptionVi: 'Pháp Sư nguyên tố hồi HP 0.80%/s và MP 0.70%/s.',
  },
  assassin: {
    jobId: 'assassin',
    isAdvancedJob: false,
    hpRegenPctPerSec: 0.95,
    mpRegenPctPerSec: 0.55,
    descriptionVi: 'Sát Thủ ẩn ảnh hồi HP 0.95%/s và MP 0.55%/s.',
  },
  fighter: {
    jobId: 'fighter',
    isAdvancedJob: false,
    hpRegenPctPerSec: 1.30,
    mpRegenPctPerSec: 0.50,
    descriptionVi: 'Quyền Sư nội công hồi HP 1.30%/s và MP 0.50%/s.',
  },
  archer: {
    jobId: 'archer',
    isAdvancedJob: false,
    hpRegenPctPerSec: 1.00,
    mpRegenPctPerSec: 0.60,
    descriptionVi: 'Cung Thủ tầm xa hồi HP 1.00%/s và MP 0.60%/s.',
  },
};

export const ADVANCED_JOB_REGEN_PROFILES: Record<AdvancedJobId, JobRegenProfile> = {
  sword_saint: {
    jobId: 'sword_saint',
    isAdvancedJob: true,
    parentClassId: 'swordsman',
    hpRegenPctPerSec: 1.35,
    mpRegenPctPerSec: 0.58,
    descriptionVi: 'Kiếm Thánh tinh thông kiếm tâm, tăng tốc độ hồi kiếm khí.',
  },
  berserker: {
    jobId: 'berserker',
    isAdvancedJob: true,
    parentClassId: 'swordsman',
    hpRegenPctPerSec: 1.55,
    mpRegenPctPerSec: 0.48,
    combatHpMultiplierOverride: 0.45,
    descriptionVi: 'Cuồng Chiến Sĩ huyết chiến hồi sinh lực mạnh mẽ ngay cả khi giao tranh.',
  },
  dragoon: {
    jobId: 'dragoon',
    isAdvancedJob: true,
    parentClassId: 'spearman',
    hpRegenPctPerSec: 1.25,
    mpRegenPctPerSec: 0.62,
    descriptionVi: 'Long Kỵ Thương hồi phục linh lực xung kích nhanh.',
  },
  warlancer: {
    jobId: 'warlancer',
    isAdvancedJob: true,
    parentClassId: 'spearman',
    hpRegenPctPerSec: 1.38,
    mpRegenPctPerSec: 0.55,
    descriptionVi: 'Chiến Thương Tướng quân đoàn bền bỉ giữ trận địa.',
  },
  paladin: {
    jobId: 'paladin',
    isAdvancedJob: true,
    parentClassId: 'knight',
    hpRegenPctPerSec: 1.75,
    mpRegenPctPerSec: 0.72,
    descriptionVi: 'Thánh Kỵ Sĩ kết hợp thể chất thép và thánh ân hồi phục.',
  },
  guardian: {
    jobId: 'guardian',
    isAdvancedJob: true,
    parentClassId: 'knight',
    hpRegenPctPerSec: 1.95,
    mpRegenPctPerSec: 0.60,
    combatHpMultiplierOverride: 0.50,
    descriptionVi: 'Hộ Vệ Thần Thuẫn có tốc độ hồi HP tự nhiên cao nhất toàn cõi Elysia.',
  },
  saint: {
    jobId: 'saint',
    isAdvancedJob: true,
    parentClassId: 'monk',
    hpRegenPctPerSec: 1.08,
    mpRegenPctPerSec: 1.35,
    descriptionVi: 'Thánh Nữ / Thánh Hiền có nguồn thánh lực dồi dào nhất (1.35% MP/s).',
  },
  exorcist: {
    jobId: 'exorcist',
    isAdvancedJob: true,
    parentClassId: 'monk',
    hpRegenPctPerSec: 1.02,
    mpRegenPctPerSec: 1.22,
    descriptionVi: 'Trừ Tà Sư cân bằng chú ấn hàng ma và hồi phục linh lực.',
  },
  elementalist: {
    jobId: 'elementalist',
    isAdvancedJob: true,
    parentClassId: 'mage',
    hpRegenPctPerSec: 0.90,
    mpRegenPctPerSec: 0.92,
    descriptionVi: 'Nguyên Tố Sư cộng hưởng tự nhiên tăng tốc tụ ma lực.',
  },
  arcanist: {
    jobId: 'arcanist',
    isAdvancedJob: true,
    parentClassId: 'mage',
    hpRegenPctPerSec: 0.88,
    mpRegenPctPerSec: 0.98,
    descriptionVi: 'Bí Thuật Sư tinh thông cổ ngữ ma pháp vòng tròn.',
  },
  shadowblade: {
    jobId: 'shadowblade',
    isAdvancedJob: true,
    parentClassId: 'assassin',
    hpRegenPctPerSec: 1.10,
    mpRegenPctPerSec: 0.66,
    descriptionVi: 'Ảnh Nhận Sát Thủ hồi phục nhanh sau mỗi đòn kết liễu.',
  },
  phantom: {
    jobId: 'phantom',
    isAdvancedJob: true,
    parentClassId: 'assassin',
    hpRegenPctPerSec: 1.05,
    mpRegenPctPerSec: 0.72,
    descriptionVi: 'Ảo Ảnh Sư duy trì năng lượng phân thân liên tục.',
  },
  martial_artist: {
    jobId: 'martial_artist',
    isAdvancedJob: true,
    parentClassId: 'fighter',
    hpRegenPctPerSec: 1.50,
    mpRegenPctPerSec: 0.62,
    sittingBonusMultiplier: 2.15,
    descriptionVi: 'Võ Thần điều tức nội khí giúp thiền định hồi phục vượt trội.',
  },
  duelist: {
    jobId: 'duelist',
    isAdvancedJob: true,
    parentClassId: 'fighter',
    hpRegenPctPerSec: 1.40,
    mpRegenPctPerSec: 0.65,
    descriptionVi: 'Quyết Đấu Gia duy trì nhịp thở liên hoàn phản kích.',
  },
  sniper: {
    jobId: 'sniper',
    isAdvancedJob: true,
    parentClassId: 'archer',
    hpRegenPctPerSec: 1.12,
    mpRegenPctPerSec: 0.72,
    descriptionVi: 'Xạ Thủ Tuyệt Đối tĩnh tâm ngắm bắn ổn định.',
  },
  ranger: {
    jobId: 'ranger',
    isAdvancedJob: true,
    parentClassId: 'archer',
    hpRegenPctPerSec: 1.18,
    mpRegenPctPerSec: 0.70,
    descriptionVi: 'Tuần Lâm Gia thích nghi sinh tồn giữa rừng rậm.',
  },
};

export const DEFAULT_REGEN_STATE_CONFIG: RegenStateMultipliersConfig = {
  inCombatHpMultiplier: 0.35,
  inCombatMpMultiplier: 0.50,
  outOfCombatDelayMs: 5000,
  outOfCombatHpMultiplier: 1.0,
  outOfCombatMpMultiplier: 1.0,
  sittingHpMultiplier: 1.80,
  sittingMpMultiplier: 1.90,
  bossAreaMultiplier: 0.60,
  pvpAreaMultiplier: 0.50,
  safeZoneMultiplier: 1.35,
  maxConsumableRegenStackCount: 2,
  maxTotalHpRegenPctCapPerSec: 8.0,
  maxTotalMpRegenPctCapPerSec: 6.0,
  minTickIntervalMs: 500,
};

export function resolveJobRegenProfile(
  classId?: ClassId | string | null,
  advancedJobId?: AdvancedJobId | string | null
): JobRegenProfile {
  if (advancedJobId && (ADVANCED_JOB_REGEN_PROFILES as Record<string, JobRegenProfile>)[advancedJobId]) {
    return (ADVANCED_JOB_REGEN_PROFILES as Record<string, JobRegenProfile>)[advancedJobId];
  }
  const key = (classId || 'adventurer') as ClassId;
  return BASE_JOB_REGEN_PROFILES[key] || BASE_JOB_REGEN_PROFILES.adventurer;
}

export function resolveRegenerationState(params: {
  lastCombatActionAt?: number;
  nowMs?: number;
  isSitting?: boolean;
  activeConsumableStacks?: number;
  config?: Partial<RegenStateMultipliersConfig>;
}): RegenerationState {
  const now = params.nowMs ?? Date.now();
  const delay = Math.max(1000, Number(params.config?.outOfCombatDelayMs ?? DEFAULT_REGEN_STATE_CONFIG.outOfCombatDelayMs));
  const lastCombat = Number(params.lastCombatActionAt || 0);
  const inCombat = lastCombat > 0 && now - lastCombat < delay;

  if (inCombat) return 'in_combat';
  if (params.isSitting) return 'sitting';
  if (Number(params.activeConsumableStacks || 0) > 0) return 'item_recovery';
  return 'out_of_combat';
}

export function computeCharacterRegenTick(params: {
  classId?: ClassId | string | null;
  advancedJobId?: AdvancedJobId | string | null;
  currentHp: number;
  maxHp: number;
  currentMp: number;
  maxMp: number;
  deltaSeconds?: number;
  lastCombatActionAt?: number;
  nowMs?: number;
  isSitting?: boolean;
  areaContext?: RegenerationAreaContext;
  consumableRegenStacks?: Array<{ hpPctPerSec?: number; mpPctPerSec?: number; hpFlatPerSec?: number; mpFlatPerSec?: number }>;
  buffRegenBonusPct?: { hpPctPerSec?: number; mpPctPerSec?: number };
  config?: Partial<RegenStateMultipliersConfig>;
}): {
  state: RegenerationState;
  areaContext: RegenerationAreaContext;
  profile: JobRegenProfile;
  effectiveHpPctPerSec: number;
  effectiveMpPctPerSec: number;
  hpRecovered: number;
  mpRecovered: number;
  nextHp: number;
  nextMp: number;
  appliedConsumableStacks: number;
} {
  const cfg: RegenStateMultipliersConfig = {
    ...DEFAULT_REGEN_STATE_CONFIG,
    ...(params.config || {}),
  };
  const profile = resolveJobRegenProfile(params.classId, params.advancedJobId);
  const safeMaxHp = Math.max(1, Math.floor(Number(params.maxHp || 1)));
  const safeMaxMp = Math.max(1, Math.floor(Number(params.maxMp || 1)));
  const safeCurHp = Math.max(0, Math.min(safeMaxHp, Math.floor(Number(params.currentHp || 0))));
  const safeCurMp = Math.max(0, Math.min(safeMaxMp, Math.floor(Number(params.currentMp || 0))));
  const dt = Math.max(0, Math.min(10, Number(params.deltaSeconds ?? 1)));

  const stacks = Array.isArray(params.consumableRegenStacks) ? params.consumableRegenStacks : [];
  const appliedStacks = stacks.slice(0, cfg.maxConsumableRegenStackCount);

  const state = resolveRegenerationState({
    lastCombatActionAt: params.lastCombatActionAt,
    nowMs: params.nowMs,
    isSitting: params.isSitting,
    activeConsumableStacks: appliedStacks.length,
    config: cfg,
  });

  // Dead characters cannot regenerate passively
  if (safeCurHp <= 0) {
    return {
      state,
      areaContext: params.areaContext || 'normal',
      profile,
      effectiveHpPctPerSec: 0,
      effectiveMpPctPerSec: 0,
      hpRecovered: 0,
      mpRecovered: 0,
      nextHp: 0,
      nextMp: safeCurMp,
      appliedConsumableStacks: 0,
    };
  }

  let stateHpMult = cfg.outOfCombatHpMultiplier;
  let stateMpMult = cfg.outOfCombatMpMultiplier;
  if (state === 'in_combat') {
    stateHpMult = profile.combatHpMultiplierOverride ?? cfg.inCombatHpMultiplier;
    stateMpMult = profile.combatMpMultiplierOverride ?? cfg.inCombatMpMultiplier;
  } else if (state === 'sitting') {
    stateHpMult = profile.sittingBonusMultiplier ?? cfg.sittingHpMultiplier;
    stateMpMult = cfg.sittingMpMultiplier;
  }

  const area = params.areaContext || 'normal';
  let areaMult = 1.0;
  if (area === 'boss_arena') areaMult = cfg.bossAreaMultiplier;
  else if (area === 'pvp_arena') areaMult = cfg.pvpAreaMultiplier;
  else if (area === 'safe_zone') areaMult = cfg.safeZoneMultiplier;

  let itemHpPct = 0;
  let itemMpPct = 0;
  let itemHpFlat = 0;
  let itemMpFlat = 0;
  for (const st of appliedStacks) {
    itemHpPct += Math.max(0, Number(st.hpPctPerSec || 0));
    itemMpPct += Math.max(0, Number(st.mpPctPerSec || 0));
    itemHpFlat += Math.max(0, Number(st.hpFlatPerSec || 0));
    itemMpFlat += Math.max(0, Number(st.mpFlatPerSec || 0));
  }

  const buffHpPct = Math.max(0, Number(params.buffRegenBonusPct?.hpPctPerSec || 0));
  const buffMpPct = Math.max(0, Number(params.buffRegenBonusPct?.mpPctPerSec || 0));

  const rawHpPctPerSec = Math.max(0, profile.hpRegenPctPerSec * stateHpMult * areaMult + itemHpPct + buffHpPct);
  const rawMpPctPerSec = Math.max(0, profile.mpRegenPctPerSec * stateMpMult * areaMult + itemMpPct + buffMpPct);

  const effectiveHpPctPerSec = Number(Math.min(cfg.maxTotalHpRegenPctCapPerSec, rawHpPctPerSec).toFixed(4));
  const effectiveMpPctPerSec = Number(Math.min(cfg.maxTotalMpRegenPctCapPerSec, rawMpPctPerSec).toFixed(4));

  const rawHpDelta = ((safeMaxHp * effectiveHpPctPerSec) / 100 + itemHpFlat) * dt;
  const rawMpDelta = ((safeMaxMp * effectiveMpPctPerSec) / 100 + itemMpFlat) * dt;

  const hpGain = safeCurHp < safeMaxHp ? Math.max(1, Math.round(rawHpDelta)) : 0;
  const mpGain = safeCurMp < safeMaxMp ? Math.max(1, Math.round(rawMpDelta)) : 0;

  const nextHp = Math.max(0, Math.min(safeMaxHp, safeCurHp + hpGain));
  const nextMp = Math.max(0, Math.min(safeMaxMp, safeCurMp + mpGain));

  return {
    state,
    areaContext: area,
    profile,
    effectiveHpPctPerSec,
    effectiveMpPctPerSec,
    hpRecovered: nextHp - safeCurHp,
    mpRecovered: nextMp - safeCurMp,
    nextHp,
    nextMp,
    appliedConsumableStacks: appliedStacks.length,
  };
}

// ==========================================
// PHASE 3, 4 & 5: WEAPON-AWARE SKILL ANIMATION, ADVANCED SIGNATURES & TIMELINE
// ==========================================

export const ALL_8_DIRECTIONS: SkillDirectionCode[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

interface ClassAnimTemplate {
  requiredWeaponTypes: WeaponType[];
  cast_animation: string;
  hand_pose: string;
  weapon_pose: string;
  release_frame: number;
  projectile_origin: SkillAnimationMetadata['projectile_origin'];
  attack_trail: SkillAnimationMetadata['attack_trail'];
  impact_frame: number;
  impact_vfx: string;
  hit_reaction: SkillAnimationMetadata['hit_reaction'];
  recovery_animation: string;
  animation_speed: number;
  total_frames: number;
}

export const BASE_JOB_ANIMATION_TEMPLATES: Record<ClassId, ClassAnimTemplate> = {
  adventurer: {
    requiredWeaponTypes: ['sword', 'dagger', 'staff'],
    cast_animation: 'novice_slash_cast',
    hand_pose: 'one_hand_grip',
    weapon_pose: 'diagonal_ready_slash',
    release_frame: 3,
    projectile_origin: { anchor: 'weapon_tip', offsetX: 22, offsetY: -18 },
    attack_trail: { enabled: true, attachTo: 'weapon_origin', style: 'novice_crescent', colorHex: '#f8fafc', startFrame: 2, endFrame: 5 },
    impact_frame: 4,
    impact_vfx: 'vfx_slash',
    hit_reaction: 'flinch',
    recovery_animation: 'novice_guard_recover',
    animation_speed: 1.0,
    total_frames: 8,
  },
  novice: {
    requiredWeaponTypes: ['sword', 'dagger', 'staff'],
    cast_animation: 'novice_slash_cast',
    hand_pose: 'one_hand_grip',
    weapon_pose: 'diagonal_ready_slash',
    release_frame: 3,
    projectile_origin: { anchor: 'weapon_tip', offsetX: 22, offsetY: -18 },
    attack_trail: { enabled: true, attachTo: 'weapon_origin', style: 'novice_crescent', colorHex: '#f8fafc', startFrame: 2, endFrame: 5 },
    impact_frame: 4,
    impact_vfx: 'vfx_slash',
    hit_reaction: 'flinch',
    recovery_animation: 'novice_guard_recover',
    animation_speed: 1.0,
    total_frames: 8,
  },
  swordsman: {
    requiredWeaponTypes: ['sword', 'greatsword'],
    cast_animation: 'swordsman_sword_slash_thrust_spin_aura_wave',
    hand_pose: 'two_hand_hilt_channel',
    weapon_pose: 'sword_slash_thrust_spin_aura_ready',
    release_frame: 4,
    projectile_origin: { anchor: 'weapon_tip', offsetX: 28, offsetY: -22 },
    attack_trail: { enabled: true, attachTo: 'weapon_origin', style: 'sword_energy_wave_arc', colorHex: '#38bdf8', startFrame: 3, endFrame: 6 },
    impact_frame: 5,
    impact_vfx: 'vfx_slash',
    hit_reaction: 'stagger',
    recovery_animation: 'swordsman_sheathe_recover',
    animation_speed: 1.1,
    total_frames: 8,
  },
  spearman: {
    requiredWeaponTypes: ['spear', 'halberd', 'lance'],
    cast_animation: 'spearman_two_handed_thrust_sweep_spin_charge',
    hand_pose: 'two_handed_shaft_brace',
    weapon_pose: 'spear_piercing_charge_extension',
    release_frame: 3,
    projectile_origin: { anchor: 'weapon_tip', offsetX: 38, offsetY: -20 },
    attack_trail: { enabled: true, attachTo: 'spear_tip', style: 'spear_sweep_spiral', colorHex: '#2dd4bf', startFrame: 2, endFrame: 6 },
    impact_frame: 4,
    impact_vfx: 'vfx_spear_thrust',
    hit_reaction: 'knockback',
    recovery_animation: 'spearman_polearm_retract',
    animation_speed: 1.15,
    total_frames: 8,
  },
  knight: {
    requiredWeaponTypes: ['sword', 'shield'],
    cast_animation: 'knight_sword_shield_block_bash_protection_holy',
    hand_pose: 'mainhand_sword_offhand_aegis_brace',
    weapon_pose: 'shield_bash_and_holy_blade_guard',
    release_frame: 4,
    projectile_origin: { anchor: 'offhand', offsetX: 20, offsetY: -16 },
    attack_trail: { enabled: true, attachTo: 'weapon_origin', style: 'holy_aegis_ribbon', colorHex: '#facc15', startFrame: 3, endFrame: 6 },
    impact_frame: 5,
    impact_vfx: 'vfx_holy_shield',
    hit_reaction: 'knockback',
    recovery_animation: 'knight_fortress_stance_recover',
    animation_speed: 1.0,
    total_frames: 8,
  },
  priest: {
    requiredWeaponTypes: ['staff', 'holy_staff', 'book'],
    cast_animation: 'priest_staff_two_hand_holy_open_hand_healing_seal',
    hand_pose: 'two_hand_holy_prayer_and_open_hand_blessing',
    weapon_pose: 'holy_staff_aloft_resonance',
    release_frame: 4,
    projectile_origin: { anchor: 'staff_gem', offsetX: 16, offsetY: -34 },
    attack_trail: { enabled: true, attachTo: 'weapon_origin', style: 'holy_seal_halo', colorHex: '#fde047', startFrame: 2, endFrame: 6 },
    impact_frame: 5,
    impact_vfx: 'vfx_divine_heal',
    hit_reaction: 'holy_blind',
    recovery_animation: 'priest_serene_bow_recover',
    animation_speed: 1.0,
    total_frames: 8,
  },
  monk: {
    requiredWeaponTypes: ['staff', 'holy_staff', 'book'],
    cast_animation: 'priest_staff_two_hand_holy_open_hand_healing_seal',
    hand_pose: 'two_hand_holy_prayer_and_open_hand_blessing',
    weapon_pose: 'holy_staff_aloft_resonance',
    release_frame: 4,
    projectile_origin: { anchor: 'staff_gem', offsetX: 16, offsetY: -34 },
    attack_trail: { enabled: true, attachTo: 'weapon_origin', style: 'holy_seal_halo', colorHex: '#fde047', startFrame: 2, endFrame: 6 },
    impact_frame: 5,
    impact_vfx: 'vfx_divine_heal',
    hit_reaction: 'holy_blind',
    recovery_animation: 'priest_serene_bow_recover',
    animation_speed: 1.0,
    total_frames: 8,
  },
  mage: {
    requiredWeaponTypes: ['staff', 'spellbook', 'book'],
    cast_animation: 'mage_hand_staff_spellbook_elemental_fire_ice_lightning',
    hand_pose: 'arcane_hand_weave_and_spellbook_levitation',
    weapon_pose: 'elemental_staff_orb_channel',
    release_frame: 5,
    projectile_origin: { anchor: 'staff_gem', offsetX: 24, offsetY: -32 },
    attack_trail: { enabled: true, attachTo: 'weapon_origin', style: 'elemental_tri_orbit', colorHex: '#a855f7', startFrame: 3, endFrame: 6 },
    impact_frame: 6,
    impact_vfx: 'vfx_fireball',
    hit_reaction: 'electrocute',
    recovery_animation: 'mage_arcane_float_recover',
    animation_speed: 1.05,
    total_frames: 8,
  },
  assassin: {
    requiredWeaponTypes: ['dual_daggers', 'dagger'],
    cast_animation: 'assassin_dual_dagger_backstab_cross_slash_shadow_dash_stealth',
    hand_pose: 'reverse_twin_dagger_grip',
    weapon_pose: 'cross_slash_and_backstab_lunge',
    release_frame: 2,
    projectile_origin: { anchor: 'weapon_tip', offsetX: 24, offsetY: -14 },
    attack_trail: { enabled: true, attachTo: 'dual_weapon_origin', style: 'twin_shadow_x_slash', colorHex: '#c084fc', startFrame: 2, endFrame: 5 },
    impact_frame: 3,
    impact_vfx: 'vfx_shadow_slash',
    hit_reaction: 'flinch',
    recovery_animation: 'assassin_stealth_crouch_recover',
    animation_speed: 1.35,
    total_frames: 8,
  },
  fighter: {
    requiredWeaponTypes: ['gauntlets', 'fist'],
    cast_animation: 'fighter_punch_kick_gauntlet_combo_chi_burst',
    hand_pose: 'clinched_chi_gauntlet_guard',
    weapon_pose: 'flurry_punch_and_roundhouse_kick',
    release_frame: 3,
    projectile_origin: { anchor: 'palm', offsetX: 26, offsetY: -18 },
    attack_trail: { enabled: true, attachTo: 'gauntlet_arc', style: 'golden_chi_shockwave', colorHex: '#f97316', startFrame: 2, endFrame: 5 },
    impact_frame: 4,
    impact_vfx: 'vfx_chi_fist',
    hit_reaction: 'launch',
    recovery_animation: 'fighter_chamber_fist_recover',
    animation_speed: 1.25,
    total_frames: 8,
  },
  archer: {
    requiredWeaponTypes: ['bow', 'crossbow'],
    cast_animation: 'archer_bow_draw_aim_arrow_release_multishot_rain',
    hand_pose: 'full_anchor_bowstring_draw',
    weapon_pose: 'elevated_longbow_sight_alignment',
    release_frame: 4,
    projectile_origin: { anchor: 'bow_string', offsetX: 30, offsetY: -22 },
    attack_trail: { enabled: true, attachTo: 'weapon_origin', style: 'wind_feather_wake', colorHex: '#4ade80', startFrame: 3, endFrame: 5 },
    impact_frame: 6,
    impact_vfx: 'vfx_arrow_rain',
    hit_reaction: 'flinch',
    recovery_animation: 'archer_bow_lower_recover',
    animation_speed: 1.2,
    total_frames: 8,
  },
};

export const ADVANCED_JOB_ANIMATION_SIGNATURES: Record<AdvancedJobId, ClassAnimTemplate & { parentClassId: FirstJobClassId }> = {
  sword_saint: {
    parentClassId: 'swordsman',
    requiredWeaponTypes: ['sword', 'greatsword'],
    cast_animation: 'sword_saint_refined_iaido_multislash_aura',
    hand_pose: 'precision_iaido_scabbard_draw',
    weapon_pose: 'celestial_sevenfold_blade_arc',
    release_frame: 3,
    projectile_origin: { anchor: 'weapon_tip', offsetX: 32, offsetY: -24 },
    attack_trail: { enabled: true, attachTo: 'weapon_origin', style: 'sword_saint_white_gold_crescent', colorHex: '#fef08a', startFrame: 2, endFrame: 6 },
    impact_frame: 4,
    impact_vfx: 'vfx_sword_combo',
    hit_reaction: 'launch',
    recovery_animation: 'sword_saint_lotus_sheathe',
    animation_speed: 1.30,
    total_frames: 8,
  },
  berserker: {
    parentClassId: 'swordsman',
    requiredWeaponTypes: ['greatsword', 'sword'],
    cast_animation: 'berserker_heavy_greatsword_overhead_cleave_quake',
    hand_pose: 'brutal_two_hand_over_shoulder_heft',
    weapon_pose: 'colossal_greatsword_earth_shatter',
    release_frame: 5,
    projectile_origin: { anchor: 'weapon_tip', offsetX: 36, offsetY: -12 },
    attack_trail: { enabled: true, attachTo: 'weapon_origin', style: 'berserker_crimson_jagged_tear', colorHex: '#ef4444', startFrame: 3, endFrame: 7 },
    impact_frame: 6,
    impact_vfx: 'vfx_crimson_cleave',
    hit_reaction: 'launch',
    recovery_animation: 'berserker_roar_reset',
    animation_speed: 0.95,
    total_frames: 8,
  },
  dragoon: {
    parentClassId: 'spearman',
    requiredWeaponTypes: ['spear', 'lance'],
    cast_animation: 'dragoon_sky_leap_supersonic_spear_dive',
    hand_pose: 'aerodynamic_twin_hand_lance_lock',
    weapon_pose: 'descending_dragon_fang_thrust',
    release_frame: 3,
    projectile_origin: { anchor: 'weapon_tip', offsetX: 42, offsetY: -28 },
    attack_trail: { enabled: true, attachTo: 'spear_tip', style: 'dragoon_lightning_helix', colorHex: '#38bdf8', startFrame: 2, endFrame: 6 },
    impact_frame: 4,
    impact_vfx: 'vfx_dragon_dive',
    hit_reaction: 'launch',
    recovery_animation: 'dragoon_landing_vault_recover',
    animation_speed: 1.35,
    total_frames: 8,
  },
  warlancer: {
    parentClassId: 'spearman',
    requiredWeaponTypes: ['halberd', 'spear', 'lance'],
    cast_animation: 'warlancer_phalanx_wide_halberd_formation_sweep',
    hand_pose: 'wide_fulcrum_halberd_leverage',
    weapon_pose: '360_phalanx_formation_cleave',
    release_frame: 4,
    projectile_origin: { anchor: 'weapon_tip', offsetX: 38, offsetY: -18 },
    attack_trail: { enabled: true, attachTo: 'spear_tip', style: 'warlancer_fortress_banner_arc', colorHex: '#f59e0b', startFrame: 3, endFrame: 7 },
    impact_frame: 5,
    impact_vfx: 'vfx_phalanx_sweep',
    hit_reaction: 'knockback',
    recovery_animation: 'warlancer_planted_standard_recover',
    animation_speed: 1.10,
    total_frames: 8,
  },
  paladin: {
    parentClassId: 'knight',
    requiredWeaponTypes: ['sword', 'shield'],
    cast_animation: 'paladin_sacred_sword_and_holy_shield_invocation',
    hand_pose: 'shield_cross_emblem_and_skyward_blade',
    weapon_pose: 'radiant_judgement_blade_descend',
    release_frame: 4,
    projectile_origin: { anchor: 'weapon_tip', offsetX: 26, offsetY: -30 },
    attack_trail: { enabled: true, attachTo: 'weapon_origin', style: 'paladin_sunlight_wings', colorHex: '#fde047', startFrame: 3, endFrame: 6 },
    impact_frame: 5,
    impact_vfx: 'vfx_holy_judgement',
    hit_reaction: 'holy_blind',
    recovery_animation: 'paladin_aegis_benediction_recover',
    animation_speed: 1.05,
    total_frames: 8,
  },
  guardian: {
    parentClassId: 'knight',
    requiredWeaponTypes: ['shield', 'sword'],
    cast_animation: 'guardian_immovable_bastion_shield_fortress_slam',
    hand_pose: 'double_braced_tower_shield_lock',
    weapon_pose: 'citadel_wall_tectonic_impact',
    release_frame: 4,
    projectile_origin: { anchor: 'offhand', offsetX: 24, offsetY: -14 },
    attack_trail: { enabled: true, attachTo: 'weapon_origin', style: 'guardian_octagon_shock_ring', colorHex: '#10b981', startFrame: 3, endFrame: 6 },
    impact_frame: 5,
    impact_vfx: 'vfx_bastion_dome',
    hit_reaction: 'knockback',
    recovery_animation: 'guardian_unbreakable_anchor_recover',
    animation_speed: 0.95,
    total_frames: 8,
  },
  saint: {
    parentClassId: 'monk',
    requiredWeaponTypes: ['holy_staff', 'staff', 'book'],
    cast_animation: 'saint_seraphic_chorus_levitating_benediction',
    hand_pose: 'open_arms_cathedral_light_embrace',
    weapon_pose: 'floating_seraph_staff_halo',
    release_frame: 4,
    projectile_origin: { anchor: 'staff_gem', offsetX: 18, offsetY: -38 },
    attack_trail: { enabled: true, attachTo: 'weapon_origin', style: 'saint_golden_feather_spiral', colorHex: '#fef9c3', startFrame: 2, endFrame: 6 },
    impact_frame: 5,
    impact_vfx: 'vfx_divine_heal',
    hit_reaction: 'holy_blind',
    recovery_animation: 'saint_feather_descent_recover',
    animation_speed: 1.05,
    total_frames: 8,
  },
  exorcist: {
    parentClassId: 'monk',
    requiredWeaponTypes: ['staff', 'holy_staff', 'book'],
    cast_animation: 'exorcist_offensive_purification_talismans_and_seal_array',
    hand_pose: 'two_finger_mantra_seal_projection',
    weapon_pose: 'judgement_khakkhara_staff_strike',
    release_frame: 3,
    projectile_origin: { anchor: 'palm', offsetX: 24, offsetY: -26 },
    attack_trail: { enabled: true, attachTo: 'weapon_origin', style: 'exorcist_purging_sigil_chain', colorHex: '#38bdf8', startFrame: 2, endFrame: 6 },
    impact_frame: 4,
    impact_vfx: 'vfx_exorcism_seal',
    hit_reaction: 'stagger',
    recovery_animation: 'exorcist_mudra_seal_recover',
    animation_speed: 1.15,
    total_frames: 8,
  },
  elementalist: {
    parentClassId: 'mage',
    requiredWeaponTypes: ['staff', 'spellbook'],
    cast_animation: 'elementalist_tri_element_cataclysm_convergence',
    hand_pose: 'twin_palm_fire_ice_lightning_vortex',
    weapon_pose: 'tempest_conductor_staff_surge',
    release_frame: 4,
    projectile_origin: { anchor: 'staff_gem', offsetX: 28, offsetY: -34 },
    attack_trail: { enabled: true, attachTo: 'weapon_origin', style: 'elementalist_prism_wake', colorHex: '#f97316', startFrame: 3, endFrame: 6 },
    impact_frame: 5,
    impact_vfx: 'vfx_fireball',
    hit_reaction: 'freeze',
    recovery_animation: 'elementalist_orb_reabsorb_recover',
    animation_speed: 1.15,
    total_frames: 8,
  },
  arcanist: {
    parentClassId: 'mage',
    requiredWeaponTypes: ['spellbook', 'staff', 'book'],
    cast_animation: 'arcanist_ancient_astrolabe_multi_ring_magic_circle',
    hand_pose: 'floating_grimoire_page_turn_glyph_draw',
    weapon_pose: 'cosmic_scepter_planar_alignment',
    release_frame: 5,
    projectile_origin: { anchor: 'sky', offsetX: 0, offsetY: -64 },
    attack_trail: { enabled: true, attachTo: 'weapon_origin', style: 'arcanist_constellation_ribbon', colorHex: '#818cf8', startFrame: 3, endFrame: 7 },
    impact_frame: 6,
    impact_vfx: 'vfx_arcane_nova',
    hit_reaction: 'electrocute',
    recovery_animation: 'arcanist_grimoire_snap_recover',
    animation_speed: 1.05,
    total_frames: 8,
  },
  shadowblade: {
    parentClassId: 'assassin',
    requiredWeaponTypes: ['dual_daggers', 'dagger'],
    cast_animation: 'shadowblade_abyssal_twin_fang_throat_sever',
    hand_pose: 'crossed_abyss_daggers_throat_lock',
    weapon_pose: 'umbral_x_execution_rip',
    release_frame: 2,
    projectile_origin: { anchor: 'weapon_tip', offsetX: 26, offsetY: -16 },
    attack_trail: { enabled: true, attachTo: 'dual_weapon_origin', style: 'shadowblade_void_crescent_pair', colorHex: '#9333ea', startFrame: 1, endFrame: 5 },
    impact_frame: 3,
    impact_vfx: 'vfx_shadow_slash',
    hit_reaction: 'stagger',
    recovery_animation: 'shadowblade_blood_flick_recover',
    animation_speed: 1.45,
    total_frames: 8,
  },
  phantom: {
    parentClassId: 'assassin',
    requiredWeaponTypes: ['dual_daggers', 'dagger'],
    cast_animation: 'phantom_mirage_afterimage_triple_clone_assault',
    hand_pose: 'spectral_mudra_and_hidden_blade_flick',
    weapon_pose: 'tri_directional_clone_convergence',
    release_frame: 2,
    projectile_origin: { anchor: 'chest', offsetX: 20, offsetY: -20 },
    attack_trail: { enabled: true, attachTo: 'dual_weapon_origin', style: 'phantom_afterimage_echo_ribbon', colorHex: '#22d3ee', startFrame: 1, endFrame: 6 },
    impact_frame: 4,
    impact_vfx: 'vfx_phantom_clone',
    hit_reaction: 'flinch',
    recovery_animation: 'phantom_smoke_dissolve_recover',
    animation_speed: 1.40,
    total_frames: 8,
  },
  martial_artist: {
    parentClassId: 'fighter',
    requiredWeaponTypes: ['gauntlets', 'fist'],
    cast_animation: 'martial_artist_eight_trigram_dragon_fist_kick_Barrage',
    hand_pose: 'flowing_dragon_claw_and_open_palm_strike',
    weapon_pose: 'heaven_shattering_ascendant_uppercut',
    release_frame: 3,
    projectile_origin: { anchor: 'palm', offsetX: 28, offsetY: -20 },
    attack_trail: { enabled: true, attachTo: 'gauntlet_arc', style: 'martial_artist_golden_dragon_spiral', colorHex: '#fbbf24', startFrame: 2, endFrame: 6 },
    impact_frame: 4,
    impact_vfx: 'vfx_chi_fist',
    hit_reaction: 'launch',
    recovery_animation: 'martial_artist_breath_seal_recover',
    animation_speed: 1.35,
    total_frames: 8,
  },
  duelist: {
    parentClassId: 'fighter',
    requiredWeaponTypes: ['gauntlets', 'fist', 'sword'],
    cast_animation: 'duelist_riposte_parry_and_blitz_counter_flurry',
    hand_pose: 'asymmetric_parry_guard_and_thrust_stance',
    weapon_pose: 'crimson_tempo_counter_strike',
    release_frame: 2,
    projectile_origin: { anchor: 'weapon_tip', offsetX: 28, offsetY: -18 },
    attack_trail: { enabled: true, attachTo: 'dual_weapon_origin', style: 'duelist_crimson_lightning_streak', colorHex: '#fb7185', startFrame: 2, endFrame: 5 },
    impact_frame: 3,
    impact_vfx: 'vfx_duelist_counter',
    hit_reaction: 'stagger',
    recovery_animation: 'duelist_flourish_salute_recover',
    animation_speed: 1.40,
    total_frames: 8,
  },
  sniper: {
    parentClassId: 'archer',
    requiredWeaponTypes: ['bow', 'crossbow'],
    cast_animation: 'sniper_kneeling_ballistic_overcharge_rail_shot',
    hand_pose: 'locked_cheek_weld_precision_release',
    weapon_pose: 'Siege_longbow_hyper_tension_draw',
    release_frame: 5,
    projectile_origin: { anchor: 'bow_string', offsetX: 36, offsetY: -22 },
    attack_trail: { enabled: true, attachTo: 'weapon_origin', style: 'sniper_azure_sonic_cone', colorHex: '#38bdf8', startFrame: 4, endFrame: 6 },
    impact_frame: 6,
    impact_vfx: 'vfx_sniper_pierce',
    hit_reaction: 'knockback',
    recovery_animation: 'sniper_recoil_stabilize_recover',
    animation_speed: 1.10,
    total_frames: 8,
  },
  ranger: {
    parentClassId: 'archer',
    requiredWeaponTypes: ['bow', 'crossbow'],
    cast_animation: 'ranger_acrobatic_multishot_snare_trap_and_arrow_storm',
    hand_pose: 'rapid_three_arrow_nock_fan',
    weapon_pose: 'skyward_volley_and_bramble_trap_toss',
    release_frame: 3,
    projectile_origin: { anchor: 'bow_string', offsetX: 30, offsetY: -26 },
    attack_trail: { enabled: true, attachTo: 'weapon_origin', style: 'ranger_emerald_sylvan_gust', colorHex: '#22c55e', startFrame: 2, endFrame: 6 },
    impact_frame: 5,
    impact_vfx: 'vfx_arrow_rain',
    hit_reaction: 'flinch',
    recovery_animation: 'ranger_evasive_backstep_recover',
    animation_speed: 1.30,
    total_frames: 8,
  },
};

const VERIFIED_STANDALONE_VFX_SHEETS = new Set([
  'vfx_slash',
  'vfx_sword_combo',
  'vfx_fireball',
  'vfx_divine_heal',
]);

/**
 * Resolves full Weapon-Aware & Advanced-Job-Aware SkillAnimationMetadata for any skill.
 */
export function resolveSkillAnimationMetadata(
  skill: Pick<SkillDefinition, 'id' | 'classId' | 'advancedBranchId' | 'vfxKey' | 'targetType' | 'projectile' | 'tier'>
): SkillAnimationMetadata {
  const advId = skill.advancedBranchId;
  const template =
    advId && ADVANCED_JOB_ANIMATION_SIGNATURES[advId]
      ? ADVANCED_JOB_ANIMATION_SIGNATURES[advId]
      : BASE_JOB_ANIMATION_TEMPLATES[skill.classId] || BASE_JOB_ANIMATION_TEMPLATES.adventurer;

  const isAdv = Boolean(advId && ADVANCED_JOB_ANIMATION_SIGNATURES[advId]);
  const vfxKey = skill.vfxKey || template.impact_vfx;
  const hasVerifiedStandaloneSheet = VERIFIED_STANDALONE_VFX_SHEETS.has(vfxKey);

  // Skill-specific refinements so every skill within a job has distinct timing/pose
  const idLower = String(skill.id || '').toLowerCase();
  let castAnim = `${template.cast_animation}__${idLower}`;
  let weaponPose = template.weapon_pose;
  let releaseFrame = template.release_frame;
  let impactFrame = template.impact_frame;

  if (idLower.includes('ult') || skill.tier === 'ultimate') {
    releaseFrame = Math.min(6, template.release_frame + 1);
    impactFrame = Math.min(7, releaseFrame + 1);
    weaponPose = `${template.weapon_pose}_ultimate_awakened`;
  } else if (idLower.includes('spin') || idLower.includes('whirl')) {
    weaponPose = `${template.weapon_pose}_360_spin`;
  } else if (idLower.includes('thrust') || idLower.includes('pierce') || idLower.includes('charge')) {
    weaponPose = `${template.weapon_pose}_piercing_lunge`;
  } else if (idLower.includes('shield') || idLower.includes('block') || idLower.includes('guard')) {
    weaponPose = `${template.weapon_pose}_aegis_fortify`;
  } else if (idLower.includes('heal') || idLower.includes('bless') || idLower.includes('sanctuary')) {
    weaponPose = `${template.weapon_pose}_sacred_circle`;
  } else if (idLower.includes('rain') || idLower.includes('volley') || idLower.includes('multishot')) {
    weaponPose = `${template.weapon_pose}_sky_arc_volley`;
  }

  return {
    skillId: skill.id,
    jobId: (advId || skill.classId) as ClassId | AdvancedJobId,
    isAdvancedJob: isAdv,
    parentClassId: isAdv ? ADVANCED_JOB_ANIMATION_SIGNATURES[advId!].parentClassId : undefined,
    requiredWeaponTypes: [...template.requiredWeaponTypes],
    cast_animation: castAnim,
    hand_pose: template.hand_pose,
    weapon_pose: weaponPose,
    release_frame: releaseFrame,
    projectile_origin: { ...template.projectile_origin },
    attack_trail: { ...template.attack_trail },
    impact_frame: impactFrame,
    impact_vfx: vfxKey,
    hit_reaction: template.hit_reaction,
    recovery_animation: template.recovery_animation,
    direction_support: [...ALL_8_DIRECTIONS],
    animation_speed: template.animation_speed,
    total_frames: template.total_frames,
    assetStatus: hasVerifiedStandaloneSheet ? 'verified_sheet' : 'fallback_procedural_sheet',
    fallbackAnimationKey: hasVerifiedStandaloneSheet
      ? undefined
      : `shared_8x7_char_sheet_row_${skill.tier === 'basic' || skill.tier === 'starter' ? 'attack_row3' : 'skill_row4'}+procedural_vfx_${vfxKey}`,
    missingAssetRequirement: hasVerifiedStandaloneSheet
      ? undefined
      : `Requires dedicated 8-direction weapon-specific sprite sheet /assets/elysia/vfx/${vfxKey}_8dir.png (2048x2048 RGBA); currently using verified 8x7 character base sheet + procedural weapon/VFX layer fallback.`,
  };
}

/**
 * Enforces Phase 3 rule: Never allow a projectile to spawn before the proper release_frame.
 */
export function canSpawnProjectileAtFrame(meta: SkillAnimationMetadata, currentFrame: number): boolean {
  return Math.floor(currentFrame) >= meta.release_frame;
}

/**
 * Enforces Phase 3 rule: Synchronize damage hit frames with animation frames.
 */
export function isDamageFrameReached(meta: SkillAnimationMetadata, currentFrame: number): boolean {
  return Math.floor(currentFrame) >= meta.impact_frame;
}

/**
 * Builds the Phase 5 synchronized data-driven animation & VFX timeline.
 */
export function buildSkillExecutionTimeline(
  meta: SkillAnimationMetadata,
  direction: SkillDirectionCode = 'S',
  qualityMode: 'high' | 'low' = 'high'
): SkillExecutionTimeline {
  const baseFrameDurationMs = Math.round(90 / Math.max(0.5, meta.animation_speed));
  const totalDurationMs = meta.total_frames * baseFrameDurationMs;
  const releaseTimeMs = meta.release_frame * baseFrameDurationMs;
  const impactTimeMs = meta.impact_frame * baseFrameDurationMs;
  const particleBudget = qualityMode === 'low' ? 8 : 28;

  return {
    skillId: meta.skillId,
    jobId: meta.jobId,
    direction,
    qualityMode,
    totalFrames: meta.total_frames,
    totalDurationMs,
    releaseFrame: meta.release_frame,
    releaseTimeMs,
    impactFrame: meta.impact_frame,
    impactTimeMs,
    particleBudget,
    events: [
      {
        phase: 'cast_start',
        frame: 0,
        timeMs: 0,
        description: `Start ${meta.cast_animation} facing ${direction}`,
      },
      {
        phase: 'character_pose',
        frame: 1,
        timeMs: baseFrameDurationMs,
        description: `Apply hand pose ${meta.hand_pose}`,
      },
      {
        phase: 'weapon_pose',
        frame: Math.max(1, meta.attack_trail.startFrame),
        timeMs: Math.max(1, meta.attack_trail.startFrame) * baseFrameDurationMs,
        description: `Align weapon pose ${meta.weapon_pose} & attach trail to ${meta.attack_trail.attachTo}`,
        attachAnchor: meta.attack_trail.attachTo,
      },
      {
        phase: 'particle_spawn',
        frame: Math.max(1, meta.release_frame - 1),
        timeMs: Math.max(1, meta.release_frame - 1) * baseFrameDurationMs,
        description: `Spawn cast particles (budget=${particleBudget})`,
      },
      {
        phase: 'projectile_release',
        frame: meta.release_frame,
        timeMs: releaseTimeMs,
        description: `Release projectile / wave from ${meta.projectile_origin.anchor} (${meta.projectile_origin.offsetX},${meta.projectile_origin.offsetY})`,
        attachAnchor: meta.projectile_origin.anchor,
      },
      {
        phase: 'damage_frame',
        frame: meta.impact_frame,
        timeMs: impactTimeMs,
        description: `Server-synchronized damage frame hit validation`,
      },
      {
        phase: 'hit_reaction',
        frame: meta.impact_frame,
        timeMs: impactTimeMs,
        description: `Trigger target hit reaction: ${meta.hit_reaction}`,
      },
      {
        phase: 'impact_effect',
        frame: meta.impact_frame,
        timeMs: impactTimeMs,
        description: `Spawn impact VFX ${meta.impact_vfx}`,
      },
      {
        phase: 'recovery',
        frame: meta.total_frames - 1,
        timeMs: totalDurationMs,
        description: `Return to idle via ${meta.recovery_animation} and recycle pooled particles`,
      },
    ],
  };
}

export function getSkillAnimationAssetAuditReport(skills: SkillDefinition[]): {
  totalSkillsAudited: number;
  verifiedStandaloneSheetCount: number;
  fallbackProceduralSheetCount: number;
  missingAssetsDocumented: Array<{
    skillId: string;
    jobId: string;
    vfxKey: string;
    fallbackAnimationKey: string;
    missingAssetRequirement: string;
  }>;
} {
  let verifiedCount = 0;
  let fallbackCount = 0;
  const missing: Array<{
    skillId: string;
    jobId: string;
    vfxKey: string;
    fallbackAnimationKey: string;
    missingAssetRequirement: string;
  }> = [];

  for (const s of skills) {
    const meta = s.animationMetadata || resolveSkillAnimationMetadata(s);
    if (meta.assetStatus === 'verified_sheet') {
      verifiedCount++;
    } else {
      fallbackCount++;
      missing.push({
        skillId: s.id,
        jobId: meta.jobId,
        vfxKey: meta.impact_vfx,
        fallbackAnimationKey: meta.fallbackAnimationKey || 'shared_8x7_char_sheet',
        missingAssetRequirement: meta.missingAssetRequirement || 'Dedicated 8-dir VFX sprite sheet required',
      });
    }
  }

  return {
    totalSkillsAudited: skills.length,
    verifiedStandaloneSheetCount: verifiedCount,
    fallbackProceduralSheetCount: fallbackCount,
    missingAssetsDocumented: missing,
  };
}

// ==========================================
// PHASE 6 & 7: MONSTER EXP BALANCING & ADMIN EXP CONFIGURATION LAYER
// ==========================================

export type RegionGateBucket = 'beginner' | 'east_gate' | 'west_gate' | 'south_gate' | 'north_gate';

export const REGION_GATE_CLASSIFICATION: Record<string, RegionGateBucket> = {
  THON_KHOI_NGUYEN: 'beginner',
  map_beginner_meadow: 'beginner',
  map_green_rabbit_forest: 'beginner',
  map_ancient_bee_forest: 'beginner',
  map_wild_wolf_valley: 'beginner',
  map_wild_boar_forest: 'beginner',
  map_goblin_outpost: 'beginner',
  map_goblin_cave: 'beginner',
  map_whispering_meadow: 'east_gate',
  map_crystal_cavern: 'east_gate',
  map_echo_valley: 'east_gate',
  map_storm_plateau: 'east_gate',
  map_emerald_marsh: 'west_gate',
  map_misty_bamboo_grove: 'west_gate',
  map_spirit_forest: 'west_gate',
  map_moonlit_lake: 'west_gate',
  map_sun_scorch_desert: 'south_gate',
  map_forgotten_ruins: 'south_gate',
  map_crimson_canyon: 'south_gate',
  map_molten_core_ridge: 'south_gate',
  map_frost_peak: 'north_gate',
  map_glacier_rift: 'north_gate',
  map_dragon_spine_ridge: 'north_gate',
  map_abyssal_citadel: 'north_gate',
};

export function resolveRegionGateBucket(regionId?: string | null): RegionGateBucket {
  if (!regionId) return 'beginner';
  if (REGION_GATE_CLASSIFICATION[regionId]) return REGION_GATE_CLASSIFICATION[regionId];
  const r = regionId.toLowerCase();
  if (r.includes('beginner') || r.includes('rabbit') || r.includes('bee') || r.includes('wolf') || r.includes('boar') || r.includes('goblin') || r.includes('thon_khoi')) {
    return 'beginner';
  }
  if (r.includes('frost') || r.includes('glacier') || r.includes('dragon') || r.includes('north') || r.includes('abyss')) {
    return 'north_gate';
  }
  if (r.includes('desert') || r.includes('ruins') || r.includes('crimson') || r.includes('molten') || r.includes('south')) {
    return 'south_gate';
  }
  if (r.includes('marsh') || r.includes('bamboo') || r.includes('spirit') || r.includes('moonlit') || r.includes('west')) {
    return 'west_gate';
  }
  return 'east_gate';
}

export const DEFAULT_ADMIN_EXP_CONFIG: ExpBalanceConfig = {
  enabled: true,
  expMultiplier: 1.0,
  globalMonsterExpMultiplier: 0.85,
  beginnerAreaMultiplier: 1.0,
  eastGateMultiplier: 1.0,
  westGateMultiplier: 1.0,
  southGateMultiplier: 1.0,
  northGateMultiplier: 1.0,
  bossMultiplier: 1.0,
  eliteMonsterMultiplier: 1.0,
  partyExpMultiplier: 1.15,
  eventExpMultiplier: 1.0,
  levelDifferenceMultiplier: 1.0,
  goldMultiplier: 1.0,
  dropRateMultiplier: 1.0,
  levelPenalty: {
    ...DEFAULT_LEVEL_PENALTY,
  },
};

export function validateAdminExpConfigInput(input: Partial<ExpBalanceConfig>): {
  valid: boolean;
  sanitized?: Partial<ExpBalanceConfig>;
  error?: string;
} {
  if (!input || typeof input !== 'object') {
    return { valid: false, error: 'Dữ liệu cấu hình EXP không hợp lệ.' };
  }
  const numericFields: (keyof ExpBalanceConfig)[] = [
    'expMultiplier',
    'globalMonsterExpMultiplier',
    'beginnerAreaMultiplier',
    'eastGateMultiplier',
    'westGateMultiplier',
    'southGateMultiplier',
    'northGateMultiplier',
    'bossMultiplier',
    'eliteMonsterMultiplier',
    'partyExpMultiplier',
    'eventExpMultiplier',
    'levelDifferenceMultiplier',
    'goldMultiplier',
    'dropRateMultiplier',
  ];

  const sanitized: Partial<ExpBalanceConfig> = {};
  if (input.enabled !== undefined) {
    sanitized.enabled = Boolean(input.enabled);
  }
  for (const field of numericFields) {
    if (input[field] !== undefined) {
      const val = Number(input[field]);
      if (!Number.isFinite(val) || val < 0.05 || val > 10.0) {
        return {
          valid: false,
          error: `Hệ số ${String(field)}=${input[field]} không hợp lệ (phải nằm trong khoảng [0.05 .. 10.0]).`,
        };
      }
      (sanitized as any)[field] = Number(val.toFixed(4));
    }
  }
  if (input.levelPenalty && typeof input.levelPenalty === 'object') {
    sanitized.levelPenalty = {
      ...DEFAULT_LEVEL_PENALTY,
      ...input.levelPenalty,
    };
  }
  return { valid: true, sanitized };
}

/**
 * Phase 6 & 7 Authoritative Monster EXP Formula:
 * EXP = BaseMonsterEXP × AdminMultiplier × LevelDifferenceMultiplier × EventMultiplier × PartyMultiplier
 * - Uses separate configuration layer without modifying original monster records.
 * - Initial globalMonsterExpMultiplier is 0.85 (15% base monster EXP reduction).
 * - Does not unintentionally reduce Boss rewards (bosses use bossMultiplier=1.0) or Quest rewards.
 * - Avoids duplicate multiplier application.
 */
export function computeMonsterKillExp(params: {
  baseMonsterExp: number;
  playerLevel: number;
  monsterLevel: number;
  regionId?: string;
  isBoss?: boolean;
  isElite?: boolean;
  partyMemberCount?: number;
  config?: Partial<ExpBalanceConfig>;
}): {
  baseMonsterExp: number;
  adminMultiplier: number;
  levelDifferenceMultiplier: number;
  eventMultiplier: number;
  partyMultiplier: number;
  totalPoolExp: number;
  perMemberExp: number;
  gateBucket: RegionGateBucket;
} {
  const cfg: ExpBalanceConfig = {
    ...DEFAULT_ADMIN_EXP_CONFIG,
    ...(params.config || {}),
    levelPenalty: {
      ...DEFAULT_ADMIN_EXP_CONFIG.levelPenalty,
      ...(params.config?.levelPenalty || {}),
    },
  };

  const baseMonsterExp = Math.max(0, Number(params.baseMonsterExp || 0));
  const gateBucket = resolveRegionGateBucket(params.regionId);
  const partyCount = Math.max(1, Math.floor(Number(params.partyMemberCount || 1)));

  if (baseMonsterExp === 0) {
    return {
      baseMonsterExp: 0,
      adminMultiplier: 1,
      levelDifferenceMultiplier: 1,
      eventMultiplier: 1,
      partyMultiplier: 1,
      totalPoolExp: 0,
      perMemberExp: 0,
      gateBucket,
    };
  }

  const isEnabled = cfg.enabled !== false;

  // 1. AdminMultiplier (Global + Gate + Category, without touching Boss rewards unintentionally)
  let gateMult = 1.0;
  if (gateBucket === 'beginner') gateMult = Number(cfg.beginnerAreaMultiplier ?? 1.0);
  else if (gateBucket === 'east_gate') gateMult = Number(cfg.eastGateMultiplier ?? 1.0);
  else if (gateBucket === 'west_gate') gateMult = Number(cfg.westGateMultiplier ?? 1.0);
  else if (gateBucket === 'south_gate') gateMult = Number(cfg.southGateMultiplier ?? 1.0);
  else if (gateBucket === 'north_gate') gateMult = Number(cfg.northGateMultiplier ?? 1.0);

  const legacyScale = Number(cfg.expMultiplier ?? 1.0);
  let categoryAndGlobalMult = Number(cfg.globalMonsterExpMultiplier ?? 0.85);
  if (params.isBoss) {
    // Do not unintentionally reduce boss rewards with normal monster 0.85 factor
    categoryAndGlobalMult = Number(cfg.bossMultiplier ?? 1.0);
  } else if (params.isElite) {
    categoryAndGlobalMult = categoryAndGlobalMult * Number(cfg.eliteMonsterMultiplier ?? 1.0);
  }

  const adminMultiplier = isEnabled
    ? Number(Math.max(0.05, categoryAndGlobalMult * gateMult * legacyScale).toFixed(4))
    : Number(Math.max(0.05, legacyScale).toFixed(4));

  // 2. LevelDifferenceMultiplier
  const pen = cfg.levelPenalty;
  const pLv = Math.max(1, Number(params.playerLevel || 1));
  const mLv = Math.max(1, Number(params.monsterLevel || 1));
  const diff = pLv - mLv;
  let rawLevelRatio = 1.0;
  if (diff > pen.graceLevelDiff) {
    const excess = diff - pen.graceLevelDiff;
    const rawPct = Math.max(pen.minExpFloorPct, 100 - excess * pen.penaltyPerLevelPct);
    rawLevelRatio = rawPct / 100;
  } else if (diff < 0) {
    const gap = Math.min(5, Math.abs(diff));
    const bonusPct = Math.min(pen.maxHigherLevelBonusPct, gap * pen.higherLevelBonusPerLvPct);
    rawLevelRatio = 1 + bonusPct / 100;
  }
  const adminLvDiffScale = isEnabled ? Number(cfg.levelDifferenceMultiplier ?? 1.0) : 1.0;
  const levelDifferenceMultiplier = Number(Math.max(0.1, rawLevelRatio * adminLvDiffScale).toFixed(4));

  // 3. EventMultiplier
  const eventMultiplier = isEnabled ? Number(Math.max(0.1, Number(cfg.eventExpMultiplier ?? 1.0)).toFixed(4)) : 1.0;

  // 4. PartyMultiplier
  const partyMultiplier =
    partyCount > 1
      ? isEnabled
        ? Number(Math.max(0.5, Number(cfg.partyExpMultiplier ?? 1.15)).toFixed(4))
        : 1.15
      : 1.0;

  const totalPoolExp = Math.max(
    5,
    Math.round(baseMonsterExp * adminMultiplier * levelDifferenceMultiplier * eventMultiplier * partyMultiplier)
  );
  const perMemberExp = Math.max(5, Math.round(totalPoolExp / partyCount));

  return {
    baseMonsterExp,
    adminMultiplier,
    levelDifferenceMultiplier,
    eventMultiplier,
    partyMultiplier,
    totalPoolExp,
    perMemberExp,
    gateBucket,
  };
}

// ==========================================
// PHASE 8: PROGRESSION & FARMING SIMULATIONS (Lv.1-100)
// ==========================================

interface BandSpec {
  bandLabel: ProgressionBandSimulationResult['bandLabel'];
  levelStart: number;
  levelEnd: number;
  representativeRegionId: string;
  representativeMonsterId: string;
  monsterLevel: number;
  baseMonsterExp: number;
  monsterHp: number;
  monsterDef: number;
  monsterDps: number;
  playerDps: number;
  playerMaxHp: number;
  playerMaxMp: number;
  mpCostPerSkill: number;
  skillCooldownSec: number;
  spawnDensityPerPack: number;
  travelTimeBetweenPacksSec: number;
  classId: ClassId;
  advancedJobId?: AdvancedJobId;
}

const PROGRESSION_BAND_SPECS: BandSpec[] = [
  {
    bandLabel: 'Lv.1-15',
    levelStart: 1,
    levelEnd: 15,
    representativeRegionId: 'map_wild_wolf_valley',
    representativeMonsterId: 'mon_wild_wolf',
    monsterLevel: 8,
    baseMonsterExp: 68,
    monsterHp: 210,
    monsterDef: 14,
    monsterDps: 14,
    playerDps: 85,
    playerMaxHp: 680,
    playerMaxMp: 320,
    mpCostPerSkill: 10,
    skillCooldownSec: 3.0,
    spawnDensityPerPack: 3,
    travelTimeBetweenPacksSec: 2.2,
    classId: 'swordsman',
  },
  {
    bandLabel: 'Lv.15-40',
    levelStart: 15,
    levelEnd: 40,
    representativeRegionId: 'map_whispering_meadow',
    representativeMonsterId: 'mon_meadow_stalker',
    monsterLevel: 28,
    baseMonsterExp: 240,
    monsterHp: 980,
    monsterDef: 48,
    monsterDps: 42,
    playerDps: 215,
    playerMaxHp: 2250,
    playerMaxMp: 950,
    mpCostPerSkill: 22,
    skillCooldownSec: 2.8,
    spawnDensityPerPack: 3,
    travelTimeBetweenPacksSec: 2.5,
    classId: 'swordsman',
  },
  {
    bandLabel: 'Lv.40-60',
    levelStart: 40,
    levelEnd: 60,
    representativeRegionId: 'map_emerald_marsh',
    representativeMonsterId: 'mon_marsh_hydra_spawn',
    monsterLevel: 50,
    baseMonsterExp: 690,
    monsterHp: 2850,
    monsterDef: 110,
    monsterDps: 96,
    playerDps: 540,
    playerMaxHp: 4900,
    playerMaxMp: 1850,
    mpCostPerSkill: 38,
    skillCooldownSec: 2.6,
    spawnDensityPerPack: 3,
    travelTimeBetweenPacksSec: 2.6,
    classId: 'spearman',
  },
  {
    bandLabel: 'Lv.60-80',
    levelStart: 60,
    levelEnd: 80,
    representativeRegionId: 'map_sun_scorch_desert',
    representativeMonsterId: 'mon_sand_wraith_sentinel',
    monsterLevel: 70,
    baseMonsterExp: 1580,
    monsterHp: 6400,
    monsterDef: 210,
    monsterDps: 185,
    playerDps: 1180,
    playerMaxHp: 8800,
    playerMaxMp: 3200,
    mpCostPerSkill: 56,
    skillCooldownSec: 2.5,
    spawnDensityPerPack: 3,
    travelTimeBetweenPacksSec: 2.8,
    classId: 'knight',
  },
  {
    bandLabel: 'Lv.80-100',
    levelStart: 80,
    levelEnd: 100,
    representativeRegionId: 'map_frost_peak',
    representativeMonsterId: 'mon_frost_valkyrie_guard',
    monsterLevel: 90,
    baseMonsterExp: 3450,
    monsterHp: 14200,
    monsterDef: 360,
    monsterDps: 340,
    playerDps: 2650,
    playerMaxHp: 16500,
    playerMaxMp: 5800,
    mpCostPerSkill: 85,
    skillCooldownSec: 2.2,
    spawnDensityPerPack: 3,
    travelTimeBetweenPacksSec: 3.0,
    classId: 'swordsman',
    advancedJobId: 'sword_saint',
  },
];

export function simulateProgressionAndFarmingBands(
  expConfig?: Partial<ExpBalanceConfig>,
  regenConfig?: Partial<RegenStateMultipliersConfig>
): ProgressionBandSimulationResult[] {
  const results: ProgressionBandSimulationResult[] = [];

  for (const spec of PROGRESSION_BAND_SPECS) {
    for (const mode of ['solo', 'party'] as const) {
      const partySize = mode === 'party' ? 3 : 1;
      const midLevel = Math.round((spec.levelStart + spec.levelEnd) / 2);
      const expNeededForMidLevel = computeExpRequiredForLevel(midLevel);

      const expCalc = computeMonsterKillExp({
        baseMonsterExp: spec.baseMonsterExp,
        playerLevel: midLevel,
        monsterLevel: spec.monsterLevel,
        regionId: spec.representativeRegionId,
        partyMemberCount: partySize,
        config: expConfig,
      });

      const effectiveDefMitigation = 100 / (100 + spec.monsterDef * 0.45);
      const teamDps = spec.playerDps * (mode === 'party' ? 2.45 : 1.0) * effectiveDefMitigation;
      const avgTimeToKillSec = Number(Math.max(1.2, spec.monsterHp / Math.max(1, teamDps)).toFixed(2));
      const travelSecPerKill = Number((spec.travelTimeBetweenPacksSec / spec.spawnDensityPerPack).toFixed(2));
      const cycleSecPerKill = avgTimeToKillSec + travelSecPerKill;

      const avgKillsPerLevel = Math.max(1, Math.ceil(expNeededForMidLevel / Math.max(1, expCalc.perMemberExp)));

      // Regenerate in-combat & between packs
      const regenInCombat = computeCharacterRegenTick({
        classId: spec.classId,
        advancedJobId: spec.advancedJobId,
        currentHp: Math.round(spec.playerMaxHp * 0.6),
        maxHp: spec.playerMaxHp,
        currentMp: Math.round(spec.playerMaxMp * 0.6),
        maxMp: spec.playerMaxMp,
        lastCombatActionAt: 1000,
        nowMs: 2000,
        config: regenConfig,
      });
      const regenSitting = computeCharacterRegenTick({
        classId: spec.classId,
        advancedJobId: spec.advancedJobId,
        currentHp: Math.round(spec.playerMaxHp * 0.5),
        maxHp: spec.playerMaxHp,
        currentMp: Math.round(spec.playerMaxMp * 0.5),
        maxMp: spec.playerMaxMp,
        lastCombatActionAt: 1000,
        nowMs: 12000,
        isSitting: true,
        config: regenConfig,
      });

      const incomingDpsPerPlayer = spec.monsterDps / (mode === 'party' ? 2.1 : 1.0);
      const netHpLossPerKill = Math.max(0, (incomingDpsPerPlayer - regenInCombat.hpRecovered) * avgTimeToKillSec);
      const skillsPerKill = Math.max(1, avgTimeToKillSec / spec.skillCooldownSec);
      const netMpLossPerKill = Math.max(
        0,
        skillsPerKill * spec.mpCostPerSkill - regenInCombat.mpRecovered * avgTimeToKillSec
      );

      const totalHpLossPerLevel = netHpLossPerKill * avgKillsPerLevel;
      const totalMpLossPerLevel = netMpLossPerKill * avgKillsPerLevel;

      const potionHealAmount = spec.playerMaxHp * 0.35;
      const potionManaAmount = spec.playerMaxMp * 0.35;
      const potionsUsedPerLevel = Number(
        ((totalHpLossPerLevel * 0.45) / potionHealAmount + (totalMpLossPerLevel * 0.45) / potionManaAmount).toFixed(1)
      );

      const hpRecoveryDowntimeSecPerLevel = Number(
        ((totalHpLossPerLevel * 0.55) / Math.max(1, regenSitting.hpRecovered)).toFixed(1)
      );
      const mpRecoveryDowntimeSecPerLevel = Number(
        ((totalMpLossPerLevel * 0.55) / Math.max(1, regenSitting.mpRecovered)).toFixed(1)
      );

      const activeCombatSecPerLevel = avgKillsPerLevel * cycleSecPerKill;
      const avgTimePerLevelSec = Number(
        (activeCombatSecPerLevel + hpRecoveryDowntimeSecPerLevel * 0.35 + mpRecoveryDowntimeSecPerLevel * 0.35).toFixed(1)
      );
      const expPerMinute = Math.round((expNeededForMidLevel / Math.max(1, avgTimePerLevelSec)) * 60);
      const skillUsageFrequencyPerMin = Number(((60 / cycleSecPerKill) * skillsPerKill).toFixed(1));

      results.push({
        bandLabel: spec.bandLabel,
        levelStart: spec.levelStart,
        levelEnd: spec.levelEnd,
        mode,
        representativeRegionId: spec.representativeRegionId,
        representativeMonsterId: spec.representativeMonsterId,
        avgTimePerLevelSec,
        expPerMinute,
        avgKillsPerLevel,
        hpRecoveryDowntimeSecPerLevel,
        mpRecoveryDowntimeSecPerLevel,
        potionsUsedPerLevel,
        skillUsageFrequencyPerMin,
        avgTimeToKillSec,
        travelTimeBetweenPacksSec: spec.travelTimeBetweenPacksSec,
        beginnerPacingHealthy: spec.bandLabel === 'Lv.1-15' ? avgTimePerLevelSec <= 240 : true,
      });
    }
  }

  return results;
}
