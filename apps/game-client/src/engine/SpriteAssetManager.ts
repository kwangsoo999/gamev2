import type { AnimState, EquipSlotKey, FacingDirection, InventoryItemDef, SpriteSheetMeta } from './types';

export type EightDirection =
  | 'south'
  | 'south_west'
  | 'west'
  | 'north_west'
  | 'north'
  | 'north_east'
  | 'east'
  | 'south_east';

export interface CharacterSheetConfig {
  id: string;
  gender: 'male' | 'female';
  jobId: string;
  atlasPath: string;
  frameWidth: number;
  frameHeight: number;
  directions: 4 | 8;
  directionMap: Record<EightDirection, number>;
  animations: Record<
    AnimState,
    { row: number; frames: number; fps: number; loop: boolean }
  >;
  anchorX: number;
  anchorY: number;
  modularLayers?: Partial<Record<EquipSlotKey, Record<string, string>>>;
}

export interface PaperDollCompositeOptions {
  gender: 'male' | 'female';
  jobId: string;
  animState: AnimState;
  direction: EightDirection;
  frameIndex: number;
  equipment: Partial<Record<EquipSlotKey, InventoryItemDef>>;
  scale?: number;
  zoom?: number;
  tint?: string;
  hitFlash?: boolean;
}

/**
 * Enterprise Sprite & Paper Doll Asset Manager for Elysia no Densetsu.
 * Provides unified texture caching, 8-direction animation resolution,
 * layered paper doll equipment compositing, and graceful asset fallbacks.
 */
export class SpriteAssetManager {
  private static instance: SpriteAssetManager | null = null;
  private imageCache = new Map<string, HTMLImageElement>();
  private pendingLoads = new Map<string, Promise<HTMLImageElement>>();
  private characterConfigs = new Map<string, CharacterSheetConfig>();

  public static readonly DIRECTIONS_8: EightDirection[] = [
    'south',
    'south_west',
    'west',
    'north_west',
    'north',
    'north_east',
    'east',
    'south_east',
  ];

  public static readonly PAPER_DOLL_LAYER_ORDER: EquipSlotKey[] = [
    'cloak',      // 1. Cape / Cloak (Back)
    'boots',      // 2. Footwear
    'armor',      // 3. Torso / Pants
    'gloves',     // 4. Handwear
    'shoulder',   // 5. Pauldrons
    'head',       // 6. Helm / Crown / Hat
    'weapon',     // 7. Mainhand Weapon
  ];

  constructor() {
    this.registerDefaultCharacterConfigs();
  }

  public static getInstance(): SpriteAssetManager {
    if (!SpriteAssetManager.instance) {
      SpriteAssetManager.instance = new SpriteAssetManager();
    }
    return SpriteAssetManager.instance;
  }

