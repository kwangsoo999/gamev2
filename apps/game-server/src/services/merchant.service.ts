import { randomUUID } from 'crypto';
import {
  CARAVAN_ROUTES,
  DEFAULT_MERCHANT_RANKS,
  INITIAL_SUPPLY_CONTRACT_TEMPLATES,
  MERCHANT_LEVEL_EXP_TABLE,
  MERCHANT_SYSTEM_CONFIG,
  QUALITY_TIER_ORDER,
} from '@elysia/game-data-schema';
import {
  AuctionListing,
  CaravanMission,
  ItemQuality,
  MarketBuyOrder,
  MarketplaceListing,
  MerchantAssociationEntity,
  MerchantPermission,
  MerchantSupplyContract,
} from '@elysia/game-types';
import { JsonStore } from '../database/jsonStore.js';
import { AuditSecurityService } from './audit.service.js';
import { WorldService } from './world.service.js';

export class MerchantMarketplaceService {
  private static instance: MerchantMarketplaceService;
  private store = JsonStore.getInstance();
  private audit = AuditSecurityService.getInstance();
  private world = WorldService.getInstance();

  public static getInstance(): MerchantMarketplaceService {
    if (!MerchantMarketplaceService.instance) {
      MerchantMarketplaceService.instance = new MerchantMarketplaceService();
    }
    return MerchantMarketplaceService.instance;
  }

  private getRequiredExp(lv: number): number {
    return MERCHANT_LEVEL_EXP_TABLE.find((e) => e.level === lv)?.requiredExp || 0;
  }

  private addMerchantExp(assoc: MerchantAssociationEntity, amount: number) {
    assoc.exp += Math.max(0, Math.round(amount));
    while (assoc.level < MERCHANT_SYSTEM_CONFIG.maxLevel && assoc.nextLevelExp > 0 && assoc.exp >= assoc.nextLevelExp) {
      assoc.exp -= assoc.nextLevelExp;
      assoc.level += 1;
      assoc.nextLevelExp = this.getRequiredExp(assoc.level);
    }
    if (assoc.level >= MERCHANT_SYSTEM_CONFIG.maxLevel) {
      assoc.level = MERCHANT_SYSTEM_CONFIG.maxLevel;
      assoc.exp = 0;
      assoc.nextLevelExp = 0;
    }
  }

  private requirePermission(assoc: MerchantAssociationEntity, charId: string, perm: MerchantPermission) {
    const m = assoc.members.find((x) => x.characterId === charId);
    if (!m) throw new Error('Bạn không phải thành viên Thương Hội này.');
    const r = assoc.ranks.find((x) => x.id === m.rankId);
    if (!r || !r.permissions.includes(perm)) {
      throw new Error(`Cấp bậc Thương Hội không có quyền: ${perm}.`);
    }
    return m;
  }

  public getMerchantCatalog() {
    return {
      config: MERCHANT_SYSTEM_CONFIG,
      routes: CARAVAN_ROUTES,
      economy: this.world.getEconomyConfig(),
    };
  }

  public listAssociations() {
    return this.store.merchantAssociations.map((a: MerchantAssociationEntity) => ({
      id: a.id,
      name: a.name,
      tag: a.tag,
      level: a.level,
      reputation: a.reputation,
      memberCount: a.members.length,
      masterName: a.masterName,
      treasuryGold: a.treasuryGold,
    }));
  }

  public getAssociationDetail(id: string) {
    const a = this.store.merchantAssociations.find((x) => x.id === id);
    if (!a) throw new Error('Không tìm thấy Hiệp Hội Thương Nhân.');
    return {
      ...a,
      caravans: this.store.caravanMissions.filter((c) => c.associationId === id),
      routes: CARAVAN_ROUTES,
    };
  }

