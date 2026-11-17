import {
  ActiveQuestProgress,
  CharacterEntity,
  QuestChainDefinition,
  QuestChainProgressState,
  QuestDefinition,
  QuestStatusState,
  TitleBonusSummary,
  TitleDefinition,
  UniqueEquipmentDefinition,
} from '@elysia/game-types';
import {
  ATTRIBUTE_POINTS_PER_LEVEL,
  getPotentialPointsPerLevel,
  INITIAL_ITEMS,
  checkUniqueEquipmentBinding,
  computeExpRequiredForLevel,
  computePermanentTitleBonuses,
  validateQuestTitleDataIntegrity,
} from '@elysia/game-data-schema';
import { JsonStore } from '../database/jsonStore.js';
import { WorldService } from './world.service.js';

export interface QuestProgressEvent {
  type:
    | 'NPC_DIALOGUE'
    | 'TALK_NPC'
    | 'TALK_TO_NPC'
    | 'COLLECT_ITEM'
    | 'OBTAIN_ITEM'
    | 'KILL_MONSTER'
    | 'DEFEAT_BOSS'
    | 'EXPLORE_MAP'
    | 'ENTER_MAP'
    | 'VISIT_LOCATION'
    | 'USE_ITEM'
    | 'EQUIP_ITEM'
    | 'REACH_LEVEL'
    | 'COMPLETE_QUEST'
    | 'INTERACT_OBJECT';
  targetId: string;
  amount?: number;
  keyword?: string;
}

export class QuestTitleService {
  private static instance: QuestTitleService;
  private store = JsonStore.getInstance();
  private world = WorldService.getInstance();
  private claimLocks = new Set<string>();

  public static getInstance(): QuestTitleService {
    if (!QuestTitleService.instance) {
      QuestTitleService.instance = new QuestTitleService();
    }
    return QuestTitleService.instance;
  }

  private getQuests(includeAll = false): QuestDefinition[] {
    return this.world.getQuests(includeAll) || [];
  }

  private getChains(includeAll = false): QuestChainDefinition[] {
    return this.world.getQuestChains(includeAll) || [];
  }

  private getUniqueCatalog(includeAll = false): UniqueEquipmentDefinition[] {
    return this.world.getUniqueEquipment(includeAll) || [];
  }

  private getTitlesCatalog(includeAll = false): TitleDefinition[] {
    return this.world.getTitles(includeAll) || [];
  }

  private getMergedItems() {
    const map = new Map<string, any>();
    for (const it of INITIAL_ITEMS) map.set(it.id, it);
    for (const it of this.world.getWorldItems(false)) map.set(it.id, it);
    for (const it of this.getUniqueCatalog(false)) map.set(it.id, it);
    for (const it of this.store.items) map.set(it.id, it);
    return Array.from(map.values());
  }

  public ensureSaveFields(char: CharacterEntity) {
    if (!Array.isArray(char.completedQuests)) char.completedQuests = [];
    if (!char.completedQuestHistory || typeof char.completedQuestHistory !== 'object') char.completedQuestHistory = {};
    if (!char.activeQuests || typeof char.activeQuests !== 'object') char.activeQuests = {};
    if (char.trackedQuestId === undefined) char.trackedQuestId = null;
    if (!Array.isArray(char.discoveredHiddenQuests)) char.discoveredHiddenQuests = [];
    if (!char.questChainProgress || typeof char.questChainProgress !== 'object') char.questChainProgress = {};
    if (!Array.isArray(char.visitedMaps)) char.visitedMaps = [char.regionId || 'THON_KHOI_NGUYEN'];
    if (!char.monsterKillCounts || typeof char.monsterKillCounts !== 'object') char.monsterKillCounts = {};
    if (!Array.isArray(char.dialogueFlags)) char.dialogueFlags = [];
    if (!Array.isArray(char.ownedUniqueEquipmentIds)) char.ownedUniqueEquipmentIds = [];
    if (!Array.isArray(char.unlockedTitles)) char.unlockedTitles = [];
    if (char.equippedCosmeticTitleId === undefined) char.equippedCosmeticTitleId = null;
    if (!Array.isArray(char.claimedRewardKeys)) char.claimedRewardKeys = [];
    if (!Array.isArray(char.inventory)) char.inventory = [];
    if (char.trackedQuestId && !char.activeQuests[char.trackedQuestId]) {
      char.trackedQuestId = null;
    }
    return char;
  }

  private requireCharacter(characterId: string): CharacterEntity {
    const char = this.store.characters.find((c) => c.id === characterId);
    if (!char) throw new Error(`Nhân vật "${characterId}" không tồn tại.`);
    return this.ensureSaveFields(char);
  }

  private countInventoryItem(char: CharacterEntity, itemId: string): number {
    return (char.inventory || []).reduce(
      (sum, slot) => ((slot.itemId || slot.item_id) === itemId ? sum + Number(slot.quantity || 1) : sum),
      0
    );
  }