  private registerDefaultCharacterConfigs() {
    // 8 standard job mappings + Novice (male & female)
    const jobs = [
      'novice',
      'swordsman',
      'warrior',
      'knight',
      'paladin',
      'mage',
      'priest',
      'monk',
      'assassin',
      'archer',
      'lancer',
      'spearman',
      'fighter',
    ];

    for (const job of jobs) {
      // Male default config
      const maleAtlas =
        job === 'novice'
          ? '/assets/elysia/characters/animations/player.png'
          : `/assets/elysia/characters/animations/job_${job === 'warrior' ? 'warrior' : job === 'knight' ? 'paladin' : job === 'spearman' ? 'lancer' : job === 'fighter' ? 'warrior' : job === 'monk' ? 'priest' : job}.png`;

      this.registerConfig({
        id: `char_male_${job}`,
        gender: 'male',
        jobId: job,
        atlasPath: maleAtlas,
        frameWidth: 64,
        frameHeight: 64,
        directions: 4,
        directionMap: {
          south: 0,
          south_west: 1, // fallback to west
          west: 1,
          north_west: 1, // fallback to west
          north: 3,
          north_east: 2, // fallback to east
          east: 2,
          south_east: 2, // fallback to east
        },
        animations: {
          idle: { row: 0, frames: 6, fps: 8, loop: true },
          walk: { row: 1, frames: 8, fps: 12, loop: true },
          run: { row: 2, frames: 8, fps: 15, loop: true },
          attack: { row: 3, frames: 6, fps: 16, loop: false },
          skill: { row: 4, frames: 8, fps: 16, loop: false },
          hurt: { row: 5, frames: 3, fps: 12, loop: false },
          death: { row: 6, frames: 6, fps: 10, loop: false },
        },
        anchorX: 0.5,
        anchorY: 0.85,
        modularLayers: {
          head: {
            helm_bronze: '/assets/weapons/test_shield_icon_1794157321383.png',
          },
          weapon: {
            sword_novice: '/assets/weapons/wooden_sword_sprite.png',
            sword_excalibur: '/assets/weapons/excalibur_sword_sprite.png',
            bow_novice: '/assets/weapons/novice_bow_sprite.png',
          },
        },
      });

      // Female default config
      const femaleAtlas =
        job === 'novice'
          ? '/assets/characters/female/novice/animations/novice_female_master_atlas.png'
          : maleAtlas; // graceful fallback to high-quality master job atlas

      this.registerConfig({
        id: `char_female_${job}`,
        gender: 'female',
        jobId: job,
        atlasPath: femaleAtlas,
        frameWidth: 64,
        frameHeight: 64,
        directions: 8,
        directionMap: {
          south: 0,
          south_west: 1,
          west: 2,
          north_west: 3,
          north: 4,
          north_east: 5,
          east: 6,
          south_east: 7,
        },
        animations: {
          idle: { row: 0, frames: 6, fps: 8, loop: true },
          walk: { row: 1, frames: 6, fps: 12, loop: true },
          run: { row: 2, frames: 6, fps: 15, loop: true },
          attack: { row: 3, frames: 5, fps: 16, loop: false },
          skill: { row: 4, frames: 5, fps: 16, loop: false },
          hurt: { row: 5, frames: 5, fps: 12, loop: false },
          death: { row: 6, frames: 6, fps: 10, loop: false },
        },
        anchorX: 0.5,
        anchorY: 0.85,
      });
    }
  }

  public registerConfig(config: CharacterSheetConfig) {
    this.characterConfigs.set(config.id, config);
  }

  public getConfig(gender: 'male' | 'female', jobId: string): CharacterSheetConfig {
    const normJob = (jobId || 'novice').toLowerCase();
    const key = `char_${gender}_${normJob}`;
    return (
      this.characterConfigs.get(key) ||
      this.characterConfigs.get(`char_${gender}_novice`) ||
      this.characterConfigs.get('char_male_novice')!
    );
  }

