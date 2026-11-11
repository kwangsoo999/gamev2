import {
  AggregatedCharacterStatsResult,
  AggregatedStatBreakdownEntry,
  CharacterEntity,
  CombatBalanceMode,
  GuildSkillState,
  ItemEntity,
  JobAffinityConfig,
  PrimaryAttributes,
  SkillDefinition,
  StatCapKey,
  StatCapRule,
  StatSourceBreakdown,
  TitleBonusLimits,
  TitleDefinition,
  UniqueEquipmentDefinition,
  EquipmentSetDefinition,
} from '@elysia/game-types';
import {
  ADVANCED_JOB_BY_ID,
  normalizeBaseClassId,
} from './advancedEvolution.js';
import {
  ALL_PASSIVE_DEFINITIONS,
  PASSIVE_BY_ID,
  computeEarnedPassivePoints,
  computePassivePointsSpent,
} from './passives.js';
import { computePermanentTitleBonuses, computeUniqueEquipmentBonuses } from './questsUniqueTitles.js';
import { INITIAL_EQUIPMENT_SETS, INITIAL_ITEMS, computeEquippedSetBonuses } from './setsAndItems.js';
import { INITIAL_SKILLS, computePassiveAndBuffModifiers } from './skills.js';
import { getActiveDeathPenaltyReductionPct } from './worldSystems.js';

export const STAT_CALCULATION_ORDER: string[] = [
  '1. Base Stats (baseStats Lv.1 + allocated points + Lv.1-200 Job Growth)',
  '2. Flat Additions (equipment, sets, unique passives, titles, passives, guild buildings, food/consumables, event temp)',
  '3. Attribute Scaling (STR/DEX/AGI/INT/CON -> raw ATK/MATK/DEF/MDEF/HP/MP/Accuracy)',
  '4. Job Affinity (controlled primary +12% / secondary +6% attribute efficiency on invested attributes)',
  '5. Percentage Additions (ATK%, MATK%, DEF%, MDEF%, HP%, MP%, Guild Skills, Passive%, Buff%, Set%)',
  '6. Diminishing Returns (piecewise monotonic Soft Cap C1 -> 50% efficiency -> C2 -> 10% efficiency)',
  '7. Final Hard Caps (strictly clamped per PvE/PvP/Boss cap rules; prevents 100% DR / 0s CD / infinite Crit)',
  '8. Combat Modifiers & Synergies (PvE / PvP / Boss multipliers & Skill Mastery passive synergies)',
];

// ==========================================
// PHASE 8 & 9: CONFIGURABLE SOFT & HARD CAPS
// ==========================================

export const STAT_CAP_RULES: Record<StatCapKey, StatCapRule> = {
  critRatePct: {
    statKey: 'critRatePct',
    label: 'Critical Rate',
    labelVi: 'Tỷ Lệ Chí Mạng',
    softCap1: 50,
    hardCap2: 80,
    stage2Efficiency: 0.5,
    stage3Efficiency: 0.1,
    hardCeiling: 75,
    pvpHardCeiling: 70,
    bossHardCeiling: 75,
    unit: '%',
    isOverflowProtected: true,
    description: 'Soft cap at 50% (50% efficiency up to 80% raw, 10% above), hard cap at 75%.',
  },
  critDamageBonusPct: {
    statKey: 'critDamageBonusPct',
    label: 'Critical Damage Bonus',
    labelVi: 'Sát Thương Chí Mạng (+Bonus)',
    softCap1: 150,
    hardCap2: 260,
    stage2Efficiency: 0.5,
    stage3Efficiency: 0.1,
    hardCeiling: 250,
    pvpHardCeiling: 210,
    bossHardCeiling: 250,
    unit: '%',
    isOverflowProtected: true,
    description: 'Bonus added on top of base 150% Crit Damage. Soft cap +150%, hard cap +250% (400% max multiplier).',
  },
  aspdBonusPct: {
    statKey: 'aspdBonusPct',
    label: 'Attack Speed Bonus',
    labelVi: 'Tốc Độ Đánh (+Bonus)',
    softCap1: 30,
    hardCap2: 70,
    stage2Efficiency: 0.5,
    stage3Efficiency: 0.1,
    hardCeiling: 60,
    pvpHardCeiling: 50,
    bossHardCeiling: 60,
    unit: '%',
    isOverflowProtected: true,
    description: 'Soft cap +30%, hard cap +60% attack speed bonus.',
  },
  cooldownReductionPct: {
    statKey: 'cooldownReductionPct',
    label: 'Cooldown Reduction',
    labelVi: 'Giảm Thời Gian Hồi Chiêu',
    softCap1: 20,
    hardCap2: 50,
    stage2Efficiency: 0.5,
    stage3Efficiency: 0.1,
    hardCeiling: 40,
    pvpHardCeiling: 35,
    bossHardCeiling: 40,
    unit: '%',
    isOverflowProtected: true,
    description: 'Soft cap 20%, hard cap 40%. Prevents zero-cooldown exploits.',
  },
  moveSpeedBonusPct: {
    statKey: 'moveSpeedBonusPct',
    label: 'Movement Speed Bonus',
    labelVi: 'Tốc Độ Di Chuyển (+Bonus)',
    softCap1: 20,
    hardCap2: 50,
    stage2Efficiency: 0.5,
    stage3Efficiency: 0.1,
    hardCeiling: 40,
    pvpHardCeiling: 35,
    bossHardCeiling: 40,
    unit: '%',
    isOverflowProtected: true,
    description: 'Soft cap +20%, hard cap +40%.',
  },
  evasionPct: {
    statKey: 'evasionPct',
    label: 'Evasion',
    labelVi: 'Né Tránh',
    softCap1: 25,
    hardCap2: 45,
    stage2Efficiency: 0.5,
    stage3Efficiency: 0.1,
    hardCeiling: 40,
    pvpHardCeiling: 35,
    bossHardCeiling: 40,
    unit: '%',
    isOverflowProtected: true,
    description: 'Soft cap 25%, hard cap 40%. Evaluated against attacker level-aware Accuracy.',
  },
  armorPenetrationPct: {
    statKey: 'armorPenetrationPct',
    label: 'Armor Penetration',
    labelVi: 'Xuyên Giáp Vật Lý',
    softCap1: 30,
    hardCap2: 60,
    stage2Efficiency: 0.5,
    stage3Efficiency: 0.1,
    hardCeiling: 50,
    pvpHardCeiling: 45,
    bossHardCeiling: 50,
    unit: '%',
    isOverflowProtected: true,
    description: 'Soft cap 30%, hard cap 50%. Cannot cause negative enemy defense.',
  },
  magicPenetrationPct: {
    statKey: 'magicPenetrationPct',
    label: 'Magic Penetration',
    labelVi: 'Xuyên Kháng Phép',
    softCap1: 30,
    hardCap2: 60,
    stage2Efficiency: 0.5,
    stage3Efficiency: 0.1,
    hardCeiling: 50,
    pvpHardCeiling: 45,
    bossHardCeiling: 50,
    unit: '%',
    isOverflowProtected: true,
    description: 'Soft cap 30%, hard cap 50%. Cannot cause negative enemy MDEF.',
  },
  damageReductionPct: {
    statKey: 'damageReductionPct',
    label: 'Damage Reduction',
    labelVi: 'Giảm Sát Thương Nhận Vào',
    softCap1: 30,
    hardCap2: 60,
    stage2Efficiency: 0.5,
    stage3Efficiency: 0.1,
    hardCeiling: 50,
    pvpHardCeiling: 45,
    bossHardCeiling: 50,
    unit: '%',
    isOverflowProtected: true,
    description: 'Soft cap 30%, hard cap 50%. Prevents 100% damage immunity.',
  },
  healingBonusPct: {
    statKey: 'healingBonusPct',
    label: 'Healing Bonus',
    labelVi: 'Cường Hóa Trị Liệu',
    softCap1: 30,
    hardCap2: 70,
    stage2Efficiency: 0.5,
    stage3Efficiency: 0.1,
    hardCeiling: 60,
    pvpHardCeiling: 45,
    bossHardCeiling: 60,
    unit: '%',
    isOverflowProtected: true,
    description: 'Soft cap 30%, hard cap 60% (PvP 45%).',
  },
  lifestealPct: {
    statKey: 'lifestealPct',
    label: 'Lifesteal',
    labelVi: 'Hút Máu',
    softCap1: 10,
    hardCap2: 24,
    stage2Efficiency: 0.5,
    stage3Efficiency: 0.1,
    hardCeiling: 20,
    pvpHardCeiling: 15,
    bossHardCeiling: 20,
    unit: '%',
    isOverflowProtected: true,
    description: 'Soft cap 10%, hard cap 20% (PvP 15%). Prevents infinite sustain loops.',
  },
  statusResistancePct: {
    statKey: 'statusResistancePct',
    label: 'Status Resistance',
    labelVi: 'Kháng Hiệu Ứng Bất Lợi',
    softCap1: 30,
    hardCap2: 70,
    stage2Efficiency: 0.5,
    stage3Efficiency: 0.1,
    hardCeiling: 60,
    pvpHardCeiling: 55,
    bossHardCeiling: 60,
    unit: '%',
    isOverflowProtected: true,
    description: 'Soft cap 30%, hard cap 60%. Reduces stun/debuff chance and duration.',
  },
};

