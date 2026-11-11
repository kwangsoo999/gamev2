import { Entity, MonsterEntity, NpcEntity, PlayerEntity } from '../entities/Entity';
import { SpriteManager } from './SpriteManager';
import { TilemapEngine } from './TilemapEngine';
import {
  EquipSlotKey,
  InventoryItemDef,
  MapObjectDef,
  PlayerStatsSummary,
  QuestProgressState,
  SkillSlotDef,
  SpriteRegistryDoc,
  VillageMapData,
} from './types';

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  ttlMs: number;
}

interface PetalParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
}

export interface HudSnapshot {
  playerName: string;
  level: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  tx: number;
  ty: number;
  quest: QuestProgressState;
  skills: SkillSlotDef[];
  cooldowns: Record<string, number>;
  stats: PlayerStatsSummary;
  equipment: Partial<Record<EquipSlotKey, InventoryItemDef>>;
  inventory: InventoryItemDef[];
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  public readonly tilemap: TilemapEngine;
  public readonly sprites: SpriteManager;

  public readonly player: PlayerEntity;
  public readonly npcs: NpcEntity[] = [];
  public readonly monsters: MonsterEntity[] = [];

  private keysDown = new Set<string>();
  private camX = 0;
  private camY = 0;
  private viewW = window.innerWidth;
  private viewH = window.innerHeight;
  private rafId = 0;
  private lastTimeMs = 0;
  private lastHudEmitMs = 0;

  private floatingTexts: FloatingText[] = [];
  private petals: PetalParticle[] = [];
  private cooldowns: Record<string, number> = {};

  public readonly skills: SkillSlotDef[] = [
    { id: 'skill_1', key: '1', name: 'Thanh Long Kiếm Khí', desc: 'Phóng luồng kiếm khí màu lam chém xuyên kẻ địch phía trước.', mpCost: 12, cooldownSec: 1.5, rangePx: 115, damage: 45, iconKey: 'skill_azure_wave', color: '#38bdf8' },
    { id: 'skill_2', key: '2', name: 'Liệt Hỏa Trảm', desc: 'Quét đường kiếm rực lửa gây sát thương diện rộng mạnh mẽ.', mpCost: 24, cooldownSec: 3.5, rangePx: 135, damage: 85, iconKey: 'skill_flame_slash', color: '#f97316' },
    { id: 'skill_3', key: '3', name: 'Kim Quang Hộ Thể', desc: 'Kích hoạt kim quang quanh thân, hồi nhẹ sinh lực & đẩy lùi quái.', mpCost: 20, cooldownSec: 6.0, rangePx: 100, damage: 30, iconKey: 'skill_golden_aura', color: '#facc15' },
    { id: 'slot_4', key: '4', name: 'Ô Kỹ Năng Khóa', desc: 'Mở khóa ở cấp độ 5.', mpCost: 0, cooldownSec: 0, rangePx: 0, damage: 0, iconKey: 'locked', color: '#64748b', locked: true },
    { id: 'slot_5', key: '5', name: 'Ô Kỹ Năng Khóa', desc: 'Mở khóa ở cấp độ 10.', mpCost: 0, cooldownSec: 0, rangePx: 0, damage: 0, iconKey: 'locked', color: '#64748b', locked: true },
    { id: 'slot_6', key: '6', name: 'Ô Kỹ Năng Khóa', desc: 'Mở khóa ở cấp độ 15.', mpCost: 0, cooldownSec: 0, rangePx: 0, damage: 0, iconKey: 'locked', color: '#64748b', locked: true },
  ];

  public equipment: Partial<Record<EquipSlotKey, InventoryItemDef>> = {
    weapon: {
      id: 'eq_sword_starter',
      name: 'Thanh Kiếm Khởi Nguyên',
      category: 'equip',
      rarity: 'common',
      iconKey: 'sword_novice',
      qty: 1,
      equipSlot: 'weapon',
      atkBonus: 14,
      desc: 'Thanh kiếm sắt rèn tại Lò Rèn Thôn Khởi Nguyên.',
    },
    offhand: {
      id: 'eq_shield_oak',
      name: 'Khiên Gỗ Sồi',
      category: 'equip',
      rarity: 'common',
      iconKey: 'shield_oak',
      qty: 1,
      equipSlot: 'offhand',
      defBonus: 8,
      desc: 'Khiên tròn viền thép nhẹ giúp đỡ đòn Slime và Goblin.',
    },
    armor: {
      id: 'eq_tunic_novice',
      name: 'Áo Choàng Lữ Khách',
      category: 'equip',
      rarity: 'common',
      iconKey: 'tunic_explorer',
      qty: 1,
      equipSlot: 'armor',
      defBonus: 10,
      desc: 'Trang phục vải dày xanh lục đặc trưng của mạo hiểm giả.',
    },
  };

