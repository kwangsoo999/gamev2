import test from 'node:test';
import assert from 'node:assert/strict';
import { getPotentialPointsPerLevel } from '@elysia/game-data-schema';

test('1. Potential Points Formula Enforces Novice +1, First Job +2, Third Job +3', () => {
  // Novice / Adventurer
  assert.equal(getPotentialPointsPerLevel({ classId: 'adventurer', jobAdvancementCompleted: false, evolutionTier: 0 }), 1);
  assert.equal(getPotentialPointsPerLevel({ classId: 'novice', jobAdvancementCompleted: false }), 1);
  assert.equal(getPotentialPointsPerLevel({ classId: '', jobAdvancementCompleted: false }), 1);
  assert.equal(getPotentialPointsPerLevel(null), 1);

  // First Job (Lv.10+ Awakened)
  assert.equal(getPotentialPointsPerLevel({ classId: 'warrior', jobAdvancementCompleted: true, evolutionTier: 1 }), 2);
  assert.equal(getPotentialPointsPerLevel({ classId: 'mage', jobAdvancementCompleted: true, evolutionTier: 1 }), 2);
  assert.equal(getPotentialPointsPerLevel({ classId: 'JOB_SWORDSMAN', jobAdvancementCompleted: true, evolutionTier: 1 }), 2);

  // Second Job
  assert.equal(getPotentialPointsPerLevel({ classId: 'sword_saint', jobAdvancementCompleted: true, evolutionTier: 2 }), 2);

  // Third Job (Transcended / Master)
  assert.equal(getPotentialPointsPerLevel({ classId: 'grand_master', jobAdvancementCompleted: true, evolutionTier: 3 }), 3);
  assert.equal(getPotentialPointsPerLevel({ classId: 'JOB_KNIGHT', jobAdvancementCompleted: true, evolutionTier: 4 }), 3);
});

test('2. Inventory Sorting Merges Duplicate Stackable Items & Sorts by Category & Rarity', () => {
  const inventory = [
    { id: 'inv_potion_hp', name: 'Bình Sinh Lực Nhỏ', category: 'consumable', rarity: 'common', qty: 10 },
    { id: 'eq_sword_steel', name: 'Kiếm Thép', category: 'equip', rarity: 'rare', qty: 1, requiredLevel: 5 },
    { id: 'inv_potion_hp', name: 'Bình Sinh Lực Nhỏ', category: 'consumable', rarity: 'common', qty: 15 },
    { id: 'mat_ore', name: 'Quặng Sắt', category: 'material', rarity: 'uncommon', qty: 5 },
    { id: 'eq_dagger', name: 'Dao Găm Săn', category: 'equip', rarity: 'uncommon', qty: 1, requiredLevel: 2 },
  ];

  // Merge stackable items
  const mergedList = [];
  for (const item of inventory) {
    const isStackable = item.category === 'consumable' || item.category === 'material';
    if (isStackable) {
      const existing = mergedList.find((m) => m.id === item.id && (m.qty || 1) < 99);
      if (existing) {
        const space = 99 - (existing.qty || 1);
        const add = Math.min(space, item.qty || 1);
        existing.qty = (existing.qty || 1) + add;
        const remaining = (item.qty || 1) - add;
        if (remaining > 0) mergedList.push({ ...item, qty: remaining });
        continue;
      }
    }
    mergedList.push({ ...item });
  }

  assert.equal(mergedList.filter((i) => i.id === 'inv_potion_hp').length, 1);
  assert.equal(mergedList.find((i) => i.id === 'inv_potion_hp').qty, 25);

  // Sort
  const catRank = { equip: 1, consumable: 2, material: 3, quest: 4 };
  const rarRank = { mythic: 1, legendary: 2, epic: 3, rare: 4, uncommon: 5, common: 6 };
  mergedList.sort((a, b) => {
    const ca = catRank[a.category] || 9;
    const cb = catRank[b.category] || 9;
    if (ca !== cb) return ca - cb;
    const ra = rarRank[a.rarity] || 9;
    const rb = rarRank[b.rarity] || 9;
    if (ra !== rb) return ra - rb;
    const la = a.requiredLevel ?? 0;
    const lb = b.requiredLevel ?? 0;
    if (la !== lb) return lb - la;
    return String(a.name).localeCompare(String(b.name), 'vi');
  });

  assert.equal(mergedList[0].id, 'eq_sword_steel'); // Equip Rare
  assert.equal(mergedList[1].id, 'eq_dagger');      // Equip Uncommon
  assert.equal(mergedList[2].id, 'inv_potion_hp');  // Consumable (merged 25x)
  assert.equal(mergedList[3].id, 'mat_ore');        // Material
});

test('3. Equipment Durability Repair Restores 100% and Calculates Fair Fee', () => {
  const equipment = {
    weapon: { id: 'eq_1', name: 'Kiếm', durability: 45, maxDurability: 100 },
    armor: { id: 'eq_2', name: 'Giáp', durability: 80, maxDurability: 100 },
    boots: { id: 'eq_3', name: 'Ủng', durability: 100, maxDurability: 100 },
  };

  let gold = 500;
  const equippedList = Object.values(equipment);
  let totalDamagedCount = 0;
  for (const it of equippedList) {
    if ((it.durability ?? 100) < (it.maxDurability ?? 100)) totalDamagedCount++;
    it.durability = it.maxDurability;
  }

  assert.equal(totalDamagedCount, 2); // weapon and armor were damaged
  const repairFee = totalDamagedCount * 20; // 40 gold
  gold -= repairFee;

  assert.equal(gold, 460);
  assert.equal(equipment.weapon.durability, 100);
  assert.equal(equipment.armor.durability, 100);
  assert.equal(equipment.boots.durability, 100);
});

test('4. Discard Guards Prevent Losing Quest, Bound or Unique Items', () => {
  const questItem = { id: 'ITEM_AWAKENING_CERTIFICATE', name: 'Giấy Chứng Nhận Thức Tỉnh', category: 'quest', isUnique: true };
  const boundItem = { id: 'eq_legend', name: 'Gươm Thần', isCharacterBound: true };
  const lockedItem = { id: 'eq_rare', name: 'Nón Hiếm', isLocked: true };
  const regularItem = { id: 'inv_bread', name: 'Bánh Mì', category: 'consumable', qty: 5 };

  function canDiscard(item) {
    if (
      item.isUnique ||
      item.isLocked ||
      item.bound ||
      item.isCharacterBound ||
      item.isAccountBound ||
      item.category === 'quest' ||
      item.id === 'ITEM_AWAKENING_CERTIFICATE' ||
      item.id.startsWith('QUEST_')
    ) {
      return false;
    }
    return true;
  }

  assert.equal(canDiscard(questItem), false);
  assert.equal(canDiscard(boundItem), false);
  assert.equal(canDiscard(lockedItem), false);
  assert.equal(canDiscard(regularItem), true);
});
