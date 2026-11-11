import {
  AdvancedJobDefinition,
  AdvancedJobId,
  ClassId,
  ElementType,
  FirstJobClassId,
  ResolvedSkillEvolutionState,
  SkillDefinition,
  SkillEvolutionMilestone,
  SkillExecutionType,
  SkillMasteryConfig,
  SkillMasteryProgress,
  SkillMasteryRankId,
} from '@elysia/game-types';
import { resolveClassVfxProfile } from '@elysia/vfx-engine';

export function normalizeBaseClassId(classId?: string | null): ClassId {
  const lower = String(classId || 'adventurer').trim().toLowerCase();
  if (lower === 'priest') return 'monk';
  if (lower === 'novice') return 'adventurer';
  return lower as ClassId;
}

export const MASTERY_RANK_THRESHOLDS: Array<{
  rank: SkillMasteryRankId;
  label: string;
  labelVi: string;
  minPoints: number;
  maxPoints: number;
  color: string;
  damageBonusPct: number;
}> = [
  { rank: 'novice', label: 'Novice', labelVi: 'Sơ Nhập', minPoints: 0, maxPoints: 19, color: '#94a3b8', damageBonusPct: 0 },
  { rank: 'apprentice', label: 'Apprentice', labelVi: 'Học Đồ', minPoints: 20, maxPoints: 39, color: '#22c55e', damageBonusPct: 6 },
  { rank: 'adept', label: 'Adept', labelVi: 'Thành Thạo', minPoints: 40, maxPoints: 59, color: '#38bdf8', damageBonusPct: 12 },
  { rank: 'expert', label: 'Expert', labelVi: 'Tinh Thông', minPoints: 60, maxPoints: 79, color: '#a855f7', damageBonusPct: 20 },
  { rank: 'master', label: 'Master', labelVi: 'Đại Sư', minPoints: 80, maxPoints: 99, color: '#f59e0b', damageBonusPct: 28 },
  { rank: 'grandmaster', label: 'Grandmaster', labelVi: 'Tông Sư', minPoints: 100, maxPoints: 100, color: '#f43f5e', damageBonusPct: 38 },
];

export function getMasteryRankFromPoints(points: number): SkillMasteryRankId {
  const clamped = Math.max(0, Math.min(100, Math.floor(points || 0)));
  for (let i = MASTERY_RANK_THRESHOLDS.length - 1; i >= 0; i--) {
    if (clamped >= MASTERY_RANK_THRESHOLDS[i].minPoints) {
      return MASTERY_RANK_THRESHOLDS[i].rank;
    }
  }
  return 'novice';
}

export const DEFAULT_SKILL_MASTERY_CONFIG: SkillMasteryConfig = {
  enabled: true,
  maxPoints: 100,
  gainPerValidCast: 2,
  cooldownWindowMs: 650,
  bonusDamagePerPointPct: 0.35,
  critBonusAtGrandmasterPct: 8,
  cooldownReductionAtMasterPct: 10,
};

function makeBranch(input: {
  id: AdvancedJobId;
  incompatibleBranchId: AdvancedJobId;
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
  weaponCompatibility: string[];
  armorProficiency: string[];
  statBonuses: AdvancedJobDefinition['statBonuses'];
  growthPerLevel: AdvancedJobDefinition['growthPerLevel'];
  combatModifiers: AdvancedJobDefinition['combatModifiers'];
  exclusiveSkillIds: string[];
  preferredElement: ElementType;
}): AdvancedJobDefinition {
  const vfx = resolveClassVfxProfile(input.id);
  return {
    ...input,
    unlockLevel: 80,
    tier: 3,
    isPermanent: true,
    vfxProfile: vfx as any,
    animationProfileId: `anim_${input.id}`,
    iconUrl: `/assets/elysia/ui/jobs/${input.id}_icon.png`,
    portraitUrl: `/assets/elysia/portraits/jobs/${input.id}.png`,
  };
}

