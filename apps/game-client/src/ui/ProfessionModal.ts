import {
  PROFESSION_DEFINITIONS,
  PROFESSION_GATHERING_NODES,
  PROFESSION_QUALITY_RULES,
  PROFESSION_RECIPES,
  PROFESSION_SYSTEM_CONFIG,
  PROFESSION_TOOLS,
  computeCraftProbabilities,
  getProfessionRankForLevel,
} from '@elysia/game-data-schema';
import type { ProfessionId } from '@elysia/game-types';
import {
  buyMarketListingApi,
  buyProfessionToolApi,
  cancelMarketListingApi,
  completeGatheringApi,
  completeProfessionQuestApi,
  craftProfessionRecipeApi,
  createMarketListingApi,
  equipProfessionToolApi,
  fetchCharacterProfessionsApi,
  fetchMarketListingsApi,
  harvestCropApi,
  learnProfessionApi,
  plantCropApi,
  repairProfessionToolApi,
  startGatheringApi,
  waterCropApi,
} from '../services/apiClient';
import { getItemIconSvg } from './FantasyArtIcons';
import { modalManager } from './ModalManager';

type ProfSubTab = 'gather' | 'mining' | 'fishing' | 'farm' | 'craft' | 'market' | 'quests' | 'history';

const QUEST_KIND_BADGES: Record<string, { label: string; bg: string; color: string }> = {
  intro: { label: 'Nhập Môn', bg: '#e0f2fe', color: '#0369a1' },
  daily: { label: 'Hằng Ngày', bg: '#fef3c7', color: '#92400e' },
  mastery_advancement: { label: 'Thăng Cấp', bg: '#dcfce7', color: '#166534' },
  special: { label: 'Đặc Biệt', bg: '#f3e8ff', color: '#6b21a8' },
  hidden_legendary: { label: 'Ẩn Truyền Thuyết', bg: '#ffe4e6', color: '#9f1239' },
};

/**
 * Interactive Life Skills & 8-Profession Workbench Modal:
 * - Supports 8 independent professions, Lv.1-70 Mastery & 7 Ranks progression
 * - Tool equipping, switching & durability repair
 * - Dedicated interfaces for Gathering (Herbs/Timber), Mining, Fishing, Farming, Crafting & Live Marketplace
 * - Displays exact crafting success%, extra yield%, and 5-tier quality probabilities + Production History
 */
export class ProfessionModal {
  public static readonly MODAL_ID = 'professions';
  private backdrop: HTMLElement;
  private isOpenFlag = false;
  private activeProf: ProfessionId = 'herbalist';
  private subTab: ProfSubTab = 'gather';
  private characterId: string | null = null;
  private overview: any = null;
  private marketListings: any[] = [];
  private marketFilterQuery = '';
  private busy = false;
  private statusText = '';
  private activeGatherTimer: { nodeName: string; completeAt: number; isFishing?: boolean } | null = null;
  private timerHandle: number | null = null;

  public onCharacterMutated?: () => void;
  public onToast?: (msg: string, variant?: 'info' | 'success' | 'error') => void;

  constructor() {
    this.backdrop = document.createElement('div');
    this.backdrop.id = 'modal-professions';
    this.backdrop.className = 'tk-modal-backdrop hidden';
    document.body.append(this.backdrop);

    modalManager.registerBackdrop(this.backdrop, () => ({
      id: ProfessionModal.MODAL_ID,
      onRequestClose: () => this.close(),
    }));
  }

  public isOpen(): boolean {
    return this.isOpenFlag;
  }

  private defaultSubTabForProfession(profId: ProfessionId): ProfSubTab {
    if (profId === 'miner') return 'mining';
    if (profId === 'fisherman') return 'fishing';
    if (profId === 'farmer') return 'farm';
    if (profId === 'blacksmith' || profId === 'alchemist_jeweler' || profId === 'chef') return 'craft';
    return 'gather';
  }

  public async open(characterId: string | null, focusProf?: ProfessionId) {
    if (!characterId) {
      this.onToast?.('Cần kết nối nhân vật với máy chủ để sử dụng Nghề Nghiệp.', 'error');
      return;
    }
    this.characterId = characterId;
    if (focusProf) {
      this.activeProf = focusProf;
      this.subTab = this.defaultSubTabForProfession(focusProf);
    }
    this.isOpenFlag = true;
    this.render();
    modalManager.open({
      id: ProfessionModal.MODAL_ID,
      backdrop: this.backdrop,
      onClose: () => {
        this.isOpenFlag = false;
        this.stopTicker();
      },
    });
    await this.refresh();
  }

  public close() {
    this.isOpenFlag = false;
    this.stopTicker();
    this.backdrop.classList.add('hidden');
    modalManager.close(ProfessionModal.MODAL_ID);
  }

  private startTicker() {
    this.stopTicker();
    this.timerHandle = window.setInterval(() => {
      if (!this.isOpenFlag) {
        this.stopTicker();
        return;
      }
      if (this.subTab === 'farm' || this.activeGatherTimer) {
        this.render();
      }
    }, 1000);
  }

