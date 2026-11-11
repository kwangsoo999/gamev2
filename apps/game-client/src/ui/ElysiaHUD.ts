import type { MultiplayerChatMessage } from '@elysia/game-types';
import { HudSnapshot } from '../engine/GameEngine';
import { TilemapEngine } from '../engine/TilemapEngine';
import { MonsterEntity, NpcEntity, PlayerEntity } from '../entities/Entity';
import { getBackpackIconSvg, getItemIconSvg, getPadlockSmallSvg, getSkillIconSvg } from './FantasyArtIcons';

const NPC_PORTRAITS: Record<string, string> = {
  npc_elder: '/assets/elysia/ui/portrait-elder.png',
  npc_trainer: '/assets/elysia/ui/portrait-trainer.png',
  npc_merchant: '/assets/elysia/ui/portrait-merchant.png',
  NPC_HIGH_PRIEST: '/assets/elysia/ui/portrait-high-priest.png',
  NPC_SANCTUARY_PRIESTESS: '/assets/elysia/ui/portrait-priestess.png',
  NPC_JOB_MASTER_ASICA: '/assets/elysia/ui/portrait-priestess.png',
  NPC_GRAND_SAGE_OF_AWAKENING: '/assets/elysia/ui/portrait-elder.png',
  NPC_BLACKSMITH_MASTER: '/assets/elysia/ui/portrait-blacksmith.png',
  NPC_ELYSIA_EQUIP_MERCHANT: '/assets/elysia/ui/portrait-blacksmith.png',
  NPC_DRAKHEN_BLACKSMITH: '/assets/elysia/ui/portrait-blacksmith.png',
  NPC_HUNTER_KAEL: '/assets/elysia/ui/portrait-hunter.png',
  NPC_SYLVARIS_RANGER_CAPTAIN: '/assets/elysia/ui/portrait-hunter.png',
  NPC_HERBALIST_MASTER: '/assets/elysia/ui/portrait-merchant.png',
  NPC_FARMER_MASTER: '/assets/elysia/ui/portrait-merchant.png',
  NPC_CHEF_MASTER: '/assets/elysia/ui/portrait-merchant.png',
  NPC_FISHERMAN_MASTER: '/assets/elysia/ui/portrait-elder.png',
  NPC_ALCHEMIST_MASTER: '/assets/elysia/ui/portrait-elder.png',
  NPC_MINING_SUPERVISOR: '/assets/elysia/ui/portrait-blacksmith.png',
  NPC_LUMBERJACK_MASTER: '/assets/elysia/ui/portrait-trainer.png',
};

const SPRITE_PORTRAIT_FALLBACKS: Record<string, string> = {
  npc_blacksmith: '/assets/elysia/ui/portrait-blacksmith.png',
  npc_hunter: '/assets/elysia/ui/portrait-hunter.png',
  npc_priestess: '/assets/elysia/ui/portrait-priestess.png',
  npc_high_priest: '/assets/elysia/ui/portrait-high-priest.png',
  npc_trainer: '/assets/elysia/ui/portrait-trainer.png',
  npc_merchant: '/assets/elysia/ui/portrait-merchant.png',
  npc_villager_elder: '/assets/elysia/ui/portrait-elder.png',
};

/**
 * ElysiaHUD updates cached DOM element references with dirty checking
 * so the 2D Canvas render loop stays fast and allocation-free.
 */
export class ElysiaHUD {
  private hpBar = document.getElementById('hud-hp-bar') as HTMLElement;
  private hpText = document.getElementById('hud-hp-text') as HTMLElement;
  private mpBar = document.getElementById('hud-mp-bar') as HTMLElement;
  private mpText = document.getElementById('hud-mp-text') as HTMLElement;
  private expBar = document.getElementById('hud-exp-bar') as HTMLElement;
  private expText = document.getElementById('hud-exp-text') as HTMLElement;
  private nameEl = document.getElementById('hud-player-name') as HTMLElement;
  private jobEl = document.getElementById('hud-player-job') as HTMLElement | null;
  private connDotEl = document.getElementById('hud-conn-dot') as HTMLElement | null;
  private lvlEl = document.getElementById('hud-player-lvl') as HTMLElement;
  private statBadgeEl = document.getElementById('hud-stat-points-badge') as HTMLElement | null;
  private toastContainer = document.getElementById('hud-toast-container') as HTMLElement | null;
  private coordsEl = document.getElementById('hud-coords') as HTMLElement;
  private onlineCountEl = document.getElementById('hud-online-count') as HTMLElement | null;
  private pingEl = document.getElementById('hud-ping-ms') as HTMLElement | null;
  private reconnectBanner = document.getElementById('hud-reconnect-banner') as HTMLElement | null;
  private socialBadgeEl = document.getElementById('hud-social-badge') as HTMLElement | null;
  private chatDockEl = document.getElementById('hud-chat-dock') as HTMLElement | null;
  private chatLogEl = document.getElementById('hud-chat-log') as HTMLElement | null;
  private chatFormEl = document.getElementById('hud-chat-form') as HTMLFormElement | null;
  private chatInputEl = document.getElementById('hud-chat-input') as HTMLInputElement | null;
  private chatWhisperTargetEl = document.getElementById('hud-chat-whisper-target') as HTMLInputElement | null;
  private chatCollapseBtn = document.getElementById('btn-chat-collapse') as HTMLElement | null;
  private activeChatFilter: 'all' | 'general' | 'global' | 'party' | 'whisper' | 'guild' | 'merchant' = 'all';
  private chatHistory: MultiplayerChatMessage[] = [];