export function applyDiminishingReturns(
  rawX: number,
  rule: StatCapRule,
  mode: CombatBalanceMode = 'pve',
  tempCapDelta = 0
): { effectiveValue: number; inDiminishingReturns: boolean; atHardCap: boolean; ceilingUsed: number } {
  const safeX = Number.isFinite(rawX) ? Math.max(0, rawX) : 0;
  const baseCeiling =
    mode === 'pvp' && rule.pvpHardCeiling !== undefined
      ? rule.pvpHardCeiling
      : mode === 'boss' && rule.bossHardCeiling !== undefined
        ? rule.bossHardCeiling
        : rule.hardCeiling;
  // Temporary events may only nudge ceiling slightly (+-5%) never breaking mathematical hard boundaries (>= 100% DR or >= 90% CDR)
  const maxAllowedCeiling = rule.statKey === 'critDamageBonusPct' ? 260 : 85;
  const ceilingUsed = Math.max(1, Math.min(maxAllowedCeiling, baseCeiling + tempCapDelta));
  const c1 = rule.softCap1;
  const c2 = rule.hardCap2;

  let transformed: number;
  if (safeX <= c1) {
    transformed = safeX;
  } else if (safeX <= c2) {
    transformed = c1 + rule.stage2Efficiency * (safeX - c1);
  } else {
    transformed =
      c1 +
      rule.stage2Efficiency * (c2 - c1) +
      rule.stage3Efficiency * (safeX - c2);
  }

  const effectiveValue = Math.min(ceilingUsed, Number(transformed.toFixed(2)));
  return {
    effectiveValue,
    inDiminishingReturns: safeX > c1,
    atHardCap: effectiveValue >= ceilingUsed - 0.05,
    ceilingUsed,
  };
}

// ==========================================
// PHASE 6: JOB AFFINITY & LV.1-200 GROWTH TABLE
// ==========================================

