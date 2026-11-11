import {
  GatheringNodeDefinition,
  ItemQuality,
  ProfessionDefinition,
  ProfessionMaterialDefinition,
  ProfessionNpcDefinition,
  ProfessionQuestDefinition,
  ProfessionRankId,
  ProfessionRankThreshold,
  ProfessionRecipeDefinition,
  ProfessionToolDefinition,
} from '@elysia/game-types';

export const PROFESSION_SYSTEM_CONFIG = {
  maxInitialProfessions: 3,
  absoluteMaxProfessions: 8,
  maxMasteryLevel: 70,
  dailyGatherSoftCap: 120,
  dailyCraftSoftCap: 150,
  diminishingStartGapLevels: 5,
  farmPlotSlotsPerPlayer: 4,
  farmWaterYieldBonusPct: 25,
};

export const PROFESSION_MASTERY_RANKS: ProfessionRankThreshold[] = [
  { id: 'apprentice', name: 'Apprentice', nameVi: 'Học Việc', minLevel: 1, maxLevel: 10, qualityBonusPct: 0, extraYieldBonusPct: 2, materialSaveChancePct: 0 },
  { id: 'novice', name: 'Novice', nameVi: 'Tập Sự', minLevel: 11, maxLevel: 20, qualityBonusPct: 4, extraYieldBonusPct: 5, materialSaveChancePct: 2 },
  { id: 'skilled', name: 'Skilled', nameVi: 'Thành Thạo', minLevel: 21, maxLevel: 30, qualityBonusPct: 8, extraYieldBonusPct: 9, materialSaveChancePct: 5 },
  { id: 'expert', name: 'Expert', nameVi: 'Chuyên Gia', minLevel: 31, maxLevel: 40, qualityBonusPct: 14, extraYieldBonusPct: 14, materialSaveChancePct: 8 },
  { id: 'master', name: 'Master', nameVi: 'Bậc Thầy', minLevel: 41, maxLevel: 50, qualityBonusPct: 20, extraYieldBonusPct: 20, materialSaveChancePct: 12 },
  { id: 'grandmaster', name: 'Grandmaster', nameVi: 'Đại Sư', minLevel: 51, maxLevel: 60, qualityBonusPct: 28, extraYieldBonusPct: 26, materialSaveChancePct: 16 },
  { id: 'legendary', name: 'Legendary', nameVi: 'Truyền Thuyết', minLevel: 61, maxLevel: 70, qualityBonusPct: 36, extraYieldBonusPct: 32, materialSaveChancePct: 20 },
];

export const PROFESSION_QUALITY_RULES: Record<
  ItemQuality,
  { label: string; labelVi: string; statMultiplier: number; valueMultiplier: number; color: string }
> = {
  common: { label: 'Common', labelVi: 'Thường', statMultiplier: 1.0, valueMultiplier: 1.0, color: '#9ca3af' },
  uncommon: { label: 'Uncommon', labelVi: 'Tốt', statMultiplier: 1.15, valueMultiplier: 1.35, color: '#22c55e' },
  rare: { label: 'Rare', labelVi: 'Hiếm', statMultiplier: 1.35, valueMultiplier: 1.9, color: '#3b82f6' },
  epic: { label: 'Epic', labelVi: 'Sử Thi', statMultiplier: 1.65, valueMultiplier: 3.1, color: '#a855f7' },
  legendary: { label: 'Legendary', labelVi: 'Truyền Thuyết', statMultiplier: 2.15, valueMultiplier: 6.0, color: '#f97316' },
};

export const PROFESSION_ECONOMY_RULES = {
  defaultMarketTaxPct: 5,
  territoryOwnerMarketRebatePct: 1,
  auctionListingFeePct: 3,
  auctionOutbidMinIncrementPct: 5,
  dailyNpcSupplyContractLimit: 8,
  maxActiveMarketListingsPerPlayer: 20,
  priceFloorMultiplier: 0.4,
  priceCeilingMultiplier: 25.0,
};

export const PROFESSION_DEFINITIONS: ProfessionDefinition[] = [
  { id: 'herbalist', name: 'Herbalist', nameVi: 'Thảo Dược Sư', category: 'hybrid', iconKey: 'herb_green', npcId: 'NPC_HERBALIST_MASTER', primaryStatAffinity: 'int', unlockCostGold: 500, description: 'Hái thảo dược quý và điều chế linh dược hồi phục, thuốc giải độc và tinh chất sinh mệnh.' },
  { id: 'blacksmith', name: 'Blacksmith', nameVi: 'Thợ Rèn', category: 'crafting', iconKey: 'ore_iron', npcId: 'NPC_BLACKSMITH_MASTER', primaryStatAffinity: 'str', unlockCostGold: 800, description: 'Rèn đúc vũ khí, giáp trụ, công cụ nghề nghiệp và trang bị Truyền Thuyết từ lõi Boss.' },
  { id: 'alchemist_jeweler', name: 'Alchemist / Jeweler', nameVi: 'Giả Kim & Kim Hoàn', category: 'crafting', iconKey: 'gem_amethyst', npcId: 'NPC_ALCHEMIST_MASTER', primaryStatAffinity: 'int', unlockCostGold: 900, description: 'Chế tác trang sức ma pháp, nhẫn, dây chuyền, đá cường hóa và tinh thể giả kim.' },
  { id: 'miner', name: 'Miner', nameVi: 'Thợ Mỏ', category: 'gathering', iconKey: 'ore_iron', npcId: 'NPC_MINING_SUPERVISOR', primaryStatAffinity: 'con', unlockCostGold: 450, description: 'Khai thác quặng sắt, mithril, tinh thạch hỏa ngục và pha lê sao.' },
  { id: 'farmer', name: 'Farmer', nameVi: 'Nông Phu', category: 'gathering', iconKey: 'herb_green', npcId: 'NPC_FARMER_MASTER', primaryStatAffinity: 'con', unlockCostGold: 350, description: 'Gieo hạt, tưới nước và thu hoạch nông sản linh điền theo thời gian thực.' },
  { id: 'fisherman', name: 'Fisherman', nameVi: 'Ngư Phủ', category: 'gathering', iconKey: 'fragment_crystal', npcId: 'NPC_FISHERMAN_MASTER', primaryStatAffinity: 'dex', unlockCostGold: 400, description: 'Câu cá linh hồ, săn thủy sản quý và ngọc trai vực thẳm cung cấp cho Đầu Bếp & Giả Kim.' },
  { id: 'woodcutter', name: 'Woodcutter', nameVi: 'Tiều Phu', category: 'gathering', iconKey: 'wood_oak', npcId: 'NPC_LUMBERJACK_MASTER', primaryStatAffinity: 'str', unlockCostGold: 400, description: 'Đốn hạ gỗ sồi, cổ mộc tinh linh và nhánh cây thế giới phục vụ rèn và xây dựng Bang Hội.' },
  { id: 'chef', name: 'Chef', nameVi: 'Bếp Trưởng', category: 'crafting', iconKey: 'bread_loaf', npcId: 'NPC_CHEF_MASTER', primaryStatAffinity: 'dex', unlockCostGold: 600, description: 'Chế biến mỹ vị hoàng cung mang lại hiệu ứng tăng EXP, công lực và phẩm chất chế tạo.' },
];

