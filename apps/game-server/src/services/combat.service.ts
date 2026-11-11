import { randomUUID } from 'crypto';
import {
  ATTRIBUTE_POINTS_PER_LEVEL,
  INITIAL_BOSS_CONFIGS,
  INITIAL_BOSS_DROP_TABLES,
  INITIAL_ELITE_AND_BOSS_MONSTERS,
  INITIAL_EQUIPMENT_SETS,
  INITIAL_ITEMS,
  INITIAL_SKILLS,
  computeBossParticipantScores,
  computeEquippedSetBonuses,
  computeExpRequiredForLevel,
  computeLevelAdjustedExp,
  computePassiveAndBuffModifiers,
  computePermanentTitleBonuses,
  computeSkillActionPower,
  isPreJobClass,
  rollBossLootForParticipant,
  applyCombatMasteryGain,
  normalizeBaseClassId,
  aggregateCharacterStats,
  computeSafeCombatDamage,
  computeLevelAwareHitChance,
  STAT_CAP_RULES,
  ORGANIZATION_AND_PROFESSION_ITEM_CATALOG,
  PROFESSION_RECIPES,
} from '@elysia/game-data-schema';
import { resolveGuildStatInputs } from './passive.service.js';
import {
  BossEncounterConfig,
  CharacterEntity,
  PrimaryAttributes,
  SkillDefinition,
} from '@elysia/game-types';
import { JsonStore } from '../database/jsonStore.js';
import { WorldService } from './world.service.js';
import { QuestTitleService } from './quest-title.service.js';
import fs from 'fs';
import path from 'path';
import { ENV } from '../config/env.js';
import type { DeathPenaltyState, MonsterAiState } from '@elysia/game-types';
import {
  DEFAULT_AUTO_COMBAT_CONFIG,
  SAFE_VILLAGE_CHECKPOINTS,
  computeDeathPenaltyApplication,
  getActiveDeathPenaltyReductionPct,
  isSafeVillageId,
  isTrainingRegionId,
  resolveResurrectionCheckpoint,
  computeCharacterRegenTick,
  resolveSkillAnimationMetadata,
  buildSkillExecutionTimeline,
  computeMonsterKillExp,
  DEFAULT_REGEN_STATE_CONFIG,
} from '@elysia/game-data-schema';
import type { RegenerationAreaContext } from '@elysia/game-types';

type MonsterDefinition = any;
type RawContribution = {
  characterId: string;
  characterName: string;
  classId: string;
  damageDealt: number;
  healingProvided: number;
  damageAbsorbed: number;
  effectiveSupport: number;
  validActions: number;
  lastActiveAt: number;
};

type MonsterRuntime = {
  id: string;
  definitionId: string;
  spawnZoneId?: string;
  spawnOriginX?: number;
  spawnOriginY?: number;
  spawnRadius?: number;
  regionId: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  level: number;
  alive: boolean;
  respawnAt?: number;
  lastAttackedAt: number;
  debuffs: Record<string, { stat?: string; valuePct?: number; expiresAt: number }>;
  stunnedUntil: number;
  activePhase: number;
  enraged: boolean;
  aiState: MonsterAiState;
  targetCharacterId?: string | null;
  aggroUntil?: number;
  lastPatrolAt?: number;
  patrolTargetX?: number;
  patrolTargetY?: number;
  isRandomElite?: boolean;
  customName?: string;
  atkMultiplier?: number;
  expMultiplier?: number;
  goldMultiplier?: number;
  lastTelegraphAt?: number;
  lastTelegraph?: {
    skillName: string;
    warningText: string;
    aoeRadius: number;
    executesAt: number;
    element: string;
  };
  participants: Map<string, RawContribution>;
  settledKillId?: string;
};

type PlayerCombatState = {
  character: CharacterEntity;
  regionId: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  atk: number;
  matk: number;
  def: number;
  mdef: number;
  critRatePct: number;
  critDamagePct: number;
  damageReductionPct: number;
  healingPowerPct: number;
  lifestealPct: number;
  accuracy: number;
  evasionPct: number;
  armorPenetrationPct: number;
  magicPenetrationPct: number;
  cooldownReductionPct: number;
  statusResistancePct: number;
  synergyBonusesBySkillId: Record<string, { damageBonusPct: number; critBonusPct: number; cooldownReductionPct: number }>;
  pveDamageMultiplier: number;
  bossDamageMultiplier: number;
  passivePointsAvailable: number;
  statBreakdowns: Record<string, any>;
  statWarningsVi: string[];
  jobAffinity: any;
  bonusRange: number;
  shieldHp: number;
  activeSets: any[];
  lastMoveAt: number;
  lastCombatActionAt?: number;
  lastRegenTickAt?: number;
  isSitting?: boolean;
  cooldowns: Map<string, number>;
  dead: boolean;
};

export type CombatSnapshot = {
  characterId: string;
  deathPenalty?: DeathPenaltyState | null;
  discoveredVillageIds?: string[];
  latestVillageCheckpointId?: string;
  preferredResurrectionVillageId?: string;
  resurrectionCheckpoint?: { id: string; name: string; nameVi: string; spawnX: number; spawnY: number };
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  atk: number;
  matk: number;
  def: number;
  mdef: number;
  critRatePct: number;
  critDamagePct?: number;
  damageReductionPct?: number;
  evasionPct?: number;
  cooldownReductionPct?: number;
  armorPenetrationPct?: number;
  magicPenetrationPct?: number;
  statusResistancePct?: number;
  passiveAllocations?: Record<string, number>;
  passivePointsAvailable?: number;
  statBreakdowns?: Record<string, any>;
  statWarningsVi?: string[];
  jobAffinity?: any;
  shieldHp: number;
  activeSets: any[];
  level: number;
  exp: number;
  expToNext: number;
  skillPoints: number;
  gold: number;
  x: number;
  y: number;
  regionId: string;
  dead: boolean;
  classId?: string;
  advancedJobId?: string;
  advancedJobName?: string;
  skillMastery?: Record<string, any>;
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const distance = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by);
const expRequired = (level: number) => WorldService.getInstance().getExpRequired(level) ?? computeExpRequiredForLevel(level);

export class CombatService {
  private static sharedInstance: CombatService;
  private store = JsonStore.getInstance();
  private world = WorldService.getInstance();
  private players = new Map<string, PlayerCombatState>();
  private monsters = new Map<string, MonsterRuntime>();
  private initializedRegions = new Set<string>();
  private bossSettlementLocks = new Set<string>();

  public static getSharedInstance(): CombatService {
    if (!CombatService.sharedInstance) {
      CombatService.sharedInstance = new CombatService();
    }
    return CombatService.sharedInstance;
  }

  private get monsterDefinitions(): MonsterDefinition[] {
    const worldMons = this.world.getMonsters(false) || [];
    const map = new Map<string, any>();
    for (const m of INITIAL_ELITE_AND_BOSS_MONSTERS) map.set(m.id, m);
    for (const m of worldMons) map.set(m.id, m);
    return Array.from(map.values());
  }

  private get dropTables(): any[] {
    const map = new Map<string, any>();
    for (const d of INITIAL_BOSS_DROP_TABLES) map.set(d.tableId, d);
    for (const d of this.world.getDropTables(false) || []) map.set(d.tableId || d.table_id, d);
    return Array.from(map.values());
  }

  private get spawnPoints(): any[] {
    return this.world.getSpawnPoints() || [];
  }

  private get allSkills(): SkillDefinition[] {
    const worldSkills = this.world.getSkills(false);
    return Array.isArray(worldSkills) && worldSkills.length ? worldSkills : INITIAL_SKILLS;
  }

  private get allItems(): any[] {
    const map = new Map<string, any>();
    for (const i of INITIAL_ITEMS) map.set(i.id, i);
    for (const i of ORGANIZATION_AND_PROFESSION_ITEM_CATALOG) map.set(i.id, i);
    for (const i of this.world.getWorldItems(false)) map.set(i.id, i);
    for (const i of this.world.getUniqueEquipment(false)) map.set(i.id, i);
    for (const i of this.store.items) map.set(i.id, i);
    return Array.from(map.values());
  }

  private get allSets(): any[] {
    const worldSets = this.world.getEquipmentSets(false);
    return Array.isArray(worldSets) && worldSets.length ? worldSets : INITIAL_EQUIPMENT_SETS;
  }

  private getBossConfig(monsterId: string): BossEncounterConfig | undefined {
    const fromWorld = this.world.getBossConfigs(false);
    const list = Array.isArray(fromWorld) && fromWorld.length ? fromWorld : INITIAL_BOSS_CONFIGS;
    return list.find((b: any) => b.monsterId === monsterId || b.id === monsterId);
  }

  public recomputePlayerStats(state: PlayerCombatState) {
    const c = state.character;
    const upgradeLevels = (c as any).equipmentUpgradeLevels || {};
    const setStats = computeEquippedSetBonuses(
      c.equipment || {},
      this.allItems,
      this.allSets,
      upgradeLevels
    );
    c.cachedTitleBonuses = computePermanentTitleBonuses(
      c.unlockedTitles || [],
      this.world.getTitles(false),
      this.world.getTitleBonusLimits(),
      c.equippedCosmeticTitleId || null
    );

    const compatibleUnlocked = (c.unlockedSkills || []).filter((sid) => {
      const def = this.allSkills.find((s) => s.id === sid);
      return !def?.advancedBranchId || def.advancedBranchId === c.advancedJobId;
    });
    const mods = computePassiveAndBuffModifiers(
      c.classId,
      c.skillLevels || {},
      compatibleUnlocked,
      c.activeBuffs || {},
      this.allSkills
    );

    const { guildSkills, guildBuildingLevels } = resolveGuildStatInputs(this.store, c);
    const nowMs = Date.now();
    const foodAndConsumableBuffs = Object.entries((c.activeBuffs || {}) as Record<string, any>)
      .filter(
        ([k, b]) =>
          k.startsWith('food:') &&
          b &&
          Number(b.expiresAt || 0) > nowMs &&
          (b.stat === 'allCombatAndExp' || b.stat === 'maxHpPct' || b.stat === 'expBonusPct' || b.stat === 'moveSpeedPct')
      )
      .map(([, b]) => ({ stat: String(b.stat), valuePct: Number(b.valuePct || 0), flatValue: Number(b.flatValue || 0) }));

    const agg = aggregateCharacterStats({
      character: c,
      itemsCatalog: this.allItems,
      setsCatalog: this.allSets,
      uniqueCatalog: this.world.getUniqueEquipment(false),
      titlesCatalog: this.world.getTitles(false),
      titleBonusLimits: this.world.getTitleBonusLimits(),
      skillsCatalog: this.allSkills,
      guildSkills,
      guildBuildingLevels,
      foodAndConsumableBuffs,
      mode: 'pve',
      nowMs,
    });

    const sec = agg.secondaryStats;
    state.maxHp = sec.maxHp;
    state.maxMp = sec.maxMp;
    state.hp = clamp(state.hp, 0, state.maxHp);
    state.mp = clamp(state.mp, 0, state.maxMp);
    state.atk = sec.atk;
    state.matk = sec.matk;
    state.def = sec.def;
    state.mdef = sec.mdef;
    state.critRatePct = sec.critRatePct;
    state.critDamagePct = sec.critDamageMultiplierPct;
    state.damageReductionPct = sec.damageReductionPct;
    state.healingPowerPct = sec.healingBonusPct;
    state.lifestealPct = sec.lifestealPct;
    state.accuracy = sec.accuracy;
    state.evasionPct = sec.evasionPct;
    state.armorPenetrationPct = sec.armorPenetrationPct;
    state.magicPenetrationPct = sec.magicPenetrationPct;
    state.cooldownReductionPct = sec.cooldownReductionPct;
    state.statusResistancePct = sec.statusResistancePct;
    state.synergyBonusesBySkillId = agg.synergyBonusesBySkillId;
    state.pveDamageMultiplier = agg.pveDamageMultiplier;
    state.bossDamageMultiplier = agg.bossDamageMultiplier;
    state.passivePointsAvailable = agg.passivePointsSummary.available;
    state.statBreakdowns = agg.breakdowns;
    state.statWarningsVi = agg.warningsVi;
    state.jobAffinity = agg.jobAffinity;
    state.bonusRange = mods.bonusRange;
    state.activeSets = setStats.activeSets.map((a) => ({
      setId: a.set.id,
      setName: a.set.name,
      equippedCount: a.equippedCount,
      activeTiers: a.activeTiers,
    }));

    c.maxHp = state.maxHp;
    c.maxMp = state.maxMp;
    c.passivePoints = agg.passivePointsSummary.available;
    c.passivePointsSpent = agg.passivePointsSummary.spent;
  }