export const JOB_AFFINITY_CONFIGS: Record<string, JobAffinityConfig> = {
  adventurer: {
    jobId: 'adventurer', displayName: 'Adventurer', displayNameVi: 'Tân Thủ',
    roleIdentity: 'Balanced Starter', primaryAttr: 'str', secondaryAttr: 'con',
    primaryEfficiencyBonusPct: 4, secondaryEfficiencyBonusPct: 2,
    hpBaseGrowthPerLevel: 18, mpBaseGrowthPerLevel: 8, atkBaseGrowthPerLevel: 2.0, matkBaseGrowthPerLevel: 1.8, defBaseGrowthPerLevel: 1.0, mdefBaseGrowthPerLevel: 1.0,
    signatureMechanics: ['Starter balance Lv.1-14'],
  },
  // 8 Base Classes
  swordsman: {
    jobId: 'swordsman', displayName: 'Swordsman', displayNameVi: 'Kiếm Sĩ',
    roleIdentity: 'Versatile Blade Fighter', primaryAttr: 'str', secondaryAttr: 'dex',
    primaryEfficiencyBonusPct: 10, secondaryEfficiencyBonusPct: 5,
    hpBaseGrowthPerLevel: 26, mpBaseGrowthPerLevel: 9, atkBaseGrowthPerLevel: 3.6, matkBaseGrowthPerLevel: 1.2, defBaseGrowthPerLevel: 1.9, mdefBaseGrowthPerLevel: 1.4,
    signatureMechanics: ['Balanced slash combo & blade control'],
  },
  spearman: {
    jobId: 'spearman', displayName: 'Spearman', displayNameVi: 'Thương Sĩ',
    roleIdentity: 'Armored Reach Lancer', primaryAttr: 'str', secondaryAttr: 'dex',
    primaryEfficiencyBonusPct: 10, secondaryEfficiencyBonusPct: 5,
    hpBaseGrowthPerLevel: 27, mpBaseGrowthPerLevel: 9, atkBaseGrowthPerLevel: 3.5, matkBaseGrowthPerLevel: 1.2, defBaseGrowthPerLevel: 2.1, mdefBaseGrowthPerLevel: 1.4,
    signatureMechanics: ['Reach piercing & phalanx defense'],
  },
  knight: {
    jobId: 'knight', displayName: 'Knight', displayNameVi: 'Kỵ Sĩ',
    roleIdentity: 'Armored Tank Vanguard', primaryAttr: 'con', secondaryAttr: 'str',
    primaryEfficiencyBonusPct: 10, secondaryEfficiencyBonusPct: 5,
    hpBaseGrowthPerLevel: 36, mpBaseGrowthPerLevel: 10, atkBaseGrowthPerLevel: 2.4, matkBaseGrowthPerLevel: 1.5, defBaseGrowthPerLevel: 3.3, mdefBaseGrowthPerLevel: 2.4,
    signatureMechanics: ['Shield barriers, taunt & party protection'],
  },
  monk: {
    jobId: 'monk', displayName: 'Priest / Monk', displayNameVi: 'Tu Sĩ / Giáo Sĩ',
    roleIdentity: 'Holy Support & Judgement Caster', primaryAttr: 'int', secondaryAttr: 'con',
    primaryEfficiencyBonusPct: 10, secondaryEfficiencyBonusPct: 5,
    hpBaseGrowthPerLevel: 24, mpBaseGrowthPerLevel: 16, atkBaseGrowthPerLevel: 1.4, matkBaseGrowthPerLevel: 3.4, defBaseGrowthPerLevel: 1.7, mdefBaseGrowthPerLevel: 2.8,
    signatureMechanics: ['Sacred healing, cleanses & holy spells'],
  },
  mage: {
    jobId: 'mage', displayName: 'Mage', displayNameVi: 'Pháp Sư',
    roleIdentity: 'Arcane & Elemental Nuker', primaryAttr: 'int', secondaryAttr: 'dex',
    primaryEfficiencyBonusPct: 10, secondaryEfficiencyBonusPct: 5,
    hpBaseGrowthPerLevel: 19, mpBaseGrowthPerLevel: 18, atkBaseGrowthPerLevel: 1.0, matkBaseGrowthPerLevel: 4.1, defBaseGrowthPerLevel: 1.2, mdefBaseGrowthPerLevel: 2.6,
    signatureMechanics: ['High spell multipliers & AoE elements'],
  },
  assassin: {
    jobId: 'assassin', displayName: 'Assassin', displayNameVi: 'Sát Thủ',
    roleIdentity: 'Agile Crit Striker', primaryAttr: 'agi', secondaryAttr: 'dex',
    primaryEfficiencyBonusPct: 10, secondaryEfficiencyBonusPct: 5,
    hpBaseGrowthPerLevel: 21, mpBaseGrowthPerLevel: 10, atkBaseGrowthPerLevel: 3.5, matkBaseGrowthPerLevel: 1.2, defBaseGrowthPerLevel: 1.5, mdefBaseGrowthPerLevel: 1.5,
    signatureMechanics: ['Evasion, high crit & stealth bursts'],
  },
  fighter: {
    jobId: 'fighter', displayName: 'Fighter', displayNameVi: 'Võ Sĩ',
    roleIdentity: 'Melee Brawler & Counter', primaryAttr: 'str', secondaryAttr: 'agi',
    primaryEfficiencyBonusPct: 10, secondaryEfficiencyBonusPct: 5,
    hpBaseGrowthPerLevel: 28, mpBaseGrowthPerLevel: 9, atkBaseGrowthPerLevel: 3.6, matkBaseGrowthPerLevel: 1.2, defBaseGrowthPerLevel: 2.1, mdefBaseGrowthPerLevel: 1.6,
    signatureMechanics: ['High ASPD fists & counter stances'],
  },
  archer: {
    jobId: 'archer', displayName: 'Archer', displayNameVi: 'Cung Thủ',
    roleIdentity: 'Ranged Marksman', primaryAttr: 'dex', secondaryAttr: 'agi',
    primaryEfficiencyBonusPct: 10, secondaryEfficiencyBonusPct: 5,
    hpBaseGrowthPerLevel: 20, mpBaseGrowthPerLevel: 11, atkBaseGrowthPerLevel: 3.6, matkBaseGrowthPerLevel: 1.3, defBaseGrowthPerLevel: 1.4, mdefBaseGrowthPerLevel: 1.5,
    signatureMechanics: ['Long-range accuracy & critical shots'],
  },

  // 16 Lv.80 Advanced Jobs (Calibrated for Lv.1-200 Combat Role Identity)
  sword_saint: {
    jobId: 'sword_saint', displayName: 'Sword Saint', displayNameVi: 'Kiếm Thánh',
    roleIdentity: 'Precision Iaido Boss DPS', primaryAttr: 'str', secondaryAttr: 'agi',
    primaryEfficiencyBonusPct: 12, secondaryEfficiencyBonusPct: 7,
    hpBaseGrowthPerLevel: 28, mpBaseGrowthPerLevel: 10, atkBaseGrowthPerLevel: 5.2, matkBaseGrowthPerLevel: 1.4, defBaseGrowthPerLevel: 2.1, mdefBaseGrowthPerLevel: 1.7,
    signatureMechanics: ['Multi-slash crit crits & agile precision'],
  },
  berserker: {
    jobId: 'berserker', displayName: 'Berserker', displayNameVi: 'Cuồng Chiến Sĩ',
    roleIdentity: 'Heavy Cleave Blood Juggernaut', primaryAttr: 'str', secondaryAttr: 'con',
    primaryEfficiencyBonusPct: 12, secondaryEfficiencyBonusPct: 6,
    hpBaseGrowthPerLevel: 35, mpBaseGrowthPerLevel: 9, atkBaseGrowthPerLevel: 5.7, matkBaseGrowthPerLevel: 1.0, defBaseGrowthPerLevel: 2.2, mdefBaseGrowthPerLevel: 1.5,
    signatureMechanics: ['Brute physical cleaves & lifesteal sustain'],
  },
  dragoon: {
    jobId: 'dragoon', displayName: 'Dragoon', displayNameVi: 'Long Kỵ Sĩ',
    roleIdentity: 'Armor-Piercing Dive DPS', primaryAttr: 'str', secondaryAttr: 'dex',
    primaryEfficiencyBonusPct: 12, secondaryEfficiencyBonusPct: 6,
    hpBaseGrowthPerLevel: 29, mpBaseGrowthPerLevel: 10, atkBaseGrowthPerLevel: 5.3, matkBaseGrowthPerLevel: 1.6, defBaseGrowthPerLevel: 2.3, mdefBaseGrowthPerLevel: 1.7,
    signatureMechanics: ['Armor pierce dives & lightning burst'],
  },
  warlancer: {
    jobId: 'warlancer', displayName: 'Warlancer', displayNameVi: 'Chiến Thương Sư',
    roleIdentity: 'Frontline Phalanx Bruiser', primaryAttr: 'str', secondaryAttr: 'dex',
    primaryEfficiencyBonusPct: 11, secondaryEfficiencyBonusPct: 6,
    hpBaseGrowthPerLevel: 34, mpBaseGrowthPerLevel: 10, atkBaseGrowthPerLevel: 4.5, matkBaseGrowthPerLevel: 1.3, defBaseGrowthPerLevel: 3.0, mdefBaseGrowthPerLevel: 2.1,
    signatureMechanics: ['AoE sweep control & sturdy frontliner'],
  },
  paladin: {
    jobId: 'paladin', displayName: 'Paladin', displayNameVi: 'Thánh Kỵ Sĩ',
    roleIdentity: 'Holy Vanguard Tank/Support', primaryAttr: 'con', secondaryAttr: 'str',
    primaryEfficiencyBonusPct: 12, secondaryEfficiencyBonusPct: 6,
    hpBaseGrowthPerLevel: 39, mpBaseGrowthPerLevel: 14, atkBaseGrowthPerLevel: 3.6, matkBaseGrowthPerLevel: 3.1, defBaseGrowthPerLevel: 3.7, mdefBaseGrowthPerLevel: 3.2,
    signatureMechanics: ['Aegis barriers, holy cleave & party heal'],
  },
  guardian: {
    jobId: 'guardian', displayName: 'Guardian', displayNameVi: 'Hộ Vệ Hoàng Gia',
    roleIdentity: 'Apex Main Tank', primaryAttr: 'con', secondaryAttr: 'str',
    primaryEfficiencyBonusPct: 13, secondaryEfficiencyBonusPct: 5,
    hpBaseGrowthPerLevel: 46, mpBaseGrowthPerLevel: 11, atkBaseGrowthPerLevel: 2.8, matkBaseGrowthPerLevel: 1.4, defBaseGrowthPerLevel: 4.5, mdefBaseGrowthPerLevel: 3.6,
    signatureMechanics: ['Highest EHP, shields & crowd immunity (cannot match Berserker DPS)'],
  },
  saint: {
    jobId: 'saint', displayName: 'Saint', displayNameVi: 'Thánh Sư',
    roleIdentity: 'Apex Party Healer & Buffer', primaryAttr: 'int', secondaryAttr: 'con',
    primaryEfficiencyBonusPct: 12, secondaryEfficiencyBonusPct: 6,
    hpBaseGrowthPerLevel: 28, mpBaseGrowthPerLevel: 22, atkBaseGrowthPerLevel: 1.4, matkBaseGrowthPerLevel: 4.6, defBaseGrowthPerLevel: 2.2, mdefBaseGrowthPerLevel: 3.8,
    signatureMechanics: ['Highest HPS, cleanses & sanctuary healing circles'],
  },
  exorcist: {
    jobId: 'exorcist', displayName: 'Exorcist', displayNameVi: 'Trừ Tà Sư',
    roleIdentity: 'Sacred Lightning Magic Striker', primaryAttr: 'int', secondaryAttr: 'dex',
    primaryEfficiencyBonusPct: 12, secondaryEfficiencyBonusPct: 6,
    hpBaseGrowthPerLevel: 25, mpBaseGrowthPerLevel: 19, atkBaseGrowthPerLevel: 1.5, matkBaseGrowthPerLevel: 5.3, defBaseGrowthPerLevel: 1.9, mdefBaseGrowthPerLevel: 3.2,
    signatureMechanics: ['Boss holy-lightning magic penetration'],
  },
  elementalist: {
    jobId: 'elementalist', displayName: 'Elementalist', displayNameVi: 'Nguyên Tố Sư',
    roleIdentity: 'Elemental AoE Cataclysm', primaryAttr: 'int', secondaryAttr: undefined,
    primaryEfficiencyBonusPct: 14, secondaryEfficiencyBonusPct: 0,
    hpBaseGrowthPerLevel: 21, mpBaseGrowthPerLevel: 24, atkBaseGrowthPerLevel: 1.0, matkBaseGrowthPerLevel: 5.9, defBaseGrowthPerLevel: 1.5, mdefBaseGrowthPerLevel: 3.0,
    signatureMechanics: ['Pure INT focus, devastating multi-element AoE'],
  },
  arcanist: {
    jobId: 'arcanist', displayName: 'Arcanist', displayNameVi: 'Bí Ẩn Sư',
    roleIdentity: 'Cosmic CDR & Boss Nuker', primaryAttr: 'int', secondaryAttr: 'dex',
    primaryEfficiencyBonusPct: 12, secondaryEfficiencyBonusPct: 6,
    hpBaseGrowthPerLevel: 22, mpBaseGrowthPerLevel: 22, atkBaseGrowthPerLevel: 1.1, matkBaseGrowthPerLevel: 5.5, defBaseGrowthPerLevel: 1.6, mdefBaseGrowthPerLevel: 3.1,
    signatureMechanics: ['Cooldown compression & boss magic penetration'],
  },
  shadowblade: {
    jobId: 'shadowblade', displayName: 'Shadowblade', displayNameVi: 'Ảnh Nhận',
    roleIdentity: 'Single-Target Execute Assassin', primaryAttr: 'agi', secondaryAttr: 'dex',
    primaryEfficiencyBonusPct: 12, secondaryEfficiencyBonusPct: 7,
    hpBaseGrowthPerLevel: 22, mpBaseGrowthPerLevel: 11, atkBaseGrowthPerLevel: 5.4, matkBaseGrowthPerLevel: 1.2, defBaseGrowthPerLevel: 1.7, mdefBaseGrowthPerLevel: 1.7,
    signatureMechanics: ['Highest single-target burst crits & executes'],
  },
  phantom: {
    jobId: 'phantom', displayName: 'Phantom', displayNameVi: 'Ảo Ảnh Sát Thủ',
    roleIdentity: 'Evasive Clone AoE Skirmisher', primaryAttr: 'agi', secondaryAttr: 'dex',
    primaryEfficiencyBonusPct: 12, secondaryEfficiencyBonusPct: 6,
    hpBaseGrowthPerLevel: 24, mpBaseGrowthPerLevel: 12, atkBaseGrowthPerLevel: 4.8, matkBaseGrowthPerLevel: 1.8, defBaseGrowthPerLevel: 2.0, mdefBaseGrowthPerLevel: 2.0,
    signatureMechanics: ['Illusion combos & high evasion survivability'],
  },
  martial_artist: {
    jobId: 'martial_artist', displayName: 'Martial Artist', displayNameVi: 'Võ Thánh',
    roleIdentity: 'Blazing Chi Armor-Breaker', primaryAttr: 'str', secondaryAttr: 'agi',
    primaryEfficiencyBonusPct: 12, secondaryEfficiencyBonusPct: 6,
    hpBaseGrowthPerLevel: 32, mpBaseGrowthPerLevel: 11, atkBaseGrowthPerLevel: 5.3, matkBaseGrowthPerLevel: 1.5, defBaseGrowthPerLevel: 2.6, mdefBaseGrowthPerLevel: 2.0,
    signatureMechanics: ['Heavy chi armor break & stun shockwaves'],
  },
  duelist: {
    jobId: 'duelist', displayName: 'Duelist', displayNameVi: 'Quyết Đấu Sư',
    roleIdentity: 'Counter-Strike Tempo Fighter', primaryAttr: 'dex', secondaryAttr: 'agi',
    primaryEfficiencyBonusPct: 12, secondaryEfficiencyBonusPct: 6,
    hpBaseGrowthPerLevel: 28, mpBaseGrowthPerLevel: 11, atkBaseGrowthPerLevel: 4.9, matkBaseGrowthPerLevel: 1.3, defBaseGrowthPerLevel: 2.3, mdefBaseGrowthPerLevel: 2.0,
    signatureMechanics: ['High ASPD chains, counter ripostes & PvP mobility'],
  },
  sniper: {
    jobId: 'sniper', displayName: 'Sniper', displayNameVi: 'Xạ Thủ Thần Tiễn',
    roleIdentity: 'Extreme-Range Boss Marksman', primaryAttr: 'dex', secondaryAttr: undefined,
    primaryEfficiencyBonusPct: 14, secondaryEfficiencyBonusPct: 0,
    hpBaseGrowthPerLevel: 21, mpBaseGrowthPerLevel: 12, atkBaseGrowthPerLevel: 5.6, matkBaseGrowthPerLevel: 1.3, defBaseGrowthPerLevel: 1.6, mdefBaseGrowthPerLevel: 1.7,
    signatureMechanics: ['Pure DEX accuracy & armor-piercing boss railshots'],
  },
  ranger: {
    jobId: 'ranger', displayName: 'Ranger', displayNameVi: 'Du Hiệp Rừng Thẳm',
    roleIdentity: 'Mobile AoE Trap Marksman', primaryAttr: 'agi', secondaryAttr: 'dex',
    primaryEfficiencyBonusPct: 12, secondaryEfficiencyBonusPct: 6,
    hpBaseGrowthPerLevel: 24, mpBaseGrowthPerLevel: 13, atkBaseGrowthPerLevel: 4.8, matkBaseGrowthPerLevel: 1.8, defBaseGrowthPerLevel: 1.9, mdefBaseGrowthPerLevel: 1.9,
    signatureMechanics: ['Kiting movement speed & elemental nature traps'],
  },
};