export const PROFESSION_TOOLS: ProfessionToolDefinition[] = [
  { id: 'TOOL_HERB_SICKLE_T1', name: 'Copper Herb Sickle', nameVi: 'Liềm Đồng Hái Thuốc', professionId: 'herbalist', tier: 1, requiredMastery: 1, maxDurability: 80, gatherSpeedBonusPct: 0, qualityBonusPct: 2, extraYieldBonusPct: 3, priceGold: 200, repairCostPerPoint: 2, rarity: 'common' },
  { id: 'TOOL_HERB_SICKLE_T2', name: 'Mithril Moon Sickle', nameVi: 'Liềm Trăng Mithril', professionId: 'herbalist', tier: 2, requiredMastery: 25, maxDurability: 140, gatherSpeedBonusPct: 18, qualityBonusPct: 10, extraYieldBonusPct: 12, priceGold: 4500, repairCostPerPoint: 8, rarity: 'rare' },
  { id: 'TOOL_MINER_PICK_T1', name: 'Iron Mining Pickaxe', nameVi: 'Cuốc Chim Sắt', professionId: 'miner', tier: 1, requiredMastery: 1, maxDurability: 90, gatherSpeedBonusPct: 0, qualityBonusPct: 2, extraYieldBonusPct: 4, priceGold: 220, repairCostPerPoint: 2, rarity: 'common' },
  { id: 'TOOL_MINER_PICK_T2', name: 'Dragonfire Pickaxe', nameVi: 'Cuốc Long Hỏa', professionId: 'miner', tier: 2, requiredMastery: 30, maxDurability: 160, gatherSpeedBonusPct: 20, qualityBonusPct: 12, extraYieldBonusPct: 15, priceGold: 5200, repairCostPerPoint: 9, rarity: 'epic' },
  { id: 'TOOL_WOOD_AXE_T1', name: 'Forester Hatchet', nameVi: 'Rìu Tiều Phu Sơ Cấp', professionId: 'woodcutter', tier: 1, requiredMastery: 1, maxDurability: 85, gatherSpeedBonusPct: 0, qualityBonusPct: 2, extraYieldBonusPct: 4, priceGold: 200, repairCostPerPoint: 2, rarity: 'common' },
  { id: 'TOOL_WOOD_AXE_T2', name: 'Spiritwood Broadaxe', nameVi: 'Đại Phủ Tinh Mộc', professionId: 'woodcutter', tier: 2, requiredMastery: 25, maxDurability: 150, gatherSpeedBonusPct: 18, qualityBonusPct: 10, extraYieldBonusPct: 14, priceGold: 4200, repairCostPerPoint: 8, rarity: 'rare' },
  { id: 'TOOL_FISH_ROD_T1', name: 'Bamboo Angling Rod', nameVi: 'Cần Câu Trúc Thanh', professionId: 'fisherman', tier: 1, requiredMastery: 1, maxDurability: 80, gatherSpeedBonusPct: 0, qualityBonusPct: 3, extraYieldBonusPct: 3, priceGold: 180, repairCostPerPoint: 2, rarity: 'common' },
  { id: 'TOOL_FISH_ROD_T2', name: 'Starlight Reel Rod', nameVi: 'Cần Câu Ánh Sao', professionId: 'fisherman', tier: 2, requiredMastery: 25, maxDurability: 140, gatherSpeedBonusPct: 20, qualityBonusPct: 14, extraYieldBonusPct: 12, priceGold: 4800, repairCostPerPoint: 8, rarity: 'epic' },
  { id: 'TOOL_FARM_HOE_T1', name: 'Oak Farmer Hoe', nameVi: 'Cuốc Đất Gỗ Sồi', professionId: 'farmer', tier: 1, requiredMastery: 1, maxDurability: 90, gatherSpeedBonusPct: 0, qualityBonusPct: 3, extraYieldBonusPct: 5, priceGold: 160, repairCostPerPoint: 2, rarity: 'common' },
  { id: 'TOOL_FARM_HOE_T2', name: 'Emerald Blessing Hoe', nameVi: 'Cuốc Đất Ngọc Lục Bảo', professionId: 'farmer', tier: 2, requiredMastery: 21, maxDurability: 150, gatherSpeedBonusPct: 15, qualityBonusPct: 12, extraYieldBonusPct: 15, priceGold: 3600, repairCostPerPoint: 6, rarity: 'rare' },
  { id: 'TOOL_SMITH_HAMMER_T1', name: 'Novice Forging Hammer', nameVi: 'Búa Rèn Sơ Cấp', professionId: 'blacksmith', tier: 1, requiredMastery: 1, maxDurability: 100, gatherSpeedBonusPct: 0, qualityBonusPct: 4, extraYieldBonusPct: 3, priceGold: 300, repairCostPerPoint: 3, rarity: 'common' },
  { id: 'TOOL_SMITH_HAMMER_T2', name: 'Volcanic Master Hammer', nameVi: 'Búa Rèn Dung Nham', professionId: 'blacksmith', tier: 2, requiredMastery: 31, maxDurability: 180, gatherSpeedBonusPct: 12, qualityBonusPct: 16, extraYieldBonusPct: 10, priceGold: 6400, repairCostPerPoint: 10, rarity: 'epic' },
  { id: 'TOOL_ALCH_MORTAR_T1', name: 'Bronze Alchemist Mortar', nameVi: 'Cối Giả Kim Đồng', professionId: 'alchemist_jeweler', tier: 1, requiredMastery: 1, maxDurability: 100, gatherSpeedBonusPct: 0, qualityBonusPct: 4, extraYieldBonusPct: 4, priceGold: 320, repairCostPerPoint: 3, rarity: 'common' },
  { id: 'TOOL_ALCH_MORTAR_T2', name: 'Arcane Crystal Crucible', nameVi: 'Lò Luyện Pha Lê Bí Thuật', professionId: 'alchemist_jeweler', tier: 2, requiredMastery: 31, maxDurability: 180, gatherSpeedBonusPct: 12, qualityBonusPct: 16, extraYieldBonusPct: 12, priceGold: 6600, repairCostPerPoint: 10, rarity: 'epic' },
  { id: 'TOOL_CHEF_SKILLET_T1', name: 'Cast-Iron Chef Skillet', nameVi: 'Chảo Gang Bếp Trưởng', professionId: 'chef', tier: 1, requiredMastery: 1, maxDurability: 100, gatherSpeedBonusPct: 0, qualityBonusPct: 4, extraYieldBonusPct: 5, priceGold: 260, repairCostPerPoint: 2, rarity: 'common' },
  { id: 'TOOL_CHEF_SKILLET_T2', name: 'Royal Golden Wok', nameVi: 'Vạc Vàng Cung Đình', professionId: 'chef', tier: 2, requiredMastery: 26, maxDurability: 170, gatherSpeedBonusPct: 15, qualityBonusPct: 15, extraYieldBonusPct: 15, priceGold: 5000, repairCostPerPoint: 8, rarity: 'rare' },
];

export const PROFESSION_MATERIALS: ProfessionMaterialDefinition[] = [
  { id: 'MAT_PROF_HERB_GREEN', name: 'Meadow Healing Leaf', nameVi: 'Lá Dược Thảo Đồng Xanh', professionId: 'herbalist', tier: 1, rarity: 'common', baseValueGold: 18, stackLimit: 99, sourceType: 'gather', description: 'Lá thảo mộc phổ biến dùng chế Bình Sinh Lực.' },
  { id: 'MAT_PROF_MOONFLOWER', name: 'Silver Moonflower', nameVi: 'Nguyệt Hoa Bạc', professionId: 'herbalist', tier: 2, rarity: 'uncommon', baseValueGold: 65, stackLimit: 99, sourceType: 'gather', description: 'Hoa nở bên Hồ Ánh Trăng, tăng mạnh hiệu lực dược phẩm.' },
  { id: 'MAT_PROF_PHOENIX_LEAF', name: 'Crimson Phoenix Herb', nameVi: 'Hỏa Phượng Thảo', professionId: 'herbalist', tier: 3, rarity: 'rare', baseValueGold: 220, stackLimit: 99, sourceType: 'gather', description: 'Dược liệu cực hiếm vùng Hẻm Núi Tro Tàn.' },
  { id: 'MAT_PROF_IRON_ORE', name: 'Raw Elysia Iron Ore', nameVi: 'Quặng Sắt Thô Elysia', professionId: 'miner', tier: 1, rarity: 'common', baseValueGold: 20, stackLimit: 99, sourceType: 'mine', description: 'Quặng sắt dùng luyện thép và rèn trang bị tân thủ.' },
  { id: 'MAT_PROF_MITHRIL_ORE', name: 'Pure Mithril Vein', nameVi: 'Quặng Mithril Tinh Khiết', professionId: 'miner', tier: 2, rarity: 'rare', baseValueGold: 140, stackLimit: 99, sourceType: 'mine', description: 'Kim loại ma pháp nhẹ và bền dùng đúc vũ khí cấp cao.' },
  { id: 'MAT_PROF_STAR_CRYSTAL', name: 'Celestial Star Crystal', nameVi: 'Pha Lê Tinh Tú', professionId: 'miner', tier: 3, rarity: 'epic', baseValueGold: 480, stackLimit: 99, sourceType: 'mine', description: 'Tinh thể ánh sao kết tinh sâu trong Thung Lũng Rồng.' },
  { id: 'MAT_PROF_OAK_TIMBER', name: 'Hardened Oak Log', nameVi: 'Gỗ Sồi Chắc Nịch', professionId: 'woodcutter', tier: 1, rarity: 'common', baseValueGold: 16, stackLimit: 99, sourceType: 'woodcut', description: 'Gỗ cơ bản chế cán vũ khí, khiên và công cụ.' },
  { id: 'MAT_PROF_ELDERWOOD', name: 'Ancient Spirit Timber', nameVi: 'Gỗ Cổ Thụ Tinh Linh', professionId: 'woodcutter', tier: 2, rarity: 'rare', baseValueGold: 135, stackLimit: 99, sourceType: 'woodcut', description: 'Thân gỗ hấp thụ ma lực rừng sâu.' },
  { id: 'MAT_PROF_WORLD_BRANCH', name: 'Yggdrasil Essence Bark', nameVi: 'Vỏ Cây Thế Giới', professionId: 'woodcutter', tier: 3, rarity: 'epic', baseValueGold: 460, stackLimit: 99, sourceType: 'woodcut', description: 'Gỗ huyền thoại cần cho cung thần và công trình Bang Hội.' },
  { id: 'MAT_PROF_CARP', name: 'Silver Brook Carp', nameVi: 'Cá Chép Suối Bạc', professionId: 'fisherman', tier: 1, rarity: 'common', baseValueGold: 22, stackLimit: 99, sourceType: 'fish', description: 'Cá tươi ngọt thích hợp nấu súp hồi phục HP/MP.' },
  { id: 'MAT_PROF_MOON_SALMON', name: 'Moonwater Salmon', nameVi: 'Cá Hồi Nguyệt Thủy', professionId: 'fisherman', tier: 2, rarity: 'rare', baseValueGold: 155, stackLimit: 99, sourceType: 'fish', description: 'Cá quý chỉ cắn câu vào mùa thủy triều tại Moonlit Lake.' },
  { id: 'MAT_PROF_ABYSSAL_PEARL', name: 'Abyssal Siren Pearl', nameVi: 'Ngọc Trai Biển Sâu', professionId: 'fisherman', tier: 3, rarity: 'epic', baseValueGold: 520, stackLimit: 99, sourceType: 'fish', description: 'Ngọc quý tăng tỷ lệ phẩm chất khi chế trang sức.' },
  { id: 'MAT_PROF_SEED_WHEAT', name: 'Golden Wheat Seed', nameVi: 'Hạt Giống Lúa Mì Vàng', professionId: 'farmer', tier: 1, rarity: 'common', baseValueGold: 12, stackLimit: 99, sourceType: 'farm', description: 'Hạt giống lúa mì thời gian sinh trưởng ngắn.' },
  { id: 'MAT_PROF_WHEAT', name: 'Sun-Kissed Wheat', nameVi: 'Lúa Mì Nắng Mai', professionId: 'farmer', tier: 1, rarity: 'common', baseValueGold: 28, stackLimit: 99, sourceType: 'farm', description: 'Nguyên liệu nền tảng cho bánh mì và đại tiệc của Bếp Trưởng.' },
  { id: 'MAT_PROF_SEED_APPLE', name: 'Honeyed Apple Sapling', nameVi: 'Hạt Giống Táo Mật', professionId: 'farmer', tier: 2, rarity: 'uncommon', baseValueGold: 45, stackLimit: 99, sourceType: 'farm', description: 'Hạt giống táo mật cho sản lượng trái cây giàu EXP.' },
  { id: 'MAT_PROF_GOLDEN_APPLE', name: 'Elysia Golden Apple', nameVi: 'Táo Vàng Elysia', professionId: 'farmer', tier: 2, rarity: 'rare', baseValueGold: 180, stackLimit: 99, sourceType: 'farm', description: 'Trái quý giúp đầu bếp nấu món tăng EXP chiến đấu.' },
  { id: 'MAT_PROF_IRON_INGOT', name: 'Refined Steel Ingot', nameVi: 'Thỏi Thép Tinh Luyện', professionId: 'blacksmith', tier: 1, rarity: 'uncommon', baseValueGold: 75, stackLimit: 99, sourceType: 'refined', description: 'Thép rèn từ Quặng Sắt và Than Gỗ.' },
];

