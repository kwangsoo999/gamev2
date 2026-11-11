import { Router } from 'express';
import {
  INITIAL_CLASSES,
  INITIAL_SKILLS,
  INITIAL_EQUIPMENT_SETS,
  INITIAL_CRAFTING_RECIPES,
  SET_FRAGMENT_CONFIGS,
  INITIAL_BOSS_CONFIGS,
  RARITY_CONFIGS,
  ADVANCED_JOB_DEFINITIONS,
  getAdvancedBranchesForClass,
  ALL_PASSIVE_DEFINITIONS,
  BASE_JOB_PASSIVES,
  ADVANCED_JOB_PASSIVES,
  PASSIVE_PROGRESSION_CONFIG,
  STAT_CAP_RULES,
  STAT_CALCULATION_ORDER,
  JOB_AFFINITY_CONFIGS,
  generateLv1To200BalanceTable,
  runAutomatedBalanceSimulation,
  GAME_BRANDING,
  SAFE_VILLAGE_CHECKPOINTS,
} from '@elysia/game-data-schema';
import { WorldService } from '../services/world.service.js';
import { QuestTitleService } from '../services/quest-title.service.js';
import { CharacterService } from '../services/character.service.js';
import { authenticate as authenticateToken, AuthRequest } from '../middleware/auth.js';

export const gameRouter = Router();
const worldService = WorldService.getInstance();
const questTitleService = QuestTitleService.getInstance();
const characterService = new CharacterService();

async function resolveTargetCharacter(req: AuthRequest) {
  const explicitId = String(req.body?.characterId || req.query?.characterId || '');
  if (explicitId) {
    const c = await characterService.getCharacterById(explicitId);
    if (c && (!req.user || c.userId === req.user.id || req.user.role === 'admin')) return c;
  }
  if (req.user?.id) {
    const list = await characterService.getCharactersByUserId(req.user.id);
    if (list.length > 0) return list[0];
  }
  return null;
}

gameRouter.get('/classes', (_req, res) => {
  const fromWorld = worldService.getClasses();
  res.json({ success: true, data: fromWorld.length ? fromWorld : INITIAL_CLASSES });
});

gameRouter.get('/class-evolutions', (_req, res) => {
  res.json({ success: true, data: worldService.getClassEvolutions() });
});

gameRouter.get('/second-jobs', (_req, res) => {
  res.json({ success: true, data: worldService.getSecondJobSpecializations() });
});

gameRouter.get('/advanced-jobs', (req, res) => {
  const parentClassId = typeof req.query.parentClassId === 'string' ? req.query.parentClassId : '';
  const data = parentClassId
    ? getAdvancedBranchesForClass(parentClassId)
    : ADVANCED_JOB_DEFINITIONS;
  res.json({ success: true, data });
});

gameRouter.get('/passives', (req, res) => {
  const category = typeof req.query.category === 'string' ? req.query.category : '';
  const classRequirement = typeof req.query.classId === 'string' ? req.query.classId : '';
  let list = ALL_PASSIVE_DEFINITIONS;
  if (category) list = list.filter((p) => p.category === category);
  if (classRequirement) list = list.filter((p) => p.classRequirement === classRequirement);
  res.json({
    success: true,
    data: {
      passives: list,
      baseCount: BASE_JOB_PASSIVES.length,
      advancedCount: ADVANCED_JOB_PASSIVES.length,
      progressionConfig: PASSIVE_PROGRESSION_CONFIG,
    },
  });
});

gameRouter.get('/stats-config', (_req, res) => {
  res.json({
    success: true,
    data: {
      calculationOrder: STAT_CALCULATION_ORDER,
      capRules: STAT_CAP_RULES,
      jobAffinityConfigs: JOB_AFFINITY_CONFIGS,
      balanceTableLv1To200: generateLv1To200BalanceTable(),
    },
  });
});

gameRouter.post('/balance/simulate', (req, res) => {
  const levels = Array.isArray(req.body?.levels) ? req.body.levels.map(Number) : [80, 120, 160];
  const scenarios = Array.isArray(req.body?.scenarios) ? req.body.scenarios : undefined;
  const sim = runAutomatedBalanceSimulation({ levels, scenarios });
  res.json({ success: true, data: sim });
});

