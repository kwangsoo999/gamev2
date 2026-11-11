import { io, Socket } from 'socket.io-client';
import type {
  MultiplayerChatMessage,
  PartyState,
  RemotePlayerState,
  TradeSessionState,
} from '@elysia/game-types';
import { getAuthToken } from './apiClient';

const SOCKET_URL = ((import.meta as any).env?.VITE_API_URL || 'http://localhost:4000/api/v1').replace(/\/api\/v1\/?$/, '');

export class MultiplayerClient {
  private socket: Socket | null = null;
  private joinedCharacterId: string | null = null;
  private activeToken: string | null = null;
  private pingTimer: number | null = null;
  private lastMoveSentMs = 0;

  public pingMs = 0;
  public connected = false;

  public onConnectionChange?: (connected: boolean, reconnecting?: boolean) => void;
  public onPingUpdate?: (pingMs: number) => void;
  public onWorldPlayers?: (players: RemotePlayerState[]) => void;
  public onPlayerJoined?: (player: RemotePlayerState) => void;
  public onWorldMonsters?: (monsters: any[]) => void;
  public onWorldMonsterUpdates?: (monsters: any[]) => void;
  public onWorldMonsterRespawned?: (monster: any) => void;
  public onWorldMonsterAttack?: (atk: any) => void;
  public onWorldEliteSpawned?: (elite: any) => void;
  public onPlayerDamaged?: (dmg: any) => void;
  public onPlayerDied?: (deathPayload: any) => void;
  public onPlayerResurrected?: (resurrectPayload: any) => void;
  public onPlayerMoved?: (data: {
    characterId: string;
    x: number;
    y: number;
    animState?: string;
    direction?: string;
    hp?: number;
    maxHp?: number;
  }) => void;
  public onPlayerLeft?: (characterId: string) => void;
  public onPlayerState?: (snapshot: any) => void;
  public onCombatResult?: (result: any) => void;
  public onChatMessage?: (msg: MultiplayerChatMessage) => void;
  public onPartyUpdated?: (party: PartyState | null) => void;
  public onPartyInviteReceived?: (inv: { partyId: string; fromCharacterId: string; fromName: string }) => void;
  public onTradeRequestReceived?: (req: { fromCharacterId: string; fromName: string }) => void;
  public onTradeUpdated?: (session: TradeSessionState) => void;
  public onTradeCompleted?: (session: TradeSessionState) => void;
  public onTradeCancelled?: (data: any) => void;

