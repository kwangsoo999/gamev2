// ==============================================================
// ELYSIA NO DENSETSU – FANTASY WORLD DESIGN BIBLE SCHEMA & TYPES
// Master Schema Definition for Japanese Anime Fantasy MMORPG
// ==============================================================

export interface CanonicalJobSpec {
  id: string;
  nameVi: string;
  nameEn: string;
  weaponTypes: string[];
  combatStyle: string;
  primaryStat: 'STR' | 'VIT' | 'AGI' | 'INT' | 'WIS' | 'LUK';
  secondaryStat: 'STR' | 'VIT' | 'AGI' | 'INT' | 'WIS' | 'LUK';
  vfxColor: string;
}

export const CANONICAL_SEVEN_JOBS: Record<string, CanonicalJobSpec> = {
  JOB_SWORDSMAN: {
    id: 'JOB_SWORDSMAN',
    nameVi: 'Kiếm Sĩ',
    nameEn: 'Swordsman',
    weaponTypes: ['sword', 'greatsword'],
    combatStyle: 'melee_physical',
    primaryStat: 'STR',
    secondaryStat: 'VIT',
    vfxColor: '#e2e8f0',
  },
  JOB_SPEARMAN: {
    id: 'JOB_SPEARMAN',
    nameVi: 'Thương Thủ',
    nameEn: 'Spearman',
    weaponTypes: ['spear', 'halberd'],
    combatStyle: 'reach_physical',
    primaryStat: 'STR',
    secondaryStat: 'AGI',
    vfxColor: '#a855f7',
  },
  JOB_KNIGHT: {
    id: 'JOB_KNIGHT',
    nameVi: 'Hiệp Sĩ',
    nameEn: 'Knight',
    weaponTypes: ['sword', 'shield'],
    combatStyle: 'tank_defense',
    primaryStat: 'VIT',
    secondaryStat: 'STR',
    vfxColor: '#eab308',
  },
  JOB_MONK: {
    id: 'JOB_MONK',
    nameVi: 'Tu Sĩ',
    nameEn: 'Monk',
    weaponTypes: ['staff', 'fist'],
    combatStyle: 'holy_support',
    primaryStat: 'INT',
    secondaryStat: 'WIS',
    vfxColor: '#f8fafc',
  },
  JOB_MAGE: {
    id: 'JOB_MAGE',
    nameVi: 'Pháp Sư',
    nameEn: 'Mage',
    weaponTypes: ['staff', 'spellbook'],
    combatStyle: 'elemental_magic',
    primaryStat: 'INT',
    secondaryStat: 'AGI',
    vfxColor: '#3b82f6',
  },
  JOB_ASSASSIN: {
    id: 'JOB_ASSASSIN',
    nameVi: 'Thích Khách',
    nameEn: 'Assassin',
    weaponTypes: ['daggers', 'throwing_knives'],
    combatStyle: 'speed_burst',
    primaryStat: 'AGI',
    secondaryStat: 'LUK',
    vfxColor: '#1e1b4b',
  },
  JOB_FIGHTER: {
    id: 'JOB_FIGHTER',
    nameVi: 'Đấu Sĩ',
    nameEn: 'Fighter',
    weaponTypes: ['gauntlets', 'knuckles'],
    combatStyle: 'martial_arts_brawler',
    primaryStat: 'STR',
    secondaryStat: 'VIT',
    vfxColor: '#ef4444',
  },
};

export interface CanonicalMonsterSpec {
  id: string;
  nameEn: string;
  nameVi: string;
  levelMin: number;
  levelMax: number;
  element: 'EARTH' | 'NATURE' | 'WIND' | 'WATER' | 'FIRE' | 'METAL';
  family: string;
  rarity: 'NORMAL' | 'ELITE' | 'RARE' | 'MINI_BOSS' | 'WORLD_BOSS';
  behavior: string;
  dropTableId: string;
}