export const ADVANCED_JOB_DEFINITIONS: AdvancedJobDefinition[] = [
  // 1. SWORDSMAN -> Sword Saint / Berserker
  makeBranch({
    id: 'sword_saint',
    incompatibleBranchId: 'berserker',
    parentClassId: 'swordsman',
    parentDisplayName: 'Swordsman',
    parentDisplayNameVi: 'Kiếm Sĩ',
    name: 'Sword Saint',
    nameVi: 'Kiếm Thánh (Sword Saint)',
    title: 'Master of Celestial Iaido',
    titleVi: 'Thánh Kiếm Bất Diệt',
    role: 'Precision Burst DPS',
    archetype: 'multi_hit_crit_blade',
    description: 'Supreme blade master delivering blinding white-gold crescent combos and fatal critical strikes against bosses.',
    descriptionVi: 'Đỉnh cao kiếm đạo, tung hàng loạt kiếm khí bạch kim với tỷ lệ chí mạng cực đại vào Boss.',
    weaponCompatibility: ['sword', 'greatsword', 'katana'],
    armorProficiency: ['light', 'medium', 'plate'],
    statBonuses: { str: 36, agi: 28, dex: 28, con: 14, int: 6 },
    growthPerLevel: { str: 2.3, agi: 1.7, dex: 1.7 },
    combatModifiers: {
      pveDamageBonusPct: 12,
      pvpDamageModifierPct: 95,
      bossDamageBonusPct: 18,
      critRateBonusPct: 12,
      critDamageBonusPct: 28,
      cooldownReductionPct: 8,
    },
    exclusiveSkillIds: ['skill_ss_celestial_stance', 'skill_ss_iaido_flash', 'skill_ss_astral_cross', 'skill_ss_thousand_sword_halo'],
    preferredElement: 'holy',
  }),
  makeBranch({
    id: 'berserker',
    incompatibleBranchId: 'sword_saint',
    parentClassId: 'swordsman',
    parentDisplayName: 'Swordsman',
    parentDisplayNameVi: 'Kiếm Sĩ',
    name: 'Berserker',
    nameVi: 'Cuồng Chiến Sĩ (Berserker)',
    title: 'Avatar of Crimson Fury',
    titleVi: 'Huyết Nộ Cuồng Đao',
    role: 'Juggernaut Cleave DPS',
    archetype: 'blood_cleave_juggernaut',
    description: 'Channels relentless blood flame into sweeping wide cleaves that shred packs and drain vitality on hit.',
    descriptionVi: 'Thiêu đốt huyết khí để phóng ra nhát chém hủy diệt diện rộng kèm hút máu và gây chảy máu nặng.',
    weaponCompatibility: ['greatsword', 'sword', 'axe'],
    armorProficiency: ['medium', 'plate'],
    statBonuses: { str: 44, con: 30, agi: 14, dex: 16, int: 4 },
    growthPerLevel: { str: 2.9, con: 2.0, agi: 0.8 },
    combatModifiers: {
      pveDamageBonusPct: 16,
      pvpDamageModifierPct: 92,
      bossDamageBonusPct: 12,
      critRateBonusPct: 6,
      critDamageBonusPct: 22,
      damageReductionPct: 5,
    },
    exclusiveSkillIds: ['skill_bk_blood_frenzy', 'skill_bk_crimson_guillotine', 'skill_bk_earthshaker_cleave', 'skill_bk_ragnarok_bloodstorm'],
    preferredElement: 'fire',
  }),

  // 2. SPEARMAN -> Dragoon / Warlancer
  makeBranch({
    id: 'dragoon',
    incompatibleBranchId: 'warlancer',
    parentClassId: 'spearman',
    parentDisplayName: 'Spearman',
    parentDisplayNameVi: 'Thương Sĩ',
    name: 'Dragoon',
    nameVi: 'Long Kỵ Sĩ (Dragoon)',
    title: 'Tempest Skybreaker',
    titleVi: 'Lôi Long Phá Thiên',
    role: 'Dive & Armor-Pierce DPS',
    archetype: 'lightning_dive_piercer',
    description: 'Channels draconic lightning into meteoric aerial dives and supersonic piercing thrusts.',
    descriptionVi: 'Triệu hồi sức mạnh Long Lôi, phi thân giáng thương từ không trung xuyên thủng giáp Boss.',
    weaponCompatibility: ['spear', 'lance', 'halberd'],
    armorProficiency: ['medium', 'plate'],
    statBonuses: { str: 34, agi: 28, dex: 26, con: 16, int: 8 },
    growthPerLevel: { str: 2.2, agi: 1.7, dex: 1.6 },
    combatModifiers: {
      pveDamageBonusPct: 14,
      pvpDamageModifierPct: 94,
      bossDamageBonusPct: 18,
      critRateBonusPct: 10,
      critDamageBonusPct: 24,
    },
    exclusiveSkillIds: ['skill_dg_dragon_heart', 'skill_dg_skyfang_dive', 'skill_dg_lightning_skewer', 'skill_dg_tempest_descent'],
    preferredElement: 'lightning',
  }),
  makeBranch({
    id: 'warlancer',
    incompatibleBranchId: 'dragoon',
    parentClassId: 'spearman',
    parentDisplayName: 'Spearman',
    parentDisplayNameVi: 'Thương Sĩ',
    name: 'Warlancer',
    nameVi: 'Chiến Thương Sư (Warlancer)',
    title: 'Imperial Phalanx Commander',
    titleVi: 'Thiết Bích Chiến Thương',
    role: 'Frontline Bruiser & Crowd Control',
    archetype: 'phalanx_halberd_bruiser',
    description: 'Commands sweeping halberd formations and impaling shockwaves that control entire battlefields.',
    descriptionVi: 'Làm chủ trận địa bằng các đòn quét kích diện rộng, đẩy lùi và khống chế đám đông.',
    weaponCompatibility: ['halberd', 'spear', 'lance'],
    armorProficiency: ['plate', 'medium'],
    statBonuses: { str: 32, con: 32, dex: 22, agi: 14, int: 6 },
    growthPerLevel: { str: 2.0, con: 2.1, dex: 1.4 },
    combatModifiers: {
      pveDamageBonusPct: 14,
      pvpDamageModifierPct: 96,
      bossDamageBonusPct: 10,
      critRateBonusPct: 6,
      critDamageBonusPct: 15,
      damageReductionPct: 10,
    },
    exclusiveSkillIds: ['skill_wl_iron_phalanx', 'skill_wl_crimson_sweep', 'skill_wl_earth_impale', 'skill_wl_grand_legion_halberd'],
    preferredElement: 'earth',
  }),

  // 3. KNIGHT -> Paladin / Guardian
  makeBranch({
    id: 'paladin',
    incompatibleBranchId: 'guardian',
    parentClassId: 'knight',
    parentDisplayName: 'Knight',
    parentDisplayNameVi: 'Kỵ Sĩ',
    name: 'Paladin',
    nameVi: 'Thánh Kỵ Sĩ (Paladin)',
    title: 'Solar Vowbearer',
    titleVi: 'Thánh Quang Hộ Thệ',
    role: 'Holy Vanguard & Off-Healer',
    archetype: 'holy_aegis_vanguard',
    description: 'Wields radiant sunlight barriers and sacred judgement verdicts that protect and mend nearby allies.',
    descriptionVi: 'Kết hợp khiên thánh quang và pháp thuật hồi phục, vừa bảo hộ đồng đội vừa trừng phạt tà ác.',
    weaponCompatibility: ['sword', 'shield', 'mace'],
    armorProficiency: ['plate'],
    statBonuses: { con: 34, str: 26, int: 26, dex: 14, agi: 10 },
    growthPerLevel: { con: 2.1, str: 1.6, int: 1.6 },
    combatModifiers: {
      pveDamageBonusPct: 10,
      pvpDamageModifierPct: 95,
      bossDamageBonusPct: 14,
      critRateBonusPct: 5,
      critDamageBonusPct: 12,
      healingPowerBonusPct: 18,
      damageReductionPct: 14,
    },
    exclusiveSkillIds: ['skill_pl_sacred_vow', 'skill_pl_solstice_smite', 'skill_pl_sanctuary_aegis', 'skill_pl_sovereign_dawn'],
    preferredElement: 'holy',
  }),
  makeBranch({
    id: 'guardian',
    incompatibleBranchId: 'paladin',
    parentClassId: 'knight',
    parentDisplayName: 'Knight',
    parentDisplayNameVi: 'Kỵ Sĩ',
    name: 'Guardian',
    nameVi: 'Hộ Vệ Hoàng Gia (Guardian)',
    title: 'Unbreakable Bastion',
    titleVi: 'Bất Động Pháo Đài',
    role: 'Pure Main Tank',
    archetype: 'immutable_fortress_tank',
    description: 'Summons emerald crystal bastions and octagonal deflection domes capable of absorbing catastrophic boss ultimates.',
    descriptionVi: 'Phòng tuyến kiên cố tối thượng với kết giới lục bảo giảm sát thương và phản đòn mạnh mẽ.',
    weaponCompatibility: ['shield', 'sword', 'mace'],
    armorProficiency: ['plate'],
    statBonuses: { con: 48, str: 24, dex: 16, agi: 8, int: 10 },
    growthPerLevel: { con: 3.1, str: 1.4 },
    combatModifiers: {
      pveDamageBonusPct: 6,
      pvpDamageModifierPct: 90,
      bossDamageBonusPct: 10,
      critRateBonusPct: 3,
      critDamageBonusPct: 8,
      damageReductionPct: 24,
    },
    exclusiveSkillIds: ['skill_gd_adamant_core', 'skill_gd_bastion_bash', 'skill_gd_aegis_fortress', 'skill_gd_immutable_dome'],
    preferredElement: 'earth',
  }),

  // 4. MONK / PRIEST -> Saint / Exorcist
  makeBranch({
    id: 'saint',
    incompatibleBranchId: 'exorcist',
    parentClassId: 'monk',
    parentDisplayName: 'Priest',
    parentDisplayNameVi: 'Tu Sĩ / Giáo Sĩ',
    name: 'Saint',
    nameVi: 'Thánh Sư (Saint)',
    title: 'Voice of Seraphic Grace',
    titleVi: 'Thánh Ân Cứu Thế',
    role: 'Apex Party Healer & Buffer',
    archetype: 'seraphic_sanctuary_healer',
    description: 'Conjures seraphic wing mandalas and golden sanctuary fields that cleanse ailments and rapidly restore allies.',
    descriptionVi: 'Triệu hồi trận đồ Thiên Sứ ban phát trị liệu liên hoàn, giải trừ hiệu ứng xấu và hồi sinh đồng minh.',
    weaponCompatibility: ['holy_staff', 'staff', 'book'],
    armorProficiency: ['cloth', 'light'],
    statBonuses: { int: 44, con: 24, dex: 20, agi: 14, str: 4 },
    growthPerLevel: { int: 2.8, con: 1.5, dex: 1.2 },
    combatModifiers: {
      pveDamageBonusPct: 8,
      pvpDamageModifierPct: 92,
      bossDamageBonusPct: 8,
      critRateBonusPct: 6,
      critDamageBonusPct: 12,
      healingPowerBonusPct: 32,
      cooldownReductionPct: 12,
    },
    exclusiveSkillIds: ['skill_st_seraph_grace', 'skill_st_radiant_hymn', 'skill_st_sanctuary_field', 'skill_st_celestial_benediction'],
    preferredElement: 'holy',
  }),
  makeBranch({
    id: 'exorcist',
    incompatibleBranchId: 'saint',
    parentClassId: 'monk',
    parentDisplayName: 'Priest',
    parentDisplayNameVi: 'Tu Sĩ / Giáo Sĩ',
    name: 'Exorcist',
    nameVi: 'Trừ Tà Sư (Exorcist)',
    title: 'Inquisitor of Sacred Seals',
    titleVi: 'Thánh Ấn Phán Quyết',
    role: 'Holy Magic Striker',
    archetype: 'purifying_seal_striker',
    description: 'Inscribes rotating purification talismans that call down holy lightning pillars upon bosses and dark foes.',
    descriptionVi: 'Khắc ấn trừ tà xoay chuyển, giáng cột sét thánh quang trừng phạt Boss và ma vật.',
    weaponCompatibility: ['holy_staff', 'staff', 'spellbook'],
    armorProficiency: ['cloth', 'light'],
    statBonuses: { int: 40, dex: 26, con: 18, agi: 16, str: 6 },
    growthPerLevel: { int: 2.6, dex: 1.6, agi: 1.0 },
    combatModifiers: {
      pveDamageBonusPct: 15,
      pvpDamageModifierPct: 95,
      bossDamageBonusPct: 20,
      critRateBonusPct: 11,
      critDamageBonusPct: 24,
      healingPowerBonusPct: 10,
    },
    exclusiveSkillIds: ['skill_ex_sacred_seal', 'skill_ex_judgement_talisman', 'skill_ex_purifying_pillar', 'skill_ex_grand_purification'],
    preferredElement: 'lightning',
  }),

  // 5. MAGE -> Elementalist / Arcanist
  makeBranch({
    id: 'elementalist',
    incompatibleBranchId: 'arcanist',
    parentClassId: 'mage',
    parentDisplayName: 'Mage',
    parentDisplayNameVi: 'Pháp Sư',
    name: 'Elementalist',
    nameVi: 'Nguyên Tố Sư (Elementalist)',
    title: 'Sovereign of Fire, Frost & Storm',
    titleVi: 'Chúa Tể Tam Nguyên Tố',
    role: 'Elemental AoE Nuker',
    archetype: 'tri_element_cataclysm',
    description: 'Fuses fire, ice, and lightning into cascading elemental triads and catastrophic blizzard-meteor storms.',
    descriptionVi: 'Dung hợp Hỏa - Băng - Lôi, kích hoạt chuỗi bão nguyên tố hủy diệt hàng loạt mục tiêu.',
    weaponCompatibility: ['staff', 'spellbook'],
    armorProficiency: ['cloth'],
    statBonuses: { int: 48, dex: 24, agi: 16, con: 12, str: 2 },
    growthPerLevel: { int: 3.1, dex: 1.4 },
    combatModifiers: {
      pveDamageBonusPct: 20,
      pvpDamageModifierPct: 90,
      bossDamageBonusPct: 14,
      critRateBonusPct: 9,
      critDamageBonusPct: 22,
    },
    exclusiveSkillIds: ['skill_el_elemental_harmony', 'skill_el_tri_convergence', 'skill_el_frostfire_vortex', 'skill_el_prismatic_cataclysm'],
    preferredElement: 'fire',
  }),
  makeBranch({
    id: 'arcanist',
    incompatibleBranchId: 'elementalist',
    parentClassId: 'mage',
    parentDisplayName: 'Mage',
    parentDisplayNameVi: 'Pháp Sư',
    name: 'Arcanist',
    nameVi: 'Bí Ẩn Sư (Arcanist)',
    title: 'Weaver of Celestial Cosmos',
    titleVi: 'Tinh Tú Bí Thuật Sư',
    role: 'Arcane Burst & Cooldown Caster',
    archetype: 'cosmic_astrolabe_mage',
    description: 'Manipulates celestial astrolabe runes and gravitational singularities for rapid-fire boss devastation.',
    descriptionVi: 'Điều khiển tinh bàn vũ trụ và hố đen bí thuật, giảm hồi chiêu và dồn sát thương đơn mục tiêu cực hạn.',
    weaponCompatibility: ['spellbook', 'staff'],
    armorProficiency: ['cloth'],
    statBonuses: { int: 44, dex: 28, agi: 20, con: 10, str: 2 },
    growthPerLevel: { int: 2.8, dex: 1.6, agi: 1.2 },
    combatModifiers: {
      pveDamageBonusPct: 14,
      pvpDamageModifierPct: 95,
      bossDamageBonusPct: 20,
      critRateBonusPct: 11,
      critDamageBonusPct: 25,
      cooldownReductionPct: 14,
    },
    exclusiveSkillIds: ['skill_ar_astral_flow', 'skill_ar_gravity_singularity', 'skill_ar_rune_overload', 'skill_ar_celestial_starfall'],
    preferredElement: 'arcane',
  }),

  // 6. ASSASSIN -> Shadowblade / Phantom
  makeBranch({
    id: 'shadowblade',
    incompatibleBranchId: 'phantom',
    parentClassId: 'assassin',
    parentDisplayName: 'Assassin',
    parentDisplayNameVi: 'Sát Thủ',
    name: 'Shadowblade',
    nameVi: 'Ảnh Nhận (Shadowblade)',
    title: 'Executioner of Nightfall',
    titleVi: 'Ám Ảnh Hành Quyết',
    role: 'Crit & Execute Assassin',
    archetype: 'nightfall_execute_assassin',
    description: 'Blinks through shadows with crimson moon streaks, guaranteeing devastating execute crits against weakened targets.',
    descriptionVi: 'Ẩn thân trong bóng tối tung liên trảm chí mạng và kết liễu mục tiêu thấp máu tức thì.',
    weaponCompatibility: ['dual_daggers', 'dagger'],
    armorProficiency: ['light'],
    statBonuses: { agi: 40, dex: 34, str: 20, con: 10, int: 4 },
    growthPerLevel: { agi: 2.5, dex: 2.0, str: 1.0 },
    combatModifiers: {
      pveDamageBonusPct: 12,
      pvpDamageModifierPct: 96,
      bossDamageBonusPct: 18,
      critRateBonusPct: 16,
      critDamageBonusPct: 35,
    },
    exclusiveSkillIds: ['skill_sb_lethal_tempo', 'skill_sb_nightfall_eviscerate', 'skill_sb_crimson_ambush', 'skill_sb_eclipse_assassination'],
    preferredElement: 'shadow',
  }),
  makeBranch({
    id: 'phantom',
    incompatibleBranchId: 'shadowblade',
    parentClassId: 'assassin',
    parentDisplayName: 'Assassin',
    parentDisplayNameVi: 'Sát Thủ',
    name: 'Phantom',
    nameVi: 'Ảo Ảnh Sát Thủ (Phantom)',
    title: 'Dancer of Spectral Mirrors',
    titleVi: 'Huyễn Ảnh Ma Đao',
    role: 'Illusion & AoE Evasion DPS',
    archetype: 'mirage_clone_dancer',
    description: 'Summons spectral teal afterimage clones that echo every slash across multiple foes while evading counterattacks.',
    descriptionVi: 'Tạo phân thân huyễn ảnh đồng loạt tung phi đao diện rộng, né tránh đòn đánh cực cao.',
    weaponCompatibility: ['dual_daggers', 'dagger'],
    armorProficiency: ['light'],
    statBonuses: { agi: 42, dex: 28, str: 18, int: 14, con: 12 },
    growthPerLevel: { agi: 2.6, dex: 1.7, int: 0.9 },
    combatModifiers: {
      pveDamageBonusPct: 16,
      pvpDamageModifierPct: 94,
      bossDamageBonusPct: 12,
      critRateBonusPct: 11,
      critDamageBonusPct: 22,
      damageReductionPct: 10,
      cooldownReductionPct: 8,
    },
    exclusiveSkillIds: ['skill_ph_mirage_veil', 'skill_ph_spectral_blades', 'skill_ph_mirror_step', 'skill_ph_spectral_waltz'],
    preferredElement: 'shadow',
  }),

  // 7. FIGHTER -> Martial Artist / Duelist
  makeBranch({
    id: 'martial_artist',
    incompatibleBranchId: 'duelist',
    parentClassId: 'fighter',
    parentDisplayName: 'Fighter',
    parentDisplayNameVi: 'Võ Sĩ',
    name: 'Martial Artist',
    nameVi: 'Võ Thánh (Martial Artist)',
    title: 'Grandmaster of Blazing Chi',
    titleVi: 'Bá Quyền Khí Công',
    role: 'Heavy Impact & Stun Brawler',
    archetype: 'blazing_chi_breaker',
    description: 'Focuses blazing golden lotus chi into earth-shattering palms that crush boss armor and trigger sonic shockwaves.',
    descriptionVi: 'Hội tụ chân khí Kim Liên vào từng quyền cước, phá giáp Boss và gây choáng diện rộng.',
    weaponCompatibility: ['gauntlets', 'fist'],
    armorProficiency: ['light', 'medium'],
    statBonuses: { str: 40, con: 26, agi: 22, dex: 20, int: 8 },
    growthPerLevel: { str: 2.6, con: 1.6, agi: 1.2 },
    combatModifiers: {
      pveDamageBonusPct: 15,
      pvpDamageModifierPct: 94,
      bossDamageBonusPct: 18,
      critRateBonusPct: 9,
      critDamageBonusPct: 24,
      damageReductionPct: 8,
    },
    exclusiveSkillIds: ['skill_ma_lotus_chi', 'skill_ma_crimson_tiger_fang', 'skill_ma_sonic_palm', 'skill_ma_asura_hundred_palms'],
    preferredElement: 'fire',
  }),
  makeBranch({
    id: 'duelist',
    incompatibleBranchId: 'martial_artist',
    parentClassId: 'fighter',
    parentDisplayName: 'Fighter',
    parentDisplayNameVi: 'Võ Sĩ',
    name: 'Duelist',
    nameVi: 'Quyết Đấu Sư (Duelist)',
    title: 'Virtuoso of Wind Tempo',
    titleVi: 'Liên Hoàn Kiếm Quyền',
    role: 'Combo Chain & Counter Striker',
    archetype: 'tempo_counter_striker',
    description: 'Flows through blindingly rapid combo strikes and parry ripostes that escalate damage with every consecutive hit.',
    descriptionVi: 'Chuỗi liên kích siêu tốc kết hợp phản kích sắc bén, cộng dồn tốc đánh và bạo kích.',
    weaponCompatibility: ['gauntlets', 'fist', 'sword'],
    armorProficiency: ['light', 'medium'],
    statBonuses: { agi: 36, str: 28, dex: 32, con: 14, int: 6 },
    growthPerLevel: { agi: 2.3, dex: 1.9, str: 1.5 },
    combatModifiers: {
      pveDamageBonusPct: 14,
      pvpDamageModifierPct: 98,
      bossDamageBonusPct: 15,
      critRateBonusPct: 14,
      critDamageBonusPct: 26,
      cooldownReductionPct: 12,
    },
    exclusiveSkillIds: ['skill_dl_tempo_flow', 'skill_dl_velocity_riposte', 'skill_dl_gale_combo', 'skill_dl_crimson_finale_dance'],
    preferredElement: 'wind',
  }),

  // 8. ARCHER -> Sniper / Ranger
  makeBranch({
    id: 'sniper',
    incompatibleBranchId: 'ranger',
    parentClassId: 'archer',
    parentDisplayName: 'Archer',
    parentDisplayNameVi: 'Cung Thủ',
    name: 'Sniper',
    nameVi: 'Xạ Thủ Thần Tiễn (Sniper)',
    title: 'Long-Range Starlight Marksman',
    titleVi: 'Thần Tiễn Bách Bộ Xuyên Dương',
    role: 'Extreme-Range Single/Boss Marksman',
    archetype: 'precision_rail_marksman',
    description: 'Locks azure targeting reticles onto distant prey before unleashing supersonic starlight railshots that pierce all defenses.',
    descriptionVi: 'Khóa mục tiêu từ tầm cực xa và khai hỏa mũi tên xuyên phá mọi lớp phòng ngự của Boss.',
    weaponCompatibility: ['bow', 'crossbow'],
    armorProficiency: ['light'],
    statBonuses: { dex: 48, agi: 28, str: 16, con: 10, int: 8 },
    growthPerLevel: { dex: 3.1, agi: 1.7, str: 0.9 },
    combatModifiers: {
      pveDamageBonusPct: 14,
      pvpDamageModifierPct: 94,
      bossDamageBonusPct: 22,
      critRateBonusPct: 16,
      critDamageBonusPct: 30,
    },
    exclusiveSkillIds: ['skill_sn_eagle_lock', 'skill_sn_starlight_railshot', 'skill_sn_armor_shatter', 'skill_sn_orbital_barrage'],
    preferredElement: 'lightning',
  }),
  makeBranch({
    id: 'ranger',
    incompatibleBranchId: 'sniper',
    parentClassId: 'archer',
    parentDisplayName: 'Archer',
    parentDisplayNameVi: 'Cung Thủ',
    name: 'Ranger',
    nameVi: 'Du Hiệp Rừng Thẳm (Ranger)',
    title: 'Warden of Sylvan Tempest',
    titleVi: 'Thủ Hộ Rừng Xanh',
    role: 'Mobile AoE & Trap Specialist',
    archetype: 'sylvan_wind_trapper',
    description: 'Weaves emerald wind arrows, rooting vine traps, and sweeping arrow canopies for unrivaled map clearing.',
    descriptionVi: 'Bắn mưa tên bão lá, gài bẫy dây leo trói chân quái và cơ động càn quét bản đồ cực nhanh.',
    weaponCompatibility: ['bow', 'crossbow'],
    armorProficiency: ['light', 'medium'],
    statBonuses: { agi: 38, dex: 38, con: 16, int: 10, str: 12 },
    growthPerLevel: { agi: 2.4, dex: 2.4, con: 0.9 },
    combatModifiers: {
      pveDamageBonusPct: 18,
      pvpDamageModifierPct: 94,
      bossDamageBonusPct: 12,
      critRateBonusPct: 10,
      critDamageBonusPct: 20,
      cooldownReductionPct: 8,
    },
    exclusiveSkillIds: ['skill_rg_sylvan_stride', 'skill_rg_leaf_tempest', 'skill_rg_briar_snare', 'skill_rg_emerald_canopy_rain'],
    preferredElement: 'nature',
  }),
];

