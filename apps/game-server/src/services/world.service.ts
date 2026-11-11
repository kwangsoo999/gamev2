import fs from 'fs';
import path from 'path';
import { ENV } from '../config/env.js';
import {
  DEFAULT_EXP_BALANCE_CONFIG,
  DEFAULT_WORLD_OPERATIONS_CONFIG,
  PROFESSION_ECONOMY_RULES,
  SECOND_JOB_SPECIALIZATIONS,
  INITIAL_SKILLS,
  computeExpRequiredForLevel,
  validateAdminExpConfigInput,
  computeMonsterKillExp,
  simulateProgressionAndFarmingBands,
} from '@elysia/game-data-schema';
import { ExpAdminAuditRecord, ExpBalanceConfig, WorldOperationsConfig } from '@elysia/game-types';

export class WorldService {
  private static instance: WorldService;
  private cache: Record<string, any> = {};

  public static getInstance(): WorldService {
    if (!WorldService.instance) {
      WorldService.instance = new WorldService();
    }
    return WorldService.instance;
  }

  public invalidateCache(relativePath?: string) {
    if (relativePath) {
      delete this.cache[relativePath];
      return;
    }
    this.cache = {};
  }

  public readJson(relativePath: string, fallback: any = []) {
    if (this.cache[relativePath] !== undefined) return this.cache[relativePath];
    const fullPath = path.join(ENV.WORLD_DATA_PATH, relativePath);
    if (!fs.existsSync(fullPath)) return fallback;
    try {
      let raw = fs.readFileSync(fullPath, 'utf-8');
      raw = raw.replace(/^\uFEFF/, '');
      const data = JSON.parse(raw);
      this.cache[relativePath] = data;
      return data;
    } catch (err: any) {
      console.error(`[WorldService] Failed to parse ${relativePath}:`, err.message);
      return fallback;
    }
  }

