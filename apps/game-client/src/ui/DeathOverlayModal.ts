import type { DeathPenaltyState } from '@elysia/game-types';
import { modalManager } from './ModalManager';

export interface DeathOverlayDisplayData {
  killerName: string;
  reason?: string;
  levelPreserved: number;
  expLost: number;
  penalty: DeathPenaltyState | null;
  checkpointNameVi: string;
  checkpointId: string;
}

export class DeathOverlayModal {
  public static readonly MODAL_ID = 'death_overlay';
  private backdrop: HTMLElement;
  private isOpen = false;
  private busy = false;
  public onRequestResurrect?: () => Promise<void> | void;

  constructor() {
    this.backdrop = document.createElement('div');
    this.backdrop.id = 'modal-death-overlay';
    this.backdrop.className = 'tk-modal-backdrop hidden';
    this.backdrop.setAttribute('aria-hidden', 'true');
    document.body.appendChild(this.backdrop);

    modalManager.registerBackdrop(this.backdrop, () => ({
      id: DeathOverlayModal.MODAL_ID,
      onRequestClose: () => {
        // Require explicit checkpoint resurrection action while dead
      },
      closeOnBackdrop: false,
    }));

    this.backdrop.addEventListener('click', (e) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('#btn-resurrect-checkpoint') && !this.busy) {
        this.busy = true;
        const btn = this.backdrop.querySelector('#btn-resurrect-checkpoint') as HTMLButtonElement | null;
        if (btn) {
          btn.disabled = true;
          btn.textContent = 'Đang chuyển về điểm hồi sinh an toàn...';
        }
        void Promise.resolve(this.onRequestResurrect?.()).finally(() => {
          this.busy = false;
        });
      }
    });
  }

  public show(data: DeathOverlayDisplayData) {
    this.isOpen = true;
    this.busy = false;
    modalManager.open({
      id: DeathOverlayModal.MODAL_ID,
      backdrop: this.backdrop,
      onClose: () => {
        this.isOpen = false;
      },
    });
    const tierNames: Record<string, string> = {
      novice: 'Tân Thủ',
      first_job: 'Chức Nghiệp Bậc 1',
      second_job: 'Chức Nghiệp Bậc 2',
      third_job: 'Chức Nghiệp Bậc 3',
    };
    const pen = data.penalty;
    const durationMin = pen ? Math.max(1, Math.round((pen.expiresAt - pen.appliedAt) / 60000)) : 60;
    const durationStr = durationMin >= 60 ? `${Math.round(durationMin / 60)} giờ` : `${durationMin} phút`;

    this.backdrop.innerHTML = `
      <div class="tk-window" style="width:min(520px,94vw);border:2px solid #b91c1c;background:linear-gradient(180deg, rgba(35,14,18,0.97), rgba(18,12,20,0.98));color:#fde8e8;" role="dialog" aria-modal="true" aria-label="Nhân vật đã gục">
        <div class="tk-window-header" style="background:linear-gradient(90deg,#7f1d1d,#450a0a);border-bottom:1px solid rgba(248,113,113,0.4);">
          <div class="tk-header-title-group">
            <span class="tk-header-crest" style="background:#991b1b;">💀</span>
            <div>
              <h2 style="color:#fecaca;">CHIẾN BINH ĐÃ GỤC NGÃ</h2>
              <p style="color:#fca5a5;">ELYSIA NO DENSETSU · Elysia Frontier — Become Wibu, Save the Worlds.</p>
            </div>
          </div>
        </div>
        <div class="tk-modal-scroll-body" style="padding:18px;display:flex;flex-direction:column;gap:12px;">
          <div style="background:rgba(127,29,29,0.28);border:1px solid rgba(248,113,113,0.35);border-radius:10px;padding:12px;">
            <div style="font-size:13px;color:#fecaca;">Nguyên nhân: <strong>${this.esc(data.killerName)}</strong> (${this.esc(data.reason || 'HP về 0')})</div>
            <div style="font-size:12px;color:#cbd5e1;margin-top:6px;">
              ✅ Cấp độ <strong style="color:#fde047;">Lv.${data.levelPreserved}</strong>, chức nghiệp, kỹ năng, trang bị, Balo và nhiệm vụ được <strong>bảo toàn hoàn toàn</strong>.
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <div style="background:rgba(15,23,42,0.7);border:1px solid rgba(148,163,184,0.25);border-radius:10px;padding:10px;">
              <div style="font-size:11px;color:#94a3b8;">Tổn thất EXP cấp hiện tại</div>
              <div style="font-size:16px;font-weight:800;color:#fbbf24;margin-top:2px;">-${data.expLost.toLocaleString()} EXP</div>
            </div>
            <div style="background:rgba(15,23,42,0.7);border:1px solid rgba(148,163,184,0.25);border-radius:10px;padding:10px;">
              <div style="font-size:11px;color:#94a3b8;">Trạng thái Suy Yếu Hồi Sinh</div>
              <div style="font-size:14px;font-weight:800;color:#f87171;margin-top:2px;">
                ${pen ? `-${pen.statReductionPct}% Toàn Bộ Chỉ Số (${durationStr})` : 'Không có'}
              </div>
              <div style="font-size:11px;color:#cbd5e1;">Bậc: ${pen ? (tierNames[pen.tier] || pen.tier) : '—'}</div>
            </div>
          </div>
          <div style="background:rgba(20,83,45,0.28);border:1px solid rgba(74,222,128,0.4);border-radius:10px;padding:12px;">
            <div style="font-size:11px;color:#86efac;text-transform:uppercase;letter-spacing:0.4px;">Điểm Lưu Hồi Sinh An Toàn Gần Nhất</div>
            <div style="font-size:15px;font-weight:800;color:#ecfdf5;margin-top:3px;">🏰 ${this.esc(data.checkpointNameVi)}</div>
          </div>
        </div>
        <div class="tk-modal-footer" style="justify-content:center;padding:14px 18px;">
          <button type="button" class="tk-action-btn" id="btn-resurrect-checkpoint" style="background:linear-gradient(135deg,#15803d,#166534);color:#fff;padding:10px 24px;font-size:14px;font-weight:800;border:1px solid #4ade80;">
            ✨ Hồi Sinh Tại ${this.esc(data.checkpointNameVi)}
          </button>
        </div>
      </div>
    `;
  }

  public hide() {
    this.isOpen = false;
    this.busy = false;
    modalManager.close(DeathOverlayModal.MODAL_ID);
  }

  public isVisible(): boolean {
    return this.isOpen;
  }

  private esc(s: string): string {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
