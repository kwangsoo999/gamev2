import {
  ClassId,
  CraftingRecipe,
  ElementType,
  EquipmentSetDefinition,
  EquipmentSlotId,
  FirstJobClassId,
  ItemEntity,
  ItemRarity,
  SetBonusStats,
  SetBonusTier,
  SetFragmentConfig,
} from '@elysia/game-types';
import { RARITY_CONFIGS, normalizeEquipSlot } from './rarityAndSlots.js';

interface ClassSetTierSeed {
  setId: string;
  name: string;
  nameVi: string;
  classId: FirstJobClassId;
  tierLevel: 15 | 35 | 60;
  rarity: ItemRarity;
  element: ElementType;
  weaponSubtype: string;
  weaponTitle: string;
  altWeaponSubtype?: string;
  isMagical: boolean;
  isTank: boolean;
  awakeningWeaponId?: string;
  awakeningArmorId?: string;
  fragmentId: string;
  bonuses2: SetBonusStats;
  bonuses4: SetBonusStats;
  bonuses6: SetBonusStats;
}

const CLASS_SET_SEEDS: ClassSetTierSeed[] = [
  // SWORDSMAN
  {
    setId: 'set_swordsman_apprentice_blade',
    name: 'Apprentice Blade Set Lv.15',
    nameVi: 'Bộ Kiếm Tập Sự Lv.15',
    classId: 'swordsman',
    tierLevel: 15,
    rarity: 'uncommon',
    element: 'neutral',
    weaponSubtype: 'sword',
    weaponTitle: 'Kiếm Thức Tỉnh Elysia',
    awakeningWeaponId: 'ITEM_SWORD_AWAKENED_BLADE',
    awakeningArmorId: 'ITEM_ARMOR_SWORDSMAN_PLATE',
    fragmentId: 'FRAG_APPRENTICE_SET',
    isMagical: false,
    isTank: false,
    bonuses2: { atk: 18, str: 3 },
    bonuses4: { maxHp: 220, critRatePct: 6, def: 14 },
    bonuses6: { atk: 42, skillDamagePct: 16, aspdPct: 10 },
  },
  {
    setId: 'set_swordsman_blazing_warrior',
    name: 'Blazing Warrior Set Lv.35',
    nameVi: 'Bộ Chiến Binh Rực Lửa Lv.35',
    classId: 'swordsman',
    tierLevel: 35,
    rarity: 'rare',
    element: 'fire',
    weaponSubtype: 'greatsword',
    weaponTitle: 'Đại Kiếm Liệt Hỏa',
    fragmentId: 'FRAG_TIER2_ELITE_SET',
    isMagical: false,
    isTank: false,
    bonuses2: { atk: 38, str: 6 },
    bonuses4: { maxHp: 520, critRatePct: 10, def: 32 },
    bonuses6: { atk: 88, skillDamagePct: 24, critDamagePct: 25 },
  },
  {
    setId: 'set_swordsman_dragon_slayer',
    name: 'Dragon Slayer Set Lv.60',
    nameVi: 'Bộ Đồ Long Kiếm Sĩ Lv.60',
    classId: 'swordsman',
    tierLevel: 60,
    rarity: 'epic',
    element: 'fire',
    weaponSubtype: 'greatsword',
    weaponTitle: 'Thánh Kiếm Đồ Long',
    fragmentId: 'FRAG_TIER3_DRAGON_SET',
    isMagical: false,
    isTank: false,
    bonuses2: { atk: 75, str: 12 },
    bonuses4: { maxHp: 1100, critRatePct: 14, def: 65 },
    bonuses6: { atk: 165, skillDamagePct: 35, critDamagePct: 40, lifestealPct: 6 },
  },

  // SPEARMAN
  {
    setId: 'set_spearman_apprentice_spear',
    name: 'Apprentice Spear Set Lv.15',
    nameVi: 'Bộ Thương Tập Sự Lv.15',
    classId: 'spearman',
    tierLevel: 15,
    rarity: 'uncommon',
    element: 'wind',
    weaponSubtype: 'spear',
    weaponTitle: 'Thương Sắt Hộ Vệ',
    awakeningWeaponId: 'ITEM_SPEAR_IRON',
    awakeningArmorId: 'ITEM_ARMOR_SPEARMAN_MAIL',
    fragmentId: 'FRAG_APPRENTICE_SET',
    isMagical: false,
    isTank: false,
    bonuses2: { atk: 17, agi: 3 },
    bonuses4: { aspdPct: 10, moveSpeedPct: 8, maxHp: 180 },
    bonuses6: { atk: 40, critRatePct: 9, skillDamagePct: 16 },
  },
  {
    setId: 'set_spearman_wind_lancer',
    name: 'Wind Lancer Set Lv.35',
    nameVi: 'Bộ Phong Kỵ Thương Lv.35',
    classId: 'spearman',
    tierLevel: 35,
    rarity: 'rare',
    element: 'wind',
    weaponSubtype: 'halberd',
    weaponTitle: 'Phong Thần Kích',
    fragmentId: 'FRAG_TIER2_ELITE_SET',
    isMagical: false,
    isTank: false,
    bonuses2: { atk: 36, agi: 6 },
    bonuses4: { aspdPct: 15, moveSpeedPct: 12, maxHp: 460 },
    bonuses6: { atk: 84, critRatePct: 14, skillDamagePct: 24 },
  },
  {
    setId: 'set_spearman_dragon_vanguard',
    name: 'Dragon Vanguard Set Lv.60',
    nameVi: 'Bộ Long Kỵ Tiên Phong Lv.60',
    classId: 'spearman',
    tierLevel: 60,
    rarity: 'epic',
    element: 'wind',
    weaponSubtype: 'lance',
    weaponTitle: 'Thiên Long Trọng Thương',
    fragmentId: 'FRAG_TIER3_DRAGON_SET',
    isMagical: false,
    isTank: false,
    bonuses2: { atk: 72, agi: 12 },
    bonuses4: { aspdPct: 22, moveSpeedPct: 16, maxHp: 980 },
    bonuses6: { atk: 160, critRatePct: 18, critDamagePct: 35, skillDamagePct: 34 },
  },

  // KNIGHT
  {
    setId: 'set_knight_apprentice_guard',
    name: 'Apprentice Guard Set Lv.15',
    nameVi: 'Bộ Hộ Vệ Tập Sự Lv.15',
    classId: 'knight',
    tierLevel: 15,
    rarity: 'uncommon',
    element: 'earth',
    weaponSubtype: 'shield',
    weaponTitle: 'Kiếm & Khiên Thép Hiệp Sĩ',
    awakeningWeaponId: 'ITEM_SHIELD_IRON',
    awakeningArmorId: 'ITEM_ARMOR_KNIGHT_AEGIS',
    fragmentId: 'FRAG_APPRENTICE_SET',
    isMagical: false,
    isTank: true,
    bonuses2: { def: 22, con: 4 },
    bonuses4: { maxHp: 350, mdef: 18, damageReductionPct: 5 },
    bonuses6: { def: 48, atk: 28, maxHp: 500, damageReductionPct: 8 },
  },
  {
    setId: 'set_knight_fortress_knight',
    name: 'Fortress Knight Set Lv.35',
    nameVi: 'Bộ Pháo Đài Hiệp Sĩ Lv.35',
    classId: 'knight',
    tierLevel: 35,
    rarity: 'rare',
    element: 'earth',
    weaponSubtype: 'shield',
    weaponTitle: 'Đại Khiên Pháo Đài',
    fragmentId: 'FRAG_TIER2_ELITE_SET',
    isMagical: false,
    isTank: true,
    bonuses2: { def: 48, con: 8 },
    bonuses4: { maxHp: 850, mdef: 42, damageReductionPct: 8 },
    bonuses6: { def: 105, atk: 62, maxHp: 1100, damageReductionPct: 12 },
  },
  {
    setId: 'set_knight_divine_paladin',
    name: 'Divine Paladin Set Lv.60',
    nameVi: 'Bộ Thánh Kỵ Sĩ Thần Quang Lv.60',
    classId: 'knight',
    tierLevel: 60,
    rarity: 'epic',
    element: 'holy',
    weaponSubtype: 'sword',
    weaponTitle: 'Thánh Kiếm Quang Minh Aegis',
    fragmentId: 'FRAG_TIER3_DRAGON_SET',
    isMagical: false,
    isTank: true,
    bonuses2: { def: 95, con: 14 },
    bonuses4: { maxHp: 1850, mdef: 85, damageReductionPct: 12 },
    bonuses6: { def: 195, atk: 120, maxHp: 2200, damageReductionPct: 16, skillDamagePct: 24 },
  },

  // MONK
  {
    setId: 'set_monk_apprentice_cleric',
    name: 'Apprentice Cleric Set Lv.15',
    nameVi: 'Bộ Tu Sĩ Tập Sự Lv.15',
    classId: 'monk',
    tierLevel: 15,
    rarity: 'uncommon',
    element: 'holy',
    weaponSubtype: 'holy_staff',
    weaponTitle: 'Thánh Trượng Ánh Sáng',
    awakeningWeaponId: 'ITEM_STAFF_SANCTUM_ORB',
    awakeningArmorId: 'ITEM_ARMOR_MONK_VESTMENT',
    fragmentId: 'FRAG_APPRENTICE_SET',
    isMagical: true,
    isTank: true,
    bonuses2: { matk: 18, con: 3 },
    bonuses4: { maxHp: 240, maxMp: 160, healingPowerPct: 14 },
    bonuses6: { matk: 36, def: 28, healingPowerPct: 24, skillDamagePct: 12 },
  },
  {
    setId: 'set_monk_holy_priest',
    name: 'Holy Priest Set Lv.35',
    nameVi: 'Bộ Thánh Tư Tế Lv.35',
    classId: 'monk',
    tierLevel: 35,
    rarity: 'rare',
    element: 'holy',
    weaponSubtype: 'holy_staff',
    weaponTitle: 'Quyền Trượng Thiên Ân',
    fragmentId: 'FRAG_TIER2_ELITE_SET',
    isMagical: true,
    isTank: true,
    bonuses2: { matk: 38, con: 6 },
    bonuses4: { maxHp: 600, maxMp: 380, healingPowerPct: 22 },
    bonuses6: { matk: 78, def: 62, healingPowerPct: 35, damageReductionPct: 8 },
  },
  {
    setId: 'set_monk_saint_guardian',
    name: 'Saint Guardian Set Lv.60',
    nameVi: 'Bộ Thánh Hộ Giả Lv.60',
    classId: 'monk',
    tierLevel: 60,
    rarity: 'epic',
    element: 'holy',
    weaponSubtype: 'staff',
    weaponTitle: 'Thần Trượng Seraphim',
    fragmentId: 'FRAG_TIER3_DRAGON_SET',
    isMagical: true,
    isTank: true,
    bonuses2: { matk: 78, con: 12 },
    bonuses4: { maxHp: 1350, maxMp: 750, healingPowerPct: 32 },
    bonuses6: { matk: 155, def: 125, healingPowerPct: 50, damageReductionPct: 12, skillDamagePct: 25 },
  },

  // MAGE
  {
    setId: 'set_mage_apprentice_mage',
    name: 'Apprentice Mage Set Lv.15',
    nameVi: 'Bộ Học Giả Ma Pháp Lv.15',
    classId: 'mage',
    tierLevel: 15,
    rarity: 'uncommon',
    element: 'fire',
    weaponSubtype: 'spellbook',
    weaponTitle: 'Ma Đạo Thư Cổ Đại',
    awakeningWeaponId: 'ITEM_SPELLBOOK_ARCANE',
    awakeningArmorId: 'ITEM_ARMOR_MAGE_ROBE',
    fragmentId: 'FRAG_APPRENTICE_SET',
    isMagical: true,
    isTank: false,
    bonuses2: { matk: 20, int: 4 },
    bonuses4: { maxMp: 220, critRatePct: 6, mdef: 15 },
    bonuses6: { matk: 48, skillDamagePct: 18, critDamagePct: 20 },
  },
  {
    setId: 'set_mage_arcane_wizard',
    name: 'Arcane Wizard Set Lv.35',
    nameVi: 'Bộ Bí Thuật Sư Lv.35',
    classId: 'mage',
    tierLevel: 35,
    rarity: 'rare',
    element: 'neutral',
    weaponSubtype: 'staff',
    weaponTitle: 'Pháp Trượng Tinh Vân',
    fragmentId: 'FRAG_TIER2_ELITE_SET',
    isMagical: true,
    isTank: false,
    bonuses2: { matk: 44, int: 8 },
    bonuses4: { maxMp: 520, critRatePct: 10, mdef: 36 },
    bonuses6: { matk: 98, skillDamagePct: 28, critDamagePct: 30 },
  },
  {
    setId: 'set_mage_elemental_sovereign',
    name: 'Elemental Sovereign Set Lv.60',
    nameVi: 'Bộ Nguyên Tố Chúa Tể Lv.60',
    classId: 'mage',
    tierLevel: 60,
    rarity: 'epic',
    element: 'fire',
    weaponSubtype: 'spellbook',
    weaponTitle: 'Cấm Thư Chúa Tể Nguyên Tố',
    fragmentId: 'FRAG_TIER3_DRAGON_SET',
    isMagical: true,
    isTank: false,
    bonuses2: { matk: 88, int: 14 },
    bonuses4: { maxMp: 1100, critRatePct: 15, mdef: 72 },
    bonuses6: { matk: 185, skillDamagePct: 40, critDamagePct: 45 },
  },

  // ASSASSIN
  {
    setId: 'set_assassin_apprentice_rogue',
    name: 'Apprentice Rogue Set Lv.15',
    nameVi: 'Bộ Đạo Tặc Tập Sự Lv.15',
    classId: 'assassin',
    tierLevel: 15,
    rarity: 'uncommon',
    element: 'shadow',
    weaponSubtype: 'dual_daggers',
    weaponTitle: 'Song Chủy Thủ Ảnh Sát',
    awakeningWeaponId: 'ITEM_DAGGER_HUNTER',
    awakeningArmorId: 'ITEM_ARMOR_ASSASSIN_GARB',
    fragmentId: 'FRAG_APPRENTICE_SET',
    isMagical: false,
    isTank: false,
    bonuses2: { atk: 18, agi: 4 },
    bonuses4: { critRatePct: 9, aspdPct: 12, moveSpeedPct: 8 },
    bonuses6: { atk: 42, critDamagePct: 28, lifestealPct: 5 },
  },
  {
    setId: 'set_assassin_night_stalker',
    name: 'Night Stalker Set Lv.35',
    nameVi: 'Bộ Dạ Hành Giả Lv.35',
    classId: 'assassin',
    tierLevel: 35,
    rarity: 'rare',
    element: 'shadow',
    weaponSubtype: 'dual_daggers',
    weaponTitle: 'Song Đoản Kiếm Hắc Đêm',
    fragmentId: 'FRAG_TIER2_ELITE_SET',
    isMagical: false,
    isTank: false,
    bonuses2: { atk: 38, agi: 8 },
    bonuses4: { critRatePct: 14, aspdPct: 16, moveSpeedPct: 12 },
    bonuses6: { atk: 86, critDamagePct: 42, lifestealPct: 8, skillDamagePct: 20 },
  },
  {
    setId: 'set_assassin_shadow_phantom',
    name: 'Shadow Phantom Set Lv.60',
    nameVi: 'Bộ Ảnh Hồn Tử Thần Lv.60',
    classId: 'assassin',
    tierLevel: 60,
    rarity: 'epic',
    element: 'shadow',
    weaponSubtype: 'dual_daggers',
    weaponTitle: 'Song Nhẫn Tử Thần Vô Ảnh',
    fragmentId: 'FRAG_TIER3_DRAGON_SET',
    isMagical: false,
    isTank: false,
    bonuses2: { atk: 76, agi: 14 },
    bonuses4: { critRatePct: 20, aspdPct: 22, moveSpeedPct: 16 },
    bonuses6: { atk: 168, critDamagePct: 60, lifestealPct: 10, skillDamagePct: 32 },
  },

  // FIGHTER
  {
    setId: 'set_fighter_apprentice_fighter',
    name: 'Apprentice Fighter Set Lv.15',
    nameVi: 'Bộ Võ Sĩ Tập Sự Lv.15',
    classId: 'fighter',
    tierLevel: 15,
    rarity: 'uncommon',
    element: 'earth',
    weaponSubtype: 'gauntlets',
    weaponTitle: 'Hộ Thủ Thiết Quyền',
    awakeningWeaponId: 'ITEM_GAUNTLET_IRON_FIST',
    awakeningArmorId: 'ITEM_ARMOR_FIGHTER_GI',
    fragmentId: 'FRAG_APPRENTICE_SET',
    isMagical: false,
    isTank: false,
    bonuses2: { atk: 17, con: 3 },
    bonuses4: { maxHp: 280, aspdPct: 10, def: 15 },
    bonuses6: { atk: 40, skillDamagePct: 18, lifestealPct: 5 },
  },
  {
    setId: 'set_fighter_battle_brawler',
    name: 'Battle Brawler Set Lv.35',
    nameVi: 'Bộ Cuồng Đấu Sĩ Lv.35',
    classId: 'fighter',
    tierLevel: 35,
    rarity: 'rare',
    element: 'fire',
    weaponSubtype: 'fist',
    weaponTitle: 'Thiết Quyền Liệt Dương',
    fragmentId: 'FRAG_TIER2_ELITE_SET',
    isMagical: false,
    isTank: false,
    bonuses2: { atk: 37, str: 6 },
    bonuses4: { maxHp: 650, aspdPct: 15, def: 35 },
    bonuses6: { atk: 84, skillDamagePct: 26, critDamagePct: 25, lifestealPct: 8 },
  },
  {
    setId: 'set_fighter_titan_champion',
    name: 'Titan Champion Set Lv.60',
    nameVi: 'Bộ Quán Quân Khổng Lồ Lv.60',
    classId: 'fighter',
    tierLevel: 60,
    rarity: 'epic',
    element: 'earth',
    weaponSubtype: 'gauntlets',
    weaponTitle: 'Hộ Thủ Titan Phá Thiên',
    fragmentId: 'FRAG_TIER3_DRAGON_SET',
    isMagical: false,
    isTank: false,
    bonuses2: { atk: 74, str: 12 },
    bonuses4: { maxHp: 1450, aspdPct: 20, def: 75 },
    bonuses6: { atk: 162, skillDamagePct: 36, critDamagePct: 38, lifestealPct: 10, damageReductionPct: 10 },
  },

  // ARCHER
  {
    setId: 'set_archer_apprentice_ranger',
    name: 'Apprentice Ranger Set Lv.15',
    nameVi: 'Bộ Xạ Thủ Tập Sự Lv.15',
    classId: 'archer',
    tierLevel: 15,
    rarity: 'uncommon',
    element: 'wind',
    weaponSubtype: 'bow',
    weaponTitle: 'Trường Cung Phong Linh',
    awakeningWeaponId: 'ITEM_BOW_RANGER',
    awakeningArmorId: 'ITEM_ARMOR_ARCHER_TUNIC',
    fragmentId: 'FRAG_APPRENTICE_SET',
    isMagical: false,
    isTank: false,
    bonuses2: { atk: 18, dex: 4 },
    bonuses4: { critRatePct: 8, aspdPct: 10, moveSpeedPct: 8 },
    bonuses6: { atk: 42, critDamagePct: 26, skillDamagePct: 16 },
  },
  {
    setId: 'set_archer_wind_hunter',
    name: 'Wind Hunter Set Lv.35',
    nameVi: 'Bộ Thợ Săn Gió Lv.35',
    classId: 'archer',
    tierLevel: 35,
    rarity: 'rare',
    element: 'wind',
    weaponSubtype: 'crossbow',
    weaponTitle: 'Liên Nỏ Bão Tố',
    fragmentId: 'FRAG_TIER2_ELITE_SET',
    isMagical: false,
    isTank: false,
    bonuses2: { atk: 38, dex: 7 },
    bonuses4: { critRatePct: 13, aspdPct: 15, moveSpeedPct: 12 },
    bonuses6: { atk: 88, critDamagePct: 40, skillDamagePct: 25 },
  },
  {
    setId: 'set_archer_celestial_ranger',
    name: 'Celestial Ranger Set Lv.60',
    nameVi: 'Bộ Tinh Tú Xạ Thủ Lv.60',
    classId: 'archer',
    tierLevel: 60,
    rarity: 'epic',
    element: 'holy',
    weaponSubtype: 'bow',
    weaponTitle: 'Thần Cung Tinh Tú Thiên Giới',
    fragmentId: 'FRAG_TIER3_DRAGON_SET',
    isMagical: false,
    isTank: false,
    bonuses2: { atk: 76, dex: 14 },
    bonuses4: { critRatePct: 18, aspdPct: 22, moveSpeedPct: 16 },
    bonuses6: { atk: 170, critDamagePct: 55, skillDamagePct: 35 },
  },
];

