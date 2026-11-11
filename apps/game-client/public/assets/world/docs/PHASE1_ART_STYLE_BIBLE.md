# ELYSIA NO DENSETSU – World Map Art Style Bible & Phaser 3 Isometric Integration Spec (Phase 1)

> **Scope:** Phase 1 – Master Art Style Foundation (`apps/game-client/public/assets/world/`)
> **Compatibility Guarantee:** Existing live Canvas2D assets under `apps/game-client/public/assets/elysia/` and `manifest.json` are untouched; Phase 1 builds the clean Phaser 3 Isometric 2.5D shared world asset library alongside them.

---

## 1. Camera & Isometric 2:1 Dimetric Projection Standard

* **Projection Ratio:** Classic **2:1 Dimetric Isometric** ($\arctan(0.5) \approx 26.565^\circ$ tilt relative to horizontal).
* **Base Terrain Diamond Tile:** **`256 × 128 px`** (`tileWidth = 256`, `tileHeight = 128`), PNG RGBA with exact transparency outside the diamond.
* **Screen ↔ World Grid Transform (Staggered Diamond Origin `(originX, originY)`):**
  ```ts
  // Grid (col, row) -> World Pixel Center (screenX, screenY)
  export function isoToWorld(col: number, row: number, originX = 0, originY = 0) {
    return {
      x: originX + (col - row) * (256 * 0.5), // (col - row) * 128
      y: originY + (col + row) * (128 * 0.5), // (col + row) * 64
    };
  }

  // World Pixel (worldX, worldY) -> Continuous Grid (col, row)
  export function worldToIso(worldX: number, worldY: number, originX = 0, originY = 0) {
    const dx = (worldX - originX) / 128;
    const dy = (worldY - originY) / 64;
    return {
      col: (dx + dy) * 0.5,
      row: (dy - dx) * 0.5,
    };
  }
  ```
* **Pixel-Exact Edge Coverage Proof:** Using `|px + 0.5 - 128| + 2 * |py + 0.5 - 64| < 128.0` guarantees every screen pixel across an entire isometric grid belongs to **strictly one** diamond tile with **zero 1px seams and zero semi-transparent background bleed** between neighboring ground tiles.

---

## 2. Lighting, Outline & Palette Standard

* **Key Light Direction:** **`-45°` Upper-Left Warm Sunlit Key** (`#FFE7B3`), casting directional softness and rim highlights on roofs, cobblestones, tree crowns, and fountain water.
* **Ambient Bounce & Contact Shadows:** Cool lavender-slate ambient fill (`#6F7896`) in recessed eaves and cool indigo-plum multiply ground ellipses (`#2B2240` at ~`55%` alpha). **Never use pure neutral `#000000` black shadows.**
* **Linework / Outlines:** Hand-painted warm sepia-charcoal variable-weight outer contours (`#332421` to `#4A352C`), thicker at base foundations and thinner toward sunlit crests.
* **Core Palette Harmonies:**
  | Surface | Highlight | Midtone | Shadow / Accent |
  | :--- | :--- | :--- | :--- |
  | Lush Meadow Grass | `#A5C954` | `#74A838` | `#4A7527` |
  | Shade / Deep Canopy | `#508C45` | `#2F6936` | `#1C4426` |
  | Warm Dirt Trail | `#DEB67A` | `#B8864D` | `#845931` |
  | Plaza Travertine / Cobble | `#EDE0C8` | `#CBB89D` | `#8E7F6B` |
  | Chibi Fantasy Water | `#95F6FF` | `#40C9E2` | `#2489B3` |
  | Roof Terracotta Tile | `#EB8C56` | `#C75D34` | `#823522` |
  | Sakura Foliage | `#FFD8EA` | `#F49BC1` | `#C76792` |
  | Timber & Sepia Ink | `#C48F59` | `#8D5E38` | `#332421` |

---

