import { randomUUID } from 'crypto';
import {
  DEFAULT_GUILD_BUILDINGS,
  DEFAULT_GUILD_RANKS,
  DEFAULT_GUILD_SKILLS,
  GUILD_BOSS_CATALOG,
  GUILD_LEVEL_EXP_TABLE,
  GUILD_QUEST_DEFINITIONS,
  GUILD_SYSTEM_CONFIG,
} from '@elysia/game-data-schema';
import {
  GuildApplication,
  GuildEntity,
  GuildMemberEntry,
  GuildPermission,
  GuildWarMatch,
  ItemQuality,
} from '@elysia/game-types';
import { JsonStore } from '../database/jsonStore.js';
import { AuditSecurityService } from './audit.service.js';

export class GuildService {
  private static instance: GuildService;
  private store = JsonStore.getInstance();
  private audit = AuditSecurityService.getInstance();

  public static getInstance(): GuildService {
    if (!GuildService.instance) {
      GuildService.instance = new GuildService();
    }
    return GuildService.instance;
  }

  private getRequiredExpForLevel(lv: number): number {
    return GUILD_LEVEL_EXP_TABLE.find((e) => e.level === lv)?.requiredExp || 0;
  }

  public getGuildById(guildId: string): GuildEntity | undefined {
    return this.store.guilds.find((g) => g.id === guildId);
  }

  private requireMemberPermission(guild: GuildEntity, charId: string, perm: GuildPermission): GuildMemberEntry {
    const member = guild.members.find((m) => m.characterId === charId);
    if (!member) throw new Error('Bạn không phải thành viên của Bang Hội này.');
    const rank = guild.ranks.find((r) => r.id === member.rankId);
    if (!rank || !rank.permissions.includes(perm)) {
      throw new Error(`Cấp bậc "${rank?.nameVi || member.rankId}" không có quyền thực hiện: ${perm}.`);
    }
    return member;
  }

  private addGuildExp(guild: GuildEntity, amount: number) {
    guild.exp += Math.max(0, Math.round(amount));
    while (guild.level < GUILD_SYSTEM_CONFIG.maxLevel && guild.nextLevelExp > 0 && guild.exp >= guild.nextLevelExp) {
      guild.exp -= guild.nextLevelExp;
      guild.level += 1;
      guild.nextLevelExp = this.getRequiredExpForLevel(guild.level);
    }
    if (guild.level >= GUILD_SYSTEM_CONFIG.maxLevel) {
      guild.level = GUILD_SYSTEM_CONFIG.maxLevel;
      guild.exp = 0;
      guild.nextLevelExp = 0;
    }
  }

  public listGuilds() {
    return this.store.guilds.map((g: GuildEntity) => ({
      id: g.id,
      name: g.name,
      tag: g.tag,
      level: g.level,
      memberCount: g.members.length,
      maxMembers: this.getMaxMembers(g),
      leaderName: g.leaderName,
      seasonPoints: g.seasonPoints,
      controlledTerritoriesCount: (g.controlledTerritoryIds || []).length,
      announcement: g.announcement,
    }));
  }

  public getGuildDetail(guildId: string) {
    const g = this.getGuildById(guildId);
    if (!g) throw new Error('Không tìm thấy Bang Hội.');
    return {
      ...g,
      maxMembers: this.getMaxMembers(g),
      applications: this.store.guildApplications.filter((a) => a.guildId === guildId),
      wars: this.store.guildWars.filter((w) => w.challengerGuildId === guildId || w.defenderGuildId === guildId),
      questsCatalog: GUILD_QUEST_DEFINITIONS,
      bossCatalog: GUILD_BOSS_CATALOG,
    };
  }

  public getMaxMembers(guild: GuildEntity): number {
    const hall = guild.buildings.find((b) => b.id === 'guild_hall');
    return (
      GUILD_SYSTEM_CONFIG.baseMemberCapacity +
      (guild.level - 1) * GUILD_SYSTEM_CONFIG.capacityPerLevel +
      Math.max(0, Number(hall?.level || 1) - 1) * 5
    );
  }