export const PROFESSION_GATHERING_NODES: GatheringNodeDefinition[] = [
  { id: 'NODE_VILLAGE_HERB_01', name: 'Sunleaf Herb Patch', nameVi: 'Bụi Dược Thảo Khởi Nguyên', professionId: 'herbalist', nodeType: 'herb', mapId: 'THON_KHOI_NGUYEN', tx: 28, ty: 22, requiredToolTier: 1, requiredMastery: 1, gatherDurationMs: 1400, quantityMin: 1, quantityMax: 3, respawnSeconds: 18, rarity: 'common', expReward: 22, primaryMaterialId: 'MAT_PROF_HERB_GREEN', rareDropMaterialId: 'MAT_PROF_MOONFLOWER', rareDropChancePct: 12 },
  { id: 'NODE_MEADOW_HERB_02', name: 'Whispering Moonflower', nameVi: 'Khóm Nguyệt Hoa Gió Thì Thầm', professionId: 'herbalist', nodeType: 'herb', mapId: 'map_whispering_meadow', tx: 18, ty: 16, requiredToolTier: 1, requiredMastery: 11, gatherDurationMs: 1600, quantityMin: 1, quantityMax: 3, respawnSeconds: 25, rarity: 'uncommon', expReward: 38, primaryMaterialId: 'MAT_PROF_MOONFLOWER', rareDropMaterialId: 'MAT_PROF_PHOENIX_LEAF', rareDropChancePct: 10 },
  { id: 'NODE_CANYON_HERB_03', name: 'Crimson Phoenix Bush', nameVi: 'Khóm Hỏa Phượng Thảo', professionId: 'herbalist', nodeType: 'herb', mapId: 'map_ember_canyon', tx: 22, ty: 14, requiredToolTier: 2, requiredMastery: 35, gatherDurationMs: 1900, quantityMin: 1, quantityMax: 2, respawnSeconds: 40, rarity: 'rare', expReward: 85, primaryMaterialId: 'MAT_PROF_PHOENIX_LEAF' },
  { id: 'NODE_VILLAGE_ORE_01', name: 'Elysia Iron Vein', nameVi: 'Mạch Quặng Sắt Khởi Nguyên', professionId: 'miner', nodeType: 'ore', mapId: 'THON_KHOI_NGUYEN', tx: 37, ty: 14, requiredToolTier: 1, requiredMastery: 1, gatherDurationMs: 1600, quantityMin: 1, quantityMax: 3, respawnSeconds: 20, rarity: 'common', expReward: 24, primaryMaterialId: 'MAT_PROF_IRON_ORE', rareDropMaterialId: 'MAT_PROF_MITHRIL_ORE', rareDropChancePct: 10, territoryId: 'TERR_IRONPEAK_OUTPOST' },
  { id: 'NODE_CANYON_ORE_02', name: 'Ember Mithril Vein', nameVi: 'Mạch Mithril Hẻm Núi', professionId: 'miner', nodeType: 'ore', mapId: 'map_ember_canyon', tx: 26, ty: 19, requiredToolTier: 1, requiredMastery: 15, gatherDurationMs: 1800, quantityMin: 1, quantityMax: 3, respawnSeconds: 30, rarity: 'rare', expReward: 52, primaryMaterialId: 'MAT_PROF_MITHRIL_ORE', rareDropMaterialId: 'MAT_PROF_STAR_CRYSTAL', rareDropChancePct: 12, territoryId: 'TERR_IRONPEAK_OUTPOST' },
  { id: 'NODE_DRAGON_ORE_03', name: 'Celestial Star Crystal Deposit', nameVi: 'Mỏ Pha Lê Tinh Tú', professionId: 'miner', nodeType: 'ore', mapId: 'map_dragon_valley', tx: 30, ty: 18, requiredToolTier: 2, requiredMastery: 41, gatherDurationMs: 2200, quantityMin: 1, quantityMax: 2, respawnSeconds: 45, rarity: 'epic', expReward: 115, primaryMaterialId: 'MAT_PROF_STAR_CRYSTAL', territoryId: 'TERR_DRAKHEN_CITADEL' },
  { id: 'NODE_VILLAGE_TREE_01', name: 'Sturdy Oak Tree', nameVi: 'Cây Sồi Bìa Làng', professionId: 'woodcutter', nodeType: 'tree', mapId: 'THON_KHOI_NGUYEN', tx: 14, ty: 24, requiredToolTier: 1, requiredMastery: 1, gatherDurationMs: 1500, quantityMin: 2, quantityMax: 4, respawnSeconds: 20, rarity: 'common', expReward: 22, primaryMaterialId: 'MAT_PROF_OAK_TIMBER', territoryId: 'TERR_SYLVARIS_FOREST' },
  { id: 'NODE_FOREST_TREE_02', name: 'Spiritwood Ancient Pine', nameVi: 'Cổ Mộc Tinh Linh', professionId: 'woodcutter', nodeType: 'tree', mapId: 'map_spirit_forest', tx: 20, ty: 20, requiredToolTier: 1, requiredMastery: 21, gatherDurationMs: 1900, quantityMin: 1, quantityMax: 3, respawnSeconds: 32, rarity: 'rare', expReward: 60, primaryMaterialId: 'MAT_PROF_ELDERWOOD', rareDropMaterialId: 'MAT_PROF_WORLD_BRANCH', rareDropChancePct: 11, territoryId: 'TERR_SYLVARIS_FOREST' },
  { id: 'NODE_VILLAGE_FISH_01', name: 'Crystal Brook Fishing Pier', nameVi: 'Bến Câu Suối Pha Lê', professionId: 'fisherman', nodeType: 'fishing_spot', mapId: 'THON_KHOI_NGUYEN', tx: 33, ty: 25, requiredToolTier: 1, requiredMastery: 1, gatherDurationMs: 1700, quantityMin: 1, quantityMax: 2, respawnSeconds: 12, rarity: 'common', expReward: 25, primaryMaterialId: 'MAT_PROF_CARP', rareDropMaterialId: 'MAT_PROF_MOON_SALMON', rareDropChancePct: 14 },
  { id: 'NODE_LAKE_FISH_02', name: 'Moonlit Lake Sacred Spot', nameVi: 'Điểm Câu Hồ Ánh Trăng', professionId: 'fisherman', nodeType: 'fishing_spot', mapId: 'map_moonlit_lake', tx: 24, ty: 18, requiredToolTier: 2, requiredMastery: 25, gatherDurationMs: 2100, quantityMin: 1, quantityMax: 2, respawnSeconds: 20, rarity: 'rare', expReward: 74, primaryMaterialId: 'MAT_PROF_MOON_SALMON', rareDropMaterialId: 'MAT_PROF_ABYSSAL_PEARL', rareDropChancePct: 15, territoryId: 'TERR_MOONLIT_TRADE' },
];

