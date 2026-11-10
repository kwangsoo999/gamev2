/**
 * ELYSIA NO DENSETSU — MASTER WORLD MAP WINDOW
 * Japanese Anime Fantasy Continental Map Architecture
 */

export class WorldMapModal {
  private backdrop: HTMLElement | null = null;
  private isOpen = false;

  private regions = [
    { id: 'VIL_STARTER', name: 'Làng Khởi Nguyên', level: 'Lv.1 - 15', desc: 'Khu an toàn, quảng trường, NPC nhiệm vụ, cửa hàng và đền chuyển chức.', status: 'CURRENT' },
    { id: 'FIELD_EAST', name: 'Đồng Cỏ Phía Đông', level: 'Lv.1 - 5', desc: 'Khu luyện cấp đầu tiên với Slime Xanh, Thỏ Sừng và quái vật đồng cỏ.', status: 'OPEN' },
    { id: 'FIELD_WEST', name: 'Rừng Rậm Phía Tây', level: 'Lv.4 - 8', desc: 'Khu rừng của dơi độc, Goblin trinh sát và Sói Rừng.', status: 'LOCKED' },
    { id: 'FIELD_SOUTH', name: 'Thung Lũng Phía Nam', level: 'Lv.7 - 12', desc: 'Thung lũng đá với Harpy, Golem và quái vật vùng núi.', status: 'LOCKED' },
    { id: 'FIELD_NORTH', name: 'Dãy Núi Băng Phía Bắc', level: 'Lv.10 - 15', desc: 'Miền băng giá dành cho nhà thám hiểm dày dạn kinh nghiệm.', status: 'LOCKED' },
  ];

  constructor() {
    this.createDom();
  }

  private createDom() {
    const backdrop = document.createElement('div');
    backdrop.className = 'elysia-modal-backdrop';
    backdrop.id = 'modal-world-map';

    backdrop.innerHTML = `
      <div class="elysia-modal-window mien-mong-map-window" style="width: 860px; max-width: 95vw; height: 560px; max-height: 90vh;">
        <!-- HEADER -->
        <div class="elysia-window-header">
          <div class="elysia-window-title">
            <span>🗺️</span>
            <span>BẢN ĐỒ THẾ GIỚI — ĐẠI LỤC ELYSIA (WORLD MAP)</span>
          </div>
          <button class="elysia-btn-close" id="btn-close-map">✕</button>
        </div>

        <!-- CONTINENT MAP DISPLAY -->
        <div class="mien-mong-map-canvas" style="flex: 1; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center;">
          <!-- Fantasy Map Grid / Compass Lines -->
          <svg style="position: absolute; width: 100%; height: 100%; opacity: 0.15;" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50%" cy="50%" r="180" fill="none" stroke="#d4af37" stroke-width="1.5" stroke-dasharray="6 4" />
            <circle cx="50%" cy="50%" r="300" fill="none" stroke="#d4af37" stroke-width="1.5" />
            <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#d4af37" stroke-width="1" />
            <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#d4af37" stroke-width="1" />
          </svg>

          <!-- REGION PINS -->
          <div style="position: absolute; top: 50%; left: 50%; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
            <div style="width: 24px; height: 24px; border-radius: 50%; background: #10b981; border: 2.5px solid #ffffff; box-shadow: 0 0 16px #10b981; display: flex; align-items: center; justify-content: center; font-size: 12px;">🌟</div>
            <span style="font-size: 11px; font-weight: 800; color: #facc15; background: rgba(0,0,0,0.7); padding: 2px 6px; border-radius: 4px; margin-top: 4px; border: 1px solid rgba(212,175,55,0.4);">LÀNG KHỞI NGUYÊN (HIỆN TẠI)</span>
          </div>

          <div style="position: absolute; top: 50%; left: 74%; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
            <div style="width: 20px; height: 20px; border-radius: 50%; background: #3b82f6; border: 2px solid #ffffff; box-shadow: 0 0 12px #3b82f6; display: flex; align-items: center; justify-content: center; font-size: 10px;">🌲</div>
            <span style="font-size: 11px; font-weight: 700; color: #93c5fd; background: rgba(0,0,0,0.7); padding: 2px 6px; border-radius: 4px; margin-top: 4px;">ĐỒNG CỎ PHÍA ĐÔNG (Lv.1-5)</span>
          </div>

          <div style="position: absolute; top: 75%; left: 50%; display: flex; flex-direction: column; align-items: center; opacity: 0.7;">
            <div style="width: 20px; height: 20px; border-radius: 50%; background: #ef4444; border: 2px solid #ffffff; box-shadow: 0 0 12px #ef4444; display: flex; align-items: center; justify-content: center; font-size: 10px;">🌋</div>
            <span style="font-size: 11px; font-weight: 700; color: #fca5a5; background: rgba(0,0,0,0.7); padding: 2px 6px; border-radius: 4px; margin-top: 4px;">THUNG LŨNG PHÍA NAM (Lv.7-12)</span>
          </div>

          <div style="position: absolute; top: 50%; left: 26%; display: flex; flex-direction: column; align-items: center; opacity: 0.7;">
            <div style="width: 20px; height: 20px; border-radius: 50%; background: #a855f7; border: 2px solid #ffffff; box-shadow: 0 0 12px #a855f7; display: flex; align-items: center; justify-content: center; font-size: 10px;">🏰</div>
            <span style="font-size: 11px; font-weight: 700; color: #d8b4fe; background: rgba(0,0,0,0.7); padding: 2px 6px; border-radius: 4px; margin-top: 4px;">RỪNG RẬM PHÍA TÂY (Lv.4-8)</span>
          </div>

          <div style="position: absolute; top: 20%; left: 50%; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
            <div style="width: 20px; height: 20px; border-radius: 50%; background: #67e8f9; border: 2px solid #ffffff; box-shadow: 0 0 12px #67e8f9; display: flex; align-items: center; justify-content: center; font-size: 10px;">❄</div>
            <span style="font-size: 11px; font-weight: 700; color: #a5f3fc; background: rgba(0,0,0,0.7); padding: 2px 6px; border-radius: 4px; margin-top: 4px;">NÚI BĂNG PHÍA BẮC (Lv.10-15)</span>
          </div>

        </div>

        <!-- FOOTER REGIONS SUMMARY -->
        <div style="background: #0d121f; border-top: 1px solid rgba(212, 175, 55, 0.3); padding: 12px 20px; display: flex; align-items: center; justify-content: space-between; font-size: 12px;">
          <span style="color: #94a3b8;">Vùng đất hiện tại: <strong style="color: #facc15;">Làng Khởi Nguyên (X: 1000, Y: 1350)</strong></span>
          <span style="color: #64748b;">Nhấp vào vị trí trên bản đồ để tự động di chuyển hoặc dịch chuyển</span>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    this.backdrop = backdrop;

    document.getElementById('btn-close-map')?.addEventListener('click', () => this.close());
  }

  public open() {
    if (this.backdrop) {
      this.backdrop.style.display = 'flex';
      this.isOpen = true;
    }
  }

  public close() {
    if (this.backdrop) {
      this.backdrop.style.display = 'none';
      this.isOpen = false;
    }
  }

  public toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }
}
