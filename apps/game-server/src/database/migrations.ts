import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { JsonStore } from './jsonStore.js';
import { ENV } from '../config/env.js';
import {
  INITIAL_CLASSES,
  INITIAL_ITEMS,
  ORGANIZATION_AND_PROFESSION_ITEM_CATALOG,
  PROFESSION_MATERIALS,
  PROFESSION_TOOLS,
  computePermanentTitleBonuses,
  computeEarnedPassivePoints,
  computePassivePointsSpent,
  PASSIVE_PROGRESSION_CONFIG,
  DEFAULT_AUTO_COMBAT_CONFIG,
  isSafeVillageId,
} from '@elysia/game-data-schema';
import { TerritoryService } from '../services/territory.service.js';
import { MerchantMarketplaceService } from '../services/merchant.service.js';

export async function runMigrationsAndSeeds() {
  const store = JsonStore.getInstance();

  // 1. Seed Default Admin
  const adminExists = store.users.find((u) => u.username === 'admin');
  if (!adminExists) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('admin123', salt);
    store.users.push({
      id: 'USR_ADMIN_001',
      username: 'admin',
      email: 'admin@elysiandensetsu.com',
      passwordHash,
      role: 'admin',
      createdAt: new Date().toISOString(),
    });
    console.log('[Migration] Created default admin account: admin / admin123');
  }

  // 2. Seed Default Test Player
  const playerExists = store.users.find((u) => u.username === 'player');
  if (!playerExists) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('player123', salt);
    store.users.push({
      id: 'USR_PLAYER_001',
      username: 'player',
      email: 'player@elysiandensetsu.com',
      passwordHash,
      role: 'player',
      createdAt: new Date().toISOString(),
    });
  }

  // 3. Seed & sync World Items from canonical world_items.json + schema INITIAL_ITEMS
  const flatItemsFile = path.join(ENV.WORLD_DATA_PATH, 'world_items.json');
  const legacyItemsFile = path.join(ENV.WORLD_DATA_PATH, 'items/world_items.json');
  const uniqueItemsFile = path.join(ENV.WORLD_DATA_PATH, 'unique_equipment.json');
  const titlesFile = path.join(ENV.WORLD_DATA_PATH, 'titles.json');
  const worldConfigFile = path.join(ENV.WORLD_DATA_PATH, 'world_config.json');
  const worldItemsFile = fs.existsSync(flatItemsFile) ? flatItemsFile : legacyItemsFile;
  const seedPool: any[] = [
    ...INITIAL_ITEMS,
    ...PROFESSION_MATERIALS.map((m) => ({
      ...m,
      category: 'material',
      stackable: true,
      price: m.baseValueGold,
      isTradable: true,
    })),
    ...PROFESSION_TOOLS.map((t) => ({
      ...t,
      category: 'tool',
      stackable: false,
      price: t.priceGold,
      isTradable: true,
    })),
    ...ORGANIZATION_AND_PROFESSION_ITEM_CATALOG,
    {
      id: PASSIVE_PROGRESSION_CONFIG.respecScrollItemId,
      name: 'Scroll of Passive Renewal',
      nameVi: 'Cuộn Tẩy Điểm Nội Tại',
      category: 'consumable',
      rarity: 'rare',
      stackable: true,
      price: 2500,
      isTradable: true,
      description: 'Tẩy toàn bộ điểm Nội Tại (Passive Tree) để phân bổ lại hướng build, vẫn giữ nguyên nhánh Lv.80.',
    },
  ];
  for (const extraFile of [worldItemsFile, uniqueItemsFile]) {
    if (fs.existsSync(extraFile)) {
      try {
        const loaded = JSON.parse(fs.readFileSync(extraFile, 'utf-8').replace(/^\uFEFF/, ''));
        for (const wi of loaded) {
          if (!seedPool.some((x) => x.id === wi.id)) seedPool.push(wi);
        }
      } catch (err) {
        console.error(`[Migration] Failed to sync ${extraFile}:`, err);
      }
    }
  }
  let titlesCatalog: any[] = [];
  let titleLimits: any = undefined;
  if (fs.existsSync(titlesFile)) {
    try {
      titlesCatalog = JSON.parse(fs.readFileSync(titlesFile, 'utf-8').replace(/^\uFEFF/, ''));
    } catch {
      titlesCatalog = [];
    }
  }
  if (fs.existsSync(worldConfigFile)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(worldConfigFile, 'utf-8').replace(/^\uFEFF/, ''));
      titleLimits = cfg?.titleBonusLimits;
    } catch {
      titleLimits = undefined;
    }
  }
  let addedItems = 0;
  for (const item of seedPool) {
    const existing = store.items.find((e: any) => e.id === item.id || e.itemId === item.id);
    if (!existing) {
      store.items.push({
        ...item,
        status: item.status || 'published',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      addedItems++;
    } else if (!existing.setId && item.setId) {
      existing.setId = item.setId;
      existing.equipSlot = existing.equipSlot || item.equipSlot;
      existing.allowedClasses = existing.allowedClasses || item.allowedClasses;
      existing.equipmentStats = existing.equipmentStats || item.equipmentStats;
    }
  }
  if (addedItems > 0) {
    console.log(`[Migration] Synced ${addedItems} new items into JsonStore`);
  }

  // 4. Seed Default Character (Lv.1 Adventurer) & migrate pre-job / skill / pity fields cleanly
  for (const ch of store.characters) {
    if (ch.classId === 'novice' && !ch.jobAdvancementCompleted) {
      ch.classId = 'adventurer';
    }
    if (ch.jobAdvancementCompleted === undefined) {
      ch.jobAdvancementCompleted = ch.classId !== 'adventurer';
    }
    if (typeof ch.availableAttributePoints !== 'number' && typeof ch.unspentStatPoints !== 'number') {
      ch.availableAttributePoints = 3;
      ch.unspentStatPoints = 3;
    } else if (typeof ch.unspentStatPoints !== 'number') {
      ch.unspentStatPoints = Number(ch.availableAttributePoints ?? 0);
    } else if (typeof ch.availableAttributePoints !== 'number') {
      ch.availableAttributePoints = Number(ch.unspentStatPoints ?? 0);
    }
    if (!ch.stats && ch.baseStats) {
      ch.stats = { ...ch.baseStats };
    }
    if (typeof ch.skillPoints !== 'number') {
      ch.skillPoints = ch.jobAdvancementCompleted ? Math.max(2, Number(ch.level || 15) - 13) : 0;
    }
    if (!ch.skillLevels || typeof ch.skillLevels !== 'object') {
      ch.skillLevels = {};
      for (const sid of (ch.unlockedSkills || [])) ch.skillLevels[sid] = 1;
    }
    if (!ch.pityCounters || typeof ch.pityCounters !== 'object') ch.pityCounters = {};
    if (!Array.isArray(ch.completedQuests)) {
      ch.completedQuests = [];
    }
    if (!ch.activeQuests || typeof ch.activeQuests !== 'object') ch.activeQuests = {};
    if (!Array.isArray(ch.discoveredHiddenQuests)) ch.discoveredHiddenQuests = [];
    if (!ch.questChainProgress || typeof ch.questChainProgress !== 'object') ch.questChainProgress = {};
    if (!Array.isArray(ch.visitedMaps)) ch.visitedMaps = [ch.regionId || 'THON_KHOI_NGUYEN'];
    if (!ch.monsterKillCounts || typeof ch.monsterKillCounts !== 'object') ch.monsterKillCounts = {};
    if (!Array.isArray(ch.dialogueFlags)) ch.dialogueFlags = [];
    if (!Array.isArray(ch.ownedUniqueEquipmentIds)) ch.ownedUniqueEquipmentIds = [];
    if (!Array.isArray(ch.unlockedTitles)) ch.unlockedTitles = [];
    if (ch.equippedCosmeticTitleId === undefined) ch.equippedCosmeticTitleId = null;
    if (!Array.isArray(ch.claimedRewardKeys)) ch.claimedRewardKeys = [];
    if (!ch.passiveAllocations || typeof ch.passiveAllocations !== 'object') ch.passiveAllocations = {};
    if (!Array.isArray(ch.passiveTransactions)) ch.passiveTransactions = [];
    if (typeof ch.passiveRespecCount !== 'number') ch.passiveRespecCount = 0;
    const passiveEarnedInfo = computeEarnedPassivePoints(ch);
    const passiveSpent = computePassivePointsSpent(ch.passiveAllocations);
    ch.passivePointsSpent = passiveSpent;
    ch.passivePoints = Math.max(0, passiveEarnedInfo.earned - passiveSpent);
    ch.cachedTitleBonuses = computePermanentTitleBonuses(
      ch.unlockedTitles,
      titlesCatalog,
      titleLimits,
      ch.equippedCosmeticTitleId
    );
    if (ch.equipment?.mainHand && !ch.equipment.weapon) {
      ch.equipment.weapon = ch.equipment.mainHand;
    }
    if (typeof ch.saveVersion !== 'number') ch.saveVersion = 1;
    if (!Array.isArray(ch.discoveredVillageIds) || ch.discoveredVillageIds.length === 0) {
      const seedVillages = new Set<string>(['THON_KHOI_NGUYEN']);
      if (isSafeVillageId(ch.regionId)) seedVillages.add(ch.regionId);
      for (const mId of ch.visitedMaps || []) {
        if (isSafeVillageId(mId)) seedVillages.add(mId);
      }
      ch.discoveredVillageIds = Array.from(seedVillages);
    } else if (!ch.discoveredVillageIds.includes('THON_KHOI_NGUYEN')) {
      ch.discoveredVillageIds.unshift('THON_KHOI_NGUYEN');
    }
    if (!ch.latestVillageCheckpointId || !ch.discoveredVillageIds.includes(ch.latestVillageCheckpointId)) {
      ch.latestVillageCheckpointId =
        isSafeVillageId(ch.regionId)
          ? ch.regionId
          : ch.discoveredVillageIds[ch.discoveredVillageIds.length - 1] || 'THON_KHOI_NGUYEN';
    }
    if (typeof ch.deathCount !== 'number') ch.deathCount = 0;
    if (ch.deathPenalty === undefined) ch.deathPenalty = null;
    if (!ch.autoCombatConfig || typeof ch.autoCombatConfig !== 'object') {
      ch.autoCombatConfig = { ...DEFAULT_AUTO_COMBAT_CONFIG };
    }
  }

  if (store.characters.length === 0) {
    const starterClass = INITIAL_CLASSES[0];
    store.characters.push({
      id: 'CHAR_DEFAULT_001',
      userId: 'USR_PLAYER_001',
      name: 'Airi_Kurogane',
      gender: 'female',
      classId: starterClass.id,
      jobAdvancementCompleted: false,
      availableAttributePoints: 3,
      unspentStatPoints: 3,
      skillPoints: 0,
      skillLevels: { SKILL_NOVICE_SLASH: 1, SKILL_NOVICE_FIREBALL: 1 },
      pityCounters: {},
      completedQuests: [],
      unlockedSkills: ['SKILL_NOVICE_SLASH', 'SKILL_NOVICE_FIREBALL'],
      level: 1,
      exp: 0,
      gold: 500,
      baseStats: { str: 10, dex: 10, agi: 10, int: 10, con: 10 },
      attributes: { str: 10, dex: 10, agi: 10, int: 10, con: 10 },
      stats: { str: 10, dex: 10, agi: 10, int: 10, con: 10 },
      appearance: {
        gender: 'female',
        hairstyleId: 'f_long',
        hairColor: '#1a1a24',
        eyeColor: '#2563eb',
      },
      equipment: {
        weapon: 'ITEM_SWORD_WOODEN_NOVICE',
      },
      inventory: [
        { slotId: 0, itemId: 'ITEM_POTION_HP_SMALL', quantity: 5 },
      ],
      regionId: 'THON_KHOI_NGUYEN',
      x: 552,
      y: 984,
      saveVersion: 1,
      discoveredVillageIds: ['THON_KHOI_NGUYEN'],
      latestVillageCheckpointId: 'THON_KHOI_NGUYEN',
      deathCount: 0,
      deathPenalty: null,
      autoCombatConfig: { ...DEFAULT_AUTO_COMBAT_CONFIG },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    console.log('[Migration] Seeded starter character Airi_Kurogane (Adventurer Lv.1)');
  }

  // Seed 5 Territories & Initial Supply Contracts (idempotent)
  TerritoryService.getInstance().ensureTerritoriesSeeded();
  MerchantMarketplaceService.getInstance().listSupplyContracts();

  store.save();
}
