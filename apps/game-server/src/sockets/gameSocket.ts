import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { CombatService } from '../services/combat.service.js';

interface SocketUser { id: string; username: string; role: string; }
interface AuthenticatedSocket extends Socket { data: { user?: SocketUser; characterId?: string }; }

const combat = new CombatService();

export function setupGameSockets(io: Server) {
  io.use((socket: AuthenticatedSocket, next) => {
    const authToken = socket.handshake.auth?.token;
    const header = socket.handshake.headers.authorization;
    const token = typeof authToken === 'string' ? authToken : header?.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return next(new Error('UNAUTHORIZED: Missing access token'));
    try {
      socket.data.user = jwt.verify(token, ENV.JWT_SECRET) as SocketUser;
      next();
    } catch {
      next(new Error('UNAUTHORIZED: Invalid or expired access token'));
    }
  });

  io.on('connection', (rawSocket: Socket) => {
    const socket = rawSocket as AuthenticatedSocket;
    const user = socket.data.user!;
    console.log('[Socket] Authenticated player connected:', user.username);

    socket.on('player:join', (data: { characterId?: string }, ack?: (result: any) => void) => {
      try {
        if (socket.data.characterId) throw new Error('Socket đã tham gia thế giới.');
        if (typeof data?.characterId !== 'string' || data.characterId.length > 80) throw new Error('characterId không hợp lệ.');
        const { snapshot, character } = combat.join(user.id, data.characterId);
        socket.data.characterId = character.id;
        socket.join(snapshot.regionId);
        socket.emit('player:state', snapshot);
        socket.emit('world:monsters', combat.getRegionMonsters(snapshot.regionId));
        const regionPlayers = awaitlessPlayers(io, socket, snapshot.regionId);
        socket.emit('world:players', regionPlayers);
        socket.to(snapshot.regionId).emit('player:joined', {
          socketId: socket.id, characterId: character.id, name: character.name, classId: character.classId,
          gender: character.gender, level: character.level, regionId: snapshot.regionId,
          x: snapshot.x, y: snapshot.y, hp: snapshot.hp, maxHp: snapshot.maxHp,
        });
        ack?.({ success: true, data: snapshot });
      } catch (error: any) { ack?.({ success: false, error: error.message }); }
    });

    socket.on('player:move', (data: { x: number; y: number }, ack?: (result: any) => void) => {
      try {
        const characterId = requireJoined(socket);
        const result = combat.move(characterId, Number(data?.x), Number(data?.y));
        if (!result || result.rejected) {
          ack?.({ success: false, error: 'Di chuyển vượt quá tốc độ cho phép.', data: result?.snapshot });
          socket.emit('player:state', result?.snapshot);
          return;
        }
        socket.to(result.snapshot.regionId).emit('player:moved', {
          socketId: socket.id, characterId, x: result.snapshot.x, y: result.snapshot.y,
        });
        ack?.({ success: true, data: result.snapshot });
      } catch (error: any) { ack?.({ success: false, error: error.message }); }
    });

    socket.on('player:combat_action', (data: { actionType?: string; skillId?: string; targetId?: string }, ack?: (result: any) => void) => {
      try {
        const characterId = requireJoined(socket);
        const result = data?.actionType === 'skill' && data?.skillId === 'skill_heal'
          ? { ...combat.heal(characterId, data.skillId), damage: 0, critical: false, monster: null, rewards: null }
          : combat.attack(characterId, {
              actionType: data?.actionType, skillId: data?.skillId, targetId: data?.targetId || '',
            });
        io.to(result.player.regionId).emit('combat:result', {
          characterId, actionType: result.actionType, skillId: result.skillId,
          damage: result.damage, critical: result.critical, monster: result.monster,
          player: result.player, rewards: result.rewards,
        });
        socket.emit('player:state', result.player);
        if (result.rewards) socket.emit('combat:rewards', result.rewards);
        ack?.({ success: true, data: result });
      } catch (error: any) {
        ack?.({ success: false, error: error.message });
        socket.emit('combat:error', { message: error.message });
      }
    });

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
        socket.emit('world:players', awaitlessPlayers(io, socket, snapshot.regionId));
        socket.to(snapshot.regionId).emit('player:joined', {
          socketId: socket.id, characterId, name: player.character.name,
          classId: player.character.classId, gender: player.character.gender,
          level: player.character.level, regionId: snapshot.regionId,
          x: snapshot.x, y: snapshot.y, hp: snapshot.hp, maxHp: snapshot.maxHp,
        });
        socket.emit('player:state', snapshot);
        ack?.({ success: true, data: snapshot });
      } catch (error: any) { ack?.({ success: false, error: error.message }); }
    });


    socket.on('player:use_item', (data: { itemId?: string }, ack?: (result: any) => void) => {
      try {
        const characterId = requireJoined(socket);
        const result = combat.useItem(characterId, String(data?.itemId || ''));
        socket.emit('player:state', result.player);
        socket.emit('inventory:item_used', result);
        ack?.({ success: true, data: result });
      } catch (error: any) { ack?.({ success: false, error: error.message }); }
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
            socketId: socket.id, characterId, name: combat.getPlayer(characterId)!.character.name,
            classId: combat.getPlayer(characterId)!.character.classId,
            gender: combat.getPlayer(characterId)!.character.gender, level: snapshot.level,
            regionId: snapshot.regionId, x: snapshot.x, y: snapshot.y, hp: snapshot.hp, maxHp: snapshot.maxHp,
          });
        }
        socket.emit('world:monsters', combat.getRegionMonsters(snapshot.regionId));
        socket.emit('player:state', snapshot);
        ack?.({ success: true, data: snapshot });
      } catch (error: any) { ack?.({ success: false, error: error.message }); }
    });

    socket.on('chat:message', (data: { channel?: string; message?: string }, ack?: (result: any) => void) => {
      const characterId = socket.data.characterId;
      const player = characterId ? combat.getPlayer(characterId) : undefined;
      const message = typeof data?.message === 'string' ? data.message.trim().slice(0, 300) : '';
      if (!player || !message) { ack?.({ success: false, error: 'Tin nhắn không hợp lệ.' }); return; }
      const payload = { sender: player.character.name, characterId, channel: data?.channel === 'global' ? 'global' : 'region',
        message, timestamp: new Date().toISOString() };
      if (payload.channel === 'global') io.emit('chat:broadcast', payload);
      else io.to(player.regionId).emit('chat:broadcast', payload);
      ack?.({ success: true });
    });

    socket.on('disconnect', () => {
      const characterId = socket.data.characterId;
      if (!characterId) return;
      const player = combat.getPlayer(characterId);
      if (player) socket.to(player.regionId).emit('player:left', { socketId: socket.id, characterId });
      combat.leave(characterId);
      console.log('[Socket] Player disconnected:', characterId);
    });
  });

  setInterval(() => {
    for (const monster of combat.tick()) io.to(monster.regionId).emit('world:monster_respawned', monster);
  }, 1000);
}

function requireJoined(socket: AuthenticatedSocket): string {
  if (!socket.data.characterId) throw new Error('Bạn cần tham gia thế giới trước.');
  return socket.data.characterId;
}

function awaitlessPlayers(io: Server, socket: Socket, regionId: string) {
  const sockets = io.sockets.adapter.rooms.get(regionId);
  if (!sockets) return [];
  return [...sockets].filter(id => id !== socket.id).map(id => {
    const peer = io.sockets.sockets.get(id) as AuthenticatedSocket | undefined;
    const characterId = peer?.data.characterId;
    const player = characterId ? combat.getPlayer(characterId) : undefined;
    return player ? { socketId: id, characterId, name: player.character.name, classId: player.character.classId,
      gender: player.character.gender, level: player.character.level, regionId: player.regionId,
      x: player.x, y: player.y, hp: player.hp, maxHp: player.maxHp } : null;
  }).filter(Boolean);
}
