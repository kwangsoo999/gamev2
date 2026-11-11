import type {
  AdvancedJobId,
  AttributeKey,
  FirstJobClassId,
  PrimaryAttributes,
} from './index.js';

export type PassiveCategory = 'core' | 'combat' | 'branch' | 'mastery';

export type PassiveEffectType =
  | 'flat_attr'
  | 'pct_attr'
  | 'damage_mult'
  | 'crit_rate'
  | 'crit_damage'
  | 'attack_speed'
  | 'cooldown_reduction'
  | 'move_speed'
  | 'healing_bonus'
  | 'shield_bonus'
  | 'armor_penetration'
  | 'magic_penetration'
  | 'elemental_damage'
  | 'status_resistance'
  | 'resource_efficiency'
  | 'combo_bonus'
  | 'conditional_effect'
  | 'party_support'
  | 'evasion'
  | 'accuracy'
  | 'damage_reduction'
  | 'lifesteal'
  | 'hp_bonus'
  | 'mp_bonus';

export type CombatBalanceMode = 'pve' | 'pvp' | 'boss';

export type StatCapKey =
  | 'critRatePct'
  | 'critDamageBonusPct'
  | 'aspdBonusPct'
  | 'cooldownReductionPct'
  | 'moveSpeedBonusPct'
  | 'evasionPct'
  | 'armorPenetrationPct'
  | 'magicPenetrationPct'
  | 'damageReductionPct'
  | 'healingBonusPct'
  | 'lifestealPct'
  | 'statusResistancePct';

export interface StatCapRule {
  statKey: StatCapKey;
  label: string;
  labelVi: string;
  softCap1: number;
  hardCap2: number;
  stage2Efficiency: number;
  stage3Efficiency: number;
  hardCeiling: number;
  unit: '%' | 'flat';
  isOverflowProtected: boolean;
  pvpHardCeiling?: number;
  bossHardCeiling?: number;
  description: string;
}

export interface PassiveStatEffectEntry {
  stat: string;
  effectType: PassiveEffectType;
  valuePerRank: number;
  isPercentage: boolean;
  element?: string;
}

export interface PassiveActivationCondition {
  type:
    | 'always'
    | 'hp_below_pct'
    | 'hp_above_pct'
    | 'in_combat'
    | 'boss_encounter'
    | 'combo_streak'
    | 'party_nearby'
    | 'skill_cast';
  thresholdPct?: number;
  targetSkillId?: string;
  description: string;
  descriptionVi?: string;
}

export interface PassiveDefinition {
  passive_id: string;
  id: string;
  name: string;
  nameVi: string;
  description: string;
  descriptionVi: string;
  category: PassiveCategory;
  classRequirement: FirstJobClassId | AdvancedJobId | 'any';
  branchRequirement?: AdvancedJobId;
  parentPassiveIds: string[];
  mutuallyExclusiveGroup?: string;
  requiredCharacterLevel: number;
  requiredJobLevel: number;
  requiredMasteryPoints?: number;
  synergySkillId?: string;
  maxRank: number;
  pointCostPerRank: number;
  effectType: PassiveEffectType;
  effects: PassiveStatEffectEntry[];
  activationCondition: PassiveActivationCondition;
  internalCooldownMs: number;
  stackingRule: 'additive' | 'multiplicative_diminishing' | 'highest_only';
  pveModifier: number;
  pvpModifier: number;
  bossModifier: number;
  iconUrl: string;
  isSignature?: boolean;
  tierColumn?: number;
  tierRow?: number;
}

export interface PassivePointTransaction {
  txId: string;
  characterId: string;
  timestamp: string;
  action: 'allocate' | 'respec' | 'grant_milestone';
  passiveId?: string;
  fromRank?: number;
  toRank?: number;
  pointsDelta: number;
  totalAllocatedAfter: number;
  remainingPointsAfter: number;
  costGold?: number;
  itemConsumedId?: string;
  reason: string;
}

export interface JobAffinityConfig {
  jobId: string;
  displayName: string;
  displayNameVi: string;
  roleIdentity: string;
  primaryAttr: AttributeKey;
  secondaryAttr?: AttributeKey;
  primaryEfficiencyBonusPct: number;
  secondaryEfficiencyBonusPct: number;
  hpBaseGrowthPerLevel: number;
  mpBaseGrowthPerLevel: number;
  atkBaseGrowthPerLevel: number;
  matkBaseGrowthPerLevel: number;
  defBaseGrowthPerLevel: number;
  mdefBaseGrowthPerLevel: number;
  signatureMechanics: string[];
}

