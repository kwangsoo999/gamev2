import type { VFXSkillConfig } from './index.js';

export interface ClassVfxProfileConfig {
  classOrBranchId: string;
  styleCategory: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  glowColor: string;
  trailStyle:
    | 'crescent_arc'
    | 'jagged_cleave'
    | 'piercing_lance'
    | 'sweeping_halberd'
    | 'radiant_wave'
    | 'bastion_pulse'
    | 'holy_ribbon'
    | 'exorcism_sigil'
    | 'elemental_orb'
    | 'cosmic_rune'
    | 'shadow_streak'
    | 'phantom_afterimage'
    | 'chi_shockwave'
    | 'rapid_combo_streak'
    | 'snipe_laser'
    | 'leaf_wind_arc';
  circleStyle:
    | 'runic_halo'
    | 'crimson_vortex'
    | 'draconic_crest'
    | 'fortress_grid'
    | 'paladin_cross'
    | 'aegis_octagon'
    | 'seraph_mandala'
    | 'purification_seal'
    | 'elemental_triad'
    | 'celestial_astrolabe'
    | 'shadow_moon'
    | 'phantom_eclipse'
    | 'lotus_chi'
    | 'duelist_compass'
    | 'target_reticle'
    | 'sylvan_ring';
  weaponAuraStyle: string;
  defaultHitStopMs: number;
  defaultShakeIntensity: number;
  particleDensityMultiplier: number;
}

