import type { EightDirectionName, LayerCategory } from '../../assets/AssetManifest.ts';

export interface LayerRenderDef {
  id: string;
  category: LayerCategory;
  zIndex?: number;
  [key: string]: any;
}

/**
 * LayerSortManager dynamically determines the depth / z-index for modular Paper Doll sprite layers.
 * Since an entity's weapon or shield may be rendered in front of the body when facing South,
 * but behind the body when facing North, this class resolves the accurate rendering order for all 8 directions.
 */
export class LayerSortManager {
  // Base depth orders by direction group
  private static readonly BASE_ORDER_SOUTH: Record<LayerCategory, number> = {
    shadow: 10,
    back_equipment: 20, // cloak, backpack, wings behind body
    body: 30,
    armor: 40,
    hair: 50,
    headgear: 60,
    accessories: 65,
    front_equipment: 70, // weapon in right hand, shield in left hand in front of body
    vfx: 90,
  };

  private static readonly BASE_ORDER_NORTH: Record<LayerCategory, number> = {
    shadow: 10,
    front_equipment: 20, // weapon facing away behind character body
    accessories: 25,
    body: 30,
    armor: 40,
    hair: 50,
    headgear: 60,
    back_equipment: 70, // cloak, backpack, wings visible on back in front of body
    vfx: 90,
  };

  private static readonly BASE_ORDER_SIDE: Record<LayerCategory, number> = {
    shadow: 10,
    back_equipment: 20,
    body: 30,
    armor: 40,
    hair: 50,
    headgear: 60,
    accessories: 65,
    front_equipment: 70,
    vfx: 90,
  };

  /**
   * Resolves the exact z-index for a layer category given direction and animation state.
   */
  public static resolveZIndex(
    category: LayerCategory,
    direction: EightDirectionName,
    animState?: string,
    frameIndex?: number
  ): number {
    let base = 30;

    switch (direction) {
      case 'north':
      case 'north_west':
      case 'north_east':
        base = LayerSortManager.BASE_ORDER_NORTH[category] ?? 30;
        break;
      case 'south':
      case 'south_west':
      case 'south_east':
        base = LayerSortManager.BASE_ORDER_SOUTH[category] ?? 30;
        break;
      case 'west':
      case 'east':
      default:
        base = LayerSortManager.BASE_ORDER_SIDE[category] ?? 30;
        break;
    }

    // Dynamic animation overrides (e.g. during attack swing recoil)
    if (animState === 'attack' && frameIndex !== undefined) {
      if (category === 'front_equipment' && frameIndex >= 4) {
        // Weapon sweeps slightly forward during follow-through
        base += 2;
      }
    }

    return base;
  }

  /**
   * Sorts an array of layers in back-to-front rendering order (ascending z-index).
   */
  public static sortLayers<T extends LayerRenderDef>(
    layers: T[],
    direction: EightDirectionName,
    animState?: string,
    frameIndex?: number
  ): T[] {
    return [...layers].sort((a, b) => {
      const zA = a.zIndex !== undefined
        ? a.zIndex
        : LayerSortManager.resolveZIndex(a.category, direction, animState, frameIndex);
      const zB = b.zIndex !== undefined
        ? b.zIndex
        : LayerSortManager.resolveZIndex(b.category, direction, animState, frameIndex);

      if (zA !== zB) return zA - zB;
      return a.id.localeCompare(b.id);
    });
  }
}