function iconForSlot(slot: EquipmentSlotId, weaponSubtype: string): string {
  if (slot === 'weapon') {
    if (weaponSubtype === 'spear' || weaponSubtype === 'halberd' || weaponSubtype === 'lance') return 'spear_iron';
    if (weaponSubtype === 'shield') return 'shield_oak';
    if (weaponSubtype === 'staff' || weaponSubtype === 'holy_staff') return 'staff_holy';
    if (weaponSubtype === 'spellbook' || weaponSubtype === 'book') return 'spellbook_arcane';
    if (weaponSubtype === 'dual_daggers' || weaponSubtype === 'dagger') return 'dual_daggers';
    if (weaponSubtype === 'gauntlets' || weaponSubtype === 'fist') return 'gauntlets_fist';
    if (weaponSubtype === 'bow' || weaponSubtype === 'crossbow') return 'bow_ranger';
    return 'sword_novice';
  }
  if (slot === 'head') return 'helm_bronze';
  if (slot === 'armor') return 'armor_plate';
  if (slot === 'gloves') return 'gloves_leather';
  if (slot === 'boots') return 'boots_leather';
  if (slot === 'shoulder') return 'armor_plate';
  if (slot === 'necklace') return 'amulet_jade';
  if (slot === 'ring1' || slot === 'ring2') return 'gem_amethyst';
  return 'tunic_explorer';
}

