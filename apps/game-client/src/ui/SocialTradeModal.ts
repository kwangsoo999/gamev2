import type { PartyState, RemotePlayerState, TradeSessionState } from '@elysia/game-types';
import { HudSnapshot } from '../engine/GameEngine';
import { modalManager } from './ModalManager';

type SocialTab = 'party' | 'players' | 'trade';

export interface PartyInviteAlert {
  partyId: string;
  fromCharacterId: string;
  fromName: string;
}

export interface TradeInviteAlert {
  fromCharacterId: string;
  fromName: string;
}

/**
 * Community, Party, Online Player Inspect & Dual-Pane Atomic Trade Modal.
 */
export class SocialTradeModal {
  public static readonly MODAL_ID = 'social-trade';
  private backdrop: HTMLElement;
  private isOpenFlag = false;
  private activeTab: SocialTab = 'party';

  private selfCharacterId = '';
  private selfGold = 0;
  private selfInventory: HudSnapshot['inventory'] = [];

  private onlinePlayers: RemotePlayerState[] = [];
  private inspectedPlayer: any = null;
  private party: PartyState | null = null;
  private pendingPartyInvites: PartyInviteAlert[] = [];
  private pendingTradeInvites: TradeInviteAlert[] = [];
  private activeTrade: TradeSessionState | null = null;

  private inviteNameInput = '';
  private searchFilter = '';
  private tradeGoldInput = 0;
  private tradeSelectedItems = new Map<string, number>();
  private statusNotice = '';

  public onRefreshOnline?: () => void;
  public onInspectPlayer?: (characterId: string) => void;
  public onPartyCreate?: () => void;
  public onPartyInvite?: (target: string) => void;
  public onPartyRespond?: (partyId: string, accept: boolean) => void;
  public onPartyLeave?: () => void;
  public onPartyKick?: (targetId: string) => void;
  public onTradeRequest?: (target: string) => void;
  public onTradeRespond?: (fromId: string, accept: boolean) => void;
  public onTradeUpdateOffer?: (tradeId: string, gold: number, items: Array<{ itemId: string; quantity: number }>) => void;
  public onTradeLock?: (tradeId: string) => void;
  public onTradeConfirm?: (tradeId: string) => void;
  public onTradeCancel?: (tradeId: string) => void;
  public onStartWhisper?: (targetName: string) => void;

  constructor() {
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'tk-modal-backdrop hidden';
    this.backdrop.id = 'modal-social-trade';
    document.body.append(this.backdrop);

    modalManager.registerBackdrop(this.backdrop, () => ({
      id: SocialTradeModal.MODAL_ID,
      onRequestClose: () => this.close(),
    }));
  }

  public isOpen(): boolean {
    return this.isOpenFlag;
  }

  public open(tab?: SocialTab) {
    if (tab) this.activeTab = tab;
    this.isOpenFlag = true;
    this.render();
    modalManager.open({
      id: SocialTradeModal.MODAL_ID,
      backdrop: this.backdrop,
      onClose: () => {
        this.isOpenFlag = false;
      },
    });
    this.onRefreshOnline?.();
  }

  public close() {
    if (!this.isOpenFlag && !modalManager.isOpen(SocialTradeModal.MODAL_ID)) return;
    this.isOpenFlag = false;
    this.backdrop.classList.add('hidden');
    modalManager.close(SocialTradeModal.MODAL_ID);
  }

  public syncSelfHud(characterId: string | null, snap: HudSnapshot) {
    this.selfCharacterId = characterId || '';
    this.selfGold = Number(snap.stats?.gold ?? 0);
    this.selfInventory = snap.inventory || [];
    if (this.isOpenFlag && this.activeTab === 'trade') {
      this.render();
    }
  }

  public setOnlinePlayers(list: RemotePlayerState[]) {
    this.onlinePlayers = list || [];
    if (this.isOpenFlag) this.render();
  }

  public setInspectedPlayer(data: any) {
    this.inspectedPlayer = data;
    this.activeTab = 'players';
    if (this.isOpenFlag) this.render();
  }

  public setParty(party: PartyState | null) {
    this.party = party;
    if (this.isOpenFlag) this.render();
  }

