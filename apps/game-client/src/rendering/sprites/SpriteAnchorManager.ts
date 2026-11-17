import type { EightDirectionName } from '../../assets/AssetManifest.ts';

export type AnchorPointType = 'head' | 'right_hand' | 'left_hand' | 'torso' | 'back' | 'feet';

export interface AnchorCoord {
  x: number; // 0.0 to 1.0 (normalized)
  y: number; // 0.0 to 1.0 (normalized)
}

/**
 * SpriteAnchorManager manages anatomical anchor positions across character body types and directions.
 * Enables modular equipment (weapons, shields, helmets, cloaks) to attach naturally without floating.
 */
export class SpriteAnchorManager {
  private static readonly BASE_ANCHORS: Record<AnchorPointType, AnchorCoord> = {
    head: { x: 0.5, y: 0.22 },
    torso: { x: 0.5, y: 0.48 },
    right_hand: { x: 0.32, y: 0.56 },
    left_hand: { x: 0.68, y: 0.56 },
    back: { x: 0.5, y: 0.42 },
    feet: { x: 0.5, y: 0.95 },
  };

  // Directional displacement offsets
  private static readonly DIRECTIONAL_OFFSETS: Record<
    EightDirectionName,
    Partial<Record<AnchorPointType, { dx: number; dy: number }>>
  > = {
    south: {
      right_hand: { dx: -0.04, dy: 0.0 },
      left_hand: { dx: 0.04, dy: 0.0 },
      back: { dx: 0.0, dy: -0.02 },
    },
    south_west: {
      right_hand: { dx: -0.06, dy: 0.01 },
      left_hand: { dx: 0.02, dy: -0.01 },
      back: { dx: 0.04, dy: -0.02 },
    },
    west: {
      right_hand: { dx: -0.08, dy: 0.0 },
      left_hand: { dx: 0.0, dy: 0.0 },
      back: { dx: 0.08, dy: -0.02 },
    },
    north_west: {
      right_hand: { dx: -0.05, dy: -0.02 },
      left_hand: { dx: -0.02, dy: -0.02 },
      back: { dx: 0.04, dy: 0.0 },
    },
    north: {
      right_hand: { dx: -0.04, dy: -0.02 },
      left_hand: { dx: 0.04, dy: -0.02 },
      back: { dx: 0.0, dy: 0.02 },
    },
    north_east: {
      right_hand: { dx: 0.02, dy: -0.02 },
      left_hand: { dx: 0.05, dy: -0.02 },
      back: { dx: -0.04, dy: 0.0 },
    },
    east: {
      right_hand: { dx: 0.0, dy: 0.0 },
      left_hand: { dx: 0.08, dy: 0.0 },
      back: { dx: -0.08, dy: -0.02 },
    },
    south_east: {
      right_hand: { dx: -0.02, dy: 0.01 },
      left_hand: { dx: 0.06, dy: 0.01 },
      back: { dx: -0.04, dy: -0.02 },
    },
  };

  /**
   * Resolves the normalized (0..1) anchor coordinate for a given point and direction.
   */
  public static getAnchor(point: AnchorPointType, direction: EightDirectionName): AnchorCoord {
    const base = SpriteAnchorManager.BASE_ANCHORS[point] || { x: 0.5, y: 0.5 };
    const offsets = SpriteAnchorManager.DIRECTIONAL_OFFSETS[direction];
    const offset = offsets ? offsets[point] : null;

    if (!offset) {
      return { x: base.x, y: base.y };
    }

    return {
      x: Math.max(0, Math.min(1, base.x + offset.dx)),
      y: Math.max(0, Math.min(1, base.y + offset.dy)),
    };
  }

  /**
   * Converts a normalized anchor coordinate into exact pixel coordinates
   * within a specific sprite dimension.
   */
  public static getAnchorPixels(
    point: AnchorPointType,
    direction: EightDirectionName,
    width: number,
    height: number
  ): { x: number; y: number } {
    const anchor = SpriteAnchorManager.getAnchor(point, direction);
    return {
      x: Math.round(anchor.x * width),
      y: Math.round(anchor.y * height),
    };
  }
}
