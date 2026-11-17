import type { LayerCategory } from '../assets/AssetManifest.ts';
import type { EquipSlotKey } from '../engine/types.ts';
import { SpriteLayer } from '../rendering/sprites/SpriteLayer.ts';
import type { AnchorPointType } from '../rendering/sprites/SpriteAnchorManager.ts';
import type { CharacterAppearance } from '../characters/CharacterAppearance.ts';

export interface EquipmentVisualMapping {
  itemId: string;
  slot: EquipSlotKey;
  layer: LayerCategory;
  anchorProfile: AnchorPointType;
  texturePath: string;
  defaultTint?: string;
}

/**
 * EquipmentLayerMapper bridges catalog items to modular Paper Doll layers.
 * Maps server-authoritative item IDs into visual textures, categories, and anchor points.
 */
export class EquipmentLayerMapper {
  private static registry: Map<string, EquipmentVisualMapping> = new Map();

  static {
    // Built-in standard equipment mappings
    EquipmentLayerMapper.register({
      itemId: 'wpn_novice_wooden_sword',
      slot: 'weapon',
      layer: 'front_equipment',
      anchorProfile: 'right_hand',
      texturePath: '/assets/equipment/weapons/swords/novice_wooden_sword.png',
      defaultTint: '#b58900',
    });

    EquipmentLayerMapper.register({
      itemId: 'wpn_iron_broadsword',
      slot: 'weapon',
      layer: 'front_equipment',
      anchorProfile: 'right_hand',
      texturePath: '/assets/equipment/weapons/swords/iron_broadsword.png',
      defaultTint: '#93a1a1',
    });

    EquipmentLayerMapper.register({
      itemId: 'wpn_golden_spear',
      slot: 'weapon',
      layer: 'front_equipment',
      anchorProfile: 'right_hand',
      texturePath: '/assets/equipment/weapons/polearms/golden_spear.png',
      defaultTint: '#ffd700',
    });

    EquipmentLayerMapper.register({
      itemId: 'arm_cloth_tunic',
      slot: 'chest',
      layer: 'armor',
      anchorProfile: 'torso',
      texturePath: '/assets/equipment/armor/cloth_tunic.png',
      defaultTint: '#2aa198',
    });

    EquipmentLayerMapper.register({
      itemId: 'arm_iron_chainmail',
      slot: 'chest',
      layer: 'armor',
      anchorProfile: 'torso',
      texturePath: '/assets/equipment/armor/iron_chainmail.png',
      defaultTint: '#586e75',
    });

    EquipmentLayerMapper.register({
      itemId: 'hd_leather_cap',
      slot: 'head',
      layer: 'headgear',
      anchorProfile: 'head',
      texturePath: '/assets/equipment/headgear/leather_cap.png',
      defaultTint: '#859900',
    });

    EquipmentLayerMapper.register({
      itemId: 'shld_wooden_buckler',
      slot: 'offhand',
      layer: 'front_equipment',
      anchorProfile: 'left_hand',
      texturePath: '/assets/equipment/shields/wooden_buckler.png',
      defaultTint: '#6c71c4',
    });

    EquipmentLayerMapper.register({
      itemId: 'clk_traveler_cape',
      slot: 'necklace',
      layer: 'back_equipment',
      anchorProfile: 'back',
      texturePath: '/assets/equipment/accessories/traveler_cape.png',
      defaultTint: '#cb4b16',
    });
  }

  public static register(mapping: EquipmentVisualMapping): void {
    EquipmentLayerMapper.registry.set(mapping.itemId, mapping);
  }

  public static get(itemId: string): EquipmentVisualMapping | undefined {
    return EquipmentLayerMapper.registry.get(itemId);
  }

  /**
   * Generates a complete set of SpriteLayers from a character's visual appearance.
   */
  public static mapToLayers(appearance: CharacterAppearance): SpriteLayer[] {
    const layers: SpriteLayer[] = [];

    // 1. Shadow
    layers.push(
      new SpriteLayer({
        id: 'layer_shadow',
        category: 'shadow',
        anchorPoint: 'feet',
        tint: 'rgba(0, 0, 0, 0.35)',
      })
    );

    // 2. Base Body
    layers.push(
      new SpriteLayer({
        id: 'layer_body',
        category: 'body',
        anchorPoint: 'torso',
        textureKey: `char_${appearance.gender}_${appearance.job}_body`,
        tint: appearance.skinTone,
      })
    );

    // 3. Hair
    layers.push(
      new SpriteLayer({
        id: 'layer_hair',
        category: 'hair',
        anchorPoint: 'head',
        textureKey: `char_${appearance.gender}_hair_${appearance.hairStyle}`,
        tint: appearance.hairColor,
      })
    );

    // 4. Equipped items from slots
    for (const [slot, itemId] of Object.entries(appearance.equippedSlots)) {
      if (!itemId) continue;
      const mapping = EquipmentLayerMapper.get(itemId);
      if (mapping) {
        layers.push(
          new SpriteLayer({
            id: `layer_${slot}_${itemId}`,
            category: mapping.layer,
            anchorPoint: mapping.anchorProfile,
            textureKey: mapping.itemId,
            tint: mapping.defaultTint,
          })
        );
      }
    }

    return layers;
  }
}
