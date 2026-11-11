import { randomUUID } from 'crypto';
import {
  PROFESSION_DEFINITIONS,
  PROFESSION_GATHERING_NODES,
  PROFESSION_MATERIALS,
  PROFESSION_NPCS,
  PROFESSION_QUALITY_RULES,
  PROFESSION_QUESTS,
  PROFESSION_RECIPES,
  PROFESSION_SYSTEM_CONFIG,
  PROFESSION_TOOLS,
  QUALITY_TIER_ORDER,
  computeCraftProbabilities,
  computeDiminishingCraftExp,
  computeProfessionExpRequired,
  getProfessionRankForLevel,
  rollCraftQualityAndYield,
} from '@elysia/game-data-schema';
import {
  FarmPlotState,
  ItemQuality,
  PlayerProfessionProgress,
  ProfessionId,
  ProfessionRecipeDefinition,
} from '@elysia/game-types';
import { JsonStore } from '../database/jsonStore.js';
import { AuditSecurityService } from './audit.service.js';
import { WorldService } from './world.service.js';

interface GatherSession {
  sessionId: string;
  characterId: string;
  nodeId: string;
  professionId: ProfessionId;
  startedAt: number;
  completeAt: number;
  isFishing: boolean;
}

export class ProfessionService {
  private static instance: ProfessionService;
  private store = JsonStore.getInstance();
  private audit = AuditSecurityService.getInstance();
  private world = WorldService.getInstance();
  private activeGatherSessions = new Map<string, GatherSession>();
  private publicTerritoryGatherTracker = new Map<string, { dateKey: string; count: number }>();

  public static getInstance(): ProfessionService {
    if (!ProfessionService.instance) {
      ProfessionService.instance = new ProfessionService();
    }
    return ProfessionService.instance;
  }