  public async createGuild(params: {
    creatorCharacterId: string;
    name: string;
    tag: string;
    foundingMemberIds: string[];
    txId?: string;
  }): Promise<GuildEntity> {
    const name = String(params.name || '').trim();
    const tag = String(params.tag || '').trim().toUpperCase();
    if (name.length < 3 || name.length > 28) throw new Error('Tên Bang Hội phải từ 3–28 ký tự.');
    if (tag.length < 2 || tag.length > 5) throw new Error('Tag Bang Hội phải từ 2–5 ký tự.');

    const founderIds = Array.from(new Set([params.creatorCharacterId, ...(params.foundingMemberIds || [])])).filter(Boolean);
    if (founderIds.length < GUILD_SYSTEM_CONFIG.minFoundingMembers) {
      throw new Error(`Cần tối thiểu ${GUILD_SYSTEM_CONFIG.minFoundingMembers} thành viên sáng lập để thành lập Bang Hội.`);
    }

    return this.audit.withLocks(
      founderIds.map((id) => `char:${id}`),
      () => {
        const claimId = this.audit.claimIdempotencyKey(params.txId);
        const creator = this.store.characters.find((c) => c.id === params.creatorCharacterId);
        if (!creator) throw new Error('Không tìm thấy nhân vật sáng lập.');
        if (Number(creator.level || 1) < GUILD_SYSTEM_CONFIG.requiredLevel) {
          throw new Error(`Yêu cầu Nhân vật đạt Cấp ${GUILD_SYSTEM_CONFIG.requiredLevel} để lập Bang Hội.`);
        }
        if (this.store.guilds.some((g) => g.name.toLowerCase() === name.toLowerCase() || g.tag === tag)) {
          throw new Error('Tên hoặc Tag Bang Hội đã tồn tại.');
        }

        const founders = founderIds.map((id) => {
          const ch = this.store.characters.find((c) => c.id === id);
          if (!ch) throw new Error(`Thành viên sáng lập "${id}" không tồn tại.`);
          if (ch.guildId) throw new Error(`Nhân vật "${ch.name}" đã thuộc một Bang Hội khác.`);
          return ch;
        });

        if (this.audit.countItem(creator, GUILD_SYSTEM_CONFIG.requiredSealItemId) < 1) {
          throw new Error(`Cần 1 ${GUILD_SYSTEM_CONFIG.requiredSealItemId} (Ấn Ký Lập Bang Hội) trong hành trang.`);
        }

        const goldBackup = creator.gold;
        const invBackup = JSON.parse(JSON.stringify(creator.inventory || []));
        try {
          this.audit.deductGold(creator, GUILD_SYSTEM_CONFIG.creationGoldCost, 'lệ phí thành lập Bang Hội');
          this.audit.consumeItem(creator, GUILD_SYSTEM_CONFIG.requiredSealItemId, 1);

          const guildId = `GLD_${randomUUID().slice(0, 8)}`;
          const now = new Date().toISOString();
          const members: GuildMemberEntry[] = founders.map((ch, idx) => ({
            characterId: ch.id,
            characterName: ch.name,
            classId: ch.classId || 'adventurer',
            level: ch.level || 1,
            rankId: idx === 0 ? 'guild_master' : idx === 1 ? 'vice_master' : 'member',
            contributionTotal: idx === 0 ? 500 : 100,
            contributionWeekly: idx === 0 ? 500 : 100,
            joinedAt: now,
          }));

          const guild: GuildEntity = {
            id: guildId,
            name,
            tag,
            leaderCharacterId: creator.id,
            leaderName: creator.name,
            level: 1,
            exp: 0,
            nextLevelExp: this.getRequiredExpForLevel(1),
            treasuryGold: 0,
            announcement: `Chào mừng gia nhập ${name}! Đoàn kết vươn tới đỉnh cao Elysia.`,
            seasonPoints: 100,
            ranks: JSON.parse(JSON.stringify(DEFAULT_GUILD_RANKS)),
            members,
            storage: [],
            storageCapacity: GUILD_SYSTEM_CONFIG.baseStorageCapacity,
            buildings: JSON.parse(JSON.stringify(DEFAULT_GUILD_BUILDINGS)),
            skills: JSON.parse(JSON.stringify(DEFAULT_GUILD_SKILLS)),
            completedQuestIds: [],
            activeBoss: null,
            controlledTerritoryIds: [],
            createdAt: now,
            chatHistory: [],
          };

          for (const ch of founders) {
            ch.guildId = guildId;
            ch.guildRankId = ch.id === creator.id ? 'guild_master' : members.find((m) => m.characterId === ch.id)?.rankId;
          }
          this.store.guilds.push(guild);
          this.audit.recordAudit({
            txId: claimId,
            category: 'guild_bank',
            actorCharacterId: creator.id,
            goldDelta: -GUILD_SYSTEM_CONFIG.creationGoldCost,
            itemId: GUILD_SYSTEM_CONFIG.requiredSealItemId,
            quantity: 1,
            details: `Thành lập Bang Hội "${name}" [${tag}] với ${founders.length} thành viên sáng lập`,
          });
          this.store.save();
          return guild;
        } catch (err) {
          creator.gold = goldBackup;
          creator.inventory = invBackup;
          throw err;
        }
      }
    );
  }