  public async createAssociation(params: {
    creatorCharacterId: string;
    name: string;
    tag: string;
    foundingMemberIds: string[];
    txId?: string;
  }): Promise<MerchantAssociationEntity> {
    const name = String(params.name || '').trim();
    const tag = String(params.tag || '').trim().toUpperCase();
    if (name.length < 3 || name.length > 30) throw new Error('Tên Thương Hội phải từ 3–30 ký tự.');
    if (tag.length < 2 || tag.length > 5) throw new Error('Tag Thương Hội phải từ 2–5 ký tự.');

    const founderIds = Array.from(new Set([params.creatorCharacterId, ...(params.foundingMemberIds || [])])).filter(Boolean);
    if (founderIds.length < MERCHANT_SYSTEM_CONFIG.minFoundingMembers) {
      throw new Error(`Cần tối thiểu ${MERCHANT_SYSTEM_CONFIG.minFoundingMembers} thành viên sáng lập để lập Thương Hội.`);
    }

    return this.audit.withLocks(
      founderIds.map((id) => `char:${id}`),
      () => {
        const claimId = this.audit.claimIdempotencyKey(params.txId);
        const creator = this.store.characters.find((c) => c.id === params.creatorCharacterId);
        if (!creator) throw new Error('Không tìm thấy nhân vật sáng lập.');
        if (Number(creator.level || 1) < MERCHANT_SYSTEM_CONFIG.requiredLevel) {
          throw new Error(`Yêu cầu Nhân vật đạt Cấp ${MERCHANT_SYSTEM_CONFIG.requiredLevel} để thành lập Thương Hội.`);
        }
        if (this.store.merchantAssociations.some((a) => a.name.toLowerCase() === name.toLowerCase() || a.tag === tag)) {
          throw new Error('Tên hoặc Tag Thương Hội đã tồn tại.');
        }

        const founders = founderIds.map((id) => {
          const ch = this.store.characters.find((c) => c.id === id);
          if (!ch) throw new Error(`Thành viên "${id}" không tồn tại.`);
          if (ch.merchantAssocId) throw new Error(`Nhân vật "${ch.name}" đã thuộc Thương Hội khác.`);
          return ch;
        });

        if (this.audit.countItem(creator, MERCHANT_SYSTEM_CONFIG.requiredSealItemId) < 1) {
          throw new Error(`Cần 1 ${MERCHANT_SYSTEM_CONFIG.requiredSealItemId} (Ấn Ký Hiệp Hội Thương Nhân).`);
        }

        const goldBackup = creator.gold;
        const invBackup = JSON.parse(JSON.stringify(creator.inventory || []));
        try {
          this.audit.deductGold(creator, MERCHANT_SYSTEM_CONFIG.creationGoldCost, 'lệ phí lập Thương Hội');
          this.audit.consumeItem(creator, MERCHANT_SYSTEM_CONFIG.requiredSealItemId, 1);

          const assocId = `MRC_${randomUUID().slice(0, 8)}`;
          const now = new Date().toISOString();
          const assoc: MerchantAssociationEntity = {
            id: assocId,
            name,
            tag,
            masterCharacterId: creator.id,
            masterName: creator.name,
            level: 1,
            exp: 0,
            nextLevelExp: this.getRequiredExp(1),
            reputation: 100,
            treasuryGold: 0,
            announcement: `Thương Hội ${name} chính thức khai trương giao thương khắp lục địa Elysia!`,
            ranks: JSON.parse(JSON.stringify(DEFAULT_MERCHANT_RANKS)),
            members: founders.map((ch, idx) => ({
              characterId: ch.id,
              characterName: ch.name,
              level: ch.level || 1,
              rankId: idx === 0 ? 'assoc_master' : idx === 1 ? 'senior_broker' : 'trader',
              reputationContribution: idx === 0 ? 300 : 50,
              contractsCompleted: 0,
              joinedAt: now,
            })),
            warehouse: [],
            warehouseCapacity: MERCHANT_SYSTEM_CONFIG.baseWarehouseCapacity,
            completedContractIds: [],
            activeCaravanCount: 0,
            createdAt: now,
          };

          for (const ch of founders) {
            ch.merchantAssocId = assocId;
            ch.merchantRankId = assoc.members.find((m) => m.characterId === ch.id)?.rankId;
          }
          this.store.merchantAssociations.push(assoc);
          this.audit.recordAudit({
            txId: claimId,
            category: 'caravan',
            actorCharacterId: creator.id,
            goldDelta: -MERCHANT_SYSTEM_CONFIG.creationGoldCost,
            itemId: MERCHANT_SYSTEM_CONFIG.requiredSealItemId,
            quantity: 1,
            details: `Thành lập Thương Hội "${name}" [${tag}] với ${founders.length} thương nhân sáng lập`,
          });
          this.store.save();
          return assoc;
        } catch (err) {
          creator.gold = goldBackup;
          creator.inventory = invBackup;
          throw err;
        }
      }
    );
  }