  public inventory: InventoryItemDef[] = [
    { id: 'inv_helm_bronze', name: 'Mũ Đồng Tân Thủ', category: 'equip', rarity: 'rare', iconKey: 'helm_bronze', qty: 1, equipSlot: 'helm', defBonus: 7, desc: 'Mũ chiến đồng nhẹ bảo vệ đầu khi tiến vào Hang Động.' },
    { id: 'inv_gloves_leather', name: 'Găng Tay Da Săn', category: 'equip', rarity: 'common', iconKey: 'gloves_leather', qty: 1, equipSlot: 'gloves', atkBonus: 5, defBonus: 3, desc: 'Tăng độ bám cán kiếm và lực chém nhẹ.' },
    { id: 'inv_boots_leather', name: 'Ủng Da Thảo Nguyên', category: 'equip', rarity: 'rare', iconKey: 'boots_leather', qty: 1, equipSlot: 'boots', defBonus: 6, desc: 'Ủng da bền bỉ phù hợp di chuyển đường dài.' },
    { id: 'inv_amulet_jade', name: 'Bùa Ngọc Lục Bảo', category: 'equip', rarity: 'epic', iconKey: 'amulet_jade', qty: 1, equipSlot: 'offhand', atkBonus: 18, defBonus: 4, desc: 'Cổ vật Thôn Khởi Nguyên tăng mạnh uy lực kiếm khí.' },
    { id: 'inv_potion_hp', name: 'Bình Sinh Lực Nhỏ', category: 'consumable', rarity: 'common', iconKey: 'potion_hp', qty: 15, hpRestore: 120, desc: 'Hồi phục ngay 120 HP khi sử dụng.' },
    { id: 'inv_potion_mp', name: 'Bình Ma Pháp Nhỏ', category: 'consumable', rarity: 'common', iconKey: 'potion_mp', qty: 8, mpRestore: 80, desc: 'Hồi phục ngay 80 MP để tung chiêu liên hoàn.' },
    { id: 'inv_bread', name: 'Bánh Mì Nướng Ấm', category: 'consumable', rarity: 'common', iconKey: 'bread_loaf', qty: 5, hpRestore: 60, desc: 'Khẩu phần ấm bụng hồi 60 HP.' },
    { id: 'inv_scroll_town', name: 'Cuộn Giấy Hồi Thành', category: 'consumable', rarity: 'rare', iconKey: 'scroll_town', qty: 4, desc: 'Đưa lữ khách trở về quảng trường Giếng Làng tức thì.' },
    { id: 'inv_herb', name: 'Thảo Dược Xanh', category: 'material', rarity: 'common', iconKey: 'herb_green', qty: 12, desc: 'Nguyên liệu bào chế thuốc trị thương cơ bản.' },
    { id: 'inv_wood', name: 'Gỗ Sồi Thôn Làng', category: 'material', rarity: 'common', iconKey: 'wood_oak', qty: 20, desc: 'Gỗ chắc dùng gia cố vũ khí và khiên.' },
    { id: 'inv_ore', name: 'Quặng Sắt Thô', category: 'material', rarity: 'common', iconKey: 'ore_iron', qty: 6, desc: 'Nguyên liệu rèn luyện trang bị bậc cao.' },
    { id: 'inv_mushroom', name: 'Nấm Rừng Đông', category: 'material', rarity: 'common', iconKey: 'mushroom_cap', qty: 10, desc: 'Nấm thu thập ngoài bìa rừng Thôn Khởi Nguyên.' },
    { id: 'inv_gem', name: 'Thủy Tinh Tím Cổ', category: 'material', rarity: 'epic', iconKey: 'gem_amethyst', qty: 1, desc: 'Tinh thể hiếm rơi gần khu vực Hang Động Bóng Tối.' },
  ];

