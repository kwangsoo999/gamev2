import {
  AttributeKey,
  ClassDefinition,
  ClassEvolutionStage,
  ExpBalanceConfig,
  FirstJobClassId,
  JobScoreBreakdown,
  PrimaryAttributes,
  SecondJobSpecialization,
} from '@elysia/game-types';

export * from './rarityAndSlots.js';
export * from './skills.js';
export * from './setsAndItems.js';
export * from './bosses.js';
export * from './questsUniqueTitles.js';
export * from './professions.js';
export * from './organizations.js';
export * from './advancedEvolution.js';
export * from './passives.js';
export * from './statAggregator.js';
export * from './combatSimulator.js';
export * from './worldSystems.js';
export * from './worldPlacementValidator.js';
export * from './characterBalanceAndCombatPolish.js';

export const ATTRIBUTE_POINTS_PER_LEVEL = 4;

export const DEFAULT_EXP_BALANCE_CONFIG: ExpBalanceConfig = {
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
    graceLevelDiff: 3,
    penaltyPerLevelPct: 12,
    minExpFloorPct: 25,
    higherLevelBonusPerLvPct: 5,
    maxHigherLevelBonusPct: 20,
  },
};

/**
 * Computes EXP gained on monster defeat with balanced level-difference curve:
 * - Within graceLevelDiff (default 3 levels): 100% EXP
 * - Slightly higher monsters: small bonus up to maxHigherLevelBonusPct (+20%)
 * - Significantly lower monsters: progressive reduction down to guaranteed floor (minExpFloorPct = 25%)
 *   so early-zone training remains useful without trivializing progression.
 */
export function computeLevelAdjustedExp(
  baseExp: number,
  playerLevel: number,
  monsterLevel: number,
  config?: Partial<ExpBalanceConfig>
): number {
  const safeBase = Math.max(0, Number(baseExp || 0));
  if (safeBase === 0) return 0;

  const mult = Math.max(0.1, Number(config?.expMultiplier ?? DEFAULT_EXP_BALANCE_CONFIG.expMultiplier));
  const pen = {
    ...DEFAULT_EXP_BALANCE_CONFIG.levelPenalty,
    ...(config?.levelPenalty || {}),
  };

  const pLv = Math.max(1, Number(playerLevel || 1));
  const mLv = Math.max(1, Number(monsterLevel || 1));
  const diff = pLv - mLv;

  let ratio = 1.0;
  if (diff > pen.graceLevelDiff) {
    const excess = diff - pen.graceLevelDiff;
    const rawPct = Math.max(pen.minExpFloorPct, 100 - excess * pen.penaltyPerLevelPct);
    ratio = rawPct / 100;
  } else if (diff < 0) {
    const gap = Math.min(5, Math.abs(diff));
    const bonusPct = Math.min(pen.maxHigherLevelBonusPct, gap * pen.higherLevelBonusPerLvPct);
    ratio = 1 + bonusPct / 100;
  }

  return Math.max(5, Math.round(safeBase * mult * ratio));
}

export const FIRST_JOB_CLASS_IDS: FirstJobClassId[] = [
  'swordsman',
  'spearman',
  'knight',
  'monk',
  'mage',
  'assassin',
  'fighter',
  'archer',
];

export function isPreJobClass(classId: string | undefined | null): boolean {
  return !classId || classId === 'adventurer' || classId === 'novice';
}

export function computeExpRequiredForLevel(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  if (safeLevel < 15) {
    return Math.round(80 * Math.pow(safeLevel, 1.45) + 40);
  }
  if (safeLevel < 35) {
    return Math.round(140 * Math.pow(safeLevel, 1.58) + 250);
  }
  if (safeLevel < 60) {
    return Math.round(220 * Math.pow(safeLevel, 1.7) + 900);
  }
  if (safeLevel < 90) {
    return Math.round(320 * Math.pow(safeLevel, 1.82) + 2800);
  }
  return Math.round(450 * Math.pow(safeLevel, 1.92) + 8000);
}

