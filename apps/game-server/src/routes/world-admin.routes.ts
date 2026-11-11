import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { WorldAdminDomain, WorldAdminService } from '../services/world-admin.service.js';
import { WorldService } from '../services/world.service.js';
import { TerritoryService } from '../services/territory.service.js';
import { AuditSecurityService } from '../services/audit.service.js';

function assertAdminRoleOrConsole(req: Request): { actorId: string; actorRole: string } {
  const roleHeader = String(req.headers['x-user-role'] || req.headers['x-admin-role'] || '').toLowerCase();
  if (roleHeader && roleHeader !== 'admin' && roleHeader !== 'gm') {
    const err: any = new Error('Quyền hạn không đủ: Chỉ Admin mới được phép thay đổi cấu hình EXP máy chủ.');
    err.statusCode = 403;
    throw err;
  }
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    const token = auth.slice(7).trim();
    try {
      const decoded: any = jwt.verify(token, ENV.JWT_SECRET);
      const role = String(decoded?.role || 'player').toLowerCase();
      if (role !== 'admin' && role !== 'gm') {
        const err: any = new Error('Quyền hạn không đủ: Chỉ Admin mới được phép thay đổi cấu hình EXP máy chủ.');
        err.statusCode = 403;
        throw err;
      }
      return { actorId: String(decoded?.id || 'admin_user'), actorRole: role };
    } catch (e: any) {
      if (e.statusCode === 403) throw e;
      const err: any = new Error('Token xác thực Admin không hợp lệ.');
      err.statusCode = 401;
      throw err;
    }
  }
  return { actorId: 'admin_console', actorRole: 'admin' };
}

export const worldAdminRouter = Router();
const worldAdmin = new WorldAdminService();
const VALID_DOMAINS: WorldAdminDomain[] = [
  'maps',
  'monsters',
  'spawn_zones',
  'cities',
  'dungeons',
  'quests',
  'classes',
  'skills',
  'equipment_sets',
  'boss_configs',
  'drop_tables',
  'exp_tables',
  'crafting_recipes',
  'unique_equipment',
  'titles',
  'quest_chains',
];

worldAdminRouter.get('/config', (_req: Request, res: Response) => {
  const ws = WorldService.getInstance();
  res.json({
    success: true,
    data: {
      ...ws.getWorldConfig(),
      maxCharactersPerAccount: ws.getMaxCharactersPerAccount(),
    },
  });
});