function slotDisplayVi(slot: EquipmentSlotId): string {
  const map: Record<EquipmentSlotId, string> = {
    weapon: 'Vũ Khí',
    head: 'Mũ Chiến',
    armor: 'Chiến Giáp',
    gloves: 'Hộ Thủ',
    boots: 'Chiến Ủng',
    shoulder: 'Vai Giáp',
    necklace: 'Dây Chuyền',
    ring1: 'Nhẫn',
    ring2: 'Nhẫn',
    cloak: 'Áo Choàng',
  };
  return map[slot];
}

function summarizeBonus(b: SetBonusStats): string {
  const parts: string[] = [];
  if (b.atk) parts.push(`+${b.atk} ATK`);
  if (b.matk) parts.push(`+${b.matk} MATK`);
  if (b.def) parts.push(`+${b.def} DEF`);
  if (b.mdef) parts.push(`+${b.mdef} MDEF`);
  if (b.maxHp) parts.push(`+${b.maxHp} MaxHP`);
  if (b.maxMp) parts.push(`+${b.maxMp} MaxMP`);
  if (b.str) parts.push(`+${b.str} STR`);
  if (b.dex) parts.push(`+${b.dex} DEX`);
  if (b.agi) parts.push(`+${b.agi} AGI`);
  if (b.int) parts.push(`+${b.int} INT`);
  if (b.con) parts.push(`+${b.con} CON`);
  if (b.critRatePct) parts.push(`+${b.critRatePct}% Crit Rate`);
  if (b.critDamagePct) parts.push(`+${b.critDamagePct}% Crit DMG`);
  if (b.aspdPct) parts.push(`+${b.aspdPct}% ASPD`);
  if (b.moveSpeedPct) parts.push(`+${b.moveSpeedPct}% MoveSpeed`);
  if (b.skillDamagePct) parts.push(`+${b.skillDamagePct}% Skill DMG`);
  if (b.healingPowerPct) parts.push(`+${b.healingPowerPct}% Healing`);
  if (b.damageReductionPct) parts.push(`+${b.damageReductionPct}% DMG Reduction`);
  if (b.lifestealPct) parts.push(`+${b.lifestealPct}% Lifesteal`);
  return parts.join(', ');
}

function buildClassSetsAndItems(): {
  sets: EquipmentSetDefinition[];
  items: ItemEntity[];
} {
  const sets: EquipmentSetDefinition[] = [];
  const items: ItemEntity[] = [];
  const slotsPerSet: EquipmentSlotId[] = ['weapon', 'head', 'armor', 'gloves', 'boots', 'shoulder', 'necklace'];

  for (const seed of CLASS_SET_SEEDS) {
    const rarityCfg = RARITY_CONFIGS[seed.rarity];
    const levelMult = seed.tierLevel === 15 ? 1.0 : seed.tierLevel === 35 ? 2.15 : 3.9;
    const prefix = seed.setId.toUpperCase();
    const pieceIds: string[] = [];

    for (const slot of slotsPerSet) {
      const id =
        slot === 'weapon' && seed.awakeningWeaponId
          ? seed.awakeningWeaponId
          : slot === 'armor' && seed.awakeningArmorId
          ? seed.awakeningArmorId
          : `${prefix}_${slot.toUpperCase()}`;

      pieceIds.push(id);
      const isWeapon = slot === 'weapon';
      const isArmor = slot === 'armor';
      const isNeck = slot === 'necklace';

      const baseAtk = isWeapon
        ? Math.round(28 * levelMult * rarityCfg.statMultiplier)
        : slot === 'gloves'
        ? Math.round(10 * levelMult * rarityCfg.statMultiplier)
        : isNeck
        ? Math.round(8 * levelMult * rarityCfg.statMultiplier)
        : 0;
      const baseDef = isWeapon
        ? seed.isTank
          ? Math.round(20 * levelMult)
          : 0
        : isArmor
        ? Math.round(18 * levelMult * rarityCfg.statMultiplier)
        : Math.round(10 * levelMult * rarityCfg.statMultiplier);

      const equipStats: Record<string, number> = {};
      if (baseAtk > 0) {
        if (seed.isMagical) equipStats.matk = baseAtk;
        else equipStats.atk = baseAtk;
        if (seed.isMagical && isWeapon) equipStats.atk = Math.round(baseAtk * 0.55);
      }
      if (baseDef > 0) {
        equipStats.def = baseDef;
        equipStats.mdef = Math.round(baseDef * 0.7);
      }
      if (slot === 'armor' || slot === 'head') equipStats.maxHp = Math.round(55 * levelMult);
      if (slot === 'boots') equipStats.moveSpeedPct = seed.tierLevel >= 60 ? 10 : seed.tierLevel >= 35 ? 6 : 3;
      if (slot === 'gloves') equipStats.critRatePct = seed.tierLevel >= 60 ? 6 : seed.tierLevel >= 35 ? 4 : 2;
      if (isNeck) equipStats.maxMp = Math.round(45 * levelMult);

      const name =
        slot === 'weapon'
          ? seed.weaponTitle
          : `${slotDisplayVi(slot)} ${seed.nameVi.replace(/^Bộ /, '').replace(/ Lv\.\d+$/, '')}`;

      items.push({
        id,
        itemId: id,
        name,
        description: `Thuộc bộ trang bị ${seed.name} dành cho ${seed.classId.toUpperCase()} (Lv.${seed.tierLevel}+).`,
        category: isWeapon ? 'weapon' : isNeck ? 'accessory' : 'armor',
        itemType: isWeapon ? 'weapon' : isNeck ? 'accessory' : 'armor',
        itemSubtype: isWeapon ? seed.weaponSubtype : slot,
        equipSlot: slot,
        setId: seed.setId,
        element: seed.element,
        rarity: seed.rarity,
        requiredLevel: seed.tierLevel,
        allowedClasses: [seed.classId],
        requiredClasses: [seed.classId],
        upgradeLevel: 0,
        maxUpgradeLevel: rarityCfg.maxUpgradeLevel,
        equipmentStats: equipStats,
        bonusAttributes: seed.isMagical ? { int: Math.round(2 * levelMult) } : { str: Math.round(2 * levelMult) },
        dropSources: seed.tierLevel === 15 ? ['Quests Lv.15', 'Whispering Meadow', 'Shop Elysia'] : seed.tierLevel === 35 ? ['Sylvaris Crafting', 'Ancient Treant / Moon Hydra'] : ['Drakhen Blacksmith', 'Ignis Dragon / Abyss Overlord'],
        icon: iconForSlot(slot, seed.weaponSubtype),
        sellPrice: Math.round(180 * levelMult * rarityCfg.statMultiplier),
        buyPrice: Math.round(720 * levelMult * rarityCfg.statMultiplier),
        stackable: false,
        stackLimit: 1,
        enabled: true,
        status: 'published',
      });
    }

    sets.push({
      id: seed.setId,
      name: seed.name,
      nameVi: seed.nameVi,
      description: `Bộ trang bị ${seed.name} cho ${seed.classId.toUpperCase()} gồm 7 món (Vũ khí, Mũ, Áo, Găng, Ủng, Vai, Dây chuyền). Kích hoạt mạnh tại mốc 2/4/6 món!`,
      classId: seed.classId,
      tierLevel: seed.tierLevel,
      rarity: seed.rarity,
      category: 'class_set',
      pieceItemIds: pieceIds,
      fragmentItemId: seed.fragmentId,
      bonusTiers: [
        { requiredPieces: 2, summary: summarizeBonus(seed.bonuses2), bonuses: seed.bonuses2 },
        { requiredPieces: 4, summary: summarizeBonus(seed.bonuses4), bonuses: seed.bonuses4 },
        { requiredPieces: 6, summary: summarizeBonus(seed.bonuses6), bonuses: seed.bonuses6 },
      ],
      status: 'published',
    });
  }

  return { sets, items };
}

