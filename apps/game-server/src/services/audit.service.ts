import { randomUUID } from 'crypto';
import {
  INITIAL_ITEMS,
  ORGANIZATION_AND_PROFESSION_ITEM_CATALOG,
  PROFESSION_MATERIALS,
  PROFESSION_TOOLS,
} from '@elysia/game-data-schema';
import { EconomyAuditLog, ItemQuality } from '@elysia/game-types';
import { JsonStore } from '../database/jsonStore.js';
import { WorldService } from './world.service.js';

/**
 * Centralized server-authoritative concurrency locks, atomic gold/inventory
 * mutations, rate limits, idempotency replay guard, and audit trail.
 */
export class AuditSecurityService {
  private static instance: AuditSecurityService;
  private store = JsonStore.getInstance();
  private world = WorldService.getInstance();
  private entityLocks = new Set<string>();
  private rateBuckets = new Map<string, number[]>();

  public static getInstance(): AuditSecurityService {
    if (!AuditSecurityService.instance) {
      AuditSecurityService.instance = new AuditSecurityService();
    }
    return AuditSecurityService.instance;
  }

  /**
   * Enforces strict mutual exclusion on one or more lock keys (sorted to avoid deadlocks).
   */
  public async withLocks<T>(keys: string[], fn: () => Promise<T> | T): Promise<T> {
    const sorted = Array.from(new Set(keys.filter(Boolean))).sort();
    for (const k of sorted) {
      if (this.entityLocks.has(k)) {
        throw new Error('Giao dịch khác đang xử lý trên tài nguyên này. Vui lòng thử lại.');
      }
    }
    for (const k of sorted) this.entityLocks.add(k);
    try {
      return await fn();
    } finally {
      for (const k of sorted) this.entityLocks.delete(k);
    }
  }

  public enforceRateLimit(bucketKey: string, maxActions = 20, windowMs = 5000) {
    const now = Date.now();
    const list = (this.rateBuckets.get(bucketKey) || []).filter((ts) => now - ts < windowMs);
    if (list.length >= maxActions) {
      throw new Error('Thao tác quá nhanh. Hệ thống bảo vệ chống spam đã tạm chặn yêu cầu.');
    }
    list.push(now);
    this.rateBuckets.set(bucketKey, list);
  }

  public claimIdempotencyKey(txId?: string): string {
    const resolved = txId ? String(txId).trim() : `TX_${randomUUID()}`;
    if (txId && this.store.processedTxIds.includes(resolved)) {
      throw new Error(`Giao dịch trùng lặp đã được xử lý trước đó (${resolved}).`);
    }
    if (txId) {
      this.store.processedTxIds.push(resolved);
      if (this.store.processedTxIds.length > 500) {
        this.store.processedTxIds.splice(0, this.store.processedTxIds.length - 500);
      }
    }
    return resolved;
  }

  public getItemCatalogMap(): Map<string, any> {
    const map = new Map<string, any>();
    for (const it of INITIAL_ITEMS) map.set(it.id, it);
    for (const m of PROFESSION_MATERIALS) {
      map.set(m.id, { ...m, category: 'material', stackable: true, stackLimit: m.stackLimit, isTradable: true });
    }
    for (const t of PROFESSION_TOOLS) {
      map.set(t.id, { ...t, category: 'tool', stackable: false, isTradable: true });
    }
    for (const it of ORGANIZATION_AND_PROFESSION_ITEM_CATALOG) map.set(it.id, it);
    for (const it of this.world.getWorldItems(false)) map.set(it.id, it);
    for (const it of this.store.items) map.set(it.id, it);
    return map;
  }