export function getJobAffinityForCharacter(classId?: string, advancedJobId?: string): JobAffinityConfig {
  if (advancedJobId && JOB_AFFINITY_CONFIGS[advancedJobId]) {
    return JOB_AFFINITY_CONFIGS[advancedJobId];
  }
  const norm = normalizeBaseClassId(classId);
  return JOB_AFFINITY_CONFIGS[norm] || JOB_AFFINITY_CONFIGS.adventurer;
}

// ==========================================
// LEVEL-AWARE ACCURACY VS EVASION & DAMAGE SAFETY
// ==========================================

export function computeLevelAwareHitChance(params: {
  attackerAccuracy: number;
  attackerLevel: number;
  defenderEvasionPct: number;
  defenderLevel: number;
}): { hitChancePct: number; isLevelDisadvantaged: boolean } {
  const acc = Math.max(0, Number(params.attackerAccuracy || 100));
  const atkLv = Math.max(1, Number(params.attackerLevel || 1));
  const defLv = Math.max(1, Number(params.defenderLevel || 1));
  const eva = Math.min(40, Math.max(0, Number(params.defenderEvasionPct || 0)));

  const levelDelta = atkLv - defLv;
  const levelAdjustment = Math.max(-18, Math.min(12, levelDelta * 1.1));
  const accContribution = Math.min(20, Math.max(-12, (acc - 100) * 0.12));
  const rawHit = 95 + levelAdjustment + accContribution - eva * 0.75;
  const hitChancePct = Math.max(55, Math.min(100, Number(rawHit.toFixed(1))));

  return {
    hitChancePct,
    isLevelDisadvantaged: atkLv + 5 <= defLv,
  };
}

export function computeSafeCombatDamage(params: {
  rawPower: number;
  targetDef: number;
  penetrationPct: number;
  targetDamageReductionPct: number;
  critical: boolean;
  critDamageMultiplierPct: number;
  modeMultiplier?: number;
  synergyDamageBonusPct?: number;
}): number {
  const safePower = Number.isFinite(params.rawPower) ? Math.max(1, params.rawPower) : 1;
  const pen = Math.min(50, Math.max(0, params.penetrationPct || 0)); // Hard safety ceiling
  const effectiveDef = Math.max(0, Math.round(Math.max(0, params.targetDef || 0) * (1 - pen / 100)));
  const postDef = Math.max(1, safePower - effectiveDef * 0.42);
  const synMult = 1 + Math.max(0, Math.min(80, params.synergyDamageBonusPct || 0)) / 100;
  const critMult = params.critical
    ? Math.max(1.5, Math.min(4.0, (params.critDamageMultiplierPct || 150) / 100))
    : 1.0;
  const dr = Math.min(50, Math.max(0, params.targetDamageReductionPct || 0)); // Never >= 100% immunity
  const modeMult = Math.max(0.25, Math.min(3.0, params.modeMultiplier ?? 1.0));
  const total = postDef * synMult * critMult * (1 - dr / 100) * modeMult;
  return Math.max(1, Math.min(9_999_999, Math.floor(total)));
}

// ==========================================
// PHASE 7: ONE CENTRALIZED AUTHORITATIVE STAT AGGREGATOR
// ==========================================

export interface StatAggregationInput {
  character: Partial<CharacterEntity>;
  itemsCatalog?: ItemEntity[];
  setsCatalog?: EquipmentSetDefinition[];
  uniqueCatalog?: UniqueEquipmentDefinition[];
  titlesCatalog?: TitleDefinition[];
  titleBonusLimits?: Partial<TitleBonusLimits>;
  skillsCatalog?: SkillDefinition[];
  guildSkills?: GuildSkillState[];
  guildBuildingLevels?: Record<string, number>;
  foodAndConsumableBuffs?: Array<{ stat: string; valuePct?: number; flatValue?: number }>;
  tempEventModifiers?: {
    atkPct?: number;
    matkPct?: number;
    expBonusPct?: number;
    critRatePct?: number;
    capDeltas?: Partial<Record<StatCapKey, number>>;
  };
  inlineEquipmentList?: Array<{
    atkBonus?: number;
    matkBonus?: number;
    defBonus?: number;
    mdefBonus?: number;
    hpBonus?: number;
    mpBonus?: number;
    critRate?: number;
    upgradeLevel?: number;
    id?: string;
  }>;
  previewPassiveAllocations?: Record<string, number>;
  previewBaseAttributes?: Partial<PrimaryAttributes>;
  mode?: CombatBalanceMode;
  nowMs?: number;
}

