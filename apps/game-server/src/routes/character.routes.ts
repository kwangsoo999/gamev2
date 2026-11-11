import { Router, Response } from 'express';
import { CharacterService } from '../services/character.service.js';
import { CraftingService } from '../services/crafting.service.js';
import { QuestTitleService } from '../services/quest-title.service.js';
import { WorldService } from '../services/world.service.js';
import { SocialService } from '../services/social.service.js';
import { CombatService } from '../services/combat.service.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

export const characterRouter = Router();
const characterService = new CharacterService();
const craftingService = CraftingService.getInstance();
const questTitleService = QuestTitleService.getInstance();
const worldService = WorldService.getInstance();
const socialService = SocialService.getInstance();

async function verifyCharacterOwnership(req: AuthRequest, res: Response) {
  const char = await characterService.getCharacterById(req.params.id);
  if (!char) {
    res.status(404).json({ success: false, error: 'Không tìm thấy nhân vật.' });
    return null;
  }
  if (char.userId !== req.user!.id && req.user!.role !== 'admin') {
    res.status(403).json({ success: false, error: 'Quyền truy cập bị từ chối.' });
    return null;
  }
  return char;
}

// Enforce authentication on all character endpoints
characterRouter.use(authenticate);

/**
 * GET /api/v1/characters
 * Returns characters owned by the authenticated account
 */
characterRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const targetUserId = req.user!.role === 'admin' && req.query.userId ? (req.query.userId as string) : userId;
    const chars = await characterService.getCharactersByUserId(targetUserId);
    const enriched = chars.map((ch) => ({
      ...ch,
      isOnline: socialService.isOnline(ch.id),
    }));
    res.json({
      success: true,
      data: enriched,
      meta: { maxCharactersPerAccount: worldService.getMaxCharactersPerAccount() },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/characters
 * Creates a new character belonging to the authenticated account
 */
characterRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const character = await characterService.createCharacter(userId, req.body);
    res.status(201).json({ success: true, data: character });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message, error: err.message });
  }
});

/**
 * GET /api/v1/characters/:id
 * Fetches character details with strict ownership verification
 */
characterRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const char = await characterService.getCharacterById(req.params.id);
    if (!char) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy nhân vật.' });
    }

    // Strict ownership verification: only the character's owner or an admin can access
    if (char.userId !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Quyền truy cập bị từ chối. Bạn không phải chủ sở hữu nhân vật này.' });
    }

    const computedStats = characterService.getComputedStatsSummary(char.id);
    res.json({ success: true, data: char, computedStats });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /api/v1/characters/:id
 * Updates character attributes with ownership verification and payload sanitization
 */
characterRouter.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const char = await characterService.getCharacterById(req.params.id);
    if (!char) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy nhân vật.' });
    }

    // Ownership verification
    if (char.userId !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Quyền sửa đổi bị từ chối. Bạn không phải chủ sở hữu nhân vật này.' });
    }

    // Sanitize updates: prevent direct raw overwriting of baseStats, classId, level, or attributes
    const allowedFields = ['name', 'appearance', 'x', 'y', 'regionId'];
    const sanitizedUpdates: Record<string, any> = {};

    for (const key of Object.keys(req.body || {})) {
      if (allowedFields.includes(key) || req.user!.role === 'admin') {
        sanitizedUpdates[key] = req.body[key];
      }
    }

    const updated = await characterService.updateCharacter(req.params.id, sanitizedUpdates);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/characters/:id/allocate-stats (and /stats/allocate alias)
 * Distributes earned attribute points across STR/DEX/AGI/INT/CON with server validation
 */
const handleAllocateStats = async (req: AuthRequest, res: Response) => {
  try {
    const char = await characterService.getCharacterById(req.params.id);
    if (!char) return res.status(404).json({ success: false, error: 'Không tìm thấy nhân vật.' });
    if (char.userId !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Quyền sửa đổi bị từ chối.' });
    }
    const updated = await characterService.allocateAttributePoints(req.params.id, req.body?.allocations || req.body);
    const computedStats = characterService.getComputedStatsSummary(req.params.id);
    res.json({ success: true, data: updated, character: updated, computedStats });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message, error: err.message });
  }
};

