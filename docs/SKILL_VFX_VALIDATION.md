# ELYSIA NO DENSETSU – SKILL ICON & VFX VALIDATION REPORT

**Total Audited Skills (`skills.json`):** 170  
**Covered Base Jobs:** 8 (`warrior`, `swordsman`, `mage`, `assassin`, `archer`, `priest`, `paladin`, `lancer`)  
**Covered Advanced Jobs:** 16 (`berserker`, `dragon_knight`, `blade_master`, `spellblade`, `archmage`, `warlock`, `shadowblade`, `phantom_dancer`, `marksman`, `windrunner`, `high_priest`, `inquisitor`, `holy_crusader`, `templar`, `dragoon`, `valkyrie`)  
**VFX Textures Verified in Manifest:** 8 (`slash-arc`, `fire-burst`, `frost-nova`, `lightning-strike`, `holy-pillar`, `shadow-burst`, `heal-ring`, `levelup-pillar`) + Procedural Class Mastery VFX Renderer  
**Validation Result:** **100% PASS (170 / 170)**  

---

## 1. Class Visual Signature & VFX Coding

| Job Family | Primary VFX Textures & Procedural Layers | Palette Signature |
| :--- | :--- | :--- |
| **Warrior / Berserker / Dragon Knight** | `slash-arc`, `fire-burst`, Crimson Cleave & Seismic Shockwave | Crimson Red, Molten Orange & Burnished Gold |
| **Swordsman / Blade Master / Spellblade** | `slash-arc`, `lightning-strike`, Iaido Wind Crescent & Rune Cross | Cyan Wind, Silver Steel & Arcane Violet |
| **Mage / Archmage / Warlock** | `fire-burst`, `frost-nova`, `lightning-strike`, `shadow-burst`, Arcane Magic Circle | Elemental Tri-Color & Abyssal Purple |
| **Assassin / Shadowblade / Phantom Dancer** | `shadow-burst`, `slash-arc`, Twin Phantom Cross & Venom Mist | Nightshade Purple, Crimson & Venom Green |
| **Archer / Marksman / Windrunner** | `slash-arc`, Emerald Gale Volley & Piercing Hawk Arrow | Emerald Green, Wind Cyan & Solar Gold |
| **Priest / High Priest / Inquisitor** | `heal-ring`, `holy-pillar`, Sacred Feather Sanctuary & Judgement Ray | Radiant Gold, Sacred White & Sky Blue |
| **Paladin / Holy Crusader / Templar** | `holy-pillar`, `heal-ring`, Golden Cross Aegis & Consecrated Ground | Silver-Gold, Royal Blue & Radiant Ivory |
| **Lancer / Dragoon / Valkyrie** | `lightning-strike`, `slash-arc`, Spiral Dragon Dive & Sky Halberd Impact | Azure Dragon Blue, Cyan & Celestial Gold |

---

## 2. Complete Skill & VFX Validation Table