export const PROFESSION_RECIPES: ProfessionRecipeDefinition[] = [
  // Herbalist
  { id: 'REC_HERB_POTION_T1', name: 'Minor Vitality Decoction', nameVi: 'Bình Sinh Lực Thảo Dược', professionId: 'herbalist', tier: 1, requiredMastery: 1, materials: [{ itemId: 'MAT_PROF_HERB_GREEN', quantity: 2 }], outputItemId: 'ITEM_POTION_HP_SMALL', outputName: 'Bình Sinh Lực Nhỏ', outputQuantity: 2, craftCostGold: 25, baseSuccessRatePct: 96, baseExtraYieldChancePct: 18, maxExtraYieldQty: 2, expReward: 28, craftTimeMs: 900, description: 'Bào chế nhanh 2 Bình Sinh Lực từ Lá Dược Thảo Đồng Xanh.' },
  { id: 'REC_HERB_ELIXIR_T2', name: 'Moonflower Rejuvenation Potion', nameVi: 'Nguyệt Hoa Linh Dược', professionId: 'herbalist', tier: 2, requiredMastery: 18, materials: [{ itemId: 'MAT_PROF_MOONFLOWER', quantity: 2 }, { itemId: 'MAT_PROF_HERB_GREEN', quantity: 2 }], outputItemId: 'ITEM_POTION_HP_MEDIUM', outputName: 'Bình Sinh Lực Trung Cấp', outputQuantity: 2, craftCostGold: 120, baseSuccessRatePct: 92, baseExtraYieldChancePct: 22, maxExtraYieldQty: 2, expReward: 68, craftTimeMs: 1200, description: 'Dược phẩm hồi lượng lớn sinh lực.' },
  { id: 'REC_HERB_LEGEND_PANACEA', name: 'Treant Heart Eternal Elixir', nameVi: 'Thần Dược Bất Tử (Hidden Legendary)', professionId: 'herbalist', tier: 5, requiredMastery: 55, isHidden: true, isLegendary: true, requiresQuestId: 'PQ_HERB_HIDDEN_LEGEND', requiresBossReagent: true, materials: [{ itemId: 'MAT_PROF_PHOENIX_LEAF', quantity: 4 }, { itemId: 'MAT_TREANT_CORE', quantity: 1 }], outputItemId: 'PROF_ITEM_LEGEND_PANACEA', outputName: 'Linh Dược Thụ Thần (Legendary)', outputQuantity: 1, craftCostGold: 3500, baseSuccessRatePct: 82, baseExtraYieldChancePct: 25, maxExtraYieldQty: 1, expReward: 420, craftTimeMs: 2200, buffEffect: { stat: 'maxHpPct', pctBonus: 18, durationSec: 1800 }, description: 'Công thức bí truyền kết hợp Hỏa Phượng Thảo & Lõi Cổ Thụ Boss.' },

  // Blacksmith
  { id: 'REC_SMITH_STEEL_INGOT', name: 'Smelt Refined Steel Ingot', nameVi: 'Luyện Thỏi Thép Tinh', professionId: 'blacksmith', tier: 1, requiredMastery: 1, materials: [{ itemId: 'MAT_PROF_IRON_ORE', quantity: 3 }, { itemId: 'MAT_PROF_OAK_TIMBER', quantity: 1 }], outputItemId: 'MAT_PROF_IRON_INGOT', outputName: 'Thỏi Thép Tinh Luyện', outputQuantity: 2, craftCostGold: 35, baseSuccessRatePct: 96, baseExtraYieldChancePct: 20, maxExtraYieldQty: 2, expReward: 32, craftTimeMs: 1000, description: 'Nung chảy quặng sắt cùng gỗ sồi thành thép rèn vũ khí.' },
  { id: 'REC_SMITH_STEEL_SWORD', name: 'Forged Knight Longsword', nameVi: 'Trường Kiếm Thép Elysia', professionId: 'blacksmith', tier: 2, requiredMastery: 15, materials: [{ itemId: 'MAT_PROF_IRON_INGOT', quantity: 3 }, { itemId: 'MAT_PROF_OAK_TIMBER', quantity: 2 }], outputItemId: 'PROF_ITEM_STEEL_SWORD', outputName: 'Trường Kiếm Thép Elysia', outputQuantity: 1, craftCostGold: 450, baseSuccessRatePct: 90, baseExtraYieldChancePct: 12, maxExtraYieldQty: 1, expReward: 95, craftTimeMs: 1600, description: 'Vũ khí chất lượng cao cho Kiếm Sĩ và Tân Thủ cấp trung.' },
  { id: 'REC_SMITH_DRAGON_BLADE', name: 'Ignis Dragonforge Blade', nameVi: 'Long Diệm Thần Kiếm (Hidden Legendary)', professionId: 'blacksmith', tier: 5, requiredMastery: 58, isHidden: true, isLegendary: true, requiresQuestId: 'PQ_SMITH_HIDDEN_LEGEND', requiresBossReagent: true, materials: [{ itemId: 'MAT_PROF_MITHRIL_ORE', quantity: 6 }, { itemId: 'MAT_DRAGON_HEART', quantity: 1 }], outputItemId: 'PROF_ITEM_DRAGON_BLADE', outputName: 'Long Diệm Thần Kiếm (Legendary)', outputQuantity: 1, craftCostGold: 9500, baseSuccessRatePct: 78, baseExtraYieldChancePct: 10, maxExtraYieldQty: 1, expReward: 520, craftTimeMs: 2500, description: 'Thần binh rèn từ Tim Rồng Ignis và quặng Mithril tinh khiết.' },

  // Alchemist / Jeweler
  { id: 'REC_ALCH_UPGRADE_STONE', name: 'Transmute Upgrade Stone', nameVi: 'Luyện Đá Cường Hóa Sơ Cấp', professionId: 'alchemist_jeweler', tier: 1, requiredMastery: 1, materials: [{ itemId: 'MAT_PROF_IRON_ORE', quantity: 2 }, { itemId: 'MAT_PROF_HERB_GREEN', quantity: 2 }], outputItemId: 'ITEM_UPGRADE_STONE_BASIC', outputName: 'Đá Cường Hóa Sơ Cấp', outputQuantity: 1, craftCostGold: 150, baseSuccessRatePct: 92, baseExtraYieldChancePct: 22, maxExtraYieldQty: 2, expReward: 42, craftTimeMs: 1100, description: 'Tinh luyện đá cường hóa cho Lò Rèn & Chợ.' },
  { id: 'REC_ALCH_AMETHYST_RING', name: 'Moonwater Star Ring', nameVi: 'Nhẫn Ánh Trăng Tinh Tú', professionId: 'alchemist_jeweler', tier: 3, requiredMastery: 25, materials: [{ itemId: 'MAT_PROF_MITHRIL_ORE', quantity: 2 }, { itemId: 'MAT_PROF_ABYSSAL_PEARL', quantity: 1 }], outputItemId: 'PROF_ITEM_STAR_RING', outputName: 'Nhẫn Ánh Trăng Tinh Tú', outputQuantity: 1, craftCostGold: 1200, baseSuccessRatePct: 88, baseExtraYieldChancePct: 14, maxExtraYieldQty: 1, expReward: 150, craftTimeMs: 1600, description: 'Trang sức tăng MATK, Crit và Tốc độ thi triển.' },
  { id: 'REC_ALCH_ABYSSAL_NECKLACE', name: 'Abyssal Core Crown Amulet', nameVi: 'Hộ Phù Hư Không (Hidden Legendary)', professionId: 'alchemist_jeweler', tier: 5, requiredMastery: 55, isHidden: true, isLegendary: true, requiresQuestId: 'PQ_ALCH_HIDDEN_LEGEND', requiresBossReagent: true, materials: [{ itemId: 'MAT_PROF_STAR_CRYSTAL', quantity: 4 }, { itemId: 'MAT_ABYSSAL_CORE', quantity: 1 }], outputItemId: 'PROF_ITEM_ABYSSAL_AMULET', outputName: 'Hộ Phù Hư Không (Legendary)', outputQuantity: 1, craftCostGold: 8800, baseSuccessRatePct: 80, baseExtraYieldChancePct: 12, maxExtraYieldQty: 1, expReward: 490, craftTimeMs: 2400, description: 'Bảo vật kim hoàn tối thượng từ Lõi Hư Không.' },

  // Chef
  { id: 'REC_CHEF_WARM_BREAD', name: 'Hearth Honey Bread', nameVi: 'Bánh Mì Nướng Mật Ong', professionId: 'chef', tier: 1, requiredMastery: 1, materials: [{ itemId: 'MAT_PROF_WHEAT', quantity: 2 }], outputItemId: 'PROF_ITEM_HONEY_BREAD', outputName: 'Bánh Mì Nướng Ấm (+8% EXP)', outputQuantity: 2, craftCostGold: 20, baseSuccessRatePct: 98, baseExtraYieldChancePct: 24, maxExtraYieldQty: 2, expReward: 26, craftTimeMs: 800, buffEffect: { stat: 'expBonusPct', pctBonus: 8, durationSec: 1200 }, description: 'Hồi phục HP và tăng 8% EXP thu nhận trong 20 phút.' },
  { id: 'REC_CHEF_CARP_SOUP', name: 'Silver Brook Carp Stew', nameVi: 'Canh Cá Chép Suối Bạc', professionId: 'chef', tier: 2, requiredMastery: 14, materials: [{ itemId: 'MAT_PROF_CARP', quantity: 2 }, { itemId: 'MAT_PROF_HERB_GREEN', quantity: 1 }], outputItemId: 'PROF_ITEM_CARP_STEW', outputName: 'Canh Cá Chép (+6% ATK/MATK)', outputQuantity: 2, craftCostGold: 95, baseSuccessRatePct: 94, baseExtraYieldChancePct: 24, maxExtraYieldQty: 2, expReward: 62, craftTimeMs: 1100, buffEffect: { stat: 'atkPct', pctBonus: 6, durationSec: 1800 }, description: 'Món canh bổ dưỡng tăng 6% Sát thương.' },
  { id: 'REC_CHEF_ROYAL_BANQUET', name: 'Royal Dragonfruit Feast', nameVi: 'Đại Tiệc Hoàng Gia Elysia (Hidden Legendary)', professionId: 'chef', tier: 5, requiredMastery: 52, isHidden: true, isLegendary: true, requiresQuestId: 'PQ_CHEF_HIDDEN_LEGEND', requiresBossReagent: true, materials: [{ itemId: 'MAT_PROF_GOLDEN_APPLE', quantity: 3 }, { itemId: 'MAT_PROF_MOON_SALMON', quantity: 2 }, { itemId: 'MAT_HYDRA_SCALE', quantity: 1 }], outputItemId: 'PROF_ITEM_ROYAL_FEAST', outputName: 'Đại Tiệc Hoàng Gia (+20% EXP & +10% ATK)', outputQuantity: 1, craftCostGold: 4200, baseSuccessRatePct: 84, baseExtraYieldChancePct: 20, maxExtraYieldQty: 1, expReward: 410, craftTimeMs: 2200, buffEffect: { stat: 'allCombatAndExp', pctBonus: 15, durationSec: 3600 }, description: 'Mỹ vị đỉnh cao phục vụ Bang Hội trước giờ đánh Boss.' },

  // Refining / Crafting for Woodcutter, Miner, Farmer, Fisherman
  { id: 'REC_WOOD_TIMBER_BUNDLE', name: 'Seasoned Construction Plank', nameVi: 'Ván Gỗ Sồi Gia Cố', professionId: 'woodcutter', tier: 1, requiredMastery: 1, materials: [{ itemId: 'MAT_PROF_OAK_TIMBER', quantity: 3 }], outputItemId: 'PROF_ITEM_OAK_PLANK', outputName: 'Ván Gỗ Sồi Gia Cố', outputQuantity: 2, craftCostGold: 20, baseSuccessRatePct: 98, baseExtraYieldChancePct: 20, maxExtraYieldQty: 2, expReward: 25, craftTimeMs: 850, description: 'Gỗ chế biến dùng đóng công cụ và xây Sảnh Bang Hội.' },
  { id: 'REC_MINER_CORE_REFINEMENT', name: 'Smelt Mithril Bar', nameVi: 'Thanh Mithril Rèn Đúc', professionId: 'miner', tier: 2, requiredMastery: 20, materials: [{ itemId: 'MAT_PROF_MITHRIL_ORE', quantity: 3 }], outputItemId: 'PROF_ITEM_MITHRIL_BAR', outputName: 'Thanh Mithril Tinh Khiết', outputQuantity: 1, craftCostGold: 180, baseSuccessRatePct: 92, baseExtraYieldChancePct: 18, maxExtraYieldQty: 1, expReward: 75, craftTimeMs: 1200, description: 'Nguyên liệu trung gian cung cấp cho Thợ Rèn & Kim Hoàn.' },
  { id: 'REC_FARMER_SEED_PACK', name: 'Fertilized Wheat Meal', nameVi: 'Bột Lúa Mì Dinh Dưỡng', professionId: 'farmer', tier: 1, requiredMastery: 1, materials: [{ itemId: 'MAT_PROF_WHEAT', quantity: 3 }], outputItemId: 'PROF_ITEM_FLOUR_SACK', outputName: 'Bao Bột Mì Tinh Sạch', outputQuantity: 2, craftCostGold: 15, baseSuccessRatePct: 98, baseExtraYieldChancePct: 24, maxExtraYieldQty: 2, expReward: 24, craftTimeMs: 800, description: 'Bột mì chất lượng cao cho Bếp Trưởng.' },
  { id: 'REC_FISH_AQUA_OIL', name: 'Refined Fish Oil Essence', nameVi: 'Tinh Dầu Cá Thuần Khiết', professionId: 'fisherman', tier: 1, requiredMastery: 1, materials: [{ itemId: 'MAT_PROF_CARP', quantity: 2 }], outputItemId: 'PROF_ITEM_FISH_OIL', outputName: 'Tinh Dầu Cá Thủy Tinh', outputQuantity: 2, craftCostGold: 25, baseSuccessRatePct: 96, baseExtraYieldChancePct: 22, maxExtraYieldQty: 2, expReward: 26, craftTimeMs: 850, description: 'Nguyên liệu phụ trợ cho Giả Kim & Thảo Dược.' },

  // Organization Creation Seals craftable or tradeable by Senior Crafters
  { id: 'REC_SMITH_GUILD_SEAL', name: 'Forge Guild Creation Seal', nameVi: 'Đúc Ấn Lập Bang Hội', professionId: 'blacksmith', tier: 3, requiredMastery: 20, materials: [{ itemId: 'MAT_PROF_IRON_INGOT', quantity: 5 }, { itemId: 'MAT_PROF_MITHRIL_ORE', quantity: 2 }], outputItemId: 'ITEM_GUILD_CREATION_SEAL', outputName: 'Ấn Ký Lập Bang Hội', outputQuantity: 1, craftCostGold: 5000, baseSuccessRatePct: 95, baseExtraYieldChancePct: 5, maxExtraYieldQty: 1, expReward: 180, craftTimeMs: 2000, description: 'Tín vật bắt buộc để thành lập Bang Hội tại Vương Đô.' },
  { id: 'REC_ALCH_MERCHANT_SEAL', name: 'Inscribe Merchant Seal', nameVi: 'Khắc Ấn Hiệp Hội Thương Nhân', professionId: 'alchemist_jeweler', tier: 3, requiredMastery: 18, materials: [{ itemId: 'MAT_PROF_MITHRIL_ORE', quantity: 2 }, { itemId: 'MAT_PROF_MOON_SALMON', quantity: 1 }], outputItemId: 'ITEM_MERCHANT_SEAL', outputName: 'Ấn Ký Hiệp Hội Thương Nhân', outputQuantity: 1, craftCostGold: 3000, baseSuccessRatePct: 95, baseExtraYieldChancePct: 5, maxExtraYieldQty: 1, expReward: 160, craftTimeMs: 1800, description: 'Tín vật thành lập Thương Hội chính thức.' },

  // Specialty & Hidden Legendary Recipes for Gathering/Refining Professions (All 8 covered!)
  { id: 'REC_MINER_STARFORGE_CORE', name: 'Smelt Starforge Alloy', nameVi: 'Luyện Hợp Kim Tinh Tú (Hidden Legendary)', professionId: 'miner', tier: 5, requiredMastery: 50, isHidden: true, isLegendary: true, requiresQuestId: 'PQ_MINER_HIDDEN_LEGEND', requiresBossReagent: true, materials: [{ itemId: 'MAT_PROF_STAR_CRYSTAL', quantity: 3 }, { itemId: 'MAT_DRAGON_HEART', quantity: 1 }], outputItemId: 'PROF_ITEM_STARFORGE_CORE', outputName: 'Hợp Kim Tinh Tú Lò Rèn (Legendary)', outputQuantity: 1, craftCostGold: 4800, baseSuccessRatePct: 82, baseExtraYieldChancePct: 16, maxExtraYieldQty: 1, expReward: 430, craftTimeMs: 2200, description: 'Kết tinh Pha Lê Tinh Tú và Tim Rồng Ignis thành hợp kim thần binh.' },
  { id: 'REC_FARMER_CELESTIAL_SEED', name: 'Cultivate World-Fruit Sapling', nameVi: 'Ươm Quả Thần Bất Diệt (Hidden Legendary)', professionId: 'farmer', tier: 5, requiredMastery: 50, isHidden: true, isLegendary: true, requiresQuestId: 'PQ_FARMER_HIDDEN_LEGEND', requiresBossReagent: true, materials: [{ itemId: 'MAT_PROF_GOLDEN_APPLE', quantity: 4 }, { itemId: 'MAT_TREANT_CORE', quantity: 1 }], outputItemId: 'PROF_ITEM_CELESTIAL_SEED', outputName: 'Quả Thần Bất Diệt Elysia (Legendary)', outputQuantity: 1, craftCostGold: 3600, baseSuccessRatePct: 84, baseExtraYieldChancePct: 18, maxExtraYieldQty: 1, expReward: 400, craftTimeMs: 2000, buffEffect: { stat: 'expBonusPct', pctBonus: 12, durationSec: 2400 }, description: 'Dung hợp Táo Vàng Elysia và Lõi Cổ Thụ Boss thành thần quả.' },
  { id: 'REC_FISH_ABYSSAL_ELIXIR', name: 'Distill Leviathan Pearl Nectar', nameVi: 'Chưng Cất Tinh Chất Long Ngư (Hidden Legendary)', professionId: 'fisherman', tier: 5, requiredMastery: 50, isHidden: true, isLegendary: true, requiresQuestId: 'PQ_FISH_HIDDEN_LEGEND', requiresBossReagent: true, materials: [{ itemId: 'MAT_PROF_ABYSSAL_PEARL', quantity: 3 }, { itemId: 'MAT_HYDRA_SCALE', quantity: 1 }], outputItemId: 'PROF_ITEM_ABYSSAL_ELIXIR', outputName: 'Tinh Chất Long Ngư Vực Thẳm (Legendary)', outputQuantity: 1, craftCostGold: 3900, baseSuccessRatePct: 83, baseExtraYieldChancePct: 18, maxExtraYieldQty: 1, expReward: 410, craftTimeMs: 2100, buffEffect: { stat: 'matkPct', pctBonus: 10, durationSec: 2400 }, description: 'Tinh lọc Ngọc Trai Biển Sâu với Vảy Thủy Quái Mặt Trăng.' },
  { id: 'REC_WOOD_YGGDRASIL_BEAM', name: 'Carve Yggdrasil Sacred Timber', nameVi: 'Đẽo Xà Gỗ Cây Thế Giới (Hidden Legendary)', professionId: 'woodcutter', tier: 5, requiredMastery: 50, isHidden: true, isLegendary: true, requiresQuestId: 'PQ_WOOD_HIDDEN_LEGEND', requiresBossReagent: true, materials: [{ itemId: 'MAT_PROF_WORLD_BRANCH', quantity: 3 }, { itemId: 'MAT_TREANT_CORE', quantity: 1 }], outputItemId: 'PROF_ITEM_YGGDRASIL_BEAM', outputName: 'Xà Gỗ Cây Thế Giới (Legendary)', outputQuantity: 1, craftCostGold: 4500, baseSuccessRatePct: 82, baseExtraYieldChancePct: 15, maxExtraYieldQty: 1, expReward: 425, craftTimeMs: 2200, description: 'Gỗ thiêng bất hoại phục vụ công trình Bang Hội tối thượng.' },
];

