import {
  BossEncounterConfig,
  BossParticipantContribution,
  DropEntry,
  DropTableDefinition,
  ItemEntity,
  MonsterCategory,
  MonsterDefinition,
  PartyContributionConfig,
} from '@elysia/game-types';
import { INITIAL_ITEMS } from './setsAndItems.js';

export const DEFAULT_PARTY_CONTRIBUTION_CONFIG: PartyContributionConfig = {
  damageWeight: 1.0,
  healingWeight: 1.25,
  tankMitigationWeight: 1.3,
  supportWeight: 1.05,
  minContributionScore: 80,
  lastHitBonusPct: 0, // Prevent last-hit player from monopolizing boss drops
  inactiveTimeoutSec: 45,
  rewardTopN: 20,
};

export const INITIAL_BOSS_CONFIGS: BossEncounterConfig[] = [
  {
    id: 'boss_ancient_treant',
    monsterId: 'boss_ancient_treant',
    bossName: 'Ancient Treant',
    category: 'FIELD_BOSS',
    regionId: 'map_spirit_forest',
    portraitUrl: '/assets/elysia/ui/portrait-ancient-treant.png',
    respawnTimeSeconds: 300,
    spawnScheduleCron: '*/5 * * * *',
    lootMode: 'CONTRIBUTION_WEIGHTED',
    pityThresholdKills: 5,
    pityFragmentItemId: 'FRAG_FOREST_SET',
    pityFragmentQuantity: 2,
    partyRules: { ...DEFAULT_PARTY_CONTRIBUTION_CONFIG },
    phases: [
      {
        phase: 1,
        name: 'Giai Đoạn 1: Rễ Cổ Thụ',
        hpThresholdPct: 100,
        atkMultiplier: 1.0,
        speedMultiplier: 1.0,
        telegraphMs: 1400,
        aoeRadius: 150,
        skillName: 'Root Entangle',
        damageMultiplier: 1.4,
        element: 'earth',
        statusEffect: 'root_slow',
        warningText: 'Ancient Treant chuẩn bị gọi Rễ Cổ Thụ trói chân!',
        vfxKey: 'vfx_nature_root_snare',
      },
      {
        phase: 2,
        name: 'Giai Đoạn 2: Bão Lá Linh Mộc',
        hpThresholdPct: 65,
        atkMultiplier: 1.2,
        speedMultiplier: 1.15,
        telegraphMs: 1200,
        aoeRadius: 210,
        skillName: 'Emerald Leaf Tempest',
        damageMultiplier: 1.75,
        element: 'wind',
        statusEffect: 'poison',
        warningText: 'Ancient Treant gầm vang triệu hồi Bão Lá Rừng Sâu!',
        vfxKey: 'vfx_nature_leaf_storm',
      },
      {
        phase: 3,
        name: 'Giai Đoạn 3: Cuồng Nộ Mộc Thần (Enrage)',
        hpThresholdPct: 30,
        atkMultiplier: 1.45,
        speedMultiplier: 1.25,
        telegraphMs: 1000,
        aoeRadius: 240,
        skillName: 'Wrath of the World Tree',
        damageMultiplier: 2.15,
        element: 'earth',
        statusEffect: 'stun',
        warningText: 'CẢNH BÁO ENRAGE: Ancient Treant giáng Cơn Thịnh Nộ Mộc Thần!',
        vfxKey: 'vfx_earth_stomp',
        isEnrage: true,
      },
    ],
    status: 'published',
  },
  {
    id: 'boss_moon_hydra',
    monsterId: 'boss_moon_hydra',
    bossName: 'Moon Hydra',
    category: 'FIELD_BOSS',
    regionId: 'map_moonlit_lake',
    portraitUrl: '/assets/elysia/ui/portrait-moon-hydra.png',
    respawnTimeSeconds: 360,
    spawnScheduleCron: '*/6 * * * *',
    lootMode: 'CONTRIBUTION_WEIGHTED',
    pityThresholdKills: 5,
    pityFragmentItemId: 'FRAG_MOONWATER_SET',
    pityFragmentQuantity: 2,
    partyRules: { ...DEFAULT_PARTY_CONTRIBUTION_CONFIG },
    phases: [
      {
        phase: 1,
        name: 'Giai Đoạn 1: Thủy Triều Trăng Bạc',
        hpThresholdPct: 100,
        atkMultiplier: 1.0,
        telegraphMs: 1300,
        aoeRadius: 170,
        skillName: 'Moonwater Geyser',
        damageMultiplier: 1.5,
        element: 'water',
        warningText: 'Moon Hydra tạo cột nước phun trào dưới chân bạn!',
        vfxKey: 'vfx_water_geyser',
      },
      {
        phase: 2,
        name: 'Giai Đoạn 2: Băng Hàn Tam Thủ',
        hpThresholdPct: 60,
        atkMultiplier: 1.25,
        telegraphMs: 1100,
        aoeRadius: 220,
        skillName: 'Tri-Head Frost Nova',
        damageMultiplier: 1.85,
        element: 'water',
        statusEffect: 'chill',
        warningText: 'Moon Hydra 3 đầu đồng loạt phóng Băng Hàn Đóng Băng!',
        vfxKey: 'vfx_frost_nova',
      },
      {
        phase: 3,
        name: 'Giai Đoạn 3: Nguyệt Thực Cuồng Nộ',
        hpThresholdPct: 30,
        atkMultiplier: 1.5,
        speedMultiplier: 1.3,
        telegraphMs: 950,
        aoeRadius: 250,
        skillName: 'Lunar Abyssal Surge',
        damageMultiplier: 2.25,
        element: 'water',
        warningText: 'ENRAGE: Moon Hydra hấp thụ ánh trăng gây Sóng Thủy Triều Diệt Vong!',
        vfxKey: 'vfx_ice_blizzard_vortex',
        isEnrage: true,
      },
    ],
    status: 'published',
  },
  {
    id: 'boss_ancient_titan',
    monsterId: 'boss_ancient_titan',
    bossName: 'Ancient Titan',
    category: 'FIELD_BOSS',
    regionId: 'map_ancient_ruins',
    portraitUrl: '/assets/elysia/ui/portrait-ancient-titan.png',
    respawnTimeSeconds: 420,
    spawnScheduleCron: '*/7 * * * *',
    lootMode: 'CONTRIBUTION_WEIGHTED',
    pityThresholdKills: 5,
    pityFragmentItemId: 'FRAG_ANCIENT_SET',
    pityFragmentQuantity: 2,
    partyRules: { ...DEFAULT_PARTY_CONTRIBUTION_CONFIG },
    phases: [
      {
        phase: 1,
        name: 'Giai Đoạn 1: Trấn Địa Nện Búa',
        hpThresholdPct: 100,
        atkMultiplier: 1.0,
        telegraphMs: 1400,
        aoeRadius: 175,
        skillName: 'Titan Ground Slam',
        damageMultiplier: 1.65,
        element: 'earth',
        statusEffect: 'stun',
        warningText: 'Ancient Titan giơ nắm đấm đá khổng lồ chuẩn bị đập xuống!',
        vfxKey: 'vfx_ground_slam',
      },
      {
        phase: 2,
        name: 'Giai Đoạn 2: Cổ Ngữ Hoàng Kim',
        hpThresholdPct: 60,
        atkMultiplier: 1.25,
        telegraphMs: 1150,
        aoeRadius: 225,
        skillName: 'Runic Thunder Quake',
        damageMultiplier: 2.0,
        element: 'earth',
        statusEffect: 'def_break',
        warningText: 'Cổ ngữ trên ngực Ancient Titan rực sáng — Tránh xa tâm chấn!',
        vfxKey: 'vfx_earth_stomp',
      },
      {
        phase: 3,
        name: 'Giai Đoạn 3: Pháo Đài Bất Diệt',
        hpThresholdPct: 28,
        atkMultiplier: 1.55,
        speedMultiplier: 1.25,
        telegraphMs: 900,
        aoeRadius: 260,
        skillName: 'Cataclysmic Titan Smash',
        damageMultiplier: 2.45,
        element: 'earth',
        warningText: 'ENRAGE: Ancient Titan kích hoạt Toàn Thân Quá Tải Cổ Ngữ!',
        vfxKey: 'vfx_lightning_strike',
        isEnrage: true,
      },
    ],
    status: 'published',
  },
  {
    id: 'boss_ignis_dragon',
    monsterId: 'boss_ignis_dragon',
    bossName: 'Ignis Dragon',
    category: 'WORLD_BOSS',
    regionId: 'map_dragon_valley',
    portraitUrl: '/assets/elysia/ui/portrait-ignis-dragon.png',
    respawnTimeSeconds: 600,
    spawnScheduleCron: '*/10 * * * *',
    lootMode: 'PARTY_ROLL',
    pityThresholdKills: 4,
    pityFragmentItemId: 'FRAG_IGNIS_SET',
    pityFragmentQuantity: 2,
    partyRules: { ...DEFAULT_PARTY_CONTRIBUTION_CONFIG },
    phases: [
      {
        phase: 1,
        name: 'Giai Đoạn 1: Hơi Thở Hỏa Long',
        hpThresholdPct: 100,
        atkMultiplier: 1.0,
        telegraphMs: 1200,
        aoeRadius: 195,
        skillName: 'Ignis Flame Breath',
        damageMultiplier: 1.75,
        element: 'fire',
        statusEffect: 'burn',
        warningText: 'Ignis Dragon hít sâu chuẩn bị phun Hơi Thở Dung Nham!',
        vfxKey: 'vfx_fire_ring',
      },
      {
        phase: 2,
        name: 'Giai Đoạn 2: Mưa Thiên Thạch Long Cốc',
        hpThresholdPct: 65,
        atkMultiplier: 1.3,
        telegraphMs: 1050,
        aoeRadius: 245,
        skillName: 'Crimson Meteor Barrage',
        damageMultiplier: 2.15,
        element: 'fire',
        statusEffect: 'burn',
        warningText: 'Ignis Dragon vỗ cánh gọi Mưa Thiên Thạch rực cháy!',
        vfxKey: 'vfx_fire_meteor',
      },
      {
        phase: 3,
        name: 'Giai Đoạn 3: Chúa Tể Hỏa Diệm Enrage',
        hpThresholdPct: 30,
        atkMultiplier: 1.65,
        speedMultiplier: 1.35,
        telegraphMs: 850,
        aoeRadius: 290,
        skillName: 'Infernal Dragon Cataclysm',
        damageMultiplier: 2.6,
        element: 'fire',
        statusEffect: 'burn',
        warningText: 'WORLD BOSS ENRAGE: Ngọn Lửa Bất Diệt của Ignis Dragon bao trùm toàn vùng!',
        vfxKey: 'vfx_fire_flame_pillar',
        isEnrage: true,
      },
    ],
    status: 'published',
  },
  {
    id: 'boss_abyss_overlord',
    monsterId: 'boss_abyss_overlord',
    bossName: 'Abyss Overlord',
    category: 'WORLD_BOSS',
    regionId: 'map_shadow_realm_border',
    portraitUrl: '/assets/elysia/ui/portrait-abyss-overlord.png',
    respawnTimeSeconds: 900,
    spawnScheduleCron: '*/15 * * * *',
    lootMode: 'PARTY_ROLL',
    pityThresholdKills: 4,
    pityFragmentItemId: 'FRAG_ABYSS_SET',
    pityFragmentQuantity: 2,
    partyRules: { ...DEFAULT_PARTY_CONTRIBUTION_CONFIG },
    phases: [
      {
        phase: 1,
        name: 'Giai Đoạn 1: Hư Vô Kiếm Khí',
        hpThresholdPct: 100,
        atkMultiplier: 1.0,
        telegraphMs: 1100,
        aoeRadius: 205,
        skillName: 'Void Rift Slash',
        damageMultiplier: 1.9,
        element: 'shadow',
        statusEffect: 'curse',
        warningText: 'Abyss Overlord xé toạc không gian bằng Kiếm Khí Hư Vô!',
        vfxKey: 'vfx_shadow_life_steal',
      },
      {
        phase: 2,
        name: 'Giai Đoạn 2: Hắc Ám Thôn Phệ',
        hpThresholdPct: 60,
        atkMultiplier: 1.35,
        telegraphMs: 950,
        aoeRadius: 255,
        skillName: 'Abyssal Dark Nova',
        damageMultiplier: 2.35,
        element: 'shadow',
        statusEffect: 'curse',
        warningText: 'Abyss Overlord hội tụ Vực Thẳm Hắc Ám — Rời khỏi vòng nguy hiểm!',
        vfxKey: 'vfx_shadow_dark_explosion',
      },
      {
        phase: 3,
        name: 'Giai Đoạn 3: Tận Thế Hư Vô (Mythic Enrage)',
        hpThresholdPct: 30,
        atkMultiplier: 1.75,
        speedMultiplier: 1.4,
        telegraphMs: 800,
        aoeRadius: 310,
        skillName: 'Judgment of Eternal Void',
        damageMultiplier: 2.9,
        element: 'shadow',
        statusEffect: 'stun',
        warningText: 'WORLD BOSS MYTHIC ENRAGE: Abyss Overlord giải phóng Khải Huyền Vực Thẳm!',
        vfxKey: 'vfx_arcane_star_fall',
        isEnrage: true,
      },
    ],
    status: 'published',
  },
];