  join(userId: string, characterId: string): { snapshot: CombatSnapshot; character: CharacterEntity } {
    const character = this.store.characters.find((c: CharacterEntity) => c.id === characterId && c.userId === userId);
    if (!character) throw new Error('Không tìm thấy nhân vật hoặc bạn không có quyền điều khiển nhân vật này.');
    const state: PlayerCombatState = {
      character,
      regionId: this.world.normalizeRegionId(character.regionId || 'THON_KHOI_NGUYEN'),
      x: Number(character.x ?? 552),
      y: Number(character.y ?? 984),
      hp: Number(character.hp ?? 99999),
      maxHp: 320,
      mp: Number(character.mp ?? 99999),
      maxMp: 180,
      atk: 20,
      matk: 20,
      def: 10,
      mdef: 10,
      critRatePct: 5,
      critDamagePct: 150,
      damageReductionPct: 0,
      healingPowerPct: 0,
      lifestealPct: 0,
      accuracy: 100,
      evasionPct: 4,
      armorPenetrationPct: 0,
      magicPenetrationPct: 0,
      cooldownReductionPct: 0,
      statusResistancePct: 0,
      synergyBonusesBySkillId: {},
      pveDamageMultiplier: 1,
      bossDamageMultiplier: 1,
      passivePointsAvailable: 0,
      statBreakdowns: {},
      statWarningsVi: [],
      jobAffinity: null,
      bonusRange: 0,
      shieldHp: 0,
      activeSets: [],
      lastMoveAt: Date.now(),
      cooldowns: new Map(),
      dead: false,
    };
    this.recomputePlayerStats(state);
    if (character.hp === undefined) state.hp = state.maxHp;
    if (character.mp === undefined) state.mp = state.maxMp;
    state.dead = state.hp <= 0;
    if (character.deathPenalty && Number(character.deathPenalty.expiresAt || 0) <= Date.now()) {
      character.deathPenalty = null;
    }
    if (!Array.isArray(character.discoveredVillageIds) || character.discoveredVillageIds.length === 0) {
      character.discoveredVillageIds = ['THON_KHOI_NGUYEN'];
    }
    if (isSafeVillageId(state.regionId)) {
      if (!character.discoveredVillageIds.includes(state.regionId)) {
        character.discoveredVillageIds.push(state.regionId);
      }
      character.latestVillageCheckpointId = state.regionId;
      character.checkpointUpdatedAt = new Date().toISOString();
    }
    if (!character.autoCombatConfig) {
      character.autoCombatConfig = { ...DEFAULT_AUTO_COMBAT_CONFIG };
    }
    this.players.set(characterId, state);
    character.hp = state.hp;
    character.mp = state.mp;
    character.x = state.x;
    character.y = state.y;
    character.regionId = state.regionId;
    character.lastLoginAt = new Date().toISOString();
    this.store.save();
    this.ensureRegion(state.regionId);
    return { snapshot: this.snapshot(state), character };
  }

  getOnlineRegionPlayers(regionId?: string) {
    const out: PlayerCombatState[] = [];
    for (const p of this.players.values()) {
      if (!regionId || p.regionId === regionId) out.push(p);
    }
    return out;
  }

  leave(characterId: string) {
    this.persist(this.players.get(characterId));
    this.players.delete(characterId);
  }

  getPlayer(characterId: string) {
    return this.players.get(characterId);
  }

  snapshot(state: PlayerCombatState): CombatSnapshot {
    this.recomputePlayerStats(state);
    return {
      characterId: state.character.id,
      hp: state.hp,
      maxHp: state.maxHp,
      mp: state.mp,
      maxMp: state.maxMp,
      atk: state.atk,
      matk: state.matk,
      def: state.def,
      mdef: state.mdef,
      critRatePct: state.critRatePct,
      critDamagePct: state.critDamagePct,
      damageReductionPct: state.damageReductionPct,
      evasionPct: state.evasionPct,
      cooldownReductionPct: state.cooldownReductionPct,
      armorPenetrationPct: state.armorPenetrationPct,
      magicPenetrationPct: state.magicPenetrationPct,
      statusResistancePct: state.statusResistancePct,
      passiveAllocations: { ...(state.character.passiveAllocations || {}) },
      passivePointsAvailable: state.passivePointsAvailable,
      statBreakdowns: state.statBreakdowns,
      statWarningsVi: state.statWarningsVi,
      jobAffinity: state.jobAffinity,
      shieldHp: state.shieldHp,
      activeSets: state.activeSets,
      level: state.character.level,
      exp: state.character.exp,
      expToNext: expRequired(state.character.level),
      skillPoints: Number(state.character.skillPoints || 0),
      gold: state.character.gold,
      x: state.x,
      y: state.y,
      regionId: state.regionId,
      dead: state.dead,
      classId: state.character.classId,
      advancedJobId: state.character.advancedJobId,
      advancedJobName: state.character.advancedJobName,
      skillMastery: state.character.skillMastery || {},
      deathPenalty: getActiveDeathPenaltyReductionPct(state.character, Date.now()).penalty,
      discoveredVillageIds: [...(state.character.discoveredVillageIds || ['THON_KHOI_NGUYEN'])],
      latestVillageCheckpointId: state.character.latestVillageCheckpointId || 'THON_KHOI_NGUYEN',
      preferredResurrectionVillageId: state.character.preferredResurrectionVillageId,
      resurrectionCheckpoint: resolveResurrectionCheckpoint(state.character, state.regionId),
    };
  }

  getRegionMonsters(regionId: string) {
    this.ensureRegion(regionId);
    return [...this.monsters.values()].filter((m) => m.regionId === regionId).map((m) => this.publicMonster(m));
  }

  private publicMonster(m: MonsterRuntime) {
    const def = this.monsterDefinitions.find((d) => d.id === m.definitionId);
    return {
      id: m.id,
      monsterId: m.definitionId,
      name: m.customName || def?.name || m.definitionId,
      category: m.isRandomElite ? 'ELITE' : (def?.category || (def?.isBoss ? 'FIELD_BOSS' : def?.isElite ? 'ELITE' : 'NORMAL')),
      portraitUrl: def?.portraitUrl,
      isBoss: Boolean(def?.isBoss),
      isElite: Boolean(def?.isElite || m.isRandomElite),
      isRandomElite: Boolean(m.isRandomElite),
      aiBehavior: m.isRandomElite ? 'aggressive' : (def?.aiBehavior || (def?.isBoss ? 'boss' : def?.isElite ? 'aggressive' : 'passive')),
      aiState: m.aiState || (m.alive ? 'IDLE' : 'DEATH'),
      aggroRange: Number(def?.aggroRange ?? (m.isRandomElite ? 240 : def?.isBoss ? 240 : 150)),
      respawnTimeSeconds: Number(def?.respawnTimeSeconds ?? 9),
      expReward: Math.round(Number(def?.expReward ?? 38) * Number(m.expMultiplier || 1)),
      goldReward: Math.round(Number(def?.goldReward ?? 22) * Number(m.goldMultiplier || 1)),
      regionId: m.regionId,
      x: Math.round(m.x),
      y: Math.round(m.y),
      originX: m.spawnOriginX ?? Math.round(m.x),
      originY: m.spawnOriginY ?? Math.round(m.y),
      hp: m.hp,
      maxHp: m.maxHp,
      level: m.level,
      alive: m.alive,
      activePhase: m.activePhase,
      enraged: m.enraged,
      telegraph: m.lastTelegraph,
      spriteId: def?.spriteId,
      sprite_asset: def?.spriteAsset || def?.sprite_asset,
      animation_assets: def?.animationAssets || def?.animation_assets,
    };
  }

  move(characterId: string, x: number, y: number) {
    const state = this.requirePlayer(characterId);
    if (state.dead || !Number.isFinite(x) || !Number.isFinite(y)) return null;
    const now = Date.now();
    const elapsed = Math.max(0.016, (now - state.lastMoveAt) / 1000);
    const maxDistance = 420 * elapsed + 24;
    const delta = distance(state.x, state.y, x, y);
    if (delta > maxDistance) return { rejected: true, snapshot: this.snapshot(state) };
    state.x = clamp(x, 0, 3000);
    state.y = clamp(y, 0, 3000);
    state.lastMoveAt = now;
    state.character.x = state.x;
    state.character.y = state.y;
    state.character.updatedAt = new Date().toISOString();
    this.store.save();
    return { rejected: false, snapshot: this.snapshot(state) };
  }

  changeRegion(characterId: string, targetRegionId: string) {
    const state = this.requirePlayer(characterId);
    const fromId = this.world.normalizeRegionId(state.regionId);
    const toId = this.world.normalizeRegionId(targetRegionId);
    const connection = (this.world.getConnections() || []).find(
      (c: any) => c.enabled !== false && c.fromRegionId === fromId && c.toRegionId === toId
    );
    if (!connection) throw new Error('Không có cổng kết nối hợp lệ giữa hai khu vực.');
    if (state.character.level < Number(connection.requiredLevel || 1)) throw new Error('Cấp độ chưa đủ để đi qua cổng này.');
    if (distance(state.x, state.y, Number(connection.portalX), Number(connection.portalY)) > 140) {
      throw new Error('Bạn cần đến gần cổng dịch chuyển trước.');
    }
    state.regionId = toId;
    state.x = Number(connection.targetX);
    state.y = Number(connection.targetY);
    state.character.regionId = toId;
    state.character.x = state.x;
    state.character.y = state.y;
    if (isSafeVillageId(toId)) {
      const discovered = new Set<string>(Array.isArray(state.character.discoveredVillageIds) ? state.character.discoveredVillageIds : ['THON_KHOI_NGUYEN']);
      discovered.add('THON_KHOI_NGUYEN');
      discovered.add(toId);
      state.character.discoveredVillageIds = Array.from(discovered);
      state.character.latestVillageCheckpointId = toId;
      state.character.checkpointUpdatedAt = new Date().toISOString();
    }
    if (state.character.autoCombatConfig?.enabled) {
      state.character.autoCombatConfig.enabled = false;
    }
    this.ensureRegion(toId);
    try {
      QuestTitleService.getInstance().recordProgress(characterId, { type: 'EXPLORE_MAP', targetId: toId });
      this.recomputePlayerStats(state);
    } catch {
      // safe non-fatal quest hook
    }
    this.persist(state);
    return this.snapshot(state);
  }

  public setSittingState(characterId: string, isSitting: boolean) {
    const player = this.requirePlayer(characterId);
    if (player.dead) throw new Error('Nhân vật đã gục, không thể ngồi nghỉ.');
    const now = Date.now();
    if (isSitting && player.lastCombatActionAt && now - player.lastCombatActionAt < DEFAULT_REGEN_STATE_CONFIG.outOfCombatDelayMs) {
      throw new Error('Không thể ngồi thiền / nghỉ ngơi khi đang trong trạng thái giao tranh.');
    }
    player.isSitting = Boolean(isSitting);
    player.character.isSitting = Boolean(isSitting);
    this.persist(player);
    return {
      characterId: player.character.id,
      isSitting: player.isSitting,
      snapshot: this.snapshot(player),
    };
  }