  public connectAndJoin(characterId: string): Promise<void> {
    const token = getAuthToken();
    if (!token || !characterId) return Promise.resolve();

    this.joinedCharacterId = characterId;
    if (this.socket && this.socket.connected && this.activeToken === token) {
      return new Promise((resolve) => {
        this.socket!.emit('player:join', { characterId }, () => resolve());
      });
    }

    this.disconnect(false);
    this.activeToken = token;
    return new Promise((resolve) => {
      const sock = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1200,
        reconnectionDelayMax: 6000,
      });
      this.socket = sock;

      sock.on('connect', () => {
        this.connected = true;
        this.onConnectionChange?.(true, false);
        if (this.joinedCharacterId) {
          sock.emit('player:join', { characterId: this.joinedCharacterId }, () => resolve());
        } else {
          resolve();
        }
      });

      sock.on('connect_error', () => {
        this.connected = false;
        this.onConnectionChange?.(false, true);
        resolve();
      });

      sock.on('disconnect', () => {
        this.connected = false;
        this.onConnectionChange?.(false, true);
      });

      sock.on('net:pong', (data: { clientTs?: number }) => {
        if (data?.clientTs) {
          this.pingMs = Math.max(1, Math.round(Date.now() - data.clientTs));
          this.onPingUpdate?.(this.pingMs);
        }
      });

      sock.on('world:players', (list: RemotePlayerState[]) => {
        this.onWorldPlayers?.(Array.isArray(list) ? list : []);
      });
      sock.on('world:monsters', (list: any[]) => {
        this.onWorldMonsters?.(Array.isArray(list) ? list : []);
      });
      sock.on('world:monster_updates', (list: any[]) => {
        this.onWorldMonsterUpdates?.(Array.isArray(list) ? list : []);
      });
      sock.on('world:monster_respawned', (mon: any) => {
        if (mon) this.onWorldMonsterRespawned?.(mon);
      });
      sock.on('world:monster_attack', (atk: any) => {
        if (atk) this.onWorldMonsterAttack?.(atk);
      });
      sock.on('world:elite_spawned', (elite: any) => {
        if (elite) this.onWorldEliteSpawned?.(elite);
      });
      sock.on('player:damaged', (dmg: any) => {
        if (dmg) this.onPlayerDamaged?.(dmg);
      });
      sock.on('player:died', (payload: any) => {
        if (payload) this.onPlayerDied?.(payload);
      });
      sock.on('player:resurrected', (payload: any) => {
        if (payload) this.onPlayerResurrected?.(payload);
      });
      sock.on('player:joined', (p: RemotePlayerState) => {
        if (p?.characterId) this.onPlayerJoined?.(p);
      });
      sock.on('player:moved', (d: any) => {
        if (d?.characterId) this.onPlayerMoved?.(d);
      });
      sock.on('player:left', (d: { characterId?: string }) => {
        if (d?.characterId) this.onPlayerLeft?.(d.characterId);
      });
      sock.on('player:state', (snap: any) => this.onPlayerState?.(snap));
      sock.on('combat:result', (res: any) => this.onCombatResult?.(res));
      sock.on('chat:broadcast', (msg: MultiplayerChatMessage) => this.onChatMessage?.(msg));
      sock.on('party:updated', (party: PartyState | null) => this.onPartyUpdated?.(party));
      sock.on('party:invite_received', (inv: any) => this.onPartyInviteReceived?.(inv));
      sock.on('trade:request_received', (req: any) => this.onTradeRequestReceived?.(req));
      sock.on('trade:updated', (s: TradeSessionState) => this.onTradeUpdated?.(s));
      sock.on('trade:completed', (s: TradeSessionState) => this.onTradeCompleted?.(s));
      sock.on('trade:cancelled', (d: any) => this.onTradeCancelled?.(d));

      if (this.pingTimer) window.clearInterval(this.pingTimer);
      this.pingTimer = window.setInterval(() => {
        if (this.socket?.connected) {
          this.socket.emit('net:ping', { ts: Date.now() });
        }
      }, 4000);
    });
  }

  public emitMove(x: number, y: number, animState: string, direction: string) {
    if (!this.socket?.connected || !this.joinedCharacterId) return;
    const now = performance.now();
    if (now - this.lastMoveSentMs < 75) return;
    this.lastMoveSentMs = now;
    this.socket.emit('player:move', { x: Math.round(x), y: Math.round(y), animState, direction });
  }

  public emitCombatAction(
    actionType: 'basic_attack' | 'skill',
    skillId: string | undefined,
    targetId?: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!this.socket?.connected) return Promise.resolve({ success: false, error: 'offline' });
    return new Promise((resolve) => {
      this.socket!.emit('player:combat_action', { actionType, skillId, targetId }, (res: any) => resolve(res || { success: false }));
    });
  }

  public emitChangeRegion(targetRegionId: string) {
    if (!this.socket?.connected) return;
    this.socket.emit('player:change_region', { targetRegionId });
  }

  public emitRespawn(): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!this.socket?.connected) return Promise.resolve({ success: false, error: 'offline' });
    return new Promise((resolve) => {
      this.socket!.emit('player:respawn', {}, (res: any) => resolve(res || { success: false }));
    });
  }

  public emitReportFatal(killerName?: string, reason?: string): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!this.socket?.connected) return Promise.resolve({ success: false, error: 'offline' });
    return new Promise((resolve) => {
      this.socket!.emit('player:report_fatal', { killerName, reason }, (res: any) => resolve(res || { success: false }));
    });
  }

  public sendChat(
    channel: 'general' | 'global' | 'party' | 'whisper' | 'guild' | 'merchant',
    message: string,
    targetName?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.socket?.connected) return Promise.resolve({ success: false, error: 'Chưa kết nối máy chủ.' });
    return new Promise((resolve) => {
      this.socket!.emit('chat:message', { channel, message, targetName }, (res: any) => resolve(res || { success: false }));
    });
  }

  public listOnlinePlayers(regionOnly = false): Promise<RemotePlayerState[]> {
    if (!this.socket?.connected) return Promise.resolve([]);
    return new Promise((resolve) => {
      this.socket!.emit('world:list_players', { regionOnly }, (res: any) => resolve(res?.success ? res.data : []));
    });
  }

  public inspectPlayer(characterId: string): Promise<any> {
    if (!this.socket?.connected) return Promise.resolve(null);
    return new Promise((resolve) => {
      this.socket!.emit('player:inspect', { characterId }, (res: any) => resolve(res?.success ? res.data : null));
    });
  }

  public partyCreate(): Promise<{ success: boolean; data?: PartyState; error?: string }> {
    if (!this.socket?.connected) return Promise.resolve({ success: false, error: 'Chưa kết nối.' });
    return new Promise((resolve) => this.socket!.emit('party:create', {}, resolve));
  }

  public partyInvite(targetIdentifier: string): Promise<{ success: boolean; error?: string }> {
    if (!this.socket?.connected) return Promise.resolve({ success: false, error: 'Chưa kết nối.' });
    return new Promise((resolve) => this.socket!.emit('party:invite', { targetIdentifier }, resolve));
  }

  public partyRespond(partyId: string, accept: boolean): Promise<{ success: boolean; error?: string }> {
    if (!this.socket?.connected) return Promise.resolve({ success: false, error: 'Chưa kết nối.' });
    return new Promise((resolve) => this.socket!.emit('party:respond', { partyId, accept }, resolve));
  }

  public partyLeave(): Promise<{ success: boolean; error?: string }> {
    if (!this.socket?.connected) return Promise.resolve({ success: false, error: 'Chưa kết nối.' });
    return new Promise((resolve) => this.socket!.emit('party:leave', {}, resolve));
  }

  public partyKick(targetCharacterId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.socket?.connected) return Promise.resolve({ success: false, error: 'Chưa kết nối.' });
    return new Promise((resolve) => this.socket!.emit('party:kick', { targetCharacterId }, resolve));
  }

  public tradeRequest(targetIdentifier: string): Promise<{ success: boolean; error?: string }> {
    if (!this.socket?.connected) return Promise.resolve({ success: false, error: 'Chưa kết nối.' });
    return new Promise((resolve) => this.socket!.emit('trade:request', { targetIdentifier }, resolve));
  }

  public tradeRespond(fromCharacterId: string, accept: boolean): Promise<{ success: boolean; data?: TradeSessionState; error?: string }> {
    if (!this.socket?.connected) return Promise.resolve({ success: false, error: 'Chưa kết nối.' });
    return new Promise((resolve) => this.socket!.emit('trade:respond', { fromCharacterId, accept }, resolve));
  }

  public tradeUpdateOffer(
    tradeId: string,
    gold: number,
    items: Array<{ itemId: string; quantity: number }>
  ): Promise<{ success: boolean; data?: TradeSessionState; error?: string }> {
    if (!this.socket?.connected) return Promise.resolve({ success: false, error: 'Chưa kết nối.' });
    return new Promise((resolve) => this.socket!.emit('trade:update_offer', { tradeId, gold, items }, resolve));
  }

  public tradeLock(tradeId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.socket?.connected) return Promise.resolve({ success: false, error: 'Chưa kết nối.' });
    return new Promise((resolve) => this.socket!.emit('trade:lock', { tradeId }, resolve));
  }

  public tradeConfirm(tradeId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.socket?.connected) return Promise.resolve({ success: false, error: 'Chưa kết nối.' });
    return new Promise((resolve) => this.socket!.emit('trade:confirm', { tradeId }, resolve));
  }

  public tradeCancel(tradeId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.socket?.connected) return Promise.resolve({ success: false, error: 'Chưa kết nối.' });
    return new Promise((resolve) => this.socket!.emit('trade:cancel', { tradeId }, resolve));
  }

  public disconnect(clearChar = true) {
    if (clearChar) this.joinedCharacterId = null;
    if (this.pingTimer) {
      window.clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connected = false;
  }
}
