import { modalManager } from './ModalManager';

interface EventDayReward {
  day: number;
  icon: string;
  label: string;
  goldBonus: number;
}

const SEVEN_DAY_REWARDS: EventDayReward[] = [
  { day: 1, icon: '🪙', label: '1,500 Vàng Tân Thủ', goldBonus: 1500 },
  { day: 2, icon: '🧪', label: '2,000 Vàng + Túi HP', goldBonus: 2000 },
  { day: 3, icon: '💎', label: '3,000 Vàng Khởi Nguyên', goldBonus: 3000 },
  { day: 4, icon: '⚔️', label: '4,000 Vàng Rèn Vũ Khí', goldBonus: 4000 },
  { day: 5, icon: '💠', label: '5,500 Vàng Hổ Phách', goldBonus: 5500 },
  { day: 6, icon: '🛡️', label: '7,000 Vàng Gia Cố', goldBonus: 7000 },
  { day: 7, icon: '👑', label: '12,000 Vàng Truyền Thuyết', goldBonus: 12000 },
];

const CLAIMED_DAYS_STORAGE = 'elysia_event_days_v1';

export class EventModal {
  public static readonly MODAL_ID = 'events';
  private backdrop: HTMLElement;
  private isOpen = false;
  private characterId = 'default';
  private claimedDays: number[] = [];

  public onClaimEventGold?: (amount: number, label: string) => void;
  public onToast?: (msg: string, variant?: 'info' | 'success' | 'error') => void;

  constructor() {
    this.backdrop = document.createElement('div');
    this.backdrop.id = 'modal-events';
    this.backdrop.className = 'tk-modal-backdrop hidden';
    this.backdrop.setAttribute('aria-hidden', 'true');
    document.body.appendChild(this.backdrop);

    modalManager.registerBackdrop(this.backdrop, () => ({
      id: EventModal.MODAL_ID,
      onRequestClose: () => this.close(),
      closeOnBackdrop: true,
    }));

    this.backdrop.addEventListener('click', (e) => {
      const target = e.target as HTMLElement | null;
      if (!target || target === this.backdrop) return;
      e.stopPropagation();

      if (target.closest('[data-close-modal="events"], #btn-close-events')) {
        this.close();
        return;
      }

      const claimBtn = target.closest('[data-claim-event-day]');
      if (claimBtn) {
        const day = Number(claimBtn.getAttribute('data-claim-event-day'));
        this.claimDay(day);
      }
    });
  }

  private loadClaimed(charId: string) {
    this.characterId = charId || 'default';
    try {
      const raw = localStorage.getItem(`${CLAIMED_DAYS_STORAGE}:${this.characterId}`);
      const parsed = raw ? JSON.parse(raw) : [];
      this.claimedDays = Array.isArray(parsed) ? parsed : [];
    } catch {
      this.claimedDays = [];
    }
  }

  private saveClaimed() {
    try {
      localStorage.setItem(`${CLAIMED_DAYS_STORAGE}:${this.characterId}`, JSON.stringify(this.claimedDays));
    } catch {
      // ignore
    }
  }

  private claimDay(day: number) {
    const def = SEVEN_DAY_REWARDS.find((d) => d.day === day);
    if (!def || this.claimedDays.includes(day)) return;
    this.claimedDays.push(day);
    this.saveClaimed();
    this.onClaimEventGold?.(def.goldBonus, def.label);
    this.onToast?.(`Đã nhận quà Điểm Danh Ngày ${day}: ${def.label}!`, 'success');
    this.render();
  }

  public open(characterId = 'default') {
    this.loadClaimed(characterId);
    this.isOpen = true;
    modalManager.open({
      id: EventModal.MODAL_ID,
      backdrop: this.backdrop,
      onClose: () => {
        this.isOpen = false;
      },
    });
    this.render();
  }

  public close() {
    this.isOpen = false;
    modalManager.close(EventModal.MODAL_ID);
  }