  private addItemToInventory(char: CharacterEntity, itemId: string, quantity: number) {
    const allItems = this.getMergedItems();
    const meta = allItems.find((i) => i.id === itemId || i.itemId === itemId);
    const inv = (char.inventory ||= []);
    const stackable = meta ? meta.stackable !== false && !meta.isUnique && !meta.equipSlot : true;
    const stackLimit = Math.max(1, Number(meta?.stackLimit ?? meta?.maxStack ?? 99));

    if (stackable) {
      let rem = quantity;
      for (const s of inv) {
        if ((s.itemId || s.item_id) !== itemId || Number(s.quantity || 0) >= stackLimit) continue;
        const add = Math.min(rem, stackLimit - Number(s.quantity || 0));
        s.quantity = Number(s.quantity || 0) + add;
        rem -= add;
        if (rem <= 0) break;
      }
      while (rem > 0) {
        const add = Math.min(rem, stackLimit);
        const used = new Set(inv.map((s) => Number(s.slotId)));
        let slotId = 0;
        while (used.has(slotId)) slotId += 1;
        inv.push({ slotId, itemId, name: meta?.name || itemId, quantity: add });
        rem -= add;
      }
    } else {
      for (let i = 0; i < quantity; i++) {
        const used = new Set(inv.map((s) => Number(s.slotId)));
        let slotId = 0;
        while (used.has(slotId)) slotId += 1;
        inv.push({
          slotId,
          itemId,
          name: meta?.name || itemId,
          category: meta?.category || 'equipment',
          isUnique: Boolean(meta?.isUnique),
          boundCharacterId: meta?.isCharacterBound ? char.id : undefined,
          boundUserId: meta?.isAccountBound ? char.userId : undefined,
          quantity: 1,
        });
      }
    }
  }

  private doesTargetMatch(objTargetId?: string, eventTargetId?: string): boolean {
    if (!objTargetId || objTargetId === 'ANY') return true;
    if (!eventTargetId) return false;
    if (objTargetId === eventTargetId) return true;
    const slimeAliases = new Set(['MONSTER_GREEN_SLIME', 'MONSTER_SLIME_MEADOW', 'mon_green_slime', 'mon_red_slime', 'monster_slime']);
    if (slimeAliases.has(objTargetId) && slimeAliases.has(eventTargetId)) return true;
    const goblinAliases = new Set(['MONSTER_GOBLIN_SCOUT', 'mon_goblin_scout', 'monster_goblin']);
    if (goblinAliases.has(objTargetId) && goblinAliases.has(eventTargetId)) return true;
    return false;
  }

  private syncCollectionAndExploreObjectives(char: CharacterEntity, progress: ActiveQuestProgress, def: QuestDefinition) {
    let allDone = true;
    for (const obj of def.objectives || []) {
      const reqCount = Math.max(1, Number(obj.requiredCount ?? (obj as any).required ?? 1));
      let cur = Number(progress.objectives[obj.id] || 0);
      if (obj.type === 'COLLECT_ITEM') {
        cur = Math.max(cur, this.countInventoryItem(char, obj.targetId));
      } else if (obj.type === 'EXPLORE_MAP' || obj.type === 'VISIT_LOCATION') {
        if ((char.visitedMaps || []).includes(obj.targetId)) cur = Math.max(cur, 1);
      } else if (obj.type === 'REACH_LEVEL') {
        const targetLv = Number(obj.targetId) || reqCount || 1;
        if (Number(char.level || 1) >= targetLv) {
          cur = Math.max(cur, reqCount);
        }
      } else if (obj.type === 'EQUIP_ITEM') {
        const equippedVals = Object.values(char.equipment || {});
        if (equippedVals.includes(obj.targetId) || (obj.targetId === 'ANY' && equippedVals.length > 0)) {
          cur = Math.max(cur, 1);
        }
      } else if (obj.type === 'COMPLETE_QUEST') {
        if ((char.completedQuests || []).includes(obj.targetId)) {
          cur = Math.max(cur, 1);
        }
      } else if (obj.type === 'KILL_MONSTER' || obj.type === 'DEFEAT_BOSS') {
        // Active kill objectives track live combat progress
      }
      const capped = Math.min(reqCount, cur);
      progress.objectives[obj.id] = capped;
      if (capped < reqCount) allDone = false;
    }
    progress.completed = allDone;
  }

  private syncChainProgressOnQuestAcceptOrComplete(char: CharacterEntity, questDef: QuestDefinition, completed: boolean) {
    if (!questDef.chainId) return;
    const chain = this.getChains(true).find((c) => c.id === questDef.chainId);
    if (!chain) return;
    const existing: QuestChainProgressState = char.questChainProgress![chain.id] || {
      chainId: chain.id,
      currentStep: 1,
      completedSteps: [],
      completed: false,
    };
    if (completed && !existing.completedSteps.includes(questDef.id)) {
      existing.completedSteps.push(questDef.id);
    }
    const doneAll = chain.quests.every((qid) => existing.completedSteps.includes(qid));
    existing.completed = doneAll;
    existing.currentStep = doneAll
      ? chain.quests.length
      : Math.min(chain.quests.length, existing.completedSteps.length + 1);
    char.questChainProgress![chain.id] = existing;
  }

  public isQuestHiddenFromPlayer(char: CharacterEntity, q: QuestDefinition): boolean {
    const hidden = Boolean(q.isHidden || q.questType === 'HIDDEN_QUEST');
    if (!hidden) return false;
    return (
      !(char.discoveredHiddenQuests || []).includes(q.id) &&
      !char.activeQuests?.[q.id] &&
      !(char.completedQuests || []).includes(q.id)
    );
  }