export const PROFESSION_NPCS: ProfessionNpcDefinition[] = [
  { id: 'NPC_HERBALIST_MASTER', name: 'Herbalist Master Lyra', nameVi: 'Dược Sư Lyra', title: 'Bậc Thầy Thảo Dược', professionId: 'herbalist', mapId: 'THON_KHOI_NGUYEN', tx: 25, ty: 20, spriteId: 'npc_merchant', dialogueIntro: 'Mỗi nhành cỏ bên suối Elysia đều chứa sinh khí chữa lành. Ngươi muốn học nghề Thảo Dược Sư chứ?', questIds: ['PQ_HERB_INTRO', 'PQ_HERB_DAILY', 'PQ_HERB_MASTERY_ADV', 'PQ_HERB_SPECIAL', 'PQ_HERB_HIDDEN_LEGEND'] },
  { id: 'NPC_BLACKSMITH_MASTER', name: 'Blacksmith Master Vulcan', nameVi: 'Thợ Rèn Vulcan', title: 'Tổng Công Tượng Rèn Đúc', professionId: 'blacksmith', mapId: 'THON_KHOI_NGUYEN', tx: 8, ty: 17, spriteId: 'npc_trainer', dialogueIntro: 'Lò rèn luôn đỏ lửa! Mang quặng và gỗ tốt tới đây, ta sẽ dạy ngươi rèn thần binh!', questIds: ['PQ_SMITH_INTRO', 'PQ_SMITH_DAILY', 'PQ_SMITH_MASTERY_ADV', 'PQ_SMITH_SPECIAL', 'PQ_SMITH_HIDDEN_LEGEND'] },
  { id: 'NPC_ALCHEMIST_MASTER', name: 'Alchemist Master Vesper', nameVi: 'Giả Kim Sư Vesper', title: 'Chưởng Môn Kim Hoàn & Giả Kim', professionId: 'alchemist_jeweler', mapId: 'city_elysia_capital', tx: 20, ty: 14, spriteId: 'npc_villager_elder', dialogueIntro: 'Tinh tú và đá quý ẩn giấu ma lực vô tận. Hãy cẩn trọng khi luyện chế!', questIds: ['PQ_ALCH_INTRO', 'PQ_ALCH_DAILY', 'PQ_ALCH_MASTERY_ADV', 'PQ_ALCH_SPECIAL', 'PQ_ALCH_HIDDEN_LEGEND'] },
  { id: 'NPC_MINING_SUPERVISOR', name: 'Mining Supervisor Torin', nameVi: 'Giám Sát Mỏ Torin', title: 'Đốc Công Khai Khoáng', professionId: 'miner', mapId: 'THON_KHOI_NGUYEN', tx: 33, ty: 9, spriteId: 'npc_trainer', dialogueIntro: 'Đừng quên kiểm tra độ bền Cuốc Chim trước khi gõ vào mạch Mithril!', questIds: ['PQ_MINER_INTRO', 'PQ_MINER_DAILY', 'PQ_MINER_MASTERY_ADV', 'PQ_MINER_SPECIAL', 'PQ_MINER_HIDDEN_LEGEND'] },
  { id: 'NPC_FARMER_MASTER', name: 'Farmer Hana', nameVi: 'Nông Phu Hana', title: 'Chủ Nông Trại Khởi Nguyên', professionId: 'farmer', mapId: 'THON_KHOI_NGUYEN', tx: 10, ty: 14, spriteId: 'npc_merchant', dialogueIntro: 'Tưới nước đúng lúc sẽ giúp cây lúa mì và táo vàng cho bội thu bất ngờ!', questIds: ['PQ_FARMER_INTRO', 'PQ_FARMER_DAILY', 'PQ_FARMER_MASTERY_ADV', 'PQ_FARMER_SPECIAL', 'PQ_FARMER_HIDDEN_LEGEND'] },
  { id: 'NPC_FISHERMAN_MASTER', name: 'Fisherman Kai', nameVi: 'Ngư Phủ Kai', title: 'Lão Ngư Bến Suối', professionId: 'fisherman', mapId: 'THON_KHOI_NGUYEN', tx: 29, ty: 23, spriteId: 'npc_villager_elder', dialogueIntro: 'Lắng nghe mặt nước phẳng lặng — cá Hồi Nguyệt Thủy chỉ chọn người kiên nhẫn.', questIds: ['PQ_FISH_INTRO', 'PQ_FISH_DAILY', 'PQ_FISH_MASTERY_ADV', 'PQ_FISH_SPECIAL', 'PQ_FISH_HIDDEN_LEGEND'] },
  { id: 'NPC_LUMBERJACK_MASTER', name: 'Lumberjack Garrick', nameVi: 'Tiều Phu Garrick', title: 'Trưởng Đội Đốn Gỗ Sylvaris', professionId: 'woodcutter', mapId: 'THON_KHOI_NGUYEN', tx: 12, ty: 22, spriteId: 'npc_trainer', dialogueIntro: 'Gỗ Sồi và Cổ Mộc là xương sống của công thành chiến và sảnh Bang Hội.', questIds: ['PQ_WOOD_INTRO', 'PQ_WOOD_DAILY', 'PQ_WOOD_MASTERY_ADV', 'PQ_WOOD_SPECIAL', 'PQ_WOOD_HIDDEN_LEGEND'] },
  { id: 'NPC_CHEF_MASTER', name: 'Master Chef Mei', nameVi: 'Bếp Trưởng Mei', title: 'Đầu Bếp Cung Đình', professionId: 'chef', mapId: 'THON_KHOI_NGUYEN', tx: 23, ty: 15, spriteId: 'npc_merchant', dialogueIntro: 'Một bữa tiệc nóng hổi giúp cả tổ đội bùng nổ EXP và sức mạnh trong Hầm Ngục!', questIds: ['PQ_CHEF_INTRO', 'PQ_CHEF_DAILY', 'PQ_CHEF_MASTERY_ADV', 'PQ_CHEF_SPECIAL', 'PQ_CHEF_HIDDEN_LEGEND'] },
];

