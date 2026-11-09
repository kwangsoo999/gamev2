import { io, Socket } from 'socket.io-client';

export interface RemotePlayer {
  socketId: string; characterId: string; name: string; classId: string; gender: string;
  level: number; regionId: string; x: number; y: number; hp: number; maxHp: number;
}
export interface ChatMessagePayload {
  sender: string; characterId?: string; channel: 'global' | 'region' | 'party' | 'whisper';
  message: string; timestamp: string;
}
export interface CombatSnapshot {
  characterId: string; hp: number; maxHp: number; mp: number; maxMp: number;
  level: number; exp: number; expToNext: number; gold: number;
  x: number; y: number; regionId: string; dead: boolean;
}
export class NetworkService {
  private socket: Socket | null = null;
  private isConnected = false;
  public onWorldPlayers?: (players: RemotePlayer[]) => void;
  public onPlayerJoined?: (player: RemotePlayer) => void;
  public onPlayerMoved?: (data: { socketId: string; characterId: string; x: number; y: number }) => void;
  public onPlayerLeft?: (data: { socketId: string; characterId: string }) => void;
  public onCombatResult?: (data: any) => void;
  public onCombatRewards?: (data: any) => void;
  public onPlayerState?: (data: CombatSnapshot) => void;
  public onWorldMonsters?: (monsters: any[]) => void;
  public onMonsterRespawned?: (monster: any) => void;
  public onChatReceived?: (msg: ChatMessagePayload) => void;
  public onConnectionError?: (message: string) => void;
  public onItemUsed?: (result: any) => void;

  public connect(url: string = import.meta.env.VITE_WS_URL || 'http://localhost:4000') {
    if (this.socket) return;
    const token = localStorage.getItem('elysia_token');
    if (!token) { this.onConnectionError?.('Bạn cần đăng nhập để kết nối máy chủ game.'); return; }
    this.socket = io(url, {
      auth: { token }, transports: ['websocket', 'polling'],
      reconnectionAttempts: 10, reconnectionDelay: 1000,
    });
    this.socket.on('connect', () => { this.isConnected = true; });
    this.socket.on('connect_error', (err) => { this.isConnected = false; this.onConnectionError?.(err.message); });
    this.socket.on('disconnect', () => { this.isConnected = false; });
    this.socket.on('world:players', (players: RemotePlayer[]) => this.onWorldPlayers?.(players));
    this.socket.on('player:joined', (player: RemotePlayer) => this.onPlayerJoined?.(player));
    this.socket.on('player:moved', (data) => this.onPlayerMoved?.(data));
    this.socket.on('player:left', (data) => this.onPlayerLeft?.(data));
    this.socket.on('player:state', (data: CombatSnapshot) => this.onPlayerState?.(data));
    this.socket.on('world:monsters', (data: any[]) => this.onWorldMonsters?.(data));
    this.socket.on('world:monster_respawned', (monster: any) => this.onMonsterRespawned?.(monster));
    this.socket.on('combat:result', (data) => this.onCombatResult?.(data));
    this.socket.on('combat:rewards', (data) => this.onCombatRewards?.(data));
    this.socket.on('inventory:item_used', (data) => this.onItemUsed?.(data));
    this.socket.on('combat:error', (data) => this.onConnectionError?.(data.message));
    this.socket.on('chat:broadcast', (msg: ChatMessagePayload) => this.onChatReceived?.(msg));
  }

  public joinGame(characterId: string, callback?: (result: any) => void) {
    this.socket?.emit('player:join', { characterId }, callback);
  }
  public sendMovement(x: number, y: number, _animState?: string, _direction?: string) {
    if (this.socket && this.isConnected) this.socket.emit('player:move', { x, y });
  }
  public sendCombatAction(actionType: string, skillId?: string, targetId?: string, _x?: number, _y?: number, callback?: (result: any) => void) {
    if (this.socket && this.isConnected) this.socket.emit('player:combat_action', { actionType, skillId, targetId }, callback);
  }
  public sendChatMessage(channel: 'global' | 'region' | 'party' | 'whisper', message: string) {
    if (this.socket && this.isConnected) this.socket.emit('chat:message', { channel, message });
  }
  public changeRegion(targetRegionId: string, callback?: (result: any) => void) {
    if (this.socket && this.isConnected) this.socket.emit('player:change_region', { targetRegionId }, callback);
    else callback?.({ success: false, error: 'Chưa kết nối máy chủ game.' });
  }
  public useItem(itemId: string, callback?: (result: any) => void) {
    if (this.socket && this.isConnected) this.socket.emit('player:use_item', { itemId }, callback);
  }
  public respawn(callback?: (result: any) => void) {
    if (this.socket && this.isConnected) this.socket.emit('player:respawn', {}, callback);
  }
  public disconnect() {
    this.socket?.disconnect(); this.socket = null; this.isConnected = false;
  }
}
export const networkService = new NetworkService();