  public async applyToGuild(charId: string, guildId: string, message = 'Xin gia nhập Bang Hội!') {
    return this.audit.withLocks([`char:${charId}`, `guild:${guildId}`], () => {
      const ch = this.store.characters.find((c) => c.id === charId);
      if (!ch) throw new Error('Không tìm thấy nhân vật.');
      if (ch.guildId) throw new Error('Bạn đã có Bang Hội.');
      const guild = this.getGuildById(guildId);
      if (!guild) throw new Error('Bang Hội không tồn tại.');
      if (this.store.guildApplications.some((a) => a.guildId === guildId && a.characterId === charId)) {
        throw new Error('Bạn đã nộp đơn xin vào Bang Hội này rồi.');
      }
      const app: GuildApplication = {
        id: `GAPP_${randomUUID().slice(0, 8)}`,
        guildId,
        characterId: ch.id,
        characterName: ch.name,
        level: ch.level,
        classId: ch.classId || 'adventurer',
        message: String(message).slice(0, 140),
        createdAt: new Date().toISOString(),
      };
      this.store.guildApplications.push(app);
      this.store.save();
      return app;
    });
  }

  public async reviewApplication(actorCharId: string, guildId: string, appId: string, accept: boolean) {
    return this.audit.withLocks([`guild:${guildId}`], () => {
      const guild = this.getGuildById(guildId);
      if (!guild) throw new Error('Không tìm thấy Bang Hội.');
      this.requireMemberPermission(guild, actorCharId, 'INVITE_MEMBER');
      const idx = this.store.guildApplications.findIndex((a) => a.id === appId && a.guildId === guildId);
      if (idx === -1) throw new Error('Đơn xin gia nhập không tồn tại.');
      const app = this.store.guildApplications[idx];
      this.store.guildApplications.splice(idx, 1);

      if (!accept) {
        this.store.save();
        return { accepted: false, applicationId: appId };
      }

      const applicant = this.store.characters.find((c) => c.id === app.characterId);
      if (!applicant || applicant.guildId) {
        this.store.save();
        throw new Error('Người chơi này đã gia nhập Bang khác.');
      }
      if (guild.members.length >= this.getMaxMembers(guild)) {
        throw new Error('Bang Hội đã đạt số lượng thành viên tối đa.');
      }

      applicant.guildId = guild.id;
      applicant.guildRankId = 'member';
      guild.members.push({
        characterId: applicant.id,
        characterName: applicant.name,
        classId: applicant.classId || 'adventurer',
        level: applicant.level,
        rankId: 'member',
        contributionTotal: 0,
        contributionWeekly: 0,
        joinedAt: new Date().toISOString(),
      });
      this.store.save();
      return { accepted: true, guild };
    });
  }