export const INITIAL_ELITE_AND_BOSS_MONSTERS: MonsterDefinition[] = [
  // The 5 Required Initial World / Field Bosses
  {
    id: 'boss_ancient_treant',
    name: 'Ancient Treant (Field Boss Lv.38)',
    internalName: 'ancient_treant_boss',
    description: 'Mộc Thần Cổ Thụ canh giữ Rừng Sâu Tinh Linh. Rơi Lõi Mộc Thần, Tinh Hoa Rừng & Trang bị Forest Guardian.',
    category: 'FIELD_BOSS',
    regionId: 'map_spirit_forest',
    levelMin: 38,
    levelMax: 38,
    hp: 36500,
    mp: 2200,
    physicalAttack: 495,
    physicalDefense: 210,
    magicalAttack: 520,
    magicalDefense: 230,
    agi: 58,
    movementSpeed: 105,
    attackRange: 105,
    expReward: 6800,
    goldReward: 3400,
    element: 'earth',
    monsterType: 'treant_boss',
    aiBehavior: 'boss',
    spawnCoordinates: [{ x: 1848, y: 840, tx: 38, ty: 17, radius: 72, count: 1 }],
    spawnCount: 1,
    respawnTimeSeconds: 300,
    dropTableId: 'DROP_BOSS_ANCIENT_TREANT',
    spriteAsset: '/assets/elysia/ui/portrait-ancient-treant.png',
    spriteId: 'boss_dark_dragon',
    portraitUrl: '/assets/elysia/ui/portrait-ancient-treant.png',
    visualFilter: 'hue-rotate(105deg) saturate(1.35) brightness(1.06)',
    telegraphColor: '#10b981',
    isBoss: true,
    isElite: true,
    status: 'published',
  },
  {
    id: 'boss_moon_hydra',
    name: 'Moon Hydra (Field Boss Lv.45)',
    internalName: 'moon_hydra_boss',
    description: 'Thủy Xà Ba Đầu huyền bí dưới ánh trăng bạc Hồ Ánh Trăng. Rơi Vảy Hydra & Trang bị Moonwater.',
    category: 'FIELD_BOSS',
    regionId: 'map_moonlit_lake',
    levelMin: 45,
    levelMax: 45,
    hp: 52000,
    mp: 3100,
    physicalAttack: 650,
    physicalDefense: 280,
    magicalAttack: 740,
    magicalDefense: 310,
    agi: 72,
    movementSpeed: 120,
    attackRange: 115,
    expReward: 9400,
    goldReward: 4800,
    element: 'water',
    monsterType: 'hydra_boss',
    aiBehavior: 'boss',
    spawnCoordinates: [{ x: 1800, y: 744, tx: 37, ty: 15, radius: 72, count: 1 }],
    spawnCount: 1,
    respawnTimeSeconds: 360,
    dropTableId: 'DROP_BOSS_MOON_HYDRA',
    spriteAsset: '/assets/elysia/ui/portrait-moon-hydra.png',
    spriteId: 'boss_dark_dragon',
    portraitUrl: '/assets/elysia/ui/portrait-moon-hydra.png',
    visualFilter: 'hue-rotate(195deg) saturate(1.45) brightness(1.15)',
    telegraphColor: '#38bdf8',
    isBoss: true,
    isElite: true,
    status: 'published',
  },
  {
    id: 'boss_ancient_titan',
    name: 'Ancient Titan (Field Boss Lv.55)',
    internalName: 'ancient_titan_boss',
    description: 'Khổng Lồ Đá Cổ Ngữ canh giữ Phế Tích Cổ Đại. Rơi Titan Core & Giáp nặng Ancient Plate.',
    category: 'FIELD_BOSS',
    regionId: 'map_ancient_ruins',
    levelMin: 55,
    levelMax: 55,
    hp: 74000,
    mp: 2600,
    physicalAttack: 890,
    physicalDefense: 460,
    magicalAttack: 640,
    magicalDefense: 380,
    agi: 54,
    movementSpeed: 100,
    attackRange: 110,
    expReward: 13200,
    goldReward: 6800,
    element: 'earth',
    monsterType: 'titan_boss',
    aiBehavior: 'boss',
    spawnCoordinates: [{ x: 1800, y: 744, tx: 37, ty: 15, radius: 72, count: 1 }],
    spawnCount: 1,
    respawnTimeSeconds: 420,
    dropTableId: 'DROP_BOSS_ANCIENT_TITAN',
    spriteAsset: '/assets/elysia/ui/portrait-ancient-titan.png',
    spriteId: 'boss_dark_dragon',
    portraitUrl: '/assets/elysia/ui/portrait-ancient-titan.png',
    visualFilter: 'sepia(0.55) saturate(1.4) brightness(1.08)',
    telegraphColor: '#f59e0b',
    isBoss: true,
    isElite: true,
    status: 'published',
  },
  {
    id: 'boss_ignis_dragon',
    name: 'Ignis Dragon (World Boss Lv.75)',
    internalName: 'ignis_dragon_world_boss',
    description: 'Cự Long Hỏa Diệm tối cao ngự trị Thung Lũng Rồng. Rơi Tim Rồng Ignis & Trang bị Huyền Thoại.',
    category: 'WORLD_BOSS',
    regionId: 'map_dragon_valley',
    levelMin: 75,
    levelMax: 75,
    hp: 145000,
    mp: 5500,
    physicalAttack: 1680,
    physicalDefense: 690,
    magicalAttack: 1890,
    magicalDefense: 650,
    agi: 112,
    movementSpeed: 138,
    attackRange: 125,
    expReward: 26000,
    goldReward: 14000,
    element: 'fire',
    monsterType: 'dragon_world_boss',
    aiBehavior: 'boss',
    spawnCoordinates: [{ x: 1848, y: 552, tx: 38, ty: 11, radius: 80, count: 1 }],
    spawnCount: 1,
    respawnTimeSeconds: 600,
    dropTableId: 'DROP_BOSS_IGNIS_DRAGON',
    spriteAsset: '/assets/elysia/ui/portrait-ignis-dragon.png',
    spriteId: 'boss_dark_dragon',
    portraitUrl: '/assets/elysia/ui/portrait-ignis-dragon.png',
    visualFilter: 'hue-rotate(-55deg) saturate(1.9) brightness(1.05)',
    telegraphColor: '#ef4444',
    isBoss: true,
    isElite: true,
    status: 'published',
  },
  {
    id: 'boss_abyss_overlord',
    name: 'Abyss Overlord (World Boss Lv.110)',
    internalName: 'abyss_overlord_world_boss',
    description: 'Chúa Tể Hư Vô tối thượng tại Biên Giới Hắc Ám. Rơi Lõi Hư Vô & Trang bị Mythic tối cao.',
    category: 'WORLD_BOSS',
    regionId: 'map_shadow_realm_border',
    levelMin: 110,
    levelMax: 110,
    hp: 290000,
    mp: 9500,
    physicalAttack: 2950,
    physicalDefense: 1150,
    magicalAttack: 3350,
    magicalDefense: 1100,
    agi: 160,
    movementSpeed: 145,
    attackRange: 135,
    expReward: 48000,
    goldReward: 28000,
    element: 'shadow',
    monsterType: 'void_world_boss',
    aiBehavior: 'boss',
    spawnCoordinates: [{ x: 1848, y: 792, tx: 38, ty: 16, radius: 80, count: 1 }],
    spawnCount: 1,
    respawnTimeSeconds: 900,
    dropTableId: 'DROP_BOSS_ABYSS_OVERLORD',
    spriteAsset: '/assets/elysia/ui/portrait-abyss-overlord.png',
    spriteId: 'boss_dark_dragon',
    portraitUrl: '/assets/elysia/ui/portrait-abyss-overlord.png',
    visualFilter: 'hue-rotate(270deg) contrast(1.3) brightness(0.85)',
    telegraphColor: '#a855f7',
    isBoss: true,
    isElite: true,
    status: 'published',
  },

  // Elite + Mini Boss Monsters across all 10 EXP Training Maps
  ...[
    { id: 'whispering_meadow', region: 'map_whispering_meadow', lv: 19, el: 'earth' as const, dropTier: 'FRAG_APPRENTICE_SET', sprite: 'monster_goblin', bossSprite: 'boss_dark_dragon', tx: 30, ty: 19 },
    { id: 'windmill_plains', region: 'map_windmill_plains', lv: 24, el: 'wind' as const, dropTier: 'FRAG_APPRENTICE_SET', sprite: 'monster_goblin', bossSprite: 'boss_dark_dragon', tx: 31, ty: 14 },
    { id: 'spirit_outskirts', region: 'map_spirit_forest_outskirts', lv: 29, el: 'earth' as const, dropTier: 'FRAG_TIER2_ELITE_SET', sprite: 'monster_goblin', bossSprite: 'boss_dark_dragon', tx: 32, ty: 18 },
    { id: 'spirit_forest', region: 'map_spirit_forest', lv: 37, el: 'earth' as const, dropTier: 'FRAG_FOREST_SET', sprite: 'monster_goblin', bossSprite: 'boss_dark_dragon', tx: 29, ty: 16 },
    { id: 'moonlit_lake', region: 'map_moonlit_lake', lv: 44, el: 'water' as const, dropTier: 'FRAG_MOONWATER_SET', sprite: 'monster_slime', bossSprite: 'boss_dark_dragon', tx: 30, ty: 18 },
    { id: 'ancient_ruins', region: 'map_ancient_ruins', lv: 53, el: 'earth' as const, dropTier: 'FRAG_ANCIENT_SET', sprite: 'monster_goblin', bossSprite: 'boss_dark_dragon', tx: 30, ty: 15 },
    { id: 'ember_canyon', region: 'map_ember_canyon', lv: 64, el: 'fire' as const, dropTier: 'FRAG_TIER3_DRAGON_SET', sprite: 'monster_goblin', bossSprite: 'boss_dark_dragon', tx: 32, ty: 17 },
    { id: 'dragon_valley', region: 'map_dragon_valley', lv: 73, el: 'fire' as const, dropTier: 'FRAG_IGNIS_SET', sprite: 'monster_goblin', bossSprite: 'boss_dark_dragon', tx: 31, ty: 19 },
    { id: 'crimson_desert', region: 'map_crimson_desert', lv: 88, el: 'earth' as const, dropTier: 'FRAG_TIER3_DRAGON_SET', sprite: 'monster_goblin', bossSprite: 'boss_dark_dragon', tx: 33, ty: 16 },
    { id: 'shadow_border', region: 'map_shadow_realm_border', lv: 105, el: 'shadow' as const, dropTier: 'FRAG_ABYSS_SET', sprite: 'monster_goblin', bossSprite: 'boss_dark_dragon', tx: 32, ty: 17 },
  ].flatMap((cfg): MonsterDefinition[] => [
    {
      id: `elite_${cfg.id}`,
      name: `Elite ${cfg.id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} Sentinel`,
      internalName: `elite_${cfg.id}`,
      category: 'ELITE' as MonsterCategory,
      regionId: cfg.region,
      levelMin: cfg.lv - 1,
      levelMax: cfg.lv,
      hp: Math.round(cfg.lv * 185 + 900),
      mp: 400,
      physicalAttack: Math.round(cfg.lv * 11 + 80),
      physicalDefense: Math.round(cfg.lv * 5 + 30),
      magicalAttack: Math.round(cfg.lv * 9 + 60),
      magicalDefense: Math.round(cfg.lv * 4 + 25),
      agi: 30 + cfg.lv,
      movementSpeed: 120,
      attackRange: 72,
      expReward: Math.round(cfg.lv * 42 + 240),
      goldReward: Math.round(cfg.lv * 24 + 120),
      element: cfg.el,
      monsterType: 'elite_champion',
      aiBehavior: 'aggressive',
      spawnCoordinates: [{ x: cfg.tx * 48 + 24, y: cfg.ty * 48 + 24, tx: cfg.tx, ty: cfg.ty, radius: 64, count: 1 }],
      spawnCount: 1,
      respawnTimeSeconds: 45,
      dropTableId: `DROP_ELITE_${cfg.id.toUpperCase()}`,
      spriteAsset: '/assets/elysia/characters/animations/goblin.png',
      spriteId: cfg.sprite,
      visualFilter: 'saturate(1.6) hue-rotate(-30deg) brightness(1.12)',
      isBoss: false,
      isElite: true,
      status: 'published',
    },
    {
      id: `miniboss_${cfg.id}`,
      name: `Mini Boss · ${cfg.id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} Warden`,
      internalName: `miniboss_${cfg.id}`,
      category: 'MINI_BOSS' as MonsterCategory,
      regionId: cfg.region,
      levelMin: cfg.lv,
      levelMax: cfg.lv + 1,
      hp: Math.round(cfg.lv * 420 + 2200),
      mp: 900,
      physicalAttack: Math.round(cfg.lv * 14 + 130),
      physicalDefense: Math.round(cfg.lv * 7 + 50),
      magicalAttack: Math.round(cfg.lv * 12 + 100),
      magicalDefense: Math.round(cfg.lv * 6 + 45),
      agi: 35 + cfg.lv,
      movementSpeed: 125,
      attackRange: 90,
      expReward: Math.round(cfg.lv * 95 + 520),
      goldReward: Math.round(cfg.lv * 52 + 300),
      element: cfg.el,
      monsterType: 'mini_boss',
      aiBehavior: 'boss',
      spawnCoordinates: [{ x: (cfg.tx + 5) * 48 + 24, y: (cfg.ty - 3) * 48 + 24, tx: cfg.tx + 5, ty: cfg.ty - 3, radius: 72, count: 1 }],
      spawnCount: 1,
      respawnTimeSeconds: 120,
      dropTableId: `DROP_MINIBOSS_${cfg.id.toUpperCase()}`,
      spriteAsset: '/assets/elysia/ui/portrait-dragon.png',
      spriteId: cfg.bossSprite,
      portraitUrl: '/assets/elysia/ui/portrait-dragon.png',
      visualFilter: 'saturate(1.45) contrast(1.12)',
      isBoss: true,
      isElite: true,
      status: 'published',
    },
  ]),
];

