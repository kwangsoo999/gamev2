import {
  AwakeningResult,
  ClassDefinition,
  FirstJobClassId,
  JobAdvancementResult,
  PrimaryAttributes,
} from '@elysia/game-types';
import {
  FIRST_JOB_STARTER_GEAR,
  INITIAL_CLASSES,
  INITIAL_SKILLS,
  classifyJobFromBaseStats,
  isPreJobClass,
  ADVANCED_JOB_BY_ID,
  getAdvancedBranchesForClass,
  normalizeBaseClassId,
} from '@elysia/game-data-schema';
import { JsonStore } from '../database/jsonStore.js';
import { WorldService } from './world.service.js';
import { DungeonService } from './dungeon.service.js';

export class JobService {
  private static instance: JobService;
  private store = JsonStore.getInstance();
  private world = WorldService.getInstance();
  private dungeon = DungeonService.getInstance();
  private awakeningLocks = new Set<string>();

  public static getInstance(): JobService {
    if (!JobService.instance) {
      JobService.instance = new JobService();
    }
    return JobService.instance;
  }

  /**
   * Reads strictly natural baseStats (excluding any equipment, buffs, or consumables).
   */
  private extractPureBaseStats(char: any): PrimaryAttributes {
    const src = char.baseStats || char.attributes || {};
    return {
      str: Math.max(1, Number(src.str ?? 10)),
      dex: Math.max(1, Number(src.dex ?? 10)),
      agi: Math.max(1, Number(src.agi ?? 10)),
      int: Math.max(1, Number(src.int ?? 10)),
      con: Math.max(1, Number(src.con ?? 10)),
    };
  }

  public getStatus(characterId: string) {
    const char = this.store.characters.find((c) => c.id === characterId);
    if (!char) throw new Error('Không tìm thấy nhân vật.');

    const hasCertificate =
      Array.isArray(char.inventory) &&
      char.inventory.some((i: any) => i.itemId === 'ITEM_AWAKENING_CERTIFICATE');
    const activeInstance = this.dungeon.getActiveInstanceForCharacter(characterId);
    const quests = this.world.getQuests(false).filter((q: any) => q.chainId === 'CHAIN_FIRST_JOB_ADVANCEMENT');
    const classes: ClassDefinition[] = (this.world.getClasses() || INITIAL_CLASSES).filter((c: any) => !c.isPreJob);
    const evolutions = this.world.getClassEvolutions();
    const level = Number(char.level || 1);
    const preJob = isPreJobClass(char.classId) && !char.jobAdvancementCompleted;
    const completedQuests: string[] = Array.isArray(char.completedQuests) ? char.completedQuests : [];
    const beginnerQuestDone = completedQuests.includes('QUEST_001_SLIME_CLEAR');

    const baseStats = this.extractPureBaseStats(char);
    const previewClassification = classifyJobFromBaseStats(baseStats, classes);

    const stepStates = quests.map((q: any) => {
      let completed = false;
      if (q.id === 'QUEST_JOB_01_CALL') completed = level >= 15 && beginnerQuestDone;
      if (q.id === 'QUEST_JOB_02_ENTER')
        completed = Boolean(char.sanctumCompleted || (activeInstance && activeInstance.collectedFragments.length >= 3));
      if (q.id === 'QUEST_JOB_03_PILLARS')
        completed = Boolean(char.sanctumCompleted || (activeInstance && activeInstance.activatedPillars.length >= 4));
      if (q.id === 'QUEST_JOB_04_GUARDIAN')
        completed = Boolean(char.sanctumCompleted && (hasCertificate || !preJob));
      if (q.id === 'QUEST_JOB_05_DESTINY') completed = !preJob;
      return { ...q, completed };
    });

    return {
      characterId: char.id,
      characterName: char.name,
      level,
      classId: char.classId,
      evolutionTier: Number(char.evolutionTier || (preJob ? 0 : 1)),
      jobAdvancementCompleted: Boolean(!preJob),
      availableAttributePoints: Number(char.availableAttributePoints ?? 0),
      baseStats,
      beginnerQuestCompleted: beginnerQuestDone,
      sanctumCompleted: Boolean(char.sanctumCompleted),
      hasCertificate,
      canEnterSanctum: level >= 15 && beginnerQuestDone && preJob && !char.sanctumCompleted && !hasCertificate,
      canTriggerAutomaticAwakening: preJob && level >= 15 && beginnerQuestDone && Boolean(char.sanctumCompleted) && hasCertificate,
      alreadyAdvanced: !preJob,
      automaticModeOnly: true,
      activeDungeonInstance: activeInstance,
      compatibilityBreakdown: previewClassification.scores,
      awakeningResult: char.awakeningResult || null,
      questSteps: stepStates,
      configuredClasses: classes,
      evolutionMilestones: evolutions,
    };
  }