  /**
   * Asynchronously loads an image texture with promise deduplication and caching.
   */
  public async loadImage(path: string): Promise<HTMLImageElement> {
    if (this.imageCache.has(path)) {
      return this.imageCache.get(path)!;
    }
    if (this.pendingLoads.has(path)) {
      return this.pendingLoads.get(path)!;
    }

    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        this.imageCache.set(path, img);
        this.pendingLoads.delete(path);
        resolve(img);
      };
      img.onerror = () => {
        this.pendingLoads.delete(path);
        // Fallback to placeholder or reject cleanly
        const fallback = this.createFallbackPlaceholder(path);
        this.imageCache.set(path, fallback);
        resolve(fallback);
      };
      img.src = path;
    });

    this.pendingLoads.set(path, promise);
    return promise;
  }

  public getImageSync(path: string): HTMLImageElement | null {
    return this.imageCache.get(path) || null;
  }

  private createFallbackPlaceholder(path: string): HTMLImageElement {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(100, 116, 139, 0.4)';
    ctx.fillRect(0, 0, 64, 64);
    ctx.strokeStyle = '#e2e8f0';
    ctx.strokeRect(2, 2, 60, 60);
    const img = new Image();
    img.src = canvas.toDataURL();
    return img;
  }

  /**
   * Preloads common character textures for seamless UI inspection without hitching.
   */
  public async preloadCommonAssets(): Promise<void> {
    const paths = [
      '/assets/elysia/characters/animations/player.png',
      '/assets/characters/female/novice/animations/novice_female_master_atlas.png',
      '/assets/elysia/characters/animations/job_swordsman.png',
      '/assets/elysia/characters/animations/job_warrior.png',
      '/assets/elysia/characters/animations/job_mage.png',
      '/assets/elysia/characters/animations/job_paladin.png',
      '/assets/elysia/characters/animations/job_priest.png',
      '/assets/weapons/wooden_sword_sprite.png',
      '/assets/weapons/excalibur_sword_sprite.png',
      '/assets/weapons/novice_bow_sprite.png',
    ];

    await Promise.allSettled(paths.map((p) => this.loadImage(p)));
  }

  /**
   * Resolves the 8-directional frame column index given a configuration and target direction.
   */
  public resolveDirectionColumn(config: CharacterSheetConfig, direction: EightDirection): number {
    const col = config.directionMap[direction];
    return col !== undefined ? col : 0;
  }

  /**
   * Renders a fully composited Paper Doll character onto a 2D canvas context.
   */
  public renderPaperDoll(
    ctx: CanvasRenderingContext2D,
    options: PaperDollCompositeOptions,
    destX: number,
    destY: number,
    targetWidth: number,
    targetHeight: number
  ) {
    const config = this.getConfig(options.gender, options.jobId);
    const clip = config.animations[options.animState] || config.animations.idle;
    const frameIndex = options.frameIndex % Math.max(1, clip.frames);
    const dirCol = this.resolveDirectionColumn(config, options.direction);

    const zoom = options.zoom || 1.0;
    const scale = (options.scale || 1.0) * zoom;
    const drawW = targetWidth * scale;
    const drawH = targetHeight * scale;
    const renderX = destX - (drawW * config.anchorX);
    const renderY = destY - (drawH * config.anchorY);

    ctx.save();

    // Visual hit flash or tint
    if (options.hitFlash) {
      ctx.filter = 'brightness(1.8) drop-shadow(0 0 8px rgba(255,255,255,0.8))';
    } else if (options.tint) {
      ctx.filter = options.tint;
    }

    // 1. Draw subtle soft character pedestal shadow
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(destX, destY + 2, drawW * 0.28, drawH * 0.08, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fill();
    ctx.restore();

    // 2. Base Character Sprite Body
    const baseImg = this.getImageSync(config.atlasPath);
    if (baseImg && baseImg.complete && baseImg.naturalWidth > 0) {
      const srcX = (dirCol * clip.frames + frameIndex) * config.frameWidth;
      const srcY = clip.row * config.frameHeight;

      // Safe source clamping
      if (srcX + config.frameWidth <= baseImg.naturalWidth && srcY + config.frameHeight <= baseImg.naturalHeight) {
        ctx.drawImage(
          baseImg,
          srcX,
          srcY,
          config.frameWidth,
          config.frameHeight,
          renderX,
          renderY,
          drawW,
          drawH
        );
      } else {
        // Fallback full draw if non-grid sheet
        ctx.drawImage(baseImg, renderX, renderY, drawW, drawH);
      }
    } else {
      // Draw temporary stylish loading silhouette
      ctx.fillStyle = 'rgba(212, 175, 55, 0.2)';
      ctx.beginPath();
      ctx.arc(destX, destY - drawH * 0.5, drawW * 0.3, 0, Math.PI * 2);
      ctx.fill();
      // Trigger background load
      void this.loadImage(config.atlasPath);
    }

    // 3. Layered Equipment (Paper Doll System)
    for (const slot of SpriteAssetManager.PAPER_DOLL_LAYER_ORDER) {
      const item = options.equipment[slot];
      if (!item) continue;

      const layerPath =
        config.modularLayers?.[slot]?.[item.iconKey] ||
        (slot === 'weapon' && item.iconKey.includes('sword') ? '/assets/weapons/wooden_sword_sprite.png' : null) ||
        (slot === 'head' && item.iconKey.includes('helm') ? '/assets/weapons/test_shield_icon_1794157321383.png' : null);

      if (!layerPath) continue;

      const layerImg = this.getImageSync(layerPath);
      if (layerImg && layerImg.complete && layerImg.naturalWidth > 0) {
        // Overlay weapon / armor layer matching anchor
        ctx.save();
        if (slot === 'weapon') {
          // Adjust weapon positioning relative to right hand
          const weaponOffsetX = drawW * 0.18;
          const weaponOffsetY = drawH * 0.05;
          ctx.drawImage(layerImg, renderX + weaponOffsetX, renderY + weaponOffsetY, drawW * 0.6, drawH * 0.6);
        } else if (slot === 'head') {
          // Adjust headgear relative to head
          const headOffsetY = -drawH * 0.12;
          ctx.drawImage(layerImg, renderX + drawW * 0.2, renderY + headOffsetY, drawW * 0.6, drawH * 0.45);
        } else {
          ctx.drawImage(layerImg, renderX, renderY, drawW, drawH);
        }
        ctx.restore();
      } else {
        void this.loadImage(layerPath);
      }
    }

    ctx.restore();
  }
}

export const spriteAssetManager = SpriteAssetManager.getInstance();