export const CLASS_EVOLUTION_MILESTONES: ClassEvolutionStage[] = [
  {
    tier: 0,
    stageName: 'Nhà Thám Hiểm (Adventurer)',
    requiredLevel: 1,
    titlesByClass: { adventurer: 'Adventurer', novice: 'Adventurer' },
    statBonusPct: 0,
    unlockedSkillTier: 0,
  },
  {
    tier: 1,
    stageName: 'Thức Tỉnh Chức Nghiệp Lần 1 (First Job Awakening)',
    requiredLevel: 15,
    requiresDungeon: 'dungeon_sanctum_of_awakening',
    requiresQuest: 'QUEST_JOB_05_DESTINY',
    titlesByClass: {
      swordsman: 'Swordsman',
      spearman: 'Spearman',
      knight: 'Knight',
      monk: 'Monk',
      mage: 'Mage',
      assassin: 'Assassin',
      fighter: 'Fighter',
      archer: 'Archer',
    },
    statBonusPct: 15,
    unlockedSkillTier: 1,
  },
  {
    tier: 2,
    stageName: 'Chuyển Chức Lần 2 (Second Job Advancement)',
    requiredLevel: 60,
    titlesByClass: {
      swordsman: 'Blazing Warrior',
      spearman: 'Wind Lancer',
      knight: 'Divine Paladin',
      monk: 'Holy Priest',
      mage: 'Arcane Wizard',
      assassin: 'Shadow Phantom',
      fighter: 'Titan Champion',
      archer: 'Celestial Ranger',
    },
    statBonusPct: 35,
    unlockedSkillTier: 2,
  },
  {
    tier: 3,
    stageName: 'Chuyển Chức Lần 3 (Grand Paragon)',
    requiredLevel: 120,
    titlesByClass: {
      swordsman: 'Sword Saint',
      spearman: 'Sky Halberdier',
      knight: 'Aegis Sovereign',
      monk: 'Saint Oracle',
      mage: 'Astral Sage',
      assassin: 'Nightmare Blade',
      fighter: 'Asura Brawler',
      archer: 'Celestial Ranger',
    },
    statBonusPct: 60,
    unlockedSkillTier: 3,
  },
  {
    tier: 4,
    stageName: 'Thức Tỉnh Huyền Thoại (Transcendent)',
    requiredLevel: 200,
    titlesByClass: {
      swordsman: 'Eternal Bladelord',
      spearman: 'Mythic Valkyrie Lancer',
      knight: 'Celestial Templar',
      monk: 'Seraphic Hierophant',
      mage: 'Void Archon',
      assassin: 'Abyssal Phantom',
      fighter: 'Immortal Martial God',
      archer: 'Starfall Sovereign',
    },
    statBonusPct: 100,
    unlockedSkillTier: 4,
  },
];

export const FIRST_JOB_STARTER_GEAR: Record<
  FirstJobClassId,
  {
    weapon: { itemId: string; name: string; atkBonus: number; weaponType: string };
    armor: { itemId: string; name: string; defBonus: number };
  }