characterRouter.post('/:id/allocate-stats', handleAllocateStats);
characterRouter.post('/:id/stats/allocate', handleAllocateStats);

/**
 * DELETE /api/v1/characters/:id
 */
characterRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const char = await characterService.getCharacterById(req.params.id);
    if (!char) return res.status(404).json({ success: false, error: 'Không tìm thấy nhân vật.' });
    if (char.userId !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Quyền xóa bị từ chối.' });
    }
    const confirmName =
      typeof req.body?.confirmName === 'string'
        ? req.body.confirmName
        : typeof req.query?.confirmName === 'string'
        ? req.query.confirmName
        : undefined;
    await characterService.deleteCharacter(req.params.id, char.userId!, confirmName);
    res.json({ success: true });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/characters/:id/complete-quest
 */
characterRouter.post('/:id/complete-quest', async (req: AuthRequest, res: Response) => {
  try {
    const char = await characterService.getCharacterById(req.params.id);
    if (!char) return res.status(404).json({ success: false, error: 'Không tìm thấy nhân vật.' });
    if (char.userId !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Quyền truy cập bị từ chối.' });
    }
    const result = await characterService.completeQuest(req.params.id, req.body?.questId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message, error: err.message });
  }
});

/**
 * POST /api/v1/characters/:id/equip
 */
characterRouter.post('/:id/equip', async (req: AuthRequest, res: Response) => {
  try {
    const char = await characterService.getCharacterById(req.params.id);
    if (!char) return res.status(404).json({ success: false, error: 'Không tìm thấy nhân vật.' });
    if (char.userId !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Quyền truy cập bị từ chối.' });
    }
    const updated = await characterService.equipItem(req.params.id, req.body?.slot || 'weapon', req.body?.itemId);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message, error: err.message });
  }
});

/**
 * POST /api/v1/characters/:id/unequip
 */
characterRouter.post('/:id/unequip', async (req: AuthRequest, res: Response) => {
  try {
    const char = await characterService.getCharacterById(req.params.id);
    if (!char) return res.status(404).json({ success: false, error: 'Không tìm thấy nhân vật.' });
    if (char.userId !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Quyền truy cập bị từ chối.' });
    }
    const updated = await characterService.unequipSlot(req.params.id, req.body?.slot || 'weapon');
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message, error: err.message });
  }
});

/**
 * GET /api/v1/characters/:id/stats
 */
characterRouter.get('/:id/stats', async (req: AuthRequest, res: Response) => {
  try {
    const char = await characterService.getCharacterById(req.params.id);
    if (!char) return res.status(404).json({ success: false, error: 'Không tìm thấy nhân vật.' });
    if (char.userId !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Quyền truy cập bị từ chối.' });
    }
    const stats = characterService.getComputedStatsSummary(req.params.id);
    res.json({ success: true, data: stats });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message, error: err.message });
  }
});

/**
 * POST /api/v1/characters/:id/learn-skill
 */
characterRouter.post('/:id/learn-skill', async (req: AuthRequest, res: Response) => {
  try {
    const char = await characterService.getCharacterById(req.params.id);
    if (!char) return res.status(404).json({ success: false, error: 'Không tìm thấy nhân vật.' });
    if (char.userId !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Quyền truy cập bị từ chối.' });
    }
    const result = await characterService.learnOrUpgradeSkill(req.params.id, String(req.body?.skillId || ''));
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message, error: err.message });
  }
});

/**
 * POST /api/v1/characters/:id/craft
 */
characterRouter.post('/:id/craft', async (req: AuthRequest, res: Response) => {
  try {
    const char = await characterService.getCharacterById(req.params.id);
    if (!char) return res.status(404).json({ success: false, error: 'Không tìm thấy nhân vật.' });
    if (char.userId !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Quyền truy cập bị từ chối.' });
    }
    const result = craftingService.craftRecipe(req.params.id, String(req.body?.recipeId || ''), req.body?.requestId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message, error: err.message });
  }
});

/**
 * POST /api/v1/characters/:id/upgrade-equip
 */