## 3. Object Scale & Proportion Guidelines (1:1 World Pixel Parity)

Reference hero unit: **Chibi Adventurer = `128 px` visual body height** (`~1:2.2` head-to-body anime chibi silhouette) inside a `192 × 160` animation frame (`origin: { x: 0.5, y: 0.91 }`).

Every world asset in `assets/world/shared/` is **pre-normalized to `1.0x` native scale** so placing any building, tree, or prop on a `256×128` grid gives immediate balanced MMORPG proportions without ad-hoc scaling hacks:

| Category | Asset Examples | Target Visual Height | Scale Ratio vs Chibi (`128px`) | Isometric Grid Lot |
| :--- | :--- | :--- | :--- | :--- |
| **Major Buildings** | `house_01`, `blacksmith_01`, `item_shop_01` | `450 – 476 px` | `3.5x – 3.7x` | `~2 × 2` diamonds |
| **Landmarks & Gates** | `sacred_fountain_01`, `torii_01`, `bridge_wood_01` | `310 – 455 px` | `2.4x – 3.6x` | `~2 × 2` / bridge `2 × 1` |
| **Hero Canopy Trees** | `tree_sakura_01`, `tree_maple_01`, `tree_pine_01` | `442 – 456 px` | `3.45x – 3.56x` | `1 × 1` trunk center |
| **Street Lantern / Fence** | `lantern_01`, `fence_wood_01` | `154 – 212 px` | `1.2x – 1.65x` | Edge / corner prop |
| **Rocks, Barrels, Bushes** | `rock_mossy_01`, `barrel_01`, `crate_01`, `bush_01`, `flowers_01` | `84 – 122 px` | `0.65x – 0.95x` | Small accent prop |

---

## 4. Layer Stack & Ground-Contact Depth Sorting

1. **Layer 1 – Terrain Base (`depth = 0`)**: Seamless `256×128` diamond tiles & `water_anim_strip.png` (`4 fps`).
2. **Layer 2 – Edge/Corner Transitions (`depth = 1`)**: Hand-painted feathery grass overhangs, travertine plaza curbs, shoreline mossy rocks & foam.
3. **Layer 3 – Path & Puddle Decals (`depth = 2`)**: Optional cobblestones, wheel ruts, stepping stones.
4. **Layer 4 – Ground Clutter (`depth = 3` or early Y)**: Flat flowers, grass blades walkable underfoot.
5. **Layer 5 – Contact Shadows (`depth = owner.depth - 0.5`)**: Soft cool-plum ellipses (`shadow_iso_01.png`), slightly darkened under awnings.
6. **Layers 6–8 – Y-Sorted Obstacles, Structures, Trees, Players, NPCs, Monsters (`depth = worldY`)**:
   - All vertical world sprites set `sprite.setOrigin(meta.origin.x, meta.origin.y)` pinned at **ground-contact center** (trunk base, fountain pedestal, porch threshold, hero feet).
   - **Occlusion Rule:** Whenever hero `worldY < object.worldY`, hero renders **behind** the Sakura canopy / cottage roof eave; whenever hero `worldY >= object.worldY`, hero renders cleanly **in front**.
7. **Layer 9 – Foreground Canopies / Torii Top Beams (`depth = worldY` or elevated overhang)** & **Layer 10 – Lighting, Falling Petals, Sunbeams**.
8. **Layer 11 – Non-Visual Collision (`collision.json`)**: Strictly decoupled from sprite PNGs! Foot-only diamond polygons, dual pillar circles (`torii_01`), and trunk ellipses allow avatars to brush naturally behind wide roofs and foliage canopies.

---

## 5. Phaser 3 TypeScript Integration Guide

Place this loader inside your Phaser 3 World Scene (`apps/game-client/src/phaser/IsometricWorldScene.ts`):

