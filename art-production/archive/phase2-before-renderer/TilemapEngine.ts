import { GroundTileId, MapObjectDef, TilePoint, VillageMapData, WorldPoint } from './types';

/**
 * TilemapEngine handles:
 * - Layer 0: Offscreen pre-baked orthographic terrain (grass, dirt, stream water, stone)
 * - Layer 1: Architectural & environmental props rendered inside Y-sorted world buckets
 * - Layer 2: Walkable/unwalkable grid collision, axis-separated sliding, and lightweight A* pathfinding
 */
export class TilemapEngine {
  public readonly map: VillageMapData;
  public readonly worldWidth: number;
  public readonly worldHeight: number;

  private bakedGroundCanvas: HTMLCanvasElement;
  private minimapCacheCanvas: HTMLCanvasElement;

  constructor(mapData: VillageMapData) {
    this.map = mapData;
    this.worldWidth = mapData.cols * mapData.tileSize;
    this.worldHeight = mapData.rows * mapData.tileSize;

    this.bakedGroundCanvas = document.createElement('canvas');
    this.bakedGroundCanvas.width = this.worldWidth;
    this.bakedGroundCanvas.height = this.worldHeight;

    this.minimapCacheCanvas = document.createElement('canvas');
    this.minimapCacheCanvas.width = mapData.cols * 4;
    this.minimapCacheCanvas.height = mapData.rows * 4;

    this.bakeGroundLayer();
    this.bakeMinimapBase();
  }

  public get tileSize(): number {
    return this.map.tileSize;
  }

  public get cols(): number {
    return this.map.cols;
  }

  public get rows(): number {
    return this.map.rows;
  }

  public tileToWorldCenter(tx: number, ty: number): WorldPoint {
    const s = this.map.tileSize;
    return { x: tx * s + s * 0.5, y: ty * s + s * 0.5 };
  }

  public worldToTile(x: number, y: number): TilePoint {
    const s = this.map.tileSize;
    return {
      tx: Math.max(0, Math.min(this.cols - 1, Math.floor(x / s))),
      ty: Math.max(0, Math.min(this.rows - 1, Math.floor(y / s))),
    };
  }

  public isTileWalkable(tx: number, ty: number): boolean {
    if (tx < 0 || ty < 0 || tx >= this.cols || ty >= this.rows) return false;
    return this.map.layers.collision[ty][tx] === 0;
  }

  public canOccupyFootprint(px: number, py: number, radius = 12): boolean {
    const checks: [number, number][] = [
      [px - radius, py - radius * 0.5],
      [px + radius, py - radius * 0.5],
      [px - radius, py + radius * 0.5],
      [px + radius, py + radius * 0.5],
    ];
    for (const [cx, cy] of checks) {
      if (cx < 8 || cy < 8 || cx >= this.worldWidth - 8 || cy >= this.worldHeight - 8) return false;
      const { tx, ty } = this.worldToTile(cx, cy);
      if (!this.isTileWalkable(tx, ty)) return false;
    }
    return true;
  }

  /**
   * Axis-separated sliding collision resolution against Layer 2 grid.
   */
  public resolveMove(fromX: number, fromY: number, toX: number, toY: number, radius = 12): WorldPoint {
    let rx = fromX;
    let ry = fromY;
    if (this.canOccupyFootprint(toX, ry, radius)) rx = toX;
    if (this.canOccupyFootprint(rx, toY, radius)) ry = toY;
    return { x: rx, y: ry };
  }

