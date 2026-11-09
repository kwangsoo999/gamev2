/**
 * ELYSIA NO DENSETSU — MASTER CHARACTER & INVENTORY WINDOW
 * 3-Column Japanese Fantasy Architecture:
 * Col 1: Character Profile & 9 Core Attributes
 * Col 2: Full-body Paperdoll & 9 Equipment Slots
 * Col 3: 24-Slot Inventory with Categories & Currencies
 */

import { ItemEntity, WeaponEntity, ItemRarity } from '@elysia/game-types';

export interface AttributeData {
  key: string;
  name: string;
  abbr: string;
  val: number;
  allocated: number;
  desc: string;
}

export interface EquipSlotItem {
  slotKey: string;
  name: string;
  silhouette: string;
  item: ItemEntity | null;
}

export class CharacterInventoryModal {
  private backdrop: HTMLElement | null = null;
  private isOpen = false;

  // Available stat points to distribute
  private availableStatPoints = 9;

  // 9 Core MMORPG Attributes matching Miền Mộng UI
  private attributes: AttributeData[] = [
    { key: 'str', name: 'Sức mạnh', abbr: '🛡️', val: 24, allocated: 0, desc: 'Tăng Sát Thương Vật Lý (+2.5 ATK / điểm)' },
    { key: 'con', name: 'Thể chất', abbr: '❤️', val: 110, allocated: 0, desc: 'Tăng Sinh Lực Tối Đa (+18 HP / điểm) & Giáp' },
    { key: 'agi', name: 'Nhanh nhẹn', abbr: '🪶', val: 18, allocated: 0, desc: 'Tăng Tốc Độ Đánh & Khả Năng Né Tránh' },
    { key: 'dex', name: 'Khéo léo', abbr: '🎯', val: 22, allocated: 0, desc: 'Tăng Độ Chính Xác & Xuyên Giáp' },
    { key: 'int', name: 'Trí tuệ', abbr: '📖', val: 30, allocated: 0, desc: 'Tăng Sát Thương Phép & Năng Lượng' },
    { key: 'per', name: 'Cảm nhận', abbr: '👁️', val: 16, allocated: 0, desc: 'Tăng Tỷ Lệ Đòn Đánh Bạo Kích' },
    { key: 'wil', name: 'Ý chí', abbr: '🔮', val: 20, allocated: 0, desc: 'Tăng Kháng Phép & Kháng Hiệu Ứng' },
    { key: 'cha', name: 'Sức hút', abbr: '⭐', val: 12, allocated: 0, desc: 'Tăng Điểm Uy Tín & Quan Hệ NPC' },
    { key: 'luk', name: 'May mắn', abbr: '🍀', val: 14, allocated: 0, desc: 'Tăng Tỷ Lệ Rơi Vật Phẩm Hiếm' },
  ];

  // 8 Equipment Slots
  private equipmentSlots: Record<string, EquipSlotItem> = {
    helmet: { slotKey: 'helmet', name: 'Mũ / Nón', silhouette: '👑', item: null },
    weapon: { slotKey: 'weapon', name: 'Vũ Khí', silhouette: '⚔️', item: { primaryAssetUrl: '/assets/items/mien_mong/sword.png', name: 'Kiếm Thép Tân Thủ' } as any },
    gloves: { slotKey: 'gloves', name: 'Găng Tay', silhouette: '🧤', item: { primaryAssetUrl: '/assets/items/mien_mong/equip_gloves.png', name: 'Găng Da Tân Thủ' } as any },
    boots: { slotKey: 'boots', name: 'Bốt Chiến Binh', silhouette: '👢', item: { primaryAssetUrl: '/assets/items/mien_mong/boots.png', name: 'Bốt Da Phiêu Lưu' } as any },
    cape: { slotKey: 'cape', name: 'Khăn / Choàng', silhouette: '🧣', item: null },
    armor: { slotKey: 'armor', name: 'Áo Giáp', silhouette: '🛡️', item: { primaryAssetUrl: '/assets/items/mien_mong/equip_tunic.png', name: 'Áo Phiêu Lưu Xanh' } as any },
    amulet: { slotKey: 'amulet', name: 'Bùa Hộ Mệnh', silhouette: '⏱️', item: { primaryAssetUrl: '/assets/items/mien_mong/equip_amulet.png', name: 'Đồng Hồ Quả Quýt' } as any },
    accessory: { slotKey: 'accessory', name: 'Phụ Kiện', silhouette: '🪶', item: null },
  };

