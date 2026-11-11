import {
  ALL_PASSIVE_DEFINITIONS,
  INITIAL_EQUIPMENT_SETS,
  INITIAL_ITEMS,
  INITIAL_SKILLS,
  PASSIVE_PROGRESSION_CONFIG,
  aggregateCharacterStats,
  buildRespecLedgerEntry,
  computeEarnedPassivePoints,
  computePassivePointsSpent,
  getPassiveTreeForCharacter,
  validatePassiveAllocation,
} from '@elysia/game-data-schema';
import {
  CombatBalanceMode,
  PassivePointTransaction,
  PrimaryAttributes,
} from '@elysia/game-types';
import { JsonStore } from '../database/jsonStore.js';
import { WorldService } from './world.service.js';
import { CombatService } from './combat.service.js';

export function resolveGuildStatInputs(store: JsonStore, char: any): {
  guildSkills: any[];
  guildBuildingLevels: Record<string, number>;
} {
  if (!char?.guildId) {
    return { guildSkills: [], guildBuildingLevels: {} };
  }
  const guild = store.guilds.find((g: any) => g.id === char.guildId);
  if (!guild) {
    return { guildSkills: [], guildBuildingLevels: {} };
  }
  const buildingLevels: Record<string, number> = {};
  for (const b of guild.buildings || []) {
    if (b?.id) buildingLevels[b.id] = Number(b.level || 0);
  }
  return {
    guildSkills: Array.isArray(guild.skills) ? guild.skills : [],
    guildBuildingLevels: buildingLevels,
  };
}

export class PassiveService {
  private static instance: PassiveService;
  private store = JsonStore.getInstance();
  private world = WorldService.getInstance();

  public static getInstance(): PassiveService {
    if (!PassiveService.instance) {
      PassiveService.instance = new PassiveService();
    }
    return PassiveService.instance;
  }

  private getMergedItems() {
    const map = new Map<string, any>();
    for (const it of INITIAL_ITEMS) map.set(it.id, it);
    for (const it of this.world.getWorldItems(false)) map.set(it.id, it);
    for (const it of this.world.getUniqueEquipment(false)) map.set(it.id, it);
    for (const it of this.store.items) map.set(it.id, it);
    return Array.from(map.values());
  }

  private buildStats(
    char: any,
    mode: CombatBalanceMode = 'pve',
    previewAllocations?: Record<string, number>,
    previewBaseAttributes?: Partial<PrimaryAttributes>
  ) {
    const sets = this.world.getEquipmentSets(false).length ? this.world.getEquipmentSets(false) : INITIAL_EQUIPMENT_SETS;
    const skills = this.world.getSkills(false).length ? this.world.getSkills(false) : INITIAL_SKILLS;
    const { guildSkills, guildBuildingLevels } = resolveGuildStatInputs(this.store, char);
    return aggregateCharacterStats({
      character: char,
      itemsCatalog: this.getMergedItems(),
      setsCatalog: sets,
      uniqueCatalog: this.world.getUniqueEquipment(false),
      titlesCatalog: this.world.getTitles(false),
      titleBonusLimits: this.world.getTitleBonusLimits(),
      skillsCatalog: skills,
      guildSkills,
      guildBuildingLevels,
      previewPassiveAllocations: previewAllocations,
      previewBaseAttributes,
      mode,
    });
  }

  public getPassiveOverview(characterId: string, mode: CombatBalanceMode = 'pve') {
    const char = this.store.characters.find((c) => c.id === characterId);
    if (!char) throw new Error('Không tìm thấy nhân vật.');
    if (!char.passiveAllocations || typeof char.passiveAllocations !== 'object') char.passiveAllocations = {};
    if (!Array.isArray(char.passiveTransactions)) char.passiveTransactions = [];

    const earnedInfo = computeEarnedPassivePoints(char);
    const spent = computePassivePointsSpent(char.passiveAllocations);
    const available = Math.max(0, earnedInfo.earned - spent);
    char.passivePoints = available;
    char.passivePointsSpent = spent;

    const tree = getPassiveTreeForCharacter(char.classId, char.advancedJobId);
    const aggregated = this.buildStats(char, mode);

    return {
      characterId: char.id,
      classId: char.classId,
      advancedJobId: char.advancedJobId || null,
      advancedJobName: char.advancedJobName || null,
      level: Number(char.level || 1),
      points: {
        earned: earnedInfo.earned,
        fromLevels: earnedInfo.fromLevels,
        fromAdvancements: earnedInfo.fromAdvancements,
        fromMastery: earnedInfo.fromMastery,
        totalCumulativeMastery: earnedInfo.totalCumulativeMastery,
        spent,
        available,
      },
      respecCostGold: spent * PASSIVE_PROGRESSION_CONFIG.respecGoldPerSpentPoint,
      respecScrollItemId: PASSIVE_PROGRESSION_CONFIG.respecScrollItemId,
      allocations: { ...char.passiveAllocations },
      tree,
      allPassivesCount: ALL_PASSIVE_DEFINITIONS.length,
      transactions: [...char.passiveTransactions].slice(-25).reverse(),
      aggregatedStats: aggregated,
    };
  }