export const PROFESSION_QUESTS: ProfessionQuestDefinition[] = [
  // 1. Herbalist
  { id: 'PQ_HERB_INTRO', name: 'First Herb Harvest', nameVi: 'Bước Đầu Hái Dược', professionId: 'herbalist', npcId: 'NPC_HERBALIST_MASTER', questKind: 'intro', requiredMastery: 1, requiredItemId: 'MAT_PROF_HERB_GREEN', requiredQty: 3, requiredActionType: 'deliver', rewardExp: 120, rewardGold: 300, description: 'Thu thập 3 Lá Dược Thảo Đồng Xanh giao cho Dược Sư Lyra.' },
  { id: 'PQ_HERB_DAILY', name: 'Daily Apothecary Supply', nameVi: 'Nhiệm Vụ Ngày: Tiếp Tế Dược Phẩm', professionId: 'herbalist', npcId: 'NPC_HERBALIST_MASTER', questKind: 'daily', requiredMastery: 1, requiredItemId: 'ITEM_POTION_HP_SMALL', requiredQty: 2, requiredActionType: 'deliver', rewardExp: 160, rewardGold: 550, description: 'Bào chế và giao 2 Bình Sinh Lực Nhỏ mỗi ngày.' },
  { id: 'PQ_HERB_MASTERY_ADV', name: 'Apothecary Expert Trial', nameVi: 'Thăng Cấp Chuyên Gia Dược Thảo', professionId: 'herbalist', npcId: 'NPC_HERBALIST_MASTER', questKind: 'mastery_advancement', requiredMastery: 18, requiredItemId: 'MAT_PROF_MOONFLOWER', requiredQty: 3, requiredActionType: 'deliver', rewardExp: 360, rewardGold: 1200, unlocksRecipeId: 'REC_HERB_ELIXIR_T2', description: 'Dùng Nguyệt Hoa Bạc chứng minh tay nghề để nhận chứng chỉ Chuyên Gia Lyra.' },
  { id: 'PQ_HERB_SPECIAL', name: 'Guild Field Medic Contract', nameVi: 'Nhiệm Vụ Đặc Biệt: Y Tế Chiến Tuyến', professionId: 'herbalist', npcId: 'NPC_HERBALIST_MASTER', questKind: 'special', requiredMastery: 30, requiredItemId: 'ITEM_POTION_HP_MEDIUM', requiredQty: 3, requiredActionType: 'deliver', rewardExp: 540, rewardGold: 2200, description: 'Điều chế dược phẩm hồi phục phục vụ đoàn thám hiểm Hẻm Núi Tro Tàn.' },
  { id: 'PQ_HERB_HIDDEN_LEGEND', name: 'Secret of the Treant Elixir', nameVi: 'Bí Truyền Thụ Thần (Ẩn)', professionId: 'herbalist', npcId: 'NPC_HERBALIST_MASTER', questKind: 'hidden_legendary', requiredMastery: 50, requiredItemId: 'MAT_TREANT_CORE', requiredQty: 1, requiredActionType: 'deliver', rewardExp: 900, rewardGold: 5000, unlocksRecipeId: 'REC_HERB_LEGEND_PANACEA', unlocksProfessionSlot: true, description: 'Mang 1 Lõi Cổ Thụ Boss cho Lyra để lĩnh ngộ công thức Thần Dược Bất Tử & mở khóa thêm +1 ô nghề!' },

  // 2. Blacksmith
  { id: 'PQ_SMITH_INTRO', name: 'Sparks on the Anvil', nameVi: 'Ngọn Lửa Đầu Tiên', professionId: 'blacksmith', npcId: 'NPC_BLACKSMITH_MASTER', questKind: 'intro', requiredMastery: 1, requiredItemId: 'MAT_PROF_IRON_INGOT', requiredQty: 2, requiredActionType: 'deliver', rewardExp: 140, rewardGold: 400, description: 'Luyện 2 Thỏi Thép Tinh Luyện nộp cho Vulcan.' },
  { id: 'PQ_SMITH_DAILY', name: 'Daily Garrison Forge', nameVi: 'Nhiệm Vụ Ngày: Rèn Thép Thành Trì', professionId: 'blacksmith', npcId: 'NPC_BLACKSMITH_MASTER', questKind: 'daily', requiredMastery: 1, requiredItemId: 'MAT_PROF_IRON_INGOT', requiredQty: 2, requiredActionType: 'deliver', rewardExp: 190, rewardGold: 650, description: 'Giao 2 Thỏi Thép phục vụ trang bị phòng thủ.' },
  { id: 'PQ_SMITH_MASTERY_ADV', name: 'Masterwork Blade Trial', nameVi: 'Thử Thách Rèn Kiếm Chuyên Gia', professionId: 'blacksmith', npcId: 'NPC_BLACKSMITH_MASTER', questKind: 'mastery_advancement', requiredMastery: 15, requiredItemId: 'PROF_ITEM_STEEL_SWORD', requiredQty: 1, requiredActionType: 'deliver', rewardExp: 420, rewardGold: 1500, unlocksRecipeId: 'REC_SMITH_STEEL_SWORD', description: 'Rèn Trường Kiếm Thép Elysia hoàn chỉnh giao cho Vulcan thẩm định.' },
  { id: 'PQ_SMITH_SPECIAL', name: 'Royal Seal Metallurgy', nameVi: 'Nhiệm Vụ Đặc Biệt: Đúc Ấn Lập Bang', professionId: 'blacksmith', npcId: 'NPC_BLACKSMITH_MASTER', questKind: 'special', requiredMastery: 25, requiredItemId: 'MAT_PROF_IRON_INGOT', requiredQty: 5, requiredActionType: 'deliver', rewardExp: 600, rewardGold: 2600, unlocksRecipeId: 'REC_SMITH_GUILD_SEAL', description: 'Chuyển giao thép tinh cho Vương Đô để được phép đúc Ấn Ký Bang Hội.' },
  { id: 'PQ_SMITH_HIDDEN_LEGEND', name: 'Heart of Ignis Forge', nameVi: 'Lò Rèn Tim Rồng (Ẩn)', professionId: 'blacksmith', npcId: 'NPC_BLACKSMITH_MASTER', questKind: 'hidden_legendary', requiredMastery: 55, requiredItemId: 'MAT_DRAGON_HEART', requiredQty: 1, requiredActionType: 'deliver', rewardExp: 1100, rewardGold: 8000, unlocksRecipeId: 'REC_SMITH_DRAGON_BLADE', unlocksProfessionSlot: true, description: 'Dâng Tim Rồng Ignis cho Vulcan để mở khóa Long Diệm Thần Kiếm.' },

  // 3. Alchemist / Jeweler
  { id: 'PQ_ALCH_INTRO', name: 'Alchemical Resonance', nameVi: 'Cộng Hưởng Giả Kim', professionId: 'alchemist_jeweler', npcId: 'NPC_ALCHEMIST_MASTER', questKind: 'intro', requiredMastery: 1, requiredItemId: 'ITEM_UPGRADE_STONE_BASIC', requiredQty: 1, requiredActionType: 'deliver', rewardExp: 140, rewardGold: 450, description: 'Luyện 1 Đá Cường Hóa Sơ Cấp cho Vesper.' },
  { id: 'PQ_ALCH_DAILY', name: 'Daily Crystal Calibration', nameVi: 'Nhiệm Vụ Ngày: Tinh Luyện Đá Ma Pháp', professionId: 'alchemist_jeweler', npcId: 'NPC_ALCHEMIST_MASTER', questKind: 'daily', requiredMastery: 1, requiredItemId: 'ITEM_UPGRADE_STONE_BASIC', requiredQty: 1, requiredActionType: 'deliver', rewardExp: 185, rewardGold: 700, description: 'Cung cấp Đá Cường Hóa hàng ngày cho Hội Giả Kim.' },
  { id: 'PQ_ALCH_MASTERY_ADV', name: 'Jeweler Resonance Certification', nameVi: 'Thăng Cấp Nghệ Nhân Kim Hoàn', professionId: 'alchemist_jeweler', npcId: 'NPC_ALCHEMIST_MASTER', questKind: 'mastery_advancement', requiredMastery: 25, requiredItemId: 'PROF_ITEM_STAR_RING', requiredQty: 1, requiredActionType: 'deliver', rewardExp: 450, rewardGold: 1800, unlocksRecipeId: 'REC_ALCH_AMETHYST_RING', description: 'Chế tác Nhẫn Ánh Trăng Tinh Tú đạt chuẩn Chuyên Gia Vesper.' },
  { id: 'PQ_ALCH_SPECIAL', name: 'Merchant Charter Engraving', nameVi: 'Nhiệm Vụ Đặc Biệt: Ấn Ký Thương Hội', professionId: 'alchemist_jeweler', npcId: 'NPC_ALCHEMIST_MASTER', questKind: 'special', requiredMastery: 22, requiredItemId: 'MAT_PROF_MITHRIL_ORE', requiredQty: 3, requiredActionType: 'deliver', rewardExp: 580, rewardGold: 2400, unlocksRecipeId: 'REC_ALCH_MERCHANT_SEAL', description: 'Lĩnh ngộ kỹ nghệ khắc Ấn Hiệp Hội Thương Nhân cho bang đoàn.' },
  { id: 'PQ_ALCH_HIDDEN_LEGEND', name: 'Crown of the Void', nameVi: 'Hộ Phù Hư Không Bí Truyền (Ẩn)', professionId: 'alchemist_jeweler', npcId: 'NPC_ALCHEMIST_MASTER', questKind: 'hidden_legendary', requiredMastery: 52, requiredItemId: 'MAT_ABYSSAL_CORE', requiredQty: 1, requiredActionType: 'deliver', rewardExp: 1050, rewardGold: 7500, unlocksRecipeId: 'REC_ALCH_ABYSSAL_NECKLACE', description: 'Khám phá tinh thể Hư Không để mở công thức Hộ Phù Hư Không.' },

  // 4. Miner
  { id: 'PQ_MINER_INTRO', name: 'Iron Vein Appraisal', nameVi: 'Thăm Dò Mạch Sắt', professionId: 'miner', npcId: 'NPC_MINING_SUPERVISOR', questKind: 'intro', requiredMastery: 1, requiredItemId: 'MAT_PROF_IRON_ORE', requiredQty: 3, requiredActionType: 'deliver', rewardExp: 120, rewardGold: 320, description: 'Đào 3 Quặng Sắt Thô nộp Torin.' },
  { id: 'PQ_MINER_DAILY', name: 'Daily Ore Quota', nameVi: 'Nhiệm Vụ Ngày: Chỉ Tiêu Hầm Mỏ', professionId: 'miner', npcId: 'NPC_MINING_SUPERVISOR', questKind: 'daily', requiredMastery: 1, requiredItemId: 'MAT_PROF_IRON_ORE', requiredQty: 4, requiredActionType: 'deliver', rewardExp: 170, rewardGold: 520, description: 'Nộp 4 Quặng Sắt cho tổ công binh.' },
  { id: 'PQ_MINER_MASTERY_ADV', name: 'Deep Vein Mithril Certification', nameVi: 'Thăng Cấp Chuyên Gia Mạch Sâu', professionId: 'miner', npcId: 'NPC_MINING_SUPERVISOR', questKind: 'mastery_advancement', requiredMastery: 20, requiredItemId: 'MAT_PROF_MITHRIL_ORE', requiredQty: 3, requiredActionType: 'deliver', rewardExp: 400, rewardGold: 1350, unlocksRecipeId: 'REC_MINER_CORE_REFINEMENT', description: 'Khai thác Quặng Mithril Tinh Khiết đạt chứng nhận Đốc Công Torin.' },
  { id: 'PQ_MINER_SPECIAL', name: 'Celestial Geode Discovery', nameVi: 'Nhiệm Vụ Đặc Biệt: Pha Lê Thung Lũng Rồng', professionId: 'miner', npcId: 'NPC_MINING_SUPERVISOR', questKind: 'special', requiredMastery: 35, requiredItemId: 'PROF_ITEM_MITHRIL_BAR', requiredQty: 2, requiredActionType: 'deliver', rewardExp: 560, rewardGold: 2200, description: 'Cung cấp Thanh Mithril Tinh Khiết gia cố hệ thống mỏ biên giới.' },
  { id: 'PQ_MINER_HIDDEN_LEGEND', name: 'Starforge Ore Mystery', nameVi: 'Bí Ẩn Hợp Kim Tinh Tú (Ẩn)', professionId: 'miner', npcId: 'NPC_MINING_SUPERVISOR', questKind: 'hidden_legendary', requiredMastery: 48, requiredItemId: 'MAT_DRAGON_HEART', requiredQty: 1, requiredActionType: 'deliver', rewardExp: 920, rewardGold: 5200, unlocksRecipeId: 'REC_MINER_STARFORGE_CORE', description: 'Mang Tim Rồng cho Torin để học cách nung Pha Lê Tinh Tú thành Hợp Kim Thần Lò.' },

  // 5. Farmer
  { id: 'PQ_FARMER_INTRO', name: 'First Sprouts of Elysia', nameVi: 'Mầm Xanh Đầu Mùa', professionId: 'farmer', npcId: 'NPC_FARMER_MASTER', questKind: 'intro', requiredMastery: 1, requiredItemId: 'MAT_PROF_WHEAT', requiredQty: 2, requiredActionType: 'deliver', rewardExp: 120, rewardGold: 280, description: 'Trồng và thu hoạch 2 Lúa Mì Nắng Mai.' },
  { id: 'PQ_FARMER_DAILY', name: 'Daily Granary Harvest', nameVi: 'Nhiệm Vụ Ngày: Đong Đầy Kho Thóc', professionId: 'farmer', npcId: 'NPC_FARMER_MASTER', questKind: 'daily', requiredMastery: 1, requiredItemId: 'MAT_PROF_WHEAT', requiredQty: 3, requiredActionType: 'deliver', rewardExp: 155, rewardGold: 480, description: 'Giao 3 Lúa Mì Nắng Mai cho Nông Trại.' },
  { id: 'PQ_FARMER_MASTERY_ADV', name: 'Golden Orchard Cultivation', nameVi: 'Thăng Cấp Chuyên Gia Vườn Táo Vàng', professionId: 'farmer', npcId: 'NPC_FARMER_MASTER', questKind: 'mastery_advancement', requiredMastery: 15, requiredItemId: 'MAT_PROF_GOLDEN_APPLE', requiredQty: 2, requiredActionType: 'deliver', rewardExp: 380, rewardGold: 1150, description: 'Thu hoạch Táo Vàng Elysia cho Hana để nâng hạng Nông Phu Chuyên Gia.' },
  { id: 'PQ_FARMER_SPECIAL', name: 'Flour Mill Supply Route', nameVi: 'Nhiệm Vụ Đặc Biệt: Kho Lương Thương Hội', professionId: 'farmer', npcId: 'NPC_FARMER_MASTER', questKind: 'special', requiredMastery: 25, requiredItemId: 'PROF_ITEM_FLOUR_SACK', requiredQty: 3, requiredActionType: 'deliver', rewardExp: 500, rewardGold: 1900, description: 'Xay nghiền 3 Bao Bột Mì Tinh Sạch cung ứng hậu cần đoàn thám hiểm.' },
  { id: 'PQ_FARMER_HIDDEN_LEGEND', name: 'World-Tree Seed Secret', nameVi: 'Giống Thần Quả Cây Thế Giới (Ẩn)', professionId: 'farmer', npcId: 'NPC_FARMER_MASTER', questKind: 'hidden_legendary', requiredMastery: 48, requiredItemId: 'MAT_TREANT_CORE', requiredQty: 1, requiredActionType: 'deliver', rewardExp: 880, rewardGold: 4800, unlocksRecipeId: 'REC_FARMER_CELESTIAL_SEED', description: 'Đưa Lõi Cổ Thụ Boss cho Hana để lĩnh ngộ công thức Ươm Quả Thần Bất Diệt.' },

  // 6. Fisherman
  { id: 'PQ_FISH_INTRO', name: 'Patience at the Pier', nameVi: 'Kiên Nhẫn Bên Bến Suối', professionId: 'fisherman', npcId: 'NPC_FISHERMAN_MASTER', questKind: 'intro', requiredMastery: 1, requiredItemId: 'MAT_PROF_CARP', requiredQty: 2, requiredActionType: 'deliver', rewardExp: 125, rewardGold: 320, description: 'Câu 2 Cá Chép Suối Bạc giao cho Ngư Phủ Kai.' },
  { id: 'PQ_FISH_DAILY', name: 'Daily Catch for the Kitchen', nameVi: 'Nhiệm Vụ Ngày: Mẻ Cá Tươi Sớm', professionId: 'fisherman', npcId: 'NPC_FISHERMAN_MASTER', questKind: 'daily', requiredMastery: 1, requiredItemId: 'MAT_PROF_CARP', requiredQty: 3, requiredActionType: 'deliver', rewardExp: 165, rewardGold: 510, description: 'Mang 3 Cá Chép Suối Bạc tươi về cho cảng cá.' },
  { id: 'PQ_FISH_MASTERY_ADV', name: 'Moonwater Angler Certification', nameVi: 'Thăng Cấp Chuyên Gia Hồ Ánh Trăng', professionId: 'fisherman', npcId: 'NPC_FISHERMAN_MASTER', questKind: 'mastery_advancement', requiredMastery: 25, requiredItemId: 'MAT_PROF_MOON_SALMON', requiredQty: 2, requiredActionType: 'deliver', rewardExp: 410, rewardGold: 1400, description: 'Câu Cá Hồi Nguyệt Thủy giao cho Kai để đạt bậc Chuyên Gia.' },
  { id: 'PQ_FISH_SPECIAL', name: 'Aquatic Essence Refinery', nameVi: 'Nhiệm Vụ Đặc Biệt: Tinh Dầu Cảng Biển', professionId: 'fisherman', npcId: 'NPC_FISHERMAN_MASTER', questKind: 'special', requiredMastery: 30, requiredItemId: 'PROF_ITEM_FISH_OIL', requiredQty: 3, requiredActionType: 'deliver', rewardExp: 520, rewardGold: 2000, description: 'Tinh luyện Tinh Dầu Cá phục vụ đội Giả Kim Sư.' },
  { id: 'PQ_FISH_HIDDEN_LEGEND', name: 'Secrets of the Deep Pearl', nameVi: 'Bí Ẩn Long Ngư Biển Sâu (Ẩn)', professionId: 'fisherman', npcId: 'NPC_FISHERMAN_MASTER', questKind: 'hidden_legendary', requiredMastery: 48, requiredItemId: 'MAT_HYDRA_SCALE', requiredQty: 1, requiredActionType: 'deliver', rewardExp: 900, rewardGold: 5100, unlocksRecipeId: 'REC_FISH_ABYSSAL_ELIXIR', description: 'Mang Vảy Thủy Quái Mặt Trăng về cho Kai để mở công thức Tinh Chất Long Ngư.' },

  // 7. Woodcutter
  { id: 'PQ_WOOD_INTRO', name: 'Timber for the Village', nameVi: 'Đốn Gỗ Dựng Trại', professionId: 'woodcutter', npcId: 'NPC_LUMBERJACK_MASTER', questKind: 'intro', requiredMastery: 1, requiredItemId: 'MAT_PROF_OAK_TIMBER', requiredQty: 3, requiredActionType: 'deliver', rewardExp: 120, rewardGold: 300, description: 'Đốn 3 Gỗ Sồi giao cho Garrick.' },
  { id: 'PQ_WOOD_DAILY', name: 'Daily Fortress Lumber', nameVi: 'Nhiệm Vụ Ngày: Gỗ Gia Cố Thành', professionId: 'woodcutter', npcId: 'NPC_LUMBERJACK_MASTER', questKind: 'daily', requiredMastery: 1, requiredItemId: 'MAT_PROF_OAK_TIMBER', requiredQty: 4, requiredActionType: 'deliver', rewardExp: 160, rewardGold: 490, description: 'Cung cấp gỗ sồi xây dựng Bang Hội.' },
  { id: 'PQ_WOOD_MASTERY_ADV', name: 'Sylvaris Spiritwood Certification', nameVi: 'Thăng Cấp Chuyên Gia Rừng Cổ Thụ', professionId: 'woodcutter', npcId: 'NPC_LUMBERJACK_MASTER', questKind: 'mastery_advancement', requiredMastery: 21, requiredItemId: 'MAT_PROF_ELDERWOOD', requiredQty: 2, requiredActionType: 'deliver', rewardExp: 390, rewardGold: 1300, description: 'Thu hoạch Gỗ Cổ Thụ Tinh Linh tại Rừng Tinh Linh nộp cho Garrick.' },
  { id: 'PQ_WOOD_SPECIAL', name: 'Guild Hall Timber Shipment', nameVi: 'Nhiệm Vụ Đặc Biệt: Ván Gỗ Sảnh Bang', professionId: 'woodcutter', npcId: 'NPC_LUMBERJACK_MASTER', questKind: 'special', requiredMastery: 28, requiredItemId: 'PROF_ITEM_OAK_PLANK', requiredQty: 4, requiredActionType: 'deliver', rewardExp: 510, rewardGold: 1950, description: 'Chuẩn bị ván gỗ xây dựng cho Công Thành & Pháo Đài.' },
  { id: 'PQ_WOOD_HIDDEN_LEGEND', name: 'Heartwood of Yggdrasil', nameVi: 'Lõi Gỗ Cây Thế Giới (Ẩn)', professionId: 'woodcutter', npcId: 'NPC_LUMBERJACK_MASTER', questKind: 'hidden_legendary', requiredMastery: 48, requiredItemId: 'MAT_TREANT_CORE', requiredQty: 1, requiredActionType: 'deliver', rewardExp: 910, rewardGold: 5000, unlocksRecipeId: 'REC_WOOD_YGGDRASIL_BEAM', description: 'Đưa Lõi Cổ Thụ Boss cho Garrick để mở khóa kỹ nghệ Đẽo Xà Gỗ Thế Giới.' },

  // 8. Chef
  { id: 'PQ_CHEF_INTRO', name: 'Warm Hearth Loaf', nameVi: 'Mẻ Bánh Đầu Tay', professionId: 'chef', npcId: 'NPC_CHEF_MASTER', questKind: 'intro', requiredMastery: 1, requiredItemId: 'PROF_ITEM_HONEY_BREAD', requiredQty: 2, requiredActionType: 'deliver', rewardExp: 130, rewardGold: 340, description: 'Nướng 2 Bánh Mì Mật Ong cho Bếp Trưởng Mei.' },
  { id: 'PQ_CHEF_DAILY', name: 'Daily Tavern Service', nameVi: 'Nhiệm Vụ Ngày: Thực Đơn Tửu Quán', professionId: 'chef', npcId: 'NPC_CHEF_MASTER', questKind: 'daily', requiredMastery: 1, requiredItemId: 'PROF_ITEM_HONEY_BREAD', requiredQty: 3, requiredActionType: 'deliver', rewardExp: 170, rewardGold: 560, description: 'Cung cấp bánh mì nóng cho đoàn lữ hành.' },
  { id: 'PQ_CHEF_MASTERY_ADV', name: 'Royal Gastronomy Trial', nameVi: 'Thăng Cấp Chuyên Gia Mỹ Vị', professionId: 'chef', npcId: 'NPC_CHEF_MASTER', questKind: 'mastery_advancement', requiredMastery: 14, requiredItemId: 'PROF_ITEM_CARP_STEW', requiredQty: 2, requiredActionType: 'deliver', rewardExp: 380, rewardGold: 1250, unlocksRecipeId: 'REC_CHEF_CARP_SOUP', description: 'Nấu 2 phần Canh Cá Chép Suối Bạc chuẩn vị cho Bếp Trưởng Mei.' },
  { id: 'PQ_CHEF_SPECIAL', name: 'Dungeon Raid Catering', nameVi: 'Nhiệm Vụ Đặc Biệt: Tiệc Ra Quân Boss', professionId: 'chef', npcId: 'NPC_CHEF_MASTER', questKind: 'special', requiredMastery: 28, requiredItemId: 'PROF_ITEM_CARP_STEW', requiredQty: 3, requiredActionType: 'deliver', rewardExp: 540, rewardGold: 2150, unlocksProfessionSlot: true, description: 'Chuẩn bị thực đơn tăng công lực cho Bang Hội; thưởng thêm +1 ô Nghề!' },
  { id: 'PQ_CHEF_HIDDEN_LEGEND', name: 'Royal Banquet Mastery', nameVi: 'Đại Tiệc Cung Đình (Ẩn)', professionId: 'chef', npcId: 'NPC_CHEF_MASTER', questKind: 'hidden_legendary', requiredMastery: 50, requiredItemId: 'MAT_HYDRA_SCALE', requiredQty: 1, requiredActionType: 'deliver', rewardExp: 920, rewardGold: 5500, unlocksRecipeId: 'REC_CHEF_ROYAL_BANQUET', description: 'Mang Vảy Thủy Quái Mặt Trăng về cho Mei để nhận công thức Đại Tiệc Hoàng Gia.' },
];

