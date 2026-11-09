import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { AuthenticatedUser } from '../middleware/auth.js';
import { JsonStore } from '../database/jsonStore.js';
import { CharacterEntity } from '@elysia/game-types';

export interface PlayerState {
  socketId: string;
  userId: string;
  characterId: string;
  name: string;
  classId: string;
  gender: string;
  level: number;
  regionId: string;
  x: number;
  y: number;
  animState: string;
  direction: string;
  hp: number;
  maxHp: number;
  pAtk: number;
  pDef: number;
  lastMoveTime: number;
  lastSkillCasts: Map<string, number>;
}

export interface ServerMonsterInstance {
  instanceId: string;
  monsterId: string;
  name: string;
  regionId: string;
  level: number;
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  spawnX: number;
  spawnY: number;
  pAtk: number;
  pDef: number;
  element: string;
  expReward: number;
  goldRewardMin: number;
  goldRewardMax: number;
  isDead: boolean;
  respawnAt?: number;
}

const activePlayers = new Map<string, PlayerState>();
const serverMonsters = new Map<string, ServerMonsterInstance>();

// Default Regional Spawns for Starter Region
const DEFAULT_MONSTERS = [
  { monsterId: 'MON_SLIME_GREEN', name: 'Slime Xanh [Lv.1]', offX: -260, offY: -180, hp: 120, pAtk: 18, pDef: 4, level: 1, exp: 35, goldMin: 12, goldMax: 25, element: 'neutral' },
  { monsterId: 'MON_HORN_SLIME', name: 'Slime Sừng Nhọn [Lv.3]', offX: 320, offY: -220, hp: 280, pAtk: 32, pDef: 8, level: 3, exp: 65, goldMin: 25, goldMax: 45, element: 'earth' },
  { monsterId: 'MON_SPROUTLING', name: 'Mầm Cây Tinh Linh [Lv.4]', offX: -340, offY: 190, hp: 360, pAtk: 40, pDef: 10, level: 4, exp: 95, goldMin: 35, goldMax: 60, element: 'flora' },
  { monsterId: 'MON_WOLF_THORN', name: 'Sói Gai Rừng Sâu [Lv.8]', offX: 480, offY: 260, hp: 850, pAtk: 75, pDef: 18, level: 8, exp: 180, goldMin: 65, goldMax: 120, element: 'wind' },
  { monsterId: 'MON_FOREST_BOAR', name: 'Heo Rừng Thiết Bì [Lv.9]', offX: -460, offY: 340, hp: 1100, pAtk: 95, pDef: 28, level: 9, exp: 240, goldMin: 90, goldMax: 175, element: 'earth' },
  { monsterId: 'MON_CAVE_BAT', name: 'Dơi Bóng Tối [Lv.11]', offX: 580, offY: -320, hp: 1350, pAtk: 120, pDef: 24, level: 11, exp: 340, goldMin: 135, goldMax: 240, element: 'dark' },
  { monsterId: 'MON_SKELETON_MINER', name: 'Thợ Mỏ Xương Khô [Lv.13]', offX: -600, offY: -280, hp: 1750, pAtk: 155, pDef: 42, level: 13, exp: 490, goldMin: 195, goldMax: 350, element: 'undead' },
  { monsterId: 'MON_FROST_DRAKE', name: 'Băng Long Con [Lv.16]', offX: 680, offY: 420, hp: 2800, pAtk: 220, pDef: 60, level: 16, exp: 900, goldMin: 380, goldMax: 700, element: 'water' },
];

function initServerMonsters(regionId: string = 'VIL_STARTER', originX: number = 1000, originY: number = 1000) {
  for (const def of DEFAULT_MONSTERS) {
    const instanceId = `INST_${regionId}_${def.monsterId}`;
    if (!serverMonsters.has(instanceId)) {
      serverMonsters.set(instanceId, {
        instanceId,
        monsterId: def.monsterId,
        name: def.name,
        regionId,
        level: def.level,
        hp: def.hp,
        maxHp: def.hp,
        x: originX + def.offX,
        y: originY + def.offY,
        spawnX: originX + def.offX,
        spawnY: originY + def.offY,
        pAtk: def.pAtk,
        pDef: def.pDef,
        element: def.element,
        expReward: def.exp,
        goldRewardMin: def.goldMin,
        goldRewardMax: def.goldMax,
        isDead: false,
      });
    }
  }
}

