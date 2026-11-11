import { CharacterEntity, Gender, PrimaryAttributes } from '@elysia/game-types';
import { CREATION_BONUS_POOL } from '@elysia/validation';
import { createCharacterApi } from '../services/apiClient';
import { modalManager } from './ModalManager';

const STAT_META: Array<{ key: keyof PrimaryAttributes; short: string; label: string; desc: string }> = [
  { key: 'str', short: 'STR', label: 'Sức mạnh (STR)', desc: 'Tăng ATK vật lý · Đẩy hướng Kiếm Sĩ / Quyền Sư' },
  { key: 'dex', short: 'DEX', label: 'Khéo léo (DEX)', desc: 'Tăng chính xác & bạo kích · Đẩy hướng Cung Thủ / Sát Thủ' },
  { key: 'agi', short: 'AGI', label: 'Nhanh nhẹn (AGI)', desc: 'Tăng tốc đánh & né tránh · Đẩy hướng Thương Thủ' },
  { key: 'int', short: 'INT', label: 'Trí tuệ (INT)', desc: 'Tăng MATK & MP tối đa · Đẩy hướng Pháp Sư / Tu Sĩ' },
  { key: 'con', short: 'CON', label: 'Thể chất (CON)', desc: 'Tăng HP tối đa & DEF · Đẩy hướng Kỵ Sĩ' },
];

const ADVENTURER_BASE: PrimaryAttributes = { str: 10, dex: 10, agi: 10, int: 10, con: 10 };

const HAIR_STYLES: Array<{ id: string; name: string }> = [
  { id: 'f_long', name: 'Dài Buộc Hoa Trắng' },
  { id: 'm_short', name: 'Ngắn Kiếm Sĩ' },
  { id: 'ponytail', name: 'Đuôi Ngựa Năng Động' },
  { id: 'noble_wave', name: 'Gợn Sóng Hoàng Gia' },
];

const FACES: Array<{ id: string; name: string }> = [
  { id: 'face_01', name: 'Tự Tin Thanh Tú' },
  { id: 'face_02', name: 'Quyết Tâm Mạo Hiểm' },
  { id: 'face_03', name: 'Điềm Tĩnh Tri Thức' },
];

const OUTFITS: Array<{ id: string; name: string }> = [
  { id: 'adventurer_tunic', name: 'Y Phục Tân Thủ Xanh/Trắng' },
  { id: 'novice_navy', name: 'Đồng Phục Hộ Vệ Hải Lam' },
  { id: 'novice_crimson', name: 'Áo Choàng Lữ Khách Đỏ Vàng' },
];

const HAIR_COLORS = [
  { name: 'Nâu Đen', value: '#231f28' },
  { name: 'Hoàng Kim', value: '#f59e0b' },
  { name: 'Bạch Kim', value: '#e2e8f0' },
  { name: 'Hỏa Diễm', value: '#dc2626' },
  { name: 'Lam Dạ', value: '#2563eb' },
];

const EYE_COLORS = [
  { name: 'Lam Ngọc', value: '#2563eb' },
  { name: 'Đỏ Ruby', value: '#e11d48' },
  { name: 'Lục Bảo', value: '#10b981' },
  { name: 'Hổ Phách', value: '#f59e0b' },
  { name: 'Tím Thạch Anh', value: '#8b5cf6' },
];

const TURNAROUND_DIRS = [
  { label: 'Nam (S)', col: 0, flip: false, angle: 0 },
  { label: 'Tây Nam (SW)', col: 2, flip: false, angle: 45 },
  { label: 'Tây (W)', col: 2, flip: false, angle: 90 },
  { label: 'Tây Bắc (NW)', col: 6, flip: true, angle: 135 },
  { label: 'Bắc (N)', col: 6, flip: false, angle: 180 },
  { label: 'Đông Bắc (NE)', col: 6, flip: false, angle: 225 },
  { label: 'Đông (E)', col: 4, flip: false, angle: 270 },
  { label: 'Đông Nam (SE)', col: 4, flip: false, angle: 315 },
];