export const WHISPERING_FOREST_MONSTERS: CanonicalMonsterSpec[] = [
  {
    id: 'MON_MOSS_SLIME',
    nameEn: 'Moss Slime',
    nameVi: 'Chất Nhầy Rêu',
    levelMin: 1,
    levelMax: 3,
    element: 'EARTH',
    family: 'SLIME',
    rarity: 'NORMAL',
    behavior: 'PASSIVE',
    dropTableId: 'DROP_MOSS_SLIME',
  },
  {
    id: 'MON_WILD_MUSHROOM',
    nameEn: 'Wild Mushroom',
    nameVi: 'Nấm Hoang',
    levelMin: 2,
    levelMax: 4,
    element: 'NATURE',
    family: 'FUNGUS',
    rarity: 'NORMAL',
    behavior: 'PASSIVE',
    dropTableId: 'DROP_WILD_MUSHROOM',
  },
  {
    id: 'MON_FOREST_RABBIT',
    nameEn: 'Forest Rabbit',
    nameVi: 'Thỏ Rừng',
    levelMin: 2,
    levelMax: 4,
    element: 'WIND',
    family: 'BEAST',
    rarity: 'NORMAL',
    behavior: 'FLEE_LOW_HP',
    dropTableId: 'DROP_FOREST_RABBIT',
  },
  {
    id: 'MON_THORN_BOAR',
    nameEn: 'Thorn Boar',
    nameVi: 'Lợn Rừng Gai',
    levelMin: 3,
    levelMax: 5,
    element: 'EARTH',
    family: 'BEAST',
    rarity: 'NORMAL',
    behavior: 'AGGRESSIVE',
    dropTableId: 'DROP_THORN_BOAR',
  },
  {
    id: 'MON_BARK_BEETLE',
    nameEn: 'Bark Beetle',
    nameVi: 'Bọ Vỏ Cây',
    levelMin: 4,
    levelMax: 6,
    element: 'EARTH',
    family: 'INSECT',
    rarity: 'NORMAL',
    behavior: 'AGGRESSIVE',
    dropTableId: 'DROP_BARK_BEETLE',
  },
  {
    id: 'MON_FOREST_WOLF',
    nameEn: 'Forest Wolf',
    nameVi: 'Sói Rừng',
    levelMin: 5,
    levelMax: 7,
    element: 'WIND',
    family: 'CANINE',
    rarity: 'NORMAL',
    behavior: 'PACK_AGGRESSIVE',
    dropTableId: 'DROP_FOREST_WOLF',
  },
  {
    id: 'MON_POISON_MUSHROOM',
    nameEn: 'Poison Mushroom',
    nameVi: 'Nấm Độc',
    levelMin: 6,
    levelMax: 8,
    element: 'WATER',
    family: 'FUNGUS',
    rarity: 'ELITE',
    behavior: 'AGGRESSIVE',
    dropTableId: 'DROP_POISON_MUSHROOM',
  },
  {
    id: 'MON_GOBLIN_SCOUT',
    nameEn: 'Goblin Scout',
    nameVi: 'Goblin Trinh Sát',
    levelMin: 7,
    levelMax: 9,
    element: 'METAL',
    family: 'GOBLIN',
    rarity: 'NORMAL',
    behavior: 'RANGED_AGGRESSIVE',
    dropTableId: 'DROP_GOBLIN_SCOUT',
  },
  {
    id: 'MON_GOBLIN_WARRIOR',
    nameEn: 'Goblin Warrior',
    nameVi: 'Goblin Chiến Binh',
    levelMin: 8,
    levelMax: 10,
    element: 'FIRE',
    family: 'GOBLIN',
    rarity: 'ELITE',
    behavior: 'AGGRESSIVE',
    dropTableId: 'DROP_GOBLIN_WARRIOR',
  },
  {
    id: 'BOSS_VERDANT_GUARDIAN',
    nameEn: 'Verdant Guardian',
    nameVi: 'Hộ Vệ Rừng Xanh',
    levelMin: 10,
    levelMax: 10,
    element: 'NATURE',
    family: 'ANCIENT_GUARDIAN',
    rarity: 'MINI_BOSS',
    behavior: 'BOSS_PHASED',
    dropTableId: 'DROP_VERDANT_GUARDIAN',
  },
];

export interface CanonicalNpcSpec {
  id: string;
  name: string;
  titleVi: string;
  role: string;
  mapId: string;
  gridCoord: { tx: number; ty: number };
  direction: string;
  services: string[];
}

