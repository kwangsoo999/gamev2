import {
  CaravanRouteDefinition,
  GuildBuildingState,
  GuildRankConfig,
  GuildSkillState,
  MerchantPermission,
  MerchantSupplyContract,
  TerritoryDefinition,
} from '@elysia/game-types';

export const GUILD_SYSTEM_CONFIG = {
  requiredLevel: 30,
  creationGoldCost: 500000,
  requiredSealItemId: 'ITEM_GUILD_CREATION_SEAL',
  minFoundingMembers: 5,
  maxLevel: 10,
  baseMemberCapacity: 25,
  capacityPerLevel: 5,
  baseStorageCapacity: 40,
  storageCapacityPerVaultLevel: 20,
  warDurationSec: 1800,
};

export const GUILD_LEVEL_EXP_TABLE: Array<{ level: number; requiredExp: number }> = Array.from({ length: 10 }, (_, idx) => {
  const level = idx + 1;
  return {
    level,
    requiredExp: level === 10 ? 0 : Math.round(1200 * Math.pow(level, 1.55)),
  };
});

export const DEFAULT_GUILD_RANKS: GuildRankConfig[] = [
  {
    id: 'guild_master',
    name: 'Guild Master',
    nameVi: 'Bang Chủ',
    order: 1,
    permissions: [
      'INVITE_MEMBER',
      'KICK_MEMBER',
      'MANAGE_RANKS',
      'EDIT_ANNOUNCEMENT',
      'DEPOSIT_STORAGE',
      'WITHDRAW_STORAGE',
      'START_RESEARCH',
      'UPGRADE_BUILDING',
      'SUMMON_BOSS',
      'DECLARE_WAR',
      'MANAGE_TERRITORY',
      'WITHDRAW_TREASURY',
    ],
  },
  {
    id: 'vice_master',
    name: 'Vice Master',
    nameVi: 'Phó Bang Chủ',
    order: 2,
    permissions: [
      'INVITE_MEMBER',
      'KICK_MEMBER',
      'EDIT_ANNOUNCEMENT',
      'DEPOSIT_STORAGE',
      'WITHDRAW_STORAGE',
      'START_RESEARCH',
      'UPGRADE_BUILDING',
      'SUMMON_BOSS',
      'DECLARE_WAR',
      'MANAGE_TERRITORY',
    ],
  },
  {
    id: 'elder',
    name: 'Elder',
    nameVi: 'Trưởng Lão',
    order: 3,
    permissions: ['INVITE_MEMBER', 'EDIT_ANNOUNCEMENT', 'DEPOSIT_STORAGE', 'WITHDRAW_STORAGE', 'START_RESEARCH', 'SUMMON_BOSS'],
  },
  {
    id: 'officer',
    name: 'Officer',
    nameVi: 'Chấp Sự',
    order: 4,
    permissions: ['INVITE_MEMBER', 'DEPOSIT_STORAGE', 'WITHDRAW_STORAGE'],
  },
  {
    id: 'member',
    name: 'Member',
    nameVi: 'Thành Viên',
    order: 5,
    permissions: ['DEPOSIT_STORAGE'],
  },
];

export const DEFAULT_GUILD_BUILDINGS: GuildBuildingState[] = [
  { id: 'guild_hall', name: 'Elysia Guild Hall', nameVi: 'Đại Sảnh Bang Hội', level: 1, maxLevel: 5, effectDescription: 'Mở khóa giới hạn cấp kỹ năng Bang và tăng 5 sức chứa thành viên mỗi cấp.' },
  { id: 'training_ground', name: 'Martial Training Ground', nameVi: 'Diễn Võ Đường', level: 1, maxLevel: 5, effectDescription: 'Tăng ATK/DEF chiến đấu và sát thương đánh Boss Bang Hội.' },
  { id: 'vault_annex', name: 'Guild Treasury & Vault', nameVi: 'Bảo Khố Bang Hội', level: 1, maxLevel: 5, effectDescription: 'Mở rộng +20 ô Kho Bang Hội mỗi cấp và bảo vệ ngân khố.' },
  { id: 'alchemy_workshop', name: 'Artisan Synthesis Wing', nameVi: 'Công Xưởng Thủ Công', level: 1, maxLevel: 5, effectDescription: 'Tăng phẩm chất chế tạo và giảm chi phí nghiên cứu.' },
  { id: 'war_citadel', name: 'Sanctum Bastion', nameVi: 'Pháo Đài Bang Chiến', level: 1, maxLevel: 5, effectDescription: 'Tăng điểm phòng thủ Lãnh Thổ và phần thưởng Bang Chiến.' },
];

