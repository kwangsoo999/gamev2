import { randomUUID } from 'crypto';
import { INITIAL_SKILLS } from '@elysia/game-data-schema';
import { CharacterEntity, SkillDefinition } from '@elysia/game-types';
import { JsonStore } from '../database/jsonStore.js';
import { WorldService } from './world.service.js';

type MonsterDefinition = any;
type MonsterRuntime = {
  id: string; definitionId: string; regionId: string; x: number; y: number;
  hp: number; maxHp: number; level: number; alive: boolean;
  respawnAt?: number; lastAttackedAt: number;
};
type PlayerCombatState = {
  character: CharacterEntity; regionId: string; x: number; y: number;
  hp: number; maxHp: number; mp: number; maxMp: number;
  atk: number; matk: number; def: number; mdef: number;
  lastMoveAt: number; cooldowns: Map<string, number>; dead: boolean;
};
export type CombatSnapshot = {
  characterId: string; hp: number; maxHp: number; mp: number; maxMp: number;
  level: number; exp: number; expToNext: number; gold: number;
  x: number; y: number; regionId: string; dead: boolean;
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const distance = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by);
const expRequired = (level: number) => Math.floor(100 * Math.pow(level, 1.35));

export class CombatService {
  private store = JsonStore.getInstance();
  private world = new WorldService();
  private players = new Map<string, PlayerCombatState>();
  private monsters = new Map<string, MonsterRuntime>();
  private initializedRegions = new Set<string>();
  private monsterDefinitions: MonsterDefinition[] = [];
  private dropTables: any[] = [];
  private spawnPoints: any[] = [];

  constructor() {
    this.monsterDefinitions = this.world.getMonsters() || [];
    this.dropTables = this.world.getDropTables() || [];
    this.spawnPoints = this.world.getSpawnPoints() || [];
  }

  join(userId: string, characterId: string): { snapshot: CombatSnapshot; character: CharacterEntity } {
    const character = this.store.characters.find((c: CharacterEntity) => c.id === characterId && c.userId === userId);
    if (!character) throw new Error('Không tìm thấy nhân vật hoặc bạn không có quyền điều khiển nhân vật này.');
    const attributes = character.attributes || character.baseStats || { str: 10, dex: 10, agi: 10, int: 10, con: 10 };
    const equippedIds = Object.values(character.equipment || {});
    const equipped = [...this.store.items, ...this.store.weapons].filter((item: any) => equippedIds.includes(item.id) || equippedIds.includes(item.itemId));
    const equipmentStats = equipped.reduce((acc: any, item: any) => {
      const stats = item.equipment_stats || item.equipmentStats || {};
      Object.keys(stats).forEach((key) => { acc[key] = (acc[key] || 0) + Number(stats[key] || 0); });
      return acc;
    }, {});
    const level = Math.max(1, Number(character.level || 1));
    const maxHp = Math.max(1, 100 + Number(attributes.con || 10) * 20 + (level - 1) * 12 + Number(equipmentStats.maxHp || 0));
    const maxMp = Math.max(1, 40 + Number(attributes.int || 10) * 15 + (level - 1) * 6 + Number(equipmentStats.maxMp || 0));
    const state: PlayerCombatState = {
      character, regionId: character.regionId || 'VIL_STARTER',
      x: Number(character.x ?? 1000), y: Number(character.y ?? 1000),
      hp: clamp(Number(character.hp ?? maxHp), 0, maxHp), maxHp,
      mp: clamp(Number(character.mp ?? maxMp), 0, maxMp), maxMp,
      atk: Math.max(1, Number(attributes.str || 10) * 2 + Number(attributes.dex || 10) * 0.35 + Number(equipmentStats.atk || equipmentStats.attack || 0)),
      matk: Math.max(1, Number(attributes.int || 10) * 2 + Number(equipmentStats.matk || equipmentStats.magicAttack || 0)),
      def: Math.max(0, Number(attributes.con || 10) * 0.7 + Number(equipmentStats.def || equipmentStats.physicalDefense || 0)),
      mdef: Math.max(0, Number(attributes.int || 10) * 0.4 + Number(equipmentStats.mdef || equipmentStats.magicalDefense || 0)),
      lastMoveAt: Date.now(), cooldowns: new Map(), dead: false,
    };
    state.dead = state.hp <= 0;
    this.players.set(characterId, state);
    character.hp = state.hp;
    character.mp = state.mp;
    character.maxHp = state.maxHp;
    character.maxMp = state.maxMp;
    character.x = state.x; character.y = state.y; character.regionId = state.regionId;
    this.store.save();
    this.ensureRegion(state.regionId);
    return { snapshot: this.snapshot(state), character };
  }

