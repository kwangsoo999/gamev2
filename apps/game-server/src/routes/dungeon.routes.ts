import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { JsonStore } from '../database/jsonStore.js';
import { DungeonService } from '../services/dungeon.service.js';
import { JobService } from '../services/job.service.js';

export const dungeonRouter = Router();
export const jobRouter = Router();

const store = JsonStore.getInstance();
const dungeonService = DungeonService.getInstance();
const jobService = JobService.getInstance();

function verifyCharOwnership(req: AuthRequest, characterId: string) {
  const char = store.characters.find((c) => c.id === characterId);
  if (!char) {
    const err: any = new Error('Không tìm thấy nhân vật.');
    err.statusCode = 404;
    throw err;
  }
  if (char.userId !== req.user!.id && req.user!.role !== 'admin') {
    const err: any = new Error('Bạn không sở hữu nhân vật này.');
    err.statusCode = 403;
    throw err;
  }
  return char;
}

dungeonRouter.use(authenticate);

dungeonRouter.get('/active/:characterId', (req: AuthRequest, res: Response) => {
  try {
    verifyCharOwnership(req, req.params.characterId);
    const inst = dungeonService.getActiveInstanceForCharacter(req.params.characterId);
    res.json({ success: true, data: inst });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message, error: err.message });
  }
});

dungeonRouter.post('/enter', (req: AuthRequest, res: Response) => {
  try {
    const { characterId, dungeonId = 'dungeon_sanctum_of_awakening', mode = 'solo', partyId, partyMemberIds } = req.body || {};
    verifyCharOwnership(req, characterId);
    const inst = dungeonService.enterDungeon(characterId, dungeonId, { mode, partyId, partyMemberIds });
    res.status(201).json({ success: true, data: inst });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message, error: err.message });
  }
});

dungeonRouter.post('/:instanceId/collect-fragment', (req: AuthRequest, res: Response) => {
  try {
    const { characterId, fragmentId } = req.body || {};
    verifyCharOwnership(req, characterId);
    const inst = dungeonService.collectFragment(req.params.instanceId, characterId, fragmentId);
    res.json({ success: true, data: inst });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message, error: err.message });
  }
});

dungeonRouter.post('/:instanceId/activate-pillar', (req: AuthRequest, res: Response) => {
  try {
    const { characterId, pillarId } = req.body || {};
    verifyCharOwnership(req, characterId);
    const inst = dungeonService.activatePillar(req.params.instanceId, characterId, pillarId);
    res.json({ success: true, data: inst });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message, error: err.message });
  }
});

dungeonRouter.post('/:instanceId/advance-floor', (req: AuthRequest, res: Response) => {
  try {
    const { characterId, targetFloor } = req.body || {};
    verifyCharOwnership(req, characterId);
    const inst = dungeonService.advanceFloor(req.params.instanceId, characterId, Number(targetFloor));
    res.json({ success: true, data: inst });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message, error: err.message });
  }
});

dungeonRouter.post('/:instanceId/attack-boss', (req: AuthRequest, res: Response) => {
  try {
    const { characterId, strikeCount = 1 } = req.body || {};
    verifyCharOwnership(req, characterId);
    const result = dungeonService.attackBoss(req.params.instanceId, characterId, Number(strikeCount));
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message, error: err.message });
  }
});

jobRouter.use(authenticate);

jobRouter.get('/status/:characterId', (req: AuthRequest, res: Response) => {
  try {
    verifyCharOwnership(req, req.params.characterId);
    const status = jobService.getStatus(req.params.characterId);
    res.json({ success: true, data: status });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message, error: err.message });
  }
});

jobRouter.get('/awakening-result/:characterId', (req: AuthRequest, res: Response) => {
  try {
    verifyCharOwnership(req, req.params.characterId);
    const result = jobService.getAwakeningResult(req.params.characterId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message, error: err.message });
  }
});

jobRouter.post('/awaken', (req: AuthRequest, res: Response) => {
  try {
    const { characterId, targetClassId, classId } = req.body || {};
    verifyCharOwnership(req, characterId);
    const forbiddenManual = targetClassId || classId;
    const result = jobService.awakenCharacter(characterId, forbiddenManual);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message, error: err.message });
  }
});

// Backwards-compatible route also rejects manual class selection cleanly
jobRouter.post('/advance', (req: AuthRequest, res: Response) => {
  try {
    const { characterId, targetClassId, classId } = req.body || {};
    verifyCharOwnership(req, characterId);
    const forbiddenManual = targetClassId || classId;
    const result = jobService.awakenCharacter(characterId, forbiddenManual);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message, error: err.message });
  }
});

jobRouter.get('/advanced-jobs/:characterId', (req: AuthRequest, res: Response) => {
  try {
    verifyCharOwnership(req, req.params.characterId);
    const data = jobService.getAdvancedEvolutionOptions(req.params.characterId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message, error: err.message });
  }
});

jobRouter.post('/advance-lv80', (req: AuthRequest, res: Response) => {
  try {
    const { characterId, branchId, advancedJobId } = req.body || {};
    verifyCharOwnership(req, characterId);
    const result = jobService.selectLv80AdvancedJob(characterId, String(branchId || advancedJobId || ''));
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message, error: err.message });
  }
});
