import {
  AdvancedJobId,
  CharacterEntity,
  FirstJobClassId,
  PassiveActivationCondition,
  PassiveCategory,
  PassiveDefinition,
  PassiveEffectType,
  PassivePointTransaction,
  PassiveStatEffectEntry,
} from '@elysia/game-types';
import { normalizeBaseClassId } from './advancedEvolution.js';

function makePassive(input: {
  id: string;
  name: string;
  nameVi: string;
  description: string;
  descriptionVi: string;
  category: PassiveCategory;
  classRequirement: FirstJobClassId | AdvancedJobId | 'any';
  branchRequirement?: AdvancedJobId;
  parentPassiveIds?: string[];
  mutuallyExclusiveGroup?: string;
  requiredCharacterLevel: number;
  requiredJobLevel: number;
  requiredMasteryPoints?: number;
  synergySkillId?: string;
  maxRank: number;
  pointCostPerRank?: number;
  effectType: PassiveEffectType;
  effects: PassiveStatEffectEntry[];
  activationCondition?: PassiveActivationCondition;
  internalCooldownMs?: number;
  stackingRule?: 'additive' | 'multiplicative_diminishing' | 'highest_only';
  pveModifier?: number;
  pvpModifier?: number;
  bossModifier?: number;
  isSignature?: boolean;
  tierColumn?: number;
  tierRow?: number;
}): PassiveDefinition {
  return {
    passive_id: input.id,
    id: input.id,
    name: input.name,
    nameVi: input.nameVi,
    description: input.description,
    descriptionVi: input.descriptionVi,
    category: input.category,
    classRequirement: input.classRequirement,
    branchRequirement: input.branchRequirement,
    parentPassiveIds: input.parentPassiveIds || [],
    mutuallyExclusiveGroup: input.mutuallyExclusiveGroup,
    requiredCharacterLevel: input.requiredCharacterLevel,
    requiredJobLevel: input.requiredJobLevel,
    requiredMasteryPoints: input.requiredMasteryPoints ?? 0,
    synergySkillId: input.synergySkillId,
    maxRank: input.maxRank,
    pointCostPerRank: input.pointCostPerRank ?? 1,
    effectType: input.effectType,
    effects: input.effects,
    activationCondition: input.activationCondition || {
      type: 'always',
      description: 'Always active while requirements are met.',
      descriptionVi: 'Luôn kích hoạt khi đủ điều kiện nghề nghiệp.',
    },
    internalCooldownMs: input.internalCooldownMs ?? 0,
    stackingRule: input.stackingRule ?? 'additive',
    pveModifier: input.pveModifier ?? 1.0,
    pvpModifier: input.pvpModifier ?? 0.9,
    bossModifier: input.bossModifier ?? 1.0,
    iconUrl: `/assets/elysia/ui/passives/${input.id}.png`,
    isSignature: Boolean(input.isSignature),
    tierColumn: input.tierColumn ?? 1,
    tierRow: input.tierRow ?? 1,
  };
}

// ==========================================
// PHASE 3: 8 BASE JOB PASSIVES (8 x 4 = 32)
// ==========================================

