import {
  PASSIVE_BY_ID,
  PASSIVE_PROGRESSION_CONFIG,
  getPassiveTreeForCharacter,
  validatePassiveAllocation,
} from '@elysia/game-data-schema';
import type { HudSnapshot } from '../engine/GameEngine';
import { SkillSlotDef } from '../engine/types';
import { getPadlockSmallSvg, getSkillIconSvg } from './FantasyArtIcons';
import { modalManager } from './ModalManager';

const TIER_LABELS: Record<string, string> = {
  all: 'Tất Cả',
  basic: 'Cơ Bản',
  passive: 'Bị Động',
  advanced: 'Nâng Cao',
  ultimate: 'Tuyệt Kỹ',
  branch: 'Nhánh Lv.80',
};

const PASSIVE_CAT_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  core: { label: 'Nền Tảng', color: '#0369a1', bg: '#e0f2fe' },
  combat: { label: 'Chiến Đấu', color: '#b45309', bg: '#fef3c7' },
  mastery: { label: 'Thông Thạo', color: '#7e22ce', bg: '#f3e8ff' },
  capstone: { label: 'Tinh Hoa Độc Quyền', color: '#be123c', bg: '#ffe4e6' },
};

const MASTERY_RANK_INFO: Record<string, { labelVi: string; color: string }> = {
  novice: { labelVi: 'Sơ Nhập', color: '#94a3b8' },
  apprentice: { labelVi: 'Học Đồ', color: '#22c55e' },
  adept: { labelVi: 'Thành Thạo', color: '#38bdf8' },
  expert: { labelVi: 'Tinh Thông', color: '#a855f7' },
  master: { labelVi: 'Đại Sư', color: '#f59e0b' },
  grandmaster: { labelVi: 'Tông Sư', color: '#f43f5e' },
};

/**
 * Elysia Class Skill Tree & Passive Tree Window [K] matching the parchment & antique gold HUD.
 */
export class SkillFrameModal {
  public static readonly MODAL_ID = 'skill-frame';
  private backdrop: HTMLElement;
  private isOpen = false;
  private skills: SkillSlotDef[] = [];
  private atkBonus = 18;
  private skillPoints = 0;
  private classId = 'adventurer';
  private latestSnapshot: HudSnapshot | null = null;
  private activeViewMode: 'active_skills' | 'passives' = 'active_skills';
  private activeTier: 'all' | 'basic' | 'passive' | 'advanced' | 'ultimate' | 'branch' = 'all';
  private passiveBranchFilter: 'all' | 'base' | 'advanced' = 'all';
  private previewPassiveId: string | null = null;
  private confirmRespecMethod: 'gold' | 'item' | null = null;

  public onCastSkill?: (skillId: string) => void;
  public onUpgradeSkill?: (skillId: string) => void;
  public onAllocatePassive?: (passiveId: string) => Promise<{ success: boolean; error?: string }>;
  public onRespecPassives?: (method: 'gold' | 'item') => Promise<{ success: boolean; error?: string }>;
  public onPreviewPassive?: (passiveId: string) => {
    valid: boolean;
    reason?: string;
    before: any;
    after: any;
  } | null;