const BUILT_CLASS_CONTENT = buildClassSetsAndItems();

// ==========================================
// BOSS-EXCLUSIVE SETS, EQUIPMENT & MATERIALS
// ==========================================
export const BOSS_EXCLUSIVE_SETS: EquipmentSetDefinition[] = [
  {
    id: 'set_forest_guardian',
    name: 'Forest Guardian Set Lv.38',
    nameVi: 'Bộ Thần Rừng Hộ Vệ (Ancient Treant)',
    description: 'Trang bị tinh hoa rơi từ Boss Ancient Treant tại Spirit Forest.',
    classId: 'any',
    tierLevel: 38,
    rarity: 'epic',
    category: 'boss_set',
    pieceItemIds: ['ITEM_FOREST_GUARDIAN_CROWN', 'ITEM_FOREST_GUARDIAN_CLOAK', 'ITEM_FOREST_GUARDIAN_RING'],
    fragmentItemId: 'FRAG_FOREST_SET',
    sourceBossIds: ['boss_ancient_treant'],
    bonusTiers: [
      { requiredPieces: 2, summary: '+45 DEF, +650 MaxHP, +10% Healing', bonuses: { def: 45, maxHp: 650, healingPowerPct: 10 } },
    ],
    status: 'published',
  },
  {
    id: 'set_moonwater_mystic',
    name: 'Moonwater Mystic Set Lv.45',
    nameVi: 'Bộ Nguyệt Thủy (Moon Hydra)',
    description: 'Trang bị thủy hệ quý hiếm rơi từ Boss Moon Hydra tại Moonlit Lake.',
    classId: 'any',
    tierLevel: 45,
    rarity: 'epic',
    category: 'boss_set',
    pieceItemIds: ['ITEM_MOONWATER_ROBE', 'ITEM_MOONWATER_RING', 'ITEM_MOONWATER_CLOAK'],
    fragmentItemId: 'FRAG_MOONWATER_SET',
    sourceBossIds: ['boss_moon_hydra'],
    bonusTiers: [
      { requiredPieces: 2, summary: '+78 MATK, +550 MaxMP, +15% Skill DMG', bonuses: { matk: 78, maxMp: 550, skillDamagePct: 15 } },
    ],
    status: 'published',
  },
  {
    id: 'set_ancient_titan',
    name: 'Ancient Titan Plate Set Lv.55',
    nameVi: 'Bộ Cổ Đại Titan (Ancient Titan)',
    description: 'Giáp nặng Titan cổ đại rơi từ Boss Ancient Titan tại Ancient Ruins.',
    classId: 'any',
    tierLevel: 55,
    rarity: 'epic',
    category: 'boss_set',
    pieceItemIds: ['ITEM_ANCIENT_PLATE', 'ITEM_ANCIENT_TITAN_SHOULDER', 'ITEM_ANCIENT_TITAN_RING'],
    fragmentItemId: 'FRAG_ANCIENT_SET',
    sourceBossIds: ['boss_ancient_titan'],
    bonusTiers: [
      { requiredPieces: 2, summary: '+95 DEF, +1200 MaxHP, +10% DMG Reduction', bonuses: { def: 95, maxHp: 1200, damageReductionPct: 10 } },
    ],
    status: 'published',
  },
  {
    id: 'set_ignis_dragon',
    name: 'Ignis Legendary Set Lv.75',
    nameVi: 'Bộ Hỏa Long Huyền Thoại (Ignis Dragon)',
    description: 'Trang bị Huyền Thoại rèn từ Trái Tim Hỏa Long Ignis tại Dragon Valley.',
    classId: 'any',
    tierLevel: 75,
    rarity: 'legendary',
    category: 'boss_set',
    pieceItemIds: ['ITEM_IGNIS_BLADE', 'ITEM_IGNIS_DRAGON_ARMOR', 'ITEM_IGNIS_DRAGON_CLOAK', 'ITEM_IGNIS_DRAGON_RING'],
    fragmentItemId: 'FRAG_IGNIS_SET',
    sourceBossIds: ['boss_ignis_dragon'],
    bonusTiers: [
      { requiredPieces: 2, summary: '+135 ATK, +135 MATK, +12% Crit Rate', bonuses: { atk: 135, matk: 135, critRatePct: 12 } },
      { requiredPieces: 4, summary: '+240 ATK/MATK, +45% Crit DMG, +25% Skill DMG', bonuses: { atk: 240, matk: 240, critDamagePct: 45, skillDamagePct: 25 } },
    ],
    status: 'published',
  },
  {
    id: 'set_abyss_overlord',
    name: 'Abyss Overlord Mythic Set Lv.105',
    nameVi: 'Bộ Hư Vô Chúa Tể (Abyss Overlord)',
    description: 'Trang bị Thần Thoại tối thượng từ World Boss Abyss Overlord tại Shadow Realm Border.',
    classId: 'any',
    tierLevel: 105,
    rarity: 'mythic',
    category: 'boss_set',
    pieceItemIds: ['ITEM_ABYSSAL_GREATSWORD', 'ITEM_ABYSSAL_MYTHIC_ARMOR', 'ITEM_ABYSSAL_RING', 'ITEM_ABYSSAL_CLOAK'],
    fragmentItemId: 'FRAG_ABYSS_SET',
    sourceBossIds: ['boss_abyss_overlord'],
    bonusTiers: [
      { requiredPieces: 2, summary: '+240 ATK/MATK, +15% Lifesteal & Crit', bonuses: { atk: 240, matk: 240, critRatePct: 15, lifestealPct: 8 } },
      { requiredPieces: 4, summary: '+450 ATK/MATK, +3500 HP, +38% Skill DMG, +16% DMG Reduction', bonuses: { atk: 450, matk: 450, maxHp: 3500, skillDamagePct: 38, damageReductionPct: 16 } },
    ],
    status: 'published',
  },
];

export const INITIAL_EQUIPMENT_SETS: EquipmentSetDefinition[] = [
  ...BUILT_CLASS_CONTENT.sets,
  ...BOSS_EXCLUSIVE_SETS,
];

