import { randomUUID } from 'crypto';
import {
  INITIAL_ITEMS,
  SECOND_JOB_SPECIALIZATIONS,
} from '@elysia/game-data-schema';
import {
  PartyMemberView,
  PartyState,
  TradeOfferSide,
  TradeSessionState,
} from '@elysia/game-types';
import { JsonStore } from '../database/jsonStore.js';
import { CombatService } from './combat.service.js';
import { WorldService } from './world.service.js';

interface InternalParty {
  partyId: string;
  leaderCharacterId: string;
  memberIds: string[];
}

interface InternalTrade {
  tradeId: string;
  status: 'active' | 'completed' | 'cancelled';
  parties: [TradeOfferSide, TradeOfferSide];
}

export class SocialService {
  private static instance: SocialService;
  private store = JsonStore.getInstance();
  private combat = CombatService.getSharedInstance();
  private world = WorldService.getInstance();

  private onlineSockets = new Map<string, string>(); // characterId -> socketId
  private parties = new Map<string, InternalParty>();
  private charParty = new Map<string, string>(); // characterId -> partyId
  private pendingPartyInvites = new Map<string, { partyId: string; fromId: string; fromName: string; expiresAt: number }>();

  private activeTrades = new Map<string, InternalTrade>();
  private charTrade = new Map<string, string>(); // characterId -> tradeId
  private pendingTradeRequests = new Map<string, { fromId: string; fromName: string; expiresAt: number }>();

  public static getInstance(): SocialService {
    if (!SocialService.instance) {
      SocialService.instance = new SocialService();
    }
    return SocialService.instance;
  }

  public setOnline(characterId: string, socketId: string) {
    this.onlineSockets.set(characterId, socketId);
  }

  public setOffline(characterId: string) {
    this.onlineSockets.delete(characterId);
    const tradeId = this.charTrade.get(characterId);
    if (tradeId) {
      this.cancelTrade(characterId, tradeId);
    }
  }

  public isOnline(characterId: string): boolean {
    return this.onlineSockets.has(characterId);
  }

  public getSocketId(characterId: string): string | undefined {
    return this.onlineSockets.get(characterId);
  }

  public listOnlinePlayers(filterRegionId?: string) {
    const out: any[] = [];
    for (const charId of this.onlineSockets.keys()) {
      const p = this.combat.getPlayer(charId);
      const ch = p?.character || this.store.characters.find((c) => c.id === charId);
      if (!ch) continue;
      const regionId = p?.regionId || ch.regionId || 'THON_KHOI_NGUYEN';
      if (filterRegionId && regionId !== filterRegionId) continue;
      out.push({
        characterId: ch.id,
        name: ch.name,
        level: ch.level,
        classId: ch.classId,
        secondJobName: ch.secondJobName,
        gender: ch.gender,
        regionId,
        x: p?.x ?? ch.x ?? 552,
        y: p?.y ?? ch.y ?? 984,
        hp: p?.hp ?? ch.hp ?? 100,
        maxHp: p?.maxHp ?? ch.maxHp ?? 100,
      });
    }
    return out;
  }

  public inspectPlayer(targetCharacterId: string) {
    const ch = this.store.characters.find((c) => c.id === targetCharacterId);
    if (!ch) throw new Error('Không tìm thấy người chơi để kiểm tra.');
    const live = this.combat.getPlayer(targetCharacterId);
    const secondJob = ch.secondJobId
      ? SECOND_JOB_SPECIALIZATIONS.find((s) => s.id === ch.secondJobId)
      : undefined;
    return {
      characterId: ch.id,
      name: ch.name,
      gender: ch.gender,
      level: ch.level,
      classId: ch.classId,
      secondJobName: secondJob?.nameVi || ch.secondJobName || null,
      appearance: ch.appearance,
      equipment: ch.equipment || {},
      baseStats: ch.baseStats || ch.attributes,
      unlockedTitles: ch.unlockedTitles || [],
      equippedCosmeticTitleId: ch.equippedCosmeticTitleId || null,
      hp: live?.hp ?? ch.hp ?? 100,
      maxHp: live?.maxHp ?? ch.maxHp ?? 100,
      mp: live?.mp ?? ch.mp ?? 50,
      maxMp: live?.maxMp ?? ch.maxMp ?? 50,
      atk: live?.atk,
      def: live?.def,
      regionId: live?.regionId || ch.regionId || 'THON_KHOI_NGUYEN',
      online: this.isOnline(ch.id),
    };
  }