export const ADVANCED_JOB_BY_ID: Record<string, AdvancedJobDefinition> = Object.fromEntries(
  ADVANCED_JOB_DEFINITIONS.map((j) => [j.id, j])
);

export function getAdvancedBranchesForClass(classId?: string | null): AdvancedJobDefinition[] {
  const norm = normalizeBaseClassId(classId);
  return ADVANCED_JOB_DEFINITIONS.filter((j) => j.parentClassId === norm);
}

// ==========================================
// IDENTITY-SPECIFIC SKILL EVOLUTION MILESTONES
// ==========================================

const CURATED_MILESTONES_BY_SKILL_ID: Record<string, SkillEvolutionMilestone[]> = {
  SKILL_NOVICE_FIREBALL: [
    {
      requiredSkillLevel: 1,
      title: 'Single Ember Orb',
      titleVi: 'Hỏa Cầu Đơn',
      description: 'Launches a focused fireball orb at one target.',
      descriptionVi: 'Phóng một quả cầu lửa cơ bản.',
      vfxTier: 0,
      vfxTag: 'base_orb',
    },
    {
      requiredSkillLevel: 3,
      requiredMasteryPoints: 20,
      title: 'Detonation Surge',
      titleVi: 'Cường Hóa Bùng Nổ',
      description: '+18% explosion damage and scorches target.',
      descriptionVi: '+18% sát thương nổ và thiêu đốt nhẹ.',
      bonusDamagePct: 18,
      vfxTier: 1,
      vfxTag: 'ember_burst',
    },
    {
      requiredSkillLevel: 5,
      requiredMasteryPoints: 40,
      title: 'Expanded Blast Wave',
      titleVi: 'Mở Rộng Vùng Nổ',
      description: '+35% AoE blast radius and splashes nearby monsters.',
      descriptionVi: '+35% bán kính nổ và lan sát thương sang quái kế cận.',
      bonusAreaRadiusPct: 35,
      bonusDamagePct: 12,
      vfxTier: 2,
      vfxTag: 'expanded_aoe',
    },
    {
      requiredSkillLevel: 7,
      requiredMasteryPoints: 60,
      title: 'Solar Shrapnel Fragments',
      titleVi: 'Mảnh Vỡ Hỏa Tinh',
      description: 'Impact scatters 3 fiery shrapnel shards (+12% Crit Chance).',
      descriptionVi: 'Khi nổ bắn ra 3 mảnh lửa phụ và +12% Chí mạng.',
      bonusCritChancePct: 12,
      bonusProjectiles: 1,
      vfxTier: 3,
      vfxTag: 'shrapnel_fragments',
    },
    {
      requiredSkillLevel: 10,
      requiredMasteryPoints: 80,
      title: 'Meteoric Fireball Apex',
      titleVi: 'Thiên Hỏa Cực Đạo',
      description: '+32% skill power, wider ground magma circle & dual orb blast.',
      descriptionVi: '+32% uy lực, trận đồ dung nham rực rỡ và nổ kép.',
      bonusDamagePct: 32,
      bonusAreaRadiusPct: 25,
      vfxTier: 5,
      vfxTag: 'evolved_blast',
    },
  ],
  skill_fireball: [
    {
      requiredSkillLevel: 1,
      title: 'Arcane Flame Sphere',
      titleVi: 'Hỏa Cầu Sơ Khởi',
      description: 'Single blazing orb.',
      descriptionVi: 'Quả cầu lửa đơn.',
      vfxTier: 0,
      vfxTag: 'base_orb',
    },
    {
      requiredSkillLevel: 3,
      requiredMasteryPoints: 20,
      title: 'Intensified Ignition',
      titleVi: 'Nhiệt Lượng Gia Tăng',
      description: '+20% explosion power.',
      descriptionVi: '+20% sát thương bùng nổ.',
      bonusDamagePct: 20,
      vfxTier: 1,
      vfxTag: 'ember_burst',
    },
    {
      requiredSkillLevel: 5,
      requiredMasteryPoints: 40,
      title: 'Conflagration Radius',
      titleVi: 'Hỏa Ngục Lan Rộng',
      description: '+40% explosion radius.',
      descriptionVi: '+40% bán kính nổ.',
      bonusAreaRadiusPct: 40,
      vfxTier: 2,
      vfxTag: 'expanded_aoe',
    },
    {
      requiredSkillLevel: 7,
      requiredMasteryPoints: 60,
      title: 'Molten Shrapnel',
      titleVi: 'Mảnh Nổ Dung Nham',
      description: 'Splits into molten fragments (+10% Crit, +1 extra projectile).',
      descriptionVi: 'Tách mảnh nổ phụ, +10% chí mạng.',
      bonusCritChancePct: 10,
      bonusProjectiles: 1,
      vfxTier: 3,
      vfxTag: 'shrapnel_fragments',
    },
    {
      requiredSkillLevel: 10,
      requiredMasteryPoints: 80,
      title: 'Phoenix Core Nova',
      titleVi: 'Hạch Phượng Hoàng',
      description: 'Massive +35% damage, -15% CD, unique phoenix flare.',
      descriptionVi: '+35% sát thương, -15% hồi chiêu và hiệu ứng Phượng Hoàng.',
      bonusDamagePct: 35,
      cooldownReductionPct: 15,
      vfxTier: 5,
      vfxTag: 'evolved_blast',
    },
  ],
  skill_holy_light: [
    {
      requiredSkillLevel: 1,
      title: 'Single Light Mend',
      titleVi: 'Ánh Sáng Trị Thương Đơn',
      description: 'Heals target HP with warm holy light.',
      descriptionVi: 'Hồi phục HP cho một mục tiêu.',
      vfxTier: 0,
      vfxTag: 'holy_mote',
    },
    {
      requiredSkillLevel: 3,
      requiredMasteryPoints: 20,
      title: 'Devout Benediction',
      titleVi: 'Gia Tăng Hồi Phục',
      description: '+20% healing output.',
      descriptionVi: '+20% lượng hồi máu.',
      bonusDamagePct: 20,
      vfxTier: 1,
      vfxTag: 'radiant_bloom',
    },
    {
      requiredSkillLevel: 5,
      requiredMasteryPoints: 40,
      title: 'Purifying Grace',
      titleVi: 'Tịnh Hóa Giải Độc',
      description: 'Cleanses 1 harmful debuff & +10% CDR.',
      descriptionVi: 'Xóa 1 hiệu ứng bất lợi và giảm 10% hồi chiêu.',
      cleanseCount: 1,
      cooldownReductionPct: 10,
      vfxTier: 2,
      vfxTag: 'purify_ring',
    },
    {
      requiredSkillLevel: 7,
      requiredMasteryPoints: 60,
      title: 'Graceful Resonance',
      titleVi: 'Ánh Sáng Lan Tỏa',
      description: 'Splashes 45% secondary heal to nearby party members.',
      descriptionVi: 'Hồi lan 45% HP cho đồng đội xung quanh.',
      secondarySplashPct: 45,
      bonusAreaRadiusPct: 30,
      vfxTier: 3,
      vfxTag: 'splash_heal',
    },
    {
      requiredSkillLevel: 10,
      requiredMasteryPoints: 80,
      title: 'Golden Sanctuary Field',
      titleVi: 'Thánh Vực Hoàng Kim',
      description: 'Deploys a Seraphic Golden Healing Circle (+25% heal, cleanse x2).',
      descriptionVi: 'Triển khai Vòng Tròn Thánh Quang Hoàng Kim (+25% hồi phục, xóa 2 debuff).',
      bonusDamagePct: 25,
      cleanseCount: 1,
      unlocksGroundField: true,
      vfxTier: 5,
      vfxTag: 'golden_field',
    },
  ],
  skill_shadow_strike: [
    {
      requiredSkillLevel: 1,
      title: 'Quick Shadow Cut',
      titleVi: 'Ảnh Trảm Sơ Cấp',
      description: 'Rapid dagger lunge from the dark.',
      descriptionVi: 'Đâm nhanh từ bóng tối.',
      vfxTier: 0,
      vfxTag: 'shadow_cut',
    },
    {
      requiredSkillLevel: 3,
      requiredMasteryPoints: 20,
      title: 'Vital Spot Focus',
      titleVi: 'Nhắm Huyệt Chí Mạng',
      description: '+12% Critical Hit Chance.',
      descriptionVi: '+12% Tỷ lệ chí mạng.',
      bonusCritChancePct: 12,
      vfxTier: 1,
      vfxTag: 'crit_glint',
    },
    {
      requiredSkillLevel: 5,
      requiredMasteryPoints: 40,
      title: 'Phantom Blink Follow-Up',
      titleVi: 'Ảnh Bộ Truy Kích',
      description: 'Adds +1 extra shadow strike hit and shadow afterimage.',
      descriptionVi: 'Thêm +1 nhát chém phụ và dư ảnh bóng tối.',
      bonusHits: 1,
      unlocksFollowUp: true,
      vfxTier: 2,
      vfxTag: 'shadow_afterimage',
    },
    {
      requiredSkillLevel: 7,
      requiredMasteryPoints: 60,
      title: 'Arterial Rupture',
      titleVi: 'Xé Rách Động Mạch',
      description: '+24% damage and inflicts deep bleed.',
      descriptionVi: '+24% sát thương kèm hiệu ứng xuất huyết.',
      bonusDamagePct: 24,
      vfxTier: 3,
      vfxTag: 'crimson_bleed',
    },
    {
      requiredSkillLevel: 10,
      requiredMasteryPoints: 80,
      title: 'Nightfall Execution',
      titleVi: 'Đêm Đen Hành Quyết',
      description: '+1 hit (3 total) and +30% execute damage vs targets <35% HP.',
      descriptionVi: 'Tổng 3 nhát chém, tăng mạnh sát thương kết liễu mục tiêu dưới 35% HP.',
      bonusHits: 1,
      bonusCritChancePct: 10,
      unlocksExecuteThresholdPct: 35,
      vfxTier: 5,
      vfxTag: 'evolved_execute',
    },
  ],
};

