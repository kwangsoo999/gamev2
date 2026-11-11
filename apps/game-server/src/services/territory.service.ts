import { randomUUID } from 'crypto';
import { TERRITORY_DEFINITIONS } from '@elysia/game-data-schema';
import { TerritoryRuntimeState } from '@elysia/game-types';
import { JsonStore } from '../database/jsonStore.js';
import { AuditSecurityService } from './audit.service.js';

export class TerritoryService {
  private static instance: TerritoryService;
  private store = JsonStore.getInstance();
  private audit = AuditSecurityService.getInstance();

  public static getInstance(): TerritoryService {
    if (!TerritoryService.instance) {
      TerritoryService.instance = new TerritoryService();
    }
    return TerritoryService.instance;
  }

  public ensureTerritoriesSeeded(): TerritoryRuntimeState[] {
    if (this.store.territories.length === 0) {
      for (const def of TERRITORY_DEFINITIONS) {
        this.store.territories.push({
          territoryId: def.id,
          name: def.name,
          nameVi: def.nameVi,
          mapId: def.mapId,
          territoryType: def.territoryType,
          ownerGuildId: null,
          ownerGuildName: null,
          defensePoints: def.baseCaptureDefense,
          maxDefensePoints: def.baseCaptureDefense,
          taxRatePct: Math.min(5, def.maxTaxRatePct),
          maxTaxRatePct: def.maxTaxRatePct,
          accumulatedTaxGold: 0,
          seasonNumber: 1,
          capturedAt: null,
          buildings: [
            { id: 'tb_wall', nameVi: 'Thành Lũy Phòng Thủ', level: 1, maxLevel: 5 },
            { id: 'tb_outpost', nameVi: 'Trạm Tài Nguyên Bang Hội', level: 1, maxLevel: 5 },
          ],
        });
      }
      this.store.save();
    }
    return this.store.territories;
  }

  public listTerritories() {
    this.ensureTerritoriesSeeded();
    return this.store.territories.map((t: TerritoryRuntimeState) => {
      const def = TERRITORY_DEFINITIONS.find((d) => d.id === t.territoryId);
      return {
        ...t,
        publicDailyGatherQuota: def?.publicDailyGatherQuota ?? 40,
        bonusYieldForOwnerPct: def?.bonusYieldForOwnerPct ?? 20,
        npcStewardName: def?.npcStewardName ?? 'Quan Quản Lý Lãnh Thổ',
      };
    });
  }

  public async siegeOrCaptureTerritory(charId: string, territoryId: string, siegePower = 600) {
    return this.audit.withLocks([`char:${charId}`, `terr:${territoryId}`], () => {
      this.ensureTerritoriesSeeded();
      const ch = this.store.characters.find((c) => c.id === charId);
      if (!ch || !ch.guildId) throw new Error('Bạn phải ở trong một Bang Hội để tranh đoạt Lãnh Thổ!');
      const guild = this.store.guilds.find((g) => g.id === ch.guildId);
      if (!guild) throw new Error('Không tìm thấy Bang Hội.');

      const member = guild.members.find((m: any) => m.characterId === charId);
      const rank = guild.ranks.find((r: any) => r.id === member?.rankId);
      if (!rank || !rank.permissions.includes('MANAGE_TERRITORY')) {
        throw new Error('Cần quyền MANAGE_TERRITORY (Bang Chủ / Phó Bang) để phát động chiếm Lãnh Thổ.');
      }

      const terr: TerritoryRuntimeState | undefined = this.store.territories.find((t) => t.territoryId === territoryId);
      if (!terr) throw new Error('Lãnh thổ không tồn tại.');
      if (terr.ownerGuildId === guild.id) {
        throw new Error('Bang Hội của bạn đã làm chủ lãnh thổ này rồi.');
      }

      const dmg = Math.max(100, Math.min(2000, Math.round(siegePower + (guild.level - 1) * 150)));
      terr.defensePoints = Math.max(0, terr.defensePoints - dmg);

      let captured = false;
      if (terr.defensePoints === 0) {
        captured = true;
        // Remove territory from previous owner cleanly
        if (terr.ownerGuildId) {
          const prevOwner = this.store.guilds.find((g) => g.id === terr.ownerGuildId);
          if (prevOwner) {
            prevOwner.controlledTerritoryIds = (prevOwner.controlledTerritoryIds || []).filter((id: string) => id !== territoryId);
          }
        }
        terr.ownerGuildId = guild.id;
        terr.ownerGuildName = guild.name;
        terr.defensePoints = terr.maxDefensePoints;
        terr.capturedAt = new Date().toISOString();
        if (!Array.isArray(guild.controlledTerritoryIds)) guild.controlledTerritoryIds = [];
        if (!guild.controlledTerritoryIds.includes(territoryId)) {
          guild.controlledTerritoryIds.push(territoryId);
        }
        guild.seasonPoints += 300;
      }

      this.audit.recordAudit({
        txId: `TERR_SIEGE_${randomUUID().slice(0, 8)}`,
        category: 'territory',
        actorCharacterId: charId,
        goldDelta: 0,
        details: captured
          ? `Bang [${guild.tag}] ${guild.name} đã chiếm đóng ${terr.nameVi}!`
          : `Bang [${guild.tag}] công phá ${terr.nameVi} (-${dmg} phòng thủ, còn ${terr.defensePoints})`,
      });
      this.store.save();
      return { territory: terr, captured, guild };
    });
  }

