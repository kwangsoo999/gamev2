import { randomUUID } from 'crypto';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { INITIAL_SKILLS } from '@elysia/game-data-schema';
import { ENV } from '../config/env.js';
import { AuthService } from '../services/auth.service.js';
import { CombatService } from '../services/combat.service.js';
import { SocialService } from '../services/social.service.js';
import { WorldService } from '../services/world.service.js';

interface SocketUser {
  id: string;
  username: string;
  role: string;
  jti?: string;
}

interface AuthenticatedSocket extends Socket {
  data: { user?: SocketUser; characterId?: string };
}

const combat = CombatService.getSharedInstance();
const social = SocialService.getInstance();
const authService = AuthService.getInstance();
const worldService = WorldService.getInstance();

function isSupportSkill(skillId?: string): boolean {
  if (!skillId) return false;
  if (skillId === 'skill_heal') return true;
  const skills = worldService.getSkills(false).length ? worldService.getSkills(false) : INITIAL_SKILLS;
  const def = skills.find((s: any) => s.id === skillId);
  if (!def) return false;
  return (
    def.skillType === 'buff' ||
    def.skillKind === 'heal' ||
    def.skillKind === 'buff' ||
    def.skillKind === 'shield' ||
    def.skillKind === 'cleanse' ||
    def.executionType === 'healing' ||
    def.executionType === 'shield' ||
    def.executionType === 'buff' ||
    def.targetType === 'self' ||
    def.targetType === 'ally' ||
    def.targetType === 'party'
  );
}

function emitToCharacter(io: Server, characterId: string, event: string, payload: any) {
  const sid = social.getSocketId(characterId);
  if (sid) io.to(sid).emit(event, payload);
}

function broadcastPartyUpdate(io: Server, partyIdOrCharId: string) {
  const party = social.getPartyForCharacter(partyIdOrCharId);
  if (!party) return;
  for (const m of party.members) {
    emitToCharacter(io, m.characterId, 'party:updated', party);
  }
}

