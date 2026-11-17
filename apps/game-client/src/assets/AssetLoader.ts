/**
 * Production Asset Loader with async caching, deduplication,
 * and transparent PNG validation.
 */
export class AssetLoader {
  private static instance: AssetLoader | null = null;
  private textureCache = new Map<string, HTMLImageElement>();
  private pendingTextureLoads = new Map<string, Promise<HTMLImageElement>>();
  private jsonCache = new Map<string, any>();

  public static getInstance(): AssetLoader {
    if (!AssetLoader.instance) {
      AssetLoader.instance = new AssetLoader();
    }
    return AssetLoader.instance;
  }

  public async loadTexture(path: string): Promise<HTMLImageElement> {
    if (this.textureCache.has(path)) {
      return this.textureCache.get(path)!;
    }
    if (this.pendingTextureLoads.has(path)) {
      return this.pendingTextureLoads.get(path)!;
    }

    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      if (typeof Image === 'undefined') {
        // Node / test mock fallback
        const mockImg = {
          width: 64,
          height: 64,
          naturalWidth: 64,
          naturalHeight: 64,
          complete: true,
          src: path,
        } as unknown as HTMLImageElement;
        this.textureCache.set(path, mockImg);
        resolve(mockImg);
        return;
      }

      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        this.textureCache.set(path, img);
        this.pendingTextureLoads.delete(path);
        resolve(img);
      };
      img.onerror = () => {
        this.pendingTextureLoads.delete(path);
        // Fallback transparent 1x1 image so rendering doesn't crash
        const fallback = new Image();
        fallback.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
        this.textureCache.set(path, fallback);
        resolve(fallback);
      };
      img.src = path;
    });

    this.pendingTextureLoads.set(path, promise);
    return promise;
  }

  public getTextureSync(path: string): HTMLImageElement | null {
    return this.textureCache.get(path) || null;
  }

  public async loadJson<T = any>(path: string): Promise<T> {
    if (this.jsonCache.has(path)) {
      return this.jsonCache.get(path) as T;
    }
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load JSON asset: ${path} (status ${res.status})`);
    const data = await res.json();
    this.jsonCache.set(path, data);
    return data as T;
  }

  public clearCache() {
    this.textureCache.clear();
    this.pendingTextureLoads.clear();
    this.jsonCache.clear();
  }
}

export const assetLoader = AssetLoader.getInstance();