export const INITIAL_BOSS_DROP_TABLES: DropTableDefinition[] = [
  // Exact spec for Ancient Treant:
  // Treant Core guaranteed (100%), Forest Essence 60%, Rare 15%, Epic 4%, Forest Set Fragment 20%, Legendary 0.5%
  {
    tableId: 'DROP_BOSS_ANCIENT_TREANT',
    monsterId: 'boss_ancient_treant',
    lootMode: 'CONTRIBUTION_WEIGHTED',
    pityThresholdKills: 5,
    pityFragmentItemId: 'FRAG_FOREST_SET',
    pityFragmentQuantity: 2,
    drops: [
      { itemId: 'MAT_TREANT_CORE', dropRate: 100, minQuantity: 1, maxQuantity: 1, isGuaranteed: true, isBossExclusive: true, lootType: 'material', rarity: 'epic' },
      { itemId: 'MAT_FOREST_ESSENCE', dropRate: 60, minQuantity: 1, maxQuantity: 3, lootType: 'material', rarity: 'rare' },
      { itemId: 'FRAG_FOREST_SET', dropRate: 20, minQuantity: 1, maxQuantity: 2, isBossExclusive: true, lootType: 'fragment', rarity: 'epic' },
      { itemId: 'ITEM_FOREST_GUARDIAN_CROWN', dropRate: 15, minQuantity: 1, maxQuantity: 1, lootType: 'equipment', rarity: 'rare', classCompatibleOnly: false },
      { itemId: 'ITEM_FOREST_GUARDIAN_CLOAK', dropRate: 4, minQuantity: 1, maxQuantity: 1, isBossExclusive: true, lootType: 'equipment', rarity: 'epic' },
      { itemId: 'ITEM_EXCALIBUR_HOLY', dropRate: 0.5, minQuantity: 1, maxQuantity: 1, lootType: 'equipment', rarity: 'legendary', classCompatibleOnly: true },
    ],
    status: 'published',
  },
  {
    tableId: 'DROP_BOSS_MOON_HYDRA',
    monsterId: 'boss_moon_hydra',
    lootMode: 'CONTRIBUTION_WEIGHTED',
    pityThresholdKills: 5,
    pityFragmentItemId: 'FRAG_MOONWATER_SET',
    pityFragmentQuantity: 2,
    drops: [
      { itemId: 'MAT_HYDRA_SCALE', dropRate: 100, minQuantity: 1, maxQuantity: 2, isGuaranteed: true, isBossExclusive: true, lootType: 'material', rarity: 'epic' },
      { itemId: 'MAT_SPIRIT_ESSENCE', dropRate: 70, minQuantity: 2, maxQuantity: 4, lootType: 'material', rarity: 'uncommon' },
      { itemId: 'FRAG_MOONWATER_SET', dropRate: 25, minQuantity: 1, maxQuantity: 2, isBossExclusive: true, lootType: 'fragment', rarity: 'epic' },
      { itemId: 'ITEM_MOONWATER_ROBE', dropRate: 15, minQuantity: 1, maxQuantity: 1, lootType: 'equipment', rarity: 'rare' },
      { itemId: 'ITEM_MOONWATER_RING', dropRate: 5, minQuantity: 1, maxQuantity: 1, isBossExclusive: true, lootType: 'equipment', rarity: 'epic' },
      { itemId: 'ITEM_IGNIS_DRAGON_RING', dropRate: 0.5, minQuantity: 1, maxQuantity: 1, lootType: 'equipment', rarity: 'legendary' },
    ],
    status: 'published',
  },
  {
    tableId: 'DROP_BOSS_ANCIENT_TITAN',
    monsterId: 'boss_ancient_titan',
    lootMode: 'CONTRIBUTION_WEIGHTED',
    pityThresholdKills: 5,
    pityFragmentItemId: 'FRAG_ANCIENT_SET',
    pityFragmentQuantity: 2,
    drops: [
      { itemId: 'MAT_TITAN_CORE', dropRate: 100, minQuantity: 1, maxQuantity: 1, isGuaranteed: true, isBossExclusive: true, lootType: 'material', rarity: 'epic' },
      { itemId: 'MAT_ANCIENT_RUNE', dropRate: 75, minQuantity: 2, maxQuantity: 5, lootType: 'material', rarity: 'rare' },
      { itemId: 'FRAG_ANCIENT_SET', dropRate: 25, minQuantity: 1, maxQuantity: 2, isBossExclusive: true, lootType: 'fragment', rarity: 'epic' },
      { itemId: 'ITEM_ANCIENT_PLATE', dropRate: 14, minQuantity: 1, maxQuantity: 1, isBossExclusive: true, lootType: 'equipment', rarity: 'epic' },
      { itemId: 'ITEM_ANCIENT_TITAN_SHOULDER', dropRate: 6, minQuantity: 1, maxQuantity: 1, lootType: 'equipment', rarity: 'epic' },
      { itemId: 'ITEM_EXCALIBUR_HOLY', dropRate: 0.8, minQuantity: 1, maxQuantity: 1, lootType: 'equipment', rarity: 'legendary' },
    ],
    status: 'published',
  },
  {
    tableId: 'DROP_BOSS_IGNIS_DRAGON',
    monsterId: 'boss_ignis_dragon',
    lootMode: 'PARTY_ROLL',
    pityThresholdKills: 4,
    pityFragmentItemId: 'FRAG_IGNIS_SET',
    pityFragmentQuantity: 2,
    drops: [
      { itemId: 'MAT_DRAGON_HEART', dropRate: 100, minQuantity: 1, maxQuantity: 1, isGuaranteed: true, isBossExclusive: true, lootType: 'material', rarity: 'legendary' },
      { itemId: 'MAT_DRAGON_SCALE', dropRate: 85, minQuantity: 2, maxQuantity: 5, lootType: 'material', rarity: 'epic' },
      { itemId: 'FRAG_IGNIS_SET', dropRate: 30, minQuantity: 1, maxQuantity: 3, isBossExclusive: true, lootType: 'fragment', rarity: 'legendary' },
      { itemId: 'ITEM_IGNIS_DRAGON_ARMOR', dropRate: 6, minQuantity: 1, maxQuantity: 1, isBossExclusive: true, lootType: 'equipment', rarity: 'legendary' },
      { itemId: 'ITEM_IGNIS_BLADE', dropRate: 2.5, minQuantity: 1, maxQuantity: 1, isBossExclusive: true, lootType: 'equipment', rarity: 'legendary', classCompatibleOnly: true },
    ],
    status: 'published',
  },
  {
    tableId: 'DROP_BOSS_ABYSS_OVERLORD',
    monsterId: 'boss_abyss_overlord',
    lootMode: 'PARTY_ROLL',
    pityThresholdKills: 4,
    pityFragmentItemId: 'FRAG_ABYSS_SET',
    pityFragmentQuantity: 2,
    drops: [
      { itemId: 'MAT_ABYSSAL_CORE', dropRate: 100, minQuantity: 1, maxQuantity: 1, isGuaranteed: true, isBossExclusive: true, lootType: 'material', rarity: 'mythic' },
      { itemId: 'MAT_VOID_CRYSTAL', dropRate: 90, minQuantity: 3, maxQuantity: 6, lootType: 'material', rarity: 'mythic' },
      { itemId: 'FRAG_ABYSS_SET', dropRate: 35, minQuantity: 1, maxQuantity: 3, isBossExclusive: true, lootType: 'fragment', rarity: 'mythic' },
      { itemId: 'ITEM_ABYSSAL_RING', dropRate: 5, minQuantity: 1, maxQuantity: 1, isBossExclusive: true, lootType: 'equipment', rarity: 'mythic' },
      { itemId: 'ITEM_ABYSSAL_GREATSWORD', dropRate: 1.5, minQuantity: 1, maxQuantity: 1, isBossExclusive: true, lootType: 'equipment', rarity: 'mythic', classCompatibleOnly: true },
    ],
    status: 'published',
  },
  // Elite & Mini Boss drop tables across the 10 training maps
  ...INITIAL_ELITE_AND_BOSS_MONSTERS.filter((m) => m.category === 'ELITE' || m.category === 'MINI_BOSS').map((m): DropTableDefinition => {
    const isMini = m.category === 'MINI_BOSS';
    const fragId =
      m.levelMin >= 90 ? 'FRAG_ABYSS_SET'
      : m.levelMin >= 65 ? 'FRAG_IGNIS_SET'
      : m.levelMin >= 50 ? 'FRAG_ANCIENT_SET'
      : m.levelMin >= 42 ? 'FRAG_MOONWATER_SET'
      : m.levelMin >= 35 ? 'FRAG_FOREST_SET'
      : m.levelMin >= 26 ? 'FRAG_TIER2_ELITE_SET'
      : 'FRAG_APPRENTICE_SET';
    return {
      tableId: m.dropTableId,
      monsterId: m.id,
      lootMode: 'PERSONAL',
      drops: [
        { itemId: 'ITEM_UPGRADE_STONE_BASIC', dropRate: isMini ? 75 : 45, minQuantity: 1, maxQuantity: isMini ? 3 : 2, lootType: 'material', rarity: 'uncommon' },
        { itemId: fragId, dropRate: isMini ? 45 : 22, minQuantity: 1, maxQuantity: isMini ? 2 : 1, lootType: 'fragment', rarity: 'rare' },
        { itemId: 'ITEM_POTION_HP_MEDIUM', dropRate: 50, minQuantity: 1, maxQuantity: 2, lootType: 'consumable', rarity: 'uncommon' },
      ],
      status: 'published',
    };
  }),
];