/**
 * Character Creation Modal (Parchment & Antique Gold):
 * - Selects Gender (Novice Male / Female masters), Hairstyle, Hair Color, Face, Eye Color, Starter Outfit, Name
 * - Live 8-direction Turnaround Canvas Preview
 * - 6 UNSPENT bonus stat points (strict Novice Lv.1 start, never selects class manually)
 */
export class CharacterCreationModal {
  public static readonly MODAL_ID = 'character-creation';
  private backdrop: HTMLElement;
  private isOpen = false;
  private isSubmitting = false;

  private charName = '';
  private gender: Gender = 'female';
  private hairstyleId = HAIR_STYLES[0].id;
  private faceId = FACES[0].id;
  private outfitId = OUTFITS[0].id;
  private hairColor = HAIR_COLORS[0].value;
  private eyeColor = EYE_COLORS[0].value;
  private dirIndex = 0;
  private autoSpin = false;
  private spinTimer: number | null = null;

  private readonly initialBonusPool = CREATION_BONUS_POOL;
  private allocatedBonus: PrimaryAttributes = { str: 0, dex: 0, agi: 0, int: 0, con: 0 };
  private errorMsg = '';

  public onCharacterCreated?: (char: CharacterEntity) => void;
  public onToast?: (msg: string, variant?: 'info' | 'success' | 'error') => void;