  public tickRegeneration(
    characterId: string,
    options?: {
      deltaSeconds?: number;
      nowMs?: number;
      areaContext?: RegenerationAreaContext;
      consumableRegenStacks?: Array<{ hpPctPerSec?: number; mpPctPerSec?: number; hpFlatPerSec?: number; mpFlatPerSec?: number }>;
    }
  ) {
    const player = this.requirePlayer(characterId);
    const now = options?.nowMs ?? Date.now();
    if (player.lastRegenTickAt && options?.nowMs === undefined && now - player.lastRegenTickAt < DEFAULT_REGEN_STATE_CONFIG.minTickIntervalMs) {
      const err: any = new Error('Tần suất hồi phục quá nhanh (Chống exploit regen tick).');
      err.statusCode = 429;
      throw err;
    }
    player.lastRegenTickAt = now;

    const mapCfg = this.world.getMaps?.().find((m: any) => m.id === player.regionId || m.regionId === player.regionId);
    const inferredArea: RegenerationAreaContext =
      options?.areaContext ||
      (mapCfg?.isSafeZone || isSafeVillageId(player.regionId)
        ? 'safe_zone'
        : Array.from(this.monsters.values()).some((m) => m.regionId === player.regionId && m.alive && this.monsterDefinitions.find((d) => d.id === m.definitionId)?.isBoss)
          ? 'boss_arena'
          : 'normal');

    const res = computeCharacterRegenTick({
      classId: player.character.classId,
      advancedJobId: player.character.advancedJobId,
      currentHp: player.hp,
      maxHp: player.maxHp,
      currentMp: player.mp,
      maxMp: player.maxMp,
      deltaSeconds: options?.deltaSeconds ?? 1,
      lastCombatActionAt: player.lastCombatActionAt,
      nowMs: now,
      isSitting: player.isSitting || player.character.isSitting,
      areaContext: inferredArea,
      consumableRegenStacks: options?.consumableRegenStacks,
    });

    player.hp = res.nextHp;
    player.mp = res.nextMp;
    this.persist(player);

    return {
      ...res,
      snapshot: this.snapshot(player),
    };
  }

  private getOrCreateContribution(monster: MonsterRuntime, player: PlayerCombatState): RawContribution {
    let rec = monster.participants.get(player.character.id);
    if (!rec) {
      rec = {
        characterId: player.character.id,
        characterName: player.character.name,
        classId: player.character.classId,
        damageDealt: 0,
        healingProvided: 0,
        damageAbsorbed: 0,
        effectiveSupport: 0,
        validActions: 0,
        lastActiveAt: Date.now(),
      };
      monster.participants.set(player.character.id, rec);
    }
    rec.lastActiveAt = Date.now();
    return rec;
  }

  attack(characterId: string, input: { targetId: string; actionType?: string; skillId?: string }) {
    const player = this.requirePlayer(characterId);
    if (this.world.isCombatBlockedRegion(player.regionId)) {
      throw new Error('Khu vực an toàn (Thành Phố) — không thể chiến đấu tại đây!');
    }
    if (player.dead) throw new Error('Nhân vật đã gục. Hãy hồi sinh trước khi chiến đấu.');
    if (!input || typeof input.targetId !== 'string') throw new Error('Mục tiêu không hợp lệ.');
    const monster = this.monsters.get(input.targetId);
    if (!monster || monster.regionId !== player.regionId || !monster.alive) {
      throw new Error('Quái vật không tồn tại hoặc đã bị tiêu diệt.');
    }
    const definition = this.monsterDefinitions.find((m) => m.id === monster.definitionId);
    if (!definition || definition.enabled === false) throw new Error('Quái vật hiện không khả dụng.');

    this.recomputePlayerStats(player);

    const actionType = input.actionType || 'basic_attack';
    let skill: SkillDefinition | undefined;
    let range = 72 + player.bonusRange;
    let manaCost = 0;
    let cooldownMs = 650;
    let skillOutput: ReturnType<typeof computeSkillActionPower> | null = null;

    const mods = computePassiveAndBuffModifiers(
      player.character.classId,
      player.character.skillLevels || {},
      player.character.unlockedSkills || [],
      player.character.activeBuffs || {},
      this.allSkills
    );

    if (actionType === 'skill') {
      const requestedId = input.skillId === 'skill_basic_attack' ? 'SKILL_NOVICE_SLASH' : input.skillId;
      if (isPreJobClass(player.character.classId) && !['SKILL_NOVICE_SLASH', 'SKILL_NOVICE_FIREBALL'].includes(String(requestedId || ''))) {
        const err: any = new Error('Tân Thủ (Novice) chỉ được phép sử dụng 2 kỹ năng: Trảm Kích và Tiểu Hỏa Cầu.');
        err.statusCode = 403;
        throw err;
      }
      skill = this.allSkills.find((s) => s.id === requestedId);
      if (!skill) throw new Error(`Không tìm thấy kỹ năng "${input.skillId}".`);
      if (skill.skillType === 'passive') {
        throw new Error(`Kỹ năng bị động "${skill.name}" luôn tự kích hoạt, không thể thi triển trực tiếp.`);
      }
      if (
        normalizeBaseClassId(skill.classId) !== normalizeBaseClassId(player.character.classId) &&
        (!isPreJobClass(player.character.classId) || skill.classId !== 'adventurer')
      ) {
        throw new Error('Kỹ năng không thuộc chức nghiệp của bạn.');
      }
      if (skill.advancedBranchId && skill.advancedBranchId !== player.character.advancedJobId) {
        throw new Error(
          `Kỹ năng "${skill.name}" thuộc nhánh ${skill.advancedBranchId}, không tương thích với nhánh hiện tại (${player.character.advancedJobId || 'chưa chuyển chức Lv.80'}).`
        );
      }
      if (player.character.level < Number(skill.requiredLevel || 1)) {
        throw new Error(`Cấp độ chưa đủ (yêu cầu Lv.${skill.requiredLevel}) để dùng ${skill.name}.`);
      }

      const skLv = Number(player.character.skillLevels?.[skill.id] || 1);
      const curMastery = Number(player.character.skillMastery?.[skill.id]?.points || 0);
      skillOutput = computeSkillActionPower(
        skill,
        skLv,
        player.character.baseStats || player.character.attributes,
        player.atk,
        player.matk,
        player.def,
        mods,
        curMastery
      );
      const syn = player.synergyBonusesBySkillId[skill.id];
      const totalCdrPct = Math.min(STAT_CAP_RULES.cooldownReductionPct.hardCeiling, player.cooldownReductionPct + (syn?.cooldownReductionPct || 0));
      range = Number(skill.range || 72) + player.bonusRange;
      manaCost = skillOutput.mpCost;
      cooldownMs = Math.max(400, Math.round(skillOutput.cooldownSec * 1000 * (1 - totalCdrPct / 100)));
    } else if (actionType !== 'basic_attack') {
      throw new Error('Loại hành động chiến đấu không hợp lệ.');
    }

    if (distance(player.x, player.y, monster.x, monster.y) > range) {
      throw new Error('Mục tiêu nằm ngoài tầm tấn công.');
    }
    const wasAliveBeforeHit = monster.alive && monster.hp > 0;
    const now = Date.now();
    const cooldownKey = skill ? skill.id : 'basic_attack';
    const readyAt = player.cooldowns.get(cooldownKey) || 0;
    if (now < readyAt) throw new Error('Kỹ năng đang hồi chiêu.');
    if (player.mp < manaCost) throw new Error('Không đủ MP để sử dụng kỹ năng.');
    player.mp -= manaCost;
    player.cooldowns.set(cooldownKey, now + cooldownMs);
    player.lastCombatActionAt = now;
    player.isSitting = false;
    player.character.isSitting = false;

    // Compute monster effective defense (respecting Armor/Magic Penetration caps, never negative!)
    const monsterStats = definition.combat_stats || {};
    const baseMonsterDef = skillOutput?.isMagical
      ? Number(definition.magicalDefense ?? monsterStats.magical_defense ?? 0)
      : Number(definition.physicalDefense ?? monsterStats.physical_defense ?? definition.def ?? 0);
    const defBreakPct = Object.values(monster.debuffs || {})
      .filter((d) => d.stat === 'defPct' && d.expiresAt > now)
      .reduce((acc, d) => acc + Math.abs(Number(d.valuePct || 0)), 0);
    const effectiveDefense = Math.max(0, Math.round(baseMonsterDef * (1 - Math.min(60, defBreakPct) / 100)));

    const evoState = skillOutput?.evolutionState;
    const bossMod = definition.isBoss
      ? (skill?.bossModifier ?? 1) * player.bossDamageMultiplier
      : (skill?.pveModifier ?? 1) * player.pveDamageMultiplier;
    const monsterHpPct = (monster.hp / Math.max(1, monster.maxHp)) * 100;
    const executeMult =
      evoState && evoState.executeThresholdPct > 0 && monsterHpPct <= evoState.executeThresholdPct
        ? 1.3
        : 1.0;

    // Level-aware accuracy vs evasion check when target has explicit evasion
    const monsterEvasion = Number(definition.evasionPct ?? monsterStats.evasionPct ?? 0);
    const hitCheck =
      monsterEvasion > 0
        ? computeLevelAwareHitChance({
            attackerAccuracy: player.accuracy,
            attackerLevel: player.character.level,
            defenderEvasionPct: monsterEvasion,
            defenderLevel: monster.level,
          })
        : { hitChancePct: 100, isLevelDisadvantaged: false };
    const didMiss = hitCheck.hitChancePct < 100 && Math.random() * 100 > hitCheck.hitChancePct;

    const synBonus = skill ? player.synergyBonusesBySkillId[skill.id] : undefined;
    const variance = 0.92 + Math.random() * 0.16;
    const effectiveCritRate = Math.min(
      STAT_CAP_RULES.critRatePct.hardCeiling,
      player.critRatePct + (evoState?.bonusCritChancePct || 0) + (synBonus?.critBonusPct || 0)
    );
    const critical = !didMiss && Math.random() * 100 < effectiveCritRate;
    const rawDamage = (skillOutput ? skillOutput.rawPower : player.atk) * bossMod * executeMult;
    const penPct = skillOutput?.isMagical ? player.magicPenetrationPct : player.armorPenetrationPct;
    const damage = didMiss
      ? 0
      : computeSafeCombatDamage({
          rawPower: rawDamage * variance,
          targetDef: effectiveDefense,
          penetrationPct: penPct,
          targetDamageReductionPct: 0,
          critical,
          critDamageMultiplierPct: player.critDamagePct,
          modeMultiplier: 1,
          synergyDamageBonusPct: synBonus?.damageBonusPct || 0,
        });

    // Apply skill buff / debuff / heal / stun side effects
    const appliedEffects: string[] = [];
    if (skill) {
      for (const eff of skill.effects || []) {
        if (eff.kind === 'buff' || eff.kind === 'summon') {
          if (!player.character.activeBuffs) player.character.activeBuffs = {};
          player.character.activeBuffs[eff.id] = {
            stat: eff.stat,
            valuePct: eff.valuePct,
            flatValue: eff.flatValue,
            expiresAt: now + Math.max(2, eff.durationSec || 8) * 1000,
          };
          appliedEffects.push(eff.id);
        } else if (eff.kind === 'debuff' || eff.kind === 'dot') {
          monster.debuffs[eff.id] = {
            stat: eff.stat,
            valuePct: eff.valuePct,
            expiresAt: now + Math.max(2, eff.durationSec || 6) * 1000,
          };
          appliedEffects.push(eff.id);
        } else if (eff.kind === 'stun') {
          monster.stunnedUntil = Math.max(monster.stunnedUntil || 0, now + Math.max(1, eff.durationSec || 1.5) * 1000);
          appliedEffects.push(eff.id);
        } else if (eff.kind === 'taunt') {
          if (!player.character.activeBuffs) player.character.activeBuffs = {};
          player.character.activeBuffs[eff.id] = {
            stat: eff.stat || 'defPct',
            valuePct: eff.valuePct || 20,
            expiresAt: now + Math.max(3, eff.durationSec || 10) * 1000,
          };
          appliedEffects.push(eff.id);
        }
      }
      if (skillOutput && skillOutput.healPower > 0) {
        const healed = Math.min(player.maxHp - player.hp, skillOutput.healPower);
        player.hp += healed;
        if (definition.isBoss) {
          const rec = this.getOrCreateContribution(monster, player);
          rec.healingProvided += healed;
        }
      }
    }

    if (player.lifestealPct > 0) {
      const leech = Math.max(1, Math.floor((damage * player.lifestealPct) / 100));
      player.hp = Math.min(player.maxHp, player.hp + leech);
    }

    // Apply damage to monster & record Boss/Elite participation
    const dealt = Math.min(monster.hp, damage);
    monster.hp = Math.max(0, monster.hp - dealt);

    const rec = this.getOrCreateContribution(monster, player);
    rec.damageDealt += dealt;
    rec.validActions += 1;
    // Aggro transition for normal/passive monsters upon taking player damage
    monster.targetCharacterId = player.character.id;
    monster.aggroUntil = now + 12000;
    if (monster.aiState === 'IDLE' || monster.aiState === 'RETURN') {
      monster.aiState = 'CHASE';
    }
    if (appliedEffects.length > 0 && definition.isBoss) {
      rec.effectiveSupport += 40 * appliedEffects.length;
    }

    // Check Boss/Random-Elite phase transitions & telegraphed attack
    const bossCfg = definition.isBoss ? this.getBossConfig(definition.id) : undefined;
    let phaseTriggered: any = null;
    if (bossCfg && monster.hp > 0) {
      const hpPct = (monster.hp / Math.max(1, monster.maxHp)) * 100;
      const candidate = [...bossCfg.phases]
        .filter((p) => hpPct <= p.hpThresholdPct && p.phase > monster.activePhase)
        .sort((a, b) => b.phase - a.phase)[0];
      if (candidate) {
        monster.activePhase = candidate.phase;
        if (candidate.isEnrage) monster.enraged = true;
        monster.lastTelegraph = {
          skillName: candidate.skillName,
          warningText: candidate.warningText,
          aoeRadius: candidate.aoeRadius,
          executesAt: now + candidate.telegraphMs,
          element: candidate.element,
        };
        phaseTriggered = candidate;
      }
    } else if (monster.isRandomElite && monster.hp > 0) {
      const hpPct = (monster.hp / Math.max(1, monster.maxHp)) * 100;
      if (hpPct <= 35 && !monster.enraged) {
        monster.enraged = true;
      }
      if (!monster.lastTelegraph && now - (monster.lastTelegraphAt || 0) >= 9000) {
        monster.lastTelegraphAt = now;
        monster.lastTelegraph = {
          skillName: 'Tinh Anh Bộc Phá',
          warningText: `${monster.customName || definition.name} đang tụ lực đòn diện rộng!`,
          aoeRadius: 118,
          executesAt: now + 1800,
          element: definition.element || 'shadow',
        };
      }
    }

    let rewards: any = null;
    let deathEvent: any = null;
    if (monster.hp <= 0) {
      monster.alive = false;
      monster.aiState = 'DEATH';
      monster.targetCharacterId = null;
      const zone = monster.spawnZoneId ? this.spawnPoints.find((z: any) => z.id === monster.spawnZoneId) : undefined;
      const respawnSec = Number(
        zone?.respawnTime ?? bossCfg?.respawnTimeSeconds ?? definition.respawnTimeSeconds ?? definition.respawn_behavior?.respawn_time_seconds ?? 10
      );
      monster.respawnAt = Date.now() + respawnSec * 1000;
      rewards = this.awardKill(player, monster, definition, bossCfg);
      if (monster.isRandomElite) {
        const eliteCfg = this.world.getOperationsConfig().eliteSpawn;
        this.lastEliteRespawnAllowedByRegion.set(
          monster.regionId,
          Date.now() + Math.max(15, eliteCfg.respawnCooldownSec) * 1000
        );
      }
    } else if (now >= (monster.stunnedUntil || 0)) {
      const retaliateRes = this.monsterRetaliate(player, monster, definition, bossCfg);
      if (retaliateRes?.deathEvent) deathEvent = retaliateRes.deathEvent;
    }

    // Award legitimate Skill Mastery (0-100) only when damaging a valid alive target outside safe zones
    let masteryGained = 0;
    let masteryPoints = skill ? Number(player.character.skillMastery?.[skill.id]?.points || 0) : 0;
    let masteryRank = skill ? (player.character.skillMastery?.[skill.id]?.rank || 'novice') : 'novice';
    const mapCfg = this.world.getMaps?.().find((m: any) => m.id === player.regionId || m.regionId === player.regionId);
    const isSafeZone = Boolean(mapCfg?.isSafeZone);
    if (skill) {
      if (!player.character.skillMastery) player.character.skillMastery = {};
      const mRes = applyCombatMasteryGain(player.character.skillMastery[skill.id], skill, {
        nowMs: now,
        isValidTargetAlive: wasAliveBeforeHit,
        isSafeZone,
        didConnectEffect: dealt > 0,
        targetIsBoss: Boolean(definition.isBoss),
      });
      player.character.skillMastery[skill.id] = mRes.updated;
      masteryGained = mRes.gainedPoints;
      masteryPoints = mRes.updated.points;
      masteryRank = mRes.updated.rank;
    }

    // Apply AoE cleave splash onto nearby alive monsters in the same region up to targetLimit
    const cleavedTargets: Array<{ id: string; damage: number; hp: number; alive: boolean }> = [];
    const shouldAoe =
      skill &&
      (skill.targetType === 'aoe' ||
        skill.targetType === 'ground' ||
        skill.executionType === 'aoe' ||
        skill.executionType === 'ultimate' ||
        evoState?.unlockedVfxTags.includes('expanded_aoe'));
    if (shouldAoe && evoState && dealt > 0) {
      const cap = Math.max(1, Number(skill?.targetLimit || 8) - 1);
      const splashDmg =
        skill?.targetType === 'aoe' ||
        skill?.executionType === 'aoe' ||
        skill?.executionType === 'ultimate'
          ? damage
          : Math.max(1, Math.floor(damage * 0.55));
      for (const extra of this.monsters.values()) {
        if (cleavedTargets.length >= cap) break;
        if (!extra.alive || extra.hp <= 0 || extra.id === monster.id || extra.regionId !== player.regionId) continue;
        if (distance(monster.x, monster.y, extra.x, extra.y) > evoState.effectiveAreaRadius) continue;
        const extraDealt = Math.min(extra.hp, splashDmg);
        extra.hp = Math.max(0, extra.hp - extraDealt);
        if (extra.hp <= 0) {
          extra.alive = false;
          const extraDef = this.monsterDefinitions.find((d) => d.id === extra.definitionId);
          extra.respawnAt = now + Number(extraDef?.respawnTimeSeconds ?? 10) * 1000;
        }
        cleavedTargets.push({ id: extra.id, damage: extraDealt, hp: extra.hp, alive: extra.alive });
      }
    }

    const animMeta = skill
      ? skill.animationMetadata || resolveSkillAnimationMetadata(skill)
      : resolveSkillAnimationMetadata({
          id: 'basic_attack',
          classId: player.character.classId,
          advancedBranchId: player.character.advancedJobId,
          vfxKey: 'vfx_slash',
          targetType: 'single',
          tier: 'basic',
        });
    const timeline = buildSkillExecutionTimeline(animMeta, 'S', 'high');

    this.persist(player);
    return {
      actionType,
      skillId: skill?.id,
      classId: player.character.classId,
      advancedJobId: player.character.advancedJobId,
      advancedJobName: player.character.advancedJobName,
      skillLevel: evoState?.skillLevel ?? 1,
      masteryPoints,
      masteryRank,
      masteryGained,
      evolutionTier: evoState?.evolutionTier ?? 0,
      hitCount: evoState?.totalHitCount ?? 1,
      projectileCount: evoState?.totalProjectiles ?? 1,
      areaRadius: evoState?.effectiveAreaRadius ?? (skill?.areaRadius || 95),
      vfxId: skill?.vfxId || skill?.vfxKey || 'vfx_sword_slash',
      vfxTags: evoState?.unlockedVfxTags || [],
      animationMetadata: animMeta,
      timeline,
      releaseFrame: animMeta.release_frame,
      impactFrame: animMeta.impact_frame,
      projectileReleaseTimeMs: timeline.releaseTimeMs,
      damageHitTimeMs: timeline.impactTimeMs,
      damage: dealt,
      critical,
      damageType: skill?.damageType ?? (skillOutput?.isMagical ? 'magic' : 'physical'),
      vfxKey: skill?.vfxKey || 'vfx_sword_slash',
      projectile: skill?.projectile || null,
      hitbox: skill?.hitbox || null,
      attackerX: player.x,
      attackerY: player.y,
      targetX: monster.x,
      targetY: monster.y,
      appliedEffects,
      phaseTriggered,
      cleavedTargets,
      monster: this.publicMonster(monster),
      player: this.snapshot(player),
      rewards,
      deathEvent,
    };
  }