  private stopTicker() {
    if (this.timerHandle) {
      window.clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
  }

  public async refresh() {
    if (!this.characterId) return;
    const [res, mktRes] = await Promise.all([
      fetchCharacterProfessionsApi(this.characterId),
      this.subTab === 'market'
        ? fetchMarketListingsApi(undefined, this.marketFilterQuery || undefined).catch(() => null)
        : Promise.resolve(null),
    ]);
    if (mktRes?.success && Array.isArray(mktRes.data)) {
      this.marketListings = mktRes.data;
    }
    if (res.success && res.data) {
      this.overview = res.data;
      this.render();
      if (this.overview?.farmPlots?.length > 0) this.startTicker();
    } else if (res.error) {
      this.statusText = res.error;
      this.render();
    }
  }

  private async refreshMarket() {
    const res = await fetchMarketListingsApi(undefined, this.marketFilterQuery || undefined);
    if (res.success && Array.isArray(res.data)) {
      this.marketListings = res.data;
    }
    this.render();
  }

  private esc(s: unknown): string {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private renderNodesList(nodes: any[], emptyText: string, actionLabel: string) {
    const html = nodes.length
      ? nodes
          .map((n: any) => {
            const cdSec = n.cooldownRemainingMs ? Math.ceil(n.cooldownRemainingMs / 1000) : 0;
            return `
              <div class="tk-party-member-card">
                <div>
                  <div style="font-weight:700;color:#2f4735;font-size:12px;">
                    ${this.esc(n.nameVi)}
                    <span class="tk-heading-pill">Mastery Lv.${n.requiredMastery}+ · Map: ${this.esc(n.mapId)} (${n.tx},${n.ty})</span>
                    <span class="tk-heading-pill">Công cụ Bậc ${n.requiredToolTier}</span>
                  </div>
                  <div style="font-size:10px;color:#68604d;margin-top:2px;">
                    Sản lượng: ${n.quantityMin}–${n.quantityMax} <b>${this.esc(n.primaryMaterialId)}</b>${n.rareDropMaterialId ? ` · Hiếm: ${this.esc(n.rareDropMaterialId)} (${n.rareDropChancePct || 10}%)` : ''} · EXP +${n.expReward} · Hồi sinh ${n.respawnSeconds}s
                  </div>
                </div>
                <div>
                  ${
                    cdSec > 0
                      ? `<span class="tk-status-badge open">Hồi phục ${cdSec}s</span>`
                      : `<button type="button" class="tk-action-btn" data-gather-node="${this.esc(n.id)}" ${this.busy ? 'disabled' : ''}>${actionLabel}</button>`
                  }
                </div>
              </div>
            `;
          })
          .join('')
      : `<p style="font-size:11px;color:#68604d;">${emptyText}</p>`;

    return `
      ${
        this.activeGatherTimer
          ? `<div class="tk-inspector-bar" style="background:#dcfce7;border-color:#22c55e;margin-bottom:8px;">
              ${this.activeGatherTimer.isFishing ? '🎣 Đang thả câu' : '⚒ Đang thu thập'} <strong>${this.esc(this.activeGatherTimer.nodeName)}</strong>...
              (${Math.max(1, Math.ceil((this.activeGatherTimer.completeAt - Date.now()) / 1000))}s)
            </div>`
          : ''
      }
      <div style="display:flex;flex-direction:column;gap:8px;">${html}</div>
    `;
  }

  private render() {
    if (!this.isOpenFlag) return;
    const ov = this.overview;
    const learnedMap = ov?.professions || {};
    const learnedCount = ov?.learnedCount ?? 0;
    const maxSlots = ov?.unlockedProfessionSlots ?? 3;
    const profDef = PROFESSION_DEFINITIONS.find((p) => p.id === this.activeProf)!;
    const profState = learnedMap[this.activeProf];
    const rank = profState ? getProfessionRankForLevel(profState.level) : null;
    const tools = PROFESSION_TOOLS.filter((t) => t.professionId === this.activeProf);
    const equippedTool = tools.find((t) => t.id === profState?.equippedToolId);
    const profRecipes = PROFESSION_RECIPES.filter((r) => r.professionId === this.activeProf);
    const allNodes = ov?.nodes || PROFESSION_GATHERING_NODES;
    const herbOrWoodNodes = allNodes.filter((n: any) => n.nodeType === 'herb' || n.nodeType === 'tree');
    const miningNodes = allNodes.filter((n: any) => n.nodeType === 'ore');
    const fishingNodes = allNodes.filter((n: any) => n.nodeType === 'fishing_spot');
    const profQuests = (ov?.quests || []).filter((q: any) => q.professionId === this.activeProf);
    const ownedMaterials: any[] = ov?.ownedMaterials || [];
    const ownedTools: any[] = ov?.ownedTools || [];
    const dailyStats = ov?.dailyStats || { gatherActions: 0, craftActions: 0 };

    const profCardsHtml = PROFESSION_DEFINITIONS.map((p) => {
      const st = learnedMap[p.id];
      const active = p.id === this.activeProf;
      return `
        <button type="button" class="tk-tab-btn ${active ? 'active' : ''}" data-prof="${p.id}" style="display:flex;align-items:center;gap:6px;">
          <span style="width:16px;height:16px;display:inline-flex;align-items:center;justify-content:center;">${getItemIconSvg(p.iconKey)}</span>
          <span>${this.esc(p.nameVi)}</span>
          <span style="font-size:9px;opacity:.9;">${st ? `Lv.${st.level}` : 'Chưa học'}</span>
        </button>
      `;
    }).join('');

    let mainBody = '';
    if (!profState) {
      mainBody = `
        <div class="tk-set-bonus-box" style="text-align:center;padding:18px;">
          <div style="display:inline-flex;width:44px;height:44px;align-items:center;justify-content:center;border-radius:10px;background:#fef3c7;border:1px solid #d97706;margin-bottom:8px;">
            ${getItemIconSvg(profDef.iconKey)}
          </div>
          <h3 style="margin:0 0 6px;color:#385744;">${this.esc(profDef.nameVi)} (${this.esc(profDef.name)})</h3>
          <p style="font-size:12px;color:#5d573f;margin:0 0 12px;">${this.esc(profDef.description)}</p>
          <p style="font-size:11px;color:#78350f;margin:0 0 12px;">Ô nghề đã dùng: <strong>${learnedCount}/${maxSlots}</strong> · Phí nhập môn: <strong>${profDef.unlockCostGold.toLocaleString()} G</strong></p>
          <button type="button" class="tk-action-btn" id="btn-learn-prof" ${this.busy ? 'disabled' : ''}>Học Nghề ${this.esc(profDef.nameVi)} (${profDef.unlockCostGold}G)</button>
        </div>
      `;
    } else {
      const expPct = profState.nextLevelExp > 0 ? Math.min(100, Math.round((profState.exp / profState.nextLevelExp) * 100)) : 100;
      const durPct = Math.round((profState.toolDurability / Math.max(1, profState.maxToolDurability)) * 100);

      let tabContent = '';
      if (this.subTab === 'gather') {
        const myNodes = herbOrWoodNodes.filter((n: any) => n.professionId === this.activeProf);
        tabContent = this.renderNodesList(
          myNodes.length ? myNodes : herbOrWoodNodes,
          'Chưa có điểm thu thập thảo mộc/gỗ khả dụng.',
          '🌿 Thu Thập'
        );
      } else if (this.subTab === 'mining') {
        tabContent = this.renderNodesList(
          miningNodes,
          'Chưa có mạch khoáng sản khả dụng.',
          '⛏ Khai Mỏ'
        );
      } else if (this.subTab === 'fishing') {
        tabContent = this.renderNodesList(
          fishingNodes,
          'Chưa có điểm câu cá khả dụng.',
          '🎣 Thả Câu'
        );
      } else if (this.subTab === 'farm') {
        const plots = ov?.farmPlots || [];
        const plotsHtml = plots.length
          ? plots
              .map((pl: any) => {
                const remSec = Math.max(0, Math.ceil((pl.readyAt - Date.now()) / 1000));
                const ready = remSec === 0 || pl.status === 'ready';
                return `
                  <div class="tk-party-member-card">
                    <div>
                      <div style="font-weight:700;color:#2f4735;font-size:12px;">
                        🌱 ${this.esc(pl.cropName)} ${pl.watered ? '<span class="tk-status-badge locked">Đã Tưới (+25%)</span>' : ''}
                      </div>
                      <div style="font-size:10px;color:#68604d;">${ready ? 'Đã chín! Sẵn sàng thu hoạch' : `Còn ${remSec}s để thu hoạch`}</div>
                    </div>
                    <div style="display:flex;gap:6px;">
                      ${!pl.watered ? `<button type="button" class="tk-tab-btn" data-water-plot="${this.esc(pl.plotId)}">Tưới Nước</button>` : ''}
                      <button type="button" class="tk-action-btn" data-harvest-plot="${this.esc(pl.plotId)}" ${!ready ? 'disabled' : ''}>Thu Hoạch</button>
                    </div>
                  </div>
                `;
              })
              .join('')
          : '<p style="font-size:11px;color:#68604d;">Chưa có luống canh tác nào. Hãy gieo hạt bên dưới!</p>';
        tabContent = `
          <div class="tk-inspector-bar">
            <span>Gieo hạt giống (${plots.length}/4 luống):</span>
            <div style="display:flex;gap:6px;">
              <button type="button" class="tk-action-btn" data-plant-seed="MAT_PROF_SEED_WHEAT">Trồng Lúa Mì (12s)</button>
              <button type="button" class="tk-action-btn" data-plant-seed="MAT_PROF_SEED_APPLE">Trồng Táo Vàng (Lv.15)</button>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px;">${plotsHtml}</div>
        `;
      } else if (this.subTab === 'craft') {
        const matsTray = ownedMaterials.length
          ? `<div style="padding:8px 10px;border-radius:8px;border:1px solid #d4c59e;background:rgba(255,250,235,0.8);margin-bottom:8px;font-size:11px;">
              <strong style="color:#4a3b18;">📦 Nguyên liệu hiện có trong Balo:</strong>
              <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;">
                ${ownedMaterials
                  .map(
                    (m) => `<span class="tk-heading-pill" title="${this.esc(m.itemId)}">${this.esc(m.name || m.itemId)} x<b>${m.quantity}</b> (${this.esc(m.quality)})</span>`
                  )
                  .join('')}
              </div>
            </div>`
          : `<div style="padding:7px 10px;border-radius:8px;border:1px dashed #c8b891;font-size:11px;color:#68604d;margin-bottom:8px;">
              Chưa có nguyên liệu nghề trong Balo. Hãy thu thập từ Mỏ/Rừng/Suối hoặc mua tại Chợ Nghề!
            </div>`;

        const recipesHtml = profRecipes
          .map((r) => {
            const unlocked = !r.isHidden || (profState.learnedRecipeIds || []).includes(r.id);
            const canMastery = profState.level >= r.requiredMastery;
            const probs = computeCraftProbabilities({
              masteryLevel: profState.level,
              recipeRequiredMastery: r.requiredMastery,
              baseSuccessRatePct: r.baseSuccessRatePct,
              baseExtraYieldChancePct: r.baseExtraYieldChancePct,
              toolQualityBonusPct: Number(equippedTool?.qualityBonusPct || 0),
              toolExtraYieldBonusPct: Number(equippedTool?.extraYieldBonusPct || 0),
            });
            const matsText = r.materials
              .map((m) => {
                const owned = ownedMaterials
                  .filter((om) => om.itemId === m.itemId)
                  .reduce((sum, om) => sum + Number(om.quantity || 0), 0);
                return `${m.itemId} (${owned}/${m.quantity})`;
              })
              .join(' + ');
            const qp = probs.qualityProbabilities;

            return `
              <div class="tk-party-member-card" style="opacity:${unlocked ? '1' : '0.58'};align-items:flex-start;">
                <div style="flex:1;">
                  <div style="font-weight:700;color:#2f4735;font-size:12px;">
                    ${r.isLegendary ? '🌟 ' : ''}${this.esc(r.nameVi)}
                    <span class="tk-heading-pill">Mastery Lv.${r.requiredMastery}+</span>
                    <span class="tk-heading-pill">Thành công ${probs.successProbabilityPct}% · Sản lượng thêm ${probs.extraYieldProbabilityPct}%</span>
                  </div>
                  <div style="font-size:10px;color:#68604d;margin-top:2px;">
                    Nguyên liệu: ${this.esc(matsText)} · Phí ${r.craftCostGold}G → <strong>${this.esc(r.outputName)} x${r.outputQuantity}</strong>
                  </div>
                  <div style="font-size:10px;margin-top:4px;display:flex;gap:5px;flex-wrap:wrap;">
                    <span style="color:#6b7280;">Thường ${qp.common}%</span>
                    <span style="color:#16a34a;">Tốt ${qp.uncommon}%</span>
                    <span style="color:#2563eb;">Hiếm ${qp.rare}%</span>
                    <span style="color:#9333ea;">Sử Thi ${qp.epic}%</span>
                    <span style="color:#ea580c;font-weight:700;">Truyền Thuyết ${qp.legendary}%</span>
                  </div>
                </div>
                <button type="button" class="tk-action-btn" data-craft-id="${this.esc(r.id)}" ${!unlocked || !canMastery || this.busy ? 'disabled' : ''}>
                  ${!unlocked ? 'Ẩn (Quest)' : !canMastery ? `Cần Lv.${r.requiredMastery}` : 'Chế Tạo x1'}
                </button>
              </div>
            `;
          })
          .join('');
        tabContent = `${matsTray}<div style="display:flex;flex-direction:column;gap:8px;">${recipesHtml}</div>`;
      } else if (this.subTab === 'market') {
        const sellableOptions = ownedMaterials
          .map((m) => `<option value="${this.esc(m.itemId)}">${this.esc(m.name || m.itemId)} (x${m.quantity}, ${m.quality})</option>`)
          .join('');
        const listingsHtml = this.marketListings.length
          ? this.marketListings
              .filter((l: any) => l.status === 'active')
              .slice(0, 18)
              .map(
                (l: any) => `
                  <div class="tk-party-member-card">
                    <div>
                      <div style="font-weight:700;color:#2f4735;font-size:12px;">
                        ${this.esc(l.itemName || l.itemId)} x${l.quantity}
                        <span class="tk-heading-pill">${this.esc(l.quality)}</span>
                      </div>
                      <div style="font-size:10px;color:#68604d;">Người bán: ${this.esc(l.sellerName)} · Đơn giá: <b>${l.unitPriceGold}G</b> (Tổng ${l.totalPriceGold}G)</div>
                    </div>
                    ${
                      l.sellerCharacterId === this.characterId
                        ? `<button type="button" class="tk-tab-btn" data-mkt-cancel="${this.esc(l.id)}">Thu Hồi</button>`
                        : `<button type="button" class="tk-action-btn" data-mkt-buy="${this.esc(l.id)}">Mua (${l.totalPriceGold}G)</button>`
                    }
                  </div>
                `
              )
              .join('')
          : '<p style="font-size:11px;color:#68604d;">Chưa có tin đăng nào trên Chợ Nghề. Hãy đăng bán nguyên liệu hoặc thành phẩm bên trên!</p>';

        tabContent = `
          <div class="tk-inspector-bar" style="flex-wrap:wrap;gap:6px;margin-bottom:8px;">
            <strong style="font-size:11px;">Đăng Bán Chợ Người Chơi:</strong>
            <select id="mkt-sell-item" style="padding:4px 6px;border-radius:6px;border:1px solid #b69b5c;font-size:11px;max-width:210px;">
              ${sellableOptions || '<option value="">(Chưa có vật phẩm nghề)</option>'}
            </select>
            <input id="mkt-sell-qty" type="number" min="1" max="50" value="1" style="width:54px;padding:4px;border-radius:6px;border:1px solid #b69b5c;font-size:11px;" title="Số lượng" />
            <input id="mkt-sell-price" type="number" min="10" max="500000" value="80" style="width:76px;padding:4px;border-radius:6px;border:1px solid #b69b5c;font-size:11px;" title="Đơn giá (Vàng)" />
            <button type="button" class="tk-action-btn" id="btn-mkt-list" ${ownedMaterials.length === 0 ? 'disabled' : ''}>Đăng Bán</button>
            <button type="button" class="tk-tab-btn" id="btn-mkt-refresh">↻ Làm Mới</button>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;">${listingsHtml}</div>
        `;
      } else if (this.subTab === 'quests') {
        const questsHtml = profQuests.length
          ? profQuests
              .map((q: any) => {
                const badge = QUEST_KIND_BADGES[q.questKind] || QUEST_KIND_BADGES.intro;
                const masteryOk = profState.level >= q.requiredMastery;
                return `
                  <div class="tk-party-member-card">
                    <div>
                      <div style="font-weight:700;color:#2f4735;font-size:12px;">
                        <span class="tk-heading-pill" style="background:${badge.bg};color:${badge.color};">[${badge.label}]</span>
                        ${this.esc(q.nameVi)}
                        <span class="tk-heading-pill">Lv.${q.requiredMastery}+</span>
                      </div>
                      <div style="font-size:10px;color:#68604d;">${this.esc(q.description)} · Thưởng: +${q.rewardExp} EXP, +${q.rewardGold}G${q.unlocksRecipeId ? `, Mở ${q.unlocksRecipeId}` : ''}${q.unlocksProfessionSlot ? ', +1 Ô Nghề' : ''}</div>
                    </div>
                    ${
                      q.completed
                        ? '<span class="tk-status-badge locked">Đã Hoàn Thành</span>'
                        : `<button type="button" class="tk-action-btn" data-complete-pquest="${this.esc(q.id)}" ${masteryOk ? '' : 'disabled'}>${masteryOk ? 'Nộp &amp; Nhận' : `Cần Lv.${q.requiredMastery}`}</button>`
                    }
                  </div>
                `;
              })
              .join('')
          : '<p style="font-size:11px;color:#68604d;">Chưa có nhiệm vụ khả dụng.</p>';
        tabContent = `<div style="display:flex;flex-direction:column;gap:8px;">${questsHtml}</div>`;
      } else {
        const hist = profState.productionHistory || [];
        tabContent = hist.length
          ? hist
              .map((h: any) => {
                const qMeta = PROFESSION_QUALITY_RULES[h.quality as keyof typeof PROFESSION_QUALITY_RULES];
                return `
                  <div class="tk-party-member-card">
                    <span><strong>${this.esc(h.recipeName)}</strong> · SL: ${h.quantity}${h.extraYield > 0 ? ` (+${h.extraYield} bội thu!)` : ''}</span>
                    <span class="tk-heading-pill" style="color:${qMeta?.color || '#333'};">${qMeta?.labelVi || h.quality} · +${h.expGained} EXP</span>
                  </div>
                `;
              })
              .join('')
          : '<p style="font-size:11px;color:#68604d;">Chưa có lịch sử sản xuất trong nghề này.</p>';
      }

      const tier2Tool = tools.find((t) => t.tier === 2);
      const tier1Tool = tools.find((t) => t.tier === 1);
      const ownsTier1 = tier1Tool && ownedTools.some((ot) => ot.itemId === tier1Tool.id);
      const ownsTier2 = tier2Tool && ownedTools.some((ot) => ot.itemId === tier2Tool.id);

      mainBody = `
        <div class="tk-set-bonus-box">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="width:28px;height:28px;border-radius:8px;background:#fef3c7;border:1px solid #c9a65b;display:inline-flex;align-items:center;justify-content:center;">${getItemIconSvg(profDef.iconKey)}</span>
              <div>
                <strong style="font-size:14px;color:#2f4735;">${this.esc(profDef.nameVi)} · Lv.${profState.level}/70</strong>
                <span class="tk-heading-pill">${this.esc(rank?.nameVi || '')} (${this.esc(rank?.name || '')})</span>
              </div>
            </div>
            <div style="font-size:11px;color:#5d573f;">
              Mastery EXP: <strong>${profState.exp}/${profState.nextLevelExp || 'MAX'} (${expPct}%)</strong> · Vàng: <strong>${Number(ov?.gold || 0).toLocaleString()} G</strong>
            </div>
          </div>
          <div style="height:7px;background:#dfd3b2;border-radius:99px;overflow:hidden;margin:6px 0;">
            <div style="height:100%;width:${expPct}%;background:linear-gradient(90deg,#15803d,#d97706);"></div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;font-size:11px;">
            <span>
              Công cụ: <strong>${this.esc(equippedTool?.nameVi || 'Không có')}</strong> · Độ bền: <strong>${profState.toolDurability}/${profState.maxToolDurability} (${durPct}%)</strong>
              · Hạn mức ngày: Thu ${dailyStats.gatherActions}/${PROFESSION_SYSTEM_CONFIG.dailyGatherSoftCap} · Chế ${dailyStats.craftActions}/${PROFESSION_SYSTEM_CONFIG.dailyCraftSoftCap}
            </span>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              <button type="button" class="tk-tab-btn" id="btn-repair-tool">Sửa Công Cụ</button>
              ${ownsTier1 && tier1Tool && profState.equippedToolId !== tier1Tool.id ? `<button type="button" class="tk-tab-btn" data-equip-tool="${this.esc(tier1Tool.id)}">Đổi ${this.esc(tier1Tool.nameVi)}</button>` : ''}
              ${ownsTier2 && tier2Tool && profState.equippedToolId !== tier2Tool.id ? `<button type="button" class="tk-tab-btn" data-equip-tool="${this.esc(tier2Tool.id)}">Trang bị ${this.esc(tier2Tool.nameVi)}</button>` : ''}
              ${tier2Tool && !ownsTier2 ? `<button type="button" class="tk-action-btn" id="btn-buy-t2">Mua &amp; Đổi ${this.esc(tier2Tool.nameVi)} (${tier2Tool.priceGold}G)</button>` : ''}
            </div>
          </div>
        </div>

        <div class="tk-filter-tabs" style="flex-wrap:wrap;gap:4px;">
          <button type="button" class="tk-tab-btn ${this.subTab === 'gather' ? 'active' : ''}" data-subtab="gather">🌿 Thu Thập</button>
          <button type="button" class="tk-tab-btn ${this.subTab === 'mining' ? 'active' : ''}" data-subtab="mining">⛏ Khai Mỏ</button>
          <button type="button" class="tk-tab-btn ${this.subTab === 'fishing' ? 'active' : ''}" data-subtab="fishing">🎣 Câu Cá</button>
          <button type="button" class="tk-tab-btn ${this.subTab === 'farm' ? 'active' : ''}" data-subtab="farm">🌾 Nông Trại (${(ov?.farmPlots || []).length}/4)</button>
          <button type="button" class="tk-tab-btn ${this.subTab === 'craft' ? 'active' : ''}" data-subtab="craft">⚒ Chế Tạo (${profRecipes.length})</button>
          <button type="button" class="tk-tab-btn ${this.subTab === 'market' ? 'active' : ''}" data-subtab="market">🏪 Chợ Nghề</button>
          <button type="button" class="tk-tab-btn ${this.subTab === 'quests' ? 'active' : ''}" data-subtab="quests">📜 Nhiệm Vụ (${profQuests.length})</button>
          <button type="button" class="tk-tab-btn ${this.subTab === 'history' ? 'active' : ''}" data-subtab="history">🧾 Lịch Sử</button>
        </div>
        ${tabContent}
      `;
    }

    this.backdrop.innerHTML = `
      <section class="tk-window" role="dialog" aria-modal="true" style="width:min(880px,96vw);">
        <header class="tk-window-header">
          <div class="tk-header-title-group">
            <h2>KỸ NĂNG SỐNG &amp; 8 NGHỀ NGHIỆP (MASTERY Lv.1–70)</h2>
            <p>Đã học: ${learnedCount}/${maxSlots} nghề · Herbalist · Blacksmith · Alchemist · Miner · Farmer · Fisherman · Woodcutter · Chef</p>
          </div>
          <button type="button" class="tk-close-btn" id="prof-close-btn">✕</button>
        </header>
        <div class="tk-social-body">
          <div class="tk-filter-tabs" style="flex-wrap:wrap;">${profCardsHtml}</div>
          ${this.statusText ? `<div style="padding:6px 10px;border-radius:6px;background:#fef3c7;color:#92400e;font-size:11px;font-weight:700;">${this.esc(this.statusText)}</div>` : ''}
          ${mainBody}
          <div style="display:flex;justify-content:flex-end;border-top:1px solid #d0c19a;padding-top:10px;">
            <button type="button" class="tk-tab-btn" id="prof-footer-close">Đóng [ESC]</button>
          </div>
        </div>
      </section>
    `;

    this.backdrop.querySelector('.tk-window')?.addEventListener('click', (e) => e.stopPropagation());
    this.backdrop.querySelector('#prof-close-btn')?.addEventListener('click', () => this.close());
    this.backdrop.querySelector('#prof-footer-close')?.addEventListener('click', () => this.close());

    this.backdrop.querySelectorAll<HTMLElement>('[data-prof]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.activeProf = btn.dataset.prof as ProfessionId;
        this.subTab = this.defaultSubTabForProfession(this.activeProf);
        this.statusText = '';
        this.render();
      });
    });

