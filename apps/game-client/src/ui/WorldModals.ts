import { HudSnapshot } from '../engine/GameEngine';
import { CraftingRecipeView, EquipSlotKey, PrimaryAttributesState } from '../engine/types';
import { isPreJobClass } from '@elysia/game-data-schema';
import { getItemIconSvg } from './FantasyArtIcons';
import { modalManager } from './ModalManager';

export type WorldModalMode = 'quest' | 'shop' | 'storage' | 'worldmap' | 'job' | 'crafting' | null;

/**
 * Quest Log, Shop, Storage, World Map, Crafting & Automatic Job Awakening modals matching
 * the ivory parchment, antique gold, and forest-green Elysia HUD aesthetic.
 */
export class WorldModals {
  public static readonly MODAL_ID = 'world-panels';
  private backdrop: HTMLElement;
  private mode: WorldModalMode = null;
  private snapshot: HudSnapshot | null = null;
  private craftingTab: 'all' | 'fragment_exchange' | 'boss_craft' | 'upgrade_stone' | 'equip_upgrade' = 'all';
  private questTab: 'available' | 'active' | 'completed' | 'hidden' | 'titles' = 'available';
  private shopTab: 'buy' | 'sell' = 'buy';
  private shopQuantities: Record<string, number> = {};
  private busyCraftLock = false;

  public onClaimQuest?: (questId: string) => void;
  public onAcceptWorldQuest?: (questId: string) => void;
  public onTrackQuest?: (questId: string | null) => void;
  public onAbandonQuest?: (questId: string) => void;
  public onEquipCosmeticTitle?: (titleId: string | null) => void;
  public onBuyItem?: (shopId: string, quantity?: number) => void;
  public onSellItem?: (itemId: string, quantity?: number) => void;
  public onRepairEquipment?: () => void;
  public onDepositItem?: (itemId: string) => void;
  public onWithdrawItem?: (itemId: string) => void;
  public onTravelRegion?: (regionId: string, mode?: 'solo' | 'party') => void;
  public onAllocateAttr?: (stat: keyof PrimaryAttributesState) => void;
  public onOpenBaloStats?: () => void;
  public onTriggerAwakening?: () => void;
  public onReplayJobRitual?: (jobId?: string) => void;
  public onSelectLv80Branch?: (branchId: string) => void | Promise<boolean | void>;
  public onCraftRecipe?: (recipeId: string) => boolean | void | Promise<boolean | void>;
  public onUpgradeEquipSlot?: (slot: EquipSlotKey) => void;

  constructor() {
    this.backdrop = document.createElement('div');
    this.backdrop.id = 'modal-world-panels';
    this.backdrop.className = 'tk-modal-backdrop hidden';
    this.backdrop.setAttribute('aria-hidden', 'true');
    document.body.appendChild(this.backdrop);

    modalManager.registerBackdrop(this.backdrop, () => ({
      id: WorldModals.MODAL_ID,
      onRequestClose: () => this.close(),
      closeOnBackdrop: true,
    }));

    this.backdrop.addEventListener('click', (e) => {
      const target = e.target as HTMLElement | null;
      if (!target || target === this.backdrop) return;
      e.stopPropagation();

      if (target.closest('[data-close-modal="world-panels"], #btn-close-world-modal')) {
        this.close();
        return;
      }

      const questTabBtn = target.closest('[data-quest-tab]');
      if (questTabBtn) {
        this.questTab = (questTabBtn.getAttribute('data-quest-tab') as any) || 'available';
        this.render();
        return;
      }

      const acceptQuestBtn = target.closest('[data-accept-world-quest]');
      if (acceptQuestBtn) {
        const id = acceptQuestBtn.getAttribute('data-accept-world-quest');
        if (id) this.onAcceptWorldQuest?.(id);
        return;
      }

      const trackQuestBtn = target.closest('[data-track-quest]');
      if (trackQuestBtn) {
        const raw = trackQuestBtn.getAttribute('data-track-quest');
        this.onTrackQuest?.(raw && raw !== 'none' ? raw : null);
        return;
      }

      const abandonQuestBtn = target.closest('[data-abandon-quest]');
      if (abandonQuestBtn) {
        const id = abandonQuestBtn.getAttribute('data-abandon-quest');
        if (id) this.onAbandonQuest?.(id);
        return;
      }

      const equipTitleBtn = target.closest('[data-equip-title]');
      if (equipTitleBtn) {
        const raw = equipTitleBtn.getAttribute('data-equip-title');
        this.onEquipCosmeticTitle?.(raw && raw !== 'none' ? raw : null);
        return;
      }

      const claimQuestBtn = target.closest('[data-claim-quest]');
      if (claimQuestBtn) {
        const id = claimQuestBtn.getAttribute('data-claim-quest');
        if (id) this.onClaimQuest?.(id);
        return;
      }

      const shopTabBtn = target.closest('[data-shop-tab]');
      if (shopTabBtn) {
        this.shopTab = (shopTabBtn.getAttribute('data-shop-tab') as 'buy' | 'sell') || 'buy';
        this.render();
        return;
      }

      const qtyDeltaBtn = target.closest('[data-shop-qty-delta]');
      if (qtyDeltaBtn) {
        const key = qtyDeltaBtn.getAttribute('data-shop-qty-id') || '';
        const delta = Number(qtyDeltaBtn.getAttribute('data-shop-qty-delta') || 0);
        const maxQty = Number(qtyDeltaBtn.getAttribute('data-shop-qty-max') || 99);
        if (key) {
          const cur = Math.max(1, Number(this.shopQuantities[key] || 1));
          this.shopQuantities[key] = Math.max(1, Math.min(maxQty, cur + delta));
          this.render();
        }
        return;
      }

      if (target.closest('[data-shop-repair]')) {
        this.onRepairEquipment?.();
        return;
      }

      const buyBtn = target.closest('[data-buy-item]');
      if (buyBtn) {
        const id = buyBtn.getAttribute('data-buy-item');
        const qty = Math.max(1, Number(buyBtn.getAttribute('data-buy-qty') || (id ? this.shopQuantities[`buy:${id}`] : 1) || 1));
        if (id) this.onBuyItem?.(id, qty);
        return;
      }

      const sellBtn = target.closest('[data-sell-item]');
      if (sellBtn) {
        const id = sellBtn.getAttribute('data-sell-item');
        const qty = Math.max(1, Number(sellBtn.getAttribute('data-sell-qty') || (id ? this.shopQuantities[`sell:${id}`] : 1) || 1));
        if (id) this.onSellItem?.(id, qty);
        return;
      }

      const depBtn = target.closest('[data-deposit-id]');
      if (depBtn) {
        const id = depBtn.getAttribute('data-deposit-id');
        if (id) this.onDepositItem?.(id);
        return;
      }

      const wdBtn = target.closest('[data-withdraw-id]');
      if (wdBtn) {
        const id = wdBtn.getAttribute('data-withdraw-id');
        if (id) this.onWithdrawItem?.(id);
        return;
      }

      const travelBtn = target.closest('[data-travel-region]');
      if (travelBtn) {
        const id = travelBtn.getAttribute('data-travel-region');
        const mode = (travelBtn.getAttribute('data-dungeon-mode') as 'solo' | 'party' | null) || undefined;
        if (id) {
          this.onTravelRegion?.(id, mode);
          this.close();
        }
        return;
      }

      const jobAttrBtn = target.closest('[data-job-attr]');
      if (jobAttrBtn) {
        const stat = jobAttrBtn.getAttribute('data-job-attr') as keyof PrimaryAttributesState | null;
        if (stat) this.onAllocateAttr?.(stat);
        return;
      }

      if (target.closest('[data-open-balo-stats]')) {
        this.close();
        this.onOpenBaloStats?.();
        return;
      }

      if (target.closest('[data-trigger-awakening]')) {
        this.close();
        this.onTriggerAwakening?.();
        return;
      }

      const replayVfxBtn = target.closest('[data-replay-job-vfx]');
      if (replayVfxBtn) {
        const jobId = replayVfxBtn.getAttribute('data-replay-job-vfx') || undefined;
        this.close();
        this.onReplayJobRitual?.(jobId);
        return;
      }

      const branchBtn = target.closest('[data-select-lv80-branch]');
      if (branchBtn) {
        const branchId = branchBtn.getAttribute('data-select-lv80-branch');
        if (branchId) {
          void Promise.resolve(this.onSelectLv80Branch?.(branchId)).then(() => {
            if (this.mode === 'job') this.render();
          });
        }
        return;
      }

      const craftTabBtn = target.closest('[data-craft-tab]');
      if (craftTabBtn) {
        this.craftingTab = (craftTabBtn.getAttribute('data-craft-tab') as any) || 'all';
        this.render();
        return;
      }

      const craftRecipeBtn = target.closest('[data-craft-recipe]');
      if (craftRecipeBtn) {
        if (this.busyCraftLock) return;
        const recipeId = craftRecipeBtn.getAttribute('data-craft-recipe');
        if (!recipeId) return;
        this.busyCraftLock = true;
        this.render();
        void Promise.resolve(this.onCraftRecipe?.(recipeId)).finally(() => {
          this.busyCraftLock = false;
          if (this.mode === 'crafting') this.render();
        });
        return;
      }

      const upgBtn = target.closest('[data-upgrade-slot]');
      if (upgBtn) {
        const slot = upgBtn.getAttribute('data-upgrade-slot') as EquipSlotKey | null;
        if (slot) this.onUpgradeEquipSlot?.(slot);
      }
    });
  }

