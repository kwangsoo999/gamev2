import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const WORLD_DIR = path.join(ROOT, 'apps', 'game-client', 'public', 'data', 'world');
const LANDING_DIR = path.join(ROOT, 'apps', 'game-client', 'src', 'landing');

fs.mkdirSync(LANDING_DIR, { recursive: true });

const r = (file) => JSON.parse(fs.readFileSync(path.join(WORLD_DIR, file), 'utf8'));

const classes = r('classes.json');
const advancedJobs = r('advanced_jobs.json');
const secondJobs = r('second_jobs.json');
const skillsData = r('skills.json');
const allSkills = Array.isArray(skillsData) ? skillsData : (skillsData.skills || Object.values(skillsData));
const mapsData = r('maps.json');
const allMaps = Array.isArray(mapsData) ? mapsData : (mapsData.maps || Object.values(mapsData));
const monsters = r('monsters.json');
const bosses = r('boss_config.json');
const itemsData = r('world_items.json');
const allItems = Array.isArray(itemsData) ? itemsData : (itemsData.items || Object.values(itemsData));

// Canonical 8 first jobs
const canonicalJobs = [
  { id: 'swordsman', nameVi: 'Kiếm Sĩ', nameEn: 'Sword Warrior', iconKey: 'sword', element: 'Hỏa / Phong', role: 'Chiến Binh Kiếm Thuật Cận Chiến' },
  { id: 'spearman', nameVi: 'Thương Thủ', nameEn: 'Spearman', iconKey: 'spear', element: 'Phong / Lôi', role: 'Xung Phong Cơ Động & Khống Chế' },
  { id: 'knight', nameVi: 'Hiệp Sĩ', nameEn: 'Knight', iconKey: 'shield', element: 'Thánh Quang', role: 'Hộ Vệ & Lá Chắn Bất Bại' },
  { id: 'monk', nameVi: 'Tu Sĩ', nameEn: 'Cleric / Monk', iconKey: 'holy', element: 'Thánh Linh', role: 'Thánh Hộ, Trị Liệu & Kháng Phép' },
  { id: 'mage', nameVi: 'Pháp Sư', nameEn: 'Mage', iconKey: 'magic', element: 'Hỏa / Băng / Lôi', role: 'Chủ Tể Nguyên Tố Diện Rộng' },
  { id: 'assassin', nameVi: 'Thích Khách', nameEn: 'Assassin', iconKey: 'dagger', element: 'Ám Ảnh', role: 'Bạo Kích Chớp Nhoáng & Ám Sát' },
  { id: 'fighter', nameVi: 'Đấu Sĩ', nameEn: 'Fighter', iconKey: 'fist', element: 'Vật Lý Thuần', role: 'Quyền Thuật Bá Đạo & Sinh Tồn' },
  { id: 'archer', nameVi: 'Cung Thủ', nameEn: 'Archer', iconKey: 'bow', element: 'Phong / Tầm Xa', role: 'Xạ Thủ Tầm Xa & Bắn Tỉa' },
];

const jobsPayload = canonicalJobs.map((cj) => {
  const cData = classes.find((c) => c.id === cj.id) || {};
  const adv16 = advancedJobs.filter((a) => a.parentClassId === cj.id || a.baseClassId === cj.id);
  const sec = secondJobs.find((s) => s.baseClassId === cj.id) || null;
  const jobSkills = allSkills.filter((s) => s.classId === cj.id || s.jobRestriction === cj.id).slice(0, 4);

  return {
    ...cj,
    baseStats: cData.baseStats,
    allowedWeapons: cData.allowedWeapons,
    description: cData.description,
    maleImg: `/assets/elysia/landing/classes/${cj.id}_male.png`,
    femaleImg: `/assets/elysia/landing/classes/${cj.id}_female.png`,
    secondJob: sec ? { id: sec.id, nameVi: sec.nameVi, name: sec.name, desc: sec.description } : null,
    advancedBranches: adv16.map((a) => ({
      id: a.id,
      nameVi: a.nameVi,
      titleVi: a.titleVi,
      role: a.role,
      desc: a.descriptionVi || a.description,
      element: a.preferredElement,
      accentColor: a.vfxProfile?.primaryColor || '#38bdf8',
    })),
    keySkills: jobSkills.map((s) => ({
      id: s.id,
      nameVi: s.nameVi || s.name,
      type: s.skillType,
      element: s.element,
      desc: s.description,
      cd: s.cooldown,
      mp: s.mpCost,
      iconUrl: s.iconUrl,
    })),
  };
});

