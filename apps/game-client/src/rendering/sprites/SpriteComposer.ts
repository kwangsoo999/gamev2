import type { EightDirectionName, LayerCategory } from '../../assets/AssetManifest.ts';
import { SpriteLayer } from './SpriteLayer.ts';
import { LayerSortManager } from './LayerSortManager.ts';
import { AnimationController } from '../animation/AnimationController.ts';

export interface ComposedDrawItem {
  id: string;
  category: LayerCategory;
  zIndex: number;
  layer: SpriteLayer;
}

/**
 * SpriteComposer coordinates the complete visual assembly of a modular character.
 * It manages layers, applies direction-aware depth sorting, and produces
 * the exact draw order for the rendering pipeline.
 */
export class SpriteComposer {
  private layers: Map<string, SpriteLayer> = new Map();
  private direction: EightDirectionName = 'south';
  private animController: AnimationController;

  constructor(direction: EightDirectionName = 'south') {
    this.direction = direction;
    this.animController = new AnimationController(direction);
  }

  public setLayer(layer: SpriteLayer): void {
    this.layers.set(layer.id, layer);
  }

  public removeLayer(id: string): boolean {
    return this.layers.delete(id);
  }

  public getLayer(id: string): SpriteLayer | undefined {
    return this.layers.get(id);
  }

  public hasLayer(id: string): boolean {
    return this.layers.has(id);
  }

  public clearLayers(): void {
    this.layers.clear();
  }

  public setDirection(dir: EightDirectionName): void {
    this.direction = dir;
    this.animController.setDirection(dir);
  }

  public getDirection(): EightDirectionName {
    return this.direction;
  }

  public getAnimationController(): AnimationController {
    return this.animController;
  }

  /**
   * Returns all active layers sorted in back-to-front rendering order (ascending z-index).
   */
  public getSortedDrawList(): ComposedDrawItem[] {
    const activeLayers: ComposedDrawItem[] = [];
    const animState = this.animController.getState();
    const frameIndex = this.animController.getSynchronizer().getCurrentFrame();

    for (const [_, layer] of this.layers) {
      if (!layer.visible) continue;

      const zIndex = layer.zIndex !== undefined
        ? layer.zIndex
        : LayerSortManager.resolveZIndex(layer.category, this.direction, animState, frameIndex);

      activeLayers.push({
        id: layer.id,
        category: layer.category,
        zIndex,
        layer,
      });
    }

    return activeLayers.sort((a, b) => {
      if (a.zIndex !== b.zIndex) return a.zIndex - b.zIndex;
      return a.id.localeCompare(b.id);
    });
  }

  public update(deltaMs?: number): number {
    return this.animController.update(deltaMs);
  }
}