characterRouter.post('/:id/upgrade-equip', async (req: AuthRequest, res: Response) => {
  try {
    const char = await characterService.getCharacterById(req.params.id);
    if (!char) return res.status(404).json({ success: false, error: 'Không tìm thấy nhân vật.' });
    if (char.userId !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Quyền truy cập bị từ chối.' });
    }
    const result = craftingService.upgradeEquippedSlot(req.params.id, String(req.body?.slot || 'weapon'));
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message, error: err.message });
  }
});

/**
 * GET /api/v1/characters/:id/quests
 * Returns player quest journal (hides undiscovered hidden quests), chains, unique ownership & title bonuses
 */
characterRouter.get('/:id/quests', async (req: AuthRequest, res: Response) => {
  try {
    const char = await verifyCharacterOwnership(req, res);
    if (!char) return;
    const journal = questTitleService.getPlayerJournal(char.id);
    res.json({ success: true, data: journal });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/characters/:id/quests/progress
 * Records dialogue, monster hunt, item collection, or map exploration progress & checks hidden triggers
 */
characterRouter.post('/:id/quests/progress', async (req: AuthRequest, res: Response) => {
  try {
    const char = await verifyCharacterOwnership(req, res);
    if (!char) return;
    const result = questTitleService.recordProgress(char.id, {
      type: req.body?.type,
      targetId: String(req.body?.targetId || ''),
      amount: req.body?.amount !== undefined ? Number(req.body.amount) : undefined,
      keyword: req.body?.keyword !== undefined ? String(req.body.keyword) : undefined,
    });
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/characters/:id/quests/:questId/accept
 */
characterRouter.post('/:id/quests/:questId/accept', async (req: AuthRequest, res: Response) => {
  try {
    const char = await verifyCharacterOwnership(req, res);
    if (!char) return;
    const progress = questTitleService.acceptQuest(char.id, req.params.questId);
    res.json({ success: true, data: progress });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/characters/:id/quests/:questId/claim
 * Idempotent claim for quest rewards, unique equipment, titles, and quest chain completion rewards
 */
characterRouter.post('/:id/quests/:questId/claim', async (req: AuthRequest, res: Response) => {
  try {
    const char = await verifyCharacterOwnership(req, res);
    if (!char) return;
    const result = questTitleService.claimQuestRewards(char.id, req.params.questId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/characters/:id/quests/:questId/complete
 * Alias for claiming completed quest rewards at NPC
 */
characterRouter.post('/:id/quests/:questId/complete', async (req: AuthRequest, res: Response) => {
  try {
    const char = await verifyCharacterOwnership(req, res);
    if (!char) return;
    const result = questTitleService.claimQuestRewards(char.id, req.params.questId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/characters/:id/quests/available
 */
characterRouter.get('/:id/quests/available', async (req: AuthRequest, res: Response) => {
  try {
    const char = await verifyCharacterOwnership(req, res);
    if (!char) return;
    const journal = questTitleService.getPlayerJournal(char.id);
    res.json({ success: true, data: journal.availableQuests });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/characters/:id/quests/active
 */
characterRouter.get('/:id/quests/active', async (req: AuthRequest, res: Response) => {
  try {
    const char = await verifyCharacterOwnership(req, res);
    if (!char) return;
    const journal = questTitleService.getPlayerJournal(char.id);
    res.json({ success: true, data: journal.activeQuests });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/characters/:id/quests/completed
 */
characterRouter.get('/:id/quests/completed', async (req: AuthRequest, res: Response) => {
  try {
    const char = await verifyCharacterOwnership(req, res);
    if (!char) return;
    const journal = questTitleService.getPlayerJournal(char.id);
    res.json({
      success: true,
      data: {
        completedQuests: journal.completedQuests,
        completedQuestDetails: journal.completedQuestDetails,
      },
    });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/characters/:id/quests/tracked
 */
characterRouter.get('/:id/quests/tracked', async (req: AuthRequest, res: Response) => {
  try {
    const char = await verifyCharacterOwnership(req, res);
    if (!char) return;
    const journal = questTitleService.getPlayerJournal(char.id);
    res.json({
      success: true,
      data: {
        trackedQuestId: journal.trackedQuestId,
        trackedQuest: journal.trackedQuest,
      },
    });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/characters/:id/quests/track
 */
characterRouter.post('/:id/quests/track', async (req: AuthRequest, res: Response) => {
  try {
    const char = await verifyCharacterOwnership(req, res);
    if (!char) return;
    const questId = req.body?.questId !== undefined ? (req.body.questId ? String(req.body.questId) : null) : null;
    const result = questTitleService.trackQuest(char.id, questId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/characters/:id/quests/:questId/track
 */
characterRouter.post('/:id/quests/:questId/track', async (req: AuthRequest, res: Response) => {
  try {
    const char = await verifyCharacterOwnership(req, res);
    if (!char) return;
    const rawId = req.params.questId;
    const targetId = rawId === 'none' || rawId === 'null' || rawId === 'untrack' ? null : rawId;
    const result = questTitleService.trackQuest(char.id, targetId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/characters/:id/quests/:questId/abandon
 */
characterRouter.post('/:id/quests/:questId/abandon', async (req: AuthRequest, res: Response) => {
  try {
    const char = await verifyCharacterOwnership(req, res);
    if (!char) return;
    const result = questTitleService.abandonQuest(char.id, req.params.questId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/characters/:id/shop/catalog
 */
characterRouter.get('/:id/shop/catalog', async (req: AuthRequest, res: Response) => {
  try {
    const char = await verifyCharacterOwnership(req, res);
    if (!char) return;
    res.json({ success: true, data: characterService.getShopCatalog() });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/characters/:id/shop/buy
 */
characterRouter.post('/:id/shop/buy', async (req: AuthRequest, res: Response) => {
  try {
    const char = await verifyCharacterOwnership(req, res);
    if (!char) return;
    const itemId = String(req.body?.itemId || req.body?.id || '');
    const quantity = Number(req.body?.quantity ?? req.body?.qty ?? 1);
    const result = await characterService.buyShopItem(char.id, itemId, quantity);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message, error: err.message });
  }
});

/**
 * POST /api/v1/characters/:id/shop/sell
 */
characterRouter.post('/:id/shop/sell', async (req: AuthRequest, res: Response) => {
  try {
    const char = await verifyCharacterOwnership(req, res);
    if (!char) return;
    const itemId = String(req.body?.itemId || req.body?.id || '');
    const quantity = Number(req.body?.quantity ?? req.body?.qty ?? 1);
    const result = await characterService.sellInventoryItem(char.id, itemId, quantity);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message, error: err.message });
  }
});

/**
 * POST /api/v1/characters/:id/inventory/discard
 */
characterRouter.post('/:id/inventory/discard', async (req: AuthRequest, res: Response) => {
  try {
    const char = await verifyCharacterOwnership(req, res);
    if (!char) return;
    const itemId = String(req.body?.itemId || req.body?.id || '');
    const quantity = Number(req.body?.quantity ?? req.body?.qty ?? 1);
    const result = await characterService.discardInventoryItem(char.id, itemId, quantity);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message, error: err.message });
  }
});

/**
 * POST /api/v1/characters/:id/inventory/sort
 */
characterRouter.post('/:id/inventory/sort', async (req: AuthRequest, res: Response) => {
  try {
    const char = await verifyCharacterOwnership(req, res);
    if (!char) return;
    const result = await characterService.sortCharacterInventory(char.id);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message, error: err.message });
  }
});

/**
 * POST /api/v1/characters/:id/equipment/repair
 */
characterRouter.post('/:id/equipment/repair', async (req: AuthRequest, res: Response) => {
  try {
    const char = await verifyCharacterOwnership(req, res);
    if (!char) return;
    const result = await characterService.repairCharacterEquipment(char.id);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message, error: err.message });
  }
});

/**
 * GET /api/v1/characters/:id/titles
 */
characterRouter.get('/:id/titles', async (req: AuthRequest, res: Response) => {
  try {
    const char = await verifyCharacterOwnership(req, res);
    if (!char) return;
    const summary = questTitleService.recalculateTitleBonuses(char.id);
    const catalog = worldService.getTitles(false);
    res.json({
      success: true,
      data: {
        characterId: char.id,
        unlockedTitles: summary.unlockedTitleIds,
        equippedCosmeticTitleId: summary.equippedCosmeticTitleId,
        summary,
        catalog,
      },
    });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/characters/:id/titles/recalculate
 */
characterRouter.post('/:id/titles/recalculate', async (req: AuthRequest, res: Response) => {
  try {
    const char = await verifyCharacterOwnership(req, res);
    if (!char) return;
    const summary = questTitleService.recalculateTitleBonuses(char.id);
    res.json({ success: true, data: summary });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/characters/:id/titles/:titleId/equip
 * Sets purely cosmetic displayed title without affecting permanent stacked stat bonuses
 */
characterRouter.post('/:id/titles/:titleId/equip', async (req: AuthRequest, res: Response) => {
  try {
    const char = await verifyCharacterOwnership(req, res);
    if (!char) return;
    const rawId = req.params.titleId;
    const targetTitleId = rawId === 'none' || rawId === 'null' ? null : rawId;
    const result = questTitleService.equipCosmeticTitle(char.id, targetTitleId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/characters/:id/unique-equipment
 */
characterRouter.get('/:id/unique-equipment', async (req: AuthRequest, res: Response) => {
  try {
    const char = await verifyCharacterOwnership(req, res);
    if (!char) return;
    const catalog = worldService.getUniqueEquipment(false);
    const ownedIds = char.ownedUniqueEquipmentIds || [];
    res.json({
      success: true,
      data: {
        characterId: char.id,
        ownedUniqueEquipmentIds: ownedIds,
        ownedItems: catalog.filter((u) => ownedIds.includes(u.id)),
        catalog,
      },
    });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/v1/characters/:id
 * Deletes character with ownership verification
 */
characterRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const char = await characterService.getCharacterById(req.params.id);
    if (!char) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy nhân vật.' });
    }

    if (char.userId !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Quyền xóa bị từ chối. Bạn không phải chủ sở hữu nhân vật này.' });
    }

    if (req.body?.confirmName && String(req.body.confirmName).trim() !== char.name) {
      return res.status(400).json({ success: false, error: 'Tên xác nhận xóa không khớp với tên nhân vật.' });
    }

    await characterService.deleteCharacter(req.params.id, char.userId || req.user!.id);
    res.json({ success: true, message: 'Đã xóa nhân vật thành công.' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==========================================
// PASSIVE SKILL TREE & STAT AGGREGATION ROUTES
// ==========================================
import { PassiveService } from '../services/passive.service.js';
const passiveService = PassiveService.getInstance();

characterRouter.get('/:id/passives', async (req: AuthRequest, res: Response) => {
  try {
    const char = await characterService.getCharacterById(req.params.id);
    if (!char) return res.status(404).json({ success: false, error: 'Không tìm thấy nhân vật.' });
    if (char.userId !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Quyền truy cập bị từ chối.' });
    }
    const mode = req.query.mode === 'pvp' ? 'pvp' : req.query.mode === 'boss' ? 'boss' : 'pve';
    const data = passiveService.getPassiveOverview(req.params.id, mode);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, error: err.message });
  }
});

characterRouter.post('/:id/passives/preview', async (req: AuthRequest, res: Response) => {
  try {
    const char = await characterService.getCharacterById(req.params.id);
    if (!char) return res.status(404).json({ success: false, error: 'Không tìm thấy nhân vật.' });
    if (char.userId !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Quyền truy cập bị từ chối.' });
    }
    const { previewAllocations, previewBaseAttributes, mode } = req.body || {};
    const resolvedMode = mode === 'pvp' ? 'pvp' : mode === 'boss' ? 'boss' : 'pve';
    const data = passiveService.previewAllocation(req.params.id, previewAllocations, previewBaseAttributes, resolvedMode);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, error: err.message });
  }
});

characterRouter.post('/:id/passives/allocate', async (req: AuthRequest, res: Response) => {
  try {
    const char = await characterService.getCharacterById(req.params.id);
    if (!char) return res.status(404).json({ success: false, error: 'Không tìm thấy nhân vật.' });
    if (char.userId !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Quyền truy cập bị từ chối.' });
    }
    const { passiveId, deltaRank = 1 } = req.body || {};
    const data = passiveService.allocatePassive(req.params.id, String(passiveId || ''), Number(deltaRank));
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message, error: err.message });
  }
});

characterRouter.post('/:id/passives/respec', async (req: AuthRequest, res: Response) => {
  try {
    const char = await characterService.getCharacterById(req.params.id);
    if (!char) return res.status(404).json({ success: false, error: 'Không tìm thấy nhân vật.' });
    if (char.userId !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Quyền truy cập bị từ chối.' });
    }
    const method = req.body?.method === 'item' ? 'item' : 'gold';
    const data = passiveService.respecPassives(req.params.id, method);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message, error: err.message });
  }
});

/**
 * POST /api/v1/characters/:id/sync-state
 * Versioned atomic save synchronization preventing F5/reload data loss.
 */
characterRouter.post('/:id/sync-state', async (req: AuthRequest, res: Response) => {
  try {
    const char = await verifyCharacterOwnership(req, res);
    if (!char) return;
    const updated = await characterService.saveCharacterProgressionState(req.params.id, req.body || {});
    const computedStats = characterService.getComputedStatsSummary(req.params.id);
    res.json({ success: true, data: updated, character: updated, computedStats });
  } catch (err: any) {
    console.error(`[Persistence] Save failed for character ${req.params.id}:`, err.message);
    res.status(err.statusCode || 400).json({ success: false, message: err.message, error: err.message });
  }
});

/**
 * POST /api/v1/characters/:id/checkpoint
 * Discovers and updates the active safe-village resurrection checkpoint.
 */
characterRouter.post('/:id/checkpoint', async (req: AuthRequest, res: Response) => {
  try {
    const char = await verifyCharacterOwnership(req, res);
    if (!char) return;
    const villageId = String(req.body?.villageId || 'THON_KHOI_NGUYEN');
    const setAsPreferred = req.body?.setAsPreferred !== false;
    const result = await characterService.setResurrectionCheckpoint(req.params.id, villageId, setAsPreferred);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message, error: err.message });
  }
});

/**
 * POST /api/v1/characters/:id/death
 * Records server-authoritative death penalty (never resets level/class/items).
 */
characterRouter.post('/:id/death', async (req: AuthRequest, res: Response) => {
  try {
    const char = await verifyCharacterOwnership(req, res);
    if (!char) return;
    const killerName = typeof req.body?.killerName === 'string' ? req.body.killerName : undefined;
    const reason = typeof req.body?.reason === 'string' ? req.body.reason : undefined;
    const result = await characterService.recordCharacterDeathAndPenalty(req.params.id, killerName, reason);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message, error: err.message });
  }
});

/**
 * POST /api/v1/characters/:id/resurrect
 * Resurrects the character cleanly at their nearest/preferred discovered safe village.
 */
characterRouter.post('/:id/resurrect', async (req: AuthRequest, res: Response) => {
  try {
    const char = await verifyCharacterOwnership(req, res);
    if (!char) return;
    const result = await characterService.resurrectCharacterAtCheckpoint(req.params.id);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message, error: err.message });
  }
});

/**
 * POST /api/v1/characters/:id/sit
 * Toggles sitting/resting recovery state (rejected while in combat).
 */
characterRouter.post('/:id/sit', async (req: AuthRequest, res: Response) => {
  try {
    const char = await verifyCharacterOwnership(req, res);
    if (!char) return;
    const combat = CombatService.getSharedInstance();
    if (!combat.getPlayer(char.id)) {
      combat.join(char.userId || req.user!.id, char.id);
    }
    const result = combat.setSittingState(char.id, Boolean(req.body?.isSitting));
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message, error: err.message });
  }
});

/**
 * POST /api/v1/characters/:id/regen-tick
 * Server-authoritative HP/MP regeneration tick across combat/out-of-combat/sitting/item states.
 */
characterRouter.post('/:id/regen-tick', async (req: AuthRequest, res: Response) => {
  try {
    const char = await verifyCharacterOwnership(req, res);
    if (!char) return;
    const combat = CombatService.getSharedInstance();
    if (!combat.getPlayer(char.id)) {
      combat.join(char.userId || req.user!.id, char.id);
    }
    const result = combat.tickRegeneration(char.id, {
      deltaSeconds: req.body?.deltaSeconds,
      areaContext: req.body?.areaContext,
      consumableRegenStacks: req.body?.consumableRegenStacks,
    });
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message, error: err.message });
  }
});