> = {
  swordsman: {
    weapon: { itemId: 'ITEM_SWORD_AWAKENED_BLADE', name: 'Kiếm Thức Tỉnh Elysia', atkBonus: 34, weaponType: 'sword' },
    armor: { itemId: 'ITEM_ARMOR_SWORDSMAN_PLATE', name: 'Chiến Giáp Kiếm Sĩ', defBonus: 20 },
  },
  spearman: {
    weapon: { itemId: 'ITEM_SPEAR_IRON', name: 'Thương Sắt Hộ Vệ', atkBonus: 33, weaponType: 'spear' },
    armor: { itemId: 'ITEM_ARMOR_SPEARMAN_MAIL', name: 'Giáp Xích Thương Thủ', defBonus: 18 },
  },
  knight: {
    weapon: { itemId: 'ITEM_SHIELD_IRON', name: 'Kiếm & Khiên Thép Hiệp Sĩ', atkBonus: 22, weaponType: 'shield' },
    armor: { itemId: 'ITEM_ARMOR_KNIGHT_AEGIS', name: 'Trọng Giáp Hộ Vệ', defBonus: 32 },
  },
  monk: {
    weapon: { itemId: 'ITEM_STAFF_SANCTUM_ORB', name: 'Thánh Trượng Ánh Sáng', atkBonus: 30, weaponType: 'holy_staff' },
    armor: { itemId: 'ITEM_ARMOR_MONK_VESTMENT', name: 'Thánh Bào Tu Sĩ', defBonus: 22 },
  },
  mage: {
    weapon: { itemId: 'ITEM_SPELLBOOK_ARCANE', name: 'Ma Đạo Thư Cổ Đại', atkBonus: 36, weaponType: 'spellbook' },
    armor: { itemId: 'ITEM_ARMOR_MAGE_ROBE', name: 'Pháp Bào Tinh Tú', defBonus: 14 },
  },
  assassin: {
    weapon: { itemId: 'ITEM_DAGGER_HUNTER', name: 'Song Chủy Thủ Ảnh Sát', atkBonus: 35, weaponType: 'dual_daggers' },
    armor: { itemId: 'ITEM_ARMOR_ASSASSIN_GARB', name: 'Dạ Hành Y Thích Khách', defBonus: 16 },
  },
  fighter: {
    weapon: { itemId: 'ITEM_GAUNTLET_IRON_FIST', name: 'Hộ Thủ Thiết Quyền', atkBonus: 34, weaponType: 'gauntlets' },
    armor: { itemId: 'ITEM_ARMOR_FIGHTER_GI', name: 'Võ Phục Thiết Thân', defBonus: 22 },
  },
  archer: {
    weapon: { itemId: 'ITEM_BOW_RANGER', name: 'Trường Cung Phong Linh', atkBonus: 34, weaponType: 'bow' },
    armor: { itemId: 'ITEM_ARMOR_ARCHER_TUNIC', name: 'Giáp Da Xạ Thủ', defBonus: 17 },
  },
};

export const SECOND_JOB_SPECIALIZATIONS: SecondJobSpecialization[] = [
  {
    id: 'blazing_warrior',
    baseClassId: 'swordsman',
    name: 'Blazing Warrior',
    nameVi: 'Chiến Binh Hỏa Long',
    orientation: 'Sát thương vật lý, combo hỏa kiếm',
    weaponProficiency: ['sword', 'greatsword'],
    requiredLevel: 60,
    bonusStatsPct: 35,
    accentColor: '#f97316',
    description: 'Tiến hóa tối thượng từ Kiếm Sĩ, kết hợp liên hoàn trảm kích với hỏa diễm bạo liệt.',
  },
  {
    id: 'wind_lancer',
    baseClassId: 'spearman',
    name: 'Wind Lancer',
    nameVi: 'Thương Kỵ Phong',
    orientation: 'Tấn công tầm xa bằng thương, xuyên mục tiêu',
    weaponProficiency: ['spear', 'halberd', 'lance'],
    requiredLevel: 60,
    bonusStatsPct: 35,
    accentColor: '#22d3ee',
    description: 'Tiến hóa từ Thương Thủ, xoay chuyển phong thương xuyên thấu hàng ngũ kẻ địch.',
  },
  {
    id: 'divine_paladin',
    baseClassId: 'knight',
    name: 'Divine Paladin',
    nameVi: 'Thánh Kỵ Sĩ',
    orientation: 'Phòng thủ, bảo hộ, thánh quang',
    weaponProficiency: ['sword', 'shield', 'lance'],
    requiredLevel: 60,
    bonusStatsPct: 35,
    accentColor: '#facc15',
    description: 'Tiến hóa từ Hiệp Sĩ, triệu hồi khiên thánh quang che chở toàn bộ đồng đội.',
  },
  {
    id: 'holy_priest',
    baseClassId: 'monk',
    name: 'Holy Priest',
    nameVi: 'Thánh Linh Mục',
    orientation: 'Hồi phục, buff, hỗ trợ tổ đội',
    weaponProficiency: ['staff', 'holy_staff', 'spellbook'],
    requiredLevel: 60,
    bonusStatsPct: 35,
    accentColor: '#fef08a',
    description: 'Tiến hóa từ Tu Sĩ, ban phước thánh linh thanh tẩy và hồi sinh sinh lực cho đồng minh.',
  },
  {
    id: 'arcane_wizard',
    baseClassId: 'mage',
    name: 'Arcane Wizard',
    nameVi: 'Đại Pháp Sư',
    orientation: 'Nguyên tố, sát thương phép hủy diệt',
    weaponProficiency: ['staff', 'spellbook', 'book'],
    requiredLevel: 60,
    bonusStatsPct: 35,
    accentColor: '#818cf8',
    description: 'Tiến hóa từ Pháp Sư, làm chủ nguyên tố cổ đại thi triển đại ma pháp diện rộng.',
  },
  {
    id: 'shadow_phantom',
    baseClassId: 'assassin',
    name: 'Shadow Phantom',
    nameVi: 'Ảnh Sát',
    orientation: 'Ẩn thân, ám sát, bạo kích chí mạng',
    weaponProficiency: ['dual_daggers', 'dagger'],
    requiredLevel: 60,
    bonusStatsPct: 35,
    accentColor: '#a855f7',
    description: 'Tiến hóa từ Thích Khách, ẩn mình trong bóng tối kết liễu mục tiêu bằng bạo kích tức thời.',
  },
  {
    id: 'titan_champion',
    baseClassId: 'fighter',
    name: 'Titan Champion',
    nameVi: 'Chiến Binh Titan',
    orientation: 'Sức mạnh, combo cận chiến, khống chế',
    weaponProficiency: ['gauntlets', 'fist', 'sword'],
    requiredLevel: 60,
    bonusStatsPct: 35,
    accentColor: '#ef4444',
    description: 'Tiến hóa từ Đấu Sĩ, phóng thích quyền kình địa chấn trấn áp toàn bộ chiến trường.',
  },
  {
    id: 'celestial_ranger',
    baseClassId: 'archer',
    name: 'Celestial Ranger',
    nameVi: 'Thiên Không Du Hiệp',
    orientation: 'Cung thuật, xuyên giáp, bắn nhiều mục tiêu',
    weaponProficiency: ['bow', 'crossbow'],
    requiredLevel: 60,
    bonusStatsPct: 35,
    accentColor: '#34d399',
    description: 'Tiến hóa từ Cung Thủ, trút mưa tiễn tinh quang xuyên giáp từ khoảng cách cực xa.',
  },
];