export function aggregateCharacterStats(
  input: StatAggregationInput
): AggregatedCharacterStatsResult {
  const char = input.character || {};
  const level = Math.max(1, Math.min(200, Math.floor(Number(char.level || 1))));
  const mode: CombatBalanceMode = input.mode || 'pve';
  const nowMs = input.nowMs ?? Date.now();
  const classId = char.classId || 'adventurer';
  const normBaseClass = normalizeBaseClassId(classId);
  const advBranchId = char.advancedJobId;
  const advBranch = advBranchId ? ADVANCED_JOB_BY_ID[advBranchId] : undefined;
  const jobAffinity = getJobAffinityForCharacter(normBaseClass, advBranchId);

  const itemsCatalog = input.itemsCatalog || INITIAL_ITEMS;
  const setsCatalog = input.setsCatalog || INITIAL_EQUIPMENT_SETS;
  const uniqueCatalog = input.uniqueCatalog || [];
  const titlesCatalog = input.titlesCatalog || [];
  const skillsCatalog = input.skillsCatalog || INITIAL_SKILLS;
  const upgradeLevels = (char as any).equipmentUpgradeLevels || {};

  // ---- STAGE 1: BASE STATS & LV.1-200 LEVEL GROWTH ----
  const rawBase: PrimaryAttributes = {
    str: Number(input.previewBaseAttributes?.str ?? char.baseStats?.str ?? char.attributes?.str ?? 10),
    dex: Number(input.previewBaseAttributes?.dex ?? char.baseStats?.dex ?? char.attributes?.dex ?? 10),
    agi: Number(input.previewBaseAttributes?.agi ?? char.baseStats?.agi ?? char.attributes?.agi ?? 10),
    int: Number(input.previewBaseAttributes?.int ?? char.baseStats?.int ?? char.attributes?.int ?? 10),
    con: Number(input.previewBaseAttributes?.con ?? char.baseStats?.con ?? char.attributes?.con ?? 10),
  };

  // ---- STAGE 2: FLAT & PCT SOURCE GATHERING ----
  const setStats = computeEquippedSetBonuses(char.equipment || {}, itemsCatalog, setsCatalog, upgradeLevels);
  const uniquePassives = computeUniqueEquipmentBonuses(char.equipment || {}, uniqueCatalog, upgradeLevels);
  const titleSummary = computePermanentTitleBonuses(
    char.unlockedTitles || [],
    titlesCatalog,
    input.titleBonusLimits,
    char.equippedCosmeticTitleId || null
  );
  const tb = titleSummary.cappedTotals;

  // Inline client/custom equipment items not present in catalog (deduplicated strictly)
  let inlineAtk = 0;
  let inlineMatk = 0;
  let inlineDef = 0;
  let inlineMdef = 0;
  let inlineHp = 0;
  let inlineMp = 0;
  let inlineCrit = 0;
  for (const eq of input.inlineEquipmentList || []) {
    if (!eq || (eq.id && itemsCatalog.some((c: any) => c.id === eq.id))) continue;
    const mult = 1 + (eq.upgradeLevel || 0) * 0.08;
    inlineAtk += Math.round((eq.atkBonus || 0) * mult);
    inlineMatk += Math.round((eq.matkBonus || 0) * mult);
    inlineDef += Math.round((eq.defBonus || 0) * mult);
    inlineMdef += Math.round((eq.mdefBonus || 0) * mult);
    inlineHp += Math.round((eq.hpBonus || 0) * mult);
    inlineMp += Math.round((eq.mpBonus || 0) * mult);
    inlineCrit += Number(eq.critRate || 0);
  }

  // Compatible skill passives & active buffs (activeBuffs)
  const compatibleUnlocked = (char.unlockedSkills || []).filter((sid) => {
    const def = skillsCatalog.find((s) => s.id === sid);
    return !def?.advancedBranchId || def.advancedBranchId === advBranchId;
  });
  const skillAndBuffMods = computePassiveAndBuffModifiers(
    classId,
    char.skillLevels || {},
    compatibleUnlocked,
    char.activeBuffs || {},
    skillsCatalog,
    nowMs
  );

  // Guild buildings & guild combat research skills
  const guildAcc = { atkPct: 0, defPct: 0, mdefPct: 0, matkPct: 0, expBonusPct: 0, bossDamagePct: 0 };
  const trainingGroundLv = Math.max(0, Number(input.guildBuildingLevels?.training_ground || 0));
  if (trainingGroundLv > 0) {
    guildAcc.atkPct += trainingGroundLv * 1.5;
    guildAcc.defPct += trainingGroundLv * 1.5;
    guildAcc.bossDamagePct += trainingGroundLv * 2;
  }
  for (const gs of input.guildSkills || []) {
    const lv = Math.max(0, Math.min(gs.maxLevel || 10, Number(gs.level || 0)));
    if (lv <= 0) continue;
    const bonus = lv * Number(gs.bonusPerLevelPct || 0);
    if (gs.statKey === 'atkPct') {
      guildAcc.atkPct += bonus;
      guildAcc.matkPct += bonus;
    } else if (gs.statKey === 'defPct') {
      guildAcc.defPct += bonus;
      guildAcc.mdefPct += bonus;
    } else if (gs.statKey === 'expBonusPct') {
      guildAcc.expBonusPct += bonus;
    }
  }

  // Consumables & Food buffs
  const foodAcc = { atkPct: 0, matkPct: 0, hpPct: 0, defPct: 0, critRatePct: 0, moveSpeedPct: 0, expBonusPct: 0 };
  for (const fb of input.foodAndConsumableBuffs || []) {
    const val = Number(fb.valuePct ?? fb.flatValue ?? 0);
    if (!val) continue;
    if (fb.stat === 'atkPct') { foodAcc.atkPct += val; foodAcc.matkPct += val; }
    else if (fb.stat === 'matkPct') foodAcc.matkPct += val;
    else if (fb.stat === 'maxHpPct' || fb.stat === 'hpPct') foodAcc.hpPct += val;
    else if (fb.stat === 'defPct') foodAcc.defPct += val;
    else if (fb.stat === 'critRatePct') foodAcc.critRatePct += val;
    else if (fb.stat === 'moveSpeedPct') foodAcc.moveSpeedPct += val;
    else if (fb.stat === 'expBonusPct') foodAcc.expBonusPct += val;
    else if (fb.stat === 'allCombatAndExp') {
      foodAcc.atkPct += Math.round(val * 0.66);
      foodAcc.matkPct += Math.round(val * 0.66);
      foodAcc.expBonusPct += val;
    }
  }

  // ---- STAGE 2b: PASSIVE SKILL TREE AGGREGATION ----
  const passiveAllocations = input.previewPassiveAllocations ?? char.passiveAllocations ?? {};
  const pasFlatAttrs: PrimaryAttributes = { str: 0, dex: 0, agi: 0, int: 0, con: 0 };
  const pasStats: Record<string, number> = {
    atkPct: 0, matkPct: 0, defPct: 0, mdefPct: 0, hpPct: 0, mpPct: 0,
    critRatePct: 0, critDamageBonusPct: 0, aspdBonusPct: 0, cooldownReductionPct: 0,
    moveSpeedBonusPct: 0, evasionPct: 0, accuracy: 0, armorPenetrationPct: 0,
    magicPenetrationPct: 0, damageReductionPct: 0, healingBonusPct: 0,
    lifestealPct: 0, statusResistancePct: 0, skillDamagePct: 0,
    resourceEfficiencyPct: 0, elementalDamagePct: 0, comboBonusPct: 0, shieldBonusPct: 0,
  };
  const activePassives: AggregatedCharacterStatsResult['activePassives'] = [];
  const synergyBonusesBySkillId: AggregatedCharacterStatsResult['synergyBonusesBySkillId'] = {};

  for (const [pid, rawRank] of Object.entries(passiveAllocations)) {
    const rank = Math.max(0, Math.floor(Number(rawRank || 0)));
    if (rank <= 0) continue;
    const def = PASSIVE_BY_ID[pid];
    if (!def) continue;
    if (def.branchRequirement && def.branchRequirement !== advBranchId) continue;
    if (!def.branchRequirement && def.classRequirement !== 'any' && def.classRequirement !== normBaseClass) continue;
    if (level < def.requiredCharacterLevel) continue;

    const clampedRank = Math.min(def.maxRank, rank);
    const modeMod =
      mode === 'pvp' ? def.pvpModifier : mode === 'boss' ? def.bossModifier : def.pveModifier;

    activePassives.push({
      passiveId: def.id,
      name: def.name,
      rank: clampedRank,
      category: def.category,
      synergySkillId: def.synergySkillId,
    });

    for (const eff of def.effects) {
      const scaled = eff.valuePerRank * clampedRank * (eff.isPercentage ? modeMod : 1);
      if (eff.stat === 'str' || eff.stat === 'dex' || eff.stat === 'agi' || eff.stat === 'int' || eff.stat === 'con') {
        pasFlatAttrs[eff.stat] += Math.round(scaled);
      } else if (eff.stat in pasStats) {
        pasStats[eff.stat] += scaled;
      }
    }

    if (def.synergySkillId) {
      const masteryPts = Number(char.skillMastery?.[def.synergySkillId]?.points || 0);
      const masteryBoostFactor = 1 + Math.min(0.5, masteryPts * 0.005);
      const prevSyn = synergyBonusesBySkillId[def.synergySkillId] || {
        damageBonusPct: 0,
        critBonusPct: 0,
        cooldownReductionPct: 0,
        extraResourceSavePct: 0,
      };
      prevSyn.damageBonusPct += Number((clampedRank * 3.5 * masteryBoostFactor).toFixed(1));
      prevSyn.critBonusPct += Number((clampedRank * 1.5 * masteryBoostFactor).toFixed(1));
      prevSyn.cooldownReductionPct += Number((clampedRank * 1.5).toFixed(1));
      synergyBonusesBySkillId[def.synergySkillId] = prevSyn;
    }
  }

  // ---- STAGE 3 & 4: EFFECTIVE ATTRIBUTES + JOB AFFINITY ----
  const branchBonusAttrs = advBranch?.statBonuses || { str: 0, dex: 0, agi: 0, int: 0, con: 0 };
  const flatAttrs: PrimaryAttributes = {
    str: Math.round(rawBase.str + setStats.bonusPrimary.str + uniquePassives.str + tb.str + branchBonusAttrs.str + pasFlatAttrs.str),
    dex: Math.round(rawBase.dex + setStats.bonusPrimary.dex + uniquePassives.dex + tb.dex + branchBonusAttrs.dex + pasFlatAttrs.dex),
    agi: Math.round(rawBase.agi + setStats.bonusPrimary.agi + uniquePassives.agi + tb.agi + branchBonusAttrs.agi + pasFlatAttrs.agi),
    int: Math.round(rawBase.int + setStats.bonusPrimary.int + uniquePassives.int + tb.int + branchBonusAttrs.int + pasFlatAttrs.int),
    con: Math.round(rawBase.con + setStats.bonusPrimary.con + uniquePassives.con + tb.con + branchBonusAttrs.con + pasFlatAttrs.con),
  };

  // Controlled Job Affinity: adds efficiency only to points above base 10! Off-meta stays viable.
  const applyAffinity = (attrKey: keyof PrimaryAttributes, val: number): { total: number; bonusFromAffinity: number } => {
    const invested = Math.max(0, val - 10);
    let pct = 0;
    if (jobAffinity.primaryAttr === attrKey) pct = jobAffinity.primaryEfficiencyBonusPct;
    else if (jobAffinity.secondaryAttr === attrKey) pct = jobAffinity.secondaryEfficiencyBonusPct;
    const bonusFromAffinity = Math.round(invested * (pct / 100));
    return { total: val + bonusFromAffinity, bonusFromAffinity };
  };

  const strAff = applyAffinity('str', flatAttrs.str);
  const dexAff = applyAffinity('dex', flatAttrs.dex);
  const agiAff = applyAffinity('agi', flatAttrs.agi);
  const intAff = applyAffinity('int', flatAttrs.int);
  const conAff = applyAffinity('con', flatAttrs.con);

  const effectiveAttributes: PrimaryAttributes = {
    str: strAff.total,
    dex: dexAff.total,
    agi: agiAff.total,
    int: intAff.total,
    con: conAff.total,
  };
  const affinityAdjustedBonusAttrs: PrimaryAttributes = {
    str: strAff.bonusFromAffinity,
    dex: dexAff.bonusFromAffinity,
    agi: agiAff.bonusFromAffinity,
    int: intAff.bonusFromAffinity,
    con: conAff.bonusFromAffinity,
  };

  // ---- STAGE 3 & 5: PRIMARY VITALS & OFFENSE/DEFENSE (LV.1-200 GROWTH, NO BLIND HARD CAP!) ----
  const lvGrowthSteps = Math.max(0, level - 1);
  const rawHp =
    100 +
    effectiveAttributes.con * 20 +
    lvGrowthSteps * jobAffinity.hpBaseGrowthPerLevel +
    setStats.maxHp +
    inlineHp +
    uniquePassives.maxHp +
    tb.maxHp;
  const rawMp =
    50 +
    effectiveAttributes.int * 15 +
    lvGrowthSteps * jobAffinity.mpBaseGrowthPerLevel +
    setStats.maxMp +
    inlineMp +
    uniquePassives.maxMp +
    tb.maxMp;
  const rawAtk =
    10 +
    effectiveAttributes.str * 2.1 +
    effectiveAttributes.dex * 0.65 +
    lvGrowthSteps * jobAffinity.atkBaseGrowthPerLevel +
    setStats.atk +
    inlineAtk +
    uniquePassives.atk +
    tb.atk;
  const rawMatk =
    10 +
    effectiveAttributes.int * 2.2 +
    effectiveAttributes.dex * 0.4 +
    lvGrowthSteps * jobAffinity.matkBaseGrowthPerLevel +
    setStats.matk +
    inlineMatk +
    uniquePassives.matk +
    tb.matk;
  const rawDef =
    4 +
    effectiveAttributes.con * 0.9 +
    effectiveAttributes.agi * 0.35 +
    lvGrowthSteps * jobAffinity.defBaseGrowthPerLevel +
    setStats.def +
    inlineDef +
    uniquePassives.def +
    tb.def;
  const rawMdef =
    4 +
    effectiveAttributes.int * 0.65 +
    effectiveAttributes.con * 0.45 +
    lvGrowthSteps * jobAffinity.mdefBaseGrowthPerLevel +
    setStats.mdef +
    inlineMdef +
    uniquePassives.mdef +
    tb.mdef;

  const pctHp = skillAndBuffMods.hpPct + uniquePassives.hpPct + tb.hpPct + pasStats.hpPct + foodAcc.hpPct;
  const pctMp = skillAndBuffMods.mpPct + tb.mpPct + pasStats.mpPct;
  const pctAtk = skillAndBuffMods.atkPct + uniquePassives.atkPct + tb.atkPct + pasStats.atkPct + guildAcc.atkPct + foodAcc.atkPct + (input.tempEventModifiers?.atkPct || 0);
  const pctMatk = skillAndBuffMods.matkPct + uniquePassives.matkPct + tb.matkPct + pasStats.matkPct + guildAcc.matkPct + foodAcc.matkPct + (input.tempEventModifiers?.matkPct || 0);
  const pctDef = skillAndBuffMods.defPct + uniquePassives.defPct + tb.defPct + pasStats.defPct + guildAcc.defPct + foodAcc.defPct;
  const pctMdef = skillAndBuffMods.mdefPct + tb.mdefPct + pasStats.mdefPct + guildAcc.defPct;

  const deathPenaltyState = getActiveDeathPenaltyReductionPct(char, nowMs);
  const dpMult = deathPenaltyState.active
    ? Math.max(0.5, 1 - deathPenaltyState.statReductionPct / 100)
    : 1;

  const maxHp = Math.max(100, Math.min(9_999_999, Math.round(rawHp * (1 + pctHp / 100) * dpMult)));
  const maxMp = Math.max(50, Math.min(999_999, Math.round(rawMp * (1 + pctMp / 100) * dpMult)));
  const atk = Math.max(1, Math.min(999_999, Math.round(rawAtk * (1 + pctAtk / 100) * dpMult)));
  const matk = Math.max(1, Math.min(999_999, Math.round(rawMatk * (1 + pctMatk / 100) * dpMult)));
  const def = Math.max(0, Math.min(999_999, Math.round(rawDef * (1 + pctDef / 100) * dpMult)));
  const mdef = Math.max(0, Math.min(999_999, Math.round(rawMdef * (1 + pctMdef / 100) * dpMult)));

  // ---- STAGE 6 & 7: SECONDARY STATS THROUGH MONOTONIC DR & HARD CAPS ----
  const rawSourcesByCapStat: Record<StatCapKey, { raw: number; sources: Partial<StatSourceBreakdown> }> = {
    critRatePct: {
      raw:
        5 +
        effectiveAttributes.agi * 0.2 +
        effectiveAttributes.dex * 0.2 +
        setStats.critRatePct +
        inlineCrit +
        uniquePassives.critRatePct +
        tb.critRatePct +
        skillAndBuffMods.critRatePct +
        pasStats.critRatePct +
        (advBranch?.combatModifiers.critRateBonusPct || 0) +
        foodAcc.critRatePct +
        (input.tempEventModifiers?.critRatePct || 0),
      sources: {
        baseAndLevel: Number((5 + effectiveAttributes.agi * 0.2 + effectiveAttributes.dex * 0.2).toFixed(1)),
        equipmentAndSets: setStats.critRatePct + inlineCrit,
        uniqueItems: uniquePassives.critRatePct,
        titles: tb.critRatePct,
        skillsAndBuffs: skillAndBuffMods.critRatePct,
        passives: Number(pasStats.critRatePct.toFixed(1)),
        jobAffinity: advBranch?.combatModifiers.critRateBonusPct || 0,
        consumablesAndFood: foodAcc.critRatePct,
        eventTemp: input.tempEventModifiers?.critRatePct || 0,
      },
    },
    critDamageBonusPct: {
      raw:
        setStats.critDamagePct +
        uniquePassives.critDamagePct +
        tb.critDamagePct +
        skillAndBuffMods.critDamagePct +
        pasStats.critDamageBonusPct +
        (advBranch?.combatModifiers.critDamageBonusPct || 0),
      sources: {
        equipmentAndSets: setStats.critDamagePct,
        uniqueItems: uniquePassives.critDamagePct,
        titles: tb.critDamagePct,
        skillsAndBuffs: skillAndBuffMods.critDamagePct,
        passives: Number(pasStats.critDamageBonusPct.toFixed(1)),
        jobAffinity: advBranch?.combatModifiers.critDamageBonusPct || 0,
      },
    },
    aspdBonusPct: {
      raw:
        effectiveAttributes.agi * 0.15 +
        setStats.aspdPct +
        skillAndBuffMods.aspdPct +
        pasStats.aspdBonusPct,
      sources: {
        baseAndLevel: Number((effectiveAttributes.agi * 0.15).toFixed(1)),
        equipmentAndSets: setStats.aspdPct,
        skillsAndBuffs: skillAndBuffMods.aspdPct,
        passives: Number(pasStats.aspdBonusPct.toFixed(1)),
      },
    },
    cooldownReductionPct: {
      raw:
        pasStats.cooldownReductionPct +
        (advBranch?.combatModifiers.cooldownReductionPct || 0) +
        Math.min(10, effectiveAttributes.int * 0.04),
      sources: {
        baseAndLevel: Number(Math.min(10, effectiveAttributes.int * 0.04).toFixed(1)),
        passives: Number(pasStats.cooldownReductionPct.toFixed(1)),
        jobAffinity: advBranch?.combatModifiers.cooldownReductionPct || 0,
      },
    },
    moveSpeedBonusPct: {
      raw:
        setStats.moveSpeedPct +
        uniquePassives.moveSpeedPct +
        tb.moveSpeedPct +
        skillAndBuffMods.moveSpeedPct +
        pasStats.moveSpeedBonusPct +
        foodAcc.moveSpeedPct,
      sources: {
        equipmentAndSets: setStats.moveSpeedPct,
        uniqueItems: uniquePassives.moveSpeedPct,
        titles: tb.moveSpeedPct,
        skillsAndBuffs: skillAndBuffMods.moveSpeedPct,
        passives: Number(pasStats.moveSpeedBonusPct.toFixed(1)),
        consumablesAndFood: foodAcc.moveSpeedPct,
      },
    },
    evasionPct: {
      raw: 4 + effectiveAttributes.agi * 0.18 + skillAndBuffMods.fleeFlat * 0.12 + pasStats.evasionPct,
      sources: {
        baseAndLevel: Number((4 + effectiveAttributes.agi * 0.18).toFixed(1)),
        skillsAndBuffs: Number((skillAndBuffMods.fleeFlat * 0.12).toFixed(1)),
        passives: Number(pasStats.evasionPct.toFixed(1)),
      },
    },
    armorPenetrationPct: {
      raw: pasStats.armorPenetrationPct + Math.min(10, effectiveAttributes.dex * 0.05),
      sources: {
        baseAndLevel: Number(Math.min(10, effectiveAttributes.dex * 0.05).toFixed(1)),
        passives: Number(pasStats.armorPenetrationPct.toFixed(1)),
      },
    },
    magicPenetrationPct: {
      raw: pasStats.magicPenetrationPct + Math.min(10, effectiveAttributes.int * 0.05),
      sources: {
        baseAndLevel: Number(Math.min(10, effectiveAttributes.int * 0.05).toFixed(1)),
        passives: Number(pasStats.magicPenetrationPct.toFixed(1)),
      },
    },
    damageReductionPct: {
      raw:
        setStats.damageReductionPct +
        uniquePassives.damageReductionPct +
        tb.damageReductionPct +
        skillAndBuffMods.damageReductionPct +
        pasStats.damageReductionPct +
        (advBranch?.combatModifiers.damageReductionPct || 0),
      sources: {
        equipmentAndSets: setStats.damageReductionPct,
        uniqueItems: uniquePassives.damageReductionPct,
        titles: tb.damageReductionPct,
        skillsAndBuffs: skillAndBuffMods.damageReductionPct,
        passives: Number(pasStats.damageReductionPct.toFixed(1)),
        jobAffinity: advBranch?.combatModifiers.damageReductionPct || 0,
      },
    },
    healingBonusPct: {
      raw:
        setStats.healingPowerPct +
        uniquePassives.healingPowerPct +
        tb.healingPowerPct +
        skillAndBuffMods.healingPowerPct +
        pasStats.healingBonusPct +
        (advBranch?.combatModifiers.healingPowerBonusPct || 0),
      sources: {
        equipmentAndSets: setStats.healingPowerPct,
        uniqueItems: uniquePassives.healingPowerPct,
        titles: tb.healingPowerPct,
        skillsAndBuffs: skillAndBuffMods.healingPowerPct,
        passives: Number(pasStats.healingBonusPct.toFixed(1)),
        jobAffinity: advBranch?.combatModifiers.healingPowerBonusPct || 0,
      },
    },
    lifestealPct: {
      raw: setStats.lifestealPct + skillAndBuffMods.lifestealPct + pasStats.lifestealPct,
      sources: {
        equipmentAndSets: setStats.lifestealPct,
        skillsAndBuffs: skillAndBuffMods.lifestealPct,
        passives: Number(pasStats.lifestealPct.toFixed(1)),
      },
    },
    statusResistancePct: {
      raw: Math.min(15, effectiveAttributes.con * 0.08) + pasStats.statusResistancePct,
      sources: {
        baseAndLevel: Number(Math.min(15, effectiveAttributes.con * 0.08).toFixed(1)),
        passives: Number(pasStats.statusResistancePct.toFixed(1)),
      },
    },
  };

  const breakdowns = {} as Record<StatCapKey, AggregatedStatBreakdownEntry>;
  const warnings: string[] = [];
  const warningsVi: string[] = [];

  for (const key of Object.keys(STAT_CAP_RULES) as StatCapKey[]) {
    const rule = STAT_CAP_RULES[key];
    const entry = rawSourcesByCapStat[key];
    const tempDelta = input.tempEventModifiers?.capDeltas?.[key] || 0;
    const dr = applyDiminishingReturns(entry.raw, rule, mode, tempDelta);

    let warningMessage: string | undefined;
    let warningMessageVi: string | undefined;
    if (dr.atHardCap) {
      warningMessage = `${rule.label}: ${dr.effectiveValue}${rule.unit} (Raw ${entry.raw.toFixed(1)}${rule.unit}). At Hard Cap (${dr.ceilingUsed}${rule.unit}); excess points yield 0 gain.`;
      warningMessageVi = `${rule.labelVi}: ${dr.effectiveValue}${rule.unit} (Thô ${entry.raw.toFixed(1)}${rule.unit}). Đã chạm Hard Cap (${dr.ceilingUsed}${rule.unit}); điểm dồn thêm không còn tác dụng.`;
      warnings.push(warningMessage);
      warningsVi.push(warningMessageVi);
    } else if (dr.inDiminishingReturns) {
      warningMessage = `${rule.label}: ${dr.effectiveValue}${rule.unit} (Raw ${entry.raw.toFixed(1)}${rule.unit}). Above Soft Cap (${rule.softCap1}${rule.unit}); additional investment has reduced effectiveness.`;
      warningMessageVi = `${rule.labelVi}: ${dr.effectiveValue}${rule.unit} (Thô ${entry.raw.toFixed(1)}${rule.unit}). Vượt Soft Cap (${rule.softCap1}${rule.unit}); điểm cộng thêm bị giảm hiệu suất (${entry.raw > rule.hardCap2 ? '10%' : '50%'}).`;
      warnings.push(warningMessage);
      warningsVi.push(warningMessageVi);
    }

    breakdowns[key] = {
      statKey: key,
      label: rule.label,
      labelVi: rule.labelVi,
      rawBeforeDr: Number(entry.raw.toFixed(2)),
      effectiveValue: dr.effectiveValue,
      softCap1: rule.softCap1,
      hardCap2: rule.hardCap2,
      hardCeiling: dr.ceilingUsed,
      inDiminishingReturns: dr.inDiminishingReturns,
      atHardCap: dr.atHardCap,
      warningMessage,
      warningMessageVi,
      sources: entry.sources,
    };
  }

  const accuracy = Math.max(
    50,
    Math.round((92 + effectiveAttributes.dex * 1.6 + skillAndBuffMods.hitFlat + pasStats.accuracy) * dpMult)
  );
  const drEffective = breakdowns.damageReductionPct.effectiveValue;
  const effectiveHp = Math.round(
    maxHp * (1 + def / (120 + level * 4)) / Math.max(0.5, 1 - drEffective / 100)
  );

  // ---- STAGE 8: MODE MODIFIERS & PASSIVE POINTS SUMMARY ----
  const pveDamageMultiplier = Number((1 + (advBranch?.combatModifiers.pveDamageBonusPct || 0) / 100).toFixed(3));
  const pvpDamageMultiplier = Number(((advBranch?.combatModifiers.pvpDamageModifierPct ?? 95) / 100).toFixed(3));
  const bossDamageMultiplier = Number(
    (1 + ((advBranch?.combatModifiers.bossDamageBonusPct || 0) + guildAcc.bossDamagePct) / 100).toFixed(3)
  );

  const earnedInfo = computeEarnedPassivePoints(char);
  const spent = computePassivePointsSpent(passiveAllocations);

  return {
    characterId: char.id || 'preview',
    classId,
    advancedJobId: advBranchId,
    level,
    mode,
    calculationOrder: STAT_CALCULATION_ORDER,
    baseAttributes: rawBase,
    effectiveAttributes,
    affinityAdjustedBonusAttrs,
    secondaryStats: {
      maxHp,
      maxMp,
      atk,
      matk,
      def,
      mdef,
      critRatePct: Number((breakdowns.critRatePct.effectiveValue * dpMult).toFixed(1)),
      critDamageBonusPct: Number((breakdowns.critDamageBonusPct.effectiveValue * dpMult).toFixed(1)),
      critDamageMultiplierPct: Number((150 + breakdowns.critDamageBonusPct.effectiveValue * dpMult).toFixed(1)),
      aspdBonusPct: Number((breakdowns.aspdBonusPct.effectiveValue * dpMult).toFixed(1)),
      aspdPct: Number((100 + breakdowns.aspdBonusPct.effectiveValue * dpMult).toFixed(1)),
      cooldownReductionPct: Number((breakdowns.cooldownReductionPct.effectiveValue * dpMult).toFixed(1)),
      moveSpeedBonusPct: Number((breakdowns.moveSpeedBonusPct.effectiveValue * dpMult).toFixed(1)),
      moveSpeedPct: Number((100 + breakdowns.moveSpeedBonusPct.effectiveValue * dpMult).toFixed(1)),
      evasionPct: Number((breakdowns.evasionPct.effectiveValue * dpMult).toFixed(1)),
      accuracy,
      accuracyBonusPct: Number(Math.max(0, (accuracy - 100) * 0.12).toFixed(1)),
      armorPenetrationPct: Number((breakdowns.armorPenetrationPct.effectiveValue * dpMult).toFixed(1)),
      magicPenetrationPct: Number((breakdowns.magicPenetrationPct.effectiveValue * dpMult).toFixed(1)),
      damageReductionPct: Number((drEffective * dpMult).toFixed(1)),
      healingBonusPct: Number((breakdowns.healingBonusPct.effectiveValue * dpMult).toFixed(1)),
      lifestealPct: Number((breakdowns.lifestealPct.effectiveValue * dpMult).toFixed(1)),
      statusResistancePct: Number((breakdowns.statusResistancePct.effectiveValue * dpMult).toFixed(1)),
      skillDamagePct: Number(((setStats.skillDamagePct + skillAndBuffMods.skillDamagePct + uniquePassives.skillDamagePct + tb.skillDamagePct + pasStats.skillDamagePct) * dpMult).toFixed(1)),
      resourceEfficiencyPct: Math.min(45, Number((skillAndBuffMods.mpCostReductionPct + pasStats.resourceEfficiencyPct).toFixed(1))),
      elementalDamagePct: Number((pasStats.elementalDamagePct * dpMult).toFixed(1)),
      comboBonusPct: Number((pasStats.comboBonusPct * dpMult).toFixed(1)),
      shieldBonusPct: Number((pasStats.shieldBonusPct * dpMult).toFixed(1)),
      expBonusPct: Number((tb.expBonusPct + guildAcc.expBonusPct + foodAcc.expBonusPct + (input.tempEventModifiers?.expBonusPct || 0)).toFixed(1)),
      goldBonusPct: Number(tb.goldBonusPct.toFixed(1)),
      effectiveHp,
    },
    breakdowns,
    warnings,
    warningsVi,
    jobAffinity,
    activePassives,
    synergyBonusesBySkillId,
    pveDamageMultiplier,
    pvpDamageMultiplier,
    bossDamageMultiplier,
    deathPenaltyApplied: {
      active: deathPenaltyState.active,
      tier: deathPenaltyState.penalty?.tier,
      statReductionPct: deathPenaltyState.statReductionPct,
      expiresAt: deathPenaltyState.penalty?.expiresAt,
      stackingCount: deathPenaltyState.penalty?.stackingCount,
    },
    passivePointsSummary: {
      earned: earnedInfo.earned,
      spent,
      available: Math.max(0, earnedInfo.earned - spent),
      masteryBonusPoints: earnedInfo.fromMastery,
    },
  };
}

