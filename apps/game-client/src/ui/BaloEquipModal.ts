import { HudSnapshot } from '../engine/GameEngine';
import { EquipSlotKey, InventoryItemDef, ItemCategory, PrimaryAttributesState } from '../engine/types';
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
  { slot: 'weapon', label: 'Vũ Khí', hintSvg: 'sword_novice' },
  { slot: 'head', label: 'Mũ / Nón', hintSvg: 'helm_bronze' },
  { slot: 'armor', label: 'Áo Giáp', hintSvg: 'tunic_explorer' },
  { slot: 'gloves', label: 'Găng Tay', hintSvg: 'gloves_leather' },
  { slot: 'boots', label: 'Ủng / Giày', hintSvg: 'boots_leather' },
];

const EQUIP_RIGHT: { slot: EquipSlotKey; label: string; hintSvg: string }[] = [
  { slot: 'shoulder', label: 'Cầu Vai', hintSvg: 'shoulder_plate' },
  { slot: 'necklace', label: 'Dây Chuyền', hintSvg: 'amulet_jade' },
  { slot: 'ring1', label: 'Nhẫn 1', hintSvg: 'ring_band' },
  { slot: 'ring2', label: 'Nhẫn 2', hintSvg: 'ring_band' },
  { slot: 'cloak', label: 'Áo Choàng', hintSvg: 'cloak_wind' },
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
  private latestSnapshot: HudSnapshot | null = null;

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

    this.backdrop.addEventListener('click', (e) => {
      const target = e.target as HTMLElement | null;
      if (!target || target === this.backdrop) return;
      e.stopPropagation();

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

      const itemCell = target.closest('[data-item-id]');
      if (itemCell) {
        const id = itemCell.getAttribute('data-item-id');
        if (!id) return;
        if (this.selectedItemId === id) {
          this.onUseOrEquipItem?.(id);
        } else {
          this.selectedItemId = id;
          this.render();
        }
        return;
      }

      const useBtn = target.closest('#btn-balo-use-item');
      if (useBtn && this.selectedItemId) {
        this.onUseOrEquipItem?.(this.selectedItemId);
        return;
      }

      const discardBtn = target.closest('#btn-balo-discard');
      if (discardBtn && this.selectedItemId) {
        this.onDiscardItem?.(this.selectedItemId);
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

      const unequipBtn = target.closest('[data-unequip-slot]');
      if (unequipBtn) {
        const slot = unequipBtn.getAttribute('data-unequip-slot') as EquipSlotKey | null;
        if (slot) this.onUnequipSlot?.(slot);
      }
    });
  }

  private getTotalPending(): number {
    return STAT_KEYS.reduce((sum, key) => sum + Number(this.pendingAllocations[key] || 0), 0);
  }

  private getRemainingPreview(): number {
    const committed = Math.max(0, Number(this.latestSnapshot?.stats.potentialPoints ?? 0));
    return Math.max(0, committed - this.getTotalPending());
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
      // Fallback single allocation if wired without async handler
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

  public sync(snapshot: HudSnapshot) {
    this.latestSnapshot = snapshot;
    const committed = Math.max(0, Number(snapshot.stats.potentialPoints ?? 0));
    if (this.getTotalPending() > committed) {
      for (const k of STAT_KEYS) this.pendingAllocations[k] = 0;
      this.onPendingPointsPreview?.(null);
    }
    if (this.isOpen) {
      this.render();
    }
  }

  public open(snapshot?: HudSnapshot | null) {
    if (snapshot) this.latestSnapshot = snapshot;
    this.isOpen = true;
    modalManager.open({
      id: BaloEquipModal.MODAL_ID,
      backdrop: this.backdrop,
      onClose: () => {
        this.isOpen = false;
        this.isSubmittingStats = false;
        for (const k of STAT_KEYS) this.pendingAllocations[k] = 0;
        this.onPendingPointsPreview?.(null);
      },
    });
    this.render();
  }

  public close() {
    this.isOpen = false;
    modalManager.close(BaloEquipModal.MODAL_ID);
  }

  public toggle(snapshot?: HudSnapshot | null) {
    if (this.isOpen) this.close();
    else this.open(snapshot);
  }

  private renderEquipSlotBtn(slot: EquipSlotKey, label: string, hintSvg: string, gear?: InventoryItemDef): string {
    const upg = gear?.upgradeLevel ? `<span class="tk-upgrade-badge">+${gear.upgradeLevel}</span>` : '';
    const artHtml = gear?.iconUrl
      ? `<img src="${gear.iconUrl}" alt="${gear.name}" class="tk-slot-img" />`
      : getItemIconSvg(gear ? gear.iconKey : hintSvg);
    return `
      <button
        type="button"
        class="tk-slot-cell tk-equip-slot ${gear ? `rarity-${gear.rarity}` : 'empty'}"
        data-unequip-slot="${slot}"
        title="${gear ? `${gear.name}${gear.upgradeLevel ? ` (+${gear.upgradeLevel})` : ''} [${RARITY_LABELS[gear.rarity] || gear.rarity}] · Nhấp để tháo vào Balo` : `Trống · ${label}`}"
      >
        <div class="tk-slot-art ${gear ? '' : 'ghost'}">${artHtml}</div>
        ${upg}
        <span class="tk-slot-subtag">${label}</span>
      </button>
    `;
  }

  private render() {
    const snap = this.latestSnapshot;
    if (!snap) return;

    const prevCols = this.backdrop.querySelector('.tk-balo-columns') as HTMLElement | null;
    const savedScrollTop = prevCols ? prevCols.scrollTop : 0;

    const filteredItems =
      this.activeFilter === 'all'
        ? snap.inventory
        : snap.inventory.filter((it) => it.category === this.activeFilter);

    const selectedItem =
      filteredItems.find((i) => i.id === this.selectedItemId) || filteredItems[0] || null;
    if (selectedItem) this.selectedItemId = selectedItem.id;

    const totalSlots = 30;
    let gridHtml = '';
    for (let i = 0; i < totalSlots; i++) {
      const item = filteredItems[i];
      if (!item) {
        gridHtml += `<div class="tk-slot-cell empty"></div>`;
      } else {
        const isSel = selectedItem?.id === item.id;
        const artHtml = item.iconUrl
          ? `<img src="${item.iconUrl}" alt="${item.name}" class="tk-slot-img" />`
          : getItemIconSvg(item.iconKey);
        gridHtml += `
          <button
            type="button"
            class="tk-slot-cell rarity-${item.rarity} ${isSel ? 'selected' : ''}"
            data-item-id="${item.id}"
            title="${item.name} [${RARITY_LABELS[item.rarity] || item.rarity}]"
          >
            <div class="tk-slot-art">${artHtml}</div>
            ${item.qty > 1 ? `<span class="tk-item-qty">${item.qty}</span>` : ''}
            ${item.category === 'equip' ? `<span class="tk-equip-badge">${item.upgradeLevel ? `+${item.upgradeLevel}` : 'EQ'}</span>` : ''}
          </button>
        `;
      }
    }

    const actionLabel =
      selectedItem?.category === 'equip'
        ? 'Trang Bị'
        : selectedItem?.category === 'consumable'
        ? 'Sử Dụng'
        : 'Nguyên Liệu';

    const committedPoints = Math.max(0, Number(snap.stats.potentialPoints ?? 0));
    const totalPending = this.getTotalPending();
    const remainingPoints = Math.max(0, committedPoints - totalPending);

    // Live projected combat preview powered by unified Stat Aggregator (Job Affinity + DR + Hard Caps)
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

    this.backdrop.innerHTML = `
      <div class="tk-window tk-balo-window" role="dialog" aria-modal="true" aria-label="Nhân vật, Trang bị và Balo">
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

              <div class="tk-paperdoll-pedestal">
                <img src="${
                  [
                    'warrior', 'fighter', 'swordsman', 'mage', 'assassin', 'archer', 'priest', 'monk', 'paladin', 'knight', 'lancer', 'spearman',
                    'sword_saint', 'berserker', 'dragoon', 'warlancer', 'guardian', 'saint', 'exorcist', 'elementalist', 'arcanist', 'shadowblade', 'phantom', 'martial_artist', 'duelist', 'sniper', 'ranger',
                  ].includes(String((snap as any).advancedJobId || snap.classId || '').toLowerCase())
                    ? `/assets/elysia/characters/jobs/${String((snap as any).advancedJobId || snap.classId).toLowerCase()}.png`
                    : '/assets/elysia/ui/paperdoll-player.png'
                }" alt="${snap.playerName}" class="tk-paperdoll-img" />
              </div>

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
              <span>BALO · TÚI ĐỒ (${snap.inventory.length}/30)</span>
              <div class="tk-filter-tabs">
                <button type="button" class="tk-tab-btn ${this.activeFilter === 'all' ? 'active' : ''}" data-filter="all">Tất cả</button>
                <button type="button" class="tk-tab-btn ${this.activeFilter === 'equip' ? 'active' : ''}" data-filter="equip">Trang bị</button>
                <button type="button" class="tk-tab-btn ${this.activeFilter === 'consumable' ? 'active' : ''}" data-filter="consumable">Tiêu hao</button>
                <button type="button" class="tk-tab-btn ${this.activeFilter === 'material' ? 'active' : ''}" data-filter="material">Nguyên liệu</button>
              </div>
            </div>

            <div class="tk-items-grid" id="balo-items-grid">
              ${gridHtml}
            </div>

            <div class="tk-inspector-bar">
              ${
                selectedItem
                  ? `
                <div class="tk-inspector-info">
                  <div class="tk-inspector-name rarity-text-${selectedItem.rarity}">
                    ${selectedItem.name}
                    ${selectedItem.isUnique ? `<span class="tk-rarity-tag rarity-mythic">UNIQUE</span>` : ''}
                    ${selectedItem.isCharacterBound ? `<span class="tk-heading-pill">Khoá Nhân Vật</span>` : ''}
                    ${selectedItem.isAccountBound ? `<span class="tk-heading-pill">Khoá Tài Khoản</span>` : ''}
                    <span class="tk-rarity-tag rarity-${selectedItem.rarity}">${RARITY_LABELS[selectedItem.rarity] || selectedItem.rarity}</span>
                    ${selectedItem.setId ? `<span class="tk-heading-pill">Bộ: ${selectedItem.setId}</span>` : ''}
                  </div>
                  <div class="tk-inspector-desc">
                    ${selectedItem.desc}${selectedItem.atkBonus ? ` · +${selectedItem.atkBonus} ATK` : ''}${selectedItem.matkBonus ? ` · +${selectedItem.matkBonus} MATK` : ''}${selectedItem.defBonus ? ` · +${selectedItem.defBonus} DEF` : ''}${selectedItem.hpBonus ? ` · +${selectedItem.hpBonus} HP` : ''}${selectedItem.critRate ? ` · +${selectedItem.critRate}% Crit` : ''}
                    ${selectedItem.passiveEffects?.length ? `<div style="margin-top:4px;color:#fbbf24;font-size:11px;">✦ Nội Tại Unique: ${selectedItem.passiveEffects.map((p) => p.description).join(' · ')}</div>` : ''}
                  </div>
                </div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                  <button
                    type="button"
                    class="tk-action-btn"
                    id="btn-balo-use-item"
                    ${selectedItem.category === 'material' ? 'disabled' : ''}
                  >${actionLabel}</button>
                  <button
                    type="button"
                    class="tk-tab-btn"
                    id="btn-balo-discard"
                    style="color:#fca5a5;"
                    ${selectedItem.isUnique ? 'disabled' : ''}
                    title="Vứt bỏ 1 vật phẩm đã chọn"
                  >🗑 Vứt Bỏ</button>
                </div>
              `
                  : `<div class="tk-inspector-desc">Chọn vật phẩm để xem chi tiết hoặc trang bị.</div>`
              }
            </div>

            <div class="tk-currency-strip" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">
              <div style="display:flex;gap:8px;">
                <div class="tk-coin-pill"><span class="tk-coin-dot gold"></span>Vàng: <strong>${snap.stats.gold.toLocaleString()}</strong></div>
                <div class="tk-coin-pill"><span class="tk-coin-dot silver"></span>Bạc: <strong>${snap.stats.silver.toLocaleString()}</strong></div>
              </div>
              <div style="display:flex;gap:6px;">
                <button type="button" class="tk-tab-btn" id="btn-balo-sort" title="Gộp gọn &amp; sắp xếp hành trang">⇅ Sắp Xếp</button>
                <button type="button" class="tk-tab-btn" id="btn-balo-repair" title="Sửa chữa độ bền trang bị đang mặc">🔧 Sửa Chữa</button>
              </div>
            </div>
          </section>
        </div>

        <div class="tk-modal-footer">
          <button type="button" class="tk-tab-btn" data-close-modal="balo-equip">Đóng [ESC]</button>
        </div>
      </div>
    `;

    const nextCols = this.backdrop.querySelector('.tk-balo-columns') as HTMLElement | null;
    if (nextCols && savedScrollTop > 0) {
      nextCols.scrollTop = savedScrollTop;
    }
  }
}