  public previewAllocation(
    characterId: string,
    previewAllocations?: Record<string, number>,
    previewBaseAttributes?: Partial<PrimaryAttributes>,
    mode: CombatBalanceMode = 'pve'
  ) {
    const char = this.store.characters.find((c) => c.id === characterId);
    if (!char) throw new Error('Không tìm thấy nhân vật.');
    const before = this.buildStats(char, mode);
    const after = this.buildStats(char, mode, previewAllocations, previewBaseAttributes);
    return {
      before,
      after,
      deltas: {
        maxHp: after.secondaryStats.maxHp - before.secondaryStats.maxHp,
        maxMp: after.secondaryStats.maxMp - before.secondaryStats.maxMp,
        atk: after.secondaryStats.atk - before.secondaryStats.atk,
        matk: after.secondaryStats.matk - before.secondaryStats.matk,
        def: after.secondaryStats.def - before.secondaryStats.def,
        mdef: after.secondaryStats.mdef - before.secondaryStats.mdef,
        effectiveHp: after.secondaryStats.effectiveHp - before.secondaryStats.effectiveHp,
        critRatePct: Number((after.secondaryStats.critRatePct - before.secondaryStats.critRatePct).toFixed(2)),
        critDamageBonusPct: Number((after.secondaryStats.critDamageBonusPct - before.secondaryStats.critDamageBonusPct).toFixed(2)),
        damageReductionPct: Number((after.secondaryStats.damageReductionPct - before.secondaryStats.damageReductionPct).toFixed(2)),
        cooldownReductionPct: Number((after.secondaryStats.cooldownReductionPct - before.secondaryStats.cooldownReductionPct).toFixed(2)),
        evasionPct: Number((after.secondaryStats.evasionPct - before.secondaryStats.evasionPct).toFixed(2)),
        healingBonusPct: Number((after.secondaryStats.healingBonusPct - before.secondaryStats.healingBonusPct).toFixed(2)),
      },
    };
  }