// ==========================================
// LV.1 - LV.200 BALANCE TABLE FOR ALL 16 ADVANCED JOBS
// ==========================================

export function generateLv1To200BalanceTable(
  levels: number[] = [1, 15, 40, 60, 80, 100, 120, 150, 180, 200]
) {
  const rows: Array<{
    jobId: string;
    jobName: string;
    level: number;
    maxHp: number;
    maxMp: number;
    atk: number;
    matk: number;
    def: number;
    mdef: number;
    effectiveHp: number;
    primaryAttr: string;
    secondaryAttr?: string;
  }> = [];

  for (const jobId of Object.keys(ADVANCED_JOB_BY_ID)) {
    const job = ADVANCED_JOB_BY_ID[jobId];
    const aff = JOB_AFFINITY_CONFIGS[jobId];
    for (const lv of levels) {
      const investable = (lv - 1) * 4;
      const attrs: PrimaryAttributes = { str: 10, dex: 10, agi: 10, int: 10, con: 10 };
      attrs[aff.primaryAttr] += Math.round(investable * (aff.secondaryAttr ? 0.62 : 0.8));
      if (aff.secondaryAttr) attrs[aff.secondaryAttr] += Math.round(investable * 0.28);
      else attrs.con += Math.round(investable * 0.12);

      const agg = aggregateCharacterStats({
        character: {
          id: `bal_${jobId}_${lv}`,
          classId: job.parentClassId,
          advancedJobId: lv >= 80 ? job.id : undefined,
          level: lv,
          baseStats: attrs,
          unlockedSkills: [],
        },
      });
      rows.push({
        jobId: job.id,
        jobName: job.name,
        level: lv,
        maxHp: agg.secondaryStats.maxHp,
        maxMp: agg.secondaryStats.maxMp,
        atk: agg.secondaryStats.atk,
        matk: agg.secondaryStats.matk,
        def: agg.secondaryStats.def,
        mdef: agg.secondaryStats.mdef,
        effectiveHp: agg.secondaryStats.effectiveHp,
        primaryAttr: aff.primaryAttr,
        secondaryAttr: aff.secondaryAttr,
      });
    }
  }
  return rows;
}