export const STAT_ALLOCATION_RULES = {
  maxBonusPoints: 10,
  maxPerStat: 30,
  minPerStat: 1,
};

export const INITIAL_CLASSES: ClassDefinition[] = [
  {
    id: 'adventurer',
    name: 'Nhà Thám Hiểm (Adventurer)',
    nameVi: 'Nhà Thám Hiểm',
    role: 'Nghề Tạm Thời (Lv.1–15)',
    description: 'Xuất phát điểm của mọi mạo hiểm giả tại Elysia. Phân bổ 5 chỉ số cơ bản để Thánh Điện tự động thức tỉnh nghề nghiệp ở cấp 15.',
    isPreJob: true,
    baseStats: { str: 10, dex: 10, agi: 10, int: 10, con: 10 },
    weaponProficiency: ['sword', 'dagger', 'bow', 'staff'],
    allowedWeapons: ['sword', 'dagger', 'bow', 'staff'],
    armorProficiency: ['cloth', 'leather'],
    startingSkills: ['SKILL_NOVICE_SLASH', 'SKILL_NOVICE_FIREBALL'],
    artworkUrl: '/assets/elysia/ui/paperdoll-player.png',
    weaponArtworkUrl: '/assets/elysia/ui/portrait-player.png',
  },
  {
    id: 'swordsman',
    name: 'Kiếm Sĩ (Swordsman)',
    nameVi: 'Kiếm Sĩ',
    role: 'Chiến Binh Kiếm Thuật Cận Chiến',
    description: 'Lấy Sức Mạnh (STR) làm chủ đạo và Khéo Léo (DEX) để tung những nhát chém chuẩn xác uy lực.',
    primaryAttribute: 'str',
    secondaryAttribute: 'dex',
    classificationMultiplier: { primary: 2, secondary: 1 },
    priorityRank: 1,
    baseStats: { str: 15, dex: 12, agi: 10, int: 8, con: 12 },
    weaponProficiency: ['sword', 'greatsword'],
    allowedWeapons: ['sword', 'greatsword'],
    armorProficiency: ['leather', 'mail', 'plate'],
    startingSkills: ['skill_slash', 'skill_double_strike', 'skill_sword_mastery'],
    starterEquipment: { weaponItemId: 'ITEM_SWORD_AWAKENED_BLADE', armorItemId: 'ITEM_ARMOR_SWORDSMAN_PLATE' },
    artworkUrl: '/assets/elysia/ui/paperdoll-player.png',
    weaponArtworkUrl: '/assets/elysia/ui/portrait-player.png',
  },
  {
    id: 'spearman',
    name: 'Thương Thủ (Spearman)',
    nameVi: 'Thương Thủ',
    role: 'Xung Phong Cơ Động & Khống Chế',
    description: 'Kết hợp Nhanh Nhẹn (AGI) vượt trội cùng Sức Mạnh (STR) để xoay chuyển ngọn thương tầm dài.',
    primaryAttribute: 'agi',
    secondaryAttribute: 'str',
    classificationMultiplier: { primary: 2, secondary: 1 },
    priorityRank: 2,
    baseStats: { str: 13, dex: 10, agi: 16, int: 8, con: 11 },
    weaponProficiency: ['spear', 'halberd', 'lance'],
    allowedWeapons: ['spear', 'halberd', 'lance'],
    armorProficiency: ['leather', 'mail'],
    startingSkills: ['skill_spear_thrust', 'skill_triple_pierce', 'skill_spear_mastery'],
    starterEquipment: { weaponItemId: 'ITEM_SPEAR_IRON', armorItemId: 'ITEM_ARMOR_SPEARMAN_MAIL' },
    artworkUrl: '/assets/elysia/ui/paperdoll-player.png',
    weaponArtworkUrl: '/assets/elysia/ui/portrait-player.png',
  },
  {
    id: 'knight',
    name: 'Hiệp Sĩ (Knight)',
    nameVi: 'Hiệp Sĩ',
    role: 'Hộ Vệ & Lá Chắn Bất Bại',
    description: 'Rèn luyện Thể Chất (CON) kiên cố kết hợp Sức Mạnh (STR) để bảo vệ đồng đội bằng kiếm và khiên.',
    primaryAttribute: 'con',
    secondaryAttribute: 'str',
    classificationMultiplier: { primary: 2, secondary: 1 },
    priorityRank: 3,
    baseStats: { str: 13, dex: 8, agi: 8, int: 9, con: 18 },
    weaponProficiency: ['sword', 'shield'],
    allowedWeapons: ['sword', 'shield'],
    armorProficiency: ['mail', 'plate'],
    startingSkills: ['skill_shield_bash', 'skill_taunt', 'skill_shield_mastery'],
    starterEquipment: { weaponItemId: 'ITEM_SHIELD_IRON', armorItemId: 'ITEM_ARMOR_KNIGHT_AEGIS' },
    artworkUrl: '/assets/elysia/ui/paperdoll-player.png',
    weaponArtworkUrl: '/assets/elysia/ui/portrait-player.png',
  },
  {
    id: 'monk',
    name: 'Tu Sĩ (Monk)',
    nameVi: 'Tu Sĩ',
    role: 'Thánh Hộ, Trị Liệu & Kháng Phép',
    description: 'Thân thể bền bỉ (CON) hòa quyện cùng Trí Tuệ thánh linh (INT) để chữa lành và thanh tẩy.',
    primaryAttribute: 'con',
    secondaryAttribute: 'int',
    classificationMultiplier: { primary: 2, secondary: 1 },
    priorityRank: 4,
    baseStats: { str: 8, dex: 9, agi: 9, int: 14, con: 17 },
    weaponProficiency: ['staff', 'holy_staff'],
    allowedWeapons: ['staff', 'holy_staff'],
    armorProficiency: ['cloth', 'leather'],
    startingSkills: ['skill_holy_light', 'skill_heal', 'skill_faith'],
    starterEquipment: { weaponItemId: 'ITEM_STAFF_SANCTUM_ORB', armorItemId: 'ITEM_ARMOR_MONK_VESTMENT' },
    artworkUrl: '/assets/elysia/ui/paperdoll-player.png',
    weaponArtworkUrl: '/assets/elysia/ui/portrait-player.png',
  },
  {
    id: 'mage',
    name: 'Pháp Sư (Mage)',
    nameVi: 'Pháp Sư',
    role: 'Chủ Tể Nguyên Tố Diện Rộng',
    description: 'Trí Tuệ uyên bác (INT) và độ tinh tế Khéo Léo (DEX) giúp thi triển ma pháp hủy diệt diện rộng.',
    primaryAttribute: 'int',
    secondaryAttribute: 'dex',
    classificationMultiplier: { primary: 2, secondary: 1 },
    priorityRank: 5,
    baseStats: { str: 6, dex: 12, agi: 8, int: 18, con: 8 },
    weaponProficiency: ['spellbook', 'book', 'staff'],
    allowedWeapons: ['spellbook', 'book', 'staff'],
    armorProficiency: ['cloth'],
    startingSkills: ['skill_fireball', 'skill_ice_lance', 'skill_magic_mastery'],
    starterEquipment: { weaponItemId: 'ITEM_SPELLBOOK_ARCANE', armorItemId: 'ITEM_ARMOR_MAGE_ROBE' },
    artworkUrl: '/assets/elysia/ui/paperdoll-player.png',
    weaponArtworkUrl: '/assets/elysia/ui/portrait-player.png',
  },
  {
    id: 'assassin',
    name: 'Thích Khách (Assassin)',
    nameVi: 'Thích Khách',
    role: 'Bạo Kích Chớp Nhoáng & Ám Sát',
    description: 'Nhanh Nhẹn (AGI) cực đỉnh kết hợp Khéo Léo (DEX) để ra đòn chí mạng bằng Song Chủy Thủ.',
    primaryAttribute: 'agi',
    secondaryAttribute: 'dex',
    classificationMultiplier: { primary: 2, secondary: 1 },
    priorityRank: 6,
    baseStats: { str: 10, dex: 15, agi: 17, int: 8, con: 8 },
    weaponProficiency: ['dual_daggers', 'dagger'],
    allowedWeapons: ['dual_daggers', 'dagger'],
    armorProficiency: ['cloth', 'leather'],
    startingSkills: ['skill_shadow_strike', 'skill_double_dagger', 'skill_critical_mastery'],
    starterEquipment: { weaponItemId: 'ITEM_DAGGER_HUNTER', armorItemId: 'ITEM_ARMOR_ASSASSIN_GARB' },
    artworkUrl: '/assets/elysia/ui/paperdoll-player.png',
    weaponArtworkUrl: '/assets/elysia/ui/portrait-player.png',
  },
  {
    id: 'fighter',
    name: 'Đấu Sĩ (Fighter)',
    nameVi: 'Đấu Sĩ',
    role: 'Quyền Thuật Bá Đạo & Sinh Tồn',
    description: 'Sức Mạnh cơ bắp (STR) và Thể Chất sắt thép (CON) tạo nên đấu sĩ cận chiến bất khuất.',
    primaryAttribute: 'str',
    secondaryAttribute: 'con',
    classificationMultiplier: { primary: 2, secondary: 1 },
    priorityRank: 7,
    baseStats: { str: 16, dex: 10, agi: 10, int: 6, con: 15 },
    weaponProficiency: ['gauntlets', 'fist'],
    allowedWeapons: ['gauntlets', 'fist'],
    armorProficiency: ['leather', 'mail'],
    startingSkills: ['skill_iron_fist', 'skill_heavy_punch', 'skill_body_conditioning'],
    starterEquipment: { weaponItemId: 'ITEM_GAUNTLET_IRON_FIST', armorItemId: 'ITEM_ARMOR_FIGHTER_GI' },
    artworkUrl: '/assets/elysia/ui/paperdoll-player.png',
    weaponArtworkUrl: '/assets/elysia/ui/portrait-player.png',
  },
  {
    id: 'archer',
    name: 'Cung Thủ (Archer)',
    nameVi: 'Cung Thủ',
    role: 'Xạ Thủ Tầm Xa & Bắn Tỉa',
    description: 'Khéo Léo chuẩn xác (DEX) hòa cùng Nhanh Nhẹn (AGI) để bách phát bách trúng bằng Cung và Nỏ.',
    primaryAttribute: 'dex',
    secondaryAttribute: 'agi',
    classificationMultiplier: { primary: 2, secondary: 1 },
    priorityRank: 8,
    baseStats: { str: 10, dex: 17, agi: 15, int: 8, con: 9 },
    weaponProficiency: ['bow', 'crossbow'],
    allowedWeapons: ['bow', 'crossbow'],
    armorProficiency: ['cloth', 'leather'],
    startingSkills: ['skill_precise_shot', 'skill_double_arrow', 'skill_eagle_eye'],
    starterEquipment: { weaponItemId: 'ITEM_BOW_RANGER', armorItemId: 'ITEM_ARMOR_ARCHER_TUNIC' },
    artworkUrl: '/assets/elysia/ui/paperdoll-player.png',
    weaponArtworkUrl: '/assets/elysia/ui/portrait-player.png',
  },
];