  public getAwakeningResult(characterId: string): AwakeningResult | null {
    const char = this.store.characters.find((c) => c.id === characterId);
    if (!char) throw new Error('Không tìm thấy nhân vật.');
    return char.awakeningResult || null;
  }

  /**
   * Authoritative, transactional, idempotent Automatic First-Job Awakening.
   * Rejects manual class choice attempts; derives class purely from Base Stats (never equipment/buffs).
   */
  public awakenCharacter(characterId: string, forbiddenManualClass?: string): JobAdvancementResult {
    if (forbiddenManualClass) {
      const err: any = new Error(
        `Từ chối chọn nghề thủ công ("${forbiddenManualClass}")! Nghề nghiệp lần 1 được máy chủ tự động ấn định dựa trên 5 chỉ số cơ bản.`
      );
      err.statusCode = 403;
      throw err;
    }

    const char = this.store.characters.find((c) => c.id === characterId);
    if (!char) throw new Error('Không tìm thấy nhân vật.');

    // Idempotent replay support (including reconnects after mid-cinematic disconnect)
    if (char.jobAdvancementCompleted && !isPreJobClass(char.classId) && char.awakeningResult) {
      return {
        success: true,
        alreadyCompleted: true,
        characterId: char.id,
        previousClassId: 'adventurer',
        newClassId: char.classId as FirstJobClassId,
        evolutionTier: Number(char.evolutionTier || 1),
        unlockedSkills: [...(char.unlockedSkills || [])],
        grantedItems: [],
        awakeningResult: char.awakeningResult,
        message: `Nhân vật ${char.name} đã thức tỉnh nghề ${char.awakeningResult.assignedClassName} trước đó.`,
      };
    }

    if (char.jobAdvancementCompleted || !isPreJobClass(char.classId)) {
      const err: any = new Error(
        `Nhân vật đã hoàn thành thức tỉnh (${char.classId}). Không thể thay đổi nghề bằng cách chỉnh thuộc tính hoặc gọi lại nghi lễ!`
      );
      err.statusCode = 403;
      throw err;
    }

    if (this.awakeningLocks.has(characterId)) {
      const err: any = new Error('Giao dịch thức tỉnh đang được xử lý cho nhân vật này.');
      err.statusCode = 409;
      throw err;
    }

    this.awakeningLocks.add(characterId);
    const txSnapshot = JSON.stringify(char);

    try {
      if (Number(char.level || 1) < 15) {
        const err: any = new Error(`Cần đạt Lv.15 để thực hiện Thức Tỉnh Nghề Nghiệp (hiện tại Lv.${char.level || 1}).`);
        err.statusCode = 403;
        throw err;
      }

      const completedQuests: string[] = Array.isArray(char.completedQuests) ? char.completedQuests : [];
      if (!completedQuests.includes('QUEST_001_SLIME_CLEAR')) {
        const err: any = new Error('Cần hoàn thành nhiệm vụ tân thủ bắt buộc (QUEST_001_SLIME_CLEAR) trước khi thức tỉnh.');
        err.statusCode = 403;
        throw err;
      }

      if (!Array.isArray(char.inventory)) char.inventory = [];
      const certIdx = char.inventory.findIndex((i: any) => i.itemId === 'ITEM_AWAKENING_CERTIFICATE');
      if (!char.sanctumCompleted || certIdx < 0) {
        const err: any = new Error(
          'Cần đánh bại Guardian of Awakening trong Thánh Điện Thức Tỉnh và sở hữu Chứng Chỉ Thức Tỉnh!'
        );
        err.statusCode = 403;
        throw err;
      }

      const worldClasses: ClassDefinition[] = this.world.getClasses();
      const classDefs = Array.isArray(worldClasses) && worldClasses.length > 0 ? worldClasses : INITIAL_CLASSES;

      // Classify strictly using pure Base Stats (zero equipment/buff contamination)
      const pureBaseStats = this.extractPureBaseStats(char);
      const { assignedClassId, scores } = classifyJobFromBaseStats(pureBaseStats, classDefs);
      const classDef =
        classDefs.find((c) => c.id === assignedClassId) ||
        INITIAL_CLASSES.find((c) => c.id === assignedClassId)!;

      // Resolve starter skills for assigned job
      const allSkills = this.world.getSkills().length ? this.world.getSkills() : INITIAL_SKILLS;
      const classSkills = allSkills.filter(
        (s: any) => s.classId === assignedClassId && Number(s.requiredLevel || 15) <= Number(char.level || 15)
      );
      const unlockedSkillIds = Array.from(
        new Set([...(char.unlockedSkills || []), ...(classDef.startingSkills || []), ...classSkills.map((s: any) => s.id)])
      );

      // Resolve compatible primary weapon + class armor from Admin-configured or fallback starter gear
      const fallbackGear = FIRST_JOB_STARTER_GEAR[assignedClassId];
      const worldItems = [...this.store.items, ...this.world.getWorldItems()];
      const weaponItemId = classDef.starterEquipment?.weaponItemId || fallbackGear.weapon.itemId;
      const armorItemId = classDef.starterEquipment?.armorItemId || fallbackGear.armor.itemId;
      const weaponMeta = worldItems.find((it: any) => it.id === weaponItemId || it.itemId === weaponItemId);
      const armorMeta = worldItems.find((it: any) => it.id === armorItemId || it.itemId === armorItemId);

      // Validate equipment class compatibility strictly before granting
      for (const rewardItem of [weaponMeta, armorMeta].filter(Boolean)) {
        const allowed: string[] = rewardItem.allowedClasses || [];
        if (allowed.length > 0 && !allowed.includes(assignedClassId)) {
          throw new Error(`Dữ liệu trang bị không tương thích (${rewardItem.id} cho ${assignedClassId}).`);
        }
      }

      const grantedWeapon = {
        itemId: weaponItemId,
        name: weaponMeta?.name || fallbackGear.weapon.name,
        atkBonus: weaponMeta?.equipmentStats?.atk ?? fallbackGear.weapon.atkBonus,
        weaponType: weaponMeta?.itemSubtype || fallbackGear.weapon.weaponType,
      };
      const grantedArmor = {
        itemId: armorItemId,
        name: armorMeta?.name || fallbackGear.armor.name,
        defBonus: armorMeta?.equipmentStats?.def ?? fallbackGear.armor.defBonus,
      };

      const awakenedAt = new Date().toISOString();
      const awakeningResult: AwakeningResult = {
        characterId: char.id,
        characterName: char.name,
        assignedClassId,
        assignedClassName: classDef.name,
        assignedClassRole: classDef.role,
        baseStatsSnapshot: { ...pureBaseStats },
        jobScores: scores,
        unlockedSkills: classSkills.map((s: any) => ({
          id: s.id,
          name: s.name,
          nameVi: s.nameVi || s.name,
          description: s.description || '',
          element: s.element || 'neutral',
        })),
        grantedEquipment: {
          weapon: grantedWeapon,
          armor: grantedArmor,
        },
        artworkUrl: classDef.artworkUrl || '/assets/elysia/ui/paperdoll-player.png',
        weaponArtworkUrl: classDef.weaponArtworkUrl || '/assets/elysia/ui/portrait-player.png',
        awakenedAt,
      };

      // Commit atomic mutations
      const previousClass = char.classId;
      char.inventory.splice(certIdx, 1); // Redeem Awakening Certificate cleanly
      char.classId = assignedClassId;
      char.jobAdvancementCompleted = true;
      char.evolutionTier = 1;
      char.jobChangedAt = awakenedAt;
      char.unlockedSkills = unlockedSkillIds;
      char.skillPoints = Number(char.skillPoints || 0) + 3;
      if (!char.skillLevels || typeof char.skillLevels !== 'object') char.skillLevels = {};
      for (const sid of unlockedSkillIds) {
        if (!char.skillLevels[sid]) char.skillLevels[sid] = 1;
      }
      char.awakeningResult = awakeningResult;
      if (!Array.isArray(char.completedQuests)) char.completedQuests = [];
      if (!char.completedQuests.includes('QUEST_JOB_05_DESTINY')) {
        char.completedQuests.push('QUEST_JOB_05_DESTINY');
      }

      char.inventory.push(
        {
          slotId: char.inventory.length,
          itemId: grantedWeapon.itemId,
          name: grantedWeapon.name,
          category: 'weapon',
          quantity: 1,
          atkBonus: grantedWeapon.atkBonus,
          allowedClasses: [assignedClassId],
        },
        {
          slotId: char.inventory.length + 1,
          itemId: grantedArmor.itemId,
          name: grantedArmor.name,
          category: 'armor',
          quantity: 1,
          defBonus: grantedArmor.defBonus,
          allowedClasses: [assignedClassId],
        }
      );

      if (!char.equipment) char.equipment = {};
      delete char.equipment.mainHand;
      char.equipment.weapon = grantedWeapon.itemId;
      char.equipment.armor = grantedArmor.itemId;

      this.store.save();

      return {
        success: true,
        alreadyCompleted: false,
        characterId: char.id,
        previousClassId: previousClass,
        newClassId: assignedClassId,
        evolutionTier: 1,
        unlockedSkills: unlockedSkillIds,
        grantedItems: [
          { itemId: grantedWeapon.itemId, name: grantedWeapon.name, quantity: 1 },
          { itemId: grantedArmor.itemId, name: grantedArmor.name, quantity: 1 },
        ],
        awakeningResult,
        ritualVfxId: assignedClassId,
        performedByNpcId: 'NPC_HIGH_PRIEST',
        message: `Thức Tỉnh Hoàn Tất! Linh Mục Điện Thánh ấn định chức nghiệp ${classDef.name} cho ${char.name}!`,
      };
    } catch (err) {
      // Transactional rollback on any error before committing
      const idx = this.store.characters.findIndex((c) => c.id === characterId);
      if (idx >= 0) {
        this.store.characters[idx] = JSON.parse(txSnapshot);
      }
      throw err;
    } finally {
      this.awakeningLocks.delete(characterId);
    }
  }