  /**
   * Executes active support / healing / defensive / buff / cleanse / taunt skills
   * and logs contribution into active Boss encounters in the player's region.
   */
  castSupportSkill(characterId: string, skillId: string, allyCharacterIds: string[] = []) {
    const player = this.requirePlayer(characterId);
    if (player.dead) throw new Error('Nhân vật đã gục.');
    const skill = this.allSkills.find((s) => s.id === skillId);
    if (!skill) throw new Error(`Kỹ năng "${skillId}" không tồn tại.`);
    if (
      normalizeBaseClassId(skill.classId) !== normalizeBaseClassId(player.character.classId) &&
      (!isPreJobClass(player.character.classId) || skill.classId !== 'adventurer')
    ) {
      throw new Error('Kỹ năng không thuộc chức nghiệp của bạn.');
    }
    if (skill.advancedBranchId && skill.advancedBranchId !== player.character.advancedJobId) {
      throw new Error(
        `Kỹ năng "${skill.name}" thuộc nhánh ${skill.advancedBranchId}, không tương thích với nhánh hiện tại.`
      );
    }
    if (player.character.level < Number(skill.requiredLevel || 1)) {
      throw new Error(`Cấp độ chưa đủ (yêu cầu Lv.${skill.requiredLevel}) để dùng ${skill.name}.`);
    }

    this.recomputePlayerStats(player);
    const now = Date.now();
    if (now < (player.cooldowns.get(skill.id) || 0)) throw new Error('Kỹ năng đang hồi chiêu.');

    const compatibleUnlocked = (player.character.unlockedSkills || []).filter((sid) => {
      const def = this.allSkills.find((s) => s.id === sid);
      return !def?.advancedBranchId || def.advancedBranchId === player.character.advancedJobId;
    });
    const mods = computePassiveAndBuffModifiers(
      player.character.classId,
      player.character.skillLevels || {},
      compatibleUnlocked,
      player.character.activeBuffs || {},
      this.allSkills
    );
    const skLv = Number(player.character.skillLevels?.[skill.id] || 1);
    const curMastery = Number(player.character.skillMastery?.[skill.id]?.points || 0);
    const power = computeSkillActionPower(
      skill,
      skLv,
      player.character.baseStats || player.character.attributes,
      player.atk,
      player.matk,
      player.def,
      mods,
      curMastery
    );
    const evo = power.evolutionState;

    if (player.mp < power.mpCost) throw new Error('Không đủ MP để sử dụng kỹ năng.');
    player.mp -= power.mpCost;
    player.cooldowns.set(skill.id, now + power.cooldownSec * 1000);

    const targets: PlayerCombatState[] = [player];
    for (const allyId of allyCharacterIds) {
      const ally = this.players.get(allyId);
      if (ally && ally.character.id !== player.character.id && ally.regionId === player.regionId && !ally.dead) {
        targets.push(ally);
      }
    }

    let totalHealed = 0;
    let totalShielded = 0;
    let totalSupportScore = 0;

    for (const target of targets) {
      if (power.healPower > 0) {
        const gain = Math.min(target.maxHp - target.hp, power.healPower);
        target.hp += Math.max(0, gain);
        totalHealed += gain;
      }
      if (power.shieldPower > 0) {
        target.shieldHp += power.shieldPower;
        totalShielded += power.shieldPower;
      }
      for (const eff of skill.effects || []) {
        if (eff.kind === 'buff' || eff.kind === 'taunt' || eff.kind === 'summon') {
          if (!target.character.activeBuffs) target.character.activeBuffs = {};
          target.character.activeBuffs[eff.id] = {
            stat: eff.stat,
            valuePct: eff.valuePct,
            flatValue: eff.flatValue,
            expiresAt: now + Math.max(2, eff.durationSec || 10) * 1000,
          };
          totalSupportScore += 85;
        } else if (eff.kind === 'cleanse') {
          totalSupportScore += 110;
        }
      }
    }

    // Credit active Boss fights in the same region so Monks/Knights receive fair Boss contribution!
    for (const monster of this.monsters.values()) {
      if (!monster.alive || monster.regionId !== player.regionId) continue;
      const def = this.monsterDefinitions.find((d) => d.id === monster.definitionId);
      if (!def?.isBoss) continue;
      const rec = this.getOrCreateContribution(monster, player);
      rec.healingProvided += totalHealed;
      rec.effectiveSupport += totalSupportScore + Math.round(totalShielded * 0.5);
      if (skill.effects?.some((e) => e.kind === 'taunt')) {
        rec.damageAbsorbed += Math.round(power.shieldPower || player.def * 4);
      }
      rec.validActions += 1;
    }

    let masteryGained = 0;
    if (!player.character.skillMastery) player.character.skillMastery = {};
    const regionHasCombat = [...this.monsters.values()].some((m) => m.regionId === player.regionId && m.alive);
    const mapCfg = this.world.getMaps?.().find((m: any) => m.id === player.regionId || m.regionId === player.regionId);
    const isSafeZone = Boolean(mapCfg?.isSafeZone) && !regionHasCombat;
    const mRes = applyCombatMasteryGain(player.character.skillMastery[skill.id], skill, {
      nowMs: now,
      isValidTargetAlive: totalHealed > 0 || regionHasCombat,
      isSafeZone,
      didConnectEffect: totalHealed > 0 || totalShielded > 0 || totalSupportScore > 0,
    });
    player.character.skillMastery[skill.id] = mRes.updated;
    masteryGained = mRes.gainedPoints;

    this.recomputePlayerStats(player);
    this.persist(player);

    return {
      actionType: 'support_skill',
      skillId,
      classId: player.character.classId,
      advancedJobId: player.character.advancedJobId,
      skillLevel: evo.skillLevel,
      masteryPoints: mRes.updated.points,
      masteryRank: mRes.updated.rank,
      masteryGained,
      evolutionTier: evo.evolutionTier,
      areaRadius: evo.effectiveAreaRadius,
      vfxKey: skill.vfxKey || 'vfx_divine_heal',
      vfxId: skill.vfxId || skill.vfxKey || 'vfx_divine_heal',
      vfxTags: evo.unlockedVfxTags,
      attackerX: player.x,
      attackerY: player.y,
      targetX: player.x,
      targetY: player.y,
      healedHp: totalHealed,
      shieldAdded: totalShielded,
      supportPoints: totalSupportScore,
      cleanseApplied: evo.cleanseCount,
      unlocksGroundField: evo.unlocksGroundField,
      player: this.snapshot(player),
    };
  }

