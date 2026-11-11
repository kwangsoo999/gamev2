import { CharacterEntity } from '@elysia/game-types';
import {
  changePasswordApi,
  clearAuthSession,
  deleteCharacterApi,
  fetchCharactersWithMetaApi,
  forgotPasswordApi,
  getAccountCache,
  getActiveCharacterCache,
  guestAuthApi,
  loginApi,
  logoutApi,
  registerApi,
  resetPasswordApi,
  setActiveCharacterCache,
} from '../services/apiClient';
import { modalManager } from './ModalManager';

type AuthTab = 'welcome' | 'characters' | 'login' | 'register' | 'forgot' | 'password';

export class AuthModal {
  public static readonly MODAL_ID = 'auth';
  private backdrop: HTMLElement;
  private isOpen = false;
  private activeTab: AuthTab = 'characters';
  private characters: CharacterEntity[] = [];
  private maxSlots = 4;
  private loadingChars = false;
  private busyAuth = false;
  private errorMsg = '';
  private infoMsg = '';
  private networkRetryAction: (() => void) | null = null;
  private pendingDeleteId: string | null = null;
  private confirmDeleteText = '';

  private loginUsername = '';
  private loginPassword = '';
  private regUsername = '';
  private regEmail = '';
  private regPassword = '';
  private forgotUser = '';
  private resetCode = '';
  private resetNewPass = '';
  private curPass = '';
  private newPass = '';

  public onSelectCharacter?: (character: CharacterEntity) => void;
  public onOpenCharacterCreation?: () => void;
  public onLogout?: () => void;
  public onToast?: (msg: string, variant?: 'info' | 'success' | 'error') => void;

  constructor() {
    this.backdrop = document.createElement('div');
    this.backdrop.id = 'modal-auth';
    this.backdrop.className = 'tk-modal-backdrop hidden';
    this.backdrop.setAttribute('aria-hidden', 'true');
    document.body.appendChild(this.backdrop);

    modalManager.registerBackdrop(this.backdrop, () => ({
      id: AuthModal.MODAL_ID,
      onRequestClose: () => this.close(),
      closeOnBackdrop: true,
    }));

    this.backdrop.addEventListener('click', (e) => {
      const target = e.target as HTMLElement | null;
      if (!target || target === this.backdrop) return;
      e.stopPropagation();

      if (target.closest('[data-close-modal="auth"]')) {
        this.close();
        return;
      }

      const tabBtn = target.closest('[data-auth-tab]');
      if (tabBtn) {
        this.activeTab = (tabBtn.getAttribute('data-auth-tab') as AuthTab) || 'characters';
        this.errorMsg = '';
        this.infoMsg = '';
        this.pendingDeleteId = null;
        this.render();
        return;
      }

      if (target.closest('[data-auth-open-create]')) {
        this.close();
        this.onOpenCharacterCreation?.();
        return;
      }

      const selBtn = target.closest('[data-auth-select-char]');
      if (selBtn) {
        const id = selBtn.getAttribute('data-auth-select-char');
        const found = this.characters.find((c) => c.id === id);
        if (found) {
          setActiveCharacterCache(found);
          this.onSelectCharacter?.(found);
          this.onToast?.(`Enter World · Đã vào thế giới với ${found.name}!`, 'success');
          this.close();
        }
        return;
      }

      const askDel = target.closest('[data-auth-delete-char]');
      if (askDel) {
        this.pendingDeleteId = askDel.getAttribute('data-auth-delete-char');
        this.confirmDeleteText = '';
        this.render();
        return;
      }

      if (target.closest('[data-auth-cancel-delete]')) {
        this.pendingDeleteId = null;
        this.confirmDeleteText = '';
        this.render();
        return;
      }

      const doDel = target.closest('[data-auth-confirm-delete]');
      if (doDel) {
        const id = doDel.getAttribute('data-auth-confirm-delete');
        if (id) void this.handleDeleteCharacter(id);
        return;
      }

      if (target.closest('[data-auth-submit-login]')) {
        void this.handleLogin();
        return;
      }
      if (target.closest('[data-auth-submit-register]')) {
        void this.handleRegister();
        return;
      }
      if (target.closest('[data-auth-req-reset]')) {
        void this.handleForgotRequest();
        return;
      }
      if (target.closest('[data-auth-confirm-reset]')) {
        void this.handleResetConfirm();
        return;
      }
      if (target.closest('[data-auth-change-pass]')) {
        void this.handleChangePassword();
        return;
      }
      if (target.closest('[data-auth-logout]')) {
        void this.handleLogout();
        return;
      }
      if (target.closest('[data-auth-guest]')) {
        void this.handleGuestReset();
        return;
      }
      if (target.closest('[data-auth-retry]')) {
        this.errorMsg = '';
        this.networkRetryAction?.();
      }
    });

    this.backdrop.addEventListener('input', (e) => {
      const el = e.target as HTMLInputElement | null;
      if (!el) return;
      if (el.id === 'auth-login-user') this.loginUsername = el.value;
      else if (el.id === 'auth-login-pass') this.loginPassword = el.value;
      else if (el.id === 'auth-reg-user') this.regUsername = el.value;
      else if (el.id === 'auth-reg-email') this.regEmail = el.value;
      else if (el.id === 'auth-reg-pass') this.regPassword = el.value;
      else if (el.id === 'auth-forgot-user') this.forgotUser = el.value;
      else if (el.id === 'auth-reset-code') this.resetCode = el.value;
      else if (el.id === 'auth-reset-newpass') this.resetNewPass = el.value;
      else if (el.id === 'auth-cur-pass') this.curPass = el.value;
      else if (el.id === 'auth-new-pass') this.newPass = el.value;
      else if (el.id === 'auth-confirm-delete-input') this.confirmDeleteText = el.value;
    });
  }