  public async setMemberRank(actorCharId: string, guildId: string, targetCharId: string, newRankId: string) {
    return this.audit.withLocks([`guild:${guildId}`], () => {
      const guild = this.getGuildById(guildId);
      if (!guild) throw new Error('Không tìm thấy Bang Hội.');
      const actor = this.requireMemberPermission(guild, actorCharId, 'MANAGE_RANKS');
      const target = guild.members.find((m) => m.characterId === targetCharId);
      if (!target) throw new Error('Không tìm thấy thành viên.');
      if (targetCharId === guild.leaderCharacterId && newRankId !== 'guild_master') {
        throw new Error('Bang Chủ phải chuyển nhượng quyền lãnh đạo trước.');
      }
      const nextRank = guild.ranks.find((r) => r.id === newRankId);
      if (!nextRank) throw new Error('Cấp bậc không hợp lệ.');

      if (newRankId === 'guild_master') {
        if (actorCharId !== guild.leaderCharacterId) throw new Error('Chỉ Bang Chủ mới có quyền nhường ngôi.');
        actor.rankId = 'vice_master';
        guild.leaderCharacterId = target.characterId;
        guild.leaderName = target.characterName;
      }
      target.rankId = nextRank.id;
      const targetChar = this.store.characters.find((c) => c.id === targetCharId);
      if (targetChar) targetChar.guildRankId = nextRank.id;
      this.store.save();
      return guild;
    });
  }

  public async updateRankPermissions(actorCharId: string, guildId: string, rankId: string, permissions: GuildPermission[]) {
    return this.audit.withLocks([`guild:${guildId}`], () => {
      const guild = this.getGuildById(guildId);
      if (!guild) throw new Error('Không tìm thấy Bang Hội.');
      this.requireMemberPermission(guild, actorCharId, 'MANAGE_RANKS');
      if (rankId === 'guild_master') throw new Error('Không thể sửa quyền tối thượng của Bang Chủ.');
      const rank = guild.ranks.find((r) => r.id === rankId);
      if (!rank) throw new Error('Không tìm thấy cấp bậc.');
      rank.permissions = Array.from(new Set(permissions));
      this.store.save();
      return rank;
    });
  }

  public async kickOrLeaveMember(actorCharId: string, guildId: string, targetCharId: string) {
    return this.audit.withLocks([`guild:${guildId}`, `char:${targetCharId}`], () => {
      const guild = this.getGuildById(guildId);
      if (!guild) throw new Error('Không tìm thấy Bang Hội.');
      if (actorCharId !== targetCharId) {
        this.requireMemberPermission(guild, actorCharId, 'KICK_MEMBER');
      }
      if (targetCharId === guild.leaderCharacterId && guild.members.length > 1) {
        throw new Error('Bang Chủ không thể rời đi khi còn thành viên khác — hãy chuyển nhượng Bang Chủ trước.');
      }
      const idx = guild.members.findIndex((m) => m.characterId === targetCharId);
      if (idx === -1) throw new Error('Không tìm thấy thành viên trong Bang Hội.');
      guild.members.splice(idx, 1);
      const ch = this.store.characters.find((c) => c.id === targetCharId);
      if (ch) {
        ch.guildId = null;
        ch.guildRankId = null;
      }
      this.store.save();
      return { guild, removedCharacterId: targetCharId };
    });
  }

  public async updateAnnouncement(actorCharId: string, guildId: string, announcement: string) {
    const guild = this.getGuildById(guildId);
    if (!guild) throw new Error('Không tìm thấy Bang Hội.');
    this.requireMemberPermission(guild, actorCharId, 'EDIT_ANNOUNCEMENT');
    guild.announcement = String(announcement || '').trim().slice(0, 300);
    this.store.save();
    return guild;
  }

  public postGuildChat(charId: string, guildId: string, message: string) {
    const guild = this.getGuildById(guildId);
    if (!guild) throw new Error('Không tìm thấy Bang Hội.');
    const member = guild.members.find((m) => m.characterId === charId);
    if (!member) throw new Error('Chỉ thành viên Bang Hội mới có thể chat kênh Bang.');
    const msg = {
      id: randomUUID(),
      sender: member.characterName,
      message: String(message || '').trim().slice(0, 260),
      timestamp: new Date().toISOString(),
    };
    guild.chatHistory.push(msg);
    if (guild.chatHistory.length > 60) guild.chatHistory.shift();
    this.store.save();
    return msg;
  }