export const DEFAULT_GUILD_SKILLS: GuildSkillState[] = [
  { id: 'GSK_BLESSING_EXP', name: 'Scholarly Banner', nameVi: 'Hiệu Triệu Trí Tuệ (+EXP)', level: 0, maxLevel: 10, bonusPerLevelPct: 2, statKey: 'expBonusPct' },
  { id: 'GSK_VALOR_ATK', name: 'Oath of Valor', nameVi: 'Huyết Thệ Dũng Sĩ (+ATK/MATK)', level: 0, maxLevel: 10, bonusPerLevelPct: 2, statKey: 'atkPct' },
  { id: 'GSK_IRON_BASTION', name: 'Iron Bastion', nameVi: 'Thành Lũy Thép (+DEF/MDEF)', level: 0, maxLevel: 10, bonusPerLevelPct: 2, statKey: 'defPct' },
  { id: 'GSK_ARTISAN_GRACE', name: 'Artisan Aura', nameVi: 'Chúc Phúc Công Tượng (+Craft Quality)', level: 0, maxLevel: 10, bonusPerLevelPct: 2, statKey: 'craftQualityPct' },
  { id: 'GSK_HARVEST_BOUNTY', name: 'Harvest Blessing', nameVi: 'Mùa Màng Bội Thu (+Gather Yield)', level: 0, maxLevel: 10, bonusPerLevelPct: 3, statKey: 'gatherYieldPct' },
];

export const GUILD_QUEST_DEFINITIONS = [
  { id: 'GQ_DAILY_SUPPLY', name: 'Cung Ứng Lương Thảo Bang (Ngày)', kind: 'daily' as const, requiredContribTarget: 1, rewardGuildExp: 250, rewardContrib: 80, rewardGold: 400, description: 'Quyên góp Vàng hoặc vật phẩm nghề vào Kho Bang Hội.' },
  { id: 'GQ_DAILY_HUNT', name: 'Tuần Tra Biên Giới (Ngày)', kind: 'daily' as const, requiredContribTarget: 1, rewardGuildExp: 320, rewardContrib: 100, rewardGold: 600, description: 'Tham gia đẩy lùi quái vật khu vực lân cận hoặc tập trận Bang.' },
  { id: 'GQ_WEEKLY_BOSS', name: 'Chinh Phạt Boss Bang Hội (Tuần)', kind: 'weekly' as const, requiredContribTarget: 1, rewardGuildExp: 1400, rewardContrib: 450, rewardGold: 4500, description: 'Triệu hồi và gây sát thương lên Boss Thủ Hộ Bang Hội trong tuần.' },
  { id: 'GQ_WEEKLY_WAR', name: 'Chinh Chiến Bảo Vệ Danh Dự (Tuần)', kind: 'weekly' as const, requiredContribTarget: 1, rewardGuildExp: 1800, rewardContrib: 600, rewardGold: 6000, description: 'Tham dự tối thiểu 1 trận Bang Chiến hoặc Chiến Tranh Lãnh Thổ.' },
];

export const GUILD_BOSS_CATALOG = [
  { id: 'GBOSS_CRIMSON_COLOSSUS', name: 'Hộ Vệ Dung Nham Bang Hội', level: 35, maxHp: 25000, summonCostGold: 5000, rewardGuildExp: 900, rewardTreasuryGold: 15000 },
  { id: 'GBOSS_ETERNAL_DRAGON', name: 'Cổ Long Vĩnh Hằng Bang Hội', level: 55, maxHp: 75000, summonCostGold: 15000, rewardGuildExp: 2400, rewardTreasuryGold: 45000 },
];

export const MERCHANT_SYSTEM_CONFIG = {
  requiredLevel: 25,
  creationGoldCost: 300000,
  requiredSealItemId: 'ITEM_MERCHANT_SEAL',
  minFoundingMembers: 5,
  maxLevel: 10,
  baseWarehouseCapacity: 50,
};

export const MERCHANT_LEVEL_EXP_TABLE: Array<{ level: number; requiredExp: number }> = Array.from({ length: 10 }, (_, idx) => {
  const level = idx + 1;
  return {
    level,
    requiredExp: level === 10 ? 0 : Math.round(900 * Math.pow(level, 1.5)),
  };
});