export function buildEvolutionMilestonesForSkill(
  skill: Partial<SkillDefinition>
): SkillEvolutionMilestone[] {
  if (skill.id && CURATED_MILESTONES_BY_SKILL_ID[skill.id]) {
    return CURATED_MILESTONES_BY_SKILL_ID[skill.id];
  }
  const exec = skill.executionType || inferExecutionType(skill);
  const isHealOrSupport =
    exec === 'healing' || exec === 'shield' || exec === 'buff' || skill.targetType === 'ally' || skill.targetType === 'self';
  const isProjectile = exec === 'projectile' || skill.targetType === 'directional';
  const isAoe = exec === 'aoe' || skill.targetType === 'aoe' || skill.targetType === 'ground' || exec === 'ultimate';

  if (isHealOrSupport) {
    return [
      { requiredSkillLevel: 1, title: 'Baseline Blessing', titleVi: 'Hiệu Lực Cơ Bản', description: 'Standard support power.', descriptionVi: 'Thi triển hiệu ứng hỗ trợ tiêu chuẩn.', vfxTier: 0 },
      { requiredSkillLevel: 3, requiredMasteryPoints: 20, title: 'Empowered Resonance', titleVi: 'Cộng Hưởng Gia Tăng', description: '+16% heal/shield potency.', descriptionVi: '+16% hiệu quả hồi phục/giáp.', bonusDamagePct: 16, vfxTier: 1 },
      { requiredSkillLevel: 5, requiredMasteryPoints: 40, title: 'Purifying Wave', titleVi: 'Sóng Tịnh Hóa', description: 'Cleanses 1 debuff & +25% aura radius.', descriptionVi: 'Xóa 1 debuff và +25% phạm vi.', cleanseCount: 1, bonusAreaRadiusPct: 25, vfxTier: 2 },
      { requiredSkillLevel: 7, requiredMasteryPoints: 60, title: 'Party Ripple', titleVi: 'Lan Tỏa Đồng Đội', description: '35% secondary splash to allies & -10% cooldown.', descriptionVi: 'Lan 35% sang đồng đội & -10% hồi chiêu.', secondarySplashPct: 35, cooldownReductionPct: 10, vfxTier: 3 },
      { requiredSkillLevel: 10, requiredMasteryPoints: 80, title: 'Sacred Dominion', titleVi: 'Thánh Vực Tối Thượng', description: 'Creates radiant ground field & +24% potency.', descriptionVi: 'Triển khai trận đồ mặt đất & +24% hiệu lực.', bonusDamagePct: 24, unlocksGroundField: true, vfxTier: 5, vfxTag: 'golden_field' },
    ];
  }

  if (isProjectile) {
    return [
      { requiredSkillLevel: 1, title: 'Focused Shot', titleVi: 'Phát Bắn Chuẩn', description: 'Single high-velocity projectile.', descriptionVi: 'Đạn đơn tốc độ cao.', vfxTier: 0 },
      { requiredSkillLevel: 3, requiredMasteryPoints: 20, title: 'High-Caliber Charge', titleVi: 'Nạp Năng Lượng', description: '+18% projectile damage.', descriptionVi: '+18% sát thương đường đạn.', bonusDamagePct: 18, vfxTier: 1 },
      { requiredSkillLevel: 5, requiredMasteryPoints: 40, title: 'Twin Volley', titleVi: 'Song Tiễn / Song Cầu', description: 'Fires +1 extra projectile & +20% splash.', descriptionVi: 'Bắn thêm +1 luồng phụ và +20% vùng nổ.', bonusProjectiles: 1, bonusAreaRadiusPct: 20, vfxTier: 2 },
      { requiredSkillLevel: 7, requiredMasteryPoints: 60, title: 'Splinter Burst', titleVi: 'Mảnh Xuyên Phá', description: 'Releases shrapnel shards (+10% Crit, +18% dmg).', descriptionVi: 'Phát tán mảnh xuyên (+10% chí mạng, +18% dmg).', bonusCritChancePct: 10, bonusDamagePct: 18, vfxTier: 3, vfxTag: 'shrapnel_fragments' },
      { requiredSkillLevel: 10, requiredMasteryPoints: 80, title: 'Celestial Volley', titleVi: 'Liên Xạ Cực Đạo', description: '+1 additional projectile (+3 total) & -15% CD.', descriptionVi: 'Tổng 3 đường đạn/cầu & giảm 15% hồi chiêu.', bonusProjectiles: 1, cooldownReductionPct: 15, vfxTier: 5 },
    ];
  }

  if (isAoe) {
    return [
      { requiredSkillLevel: 1, title: 'Core Eruption', titleVi: 'Bùng Nổ Cơ Bản', description: 'Standard area skill.', descriptionVi: 'Sát thương diện rộng cơ bản.', vfxTier: 0 },
      { requiredSkillLevel: 3, requiredMasteryPoints: 20, title: 'Shockwave Expansion', titleVi: 'Mở Rộng Sóng Xung Kích', description: '+22% area radius & +15% power.', descriptionVi: '+22% bán kính & +15% sát thương.', bonusAreaRadiusPct: 22, bonusDamagePct: 15, vfxTier: 1 },
      { requiredSkillLevel: 5, requiredMasteryPoints: 40, title: 'Resonating Magic Circle', titleVi: 'Ma Trận Cộng Hưởng', description: 'Triggers a second pulse (+1 hit) & rune circle.', descriptionVi: 'Kéo dài ma trận đánh thêm +1 nhịp.', bonusHits: 1, vfxTier: 2 },
      { requiredSkillLevel: 7, requiredMasteryPoints: 60, title: 'Overcharged Core', titleVi: 'Quá Tải Tinh Lõi', description: '+10% Crit Chance & -12% cooldown.', descriptionVi: '+10% chí mạng & -12% hồi chiêu.', bonusCritChancePct: 10, cooldownReductionPct: 12, vfxTier: 3 },
      { requiredSkillLevel: 10, requiredMasteryPoints: 80, title: 'Cataclysmic Mastery', titleVi: 'Đại Thảm Họa Thức Tỉnh', description: '+30% area radius & +28% damage.', descriptionVi: '+30% phạm vi & +28% uy lực tối đa.', bonusAreaRadiusPct: 30, bonusDamagePct: 28, vfxTier: 5 },
    ];
  }

  return [
    { requiredSkillLevel: 1, title: 'Form I: Initial Strike', titleVi: 'Thức I: Khởi Thủ', description: 'Standard technique.', descriptionVi: 'Chiêu thức cơ bản.', vfxTier: 0 },
    { requiredSkillLevel: 3, requiredMasteryPoints: 20, title: 'Form II: Sharp Edge', titleVi: 'Thức II: Sắc Bén', description: '+18% damage & +6% Crit.', descriptionVi: '+18% uy lực & +6% chí mạng.', bonusDamagePct: 18, bonusCritChancePct: 6, vfxTier: 1 },
    { requiredSkillLevel: 5, requiredMasteryPoints: 40, title: 'Form III: Twin Echo', titleVi: 'Thức III: Liên Kích', description: 'Unlocks +1 additional follow-up hit.', descriptionVi: 'Bổ sung thêm +1 nhát đánh liên tiếp.', bonusHits: 1, unlocksFollowUp: true, vfxTier: 2 },
    { requiredSkillLevel: 7, requiredMasteryPoints: 60, title: 'Form IV: Razor Arc', titleVi: 'Thức IV: Kiếm Khí Lan Rộng', description: '+25% cleave arc & +10% Crit.', descriptionVi: '+25% tầm quét & +10% chí mạng.', bonusAreaRadiusPct: 25, bonusCritChancePct: 10, vfxTier: 3 },
    { requiredSkillLevel: 10, requiredMasteryPoints: 80, title: 'Form V: Sovereign Strike', titleVi: 'Thức V: Cực Hạn Đạo', description: '+1 final hit, execute <25% HP & -12% cooldown.', descriptionVi: 'Thêm 1 đòn kết liễu mục tiêu <25% HP & -12% hồi chiêu.', bonusHits: 1, cooldownReductionPct: 12, unlocksExecuteThresholdPct: 25, vfxTier: 5 },
  ];
}

export function inferExecutionType(skill: Partial<SkillDefinition>): SkillExecutionType {
  if (skill.skillType === 'passive' || skill.targetType === 'passive') return 'passive';
  if (skill.skillType === 'ultimate' || skill.tier === 'ultimate') return 'ultimate';
  if (skill.healMultiplier && skill.healMultiplier > 0) return 'healing';
  if ((skill.effects || []).some((e) => e.kind === 'shield')) return 'shield';
  if (skill.targetType === 'self') return 'buff';
  if (skill.projectile) return 'projectile';
  if (skill.targetType === 'aoe' || skill.targetType === 'ground') return 'aoe';
  if ((skill.hitCount || 1) > 1) return 'multi_hit';
  return 'single_target';
}

export function resolveSkillEvolutionState(
  skill: SkillDefinition,
  skillLevel: number = 1,
  masteryPoints: number = 0
): ResolvedSkillEvolutionState {
  const maxLv = Math.max(1, skill.maxLevel ?? 10);
  const safeLv = Math.max(1, Math.min(maxLv, skillLevel || 1));
  const safeMastery = Math.max(0, Math.min(100, masteryPoints || 0));
  const masteryRank = getMasteryRankFromPoints(safeMastery);

  const milestones =
    skill.evolutionMilestones && skill.evolutionMilestones.length > 0
      ? skill.evolutionMilestones
      : buildEvolutionMilestonesForSkill(skill);

  let bonusDmgPct = 0;
  let bonusHits = 0;
  let bonusProjectiles = 0;
  let bonusRadiusPct = 0;
  let bonusCritPct = 0;
  let cdrPct = 0;
  let cleanseCount = 0;
  let secondarySplashPct = 0;
  let unlocksGroundField = false;
  let executeThresholdPct = 0;
  let unlocksFollowUp = false;
  let evolutionTier = 0;
  const activeMilestones: SkillEvolutionMilestone[] = [];
  const unlockedVfxTags: string[] = [];

  for (const m of milestones) {
    const masteryReq = m.requiredMasteryPoints ?? 0;
    const unlockedByLevel = safeLv >= m.requiredSkillLevel;
    const unlockedByMastery = masteryReq === 0 || safeMastery >= masteryReq;
    if (unlockedByLevel) {
      activeMilestones.push(m);
      bonusDmgPct += m.bonusDamagePct || 0;
      bonusHits += m.bonusHits || 0;
      bonusProjectiles += m.bonusProjectiles || 0;
      bonusRadiusPct += m.bonusAreaRadiusPct || 0;
      bonusCritPct += m.bonusCritChancePct || 0;
      cdrPct += m.cooldownReductionPct || 0;
      cleanseCount += m.cleanseCount || 0;
      secondarySplashPct = Math.max(secondarySplashPct, m.secondarySplashPct || 0);
      if (m.unlocksGroundField) unlocksGroundField = true;
      if (m.unlocksFollowUp) unlocksFollowUp = true;
      if (m.unlocksExecuteThresholdPct) {
        executeThresholdPct = Math.max(executeThresholdPct, m.unlocksExecuteThresholdPct);
      }
      if (unlockedByMastery) {
        evolutionTier = Math.max(evolutionTier, m.vfxTier ?? 0);
        if (m.vfxTag) unlockedVfxTags.push(m.vfxTag);
      }
    }
  }

  const masteryCfg = skill.masteryConfig || DEFAULT_SKILL_MASTERY_CONFIG;
  const masteryDamageBonusPct = safeMastery * (masteryCfg.bonusDamagePerPointPct ?? 0.35);
  if (masteryRank === 'master' || masteryRank === 'grandmaster') {
    cdrPct += masteryCfg.cooldownReductionAtMasterPct ?? 10;
  }
  if (masteryRank === 'grandmaster') {
    bonusCritPct += masteryCfg.critBonusAtGrandmasterPct ?? 8;
    evolutionTier = Math.max(evolutionTier, safeLv >= 10 ? 5 : 4);
  }

  const baseMult = Number(skill.damageMultiplier ?? 1);
  const totalDamageMultiplier = Number(
    (baseMult * (1 + (bonusDmgPct + masteryDamageBonusPct) / 100)).toFixed(3)
  );
  const baseRadius = skill.areaRadius || skill.hitbox?.widthPx || 90;
  const effectiveAreaRadius = Math.round(baseRadius * (1 + bonusRadiusPct / 100));
  const baseCdMs = Math.max(400, Math.round((skill.cooldown || 2) * 1000));
  const effectiveCooldownMs = Math.max(
    400,
    Math.round(baseCdMs * Math.max(0.5, 1 - cdrPct / 100))
  );

  return {
    skillId: skill.id,
    skillLevel: safeLv,
    masteryPoints: safeMastery,
    masteryRank,
    evolutionTier,
    totalDamageMultiplier,
    totalHitCount: Math.max(1, (skill.hitCount || 1) + bonusHits),
    totalProjectiles: Math.max(1, 1 + bonusProjectiles),
    effectiveAreaRadius,
    bonusCritChancePct: bonusCritPct,
    effectiveCooldownMs,
    cleanseCount,
    secondarySplashPct,
    unlocksGroundField,
    executeThresholdPct,
    unlocksFollowUp,
    activeMilestones,
    unlockedVfxTags,
  };
}

export function applyCombatMasteryGain(
  currentProgress: SkillMasteryProgress | undefined,
  skill: SkillDefinition,
  context: {
    nowMs: number;
    isValidTargetAlive: boolean;
    isSafeZone: boolean;
    didConnectEffect: boolean;
    targetIsBoss?: boolean;
  }
): { updated: SkillMasteryProgress; gainedPoints: number; rankedUp: boolean; previousRank: SkillMasteryRankId } {
  const prev: SkillMasteryProgress = currentProgress
    ? { ...currentProgress, unlockedEvolutionTags: [...(currentProgress.unlockedEvolutionTags || [])] }
    : {
        points: 0,
        exp: 0,
        rank: 'novice',
        castsCount: 0,
        validCombatHits: 0,
      };
  const previousRank = prev.rank;

  if (!context.isValidTargetAlive || context.isSafeZone || !context.didConnectEffect) {
    return { updated: prev, gainedPoints: 0, rankedUp: false, previousRank };
  }

  const cfg = skill.masteryConfig || DEFAULT_SKILL_MASTERY_CONFIG;
  if (!cfg.enabled || prev.points >= cfg.maxPoints) {
    prev.castsCount += 1;
    prev.validCombatHits += 1;
    return { updated: prev, gainedPoints: 0, rankedUp: false, previousRank };
  }

  const windowMs = cfg.cooldownWindowMs ?? 650;
  if (prev.lastGainAt && context.nowMs - prev.lastGainAt < windowMs) {
    prev.castsCount += 1;
    return { updated: prev, gainedPoints: 0, rankedUp: false, previousRank };
  }

  const rawGain = (cfg.gainPerValidCast ?? 2) * (context.targetIsBoss ? 1.5 : 1);
  const newTotalExp = prev.exp + rawGain;
  const wholePoints = Math.min(cfg.maxPoints, Math.floor(newTotalExp));
  const gainedPoints = Math.max(0, wholePoints - prev.points);

  prev.exp = Math.min(cfg.maxPoints, Number(newTotalExp.toFixed(2)));
  prev.points = wholePoints;
  prev.rank = getMasteryRankFromPoints(prev.points);
  prev.castsCount += 1;
  prev.validCombatHits += 1;
  prev.lastGainAt = context.nowMs;

  return {
    updated: prev,
    gainedPoints,
    rankedUp: prev.rank !== previousRank,
    previousRank,
  };
}