export const BASE_JOB_PASSIVES: PassiveDefinition[] = [
  // 1. SWORDSMAN
  makePassive({
    id: 'pas_sw_sword_technique',
    name: 'Sword Technique',
    nameVi: 'Kiếm Kỹ Cơ Bản',
    description: 'Fundamental blade stance increasing ATK% and STR.',
    descriptionVi: 'Tăng ATK% và STR cơ bản cho Kiếm Sĩ.',
    category: 'core',
    classRequirement: 'swordsman',
    requiredCharacterLevel: 15,
    requiredJobLevel: 15,
    maxRank: 5,
    effectType: 'damage_mult',
    effects: [
      { stat: 'atkPct', effectType: 'damage_mult', valuePerRank: 2.5, isPercentage: true },
      { stat: 'str', effectType: 'flat_attr', valuePerRank: 2, isPercentage: false },
    ],
    tierRow: 1,
    tierColumn: 1,
    isSignature: true,
  }),
  makePassive({
    id: 'pas_sw_combat_focus',
    name: 'Combat Focus',
    nameVi: 'Tập Trung Chiến Đấu',
    description: 'Sharpens precision in duels, raising Crit Rate and Accuracy.',
    descriptionVi: 'Tăng Tỷ lệ Chí Mạng và Chính Xác khi giao chiến.',
    category: 'combat',
    classRequirement: 'swordsman',
    parentPassiveIds: ['pas_sw_sword_technique'],
    requiredCharacterLevel: 22,
    requiredJobLevel: 22,
    maxRank: 5,
    effectType: 'crit_rate',
    effects: [
      { stat: 'critRatePct', effectType: 'crit_rate', valuePerRank: 1.8, isPercentage: true },
      { stat: 'accuracy', effectType: 'accuracy', valuePerRank: 6, isPercentage: false },
    ],
    tierRow: 2,
    tierColumn: 1,
  }),
  makePassive({
    id: 'pas_sw_blade_control',
    name: 'Blade Control',
    nameVi: 'Khống Chế Kiếm Thế',
    description: 'Precision edge angles increase Skill Damage and Armor Penetration.',
    descriptionVi: 'Tăng Sát thương Kỹ năng và Xuyên Giáp vật lý.',
    category: 'combat',
    classRequirement: 'swordsman',
    parentPassiveIds: ['pas_sw_sword_technique'],
    requiredCharacterLevel: 30,
    requiredJobLevel: 30,
    maxRank: 5,
    effectType: 'armor_penetration',
    effects: [
      { stat: 'skillDamagePct', effectType: 'damage_mult', valuePerRank: 2.2, isPercentage: true },
      { stat: 'armorPenetrationPct', effectType: 'armor_penetration', valuePerRank: 2.0, isPercentage: true },
    ],
    tierRow: 2,
    tierColumn: 2,
  }),
  makePassive({
    id: 'pas_sw_weapon_discipline',
    name: 'Weapon Discipline',
    nameVi: 'Kỷ Luật Binh Khí',
    description: 'Combat Mastery passive boosting Attack Speed and consecutive hit combo damage.',
    descriptionVi: 'Nội tại Thông Thạo: tăng Tốc Độ Đánh và uy lực chuỗi liên kích.',
    category: 'mastery',
    classRequirement: 'swordsman',
    parentPassiveIds: ['pas_sw_combat_focus', 'pas_sw_blade_control'],
    requiredCharacterLevel: 45,
    requiredJobLevel: 45,
    requiredMasteryPoints: 20,
    synergySkillId: 'skill_cross_cut',
    maxRank: 3,
    effectType: 'attack_speed',
    effects: [
      { stat: 'aspdBonusPct', effectType: 'attack_speed', valuePerRank: 3.0, isPercentage: true },
      { stat: 'comboBonusPct', effectType: 'combo_bonus', valuePerRank: 3.5, isPercentage: true },
    ],
    tierRow: 3,
    tierColumn: 1,
  }),

  // 2. SPEARMAN
  makePassive({
    id: 'pas_sp_spear_mastery',
    name: 'Spear Mastery',
    nameVi: 'Thương Pháp Nhập Môn',
    description: 'Disciplined polearm grip raising ATK% and STR.',
    descriptionVi: 'Cường hóa Thương Thuật, tăng ATK% và STR.',
    category: 'core',
    classRequirement: 'spearman',
    requiredCharacterLevel: 15,
    requiredJobLevel: 15,
    maxRank: 5,
    effectType: 'damage_mult',
    effects: [
      { stat: 'atkPct', effectType: 'damage_mult', valuePerRank: 2.4, isPercentage: true },
      { stat: 'str', effectType: 'flat_attr', valuePerRank: 2, isPercentage: false },
    ],
    tierRow: 1,
    tierColumn: 1,
    isSignature: true,
  }),
  makePassive({
    id: 'pas_sp_piercing_technique',
    name: 'Piercing Technique',
    nameVi: 'Kỹ Thuật Xuyên Thấu',
    description: 'High-momentum thrusts grant Armor Penetration and Crit Damage.',
    descriptionVi: 'Tăng Xuyên Giáp và Sát thương Chí Mạng cho đòn đâm thương.',
    category: 'combat',
    classRequirement: 'spearman',
    parentPassiveIds: ['pas_sp_spear_mastery'],
    requiredCharacterLevel: 22,
    requiredJobLevel: 22,
    maxRank: 5,
    effectType: 'armor_penetration',
    effects: [
      { stat: 'armorPenetrationPct', effectType: 'armor_penetration', valuePerRank: 2.6, isPercentage: true },
      { stat: 'critDamageBonusPct', effectType: 'crit_damage', valuePerRank: 4.0, isPercentage: true },
    ],
    tierRow: 2,
    tierColumn: 1,
  }),
  makePassive({
    id: 'pas_sp_long_reach',
    name: 'Long Reach',
    nameVi: 'Trường Thương Viễn Công',
    description: 'Extends polearm control, improving Accuracy and Skill Damage.',
    descriptionVi: 'Tăng Chính Xác và Sát thương Kỹ năng tầm trung.',
    category: 'combat',
    classRequirement: 'spearman',
    parentPassiveIds: ['pas_sp_spear_mastery'],
    requiredCharacterLevel: 30,
    requiredJobLevel: 30,
    maxRank: 5,
    effectType: 'accuracy',
    effects: [
      { stat: 'accuracy', effectType: 'accuracy', valuePerRank: 8, isPercentage: false },
      { stat: 'skillDamagePct', effectType: 'damage_mult', valuePerRank: 2.0, isPercentage: true },
    ],
    tierRow: 2,
    tierColumn: 2,
  }),
  makePassive({
    id: 'pas_sp_formation_training',
    name: 'Formation Training',
    nameVi: 'Huấn Luyện Đội Hình',
    description: 'Phalanx positioning bolsters DEF and Damage Reduction.',
    descriptionVi: 'Tăng DEF và Giảm Sát Thương khi giữ trận hình.',
    category: 'mastery',
    classRequirement: 'spearman',
    parentPassiveIds: ['pas_sp_piercing_technique', 'pas_sp_long_reach'],
    requiredCharacterLevel: 45,
    requiredJobLevel: 45,
    requiredMasteryPoints: 20,
    synergySkillId: 'skill_spear_thrust',
    maxRank: 3,
    effectType: 'damage_reduction',
    effects: [
      { stat: 'defPct', effectType: 'damage_reduction', valuePerRank: 3.5, isPercentage: true },
      { stat: 'damageReductionPct', effectType: 'damage_reduction', valuePerRank: 2.0, isPercentage: true },
    ],
    tierRow: 3,
    tierColumn: 1,
  }),

  // 3. KNIGHT
  makePassive({
    id: 'pas_kn_iron_wall',
    name: 'Iron Wall',
    nameVi: 'Bức Tường Sắt',
    description: 'Fortifies knight armor, granting Max HP% and DEF%.',
    descriptionVi: 'Gia cố giáp trụ Kỵ Sĩ, tăng HP Tối Đa% và DEF%.',
    category: 'core',
    classRequirement: 'knight',
    requiredCharacterLevel: 15,
    requiredJobLevel: 15,
    maxRank: 5,
    effectType: 'hp_bonus',
    effects: [
      { stat: 'hpPct', effectType: 'hp_bonus', valuePerRank: 3.0, isPercentage: true },
      { stat: 'defPct', effectType: 'damage_reduction', valuePerRank: 2.8, isPercentage: true },
    ],
    tierRow: 1,
    tierColumn: 1,
    isSignature: true,
  }),
  makePassive({
    id: 'pas_kn_shield_mastery',
    name: 'Shield Mastery',
    nameVi: 'Tinh Thông Khiên Thuẫn',
    description: 'Amplifies Shield Strength and Damage Reduction.',
    descriptionVi: 'Tăng Giá Trị Lá Chắn và Giảm Sát Thương nhận vào.',
    category: 'combat',
    classRequirement: 'knight',
    parentPassiveIds: ['pas_kn_iron_wall'],
    requiredCharacterLevel: 22,
    requiredJobLevel: 22,
    maxRank: 5,
    effectType: 'shield_bonus',
    effects: [
      { stat: 'shieldBonusPct', effectType: 'shield_bonus', valuePerRank: 4.5, isPercentage: true },
      { stat: 'damageReductionPct', effectType: 'damage_reduction', valuePerRank: 2.0, isPercentage: true },
    ],
    tierRow: 2,
    tierColumn: 1,
  }),
  makePassive({
    id: 'pas_kn_defensive_stance',
    name: 'Defensive Stance',
    nameVi: 'Thế Phòng Thủ Vững Chãi',
    description: 'Steadies body against magic bursts and status ailments.',
    descriptionVi: 'Tăng MDEF% và Kháng Hiệu Ứng Bất Lợi.',
    category: 'combat',
    classRequirement: 'knight',
    parentPassiveIds: ['pas_kn_iron_wall'],
    requiredCharacterLevel: 30,
    requiredJobLevel: 30,
    maxRank: 5,
    effectType: 'status_resistance',
    effects: [
      { stat: 'mdefPct', effectType: 'damage_reduction', valuePerRank: 2.8, isPercentage: true },
      { stat: 'statusResistancePct', effectType: 'status_resistance', valuePerRank: 3.5, isPercentage: true },
    ],
    tierRow: 2,
    tierColumn: 2,
  }),
  makePassive({
    id: 'pas_kn_guardian_instinct',
    name: 'Guardian Instinct',
    nameVi: 'Bản Năng Hộ Vệ',
    description: 'Battle-tested frontline instinct granting CON and Healing Received bonus.',
    descriptionVi: 'Tăng CON và hiệu quả Hồi Phục khi bảo vệ tổ đội.',
    category: 'mastery',
    classRequirement: 'knight',
    parentPassiveIds: ['pas_kn_shield_mastery', 'pas_kn_defensive_stance'],
    requiredCharacterLevel: 45,
    requiredJobLevel: 45,
    requiredMasteryPoints: 20,
    synergySkillId: 'skill_shield_bash',
    maxRank: 3,
    effectType: 'party_support',
    effects: [
      { stat: 'con', effectType: 'flat_attr', valuePerRank: 4, isPercentage: false },
      { stat: 'healingBonusPct', effectType: 'healing_bonus', valuePerRank: 3.0, isPercentage: true },
    ],
    tierRow: 3,
    tierColumn: 1,
  }),

  // 4. PRIEST / MONK
  makePassive({
    id: 'pas_pr_divine_blessing',
    name: 'Divine Blessing',
    nameVi: 'Thánh Ân Ban Phước',
    description: 'Bestows sacred grace, raising INT and Max MP%.',
    descriptionVi: 'Tăng INT và MP Tối Đa% cho Tu Sĩ / Giáo Sĩ.',
    category: 'core',
    classRequirement: 'monk',
    requiredCharacterLevel: 15,
    requiredJobLevel: 15,
    maxRank: 5,
    effectType: 'mp_bonus',
    effects: [
      { stat: 'int', effectType: 'flat_attr', valuePerRank: 2, isPercentage: false },
      { stat: 'mpPct', effectType: 'mp_bonus', valuePerRank: 3.0, isPercentage: true },
    ],
    tierRow: 1,
    tierColumn: 1,
    isSignature: true,
  }),
  makePassive({
    id: 'pas_pr_healing_knowledge',
    name: 'Healing Knowledge',
    nameVi: 'Y Thuật Thánh Quang',
    description: 'Deepens sacred medicine arts, boosting Healing Power and MP Efficiency.',
    descriptionVi: 'Tăng Hiệu Quả Trị Liệu và Giảm Tiêu Hao MP.',
    category: 'combat',
    classRequirement: 'monk',
    parentPassiveIds: ['pas_pr_divine_blessing'],
    requiredCharacterLevel: 22,
    requiredJobLevel: 22,
    maxRank: 5,
    effectType: 'healing_bonus',
    effects: [
      { stat: 'healingBonusPct', effectType: 'healing_bonus', valuePerRank: 3.5, isPercentage: true },
      { stat: 'resourceEfficiencyPct', effectType: 'resource_efficiency', valuePerRank: 2.0, isPercentage: true },
    ],
    tierRow: 2,
    tierColumn: 1,
  }),
  makePassive({
    id: 'pas_pr_spiritual_focus',
    name: 'Spiritual Focus',
    nameVi: 'Tâm Linh Tập Trung',
    description: 'Accelerates prayers, boosting MATK% and Cooldown Reduction.',
    descriptionVi: 'Tăng MATK% và Giảm Hồi Chiêu phép thuật.',
    category: 'combat',
    classRequirement: 'monk',
    parentPassiveIds: ['pas_pr_divine_blessing'],
    requiredCharacterLevel: 30,
    requiredJobLevel: 30,
    maxRank: 5,
    effectType: 'cooldown_reduction',
    effects: [
      { stat: 'matkPct', effectType: 'damage_mult', valuePerRank: 2.2, isPercentage: true },
      { stat: 'cooldownReductionPct', effectType: 'cooldown_reduction', valuePerRank: 1.6, isPercentage: true },
    ],
    tierRow: 2,
    tierColumn: 2,
  }),
  makePassive({
    id: 'pas_pr_holy_resistance',
    name: 'Holy Resistance',
    nameVi: 'Kháng Ám Khí',
    description: 'Wards off curses and elemental strikes, raising MDEF% and Status Resistance.',
    descriptionVi: 'Tăng MDEF% và Kháng Hiệu Ứng cho bản thân.',
    category: 'mastery',
    classRequirement: 'monk',
    parentPassiveIds: ['pas_pr_healing_knowledge', 'pas_pr_spiritual_focus'],
    requiredCharacterLevel: 45,
    requiredJobLevel: 45,
    requiredMasteryPoints: 20,
    synergySkillId: 'skill_holy_light',
    maxRank: 3,
    effectType: 'status_resistance',
    effects: [
      { stat: 'mdefPct', effectType: 'damage_reduction', valuePerRank: 3.5, isPercentage: true },
      { stat: 'statusResistancePct', effectType: 'status_resistance', valuePerRank: 4.5, isPercentage: true },
    ],
    tierRow: 3,
    tierColumn: 1,
  }),

  // 5. MAGE
  makePassive({
    id: 'pas_mg_arcane_knowledge',
    name: 'Arcane Knowledge',
    nameVi: 'Tri Thức Bí Ẩn',
    description: 'Expands arcane reserves, raising MATK% and INT.',
    descriptionVi: 'Nâng cao MATK% và INT cho Pháp Sư.',
    category: 'core',
    classRequirement: 'mage',
    requiredCharacterLevel: 15,
    requiredJobLevel: 15,
    maxRank: 5,
    effectType: 'damage_mult',
    effects: [
      { stat: 'matkPct', effectType: 'damage_mult', valuePerRank: 2.6, isPercentage: true },
      { stat: 'int', effectType: 'flat_attr', valuePerRank: 2, isPercentage: false },
    ],
    tierRow: 1,
    tierColumn: 1,
    isSignature: true,
  }),
  makePassive({
    id: 'pas_mg_elemental_affinity',
    name: 'Elemental Affinity',
    nameVi: 'Cộng Hưởng Nguyên Tố',
    description: 'Attunes spells to pierce magic barriers with higher Elemental Damage.',
    descriptionVi: 'Tăng Sát Thương Nguyên Tố và Xuyên Kháng Phép.',
    category: 'combat',
    classRequirement: 'mage',
    parentPassiveIds: ['pas_mg_arcane_knowledge'],
    requiredCharacterLevel: 22,
    requiredJobLevel: 22,
    maxRank: 5,
    effectType: 'magic_penetration',
    effects: [
      { stat: 'elementalDamagePct', effectType: 'elemental_damage', valuePerRank: 2.6, isPercentage: true },
      { stat: 'magicPenetrationPct', effectType: 'magic_penetration', valuePerRank: 2.4, isPercentage: true },
    ],
    tierRow: 2,
    tierColumn: 1,
  }),
  makePassive({
    id: 'pas_mg_mana_control',
    name: 'Mana Control',
    nameVi: 'Điều Khiển Ma Lực',
    description: 'Refines spell casting circles, raising Max MP% and reducing MP consumption.',
    descriptionVi: 'Tăng MP Tối Đa% và Giảm Tiêu Hao MP.',
    category: 'combat',
    classRequirement: 'mage',
    parentPassiveIds: ['pas_mg_arcane_knowledge'],
    requiredCharacterLevel: 30,
    requiredJobLevel: 30,
    maxRank: 5,
    effectType: 'resource_efficiency',
    effects: [
      { stat: 'mpPct', effectType: 'mp_bonus', valuePerRank: 3.0, isPercentage: true },
      { stat: 'resourceEfficiencyPct', effectType: 'resource_efficiency', valuePerRank: 2.4, isPercentage: true },
    ],
    tierRow: 2,
    tierColumn: 2,
  }),
  makePassive({
    id: 'pas_mg_spell_focus',
    name: 'Spell Focus',
    nameVi: 'Ngưng Tụ Pháp Thuật',
    description: 'High mastery channeling reduces Cooldown and raises spell Crit Rate.',
    descriptionVi: 'Giảm Hồi Chiêu và tăng Chí Mạng phép thuật.',
    category: 'mastery',
    classRequirement: 'mage',
    parentPassiveIds: ['pas_mg_elemental_affinity', 'pas_mg_mana_control'],
    requiredCharacterLevel: 45,
    requiredJobLevel: 45,
    requiredMasteryPoints: 20,
    synergySkillId: 'skill_fireball',
    maxRank: 3,
    effectType: 'cooldown_reduction',
    effects: [
      { stat: 'cooldownReductionPct', effectType: 'cooldown_reduction', valuePerRank: 2.2, isPercentage: true },
      { stat: 'critRatePct', effectType: 'crit_rate', valuePerRank: 2.0, isPercentage: true },
    ],
    tierRow: 3,
    tierColumn: 1,
  }),

  // 6. ASSASSIN
  makePassive({
    id: 'pas_as_shadow_instinct',
    name: 'Shadow Instinct',
    nameVi: 'Bản Năng Bóng Tối',
    description: 'Enhances agility and fatal strike instincts.',
    descriptionVi: 'Tăng AGI và Tỷ lệ Chí Mạng trong bóng tối.',
    category: 'core',
    classRequirement: 'assassin',
    requiredCharacterLevel: 15,
    requiredJobLevel: 15,
    maxRank: 5,
    effectType: 'crit_rate',
    effects: [
      { stat: 'agi', effectType: 'flat_attr', valuePerRank: 2, isPercentage: false },
      { stat: 'critRatePct', effectType: 'crit_rate', valuePerRank: 2.0, isPercentage: true },
    ],
    tierRow: 1,
    tierColumn: 1,
    isSignature: true,
  }),
  makePassive({
    id: 'pas_as_lethal_precision',
    name: 'Lethal Precision',
    nameVi: 'Chuẩn Xác Chí Tử',
    description: 'Targets weak vitals for amplified Crit Damage and Armor Penetration.',
    descriptionVi: 'Tăng Sát Thương Chí Mạng và Xuyên Giáp vật lý.',
    category: 'combat',
    classRequirement: 'assassin',
    parentPassiveIds: ['pas_as_shadow_instinct'],
    requiredCharacterLevel: 22,
    requiredJobLevel: 22,
    maxRank: 5,
    effectType: 'crit_damage',
    effects: [
      { stat: 'critDamageBonusPct', effectType: 'crit_damage', valuePerRank: 5.5, isPercentage: true },
      { stat: 'armorPenetrationPct', effectType: 'armor_penetration', valuePerRank: 2.2, isPercentage: true },
    ],
    tierRow: 2,
    tierColumn: 1,
  }),
  makePassive({
    id: 'pas_as_evasion_training',
    name: 'Evasion Training',
    nameVi: 'Bộ Pháp Né Tránh',
    description: 'Agile shadow footwork raises Evasion and Movement Speed.',
    descriptionVi: 'Tăng Né Tránh và Tốc Độ Di Chuyển.',
    category: 'combat',
    classRequirement: 'assassin',
    parentPassiveIds: ['pas_as_shadow_instinct'],
    requiredCharacterLevel: 30,
    requiredJobLevel: 30,
    maxRank: 5,
    effectType: 'evasion',
    effects: [
      { stat: 'evasionPct', effectType: 'evasion', valuePerRank: 2.4, isPercentage: true },
      { stat: 'moveSpeedBonusPct', effectType: 'move_speed', valuePerRank: 2.2, isPercentage: true },
    ],
    tierRow: 2,
    tierColumn: 2,
  }),
  makePassive({
    id: 'pas_as_critical_technique',
    name: 'Critical Technique',
    nameVi: 'Kỹ Thuật Bạo Kích',
    description: 'Relentless dagger tempo raises Attack Speed and Combo Damage.',
    descriptionVi: 'Tăng Tốc Độ Đánh và uy lực liên trảm đoản kiếm.',
    category: 'mastery',
    classRequirement: 'assassin',
    parentPassiveIds: ['pas_as_lethal_precision', 'pas_as_evasion_training'],
    requiredCharacterLevel: 45,
    requiredJobLevel: 45,
    requiredMasteryPoints: 20,
    synergySkillId: 'skill_shadow_strike',
    maxRank: 3,
    effectType: 'attack_speed',
    effects: [
      { stat: 'aspdBonusPct', effectType: 'attack_speed', valuePerRank: 3.2, isPercentage: true },
      { stat: 'comboBonusPct', effectType: 'combo_bonus', valuePerRank: 3.5, isPercentage: true },
    ],
    tierRow: 3,
    tierColumn: 1,
  }),

  // 7. FIGHTER
  makePassive({
    id: 'pas_fg_combat_rhythm',
    name: 'Combat Rhythm',
    nameVi: 'Nhịp Điệu Chiến Đấu',
    description: 'Disciplined martial cadence raising STR and Attack Speed.',
    descriptionVi: 'Tăng STR và Tốc Độ Đánh cận chiến.',
    category: 'core',
    classRequirement: 'fighter',
    requiredCharacterLevel: 15,
    requiredJobLevel: 15,
    maxRank: 5,
    effectType: 'attack_speed',
    effects: [
      { stat: 'str', effectType: 'flat_attr', valuePerRank: 2, isPercentage: false },
      { stat: 'aspdBonusPct', effectType: 'attack_speed', valuePerRank: 2.4, isPercentage: true },
    ],
    tierRow: 1,
    tierColumn: 1,
    isSignature: true,
  }),
  makePassive({
    id: 'pas_fg_inner_strength',
    name: 'Inner Strength',
    nameVi: 'Nội Lực Thâm Hậu',
    description: 'Dense internal chi raises ATK% and Max HP%.',
    descriptionVi: 'Tăng ATK% và HP Tối Đa%.',
    category: 'combat',
    classRequirement: 'fighter',
    parentPassiveIds: ['pas_fg_combat_rhythm'],
    requiredCharacterLevel: 22,
    requiredJobLevel: 22,
    maxRank: 5,
    effectType: 'damage_mult',
    effects: [
      { stat: 'atkPct', effectType: 'damage_mult', valuePerRank: 2.3, isPercentage: true },
      { stat: 'hpPct', effectType: 'hp_bonus', valuePerRank: 2.2, isPercentage: true },
    ],
    tierRow: 2,
    tierColumn: 1,
  }),
  makePassive({
    id: 'pas_fg_martial_discipline',
    name: 'Martial Discipline',
    nameVi: 'Võ Đạo Chân Nguyên',
    description: 'Increases Crit Rate and continuous martial combo scaling.',
    descriptionVi: 'Tăng Chí Mạng và sát thương chuỗi đòn quyền.',
    category: 'combat',
    classRequirement: 'fighter',
    parentPassiveIds: ['pas_fg_combat_rhythm'],
    requiredCharacterLevel: 30,
    requiredJobLevel: 30,
    maxRank: 5,
    effectType: 'combo_bonus',
    effects: [
      { stat: 'critRatePct', effectType: 'crit_rate', valuePerRank: 1.8, isPercentage: true },
      { stat: 'comboBonusPct', effectType: 'combo_bonus', valuePerRank: 2.5, isPercentage: true },
    ],
    tierRow: 2,
    tierColumn: 2,
  }),
  makePassive({
    id: 'pas_fg_counterattack_training',
    name: 'Counterattack Training',
    nameVi: 'Phản Kích Cận Chiến',
    description: 'Absorbs shocks and sustains vitality with Damage Reduction & Lifesteal.',
    descriptionVi: 'Tăng Giảm Sát Thương và Hút Máu khi áp sát.',
    category: 'mastery',
    classRequirement: 'fighter',
    parentPassiveIds: ['pas_fg_inner_strength', 'pas_fg_martial_discipline'],
    requiredCharacterLevel: 45,
    requiredJobLevel: 45,
    requiredMasteryPoints: 20,
    synergySkillId: 'skill_power_punch',
    maxRank: 3,
    effectType: 'lifesteal',
    effects: [
      { stat: 'damageReductionPct', effectType: 'damage_reduction', valuePerRank: 2.5, isPercentage: true },
      { stat: 'lifestealPct', effectType: 'lifesteal', valuePerRank: 1.2, isPercentage: true },
    ],
    tierRow: 3,
    tierColumn: 1,
  }),

  // 8. ARCHER
  makePassive({
    id: 'pas_ar_eagle_eye',
    name: 'Eagle Eye',
    nameVi: 'Ưng Nhãn',
    description: 'Sharpens long-distance vision, raising DEX and Accuracy.',
    descriptionVi: 'Tăng DEX và Chính Xác tầm xa cho Cung Thủ.',
    category: 'core',
    classRequirement: 'archer',
    requiredCharacterLevel: 15,
    requiredJobLevel: 15,
    maxRank: 5,
    effectType: 'accuracy',
    effects: [
      { stat: 'dex', effectType: 'flat_attr', valuePerRank: 2, isPercentage: false },
      { stat: 'accuracy', effectType: 'accuracy', valuePerRank: 9, isPercentage: false },
    ],
    tierRow: 1,
    tierColumn: 1,
    isSignature: true,
  }),
  makePassive({
    id: 'pas_ar_precision_aim',
    name: 'Precision Aim',
    nameVi: 'Ngắm Bắn Chuẩn Xác',
    description: 'Vitals targeting boosts Crit Rate and Crit Damage.',
    descriptionVi: 'Tăng Tỷ lệ Chí Mạng và Sát thương Chí Mạng.',
    category: 'combat',
    classRequirement: 'archer',
    parentPassiveIds: ['pas_ar_eagle_eye'],
    requiredCharacterLevel: 22,
    requiredJobLevel: 22,
    maxRank: 5,
    effectType: 'crit_rate',
    effects: [
      { stat: 'critRatePct', effectType: 'crit_rate', valuePerRank: 2.0, isPercentage: true },
      { stat: 'critDamageBonusPct', effectType: 'crit_damage', valuePerRank: 4.5, isPercentage: true },
    ],
    tierRow: 2,
    tierColumn: 1,
  }),
  makePassive({
    id: 'pas_ar_projectile_mastery',
    name: 'Projectile Mastery',
    nameVi: 'Tinh Thông Cung Tiễn',
    description: 'Rapid draw mechanics raise ATK% and Attack Speed.',
    descriptionVi: 'Tăng ATK% và Tốc Độ Bắn cung.',
    category: 'combat',
    classRequirement: 'archer',
    parentPassiveIds: ['pas_ar_eagle_eye'],
    requiredCharacterLevel: 30,
    requiredJobLevel: 30,
    maxRank: 5,
    effectType: 'damage_mult',
    effects: [
      { stat: 'atkPct', effectType: 'damage_mult', valuePerRank: 2.2, isPercentage: true },
      { stat: 'aspdBonusPct', effectType: 'attack_speed', valuePerRank: 2.2, isPercentage: true },
    ],
    tierRow: 2,
    tierColumn: 2,
  }),
  makePassive({
    id: 'pas_ar_hunting_instinct',
    name: 'Hunting Instinct',
    nameVi: 'Bản Năng Thợ Săn',
    description: 'Agile tracker instinct improving Movement Speed and Boss damage.',
    descriptionVi: 'Tăng Tốc Độ Di Chuyển và Sát thương lên Boss.',
    category: 'mastery',
    classRequirement: 'archer',
    parentPassiveIds: ['pas_ar_precision_aim', 'pas_ar_projectile_mastery'],
    requiredCharacterLevel: 45,
    requiredJobLevel: 45,
    requiredMasteryPoints: 20,
    synergySkillId: 'skill_piercing_arrow',
    maxRank: 3,
    effectType: 'move_speed',
    effects: [
      { stat: 'moveSpeedBonusPct', effectType: 'move_speed', valuePerRank: 3.0, isPercentage: true },
      { stat: 'skillDamagePct', effectType: 'damage_mult', valuePerRank: 3.0, isPercentage: true },
    ],
    bossModifier: 1.2,
    tierRow: 3,
    tierColumn: 1,
  }),
];