  public async donateGold(charId: string, guildId: string, amountGold: number) {
    const amount = Math.floor(Number(amountGold));
    if (!Number.isInteger(amount) || amount < 100) throw new Error('Mức quyên góp tối thiểu là 100 Vàng.');
    return this.audit.withLocks([`char:${charId}`, `guild:${guildId}`], () => {
      const ch = this.store.characters.find((c) => c.id === charId);
      const guild = this.getGuildById(guildId);
      if (!ch || !guild) throw new Error('Không tìm thấy dữ liệu.');
      const member = guild.members.find((m) => m.characterId === charId);
      if (!member) throw new Error('Bạn không thuộc Bang Hội này.');
      this.audit.deductGold(ch, amount, 'quyên góp Bang Hội');
      guild.treasuryGold += amount;
      const contrib = Math.max(10, Math.floor(amount / 25));
      member.contributionTotal += contrib;
      member.contributionWeekly += contrib;
      this.addGuildExp(guild, Math.floor(amount / 15));
      this.audit.recordAudit({
        txId: `GDON_${randomUUID().slice(0, 8)}`,
        category: 'guild_bank',
        actorCharacterId: charId,
        goldDelta: -amount,
        details: `Quyên góp ${amount}G vào Bang ${guild.name} (+${contrib} Cống Hiến)`,
      });
      this.store.save();
      return { guild, member, playerGold: ch.gold };
    });
  }

  public async depositStorage(charId: string, guildId: string, itemId: string, quantity = 1) {
    return this.audit.withLocks([`char:${charId}`, `guild_storage:${guildId}`], () => {
      const ch = this.store.characters.find((c) => c.id === charId);
      const guild = this.getGuildById(guildId);
      if (!ch || !guild) throw new Error('Không tìm thấy dữ liệu.');
      this.requireMemberPermission(guild, charId, 'DEPOSIT_STORAGE');
      if (!this.audit.isTradableItem(ch, itemId)) {
        throw new Error('Vật phẩm bị khóa nhân vật/tài khoản, không thể cất Kho Bang!');
      }
      if (guild.storage.length >= guild.storageCapacity) {
        throw new Error('Kho Bang Hội đã đầy!');
      }

      const invBackup = JSON.parse(JSON.stringify(ch.inventory || []));
      try {
        const consumed = this.audit.consumeItem(ch, itemId, quantity);
        const meta = this.audit.getItemCatalogMap().get(itemId);
        const q = consumed.consumedQualities[0] || 'common';
        const existing = guild.storage.find((s) => s.itemId === itemId && (s.quality || 'common') === q && meta?.stackable !== false);
        if (existing) {
          existing.quantity += quantity;
        } else {
          guild.storage.push({
            slotId: `GST_${randomUUID().slice(0, 8)}`,
            itemId,
            name: meta?.nameVi || meta?.name || itemId,
            quantity,
            quality: q,
            rarity: (meta?.rarity || q) as any,
            depositedBy: ch.name,
            depositedAt: new Date().toISOString(),
          });
        }
        const member = guild.members.find((m) => m.characterId === charId)!;
        member.contributionTotal += quantity * 15;
        member.contributionWeekly += quantity * 15;
        this.addGuildExp(guild, quantity * 20);
        this.audit.recordAudit({
          txId: `GDEP_${randomUUID().slice(0, 8)}`,
          category: 'guild_storage',
          actorCharacterId: charId,
          goldDelta: 0,
          itemId,
          quantity,
          details: `Nạp ${itemId} x${quantity} vào Kho Bang ${guild.name}`,
        });
        this.store.save();
        return guild;
      } catch (err) {
        ch.inventory = invBackup;
        throw err;
      }
    });
  }