export const CORE_AND_BOSS_ITEMS: ItemEntity[] = [
  {
    id: 'ITEM_SWORD_WOODEN_NOVICE',
    itemId: 'ITEM_SWORD_WOODEN_NOVICE',
    name: 'Kiếm Gỗ Nhà Thám Hiểm',
    description: 'Kiếm gỗ khởi đầu cho Adventurer Lv.1.',
    category: 'weapon',
    itemSubtype: 'sword',
    equipSlot: 'weapon',
    rarity: 'common',
    requiredLevel: 1,
    allowedClasses: ['adventurer', 'swordsman', 'knight'],
    sellPrice: 2,
    buyPrice: 10,
    equipmentStats: { atk: 8 },
    icon: 'sword_novice',
    enabled: true,
    status: 'published',
  },
  {
    id: 'ITEM_POTION_HP_SMALL',
    itemId: 'ITEM_POTION_HP_SMALL',
    name: 'Bình Máu Nhỏ',
    description: 'Hồi phục 120 HP.',
    category: 'potion',
    rarity: 'common',
    requiredLevel: 1,
    sellPrice: 5,
    buyPrice: 20,
    effects: { healHp: 120 },
    icon: 'potion_hp',
    enabled: true,
    status: 'published',
  },
  {
    id: 'ITEM_POTION_HP_MEDIUM',
    itemId: 'ITEM_POTION_HP_MEDIUM',
    name: 'Bình Máu Trung',
    description: 'Hồi phục 450 HP.',
    category: 'potion',
    rarity: 'uncommon',
    requiredLevel: 15,
    sellPrice: 25,
    buyPrice: 90,
    effects: { healHp: 450 },
    icon: 'potion_hp',
    enabled: true,
    status: 'published',
  },
  {
    id: 'ITEM_POTION_HP_LARGE',
    itemId: 'ITEM_POTION_HP_LARGE',
    name: 'Bình Máu Đại',
    description: 'Hồi phục 1600 HP.',
    category: 'potion',
    rarity: 'rare',
    requiredLevel: 45,
    sellPrice: 95,
    buyPrice: 320,
    effects: { healHp: 1600 },
    icon: 'potion_hp',
    enabled: true,
    status: 'published',
  },
  {
    id: 'ITEM_POTION_MP_SMALL',
    itemId: 'ITEM_POTION_MP_SMALL',
    name: 'Bình Mana Nhỏ',
    description: 'Hồi phục 80 MP.',
    category: 'potion',
    rarity: 'common',
    requiredLevel: 1,
    sellPrice: 6,
    buyPrice: 24,
    effects: { healMp: 80 },
    icon: 'potion_mp',
    enabled: true,
    status: 'published',
  },
  {
    id: 'ITEM_POTION_MP_MEDIUM',
    itemId: 'ITEM_POTION_MP_MEDIUM',
    name: 'Bình Mana Trung',
    description: 'Hồi phục 240 MP.',
    category: 'potion',
    rarity: 'uncommon',
    requiredLevel: 25,
    sellPrice: 30,
    buyPrice: 110,
    effects: { healMp: 240 },
    icon: 'potion_mp',
    enabled: true,
    status: 'published',
  },
  {
    id: 'ITEM_AWAKENING_CERTIFICATE',
    itemId: 'ITEM_AWAKENING_CERTIFICATE',
    name: 'Chứng Chỉ Thức Tỉnh (Awakening Certificate)',
    description: 'Chứng nhận vượt qua Thánh Điện Thức Tỉnh, dùng để chuyển chức lần 1 tại cấp 15.',
    category: 'quest_item',
    rarity: 'epic',
    requiredLevel: 15,
    sellPrice: 0,
    buyPrice: 0,
    icon: 'gem_amethyst',
    enabled: true,
    status: 'published',
  },
  {
    id: 'ITEM_EXCALIBUR_HOLY',
    itemId: 'ITEM_EXCALIBUR_HOLY',
    name: 'Thánh Kiếm Excalibur',
    description: 'Thần kiếm huyền thoại ánh sáng (+165 ATK).',
    category: 'weapon',
    itemSubtype: 'sword',
    equipSlot: 'weapon',
    element: 'holy',
    rarity: 'legendary',
    requiredLevel: 60,
    allowedClasses: ['swordsman', 'knight'],
    sellPrice: 5000,
    buyPrice: 25000,
    equipmentStats: { atk: 165, critRatePct: 8 },
    icon: 'excalibur_sword_icon',
    iconAssetUrl: '/assets/items/excalibur_sword_icon.png',
    enabled: true,
    status: 'published',
  },

  // Common/Regional Materials & Upgrade Stones
  { id: 'MAT_SLIME_JELLY', itemId: 'MAT_SLIME_JELLY', name: 'Tinh Chất Slime', description: 'Nguyên liệu cơ bản.', category: 'material', rarity: 'common', requiredLevel: 1, sellPrice: 12, buyPrice: 40, icon: 'herb_green', enabled: true, status: 'published' },
  { id: 'MAT_WOLF_PELT', itemId: 'MAT_WOLF_PELT', name: 'Da Sói Hoang', description: 'Nguyên liệu chế tác giáp da.', category: 'material', rarity: 'common', requiredLevel: 15, sellPrice: 28, buyPrice: 85, icon: 'wood_oak', enabled: true, status: 'published' },
  { id: 'MAT_SPIRIT_ESSENCE', itemId: 'MAT_SPIRIT_ESSENCE', name: 'Linh Thạch Tinh Khiết', description: 'Kết tinh linh lực rừng Sylvaris.', category: 'material', rarity: 'uncommon', requiredLevel: 30, sellPrice: 75, buyPrice: 220, icon: 'gem_amethyst', enabled: true, status: 'published' },
  { id: 'MAT_ANCIENT_RUNE', itemId: 'MAT_ANCIENT_RUNE', name: 'Cổ Ngữ Phế Tích', description: 'Mảnh cổ ngữ từ Phế Tích Cổ Đại.', category: 'material', rarity: 'rare', requiredLevel: 45, sellPrice: 150, buyPrice: 450, icon: 'ore_iron', enabled: true, status: 'published' },
  { id: 'MAT_DRAGON_SCALE', itemId: 'MAT_DRAGON_SCALE', name: 'Vảy Rồng Lửa', description: 'Nguyên liệu rèn thần binh tại Drakhen.', category: 'material', rarity: 'epic', requiredLevel: 60, sellPrice: 360, buyPrice: 1100, icon: 'gem_amethyst', enabled: true, status: 'published' },
  { id: 'MAT_VOID_CRYSTAL', itemId: 'MAT_VOID_CRYSTAL', name: 'Tinh Thể Hư Vô', description: 'Vật chất hiếm vùng Biên Giới Hắc Ám Lv.90+.', category: 'material', rarity: 'mythic', requiredLevel: 90, sellPrice: 900, buyPrice: 2800, icon: 'gem_amethyst', enabled: true, status: 'published' },
  { id: 'ITEM_UPGRADE_STONE_BASIC', itemId: 'ITEM_UPGRADE_STONE_BASIC', name: 'Đá Cường Hóa Sơ Cấp', description: 'Dùng nâng cấp trang bị +1 đến +5.', category: 'material', rarity: 'uncommon', requiredLevel: 15, sellPrice: 60, buyPrice: 180, icon: 'ore_iron', enabled: true, status: 'published' },
  { id: 'ITEM_UPGRADE_STONE_MYSTIC', itemId: 'ITEM_UPGRADE_STONE_MYSTIC', name: 'Đá Cường Hóa Huyền Bí', description: 'Dùng nâng cấp trang bị +6 đến +10.', category: 'material', rarity: 'epic', requiredLevel: 35, sellPrice: 260, buyPrice: 800, icon: 'gem_amethyst', enabled: true, status: 'published' },

  // Boss-Exclusive Materials & Cores
  { id: 'MAT_TREANT_CORE', itemId: 'MAT_TREANT_CORE', name: 'Treant Core (Lõi Mộc Thần)', description: 'Lõi linh mộc rơi chắc chắn từ Boss Ancient Treant Lv.38.', category: 'material', rarity: 'epic', requiredLevel: 35, sellPrice: 420, buyPrice: 0, dropSources: ['boss_ancient_treant'], icon: 'herb_green', enabled: true, status: 'published' },
  { id: 'MAT_FOREST_ESSENCE', itemId: 'MAT_FOREST_ESSENCE', name: 'Forest Essence (Tinh Hoa Rừng Sâu)', description: 'Tinh chất mộc linh dùng chế tác bộ Forest Guardian.', category: 'material', rarity: 'rare', requiredLevel: 35, sellPrice: 210, buyPrice: 0, dropSources: ['boss_ancient_treant', 'elite_spirit_treant'], icon: 'herb_green', enabled: true, status: 'published' },
  { id: 'MAT_HYDRA_SCALE', itemId: 'MAT_HYDRA_SCALE', name: 'Hydra Scale (Vảy Thủy Xà Chúa)', description: 'Vảy phản quang rơi từ Boss Moon Hydra Lv.45.', category: 'material', rarity: 'epic', requiredLevel: 42, sellPrice: 540, buyPrice: 0, dropSources: ['boss_moon_hydra'], icon: 'gem_amethyst', enabled: true, status: 'published' },
  { id: 'MAT_TITAN_CORE', itemId: 'MAT_TITAN_CORE', name: 'Titan Core (Lõi Titan Cổ Đại)', description: 'Trái tim đá ma lực của Boss Ancient Titan Lv.55.', category: 'material', rarity: 'epic', requiredLevel: 50, sellPrice: 720, buyPrice: 0, dropSources: ['boss_ancient_titan'], icon: 'ore_iron', enabled: true, status: 'published' },
  { id: 'MAT_DRAGON_HEART', itemId: 'MAT_DRAGON_HEART', name: 'Dragon Heart (Tim Hỏa Long Ignis)', description: 'Bảo vật rực cháy rơi từ World Boss Ignis Dragon Lv.75.', category: 'material', rarity: 'legendary', requiredLevel: 70, sellPrice: 1450, buyPrice: 0, dropSources: ['boss_ignis_dragon'], icon: 'gem_amethyst', enabled: true, status: 'published' },
  { id: 'MAT_ABYSSAL_CORE', itemId: 'MAT_ABYSSAL_CORE', name: 'Abyssal Core (Lõi Hư Vô Chúa Tể)', description: 'Nguyên liệu chế tác trang bị Mythic từ Abyss Overlord Lv.110.', category: 'material', rarity: 'mythic', requiredLevel: 95, sellPrice: 2800, buyPrice: 0, dropSources: ['boss_abyss_overlord'], icon: 'gem_amethyst', enabled: true, status: 'published' },

  // Set Fragments
  { id: 'FRAG_APPRENTICE_SET', itemId: 'FRAG_APPRENTICE_SET', name: 'Mảnh Bộ Tập Sự Lv.15', description: 'Thu thập 10 mảnh để đổi trang bị Bộ Tập Sự Lv.15 tương ứng nghề.', category: 'material', rarity: 'uncommon', requiredLevel: 15, sellPrice: 30, buyPrice: 0, icon: 'gem_amethyst', enabled: true, status: 'published' },
  { id: 'FRAG_TIER2_ELITE_SET', itemId: 'FRAG_TIER2_ELITE_SET', name: 'Mảnh Bộ Tinh Anh Lv.35', description: 'Thu thập 10 mảnh để đổi trang bị Bộ Cấp 35 tương ứng nghề.', category: 'material', rarity: 'rare', requiredLevel: 35, sellPrice: 95, buyPrice: 0, icon: 'gem_amethyst', enabled: true, status: 'published' },
  { id: 'FRAG_TIER3_DRAGON_SET', itemId: 'FRAG_TIER3_DRAGON_SET', name: 'Mảnh Bộ Long Chiến Lv.60', description: 'Thu thập 12 mảnh để đổi trang bị Bộ Cấp 60 tương ứng nghề.', category: 'material', rarity: 'epic', requiredLevel: 60, sellPrice: 240, buyPrice: 0, icon: 'gem_amethyst', enabled: true, status: 'published' },
  { id: 'FRAG_FOREST_SET', itemId: 'FRAG_FOREST_SET', name: 'Forest Set Fragment (Mảnh Rừng Thần)', description: '10 Forest Set Fragments đổi 1 trang bị Forest Guardian từ Ancient Treant.', category: 'material', rarity: 'epic', requiredLevel: 38, sellPrice: 120, buyPrice: 0, dropSources: ['boss_ancient_treant'], icon: 'herb_green', enabled: true, status: 'published' },
  { id: 'FRAG_MOONWATER_SET', itemId: 'FRAG_MOONWATER_SET', name: 'Moonwater Set Fragment (Mảnh Nguyệt Thủy)', description: '10 mảnh đổi trang bị Moonwater từ Moon Hydra.', category: 'material', rarity: 'epic', requiredLevel: 45, sellPrice: 150, buyPrice: 0, dropSources: ['boss_moon_hydra'], icon: 'gem_amethyst', enabled: true, status: 'published' },
  { id: 'FRAG_ANCIENT_SET', itemId: 'FRAG_ANCIENT_SET', name: 'Ancient Titan Fragment (Mảnh Cổ Đại Titan)', description: '10 mảnh đổi giáp nặng Ancient Plate / Titan từ Ancient Titan.', category: 'material', rarity: 'epic', requiredLevel: 55, sellPrice: 190, buyPrice: 0, dropSources: ['boss_ancient_titan'], icon: 'ore_iron', enabled: true, status: 'published' },
  { id: 'FRAG_IGNIS_SET', itemId: 'FRAG_IGNIS_SET', name: 'Ignis Dragon Fragment (Mảnh Hỏa Long)', description: '10 mảnh đổi trang bị Ignis Huyền Thoại từ Ignis Dragon.', category: 'material', rarity: 'legendary', requiredLevel: 75, sellPrice: 380, buyPrice: 0, dropSources: ['boss_ignis_dragon'], icon: 'gem_amethyst', enabled: true, status: 'published' },
  { id: 'FRAG_ABYSS_SET', itemId: 'FRAG_ABYSS_SET', name: 'Abyssal Mythic Fragment (Mảnh Hư Vô)', description: '12 mảnh đổi trang bị Thần Thoại từ Abyss Overlord.', category: 'material', rarity: 'mythic', requiredLevel: 105, sellPrice: 650, buyPrice: 0, dropSources: ['boss_abyss_overlord'], icon: 'gem_amethyst', enabled: true, status: 'published' },

  // Boss-Exclusive Equipment Drops (Supports Accessories, Cloaks, Heavy Plate, Legendary/Mythic Drops)
  { id: 'ITEM_FOREST_GUARDIAN_CROWN', itemId: 'ITEM_FOREST_GUARDIAN_CROWN', name: 'Mũ Forest Guardian', description: 'Vương miện mộc thần rơi từ Ancient Treant.', category: 'armor', equipSlot: 'head', setId: 'set_forest_guardian', element: 'earth', rarity: 'rare', requiredLevel: 38, allowedClasses: ['any'], equipmentStats: { def: 46, mdef: 38, maxHp: 260 }, dropSources: ['boss_ancient_treant'], icon: 'helm_bronze', sellPrice: 1200, buyPrice: 0, stackable: false, enabled: true, status: 'published' },
  { id: 'ITEM_FOREST_GUARDIAN_CLOAK', itemId: 'ITEM_FOREST_GUARDIAN_CLOAK', name: 'Áo Choàng Forest Guardian', description: 'Áo choàng lá linh rơi từ Ancient Treant.', category: 'accessory', equipSlot: 'cloak', setId: 'set_forest_guardian', element: 'earth', rarity: 'epic', requiredLevel: 38, allowedClasses: ['any'], equipmentStats: { def: 38, mdef: 42, maxHp: 320, moveSpeedPct: 8 }, dropSources: ['boss_ancient_treant'], icon: 'tunic_explorer', sellPrice: 1850, buyPrice: 0, stackable: false, enabled: true, status: 'published' },
  { id: 'ITEM_FOREST_GUARDIAN_RING', itemId: 'ITEM_FOREST_GUARDIAN_RING', name: 'Nhẫn Forest Guardian', description: 'Nhẫn linh mộc bổ trợ đa nghề nghiệp.', category: 'accessory', equipSlot: 'ring1', setId: 'set_forest_guardian', element: 'earth', rarity: 'epic', requiredLevel: 38, allowedClasses: ['any'], equipmentStats: { atk: 32, matk: 32, maxHp: 220 }, dropSources: ['boss_ancient_treant'], icon: 'gem_amethyst', sellPrice: 1750, buyPrice: 0, stackable: false, enabled: true, status: 'published' },

  { id: 'ITEM_MOONWATER_ROBE', itemId: 'ITEM_MOONWATER_ROBE', name: 'Áo Giáp Moonwater', description: 'Trang bị thủy hệ từ Moon Hydra.', category: 'armor', equipSlot: 'armor', setId: 'set_moonwater_mystic', element: 'water', rarity: 'rare', requiredLevel: 45, allowedClasses: ['any'], equipmentStats: { def: 58, mdef: 72, maxMp: 280 }, dropSources: ['boss_moon_hydra'], icon: 'armor_plate', sellPrice: 1650, buyPrice: 0, stackable: false, enabled: true, status: 'published' },
  { id: 'ITEM_MOONWATER_CLOAK', itemId: 'ITEM_MOONWATER_CLOAK', name: 'Áo Choàng Nguyệt Thủy', description: 'Áo choàng ánh trăng rơi từ Moon Hydra.', category: 'accessory', equipSlot: 'cloak', setId: 'set_moonwater_mystic', element: 'water', rarity: 'epic', requiredLevel: 45, allowedClasses: ['any'], equipmentStats: { mdef: 65, matk: 48, maxMp: 300 }, dropSources: ['boss_moon_hydra'], icon: 'tunic_explorer', sellPrice: 2300, buyPrice: 0, stackable: false, enabled: true, status: 'published' },
  { id: 'ITEM_MOONWATER_RING', itemId: 'ITEM_MOONWATER_RING', name: 'Nhẫn Nguyệt Thủy', description: 'Nhẫn thủy ngọc từ Moon Hydra.', category: 'accessory', equipSlot: 'ring1', setId: 'set_moonwater_mystic', element: 'water', rarity: 'epic', requiredLevel: 45, allowedClasses: ['any'], equipmentStats: { atk: 42, matk: 56, critRatePct: 5 }, dropSources: ['boss_moon_hydra'], icon: 'gem_amethyst', sellPrice: 2200, buyPrice: 0, stackable: false, enabled: true, status: 'published' },

  { id: 'ITEM_ANCIENT_PLATE', itemId: 'ITEM_ANCIENT_PLATE', name: 'Ancient Plate (Chiến Giáp Cổ Đại)', description: 'Trọng giáp Titan cực kỳ kiên cố rơi từ Ancient Titan.', category: 'armor', equipSlot: 'armor', setId: 'set_ancient_titan', element: 'earth', rarity: 'epic', requiredLevel: 55, allowedClasses: ['any'], equipmentStats: { def: 118, mdef: 75, maxHp: 680 }, dropSources: ['boss_ancient_titan'], icon: 'armor_plate', sellPrice: 3200, buyPrice: 0, stackable: false, enabled: true, status: 'published' },
  { id: 'ITEM_ANCIENT_TITAN_SHOULDER', itemId: 'ITEM_ANCIENT_TITAN_SHOULDER', name: 'Vai Giáp Titan Cổ Đại', description: 'Vai giáp khắc cổ ngữ rơi từ Ancient Titan.', category: 'armor', equipSlot: 'shoulder', setId: 'set_ancient_titan', element: 'earth', rarity: 'epic', requiredLevel: 55, allowedClasses: ['any'], equipmentStats: { def: 82, atk: 54, maxHp: 420 }, dropSources: ['boss_ancient_titan'], icon: 'armor_plate', sellPrice: 2800, buyPrice: 0, stackable: false, enabled: true, status: 'published' },
  { id: 'ITEM_ANCIENT_TITAN_RING', itemId: 'ITEM_ANCIENT_TITAN_RING', name: 'Nhẫn Cổ Đại Titan', description: 'Nhẫn đá ma lực rơi từ Ancient Titan.', category: 'accessory', equipSlot: 'ring2', setId: 'set_ancient_titan', element: 'earth', rarity: 'epic', requiredLevel: 55, allowedClasses: ['any'], equipmentStats: { def: 45, atk: 62, matk: 62 }, dropSources: ['boss_ancient_titan'], icon: 'gem_amethyst', sellPrice: 2900, buyPrice: 0, stackable: false, enabled: true, status: 'published' },

  { id: 'ITEM_IGNIS_BLADE', itemId: 'ITEM_IGNIS_BLADE', name: 'Ignis Legendary Weapon', description: 'Hỏa Long Thần Binh Huyền Thoại rơi từ Ignis Dragon.', category: 'weapon', itemSubtype: 'sword', equipSlot: 'weapon', setId: 'set_ignis_dragon', element: 'fire', rarity: 'legendary', requiredLevel: 75, allowedClasses: ['swordsman', 'knight'], equipmentStats: { atk: 245, critRatePct: 10 }, dropSources: ['boss_ignis_dragon'], icon: 'sword_novice', sellPrice: 7500, buyPrice: 0, stackable: false, enabled: true, status: 'published' },
  { id: 'ITEM_IGNIS_DRAGON_ARMOR', itemId: 'ITEM_IGNIS_DRAGON_ARMOR', name: 'Giáp Huyền Thoại Hỏa Long Ignis', description: 'Chiến giáp vảy rồng rực cháy từ Ignis Dragon.', category: 'armor', equipSlot: 'armor', setId: 'set_ignis_dragon', element: 'fire', rarity: 'legendary', requiredLevel: 75, allowedClasses: ['any'], equipmentStats: { def: 165, mdef: 135, maxHp: 1200 }, dropSources: ['boss_ignis_dragon'], icon: 'armor_plate', sellPrice: 7200, buyPrice: 0, stackable: false, enabled: true, status: 'published' },
  { id: 'ITEM_IGNIS_DRAGON_CLOAK', itemId: 'ITEM_IGNIS_DRAGON_CLOAK', name: 'Áo Choàng Cánh Rồng Ignis', description: 'Áo choàng huyền thoại tăng tốc độ & hỏa thương.', category: 'accessory', equipSlot: 'cloak', setId: 'set_ignis_dragon', element: 'fire', rarity: 'legendary', requiredLevel: 75, allowedClasses: ['any'], equipmentStats: { atk: 95, matk: 95, def: 85, moveSpeedPct: 12 }, dropSources: ['boss_ignis_dragon'], icon: 'tunic_explorer', sellPrice: 6800, buyPrice: 0, stackable: false, enabled: true, status: 'published' },
  { id: 'ITEM_IGNIS_DRAGON_RING', itemId: 'ITEM_IGNIS_DRAGON_RING', name: 'Nhẫn Trái Tim Hỏa Long', description: 'Nhẫn huyền thoại Ignis Dragon.', category: 'accessory', equipSlot: 'ring2', setId: 'set_ignis_dragon', element: 'fire', rarity: 'legendary', requiredLevel: 75, allowedClasses: ['any'], equipmentStats: { atk: 110, matk: 110, critRatePct: 8 }, dropSources: ['boss_ignis_dragon'], icon: 'gem_amethyst', sellPrice: 6600, buyPrice: 0, stackable: false, enabled: true, status: 'published' },

  { id: 'ITEM_ABYSSAL_GREATSWORD', itemId: 'ITEM_ABYSSAL_GREATSWORD', name: 'Abyssal Overlord Mythic Blade', description: 'Thần Khí Hư Vô bậc Mythic rơi từ World Boss Abyss Overlord.', category: 'weapon', itemSubtype: 'greatsword', equipSlot: 'weapon', setId: 'set_abyss_overlord', element: 'shadow', rarity: 'mythic', requiredLevel: 105, allowedClasses: ['swordsman'], equipmentStats: { atk: 420, critRatePct: 14, critDamagePct: 30 }, dropSources: ['boss_abyss_overlord'], icon: 'excalibur_sword_icon', sellPrice: 18000, buyPrice: 0, stackable: false, enabled: true, status: 'published' },
  { id: 'ITEM_ABYSSAL_MYTHIC_ARMOR', itemId: 'ITEM_ABYSSAL_MYTHIC_ARMOR', name: 'Thần Giáp Hư Vô Chúa Tể', description: 'Giáp Mythic tối thượng từ Abyss Overlord.', category: 'armor', equipSlot: 'armor', setId: 'set_abyss_overlord', element: 'shadow', rarity: 'mythic', requiredLevel: 105, allowedClasses: ['any'], equipmentStats: { def: 280, mdef: 260, maxHp: 2600 }, dropSources: ['boss_abyss_overlord'], icon: 'armor_plate', sellPrice: 16500, buyPrice: 0, stackable: false, enabled: true, status: 'published' },
  { id: 'ITEM_ABYSSAL_RING', itemId: 'ITEM_ABYSSAL_RING', name: 'Nhẫn Hư Vô Tối Thượng', description: 'Phụ kiện Mythic không phân biệt nghề.', category: 'accessory', equipSlot: 'ring1', setId: 'set_abyss_overlord', element: 'shadow', rarity: 'mythic', requiredLevel: 105, allowedClasses: ['any'], equipmentStats: { atk: 185, matk: 185, critRatePct: 12 }, dropSources: ['boss_abyss_overlord'], icon: 'gem_amethyst', sellPrice: 15000, buyPrice: 0, stackable: false, enabled: true, status: 'published' },
  { id: 'ITEM_ABYSSAL_CLOAK', itemId: 'ITEM_ABYSSAL_CLOAK', name: 'Áo Choàng Hư Vô Chúa Tể', description: 'Áo choàng Mythic tối thượng từ Abyss Overlord.', category: 'accessory', equipSlot: 'cloak', setId: 'set_abyss_overlord', element: 'shadow', rarity: 'mythic', requiredLevel: 105, allowedClasses: ['any'], equipmentStats: { atk: 160, matk: 160, def: 150, moveSpeedPct: 15 }, dropSources: ['boss_abyss_overlord'], icon: 'tunic_explorer', sellPrice: 15500, buyPrice: 0, stackable: false, enabled: true, status: 'published' },
];