  private questCard = document.getElementById('hud-quest-card') as HTMLElement;
  private questTitleEl = document.getElementById('hud-quest-title') as HTMLElement;
  private questBadgeEl = document.getElementById('hud-quest-badge') as HTMLElement | null;
  private questObjectivesListEl = document.getElementById('hud-quest-objectives-list') as HTMLElement | null;
  private questObjEl = document.getElementById('hud-quest-obj') as HTMLElement;
  private questCountEl = document.getElementById('hud-quest-count') as HTMLElement;
  private questFindBtn = document.getElementById('btn-hud-quest-find') as HTMLElement | null;
  private questJournalBtn = document.getElementById('btn-hud-quest-journal') as HTMLElement | null;
  private questUntrackBtn = document.getElementById('btn-hud-quest-untrack') as HTMLElement | null;
  private zoneTitleEl = document.getElementById('hud-zone-title') as HTMLElement;
  private bossBar = document.getElementById('hud-boss-bar') as HTMLElement;
  private bossPortrait = document.getElementById('hud-boss-portrait') as HTMLImageElement;
  private bossNameEl = document.getElementById('hud-boss-name') as HTMLElement;
  private bossTagEl = document.getElementById('hud-boss-tag') as HTMLElement;
  private bossFillEl = document.getElementById('hud-boss-fill') as HTMLElement;
  private bossHpTextEl = document.getElementById('hud-boss-hp-text') as HTMLElement;
  private bossTelegraphEl = document.getElementById('hud-boss-telegraph') as HTMLElement;
  private deathPenaltyPillEl = document.getElementById('hud-death-penalty-pill') as HTMLElement | null;
  private checkpointPillEl = document.getElementById('hud-checkpoint-pill') as HTMLElement | null;
  private autoCombatToggleBtn = document.getElementById('btn-hud-autocombat-toggle') as HTMLElement | null;
  private autoCombatCfgBtn = document.getElementById('btn-hud-autocombat-cfg') as HTMLElement | null;
  private autoCombatPanelEl = document.getElementById('hud-autocombat-panel') as HTMLElement | null;
  private transitionCurtainEl = document.getElementById('hud-transition-curtain') as HTMLElement | null;
  private transitionTitleEl = document.getElementById('hud-transition-title') as HTMLElement | null;
  private transitionSubEl = document.getElementById('hud-transition-subtitle') as HTMLElement | null;

  private hotbarEl = document.getElementById('hud-hotbar') as HTMLElement;
  private minimapCanvas = document.getElementById('minimap-canvas') as HTMLCanvasElement;
  private minimapCtx = this.minimapCanvas.getContext('2d')!;

  private dialogBox = document.getElementById('hud-npc-dialog') as HTMLElement;
  private dialogPortrait = document.getElementById('hud-npc-portrait') as HTMLImageElement;
  private dialogText = document.getElementById('hud-npc-text') as HTMLElement;
  private dialogActions = document.getElementById('hud-npc-actions') as HTMLElement;
  private dialogCloseBtn = document.getElementById('hud-npc-close') as HTMLElement;

  private cachedHp = '';
  private cachedMp = '';
  private cachedExp = '';
  private cachedCoords = '';
  private cachedQuest = '';
  private cachedSkillsSig = '';
  private committedPotentialPoints = 0;
  private previewPotentialPoints: number | null = null;
  private slotElems = new Map<string, HTMLElement>();
  private quickCountElems = new Map<string, HTMLElement>();

  public onCastSkill?: (skillId: string) => void;
  public onQuickUse?: (iconKey: 'potion_hp' | 'potion_mp' | 'scroll_town') => void;
  public onOpenAccount?: () => void;
  public onOpenSocial?: () => void;
  public onSendChat?: (channel: 'general' | 'global' | 'party' | 'whisper' | 'guild' | 'merchant', message: string, targetName?: string) => void;
  public onInspectRemotePlayerName?: (name: string) => void;
  public onOpenProfessions?: (professionId?: string) => void;
  public onOpenGuildMerchant?: (section?: 'guild' | 'merchant' | 'territory') => void;
  public onOpenEvents?: () => void;
  public onOpenSettings?: () => void;
  public onOpenBag?: () => void;
  public onOpenSkills?: () => void;
  public onOpenQuests?: () => void;
  public onOpenShop?: () => void;
  public onOpenStorage?: () => void;
  public onOpenWorldMap?: () => void;
  public onOpenJob?: () => void;
  public onReplayJobRitual?: (jobId?: string) => void;
  public onOpenCrafting?: () => void;
  public onClaimQuest?: () => void;
  public onAcceptWorldQuest?: (questId: string) => void;
  public onClaimWorldQuest?: (questId: string) => void;
  public onTrackQuest?: (questId: string | null) => void;
  public onFindTrackedQuestTarget?: () => void;
  public onRepairEquipment?: () => void;
  public onNpcDialogueTopic?: (npcId: string, keyword: string) => void;
  public onToggleAutoCombat?: () => void;
  public onUpdateAutoCombatConfig?: (patch: Record<string, any>) => void;