  public getQuestStateForPlayer(char: CharacterEntity, q: QuestDefinition): QuestStatusState {
    const isHidden = Boolean(q.isHidden || q.questType === 'HIDDEN_QUEST');
    const active = char.activeQuests?.[q.id];
    const completed = !q.repeatable && (char.completedQuests || []).includes(q.id);
    if (completed) return 'COMPLETED';
    if (active) {
      this.syncCollectionAndExploreObjectives(char, active, q);
      return active.completed ? 'READY_TO_COMPLETE' : 'ACTIVE';
    }
    if (isHidden) {
      return (char.discoveredHiddenQuests || []).includes(q.id) ? 'UNLOCKED_HIDDEN' : 'HIDDEN';
    }
    if (Number(char.level || 1) < Number(q.requiredLevel || 1)) return 'LOCKED';
    if ((q.prerequisiteQuestIds || []).some((pre) => !(char.completedQuests || []).includes(pre))) return 'LOCKED';
    if ((q.requiredTitleIds || []).some((tid) => !(char.unlockedTitles || []).includes(tid))) return 'LOCKED';
    return 'AVAILABLE';
  }

  private buildTrackedQuestView(char: CharacterEntity, quests: QuestDefinition[]) {
    const trackedId = char.trackedQuestId || null;
    if (!trackedId) return null;
    const progress = char.activeQuests?.[trackedId];
    if (!progress) return null;
    const def = quests.find((q) => q.id === trackedId);
    if (!def) return null;
    this.syncCollectionAndExploreObjectives(char, progress, def);
    return {
      questId: def.id,
      name: def.name,
      description: def.description,
      questType: def.questType,
      regionId: def.regionId,
      startNpcId: def.startNpcId,
      endNpcId: def.endNpcId,
      status: (progress.completed ? 'READY_TO_COMPLETE' : 'ACTIVE') as QuestStatusState,
      completed: Boolean(progress.completed),
      startedAt: progress.startedAt,
      objectives: (def.objectives || []).map((o) => {
        const req = Math.max(1, Number(o.requiredCount ?? (o as any).required ?? 1));
        return {
          id: o.id,
          type: o.type,
          targetId: o.targetId,
          targetName: o.targetName || o.targetId,
          description: o.description,
          current: Math.min(req, Number(progress.objectives[o.id] || 0)),
          required: req,
        };
      }),
      rewards: def.rewards,
    };
  }

  /**
   * Returns only player-visible quests (never leaks undiscovered Hidden Quests) plus 4-tab categorization,
   * single tracked quest state, and title & chain progress.
   */
  public getPlayerJournal(characterId: string) {
    const char = this.requireCharacter(characterId);
    const quests = this.getQuests(false);
    const allQuests = this.getQuests(true);
    const visibleQuests = quests.filter((q) => !this.isQuestHiddenFromPlayer(char, q));

    // Tab 1: Available Quests (strictly non-hidden, unlocked, level-eligible, non-active, non-completed)
    const availableQuests = visibleQuests.filter((q) => {
      if (q.isHidden || q.questType === 'HIDDEN_QUEST') return false;
      if (char.activeQuests![q.id]) return false;
      if (!q.repeatable && char.completedQuests!.includes(q.id)) return false;
      if (char.level < Number(q.requiredLevel || 1)) return false;
      return (q.prerequisiteQuestIds || []).every((pre) => char.completedQuests!.includes(pre));
    });

    // Tab 2: Active Quests (includes ACTIVE and READY_TO_COMPLETE)
    const activeQuestList = Object.values(char.activeQuests || {}).map((progress) => {
      const def = allQuests.find((q) => q.id === progress.questId);
      if (def) {
        this.syncCollectionAndExploreObjectives(char, progress, def);
      }
      return {
        ...progress,
        id: progress.questId,
        status: (progress.completed ? 'READY_TO_COMPLETE' : 'ACTIVE') as QuestStatusState,
        isTracked: char.trackedQuestId === progress.questId,
        name: def?.name || progress.questId,
        description: def?.description || '',
        questType: def?.questType || 'SIDE_QUEST',
        regionId: def?.regionId || 'THON_KHOI_NGUYEN',
        startNpcId: def?.startNpcId || '',
        endNpcId: def?.endNpcId || '',
        abandonable: def?.abandonable !== false,
        rewards: def?.rewards,
      };
    });
    const readyToCompleteQuests = activeQuestList.filter((q) => q.completed);

    // Tab 3: Completed Quests (strictly completed & claimed quests; never appear in Available)
    const completedQuestDetails = (char.completedQuests || []).map((qid) => {
      const def = allQuests.find((q) => q.id === qid);
      const hist = char.completedQuestHistory?.[qid];
      return {
        id: qid,
        questId: qid,
        name: def?.name || qid,
        description: def?.description || '',
        questType: def?.questType || 'MAIN_QUEST',
        regionId: def?.regionId || 'THON_KHOI_NGUYEN',
        startNpcId: def?.startNpcId || '',
        endNpcId: def?.endNpcId || '',
        completedAt: hist?.completedAt || char.updatedAt || new Date().toISOString(),
        rewards: hist?.rewards || def?.rewards || { exp: 0, gold: 0, items: [] },
        status: 'COMPLETED' as QuestStatusState,
      };
    });

    // Tab 4: Unlocked Hidden Quests (ONLY discovered hidden quests)
    const unlockedHiddenQuests = quests
      .filter((q) => (q.isHidden || q.questType === 'HIDDEN_QUEST') && !this.isQuestHiddenFromPlayer(char, q))
      .map((q) => ({
        ...q,
        playerState: this.getQuestStateForPlayer(char, q),
      }));

    const trackedQuest = this.buildTrackedQuestView(char, allQuests);
    if (char.trackedQuestId && !trackedQuest) {
      char.trackedQuestId = null;
    }

    const bonusSummary = this.recalculateTitleBonuses(char.id);
    return {
      characterId: char.id,
      visibleQuests,
      availableQuests,
      activeQuests: activeQuestList,
      readyToCompleteQuests,
      completedQuests: [...(char.completedQuests || [])],
      completedQuestDetails,
      discoveredHiddenQuests: [...(char.discoveredHiddenQuests || [])],
      unlockedHiddenQuests,
      trackedQuestId: char.trackedQuestId || null,
      trackedQuest,
      questChainProgress: { ...(char.questChainProgress || {}) },
      ownedUniqueEquipmentIds: [...(char.ownedUniqueEquipmentIds || [])],
      unlockedTitles: [...(char.unlockedTitles || [])],
      equippedCosmeticTitleId: char.equippedCosmeticTitleId || null,
      titleBonuses: bonusSummary,
    };
  }