export function setupGameSockets(io: Server) {
  io.use((socket: AuthenticatedSocket, next) => {
    const authToken = socket.handshake.auth?.token;
    const header = socket.handshake.headers.authorization;
    const token =
      typeof authToken === 'string'
        ? authToken
        : header?.startsWith('Bearer ')
          ? header.slice(7)
          : null;
    if (!token) return next(new Error('UNAUTHORIZED: Missing access token'));
    try {
      const payload = jwt.verify(token, ENV.JWT_SECRET) as SocketUser;
      if (payload.jti && authService.isTokenRevoked(payload.jti)) {
        return next(new Error('UNAUTHORIZED: Session has been logged out'));
      }
      socket.data.user = payload;
      next();
    } catch {
      next(new Error('UNAUTHORIZED: Invalid or expired access token'));
    }
  });

  io.on('connection', (rawSocket: Socket) => {
    const socket = rawSocket as AuthenticatedSocket;
    const user = socket.data.user!;

    socket.on('net:ping', (data: { ts?: number }, ack?: (res: any) => void) => {
      const payload = { clientTs: Number(data?.ts || Date.now()), serverTs: Date.now() };
      socket.emit('net:pong', payload);
      ack?.(payload);
    });

    socket.on('player:join', (data: { characterId?: string }, ack?: (result: any) => void) => {
      try {
        if (typeof data?.characterId !== 'string' || data.characterId.length > 80) {
          throw new Error('characterId không hợp lệ.');
        }
        // Clean previous character bound on this socket if switching character
        if (socket.data.characterId && socket.data.characterId !== data.characterId) {
          const prevId = socket.data.characterId;
          const prev = combat.getPlayer(prevId);
          if (prev) {
            socket.leave(prev.regionId);
            socket.to(prev.regionId).emit('player:left', { socketId: socket.id, characterId: prevId });
          }
          social.setOffline(prevId);
          combat.leave(prevId);
        }

        const { snapshot, character } = combat.join(user.id, data.characterId);
        socket.data.characterId = character.id;
        social.setOnline(character.id, socket.id);
        socket.join(snapshot.regionId);

        const joinedPayload = {
          socketId: socket.id,
          characterId: character.id,
          name: character.name,
          classId: character.classId,
          secondJobName: character.secondJobName,
          gender: character.gender,
          level: character.level,
          regionId: snapshot.regionId,
          x: snapshot.x,
          y: snapshot.y,
          hp: snapshot.hp,
          maxHp: snapshot.maxHp,
          mp: snapshot.mp,
          maxMp: snapshot.maxMp,
          appearance: character.appearance,
          equipment: character.equipment,
        };

        socket.emit('player:state', snapshot);
        socket.emit('world:monsters', combat.getRegionMonsters(snapshot.regionId));
        socket.emit('world:players', getRegionPeers(io, socket, snapshot.regionId));
        const myParty = social.getPartyForCharacter(character.id);
        if (myParty) broadcastPartyUpdate(io, character.id);

        socket.to(snapshot.regionId).emit('player:joined', joinedPayload);
        ack?.({ success: true, data: snapshot, party: myParty });
      } catch (error: any) {
        ack?.({ success: false, error: error.message });
      }
    });

    socket.on(
      'player:move',
      (data: { x: number; y: number; animState?: string; direction?: string }, ack?: (result: any) => void) => {
        try {
          const characterId = requireJoined(socket);
          const result = combat.move(characterId, Number(data?.x), Number(data?.y));
          if (!result || result.rejected) {
            ack?.({ success: false, error: 'Di chuyển vượt quá tốc độ cho phép.', data: result?.snapshot });
            socket.emit('player:state', result?.snapshot);
            return;
          }
          socket.to(result.snapshot.regionId).emit('player:moved', {
            socketId: socket.id,
            characterId,
            x: result.snapshot.x,
            y: result.snapshot.y,
            animState: data?.animState,
            direction: data?.direction,
            hp: result.snapshot.hp,
            maxHp: result.snapshot.maxHp,
          });
          ack?.({ success: true, data: result.snapshot });
        } catch (error: any) {
          ack?.({ success: false, error: error.message });
        }
      }
    );

    socket.on(
      'player:combat_action',
      (
        data: { actionType?: string; skillId?: string; targetId?: string; allyCharacterIds?: string[] },
        ack?: (result: any) => void
      ) => {
        try {
          const characterId = requireJoined(socket);
          const partyMembers = social.getPartyMemberIds(characterId);
          const allies = data?.allyCharacterIds?.length ? data.allyCharacterIds : partyMembers;
          const result: any =
            data?.actionType === 'skill' && isSupportSkill(data?.skillId)
              ? {
                  ...combat.castSupportSkill(characterId, String(data.skillId), allies),
                  damage: 0,
                  critical: false,
                  monster: null,
                  rewards: null,
                }
              : combat.attack(characterId, {
                  actionType: data?.actionType,
                  skillId: data?.skillId,
                  targetId: data?.targetId || '',
                });
          io.to(result.player.regionId).emit('combat:result', {
            characterId,
            classId: result.classId,
            advancedJobId: result.advancedJobId,
            advancedJobName: result.advancedJobName,
            actionType: result.actionType,
            skillId: result.skillId,
            skillLevel: result.skillLevel,
            masteryPoints: result.masteryPoints,
            masteryRank: result.masteryRank,
            masteryGained: result.masteryGained,
            evolutionTier: result.evolutionTier,
            hitCount: result.hitCount,
            projectileCount: result.projectileCount,
            areaRadius: result.areaRadius,
            damageType: result.damageType,
            vfxKey: result.vfxKey,
            vfxId: result.vfxId,
            vfxTags: result.vfxTags,
            projectile: result.projectile,
            hitbox: result.hitbox,
            attackerX: result.attackerX,
            attackerY: result.attackerY,
            targetX: result.targetX,
            targetY: result.targetY,
            damage: result.damage,
            critical: result.critical,
            cleavedTargets: result.cleavedTargets,
            healedHp: result.healedHp || 0,
            shieldAdded: result.shieldAdded || 0,
            cleanseApplied: result.cleanseApplied || 0,
            unlocksGroundField: Boolean(result.unlocksGroundField),
            monster: result.monster,
            player: result.player,
            rewards: result.rewards,
          });
          socket.emit('player:state', result.player);
          broadcastPartyUpdate(io, characterId);
          if (result.rewards) socket.emit('combat:rewards', result.rewards);
          if (result.deathEvent) {
            socket.emit('player:died', result.deathEvent);
          }
          ack?.({ success: true, data: result });
        } catch (error: any) {
          ack?.({ success: false, error: error.message });
          socket.emit('combat:error', { message: error.message });
        }
      }
    );

    socket.on('player:change_region', (data: { targetRegionId?: string }, ack?: (result: any) => void) => {
      try {
        const characterId = requireJoined(socket);
        const player = combat.getPlayer(characterId)!;
        const oldRegion = player.regionId;
        const snapshot = combat.changeRegion(characterId, String(data?.targetRegionId || ''));
        socket.leave(oldRegion);
        socket.to(oldRegion).emit('player:left', { socketId: socket.id, characterId });
        socket.join(snapshot.regionId);
        socket.emit('world:monsters', combat.getRegionMonsters(snapshot.regionId));
        socket.emit('world:players', getRegionPeers(io, socket, snapshot.regionId));
        socket.to(snapshot.regionId).emit('player:joined', {
          socketId: socket.id,
          characterId,
          name: player.character.name,
          classId: player.character.classId,
          secondJobName: player.character.secondJobName,
          gender: player.character.gender,
          level: player.character.level,
          regionId: snapshot.regionId,
          x: snapshot.x,
          y: snapshot.y,
          hp: snapshot.hp,
          maxHp: snapshot.maxHp,
          appearance: player.character.appearance,
          equipment: player.character.equipment,
        });
        socket.emit('player:state', snapshot);
        broadcastPartyUpdate(io, characterId);
        ack?.({ success: true, data: snapshot });
      } catch (error: any) {
        ack?.({ success: false, error: error.message });
      }
    });

    socket.on('player:use_item', (data: { itemId?: string }, ack?: (result: any) => void) => {
      try {
        const characterId = requireJoined(socket);
        const result = combat.useItem(characterId, String(data?.itemId || ''));
        socket.emit('player:state', result.player);
        socket.emit('inventory:item_used', result);
        broadcastPartyUpdate(io, characterId);
        ack?.({ success: true, data: result });
      } catch (error: any) {
        ack?.({ success: false, error: error.message });
      }
    });

    socket.on('player:respawn', (_data: unknown, ack?: (result: any) => void) => {
      try {
        const characterId = requireJoined(socket);
        const oldRegion = combat.getPlayer(characterId)?.regionId;
        const snapshot = combat.respawn(characterId);
        if (oldRegion && oldRegion !== snapshot.regionId) {
          socket.leave(oldRegion);
          socket.to(oldRegion).emit('player:left', { socketId: socket.id, characterId });
          socket.join(snapshot.regionId);
          socket.to(snapshot.regionId).emit('player:joined', {
            socketId: socket.id,
            characterId,
            name: combat.getPlayer(characterId)!.character.name,
            classId: combat.getPlayer(characterId)!.character.classId,
            gender: combat.getPlayer(characterId)!.character.gender,
            level: snapshot.level,
            regionId: snapshot.regionId,
            x: snapshot.x,
            y: snapshot.y,
            hp: snapshot.hp,
            maxHp: snapshot.maxHp,
          });
        }
        socket.emit('world:monsters', combat.getRegionMonsters(snapshot.regionId));
        socket.emit('player:state', snapshot);
        socket.emit('player:resurrected', {
          checkpoint: snapshot.resurrectionCheckpoint,
          deathPenalty: snapshot.deathPenalty,
          snapshot,
        });
        broadcastPartyUpdate(io, characterId);
        ack?.({ success: true, data: snapshot });
      } catch (error: any) {
        ack?.({ success: false, error: error.message });
      }
    });

    socket.on('player:report_fatal', (data: { killerName?: string; reason?: string }, ack?: (result: any) => void) => {
      try {
        const characterId = requireJoined(socket);
        const deathPayload = combat.reportClientFatalDamage(characterId, data?.killerName, data?.reason);
        socket.emit('player:state', deathPayload.player);
        socket.emit('player:died', deathPayload);
        ack?.({ success: true, data: deathPayload });
      } catch (error: any) {
        ack?.({ success: false, error: error.message });
      }
    });

    // =========================================================================
    // MULTI-CHANNEL CHAT (general, global, party, whisper)
    // =========================================================================
    socket.on(
      'chat:message',
      (data: { channel?: string; message?: string; targetCharacterId?: string; targetName?: string }, ack?: (res: any) => void) => {
        try {
          const characterId = requireJoined(socket);
          const player = combat.getPlayer(characterId);
          const message = typeof data?.message === 'string' ? data.message.trim().slice(0, 300) : '';
          if (!player || !message) throw new Error('Tin nhắn không hợp lệ.');

          const rawChannel = data?.channel || 'general';
          const channel: 'general' | 'global' | 'party' | 'whisper' | 'guild' | 'merchant' =
            rawChannel === 'global' ||
            rawChannel === 'party' ||
            rawChannel === 'whisper' ||
            rawChannel === 'guild' ||
            rawChannel === 'merchant'
              ? rawChannel
              : 'general';

          const payload = {
            id: randomUUID(),
            sender: player.character.name,
            characterId,
            channel,
            targetCharacterId: data?.targetCharacterId,
            targetName: data?.targetName,
            message,
            timestamp: new Date().toISOString(),
          };

          if (channel === 'global') {
            io.emit('chat:broadcast', payload);
          } else if (channel === 'guild') {
            const gId = player.character.guildId;
            if (!gId) throw new Error('Bạn chưa gia nhập Bang Hội nào.');
            for (const p of social.listOnlinePlayers()) {
              const targetChar = combat.getPlayer(p.characterId)?.character;
              if (targetChar?.guildId === gId) emitToCharacter(io, p.characterId, 'chat:broadcast', payload);
            }
          } else if (channel === 'merchant') {
            const mId = player.character.merchantAssocId;
            if (!mId) throw new Error('Bạn chưa gia nhập Thương Hội nào.');
            for (const p of social.listOnlinePlayers()) {
              const targetChar = combat.getPlayer(p.characterId)?.character;
              if (targetChar?.merchantAssocId === mId) emitToCharacter(io, p.characterId, 'chat:broadcast', payload);
            }
          } else if (channel === 'party') {
            const members = social.getPartyMemberIds(characterId);
            if (!members.length) throw new Error('Bạn chưa ở trong tổ đội nào.');
            for (const mid of members) emitToCharacter(io, mid, 'chat:broadcast', payload);
          } else if (channel === 'whisper') {
            const target = social
              .listOnlinePlayers()
              .find(
                (p) =>
                  p.characterId === data?.targetCharacterId ||
                  (data?.targetName && p.name.toLowerCase() === data.targetName.trim().toLowerCase())
              );
            if (!target) throw new Error('Không tìm thấy người chơi đang trực tuyến để nhắn riêng.');
            payload.targetCharacterId = target.characterId;
            payload.targetName = target.name;
            socket.emit('chat:broadcast', payload);
            if (target.characterId !== characterId) {
              emitToCharacter(io, target.characterId, 'chat:broadcast', payload);
            }
          } else {
            io.to(player.regionId).emit('chat:broadcast', payload);
          }
          ack?.({ success: true, data: payload });
        } catch (err: any) {
          ack?.({ success: false, error: err.message });
        }
      }
    );

    // =========================================================================
    // ONLINE PLAYER DIRECTORY & PUBLIC INSPECTION
    // =========================================================================
    socket.on('world:list_players', (data: { regionOnly?: boolean }, ack?: (res: any) => void) => {
      try {
        const characterId = requireJoined(socket);
        const me = combat.getPlayer(characterId);
        const players = social.listOnlinePlayers(data?.regionOnly ? me?.regionId : undefined);
        ack?.({ success: true, data: players });
      } catch (err: any) {
        ack?.({ success: false, error: err.message });
      }
    });

    socket.on('player:inspect', (data: { characterId?: string }, ack?: (res: any) => void) => {
      try {
        requireJoined(socket);
        const profile = social.inspectPlayer(String(data?.characterId || ''));
        ack?.({ success: true, data: profile });
      } catch (err: any) {
        ack?.({ success: false, error: err.message });
      }
    });

    // =========================================================================
    // PARTY SOCKETS
    // =========================================================================
    socket.on('party:create', (_data: unknown, ack?: (res: any) => void) => {
      try {
        const characterId = requireJoined(socket);
        const state = social.createParty(characterId);
        broadcastPartyUpdate(io, characterId);
        ack?.({ success: true, data: state });
      } catch (err: any) {
        ack?.({ success: false, error: err.message });
      }
    });

    socket.on('party:invite', (data: { targetIdentifier?: string }, ack?: (res: any) => void) => {
      try {
        const characterId = requireJoined(socket);
        const inv = social.inviteToParty(characterId, String(data?.targetIdentifier || ''));
        emitToCharacter(io, inv.targetCharacterId, 'party:invite_received', inv);
        broadcastPartyUpdate(io, characterId);
        ack?.({ success: true, data: inv });
      } catch (err: any) {
        ack?.({ success: false, error: err.message });
      }
    });

    socket.on('party:respond', (data: { partyId?: string; accept?: boolean }, ack?: (res: any) => void) => {
      try {
        const characterId = requireJoined(socket);
        const res = social.respondPartyInvite(characterId, String(data?.partyId || ''), Boolean(data?.accept));
        if (res.accepted && res.partyState) {
          broadcastPartyUpdate(io, characterId);
        } else {
          emitToCharacter(io, res.fromId, 'chat:broadcast', {
            id: randomUUID(),
            sender: 'Hệ Thống',
            characterId: 'SYSTEM',
            channel: 'system',
            message: 'Lời mời tổ đội đã bị từ chối.',
            timestamp: new Date().toISOString(),
          });
        }
        ack?.({ success: true, data: res.partyState });
      } catch (err: any) {
        ack?.({ success: false, error: err.message });
      }
    });

    socket.on('party:leave', (_data: unknown, ack?: (res: any) => void) => {
      try {
        const characterId = requireJoined(socket);
        const res = social.leaveParty(characterId);
        socket.emit('party:updated', null);
        for (const mid of res.previousMemberIds) {
          if (mid !== characterId && res.partyState) emitToCharacter(io, mid, 'party:updated', res.partyState);
        }
        ack?.({ success: true, data: res.partyState });
      } catch (err: any) {
        ack?.({ success: false, error: err.message });
      }
    });

    socket.on('party:kick', (data: { targetCharacterId?: string }, ack?: (res: any) => void) => {
      try {
        const characterId = requireJoined(socket);
        const targetId = String(data?.targetCharacterId || '');
        const res = social.kickFromParty(characterId, targetId);
        emitToCharacter(io, targetId, 'party:updated', null);
        if (res.partyState) broadcastPartyUpdate(io, characterId);
        ack?.({ success: true, data: res.partyState });
      } catch (err: any) {
        ack?.({ success: false, error: err.message });
      }
    });

    // =========================================================================
    // ATOMIC SERVER-AUTHORITATIVE TRADE SOCKETS
    // =========================================================================
    socket.on('trade:request', (data: { targetIdentifier?: string }, ack?: (res: any) => void) => {
      try {
        const characterId = requireJoined(socket);
        const req = social.requestTrade(characterId, String(data?.targetIdentifier || ''));
        emitToCharacter(io, req.targetCharacterId, 'trade:request_received', req);
        ack?.({ success: true, data: req });
      } catch (err: any) {
        ack?.({ success: false, error: err.message });
      }
    });

    socket.on('trade:respond', (data: { fromCharacterId?: string; accept?: boolean }, ack?: (res: any) => void) => {
      try {
        const characterId = requireJoined(socket);
        const session = social.respondTradeRequest(characterId, String(data?.fromCharacterId || ''), Boolean(data?.accept));
        if (session) {
          for (const side of session.parties) emitToCharacter(io, side.characterId, 'trade:updated', session);
        } else {
          emitToCharacter(io, String(data?.fromCharacterId || ''), 'trade:cancelled', { reason: 'Đối phương từ chối giao dịch.' });
        }
        ack?.({ success: true, data: session });
      } catch (err: any) {
        ack?.({ success: false, error: err.message });
      }
    });

    socket.on(
      'trade:update_offer',
      (data: { tradeId?: string; gold?: number; items?: Array<{ itemId: string; quantity: number }> }, ack?: (res: any) => void) => {
        try {
          const characterId = requireJoined(socket);
          const session = social.updateTradeOffer(characterId, data?.tradeId, { gold: data?.gold, items: data?.items });
          for (const side of session.parties) emitToCharacter(io, side.characterId, 'trade:updated', session);
          ack?.({ success: true, data: session });
        } catch (err: any) {
          ack?.({ success: false, error: err.message });
        }
      }
    );

    socket.on('trade:lock', (data: { tradeId?: string }, ack?: (res: any) => void) => {
      try {
        const characterId = requireJoined(socket);
        const session = social.lockTrade(characterId, data?.tradeId);
        for (const side of session.parties) emitToCharacter(io, side.characterId, 'trade:updated', session);
        ack?.({ success: true, data: session });
      } catch (err: any) {
        ack?.({ success: false, error: err.message });
      }
    });

    socket.on('trade:confirm', (data: { tradeId?: string }, ack?: (res: any) => void) => {
      try {
        const characterId = requireJoined(socket);
        const res = social.confirmTrade(characterId, data?.tradeId);
        for (const side of res.session.parties) {
          emitToCharacter(io, side.characterId, res.completed ? 'trade:completed' : 'trade:updated', res.session);
          if (res.completed) {
            const p = combat.getPlayer(side.characterId);
            if (p) emitToCharacter(io, side.characterId, 'player:state', combat.snapshot(p));
          }
        }
        ack?.({ success: true, data: res });
      } catch (err: any) {
        ack?.({ success: false, error: err.message });
      }
    });

    socket.on('trade:cancel', (data: { tradeId?: string }, ack?: (res: any) => void) => {
      try {
        const characterId = requireJoined(socket);
        const cancelled = social.cancelTrade(characterId, data?.tradeId);
        if (cancelled) {
          for (const side of cancelled.parties) emitToCharacter(io, side.characterId, 'trade:cancelled', cancelled);
        }
        ack?.({ success: true, data: cancelled });
      } catch (err: any) {
        ack?.({ success: false, error: err.message });
      }
    });

    socket.on('disconnect', () => {
      const characterId = socket.data.characterId;
      if (!characterId) return;
      const player = combat.getPlayer(characterId);
      if (player) socket.to(player.regionId).emit('player:left', { socketId: socket.id, characterId });
      social.setOffline(characterId);
      combat.leave(characterId);
      broadcastPartyUpdate(io, characterId);
    });
  });

  const respawnTimer = setInterval(() => {
    for (const monster of combat.tick()) io.to(monster.regionId).emit('world:monster_respawned', monster);
  }, 1000);
  respawnTimer.unref?.();

  const aiTickTimer = setInterval(() => {
    const tickRes = combat.tickAi(500);
    if (tickRes.monsterUpdates.length > 0) {
      const byRegion = new Map<string, any[]>();
      for (const m of tickRes.monsterUpdates) {
        const list = byRegion.get(m.regionId) || [];
        list.push(m);
        byRegion.set(m.regionId, list);
      }
      for (const [regId, updates] of byRegion.entries()) {
        io.to(regId).emit('world:monster_updates', updates);
      }
    }
    for (const atk of tickRes.monsterAttacks) {
      io.to(atk.regionId).emit('world:monster_attack', atk);
      emitToCharacter(io, atk.targetCharacterId, 'player:damaged', atk);
    }
    for (const elite of tickRes.elitesSpawned) {
      io.to(elite.regionId).emit('world:elite_spawned', elite);
    }
    for (const d of tickRes.playerDeaths) {
      emitToCharacter(io, d.characterId, 'player:state', d.snapshot);
      emitToCharacter(io, d.characterId, 'player:died', d.deathPayload);
    }
  }, 500);
  aiTickTimer.unref?.();
}

function requireJoined(socket: AuthenticatedSocket): string {
  if (!socket.data.characterId) throw new Error('Bạn cần tham gia thế giới trước.');
  return socket.data.characterId;
}

function getRegionPeers(io: Server, socket: Socket, regionId: string) {
  const sockets = io.sockets.adapter.rooms.get(regionId);
  if (!sockets) return [];
  return [...sockets]
    .filter((id) => id !== socket.id)
    .map((id) => {
      const peer = io.sockets.sockets.get(id) as AuthenticatedSocket | undefined;
      const characterId = peer?.data.characterId;
      const player = characterId ? combat.getPlayer(characterId) : undefined;
      return player
        ? {
            socketId: id,
            characterId,
            name: player.character.name,
            classId: player.character.classId,
            secondJobName: player.character.secondJobName,
            gender: player.character.gender,
            level: player.character.level,
            regionId: player.regionId,
            x: player.x,
            y: player.y,
            hp: player.hp,
            maxHp: player.maxHp,
            mp: player.mp,
            maxMp: player.maxMp,
            appearance: player.character.appearance,
            equipment: player.character.equipment,
          }
        : null;
    })
    .filter(Boolean);
}