/**
 * Deterministic server-authoritative automatic Job Classification formula:
 * JobScore = (Primary Base Stat * primaryMultiplier) + (Secondary Base Stat * secondaryMultiplier)
 * Ties break strictly by: Higher Score -> Higher Primary -> Higher Secondary -> Server Class Priority Rank.
 */
export function classifyJobFromBaseStats(
  baseStats: PrimaryAttributes,
  classDefs: ClassDefinition[] = INITIAL_CLASSES
): { assignedClassId: FirstJobClassId; scores: JobScoreBreakdown[] } {
  const safeStats: PrimaryAttributes = {
    str: Math.max(0, Number(baseStats?.str ?? 10)),
    dex: Math.max(0, Number(baseStats?.dex ?? 10)),
    agi: Math.max(0, Number(baseStats?.agi ?? 10)),
    int: Math.max(0, Number(baseStats?.int ?? 10)),
    con: Math.max(0, Number(baseStats?.con ?? 10)),
  };

  const candidates = classDefs.filter(
    (c) => !c.isPreJob && FIRST_JOB_CLASS_IDS.includes(c.id as FirstJobClassId) && c.primaryAttribute && c.secondaryAttribute
  );
  const source = candidates.length === FIRST_JOB_CLASS_IDS.length
    ? candidates
    : INITIAL_CLASSES.filter((c) => !c.isPreJob);

  const scores: JobScoreBreakdown[] = source.map((cls) => {
    const primaryAttr = (cls.primaryAttribute || 'str') as AttributeKey;
    const secondaryAttr = (cls.secondaryAttribute || 'dex') as AttributeKey;
    const pMult = Number(cls.classificationMultiplier?.primary ?? 2);
    const sMult = Number(cls.classificationMultiplier?.secondary ?? 1);
    const pVal = safeStats[primaryAttr];
    const sVal = safeStats[secondaryAttr];
    const priorityRank = Number(cls.priorityRank ?? (FIRST_JOB_CLASS_IDS.indexOf(cls.id as FirstJobClassId) + 1));

    return {
      classId: cls.id as FirstJobClassId,
      className: cls.name,
      primaryAttribute: primaryAttr,
      secondaryAttribute: secondaryAttr,
      primaryValue: pVal,
      secondaryValue: sVal,
      primaryMultiplier: pMult,
      secondaryMultiplier: sMult,
      score: pVal * pMult + sVal * sMult,
      priorityRank,
    };
  });

  scores.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.primaryValue !== a.primaryValue) return b.primaryValue - a.primaryValue;
    if (b.secondaryValue !== a.secondaryValue) return b.secondaryValue - a.secondaryValue;
    return a.priorityRank - b.priorityRank;
  });

  return {
    assignedClassId: scores[0].classId,
    scores,
  };
}

export const INITIAL_MONSTERS: any[] = [
  {
    id: 'MONSTER_GREEN_SLIME',
    name: 'Slime Xanh (Green Slime)',
    level: 1,
    hp: 102,
    atk: 14,
    def: 6,
    exp: 30,
    gold: 10,
    region: 'FIELD_EAST',
  },
];

export * from './worldPlacementValidator.js';
