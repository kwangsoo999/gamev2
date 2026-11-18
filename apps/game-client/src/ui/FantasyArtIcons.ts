import type { EquipSlotKey, InventoryItemDef } from '../engine/types';

/**
 * Shared hand-painted icon artwork for HUD, inventory and skill panels.
 * SVG wrappers retain the existing UI API and scale the local PNGs cleanly.
 */

/** Fixed local artwork paths keep catalog keys out of HTML attributes. */
function artworkIcon(group: 'items' | 'skills', name: string): string {
  return `<svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true" focusable="false"><image href="/assets/elysia/ui/${group}/${name}.png" width="64" height="64" preserveAspectRatio="xMidYMid meet" /></svg>`;
}

export function getSkillIconSvg(iconKey: string): string {
  const key = String(iconKey || '').toLowerCase();
  const rules: [string, RegExp][] = [
    ['resurrection', /resurrect|angel/], ['double-slash', /double|triple/],
    ['whirlwind', /spin|whirlwind/], ['cleave', /cleave|heavy|break/],
    ['fire', /fire|flame|meteor|berserk/], ['ice', /ice|frost|blizzard/],
    ['lightning', /lightning|thunder|railshot/],
    ['holy', /holy|heal|divine|bless|saint|exorcist|sunburst|golden_aura/],
    ['shadow', /shadow|dagger|poison|phantom|dark|assassin/],
    ['bow', /arrow|bow|ranger|sniper/], ['spear', /spear|thrust|lance|dragoon/],
    ['shield', /shield|guardian|aegis|paladin|bastion/],
    ['arcane', /arcane|star|mana|arcanist|elementalist/],
    ['nature', /root|leaf|nature|vine/], ['water', /water|wave|hydro/],
    ['wind', /wind|tornado/],
  ];
  return artworkIcon('skills', rules.find(([, pattern]) => pattern.test(key))?.[0] || 'cleave');
}

export function getBackpackIconSvg(): string {
  return artworkIcon('items', 'backpack');
}

export function getPadlockSmallSvg(): string {
  return `<svg viewBox="0 0 24 24" width="13" height="13">
    <path d="M7 10 V7 a5 5 0 0 1 10 0 v3" fill="none" stroke="#c59f59" stroke-width="2.2" stroke-linecap="round"/>
    <rect x="5" y="10" width="14" height="11" rx="2.5" fill="#7c5e34" stroke="#e6c675" stroke-width="1.4"/>
    <circle cx="12" cy="15.5" r="1.5" fill="#1e150c"/>
  </svg>`;
}

export function getItemIconSvg(iconKey: string): string {
  const key = String(iconKey || '').toLowerCase();
  const canonical = new Set([
    'sword_novice', 'excalibur_sword_icon', 'shield_oak', 'tunic_explorer', 'helm_bronze',
    'gloves_leather', 'boots_leather', 'amulet_jade', 'potion_hp', 'potion_mp', 'bread_loaf',
    'herb_green', 'wood_oak', 'ore_iron', 'mushroom_cap', 'gem_amethyst', 'scroll_town',
    'spear_iron', 'staff_holy', 'spellbook_arcane', 'dual_daggers', 'gauntlets_fist',
    'bow_ranger', 'armor_plate', 'shoulder_plate', 'cloak_wind', 'ring_band', 'gold_coins',
    'gem_blue', 'gem_amber', 'fish', 'leather', 'flower_purple', 'tea_leaves', 'arrows', 'backpack',
  ]);
  if (canonical.has(key)) return artworkIcon('items', key);
  const rules: [string, RegExp][] = [
    ['excalibur_sword_icon', /excalibur|holy_sword/],
    ['potion_hp', /potion.*hp|hp.*potion|health|healing_potion/],
    ['potion_mp', /potion.*mp|mp.*potion|mana_potion/],
    ['dual_daggers', /dagger|knife/], ['bow_ranger', /bow/], ['arrows', /arrow|quiver/],
    ['spear_iron', /spear|lance|halberd/], ['staff_holy', /staff|wand|scepter/],
    ['spellbook_arcane', /book|tome/], ['gauntlets_fist', /fist|knuckle/],
    ['sword_novice', /sword|blade/], ['shield_oak', /shield|buckler/],
    ['helm_bronze', /helm|crown|hat|cap/], ['boots_leather', /boot|shoe|greave/],
    ['gloves_leather', /glove|gauntlet/], ['shoulder_plate', /shoulder|pauldron/],
    ['cloak_wind', /cloak|cape|mantle/], ['ring_band', /ring/],
    ['amulet_jade', /amulet|necklace|pendant/], ['armor_plate', /armor|plate|mail/],
    ['tunic_explorer', /tunic|robe|coat/], ['scroll_town', /scroll|cert|seal/],
    ['gem_blue', /blue.*gem|sapphire/], ['gem_amber', /amber|topaz/],
    ['gem_amethyst', /gem|crystal|pearl|core|heart|scale/],
    ['ore_iron', /ore|ingot|stone/], ['wood_oak', /wood|timber|plank|branch/],
    ['mushroom_cap', /mushroom/], ['flower_purple', /flower/], ['tea_leaves', /tea/],
    ['herb_green', /herb|leaf|leaves/], ['fish', /fish/], ['leather', /leather|hide|pelt/],
    ['bread_loaf', /bread|food|stew|feast|wheat|apple/], ['gold_coins', /gold|coin/],
    ['backpack', /bag|pack/],
  ];
  return artworkIcon('items', rules.find(([, pattern]) => pattern.test(key))?.[0] || 'gem_amethyst');
}