export const CANONICAL_TEN_NPCS: CanonicalNpcSpec[] = [
  { id: 'NPC_ALDRIC', name: 'Aldric', titleVi: 'Trưởng Thôn Khởi Nguyên', role: 'village_chief', mapId: 'MAP_EMBER_VILLAGE', gridCoord: { tx: 15, ty: 17 }, direction: 'south', services: ['main_quest'] },
  { id: 'NPC_BROM', name: 'Brom', titleVi: 'Thợ Rèn Bậc Thầy', role: 'blacksmith', mapId: 'MAP_EMBER_VILLAGE', gridCoord: { tx: 24, ty: 12 }, direction: 'west', services: ['forge', 'repair'] },
  { id: 'NPC_LYRA', name: 'Lyra', titleVi: 'Thương Nhân Du Mục', role: 'merchant', mapId: 'MAP_EMBER_VILLAGE', gridCoord: { tx: 19, ty: 14 }, direction: 'south', services: ['shop', 'potions'] },
  { id: 'NPC_KAEL', name: 'Kael', titleVi: 'Thợ Săn Rừng Sâu', role: 'hunter', mapId: 'MAP_EMBER_VILLAGE', gridCoord: { tx: 32, ty: 18 }, direction: 'south_west', services: ['bounties'] },
  { id: 'NPC_ELIN', name: 'Elin', titleVi: 'Nhà Thảo Dược', role: 'herbalist', mapId: 'MAP_EMBER_VILLAGE', gridCoord: { tx: 8, ty: 14 }, direction: 'east', services: ['alchemy', 'gather'] },
  { id: 'NPC_SERAPHINE', name: 'Seraphine', titleVi: 'Đại Tư Tế Dexica', role: 'dexica_high_priestess', mapId: 'MAP_DEXICA_SANCTUARY', gridCoord: { tx: 16, ty: 8 }, direction: 'south', services: ['job_awakening'] },
  { id: 'NPC_MIRA', name: 'Mira', titleVi: 'Chủ Quán Trọ Trăng Rằm', role: 'innkeeper', mapId: 'MAP_EMBER_VILLAGE', gridCoord: { tx: 12, ty: 22 }, direction: 'south', services: ['save_point'] },
  { id: 'NPC_ROWAN', name: 'Rowan', titleVi: 'Đội Trưởng Lính Gác', role: 'guard_captain', mapId: 'MAP_EMBER_VILLAGE', gridCoord: { tx: 16, ty: 29 }, direction: 'south', services: ['defense'] },
  { id: 'NPC_ORWEN', name: 'Orwen', titleVi: 'Nhà Nghiên Cứu Ma Thuật', role: 'scholar_mage', mapId: 'MAP_EMBER_VILLAGE', gridCoord: { tx: 28, ty: 9 }, direction: 'west', services: ['respec'] },
  { id: 'NPC_FELIX', name: 'Felix', titleVi: 'Người Vận Chuyển Xuyên Lục Địa', role: 'transporter', mapId: 'MAP_EMBER_VILLAGE', gridCoord: { tx: 16, ty: 4 }, direction: 'south', services: ['fast_travel'] },
];

export interface CanonicalMapRegionSpec {
  id: string;
  nameVi: string;
  nameEn: string;
  type: string;
  recommendedLevel: { min: number; max: number };
  isSafeZone: boolean;
}