  /**
   * Accepts a Main/Side/Chain quest (or discovers & starts when bypassPrerequisites/debug or hidden trigger).
   */
  public acceptQuest(
    characterId: string,
    questId: string,
    opts: { bypassPrerequisites?: boolean; fromHiddenTrigger?: boolean; trackImmediate?: boolean } = {}
  ) {
    const char = this.requireCharacter(characterId);
    const quest = this.getQuests(opts.bypassPrerequisites).find((q) => q.id === questId);
    if (!quest) throw new Error(`Nhiệm vụ "${questId}" không tồn tại.`);

    if (!opts.fromHiddenTrigger && !opts.bypassPrerequisites && this.isQuestHiddenFromPlayer(char, quest)) {
      const err: any = new Error(`Nhiệm vụ bí ẩn "${questId}" chưa được kích hoạt.`);
      err.statusCode = 403;
      throw err;
    }

    if (!quest.repeatable && (char.completedQuests!.includes(questId) || char.claimedRewardKeys!.includes(`quest:${questId}`))) {
      throw new Error(`Nhiệm vụ "${quest.name}" không thể nhận lại sau khi đã hoàn thành.`);
    }

    if (!opts.bypassPrerequisites) {
      if (char.level < Number(quest.requiredLevel || 1)) {
        throw new Error(`Cần đạt Lv.${quest.requiredLevel} để nhận "${quest.name}".`);
      }
      for (const pre of quest.prerequisiteQuestIds || []) {
        if (!char.completedQuests!.includes(pre)) {
          throw new Error(`Cần hoàn thành nhiệm vụ tiền đề "${pre}" trước.`);
        }
      }
      for (const tid of quest.requiredTitleIds || []) {
        if (!char.unlockedTitles!.includes(tid)) {
          throw new Error(`Cần danh hiệu "${tid}" để mở khóa nhiệm vụ này.`);
        }
      }
      for (const itemId of quest.requiredItemIds || []) {
        if (this.countInventoryItem(char, itemId) <= 0) {
          throw new Error(`Cần sở hữu vật phẩm "${itemId}" trước khi nhận nhiệm vụ.`);
        }
      }
    }

    if (!char.activeQuests![questId]) {
      const objMap: Record<string, number> = {};
      for (const o of quest.objectives || []) objMap[o.id] = 0;
      const entry: ActiveQuestProgress = {
        questId,
        startedAt: new Date().toISOString(),
        objectives: objMap,
        completed: false,
        hiddenDiscovered: Boolean(quest.isHidden || quest.questType === 'HIDDEN_QUEST'),
      };
      this.syncCollectionAndExploreObjectives(char, entry, quest);
      char.activeQuests![questId] = entry;
      if ((quest.isHidden || quest.questType === 'HIDDEN_QUEST') && !char.discoveredHiddenQuests!.includes(questId)) {
        char.discoveredHiddenQuests!.push(questId);
      }
      // Single-Quest Tracker Rule: Only auto-track if no quest is currently tracked or trackImmediate is requested
      if (!char.trackedQuestId || opts.trackImmediate) {
        char.trackedQuestId = questId;
      }
      this.syncChainProgressOnQuestAcceptOrComplete(char, quest, false);
      char.updatedAt = new Date().toISOString();
      this.store.save();
    } else if (opts.trackImmediate) {
      char.trackedQuestId = questId;
      char.updatedAt = new Date().toISOString();
      this.store.save();
    }

    return {
      ...char.activeQuests![questId],
      trackedQuestId: char.trackedQuestId || null,
      trackedQuest: this.buildTrackedQuestView(char, this.getQuests(true)),
    };
  }

  /**
   * Tracks or untracks a single active quest on the HUD (`trackedQuestId`).
   * Strictly enforces at most 1 tracked quest per character at any time.
   */
  public trackQuest(characterId: string, questId: string | null) {
    const char = this.requireCharacter(characterId);
    const allQuests = this.getQuests(true);
    if (!questId || questId === 'none' || questId === 'untrack') {
      char.trackedQuestId = null;
      char.updatedAt = new Date().toISOString();
      this.store.save();
      return {
        characterId: char.id,
        trackedQuestId: null,
        trackedQuest: null,
      };
    }

    if (!char.activeQuests?.[questId]) {
      const err: any = new Error(`Chỉ có thể theo dõi nhiệm vụ đang thực hiện (${questId}).`);
      err.statusCode = 400;
      throw err;
    }

    // Replace previous tracked quest immediately (Single-Quest Tracker Rule)
    char.trackedQuestId = questId;
    char.updatedAt = new Date().toISOString();
    this.store.save();

    return {
      characterId: char.id,
      trackedQuestId: char.trackedQuestId,
      trackedQuest: this.buildTrackedQuestView(char, allQuests),
    };
  }

