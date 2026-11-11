import { ArtworkAssetDef, ArtworkManifest } from './types';

/** The only production artwork loader. Missing artwork is a startup error. */
export class ArtworkLibrary {
  private readonly images = new Map<string, HTMLImageElement>();
  private readonly pendingPaths = new Map<string, Promise<HTMLImageElement>>();
  public readonly loadedPaths: string[] = [];

  constructor(public readonly manifest: ArtworkManifest) {
    if (manifest.schemaVersion !== '2.0.0' || !manifest.assets?.length) {
      throw new Error('Thư viện artwork v2 chưa được sản xuất. Chạy quy trình sản xuất ảnh trong art-production.');
    }
  }

  private async loadSingleAsset(asset: ArtworkAssetDef): Promise<HTMLImageElement | null> {
    if (!asset.path.startsWith('/assets/elysia/') || !/\.(png|webp)$/.test(asset.path)) {
      throw new Error('Đường dẫn không thuộc thư viện PNG/WebP Elysia mới');
    }
    let request = this.pendingPaths.get(asset.path);
    if (!request) {
      request = new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.decoding = 'async';
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Không nạp được ảnh'));
        image.src = asset.path;
      });
      this.pendingPaths.set(asset.path, request);
    }
    const image = await request;
    if (image.naturalWidth !== asset.dimensions[0] || image.naturalHeight !== asset.dimensions[1]) {
      throw new Error(`Sai kích thước: ${image.naturalWidth} × ${image.naturalHeight}`);
    }
    this.images.set(asset.id, image);
    if (!this.loadedPaths.includes(asset.path)) this.loadedPaths.push(asset.path);
    return image;
  }

  public async load(onProgress?: (loaded: number, total: number) => void) {
    const errors: string[] = [];
    let completed = 0;
    const ids = new Set<string>();
    const eagerAssets: ArtworkAssetDef[] = [];
    const deferredAssets: ArtworkAssetDef[] = [];

    for (const asset of this.manifest.assets) {
      if (ids.has(asset.id)) {
        errors.push(`Trùng mã artwork: ${asset.id}`);
        continue;
      }
      ids.add(asset.id);
      if (asset.loading === 'deferred' || asset.loading === 'lazy') {
        deferredAssets.push(asset);
      } else {
        eagerAssets.push(asset);
      }
    }

    await Promise.all(eagerAssets.map(async (asset) => {
      try {
        await this.loadSingleAsset(asset);
      } catch (error) {
        errors.push(`${asset.id} — ${asset.path}: ${error instanceof Error ? error.message : String(error)}`);
      }
      onProgress?.(++completed, Math.max(1, eagerAssets.length));
    }));
    if (errors.length) throw new Error(`Thiếu hoặc lỗi artwork:\n${errors.join('\n')}`);
    this.validateReferences();

    // Background-preload remaining VFX sheets cleanly after game startup
    if (deferredAssets.length) {
      void Promise.allSettled(deferredAssets.map((asset) => this.loadSingleAsset(asset)));
    }
  }

  public getOptional(id: string): HTMLImageElement | undefined {
    const hit = this.images.get(id);
    if (hit) return hit;
    const def = this.manifest.assets.find((a) => a.id === id);
    if (def) void this.loadSingleAsset(def);
    return undefined;
  }

  public image(id: string): HTMLImageElement {
    const image = this.images.get(id);
    if (!image) throw new Error(`Artwork chưa được nạp: ${id}`);
    return image;
  }

  public has(id: string): boolean { return this.images.has(id); }

  private validateReferences() {
    const m = this.manifest;
    const ids = [
      ...Object.values(m.terrain).flat(), ...m.waterFrames, ...m.decorations,
      ...Object.values(m.objectTypes).map((entry) => entry.assetId),
      ...Object.values(m.objectOverrides).map((entry) => entry.assetId),
      ...Object.values(m.effects),
      ...Object.values(m.transitions.road), ...Object.values(m.transitions.water),
    ];
    for (const id of ids) this.image(id);
  }
}
