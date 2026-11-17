import type { ComposedDrawItem, SpriteComposer } from './SpriteComposer.ts';
import { SpriteAnchorManager } from './SpriteAnchorManager.ts';
import { AdaptiveSpriteScaler, type ScaleResult } from './AdaptiveSpriteScaler.ts';

export interface CanvasRenderOptions {
  ctx: CanvasRenderingContext2D;
  centerX: number;
  centerY: number;
  targetHeight?: number;
  unitScale?: number;
}

/**
 * LayerRenderer executes drawing of modular Paper Doll layers
 * to standard HTML5 2D Canvas or handles Phaser rendering integration.
 */
export class LayerRenderer {
  /**
   * Renders the composed sprite to an HTML5 CanvasRenderingContext2D.
   */
  public static renderToCanvas(
    composer: SpriteComposer,
    options: CanvasRenderOptions
  ): void {
    const { ctx, centerX, centerY, targetHeight = 64, unitScale = 1.0 } = options;
    const drawList = composer.getSortedDrawList();
    const direction = composer.getDirection();

    for (const item of drawList) {
      const { layer } = item;
      if (!layer.visible) continue;

      ctx.save();
      ctx.globalAlpha = layer.alpha;

      if (layer.image) {
        const img = layer.image;
        const metrics: ScaleResult = AdaptiveSpriteScaler.compute(
          img.width,
          img.height,
          targetHeight,
          { x: 0.5, y: 0.95 },
          unitScale
        );

        // Compute anchor offset if custom anchor point specified
        let offsetX = layer.offsetX;
        let offsetY = layer.offsetY;

        if (layer.anchorPoint && layer.anchorPoint !== 'torso') {
          const anchor = SpriteAnchorManager.getAnchor(layer.anchorPoint, direction);
          offsetX += (anchor.x - 0.5) * metrics.renderWidth;
          offsetY += (anchor.y - 0.5) * metrics.renderHeight;
        }

        const drawX = Math.round(centerX - metrics.pivotOffsetX + offsetX);
        const drawY = Math.round(centerY - metrics.pivotOffsetY + offsetY);

        ctx.drawImage(img, drawX, drawY, metrics.renderWidth, metrics.renderHeight);
      } else {
        // Fallback procedural box for unit tests or placeholder assets
        const w = 24 * unitScale;
        const h = 48 * unitScale;
        ctx.fillStyle = typeof layer.tint === 'string' ? layer.tint : '#4a6fa5';
        ctx.fillRect(
          Math.round(centerX - w / 2 + layer.offsetX),
          Math.round(centerY - h + layer.offsetY),
          Math.round(w),
          Math.round(h)
        );
      }

      ctx.restore();
    }
  }
}