  public gold = 1240;
  public silver = 350;

  public quest: QuestProgressState = {
    title: 'Dọn Sạch Ngoại Ô Làng',
    giver: 'Trưởng Thôn Kiên',
    objective: 'Tiêu diệt Slime Thảo Nguyên',
    current: 0,
    required: 3,
    completed: false,
  };

  public onHudSync?: (snapshot: HudSnapshot) => void;
  public onMinimapDraw?: (tilemap: TilemapEngine, player: PlayerEntity, npcs: NpcEntity[], monsters: MonsterEntity[]) => void;
  public onNpcTalk?: (npc: NpcEntity) => void;
  public onToast?: (msg: string) => void;
  public onToggleBalo?: () => void;
  public onToggleSkills?: () => void;

  constructor(canvas: HTMLCanvasElement, mapData: VillageMapData, spriteDoc: SpriteRegistryDoc) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D Canvas context unavailable');
    this.ctx = ctx;

    this.tilemap = new TilemapEngine(mapData);
    this.sprites = new SpriteManager();
    this.sprites.loadRegistry(spriteDoc);

    // Spawn Player, NPCs & Monsters cleanly from Layer data
    const ps = this.tilemap.tileToWorldCenter(mapData.spawns.player.tx, mapData.spawns.player.ty);
    this.player = new PlayerEntity({
      id: 'player_main',
      name: mapData.spawns.player.name,
      spriteId: 'player_adventurer',
      x: ps.x,
      y: ps.y,
      level: mapData.spawns.player.level,
      hp: 320,
      mp: 180,
    });

    for (const n of mapData.spawns.npcs) {
      const pos = this.tilemap.tileToWorldCenter(n.tx, n.ty);
      this.npcs.push(
        new NpcEntity({
          id: n.id,
          name: n.name,
          role: n.role,
          dialogue: n.dialogue,
          spriteId: n.spriteId,
          x: pos.x,
          y: pos.y,
        })
      );
    }

    for (const m of mapData.spawns.monsters) {
      const pos = this.tilemap.tileToWorldCenter(m.tx, m.ty);
      this.monsters.push(
        new MonsterEntity({
          id: m.id,
          name: m.name,
          level: m.level,
          hp: m.hp,
          spriteId: m.spriteId,
          x: pos.x,
          y: pos.y,
        })
      );
    }

    for (let i = 0; i < 24; i++) {
      this.petals.push({
        x: Math.random() * this.tilemap.worldWidth,
        y: Math.random() * this.tilemap.worldHeight,
        vx: 14 + Math.random() * 14,
        vy: 18 + Math.random() * 16,
        size: 3 + Math.random() * 3,
        alpha: 0.45 + Math.random() * 0.35,
      });
    }

