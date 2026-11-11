import { JsonStore } from '../database/jsonStore.js';
import {
  CREATION_BONUS_POOL,
  MAX_BASE_STAT_LIMIT,
  validateCharacterName,
  validatePendingStatAllocations,
  validateStatAllocation,
} from '@elysia/validation';
import {
  ATTRIBUTE_POINTS_PER_LEVEL,
  INITIAL_CLASSES,
  INITIAL_EQUIPMENT_SETS,
  INITIAL_ITEMS,
  INITIAL_SKILLS,
  canClassEquipItem,
  checkUniqueEquipmentBinding,
  computeEquippedSetBonuses,
  computeExpRequiredForLevel,
  computePassiveAndBuffModifiers,
  computePermanentTitleBonuses,
  computeUniqueEquipmentBonuses,
  isPreJobClass,
  normalizeEquipSlot,
  normalizeBaseClassId,
  ADVANCED_JOB_BY_ID,
  aggregateCharacterStats,
  DEFAULT_AUTO_COMBAT_CONFIG,
  SAFE_VILLAGE_CHECKPOINTS,
  computeDeathPenaltyApplication,
  resolveResurrectionCheckpoint,
  getActiveDeathPenaltyReductionPct,
  isSafeVillageId,
  generateServerInitialAttributes,
  hasClientSubmittedInitialAttributes,
  validateInitialAttributesRange,
  computeCharacterRegenTick,
  resolveJobRegenProfile,
  DEFAULT_REGEN_STATE_CONFIG,
} from '@elysia/game-data-schema';
import { CombatBalanceMode } from '@elysia/game-types';
import { resolveGuildStatInputs } from './passive.service.js';
import { WorldService } from './world.service.js';
import { QuestTitleService } from './quest-title.service.js';
import { CharacterEntity, Gender, ClassId, PrimaryAttributes, CharacterAppearance } from '@elysia/game-types';

export class CharacterService {
  private static creationRateMap = new Map<string, number[]>();
  private store = JsonStore.getInstance();
  private world = WorldService.getInstance();