export const CLASS_VFX_PROFILES: Record<string, ClassVfxProfileConfig> = {
  adventurer: {
    classOrBranchId: 'adventurer',
    styleCategory: 'base_class',
    primaryColor: '#e2e8f0',
    secondaryColor: '#94a3b8',
    accentColor: '#fbbf24',
    glowColor: '#f8fafc',
    trailStyle: 'crescent_arc',
    circleStyle: 'runic_halo',
    weaponAuraStyle: 'white_gold_edge',
    defaultHitStopMs: 24,
    defaultShakeIntensity: 2.5,
    particleDensityMultiplier: 0.9,
  },
  // 8 Base Classes
  swordsman: {
    classOrBranchId: 'swordsman',
    styleCategory: 'base_class',
    primaryColor: '#60a5fa',
    secondaryColor: '#fef08a',
    accentColor: '#ffffff',
    glowColor: '#93c5fd',
    trailStyle: 'crescent_arc',
    circleStyle: 'runic_halo',
    weaponAuraStyle: 'white_gold_edge',
    defaultHitStopMs: 36,
    defaultShakeIntensity: 4.0,
    particleDensityMultiplier: 1.0,
  },
  spearman: {
    classOrBranchId: 'spearman',
    styleCategory: 'base_class',
    primaryColor: '#38bdf8',
    secondaryColor: '#f59e0b',
    accentColor: '#e0f2fe',
    glowColor: '#7dd3fc',
    trailStyle: 'piercing_lance',
    circleStyle: 'fortress_grid',
    weaponAuraStyle: 'tempered_steel',
    defaultHitStopMs: 34,
    defaultShakeIntensity: 3.8,
    particleDensityMultiplier: 1.0,
  },
  knight: {
    classOrBranchId: 'knight',
    styleCategory: 'base_class',
    primaryColor: '#fbbf24',
    secondaryColor: '#e2e8f0',
    accentColor: '#fef9c3',
    glowColor: '#fde68a',
    trailStyle: 'radiant_wave',
    circleStyle: 'aegis_octagon',
    weaponAuraStyle: 'sunlight_gleam',
    defaultHitStopMs: 42,
    defaultShakeIntensity: 5.0,
    particleDensityMultiplier: 1.0,
  },
  monk: {
    classOrBranchId: 'monk',
    styleCategory: 'base_class',
    primaryColor: '#fde047',
    secondaryColor: '#fffbeb',
    accentColor: '#fda4af',
    glowColor: '#fef08a',
    trailStyle: 'holy_ribbon',
    circleStyle: 'seraph_mandala',
    weaponAuraStyle: 'divine_feathers',
    defaultHitStopMs: 26,
    defaultShakeIntensity: 2.5,
    particleDensityMultiplier: 1.1,
  },
  priest: {
    classOrBranchId: 'monk',
    styleCategory: 'base_class',
    primaryColor: '#fde047',
    secondaryColor: '#fffbeb',
    accentColor: '#fda4af',
    glowColor: '#fef08a',
    trailStyle: 'holy_ribbon',
    circleStyle: 'seraph_mandala',
    weaponAuraStyle: 'divine_feathers',
    defaultHitStopMs: 26,
    defaultShakeIntensity: 2.5,
    particleDensityMultiplier: 1.1,
  },
  mage: {
    classOrBranchId: 'mage',
    styleCategory: 'base_class',
    primaryColor: '#f97316',
    secondaryColor: '#38bdf8',
    accentColor: '#fde047',
    glowColor: '#fb923c',
    trailStyle: 'elemental_orb',
    circleStyle: 'elemental_triad',
    weaponAuraStyle: 'tri_element_orbit',
    defaultHitStopMs: 32,
    defaultShakeIntensity: 4.5,
    particleDensityMultiplier: 1.2,
  },
  assassin: {
    classOrBranchId: 'assassin',
    styleCategory: 'base_class',
    primaryColor: '#9333ea',
    secondaryColor: '#f43f5e',
    accentColor: '#e9d5ff',
    glowColor: '#a855f7',
    trailStyle: 'shadow_streak',
    circleStyle: 'shadow_moon',
    weaponAuraStyle: 'violet_mist',
    defaultHitStopMs: 30,
    defaultShakeIntensity: 3.5,
    particleDensityMultiplier: 1.05,
  },
  fighter: {
    classOrBranchId: 'fighter',
    styleCategory: 'base_class',
    primaryColor: '#fb923c',
    secondaryColor: '#facc15',
    accentColor: '#fff7ed',
    glowColor: '#fdba74',
    trailStyle: 'chi_shockwave',
    circleStyle: 'lotus_chi',
    weaponAuraStyle: 'golden_fist',
    defaultHitStopMs: 44,
    defaultShakeIntensity: 5.2,
    particleDensityMultiplier: 1.15,
  },
  archer: {
    classOrBranchId: 'archer',
    styleCategory: 'base_class',
    primaryColor: '#4ade80',
    secondaryColor: '#a3e635',
    accentColor: '#fef9c3',
    glowColor: '#86efac',
    trailStyle: 'leaf_wind_arc',
    circleStyle: 'sylvan_ring',
    weaponAuraStyle: 'spirit_vines',
    defaultHitStopMs: 24,
    defaultShakeIntensity: 2.8,
    particleDensityMultiplier: 1.0,
  },

  // 16 Lv.80 Advanced Branches (Distinct per specialization!)
  sword_saint: {
    classOrBranchId: 'sword_saint',
    styleCategory: 'blade_saint',
    primaryColor: '#38bdf8',
    secondaryColor: '#fef08a',
    accentColor: '#ffffff',
    glowColor: '#bae6fd',
    trailStyle: 'crescent_arc',
    circleStyle: 'runic_halo',
    weaponAuraStyle: 'white_gold_edge',
    defaultHitStopMs: 48,
    defaultShakeIntensity: 5.5,
    particleDensityMultiplier: 1.45,
  },
  berserker: {
    classOrBranchId: 'berserker',
    styleCategory: 'crimson_fury',
    primaryColor: '#dc2626',
    secondaryColor: '#450a0a',
    accentColor: '#f97316',
    glowColor: '#ef4444',
    trailStyle: 'jagged_cleave',
    circleStyle: 'crimson_vortex',
    weaponAuraStyle: 'blood_flame',
    defaultHitStopMs: 65,
    defaultShakeIntensity: 8.5,
    particleDensityMultiplier: 1.6,
  },
  dragoon: {
    classOrBranchId: 'dragoon',
    styleCategory: 'dragon_lance',
    primaryColor: '#6366f1',
    secondaryColor: '#22d3ee',
    accentColor: '#facc15',
    glowColor: '#818cf8',
    trailStyle: 'piercing_lance',
    circleStyle: 'draconic_crest',
    weaponAuraStyle: 'dragon_lightning',
    defaultHitStopMs: 56,
    defaultShakeIntensity: 7.5,
    particleDensityMultiplier: 1.5,
  },
  warlancer: {
    classOrBranchId: 'warlancer',
    styleCategory: 'fortress_spear',
    primaryColor: '#d97706',
    secondaryColor: '#991b1b',
    accentColor: '#fef3c7',
    glowColor: '#f59e0b',
    trailStyle: 'sweeping_halberd',
    circleStyle: 'fortress_grid',
    weaponAuraStyle: 'tempered_steel',
    defaultHitStopMs: 50,
    defaultShakeIntensity: 6.2,
    particleDensityMultiplier: 1.4,
  },
  paladin: {
    classOrBranchId: 'paladin',
    styleCategory: 'holy_paladin',
    primaryColor: '#facc15',
    secondaryColor: '#fffbeb',
    accentColor: '#38bdf8',
    glowColor: '#fef08a',
    trailStyle: 'radiant_wave',
    circleStyle: 'paladin_cross',
    weaponAuraStyle: 'sunlight_gleam',
    defaultHitStopMs: 52,
    defaultShakeIntensity: 6.0,
    particleDensityMultiplier: 1.45,
  },
  guardian: {
    classOrBranchId: 'guardian',
    styleCategory: 'iron_bastion',
    primaryColor: '#10b981',
    secondaryColor: '#0ea5e9',
    accentColor: '#ecfdf5',
    glowColor: '#34d399',
    trailStyle: 'bastion_pulse',
    circleStyle: 'aegis_octagon',
    weaponAuraStyle: 'emerald_bulwark',
    defaultHitStopMs: 58,
    defaultShakeIntensity: 7.0,
    particleDensityMultiplier: 1.35,
  },
  saint: {
    classOrBranchId: 'saint',
    styleCategory: 'seraphic_light',
    primaryColor: '#fef08a',
    secondaryColor: '#fbcfe8',
    accentColor: '#ffffff',
    glowColor: '#fde68a',
    trailStyle: 'holy_ribbon',
    circleStyle: 'seraph_mandala',
    weaponAuraStyle: 'divine_feathers',
    defaultHitStopMs: 30,
    defaultShakeIntensity: 3.0,
    particleDensityMultiplier: 1.55,
  },
  exorcist: {
    classOrBranchId: 'exorcist',
    styleCategory: 'sacred_exorcism',
    primaryColor: '#818cf8',
    secondaryColor: '#fde047',
    accentColor: '#f8fafc',
    glowColor: '#a5b4fc',
    trailStyle: 'exorcism_sigil',
    circleStyle: 'purification_seal',
    weaponAuraStyle: 'judgement_sparks',
    defaultHitStopMs: 46,
    defaultShakeIntensity: 5.5,
    particleDensityMultiplier: 1.5,
  },
  elementalist: {
    classOrBranchId: 'elementalist',
    styleCategory: 'elemental_tempest',
    primaryColor: '#f97316',
    secondaryColor: '#06b6d4',
    accentColor: '#facc15',
    glowColor: '#fb7185',
    trailStyle: 'elemental_orb',
    circleStyle: 'elemental_triad',
    weaponAuraStyle: 'tri_element_orbit',
    defaultHitStopMs: 44,
    defaultShakeIntensity: 6.8,
    particleDensityMultiplier: 1.65,
  },
  arcanist: {
    classOrBranchId: 'arcanist',
    styleCategory: 'arcane_cosmos',
    primaryColor: '#c084fc',
    secondaryColor: '#312e81',
    accentColor: '#f0abfc',
    glowColor: '#d8b4fe',
    trailStyle: 'cosmic_rune',
    circleStyle: 'celestial_astrolabe',
    weaponAuraStyle: 'starlight_orbit',
    defaultHitStopMs: 42,
    defaultShakeIntensity: 6.2,
    particleDensityMultiplier: 1.6,
  },
  shadowblade: {
    classOrBranchId: 'shadowblade',
    styleCategory: 'shadow_assassin',
    primaryColor: '#7e22ce',
    secondaryColor: '#e11d48',
    accentColor: '#f5d0fe',
    glowColor: '#a855f7',
    trailStyle: 'shadow_streak',
    circleStyle: 'shadow_moon',
    weaponAuraStyle: 'violet_mist',
    defaultHitStopMs: 40,
    defaultShakeIntensity: 4.8,
    particleDensityMultiplier: 1.45,
  },
  phantom: {
    classOrBranchId: 'phantom',
    styleCategory: 'spectral_phantom',
    primaryColor: '#2dd4bf',
    secondaryColor: '#7c3aed',
    accentColor: '#ccfbf1',
    glowColor: '#5eead4',
    trailStyle: 'phantom_afterimage',
    circleStyle: 'phantom_eclipse',
    weaponAuraStyle: 'mirage_veil',
    defaultHitStopMs: 36,
    defaultShakeIntensity: 4.2,
    particleDensityMultiplier: 1.5,
  },
  martial_artist: {
    classOrBranchId: 'martial_artist',
    styleCategory: 'chi_grandmaster',
    primaryColor: '#f59e0b',
    secondaryColor: '#ef4444',
    accentColor: '#fef9c3',
    glowColor: '#fbbf24',
    trailStyle: 'chi_shockwave',
    circleStyle: 'lotus_chi',
    weaponAuraStyle: 'golden_fist',
    defaultHitStopMs: 62,
    defaultShakeIntensity: 7.8,
    particleDensityMultiplier: 1.55,
  },
  duelist: {
    classOrBranchId: 'duelist',
    styleCategory: 'tempo_duelist',
    primaryColor: '#fb7185',
    secondaryColor: '#e2e8f0',
    accentColor: '#fde047',
    glowColor: '#fda4af',
    trailStyle: 'rapid_combo_streak',
    circleStyle: 'duelist_compass',
    weaponAuraStyle: 'crimson_wind',
    defaultHitStopMs: 32,
    defaultShakeIntensity: 4.0,
    particleDensityMultiplier: 1.4,
  },
  sniper: {
    classOrBranchId: 'sniper',
    styleCategory: 'precision_sniper',
    primaryColor: '#0ea5e9',
    secondaryColor: '#f8fafc',
    accentColor: '#f43f5e',
    glowColor: '#38bdf8',
    trailStyle: 'snipe_laser',
    circleStyle: 'target_reticle',
    weaponAuraStyle: 'azure_aim',
    defaultHitStopMs: 52,
    defaultShakeIntensity: 6.4,
    particleDensityMultiplier: 1.3,
  },
  ranger: {
    classOrBranchId: 'ranger',
    styleCategory: 'verdant_ranger',
    primaryColor: '#22c55e',
    secondaryColor: '#a3e635',
    accentColor: '#fef08a',
    glowColor: '#4ade80',
    trailStyle: 'leaf_wind_arc',
    circleStyle: 'sylvan_ring',
    weaponAuraStyle: 'spirit_vines',
    defaultHitStopMs: 32,
    defaultShakeIntensity: 4.0,
    particleDensityMultiplier: 1.45,
  },
};