// ==========================================
// PHASE 4: 16 ADVANCED JOB PASSIVES (16 x 6 = 96)
// ==========================================

function makeBranchTree(spec: {
  branchId: AdvancedJobId;
  branchName: string;
  sigId: string;
  sigName: string;
  sigNameVi: string;
  sigDesc: string;
  sigEffects: PassiveStatEffectEntry[];
  sigType: PassiveEffectType;
  synergySkillId: string;
  synName: string;
  synNameVi: string;
  synDesc: string;
  synEffects: PassiveStatEffectEntry[];
  utilName: string;
  utilNameVi: string;
  utilDesc: string;
  utilType: PassiveEffectType;
  utilEffects: PassiveStatEffectEntry[];
  choiceAName: string;
  choiceANameVi: string;
  choiceADesc: string;
  choiceAType: PassiveEffectType;
  choiceAEffects: PassiveStatEffectEntry[];
  choiceBName: string;
  choiceBNameVi: string;
  choiceBDesc: string;
  choiceBType: PassiveEffectType;
  choiceBEffects: PassiveStatEffectEntry[];
  masterName: string;
  masterNameVi: string;
  masterDesc: string;
  masterEffects: PassiveStatEffectEntry[];
  pveModifier?: number;
  pvpModifier?: number;
  bossModifier?: number;
}): PassiveDefinition[] {
  const b = spec.branchId;
  const sigId = `pas_${b}_${spec.sigId}`;
  const synId = `pas_${b}_synergy`;
  const utilId = `pas_${b}_utility`;
  const chAId = `pas_${b}_choice_a`;
  const chBId = `pas_${b}_choice_b`;
  const mastId = `pas_${b}_mastery_apex`;
  const excl = `excl_${b}_capstone`;

  return [
    makePassive({
      id: sigId,
      name: spec.sigName,
      nameVi: spec.sigNameVi,
      description: spec.sigDesc,
      descriptionVi: spec.sigDesc,
      category: 'branch',
      classRequirement: b,
      branchRequirement: b,
      requiredCharacterLevel: 80,
      requiredJobLevel: 80,
      maxRank: 5,
      effectType: spec.sigType,
      effects: spec.sigEffects,
      isSignature: true,
      pveModifier: spec.pveModifier,
      pvpModifier: spec.pvpModifier,
      bossModifier: spec.bossModifier,
      tierRow: 1,
      tierColumn: 1,
    }),
    makePassive({
      id: synId,
      name: spec.synName,
      nameVi: spec.synNameVi,
      description: spec.synDesc,
      descriptionVi: spec.synDesc,
      category: 'branch',
      classRequirement: b,
      branchRequirement: b,
      parentPassiveIds: [sigId],
      synergySkillId: spec.synergySkillId,
      requiredCharacterLevel: 82,
      requiredJobLevel: 80,
      maxRank: 4,
      effectType: 'damage_mult',
      effects: spec.synEffects,
      activationCondition: {
        type: 'skill_cast',
        targetSkillId: spec.synergySkillId,
        description: `Synergizes directly with active skill ${spec.synergySkillId}.`,
        descriptionVi: `Cộng hưởng trực tiếp cùng kỹ năng ${spec.synergySkillId}.`,
      },
      tierRow: 2,
      tierColumn: 1,
    }),
    makePassive({
      id: utilId,
      name: spec.utilName,
      nameVi: spec.utilNameVi,
      description: spec.utilDesc,
      descriptionVi: spec.utilDesc,
      category: 'combat',
      classRequirement: b,
      branchRequirement: b,
      parentPassiveIds: [sigId],
      requiredCharacterLevel: 84,
      requiredJobLevel: 80,
      maxRank: 4,
      effectType: spec.utilType,
      effects: spec.utilEffects,
      tierRow: 2,
      tierColumn: 2,
    }),
    makePassive({
      id: chAId,
      name: spec.choiceAName,
      nameVi: spec.choiceANameVi,
      description: spec.choiceADesc,
      descriptionVi: spec.choiceADesc,
      category: 'branch',
      classRequirement: b,
      branchRequirement: b,
      parentPassiveIds: [synId],
      mutuallyExclusiveGroup: excl,
      requiredCharacterLevel: 88,
      requiredJobLevel: 80,
      maxRank: 3,
      pointCostPerRank: 2,
      effectType: spec.choiceAType,
      effects: spec.choiceAEffects,
      tierRow: 3,
      tierColumn: 1,
    }),
    makePassive({
      id: chBId,
      name: spec.choiceBName,
      nameVi: spec.choiceBNameVi,
      description: spec.choiceBDesc,
      descriptionVi: spec.choiceBDesc,
      category: 'branch',
      classRequirement: b,
      branchRequirement: b,
      parentPassiveIds: [utilId],
      mutuallyExclusiveGroup: excl,
      requiredCharacterLevel: 88,
      requiredJobLevel: 80,
      maxRank: 3,
      pointCostPerRank: 2,
      effectType: spec.choiceBType,
      effects: spec.choiceBEffects,
      tierRow: 3,
      tierColumn: 2,
    }),
    makePassive({
      id: mastId,
      name: spec.masterName,
      nameVi: spec.masterNameVi,
      description: spec.masterDesc,
      descriptionVi: spec.masterDesc,
      category: 'mastery',
      classRequirement: b,
      branchRequirement: b,
      parentPassiveIds: [synId, utilId],
      synergySkillId: spec.synergySkillId,
      requiredCharacterLevel: 92,
      requiredJobLevel: 80,
      requiredMasteryPoints: 60,
      maxRank: 3,
      pointCostPerRank: 2,
      effectType: 'combo_bonus',
      effects: spec.masterEffects,
      pveModifier: spec.pveModifier,
      pvpModifier: spec.pvpModifier,
      bossModifier: spec.bossModifier,
      tierRow: 4,
      tierColumn: 1,
    }),
  ];
}