  /**
   * Fast A* pathfinder across Layer 2 collision grid (8-directional with corner-cut protection).
   */
  public findPath(startX: number, startY: number, goalX: number, goalY: number): WorldPoint[] {
    const start = this.worldToTile(startX, startY);
    const goal = this.worldToTile(goalX, goalY);
    if (!this.isTileWalkable(goal.tx, goal.ty)) {
      return [];
    }
    if (start.tx === goal.tx && start.ty === goal.ty) {
      return [{ x: goalX, y: goalY }];
    }

    const cols = this.cols;
    const rows = this.rows;
    const size = cols * rows;
    const gScore = new Float32Array(size).fill(Infinity);
    const fScore = new Float32Array(size).fill(Infinity);
    const cameFrom = new Int32Array(size).fill(-1);
    const closed = new Uint8Array(size);

    const startIdx = start.ty * cols + start.tx;
    const goalIdx = goal.ty * cols + goal.tx;
    gScore[startIdx] = 0;
    fScore[startIdx] = Math.hypot(goal.tx - start.tx, goal.ty - start.ty);

    const open: number[] = [startIdx];
    const dirs: [number, number, number][] = [
      [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
      [1, 1, 1.414], [-1, 1, 1.414], [1, -1, 1.414], [-1, -1, 1.414],
    ];

    let iterations = 0;
    while (open.length > 0 && iterations++ < 1800) {
      let bestPos = 0;
      for (let i = 1; i < open.length; i++) {
        if (fScore[open[i]] < fScore[open[bestPos]]) bestPos = i;
      }
      const current = open.splice(bestPos, 1)[0];
      if (current === goalIdx) {
        const result: WorldPoint[] = [];
        let cur = goalIdx;
        while (cur !== -1 && cur !== startIdx) {
          const cx = cur % cols;
          const cy = Math.floor(cur / cols);
          result.push(this.tileToWorldCenter(cx, cy));
          cur = cameFrom[cur];
        }
        result.reverse();
        if (result.length > 0) result[result.length - 1] = { x: goalX, y: goalY };
        return result;
      }

      closed[current] = 1;
      const cx = current % cols;
      const cy = Math.floor(current / cols);

      for (const [dx, dy, cost] of dirs) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (!this.isTileWalkable(nx, ny)) continue;
        // Prevent corner clipping past solid wall corners
        if (dx !== 0 && dy !== 0 && (!this.isTileWalkable(cx + dx, cy) || !this.isTileWalkable(cx, cy + dy))) {
          continue;
        }
        const nIdx = ny * cols + nx;
        if (closed[nIdx]) continue;
        const tentative = gScore[current] + cost;
        if (tentative < gScore[nIdx]) {
          cameFrom[nIdx] = current;
          gScore[nIdx] = tentative;
          fScore[nIdx] = tentative + Math.hypot(goal.tx - nx, goal.ty - ny);
          if (!open.includes(nIdx)) open.push(nIdx);
        }
      }
    }
    return [];
  }