worldAdminRouter.patch('/config', (req: Request, res: Response) => {
  try {
    const ws = WorldService.getInstance();
    const updated = ws.updateWorldConfig(req.body || {});
    ws.invalidateCache();
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

worldAdminRouter.get('/exp-balance', (_req: Request, res: Response) => {
  const ws = WorldService.getInstance();
  res.json({
    success: true,
    data: ws.getExpBalanceConfig(),
    history: ws.getExpBalanceAuditHistory(25),
  });
});

worldAdminRouter.get('/exp-balance/history', (req: Request, res: Response) => {
  const limit = Number(req.query.limit || 50);
  res.json({
    success: true,
    data: WorldService.getInstance().getExpBalanceAuditHistory(limit),
  });
});

worldAdminRouter.post('/exp-balance/preview', (req: Request, res: Response) => {
  try {
    assertAdminRoleOrConsole(req);
    const { configPatch, playerLevel, partyMemberCount } = req.body || {};
    const preview = WorldService.getInstance().previewExpBalanceConfig(
      configPatch || req.body || {},
      Number(playerLevel || 15),
      Number(partyMemberCount || 1)
    );
    res.json({ success: true, data: preview });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
});

worldAdminRouter.post('/exp-balance/toggle', (req: Request, res: Response) => {
  try {
    const actor = assertAdminRoleOrConsole(req);
    const enabled = Boolean(req.body?.enabled);
    const updated = WorldService.getInstance().updateExpBalanceConfig(
      { enabled },
      {
        ...actor,
        action: 'toggle',
        note: enabled ? 'Bật hệ thống nhân EXP Admin' : 'Tắt hệ thống nhân EXP Admin (về mặc định 1.0x)',
      }
    );
    WorldService.getInstance().invalidateCache();
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
});

worldAdminRouter.post('/exp-balance/rollback', (req: Request, res: Response) => {
  try {
    const actor = assertAdminRoleOrConsole(req);
    const version = Number(req.body?.version);
    const restored = WorldService.getInstance().rollbackExpBalanceConfig(version, actor);
    WorldService.getInstance().invalidateCache();
    res.json({ success: true, data: restored });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
});

worldAdminRouter.get('/economy', (_req: Request, res: Response) => {
  res.json({ success: true, data: WorldService.getInstance().getEconomyConfig() });
});

worldAdminRouter.patch('/economy', (req: Request, res: Response) => {
  try {
    const updated = WorldService.getInstance().updateEconomyConfig(req.body || {});
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

worldAdminRouter.post('/territories/reset-season', async (_req: Request, res: Response) => {
  try {
    const data = await TerritoryService.getInstance().resetTerritorySeason();
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

worldAdminRouter.get('/audit-logs', (req: Request, res: Response) => {
  const limit = Number(req.query.limit || 60);
  res.json({ success: true, data: AuditSecurityService.getInstance().listAuditLogs(limit) });
});

worldAdminRouter.patch('/exp-balance', (req: Request, res: Response) => {
  try {
    const actor = assertAdminRoleOrConsole(req);
    const updated = WorldService.getInstance().updateExpBalanceConfig(req.body || {}, {
      ...actor,
      action: 'update',
      note: req.body?.note,
    });
    WorldService.getInstance().invalidateCache();
    res.json({ success: true, data: updated, history: WorldService.getInstance().getExpBalanceAuditHistory(25) });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
});

function parseDomain(raw: string): WorldAdminDomain {
  if (!VALID_DOMAINS.includes(raw as WorldAdminDomain)) {
    const err: any = new Error(`Domain quản trị không hợp lệ: ${raw}`);
    err.statusCode = 404;
    throw err;
  }
  return raw as WorldAdminDomain;
}

worldAdminRouter.get('/layout', (_req: Request, res: Response) => {
  try {
    res.json({ success: true, data: worldAdmin.getWorldLayoutSnapshot() });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

worldAdminRouter.get('/layout/validate', (_req: Request, res: Response) => {
  try {
    res.json({ success: true, data: worldAdmin.validateWorldLayout() });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

worldAdminRouter.post('/layout/reset-approved', (_req: Request, res: Response) => {
  try {
    res.json({ success: true, data: worldAdmin.resetApprovedWorldLayout() });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

worldAdminRouter.put('/npcs/:id', (req: Request, res: Response) => {
  try {
    const result = worldAdmin.updateNpcPlacement(req.params.id, req.body || {});
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message, validation: err.validation });
  }
});

worldAdminRouter.put('/portals/:id', (req: Request, res: Response) => {
  try {
    const result = worldAdmin.updatePortalPlacement(req.params.id, req.body || {});
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message, validation: err.validation });
  }
});

worldAdminRouter.get('/:domain', (req: Request, res: Response) => {
  try {
    const domain = parseDomain(req.params.domain);
    const result = worldAdmin.list(domain, {
      search: req.query.search as string,
      status: req.query.status as string,
      regionId: req.query.regionId as string,
      hubId: req.query.hubId as string,
      classId: req.query.classId as string,
      category: req.query.category as string,
      page: Number(req.query.page || 1),
      limit: Number(req.query.limit || 250),
    });
    res.json({ success: true, data: result.items, meta: result.meta });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
});

worldAdminRouter.get('/:domain/:id', (req: Request, res: Response) => {
  try {
    const domain = parseDomain(req.params.domain);
    const item = worldAdmin.getById(domain, req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Không tìm thấy bản ghi.' });
    res.json({ success: true, data: item });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
});

worldAdminRouter.post('/:domain', (req: Request, res: Response) => {
  try {
    const domain = parseDomain(req.params.domain);
    const created = worldAdmin.create(domain, req.body);
    WorldService.getInstance().invalidateCache();
    res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

worldAdminRouter.patch('/:domain/:id', (req: Request, res: Response) => {
  try {
    const domain = parseDomain(req.params.domain);
    const updated = worldAdmin.update(domain, req.params.id, req.body);
    WorldService.getInstance().invalidateCache();
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

worldAdminRouter.post('/:domain/:id/duplicate', (req: Request, res: Response) => {
  try {
    const domain = parseDomain(req.params.domain);
    const copy = worldAdmin.duplicate(domain, req.params.id);
    WorldService.getInstance().invalidateCache();
    res.status(201).json({ success: true, data: copy });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

worldAdminRouter.post('/:domain/:id/testing', (req: Request, res: Response) => {
  try {
    const domain = parseDomain(req.params.domain);
    const updated = worldAdmin.transitionStatus(domain, req.params.id, 'testing');
    WorldService.getInstance().invalidateCache();
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

worldAdminRouter.post('/:domain/:id/publish', (req: Request, res: Response) => {
  try {
    const domain = parseDomain(req.params.domain);
    const updated = worldAdmin.transitionStatus(domain, req.params.id, 'published');
    WorldService.getInstance().invalidateCache();
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

worldAdminRouter.post('/:domain/:id/archive', (req: Request, res: Response) => {
  try {
    const domain = parseDomain(req.params.domain);
    const updated = worldAdmin.transitionStatus(domain, req.params.id, 'archived');
    WorldService.getInstance().invalidateCache();
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

worldAdminRouter.delete('/:domain/:id', (req: Request, res: Response) => {
  try {
    const domain = parseDomain(req.params.domain);
    const removed = worldAdmin.remove(domain, req.params.id);
    WorldService.getInstance().invalidateCache();
    res.json({ success: true, data: removed });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

worldAdminRouter.get('/:domain/:id/versions', (req: Request, res: Response) => {
  try {
    const domain = parseDomain(req.params.domain);
    const versions = worldAdmin.getVersions(domain, req.params.id);
    res.json({ success: true, data: versions });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

worldAdminRouter.post('/:domain/:id/rollback', (req: Request, res: Response) => {
  try {
    const domain = parseDomain(req.params.domain);
    const version = Number(req.body?.version ?? req.body?.versionNumber);
    if (!Number.isFinite(version)) {
      return res.status(400).json({ success: false, message: 'Thiếu số phiên bản version cần rollback.' });
    }
    const restored = worldAdmin.rollback(domain, req.params.id, version);
    WorldService.getInstance().invalidateCache();
    res.json({ success: true, data: restored });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});