  leave(characterId: string) { this.persist(this.players.get(characterId)); this.players.delete(characterId); }

  getPlayer(characterId: string) { return this.players.get(characterId); }

  snapshot(state: PlayerCombatState): CombatSnapshot {
    return {
      characterId: state.character.id, hp: state.hp, maxHp: state.maxHp, mp: state.mp, maxMp: state.maxMp,
      level: state.character.level, exp: state.character.exp, expToNext: expRequired(state.character.level),
      gold: state.character.gold, x: state.x, y: state.y, regionId: state.regionId, dead: state.dead,
    };
  }

  getRegionMonsters(regionId: string) {
    this.ensureRegion(regionId);
    return [...this.monsters.values()].filter(m => m.regionId === regionId).map(m => this.publicMonster(m));
  }

  private publicMonster(m: MonsterRuntime) {
    const def = this.monsterDefinitions.find(d => d.id === m.definitionId);
    return { id: m.id, monsterId: m.definitionId, name: def?.name || m.definitionId, regionId: m.regionId,
      x: m.x, y: m.y, hp: m.hp, maxHp: m.maxHp, level: m.level, alive: m.alive,
      sprite_asset: def?.sprite_asset, animation_assets: def?.animation_assets };
  }

  move(characterId: string, x: number, y: number) {
    const state = this.requirePlayer(characterId);
    if (state.dead || !Number.isFinite(x) || !Number.isFinite(y)) return null;
    const now = Date.now();
    const elapsed = Math.max(0.016, (now - state.lastMoveAt) / 1000);
    const maxDistance = 420 * elapsed + 24;
    const delta = distance(state.x, state.y, x, y);
    if (delta > maxDistance) return { rejected: true, snapshot: this.snapshot(state) };
    state.x = clamp(x, 0, 3000); state.y = clamp(y, 0, 3000); state.lastMoveAt = now;
    state.character.x = state.x; state.character.y = state.y;
    state.character.updatedAt = new Date().toISOString();
    this.store.save();
    return { rejected: false, snapshot: this.snapshot(state) };
  }

  changeRegion(characterId: string, targetRegionId: string) {
    const state = this.requirePlayer(characterId);
    const connection = (this.world.getConnections() || []).find((c: any) =>
      c.enabled !== false && c.fromRegionId === state.regionId && c.toRegionId === targetRegionId);
    if (!connection) throw new Error('Không có cổng kết nối hợp lệ giữa hai khu vực.');
    if (state.character.level < Number(connection.requiredLevel || 1)) throw new Error('Cấp độ chưa đủ để đi qua cổng này.');
    if (distance(state.x, state.y, Number(connection.portalX), Number(connection.portalY)) > 100) {
      throw new Error('Bạn cần đến gần cổng dịch chuyển trước.');
    }
    state.regionId = targetRegionId;
    state.x = Number(connection.targetX); state.y = Number(connection.targetY);
    state.character.regionId = targetRegionId; state.character.x = state.x; state.character.y = state.y;
    this.ensureRegion(targetRegionId); this.persist(state);
    return this.snapshot(state);
  }

