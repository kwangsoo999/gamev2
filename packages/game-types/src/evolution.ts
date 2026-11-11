import type {
  ElementType,
  FirstJobClassId,
  PrimaryAttributes,
  WeaponType,
} from './index.js';

export type AdvancedJobId =
  | 'sword_saint'
  | 'berserker'
  | 'dragoon'
  | 'warlancer'
  | 'paladin'
  | 'guardian'
  | 'saint'
  | 'exorcist'
  | 'elementalist'
  | 'arcanist'
  | 'shadowblade'
  | 'phantom'
  | 'martial_artist'
  | 'duelist'
  | 'sniper'
  | 'ranger';

export type SkillMasteryRankId =
  | 'novice'
  | 'apprentice'
  | 'adept'
  | 'expert'
  | 'master'
  | 'grandmaster';

export type SkillExecutionType =
  | 'single_target'
  | 'multi_hit'
  | 'aoe'
  | 'projectile'
  | 'dash'
  | 'channeling'
  | 'summon'
  | 'healing'
  | 'shield'
  | 'buff'
  | 'debuff'
  | 'crowd_control'
  | 'ultimate'
  | 'passive';

export interface SkillStatusEffectSpec {
  effectId: string;
  type:
    | 'burn'
    | 'poison'
    | 'bleed'
    | 'slow'
    | 'stun'
    | 'root'
    | 'silence'
    | 'knockback'
    | 'pull'
    | 'shield'
    | 'regen'
    | 'atk_up'
    | 'def_up'
    | 'crit_up'
    | 'lifesteal'
    | 'mark'
    | 'holy_ward'
    | 'frostbite'
    | 'shock'
    | 'cleanse';
  chancePct: number;
  durationMs: number;
  magnitudePct?: number;
  flatValue?: number;
  tickIntervalMs?: number;
  maxStacks?: number;
}

export interface SkillEvolutionMilestone {
  requiredSkillLevel: number;
  requiredMasteryPoints?: number;
  title: string;
  titleVi: string;
  description: string;
  descriptionVi: string;
  bonusDamagePct?: number;
  bonusHits?: number;
  bonusProjectiles?: number;
  bonusAreaRadiusPct?: number;
  bonusCritChancePct?: number;
  cooldownReductionPct?: number;
  cleanseCount?: number;
  secondarySplashPct?: number;
  unlocksGroundField?: boolean;
  unlocksExecuteThresholdPct?: number;
  unlocksFollowUp?: boolean;
  vfxTier?: number;
  vfxTag?: string;
}

export interface SkillMasteryConfig {
  enabled: boolean;
  maxPoints: number;
  gainPerValidCast: number;
  cooldownWindowMs?: number;
  bonusDamagePerPointPct?: number;
  critBonusAtGrandmasterPct?: number;
  cooldownReductionAtMasterPct?: number;
}

export interface SkillMasteryProgress {
  points: number;
  exp: number;
  rank: SkillMasteryRankId;
  castsCount: number;
  validCombatHits: number;
  lastGainAt?: number;
  unlockedEvolutionTags?: string[];
}

export type JobVfxStyleCategory =
  | 'blade_saint'
  | 'crimson_fury'
  | 'dragon_lance'
  | 'fortress_spear'
  | 'holy_paladin'
  | 'iron_bastion'
  | 'seraphic_light'
  | 'sacred_exorcism'
  | 'elemental_tempest'
  | 'arcane_cosmos'
  | 'shadow_assassin'
  | 'spectral_phantom'
  | 'chi_grandmaster'
  | 'tempo_duelist'
  | 'precision_sniper'
  | 'verdant_ranger'
  | 'base_class';

export interface ClassVfxProfile {
  classOrBranchId: string;
  styleCategory: JobVfxStyleCategory;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  glowColor: string;
  trailStyle:
    | 'crescent_arc'
    | 'jagged_cleave'
    | 'piercing_lance'
    | 'sweeping_halberd'
    | 'radiant_wave'
    | 'bastion_pulse'
    | 'holy_ribbon'
    | 'exorcism_sigil'
    | 'elemental_orb'
    | 'cosmic_rune'
    | 'shadow_streak'
    | 'phantom_afterimage'
    | 'chi_shockwave'
    | 'rapid_combo_streak'
    | 'snipe_laser'
    | 'leaf_wind_arc';
  circleStyle:
    | 'runic_halo'
    | 'crimson_vortex'
    | 'draconic_crest'
    | 'fortress_grid'
    | 'paladin_cross'
    | 'aegis_octagon'
    | 'seraph_mandala'
    | 'purification_seal'
    | 'elemental_triad'
    | 'celestial_astrolabe'
    | 'shadow_moon'
    | 'phantom_eclipse'
    | 'lotus_chi'
    | 'duelist_compass'
    | 'target_reticle'
    | 'sylvan_ring';
  weaponAuraStyle:
    | 'white_gold_edge'
    | 'blood_flame'
    | 'dragon_lightning'
    | 'tempered_steel'
    | 'sunlight_gleam'
    | 'emerald_bulwark'
    | 'divine_feathers'
    | 'judgement_sparks'
    | 'tri_element_orbit'
    | 'starlight_orbit'
    | 'violet_mist'
    | 'mirage_veil'
    | 'golden_fist'
    | 'crimson_wind'
    | 'azure_aim'
    | 'spirit_vines';
  defaultHitStopMs: number;
  defaultShakeIntensity: number;
  particleDensityMultiplier: number;
}

export interface AdvancedJobDefinition {
  id: AdvancedJobId;
  parentClassId: FirstJobClassId;
  parentDisplayName: string;
  parentDisplayNameVi: string;
  name: string;
  nameVi: string;
  title: string;
  titleVi: string;
  role: string;
  archetype: string;
  description: string;
  descriptionVi: string;
  unlockLevel: 80;
  tier: 3;
  weaponCompatibility: WeaponType[];
  armorProficiency: string[];
  statBonuses: PrimaryAttributes;
  growthPerLevel: Partial<PrimaryAttributes>;
  combatModifiers: {
    pveDamageBonusPct: number;
    pvpDamageModifierPct: number;
    bossDamageBonusPct: number;
    critRateBonusPct: number;
    critDamageBonusPct: number;
    healingPowerBonusPct?: number;
    damageReductionPct?: number;
    cooldownReductionPct?: number;
  };
  exclusiveSkillIds: string[];
  incompatibleBranchId: AdvancedJobId;
  vfxProfile: ClassVfxProfile;
  animationProfileId: string;
  iconUrl: string;
  portraitUrl: string;
  isPermanent: true;
  preferredElement?: ElementType;
}

export interface ResolvedSkillEvolutionState {
  skillId: string;
  skillLevel: number;
  masteryPoints: number;
  masteryRank: SkillMasteryRankId;
  evolutionTier: number;
  totalDamageMultiplier: number;
  totalHitCount: number;
  totalProjectiles: number;
  effectiveAreaRadius: number;
  bonusCritChancePct: number;
  effectiveCooldownMs: number;
  cleanseCount: number;
  secondarySplashPct: number;
  unlocksGroundField: boolean;
  executeThresholdPct: number;
  unlocksFollowUp: boolean;
  activeMilestones: SkillEvolutionMilestone[];
  unlockedVfxTags: string[];
}