  /**
   * Abandons an active quest when permitted. Clears trackedQuestId if this quest was tracked.
   */
  public abandonQuest(characterId: string, questId: string) {
    const char = this.requireCharacter(characterId);
    const active = char.activeQuests?.[questId];
    if (!active) {
      const err: any = new Error(`Nhân vật hiện không thực hiện nhiệm vụ "${questId}".`);
      err.statusCode = 400;
      throw err;
    }
    const def = this.getQuests(true).find((q) => q.id === questId);
    if (def && def.abandonable === false) {
      const err: any = new Error(`Nhiệm vụ cốt truyện "${def.name}" không thể hủy bỏ.`);
      err.statusCode = 403;
      throw err;
    }

    delete char.activeQuests![questId];
    if (char.trackedQuestId === questId) {
      char.trackedQuestId = null;
    }
    char.updatedAt = new Date().toISOString();
    this.store.save();

    return {
      success: true,
      characterId: char.id,
      abandonedQuestId: questId,
      trackedQuestId: char.trackedQuestId || null,
      activeQuests: Object.values(char.activeQuests || {}),
    };
  }

  public evaluateHiddenTriggers(char: CharacterEntity, event: QuestProgressEvent): QuestDefinition[] {
    const quests = this.getQuests(false);
    const newlyDiscovered: QuestDefinition[] = [];
    const normalizedType =
      event.type === 'EXPLORE_MAP' || event.type === 'VISIT_LOCATION'
        ? 'ENTER_MAP'
        : event.type === 'TALK_NPC' || event.type === 'TALK_TO_NPC'
        ? 'NPC_DIALOGUE'
        : event.type === 'COLLECT_ITEM'
        ? 'OBTAIN_ITEM'
        : event.type === 'DEFEAT_BOSS'
        ? 'KILL_MONSTER'
        : event.type;

    for (const q of quests) {
      if (!(q.isHidden || q.questType === 'HIDDEN_QUEST') || !q.hiddenTrigger) continue;
      if (char.discoveredHiddenQuests!.includes(q.id) || char.completedQuests!.includes(q.id) || char.activeQuests![q.id]) {
        continue;
      }
      const trig = q.hiddenTrigger;
      if (Number(char.level || 1) < Number(trig.minLevel ?? q.requiredLevel ?? 1)) continue;
      if ((trig.requiredCompletedQuestIds || []).some((reqId) => !char.completedQuests!.includes(reqId))) continue;

      let matched = false;
      if (trig.type === normalizedType && (!trig.targetId || trig.targetId === event.targetId)) {
        if (trig.type === 'NPC_DIALOGUE') {
          matched = !trig.dialogueKeyword || trig.dialogueKeyword === event.keyword;
        } else {
          matched = true;
        }
      } else if (trig.type === 'LEVEL_AND_QUEST' && char.level >= Number(trig.minLevel || 1)) {
        matched = true;
      }

      if (matched) {
        this.acceptQuest(char.id, q.id, { bypassPrerequisites: false, fromHiddenTrigger: true });
        newlyDiscovered.push(q);
      }
    }

    return newlyDiscovered;
  }