gameRouter.get('/config', (_req, res) => {
  const cfg = worldService.getWorldConfig();
  res.json({
    success: true,
    data: {
      worldId: cfg?.worldId || 'WORLD_ELYSIA_CHRONICLES',
      branding: GAME_BRANDING,
      maxCharactersPerAccount: worldService.getMaxCharactersPerAccount(),
      levelCap: Number(cfg?.levelCap || 110),
      operationsConfig: worldService.getOperationsConfig(),
      safeVillageCheckpoints: SAFE_VILLAGE_CHECKPOINTS,
    },
  });
});

gameRouter.get('/operations-config', (_req, res) => {
  res.json({
    success: true,
    data: worldService.getOperationsConfig(),
    branding: GAME_BRANDING,
    checkpoints: SAFE_VILLAGE_CHECKPOINTS,
  });
});

gameRouter.get('/skills', (req, res) => {
  const includeAll = req.query.includeAll === 'true';
  const fromWorld = worldService.getSkills(includeAll);
  res.json({ success: true, data: fromWorld.length ? fromWorld : INITIAL_SKILLS });
});

gameRouter.get('/equipment-sets', (req, res) => {
  const includeAll = req.query.includeAll === 'true';
  const fromWorld = worldService.getEquipmentSets(includeAll);
  res.json({ success: true, data: fromWorld.length ? fromWorld : INITIAL_EQUIPMENT_SETS });
});

gameRouter.get('/crafting-recipes', (req, res) => {
  const includeAll = req.query.includeAll === 'true';
  const fromWorld = worldService.getCraftingRecipes(includeAll);
  res.json({ success: true, data: fromWorld.length ? fromWorld : INITIAL_CRAFTING_RECIPES });
});

gameRouter.get('/set-fragments', (_req, res) => {
  const fromWorld = worldService.getSetFragments();
  res.json({ success: true, data: fromWorld.length ? fromWorld : SET_FRAGMENT_CONFIGS });
});

gameRouter.get('/boss-configs', (req, res) => {
  const includeAll = req.query.includeAll === 'true';
  const fromWorld = worldService.getBossConfigs(includeAll);
  res.json({ success: true, data: fromWorld.length ? fromWorld : INITIAL_BOSS_CONFIGS });
});

gameRouter.get('/rarities', (_req, res) => {
  res.json({ success: true, data: RARITY_CONFIGS });
});

gameRouter.get('/world-items', (req, res) => {
  const includeAll = req.query.includeAll === 'true';
  res.json({ success: true, data: worldService.getWorldItems(includeAll) });
});

gameRouter.get('/maps', (req, res) => {
  const includeAll = req.query.includeAll === 'true';
  res.json({ success: true, data: worldService.getMaps(includeAll) });
});

gameRouter.get('/cities', (req, res) => {
  const includeAll = req.query.includeAll === 'true';
  res.json({ success: true, data: worldService.getCities(includeAll) });
});

gameRouter.get('/dungeons', (req, res) => {
  const includeAll = req.query.includeAll === 'true';
  res.json({ success: true, data: worldService.getDungeons(includeAll) });
});

gameRouter.get('/exp-tables', (_req, res) => {
  res.json({ success: true, data: worldService.getExpTables() });
});

gameRouter.get('/connections', (_req, res) => {
  res.json({ success: true, data: worldService.getConnections() });
});

gameRouter.get('/regions', (_req, res) => {
  res.json({ success: true, data: worldService.getRegions() });
});

gameRouter.get('/monsters', (req, res) => {
  const includeAll = req.query.includeAll === 'true';
  res.json({ success: true, data: worldService.getMonsters(includeAll) });
});

gameRouter.get('/monster-skills', (_req, res) => {
  res.json({ success: true, data: worldService.getMonsterSkills() });
});

gameRouter.get('/drop-tables', (req, res) => {
  const includeAll = req.query.includeAll === 'true';
  res.json({ success: true, data: worldService.getDropTables(includeAll) });
});

gameRouter.get('/npcs', (_req, res) => {
  res.json({ success: true, data: worldService.getNpcs() });
});

gameRouter.get('/dialogues', (_req, res) => {
  res.json({ success: true, data: worldService.getDialogues() });
});

gameRouter.get('/spawns', (_req, res) => {
  res.json({ success: true, data: worldService.getSpawnPoints(false) });
});

gameRouter.get('/spawn-zones', (_req, res) => {
  res.json({ success: true, data: worldService.getSpawnPoints(false) });
});

