import type { EightDirectionName, LayerCategory } from '../../assets/AssetManifest.ts';
import type { AnchorPointType } from './SpriteAnchorManager.ts';

export interface SpriteLayerOptions {
  id: string;
  category: LayerCategory;
  textureKey?: string;
  image?: HTMLImageElement | HTMLCanvasElement;
  visible?: boolean;
  alpha?: number;
  tint?: number | string;
  zIndex?: number;
  anchorPoint?: AnchorPointType;
  offsetX?: number;
  offsetY?: number;
}

/**
 * SpriteLayer represents an individual modular Paper Doll layer
 * (e.g., hair, chest armor, left hand shield, weapon, boots).
 */
export class SpriteLayer {
  public id: string;
  public category: LayerCategory;
  public textureKey?: string;
  public image?: HTMLImageElement | HTMLCanvasElement;
  public visible: boolean;
  public alpha: number;
  public tint?: number | string;
  public zIndex?: number;
  public anchorPoint: AnchorPointType;
  public offsetX: number;
  public offsetY: number;

  constructor(options: SpriteLayerOptions) {
    this.id = options.id;
    this.category = options.category;
    this.textureKey = options.textureKey;
    this.image = options.image;
    this.visible = options.visible !== undefined ? options.visible : true;
    this.alpha = options.alpha !== undefined ? options.alpha : 1.0;
    this.tint = options.tint;
    this.zIndex = options.zIndex;
    this.anchorPoint = options.anchorPoint || 'torso';
    this.offsetX = options.offsetX || 0;
    this.offsetY = options.offsetY || 0;
  }

  public setVisible(val: boolean): void {
    this.visible = val;
  }

  public setAlpha(alpha: number): void {
    this.alpha = Math.max(0, Math.min(1, alpha));
  }

  public setTexture(textureKey: string, image?: HTMLImageElement | HTMLCanvasElement): void {
    this.textureKey = textureKey;
    if (image) this.image = image;
  }
}