// Pick 12 representative skills for skills showcase
const showcaseSkills = allSkills
  .filter((s) =>
    [
      'skill_slash',
      'skill_double_strike',
      'skill_spear_thrust',
      'skill_shield_bash',
      'skill_holy_light',
      'skill_heal',
      'skill_fireball',
      'skill_ice_lance',
      'skill_shadow_strike',
      'skill_iron_fist',
      'skill_precise_shot',
      'skill_ss_iaido_flash',
    ].includes(s.id),
  )
  .map((s) => ({
    id: s.id,
    nameVi: s.nameVi || s.name,
    classId: s.classId,
    skillType: s.skillType,
    element: s.element,
    desc: s.description,
    cooldown: s.cooldown,
    mpCost: s.mpCost,
    reqLevel: s.requiredLevel,
    iconUrl: s.iconUrl || `/assets/elysia/vfx/${s.vfxKey}_thumb.png`,
    vfxUrl: s.vfxUrl,
  }));

// Regions for interactive map
const featureRegions = [
  'THON_KHOI_NGUYEN',
  'city_elysia_capital',
  'city_sylvaris',
  'city_drakhen',
  'map_whispering_meadow',
  'map_windmill_plains',
  'map_spirit_forest',
  'map_moonlit_lake',
  'map_ancient_ruins',
  'map_dragon_valley',
  'map_crimson_desert',
  'map_shadow_realm_border',
  'dungeon_sanctum_f1',
]
  .map((id) => {
    const m = allMaps.find((x) => x.id === id);
    if (!m) return null;
    const regMonsters = monsters
      .filter((mon) => mon.regionId === id)
      .slice(0, 5)
      .map((mon) => ({
        id: mon.id,
        name: mon.name,
        level: mon.levelMin,
        element: mon.element,
        isBoss: mon.isBoss,
        isElite: mon.isElite,
        img: `/assets/elysia/monsters/${mon.id}.png`,
      }));
    return {
      id: m.id,
      name: m.name,
      nameVi: m.nameVi,
      theme: m.biomeTheme,
      type: m.type,
      levelMin: m.recommendedLevelMin || m.requiredLevel || 1,
      levelMax: m.recommendedLevelMax || m.recommendedLevelMin || 15,
      desc: m.description,
      minimap: m.minimapImage || `/assets/elysia/minimaps/${m.id}.png`,
      monsters: regMonsters,
    };
  })
  .filter(Boolean);

// Bosses list
const bossList = bosses.map((b) => {
  const mon = monsters.find((m) => m.id === b.monsterId) || {};
  return {
    id: b.id,
    name: b.bossName,
    nameVi: mon.name || b.bossName,
    category: b.category,
    regionId: b.regionId,
    level: mon.levelMin || 50,
    element: mon.element || 'neutral',
    portrait: b.portraitUrl || `/assets/elysia/ui/portrait-${b.id}.png`,
    sprite: `/assets/elysia/monsters/${b.monsterId}.png`,
    desc: b.phases?.[0]?.warningText || mon.name || 'Thủ lĩnh dũng mãnh canh giữ vùng đất cổ đại.',
  };
});

// Items list (weapons, armor, rare items)
const showcaseItems = allItems
  .filter(
    (i) =>
      i.rarity === 'legendary' ||
      i.rarity === 'mythic' ||
      i.rarity === 'epic' ||
      i.itemId?.includes('EXCALIBUR') ||
      i.itemId?.includes('NOVICE'),
  )
  .slice(0, 16)
  .map((i) => ({
    id: i.id || i.itemId,
    name: i.name,
    rarity: i.rarity,
    category: i.category,
    equipSlot: i.equipSlot,
    reqLevel: i.requiredLevel,
    desc: i.description,
    stats: i.equipmentStats,
    icon: i.icon,
  }));

const landingData = {
  jobs: jobsPayload,
  skills: showcaseSkills,
  regions: featureRegions,
  bosses: bossList,
  items: showcaseItems,
  stats: {
    totalClasses: 8,
    totalAdvancedJobs: 16,
    totalSkills: allSkills.length,
    totalMaps: allMaps.length,
    totalMonsters: monsters.length,
    levelCap: 110,
  },
};

const outPath = path.join(LANDING_DIR, 'landingData.json');
fs.writeFileSync(outPath, JSON.stringify(landingData, null, 2), 'utf8');
console.log(`Successfully generated ${outPath}`);
