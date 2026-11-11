import { ClassId, EquipmentSlotId, ItemRarity, RarityTierConfig } from '@elysia/game-types';

export const CANONICAL_EQUIP_SLOTS: EquipmentSlotId[] = [
  'weapon',
  'head',
  'armor',
  'gloves',
  'boots',
  'shoulder',
  'necklace',
  'ring1',
  'ring2',
  'cloak',
];

export const SLOT_LABELS_VI: Record<EquipmentSlotId, string> = {
  weapon: 'Vũ Khí',
  head: 'Mũ / Nón',
  armor: 'Áo Giáp',
  gloves: 'Găng Tay',
  boots: 'Giày / Ủng',
  shoulder: 'Vai Giáp',
  necklace: 'Dây Chuyền',
  ring1: 'Nhẫn Trái',
  ring2: 'Nhẫn Phải',
  cloak: 'Áo Choàng',
};

export const RARITY_CONFIGS: Record<ItemRarity, RarityTierConfig> = {
  common: {
    rarity: 'common',
    label: 'Common',
    labelVi: 'Thường',
    colorHex: '#e2e8f0',
    borderHex: '#64748b',
    bgHex: 'rgba(100, 116, 139, 0.16)',
    statMultiplier: 1.0,
    minBonusLines: 0,
    maxBonusLines: 0,
    maxUpgradeLevel: 5,
  },
  uncommon: {
    rarity: 'uncommon',
    label: 'Uncommon',
    labelVi: 'Tinh Xảo',
    colorHex: '#34d399',
    borderHex: '#10b981',
    bgHex: 'rgba(16, 185, 129, 0.16)',
    statMultiplier: 1.18,
    minBonusLines: 1,
    maxBonusLines: 1,
    maxUpgradeLevel: 7,
  },
  rare: {
    rarity: 'rare',
    label: 'Rare',
    labelVi: 'Hiếm',
    colorHex: '#60a5fa',
    borderHex: '#3b82f6',
    bgHex: 'rgba(59, 130, 246, 0.18)',
    statMultiplier: 1.38,
    minBonusLines: 2,
    maxBonusLines: 2,
    maxUpgradeLevel: 8,
  },
  epic: {
    rarity: 'epic',
    label: 'Epic',
    labelVi: 'Sử Thi',
    colorHex: '#c084fc',
    borderHex: '#a855f7',
    bgHex: 'rgba(168, 85, 247, 0.20)',
    statMultiplier: 1.65,
    minBonusLines: 2,
    maxBonusLines: 3,
    maxUpgradeLevel: 10,
  },
  legendary: {
    rarity: 'legendary',
    label: 'Legendary',
    labelVi: 'Huyền Thoại',
    colorHex: '#fbbf24',
    borderHex: '#f59e0b',
    bgHex: 'rgba(245, 158, 11, 0.22)',
    statMultiplier: 1.95,
    minBonusLines: 3,
    maxBonusLines: 4,
    maxUpgradeLevel: 12,
  },
  mythic: {
    rarity: 'mythic',
    label: 'Mythic',
    labelVi: 'Thần Thoại',
    colorHex: '#fb7185',
    borderHex: '#f43f5e',
    bgHex: 'rgba(244, 63, 94, 0.24)',
    statMultiplier: 2.3,
    minBonusLines: 4,
    maxBonusLines: 5,
    maxUpgradeLevel: 15,
  },
};

export const CLASS_WEAPON_PROFICIENCY: Record<string, string[]> = {
  adventurer: ['sword', 'dagger', 'bow', 'staff'],
  novice: ['sword', 'dagger', 'bow', 'staff'],
  swordsman: ['sword', 'greatsword'],
  spearman: ['spear', 'halberd', 'lance'],
  knight: ['sword', 'shield'],
  monk: ['staff', 'holy_staff'],
  priest: ['staff', 'holy_staff'],
  mage: ['spellbook', 'book', 'staff'],
  assassin: ['dual_daggers', 'dagger'],
  fighter: ['gauntlets', 'fist'],
  archer: ['bow', 'crossbow'],
};

const SLOT_ALIAS_MAP: Record<string, EquipmentSlotId> = {
  weapon: 'weapon',
  mainHand: 'weapon',
  main_hand: 'weapon',
  head: 'head',
  helm: 'head',
  helmet: 'head',
  armor: 'armor',
  chest: 'armor',
  body: 'armor',
  gloves: 'gloves',
  boots: 'boots',
  shoulder: 'shoulder',
  pauldrons: 'shoulder',
  necklace: 'necklace',
  amulet: 'necklace',
  ring1: 'ring1',
  ring2: 'ring2',
  ring: 'ring1',
  cloak: 'cloak',
  cape: 'cloak',
  offhand: 'cloak',
};

export function normalizeEquipSlot(
  requestedSlot?: string,
  itemCategory?: string,
  itemEquipSlot?: string
): EquipmentSlotId {
  if (requestedSlot && SLOT_ALIAS_MAP[requestedSlot]) {
    return SLOT_ALIAS_MAP[requestedSlot];
  }
  if (itemEquipSlot && SLOT_ALIAS_MAP[itemEquipSlot]) {
    return SLOT_ALIAS_MAP[itemEquipSlot];
  }
  if (itemCategory === 'weapon') return 'weapon';
  if (itemCategory === 'accessory') return 'necklace';
  return 'armor';
}

export function canClassEquipItem(
  classId: ClassId | string,
  characterLevel: number,
  item: any,
  overrideAllowedWeapons?: string[]
): { allowed: boolean; reason?: string } {
  if (!item) return { allowed: false, reason: 'Trang bị không tồn tại.' };
  const reqLv = Number(item.requiredLevel ?? 1);
  if (characterLevel < reqLv) {
    return { allowed: false, reason: `Cần đạt Lv.${reqLv} để trang bị ${item.name} (hiện tại Lv.${characterLevel}).` };
  }

  const allowedClasses: string[] = item.allowedClasses || item.requiredClasses || [];
  if (allowedClasses.length > 0 && !allowedClasses.includes('any') && !allowedClasses.includes(classId)) {
    return {
      allowed: false,
      reason: `Trang bị "${item.name}" không tương thích với chức nghiệp ${classId}!`,
    };
  }

  const subtype = String(item.itemSubtype || item.item_subtype || item.weaponType || '').toLowerCase();
  const slot = normalizeEquipSlot(undefined, item.category, item.equipSlot);
  if ((item.category === 'weapon' || slot === 'weapon') && subtype) {
    const classWeapons = overrideAllowedWeapons?.length
      ? overrideAllowedWeapons
      : (CLASS_WEAPON_PROFICIENCY[classId] || []);
    if (classWeapons.length > 0 && !classWeapons.includes(subtype)) {
      return {
        allowed: false,
        reason: `Vũ khí loại "${subtype}" bị hạn chế đối với chức nghiệp ${classId}!`,
      };
    }
  }

  return { allowed: true };
}