  heal(characterId: string, skillId: string, allyCharacterIds: string[] = []) {
    return this.castSupportSkill(characterId, skillId, allyCharacterIds);
  }

  private monsterRetaliate(
    player: PlayerCombatState,
    monster: MonsterRuntime,
    definition: any,
    bossCfg?: BossEncounterConfig
  ): { hit: boolean; damage: number; deathEvent: any | null } | undefined {
    const stats = definition.combat_stats || {};
    if (player.dead || distance(player.x, player.y, monster.x, monster.y) > Number(definition.attackRange ?? definition.attack_range ?? 95)) {
      return undefined;
    }
    const now = Date.now();
    const cooldown = Math.max(700, 1000 / Math.max(0.5, Number(stats.attack_speed || 1)));
    if (now - monster.lastAttackedAt < cooldown) return undefined;
    monster.lastAttackedAt = now;

    const phaseMult =
      (bossCfg?.phases?.find((p) => p.phase === monster.activePhase)?.atkMultiplier ??
        (monster.enraged ? 1.45 : 1.0)) *
      Number(monster.atkMultiplier || 1);
    const raw = Number(definition.physicalAttack ?? stats.physical_attack ?? definition.atk ?? 5) * phaseMult;

    // Respect overflow-capped Player Evasion via level-aware accuracy vs evasion
    const monsterAcc = Number(definition.accuracy ?? stats.accuracy ?? 96 + monster.level * 1.4);
    const hitRes = computeLevelAwareHitChance({
      attackerAccuracy: monsterAcc,
      attackerLevel: monster.level,
      defenderEvasionPct: player.evasionPct,
      defenderLevel: player.character.level,
    });
    if (hitRes.hitChancePct < 100 && Math.random() * 100 > hitRes.hitChancePct) {
      return { hit: false, damage: 0, deathEvent: null };
    }

    const cappedDr = Math.min(STAT_CAP_RULES.damageReductionPct.hardCeiling, Math.max(0, player.damageReductionPct));
    const mitigatedByDef = Math.floor(player.def * 0.5);
    const postDef = Math.max(1, raw - mitigatedByDef);
    const reducedByPct = Math.floor(postDef * (cappedDr / 100));
    let remaining = Math.max(1, Math.floor(postDef - reducedByPct));

    let shieldAbsorbed = 0;
    if (player.shieldHp > 0) {
      shieldAbsorbed = Math.min(player.shieldHp, remaining);
      player.shieldHp -= shieldAbsorbed;
      remaining -= shieldAbsorbed;
    }

    const totalMitigated = Math.max(0, Math.round(mitigatedByDef + reducedByPct + shieldAbsorbed));
    if (definition.isBoss && totalMitigated > 0) {
      const rec = this.getOrCreateContribution(monster, player);
      rec.damageAbsorbed += totalMitigated;
      rec.validActions += 1;
    }

    player.hp = Math.max(0, player.hp - remaining);
    let deathEvent: any = null;
    if (player.hp <= 0) {
      deathEvent = this.applyPlayerDeath(
        player,
        monster.customName || definition.name || monster.definitionId,
        'Bị quái vật hạ gục trong chiến đấu'
      );
    }
    return { hit: true, damage: remaining, deathEvent };
  }

  public applyPlayerDeath(
    player: PlayerCombatState,
    killerName = 'Quái Vật',
    reason = 'Sinh lực cạn kiệt'
  ) {
    if (player.dead) return null;
    player.dead = true;
    player.hp = 0;

    // Disengage all monsters targeting this dead player
    for (const mon of this.monsters.values()) {
      if (mon.targetCharacterId === player.character.id) {
        mon.targetCharacterId = null;
        if (mon.alive) mon.aiState = 'RETURN';
      }
    }

    const ops = this.world.getOperationsConfig();
    const checkpoint = resolveResurrectionCheckpoint(player.character, player.regionId);
    const outcome = computeDeathPenaltyApplication({
      character: player.character,
      resurrectionMapId: checkpoint.id,
      killerName,
      reason,
      config: ops.deathPenalty,
      nowMs: Date.now(),
    });

    player.character.exp = outcome.nextExp;
    player.character.level = outcome.nextLevel; // Level NEVER resets on death
    player.character.deathPenalty = outcome.penalty;
    player.character.deathCount = Number(player.character.deathCount || 0) + 1;
    if (player.character.autoCombatConfig) {
      player.character.autoCombatConfig.enabled = false;
    }

    this.recomputePlayerStats(player);
    this.persist(player);

    return {
      characterId: player.character.id,
      killerName,
      reason,
      expLost: outcome.expLost,
      levelPreserved: player.character.level,
      penalty: outcome.penalty,
      checkpoint,
      player: this.snapshot(player),
    };
  }

  public reportClientFatalDamage(characterId: string, killerName?: string, reason?: string) {
    const player = this.requirePlayer(characterId);
    player.hp = 0;
    const deathEvent = this.applyPlayerDeath(player, killerName || 'Quái Vật', reason || 'Sinh lực cạn kiệt');
    return deathEvent || {
      characterId: player.character.id,
      killerName: killerName || 'Quái Vật',
      reason: reason || 'Sinh lực cạn kiệt',
      expLost: player.character.deathPenalty?.expLost || 0,
      levelPreserved: player.character.level,
      penalty: player.character.deathPenalty || null,
      checkpoint: resolveResurrectionCheckpoint(player.character, player.regionId),
      player: this.snapshot(player),
    };
  }

  /**
   * Simulates/records damage absorbed & tanking contribution for multi-player / boss encounter verification.
   */
  recordBossTankOrSupportAction(
    monsterRuntimeId: string,
    characterId: string,
    delta: { damageDealt?: number; healingProvided?: number; damageAbsorbed?: number; effectiveSupport?: number; validActions?: number }
  ) {
    const monster = this.monsters.get(monsterRuntimeId);
    const player = this.players.get(characterId);
    if (!monster || !player) throw new Error('Không tìm thấy Boss hoặc người chơi trong trận chiến.');
    const rec = this.getOrCreateContribution(monster, player);
    rec.damageDealt += Math.max(0, Number(delta.damageDealt || 0));
    rec.healingProvided += Math.max(0, Number(delta.healingProvided || 0));
    rec.damageAbsorbed += Math.max(0, Number(delta.damageAbsorbed || 0));
    rec.effectiveSupport += Math.max(0, Number(delta.effectiveSupport || 0));
    rec.validActions += Math.max(0, Number(delta.validActions ?? 1));
    return rec;
  }