export const ADVANCED_JOB_PASSIVES: PassiveDefinition[] = [
  // 1. Sword Saint
  ...makeBranchTree({
    branchId: 'sword_saint', branchName: 'Sword Saint',
    sigId: 'sword_resonance', sigName: 'Sword Resonance', sigNameVi: 'Kiếm Ý Cộng Hưởng',
    sigDesc: 'Signature Sword Saint aura amplifying Crit Rate, Skill Damage, and AGI precision.',
    sigType: 'crit_rate',
    sigEffects: [
      { stat: 'critRatePct', effectType: 'crit_rate', valuePerRank: 2.4, isPercentage: true },
      { stat: 'skillDamagePct', effectType: 'damage_mult', valuePerRank: 3.0, isPercentage: true },
      { stat: 'agi', effectType: 'flat_attr', valuePerRank: 3, isPercentage: false },
    ],
    synergySkillId: 'skill_ss_iaido_flash',
    synName: 'Iaido Tempo', synNameVi: 'Cư Hợp Liên Trảm',
    synDesc: 'Empowers Celestial Iaido Flash crit chance & slash cadence.',
    synEffects: [
      { stat: 'aspdBonusPct', effectType: 'attack_speed', valuePerRank: 3.0, isPercentage: true },
      { stat: 'critDamageBonusPct', effectType: 'crit_damage', valuePerRank: 6.0, isPercentage: true },
    ],
    utilName: 'Clear Mind Reflex', utilNameVi: 'Minh Tâm Phản Xạ',
    utilDesc: 'Graceful parries boost Evasion and Status Resistance.',
    utilType: 'evasion',
    utilEffects: [
      { stat: 'evasionPct', effectType: 'evasion', valuePerRank: 2.8, isPercentage: true },
      { stat: 'statusResistancePct', effectType: 'status_resistance', valuePerRank: 4.0, isPercentage: true },
    ],
    choiceAName: 'Boss-Slayer Edge', choiceANameVi: 'Trảm Vương Kiếm Khí (Nhánh A)',
    choiceADesc: 'Build Choice: Maximizes Armor Penetration and Crit Damage vs Bosses.',
    choiceAType: 'armor_penetration',
    choiceAEffects: [
      { stat: 'armorPenetrationPct', effectType: 'armor_penetration', valuePerRank: 4.5, isPercentage: true },
      { stat: 'critDamageBonusPct', effectType: 'crit_damage', valuePerRank: 9.0, isPercentage: true },
    ],
    choiceBName: 'Gale Rhythm Flow', choiceBNameVi: 'Lưu Thủy Cư Hợp (Nhánh B)',
    choiceBDesc: 'Build Choice: Prioritizes Cooldown Reduction and MP Efficiency for nonstop skills.',
    choiceBType: 'cooldown_reduction',
    choiceBEffects: [
      { stat: 'cooldownReductionPct', effectType: 'cooldown_reduction', valuePerRank: 3.5, isPercentage: true },
      { stat: 'resourceEfficiencyPct', effectType: 'resource_efficiency', valuePerRank: 4.0, isPercentage: true },
    ],
    masterName: 'Celestial Blade Apex', masterNameVi: 'Thiên Kiếm Tuyệt Cảnh',
    masterDesc: 'Requires 60+ Skill Mastery: Elevates Combo Damage & ATK% scaling.',
    masterEffects: [
      { stat: 'comboBonusPct', effectType: 'combo_bonus', valuePerRank: 5.0, isPercentage: true },
      { stat: 'atkPct', effectType: 'damage_mult', valuePerRank: 4.0, isPercentage: true },
    ],
    bossModifier: 1.15,
  }),

  // 2. Berserker
  ...makeBranchTree({
    branchId: 'berserker', branchName: 'Berserker',
    sigId: 'blood_fury', sigName: 'Blood Fury', sigNameVi: 'Huyết Nộ Cuồng Huyết',
    sigDesc: 'Signature Berserker fury trading finesse for brute ATK%, STR & Lifesteal.',
    sigType: 'lifesteal',
    sigEffects: [
      { stat: 'atkPct', effectType: 'damage_mult', valuePerRank: 3.4, isPercentage: true },
      { stat: 'lifestealPct', effectType: 'lifesteal', valuePerRank: 1.6, isPercentage: true },
      { stat: 'str', effectType: 'flat_attr', valuePerRank: 4, isPercentage: false },
    ],
    synergySkillId: 'skill_bk_crimson_guillotine',
    synName: 'Guillotine Momentum', synNameVi: 'Đoạn Đầu Xung Lực',
    synDesc: 'Empowers Crimson Guillotine cleave & Crit Damage.',
    synEffects: [
      { stat: 'skillDamagePct', effectType: 'damage_mult', valuePerRank: 3.8, isPercentage: true },
      { stat: 'critDamageBonusPct', effectType: 'crit_damage', valuePerRank: 5.5, isPercentage: true },
    ],
    utilName: 'Undying Grit', utilNameVi: 'Chiến Ý Bất Khuất',
    utilDesc: 'Boosts Max HP% and Crowd-Control Status Resistance while brawling.',
    utilType: 'status_resistance',
    utilEffects: [
      { stat: 'hpPct', effectType: 'hp_bonus', valuePerRank: 3.5, isPercentage: true },
      { stat: 'statusResistancePct', effectType: 'status_resistance', valuePerRank: 4.5, isPercentage: true },
    ],
    choiceAName: 'Crimson Overdrive', choiceANameVi: 'Huyết Sát Cuồng Bạo (Nhánh A)',
    choiceADesc: 'Build Choice: Pure heavy execution power & Armor Penetration.',
    choiceAType: 'armor_penetration',
    choiceAEffects: [
      { stat: 'armorPenetrationPct', effectType: 'armor_penetration', valuePerRank: 4.5, isPercentage: true },
      { stat: 'atkPct', effectType: 'damage_mult', valuePerRank: 4.0, isPercentage: true },
    ],
    choiceBName: 'Bloodthirst Vitality', choiceBNameVi: 'Hấp Huyết Bất Diệt (Nhánh B)',
    choiceBDesc: 'Build Choice: Sustained frontline drain with extra Lifesteal & Damage Reduction.',
    choiceBType: 'lifesteal',
    choiceBEffects: [
      { stat: 'lifestealPct', effectType: 'lifesteal', valuePerRank: 2.2, isPercentage: true },
      { stat: 'damageReductionPct', effectType: 'damage_reduction', valuePerRank: 3.5, isPercentage: true },
    ],
    masterName: 'Ragnarok Avatar', masterNameVi: 'Hóa Thân Cuồng Chiến',
    masterDesc: 'Requires 60+ Skill Mastery: Boosts Fire/Blood skill power and CON toughness.',
    masterEffects: [
      { stat: 'elementalDamagePct', effectType: 'elemental_damage', valuePerRank: 4.5, isPercentage: true },
      { stat: 'con', effectType: 'flat_attr', valuePerRank: 6, isPercentage: false },
    ],
    pveModifier: 1.12,
  }),

  // 3. Dragoon
  ...makeBranchTree({
    branchId: 'dragoon', branchName: 'Dragoon',
    sigId: 'dragon_pierce', sigName: 'Dragon Pierce', sigNameVi: 'Long Thương Xuyên Giáp',
    sigDesc: 'Signature Dragoon technique granting massive Armor Penetration and Lightning Damage.',
    sigType: 'armor_penetration',
    sigEffects: [
      { stat: 'armorPenetrationPct', effectType: 'armor_penetration', valuePerRank: 3.5, isPercentage: true },
      { stat: 'elementalDamagePct', effectType: 'elemental_damage', valuePerRank: 2.8, isPercentage: true },
      { stat: 'str', effectType: 'flat_attr', valuePerRank: 3, isPercentage: false },
    ],
    synergySkillId: 'skill_dg_skyfang_dive',
    synName: 'Skybreaker Leap', synNameVi: 'Lôi Nha Giáng Thế',
    synDesc: 'Enhances Skyfang Dragon Dive impact & Crit Damage.',
    synEffects: [
      { stat: 'skillDamagePct', effectType: 'damage_mult', valuePerRank: 3.5, isPercentage: true },
      { stat: 'critDamageBonusPct', effectType: 'crit_damage', valuePerRank: 6.0, isPercentage: true },
    ],
    utilName: 'Stormwind Mobility', utilNameVi: 'Phong Lôi Bộ Pháp',
    utilDesc: 'Grants Movement Speed and Attack Speed between dives.',
    utilType: 'move_speed',
    utilEffects: [
      { stat: 'moveSpeedBonusPct', effectType: 'move_speed', valuePerRank: 3.2, isPercentage: true },
      { stat: 'aspdBonusPct', effectType: 'attack_speed', valuePerRank: 2.8, isPercentage: true },
    ],
    choiceAName: 'Heavenly Lance', choiceANameVi: 'Thiên Long Độc Trảm (Nhánh A)',
    choiceADesc: 'Build Choice: Maximizes Crit Rate and piercing Boss burst.',
    choiceAType: 'crit_rate',
    choiceAEffects: [
      { stat: 'critRatePct', effectType: 'crit_rate', valuePerRank: 4.0, isPercentage: true },
      { stat: 'critDamageBonusPct', effectType: 'crit_damage', valuePerRank: 8.5, isPercentage: true },
    ],
    choiceBName: 'Dragonscale Ward', choiceBNameVi: 'Long Lân Hộ Giáp (Nhánh B)',
    choiceBDesc: 'Build Choice: Hardens dragon scales for Damage Reduction and Cooldown Reduction.',
    choiceBType: 'damage_reduction',
    choiceBEffects: [
      { stat: 'damageReductionPct', effectType: 'damage_reduction', valuePerRank: 3.5, isPercentage: true },
      { stat: 'cooldownReductionPct', effectType: 'cooldown_reduction', valuePerRank: 3.0, isPercentage: true },
    ],
    masterName: 'Tempest Wyrm Crest', masterNameVi: 'Ấn Ký Lôi Long',
    masterDesc: 'Requires 60+ Skill Mastery: Boosts ATK% & Accuracy.',
    masterEffects: [
      { stat: 'atkPct', effectType: 'damage_mult', valuePerRank: 4.2, isPercentage: true },
      { stat: 'accuracy', effectType: 'accuracy', valuePerRank: 15, isPercentage: false },
    ],
    bossModifier: 1.15,
  }),

  // 4. Warlancer
  ...makeBranchTree({
    branchId: 'warlancer', branchName: 'Warlancer',
    sigId: 'spear_formation', sigName: 'Spear Formation', sigNameVi: 'Chiến Thương Đại Trận',
    sigDesc: 'Signature Warlancer phalanx strengthening ATK%, DEF%, and AoE control.',
    sigType: 'damage_reduction',
    sigEffects: [
      { stat: 'atkPct', effectType: 'damage_mult', valuePerRank: 2.5, isPercentage: true },
      { stat: 'defPct', effectType: 'damage_reduction', valuePerRank: 3.0, isPercentage: true },
      { stat: 'con', effectType: 'flat_attr', valuePerRank: 3, isPercentage: false },
    ],
    synergySkillId: 'skill_wl_crimson_sweep',
    synName: 'Halberd Horizon', synNameVi: 'Hoành Tảo Thiên Quân',
    synDesc: 'Amplifies Crimson Halberd Sweep damage & Armor Penetration.',
    synEffects: [
      { stat: 'skillDamagePct', effectType: 'damage_mult', valuePerRank: 3.2, isPercentage: true },
      { stat: 'armorPenetrationPct', effectType: 'armor_penetration', valuePerRank: 2.5, isPercentage: true },
    ],
    utilName: 'Bastion Footing', utilNameVi: 'Thiết Bích Bất Chuyển',
    utilDesc: 'Grants heavy Status Resistance & Max HP% against crowds.',
    utilType: 'status_resistance',
    utilEffects: [
      { stat: 'statusResistancePct', effectType: 'status_resistance', valuePerRank: 4.5, isPercentage: true },
      { stat: 'hpPct', effectType: 'hp_bonus', valuePerRank: 3.0, isPercentage: true },
    ],
    choiceAName: 'Imperial Vanguard', choiceANameVi: 'Tiên Phong Xung Kích (Nhánh A)',
    choiceADesc: 'Build Choice: Boosts Attack Speed & Combo Damage for relentless sweeps.',
    choiceAType: 'attack_speed',
    choiceAEffects: [
      { stat: 'aspdBonusPct', effectType: 'attack_speed', valuePerRank: 4.5, isPercentage: true },
      { stat: 'comboBonusPct', effectType: 'combo_bonus', valuePerRank: 5.0, isPercentage: true },
    ],
    choiceBName: 'Legion Bulwark', choiceBNameVi: 'Đại Trận Hộ Thành (Nhánh B)',
    choiceBDesc: 'Build Choice: Elevates Damage Reduction & Shield power.',
    choiceBType: 'shield_bonus',
    choiceBEffects: [
      { stat: 'damageReductionPct', effectType: 'damage_reduction', valuePerRank: 4.0, isPercentage: true },
      { stat: 'shieldBonusPct', effectType: 'shield_bonus', valuePerRank: 6.5, isPercentage: true },
    ],
    masterName: 'Marshal of Steel', masterNameVi: 'Nguyên Soái Thiết Thương',
    masterDesc: 'Requires 60+ Skill Mastery: Boosts DEF% and Accuracy.',
    masterEffects: [
      { stat: 'defPct', effectType: 'damage_reduction', valuePerRank: 5.0, isPercentage: true },
      { stat: 'accuracy', effectType: 'accuracy', valuePerRank: 16, isPercentage: false },
    ],
  }),

  // 5. Paladin
  ...makeBranchTree({
    branchId: 'paladin', branchName: 'Paladin',
    sigId: 'holy_protection', sigName: 'Holy Protection', sigNameVi: 'Thánh Quang Hộ Thân',
    sigDesc: 'Signature Paladin vow strengthening Damage Reduction, Shield Bonus & Healing Bonus.',
    sigType: 'shield_bonus',
    sigEffects: [
      { stat: 'damageReductionPct', effectType: 'damage_reduction', valuePerRank: 2.2, isPercentage: true },
      { stat: 'shieldBonusPct', effectType: 'shield_bonus', valuePerRank: 4.5, isPercentage: true },
      { stat: 'healingBonusPct', effectType: 'healing_bonus', valuePerRank: 2.8, isPercentage: true },
    ],
    synergySkillId: 'skill_pl_solstice_smite',
    synName: 'Solar Justice', synNameVi: 'Nhật Quang Chính Nghĩa',
    synDesc: 'Empowers Solstice Radiance Smite Holy Damage & Magic Penetration.',
    synEffects: [
      { stat: 'elementalDamagePct', effectType: 'elemental_damage', valuePerRank: 3.4, isPercentage: true },
      { stat: 'skillDamagePct', effectType: 'damage_mult', valuePerRank: 2.8, isPercentage: true },
    ],
    utilName: 'Crusader Conviction', utilNameVi: 'Thánh Kỵ Bất Diệt',
    utilDesc: 'Grants Status Resistance and MDEF% against dark curses.',
    utilType: 'status_resistance',
    utilEffects: [
      { stat: 'statusResistancePct', effectType: 'status_resistance', valuePerRank: 5.0, isPercentage: true },
      { stat: 'mdefPct', effectType: 'damage_reduction', valuePerRank: 3.0, isPercentage: true },
    ],
    choiceAName: 'Templar Judgment', choiceANameVi: 'Thánh Kiếm Thẩm Phán (Nhánh A)',
    choiceADesc: 'Build Choice: Hybrid Paladin damage adding ATK%, MATK% & Crit Rate.',
    choiceAType: 'damage_mult',
    choiceAEffects: [
      { stat: 'atkPct', effectType: 'damage_mult', valuePerRank: 4.0, isPercentage: true },
      { stat: 'matkPct', effectType: 'damage_mult', valuePerRank: 4.0, isPercentage: true },
      { stat: 'critRatePct', effectType: 'crit_rate', valuePerRank: 2.5, isPercentage: true },
    ],
    choiceBName: 'Sanctuary Protector', choiceBNameVi: 'Thủ Hộ Thánh Điện (Nhánh B)',
    choiceBDesc: 'Build Choice: Party tank support adding Max HP%, DEF%, & Cooldown Reduction.',
    choiceBType: 'party_support',
    choiceBEffects: [
      { stat: 'hpPct', effectType: 'hp_bonus', valuePerRank: 4.5, isPercentage: true },
      { stat: 'cooldownReductionPct', effectType: 'cooldown_reduction', valuePerRank: 3.0, isPercentage: true },
    ],
    masterName: 'Dawn Sovereign Crest', masterNameVi: 'Vương Miện Bình Minh',
    masterDesc: 'Requires 60+ Skill Mastery: Boosts Healing Power and Shield efficiency.',
    masterEffects: [
      { stat: 'healingBonusPct', effectType: 'healing_bonus', valuePerRank: 5.0, isPercentage: true },
      { stat: 'shieldBonusPct', effectType: 'shield_bonus', valuePerRank: 6.0, isPercentage: true },
    ],
  }),

  // 6. Guardian
  ...makeBranchTree({
    branchId: 'guardian', branchName: 'Guardian',
    sigId: 'fortress_stance', sigName: 'Fortress Stance', sigNameVi: 'Pháo Đài Bất Động',
    sigDesc: 'Signature Guardian stance forging impenetrable DEF%, Max HP%, and Damage Reduction.',
    sigType: 'damage_reduction',
    sigEffects: [
      { stat: 'defPct', effectType: 'damage_reduction', valuePerRank: 4.0, isPercentage: true },
      { stat: 'hpPct', effectType: 'hp_bonus', valuePerRank: 3.8, isPercentage: true },
      { stat: 'damageReductionPct', effectType: 'damage_reduction', valuePerRank: 2.4, isPercentage: true },
    ],
    synergySkillId: 'skill_gd_bastion_bash',
    synName: 'Aegis Shockwave', synNameVi: 'Xung Chấn Lục Bảo',
    synDesc: 'Converts Bastion defense into heavier Shield Bonus and Counter damage.',
    synEffects: [
      { stat: 'shieldBonusPct', effectType: 'shield_bonus', valuePerRank: 5.5, isPercentage: true },
      { stat: 'skillDamagePct', effectType: 'damage_mult', valuePerRank: 2.5, isPercentage: true },
    ],
    utilName: 'Immovable Anchor', utilNameVi: 'Mỏ Neo Bất Di',
    utilDesc: 'Extreme crowd-control Status Resistance and MDEF%.',
    utilType: 'status_resistance',
    utilEffects: [
      { stat: 'statusResistancePct', effectType: 'status_resistance', valuePerRank: 5.5, isPercentage: true },
      { stat: 'mdefPct', effectType: 'damage_reduction', valuePerRank: 3.5, isPercentage: true },
    ],
    choiceAName: 'Reflective Bastion', choiceANameVi: 'Khiên Phản Chấn (Nhánh A)',
    choiceADesc: 'Build Choice: Boosts Thorns/Counter ATK% and Armor Penetration while tanking.',
    choiceAType: 'combo_bonus',
    choiceAEffects: [
      { stat: 'comboBonusPct', effectType: 'combo_bonus', valuePerRank: 5.0, isPercentage: true },
      { stat: 'atkPct', effectType: 'damage_mult', valuePerRank: 3.5, isPercentage: true },
    ],
    choiceBName: 'Crystal Titan Wall', choiceBNameVi: 'Thành Lũy Bất Tử (Nhánh B)',
    choiceBDesc: 'Build Choice: Maximum survivability with CON, Max HP%, and Healing Received.',
    choiceBType: 'hp_bonus',
    choiceBEffects: [
      { stat: 'con', effectType: 'flat_attr', valuePerRank: 8, isPercentage: false },
      { stat: 'hpPct', effectType: 'hp_bonus', valuePerRank: 5.0, isPercentage: true },
    ],
    masterName: 'Eternal Bastion Core', masterNameVi: 'Lõi Hộ Vệ Vĩnh Hằng',
    masterDesc: 'Requires 60+ Skill Mastery: Reinforces Damage Reduction and Cooldown Reduction.',
    masterEffects: [
      { stat: 'damageReductionPct', effectType: 'damage_reduction', valuePerRank: 3.5, isPercentage: true },
      { stat: 'cooldownReductionPct', effectType: 'cooldown_reduction', valuePerRank: 3.0, isPercentage: true },
    ],
  }),

  // 7. Saint
  ...makeBranchTree({
    branchId: 'saint', branchName: 'Saint',
    sigId: 'divine_grace', sigName: 'Divine Grace', sigNameVi: 'Thánh Ân Cứu Thế',
    sigDesc: 'Signature Saint aura expanding Healing Bonus, Max MP%, and Party protection.',
    sigType: 'healing_bonus',
    sigEffects: [
      { stat: 'healingBonusPct', effectType: 'healing_bonus', valuePerRank: 4.5, isPercentage: true },
      { stat: 'mpPct', effectType: 'mp_bonus', valuePerRank: 3.5, isPercentage: true },
      { stat: 'int', effectType: 'flat_attr', valuePerRank: 3, isPercentage: false },
    ],
    synergySkillId: 'skill_st_radiant_hymn',
    synName: 'Seraphic Chorus', synNameVi: 'Thánh Ca Cộng Hưởng',
    synDesc: 'Enhances Seraphic Radiant Hymn output & Cooldown Reduction.',
    synEffects: [
      { stat: 'healingBonusPct', effectType: 'healing_bonus', valuePerRank: 3.5, isPercentage: true },
      { stat: 'cooldownReductionPct', effectType: 'cooldown_reduction', valuePerRank: 2.5, isPercentage: true },
    ],
    utilName: 'Tranquil Mana Well', utilNameVi: 'Suối Nguồn Ma Lực',
    utilDesc: 'Saves MP costs in long raids and raises Status Resistance.',
    utilType: 'resource_efficiency',
    utilEffects: [
      { stat: 'resourceEfficiencyPct', effectType: 'resource_efficiency', valuePerRank: 3.8, isPercentage: true },
      { stat: 'statusResistancePct', effectType: 'status_resistance', valuePerRank: 4.0, isPercentage: true },
    ],
    choiceAName: 'Golden Ward Sanctum', choiceANameVi: 'Thánh Vực Hộ Mệnh (Nhánh A)',
    choiceADesc: 'Build Choice: Boosts Shield Bonus and Damage Reduction for survival.',
    choiceAType: 'shield_bonus',
    choiceAEffects: [
      { stat: 'shieldBonusPct', effectType: 'shield_bonus', valuePerRank: 7.0, isPercentage: true },
      { stat: 'damageReductionPct', effectType: 'damage_reduction', valuePerRank: 3.5, isPercentage: true },
    ],
    choiceBName: 'Hymn of Haste', choiceBNameVi: 'Nhịp Điệu Thánh Ân (Nhánh B)',
    choiceBDesc: 'Build Choice: Boosts Cooldown Reduction and Movement Speed to rescue allies rapidly.',
    choiceBType: 'cooldown_reduction',
    choiceBEffects: [
      { stat: 'cooldownReductionPct', effectType: 'cooldown_reduction', valuePerRank: 4.0, isPercentage: true },
      { stat: 'moveSpeedBonusPct', effectType: 'move_speed', valuePerRank: 4.0, isPercentage: true },
    ],
    masterName: 'Seraphic Covenant', masterNameVi: 'Giao Ước Thiên Sứ',
    masterDesc: 'Requires 60+ Skill Mastery: Boosts Healing Bonus & MATK% support power.',
    masterEffects: [
      { stat: 'healingBonusPct', effectType: 'healing_bonus', valuePerRank: 5.5, isPercentage: true },
      { stat: 'matkPct', effectType: 'damage_mult', valuePerRank: 3.5, isPercentage: true },
    ],
  }),

  // 8. Exorcist
  ...makeBranchTree({
    branchId: 'exorcist', branchName: 'Exorcist',
    sigId: 'sacred_seal', sigName: 'Sacred Seal', sigNameVi: 'Thánh Ấn Trừ Tà',
    sigDesc: 'Signature Exorcist seal surging MATK%, Magic Penetration & Holy Lightning damage.',
    sigType: 'magic_penetration',
    sigEffects: [
      { stat: 'matkPct', effectType: 'damage_mult', valuePerRank: 3.0, isPercentage: true },
      { stat: 'magicPenetrationPct', effectType: 'magic_penetration', valuePerRank: 3.2, isPercentage: true },
      { stat: 'int', effectType: 'flat_attr', valuePerRank: 3, isPercentage: false },
    ],
    synergySkillId: 'skill_ex_judgement_talisman',
    synName: 'Judgement Inscription', synNameVi: 'Phù Chú Phán Quyết',
    synDesc: 'Empowers Judgement Talisman crit rate and spell burst.',
    synEffects: [
      { stat: 'critRatePct', effectType: 'crit_rate', valuePerRank: 2.8, isPercentage: true },
      { stat: 'skillDamagePct', effectType: 'damage_mult', valuePerRank: 3.2, isPercentage: true },
    ],
    utilName: 'Bane of Evil', utilNameVi: 'Thanh Tẩy Tà Khí',
    utilDesc: 'Grants Status Resistance and emergency off-Healing Bonus.',
    utilType: 'status_resistance',
    utilEffects: [
      { stat: 'statusResistancePct', effectType: 'status_resistance', valuePerRank: 4.5, isPercentage: true },
      { stat: 'healingBonusPct', effectType: 'healing_bonus', valuePerRank: 3.0, isPercentage: true },
    ],
    choiceAName: 'Inquisitor Verdict', choiceANameVi: 'Thánh Lôi Phán Xét (Nhánh A)',
    choiceADesc: 'Build Choice: Maximizes Crit Damage and Elemental Holy/Lightning potency.',
    choiceAType: 'crit_damage',
    choiceAEffects: [
      { stat: 'critDamageBonusPct', effectType: 'crit_damage', valuePerRank: 9.0, isPercentage: true },
      { stat: 'elementalDamagePct', effectType: 'elemental_damage', valuePerRank: 5.0, isPercentage: true },
    ],
    choiceBName: 'Endless Talismans', choiceBNameVi: 'Liên Hoàn Phù Ấn (Nhánh B)',
    choiceBDesc: 'Build Choice: Cooldown Reduction and Resource Efficiency for rapid talismans.',
    choiceBType: 'cooldown_reduction',
    choiceBEffects: [
      { stat: 'cooldownReductionPct', effectType: 'cooldown_reduction', valuePerRank: 3.8, isPercentage: true },
      { stat: 'resourceEfficiencyPct', effectType: 'resource_efficiency', valuePerRank: 4.2, isPercentage: true },
    ],
    masterName: 'Arch-Exorcist Rite', masterNameVi: 'Đại Nghi Thức Trừ Tà',
    masterDesc: 'Requires 60+ Skill Mastery: Boosts Magic Penetration and Boss spell damage.',
    masterEffects: [
      { stat: 'magicPenetrationPct', effectType: 'magic_penetration', valuePerRank: 4.0, isPercentage: true },
      { stat: 'matkPct', effectType: 'damage_mult', valuePerRank: 4.2, isPercentage: true },
    ],
    bossModifier: 1.18,
  }),

  // 9. Elementalist
  ...makeBranchTree({
    branchId: 'elementalist', branchName: 'Elementalist',
    sigId: 'elemental_resonance', sigName: 'Elemental Resonance', sigNameVi: 'Tam Nguyên Cộng Hưởng',
    sigDesc: 'Signature Elementalist harmony raising Elemental Damage%, MATK%, and INT.',
    sigType: 'elemental_damage',
    sigEffects: [
      { stat: 'elementalDamagePct', effectType: 'elemental_damage', valuePerRank: 3.6, isPercentage: true },
      { stat: 'matkPct', effectType: 'damage_mult', valuePerRank: 3.0, isPercentage: true },
      { stat: 'int', effectType: 'flat_attr', valuePerRank: 4, isPercentage: false },
    ],
    synergySkillId: 'skill_el_tri_convergence',
    synName: 'Prismatic Overload', synNameVi: 'Bùng Nổ Tam Nguyên',
    synDesc: 'Empowers Tri-Elemental Convergence Skill Damage and Magic Penetration.',
    synEffects: [
      { stat: 'skillDamagePct', effectType: 'damage_mult', valuePerRank: 3.8, isPercentage: true },
      { stat: 'magicPenetrationPct', effectType: 'magic_penetration', valuePerRank: 2.8, isPercentage: true },
    ],
    utilName: 'Aether Barrier', utilNameVi: 'Kết Giới Nguyên Tố',
    utilDesc: 'Grants Max MP% and Elemental Shield absorption.',
    utilType: 'shield_bonus',
    utilEffects: [
      { stat: 'mpPct', effectType: 'mp_bonus', valuePerRank: 4.0, isPercentage: true },
      { stat: 'shieldBonusPct', effectType: 'shield_bonus', valuePerRank: 4.5, isPercentage: true },
    ],
    choiceAName: 'Cataclysmic Surge', choiceANameVi: 'Đại Bạo Phát (Nhánh A)',
    choiceADesc: 'Build Choice: Maximum Crit Rate & Crit Damage on Elemental AoE nukes.',
    choiceAType: 'crit_damage',
    choiceAEffects: [
      { stat: 'critRatePct', effectType: 'crit_rate', valuePerRank: 3.2, isPercentage: true },
      { stat: 'critDamageBonusPct', effectType: 'crit_damage', valuePerRank: 9.0, isPercentage: true },
    ],
    choiceBName: 'Perpetual Storm', choiceBNameVi: 'Vòng Xoáy Vĩnh Cửu (Nhánh B)',
    choiceBDesc: 'Build Choice: Cooldown Reduction and MP Efficiency for nonstop AoE farming.',
    choiceBType: 'cooldown_reduction',
    choiceBEffects: [
      { stat: 'cooldownReductionPct', effectType: 'cooldown_reduction', valuePerRank: 4.0, isPercentage: true },
      { stat: 'resourceEfficiencyPct', effectType: 'resource_efficiency', valuePerRank: 4.5, isPercentage: true },
    ],
    masterName: 'Sovereign of Elements', masterNameVi: 'Chúa Tể Nguyên Tố',
    masterDesc: 'Requires 60+ Skill Mastery: Massive Elemental & MATK% synergy.',
    masterEffects: [
      { stat: 'elementalDamagePct', effectType: 'elemental_damage', valuePerRank: 5.5, isPercentage: true },
      { stat: 'matkPct', effectType: 'damage_mult', valuePerRank: 4.5, isPercentage: true },
    ],
    pveModifier: 1.15,
  }),

  // 10. Arcanist
  ...makeBranchTree({
    branchId: 'arcanist', branchName: 'Arcanist',
    sigId: 'arcane_compression', sigName: 'Arcane Compression', sigNameVi: 'Nén Năng Lượng Bí Ẩn',
    sigDesc: 'Signature Arcanist compression focusing Cooldown Reduction, Magic Penetration, and Resource Efficiency.',
    sigType: 'cooldown_reduction',
    sigEffects: [
      { stat: 'cooldownReductionPct', effectType: 'cooldown_reduction', valuePerRank: 2.4, isPercentage: true },
      { stat: 'magicPenetrationPct', effectType: 'magic_penetration', valuePerRank: 3.2, isPercentage: true },
      { stat: 'matkPct', effectType: 'damage_mult', valuePerRank: 2.8, isPercentage: true },
    ],
    synergySkillId: 'skill_ar_gravity_singularity',
    synName: 'Cosmic Alignment', synNameVi: 'Tinh Bàn Giao Thoa',
    synDesc: 'Empowers Astral Singularity damage & cast Crit Rate.',
    synEffects: [
      { stat: 'skillDamagePct', effectType: 'damage_mult', valuePerRank: 3.8, isPercentage: true },
      { stat: 'critRatePct', effectType: 'crit_rate', valuePerRank: 2.5, isPercentage: true },
    ],
    utilName: 'Dimensional Shift', utilNameVi: 'Không Gian Dịch Chuyển',
    utilDesc: 'Grants Evasion and Movement Speed when weaving astral runes.',
    utilType: 'evasion',
    utilEffects: [
      { stat: 'evasionPct', effectType: 'evasion', valuePerRank: 2.5, isPercentage: true },
      { stat: 'moveSpeedBonusPct', effectType: 'move_speed', valuePerRank: 3.0, isPercentage: true },
    ],
    choiceAName: 'Singularity Core', choiceANameVi: 'Hạch Điểm Kỳ Dị (Nhánh A)',
    choiceADesc: 'Build Choice: Extreme single-target Magic Penetration and Crit Damage vs Bosses.',
    choiceAType: 'magic_penetration',
    choiceAEffects: [
      { stat: 'magicPenetrationPct', effectType: 'magic_penetration', valuePerRank: 4.5, isPercentage: true },
      { stat: 'critDamageBonusPct', effectType: 'crit_damage', valuePerRank: 8.5, isPercentage: true },
    ],
    choiceBName: 'Astral Infinity', choiceBNameVi: 'Tinh Tú Vô Tận (Nhánh B)',
    choiceBDesc: 'Build Choice: Maximum MP% & Resource Efficiency for endless rapid casting.',
    choiceBType: 'resource_efficiency',
    choiceBEffects: [
      { stat: 'mpPct', effectType: 'mp_bonus', valuePerRank: 6.0, isPercentage: true },
      { stat: 'resourceEfficiencyPct', effectType: 'resource_efficiency', valuePerRank: 5.0, isPercentage: true },
    ],
    masterName: 'Cosmos Architect', masterNameVi: 'Kiến Trúc Sư Vũ Trụ',
    masterDesc: 'Requires 60+ Skill Mastery: Boosts Cooldown Reduction and MATK%.',
    masterEffects: [
      { stat: 'cooldownReductionPct', effectType: 'cooldown_reduction', valuePerRank: 3.0, isPercentage: true },
      { stat: 'matkPct', effectType: 'damage_mult', valuePerRank: 4.5, isPercentage: true },
    ],
    bossModifier: 1.18,
  }),

  // 11. Shadowblade
  ...makeBranchTree({
    branchId: 'shadowblade', branchName: 'Shadowblade',
    sigId: 'lethal_precision', sigName: 'Lethal Precision', sigNameVi: 'Ám Sát Cực Hạn (Ảnh Nhận)',
    sigDesc: 'Signature Shadowblade execution mastery boosting Crit Rate, Crit Damage & Armor Penetration.',
    sigType: 'crit_damage',
    sigEffects: [
      { stat: 'critRatePct', effectType: 'crit_rate', valuePerRank: 2.8, isPercentage: true },
      { stat: 'critDamageBonusPct', effectType: 'crit_damage', valuePerRank: 6.5, isPercentage: true },
      { stat: 'armorPenetrationPct', effectType: 'armor_penetration', valuePerRank: 2.5, isPercentage: true },
    ],
    synergySkillId: 'skill_sb_nightfall_eviscerate',
    synName: 'Nightfall Arterial Strike', synNameVi: 'Đoạt Mệnh Liên Kích',
    synDesc: 'Empowers Nightfall Eviscerate skill damage & ASPD.',
    synEffects: [
      { stat: 'skillDamagePct', effectType: 'damage_mult', valuePerRank: 3.6, isPercentage: true },
      { stat: 'aspdBonusPct', effectType: 'attack_speed', valuePerRank: 3.2, isPercentage: true },
    ],
    utilName: 'Shadow Cloak', utilNameVi: 'Áo Choàng Bóng Đêm',
    utilDesc: 'Grants Evasion and Lifesteal after executing ambushes.',
    utilType: 'evasion',
    utilEffects: [
      { stat: 'evasionPct', effectType: 'evasion', valuePerRank: 3.0, isPercentage: true },
      { stat: 'lifestealPct', effectType: 'lifesteal', valuePerRank: 1.4, isPercentage: true },
    ],
    choiceAName: 'Executioner Verdict', choiceANameVi: 'Án Tử Ảnh Nhận (Nhánh A)',
    choiceADesc: 'Build Choice: Overwhelming Crit Damage & Armor Penetration on isolated Bosses.',
    choiceAType: 'crit_damage',
    choiceAEffects: [
      { stat: 'critDamageBonusPct', effectType: 'crit_damage', valuePerRank: 10.0, isPercentage: true },
      { stat: 'armorPenetrationPct', effectType: 'armor_penetration', valuePerRank: 4.5, isPercentage: true },
    ],
    choiceBName: 'Dusk Stalker', choiceBNameVi: 'Ảnh Bộ Tốc Hành (Nhánh B)',
    choiceBDesc: 'Build Choice: Cooldown Reduction and Movement Speed for skirmishing & PvP.',
    choiceBType: 'cooldown_reduction',
    choiceBEffects: [
      { stat: 'cooldownReductionPct', effectType: 'cooldown_reduction', valuePerRank: 3.8, isPercentage: true },
      { stat: 'moveSpeedBonusPct', effectType: 'move_speed', valuePerRank: 4.0, isPercentage: true },
    ],
    masterName: 'Eclipse Assassin Apex', masterNameVi: 'Ảnh Nhận Độc Tôn',
    masterDesc: 'Requires 60+ Skill Mastery: Elevates Combo Bonus and AGI.',
    masterEffects: [
      { stat: 'comboBonusPct', effectType: 'combo_bonus', valuePerRank: 5.5, isPercentage: true },
      { stat: 'agi', effectType: 'flat_attr', valuePerRank: 6, isPercentage: false },
    ],
    pvpModifier: 1.05,
    bossModifier: 1.15,
  }),

  // 12. Phantom
  ...makeBranchTree({
    branchId: 'phantom', branchName: 'Phantom',
    sigId: 'phantom_echo', sigName: 'Phantom Echo', sigNameVi: 'Huyễn Ảnh Cộng Hưởng',
    sigDesc: 'Signature Phantom illusion passive elevating Evasion, Attack Speed & Combo Echoes.',
    sigType: 'evasion',
    sigEffects: [
      { stat: 'evasionPct', effectType: 'evasion', valuePerRank: 2.8, isPercentage: true },
      { stat: 'aspdBonusPct', effectType: 'attack_speed', valuePerRank: 3.0, isPercentage: true },
      { stat: 'comboBonusPct', effectType: 'combo_bonus', valuePerRank: 3.0, isPercentage: true },
    ],
    synergySkillId: 'skill_ph_spectral_blades',
    synName: 'Mirage Blade Waltz', synNameVi: 'Vũ Điệu Phi Đao',
    synDesc: 'Empowers Spectral Mirage Fan AoE damage & Crit Rate.',
    synEffects: [
      { stat: 'skillDamagePct', effectType: 'damage_mult', valuePerRank: 3.5, isPercentage: true },
      { stat: 'critRatePct', effectType: 'crit_rate', valuePerRank: 2.4, isPercentage: true },
    ],
    utilName: 'Spectral Veil', utilNameVi: 'Màn Sương Ảo Giác',
    utilDesc: 'Grants Movement Speed and Status Resistance through illusion shifts.',
    utilType: 'move_speed',
    utilEffects: [
      { stat: 'moveSpeedBonusPct', effectType: 'move_speed', valuePerRank: 3.5, isPercentage: true },
      { stat: 'statusResistancePct', effectType: 'status_resistance', valuePerRank: 4.0, isPercentage: true },
    ],
    choiceAName: 'Twin Phantasm', choiceANameVi: 'Song Ảnh Phân Thân (Nhánh A)',
    choiceADesc: 'Build Choice: Amplifies Combo Damage & Attack Speed for multi-target shredding.',
    choiceAType: 'combo_bonus',
    choiceAEffects: [
      { stat: 'comboBonusPct', effectType: 'combo_bonus', valuePerRank: 6.0, isPercentage: true },
      { stat: 'atkPct', effectType: 'damage_mult', valuePerRank: 4.0, isPercentage: true },
    ],
    choiceBName: 'Untouchable Mirage', choiceBNameVi: 'Bất Khả Xâm Phạm (Nhánh B)',
    choiceBDesc: 'Build Choice: Maximizes Evasion & Cooldown Reduction.',
    choiceBType: 'evasion',
    choiceBEffects: [
      { stat: 'evasionPct', effectType: 'evasion', valuePerRank: 4.0, isPercentage: true },
      { stat: 'cooldownReductionPct', effectType: 'cooldown_reduction', valuePerRank: 3.8, isPercentage: true },
    ],
    masterName: 'Lord of Illusions', masterNameVi: 'Ảo Ảnh Ma Đế',
    masterDesc: 'Requires 60+ Skill Mastery: Boosts Crit Damage and AGI agility.',
    masterEffects: [
      { stat: 'critDamageBonusPct', effectType: 'crit_damage', valuePerRank: 7.5, isPercentage: true },
      { stat: 'agi', effectType: 'flat_attr', valuePerRank: 6, isPercentage: false },
    ],
  }),

  // 13. Martial Artist
  ...makeBranchTree({
    branchId: 'martial_artist', branchName: 'Martial Artist',
    sigId: 'inner_force', sigName: 'Inner Force', sigNameVi: 'Kim Liên Nội Kình',
    sigDesc: 'Signature Martial Artist internal chi amplifying ATK%, Armor Penetration & STR.',
    sigType: 'armor_penetration',
    sigEffects: [
      { stat: 'atkPct', effectType: 'damage_mult', valuePerRank: 3.2, isPercentage: true },
      { stat: 'armorPenetrationPct', effectType: 'armor_penetration', valuePerRank: 2.8, isPercentage: true },
      { stat: 'str', effectType: 'flat_attr', valuePerRank: 3, isPercentage: false },
    ],
    synergySkillId: 'skill_ma_crimson_tiger_fang',
    synName: 'Tiger Chi Impact', synNameVi: 'Hổ Quyền Chấn Kình',
    synDesc: 'Empowers Crimson Tiger Fang skill power & Crit Damage.',
    synEffects: [
      { stat: 'skillDamagePct', effectType: 'damage_mult', valuePerRank: 3.6, isPercentage: true },
      { stat: 'critDamageBonusPct', effectType: 'crit_damage', valuePerRank: 6.0, isPercentage: true },
    ],
    utilName: 'Iron Body Qigong', utilNameVi: 'Thiết Bố Sam Khí Công',
    utilDesc: 'Channels chi into Damage Reduction & Max HP%.',
    utilType: 'damage_reduction',
    utilEffects: [
      { stat: 'damageReductionPct', effectType: 'damage_reduction', valuePerRank: 2.8, isPercentage: true },
      { stat: 'hpPct', effectType: 'hp_bonus', valuePerRank: 3.2, isPercentage: true },
    ],
    choiceAName: 'Asura Breaker', choiceANameVi: 'Tu La Phá Giáp (Nhánh A)',
    choiceADesc: 'Build Choice: Pure boss-shattering Armor Penetration & Elemental Fire Chi.',
    choiceAType: 'elemental_damage',
    choiceAEffects: [
      { stat: 'armorPenetrationPct', effectType: 'armor_penetration', valuePerRank: 4.5, isPercentage: true },
      { stat: 'elementalDamagePct', effectType: 'elemental_damage', valuePerRank: 5.0, isPercentage: true },
    ],
    choiceBName: 'Lotus Regeneration', choiceBNameVi: 'Liên Hoa Hồi Khí (Nhánh B)',
    choiceBDesc: 'Build Choice: Sustained brawler Lifesteal and Status Resistance.',
    choiceBType: 'lifesteal',
    choiceBEffects: [
      { stat: 'lifestealPct', effectType: 'lifesteal', valuePerRank: 2.0, isPercentage: true },
      { stat: 'statusResistancePct', effectType: 'status_resistance', valuePerRank: 5.0, isPercentage: true },
    ],
    masterName: 'Grandmaster of Palms', masterNameVi: 'Võ Thánh Bách Quyền',
    masterDesc: 'Requires 60+ Skill Mastery: Boosts ATK% & Combo scaling.',
    masterEffects: [
      { stat: 'atkPct', effectType: 'damage_mult', valuePerRank: 4.2, isPercentage: true },
      { stat: 'comboBonusPct', effectType: 'combo_bonus', valuePerRank: 4.5, isPercentage: true },
    ],
    bossModifier: 1.15,
  }),

  // 14. Duelist
  ...makeBranchTree({
    branchId: 'duelist', branchName: 'Duelist',
    sigId: 'perfect_counter', sigName: 'Perfect Counter', sigNameVi: 'Phản Kích Tuyệt Đối',
    sigDesc: 'Signature Duelist tempo sharpening Crit Rate, ASPD%, and Evasion.',
    sigType: 'crit_rate',
    sigEffects: [
      { stat: 'critRatePct', effectType: 'crit_rate', valuePerRank: 2.6, isPercentage: true },
      { stat: 'aspdBonusPct', effectType: 'attack_speed', valuePerRank: 3.2, isPercentage: true },
      { stat: 'evasionPct', effectType: 'evasion', valuePerRank: 2.0, isPercentage: true },
    ],
    synergySkillId: 'skill_dl_velocity_riposte',
    synName: 'Riposte Cadence', synNameVi: 'Liên Vũ Phản Đòn',
    synDesc: 'Empowers Velocity Riposte multi-hit Combo Damage & Crit Damage.',
    synEffects: [
      { stat: 'comboBonusPct', effectType: 'combo_bonus', valuePerRank: 3.8, isPercentage: true },
      { stat: 'critDamageBonusPct', effectType: 'crit_damage', valuePerRank: 5.5, isPercentage: true },
    ],
    utilName: 'Wind Footwork', utilNameVi: 'Phong Hành Bộ',
    utilDesc: 'Grants Movement Speed and Accuracy to stick to agile targets.',
    utilType: 'move_speed',
    utilEffects: [
      { stat: 'moveSpeedBonusPct', effectType: 'move_speed', valuePerRank: 3.2, isPercentage: true },
      { stat: 'accuracy', effectType: 'accuracy', valuePerRank: 12, isPercentage: false },
    ],
    choiceAName: 'Endless Tempo', choiceANameVi: 'Liên Hoàn Vô Tận (Nhánh A)',
    choiceADesc: 'Build Choice: Maximizes ASPD% and Cooldown Reduction.',
    choiceAType: 'cooldown_reduction',
    choiceAEffects: [
      { stat: 'aspdBonusPct', effectType: 'attack_speed', valuePerRank: 4.5, isPercentage: true },
      { stat: 'cooldownReductionPct', effectType: 'cooldown_reduction', valuePerRank: 3.8, isPercentage: true },
    ],
    choiceBName: 'Duelsmith Guard', choiceBNameVi: 'Thân Pháp Quyết Đấu (Nhánh B)',
    choiceBDesc: 'Build Choice: Boosts Evasion and Lifesteal in 1v1 PvP.',
    choiceBType: 'evasion',
    choiceBEffects: [
      { stat: 'evasionPct', effectType: 'evasion', valuePerRank: 3.8, isPercentage: true },
      { stat: 'lifestealPct', effectType: 'lifesteal', valuePerRank: 1.8, isPercentage: true },
    ],
    masterName: 'Virtuoso Finale', masterNameVi: 'Đỉnh Cao Quyết Đấu',
    masterDesc: 'Requires 60+ Skill Mastery: Boosts Crit Damage and DEX precision.',
    masterEffects: [
      { stat: 'critDamageBonusPct', effectType: 'crit_damage', valuePerRank: 8.0, isPercentage: true },
      { stat: 'dex', effectType: 'flat_attr', valuePerRank: 6, isPercentage: false },
    ],
    pvpModifier: 1.08,
  }),

  // 15. Sniper
  ...makeBranchTree({
    branchId: 'sniper', branchName: 'Sniper',
    sigId: 'deadeye', sigName: 'Deadeye', sigNameVi: 'Bách Phát Bách Trúng',
    sigDesc: 'Signature Sniper focus unlocking supreme Crit Rate, Accuracy, and Crit Damage.',
    sigType: 'crit_rate',
    sigEffects: [
      { stat: 'critRatePct', effectType: 'crit_rate', valuePerRank: 3.0, isPercentage: true },
      { stat: 'accuracy', effectType: 'accuracy', valuePerRank: 14, isPercentage: false },
      { stat: 'critDamageBonusPct', effectType: 'crit_damage', valuePerRank: 5.5, isPercentage: true },
    ],
    synergySkillId: 'skill_sn_starlight_railshot',
    synName: 'Railshot Calibration', synNameVi: 'Hiệu Chỉnh Quang Tuyến',
    synDesc: 'Empowers Starlight Railshot Armor Penetration and Skill Damage.',
    synEffects: [
      { stat: 'armorPenetrationPct', effectType: 'armor_penetration', valuePerRank: 3.5, isPercentage: true },
      { stat: 'skillDamagePct', effectType: 'damage_mult', valuePerRank: 3.6, isPercentage: true },
    ],
    utilName: 'Vantage Kiting', utilNameVi: 'Giữ Cự Ly Chiến Thuật',
    utilDesc: 'Grants Movement Speed & Status Resistance to maintain range.',
    utilType: 'move_speed',
    utilEffects: [
      { stat: 'moveSpeedBonusPct', effectType: 'move_speed', valuePerRank: 3.0, isPercentage: true },
      { stat: 'statusResistancePct', effectType: 'status_resistance', valuePerRank: 3.5, isPercentage: true },
    ],
    choiceAName: 'Orbital Penetration', choiceANameVi: 'Xuyên Giáp Quỹ Đạo (Nhánh A)',
    choiceADesc: 'Build Choice: Extreme Armor Penetration & Boss Critical Multiplier.',
    choiceAType: 'armor_penetration',
    choiceAEffects: [
      { stat: 'armorPenetrationPct', effectType: 'armor_penetration', valuePerRank: 5.0, isPercentage: true },
      { stat: 'critDamageBonusPct', effectType: 'crit_damage', valuePerRank: 9.5, isPercentage: true },
    ],
    choiceBName: 'Rapid Reload Focus', choiceBNameVi: 'Nạp Tiễn Siêu Tốc (Nhánh B)',
    choiceBDesc: 'Build Choice: Cooldown Reduction and Attack Speed for sustained DPS.',
    choiceBType: 'attack_speed',
    choiceBEffects: [
      { stat: 'aspdBonusPct', effectType: 'attack_speed', valuePerRank: 4.5, isPercentage: true },
      { stat: 'cooldownReductionPct', effectType: 'cooldown_reduction', valuePerRank: 3.8, isPercentage: true },
    ],
    masterName: 'Starlight Marksman Apex', masterNameVi: 'Thần Tiễn Tối Thượng',
    masterDesc: 'Requires 60+ Skill Mastery: Boosts ATK% & DEX.',
    masterEffects: [
      { stat: 'atkPct', effectType: 'damage_mult', valuePerRank: 4.5, isPercentage: true },
      { stat: 'dex', effectType: 'flat_attr', valuePerRank: 6, isPercentage: false },
    ],
    bossModifier: 1.2,
  }),

  // 16. Ranger
  ...makeBranchTree({
    branchId: 'ranger', branchName: 'Ranger',
    sigId: 'predators_instinct', sigName: "Predator's Instinct", sigNameVi: 'Bản Năng Săn Mồi',
    sigDesc: 'Signature Ranger survivalism elevating ASPD%, Move Speed, and AGI dexterity.',
    sigType: 'move_speed',
    sigEffects: [
      { stat: 'aspdBonusPct', effectType: 'attack_speed', valuePerRank: 3.0, isPercentage: true },
      { stat: 'moveSpeedBonusPct', effectType: 'move_speed', valuePerRank: 3.0, isPercentage: true },
      { stat: 'agi', effectType: 'flat_attr', valuePerRank: 3, isPercentage: false },
    ],
    synergySkillId: 'skill_rg_leaf_tempest',
    synName: 'Gale Canopy Volley', synNameVi: 'Liên Xạ Bão Lá',
    synDesc: 'Empowers Sylvan Leaf Tempest Nature/Elemental damage & Cooldown Reduction.',
    synEffects: [
      { stat: 'elementalDamagePct', effectType: 'elemental_damage', valuePerRank: 3.6, isPercentage: true },
      { stat: 'skillDamagePct', effectType: 'damage_mult', valuePerRank: 3.2, isPercentage: true },
    ],
    utilName: 'Forest Camouflage', utilNameVi: 'Ngụy Trang Rừng Sâu',
    utilDesc: 'Boosts Evasion and Lifesteal survival in multi-mob encounters.',
    utilType: 'evasion',
    utilEffects: [
      { stat: 'evasionPct', effectType: 'evasion', valuePerRank: 3.2, isPercentage: true },
      { stat: 'lifestealPct', effectType: 'lifesteal', valuePerRank: 1.4, isPercentage: true },
    ],
    choiceAName: 'Venomous Hail', choiceANameVi: 'Mưa Tên Độc Thảo (Nhánh A)',
    choiceADesc: 'Build Choice: Amplifies AoE Crit Rate and Elemental Nature Damage.',
    choiceAType: 'elemental_damage',
    choiceAEffects: [
      { stat: 'critRatePct', effectType: 'crit_rate', valuePerRank: 3.2, isPercentage: true },
      { stat: 'elementalDamagePct', effectType: 'elemental_damage', valuePerRank: 5.5, isPercentage: true },
    ],
    choiceBName: 'Phantom Strider', choiceBNameVi: 'Du Hiệp Lướt Gió (Nhánh B)',
    choiceBDesc: 'Build Choice: Cooldown Reduction and Resource Efficiency for continuous traps/volleys.',
    choiceBType: 'cooldown_reduction',
    choiceBEffects: [
      { stat: 'cooldownReductionPct', effectType: 'cooldown_reduction', valuePerRank: 4.0, isPercentage: true },
      { stat: 'resourceEfficiencyPct', effectType: 'resource_efficiency', valuePerRank: 4.5, isPercentage: true },
    ],
    masterName: 'Warden of the Wilds', masterNameVi: 'Thủ Hộ Đại Ngàn',
    masterDesc: 'Requires 60+ Skill Mastery: Boosts ATK% & Accuracy.',
    masterEffects: [
      { stat: 'atkPct', effectType: 'damage_mult', valuePerRank: 4.0, isPercentage: true },
      { stat: 'accuracy', effectType: 'accuracy', valuePerRank: 16, isPercentage: false },
    ],
    pveModifier: 1.15,
  }),
];