export function computeProfessionExpRequired(level: number): number {
  const lv = Math.max(1, Math.min(70, Math.floor(level)));
  return Math.round(90 + lv * 35 + Math.pow(lv, 1.45) * 14);
}

export function getProfessionRankForLevel(level: number): ProfessionRankThreshold {
  const lv = Math.max(1, Math.min(70, Math.floor(level)));
  return (
    PROFESSION_MASTERY_RANKS.find((r) => lv >= r.minLevel && lv <= r.maxLevel) ||
    PROFESSION_MASTERY_RANKS[0]
  );
}

/**
 * Diminishing Mastery EXP when crafting low-level recipes at high Mastery,
 * plus soft decay after repeating the exact same recipe >25 times.
 */
export function computeDiminishingCraftExp(
  baseExp: number,
  masteryLevel: number,
  recipeRequiredMastery: number,
  sameRecipeCount = 0
): number {
  const gap = masteryLevel - recipeRequiredMastery;
  let mult = 1.0;
  if (gap >= 15) mult = 0.1;
  else if (gap >= 10) mult = 0.35;
  else if (gap >= 5) mult = 0.65;

  if (sameRecipeCount >= 40) mult *= 0.6;
  else if (sameRecipeCount >= 20) mult *= 0.8;

  return Math.max(1, Math.round(baseExp * mult));
}