// Initialize starter region monsters
initServerMonsters('VIL_STARTER', 1000, 1000);

// Skill configuration dictionary for server validation
interface SkillRule {
  cooldownMs: number;
  rangePx: number;
  multiplier: number;
  isAoe?: boolean;
}

const SKILL_RULES: Record<string, SkillRule> = {
  // Basic attack
  basic_attack: { cooldownMs: 600, rangePx: 200, multiplier: 1.0 },
  skill_sword_slash: { cooldownMs: 1200, rangePx: 220, multiplier: 1.3 },
  vfx_sword_slash: { cooldownMs: 1200, rangePx: 220, multiplier: 1.3 },

  // Primary Skills
  skill_fireball: { cooldownMs: 2500, rangePx: 480, multiplier: 2.2 },
  vfx_fireball: { cooldownMs: 2500, rangePx: 480, multiplier: 2.2 },
  skill_frost_nova: { cooldownMs: 4000, rangePx: 320, multiplier: 1.8, isAoe: true },
  vfx_frost_nova: { cooldownMs: 4000, rangePx: 320, multiplier: 1.8, isAoe: true },
  skill_lightning_strike: { cooldownMs: 5000, rangePx: 480, multiplier: 2.5 },
  vfx_lightning_strike: { cooldownMs: 5000, rangePx: 480, multiplier: 2.5 },
  skill_holy_smite: { cooldownMs: 6000, rangePx: 420, multiplier: 2.8 },
  vfx_holy_smite: { cooldownMs: 6000, rangePx: 420, multiplier: 2.8 },
  skill_divine_heal: { cooldownMs: 6000, rangePx: 500, multiplier: 1.5 },
  vfx_divine_heal: { cooldownMs: 6000, rangePx: 500, multiplier: 1.5 },

  // Secondary & Combo Skills
  skill_sword_combo: { cooldownMs: 3500, rangePx: 220, multiplier: 2.1 },
  vfx_sword_combo: { cooldownMs: 3500, rangePx: 220, multiplier: 2.1 },
  skill_divine_shield: { cooldownMs: 8000, rangePx: 500, multiplier: 1.0 },
  vfx_divine_shield: { cooldownMs: 8000, rangePx: 500, multiplier: 1.0 },
  skill_spin_slash: { cooldownMs: 4500, rangePx: 260, multiplier: 2.4, isAoe: true },
  vfx_spin_slash: { cooldownMs: 4500, rangePx: 260, multiplier: 2.4, isAoe: true },
  skill_heavy_cleave: { cooldownMs: 4000, rangePx: 280, multiplier: 2.5 },
  vfx_earth_stomp: { cooldownMs: 4000, rangePx: 280, multiplier: 2.5 },
  skill_homing_missile: { cooldownMs: 3500, rangePx: 480, multiplier: 2.0 },
  vfx_shadow_step: { cooldownMs: 3500, rangePx: 480, multiplier: 2.0 },
  skill_arrow_shot: { cooldownMs: 8000, rangePx: 520, multiplier: 3.2 },
  vfx_dash_strike: { cooldownMs: 8000, rangePx: 520, multiplier: 3.2 },
};