  // =========================================================================
  // PARTY MANAGEMENT
  // =========================================================================

  public getPartyForCharacter(characterId: string): PartyState | null {
    const pid = this.charParty.get(characterId);
    if (!pid) return null;
    return this.buildPartyState(pid);
  }

  public getPartyMemberIds(characterId: string): string[] {
    const pid = this.charParty.get(characterId);
    if (!pid) return [];
    const p = this.parties.get(pid);
    return p ? [...p.memberIds] : [];
  }

  private buildPartyState(partyId: string): PartyState | null {
    const p = this.parties.get(partyId);
    if (!p) return null;
    const members: PartyMemberView[] = p.memberIds
      .map((cid) => {
        const ch = this.store.characters.find((c) => c.id === cid);
        if (!ch) return null;
        const live = this.combat.getPlayer(cid);
        return {
          characterId: cid,
          name: ch.name,
          classId: ch.classId,
          level: ch.level,
          regionId: live?.regionId || ch.regionId || 'THON_KHOI_NGUYEN',
          hp: live?.hp ?? ch.hp ?? 100,
          maxHp: live?.maxHp ?? ch.maxHp ?? 100,
          mp: live?.mp ?? ch.mp ?? 50,
          maxMp: live?.maxMp ?? ch.maxMp ?? 50,
          online: this.isOnline(cid),
          isLeader: cid === p.leaderCharacterId,
        };
      })
      .filter((m): m is PartyMemberView => Boolean(m));

    return {
      partyId: p.partyId,
      leaderCharacterId: p.leaderCharacterId,
      members,
    };
  }

  public createParty(leaderCharacterId: string): PartyState {
    if (this.charParty.has(leaderCharacterId)) {
      return this.getPartyForCharacter(leaderCharacterId)!;
    }
    const partyId = `PTY_${randomUUID().slice(0, 8)}`;
    this.parties.set(partyId, {
      partyId,
      leaderCharacterId,
      memberIds: [leaderCharacterId],
    });
    this.charParty.set(leaderCharacterId, partyId);
    return this.buildPartyState(partyId)!;
  }

  public inviteToParty(fromCharacterId: string, targetIdentifier: string) {
    const sender = this.store.characters.find((c) => c.id === fromCharacterId);
    if (!sender) throw new Error('Không tìm thấy người gửi lời mời.');
    const target = this.store.characters.find(
      (c) => c.id === targetIdentifier || c.name.toLowerCase() === targetIdentifier.trim().toLowerCase()
    );
    if (!target) throw new Error('Không tìm thấy người chơi được mời.');
    if (target.id === fromCharacterId) throw new Error('Không thể tự mời chính mình.');
    if (!this.isOnline(target.id)) throw new Error(`Người chơi ${target.name} hiện không trực tuyến.`);
    if (this.charParty.has(target.id)) throw new Error(`${target.name} đã ở trong một tổ đội khác.`);

    let partyId = this.charParty.get(fromCharacterId);
    if (!partyId) {
      const created = this.createParty(fromCharacterId);
      partyId = created.partyId;
    }
    const party = this.parties.get(partyId)!;
    if (party.leaderCharacterId !== fromCharacterId) {
      throw new Error('Chỉ Đội Trưởng mới có quyền mời thành viên mới.');
    }
    if (party.memberIds.length >= 5) {
      throw new Error('Tổ đội đã đạt giới hạn tối đa 5 thành viên.');
    }

    this.pendingPartyInvites.set(target.id, {
      partyId,
      fromId: sender.id,
      fromName: sender.name,
      expiresAt: Date.now() + 60_000,
    });
    return {
      partyId,
      targetCharacterId: target.id,
      targetName: target.name,
      fromCharacterId: sender.id,
      fromName: sender.name,
    };
  }

  public respondPartyInvite(targetCharacterId: string, partyId: string, accept: boolean) {
    const inv = this.pendingPartyInvites.get(targetCharacterId);
    if (!inv || inv.partyId !== partyId || inv.expiresAt < Date.now()) {
      this.pendingPartyInvites.delete(targetCharacterId);
      throw new Error('Lời mời vào tổ đội không tồn tại hoặc đã hết hạn.');
    }
    this.pendingPartyInvites.delete(targetCharacterId);
    if (!accept) {
      return { accepted: false, fromId: inv.fromId, partyState: null };
    }
    if (this.charParty.has(targetCharacterId)) {
      throw new Error('Bạn đã thuộc một tổ đội khác.');
    }
    const party = this.parties.get(partyId);
    if (!party || party.memberIds.length >= 5) {
      throw new Error('Tổ đội không còn khả dụng hoặc đã đầy.');
    }
    party.memberIds.push(targetCharacterId);
    this.charParty.set(targetCharacterId, partyId);
    return { accepted: true, fromId: inv.fromId, partyState: this.buildPartyState(partyId)! };
  }