export const DEFAULT_MERCHANT_RANKS: Array<{ id: string; nameVi: string; order: number; permissions: MerchantPermission[] }> = [
  {
    id: 'assoc_master',
    nameVi: 'Hội Trưởng Thương Hội',
    order: 1,
    permissions: ['INVITE_MEMBER', 'KICK_MEMBER', 'MANAGE_RANKS', 'MANAGE_WAREHOUSE', 'APPROVE_CONTRACT', 'LAUNCH_CARAVAN', 'WITHDRAW_TREASURY'],
  },
  {
    id: 'senior_broker',
    nameVi: 'Đại Thương Nhân',
    order: 2,
    permissions: ['INVITE_MEMBER', 'MANAGE_WAREHOUSE', 'APPROVE_CONTRACT', 'LAUNCH_CARAVAN'],
  },
  {
    id: 'caravan_captain',
    nameVi: 'Đội Trưởng Thương Đoàn',
    order: 3,
    permissions: ['MANAGE_WAREHOUSE', 'LAUNCH_CARAVAN', 'APPROVE_CONTRACT'],
  },
  {
    id: 'trader',
    nameVi: 'Hội Viên Buôn Bán',
    order: 4,
    permissions: ['MANAGE_WAREHOUSE'],
  },
];

export const CARAVAN_ROUTES: CaravanRouteDefinition[] = [
  { id: 'ROUTE_NOVICE_ELYSIA', name: 'Novice Village -> Elysia Capital', nameVi: 'Thôn Khởi Nguyên -> Vương Đô Elysia', fromMapId: 'THON_KHOI_NGUYEN', toMapId: 'city_elysia_capital', requiredMerchantLevel: 1, durationMs: 3000, capitalCostGold: 2000, payoutGold: 3200, payoutReputation: 45, payoutMerchantExp: 180, riskLevel: 'low', taxTerritoryId: 'TERR_GREENWOOD_HERB_VALE' },
  { id: 'ROUTE_ELYSIA_SYLVARIS', name: 'Elysia Capital -> Sylvaris Canopy', nameVi: 'Vương Đô -> Thành Rừng Sylvaris', fromMapId: 'city_elysia_capital', toMapId: 'city_sylvaris', requiredMerchantLevel: 2, durationMs: 4500, capitalCostGold: 6000, payoutGold: 9800, payoutReputation: 95, payoutMerchantExp: 340, riskLevel: 'medium', taxTerritoryId: 'TERR_SYLVARIS_FOREST' },
  { id: 'ROUTE_MOONLIT_PORT', name: 'Sylvaris -> Moonlit Trade Station', nameVi: 'Sylvaris -> Thương Cảng Ánh Trăng', fromMapId: 'city_sylvaris', toMapId: 'map_moonlit_lake', requiredMerchantLevel: 3, durationMs: 6000, capitalCostGold: 12000, payoutGold: 19800, payoutReputation: 160, payoutMerchantExp: 520, riskLevel: 'medium', taxTerritoryId: 'TERR_MOONLIT_TRADE' },
  { id: 'ROUTE_DRAKHEN_IRON', name: 'Ironpeak -> Drakhen Bastion', nameVi: 'Tiền Đồn Sắt -> Pháo Đài Drakhen', fromMapId: 'map_ember_canyon', toMapId: 'city_drakhen', requiredMerchantLevel: 5, durationMs: 8000, capitalCostGold: 25000, payoutGold: 42500, payoutReputation: 310, payoutMerchantExp: 900, riskLevel: 'high', taxTerritoryId: 'TERR_DRAKHEN_CITADEL' },
];