gameRouter.get('/exp-balance', (_req, res) => {
  res.json({ success: true, data: worldService.getExpBalanceConfig() });
});

gameRouter.get('/quests', (req, res) => {
  const characterId = typeof req.query.characterId === 'string' ? req.query.characterId.trim() : '';
  if (characterId) {
    try {
      const journal = questTitleService.getPlayerJournal(characterId);
      return res.json({ success: true, data: journal.visibleQuests });
    } catch {
      // Fallback to public non-hidden quests if characterId not found
    }
  }
  const all = worldService.getQuests(false);
  // Strict Hidden Quest Rule: Public quest list never leaks undiscovered hidden quests
  const visible = all.filter((q: any) => !q.isHidden && q.questType !== 'HIDDEN_QUEST');
  res.json({ success: true, data: visible });
});

gameRouter.get('/quests/available', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const char = await resolveTargetCharacter(req);
    if (!char) return res.status(404).json({ success: false, error: 'Không tìm thấy nhân vật.' });
    const journal = questTitleService.getPlayerJournal(char.id);
    res.json({ success: true, data: journal.availableQuests });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, error: err.message });
  }
});

gameRouter.get('/quests/active', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const char = await resolveTargetCharacter(req);
    if (!char) return res.status(404).json({ success: false, error: 'Không tìm thấy nhân vật.' });
    const journal = questTitleService.getPlayerJournal(char.id);
    res.json({ success: true, data: journal.activeQuests });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, error: err.message });
  }
});

gameRouter.get('/quests/completed', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const char = await resolveTargetCharacter(req);
    if (!char) return res.status(404).json({ success: false, error: 'Không tìm thấy nhân vật.' });
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

gameRouter.get('/quests/tracked', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const char = await resolveTargetCharacter(req);
    if (!char) return res.status(404).json({ success: false, error: 'Không tìm thấy nhân vật.' });
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

gameRouter.post('/quests/accept', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const char = await resolveTargetCharacter(req);
    if (!char) return res.status(404).json({ success: false, error: 'Không tìm thấy nhân vật.' });
    const questId = String(req.body?.questId || req.body?.id || '');
    const progress = questTitleService.acceptQuest(char.id, questId);
    res.json({ success: true, data: progress });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, error: err.message });
  }
});

gameRouter.post('/quests/track', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const char = await resolveTargetCharacter(req);
    if (!char) return res.status(404).json({ success: false, error: 'Không tìm thấy nhân vật.' });
    const rawId = req.body?.questId;
    const targetId = rawId === null || rawId === undefined || rawId === '' || rawId === 'none' || rawId === 'untrack' ? null : String(rawId);
    const result = questTitleService.trackQuest(char.id, targetId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, error: err.message });
  }
});

gameRouter.post('/quests/abandon', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const char = await resolveTargetCharacter(req);
    if (!char) return res.status(404).json({ success: false, error: 'Không tìm thấy nhân vật.' });
    const questId = String(req.body?.questId || req.body?.id || '');
    const result = questTitleService.abandonQuest(char.id, questId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, error: err.message });
  }
});

gameRouter.post('/quests/complete', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const char = await resolveTargetCharacter(req);
    if (!char) return res.status(404).json({ success: false, error: 'Không tìm thấy nhân vật.' });
    const questId = String(req.body?.questId || req.body?.id || '');
    const result = questTitleService.claimQuestRewards(char.id, questId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, error: err.message });
  }
});

gameRouter.post('/npc/interact', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const char = await resolveTargetCharacter(req);
    if (!char) return res.status(404).json({ success: false, error: 'Không tìm thấy nhân vật.' });
    const npcId = String(req.body?.npcId || '');
    const keyword = typeof req.body?.keyword === 'string' ? req.body.keyword : undefined;
    const progress = questTitleService.recordProgress(char.id, {
      type: 'NPC_DIALOGUE',
      targetId: npcId,
      keyword,
    });
    const journal = questTitleService.getPlayerJournal(char.id);
    res.json({
      success: true,
      data: {
        npcId,
        ...progress,
        availableQuestsForNpc: journal.availableQuests.filter((q: any) => q.startNpcId === npcId),
        readyToCompleteForNpc: journal.readyToCompleteQuests.filter((q: any) => (q.endNpcId || q.startNpcId) === npcId),
      },
    });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, error: err.message });
  }
});