  // =========================================================================
  // PLAYER MARKETPLACE + SHOPS (ESCROWED ITEM SALE & ATOMIC PURCHASE)
  // =========================================================================
  public listMarketListings(filter?: { professionId?: string; query?: string }) {
    const q = (filter?.query || '').trim().toLowerCase();
    return this.store.marketListings.filter((l: MarketplaceListing) => {
      if (l.status !== 'active') return false;
      if (filter?.professionId && l.professionId !== filter.professionId) return false;
      if (q && !l.itemName.toLowerCase().includes(q) && !l.sellerName.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  public async createMarketListing(params: {
    sellerCharacterId: string;
    itemId: string;
    quantity: number;
    unitPriceGold: number;
    shopName?: string;
    txId?: string;
  }) {
    const qty = Math.floor(Number(params.quantity));
    const unitPrice = Math.floor(Number(params.unitPriceGold));
    if (!Number.isInteger(qty) || qty <= 0) throw new Error('Số lượng niêm yết không hợp lệ.');
    if (!Number.isInteger(unitPrice) || unitPrice <= 0) throw new Error('Đơn giá phải là số nguyên dương.');

    return this.audit.withLocks([`char:${params.sellerCharacterId}`], () => {
      this.audit.enforceRateLimit(`mkt_list:${params.sellerCharacterId}`, 20, 10000);
      const claimId = this.audit.claimIdempotencyKey(params.txId);
      const seller = this.store.characters.find((c) => c.id === params.sellerCharacterId);
      if (!seller) throw new Error('Không tìm thấy nhân vật.');
      if (!this.audit.isTradableItem(seller, params.itemId)) {
        throw new Error('Vật phẩm bị khóa (bound), không thể bày bán trên Chợ!');
      }

      const activeCount = this.store.marketListings.filter(
        (l) => l.sellerCharacterId === seller.id && l.status === 'active'
      ).length;
      const econ = this.world.getEconomyConfig();
      if (activeCount >= Number(econ.maxActiveMarketListingsPerPlayer || 20)) {
        throw new Error('Đã đạt số gian hàng niêm yết tối đa trên Chợ.');
      }

      const invBackup = JSON.parse(JSON.stringify(seller.inventory || []));
      try {
        // Server escrows items immediately from seller inventory -> zero double-listing exploit!
        const consumed = this.audit.consumeItem(seller, params.itemId, qty);
        const meta = this.audit.getItemCatalogMap().get(params.itemId);
        const q = consumed.consumedQualities[0] || 'common';
        const listing: MarketplaceListing = {
          id: `MKT_${randomUUID().slice(0, 8)}`,
          sellerCharacterId: seller.id,
          sellerName: seller.name,
          shopName: params.shopName?.trim().slice(0, 40) || `Gian hàng ${seller.name}`,
          itemId: params.itemId,
          itemName: meta?.nameVi || meta?.name || params.itemId,
          professionId: meta?.professionId,
          quality: q,
          rarity: (meta?.rarity || q) as any,
          quantity: qty,
          unitPriceGold: unitPrice,
          totalPriceGold: unitPrice * qty,
          feePct: Number(econ.defaultMarketTaxPct ?? 5),
          status: 'active',
          createdAt: new Date().toISOString(),
        };
        this.store.marketListings.push(listing);
        this.audit.recordAudit({
          txId: claimId,
          category: 'marketplace',
          actorCharacterId: seller.id,
          goldDelta: 0,
          itemId: params.itemId,
          quantity: qty,
          details: `Niêm yết ${listing.itemName} x${qty} giá ${listing.totalPriceGold}G`,
        });
        this.store.save();
        return listing;
      } catch (err) {
        seller.inventory = invBackup;
        throw err;
      }
    });
  }

  public async buyMarketListing(buyerCharacterId: string, listingId: string, txId?: string) {
    const listingPreview = this.store.marketListings.find((l) => l.id === listingId);
    if (!listingPreview) throw new Error('Gian hàng không tồn tại.');
    return this.audit.withLocks(
      [`market:${listingId}`, `char:${buyerCharacterId}`, `char:${listingPreview.sellerCharacterId}`],
      () => {
        this.audit.enforceRateLimit(`mkt_buy:${buyerCharacterId}`, 20, 10000);
        const claimId = this.audit.claimIdempotencyKey(txId);
        const listing: MarketplaceListing | undefined = this.store.marketListings.find((l) => l.id === listingId);
        if (!listing || listing.status !== 'active') {
          throw new Error('Vật phẩm này đã được người khác mua hoặc vừa gỡ xuống.');
        }
        if (listing.sellerCharacterId === buyerCharacterId) {
          throw new Error('Không thể tự mua gian hàng của chính mình!');
        }
        const buyer = this.store.characters.find((c) => c.id === buyerCharacterId);
        const seller = this.store.characters.find((c) => c.id === listing.sellerCharacterId);
        if (!buyer || !seller) throw new Error('Dữ liệu người mua/bán không hợp lệ.');

        const buyerGoldBackup = buyer.gold;
        const buyerInvBackup = JSON.parse(JSON.stringify(buyer.inventory || []));
        const sellerGoldBackup = seller.gold;

        try {
          const totalCost = listing.totalPriceGold;
          this.audit.deductGold(buyer, totalCost, `mua ${listing.itemName}`);
          const taxAmount = Math.max(1, Math.floor((totalCost * listing.feePct) / 100));
          const sellerNet = Math.max(0, totalCost - taxAmount);

          // Route 1% territory market rebate dividend if listing occurred in owned territory
          const taxReceiver = this.store.territories.find((t) => t.ownerGuildId);
          if (taxReceiver) {
            taxReceiver.accumulatedTaxGold = Number(taxReceiver.accumulatedTaxGold || 0) + Math.floor(taxAmount * 0.4);
          }

          this.audit.addGold(seller, sellerNet);
          this.audit.grantItem(buyer, listing.itemId, listing.quantity, {
            quality: listing.quality,
            rarity: listing.rarity,
            name: listing.itemName,
          });
          listing.status = 'sold';

          this.audit.recordAudit({
            txId: claimId,
            category: 'marketplace',
            actorCharacterId: buyer.id,
            targetCharacterId: seller.id,
            goldDelta: -totalCost,
            itemId: listing.itemId,
            quantity: listing.quantity,
            details: `Mua ${listing.itemName} x${listing.quantity} giá ${totalCost}G (Thuế ${taxAmount}G, Người bán nhận ${sellerNet}G)`,
          });
          this.store.save();
          return { listing, paidGold: totalCost, taxGold: taxAmount, sellerReceivedGold: sellerNet, buyerGold: buyer.gold };
        } catch (err) {
          buyer.gold = buyerGoldBackup;
          buyer.inventory = buyerInvBackup;
          seller.gold = sellerGoldBackup;
          throw err;
        }
      }
    );
  }

  public async cancelMarketListing(actorCharId: string, listingId: string) {
    return this.audit.withLocks([`market:${listingId}`, `char:${actorCharId}`], () => {
      const listing: MarketplaceListing | undefined = this.store.marketListings.find((l) => l.id === listingId);
      if (!listing || listing.status !== 'active') throw new Error('Niêm yết không còn tồn tại.');
      if (listing.sellerCharacterId !== actorCharId) throw new Error('Không có quyền hủy niêm yết của người khác.');
      const seller = this.store.characters.find((c) => c.id === actorCharId)!;
      listing.status = 'cancelled';
      this.audit.grantItem(seller, listing.itemId, listing.quantity, {
        quality: listing.quality,
        rarity: listing.rarity,
        name: listing.itemName,
      });
      this.store.save();
      return listing;
    });
  }

  // =========================================================================
  // BUY ORDERS (ESCROWED GOLD -> ATOMIC ITEM SALE)
  // =========================================================================
  public listBuyOrders() {
    return this.store.marketBuyOrders.filter((o: MarketBuyOrder) => o.status === 'active');
  }

  public async createBuyOrder(params: {
    buyerCharacterId: string;
    itemId: string;
    quantity: number;
    unitPriceGold: number;
    minQuality?: ItemQuality;
  }) {
    const qty = Math.floor(Number(params.quantity));
    const unitPrice = Math.floor(Number(params.unitPriceGold));
    if (!Number.isInteger(qty) || qty <= 0 || !Number.isInteger(unitPrice) || unitPrice <= 0) {
      throw new Error('Thông số lệnh thu mua không hợp lệ.');
    }
    return this.audit.withLocks([`char:${params.buyerCharacterId}`], () => {
      const buyer = this.store.characters.find((c) => c.id === params.buyerCharacterId);
      if (!buyer) throw new Error('Không tìm thấy nhân vật.');
      const totalEscrow = qty * unitPrice;
      this.audit.deductGold(buyer, totalEscrow, 'ký quỹ lệnh thu mua Chợ');
      const meta = this.audit.getItemCatalogMap().get(params.itemId);
      const order: MarketBuyOrder = {
        id: `ORD_${randomUUID().slice(0, 8)}`,
        buyerCharacterId: buyer.id,
        buyerName: buyer.name,
        itemId: params.itemId,
        itemName: meta?.nameVi || meta?.name || params.itemId,
        minQuality: params.minQuality || 'common',
        quantityRemaining: qty,
        quantityInitial: qty,
        unitPriceGold: unitPrice,
        escrowGoldRemaining: totalEscrow,
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      this.store.marketBuyOrders.push(order);
      this.store.save();
      return { order, buyerGold: buyer.gold };
    });
  }

  public async fulfillBuyOrder(sellerCharacterId: string, orderId: string, quantity: number) {
    const qty = Math.floor(Number(quantity));
    if (!Number.isInteger(qty) || qty <= 0) throw new Error('Số lượng bán không hợp lệ.');
    const preview = this.store.marketBuyOrders.find((o) => o.id === orderId);
    if (!preview) throw new Error('Lệnh mua không tồn tại.');

    return this.audit.withLocks([`order:${orderId}`, `char:${sellerCharacterId}`, `char:${preview.buyerCharacterId}`], () => {
      const order: MarketBuyOrder | undefined = this.store.marketBuyOrders.find((o) => o.id === orderId);
      if (!order || order.status !== 'active') throw new Error('Lệnh mua đã hoàn tất hoặc bị hủy.');
      if (order.buyerCharacterId === sellerCharacterId) throw new Error('Không thể tự khớp lệnh mua của chính mình.');
      if (qty > order.quantityRemaining) throw new Error('Vượt quá số lượng còn lại của lệnh thu mua.');

      const seller = this.store.characters.find((c) => c.id === sellerCharacterId);
      const buyer = this.store.characters.find((c) => c.id === order.buyerCharacterId);
      if (!seller || !buyer) throw new Error('Không tìm thấy dữ liệu nhân vật.');
      if (!this.audit.isTradableItem(seller, order.itemId)) throw new Error('Vật phẩm bị khóa.');

      this.audit.consumeItem(seller, order.itemId, qty, order.minQuality);
      this.audit.grantItem(buyer, order.itemId, qty, { quality: order.minQuality, name: order.itemName });

      const gross = qty * order.unitPriceGold;
      const taxPct = Number(this.world.getEconomyConfig().defaultMarketTaxPct ?? 5);
      const fee = Math.max(1, Math.floor((gross * taxPct) / 100));
      const net = Math.max(0, gross - fee);

      order.escrowGoldRemaining -= gross;
      order.quantityRemaining -= qty;
      if (order.quantityRemaining === 0) order.status = 'fulfilled';
      this.audit.addGold(seller, net);
      this.store.save();
      return { order, sellerNetGold: net, feeGold: fee, sellerGold: seller.gold };
    });
  }

  // =========================================================================
  // AUCTION HOUSE (ATOMIC BID ESCROW & IMMEDIATE OUTBID REFUND)
  // =========================================================================
  public listAuctions() {
    return this.store.auctions.filter((a: AuctionListing) => a.status === 'active');
  }

  public async createAuctionListing(params: {
    sellerCharacterId: string;
    itemId: string;
    quantity: number;
    startingPriceGold: number;
    buyoutPriceGold?: number;
    durationSec?: number;
  }) {
    const qty = Math.floor(Number(params.quantity));
    const startPrice = Math.floor(Number(params.startingPriceGold));
    const buyout = params.buyoutPriceGold ? Math.floor(Number(params.buyoutPriceGold)) : undefined;
    if (!Number.isInteger(qty) || qty <= 0 || !Number.isInteger(startPrice) || startPrice < 10) {
      throw new Error('Giá khởi điểm Đấu Giá tối thiểu 10 Vàng.');
    }
    if (buyout !== undefined && buyout <= startPrice) {
      throw new Error('Giá Mua Đứt (Buyout) phải lớn hơn giá khởi điểm.');
    }

    return this.audit.withLocks([`char:${params.sellerCharacterId}`], () => {
      const seller = this.store.characters.find((c) => c.id === params.sellerCharacterId);
      if (!seller) throw new Error('Không tìm thấy người bán.');
      if (!this.audit.isTradableItem(seller, params.itemId)) {
        throw new Error('Vật phẩm bị khóa không thể đưa lên Sàn Đấu Giá.');
      }
      const consumed = this.audit.consumeItem(seller, params.itemId, qty);
      const meta = this.audit.getItemCatalogMap().get(params.itemId);
      const q = consumed.consumedQualities[0] || 'common';
      const auction: AuctionListing = {
        id: `AUC_${randomUUID().slice(0, 8)}`,
        sellerCharacterId: seller.id,
        sellerName: seller.name,
        itemId: params.itemId,
        itemName: meta?.nameVi || meta?.name || params.itemId,
        quality: q,
        rarity: (meta?.rarity || q) as any,
        quantity: qty,
        startingPriceGold: startPrice,
        buyoutPriceGold: buyout,
        currentBidGold: 0,
        minIncrementGold: Math.max(10, Math.round(startPrice * 0.05)),
        endsAt: Date.now() + Math.max(60, Number(params.durationSec || 3600)) * 1000,
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      this.store.auctions.push(auction);
      this.store.save();
      return auction;
    });
  }

  public async placeAuctionBid(bidderCharId: string, auctionId: string, bidGold: number) {
    const bid = Math.floor(Number(bidGold));
    const preview = this.store.auctions.find((a) => a.id === auctionId);
    if (!preview) throw new Error('Phiên đấu giá không tồn tại.');

    return this.audit.withLocks(
      [
        `auc:${auctionId}`,
        `char:${bidderCharId}`,
        `char:${preview.sellerCharacterId}`,
        preview.highestBidderCharacterId ? `char:${preview.highestBidderCharacterId}` : '',
      ],
      () => {
        const auc: AuctionListing | undefined = this.store.auctions.find((a) => a.id === auctionId);
        if (!auc || auc.status !== 'active') throw new Error('Phiên đấu giá đã kết thúc.');
        if (auc.sellerCharacterId === bidderCharId) throw new Error('Không thể tự đấu giá vật phẩm của mình.');

        const minRequired =
          auc.currentBidGold > 0 ? auc.currentBidGold + auc.minIncrementGold : auc.startingPriceGold;
        if (bid < minRequired) {
          throw new Error(`Giá đặt tối thiểu tiếp theo là ${minRequired.toLocaleString()} G.`);
        }

        const bidder = this.store.characters.find((c) => c.id === bidderCharId);
        if (!bidder) throw new Error('Không tìm thấy người đặt giá.');

        const isBuyout = Boolean(auc.buyoutPriceGold && bid >= auc.buyoutPriceGold);
        const charge = isBuyout ? auc.buyoutPriceGold! : bid;
        this.audit.deductGold(bidder, charge, `đấu giá ${auc.itemName}`);

        // Refund previous highest bidder atomically!
        if (auc.highestBidderCharacterId && auc.currentBidGold > 0) {
          const prevBidder = this.store.characters.find((c) => c.id === auc.highestBidderCharacterId);
          if (prevBidder) {
            this.audit.addGold(prevBidder, auc.currentBidGold);
          }
        }

        auc.currentBidGold = charge;
        auc.highestBidderCharacterId = bidder.id;
        auc.highestBidderName = bidder.name;

        if (isBuyout) {
          const settled = this.finalizeAuctionInternal(auc);
          this.store.save();
          return { auction: settled, boughtOut: true, bidderGold: bidder.gold };
        }

        this.store.save();
        return { auction: auc, boughtOut: false, bidderGold: bidder.gold };
      }
    );
  }

  public async settleAuction(auctionId: string, forceForTest = false) {
    return this.audit.withLocks([`auc:${auctionId}`], () => {
      const auc: AuctionListing | undefined = this.store.auctions.find((a) => a.id === auctionId);
      if (!auc || auc.status !== 'active') throw new Error('Phiên đấu giá không hoạt động.');
      if (!forceForTest && Date.now() < auc.endsAt) {
        throw new Error('Phiên đấu giá chưa hết thời gian.');
      }
      const res = this.finalizeAuctionInternal(auc);
      this.store.save();
      return res;
    });
  }

  private finalizeAuctionInternal(auc: AuctionListing): AuctionListing {
    auc.status = 'settled';
    const seller = this.store.characters.find((c) => c.id === auc.sellerCharacterId);
    if (!auc.highestBidderCharacterId) {
      // No bids -> return item to seller
      if (seller) {
        this.audit.grantItem(seller, auc.itemId, auc.quantity, { quality: auc.quality, name: auc.itemName });
      }
      return auc;
    }

    const winner = this.store.characters.find((c) => c.id === auc.highestBidderCharacterId);
    if (winner) {
      this.audit.grantItem(winner, auc.itemId, auc.quantity, { quality: auc.quality, name: auc.itemName });
    }
    const feePct = Number(this.world.getEconomyConfig().auctionListingFeePct ?? 3);
    const fee = Math.max(1, Math.floor((auc.currentBidGold * feePct) / 100));
    const payout = Math.max(0, auc.currentBidGold - fee);
    if (seller) this.audit.addGold(seller, payout);

    this.audit.recordAudit({
      txId: `AUC_END_${auc.id}`,
      category: 'auction',
      actorCharacterId: auc.highestBidderCharacterId,
      targetCharacterId: auc.sellerCharacterId,
      goldDelta: payout,
      itemId: auc.itemId,
      quantity: auc.quantity,
      details: `Đấu giá ${auc.itemName} hoàn tất giá ${auc.currentBidGold}G (Thuế ${fee}G)`,
    });
    return auc;
  }

  // =========================================================================
  // SUPPLY CONTRACTS (8 LIFE SKILLS <-> MERCHANT <-> GUILD) & CARAVANS
  // =========================================================================
  public listSupplyContracts(): MerchantSupplyContract[] {
    let added = false;
    for (const tpl of INITIAL_SUPPLY_CONTRACT_TEMPLATES) {
      const hasOpen = this.store.supplyContracts.some(
        (c) => c.title === tpl.title && (c.status === 'open' || c.status === 'in_progress')
      );
      if (!hasOpen) {
        this.store.supplyContracts.push({
          ...tpl,
          id: `CTR_${randomUUID().slice(0, 8)}`,
          deliveredQty: 0,
          status: 'open',
          createdAt: new Date().toISOString(),
        });
        added = true;
      }
    }
    if (added) {
      if (this.store.supplyContracts.length > 60) {
        this.store.supplyContracts.splice(0, this.store.supplyContracts.length - 60);
      }
      this.store.save();
    }
    return this.store.supplyContracts;
  }

  public async fulfillSupplyContract(charId: string, contractId: string) {
    return this.audit.withLocks([`char:${charId}`, `ctr:${contractId}`], () => {
      this.listSupplyContracts();
      const ctr: MerchantSupplyContract | undefined = this.store.supplyContracts.find((c) => c.id === contractId);
      if (!ctr || ctr.status === 'completed' || ctr.status === 'cancelled') {
        throw new Error('Hợp đồng cung ứng không còn khả dụng.');
      }
      const ch = this.store.characters.find((c) => c.id === charId);
      if (!ch) throw new Error('Không tìm thấy nhân vật.');

      const needed = ctr.requiredQty - ctr.deliveredQty;
      const have = this.audit.countItem(ch, ctr.requiredItemId, ctr.minQuality);
      if (have < needed) {
        throw new Error(`Cần ${needed} "${ctr.requiredItemName}" (phẩm chất >= ${ctr.minQuality}) để hoàn tất hợp đồng!`);
      }

      this.audit.consumeItem(ch, ctr.requiredItemId, needed, ctr.minQuality);
      ctr.deliveredQty = ctr.requiredQty;
      ctr.claimedByCharacterId = ch.id;
      ctr.status = 'completed';

      this.audit.addGold(ch, ctr.rewardGold);

      if (ch.merchantAssocId) {
        const assoc: MerchantAssociationEntity | undefined = this.store.merchantAssociations.find(
          (a) => a.id === ch.merchantAssocId
        );
        if (assoc) {
          assoc.reputation += ctr.rewardReputation;
          assoc.completedContractIds.push(ctr.id);
          this.addMerchantExp(assoc, ctr.rewardMerchantExp);
          const member = assoc.members.find((m) => m.characterId === ch.id);
          if (member) {
            member.reputationContribution += ctr.rewardReputation;
            member.contractsCompleted += 1;
          }
        }
      }

      this.audit.recordAudit({
        txId: `CTR_${ctr.id}`,
        category: 'contract',
        actorCharacterId: ch.id,
        goldDelta: ctr.rewardGold,
        itemId: ctr.requiredItemId,
        quantity: needed,
        details: `Hoàn thành hợp đồng cung ứng "${ctr.title}" nhận ${ctr.rewardGold}G`,
      });
      this.store.save();
      return { contract: ctr, playerGold: ch.gold };
    });
  }

  public async startCaravan(charId: string, assocId: string, routeId: string, opts?: { instantForTest?: boolean }) {
    return this.audit.withLocks([`char:${charId}`, `assoc:${assocId}`], () => {
      const assoc: MerchantAssociationEntity | undefined = this.store.merchantAssociations.find((a) => a.id === assocId);
      if (!assoc) throw new Error('Không tìm thấy Thương Hội.');
      this.requirePermission(assoc, charId, 'LAUNCH_CARAVAN');
      const ch = this.store.characters.find((c) => c.id === charId);
      if (!ch) throw new Error('Không tìm thấy nhân vật.');
      const route = CARAVAN_ROUTES.find((r) => r.id === routeId);
      if (!route) throw new Error('Tuyến đường thương buôn không tồn tại.');
      if (assoc.level < route.requiredMerchantLevel) {
        throw new Error(`Yêu cầu Thương Hội Cấp ${route.requiredMerchantLevel} cho tuyến ${route.nameVi}.`);
      }

      this.audit.deductGold(ch, route.capitalCostGold, `vốn khởi hành đoàn xe ${route.nameVi}`);
      const now = Date.now();
      const mission: CaravanMission = {
        id: `CRV_${randomUUID().slice(0, 8)}`,
        associationId: assoc.id,
        leaderCharacterId: ch.id,
        leaderName: ch.name,
        routeId: route.id,
        routeName: route.nameVi,
        cargoSummary: 'Hàng hóa Tổng Hợp 8 Nghề Thủ Công',
        capitalInvestedGold: route.capitalCostGold,
        expectedPayoutGold: route.payoutGold,
        startedAt: now,
        arrivesAt: now + (opts?.instantForTest ? 1 : route.durationMs),
        status: 'in_transit',
      };
      this.store.caravanMissions.push(mission);
      assoc.activeCaravanCount += 1;
      this.store.save();
      return mission;
    });
  }

  public async completeCaravan(charId: string, missionId: string) {
    return this.audit.withLocks([`crv:${missionId}`, `char:${charId}`], () => {
      const mission: CaravanMission | undefined = this.store.caravanMissions.find((m) => m.id === missionId);
      if (!mission || mission.status !== 'in_transit') throw new Error('Đoàn xe không còn hành trình.');
      if (mission.leaderCharacterId !== charId) throw new Error('Chỉ trưởng đoàn mới có thể nghiệm thu chuyến hàng.');
      if (Date.now() < mission.arrivesAt) {
        throw new Error(`Đoàn xe đang trên đường vận chuyển (${Math.ceil((mission.arrivesAt - Date.now()) / 1000)}s nữa).`);
      }

      const route = CARAVAN_ROUTES.find((r) => r.id === mission.routeId)!;
      const ch = this.store.characters.find((c) => c.id === charId)!;
      const assoc: MerchantAssociationEntity | undefined = this.store.merchantAssociations.find(
        (a) => a.id === mission.associationId
      );

      let taxPaid = 0;
      if (route.taxTerritoryId) {
        const terr = this.store.territories.find((t) => t.territoryId === route.taxTerritoryId);
        if (terr?.ownerGuildId && terr.taxRatePct > 0) {
          taxPaid = Math.floor((mission.expectedPayoutGold * terr.taxRatePct) / 100);
          terr.accumulatedTaxGold = Number(terr.accumulatedTaxGold || 0) + taxPaid;
        }
      }

      const netPayout = Math.max(mission.capitalInvestedGold, mission.expectedPayoutGold - taxPaid);
      mission.status = 'completed';
      this.audit.addGold(ch, netPayout);

      if (assoc) {
        assoc.activeCaravanCount = Math.max(0, assoc.activeCaravanCount - 1);
        assoc.treasuryGold += Math.round((netPayout - mission.capitalInvestedGold) * 0.25);
        assoc.reputation += route.payoutReputation;
        this.addMerchantExp(assoc, route.payoutMerchantExp);
      }

      this.audit.recordAudit({
        txId: `CRV_DONE_${mission.id}`,
        category: 'caravan',
        actorCharacterId: ch.id,
        goldDelta: netPayout,
        details: `Đoàn xe ${mission.routeName} cập bến thành công (+${netPayout}G, Thuế lãnh thổ ${taxPaid}G)`,
      });
      this.store.save();
      return { mission, netPayout, taxPaid, playerGold: ch.gold, association: assoc };
    });
  }

  public getMerchantRankings() {
    return [...this.store.merchantAssociations]
      .sort((a, b) => b.reputation - a.reputation || b.level - a.level)
      .map((a, idx) => ({
        rank: idx + 1,
        id: a.id,
        name: a.name,
        tag: a.tag,
        level: a.level,
        reputation: a.reputation,
        memberCount: a.members.length,
        completedContracts: a.completedContractIds.length,
      }));
  }

  public enforceQualityCheck(q: ItemQuality, minQ: ItemQuality): boolean {
    return QUALITY_TIER_ORDER[q] >= QUALITY_TIER_ORDER[minQ];
  }
}
