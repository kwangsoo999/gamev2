import { CARAVAN_ROUTES, GUILD_SYSTEM_CONFIG, MERCHANT_SYSTEM_CONFIG } from '@elysia/game-data-schema';
import { HudSnapshot } from '../engine/GameEngine';
import {
  applyGuildApi,
  attackGuildBossApi,
  bidAuctionApi,
  buyMarketListingApi,
  cancelMarketListingApi,
  challengeGuildWarApi,
  claimGuildQuestApi,
  completeCaravanApi,
  createAuctionApi,
  createBuyOrderApi,
  createGuildApi,
  createMarketListingApi,
  createMerchantAssocApi,
  depositGuildStorageApi,
  donateGuildGoldApi,
  fetchAuctionsApi,
  fetchAuditLogsApi,
  fetchBuyOrdersApi,
  fetchGuildDetailApi,
  fetchGuildRankingsApi,
  fetchGuildsApi,
  fetchMarketListingsApi,
  fetchMerchantContractsApi,
  fetchMerchantDetailApi,
  fetchMerchantRankingsApi,
  fetchMerchantsApi,
  fetchTerritoriesApi,
  fulfillBuyOrderApi,
  fulfillContractApi,
  removeGuildMemberApi,
  reviewGuildAppApi,
  scoreGuildWarApi,
  siegeTerritoryApi,
  startCaravanApi,
  summonGuildBossApi,
  updateGuildAnnouncementApi,
  updateTerritoryTaxApi,
  upgradeGuildBuildingApi,
  upgradeGuildSkillApi,
  upgradeTerritoryBuildingApi,
  withdrawGuildStorageApi,
} from '../services/apiClient';
import { modalManager } from './ModalManager';

type MainSection = 'guild' | 'merchant' | 'territory';
type GuildSubTab = 'overview' | 'members' | 'ranks' | 'storage' | 'quests' | 'skills' | 'hall' | 'boss' | 'war';
type MerchantSubTab = 'assoc' | 'market' | 'orders' | 'auction' | 'contracts' | 'caravan' | 'rankings';

export class GuildMerchantModal {
  public static readonly MODAL_ID = 'guild-merchant';
  private backdrop: HTMLElement;
  private isOpenFlag = false;
  private section: MainSection = 'guild';
  private guildTab: GuildSubTab = 'overview';
  private merchTab: MerchantSubTab = 'market';

  private characterId: string | null = null;
  private characterGuildId: string | null = null;
  private characterMerchId: string | null = null;
  private snap: HudSnapshot | null = null;

  private guildsList: any[] = [];
  private guildDetail: any = null;
  private guildRankings: any[] = [];
  private merchList: any[] = [];
  private merchDetail: any = null;
  private merchRankings: any[] = [];
  private listings: any[] = [];
  private buyOrders: any[] = [];
  private auctions: any[] = [];
  private contracts: any[] = [];
  private territories: any[] = [];
  private auditLogs: any[] = [];

  private statusMsg = '';
  private searchQuery = '';
  private profFilter = '';
  private createGuildName = '';
  private createGuildTag = '';
  private createFounders = '';
  private createMerchName = '';
  private createMerchTag = '';
  private createMerchFounders = '';

  public onCharacterMutated?: () => void;
  public onToast?: (msg: string, variant?: 'info' | 'success' | 'error') => void;

  constructor() {
    this.backdrop = document.createElement('div');
    this.backdrop.id = 'modal-guild-merchant';
    this.backdrop.className = 'tk-modal-backdrop hidden';
    document.body.append(this.backdrop);

    modalManager.registerBackdrop(this.backdrop, () => ({
      id: GuildMerchantModal.MODAL_ID,
      onRequestClose: () => this.close(),
    }));
  }

  public isOpen(): boolean {
    return this.isOpenFlag;
  }

  public syncCharacter(characterId: string | null, snap: HudSnapshot, guildId?: string | null, merchId?: string | null) {
    this.characterId = characterId;
    this.snap = snap;
    if (guildId !== undefined) this.characterGuildId = guildId;
    if (merchId !== undefined) this.characterMerchId = merchId;
  }

  public async open(section?: MainSection) {
    if (section) this.section = section;
    this.isOpenFlag = true;
    this.render();
    modalManager.open({
      id: GuildMerchantModal.MODAL_ID,
      backdrop: this.backdrop,
      onClose: () => {
        this.isOpenFlag = false;
      },
    });
    await this.refreshAll();
  }

  public close() {
    this.isOpenFlag = false;
    this.backdrop.classList.add('hidden');
    modalManager.close(GuildMerchantModal.MODAL_ID);
  }

  public async refreshAll() {
    const tasks: Promise<any>[] = [
      fetchGuildsApi().then((r) => { if (r.success) this.guildsList = r.data || []; }),
      fetchGuildRankingsApi().then((r) => { if (r.success) this.guildRankings = r.data || []; }),
      fetchMerchantsApi().then((r) => { if (r.success) this.merchList = r.data || []; }),
      fetchMerchantRankingsApi().then((r) => { if (r.success) this.merchRankings = r.data || []; }),
      fetchMarketListingsApi(this.profFilter || undefined, this.searchQuery || undefined).then((r) => { if (r.success) this.listings = r.data || []; }),
      fetchBuyOrdersApi().then((r) => { if (r.success) this.buyOrders = r.data || []; }),
      fetchAuctionsApi().then((r) => { if (r.success) this.auctions = r.data || []; }),
      fetchMerchantContractsApi().then((r) => { if (r.success) this.contracts = r.data || []; }),
      fetchTerritoriesApi().then((r) => { if (r.success) this.territories = r.data || []; }),
      fetchAuditLogsApi().then((r) => { if (r.success) this.auditLogs = r.data || []; }),
    ];
    if (this.characterGuildId) {
      tasks.push(fetchGuildDetailApi(this.characterGuildId).then((r) => { this.guildDetail = r.success ? r.data : null; }));
    } else {
      this.guildDetail = null;
    }
    if (this.characterMerchId) {
      tasks.push(fetchMerchantDetailApi(this.characterMerchId).then((r) => { this.merchDetail = r.success ? r.data : null; }));
    } else {
      this.merchDetail = null;
    }
    await Promise.all(tasks);
    if (this.isOpenFlag) this.render();
  }