export const ALL_PASSIVE_DEFINITIONS: PassiveDefinition[] = [
  ...BASE_JOB_PASSIVES,
  ...ADVANCED_JOB_PASSIVES,
];

export const PASSIVE_BY_ID: Record<string, PassiveDefinition> = Object.fromEntries(
  ALL_PASSIVE_DEFINITIONS.map((p) => [p.id, p])
);

// ==========================================
// PHASE 5: PASSIVE POINT PROGRESSION & VALIDATION
// ==========================================

export const PASSIVE_PROGRESSION_CONFIG = {
  unlockLevel: 15,
  levelsPerPoint: 3, // +1 point every 3 levels starting Lv.15 up to Lv.200
  firstJobAwakeningBonusPoints: 3,
  lv80BranchBonusPoints: 6,
  cumulativeMasteryPerBonusPoint: 100, // Every 100 total Skill Mastery points grants +1 Passive Point (connects Skill Mastery <-> Passive Tree!)
  maxMasteryBonusPoints: 12,
  respecGoldPerSpentPoint: 250,
  respecScrollItemId: 'ITEM_PASSIVE_RESET_SCROLL',
};

export function computeEarnedPassivePoints(char: Partial<CharacterEntity>): {
  earned: number;
  fromLevels: number;
  fromAdvancements: number;
  fromMastery: number;
  totalCumulativeMastery: number;
} {
  const lv = Math.max(1, Number(char.level || 1));
  if (lv < PASSIVE_PROGRESSION_CONFIG.unlockLevel) {
    return { earned: 0, fromLevels: 0, fromAdvancements: 0, fromMastery: 0, totalCumulativeMastery: 0 };
  }

  const fromLevels = Math.floor((lv - PASSIVE_PROGRESSION_CONFIG.unlockLevel) / PASSIVE_PROGRESSION_CONFIG.levelsPerPoint) + 1;
  let fromAdvancements = 0;
  if (char.jobAdvancementCompleted) {
    fromAdvancements += PASSIVE_PROGRESSION_CONFIG.firstJobAwakeningBonusPoints;
  }
  if (char.advancedJobId) {
    fromAdvancements += PASSIVE_PROGRESSION_CONFIG.lv80BranchBonusPoints;
  }

  let totalCumulativeMastery = 0;
  for (const m of Object.values(char.skillMastery || {})) {
    totalCumulativeMastery += Number(m?.points || 0);
  }
  const fromMastery = Math.min(
    PASSIVE_PROGRESSION_CONFIG.maxMasteryBonusPoints,
    Math.floor(totalCumulativeMastery / PASSIVE_PROGRESSION_CONFIG.cumulativeMasteryPerBonusPoint)
  );

  return {
    earned: fromLevels + fromAdvancements + fromMastery,
    fromLevels,
    fromAdvancements,
    fromMastery,
    totalCumulativeMastery,
  };
}