  constructor() {
    this.backdrop = document.createElement('div');
    this.backdrop.id = 'modal-skill-frame';
    this.backdrop.className = 'tk-modal-backdrop hidden';
    this.backdrop.setAttribute('aria-hidden', 'true');
    document.body.appendChild(this.backdrop);

    modalManager.registerBackdrop(this.backdrop, () => ({
      id: SkillFrameModal.MODAL_ID,
      onRequestClose: () => this.close(),
      closeOnBackdrop: true,
    }));

    this.backdrop.addEventListener('click', (e) => {
      const target = e.target as HTMLElement | null;
      if (!target || target === this.backdrop) return;
      e.stopPropagation();

      if (target.closest('[data-close-modal="skill-frame"], #btn-close-skills')) {
        this.close();
        return;
      }

      const viewBtn = target.closest('[data-skill-view]');
      if (viewBtn) {
        this.activeViewMode = (viewBtn.getAttribute('data-skill-view') as 'active_skills' | 'passives') || 'active_skills';
        this.confirmRespecMethod = null;
        this.render();
        return;
      }

      const passiveBranchBtn = target.closest('[data-passive-branch-filter]');
      if (passiveBranchBtn) {
        this.passiveBranchFilter = (passiveBranchBtn.getAttribute('data-passive-branch-filter') as any) || 'all';
        this.render();
        return;
      }

      const previewBtn = target.closest('[data-preview-passive]');
      if (previewBtn) {
        const pid = previewBtn.getAttribute('data-preview-passive');
        this.previewPassiveId = this.previewPassiveId === pid ? null : pid;
        this.render();
        return;
      }

      const allocPassiveBtn = target.closest('[data-allocate-passive]');
      if (allocPassiveBtn) {
        const pid = allocPassiveBtn.getAttribute('data-allocate-passive');
        if (pid) {
          this.previewPassiveId = pid;
          void this.onAllocatePassive?.(pid).then(() => this.render());
        }
        return;
      }

      const reqRespecBtn = target.closest('[data-request-respec]');
      if (reqRespecBtn) {
        const method = (reqRespecBtn.getAttribute('data-request-respec') as 'gold' | 'item') || 'gold';
        this.confirmRespecMethod = method;
        this.render();
        return;
      }

      if (target.closest('[data-cancel-respec]')) {
        this.confirmRespecMethod = null;
        this.render();
        return;
      }

      const confirmRespecBtn = target.closest('[data-confirm-respec]');
      if (confirmRespecBtn) {
        const method = (confirmRespecBtn.getAttribute('data-confirm-respec') as 'gold' | 'item') || 'gold';
        this.confirmRespecMethod = null;
        void this.onRespecPassives?.(method).then(() => this.render());
        return;
      }

      const tierBtn = target.closest('[data-skill-tier]');
      if (tierBtn) {
        this.activeTier = (tierBtn.getAttribute('data-skill-tier') as any) || 'all';
        this.render();
        return;
      }

      const castBtn = target.closest('[data-cast-skill]');
      if (castBtn) {
        const id = castBtn.getAttribute('data-cast-skill');
        if (id) {
          this.onCastSkill?.(id);
          this.close();
        }
        return;
      }

      const upgBtn = target.closest('[data-upgrade-skill]');
      if (upgBtn) {
        const id = upgBtn.getAttribute('data-upgrade-skill');
        if (id) this.onUpgradeSkill?.(id);
      }
    });
  }

  public setSkills(skills: SkillSlotDef[], atk = 18, skillPoints = 0, classId = 'adventurer', snap?: HudSnapshot) {
    this.skills = skills;
    this.atkBonus = atk;
    this.skillPoints = skillPoints;
    this.classId = classId;
    if (snap) this.latestSnapshot = snap;
    if (this.isOpen) this.render();
  }

  public open(skills?: SkillSlotDef[], atk?: number, skillPoints?: number, classId?: string, snap?: HudSnapshot) {
    if (skills) this.skills = skills;
    if (typeof atk === 'number') this.atkBonus = atk;
    if (typeof skillPoints === 'number') this.skillPoints = skillPoints;
    if (classId) this.classId = classId;
    if (snap) this.latestSnapshot = snap;
    this.isOpen = true;
    modalManager.open({
      id: SkillFrameModal.MODAL_ID,
      backdrop: this.backdrop,
      onClose: () => {
        this.isOpen = false;
        this.confirmRespecMethod = null;
      },
    });
    this.render();
  }

  public close() {
    this.isOpen = false;
    this.confirmRespecMethod = null;
    modalManager.close(SkillFrameModal.MODAL_ID);
  }

  public toggle(skills?: SkillSlotDef[], atk?: number, skillPoints?: number, classId?: string, snap?: HudSnapshot) {
    if (this.isOpen) this.close();
    else this.open(skills, atk, skillPoints, classId, snap);
  }

  private renderSkillArt(s: SkillSlotDef): string {
    const thumbSrc = s.iconUrl || (s.vfxKey ? `/assets/elysia/vfx/${s.vfxKey}_thumb.png` : '');
    if (thumbSrc) {
      return `<img src="${thumbSrc}" alt="${s.name}" class="tk-skill-vfx-thumb" />`;
    }
    return getSkillIconSvg(s.iconKey);
  }