  async createCharacter(
    userId: string,
    payload: {
      name: string;
      gender: Gender;
      classId?: ClassId;
      appearance?: CharacterAppearance;
      stats?: PrimaryAttributes;
      baseStats?: PrimaryAttributes;
      attributes?: PrimaryAttributes;
      initialAttributes?: PrimaryAttributes;
      bonusAllocations?: Partial<PrimaryAttributes>;
      useCreationBonusPool?: boolean;
      simulateRapidRerollSpam?: boolean;
    }
  ): Promise<CharacterEntity> {
    if (!payload || typeof payload !== 'object') throw new Error('Dữ liệu nhân vật không hợp lệ.');
    const { name, gender, classId, appearance, bonusAllocations, useCreationBonusPool } = payload;
    if (gender !== 'male' && gender !== 'female') throw new Error('Giới tính nhân vật không hợp lệ.');

    // Phase 1 Rule: Reject client-submitted initial attributes
    if (hasClientSubmittedInitialAttributes(payload)) {
      const err: any = new Error(
        'Không chấp nhận chỉ số khởi tạo từ client. Máy chủ tự động khởi tạo ngẫu nhiên bảo mật [8..12].'
      );
      err.statusCode = 400;
      throw err;
    }

    // Phase 1 Rule: Prevent repeated character creation / reroll exploits
    const nowMs = Date.now();
    const recentTimestamps = (CharacterService.creationRateMap.get(userId) || []).filter((t) => nowMs - t < 10_000);
    if (payload.simulateRapidRerollSpam || recentTimestamps.length >= 6) {
      const err: any = new Error(
        'Phát hiện hành vi tạo nhân vật liên tục bất thường (Chống reroll exploit). Vui lòng thử lại sau ít giây.'
      );
      err.statusCode = 429;
      throw err;
    }
    recentTimestamps.push(nowMs);
    CharacterService.creationRateMap.set(userId, recentTimestamps);

    // 1. Validate name
    const nameCheck = validateCharacterName(name);
    if (!nameCheck.isValid) {
      throw new Error(nameCheck.error || 'Tên nhân vật không hợp lệ.');
    }

    const cleanName = name.trim();
    if (this.store.characters.some((c) => c.name.toLowerCase() === cleanName.toLowerCase())) {
      throw new Error(`Tên nhân vật "${cleanName}" đã có người sử dụng.`);
    }

    // 2. Strict Pre-Job Rule: New characters MUST begin as Lv.1 Adventurer (no manual class selection!)
    if (classId && !isPreJobClass(classId)) {
      const err: any = new Error(
        `Nhân vật mới bắt buộc khởi đầu là Adventurer ở cấp 1. Nghề "${classId}" sẽ được hệ thống tự động phân loại tại Lv.15!`
      );
      err.statusCode = 403;
      throw err;
    }

    // 3. Server-side CSPRNG initial attributes in [8..12] inclusive (total 40..60)
    const base = generateServerInitialAttributes();
    const initialRangeCheck = validateInitialAttributesRange(base);
    if (!initialRangeCheck.valid) {
      throw new Error(initialRangeCheck.error || 'Lỗi khởi tạo thuộc tính ngẫu nhiên.');
    }
    let finalStats: PrimaryAttributes = { ...base };
    let initialUnspentPoints = 3;

    if (useCreationBonusPool || bonusAllocations !== undefined) {
      const statKeys: (keyof PrimaryAttributes)[] = ['str', 'dex', 'agi', 'int', 'con'];
      const cleanBonus: PrimaryAttributes = { str: 0, dex: 0, agi: 0, int: 0, con: 0 };
      let totalBonus = 0;

      for (const k of Object.keys(bonusAllocations || {})) {
        if (!statKeys.includes(k as keyof PrimaryAttributes)) {
          throw new Error(`Thuộc tính không hợp lệ: ${k}`);
        }
        const v = Number((bonusAllocations as any)?.[k] ?? 0);
        if (!Number.isInteger(v) || v < 0) {
          throw new Error(`Điểm cộng khởi tạo cho ${k.toUpperCase()} phải là số nguyên không âm.`);
        }
        cleanBonus[k as keyof PrimaryAttributes] = v;
        totalBonus += v;
      }

      if (totalBonus > CREATION_BONUS_POOL) {
        const err: any = new Error(`Tổng điểm thưởng khởi tạo vượt quá ${CREATION_BONUS_POOL} điểm.`);
        err.statusCode = 400;
        throw err;
      }

      finalStats = {
        str: base.str + cleanBonus.str,
        dex: base.dex + cleanBonus.dex,
        agi: base.agi + cleanBonus.agi,
        int: base.int + cleanBonus.int,
        con: base.con + cleanBonus.con,
      };
      initialUnspentPoints = CREATION_BONUS_POOL - totalBonus;
    }

    const statCheck = validateStatAllocation(finalStats);
    if (!statCheck.isValid) {
      throw new Error(statCheck.error || 'Phân bổ chỉ số không hợp lệ.');
    }

    // 4. Configurable character slot limit per account from WorldConfig / Admin
    const maxSlots = this.world.getMaxCharactersPerAccount();
    const userChars = this.store.characters.filter((c) => c.userId === userId);
    if (userChars.length >= maxSlots) {
      throw new Error(`Tài khoản đã đạt giới hạn tối đa ${maxSlots} nhân vật.`);
    }

    const safeHairColor = typeof appearance?.hairColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(appearance.hairColor) ? appearance.hairColor : '#1a1a24';
    const safeEyeColor = typeof appearance?.eyeColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(appearance.eyeColor) ? appearance.eyeColor : '#2563eb';
    const defaultAppearance: CharacterAppearance = {
      gender,
      faceId: typeof appearance?.faceId === 'string' && appearance.faceId ? appearance.faceId : 'face_01',
      hairstyleId: appearance?.hairstyleId || (gender === 'female' ? 'f_long' : 'm_short'),
      hairColor: safeHairColor,
      eyeColor: safeEyeColor,
      outfitId: appearance?.outfitId || 'adventurer_tunic',
    };
    const createdTimestamp = new Date().toISOString();

    const newChar: CharacterEntity = {
      id: `CHAR_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      userId,
      name: cleanName,
      gender,
      classId: 'adventurer',
      jobAdvancementCompleted: false,
      evolutionTier: 0,
      sanctumCompleted: false,
      availableAttributePoints: initialUnspentPoints,
      unspentStatPoints: initialUnspentPoints,
      skillPoints: 0,
      skillLevels: { SKILL_NOVICE_SLASH: 1, SKILL_NOVICE_FIREBALL: 1 },
      pityCounters: {},
      completedQuests: [],
      activeQuests: {},
      discoveredHiddenQuests: [],
      questChainProgress: {},
      visitedMaps: ['THON_KHOI_NGUYEN'],
      monsterKillCounts: {},
      dialogueFlags: [],
      ownedUniqueEquipmentIds: [],
      unlockedTitles: [],
      equippedCosmeticTitleId: null,
      claimedRewardKeys: [],
      unlockedSkills: ['SKILL_NOVICE_SLASH', 'SKILL_NOVICE_FIREBALL'],
      level: 1,
      exp: 0,
      gold: 500,
      initialAttributes: { ...base },
      initialAttributesGeneratedAt: createdTimestamp,
      baseStats: { ...finalStats },
      attributes: { ...finalStats },
      allocatedStats: {
        str: finalStats.str - base.str,
        dex: finalStats.dex - base.dex,
        agi: finalStats.agi - base.agi,
        int: finalStats.int - base.int,
        con: finalStats.con - base.con,
      },
      stats: { ...finalStats },
      appearance: defaultAppearance,
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
      lastSavedAt: createdTimestamp,
      discoveredVillageIds: ['THON_KHOI_NGUYEN'],
      latestVillageCheckpointId: 'THON_KHOI_NGUYEN',
      checkpointUpdatedAt: createdTimestamp,
      deathPenalty: null,
      deathCount: 0,
      autoCombatConfig: { ...DEFAULT_AUTO_COMBAT_CONFIG },
      createdAt: createdTimestamp,
      lastLoginAt: createdTimestamp,
      updatedAt: createdTimestamp,
    };

    this.store.characters.push(newChar);
    const initialSummary = this.getComputedStatsSummary(newChar.id);
    newChar.maxHp = initialSummary.computed.maxHp;
    newChar.hp = initialSummary.computed.maxHp;
    newChar.maxMp = initialSummary.computed.maxMp;
    newChar.mp = initialSummary.computed.maxMp;
    this.store.save();

    return newChar;
  }

  /**
   * Server-validated transactional base attribute allocation.
   * Rejects negative values, non-integers, overspending, stat caps, and rolls back on failure.
   */
  async allocateAttributePoints(
    id: string,
    allocations: Partial<Record<keyof PrimaryAttributes, number>>
  ): Promise<CharacterEntity> {
    const char = this.store.characters.find((c) => c.id === id);
    if (!char) throw new Error('Nhân vật không tồn tại.');

    if (!char.baseStats) {
      char.baseStats = { str: 10, dex: 10, agi: 10, int: 10, con: 10 };
    }
    if (!char.attributes) {
      char.attributes = { ...char.baseStats };
    }

    const available = Number(char.unspentStatPoints ?? char.availableAttributePoints ?? 0);
    const check = validatePendingStatAllocations(allocations, available, char.baseStats, MAX_BASE_STAT_LIMIT);
    if (!check.isValid) {
      const err: any = new Error(check.error || 'Dữ liệu phân bổ điểm thuộc tính không hợp lệ.');
      err.statusCode = 400;
      throw err;
    }

    const keys: (keyof PrimaryAttributes)[] = ['str', 'dex', 'agi', 'int', 'con'];
    const cleanDelta: Record<keyof PrimaryAttributes, number> = { str: 0, dex: 0, agi: 0, int: 0, con: 0 };
    let totalSpent = 0;
    for (const k of keys) {
      const val = Number((allocations as any)[k] ?? 0);
      cleanDelta[k] = val;
      totalSpent += val;
    }

    const rollbackSnapshot = {
      baseStats: { ...char.baseStats },
      attributes: { ...char.attributes },
      stats: char.stats ? { ...char.stats } : { ...char.baseStats },
      availableAttributePoints: char.availableAttributePoints,
      unspentStatPoints: char.unspentStatPoints,
      hp: char.hp,
      maxHp: char.maxHp,
      mp: char.mp,
      maxMp: char.maxMp,
      updatedAt: char.updatedAt,
    };

    try {
      const prevMaxHp = Number(char.maxHp ?? this.getComputedStatsSummary(char.id).computed.maxHp);
      const prevMaxMp = Number(char.maxMp ?? this.getComputedStatsSummary(char.id).computed.maxMp);

      for (const k of keys) {
        const nextVal = Number(char.baseStats[k] || 10) + cleanDelta[k];
        char.baseStats[k] = nextVal;
        char.attributes[k] = nextVal;
      }
      char.stats = { ...char.baseStats };

      const nextAvailable = available - totalSpent;
      char.availableAttributePoints = nextAvailable;
      char.unspentStatPoints = nextAvailable;

      const updatedSummary = this.getComputedStatsSummary(char.id);
      const nextMaxHp = updatedSummary.computed.maxHp;
      const nextMaxMp = updatedSummary.computed.maxMp;
      const hpDelta = Math.max(0, nextMaxHp - prevMaxHp);
      const mpDelta = Math.max(0, nextMaxMp - prevMaxMp);
      char.maxHp = nextMaxHp;
      char.hp = Math.min(nextMaxHp, Number(char.hp ?? nextMaxHp) + hpDelta);
      char.maxMp = nextMaxMp;
      char.mp = Math.min(nextMaxMp, Number(char.mp ?? nextMaxMp) + mpDelta);
      char.updatedAt = new Date().toISOString();

      this.store.save();
      return char;
    } catch (error) {
      char.baseStats = rollbackSnapshot.baseStats;
      char.attributes = rollbackSnapshot.attributes;
      char.stats = rollbackSnapshot.stats;
      char.availableAttributePoints = rollbackSnapshot.availableAttributePoints;
      char.unspentStatPoints = rollbackSnapshot.unspentStatPoints;
      char.hp = rollbackSnapshot.hp;
      char.maxHp = rollbackSnapshot.maxHp;
      char.mp = rollbackSnapshot.mp;
      char.maxMp = rollbackSnapshot.maxMp;
      char.updatedAt = rollbackSnapshot.updatedAt;
      throw error;
    }
  }

  async completeQuest(id: string, questId: string) {
    return QuestTitleService.getInstance().claimQuestRewards(id, questId, { skipObjectiveCheck: true });
  }

  private getMergedItems() {
    const map = new Map<string, any>();
    const defaultShopAndStarterItems = [
      { id: 'shop_hp', itemId: 'shop_hp', name: 'Bình Sinh Lực Nhỏ', category: 'consumable', rarity: 'common', buyPrice: 35, sellPrice: 14, stackable: true },
      { id: 'shop_hp_pot', itemId: 'shop_hp_pot', name: 'Bình Sinh Lực Nhỏ', category: 'consumable', rarity: 'common', buyPrice: 35, sellPrice: 14, stackable: true },
      { id: 'shop_mp', itemId: 'shop_mp', name: 'Bình Ma Pháp Nhỏ', category: 'consumable', rarity: 'common', buyPrice: 30, sellPrice: 12, stackable: true },
      { id: 'shop_bread', itemId: 'shop_bread', name: 'Bánh Mì Nướng Ấm', category: 'consumable', rarity: 'common', buyPrice: 20, sellPrice: 8, stackable: true },
      { id: 'shop_scroll', itemId: 'shop_scroll', name: 'Cuộn Giấy Hồi Thành', category: 'consumable', rarity: 'rare', buyPrice: 80, sellPrice: 32, stackable: true },
      { id: 'shop_sword_steel', itemId: 'shop_sword_steel', name: 'Kiếm Thép Tinh Luyện', category: 'weapon', equipSlot: 'weapon', weaponType: 'sword', rarity: 'rare', buyPrice: 320, sellPrice: 128, stackable: false },
      { id: 'shop_sword_iron', itemId: 'shop_sword_iron', name: 'Kiếm Sắt Rèn Kỹ', category: 'weapon', equipSlot: 'weapon', weaponType: 'sword', rarity: 'uncommon', buyPrice: 180, sellPrice: 72, stackable: false },
      { id: 'shop_cloak_wind', itemId: 'shop_cloak_wind', name: 'Áo Choàng Lục Phong', category: 'armor', equipSlot: 'cloak', rarity: 'rare', buyPrice: 280, sellPrice: 112, stackable: false },
      { id: 'ITEM_UPGRADE_STONE_BASIC', itemId: 'ITEM_UPGRADE_STONE_BASIC', name: 'Đá Cường Hóa Sơ Cấp', category: 'material', rarity: 'uncommon', buyPrice: 150, sellPrice: 60, stackable: true },
      { id: 'inv_herb', itemId: 'inv_herb', name: 'Thảo Dược Xanh', category: 'material', rarity: 'common', buyPrice: 15, sellPrice: 6, stackable: true },
      { id: 'inv_wood', itemId: 'inv_wood', name: 'Gỗ Sồi Thôn Làng', category: 'material', rarity: 'common', buyPrice: 12, sellPrice: 5, stackable: true },
      { id: 'inv_ore', itemId: 'inv_ore', name: 'Quặng Sắt Thô', category: 'material', rarity: 'common', buyPrice: 25, sellPrice: 10, stackable: true },
      { id: 'inv_gem', itemId: 'inv_gem', name: 'Thủy Tinh Tím Cổ', category: 'material', rarity: 'epic', buyPrice: 200, sellPrice: 80, stackable: true },
    ];
    for (const it of defaultShopAndStarterItems) map.set(it.id, it);
    for (const it of INITIAL_ITEMS) map.set(it.id, it);
    for (const it of this.world.getWorldItems(false)) map.set(it.id, it);
    for (const it of this.world.getUniqueEquipment(false)) map.set(it.id, it);
    for (const it of this.store.items) map.set(it.id, it);
    return Array.from(map.values());
  }

  public getShopCatalog() {
    return this.getMergedItems().filter((it: any) => Number(it.buyPrice || it.price || 0) > 0 && !it.isUnique);
  }

  /**
   * Server-authoritative Shop Purchase:
   * - Validates item availability, quantity, gold, and 30-slot inventory capacity.
   * - Deducts gold, adds item(s) to inventory, persists to store, and triggers quest progress.
   */
  async buyShopItem(id: string, itemId: string, rawQuantity = 1) {
    const char = this.store.characters.find((c) => c.id === id);
    if (!char) throw new Error('Nhân vật không tồn tại.');
    const quantity = Math.floor(Number(rawQuantity ?? 1));
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 999) {
      const err: any = new Error('Số lượng mua không hợp lệ (1 - 999).');
      err.statusCode = 400;
      throw err;
    }

    const allItems = this.getMergedItems();
    const meta = allItems.find((it: any) => it.id === itemId || it.itemId === itemId);
    const unitPrice = Number(meta?.buyPrice ?? meta?.price ?? 0);
    if (!meta || unitPrice <= 0 || meta.isUnique) {
      const err: any = new Error(`Vật phẩm "${itemId}" không có sẵn trong cửa hàng.`);
      err.statusCode = 400;
      throw err;
    }

    const totalCost = unitPrice * quantity;
    if (Number(char.gold || 0) < totalCost) {
      const err: any = new Error('Không đủ vàng để mua vật phẩm.');
      err.statusCode = 400;
      throw err;
    }

    if (!Array.isArray(char.inventory)) char.inventory = [];
    const maxSlots = 30;
    const isStackable = meta.stackable !== false && !meta.isUnique && !meta.equipSlot && meta.category !== 'weapon' && meta.category !== 'armor' && meta.category !== 'equip' && meta.category !== 'equipment';
    const stackLimit = Math.max(1, Number(meta.stackLimit ?? meta.maxStack ?? 99));

    // Calculate how many new inventory slots are needed
    let remainingToPlace = quantity;
    if (isStackable) {
      for (const s of char.inventory) {
        if ((s.itemId || s.id) === meta.id && Number(s.quantity ?? s.qty ?? 1) < stackLimit) {
          const canAdd = Math.min(remainingToPlace, stackLimit - Number(s.quantity ?? s.qty ?? 1));
          remainingToPlace -= canAdd;
          if (remainingToPlace <= 0) break;
        }
      }
    }
    const newSlotsNeeded = isStackable ? Math.ceil(remainingToPlace / stackLimit) : quantity;
    if (char.inventory.length + newSlotsNeeded > maxSlots) {
      const err: any = new Error('Túi đồ không còn chỗ trống.');
      err.statusCode = 400;
      throw err;
    }

    // Deduct gold and add items
    char.gold = Number(char.gold || 0) - totalCost;
    if (isStackable) {
      let rem = quantity;
      for (const s of char.inventory) {
        if ((s.itemId || s.id) === meta.id && Number(s.quantity ?? s.qty ?? 1) < stackLimit) {
          const curQty = Number(s.quantity ?? s.qty ?? 1);
          const add = Math.min(rem, stackLimit - curQty);
          s.quantity = curQty + add;
          if (s.qty !== undefined) s.qty = s.quantity;
          rem -= add;
          if (rem <= 0) break;
        }
      }
      while (rem > 0) {
        const add = Math.min(rem, stackLimit);
        const used = new Set(char.inventory.map((s: any) => Number(s.slotId)));
        let slotId = 0;
        while (used.has(slotId)) slotId += 1;
        char.inventory.push({
          slotId,
          itemId: meta.id,
          name: meta.name,
          category: meta.category || 'consumable',
          rarity: meta.rarity || 'common',
          quantity: add,
        });
        rem -= add;
      }
    } else {
      for (let i = 0; i < quantity; i++) {
        const used = new Set(char.inventory.map((s: any) => Number(s.slotId)));
        let slotId = 0;
        while (used.has(slotId)) slotId += 1;
        char.inventory.push({
          slotId,
          itemId: meta.id,
          name: meta.name,
          category: meta.category || 'equipment',
          rarity: meta.rarity || 'common',
          quantity: 1,
        });
      }
    }

    char.saveVersion = Number(char.saveVersion || 0) + 1;
    char.updatedAt = new Date().toISOString();
    this.store.save();

    // Update COLLECT_ITEM / OBTAIN_ITEM quest objectives or hidden triggers
    QuestTitleService.getInstance().recordProgress(char.id, {
      type: 'COLLECT_ITEM',
      targetId: meta.id,
      amount: quantity,
    });

    return {
      success: true,
      characterId: char.id,
      itemId: meta.id,
      itemName: meta.name,
      quantity,
      unitPrice,
      totalCost,
      gold: char.gold,
      goldRemaining: char.gold,
      inventory: char.inventory,
      character: char,
      message: `Đã mua ${quantity}x ${meta.name} (-${totalCost} Vàng).`,
    };
  }

  /**
   * Server-authoritative Shop Sell:
   * - Verifies item ownership & quantity.
   * - Blocks selling equipped items, quest-bound items, unique items, or non-tradable items.
   * - Calculates server-side sell value, removes item quantity, adds gold, and persists.
   */
  async sellInventoryItem(id: string, itemId: string, rawQuantity = 1) {
    const char = this.store.characters.find((c) => c.id === id);
    if (!char) throw new Error('Nhân vật không tồn tại.');
    const quantity = Math.floor(Number(rawQuantity ?? 1));
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 9999) {
      const err: any = new Error('Số lượng bán không hợp lệ.');
      err.statusCode = 400;
      throw err;
    }

    if (!Array.isArray(char.inventory)) char.inventory = [];
    const allItems = this.getMergedItems();
    const meta = allItems.find((it: any) => it.id === itemId || it.itemId === itemId);

    const matchingSlots = char.inventory.filter((s: any) => (s.itemId || s.id) === itemId);
    const totalOwned = matchingSlots.reduce((sum: number, s: any) => sum + Number(s.quantity ?? s.qty ?? 1), 0);

    const equippedCount = Object.values(char.equipment || {}).filter((eqId) => eqId === itemId).length;
    if (equippedCount > 0 && totalOwned - equippedCount < quantity) {
      const err: any = new Error('Không thể bán vật phẩm đang được trang bị trên người.');
      err.statusCode = 400;
      throw err;
    }

    if (totalOwned < quantity) {
      const err: any = new Error('Số lượng vật phẩm trong túi không đủ để bán.');
      err.statusCode = 400;
      throw err;
    }

    const firstSlot = matchingSlots[0];
    const cat = String(meta?.category || meta?.itemType || firstSlot?.category || '').toLowerCase();
    const isQuestBound = cat === 'quest' || cat === 'quest_item' || Boolean(meta?.isQuestItem || firstSlot?.isQuestItem);
    const isUnique = Boolean(meta?.isUnique || firstSlot?.isUnique || (char.ownedUniqueEquipmentIds || []).includes(itemId));
    const isNonTradable =
      meta?.isSellable === false ||
      meta?.tradable === false ||
      meta?.isTradable === false ||
      Boolean(meta?.isCharacterBound || firstSlot?.boundCharacterId);

    if (isQuestBound || isUnique || isNonTradable) {
      const err: any = new Error('Vật phẩm nhiệm vụ, trang bị Độc Nhất hoặc vật phẩm khóa không thể bán.');
      err.statusCode = 400;
      throw err;
    }

    const unitSellPrice = Math.max(
      1,
      Number(meta?.sellPrice ?? firstSlot?.sellPrice ?? Math.floor(Number(meta?.buyPrice ?? firstSlot?.price ?? 25) * 0.4))
    );
    const totalGoldGain = unitSellPrice * quantity;

    let remToRemove = quantity;
    const nextInv: any[] = [];
    for (const s of char.inventory) {
      if ((s.itemId || s.id) !== itemId || remToRemove <= 0) {
        nextInv.push(s);
        continue;
      }
      const curQty = Number(s.quantity ?? s.qty ?? 1);
      if (curQty <= remToRemove) {
        remToRemove -= curQty;
      } else {
        s.quantity = curQty - remToRemove;
        if (s.qty !== undefined) s.qty = s.quantity;
        remToRemove = 0;
        nextInv.push(s);
      }
    }
    char.inventory = nextInv.map((s, idx) => ({ ...s, slotId: idx }));
    char.gold = Number(char.gold || 0) + totalGoldGain;
    char.saveVersion = Number(char.saveVersion || 0) + 1;
    char.updatedAt = new Date().toISOString();
    this.store.save();

    return {
      success: true,
      characterId: char.id,
      itemId,
      itemName: meta?.name || firstSlot?.name || itemId,
      quantity,
      unitSellPrice,
      totalGoldGain,
      totalGoldEarned: totalGoldGain,
      gold: char.gold,
      goldRemaining: char.gold,
      inventory: char.inventory,
      character: char,
      message: `Đã bán ${quantity}x ${meta?.name || firstSlot?.name || itemId} (+${totalGoldGain} Vàng).`,
    };
  }

  /**
   * Discards an item from character inventory (rejects equipped, quest, or unique items).
   */
  async discardInventoryItem(id: string, itemId: string, rawQuantity = 1) {
    const char = this.store.characters.find((c) => c.id === id);
    if (!char) throw new Error('Nhân vật không tồn tại.');
    const quantity = Math.max(1, Math.floor(Number(rawQuantity ?? 1)));
    if (!Array.isArray(char.inventory)) char.inventory = [];

    const allItems = this.getMergedItems();
    const meta = allItems.find((it: any) => it.id === itemId || it.itemId === itemId);
    const matchingSlots = char.inventory.filter((s: any) => (s.itemId || s.id) === itemId);
    const totalOwned = matchingSlots.reduce((sum: number, s: any) => sum + Number(s.quantity ?? s.qty ?? 1), 0);
    if (totalOwned < quantity) {
      const err: any = new Error('Không tìm thấy đủ số lượng vật phẩm để vứt bỏ.');
      err.statusCode = 400;
      throw err;
    }

    const equippedCount = Object.values(char.equipment || {}).filter((eqId) => eqId === itemId).length;
    if (equippedCount > 0 && totalOwned - equippedCount < quantity) {
      const err: any = new Error('Không thể vứt bỏ trang bị đang mặc trên người.');
      err.statusCode = 400;
      throw err;
    }

    const firstSlot = matchingSlots[0];
    const cat = String(meta?.category || meta?.itemType || firstSlot?.category || '').toLowerCase();
    if (cat === 'quest' || cat === 'quest_item' || meta?.isUnique || firstSlot?.isUnique) {
      const err: any = new Error('Không thể vứt bỏ vật phẩm nhiệm vụ hoặc trang bị Độc Nhất.');
      err.statusCode = 400;
      throw err;
    }

    let remToRemove = quantity;
    const nextInv: any[] = [];
    for (const s of char.inventory) {
      if ((s.itemId || s.id) !== itemId || remToRemove <= 0) {
        nextInv.push(s);
        continue;
      }
      const curQty = Number(s.quantity ?? s.qty ?? 1);
      if (curQty <= remToRemove) {
        remToRemove -= curQty;
      } else {
        s.quantity = curQty - remToRemove;
        if (s.qty !== undefined) s.qty = s.quantity;
        remToRemove = 0;
        nextInv.push(s);
      }
    }
    char.inventory = nextInv.map((s, idx) => ({ ...s, slotId: idx }));
    char.saveVersion = Number(char.saveVersion || 0) + 1;
    char.updatedAt = new Date().toISOString();
    this.store.save();

    return {
      success: true,
      characterId: char.id,
      itemId,
      discardedQuantity: quantity,
      inventory: char.inventory,
      character: char,
      message: `Đã vứt bỏ ${quantity}x ${meta?.name || firstSlot?.name || itemId}.`,
    };
  }

  /**
   * Stacks identical stackable items and sorts character inventory by category, rarity, and name.
   */
  async sortCharacterInventory(id: string) {
    const char = this.store.characters.find((c) => c.id === id);
    if (!char) throw new Error('Nhân vật không tồn tại.');
    if (!Array.isArray(char.inventory)) char.inventory = [];
    const allItems = this.getMergedItems();

    const rarityRank: Record<string, number> = {
      mythic: 6,
      legendary: 5,
      epic: 4,
      rare: 3,
      uncommon: 2,
      common: 1,
    };
    const catRank: Record<string, number> = {
      weapon: 1,
      armor: 2,
      equipment: 3,
      equip: 3,
      accessory: 4,
      consumable: 5,
      potion: 5,
      material: 6,
      quest: 7,
      quest_item: 7,
    };

    const mergedSlots: any[] = [];
    for (const raw of char.inventory) {
      const itemId = String(raw.itemId || raw.id);
      const qty = Math.max(1, Number(raw.quantity ?? raw.qty ?? 1));
      const meta = allItems.find((it: any) => it.id === itemId || it.itemId === itemId);
      const isStackable =
        meta
          ? meta.stackable !== false && !meta.isUnique && !meta.equipSlot
          : raw.category !== 'equip' && raw.category !== 'equipment' && raw.category !== 'weapon' && raw.category !== 'armor';
      const stackLimit = Math.max(1, Number(meta?.stackLimit ?? meta?.maxStack ?? 99));

      if (isStackable) {
        let rem = qty;
        for (const existing of mergedSlots) {
          if ((existing.itemId || existing.id) === itemId && Number(existing.quantity || 1) < stackLimit) {
            const add = Math.min(rem, stackLimit - Number(existing.quantity || 1));
            existing.quantity = Number(existing.quantity || 1) + add;
            rem -= add;
            if (rem <= 0) break;
          }
        }
        while (rem > 0) {
          const add = Math.min(rem, stackLimit);
          mergedSlots.push({
            ...raw,
            itemId,
            name: raw.name || meta?.name || itemId,
            category: raw.category || meta?.category || 'material',
            rarity: raw.rarity || meta?.rarity || 'common',
            quantity: add,
          });
          rem -= add;
        }
      } else {
        mergedSlots.push({
          ...raw,
          itemId,
          name: raw.name || meta?.name || itemId,
          category: raw.category || meta?.category || 'equipment',
          rarity: raw.rarity || meta?.rarity || 'common',
          quantity: 1,
        });
      }
    }

    mergedSlots.sort((a, b) => {
      const ca = catRank[String(a.category || '').toLowerCase()] ?? 9;
      const cb = catRank[String(b.category || '').toLowerCase()] ?? 9;
      if (ca !== cb) return ca - cb;
      const ra = rarityRank[String(a.rarity || 'common').toLowerCase()] ?? 1;
      const rb = rarityRank[String(b.rarity || 'common').toLowerCase()] ?? 1;
      if (ra !== rb) return rb - ra;
      return String(a.name || a.itemId).localeCompare(String(b.name || b.itemId), 'vi');
    });

    char.inventory = mergedSlots.map((s, idx) => ({ ...s, slotId: idx }));
    char.saveVersion = Number(char.saveVersion || 0) + 1;
    char.updatedAt = new Date().toISOString();
    this.store.save();

    return {
      success: true,
      characterId: char.id,
      inventory: char.inventory,
      character: char,
      message: 'Đã sắp xếp và gộp gọn hành trang Balo.',
    };
  }

  /**
   * Repairs all equipped gear for the character.
   */
  async repairCharacterEquipment(id: string) {
    const char = this.store.characters.find((c) => c.id === id);
    if (!char) throw new Error('Nhân vật không tồn tại.');
    const equippedCount = Object.keys(char.equipment || {}).length;
    const repairCost = equippedCount > 0 ? Math.min(Number(char.gold || 0), equippedCount * 10) : 0;
    char.gold = Math.max(0, Number(char.gold || 0) - repairCost);
    char.saveVersion = Number(char.saveVersion || 0) + 1;
    char.updatedAt = new Date().toISOString();
    this.store.save();

    return {
      success: true,
      characterId: char.id,
      repairCost,
      gold: char.gold,
      character: char,
      message: `Đã sửa chữa toàn bộ trang bị về độ bền tối đa (-${repairCost} Vàng).`,
    };
  }

  async equipItem(id: string, requestedSlot: string, itemId: string) {
    const char = this.store.characters.find((c) => c.id === id);
    if (!char) throw new Error('Nhân vật không tồn tại.');
    const allItems = this.getMergedItems();
    const item = allItems.find((it: any) => it.id === itemId || it.itemId === itemId);
    if (!item) throw new Error(`Vật phẩm "${itemId}" không tồn tại.`);

    if (item.isUnique) {
      if (item.isCharacterBound) {
        const invSlot = (char.inventory || []).find((s: any) => (s.itemId || s.item_id) === item.id);
        if (invSlot?.boundCharacterId && invSlot.boundCharacterId !== char.id) {
          const err: any = new Error(`Trang bị Unique "${item.name}" đã khóa với nhân vật khác.`);
          err.statusCode = 403;
          throw err;
        }
      }
      if (item.isAccountBound) {
        const invSlot = (char.inventory || []).find((s: any) => (s.itemId || s.item_id) === item.id);
        if (invSlot?.boundUserId && invSlot.boundUserId !== char.userId) {
          const err: any = new Error(`Trang bị Unique "${item.name}" đã khóa với tài khoản khác.`);
          err.statusCode = 403;
          throw err;
        }
      }
    }

    const classes = this.world.getClasses();
    const classDef = classes.find((c: any) => c.id === char.classId) || INITIAL_CLASSES.find((c) => c.id === char.classId);
    const check = canClassEquipItem(char.classId, Number(char.level || 1), item, classDef?.allowedWeapons);
    if (!check.allowed) {
      const err: any = new Error(check.reason || 'Không thể mặc trang bị này.');
      err.statusCode = 403;
      throw err;
    }

    const canonicalSlot = normalizeEquipSlot(requestedSlot, item.category, item.equipSlot);
    if (!char.equipment) char.equipment = {};
    if (canonicalSlot === 'weapon') {
      delete char.equipment.mainHand;
    }
    char.equipment[canonicalSlot] = item.id;
    char.updatedAt = new Date().toISOString();
    this.store.save();
    QuestTitleService.getInstance().recordProgress(char.id, {
      type: 'EQUIP_ITEM',
      targetId: item.id,
      amount: 1,
    });
    return char;
  }

  async unequipSlot(id: string, slot: string) {
    const char = this.store.characters.find((c) => c.id === id);
    if (!char) throw new Error('Nhân vật không tồn tại.');
    const canonicalSlot = normalizeEquipSlot(slot);
    if (char.equipment) {
      delete char.equipment[canonicalSlot];
      if (canonicalSlot === 'weapon') delete char.equipment.mainHand;
    }
    char.updatedAt = new Date().toISOString();
    this.store.save();
    return char;
  }

  async learnOrUpgradeSkill(id: string, rawSkillId: string) {
    const skillId = rawSkillId === 'skill_basic_attack' ? 'SKILL_NOVICE_SLASH' : rawSkillId;
    const char = this.store.characters.find((c) => c.id === id);
    if (!char) throw new Error('Nhân vật không tồn tại.');
    const skills = this.world.getSkills(false).length ? this.world.getSkills(false) : INITIAL_SKILLS;
    const skill = skills.find((s: any) => s.id === skillId);
    if (!skill) throw new Error(`Kỹ năng "${skillId}" không tồn tại.`);

    if (isPreJobClass(char.classId) && !['SKILL_NOVICE_SLASH', 'SKILL_NOVICE_FIREBALL'].includes(skill.id)) {
      const err: any = new Error('Tân Thủ (Novice) chỉ được học và nâng cấp 2 kỹ năng cơ bản: Trảm Kích & Tiểu Hỏa Cầu.');
      err.statusCode = 403;
      throw err;
    }

    if (
      normalizeBaseClassId(skill.classId) !== normalizeBaseClassId(char.classId) &&
      (!isPreJobClass(char.classId) || skill.classId !== 'adventurer')
    ) {
      const err: any = new Error(`Kỹ năng "${skill.name}" chỉ dành cho nghề ${skill.classId}.`);
      err.statusCode = 403;
      throw err;
    }
    if (skill.advancedBranchId) {
      if (!char.advancedJobId) {
        const err: any = new Error(
          `Cần đạt Lv.80 và chọn nhánh Chuyển Chức ${skill.advancedBranchId} trước khi học ${skill.name}.`
        );
        err.statusCode = 403;
        throw err;
      }
      if (char.advancedJobId !== skill.advancedBranchId) {
        const err: any = new Error(
          `Nhánh ${char.advancedJobName || char.advancedJobId} không thể học hoặc trang bị kỹ năng độc quyền của nhánh ${skill.advancedBranchId}!`
        );
        err.statusCode = 403;
        throw err;
      }
    }
    if (Number(char.level || 1) < Number(skill.requiredLevel || 1)) {
      const err: any = new Error(`Cần đạt Lv.${skill.requiredLevel} để học/nâng cấp ${skill.name}.`);
      err.statusCode = 403;
      throw err;
    }
    const prereqs: string[] = skill.prerequisiteSkillIds || [];
    const unlocked: string[] = Array.isArray(char.unlockedSkills) ? char.unlockedSkills : [];
    for (const reqId of prereqs) {
      if (!unlocked.includes(reqId)) {
        const err: any = new Error(`Cần học kỹ năng tiền đề (${reqId}) trước.`);
        err.statusCode = 403;
        throw err;
      }
    }

    if (!char.skillLevels || typeof char.skillLevels !== 'object') char.skillLevels = {};
    const curLv = Number(char.skillLevels[skillId] || (unlocked.includes(skillId) ? 1 : 0));
    const maxLv = Number(skill.maxLevel || 10);
    if (curLv >= maxLv) {
      throw new Error(`Kỹ năng ${skill.name} đã đạt cấp tối đa (${maxLv}).`);
    }

    const spCost = Number(skill.skillPointCost ?? skill.spCost ?? 1);
    const availableSp = Number(char.skillPoints ?? 0);
    if (availableSp < spCost) {
      throw new Error(`Không đủ Điểm Kỹ Năng (SP)! Cần ${spCost}, hiện có ${availableSp}.`);
    }

    char.skillPoints = availableSp - spCost;
    char.skillLevels[skillId] = curLv + 1;
    if (!unlocked.includes(skillId)) unlocked.push(skillId);
    char.unlockedSkills = unlocked;
    char.updatedAt = new Date().toISOString();
    this.store.save();

    return {
      characterId: char.id,
      skillId,
      newLevel: char.skillLevels[skillId],
      remainingSkillPoints: char.skillPoints,
      unlockedSkills: char.unlockedSkills,
    };
  }

  getComputedStatsSummary(id: string, mode: CombatBalanceMode = 'pve') {
    const char = this.store.characters.find((c) => c.id === id);
    if (!char) throw new Error('Nhân vật không tồn tại.');
    const base = char.baseStats || char.attributes || { str: 10, dex: 10, agi: 10, int: 10, con: 10 };
    const items = this.getMergedItems();
    const sets = this.world.getEquipmentSets(false).length ? this.world.getEquipmentSets(false) : INITIAL_EQUIPMENT_SETS;
    const skills = this.world.getSkills(false).length ? this.world.getSkills(false) : INITIAL_SKILLS;
    const uniqueCatalog = this.world.getUniqueEquipment(false);
    const titlesCatalog = this.world.getTitles(false);
    const titleLimits = this.world.getTitleBonusLimits();
    const upgradeLevels = (char as any).equipmentUpgradeLevels || {};
    const { guildSkills, guildBuildingLevels } = resolveGuildStatInputs(this.store, char);

    const equipSetStats = computeEquippedSetBonuses(char.equipment || {}, items, sets, upgradeLevels);
    const uniquePassives = computeUniqueEquipmentBonuses(char.equipment || {}, uniqueCatalog, upgradeLevels);
    const titleSummary = computePermanentTitleBonuses(
      char.unlockedTitles || [],
      titlesCatalog,
      titleLimits,
      char.equippedCosmeticTitleId || null
    );
    char.cachedTitleBonuses = titleSummary;
    const passiveMods = computePassiveAndBuffModifiers(
      char.classId,
      char.skillLevels || {},
      char.unlockedSkills || [],
      char.activeBuffs || {},
      skills
    );

    const agg = aggregateCharacterStats({
      character: char,
      itemsCatalog: items,
      setsCatalog: sets,
      uniqueCatalog,
      titlesCatalog,
      titleBonusLimits: titleLimits,
      skillsCatalog: skills,
      guildSkills,
      guildBuildingLevels,
      mode,
      nowMs: Date.now(),
    });

    const sec = agg.secondaryStats;
    return {
      characterId: char.id,
      classId: char.classId,
      advancedJobId: char.advancedJobId || null,
      level: agg.level,
      baseStats: base,
      effectiveAttributes: agg.effectiveAttributes,
      equipmentAndSetStats: equipSetStats,
      uniqueEquipmentPassives: uniquePassives,
      titleBonuses: titleSummary,
      equippedCosmeticTitleId: char.equippedCosmeticTitleId || null,
      unlockedTitles: [...(char.unlockedTitles || [])],
      passiveAndBuffModifiers: passiveMods,
      activeSets: equipSetStats.activeSets.map((a) => ({
        setId: a.set.id,
        setName: a.set.name,
        equippedCount: a.equippedCount,
        activeTiers: a.activeTiers,
      })),
      deathPenaltyApplied: agg.deathPenaltyApplied,
      computed: {
        atk: sec.atk,
        matk: sec.matk,
        def: sec.def,
        mdef: sec.mdef,
        maxHp: sec.maxHp,
        maxMp: sec.maxMp,
        critRatePct: sec.critRatePct,
        critDamagePct: sec.critDamageMultiplierPct,
        aspdPct: sec.aspdPct,
        moveSpeedPct: sec.moveSpeedPct,
        accuracy: sec.accuracy,
        evasion: Math.round(sec.evasionPct),
        evasionPct: sec.evasionPct,
        cooldownReductionPct: sec.cooldownReductionPct,
        armorPenetrationPct: sec.armorPenetrationPct,
        magicPenetrationPct: sec.magicPenetrationPct,
        statusResistancePct: sec.statusResistancePct,
        lifestealPct: sec.lifestealPct,
        skillDamagePct: sec.skillDamagePct,
        damageReductionPct: sec.damageReductionPct,
        healingPowerPct: sec.healingBonusPct,
        effectiveHp: sec.effectiveHp,
        expBonusPct: sec.expBonusPct,
        goldBonusPct: sec.goldBonusPct,
      },
      aggregated: agg,
    };
  }

  async getCharactersByUserId(userId?: string): Promise<CharacterEntity[]> {
    if (userId) {
      return this.store.characters.filter((c) => c.userId === userId);
    }
    return this.store.characters;
  }

  async getCharacterById(id: string): Promise<CharacterEntity | null> {
    return this.store.characters.find((c) => c.id === id) || null;
  }

  async updateCharacter(id: string, updates: Partial<CharacterEntity>): Promise<CharacterEntity> {
    const idx = this.store.characters.findIndex((c) => c.id === id);
    if (idx === -1) {
      throw new Error('Nhân vật không tồn tại.');
    }

    this.store.characters[idx] = {
      ...this.store.characters[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.store.save();
    return this.store.characters[idx];
  }

  async deleteCharacter(id: string, userId: string, confirmName?: string): Promise<boolean> {
    const idx = this.store.characters.findIndex((c) => c.id === id && c.userId === userId);
    if (idx === -1) {
      throw new Error('Không tìm thấy nhân vật hoặc bạn không có quyền xóa.');
    }
    if (confirmName !== undefined && confirmName.trim() !== this.store.characters[idx].name) {
      throw new Error('Tên xác nhận không khớp với tên nhân vật.');
    }
    this.store.characters.splice(idx, 1);
    this.store.save();
    return true;
  }

  /**
   * Atomic versioned character progression synchronization across page reloads (F5),
   * disconnects, reconnects, and server restarts.
   * Preserves level/EXP/skills/equipment/inventory/quests/checkpoints with monotonic safeguards.
   */
  async saveCharacterProgressionState(id: string, payload: Record<string, any>): Promise<CharacterEntity> {
    const char = this.store.characters.find((c) => c.id === id);
    if (!char) {
      throw new Error('Nhân vật không tồn tại.');
    }

    const nowIso = new Date().toISOString();
    const curLv = Math.max(1, Number(char.level || 1));
    const curExp = Math.max(0, Number(char.exp || 0));

    // Monotonic progression safeguard: prevent accidental downgrade to stale Lv.1 cache
    if (typeof payload.level === 'number' && Number.isFinite(payload.level)) {
      const nextLv = Math.max(1, Math.min(200, Math.floor(payload.level)));
      if (nextLv > curLv) {
        char.level = nextLv;
        char.exp = Math.max(0, Math.floor(Number(payload.exp ?? 0)));
      } else if (nextLv === curLv && typeof payload.exp === 'number' && Number.isFinite(payload.exp)) {
        char.exp = Math.max(curExp, Math.floor(payload.exp));
      }
    } else if (typeof payload.exp === 'number' && Number.isFinite(payload.exp)) {
      char.exp = Math.max(curExp, Math.floor(payload.exp));
    }

    if (typeof payload.gold === 'number' && Number.isFinite(payload.gold) && payload.gold >= 0) {
      char.gold = Math.min(999_999_999, Math.floor(payload.gold));
    }
    if (typeof payload.potentialPoints === 'number' && Number.isFinite(payload.potentialPoints) && payload.potentialPoints >= 0) {
      char.unspentStatPoints = Math.min(2000, Math.floor(payload.potentialPoints));
      char.availableAttributePoints = char.unspentStatPoints;
    }
    if (typeof payload.skillPoints === 'number' && Number.isFinite(payload.skillPoints) && payload.skillPoints >= 0) {
      char.skillPoints = Math.min(500, Math.floor(payload.skillPoints));
    }

    if (typeof payload.regionId === 'string' && payload.regionId.trim()) {
      const reg = this.world.normalizeRegionId(payload.regionId.trim());
      char.regionId = reg;
      if (isSafeVillageId(reg)) {
        const discovered = new Set<string>(Array.isArray(char.discoveredVillageIds) ? char.discoveredVillageIds : ['THON_KHOI_NGUYEN']);
        discovered.add('THON_KHOI_NGUYEN');
        discovered.add(reg);
        char.discoveredVillageIds = Array.from(discovered);
        char.latestVillageCheckpointId = reg;
        char.checkpointUpdatedAt = nowIso;
      }
    }

    if (typeof payload.x === 'number' && Number.isFinite(payload.x)) {
      char.x = Math.max(0, Math.min(4000, Math.round(payload.x)));
    }
    if (typeof payload.y === 'number' && Number.isFinite(payload.y)) {
      char.y = Math.max(0, Math.min(4000, Math.round(payload.y)));
    }
    if (typeof payload.hp === 'number' && Number.isFinite(payload.hp)) {
      char.hp = Math.max(0, Math.min(Math.max(1, Number(char.maxHp || 99999)), Math.round(payload.hp)));
    }
    if (typeof payload.mp === 'number' && Number.isFinite(payload.mp)) {
      char.mp = Math.max(0, Math.min(Math.max(1, Number(char.maxMp || 99999)), Math.round(payload.mp)));
    }

    if (Array.isArray(payload.visitedMaps)) {
      const mergedVisited = new Set<string>([...(char.visitedMaps || []), ...payload.visitedMaps.filter((x: any) => typeof x === 'string')]);
      char.visitedMaps = Array.from(mergedVisited);
      const discovered = new Set<string>(Array.isArray(char.discoveredVillageIds) ? char.discoveredVillageIds : ['THON_KHOI_NGUYEN']);
      for (const mId of char.visitedMaps) {
        if (isSafeVillageId(mId)) discovered.add(mId);
      }
      char.discoveredVillageIds = Array.from(discovered);
    }

    if (Array.isArray(payload.completedQuests)) {
      const mergedQuests = new Set<string>([...(char.completedQuests || []), ...payload.completedQuests.filter((q: any) => typeof q === 'string')]);
      char.completedQuests = Array.from(mergedQuests);
    }
    if (payload.activeQuests && typeof payload.activeQuests === 'object' && !Array.isArray(payload.activeQuests)) {
      char.activeQuests = { ...(char.activeQuests || {}), ...payload.activeQuests };
    }
    if (payload.trackedQuestId !== undefined) {
      char.trackedQuestId = typeof payload.trackedQuestId === 'string' && payload.trackedQuestId ? payload.trackedQuestId : null;
    }
    if (payload.completedQuestHistory && typeof payload.completedQuestHistory === 'object') {
      char.completedQuestHistory = { ...(char.completedQuestHistory || {}), ...payload.completedQuestHistory };
    }
    if (payload.monsterKillCounts && typeof payload.monsterKillCounts === 'object') {
      const prevKills = { ...(char.monsterKillCounts || {}) };
      for (const [monId, count] of Object.entries(payload.monsterKillCounts)) {
        const val = Number(count || 0);
        if (Number.isFinite(val) && val >= 0) {
          prevKills[monId] = Math.max(Number(prevKills[monId] || 0), Math.floor(val));
        }
      }
      char.monsterKillCounts = prevKills;
    }

    if (payload.skillLevels && typeof payload.skillLevels === 'object') {
      const nextSkills = { ...(char.skillLevels || {}) };
      for (const [sid, lv] of Object.entries(payload.skillLevels)) {
        const parsed = Number(lv || 0);
        if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 20) {
          nextSkills[sid] = Math.max(Number(nextSkills[sid] || 0), Math.floor(parsed));
        }
      }
      char.skillLevels = nextSkills;
      const unlocked = new Set<string>([...(char.unlockedSkills || []), ...Object.keys(nextSkills)]);
      char.unlockedSkills = Array.from(unlocked);
    }

    if (Array.isArray(payload.inventory)) {
      const normalized = payload.inventory
        .filter((it: any) => it && (it.itemId || it.id) && Number(it.quantity ?? it.qty ?? 0) > 0)
        .slice(0, 80)
        .map((it: any, slotId: number) => ({
          slotId,
          itemId: String(it.itemId || it.id),
          name: it.name,
          category: it.category,
          rarity: it.rarity || it.quality,
          quantity: Math.max(1, Math.min(9999, Math.floor(Number(it.quantity ?? it.qty ?? 1)))),
        }));
      if (normalized.length > 0) {
        char.inventory = normalized;
      }
    }

    if (payload.autoCombatConfig && typeof payload.autoCombatConfig === 'object') {
      const ac = payload.autoCombatConfig;
      char.autoCombatConfig = {
        ...DEFAULT_AUTO_COMBAT_CONFIG,
        ...(char.autoCombatConfig || {}),
        enabled: Boolean(ac.enabled),
        autoAttack: ac.autoAttack !== false,
        autoSkill: ac.autoSkill !== false,
        selectedSkillIds: Array.isArray(ac.selectedSkillIds) ? ac.selectedSkillIds.filter((s: any) => typeof s === 'string').slice(0, 12) : [],
        autoPotionHp: ac.autoPotionHp !== false,
        hpThresholdPct: Math.max(10, Math.min(95, Math.round(Number(ac.hpThresholdPct ?? 55)))),
        autoPotionMp: ac.autoPotionMp !== false,
        mpThresholdPct: Math.max(10, Math.min(95, Math.round(Number(ac.mpThresholdPct ?? 35)))),
        autoLoot: ac.autoLoot !== false,
        autoTarget: ac.autoTarget !== false,
        targetPriority:
          ac.targetPriority === 'lowest_hp' || ac.targetPriority === 'prefer_elite' || ac.targetPriority === 'avoid_boss'
            ? ac.targetPriority
            : 'nearest',
        returnToAnchor: ac.returnToAnchor !== false,
        anchorX: typeof ac.anchorX === 'number' && Number.isFinite(ac.anchorX) ? Math.round(ac.anchorX) : null,
        anchorY: typeof ac.anchorY === 'number' && Number.isFinite(ac.anchorY) ? Math.round(ac.anchorY) : null,
        anchorRegionId: typeof ac.anchorRegionId === 'string' ? ac.anchorRegionId : null,
        anchorRadiusPx: Math.max(100, Math.min(700, Math.round(Number(ac.anchorRadiusPx ?? 260)))),
        searchRadiusPx: Math.max(120, Math.min(600, Math.round(Number(ac.searchRadiusPx ?? 420)))),
      };
    }

    char.saveVersion = Number(char.saveVersion || 0) + 1;
    char.lastSavedAt = nowIso;
    char.updatedAt = nowIso;
    this.store.save();
    return char;
  }

  async setResurrectionCheckpoint(
    id: string,
    villageId: string,
    setAsPreferred = true
  ): Promise<{ character: CharacterEntity; checkpoint: (typeof SAFE_VILLAGE_CHECKPOINTS)[number] }> {
    const char = this.store.characters.find((c) => c.id === id);
    if (!char) throw new Error('Nhân vật không tồn tại.');
    const norm = this.world.normalizeRegionId(villageId);
    const village = SAFE_VILLAGE_CHECKPOINTS.find((v) => v.id === norm);
    if (!village) {
      throw new Error(`"${villageId}" không phải Làng / Thành An Toàn hợp lệ làm điểm hồi sinh.`);
    }
    const discovered = new Set<string>(Array.isArray(char.discoveredVillageIds) ? char.discoveredVillageIds : ['THON_KHOI_NGUYEN']);
    discovered.add('THON_KHOI_NGUYEN');
    discovered.add(village.id);
    char.discoveredVillageIds = Array.from(discovered);
    char.latestVillageCheckpointId = village.id;
    if (setAsPreferred) {
      char.preferredResurrectionVillageId = village.id;
    }
    char.checkpointUpdatedAt = new Date().toISOString();
    char.saveVersion = Number(char.saveVersion || 0) + 1;
    char.lastSavedAt = char.checkpointUpdatedAt;
    char.updatedAt = char.checkpointUpdatedAt;
    this.store.save();
    return { character: char, checkpoint: village };
  }

  /**
   * Server-authoritative Death Penalty & Checkpoint Resurrection for REST/offline-recovery paths.
   * Never resets level, classId, attributes, equipment, inventory, gold, or quests.
   */
  async recordCharacterDeathAndPenalty(id: string, killerName?: string, reason?: string) {
    const char = this.store.characters.find((c) => c.id === id);
    if (!char) throw new Error('Nhân vật không tồn tại.');
    const ops = this.world.getOperationsConfig();
    const checkpoint = resolveResurrectionCheckpoint(char, char.regionId);
    const outcome = computeDeathPenaltyApplication({
      character: char,
      resurrectionMapId: checkpoint.id,
      killerName,
      reason,
      config: ops.deathPenalty,
      nowMs: Date.now(),
    });
    char.hp = 0;
    char.exp = outcome.nextExp;
    char.level = outcome.nextLevel;
    char.deathPenalty = outcome.penalty;
    char.deathCount = Number(char.deathCount || 0) + 1;
    if (char.autoCombatConfig) char.autoCombatConfig.enabled = false;
    char.saveVersion = Number(char.saveVersion || 0) + 1;
    char.lastSavedAt = new Date().toISOString();
    char.updatedAt = char.lastSavedAt;
    this.store.save();
    return {
      character: char,
      expLost: outcome.expLost,
      penalty: outcome.penalty,
      checkpoint,
      computedStats: this.getComputedStatsSummary(char.id),
    };
  }

  async resurrectCharacterAtCheckpoint(id: string) {
    const char = this.store.characters.find((c) => c.id === id);
    if (!char) throw new Error('Nhân vật không tồn tại.');
    const checkpoint = resolveResurrectionCheckpoint(char, char.regionId);
    const summary = this.getComputedStatsSummary(char.id);
    char.regionId = checkpoint.id;
    char.x = checkpoint.spawnX;
    char.y = checkpoint.spawnY;
    char.maxHp = summary.computed.maxHp;
    char.maxMp = summary.computed.maxMp;
    char.hp = char.maxHp;
    char.mp = char.maxMp;
    char.latestVillageCheckpointId = checkpoint.id;
    const discovered = new Set<string>(Array.isArray(char.discoveredVillageIds) ? char.discoveredVillageIds : ['THON_KHOI_NGUYEN']);
    discovered.add('THON_KHOI_NGUYEN');
    discovered.add(checkpoint.id);
    char.discoveredVillageIds = Array.from(discovered);
    char.checkpointUpdatedAt = new Date().toISOString();
    char.saveVersion = Number(char.saveVersion || 0) + 1;
    char.lastSavedAt = char.checkpointUpdatedAt;
    char.updatedAt = char.checkpointUpdatedAt;
    this.store.save();
    return {
      character: char,
      checkpoint,
      penaltyState: getActiveDeathPenaltyReductionPct(char, Date.now()),
      computedStats: summary,
    };
  }

  recoverCharacterPersistence(id: string) {
    const char = this.store.characters.find((c) => c.id === id);
    if (!char) throw new Error('Nhân vật không tồn tại.');
    char.level = Math.max(1, Math.min(200, Math.floor(Number(char.level || 1))));
    char.exp = Math.max(0, Math.floor(Number(char.exp || 0)));
    char.gold = Math.max(0, Math.floor(Number(char.gold || 0)));
    if (!char.baseStats) char.baseStats = { str: 10, dex: 10, agi: 10, int: 10, con: 10 };
    if (!char.attributes) char.attributes = { ...char.baseStats };
    if (!Array.isArray(char.discoveredVillageIds) || char.discoveredVillageIds.length === 0) {
      char.discoveredVillageIds = ['THON_KHOI_NGUYEN'];
    }
    if (!char.latestVillageCheckpointId) char.latestVillageCheckpointId = 'THON_KHOI_NGUYEN';
    if (char.deathPenalty && Number(char.deathPenalty.expiresAt || 0) <= Date.now()) {
      char.deathPenalty = null;
    }
    const summary = this.getComputedStatsSummary(char.id);
    char.maxHp = summary.computed.maxHp;
    char.maxMp = summary.computed.maxMp;
    if (Number(char.hp ?? 0) <= 0) char.hp = char.maxHp;
    if (Number(char.mp ?? 0) <= 0) char.mp = char.maxMp;
    char.saveVersion = Number(char.saveVersion || 0) + 1;
    char.lastSavedAt = new Date().toISOString();
    char.updatedAt = char.lastSavedAt;
    this.store.save();
    return { character: char, computedStats: summary };
  }
}