  public leaveParty(characterId: string): { previousMemberIds: string[]; partyState: PartyState | null } {
    const pid = this.charParty.get(characterId);
    if (!pid) return { previousMemberIds: [], partyState: null };
    const party = this.parties.get(pid);
    this.charParty.delete(characterId);
    if (!party) return { previousMemberIds: [], partyState: null };

    const previousMemberIds = [...party.memberIds];
    party.memberIds = party.memberIds.filter((id) => id !== characterId);
    if (party.memberIds.length === 0) {
      this.parties.delete(pid);
      return { previousMemberIds, partyState: null };
    }
    if (party.leaderCharacterId === characterId) {
      party.leaderCharacterId = party.memberIds[0];
    }
    return { previousMemberIds, partyState: this.buildPartyState(pid) };
  }

  public kickFromParty(leaderId: string, targetId: string) {
    const pid = this.charParty.get(leaderId);
    if (!pid) throw new Error('Bạn chưa tham gia tổ đội nào.');
    const party = this.parties.get(pid);
    if (!party || party.leaderCharacterId !== leaderId) {
      throw new Error('Chỉ Đội Trưởng mới có quyền đuổi thành viên.');
    }
    if (leaderId === targetId) throw new Error('Hãy dùng chức năng Rời Tổ Đội thay vì tự đuổi.');
    if (!party.memberIds.includes(targetId)) throw new Error('Thành viên không nằm trong tổ đội.');
    return this.leaveParty(targetId);
  }

  // =========================================================================
  // SERVER-AUTHORITATIVE ATOMIC TRADE SYSTEM
  // =========================================================================

  private getMergedItems() {
    const map = new Map<string, any>();
    for (const it of INITIAL_ITEMS) map.set(it.id, it);
    for (const it of this.world.getWorldItems(false)) map.set(it.id, it);
    for (const it of this.world.getUniqueEquipment(false)) map.set(it.id, it);
    for (const it of this.store.items) map.set(it.id, it);
    return map;
  }

  public requestTrade(fromCharacterId: string, targetIdentifier: string) {
    const fromChar = this.store.characters.find((c) => c.id === fromCharacterId);
    if (!fromChar) throw new Error('Không tìm thấy nhân vật gửi yêu cầu.');
    const target = this.store.characters.find(
      (c) => c.id === targetIdentifier || c.name.toLowerCase() === targetIdentifier.trim().toLowerCase()
    );
    if (!target) throw new Error('Không tìm thấy người chơi để giao dịch.');
    if (target.id === fromCharacterId) throw new Error('Không thể tự giao dịch với chính mình.');
    if (!this.isOnline(target.id)) throw new Error(`${target.name} hiện không trực tuyến.`);
    if (this.charTrade.has(fromCharacterId) || this.charTrade.has(target.id)) {
      throw new Error('Một trong hai người chơi đang trong phiên giao dịch khác.');
    }

    const fromLive = this.combat.getPlayer(fromCharacterId);
    const targetLive = this.combat.getPlayer(target.id);
    const regA = fromLive?.regionId || fromChar.regionId;
    const regB = targetLive?.regionId || target.regionId;
    if (regA !== regB) {
      throw new Error('Hai người chơi phải đứng cùng bản đồ để mở giao dịch.');
    }

    this.pendingTradeRequests.set(target.id, {
      fromId: fromChar.id,
      fromName: fromChar.name,
      expiresAt: Date.now() + 45_000,
    });
    return {
      fromCharacterId: fromChar.id,
      fromName: fromChar.name,
      targetCharacterId: target.id,
      targetName: target.name,
    };
  }