export const INITIAL_ITEMS: ItemEntity[] = [
  ...CORE_AND_BOSS_ITEMS,
  ...BUILT_CLASS_CONTENT.items,
];

export const SET_FRAGMENT_CONFIGS: SetFragmentConfig[] = [
  {
    fragmentItemId: 'FRAG_FOREST_SET',
    name: '10 Forest Set Fragments -> Forest Guardian Gear',
    setId: 'set_forest_guardian',
    targetItemIds: ['ITEM_FOREST_GUARDIAN_CROWN', 'ITEM_FOREST_GUARDIAN_CLOAK', 'ITEM_FOREST_GUARDIAN_RING'],
    targetCategory: 'Forest Guardian Boss Set (Lv.38)',
    sourceBossIds: ['boss_ancient_treant'],
    requiredQuantity: 10,
    goldCost: 1500,
    description: 'Thu thập đủ 10 Mảnh Forest Set từ Ancient Treant để đổi trang bị Forest Guardian.',
  },
  {
    fragmentItemId: 'FRAG_MOONWATER_SET',
    name: '10 Moonwater Set Fragments -> Moonwater Gear',
    setId: 'set_moonwater_mystic',
    targetItemIds: ['ITEM_MOONWATER_ROBE', 'ITEM_MOONWATER_CLOAK', 'ITEM_MOONWATER_RING'],
    targetCategory: 'Moonwater Mystic Set (Lv.45)',
    sourceBossIds: ['boss_moon_hydra'],
    requiredQuantity: 10,
    goldCost: 2200,
  },
  {
    fragmentItemId: 'FRAG_ANCIENT_SET',
    name: '10 Ancient Titan Fragments -> Ancient Plate Gear',
    setId: 'set_ancient_titan',
    targetItemIds: ['ITEM_ANCIENT_PLATE', 'ITEM_ANCIENT_TITAN_SHOULDER', 'ITEM_ANCIENT_TITAN_RING'],
    targetCategory: 'Ancient Titan Set (Lv.55)',
    sourceBossIds: ['boss_ancient_titan'],
    requiredQuantity: 10,
    goldCost: 3500,
  },
  {
    fragmentItemId: 'FRAG_IGNIS_SET',
    name: '10 Ignis Dragon Fragments -> Ignis Legendary Gear',
    setId: 'set_ignis_dragon',
    targetItemIds: ['ITEM_IGNIS_BLADE', 'ITEM_IGNIS_DRAGON_ARMOR', 'ITEM_IGNIS_DRAGON_CLOAK', 'ITEM_IGNIS_DRAGON_RING'],
    targetCategory: 'Ignis Legendary Set (Lv.75)',
    sourceBossIds: ['boss_ignis_dragon'],
    requiredQuantity: 10,
    goldCost: 8000,
  },
  {
    fragmentItemId: 'FRAG_ABYSS_SET',
    name: '12 Abyssal Mythic Fragments -> Abyss Overlord Gear',
    setId: 'set_abyss_overlord',
    targetItemIds: ['ITEM_ABYSSAL_GREATSWORD', 'ITEM_ABYSSAL_MYTHIC_ARMOR', 'ITEM_ABYSSAL_RING', 'ITEM_ABYSSAL_CLOAK'],
    targetCategory: 'Abyss Overlord Mythic Set (Lv.105)',
    sourceBossIds: ['boss_abyss_overlord'],
    requiredQuantity: 12,
    goldCost: 18000,
  },
  {
    fragmentItemId: 'FRAG_APPRENTICE_SET',
    name: '10 Mảnh Bộ Tập Sự Lv.15 -> Món Bộ Tập Sự',
    setId: 'set_swordsman_apprentice_blade',
    targetItemIds: BUILT_CLASS_CONTENT.items.filter((i) => i.requiredLevel === 15).map((i) => i.id),
    targetCategory: 'Apprentice Class Sets (Lv.15)',
    sourceBossIds: ['boss_guardian_of_awakening', 'BOSS_DARK_DRAGON_STARTER'],
    requiredQuantity: 10,
    goldCost: 500,
  },
  {
    fragmentItemId: 'FRAG_TIER2_ELITE_SET',
    name: '10 Mảnh Bộ Tinh Anh Lv.35 -> Món Bộ Lv.35',
    setId: 'set_swordsman_blazing_warrior',
    targetItemIds: BUILT_CLASS_CONTENT.items.filter((i) => i.requiredLevel === 35).map((i) => i.id),
    targetCategory: 'Class Sets (Lv.35)',
    sourceBossIds: ['boss_ancient_treant', 'boss_moon_hydra'],
    requiredQuantity: 10,
    goldCost: 1800,
  },
  {
    fragmentItemId: 'FRAG_TIER3_DRAGON_SET',
    name: '12 Mảnh Bộ Long Chiến Lv.60 -> Món Bộ Lv.60',
    setId: 'set_swordsman_dragon_slayer',
    targetItemIds: BUILT_CLASS_CONTENT.items.filter((i) => i.requiredLevel === 60).map((i) => i.id),
    targetCategory: 'Endgame Class Sets (Lv.60)',
    sourceBossIds: ['boss_ancient_titan', 'boss_ignis_dragon'],
    requiredQuantity: 12,
    goldCost: 4800,
  },
];