  /**
   * Advances dialogue, item collection, monster hunt, map exploration, hidden discovery & automatic title unlocks.
   */
  public recordProgress(characterId: string, event: QuestProgressEvent) {
    const char = this.requireCharacter(characterId);
    const normalizedType =
      event.type === 'ENTER_MAP' || event.type === 'VISIT_LOCATION'
        ? 'EXPLORE_MAP'
        : event.type === 'TALK_NPC' || event.type === 'TALK_TO_NPC'
        ? 'NPC_DIALOGUE'
        : event.type === 'OBTAIN_ITEM'
        ? 'COLLECT_ITEM'
        : event.type === 'DEFEAT_BOSS'
        ? 'KILL_MONSTER'
        : event.type;

    if (normalizedType === 'EXPLORE_MAP' && event.targetId) {
      if (!char.visitedMaps!.includes(event.targetId)) char.visitedMaps!.push(event.targetId);
    } else if (normalizedType === 'KILL_MONSTER' && event.targetId) {
      char.monsterKillCounts![event.targetId] =
        Number(char.monsterKillCounts![event.targetId] || 0) + Math.max(1, Number(event.amount || 1));
    } else if (normalizedType === 'NPC_DIALOGUE' && event.targetId) {
      const flag = event.keyword ? `${event.targetId}:${event.keyword}` : event.targetId;
      if (!char.dialogueFlags!.includes(flag)) char.dialogueFlags!.push(flag);
    }

    const newlyDiscovered = this.evaluateHiddenTriggers(char, event);

    const quests = this.getQuests(true);
    const updatedQuestIds: string[] = [];

    for (const progress of Object.values(char.activeQuests || {})) {
      const def = quests.find((q) => q.id === progress.questId);
      if (!def) continue;
      let changed = false;

      for (const obj of def.objectives || []) {
        const reqCount = Math.max(1, Number(obj.requiredCount ?? (obj as any).required ?? 1));
        const objNorm =
          obj.type === 'TALK_NPC' || obj.type === 'TALK_TO_NPC'
            ? 'NPC_DIALOGUE'
            : obj.type === 'VISIT_LOCATION'
            ? 'EXPLORE_MAP'
            : obj.type === 'DEFEAT_BOSS'
            ? 'KILL_MONSTER'
            : obj.type;
        if (objNorm === 'COLLECT_ITEM') {
          const invCount = this.countInventoryItem(char, obj.targetId);
          const next = Math.min(reqCount, Math.max(Number(progress.objectives[obj.id] || 0), invCount));
          if (next !== progress.objectives[obj.id]) {
            progress.objectives[obj.id] = next;
            changed = true;
          }
          continue;
        }
        if (objNorm === 'REACH_LEVEL') {
          const targetLv = Number(obj.targetId) || reqCount || 1;
          if (Number(char.level || 1) >= targetLv && Number(progress.objectives[obj.id] || 0) < reqCount) {
            progress.objectives[obj.id] = reqCount;
            changed = true;
          }
          continue;
        }
        if (objNorm !== normalizedType || !this.doesTargetMatch(obj.targetId, event.targetId)) continue;
        if (objNorm === 'NPC_DIALOGUE' && obj.dialogueKeyword && event.keyword !== obj.dialogueKeyword) continue;

        const delta =
          objNorm === 'EXPLORE_MAP' || objNorm === 'NPC_DIALOGUE' || objNorm === 'EQUIP_ITEM' || objNorm === 'INTERACT_OBJECT'
            ? 1
            : Math.max(1, Number(event.amount || 1));
        const next = Math.min(reqCount, Number(progress.objectives[obj.id] || 0) + delta);
        if (next !== progress.objectives[obj.id]) {
          progress.objectives[obj.id] = next;
          changed = true;
        }
      }

      progress.completed = (def.objectives || []).every((o) => {
        const req = Math.max(1, Number(o.requiredCount ?? (o as any).required ?? 1));
        return Number(progress.objectives[o.id] || 0) >= req;
      });
      if (changed) updatedQuestIds.push(def.id);
    }

    const newlyUnlockedTitles = this.evaluateTitleUnlocks(char);
    char.updatedAt = new Date().toISOString();
    this.store.save();

    return {
      characterId: char.id,
      newlyDiscoveredHiddenQuests: newlyDiscovered.map((q) => q.id),
      updatedQuestIds,
      newlyUnlockedTitles: newlyUnlockedTitles.map((t) => t.id),
      trackedQuestId: char.trackedQuestId || null,
      trackedQuest: this.buildTrackedQuestView(char, quests),
    };
  }

  /**
   * Grants a Unique Equipment piece with strict non-repeatable and optional account/character bind enforcement.
   */
  public grantUniqueEquipment(characterId: string, uniqueItemId: string, opts: { allowIfOwned?: boolean } = {}) {
    const char = this.requireCharacter(characterId);
    const uq = this.getUniqueCatalog(true).find((u) => u.id === uniqueItemId || u.itemId === uniqueItemId);
    if (!uq) throw new Error(`Trang bị Unique "${uniqueItemId}" không tồn tại.`);

    if (!opts.allowIfOwned) {
      if (char.claimedRewardKeys!.includes(`unique:${uq.id}`) || char.ownedUniqueEquipmentIds!.includes(uq.id)) {
        const err: any = new Error(`Nhân vật đã nhận trang bị Unique "${uq.name}" rồi (Không thể nhận trùng lặp).`);
        err.statusCode = 409;
        throw err;
      }
      const bindCheck = checkUniqueEquipmentBinding(uq, char, this.store.characters);
      if (!bindCheck.allowed) {
        const err: any = new Error(bindCheck.reason || 'Vi phạm ràng buộc Unique Equipment.');
        err.statusCode = 403;
        throw err;
      }
    }

    char.ownedUniqueEquipmentIds!.push(uq.id);
    char.claimedRewardKeys!.push(`unique:${uq.id}`);
    this.addItemToInventory(char, uq.id, 1);
    const newlyUnlockedTitles = this.evaluateTitleUnlocks(char);
    char.updatedAt = new Date().toISOString();
    this.store.save();

    return {
      success: true,
      uniqueItemId: uq.id,
      itemName: uq.name,
      isAccountBound: Boolean(uq.isAccountBound),
      isCharacterBound: Boolean(uq.isCharacterBound),
      newlyUnlockedTitles: newlyUnlockedTitles.map((t) => t.id),
    };
  }

  /**
   * Unlocks a permanent Title without duplicating rewards and immediately recalculates all stacked bonuses.
   */
  public unlockTitle(characterId: string, titleId: string) {
    const char = this.requireCharacter(characterId);
    const def = this.getTitlesCatalog(true).find((t) => t.id === titleId);
    if (!def) throw new Error(`Danh hiệu "${titleId}" không tồn tại.`);

    const already = char.unlockedTitles!.includes(def.id) || char.claimedRewardKeys!.includes(`title:${def.id}`);
    if (!already) {
      char.unlockedTitles!.push(def.id);
      char.claimedRewardKeys!.push(`title:${def.id}`);
    }
    const summary = this.recalculateTitleBonuses(char.id);
    return {
      titleId: def.id,
      titleName: def.nameVi || def.name,
      newlyUnlocked: !already,
      summary,
    };
  }

  /**
   * Equips or clears a purely cosmetic Title prefix without changing combat attributes.
   */
  public equipCosmeticTitle(characterId: string, titleId: string | null) {
    const char = this.requireCharacter(characterId);
    if (titleId) {
      if (!char.unlockedTitles!.includes(titleId)) {
        const err: any = new Error(`Chưa mở khóa danh hiệu "${titleId}" để hiển thị.`);
        err.statusCode = 403;
        throw err;
      }
      char.equippedCosmeticTitleId = titleId;
    } else {
      char.equippedCosmeticTitleId = null;
    }
    const summary = this.recalculateTitleBonuses(char.id);
    return { equippedCosmeticTitleId: char.equippedCosmeticTitleId, summary };
  }