  public async open(defaultTab: AuthTab = 'characters') {
    this.isOpen = true;
    this.activeTab = defaultTab;
    this.errorMsg = '';
    this.infoMsg = '';
    this.pendingDeleteId = null;
    modalManager.open({
      id: AuthModal.MODAL_ID,
      backdrop: this.backdrop,
      onClose: () => {
        this.isOpen = false;
      },
    });
    this.render();
    await this.refreshCharacters();
  }

  public close() {
    this.isOpen = false;
    modalManager.close(AuthModal.MODAL_ID);
  }

  public async refreshCharacters() {
    this.loadingChars = true;
    if (this.isOpen) this.render();
    try {
      const res = await fetchCharactersWithMetaApi();
      this.characters = res.characters;
      this.maxSlots = res.maxCharactersPerAccount;
    } finally {
      this.loadingChars = false;
      if (this.isOpen) this.render();
    }
  }

  private async handleDeleteCharacter(id: string) {
    if (this.busyAuth) return;
    const targetChar = this.characters.find((c) => c.id === id);
    if (targetChar && this.confirmDeleteText.trim() !== targetChar.name) {
      this.errorMsg = `Vui lòng nhập chính xác "${targetChar.name}" để xác nhận xóa nhân vật.`;
      this.render();
      return;
    }
    this.busyAuth = true;
    this.errorMsg = '';
    this.render();
    try {
      const res = await deleteCharacterApi(id, targetChar?.name);
      if (!res.success) {
        this.errorMsg = res.error || 'Không thể xóa nhân vật.';
      } else {
        this.pendingDeleteId = null;
        this.confirmDeleteText = '';
        this.onToast?.('Đã xóa nhân vật khỏi tài khoản.', 'info');
        await this.refreshCharacters();
      }
    } finally {
      this.busyAuth = false;
      if (this.isOpen) this.render();
    }
  }