  public async withdrawStorage(charId: string, guildId: string, slotId: string, quantity = 1) {
    if (!Number.isInteger(quantity) || quantity <= 0) throw new Error('Số lượng rút không hợp lệ.');
    return this.audit.withLocks([`char:${charId}`, `guild_storage:${guildId}`], () => {
      const ch = this.store.characters.find((c) => c.id === charId);
      const guild = this.getGuildById(guildId);
      if (!ch || !guild) throw new Error('Không tìm thấy dữ liệu.');
      this.requireMemberPermission(guild, charId, 'WITHDRAW_STORAGE');
      const idx = guild.storage.findIndex((s) => s.slotId === slotId);
      if (idx === -1) throw new Error('Không tìm thấy vật phẩm trong Kho Bang.');
      const slot = guild.storage[idx];
      if (slot.quantity < quantity) throw new Error('Số lượng trong Kho Bang không đủ.');

      const storageBackup = JSON.parse(JSON.stringify(guild.storage));
      try {
        if (slot.quantity === quantity) guild.storage.splice(idx, 1);
        else slot.quantity -= quantity;
        this.audit.grantItem(ch, slot.itemId, quantity, {
          quality: (slot.quality as ItemQuality) || 'common',
          name: slot.name,
        });
        this.audit.recordAudit({
          txId: `GWDR_${randomUUID().slice(0, 8)}`,
          category: 'guild_storage',
          actorCharacterId: charId,
          goldDelta: 0,
          itemId: slot.itemId,
          quantity,
          details: `Rút ${slot.itemId} x${quantity} từ Kho Bang ${guild.name}`,
        });
        this.store.save();
        return { guild, characterInventory: ch.inventory };
      } catch (err) {
        guild.storage = storageBackup;
        throw err;
      }
    });
  }

  public async upgradeBuilding(charId: string, guildId: string, buildingId: string) {
    return this.audit.withLocks([`guild:${guildId}`], () => {
      const guild = this.getGuildById(guildId);
      if (!guild) throw new Error('Không tìm thấy Bang Hội.');
      this.requireMemberPermission(guild, actorOrId(charId), 'UPGRADE_BUILDING');
      const b = guild.buildings.find((x) => x.id === buildingId);
      if (!b) throw new Error('Công trình không tồn tại.');
      if (b.level >= b.maxLevel) throw new Error('Công trình đã đạt cấp tối đa.');
      const costGold = b.level * 15000;
      if (guild.treasuryGold < costGold) {
        throw new Error(`Ngân khố Bang không đủ (cần ${costGold.toLocaleString()} G).`);
      }
      guild.treasuryGold -= costGold;
      b.level += 1;
      if (b.id === 'vault_annex') {
        guild.storageCapacity =
          GUILD_SYSTEM_CONFIG.baseStorageCapacity + (b.level - 1) * GUILD_SYSTEM_CONFIG.storageCapacityPerVaultLevel;
      }
      this.addGuildExp(guild, 350);
      this.store.save();
      return { building: b, guild };
    });
  }

  public async upgradeGuildSkill(charId: string, guildId: string, skillId: string) {
    return this.audit.withLocks([`guild:${guildId}`], () => {
      const guild = this.getGuildById(guildId);
      if (!guild) throw new Error('Không tìm thấy Bang Hội.');
      this.requireMemberPermission(guild, charId, 'START_RESEARCH');
      const sk = guild.skills.find((x) => x.id === skillId);
      if (!sk) throw new Error('Kỹ năng Bang không tồn tại.');
      const hall = guild.buildings.find((b) => b.id === 'guild_hall');
      const maxAllowed = Math.min(sk.maxLevel, Number(hall?.level || 1) * 2);
      if (sk.level >= maxAllowed) {
        throw new Error(`Cần nâng Đại Sảnh Bang Hội lên cao hơn để nghiên cứu tiếp (${sk.level}/${maxAllowed}).`);
      }
      const costGold = (sk.level + 1) * 8000;
      if (guild.treasuryGold < costGold) {
        throw new Error(`Ngân khố Bang không đủ (cần ${costGold.toLocaleString()} G).`);
      }
      guild.treasuryGold -= costGold;
      sk.level += 1;
      this.addGuildExp(guild, 220);
      this.store.save();
      return { skill: sk, guild };
    });
  }

