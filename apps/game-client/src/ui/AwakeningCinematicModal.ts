import { AwakeningResult } from '@elysia/game-types';
import { getItemIconSvg } from './FantasyArtIcons';
import { modalManager } from './ModalManager';

const WEAPON_ICON_MAP: Record<string, string> = {
  swordsman: 'sword_novice',
  spearman: 'spear_iron',
  knight: 'shield_oak',
  monk: 'staff_holy',
  mage: 'spellbook_arcane',
  assassin: 'dual_daggers',
  fighter: 'gauntlets_fist',
  archer: 'bow_ranger',
};

const ATTR_META = [
  { key: 'str', symbol: '⚔️', label: 'STR' },
  { key: 'dex', symbol: '🎯', label: 'DEX' },
  { key: 'agi', symbol: '⚡', label: 'AGI' },
  { key: 'int', symbol: '🔮', label: 'INT' },
  { key: 'con', symbol: '🛡️', label: 'CON' },
] as const;

/**
 * Cinematic Automatic Job Reveal screen shown after Guardian of Awakening defeat
 * or Grand Sage ceremony. Strictly displays the server-assigned result with zero manual selection.
 */
export class AwakeningCinematicModal {
  public static readonly MODAL_ID = 'awakening-cinematic';
  private backdrop: HTMLElement;
  private isOpen = false;
  public onDismiss?: () => void;

  constructor() {
    this.backdrop = document.createElement('div');
    this.backdrop.id = 'modal-awakening-cinematic';
    this.backdrop.className = 'tk-modal-backdrop hidden';
    this.backdrop.setAttribute('aria-hidden', 'true');
    document.body.appendChild(this.backdrop);

    modalManager.registerBackdrop(this.backdrop, () => ({
      id: AwakeningCinematicModal.MODAL_ID,
      onRequestClose: () => this.close(),
      closeOnBackdrop: true,
    }));

    this.backdrop.addEventListener('click', (e) => {
      const target = e.target as HTMLElement | null;
      if (!target || target === this.backdrop) return;
      e.stopPropagation();

      if (target.closest('[data-close-modal="awakening-cinematic"], #btn-close-awakening-cinematic')) {
        this.close();
      }
    });
  }

  public show(result: AwakeningResult) {
    this.isOpen = true;
    modalManager.open({
      id: AwakeningCinematicModal.MODAL_ID,
      backdrop: this.backdrop,
      onClose: () => {
        this.isOpen = false;
        this.onDismiss?.();
      },
    });

    const maxScore = Math.max(1, ...(result.jobScores || []).map((s) => s.score));
    const weaponIcon = WEAPON_ICON_MAP[result.assignedClassId] || 'sword_novice';

    this.backdrop.innerHTML = `
      <div class="tk-window tk-awakening-cinematic" role="dialog" aria-modal="true" aria-label="Nghi Lễ Thức Tỉnh Nghề Nghiệp">
        <div class="tk-window-header">
          <div class="tk-header-title-group">
            <span class="tk-header-crest">✦</span>
            <div>
              <h2>THÁNH ĐIỆN THỨC TỈNH · ${result.assignedClassName.toUpperCase()}</h2>
              <p>${result.assignedClassRole} · Được ấn định tự động theo 5 chỉ số cơ bản của ${result.characterName}</p>
            </div>
          </div>
          <button type="button" class="tk-btn-close" data-close-modal="awakening-cinematic" title="Đóng [ESC]">✕</button>
        </div>

        <div class="tk-awakening-stage">
          <!-- Left: Class & Weapon Illustrations + Base Attributes -->
          <div class="tk-panel-inset tk-awakening-col">
            <div class="tk-section-heading"><span>MINH HỌA NGHỀ &amp; VŨ KHÍ ĐỊNH MỆNH</span><span class="tk-heading-pill">${result.assignedClassId.toUpperCase()}</span></div>
            <div class="tk-awakening-art-row">
              <div class="tk-awakening-art-box">
                <img src="${result.artworkUrl}" alt="${result.assignedClassName}" class="tk-paperdoll-img" />
                <span>Chân Dung Nghề</span>
              </div>
              <div class="tk-awakening-art-box">
                <div class="tk-awakening-weapon-svg">${getItemIconSvg(weaponIcon)}</div>
                <span>${result.grantedEquipment.weapon.name}</span>
              </div>
            </div>

            <div class="tk-section-heading" style="margin-top:10px;"><span>5 CHỈ SỐ CƠ BẢN (BASE STATS)</span><span class="tk-heading-pill">Không tính trang bị</span></div>
            <div class="tk-awakening-attrs">
              ${ATTR_META.map(
                (a) => `
                <div class="tk-awakening-attr-chip">
                  <span>${a.symbol} ${a.label}</span>
                  <strong>${result.baseStatsSnapshot[a.key]}</strong>
                </div>
              `
              ).join('')}
            </div>
          </div>

          <!-- Right: 8-Job Compatibility Breakdown + Rewards & Starter Skills -->
          <div class="tk-panel-inset tk-awakening-col">
            <div class="tk-section-heading"><span>ĐỘ TƯƠNG THÍCH 8 CHỨC NGHIỆP</span><span class="tk-heading-pill">Primary × 2 + Secondary</span></div>
            <div class="tk-compat-list">
              ${result.jobScores
                .map((s, idx) => {
                  const pct = Math.round((s.score / maxScore) * 100);
                  return `
                  <div class="tk-compat-row ${idx === 0 ? 'winner' : ''}">
                    <div class="tk-compat-meta">
                      <span>${idx === 0 ? '👑 ' : ''}${s.classId.toUpperCase()} <small>(${s.primaryAttribute.toUpperCase()}×${s.primaryMultiplier}+${s.secondaryAttribute.toUpperCase()})</small></span>
                      <strong>${s.score} pts ${idx === 0 ? '· ASSIGNED' : ''}</strong>
                    </div>
                    <div class="tk-compat-track"><div class="tk-compat-fill" style="width:${pct}%"></div></div>
                  </div>
                `;
                })
                .join('')}
            </div>

            <div class="tk-section-heading" style="margin-top:10px;"><span>KỸ NĂNG &amp; PHẦN THƯỞNG THỨC TỈNH</span></div>
            <div class="tk-awakening-rewards">
              <div class="tk-reward-chip">🗡️ <strong>${result.grantedEquipment.weapon.name}</strong> (+${result.grantedEquipment.weapon.atkBonus || 30} ATK)</div>
              <div class="tk-reward-chip">🛡️ <strong>${result.grantedEquipment.armor.name}</strong> (+${result.grantedEquipment.armor.defBonus || 15} DEF)</div>
              ${result.unlockedSkills
                .map((sk) => `<div class="tk-reward-chip">✨ <strong>${sk.nameVi || sk.name}</strong>: ${sk.description || 'Kỹ năng khởi đầu chuyên biệt'}</div>`)
                .join('')}
            </div>
          </div>
        </div>

        <div class="tk-awakening-footer">
          <button type="button" class="tk-action-btn" id="btn-close-awakening-cinematic" data-close-modal="awakening-cinematic">Xác Nhận &amp; Bắt Đầu Hành Trình Mới</button>
        </div>
      </div>
    `;
  }

  public close() {
    this.isOpen = false;
    modalManager.close(AwakeningCinematicModal.MODAL_ID);
  }

  public get visible() {
    return this.isOpen;
  }
}