// ==========================================
// 64 LV.80 ADVANCED BRANCH EXCLUSIVE SKILLS (16 x 4)
// ==========================================

function makeBranchSkill(input: {
  id: string;
  branchId: AdvancedJobId;
  classId: FirstJobClassId;
  name: string;
  nameVi: string;
  description: string;
  tier: 'passive' | 'advanced' | 'ultimate';
  skillType: 'active' | 'passive' | 'ultimate';
  executionType: SkillExecutionType;
  requiredLevel: number;
  mpCost: number;
  cooldown: number;
  range: number;
  areaRadius?: number;
  targetLimit?: number;
  targetType: SkillDefinition['targetType'];
  damageType: 'physical' | 'magic';
  damageMultiplier: number;
  healMultiplier?: number;
  hitCount?: number;
  element: ElementType;
  vfxKey: string;
  pveModifier?: number;
  pvpModifier?: number;
  bossModifier?: number;
  effects?: SkillDefinition['effects'];
}): SkillDefinition {
  const skill: SkillDefinition = {
    id: input.id,
    name: input.name,
    nameVi: input.nameVi,
    description: input.description,
    classId: input.classId,
    advancedBranchId: input.branchId,
    tier: input.tier,
    skillType: input.skillType,
    executionType: input.executionType,
    requiredLevel: input.requiredLevel,
    maxLevel: 10,
    mpCost: input.mpCost,
    manaCost: input.mpCost,
    cooldown: input.cooldown,
    castTime: input.tier === 'ultimate' ? 0.45 : input.tier === 'passive' ? 0 : 0.15,
    castTimeMs: input.tier === 'ultimate' ? 450 : input.tier === 'passive' ? 0 : 150,
    range: input.range,
    areaRadius: input.areaRadius ?? 110,
    targetLimit: input.targetLimit ?? (input.targetType === 'aoe' ? 8 : 1),
    targetType: input.targetType,
    damageType: input.damageType,
    damageMultiplier: input.damageMultiplier,
    damageRatio: input.damageMultiplier,
    baseDamage: Math.round(input.damageMultiplier * 100),
    damageScaling: 0.16,
    attackPowerCoefficient: input.damageType === 'physical' ? input.damageMultiplier : 0,
    magicPowerCoefficient: input.damageType === 'magic' ? input.damageMultiplier : 0,
    healMultiplier: input.healMultiplier,
    hitCount: input.hitCount ?? 1,
    damageFormula: `${input.damageType === 'magic' ? 'MATK' : 'ATK'} * ${input.damageMultiplier} (${input.hitCount ?? 1} hit)`,
    scalingAttributes:
      input.damageType === 'magic'
        ? [{ attr: 'int', ratio: 2.2 }]
        : [
            { attr: 'str', ratio: 1.8 },
            { attr: 'dex', ratio: 1.0 },
          ],
    effects: input.effects || [],
    element: input.element,
    icon: `/assets/elysia/ui/skills/${input.id}.png`,
    vfxKey: input.vfxKey,
    vfxId: input.vfxKey,
    animationId: `anim_${input.branchId}_${input.tier}`,
    animationRef: 'skill',
    masteryConfig: { ...DEFAULT_SKILL_MASTERY_CONFIG },
    pveModifier: input.pveModifier ?? 1.0,
    pvpModifier: input.pvpModifier ?? 0.92,
    bossModifier: input.bossModifier ?? 1.0,
    upgradeScaling: {
      powerPerLevelPct: 16,
      mpCostPerLevel: 2,
      cooldownReductionPerLevelSec: 0.2,
    },
  };
  skill.evolutionMilestones = buildEvolutionMilestonesForSkill(skill);
  return skill;
}