  attack(characterId: string, input: { targetId: string; actionType?: string; skillId?: string }) {
    const player = this.requirePlayer(characterId);
    if (player.dead) throw new Error('Nhân vật đã gục. Hãy hồi sinh trước khi chiến đấu.');
    if (!input || typeof input.targetId !== 'string') throw new Error('Mục tiêu không hợp lệ.');
    const monster = this.monsters.get(input.targetId);
    if (!monster || monster.regionId !== player.regionId || !monster.alive) throw new Error('Quái vật không tồn tại hoặc đã bị tiêu diệt.');
    const definition = this.monsterDefinitions.find(m => m.id === monster.definitionId);
    if (!definition || definition.enabled === false) throw new Error('Quái vật hiện không khả dụng.');

    const actionType = input.actionType || 'basic_attack';
    let skill: SkillDefinition | undefined;
    let range = 64;
    let multiplier = 1;
    let manaCost = 0;
    let cooldownMs = 700;
    if (actionType === 'skill') {
      skill = INITIAL_SKILLS.find(s => s.id === input.skillId);
      if (!skill || (skill.classId !== player.character.classId && player.character.classId !== 'novice')) throw new Error('Kỹ năng không thuộc chức nghiệp của bạn.');
      if (player.character.level < skill.requiredLevel) throw new Error('Cấp độ chưa đủ để dùng kỹ năng.');
      range = Number(skill.range || 64);
      multiplier = Number(skill.damageMultiplier || 1);
      manaCost = Number(skill.mpCost ?? skill.manaCost ?? skill.spCost ?? Math.ceil(5 + Number(skill.damageMultiplier || 1) * 5));
      cooldownMs = Number(skill.cooldown || 0) * 1000;
    } else if (actionType !== 'basic_attack') {
      throw new Error('Loại hành động chiến đấu không hợp lệ.');
    }
    if (distance(player.x, player.y, monster.x, monster.y) > range) throw new Error('Mục tiêu nằm ngoài tầm tấn công.');
    const now = Date.now();
    const cooldownKey = skill ? skill.id : 'basic_attack';
    const readyAt = player.cooldowns.get(cooldownKey) || 0;
    if (now < readyAt) throw new Error('Kỹ năng đang hồi chiêu.');
    if (player.mp < manaCost) throw new Error('Không đủ MP để sử dụng kỹ năng.');
    player.mp -= manaCost;
    player.cooldowns.set(cooldownKey, now + cooldownMs);

    const monsterStats = definition.combat_stats || {};
    const defense = Number(monsterStats.physical_defense ?? definition.def ?? 0);
    const baseAttack = skill?.element && skill.element !== 'neutral' ? player.matk : player.atk;
    const variance = 0.9 + Math.random() * 0.2;
    const critical = Math.random() < Math.min(0.5, Number(player.character.attributes?.agi || 10) * 0.002 + Number(monsterStats.critical_rate || 0));
    const damage = Math.max(1, Math.floor((baseAttack * multiplier * variance - defense * 0.45) * (critical ? 1.5 : 1)));
    monster.hp = Math.max(0, monster.hp - damage);
    let rewards: any = null;
    if (monster.hp <= 0) {
      monster.alive = false;
      rewards = this.awardKill(player, monster, definition);
    } else {
      this.monsterRetaliate(player, monster, definition);
    }
    this.persist(player);
    return {
      actionType, skillId: skill?.id, damage, critical, monster: this.publicMonster(monster),
      player: this.snapshot(player), rewards,
    };
  }

  private monsterRetaliate(player: PlayerCombatState, monster: MonsterRuntime, definition: any) {
    const stats = definition.combat_stats || {};
    if (distance(player.x, player.y, monster.x, monster.y) > Number(definition.attack_range || 48)) return;
    const now = Date.now();
    const cooldown = Math.max(800, 1000 / Math.max(0.5, Number(stats.attack_speed || 1)));
    if (now - monster.lastAttackedAt < cooldown) return;
    monster.lastAttackedAt = now;
    const raw = Number(stats.physical_attack || definition.atk || 5);
    const damage = Math.max(1, Math.floor(raw - player.def * 0.5));
    player.hp = Math.max(0, player.hp - damage);
    if (player.hp <= 0) player.dead = true;
  }