  private renderPassiveTreeBody(): string {
    const snap = this.latestSnapshot;
    const pts = snap?.passivePoints || snap?.stats?.passivePointsSummary || {
      earned: 0,
      spent: 0,
      available: 0,
      masteryBonusPoints: 0,
    };
    const allocs = snap?.passiveAllocations || {};
    const level = snap?.level ?? 1;
    const advId = snap?.advancedJobId || undefined;
    const advName = snap?.advancedJobName || advId || null;
    const tree = getPassiveTreeForCharacter(this.classId, advId);
    const hasScroll = Boolean(snap?.inventory?.some((it) => it.id === 'ITEM_PASSIVE_RESET_SCROLL' && (it.qty || 0) > 0));
    const respecGold = snap?.respecCostGold ?? (pts.spent || 0) * PASSIVE_PROGRESSION_CONFIG.respecGoldPerSpentPoint;

    const filteredPassives = tree.filter((def) => {
      if (this.passiveBranchFilter === 'base') return !def.branchRequirement;
      if (this.passiveBranchFilter === 'advanced') return Boolean(def.branchRequirement);
      return true;
    });

    const charForCheck: any = {
      classId: this.classId,
      level,
      jobAdvancementCompleted: snap?.jobAdvancementCompleted ?? (this.classId !== 'adventurer'),
      advancedJobId: advId,
      passiveAllocations: allocs,
      skillMastery: snap?.skillMastery || {},
    };

    const previewData =
      this.previewPassiveId && this.onPreviewPassive
        ? this.onPreviewPassive(this.previewPassiveId)
        : null;
    const previewDef = this.previewPassiveId ? PASSIVE_BY_ID[this.previewPassiveId] : null;

    const previewHtml =
      previewData && previewDef
        ? (() => {
            const b = previewData.before?.secondaryStats;
            const a = previewData.after?.secondaryStats;
            const diffs: string[] = [];
            if (b && a) {
              const fields: Array<[string, number, number, string]> = [
                ['Max HP', b.maxHp, a.maxHp, ''],
                ['ATK', b.atk, a.atk, ''],
                ['MATK', b.matk, a.matk, ''],
                ['DEF', b.def, a.def, ''],
                ['MDEF', b.mdef, a.mdef, ''],
                ['Crit %', b.critRatePct, a.critRatePct, '%'],
                ['Crit DMG %', b.critDamageMultiplierPct, a.critDamageMultiplierPct, '%'],
                ['ASPD %', b.aspdPct, a.aspdPct, '%'],
                ['CDR %', b.cooldownReductionPct, a.cooldownReductionPct, '%'],
                ['Xuyên Giáp %', b.armorPenetrationPct, a.armorPenetrationPct, '%'],
                ['Xuyên Phép %', b.magicPenetrationPct, a.magicPenetrationPct, '%'],
                ['Giảm ST %', b.damageReductionPct, a.damageReductionPct, '%'],
                ['Hút Máu %', b.lifestealPct, a.lifestealPct, '%'],
                ['Trị Liệu %', b.healingBonusPct, a.healingBonusPct, '%'],
              ];
              for (const [label, bv, av, unit] of fields) {
                const delta = Number((av - bv).toFixed(1));
                if (delta !== 0) {
                  diffs.push(`<span><b>${label}</b>: ${bv}${unit} → <strong style="color:#15803d;">${av}${unit} (+${delta}${unit})</strong></span>`);
                }
              }
            }
            const afterWarn = (previewData.after?.warningsVi || []) as string[];
            return `
              <div style="margin:0 15px 8px;padding:10px 12px;border-radius:10px;border:1px solid #c2a055;background:rgba(254,249,231,0.96);font-size:12px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                  <strong>👁 Xem trước khi nâng +1: ${previewDef.nameVi}</strong>
                  <button type="button" class="tk-tab-btn" style="padding:2px 8px;font-size:11px;" data-preview-passive="${previewDef.id}">Ẩn xem trước</button>
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:10px;">
                  ${diffs.length > 0 ? diffs.join('') : '<span>Hiệu lực chiến đấu / kỹ năng liên kết tăng trực tiếp theo mô tả bên dưới.</span>'}
                </div>
                ${
                  afterWarn.length > 0
                    ? `<div style="margin-top:6px;padding:5px 8px;border-radius:6px;background:#fef3c7;color:#92400e;font-size:11px;">
                        ⚠ ${afterWarn.slice(0, 2).join(' · ')}
                      </div>`
                    : ''
                }
              </div>
            `;
          })()
        : '';

    const respecBar =
      this.confirmRespecMethod !== null
        ? `<div style="display:flex;align-items:center;gap:6px;background:#fff1f2;border:1px solid #fda4af;padding:4px 8px;border-radius:8px;font-size:11px;">
            <strong style="color:#9f1239;">Xác nhận tẩy toàn bộ nội tại (${this.confirmRespecMethod === 'item' ? 'Dùng Cuộn' : `${respecGold} Vàng`})?</strong>
            <button type="button" class="tk-action-btn" data-confirm-respec="${this.confirmRespecMethod}">Đồng Ý Tẩy</button>
            <button type="button" class="tk-tab-btn" data-cancel-respec="1">Hủy</button>
          </div>`
        : `<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            <button type="button" class="tk-tab-btn" data-request-respec="gold" ${pts.spent > 0 ? '' : 'disabled'}>↺ Tẩy Điểm (${respecGold}g)</button>
            <button type="button" class="tk-tab-btn" data-request-respec="item" ${pts.spent > 0 && hasScroll ? '' : 'disabled'} title="${hasScroll ? 'Dùng Cuộn Tẩy Tủy Nội Tại miễn vàng' : 'Cần Cuộn Tẩy Tủy Nội Tại (ITEM_PASSIVE_RESET_SCROLL)'}">📜 Dùng Cuộn</button>
          </div>`;

    const bodyHtml =
      tree.length === 0
        ? `<div style="padding:20px;text-align:center;color:#78350f;background:rgba(254,243,199,0.5);border:1px dashed #d97706;border-radius:10px;margin:12px 15px;">
            <strong>Bảng Nội Tại chưa mở khóa</strong>
            <p style="margin-top:6px;font-size:12px;">Hãy đạt Lv.15 và hoàn thành Thức Tỉnh Nghề để mở cây Nội Tại nghề gốc &amp; nhánh Lv.80.</p>
          </div>`
        : `<div class="tk-skills-list-grid">
            ${filteredPassives
              .sort((a, b) => Number(a.tierRow || 1) - Number(b.tierRow || 1) || Number(a.tierColumn || 1) - Number(b.tierColumn || 1))
              .map((def) => {
                const curRank = Math.max(0, Number(allocs[def.id] || 0));
                const catStyle = PASSIVE_CAT_LABELS[def.category] || PASSIVE_CAT_LABELS.core;
                const check = validatePassiveAllocation(charForCheck, def.id, 1);
                const sySkill = def.synergySkillId ? this.skills.find((s) => s.id === def.synergySkillId) : null;
                const parentNames = def.parentPassiveIds
                  .map((pid) => {
                    const pDef = PASSIVE_BY_ID[pid];
                    const pRank = Number(allocs[pid] || 0);
                    return `<span style="font-size:10px;padding:1px 6px;border-radius:6px;background:${pRank > 0 ? '#dcfce7' : '#fee2e2'};color:${pRank > 0 ? '#166534' : '#991b1b'};">Tiền đề: ${pDef?.nameVi || pid}</span>`;
                  })
                  .join(' ');
                const effectsList = def.effects
                  .map((eff) => {
                    const unit = eff.isPercentage ? '%' : '';
                    const curVal = Number((eff.valuePerRank * curRank).toFixed(1));
                    return `<span style="font-size:11px;color:#334155;">• ${eff.stat}: <b>+${eff.valuePerRank}${unit}/hạng</b>${curRank > 0 ? ` <span style="color:#15803d;">(Hiện: +${curVal}${unit})</span>` : ''}</span>`;
                  })
                  .join('<br/>');

                return `
                  <div class="tk-skill-card ${curRank >= def.maxRank ? 'active' : ''}" style="${curRank > 0 ? 'border-color:#d97706;background:rgba(255,251,235,0.95);' : ''}">
                    <div class="tk-skill-card-art" style="background:${catStyle.bg};color:${catStyle.color};font-weight:800;font-size:13px;display:flex;flex-direction:column;align-items:center;justify-content:center;">
                      <span>${def.branchRequirement ? '★ Lv80' : '◆ Gốc'}</span>
                      <span style="font-size:11px;margin-top:2px;">${curRank}/${def.maxRank}</span>
                    </div>
                    <div class="tk-skill-card-meta">
                      <div class="tk-skill-title-line">
                        <strong>${def.nameVi} <small>(Hạng ${curRank}/${def.maxRank})</small></strong>
                        <span class="tk-heading-pill" style="background:${catStyle.bg};color:${catStyle.color};border-color:${catStyle.color};">${catStyle.label}</span>
                      </div>
                      <p style="margin-bottom:4px;">${def.descriptionVi}</p>
                      <div style="line-height:1.45;">${effectsList}</div>
                      <div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:5px;">
                        <span class="tk-heading-pill">Lv.${def.requiredCharacterLevel}</span>
                        ${def.requiredMasteryPoints ? `<span class="tk-heading-pill" style="color:#7e22ce;border-color:#c084fc;">Thông Thạo ≥ ${def.requiredMasteryPoints}</span>` : ''}
                        ${def.mutuallyExclusiveGroup ? `<span class="tk-heading-pill" style="background:#ffe4e6;color:#9f1239;border-color:#fb7185;">Độc Quyền</span>` : ''}
                        ${def.synergySkillId ? `<span class="tk-heading-pill" style="background:#e0f2fe;color:#0369a1;border-color:#7dd3fc;">Liên Kết: ${sySkill?.name || def.synergySkillId}</span>` : ''}
                        ${parentNames}
                      </div>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:4px;min-width:105px;">
                      <button type="button" class="tk-tab-btn" data-preview-passive="${def.id}" style="font-size:11px;">👁 Xem Trước</button>
                      <button type="button" class="tk-tab-btn ${check.valid ? 'active' : ''}" data-allocate-passive="${def.id}" ${check.valid ? '' : 'disabled'} title="${check.valid ? `Tiêu tốn ${def.pointCostPerRank} điểm nội tại` : check.reason}">
                        ${curRank >= def.maxRank ? 'Tối Đa' : `+1 (${def.pointCostPerRank} Đ)`}
                      </button>
                    </div>
                  </div>
                `;
              })
              .join('')}
          </div>`;

    const ledgerTail = (snap?.passiveTransactions || []).slice(-3);
    const ledgerHtml = ledgerTail.length
      ? `<div style="margin:6px 15px 0;font-size:11px;color:#57534e;display:flex;gap:10px;flex-wrap:wrap;">
          <b>Nhật ký:</b>
          ${ledgerTail.map((tx) => `<span>• ${tx.action === 'respec' ? 'Tẩy Điểm' : `Nâng ${tx.passiveId || ''}`} (${tx.remainingPointsAfter} Đ còn)</span>`).join('')}
        </div>`
      : '';

    return `
      <div style="padding:8px 15px 6px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;flex-shrink:0;">
        <div class="tk-filter-tabs">
          <button type="button" class="tk-tab-btn ${this.passiveBranchFilter === 'all' ? 'active' : ''}" data-passive-branch-filter="all">Tất Cả (${tree.length})</button>
          <button type="button" class="tk-tab-btn ${this.passiveBranchFilter === 'base' ? 'active' : ''}" data-passive-branch-filter="base">Nghề Gốc</button>
          <button type="button" class="tk-tab-btn ${this.passiveBranchFilter === 'advanced' ? 'active' : ''}" data-passive-branch-filter="advanced">${advName ? `★ ${advName}` : 'Nhánh Lv.80'}</button>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <span class="tk-heading-pill" style="background:#fef3c7;border-color:#d97706;color:#78350f;">Khả dụng: <b>${pts.available}</b> / ${pts.earned} (Đã dùng ${pts.spent})</span>
          <span class="tk-heading-pill" title="Điểm thưởng thêm từ Thông Thạo Kỹ Năng">+${pts.masteryBonusPoints} Thông Thạo</span>
          ${respecBar}
        </div>
      </div>
      <div style="padding:0 15px 6px;font-size:11px;color:#64748b;">
        Mỗi lần tẩy điểm luôn <b>bảo lưu nguyên vẹn Nhánh Chuyển Chức Lv.80</b> và chỉ hoàn trả điểm Nội Tại.
      </div>
      ${previewHtml}
      ${bodyHtml}
      ${ledgerHtml}
    `;
  }