export const INITIAL_SUPPLY_CONTRACT_TEMPLATES: Omit<MerchantSupplyContract, 'id' | 'status' | 'deliveredQty' | 'createdAt'>[] = [
  { title: 'Đơn Thu Mua Lá Dược Thảo (Herbalist)', contractKind: 'material_supply', issuerType: 'npc', issuerId: 'NPC_HERBALIST_MASTER', issuerName: 'Dược Sư Lyra', professionId: 'herbalist', requiredItemId: 'MAT_PROF_HERB_GREEN', requiredItemName: 'Lá Dược Thảo Đồng Xanh', minQuality: 'common', requiredQty: 6, rewardGold: 420, rewardReputation: 35, rewardMerchantExp: 120 },
  { title: 'Hợp Đồng Cung Ứng Dược Phẩm Vương Đô', contractKind: 'potion_supply', issuerType: 'npc', issuerId: 'NPC_ALCHEMIST_MASTER', issuerName: 'Tổng Quản Quân Y', professionId: 'herbalist', requiredItemId: 'ITEM_POTION_HP_SMALL', requiredItemName: 'Bình Sinh Lực Nhỏ', minQuality: 'common', requiredQty: 4, rewardGold: 680, rewardReputation: 50, rewardMerchantExp: 160 },
  { title: 'Đơn Hàng Đúc Kiếm Thép Elysia (Blacksmith)', contractKind: 'equipment_order', issuerType: 'guild', issuerId: 'SYS_GARRISON', issuerName: 'Vệ Binh Vương Đô', professionId: 'blacksmith', requiredItemId: 'PROF_ITEM_STEEL_SWORD', requiredItemName: 'Trường Kiếm Thép Elysia', minQuality: 'uncommon', requiredQty: 1, rewardGold: 1850, rewardReputation: 110, rewardMerchantExp: 320 },
  { title: 'Hợp Đồng Thực Phẩm Quân Nhu (Chef)', contractKind: 'food_supply', issuerType: 'npc', issuerId: 'NPC_CHEF_MASTER', issuerName: 'Quản Lý Tửu Quán', professionId: 'chef', requiredItemId: 'PROF_ITEM_HONEY_BREAD', requiredItemName: 'Bánh Mì Nướng Ấm (+8% EXP)', minQuality: 'common', requiredQty: 5, rewardGold: 590, rewardReputation: 45, rewardMerchantExp: 150 },
  { title: 'Đơn Đặt Hàng Số Lượng Lớn Gỗ Xây Thành (Guild Bulk)', contractKind: 'guild_bulk_procurement', issuerType: 'guild', issuerId: 'SYS_BUILD_CORPS', issuerName: 'Hội Kiến Thiết Bang Hội', professionId: 'woodcutter', requiredItemId: 'PROF_ITEM_OAK_PLANK', requiredItemName: 'Ván Gỗ Sồi Gia Cố', minQuality: 'common', requiredQty: 8, rewardGold: 950, rewardReputation: 75, rewardMerchantExp: 240 },
  { title: 'Đơn Cung Cấp Đá Cường Hóa Giả Kim (Alchemist)', contractKind: 'material_supply', issuerType: 'merchant_association', issuerId: 'SYS_MERCHANT_HALL', issuerName: 'Phòng Giao Dịch Đá Quý', professionId: 'alchemist_jeweler', requiredItemId: 'ITEM_UPGRADE_STONE_BASIC', requiredItemName: 'Đá Cường Hóa Sơ Cấp', minQuality: 'common', requiredQty: 3, rewardGold: 1400, rewardReputation: 90, rewardMerchantExp: 280 },
];

export const TERRITORY_DEFINITIONS: TerritoryDefinition[] = [
  { id: 'TERR_GREENWOOD_HERB_VALE', name: 'Greenwood Herb Vale', nameVi: 'Thung Lũng Dược Thảo Lục Bảo', mapId: 'map_whispering_meadow', territoryType: 'herb_vale', maxTaxRatePct: 10, baseCaptureDefense: 1000, publicDailyGatherQuota: 40, bonusYieldForOwnerPct: 20, npcStewardName: 'Quan Quản Lý Dược Viên Sera', description: 'Vùng thảo mộc trù phú. Người chơi tự do vẫn hái được tới 40 lượt/ngày; Bang chủ sở hữu nhận thuế giao dịch và +20% sản lượng.' },
  { id: 'TERR_IRONPEAK_OUTPOST', name: 'Ironpeak Mining Outpost', nameVi: 'Tiền Đồn Khai Mỏ Thiết Phong', mapId: 'map_ember_canyon', territoryType: 'mining_outpost', maxTaxRatePct: 10, baseCaptureDefense: 1500, publicDailyGatherQuota: 40, bonusYieldForOwnerPct: 25, npcStewardName: 'Đốc Công Mỏ Thép Borin', description: 'Mỏ quặng sắt và Mithril chiến lược. Bảo đảm hạn mức khai thác công cộng chống độc quyền.' },
  { id: 'TERR_SYLVARIS_FOREST', name: 'Sylvaris Timber Outpost', nameVi: 'Trạm Lâm Nghiệp Cổ Thụ Sylvaris', mapId: 'map_spirit_forest', territoryType: 'forest_outpost', maxTaxRatePct: 10, baseCaptureDefense: 1400, publicDailyGatherQuota: 40, bonusYieldForOwnerPct: 20, npcStewardName: 'Kiểm Lâm Trưởng Elowen', description: 'Khu rừng cổ mộc phục vụ đốn gỗ xây dựng Sảnh Bang Hội.' },
  { id: 'TERR_MOONLIT_TRADE', name: 'Moonlit Harbor Trade Station', nameVi: 'Thương Trạm Cảng Ánh Trăng', mapId: 'map_moonlit_lake', territoryType: 'trade_station', maxTaxRatePct: 8, baseCaptureDefense: 1800, publicDailyGatherQuota: 50, bonusYieldForOwnerPct: 20, npcStewardName: 'Thương Quan Cảng Lune', description: 'Đầu mối trung chuyển thủy sản và tuyến đoàn xe thương buôn.' },
  { id: 'TERR_DRAKHEN_CITADEL', name: 'Drakhen Obsidian Citadel', nameVi: 'Thành Trì Hắc Diện Thạch Drakhen', mapId: 'map_dragon_valley', territoryType: 'citadel', maxTaxRatePct: 10, baseCaptureDefense: 2500, publicDailyGatherQuota: 35, bonusYieldForOwnerPct: 30, npcStewardName: 'Tướng Quân Thủ Thành Vael', description: 'Lãnh thổ tối thượng giàu Pha Lê Tinh Tú và tuyến thương buôn mạo hiểm.' },
];