  public pushPartyInvite(inv: PartyInviteAlert) {
    if (!this.pendingPartyInvites.some((x) => x.partyId === inv.partyId)) {
      this.pendingPartyInvites.push(inv);
    }
    if (this.isOpenFlag) this.render();
  }

  public pushTradeInvite(req: TradeInviteAlert) {
    if (!this.pendingTradeInvites.some((x) => x.fromCharacterId === req.fromCharacterId)) {
      this.pendingTradeInvites.push(req);
    }
    if (this.isOpenFlag) this.render();
  }

  public setTradeSession(session: TradeSessionState | null, notice?: string) {
    this.activeTrade = session;
    if (!session) {
      this.tradeGoldInput = 0;
      this.tradeSelectedItems.clear();
    } else {
      const mySide = this.getMyTradeSide(session);
      if (mySide) {
        this.tradeGoldInput = mySide.gold || 0;
      }
      this.activeTab = 'trade';
    }
    if (notice) this.statusNotice = notice;
    if (this.isOpenFlag) this.render();
  }

  public getPendingInviteCount(): number {
    return this.pendingPartyInvites.length + this.pendingTradeInvites.length + (this.activeTrade ? 1 : 0);
  }

  private getMyTradeSide(session: TradeSessionState) {
    return session.parties.find((p) => p.characterId === this.selfCharacterId) || session.parties[0];
  }

  private getPartnerTradeSide(session: TradeSessionState) {
    return session.parties.find((p) => p.characterId !== this.selfCharacterId) || session.parties[1];
  }