  private awardKill(player: PlayerCombatState, monster: MonsterRuntime, definition: any) {
    const exp = Math.max(0, Number(definition.exp_reward ?? definition.exp ?? 0));
    const gold = Math.max(0, Number(definition.gold_reward ?? definition.gold ?? 0));
    player.character.exp = Number(player.character.exp || 0) + exp;
    player.character.gold = Number(player.character.gold || 0) + gold;
    const levelsGained: number[] = [];
    while (player.character.level < 99 && player.character.exp >= expRequired(player.character.level)) {
      player.character.exp -= expRequired(player.character.level);
      player.character.level += 1;
      levelsGained.push(player.character.level);
      player.maxHp += 12; player.maxMp += 6;
      player.hp = Math.min(player.maxHp, player.hp + 12);
      player.mp = Math.min(player.maxMp, player.mp + 6);
    }
    const dropTableId = definition.drop_table;
    const table = this.dropTables.find((t: any) => t.table_id === dropTableId || t.monster_id === definition.id);
    const drops: Array<{ itemId: string; quantity: number }> = [];
    for (const entry of (table?.drops || [])) {
      const chance = clamp(Number(entry.drop_rate || 0), 0, 100);
      if (Math.random() * 100 >= chance) continue;
      const itemId = String(entry.item_id || '');
      if (!itemId || player.character.level < Number(entry.required_player_level || 1) || !this.store.items.some((item: any) => item.id === itemId || item.itemId === itemId)) continue;
      const min = Math.max(1, Number(entry.min_quantity || 1));
      const max = Math.max(min, Number(entry.max_quantity || min));
      const quantity = Math.floor(min + Math.random() * (max - min + 1));
      this.addInventoryItem(player.character, itemId, quantity);
      drops.push({ itemId, quantity });
    }
    player.character.updatedAt = new Date().toISOString();
    const respawnSeconds = Number(definition.respawn_behavior?.respawn_time_seconds || 15);
    monster.respawnAt = Date.now() + respawnSeconds * 1000;
    const result = { exp, gold, drops, levelsGained, monsterId: definition.id };
    this.persist(player);
    return result;
  }

  private addInventoryItem(character: CharacterEntity, itemId: string, quantity: number) {
    const inventory = (character.inventory ||= []) as any[];
    const item = this.store.items.find((i: any) => i.id === itemId || i.itemId === itemId);
    const stackable = item?.stackable !== false;
    const stackLimit = Math.max(1, Number(item?.max_stack ?? item?.maxStack ?? 99));
    if (stackable) {
      let remaining = quantity;
      for (const slot of inventory) {
        if ((slot.itemId || slot.item_id) !== itemId || Number(slot.quantity || 0) >= stackLimit) continue;
        const add = Math.min(remaining, stackLimit - Number(slot.quantity || 0));
        slot.quantity = Number(slot.quantity || 0) + add; remaining -= add;
        if (!remaining) break;
      }
      while (remaining > 0) {
        const add = Math.min(remaining, stackLimit);
        const used = new Set(inventory.map(s => Number(s.slotId)));
        let slotId = 0; while (used.has(slotId)) slotId += 1;
        inventory.push({ slotId, itemId, quantity: add }); remaining -= add;
      }
    } else {
      for (let i = 0; i < quantity; i++) {
        const used = new Set(inventory.map(s => Number(s.slotId)));
        let slotId = 0; while (used.has(slotId)) slotId += 1;
        inventory.push({ slotId, itemId, quantity: 1 });
      }
    }
  }



  heal(characterId: string, skillId: string) {
    const player = this.requirePlayer(characterId);
    if (player.dead) throw new Error('Nhân vật đã gục.');
    const skill = INITIAL_SKILLS.find(s => s.id === skillId && s.targetType === 'self');
    if (!skill || (skill.classId !== player.character.classId && player.character.classId !== 'novice')) {
      throw new Error('Kỹ năng hồi phục không thuộc chức nghiệp của bạn.');
    }
    if (player.character.level < skill.requiredLevel) throw new Error('Cấp độ chưa đủ để dùng kỹ năng.');
    const now = Date.now();
    if (now < (player.cooldowns.get(skill.id) || 0)) throw new Error('Kỹ năng đang hồi chiêu.');
    const manaCost = Number(skill.mpCost ?? skill.manaCost ?? skill.spCost ?? Math.ceil(5 + skill.damageMultiplier * 5));
    if (player.mp < manaCost) throw new Error('Không đủ MP để sử dụng kỹ năng.');
    player.mp -= manaCost;
    player.cooldowns.set(skill.id, now + Number(skill.cooldown || 0) * 1000);
    const healedHp = Math.min(player.maxHp - player.hp, Math.max(1, Math.floor(player.matk * skill.damageMultiplier)));
    player.hp += healedHp;
    this.persist(player);
    return { actionType: 'skill', skillId, healedHp, player: this.snapshot(player) };
  }