  private async handleLogin() {
    if (this.busyAuth) return;
    this.busyAuth = true;
    this.errorMsg = '';
    this.networkRetryAction = () => void this.handleLogin();
    this.render();
    try {
      const res = await loginApi(this.loginUsername.trim(), this.loginPassword);
      if (!res.success) {
        this.errorMsg = res.error || 'Đăng nhập thất bại.';
        return;
      }
      this.networkRetryAction = null;
      await this.refreshCharacters();
      if (this.characters.length === 0) {
        this.onToast?.('Đăng nhập thành công! Tài khoản chưa có nhân vật — chuyển sang Tạo Nhân Vật.', 'info');
        this.close();
        this.onOpenCharacterCreation?.();
        return;
      }
      this.activeTab = 'characters';
      this.infoMsg = `Chào mừng trở lại! Hãy chọn nhân vật (${this.characters.length}/${this.maxSlots}) để vào thế giới.`;
      this.onToast?.('Đăng nhập thành công! Hãy chọn nhân vật của bạn.', 'success');
    } catch {
      this.errorMsg = 'Không thể kết nối máy chủ đăng nhập. Vui lòng kiểm tra mạng và thử lại.';
    } finally {
      this.busyAuth = false;
      if (this.isOpen) this.render();
    }
  }

  private async handleRegister() {
    if (this.busyAuth) return;
    this.busyAuth = true;
    this.errorMsg = '';
    this.networkRetryAction = () => void this.handleRegister();
    this.render();
    try {
      const res = await registerApi(this.regUsername.trim(), this.regEmail.trim(), this.regPassword);
      if (!res.success) {
        this.errorMsg = res.error || 'Đăng ký thất bại.';
        return;
      }
      this.networkRetryAction = null;
      await this.refreshCharacters();
      this.onToast?.('Đăng ký tài khoản mới thành công! Chuyển sang Tạo Nhân Vật đầu tiên.', 'success');
      this.close();
      this.onOpenCharacterCreation?.();
    } catch {
      this.errorMsg = 'Lỗi kết nối máy chủ khi đăng ký tài khoản. Vui lòng thử lại.';
    } finally {
      this.busyAuth = false;
      if (this.isOpen) this.render();
    }
  }

  private async handleForgotRequest() {
    if (this.busyAuth) return;
    this.busyAuth = true;
    this.errorMsg = '';
    this.infoMsg = '';
    this.render();
    try {
      const res = await forgotPasswordApi(this.forgotUser.trim());
      if (!res.success) {
        this.errorMsg = res.error || 'Không tìm thấy tài khoản.';
        return;
      }
      const codeHint = res.data?.devResetCode ? ` Mã xác nhận: ${res.data.devResetCode}` : '';
      this.infoMsg = `${res.data?.message || 'Đã tạo mã khôi phục.'}${codeHint}`;
    } finally {
      this.busyAuth = false;
      if (this.isOpen) this.render();
    }
  }

  private async handleResetConfirm() {
    if (this.busyAuth) return;
    this.busyAuth = true;
    this.errorMsg = '';
    this.infoMsg = '';
    this.render();
    try {
      const res = await resetPasswordApi(this.forgotUser.trim(), this.resetCode.trim(), this.resetNewPass);
      if (!res.success) {
        this.errorMsg = res.error || 'Khôi phục mật khẩu thất bại.';
        return;
      }
      this.infoMsg = 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay.';
      this.activeTab = 'login';
    } finally {
      this.busyAuth = false;
      if (this.isOpen) this.render();
    }
  }

  private async handleChangePassword() {
    if (this.busyAuth) return;
    this.busyAuth = true;
    this.errorMsg = '';
    this.infoMsg = '';
    this.render();
    try {
      const res = await changePasswordApi(this.curPass, this.newPass);
      if (!res.success) {
        this.errorMsg = res.error || 'Đổi mật khẩu thất bại.';
        return;
      }
      this.curPass = '';
      this.newPass = '';
      this.infoMsg = 'Đổi mật khẩu tài khoản thành công!';
      this.onToast?.(this.infoMsg, 'success');
    } finally {
      this.busyAuth = false;
      if (this.isOpen) this.render();
    }
  }

  private async handleLogout() {
    await logoutApi();
    this.characters = [];
    this.activeTab = 'login';
    this.infoMsg = 'Đã đăng xuất tài khoản.';
    this.onLogout?.();
    this.onToast?.('Đã đăng xuất phiên làm việc.', 'info');
    if (this.isOpen) this.render();
  }