  public async summonGuildBoss(charId: string, guildId: string, bossId = 'GBOSS_CRIMSON_COLOSSUS') {
    return this.audit.withLocks([`guild:${guildId}`], () => {
      const guild = this.getGuildById(guildId);
      if (!guild) throw new Error('Không tìm thấy Bang Hội.');
      this.requireMemberPermission(guild, charId, 'SUMMON_BOSS');
      if (guild.activeBoss && !guild.activeBoss.defeated) {
        throw new Error('Bang Hội đang có Boss chưa bị tiêu diệt!');
      }
      const cfg = GUILD_BOSS_CATALOG.find((b) => b.id === bossId) || GUILD_BOSS_CATALOG[0];
      if (guild.treasuryGold < cfg.summonCostGold) {
        throw new Error(`Cần ${cfg.summonCostGold.toLocaleString()} G trong Ngân Khố để triệu hồi ${cfg.name}.`);
      }
      guild.treasuryGold -= cfg.summonCostGold;
      guild.activeBoss = {
        bossId: cfg.id,
        name: cfg.name,
        level: cfg.level,
        hp: cfg.maxHp,
        maxHp: cfg.maxHp,
        summonedAt: new Date().toISOString(),
        defeated: false,
        damageContributors: {},
      };
      this.store.save();
      return guild.activeBoss;
    });
  }

  public async attackGuildBoss(charId: string, guildId: string, damageInput?: number) {
    return this.audit.withLocks([`char:${charId}`, `guild:${guildId}`], () => {
      const ch = this.store.characters.find((c) => c.id === charId);
      const guild = this.getGuildById(guildId);
      if (!ch || !guild) throw new Error('Không tìm thấy dữ liệu.');
      const member = guild.members.find((m) => m.characterId === charId);
      if (!member) throw new Error('Chỉ thành viên Bang được đánh Boss Bang Hội.');
      if (!guild.activeBoss || guild.activeBoss.defeated) {
        throw new Error('Hiện không có Boss Bang Hội đang hoạt động.');
      }

      const training = guild.buildings.find((b) => b.id === 'training_ground');
      const bonusPct = Math.max(0, Number(training?.level || 1) - 1) * 15;
      const rawDmg = damageInput && damageInput > 0 ? Math.min(25000, Math.round(damageInput)) : (ch.level || 1) * 85 + 220;
      const dmg = Math.round(rawDmg * (1 + bonusPct / 100));

      guild.activeBoss.hp = Math.max(0, guild.activeBoss.hp - dmg);
      const prev = guild.activeBoss.damageContributors[ch.id] || { name: ch.name, damage: 0 };
      prev.damage += dmg;
      guild.activeBoss.damageContributors[ch.id] = prev;
      member.contributionTotal += 60;
      member.contributionWeekly += 60;

      let defeatedRewards: any = null;
      if (guild.activeBoss.hp === 0) {
        guild.activeBoss.defeated = true;
        const cfg = GUILD_BOSS_CATALOG.find((b) => b.id === guild.activeBoss!.bossId) || GUILD_BOSS_CATALOG[0];
        guild.treasuryGold += cfg.rewardTreasuryGold;
        guild.seasonPoints += 120;
        this.addGuildExp(guild, cfg.rewardGuildExp);

        const participantIds = Object.keys(guild.activeBoss.damageContributors);
        for (const pid of participantIds) {
          const pChar = this.store.characters.find((c) => c.id === pid);
          if (pChar) {
            this.audit.addGold(pChar, 1500);
            this.audit.grantItem(pChar, 'ITEM_UPGRADE_STONE_BASIC', 2);
          }
        }
        defeatedRewards = {
          treasuryGold: cfg.rewardTreasuryGold,
          guildExp: cfg.rewardGuildExp,
          participantsRewarded: participantIds.length,
        };
      }
      this.store.save();
      return { boss: guild.activeBoss, damageDealt: dmg, defeatedRewards, guild };
    });
  }