    this.backdrop.querySelectorAll<HTMLElement>('[data-subtab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.subTab = btn.dataset.subtab as ProfSubTab;
        if (this.subTab === 'farm') this.startTicker();
        if (this.subTab === 'market') {
          void this.refreshMarket();
          return;
        }
        this.render();
      });
    });

    this.backdrop.querySelector('#btn-learn-prof')?.addEventListener('click', async () => {
      if (!this.characterId || this.busy) return;
      this.busy = true;
      const r = await learnProfessionApi(this.characterId, this.activeProf);
      this.busy = false;
      this.statusText = r.success ? `Đã học nghề ${profDef.nameVi}!` : (r.error || 'Lỗi');
      if (r.success) this.onCharacterMutated?.();
      await this.refresh();
    });

    this.backdrop.querySelector('#btn-repair-tool')?.addEventListener('click', async () => {
      if (!this.characterId || this.busy) return;
      const r = await repairProfessionToolApi(this.characterId, this.activeProf);
      this.statusText = r.success ? `Đã sửa công cụ (tốn ${r.data?.costGold || 0}G).` : (r.error || 'Lỗi');
      if (r.success) this.onCharacterMutated?.();
      await this.refresh();
    });

    this.backdrop.querySelectorAll<HTMLElement>('[data-equip-tool]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!this.characterId) return;
        const r = await equipProfessionToolApi(this.characterId, btn.dataset.equipTool!);
        this.statusText = r.success ? `Đã đổi sang ${r.data?.equippedTool?.nameVi || 'công cụ'}!` : (r.error || 'Lỗi');
        await this.refresh();
      });
    });

    this.backdrop.querySelector('#btn-buy-t2')?.addEventListener('click', async () => {
      const t2 = tools.find((t) => t.tier === 2);
      if (!this.characterId || !t2) return;
      const r = await buyProfessionToolApi(this.characterId, t2.id);
      this.statusText = r.success ? `Đã mua & trang bị ${t2.nameVi}!` : (r.error || 'Lỗi');
      if (r.success) this.onCharacterMutated?.();
      await this.refresh();
    });

    this.backdrop.querySelectorAll<HTMLElement>('[data-gather-node]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!this.characterId || this.busy || this.activeGatherTimer) return;
        const nodeId = btn.dataset.gatherNode!;
        const node = allNodes.find((x: any) => x.id === nodeId);
        this.busy = true;
        const st = await startGatheringApi(this.characterId, nodeId);
        if (!st.success || !st.data) {
          this.busy = false;
          this.statusText = st.error || 'Không thể thu thập.';
          this.render();
          return;
        }
        const sess = st.data;
        this.activeGatherTimer = {
          nodeName: node?.nameVi || nodeId,
          completeAt: sess.completeAt,
          isFishing: node?.nodeType === 'fishing_spot',
        };
        this.startTicker();
        this.render();

        const waitMs = Math.max(50, sess.completeAt - Date.now() + 40);
        window.setTimeout(async () => {
          const done = await completeGatheringApi(this.characterId!, sess.sessionId);
          this.activeGatherTimer = null;
          this.busy = false;
          if (done.success && done.data) {
            const p = done.data.primaryYield;
            const rare = done.data.rareYield ? ` + HIẾM: ${done.data.rareYield.itemId}` : '';
            this.statusText = `Thu hoạch +${p.quantity} ${p.itemId}${rare} (+${done.data.expResult.expAdded} Mastery EXP)`;
            this.onCharacterMutated?.();
          } else {
            this.statusText = done.error || 'Thu thập thất bại.';
          }
          await this.refresh();
        }, waitMs);
      });
    });

    this.backdrop.querySelectorAll<HTMLElement>('[data-plant-seed]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!this.characterId) return;
        const r = await plantCropApi(this.characterId, btn.dataset.plantSeed!);
        this.statusText = r.success ? `Đã gieo trồng ${r.data.cropName}!` : (r.error || 'Lỗi');
        if (r.success) this.onCharacterMutated?.();
        await this.refresh();
      });
    });

    this.backdrop.querySelectorAll<HTMLElement>('[data-water-plot]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!this.characterId) return;
        const r = await waterCropApi(this.characterId, btn.dataset.waterPlot!);
        this.statusText = r.success ? 'Đã tưới nước (tăng tốc sinh trưởng & +25% sản lượng)!' : (r.error || 'Lỗi');
        await this.refresh();
      });
    });

    this.backdrop.querySelectorAll<HTMLElement>('[data-harvest-plot]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!this.characterId) return;
        const r = await harvestCropApi(this.characterId, btn.dataset.harvestPlot!);
        this.statusText = r.success ? `Thu hoạch +${r.data.quantity} ${r.data.harvestedItemId} (${r.data.quality})!` : (r.error || 'Lỗi');
        if (r.success) this.onCharacterMutated?.();
        await this.refresh();
      });
    });

    this.backdrop.querySelectorAll<HTMLElement>('[data-craft-id]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!this.characterId || this.busy) return;
        this.busy = true;
        const r = await craftProfessionRecipeApi(this.characterId, btn.dataset.craftId!, 1);
        this.busy = false;
        if (r.success && r.data) {
          const d = r.data;
          this.statusText =
            d.craftsSucceeded > 0
              ? `Chế tạo thành công ${d.totalProduced} sản phẩm (${d.results[0]?.quality}, +${d.extraProduced} bội thu, +${d.expResult.expAdded} EXP)!`
              : `Chế tạo thất bại nhẹ (+${d.expResult.expAdded} EXP an ủi).`;
          this.onCharacterMutated?.();
        } else {
          this.statusText = r.error || 'Không thể chế tạo.';
        }
        await this.refresh();
      });
    });

    this.backdrop.querySelector('#btn-mkt-refresh')?.addEventListener('click', () => void this.refreshMarket());

    this.backdrop.querySelector('#btn-mkt-list')?.addEventListener('click', async () => {
      if (!this.characterId) return;
      const itemId = (this.backdrop.querySelector('#mkt-sell-item') as HTMLSelectElement | null)?.value;
      const qty = Math.max(1, Number((this.backdrop.querySelector('#mkt-sell-qty') as HTMLInputElement | null)?.value || 1));
      const unitPriceGold = Math.max(1, Number((this.backdrop.querySelector('#mkt-sell-price') as HTMLInputElement | null)?.value || 50));
      if (!itemId) return;
      const r = await createMarketListingApi({
        sellerCharacterId: this.characterId,
        itemId,
        quantity: qty,
        unitPriceGold,
      });
      this.statusText = r.success ? `Đã đăng bán ${itemId} x${qty} (${unitPriceGold}G/món) lên Chợ!` : (r.error || 'Đăng bán thất bại.');
      if (r.success) this.onCharacterMutated?.();
      await this.refresh();
    });

    this.backdrop.querySelectorAll<HTMLElement>('[data-mkt-buy]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!this.characterId) return;
        const r = await buyMarketListingApi(btn.dataset.mktBuy!, this.characterId);
        this.statusText = r.success ? 'Giao dịch Chợ thành công!' : (r.error || 'Mua thất bại.');
        if (r.success) this.onCharacterMutated?.();
        await this.refresh();
      });
    });

    this.backdrop.querySelectorAll<HTMLElement>('[data-mkt-cancel]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!this.characterId) return;
        const r = await cancelMarketListingApi(btn.dataset.mktCancel!, this.characterId);
        this.statusText = r.success ? 'Đã thu hồi vật phẩm về Balo.' : (r.error || 'Thu hồi thất bại.');
        if (r.success) this.onCharacterMutated?.();
        await this.refresh();
      });
    });

    this.backdrop.querySelectorAll<HTMLElement>('[data-complete-pquest]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!this.characterId) return;
        const r = await completeProfessionQuestApi(this.characterId, btn.dataset.completePquest!);
        this.statusText = r.success
          ? `Hoàn thành nhiệm vụ! (+${r.data.quest.rewardGold}G, +${r.data.expResult.expAdded} EXP${r.data.unlockedRecipe ? `, MỞ CÔNG THỨC: ${r.data.unlockedRecipe}` : ''}${r.data.unlockedProfessionSlots ? `, Ô nghề: ${r.data.unlockedProfessionSlots}` : ''})`
          : (r.error || 'Chưa đủ vật phẩm nhiệm vụ.');
        if (r.success) this.onCharacterMutated?.();
        await this.refresh();
      });
    });
  }
}