/**
 * Evaluates participant contributions across damage dealt, healing provided,
 * tank damage absorbed, and support actions. Excludes inactive/zero-effort characters
 * and prevents final-attacker loot monopoly.
 */
export function computeBossParticipantScores(
  rawParticipants: Array<{
    characterId: string;
    characterName: string;
    classId: any;
    damageDealt?: number;
    healingProvided?: number;
    damageAbsorbed?: number;
    effectiveSupport?: number;
    validActions?: number;
    lastActiveAt?: number;
  }>,
  rules: PartyContributionConfig = DEFAULT_PARTY_CONTRIBUTION_CONFIG,
  nowMs: number = Date.now()
): BossParticipantContribution[] {
  const inactiveCutoff = nowMs - Math.max(5, rules.inactiveTimeoutSec) * 1000;
  const scored: BossParticipantContribution[] = rawParticipants.map((p) => {
    const dmg = Math.max(0, Number(p.damageDealt || 0));
    const heal = Math.max(0, Number(p.healingProvided || 0));
    const tank = Math.max(0, Number(p.damageAbsorbed || 0));
    const sup = Math.max(0, Number(p.effectiveSupport || 0));
    const actions = Math.max(0, Number(p.validActions || 0));
    const activeAt = Number(p.lastActiveAt || nowMs);

    const totalScore = Math.round(
      dmg * rules.damageWeight +
        heal * rules.healingWeight +
        tank * rules.tankMitigationWeight +
        sup * rules.supportWeight
    );

    const eligible = actions > 0 && totalScore >= rules.minContributionScore && activeAt >= inactiveCutoff;
    return {
      characterId: p.characterId,
      characterName: p.characterName,
      classId: p.classId,
      damageDealt: dmg,
      healingProvided: heal,
      damageAbsorbed: tank,
      effectiveSupport: sup,
      validActions: actions,
      totalScore,
      lastActiveAt: activeAt,
      eligible,
      rewardSharePct: 0,
    };
  });

  const eligibleSum = scored.reduce((s, r) => s + (r.eligible ? r.totalScore : 0), 0);
  if (eligibleSum > 0) {
    for (const row of scored) {
      if (row.eligible) {
        row.rewardSharePct = Number(((row.totalScore / eligibleSum) * 100).toFixed(2));
      }
    }
  }
  scored.sort((a, b) => b.totalScore - a.totalScore);
  return scored;
}