  // 24 Inventory Slots
  private inventorySlots: (ItemEntity | null)[] = [];
  private activeCategory = 'all';
  private selectedSlotIndex: number | null = null;

  // Currencies
  private gold = 12420;
  private silver = 350;

  // Callbacks
  public onEquipWeapon?: (weapon: WeaponEntity) => void;
  public onUseItem?: (item: ItemEntity) => void;

  constructor() {
    this.createDom();
    this.seedDefaultInventory();
    this.initTooltip();
  }

  private createDom() {
    const backdrop = document.createElement('div');
    backdrop.className = 'elysia-modal-backdrop';
    backdrop.id = 'modal-character-inventory';

    backdrop.innerHTML = `
      <div class="elysia-modal-window char-inv-3col-window mien-mong-parchment-window">
        <!-- HEADER (EXACT MIEN MONG DESIGN) -->
        <div class="mien-mong-header">
          <div class="header-char-brief">
            <div class="header-avatar-ring">
              <img src="/assets/characters/tada/tada_avatar.png" class="header-avatar-img" alt="Tada" />
            </div>
            <div class="header-char-text">
              <span class="header-name">Tada</span>
              <span class="header-level">Lv. 12</span>
            </div>
          </div>

          <div class="header-points-pill" id="stat-points-counter-pill">
            Điểm tiềm năng: <strong id="stat-points-counter">${this.availableStatPoints}</strong>
          </div>

          <button class="mien-mong-btn-close" id="btn-close-char-inv" title="Đóng [ESC / C / I]">✕</button>
        </div>

        <!-- 3-COLUMN BODY -->
        <div class="char-inv-body mien-mong-body">
          <!-- COLUMN 1: CHỈ SỐ (STATS) -->
          <div class="char-stats-col mien-mong-panel">
            <div class="panel-section-title">CHỈ SỐ</div>

            <!-- 9 ATTRIBUTES LIST -->
            <div class="attributes-list mien-mong-attr-list" id="attributes-list-container">
              ${this.attributes
                .map(
                  (a) => `
                <div class="attribute-row mien-mong-attr-row" data-attr-key="${a.key}" title="${a.desc}">
                  <span class="attr-name-tag">
                    <span class="attr-emoji-icon">${a.abbr}</span>
                    <span class="attr-label-name">${a.name}</span>
                  </span>
                  <div class="attr-val-box">
                    <span class="attr-val-num" id="attr-val-${a.key}">${a.val + a.allocated}</span>
                    <button class="attr-btn-plus mien-mong-plus" data-plus-key="${a.key}" title="Cộng 1 điểm ${a.name}">+</button>
                  </div>
                </div>
              `
                )
                .join('')}
            </div>

            <!-- VOCATION BONUS FOOTNOTE -->
            <div class="vocation-bonus-note">
              Khéo léo từ nghề: +2
            </div>

            <!-- ALLOCATION BUTTON -->
            <div style="margin-top: auto; padding-top: 8px;">
              <button class="mien-mong-btn-confirm" id="btn-confirm-stats">XÁC NHẬN</button>
            </div>
          </div>

          <!-- COLUMN 2: TRANG BỊ (EQUIPMENT) -->
          <div class="char-paperdoll-col mien-mong-panel">
            <div class="panel-section-title">TRANG BỊ</div>

            <div class="equipment-layout-grid mien-mong-equip-grid">
              <!-- LEFT SLOTS: HELMET, WEAPON, GLOVES, BOOTS -->
              <div class="equip-slots-left">
                <div class="equip-slot-box" data-equip-slot="helmet" title="Mũ / Nón">
                  <span class="equip-slot-silhouette">👑</span>
                </div>
                <div class="equip-slot-box equipped" data-equip-slot="weapon" title="Kiếm Thép Tân Thủ">
                  <img src="/assets/items/mien_mong/sword.png" class="equip-item-icon" alt="Kiếm Thép" />
                </div>
                <div class="equip-slot-box equipped" data-equip-slot="gloves" title="Găng Tay Da">
                  <img src="/assets/items/mien_mong/equip_gloves.png" class="equip-item-icon" alt="Găng Tay" />
                </div>
                <div class="equip-slot-box equipped" data-equip-slot="boots" title="Bốt Da Phiêu Lưu">
                  <img src="/assets/items/mien_mong/boots.png" class="equip-item-icon" alt="Bốt Da" />
                </div>
              </div>

              <!-- CENTER: FULL-BODY CHIBI TADA -->
              <div class="paperdoll-center-stage mien-mong-paperdoll-stage">
                <img src="/assets/characters/tada/tada_paperdoll.png" class="paperdoll-full-chibi" id="paperdoll-chibi-render" alt="Tada Character" />
              </div>

              <!-- RIGHT SLOTS: CAPE, ARMOR, AMULET, ACCESSORY -->
              <div class="equip-slots-right">
                <div class="equip-slot-box" data-equip-slot="cape" title="Khăn / Choàng">
                  <span class="equip-slot-silhouette">🧣</span>
                </div>
                <div class="equip-slot-box equipped" data-equip-slot="armor" title="Áo Phiêu Lưu Xanh">
                  <img src="/assets/items/mien_mong/equip_tunic.png" class="equip-item-icon" alt="Áo Phiêu Lưu" />
                </div>
                <div class="equip-slot-box equipped" data-equip-slot="amulet" title="Đồng Hồ Bùa Hộ Mệnh">
                  <img src="/assets/items/mien_mong/equip_amulet.png" class="equip-item-icon" alt="Đồng Hồ Bùa" />
                </div>
                <div class="equip-slot-box" data-equip-slot="accessory" title="Phụ Kiện / Lông Vũ">
                  <span class="equip-slot-silhouette">🪶</span>
                </div>
              </div>
            </div>
          </div>

          <!-- COLUMN 3: TÚI ĐỒ · 16/24 (INVENTORY) -->
          <div class="char-inventory-col mien-mong-panel">
            <div class="panel-section-title">TÚI ĐỒ · 16/24</div>

            <!-- TABS -->
            <div class="inventory-tabs-row mien-mong-tabs">
              <button class="inv-tab-btn active" data-cat="all">Tất cả</button>
              <button class="inv-tab-btn" data-cat="weapon">Trang bị</button>
              <button class="inv-tab-btn" data-cat="potion">Tiêu hao</button>
            </div>

            <!-- 24 INVENTORY SLOTS GRID (6x4) -->
            <div class="inventory-slots-grid mien-mong-grid" id="inventory-slots-grid-root">
              <!-- Dynamically populated -->
            </div>

            <!-- CURRENCY FOOTER -->
            <div class="inv-currency-footer mien-mong-currency">
              <div class="currency-badge currency-gold" title="Đồng xu cổ">
                <span class="coin-disc coin-bronze">🪙</span>
                <span id="inv-gold-display">${this.gold.toLocaleString()}</span>
              </div>
              <div class="currency-badge currency-rubies" title="Bạc / Bội tinh">
                <span class="coin-disc coin-silver">⚪</span>
                <span id="inv-silver-display">${this.silver.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    this.backdrop = backdrop;

    this.bindEvents();
  }

  private seedDefaultInventory() {
    this.inventorySlots = new Array(24).fill(null);

    const mienMongItems = [
      { id: 'ITEM_MM_SWORD', name: 'Kiếm Thép Tân Thủ', category: 'weapon', qty: 1, icon: '/assets/items/mien_mong/sword.png', desc: 'Thanh kiếm thép sắc bén khởi đầu hành trình phiêu lưu.' },
      { id: 'ITEM_MM_HERBS', name: 'Thảo Dược Xanh', category: 'potion', qty: 12, icon: '/assets/items/mien_mong/herbs.png', desc: 'Lá cây thảo mộc hái từ bìa rừng, có tác dụng trị thương nhẹ.' },
      { id: 'ITEM_MM_POTION_HP', name: 'Bình Máu Nhỏ', category: 'potion', qty: 15, icon: '/assets/items/mien_mong/potion_hp.png', desc: 'Dược liệu hồi phục tức thì 150 điểm sinh lực (HP).' },
      { id: 'ITEM_MM_POTION_MP', name: 'Bình Mana Lam', category: 'potion', qty: 8, icon: '/assets/items/mien_mong/potion_mp.png', desc: 'Nước thần bí thuật hồi phục 100 điểm ma pháp (MP).' },
      { id: 'ITEM_MM_BREAD', name: 'Bánh Mì Lúa Mạch', category: 'potion', qty: 5, icon: '/assets/items/mien_mong/bread.png', desc: 'Lương khô thôn quê nướng giòn giúp duy trì thể lực dẻo dai.' },
      { id: 'ITEM_MM_IRON_ORE', name: 'Quặng Sắt Thô', category: 'material', qty: 6, icon: '/assets/items/mien_mong/iron_ore.png', desc: 'Quặng sắt khai thác từ hang đá, dùng để rèn đúc trang bị.' },
      { id: 'ITEM_MM_PURPLE_FLOWER', name: 'Hoa Dạ Lan Tím', category: 'material', qty: 7, icon: '/assets/items/mien_mong/purple_flower.png', desc: 'Loài hoa rừng tỏa hương thanh khiết, thành phần luyện linh đan.' },
      { id: 'ITEM_MM_WOOD', name: 'Gỗ Rừng Sâu', category: 'material', qty: 20, icon: '/assets/items/mien_mong/wood.png', desc: 'Gỗ sồi nguyên khối chắc chắn dùng trong xây dựng và thủ công.' },
      { id: 'ITEM_MM_LEATHER', name: 'Da Thú Rừng', category: 'material', qty: 4, icon: '/assets/items/mien_mong/leather.png', desc: 'Tấm da thú dẻo dai dùng may áo giáp nhẹ và găng tay.' },
      { id: 'ITEM_MM_BOOTS', name: 'Bốt Da Phiêu Lưu', category: 'weapon', qty: 1, icon: '/assets/items/mien_mong/boots.png', desc: 'Đôi bốt da bền bỉ hỗ trợ di chuyển linh hoạt trên mọi địa hình.' },
      { id: 'ITEM_MM_SHIELD', name: 'Khiên Gỗ Tân Thủ', category: 'weapon', qty: 1, icon: '/assets/items/mien_mong/shield.png', desc: 'Khiên gỗ phong có quai cầm chắc chắn giúp cản đòn hiểm hóc.' },
      { id: 'ITEM_MM_AMBER_GEM', name: 'Pha Lê Hổ Phách', category: 'material', qty: 2, icon: '/assets/items/mien_mong/amber_gem.png', desc: 'Đá hổ phách kết tinh ánh kim, dùng để khảm nạm trang bị.' },
      { id: 'ITEM_MM_BLUE_GEM', name: 'Lam Ngọc Sapphire', category: 'material', qty: 3, icon: '/assets/items/mien_mong/blue_gem.png', desc: 'Viên ngọc lam chứa đựng nguyên tố nước và ma pháp băng thanh.' },
      { id: 'ITEM_MM_MUSHROOM', name: 'Nấm Rừng Tự Nhiên', category: 'potion', qty: 18, icon: '/assets/items/mien_mong/mushroom.png', desc: 'Nấm rừng dinh dưỡng bổ sung sức bền cho nhà thám hiểm.' },
      { id: 'ITEM_MM_TEA', name: 'Lá Trà Thơm Thôn Bản', category: 'material', qty: 6, icon: '/assets/items/mien_mong/tea_leaves.png', desc: 'Đặc sản trứ danh của Làng Bình Yên, dùng để pha trà tiếp khách.' },
      { id: 'ITEM_MM_FISH', name: 'Cá Suối Tươi Ngon', category: 'potion', qty: 3, icon: '/assets/items/mien_mong/fish.png', desc: 'Cá suối đầu nguồn giàu đạm giúp hồi phục tinh thần.' },
      { id: 'ITEM_MM_PURPLE_CRYSTAL', name: 'Thạch Anh Tím', category: 'material', qty: 1, icon: '/assets/items/mien_mong/purple_crystal.png', desc: 'Khoáng thạch quý hiếm phát ra dao động ma lực huyền bí.' },
      { id: 'ITEM_MM_SCROLL', name: 'Cuộn Bí Kíp Tân Thủ', category: 'quest', qty: 4, icon: '/assets/items/mien_mong/scroll.png', desc: 'Tài liệu hướng dẫn bí thuật chiến đấu lưu truyền trong làng.' },
    ];

    mienMongItems.forEach((item, index) => {
      this.inventorySlots[index] = {
        id: item.id,
        itemId: item.id,
        name: item.name,
        description: item.desc,
        category: item.category as any,
        rarity: index === 0 || index === 9 || index === 10 ? 'uncommon' : (index >= 11 && index <= 12) ? 'rare' : 'common',
        requiredLevel: 1,
        requiredClasses: [],
        buyPrice: 50,
        sellPrice: 15,
        stackLimit: 99,
        weight: 1,
        isTradable: true,
        isSellable: true,
        isDroppable: true,
        isAccountBound: false,
        isCharacterBound: false,
        status: 'PUBLISHED',
        primaryAssetUrl: item.icon,
        inventoryAssetUrl: item.icon,
        quantity: item.qty,
      } as any;
    });

    this.renderInventoryGrid();
  }

  private renderInventoryGrid() {
    const grid = document.getElementById('inventory-slots-grid-root');
    if (!grid) return;

    grid.innerHTML = '';
    this.inventorySlots.forEach((item, index) => {
      // Check category filter
      let matchesCategory = true;
      if (item && this.activeCategory !== 'all') {
        if (this.activeCategory === 'weapon') {
          matchesCategory = item.category === 'weapon' || item.category === 'armor';
        } else if (this.activeCategory === 'potion') {
          matchesCategory = item.category === 'potion' || item.category === 'consumable';
        } else {
          matchesCategory = item.category === this.activeCategory;
        }
      }

      const slot = document.createElement('div');
      slot.className = `inv-item-slot ${this.selectedSlotIndex === index ? 'selected' : ''}`;
      slot.setAttribute('data-slot-idx', `${index}`);

      if (item && matchesCategory) {
        const iconSrc = item.primaryAssetUrl || item.inventoryAssetUrl || '/assets/weapons/novice_sword_icon.png';
        const qtyVal = (item as any).quantity;
        const qtyText = qtyVal && qtyVal > 1 ? `${qtyVal}` : '';
        slot.innerHTML = `
          <img src="${iconSrc}" class="inv-item-img" alt="${item.name}" onerror="this.src='/assets/weapons/novice_sword_icon.png'" />
          ${qtyText ? `<span class="inv-item-qty">${qtyText}</span>` : ''}
        `;
        slot.addEventListener('mouseenter', (e) => this.showTooltip(item, e));
        slot.addEventListener('mouseleave', () => this.hideTooltip());
        slot.addEventListener('dblclick', () => this.handleEquipOrUse(item, index));
      }

      slot.addEventListener('click', () => {
        this.selectedSlotIndex = index;
        this.renderInventoryGrid();
      });

      grid.appendChild(slot);
    });
  }

  private handleEquipOrUse(item: ItemEntity, index: number) {
    if (item.category === 'weapon') {
      // Equip weapon
      this.equipmentSlots.weapon.item = item;
      this.updateEquipmentSlotsDisplay();

      // Trigger callback
      this.onEquipWeapon?.({
        id: `WP_${item.itemId}`,
        weaponId: `WP_${item.itemId}`,
        itemId: item.itemId,
        name: item.name,
        weaponType: 'sword',
        attackPower: 25,
        attackRange: 60,
        status: 'PUBLISHED',
        iconAssetUrl: item.primaryAssetUrl || item.inventoryAssetUrl || '',
        spriteAssetUrl: '/assets/weapons/novice_sword_sprite.png',
        paperdollConfig: { offsetX: 50, offsetY: 70, scale: 1.0, rotation: -25, anchorX: 0.5, anchorY: 0.85 },
      } as any);
    } else if (item.category === 'potion') {
      this.onUseItem?.(item);
    }
  }

  private updateEquipmentSlotsDisplay() {
    for (const [slotKey, data] of Object.entries(this.equipmentSlots)) {
      const el = document.querySelector(`[data-equip-slot="${slotKey}"]`) as HTMLElement;
      if (!el) continue;

      if (data.item) {
        el.classList.add('equipped');
        const iconSrc = data.item.primaryAssetUrl || data.item.inventoryAssetUrl || '';
        el.innerHTML = `<img src="${iconSrc}" class="equip-item-icon" alt="${data.item.name}" />`;
      } else {
        el.classList.remove('equipped');
        el.innerHTML = `<span class="equip-slot-silhouette">${data.silhouette}</span>`;
      }
    }
  }

  private bindEvents() {
    // Close button
    document.getElementById('btn-close-char-inv')?.addEventListener('click', () => this.close());

    // Stat allocation buttons
    document.querySelectorAll('[data-plus-key]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-plus-key');
        const attr = this.attributes.find((a) => a.key === key);
        if (attr && this.availableStatPoints > 0) {
          attr.allocated++;
          this.availableStatPoints--;
          this.updateStatsDisplay();
        }
      });
    });

    // Reset stats
    document.getElementById('btn-reset-stats')?.addEventListener('click', () => {
      for (const attr of this.attributes) {
        this.availableStatPoints += attr.allocated;
        attr.allocated = 0;
      }
      this.updateStatsDisplay();
    });

    // Confirm stats
    document.getElementById('btn-confirm-stats')?.addEventListener('click', () => {
      for (const attr of this.attributes) {
        attr.val += attr.allocated;
        attr.allocated = 0;
      }
      this.updateStatsDisplay();
    });

    // Tabs filter
    document.querySelectorAll('.inv-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.inv-tab-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeCategory = btn.getAttribute('data-cat') || 'all';
      });
    });

    // Expand slots button
    document.getElementById('btn-inv-expand')?.addEventListener('click', () => {
      for (let i = 0; i < 6; i++) {
        this.inventorySlots.push(null);
      }
      this.renderInventoryGrid();
    });
  }

  private updateStatsDisplay() {
    const counter = document.getElementById('stat-points-counter');
    if (counter) counter.textContent = `${this.availableStatPoints} điểm`;

    for (const attr of this.attributes) {
      const valEl = document.getElementById(`attr-val-${attr.key}`);
      if (valEl) {
        valEl.textContent = `${attr.val + attr.allocated}`;
        valEl.style.color = attr.allocated > 0 ? '#4ade80' : '#ffffff';
      }
    }
  }

  private initTooltip() {
    const tooltip = document.createElement('div');
    tooltip.className = 'elysia-item-tooltip';
    tooltip.id = 'elysia-item-tooltip';
    document.body.appendChild(tooltip);
  }

  private showTooltip(item: ItemEntity, e: MouseEvent) {
    const tooltip = document.getElementById('elysia-item-tooltip');
    if (!tooltip) return;

    tooltip.innerHTML = `
      <div class="tooltip-title">${item.name}</div>
      <div class="tooltip-meta-row">
        <span>Loại: ${item.category.toUpperCase()}</span>
        <span style="color: #fbbf24;">Độ hiếm: ${item.rarity.toUpperCase()}</span>
      </div>
      <div class="tooltip-desc">${item.description}</div>
      <div class="tooltip-stats">
        <span>✦ Cấp yêu cầu: Lv.${item.requiredLevel}</span>
        <span>✦ Giá bán: ${item.sellPrice} Vàng</span>
      </div>
    `;

    tooltip.style.display = 'block';
    tooltip.style.left = `${e.clientX + 16}px`;
    tooltip.style.top = `${e.clientY - 30}px`;
  }

  private hideTooltip() {
    const tooltip = document.getElementById('elysia-item-tooltip');
    if (tooltip) tooltip.style.display = 'none';
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
      this.hideTooltip();
    }
  }

  public toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }
}