  private render() {
    if (!this.isOpenFlag) return;
    const esc = (s: unknown) =>
      String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const invitesBannerHtml = [
      ...this.pendingPartyInvites.map(
        (inv) => `
          <div class="tk-inspector-bar" style="border-color:#d97706;background:#fef3c7;">
            <span><strong>${esc(inv.fromName)}</strong> mời bạn vào Tổ Đội</span>
            <div style="display:flex;gap:6px;">
              <button type="button" class="tk-action-btn" data-act="accept-party" data-id="${esc(inv.partyId)}">Đồng Ý</button>
              <button type="button" class="tk-tab-btn" data-act="decline-party" data-id="${esc(inv.partyId)}">Từ Chối</button>
            </div>
          </div>
        `
      ),
      ...this.pendingTradeInvites.map(
        (req) => `
          <div class="tk-inspector-bar" style="border-color:#0284c7;background:#e0f2fe;">
            <span><strong>${esc(req.fromName)}</strong> yêu cầu Giao Dịch</span>
            <div style="display:flex;gap:6px;">
              <button type="button" class="tk-action-btn" data-act="accept-trade" data-id="${esc(req.fromCharacterId)}">Mở Giao Dịch</button>
              <button type="button" class="tk-tab-btn" data-act="decline-trade" data-id="${esc(req.fromCharacterId)}">Từ Chối</button>
            </div>
          </div>
        `
      ),
    ].join('');

    let bodyHtml = '';
    if (this.activeTab === 'party') {
      const membersHtml = this.party
        ? this.party.members
            .map((m) => {
              const isLeader = m.characterId === this.party!.leaderCharacterId;
              const isSelf = m.characterId === this.selfCharacterId;
              const iAmLeader = this.party!.leaderCharacterId === this.selfCharacterId;
              const hpPct = Math.round((m.hp / Math.max(1, m.maxHp)) * 100);
              return `
                <div class="tk-party-member-card">
                  <div style="flex:1;min-width:0;">
                    <div style="display:flex;align-items:center;gap:6px;font-weight:700;color:#2f4735;font-size:12px;">
                      ${isLeader ? '<span title="Đội Trưởng">👑</span>' : ''}
                      <span>${esc(m.name)}</span>
                      <span class="tk-heading-pill">Lv.${m.level} · ${esc(m.classId)}</span>
                      ${m.online ? '<span class="tk-status-badge locked">Online</span>' : '<span class="tk-status-badge open">Offline</span>'}
                    </div>
                    <div style="font-size:10px;color:#68604d;margin-top:3px;">HP ${m.hp}/${m.maxHp} (${hpPct}%) · MP ${m.mp}/${m.maxMp}</div>
                  </div>
                  <div style="display:flex;gap:6px;">
                    ${!isSelf ? `<button type="button" class="tk-tab-btn" data-act="inspect" data-id="${esc(m.characterId)}">Soi Đồ</button>` : ''}
                    ${iAmLeader && !isSelf ? `<button type="button" class="tk-tab-btn" data-act="kick-party" data-id="${esc(m.characterId)}">Mời Ra</button>` : ''}
                  </div>
                </div>
              `;
            })
            .join('')
        : '<p style="font-size:12px;color:#68604d;">Bạn chưa gia nhập Tổ Đội nào. Tạo nhóm để cùng chia sẻ chỉ số HP/MP, chat kênh Nhóm và săn Boss!</p>';

      bodyHtml = `
        <div class="tk-inspector-bar">
          <div style="display:flex;gap:8px;flex:1;align-items:center;">
            <input type="text" id="social-invite-input" placeholder="Nhập tên nhân vật để mời nhóm..." value="${esc(this.inviteNameInput)}" style="flex:1;padding:6px 8px;border:1px solid #b5a06d;border-radius:6px;" />
            <button type="button" class="tk-action-btn" id="btn-social-invite">Mời Nhóm</button>
          </div>
          <div style="display:flex;gap:6px;">
            ${
              this.party
                ? `<button type="button" class="tk-tab-btn" id="btn-party-leave">Rời Nhóm</button>`
                : `<button type="button" class="tk-action-btn" id="btn-party-create">Tạo Tổ Đội (Tối đa 5)</button>`
            }
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">${membersHtml}</div>
      `;
    } else if (this.activeTab === 'players') {
      const q = this.searchFilter.trim().toLowerCase();
      const filtered = this.onlinePlayers.filter(
        (p) => !q || p.name.toLowerCase().includes(q) || (p.secondJobName || p.classId || '').toLowerCase().includes(q)
      );
      const listHtml = filtered.length
        ? filtered
            .map((p) => {
              const isSelf = p.characterId === this.selfCharacterId;
              const jobLabel = p.secondJobName || p.classId || 'Tân Thủ';
              return `
                <div class="tk-party-member-card">
                  <div>
                    <div style="font-weight:700;color:#2f4735;font-size:12px;">
                      ${esc(p.name)} ${isSelf ? '<em style="color:#0284c7;">(Bạn)</em>' : ''}
                      <span class="tk-heading-pill">Lv.${p.level} · ${esc(jobLabel)}</span>
                    </div>
                    <div style="font-size:10px;color:#68604d;margin-top:2px;">Khu vực: ${esc(p.regionId)} · Tọa độ (${Math.round(p.x)}, ${Math.round(p.y)})</div>
                  </div>
                  <div style="display:flex;gap:5px;flex-wrap:wrap;">
                    <button type="button" class="tk-tab-btn" data-act="inspect" data-id="${esc(p.characterId)}">Kiểm Tra</button>
                    ${
                      !isSelf
                        ? `
                          <button type="button" class="tk-tab-btn" data-act="invite-name" data-name="${esc(p.name)}">Mời Nhóm</button>
                          <button type="button" class="tk-tab-btn" data-act="trade-name" data-name="${esc(p.name)}">Giao Dịch</button>
                          <button type="button" class="tk-tab-btn" data-act="whisper-name" data-name="${esc(p.name)}">Mật</button>
                        `
                        : ''
                    }
                  </div>
                </div>
              `;
            })
            .join('')
        : '<p style="font-size:12px;color:#68604d;">Không có người chơi nào khớp từ khóa.</p>';

      const inspectCardHtml = this.inspectedPlayer
        ? `
          <div class="tk-set-bonus-box">
            <div class="tk-section-heading">
              <span>HỒ SƠ KIỂM TRA: ${esc(this.inspectedPlayer.name)} (Lv.${this.inspectedPlayer.level})</span>
              <span class="tk-heading-pill">${esc(this.inspectedPlayer.secondJobName || this.inspectedPlayer.classId)}</span>
            </div>
            <div style="font-size:11px;color:#3f5641;">
              HP: <strong>${this.inspectedPlayer.hp}/${this.inspectedPlayer.maxHp}</strong> ·
              MP: <strong>${this.inspectedPlayer.mp}/${this.inspectedPlayer.maxMp}</strong> ·
              Khu vực: <strong>${esc(this.inspectedPlayer.regionId)}</strong>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;">
              ${Object.entries(this.inspectedPlayer.equipment || {}).length
                ? Object.entries(this.inspectedPlayer.equipment)
                    .map(([slot, it]: [string, any]) => `<span class="tk-heading-pill">${esc(slot)}: ${esc(it?.name || it?.id || 'Trang Bị')}</span>`)
                    .join('')
                : '<span style="font-size:10px;color:#68604d;">Chưa mặc trang bị đặc biệt.</span>'}
            </div>
          </div>
        `
        : '';

      bodyHtml = `
        <div class="tk-inspector-bar">
          <input type="text" id="social-search-input" placeholder="Tìm tên nhân vật hoặc nghề..." value="${esc(this.searchFilter)}" style="flex:1;padding:6px 8px;border:1px solid #b5a06d;border-radius:6px;" />
          <button type="button" class="tk-action-btn" id="btn-social-refresh">Làm Mới (${this.onlinePlayers.length})</button>
        </div>
        ${inspectCardHtml}
        <div style="display:flex;flex-direction:column;gap:8px;">${listHtml}</div>
      `;
    } else {
      if (!this.activeTrade) {
        bodyHtml = `
          <div class="tk-inspector-bar">
            <div style="display:flex;gap:8px;flex:1;align-items:center;">
              <input type="text" id="social-trade-target" placeholder="Nhập tên nhân vật để gửi lời mời Giao Dịch..." value="${esc(this.inviteNameInput)}" style="flex:1;padding:6px 8px;border:1px solid #b5a06d;border-radius:6px;" />
              <button type="button" class="tk-action-btn" id="btn-trade-request">Gửi Giao Dịch</button>
            </div>
          </div>
          <p style="font-size:11px;color:#5d573f;">Giao dịch nguyên tử qua máy chủ (Atomic Transaction): hỗ trợ Vàng + vật phẩm không khóa. Nếu bất kỳ bên nào thay đổi vật phẩm/Vàng, khóa xác nhận của cả hai bên sẽ tự động mở lại để chống lừa đảo.</p>
        `;
      } else {
        const mySide = this.getMyTradeSide(this.activeTrade);
        const partnerSide = this.getPartnerTradeSide(this.activeTrade);
        const tradableInv = this.selfInventory.filter((it) => !it.id.startsWith('UEQ_') && !it.id.startsWith('ITEM_AWAKENING'));
        bodyHtml = `
          <div class="tk-trade-grid">
            <div class="tk-trade-pane">
              <div class="tk-section-heading">
                <span>BÊN BẠN (${esc(mySide.characterName)})</span>
                <span class="tk-status-badge ${mySide.confirmed ? 'locked' : mySide.locked ? 'locked' : 'open'}">
                  ${mySide.confirmed ? 'Đã Xác Nhận' : mySide.locked ? 'Đã Khóa' : 'Đang Chọn'}
                </span>
              </div>
              <label style="font-size:11px;color:#405844;display:flex;align-items:center;gap:6px;">
                Vàng giao dịch (Có ${this.selfGold.toLocaleString()}G):
                <input type="number" id="trade-gold-input" min="0" max="${this.selfGold}" value="${this.tradeGoldInput}" style="width:100px;padding:4px 6px;border:1px solid #b5a06d;border-radius:5px;" />
              </label>
              <div style="font-size:10px;color:#68604d;">Nhấp chọn vật phẩm từ Balo để thêm/bớt (Server tự động kiểm tra sở hữu):</div>
              <div style="display:flex;flex-wrap:wrap;gap:5px;max-height:110px;overflow-y:auto;">
                ${tradableInv
                  .map((it) => {
                    const qty = this.tradeSelectedItems.get(it.id) || 0;
                    return `<button type="button" class="tk-tab-btn ${qty > 0 ? 'active' : ''}" data-act="toggle-trade-item" data-id="${esc(it.id)}" data-max="${it.qty}">${esc(it.name)} (${qty}/${it.qty})</button>`;
                  })
                  .join('')}
              </div>
              <div style="display:flex;gap:6px;flex-wrap:wrap;">
                <button type="button" class="tk-tab-btn" id="btn-trade-sync">Cập Nhật Đề Nghị</button>
                <button type="button" class="tk-action-btn" id="btn-trade-lock" ${mySide.locked ? 'disabled' : ''}>Khóa</button>
                <button type="button" class="tk-action-btn" id="btn-trade-confirm" ${!mySide.locked || mySide.confirmed ? 'disabled' : ''}>Xác Nhận Giao Dịch</button>
              </div>
            </div>
            <div class="tk-trade-pane">
              <div class="tk-section-heading">
                <span>ĐỐI PHƯƠNG (${esc(partnerSide.characterName)})</span>
                <span class="tk-status-badge ${partnerSide.confirmed ? 'locked' : partnerSide.locked ? 'locked' : 'open'}">
                  ${partnerSide.confirmed ? 'Đã Xác Nhận' : partnerSide.locked ? 'Đã Khóa' : 'Đang Chọn'}
                </span>
              </div>
              <div style="font-size:12px;font-weight:700;color:#b45309;">Vàng nhận: ${Number(partnerSide.gold || 0).toLocaleString()} G</div>
              <div style="display:flex;flex-direction:column;gap:4px;">
                ${partnerSide.items.length
                  ? partnerSide.items.map((it: { itemId: string; name?: string; quantity: number }) => `<span class="tk-heading-pill">${esc(it.name || it.itemId)} x${it.quantity}</span>`).join('')
                  : '<span style="font-size:11px;color:#68604d;">Đối phương chưa đặt vật phẩm.</span>'}
              </div>
            </div>
          </div>
          <div style="display:flex;justify-content:flex-end;">
            <button type="button" class="tk-tab-btn" id="btn-trade-cancel" style="background:#7f1d1d;border-color:#fca5a5;">Hủy Giao Dịch</button>
          </div>
        `;
      }
    }

    this.backdrop.innerHTML = `
      <section class="tk-window" role="dialog" aria-modal="true" style="width:min(760px,95vw);">
        <header class="tk-window-header">
          <div class="tk-header-title-group">
            <h2>CỘNG ĐỒNG · TỔ ĐỘI &amp; GIAO DỊCH</h2>
            <p>Online Real-Time Socket.IO · Inspect · Party · Atomic Trade</p>
          </div>
          <button type="button" class="tk-close-btn" id="social-close-btn" aria-label="Đóng">✕</button>
        </header>
        <div class="tk-social-body">
          <div class="tk-filter-tabs">
            <button type="button" class="tk-tab-btn ${this.activeTab === 'party' ? 'active' : ''}" data-tab="party">Tổ Đội (${this.party?.members.length || 0}/5)</button>
            <button type="button" class="tk-tab-btn ${this.activeTab === 'players' ? 'active' : ''}" data-tab="players">Người Chơi (${this.onlinePlayers.length})</button>
            <button type="button" class="tk-tab-btn ${this.activeTab === 'trade' ? 'active' : ''}" data-tab="trade">Giao Dịch ${this.activeTrade ? '●' : ''}</button>
          </div>
          ${this.statusNotice ? `<div style="padding:6px 10px;border-radius:6px;background:#fef3c7;color:#92400e;font-size:11px;font-weight:700;">${esc(this.statusNotice)}</div>` : ''}
          ${invitesBannerHtml}
          ${bodyHtml}
          <div style="display:flex;justify-content:flex-end;border-top:1px solid #d0c19a;padding-top:10px;">
            <button type="button" class="tk-tab-btn" id="social-footer-close">Đóng</button>
          </div>
        </div>
      </section>
    `;

    const win = this.backdrop.querySelector('.tk-window') as HTMLElement | null;
    win?.addEventListener('click', (e) => e.stopPropagation());
    this.backdrop.querySelector('#social-close-btn')?.addEventListener('click', () => this.close());
    this.backdrop.querySelector('#social-footer-close')?.addEventListener('click', () => this.close());

    this.backdrop.querySelectorAll<HTMLElement>('[data-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.activeTab = (btn.dataset.tab as SocialTab) || 'party';
        if (this.activeTab === 'players') this.onRefreshOnline?.();
        this.render();
      });
    });

    const invInput = this.backdrop.querySelector('#social-invite-input') as HTMLInputElement | null;
    invInput?.addEventListener('input', () => { this.inviteNameInput = invInput.value; });
    this.backdrop.querySelector('#btn-social-invite')?.addEventListener('click', () => {
      if (this.inviteNameInput.trim()) this.onPartyInvite?.(this.inviteNameInput.trim());
    });
    this.backdrop.querySelector('#btn-party-create')?.addEventListener('click', () => this.onPartyCreate?.());
    this.backdrop.querySelector('#btn-party-leave')?.addEventListener('click', () => this.onPartyLeave?.());

    const searchInput = this.backdrop.querySelector('#social-search-input') as HTMLInputElement | null;
    searchInput?.addEventListener('input', () => {
      this.searchFilter = searchInput.value;
      this.render();
      const el = this.backdrop.querySelector('#social-search-input') as HTMLInputElement | null;
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    });
    this.backdrop.querySelector('#btn-social-refresh')?.addEventListener('click', () => this.onRefreshOnline?.());

    const tradeTarget = this.backdrop.querySelector('#social-trade-target') as HTMLInputElement | null;
    tradeTarget?.addEventListener('input', () => { this.inviteNameInput = tradeTarget.value; });
    this.backdrop.querySelector('#btn-trade-request')?.addEventListener('click', () => {
      if (this.inviteNameInput.trim()) this.onTradeRequest?.(this.inviteNameInput.trim());
    });

    const goldEl = this.backdrop.querySelector('#trade-gold-input') as HTMLInputElement | null;
    goldEl?.addEventListener('input', () => {
      this.tradeGoldInput = Math.max(0, Math.min(this.selfGold, Number(goldEl.value || 0)));
    });
    this.backdrop.querySelector('#btn-trade-sync')?.addEventListener('click', () => {
      if (!this.activeTrade) return;
      const items = Array.from(this.tradeSelectedItems.entries())
        .filter(([, q]) => q > 0)
        .map(([itemId, quantity]) => ({ itemId, quantity }));
      this.onTradeUpdateOffer?.(this.activeTrade.tradeId, this.tradeGoldInput, items);
    });
    this.backdrop.querySelector('#btn-trade-lock')?.addEventListener('click', () => {
      if (this.activeTrade) this.onTradeLock?.(this.activeTrade.tradeId);
    });
    this.backdrop.querySelector('#btn-trade-confirm')?.addEventListener('click', () => {
      if (this.activeTrade) this.onTradeConfirm?.(this.activeTrade.tradeId);
    });
    this.backdrop.querySelector('#btn-trade-cancel')?.addEventListener('click', () => {
      if (this.activeTrade) this.onTradeCancel?.(this.activeTrade.tradeId);
    });

    this.backdrop.querySelectorAll<HTMLElement>('[data-act]').forEach((el) => {
      el.addEventListener('click', () => {
        const act = el.dataset.act;
        const id = el.dataset.id || '';
        const name = el.dataset.name || '';
        if (act === 'inspect' && id) this.onInspectPlayer?.(id);
        else if (act === 'kick-party' && id) this.onPartyKick?.(id);
        else if (act === 'accept-party' && id) {
          this.pendingPartyInvites = this.pendingPartyInvites.filter((x) => x.partyId !== id);
          this.onPartyRespond?.(id, true);
        } else if (act === 'decline-party' && id) {
          this.pendingPartyInvites = this.pendingPartyInvites.filter((x) => x.partyId !== id);
          this.onPartyRespond?.(id, false);
          this.render();
        } else if (act === 'accept-trade' && id) {
          this.pendingTradeInvites = this.pendingTradeInvites.filter((x) => x.fromCharacterId !== id);
          this.onTradeRespond?.(id, true);
        } else if (act === 'decline-trade' && id) {
          this.pendingTradeInvites = this.pendingTradeInvites.filter((x) => x.fromCharacterId !== id);
          this.onTradeRespond?.(id, false);
          this.render();
        } else if (act === 'invite-name' && name) {
          this.onPartyInvite?.(name);
        } else if (act === 'trade-name' && name) {
          this.onTradeRequest?.(name);
        } else if (act === 'whisper-name' && name) {
          this.onStartWhisper?.(name);
          this.close();
        } else if (act === 'toggle-trade-item' && id) {
          const maxQty = Math.max(1, Number(el.dataset.max || 1));
          const cur = this.tradeSelectedItems.get(id) || 0;
          if (cur > 0) this.tradeSelectedItems.delete(id);
          else this.tradeSelectedItems.set(id, Math.min(1, maxQty));
          this.render();
        }
      });
    });
  }
}