  public writeJson(relativePath: string, data: any) {
    const fullPath = path.join(ENV.WORLD_DATA_PATH, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    const tempPath = `${fullPath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, fullPath);
    this.cache[relativePath] = data;
  }

  private filterPublished(rows: any[], includeAll = false) {
    if (!Array.isArray(rows)) return [];
    if (includeAll) return rows;
    return rows.filter((r) => !r.status || String(r.status).toLowerCase() === 'published');
  }

  getMaps(includeAll = false) {
    return this.filterPublished(this.readJson('maps.json', []), includeAll);
  }

  getRegions(includeAll = false) {
    const maps = this.getMaps(includeAll);
    if (maps.length > 0) return maps;
    return this.readJson('regions.json', []);
  }

  normalizeRegionId(regionId: string): string {
    return regionId === 'VIL_STARTER' ? 'THON_KHOI_NGUYEN' : regionId;
  }

  getMapById(regionId: string, includeAll = true) {
    const id = this.normalizeRegionId(regionId);
    return this.getRegions(includeAll).find((m: any) => m.id === id) || null;
  }

  isCombatBlockedRegion(regionId: string): boolean {
    const region = this.getMapById(regionId, true);
    if (!region) return false;
    return region.type === 'CITY_SAFE_ZONE' && region.combatEnabled === false;
  }

  getCities(includeAll = false) {
    return this.filterPublished(this.readJson('cities.json', []), includeAll);
  }

  getDungeons(includeAll = false) {
    return this.filterPublished(this.readJson('dungeons.json', []), includeAll);
  }

  getExpTables() {
    return this.readJson('exp_tables.json', []);
  }

  getExpRequired(level: number): number {
    const table = this.getExpTables();
    const row = Array.isArray(table) ? table.find((e: any) => e.level === level) : null;
    return row?.expRequired ?? computeExpRequiredForLevel(level);
  }

  getClasses() {
    return this.readJson('classes.json', []);
  }

  getClassEvolutions() {
    return this.readJson('class_evolutions.json', []);
  }

  getSkills(includeAll = false) {
    const fileSkills = this.readJson('skills.json', []);
    if (!Array.isArray(fileSkills) || fileSkills.length === 0) {
      return this.filterPublished(INITIAL_SKILLS, includeAll);
    }
    const baseMap = new Map<string, any>(INITIAL_SKILLS.map((s) => [s.id, s]));
    const mergedMap = new Map<string, any>();
    for (const fsSkill of fileSkills) {
      const base = baseMap.get(fsSkill.id) || {};
      mergedMap.set(fsSkill.id, {
        ...base,
        ...fsSkill,
        maxLevel: Math.max(Number(fsSkill.maxLevel || 0), Number(base.maxLevel || 10)),
        evolutionMilestones:
          fsSkill.evolutionMilestones && fsSkill.evolutionMilestones.length
            ? fsSkill.evolutionMilestones
            : base.evolutionMilestones,
        executionType: fsSkill.executionType || base.executionType,
        masteryConfig: fsSkill.masteryConfig || base.masteryConfig,
      });
    }
    for (const base of INITIAL_SKILLS) {
      if (!mergedMap.has(base.id)) {
        mergedMap.set(base.id, base);
      }
    }
    return this.filterPublished(Array.from(mergedMap.values()), includeAll);
  }

  getEquipmentSets(includeAll = false) {
    return this.filterPublished(this.readJson('equipment_sets.json', []), includeAll);
  }

  getCraftingRecipes(includeAll = false) {
    return this.filterPublished(this.readJson('crafting_recipes.json', []), includeAll);
  }

  getSetFragments() {
    return this.readJson('set_fragments.json', []);
  }

  getBossConfigs(includeAll = false) {
    return this.filterPublished(this.readJson('boss_configs.json', []), includeAll);
  }

  getWorldConfig() {
    return this.readJson('world_config.json', {});
  }

  getMaxCharactersPerAccount(): number {
    const raw = Number(this.getWorldConfig()?.maxCharactersPerAccount ?? 4);
    return Math.max(1, Math.min(12, Number.isFinite(raw) ? Math.floor(raw) : 4));
  }

  updateWorldConfig(patch: { maxCharactersPerAccount?: number }) {
    const cfg = { ...(this.getWorldConfig() || {}) };
    if (patch.maxCharactersPerAccount !== undefined) {
      const n = Number(patch.maxCharactersPerAccount);
      if (!Number.isInteger(n) || n < 1 || n > 12) {
        throw new Error('Giới hạn số nhân vật mỗi tài khoản phải là số nguyên từ 1 đến 12.');
      }
      cfg.maxCharactersPerAccount = n;
    }
    cfg.updatedAt = new Date().toISOString();
    this.writeJson('world_config.json', cfg);
    return cfg;
  }

  getSecondJobSpecializations() {
    const custom = this.readJson('second_jobs.json', []);
    return Array.isArray(custom) && custom.length > 0 ? custom : SECOND_JOB_SPECIALIZATIONS;
  }

  getConnections() {
    return this.readJson('connections.json', []);
  }

  getMonsters(includeAll = false) {
    return this.filterPublished(this.readJson('monsters.json', []), includeAll);
  }

  getMonsterSkills() {
    return this.readJson('monster_skills.json', []);
  }

  getDropTables(includeAll = false) {
    return this.filterPublished(this.readJson('drop_tables.json', []), includeAll);
  }

  getNpcs() {
    return this.readJson('npcs.json', []);
  }

  getDialogues() {
    return this.readJson('dialogues.json', []);
  }

  getSpawnPoints(includeAll = false) {
    const zones = this.readJson('monster_spawn_zones.json', []);
    const list = Array.isArray(zones) && zones.length > 0 ? zones : this.readJson('spawn_points.json', []);
    return this.filterPublished(list, includeAll);
  }

  getExpBalanceConfig(): ExpBalanceConfig {
    const cfg = this.getWorldConfig();
    const raw = cfg?.expBalanceConfig || {};
    return {
      ...DEFAULT_EXP_BALANCE_CONFIG,
      ...raw,
      levelPenalty: {
        ...DEFAULT_EXP_BALANCE_CONFIG.levelPenalty,
        ...(raw.levelPenalty || {}),
      },
    };
  }

  updateExpBalanceConfig(
    patch: Partial<ExpBalanceConfig>,
    meta?: { actorId?: string; actorRole?: string; note?: string; action?: 'update' | 'toggle' | 'rollback' }
  ): ExpBalanceConfig {
    const check = validateAdminExpConfigInput(patch);
    if (!check.valid) {
      const err: any = new Error(check.error || 'Dữ liệu cấu hình EXP không hợp lệ.');
      err.statusCode = 400;
      throw err;
    }
    const previous = this.getExpBalanceConfig();
    const cfg = { ...(this.getWorldConfig() || {}) };
    const next: ExpBalanceConfig = {
      ...previous,
      ...check.sanitized,
      levelPenalty: {
        ...previous.levelPenalty,
        ...(check.sanitized?.levelPenalty || {}),
      },
      updatedAt: new Date().toISOString(),
    };
    cfg.expBalanceConfig = next;
    this.writeJson('world_config.json', cfg);

    // Record audit & version snapshot
    const history = this.getExpBalanceAuditHistory(200);
    const nextVersion = (history[0]?.version || 0) + 1;
    const record: ExpAdminAuditRecord = {
      id: `EXP_AUDIT_${Date.now()}_${nextVersion}`,
      version: nextVersion,
      actorId: meta?.actorId || 'admin_console',
      actorRole: meta?.actorRole || 'admin',
      action: meta?.action || 'update',
      note: meta?.note || `Cập nhật cấu hình EXP v${nextVersion} (Global=${next.globalMonsterExpMultiplier ?? 0.85})`,
      previousConfig: previous,
      newConfig: next,
      timestamp: next.updatedAt!,
    };
    const nextHistory = [record, ...history].slice(0, 100);
    this.writeJson('exp_balance_audit.json', nextHistory);
    return next;
  }

  getExpBalanceAuditHistory(limit = 50): ExpAdminAuditRecord[] {
    const raw = this.readJson('exp_balance_audit.json', []);
    if (!Array.isArray(raw)) return [];
    return raw.slice(0, Math.max(1, limit));
  }

  rollbackExpBalanceConfig(
    version: number,
    actor?: { actorId?: string; actorRole?: string }
  ): ExpBalanceConfig {
    const history = this.getExpBalanceAuditHistory(200);
    const target = history.find((h) => Number(h.version) === Number(version));
    if (!target) {
      const err: any = new Error(`Không tìm thấy phiên bản cấu hình EXP v${version} để hoàn tác (rollback).`);
      err.statusCode = 404;
      throw err;
    }
    return this.updateExpBalanceConfig(target.previousConfig, {
      actorId: actor?.actorId || 'admin_console',
      actorRole: actor?.actorRole || 'admin',
      action: 'rollback',
      note: `Rollback cấu hình EXP về trạng thái trước v${version}`,
    });
  }

  previewExpBalanceConfig(
    draftPatch: Partial<ExpBalanceConfig>,
    playerLevel = 15,
    partyMemberCount = 1
  ) {
    const merged: ExpBalanceConfig = {
      ...this.getExpBalanceConfig(),
      ...(draftPatch || {}),
      levelPenalty: {
        ...this.getExpBalanceConfig().levelPenalty,
        ...(draftPatch?.levelPenalty || {}),
      },
    };
    const monsters = this.getMonsters(false).slice(0, 40);
    const sampleRows = monsters.map((m: any) => {
      const mLv = Number(m.levelMin || m.level || 1);
      const calc = computeMonsterKillExp({
        baseMonsterExp: Number(m.expReward || 25),
        playerLevel,
        monsterLevel: mLv,
        regionId: m.regionId,
        isBoss: Boolean(m.isBoss),
        isElite: Boolean(m.isElite),
        partyMemberCount,
        config: merged,
      });
      return {
        monsterId: m.id,
        monsterName: m.name,
        regionId: m.regionId,
        monsterLevel: mLv,
        isBoss: Boolean(m.isBoss),
        isElite: Boolean(m.isElite),
        ...calc,
      };
    });
    const progressionSimulations = simulateProgressionAndFarmingBands(merged);
    return {
      previewConfig: merged,
      playerLevel,
      partyMemberCount,
      sampleRows,
      progressionSimulations,
    };
  }

  getQuests(includeAll = false) {
    return this.filterPublished(this.readJson('quests.json', []), includeAll);
  }

  getQuestChains(includeAll = false) {
    return this.filterPublished(this.readJson('quest_chains.json', []), includeAll);
  }

  getUniqueEquipment(includeAll = false) {
    return this.filterPublished(this.readJson('unique_equipment.json', []), includeAll);
  }

  getTitles(includeAll = false) {
    return this.filterPublished(this.readJson('titles.json', []), includeAll);
  }

  getTitleBonusLimits() {
    const cfg = this.getWorldConfig();
    return cfg?.titleBonusLimits || undefined;
  }

  getWorldItems(includeAll = false) {
    return this.filterPublished(this.readJson('world_items.json', []), includeAll);
  }

  readGameDataJson(subPath: string, fallback: any = {}) {
    const key = `gd:${subPath}`;
    if (this.cache[key] !== undefined) return this.cache[key];
    const fullPath = path.join(ENV.GAME_DATA_DIR, subPath);
    if (!fs.existsSync(fullPath)) return fallback;
    try {
      const data = JSON.parse(fs.readFileSync(fullPath, 'utf-8').replace(/^\uFEFF/, ''));
      this.cache[key] = data;
      return data;
    } catch {
      return fallback;
    }
  }

  getEconomyConfig() {
    const base = this.readGameDataJson('professions/profession_economy.json', PROFESSION_ECONOMY_RULES);
    const override = this.getWorldConfig()?.economyConfig || {};
    return { ...PROFESSION_ECONOMY_RULES, ...base, ...override };
  }

  updateEconomyConfig(patch: Partial<typeof PROFESSION_ECONOMY_RULES>) {
    const cfg = { ...(this.getWorldConfig() || {}) };
    cfg.economyConfig = { ...this.getEconomyConfig(), ...patch, updatedAt: new Date().toISOString() };
    this.writeJson('world_config.json', cfg);
    this.invalidateCache();
    return cfg.economyConfig;
  }

  getOperationsConfig(): WorldOperationsConfig {
    const raw = this.getWorldConfig()?.operationsConfig || {};
    return {
      normalSpawnMultiplier: Math.max(1, Math.min(5, Number(raw.normalSpawnMultiplier ?? DEFAULT_WORLD_OPERATIONS_CONFIG.normalSpawnMultiplier))),
      maxNormalMonstersPerMap: Math.max(12, Math.min(180, Number(raw.maxNormalMonstersPerMap ?? DEFAULT_WORLD_OPERATIONS_CONFIG.maxNormalMonstersPerMap))),
      monsterAiAggroScale: Math.max(0.4, Math.min(2.5, Number(raw.monsterAiAggroScale ?? DEFAULT_WORLD_OPERATIONS_CONFIG.monsterAiAggroScale))),
      deathPenalty: {
        ...DEFAULT_WORLD_OPERATIONS_CONFIG.deathPenalty,
        ...(raw.deathPenalty || {}),
        tiers: {
          ...DEFAULT_WORLD_OPERATIONS_CONFIG.deathPenalty.tiers,
          ...(raw.deathPenalty?.tiers || {}),
        },
      },
      eliteSpawn: {
        ...DEFAULT_WORLD_OPERATIONS_CONFIG.eliteSpawn,
        ...(raw.eliteSpawn || {}),
      },
      autoCombat: {
        ...DEFAULT_WORLD_OPERATIONS_CONFIG.autoCombat,
        ...(raw.autoCombat || {}),
      },
    };
  }

  updateOperationsConfig(patch: Partial<WorldOperationsConfig>): WorldOperationsConfig {
    const cfg = { ...(this.getWorldConfig() || {}) };
    const current = this.getOperationsConfig();
    const next: WorldOperationsConfig = {
      normalSpawnMultiplier: Math.max(1, Math.min(5, Number(patch.normalSpawnMultiplier ?? current.normalSpawnMultiplier))),
      maxNormalMonstersPerMap: Math.max(12, Math.min(180, Number(patch.maxNormalMonstersPerMap ?? current.maxNormalMonstersPerMap))),
      monsterAiAggroScale: Math.max(0.4, Math.min(2.5, Number(patch.monsterAiAggroScale ?? current.monsterAiAggroScale))),
      deathPenalty: {
        ...current.deathPenalty,
        ...(patch.deathPenalty || {}),
        tiers: {
          ...current.deathPenalty.tiers,
          ...(patch.deathPenalty?.tiers || {}),
        },
      },
      eliteSpawn: {
        ...current.eliteSpawn,
        ...(patch.eliteSpawn || {}),
      },
      autoCombat: {
        ...current.autoCombat,
        ...(patch.autoCombat || {}),
      },
    };
    cfg.operationsConfig = next;
    cfg.updatedAt = new Date().toISOString();
    this.writeJson('world_config.json', cfg);
    this.invalidateCache();
    return next;
  }
}