  /**
   * Checks all published Titles and automatically unlocks any whose unlockConditions are satisfied.
   */
  public evaluateTitleUnlocks(char: CharacterEntity): TitleDefinition[] {
    const titles = this.getTitlesCatalog(false);
    const newlyUnlocked: TitleDefinition[] = [];

    for (const t of titles) {
      if (char.unlockedTitles!.includes(t.id) || char.claimedRewardKeys!.includes(`title:${t.id}`)) continue;
      const cond = t.unlockConditions || {};
      if (cond.minLevel && Number(char.level || 1) < cond.minLevel) continue;
      if ((cond.questIds || []).some((qid) => !char.completedQuests!.includes(qid))) continue;
      if ((cond.completedChainIds || []).some((cid) => !char.questChainProgress?.[cid]?.completed)) continue;
      if ((cond.visitedMapIds || []).some((mid) => !char.visitedMaps!.includes(mid))) continue;
      if ((cond.ownedUniqueItemIds || []).some((uid) => !char.ownedUniqueEquipmentIds!.includes(uid))) continue;

      let killsOk = true;
      for (const [monId, reqKills] of Object.entries(cond.killedMonsterIds || {})) {
        if (Number(char.monsterKillCounts?.[monId] || 0) < Number(reqKills)) {
          killsOk = false;
          break;
        }
      }
      if (!killsOk) continue;

      char.unlockedTitles!.push(t.id);
      char.claimedRewardKeys!.push(`title:${t.id}`);
      newlyUnlocked.push(t);
    }

    if (newlyUnlocked.length > 0) {
      const titlesAll = this.getTitlesCatalog(true);
      char.cachedTitleBonuses = computePermanentTitleBonuses(
        char.unlockedTitles!,
        titlesAll,
        this.world.getTitleBonusLimits(),
        char.equippedCosmeticTitleId || null
      );
    }
    return newlyUnlocked;
  }

  public recalculateTitleBonuses(characterId: string): TitleBonusSummary {
    const char = this.requireCharacter(characterId);
    const titles = this.getTitlesCatalog(true);
    const limits = this.world.getTitleBonusLimits();
    const summary = computePermanentTitleBonuses(
      char.unlockedTitles || [],
      titles,
      limits,
      char.equippedCosmeticTitleId || null
    );
    char.cachedTitleBonuses = summary;
    char.updatedAt = new Date().toISOString();
    this.store.save();
    return summary;
  }