  constructor(skills: HudSnapshot['skills']) {
    this.buildHotbar(skills);

    document.getElementById('hud-player-panel')?.addEventListener('click', () => this.onOpenBag?.());
    document.getElementById('btn-toggle-quest')?.addEventListener('click', () => this.questCard?.classList.toggle('hidden'));
    this.questFindBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onFindTrackedQuestTarget?.();
    });
    this.questJournalBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onOpenQuests?.();
    });
    this.questUntrackBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onTrackQuest?.(null);
    });
    document.getElementById('btn-hud-account')?.addEventListener('click', () => this.onOpenAccount?.());
    document.getElementById('btn-hud-social')?.addEventListener('click', () => this.onOpenSocial?.());
    document.getElementById('btn-hud-events')?.addEventListener('click', () => this.onOpenEvents?.());
    document.getElementById('btn-hud-worldmap')?.addEventListener('click', () => this.onOpenWorldMap?.());
    document.getElementById('btn-rail-worldmap')?.addEventListener('click', () => this.onOpenWorldMap?.());
    document.getElementById('btn-rail-guild')?.addEventListener('click', () => this.onOpenGuildMerchant?.('guild'));
    document.getElementById('btn-rail-profession')?.addEventListener('click', () => this.onOpenProfessions?.());
    document.getElementById('btn-rail-job')?.addEventListener('click', () => this.onOpenJob?.());
    document.getElementById('btn-rail-craft')?.addEventListener('click', () => this.onOpenCrafting?.());
    document.getElementById('btn-rail-quest')?.addEventListener('click', () => this.onOpenQuests?.());
    document.getElementById('btn-rail-shop')?.addEventListener('click', () => this.onOpenShop?.());
    document.getElementById('btn-rail-storage')?.addEventListener('click', () => this.onOpenStorage?.());
    document.getElementById('btn-rail-bag')?.addEventListener('click', () => this.onOpenBag?.());
    document.getElementById('btn-hud-skills')?.addEventListener('click', () => this.onOpenSkills?.());
    document.getElementById('btn-hud-settings')?.addEventListener('click', () => this.onOpenSettings?.());
    this.autoCombatToggleBtn?.addEventListener('click', () => this.onToggleAutoCombat?.());
    this.autoCombatCfgBtn?.addEventListener('click', () => this.autoCombatPanelEl?.classList.toggle('hidden'));
    document.getElementById('btn-close-autocombat-cfg')?.addEventListener('click', () => this.autoCombatPanelEl?.classList.add('hidden'));

    const emitAcPatch = () => {
      this.onUpdateAutoCombatConfig?.({
        autoAttack: (document.getElementById('ac-attack') as HTMLInputElement | null)?.checked !== false,
        autoSkill: (document.getElementById('ac-skill') as HTMLInputElement | null)?.checked !== false,
        autoTarget: (document.getElementById('ac-target') as HTMLInputElement | null)?.checked !== false,
        autoLoot: (document.getElementById('ac-loot') as HTMLInputElement | null)?.checked !== false,
        returnToAnchor: (document.getElementById('ac-return') as HTMLInputElement | null)?.checked !== false,
        autoPotionHp: (document.getElementById('ac-hp-pot') as HTMLInputElement | null)?.checked !== false,
        hpThresholdPct: Number((document.getElementById('ac-hp-pct') as HTMLInputElement | null)?.value || 55),
        autoPotionMp: (document.getElementById('ac-mp-pot') as HTMLInputElement | null)?.checked !== false,
        mpThresholdPct: Number((document.getElementById('ac-mp-pct') as HTMLInputElement | null)?.value || 35),
        targetPriority: ((document.getElementById('ac-priority') as HTMLSelectElement | null)?.value || 'nearest'),
      });
    };
    ['ac-attack', 'ac-skill', 'ac-target', 'ac-loot', 'ac-return', 'ac-hp-pot', 'ac-mp-pot', 'ac-hp-pct', 'ac-mp-pct', 'ac-priority'].forEach((id) => {
      document.getElementById(id)?.addEventListener('change', emitAcPatch);
    });
    this.dialogCloseBtn?.addEventListener('click', () => {
      this.dialogBox?.classList.add('hidden');
    });

    this.chatCollapseBtn?.addEventListener('click', () => {
      if (!this.chatDockEl) return;
      const collapsed = this.chatDockEl.classList.toggle('collapsed');
      if (this.chatCollapseBtn) this.chatCollapseBtn.textContent = collapsed ? '+' : '−';
    });

    document.querySelectorAll<HTMLElement>('#hud-chat-tabs [data-channel]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.activeChatFilter = (btn.dataset.channel as any) || 'all';
        document.querySelectorAll('#hud-chat-tabs .hud-chat-tab').forEach((t) => t.classList.remove('active'));
        btn.classList.add('active');
        if (this.chatWhisperTargetEl) {
          this.chatWhisperTargetEl.classList.toggle('hidden', this.activeChatFilter !== 'whisper');
        }
        this.renderChatLog();
      });
    });

    this.chatFormEl?.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = this.chatInputEl?.value.trim() || '';
      if (!text) return;
      const sendChannel = this.activeChatFilter === 'all' ? 'general' : this.activeChatFilter;
      const targetName = sendChannel === 'whisper' ? this.chatWhisperTargetEl?.value.trim() : undefined;
      this.onSendChat?.(sendChannel, text, targetName);
      if (this.chatInputEl) this.chatInputEl.value = '';
    });
  }

  public setConnectionState(connected: boolean, reconnecting = false) {
    if (this.connDotEl) {
      this.connDotEl.classList.toggle('online', connected);
      this.connDotEl.classList.toggle('offline', !connected);
      this.connDotEl.title = connected ? 'Đã kết nối Server Socket.IO' : 'Mất kết nối Server';
    }
    if (this.reconnectBanner) {
      this.reconnectBanner.classList.toggle('hidden', connected || !reconnecting);
    }
  }

  public setSocialBadgeCount(count: number) {
    if (!this.socialBadgeEl) return;
    if (count > 0) {
      this.socialBadgeEl.textContent = String(count);
      this.socialBadgeEl.classList.remove('hidden');
    } else {
      this.socialBadgeEl.classList.add('hidden');
    }
  }

  public startWhisperTo(name: string) {
    this.activeChatFilter = 'whisper';
    document.querySelectorAll<HTMLElement>('#hud-chat-tabs [data-channel]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.channel === 'whisper');
    });
    if (this.chatWhisperTargetEl) {
      this.chatWhisperTargetEl.classList.remove('hidden');
      this.chatWhisperTargetEl.value = name;
    }
    if (this.chatDockEl?.classList.contains('collapsed')) {
      this.chatDockEl.classList.remove('collapsed');
      if (this.chatCollapseBtn) this.chatCollapseBtn.textContent = '−';
    }
    this.chatInputEl?.focus();
    this.renderChatLog();
  }

  public appendChatMessage(msg: MultiplayerChatMessage) {
    this.chatHistory.push(msg);
    if (this.chatHistory.length > 80) this.chatHistory.shift();
    this.renderChatLog();
  }

  private renderChatLog() {
    if (!this.chatLogEl) return;
    const esc = (s: unknown) =>
      String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    const tagMap: Record<string, string> = {
      general: '[Khu]',
      global: '[Thế Giới]',
      party: '[Nhóm]',
      guild: '[Bang]',
      merchant: '[Thương]',
      whisper: '[Mật]',
      system: '[Hệ Thống]',
    };
    const visible = this.chatHistory.filter(
      (m) => this.activeChatFilter === 'all' || m.channel === this.activeChatFilter || m.channel === 'system'
    );
    this.chatLogEl.innerHTML = visible
      .map(
        (m) => `
          <div class="hud-chat-line">
            <span class="hud-chat-chan ${esc(m.channel)}">${tagMap[m.channel] || `[${esc(m.channel)}]`}</span>
            ${m.channel === 'system' ? '' : `<span class="hud-chat-sender" data-sender="${esc(m.sender)}">${esc(m.sender)}</span>: `}
            <span>${esc(m.message)}</span>
          </div>
        `
      )
      .join('');
    this.chatLogEl.querySelectorAll<HTMLElement>('.hud-chat-sender').forEach((el) => {
      el.addEventListener('click', () => {
        const name = el.dataset.sender;
        if (name) this.startWhisperTo(name);
      });
    });
    this.chatLogEl.scrollTop = this.chatLogEl.scrollHeight;
  }

  public setStatPointsPreview(override: number | null) {
    this.previewPotentialPoints = override;
    this.renderStatBadge();
  }

  private renderStatBadge() {
    if (!this.statBadgeEl) return;
    const pts = Math.max(0, Number(this.previewPotentialPoints ?? this.committedPotentialPoints ?? 0));
    if (pts > 0) {
      this.statBadgeEl.textContent = `+${pts} Điểm`;
      this.statBadgeEl.classList.remove('zero');
    } else {
      this.statBadgeEl.textContent = '0 Điểm';
      this.statBadgeEl.classList.add('zero');
    }
  }

  public closeNpcDialogIfOpen(): boolean {
    if (!this.dialogBox || this.dialogBox.classList.contains('hidden')) return false;
    this.dialogBox.classList.add('hidden');
    return true;
  }

  public showNpcDialog(
    npc: NpcEntity,
    snap?: HudSnapshot | null,
    dialogueTopics: Array<{ keyword: string; label: string; isHiddenHint?: boolean }> = []
  ) {
    if (!this.dialogBox || !this.dialogText) return;
    const portraitUrl =
      NPC_PORTRAITS[npc.id] ||
      SPRITE_PORTRAIT_FALLBACKS[npc.spriteId] ||
      '/assets/elysia/ui/portrait-elder.png';
    if (this.dialogPortrait) {
      if (portraitUrl) {
        this.dialogPortrait.src = portraitUrl;
        this.dialogPortrait.classList.remove('hidden');
      } else {
        this.dialogPortrait.classList.add('hidden');
      }
    }

    const lines = String(npc.dialogue || 'Chào mừng lữ khách đến với Elysia Frontier!')
      .split(/(?<=[.!?])\s+/)
      .filter((s) => s.trim().length > 0);
    let lineIdx = 0;
    const renderLine = () => {
      const roleTag = npc.role ? ` <span style="color:#fcd34d;font-size:11px;">(${npc.role})</span>` : '';
      const pageTag = lines.length > 1 ? ` <span style="opacity:0.7;font-size:11px;">[${lineIdx + 1}/${lines.length}]</span>` : '';
      this.dialogText.innerHTML = `<strong>${npc.name}${roleTag}:</strong> "${lines[lineIdx] || npc.dialogue}"${pageTag}`;
    };
    renderLine();

    if (this.dialogActions) {
      this.dialogActions.innerHTML = '';

      if (lines.length > 1) {
        const nextBtn = document.createElement('button');
        nextBtn.type = 'button';
        nextBtn.className = 'tk-tab-btn';
        nextBtn.textContent = 'Tiếp theo ▸';
        nextBtn.addEventListener('click', () => {
          lineIdx = (lineIdx + 1) % lines.length;
          renderLine();
        });
        this.dialogActions.appendChild(nextBtn);
      }

      // Check worldQuests for quests ready to complete or available to accept from this NPC
      const worldQuests = snap?.worldQuests || [];
      const matchesNpc = (targetNpcId: string) => {
        if (!targetNpcId) return false;
        if (targetNpcId === npc.id) return true;
        const nId = npc.id.toLowerCase();
        const tId = targetNpcId.toLowerCase();
        if (nId.includes('elder') && tId.includes('elder')) return true;
        if (nId.includes('trainer') && (tId.includes('trainer') || tId.includes('guard') || tId.includes('hunter'))) return true;
        if (nId.includes('merchant') && (tId.includes('merchant') || tId.includes('blacksmith') || tId.includes('smith'))) return true;
        if (nId.includes('priest') && (tId.includes('priest') || tId.includes('asica') || tId.includes('sage'))) return true;
        return false;
      };

      const readyWorldQuests = worldQuests.filter(
        (q) => q.state === 'ready_to_claim' && (matchesNpc(q.endNpcId) || matchesNpc(q.startNpcId) || npc.id === 'npc_elder')
      );
      for (const rq of readyWorldQuests) {
        const claimBtn = document.createElement('button');
        claimBtn.type = 'button';
        claimBtn.className = 'tk-action-btn';
        claimBtn.style.background = 'linear-gradient(180deg, #16a34a, #14532d)';
        claimBtn.textContent = `✨ Báo Cáo & Nhận Thưởng: ${rq.name}`;
        claimBtn.addEventListener('click', () => {
          this.onClaimWorldQuest?.(rq.id);
          this.dialogBox.classList.add('hidden');
        });
        this.dialogActions.appendChild(claimBtn);
      }

      // Strictly exclude undiscovered hidden quests from NPC accept options
      const availableWorldQuests = worldQuests.filter(
        (q) =>
          (q.state === 'available' || q.state === 'unlocked_hidden') &&
          (!q.isHidden || q.state === 'unlocked_hidden') &&
          (matchesNpc(q.startNpcId) || (npc.id === 'npc_elder' && !q.startNpcId))
      );
      for (const aq of availableWorldQuests.slice(0, 3)) {
        const acceptBtn = document.createElement('button');
        acceptBtn.type = 'button';
        acceptBtn.className = 'tk-action-btn';
        acceptBtn.textContent = `📜 Nhận Nhiệm Vụ: ${aq.name} (Lv.${aq.requiredLevel})`;
        acceptBtn.addEventListener('click', () => {
          this.onAcceptWorldQuest?.(aq.id);
          this.dialogBox.classList.add('hidden');
        });
        this.dialogActions.appendChild(acceptBtn);
      }

      for (const topic of dialogueTopics) {
        const tBtn = document.createElement('button');
        tBtn.type = 'button';
        tBtn.className = 'tk-action-btn';
        tBtn.style.background = topic.isHiddenHint ? 'linear-gradient(180deg,#5b21b6,#3b0764)' : '';
        tBtn.textContent = topic.label;
        tBtn.addEventListener('click', () => {
          this.onNpcDialogueTopic?.(npc.id, topic.keyword);
          this.dialogBox.classList.add('hidden');
        });
        this.dialogActions.appendChild(tBtn);
      }

      const hasLegacyClaimable = snap?.quests.some((q) => q.completed && !q.claimed && q.giver === npc.name);
      if (hasLegacyClaimable && readyWorldQuests.length === 0) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tk-action-btn';
        btn.textContent = 'Nhận Thưởng Nhiệm Vụ';
        btn.addEventListener('click', () => {
          this.onClaimQuest?.();
          this.dialogBox.classList.add('hidden');
        });
        this.dialogActions.appendChild(btn);
      }

      if (npc.id === 'npc_merchant' || npc.serviceType === 'shop' || npc.serviceType === 'blacksmith') {
        const shopBtn = document.createElement('button');
        shopBtn.type = 'button';
        shopBtn.className = 'tk-action-btn';
        shopBtn.textContent = '🏪 Mua & Bán Vật Phẩm';
        shopBtn.addEventListener('click', () => {
          this.dialogBox.classList.add('hidden');
          this.onOpenShop?.();
        });
        this.dialogActions.append(shopBtn);
      }
      if (npc.id === 'npc_merchant' || npc.serviceType === 'storage') {
        const storeBtn = document.createElement('button');
        storeBtn.type = 'button';
        storeBtn.className = 'tk-action-btn';
        storeBtn.textContent = '📦 Mở Kho Lưu Trữ';
        storeBtn.addEventListener('click', () => {
          this.dialogBox.classList.add('hidden');
          this.onOpenStorage?.();
        });
        this.dialogActions.append(storeBtn);
      }
      if (npc.serviceType === 'job_advancement' || npc.id === 'NPC_HIGH_PRIEST' || npc.id === 'NPC_GRAND_SAGE_OF_AWAKENING' || npc.id === 'NPC_JOB_MASTER_ASICA') {
        const jobBtn = document.createElement('button');
        jobBtn.type = 'button';
        jobBtn.className = 'tk-action-btn';
        jobBtn.textContent = npc.id === 'NPC_HIGH_PRIEST'
          ? '⛪ Nghi Lễ Chuyển Chức (Lv.15 & Lv.80)'
          : 'Nghi Lễ Thức Tỉnh Tự Động (Lv.15)';
        jobBtn.addEventListener('click', () => {
          this.dialogBox.classList.add('hidden');
          this.onOpenJob?.();
        });
        this.dialogActions.append(jobBtn);

        const vfxBtn = document.createElement('button');
        vfxBtn.type = 'button';
        vfxBtn.className = 'tk-tab-btn active';
        vfxBtn.textContent = '✨ Chiêm Ngưỡng Nghi Lễ VFX';
        vfxBtn.addEventListener('click', () => {
          this.dialogBox.classList.add('hidden');
          this.onReplayJobRitual?.();
        });
        this.dialogActions.append(vfxBtn);

        const priestQuestBtn = document.createElement('button');
        priestQuestBtn.type = 'button';
        priestQuestBtn.className = 'tk-tab-btn';
        priestQuestBtn.textContent = '📜 Nhiệm Vụ Điện Thánh';
        priestQuestBtn.addEventListener('click', () => {
          this.dialogBox.classList.add('hidden');
          this.onOpenQuests?.();
        });
        this.dialogActions.append(priestQuestBtn);
      }
      if (npc.serviceType === 'teleport' || npc.id === 'npc_elder') {
        const tpBtn = document.createElement('button');
        tpBtn.type = 'button';
        tpBtn.className = 'tk-action-btn';
        tpBtn.textContent = '🗺️ Bản Đồ & Dịch Chuyển';
        tpBtn.addEventListener('click', () => {
          this.dialogBox.classList.add('hidden');
          this.onOpenWorldMap?.();
        });
        this.dialogActions.append(tpBtn);
      }
      if (npc.serviceType === 'crafting' || npc.serviceType === 'blacksmith' || npc.serviceType === 'shop') {
        const craftBtn = document.createElement('button');
        craftBtn.type = 'button';
        craftBtn.className = 'tk-action-btn';
        craftBtn.textContent = '⚒️ Lò Rèn · Chế Tạo & Cường Hóa';
        craftBtn.addEventListener('click', () => {
          this.dialogBox.classList.add('hidden');
          this.onOpenCrafting?.();
        });
        this.dialogActions.append(craftBtn);

        const repairBtn = document.createElement('button');
        repairBtn.type = 'button';
        repairBtn.className = 'tk-tab-btn';
        repairBtn.textContent = '🔧 Sửa Chữa Trang Bị';
        repairBtn.addEventListener('click', () => {
          this.onRepairEquipment?.();
          this.dialogBox.classList.add('hidden');
        });
        this.dialogActions.append(repairBtn);
      }
      if (npc.serviceType?.startsWith('profession:')) {
        const profId = npc.serviceType.split(':')[1];
        const pBtn = document.createElement('button');
        pBtn.type = 'button';
        pBtn.className = 'tk-action-btn';
        pBtn.textContent = '🌿 Mở Bàn Kỹ Năng Nghề';
        pBtn.addEventListener('click', () => {
          this.dialogBox.classList.add('hidden');
          this.onOpenProfessions?.(profId);
        });
        this.dialogActions.append(pBtn);
      }
      if (npc.id === 'npc_elder' || npc.id === 'npc_trainer' || npc.serviceType === 'quest_hq') {
        const qBtn = document.createElement('button');
        qBtn.type = 'button';
        qBtn.className = 'tk-tab-btn active';
        qBtn.textContent = '📜 Mở Nhật Ký Nhiệm Vụ';
        qBtn.addEventListener('click', () => {
          this.dialogBox.classList.add('hidden');
          this.onOpenQuests?.();
        });
        this.dialogActions.appendChild(qBtn);
      }

      const closeDialogBtn = document.createElement('button');
      closeDialogBtn.type = 'button';
      closeDialogBtn.className = 'tk-tab-btn';
      closeDialogBtn.textContent = 'Đóng / Tạm Biệt';
      closeDialogBtn.addEventListener('click', () => {
        this.dialogBox.classList.add('hidden');
      });
      this.dialogActions.appendChild(closeDialogBtn);
    }
    this.dialogBox.classList.remove('hidden');
  }

  public showToast(msg: string, variant: 'info' | 'success' | 'error' = 'info') {
    if (this.toastContainer) {
      const toast = document.createElement('div');
      toast.className = `tk-toast ${variant}`;
      toast.textContent = msg;
      this.toastContainer.appendChild(toast);
      setTimeout(() => {
        toast.remove();
      }, 3400);
      return;
    }
    if (!this.dialogBox || !this.dialogText) return;
    this.dialogPortrait?.classList.add('hidden');
    if (this.dialogActions) this.dialogActions.innerHTML = '';
    this.dialogText.textContent = msg;
    this.dialogBox.classList.remove('hidden');
  }

  public sync(snap: HudSnapshot) {
    this.committedPotentialPoints = Math.max(0, Number(snap.stats.potentialPoints ?? 0));
    this.renderStatBadge();

    const cosmeticPrefix = snap.stats.equippedCosmeticTitleName ? `[${snap.stats.equippedCosmeticTitleName}] ` : '';
    const displayName = `${cosmeticPrefix}${snap.playerName}`;
    if (this.nameEl.textContent !== displayName) this.nameEl.textContent = displayName;
    if (this.jobEl) {
      const jobMap: Record<string, string> = {
        adventurer: 'Tân Thủ (Novice)',
        novice: 'Tân Thủ (Novice)',
        swordsman: 'Kiếm Sĩ',
        spearman: 'Thương Sĩ',
        knight: 'Kỵ Sĩ',
        monk: 'Tu Sĩ',
        mage: 'Pháp Sư',
        assassin: 'Sát Thủ',
        fighter: 'Võ Sư',
        archer: 'Cung Thủ',
      };
      const jobText = snap.secondJobName || jobMap[snap.classId.toLowerCase()] || snap.classId;
      if (this.jobEl.textContent !== jobText) this.jobEl.textContent = jobText;
    }
    if (this.onlineCountEl && typeof snap.onlineCount === 'number') {
      const oc = String(snap.onlineCount);
      if (this.onlineCountEl.textContent !== oc) this.onlineCountEl.textContent = oc;
    }
    if (this.pingEl && typeof snap.pingMs === 'number') {
      const ps = snap.pingMs > 0 ? `${snap.pingMs}ms` : '--ms';
      if (this.pingEl.textContent !== ps) this.pingEl.textContent = ps;
    }
    if (this.connDotEl) {
      const ok = Boolean(snap.isOnlineConnected);
      this.connDotEl.classList.toggle('online', ok);
      this.connDotEl.classList.toggle('offline', !ok);
    }
    const lvlStr = `Lv.${snap.level}`;
    if (this.lvlEl.textContent !== lvlStr) this.lvlEl.textContent = lvlStr;
    if (this.zoneTitleEl) {
      const safeTag = snap.isSafeZone ? ' (An Toàn)' : '';
      const zoneText = `${snap.regionName}${safeTag}`;
      if (this.zoneTitleEl.textContent !== zoneText) this.zoneTitleEl.textContent = zoneText;
    }

    const skillsSig = snap.skills.map((s) => `${s.id}:${s.locked ? 1 : 0}`).join('|');
    if (skillsSig !== this.cachedSkillsSig) {
      this.cachedSkillsSig = skillsSig;
      this.buildHotbar(snap.skills);
    }

    const hpKey = `${snap.hp}/${snap.maxHp}`;
    if (hpKey !== this.cachedHp) {
      this.cachedHp = hpKey;
      this.hpBar.style.width = `${Math.round((snap.hp / Math.max(1, snap.maxHp)) * 100)}%`;
      this.hpText.textContent = hpKey;
    }

    const mpKey = `${snap.mp}/${snap.maxMp}`;
    if (mpKey !== this.cachedMp) {
      this.cachedMp = mpKey;
      this.mpBar.style.width = `${Math.round((snap.mp / Math.max(1, snap.maxMp)) * 100)}%`;
      this.mpText.textContent = mpKey;
    }

    const expKey = `${snap.stats.exp}/${snap.stats.maxExp} EXP`;
    if (expKey !== this.cachedExp && this.expBar && this.expText) {
      this.cachedExp = expKey;
      this.expBar.style.width = `${Math.min(100, Math.round((snap.stats.exp / Math.max(1, snap.stats.maxExp)) * 100))}%`;
      this.expText.textContent = expKey;
    }

    const coordStr = `X:${String(snap.tx).padStart(2, '0')} Y:${String(snap.ty).padStart(2, '0')}`;
    if (coordStr !== this.cachedCoords) {
      this.cachedCoords = coordStr;
      this.coordsEl.textContent = coordStr;
    }

    // STRICT SINGLE-QUEST TRACKER RULE: Display at most ONE tracked quest at a time on the HUD
    const tracked = (snap as HudSnapshot & { trackedQuest?: any }).trackedQuest || null;
    const qStr = tracked
      ? `${tracked.id}|${tracked.name}|${tracked.state}|${(tracked.objectives || []).map((o: any) => `${o.id}:${o.current}/${o.required}`).join(',')}`
      : 'NO_TRACKED_QUEST';
    if (qStr !== this.cachedQuest) {
      this.cachedQuest = qStr;
      if (tracked) {
        this.questCard?.setAttribute('data-tracked-quest-id', tracked.id);
        this.questTitleEl.textContent = tracked.name;
        if (this.questBadgeEl) {
          this.questBadgeEl.textContent = tracked.state === 'ready_to_claim' ? '✓' : '!';
          this.questBadgeEl.style.color = tracked.state === 'ready_to_claim' ? '#4ade80' : '#fde047';
        }
        const objs = Array.isArray(tracked.objectives) ? tracked.objectives : [];
        if (this.questObjectivesListEl && objs.length > 0) {
          this.questObjectivesListEl.innerHTML = objs
            .map(
              (o: any) => `
              <div class="quest-card-obj">
                <span>${o.description}</span>
                <strong>${o.current}/${o.required}</strong>
              </div>
            `
            )
            .join('');
        } else {
          this.questObjEl.textContent = tracked.description || 'Đang thực hiện nhiệm vụ';
          this.questCountEl.textContent = tracked.state === 'ready_to_claim' ? 'Hoàn tất' : '0/1';
        }
        this.questUntrackBtn?.classList.remove('hidden');
      } else {
        this.questCard?.setAttribute('data-tracked-quest-id', '');
        this.questTitleEl.textContent = 'Chưa theo dõi nhiệm vụ';
        if (this.questBadgeEl) {
          this.questBadgeEl.textContent = '·';
          this.questBadgeEl.style.color = '#94a3b8';
        }
        if (this.questObjectivesListEl) {
          this.questObjectivesListEl.innerHTML = `
            <div class="quest-card-obj">
              <span id="hud-quest-obj">Mở Nhật Ký [L] để chọn 1 nhiệm vụ theo dõi</span>
              <strong id="hud-quest-count"></strong>
            </div>
          `;
        } else {
          this.questObjEl.textContent = 'Mở Nhật Ký [L] để chọn 1 nhiệm vụ theo dõi';
          this.questCountEl.textContent = '';
        }
        this.questUntrackBtn?.classList.add('hidden');
      }
    }

    for (const s of snap.skills) {
      const mask = this.slotElems.get(s.id);
      if (!mask) continue;
      const cd = snap.cooldowns[s.id] || 0;
      if (cd > 0.05) {
        mask.classList.remove('hidden');
        mask.textContent = cd.toFixed(1);
      } else {
        mask.classList.add('hidden');
      }
    }

    for (const key of ['potion_hp', 'potion_mp', 'scroll_town'] as const) {
      const badge = this.quickCountElems.get(key);
      if (!badge) continue;
      const totalQty = snap.inventory.filter((it) => it.iconKey === key).reduce((sum, it) => sum + it.qty, 0);
      badge.textContent = String(totalQty);
    }

    const activeBoss = (snap as HudSnapshot & { activeBoss?: any }).activeBoss || null;
    if (this.bossBar) {
      if (activeBoss && activeBoss.hp > 0) {
        this.bossBar.classList.remove('hidden');
        this.bossBar.classList.toggle('enraged', Boolean(activeBoss.enraged));
        if (this.bossNameEl) this.bossNameEl.textContent = `${activeBoss.name} · Lv.${activeBoss.level}`;
        if (this.bossTagEl) {
          this.bossTagEl.textContent = `${activeBoss.category || 'BOSS'} · GIAI ĐOẠN ${activeBoss.activePhase || 1}${activeBoss.enraged ? ' (CUỒNG NỘ)' : ''}`;
        }
        const pct = Math.max(0, Math.min(100, Math.round((activeBoss.hp / Math.max(1, activeBoss.maxHp)) * 100)));
        if (this.bossFillEl) this.bossFillEl.style.width = `${pct}%`;
        if (this.bossHpTextEl) this.bossHpTextEl.textContent = `${activeBoss.hp.toLocaleString()} / ${activeBoss.maxHp.toLocaleString()}`;
        if (this.bossPortrait) {
          const pUrl = activeBoss.portraitUrl || '/assets/elysia/ui/portrait-ancient-treant.png';
          if (this.bossPortrait.getAttribute('src') !== pUrl) this.bossPortrait.src = pUrl;
        }
        if (this.bossTelegraphEl) {
          if (activeBoss.telegraph?.skillName) {
            this.bossTelegraphEl.textContent = `⚠ ${activeBoss.telegraph.skillName} (${Math.max(1, Math.ceil((activeBoss.telegraph.remainingMs || 1500) / 1000))}s)`;
            this.bossTelegraphEl.classList.remove('hidden');
          } else {
            this.bossTelegraphEl.classList.add('hidden');
          }
        }
      } else {
        this.bossBar.classList.add('hidden');
      }
    }

    const extSnap = snap as HudSnapshot & {
      deathPenalty?: { statReductionPct: number; expiresAt: number; tier?: string } | null;
      latestVillageCheckpointName?: string;
      autoCombatConfig?: { enabled: boolean; targetPriority?: string; hpThresholdPct?: number; mpThresholdPct?: number; autoAttack?: boolean; autoSkill?: boolean; autoTarget?: boolean; autoLoot?: boolean; returnToAnchor?: boolean; autoPotionHp?: boolean; autoPotionMp?: boolean };
    };
    if (this.deathPenaltyPillEl) {
      const dp = extSnap.deathPenalty;
      const remainingSec = dp ? Math.max(0, Math.ceil((dp.expiresAt - Date.now()) / 1000)) : 0;
      if (dp && remainingSec > 0) {
        const hrs = Math.floor(remainingSec / 3600);
        const mins = Math.floor((remainingSec % 3600) / 60);
        const secs = remainingSec % 60;
        const clock = hrs > 0
          ? `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
          : `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        this.deathPenaltyPillEl.textContent = `💀 -${dp.statReductionPct}% · ${clock}`;
        this.deathPenaltyPillEl.title = `Trạng thái Suy Yếu (${dp.tier || ''}): giảm ${dp.statReductionPct}% chỉ số trong ${clock}`;
        this.deathPenaltyPillEl.classList.remove('hidden');
      } else {
        this.deathPenaltyPillEl.classList.add('hidden');
      }
    }
    if (this.checkpointPillEl && extSnap.latestVillageCheckpointName) {
      this.checkpointPillEl.textContent = `🏰 ${extSnap.latestVillageCheckpointName}`;
    }
    if (this.autoCombatToggleBtn && extSnap.autoCombatConfig) {
      const active = Boolean(extSnap.autoCombatConfig.enabled);
      this.autoCombatToggleBtn.classList.toggle('active', active);
      this.autoCombatToggleBtn.textContent = active ? '⚔️ Auto: BẬT [Z]' : '⚔️ Auto: TẮT [Z]';
    }
  }

  public setTransitionState(state: { active: boolean; title?: string; subtitle?: string; reduced?: boolean }) {
    if (!this.transitionCurtainEl) return;
    this.transitionCurtainEl.classList.toggle('reduced', Boolean(state.reduced));
    if (state.active) {
      if (this.transitionTitleEl && state.title) this.transitionTitleEl.textContent = state.title;
      if (this.transitionSubEl && state.subtitle) this.transitionSubEl.textContent = state.subtitle;
      this.transitionCurtainEl.classList.remove('hidden');
    } else {
      this.transitionCurtainEl.classList.add('hidden');
    }
  }

  public renderMinimap(tilemap: TilemapEngine, player: PlayerEntity, npcs: NpcEntity[], monsters: MonsterEntity[]) {
    const mw = this.minimapCanvas.width;
    const mh = this.minimapCanvas.height;
    const base = tilemap.getMinimapBase();
    const ctx = this.minimapCtx;

    ctx.clearRect(0, 0, mw, mh);
    ctx.drawImage(base, 0, 0, base.width, base.height, 0, 0, mw, mh);

    const sx = mw / tilemap.worldWidth;
    const sy = mh / tilemap.worldHeight;

    ctx.fillStyle = '#fde047';
    for (const npc of npcs) {
      ctx.fillRect(npc.x * sx - 2, npc.y * sy - 2, 4, 4);
    }
    ctx.fillStyle = '#ef4444';
    for (const m of monsters) {
      if (!m.alive) continue;
      ctx.fillRect(m.x * sx - 1.5, m.y * sy - 1.5, 3, 3);
    }
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#14532d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x * sx, player.y * sy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  private buildHotbar(skills: HudSnapshot['skills']) {
    if (!this.hotbarEl) return;
    this.hotbarEl.innerHTML = '';
    this.slotElems.clear();
    this.quickCountElems.clear();

    const hotbarSkills = skills.filter((s) => s.skillType !== 'passive' && s.tier !== 'passive').slice(0, 6);
    for (const skill of hotbarSkills) {
      const slot = document.createElement('button');
      slot.type = 'button';
      slot.className = `hotbar-slot tk-hotbar-skill ${skill.locked ? 'locked' : ''}`;
      slot.title = skill.locked ? skill.desc : `${skill.name} (${skill.mpCost} MP) · [${skill.key}]`;

      const artHtml = skill.iconUrl
        ? `<img src="${skill.iconUrl}" alt="${skill.name}" class="tk-skill-vfx-thumb" />`
        : skill.vfxKey
        ? `<img src="/assets/elysia/vfx/${skill.vfxKey}_thumb.png" alt="${skill.name}" class="tk-skill-vfx-thumb" />`
        : getSkillIconSvg(skill.iconKey);

      if (skill.locked) {
        slot.innerHTML = `
          <span class="hotbar-lock-badge">${getPadlockSmallSvg()}</span>
          <span class="hotbar-locked-key">${skill.key}</span>
          <div class="hotbar-cd-mask hidden"></div>
        `;
      } else {
        slot.innerHTML = `
          <div class="hotbar-art-layer">${artHtml}</div>
          <span class="hotbar-key-tag">${skill.key}</span>
          <span class="hotbar-mp-tag">${skill.mpCost}</span>
          <div class="hotbar-cd-mask hidden"></div>
        `;
        slot.addEventListener('click', () => this.onCastSkill?.(skill.id));
      }

      const mask = slot.querySelector('.hotbar-cd-mask') as HTMLElement;
      this.slotElems.set(skill.id, mask);
      this.hotbarEl.appendChild(slot);
    }

    const sep = document.createElement('div');
    sep.className = 'hotbar-bronze-divider';
    this.hotbarEl.appendChild(sep);

    // Quick Consumables Bar (HP Potion, MP Potion, Town Scroll)
    const quickItems: { iconKey: 'potion_hp' | 'potion_mp' | 'scroll_town'; key: string; label: string }[] = [
      { iconKey: 'potion_hp', key: 'Q', label: 'Dùng Bình Sinh Lực [Q]' },
      { iconKey: 'potion_mp', key: 'R', label: 'Dùng Bình Ma Pháp [R]' },
      { iconKey: 'scroll_town', key: 'T', label: 'Cuộn Giấy Hồi Thành [T]' },
    ];
    for (const q of quickItems) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'hotbar-slot tk-quick-slot';
      btn.title = q.label;
      btn.innerHTML = `
        <div class="hotbar-art-layer">${getItemIconSvg(q.iconKey)}</div>
        <span class="hotbar-key-tag">${q.key}</span>
        <span class="hotbar-mp-tag" data-quick-qty="${q.iconKey}">0</span>
      `;
      btn.addEventListener('click', () => this.onQuickUse?.(q.iconKey));
      this.quickCountElems.set(q.iconKey, btn.querySelector(`[data-quick-qty="${q.iconKey}"]`) as HTMLElement);
      this.hotbarEl.appendChild(btn);
    }

    const sep2 = document.createElement('div');
    sep2.className = 'hotbar-bronze-divider';
    this.hotbarEl.appendChild(sep2);

    const bagBtn = document.createElement('button');
    bagBtn.type = 'button';
    bagBtn.id = 'btn-hotbar-balo';
    bagBtn.className = 'hotbar-slot tk-hotbar-balo';
    bagBtn.title = 'Mở Nhân Vật, Trang Bị & Balo [B]';
    bagBtn.innerHTML = `
      <div class="hotbar-art-layer">${getBackpackIconSvg()}</div>
      <span class="hotbar-key-tag">B</span>
    `;
    bagBtn.addEventListener('click', () => this.onOpenBag?.());
    this.hotbarEl.appendChild(bagBtn);
  }
}
