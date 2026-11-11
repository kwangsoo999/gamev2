import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { ItemService } from '../services/item.service.js';
import { QuestTitleService } from '../services/quest-title.service.js';
import { JsonStore } from '../database/jsonStore.js';
import { ENV } from '../config/env.js';
import { WorldService } from '../services/world.service.js';
import { CharacterService } from '../services/character.service.js';
import { CombatService } from '../services/combat.service.js';

export const adminRouter = Router();
const itemService = new ItemService();
const questTitleService = QuestTitleService.getInstance();
const store = JsonStore.getInstance();

// Configure Multer for asset uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = ENV.UPLOADS_DIR;
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    cb(null, `${basename}_${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

// --- DASHBOARD STATS ---
adminRouter.get('/dashboard', (_req, res) => {
  res.json({
    success: true,
    data: {
      totalUsers: store.users.length,
      onlinePlayers: 1,
      totalCharacters: store.characters.length,
      totalItems: store.items.length,
      totalWeapons: store.weapons.length,
      serverStatus: 'running',
    },
  });
});

// --- ADMIN ITEMS ---
adminRouter.get('/items', async (req, res) => {
  try {
    const result = await itemService.getItems(req.query);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

adminRouter.get('/items/:id', async (req, res) => {
  try {
    const item = await itemService.getItemById(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: 'Không tìm thấy vật phẩm.' });
    res.json({ success: true, data: item });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

adminRouter.post('/items', async (req, res) => {
  try {
    const item = await itemService.createItem(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message, error: err.message });
  }
});

adminRouter.patch('/items/:id', async (req, res) => {
  try {
    const item = await itemService.updateItem(req.params.id, req.body);
    res.json({ success: true, data: item });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message, error: err.message });
  }
});

adminRouter.delete('/items/:id', async (req, res) => {
  try {
    await itemService.deleteItem(req.params.id);
    res.json({ success: true, message: 'Đã xóa vật phẩm thành công.' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

adminRouter.post('/items/:id/duplicate', async (req, res) => {
  try {
    const item = await itemService.duplicateItem(req.params.id);
    res.status(201).json({ success: true, data: item });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message, error: err.message });
  }
});

adminRouter.post('/items/:id/archive', async (req, res) => {
  try {
    const item = await itemService.archiveItem(req.params.id);
    res.json({ success: true, data: item });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

adminRouter.post('/items/:id/testing', async (req, res) => {
  try {
    const item = await itemService.testingItem(req.params.id);
    res.json({ success: true, data: item });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message, error: err.message });
  }
});

adminRouter.post('/items/:id/publish', async (req, res) => {
  try {
    const item = await itemService.publishItem(req.params.id);
    res.json({ success: true, data: item });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message, error: err.message });
  }
});

// --- ADMIN WEAPONS ---
adminRouter.get('/weapons', async (req, res) => {
  try {
    const result = await itemService.getWeapons(req.query);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

adminRouter.get('/weapons/:id', async (req, res) => {
  try {
    const weapon = await itemService.getWeaponById(req.params.id);
    if (!weapon) return res.status(404).json({ success: false, error: 'Không tìm thấy vũ khí.' });
    res.json({ success: true, data: weapon });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

adminRouter.post('/weapons', async (req, res) => {
  try {
    const weapon = await itemService.createWeapon(req.body);
    res.status(201).json({ success: true, data: weapon });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message, error: err.message });
  }
});

adminRouter.patch('/weapons/:id', async (req, res) => {
  try {
    const weapon = await itemService.updateWeapon(req.params.id, req.body);
    res.json({ success: true, data: weapon });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message, error: err.message });
  }
});

adminRouter.delete('/weapons/:id', async (req, res) => {
  try {
    await itemService.deleteWeapon(req.params.id);
    res.json({ success: true, message: 'Đã xóa vũ khí thành công.' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

adminRouter.post('/weapons/:id/duplicate', async (req, res) => {
  try {
    const weapon = await itemService.duplicateWeapon(req.params.id);
    res.status(201).json({ success: true, data: weapon });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message, error: err.message });
  }
});

adminRouter.post('/weapons/:id/archive', async (req, res) => {
  try {
    const weapon = await itemService.archiveWeapon(req.params.id);
    res.json({ success: true, data: weapon });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

adminRouter.post('/weapons/:id/testing', async (req, res) => {
  try {
    const weapon = await itemService.testingWeapon(req.params.id);
    res.json({ success: true, data: weapon });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message, error: err.message });
  }
});

adminRouter.post('/weapons/:id/publish', async (req, res) => {
  try {
    const weapon = await itemService.publishWeapon(req.params.id);
    res.json({ success: true, data: weapon });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message, error: err.message });
  }
});

// --- ASSET UPLOADS ---
adminRouter.post('/assets/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Vui lòng chọn file hình ảnh để upload.' });
  }
  const assetUrl = `/assets/${req.file.filename}`;
  res.json({
    success: true,
    data: {
      assetId: `ASSET_${Date.now()}`,
      url: assetUrl,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
    },
  });
});

adminRouter.post('/assets/:id/replace', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Vui lòng chọn file mới để thay thế.' });
  }
  res.json({
    success: true,
    data: {
      assetId: req.params.id,
      url: `/assets/${req.file.filename}`,
      version: 2,
    },
  });
});

adminRouter.post('/assets/:id/rollback', (req, res) => {
  res.json({
    success: true,
    data: {
      assetId: req.params.id,
      version: req.body.versionNumber || 1,
      message: 'Rollback phiên bản thành công.',
    },
  });
});

// --- SYSTEM 6: QUEST, HIDDEN QUEST, UNIQUE EQUIPMENT & TITLE DEBUG TOOLS ---
adminRouter.get('/debug/characters', (_req, res) => {
  res.json({
    success: true,
    data: store.characters.map((c) => ({
      id: c.id,
      name: c.name,
      userId: c.userId,
      level: c.level,
      jobId: c.jobId,
      completedQuests: c.completedQuests || [],
      activeQuestIds: Object.keys(c.activeQuests || {}),
      discoveredHiddenQuests: c.discoveredHiddenQuests || [],
      ownedUniqueEquipmentIds: c.ownedUniqueEquipmentIds || [],
      unlockedTitles: c.unlockedTitles || [],
      equippedCosmeticTitleId: c.equippedCosmeticTitleId || null,
    })),
  });
});

adminRouter.get('/debug/quests', (req, res) => {
  try {
    const hiddenOnly = String(req.query.hiddenOnly || '') === 'true';
    const search = req.query.search ? String(req.query.search) : undefined;
    const questType = req.query.questType ? String(req.query.questType) : undefined;
    const list = questTitleService.getAllQuestsForAdmin({ hiddenOnly, search, questType });
    res.json({ success: true, data: list });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

adminRouter.post('/debug/quests/trigger', (req, res) => {
  try {
    const characterId = String(req.body?.characterId || '');
    const questId = String(req.body?.questId || '');
    if (!characterId || !questId) {
      return res.status(400).json({ success: false, error: 'Thiếu characterId hoặc questId.' });
    }
    const progress = questTitleService.debugTriggerQuest(characterId, questId);
    res.json({ success: true, data: progress });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, error: err.message });
  }
});

adminRouter.post('/debug/quests/complete-objectives', (req, res) => {
  try {
    const characterId = String(req.body?.characterId || '');
    const questId = String(req.body?.questId || '');
    if (!characterId || !questId) {
      return res.status(400).json({ success: false, error: 'Thiếu characterId hoặc questId.' });
    }
    const progress = questTitleService.debugCompleteObjectives(characterId, questId);
    res.json({ success: true, data: progress });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, error: err.message });
  }
});

adminRouter.post('/debug/unique-equipment/grant', (req, res) => {
  try {
    const characterId = String(req.body?.characterId || '');
    const uniqueItemId = String(req.body?.uniqueItemId || '');
    const allowIfOwned = Boolean(req.body?.allowIfOwned);
    if (!characterId || !uniqueItemId) {
      return res.status(400).json({ success: false, error: 'Thiếu characterId hoặc uniqueItemId.' });
    }
    const result = questTitleService.grantUniqueEquipment(characterId, uniqueItemId, { allowIfOwned });
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, error: err.message });
  }
});

adminRouter.post('/debug/titles/unlock', (req, res) => {
  try {
    const characterId = String(req.body?.characterId || '');
    const titleId = String(req.body?.titleId || '');
    if (!characterId || !titleId) {
      return res.status(400).json({ success: false, error: 'Thiếu characterId hoặc titleId.' });
    }
    const result = questTitleService.unlockTitle(characterId, titleId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, error: err.message });
  }
});

adminRouter.post('/debug/titles/recalculate', (req, res) => {
  try {
    const characterId = String(req.body?.characterId || '');
    if (characterId) {
      const summary = questTitleService.recalculateTitleBonuses(characterId);
      return res.json({ success: true, data: summary });
    }
    const summaries = store.characters.map((c) => questTitleService.recalculateTitleBonuses(c.id));
    res.json({ success: true, data: summaries });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, error: err.message });
  }
});

adminRouter.get('/debug/validation/references', (_req, res) => {
  try {
    const report = questTitleService.validateAllDataReferences();
    res.json({ success: true, data: report });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

adminRouter.get('/operations-config', (_req, res) => {
  try {
    const data = WorldService.getInstance().getOperationsConfig();
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

adminRouter.put('/operations-config', (req, res) => {
  try {
    const updated = WorldService.getInstance().updateOperationsConfig(req.body || {});
    const combat = CombatService.getSharedInstance();
    for (const region of WorldService.getInstance().getMaps(false)) {
      if (region?.id) combat.reloadRegion(region.id);
    }
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message, error: err.message });
  }
});

adminRouter.get('/persistence-monitor', (_req, res) => {
  try {
    const now = Date.now();
    const characters = store.characters.map((c: any) => ({
      id: c.id,
      name: c.name,
      userId: c.userId,
      level: Number(c.level || 1),
      exp: Number(c.exp || 0),
      classId: c.classId,
      regionId: c.regionId || 'THON_KHOI_NGUYEN',
      saveVersion: Number(c.saveVersion || 1),
      lastSavedAt: c.lastSavedAt || c.updatedAt || null,
      latestVillageCheckpointId: c.latestVillageCheckpointId || 'THON_KHOI_NGUYEN',
      preferredResurrectionVillageId: c.preferredResurrectionVillageId || null,
      discoveredVillageCount: Array.isArray(c.discoveredVillageIds) ? c.discoveredVillageIds.length : 1,
      deathCount: Number(c.deathCount || 0),
      hasActiveDeathPenalty: Boolean(c.deathPenalty && Number(c.deathPenalty.expiresAt || 0) > now),
      deathPenalty: c.deathPenalty || null,
      autoCombatEnabled: Boolean(c.autoCombatConfig?.enabled),
      integrityOk:
        Number.isFinite(Number(c.level)) &&
        Number(c.level) >= 1 &&
        Boolean(c.baseStats) &&
        Array.isArray(c.inventory),
    }));
    res.json({
      success: true,
      data: {
        totalCharacters: characters.length,
        corruptedCount: characters.filter((c) => !c.integrityOk).length,
        activePenaltyCount: characters.filter((c) => c.hasActiveDeathPenalty).length,
        characters,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

adminRouter.post('/persistence/:characterId/recover', (req, res) => {
  try {
    const recovered = new CharacterService().recoverCharacterPersistence(req.params.characterId);
    res.json({ success: true, data: recovered });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

adminRouter.post('/elite-spawn/:regionId', (req, res) => {
  try {
    const spawned = CombatService.getSharedInstance().spawnRandomEliteInRegion(req.params.regionId, true);
    res.json({ success: true, data: spawned });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});