  private awardKill(
    killer: PlayerCombatState,
    monster: MonsterRuntime,
    definition: any,
    bossCfg?: BossEncounterConfig
  ) {
    // Idempotency lock: prevent duplicate boss kill settlement
    const killId = `${monster.id}:${monster.respawnAt || Date.now()}`;
    if (monster.settledKillId === killId || this.bossSettlementLocks.has(monster.id)) {
      return { duplicateBlocked: true, exp: 0, gold: 0, drops: [], bossRewards: [] };
    }
    this.bossSettlementLocks.add(monster.id);
    monster.settledKillId = killId;

    try {
      const expConfig = this.world.getExpBalanceConfig();
      const rawBaseExp = Math.max(
        0,
        Math.round(Number(definition.expReward ?? definition.exp_reward ?? definition.exp ?? 0) * Number(monster.expMultiplier || 1))
      );
      const rawBaseGold = Math.max(
        0,
        Math.round(Number(definition.goldReward ?? definition.gold_reward ?? definition.gold ?? 0) * Number(monster.goldMultiplier || 1))
      );
      const goldMult = Math.max(0.1, Number(expConfig.goldMultiplier ?? 1));
      const dropMult = Math.max(0.1, Number(expConfig.dropRateMultiplier ?? 1));

      const dropTableId = definition.dropTableId ?? definition.drop_table;
      const table = this.dropTables.find(
        (t: any) => (t.tableId || t.table_id) === dropTableId || (t.monsterId || t.monster_id) === definition.id
      );

      // Boss & Mini-Boss multi-participant settlement using Party Contribution rules
      if ((definition.isBoss || definition.isElite) && table && monster.participants.size > 0) {
        const rules = bossCfg?.partyRules;
        const ranked = computeBossParticipantScores(Array.from(monster.participants.values()), rules);
        const bossRewards: Array<{
          characterId: string;
          characterName: string;
          eligible: boolean;
          totalScore: number;
          rewardSharePct: number;
          pityTriggered: boolean;
          drops: Array<{ itemId: string; quantity: number }>;
        }> = [];

        let killerAdjustedExp = computeMonsterKillExp({
          baseMonsterExp: rawBaseExp,
          playerLevel: killer.character.level,
          monsterLevel: monster.level,
          regionId: monster.regionId,
          isBoss: Boolean(definition.isBoss),
          isElite: Boolean(definition.isElite || monster.isRandomElite),
          partyMemberCount: Math.max(1, ranked.filter((r) => r.eligible).length),
          config: expConfig,
        }).totalPoolExp;
        let killerAdjustedGold = Math.round(rawBaseGold * goldMult);

        for (const row of ranked) {
          const participantState = this.players.get(row.characterId);
          const charEntity =
            participantState?.character || this.store.characters.find((c) => c.id === row.characterId);
          if (!charEntity) continue;

          if (!row.eligible) {
            bossRewards.push({
              characterId: row.characterId,
              characterName: row.characterName,
              eligible: false,
              totalScore: row.totalScore,
              rewardSharePct: 0,
              pityTriggered: false,
              drops: [],
            });
            continue;
          }

          const shareMult = Math.max(0.25, row.rewardSharePct / 100);
          const participantExpBase = computeMonsterKillExp({
            baseMonsterExp: rawBaseExp,
            playerLevel: Number(charEntity.level || 1),
            monsterLevel: monster.level,
            regionId: monster.regionId,
            isBoss: Boolean(definition.isBoss),
            isElite: Boolean(definition.isElite || monster.isRandomElite),
            partyMemberCount: 1,
            config: expConfig,
          }).totalPoolExp;
          const titleExpMult = 1 + Number(charEntity.cachedTitleBonuses?.cappedTotals?.expBonusPct || 0) / 100;
          const titleGoldMult = 1 + Number(charEntity.cachedTitleBonuses?.cappedTotals?.goldBonusPct || 0) / 100;
          const expGain = Math.max(5, Math.round(participantExpBase * shareMult * titleExpMult));
          const goldGain = Math.max(5, Math.round(rawBaseGold * goldMult * shareMult * titleGoldMult));
          if (row.characterId === killer.character.id) {
            killerAdjustedExp = expGain;
            killerAdjustedGold = goldGain;
          }
          this.grantExpAndGold(participantState, charEntity, expGain, goldGain);

          if (!charEntity.pityCounters) charEntity.pityCounters = {};
          const pityBefore = Number(charEntity.pityCounters[definition.id] || 0);
          const scaledTable = dropMult === 1
            ? table
            : {
                ...table,
                drops: (table.drops || []).map((d: any) => ({
                  ...d,
                  dropRate: clamp(Number(d.dropRate ?? 0) * dropMult, 0, 100),
                })),
              };
          const rolled = rollBossLootForParticipant(
            row,
            Number(charEntity.level || 1),
            scaledTable,
            pityBefore,
            this.allItems
          );
          charEntity.pityCounters[definition.id] = rolled.newPityCounter;

          const acceptedDrops: Array<{ itemId: string; quantity: number }> = [];
          for (const dr of rolled.drops) {
            if (dr.itemId.startsWith('UEQ_')) {
              try {
                QuestTitleService.getInstance().grantUniqueEquipment(charEntity.id, dr.itemId);
                acceptedDrops.push({ itemId: dr.itemId, quantity: 1 });
              } catch {
                // Non-repeatable unique duplicate / bind check cleanly skips redundant drop
              }
            } else {
              this.addInventoryItem(charEntity, dr.itemId, dr.quantity);
              acceptedDrops.push({ itemId: dr.itemId, quantity: dr.quantity });
            }
          }

          try {
            const qt = QuestTitleService.getInstance();
            qt.recordProgress(charEntity.id, { type: 'KILL_MONSTER', targetId: definition.id, amount: 1 });
            for (const dr of acceptedDrops) {
              qt.recordProgress(charEntity.id, { type: 'COLLECT_ITEM', targetId: dr.itemId, amount: dr.quantity });
            }
            if (participantState) this.recomputePlayerStats(participantState);
          } catch {
            // non-fatal quest progress hook
          }

          bossRewards.push({
            characterId: row.characterId,
            characterName: row.characterName,
            eligible: true,
            totalScore: row.totalScore,
            rewardSharePct: row.rewardSharePct,
            pityTriggered: rolled.pityTriggered,
            drops: acceptedDrops,
          });
        }

        const killerEntry = bossRewards.find((b) => b.characterId === killer.character.id);
        monster.participants.clear();
        monster.activePhase = 1;
        monster.enraged = false;
        monster.lastTelegraph = undefined;
        monster.debuffs = {};
        return {
          exp: killerAdjustedExp,
          gold: killerAdjustedGold,
          drops: killerEntry?.drops || [],
          bossRewards,
          levelsGained: [],
          monsterId: definition.id,
        };
      }

      // Standard Normal / Solo Elite kill settlement with Phase 6 & 7 Monster EXP Formula & Title % bonus
      const titleExpMult = 1 + Number(killer.character.cachedTitleBonuses?.cappedTotals?.expBonusPct || 0) / 100;
      const titleGoldMult = 1 + Number(killer.character.cachedTitleBonuses?.cappedTotals?.goldBonusPct || 0) / 100;
      const expCalc = computeMonsterKillExp({
        baseMonsterExp: rawBaseExp,
        playerLevel: killer.character.level,
        monsterLevel: monster.level,
        regionId: monster.regionId,
        isBoss: Boolean(definition.isBoss),
        isElite: Boolean(definition.isElite || monster.isRandomElite),
        partyMemberCount: 1,
        config: expConfig,
      });
      const exp = Math.max(5, Math.round(expCalc.perMemberExp * titleExpMult));
      const gold = Math.max(1, Math.round(rawBaseGold * goldMult * titleGoldMult));

      const levelsGained = this.grantExpAndGold(killer, killer.character, exp, gold);
      const drops: Array<{ itemId: string; quantity: number }> = [];
      for (const entry of table?.drops || []) {
        if (entry.firstClearOnly) continue;
        const baseChance = Number(entry.dropRate ?? entry.drop_rate ?? 0);
        const chance = clamp(entry.isGuaranteed ? baseChance : baseChance * dropMult, 0, 100);
        if (Math.random() * 100 >= chance) continue;
        const itemId = String(entry.itemId ?? entry.item_id ?? '');
        if (!itemId || killer.character.level < Number(entry.requiredPlayerLevel ?? entry.required_player_level ?? 1)) continue;
        const min = Math.max(1, Number(entry.minQuantity ?? entry.min_quantity ?? 1));
        const max = Math.max(min, Number(entry.maxQuantity ?? entry.max_quantity ?? min));
        const quantity = Math.floor(min + Math.random() * (max - min + 1));
        if (itemId.startsWith('UEQ_')) {
          try {
            QuestTitleService.getInstance().grantUniqueEquipment(killer.character.id, itemId);
            drops.push({ itemId, quantity: 1 });
          } catch {
            // Non-repeatable unique already claimed
          }
        } else {
          this.addInventoryItem(killer.character, itemId, quantity);
          drops.push({ itemId, quantity });
        }
      }
      killer.character.updatedAt = new Date().toISOString();
      try {
        const qt = QuestTitleService.getInstance();
        qt.recordProgress(killer.character.id, { type: 'KILL_MONSTER', targetId: definition.id, amount: 1 });
        for (const dr of drops) {
          qt.recordProgress(killer.character.id, { type: 'COLLECT_ITEM', targetId: dr.itemId, amount: dr.quantity });
        }
        this.recomputePlayerStats(killer);
      } catch {
        // non-fatal quest progress hook
      }
      monster.participants.clear();
      monster.debuffs = {};
      return { exp, gold, drops, levelsGained, monsterId: definition.id };
    } finally {
      this.bossSettlementLocks.delete(monster.id);
    }
  }

  private grantExpAndGold(state: PlayerCombatState | undefined, char: CharacterEntity, exp: number, gold: number): number[] {
    char.exp = Number(char.exp || 0) + exp;
    char.gold = Number(char.gold || 0) + gold;
    const levelsGained: number[] = [];
    while (char.level < 110 && char.exp >= expRequired(char.level)) {
      char.exp -= expRequired(char.level);
      char.level += 1;
      levelsGained.push(char.level);
      char.availableAttributePoints = Number(char.availableAttributePoints ?? char.unspentStatPoints ?? 0) + ATTRIBUTE_POINTS_PER_LEVEL;
      char.unspentStatPoints = char.availableAttributePoints;
      char.skillPoints = Number(char.skillPoints || 0) + 1;
      if (state) {
        this.recomputePlayerStats(state);
        state.hp = state.maxHp;
        state.mp = state.maxMp;
      }
    }
    char.updatedAt = new Date().toISOString();
    return levelsGained;
  }

  private addInventoryItem(character: CharacterEntity, itemId: string, quantity: number) {
    const inventory = (character.inventory ||= []) as any[];
    const item = this.allItems.find((i: any) => i.id === itemId || i.itemId === itemId);
    const stackable = item ? (item.stackable !== false && (item.category === 'material' || item.category === 'potion' || item.category === 'consumable')) : true;
    const stackLimit = Math.max(1, Number(item?.max_stack ?? item?.maxStack ?? item?.stackLimit ?? 99));
    if (stackable) {
      let remaining = quantity;
      for (const slot of inventory) {
        if ((slot.itemId || slot.item_id) !== itemId || Number(slot.quantity || 0) >= stackLimit) continue;
        const add = Math.min(remaining, stackLimit - Number(slot.quantity || 0));
        slot.quantity = Number(slot.quantity || 0) + add;
        remaining -= add;
        if (!remaining) break;
      }
      while (remaining > 0) {
        const add = Math.min(remaining, stackLimit);
        const used = new Set(inventory.map((s) => Number(s.slotId)));
        let slotId = 0;
        while (used.has(slotId)) slotId += 1;
        inventory.push({ slotId, itemId, quantity: add });
        remaining -= add;
      }
    } else {
      for (let i = 0; i < quantity; i++) {
        const used = new Set(inventory.map((s) => Number(s.slotId)));
        let slotId = 0;
        while (used.has(slotId)) slotId += 1;
        inventory.push({ slotId, itemId, name: item?.name, category: item?.category, quantity: 1 });
      }
    }
  }

  useItem(characterId: string, itemId: string) {
    const player = this.requirePlayer(characterId);
    if (player.dead) throw new Error('Nhân vật đã gục, không thể sử dụng vật phẩm.');
    const item = this.allItems.find((i: any) => (i.id === itemId || i.itemId === itemId) && i.enabled !== false && i.usable !== false);
    if (!item) throw new Error('Vật phẩm không tồn tại hoặc không thể sử dụng.');
    const inventory = (player.character.inventory || []) as any[];
    const slot = inventory.find((s) => (s.itemId || s.item_id) === itemId && Number(s.quantity || 0) > 0);
    if (!slot) throw new Error('Bạn không sở hữu vật phẩm này.');
    const effects = item.effects || item.properties || {};
    const healHp = Math.max(0, Number(effects.healHp ?? effects.hpRestore ?? effects.hp_restore ?? item.hpRestore ?? 0));
    const healMp = Math.max(0, Number(effects.healMp ?? effects.mpRestore ?? effects.mp_restore ?? item.mpRestore ?? 0));
    const buffRecipe = PROFESSION_RECIPES.find((r) => r.outputItemId === itemId && r.buffEffect);
    if (!healHp && !healMp && !buffRecipe?.buffEffect) {
      throw new Error('Vật phẩm này chưa có hiệu ứng sử dụng được.');
    }
    const restoredHp = Math.min(healHp, player.maxHp - player.hp);
    const restoredMp = Math.min(healMp, player.maxMp - player.mp);
    if (!buffRecipe?.buffEffect && restoredHp <= 0 && restoredMp <= 0) {
      throw new Error('HP và MP đã đầy.');
    }
    slot.quantity = Number(slot.quantity) - 1;
    if (slot.quantity <= 0) inventory.splice(inventory.indexOf(slot), 1);
    player.hp += restoredHp;
    player.mp += restoredMp;

    let appliedBuff: { stat: string; valuePct: number; expiresAt: number } | null = null;
    if (buffRecipe?.buffEffect) {
      if (!player.character.activeBuffs || typeof player.character.activeBuffs !== 'object') {
        player.character.activeBuffs = {};
      }
      const expiresAt = Date.now() + Math.max(30, buffRecipe.buffEffect.durationSec) * 1000;
      const pctBonus = Number(buffRecipe.buffEffect.pctBonus || 0);
      player.character.activeBuffs[`food:${itemId}`] = {
        stat: buffRecipe.buffEffect.stat,
        valuePct: pctBonus,
        expiresAt,
      };
      appliedBuff = {
        stat: buffRecipe.buffEffect.stat,
        valuePct: pctBonus,
        expiresAt,
      };
      this.recomputePlayerStats(player);
    }

    this.persist(player);
    return { itemId, restoredHp, restoredMp, appliedBuff, player: this.snapshot(player) };
  }

