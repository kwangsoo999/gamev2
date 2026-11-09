import { Router } from 'express';
import { CharacterService } from '../services/character.service.js';
import { AuthRequest, authenticate } from '../middleware/auth.js';

export const characterRouter = Router();
const characterService = new CharacterService();
characterRouter.use(authenticate);

characterRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const chars = await characterService.getCharactersByUserId(req.user!.id);
    res.json({ success: true, data: chars });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

characterRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const character = await characterService.createCharacter(req.user!.id, req.body);
    res.status(201).json({ success: true, data: character });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message, error: err.message });
  }
});

characterRouter.get('/:id', async (req: AuthRequest, res) => {
  try {
    const char = await characterService.getCharacterById(req.params.id);
    if (!char || char.userId !== req.user!.id) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy nhân vật.' });
    }
    res.json({ success: true, data: char });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

characterRouter.patch('/:id', async (req: AuthRequest, res) => {
  try {
    const char = await characterService.getCharacterById(req.params.id);
    if (!char || char.userId !== req.user!.id) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy nhân vật.' });
    }
    const allowedUpdates = { name: req.body?.name, appearance: req.body?.appearance };
    const updates = Object.fromEntries(Object.entries(allowedUpdates).filter(([, value]) => value !== undefined));
    const updated = await characterService.updateCharacter(req.params.id, updates);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

characterRouter.delete('/:id', async (req: AuthRequest, res) => {
  try {
    await characterService.deleteCharacter(req.params.id, req.user!.id);
    res.json({ success: true, message: 'Đã xóa nhân vật thành công.' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});