  constructor() {
    this.backdrop = document.createElement('div');
    this.backdrop.id = 'modal-character-creation';
    this.backdrop.className = 'tk-modal-backdrop hidden';
    this.backdrop.setAttribute('aria-hidden', 'true');
    document.body.appendChild(this.backdrop);

    modalManager.registerBackdrop(this.backdrop, () => ({
      id: CharacterCreationModal.MODAL_ID,
      onRequestClose: () => this.close(),
      closeOnBackdrop: true,
    }));

    this.backdrop.addEventListener('click', (e) => {
      const target = e.target as HTMLElement | null;
      if (!target || target === this.backdrop) return;
      e.stopPropagation();

      if (target.closest('[data-close-modal="character-creation"]')) {
        this.close();
        return;
      }
      const genderBtn = target.closest('[data-cc-gender]');
      if (genderBtn) {
        this.gender = (genderBtn.getAttribute('data-cc-gender') as Gender) || 'female';
        this.hairstyleId = this.gender === 'female' ? 'f_long' : 'm_short';
        this.render();
        return;
      }
      const styleBtn = target.closest('[data-cc-style]');
      if (styleBtn) {
        this.hairstyleId = styleBtn.getAttribute('data-cc-style') || HAIR_STYLES[0].id;
        this.render();
        return;
      }
      const faceBtn = target.closest('[data-cc-face]');
      if (faceBtn) {
        this.faceId = faceBtn.getAttribute('data-cc-face') || FACES[0].id;
        this.render();
        return;
      }
      const outfitBtn = target.closest('[data-cc-outfit]');
      if (outfitBtn) {
        this.outfitId = outfitBtn.getAttribute('data-cc-outfit') || OUTFITS[0].id;
        this.render();
        return;
      }
      const hairBtn = target.closest('[data-cc-hair]');
      if (hairBtn) {
        this.hairColor = hairBtn.getAttribute('data-cc-hair') || HAIR_COLORS[0].value;
        this.render();
        return;
      }
      const eyeBtn = target.closest('[data-cc-eye]');
      if (eyeBtn) {
        this.eyeColor = eyeBtn.getAttribute('data-cc-eye') || EYE_COLORS[0].value;
        this.render();
        return;
      }
      if (target.closest('[data-cc-rot-left]')) {
        this.dirIndex = (this.dirIndex + TURNAROUND_DIRS.length - 1) % TURNAROUND_DIRS.length;
        this.render();
        return;
      }
      if (target.closest('[data-cc-rot-right]')) {
        this.dirIndex = (this.dirIndex + 1) % TURNAROUND_DIRS.length;
        this.render();
        return;
      }
      if (target.closest('[data-cc-toggle-spin]')) {
        this.autoSpin = !this.autoSpin;
        this.updateSpinTimer();
        this.render();
        return;
      }
      if (target.closest('[data-cc-random-name]')) {
        this.charName = `Airi_${Date.now().toString(36).slice(-4)}`;
        const input = this.backdrop.querySelector('#cc-input-name') as HTMLInputElement | null;
        if (input) input.value = this.charName;
        return;
      }
      const plusBtn = target.closest('[data-cc-plus]');
      if (plusBtn) {
        const key = plusBtn.getAttribute('data-cc-plus') as keyof PrimaryAttributes | null;
        if (key) this.adjustBonus(key, 1);
        return;
      }
      const minusBtn = target.closest('[data-cc-minus]');
      if (minusBtn) {
        const key = minusBtn.getAttribute('data-cc-minus') as keyof PrimaryAttributes | null;
        if (key) this.adjustBonus(key, -1);
        return;
      }
      if (target.closest('[data-cc-reset]')) {
        this.allocatedBonus = { str: 0, dex: 0, agi: 0, int: 0, con: 0 };
        this.errorMsg = '';
        this.render();
        return;
      }
      if (target.closest('[data-cc-submit]')) {
        void this.handleSubmit();
      }
    });

    this.backdrop.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement | null;
      if (target && target.id === 'cc-input-name') {
        this.charName = target.value;
      }
    });
  }

  private updateSpinTimer() {
    if (this.spinTimer) {
      window.clearInterval(this.spinTimer);
      this.spinTimer = null;
    }
    if (this.autoSpin && this.isOpen) {
      this.spinTimer = window.setInterval(() => {
        if (!this.isOpen) return;
        this.dirIndex = (this.dirIndex + 1) % TURNAROUND_DIRS.length;
        this.drawTurnaroundPreview();
      }, 600);
    }
  }

  public getRemainingBonusPoints(): number {
    const spent =
      this.allocatedBonus.str +
      this.allocatedBonus.dex +
      this.allocatedBonus.agi +
      this.allocatedBonus.int +
      this.allocatedBonus.con;
    return Math.max(0, this.initialBonusPool - spent);
  }

  public getAllocatedBonus(): PrimaryAttributes {
    return { ...this.allocatedBonus };
  }

  private adjustBonus(stat: keyof PrimaryAttributes, delta: 1 | -1) {
    if (this.isSubmitting) return;
    if (delta > 0 && this.getRemainingBonusPoints() <= 0) return;
    if (delta < 0 && this.allocatedBonus[stat] <= 0) return;
    this.allocatedBonus[stat] += delta;
    this.errorMsg = '';
    this.render();
  }

  public open() {
    this.isOpen = true;
    this.isSubmitting = false;
    this.errorMsg = '';
    this.allocatedBonus = { str: 0, dex: 0, agi: 0, int: 0, con: 0 };
    if (!this.charName) {
      this.charName = `Elysia_${Date.now().toString(36).slice(-4)}`;
    }

    modalManager.open({
      id: CharacterCreationModal.MODAL_ID,
      backdrop: this.backdrop,
      onClose: () => {
        this.isOpen = false;
        this.isSubmitting = false;
        this.updateSpinTimer();
      },
    });
    this.render();
    this.updateSpinTimer();
  }

  public close() {
    this.isOpen = false;
    this.updateSpinTimer();
    modalManager.close(CharacterCreationModal.MODAL_ID);
  }

  private async handleSubmit() {
    if (this.isSubmitting) return;
    const cleanName = this.charName.trim();
    if (cleanName.length < 3 || cleanName.length > 20) {
      this.errorMsg = 'Tên nhân vật phải từ 3 đến 20 ký tự.';
      this.render();
      return;
    }

    this.isSubmitting = true;
    this.errorMsg = '';
    this.render();

    try {
      const res = await createCharacterApi({
        name: cleanName,
        gender: this.gender,
        classId: 'adventurer',
        appearance: {
          gender: this.gender,
          faceId: this.faceId,
          hairstyleId: this.hairstyleId,
          hairColor: this.hairColor,
          eyeColor: this.eyeColor,
          outfitId: this.outfitId,
        },
        bonusAllocations: { ...this.allocatedBonus },
        useCreationBonusPool: true,
      });

      if (!res.success || !res.data) {
        this.errorMsg = res.error || 'Tạo nhân vật thất bại.';
        this.onToast?.(this.errorMsg, 'error');
        return;
      }

      const created = res.data;
      const rolled = created.initialAttributes || created.baseStats;
      const rolledTotal = rolled.str + rolled.dex + rolled.agi + rolled.int + rolled.con;
      this.onToast?.(
        `Đã tạo Tân Thủ ${created.name} (Chỉ số gốc máy chủ: STR ${rolled.str} · DEX ${rolled.dex} · AGI ${rolled.agi} · INT ${rolled.int} · CON ${rolled.con} = ${rolledTotal} | Điểm còn: ${created.unspentStatPoints ?? created.availableAttributePoints ?? 0})!`,
        'success'
      );
      this.close();
      this.onCharacterCreated?.(created);
    } catch (err: any) {
      this.errorMsg = err?.message || 'Không thể kết nối máy chủ.';
      this.onToast?.(this.errorMsg, 'error');
    } finally {
      this.isSubmitting = false;
      if (this.isOpen) this.render();
    }
  }

  private drawTurnaroundPreview() {
    const canvas = this.backdrop.querySelector('#cc-turnaround-canvas') as HTMLCanvasElement | null;
    const label = this.backdrop.querySelector('#cc-dir-label');
    const dir = TURNAROUND_DIRS[this.dirIndex];
    if (label) label.textContent = `Hướng: ${dir.label} (${this.dirIndex + 1}/8)`;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const img = new Image();
    img.src =
      this.dirIndex === 0
        ? this.gender === 'female'
          ? '/assets/characters/base/female/base_female_master_256.png'
          : '/assets/characters/base/male/base_male_master_256.png'
        : '/assets/elysia/characters/animations/player.png';

    const paint = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Warm ground pedestal glow
      ctx.save();
      ctx.fillStyle = 'rgba(212, 175, 55, 0.22)';
      ctx.beginPath();
      ctx.ellipse(canvas.width / 2, canvas.height - 16, 48, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (this.dirIndex === 0) {
        const size = 148;
        ctx.drawImage(img, (canvas.width - size) / 2, 4, size, size);
      } else {
        const sx = dir.col * 192;
        const sy = 0;
        ctx.save();
        if (dir.flip) {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(img, sx, sy, 192, 160, (canvas.width - 148) / 2, 12, 148, 124);
        ctx.restore();
      }
      // Subtle color indicator swatches on pedestal rim
      ctx.fillStyle = this.hairColor;
      ctx.fillRect(10, canvas.height - 12, 14, 6);
      ctx.fillStyle = this.eyeColor;
      ctx.fillRect(28, canvas.height - 12, 14, 6);
    };
    if (img.complete) paint();
    else img.onload = paint;
  }

  private render() {
    const remaining = this.getRemainingBonusPoints();
    const spent = this.initialBonusPool - remaining;
    const dir = TURNAROUND_DIRS[this.dirIndex];

    this.backdrop.innerHTML = `
      <div class="tk-window" style="width:min(940px,96vw);" role="dialog" aria-modal="true" aria-label="Tạo Nhân Vật Mới">
        <div class="tk-window-header">
          <div class="tk-header-title-group">
            <span class="tk-header-crest">✨</span>
            <div>
              <h2>KHỞI TẠO NHÂN VẬT · TÂN THỦ (NOVICE LV.1)</h2>
              <p>Tùy biến ngoại hình 8 hướng &amp; ${this.initialBonusPool} điểm tiềm năng · Nghề cấp 1 tự động thức tỉnh ở Lv.15</p>
            </div>
          </div>
          <button type="button" class="tk-btn-close" id="btn-close-char-creation" data-close-modal="character-creation" title="Đóng [ESC]">✕</button>
        </div>

        <div class="tk-modal-scroll-body">
          ${this.errorMsg ? `<div style="padding:8px 12px;border-radius:6px;background:#fee2e2;border:1px solid #dc2626;color:#7f1d1d;font-size:12px;font-weight:700;">⚠ ${this.errorMsg}</div>` : ''}

          <div class="tk-form-grid-2">
            <!-- Left column: Identity, Appearance & 8-Direction Turnaround Preview -->
            <div class="tk-panel-inset" style="display:flex;flex-direction:column;gap:10px;">
              <div class="tk-section-heading"><span>NGOẠI HÌNH TÂN THỦ (NOVICE)</span><span class="tk-heading-pill">2 Kỹ Năng Cơ Bản</span></div>

              <div style="display:flex;gap:12px;align-items:center;background:#101522;padding:10px;border-radius:8px;border:1px solid #b59247;">
                <canvas id="cc-turnaround-canvas" width="160" height="154" style="background:radial-gradient(circle,#1e293b,#0b0f19);border-radius:6px;flex-shrink:0;"></canvas>
                <div style="display:flex;flex-direction:column;gap:6px;flex:1;">
                  <strong id="cc-dir-label" style="color:#fde047;font-size:12px;">Hướng: ${dir.label} (${this.dirIndex + 1}/8)</strong>
                  <div style="color:#cbd5e1;font-size:11px;">Xem trước Tân Thủ (${this.gender === 'female' ? 'Nữ · Tóc dài' : 'Nam · Kiếm sĩ'}) xoay 8 hướng.</div>
                  <div style="display:flex;gap:6px;flex-wrap:wrap;">
                    <button type="button" class="tk-tab-btn" data-cc-rot-left="1">⟲ Xoay Trái</button>
                    <button type="button" class="tk-tab-btn" data-cc-rot-right="1">Xoay Phải ⟳</button>
                    <button type="button" class="tk-tab-btn ${this.autoSpin ? 'active' : ''}" data-cc-toggle-spin="1">${this.autoSpin ? '⏸ Dừng Xoay' : '▶ Tự Xoay 8 Hướng'}</button>
                  </div>
                </div>
              </div>

              <label style="display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:700;color:#385340;">
                <span>Tên Nhân Vật (3–20 ký tự)</span>
                <div style="display:flex;gap:6px;">
                  <input id="cc-input-name" class="tk-form-input" type="text" maxlength="20" value="${this.charName.replace(/"/g, '&quot;')}" placeholder="Nhập tên nhân vật..." />
                  <button type="button" class="tk-tab-btn" data-cc-random-name="1" title="Tên ngẫu nhiên">🎲</button>
                </div>
              </label>

              <div>
                <div style="font-size:11px;font-weight:700;color:#385340;margin-bottom:4px;">Giới Tính (2 Master Novice Designs)</div>
                <div class="tk-choice-row">
                  <button type="button" class="tk-choice-pill ${this.gender === 'female' ? 'active' : ''}" data-cc-gender="female">♀ Novice Female</button>
                  <button type="button" class="tk-choice-pill ${this.gender === 'male' ? 'active' : ''}" data-cc-gender="male">♂ Novice Male</button>
                </div>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <div>
                  <div style="font-size:11px;font-weight:700;color:#385340;margin-bottom:4px;">Kiểu Tóc</div>
                  <div class="tk-choice-row">
                    ${HAIR_STYLES.map((st) => `<button type="button" class="tk-choice-pill ${this.hairstyleId === st.id ? 'active' : ''}" data-cc-style="${st.id}" style="font-size:10px;">${st.name}</button>`).join('')}
                  </div>
                </div>
                <div>
                  <div style="font-size:11px;font-weight:700;color:#385340;margin-bottom:4px;">Khuôn Mặt</div>
                  <div class="tk-choice-row">
                    ${FACES.map((f) => `<button type="button" class="tk-choice-pill ${this.faceId === f.id ? 'active' : ''}" data-cc-face="${f.id}" style="font-size:10px;">${f.name}</button>`).join('')}
                  </div>
                </div>
              </div>

              <div>
                <div style="font-size:11px;font-weight:700;color:#385340;margin-bottom:4px;">Trang Phục Tân Thủ</div>
                <div class="tk-choice-row">
                  ${OUTFITS.map((o) => `<button type="button" class="tk-choice-pill ${this.outfitId === o.id ? 'active' : ''}" data-cc-outfit="${o.id}" style="font-size:10px;">${o.name}</button>`).join('')}
                </div>
              </div>

              <div>
                <div style="font-size:11px;font-weight:700;color:#385340;margin-bottom:4px;">Màu Tóc &amp; Màu Mắt</div>
                <div class="tk-choice-row" style="margin-bottom:4px;">
                  ${HAIR_COLORS.map((c) => `<button type="button" class="tk-choice-pill ${this.hairColor === c.value ? 'active' : ''}" data-cc-hair="${c.value}"><span style="width:10px;height:10px;border-radius:50%;background:${c.value};border:1px solid #444;display:inline-block;"></span>${c.name}</button>`).join('')}
                </div>
                <div class="tk-choice-row">
                  ${EYE_COLORS.map((c) => `<button type="button" class="tk-choice-pill ${this.eyeColor === c.value ? 'active' : ''}" data-cc-eye="${c.value}"><span style="width:10px;height:10px;border-radius:50%;background:${c.value};border:1px solid #444;display:inline-block;"></span>${c.name}</button>`).join('')}
                </div>
              </div>
            </div>

            <!-- Right column: 6 Unspent Points Interactive Allocator -->
            <div class="tk-panel-inset" style="display:flex;flex-direction:column;gap:10px;">
              <div class="tk-section-heading">
                <span>PHÂN BỔ 6 ĐIỂM TIỀM NĂNG KHỞI ĐẦU</span>
                <span class="tk-potential-pill ${remaining <= 0 ? 'empty' : ''}" id="cc-remaining-points">Remaining Points: ${remaining}</span>
              </div>
              <p style="margin:0;font-size:11px;color:#665e4c;">
                Không thể chọn nghề ngay tại màn tạo nhân vật. Toàn bộ nhân vật khởi đầu là <strong>Tân Thủ (Novice Lv.1)</strong> với chỉ số gốc máy chủ <strong>[8–12]</strong> mỗi mục (tổng 40–60) cùng Trảm Kích &amp; Tiểu Hỏa Cầu.
              </p>

              <div class="tk-attr-list">
                ${STAT_META.map((s) => {
                  const base = ADVENTURER_BASE[s.key];
                  const bonus = this.allocatedBonus[s.key];
                  const total = base + bonus;
                  return `
                    <div class="tk-attr-row" data-cc-stat="${s.key}">
                      <div>
                        <strong>${s.label}</strong>
                        <div style="font-size:10px;color:#78705b;">${s.desc}</div>
                      </div>
                      <div class="tk-attr-controls">
                        <button type="button" class="tk-attr-minus" data-cc-minus="${s.key}" aria-label="Giảm ${s.short}" ${bonus <= 0 || this.isSubmitting ? 'disabled' : ''}>−</button>
                        <strong class="tk-attr-val ${bonus > 0 ? 'pending' : ''}" data-cc-value="${s.key}">${total}</strong>
                        <span class="tk-attr-delta">${bonus > 0 ? `+${bonus}` : ''}</span>
                        <button type="button" class="tk-attr-plus" data-cc-plus="${s.key}" aria-label="Tăng ${s.short}" ${remaining <= 0 || this.isSubmitting ? 'disabled' : ''}>+</button>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>

              <div class="tk-stat-actions">
                <button type="button" class="tk-action-btn tk-btn-reset-stats" data-cc-reset="1" ${spent <= 0 || this.isSubmitting ? 'disabled' : ''}>Reset (0/${this.initialBonusPool})</button>
              </div>
            </div>
          </div>
        </div>

        <div class="tk-modal-footer">
          <button type="button" class="tk-tab-btn" data-close-modal="character-creation" ${this.isSubmitting ? 'disabled' : ''}>Hủy / Đóng</button>
          <button type="button" class="tk-action-btn tk-btn-confirm-stats" id="btn-cc-submit" data-cc-submit="1" ${this.isSubmitting ? 'disabled' : ''}>
            ${this.isSubmitting ? 'Đang Khởi Tạo...' : 'Xác Nhận & Tạo Nhân Vật'}
          </button>
        </div>
      </div>
    `;
    this.drawTurnaroundPreview();
  }
}
