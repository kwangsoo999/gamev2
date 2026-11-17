import type { PivotPoint } from '../../assets/AssetManifest.ts';

export interface ScaleResult {
  scaleX: number;
  scaleY: number;
  renderWidth: number;
  renderHeight: number;
  pivotOffsetX: number;
  pivotOffsetY: number;
}

/**
 * AdaptiveSpriteScaler normalizes sprites of varying asset resolutions
 * (e.g., 64x64 Novice, 80x80 Warrior, 160x160 Boss) to standard world metrics
 * while anchoring foot pivots to prevent feet slipping across animations.
 */
export class AdaptiveSpriteScaler {
  public static readonly DEFAULT_REFERENCE_HEIGHT = 64;
  public static readonly DEFAULT_PIVOT: PivotPoint = { x: 0.5, y: 0.95 };

  /**
   * Computes the normalized scaling metrics for a sprite given its source dimensions,
   * target reference height, and custom ground pivot.
   */
  public static compute(
    sourceWidth: number,
    sourceHeight: number,
    referenceHeight: number = AdaptiveSpriteScaler.DEFAULT_REFERENCE_HEIGHT,
    pivot: PivotPoint = AdaptiveSpriteScaler.DEFAULT_PIVOT,
    unitScale = 1.0
  ): ScaleResult {
    // Normalization ratio relative to reference height
    const ratio = referenceHeight / Math.max(1, sourceHeight);
    const uniformScale = ratio * unitScale;

    const renderWidth = Math.round(sourceWidth * uniformScale);
    const renderHeight = Math.round(sourceHeight * uniformScale);

    // Compute pixel offset from top-left to ground pivot
    const pivotOffsetX = Math.round(renderWidth * pivot.x);
    const pivotOffsetY = Math.round(renderHeight * pivot.y);

    return {
      scaleX: uniformScale,
      scaleY: uniformScale,
      renderWidth,
      renderHeight,
      pivotOffsetX,
      pivotOffsetY,
    };
  }

  /**
   * Calculates world position alignment so the entity's ground contact point
   * (e.g. tile center) matches the sprite's ground pivot exactly.
   */
  public static alignToWorld(
    worldX: number,
    worldY: number,
    metrics: ScaleResult
  ): { drawX: number; drawY: number } {
    return {
      drawX: Math.round(worldX - metrics.pivotOffsetX),
      drawY: Math.round(worldY - metrics.pivotOffsetY),
    };
  }
}
