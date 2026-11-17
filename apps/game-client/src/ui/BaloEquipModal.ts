import { HudSnapshot } from '../engine/GameEngine';
import { EquipSlotKey, InventoryItemDef, ItemCategory, PrimaryAttributesState } from '../engine/types';
import { CharacterPreview } from './CharacterPreview';
import { getBackpackIconSvg, getItemIconSvg } from './FantasyArtIcons';
import { modalManager } from './ModalManager';

const STAT_KEYS: (keyof PrimaryAttributesState)[] = ['str', 'dex', 'agi', 'int', 'con'];
const MAX_BASE_STAT_CAP = 250;

const ATTR_LABELS: { key: keyof PrimaryAttributesState; short: string; label: string; effectHint: string }[] = [
  { key: 'str', short: 'STR', label: 'Sức mạnh (STR)', effectHint: '+ATK vật lý' },
  { key: 'dex', short: 'DEX', label: 'Khéo léo (DEX)', effectHint: '+Chính xác & Crit' },
  { key: 'agi', short: 'AGI', label: 'Nhanh nhẹn (AGI)', effectHint: '+Né & Tốc đánh' },
  { key: 'int', short: 'INT', label: 'Trí tuệ (INT)', effectHint: '+MATK & +MP tối đa' },
  { key: 'con', short: 'CON', label: 'Thể chất (CON)', effectHint: '+HP tối đa & DEF' },
];

const EQUIP_LEFT: { slot: EquipSlotKey; label: string; hintSvg: string }[] = [
  { slot: 'head', label: 'Mũ / Nón', hintSvg: 'helm_bronze' },
  { slot: 'weapon', label: 'Vũ Khí', hintSvg: 'sword_novice' },
  { slot: 'armor', label: 'Áo Giáp', hintSvg: 'tunic_explorer' },
  { slot: 'gloves', label: 'Găng Tay', hintSvg: 'gloves_leather' },
  { slot: 'boots', label: 'Ủng / Giày', hintSvg: 'boots_leather' },
];

const EQUIP_RIGHT: { slot: EquipSlotKey; label: string; hintSvg: string }[] = [
  { slot: 'cloak', label: 'Áo Choàng', hintSvg: 'cloak_wind' },
  { slot: 'necklace', label: 'Dây Chuyền', hintSvg: 'amulet_jade' },
  { slot: 'ring1', label: 'Nhẫn 1', hintSvg: 'ring_band' },
  { slot: 'ring2', label: 'Nhẫn 2', hintSvg: 'ring_band' },
  { slot: 'shoulder', label: 'Cầu Vai', hintSvg: 'shoulder_plate' },
];

const RARITY_LABELS: Record<string, string> = {
  common: 'Thường',
  uncommon: 'Tốt',
  rare: 'Hiếm',
  epic: 'Sử Thi',
  legendary: 'Huyền Thoại',
  mythic: 'Thần Thoại',
};

export class BaloEquipModal {
  public static readonly MODAL_ID = 'balo-equip';
  private backdrop: HTMLElement;
  private isOpen = false;
  private activeFilter: 'all' | ItemCategory = 'all';
  private selectedItemId: string | null = null;
  private selectedSource: 'inventory' | 'equipment' = 'inventory';
  private selectedEquipSlot: EquipSlotKey | null = null;
  private discardConfirmItem: InventoryItemDef | null = null;
  private latestSnapshot: HudSnapshot | null = null;
  private characterPreview: CharacterPreview = new CharacterPreview();

  private pendingAllocations: Record<keyof PrimaryAttributesState, number> = {
    str: 0,
    dex: 0,
    agi: 0,
    int: 0,
    con: 0,
  };
  private isSubmittingStats = false;
  private bumpedStats = new Set<keyof PrimaryAttributesState>();
  private showCapDetails = false;

  public onUseOrEquipItem?: (itemId: string) => void;
  public onUnequipSlot?: (slot: EquipSlotKey) => void;
  public onSortInventory?: () => void;
  public onDiscardItem?: (itemId: string) => void;
  public onRepairEquipment?: () => void;
  public onAllocateAttr?: (stat: keyof PrimaryAttributesState) => void;
  public onConfirmStatAllocations?: (
    allocations: Record<keyof PrimaryAttributesState, number>
  ) => Promise<{ success: boolean; error?: string }>;
  public onPreviewAttrs?: (pendingDeltas: Partial<Record<keyof PrimaryAttributesState, number>>) => any;
  public onPendingPointsPreview?: (remainingAfterPending: number | null) => void;
  public onToast?: (msg: string, variant?: 'info' | 'success' | 'error') => void;