export function computeCraftProbabilities(params: {
  masteryLevel: number;
  recipeRequiredMastery: number;
  baseSuccessRatePct: number;
  baseExtraYieldChancePct: number;
  toolQualityBonusPct?: number;
  toolExtraYieldBonusPct?: number;
  materialQualityBonusPct?: number;
  guildOrBuffQualityBonusPct?: number;
}): {
  successProbabilityPct: number;
  extraYieldProbabilityPct: number;
  qualityProbabilities: Record<ItemQuality, number>;
} {
  const rank = getProfessionRankForLevel(params.masteryLevel);
  const masteryEdge = Math.max(0, params.masteryLevel - params.recipeRequiredMastery);
  const successProbabilityPct = Number(
    Math.min(99, Math.max(25, params.baseSuccessRatePct + masteryEdge * 0.6)).toFixed(1)
  );
  const extraYieldProbabilityPct = Number(
    Math.min(
      62,
      Math.max(
        2,
        params.baseExtraYieldChancePct +
          rank.extraYieldBonusPct +
          Number(params.toolExtraYieldBonusPct || 0) +
          masteryEdge * 0.25
      )
    ).toFixed(1)
  );

  const qBonus =
    rank.qualityBonusPct +
    Number(params.toolQualityBonusPct || 0) +
    Number(params.materialQualityBonusPct || 0) +
    Number(params.guildOrBuffQualityBonusPct || 0) +
    masteryEdge * 0.4;

  const rawLeg = Math.min(14, Math.max(0.5, qBonus * 0.14));
  const rawEpic = Math.min(26, Math.max(2, qBonus * 0.32));
  const rawRare = Math.min(35, Math.max(8, 5 + qBonus * 0.55));
  const rawUnc = Math.min(42, Math.max(15, 14 + qBonus * 0.7));

  const legendary = Number(rawLeg.toFixed(1));
  const epic = Number(Math.min(100 - legendary, rawEpic).toFixed(1));
  const rare = Number(Math.min(100 - legendary - epic, rawRare).toFixed(1));
  const uncommon = Number(Math.min(100 - legendary - epic - rare, rawUnc).toFixed(1));
  const common = Number(Math.max(0, 100 - legendary - epic - rare - uncommon).toFixed(1));

  return {
    successProbabilityPct,
    extraYieldProbabilityPct,
    qualityProbabilities: {
      common,
      uncommon,
      rare,
      epic,
      legendary,
    },
  };
}

export function rollCraftQualityAndYield(params: {
  masteryLevel: number;
  recipeRequiredMastery: number;
  baseSuccessRatePct: number;
  baseExtraYieldChancePct: number;
  maxExtraYieldQty: number;
  toolQualityBonusPct: number;
  toolExtraYieldBonusPct: number;
  materialQualityBonusPct?: number;
  guildOrBuffQualityBonusPct?: number;
  randFn?: () => number;
}): {
  success: boolean;
  quality: ItemQuality;
  extraYield: number;
  successProbabilityPct: number;
  extraYieldProbabilityPct: number;
} {
  const rnd = params.randFn || Math.random;
  const probs = computeCraftProbabilities(params);
  const success = rnd() * 100 <= probs.successProbabilityPct;
  if (!success) {
    return {
      success: false,
      quality: 'common',
      extraYield: 0,
      successProbabilityPct: probs.successProbabilityPct,
      extraYieldProbabilityPct: 0,
    };
  }

  // Never guarantee maximum production on every craft: capped strictly below 65%
  let extraYield = 0;
  if (params.maxExtraYieldQty > 0 && rnd() * 100 < probs.extraYieldProbabilityPct) {
    extraYield = 1;
    if (params.maxExtraYieldQty >= 2 && rnd() < 0.32) {
      extraYield = 2;
    }
  }

  const { legendary, epic, rare, uncommon } = probs.qualityProbabilities;
  const roll = rnd() * 100;
  let quality: ItemQuality = 'common';
  if (roll < legendary) quality = 'legendary';
  else if (roll < legendary + epic) quality = 'epic';
  else if (roll < legendary + epic + rare) quality = 'rare';
  else if (roll < legendary + epic + rare + uncommon) quality = 'uncommon';

  return {
    success: true,
    quality,
    extraYield,
    successProbabilityPct: probs.successProbabilityPct,
    extraYieldProbabilityPct: probs.extraYieldProbabilityPct,
  };
}

export const QUALITY_TIER_ORDER: Record<ItemQuality, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 5,
};