gameRouter.post('/inventory/sort', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const char = await resolveTargetCharacter(req);
    if (!char) return res.status(404).json({ success: false, error: 'Không tìm thấy nhân vật.' });
    const result = await characterService.sortCharacterInventory(char.id);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, error: err.message });
  }
});

gameRouter.post('/inventory/discard', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const char = await resolveTargetCharacter(req);
    if (!char) return res.status(404).json({ success: false, error: 'Không tìm thấy nhân vật.' });
    const itemId = String(req.body?.itemId || req.body?.id || '');
    const quantity = Number(req.body?.quantity ?? req.body?.qty ?? 1);
    const result = await characterService.discardInventoryItem(char.id, itemId, quantity);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, error: err.message });
  }
});

gameRouter.post('/equipment/repair', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const char = await resolveTargetCharacter(req);
    if (!char) return res.status(404).json({ success: false, error: 'Không tìm thấy nhân vật.' });
    const result = await characterService.repairCharacterEquipment(char.id);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, error: err.message });
  }
});

gameRouter.post('/quests/:id/accept', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const char = await resolveTargetCharacter(req);
    if (!char) return res.status(404).json({ success: false, error: 'Không tìm thấy nhân vật.' });
    const progress = questTitleService.acceptQuest(char.id, req.params.id);
    res.json({ success: true, data: progress });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, error: err.message });
  }
});

gameRouter.post('/quests/:id/track', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const char = await resolveTargetCharacter(req);
    if (!char) return res.status(404).json({ success: false, error: 'Không tìm thấy nhân vật.' });
    const rawId = req.params.id;
    const targetId = rawId === 'none' || rawId === 'null' || rawId === 'untrack' ? null : rawId;
    const result = questTitleService.trackQuest(char.id, targetId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, error: err.message });
  }
});

gameRouter.post('/quests/:id/abandon', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const char = await resolveTargetCharacter(req);
    if (!char) return res.status(404).json({ success: false, error: 'Không tìm thấy nhân vật.' });
    const result = questTitleService.abandonQuest(char.id, req.params.id);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, error: err.message });
  }
});

gameRouter.post('/quests/:id/complete', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const char = await resolveTargetCharacter(req);
    if (!char) return res.status(404).json({ success: false, error: 'Không tìm thấy nhân vật.' });
    const result = questTitleService.claimQuestRewards(char.id, req.params.id);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, error: err.message });
  }
});

gameRouter.get('/shop/catalog', (_req, res) => {
  res.json({ success: true, data: characterService.getShopCatalog() });
});

gameRouter.post('/shop/buy', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const char = await resolveTargetCharacter(req);
    if (!char) return res.status(404).json({ success: false, error: 'Không tìm thấy nhân vật.' });
    const itemId = String(req.body?.itemId || req.body?.id || '');
    const quantity = Number(req.body?.quantity ?? req.body?.qty ?? 1);
    const result = await characterService.buyShopItem(char.id, itemId, quantity);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message, error: err.message });
  }
});

gameRouter.post('/shop/sell', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const char = await resolveTargetCharacter(req);
    if (!char) return res.status(404).json({ success: false, error: 'Không tìm thấy nhân vật.' });
    const itemId = String(req.body?.itemId || req.body?.id || '');
    const quantity = Number(req.body?.quantity ?? req.body?.qty ?? 1);
    const result = await characterService.sellInventoryItem(char.id, itemId, quantity);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message, error: err.message });
  }
});

gameRouter.get('/quest-chains', (req, res) => {
  const includeAll = req.query.includeAll === 'true';
  res.json({ success: true, data: worldService.getQuestChains(includeAll) });
});

gameRouter.get('/unique-equipment', (req, res) => {
  const includeAll = req.query.includeAll === 'true';
  res.json({ success: true, data: worldService.getUniqueEquipment(includeAll) });
});

gameRouter.get('/titles', (req, res) => {
  const includeAll = req.query.includeAll === 'true';
  res.json({
    success: true,
    data: worldService.getTitles(includeAll),
    meta: { titleBonusLimits: worldService.getTitleBonusLimits() },
  });
});

gameRouter.get('/validation/integrity', (_req, res) => {
  res.json({ success: true, data: questTitleService.validateAllDataReferences() });
});

gameRouter.get('/world-config', (_req, res) => {
  res.json({ success: true, data: worldService.getWorldConfig() });
});