  /**
   * Idempotently claims quest rewards (EXP, Gold, Items, non-repeatable Unique Equipment, Titles, Chain Rewards).
   */
  public claimQuestRewards(characterId: string, questId: string, opts: { skipObjectiveCheck?: boolean } = {}) {
    const lockKey = `${characterId}:${questId}`;
    if (this.claimLocks.has(lockKey)) {
      const err: any = new Error('Giao dịch nhận thưởng đang được xử lý.');
      err.statusCode = 409;
      throw err;
    }
    this.claimLocks.add(lockKey);

    try {
      const char = this.requireCharacter(characterId);
      const quest = this.getQuests(opts.skipObjectiveCheck).find((q) => q.id === questId);
      if (!quest) throw new Error(`Nhiệm vụ "${questId}" không tồn tại.`);

      const rewardKey = `quest:${questId}`;
      if (!quest.repeatable && (char.claimedRewardKeys!.includes(rewardKey) || char.completedQuests!.includes(questId))) {
        const err: any = new Error(`Phần thưởng nhiệm vụ "${quest.name}" đã được nhận trước đó (Chống nhận trùng).`);
        err.statusCode = 409;
        throw err;
      }

      if (!opts.skipObjectiveCheck) {
        const progress = char.activeQuests![questId];
        if (!progress) throw new Error(`Nhân vật chưa nhận nhiệm vụ "${quest.name}".`);
        this.syncCollectionAndExploreObjectives(char, progress, quest);
        if (!progress.completed) {
          throw new Error(`Chưa hoàn thành toàn bộ mục tiêu của "${quest.name}".`);
        }
      }

      // Mark completed and lock reward key atomically
      const titlesBeforeClaim = new Set(char.unlockedTitles || []);
      const completedAtIso = new Date().toISOString();
      delete char.activeQuests![questId];
      if (char.trackedQuestId === questId) {
        char.trackedQuestId = null;
      }
      if (!char.completedQuests!.includes(questId)) char.completedQuests!.push(questId);
      if (!char.completedQuestHistory) char.completedQuestHistory = {};
      char.completedQuestHistory[questId] = {
        completedAt: completedAtIso,
        rewards: quest.rewards,
      };
      if (!quest.repeatable) char.claimedRewardKeys!.push(rewardKey);
      this.syncChainProgressOnQuestAcceptOrComplete(char, quest, true);

      const expGain = Number(quest.rewards?.exp || 0);
      const goldGain = Number(quest.rewards?.gold || 0);
      char.exp = Number(char.exp || 0) + expGain;
      char.gold = Number(char.gold || 0) + goldGain;

      let levelsGained = 0;
      while (char.level < 110 && char.exp >= computeExpRequiredForLevel(char.level)) {
        char.exp -= computeExpRequiredForLevel(char.level);
        char.level += 1;
        levelsGained += 1;
        const ptsPerLevel = getPotentialPointsPerLevel(char);
        char.availableAttributePoints = Number(char.availableAttributePoints ?? char.unspentStatPoints ?? 0) + ptsPerLevel;
        char.unspentStatPoints = char.availableAttributePoints;
        char.skillPoints = Number(char.skillPoints || 0) + 1;
      }

      for (const it of quest.rewards?.items || []) {
        this.addItemToInventory(char, it.itemId, Number(it.quantity || 1));
      }

      const grantedUniques: string[] = [];
      for (const ueId of quest.rewards?.uniqueEquipmentIds || []) {
        const canClaim =
          !char.claimedRewardKeys!.includes(`unique:${ueId}`) &&
          !char.ownedUniqueEquipmentIds!.includes(ueId);
        if (canClaim) {
          this.grantUniqueEquipment(char.id, ueId);
          grantedUniques.push(ueId);
        }
      }

      for (const tid of quest.rewards?.unlockTitleIds || []) {
        this.unlockTitle(char.id, tid);
      }

      // Chain completion rewards (idempotent per chainId)
      if (quest.chainId && char.questChainProgress?.[quest.chainId]?.completed) {
        const chain = this.getChains(true).find((c) => c.id === quest.chainId);
        const chainKey = `chain:${quest.chainId}`;
        if (chain && chain.completionRewards && !char.claimedRewardKeys!.includes(chainKey)) {
          char.claimedRewardKeys!.push(chainKey);
          char.exp += Number(chain.completionRewards.exp || 0);
          char.gold += Number(chain.completionRewards.gold || 0);
          for (const ueId of chain.completionRewards.uniqueEquipmentIds || []) {
            if (!char.claimedRewardKeys!.includes(`unique:${ueId}`) && !char.ownedUniqueEquipmentIds!.includes(ueId)) {
              const uqDef = this.getUniqueCatalog(true).find((u) => u.id === ueId);
              const bindOk = !uqDef || checkUniqueEquipmentBinding(uqDef, char, this.store.characters).allowed;
              if (bindOk) {
                this.grantUniqueEquipment(char.id, ueId);
                grantedUniques.push(ueId);
              }
            }
          }
          for (const tid of chain.completionRewards.unlockTitleIds || []) {
            this.unlockTitle(char.id, tid);
          }
        }
      }

      this.evaluateTitleUnlocks(char);
      const unlockedTitles = (char.unlockedTitles || []).filter((tid) => !titlesBeforeClaim.has(tid));
      const titleBonuses = this.recalculateTitleBonuses(char.id);
      this.store.save();

      return {
        success: true,
        questId,
        expGain,
        goldGain,
        expGranted: expGain,
        goldGranted: goldGain,
        goldTotal: char.gold,
        trackedQuestId: char.trackedQuestId || null,
        trackedQuest: this.buildTrackedQuestView(char, this.getQuests(true)),
        levelsGained,
        grantedUniqueEquipmentIds: grantedUniques,
        unlockedTitleIds: unlockedTitles,
        titleBonuses,
        character: char,
      };
    } finally {
      this.claimLocks.delete(lockKey);
    }
  }

  /**
   * Debug helper: forcibly triggers & activates any quest (including hidden quests) for testing.
   */
  public debugTriggerQuest(characterId: string, questId: string) {
    return this.acceptQuest(characterId, questId, { bypassPrerequisites: true, fromHiddenTrigger: true });
  }

  /**
   * Debug helper: marks all objectives of a quest complete so reward claiming can be tested immediately.
   */
  public debugCompleteObjectives(characterId: string, questId: string) {
    const char = this.requireCharacter(characterId);
    const quest = this.getQuests(true).find((q) => q.id === questId);
    if (!quest) throw new Error(`Nhiệm vụ "${questId}" không tồn tại.`);
    if (!char.activeQuests![questId]) {
      this.acceptQuest(characterId, questId, { bypassPrerequisites: true, fromHiddenTrigger: true });
    }
    const progress = char.activeQuests![questId];
    for (const obj of quest.objectives || []) {
      progress.objectives[obj.id] = obj.requiredCount;
    }
    progress.completed = true;
    char.updatedAt = new Date().toISOString();
    this.store.save();
    return progress;
  }

  public getAllQuestsForAdmin(filters: { hiddenOnly?: boolean; search?: string; questType?: string } = {}) {
    let list = this.getQuests(true);
    if (filters.hiddenOnly) {
      list = list.filter((q) => q.isHidden || q.questType === 'HIDDEN_QUEST');
    }
    if (filters.questType && filters.questType !== 'all') {
      list = list.filter((q) => q.questType === filters.questType);
    }
    if (filters.search) {
      const qStr = filters.search.toLowerCase();
      list = list.filter((q) =>
        `${q.id} ${q.name} ${q.description} ${q.hiddenTrigger?.hint || ''}`.toLowerCase().includes(qStr)
      );
    }
    return list;
  }

  public validateAllDataReferences() {
    return validateQuestTitleDataIntegrity({
      quests: this.world.getQuests(true),
      questChains: this.world.getQuestChains(true),
      uniqueEquipment: this.world.getUniqueEquipment(true),
      titles: this.world.getTitles(true),
      npcs: this.world.getNpcs(),
      maps: this.world.getMaps(true),
      monsters: this.world.getMonsters(true),
      items: this.getMergedItems(),
    });
  }
}