  public sync(snapshot: HudSnapshot) {
    this.snapshot = snapshot;
    if (this.mode) this.render();
  }

  public open(mode: Exclude<WorldModalMode, null>, snapshot?: HudSnapshot | null) {
    if (snapshot) this.snapshot = snapshot;
    this.mode = mode;
    modalManager.open({
      id: WorldModals.MODAL_ID,
      backdrop: this.backdrop,
      onClose: () => {
        this.mode = null;
      },
    });
    this.render();
  }

  public toggle(mode: Exclude<WorldModalMode, null>, snapshot?: HudSnapshot | null) {
    if (this.mode === mode) this.close();
    else this.open(mode, snapshot);
  }

  public close() {
    this.mode = null;
    modalManager.close(WorldModals.MODAL_ID);
  }

  public getCurrentMode(): WorldModalMode {
    return this.mode;
  }

  private render() {
    const snap = this.snapshot;
    if (!snap || !this.mode) return;

    const titles: Record<Exclude<WorldModalMode, null>, { title: string; sub: string }> = {
      quest: { title: `NHẬT KÝ NHIỆM VỤ · ${snap.regionName.toUpperCase()}`, sub: 'Theo dõi tiến độ & nhận thưởng từ Dân Làng' },
      shop: { title: 'TIỆM TẠP HÓA & TRANG BỊ', sub: `Vàng hiện có: ${snap.stats.gold.toLocaleString()} · Giao dịch tại ${snap.regionName}` },
      storage: { title: 'KHO LƯU TRỮ LIÊN THÀNH', sub: 'Cất giữ & rút vật phẩm an toàn giữa Balo và Kho' },
      worldmap: { title: 'BẢN ĐỒ THẾ GIỚI ELYSIA (7 TUYẾN TÂN THỦ LV.1–15 · 3 THÀNH PHỐ · 10 BẢN ĐỒ · PHÓ BẢN)', sub: `Vị trí hiện tại: ${snap.regionName} · Cấp ${snap.level} · Chỉ khu vực đủ cấp mới mở` },
      job: {
        title: 'THÁNH ĐIỆN THỨC TỈNH · AUTOMATIC JOB AWAKENING (LV.15)',
        sub: `Nghề hiện tại: ${snap.classId.toUpperCase()} · Server tự động phân loại dựa trên 5 chỉ số cơ bản (Không chọn tay)`,
      },
      crafting: {
        title: 'LÒ RÈN CỔ ĐẠI · ĐỔI MẢNH SET, BOSS CORE & CƯỜNG HÓA',
        sub: `Vàng hiện có: ${snap.stats.gold.toLocaleString()} · Giao dịch an toàn (10 Mảnh Set = 1 Trang Bị Bộ)`,
      },
    };

    const meta = titles[this.mode];
    let bodyHtml = '';

    if (this.mode === 'quest') {
      const tb = snap.titleBonuses.cappedTotals;
      const limits = snap.titleBonuses.limitsApplied;
      const activeStatParts: string[] = [];
      if (tb.atk) activeStatParts.push(`+${tb.atk}/${limits.maxFlatAtk} ATK`);
      if (tb.matk) activeStatParts.push(`+${tb.matk}/${limits.maxFlatMatk} MATK`);
      if (tb.def) activeStatParts.push(`+${tb.def}/${limits.maxFlatDef} DEF`);
      if (tb.mdef) activeStatParts.push(`+${tb.mdef}/${limits.maxFlatMdef} MDEF`);
      if (tb.maxHp) activeStatParts.push(`+${tb.maxHp}/${limits.maxFlatMaxHp} HP`);
      if (tb.str) activeStatParts.push(`+${tb.str} STR`);
      if (tb.dex) activeStatParts.push(`+${tb.dex} DEX`);
      if (tb.agi) activeStatParts.push(`+${tb.agi} AGI`);
      if (tb.int) activeStatParts.push(`+${tb.int} INT`);
      if (tb.con) activeStatParts.push(`+${tb.con} CON`);
      if (tb.critRatePct) activeStatParts.push(`+${tb.critRatePct}%/${limits.maxFlatCritRatePct}% Crit`);
      if (tb.atkPct) activeStatParts.push(`+${tb.atkPct}%/${limits.maxPctAtk}% ATK%`);
      if (tb.matkPct) activeStatParts.push(`+${tb.matkPct}%/${limits.maxPctMatk}% MATK%`);
      if (tb.defPct) activeStatParts.push(`+${tb.defPct}% DEF%`);
      if (tb.hpPct) activeStatParts.push(`+${tb.hpPct}% HP%`);
      if (tb.skillDamagePct) activeStatParts.push(`+${tb.skillDamagePct}%/${limits.maxPctSkillDamage}% SkillDmg%`);
      if (tb.critDamagePct) activeStatParts.push(`+${tb.critDamagePct}%/${limits.maxPctCritDamage}% CritDmg%`);
      if (tb.damageReductionPct) activeStatParts.push(`+${tb.damageReductionPct}%/${limits.maxPctDamageReduction}% Giảm Sát Thương`);
      if (tb.expBonusPct) activeStatParts.push(`+${tb.expBonusPct}%/${limits.maxPctExpBonus}% EXP%`);
      if (tb.goldBonusPct) activeStatParts.push(`+${tb.goldBonusPct}%/${limits.maxPctGoldBonus}% Gold%`);

      // Strictly separate quests into the 4 required categories:
      // 1. Available Quests (non-hidden, unlocked, not active, not completed)
      const availableList = snap.worldQuests.filter((q) => !q.isHidden && q.state === 'available');
      // 2. Active Quests (currently accepted: active or ready_to_claim)
      const activeList = snap.worldQuests.filter((q) => q.state === 'active' || q.state === 'ready_to_claim');
      // 3. Completed Quests (completed & reward claimed — never appear in Available!)
      const completedList = snap.worldQuests.filter((q) => q.state === 'completed');
      // 4. Hidden Quests (ONLY discovered/unlocked hidden quests)
      const hiddenList = snap.discoveredHiddenQuests;

      const renderQuestCard = (wq: typeof snap.worldQuests[number]) => {
        const badgeLabel =
          wq.questType === 'HIDDEN_QUEST' || wq.isHidden
            ? 'Bí Ẩn'
            : wq.questType === 'SIDE_QUEST'
            ? 'Phụ Tuyến'
            : wq.chainId
            ? `Chuỗi · Chặng ${wq.stepNumber || 1}`
            : 'Chính Tuyến';

        let actionButtonsHtml = '';
        if (wq.state === 'available' || wq.state === 'unlocked_hidden') {
          const levelLocked = snap.level < wq.requiredLevel;
          actionButtonsHtml = `
            <button type="button" class="tk-action-btn" data-accept-world-quest="${wq.id}" ${levelLocked ? 'disabled' : ''}>
              ${levelLocked ? `Cần Lv.${wq.requiredLevel}` : '📜 Nhận Nhiệm Vụ'}
            </button>
          `;
        } else if (wq.state === 'active' || wq.state === 'ready_to_claim') {
          const isTracked = Boolean(wq.isTracked);
          const trackBtn = `
            <button type="button" class="tk-tab-btn ${isTracked ? 'active' : ''}" data-track-quest="${isTracked ? 'none' : wq.id}">
              ${isTracked ? '🎯 Đang Theo Dõi (Bỏ)' : '🎯 Theo Dõi'}
            </button>
          `;
          const abandonBtn =
            wq.abandonable !== false
              ? `<button type="button" class="tk-tab-btn" style="color:#fca5a5;" data-abandon-quest="${wq.id}">✕ Hủy NV</button>`
              : '';
          const claimBtn =
            wq.state === 'ready_to_claim'
              ? `<button type="button" class="tk-action-btn" style="background:linear-gradient(180deg,#16a34a,#14532d);" data-claim-quest="${wq.id}">✨ Báo Cáo & Nhận Thưởng</button>`
              : `<span class="tk-heading-pill">⏳ Đang thực hiện</span>`;
          actionButtonsHtml = `<div style="display:flex;flex-direction:column;gap:5px;align-items:flex-end;">${claimBtn}${trackBtn}${abandonBtn}</div>`;
        } else if (wq.state === 'completed') {
          const timeText = wq.completedAt ? new Date(wq.completedAt).toLocaleString('vi-VN') : 'Đã lưu máy chủ';
          actionButtonsHtml = `
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
              <span class="tk-heading-pill" style="background:#14532d;color:#bbf7d0;">✓ ĐÃ HOÀN THÀNH</span>
              <span style="font-size:10px;opacity:0.75;">${timeText}</span>
            </div>
          `;
        }

        const extraRewards = [
          ...(wq.rewards.uniqueEquipmentIds || []).map((uid) => `<span class="tk-rarity-tag rarity-mythic">Unique: ${uid}</span>`),
          ...(wq.rewards.unlockTitleIds || []).map((tid) => `<span class="tk-heading-pill">Danh hiệu: ${tid}</span>`),
        ].join(' ');

        const npcInfo = wq.endNpcName || wq.endNpcId || wq.startNpcName || wq.startNpcId || 'Trưởng Thôn Kiên';

        return `
          <div class="tk-quest-item ${wq.state === 'ready_to_claim' || wq.state === 'completed' ? 'done' : ''}" data-quest-card-id="${wq.id}" data-quest-state="${wq.state}">
            <div style="flex:1;">
              <div class="tk-inspector-name">
                ${wq.name}
                <span class="tk-heading-pill">${badgeLabel}</span>
                <span class="tk-heading-pill">Lv.${wq.requiredLevel}+</span>
                <span class="tk-heading-pill">NPC: ${npcInfo}</span>
              </div>
              <div class="tk-inspector-desc">${wq.description}</div>
              <div style="margin-top:5px;display:flex;flex-direction:column;gap:2px;font-size:12px;">
                ${wq.objectives.map((o) => `<span>• ${o.description}: <strong>${wq.state === 'completed' ? `${o.required}/${o.required}` : `${o.current}/${o.required}`}</strong></span>`).join('')}
              </div>
              <div class="tk-skill-nums" style="margin-top:6px;flex-wrap:wrap;gap:6px;">
                <span style="display:inline-flex;align-items:center;gap:4px;"><span class="tk-coin-dot gold"></span> ${wq.rewards.gold.toLocaleString()} Vàng</span>
                <span>★ ${wq.rewards.exp.toLocaleString()} EXP</span>
                ${extraRewards}
              </div>
            </div>
            <div>${actionButtonsHtml}</div>
          </div>
        `;
      };

      const tabNav = `
        <div class="tk-filter-tabs" style="margin-bottom:10px;display:flex;gap:6px;flex-wrap:wrap;">
          <button type="button" class="tk-tab-btn ${this.questTab === 'available' ? 'active' : ''}" data-quest-tab="available">1. NV Có Thể Nhận (${availableList.length})</button>
          <button type="button" class="tk-tab-btn ${this.questTab === 'active' ? 'active' : ''}" data-quest-tab="active">2. NV Đang Làm (${activeList.length})</button>
          <button type="button" class="tk-tab-btn ${this.questTab === 'completed' ? 'active' : ''}" data-quest-tab="completed">3. NV Hoàn Thành (${completedList.length})</button>
          <button type="button" class="tk-tab-btn ${this.questTab === 'hidden' ? 'active' : ''}" data-quest-tab="hidden">4. NV Bí Ẩn (${hiddenList.length})</button>
          <button type="button" class="tk-tab-btn ${this.questTab === 'titles' ? 'active' : ''}" data-quest-tab="titles">Danh Hiệu (${snap.titles.filter((t) => t.unlocked).length}/${snap.titles.length})</button>
        </div>
      `;

      if (this.questTab === 'available') {
        bodyHtml = `
          ${tabNav}
          <div class="tk-quest-list" id="quest-tab-available-list">
            ${
              availableList.length === 0
                ? `<div class="tk-inspector-desc" style="padding:14px;">Hiện không còn nhiệm vụ mới có thể nhận ở cấp độ hiện tại. Hãy hoàn thành các nhiệm vụ đang làm hoặc tăng cấp để mở khóa nhiệm vụ tiếp theo!</div>`
                : availableList.map(renderQuestCard).join('')
            }
          </div>
        `;
      } else if (this.questTab === 'active') {
        bodyHtml = `
          ${tabNav}
          <div class="tk-set-bonus-box" style="margin-bottom:10px;padding:8px 12px;">
            <div class="tk-inspector-desc">
              <strong>Quy tắc Theo Dõi HUD:</strong> Bảng theo dõi nhiệm vụ ngoài màn hình chính chỉ hiển thị <strong>duy nhất 1 nhiệm vụ</strong> đang được chọn Theo Dõi tại một thời điểm.
            </div>
          </div>
          <div class="tk-quest-list" id="quest-tab-active-list">
            ${
              activeList.length === 0
                ? `<div class="tk-inspector-desc" style="padding:14px;">Bạn hiện chưa có nhiệm vụ nào đang làm. Hãy chuyển sang tab <strong>1. NV Có Thể Nhận</strong> hoặc gặp NPC trong làng để nhận nhiệm vụ!</div>`
                : activeList.map(renderQuestCard).join('')
            }
          </div>
        `;
      } else if (this.questTab === 'completed') {
        bodyHtml = `
          ${tabNav}
          <div class="tk-quest-list" id="quest-tab-completed-list">
            ${
              completedList.length === 0
                ? `<div class="tk-inspector-desc" style="padding:14px;">Chưa có nhiệm vụ nào hoàn thành. Các nhiệm vụ sau khi báo cáo và nhận thưởng sẽ được lưu trữ vĩnh viễn tại đây.</div>`
                : completedList.map(renderQuestCard).join('')
            }
          </div>
        `;
      } else if (this.questTab === 'hidden') {
        bodyHtml = `
          ${tabNav}
          <div class="tk-quest-list" id="quest-tab-hidden-list">
            ${
              hiddenList.length === 0
                ? `<div class="tk-inspector-desc" style="padding:14px;">Chưa có Nhiệm Vụ Bí Ẩn nào được khai mở. Nhiệm vụ ẩn tuyệt đối không lộ diện trước khi bạn vô tình thỏa mãn cơ duyên bí mật trong thế giới!</div>`
                : hiddenList.map(renderQuestCard).join('')
            }
          </div>
        `;
      } else {
        const unlockedList = snap.titles.filter((t) => t.unlocked);
        bodyHtml = `
          ${tabNav}
          <div class="tk-set-bonus-box" style="margin-bottom:10px;">
            <div class="tk-attr-head">
              <span>CỘNG DỒN VĨNH VIỄN TỪ TOÀN BỘ DANH HIỆU ĐÃ MỞ (${unlockedList.length}/${snap.titles.length})</span>
              ${
                snap.equippedCosmeticTitleId
                  ? `<button type="button" class="tk-tab-btn" data-equip-title="none">Gỡ Huy Hiệu Cosmetic</button>`
                  : `<span class="tk-heading-pill">Chưa gắn Cosmetic</span>`
              }
            </div>
            <div class="tk-inspector-desc" style="margin-bottom:6px;">
              Mọi danh hiệu đã mở khóa đều <strong>cộng dồn vĩnh viễn không cần trang bị</strong> (có giới hạn trần cấu hình). Huy hiệu đang chọn chỉ mang tính <strong>hiển thị trang trí (Cosmetic)</strong> trên tên nhân vật.
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;">
              ${
                activeStatParts.length > 0
                  ? activeStatParts.map((p) => `<span class="tk-set-tier-pill">${p}</span>`).join('')
                  : '<span class="tk-heading-pill">Chưa có chỉ số danh hiệu — Hãy hoàn thành nhiệm vụ để mở khóa!</span>'
              }
            </div>
          </div>
          <div class="tk-quest-list">
            ${snap.titles
              .map((t) => {
                const statTags = Object.entries(t.statBonuses || {})
                  .filter(([, val]) => Number(val) > 0)
                  .map(([k, val]) => `<span class="tk-heading-pill">+${val} ${k}</span>`)
                  .join(' ');
                return `
                  <div class="tk-quest-item ${t.unlocked ? 'done' : ''}" style="${t.unlocked ? '' : 'opacity:0.7;'}">
                    <div style="flex:1;">
                      <div class="tk-inspector-name">
                        ${t.nameVi || t.name}
                        <span class="tk-rarity-tag rarity-${t.rarity}">${t.unlocked ? 'ĐÃ MỞ VĨNH VIỄN' : 'CHƯA MỞ'}</span>
                        ${t.equippedCosmetic ? '<span class="tk-heading-pill" style="background:#854d0e;color:#fef08a;">Đang hiển thị (Cosmetic)</span>' : ''}
                      </div>
                      <div class="tk-inspector-desc">${t.description}</div>
                      <div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px;">${statTags}</div>
                    </div>
                    <div>
                      ${
                        t.unlocked
                          ? t.equippedCosmetic
                            ? `<button type="button" class="tk-tab-btn" data-equip-title="none">Gỡ Hiển Thị</button>`
                            : `<button type="button" class="tk-action-btn" data-equip-title="${t.id}">Chọn Hiển Thị</button>`
                          : `<span class="tk-heading-pill">Khóa</span>`
                      }
                    </div>
                  </div>
                `;
              })
              .join('')}
          </div>
        `;
      }
    } else if (this.mode === 'shop') {
      const shopHeader = `
        <div class="tk-filter-tabs" style="margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">
          <div style="display:flex;gap:6px;">
            <button type="button" class="tk-tab-btn ${this.shopTab === 'buy' ? 'active' : ''}" data-shop-tab="buy">🛒 Mua Vật Phẩm (${snap.shopCatalog.length})</button>
            <button type="button" class="tk-tab-btn ${this.shopTab === 'sell' ? 'active' : ''}" data-shop-tab="sell">💰 Bán Vật Phẩm (${snap.inventory.length}/30)</button>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <span class="tk-heading-pill"><span class="tk-coin-dot gold"></span> Vàng: <strong>${snap.stats.gold.toLocaleString()}</strong></span>
            <button type="button" class="tk-tab-btn" data-shop-repair="1">🔧 Sửa Chữa Trang Bị</button>
          </div>
        </div>
      `;

      if (this.shopTab === 'buy') {
        bodyHtml = `
          ${shopHeader}
          <div class="tk-shop-grid">
            ${snap.shopCatalog
              .map((item) => {
                const qtyKey = `buy:${item.id}`;
                const qty = Math.max(1, Number(this.shopQuantities[qtyKey] || 1));
                const unitPrice = item.price || 50;
                const totalPrice = unitPrice * qty;
                return `
                  <div class="tk-shop-card" data-shop-buy-card="${item.id}">
                    <div class="tk-skill-card-art">${getItemIconSvg(item.iconKey)}</div>
                    <div class="tk-skill-card-meta">
                      <div class="tk-skill-title-line">
                        <strong>${item.name}</strong>
                        <span class="tk-heading-pill">${unitPrice} Vàng / cái</span>
                      </div>
                      <p>${item.desc}</p>
                      <div style="display:flex;align-items:center;gap:6px;margin-top:6px;">
                        <button type="button" class="tk-tab-btn" style="padding:2px 8px;" data-shop-qty-delta="-1" data-shop-qty-id="${qtyKey}" data-shop-qty-max="99">−</button>
                        <strong style="min-width:24px;text-align:center;" data-shop-qty-val="${item.id}">${qty}</strong>
                        <button type="button" class="tk-tab-btn" style="padding:2px 8px;" data-shop-qty-delta="1" data-shop-qty-id="${qtyKey}" data-shop-qty-max="99">+</button>
                        <span style="font-size:11px;opacity:0.85;">Tổng: <strong>${totalPrice.toLocaleString()} Vàng</strong></span>
                      </div>
                    </div>
                    <button type="button" class="tk-action-btn" data-buy-item="${item.id}" data-buy-qty="${qty}">Mua</button>
                  </div>
                `;
              })
              .join('')}
          </div>
        `;
      } else {
        const equippedIds = new Set(
          Object.values(snap.equipment || {})
            .filter(Boolean)
            .map((eq: any) => eq.id)
        );
        bodyHtml = `
          ${shopHeader}
          <div class="tk-shop-grid">
            ${
              snap.inventory.length === 0
                ? `<div class="tk-inspector-desc" style="padding:14px;">Hành trang Balo hiện đang trống, không có vật phẩm nào để bán.</div>`
                : snap.inventory
                    .map((item) => {
                      const qtyKey = `sell:${item.id}`;
                      const maxQty = Math.max(1, Number(item.qty || 1));
                      const qty = Math.max(1, Math.min(maxQty, Number(this.shopQuantities[qtyKey] || 1)));
                      const unitSell = Math.max(1, Math.floor(Number(item.price || 25) * 0.4));
                      const totalSell = unitSell * qty;
                      const isProtected = Boolean(item.isUnique || item.isCharacterBound || equippedIds.has(item.id));
                      return `
                        <div class="tk-shop-card" data-shop-sell-card="${item.id}">
                          <div class="tk-skill-card-art">${getItemIconSvg(item.iconKey)}</div>
                          <div class="tk-skill-card-meta">
                            <div class="tk-skill-title-line">
                              <strong>${item.name} (x${item.qty})</strong>
                              <span class="tk-heading-pill">+${unitSell} Vàng / cái</span>
                            </div>
                            <p>${item.desc}</p>
                            <div style="display:flex;align-items:center;gap:6px;margin-top:6px;">
                              <button type="button" class="tk-tab-btn" style="padding:2px 8px;" data-shop-qty-delta="-1" data-shop-qty-id="${qtyKey}" data-shop-qty-max="${maxQty}">−</button>
                              <strong style="min-width:24px;text-align:center;">${qty}</strong>
                              <button type="button" class="tk-tab-btn" style="padding:2px 8px;" data-shop-qty-delta="1" data-shop-qty-id="${qtyKey}" data-shop-qty-max="${maxQty}">+</button>
                              <span style="font-size:11px;color:#fde047;">Nhận: <strong>+${totalSell.toLocaleString()} Vàng</strong></span>
                            </div>
                          </div>
                          <button type="button" class="tk-action-btn" data-sell-item="${item.id}" data-sell-qty="${qty}">
                            ${isProtected ? 'Khóa / Đang Mặc' : 'Bán'}
                          </button>
                        </div>
                      `;
                    })
                    .join('')
            }
          </div>
        `;
      }
    } else if (this.mode === 'storage') {
      bodyHtml = `
        <div class="tk-balo-columns">
          <section class="tk-panel-inset">
            <div class="tk-section-heading"><span>KHO LÀNG (${snap.storage.length})</span><span class="tk-heading-pill">Nhấp để rút</span></div>
            <div class="tk-items-grid" style="margin-top:10px;">
              ${snap.storage
                .map(
                  (it) => `
                  <button type="button" class="tk-slot-cell rarity-${it.rarity}" data-withdraw-id="${it.id}" title="Rút ${it.name}">
                    <div class="tk-slot-art">${getItemIconSvg(it.iconKey)}</div>
                    ${it.qty > 1 ? `<span class="tk-item-qty">${it.qty}</span>` : ''}
                  </button>
                `
                )
                .join('')}
            </div>
          </section>
          <section class="tk-panel-inset">
            <div class="tk-section-heading"><span>BALO HIỆN TẠI (${snap.inventory.length}/24)</span><span class="tk-heading-pill">Nhấp để cất</span></div>
            <div class="tk-items-grid" style="margin-top:10px;">
              ${snap.inventory
                .map(
                  (it) => `
                  <button type="button" class="tk-slot-cell rarity-${it.rarity}" data-deposit-id="${it.id}" title="Cất ${it.name}">
                    <div class="tk-slot-art">${getItemIconSvg(it.iconKey)}</div>
                    ${it.qty > 1 ? `<span class="tk-item-qty">${it.qty}</span>` : ''}
                  </button>
                `
                )
                .join('')}
            </div>
          </section>
        </div>
      `;
    } else if (this.mode === 'worldmap') {
      const exitsHtml = snap.exits.length
        ? `<div class="tk-panel-inset" style="margin-bottom:12px;">
             <div class="tk-section-heading"><span>CỔNG KẾT NỐI TRỰC TIẾP TẠI KHU VỰC HIỆN TẠI</span><span class="tk-heading-pill">[E] hoặc Nhấp</span></div>
             <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;">
               ${snap.exits
                 .map((ex) => {
                   const ok = snap.level >= ex.requiredLevel;
                   return `<button type="button" class="tk-action-btn" data-travel-region="${ex.targetRegion}" ${ok ? '' : 'disabled'} title="${ex.name}">${ex.name} (Lv.${ex.requiredLevel}+)</button>`;
                 })
                 .join('')}
             </div>
           </div>`
        : '';

      const regions = snap.worldRegions.filter((r) => r.type !== 'DUNGEON_FLOOR');
      bodyHtml = `
        <div style="padding:15px;">
          ${exitsHtml}
          <div class="tk-section-heading" style="margin-bottom:10px;"><span>TOÀN BỘ THẾ GIỚI ELYSIA (TUYẾN TÂN THỦ LV.1–15 · 3 THÀNH PHỐ · 10 BẢN ĐỒ)</span><span class="tk-heading-pill">Lv.1–110</span></div>
          <div class="tk-shop-grid" style="padding:0;">
            ${regions
              .map((r) => {
                const isHere = r.id === snap.regionId;
                const unlocked = snap.level >= r.requiredLevel;
                const badge =
                  r.isSafeZone && r.combatEnabled === false
                    ? '🏛️ Thành Phố An Toàn'
                    : r.id === 'THON_KHOI_NGUYEN'
                    ? '🏡 Làng Khởi Đầu'
                    : r.type === 'BEGINNER_FIELD'
                    ? '🌱 Tuyến Tân Thủ Lv.1–15'
                    : '⚔️ Bản Đồ Luyện Cấp';
                const miniUrl = (r as any).minimapImage || `/assets/elysia/minimaps/${r.id}.png`;
                return `
                  <div class="tk-shop-card" style="justify-content:space-between;gap:10px;">
                    <img src="${miniUrl}" alt="${r.name}" style="width:72px;height:48px;object-fit:cover;border-radius:6px;border:1px solid #d4b886;flex-shrink:0;" />
                    <div class="tk-skill-card-meta">
                      <div class="tk-skill-title-line">
                        <strong>${r.nameVi && r.nameVi !== r.name ? `${r.nameVi} (${r.name})` : r.name}</strong>
                        <span class="tk-heading-pill">Lv.${r.recommendedLevelMin}–${r.recommendedLevelMax}</span>
                      </div>
                      <p>${badge} · Yêu cầu Lv.${r.requiredLevel}+ ${isHere ? '· Đang đứng tại đây' : ''}</p>
                    </div>
                    <button type="button" class="tk-action-btn" data-travel-region="${r.id}" ${isHere || !unlocked ? 'disabled' : ''}>
                      ${isHere ? 'Hiện Tại' : unlocked ? 'Đi Tới' : `Cần Lv.${r.requiredLevel}`}
                    </button>
                  </div>
                `;
              })
              .join('')}
          </div>
        </div>
      `;
    } else if (this.mode === 'job') {
      const d = snap.dungeon;
      const preJob = isPreJobClass(snap.classId) && !snap.jobAdvancementCompleted;
      const canAwaken = preJob && snap.level >= 15 && snap.beginnerQuestCompleted && snap.sanctumCompleted && snap.hasAwakeningCertificate;
      const canEnter = preJob && snap.level >= 15 && snap.beginnerQuestCompleted && !snap.sanctumCompleted && !snap.hasAwakeningCertificate;
      const maxScore = Math.max(1, ...snap.compatibilityBreakdown.map((s) => s.score));

      bodyHtml = `
        <div style="padding:15px;display:flex;flex-direction:column;gap:12px;">
          <div class="tk-panel-inset">
            <div class="tk-section-heading">
              <span>NHIỆM VỤ THỨC TỈNH TỰ ĐỘNG · GRAND SAGE OF AWAKENING</span>
              <span class="tk-heading-pill">${snap.jobAdvancementCompleted ? `ĐÃ THỨC TỈNH: ${snap.classId.toUpperCase()}` : 'ADVENTURER (PRE-JOB)'}</span>
            </div>
            <div class="tk-skill-nums" style="margin-top:8px;flex-wrap:wrap;">
              <span>1. Đạt Lv.15: <strong>${snap.level >= 15 ? '✓ Đạt' : `${snap.level}/15`}</strong></span>
              <span>2. Nhiệm vụ Tân Thủ: <strong>${snap.beginnerQuestCompleted ? '✓ Đã xong' : 'Chưa xong'}</strong></span>
              <span>3. Mảnh Tầng 1: <strong>${snap.sanctumCompleted ? '3/3 ✓' : `${d.collectedFragments.length}/3`}</strong></span>
              <span>4. Trụ Tầng 2: <strong>${snap.sanctumCompleted ? '4/4 ✓' : `${d.activatedPillars.length}/4`}</strong></span>
              <span>5. Hạ Guardian &amp; Chứng Chỉ: <strong>${snap.hasAwakeningCertificate || snap.jobAdvancementCompleted ? '✓ Đạt' : 'Chưa có'}</strong></span>
            </div>
            <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
              ${
                preJob
                  ? `<button type="button" class="tk-action-btn" data-travel-region="dungeon_sanctum_of_awakening" data-dungeon-mode="solo" ${canEnter ? '' : 'disabled'}>
                      ${canEnter ? 'Vào Thánh Điện Thức Tỉnh (Solo)' : snap.sanctumCompleted ? 'Đã Hoàn Thành Phó Bản' : snap.level < 15 ? 'Cần Đạt Lv.15 Trước' : 'Cần Xong NV Tân Thủ'}
                    </button>
                    <button type="button" class="tk-tab-btn active" data-travel-region="dungeon_sanctum_of_awakening" data-dungeon-mode="party" ${canEnter ? '' : 'disabled'}>
                      Vào Tổ Đội (Party)
                    </button>
                    <button type="button" class="tk-action-btn" data-trigger-awakening="now" ${canAwaken ? '' : 'disabled'}>
                      ${canAwaken ? '✦ Thức Tỉnh Nghề Nghiệp Tự Động Ngay!' : 'Chưa Đủ Chứng Chỉ Thức Tỉnh'}
                    </button>`
                  : `<button type="button" class="tk-action-btn" data-trigger-awakening="replay">
                      ✦ Xem Lại Nghi Lễ Thức Tỉnh (${snap.classId.toUpperCase()})
                    </button>
                    <button type="button" class="tk-tab-btn active" data-replay-job-vfx="${snap.advancedJobId || snap.classId}">
                      ✨ Kích Hoạt Vòng Tròn Nghi Lễ VFX
                    </button>`
              }
            </div>
          </div>

          <div class="tk-panel-inset">
            <div class="tk-section-heading">
              <span>5 CHỈ SỐ CƠ BẢN (BASE STATS) &amp; ĐỘ TƯƠNG THÍCH 8 NGHỀ</span>
              <span class="tk-heading-pill">Điểm có sẵn: ${snap.stats.potentialPoints}</span>
            </div>
            <div class="tk-attr-list" style="margin-top:8px;">
              ${(['str', 'dex', 'agi', 'int', 'con'] as const).map((k) => `
                <div class="tk-attr-row">
                  <span style="text-transform:uppercase;font-weight:700;">${k}</span>
                  <div style="display:flex;align-items:center;gap:6px;">
                    <strong>${snap.baseStats[k]}</strong>
                    <button type="button" class="tk-attr-plus" data-job-attr="${k}" ${snap.stats.potentialPoints <= 0 ? 'disabled' : ''}>+</button>
                  </div>
                </div>
              `).join('')}
            </div>

            <div class="tk-inspector-desc" style="margin-top:8px;">
              Hệ thống máy chủ sẽ tự động phân tích điểm thuần Base Stats (không tính trang bị) theo công thức <strong>Primary × 2 + Secondary</strong> để ấn định 1 trong 8 nghề chính thức. Không cho phép tự chọn tay.
            </div>

            <div class="tk-compat-list" style="margin-top:8px;">
              ${snap.compatibilityBreakdown
                .map((s, idx) => {
                  const pct = Math.round((s.score / maxScore) * 100);
                  return `
                  <div class="tk-compat-row ${idx === 0 ? 'winner' : ''}">
                    <div class="tk-compat-meta">
                      <span>${idx === 0 ? '✦ Tương thích nhất: ' : ''}${s.className} <small>(${s.primaryAttribute.toUpperCase()}×2 + ${s.secondaryAttribute.toUpperCase()})</small></span>
                      <strong>${s.score} điểm</strong>
                    </div>
                    <div class="tk-compat-track"><div class="tk-compat-fill" style="width:${pct}%"></div></div>
                  </div>
                `;
                })
                .join('')}
            </div>
          </div>

          <div class="tk-panel-inset">
            <div class="tk-section-heading">
              <span>CHUYỂN CHỨC CẤP 80 · 2 NHÁNH CHUYÊN BIỆT VĨNH VIỄN</span>
              <span class="tk-heading-pill">${snap.advancedJobName ? `✓ ĐÃ KHÓA: ${snap.advancedJobName}` : snap.level >= 80 && !preJob ? 'Sẵn Sàng Chọn (Lv.80+)' : 'Mở Khóa Tại Lv.80'}</span>
            </div>
            <p class="tk-inspector-desc" style="margin-top:6px;">
              Khi đạt <strong>Lv.80</strong> và đã hoàn thành Thức Tỉnh Lv.15, bạn được chọn <strong>vĩnh viễn 1 trong 2 Nhánh Tiến Hóa</strong> thuộc nghề của mình. Sau khi xác nhận không thể đổi nhánh khác.
            </p>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px;margin-top:10px;">
              ${((snap as any).availableAdvancedBranches || []).length
                ? ((snap as any).availableAdvancedBranches || []).map((b: any) => {
                    const isChosen = snap.advancedJobId === b.id;
                    const isLockedOther = Boolean(snap.advancedJobId && snap.advancedJobId !== b.id);
                    const canPick = !preJob && snap.jobAdvancementCompleted && snap.level >= 80 && !snap.advancedJobId;
                    const cColor = b.vfxProfile?.primaryColor || '#d97706';
                    return `
                      <div style="padding:10px;border-radius:10px;border:2px solid ${isChosen ? cColor : isLockedOther ? '#cbd5e1' : '#e2d2b5'};background:${isChosen ? 'rgba(254,243,199,0.75)' : 'rgba(255,252,244,0.85)'};opacity:${isLockedOther ? '0.62' : '1'};">
                        <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
                          <strong style="color:#451a03;font-size:14px;">${b.nameVi || b.name}</strong>
                          <span class="tk-heading-pill" style="border-color:${cColor};color:#1e293b;">${b.role}</span>
                        </div>
                        <p style="font-size:11.5px;color:#57534e;margin:6px 0;">${b.descriptionVi || b.description}</p>
                        <div style="display:flex;gap:6px;flex-wrap:wrap;font-size:11px;color:#78350f;margin-bottom:8px;">
                          <span>⚔ +${b.combatModifiers?.pveDamageBonusPct || 0}% PvE</span>
                          <span>👑 +${b.combatModifiers?.bossDamageBonusPct || 0}% Boss</span>
                          <span>💥 +${b.combatModifiers?.critRateBonusPct || 0}% Crit</span>
                        </div>
                        <button type="button" class="${isChosen ? 'tk-tab-btn active' : 'tk-action-btn'}" data-select-lv80-branch="${b.id}" ${canPick ? '' : 'disabled'} style="width:100%;">
                          ${isChosen ? '✓ Nhánh Vĩnh Viễn Hiện Tại' : isLockedOther ? '🔒 Đã Chọn Nhánh Khác' : snap.level < 80 ? `Yêu Cầu Lv.80 (${snap.level}/80)` : `✦ Chọn Vĩnh Viễn: ${b.name}`}
                        </button>
                      </div>
                    `;
                  }).join('')
                : `<div class="tk-inspector-desc">Hoàn thành Thức Tỉnh Nghề Lv.15 để xem 2 Nhánh Chuyên Biệt Lv.80 của nghề bạn.</div>`
              }
            </div>
          </div>
        </div>
      `;
    } else if (this.mode === 'crafting') {
      const extSnap = snap as HudSnapshot & {
        craftingRecipes?: CraftingRecipeView[];
      };
      const allRecipes = extSnap.craftingRecipes || [];
      const countOwned = (itemId: string) =>
        snap.inventory.reduce((sum, it) => (it.id === itemId ? sum + it.qty : sum), 0);

      const fragments = snap.inventory.filter(
        (it) => it.id.startsWith('FRAG_') || it.id.startsWith('MAT_') || it.id.startsWith('ITEM_UPGRADE_')
      );
      const filteredRecipes =
        this.craftingTab === 'all'
          ? allRecipes
          : allRecipes.filter((r) => r.category === this.craftingTab);

      const equipEntries = (
        [
          ['weapon', 'Vũ Khí'],
          ['head', 'Mũ / Nón'],
          ['armor', 'Áo Giáp'],
          ['gloves', 'Găng Tay'],
          ['boots', 'Ủng / Giày'],
          ['shoulder', 'Cầu Vai'],
          ['necklace', 'Dây Chuyền'],
          ['ring1', 'Nhẫn 1'],
          ['ring2', 'Nhẫn 2'],
          ['cloak', 'Áo Choàng'],
        ] as Array<[EquipSlotKey, string]>
      ).filter(([slot]) => Boolean(snap.equipment[slot]));

      bodyHtml = `
        <div style="padding:15px;display:flex;flex-direction:column;gap:12px;">
          <div class="tk-crafting-banner">
            <img src="/assets/elysia/ui/icon-crafting-anvil.png" alt="Lò Rèn Chế Tác" class="tk-crafting-anvil-img" />
            <div style="flex:1;min-width:0;">
              <div class="tk-section-heading" style="border:none;padding:0 0 4px;">
                <span>NGUYÊN LIỆU &amp; MẢNH SET HIỆN CÓ TRONG BALO</span>
                <span class="tk-heading-pill">Lv.${snap.level} · ${snap.stats.gold.toLocaleString()} Vàng</span>
              </div>
              <div class="tk-fragment-chips">
                ${
                  fragments.length
                    ? fragments
                        .map(
                          (f) => `<span class="tk-heading-pill rarity-text-${f.rarity}">${f.name}: <strong>x${f.qty}</strong></span>`
                        )
                        .join('')
                    : `<span class="tk-inspector-desc">Chưa có Mảnh Set / Boss Core nào. Hãy săn Elite, Mini Boss hoặc Field Boss!</span>`
                }
              </div>
            </div>
          </div>

          <div class="tk-filter-tabs">
            <button type="button" class="tk-tab-btn ${this.craftingTab === 'all' ? 'active' : ''}" data-craft-tab="all">Tất Cả (${allRecipes.length})</button>
            <button type="button" class="tk-tab-btn ${this.craftingTab === 'fragment_exchange' ? 'active' : ''}" data-craft-tab="fragment_exchange">Đổi Mảnh Set (10:1)</button>
            <button type="button" class="tk-tab-btn ${this.craftingTab === 'boss_craft' ? 'active' : ''}" data-craft-tab="boss_craft">Chế Tạo Boss Core</button>
            <button type="button" class="tk-tab-btn ${this.craftingTab === 'upgrade_stone' ? 'active' : ''}" data-craft-tab="upgrade_stone">Đá Cường Hóa</button>
            <button type="button" class="tk-tab-btn ${this.craftingTab === 'equip_upgrade' ? 'active' : ''}" data-craft-tab="equip_upgrade">Cường Hóa Trang Bị (${equipEntries.length})</button>
          </div>

          ${
            this.craftingTab === 'equip_upgrade'
              ? `<div class="tk-shop-grid" style="padding:0;">
                  ${
                    equipEntries.length
                      ? equipEntries
                          .map(([slot, label]) => {
                            const g = snap.equipment[slot]!;
                            const upg = Number(g.upgradeLevel || 0);
                            const maxUpg = Number(g.maxUpgradeLevel || 10);
                            const stoneId = upg >= 5 ? 'ITEM_UPGRADE_STONE_MYSTIC' : 'ITEM_UPGRADE_STONE_BASIC';
                            const stoneNeed = upg >= 5 ? 2 : 1;
                            const goldCost = 250 * (upg + 1);
                            const canUp = upg < maxUpg && snap.stats.gold >= goldCost && countOwned(stoneId) >= stoneNeed;
                            return `
                              <div class="tk-shop-card rarity-${g.rarity}">
                                <div class="tk-slot-cell rarity-${g.rarity}" style="width:48px;height:48px;flex-shrink:0;">
                                  <div class="tk-slot-art">${getItemIconSvg(g.iconKey)}</div>
                                </div>
                                <div class="tk-skill-card-meta">
                                  <div class="tk-skill-title-line">
                                    <strong class="rarity-text-${g.rarity}">${g.name} (+${upg}/${maxUpg})</strong>
                                    <span class="tk-heading-pill">${label}</span>
                                  </div>
                                  <p>Cần ${goldCost}G + ${stoneNeed}x ${upg >= 5 ? 'Đá Cường Hóa Huyền Bí' : 'Đá Cường Hóa Sơ Cấp'}</p>
                                </div>
                                <button type="button" class="tk-action-btn" data-upgrade-slot="${slot}" ${canUp ? '' : 'disabled'}>Cường Hóa +1</button>
                              </div>
                            `;
                          })
                          .join('')
                      : `<div class="tk-inspector-desc">Chưa mặc trang bị nào.</div>`
                  }
                </div>`
              : `<div class="tk-shop-grid" style="padding:0;max-height:360px;overflow-y:auto;">
                  ${filteredRecipes
                    .slice(0, 60)
                    .map((r) => {
                      const hasGold = snap.stats.gold >= r.goldCost;
                      const hasLv = snap.level >= r.requiredLevel;
                      const hasMats = r.materials.every((m) => countOwned(m.itemId) >= m.quantity);
                      const canCraft = hasGold && hasLv && hasMats && !this.busyCraftLock;
                      const matsLine = r.materials
                        .map((m) => `${m.name || m.itemId}: ${countOwned(m.itemId)}/${m.quantity}`)
                        .join(' · ');
                      return `
                        <div class="tk-shop-card rarity-${r.outputRarity || 'rare'}">
                          <div class="tk-skill-card-meta">
                            <div class="tk-skill-title-line">
                              <strong class="rarity-text-${r.outputRarity || 'rare'}">${r.name}</strong>
                              <span class="tk-heading-pill">${r.goldCost.toLocaleString()}G</span>
                            </div>
                            <p>${matsLine} · Lv.${r.requiredLevel}+</p>
                          </div>
                          <button type="button" class="tk-action-btn" data-craft-recipe="${r.id}" ${canCraft ? '' : 'disabled'}>Chế Tạo</button>
                        </div>
                      `;
                    })
                    .join('')}
                </div>`
          }
        </div>
      `;
    }

    const prevScrollEl = this.backdrop.querySelector('.tk-modal-scroll-body') as HTMLElement | null;
    const savedScroll = prevScrollEl ? prevScrollEl.scrollTop : 0;

    this.backdrop.innerHTML = `
      <div class="tk-window" role="dialog" aria-modal="true" aria-label="${meta.title}">
        <div class="tk-window-header">
          <div class="tk-header-title-group">
            <span class="tk-header-crest">${
              this.mode === 'quest'
                ? '📜'
                : this.mode === 'shop'
                ? '🏪'
                : this.mode === 'worldmap'
                ? '🗺️'
                : this.mode === 'job'
                ? '👑'
                : this.mode === 'crafting'
                ? '<img src="/assets/elysia/ui/icon-crafting-anvil.png" alt="Crafting" style="width:28px;height:28px;object-fit:contain;" />'
                : '📦'
            }</span>
            <div>
              <h2>${meta.title}</h2>
              <p>${meta.sub}</p>
            </div>
          </div>
          <button type="button" class="tk-btn-close" id="btn-close-world-modal" data-close-modal="world-panels" title="Đóng [ESC]">✕</button>
        </div>
        <div class="tk-modal-scroll-body" style="padding:0;">
          ${bodyHtml}
        </div>
        <div class="tk-modal-footer">
          <button type="button" class="tk-tab-btn" data-close-modal="world-panels">Đóng [ESC]</button>
        </div>
      </div>
    `;

    const nextScrollEl = this.backdrop.querySelector('.tk-modal-scroll-body') as HTMLElement | null;
    if (nextScrollEl && savedScroll > 0) {
      nextScrollEl.scrollTop = savedScroll;
    }
  }
}