  respawn(characterId: string) {
    const player = this.requirePlayer(characterId);
    if (!player.dead) throw new Error('Nhân vật chưa gục.');
    const checkpoint = resolveResurrectionCheckpoint(player.character, player.regionId);
    player.dead = false;
    this.recomputePlayerStats(player);
    player.hp = player.maxHp;
    player.mp = player.maxMp;
    player.regionId = checkpoint.id;
    player.x = checkpoint.spawnX;
    player.y = checkpoint.spawnY;
    player.character.regionId = checkpoint.id;
    player.character.x = checkpoint.spawnX;
    player.character.y = checkpoint.spawnY;
    player.character.latestVillageCheckpointId = checkpoint.id;
    const discovered = new Set<string>(
      Array.isArray(player.character.discoveredVillageIds) ? player.character.discoveredVillageIds : ['THON_KHOI_NGUYEN']
    );
    discovered.add('THON_KHOI_NGUYEN');
    discovered.add(checkpoint.id);
    player.character.discoveredVillageIds = Array.from(discovered);
    player.character.checkpointUpdatedAt = new Date().toISOString();
    this.persist(player);
    this.ensureRegion(player.regionId);
    return this.snapshot(player);
  }

  private mapCollisionCache = new Map<string, { cols: number; rows: number; tileSize: number; grid: number[][] } | null>();
  private lastEliteCheckByRegion = new Map<string, number>();
  private lastEliteRespawnAllowedByRegion = new Map<string, number>();

  private getMapCollision(regionId: string) {
    if (this.mapCollisionCache.has(regionId)) return this.mapCollisionCache.get(regionId)!;
    const slug = regionId === 'THON_KHOI_NGUYEN' || regionId === 'VIL_STARTER' ? 'thon_khoi_nguyen' : regionId;
    const fullPath = path.resolve(ENV.WORLD_DATA_PATH, '../maps', `${slug}.json`);
    if (!fs.existsSync(fullPath)) {
      this.mapCollisionCache.set(regionId, null);
      return null;
    }
    try {
      const parsed = JSON.parse(fs.readFileSync(fullPath, 'utf-8').replace(/^\uFEFF/, ''));
      const grid = parsed?.layers?.collision;
      if (Array.isArray(grid) && grid.length > 0) {
        const entry = {
          cols: Number(parsed.cols || grid[0].length),
          rows: Number(parsed.rows || grid.length),
          tileSize: Number(parsed.tileSize || 48),
          grid,
        };
        this.mapCollisionCache.set(regionId, entry);
        return entry;
      }
    } catch {
      // ignore invalid map JSON
    }
    this.mapCollisionCache.set(regionId, null);
    return null;
  }

  private isWalkableWorldPos(regionId: string, x: number, y: number): boolean {
    const col = this.getMapCollision(regionId);
    if (!col) return x >= 48 && y >= 48 && x <= 2950 && y <= 2950;
    const tx = Math.floor(x / col.tileSize);
    const ty = Math.floor(y / col.tileSize);
    if (tx < 1 || ty < 1 || tx >= col.cols - 1 || ty >= col.rows - 1) return false;
    return col.grid[ty]?.[tx] === 0;
  }

  private pickWalkablePointNear(
    regionId: string,
    originX: number,
    originY: number,
    radius: number,
    indexHint = 0
  ): { x: number; y: number } {
    const baseRadius = Math.max(36, radius);
    const col = this.getMapCollision(regionId);
    const maxW = col ? col.cols * col.tileSize - 64 : 2200;
    const maxH = col ? col.rows * col.tileSize - 64 : 1440;
    for (let attempt = 0; attempt < 14; attempt++) {
      const ringFactor = attempt === 0 && indexHint === 0 ? 0.15 : 0.35 + ((attempt + indexHint) % 7) * 0.12;
      const angle = ((indexHint * 2.39996 + attempt * 0.85) % (Math.PI * 2));
      const r = Math.min(baseRadius * 1.45, Math.max(24, baseRadius * ringFactor));
      const candX = Math.round(clamp(originX + Math.cos(angle) * r, 72, maxW));
      const candY = Math.round(clamp(originY + Math.sin(angle) * r, 72, maxH));
      if (this.isWalkableWorldPos(regionId, candX, candY)) {
        return { x: candX, y: candY };
      }
    }
    return {
      x: Math.round(clamp(originX, 72, maxW)),
      y: Math.round(clamp(originY, 72, maxH)),
    };
  }

  public spawnRandomEliteInRegion(regionId: string, force = false) {
    const normRegion = this.world.normalizeRegionId(regionId);
    if (!isTrainingRegionId(normRegion)) return null;
    this.ensureRegion(normRegion);

    const ops = this.world.getOperationsConfig();
    const eliteCfg = ops.eliteSpawn;
    if (!eliteCfg.enabled && !force) return null;

    const now = Date.now();
    const cooldownUntil = this.lastEliteRespawnAllowedByRegion.get(normRegion) || 0;
    if (!force && now < cooldownUntil) return null;

    const activeElites = [...this.monsters.values()].filter(
      (m) => m.regionId === normRegion && m.alive && m.isRandomElite
    );
    if (activeElites.length >= Math.max(1, eliteCfg.maxActivePerMap)) return null;

    const regionZones = this.spawnPoints.filter(
      (p: any) => p.enabled !== false && (p.regionId || p.region_id) === normRegion
    );
    const candidates = regionZones
      .map((z: any) => ({
        zone: z,
        def: this.monsterDefinitions.find((d) => d.id === (z.monsterId || z.monster_id) && d.enabled !== false),
      }))
      .filter(
        (pair: any) =>
          pair.def &&
          !pair.def.isBoss &&
          !pair.def.isElite &&
          pair.def.category !== 'ELITE' &&
          pair.def.category !== 'MINI_BOSS' &&
          pair.def.category !== 'FIELD_BOSS' &&
          pair.def.category !== 'WORLD_BOSS'
      );
    if (candidates.length === 0) return null;

    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    const def = picked.def;
    const zone = picked.zone;
    const pos = this.pickWalkablePointNear(
      normRegion,
      Number(zone.x || 500),
      Number(zone.y || 500),
      Math.max(80, Number(zone.radius || 110)),
      Math.floor(Math.random() * 12)
    );
    const baseHp = Number(def.hp ?? def.base_stats?.hp ?? 140);
    const maxHp = Math.max(250, Math.round(baseHp * eliteCfg.hpMultiplier));
    const levelMin = Number(zone.levelMin ?? def.levelMin ?? def.level ?? 1);
    const levelMax = Math.max(levelMin, Number(zone.levelMax ?? def.levelMax ?? levelMin)) + 2;
    const level = Math.floor((levelMin + levelMax) / 2);

    const id = 'ELITE_RAND_' + randomUUID();
    const rt: MonsterRuntime = {
      id,
      definitionId: def.id,
      spawnZoneId: zone.id,
      spawnOriginX: pos.x,
      spawnOriginY: pos.y,
      spawnRadius: Math.max(90, Number(zone.radius || 96)),
      regionId: normRegion,
      x: pos.x,
      y: pos.y,
      hp: maxHp,
      maxHp,
      level,
      alive: true,
      lastAttackedAt: 0,
      debuffs: {},
      stunnedUntil: 0,
      activePhase: 1,
      enraged: false,
      aiState: 'IDLE',
      targetCharacterId: null,
      lastPatrolAt: now,
      isRandomElite: true,
      customName: `★ Tinh Anh · ${def.name}`,
      atkMultiplier: eliteCfg.atkMultiplier,
      expMultiplier: eliteCfg.expMultiplier,
      goldMultiplier: eliteCfg.goldMultiplier,
      participants: new Map(),
    };
    this.monsters.set(id, rt);
    return this.publicMonster(rt);
  }

  tick() {
    const now = Date.now();
    const respawned: any[] = [];
    for (const [mid, monster] of this.monsters.entries()) {
      if (monster.alive || !monster.respawnAt || now < monster.respawnAt) continue;
      if (monster.isRandomElite) {
        // Random Elites do not hard-lock slots indefinitely; they re-roll cleanly through spawnRandomEliteInRegion
        this.monsters.delete(mid);
        continue;
      }
      const def = this.monsterDefinitions.find((m) => m.id === monster.definitionId);
      if (!def) continue;
      if (monster.spawnOriginX !== undefined && monster.spawnOriginY !== undefined) {
        const pt = this.pickWalkablePointNear(
          monster.regionId,
          monster.spawnOriginX,
          monster.spawnOriginY,
          Number(monster.spawnRadius || 64),
          Math.floor(Math.random() * 11)
        );
        monster.x = pt.x;
        monster.y = pt.y;
      }
      monster.hp = monster.maxHp;
      monster.alive = true;
      monster.respawnAt = undefined;
      monster.lastAttackedAt = 0;
      monster.activePhase = 1;
      monster.enraged = false;
      monster.aiState = 'IDLE';
      monster.targetCharacterId = null;
      monster.lastTelegraph = undefined;
      monster.settledKillId = undefined;
      monster.participants.clear();
      respawned.push(this.publicMonster(monster));
    }
    return respawned;
  }