  public respondTradeRequest(targetCharacterId: string, fromCharacterId: string, accept: boolean): TradeSessionState | null {
    const req = this.pendingTradeRequests.get(targetCharacterId);
    if (!req || req.fromId !== fromCharacterId || req.expiresAt < Date.now()) {
      this.pendingTradeRequests.delete(targetCharacterId);
      throw new Error('Lời mời giao dịch không tồn tại hoặc đã hết hạn.');
    }
    this.pendingTradeRequests.delete(targetCharacterId);
    if (!accept) return null;

    if (this.charTrade.has(fromCharacterId) || this.charTrade.has(targetCharacterId)) {
      throw new Error('Một trong hai người chơi đã tham gia phiên giao dịch khác.');
    }
    const charA = this.store.characters.find((c) => c.id === fromCharacterId);
    const charB = this.store.characters.find((c) => c.id === targetCharacterId);
    if (!charA || !charB) throw new Error('Dữ liệu nhân vật không hợp lệ.');

    const tradeId = `TRD_${randomUUID().slice(0, 8)}`;
    const session: InternalTrade = {
      tradeId,
      status: 'active',
      parties: [
        { characterId: charA.id, characterName: charA.name, gold: 0, items: [], locked: false, confirmed: false },
        { characterId: charB.id, characterName: charB.name, gold: 0, items: [], locked: false, confirmed: false },
      ],
    };
    this.activeTrades.set(tradeId, session);
    this.charTrade.set(charA.id, tradeId);
    this.charTrade.set(charB.id, tradeId);
    return session;
  }

  private getActiveTradeFor(characterId: string, tradeId?: string): { session: InternalTrade; myIdx: 0 | 1; otherIdx: 0 | 1 } {
    const resolvedId = tradeId || this.charTrade.get(characterId);
    if (!resolvedId) throw new Error('Không tìm thấy phiên giao dịch đang mở.');
    const session = this.activeTrades.get(resolvedId);
    if (!session || session.status !== 'active') throw new Error('Phiên giao dịch không còn hoạt động.');
    const myIdx = session.parties[0].characterId === characterId ? 0 : session.parties[1].characterId === characterId ? 1 : -1;
    if (myIdx === -1) throw new Error('Bạn không thuộc phiên giao dịch này.');
    return { session, myIdx: myIdx as 0 | 1, otherIdx: (myIdx === 0 ? 1 : 0) as 0 | 1 };
  }

  public updateTradeOffer(
    characterId: string,
    tradeId: string | undefined,
    offer: { gold?: number; items?: Array<{ itemId: string; quantity: number }> }
  ): TradeSessionState {
    const { session, myIdx, otherIdx } = this.getActiveTradeFor(characterId, tradeId);
    const ch = this.store.characters.find((c) => c.id === characterId);
    if (!ch) throw new Error('Không tìm thấy nhân vật.');

    const gold = offer.gold !== undefined ? Number(offer.gold) : session.parties[myIdx].gold;
    if (!Number.isInteger(gold) || gold < 0 || gold > Number(ch.gold || 0)) {
      throw new Error('Số Vàng giao dịch không hợp lệ hoặc vượt quá số dư hiện có.');
    }

    const itemsCatalog = this.getMergedItems();
    const cleanedItems: Array<{ itemId: string; name?: string; quantity: number }> = [];
    const requestedTotals = new Map<string, number>();

    for (const rawItem of offer.items || []) {
      const itemId = String(rawItem?.itemId || '').trim();
      const qty = Number(rawItem?.quantity || 0);
      if (!itemId || !Number.isInteger(qty) || qty <= 0) {
        throw new Error('Vật phẩm hoặc số lượng đưa vào giao dịch không hợp lệ.');
      }
      requestedTotals.set(itemId, (requestedTotals.get(itemId) || 0) + qty);
    }

    for (const [itemId, totalQty] of requestedTotals.entries()) {
      const ownedSlots = (ch.inventory || []).filter((s: any) => (s.itemId || s.item_id) === itemId);
      const ownedQty = ownedSlots.reduce((sum: number, s: any) => sum + Number(s.quantity ?? s.qty ?? 0), 0);
      if (ownedQty < totalQty) {
        throw new Error(`Không đủ số lượng vật phẩm "${itemId}" trong hành trang.`);
      }
      const def = itemsCatalog.get(itemId);
      if (
        itemId.startsWith('UEQ_') ||
        itemId === 'ITEM_AWAKENING_CERTIFICATE' ||
        def?.isCharacterBound ||
        def?.isAccountBound ||
        def?.isTradable === false ||
        def?.tradable === false ||
        ownedSlots.some((s: any) => s.boundCharacterId || s.boundUserId || s.isBound)
      ) {
        throw new Error(`Vật phẩm "${def?.name || itemId}" bị khóa, không thể giao dịch.`);
      }
      cleanedItems.push({ itemId, name: def?.name || itemId, quantity: totalQty });
    }

    session.parties[myIdx].gold = gold;
    session.parties[myIdx].items = cleanedItems;
    // Anti-scam safeguard: modifying an offer automatically unlocks BOTH sides
    session.parties[myIdx].locked = false;
    session.parties[myIdx].confirmed = false;
    session.parties[otherIdx].locked = false;
    session.parties[otherIdx].confirmed = false;
    return session;
  }