```ts
import Phaser from 'phaser';

interface AssetOrigin {
  x: number;
  y: number;
}

interface SharedAssetMeta {
  id: string;
  path: string;
  type: string;
  width: number;
  height: number;
  origin: AssetOrigin;
  depthLayer: number;
  collisionType: string;
  animation?: {
    type: string;
    stripPath: string;
    frameWidth: number;
    frameHeight: number;
    frames: number;
    fps: number;
  } | null;
}

export class IsometricWorldScene extends Phaser.Scene {
  private sharedAssets = new Map<string, SharedAssetMeta>();
  private player?: Phaser.GameObjects.Sprite;

  preload(): void {
    this.load.json('world_shared_manifest', '/assets/world/shared/manifest.json');
    this.load.json('sample_map', '/assets/world/phase1_sample/map.json');
    this.load.json('sample_collision', '/assets/world/phase1_sample/collision.json');
  }

  create(): void {
    const manifest = this.cache.json.get('world_shared_manifest') as {
      baseUrl: string;
      assets: SharedAssetMeta[];
    };

    // Second-pass dynamic asset queue from manifest
    for (const item of manifest.assets) {
      this.sharedAssets.set(item.id, item);
      if (item.animation?.stripPath) {
        this.load.spritesheet(`${item.id}_sheet`, `${manifest.baseUrl}${item.animation.stripPath}`, {
          frameWidth: item.animation.frameWidth,
          frameHeight: item.animation.frameHeight,
        });
      } else {
        this.load.image(item.id, `${manifest.baseUrl}${item.path}`);
      }
    }

    this.load.once(Phaser.Loader.Events.COMPLETE, () => this.buildScene());
    this.load.start();
  }

  private buildScene(): void {
    const map = this.cache.json.get('sample_map');
    const ox = map.worldOriginPx.x;
    const oy = map.worldOriginPx.y;

    if (!this.anims.exists('iso_water_loop') && this.textures.exists('iso_water_01_sheet')) {
      this.anims.create({
        key: 'iso_water_loop',
        frames: this.anims.generateFrameNumbers('iso_water_01_sheet', { start: 0, end: 3 }),
        frameRate: 4,
        repeat: -1,
      });
    }

    // Layer 1: Isometric Diamond Ground
    map.layers.ground.forEach((rowArr: string[], r: number) => {
      rowArr.forEach((tileId: string, c: number) => {
        const x = ox + (c - r) * 128;
        const y = oy + (c + r) * 64;
        if (tileId.startsWith('iso_water') && this.textures.exists('iso_water_01_sheet')) {
          const tile = this.add.sprite(x, y, 'iso_water_01_sheet').setDepth(0);
          tile.play({ key: 'iso_water_loop', startFrame: (c + r) % 4 });
        } else {
          this.add.image(x, y, tileId).setOrigin(0.5, 0.5).setDepth(0);
        }
      });
    });

    // Layer 2: Edge & Corner Transitions
    for (const tr of map.layers.transitions) {
      const x = ox + (tr.col - tr.row) * 128;
      const y = oy + (tr.col + tr.row) * 64;
      this.add.image(x, y, tr.tileId).setOrigin(0.5, 0.5).setDepth(1);
    }

    // Layers 5–7: Props & Buildings Y-Depth Sorted by Ground Contact Y
    for (const obj of map.layers.objects) {
      const meta = this.sharedAssets.get(obj.assetId);
      if (!meta) continue;
      const spr = this.add
        .image(obj.worldX, obj.worldY, obj.assetId)
        .setOrigin(meta.origin.x, meta.origin.y)
        .setScale(obj.scale ?? 1)
        .setDepth(obj.assetId.startsWith('bridge') ? obj.worldY - 2 : obj.worldY);
      void spr;
    }

    // Camera setup for smooth pixel-sharp panning
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.setZoom(1.0);
  }

  update(): void {
    // Dynamic runtime Y-sort for Player, NPCs & Monsters:
    if (this.player) {
      this.player.setDepth(this.player.y);
    }
  }
}
```