  useItem(characterId: string, itemId: string) {
    const player = this.requirePlayer(characterId);
    if (player.dead) throw new Error('Nhân vật đã gục, không thể sử dụng vật phẩm.');
    const item = this.store.items.find((i: any) => (i.id === itemId || i.itemId === itemId) && i.enabled !== false && i.usable !== false);
    if (!item) throw new Error('Vật phẩm không tồn tại hoặc không thể sử dụng.');
    const inventory = (player.character.inventory || []) as any[];
    const slot = inventory.find(s => (s.itemId || s.item_id) === itemId && Number(s.quantity || 0) > 0);
    if (!slot) throw new Error('Bạn không sở hữu vật phẩm này.');
    const effects = item.effects || item.properties || {};
    const healHp = Math.max(0, Number(effects.healHp ?? effects.hpRestore ?? effects.hp_restore ?? 0));
    const healMp = Math.max(0, Number(effects.healMp ?? effects.mpRestore ?? effects.mp_restore ?? 0));
    if (!healHp && !healMp) throw new Error('Vật phẩm này chưa có hiệu ứng sử dụng được.');
    const restoredHp = Math.min(healHp, player.maxHp - player.hp);
    const restoredMp = Math.min(healMp, player.maxMp - player.mp);
    if (restoredHp <= 0 && restoredMp <= 0) throw new Error('HP và MP đã đầy.');
    slot.quantity = Number(slot.quantity) - 1;
    if (slot.quantity <= 0) inventory.splice(inventory.indexOf(slot), 1);
    player.hp += restoredHp;
    player.mp += restoredMp;
    this.persist(player);
    return { itemId, restoredHp, restoredMp, player: this.snapshot(player) };
  }

  respawn(characterId: string) {
    const player = this.requirePlayer(characterId);
    if (!player.dead) throw new Error('Nhân vật chưa gục.');
    player.dead = false;
    player.hp = player.maxHp; player.mp = player.maxMp;
    player.regionId = 'VIL_STARTER'; player.x = 1000; player.y = 1000;
    player.character.regionId = player.regionId; player.character.x = player.x; player.character.y = player.y;
    this.persist(player); this.ensureRegion(player.regionId);
    return this.snapshot(player);
  }

  tick() {
    const now = Date.now();
    const respawned: any[] = [];
    for (const monster of this.monsters.values()) {
      if (monster.alive || !monster.respawnAt || now < monster.respawnAt) continue;
      const def = this.monsterDefinitions.find(m => m.id === monster.definitionId);
      if (!def) continue;
      monster.hp = monster.maxHp; monster.alive = true; monster.respawnAt = undefined; monster.lastAttackedAt = 0;
      respawned.push(this.publicMonster(monster));
    }
    return respawned;
  }

  private ensureRegion(regionId: string) {
    if (this.initializedRegions.has(regionId)) return;
    this.initializedRegions.add(regionId);
    const points = this.spawnPoints.filter((p: any) => p.enabled !== false && p.region_id === regionId);
    for (const point of points) {
      const def = this.monsterDefinitions.find(m => m.id === point.monster_id && m.enabled !== false);
      if (!def) continue;
      const count = clamp(Number(point.max_alive || 1), 1, 8);
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.sqrt(Math.random()) * Number(point.radius || 0);
        const x = Number(point.x || 0) + Math.cos(angle) * radius;
        const y = Number(point.y || 0) + Math.sin(angle) * radius;
        const baseHp = Number(def.base_stats?.hp || def.hp || 100);
        const levelMin = Number(point.level_min ?? def.level_min ?? def.level ?? 1);
        const levelMax = Math.max(levelMin, Number(point.level_max ?? def.level_max ?? levelMin));
        const level = Math.floor(levelMin + Math.random() * (levelMax - levelMin + 1));
        const id = 'MOB_' + randomUUID();
        this.monsters.set(id, { id, definitionId: def.id, regionId, x, y, hp: baseHp, maxHp: baseHp,
          level, alive: true, lastAttackedAt: 0 });
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
    c.hp = state.hp; c.mp = state.mp; c.maxHp = state.maxHp; c.maxMp = state.maxMp;
    c.x = state.x; c.y = state.y; c.regionId = state.regionId;
    c.updatedAt = new Date().toISOString();
    this.store.save();
  }
}
