import { Router } from 'express';
import { AuthService } from '../services/auth.service.js';
import { CharacterService } from '../services/character.service.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

export const authRouter = Router();
const authService = AuthService.getInstance();
const characterService = new CharacterService();

authRouter.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const result = await authService.register(username, email, password);
    res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

authRouter.post('/login', async (req, res) => {
  try {
    const { usernameOrEmail, username, email, password } = req.body;
    const identifier = usernameOrEmail || username || email;
    const result = await authService.login(identifier, password);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(401).json({ success: false, error: err.message });
  }
});

authRouter.post('/logout', authenticate, (req: AuthRequest, res) => {
  const result = authService.logout(req.user?.jti, req.user?.id);
  res.json({ success: true, data: result });
});

authRouter.post('/forgot-password', async (req, res) => {
  try {
    const { usernameOrEmail, username, email } = req.body || {};
    const result = await authService.requestPasswordReset(usernameOrEmail || username || email);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

authRouter.post('/reset-password', async (req, res) => {
  try {
    const { usernameOrEmail, resetCode, newPassword } = req.body || {};
    const result = await authService.confirmPasswordReset(usernameOrEmail, resetCode, newPassword);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

authRouter.post('/change-password', authenticate, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    const result = await authService.changePassword(req.user!.id, currentPassword, newPassword);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

authRouter.get('/sessions', authenticate, (req: AuthRequest, res) => {
  res.json({ success: true, data: authService.listActiveSessions(req.user!.id) });
});

authRouter.post('/guest', async (_req, res) => {
  try {
    const session = await authService.createGuestSession();
    const charName = `LuKhach_${Date.now().toString(36).slice(-4)}`;
    const starterChar = await characterService.createCharacter(session.user.id, {
      name: charName,
      gender: 'female',
      classId: 'adventurer',
      useCreationBonusPool: true,
      bonusAllocations: { str: 0, dex: 0, agi: 0, int: 0, con: 0 },
    });
    const computedStats = characterService.getComputedStatsSummary(starterChar.id);
    res.status(201).json({
      success: true,
      data: {
        ...session,
        character: starterChar,
        computedStats,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

authRouter.get('/me', authenticate, (req: AuthRequest, res) => {
  res.json({ success: true, data: req.user });
});