/**
 * Picks a class-compatible equipment drop from catalog when drop entry specifies classCompatibleOnly
 * or returns the explicit itemId cleanly.
 */
export function resolveClassCompatibleDropItem(
  entry: DropEntry,
  playerClassId: string,
  playerLevel: number,
  itemsCatalog: ItemEntity[] = INITIAL_ITEMS,
  rng: () => number = Math.random
): string {
  if (!entry.classCompatibleOnly) return entry.itemId;
  const targetRarity = entry.rarity;
  const pool = itemsCatalog.filter(
    (it) =>
      (it.category === 'weapon' || it.category === 'armor' || it.category === 'accessory') &&
      (!targetRarity || it.rarity === targetRarity) &&
      Number(it.requiredLevel || 1) <= Math.max(15, playerLevel + 5) &&
      (!it.allowedClasses?.length || it.allowedClasses.includes('any') || it.allowedClasses.includes(playerClassId as any))
  );
  if (pool.length === 0) return entry.itemId;
  return pool[Math.floor(rng() * pool.length) % pool.length].id;
}

/**
 * Server-side RNG loot roller with contribution scaling, duplicate prevention,
 * class-compatibility filtering, and fragment pity protection (no guaranteed Legendaries).
 */
export function rollBossLootForParticipant(
  participant: BossParticipantContribution,
  participantLevel: number,
  dropTable: DropTableDefinition,
  pityCounterAfterKill: number,
  itemsCatalog: ItemEntity[] = INITIAL_ITEMS,
  rng: () => number = Math.random
): {
  drops: Array<{ itemId: string; quantity: number; isPity?: boolean; rarity?: string }>;
  pityTriggered: boolean;
  newPityCounter: number;
} {
  if (!participant.eligible) {
    return { drops: [], pityTriggered: false, newPityCounter: pityCounterAfterKill };
  }

  const drops: Array<{ itemId: string; quantity: number; isPity?: boolean; rarity?: string }> = [];
  let droppedHighRarity = false;

  // Contribution bonus caps at +35% relative chance for fair top tank/healer/dps weighting
  const shareBoost = Math.min(1.35, Math.max(0.85, 0.85 + participant.rewardSharePct / 150));

  for (const entry of dropTable.drops || []) {
    if (entry.firstClearOnly) continue;
    if (participantLevel < Number(entry.requiredPlayerLevel || 1)) continue;

    const rate = entry.isGuaranteed
      ? 100
      : entry.rarity === 'legendary' || entry.rarity === 'mythic'
      ? Number(entry.dropRate) // Keep top rarities strictly bounded to configured odds!
      : Math.min(100, Number(entry.dropRate) * shareBoost);

    if (rng() * 100 >= rate) continue;

    const min = Math.max(1, Number(entry.minQuantity || 1));
    const max = Math.max(min, Number(entry.maxQuantity || min));
    const qty = Math.floor(min + rng() * (max - min + 1));
    const resolvedItemId = resolveClassCompatibleDropItem(entry, participant.classId, participantLevel, itemsCatalog, rng);
    const meta = itemsCatalog.find((i) => i.id === resolvedItemId || i.itemId === resolvedItemId);

    drops.push({
      itemId: resolvedItemId,
      quantity: qty,
      rarity: meta?.rarity || entry.rarity,
    });
    if (entry.lootType === 'equipment' && (entry.rarity === 'epic' || entry.rarity === 'legendary' || entry.rarity === 'mythic')) {
      droppedHighRarity = true;
    }
  }

  const pityThreshold = Math.max(2, Number(dropTable.pityThresholdKills || 5));
  let pityTriggered = false;
  let newPityCounter = droppedHighRarity ? 0 : pityCounterAfterKill + 1;

  if (!droppedHighRarity && newPityCounter >= pityThreshold && dropTable.pityFragmentItemId) {
    pityTriggered = true;
    newPityCounter = 0;
    drops.push({
      itemId: dropTable.pityFragmentItemId,
      quantity: Math.max(1, Number(dropTable.pityFragmentQuantity || 2)),
      isPity: true,
      rarity: 'epic',
    });
  }

  return { drops, pityTriggered, newPityCounter };
}
