import fs from 'fs';
import path from 'path';
import { ENV } from '../config/env.js';
import { WorldService } from './world.service.js';
import { validateWorldPlacement } from '@elysia/game-data-schema';
import type { NpcPlacementRecord } from '@elysia/game-types';

export type WorldAdminDomain =
  | 'maps'
  | 'monsters'
  | 'spawn_zones'
  | 'cities'
  | 'dungeons'
  | 'quests'
  | 'classes'
  | 'skills'
  | 'equipment_sets'
  | 'boss_configs'
  | 'drop_tables'
  | 'exp_tables'
  | 'crafting_recipes'
  | 'unique_equipment'
  | 'titles'
  | 'quest_chains';

const VALID_ATTRS = ['str', 'dex', 'agi', 'int', 'con'];
const VALID_MONSTER_CATEGORIES = ['NORMAL', 'ELITE', 'MINI_BOSS', 'FIELD_BOSS', 'WORLD_BOSS'];

function validateAssetUrlIfPresent(assetUrl?: string) {
  if (!assetUrl) return;
  if (!assetUrl.startsWith('/assets/')) {
    throw new Error(`Đường dẫn tài nguyên không hợp lệ: ${assetUrl} (phải bắt đầu với /assets/)`);
  }
  const rel = assetUrl.replace(/^\//, '');
  const clientPath = path.resolve(ENV.WORLD_DATA_PATH, '../..', rel);
  const adminPath = path.resolve(ENV.UPLOADS_DIR, '..', rel);
  if (!fs.existsSync(clientPath) && !fs.existsSync(adminPath)) {
    throw new Error(`Tệp hình ảnh tham chiếu không tồn tại trên ổ đĩa: ${assetUrl}`);
  }
}

interface DomainConfig {
  file: string;
  label: string;
  validate: (dto: any, existingId?: string) => void;
  normalize: (dto: any, existing?: any) => any;
}

const DOMAIN_CONFIGS: Record<WorldAdminDomain, DomainConfig> = {
  maps: {
    file: 'maps.json',
    label: 'Bản đồ (Map)',
    validate: (dto) => {
      if (!dto.id || !dto.name) throw new Error('Map bắt buộc phải có id và name.');
      if ((dto.recommendedLevelMin ?? 1) > (dto.recommendedLevelMax ?? 110)) {
        throw new Error('recommendedLevelMin không thể lớn hơn recommendedLevelMax.');
      }
      if (dto.type === 'CITY_SAFE_ZONE' && dto.combatEnabled) {
        throw new Error('Thành phố an toàn (CITY_SAFE_ZONE) không được phép bật chiến đấu.');
      }
    },
    normalize: (dto, existing) => ({
      ...(existing || {}),
      ...dto,
      id: existing?.id || String(dto.id).trim(),
      isSafeZone: dto.type === 'CITY_SAFE_ZONE' ? true : Boolean(dto.isSafeZone ?? existing?.isSafeZone),
      combatEnabled: dto.type === 'CITY_SAFE_ZONE' ? false : Boolean(dto.combatEnabled ?? existing?.combatEnabled ?? true),
      monsterSpawningEnabled: dto.type === 'CITY_SAFE_ZONE' ? false : Boolean(dto.monsterSpawningEnabled ?? existing?.monsterSpawningEnabled ?? true),
      updatedAt: new Date().toISOString(),
    }),
  },
  monsters: {
    file: 'monsters.json',
    label: 'Quái vật (Monster)',
    validate: (dto) => {
      if (!dto.id || !dto.name) throw new Error('Quái vật bắt buộc phải có id và name.');
      if (Number(dto.hp ?? 1) <= 0) throw new Error('HP quái vật phải > 0.');
      if (Number(dto.levelMin ?? 1) > Number(dto.levelMax ?? 1)) {
        throw new Error('levelMin không thể lớn hơn levelMax.');
      }
      if (dto.category && !VALID_MONSTER_CATEGORIES.includes(dto.category)) {
        throw new Error(`Phân loại quái vật không hợp lệ: ${dto.category}`);
      }
    },
    normalize: (dto, existing) => {
      const category = dto.category || existing?.category || (dto.isBoss ? 'FIELD_BOSS' : dto.isElite ? 'ELITE' : 'NORMAL');
      return {
        ...(existing || {}),
        ...dto,
        id: existing?.id || String(dto.id).trim(),
        category,
        isBoss: category === 'MINI_BOSS' || category === 'FIELD_BOSS' || category === 'WORLD_BOSS' ? true : Boolean(dto.isBoss ?? existing?.isBoss),
        isElite: category !== 'NORMAL' ? true : Boolean(dto.isElite ?? existing?.isElite),
        internalName: dto.internalName || existing?.internalName || String(dto.id).toLowerCase(),
        levelMin: Number(dto.levelMin ?? existing?.levelMin ?? 1),
        levelMax: Number(dto.levelMax ?? existing?.levelMax ?? 1),
        hp: Number(dto.hp ?? existing?.hp ?? 100),
        mp: Number(dto.mp ?? existing?.mp ?? 50),
        physicalAttack: Number(dto.physicalAttack ?? existing?.physicalAttack ?? 10),
        physicalDefense: Number(dto.physicalDefense ?? existing?.physicalDefense ?? 5),
        magicalAttack: Number(dto.magicalAttack ?? existing?.magicalAttack ?? 5),
        magicalDefense: Number(dto.magicalDefense ?? existing?.magicalDefense ?? 5),
        agi: Number(dto.agi ?? existing?.agi ?? 10),
        movementSpeed: Number(dto.movementSpeed ?? existing?.movementSpeed ?? 95),
        attackRange: Number(dto.attackRange ?? existing?.attackRange ?? 58),
        expReward: Number(dto.expReward ?? existing?.expReward ?? 25),
        goldReward: Number(dto.goldReward ?? existing?.goldReward ?? 10),
        spawnCount: Number(dto.spawnCount ?? existing?.spawnCount ?? 3),
        respawnTimeSeconds: Number(dto.respawnTimeSeconds ?? existing?.respawnTimeSeconds ?? 10),
        updatedAt: new Date().toISOString(),
      };
    },
  },
  spawn_zones: {
    file: 'monster_spawn_zones.json',
    label: 'Bãi Spawn Quái (Spawn Zone)',
    validate: (dto) => {
      if (!dto.id || !dto.regionId || !dto.monsterId) {
        throw new Error('Spawn Zone bắt buộc có id, regionId và monsterId.');
      }
      if (Number(dto.maxAlive ?? 1) < 1 || Number(dto.respawnTime ?? 1) < 1) {
        throw new Error('maxAlive và respawnTime phải >= 1.');
      }
      if (Number(dto.levelMin ?? 1) > Number(dto.levelMax ?? 1)) {
        throw new Error('levelMin không thể lớn hơn levelMax.');
      }
    },
    normalize: (dto, existing) => {
      const tx = dto.tx !== undefined ? Number(dto.tx) : Math.round(Number(dto.x ?? existing?.x ?? 480) / 48);
      const ty = dto.ty !== undefined ? Number(dto.ty) : Math.round(Number(dto.y ?? existing?.y ?? 480) / 48);
      return {
        ...(existing || {}),
        ...dto,
        id: existing?.id || String(dto.id).trim(),
        tx,
        ty,
        x: dto.x !== undefined ? Number(dto.x) : tx * 48 + 24,
        y: dto.y !== undefined ? Number(dto.y) : ty * 48 + 24,
        radius: Math.max(24, Number(dto.radius ?? existing?.radius ?? 96)),
        maxAlive: Math.max(1, Number(dto.maxAlive ?? existing?.maxAlive ?? 3)),
        respawnTime: Math.max(2, Number(dto.respawnTime ?? existing?.respawnTime ?? 8)),
        levelMin: Number(dto.levelMin ?? existing?.levelMin ?? 1),
        levelMax: Number(dto.levelMax ?? existing?.levelMax ?? 1),
        enabled: dto.enabled !== undefined ? Boolean(dto.enabled) : existing?.enabled !== false,
        updatedAt: new Date().toISOString(),
      };
    },
  },
  exp_tables: {
    file: 'exp_tables.json',
    label: 'Bảng Cấp Độ EXP (EXP Table)',
    validate: (dto) => {
      const lv = Number(dto.level ?? dto.id);
      if (!Number.isFinite(lv) || lv < 1 || lv > 200) {
        throw new Error('Cấp độ EXP Table phải nằm trong khoảng 1–200.');
      }
      if (Number(dto.expRequired ?? 1) < 1) {
        throw new Error('expRequired phải >= 1.');
      }
    },
    normalize: (dto, existing) => {
      const lv = Number(existing?.level ?? dto.level ?? dto.id);
      return {
        ...(existing || {}),
        ...dto,
        id: String(lv),
        level: lv,
        expRequired: Math.max(1, Number(dto.expRequired ?? existing?.expRequired ?? 100)),
        cumulativeExp: Math.max(0, Number(dto.cumulativeExp ?? existing?.cumulativeExp ?? 0)),
        updatedAt: new Date().toISOString(),
      };
    },
  },
  cities: {
    file: 'cities.json',
    label: 'Thành phố (City)',
    validate: (dto) => {
      if (!dto.id || !dto.name) throw new Error('Thành phố bắt buộc phải có id và name.');
    },
    normalize: (dto, existing) => ({
      ...(existing || {}),
      ...dto,
      id: existing?.id || String(dto.id).trim(),
      isSafeZone: true,
      combatEnabled: false,
      monsterSpawningEnabled: false,
      recommendedLevelMin: Number(dto.recommendedLevelMin ?? existing?.recommendedLevelMin ?? 15),
      recommendedLevelMax: Number(dto.recommendedLevelMax ?? existing?.recommendedLevelMax ?? 35),
      requiredLevel: Number(dto.requiredLevel ?? existing?.requiredLevel ?? 15),
      updatedAt: new Date().toISOString(),
    }),
  },
  dungeons: {
    file: 'dungeons.json',
    label: 'Phó bản (Dungeon)',
    validate: (dto) => {
      if (!dto.id || !dto.name) throw new Error('Phó bản bắt buộc phải có id và name.');
      if (Number(dto.requiredLevel ?? 15) < 1) throw new Error('Cấp yêu cầu phó bản không hợp lệ.');
    },
    normalize: (dto, existing) => ({
      ...(existing || {}),
      ...dto,
      id: existing?.id || String(dto.id).trim(),
      requiredLevel: Number(dto.requiredLevel ?? existing?.requiredLevel ?? 15),
      allowRewardRepeat: Boolean(dto.allowRewardRepeat ?? existing?.allowRewardRepeat ?? false),
      floors: Array.isArray(dto.floors) ? dto.floors : (existing?.floors || []),
      updatedAt: new Date().toISOString(),
    }),
  },
  quests: {
    file: 'quests.json',
    label: 'Nhiệm vụ (Quest)',
    validate: (dto) => {
      if (!dto.id || !dto.name) throw new Error('Nhiệm vụ bắt buộc phải có id và name.');
    },
    normalize: (dto, existing) => ({
      ...(existing || {}),
      ...dto,
      id: existing?.id || String(dto.id).trim(),
      requiredLevel: Number(dto.requiredLevel ?? existing?.requiredLevel ?? 1),
      repeatable: Boolean(dto.repeatable ?? existing?.repeatable ?? false),
      objectives: Array.isArray(dto.objectives) ? dto.objectives : (existing?.objectives || []),
      rewards: dto.rewards || existing?.rewards || { exp: 100, gold: 100, items: [] },
      updatedAt: new Date().toISOString(),
    }),
  },
  classes: {
    file: 'classes.json',
    label: 'Nghề Nghiệp (Class)',
    validate: (dto) => {
      if (!dto.id || !dto.name) throw new Error('Nghề nghiệp bắt buộc phải có id và name.');
      if (!dto.isPreJob) {
        if (!VALID_ATTRS.includes(dto.primaryAttribute)) {
          throw new Error(`primaryAttribute phải là một trong: ${VALID_ATTRS.join(', ')}`);
        }
        if (!VALID_ATTRS.includes(dto.secondaryAttribute)) {
          throw new Error(`secondaryAttribute phải là một trong: ${VALID_ATTRS.join(', ')}`);
        }
        const pMult = Number(dto.classificationMultiplier?.primary ?? 2);
        const sMult = Number(dto.classificationMultiplier?.secondary ?? 1);
        if (pMult <= 0 || sMult < 0) {
          throw new Error('Hệ số phân loại nghề phải lớn hơn 0.');
        }
      }
      validateAssetUrlIfPresent(dto.artworkUrl);
      validateAssetUrlIfPresent(dto.weaponArtworkUrl);
    },
    normalize: (dto, existing) => ({
      ...(existing || {}),
      ...dto,
      id: existing?.id || String(dto.id).trim(),
      priorityRank: dto.isPreJob ? undefined : Number(dto.priorityRank ?? existing?.priorityRank ?? 9),
      classificationMultiplier: dto.isPreJob
        ? undefined
        : {
            primary: Number(dto.classificationMultiplier?.primary ?? existing?.classificationMultiplier?.primary ?? 2),
            secondary: Number(dto.classificationMultiplier?.secondary ?? existing?.classificationMultiplier?.secondary ?? 1),
          },
      allowedWeapons: Array.isArray(dto.allowedWeapons) ? dto.allowedWeapons : (existing?.allowedWeapons || []),
      startingSkills: Array.isArray(dto.startingSkills) ? dto.startingSkills : (existing?.startingSkills || []),
      starterEquipment: dto.starterEquipment || existing?.starterEquipment,
      updatedAt: new Date().toISOString(),
    }),
  },
  skills: {
    file: 'skills.json',
    label: 'Kỹ Năng (Skill)',
    validate: (dto) => {
      if (!dto.id || !dto.name) throw new Error('Kỹ năng bắt buộc phải có id và name.');
      if (Number(dto.mpCost ?? 0) < 0 || Number(dto.cooldown ?? 0) < 0) {
        throw new Error('MP cost và Cooldown không được âm.');
      }
      validateAssetUrlIfPresent(dto.iconUrl);
      validateAssetUrlIfPresent(dto.vfxUrl);
    },
    normalize: (dto, existing) => ({
      ...(existing || {}),
      ...dto,
      id: existing?.id || String(dto.id).trim(),
      classId: dto.classId || existing?.classId || 'swordsman',
      jobRestriction: dto.jobRestriction || dto.classId || existing?.jobRestriction || 'swordsman',
      requiredLevel: Number(dto.requiredLevel ?? existing?.requiredLevel ?? 15),
      mpCost: Number(dto.mpCost ?? dto.manaCost ?? existing?.mpCost ?? 15),
      manaCost: Number(dto.mpCost ?? dto.manaCost ?? existing?.manaCost ?? 15),
      cooldown: Number(dto.cooldown ?? existing?.cooldown ?? 3),
      castTime: Number(dto.castTime ?? existing?.castTime ?? 0.25),
      range: Number(dto.range ?? existing?.range ?? 110),
      damageMultiplier: Number(dto.damageMultiplier ?? existing?.damageMultiplier ?? 1.5),
      healMultiplier: dto.healMultiplier !== undefined ? Number(dto.healMultiplier) : existing?.healMultiplier,
      maxLevel: Number(dto.maxLevel ?? existing?.maxLevel ?? 5),
      updatedAt: new Date().toISOString(),
    }),
  },
  equipment_sets: {
    file: 'equipment_sets.json',
    label: 'Bộ Trang Bị (Equipment Set)',
    validate: (dto) => {
      if (!dto.id || !dto.name) throw new Error('Equipment Set bắt buộc phải có id và name.');
    },
    normalize: (dto, existing) => ({
      ...(existing || {}),
      ...dto,
      id: existing?.id || String(dto.id).trim(),
      tierLevel: Number(dto.tierLevel ?? existing?.tierLevel ?? 15),
      pieceItemIds: Array.isArray(dto.pieceItemIds) ? dto.pieceItemIds : (existing?.pieceItemIds || []),
      bonusTiers: Array.isArray(dto.bonusTiers) ? dto.bonusTiers : (existing?.bonusTiers || []),
      updatedAt: new Date().toISOString(),
    }),
  },
  boss_configs: {
    file: 'boss_configs.json',
    label: 'Cấu Hình Boss (Boss Encounter)',
    validate: (dto) => {
      if (!(dto.id || dto.monsterId) || !dto.bossName) {
        throw new Error('Cấu hình Boss bắt buộc phải có monsterId và bossName.');
      }
      validateAssetUrlIfPresent(dto.portraitUrl);
    },
    normalize: (dto, existing) => {
      const mid = existing?.monsterId || String(dto.monsterId || dto.id).trim();
      return {
        ...(existing || {}),
        ...dto,
        id: existing?.id || String(dto.id || mid),
        monsterId: mid,
        respawnTimeSeconds: Number(dto.respawnTimeSeconds ?? existing?.respawnTimeSeconds ?? 300),
        pityThresholdKills: Number(dto.pityThresholdKills ?? existing?.pityThresholdKills ?? 5),
        phases: Array.isArray(dto.phases) ? dto.phases : (existing?.phases || []),
        partyRules: dto.partyRules || existing?.partyRules,
        updatedAt: new Date().toISOString(),
      };
    },
  },
  drop_tables: {
    file: 'drop_tables.json',
    label: 'Bảng Rơi Đồ (Drop Table)',
    validate: (dto) => {
      if (!(dto.tableId || dto.id) || !dto.monsterId) {
        throw new Error('Drop Table bắt buộc phải có tableId và monsterId.');
      }
    },
    normalize: (dto, existing) => {
      const tid = existing?.tableId || String(dto.tableId || dto.id).trim();
      return {
        ...(existing || {}),
        ...dto,
        id: tid,
        tableId: tid,
        drops: Array.isArray(dto.drops) ? dto.drops : (existing?.drops || []),
        updatedAt: new Date().toISOString(),
      };
    },
  },
  crafting_recipes: {
    file: 'crafting_recipes.json',
    label: 'Công Thức Chế Tác (Recipe)',
    validate: (dto) => {
      if (!dto.id || !dto.outputItemId) throw new Error('Công thức chế tác bắt buộc có id và outputItemId.');
    },
    normalize: (dto, existing) => ({
      ...(existing || {}),
      ...dto,
      id: existing?.id || String(dto.id).trim(),
      goldCost: Math.max(0, Number(dto.goldCost ?? existing?.goldCost ?? 0)),
      outputQuantity: Math.max(1, Number(dto.outputQuantity ?? existing?.outputQuantity ?? 1)),
      requiredLevel: Math.max(1, Number(dto.requiredLevel ?? existing?.requiredLevel ?? 1)),
      materials: Array.isArray(dto.materials) ? dto.materials : (existing?.materials || []),
      updatedAt: new Date().toISOString(),
    }),
  },
  unique_equipment: {
    file: 'unique_equipment.json',
    label: 'Trang Bị Độc Nhất (Unique Equipment)',
    validate: (dto) => {
      if (!dto.id || !dto.name) throw new Error('Unique Equipment bắt buộc có id và name.');
    },
    normalize: (dto, existing) => ({
      ...(existing || {}),
      ...dto,
      id: existing?.id || String(dto.id).trim(),
      itemId: existing?.itemId || String(dto.id).trim(),
      isUnique: true,
      nonRepeatable: true,
      passiveEffects: Array.isArray(dto.passiveEffects) ? dto.passiveEffects : (existing?.passiveEffects || []),
      updatedAt: new Date().toISOString(),
    }),
  },
  titles: {
    file: 'titles.json',
    label: 'Danh Hiệu Vĩnh Viễn (Permanent Title)',
    validate: (dto) => {
      if (!dto.id || !dto.name) throw new Error('Title bắt buộc có id và name.');
    },
    normalize: (dto, existing) => ({
      ...(existing || {}),
      ...dto,
      id: existing?.id || String(dto.id).trim(),
      isCosmeticOnlyOnEquip: true,
      nonRepeatable: true,
      statBonuses: dto.statBonuses || existing?.statBonuses || {},
      unlockConditions: dto.unlockConditions || existing?.unlockConditions || {},
      updatedAt: new Date().toISOString(),
    }),
  },
  quest_chains: {
    file: 'quest_chains.json',
    label: 'Chuỗi Nhiệm Vụ (Quest Chain)',
    validate: (dto) => {
      if (!dto.id || !dto.name) throw new Error('Quest Chain bắt buộc có id và name.');
    },
    normalize: (dto, existing) => ({
      ...(existing || {}),
      ...dto,
      id: existing?.id || String(dto.id).trim(),
      quests: Array.isArray(dto.quests) ? dto.quests : (existing?.quests || []),
      updatedAt: new Date().toISOString(),
    }),
  },
};

export class WorldAdminService {
  private world = WorldService.getInstance();

  private config(domain: WorldAdminDomain): DomainConfig {
    const cfg = DOMAIN_CONFIGS[domain];
    if (!cfg) throw new Error(`Domain không hợp lệ: ${domain}`);
    return cfg;
  }

  private readAll(domain: WorldAdminDomain): any[] {
    const cfg = this.config(domain);
    const data = this.world.readJson(cfg.file, []);
    return Array.isArray(data) ? data : [];
  }

  private saveAll(domain: WorldAdminDomain, list: any[]) {
    const cfg = this.config(domain);
    this.world.writeJson(cfg.file, list);
    if (domain === 'spawn_zones') {
      this.world.writeJson('spawn_points.json', list);
    } else if (domain === 'boss_configs') {
      this.world.writeJson('boss_config.json', list);
    }
  }

  private matchesId(row: any, targetId: string): boolean {
    const key = row.id ?? row.tableId ?? row.level;
    return key !== undefined && String(key) === String(targetId);
  }

  private readVersionsMap(): Record<string, Array<{ version: number; timestamp: string; note: string; snapshot: any }>> {
    const raw = this.world.readJson('world_versions.json', {});
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  }

  private appendVersionSnapshot(domain: WorldAdminDomain, id: string, record: any, note: string) {
    const key = `${domain}:${id}`;
    const map = this.readVersionsMap();
    const list = Array.isArray(map[key]) ? map[key] : [];
    const nextVer = (list.length > 0 ? Number(list[list.length - 1].version || list.length) : 0) + 1;
    record.version = nextVer;
    list.push({
      version: nextVer,
      timestamp: new Date().toISOString(),
      note,
      snapshot: JSON.parse(JSON.stringify(record)),
    });
    // Keep up to 25 recent snapshots per entity
    map[key] = list.slice(-25);
    this.world.writeJson('world_versions.json', map);
  }

  public getVersions(domain: WorldAdminDomain, id: string) {
    const key = `${domain}:${id}`;
    const list = this.readVersionsMap()[key] || [];
    return [...list].reverse();
  }

  public rollback(domain: WorldAdminDomain, id: string, targetVersion: number) {
    const cfg = this.config(domain);
    const key = `${domain}:${id}`;
    const history = this.readVersionsMap()[key] || [];
    const entry = history.find((v) => Number(v.version) === Number(targetVersion));
    if (!entry) {
      throw new Error(`Không tìm thấy phiên bản v${targetVersion} cho ${cfg.label} "${id}".`);
    }
    const list = this.readAll(domain);
    const idx = list.findIndex((r) => this.matchesId(r, id));
    const restored = cfg.normalize(JSON.parse(JSON.stringify(entry.snapshot)));
    restored.updatedAt = new Date().toISOString();
    this.appendVersionSnapshot(domain, id, restored, `Rollback to v${targetVersion}`);
    if (idx >= 0) {
      list[idx] = restored;
    } else {
      list.push(restored);
    }
    this.saveAll(domain, list);
    return restored;
  }

  public list(domain: WorldAdminDomain, filters: { search?: string; status?: string; regionId?: string; hubId?: string; classId?: string; category?: string; page?: number; limit?: number } = {}) {
    let list = this.readAll(domain);

    if (filters.status && filters.status !== 'all') {
      const target = filters.status.toLowerCase();
      list = list.filter((row) => String(row.status || 'published').toLowerCase() === target);
    }
    if (filters.regionId && filters.regionId !== 'all') {
      list = list.filter((row) => row.regionId === filters.regionId || row.id === filters.regionId);
    }
    if (filters.hubId && filters.hubId !== 'all') {
      list = list.filter((row) => row.hubId === filters.hubId || row.regionHub === filters.hubId);
    }
    if (filters.classId && filters.classId !== 'all') {
      list = list.filter((row) => row.classId === filters.classId || row.jobRestriction === filters.classId);
    }
    if (filters.category && filters.category !== 'all') {
      list = list.filter((row) => row.category === filters.category);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter((row) =>
        `${row.id || row.tableId || ''} ${row.name || row.bossName || ''} ${row.nameVi || ''} ${row.internalName || ''} ${row.regionId || ''} ${row.classId || ''} ${row.monsterId || ''}`.toLowerCase().includes(q)
      );
    }

    const total = list.length;
    const limit = Math.max(1, Number(filters.limit || 200));
    const page = Math.max(1, Number(filters.page || 1));
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    return {
      items: list.slice(start, start + limit),
      meta: { total, page, limit, totalPages },
    };
  }

  public getById(domain: WorldAdminDomain, id: string) {
    return this.readAll(domain).find((row) => this.matchesId(row, id)) || null;
  }

  public create(domain: WorldAdminDomain, dto: any) {
    const cfg = this.config(domain);
    cfg.validate(dto);
    const list = this.readAll(domain);
    const newId = String(dto.id || dto.tableId || dto.monsterId).trim();
    if (list.some((r) => this.matchesId(r, newId))) {
      throw new Error(`${cfg.label} với ID "${newId}" đã tồn tại.`);
    }
    const now = new Date().toISOString();
    const record = {
      ...cfg.normalize(dto),
      status: dto.status || 'draft',
      createdAt: now,
      updatedAt: now,
    };
    this.appendVersionSnapshot(domain, newId, record, 'Created record');
    list.push(record);
    this.saveAll(domain, list);
    return record;
  }

  public update(domain: WorldAdminDomain, id: string, dto: any) {
    const cfg = this.config(domain);
    const list = this.readAll(domain);
    const idx = list.findIndex((r) => this.matchesId(r, id));
    if (idx < 0) throw new Error(`Không tìm thấy ${cfg.label} "${id}".`);
    const next = cfg.normalize(dto, list[idx]);
    cfg.validate(next, id);
    this.appendVersionSnapshot(domain, id, next, 'Updated attributes');
    list[idx] = next;
    this.saveAll(domain, list);
    return next;
  }

  public duplicate(domain: WorldAdminDomain, id: string) {
    const cfg = this.config(domain);
    const list = this.readAll(domain);
    const src = list.find((r) => this.matchesId(r, id));
    if (!src) throw new Error(`Không tìm thấy ${cfg.label} "${id}".`);
    const baseId = src.id || src.tableId || id;
    const copyId = `${baseId}_copy_${Date.now().toString().slice(-4)}`;
    const now = new Date().toISOString();
    const copy = {
      ...JSON.parse(JSON.stringify(src)),
      id: copyId,
      ...(src.tableId ? { tableId: copyId } : {}),
      name: `${src.name || src.bossName || baseId} (Copy)`,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    };
    this.appendVersionSnapshot(domain, copyId, copy, `Duplicated from ${baseId}`);
    list.push(copy);
    this.saveAll(domain, list);
    return copy;
  }

  public transitionStatus(domain: WorldAdminDomain, id: string, status: 'draft' | 'testing' | 'published' | 'archived') {
    const cfg = this.config(domain);
    const list = this.readAll(domain);
    const idx = list.findIndex((r) => this.matchesId(r, id));
    if (idx < 0) throw new Error(`Không tìm thấy ${cfg.label} "${id}".`);
    cfg.validate(list[idx], id);
    const updated = {
      ...list[idx],
      status,
      updatedAt: new Date().toISOString(),
    };
    this.appendVersionSnapshot(domain, id, updated, `Transition -> ${status}`);
    list[idx] = updated;
    this.saveAll(domain, list);
    return list[idx];
  }

  public remove(domain: WorldAdminDomain, id: string) {
    const cfg = this.config(domain);
    const list = this.readAll(domain);
    const idx = list.findIndex((r) => this.matchesId(r, id));
    if (idx < 0) throw new Error(`Không tìm thấy ${cfg.label} "${id}".`);
    const [removed] = list.splice(idx, 1);
    this.saveAll(domain, list);
    return removed;
  }

  private resolveClientMapsDir(): string {
    return path.resolve(ENV.WORLD_DATA_PATH, '../maps');
  }

  private resolveClientProfessionsFile(): string {
    return path.resolve(ENV.WORLD_DATA_PATH, '../professions/profession_npcs.json');
  }

  private resolveRepoProfessionsFile(): string {
    return path.resolve(ENV.WORLD_DATA_PATH, '../../../../game-data/professions/profession_npcs.json');
  }

  private loadAllMapDocs(): Record<string, any> {
    const mapsDir = this.resolveClientMapsDir();
    const out: Record<string, any> = {};
    if (!fs.existsSync(mapsDir)) return out;
    for (const file of fs.readdirSync(mapsDir)) {
      if (!file.endsWith('.json')) continue;
      try {
        const parsed = JSON.parse(fs.readFileSync(path.join(mapsDir, file), 'utf-8').replace(/^\uFEFF/, ''));
        if (parsed?.id) {
          out[parsed.id] = { ...parsed, __fileName: file };
        }
      } catch {
        // skip invalid json
      }
    }
    return out;
  }

  private readMasterNpcs(): NpcPlacementRecord[] {
    const file = path.join(ENV.WORLD_DATA_PATH, 'npcs.json');
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, 'utf-8').replace(/^\uFEFF/, ''));
  }

  private readProfessionNpcs(): any[] {
    const file = this.resolveClientProfessionsFile();
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, 'utf-8').replace(/^\uFEFF/, ''));
  }

  public getWorldLayoutSnapshot() {
    const mapsById = this.loadAllMapDocs();
    const npcs = this.readMasterNpcs();
    const profNpcs = this.readProfessionNpcs();
    const validation = validateWorldPlacement(mapsById, npcs, profNpcs);
    const maps = Object.values(mapsById).map((m: any) => ({
      id: m.id,
      name: m.name,
      subtitle: m.subtitle,
      cols: m.cols,
      rows: m.rows,
      tileSize: m.tileSize || 48,
      isSafeZone: Boolean(m.isSafeZone),
      buildings: (m.layers?.objects || []).filter(
        (o: any) =>
          o.type.includes('house') ||
          o.type.includes('shop') ||
          o.type.includes('cathedral') ||
          o.type.includes('torii') ||
          o.type.includes('fountain') ||
          o.type.includes('stall') ||
          o.type.includes('cave') ||
          o.type.includes('altar') ||
          o.type.includes('waterwheel')
      ),
      exits: m.exits || [],
      collision: m.layers?.collision || [],
      ground: m.layers?.ground || [],
      playerSpawn: m.spawns?.player || { tx: 12, ty: 16 },
    }));
    return { maps, npcs, profNpcs, validation };
  }

  public validateWorldLayout() {
    const mapsById = this.loadAllMapDocs();
    const npcs = this.readMasterNpcs();
    const profNpcs = this.readProfessionNpcs();
    return validateWorldPlacement(mapsById, npcs, profNpcs);
  }

  public updateNpcPlacement(npcId: string, dto: Partial<NpcPlacementRecord>) {
    const mapsById = this.loadAllMapDocs();
    const npcs = this.readMasterNpcs();
    const profNpcs = this.readProfessionNpcs();
    const idx = npcs.findIndex((n) => n.id === npcId);
    if (idx < 0) throw new Error(`Không tìm thấy NPC "${npcId}".`);

    const prev = npcs[idx];
    const nextTx = dto.tx !== undefined ? Math.round(Number(dto.tx)) : prev.tx;
    const nextTy = dto.ty !== undefined ? Math.round(Number(dto.ty)) : prev.ty;
    const updated: NpcPlacementRecord = {
      ...prev,
      ...dto,
      id: prev.id,
      regionId: dto.regionId || prev.regionId,
      tx: nextTx,
      ty: nextTy,
      x: nextTx * 48 + 24,
      y: nextTy * 48 + 24,
      interactionRadius: Math.max(48, Number(dto.interactionRadius ?? prev.interactionRadius ?? 92)),
      direction: (dto.direction || prev.direction || 'south') as any,
    };

    const nextNpcs = [...npcs];
    nextNpcs[idx] = updated;
    const nextProfNpcs = profNpcs.map((pn) =>
      pn.id === npcId ? { ...pn, mapId: updated.regionId, tx: updated.tx, ty: updated.ty } : pn
    );

    const report = validateWorldPlacement(mapsById, nextNpcs, nextProfNpcs);
    const blockingForNpc = report.issues.filter((i) => i.severity === 'error' && i.entityId === npcId);
    if (blockingForNpc.length > 0) {
      const err: any = new Error(blockingForNpc.map((i) => i.message).join(' '));
      err.statusCode = 400;
      err.validation = report;
      throw err;
    }

    // Persist to npcs.json, profession_npcs.json, and matching map spawns.npcs
    fs.writeFileSync(path.join(ENV.WORLD_DATA_PATH, 'npcs.json'), `${JSON.stringify(nextNpcs, null, 2)}\n`, 'utf-8');
    if (nextProfNpcs.some((pn) => pn.id === npcId)) {
      const profPayload = `${JSON.stringify(nextProfNpcs, null, 2)}\n`;
      fs.writeFileSync(this.resolveClientProfessionsFile(), profPayload, 'utf-8');
      if (fs.existsSync(path.dirname(this.resolveRepoProfessionsFile()))) {
        fs.writeFileSync(this.resolveRepoProfessionsFile(), profPayload, 'utf-8');
      }
    }

    for (const mapDoc of Object.values(mapsById) as any[]) {
      const filePath = path.join(this.resolveClientMapsDir(), mapDoc.__fileName);
      const { __fileName, ...cleanDoc } = mapDoc;
      const list: any[] = cleanDoc.spawns?.npcs || [];
      const existingInMap = list.findIndex((n: any) => n.id === npcId);
      let dirty = false;
      if (cleanDoc.id === updated.regionId) {
        const entry = {
          id: updated.id,
          name: updated.name,
          role: updated.role,
          district: updated.district,
          serviceType: updated.serviceType,
          associatedBuildingId: updated.associatedBuildingId,
          direction: updated.direction,
          interactionRadius: updated.interactionRadius,
          movementBehavior: updated.movementBehavior,
          idleAnimation: updated.idleAnimation,
          dialogueId: updated.dialogueId,
          spriteId: updated.spriteId,
          tx: updated.tx,
          ty: updated.ty,
          x: updated.x,
          y: updated.y,
          dialogue: updated.dialogue,
        };
        if (existingInMap >= 0) list[existingInMap] = { ...list[existingInMap], ...entry };
        else if (!nextProfNpcs.some((pn) => pn.id === updated.id)) list.push(entry);
        dirty = true;
      } else if (existingInMap >= 0) {
        list.splice(existingInMap, 1);
        dirty = true;
      }
      if (dirty) {
        fs.writeFileSync(filePath, `${JSON.stringify(cleanDoc, null, 2)}\n`, 'utf-8');
      }
    }

    WorldService.getInstance().invalidateCache();
    return { npc: updated, validation: report };
  }

  public updatePortalPlacement(portalId: string, dto: { tx?: number; ty?: number; targetTx?: number; targetTy?: number; direction?: string; name?: string; requiredLevel?: number }) {
    const mapsById = this.loadAllMapDocs();
    const connsFile = path.join(ENV.WORLD_DATA_PATH, 'connections.json');
    const conns: any[] = fs.existsSync(connsFile)
      ? JSON.parse(fs.readFileSync(connsFile, 'utf-8').replace(/^\uFEFF/, ''))
      : [];

    let foundMap: any = null;
    let exitIdx = -1;
    for (const m of Object.values(mapsById) as any[]) {
      const idx = (m.exits || []).findIndex((e: any) => e.id === portalId);
      if (idx >= 0) {
        foundMap = m;
        exitIdx = idx;
        break;
      }
    }
    if (!foundMap || exitIdx < 0) throw new Error(`Không tìm thấy Cổng "${portalId}".`);

    const prev = foundMap.exits[exitIdx];
    const nextExit = {
      ...prev,
      tx: dto.tx !== undefined ? Math.round(Number(dto.tx)) : prev.tx,
      ty: dto.ty !== undefined ? Math.round(Number(dto.ty)) : prev.ty,
      targetTx: dto.targetTx !== undefined ? Math.round(Number(dto.targetTx)) : prev.targetTx,
      targetTy: dto.targetTy !== undefined ? Math.round(Number(dto.targetTy)) : prev.targetTy,
      direction: dto.direction || prev.direction,
      name: dto.name || prev.name,
      requiredLevel: dto.requiredLevel !== undefined ? Math.max(1, Number(dto.requiredLevel)) : prev.requiredLevel,
    };
    foundMap.exits[exitIdx] = nextExit;

    const npcs = this.readMasterNpcs();
    const profNpcs = this.readProfessionNpcs();
    const report = validateWorldPlacement(mapsById, npcs, profNpcs);
    const blocking = report.issues.filter((i) => i.severity === 'error' && i.entityId === portalId);
    if (blocking.length > 0) {
      const err: any = new Error(blocking.map((i) => i.message).join(' '));
      err.statusCode = 400;
      err.validation = report;
      throw err;
    }

    const { __fileName, ...cleanMap } = foundMap;
    fs.writeFileSync(path.join(this.resolveClientMapsDir(), __fileName), `${JSON.stringify(cleanMap, null, 2)}\n`, 'utf-8');

    const cIdx = conns.findIndex((c) => c.id === portalId);
    if (cIdx >= 0) {
      conns[cIdx] = {
        ...conns[cIdx],
        portalTx: nextExit.tx,
        portalTy: nextExit.ty,
        portalX: nextExit.tx * 48 + 24,
        portalY: nextExit.ty * 48 + 24,
        targetTx: nextExit.targetTx,
        targetTy: nextExit.targetTy,
        targetX: Number(nextExit.targetTx || 10) * 48 + 24,
        targetY: Number(nextExit.targetTy || 10) * 48 + 24,
        direction: nextExit.direction,
        name: nextExit.name,
        requiredLevel: nextExit.requiredLevel,
      };
      fs.writeFileSync(connsFile, `${JSON.stringify(conns, null, 2)}\n`, 'utf-8');
    }

    WorldService.getInstance().invalidateCache();
    return { portal: nextExit, validation: report };
  }

  public resetApprovedWorldLayout() {
    const baselinePath = path.join(ENV.WORLD_DATA_PATH, 'approved_layout_baseline.json');
    if (!fs.existsSync(baselinePath)) {
      throw new Error('Chưa tìm thấy tệp cấu hình bố cục chuẩn approved_layout_baseline.json.');
    }
    const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf-8').replace(/^\uFEFF/, ''));
    const nextNpcs: NpcPlacementRecord[] = baseline.npcs || [];
    fs.writeFileSync(path.join(ENV.WORLD_DATA_PATH, 'npcs.json'), `${JSON.stringify(nextNpcs, null, 2)}\n`, 'utf-8');

    const profNpcs = this.readProfessionNpcs();
    const updatedProf = profNpcs.map((pn) => {
      const m = nextNpcs.find((x) => x.id === pn.id);
      return m ? { ...pn, mapId: m.regionId, tx: m.tx, ty: m.ty } : pn;
    });
    const profPayload = `${JSON.stringify(updatedProf, null, 2)}\n`;
    fs.writeFileSync(this.resolveClientProfessionsFile(), profPayload, 'utf-8');
    if (fs.existsSync(path.dirname(this.resolveRepoProfessionsFile()))) {
      fs.writeFileSync(this.resolveRepoProfessionsFile(), profPayload, 'utf-8');
    }

    const mapsById = this.loadAllMapDocs();
    for (const mapDoc of Object.values(mapsById) as any[]) {
      const filePath = path.join(this.resolveClientMapsDir(), mapDoc.__fileName);
      const { __fileName, ...cleanDoc } = mapDoc;
      const mapNpcs = nextNpcs.filter(
        (n) => n.regionId === cleanDoc.id && !updatedProf.some((pn) => pn.id === n.id)
      );
      cleanDoc.spawns = cleanDoc.spawns || {};
      cleanDoc.spawns.npcs = mapNpcs;
      fs.writeFileSync(filePath, `${JSON.stringify(cleanDoc, null, 2)}\n`, 'utf-8');
    }
    WorldService.getInstance().invalidateCache();
    return this.getWorldLayoutSnapshot();
  }
}