function buildInitialCraftingRecipes(): CraftingRecipe[] {
  const recipes: CraftingRecipe[] = [
    // Boss Fragment Exchange & Boss Material Crafting
    {
      id: 'RECIPE_EXCHANGE_FOREST_CLOAK',
      name: 'Đổi Áo Choàng Forest Guardian (10 Mảnh)',
      category: 'fragment_exchange',
      outputItemId: 'ITEM_FOREST_GUARDIAN_CLOAK',
      outputQuantity: 1,
      setId: 'set_forest_guardian',
      allowedClasses: ['adventurer', 'swordsman', 'spearman', 'knight', 'monk', 'mage', 'assassin', 'fighter', 'archer'],
      goldCost: 1500,
      materials: [{ itemId: 'FRAG_FOREST_SET', quantity: 10 }],
      requiredLevel: 38,
      npcIds: ['NPC_MASTER_CRAFTER', 'NPC_ELYSIA_EQUIP_MERCHANT', 'NPC_DRAKHEN_BLACKSMITH'],
      status: 'published',
    },
    {
      id: 'RECIPE_CRAFT_FOREST_RING',
      name: 'Chế Tác Nhẫn Forest Guardian (Treant Core)',
      category: 'boss_craft',
      outputItemId: 'ITEM_FOREST_GUARDIAN_RING',
      outputQuantity: 1,
      setId: 'set_forest_guardian',
      goldCost: 2200,
      materials: [
        { itemId: 'MAT_TREANT_CORE', quantity: 1 },
        { itemId: 'MAT_FOREST_ESSENCE', quantity: 5 },
      ],
      requiredLevel: 38,
      npcIds: ['NPC_MASTER_CRAFTER', 'NPC_DRAKHEN_BLACKSMITH'],
      status: 'published',
    },
    {
      id: 'RECIPE_EXCHANGE_MOONWATER_RING',
      name: 'Đổi Nhẫn Nguyệt Thủy (10 Mảnh Moonwater)',
      category: 'fragment_exchange',
      outputItemId: 'ITEM_MOONWATER_RING',
      outputQuantity: 1,
      setId: 'set_moonwater_mystic',
      goldCost: 2200,
      materials: [{ itemId: 'FRAG_MOONWATER_SET', quantity: 10 }],
      requiredLevel: 45,
      npcIds: ['NPC_MASTER_CRAFTER', 'NPC_DRAKHEN_BLACKSMITH'],
      status: 'published',
    },
    {
      id: 'RECIPE_CRAFT_ANCIENT_PLATE',
      name: 'Rèn Trọng Giáp Ancient Plate (Titan Core)',
      category: 'boss_craft',
      outputItemId: 'ITEM_ANCIENT_PLATE',
      outputQuantity: 1,
      setId: 'set_ancient_titan',
      goldCost: 4200,
      materials: [
        { itemId: 'MAT_TITAN_CORE', quantity: 1 },
        { itemId: 'MAT_ANCIENT_RUNE', quantity: 8 },
      ],
      requiredLevel: 55,
      npcIds: ['NPC_MASTER_CRAFTER', 'NPC_DRAKHEN_BLACKSMITH'],
      status: 'published',
    },
    {
      id: 'RECIPE_CRAFT_IGNIS_ARMOR',
      name: 'Rèn Giáp Huyền Thoại Hỏa Long (Dragon Heart)',
      category: 'boss_craft',
      outputItemId: 'ITEM_IGNIS_DRAGON_ARMOR',
      outputQuantity: 1,
      setId: 'set_ignis_dragon',
      goldCost: 9500,
      materials: [
        { itemId: 'MAT_DRAGON_HEART', quantity: 1 },
        { itemId: 'MAT_DRAGON_SCALE', quantity: 10 },
      ],
      requiredLevel: 75,
      npcIds: ['NPC_DRAKHEN_BLACKSMITH'],
      status: 'published',
    },
    {
      id: 'RECIPE_EXCHANGE_ABYSSAL_RING',
      name: 'Đổi Nhẫn Hư Vô Mythic (12 Mảnh Hư Vô)',
      category: 'fragment_exchange',
      outputItemId: 'ITEM_ABYSSAL_RING',
      outputQuantity: 1,
      setId: 'set_abyss_overlord',
      goldCost: 18000,
      materials: [{ itemId: 'FRAG_ABYSS_SET', quantity: 12 }],
      requiredLevel: 105,
      npcIds: ['NPC_DRAKHEN_BLACKSMITH'],
      status: 'published',
    },
  ];

  // Auto-add fragment exchange recipes for every Class Set Weapon & Head/Boots so every class can craft Lv.15/35/60 set items
  for (const s of CLASS_SET_SEEDS) {
    const qty = s.tierLevel >= 60 ? 12 : 10;
    const gold = s.tierLevel === 15 ? 500 : s.tierLevel === 35 ? 1800 : 4800;
    const matReq =
      s.tierLevel === 15
        ? [{ itemId: s.fragmentId, quantity: qty }]
        : s.tierLevel === 35
        ? [{ itemId: s.fragmentId, quantity: qty }, { itemId: 'MAT_SPIRIT_ESSENCE', quantity: 3 }]
        : [{ itemId: s.fragmentId, quantity: qty }, { itemId: 'MAT_DRAGON_SCALE', quantity: 4 }];

    const weaponItemId = s.awakeningWeaponId || `${s.setId.toUpperCase()}_WEAPON`;
    const headItemId = `${s.setId.toUpperCase()}_HEAD`;
    const glovesItemId = `${s.setId.toUpperCase()}_GLOVES`;
    const bootsItemId = `${s.setId.toUpperCase()}_BOOTS`;
    const shoulderItemId = `${s.setId.toUpperCase()}_SHOULDER`;
    const necklaceItemId = `${s.setId.toUpperCase()}_NECKLACE`;

    for (const [suffix, itemId] of [
      ['HEAD', headItemId],
      ['GLOVES', glovesItemId],
      ['BOOTS', bootsItemId],
      ['SHOULDER', shoulderItemId],
      ['NECKLACE', necklaceItemId],
      ['WEAPON', weaponItemId],
    ] as const) {
      recipes.push({
        id: `RECIPE_${s.setId.toUpperCase()}_${suffix}`,
        name: `Đổi ${slotDisplayVi(suffix.toLowerCase() as EquipmentSlotId)} · ${s.nameVi}`,
        category: 'fragment_exchange',
        outputItemId: itemId,
        outputQuantity: 1,
        setId: s.setId,
        allowedClasses: [s.classId],
        goldCost: gold,
        materials: matReq,
        requiredLevel: s.tierLevel,
        npcIds: ['NPC_MASTER_CRAFTER', 'NPC_ELYSIA_EQUIP_MERCHANT', 'NPC_DRAKHEN_BLACKSMITH'],
        status: 'published',
      });
    }
  }

  return recipes;
}

