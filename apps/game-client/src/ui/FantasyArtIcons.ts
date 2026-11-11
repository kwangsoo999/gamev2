import { EquipSlotKey, InventoryItemDef } from '../engine/types';

/**
 * High-craft SVG artwork generators unified with the "Thôn Khởi Nguyên"
 * dark bronze-wood & classic Japanese fantasy aesthetic (zero blurry external PNG crops).
 */

export function getSkillIconSvg(iconKey: string): string {
  switch (iconKey) {
    case 'skill_azure_wave':
      return `<svg viewBox="0 0 64 64" width="100%" height="100%">
        <defs>
          <radialGradient id="skBg1" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stop-color="#0ea5e9" stop-opacity="0.95"/>
            <stop offset="60%" stop-color="#0369a1"/>
            <stop offset="100%" stop-color="#082f49"/>
          </radialGradient>
        </defs>
        <rect width="64" height="64" rx="6" fill="url(#skBg1)"/>
        <path d="M10 52 C22 40 36 22 54 10 C42 28 30 42 16 54 Z" fill="#e0f2fe" stroke="#38bdf8" stroke-width="2"/>
        <path d="M16 14 L46 44" stroke="#7dd3fc" stroke-width="3" stroke-linecap="round" opacity="0.7"/>
        <circle cx="48" cy="16" r="4" fill="#ffffff" opacity="0.9"/>
      </svg>`;
    case 'skill_flame_slash':
      return `<svg viewBox="0 0 64 64" width="100%" height="100%">
        <defs>
          <radialGradient id="skBg2" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stop-color="#f97316"/>
            <stop offset="60%" stop-color="#b91c1c"/>
            <stop offset="100%" stop-color="#450a0a"/>
          </radialGradient>
        </defs>
        <rect width="64" height="64" rx="6" fill="url(#skBg2)"/>
        <path d="M12 48 C20 28 34 16 52 12 C42 28 34 40 16 52 Z" fill="#fef08a" stroke="#f59e0b" stroke-width="2"/>
        <path d="M18 52 C28 38 40 28 54 22" stroke="#fdba74" stroke-width="3.5" fill="none" stroke-linecap="round"/>
        <circle cx="24" cy="24" r="3" fill="#fde047"/>
      </svg>`;
    case 'skill_golden_aura':
      return `<svg viewBox="0 0 64 64" width="100%" height="100%">
        <defs>
          <radialGradient id="skBg3" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stop-color="#fef08a"/>
            <stop offset="55%" stop-color="#d97706"/>
            <stop offset="100%" stop-color="#451a03"/>
          </radialGradient>
        </defs>
        <rect width="64" height="64" rx="6" fill="url(#skBg3)"/>
        <path d="M32 8 L39 24 L56 26 L43 38 L46 54 L32 46 L18 54 L21 38 L8 26 L25 24 Z" fill="#fef9c3" opacity="0.3"/>
        <circle cx="32" cy="22" r="7" fill="#291a0d" stroke="#fef08a" stroke-width="2"/>
        <path d="M19 52 C19 37 25 32 32 32 C39 32 45 37 45 52 Z" fill="#291a0d" stroke="#fde047" stroke-width="2"/>
      </svg>`;
    default:
      return `<svg viewBox="0 0 64 64" width="100%" height="100%">
        <rect width="64" height="64" rx="6" fill="#2b2117"/>
        <circle cx="32" cy="32" r="14" fill="none" stroke="#a68246" stroke-width="2.5"/>
      </svg>`;
  }
}

export function getBackpackIconSvg(): string {
  return `<svg viewBox="0 0 64 64" width="100%" height="100%">
    <rect width="64" height="64" rx="6" fill="#251c14"/>
    <path d="M23 16 C23 10 41 10 41 16" fill="none" stroke="#c59f59" stroke-width="4" stroke-linecap="round"/>
    <rect x="14" y="18" width="36" height="34" rx="8" fill="#8b5a2b" stroke="#3b220d" stroke-width="2.5"/>
    <path d="M14 25 C14 18 50 18 50 25 L50 32 C42 35 22 35 14 32 Z" fill="#a46e38" stroke="#3b220d" stroke-width="2"/>
    <rect x="20" y="34" width="24" height="13" rx="3" fill="#6e4321" stroke="#3b220d" stroke-width="1.8"/>
    <rect x="28" y="29" width="8" height="9" rx="2" fill="#e6c675" stroke="#45270c" stroke-width="1.5"/>
  </svg>`;
}