export const ORGANIZATION_AND_PROFESSION_ITEM_CATALOG: any[] = [
  { id: 'ITEM_GUILD_CREATION_SEAL', name: 'Guild Creation Seal', nameVi: 'Ấn Ký Lập Bang Hội', category: 'material', rarity: 'epic', iconKey: 'gem_amethyst', isTradable: true, stackable: false, price: 25000, description: 'Tín vật bắt buộc để thành lập Bang Hội (Yêu cầu Lv.30, 500.000G, 5 thành viên sáng lập).' },
  { id: 'ITEM_MERCHANT_SEAL', name: 'Merchant Association Seal', nameVi: 'Ấn Ký Hiệp Hội Thương Nhân', category: 'material', rarity: 'rare', iconKey: 'gem_amethyst', isTradable: true, stackable: false, price: 15000, description: 'Tín vật bắt buộc để thành lập Thương Hội (Yêu cầu Lv.25, 300.000G, 5 thành viên sáng lập).' },
  { id: 'PROF_ITEM_LEGEND_PANACEA', name: 'Treant Heart Panacea', nameVi: 'Linh Dược Thụ Thần (Legendary)', category: 'consumable', rarity: 'legendary', iconKey: 'potion_hp', hpRestore: 1200, isTradable: true, description: 'Thần dược hồi 1200 HP và gia tăng 18% Max HP.' },
  { id: 'PROF_ITEM_STEEL_SWORD', name: 'Elysia Steel Longsword', nameVi: 'Trường Kiếm Thép Elysia', category: 'equip', equipSlot: 'weapon', weaponType: 'sword', rarity: 'rare', iconKey: 'sword_novice', atkBonus: 36, isTradable: true, description: 'Thanh trường kiếm rèn tinh xảo bởi Thợ Rèn.' },
  { id: 'PROF_ITEM_DRAGON_BLADE', name: 'Ignis Dragonforge Blade', nameVi: 'Long Diệm Thần Kiếm', category: 'equip', equipSlot: 'weapon', weaponType: 'sword', rarity: 'legendary', iconKey: 'sword_novice', atkBonus: 98, critRate: 12, isTradable: true, description: 'Thần binh Truyền Thuyết đúc từ Tim Rồng.' },
  { id: 'PROF_ITEM_STAR_RING', name: 'Moonwater Star Ring', nameVi: 'Nhẫn Ánh Trăng Tinh Tú', category: 'equip', equipSlot: 'ring1', rarity: 'rare', iconKey: 'ring_band', matkBonus: 26, critRate: 6, isTradable: true, description: 'Nhẫn tinh tú chế tác từ Ngọc Trai & Mithril.' },
  { id: 'PROF_ITEM_ABYSSAL_AMULET', name: 'Abyssal Void Amulet', nameVi: 'Hộ Phù Hư Không', category: 'equip', equipSlot: 'necklace', rarity: 'legendary', iconKey: 'amulet_jade', atkBonus: 44, matkBonus: 44, defBonus: 24, isTradable: true, description: 'Bảo vật kim hoàn tối thượng từ Lõi Hư Không.' },
  { id: 'PROF_ITEM_HONEY_BREAD', name: 'Hearth Honey Bread', nameVi: 'Bánh Mì Nướng Ấm (+8% EXP)', category: 'consumable', rarity: 'uncommon', iconKey: 'bread_loaf', hpRestore: 140, isTradable: true, description: 'Hồi 140 HP và tăng +8% EXP trong 20 phút.' },
  { id: 'PROF_ITEM_CARP_STEW', name: 'Silver Brook Carp Stew', nameVi: 'Canh Cá Chép Suối Bạc', category: 'consumable', rarity: 'rare', iconKey: 'bread_loaf', hpRestore: 280, isTradable: true, description: 'Tăng +6% ATK/MATK trong 30 phút.' },
  { id: 'PROF_ITEM_ROYAL_FEAST', name: 'Royal Dragonfruit Banquet', nameVi: 'Đại Tiệc Hoàng Gia Elysia', category: 'consumable', rarity: 'legendary', iconKey: 'bread_loaf', hpRestore: 900, isTradable: true, description: 'Món đại tiệc hoàng gia tăng +20% EXP và +10% sức mạnh trong 60 phút.' },
  { id: 'PROF_ITEM_OAK_PLANK', name: 'Reinforced Oak Plank', nameVi: 'Ván Gỗ Sồi Gia Cố', category: 'material', rarity: 'common', iconKey: 'wood_oak', isTradable: true, stackable: true },
  { id: 'PROF_ITEM_MITHRIL_BAR', name: 'Pure Mithril Bar', nameVi: 'Thanh Mithril Tinh Khiết', category: 'material', rarity: 'rare', iconKey: 'ore_iron', isTradable: true, stackable: true },
  { id: 'PROF_ITEM_FLOUR_SACK', name: 'Fine Wheat Flour Sack', nameVi: 'Bao Bột Mì Tinh Sạch', category: 'material', rarity: 'common', iconKey: 'bread_loaf', isTradable: true, stackable: true },
  { id: 'PROF_ITEM_FISH_OIL', name: 'Refined Fish Oil Essence', nameVi: 'Tinh Dầu Cá Thủy Tinh', category: 'material', rarity: 'uncommon', iconKey: 'potion_mp', isTradable: true, stackable: true },
  { id: 'PROF_ITEM_STARFORGE_CORE', name: 'Celestial Starforge Alloy', nameVi: 'Hợp Kim Tinh Tú Lò Rèn (Legendary)', category: 'material', rarity: 'legendary', iconKey: 'gem_amethyst', isTradable: true, stackable: true, price: 6200, description: 'Hợp kim tối thượng tinh luyện từ Pha Lê Tinh Tú và Tim Rồng để rèn thần binh.' },
  { id: 'PROF_ITEM_CELESTIAL_SEED', name: 'Elysia World-Fruit Sapling', nameVi: 'Quả Thần Bất Diệt Elysia (Legendary)', category: 'consumable', rarity: 'legendary', iconKey: 'herb_green', hpRestore: 1000, mpRestore: 400, isTradable: true, stackable: true, price: 4200, description: 'Thần quả hiếm hồi 1000 HP/400 MP và tăng 12% EXP chiến đấu.' },
  { id: 'PROF_ITEM_ABYSSAL_ELIXIR', name: 'Abyssal Leviathan Nectar', nameVi: 'Tinh Chất Long Ngư Vực Thẳm (Legendary)', category: 'consumable', rarity: 'legendary', iconKey: 'potion_mp', hpRestore: 500, mpRestore: 900, isTradable: true, stackable: true, price: 4800, description: 'Tinh chất ngọc trai đáy biển hồi 500 HP/900 MP và cường hóa Phép Thuật.' },
  { id: 'PROF_ITEM_YGGDRASIL_BEAM', name: 'Sacred Yggdrasil Timber Beam', nameVi: 'Xà Gỗ Cây Thế Giới (Legendary)', category: 'material', rarity: 'legendary', iconKey: 'wood_oak', isTradable: true, stackable: true, price: 5800, description: 'Gỗ thiêng bất hoại dùng nâng cấp Sảnh Bang Hội cấp cao & Cung Thần.' },
];