  public countItem(char: any, itemId: string, minQuality?: ItemQuality): number {
    const tierOrder: Record<string, number> = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 };
    const reqTier = minQuality ? tierOrder[minQuality] || 1 : 0;
    return (char.inventory || []).reduce((sum: number, s: any) => {
      if ((s.itemId || s.item_id) !== itemId) return sum;
      if (reqTier > 0) {
        const slotTier = tierOrder[String(s.quality || s.rarity || 'common')] || 1;
        if (slotTier < reqTier) return sum;
      }
      return sum + Number(s.quantity ?? s.qty ?? 1);
    }, 0);
  }

  public consumeItem(char: any, itemId: string, needed: number, minQuality?: ItemQuality): { consumedQualities: ItemQuality[] } {
    if (!Number.isInteger(needed) || needed <= 0) throw new Error('Số lượng vật phẩm tiêu thụ không hợp lệ.');
    const tierOrder: Record<string, number> = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 };
    const reqTier = minQuality ? tierOrder[minQuality] || 1 : 0;
    const inv: any[] = char.inventory || [];
    let remaining = needed;
    const consumedQualities: ItemQuality[] = [];

    for (let i = inv.length - 1; i >= 0 && remaining > 0; i--) {
      const slot = inv[i];
      if ((slot.itemId || slot.item_id) !== itemId) continue;
      const q = (slot.quality || slot.rarity || 'common') as ItemQuality;
      if (reqTier > 0 && (tierOrder[q] || 1) < reqTier) continue;
      const qty = Number(slot.quantity ?? slot.qty ?? 1);
      if (qty <= remaining) {
        consumedQualities.push(q);
        remaining -= qty;
        inv.splice(i, 1);
      } else {
        consumedQualities.push(q);
        slot.quantity = qty - remaining;
        remaining = 0;
      }
    }
    if (remaining > 0) {
      throw new Error(`Không đủ "${itemId}" (cần ${needed}) trong hành trang.`);
    }
    return { consumedQualities };
  }

  public grantItem(char: any, itemId: string, quantity: number, extra?: { quality?: ItemQuality; rarity?: string; name?: string }) {
    if (!Number.isInteger(quantity) || quantity <= 0) throw new Error('Số lượng vật phẩm cấp phát không hợp lệ.');
    if (!Array.isArray(char.inventory)) char.inventory = [];
    const catalog = this.getItemCatalogMap();
    const meta = catalog.get(itemId);
    const quality = extra?.quality || (meta?.rarity as ItemQuality) || 'common';
    const stackable = meta?.stackable !== false && meta?.category !== 'equip' && meta?.category !== 'tool' && !itemId.startsWith('UEQ_');
    const maxStack = Math.max(1, Number(meta?.stackLimit ?? 99));

    if (stackable) {
      let rem = quantity;
      for (const s of char.inventory) {
        if ((s.itemId || s.item_id) !== itemId) continue;
        if (s.quality && quality && s.quality !== quality) continue;
        const curQty = Number(s.quantity ?? s.qty ?? 0);
        if (curQty >= maxStack) continue;
        const add = Math.min(rem, maxStack - curQty);
        s.quantity = curQty + add;
        rem -= add;
        if (rem <= 0) break;
      }
      while (rem > 0) {
        const add = Math.min(rem, maxStack);
        char.inventory.push({
          slotId: char.inventory.length,
          itemId,
          name: extra?.name || meta?.nameVi || meta?.name || itemId,
          category: meta?.category || 'material',
          quality,
          rarity: extra?.rarity || quality,
          quantity: add,
        });
        rem -= add;
      }
      return;
    }

    for (let i = 0; i < quantity; i++) {
      char.inventory.push({
        slotId: char.inventory.length,
        itemId,
        name: extra?.name || meta?.nameVi || meta?.name || itemId,
        category: meta?.category || 'equip',
        quality,
        rarity: extra?.rarity || quality,
        quantity: 1,
      });
    }
  }

  public deductGold(char: any, amount: number, reason = 'giao dịch') {
    const val = Math.floor(Number(amount));
    if (!Number.isFinite(val) || val < 0) throw new Error('Số Vàng không hợp lệ.');
    if (Number(char.gold || 0) < val) {
      throw new Error(`Không đủ Vàng cho ${reason} (cần ${val.toLocaleString()} G, hiện có ${Number(char.gold || 0).toLocaleString()} G).`);
    }
    char.gold = Number(char.gold || 0) - val;
  }

  public addGold(char: any, amount: number) {
    const val = Math.floor(Number(amount));
    if (!Number.isFinite(val) || val < 0) throw new Error('Số Vàng cộng không hợp lệ.');
    char.gold = Number(char.gold || 0) + val;
  }

  public isTradableItem(char: any, itemId: string): boolean {
    if (itemId.startsWith('UEQ_') || itemId === 'ITEM_AWAKENING_CERTIFICATE') return false;
    const def = this.getItemCatalogMap().get(itemId);
    if (def?.isCharacterBound || def?.isAccountBound || def?.isTradable === false || def?.tradable === false) return false;
    const slots = (char.inventory || []).filter((s: any) => (s.itemId || s.item_id) === itemId);
    if (slots.some((s: any) => s.boundCharacterId || s.boundUserId || s.isBound)) return false;
    return true;
  }

  public recordAudit(entry: Omit<EconomyAuditLog, 'id' | 'timestamp'>) {
    const row: EconomyAuditLog = {
      id: `AUD_${randomUUID().slice(0, 10)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    this.store.auditLogs.push(row);
    if (this.store.auditLogs.length > 2000) {
      this.store.auditLogs.splice(0, this.store.auditLogs.length - 2000);
    }
    return row;
  }

  public listAuditLogs(limit = 50, category?: EconomyAuditLog['category']): EconomyAuditLog[] {
    const rows = category ? this.store.auditLogs.filter((l) => l.category === category) : this.store.auditLogs;
    return rows.slice(-Math.max(1, Math.min(200, limit))).reverse();
  }
}