export function resolveClassVfxProfile(classOrBranchId?: string): ClassVfxProfileConfig {
  const key = String(classOrBranchId || 'adventurer').toLowerCase();
  return CLASS_VFX_PROFILES[key] || CLASS_VFX_PROFILES.adventurer;
}

function makeSpriteSkillConfig(
  skillKey: string,
  name: string,
  type: VFXSkillConfig['type'],
  element: string,
  primary: string,
  secondary: string,
  glow: string,
  spriteSheetKey: string,
  opts: {
    scale?: number;
    duration?: number;
    frameCount?: number;
    frameRate?: number;
    directional?: boolean;
    hitStopFrames?: number;
    screenShakeIntensity?: number;
    particleCount?: number;
  } = {}
): VFXSkillConfig {
  return {
    key: skillKey,
    id: skillKey,
    effect_id: skillKey,
    name,
    type,
    element,
    palette: {
      primaryColor: primary,
      secondaryColor: secondary,
      glowColor: glow,
      intensity: 0.94,
    },
    scale: opts.scale ?? 1.0,
    cast_duration: opts.duration ?? 0.6,
    frames: opts.frameCount ?? 8,
    totalFrames: opts.frameCount ?? 8,
    fps: opts.frameRate ?? 16,
    spriteSheet: `/assets/elysia/vfx/${spriteSheetKey}.png`,
    directional: opts.directional ?? true,
    hitStopFrames: opts.hitStopFrames ?? 3,
    screenShakeIntensity: opts.screenShakeIntensity ?? 4,
    particleCount: opts.particleCount ?? 22,
  };
}

