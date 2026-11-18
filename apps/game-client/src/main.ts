import './ui/elysia-ui.css';
import './ui/asset-theme.css';
import { GameEngine } from './engine/GameEngine';
import { SpriteRegistryDoc, VillageMapData } from './engine/types';
import { BaloEquipModal } from './ui/BaloEquipModal';
import { ElysiaHUD } from './ui/ElysiaHUD';
import { SkillFrameModal } from './ui/SkillFrameModal';
import { WorldModals } from './ui/WorldModals';
import { AwakeningCinematicModal } from './ui/AwakeningCinematicModal';
import { CharacterCreationModal } from './ui/CharacterCreationModal';
import { AuthModal } from './ui/AuthModal';
import { SettingsModal } from './ui/SettingsModal';
import { EventModal } from './ui/EventModal';
import { SocialTradeModal } from './ui/SocialTradeModal';
import { ProfessionModal } from './ui/ProfessionModal';
import { GuildMerchantModal } from './ui/GuildMerchantModal';
import { DeathOverlayModal } from './ui/DeathOverlayModal';
import { modalManager } from './ui/ModalManager';
import { MultiplayerClient } from './services/multiplayerClient';
import { ArtworkLibrary } from './engine/ArtworkLibrary';
import type { ArtworkManifest } from './engine/types';
import { GAME_BRANDING } from '@elysia/game-data-schema';
import { ElysiaLandingPage } from './landing/ElysiaLandingPage';
import {
  clearAuthSession,
  fetchCharacterByIdApi,
  fetchCharactersApi,
  getActiveCharacterCache,
  getAuthToken,
  guestAuthApi,
  validateSessionApi,
} from './services/apiClient';

async function hydrateInitialServerCharacter(
  engine: GameEngine,
  hud: ElysiaHUD,
  authModal: AuthModal,
  charCreationModal: CharacterCreationModal
) {
  const isFresh = window.location.search.includes('fresh=1');
  const autoGuest = window.location.search.includes('guest=1');
  if (isFresh) {
    clearAuthSession();
    try {
      localStorage.removeItem('elysia_character_save_v1');
      const cleanUrl = `${window.location.pathname}${window.location.hash || ''}`;
      window.history.replaceState({}, '', cleanUrl);
    } catch {
      // ignore history restrictions
    }
  }

  try {
    const token = getAuthToken();
    const cachedChar = getActiveCharacterCache();

    if (token && cachedChar?.id) {
      const live = await fetchCharacterByIdApi(cachedChar.id);
      if (live?.character) {
        engine.hydrateFromServerCharacter(live.character, live.computedStats);
        return;
      }
      const sessionValid = await validateSessionApi();
      if (sessionValid) {
        const chars = await fetchCharactersApi();
        if (chars.length > 0) {
          const pick = chars.find((c) => c.id === cachedChar.id) || chars[0];
          const refreshed = await fetchCharacterByIdApi(pick.id);
          engine.hydrateFromServerCharacter(refreshed?.character || pick, refreshed?.computedStats);
          return;
        }
        hud.showToast('Tài khoản chưa có nhân vật — hãy tạo nhân vật đầu tiên!', 'info');
        charCreationModal.open();
        return;
      }
    }

    if (token) {
      const sessionValid = await validateSessionApi();
      if (sessionValid) {
        const chars = await fetchCharactersApi();
        if (chars.length > 0) {
          const live = await fetchCharacterByIdApi(chars[0].id);
          engine.hydrateFromServerCharacter(live?.character || chars[0], live?.computedStats);
          return;
        }
        charCreationModal.open();
        return;
      }
    }

    if (autoGuest) {
      const guest = await guestAuthApi();
      if (guest.success && guest.character) {
        engine.hydrateFromServerCharacter(guest.character, guest.computedStats);
        return;
      }
    }

    // Standard Game Flow: Present Landing Page for new visitors unless direct play/login was requested
    const params = new URLSearchParams(window.location.search);
    const wantsPlay = params.has('play') || params.has('game') || params.has('token');
    const wantsLogin = params.get('action') === 'login';
    const wantsRegister = params.get('action') === 'register';

    if (wantsLogin) {
      void authModal.open('login');
      return;
    }
    if (wantsRegister) {
      void authModal.open('register');
      return;
    }
    if (wantsPlay) {
      void authModal.open('welcome');
      return;
    }

    // Default entry: Launch official Landing Page connected to the real game
    const landing = new ElysiaLandingPage({
      onLaunchGame: () => {
        landing.destroy();
        void authModal.open('welcome');
      },
      onOpenAuth: (tab) => {
        landing.destroy();
        void authModal.open(tab || 'login');
      },
    });
    landing.render(document.body);
  } catch (err) {
    console.warn('[Session] Không thể đồng bộ nhân vật từ server khi khởi động:', err);
    hud.showToast('Không thể kết nối máy chủ — mở màn hình tài khoản để thử lại hoặc chơi ngoại tuyến.', 'error');
    void authModal.open('welcome');
  }
}