  public async challengeGuildWar(charId: string, challengerGuildId: string, defenderGuildId: string) {
    if (challengerGuildId === defenderGuildId) throw new Error('Không thể tự khiêu chiến chính Bang Hội mình.');
    return this.audit.withLocks([`guild:${challengerGuildId}`, `guild:${defenderGuildId}`], () => {
      const gA = this.getGuildById(challengerGuildId);
      const gB = this.getGuildById(defenderGuildId);
      if (!gA || !gB) throw new Error('Không tìm thấy Bang Hội.');
      this.requireMemberPermission(gA, charId, 'DECLARE_WAR');
      const war: GuildWarMatch = {
        warId: `WAR_${randomUUID().slice(0, 8)}`,
        challengerGuildId: gA.id,
        challengerGuildName: gA.name,
        defenderGuildId: gB.id,
        defenderGuildName: gB.name,
        challengerScore: 0,
        defenderScore: 0,
        status: 'active',
        startedAt: new Date().toISOString(),
        endsAt: new Date(Date.now() + GUILD_SYSTEM_CONFIG.warDurationSec * 1000).toISOString(),
      };
      this.store.guildWars.push(war);
      this.store.save();
      return war;
    });
  }

  public async recordWarScoreAndSettle(charId: string, warId: string, points: number, finish = false) {
    return this.audit.withLocks([`war:${warId}`], () => {
      const war = this.store.guildWars.find((w) => w.warId === warId);
      if (!war || war.status !== 'active') throw new Error('Trận Bang Chiến không còn hoạt động.');
      const ch = this.store.characters.find((c) => c.id === charId);
      if (!ch || (ch.guildId !== war.challengerGuildId && ch.guildId !== war.defenderGuildId)) {
        throw new Error('Bạn không thuộc Bang Hội tham chiến.');
      }
      const add = Math.max(1, Math.min(500, Math.round(points)));
      if (ch.guildId === war.challengerGuildId) war.challengerScore += add;
      else war.defenderScore += add;

      if (finish) {
        war.status = 'finished';
        war.winnerGuildId = war.challengerScore >= war.defenderScore ? war.challengerGuildId : war.defenderGuildId;
        const winGuild = this.getGuildById(war.winnerGuildId);
        if (winGuild) {
          winGuild.seasonPoints += 250;
          winGuild.treasuryGold += 10000;
          this.addGuildExp(winGuild, 800);
        }
      }
      this.store.save();
      return war;
    });
  }

  public async claimGuildQuest(charId: string, guildId: string, questId: string) {
    return this.audit.withLocks([`char:${charId}`, `guild:${guildId}`], () => {
      const guild = this.getGuildById(guildId);
      if (!guild) throw new Error('Không tìm thấy Bang Hội.');
      const member = guild.members.find((m) => m.characterId === charId);
      if (!member) throw new Error('Bạn không phải thành viên Bang.');
      const q = GUILD_QUEST_DEFINITIONS.find((x) => x.id === questId);
      if (!q) throw new Error('Không tìm thấy nhiệm vụ Bang.');
      const ch = this.store.characters.find((c) => c.id === charId)!;
      const claimKey = `${guildId}:${q.id}:${new Date().toISOString().slice(0, 10)}`;
      if (guild.completedQuestIds.includes(`${charId}:${claimKey}`)) {
        throw new Error('Nhiệm vụ Bang này đã được nhận thưởng!');
      }
      guild.completedQuestIds.push(`${charId}:${claimKey}`);
      member.contributionTotal += q.rewardContrib;
      member.contributionWeekly += q.rewardContrib;
      this.addGuildExp(guild, q.rewardGuildExp);
      this.audit.addGold(ch, q.rewardGold);
      this.store.save();
      return { quest: q, member, guild, playerGold: ch.gold };
    });
  }

  public getGuildRankings() {
    return [...this.store.guilds]
      .sort((a, b) => b.seasonPoints - a.seasonPoints || b.level - a.level)
      .map((g, idx) => ({
        rank: idx + 1,
        id: g.id,
        name: g.name,
        tag: g.tag,
        level: g.level,
        seasonPoints: g.seasonPoints,
        memberCount: g.members.length,
        territoriesCount: (g.controlledTerritoryIds || []).length,
      }));
  }
}

function actorOrId(charId: string) {
  return charId;
}