  public async setTerritoryTaxAndCollect(charId: string, territoryId: string, nextTaxRatePct?: number, collectTax = false) {
    return this.audit.withLocks([`terr:${territoryId}`], () => {
      const terr: TerritoryRuntimeState | undefined = this.store.territories.find((t) => t.territoryId === territoryId);
      if (!terr || !terr.ownerGuildId) throw new Error('Lãnh thổ chưa thuộc sở hữu của Bang Hội nào.');
      const guild = this.store.guilds.find((g) => g.id === terr.ownerGuildId);
      if (!guild) throw new Error('Không tìm thấy Bang sở hữu.');
      const member = guild.members.find((m: any) => m.characterId === charId);
      const rank = guild.ranks.find((r: any) => r.id === member?.rankId);
      if (!rank || !rank.permissions.includes('MANAGE_TERRITORY')) {
        throw new Error('Không có quyền quản lý Lãnh Thổ.');
      }

      if (typeof nextTaxRatePct === 'number') {
        const clamped = Math.max(0, Math.min(terr.maxTaxRatePct, Math.round(nextTaxRatePct)));
        terr.taxRatePct = clamped;
      }

      let collectedGold = 0;
      if (collectTax && terr.accumulatedTaxGold > 0) {
        collectedGold = terr.accumulatedTaxGold;
        terr.accumulatedTaxGold = 0;
        guild.treasuryGold += collectedGold;
      }
      this.store.save();
      return { territory: terr, collectedGold, guildTreasuryGold: guild.treasuryGold };
    });
  }

  public async upgradeTerritoryBuilding(charId: string, territoryId: string, buildingId: string) {
    return this.audit.withLocks([`terr:${territoryId}`], () => {
      const terr: TerritoryRuntimeState | undefined = this.store.territories.find((t) => t.territoryId === territoryId);
      if (!terr || !terr.ownerGuildId) throw new Error('Lãnh thổ chưa có chủ.');
      const guild = this.store.guilds.find((g) => g.id === terr.ownerGuildId);
      if (!guild) throw new Error('Không tìm thấy Bang.');
      const member = guild.members.find((m: any) => m.characterId === charId);
      if (!member) throw new Error('Không thuộc Bang sở hữu.');
      const b = terr.buildings.find((x) => x.id === buildingId);
      if (!b || b.level >= b.maxLevel) throw new Error('Công trình đã đạt cấp tối đa.');
      const cost = b.level * 12000;
      if (guild.treasuryGold < cost) throw new Error(`Ngân khố Bang không đủ (cần ${cost.toLocaleString()} G).`);
      guild.treasuryGold -= cost;
      b.level += 1;
      if (b.id === 'tb_wall') {
        terr.maxDefensePoints += 400;
        terr.defensePoints += 400;
      }
      this.store.save();
      return { territory: terr, building: b, guildTreasuryGold: guild.treasuryGold };
    });
  }

  public async resetTerritorySeason() {
    this.ensureTerritoriesSeeded();
    let rewardDistributed = 0;
    for (const terr of this.store.territories as TerritoryRuntimeState[]) {
      if (terr.ownerGuildId) {
        const g = this.store.guilds.find((x) => x.id === terr.ownerGuildId);
        if (g) {
          g.treasuryGold += 25000 + Number(terr.accumulatedTaxGold || 0);
          g.seasonPoints += 150;
          g.controlledTerritoryIds = [];
          rewardDistributed += 1;
        }
      }
      const def = TERRITORY_DEFINITIONS.find((d) => d.id === terr.territoryId);
      terr.ownerGuildId = null;
      terr.ownerGuildName = null;
      terr.accumulatedTaxGold = 0;
      terr.defensePoints = def?.baseCaptureDefense ?? 1200;
      terr.maxDefensePoints = def?.baseCaptureDefense ?? 1200;
      terr.capturedAt = null;
      terr.seasonNumber += 1;
    }
    this.store.save();
    return { seasonNumber: this.store.territories[0]?.seasonNumber ?? 2, rewardDistributed };
  }
}