  private render() {
    const prevGrid = this.backdrop.querySelector('.tk-skills-list-grid') as HTMLElement | null;
    const savedScroll = prevGrid ? prevGrid.scrollTop : 0;

    const scaledBonus = Math.round(this.atkBonus * 0.6);
    const pts = this.latestSnapshot?.passivePoints || this.latestSnapshot?.stats?.passivePointsSummary || {
      earned: 0,
      spent: 0,
      available: 0,
      masteryBonusPoints: 0,
    };
    const filtered =
      this.activeTier === 'all'
        ? this.skills
        : this.activeTier === 'branch'
        ? this.skills.filter((s) => Boolean(s.advancedBranchId))
        : this.skills.filter((s) => (s.tier || 'basic') === this.activeTier && !s.advancedBranchId);

    const hasBranchSkills = this.skills.some((s) => Boolean(s.advancedBranchId));
    const tabKeys = hasBranchSkills
      ? (['all', 'basic', 'passive', 'advanced', 'ultimate', 'branch'] as const)
      : (['all', 'basic', 'passive', 'advanced', 'ultimate'] as const);
    const tabsHtml = tabKeys
      .map(
        (tier) =>
          `<button type="button" class="tk-tab-btn ${this.activeTier === tier ? 'active' : ''}" data-skill-tier="${tier}">${TIER_LABELS[tier]}</button>`
      )
      .join('');

    const activeSkillsHtml = `
      <div style="padding:10px 15px 0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;flex-shrink:0;">
        <div class="tk-filter-tabs">${tabsHtml}</div>
        <span class="tk-heading-pill">SP khả dụng: ${this.skillPoints}</span>
      </div>

      <div class="tk-skills-list-grid">
        ${filtered
          .map((s) => {
            const curLv = Number(s.skillLevel ?? (s.locked ? 0 : 1));
            const maxLv = Number(s.maxLevel ?? 10);
            const masteryPts = Math.max(0, Math.min(100, Number(s.masteryPoints ?? 0)));
            const mRankKey = String(s.masteryRank || 'novice');
            const mRank = MASTERY_RANK_INFO[mRankKey] || MASTERY_RANK_INFO.novice;
            const isPassive = s.skillType === 'passive' || s.tier === 'passive';
            const canUpgrade = !s.locked && curLv < maxLv && this.skillPoints >= Number(s.spCost ?? 1);
            const tierLabel = s.advancedBranchId ? 'Nhánh Lv.80' : TIER_LABELS[s.tier || 'basic'] || s.tier || 'Cơ Bản';
            const milestones = Array.isArray(s.evolutionMilestones) ? s.evolutionMilestones : [];
            const milestonePills = milestones.length
              ? `<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:5px;">
                  ${milestones
                    .map((m: any) => {
                      const unlocked = curLv >= Number(m.requiredSkillLevel || 1);
                      return `<span title="${m.descriptionVi || m.description || ''}" style="font-size:10px;padding:1px 6px;border-radius:999px;border:1px solid ${unlocked ? '#b45309' : '#cbd5e1'};background:${unlocked ? '#fef3c7' : '#f8fafc'};color:${unlocked ? '#78350f' : '#64748b'};font-weight:${unlocked ? 700 : 500};">Lv.${m.requiredSkillLevel}: ${m.titleVi || m.title}</span>`;
                    })
                    .join('')}
                </div>`
              : '';

            if (s.locked) {
              return `
                <div class="tk-skill-card locked">
                  <div class="tk-skill-card-art">
                    <span class="tk-lock-center">${getPadlockSmallSvg()}</span>
                  </div>
                  <div class="tk-skill-card-meta">
                    <div class="tk-skill-title-line">
                      <strong>${s.name} [${tierLabel}]</strong>
                      <span class="tk-heading-pill">Yêu cầu Lv.${s.requiredLevel || 15}</span>
                    </div>
                    <p>${s.desc}</p>
                    ${milestonePills}
                  </div>
                </div>
              `;
            }
            return `
              <div class="tk-skill-card">
                <div class="tk-skill-card-art">${this.renderSkillArt(s)}</div>
                <div class="tk-skill-card-meta">
                  <div class="tk-skill-title-line">
                    <strong>${s.name} <small>(Cấp ${curLv}/${maxLv})</small></strong>
                    <span class="tk-heading-pill" style="${s.advancedBranchId ? 'background:#fef3c7;border-color:#d97706;color:#78350f;' : ''}">${s.advancedBranchId ? '★ ' + (isPassive ? 'Bị Động' : `Phím [${s.key || '-'}]`) : isPassive ? 'Bị Động' : `Phím [${s.key || '-'}]`}</span>
                  </div>
                  <p>${s.desc}</p>
                  <div class="tk-skill-nums">
                    <span>${isPassive ? 'Hiệu lực vĩnh viễn' : `💧 ${s.mpCost} MP · ⏱ ${s.cooldownSec}s`}</span>
                    ${!isPassive && s.damage > 0 ? `<span>⚔ ${s.damage + scaledBonus} DMG</span>` : ''}
                    ${(s.hitCount || 1) > 1 ? `<span>⚡ ${s.hitCount} Hits</span>` : ''}
                    ${s.effects?.length ? `<span>✦ ${s.effects[0].kind.toUpperCase()}</span>` : ''}
                  </div>
                  <div style="margin-top:5px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;margin-bottom:2px;">
                      <span style="font-weight:700;color:${mRank.color};">Thông Thạo: ${mRank.labelVi}</span>
                      <span style="color:#475569;font-weight:700;">${masteryPts}/100</span>
                    </div>
                    <div style="height:5px;border-radius:999px;background:rgba(15,23,42,0.12);overflow:hidden;">
                      <div style="width:${masteryPts}%;height:100%;background:${mRank.color};transition:width .25s ease;"></div>
                    </div>
                  </div>
                  ${milestonePills}
                </div>
                <div style="display:flex;flex-direction:column;gap:4px;">
                  ${!isPassive ? `<button type="button" class="tk-action-btn" data-cast-skill="${s.id}">Thi Triển</button>` : ''}
                  <button type="button" class="tk-tab-btn ${canUpgrade ? 'active' : ''}" data-upgrade-skill="${s.id}" ${canUpgrade ? '' : 'disabled'}>
                    ${curLv >= maxLv ? 'Tối Đa' : `+Nâng (${s.spCost || 1} SP)`}
                  </button>
                </div>
              </div>
            `;
          })
          .join('')}
      </div>
    `;

    this.backdrop.innerHTML = `
      <div class="tk-window tk-skill-window" role="dialog" aria-modal="true" aria-label="Cây Kỹ Năng & Nội Tại Nghề">
        <div class="tk-window-header">
          <div class="tk-header-title-group">
            <div class="tk-skill-header-icon">${getSkillIconSvg('skill_azure_wave')}</div>
            <div>
              <h2>KỸ NĂNG &amp; BẢNG NỘI TẠI · ${this.classId.toUpperCase()}</h2>
              <p>SP Chủ Động: <strong>${this.skillPoints}</strong> · Điểm Nội Tại: <strong>${pts.available}</strong> · +${scaledBonus} lực đánh trang bị</p>
            </div>
          </div>
          <button type="button" class="tk-btn-close" id="btn-close-skills" data-close-modal="skill-frame" title="Đóng [K / ESC]">✕</button>
        </div>

        <div style="padding:8px 15px 0;display:flex;gap:8px;border-bottom:1px solid rgba(180,140,70,0.25);padding-bottom:8px;flex-shrink:0;">
          <button type="button" class="tk-tab-btn ${this.activeViewMode === 'active_skills' ? 'active' : ''}" data-skill-view="active_skills">
            ⚔ Kỹ Năng Chủ Động (${this.skills.length})
          </button>
          <button type="button" class="tk-tab-btn ${this.activeViewMode === 'passives' ? 'active' : ''}" data-skill-view="passives">
            🌿 Bảng Nội Tại (${pts.available} điểm khả dụng)
          </button>
        </div>

        ${this.activeViewMode === 'passives' ? this.renderPassiveTreeBody() : activeSkillsHtml}

        <div class="tk-modal-footer">
          <button type="button" class="tk-tab-btn" data-close-modal="skill-frame">Đóng [ESC]</button>
        </div>
      </div>
    `;

    const nextGrid = this.backdrop.querySelector('.tk-skills-list-grid') as HTMLElement | null;
    if (nextGrid && savedScroll > 0) {
      nextGrid.scrollTop = savedScroll;
    }
  }
}