  public tickAi(dtMs = 500, forceRegionId?: string) {
    const now = Date.now();
    const dtSec = Math.max(0.1, Math.min(2.0, dtMs / 1000));
    const ops = this.world.getOperationsConfig();
    const activeRegions = new Set<string>();
    if (forceRegionId) activeRegions.add(this.world.normalizeRegionId(forceRegionId));
    for (const p of this.players.values()) {
      if (!p.dead) activeRegions.add(p.regionId);
    }

    const monsterUpdates: any[] = [];
    const monsterAttacks: any[] = [];
    const playerDeaths: Array<{ characterId: string; regionId: string; deathPayload: any; snapshot: CombatSnapshot }> = [];
    const elitesSpawned: any[] = [];

    // Dynamic Random Elite spawn check per occupied training map
    for (const regId of activeRegions) {
      if (!isTrainingRegionId(regId) || !ops.eliteSpawn.enabled) continue;
      const lastCheck = this.lastEliteCheckByRegion.get(regId) || 0;
      if (now - lastCheck >= Math.max(15, ops.eliteSpawn.checkIntervalSec) * 1000) {
        this.lastEliteCheckByRegion.set(regId, now);
        if (Math.random() * 100 < ops.eliteSpawn.spawnChancePct) {
          const spawned = this.spawnRandomEliteInRegion(regId, false);
          if (spawned) elitesSpawned.push(spawned);
        }
      }
    }

    for (const monster of this.monsters.values()) {
      if (!activeRegions.has(monster.regionId)) continue;
      if (!monster.alive) {
        monster.aiState = 'DEATH';
        continue;
      }
      if (this.world.isCombatBlockedRegion(monster.regionId)) continue;

      const def = this.monsterDefinitions.find((m) => m.id === monster.definitionId);
      if (!def) continue;

      // Resolve telegraphed AoE attack when timer expires
      if (monster.lastTelegraph && now >= monster.lastTelegraph.executesAt) {
        const tel = monster.lastTelegraph;
        monster.lastTelegraph = undefined;
        for (const p of this.players.values()) {
          if (p.dead || p.regionId !== monster.regionId) continue;
          if (distance(p.x, p.y, monster.x, monster.y) <= Number(tel.aoeRadius || 120)) {
            const rawTelDmg = Math.round(Number(def.physicalAttack ?? def.atk ?? 14) * Number(monster.atkMultiplier || 1) * 1.35);
            const postDef = Math.max(2, rawTelDmg - Math.floor(p.def * 0.4));
            p.hp = Math.max(0, p.hp - postDef);
            monsterAttacks.push({
              monsterId: monster.id,
              monsterName: monster.customName || def.name,
              regionId: monster.regionId,
              targetCharacterId: p.character.id,
              damage: postDef,
              telegraphName: tel.skillName,
              playerHp: p.hp,
              playerMaxHp: p.maxHp,
              x: monster.x,
              y: monster.y,
            });
            if (p.hp <= 0) {
              const deathPayload = this.applyPlayerDeath(p, monster.customName || def.name, `Trúng kỹ năng ${tel.skillName}`);
              if (deathPayload) {
                playerDeaths.push({
                  characterId: p.character.id,
                  regionId: p.regionId,
                  deathPayload,
                  snapshot: deathPayload.player,
                });
              }
            }
          }
        }
      }

      if (now < (monster.stunnedUntil || 0)) continue;

      const originX = monster.spawnOriginX ?? monster.x;
      const originY = monster.spawnOriginY ?? monster.y;
      const isAggressiveOrBoss = Boolean(
        monster.isRandomElite ||
          def.isBoss ||
          def.isElite ||
          def.aiBehavior === 'aggressive' ||
          def.aiBehavior === 'boss'
      );
      const aggroRange =
        Number(def.aggroRange ?? (monster.isRandomElite ? 230 : def.isBoss ? 250 : 145)) *
        Number(ops.monsterAiAggroScale || 1);
      const attackRange = Number(def.attackRange ?? def.attack_range ?? 76);
      const leashDist = Math.max(220, Number(monster.spawnRadius || 96) * 2.6);
      const baseSpeed = Math.max(40, Math.min(125, Number(def.movementSpeed ?? 78) * (monster.enraged ? 1.25 : 1)));

      if (
        monster.regionId === 'THON_KHOI_NGUYEN' &&
        (def.isBoss || def.isElite || monster.isRandomElite || String(def.id).includes('DARK_DRAGON'))
      ) {
        continue;
      }
      const regionPlayers = [...this.players.values()].filter(
        (p) => !p.dead && p.regionId === monster.regionId && !(p.regionId === 'THON_KHOI_NGUYEN' && p.x <= 1250)
      );
      let target = monster.targetCharacterId
        ? regionPlayers.find((p) => p.character.id === monster.targetCharacterId)
        : undefined;

      if (
        target &&
        (distance(monster.x, monster.y, target.x, target.y) > Math.max(aggroRange * 1.6, leashDist * 1.2) ||
          (now > (monster.aggroUntil || 0) && !isAggressiveOrBoss && distance(monster.x, monster.y, originX, originY) > leashDist * 0.8))
      ) {
        target = undefined;
        monster.targetCharacterId = null;
        if (monster.aiState === 'ATTACK' || monster.aiState === 'CHASE' || monster.aiState === 'DETECT') {
          monster.aiState = 'RETURN';
        }
      }

      if (!target && isAggressiveOrBoss && regionPlayers.length > 0) {
        let bestDist = aggroRange;
        for (const p of regionPlayers) {
          const d = distance(monster.x, monster.y, p.x, p.y);
          if (d <= bestDist) {
            bestDist = d;
            target = p;
          }
        }
        if (target) {
          monster.targetCharacterId = target.character.id;
          monster.aggroUntil = now + 10000;
          if (monster.aiState === 'IDLE' || monster.aiState === 'RETURN') {
            monster.aiState = 'DETECT';
          }
        }
      }

      const distFromOrigin = distance(monster.x, monster.y, originX, originY);
      if (distFromOrigin > leashDist) {
        target = undefined;
        monster.targetCharacterId = null;
        monster.aiState = 'RETURN';
      }

      if (target) {
        const dToPlayer = distance(monster.x, monster.y, target.x, target.y);
        if (dToPlayer <= attackRange) {
          monster.aiState = 'ATTACK';
          const retRes = this.monsterRetaliate(target, monster, def, this.getBossConfig(def.id));
          if (retRes?.hit) {
            monsterAttacks.push({
              monsterId: monster.id,
              monsterName: monster.customName || def.name,
              regionId: monster.regionId,
              targetCharacterId: target.character.id,
              damage: retRes.damage,
              playerHp: target.hp,
              playerMaxHp: target.maxHp,
              x: monster.x,
              y: monster.y,
            });
            if (retRes.deathEvent) {
              playerDeaths.push({
                characterId: target.character.id,
                regionId: target.regionId,
                deathPayload: retRes.deathEvent,
                snapshot: retRes.deathEvent.player,
              });
            }
          }
          if (monster.isRandomElite && !monster.lastTelegraph && (monster.hp / Math.max(1, monster.maxHp)) <= 0.65 && now - (monster.lastTelegraphAt || 0) >= 8500) {
            monster.lastTelegraphAt = now;
            monster.lastTelegraph = {
              skillName: 'Tinh Anh Địa Chấn',
              warningText: `${monster.customName || def.name} chuẩn bị oanh tạc!`,
              aoeRadius: 120,
              executesAt: now + 1800,
              element: def.element || 'shadow',
            };
          }
        } else {
          monster.aiState = 'CHASE';
          const step = baseSpeed * dtSec;
          const nx = Math.round(monster.x + ((target.x - monster.x) / dToPlayer) * step);
          const ny = Math.round(monster.y + ((target.y - monster.y) / dToPlayer) * step);
          if (this.isWalkableWorldPos(monster.regionId, nx, ny)) {
            monster.x = nx;
            monster.y = ny;
          }
        }
        monsterUpdates.push(this.publicMonster(monster));
      } else if (monster.aiState === 'RETURN' || distFromOrigin > Number(monster.spawnRadius || 72) * 1.15) {
        monster.aiState = 'RETURN';
        const dHome = distance(monster.x, monster.y, originX, originY);
        const step = baseSpeed * 1.2 * dtSec;
        if (dHome <= Math.max(16, step)) {
          monster.x = originX;
          monster.y = originY;
          monster.hp = monster.maxHp;
          monster.enraged = false;
          monster.lastTelegraph = undefined;
          monster.aiState = 'IDLE';
        } else {
          const clampedStep = Math.min(dHome, step);
          monster.x = Math.round(monster.x + ((originX - monster.x) / dHome) * clampedStep);
          monster.y = Math.round(monster.y + ((originY - monster.y) / dHome) * clampedStep);
          monster.hp = Math.min(monster.maxHp, monster.hp + Math.max(1, Math.round(monster.maxHp * 0.08)));
        }
        monsterUpdates.push(this.publicMonster(monster));
      } else {
        monster.aiState = 'IDLE';
        if (!monster.lastPatrolAt || now - monster.lastPatrolAt >= 2600) {
          monster.lastPatrolAt = now;
          const wanderPt = this.pickWalkablePointNear(
            monster.regionId,
            originX,
            originY,
            Math.min(72, Number(monster.spawnRadius || 64)),
            Math.floor(Math.random() * 12)
          );
          monster.x = Math.round((monster.x * 2 + wanderPt.x) / 3);
          monster.y = Math.round((monster.y * 2 + wanderPt.y) / 3);
          monsterUpdates.push(this.publicMonster(monster));
        }
      }
    }

    return { monsterUpdates, monsterAttacks, playerDeaths, elitesSpawned };
  }

  public reloadRegion(regionId: string) {
    const norm = this.world.normalizeRegionId(regionId);
    for (const [mid, m] of this.monsters.entries()) {
      if (m.regionId === norm) this.monsters.delete(mid);
    }
    this.initializedRegions.delete(norm);
    this.ensureRegion(norm);
  }

  private ensureRegion(regionId: string) {
    if (this.initializedRegions.has(regionId)) return;
    this.initializedRegions.add(regionId);
    const region = this.world.getMapById(regionId, false);
    if (region && (region.type === 'CITY_SAFE_ZONE' || region.monsterSpawningEnabled === false)) {
      return;
    }
    const ops = this.world.getOperationsConfig();
    const trainingMap = isTrainingRegionId(regionId) && !isSafeVillageId(regionId) && !region?.isSafeZone;
    const points = this.spawnPoints.filter((p: any) => p.enabled !== false && (p.regionId || p.region_id) === regionId);
    let normalSpawnedCount = [...this.monsters.values()].filter(
      (m) => m.regionId === regionId && !m.isRandomElite
    ).length;

    for (const point of points) {
      const monId = point.monsterId || point.monster_id;
      const def = this.monsterDefinitions.find((m) => m.id === monId && m.enabled !== false);
      if (!def) continue;
      const isBossOrFixedElite = Boolean(
        def.isBoss ||
          def.isElite ||
          def.category === 'ELITE' ||
          def.category === 'MINI_BOSS' ||
          def.category === 'FIELD_BOSS' ||
          def.category === 'WORLD_BOSS'
      );
      if (isSafeVillageId(regionId) && (isBossOrFixedElite || String(monId).includes('DARK_DRAGON') || regionId !== 'THON_KHOI_NGUYEN')) {
        continue;
      }
      const existingInZone = [...this.monsters.values()].filter((m) => m.spawnZoneId === point.id && m.alive && !m.isRandomElite).length;
      const baseCap = clamp(Number(point.maxAlive ?? point.max_alive ?? def.maxAlive ?? 1), 1, 12);
      const multiplier = !isBossOrFixedElite && trainingMap ? Math.max(1, ops.normalSpawnMultiplier) : 1;
      const maxCap = Math.min(36, baseCap * multiplier);
      let count = Math.max(0, maxCap - existingInZone);
      if (!isBossOrFixedElite && trainingMap) {
        const remainingMapCap = Math.max(0, ops.maxNormalMonstersPerMap - normalSpawnedCount);
        count = Math.min(count, remainingMapCap);
      }

      for (let i = 0; i < count; i++) {
        const pt = this.pickWalkablePointNear(
          regionId,
          Number(point.x || 500),
          Number(point.y || 500),
          Number(point.radius || 72),
          existingInZone + i
        );
        const baseHp = Number(def.hp ?? def.base_stats?.hp ?? 100);
        const levelMin = Number(point.levelMin ?? point.level_min ?? def.levelMin ?? def.level_min ?? def.level ?? 1);
        const levelMax = Math.max(levelMin, Number(point.levelMax ?? point.level_max ?? def.levelMax ?? def.level_max ?? levelMin));
        const level = Math.floor(levelMin + Math.random() * (levelMax - levelMin + 1));
        const id = 'MOB_' + randomUUID();
        this.monsters.set(id, {
          id,
          definitionId: def.id,
          spawnZoneId: point.id,
          spawnOriginX: Number(point.x || pt.x),
          spawnOriginY: Number(point.y || pt.y),
          spawnRadius: Number(point.radius || 72),
          regionId,
          x: pt.x,
          y: pt.y,
          hp: baseHp,
          maxHp: baseHp,
          level,
          alive: true,
          lastAttackedAt: 0,
          debuffs: {},
          stunnedUntil: 0,
          activePhase: 1,
          enraged: false,
          aiState: 'IDLE',
          targetCharacterId: null,
          lastPatrolAt: Date.now(),
          participants: new Map(),
        });
        if (!isBossOrFixedElite) normalSpawnedCount += 1;
      }
    }
  }

  private requirePlayer(characterId: string) {
    const state = this.players.get(characterId);
    if (!state) throw new Error('Nhân vật chưa tham gia thế giới.');
    return state;
  }

  private persist(state?: PlayerCombatState) {
    if (!state) return;
    const c = state.character;
    c.hp = state.hp;
    c.mp = state.mp;
    c.maxHp = state.maxHp;
    c.maxMp = state.maxMp;
    c.x = state.x;
    c.y = state.y;
    c.regionId = state.regionId;
    c.saveVersion = Number(c.saveVersion || 0) + 1;
    c.lastSavedAt = new Date().toISOString();
    c.updatedAt = c.lastSavedAt;
    this.store.save();
  }
}