export function getPadlockSmallSvg(): string {
  return `<svg viewBox="0 0 24 24" width="13" height="13">
    <path d="M7 10 V7 a5 5 0 0 1 10 0 v3" fill="none" stroke="#c59f59" stroke-width="2.2" stroke-linecap="round"/>
    <rect x="5" y="10" width="14" height="11" rx="2.5" fill="#7c5e34" stroke="#e6c675" stroke-width="1.4"/>
    <circle cx="12" cy="15.5" r="1.5" fill="#1e150c"/>
  </svg>`;
}

export function getItemIconSvg(iconKey: string): string {
  const map: Record<string, string> = {
    sword_novice: `<svg viewBox="0 0 64 64" width="100%" height="100%">
      <path d="M49 11 L53 15 L29 39 L25 35 Z" fill="#e2e8f0" stroke="#334155" stroke-width="2"/>
      <path d="M49 11 L25 35 L27 37 L51 13 Z" fill="#94a3b8"/>
      <path d="M19 31 L33 45 L30 48 L16 34 Z" fill="#d97706" stroke="#451a03" stroke-width="1.8"/>
      <path d="M22 42 L13 51 L16 54 L25 45 Z" fill="#78350f" stroke="#451a03" stroke-width="1.8"/>
      <circle cx="13" cy="52" r="3.2" fill="#f59e0b" stroke="#451a03" stroke-width="1.5"/>
    </svg>`,
    shield_oak: `<svg viewBox="0 0 64 64" width="100%" height="100%">
      <path d="M16 14 L32 10 L48 14 L46 36 C44 46 32 54 32 54 C32 54 20 46 18 36 Z" fill="#8b5a2b" stroke="#cbd5e1" stroke-width="3.2"/>
      <path d="M32 14 L32 50 M20 26 L44 26" stroke="#5c3818" stroke-width="2.5"/>
      <circle cx="32" cy="27" r="6" fill="#eab308" stroke="#451a03" stroke-width="2"/>
    </svg>`,
    tunic_explorer: `<svg viewBox="0 0 64 64" width="100%" height="100%">
      <path d="M18 15 L26 12 C28 16 36 16 38 12 L46 15 L53 27 L45 31 L42 25 L42 51 L22 51 L22 25 L19 31 L11 27 Z" fill="#2f6f44" stroke="#142d1c" stroke-width="2.2"/>
      <rect x="21" y="34" width="22" height="5" fill="#78350f" stroke="#3b1d07" stroke-width="1.4"/>
      <rect x="29" y="33" width="6" height="7" rx="1" fill="#facc15" stroke="#451a03" stroke-width="1.2"/>
    </svg>`,
    helm_bronze: `<svg viewBox="0 0 64 64" width="100%" height="100%">
      <path d="M14 38 C14 21 22 14 32 14 C42 14 50 21 50 38 L52 44 L42 44 L40 34 L32 37 L24 34 L22 44 L12 44 Z" fill="#94a3b8" stroke="#1e293b" stroke-width="2.2"/>
      <path d="M29 12 L35 12 L34 29 L30 29 Z" fill="#d97706"/>
    </svg>`,
    gloves_leather: `<svg viewBox="0 0 64 64" width="100%" height="100%">
      <path d="M14 24 C14 19 22 19 24 22 L28 19 L30 33 L30 48 L14 48 Z" fill="#8b5a2b" stroke="#3b220d" stroke-width="2"/>
      <path d="M35 22 C37 19 46 19 46 24 L48 48 L33 48 L33 33 Z" fill="#a46e38" stroke="#3b220d" stroke-width="2"/>
      <rect x="13" y="40" width="18" height="7" rx="2" fill="#d97706" stroke="#451a03" stroke-width="1.5"/>
      <rect x="32" y="40" width="18" height="7" rx="2" fill="#d97706" stroke="#451a03" stroke-width="1.5"/>
    </svg>`,
    boots_leather: `<svg viewBox="0 0 64 64" width="100%" height="100%">
      <path d="M14 14 L26 14 L26 42 L34 45 L34 52 L14 52 Z" fill="#7c4a21" stroke="#3b220d" stroke-width="2"/>
      <path d="M36 18 L48 18 L48 44 L55 47 L55 52 L36 52 Z" fill="#925829" stroke="#3b220d" stroke-width="2"/>
      <rect x="13" y="14" width="14" height="6" fill="#d97706"/>
      <rect x="35" y="18" width="14" height="6" fill="#d97706"/>
    </svg>`,
    amulet_jade: `<svg viewBox="0 0 64 64" width="100%" height="100%">
      <path d="M22 12 C22 24 42 24 42 12" fill="none" stroke="#eab308" stroke-width="3"/>
      <circle cx="32" cy="36" r="14" fill="#d97706" stroke="#451a03" stroke-width="2"/>
      <circle cx="32" cy="36" r="8" fill="#10b981" stroke="#a7f3d0" stroke-width="1.8"/>
    </svg>`,
    potion_hp: `<svg viewBox="0 0 64 64" width="100%" height="100%">
      <rect x="27" y="10" width="10" height="7" rx="2" fill="#a46e38" stroke="#451a03" stroke-width="1.8"/>
      <path d="M25 17 L39 17 L38 25 C46 28 49 36 47 45 C45 51 39 54 32 54 C25 54 19 51 17 45 C15 36 18 28 26 25 Z" fill="#dc2626" stroke="#f8fafc" stroke-width="2.2"/>
      <path d="M22 36 C21 42 23 47 28 49" fill="none" stroke="#fecaca" stroke-width="2.8" stroke-linecap="round"/>
    </svg>`,
    potion_mp: `<svg viewBox="0 0 64 64" width="100%" height="100%">
      <rect x="27" y="10" width="10" height="7" rx="2" fill="#a46e38" stroke="#451a03" stroke-width="1.8"/>
      <path d="M25 17 L39 17 L38 25 C46 28 49 36 47 45 C45 51 39 54 32 54 C25 54 19 51 17 45 C15 36 18 28 26 25 Z" fill="#2563eb" stroke="#f8fafc" stroke-width="2.2"/>
      <path d="M22 36 C21 42 23 47 28 49" fill="none" stroke="#bfdbfe" stroke-width="2.8" stroke-linecap="round"/>
    </svg>`,
    bread_loaf: `<svg viewBox="0 0 64 64" width="100%" height="100%">
      <ellipse cx="32" cy="35" rx="20" ry="13" transform="rotate(-15 32 35)" fill="#d97706" stroke="#451a03" stroke-width="2.2"/>
      <path d="M22 30 L27 36 M30 27 L35 33 M38 25 L43 31" stroke="#fef3c7" stroke-width="2.5" stroke-linecap="round"/>
    </svg>`,
    herb_green: `<svg viewBox="0 0 64 64" width="100%" height="100%">
      <path d="M16 50 C26 38 38 26 48 14" stroke="#3f6212" stroke-width="3" fill="none"/>
      <ellipse cx="26" cy="34" rx="8" ry="4.5" transform="rotate(-35 26 34)" fill="#65a30d" stroke="#1a2e05" stroke-width="1.5"/>
      <ellipse cx="38" cy="24" rx="8" ry="4.5" transform="rotate(-35 38 24)" fill="#84cc16" stroke="#1a2e05" stroke-width="1.5"/>
      <ellipse cx="34" cy="40" rx="7.5" ry="4" transform="rotate(20 34 40)" fill="#4d7c0f" stroke="#1a2e05" stroke-width="1.5"/>
    </svg>`,
    wood_oak: `<svg viewBox="0 0 64 64" width="100%" height="100%">
      <path d="M14 40 L38 16 L50 28 L26 52 Z" fill="#7c4a21" stroke="#2d1706" stroke-width="2.2"/>
      <ellipse cx="20" cy="46" rx="8" ry="6" transform="rotate(45 20 46)" fill="#e7c697" stroke="#2d1706" stroke-width="2"/>
    </svg>`,
    ore_iron: `<svg viewBox="0 0 64 64" width="100%" height="100%">
      <polygon points="16,44 20,22 36,14 50,24 46,46 30,52" fill="#64748b" stroke="#1e293b" stroke-width="2.2"/>
      <polygon points="24,25 35,18 42,27 30,36" fill="#cbd5e1"/>
    </svg>`,
    mushroom_cap: `<svg viewBox="0 0 64 64" width="100%" height="100%">
      <rect x="26" y="34" width="12" height="17" rx="4" fill="#fef3c7" stroke="#451a03" stroke-width="2"/>
      <path d="M12 36 C12 20 20 14 32 14 C44 14 52 20 52 36 Z" fill="#b45309" stroke="#451a03" stroke-width="2.2"/>
      <circle cx="24" cy="24" r="3.5" fill="#fef3c7"/>
      <circle cx="38" cy="22" r="2.8" fill="#fef3c7"/>
    </svg>`,
    gem_amethyst: `<svg viewBox="0 0 64 64" width="100%" height="100%">
      <polygon points="32,10 48,25 42,50 22,50 16,25" fill="#9333ea" stroke="#f3e8ff" stroke-width="2"/>
      <polygon points="32,10 41,25 32,44 23,25" fill="#c084fc" opacity="0.65"/>
    </svg>`,
    scroll_town: `<svg viewBox="0 0 64 64" width="100%" height="100%">
      <rect x="18" y="18" width="28" height="28" rx="3" fill="#fef3c7" stroke="#78350f" stroke-width="2"/>
      <rect x="14" y="14" width="36" height="7" rx="3" fill="#b45309" stroke="#451a03" stroke-width="1.8"/>
      <rect x="14" y="43" width="36" height="7" rx="3" fill="#b45309" stroke="#451a03" stroke-width="1.8"/>
      <path d="M24 27 H40 M24 34 H36" stroke="#78350f" stroke-width="2.2" stroke-linecap="round"/>
    </svg>`,
    spear_iron: `<svg viewBox="0 0 64 64" width="100%" height="100%">
      <path d="M12 52 L44 20" stroke="#78350f" stroke-width="4" stroke-linecap="round"/>
      <path d="M40 16 L54 10 L48 24 L42 22 Z" fill="#e2e8f0" stroke="#1e293b" stroke-width="2"/>
      <circle cx="42" cy="22" r="3" fill="#f59e0b"/>
    </svg>`,
    staff_holy: `<svg viewBox="0 0 64 64" width="100%" height="100%">
      <path d="M18 54 L42 22" stroke="#92400e" stroke-width="4" stroke-linecap="round"/>
      <circle cx="46" cy="17" r="9" fill="#fef08a" stroke="#b45309" stroke-width="2.2"/>
      <circle cx="46" cy="17" r="4.5" fill="#38bdf8"/>
    </svg>`,
    spellbook_arcane: `<svg viewBox="0 0 64 64" width="100%" height="100%">
      <rect x="14" y="12" width="36" height="40" rx="5" fill="#4338ca" stroke="#1e1b4b" stroke-width="2.4"/>
      <rect x="19" y="14" width="28" height="36" rx="3" fill="#6366f1" stroke="#c7d2fe" stroke-width="1.5"/>
      <polygon points="33,21 39,32 33,43 27,32" fill="#fde047" stroke="#fef9c3" stroke-width="1.4"/>
    </svg>`,
    dual_daggers: `<svg viewBox="0 0 64 64" width="100%" height="100%">
      <path d="M12 50 L36 16 L39 21 L17 52 Z" fill="#cbd5e1" stroke="#0f172a" stroke-width="1.8"/>
      <path d="M52 50 L28 16 L25 21 L47 52 Z" fill="#94a3b8" stroke="#0f172a" stroke-width="1.8"/>
      <circle cx="15" cy="49" r="3" fill="#9333ea"/>
      <circle cx="49" cy="49" r="3" fill="#9333ea"/>
    </svg>`,
    gauntlets_fist: `<svg viewBox="0 0 64 64" width="100%" height="100%">
      <rect x="15" y="16" width="34" height="32" rx="7" fill="#b91c1c" stroke="#450a0a" stroke-width="2.4"/>
      <rect x="17" y="20" width="30" height="10" rx="3" fill="#f59e0b" stroke="#451a03" stroke-width="1.5"/>
      <path d="M22 36 H42" stroke="#fef3c7" stroke-width="3" stroke-linecap="round"/>
    </svg>`,
    bow_ranger: `<svg viewBox="0 0 64 64" width="100%" height="100%">
      <path d="M22 10 C48 16 48 48 22 54" fill="none" stroke="#92400e" stroke-width="4.2" stroke-linecap="round"/>
      <line x1="22" y1="11" x2="22" y2="53" stroke="#e2e8f0" stroke-width="1.8"/>
      <line x1="14" y1="32" x2="50" y2="32" stroke="#10b981" stroke-width="2.4"/>
      <polygon points="52,32 45,28 45,36" fill="#e2e8f0"/>
    </svg>`,
    armor_plate: `<svg viewBox="0 0 64 64" width="100%" height="100%">
      <path d="M16 14 L26 11 L32 16 L38 11 L48 14 L54 26 L44 30 L42 52 L22 52 L20 30 L10 26 Z" fill="#475569" stroke="#f59e0b" stroke-width="2.2"/>
      <path d="M25 24 L32 30 L39 24" fill="none" stroke="#fde047" stroke-width="2.2"/>
    </svg>`,
    shoulder_plate: `<svg viewBox="0 0 64 64" width="100%" height="100%">
      <path d="M10 30 C12 16 26 14 30 22 L28 42 L12 40 Z" fill="#64748b" stroke="#1e293b" stroke-width="2.2"/>
      <path d="M54 30 C52 16 38 14 34 22 L36 42 L52 40 Z" fill="#64748b" stroke="#1e293b" stroke-width="2.2"/>
      <circle cx="21" cy="28" r="3" fill="#fbbf24"/>
      <circle cx="43" cy="28" r="3" fill="#fbbf24"/>
    </svg>`,
    ring_band: `<svg viewBox="0 0 64 64" width="100%" height="100%">
      <ellipse cx="32" cy="36" rx="16" ry="14" fill="none" stroke="#f59e0b" stroke-width="6"/>
      <ellipse cx="32" cy="36" rx="16" ry="14" fill="none" stroke="#78350f" stroke-width="1.5"/>
      <polygon points="32,12 40,22 32,30 24,22" fill="#38bdf8" stroke="#0f172a" stroke-width="2"/>
    </svg>`,
    cloak_wind: `<svg viewBox="0 0 64 64" width="100%" height="100%">
      <path d="M20 12 L44 12 L52 52 L32 46 L12 52 Z" fill="#365314" stroke="#14532d" stroke-width="2.4"/>
      <path d="M24 16 L40 16 L36 30 L28 30 Z" fill="#d97706" stroke="#78350f" stroke-width="1.5"/>
    </svg>`,
    fragment_crystal: `<svg viewBox="0 0 64 64" width="100%" height="100%">
      <polygon points="32,8 48,24 42,54 22,54 16,24" fill="#c084fc" stroke="#4c1d95" stroke-width="2.2"/>
      <polygon points="32,12 42,26 32,48 22,26" fill="#f3e8ff" opacity="0.65"/>
    </svg>`,
    upgrade_stone: `<svg viewBox="0 0 64 64" width="100%" height="100%">
      <polygon points="32,10 52,26 44,52 20,52 12,26" fill="#38bdf8" stroke="#0c4a6e" stroke-width="2.2"/>
      <path d="M26 32 L32 20 L38 32 L32 44 Z" fill="#fef08a"/>
    </svg>`,
    boss_core: `<svg viewBox="0 0 64 64" width="100%" height="100%">
      <circle cx="32" cy="32" r="20" fill="#dc2626" stroke="#450a0a" stroke-width="2.5"/>
      <circle cx="32" cy="32" r="11" fill="#fbbf24" stroke="#7c2d12" stroke-width="2"/>
      <circle cx="28" cy="28" r="3" fill="#fffbeb"/>
    </svg>`,
  };
  return map[iconKey] || map.sword_novice;
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