  /**
   * Blit visible slice of pre-baked Layer 0 ground + subtle animated water shimmer.
   */
  public renderGroundLayer(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    viewW: number,
    viewH: number,
    timeMs: number
  ) {
    const sx = Math.max(0, Math.floor(camX));
    const sy = Math.max(0, Math.floor(camY));
    const sw = Math.min(this.worldWidth - sx, Math.ceil(viewW) + 2);
    const sh = Math.min(this.worldHeight - sy, Math.ceil(viewH) + 2);
    if (sw <= 0 || sh <= 0) return;

    ctx.drawImage(this.bakedGroundCanvas, sx, sy, sw, sh, sx - camX, sy - camY, sw, sh);

    // Lightweight animated sparkles only on stream tiles visible inside camera
    const s = this.tileSize;
    const minTx = Math.max(0, Math.floor(sx / s));
    const maxTx = Math.min(this.cols - 1, Math.floor((sx + sw) / s));
    const minTy = Math.max(0, Math.floor(sy / s));
    const maxTy = Math.min(this.rows - 1, Math.floor((sy + sh) / s));

    ctx.save();
    ctx.strokeStyle = 'rgba(224, 247, 255, 0.55)';
    ctx.lineWidth = 2;
    const phase = timeMs * 0.0025;
    for (let ty = minTy; ty <= maxTy; ty++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        if (this.map.layers.ground[ty][tx] === 3) {
          const px = tx * s - camX;
          const py = ty * s - camY;
          const wave = Math.sin(phase + tx * 0.9 + ty * 0.7) * 6;
          ctx.beginPath();
          ctx.moveTo(px + 10, py + s * 0.45 + wave * 0.2);
          ctx.quadraticCurveTo(px + s * 0.5, py + s * 0.45 - wave * 0.4, px + s - 10, py + s * 0.45 + wave * 0.2);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  public getMinimapBase(): HTMLCanvasElement {
    return this.minimapCacheCanvas;
  }

  /**
   * Computes orthographic Y-sort anchor (bottom of footprint) for Layer 1 objects.
   */
  public getObjectSortY(obj: MapObjectDef): number {
    if (obj.type === 'wooden_bridge') return -1000; // Bridges always sit beneath walking players
    return (obj.ty + obj.hTiles) * this.tileSize;
  }

  /**
   * Clean procedural Layer 1 architectural & nature renderer (no image files yet).
   */
  public renderObject(ctx: CanvasRenderingContext2D, obj: MapObjectDef, camX: number, camY: number, timeMs: number) {
    const s = this.tileSize;
    const x = obj.tx * s - camX;
    const y = obj.ty * s - camY;
    const w = obj.wTiles * s;
    const h = obj.hTiles * s;

    ctx.save();
    switch (obj.type) {
      case 'wooden_bridge': {
        ctx.fillStyle = '#8b5a2b';
        ctx.strokeStyle = '#3b2410';
        ctx.lineWidth = 2;
        ctx.fillRect(x - 6, y + 6, w + 12, h - 12);
        ctx.strokeRect(x - 6, y + 6, w + 12, h - 12);
        ctx.fillStyle = '#a46e38';
        for (let px = x; px < x + w; px += 14) {
          ctx.fillRect(px + 2, y + 8, 10, h - 16);
        }
        // Bridge rails
        ctx.fillStyle = '#5c3818';
        ctx.fillRect(x - 6, y + 4, w + 12, 6);
        ctx.fillRect(x - 6, y + h - 10, w + 12, 6);
        break;
      }
      case 'torii_gate':
      case 'torii_shrine': {
        const cx = x + w * 0.5;
        const topY = y + 4;
        const postH = h - 8;
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.beginPath();
        ctx.ellipse(cx, y + h - 4, w * 0.45, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        // Vermilion pillars
        ctx.fillStyle = '#b91c1c';
        ctx.strokeStyle = '#450a0a';
        ctx.lineWidth = 2;
        ctx.fillRect(cx - w * 0.32, topY + 18, 14, postH - 18);
        ctx.strokeRect(cx - w * 0.32, topY + 18, 14, postH - 18);
        ctx.fillRect(cx + w * 0.32 - 14, topY + 18, 14, postH - 18);
        ctx.strokeRect(cx + w * 0.32 - 14, topY + 18, 14, postH - 18);
        // Crossbeams
        ctx.fillRect(cx - w * 0.48, topY + 16, w * 0.96, 10);
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(cx - w * 0.56, topY, w * 1.12, 13);
        ctx.strokeRect(cx - w * 0.56, topY, w * 1.12, 13);
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(cx - w * 0.58, topY - 4, w * 1.16, 6);
        break;
      }
      case 'plaza_tree_fountain': {
        const cx = x + w * 0.5;
        const cy = y + h * 0.72;
        // Stone circular fountain rim + blue water
        ctx.fillStyle = '#9ca3af';
        ctx.strokeStyle = '#4b5563';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(cx, cy, w * 0.46, 26, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.ellipse(cx, cy - 2, w * 0.38, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        // Trunk & Lush Sacred Canopy
        ctx.fillStyle = '#6b4226';
        ctx.fillRect(cx - 10, cy - 52, 20, 48);
        ctx.fillStyle = '#4d7c2b';
        ctx.beginPath();
        ctx.arc(cx, cy - 68, 44, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#7cb342';
        ctx.beginPath();
        ctx.arc(cx - 18, cy - 78, 28, 0, Math.PI * 2);
        ctx.arc(cx + 20, cy - 72, 26, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'village_house_a':
      case 'village_house_b':
      case 'village_shop': {
        const bodyTop = y + h * 0.35;
        const bodyH = h * 0.62;
        ctx.fillStyle = 'rgba(20, 30, 15, 0.25)';
        ctx.fillRect(x + 8, y + h - 10, w - 12, 14);
        // Walls (plaster & timber beams)
        ctx.fillStyle = obj.type === 'village_shop' ? '#efe4cc' : '#f3ead3';
        ctx.strokeStyle = '#3f2a17';
        ctx.lineWidth = 2;
        ctx.fillRect(x + 10, bodyTop, w - 20, bodyH);
        ctx.strokeRect(x + 10, bodyTop, w - 20, bodyH);
        // Wooden doorway + warm lanterns
        ctx.fillStyle = '#6e4321';
        ctx.fillRect(x + w * 0.5 - 14, y + h - 34, 28, 30);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(x + 20, bodyTop + 14, 16, 16);
        ctx.fillRect(x + w - 36, bodyTop + 14, 16, 16);
        // Dark tiled roof overhang
        const roofGrad = ctx.createLinearGradient(x, y, x, bodyTop + 12);
        roofGrad.addColorStop(0, obj.type === 'village_house_b' ? '#475569' : '#334155');
        roofGrad.addColorStop(1, '#1e293b');
        ctx.fillStyle = roofGrad;
        ctx.beginPath();
        ctx.moveTo(x - 6, bodyTop + 10);
        ctx.lineTo(x + w * 0.5, y - 10);
        ctx.lineTo(x + w + 6, bodyTop + 10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'market_stall_striped':
      case 'market_stall_blue': {
        ctx.fillStyle = '#784824';
        ctx.fillRect(x + 10, y + h - 28, w - 20, 22);
        const isStriped = obj.type === 'market_stall_striped';
        ctx.fillStyle = isStriped ? '#dc2626' : '#2563eb';
        ctx.strokeStyle = '#291a0d';
        ctx.lineWidth = 2;
        ctx.fillRect(x + 4, y + 10, w - 8, 34);
        ctx.strokeRect(x + 4, y + 10, w - 8, 34);
        if (isStriped) {
          ctx.fillStyle = '#fef3c7';
          for (let sx = x + 12; sx < x + w - 12; sx += 18) {
            ctx.fillRect(sx, y + 11, 8, 32);
          }
        }
        break;
      }
      case 'training_dummy': {
        const cx = x + w * 0.5;
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.beginPath();
        ctx.ellipse(cx, y + h - 4, 13, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#7c4a21';
        ctx.fillRect(cx - 3, y + 20, 6, 22);
        ctx.fillStyle = '#c49a6c';
        ctx.strokeStyle = '#4a2f15';
        ctx.lineWidth = 1.8;
        ctx.fillRect(cx - 12, y + 15, 24, 7);
        ctx.strokeRect(cx - 12, y + 15, 24, 7);
        ctx.beginPath();
        ctx.arc(cx, y + 10, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'waterwheel_mill': {
        ctx.fillStyle = '#7c5028';
        ctx.strokeStyle = '#3b2410';
        ctx.lineWidth = 2;
        ctx.fillRect(x + 8, y + 12, w * 0.65, h - 18);
        ctx.strokeRect(x + 8, y + 12, w * 0.65, h - 18);
        // Rotating wheel
        const wx = x + w * 0.78;
        const wy = y + h * 0.55;
        ctx.translate(wx, wy);
        ctx.rotate(timeMs * 0.0018);
        ctx.strokeStyle = '#5c3818';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, 22, 0, Math.PI * 2);
        ctx.stroke();
        for (let a = 0; a < 4; a++) {
          ctx.rotate(Math.PI / 2);
          ctx.beginPath();
          ctx.moveTo(-22, 0);
          ctx.lineTo(22, 0);
          ctx.stroke();
        }
        break;
      }
      case 'cave_entrance': {
        const cx = x + w * 0.5;
        ctx.fillStyle = '#64748b';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, y + h);
        ctx.lineTo(x + 18, y + 10);
        ctx.lineTo(cx, y - 6);
        ctx.lineTo(x + w - 18, y + 10);
        ctx.lineTo(x + w, y + h);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Dark cave archway
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(cx, y + h - 8, w * 0.24, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'treasure_chest': {
        ctx.fillStyle = '#92400e';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.fillRect(x + 10, y + 18, 28, 20);
        ctx.strokeRect(x + 10, y + 18, 28, 20);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(x + 21, y + 23, 6, 8);
        break;
      }
      case 'sakura_tree':
      case 'maple_tree':
      case 'pine_tree': {
        const cx = x + w * 0.5;
        const baseY = y + h - 6;
        const sway = Math.sin(timeMs * 0.002 + obj.tx) * 2.5;
        ctx.fillStyle = 'rgba(20, 32, 16, 0.22)';
        ctx.beginPath();
        ctx.ellipse(cx, baseY, w * 0.35, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        // Trunk
        ctx.fillStyle = '#5c3a21';
        ctx.fillRect(cx - 7, baseY - 34, 14, 34);
        // Canopy
        const colors =
          obj.type === 'sakura_tree'
            ? ['#f472b6', '#fbcfe8']
            : obj.type === 'maple_tree'
            ? ['#b91c1c', '#ef4444']
            : ['#166534', '#22c55e'];
        ctx.fillStyle = colors[0];
        ctx.beginPath();
        ctx.arc(cx + sway, baseY - 48, 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = colors[1];
        ctx.beginPath();
        ctx.arc(cx - 14 + sway, baseY - 56, 22, 0, Math.PI * 2);
        ctx.arc(cx + 15 + sway, baseY - 52, 20, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }
    ctx.restore();
  }

  private bakeGroundLayer() {
    const ctx = this.bakedGroundCanvas.getContext('2d');
    if (!ctx) return;
    const s = this.tileSize;
    const palette: Record<GroundTileId, string> = {
      0: '#7fb354',
      1: '#5c8c3e',
      2: '#d5bd8b',
      3: '#3ba3d6',
      4: '#94a3b8',
    };

    for (let ty = 0; ty < this.rows; ty++) {
      for (let tx = 0; tx < this.cols; tx++) {
        const id = this.map.layers.ground[ty][tx];
        const px = tx * s;
        const py = ty * s;
        ctx.fillStyle = palette[id] || palette[0];
        ctx.fillRect(px, py, s, s);

        // Subtle tile texture speckles
        const hash = (tx * 73 + ty * 37) % 10;
        if (id === 0 || id === 1) {
          ctx.fillStyle = hash % 2 === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(25,50,15,0.08)';
          ctx.fillRect(px + (hash * 4) % 34, py + ((hash * 7) % 34), 6, 4);
        } else if (id === 2) {
          ctx.fillStyle = 'rgba(130, 96, 52, 0.14)';
          ctx.beginPath();
          ctx.arc(px + 12 + hash * 2, py + 22, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  private bakeMinimapBase() {
    const ctx = this.minimapCacheCanvas.getContext('2d');
    if (!ctx) return;
    const colors: Record<GroundTileId, string> = {
      0: '#8cc45e',
      1: '#5c8c3e',
      2: '#e2ca98',
      3: '#38bdf8',
      4: '#94a3b8',
    };
    for (let ty = 0; ty < this.rows; ty++) {
      for (let tx = 0; tx < this.cols; tx++) {
        ctx.fillStyle = colors[this.map.layers.ground[ty][tx]] || '#8cc45e';
        ctx.fillRect(tx * 4, ty * 4, 4, 4);
      }
    }
  }
}
