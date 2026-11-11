import { modalManager } from './ModalManager';

export interface GameSettingsState {
  bgmVolume: number;
  sfxVolume: number;
  showDamageNumbers: boolean;
  showPetals: boolean;
  reducedEffects: boolean;
}

const SETTINGS_STORAGE_KEY = 'elysia_settings_v1';

const DEFAULT_SETTINGS: GameSettingsState = {
  bgmVolume: 75,
  sfxVolume: 85,
  showDamageNumbers: true,
  showPetals: true,
  reducedEffects: false,
};

export function loadSavedSettings(): GameSettingsState {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      bgmVolume: Math.max(0, Math.min(100, Number(parsed.bgmVolume ?? 75))),
      sfxVolume: Math.max(0, Math.min(100, Number(parsed.sfxVolume ?? 85))),
      showDamageNumbers: parsed.showDamageNumbers !== false,
      showPetals: parsed.showPetals !== false,
      reducedEffects: Boolean(parsed.reducedEffects),
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export class SettingsModal {
  public static readonly MODAL_ID = 'settings';
  private backdrop: HTMLElement;
  private isOpen = false;
  private settings: GameSettingsState = loadSavedSettings();
  private draftSettings: GameSettingsState = { ...this.settings };

  public onSettingsSaved?: (settings: GameSettingsState) => void;
  public onToast?: (msg: string, variant?: 'info' | 'success' | 'error') => void;

  constructor() {
    this.backdrop = document.createElement('div');
    this.backdrop.id = 'modal-settings';
    this.backdrop.className = 'tk-modal-backdrop hidden';
    this.backdrop.setAttribute('aria-hidden', 'true');
    document.body.appendChild(this.backdrop);

    modalManager.registerBackdrop(this.backdrop, () => ({
      id: SettingsModal.MODAL_ID,
      onRequestClose: () => this.close(),
      closeOnBackdrop: true,
    }));

    this.backdrop.addEventListener('click', (e) => {
      const target = e.target as HTMLElement | null;
      if (!target || target === this.backdrop) return;
      e.stopPropagation();

      if (target.closest('[data-close-modal="settings"], #btn-close-settings')) {
        this.close();
        return;
      }

      if (target.closest('#btn-save-settings')) {
        this.settings = { ...this.draftSettings };
        try {
          localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
        } catch {
          // ignore storage errors
        }
        this.onSettingsSaved?.(this.settings);
        this.onToast?.('Đã lưu cài đặt hệ thống!', 'success');
        this.close();
        return;
      }

      if (target.closest('#btn-reset-settings')) {
        this.draftSettings = { ...DEFAULT_SETTINGS };
        this.render();
      }
    });

    this.backdrop.addEventListener('input', (e) => {
      const el = e.target as HTMLInputElement | null;
      if (!el) return;
      if (el.id === 'set-bgm') {
        this.draftSettings.bgmVolume = Number(el.value);
        const valEl = this.backdrop.querySelector('#set-bgm-val');
        if (valEl) valEl.textContent = `${this.draftSettings.bgmVolume}%`;
      } else if (el.id === 'set-sfx') {
        this.draftSettings.sfxVolume = Number(el.value);
        const valEl = this.backdrop.querySelector('#set-sfx-val');
        if (valEl) valEl.textContent = `${this.draftSettings.sfxVolume}%`;
      } else if (el.id === 'set-dmg') {
        this.draftSettings.showDamageNumbers = el.checked;
      } else if (el.id === 'set-petals') {
        this.draftSettings.showPetals = el.checked;
      } else if (el.id === 'set-reduced-fx') {
        this.draftSettings.reducedEffects = el.checked;
      }
    });
  }

  public getSettings(): GameSettingsState {
    return { ...this.settings };
  }

  public open() {
    this.settings = loadSavedSettings();
    this.draftSettings = { ...this.settings };
    this.isOpen = true;
    modalManager.open({
      id: SettingsModal.MODAL_ID,
      backdrop: this.backdrop,
      onClose: () => {
        this.isOpen = false;
      },
    });
    this.render();
  }

  public close() {
    this.isOpen = false;
    modalManager.close(SettingsModal.MODAL_ID);
  }

  public toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  private render() {
    this.backdrop.innerHTML = `
      <div class="tk-window" style="width:min(680px,95vw);" role="dialog" aria-modal="true" aria-label="Cài đặt hệ thống">
        <div class="tk-window-header">
          <div class="tk-header-title-group">
            <span class="tk-header-crest">⚙️</span>
            <div>
              <h2>CÀI ĐẶT HỆ THỐNG &amp; PHÍM TẮT</h2>
              <p>Tùy chỉnh âm thanh, hiệu ứng hiển thị và tra cứu phím thao tác Elysia Frontier</p>
            </div>
          </div>
          <button type="button" class="tk-btn-close" id="btn-close-settings" data-close-modal="settings" title="Đóng [ESC]">✕</button>
        </div>

        <div class="tk-modal-scroll-body">
          <div class="tk-panel-inset" style="display:flex;flex-direction:column;gap:10px;">
            <div class="tk-section-heading"><span>ÂM THANH &amp; HIỂN THỊ</span></div>
            <label class="tk-setting-row">
              <span>Nhạc nền (BGM) <strong id="set-bgm-val">${this.draftSettings.bgmVolume}%</strong></span>
              <input id="set-bgm" type="range" min="0" max="100" value="${this.draftSettings.bgmVolume}" style="width:180px;accent-color:#294b39;" />
            </label>
            <label class="tk-setting-row">
              <span>Hiệu ứng chiến đấu (SFX) <strong id="set-sfx-val">${this.draftSettings.sfxVolume}%</strong></span>
              <input id="set-sfx" type="range" min="0" max="100" value="${this.draftSettings.sfxVolume}" style="width:180px;accent-color:#294b39;" />
            </label>
            <label class="tk-setting-row" style="cursor:pointer;">
              <span>Hiển thị số sát thương bay nổi</span>
              <input id="set-dmg" type="checkbox" ${this.draftSettings.showDamageNumbers ? 'checked' : ''} style="width:18px;height:18px;accent-color:#294b39;" />
            </label>
            <label class="tk-setting-row" style="cursor:pointer;">
              <span>Hiệu ứng cánh hoa anh đào / lá rơi môi trường</span>
              <input id="set-petals" type="checkbox" ${this.draftSettings.showPetals ? 'checked' : ''} style="width:18px;height:18px;accent-color:#294b39;" />
            </label>
            <label class="tk-setting-row" style="cursor:pointer;">
              <span>Chế độ Giảm Hiệu Ứng (Reduced VFX · Tối ưu FPS khi chuyển map)</span>
              <input id="set-reduced-fx" type="checkbox" ${this.draftSettings.reducedEffects ? 'checked' : ''} style="width:18px;height:18px;accent-color:#294b39;" />
            </label>
          </div>

          <div class="tk-panel-inset" style="display:flex;flex-direction:column;gap:8px;">
            <div class="tk-section-heading"><span>BẢNG PHÍM TẮT</span></div>
            <div class="tk-stats-grid">
              <div class="tk-stat-chip"><span>Di chuyển</span><strong>WASD / Phím mũi tên / Click</strong></div>
              <div class="tk-stat-chip"><span>Tấn công &amp; Kỹ năng</span><strong>J / Space / 1–6</strong></div>
              <div class="tk-stat-chip"><span>Nhân Vật &amp; Balo</span><strong>[B] hoặc [I]</strong></div>
              <div class="tk-stat-chip"><span>Bản Đồ Thế Giới</span><strong>[M]</strong></div>
              <div class="tk-stat-chip"><span>Cây Kỹ Năng / Nhiệm Vụ</span><strong>[K] / [L]</strong></div>
              <div class="tk-stat-chip"><span>Tương tác NPC / Đóng Cửa Sổ</span><strong>[E] / [ESC]</strong></div>
            </div>
          </div>
        </div>

        <div class="tk-modal-footer">
          <button type="button" class="tk-tab-btn" id="btn-reset-settings">Mặc Định</button>
          <button type="button" class="tk-tab-btn" data-close-modal="settings">Hủy / Đóng</button>
          <button type="button" class="tk-action-btn tk-btn-confirm-stats" id="btn-save-settings">Lưu Cài Đặt</button>
        </div>
      </div>
    `;
  }
}