export interface StatSourceBreakdown {
  baseAndLevel: number;
  equipmentAndSets: number;
  uniqueItems: number;
  passives: number;
  skillsAndBuffs: number;
  titles: number;
  guild: number;
  consumablesAndFood: number;
  jobAffinity: number;
  eventTemp: number;
}

export interface AggregatedStatBreakdownEntry {
  statKey: string;
  label: string;
  labelVi: string;
  rawBeforeDr: number;
  effectiveValue: number;
  softCap1: number;
  hardCap2: number;
  hardCeiling: number;
  inDiminishingReturns: boolean;
  atHardCap: boolean;
  warningMessage?: string;
  warningMessageVi?: string;
  sources: Partial<StatSourceBreakdown>;
}

export interface AggregatedSecondaryStats {
  maxHp: number;
  maxMp: number;
  atk: number;
  matk: number;
  def: number;
  mdef: number;
  critRatePct: number;
  critDamageMultiplierPct: number;
  critDamageBonusPct: number;
  aspdPct: number;
  aspdBonusPct: number;
  cooldownReductionPct: number;
  moveSpeedPct: number;
  moveSpeedBonusPct: number;
  evasionPct: number;
  accuracy: number;
  accuracyBonusPct: number;
  armorPenetrationPct: number;
  magicPenetrationPct: number;
  damageReductionPct: number;
  healingBonusPct: number;
  lifestealPct: number;
  statusResistancePct: number;
  skillDamagePct: number;
  resourceEfficiencyPct: number;
  elementalDamagePct: number;
  comboBonusPct: number;
  shieldBonusPct: number;
  expBonusPct: number;
  goldBonusPct: number;
  effectiveHp: number;
}

export interface AggregatedCharacterStatsResult {
  characterId: string;
  classId: string;
  advancedJobId?: string;
  level: number;
  mode: CombatBalanceMode;
  calculationOrder: string[];
  baseAttributes: PrimaryAttributes;
  effectiveAttributes: PrimaryAttributes;
  affinityAdjustedBonusAttrs: PrimaryAttributes;
  secondaryStats: AggregatedSecondaryStats;
  breakdowns: Record<StatCapKey, AggregatedStatBreakdownEntry>;
  warnings: string[];
  warningsVi: string[];
  jobAffinity: JobAffinityConfig;
  activePassives: Array<{
    passiveId: string;
    name: string;
    rank: number;
    category: PassiveCategory;
    synergySkillId?: string;
  }>;
  synergyBonusesBySkillId: Record<
    string,
    {
      damageBonusPct: number;
      critBonusPct: number;
      cooldownReductionPct: number;
      extraResourceSavePct: number;
    }
  >;
  pveDamageMultiplier: number;
  pvpDamageMultiplier: number;
  bossDamageMultiplier: number;
  deathPenaltyApplied?: {
    active: boolean;
    tier?: 'novice' | 'first_job' | 'second_job' | 'third_job';
    statReductionPct: number;
    expiresAt?: number;
    stackingCount?: number;
  };
  passivePointsSummary: {
    earned: number;
    spent: number;
    available: number;
    masteryBonusPoints: number;
  };
}

export interface CombatSimulationRow {
  jobId: string;
  jobName: string;
  role: string;
  level: number;
  equipmentTier: 'T1_Lv15' | 'T2_Lv60' | 'T3_Lv80' | 'T4_Endgame_Lv150';
  buildProfile: 'balanced' | 'glass_cannon' | 'stat_stacker' | 'defensive_utility';
  scenario: 'normal_pve' | 'boss_fight' | 'pvp_duel' | 'party_raid';
  dps: number;
  burstDamage: number;
  effectiveHp: number;
  damageMitigationPct: number;
  healingPerSecond: number;
  criticalFrequencyPct: number;
  resourceBurnPerSec: number;
  survivabilitySeconds: number;
  utilityScore: number;
  isOutlier: boolean;
  outlierReasons: string[];
}