export function setupGameSockets(io: Server) {
  // 1. JWT Authentication Middleware for Socket.IO
  io.use((socket: Socket, next) => {
    const rawToken =
      socket.handshake.auth?.token ||
      (socket.handshake.headers?.authorization && socket.handshake.headers.authorization.replace(/^Bearer\s+/i, '')) ||
      (socket.handshake.query?.token as string);

    if (!rawToken) {
      console.warn(`[Socket Auth] Connection rejected for ${socket.id}: Missing access token.`);
      return next(new Error('AUTHENTICATION_REQUIRED: Missing access token.'));
    }

    try {
      const decoded = jwt.verify(rawToken, ENV.JWT_SECRET) as AuthenticatedUser;
      (socket as any).user = decoded;
      next();
    } catch (err: any) {
      console.warn(`[Socket Auth] Connection rejected for ${socket.id}: ${err.message}`);
      return next(new Error('AUTHENTICATION_FAILED: Invalid or expired token.'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const authUser = (socket as any).user as AuthenticatedUser;
    console.log(`[Socket] Verified player connected: ${authUser.username} (Socket: ${socket.id})`);

    // 2. Authoritative Character Join & Ownership Verification
    socket.on('player:join', (data: { characterId: string; regionId?: string }) => {
      const store = JsonStore.getInstance();
      const character = store.characters.find((c) => c.id === data.characterId);

      if (!character) {
        socket.emit('player:error', { code: 'CHAR_NOT_FOUND', message: 'Không tìm thấy dữ liệu nhân vật trên máy chủ.' });
        return;
      }

      // Strict ownership check: Must be the character owner or an admin
      if (character.userId !== authUser.id && authUser.role !== 'admin') {
        console.warn(`[Security Alert] User ${authUser.username} tried to hijack character ${character.id} owned by ${character.userId}!`);
        socket.emit('player:error', { code: 'FORBIDDEN_HIJACK', message: 'Bạn không có quyền đăng nhập vào nhân vật này.' });
        return;
      }

      const regionId = data.regionId || character.regionId || 'VIL_STARTER';
      const con = character.attributes?.con || character.baseStats?.con || 10;
      const str = character.attributes?.str || character.baseStats?.str || 10;

      // Server-authoritative stats derived from persistent character
      const maxHp = 100 + con * 18 + character.level * 22;
      const pAtk = str * 2.2 + character.level * 1.5 + 20;
      const pDef = con * 1.2;

      const player: PlayerState = {
        socketId: socket.id,
        userId: authUser.id,
        characterId: character.id,
        name: character.name,
        classId: character.classId,
        gender: character.gender,
        level: character.level,
        regionId,
        x: character.x || 1000,
        y: character.y || 1000,
        animState: 'idle',
        direction: 'south',
        hp: maxHp,
        maxHp,
        pAtk,
        pDef,
        lastMoveTime: Date.now(),
        lastSkillCasts: new Map<string, number>(),
      };

      activePlayers.set(socket.id, player);
      socket.join(regionId);

      // Send existing active players in this region
      const regionPlayers = Array.from(activePlayers.values()).filter(
        (p) => p.regionId === regionId && p.socketId !== socket.id
      );
      socket.emit('world:players', regionPlayers);

      // Send active server monsters in this region
      const regionMonsters = Array.from(serverMonsters.values()).filter((m) => m.regionId === regionId);
      socket.emit('world:monsters', regionMonsters);

      // Broadcast new verified player to others in the room
      socket.to(regionId).emit('player:joined', {
        socketId: player.socketId,
        characterId: player.characterId,
        name: player.name,
        classId: player.classId,
        gender: player.gender,
        level: player.level,
        regionId: player.regionId,
        x: player.x,
        y: player.y,
        hp: player.hp,
        maxHp: player.maxHp,
      });

      console.log(`[Game World] Character "${player.name}" (Account: ${authUser.username}) entered ${regionId} at (${player.x}, ${player.y})`);
    });

    // 3. Server-Authoritative Movement with Anti-Speedhack & Anti-Teleport
    socket.on('player:move', (data: { x: number; y: number; animState: string; direction: string }) => {
      const player = activePlayers.get(socket.id);
      if (!player) return;

      const now = Date.now();
      const dt = Math.max(0.04, (now - player.lastMoveTime) / 1000);
      const dx = data.x - player.x;
      const dy = data.y - player.y;
      const distance = Math.hypot(dx, dy);

      // Max legitimate movement speed: 250 px/s (sprint) + 90 px/s buffer for network latency/jitter
      const MAX_SPEED = 340;
      const maxAllowedDistance = MAX_SPEED * dt + 65;

      if (distance > maxAllowedDistance && distance > 80) {
        // Suspected speedhack or invalid teleport -> Snap back to authoritative coordinates
        console.warn(`[AntiCheat] Speedhack/Teleport blocked for ${player.name}: moved ${distance.toFixed(1)}px in ${dt.toFixed(2)}s (limit: ${maxAllowedDistance.toFixed(1)}px). Snapping back.`);
        socket.emit('player:snap', { x: player.x, y: player.y });
        return;
      }

      // Legitimate move: commit coordinates
      player.x = data.x;
      player.y = data.y;
      player.animState = data.animState || 'walk';
      player.direction = data.direction || 'south';
      player.lastMoveTime = now;

      // Broadcast movement to players in the same region
      socket.to(player.regionId).emit('player:moved', {
        socketId: socket.id,
        characterId: player.characterId,
        x: player.x,
        y: player.y,
        animState: player.animState,
        direction: player.direction,
      });
    });

    // 4. Server-Authoritative Combat System (Cooldown, Range, Damage & Rewards)
    socket.on('player:combat_action', (data: { actionType: string; skillId?: string; targetId?: string; x?: number; y?: number }) => {
      const player = activePlayers.get(socket.id);
      if (!player) return;

      const skillKey = data.skillId || 'basic_attack';
      const rule = SKILL_RULES[skillKey] || SKILL_RULES['basic_attack'];
      const now = Date.now();

      // a. Cooldown Check
      const lastCast = player.lastSkillCasts.get(skillKey) || 0;
      if (now - lastCast < rule.cooldownMs - 120) {
        socket.emit('combat:cooldown_error', { skillId: skillKey, remainingMs: rule.cooldownMs - (now - lastCast) });
        return;
      }
      player.lastSkillCasts.set(skillKey, now);

      // b. Target Resolution
      let targetMonster: ServerMonsterInstance | undefined;
      if (data.targetId) {
        const targetIdStr: string = data.targetId;
        targetMonster = serverMonsters.get(targetIdStr);
        // Fallback match by monster ID
        if (!targetMonster) {
          targetMonster = Array.from(serverMonsters.values()).find(
            (m) => m.regionId === player.regionId && (m.monsterId === targetIdStr || m.instanceId.includes(targetIdStr))
          );
        }
      }

      // If no explicit target provided, check for nearest active monster within skill range
      if (!targetMonster) {
        const candidateMonsters = Array.from(serverMonsters.values()).filter(
          (m) => m.regionId === player.regionId && !m.isDead
        );
        let minD = rule.rangePx + 50;
        for (const m of candidateMonsters) {
          const d = Math.hypot(m.x - player.x, m.y - player.y);
          if (d <= minD) {
            minD = d;
            targetMonster = m;
          }
        }
      }

      // Broadcast the attack action visually to region
      socket.to(player.regionId).emit('player:performed_action', {
        socketId: socket.id,
        characterId: player.characterId,
        actionType: data.actionType,
        skillId: skillKey,
        targetId: targetMonster?.instanceId || data.targetId,
        x: player.x,
        y: player.y,
      });

      // c. Server Authoritative Hit Processing
      if (targetMonster && !targetMonster.isDead) {
        // Range Check
        const distToTarget = Math.hypot(targetMonster.x - player.x, targetMonster.y - player.y);
        const maxRangeTolerance = rule.rangePx + 60;

        if (distToTarget > maxRangeTolerance) {
          socket.emit('combat:out_of_range', { targetId: targetMonster.instanceId, distance: distToTarget, maxRange: rule.rangePx });
          return;
        }

        // Server Damage Calculation
        const isCrit = Math.random() < 0.25;
        const baseDmg = Math.max(5, player.pAtk * rule.multiplier - targetMonster.pDef * 0.4);
        const variance = 0.9 + Math.random() * 0.2;
        const finalDamage = Math.floor(baseDmg * variance * (isCrit ? 1.8 : 1.0));

        targetMonster.hp = Math.max(0, targetMonster.hp - finalDamage);

        // Broadcast authoritative damage applied to all clients in region
        io.to(player.regionId).emit('combat:damage_applied', {
          attackerId: player.characterId,
          attackerName: player.name,
          targetId: targetMonster.instanceId,
          damage: finalDamage,
          isCrit,
          hpRemaining: targetMonster.hp,
          maxHp: targetMonster.maxHp,
        });

        // d. Monster Defeat & Reward Granting
        if (targetMonster.hp === 0) {
          targetMonster.isDead = true;
          const goldReward = Math.floor(
            targetMonster.goldRewardMin + Math.random() * (targetMonster.goldRewardMax - targetMonster.goldRewardMin + 1)
          );
          const expReward = targetMonster.expReward;

          // Update Character Progression in Database
          const store = JsonStore.getInstance();
          const dbChar = store.characters.find((c) => c.id === player.characterId);
          let leveledUp = false;

          if (dbChar) {
            dbChar.gold = (dbChar.gold || 0) + goldReward;
            dbChar.exp = (dbChar.exp || 0) + expReward;

            // Simple formula: Level Up requires Level * 120 + 50 EXP
            const expThreshold = dbChar.level * 120 + 50;
            if (dbChar.exp >= expThreshold) {
              dbChar.level += 1;
              dbChar.exp -= expThreshold;
              leveledUp = true;
              player.level = dbChar.level;
            }
            store.save();
          }

          // Emit Authoritative Reward to Attacker
          socket.emit('player:reward', {
            targetName: targetMonster.name,
            gold: goldReward,
            exp: expReward,
            newLevel: dbChar?.level || player.level,
            newGold: dbChar?.gold || 0,
            newExp: dbChar?.exp || 0,
            leveledUp,
          });

          // Broadcast monster death to region
          io.to(player.regionId).emit('combat:monster_killed', {
            targetId: targetMonster.instanceId,
            killerId: player.characterId,
            killerName: player.name,
            respawnSeconds: 6,
          });

          // Schedule Server-Side Respawn in 6s
          setTimeout(() => {
            if (targetMonster) {
              targetMonster.hp = targetMonster.maxHp;
              targetMonster.isDead = false;
              targetMonster.x = targetMonster.spawnX;
              targetMonster.y = targetMonster.spawnY;
              io.to(targetMonster.regionId).emit('world:monster_respawned', targetMonster);
            }
          }, 6000);
        }
      }
    });

    // 5. Chat System
    socket.on('chat:message', (data: { channel: 'global' | 'region' | 'party' | 'whisper'; message: string; targetPlayer?: string }) => {
      const player = activePlayers.get(socket.id);
      const senderName = player ? player.name : authUser.username;

      const payload = {
        sender: senderName,
        characterId: player?.characterId,
        channel: data.channel,
        message: data.message.slice(0, 200), // sanitize max length
        timestamp: new Date().toISOString(),
      };

      if (data.channel === 'global') {
        io.emit('chat:broadcast', payload);
      } else if (player) {
        io.to(player.regionId).emit('chat:broadcast', payload);
      }
    });

    // 6. Region Transition
    socket.on('player:change_region', (data: { targetRegionId: string; spawnX: number; spawnY: number }) => {
      const player = activePlayers.get(socket.id);
      if (!player) return;

      const oldRegion = player.regionId;
      socket.leave(oldRegion);
      socket.to(oldRegion).emit('player:left', { socketId: socket.id, characterId: player.characterId });

      player.regionId = data.targetRegionId;
      player.x = data.spawnX;
      player.y = data.spawnY;
      player.lastMoveTime = Date.now();

      socket.join(player.regionId);

      // Save position to DB
      const store = JsonStore.getInstance();
      const dbChar = store.characters.find((c) => c.id === player.characterId);
      if (dbChar) {
        dbChar.regionId = player.regionId;
        dbChar.x = player.x;
        dbChar.y = player.y;
        store.save();
      }

      const newRegionPlayers = Array.from(activePlayers.values()).filter(
        (p) => p.regionId === player.regionId && p.socketId !== socket.id
      );
      socket.emit('world:players', newRegionPlayers);

      const newRegionMonsters = Array.from(serverMonsters.values()).filter((m) => m.regionId === player.regionId);
      socket.emit('world:monsters', newRegionMonsters);

      socket.to(player.regionId).emit('player:joined', player);
    });

    // 7. Disconnect & Cleanup
    socket.on('disconnect', () => {
      const player = activePlayers.get(socket.id);
      if (player) {
        // Persist last coordinates to database on disconnect
        const store = JsonStore.getInstance();
        const dbChar = store.characters.find((c) => c.id === player.characterId);
        if (dbChar) {
          dbChar.x = player.x;
          dbChar.y = player.y;
          dbChar.regionId = player.regionId;
          store.save();
        }

        socket.to(player.regionId).emit('player:left', {
          socketId: socket.id,
          characterId: player.characterId,
        });
        activePlayers.delete(socket.id);
        console.log(`[Socket] Verified player disconnected: ${player.name} (${authUser.username})`);
      }
    });
  });
}
