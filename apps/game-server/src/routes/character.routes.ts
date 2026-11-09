import { Router, Response } from 'express';
import { CharacterService } from '../services/character.service.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

export const characterRouter = Router();
const characterService = new CharacterService();

// Enforce authentication on all character endpoints
characterRouter.use(authenticate);

/**
 * GET /api/v1/characters
 * Returns characters owned by the authenticated account
 */
characterRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    // Admins may query other users' characters via query param
    const targetUserId = req.user!.role === 'admin' && req.query.userId ? (req.query.userId as string) : userId;
    const chars = await characterService.getCharactersByUserId(targetUserId);
    res.json({ success: true, data: chars });
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
    res.status(400).json({ success: false, message: err.message, error: err.message });
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

    res.json({ success: true, data: char });
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

    // Sanitize updates: prevent players from directly overwriting sensitive progression metrics
    const allowedFields = ['appearance', 'attributes', 'equipment', 'x', 'y', 'regionId'];
    const sanitizedUpdates: Record<string, any> = {};

    for (const key of Object.keys(req.body)) {
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

    await characterService.deleteCharacter(req.params.id, char.userId || req.user!.id);
    res.json({ success: true, message: 'Đã xóa nhân vật thành công.' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});