  private todayKey(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private getCharacterOrThrow(charId: string) {
    const ch = this.store.characters.find((c) => c.id === charId);
    if (!ch) throw new Error('Không tìm thấy nhân vật.');
    if (!ch.professions || typeof ch.professions !== 'object') ch.professions = {};
    if (typeof ch.unlockedProfessionSlots !== 'number') {
      ch.unlockedProfessionSlots = PROFESSION_SYSTEM_CONFIG.maxInitialProfessions;
    }
    const tk = this.todayKey();
    if (!ch.professionDailyStats || ch.professionDailyStats.dateKey !== tk) {
      ch.professionDailyStats = { dateKey: tk, gatherActions: 0, craftActions: 0, questsCompleted: [] };
    }
    return ch;
  }

  private getProfessionGuildBonuses(ch: any): { qualityBonusPct: number; gatherYieldPct: number } {
    if (!ch?.guildId) return { qualityBonusPct: 0, gatherYieldPct: 0 };
    const guild = this.store.guilds.find((g) => g.id === ch.guildId);
    if (!guild) return { qualityBonusPct: 0, gatherYieldPct: 0 };
    const craftSkill = (guild.skills || []).find((s: any) => s.statKey === 'craftQualityPct');
    const gatherSkill = (guild.skills || []).find((s: any) => s.statKey === 'gatherYieldPct');
    const workshop = (guild.buildings || []).find((b: any) => b.id === 'alchemy_workshop');
    return {
      qualityBonusPct:
        Number(craftSkill?.level || 0) * Number(craftSkill?.bonusPerLevelPct || 0) +
        Math.max(0, Number(workshop?.level || 1) - 1) * 2,
      gatherYieldPct: Number(gatherSkill?.level || 0) * Number(gatherSkill?.bonusPerLevelPct || 0),
    };
  }

  private ensureLearnedProfession(ch: any, professionId: ProfessionId): PlayerProfessionProgress {
    const p: PlayerProfessionProgress | undefined = ch.professions?.[professionId];
    if (!p) {
      throw new Error(`Bạn chưa học nghề "${professionId}". Hãy gặp Sư Phụ Nghề để học!`);
    }
    const tk = this.todayKey();
    if (p.dailyQuestsDateKey !== tk) {
      p.dailyQuestsDateKey = tk;
      p.dailyCompletedQuestIds = [];
    }
    return p;
  }

  private awardMasteryExp(prof: PlayerProfessionProgress, amount: number): { levelsGained: number; expAdded: number } {
    const expAdded = Math.max(0, Math.round(amount));
    prof.exp += expAdded;
    let levelsGained = 0;
    while (prof.level < PROFESSION_SYSTEM_CONFIG.maxMasteryLevel && prof.exp >= prof.nextLevelExp) {
      prof.exp -= prof.nextLevelExp;
      prof.level += 1;
      prof.nextLevelExp = computeProfessionExpRequired(prof.level);
      prof.rank = getProfessionRankForLevel(prof.level).id;
      levelsGained += 1;
    }
    if (prof.level >= PROFESSION_SYSTEM_CONFIG.maxMasteryLevel) {
      prof.level = PROFESSION_SYSTEM_CONFIG.maxMasteryLevel;
      prof.exp = 0;
      prof.rank = 'legendary';
    }
    return { levelsGained, expAdded };
  }

  public getCatalog() {
    return {
      rules: PROFESSION_SYSTEM_CONFIG,
      professions: PROFESSION_DEFINITIONS,
      tools: PROFESSION_TOOLS,
      materials: PROFESSION_MATERIALS,
      nodes: PROFESSION_GATHERING_NODES,
      recipes: PROFESSION_RECIPES,
      quests: PROFESSION_QUESTS,
      npcs: PROFESSION_NPCS,
      qualityRules: PROFESSION_QUALITY_RULES,
      economy: this.world.getEconomyConfig(),
    };
  }

  public getCharacterProfessionOverview(charId: string) {
    const ch = this.getCharacterOrThrow(charId);
    const activeNodes = PROFESSION_GATHERING_NODES.map((n) => {
      const rt = this.store.gatheringNodesRuntime.find((x) => x.nodeId === n.id);
      const cooldownRemainingMs = rt?.respawnAt && rt.respawnAt > Date.now() ? rt.respawnAt - Date.now() : 0;
      return { ...n, available: cooldownRemainingMs === 0, cooldownRemainingMs };
    });
    const myPlots: FarmPlotState[] = (this.store.farmPlots || []).filter((p) => p.characterId === charId);
    for (const plot of myPlots) {
      if (plot.status === 'growing' && Date.now() >= plot.readyAt) {
        plot.status = 'ready';
      }
    }
    const availableQuests = PROFESSION_QUESTS.filter((q) => {
      const p = ch.professions?.[q.professionId];
      if (!p) return false;
      if (q.questKind === 'hidden_legendary' && p.level < q.requiredMastery && !p.completedQuestIds.includes(q.id)) {
        return false;
      }
      return true;
    }).map((q) => {
      const p = ch.professions?.[q.professionId];
      const completed =
        q.questKind === 'daily'
          ? (p?.dailyCompletedQuestIds || []).includes(q.id)
          : (p?.completedQuestIds || []).includes(q.id);
      return { ...q, completed, unlockedByMastery: Number(p?.level || 1) >= q.requiredMastery };
    });

    const ownedMaterials = (ch.inventory || [])
      .filter((s: any) => {
        const id = String(s.itemId || s.item_id || '');
        return id.startsWith('MAT_') || id.startsWith('PROF_ITEM_') || id === 'ITEM_UPGRADE_STONE_BASIC' || id === 'ITEM_POTION_HP_SMALL';
      })
      .map((s: any) => ({
        itemId: s.itemId || s.item_id,
        name: s.name || s.itemId,
        quantity: Number(s.quantity ?? s.qty ?? 1),
        quality: String(s.quality || s.rarity || 'common'),
      }));

    const ownedTools = (ch.inventory || [])
      .filter((s: any) => String(s.itemId || s.item_id || '').startsWith('TOOL_'))
      .map((s: any) => ({
        itemId: s.itemId || s.item_id,
        name: s.name || s.itemId,
        quality: String(s.quality || s.rarity || 'common'),
      }));

    return {
      characterId: ch.id,
      gold: ch.gold,
      unlockedProfessionSlots: ch.unlockedProfessionSlots,
      learnedCount: Object.keys(ch.professions || {}).length,
      professions: ch.professions || {},
      dailyStats: ch.professionDailyStats,
      nodes: activeNodes,
      farmPlots: myPlots,
      quests: availableQuests,
      ownedMaterials,
      ownedTools,
    };
  }

  public async learnProfession(charId: string, professionId: ProfessionId) {
    return this.audit.withLocks([`char:${charId}`], () => {
      this.audit.enforceRateLimit(`prof_learn:${charId}`, 10, 5000);
      const ch = this.getCharacterOrThrow(charId);
      const def = PROFESSION_DEFINITIONS.find((p) => p.id === professionId);
      if (!def) throw new Error(`Nghề nghiệp không hợp lệ: ${professionId}`);
      if (ch.professions[professionId]) {
        throw new Error(`Bạn đã học nghề "${def.nameVi}" rồi.`);
      }
      const currentCount = Object.keys(ch.professions).length;
      if (currentCount >= Number(ch.unlockedProfessionSlots || PROFESSION_SYSTEM_CONFIG.maxInitialProfessions)) {
        throw new Error(`Đã đạt giới hạn ${ch.unlockedProfessionSlots} nghề chính ban đầu! Hãy hoàn thành nhiệm vụ bí truyền để mở rộng thêm ô nghề.`);
      }

      this.audit.deductGold(ch, def.unlockCostGold, `học nghề ${def.nameVi}`);
      const starterTool = PROFESSION_TOOLS.find((t) => t.professionId === professionId && t.tier === 1);
      const starterRecipes = PROFESSION_RECIPES.filter(
        (r) => r.professionId === professionId && r.requiredMastery <= 1 && !r.isHidden
      ).map((r) => r.id);

      const entry: PlayerProfessionProgress = {
        professionId,
        level: 1,
        exp: 0,
        nextLevelExp: computeProfessionExpRequired(1),
        rank: 'apprentice',
        learnedRecipeIds: starterRecipes,
        recipeCraftCounts: {},
        equippedToolId: starterTool?.id,
        toolDurability: starterTool?.maxDurability ?? 80,
        maxToolDurability: starterTool?.maxDurability ?? 80,
        totalGathered: 0,
        totalCrafted: 0,
        completedQuestIds: [],
        dailyQuestsDateKey: this.todayKey(),
        dailyCompletedQuestIds: [],
        productionHistory: [],
      };
      ch.professions[professionId] = entry;
      if (starterTool) {
        this.audit.grantItem(ch, starterTool.id, 1, { quality: starterTool.rarity, name: starterTool.nameVi });
      }
      this.audit.recordAudit({
        txId: `PROF_LEARN_${randomUUID().slice(0, 8)}`,
        category: 'profession',
        actorCharacterId: charId,
        goldDelta: -def.unlockCostGold,
        details: `Học nghề ${def.nameVi} + trang bị ${starterTool?.nameVi || 'mặc định'}`,
      });
      this.store.save();
      return { profession: entry, gold: ch.gold };
    });
  }

  public async buyAndEquipTool(charId: string, toolId: string) {
    return this.audit.withLocks([`char:${charId}`], () => {
      const ch = this.getCharacterOrThrow(charId);
      const tool = PROFESSION_TOOLS.find((t) => t.id === toolId);
      if (!tool) throw new Error('Không tìm thấy công cụ nghề.');
      const prof = this.ensureLearnedProfession(ch, tool.professionId);
      if (prof.level < tool.requiredMastery) {
        throw new Error(`Yêu cầu Mastery Lv.${tool.requiredMastery} để sử dụng ${tool.nameVi}.`);
      }
      this.audit.deductGold(ch, tool.priceGold, `mua ${tool.nameVi}`);
      this.audit.grantItem(ch, tool.id, 1, { quality: tool.rarity, name: tool.nameVi });
      prof.equippedToolId = tool.id;
      prof.toolDurability = tool.maxDurability;
      prof.maxToolDurability = tool.maxDurability;
      this.store.save();
      return { profession: prof, gold: ch.gold };
    });
  }

  public async repairTool(charId: string, professionId: ProfessionId) {
    return this.audit.withLocks([`char:${charId}`], () => {
      const ch = this.getCharacterOrThrow(charId);
      const prof = this.ensureLearnedProfession(ch, professionId);
      const tool = PROFESSION_TOOLS.find((t) => t.id === prof.equippedToolId);
      if (!tool) throw new Error('Chưa trang bị công cụ nghề.');
      const missing = Math.max(0, prof.maxToolDurability - prof.toolDurability);
      if (missing === 0) return { costGold: 0, profession: prof, gold: ch.gold };
      const cost = missing * tool.repairCostPerPoint;
      this.audit.deductGold(ch, cost, `sửa chữa ${tool.nameVi}`);
      prof.toolDurability = prof.maxToolDurability;
      this.store.save();
      return { costGold: cost, profession: prof, gold: ch.gold };
    });
  }

  public async equipTool(charId: string, toolId: string) {
    return this.audit.withLocks([`char:${charId}`], () => {
      const ch = this.getCharacterOrThrow(charId);
      const tool = PROFESSION_TOOLS.find((t) => t.id === toolId);
      if (!tool) throw new Error('Không tìm thấy công cụ nghề.');
      const prof = this.ensureLearnedProfession(ch, tool.professionId);
      if (prof.level < tool.requiredMastery) {
        throw new Error(`Yêu cầu Mastery Lv.${tool.requiredMastery} để sử dụng ${tool.nameVi}.`);
      }
      if (this.audit.countItem(ch, tool.id) <= 0) {
        throw new Error(`Bạn chưa sở hữu công cụ "${tool.nameVi}" trong Balo.`);
      }
      prof.equippedToolId = tool.id;
      prof.maxToolDurability = tool.maxDurability;
      prof.toolDurability = Math.max(1, Math.min(tool.maxDurability, prof.toolDurability > 0 ? tool.maxDurability : tool.maxDurability));
      this.store.save();
      return { profession: prof, equippedTool: tool };
    });
  }

  public async startGathering(charId: string, nodeId: string, opts?: { instantForTest?: boolean }) {
    return this.audit.withLocks([`char:${charId}`, `node:${nodeId}`], () => {
      this.audit.enforceRateLimit(`gather:${charId}`, 25, 10000);
      const ch = this.getCharacterOrThrow(charId);
      const node = PROFESSION_GATHERING_NODES.find((n) => n.id === nodeId);
      if (!node) throw new Error('Không tìm thấy điểm tài nguyên.');

      const prof = this.ensureLearnedProfession(ch, node.professionId);
      if (prof.level < node.requiredMastery) {
        throw new Error(`Cần ${node.professionId} Mastery Lv.${node.requiredMastery} để thu thập ${node.nameVi}.`);
      }
      if (ch.professionDailyStats.gatherActions >= PROFESSION_SYSTEM_CONFIG.dailyGatherSoftCap) {
        throw new Error('Đã đạt giới hạn thu thập hàng ngày chống lạm phát tài nguyên!');
      }

      const tool = PROFESSION_TOOLS.find((t) => t.id === prof.equippedToolId);
      if (!tool || tool.tier < node.requiredToolTier) {
        throw new Error(`Yêu cầu công cụ Bậc ${node.requiredToolTier} cho ${node.nameVi}.`);
      }
      if (prof.toolDurability <= 0) {
        throw new Error(`Công cụ ${tool.nameVi} đã hỏng (0 độ bền). Hãy sửa chữa trước khi tiếp tục!`);
      }

      // Check node respawn cooldown
      const runtime = this.store.gatheringNodesRuntime.find((x) => x.nodeId === node.id);
      if (runtime?.respawnAt && runtime.respawnAt > Date.now()) {
        const waitSec = Math.ceil((runtime.respawnAt - Date.now()) / 1000);
        throw new Error(`${node.nameVi} đang hồi phục tài nguyên (${waitSec}s).`);
      }

      // Anti-monopoly territory public quota check (never locks out non-owners within daily public quota)
      if (node.territoryId) {
        const terr = this.store.territories.find((t) => t.territoryId === node.territoryId);
        if (terr?.ownerGuildId && terr.ownerGuildId !== ch.guildId) {
          const tKey = `${charId}:${node.territoryId}`;
          const tk = this.todayKey();
          const cur = this.publicTerritoryGatherTracker.get(tKey);
          const count = cur && cur.dateKey === tk ? cur.count : 0;
          if (count >= 40) {
            throw new Error(`Bạn đã dùng hết hạn mức khai thác công cộng tại lãnh thổ "${terr.nameVi}" hôm nay.`);
          }
        }
      }

      const speedMult = 1 - Math.min(0.4, tool.gatherSpeedBonusPct / 100);
      const durationMs = opts?.instantForTest ? 1 : Math.round(node.gatherDurationMs * speedMult);
      const now = Date.now();
      const session: GatherSession = {
        sessionId: `GTH_${randomUUID().slice(0, 10)}`,
        characterId: charId,
        nodeId: node.id,
        professionId: node.professionId,
        startedAt: now,
        completeAt: now + durationMs,
        isFishing: node.nodeType === 'fishing_spot',
      };
      this.activeGatherSessions.set(session.sessionId, session);
      return session;
    });
  }

  public async completeGathering(charId: string, sessionId: string) {
    const sess = this.activeGatherSessions.get(sessionId);
    if (!sess || sess.characterId !== charId) {
      throw new Error('Phiên thu thập không hợp lệ hoặc đã hoàn tất.');
    }
    if (Date.now() < sess.completeAt) {
      throw new Error(`Chưa hoàn tất thời gian thu thập (${sess.completeAt - Date.now()}ms).`);
    }

    return this.audit.withLocks([`char:${charId}`, `node:${sess.nodeId}`], () => {
      this.activeGatherSessions.delete(sessionId);
      const ch = this.getCharacterOrThrow(charId);
      const node = PROFESSION_GATHERING_NODES.find((n) => n.id === sess.nodeId)!;
      const prof = this.ensureLearnedProfession(ch, node.professionId);
      const guildBonus = this.getProfessionGuildBonuses(ch);

      // Respawn lock check
      let runtime = this.store.gatheringNodesRuntime.find((x) => x.nodeId === node.id);
      if (runtime?.respawnAt && runtime.respawnAt > Date.now()) {
        throw new Error('Mỏ tài nguyên này vừa bị người chơi khác thu thập trước.');
      }
      if (!runtime) {
        runtime = { nodeId: node.id, respawnAt: 0 };
        this.store.gatheringNodesRuntime.push(runtime);
      }
      runtime.respawnAt = Date.now() + node.respawnSeconds * 1000;

      // Track territory owner bonus & non-monopoly public tracker
      let ownerBonusMult = 1;
      if (node.territoryId) {
        const terr = this.store.territories.find((t) => t.territoryId === node.territoryId);
        if (terr?.ownerGuildId && terr.ownerGuildId === ch.guildId) {
          ownerBonusMult += 0.2;
        } else if (terr?.ownerGuildId) {
          const tKey = `${charId}:${node.territoryId}`;
          const tk = this.todayKey();
          const prev = this.publicTerritoryGatherTracker.get(tKey);
          const nextCnt = (prev && prev.dateKey === tk ? prev.count : 0) + 1;
          this.publicTerritoryGatherTracker.set(tKey, { dateKey: tk, count: nextCnt });
        }
      }

      prof.toolDurability = Math.max(0, prof.toolDurability - 1);
      prof.totalGathered += 1;
      ch.professionDailyStats.gatherActions += 1;

      const rank = getProfessionRankForLevel(prof.level);
      let baseQty = node.quantityMin + Math.floor(Math.random() * (node.quantityMax - node.quantityMin + 1));
      if (Math.random() * 100 < rank.extraYieldBonusPct + guildBonus.gatherYieldPct) {
        baseQty += 1;
      }
      const finalQty = Math.max(1, Math.round(baseQty * ownerBonusMult));
      this.audit.grantItem(ch, node.primaryMaterialId, finalQty, { quality: node.rarity });

      let rareYield: { itemId: string; quantity: number } | null = null;
      let totalExp = node.expReward;
      if (node.rareDropMaterialId && Math.random() * 100 < Number(node.rareDropChancePct || 0) + rank.qualityBonusPct * 0.25) {
        this.audit.grantItem(ch, node.rareDropMaterialId, 1, { quality: 'rare' });
        rareYield = { itemId: node.rareDropMaterialId, quantity: 1 };
        totalExp += Math.round(node.expReward * 0.65);
      }

      const expRes = this.awardMasteryExp(prof, totalExp);
      this.audit.recordAudit({
        txId: `GTH_${sessionId}`,
        category: 'profession',
        actorCharacterId: charId,
        goldDelta: 0,
        itemId: node.primaryMaterialId,
        quantity: finalQty,
        details: `Thu thập ${node.nameVi} nhận ${finalQty} ${node.primaryMaterialId}`,
      });
      this.store.save();

      return {
        nodeId: node.id,
        primaryYield: { itemId: node.primaryMaterialId, quantity: finalQty },
        rareYield,
        expResult: expRes,
        profession: prof,
        respawnAt: runtime.respawnAt,
      };
    });
  }

  public async plantFarmCrop(charId: string, seedItemId: string, opts?: { instantGrowForTest?: boolean }) {
    return this.audit.withLocks([`char:${charId}`], () => {
      const ch = this.getCharacterOrThrow(charId);
      const prof = this.ensureLearnedProfession(ch, 'farmer');
      const myPlots = this.store.farmPlots.filter((p) => p.characterId === charId && p.status !== 'harvested');
      if (myPlots.length >= PROFESSION_SYSTEM_CONFIG.farmPlotSlotsPerPlayer) {
        throw new Error(`Mỗi nông phu tối đa ${PROFESSION_SYSTEM_CONFIG.farmPlotSlotsPerPlayer} luống canh tác đồng thời.`);
      }

      const cropMap: Record<string, { cropId: string; cropName: string; outputItemId: string; growMs: number; minMastery: number }> = {
        MAT_PROF_SEED_WHEAT: { cropId: 'CROP_WHEAT', cropName: 'Lúa Mì Nắng Mai', outputItemId: 'MAT_PROF_WHEAT', growMs: 12000, minMastery: 1 },
        MAT_PROF_SEED_APPLE: { cropId: 'CROP_GOLDEN_APPLE', cropName: 'Táo Vàng Elysia', outputItemId: 'MAT_PROF_GOLDEN_APPLE', growMs: 24000, minMastery: 15 },
      };
      const crop = cropMap[seedItemId];
      if (!crop) throw new Error('Hạt giống không hợp lệ.');
      if (prof.level < crop.minMastery) throw new Error(`Cần Farmer Mastery Lv.${crop.minMastery}.`);

      // Allow buying/using seed seamlessly if none queued OR deduct directly if owned, else auto-charge shop price cleanly? Wait: strict inventory first!
      if (this.audit.countItem(ch, seedItemId) <= 0) {
        const mat = PROFESSION_MATERIALS.find((m) => m.id === seedItemId);
        const seedCost = Number(mat?.baseValueGold || 15);
        this.audit.deductGold(ch, seedCost, `mua hạt giống ${crop.cropName}`);
      } else {
        this.audit.consumeItem(ch, seedItemId, 1);
      }

      const now = Date.now();
      const plot: FarmPlotState = {
        plotId: `PLT_${randomUUID().slice(0, 8)}`,
        characterId: charId,
        cropId: crop.cropId,
        cropName: crop.cropName,
        seedItemId,
        outputItemId: crop.outputItemId,
        plantedAt: now,
        readyAt: now + (opts?.instantGrowForTest ? 1 : crop.growMs),
        watered: false,
        yieldBonusPct: 0,
        status: opts?.instantGrowForTest ? 'ready' : 'growing',
      };
      this.store.farmPlots.push(plot);
      this.store.save();
      return plot;
    });
  }

  public async waterFarmPlot(charId: string, plotId: string) {
    return this.audit.withLocks([`char:${charId}`], () => {
      const plot = this.store.farmPlots.find((p) => p.plotId === plotId && p.characterId === charId);
      if (!plot) throw new Error('Không tìm thấy luống đất canh tác.');
      if (plot.watered) throw new Error('Luống này đã được tưới nước.');
      plot.watered = true;
      plot.yieldBonusPct = PROFESSION_SYSTEM_CONFIG.farmWaterYieldBonusPct;
      const rem = Math.max(0, plot.readyAt - Date.now());
      plot.readyAt = Date.now() + Math.round(rem * 0.65);
      if (plot.readyAt <= Date.now()) plot.status = 'ready';
      this.store.save();
      return plot;
    });
  }

  public async harvestFarmPlot(charId: string, plotId: string) {
    return this.audit.withLocks([`char:${charId}`], () => {
      const ch = this.getCharacterOrThrow(charId);
      const prof = this.ensureLearnedProfession(ch, 'farmer');
      const idx = this.store.farmPlots.findIndex((p) => p.plotId === plotId && p.characterId === charId);
      if (idx === -1) throw new Error('Không tìm thấy luống đất.');
      const plot = this.store.farmPlots[idx];
      if (Date.now() < plot.readyAt) {
        throw new Error(`Cây trồng chưa chín (${Math.ceil((plot.readyAt - Date.now()) / 1000)}s nữa).`);
      }

      const rank = getProfessionRankForLevel(prof.level);
      let qty = 2 + (plot.watered && Math.random() * 100 < 45 + rank.extraYieldBonusPct ? 1 : 0);
      const quality: ItemQuality = Math.random() * 100 < 20 + rank.qualityBonusPct ? 'rare' : plot.watered ? 'uncommon' : 'common';

      this.audit.grantItem(ch, plot.outputItemId, qty, { quality });
      prof.totalGathered += 1;
      prof.toolDurability = Math.max(0, prof.toolDurability - 1);
      const expRes = this.awardMasteryExp(prof, 35);
      this.store.farmPlots.splice(idx, 1);
      this.store.save();
      return { plotId, harvestedItemId: plot.outputItemId, quantity: qty, quality, expResult: expRes, profession: prof };
    });
  }

  public getCraftPreview(charId: string, recipeId: string) {
    const ch = this.getCharacterOrThrow(charId);
    const recipe = PROFESSION_RECIPES.find((r) => r.id === recipeId);
    if (!recipe) throw new Error('Không tìm thấy công thức chế tạo.');
    const prof = this.ensureLearnedProfession(ch, recipe.professionId);
    const tool = PROFESSION_TOOLS.find((t) => t.id === prof.equippedToolId);
    const guildBonus = this.getProfessionGuildBonuses(ch);
    const rank = getProfessionRankForLevel(prof.level);
    const probs = computeCraftProbabilities({
      masteryLevel: prof.level,
      recipeRequiredMastery: recipe.requiredMastery,
      baseSuccessRatePct: recipe.baseSuccessRatePct,
      baseExtraYieldChancePct: recipe.baseExtraYieldChancePct,
      toolQualityBonusPct: Number(tool?.qualityBonusPct || 0),
      toolExtraYieldBonusPct: Number(tool?.extraYieldBonusPct || 0),
      guildOrBuffQualityBonusPct: guildBonus.qualityBonusPct,
    });
    const sameCrafts = Number(prof.recipeCraftCounts?.[recipe.id] || 0);
    const expectedExp = computeDiminishingCraftExp(recipe.expReward, prof.level, recipe.requiredMastery, sameCrafts);
    return {
      recipe,
      successProbabilityPct: probs.successProbabilityPct,
      extraYieldProbabilityPct: probs.extraYieldProbabilityPct,
      qualityProbabilities: probs.qualityProbabilities,
      materialSaveChancePct: rank.materialSaveChancePct,
      guildQualityBonusPct: guildBonus.qualityBonusPct,
      expectedExp,
      diminished: expectedExp < recipe.expReward,
    };
  }

  public async learnRecipe(charId: string, recipeId: string) {
    return this.audit.withLocks([`char:${charId}`], () => {
      const ch = this.getCharacterOrThrow(charId);
      const recipe = PROFESSION_RECIPES.find((r) => r.id === recipeId);
      if (!recipe) throw new Error('Công thức không tồn tại.');
      if (recipe.isHidden && recipe.requiresQuestId) {
        const prof = this.ensureLearnedProfession(ch, recipe.professionId);
        if (!prof.completedQuestIds.includes(recipe.requiresQuestId)) {
          throw new Error('Công thức Truyền Thuyết ẩn phải mở khóa qua nhiệm vụ Sư Phụ!');
        }
      }
      const prof = this.ensureLearnedProfession(ch, recipe.professionId);
      if (prof.level < recipe.requiredMastery) {
        throw new Error(`Cần Mastery Lv.${recipe.requiredMastery} để học "${recipe.nameVi}".`);
      }
      if (!prof.learnedRecipeIds.includes(recipe.id)) {
        prof.learnedRecipeIds.push(recipe.id);
        this.awardMasteryExp(prof, 30);
        this.store.save();
      }
      return { profession: prof, recipe };
    });
  }

  public async craftRecipe(
    charId: string,
    recipeId: string,
    quantity = 1,
    txId?: string
  ): Promise<{
    recipe: ProfessionRecipeDefinition;
    craftsAttempted: number;
    craftsSucceeded: number;
    totalProduced: number;
    extraProduced: number;
    results: Array<{ quality: ItemQuality; quantity: number; extraYield: number }>;
    expResult: { levelsGained: number; expAdded: number };
    profession: PlayerProfessionProgress;
    gold: number;
  }> {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      throw new Error('Số lần chế tạo mỗi lượt phải từ 1 đến 20.');
    }

    return this.audit.withLocks([`char:${charId}`], () => {
      this.audit.enforceRateLimit(`craft:${charId}`, 25, 10000);
      const claimId = this.audit.claimIdempotencyKey(txId);
      const ch = this.getCharacterOrThrow(charId);
      const recipe = PROFESSION_RECIPES.find((r) => r.id === recipeId);
      if (!recipe) throw new Error('Công thức không tồn tại.');
      const prof = this.ensureLearnedProfession(ch, recipe.professionId);

      if (prof.level < recipe.requiredMastery) {
        throw new Error(`Yêu cầu ${recipe.professionId} Mastery Lv.${recipe.requiredMastery}.`);
      }
      if (recipe.isHidden && !prof.learnedRecipeIds.includes(recipe.id)) {
        throw new Error('Bạn chưa lĩnh ngộ công thức bí truyền này!');
      }
      if (!prof.learnedRecipeIds.includes(recipe.id)) {
        prof.learnedRecipeIds.push(recipe.id);
      }

      const tool = PROFESSION_TOOLS.find((t) => t.id === prof.equippedToolId);
      if (prof.toolDurability < quantity) {
        throw new Error(`Độ bền công cụ không đủ (${prof.toolDurability}/${quantity}). Hãy sửa chữa!`);
      }
      if (ch.professionDailyStats.craftActions + quantity > PROFESSION_SYSTEM_CONFIG.dailyCraftSoftCap) {
        throw new Error('Đạt giới hạn chế tạo hằng ngày!');
      }

      // Atomic verification of Gold & ALL materials BEFORE modifying inventory
      const totalGoldCost = recipe.craftCostGold * quantity;
      if (Number(ch.gold || 0) < totalGoldCost) {
        throw new Error(`Không đủ Vàng (cần ${totalGoldCost.toLocaleString()} G).`);
      }
      for (const req of recipe.materials) {
        const have = this.audit.countItem(ch, req.itemId, req.minQuality);
        if (have < req.quantity * quantity) {
          throw new Error(`Không đủ nguyên liệu "${req.itemId}" (cần ${req.quantity * quantity}, hiện có ${have}).`);
        }
      }

      // Snap inventory & gold to support strict rollback if unexpected error happens
      const goldBackup = ch.gold;
      const invBackup = JSON.parse(JSON.stringify(ch.inventory || []));

      try {
        this.audit.deductGold(ch, totalGoldCost, `chế tạo ${recipe.nameVi}`);
        const rank = getProfessionRankForLevel(prof.level);
        const guildBonus = this.getProfessionGuildBonuses(ch);
        let materialQualityBonusSum = 0;

        for (let iter = 0; iter < quantity; iter++) {
          for (const req of recipe.materials) {
            // Higher Mastery unlocks material efficiency chance!
            const saved = Math.random() * 100 < rank.materialSaveChancePct;
            const toConsume = saved && req.quantity > 1 ? req.quantity - 1 : req.quantity;
            const consumed = this.audit.consumeItem(ch, req.itemId, toConsume, req.minQuality);
            for (const q of consumed.consumedQualities) {
              materialQualityBonusSum += (QUALITY_TIER_ORDER[q] - 1) * 4;
            }
          }
        }

        const avgMatBonus = materialQualityBonusSum / Math.max(1, quantity * recipe.materials.length);
        const results: Array<{ quality: ItemQuality; quantity: number; extraYield: number }> = [];
        let craftsSucceeded = 0;
        let totalProduced = 0;
        let extraProduced = 0;
        let totalExpGained = 0;

        for (let iter = 0; iter < quantity; iter++) {
          const outcome = rollCraftQualityAndYield({
            masteryLevel: prof.level,
            recipeRequiredMastery: recipe.requiredMastery,
            baseSuccessRatePct: recipe.baseSuccessRatePct,
            baseExtraYieldChancePct: recipe.baseExtraYieldChancePct,
            maxExtraYieldQty: recipe.maxExtraYieldQty,
            toolQualityBonusPct: Number(tool?.qualityBonusPct || 0),
            toolExtraYieldBonusPct: Number(tool?.extraYieldBonusPct || 0),
            materialQualityBonusPct: avgMatBonus,
            guildOrBuffQualityBonusPct: guildBonus.qualityBonusPct,
          });
          prof.toolDurability = Math.max(0, prof.toolDurability - 1);
          prof.recipeCraftCounts[recipe.id] = Number(prof.recipeCraftCounts[recipe.id] || 0) + 1;

          const iterExp = computeDiminishingCraftExp(
            outcome.success ? recipe.expReward : Math.round(recipe.expReward * 0.2),
            prof.level,
            recipe.requiredMastery,
            prof.recipeCraftCounts[recipe.id]
          );
          totalExpGained += iterExp;

          if (!outcome.success) {
            results.push({ quality: 'common', quantity: 0, extraYield: 0 });
            continue;
          }
          craftsSucceeded += 1;
          const producedQty = recipe.outputQuantity + outcome.extraYield;
          totalProduced += producedQty;
          extraProduced += outcome.extraYield;
          results.push({ quality: outcome.quality, quantity: producedQty, extraYield: outcome.extraYield });

          this.audit.grantItem(ch, recipe.outputItemId, producedQty, {
            quality: outcome.quality,
            rarity: outcome.quality,
            name: recipe.outputName,
          });
          prof.productionHistory.unshift({
            id: `PRD_${randomUUID().slice(0, 8)}`,
            recipeId: recipe.id,
            recipeName: recipe.nameVi,
            outputItemId: recipe.outputItemId,
            quantity: producedQty,
            extraYield: outcome.extraYield,
            quality: outcome.quality,
            expGained: iterExp,
            createdAt: new Date().toISOString(),
          });
        }

        if (prof.productionHistory.length > 30) prof.productionHistory.length = 30;
        prof.totalCrafted += craftsSucceeded;
        ch.professionDailyStats.craftActions += quantity;

        const expResult = this.awardMasteryExp(prof, totalExpGained);
        this.audit.recordAudit({
          txId: claimId,
          category: 'profession',
          actorCharacterId: charId,
          goldDelta: -totalGoldCost,
          itemId: recipe.outputItemId,
          quantity: totalProduced,
          details: `Chế tạo ${recipe.nameVi} x${quantity} -> thành công ${craftsSucceeded}, sản lượng ${totalProduced} (+${extraProduced} extra)`,
        });
        this.store.save();

        return {
          recipe,
          craftsAttempted: quantity,
          craftsSucceeded,
          totalProduced,
          extraProduced,
          results,
          expResult,
          profession: prof,
          gold: ch.gold,
        };
      } catch (err) {
        ch.gold = goldBackup;
        ch.inventory = invBackup;
        throw err;
      }
    });
  }