  public lockTrade(characterId: string, tradeId?: string): TradeSessionState {
    const { session, myIdx } = this.getActiveTradeFor(characterId, tradeId);
    session.parties[myIdx].locked = true;
    return session;
  }

  public confirmTrade(characterId: string, tradeId?: string): { completed: boolean; session: TradeSessionState } {
    const { session, myIdx, otherIdx } = this.getActiveTradeFor(characterId, tradeId);
    if (!session.parties[myIdx].locked || !session.parties[otherIdx].locked) {
      throw new Error('Cả hai người chơi cần Khóa vật phẩm trước khi xác nhận giao dịch.');
    }
    session.parties[myIdx].confirmed = true;

    if (!session.parties[otherIdx].confirmed) {
      return { completed: false, session };
    }

    const sideA = session.parties[0];
    const sideB = session.parties[1];
    const charA = this.store.characters.find((c) => c.id === sideA.characterId);
    const charB = this.store.characters.find((c) => c.id === sideB.characterId);
    if (!charA || !charB) throw new Error('Không tìm thấy nhân vật thực hiện giao dịch.');

    const rollbackA = { gold: charA.gold, inventory: JSON.parse(JSON.stringify(charA.inventory || [])) };
    const rollbackB = { gold: charB.gold, inventory: JSON.parse(JSON.stringify(charB.inventory || [])) };

    try {
      const deductOffer = (fromChar: any, toChar: any, side: TradeOfferSide) => {
        if (Number(fromChar.gold || 0) < side.gold) {
          throw new Error(`${fromChar.name} không đủ Vàng để hoàn tất giao dịch.`);
        }
        fromChar.gold = Number(fromChar.gold || 0) - side.gold;
        toChar.gold = Number(toChar.gold || 0) + side.gold;

        if (!Array.isArray(fromChar.inventory)) fromChar.inventory = [];
        if (!Array.isArray(toChar.inventory)) toChar.inventory = [];

        for (const row of side.items) {
          let remaining = row.quantity;
          for (let i = fromChar.inventory.length - 1; i >= 0 && remaining > 0; i--) {
            const slot = fromChar.inventory[i];
            if ((slot.itemId || slot.item_id) !== row.itemId) continue;
            const take = Math.min(remaining, Number(slot.quantity ?? slot.qty ?? 0));
            const nextQty = Number(slot.quantity ?? slot.qty ?? 0) - take;
            if (nextQty <= 0) fromChar.inventory.splice(i, 1);
            else slot.quantity = nextQty;
            remaining -= take;
          }
          if (remaining > 0) {
            throw new Error(`${fromChar.name} thiếu vật phẩm "${row.itemId}" khi hoàn tất giao dịch.`);
          }
          const existingDest = toChar.inventory.find((s: any) => (s.itemId || s.item_id) === row.itemId && !s.boundCharacterId);
          if (existingDest) {
            existingDest.quantity = Number(existingDest.quantity ?? existingDest.qty ?? 0) + row.quantity;
          } else {
            toChar.inventory.push({ slotId: toChar.inventory.length, itemId: row.itemId, quantity: row.quantity });
          }
        }
      };

      deductOffer(charA, charB, sideA);
      deductOffer(charB, charA, sideB);

      session.status = 'completed';
      this.charTrade.delete(charA.id);
      this.charTrade.delete(charB.id);
      this.activeTrades.delete(session.tradeId);
      this.store.save();
      return { completed: true, session };
    } catch (err) {
      charA.gold = rollbackA.gold;
      charA.inventory = rollbackA.inventory;
      charB.gold = rollbackB.gold;
      charB.inventory = rollbackB.inventory;
      throw err;
    }
  }

  public cancelTrade(characterId: string, tradeId?: string): TradeSessionState | null {
    const resolvedId = tradeId || this.charTrade.get(characterId);
    if (!resolvedId) return null;
    const session = this.activeTrades.get(resolvedId);
    if (!session) return null;
    session.status = 'cancelled';
    this.charTrade.delete(session.parties[0].characterId);
    this.charTrade.delete(session.parties[1].characterId);
    this.activeTrades.delete(resolvedId);
    return session;
  }
}