  public allocatePassive(characterId: string, passiveId: string, deltaRank: number = 1) {
    const char = this.store.characters.find((c) => c.id === characterId);
    if (!char) throw new Error('Không tìm thấy nhân vật.');
    if (!char.passiveAllocations || typeof char.passiveAllocations !== 'object') char.passiveAllocations = {};
    if (!Array.isArray(char.passiveTransactions)) char.passiveTransactions = [];

    const check = validatePassiveAllocation(char, passiveId, deltaRank);
    if (!check.valid) {
      const err: any = new Error(check.reason);
      err.statusCode = 403;
      throw err;
    }

    const fromRank = Number(char.passiveAllocations[passiveId] || 0);
    const txSnapshot = JSON.stringify({
      passiveAllocations: char.passiveAllocations,
      passivePoints: char.passivePoints,
      passivePointsSpent: char.passivePointsSpent,
    });

    try {
      char.passiveAllocations[passiveId] = check.nextRank;
      const earnedInfo = computeEarnedPassivePoints(char);
      const spentAfter = computePassivePointsSpent(char.passiveAllocations);
      const remainingAfter = Math.max(0, earnedInfo.earned - spentAfter);

      char.passivePointsSpent = spentAfter;
      char.passivePoints = remainingAfter;

      const tx: PassivePointTransaction = {
        txId: `PTX_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        characterId: char.id,
        timestamp: new Date().toISOString(),
        action: 'allocate',
        passiveId,
        fromRank,
        toRank: check.nextRank,
        pointsDelta: -check.cost,
        totalAllocatedAfter: spentAfter,
        remainingPointsAfter: remainingAfter,
        reason: `Allocated ${check.passive.name} rank ${fromRank} -> ${check.nextRank}`,
      };
      char.passiveTransactions.push(tx);
      char.updatedAt = tx.timestamp;

      const onlinePlayer = CombatService.getSharedInstance().getPlayer(char.id);
      if (onlinePlayer) {
        CombatService.getSharedInstance().recomputePlayerStats(onlinePlayer);
      }
      this.store.save();

      return {
        success: true,
        passiveId,
        newRank: check.nextRank,
        pointsRemaining: remainingAfter,
        pointsSpent: spentAfter,
        transaction: tx,
        overview: this.getPassiveOverview(char.id),
      };
    } catch (err) {
      const prev = JSON.parse(txSnapshot);
      char.passiveAllocations = prev.passiveAllocations;
      char.passivePoints = prev.passivePoints;
      char.passivePointsSpent = prev.passivePointsSpent;
      throw err;
    }
  }

  public respecPassives(
    characterId: string,
    method: 'gold' | 'item' | 'free' = 'gold'
  ) {
    const char = this.store.characters.find((c) => c.id === characterId);
    if (!char) throw new Error('Không tìm thấy nhân vật.');
    if (!char.passiveAllocations || typeof char.passiveAllocations !== 'object') char.passiveAllocations = {};
    if (!Array.isArray(char.passiveTransactions)) char.passiveTransactions = [];

    const spentBefore = computePassivePointsSpent(char.passiveAllocations);
    if (spentBefore <= 0) {
      throw new Error('Bạn chưa phân bổ điểm Nội Tại nào để tẩy.');
    }

    const earnedInfo = computeEarnedPassivePoints(char);
    let goldFee = 0;
    let itemConsumedId: string | undefined;

    if (method === 'item') {
      const inv = (char.inventory || []) as any[];
      const slotIdx = inv.findIndex(
        (s) => (s.itemId || s.item_id) === PASSIVE_PROGRESSION_CONFIG.respecScrollItemId && Number(s.quantity || 0) > 0
      );
      if (slotIdx < 0) {
        const err: any = new Error('Không có Cuộn Tẩy Điểm Nội Tại trong Balo.');
        err.statusCode = 400;
        throw err;
      }
      itemConsumedId = PASSIVE_PROGRESSION_CONFIG.respecScrollItemId;
      inv[slotIdx].quantity = Number(inv[slotIdx].quantity) - 1;
      if (inv[slotIdx].quantity <= 0) inv.splice(slotIdx, 1);
    } else if (method === 'gold') {
      goldFee = spentBefore * PASSIVE_PROGRESSION_CONFIG.respecGoldPerSpentPoint;
      const curGold = Number(char.gold || 0);
      if (curGold < goldFee) {
        const err: any = new Error(`Không đủ Vàng để tẩy Nội Tại! Cần ${goldFee}G, hiện có ${curGold}G.`);
        err.statusCode = 400;
        throw err;
      }
      char.gold = curGold - goldFee;
    }

    const previousAllocations = { ...char.passiveAllocations };
    const preservedBranch = char.advancedJobId;

    // Reset allocations while STRICTLY preserving chosen Lv.80 branch!
    char.passiveAllocations = {};
    char.passivePointsSpent = 0;
    char.passivePoints = earnedInfo.earned;
    char.passiveRespecCount = Number(char.passiveRespecCount || 0) + 1;
    char.advancedJobId = preservedBranch;

    const tx = buildRespecLedgerEntry(char.id, previousAllocations, earnedInfo.earned, {
      costGold: goldFee,
      itemConsumedId,
    });
    char.passiveTransactions.push(tx);
    char.updatedAt = tx.timestamp;

    const onlinePlayer = CombatService.getSharedInstance().getPlayer(char.id);
    if (onlinePlayer) {
      CombatService.getSharedInstance().recomputePlayerStats(onlinePlayer);
    }
    this.store.save();

    return {
      success: true,
      preservedBranchId: char.advancedJobId || null,
      refundedPoints: spentBefore,
      availablePoints: earnedInfo.earned,
      goldSpent: goldFee,
      itemConsumedId,
      transaction: tx,
      overview: this.getPassiveOverview(char.id),
    };
  }
}