  public async completeProfessionQuest(charId: string, questId: string) {
    return this.audit.withLocks([`char:${charId}`], () => {
      const ch = this.getCharacterOrThrow(charId);
      const quest = PROFESSION_QUESTS.find((q) => q.id === questId);
      if (!quest) throw new Error('Không tìm thấy nhiệm vụ nghề.');
      const prof = this.ensureLearnedProfession(ch, quest.professionId);
      if (prof.level < quest.requiredMastery) {
        throw new Error(`Yêu cầu Mastery Lv.${quest.requiredMastery} để nhận/hoàn thành nhiệm vụ này.`);
      }

      if (quest.questKind === 'daily') {
        if (prof.dailyCompletedQuestIds.includes(quest.id)) {
          throw new Error('Nhiệm vụ nghề hằng ngày này đã hoàn thành hôm nay.');
        }
      } else if (prof.completedQuestIds.includes(quest.id)) {
        throw new Error('Nhiệm vụ nghề này đã được hoàn thành trước đó.');
      }

      if (quest.requiredItemId) {
        this.audit.consumeItem(ch, quest.requiredItemId, quest.requiredQty);
      }

      if (quest.questKind === 'daily') prof.dailyCompletedQuestIds.push(quest.id);
      else prof.completedQuestIds.push(quest.id);

      let unlockedRecipe: string | null = null;
      if (quest.unlocksRecipeId && !prof.learnedRecipeIds.includes(quest.unlocksRecipeId)) {
        prof.learnedRecipeIds.push(quest.unlocksRecipeId);
        unlockedRecipe = quest.unlocksRecipeId;
      }
      if (quest.unlocksProfessionSlot && ch.unlockedProfessionSlots < PROFESSION_SYSTEM_CONFIG.absoluteMaxProfessions) {
        ch.unlockedProfessionSlots += 1;
      }

      this.audit.addGold(ch, quest.rewardGold);
      const expResult = this.awardMasteryExp(prof, quest.rewardExp);
      this.audit.recordAudit({
        txId: `PQ_${randomUUID().slice(0, 8)}`,
        category: 'profession',
        actorCharacterId: charId,
        goldDelta: quest.rewardGold,
        details: `Hoàn thành nhiệm vụ nghề "${quest.nameVi}"`,
      });
      this.store.save();

      return {
        quest,
        unlockedRecipe,
        unlockedProfessionSlots: ch.unlockedProfessionSlots,
        expResult,
        profession: prof,
        gold: ch.gold,
      };
    });
  }
}