export const INITIAL_CRAFTING_RECIPES: CraftingRecipe[] = buildInitialCraftingRecipes();

export interface ActiveSetSummary {
  set: EquipmentSetDefinition;
  equippedCount: number;
  equippedItemIds: string[];
  activeTiers: number[];
}

export interface ComputedEquipmentAndSetStats {
  atk: number;
  matk: number;
  def: number;
  mdef: number;
  maxHp: number;
  maxMp: number;
  critRatePct: number;
  critDamagePct: number;
  aspdPct: number;
  moveSpeedPct: number;
  skillDamagePct: number;
  healingPowerPct: number;
  damageReductionPct: number;
  lifestealPct: number;
  bonusPrimary: { str: number; dex: number; agi: number; int: number; con: number };
  activeSets: ActiveSetSummary[];
}

/**
 * Computes combined stat contributions from all equipped items (across all 10 slots),
 * upgrade levels (+7% item stats per upgrade level), and active 2pc/4pc/6pc Set Bonuses.
 */
export function computeEquippedSetBonuses(
  equipmentMap: Record<string, string | { id?: string; upgradeLevel?: number; rarity?: ItemRarity } | undefined> = {},
  itemsCatalog: ItemEntity[] = INITIAL_ITEMS,
  setsCatalog: EquipmentSetDefinition[] = INITIAL_EQUIPMENT_SETS,
  upgradeLevelsBySlot: Record<string, number> = {}
): ComputedEquipmentAndSetStats {
  const out: ComputedEquipmentAndSetStats = {
    atk: 0,
    matk: 0,
    def: 0,
    mdef: 0,
    maxHp: 0,
    maxMp: 0,
    critRatePct: 0,
    critDamagePct: 0,
    aspdPct: 0,
    moveSpeedPct: 0,
    skillDamagePct: 0,
    healingPowerPct: 0,
    damageReductionPct: 0,
    lifestealPct: 0,
    bonusPrimary: { str: 0, dex: 0, agi: 0, int: 0, con: 0 },
    activeSets: [],
  };

  const setCounts = new Map<string, Set<string>>();

  const addStats = (stats: Record<string, number> = {}, mult = 1) => {
    out.atk += Math.round((stats.atk ?? stats.attack ?? 0) * mult);
    out.matk += Math.round((stats.matk ?? stats.magicAttack ?? 0) * mult);
    out.def += Math.round((stats.def ?? stats.physicalDefense ?? 0) * mult);
    out.mdef += Math.round((stats.mdef ?? stats.magicalDefense ?? 0) * mult);
    out.maxHp += Math.round((stats.maxHp ?? 0) * mult);
    out.maxMp += Math.round((stats.maxMp ?? 0) * mult);
    out.critRatePct += (stats.critRatePct ?? 0) * mult;
    out.critDamagePct += (stats.critDamagePct ?? 0) * mult;
    out.aspdPct += (stats.aspdPct ?? 0) * mult;
    out.moveSpeedPct += (stats.moveSpeedPct ?? 0) * mult;
    out.skillDamagePct += (stats.skillDamagePct ?? 0) * mult;
    out.healingPowerPct += (stats.healingPowerPct ?? 0) * mult;
    out.damageReductionPct += (stats.damageReductionPct ?? 0) * mult;
    out.lifestealPct += (stats.lifestealPct ?? 0) * mult;
    out.bonusPrimary.str += Math.round((stats.str ?? 0) * mult);
    out.bonusPrimary.dex += Math.round((stats.dex ?? 0) * mult);
    out.bonusPrimary.agi += Math.round((stats.agi ?? 0) * mult);
    out.bonusPrimary.int += Math.round((stats.int ?? 0) * mult);
    out.bonusPrimary.con += Math.round((stats.con ?? 0) * mult);
  };

  // Iterate deduplicated canonical slots
  const seenSlots = new Set<string>();
  for (const [rawSlot, rawVal] of Object.entries(equipmentMap || {})) {
    if (!rawVal) continue;
    const itemId = typeof rawVal === 'string' ? rawVal : rawVal.id;
    if (!itemId) continue;
    const item = itemsCatalog.find((it) => it.id === itemId || it.itemId === itemId);
    if (!item) continue;

    const canonicalSlot = normalizeEquipSlot(rawSlot, item.category, item.equipSlot);
    if (seenSlots.has(canonicalSlot)) continue;
    seenSlots.add(canonicalSlot);

    const upgLv =
      typeof rawVal === 'object' && typeof rawVal.upgradeLevel === 'number'
        ? rawVal.upgradeLevel
        : Number(upgradeLevelsBySlot[canonicalSlot] ?? item.upgradeLevel ?? 0);
    const upgradeMult = 1 + Math.max(0, upgLv) * 0.08;

    addStats(item.equipmentStats || (item as any).equipment_stats || {}, upgradeMult);
    if (item.bonusAttributes) {
      addStats(item.bonusAttributes, 1);
    }

    if (item.setId) {
      if (!setCounts.has(item.setId)) setCounts.set(item.setId, new Set());
      setCounts.get(item.setId)!.add(item.id);
    }
  }

  for (const [setId, itemIds] of setCounts.entries()) {
    const setDef = setsCatalog.find((s) => s.id === setId && s.status !== 'archived');
    if (!setDef) continue;
    const count = itemIds.size;
    const activeTiers: number[] = [];

    for (const tier of setDef.bonusTiers || []) {
      if (count >= tier.requiredPieces) {
        activeTiers.push(tier.requiredPieces);
        addStats(tier.bonuses as Record<string, number>, 1);
      }
    }

    out.activeSets.push({
      set: setDef,
      equippedCount: count,
      equippedItemIds: Array.from(itemIds),
      activeTiers,
    });
  }

  out.damageReductionPct = Math.min(75, out.damageReductionPct);
  return out;
}

export function getClassSetsByClass(
  classId: ClassId | string,
  setsCatalog: EquipmentSetDefinition[] = INITIAL_EQUIPMENT_SETS
): EquipmentSetDefinition[] {
  return setsCatalog.filter((s) => s.classId === classId || s.classId === 'any');
}