    this.centerCameraImmediate();
    this.bindInputs();
    this.resize();
  }

  public start() {
    this.lastTimeMs = performance.now();
    const tick = (now: number) => {
      const dtSec = Math.min(0.05, (now - this.lastTimeMs) / 1000);
      this.lastTimeMs = now;
      this.update(dtSec, now);
      this.render(now);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  public destroy() {
    cancelAnimationFrame(this.rafId);
  }

  public resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.viewW = window.innerWidth;
    this.viewH = window.innerHeight;
    this.canvas.width = Math.floor(this.viewW * dpr);
    this.canvas.height = Math.floor(this.viewH * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  public getComputedStats(): PlayerStatsSummary {
    let atk = 18;
    let def = 10;
    for (const gear of Object.values(this.equipment)) {
      if (!gear) continue;
      atk += gear.atkBonus || 0;
      def += gear.defBonus || 0;
    }
    return { atk, def, gold: this.gold, silver: this.silver };
  }

  public useOrEquipItem(itemId: string) {
    const idx = this.inventory.findIndex((i) => i.id === itemId);
    if (idx < 0) return;
    const item = this.inventory[idx];

    if (item.category === 'equip' && item.equipSlot) {
      const slot = item.equipSlot;
      const prevEquipped = this.equipment[slot];
      this.equipment[slot] = { ...item, qty: 1 };
      this.inventory.splice(idx, 1);
      if (prevEquipped) {
        this.inventory.unshift(prevEquipped);
      }
      this.onToast?.(`Đã trang bị: ${item.name}`);
      this.emitHudSnapshot();
      return;
    }

    if (item.category === 'consumable') {
      if (item.iconKey === 'scroll_town') {
        const home = this.tilemap.tileToWorldCenter(11, 20);
        this.player.x = home.x;
        this.player.y = home.y;
        this.player.pathQueue = [];
        this.centerCameraImmediate();
        this.floatingTexts.push({ x: this.player.x, y: this.player.y - 48, text: 'Hồi Thành!', color: '#7dd3fc', ttlMs: 950 });
      } else {
        if (item.hpRestore) {
          this.player.hp = Math.min(this.player.maxHp, this.player.hp + item.hpRestore);
          this.floatingTexts.push({ x: this.player.x, y: this.player.y - 44, text: `+${item.hpRestore} HP`, color: '#4ade80', ttlMs: 850 });
        }
        if (item.mpRestore) {
          this.player.mp = Math.min(this.player.maxMp, this.player.mp + item.mpRestore);
          this.floatingTexts.push({ x: this.player.x, y: this.player.y - 58, text: `+${item.mpRestore} MP`, color: '#60a5fa', ttlMs: 850 });
        }
      }
      item.qty--;
      if (item.qty <= 0) this.inventory.splice(idx, 1);
      this.emitHudSnapshot();
      return;
    }

    this.onToast?.(`${item.name}: Nguyên liệu dùng cho rèn & luyện dược.`);
  }

  public unequipSlot(slot: EquipSlotKey) {
    const equipped = this.equipment[slot];
    if (!equipped) return;
    if (this.inventory.length >= 24) {
      this.onToast?.('Balo đã đầy (24/24), không thể tháo trang bị!');
      return;
    }
    delete this.equipment[slot];
    this.inventory.unshift(equipped);
    this.onToast?.(`Đã tháo vào Balo: ${equipped.name}`);
    this.emitHudSnapshot();
  }

  public emitHudSnapshot() {
    const tile = this.tilemap.worldToTile(this.player.x, this.player.y);
    this.onHudSync?.({
      playerName: this.player.name,
      level: this.player.level,
      hp: Math.round(this.player.hp),
      maxHp: this.player.maxHp,
      mp: Math.round(this.player.mp),
      maxMp: this.player.maxMp,
      tx: tile.tx,
      ty: tile.ty,
      quest: this.quest,
      skills: this.skills,
      cooldowns: { ...this.cooldowns },
      stats: this.getComputedStats(),
      equipment: { ...this.equipment },
      inventory: this.inventory.map((it) => ({ ...it })),
    });
  }

  public castSkill(skillId: string) {
    const skill = this.skills.find((s) => s.id === skillId);
    if (!skill || skill.locked) return;
    if ((this.cooldowns[skill.id] || 0) > 0) return;
    if (this.player.mp < skill.mpCost) {
      this.onToast?.('Không đủ MP để thi triển chiêu thức!');
      return;
    }
    if (!this.player.triggerAttack()) return;

    this.player.mp = Math.max(0, this.player.mp - skill.mpCost);
    this.cooldowns[skill.id] = skill.cooldownSec;
    const bonusDmg = Math.round(this.getComputedStats().atk * 0.6);
    if (skill.id === 'skill_3') {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 40);
      this.floatingTexts.push({ x: this.player.x, y: this.player.y - 52, text: '+40 HP', color: '#fde047', ttlMs: 850 });
    }
    this.applyAreaAttack(skill.rangePx, skill.damage + bonusDmg, skill.color, skill.name);
  }

  public performBasicAttack() {
    if (!this.player.triggerAttack()) return;
    const totalDmg = 12 + this.getComputedStats().atk;
    this.applyAreaAttack(88, totalDmg, '#fef08a', 'Chém Thường');
  }

  public interactNearestNpc() {
    let closest: NpcEntity | null = null;
    let bestDist = 92;
    for (const npc of this.npcs) {
      const d = Math.hypot(npc.x - this.player.x, npc.y - this.player.y);
      if (d < bestDist) {
        bestDist = d;
        closest = npc;
      }
    }
    if (closest) {
      this.onNpcTalk?.(closest);
    } else {
      this.onToast?.('Hãy lại gần Dân Làng để trò chuyện [E].');
    }
  }

  private applyAreaAttack(rangePx: number, damage: number, color: string, label: string) {
    let hitCount = 0;
    for (const m of this.monsters) {
      if (!m.alive) continue;
      if (Math.hypot(m.x - this.player.x, m.y - this.player.y) <= rangePx) {
        hitCount++;
        const defeated = m.applyDamage(damage);
        this.floatingTexts.push({ x: m.x, y: m.y - 44, text: `-${damage}`, color, ttlMs: 800 });
        if (defeated) {
          this.floatingTexts.push({ x: m.x, y: m.y - 62, text: '+35 EXP', color: '#fde047', ttlMs: 950 });
          if (m.spriteId === 'monster_slime' && !this.quest.completed) {
            this.quest.current = Math.min(this.quest.required, this.quest.current + 1);
            if (this.quest.current >= this.quest.required) {
              this.quest.completed = true;
              this.quest.objective = 'Hoàn thành! Về báo Trưởng Thôn Kiên';
              this.onToast?.('Hoàn thành nhiệm vụ Thôn Khởi Nguyên!');
            }
          }
        }
      }
    }
    if (hitCount === 0) {
      this.floatingTexts.push({ x: this.player.x + this.player.facing * 26, y: this.player.y - 36, text: label, color, ttlMs: 550 });
    }
  }

  private update(dtSec: number, nowMs: number) {
    // Decrement active skill cooldowns
    for (const key of Object.keys(this.cooldowns)) {
      if (this.cooldowns[key] > 0) {
        this.cooldowns[key] = Math.max(0, this.cooldowns[key] - dtSec);
      }
    }

    // Gather keyboard vector
    let vx = 0;
    let vy = 0;
    if (this.keysDown.has('KeyA') || this.keysDown.has('ArrowLeft')) vx -= 1;
    if (this.keysDown.has('KeyD') || this.keysDown.has('ArrowRight')) vx += 1;
    if (this.keysDown.has('KeyW') || this.keysDown.has('ArrowUp')) vy -= 1;
    if (this.keysDown.has('KeyS') || this.keysDown.has('ArrowDown')) vy += 1;

    this.player.updateMovement(dtSec, vx, vy, this.tilemap);
    this.player.updateAnimation(dtSec, this.sprites.getMeta(this.player.spriteId));

    for (const npc of this.npcs) {
      npc.updateAnimation(dtSec, this.sprites.getMeta(npc.spriteId));
    }
    for (const mon of this.monsters) {
      mon.updateAi(dtSec, this.tilemap);
      if (mon.alive) mon.updateAnimation(dtSec, this.sprites.getMeta(mon.spriteId));
    }

    // Smooth Orthographic Camera Follow
    const targetCamX = Math.max(0, Math.min(this.tilemap.worldWidth - this.viewW, this.player.x - this.viewW * 0.5));
    const targetCamY = Math.max(0, Math.min(this.tilemap.worldHeight - this.viewH, this.player.y - this.viewH * 0.5));
    this.camX += (targetCamX - this.camX) * Math.min(1, dtSec * 8);
    this.camY += (targetCamY - this.camY) * Math.min(1, dtSec * 8);

    // Floating combat text & sakura wind petals
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= 34 * dtSec;
      ft.ttlMs -= dtSec * 1000;
      if (ft.ttlMs <= 0) this.floatingTexts.splice(i, 1);
    }
    for (const p of this.petals) {
      p.x = (p.x + p.vx * dtSec) % this.tilemap.worldWidth;
      p.y = (p.y + p.vy * dtSec) % this.tilemap.worldHeight;
    }

    // Throttled HUD & Minimap sync (~15Hz) so DOM updates stay ultra-lightweight
    if (nowMs - this.lastHudEmitMs >= 65) {
      this.lastHudEmitMs = nowMs;
      this.emitHudSnapshot();
      this.onMinimapDraw?.(this.tilemap, this.player, this.npcs, this.monsters);
    }
  }

  private render(timeMs: number) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.viewW, this.viewH);

    // 1. Layer 0: Orthographic Ground + Stream Water
    this.tilemap.renderGroundLayer(ctx, this.camX, this.camY, this.viewW, this.viewH, timeMs);

    // 2. Click-to-move A* destination marker on ground
    if (this.player.pathQueue.length > 0) {
      const dest = this.player.pathQueue[this.player.pathQueue.length - 1];
      ctx.save();
      ctx.strokeStyle = 'rgba(253, 224, 71, 0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(dest.x - this.camX, dest.y - this.camY, 14, 7, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 3. Layer 1 + Active Entities unified Orthographic Y-Sorting
    type DrawItem = { sortY: number; draw: () => void };
    const queue: DrawItem[] = [];

    for (const obj of this.tilemap.map.layers.objects) {
      const ox = obj.tx * this.tilemap.tileSize - this.camX;
      const oy = obj.ty * this.tilemap.tileSize - this.camY;
      const ow = obj.wTiles * this.tilemap.tileSize;
      const oh = obj.hTiles * this.tilemap.tileSize;
      // Frustum cull offscreen objects
      if (ox + ow < -80 || ox > this.viewW + 80 || oy + oh < -100 || oy > this.viewH + 100) continue;

      const captured: MapObjectDef = obj;
      queue.push({
        sortY: this.tilemap.getObjectSortY(captured),
        draw: () => this.tilemap.renderObject(ctx, captured, this.camX, this.camY, timeMs),
      });
    }

    const allEntities: Entity[] = [this.player, ...this.npcs, ...this.monsters.filter((m) => m.alive)];
    for (const ent of allEntities) {
      const sx = ent.x - this.camX;
      const sy = ent.y - this.camY;
      if (sx < -80 || sx > this.viewW + 80 || sy < -80 || sy > this.viewH + 80) continue;
      queue.push({
        sortY: ent.getSortY(),
        draw: () => this.sprites.drawEntity(ctx, ent, sx, sy, timeMs),
      });
    }

    queue.sort((a, b) => a.sortY - b.sortY);
    for (const item of queue) item.draw();

    // 4. Floating Sakura Petals & Damage Numbers
    ctx.save();
    for (const p of this.petals) {
      const sx = p.x - this.camX;
      const sy = p.y - this.camY;
      if (sx < 0 || sx > this.viewW || sy < 0 || sy > this.viewH) continue;
      ctx.fillStyle = `rgba(251, 207, 232, ${p.alpha})`;
      ctx.beginPath();
      ctx.ellipse(sx, sy, p.size, p.size * 0.55, p.x * 0.02, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.font = '800 13px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    for (const ft of this.floatingTexts) {
      ctx.fillStyle = '#0f172a';
      ctx.fillText(ft.text, ft.x - this.camX + 1, ft.y - this.camY + 1);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x - this.camX, ft.y - this.camY);
    }
    ctx.restore();
  }

  private centerCameraImmediate() {
    this.camX = Math.max(0, Math.min(this.tilemap.worldWidth - this.viewW, this.player.x - this.viewW * 0.5));
    this.camY = Math.max(0, Math.min(this.tilemap.worldHeight - this.viewH, this.player.y - this.viewH * 0.5));
  }

  private bindInputs() {
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('keydown', (e) => {
      this.keysDown.add(e.code);
      if (e.code === 'KeyJ' || e.code === 'Space') this.performBasicAttack();
      if (e.code === 'KeyE') this.interactNearestNpc();
      if (e.code === 'Digit1') this.castSkill('skill_1');
      if (e.code === 'Digit2') this.castSkill('skill_2');
      if (e.code === 'Digit3') this.castSkill('skill_3');
      if (e.code === 'KeyB' || e.code === 'KeyI' || e.code === 'KeyC') this.onToggleBalo?.();
      if (e.code === 'KeyK') this.onToggleSkills?.();
    });
    window.addEventListener('keyup', (e) => this.keysDown.delete(e.code));

    this.canvas.addEventListener('pointerdown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const worldX = e.clientX - rect.left + this.camX;
      const worldY = e.clientY - rect.top + this.camY;

      // Check click on NPC first
      for (const npc of this.npcs) {
        if (Math.hypot(worldX - npc.x, worldY - (npc.y - 20)) <= 32) {
          this.onNpcTalk?.(npc);
          return;
        }
      }

      const path = this.tilemap.findPath(this.player.x, this.player.y, worldX, worldY);
      if (path.length > 0) {
        this.player.assignPath(path);
      }
    });
  }
}