export function getPaperdollSvg(equipment: Partial<Record<EquipSlotKey, InventoryItemDef>>): string {
  const hasWeapon = Boolean(equipment.weapon);
  const hasShield = Boolean(equipment.cloak || equipment.shoulder);
  const hasArmor = Boolean(equipment.armor);
  const hasHelm = Boolean(equipment.head);
  const armorColor = hasArmor ? '#2f6f44' : '#64748b';

  return `<svg viewBox="0 0 160 200" width="136" height="170">
    <!-- Ground contact aura -->
    <ellipse cx="80" cy="182" rx="46" ry="12" fill="rgba(197, 159, 89, 0.22)" stroke="#a68246" stroke-width="1.5"/>
    <!-- Boots -->
    <rect x="61" y="150" width="14" height="28" rx="4" fill="${equipment.boots ? '#7c4a21' : '#334155'}" stroke="#1e150c" stroke-width="2"/>
    <rect x="85" y="150" width="14" height="28" rx="4" fill="${equipment.boots ? '#7c4a21' : '#334155'}" stroke="#1e150c" stroke-width="2"/>
    <!-- Tunic / Armor -->
    <path d="M52 88 L108 88 L114 148 L46 148 Z" fill="${armorColor}" stroke="#1e150c" stroke-width="2.5"/>
    <rect x="49" y="122" width="62" height="9" fill="#78350f" stroke="#1e150c" stroke-width="1.5"/>
    <rect x="74" y="120" width="12" height="13" rx="2" fill="#facc15" stroke="#451a03" stroke-width="1.5"/>
    <!-- Weapon in right hand -->
    ${
      hasWeapon
        ? `<g transform="translate(36, 118) rotate(-28)">
             <rect x="-4" y="-56" width="8" height="58" rx="2" fill="#e2e8f0" stroke="#1e293b" stroke-width="2"/>
             <rect x="-12" y="-2" width="24" height="6" rx="2" fill="#d97706" stroke="#451a03" stroke-width="1.5"/>
             <rect x="-3" y="4" width="6" height="16" fill="#78350f"/>
           </g>`
        : ''
    }
    <!-- Shield on left arm -->
    ${
      hasShield
        ? `<path d="M102 98 L120 94 L138 98 L136 126 C134 138 120 146 120 146 C120 146 106 138 104 126 Z" fill="#8b5a2b" stroke="#cbd5e1" stroke-width="2.8"/>
           <circle cx="120" cy="116" r="6" fill="#eab308" stroke="#451a03" stroke-width="1.5"/>`
        : ''
    }
    <!-- Gloves -->
    <circle cx="48" cy="126" r="8" fill="${equipment.gloves ? '#92400e' : '#fde2c4'}" stroke="#1e150c" stroke-width="2"/>
    <circle cx="112" cy="126" r="8" fill="${equipment.gloves ? '#92400e' : '#fde2c4'}" stroke="#1e150c" stroke-width="2"/>
    <!-- Chibi Head & Spiky Hair -->
    <circle cx="80" cy="58" r="28" fill="#fde2c4" stroke="#1e150c" stroke-width="2.5"/>
    <path d="M48 56 C46 28 70 16 88 22 C106 18 114 38 110 56 C100 44 62 44 48 56 Z" fill="#7c3f1d" stroke="#1e150c" stroke-width="2"/>
    ${
      hasHelm
        ? `<path d="M52 44 C54 22 68 18 80 18 C92 18 106 22 108 44 Z" fill="#94a3b8" stroke="#1e293b" stroke-width="2.2"/>`
        : ''
    }
    <circle cx="70" cy="60" r="3.2" fill="#1e293b"/>
    <circle cx="90" cy="60" r="3.2" fill="#1e293b"/>
    <path d="M75 72 Q80 76 85 72" fill="none" stroke="#9a3412" stroke-width="2" stroke-linecap="round"/>
  </svg>`;
}