export function getPassiveTreeForCharacter(
  classId?: string | null,
  advancedJobId?: string | null
): PassiveDefinition[] {
  const baseNorm = normalizeBaseClassId(classId);
  if (baseNorm === 'adventurer') return [];
  const basePassives = BASE_JOB_PASSIVES.filter((p) => p.classRequirement === baseNorm);
  const advPassives = advancedJobId
    ? ADVANCED_JOB_PASSIVES.filter((p) => p.branchRequirement === advancedJobId)
    : [];
  return [...basePassives, ...advPassives];
}

export function computePassivePointsSpent(
  allocations: Record<string, number> = {}
): number {
  let spent = 0;
  for (const [pid, rawRank] of Object.entries(allocations || {})) {
    const rank = Math.max(0, Math.floor(Number(rawRank || 0)));
    if (rank <= 0) continue;
    const def = PASSIVE_BY_ID[pid];
    spent += rank * (def?.pointCostPerRank ?? 1);
  }
  return spent;
}

export function validatePassiveAllocation(
  char: Partial<CharacterEntity>,
  passiveId: string,
  requestedDeltaRank: number = 1
): { valid: true; passive: PassiveDefinition; cost: number; nextRank: number } | { valid: false; reason: string } {
  const passive = PASSIVE_BY_ID[passiveId];
  if (!passive) {
    return { valid: false, reason: `Nội tại "${passiveId}" không tồn tại.` };
  }
  if (requestedDeltaRank <= 0 || !Number.isInteger(requestedDeltaRank)) {
    return { valid: false, reason: 'Số cấp nâng nội tại phải là số nguyên dương.' };
  }

  const baseNorm = normalizeBaseClassId(char.classId);
  if (baseNorm === 'adventurer' || !char.jobAdvancementCompleted) {
    return { valid: false, reason: 'Cần hoàn thành Thức Tỉnh Nghề Lv.15 để mở khóa Bảng Nội Tại.' };
  }

  if (passive.branchRequirement) {
    if (!char.advancedJobId) {
      return { valid: false, reason: `Nội tại "${passive.nameVi}" yêu cầu Chuyển Chức Lv.80 (${passive.branchRequirement}).` };
    }
    if (char.advancedJobId !== passive.branchRequirement) {
      return { valid: false, reason: `Nhánh ${char.advancedJobId} không thể học nội tại thuộc nhánh ${passive.branchRequirement}!` };
    }
  } else if (passive.classRequirement !== 'any' && passive.classRequirement !== baseNorm) {
    return { valid: false, reason: `Nội tại "${passive.nameVi}" chỉ dành cho nghề ${passive.classRequirement}.` };
  }

  const charLevel = Number(char.level || 1);
  if (charLevel < passive.requiredCharacterLevel) {
    return { valid: false, reason: `Cần đạt Lv.${passive.requiredCharacterLevel} để học "${passive.nameVi}".` };
  }

  const allocs = char.passiveAllocations || {};
  const curRank = Math.max(0, Math.floor(Number(allocs[passiveId] || 0)));
  const nextRank = curRank + requestedDeltaRank;
  if (nextRank > passive.maxRank) {
    return { valid: false, reason: `Nội tại "${passive.nameVi}" đã đạt hạng tối đa (${passive.maxRank}).` };
  }

  // Parent prerequisites check
  for (const parentId of passive.parentPassiveIds) {
    const pRank = Number(allocs[parentId] || 0);
    if (pRank <= 0) {
      const parentDef = PASSIVE_BY_ID[parentId];
      return {
        valid: false,
        reason: `Cần nâng nội tại tiền đề "${parentDef?.nameVi || parentId}" tối thiểu 1 hạng trước.`,
      };
    }
  }

  // Mutually exclusive build choice guard
  if (passive.mutuallyExclusiveGroup) {
    for (const [otherId, otherRank] of Object.entries(allocs)) {
      if (otherId === passiveId || Number(otherRank || 0) <= 0) continue;
      const otherDef = PASSIVE_BY_ID[otherId];
      if (otherDef?.mutuallyExclusiveGroup === passive.mutuallyExclusiveGroup) {
        return {
          valid: false,
          reason: `Lựa chọn độc quyền: "${passive.nameVi}" xung khắc với "${otherDef.nameVi}"! Hãy Tẩy Điểm nếu muốn đổi hướng build.`,
        };
      }
    }
  }

  // Skill Mastery connection requirement
  const totalMastery = computeEarnedPassivePoints(char).totalCumulativeMastery;
  if (passive.requiredMasteryPoints && passive.requiredMasteryPoints > 0) {
    const synergyPts = passive.synergySkillId
      ? Number(char.skillMastery?.[passive.synergySkillId]?.points || 0)
      : 0;
    const effectiveMastery = Math.max(synergyPts, totalMastery);
    if (effectiveMastery < passive.requiredMasteryPoints) {
      return {
        valid: false,
        reason: `Cần ${passive.requiredMasteryPoints} điểm Thông Thạo Kỹ Năng để mở khóa "${passive.nameVi}" (hiện có ${effectiveMastery}).`,
      };
    }
  }

  const earnedInfo = computeEarnedPassivePoints(char);
  const spent = computePassivePointsSpent(allocs);
  const available = Math.max(0, earnedInfo.earned - spent);
  const cost = requestedDeltaRank * passive.pointCostPerRank;
  if (available < cost) {
    return {
      valid: false,
      reason: `Không đủ Điểm Nội Tại! Cần ${cost}, hiện có ${available}.`,
    };
  }

  return { valid: true, passive, cost, nextRank };
}

export function buildRespecLedgerEntry(
  characterId: string,
  previousAllocations: Record<string, number>,
  earnedBefore: number,
  options: { costGold?: number; itemConsumedId?: string }
): PassivePointTransaction {
  const spentBefore = computePassivePointsSpent(previousAllocations);
  return {
    txId: `PTX_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    characterId,
    timestamp: new Date().toISOString(),
    action: 'respec',
    pointsDelta: spentBefore,
    totalAllocatedAfter: 0,
    remainingPointsAfter: earnedBefore,
    costGold: options.costGold,
    itemConsumedId: options.itemConsumedId,
    reason: options.itemConsumedId
      ? `Respec passive tree using item ${options.itemConsumedId} (Lv.80 branch preserved)`
      : `Respec passive tree for ${options.costGold || 0} Gold (Lv.80 branch preserved)`,
  };
}