export const ADVANCED_BRANCH_SKILLS: SkillDefinition[] = [
  // Sword Saint
  makeBranchSkill({
    id: 'skill_ss_celestial_stance', branchId: 'sword_saint', classId: 'swordsman',
    name: 'Celestial Sword Intent', nameVi: 'Thiên Kiếm Ý Chí',
    description: 'Nội tại Kiếm Thánh: +14% Chí Mạng và +18% Sát thương kỹ năng Kiếm.',
    tier: 'passive', skillType: 'passive', executionType: 'passive', requiredLevel: 80, mpCost: 0, cooldown: 0, range: 0, targetType: 'passive',
    damageType: 'physical', damageMultiplier: 0, element: 'holy', vfxKey: 'vfx_sword_saint_flash',
    effects: [{ id: 'pas_ss', kind: 'buff', durationSec: 0, stat: 'critRatePct', valuePct: 14, targetScope: 'self', description: '+14% Crit Rate' }],
  }),
  makeBranchSkill({
    id: 'skill_ss_iaido_flash', branchId: 'sword_saint', classId: 'swordsman',
    name: 'Celestial Iaido Flash', nameVi: 'Bạch Kim Cư Hợp Trảm',
    description: 'Rút kiếm siêu thanh chém 3 nhát liên hoàn xuyên giáp mục tiêu.',
    tier: 'advanced', skillType: 'active', executionType: 'multi_hit', requiredLevel: 80, mpCost: 34, cooldown: 5.5, range: 155, areaRadius: 110, targetType: 'single',
    damageType: 'physical', damageMultiplier: 2.95, hitCount: 3, element: 'holy', vfxKey: 'vfx_sword_saint_flash', bossModifier: 1.2,
  }),
  makeBranchSkill({
    id: 'skill_ss_astral_cross', branchId: 'sword_saint', classId: 'swordsman',
    name: 'Astral Cross Slash', nameVi: 'Thập Tự Tinh Kiếm',
    description: 'Phóng hai vệt kiếm khí giao thoa hình chữ thập cắt nát đội hình địch.',
    tier: 'advanced', skillType: 'active', executionType: 'aoe', requiredLevel: 83, mpCost: 42, cooldown: 7.5, range: 170, areaRadius: 145, targetLimit: 8, targetType: 'aoe',
    damageType: 'physical', damageMultiplier: 3.35, hitCount: 2, element: 'holy', vfxKey: 'vfx_sword_saint_flash',
  }),
  makeBranchSkill({
    id: 'skill_ss_thousand_sword_halo', branchId: 'sword_saint', classId: 'swordsman',
    name: 'Thousand-Sword Halo', nameVi: 'Vạn Kiếm Quy Tông (Ultimate)',
    description: 'Tuyệt kỹ Kiếm Thánh: Triệu hồi vòng hào quang ngàn thanh thánh kiếm trảm sát Boss.',
    tier: 'ultimate', skillType: 'ultimate', executionType: 'ultimate', requiredLevel: 86, mpCost: 90, cooldown: 22.0, range: 200, areaRadius: 190, targetLimit: 10, targetType: 'aoe',
    damageType: 'physical', damageMultiplier: 5.8, hitCount: 4, element: 'holy', vfxKey: 'vfx_sword_saint_ult', bossModifier: 1.25,
  }),

  // Berserker
  makeBranchSkill({
    id: 'skill_bk_blood_frenzy', branchId: 'berserker', classId: 'swordsman',
    name: 'Crimson Blood Frenzy', nameVi: 'Huyết Nộ Cuồng Bạo',
    description: 'Nội tại Cuồng Chiến Sĩ: +18% ATK và +8% Hút Máu khi giao chiến.',
    tier: 'passive', skillType: 'passive', executionType: 'passive', requiredLevel: 80, mpCost: 0, cooldown: 0, range: 0, targetType: 'passive',
    damageType: 'physical', damageMultiplier: 0, element: 'fire', vfxKey: 'vfx_berserker_cleave',
    effects: [{ id: 'pas_bk', kind: 'buff', durationSec: 0, stat: 'atkPct', valuePct: 18, targetScope: 'self', description: '+18% ATK' }],
  }),
  makeBranchSkill({
    id: 'skill_bk_crimson_guillotine', branchId: 'berserker', classId: 'swordsman',
    name: 'Crimson Guillotine', nameVi: 'Huyết Nguyệt Đoạn Đầu Trảm',
    description: 'Nhát chém bạo lực bổ thẳng xuống đất tạo sóng xung kích đỏ rực.',
    tier: 'advanced', skillType: 'active', executionType: 'aoe', requiredLevel: 80, mpCost: 36, cooldown: 6.0, range: 140, areaRadius: 135, targetLimit: 6, targetType: 'aoe',
    damageType: 'physical', damageMultiplier: 3.4, hitCount: 1, element: 'fire', vfxKey: 'vfx_berserker_cleave',
  }),
  makeBranchSkill({
    id: 'skill_bk_earthshaker_cleave', branchId: 'berserker', classId: 'swordsman',
    name: 'Earthshaker Blood Cleave', nameVi: 'Băng Địa Cuồng Trảm',
    description: 'Xoay cự kiếm 360 độ thiêu rụi mặt đất và hồi lại sinh lực theo sát thương.',
    tier: 'advanced', skillType: 'active', executionType: 'aoe', requiredLevel: 83, mpCost: 44, cooldown: 8.5, range: 155, areaRadius: 170, targetLimit: 10, targetType: 'aoe',
    damageType: 'physical', damageMultiplier: 3.6, hitCount: 2, element: 'fire', vfxKey: 'vfx_berserker_cleave', pveModifier: 1.15,
  }),
  makeBranchSkill({
    id: 'skill_bk_ragnarok_bloodstorm', branchId: 'berserker', classId: 'swordsman',
    name: 'Ragnarok Bloodstorm', nameVi: 'Huyết Bão Tận Thế (Ultimate)',
    description: 'Tuyệt kỹ Cuồng Chiến Sĩ: Bộc phát bão lửa huyết khí nuốt chửng mọi kẻ thù xung quanh.',
    tier: 'ultimate', skillType: 'ultimate', executionType: 'ultimate', requiredLevel: 86, mpCost: 92, cooldown: 23.0, range: 185, areaRadius: 210, targetLimit: 12, targetType: 'aoe',
    damageType: 'physical', damageMultiplier: 6.1, hitCount: 3, element: 'fire', vfxKey: 'vfx_berserker_ult', pveModifier: 1.2,
  }),

  // Dragoon
  makeBranchSkill({
    id: 'skill_dg_dragon_heart', branchId: 'dragoon', classId: 'spearman',
    name: 'Draconic Resonance', nameVi: 'Long Tâm Cộng Hưởng',
    description: 'Nội tại Long Kỵ Sĩ: +15% Sát thương Boss và +12% Kỹ năng Thương.',
    tier: 'passive', skillType: 'passive', executionType: 'passive', requiredLevel: 80, mpCost: 0, cooldown: 0, range: 0, targetType: 'passive',
    damageType: 'physical', damageMultiplier: 0, element: 'lightning', vfxKey: 'vfx_dragoon_dive',
    effects: [{ id: 'pas_dg', kind: 'buff', durationSec: 0, stat: 'skillDamagePct', valuePct: 16, targetScope: 'self', description: '+16% Skill Damage' }],
  }),
  makeBranchSkill({
    id: 'skill_dg_skyfang_dive', branchId: 'dragoon', classId: 'spearman',
    name: 'Skyfang Dragon Dive', nameVi: 'Thiên Nha Long Giáng',
    description: 'Phi thân xuống mục tiêu kèm lôi thương nổ tung vùng va chạm.',
    tier: 'advanced', skillType: 'active', executionType: 'dash', requiredLevel: 80, mpCost: 35, cooldown: 6.5, range: 220, areaRadius: 140, targetLimit: 7, targetType: 'aoe',
    damageType: 'physical', damageMultiplier: 3.3, hitCount: 2, element: 'lightning', vfxKey: 'vfx_dragoon_dive',
  }),
  makeBranchSkill({
    id: 'skill_dg_lightning_skewer', branchId: 'dragoon', classId: 'spearman',
    name: 'Tempest Skewer', nameVi: 'Lôi Đình Xuyên Phá',
    description: 'Đâm thương tốc độ ánh sáng xuyên thấu boss với 3 nhịp kích lôi.',
    tier: 'advanced', skillType: 'active', executionType: 'multi_hit', requiredLevel: 83, mpCost: 38, cooldown: 7.0, range: 175, targetType: 'single',
    damageType: 'physical', damageMultiplier: 3.55, hitCount: 3, element: 'lightning', vfxKey: 'vfx_dragoon_dive', bossModifier: 1.25,
  }),
  makeBranchSkill({
    id: 'skill_dg_tempest_descent', branchId: 'dragoon', classId: 'spearman',
    name: 'Tempest Dragon Descent', nameVi: 'Lôi Long Hạ Giới (Ultimate)',
    description: 'Tuyệt kỹ Long Kỵ Sĩ: Hóa thân Thiên Long giáng đòn thiên phạt nổ sét toàn khu vực.',
    tier: 'ultimate', skillType: 'ultimate', executionType: 'ultimate', requiredLevel: 86, mpCost: 88, cooldown: 22.0, range: 220, areaRadius: 195, targetLimit: 10, targetType: 'aoe',
    damageType: 'physical', damageMultiplier: 5.9, hitCount: 3, element: 'lightning', vfxKey: 'vfx_dragoon_ult', bossModifier: 1.25,
  }),

  // Warlancer
  makeBranchSkill({
    id: 'skill_wl_iron_phalanx', branchId: 'warlancer', classId: 'spearman',
    name: 'Imperial Phalanx Mastery', nameVi: 'Thiết Bích Thương Trận',
    description: 'Nội tại Chiến Thương: +14% Giáp và +12% Tầm quét diện rộng.',
    tier: 'passive', skillType: 'passive', executionType: 'passive', requiredLevel: 80, mpCost: 0, cooldown: 0, range: 0, targetType: 'passive',
    damageType: 'physical', damageMultiplier: 0, element: 'earth', vfxKey: 'vfx_warlancer_phalanx',
    effects: [{ id: 'pas_wl', kind: 'buff', durationSec: 0, stat: 'defPct', valuePct: 14, targetScope: 'self', description: '+14% DEF' }],
  }),
  makeBranchSkill({
    id: 'skill_wl_crimson_sweep', branchId: 'warlancer', classId: 'spearman',
    name: 'Crimson Halberd Sweep', nameVi: 'Xích Kích Hoành Tảo',
    description: 'Vung kích lớn quét sạch mọi quái vật trong bán kính rộng.',
    tier: 'advanced', skillType: 'active', executionType: 'aoe', requiredLevel: 80, mpCost: 34, cooldown: 5.8, range: 175, areaRadius: 165, targetLimit: 9, targetType: 'aoe',
    damageType: 'physical', damageMultiplier: 3.1, hitCount: 2, element: 'earth', vfxKey: 'vfx_warlancer_phalanx',
  }),
  makeBranchSkill({
    id: 'skill_wl_earth_impale', branchId: 'warlancer', classId: 'spearman',
    name: 'Quake Spear Eruption', nameVi: 'Địa Chấn Thương Lâm',
    description: 'Triệu hồi rừng mũi thương từ lòng đất hất tung và làm chậm kẻ địch.',
    tier: 'advanced', skillType: 'active', executionType: 'crowd_control', requiredLevel: 83, mpCost: 42, cooldown: 8.5, range: 185, areaRadius: 175, targetLimit: 10, targetType: 'aoe',
    damageType: 'physical', damageMultiplier: 3.4, hitCount: 2, element: 'earth', vfxKey: 'vfx_warlancer_ult',
  }),
  makeBranchSkill({
    id: 'skill_wl_grand_legion_halberd', branchId: 'warlancer', classId: 'spearman',
    name: 'Grand Legion Formation', nameVi: 'Thiên Quân Vạn Kích (Ultimate)',
    description: 'Tuyệt kỹ Chiến Thương: Triệu hồi đại quân thương kích nghiền nát chiến trường.',
    tier: 'ultimate', skillType: 'ultimate', executionType: 'ultimate', requiredLevel: 86, mpCost: 86, cooldown: 22.0, range: 200, areaRadius: 210, targetLimit: 12, targetType: 'aoe',
    damageType: 'physical', damageMultiplier: 5.6, hitCount: 4, element: 'earth', vfxKey: 'vfx_warlancer_ult',
  }),

  // Paladin
  makeBranchSkill({
    id: 'skill_pl_sacred_vow', branchId: 'paladin', classId: 'knight',
    name: 'Solar Vanguard Vow', nameVi: 'Thái Dương Hộ Thệ',
    description: 'Nội tại Thánh Kỵ Sĩ: +14% Giảm sát thương nhận vào và +18% Hiệu quả trị thương.',
    tier: 'passive', skillType: 'passive', executionType: 'passive', requiredLevel: 80, mpCost: 0, cooldown: 0, range: 0, targetType: 'passive',
    damageType: 'magic', damageMultiplier: 0, element: 'holy', vfxKey: 'vfx_paladin_aegis',
    effects: [{ id: 'pas_pl', kind: 'buff', durationSec: 0, stat: 'healingPowerPct', valuePct: 18, targetScope: 'self', description: '+18% Healing Power' }],
  }),
  makeBranchSkill({
    id: 'skill_pl_solstice_smite', branchId: 'paladin', classId: 'knight',
    name: 'Solstice Radiance Smite', nameVi: 'Nhật Quang Thánh Trảm',
    description: 'Đánh đòn thánh quang gây sát thương diện rộng đồng thời hồi phục HP bản thân.',
    tier: 'advanced', skillType: 'active', executionType: 'aoe', requiredLevel: 80, mpCost: 34, cooldown: 6.0, range: 145, areaRadius: 145, targetLimit: 7, targetType: 'aoe',
    damageType: 'physical', damageMultiplier: 2.85, healMultiplier: 1.35, hitCount: 2, element: 'holy', vfxKey: 'vfx_paladin_aegis',
  }),
  makeBranchSkill({
    id: 'skill_pl_sanctuary_aegis', branchId: 'paladin', classId: 'knight',
    name: 'Sanctuary Sun Shield', nameVi: 'Thánh Quang Kết Giới',
    description: 'Tạo khiên thánh bảo hộ 1600+ HP và xóa hiệu ứng bất lợi cho đồng minh.',
    tier: 'advanced', skillType: 'active', executionType: 'shield', requiredLevel: 83, mpCost: 42, cooldown: 11.0, range: 180, areaRadius: 170, targetType: 'ally',
    damageType: 'magic', damageMultiplier: 0, healMultiplier: 2.2, element: 'holy', vfxKey: 'vfx_paladin_aegis',
    effects: [{ id: 'shd_pl', kind: 'shield', flatValue: 1600, durationSec: 10, targetScope: 'ally', description: 'Khiên Thánh Quang 1600+ HP' }],
  }),
  makeBranchSkill({
    id: 'skill_pl_sovereign_dawn', branchId: 'paladin', classId: 'knight',
    name: 'Sovereign Dawn Verdict', nameVi: 'Bình Minh Phán Quyết (Ultimate)',
    description: 'Tuyệt kỹ Thánh Kỵ Sĩ: Triệu hồi thánh giá mặt trời thiêu rụi kẻ thù và hồi sinh khí lực đồng đội.',
    tier: 'ultimate', skillType: 'ultimate', executionType: 'ultimate', requiredLevel: 86, mpCost: 88, cooldown: 23.0, range: 185, areaRadius: 200, targetLimit: 10, targetType: 'aoe',
    damageType: 'magic', damageMultiplier: 5.2, healMultiplier: 2.6, hitCount: 3, element: 'holy', vfxKey: 'vfx_paladin_ult',
  }),

  // Guardian
  makeBranchSkill({
    id: 'skill_gd_adamant_core', branchId: 'guardian', classId: 'knight',
    name: 'Adamant Fortress Core', nameVi: 'Kim Cương Bất Hoại',
    description: 'Nội tại Hộ Vệ: +25% DEF và +20% HP tối đa.',
    tier: 'passive', skillType: 'passive', executionType: 'passive', requiredLevel: 80, mpCost: 0, cooldown: 0, range: 0, targetType: 'passive',
    damageType: 'physical', damageMultiplier: 0, element: 'earth', vfxKey: 'vfx_guardian_bastion',
    effects: [{ id: 'pas_gd', kind: 'buff', durationSec: 0, stat: 'hpPct', valuePct: 20, targetScope: 'self', description: '+20% Max HP' }],
  }),
  makeBranchSkill({
    id: 'skill_gd_bastion_bash', branchId: 'guardian', classId: 'knight',
    name: 'Emerald Bastion Slam', nameVi: 'Lục Bảo Chấn Thuẫn',
    description: 'Nện đại thuẫn tạo sóng chấn động phản sát thương dựa theo DEF.',
    tier: 'advanced', skillType: 'active', executionType: 'aoe', requiredLevel: 80, mpCost: 30, cooldown: 5.5, range: 135, areaRadius: 150, targetLimit: 8, targetType: 'aoe',
    damageType: 'physical', damageMultiplier: 2.7, hitCount: 2, element: 'earth', vfxKey: 'vfx_guardian_bastion',
  }),
  makeBranchSkill({
    id: 'skill_gd_aegis_fortress', branchId: 'guardian', classId: 'knight',
    name: 'Octagonal Aegis Barrier', nameVi: 'Kết Giới Bát Giác',
    description: 'Triệu hồi tường pha lê bát giác hấp thụ lượng sát thương khổng lồ.',
    tier: 'advanced', skillType: 'active', executionType: 'shield', requiredLevel: 83, mpCost: 40, cooldown: 12.0, range: 0, targetType: 'self',
    damageType: 'physical', damageMultiplier: 0, element: 'earth', vfxKey: 'vfx_guardian_bastion',
    effects: [{ id: 'shd_gd', kind: 'shield', flatValue: 2600, durationSec: 12, targetScope: 'self', description: 'Đại Khiên Pháo Đài 2600+ HP' }],
  }),
  makeBranchSkill({
    id: 'skill_gd_immutable_dome', branchId: 'guardian', classId: 'knight',
    name: 'Immutable Earth Dome', nameVi: 'Kết Giới Bất Diệt (Ultimate)',
    description: 'Tuyệt kỹ Hộ Vệ: Dựng mái vòm địa chấn bảo hộ toàn đội và nghiền nát địch xung quanh.',
    tier: 'ultimate', skillType: 'ultimate', executionType: 'ultimate', requiredLevel: 86, mpCost: 85, cooldown: 24.0, range: 180, areaRadius: 210, targetLimit: 10, targetType: 'aoe',
    damageType: 'physical', damageMultiplier: 4.9, hitCount: 2, element: 'earth', vfxKey: 'vfx_guardian_ult',
  }),

  // Saint
  makeBranchSkill({
    id: 'skill_st_seraph_grace', branchId: 'saint', classId: 'monk',
    name: 'Seraphic Wings Mastery', nameVi: 'Thiên Sứ Gia Hộ',
    description: 'Nội tại Thánh Sư: +25% Sức mạnh Trị Liệu và -10% Tiêu hao MP.',
    tier: 'passive', skillType: 'passive', executionType: 'passive', requiredLevel: 80, mpCost: 0, cooldown: 0, range: 0, targetType: 'passive',
    damageType: 'magic', damageMultiplier: 0, element: 'holy', vfxKey: 'vfx_saint_sanctuary',
    effects: [{ id: 'pas_st', kind: 'buff', durationSec: 0, stat: 'healingPowerPct', valuePct: 25, targetScope: 'self', description: '+25% Healing Power' }],
  }),
  makeBranchSkill({
    id: 'skill_st_radiant_hymn', branchId: 'saint', classId: 'monk',
    name: 'Seraphic Radiant Hymn', nameVi: 'Thánh Ca Cứu Rỗi',
    description: 'Ngâm khúc thánh ca hồi phục HP tức thì và giải trừ hiệu ứng bất lợi cho mục tiêu.',
    tier: 'advanced', skillType: 'active', executionType: 'healing', requiredLevel: 80, mpCost: 34, cooldown: 4.5, range: 260, areaRadius: 150, targetType: 'ally',
    damageType: 'magic', damageMultiplier: 0, healMultiplier: 3.4, element: 'holy', vfxKey: 'vfx_saint_sanctuary',
  }),
  makeBranchSkill({
    id: 'skill_st_sanctuary_field', branchId: 'saint', classId: 'monk',
    name: 'Golden Sanctuary Field', nameVi: 'Thánh Vực Cứu Thế',
    description: 'Trải trận đồ thánh quang lớn hồi máu liên hoàn toàn tổ đội trong tầm.',
    tier: 'advanced', skillType: 'active', executionType: 'healing', requiredLevel: 83, mpCost: 48, cooldown: 9.0, range: 240, areaRadius: 210, targetLimit: 8, targetType: 'ally',
    damageType: 'magic', damageMultiplier: 0, healMultiplier: 4.1, hitCount: 2, element: 'holy', vfxKey: 'vfx_saint_sanctuary',
  }),
  makeBranchSkill({
    id: 'skill_st_celestial_benediction', branchId: 'saint', classId: 'monk',
    name: 'Celestial Benediction', nameVi: 'Thiên Sứ Giáng Phúc (Ultimate)',
    description: 'Tuyệt kỹ Thánh Sư: Triệu hồi Thánh Vực rực sáng hồi đầy sinh lực và ban phước tăng công thủ.',
    tier: 'ultimate', skillType: 'ultimate', executionType: 'healing', requiredLevel: 86, mpCost: 92, cooldown: 20.0, range: 280, areaRadius: 240, targetLimit: 10, targetType: 'ally',
    damageType: 'magic', damageMultiplier: 2.2, healMultiplier: 6.2, element: 'holy', vfxKey: 'vfx_saint_ult',
  }),

  // Exorcist
  makeBranchSkill({
    id: 'skill_ex_sacred_seal', branchId: 'exorcist', classId: 'monk',
    name: 'Purification Seal Arts', nameVi: 'Bí Thuật Trừ Tà',
    description: 'Nội tại Trừ Tà Sư: +18% Sát thương Phép Thuật & +12% Chí mạng.',
    tier: 'passive', skillType: 'passive', executionType: 'passive', requiredLevel: 80, mpCost: 0, cooldown: 0, range: 0, targetType: 'passive',
    damageType: 'magic', damageMultiplier: 0, element: 'holy', vfxKey: 'vfx_exorcist_seal',
    effects: [{ id: 'pas_ex', kind: 'buff', durationSec: 0, stat: 'matkPct', valuePct: 18, targetScope: 'self', description: '+18% MATK' }],
  }),
  makeBranchSkill({
    id: 'skill_ex_judgement_talisman', branchId: 'exorcist', classId: 'monk',
    name: 'Judgement Talisman', nameVi: 'Phù Chú Phán Quyết',
    description: 'Ném ấn phù thánh sét phát nổ và làm suy yếu giáp phép của Boss.',
    tier: 'advanced', skillType: 'active', executionType: 'projectile', requiredLevel: 80, mpCost: 34, cooldown: 5.0, range: 260, areaRadius: 130, targetType: 'single',
    damageType: 'magic', damageMultiplier: 3.15, hitCount: 2, element: 'holy', vfxKey: 'vfx_exorcist_seal', bossModifier: 1.2,
  }),
  makeBranchSkill({
    id: 'skill_ex_purifying_pillar', branchId: 'exorcist', classId: 'monk',
    name: 'Sacred Lightning Pillar', nameVi: 'Thánh Lôi Trụ',
    description: 'Giáng cột sét tinh khiết từ trời cao thanh tẩy toàn bộ quái vật trong vòng ấn.',
    tier: 'advanced', skillType: 'active', executionType: 'aoe', requiredLevel: 83, mpCost: 44, cooldown: 7.5, range: 250, areaRadius: 165, targetLimit: 8, targetType: 'aoe',
    damageType: 'magic', damageMultiplier: 3.55, hitCount: 2, element: 'lightning', vfxKey: 'vfx_exorcist_seal',
  }),
  makeBranchSkill({
    id: 'skill_ex_grand_purification', branchId: 'exorcist', classId: 'monk',
    name: 'Grand Purification Rite', nameVi: 'Đại Nghi Lễ Tịnh Hóa (Ultimate)',
    description: 'Tuyệt kỹ Trừ Tà Sư: Khai mở đại pháp trận phán quyết giáng 4 đợt thánh lôi hủy diệt.',
    tier: 'ultimate', skillType: 'ultimate', executionType: 'ultimate', requiredLevel: 86, mpCost: 90, cooldown: 22.0, range: 270, areaRadius: 205, targetLimit: 10, targetType: 'aoe',
    damageType: 'magic', damageMultiplier: 5.85, hitCount: 4, element: 'holy', vfxKey: 'vfx_exorcist_ult', bossModifier: 1.25,
  }),

  // Elementalist
  makeBranchSkill({
    id: 'skill_el_elemental_harmony', branchId: 'elementalist', classId: 'mage',
    name: 'Tri-Elemental Resonance', nameVi: 'Cộng Hưởng Tam Nguyên Tố',
    description: 'Nội tại Nguyên Tố Sư: +20% Sát thương Kỹ năng Diện rộng.',
    tier: 'passive', skillType: 'passive', executionType: 'passive', requiredLevel: 80, mpCost: 0, cooldown: 0, range: 0, targetType: 'passive',
    damageType: 'magic', damageMultiplier: 0, element: 'fire', vfxKey: 'vfx_elementalist_triad',
    effects: [{ id: 'pas_el', kind: 'buff', durationSec: 0, stat: 'skillDamagePct', valuePct: 20, targetScope: 'self', description: '+20% Skill Damage' }],
  }),
  makeBranchSkill({
    id: 'skill_el_tri_convergence', branchId: 'elementalist', classId: 'mage',
    name: 'Tri-Elemental Convergence', nameVi: 'Tam Nguyên Hội Tụ',
    description: 'Phóng đồng thời cầu Lửa, thương Băng và tia Sét nổ dây chuyền.',
    tier: 'advanced', skillType: 'active', executionType: 'projectile', requiredLevel: 80, mpCost: 38, cooldown: 5.5, range: 280, areaRadius: 155, targetLimit: 8, targetType: 'aoe',
    damageType: 'magic', damageMultiplier: 3.3, hitCount: 3, element: 'fire', vfxKey: 'vfx_elementalist_triad',
  }),
  makeBranchSkill({
    id: 'skill_el_frostfire_vortex', branchId: 'elementalist', classId: 'mage',
    name: 'Frostfire Tempest Vortex', nameVi: 'Bão Băng Hỏa Hỗn Mang',
    description: 'Tạo lốc xoáy nguyên tố cuốn quái và phát nổ liên tục trên vùng rộng lớn.',
    tier: 'advanced', skillType: 'active', executionType: 'aoe', requiredLevel: 83, mpCost: 48, cooldown: 8.5, range: 265, areaRadius: 195, targetLimit: 12, targetType: 'aoe',
    damageType: 'magic', damageMultiplier: 3.7, hitCount: 3, element: 'ice', vfxKey: 'vfx_elementalist_ult', pveModifier: 1.2,
  }),
  makeBranchSkill({
    id: 'skill_el_prismatic_cataclysm', branchId: 'elementalist', classId: 'mage',
    name: 'Prismatic Cataclysm', nameVi: 'Đại Thảm Họa Ngũ Sắc (Ultimate)',
    description: 'Tuyệt kỹ Nguyên Tố Sư: Giáng mưa thiên thạch nguyên tố thiêu băng toàn màn hình.',
    tier: 'ultimate', skillType: 'ultimate', executionType: 'ultimate', requiredLevel: 86, mpCost: 98, cooldown: 23.0, range: 290, areaRadius: 235, targetLimit: 14, targetType: 'aoe',
    damageType: 'magic', damageMultiplier: 6.25, hitCount: 4, element: 'fire', vfxKey: 'vfx_elementalist_ult', pveModifier: 1.25,
  }),

  // Arcanist
  makeBranchSkill({
    id: 'skill_ar_astral_flow', branchId: 'arcanist', classId: 'mage',
    name: 'Celestial Astrolabe Flow', nameVi: 'Tinh Bàn Lưu Chuyển',
    description: 'Nội tại Bí Ẩn Sư: +18% MATK và tối ưu hồi chiêu phép thuật.',
    tier: 'passive', skillType: 'passive', executionType: 'passive', requiredLevel: 80, mpCost: 0, cooldown: 0, range: 0, targetType: 'passive',
    damageType: 'magic', damageMultiplier: 0, element: 'arcane', vfxKey: 'vfx_arcanist_nova',
    effects: [{ id: 'pas_ar', kind: 'buff', durationSec: 0, stat: 'matkPct', valuePct: 18, targetScope: 'self', description: '+18% MATK' }],
  }),
  makeBranchSkill({
    id: 'skill_ar_gravity_singularity', branchId: 'arcanist', classId: 'mage',
    name: 'Astral Singularity', nameVi: 'Điểm Kỳ Dị Tinh Tú',
    description: 'Mở hố đen vũ trụ hút và nghiền nát kẻ địch bằng sóng bí thuật tinh quang.',
    tier: 'advanced', skillType: 'active', executionType: 'aoe', requiredLevel: 80, mpCost: 36, cooldown: 5.5, range: 270, areaRadius: 165, targetLimit: 9, targetType: 'aoe',
    damageType: 'magic', damageMultiplier: 3.35, hitCount: 2, element: 'arcane', vfxKey: 'vfx_arcanist_nova',
  }),
  makeBranchSkill({
    id: 'skill_ar_rune_overload', branchId: 'arcanist', classId: 'mage',
    name: 'Arcane Rune Overload', nameVi: 'Quá Tải Cổ Ngữ',
    description: 'Bắn chùm tinh cầu xuyên tâm gây bùng nổ chí mạng liên tiếp lên Boss.',
    tier: 'advanced', skillType: 'active', executionType: 'multi_hit', requiredLevel: 83, mpCost: 42, cooldown: 6.5, range: 290, targetType: 'single',
    damageType: 'magic', damageMultiplier: 3.75, hitCount: 4, element: 'arcane', vfxKey: 'vfx_arcanist_nova', bossModifier: 1.25,
  }),
  makeBranchSkill({
    id: 'skill_ar_celestial_starfall', branchId: 'arcanist', classId: 'mage',
    name: 'Celestial Starfall', nameVi: 'Tinh Tú Vẫn Lạc (Ultimate)',
    description: 'Tuyệt kỹ Bí Ẩn Sư: Triệu hồi tinh bàn cổ đại giáng hàng loạt ngôi sao băng xuyên phá Boss.',
    tier: 'ultimate', skillType: 'ultimate', executionType: 'ultimate', requiredLevel: 86, mpCost: 95, cooldown: 21.0, range: 295, areaRadius: 215, targetLimit: 12, targetType: 'aoe',
    damageType: 'magic', damageMultiplier: 6.1, hitCount: 5, element: 'arcane', vfxKey: 'vfx_arcanist_ult', bossModifier: 1.25,
  }),

  // Shadowblade
  makeBranchSkill({
    id: 'skill_sb_lethal_tempo', branchId: 'shadowblade', classId: 'assassin',
    name: 'Nightfall Precision', nameVi: 'Ám Sát Cực Hạn',
    description: 'Nội tại Ảnh Nhận: +15% Chí Mạng và +25% Sát thương Chí Mạng.',
    tier: 'passive', skillType: 'passive', executionType: 'passive', requiredLevel: 80, mpCost: 0, cooldown: 0, range: 0, targetType: 'passive',
    damageType: 'physical', damageMultiplier: 0, element: 'shadow', vfxKey: 'vfx_shadowblade_eviscerate',
    effects: [{ id: 'pas_sb', kind: 'buff', durationSec: 0, stat: 'critDamagePct', valuePct: 25, targetScope: 'self', description: '+25% Crit Damage' }],
  }),
  makeBranchSkill({
    id: 'skill_sb_nightfall_eviscerate', branchId: 'shadowblade', classId: 'assassin',
    name: 'Nightfall Eviscerate', nameVi: 'Ám Ảnh Đoạt Mệnh',
    description: 'Áp sát tức thời tung 3 nhát đoản kiếm đẫm bóng đêm vào tử huyệt.',
    tier: 'advanced', skillType: 'active', executionType: 'dash', requiredLevel: 80, mpCost: 32, cooldown: 5.0, range: 185, targetType: 'single',
    damageType: 'physical', damageMultiplier: 3.35, hitCount: 3, element: 'shadow', vfxKey: 'vfx_shadowblade_eviscerate', bossModifier: 1.2,
  }),
  makeBranchSkill({
    id: 'skill_sb_crimson_ambush', branchId: 'shadowblade', classId: 'assassin',
    name: 'Crimson Shadow Ambush', nameVi: 'Huyết Ảnh Tập Kích',
    description: 'Chém chữ X kết liễu mục tiêu thấp máu với uy lực bội tăng.',
    tier: 'advanced', skillType: 'active', executionType: 'multi_hit', requiredLevel: 83, mpCost: 38, cooldown: 7.0, range: 165, targetType: 'single',
    damageType: 'physical', damageMultiplier: 3.8, hitCount: 2, element: 'shadow', vfxKey: 'vfx_shadowblade_eviscerate',
  }),
  makeBranchSkill({
    id: 'skill_sb_eclipse_assassination', branchId: 'shadowblade', classId: 'assassin',
    name: 'Eclipse Assassination', nameVi: 'Nhật Thực Sát Lục (Ultimate)',
    description: 'Tuyệt kỹ Ảnh Nhận: Đóng ấn trăng máu và tung 6 nhát trảm bóng tối không thể né tránh.',
    tier: 'ultimate', skillType: 'ultimate', executionType: 'ultimate', requiredLevel: 86, mpCost: 84, cooldown: 20.0, range: 205, areaRadius: 165, targetLimit: 6, targetType: 'aoe',
    damageType: 'physical', damageMultiplier: 6.0, hitCount: 6, element: 'shadow', vfxKey: 'vfx_shadowblade_ult', bossModifier: 1.25,
  }),

  // Phantom
  makeBranchSkill({
    id: 'skill_ph_mirage_veil', branchId: 'phantom', classId: 'assassin',
    name: 'Spectral Mirage Veil', nameVi: 'Màn Sương Huyễn Ảnh',
    description: 'Nội tại Ảo Ảnh: +14% AGI và +12% Né tránh / Kháng đòn.',
    tier: 'passive', skillType: 'passive', executionType: 'passive', requiredLevel: 80, mpCost: 0, cooldown: 0, range: 0, targetType: 'passive',
    damageType: 'physical', damageMultiplier: 0, element: 'shadow', vfxKey: 'vfx_phantom_mirage',
    effects: [{ id: 'pas_ph', kind: 'buff', durationSec: 0, stat: 'aspdPct', valuePct: 16, targetScope: 'self', description: '+16% Attack Speed' }],
  }),
  makeBranchSkill({
    id: 'skill_ph_spectral_blades', branchId: 'phantom', classId: 'assassin',
    name: 'Spectral Mirage Fan', nameVi: 'Phi Đao Huyễn Ảnh',
    description: 'Triệu hồi phân thân phóng quạt phi đao lục lam cắt qua nhiều kẻ địch.',
    tier: 'advanced', skillType: 'active', executionType: 'aoe', requiredLevel: 80, mpCost: 34, cooldown: 5.5, range: 195, areaRadius: 165, targetLimit: 8, targetType: 'aoe',
    damageType: 'physical', damageMultiplier: 3.1, hitCount: 3, element: 'shadow', vfxKey: 'vfx_phantom_mirage',
  }),
  makeBranchSkill({
    id: 'skill_ph_mirror_step', branchId: 'phantom', classId: 'assassin',
    name: 'Phantom Mirror Step', nameVi: 'Ảo Ảnh Bộ Pháp',
    description: 'Lướt xuyên chiến trường để lại 4 dư ảnh phát nổ đồng loạt.',
    tier: 'advanced', skillType: 'active', executionType: 'dash', requiredLevel: 83, mpCost: 40, cooldown: 7.5, range: 225, areaRadius: 175, targetLimit: 9, targetType: 'aoe',
    damageType: 'physical', damageMultiplier: 3.45, hitCount: 3, element: 'shadow', vfxKey: 'vfx_phantom_mirage',
  }),
  makeBranchSkill({
    id: 'skill_ph_spectral_waltz', branchId: 'phantom', classId: 'assassin',
    name: 'Spectral Eclipse Waltz', nameVi: 'Vũ Điệu U Minh (Ultimate)',
    description: 'Tuyệt kỹ Ảo Ảnh: Bão phân thân xoay tròn chém liên hoàn khắp vùng rộng.',
    tier: 'ultimate', skillType: 'ultimate', executionType: 'ultimate', requiredLevel: 86, mpCost: 86, cooldown: 21.0, range: 210, areaRadius: 205, targetLimit: 12, targetType: 'aoe',
    damageType: 'physical', damageMultiplier: 5.75, hitCount: 5, element: 'shadow', vfxKey: 'vfx_phantom_ult',
  }),

  // Martial Artist
  makeBranchSkill({
    id: 'skill_ma_lotus_chi', branchId: 'martial_artist', classId: 'fighter',
    name: 'Blazing Lotus Chi', nameVi: 'Kim Liên Chân Khí',
    description: 'Nội tại Võ Thánh: +18% ATK và gia tăng sức mạnh đòn nện chân khí.',
    tier: 'passive', skillType: 'passive', executionType: 'passive', requiredLevel: 80, mpCost: 0, cooldown: 0, range: 0, targetType: 'passive',
    damageType: 'physical', damageMultiplier: 0, element: 'fire', vfxKey: 'vfx_martial_dragon',
    effects: [{ id: 'pas_ma', kind: 'buff', durationSec: 0, stat: 'atkPct', valuePct: 18, targetScope: 'self', description: '+18% ATK' }],
  }),
  makeBranchSkill({
    id: 'skill_ma_crimson_tiger_fang', branchId: 'martial_artist', classId: 'fighter',
    name: 'Crimson Tiger Fang', nameVi: 'Xích Hổ Phá Quyền',
    description: 'Tung quyền hổ rực lửa tạo chấn động phá giáp và đẩy lùi mục tiêu.',
    tier: 'advanced', skillType: 'active', executionType: 'single_target', requiredLevel: 80, mpCost: 32, cooldown: 5.5, range: 130, areaRadius: 120, targetType: 'single',
    damageType: 'physical', damageMultiplier: 3.45, hitCount: 2, element: 'fire', vfxKey: 'vfx_martial_dragon', bossModifier: 1.2,
  }),
  makeBranchSkill({
    id: 'skill_ma_sonic_palm', branchId: 'martial_artist', classId: 'fighter',
    name: 'Sonic Lotus Palm', nameVi: 'Liên Hoa Chấn Chưởng',
    description: 'Đẩy chưởng khí siêu thanh tạo sóng nổ vòng tròn hất văng quái vật.',
    tier: 'advanced', skillType: 'active', executionType: 'aoe', requiredLevel: 83, mpCost: 40, cooldown: 7.5, range: 155, areaRadius: 165, targetLimit: 8, targetType: 'aoe',
    damageType: 'physical', damageMultiplier: 3.55, hitCount: 2, element: 'fire', vfxKey: 'vfx_martial_dragon',
  }),
  makeBranchSkill({
    id: 'skill_ma_asura_hundred_palms', branchId: 'martial_artist', classId: 'fighter',
    name: 'Asura Hundred Palms', nameVi: 'Tu La Bách Liệt Quyền (Ultimate)',
    description: 'Tuyệt kỹ Võ Thánh: Dồn toàn bộ chân khí tung trăm quyền hủy diệt chấn động cả bản đồ.',
    tier: 'ultimate', skillType: 'ultimate', executionType: 'ultimate', requiredLevel: 86, mpCost: 88, cooldown: 22.0, range: 170, areaRadius: 195, targetLimit: 10, targetType: 'aoe',
    damageType: 'physical', damageMultiplier: 6.1, hitCount: 5, element: 'fire', vfxKey: 'vfx_martial_ult', bossModifier: 1.25,
  }),

  // Duelist
  makeBranchSkill({
    id: 'skill_dl_tempo_flow', branchId: 'duelist', classId: 'fighter',
    name: 'Wind Tempo Mastery', nameVi: 'Phong Tốc Liên Hoàn',
    description: 'Nội tại Quyết Đấu: +16% Tốc Độ Đánh và +12% Chí Mạng.',
    tier: 'passive', skillType: 'passive', executionType: 'passive', requiredLevel: 80, mpCost: 0, cooldown: 0, range: 0, targetType: 'passive',
    damageType: 'physical', damageMultiplier: 0, element: 'wind', vfxKey: 'vfx_duelist_flurry',
    effects: [{ id: 'pas_dl', kind: 'buff', durationSec: 0, stat: 'critRatePct', valuePct: 12, targetScope: 'self', description: '+12% Crit Rate' }],
  }),
  makeBranchSkill({
    id: 'skill_dl_velocity_riposte', branchId: 'duelist', classId: 'fighter',
    name: 'Velocity Riposte', nameVi: 'Tốc Phong Phản Kích',
    description: 'Ra 4 đòn liên hoàn chớp nhoáng kèm tia gió phản kích.',
    tier: 'advanced', skillType: 'active', executionType: 'multi_hit', requiredLevel: 80, mpCost: 30, cooldown: 4.5, range: 145, targetType: 'single',
    damageType: 'physical', damageMultiplier: 3.2, hitCount: 4, element: 'wind', vfxKey: 'vfx_duelist_flurry',
  }),
  makeBranchSkill({
    id: 'skill_dl_gale_combo', branchId: 'duelist', classId: 'fighter',
    name: 'Whirlwind Combo Step', nameVi: 'Cuồng Phong Liên Vũ',
    description: 'Lao vòng xoáy gió đánh văng kẻ địch xung quanh bằng 3 nhịp cước.',
    tier: 'advanced', skillType: 'active', executionType: 'dash', requiredLevel: 83, mpCost: 38, cooldown: 6.5, range: 175, areaRadius: 155, targetLimit: 7, targetType: 'aoe',
    damageType: 'physical', damageMultiplier: 3.45, hitCount: 3, element: 'wind', vfxKey: 'vfx_duelist_flurry',
  }),
  makeBranchSkill({
    id: 'skill_dl_crimson_finale_dance', branchId: 'duelist', classId: 'fighter',
    name: 'Crimson Finale Dance', nameVi: 'Hồng Phong Chung Kết (Ultimate)',
    description: 'Tuyệt kỹ Quyết Đấu: Khóa nhịp điệu tung 6 đòn tốc độ ánh sáng kết thúc bằng sóng nổ.',
    tier: 'ultimate', skillType: 'ultimate', executionType: 'ultimate', requiredLevel: 86, mpCost: 85, cooldown: 20.0, range: 185, areaRadius: 185, targetLimit: 9, targetType: 'aoe',
    damageType: 'physical', damageMultiplier: 5.9, hitCount: 6, element: 'wind', vfxKey: 'vfx_duelist_ult',
  }),

  // Sniper
  makeBranchSkill({
    id: 'skill_sn_eagle_lock', branchId: 'sniper', classId: 'archer',
    name: 'Precision Target Lock', nameVi: 'Ưng Nhãn Khóa Đích',
    description: 'Nội tại Xạ Thủ: +16% Chí mạng và +18% Sát thương Boss tầm xa.',
    tier: 'passive', skillType: 'passive', executionType: 'passive', requiredLevel: 80, mpCost: 0, cooldown: 0, range: 0, targetType: 'passive',
    damageType: 'physical', damageMultiplier: 0, element: 'lightning', vfxKey: 'vfx_sniper_railshot',
    effects: [{ id: 'pas_sn', kind: 'buff', durationSec: 0, stat: 'critRatePct', valuePct: 16, targetScope: 'self', description: '+16% Crit Rate' }],
  }),
  makeBranchSkill({
    id: 'skill_sn_starlight_railshot', branchId: 'sniper', classId: 'archer',
    name: 'Starlight Railshot', nameVi: 'Quang Tuyến Thần Tiễn',
    description: 'Khóa tâm bắn tia năng lượng siêu thanh xuyên thẳng giáp mục tiêu.',
    tier: 'advanced', skillType: 'active', executionType: 'projectile', requiredLevel: 80, mpCost: 34, cooldown: 5.5, range: 360, targetType: 'single',
    damageType: 'physical', damageMultiplier: 3.5, hitCount: 1, element: 'lightning', vfxKey: 'vfx_sniper_railshot', bossModifier: 1.25,
  }),
  makeBranchSkill({
    id: 'skill_sn_armor_shatter', branchId: 'sniper', classId: 'archer',
    name: 'Tungsten Piercing Shot', nameVi: 'Mũi Tên Phá Giáp',
    description: 'Bắn hai mũi tên xuyên thấu liên tiếp làm vỡ giáp và gây choáng nhẹ Boss.',
    tier: 'advanced', skillType: 'active', executionType: 'multi_hit', requiredLevel: 83, mpCost: 40, cooldown: 7.5, range: 350, targetType: 'single',
    damageType: 'physical', damageMultiplier: 3.75, hitCount: 2, element: 'physical', vfxKey: 'vfx_sniper_railshot', bossModifier: 1.25,
  }),
  makeBranchSkill({
    id: 'skill_sn_orbital_barrage', branchId: 'sniper', classId: 'archer',
    name: 'Orbital Piercing Barrage', nameVi: 'Thiên Không Xuyên Phá (Ultimate)',
    description: 'Tuyệt kỹ Xạ Thủ: Bắn loạt tia sáng định vị giáng 3 phát bắn chí tử từ quỹ đạo.',
    tier: 'ultimate', skillType: 'ultimate', executionType: 'ultimate', requiredLevel: 86, mpCost: 88, cooldown: 21.0, range: 380, areaRadius: 170, targetLimit: 6, targetType: 'aoe',
    damageType: 'physical', damageMultiplier: 6.2, hitCount: 3, element: 'lightning', vfxKey: 'vfx_sniper_ult', bossModifier: 1.3,
  }),

  // Ranger
  makeBranchSkill({
    id: 'skill_rg_sylvan_stride', branchId: 'ranger', classId: 'archer',
    name: 'Sylvan Wind Stride', nameVi: 'Bộ Pháp Rừng Xanh',
    description: 'Nội tại Du Hiệp: +15% Tốc chạy và +16% Uy lực kỹ năng diện rộng.',
    tier: 'passive', skillType: 'passive', executionType: 'passive', requiredLevel: 80, mpCost: 0, cooldown: 0, range: 0, targetType: 'passive',
    damageType: 'physical', damageMultiplier: 0, element: 'nature', vfxKey: 'vfx_ranger_tempest',
    effects: [{ id: 'pas_rg', kind: 'buff', durationSec: 0, stat: 'moveSpeedPct', valuePct: 15, targetScope: 'self', description: '+15% Move Speed' }],
  }),
  makeBranchSkill({
    id: 'skill_rg_leaf_tempest', branchId: 'ranger', classId: 'archer',
    name: 'Sylvan Leaf Tempest', nameVi: 'Cuồng Phong Lá Rừng',
    description: 'Quạt 5 mũi tên gió ngọc lục bảo quét sạch bầy quái vật.',
    tier: 'advanced', skillType: 'active', executionType: 'aoe', requiredLevel: 80, mpCost: 34, cooldown: 5.5, range: 290, areaRadius: 175, targetLimit: 9, targetType: 'aoe',
    damageType: 'physical', damageMultiplier: 3.1, hitCount: 2, element: 'nature', vfxKey: 'vfx_ranger_tempest', pveModifier: 1.15,
  }),
  makeBranchSkill({
    id: 'skill_rg_briar_snare', branchId: 'ranger', classId: 'archer',
    name: 'Briar Vine Volley', nameVi: 'Bẫy Dây Leo Rừng',
    description: 'Gài trận đồ dây leo trói chân, gây độc và bắn mưa tên lên toàn vùng.',
    tier: 'advanced', skillType: 'active', executionType: 'crowd_control', requiredLevel: 83, mpCost: 42, cooldown: 8.0, range: 280, areaRadius: 190, targetLimit: 10, targetType: 'aoe',
    damageType: 'physical', damageMultiplier: 3.4, hitCount: 3, element: 'nature', vfxKey: 'vfx_ranger_tempest',
  }),
  makeBranchSkill({
    id: 'skill_rg_emerald_canopy_rain', branchId: 'ranger', classId: 'archer',
    name: 'Emerald Canopy Rain', nameVi: 'Thiên Vũ Lục Bảo (Ultimate)',
    description: 'Tuyệt kỹ Du Hiệp: Triệu hồi vòm mưa tên ngọc lục bảo phủ kín vùng rộng lớn.',
    tier: 'ultimate', skillType: 'ultimate', executionType: 'ultimate', requiredLevel: 86, mpCost: 90, cooldown: 22.0, range: 310, areaRadius: 230, targetLimit: 14, targetType: 'aoe',
    damageType: 'physical', damageMultiplier: 5.8, hitCount: 4, element: 'nature', vfxKey: 'vfx_ranger_ult', pveModifier: 1.25,
  }),
];
