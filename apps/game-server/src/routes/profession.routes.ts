import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { CharacterService } from '../services/character.service.js';
import { ProfessionService } from '../services/profession.service.js';

export const professionRouter = Router();
const profService = ProfessionService.getInstance();
const charService = new CharacterService();

professionRouter.get('/catalog', (_req, res: Response) => {
  res.json({ success: true, data: profService.getCatalog() });
});

professionRouter.use(authenticate);

async function requireOwnedChar(req: AuthRequest, res: Response): Promise<string | null> {
  const charId = String(req.params.charId || req.body?.characterId || '');
  const char = await charService.getCharacterById(charId);
  if (!char) {
    res.status(404).json({ success: false, error: 'Không tìm thấy nhân vật.' });
    return null;
  }
  if (char.userId !== req.user!.id && req.user!.role !== 'admin') {
    res.status(403).json({ success: false, error: 'Quyền truy cập nhân vật bị từ chối.' });
    return null;
  }
  return charId;
}

professionRouter.get('/:charId', async (req: AuthRequest, res: Response) => {
  try {
    const cid = await requireOwnedChar(req, res);
    if (!cid) return;
    res.json({ success: true, data: profService.getCharacterProfessionOverview(cid) });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

professionRouter.post('/:charId/learn', async (req: AuthRequest, res: Response) => {
  try {
    const cid = await requireOwnedChar(req, res);
    if (!cid) return;
    const data = await profService.learnProfession(cid, req.body?.professionId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

professionRouter.post('/:charId/tools/buy', async (req: AuthRequest, res: Response) => {
  try {
    const cid = await requireOwnedChar(req, res);
    if (!cid) return;
    const data = await profService.buyAndEquipTool(cid, req.body?.toolId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

professionRouter.post('/:charId/tools/repair', async (req: AuthRequest, res: Response) => {
  try {
    const cid = await requireOwnedChar(req, res);
    if (!cid) return;
    const data = await profService.repairTool(cid, req.body?.professionId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

professionRouter.post('/:charId/tools/equip', async (req: AuthRequest, res: Response) => {
  try {
    const cid = await requireOwnedChar(req, res);
    if (!cid) return;
    const data = await profService.equipTool(cid, req.body?.toolId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

professionRouter.post('/:charId/gather/start', async (req: AuthRequest, res: Response) => {
  try {
    const cid = await requireOwnedChar(req, res);
    if (!cid) return;
    const data = await profService.startGathering(cid, req.body?.nodeId, {
      instantForTest: Boolean(req.body?.instantForTest),
    });
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

professionRouter.post('/:charId/gather/complete', async (req: AuthRequest, res: Response) => {
  try {
    const cid = await requireOwnedChar(req, res);
    if (!cid) return;
    const data = await profService.completeGathering(cid, req.body?.sessionId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

professionRouter.post('/:charId/farm/plant', async (req: AuthRequest, res: Response) => {
  try {
    const cid = await requireOwnedChar(req, res);
    if (!cid) return;
    const data = await profService.plantFarmCrop(cid, req.body?.seedItemId, {
      instantGrowForTest: Boolean(req.body?.instantGrowForTest),
    });
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

professionRouter.post('/:charId/farm/water', async (req: AuthRequest, res: Response) => {
  try {
    const cid = await requireOwnedChar(req, res);
    if (!cid) return;
    const data = await profService.waterFarmPlot(cid, req.body?.plotId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

professionRouter.post('/:charId/farm/harvest', async (req: AuthRequest, res: Response) => {
  try {
    const cid = await requireOwnedChar(req, res);
    if (!cid) return;
    const data = await profService.harvestFarmPlot(cid, req.body?.plotId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

professionRouter.get('/:charId/craft/preview/:recipeId', async (req: AuthRequest, res: Response) => {
  try {
    const cid = await requireOwnedChar(req, res);
    if (!cid) return;
    const data = profService.getCraftPreview(cid, req.params.recipeId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

professionRouter.post('/:charId/craft', async (req: AuthRequest, res: Response) => {
  try {
    const cid = await requireOwnedChar(req, res);
    if (!cid) return;
    const data = await profService.craftRecipe(
      cid,
      req.body?.recipeId,
      Number(req.body?.quantity ?? 1),
      req.body?.txId
    );
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

professionRouter.post('/:charId/recipes/learn', async (req: AuthRequest, res: Response) => {
  try {
    const cid = await requireOwnedChar(req, res);
    if (!cid) return;
    const data = await profService.learnRecipe(cid, req.body?.recipeId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

professionRouter.post('/:charId/quests/complete', async (req: AuthRequest, res: Response) => {
  try {
    const cid = await requireOwnedChar(req, res);
    if (!cid) return;
    const data = await profService.completeProfessionQuest(cid, req.body?.questId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});