  private async handleGuestReset() {
    if (this.busyAuth) return;
    this.busyAuth = true;
    this.errorMsg = '';
    this.render();
    try {
      clearAuthSession();
      const res = await guestAuthApi();
      if (res.success && res.character) {
        await this.refreshCharacters();
        this.onSelectCharacter?.(res.character);
        this.onToast?.(`Đã khởi tạo tài khoản khách mới: ${res.character.name}!`, 'success');
        this.close();
      } else {
        this.errorMsg = res.error || 'Không thể tạo phiên chơi khách.';
      }
    } finally {
      this.busyAuth = false;
      if (this.isOpen) this.render();
    }
  }

  private render() {
    const account = getAccountCache();
    const activeChar = getActiveCharacterCache();
    const jobLabel = (c: CharacterEntity) => {
      if (c.secondJobName) return `${c.secondJobName} (Cấp 2)`;
      return c.classId === 'adventurer' || c.classId === 'novice' ? 'Tân Thủ (Novice)' : c.classId.toUpperCase();
    };

    let body = '';
    if (this.activeTab === 'welcome') {
      body = `
        <div class="tk-panel-inset" style="max-width:560px;margin:0 auto;width:100%;display:flex;flex-direction:column;gap:14px;text-align:center;padding:22px;">
          <div style="font-size:12px;font-weight:800;letter-spacing:1.4px;color:#b45309;text-transform:uppercase;">CHÀO MỪNG TỚI ELYSIA FRONTIER</div>
          <h3 style="margin:0;font-size:24px;color:#14532d;font-family:'Cinzel',serif;">ELYSIA NO DENSETSU</h3>
          <p style="margin:0;font-size:13px;color:#475569;font-style:italic;">"Become Wibu, Save the Worlds." · Chinh phục Thánh Đường &amp; Thế Giới 2.5D Anime MMORPG</p>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-top:8px;">
            <button type="button" class="tk-action-btn tk-btn-confirm-stats" id="btn-title-login" data-auth-tab="login" style="padding:12px 14px;">🔑 Đăng Nhập</button>
            <button type="button" class="tk-action-btn" id="btn-title-register" data-auth-tab="register" style="padding:12px 14px;">✨ Đăng Ký Mới</button>
            <button type="button" class="tk-tab-btn active" id="btn-title-guest" data-auth-guest="1" style="padding:12px 14px;">⚡ Vào Chơi Khách</button>
          </div>
          <div style="font-size:11px;color:#64748b;">Tài khoản mới tự động mở Tạo Nhân Vật. Người chơi cũ xem danh sách &amp; vị trí đã lưu.</div>
        </div>
      `;
    } else if (this.activeTab === 'characters') {
      const deleteTarget = this.pendingDeleteId ? this.characters.find((c) => c.id === this.pendingDeleteId) : null;
      body = `
        <div class="tk-panel-inset" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
          <div>
            <strong>Tài Khoản:</strong> ${account?.username || 'Chưa đăng nhập'}
            <span class="tk-heading-pill">${this.characters.length}/${this.maxSlots} Nhân Vật</span>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button type="button" class="tk-tab-btn" data-auth-guest="1" ${this.busyAuth ? 'disabled' : ''}>Tạo Phiên Khách</button>
            <button type="button" class="tk-tab-btn" data-auth-logout="1" ${!account ? 'disabled' : ''}>Đăng Xuất</button>
            <button type="button" class="tk-action-btn tk-btn-confirm-stats" id="btn-auth-new-character" data-auth-open-create="1" ${this.characters.length >= this.maxSlots ? 'disabled' : ''}>✨ Tạo Nhân Vật Mới (6 Điểm)</button>
          </div>
        </div>
        ${deleteTarget ? `
          <div class="tk-panel-inset" style="border-color:#dc2626;background:#fef2f2;display:flex;flex-direction:column;gap:8px;">
            <strong style="color:#991b1b;">Xác nhận xóa vĩnh viễn nhân vật "${deleteTarget.name}"</strong>
            <div style="font-size:11px;color:#7f1d1d;">Nhập chính xác tên nhân vật <strong>${deleteTarget.name}</strong> để xác nhận xóa:</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <input id="auth-confirm-delete-input" class="tk-form-input" style="max-width:240px;" type="text" value="${this.confirmDeleteText.replace(/"/g, '&quot;')}" placeholder="${deleteTarget.name}" />
              <button type="button" class="tk-action-btn" style="background:#b91c1c;" data-auth-confirm-delete="${deleteTarget.id}">Xác Nhận Xóa</button>
              <button type="button" class="tk-tab-btn" data-auth-cancel-delete="1">Hủy</button>
            </div>
          </div>
        ` : ''}
        <div class="tk-quest-list" style="padding:0;">
          ${
            this.loadingChars
              ? '<div class="tk-quest-item">Đang tải danh sách nhân vật từ máy chủ...</div>'
              : this.characters.length === 0
              ? '<div class="tk-quest-item"><span>Chưa có nhân vật nào trong tài khoản này. Nhấn <strong>Tạo Nhân Vật Mới</strong> để bắt đầu!</span><button type="button" class="tk-action-btn" data-auth-open-create="1">Tạo Nhân Vật</button></div>'
              : this.characters
                  .map((c) => {
                    const isCurrent = activeChar?.id === c.id;
                    const onlineFlag = Boolean(c.isOnline || isCurrent);
                    const lastLoginText = c.lastLoginAt ? new Date(c.lastLoginAt).toLocaleString('vi-VN') : 'Mới tạo';
                    const genderText = c.gender === 'male' ? '♂ Nam' : '♀ Nữ';
                    const unspent = Number(c.unspentStatPoints ?? c.availableAttributePoints ?? 0);
                    return `
                      <div class="tk-quest-item ${isCurrent ? 'done' : ''}">
                        <div>
                          <div class="tk-inspector-name">
                            ${c.name}
                            <span class="tk-heading-pill">Lv.${c.level} · ${jobLabel(c)} · ${genderText}</span>
                            <span class="tk-rarity-tag ${onlineFlag ? 'rarity-uncommon' : 'rarity-common'}">${onlineFlag ? '● ONLINE' : '○ OFFLINE'}</span>
                          </div>
                          <div class="tk-inspector-desc">
                            STR ${c.baseStats?.str ?? 10} · DEX ${c.baseStats?.dex ?? 10} · AGI ${c.baseStats?.agi ?? 10} · INT ${c.baseStats?.int ?? 10} · CON ${c.baseStats?.con ?? 10} · Tiềm năng: <strong>${unspent}</strong> · Đăng nhập: ${lastLoginText}
                          </div>
                        </div>
                        <div style="display:flex;gap:6px;">
                          <button type="button" class="tk-action-btn" data-auth-select-char="${c.id}">${isCurrent ? 'Đang Trong Thế Giới' : 'Enter World'}</button>
                          <button type="button" class="tk-tab-btn" data-auth-delete-char="${c.id}" ${this.characters.length <= 1 ? 'disabled title="Cần giữ ít nhất 1 nhân vật"' : ''}>Xóa</button>
                        </div>
                      </div>
                    `;
                  })
                  .join('')
          }
        </div>
      `;
    } else if (this.activeTab === 'login') {
      body = `
        <div class="tk-panel-inset" style="max-width:460px;margin:0 auto;width:100%;display:flex;flex-direction:column;gap:12px;">
          <div class="tk-section-heading"><span>ĐĂNG NHẬP TÀI KHOẢN</span></div>
          <label style="display:flex;flex-direction:column;gap:4px;font-size:12px;">
            <span>Tên tài khoản hoặc Email</span>
            <input id="auth-login-user" class="tk-form-input" type="text" value="${this.loginUsername.replace(/"/g, '&quot;')}" placeholder="username hoặc email" />
          </label>
          <label style="display:flex;flex-direction:column;gap:4px;font-size:12px;">
            <span>Mật khẩu</span>
            <input id="auth-login-pass" class="tk-form-input" type="password" value="${this.loginPassword.replace(/"/g, '&quot;')}" placeholder="********" />
          </label>
          <div style="display:flex;gap:8px;justify-content:space-between;align-items:center;">
            <button type="button" class="tk-tab-btn" data-auth-tab="forgot">Quên mật khẩu?</button>
            <button type="button" class="tk-action-btn tk-btn-confirm-stats" data-auth-submit-login="1" ${this.busyAuth ? 'disabled' : ''}>
              ${this.busyAuth ? 'Đang Đăng Nhập...' : 'Đăng Nhập'}
            </button>
          </div>
        </div>
      `;
    } else if (this.activeTab === 'register') {
      body = `
        <div class="tk-panel-inset" style="max-width:460px;margin:0 auto;width:100%;display:flex;flex-direction:column;gap:12px;">
          <div class="tk-section-heading"><span>ĐĂNG KÝ TÀI KHOẢN MỚI</span></div>
          <label style="display:flex;flex-direction:column;gap:4px;font-size:12px;">
            <span>Tên tài khoản (3–20 ký tự)</span>
            <input id="auth-reg-user" class="tk-form-input" type="text" value="${this.regUsername.replace(/"/g, '&quot;')}" placeholder="hero_elysia" />
          </label>
          <label style="display:flex;flex-direction:column;gap:4px;font-size:12px;">
            <span>Email</span>
            <input id="auth-reg-email" class="tk-form-input" type="email" value="${this.regEmail.replace(/"/g, '&quot;')}" placeholder="hero@elysia.rpg" />
          </label>
          <label style="display:flex;flex-direction:column;gap:4px;font-size:12px;">
            <span>Mật khẩu (>= 8 ký tự)</span>
            <input id="auth-reg-pass" class="tk-form-input" type="password" value="${this.regPassword.replace(/"/g, '&quot;')}" placeholder="********" />
          </label>
          <button type="button" class="tk-action-btn tk-btn-confirm-stats" data-auth-submit-register="1" ${this.busyAuth ? 'disabled' : ''}>
            ${this.busyAuth ? 'Đang Đăng Ký...' : 'Đăng Ký Tài Khoản'}
          </button>
        </div>
      `;
    } else if (this.activeTab === 'forgot') {
      body = `
        <div class="tk-panel-inset" style="max-width:460px;margin:0 auto;width:100%;display:flex;flex-direction:column;gap:10px;">
          <div class="tk-section-heading"><span>KHÔI PHỤC MẬT KHẨU</span></div>
          <label style="display:flex;flex-direction:column;gap:4px;font-size:12px;">
            <span>Tên tài khoản hoặc Email</span>
            <input id="auth-forgot-user" class="tk-form-input" type="text" value="${this.forgotUser.replace(/"/g, '&quot;')}" placeholder="username hoặc email" />
          </label>
          <button type="button" class="tk-tab-btn" data-auth-req-reset="1" ${this.busyAuth ? 'disabled' : ''}>Gửi Mã Xác Nhận Khôi Phục</button>
          <label style="display:flex;flex-direction:column;gap:4px;font-size:12px;">
            <span>Mã xác nhận</span>
            <input id="auth-reset-code" class="tk-form-input" type="text" value="${this.resetCode.replace(/"/g, '&quot;')}" placeholder="Nhập mã khôi phục" />
          </label>
          <label style="display:flex;flex-direction:column;gap:4px;font-size:12px;">
            <span>Mật khẩu mới (>= 8 ký tự)</span>
            <input id="auth-reset-newpass" class="tk-form-input" type="password" value="${this.resetNewPass.replace(/"/g, '&quot;')}" placeholder="********" />
          </label>
          <button type="button" class="tk-action-btn tk-btn-confirm-stats" data-auth-confirm-reset="1" ${this.busyAuth ? 'disabled' : ''}>Xác Nhận Đổi Mật Khẩu</button>
        </div>
      `;
    } else {
      body = `
        <div class="tk-panel-inset" style="max-width:460px;margin:0 auto;width:100%;display:flex;flex-direction:column;gap:10px;">
          <div class="tk-section-heading"><span>ĐỔI MẬT KHẨU TÀI KHOẢN</span></div>
          <label style="display:flex;flex-direction:column;gap:4px;font-size:12px;">
            <span>Mật khẩu hiện tại</span>
            <input id="auth-cur-pass" class="tk-form-input" type="password" value="${this.curPass.replace(/"/g, '&quot;')}" placeholder="********" />
          </label>
          <label style="display:flex;flex-direction:column;gap:4px;font-size:12px;">
            <span>Mật khẩu mới (>= 8 ký tự)</span>
            <input id="auth-new-pass" class="tk-form-input" type="password" value="${this.newPass.replace(/"/g, '&quot;')}" placeholder="********" />
          </label>
          <button type="button" class="tk-action-btn tk-btn-confirm-stats" data-auth-change-pass="1" ${this.busyAuth ? 'disabled' : ''}>Cập Nhật Mật Khẩu</button>
        </div>
      `;
    }

    this.backdrop.innerHTML = `
      <div class="tk-window" style="width:min(820px,95vw);" role="dialog" aria-modal="true" aria-label="Tài khoản và Nhân vật">
        <div class="tk-window-header">
          <div class="tk-header-title-group">
            <span class="tk-header-crest">👤</span>
            <div>
              <h2>TÀI KHOẢN &amp; NHÂN VẬT · ELYSIA NO DENSETSU</h2>
              <p>Elysia Frontier — "Become Wibu, Save the Worlds." · Giới hạn ${this.maxSlots} nhân vật/tài khoản</p>
            </div>
          </div>
          <button type="button" class="tk-btn-close" id="btn-close-auth" data-close-modal="auth" title="Đóng [ESC]">✕</button>
        </div>

        <div style="padding:10px 20px 0;display:flex;gap:6px;flex-wrap:wrap;flex-shrink:0;">
          <button type="button" class="tk-tab-btn ${this.activeTab === 'welcome' ? 'active' : ''}" data-auth-tab="welcome">Màn Hình Chính</button>
          <button type="button" class="tk-tab-btn ${this.activeTab === 'characters' ? 'active' : ''}" data-auth-tab="characters">Chọn Nhân Vật</button>
          <button type="button" class="tk-tab-btn ${this.activeTab === 'login' ? 'active' : ''}" data-auth-tab="login">Đăng Nhập</button>
          <button type="button" class="tk-tab-btn ${this.activeTab === 'register' ? 'active' : ''}" data-auth-tab="register">Đăng Ký</button>
          <button type="button" class="tk-tab-btn ${this.activeTab === 'forgot' ? 'active' : ''}" data-auth-tab="forgot">Quên Mật Khẩu</button>
          ${account ? `<button type="button" class="tk-tab-btn ${this.activeTab === 'password' ? 'active' : ''}" data-auth-tab="password">Đổi Mật Khẩu</button>` : ''}
        </div>

        <div class="tk-modal-scroll-body">
          ${this.errorMsg ? `<div style="padding:8px 12px;border-radius:6px;background:#fee2e2;border:1px solid #dc2626;color:#7f1d1d;font-size:12px;font-weight:700;display:flex;justify-content:space-between;align-items:center;gap:8px;"><span>⚠ ${this.errorMsg}</span>${this.networkRetryAction ? `<button type="button" class="tk-tab-btn" data-auth-retry="1">Thử Kết Nối Lại</button>` : ''}</div>` : ''}
          ${this.infoMsg ? `<div style="padding:8px 12px;border-radius:6px;background:#dcfce7;border:1px solid #16a34a;color:#14532d;font-size:12px;font-weight:700;">✔ ${this.infoMsg}</div>` : ''}
          ${body}
        </div>

        <div class="tk-modal-footer">
          <button type="button" class="tk-tab-btn" data-close-modal="auth">Đóng [ESC]</button>
        </div>
      </div>
    `;
  }
}