  private esc(s: unknown): string {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private renderGuildSection(): string {
    const g = this.guildDetail;
    const subTabsHtml = `
      <div class="tk-filter-tabs">
        ${(['overview', 'members', 'ranks', 'storage', 'quests', 'skills', 'hall', 'boss', 'war'] as GuildSubTab[])
          .map((t) => {
            const labels: Record<GuildSubTab, string> = {
              overview: 'Tổng Quan',
              members: 'Thành Viên',
              ranks: 'Cấp Bậc & Quyền',
              storage: 'Kho Bang',
              quests: 'Nhiệm Vụ',
              skills: 'Kỹ Năng',
              hall: 'Sảnh Đường',
              boss: 'Boss Bang',
              war: 'Bang Chiến & BXH',
            };
            return `<button type="button" class="tk-tab-btn ${this.guildTab === t ? 'active' : ''}" data-gtab="${t}">${labels[t]}</button>`;
          })
          .join('')}
      </div>
    `;

    if (!g) {
      const listHtml = this.guildsList.length
        ? this.guildsList
            .map(
              (row) => `
              <div class="tk-party-member-card">
                <div>
                  <strong style="color:#2f4735;">[${this.esc(row.tag)}] ${this.esc(row.name)} · Lv.${row.level}</strong>
                  <div style="font-size:10px;color:#68604d;">Bang Chủ: ${this.esc(row.leaderName)} · ${row.memberCount}/${row.maxMembers} thành viên · Điểm Mùa: ${row.seasonPoints}</div>
                </div>
                <button type="button" class="tk-action-btn" data-apply-guild="${this.esc(row.id)}">Xin Gia Nhập</button>
              </div>
            `
            )
            .join('')
        : '<p style="font-size:11px;color:#68604d;">Chưa có Bang Hội nào được thành lập.</p>';

      return `
        <div class="tk-set-bonus-box">
          <div class="tk-section-heading"><span>THÀNH LẬP BANG HỘI MỚI</span><span class="tk-heading-pill">Lv.${GUILD_SYSTEM_CONFIG.requiredLevel}+ · ${GUILD_SYSTEM_CONFIG.creationGoldCost.toLocaleString()}G · Ấn Ký Lập Bang · 5 Sáng Lập</span></div>
          <div style="display:grid;grid-template-columns:1fr 90px 1fr;gap:8px;margin-top:6px;">
            <input id="inp-gname" placeholder="Tên Bang Hội (3–28 ký tự)" value="${this.esc(this.createGuildName)}" style="padding:6px;border:1px solid #b5a06d;border-radius:6px;" />
            <input id="inp-gtag" placeholder="TAG" maxlength="5" value="${this.esc(this.createGuildTag)}" style="padding:6px;border:1px solid #b5a06d;border-radius:6px;" />
            <input id="inp-gfounders" placeholder="ID 4 đồng sáng lập (cách dấu phẩy)" value="${this.esc(this.createFounders)}" style="padding:6px;border:1px solid #b5a06d;border-radius:6px;" />
          </div>
          <div style="margin-top:8px;display:flex;justify-content:flex-end;">
            <button type="button" class="tk-action-btn" id="btn-create-guild">Khai Sáng Bang Hội</button>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">${listHtml}</div>
      `;
    }

    let panel = '';
    if (this.guildTab === 'overview') {
      const expPct = g.nextLevelExp > 0 ? Math.min(100, Math.round((g.exp / g.nextLevelExp) * 100)) : 100;
      panel = `
        <div class="tk-set-bonus-box">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <strong style="font-size:14px;color:#2f4735;">[${this.esc(g.tag)}] ${this.esc(g.name)} · Cấp ${g.level}/10</strong>
            <span class="tk-heading-pill">Ngân Khố: ${Number(g.treasuryGold || 0).toLocaleString()} G · Điểm Mùa: ${g.seasonPoints}</span>
          </div>
          <div style="font-size:11px;color:#5d573f;">EXP Bang: ${g.exp}/${g.nextLevelExp || 'MAX'} (${expPct}%) · Bang Chủ: ${this.esc(g.leaderName)}</div>
          <div class="tk-inspector-bar" style="margin-top:6px;">
            <input id="inp-gann" value="${this.esc(g.announcement)}" style="flex:1;padding:5px 8px;border:1px solid #b5a06d;border-radius:6px;" />
            <button type="button" class="tk-tab-btn" id="btn-save-ann">Lưu Thông Báo</button>
          </div>
          <div style="display:flex;gap:8px;align-items:center;margin-top:6px;">
            <input type="number" id="inp-gdonate" value="5000" min="100" style="width:120px;padding:5px;border:1px solid #b5a06d;border-radius:6px;" />
            <button type="button" class="tk-action-btn" id="btn-gdonate">Quyên Góp Vàng (+EXP &amp; Cống Hiến)</button>
            <button type="button" class="tk-tab-btn" id="btn-gleave" style="margin-left:auto;">Rời Bang</button>
          </div>
        </div>
      `;
    } else if (this.guildTab === 'members') {
      const memHtml = (g.members || [])
        .map(
          (m: any) => `
          <div class="tk-party-member-card">
            <span><strong>${this.esc(m.characterName)}</strong> · Lv.${m.level} · <span class="tk-heading-pill">${this.esc(m.rankId)}</span> · Cống hiến: ${m.contributionTotal}</span>
            ${
              m.characterId !== g.leaderCharacterId
                ? `<button type="button" class="tk-tab-btn" data-gkick="${this.esc(m.characterId)}">Mời Ra</button>`
                : '<span class="tk-status-badge locked">Bang Chủ</span>'
            }
          </div>
        `
        )
        .join('');
      const appsHtml = (g.applications || [])
        .map(
          (a: any) => `
          <div class="tk-inspector-bar" style="background:#fef3c7;">
            <span><strong>${this.esc(a.characterName)}</strong> (Lv.${a.level}): "${this.esc(a.message)}"</span>
            <div style="display:flex;gap:6px;">
              <button type="button" class="tk-action-btn" data-gapp="${this.esc(a.id)}" data-ok="1">Duyệt</button>
              <button type="button" class="tk-tab-btn" data-gapp="${this.esc(a.id)}" data-ok="0">Từ Chối</button>
            </div>
          </div>
        `
        )
        .join('');
      panel = `${appsHtml}<div style="display:flex;flex-direction:column;gap:8px;">${memHtml}</div>`;
    } else if (this.guildTab === 'ranks') {
      panel = (g.ranks || [])
        .map(
          (r: any) => `
          <div class="tk-party-member-card">
            <div>
              <strong>${this.esc(r.nameVi)} (${this.esc(r.name)})</strong>
              <div style="font-size:10px;color:#5d573f;margin-top:2px;">Quyền: ${(r.permissions || []).join(', ')}</div>
            </div>
          </div>
        `
        )
        .join('');
    } else if (this.guildTab === 'storage') {
      const depItems = (this.snap?.inventory || []).filter((i) => !i.id.startsWith('UEQ_'));
      const storeHtml = (g.storage || []).length
        ? g.storage
            .map(
              (s: any) => `
              <div class="tk-party-member-card">
                <span><strong>${this.esc(s.name)}</strong> x${s.quantity} · <span class="tk-heading-pill">${this.esc(s.quality || 'common')}</span> · Gửi bởi ${this.esc(s.depositedBy)}</span>
                <button type="button" class="tk-action-btn" data-gwithdraw="${this.esc(s.slotId)}">Rút x1</button>
              </div>
            `
            )
            .join('')
        : '<p style="font-size:11px;color:#68604d;">Kho Bang Hội hiện đang trống.</p>';
      panel = `
        <div class="tk-inspector-bar">
          <select id="sel-gdep-item" style="flex:1;padding:5px;border:1px solid #b5a06d;border-radius:6px;">
            ${depItems.map((it) => `<option value="${this.esc(it.id)}">${this.esc(it.name)} (x${it.qty})</option>`).join('')}
          </select>
          <button type="button" class="tk-action-btn" id="btn-gdeposit">Gửi Vào Kho Bang x1</button>
        </div>
        <div style="font-size:11px;color:#5d573f;">Sức chứa Kho Bang: ${(g.storage || []).length}/${g.storageCapacity}</div>
        <div style="display:flex;flex-direction:column;gap:8px;">${storeHtml}</div>
      `;
    } else if (this.guildTab === 'quests') {
      panel = (g.questsCatalog || [])
        .map(
          (q: any) => `
          <div class="tk-party-member-card">
            <div>
              <strong>[${q.kind === 'daily' ? 'Ngày' : 'Tuần'}] ${this.esc(q.name)}</strong>
              <div style="font-size:10px;color:#68604d;">${this.esc(q.description)} · +${q.rewardGuildExp} EXP Bang, +${q.rewardGold}G</div>
            </div>
            <button type="button" class="tk-action-btn" data-gquest="${this.esc(q.id)}">Hoàn Thành</button>
          </div>
        `
        )
        .join('');
    } else if (this.guildTab === 'skills') {
      panel = (g.skills || [])
        .map(
          (s: any) => `
          <div class="tk-party-member-card">
            <span><strong>${this.esc(s.nameVi)}</strong> · Cấp ${s.level}/${s.maxLevel} (+${s.level * s.bonusPerLevelPct}%)</span>
            <button type="button" class="tk-action-btn" data-gskill="${this.esc(s.id)}">Nghiên Cứu (${((s.level + 1) * 8000).toLocaleString()}G Kho)</button>
          </div>
        `
        )
        .join('');
    } else if (this.guildTab === 'hall') {
      panel = (g.buildings || [])
        .map(
          (b: any) => `
          <div class="tk-party-member-card">
            <div>
              <strong>${this.esc(b.nameVi)} · Lv.${b.level}/${b.maxLevel}</strong>
              <div style="font-size:10px;color:#68604d;">${this.esc(b.effectDescription)}</div>
            </div>
            <button type="button" class="tk-action-btn" data-gbuild="${this.esc(b.id)}" ${b.level >= b.maxLevel ? 'disabled' : ''}>Nâng Cấp (${(b.level * 15000).toLocaleString()}G Kho)</button>
          </div>
        `
        )
        .join('');
    } else if (this.guildTab === 'boss') {
      const b = g.activeBoss;
      panel = b && !b.defeated
        ? `
          <div class="tk-set-bonus-box">
            <strong>🔥 ${this.esc(b.name)} (Lv.${b.level}) · HP ${b.hp.toLocaleString()}/${b.maxHp.toLocaleString()}</strong>
            <div style="margin-top:8px;"><button type="button" class="tk-action-btn" id="btn-gboss-atk">Tấn Công Boss Bang Hội</button></div>
          </div>
        `
        : `
          <div class="tk-inspector-bar">
            <span>Triệu hồi Boss Bang Hội để nhận Vàng Kho, Đá Cường Hóa &amp; EXP Bang!</span>
            <button type="button" class="tk-action-btn" id="btn-gboss-summon">Triệu Hồi Hộ Vệ Dung Nham (5,000G Kho)</button>
          </div>
        `;
    } else {
      const warsHtml = (g.wars || [])
        .map(
          (w: any) => `
          <div class="tk-party-member-card">
            <span>${this.esc(w.challengerGuildName)} (${w.challengerScore}) vs ${this.esc(w.defenderGuildName)} (${w.defenderScore}) · ${w.status}</span>
            ${
              w.status === 'active'
                ? `<div style="display:flex;gap:6px;"><button type="button" class="tk-action-btn" data-war-atk="${this.esc(w.warId)}">Ghi Điểm +150</button><button type="button" class="tk-tab-btn" data-war-fin="${this.esc(w.warId)}">Kết Trận</button></div>`
                : `<span class="tk-status-badge locked">Thắng: ${this.esc(w.winnerGuildId)}</span>`
            }
          </div>
        `
        )
        .join('');
      const rivals = this.guildsList.filter((x) => x.id !== g.id);
      const ranksHtml = this.guildRankings
        .map((r) => `<div class="tk-party-member-card"><span>#${r.rank} [${this.esc(r.tag)}] ${this.esc(r.name)} (Lv.${r.level})</span><strong>${r.seasonPoints} Điểm · ${r.territoriesCount} Lãnh thổ</strong></div>`)
        .join('');
      panel = `
        <div class="tk-inspector-bar">
          <select id="sel-war-target" style="flex:1;padding:5px;border:1px solid #b5a06d;border-radius:6px;">
            ${rivals.map((r) => `<option value="${this.esc(r.id)}">[${this.esc(r.tag)}] ${this.esc(r.name)}</option>`).join('')}
          </select>
          <button type="button" class="tk-action-btn" id="btn-war-challenge" ${rivals.length === 0 ? 'disabled' : ''}>Tuyên Chiến Bang Chiến</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;">${warsHtml}</div>
        <h4 style="margin:4px 0;font-size:12px;color:#385744;">Bảng Xếp Hạng Mùa Giải Bang Hội</h4>
        <div style="display:flex;flex-direction:column;gap:6px;">${ranksHtml}</div>
      `;
    }

    return `${subTabsHtml}${panel}`;
  }

  private renderMerchantSection(): string {
    const mSub = `
      <div class="tk-filter-tabs">
        ${(['market', 'orders', 'auction', 'contracts', 'caravan', 'assoc', 'rankings'] as MerchantSubTab[])
          .map((t) => {
            const labels: Record<MerchantSubTab, string> = {
              market: 'Chợ Người Chơi',
              orders: 'Lệnh Thu Mua',
              auction: 'Đấu Giá',
              contracts: 'Hợp Đồng (8 Nghề)',
              caravan: 'Đoàn Xe',
              assoc: 'Hiệp Hội Thương Nhân',
              rankings: 'BXH & Lịch Sử',
            };
            return `<button type="button" class="tk-tab-btn ${this.merchTab === t ? 'active' : ''}" data-mtab="${t}">${labels[t]}</button>`;
          })
          .join('')}
      </div>
    `;

    let body = '';
    if (this.merchTab === 'market') {
      const inv = (this.snap?.inventory || []).filter((it) => !it.id.startsWith('UEQ_'));
      const listHtml = this.listings.length
        ? this.listings
            .map(
              (l) => `
              <div class="tk-party-member-card">
                <div>
                  <strong>${this.esc(l.itemName)} x${l.quantity}</strong> · <span class="tk-heading-pill">${this.esc(l.quality)}</span>
                  <div style="font-size:10px;color:#68604d;">Gian hàng: ${this.esc(l.shopName || l.sellerName)} · Tổng: <strong>${Number(l.totalPriceGold).toLocaleString()} G</strong></div>
                </div>
                ${
                  l.sellerCharacterId === this.characterId
                    ? `<button type="button" class="tk-tab-btn" data-mkt-cancel="${this.esc(l.id)}">Gỡ Xuống</button>`
                    : `<button type="button" class="tk-action-btn" data-mkt-buy="${this.esc(l.id)}">Mua (${l.totalPriceGold}G)</button>`
                }
              </div>
            `
            )
            .join('')
        : '<p style="font-size:11px;color:#68604d;">Chưa có vật phẩm nào bày bán.</p>';

      body = `
        <div class="tk-inspector-bar">
          <select id="sel-mkt-item" style="flex:1;padding:5px;border:1px solid #b5a06d;border-radius:6px;">
            ${inv.map((i) => `<option value="${this.esc(i.id)}">${this.esc(i.name)} (x${i.qty})</option>`).join('')}
          </select>
          <input type="number" id="inp-mkt-price" value="250" min="1" style="width:90px;padding:5px;border:1px solid #b5a06d;border-radius:6px;" title="Đơn giá (G)" />
          <button type="button" class="tk-action-btn" id="btn-mkt-sell">Đăng Bán x1</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">${listHtml}</div>
      `;
    } else if (this.merchTab === 'orders') {
      const ordHtml = this.buyOrders.length
        ? this.buyOrders
            .map(
              (o) => `
              <div class="tk-party-member-card">
                <span><strong>Thu mua ${this.esc(o.itemName)}</strong> (còn ${o.quantityRemaining}/${o.quantityInitial}) · Giá ${o.unitPriceGold}G/cái · Bởi ${this.esc(o.buyerName)}</span>
                ${o.buyerCharacterId !== this.characterId ? `<button type="button" class="tk-action-btn" data-ord-fill="${this.esc(o.id)}">Bán x1</button>` : '<span class="tk-heading-pill">Lệnh của bạn</span>'}
              </div>
            `
            )
            .join('')
        : '<p style="font-size:11px;color:#68604d;">Hiện chưa có lệnh thu mua nào.</p>';
      body = `
        <div class="tk-inspector-bar">
          <input id="inp-ord-item" value="MAT_PROF_HERB_GREEN" style="flex:1;padding:5px;border:1px solid #b5a06d;border-radius:6px;" />
          <input type="number" id="inp-ord-qty" value="3" min="1" style="width:65px;padding:5px;border:1px solid #b5a06d;border-radius:6px;" />
          <input type="number" id="inp-ord-price" value="40" min="1" style="width:80px;padding:5px;border:1px solid #b5a06d;border-radius:6px;" />
          <button type="button" class="tk-action-btn" id="btn-ord-create">Đặt Lệnh Mua</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">${ordHtml}</div>
      `;
    } else if (this.merchTab === 'auction') {
      const inv = (this.snap?.inventory || []).filter((it) => !it.id.startsWith('UEQ_'));
      const aucHtml = this.auctions.length
        ? this.auctions
            .map((a) => {
              const nextBid = a.currentBidGold > 0 ? a.currentBidGold + a.minIncrementGold : a.startingPriceGold;
              return `
                <div class="tk-party-member-card">
                  <div>
                    <strong>${this.esc(a.itemName)} x${a.quantity}</strong> · <span class="tk-heading-pill">${this.esc(a.quality)}</span>
                    <div style="font-size:10px;color:#68604d;">Giá hiện tại: ${a.currentBidGold || a.startingPriceGold}G · Dẫn đầu: ${this.esc(a.highestBidderName || 'Chưa có')}${a.buyoutPriceGold ? ` · Mua đứt: ${a.buyoutPriceGold}G` : ''}</div>
                  </div>
                  ${
                    a.sellerCharacterId !== this.characterId
                      ? `<button type="button" class="tk-action-btn" data-auc-bid="${this.esc(a.id)}" data-bid="${nextBid}">Đặt Giá (${nextBid}G)</button>`
                      : '<span class="tk-heading-pill">Sàn của bạn</span>'
                  }
                </div>
              `;
            })
            .join('')
        : '<p style="font-size:11px;color:#68604d;">Sàn Đấu Giá hiện đang trống.</p>';
      body = `
        <div class="tk-inspector-bar">
          <select id="sel-auc-item" style="flex:1;padding:5px;border:1px solid #b5a06d;border-radius:6px;">
            ${inv.map((i) => `<option value="${this.esc(i.id)}">${this.esc(i.name)} (x${i.qty})</option>`).join('')}
          </select>
          <input type="number" id="inp-auc-start" value="400" min="10" style="width:90px;padding:5px;border:1px solid #b5a06d;border-radius:6px;" />
          <button type="button" class="tk-action-btn" id="btn-auc-create">Mở Đấu Giá</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">${aucHtml}</div>
      `;
    } else if (this.merchTab === 'contracts') {
      body = this.contracts
        .map(
          (c) => `
          <div class="tk-party-member-card">
            <div>
              <strong>[${this.esc(c.professionId)}] ${this.esc(c.title)}</strong>
              <div style="font-size:10px;color:#68604d;">Yêu cầu: ${this.esc(c.requiredItemName)} x${c.requiredQty} (>= ${this.esc(c.minQuality)}) · Thưởng: +${c.rewardGold}G, +${c.rewardReputation} Uy Tín</div>
            </div>
            ${
              c.status === 'completed'
                ? '<span class="tk-status-badge locked">Đã Hoàn Thành</span>'
                : `<button type="button" class="tk-action-btn" data-ctr-fill="${this.esc(c.id)}">Giao Hàng</button>`
            }
          </div>
        `
        )
        .join('');
    } else if (this.merchTab === 'caravan') {
      const activeC = (this.merchDetail?.caravans || []).filter((c: any) => c.status === 'in_transit');
      body = !this.merchDetail
        ? '<p style="font-size:12px;color:#78350f;">Bạn cần gia nhập hoặc thành lập Hiệp Hội Thương Nhân để điều phối Đoàn Xe Thương Buôn.</p>'
        : `
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${CARAVAN_ROUTES.map(
              (r) => `
              <div class="tk-party-member-card">
                <div>
                  <strong>${this.esc(r.nameVi)}</strong> (Yêu cầu Thương Hội Lv.${r.requiredMerchantLevel}+)
                  <div style="font-size:10px;color:#68604d;">Vốn: ${r.capitalCostGold.toLocaleString()}G -> Thu về: ${r.payoutGold.toLocaleString()}G (+${r.payoutReputation} Uy Tín)</div>
                </div>
                <button type="button" class="tk-action-btn" data-crv-start="${this.esc(r.id)}">Xuất Phát</button>
              </div>
            `
            ).join('')}
            ${activeC
              .map(
                (c: any) => `
                <div class="tk-inspector-bar" style="background:#fef3c7;">
                  <span>🚚 ${this.esc(c.routeName)} · Chờ cập bến</span>
                  <button type="button" class="tk-action-btn" data-crv-done="${this.esc(c.id)}">Nghiệm Thu</button>
                </div>
              `
              )
              .join('')}
          </div>
        `;
    } else if (this.merchTab === 'assoc') {
      body = this.merchDetail
        ? `
          <div class="tk-set-bonus-box">
            <strong>⚖️ [${this.esc(this.merchDetail.tag)}] ${this.esc(this.merchDetail.name)} · Cấp ${this.merchDetail.level}/10</strong>
            <div style="font-size:11px;color:#5d573f;">Uy tín: ${this.merchDetail.reputation} · Ngân khố: ${Number(this.merchDetail.treasuryGold || 0).toLocaleString()} G · Hội trưởng: ${this.esc(this.merchDetail.masterName)}</div>
          </div>
        `
        : `
          <div class="tk-set-bonus-box">
            <div class="tk-section-heading"><span>THÀNH LẬP HIỆP HỘI THƯƠNG NHÂN</span><span class="tk-heading-pill">Lv.${MERCHANT_SYSTEM_CONFIG.requiredLevel}+ · ${MERCHANT_SYSTEM_CONFIG.creationGoldCost.toLocaleString()}G · Ấn Ký · 5 Sáng Lập</span></div>
            <div style="display:grid;grid-template-columns:1fr 90px 1fr;gap:8px;margin-top:6px;">
              <input id="inp-mname" placeholder="Tên Thương Hội" value="${this.esc(this.createMerchName)}" style="padding:6px;border:1px solid #b5a06d;border-radius:6px;" />
              <input id="inp-mtag" placeholder="TAG" maxlength="5" value="${this.esc(this.createMerchTag)}" style="padding:6px;border:1px solid #b5a06d;border-radius:6px;" />
              <input id="inp-mfounders" placeholder="ID 4 đồng sáng lập (cách dấu phẩy)" value="${this.esc(this.createMerchFounders)}" style="padding:6px;border:1px solid #b5a06d;border-radius:6px;" />
            </div>
            <div style="margin-top:8px;display:flex;justify-content:flex-end;">
              <button type="button" class="tk-action-btn" id="btn-create-merch">Lập Thương Hội</button>
            </div>
          </div>
        `;
    } else {
      const ranksHtml = this.merchRankings
        .map((r) => `<div class="tk-party-member-card"><span>#${r.rank} [${this.esc(r.tag)}] ${this.esc(r.name)} · Lv.${r.level}</span><strong>Uy tín: ${r.reputation}</strong></div>`)
        .join('');
      const logsHtml = this.auditLogs
        .slice(0, 12)
        .map((l) => `<div style="font-size:10px;padding:4px 6px;border-bottom:1px solid #e2d7ba;">[${this.esc(l.category)}] ${this.esc(l.details)}</div>`)
        .join('');
      body = `
        <h4 style="margin:2px 0;font-size:12px;color:#385744;">Bảng Xếp Hạng Thương Hội</h4>
        <div style="display:flex;flex-direction:column;gap:6px;">${ranksHtml || '<p style="font-size:11px;color:#68604d;">Chưa có dữ liệu.</p>'}</div>
        <h4 style="margin:6px 0 2px;font-size:12px;color:#385744;">Nhật Ký Kiểm Toán Giao Dịch (Anti-Abuse Ledger)</h4>
        <div style="border:1px solid #cbb98c;border-radius:6px;background:#faf5e6;">${logsHtml}</div>
      `;
    }

    return `${mSub}${body}`;
  }

  private renderTerritorySection(): string {
    return this.territories
      .map(
        (t) => `
        <div class="tk-set-bonus-box">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
            <strong style="color:#2f4735;font-size:13px;">🏰 ${this.esc(t.nameVi)} (Mùa ${t.seasonNumber})</strong>
            <span class="tk-heading-pill">${t.ownerGuildName ? `Chủ sở hữu: ${this.esc(t.ownerGuildName)}` : 'Vô Chủ (Tự Do)'}</span>
          </div>
          <div style="font-size:11px;color:#5d573f;">
            Map: ${this.esc(t.mapId)} · Phòng thủ: ${t.defensePoints}/${t.maxDefensePoints} · Thuế suất: ${t.taxRatePct}% (Tối đa ${t.maxTaxRatePct}%) · Thuế tích lũy: ${Number(t.accumulatedTaxGold || 0).toLocaleString()}G
          </div>
          <div style="font-size:10px;color:#15803d;">Bảo hộ chống độc quyền: Người chơi tự do vẫn thu thập tối đa ${t.publicDailyGatherQuota} lượt/ngày; Bang sở hữu nhận +${t.bonusYieldForOwnerPct}% sản lượng!</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;">
            ${
              t.ownerGuildId !== this.characterGuildId
                ? `<button type="button" class="tk-action-btn" data-terr-siege="${this.esc(t.territoryId)}">Công Phá / Chiếm Lãnh Thổ</button>`
                : `
                  <button type="button" class="tk-action-btn" data-terr-collect="${this.esc(t.territoryId)}">Thu Thuế Lãnh Thổ</button>
                  <button type="button" class="tk-tab-btn" data-terr-build="${this.esc(t.territoryId)}">Nâng Thành Lũy (12,000G Kho)</button>
                `
            }
          </div>
        </div>
      `
      )
      .join('');
  }

  private render() {
    if (!this.isOpenFlag) return;
    const contentHtml =
      this.section === 'guild'
        ? this.renderGuildSection()
        : this.section === 'merchant'
        ? this.renderMerchantSection()
        : this.renderTerritorySection();

    this.backdrop.innerHTML = `
      <section class="tk-window" role="dialog" aria-modal="true" style="width:min(860px,96vw);">
        <header class="tk-window-header">
          <div class="tk-header-title-group">
            <h2>BANG HỘI · THƯƠNG HỘI · CHỢ ĐẤU GIÁ &amp; LÃNH THỔ</h2>
            <p>Kinh Tế Liên Kết 8 Nghề Thủ Công · Giao Dịch An Toàn Máy Chủ</p>
          </div>
          <button type="button" class="tk-close-btn" id="gm-close-btn">✕</button>
        </header>
        <div class="tk-social-body">
          <div class="tk-filter-tabs">
            <button type="button" class="tk-tab-btn ${this.section === 'guild' ? 'active' : ''}" data-sec="guild">⚔️ Bang Hội</button>
            <button type="button" class="tk-tab-btn ${this.section === 'merchant' ? 'active' : ''}" data-sec="merchant">⚖️ Thương Hội &amp; Chợ</button>
            <button type="button" class="tk-tab-btn ${this.section === 'territory' ? 'active' : ''}" data-sec="territory">🏰 Lãnh Thổ (${this.territories.length})</button>
          </div>
          ${this.statusMsg ? `<div style="padding:6px 10px;border-radius:6px;background:#fef3c7;color:#92400e;font-size:11px;font-weight:700;">${this.esc(this.statusMsg)}</div>` : ''}
          ${contentHtml}
          <div style="display:flex;justify-content:flex-end;border-top:1px solid #d0c19a;padding-top:10px;">
            <button type="button" class="tk-tab-btn" id="gm-footer-close">Đóng</button>
          </div>
        </div>
      </section>
    `;

    this.backdrop.querySelector('.tk-window')?.addEventListener('click', (e) => e.stopPropagation());
    this.backdrop.querySelector('#gm-close-btn')?.addEventListener('click', () => this.close());
    this.backdrop.querySelector('#gm-footer-close')?.addEventListener('click', () => this.close());

    this.backdrop.querySelectorAll<HTMLElement>('[data-sec]').forEach((b) =>
      b.addEventListener('click', () => {
        this.section = b.dataset.sec as MainSection;
        this.render();
      })
    );
    this.backdrop.querySelectorAll<HTMLElement>('[data-gtab]').forEach((b) =>
      b.addEventListener('click', () => {
        this.guildTab = b.dataset.gtab as GuildSubTab;
        this.render();
      })
    );
    this.backdrop.querySelectorAll<HTMLElement>('[data-mtab]').forEach((b) =>
      b.addEventListener('click', () => {
        this.merchTab = b.dataset.mtab as MerchantSubTab;
        this.render();
      })
    );

    const bindVal = (sel: string, assign: (v: string) => void) => {
      const el = this.backdrop.querySelector(sel) as HTMLInputElement | null;
      el?.addEventListener('input', () => assign(el.value));
    };
    bindVal('#inp-gname', (v) => (this.createGuildName = v));
    bindVal('#inp-gtag', (v) => (this.createGuildTag = v));
    bindVal('#inp-gfounders', (v) => (this.createFounders = v));
    bindVal('#inp-mname', (v) => (this.createMerchName = v));
    bindVal('#inp-mtag', (v) => (this.createMerchTag = v));
    bindVal('#inp-mfounders', (v) => (this.createMerchFounders = v));

    const runAction = async (fn: () => Promise<any>, okText: string, mutated = true) => {
      const res = await fn();
      this.statusMsg = res.success ? okText : (res.error || 'Thao tác thất bại.');
      if (res.success && mutated) this.onCharacterMutated?.();
      await this.refreshAll();
    };

    this.backdrop.querySelector('#btn-create-guild')?.addEventListener('click', () => {
      if (!this.characterId) return;
      const founders = this.createFounders.split(',').map((s) => s.trim()).filter(Boolean);
      void runAction(async () => {
        const r = await createGuildApi({ creatorCharacterId: this.characterId!, name: this.createGuildName, tag: this.createGuildTag, foundingMemberIds: founders });
        if (r.success && r.data?.id) this.characterGuildId = r.data.id;
        return r;
      }, 'Đã thành lập Bang Hội thành công!');
    });

    this.backdrop.querySelector('#btn-create-merch')?.addEventListener('click', () => {
      if (!this.characterId) return;
      const founders = this.createMerchFounders.split(',').map((s) => s.trim()).filter(Boolean);
      void runAction(async () => {
        const r = await createMerchantAssocApi({ creatorCharacterId: this.characterId!, name: this.createMerchName, tag: this.createMerchTag, foundingMemberIds: founders });
        if (r.success && r.data?.id) this.characterMerchId = r.data.id;
        return r;
      }, 'Đã thành lập Thương Hội!');
    });

    this.backdrop.querySelectorAll<HTMLElement>('[data-apply-guild]').forEach((el) =>
      el.addEventListener('click', () => this.characterId && void runAction(() => applyGuildApi(el.dataset.applyGuild!, this.characterId!, 'Xin gia nhập Bang Hội!'), 'Đã nộp đơn xin gia nhập.', false))
    );
    this.backdrop.querySelector('#btn-save-ann')?.addEventListener('click', () => {
      const val = (this.backdrop.querySelector('#inp-gann') as HTMLInputElement)?.value || '';
      if (this.characterId && this.characterGuildId) void runAction(() => updateGuildAnnouncementApi(this.characterGuildId!, this.characterId!, val), 'Đã lưu thông báo Bang.', false);
    });
    this.backdrop.querySelector('#btn-gdonate')?.addEventListener('click', () => {
      const amt = Number((this.backdrop.querySelector('#inp-gdonate') as HTMLInputElement)?.value || 0);
      if (this.characterId && this.characterGuildId) void runAction(() => donateGuildGoldApi(this.characterGuildId!, this.characterId!, amt), `Đã quyên góp ${amt}G vào Bang!`);
    });
    this.backdrop.querySelector('#btn-gleave')?.addEventListener('click', () => {
      if (this.characterId && this.characterGuildId) void runAction(async () => {
        const r = await removeGuildMemberApi(this.characterGuildId!, this.characterId!, this.characterId!);
        if (r.success) this.characterGuildId = null;
        return r;
      }, 'Đã rời khỏi Bang Hội.');
    });
    this.backdrop.querySelectorAll<HTMLElement>('[data-gkick]').forEach((el) =>
      el.addEventListener('click', () => this.characterId && this.characterGuildId && void runAction(() => removeGuildMemberApi(this.characterGuildId!, this.characterId!, el.dataset.gkick!), 'Đã mời thành viên ra khỏi Bang.', false))
    );
    this.backdrop.querySelectorAll<HTMLElement>('[data-gapp]').forEach((el) =>
      el.addEventListener('click', () => this.characterId && this.characterGuildId && void runAction(() => reviewGuildAppApi(this.characterGuildId!, el.dataset.gapp!, this.characterId!, el.dataset.ok === '1'), 'Đã xử lý đơn xin gia nhập.', false))
    );
    this.backdrop.querySelector('#btn-gdeposit')?.addEventListener('click', () => {
      const itemId = (this.backdrop.querySelector('#sel-gdep-item') as HTMLSelectElement)?.value;
      if (itemId && this.characterId && this.characterGuildId) void runAction(() => depositGuildStorageApi(this.characterGuildId!, this.characterId!, itemId, 1), 'Đã gửi vào Kho Bang!');
    });
    this.backdrop.querySelectorAll<HTMLElement>('[data-gwithdraw]').forEach((el) =>
      el.addEventListener('click', () => this.characterId && this.characterGuildId && void runAction(() => withdrawGuildStorageApi(this.characterGuildId!, this.characterId!, el.dataset.gwithdraw!, 1), 'Đã rút vật phẩm từ Kho Bang!'))
    );
    this.backdrop.querySelectorAll<HTMLElement>('[data-gquest]').forEach((el) =>
      el.addEventListener('click', () => this.characterId && this.characterGuildId && void runAction(() => claimGuildQuestApi(this.characterGuildId!, this.characterId!, el.dataset.gquest!), 'Hoàn thành nhiệm vụ Bang Hội!'))
    );
    this.backdrop.querySelectorAll<HTMLElement>('[data-gskill]').forEach((el) =>
      el.addEventListener('click', () => this.characterId && this.characterGuildId && void runAction(() => upgradeGuildSkillApi(this.characterGuildId!, this.characterId!, el.dataset.gskill!), 'Đã nâng cấp Kỹ Năng Bang!', false))
    );
    this.backdrop.querySelectorAll<HTMLElement>('[data-gbuild]').forEach((el) =>
      el.addEventListener('click', () => this.characterId && this.characterGuildId && void runAction(() => upgradeGuildBuildingApi(this.characterGuildId!, this.characterId!, el.dataset.gbuild!), 'Đã nâng cấp Công Trình Bang!', false))
    );
    this.backdrop.querySelector('#btn-gboss-summon')?.addEventListener('click', () => {
      if (this.characterId && this.characterGuildId) void runAction(() => summonGuildBossApi(this.characterGuildId!, this.characterId!), 'Đã triệu hồi Boss Bang Hội!', false);
    });
    this.backdrop.querySelector('#btn-gboss-atk')?.addEventListener('click', () => {
      if (this.characterId && this.characterGuildId) void runAction(() => attackGuildBossApi(this.characterGuildId!, this.characterId!), 'Đã tấn công Boss Bang Hội!');
    });
    this.backdrop.querySelector('#btn-war-challenge')?.addEventListener('click', () => {
      const target = (this.backdrop.querySelector('#sel-war-target') as HTMLSelectElement)?.value;
      if (target && this.characterId && this.characterGuildId) void runAction(() => challengeGuildWarApi(this.characterGuildId!, this.characterId!, target), 'Đã tuyên chiến Bang Chiến!', false);
    });
    this.backdrop.querySelectorAll<HTMLElement>('[data-war-atk]').forEach((el) =>
      el.addEventListener('click', () => this.characterId && void runAction(() => scoreGuildWarApi(el.dataset.warAtk!, this.characterId!, 150, false), 'Ghi +150 điểm Bang Chiến!', false))
    );
    this.backdrop.querySelectorAll<HTMLElement>('[data-war-fin]').forEach((el) =>
      el.addEventListener('click', () => this.characterId && void runAction(() => scoreGuildWarApi(el.dataset.warFin!, this.characterId!, 50, true), 'Trận Bang Chiến đã kết thúc!', false))
    );

    // Market, Buy Orders, Auctions, Contracts, Caravans & Territories
    this.backdrop.querySelector('#btn-mkt-sell')?.addEventListener('click', () => {
      const itemId = (this.backdrop.querySelector('#sel-mkt-item') as HTMLSelectElement)?.value;
      const price = Number((this.backdrop.querySelector('#inp-mkt-price') as HTMLInputElement)?.value || 100);
      if (itemId && this.characterId) void runAction(() => createMarketListingApi({ sellerCharacterId: this.characterId!, itemId, quantity: 1, unitPriceGold: price }), 'Đã đăng bán lên Chợ!');
    });
    this.backdrop.querySelectorAll<HTMLElement>('[data-mkt-buy]').forEach((el) =>
      el.addEventListener('click', () => this.characterId && void runAction(() => buyMarketListingApi(el.dataset.mktBuy!, this.characterId!), 'Mua hàng thành công!'))
    );
    this.backdrop.querySelectorAll<HTMLElement>('[data-mkt-cancel]').forEach((el) =>
      el.addEventListener('click', () => this.characterId && void runAction(() => cancelMarketListingApi(el.dataset.mktCancel!, this.characterId!), 'Đã gỡ hàng về Balo!'))
    );
    this.backdrop.querySelector('#btn-ord-create')?.addEventListener('click', () => {
      const itemId = (this.backdrop.querySelector('#inp-ord-item') as HTMLInputElement)?.value.trim();
      const qty = Number((this.backdrop.querySelector('#inp-ord-qty') as HTMLInputElement)?.value || 1);
      const price = Number((this.backdrop.querySelector('#inp-ord-price') as HTMLInputElement)?.value || 10);
      if (itemId && this.characterId) void runAction(() => createBuyOrderApi({ buyerCharacterId: this.characterId!, itemId, quantity: qty, unitPriceGold: price }), 'Đã ký quỹ Lệnh Thu Mua!');
    });
    this.backdrop.querySelectorAll<HTMLElement>('[data-ord-fill]').forEach((el) =>
      el.addEventListener('click', () => this.characterId && void runAction(() => fulfillBuyOrderApi(el.dataset.ordFill!, this.characterId!, 1), 'Đã bán hàng khớp Lệnh Thu Mua!'))
    );
    this.backdrop.querySelector('#btn-auc-create')?.addEventListener('click', () => {
      const itemId = (this.backdrop.querySelector('#sel-auc-item') as HTMLSelectElement)?.value;
      const startPrice = Number((this.backdrop.querySelector('#inp-auc-start') as HTMLInputElement)?.value || 100);
      if (itemId && this.characterId) void runAction(() => createAuctionApi({ sellerCharacterId: this.characterId!, itemId, quantity: 1, startingPriceGold: startPrice }), 'Đã đưa vật phẩm lên Đấu Giá!');
    });
    this.backdrop.querySelectorAll<HTMLElement>('[data-auc-bid]').forEach((el) =>
      el.addEventListener('click', () => this.characterId && void runAction(() => bidAuctionApi(el.dataset.aucBid!, this.characterId!, Number(el.dataset.bid)), 'Đặt giá Đấu Giá thành công!'))
    );
    this.backdrop.querySelectorAll<HTMLElement>('[data-ctr-fill]').forEach((el) =>
      el.addEventListener('click', () => this.characterId && void runAction(() => fulfillContractApi(el.dataset.ctrFill!, this.characterId!), 'Hoàn thành Hợp Đồng Cung Ứng!'))
    );
    this.backdrop.querySelectorAll<HTMLElement>('[data-crv-start]').forEach((el) =>
      el.addEventListener('click', () => this.characterId && this.characterMerchId && void runAction(() => startCaravanApi(this.characterMerchId!, this.characterId!, el.dataset.crvStart!), 'Đoàn xe đã xuất phát!'))
    );
    this.backdrop.querySelectorAll<HTMLElement>('[data-crv-done]').forEach((el) =>
      el.addEventListener('click', () => this.characterId && void runAction(() => completeCaravanApi(el.dataset.crvDone!, this.characterId!), 'Đoàn xe cập bến an toàn!'))
    );
    this.backdrop.querySelectorAll<HTMLElement>('[data-terr-siege]').forEach((el) =>
      el.addEventListener('click', () => this.characterId && void runAction(() => siegeTerritoryApi(el.dataset.terrSiege!, this.characterId!), 'Đã phát động tấn công Lãnh Thổ!', false))
    );
    this.backdrop.querySelectorAll<HTMLElement>('[data-terr-collect]').forEach((el) =>
      el.addEventListener('click', () => this.characterId && void runAction(() => updateTerritoryTaxApi(el.dataset.terrCollect!, this.characterId!, undefined, true), 'Đã thu thuế vào Ngân Khố Bang!', false))
    );
    this.backdrop.querySelectorAll<HTMLElement>('[data-terr-build]').forEach((el) =>
      el.addEventListener('click', () => this.characterId && void runAction(() => upgradeTerritoryBuildingApi(el.dataset.terrBuild!, this.characterId!, 'tb_wall'), 'Đã nâng cấp Thành Lũy Lãnh Thổ!', false))
    );
  }
}
