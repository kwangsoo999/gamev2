import { io, Socket } from 'socket.io-client';

export interface RemotePlayer {
  socketId: string;
  characterId: string;
  name: string;
  classId: string;
  gender: string;
  level: number;
  regionId: string;
  x: number;
  y: number;
  animState?: string;
  direction?: string;
  hp?: number;
  maxHp?: number;
}

export interface ChatMessagePayload {
  sender: string;
  characterId: string;
  channel: 'global' | 'region' | 'party' | 'whisper';
  message: string;
  timestamp: string;
}

export interface CombatSnapshot {
  characterId: string;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  level: number;
  exp: number;
  expToNext: number;
  gold: number;
  x: number;
  y: number;
  regionId: string;
  dead: boolean;
}

export class NetworkService {
  private socket: Socket | null = null;
  private isConnected = false;

  public onWorldPlayers?: (players: RemotePlayer[]) => void;
  public onPlayerJoined?: (player: RemotePlayer) => void;
  public onPlayerMoved?: (data: { socketId: string; characterId: string; x: number; y: number; animState?: string; direction?: string }) => void;
  public onPlayerLeft?: (data: { socketId: string; characterId: string }) => void;
  public onPlayerAction?: (data: { socketId: string; characterId: string; actionType: string; skillId?: string; targetId?: string }) => void;
  public onCombatResult?: (data: any) => void;
  public onCombatRewards?: (data: any) => void;
  public onPlayerState?: (data: CombatSnapshot) => void;
  public onWorldMonsters?: (monsters: any[]) => void;
  public onMonsterRespawned?: (monster: any) => void;
  public onChatReceived?: (msg: ChatMessagePayload) => void;
  public onConnectionError?: (message: string) => void;
  public onItemUsed?: (result: any) => void;
  public onPlayerSnap?: (data: { x: number; y: number; reason?: string }) => void;
  public onDamageApplied?: (data: any) => void;
  public onReward?: (data: any) => void;
  public onActionRejected?: (data: { reason: string }) => void;

  public connect(url: string = import.meta.env.VITE_WS_URL || 'http://localhost:4000') {
    if (this.socket) return;
    const token = localStorage.getItem('elysia_token');
    if (!token) {
      this.onConnectionError?.('Bạn cần đăng nhập để kết nối máy chủ game.');
      return;
    }

    this.socket = io(url, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      console.log(`[NetworkService] Connected to game server with ID: ${this.socket?.id}`);
    });

    this.socket.on('connect_error', (err: any) => {
      this.isConnected = false;
      console.warn('[NetworkService] Connection error:', err.message);
      this.onConnectionError?.(err.message);
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      console.log('[NetworkService] Disconnected from game server');
    });

    this.socket.on('world:players', (players: RemotePlayer[]) => this.onWorldPlayers?.(players));
    this.socket.on('player:joined', (player: RemotePlayer) => this.onPlayerJoined?.(player));
    this.socket.on('player:moved', (data: any) => this.onPlayerMoved?.(data));
    this.socket.on('player:left', (data: any) => this.onPlayerLeft?.(data));
    this.socket.on('player:performed_action', (data: any) => this.onPlayerAction?.(data));
    this.socket.on('player:state', (data: CombatSnapshot) => this.onPlayerState?.(data));
    this.socket.on('world:monsters', (data: any[]) => this.onWorldMonsters?.(data));
    this.socket.on('world:monster_respawned', (monster: any) => this.onMonsterRespawned?.(monster));
    this.socket.on('combat:result', (data: any) => this.onCombatResult?.(data));
    this.socket.on('combat:rewards', (data: any) => this.onCombatRewards?.(data));
    this.socket.on('inventory:item_used', (data: any) => this.onItemUsed?.(data));
    this.socket.on('combat:error', (data: any) => this.onConnectionError?.(data?.message || 'Lỗi chiến đấu'));
    this.socket.on('combat:damage_applied', (data: any) => this.onDamageApplied?.(data));
    this.socket.on('player:reward', (data: any) => this.onReward?.(data));
    this.socket.on('player:action_rejected', (data: any) => this.onActionRejected?.(data));
    this.socket.on('player:snap', (data: any) => this.onPlayerSnap?.(data));
    this.socket.on('chat:broadcast', (msg: ChatMessagePayload) => this.onChatReceived?.(msg));
  }

  public joinGame(charDataOrId: any, callback?: (result: any) => void) {
    if (!this.socket) return;
    const characterId = typeof charDataOrId === 'string' ? charDataOrId : charDataOrId?.characterId;
    this.socket.emit('player:join', { characterId }, callback);
  }

  public sendMovement(x: number, y: number, animState?: string, direction?: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('player:move', { x, y, animState, direction });
    }
  }

  public sendCombatAction(
    actionType: string,
    skillId?: string,
    targetId?: string,
    x?: number,
    y?: number,
    callback?: (result: any) => void
  ) {
    if (this.socket && this.isConnected) {
      this.socket.emit('player:combat_action', { actionType, skillId, targetId, x, y }, callback);
    }
  }

  public sendChatMessage(channel: 'global' | 'region' | 'party' | 'whisper', message: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('chat:message', { channel, message });
    }
  }

  public changeRegion(targetRegionId: string, spawnXOrCallback?: any, _spawnY?: any) {
    const callback = typeof spawnXOrCallback === 'function' ? spawnXOrCallback : undefined;
    if (this.socket && this.isConnected) {
      this.socket.emit('player:change_region', { targetRegionId }, callback);
    } else {
      callback?.({ success: false, error: 'Chưa kết nối máy chủ game.' });
    }
  }

  public useItem(itemId: string, callback?: (result: any) => void) {
    if (this.socket && this.isConnected) {
      this.socket.emit('player:use_item', { itemId }, callback);
    }
  }

  public respawn(callback?: (result: any) => void) {
    if (this.socket && this.isConnected) {
      this.socket.emit('player:respawn', {}, callback);
    }
  }

  public disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.isConnected = false;
  }
}

export const networkService = new NetworkService();