export const CANONICAL_TEN_REGIONS: CanonicalMapRegionSpec[] = [
  { id: 'MAP_ELYSIA_CAPITAL', nameVi: 'Kinh Đô Elysia', nameEn: 'Elysia Capital', type: 'METROPOLIS_HUB', recommendedLevel: { min: 1, max: 99 }, isSafeZone: true },
  { id: 'MAP_EMBER_VILLAGE', nameVi: 'Thôn Khởi Nguyên', nameEn: 'Ember Village', type: 'NOVICE_VILLAGE', recommendedLevel: { min: 1, max: 10 }, isSafeZone: true },
  { id: 'MAP_DEXICA_SANCTUARY', nameVi: 'Thánh Đường Dexica', nameEn: 'Dexica Sanctuary', type: 'HOLY_SANCTUARY', recommendedLevel: { min: 10, max: 99 }, isSafeZone: true },
  { id: 'MAP_WHISPERING_FOREST', nameVi: 'Rừng Thì Thầm', nameEn: 'Whispering Forest', type: 'HUNTING_FIELD', recommendedLevel: { min: 1, max: 8 }, isSafeZone: false },
  { id: 'MAP_GOBLIN_OUTPOST', nameVi: 'Trại Tiền Đồn Goblin', nameEn: 'Goblin Outpost', type: 'ENEMY_STRONGHOLD', recommendedLevel: { min: 8, max: 12 }, isSafeZone: false },
  { id: 'MAP_MISTY_LAKE', nameVi: 'Hồ Sương Mù', nameEn: 'Misty Lake', type: 'HUNTING_FIELD', recommendedLevel: { min: 10, max: 15 }, isSafeZone: false },
  { id: 'MAP_EMBER_WASTES', nameVi: 'Hoang Mạc Tro', nameEn: 'Ember Wastes', type: 'WILDERNESS', recommendedLevel: { min: 15, max: 20 }, isSafeZone: false },
  { id: 'MAP_FLAME_CAVERN', nameVi: 'Hỏa Diệm Động', nameEn: 'Flame Cavern', type: 'DUNGEON', recommendedLevel: { min: 18, max: 24 }, isSafeZone: false },
  { id: 'MAP_FROSTVEIL_HIGHLANDS', nameVi: 'Cao Nguyên Băng', nameEn: 'Frostveil Highlands', type: 'WILDERNESS', recommendedLevel: { min: 22, max: 30 }, isSafeZone: false },
  { id: 'MAP_GRAVEVEIL', nameVi: 'Thung Lũng Tử Linh', nameEn: 'Graveveil', type: 'CURSED_LAND', recommendedLevel: { min: 30, max: 42 }, isSafeZone: false },
];

export function validateWorldDesignBible(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check unique job IDs
  const jobIds = Object.keys(CANONICAL_SEVEN_JOBS);
  if (jobIds.length !== 7) {
    errors.push(`Expected exactly 7 canonical jobs, found ${jobIds.length}`);
  }

  // Check unique monster IDs
  const monsterIds = new Set<string>();
  for (const m of WHISPERING_FOREST_MONSTERS) {
    if (monsterIds.has(m.id)) {
      errors.push(`Duplicate monster ID: ${m.id}`);
    }
    monsterIds.add(m.id);
  }
  if (monsterIds.size !== 10) {
    errors.push(`Expected exactly 10 beginner forest monsters, found ${monsterIds.size}`);
  }

  // Check unique NPC IDs
  const npcIds = new Set<string>();
  for (const npc of CANONICAL_TEN_NPCS) {
    if (npcIds.has(npc.id)) {
      errors.push(`Duplicate NPC ID: ${npc.id}`);
    }
    npcIds.add(npc.id);
  }
  if (npcIds.size !== 10) {
    errors.push(`Expected exactly 10 canonical NPCs, found ${npcIds.size}`);
  }

  // Check unique Region IDs
  const regionIds = new Set<string>();
  for (const reg of CANONICAL_TEN_REGIONS) {
    if (regionIds.has(reg.id)) {
      errors.push(`Duplicate region ID: ${reg.id}`);
    }
    regionIds.add(reg.id);
  }
  if (regionIds.size !== 10) {
    errors.push(`Expected exactly 10 canonical regions, found ${regionIds.size}`);
  }

  return { valid: errors.length === 0, errors };
}

export interface PotentialPointsCharacterContext {
  classId?: string | null;
  jobAdvancementCompleted?: boolean;
  evolutionTier?: number;
  evolutionStage?: number;
  level?: number;
}

/**
 * Standardized Potential Points per Level Formula:
 * - Tân thủ (Novice/Adventurer): +1 point per level
 * - Chuyển Job lần 1 (First Job): +2 points per level
 * - Chuyển Job lần 3 (Third Job / Master): +3 points per level
 */
export function getPotentialPointsPerLevel(char?: PotentialPointsCharacterContext | null): number {
  if (!char) return 1;
  const rawClass = (char.classId || '').toLowerCase().trim();
  const isNovice = !rawClass || rawClass === 'novice' || rawClass === 'adventurer' || rawClass === 'tan_thu';

  if (isNovice && !char.jobAdvancementCompleted) {
    return 1;
  }

  const tier = Math.max(1, Number(char.evolutionTier ?? char.evolutionStage ?? (char.jobAdvancementCompleted ? 1 : 0)));
  if (tier >= 3) {
    return 3;
  }
  if (tier >= 1 || char.jobAdvancementCompleted || !isNovice) {
    return 2;
  }
  return 1;
}