export const EXTENDED_SKILL_VFX_CONFIGS: Record<string, VFXSkillConfig> = {
  // Base class signatures matched to real 256px sprite sheets
  vfx_spear_thrust: makeSpriteSkillConfig('vfx_spear_thrust', 'Piercing Spear', 'slash', 'physical', '#38bdf8', '#f59e0b', '#e0f2fe', 'vfx_thrust', { scale: 1.05 }),
  vfx_spear_sweep: makeSpriteSkillConfig('vfx_spear_sweep', 'Spear Sweep', 'slash', 'wind', '#38bdf8', '#7dd3fc', '#bae6fd', 'vfx_spear_sweep', { scale: 1.25 }),
  vfx_shield_bash: makeSpriteSkillConfig('vfx_shield_bash', 'Aegis Shield', 'impact', 'holy', '#fbbf24', '#f8fafc', '#fde68a', 'vfx_divine_shield', { directional: false, hitStopFrames: 4, screenShakeIntensity: 6 }),
  vfx_holy_smite: makeSpriteSkillConfig('vfx_holy_smite', 'Holy Smite', 'aoe', 'holy', '#fde047', '#f59e0b', '#fffbeb', 'vfx_holy_smite', { directional: false, hitStopFrames: 4, screenShakeIntensity: 6 }),
  vfx_shadow_strike: makeSpriteSkillConfig('vfx_shadow_strike', 'Shadow Strike', 'slash', 'shadow', '#9333ea', '#f43f5e', '#e9d5ff', 'vfx_dagger_flurry', { scale: 1.15, hitStopFrames: 3, screenShakeIntensity: 4.5 }),
  vfx_shadow_step: makeSpriteSkillConfig('vfx_shadow_step', 'Shadow Step', 'buff', 'shadow', '#7e22ce', '#2dd4bf', '#d8b4fe', 'vfx_shadow_step', { directional: false }),
  vfx_chi_palm: makeSpriteSkillConfig('vfx_chi_palm', 'Chi Impact', 'impact', 'physical', '#fb923c', '#facc15', '#fff7ed', 'vfx_power_punch', { scale: 1.15, hitStopFrames: 5, screenShakeIntensity: 6.5 }),
  vfx_power_arrow: makeSpriteSkillConfig('vfx_power_arrow', 'Verdant Arrow', 'projectile', 'wind', '#4ade80', '#a3e635', '#dcfce7', 'vfx_moves_arrow_shot', { scale: 1.0 }),
  vfx_frost_nova: makeSpriteSkillConfig('vfx_frost_nova', 'Frost Nova', 'aoe', 'ice', '#38bdf8', '#e0f2fe', '#7dd3fc', 'vfx_frost_nova', { directional: false, scale: 1.3 }),
  vfx_chain_lightning: makeSpriteSkillConfig('vfx_chain_lightning', 'Chain Lightning', 'beam', 'lightning', '#818cf8', '#38bdf8', '#fef08a', 'vfx_lightning_chain_lightning', { scale: 1.25 }),

  // 16 Lv.80 Branch VFX Keys (mapped to existing spritesheets + branch profiles)
  vfx_sword_saint_flash: makeSpriteSkillConfig('vfx_sword_saint_flash', 'Celestial Iaido', 'slash', 'holy', '#38bdf8', '#fef08a', '#ffffff', 'vfx_double_slash', { scale: 1.45, duration: 0.72, hitStopFrames: 4, screenShakeIntensity: 6 }),
  vfx_sword_saint_ult: makeSpriteSkillConfig('vfx_sword_saint_ult', 'Thousand-Sword Halo', 'aoe', 'holy', '#7dd3fc', '#fef9c3', '#ffffff', 'vfx_spin_slash', { scale: 1.8, duration: 0.95, hitStopFrames: 5, screenShakeIntensity: 8, particleCount: 44 }),
  vfx_berserker_cleave: makeSpriteSkillConfig('vfx_berserker_cleave', 'Crimson Guillotine', 'slash', 'fire', '#dc2626', '#f97316', '#fca5a5', 'vfx_heavy_cleave', { scale: 1.55, duration: 0.7, hitStopFrames: 6, screenShakeIntensity: 9, particleCount: 38 }),
  vfx_berserker_ult: makeSpriteSkillConfig('vfx_berserker_ult', 'Ragnarok Bloodstorm', 'aoe', 'fire', '#b91c1c', '#fb923c', '#fecaca', 'vfx_fire_flame_pillar', { directional: false, scale: 1.85, duration: 1.05, hitStopFrames: 7, screenShakeIntensity: 10, particleCount: 48 }),
  vfx_dragoon_dive: makeSpriteSkillConfig('vfx_dragoon_dive', 'Skyfang Lance', 'aoe', 'lightning', '#6366f1', '#22d3ee', '#facc15', 'vfx_dash_strike', { scale: 1.5, duration: 0.78, hitStopFrames: 5, screenShakeIntensity: 8 }),
  vfx_dragoon_ult: makeSpriteSkillConfig('vfx_dragoon_ult', 'Tempest Dragon Descent', 'aoe', 'lightning', '#4f46e5', '#38bdf8', '#fef08a', 'vfx_lightning_strike', { directional: false, scale: 1.8, duration: 1.0, hitStopFrames: 6, screenShakeIntensity: 9 }),
  vfx_warlancer_phalanx: makeSpriteSkillConfig('vfx_warlancer_phalanx', 'Crimson Phalanx', 'slash', 'physical', '#d97706', '#991b1b', '#fef3c7', 'vfx_spear_sweep', { scale: 1.5, duration: 0.75, hitStopFrames: 4, screenShakeIntensity: 6.5 }),
  vfx_warlancer_ult: makeSpriteSkillConfig('vfx_warlancer_ult', 'Grand Legion Halberd', 'aoe', 'earth', '#f59e0b', '#b45309', '#fde68a', 'vfx_earth_stomp', { directional: false, scale: 1.75, duration: 0.95, hitStopFrames: 6, screenShakeIntensity: 8.5 }),
  vfx_paladin_aegis: makeSpriteSkillConfig('vfx_paladin_aegis', 'Solstice Radiance', 'aoe', 'holy', '#facc15', '#fffbeb', '#38bdf8', 'vfx_holy_blessing', { directional: false, scale: 1.45, duration: 0.85, hitStopFrames: 4, screenShakeIntensity: 5 }),
  vfx_paladin_ult: makeSpriteSkillConfig('vfx_paladin_ult', 'Sovereign Dawn Verdict', 'aoe', 'holy', '#fde047', '#f59e0b', '#ffffff', 'vfx_holy_sunburst', { directional: false, scale: 1.85, duration: 1.05, hitStopFrames: 5, screenShakeIntensity: 8 }),
  vfx_guardian_bastion: makeSpriteSkillConfig('vfx_guardian_bastion', 'Emerald Fortress', 'buff', 'earth', '#10b981', '#0ea5e9', '#ecfdf5', 'vfx_divine_shield', { directional: false, scale: 1.55, duration: 0.9, hitStopFrames: 5, screenShakeIntensity: 6 }),
  vfx_guardian_ult: makeSpriteSkillConfig('vfx_guardian_ult', 'Immutable Earth Dome', 'aoe', 'earth', '#059669', '#38bdf8', '#a7f3d0', 'vfx_ground_slam', { directional: false, scale: 1.85, duration: 1.0, hitStopFrames: 6, screenShakeIntensity: 9 }),
  vfx_saint_sanctuary: makeSpriteSkillConfig('vfx_saint_sanctuary', 'Seraphic Sanctuary', 'aoe', 'holy', '#fef08a', '#fbcfe8', '#ffffff', 'vfx_heal_aoe', { directional: false, scale: 1.6, duration: 0.95, hitStopFrames: 2, screenShakeIntensity: 2.5 }),
  vfx_saint_ult: makeSpriteSkillConfig('vfx_saint_ult', 'Celestial Benediction', 'aoe', 'holy', '#fde68a', '#f9a8d4', '#fffbeb', 'vfx_holy_resurrection', { directional: false, scale: 1.9, duration: 1.1, hitStopFrames: 3, screenShakeIntensity: 3.5 }),
  vfx_exorcist_seal: makeSpriteSkillConfig('vfx_exorcist_seal', 'Judgement Talisman', 'aoe', 'holy', '#818cf8', '#fde047', '#f8fafc', 'vfx_holy_holy_pillar', { directional: false, scale: 1.45, duration: 0.8, hitStopFrames: 4, screenShakeIntensity: 6 }),
  vfx_exorcist_ult: makeSpriteSkillConfig('vfx_exorcist_ult', 'Grand Purification Rite', 'aoe', 'lightning', '#6366f1', '#facc15', '#ffffff', 'vfx_holy_sunburst', { directional: false, scale: 1.85, duration: 1.0, hitStopFrames: 5, screenShakeIntensity: 8 }),
  vfx_elementalist_triad: makeSpriteSkillConfig('vfx_elementalist_triad', 'Tri-Elemental Convergence', 'projectile', 'fire', '#f97316', '#06b6d4', '#fde047', 'vfx_fire_meteor', { scale: 1.55, duration: 0.85, hitStopFrames: 4, screenShakeIntensity: 7 }),
  vfx_elementalist_ult: makeSpriteSkillConfig('vfx_elementalist_ult', 'Prismatic Cataclysm', 'aoe', 'ice', '#fb7185', '#38bdf8', '#fef08a', 'vfx_ice_blizzard_vortex', { directional: false, scale: 1.95, duration: 1.1, hitStopFrames: 6, screenShakeIntensity: 9 }),
  vfx_arcanist_nova: makeSpriteSkillConfig('vfx_arcanist_nova', 'Astral Singularity', 'aoe', 'arcane', '#c084fc', '#4f46e5', '#f0abfc', 'vfx_arcane_mana_burst', { directional: false, scale: 1.55, duration: 0.85, hitStopFrames: 4, screenShakeIntensity: 6.5 }),
  vfx_arcanist_ult: makeSpriteSkillConfig('vfx_arcanist_ult', 'Celestial Starfall', 'aoe', 'arcane', '#a855f7', '#312e81', '#fae8ff', 'vfx_arcane_star_fall', { directional: false, scale: 1.95, duration: 1.1, hitStopFrames: 5, screenShakeIntensity: 8.5 }),
  vfx_shadowblade_eviscerate: makeSpriteSkillConfig('vfx_shadowblade_eviscerate', 'Nightfall Execution', 'slash', 'shadow', '#7e22ce', '#e11d48', '#f5d0fe', 'vfx_shadow_dark_explosion', { scale: 1.4, duration: 0.65, hitStopFrames: 5, screenShakeIntensity: 6 }),
  vfx_shadowblade_ult: makeSpriteSkillConfig('vfx_shadowblade_ult', 'Eclipse Assassination', 'aoe', 'shadow', '#581c87', '#be123c', '#fda4af', 'vfx_shadow_life_steal', { directional: false, scale: 1.75, duration: 0.9, hitStopFrames: 6, screenShakeIntensity: 7.5 }),
  vfx_phantom_mirage: makeSpriteSkillConfig('vfx_phantom_mirage', 'Mirage Phantasm', 'slash', 'shadow', '#2dd4bf', '#7c3aed', '#ccfbf1', 'vfx_shadow_step', { scale: 1.45, duration: 0.72, hitStopFrames: 3, screenShakeIntensity: 4.5 }),
  vfx_phantom_ult: makeSpriteSkillConfig('vfx_phantom_ult', 'Spectral Waltz', 'aoe', 'shadow', '#14b8a6', '#6d28d9', '#99f6e4', 'vfx_dagger_flurry', { directional: false, scale: 1.8, duration: 0.95, hitStopFrames: 5, screenShakeIntensity: 6.5 }),
  vfx_martial_dragon: makeSpriteSkillConfig('vfx_martial_dragon', 'Crimson Tiger Fang', 'impact', 'fire', '#f59e0b', '#ef4444', '#fef9c3', 'vfx_power_punch', { scale: 1.5, duration: 0.72, hitStopFrames: 6, screenShakeIntensity: 8 }),
  vfx_martial_ult: makeSpriteSkillConfig('vfx_martial_ult', 'Asura Hundred Palms', 'aoe', 'fire', '#d97706', '#dc2626', '#fde047', 'vfx_ground_slam', { directional: false, scale: 1.85, duration: 1.0, hitStopFrames: 7, screenShakeIntensity: 9.5 }),
  vfx_duelist_flurry: makeSpriteSkillConfig('vfx_duelist_flurry', 'Velocity Riposte', 'slash', 'wind', '#fb7185', '#e2e8f0', '#fde047', 'vfx_sword_combo', { scale: 1.4, duration: 0.65, hitStopFrames: 4, screenShakeIntensity: 5 }),
  vfx_duelist_ult: makeSpriteSkillConfig('vfx_duelist_ult', 'Crimson Finale Dance', 'aoe', 'wind', '#e11d48', '#f8fafc', '#fda4af', 'vfx_double_slash', { directional: false, scale: 1.75, duration: 0.9, hitStopFrames: 5, screenShakeIntensity: 7 }),
  vfx_sniper_railshot: makeSpriteSkillConfig('vfx_sniper_railshot', 'Starlight Railshot', 'beam', 'physical', '#0ea5e9', '#f8fafc', '#f43f5e', 'vfx_projectiles_arrow', { scale: 1.45, duration: 0.65, hitStopFrames: 5, screenShakeIntensity: 7 }),
  vfx_sniper_ult: makeSpriteSkillConfig('vfx_sniper_ult', 'Orbital Piercing Barrage', 'beam', 'lightning', '#0284c7', '#e0f2fe', '#fb7185', 'vfx_moves_arrow_shot', { scale: 1.75, duration: 0.9, hitStopFrames: 6, screenShakeIntensity: 8.5 }),
  vfx_ranger_tempest: makeSpriteSkillConfig('vfx_ranger_tempest', 'Sylvan Leaf Tempest', 'aoe', 'nature', '#22c55e', '#a3e635', '#fef08a', 'vfx_nature_leaf_storm', { directional: false, scale: 1.55, duration: 0.85, hitStopFrames: 3, screenShakeIntensity: 4.5 }),
  vfx_ranger_ult: makeSpriteSkillConfig('vfx_ranger_ult', 'Emerald Canopy Rain', 'aoe', 'nature', '#16a34a', '#84cc16', '#fde047', 'vfx_nature_root_snare', { directional: false, scale: 1.85, duration: 1.0, hitStopFrames: 4, screenShakeIntensity: 6 }),
};