  /**
   * Lists the 2 Lv.80 Permanent Advanced Branches available for the character's First Job class.
   */
  public getAdvancedEvolutionOptions(characterId: string) {
    const char = this.store.characters.find((c) => c.id === characterId);
    if (!char) throw new Error('Không tìm thấy nhân vật.');
    const level = Number(char.level || 1);
    const baseClass = normalizeBaseClassId(char.classId);
    const firstJobDone = !isPreJobClass(char.classId) && Boolean(char.jobAdvancementCompleted);
    const availableBranches = firstJobDone ? getAdvancedBranchesForClass(baseClass) : [];
    const currentBranch = char.advancedJobId ? ADVANCED_JOB_BY_ID[char.advancedJobId] || null : null;

    return {
      characterId: char.id,
      level,
      classId: char.classId,
      normalizedBaseClass: baseClass,
      unlockLevel: 80,
      firstJobCompleted: firstJobDone,
      eligible: firstJobDone && level >= 80 && !char.advancedJobId,
      locked: Boolean(char.advancedJobId),
      currentAdvancedJobId: char.advancedJobId || null,
      currentAdvancedJobName: char.advancedJobName || currentBranch?.name || null,
      availableBranches,
    };
  }

  /**
   * Authoritative, permanent, one-time Lv.80 Second/Advanced Branch Evolution.
   * Rejects characters < Lv.80, incompatible base classes, or attempts to change an already locked branch.
   */
  public selectLv80AdvancedJob(characterId: string, rawBranchId: string) {
    const branchId = String(rawBranchId || '').trim().toLowerCase();
    const char = this.store.characters.find((c) => c.id === characterId);
    if (!char) throw new Error('Không tìm thấy nhân vật.');

    if (isPreJobClass(char.classId) || !char.jobAdvancementCompleted) {
      const err: any = new Error('Cần hoàn thành Thức Tỉnh Nghề Lv.15 trước khi Chuyển Chức Lv.80.');
      err.statusCode = 403;
      throw err;
    }

    const level = Number(char.level || 1);
    if (level < 80) {
      const err: any = new Error(`Cần đạt Lv.80 để Chuyển Chức Nâng Cao (hiện tại Lv.${level}).`);
      err.statusCode = 403;
      throw err;
    }

    if (char.advancedJobId) {
      const err: any = new Error(
        `Nhân vật đã khóa vĩnh viễn nhánh ${char.advancedJobName || char.advancedJobId}. Không thể đổi sang nhánh khác!`
      );
      err.statusCode = 403;
      throw err;
    }

    const branch = ADVANCED_JOB_BY_ID[branchId];
    if (!branch) {
      const err: any = new Error(`Nhánh nghề Lv.80 "${rawBranchId}" không tồn tại.`);
      err.statusCode = 400;
      throw err;
    }

    const normalizedBase = normalizeBaseClassId(char.classId);
    if (branch.parentClassId !== normalizedBase) {
      const err: any = new Error(
        `Nhánh ${branch.name} chỉ dành cho nghề ${branch.parentDisplayName}, không tương thích với ${char.classId}!`
      );
      err.statusCode = 403;
      throw err;
    }

    const nowIso = new Date().toISOString();
    char.advancedJobId = branch.id;
    char.advancedJobName = branch.name;
    char.advancedJobChangedAt = nowIso;
    char.secondJobId = branch.id;
    char.secondJobName = branch.name;
    char.evolutionTier = 3;

    if (!Array.isArray(char.unlockedSkills)) char.unlockedSkills = [];
    if (!char.skillLevels || typeof char.skillLevels !== 'object') char.skillLevels = {};

    // Grant first 2 starter branch skills immediately (passive + primary Lv.80 active)
    const grantedSkills = branch.exclusiveSkillIds.slice(0, 2);
    for (const sid of grantedSkills) {
      if (!char.unlockedSkills.includes(sid)) char.unlockedSkills.push(sid);
      if (!char.skillLevels[sid]) char.skillLevels[sid] = 1;
    }
    char.skillPoints = Number(char.skillPoints || 0) + 4;
    if (!Array.isArray(char.completedQuests)) char.completedQuests = [];
    if (!char.completedQuests.includes('QUEST_JOB_SECOND_AWAKENING')) {
      char.completedQuests.push('QUEST_JOB_SECOND_AWAKENING');
    }
    char.updatedAt = nowIso;
    this.store.save();

    return {
      success: true,
      characterId: char.id,
      parentClassId: normalizedBase,
      advancedJobId: branch.id,
      advancedJobName: branch.name,
      incompatibleBranchId: branch.incompatibleBranchId,
      grantedSkills,
      remainingSkillPoints: char.skillPoints,
      evolutionTier: 3,
      isPermanent: true,
      ritualVfxId: branch.id,
      performedByNpcId: 'NPC_HIGH_PRIEST',
      changedAt: nowIso,
    };
  }
}