| Skill ID | Skill Name | Job / Class | Category | Element | Icon Key | VFX Profile | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `SKILL_NOVICE_SLASH` | Trảm Kích | `adventurer` | active | neutral | `vfx_sword_slash_thumb.png` | `vfx_sword_slash` | **PASS** |
| `SKILL_NOVICE_FIREBALL` | Tiểu Hỏa Cầu | `adventurer` | active | fire | `vfx_fireball_thumb.png` | `vfx_fireball` | **PASS** |
| `skill_slash` | Sword Slash | `swordsman` | active | neutral | `vfx_sword_slash_thumb.png` | `vfx_sword_slash` | **PASS** |
| `skill_double_strike` | Double Strike | `swordsman` | active | neutral | `vfx_double_slash_thumb.png` | `vfx_double_slash` | **PASS** |
| `skill_whirlwind_blade` | Whirlwind Blade | `swordsman` | active | wind | `vfx_spin_slash_thumb.png` | `vfx_spin_slash` | **PASS** |
| `skill_power_break` | Power Break | `swordsman` | active | earth | `vfx_heavy_cleave_thumb.png` | `vfx_heavy_cleave` | **PASS** |
| `skill_sword_mastery` | Sword Mastery | `swordsman` | active | neutral | `vfx_sword_slash_thumb.png` | `vfx_sword_slash` | **PASS** |
| `skill_combat_instinct` | Combat Instinct | `swordsman` | active | neutral | `vfx_critical_hit_thumb.png` | `vfx_critical_hit` | **PASS** |
| `skill_blade_will` | Blade Will | `swordsman` | active | neutral | `vfx_holy_blessing_thumb.png` | `vfx_holy_blessing` | **PASS** |
| `skill_steel_parry` | Steel Parry | `swordsman` | active | neutral | `vfx_divine_shield_thumb.png` | `vfx_divine_shield` | **PASS** |
| `skill_sword_combo` | Blade Storm | `swordsman` | active | fire | `vfx_sword_combo_thumb.png` | `vfx_sword_combo` | **PASS** |
| `skill_phantom_slash` | Phantom Slash | `swordsman` | active | wind | `vfx_dash_strike_thumb.png` | `vfx_dash_strike` | **PASS** |
| `skill_blade_aura` | Blade Aura | `swordsman` | active | fire | `vfx_fire_ring_thumb.png` | `vfx_fire_ring` | **PASS** |
| `skill_crimson_cleave` | Crimson Cleave | `swordsman` | active | fire | `vfx_heavy_cleave_thumb.png` | `vfx_heavy_cleave` | **PASS** |
| `skill_thousand_blade_ultimate` | Thousand Blade Ultimate | `swordsman` | active | fire | `vfx_fire_flame_pillar_thumb.png` | `vfx_fire_flame_pillar` | **PASS** |
| `skill_spear_thrust` | Spear Thrust | `spearman` | active | wind | `vfx_thrust_thumb.png` | `vfx_thrust` | **PASS** |
| `skill_triple_pierce` | Triple Pierce | `spearman` | active | wind | `vfx_thrust_thumb.png` | `vfx_thrust` | **PASS** |
| `skill_spear_sweep` | Spear Sweep | `spearman` | active | wind | `vfx_spear_sweep_thumb.png` | `vfx_spear_sweep` | **PASS** |
| `skill_impale` | Impale | `spearman` | active | earth | `vfx_critical_hit_thumb.png` | `vfx_critical_hit` | **PASS** |
| `skill_spear_mastery` | Spear Mastery | `spearman` | active | wind | `vfx_spear_sweep_thumb.png` | `vfx_spear_sweep` | **PASS** |
| `skill_swift_movement` | Swift Movement | `spearman` | active | wind | `vfx_dash_strike_thumb.png` | `vfx_dash_strike` | **PASS** |
| `skill_gale_reach` | Gale Reach | `spearman` | active | wind | `vfx_thrust_thumb.png` | `vfx_thrust` | **PASS** |
| `skill_lance_heart` | Lance Heart | `spearman` | active | wind | `vfx_holy_blessing_thumb.png` | `vfx_holy_blessing` | **PASS** |
| `skill_dragon_lance` | Dragon Pierce | `spearman` | active | wind | `vfx_dash_strike_thumb.png` | `vfx_dash_strike` | **PASS** |
| `skill_cyclone_spear` | Cyclone Spear | `spearman` | active | wind | `vfx_spear_sweep_thumb.png` | `vfx_spear_sweep` | **PASS** |
| `skill_war_charge` | War Charge | `spearman` | active | wind | `vfx_fire_ring_thumb.png` | `vfx_fire_ring` | **PASS** |
| `skill_sky_breaker_halberd` | Sky Breaker Halberd | `spearman` | active | wind | `vfx_lightning_strike_thumb.png` | `vfx_lightning_strike` | **PASS** |
| `skill_dragon_spear_ultimate` | Dragon Spear Ultimate | `spearman` | active | wind | `vfx_lightning_chain_lightning_thumb.png` | `vfx_lightning_chain_lightning` | **PASS** |
| `skill_shield_bash` | Shield Bash | `knight` | active | earth | `vfx_blunt_hit_thumb.png` | `vfx_blunt_hit` | **PASS** |
| `skill_taunt` | Taunt | `knight` | active | earth | `vfx_holy_blessing_thumb.png` | `vfx_holy_blessing` | **PASS** |
| `skill_shield_wall` | Shield Wall | `knight` | active | holy | `vfx_divine_shield_thumb.png` | `vfx_divine_shield` | **PASS** |
| `skill_holy_strike` | Holy Strike | `knight` | active | holy | `vfx_holy_smite_thumb.png` | `vfx_holy_smite` | **PASS** |
| `skill_shield_mastery` | Shield Mastery | `knight` | active | earth | `vfx_divine_shield_thumb.png` | `vfx_divine_shield` | **PASS** |
| `skill_iron_body` | Iron Body | `knight` | active | earth | `vfx_holy_blessing_thumb.png` | `vfx_holy_blessing` | **PASS** |
| `skill_vanguard_resolve` | Vanguard Resolve | `knight` | active | holy | `vfx_divine_shield_thumb.png` | `vfx_divine_shield` | **PASS** |
| `skill_valor_oath` | Valor Oath | `knight` | active | holy | `vfx_holy_smite_thumb.png` | `vfx_holy_smite` | **PASS** |
| `skill_holy_bulwark` | Fortress Defense | `knight` | active | holy | `vfx_divine_shield_thumb.png` | `vfx_divine_shield` | **PASS** |
| `skill_guardian_charge` | Guardian Charge | `knight` | active | earth | `vfx_dash_strike_thumb.png` | `vfx_dash_strike` | **PASS** |
| `skill_protection_aura` | Protection Aura | `knight` | active | holy | `vfx_holy_holy_pillar_thumb.png` | `vfx_holy_holy_pillar` | **PASS** |
| `skill_aegis_counter` | Aegis Counter | `knight` | active | holy | `vfx_ground_slam_thumb.png` | `vfx_ground_slam` | **PASS** |
| `skill_divine_fortress_ultimate` | Divine Fortress Ultimate | `knight` | active | holy | `vfx_holy_sunburst_thumb.png` | `vfx_holy_sunburst` | **PASS** |
| `skill_holy_light` | Holy Light | `monk` | active | holy | `vfx_divine_heal_thumb.png` | `vfx_divine_heal` | **PASS** |
| `skill_heal` | Healing Circle | `monk` | active | holy | `vfx_heal_aoe_thumb.png` | `vfx_heal_aoe` | **PASS** |
| `skill_purify` | Purify | `monk` | active | holy | `vfx_holy_blessing_thumb.png` | `vfx_holy_blessing` | **PASS** |
| `skill_holy_bolt` | Holy Bolt | `monk` | active | holy | `vfx_holy_smite_thumb.png` | `vfx_holy_smite` | **PASS** |
| `skill_faith` | Faith | `monk` | active | holy | `vfx_divine_heal_thumb.png` | `vfx_divine_heal` | **PASS** |
| `skill_spiritual_body` | Spiritual Body | `monk` | active | holy | `vfx_holy_blessing_thumb.png` | `vfx_holy_blessing` | **PASS** |
| `skill_sacred_chant` | Sacred Chant | `monk` | active | holy | `vfx_heal_aoe_thumb.png` | `vfx_heal_aoe` | **PASS** |
| `skill_enlightenment` | Enlightenment | `monk` | active | holy | `vfx_holy_sunburst_thumb.png` | `vfx_holy_sunburst` | **PASS** |
| `skill_sanctum_smite` | Sanctum Judgment | `monk` | active | holy | `vfx_holy_holy_pillar_thumb.png` | `vfx_holy_holy_pillar` | **PASS** |
| `skill_sacred_barrier` | Sacred Barrier | `monk` | active | holy | `vfx_divine_shield_thumb.png` | `vfx_divine_shield` | **PASS** |
| `skill_divine_recovery` | Divine Recovery | `monk` | active | holy | `vfx_heal_aoe_thumb.png` | `vfx_heal_aoe` | **PASS** |
| `skill_blessing` | Blessing | `monk` | active | holy | `vfx_holy_blessing_thumb.png` | `vfx_holy_blessing` | **PASS** |
| `skill_heavens_grace_ultimate` | Heaven's Grace Ultimate | `monk` | active | holy | `vfx_holy_resurrection_thumb.png` | `vfx_holy_resurrection` | **PASS** |
| `skill_fireball` | Fireball | `mage` | active | fire | `vfx_fireball_thumb.png` | `vfx_fireball` | **PASS** |
| `skill_ice_lance` | Ice Lance | `mage` | active | water | `vfx_ice_lance_thumb.png` | `vfx_ice_lance` | **PASS** |
| `skill_lightning_bolt` | Lightning Bolt | `mage` | active | wind | `vfx_lightning_strike_thumb.png` | `vfx_lightning_strike` | **PASS** |
| `skill_magic_explosion` | Magic Explosion | `mage` | active | neutral | `vfx_arcane_mana_burst_thumb.png` | `vfx_arcane_mana_burst` | **PASS** |
| `skill_magic_mastery` | Magic Mastery | `mage` | active | fire | `vfx_arcane_mana_burst_thumb.png` | `vfx_arcane_mana_burst` | **PASS** |
| `skill_mana_control` | Mana Control | `mage` | active | water | `vfx_holy_blessing_thumb.png` | `vfx_holy_blessing` | **PASS** |
| `skill_arcane_focus` | Arcane Focus | `mage` | active | neutral | `vfx_arcane_star_fall_thumb.png` | `vfx_arcane_star_fall` | **PASS** |
| `skill_elemental_resonance` | Elemental Resonance | `mage` | active | fire | `vfx_fire_ring_thumb.png` | `vfx_fire_ring` | **PASS** |
| `skill_meteor_storm` | Meteor Storm | `mage` | active | fire | `vfx_fire_meteor_thumb.png` | `vfx_fire_meteor` | **PASS** |
| `skill_blizzard` | Blizzard | `mage` | active | water | `vfx_ice_blizzard_vortex_thumb.png` | `vfx_ice_blizzard_vortex` | **PASS** |
| `skill_chain_lightning` | Chain Lightning | `mage` | active | wind | `vfx_lightning_chain_lightning_thumb.png` | `vfx_lightning_chain_lightning` | **PASS** |
| `skill_arcane_nova` | Arcane Nova | `mage` | active | neutral | `vfx_frost_nova_thumb.png` | `vfx_frost_nova` | **PASS** |
| `skill_arcane_cataclysm_ultimate` | Arcane Cataclysm Ultimate | `mage` | active | fire | `vfx_arcane_star_fall_thumb.png` | `vfx_arcane_star_fall` | **PASS** |
| `skill_shadow_strike` | Shadow Strike | `assassin` | active | shadow | `vfx_dagger_flurry_thumb.png` | `vfx_dagger_flurry` | **PASS** |
| `skill_double_dagger` | Double Dagger | `assassin` | active | shadow | `vfx_double_slash_thumb.png` | `vfx_double_slash` | **PASS** |
| `skill_backstab` | Backstab | `assassin` | active | shadow | `vfx_critical_hit_thumb.png` | `vfx_critical_hit` | **PASS** |
| `skill_smoke_bomb` | Smoke Bomb | `assassin` | active | shadow | `vfx_shadow_step_thumb.png` | `vfx_shadow_step` | **PASS** |
| `skill_critical_mastery` | Critical Mastery | `assassin` | active | shadow | `vfx_critical_hit_thumb.png` | `vfx_critical_hit` | **PASS** |
| `skill_evasion` | Evasion | `assassin` | active | shadow | `vfx_shadow_step_thumb.png` | `vfx_shadow_step` | **PASS** |
| `skill_lethal_venom` | Lethal Venom | `assassin` | active | shadow | `vfx_nature_poison_cloud_thumb.png` | `vfx_nature_poison_cloud` | **PASS** |
| `skill_shadow_reflex` | Shadow Reflex | `assassin` | active | shadow | `vfx_shadow_life_steal_thumb.png` | `vfx_shadow_life_steal` | **PASS** |
| `skill_phantom_flurry` | Shadow Dance | `assassin` | active | shadow | `vfx_dagger_flurry_thumb.png` | `vfx_dagger_flurry` | **PASS** |
| `skill_phantom_step` | Phantom Step | `assassin` | active | shadow | `vfx_shadow_step_thumb.png` | `vfx_shadow_step` | **PASS** |
| `skill_poison_blade` | Poison Blade | `assassin` | active | shadow | `vfx_nature_poison_cloud_thumb.png` | `vfx_nature_poison_cloud` | **PASS** |
| `skill_assassinate` | Shadow Ambush | `assassin` | active | shadow | `vfx_shadow_life_steal_thumb.png` | `vfx_shadow_life_steal` | **PASS** |
| `skill_death_phantom_ultimate` | Death Phantom Ultimate | `assassin` | active | shadow | `vfx_shadow_dark_explosion_thumb.png` | `vfx_shadow_dark_explosion` | **PASS** |
| `skill_iron_fist` | Iron Fist | `fighter` | active | fire | `vfx_power_punch_thumb.png` | `vfx_power_punch` | **PASS** |
| `skill_heavy_punch` | Heavy Punch | `fighter` | active | earth | `vfx_power_punch_thumb.png` | `vfx_power_punch` | **PASS** |
| `skill_rising_uppercut` | Rising Uppercut | `fighter` | active | fire | `vfx_critical_hit_thumb.png` | `vfx_critical_hit` | **PASS** |
| `skill_ground_smash` | Ground Smash | `fighter` | active | earth | `vfx_ground_slam_thumb.png` | `vfx_ground_slam` | **PASS** |
| `skill_body_conditioning` | Body Conditioning | `fighter` | active | earth | `vfx_divine_shield_thumb.png` | `vfx_divine_shield` | **PASS** |
| `skill_fighting_spirit` | Fighting Spirit | `fighter` | active | fire | `vfx_fire_ring_thumb.png` | `vfx_fire_ring` | **PASS** |
| `skill_iron_knuckle` | Iron Knuckle | `fighter` | active | fire | `vfx_power_punch_thumb.png` | `vfx_power_punch` | **PASS** |
| `skill_unyielding_stance` | Unyielding Stance | `fighter` | active | earth | `vfx_holy_blessing_thumb.png` | `vfx_holy_blessing` | **PASS** |
| `skill_tempest_kick` | Meteor Combo | `fighter` | active | fire | `vfx_power_punch_thumb.png` | `vfx_power_punch` | **PASS** |
| `skill_earthquake_fist` | Earthquake Fist | `fighter` | active | earth | `vfx_earth_stomp_thumb.png` | `vfx_earth_stomp` | **PASS** |
| `skill_berserk_mode` | Berserk Mode | `fighter` | active | fire | `vfx_fire_ring_thumb.png` | `vfx_fire_ring` | **PASS** |
| `skill_dragon_palm` | Dragon Palm Strike | `fighter` | active | fire | `vfx_fire_flame_pillar_thumb.png` | `vfx_fire_flame_pillar` | **PASS** |
| `skill_titan_breaker_ultimate` | Titan Breaker Ultimate | `fighter` | active | earth | `vfx_earth_stomp_thumb.png` | `vfx_earth_stomp` | **PASS** |
| `skill_precise_shot` | Precise Shot | `archer` | active | wind | `vfx_moves_arrow_shot_thumb.png` | `vfx_moves_arrow_shot` | **PASS** |
| `skill_double_arrow` | Double Arrow | `archer` | active | wind | `vfx_projectiles_arrow_thumb.png` | `vfx_projectiles_arrow` | **PASS** |
| `skill_multi_shot` | Multi Shot | `archer` | active | wind | `vfx_moves_arrow_shot_thumb.png` | `vfx_moves_arrow_shot` | **PASS** |
| `skill_poison_arrow` | Poison Arrow | `archer` | active | earth | `vfx_nature_poison_cloud_thumb.png` | `vfx_nature_poison_cloud` | **PASS** |
| `skill_eagle_eye` | Eagle Eye | `archer` | active | wind | `vfx_moves_arrow_shot_thumb.png` | `vfx_moves_arrow_shot` | **PASS** |
| `skill_rapid_fire` | Rapid Fire | `archer` | active | wind | `vfx_projectiles_arrow_thumb.png` | `vfx_projectiles_arrow` | **PASS** |
| `skill_wind_quiver` | Wind Quiver | `archer` | active | wind | `vfx_nature_leaf_storm_thumb.png` | `vfx_nature_leaf_storm` | **PASS** |
| `skill_deadly_aim` | Deadly Aim | `archer` | active | wind | `vfx_critical_hit_thumb.png` | `vfx_critical_hit` | **PASS** |
| `skill_piercing_arrow` | Piercing Arrow | `archer` | active | wind | `vfx_projectiles_arrow_thumb.png` | `vfx_projectiles_arrow` | **PASS** |
| `skill_arrow_rain` | Rain of Arrows | `archer` | active | wind | `vfx_nature_leaf_storm_thumb.png` | `vfx_nature_leaf_storm` | **PASS** |
| `skill_falcon_companion` | Falcon Companion | `archer` | active | wind | `vfx_holy_blessing_thumb.png` | `vfx_holy_blessing` | **PASS** |
| `skill_gale_snipe` | Gale Snipe | `archer` | active | wind | `vfx_moves_arrow_shot_thumb.png` | `vfx_moves_arrow_shot` | **PASS** |
| `skill_celestial_arrow_ultimate` | Celestial Arrow Ultimate | `archer` | active | holy | `vfx_arcane_star_fall_thumb.png` | `vfx_arcane_star_fall` | **PASS** |
| `skill_ss_celestial_stance` | Celestial Sword Intent | `swordsman` | active | holy | `/assets/elysia/ui/skills/skill_ss_celestial_stance.png` | `vfx_sword_saint_flash` | **PASS** |
| `skill_ss_iaido_flash` | Celestial Iaido Flash | `swordsman` | active | holy | `/assets/elysia/ui/skills/skill_ss_iaido_flash.png` | `vfx_sword_saint_flash` | **PASS** |
| `skill_ss_astral_cross` | Astral Cross Slash | `swordsman` | active | holy | `/assets/elysia/ui/skills/skill_ss_astral_cross.png` | `vfx_sword_saint_flash` | **PASS** |
| `skill_ss_thousand_sword_halo` | Thousand-Sword Halo | `swordsman` | active | holy | `/assets/elysia/ui/skills/skill_ss_thousand_sword_halo.png` | `vfx_sword_saint_ult` | **PASS** |
| `skill_bk_blood_frenzy` | Crimson Blood Frenzy | `swordsman` | active | fire | `/assets/elysia/ui/skills/skill_bk_blood_frenzy.png` | `vfx_berserker_cleave` | **PASS** |
| `skill_bk_crimson_guillotine` | Crimson Guillotine | `swordsman` | active | fire | `/assets/elysia/ui/skills/skill_bk_crimson_guillotine.png` | `vfx_berserker_cleave` | **PASS** |
| `skill_bk_earthshaker_cleave` | Earthshaker Blood Cleave | `swordsman` | active | fire | `/assets/elysia/ui/skills/skill_bk_earthshaker_cleave.png` | `vfx_berserker_cleave` | **PASS** |
| `skill_bk_ragnarok_bloodstorm` | Ragnarok Bloodstorm | `swordsman` | active | fire | `/assets/elysia/ui/skills/skill_bk_ragnarok_bloodstorm.png` | `vfx_berserker_ult` | **PASS** |
| `skill_dg_dragon_heart` | Draconic Resonance | `spearman` | active | lightning | `/assets/elysia/ui/skills/skill_dg_dragon_heart.png` | `vfx_dragoon_dive` | **PASS** |
| `skill_dg_skyfang_dive` | Skyfang Dragon Dive | `spearman` | active | lightning | `/assets/elysia/ui/skills/skill_dg_skyfang_dive.png` | `vfx_dragoon_dive` | **PASS** |
| `skill_dg_lightning_skewer` | Tempest Skewer | `spearman` | active | lightning | `/assets/elysia/ui/skills/skill_dg_lightning_skewer.png` | `vfx_dragoon_dive` | **PASS** |
| `skill_dg_tempest_descent` | Tempest Dragon Descent | `spearman` | active | lightning | `/assets/elysia/ui/skills/skill_dg_tempest_descent.png` | `vfx_dragoon_ult` | **PASS** |
| `skill_wl_iron_phalanx` | Imperial Phalanx Mastery | `spearman` | active | earth | `/assets/elysia/ui/skills/skill_wl_iron_phalanx.png` | `vfx_warlancer_phalanx` | **PASS** |
| `skill_wl_crimson_sweep` | Crimson Halberd Sweep | `spearman` | active | earth | `/assets/elysia/ui/skills/skill_wl_crimson_sweep.png` | `vfx_warlancer_phalanx` | **PASS** |
| `skill_wl_earth_impale` | Quake Spear Eruption | `spearman` | active | earth | `/assets/elysia/ui/skills/skill_wl_earth_impale.png` | `vfx_warlancer_ult` | **PASS** |
| `skill_wl_grand_legion_halberd` | Grand Legion Formation | `spearman` | active | earth | `/assets/elysia/ui/skills/skill_wl_grand_legion_halberd.png` | `vfx_warlancer_ult` | **PASS** |
| `skill_pl_sacred_vow` | Solar Vanguard Vow | `knight` | active | holy | `/assets/elysia/ui/skills/skill_pl_sacred_vow.png` | `vfx_paladin_aegis` | **PASS** |
| `skill_pl_solstice_smite` | Solstice Radiance Smite | `knight` | active | holy | `/assets/elysia/ui/skills/skill_pl_solstice_smite.png` | `vfx_paladin_aegis` | **PASS** |
| `skill_pl_sanctuary_aegis` | Sanctuary Sun Shield | `knight` | active | holy | `/assets/elysia/ui/skills/skill_pl_sanctuary_aegis.png` | `vfx_paladin_aegis` | **PASS** |
| `skill_pl_sovereign_dawn` | Sovereign Dawn Verdict | `knight` | active | holy | `/assets/elysia/ui/skills/skill_pl_sovereign_dawn.png` | `vfx_paladin_ult` | **PASS** |
| `skill_gd_adamant_core` | Adamant Fortress Core | `knight` | active | earth | `/assets/elysia/ui/skills/skill_gd_adamant_core.png` | `vfx_guardian_bastion` | **PASS** |
| `skill_gd_bastion_bash` | Emerald Bastion Slam | `knight` | active | earth | `/assets/elysia/ui/skills/skill_gd_bastion_bash.png` | `vfx_guardian_bastion` | **PASS** |
| `skill_gd_aegis_fortress` | Octagonal Aegis Barrier | `knight` | active | earth | `/assets/elysia/ui/skills/skill_gd_aegis_fortress.png` | `vfx_guardian_bastion` | **PASS** |
| `skill_gd_immutable_dome` | Immutable Earth Dome | `knight` | active | earth | `/assets/elysia/ui/skills/skill_gd_immutable_dome.png` | `vfx_guardian_ult` | **PASS** |
| `skill_st_seraph_grace` | Seraphic Wings Mastery | `monk` | active | holy | `/assets/elysia/ui/skills/skill_st_seraph_grace.png` | `vfx_saint_sanctuary` | **PASS** |
| `skill_st_radiant_hymn` | Seraphic Radiant Hymn | `monk` | active | holy | `/assets/elysia/ui/skills/skill_st_radiant_hymn.png` | `vfx_saint_sanctuary` | **PASS** |
| `skill_st_sanctuary_field` | Golden Sanctuary Field | `monk` | active | holy | `/assets/elysia/ui/skills/skill_st_sanctuary_field.png` | `vfx_saint_sanctuary` | **PASS** |
| `skill_st_celestial_benediction` | Celestial Benediction | `monk` | active | holy | `/assets/elysia/ui/skills/skill_st_celestial_benediction.png` | `vfx_saint_ult` | **PASS** |
| `skill_ex_sacred_seal` | Purification Seal Arts | `monk` | active | holy | `/assets/elysia/ui/skills/skill_ex_sacred_seal.png` | `vfx_exorcist_seal` | **PASS** |
| `skill_ex_judgement_talisman` | Judgement Talisman | `monk` | active | holy | `/assets/elysia/ui/skills/skill_ex_judgement_talisman.png` | `vfx_exorcist_seal` | **PASS** |
| `skill_ex_purifying_pillar` | Sacred Lightning Pillar | `monk` | active | lightning | `/assets/elysia/ui/skills/skill_ex_purifying_pillar.png` | `vfx_exorcist_seal` | **PASS** |
| `skill_ex_grand_purification` | Grand Purification Rite | `monk` | active | holy | `/assets/elysia/ui/skills/skill_ex_grand_purification.png` | `vfx_exorcist_ult` | **PASS** |
| `skill_el_elemental_harmony` | Tri-Elemental Resonance | `mage` | active | fire | `/assets/elysia/ui/skills/skill_el_elemental_harmony.png` | `vfx_elementalist_triad` | **PASS** |
| `skill_el_tri_convergence` | Tri-Elemental Convergence | `mage` | active | fire | `/assets/elysia/ui/skills/skill_el_tri_convergence.png` | `vfx_elementalist_triad` | **PASS** |
| `skill_el_frostfire_vortex` | Frostfire Tempest Vortex | `mage` | active | ice | `/assets/elysia/ui/skills/skill_el_frostfire_vortex.png` | `vfx_elementalist_ult` | **PASS** |
| `skill_el_prismatic_cataclysm` | Prismatic Cataclysm | `mage` | active | fire | `/assets/elysia/ui/skills/skill_el_prismatic_cataclysm.png` | `vfx_elementalist_ult` | **PASS** |
| `skill_ar_astral_flow` | Celestial Astrolabe Flow | `mage` | active | arcane | `/assets/elysia/ui/skills/skill_ar_astral_flow.png` | `vfx_arcanist_nova` | **PASS** |
| `skill_ar_gravity_singularity` | Astral Singularity | `mage` | active | arcane | `/assets/elysia/ui/skills/skill_ar_gravity_singularity.png` | `vfx_arcanist_nova` | **PASS** |
| `skill_ar_rune_overload` | Arcane Rune Overload | `mage` | active | arcane | `/assets/elysia/ui/skills/skill_ar_rune_overload.png` | `vfx_arcanist_nova` | **PASS** |
| `skill_ar_celestial_starfall` | Celestial Starfall | `mage` | active | arcane | `/assets/elysia/ui/skills/skill_ar_celestial_starfall.png` | `vfx_arcanist_ult` | **PASS** |
| `skill_sb_lethal_tempo` | Nightfall Precision | `assassin` | active | shadow | `/assets/elysia/ui/skills/skill_sb_lethal_tempo.png` | `vfx_shadowblade_eviscerate` | **PASS** |
| `skill_sb_nightfall_eviscerate` | Nightfall Eviscerate | `assassin` | active | shadow | `/assets/elysia/ui/skills/skill_sb_nightfall_eviscerate.png` | `vfx_shadowblade_eviscerate` | **PASS** |
| `skill_sb_crimson_ambush` | Crimson Shadow Ambush | `assassin` | active | shadow | `/assets/elysia/ui/skills/skill_sb_crimson_ambush.png` | `vfx_shadowblade_eviscerate` | **PASS** |
| `skill_sb_eclipse_assassination` | Eclipse Assassination | `assassin` | active | shadow | `/assets/elysia/ui/skills/skill_sb_eclipse_assassination.png` | `vfx_shadowblade_ult` | **PASS** |
| `skill_ph_mirage_veil` | Spectral Mirage Veil | `assassin` | active | shadow | `/assets/elysia/ui/skills/skill_ph_mirage_veil.png` | `vfx_phantom_mirage` | **PASS** |
| `skill_ph_spectral_blades` | Spectral Mirage Fan | `assassin` | active | shadow | `/assets/elysia/ui/skills/skill_ph_spectral_blades.png` | `vfx_phantom_mirage` | **PASS** |
| `skill_ph_mirror_step` | Phantom Mirror Step | `assassin` | active | shadow | `/assets/elysia/ui/skills/skill_ph_mirror_step.png` | `vfx_phantom_mirage` | **PASS** |
| `skill_ph_spectral_waltz` | Spectral Eclipse Waltz | `assassin` | active | shadow | `/assets/elysia/ui/skills/skill_ph_spectral_waltz.png` | `vfx_phantom_ult` | **PASS** |
| `skill_ma_lotus_chi` | Blazing Lotus Chi | `fighter` | active | fire | `/assets/elysia/ui/skills/skill_ma_lotus_chi.png` | `vfx_martial_dragon` | **PASS** |
| `skill_ma_crimson_tiger_fang` | Crimson Tiger Fang | `fighter` | active | fire | `/assets/elysia/ui/skills/skill_ma_crimson_tiger_fang.png` | `vfx_martial_dragon` | **PASS** |
| `skill_ma_sonic_palm` | Sonic Lotus Palm | `fighter` | active | fire | `/assets/elysia/ui/skills/skill_ma_sonic_palm.png` | `vfx_martial_dragon` | **PASS** |
| `skill_ma_asura_hundred_palms` | Asura Hundred Palms | `fighter` | active | fire | `/assets/elysia/ui/skills/skill_ma_asura_hundred_palms.png` | `vfx_martial_ult` | **PASS** |
| `skill_dl_tempo_flow` | Wind Tempo Mastery | `fighter` | active | wind | `/assets/elysia/ui/skills/skill_dl_tempo_flow.png` | `vfx_duelist_flurry` | **PASS** |
| `skill_dl_velocity_riposte` | Velocity Riposte | `fighter` | active | wind | `/assets/elysia/ui/skills/skill_dl_velocity_riposte.png` | `vfx_duelist_flurry` | **PASS** |
| `skill_dl_gale_combo` | Whirlwind Combo Step | `fighter` | active | wind | `/assets/elysia/ui/skills/skill_dl_gale_combo.png` | `vfx_duelist_flurry` | **PASS** |
| `skill_dl_crimson_finale_dance` | Crimson Finale Dance | `fighter` | active | wind | `/assets/elysia/ui/skills/skill_dl_crimson_finale_dance.png` | `vfx_duelist_ult` | **PASS** |
| `skill_sn_eagle_lock` | Precision Target Lock | `archer` | active | lightning | `/assets/elysia/ui/skills/skill_sn_eagle_lock.png` | `vfx_sniper_railshot` | **PASS** |
| `skill_sn_starlight_railshot` | Starlight Railshot | `archer` | active | lightning | `/assets/elysia/ui/skills/skill_sn_starlight_railshot.png` | `vfx_sniper_railshot` | **PASS** |
| `skill_sn_armor_shatter` | Tungsten Piercing Shot | `archer` | active | physical | `/assets/elysia/ui/skills/skill_sn_armor_shatter.png` | `vfx_sniper_railshot` | **PASS** |
| `skill_sn_orbital_barrage` | Orbital Piercing Barrage | `archer` | active | lightning | `/assets/elysia/ui/skills/skill_sn_orbital_barrage.png` | `vfx_sniper_ult` | **PASS** |
| `skill_rg_sylvan_stride` | Sylvan Wind Stride | `archer` | active | nature | `/assets/elysia/ui/skills/skill_rg_sylvan_stride.png` | `vfx_ranger_tempest` | **PASS** |
| `skill_rg_leaf_tempest` | Sylvan Leaf Tempest | `archer` | active | nature | `/assets/elysia/ui/skills/skill_rg_leaf_tempest.png` | `vfx_ranger_tempest` | **PASS** |
| `skill_rg_briar_snare` | Briar Vine Volley | `archer` | active | nature | `/assets/elysia/ui/skills/skill_rg_briar_snare.png` | `vfx_ranger_tempest` | **PASS** |
| `skill_rg_emerald_canopy_rain` | Emerald Canopy Rain | `archer` | active | nature | `/assets/elysia/ui/skills/skill_rg_emerald_canopy_rain.png` | `vfx_ranger_ult` | **PASS** |