async function bootstrapGame() {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
  if (!canvas) throw new Error('Missing #game-canvas root element');

  const loading = document.createElement('section');
  loading.className = 'artwork-loading';
  loading.innerHTML = `<h1>${GAME_BRANDING.title}</h1><p style="font-weight:700;color:#fde68a;">${GAME_BRANDING.worldName} · "${GAME_BRANDING.slogan}"</p><p>Đang kiểm tra thư viện thế giới &amp; nhân vật…</p><progress max="1" value="0"></progress><small>Tài nguyên bản quyền anime fantasy 2.5D.</small>`;
  document.body.append(loading);
  const progress = loading.querySelector('progress') as HTMLProgressElement;

  const [mapRes, spriteRes, artworkRes] = await Promise.all([
    fetch('/data/maps/thon_khoi_nguyen.json'),
    fetch('/data/sprites/entities.json'),
    fetch('/assets/elysia/manifest.json'),
  ]);

  if (!mapRes.ok || !spriteRes.ok || !artworkRes.ok) {
    throw new Error('Không nạp được dữ liệu map, sprite hoặc manifest artwork mới.');
  }

  const mapData = (await mapRes.json()) as VillageMapData;
  const spriteDoc = (await spriteRes.json()) as SpriteRegistryDoc;
  const artwork = new ArtworkLibrary(await artworkRes.json() as ArtworkManifest);
  await artwork.load((loaded, total) => { progress.max = total; progress.value = loaded; });

  const engine = new GameEngine(canvas, mapData, spriteDoc, artwork);
  loading.remove();

  const hud = new ElysiaHUD(engine.skills);
  const baloModal = new BaloEquipModal();
  const skillModal = new SkillFrameModal();
  const worldModals = new WorldModals();
  const awakeningModal = new AwakeningCinematicModal();
  const charCreationModal = new CharacterCreationModal();
  const authModal = new AuthModal();
  const settingsModal = new SettingsModal();
  const eventModal = new EventModal();
  const socialModal = new SocialTradeModal();
  const professionModal = new ProfessionModal();
  const guildMerchantModal = new GuildMerchantModal();
  const deathModal = new DeathOverlayModal();
  const mp = new MultiplayerClient();
  engine.setMultiplayerClient(mp);

  deathModal.onRequestResurrect = async () => {
    await engine.requestCheckpointResurrection();
    deathModal.hide();
  };
  engine.onPlayerDiedUi = (payload) => {
    modalManager.closeAll();
    deathModal.show(payload);
  };
  engine.onPlayerResurrectedUi = () => {
    deathModal.hide();
  };
  engine.onMapTransitionState = (st) => {
    hud.setTransitionState(st);
  };
  hud.onToggleAutoCombat = () => engine.toggleAutoCombat();
  hud.onUpdateAutoCombatConfig = (patch) => engine.updateAutoCombatConfig(patch);
  hud.onPerformBasicAttack = () => engine.performBasicAttack();
  engine.onLootDrop = (text) => hud.appendLootDrop(text);
  hud.setupVirtualJoystick((vec) => engine.setJoystickVector(vec));

  window.addEventListener('beforeunload', () => engine.flushServerSyncOnUnload());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') engine.flushServerSyncOnUnload();
  });

  Object.assign(window, {
    elysia: {
      engine,
      mp,
      artwork,
      modalManager,
      version: 'phase5-life-skills-guilds-merchants-v1',
      openCharacterCreation: () => charCreationModal.open(),
      openAuth: () => void authModal.open('characters'),
      openSettings: () => settingsModal.open(),
      openEvents: () => eventModal.open(engine.serverCharacterId || 'default'),
      openSocial: () => socialModal.open(),
      openProfessions: (profId?: any) => void professionModal.open(engine.serverCharacterId, profId),
      openGuildMerchant: (sec?: 'guild' | 'merchant' | 'territory') => void guildMerchantModal.open(sec),
      openLanding: () => {
        const landing = new ElysiaLandingPage({
          onLaunchGame: () => {
            landing.destroy();
          },
          onOpenAuth: (tab) => {
            landing.destroy();
            void authModal.open(tab || 'login');
          },
        });
        landing.render(document.body);
      },
    },
  });

  // Apply persisted user settings on start
  engine.applySettings(settingsModal.getSettings());

  let latestSnap = null as Parameters<typeof baloModal.sync>[0] | null;

  hud.onCastSkill = (skillId) => engine.castSkill(skillId);
  hud.onQuickUse = (iconKey) => engine.quickUseConsumable(iconKey);
  hud.onClaimQuest = () => engine.claimQuestReward();
  hud.onClaimWorldQuest = (questId) => engine.claimQuestReward(questId);
  hud.onAcceptWorldQuest = (questId) => engine.acceptWorldQuest(questId);
  hud.onTrackQuest = (questId) => { engine.trackWorldQuest(questId); };
  hud.onFindTrackedQuestTarget = () => engine.findTrackedQuestTarget();
  hud.onRepairEquipment = () => { engine.repairEquipment(); };

  hud.onOpenAccount = () => {
    modalManager.closeAll();
    void authModal.open('characters');
  };
  hud.onOpenSocial = () => {
    modalManager.closeAll();
    socialModal.open();
  };
  hud.onOpenProfessions = (profId?: any) => {
    modalManager.closeAll();
    void professionModal.open(engine.serverCharacterId, profId);
  };
  hud.onOpenGuildMerchant = (sec) => {
    modalManager.closeAll();
    void guildMerchantModal.open(sec);
  };
  hud.onSendChat = (channel, message, targetName) => {
    void mp.sendChat(channel, message, targetName).then((res) => {
      if (!res.success && res.error) hud.showToast(res.error, 'error');
    });
  };
  hud.onOpenEvents = () => {
    modalManager.closeAll();
    eventModal.open(engine.serverCharacterId || 'default');
  };
  hud.onOpenSettings = () => {
    modalManager.closeAll();
    settingsModal.open();
  };

  // Real-time Social, Party & Atomic Trade Socket.IO Bindings
  mp.onConnectionChange = (connected, reconnecting) => {
    hud.setConnectionState(connected, Boolean(reconnecting));
  };
  mp.onPingUpdate = () => engine.emitHudSnapshot();
  mp.onChatMessage = (msg) => hud.appendChatMessage(msg);
  mp.onPartyUpdated = (party) => {
    socialModal.setParty(party);
    hud.setSocialBadgeCount(socialModal.getPendingInviteCount());
  };
  mp.onPartyInviteReceived = (inv) => {
    socialModal.pushPartyInvite(inv);
    hud.setSocialBadgeCount(socialModal.getPendingInviteCount());
    hud.showToast(`${inv.fromName} mời bạn vào Tổ Đội! Mở [P] để phản hồi.`, 'info');
  };
  mp.onTradeRequestReceived = (req) => {
    socialModal.pushTradeInvite(req);
    hud.setSocialBadgeCount(socialModal.getPendingInviteCount());
    hud.showToast(`${req.fromName} gửi yêu cầu Giao Dịch! Mở [P] để phản hồi.`, 'info');
  };
  mp.onTradeUpdated = (session) => {
    socialModal.setTradeSession(session);
    if (!socialModal.isOpen()) socialModal.open('trade');
    hud.setSocialBadgeCount(socialModal.getPendingInviteCount());
  };
  mp.onTradeCompleted = (session) => {
    socialModal.setTradeSession(null, 'Giao dịch hoàn tất!');
    hud.setSocialBadgeCount(socialModal.getPendingInviteCount());
    hud.showToast(`Giao dịch #${session.tradeId.slice(0, 6)} thành công!`, 'success');
    if (engine.serverCharacterId) {
      void fetchCharacterByIdApi(engine.serverCharacterId).then((live) => {
        if (live?.character) engine.hydrateFromServerCharacter(live.character, live.computedStats);
      });
    }
  };
  mp.onTradeCancelled = (data) => {
    socialModal.setTradeSession(null, data?.reason || 'Giao dịch đã bị hủy.');
    hud.setSocialBadgeCount(socialModal.getPendingInviteCount());
    hud.showToast(data?.reason || 'Giao dịch đã bị hủy.', 'info');
  };

  socialModal.onRefreshOnline = () => {
    void mp.listOnlinePlayers(false).then((list) => socialModal.setOnlinePlayers(list));
  };
  socialModal.onInspectPlayer = (charId) => {
    void mp.inspectPlayer(charId).then((data) => {
      if (data) socialModal.setInspectedPlayer(data);
      else hud.showToast('Không thể kiểm tra người chơi này (có thể vừa thoát).', 'error');
    });
  };
  socialModal.onPartyCreate = () => {
    void mp.partyCreate().then((r) => {
      if (!r.success && r.error) hud.showToast(r.error, 'error');
    });
  };
  socialModal.onPartyInvite = (target) => {
    void mp.partyInvite(target).then((r) => {
      hud.showToast(r.success ? `Đã gửi lời mời nhóm tới ${target}.` : (r.error || 'Lỗi mời nhóm'), r.success ? 'success' : 'error');
    });
  };
  socialModal.onPartyRespond = (partyId, accept) => {
    void mp.partyRespond(partyId, accept).then((r) => {
      hud.setSocialBadgeCount(socialModal.getPendingInviteCount());
      if (!r.success && r.error) hud.showToast(r.error, 'error');
    });
  };
  socialModal.onPartyLeave = () => {
    void mp.partyLeave().then((r) => {
      if (!r.success && r.error) hud.showToast(r.error, 'error');
    });
  };
  socialModal.onPartyKick = (targetId) => {
    void mp.partyKick(targetId).then((r) => {
      if (!r.success && r.error) hud.showToast(r.error, 'error');
    });
  };
  socialModal.onTradeRequest = (target) => {
    void mp.tradeRequest(target).then((r) => {
      hud.showToast(r.success ? `Đã gửi yêu cầu giao dịch tới ${target}.` : (r.error || 'Lỗi giao dịch'), r.success ? 'success' : 'error');
    });
  };
  socialModal.onTradeRespond = (fromId, accept) => {
    void mp.tradeRespond(fromId, accept).then((r) => {
      hud.setSocialBadgeCount(socialModal.getPendingInviteCount());
      if (!r.success && r.error) hud.showToast(r.error, 'error');
    });
  };
  socialModal.onTradeUpdateOffer = (tradeId, gold, items) => {
    void mp.tradeUpdateOffer(tradeId, gold, items).then((r) => {
      if (!r.success && r.error) hud.showToast(r.error, 'error');
    });
  };
  socialModal.onTradeLock = (tradeId) => {
    void mp.tradeLock(tradeId).then((r) => {
      if (!r.success && r.error) hud.showToast(r.error, 'error');
    });
  };
  socialModal.onTradeConfirm = (tradeId) => {
    void mp.tradeConfirm(tradeId).then((r) => {
      if (!r.success && r.error) hud.showToast(r.error, 'error');
    });
  };
  socialModal.onTradeCancel = (tradeId) => {
    void mp.tradeCancel(tradeId);
  };
  socialModal.onStartWhisper = (name) => hud.startWhisperTo(name);

  hud.onOpenBag = () => {
    skillModal.close();
    worldModals.close();
    baloModal.toggle(latestSnap);
  };
  hud.onOpenSkills = () => {
    baloModal.close();
    worldModals.close();
    skillModal.toggle(engine.skills, engine.getComputedStats().atk, engine.skillPoints, engine.player.classId, latestSnap ?? undefined);
  };
  hud.onOpenQuests = () => {
    baloModal.close();
    skillModal.close();
    worldModals.toggle('quest', latestSnap);
  };
  hud.onOpenShop = () => {
    baloModal.close();
    skillModal.close();
    worldModals.toggle('shop', latestSnap);
  };
  hud.onOpenStorage = () => {
    baloModal.close();
    skillModal.close();
    worldModals.toggle('storage', latestSnap);
  };
  hud.onOpenWorldMap = () => {
    baloModal.close();
    skillModal.close();
    worldModals.toggle('worldmap', latestSnap);
  };
  hud.onOpenJob = () => {
    baloModal.close();
    skillModal.close();
    worldModals.toggle('job', latestSnap);
  };
  hud.onOpenCrafting = () => {
    baloModal.close();
    skillModal.close();
    worldModals.toggle('crafting', latestSnap);
  };

  // Balo + Attribute Window handlers
  baloModal.onUseOrEquipItem = (itemId) => engine.useOrEquipItem(itemId);
  baloModal.onUnequipSlot = (slot) => engine.unequipSlot(slot);
  baloModal.onSortInventory = () => engine.sortInventory();
  baloModal.onDiscardItem = (itemId) => { engine.discardInventoryItem(itemId, 1); };
  baloModal.onRepairEquipment = () => { engine.repairEquipment(); };
  baloModal.onAllocateAttr = (stat) => engine.allocateAttribute(stat);
  baloModal.onConfirmStatAllocations = (allocs) => engine.confirmStatAllocations(allocs);
  baloModal.onPreviewAttrs = (deltas) => engine.previewAttributeAllocationStats(deltas);
  baloModal.onPendingPointsPreview = (remaining) => hud.setStatPointsPreview(remaining);
  baloModal.onToast = (msg, variant) => hud.showToast(msg, variant);

  // Auth + Character Creation handlers
  authModal.onOpenCharacterCreation = () => charCreationModal.open();
  authModal.onSelectCharacter = async (char) => {
    const live = await fetchCharacterByIdApi(char.id);
    engine.hydrateFromServerCharacter(live?.character || char, live?.computedStats);
  };
  authModal.onToast = (msg, variant) => hud.showToast(msg, variant);

  charCreationModal.onToast = (msg, variant) => hud.showToast(msg, variant);
  charCreationModal.onCharacterCreated = async (created) => {
    const live = await fetchCharacterByIdApi(created.id);
    engine.hydrateFromServerCharacter(live?.character || created, live?.computedStats);
    hud.showToast(`Chào mừng ${created.name} đến Thôn Khởi Nguyên! Gặp Trưởng Thôn Kiên [E] để nhận nhiệm vụ đầu tiên!`, 'success');
  };

  settingsModal.onToast = (msg, variant) => hud.showToast(msg, variant);
  settingsModal.onSettingsSaved = (cfg) => engine.applySettings(cfg);

  eventModal.onToast = (msg, variant) => hud.showToast(msg, variant);
  eventModal.onClaimEventGold = (amount, label) => engine.addGoldBonus(amount, label);

  skillModal.onCastSkill = (skillId) => engine.castSkill(skillId);
  skillModal.onUpgradeSkill = (skillId) => engine.upgradeSkill(skillId);
  skillModal.onAllocatePassive = (passiveId) => engine.allocatePassive(passiveId);
  skillModal.onRespecPassives = (method) => engine.respecPassives(method);
  skillModal.onPreviewPassive = (passiveId) => engine.previewPassiveAllocationStats(passiveId);

  worldModals.onClaimQuest = (questId) => engine.claimQuestReward(questId);
  worldModals.onAcceptWorldQuest = (questId) => engine.acceptWorldQuest(questId);
  worldModals.onTrackQuest = (questId) => { engine.trackWorldQuest(questId); };
  worldModals.onAbandonQuest = (questId) => { engine.abandonWorldQuest(questId); };
  worldModals.onEquipCosmeticTitle = (titleId) => engine.equipCosmeticTitle(titleId);
  hud.onNpcDialogueTopic = (npcId, keyword) => engine.triggerNpcDialogueTopic(npcId, keyword);
  worldModals.onBuyItem = (shopId, qty) => { engine.buyShopItem(shopId, qty); };
  worldModals.onSellItem = (itemId, qty) => { engine.sellShopItem(itemId, qty); };
  worldModals.onRepairEquipment = () => { engine.repairEquipment(); };
  worldModals.onDepositItem = (itemId) => engine.depositToStorage(itemId);
  worldModals.onWithdrawItem = (itemId) => engine.withdrawFromStorage(itemId);
  worldModals.onTravelRegion = (regionId, mode) => { void engine.switchRegion(regionId, { mode }); };
  worldModals.onAllocateAttr = (stat) => engine.allocateAttribute(stat);
  worldModals.onOpenBaloStats = () => hud.onOpenBag?.();
  worldModals.onTriggerAwakening = () => { engine.triggerAutomaticJobAwakening(); };
  worldModals.onSelectLv80Branch = (branchId) => engine.selectLv80AdvancedBranch(branchId);
  worldModals.onReplayJobRitual = (jobId) => engine.replayJobRitualVfx(jobId);
  hud.onReplayJobRitual = (jobId) => engine.replayJobRitualVfx(jobId);
  worldModals.onCraftRecipe = (recipeId) => engine.craftRecipe(recipeId);
  worldModals.onUpgradeEquipSlot = (slot) => engine.upgradeEquippedSlot(slot);

  engine.onAwakeningReveal = (result) => {
    modalManager.closeAll();
    awakeningModal.show(result);
  };

  engine.onToggleBalo = () => hud.onOpenBag?.();
  engine.onToggleSkills = () => hud.onOpenSkills?.();
  engine.onToggleQuest = () => hud.onOpenQuests?.();
  engine.onToggleShop = () => hud.onOpenShop?.();
  engine.onToggleStorage = () => hud.onOpenStorage?.();
  engine.onToggleWorldMap = () => hud.onOpenWorldMap?.();
  engine.onToggleJob = () => hud.onOpenJob?.();
  engine.onToggleCrafting = () => hud.onOpenCrafting?.();
  engine.onToggleParty = () => {
    if (socialModal.isOpen()) socialModal.close();
    else {
      modalManager.closeAll();
      socialModal.open();
    }
  };
  engine.onToggleProfession = (profId?: any) => {
    if (professionModal.isOpen()) professionModal.close();
    else {
      modalManager.closeAll();
      void professionModal.open(engine.serverCharacterId, profId);
    }
  };
  engine.onToggleGuildMerchant = (sec) => {
    if (guildMerchantModal.isOpen()) guildMerchantModal.close();
    else {
      modalManager.closeAll();
      void guildMerchantModal.open(sec);
    }
  };

  const syncServerCharacterNow = async () => {
    if (!engine.serverCharacterId) return;
    const live = await fetchCharacterByIdApi(engine.serverCharacterId);
    if (live?.character) engine.hydrateFromServerCharacter(live.character, live.computedStats);
  };
  professionModal.onToast = (msg, variant) => hud.showToast(msg, variant);
  professionModal.onCharacterMutated = () => { void syncServerCharacterNow(); };
  guildMerchantModal.onToast = (msg, variant) => hud.showToast(msg, variant);
  guildMerchantModal.onCharacterMutated = () => { void syncServerCharacterNow(); };

  // Escape closes NPC dialog ONLY when no modal is open (never opens Settings)
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modalManager.hasOpenModal()) {
      hud.closeNpcDialogIfOpen();
    }
  });

  engine.onHudSync = (snap) => {
    latestSnap = snap;
    hud.sync(snap);
    baloModal.sync(snap);
    worldModals.sync(snap);
    socialModal.syncSelfHud(engine.serverCharacterId, snap);
    const cachedChar = getActiveCharacterCache();
    guildMerchantModal.syncCharacter(engine.serverCharacterId, snap, cachedChar?.guildId ?? null, cachedChar?.merchantAssocId ?? null);
    skillModal.setSkills(snap.skills, snap.stats.atk, snap.skillPoints, snap.classId, snap);
  };
  engine.onMinimapDraw = (tilemap, player, npcs, monsters) =>
    hud.renderMinimap(tilemap, player, npcs, monsters);
  engine.onNpcTalk = (npc) => hud.showNpcDialog(npc, latestSnap, engine.getNpcDialogueTopics(npc.id));
  engine.onToast = (msg) => hud.showToast(msg, 'info');

  await hydrateInitialServerCharacter(engine, hud, authModal, charCreationModal);
  engine.emitHudSnapshot();
  engine.start();
}

void bootstrapGame().catch((error: unknown) => {
  console.error('[Elysia artwork startup]', error);
  document.getElementById('hud-overlay')?.classList.add('hidden');
  const panel = document.createElement('section');
  panel.className = 'artwork-startup-error';
  const title = document.createElement('h1');
  title.textContent = 'Artwork chưa sẵn sàng';
  const message = document.createElement('p');
  message.textContent = 'Game cần bộ tranh và sprite Elysia mới để khởi động.';
  const detail = document.createElement('pre');
  detail.textContent = error instanceof Error ? error.message : String(error);
  panel.append(title, message, detail);
  document.body.append(panel);
});