  public toggle(characterId = 'default') {
    if (this.isOpen) this.close();
    else this.open(characterId);
  }

  private render() {
    const nextUnclaimed = SEVEN_DAY_REWARDS.find((d) => !this.claimedDays.includes(d.day))?.day ?? 999;

    this.backdrop.innerHTML = `
      <div class="tk-window" style="width:min(840px,95vw);" role="dialog" aria-modal="true" aria-label="Trung tâm Sự kiện">
        <div class="tk-window-header">
          <div class="tk-header-title-group">
            <span class="tk-header-crest">🎉</span>
            <div>
              <h2>TRUNG TÂM HOẠT ĐỘNG &amp; SỰ KIỆN ELYSIA</h2>
              <p>Điểm danh 7 ngày nhận tài nguyên &amp; Theo dõi thời gian Boss xuất hiện</p>
            </div>
          </div>
          <button type="button" class="tk-btn-close" id="btn-close-events" data-close-modal="events" title="Đóng [ESC]">✕</button>
        </div>

        <div class="tk-modal-scroll-body">
          <div class="tk-panel-inset" style="display:flex;flex-direction:column;gap:10px;">
            <div class="tk-section-heading"><span>QUÀ ĐIỂM DANH 7 NGÀY TÂN THỦ</span><span class="tk-heading-pill">${this.claimedDays.length}/7 Ngày</span></div>
            <div class="tk-event-grid">
              ${SEVEN_DAY_REWARDS.map((item) => {
                const claimed = this.claimedDays.includes(item.day);
                const isNext = item.day === nextUnclaimed;
                return `
                  <div class="tk-event-day-card ${claimed ? 'claimed' : isNext ? 'current' : ''}">
                    <strong>Ngày ${item.day}</strong>
                    <span style="font-size:24px;">${item.icon}</span>
                    <span>${item.label}</span>
                    ${
                      claimed
                        ? `<span class="tk-heading-pill">Đã Nhận</span>`
                        : `<button type="button" class="tk-action-btn" data-claim-event-day="${item.day}" ${isNext ? '' : 'disabled'}>${isNext ? 'Nhận Quà' : 'Chưa Tới'}</button>`
                    }
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <div class="tk-panel-inset" style="display:flex;flex-direction:column;gap:8px;">
            <div class="tk-section-heading"><span>LỊCH SĂN BOSS KHU VỰC &amp; THẾ GIỚI</span></div>
            <div class="tk-quest-list" style="padding:0;">
              <div class="tk-quest-item">
                <div><strong>🐺 Huyết Lang (Mini Boss Lv.9)</strong><div class="tk-inspector-desc">Thung Lũng Sói Hoang (map_wild_wolf_valley) · Rớt Bùa Hộ Mệnh Huyết Lang &amp; Đá Cường Hóa</div></div>
                <span class="tk-heading-pill">Hồi sinh: 5 phút</span>
              </div>
              <div class="tk-quest-item">
                <div><strong>👹 Goblin Thủ Lĩnh (Field Boss Lv.15)</strong><div class="tk-inspector-desc">Hang Goblin (map_goblin_cave) · Rớt Huy Chương Độc Nhất &amp; Danh Hiệu Thủ Lĩnh Sát</div></div>
                <span class="tk-heading-pill">Hồi sinh: 15 phút</span>
              </div>
              <div class="tk-quest-item">
                <div><strong>🌳 Ancient Treant (Field Boss Lv.42)</strong><div class="tk-inspector-desc">Khu Rừng Linh Hồn (map_spirit_forest) · Trận chiến Party Contribution</div></div>
                <span class="tk-heading-pill">Hồi sinh: 5 phút</span>
              </div>
            </div>
          </div>
        </div>

        <div class="tk-modal-footer">
          <button type="button" class="tk-tab-btn" data-close-modal="events">Đóng [ESC]</button>
        </div>
      </div>
    `;
  }
}