  constructor() {
    this.backdrop = document.createElement('div');
    this.backdrop.id = 'modal-balo-equip';
    this.backdrop.className = 'tk-modal-backdrop hidden';
    this.backdrop.setAttribute('aria-hidden', 'true');
    document.body.appendChild(this.backdrop);

    modalManager.registerBackdrop(this.backdrop, () => ({
      id: BaloEquipModal.MODAL_ID,
      onRequestClose: () => this.close(),
      closeOnBackdrop: true,
    }));

    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Single Click delegation
    this.backdrop.addEventListener('click', (e) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target === this.backdrop) return;
      e.stopPropagation();

      // Discard confirmation dialog buttons
      const confirmDiscardYes = target.closest('#btn-confirm-discard-yes');
      if (confirmDiscardYes && this.discardConfirmItem) {
        const idToDiscard = this.discardConfirmItem.id;
        this.discardConfirmItem = null;
        this.onDiscardItem?.(idToDiscard);
        this.render();
        return;
      }

      const confirmDiscardNo = target.closest('#btn-confirm-discard-no');
      if (confirmDiscardNo) {
        this.discardConfirmItem = null;
        this.render();
        return;
      }

      const closeBtn = target.closest('[data-close-modal="balo-equip"], #btn-close-balo');
      if (closeBtn) {
        this.close();
        return;
      }

      const tabBtn = target.closest('.tk-tab-btn[data-filter]');
      if (tabBtn) {
        const filter = (tabBtn.getAttribute('data-filter') as 'all' | ItemCategory) || 'all';
        this.activeFilter = filter;
        this.selectedItemId = null;
        this.selectedSource = 'inventory';
        this.render();
        return;
      }

      const plusBtn = target.closest('[data-stat-plus]');
      if (plusBtn) {
        const stat = plusBtn.getAttribute('data-stat-plus') as keyof PrimaryAttributesState | null;
        if (stat) this.incrementPendingStat(stat);
        return;
      }

      const minusBtn = target.closest('[data-stat-minus]');
      if (minusBtn) {
        const stat = minusBtn.getAttribute('data-stat-minus') as keyof PrimaryAttributesState | null;
        if (stat) this.decrementPendingStat(stat);
        return;
      }

      const resetBtn = target.closest('[data-stat-reset], #btn-stat-reset');
      if (resetBtn) {
        this.resetPendingAllocations(true);
        return;
      }

      const confirmBtn = target.closest('[data-stat-confirm], #btn-stat-confirm');
      if (confirmBtn) {
        void this.confirmPendingAllocations();
        return;
      }

      const capToggleBtn = target.closest('[data-toggle-cap-details]');
      if (capToggleBtn) {
        this.showCapDetails = !this.showCapDetails;
        this.render();
        return;
      }

      // Click on Equipped Slot
      const equipSlotBtn = target.closest('[data-equip-slot-btn]');
      if (equipSlotBtn) {
        const slot = equipSlotBtn.getAttribute('data-equip-slot-btn') as EquipSlotKey | null;
        if (slot) {
          const gear = this.latestSnapshot?.equipment[slot];
          this.selectedSource = 'equipment';
          this.selectedEquipSlot = slot;
          this.selectedItemId = gear ? gear.id : null;
          this.render();
        }
        return;
      }

      // Click on Inventory Item Cell
      const itemCell = target.closest('[data-item-id]');
      if (itemCell) {
        const id = itemCell.getAttribute('data-item-id');
        if (!id) return;
        this.selectedSource = 'inventory';
        this.selectedItemId = id;
        this.selectedEquipSlot = null;
        this.render();
        return;
      }

      // Use / Equip Button in Inspector
      const useBtn = target.closest('#btn-balo-use-item');
      if (useBtn && this.selectedItemId && this.selectedSource === 'inventory') {
        this.onUseOrEquipItem?.(this.selectedItemId);
        return;
      }

      // Unequip Button in Inspector
      const unequipInspectorBtn = target.closest('#btn-balo-unequip-item');
      if (unequipInspectorBtn && this.selectedEquipSlot) {
        this.onUnequipSlot?.(this.selectedEquipSlot);
        this.selectedSource = 'inventory';
        this.selectedItemId = null;
        this.selectedEquipSlot = null;
        return;
      }

      // Discard Button in Inspector
      const discardBtn = target.closest('#btn-balo-discard');
      if (discardBtn && this.selectedItemId && this.selectedSource === 'inventory') {
        const item = this.latestSnapshot?.inventory.find((i) => i.id === this.selectedItemId);
        if (item) {
          if (
            item.isUnique ||
            item.isLocked ||
            item.bound ||
            item.isCharacterBound ||
            item.isAccountBound ||
            item.category === 'quest' ||
            item.id === 'ITEM_AWAKENING_CERTIFICATE' ||
            item.id.startsWith('QUEST_')
          ) {
            this.onToast?.('Không thể vứt bỏ vật phẩm nhiệm vụ hoặc vật phẩm bị khoá!', 'error');
            return;
          }
          this.discardConfirmItem = item;
          this.render();
        }
        return;
      }

      const sortBtn = target.closest('#btn-balo-sort');
      if (sortBtn) {
        this.onSortInventory?.();
        return;
      }

      const repairBtn = target.closest('#btn-balo-repair');
      if (repairBtn) {
        this.onRepairEquipment?.();
        return;
      }
    });

    // Double-Click delegation: rapid equip/use for bag items & instant unequip for gear
    this.backdrop.addEventListener('dblclick', (e) => {
      const target = e.target as HTMLElement | null;
      if (!target || target === this.backdrop) return;
      e.stopPropagation();

      // Double click an inventory item cell -> equip or use directly
      const itemCell = target.closest('[data-item-id]');
      if (itemCell) {
        const id = itemCell.getAttribute('data-item-id');
        if (id) {
          this.onUseOrEquipItem?.(id);
        }
        return;
      }

      // Double click an equipped slot -> unequip directly
      const equipSlotBtn = target.closest('[data-equip-slot-btn]');
      if (equipSlotBtn) {
        const slot = equipSlotBtn.getAttribute('data-equip-slot-btn') as EquipSlotKey | null;
        if (slot && this.latestSnapshot?.equipment[slot]) {
          this.onUnequipSlot?.(slot);
        }
        return;
      }
    });

    // HTML5 Drag and Drop delegation
    this.backdrop.addEventListener('dragstart', (e: DragEvent) => {
      const target = e.target as HTMLElement | null;
      const cell = target?.closest('[data-item-id]') as HTMLElement | null;
      if (!cell || !e.dataTransfer) return;

      const itemId = cell.getAttribute('data-item-id');
      if (!itemId) return;

      cell.classList.add('is-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', itemId);
    });

    this.backdrop.addEventListener('dragend', (e: DragEvent) => {
      const target = e.target as HTMLElement | null;
      const cell = target?.closest('[data-item-id]') as HTMLElement | null;
      if (cell) {
        cell.classList.remove('is-dragging');
      }
      this.backdrop.querySelectorAll('.drag-over-valid, .drag-over-invalid').forEach((el) => {
        el.classList.remove('drag-over-valid', 'drag-over-invalid');
      });
    });

    this.backdrop.addEventListener('dragover', (e: DragEvent) => {
      const target = e.target as HTMLElement | null;
      const slotCell = target?.closest('[data-equip-slot-target]') as HTMLElement | null;
      if (slotCell && e.dataTransfer) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }
    });

    this.backdrop.addEventListener('dragenter', (e: DragEvent) => {
      const target = e.target as HTMLElement | null;
      const slotCell = target?.closest('[data-equip-slot-target]') as HTMLElement | null;
      if (slotCell) {
        const slotKey = slotCell.getAttribute('data-equip-slot-target');
        slotCell.classList.add('drag-over-valid');
      }
    });

    this.backdrop.addEventListener('dragleave', (e: DragEvent) => {
      const target = e.target as HTMLElement | null;
      const slotCell = target?.closest('[data-equip-slot-target]') as HTMLElement | null;
      if (slotCell) {
        slotCell.classList.remove('drag-over-valid', 'drag-over-invalid');
      }
    });

    this.backdrop.addEventListener('drop', (e: DragEvent) => {
      const target = e.target as HTMLElement | null;
      const slotCell = target?.closest('[data-equip-slot-target]') as HTMLElement | null;
      if (!slotCell || !e.dataTransfer) return;
      e.preventDefault();
      slotCell.classList.remove('drag-over-valid', 'drag-over-invalid');

      const itemId = e.dataTransfer.getData('text/plain');
      if (!itemId || !this.latestSnapshot) return;

      const item = this.latestSnapshot.inventory.find((i) => i.id === itemId);
      if (!item) return;

      const targetSlot = slotCell.getAttribute('data-equip-slot-target') as EquipSlotKey | null;
      if (!targetSlot) return;

      if (item.category !== 'equip' || item.equipSlot !== targetSlot) {
        this.onToast?.(`Không thể trang bị "${item.name}" vào ô này (Cần ô ${item.equipSlot || 'khác'})!`, 'error');
        return;
      }

      if (item.requiredLevel && this.latestSnapshot.level < item.requiredLevel) {
        this.onToast?.(`Cần đạt Cấp ${item.requiredLevel} để trang bị "${item.name}"!`, 'error');
        return;
      }

      this.onUseOrEquipItem?.(itemId);
    });
  }

  private getTotalPending(): number {
    return STAT_KEYS.reduce((sum, key) => sum + Number(this.pendingAllocations[key] || 0), 0);
  }

  private incrementPendingStat(stat: keyof PrimaryAttributesState) {
    if (this.isSubmittingStats || !this.latestSnapshot) return;
    const committedUnspent = Number(this.latestSnapshot.stats.potentialPoints ?? 0);
    const totalPending = this.getTotalPending();
    if (committedUnspent - totalPending <= 0) {
      this.onToast?.('Đã hết điểm tiềm năng chưa phân bổ.', 'error');
      return;
    }
    const baseVal = Number(this.latestSnapshot.baseStats?.[stat] ?? this.latestSnapshot.stats.attributes[stat] ?? 10);
    if (baseVal + this.pendingAllocations[stat] >= MAX_BASE_STAT_CAP) {
      this.onToast?.(`Chỉ số ${stat.toUpperCase()} đã đạt giới hạn tối đa (${MAX_BASE_STAT_CAP}).`, 'error');
      return;
    }

    this.pendingAllocations[stat] += 1;
    this.bumpedStats.add(stat);
    this.onPendingPointsPreview?.(committedUnspent - (totalPending + 1));
    this.render();
    setTimeout(() => this.bumpedStats.delete(stat), 380);
  }

  private decrementPendingStat(stat: keyof PrimaryAttributesState) {
    if (this.isSubmittingStats || !this.latestSnapshot) return;
    if (this.pendingAllocations[stat] <= 0) return;

    this.pendingAllocations[stat] -= 1;
    const committedUnspent = Number(this.latestSnapshot.stats.potentialPoints ?? 0);
    this.onPendingPointsPreview?.(committedUnspent - this.getTotalPending());
    this.render();
  }

  public resetPendingAllocations(rerender = true) {
    if (this.isSubmittingStats) return;
    for (const k of STAT_KEYS) {
      this.pendingAllocations[k] = 0;
    }
    this.onPendingPointsPreview?.(null);
    if (rerender && this.isOpen) {
      this.render();
    }
  }

  private async confirmPendingAllocations() {
    if (this.isSubmittingStats || !this.latestSnapshot) return;
    const totalPending = this.getTotalPending();
    if (totalPending <= 0) return;

    if (!this.onConfirmStatAllocations) {
      for (const k of STAT_KEYS) {
        for (let i = 0; i < this.pendingAllocations[k]; i++) {
          this.onAllocateAttr?.(k);
        }
      }
      this.resetPendingAllocations(true);
      return;
    }

    const payload: Record<keyof PrimaryAttributesState, number> = { ...this.pendingAllocations };
    this.isSubmittingStats = true;
    this.render();

    try {
      const result = await this.onConfirmStatAllocations(payload);
      if (result.success) {
        for (const k of STAT_KEYS) {
          if (payload[k] > 0) this.bumpedStats.add(k);
          this.pendingAllocations[k] = 0;
        }
        this.onPendingPointsPreview?.(null);
        this.onToast?.(`Đã xác nhận cộng +${totalPending} điểm tiềm năng thành công!`, 'success');
        setTimeout(() => this.bumpedStats.clear(), 420);
      } else {
        this.onToast?.(result.error || 'Không thể lưu điểm tiềm năng lên máy chủ.', 'error');
      }
    } catch (err: any) {
      this.onToast?.(err?.message || 'Lỗi kết nối máy chủ khi cộng điểm.', 'error');
    } finally {
      this.isSubmittingStats = false;
      if (this.isOpen) this.render();
    }
  }

  private lastRenderHash = '';

  public sync(snapshot: HudSnapshot) {
    this.latestSnapshot = snapshot;
    const committed = Math.max(0, Number(snapshot.stats.potentialPoints ?? 0));
    if (this.getTotalPending() > committed) {
      for (const k of STAT_KEYS) this.pendingAllocations[k] = 0;
      this.onPendingPointsPreview?.(null);
    }
    this.characterPreview.updateData({
      level: snapshot.level,
      jobId: (snapshot as any).advancedJobId || snapshot.classId,
      playerName: snapshot.playerName,
      equipment: snapshot.equipment,
    });
    if (this.isOpen) {
      const currentHash = `${snapshot.stats.potentialPoints}_${snapshot.level}_${snapshot.stats.gold}_${snapshot.inventory.length}_${Object.keys(snapshot.equipment).join(',')}_${JSON.stringify(snapshot.baseStats)}`;
      if (currentHash !== this.lastRenderHash && this.getTotalPending() === 0) {
        this.render();
      }
    }
  }

  public open(snapshot?: HudSnapshot | null) {
    if (snapshot) this.latestSnapshot = snapshot;
    this.isOpen = true;
    this.discardConfirmItem = null;
    this.characterPreview.startAnimation();
    modalManager.open({
      id: BaloEquipModal.MODAL_ID,
      backdrop: this.backdrop,
      onClose: () => {
        this.isOpen = false;
        this.isSubmittingStats = false;
        this.discardConfirmItem = null;
        this.characterPreview.stopAnimation();
        for (const k of STAT_KEYS) this.pendingAllocations[k] = 0;
        this.onPendingPointsPreview?.(null);
      },
    });
    this.render();
  }

  public close() {
    this.isOpen = false;
    this.discardConfirmItem = null;
    this.characterPreview.stopAnimation();
    modalManager.close(BaloEquipModal.MODAL_ID);
  }

  public toggle(snapshot?: HudSnapshot | null) {
    if (this.isOpen) this.close();
    else this.open(snapshot);
  }

  private renderEquipSlotBtn(slot: EquipSlotKey, label: string, hintSvg: string, gear?: InventoryItemDef): string {
    const isSelected = this.selectedSource === 'equipment' && this.selectedEquipSlot === slot;
    const upg = gear?.upgradeLevel ? `<span class="tk-upgrade-badge">+${gear.upgradeLevel}</span>` : '';
    const artHtml = gear?.iconUrl
      ? `<img src="${gear.iconUrl}" alt="${gear.name}" class="tk-slot-img" />`
      : getItemIconSvg(gear ? gear.iconKey : hintSvg);

    const dur = gear?.durability ?? 100;
    const maxDur = gear?.maxDurability ?? 100;
    const durPct = Math.max(0, Math.min(100, Math.round((dur / maxDur) * 100)));

    return `
      <button
        type="button"
        class="tk-slot-cell tk-equip-slot ${gear ? `rarity-${gear.rarity}` : 'empty'} ${isSelected ? 'selected' : ''}"
        data-equip-slot-btn="${slot}"
        data-equip-slot-target="${slot}"
        title="${gear ? `${gear.name}${gear.upgradeLevel ? ` (+${gear.upgradeLevel})` : ''} [${RARITY_LABELS[gear.rarity] || gear.rarity}] · Nhấp xem chi tiết · Nhấp đúp để tháo` : `Trống · ${label} · Kéo trang bị vào đây`}"
      >
        <div class="tk-slot-art ${gear ? '' : 'ghost'}">${artHtml}</div>
        ${upg}
        <span class="tk-slot-subtag">${label}</span>
        ${gear ? `<div class="tk-slot-dur-indicator" style="position:absolute;bottom:0;left:2px;right:2px;height:2px;background:#e2e8f0;border-radius:1px;"><div style="height:100%;width:${durPct}%;background:${durPct < 30 ? '#ef4444' : '#22c55e'};"></div></div>` : ''}
      </button>
    `;
  }

  private render() {
    const snap = this.latestSnapshot;
    if (!snap) return;

    const prevCols = this.backdrop.querySelector('.tk-balo-columns') as HTMLElement | null;
    const savedScrollTop = prevCols ? prevCols.scrollTop : 0;

    this.characterPreview.updateData({
      level: snap.level,
      jobId: (snap as any).advancedJobId || snap.classId,
      playerName: snap.playerName,
      equipment: snap.equipment,
    });

    const filteredItems =
      this.activeFilter === 'all'
        ? snap.inventory
        : snap.inventory.filter((it) => it.category === this.activeFilter);

    // Resolve selected item: can be from inventory OR from equipment
    let inspectedItem: InventoryItemDef | null = null;
    let isInspectingEquipped = false;

    if (this.selectedSource === 'equipment' && this.selectedEquipSlot) {
      inspectedItem = snap.equipment[this.selectedEquipSlot] || null;
      isInspectingEquipped = true;
    } else {
      inspectedItem = filteredItems.find((i) => i.id === this.selectedItemId) || filteredItems[0] || null;
      if (inspectedItem) {
        this.selectedItemId = inspectedItem.id;
        this.selectedSource = 'inventory';
      }
    }

    const totalSlots = 48;
    let gridHtml = '';
    for (let i = 0; i < totalSlots; i++) {
      const item = filteredItems[i];
      if (!item) {
        gridHtml += `<div class="tk-slot-cell empty"></div>`;
      } else {
        const isSel = this.selectedSource === 'inventory' && inspectedItem?.id === item.id;
        const artHtml = item.iconUrl
          ? `<img src="${item.iconUrl}" alt="${item.name}" class="tk-slot-img" />`
          : getItemIconSvg(item.iconKey);
        gridHtml += `
          <button
            type="button"
            class="tk-slot-cell rarity-${item.rarity} ${isSel ? 'selected' : ''}"
            data-item-id="${item.id}"
            draggable="true"
            title="${item.name} [${RARITY_LABELS[item.rarity] || item.rarity}] · Nhấp xem · Nhấp đúp dùng/mặc · Kéo để trang bị"
          >
            <div class="tk-slot-art">${artHtml}</div>
            ${item.qty > 1 ? `<span class="tk-item-qty">${item.qty}</span>` : ''}
            ${item.category === 'equip' ? `<span class="tk-equip-badge">${item.upgradeLevel ? `+${item.upgradeLevel}` : 'EQ'}</span>` : ''}
          </button>
        `;
      }
    }

    const committedPoints = Math.max(0, Number(snap.stats.potentialPoints ?? 0));
    const totalPending = this.getTotalPending();
    const remainingPoints = Math.max(0, committedPoints - totalPending);

    // Live projected combat preview powered by Stat Aggregator
    const pStr = this.pendingAllocations.str;
    const pDex = this.pendingAllocations.dex;
    const pInt = this.pendingAllocations.int;
    const pCon = this.pendingAllocations.con;
    const pAgi = this.pendingAllocations.agi;
    const livePreview = totalPending > 0 && this.onPreviewAttrs ? this.onPreviewAttrs(this.pendingAllocations) : null;
    const prevSec = livePreview?.secondaryStats;
    const projectedAtk = Number(prevSec?.atk ?? (snap.stats.atk + pStr * 2 + Math.floor(pDex * 0.6)));
    const projectedMatk = Number(prevSec?.matk ?? ((snap.stats.matk ?? snap.stats.atk) + Math.round(pInt * 2.2) + Math.floor(pDex * 0.4)));
    const projectedDef = Number(prevSec?.def ?? (snap.stats.def + Math.floor(pCon * 0.8) + Math.floor(pAgi * 0.4)));
    const projectedMdef = Number(prevSec?.mdef ?? ((snap.stats.mdef ?? Math.round(snap.stats.def * 0.8)) + Math.floor(pInt * 0.7) + Math.floor(pCon * 0.5)));
    const projectedCrit = Number(prevSec?.critRatePct ?? (snap.stats.critRate ?? 5));
    const projectedHp = Number(prevSec?.maxHp ?? (snap.maxHp + pCon * 20));
    const projectedMp = Number(prevSec?.maxMp ?? (snap.maxMp + pInt * 15));
    const activeBreakdowns = livePreview?.breakdowns || snap.stats.breakdowns || {};
    const activeWarningsVi: string[] = livePreview?.warningsVi || snap.stats.warningsVi || [];
    const jobAffinity = livePreview?.jobAffinity || snap.stats.jobAffinity;
    const capEntries = Object.values(activeBreakdowns) as Array<{
      statKey: string;
      labelVi: string;
      rawBeforeDr: number;
      effectiveValue: number;
      softCap1: number;
      hardCeiling: number;
      inDiminishingReturns: boolean;
      atHardCap: boolean;
    }>;
    const statCapSummaryHtml = capEntries.length
      ? `
        <div style="margin:6px 0 8px;padding:7px 9px;border-radius:8px;border:1px solid rgba(180,140,70,0.35);background:rgba(255,250,240,0.92);font-size:11px;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap;">
            <span>
              <b>Ái Lực Nghề:</b>
              ${
                jobAffinity
                  ? `<span style="color:#b45309;font-weight:700;">Chính ${String(jobAffinity.primaryAttr).toUpperCase()} (+${jobAffinity.primaryEfficiencyBonusPct}%) · Phụ ${String(jobAffinity.secondaryAttr).toUpperCase()} (+${jobAffinity.secondaryEfficiencyBonusPct}%)</span>`
                  : '<span>Tân Thủ Cân Bằng</span>'
              }
            </span>
            <button type="button" class="tk-tab-btn" style="padding:2px 7px;font-size:10px;" data-toggle-cap-details="1">
              ${this.showCapDetails ? 'Thu Gọn Soft/Hard Cap ▲' : 'Chi Tiết 12 Mốc Cap ▼'}
            </button>
          </div>
          ${
            snap.stats.effectiveHp
              ? `<div style="margin-top:3px;color:#475569;">HP Hiệu Dụng (EHP): <strong style="color:#0369a1;">${(livePreview?.secondaryStats?.effectiveHp ?? snap.stats.effectiveHp).toLocaleString()}</strong> · Giảm ST: <strong>${prevSec?.damageReductionPct ?? snap.stats.damageReductionPct ?? 0}%</strong> · CDR: <strong>${prevSec?.cooldownReductionPct ?? snap.stats.cooldownReductionPct ?? 0}%</strong> · Xuyên: <strong>${prevSec?.armorPenetrationPct ?? snap.stats.armorPenetrationPct ?? 0}%/${prevSec?.magicPenetrationPct ?? snap.stats.magicPenetrationPct ?? 0}%</strong></div>`
              : ''
          }
          ${
            activeWarningsVi.length > 0
              ? `<div style="margin-top:5px;padding:5px 7px;border-radius:6px;background:#fef3c7;border:1px solid #f59e0b;color:#92400e;">
                  <b>⚠ Giới Hạn Giảm Dần (DR / Cap):</b><br/>
                  ${activeWarningsVi.slice(0, 3).map((w) => `<span>• ${w}</span>`).join('<br/>')}
                </div>`
              : ''
          }
          ${
            this.showCapDetails
              ? `<div style="margin-top:6px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px;">
                  ${capEntries
                    .map((b) => {
                      const badge = b.atHardCap
                        ? '<span style="color:#dc2626;font-weight:700;">[HARD CAP]</span>'
                        : b.inDiminishingReturns
                        ? '<span style="color:#d97706;font-weight:700;">[SOFT CAP]</span>'
                        : '<span style="color:#16a34a;">[100%]</span>';
                      return `<div style="padding:3px 6px;border-radius:6px;background:rgba(255,255,255,0.75);border:1px solid rgba(203,213,225,0.7);">
                        <div><b>${b.labelVi}</b> ${badge}</div>
                        <div style="color:#475569;">Hiệu lực: <b>${b.effectiveValue}%</b> (Thô ${b.rawBeforeDr}%) · C1:${b.softCap1}% / Trần:${b.hardCeiling}%</div>
                      </div>`;
                    })
                    .join('')}
                </div>`
              : ''
          }
        </div>
      `
      : '';

    // Build Item Comparison Section if inspecting an equipment item from bag
    let compareHtml = '';
    if (inspectedItem && inspectedItem.category === 'equip' && inspectedItem.equipSlot && !isInspectingEquipped) {
      const currentlyEquipped = snap.equipment[inspectedItem.equipSlot];
      if (currentlyEquipped) {
        const diffAtk = (inspectedItem.atkBonus || 0) - (currentlyEquipped.atkBonus || 0);
        const diffDef = (inspectedItem.defBonus || 0) - (currentlyEquipped.defBonus || 0);
        const diffMatk = (inspectedItem.matkBonus || 0) - (currentlyEquipped.matkBonus || 0);
        const diffHp = (inspectedItem.hpBonus || 0) - (currentlyEquipped.hpBonus || 0);
        const diffCrit = (inspectedItem.critRate || 0) - (currentlyEquipped.critRate || 0);

        const formatDiff = (label: string, diff: number, suffix = '') => {
          if (diff === 0) return `<span class="tk-stat-diff neutral">${label}: =</span>`;
          const isPos = diff > 0;
          return `<span class="tk-stat-diff ${isPos ? 'positive' : 'negative'}">${label}: ${isPos ? '+' : ''}${diff}${suffix}</span>`;
        };

        compareHtml = `
          <div class="tk-compare-card">
            <div class="tk-compare-title">
              <span>So sánh với đồ đang mặc (${currentlyEquipped.name}):</span>
            </div>
            <div class="tk-compare-grid">
              ${formatDiff('ATK', diffAtk)}
              ${formatDiff('DEF', diffDef)}
              ${formatDiff('MATK', diffMatk)}
              ${formatDiff('HP', diffHp)}
              ${formatDiff('Crit', diffCrit, '%')}
            </div>
          </div>
        `;
      } else {
        compareHtml = `
          <div class="tk-compare-card" style="background:#f0fdf4;border-color:#86efac;">
            <div class="tk-compare-title" style="color:#166534;">
              <span>Ô này đang trống · Nhận toàn bộ chỉ số khi trang bị!</span>
            </div>
          </div>
        `;
      }
    }

    // Build Durability & Requirement tags
    let durReqHtml = '';
    if (inspectedItem && inspectedItem.category === 'equip') {
      const curDur = inspectedItem.durability ?? 100;
      const maxDur = inspectedItem.maxDurability ?? 100;
      const pct = Math.max(0, Math.min(100, Math.round((curDur / maxDur) * 100)));
      const isLow = pct < 30;

      const reqLv = inspectedItem.requiredLevel || 1;
      const meetsLv = snap.level >= reqLv;

      durReqHtml = `
        <div class="tk-durability-box">
          <span>Độ bền: <b>${curDur}/${maxDur}</b></span>
          <div class="tk-durability-track">
            <div class="tk-durability-fill ${isLow ? 'low' : ''}" style="width:${pct}%;"></div>
          </div>
        </div>
        <div class="tk-req-row">
          <span class="tk-req-tag ${meetsLv ? 'valid' : 'invalid'}">Cấp yêu cầu: Lv.${reqLv}</span>
          ${inspectedItem.allowedClasses?.length ? `<span class="tk-req-tag valid">Hệ: ${inspectedItem.allowedClasses.join(', ')}</span>` : '<span class="tk-req-tag valid">Mọi hệ</span>'}
        </div>
      `;
    }

    // Discard Confirmation Dialog overlay if active
    let discardDialogHtml = '';
    if (this.discardConfirmItem) {
      discardDialogHtml = `
        <div class="tk-confirm-dialog-backdrop">
          <div class="tk-confirm-dialog-box">
            <h3>XÁC NHẬN VỨT BỎ</h3>
            <p>Bạn có chắc chắn muốn vứt bỏ vật phẩm <b>${this.discardConfirmItem.name}</b> x1?</p>
            <p class="tk-confirm-warning">⚠ Vật phẩm sẽ biến mất vĩnh viễn khỏi hành trang!</p>
            <div class="tk-confirm-btn-row">
              <button type="button" class="tk-action-btn tk-danger" id="btn-confirm-discard-yes">Xác Nhận Vứt</button>
              <button type="button" class="tk-tab-btn" id="btn-confirm-discard-no">Hủy Bỏ</button>
            </div>
          </div>
        </div>
      `;
    }

    this.backdrop.innerHTML = `
      <div class="tk-window tk-balo-window" role="dialog" aria-modal="true" aria-label="Nhân vật, Trang bị và Balo">
        ${discardDialogHtml}
        <div class="tk-window-header">
          <div class="tk-header-title-group">
            <span class="tk-header-crest">${getBackpackIconSvg()}</span>
            <div>
              <h2>NHÂN VẬT, CHỈ SỐ &amp; BALO</h2>
              <p>${snap.playerName} · Cấp ${snap.level} · ${snap.regionName}${snap.stats.equippedCosmeticTitleName ? ` · « ${snap.stats.equippedCosmeticTitleName} »` : ''}</p>
            </div>
          </div>
          <button type="button" class="tk-btn-close" id="btn-close-balo" data-close-modal="balo-equip" title="Đóng [B / ESC]">✕</button>
        </div>

        <div class="tk-balo-columns">
          <!-- LEFT: EQUIP, COMPUTED STATS & REAL CHARACTER ATTRIBUTE ALLOCATION -->
          <section class="tk-panel-inset tk-equip-column">
            <div class="tk-section-heading">
              <span>TRANG BỊ NHÂN VẬT</span>
              <span class="tk-heading-pill">${snap.classId.toUpperCase()} · HP ${projectedHp} / MP ${projectedMp}</span>
            </div>

            <div class="tk-paperdoll-stage">
              <div class="tk-equip-col-stack">
                ${EQUIP_LEFT.map((s) => this.renderEquipSlotBtn(s.slot, s.label, s.hintSvg, snap.equipment[s.slot])).join('')}
              </div>

              <div class="tk-paperdoll-pedestal" id="tk-character-preview-mount"></div>

              <div class="tk-equip-col-stack">
                ${EQUIP_RIGHT.map((s) => this.renderEquipSlotBtn(s.slot, s.label, s.hintSvg, snap.equipment[s.slot])).join('')}
              </div>
            </div>

            <div class="tk-stats-grid">
              <div class="tk-stat-chip">
                <span>Vật Công (ATK)</span>
                <strong id="stat-preview-atk" style="color: #fbbf24;">${projectedAtk}${projectedAtk > snap.stats.atk ? ` (+${projectedAtk - snap.stats.atk})` : ''}</strong>
              </div>
              <div class="tk-stat-chip">
                <span>Phép Thuật (MATK)</span>
                <strong id="stat-preview-matk" style="color: #c084fc;">${projectedMatk}${projectedMatk > (snap.stats.matk ?? snap.stats.atk) ? ` (+${projectedMatk - (snap.stats.matk ?? snap.stats.atk)})` : ''}</strong>
              </div>
              <div class="tk-stat-chip">
                <span>Phòng Thủ (DEF / MDEF)</span>
                <strong id="stat-preview-def" style="color: #93c5fd;">${projectedDef} / ${projectedMdef}</strong>
              </div>
              <div class="tk-stat-chip">
                <span>Bạo Kích (Crit)</span>
                <strong style="color: #f87171;">${projectedCrit.toFixed(1)}%</strong>
              </div>
            </div>
            ${statCapSummaryHtml}

            ${
              snap.stats.activeSetBonuses && snap.stats.activeSetBonuses.length > 0
                ? `<div class="tk-set-bonus-box">
                    <div class="tk-attr-head"><span>BỘ TRANG BỊ KÍCH HOẠT (SET BONUS)</span><span class="tk-heading-pill">${snap.stats.activeSetBonuses.length} bộ</span></div>
                    ${snap.stats.activeSetBonuses
                      .map(
                        (s) => `
                        <div class="tk-set-bonus-row">
                          <strong>${s.setName} (${s.equippedCount} món)</strong>
                          <div>${s.activeTiers.map((t) => `<span class="tk-set-tier-pill">${t.piecesRequired}pc: ${t.description}</span>`).join(' ')}</div>
                        </div>
                      `
                      )
                      .join('')}
                  </div>`
                : ''
            }

            <div class="tk-attr-box" id="character-attribute-panel">
              <div class="tk-attr-head">
                <span>5 CHỈ SỐ CƠ BẢN (BASE + BONUS)</span>
                <span class="tk-potential-pill ${remainingPoints <= 0 ? 'empty' : ''}" id="attr-remaining-points">
                  Điểm tiềm năng còn: ${remainingPoints}
                </span>
              </div>
              <div class="tk-attr-list">
                ${ATTR_LABELS.map((a) => {
                  const baseVal = Number(snap.baseStats?.[a.key] ?? snap.stats.attributes[a.key] ?? 10);
                  const effBonus = Math.max(0, Number(snap.stats.attributes[a.key] ?? baseVal) - baseVal);
                  const pending = this.pendingAllocations[a.key] || 0;
                  const displayVal = baseVal + pending;
                  const canPlus = !this.isSubmittingStats && remainingPoints > 0 && displayVal < MAX_BASE_STAT_CAP;
                  const canMinus = !this.isSubmittingStats && pending > 0;
                  const isBumped = this.bumpedStats.has(a.key);

                  return `
                    <div class="tk-attr-row" data-stat-row="${a.key}">
                      <div>
                        <strong>${a.label}</strong>
                        <div style="font-size:10px;color:#78705b;">${a.effectHint}${effBonus > 0 ? ` · Trang bị/Danh hiệu +${effBonus}` : ''}</div>
                      </div>
                      <div class="tk-attr-controls">
                        <button
                          type="button"
                          class="tk-attr-minus"
                          data-stat-minus="${a.key}"
                          aria-label="Giảm ${a.short}"
                          ${canMinus ? '' : 'disabled'}
                        >−</button>
                        <strong
                          class="tk-attr-val ${pending > 0 ? 'pending' : ''} ${isBumped ? 'tk-stat-bump' : ''}"
                          data-stat-value="${a.key}"
                        >${displayVal}</strong>
                        <span class="tk-attr-delta">${pending > 0 ? `+${pending}` : ''}</span>
                        <button
                          type="button"
                          class="tk-attr-plus"
                          data-stat-plus="${a.key}"
                          aria-label="Tăng ${a.short}"
                          ${canPlus ? '' : 'disabled'}
                        >+</button>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>

              <div class="tk-stat-actions">
                <button
                  type="button"
                  class="tk-action-btn tk-btn-reset-stats"
                  id="btn-stat-reset"
                  data-stat-reset="1"
                  ${totalPending > 0 && !this.isSubmittingStats ? '' : 'disabled'}
                >Reset</button>
                <button
                  type="button"
                  class="tk-action-btn tk-btn-confirm-stats"
                  id="btn-stat-confirm"
                  data-stat-confirm="1"
                  ${totalPending > 0 && !this.isSubmittingStats ? '' : 'disabled'}
                >${this.isSubmittingStats ? 'Đang Xác Nhận...' : `Xác Nhận (+${totalPending})`}</button>
              </div>
            </div>
          </section>

          <!-- RIGHT: BALO ITEM GRID FRAME -->
          <section class="tk-panel-inset tk-items-column">
            <div class="tk-section-heading">
              <span>BALO · TÚI ĐỒ (${snap.inventory.length}/48)</span>
              <div class="tk-filter-tabs">
                <button type="button" class="tk-tab-btn ${this.activeFilter === 'all' ? 'active' : ''}" data-filter="all">Tất cả</button>
                <button type="button" class="tk-tab-btn ${this.activeFilter === 'equip' ? 'active' : ''}" data-filter="equip">Trang bị</button>
                <button type="button" class="tk-tab-btn ${this.activeFilter === 'consumable' ? 'active' : ''}" data-filter="consumable">Tiêu hao</button>
                <button type="button" class="tk-tab-btn ${this.activeFilter === 'material' ? 'active' : ''}" data-filter="material">Nguyên liệu</button>
                <button type="button" class="tk-tab-btn ${this.activeFilter === 'quest' ? 'active' : ''}" data-filter="quest">Nhiệm vụ</button>
              </div>
            </div>

            <div class="tk-items-grid" id="balo-items-grid">
              ${gridHtml}
            </div>

            <div class="tk-inspector-bar">
              ${
                inspectedItem
                  ? `
                <div class="tk-inspector-info">
                  <div class="tk-inspector-name rarity-text-${inspectedItem.rarity}">
                    ${inspectedItem.name}
                    ${isInspectingEquipped ? `<span class="tk-heading-pill" style="background:#dbeafe;border-color:#60a5fa;color:#1e40af;">ĐANG MẶC</span>` : ''}
                    ${inspectedItem.isUnique ? `<span class="tk-rarity-tag rarity-mythic">UNIQUE</span>` : ''}
                    ${inspectedItem.isCharacterBound ? `<span class="tk-heading-pill">Khoá Nhân Vật</span>` : ''}
                    ${inspectedItem.isAccountBound ? `<span class="tk-heading-pill">Khoá Tài Khoản</span>` : ''}
                    <span class="tk-rarity-tag rarity-${inspectedItem.rarity}">${RARITY_LABELS[inspectedItem.rarity] || inspectedItem.rarity}</span>
                    ${inspectedItem.setId ? `<span class="tk-heading-pill">Bộ: ${inspectedItem.setId}</span>` : ''}
                  </div>
                  <div class="tk-inspector-desc">
                    ${inspectedItem.desc}${inspectedItem.atkBonus ? ` · +${inspectedItem.atkBonus} ATK` : ''}${inspectedItem.matkBonus ? ` · +${inspectedItem.matkBonus} MATK` : ''}${inspectedItem.defBonus ? ` · +${inspectedItem.defBonus} DEF` : ''}${inspectedItem.hpBonus ? ` · +${inspectedItem.hpBonus} HP` : ''}${inspectedItem.critRate ? ` · +${inspectedItem.critRate}% Crit` : ''}
                    ${inspectedItem.passiveEffects?.length ? `<div style="margin-top:4px;color:#fbbf24;font-size:11px;">✦ Nội Tại Unique: ${inspectedItem.passiveEffects.map((p) => p.description).join(' · ')}</div>` : ''}
                  </div>
                  ${durReqHtml}
                  ${compareHtml}
                </div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;align-self:flex-start;">
                  ${
                    isInspectingEquipped
                      ? `
                    <button
                      type="button"
                      class="tk-action-btn"
                      id="btn-balo-unequip-item"
                      title="Tháo trang bị này về hành trang"
                    >Tháo Trang Bị</button>
                  `
                      : `
                    <button
                      type="button"
                      class="tk-action-btn"
                      id="btn-balo-use-item"
                      ${inspectedItem.category === 'material' ? 'disabled' : ''}
                    >${inspectedItem.category === 'equip' ? 'Trang Bị' : inspectedItem.category === 'consumable' ? 'Sử Dụng' : 'Nguyên Liệu'}</button>
                    <button
                      type="button"
                      class="tk-tab-btn"
                      id="btn-balo-discard"
                      style="color:#fca5a5;"
                      ${inspectedItem.isUnique || inspectedItem.isLocked || inspectedItem.bound || inspectedItem.isCharacterBound || inspectedItem.isAccountBound ? 'disabled' : ''}
                      title="Vứt bỏ 1 vật phẩm đã chọn"
                    >🗑 Vứt Bỏ</button>
                  `
                  }
                </div>
              `
                  : this.selectedSource === 'equipment' && this.selectedEquipSlot
                  ? `
                <div class="tk-inspector-info">
                  <div class="tk-inspector-name">Ô Trang Bị: ${this.selectedEquipSlot.toUpperCase()} (Đang Trống)</div>
                  <div class="tk-inspector-desc">Chưa có trang bị nào được gắn vào ô này. Hãy chọn một trang bị phù hợp từ Balo hoặc kéo thả vào ô.</div>
                </div>
              `
                  : `<div class="tk-inspector-desc">Chọn vật phẩm để xem chi tiết hoặc trang bị. Nhấp đúp để dùng/mặc nhanh. Kéo thả vào ô trang bị.</div>`
              }
            </div>

            <div class="tk-currency-strip" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">
              <div style="display:flex;gap:8px;">
                <div class="tk-coin-pill"><span class="tk-coin-dot gold"></span>Vàng: <strong>${snap.stats.gold.toLocaleString()}</strong></div>
                <div class="tk-coin-pill"><span class="tk-coin-dot silver"></span>Bạc: <strong>${snap.stats.silver.toLocaleString()}</strong></div>
              </div>
              <div style="display:flex;gap:6px;">
                <button type="button" class="tk-tab-btn" id="btn-balo-sort" title="Gộp vật phẩm &amp; sắp xếp hành trang">⇅ Sắp Xếp</button>
                <button type="button" class="tk-tab-btn" id="btn-balo-repair" title="Sửa chữa độ bền trang bị đang mặc (100%)">🔧 Sửa Chữa</button>
              </div>
            </div>
          </section>
        </div>

        <div class="tk-modal-footer">
          <button type="button" class="tk-tab-btn" data-close-modal="balo-equip">Đóng [ESC]</button>
        </div>
      </div>
    `;

    // Mount live interactive CharacterPreview canvas into pedestal stage
    const mount = this.backdrop.querySelector('#tk-character-preview-mount');
    if (mount) {
      mount.replaceChildren(this.characterPreview.getElement());
    }

    const nextCols = this.backdrop.querySelector('.tk-balo-columns') as HTMLElement | null;
    if (nextCols && savedScrollTop > 0) {
      nextCols.scrollTop = savedScrollTop;
    }

    this.lastRenderHash = `${snap.stats.potentialPoints}_${snap.level}_${snap.stats.gold}_${snap.inventory.length}_${Object.keys(snap.equipment).join(',')}_${JSON.stringify(snap.baseStats)}`;
  }
}
