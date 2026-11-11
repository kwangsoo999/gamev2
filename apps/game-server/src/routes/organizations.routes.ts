import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { AuditSecurityService } from '../services/audit.service.js';
import { CharacterService } from '../services/character.service.js';
import { GuildService } from '../services/guild.service.js';
import { MerchantMarketplaceService } from '../services/merchant.service.js';
import { TerritoryService } from '../services/territory.service.js';

export const guildRouter = Router();
export const merchantRouter = Router();
export const marketplaceRouter = Router();
export const territoryRouter = Router();

const charService = new CharacterService();
const guildService = GuildService.getInstance();
const merchantService = MerchantMarketplaceService.getInstance();
const territoryService = TerritoryService.getInstance();
const auditService = AuditSecurityService.getInstance();

async function requireOwnedChar(req: AuthRequest, res: Response, overrideCharId?: string): Promise<string | null> {
  const charId = String(overrideCharId || req.body?.characterId || req.params.charId || '');
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

// =========================
// GUILD ROUTES
// =========================
guildRouter.get('/', (_req, res: Response) => {
  res.json({ success: true, data: guildService.listGuilds() });
});

guildRouter.get('/rankings/season', (_req, res: Response) => {
  res.json({ success: true, data: guildService.getGuildRankings() });
});

guildRouter.get('/:id', (req, res: Response) => {
  try {
    res.json({ success: true, data: guildService.getGuildDetail(req.params.id) });
  } catch (err: any) {
    res.status(404).json({ success: false, error: err.message });
  }
});

guildRouter.use(authenticate);

guildRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const cid = await requireOwnedChar(req, res, req.body?.creatorCharacterId);
    if (!cid) return;
    const guild = await guildService.createGuild({
      creatorCharacterId: cid,
      name: req.body?.name,
      tag: req.body?.tag,
      foundingMemberIds: req.body?.foundingMemberIds || [],
      txId: req.body?.txId,
    });
    res.status(201).json({ success: true, data: guild });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

guildRouter.post('/:id/apply', async (req: AuthRequest, res: Response) => {
  try {
    const cid = await requireOwnedChar(req, res);
    if (!cid) return;
    const app = await guildService.applyToGuild(cid, req.params.id, req.body?.message);
    res.status(201).json({ success: true, data: app });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

guildRouter.post('/:id/applications/:appId/review', async (req: AuthRequest, res: Response) => {
  try {
    const cid = await requireOwnedChar(req, res);
    if (!cid) return;
    const data = await guildService.reviewApplication(cid, req.params.id, req.params.appId, Boolean(req.body?.accept));
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

guildRouter.post('/:id/ranks/assign', async (req: AuthRequest, res: Response) => {
  try {
    const cid = await requireOwnedChar(req, res);
    if (!cid) return;
    const data = await guildService.setMemberRank(cid, req.params.id, req.body?.targetCharacterId, req.body?.rankId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

guildRouter.patch('/:id/ranks/:rankId', async (req: AuthRequest, res: Response) => {
  try {
    const cid = await requireOwnedChar(req, res);
    if (!cid) return;
    const data = await guildService.updateRankPermissions(cid, req.params.id, req.params.rankId, req.body?.permissions || []);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

guildRouter.post('/:id/members/remove', async (req: AuthRequest, res: Response) => {
  try {
    const cid = await requireOwnedChar(req, res);
    if (!cid) return;
    const data = await guildService.kickOrLeaveMember(cid, req.params.id, req.body?.targetCharacterId || cid);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

guildRouter.patch('/:id/announcement', async (req: AuthRequest, res: Response) => {
  try {
    const cid = await requireOwnedChar(req, res);
    if (!cid) return;
    const data = await guildService.updateAnnouncement(cid, req.params.id, req.body?.announcement);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

guildRouter.post('/:id/chat', async (req: AuthRequest, res: Response) => {
  try {
    const cid = await requireOwnedChar(req, res);
    if (!cid) return;
    const data = guildService.postGuildChat(cid, req.params.id, req.body?.message);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

guildRouter.post('/:id/donate', async (req: AuthRequest, res: Response) => {
  try {
    const cid = await requireOwnedChar(req, res);
    if (!cid) return;
    const data = await guildService.donateGold(cid, req.params.id, Number(req.body?.gold));
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

guildRouter.post('/:id/storage/deposit', async (req: AuthRequest, res: Response) => {
  try {
    const cid = await requireOwnedChar(req, res);
    if (!cid) return;
    const data = await guildService.depositStorage(cid, req.params.id, req.body?.itemId, Number(req.body?.quantity ?? 1));
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

guildRouter.post('/:id/storage/withdraw', async (req: AuthRequest, res: Response) => {
  try {
    const cid = await requireOwnedChar(req, res);
    if (!cid) return;
    const data = await guildService.withdrawStorage(cid, req.params.id, req.body?.slotId, Number(req.body?.quantity ?? 1));
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

guildRouter.post('/:id/buildings/upgrade', async (req: AuthRequest, res: Response) => {
  try {
    const cid = await requireOwnedChar(req, res);
    if (!cid) return;
    const data = await guildService.upgradeBuilding(cid, req.params.id, req.body?.buildingId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

guildRouter.post('/:id/skills/upgrade', async (req: AuthRequest, res: Response) => {
  try {
    const cid = await requireOwnedChar(req, res);
    if (!cid) return;
    const data = await guildService.upgradeGuildSkill(cid, req.params.id, req.body?.skillId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

guildRouter.post('/:id/boss/summon', async (req: AuthRequest, res: Response) => {
  try {
    const cid = await requireOwnedChar(req, res);
    if (!cid) return;
    const data = await guildService.summonGuildBoss(cid, req.params.id, req.body?.bossId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

guildRouter.post('/:id/boss/attack', async (req: AuthRequest, res: Response) => {
  try {
    const cid = await requireOwnedChar(req, res);
    if (!cid) return;
    const data = await guildService.attackGuildBoss(cid, req.params.id, Number(req.body?.damage || 0));
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

guildRouter.post('/:id/wars/challenge', async (req: AuthRequest, res: Response) => {
  try {
    const cid = await requireOwnedChar(req, res);
    if (!cid) return;
    const data = await guildService.challengeGuildWar(cid, req.params.id, req.body?.defenderGuildId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

guildRouter.post('/wars/:warId/score', async (req: AuthRequest, res: Response) => {
  try {
    const cid = await requireOwnedChar(req, res);
    if (!cid) return;
    const data = await guildService.recordWarScoreAndSettle(
      cid,
      req.params.warId,
      Number(req.body?.points || 50),
      Boolean(req.body?.finish)
    );
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

guildRouter.post('/:id/quests/claim', async (req: AuthRequest, res: Response) => {
  try {
    const cid = await requireOwnedChar(req, res);
    if (!cid) return;
    const data = await guildService.claimGuildQuest(cid, req.params.id, req.body?.questId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// =========================
// MERCHANT ASSOCIATION ROUTES
// =========================
merchantRouter.get('/catalog', (_req, res: Response) => {
  res.json({ success: true, data: merchantService.getMerchantCatalog() });
});

merchantRouter.get('/', (_req, res: Response) => {
  res.json({ success: true, data: merchantService.listAssociations() });
});

merchantRouter.get('/rankings', (_req, res: Response) => {
  res.json({ success: true, data: merchantService.getMerchantRankings() });
});

merchantRouter.get('/contracts', (_req, res: Response) => {
  res.json({ success: true, data: merchantService.listSupplyContracts() });
});

merchantRouter.get('/:id', (req, res: Response) => {
  try {
    res.json({ success: true, data: merchantService.getAssociationDetail(req.params.id) });
  } catch (err: any) {
    res.status(404).json({ success: false, error: err.message });
  }
});

merchantRouter.use(authenticate);

merchantRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const cid = await requireOwnedChar(req, res, req.body?.creatorCharacterId);
    if (!cid) return;
    const data = await merchantService.createAssociation({
      creatorCharacterId: cid,
      name: req.body?.name,
      tag: req.body?.tag,
      foundingMemberIds: req.body?.foundingMemberIds || [],
      txId: req.body?.txId,
    });
    res.status(201).json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

merchantRouter.post('/contracts/:contractId/fulfill', async (req: AuthRequest, res: Response) => {
  try {
    const cid = await requireOwnedChar(req, res);
    if (!cid) return;
    const data = await merchantService.fulfillSupplyContract(cid, req.params.contractId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

merchantRouter.post('/:id/caravans/start', async (req: AuthRequest, res: Response) => {
  try {
    const cid = await requireOwnedChar(req, res);
    if (!cid) return;
    const data = await merchantService.startCaravan(cid, req.params.id, req.body?.routeId, {
      instantForTest: Boolean(req.body?.instantForTest),
    });
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

merchantRouter.post('/caravans/:missionId/complete', async (req: AuthRequest, res: Response) => {
  try {
    const cid = await requireOwnedChar(req, res);
    if (!cid) return;
    const data = await merchantService.completeCaravan(cid, req.params.missionId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// =========================
// MARKETPLACE & AUCTION HOUSE ROUTES
// =========================
marketplaceRouter.get('/listings', (req, res: Response) => {
  res.json({
    success: true,
    data: merchantService.listMarketListings({
      professionId: req.query.professionId as string | undefined,
      query: req.query.q as string | undefined,
    }),
  });
});

marketplaceRouter.get('/buy-orders', (_req, res: Response) => {
  res.json({ success: true, data: merchantService.listBuyOrders() });
});

marketplaceRouter.get('/auctions', (_req, res: Response) => {
  res.json({ success: true, data: merchantService.listAuctions() });
});

marketplaceRouter.get('/audit-logs', (_req, res: Response) => {
  res.json({ success: true, data: auditService.listAuditLogs(60) });
});

marketplaceRouter.use(authenticate);

marketplaceRouter.post('/listings', async (req: AuthRequest, res: Response) => {
  try {
    const cid = await requireOwnedChar(req, res, req.body?.sellerCharacterId);
    if (!cid) return;
    const data = await merchantService.createMarketListing({
      sellerCharacterId: cid,
      itemId: req.body?.itemId,
      quantity: Number(req.body?.quantity ?? 1),
      unitPriceGold: Number(req.body?.unitPriceGold),
      shopName: req.body?.shopName,
      txId: req.body?.txId,
    });
    res.status(201).json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

marketplaceRouter.post('/listings/:id/buy', async (req: AuthRequest, res: Response) => {
  try {
    const cid = await requireOwnedChar(req, res, req.body?.buyerCharacterId);
    if (!cid) return;
    const data = await merchantService.buyMarketListing(cid, req.params.id, req.body?.txId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

marketplaceRouter.post('/listings/:id/cancel', async (req: AuthRequest, res: Response) => {
  try {
    const cid = await requireOwnedChar(req, res);
    if (!cid) return;
    const data = await merchantService.cancelMarketListing(cid, req.params.id);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

marketplaceRouter.post('/buy-orders', async (req: AuthRequest, res: Response) => {
  try {
    const cid = await requireOwnedChar(req, res, req.body?.buyerCharacterId);
    if (!cid) return;
    const data = await merchantService.createBuyOrder({
      buyerCharacterId: cid,
      itemId: req.body?.itemId,
      quantity: Number(req.body?.quantity),
      unitPriceGold: Number(req.body?.unitPriceGold),
      minQuality: req.body?.minQuality,
    });
    res.status(201).json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

marketplaceRouter.post('/buy-orders/:id/fulfill', async (req: AuthRequest, res: Response) => {
  try {
    const cid = await requireOwnedChar(req, res, req.body?.sellerCharacterId);
    if (!cid) return;
    const data = await merchantService.fulfillBuyOrder(cid, req.params.id, Number(req.body?.quantity ?? 1));
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

marketplaceRouter.post('/auctions', async (req: AuthRequest, res: Response) => {
  try {
    const cid = await requireOwnedChar(req, res, req.body?.sellerCharacterId);
    if (!cid) return;
    const data = await merchantService.createAuctionListing({
      sellerCharacterId: cid,
      itemId: req.body?.itemId,
      quantity: Number(req.body?.quantity ?? 1),
      startingPriceGold: Number(req.body?.startingPriceGold),
      buyoutPriceGold: req.body?.buyoutPriceGold ? Number(req.body.buyoutPriceGold) : undefined,
      durationSec: req.body?.durationSec ? Number(req.body.durationSec) : undefined,
    });
    res.status(201).json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

marketplaceRouter.post('/auctions/:id/bid', async (req: AuthRequest, res: Response) => {
  try {
    const cid = await requireOwnedChar(req, res, req.body?.bidderCharacterId);
    if (!cid) return;
    const data = await merchantService.placeAuctionBid(cid, req.params.id, Number(req.body?.bidGold));
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

marketplaceRouter.post('/auctions/:id/settle', async (req: AuthRequest, res: Response) => {
  try {
    const data = await merchantService.settleAuction(req.params.id, Boolean(req.body?.forceForTest));
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// =========================
// TERRITORY ROUTES
// =========================
territoryRouter.get('/', (_req, res: Response) => {
  res.json({ success: true, data: territoryService.listTerritories() });
});

territoryRouter.use(authenticate);

territoryRouter.post('/:id/siege', async (req: AuthRequest, res: Response) => {
  try {
    const cid = await requireOwnedChar(req, res);
    if (!cid) return;
    const data = await territoryService.siegeOrCaptureTerritory(cid, req.params.id, Number(req.body?.siegePower ?? 750));
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

territoryRouter.post('/:id/tax', async (req: AuthRequest, res: Response) => {
  try {
    const cid = await requireOwnedChar(req, res);
    if (!cid) return;
    const data = await territoryService.setTerritoryTaxAndCollect(
      cid,
      req.params.id,
      req.body?.taxRatePct !== undefined ? Number(req.body.taxRatePct) : undefined,
      Boolean(req.body?.collectTax)
    );
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

territoryRouter.post('/:id/buildings/upgrade', async (req: AuthRequest, res: Response) => {
  try {
    const cid = await requireOwnedChar(req, res);
    if (!cid) return;
    const data = await territoryService.upgradeTerritoryBuilding(cid, req.params.id, req.body?.buildingId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});
