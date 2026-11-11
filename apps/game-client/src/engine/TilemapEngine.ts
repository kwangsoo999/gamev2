import { ArtworkLibrary } from './ArtworkLibrary';
import { ArtworkPlacement, MapExitDef, MapObjectDef, TilePoint, VillageMapData, WorldPoint } from './types';

/** Gameplay grid stays in world coordinates; all world surfaces are raster artwork. */
export class TilemapEngine {
  public readonly worldWidth: number;
  public readonly worldHeight: number;
  private readonly ground: HTMLCanvasElement;
  private readonly minimap: HTMLCanvasElement;
  private readonly waterTiles: { x: number; y: number }[] = [];
  private readonly shores: { assetId: string; x: number; y: number }[] = [];

  constructor(public readonly map: VillageMapData, private readonly artwork: ArtworkLibrary) {
    this.worldWidth = map.cols * map.tileSize;
    this.worldHeight = map.rows * map.tileSize;
    this.ground = document.createElement('canvas');
    this.ground.width = this.worldWidth;
    this.ground.height = this.worldHeight;
    this.minimap = document.createElement('canvas');
    this.minimap.width = map.cols * 8;
    this.minimap.height = map.rows * 8;
    this.bakeArtwork();
  }

  public get tileSize() { return this.map.tileSize; }
  public get cols() { return this.map.cols; }
  public get rows() { return this.map.rows; }
  public tileToWorldCenter(tx: number, ty: number): WorldPoint {
    return { x: (tx + .5) * this.tileSize, y: (ty + .5) * this.tileSize };
  }
  public worldToTile(x: number, y: number): TilePoint {
    return { tx: Math.max(0, Math.min(this.cols - 1, Math.floor(x / this.tileSize))),
      ty: Math.max(0, Math.min(this.rows - 1, Math.floor(y / this.tileSize))) };
  }
  public isTileWalkable(tx: number, ty: number) {
    return tx >= 0 && ty >= 0 && tx < this.cols && ty < this.rows && this.map.layers.collision[ty][tx] === 0;
  }
  public canOccupyFootprint(x: number, y: number, radius = 12) {
    for (const [cx, cy] of [[x-radius,y-radius*.5],[x+radius,y-radius*.5],[x-radius,y+radius*.5],[x+radius,y+radius*.5]]) {
      if (cx < 8 || cy < 8 || cx >= this.worldWidth-8 || cy >= this.worldHeight-8) return false;
      const tile = this.worldToTile(cx,cy);
      if (!this.isTileWalkable(tile.tx,tile.ty)) return false;
    }
    return true;
  }
  public resolveMove(fromX: number, fromY: number, toX: number, toY: number, radius = 12): WorldPoint {
    let x = fromX, y = fromY;
    if (this.canOccupyFootprint(toX,y,radius)) x = toX;
    if (this.canOccupyFootprint(x,toY,radius)) y = toY;
    return {x,y};
  }

  public findPath(startX: number, startY: number, goalX: number, goalY: number): WorldPoint[] {
    const start = this.worldToTile(startX,startY), goal = this.worldToTile(goalX,goalY);
    if (!this.isTileWalkable(goal.tx,goal.ty)) return [];
    if (start.tx === goal.tx && start.ty === goal.ty) return [{x:goalX,y:goalY}];
    const count = this.cols * this.rows;
    const cost = new Float32Array(count).fill(Infinity), rank = new Float32Array(count).fill(Infinity);
    const parent = new Int32Array(count).fill(-1), closed = new Uint8Array(count);
    const first = start.ty * this.cols + start.tx, last = goal.ty * this.cols + goal.tx;
    const open = [first]; cost[first] = 0; rank[first] = Math.hypot(goal.tx-start.tx,goal.ty-start.ty);
    const directions = [[1,0,1],[-1,0,1],[0,1,1],[0,-1,1],[1,1,Math.SQRT2],[-1,1,Math.SQRT2],[1,-1,Math.SQRT2],[-1,-1,Math.SQRT2]];
    let iterations = 0;
    while (open.length && iterations++ < count) {
      let best = 0;
      for (let i=1;i<open.length;i++) if (rank[open[i]] < rank[open[best]]) best = i;
      const current = open.splice(best,1)[0];
      if (current === last) {
        const result: WorldPoint[] = [];
        for (let node=last;node !== first && node !== -1;node=parent[node]) result.push(this.tileToWorldCenter(node%this.cols,Math.floor(node/this.cols)));
        result.reverse();
        if (result.length) result[result.length-1] = {x:goalX,y:goalY};
        return result;
      }
      closed[current] = 1;
      const cx = current%this.cols, cy = Math.floor(current/this.cols);
      for (const [dx,dy,weight] of directions) {
        const nx=cx+dx, ny=cy+dy;
        if (!this.isTileWalkable(nx,ny) || (dx && dy && (!this.isTileWalkable(cx+dx,cy) || !this.isTileWalkable(cx,cy+dy)))) continue;
        const next = ny*this.cols+nx;
        if (closed[next] || cost[current]+weight >= cost[next]) continue;
        cost[next] = cost[current]+weight; parent[next] = current;
        rank[next] = cost[next]+Math.hypot(goal.tx-nx,goal.ty-ny);
        if (!open.includes(next)) open.push(next);
      }
    }
    return [];
  }

  public renderGroundLayer(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    viewW: number,
    viewH: number,
    timeMs: number,
    playerX?: number,
    playerY?: number
  ) {
    const x=Math.max(0,Math.floor(camX)), y=Math.max(0,Math.floor(camY));
    const w=Math.min(this.worldWidth-x,Math.ceil(viewW)+2), h=Math.min(this.worldHeight-y,Math.ceil(viewH)+2);
    if (w <= 0 || h <= 0) return;
    ctx.drawImage(this.ground,x,y,w,h,x-camX,y-camY,w,h);
    const frames = this.artwork.manifest.waterFrames;
    const frame = this.artwork.image(frames[Math.floor(timeMs/240)%frames.length]);
    // Softly animate water tiles, shore foam, and waterwheel splash
    const waterTiles = this.waterTiles;
    for (const tile of waterTiles) {
      if (tile.x+this.tileSize<camX || tile.y+this.tileSize<camY || tile.x>camX+viewW || tile.y>camY+viewH) continue;
      ctx.drawImage(frame,tile.x-camX,tile.y-camY,this.tileSize,this.tileSize);
    }
    for (const shore of this.shores) {
      if (shore.x+this.tileSize<camX || shore.y+this.tileSize<camY || shore.x>camX+viewW || shore.y>camY+viewH) continue;
      ctx.drawImage(this.artwork.image(shore.assetId),shore.x-camX,shore.y-camY,this.tileSize,this.tileSize);
    }
    if (this.map.id === 'THON_KHOI_NGUYEN' && this.artwork.manifest.effects.splash && this.artwork.has(this.artwork.manifest.effects.splash)) {
      const splash = this.artwork.image(this.artwork.manifest.effects.splash);
      const bob = Math.sin(timeMs * 0.0045) * 3;
      const sx = 31.5 * this.tileSize - camX - 24;
      const sy = 16.9 * this.tileSize - camY + bob * 0.4;
      ctx.save();
      ctx.globalAlpha = 0.65 + Math.sin(timeMs * 0.006) * 0.2;
      ctx.drawImage(splash, sx, sy, 54, 16);
      ctx.restore();
    }
    this.renderSanctuaryFloorDetails(ctx, camX, camY, timeMs);
    this.renderInteractables(ctx, camX, camY, timeMs);
    this.renderExits(ctx, camX, camY, timeMs, playerX, playerY);
  }

  private renderSanctuaryFloorDetails(ctx: CanvasRenderingContext2D, camX: number, camY: number, timeMs: number) {
    const rc = this.map.ritualCircle;
    if (!rc) return;
    const center = this.tileToWorldCenter(rc.tx, rc.ty);
    const sx = center.x - camX;
    const sy = center.y - camY;
    const rad = rc.radiusPx || 92;
    const t = timeMs * 0.001;

    ctx.save();
    // Stained-glass colored shafts cascading across northern cathedral apse floor
    for (let i = 0; i < 4; i++) {
      const gx = (15 + i * 6) * this.tileSize - camX;
      const gy = 5 * this.tileSize - camY;
      const shaft = ctx.createLinearGradient(gx, gy, gx + 48, gy + 240);
      const beamCol = i % 2 === 0 ? 'rgba(96, 165, 250, 0.14)' : 'rgba(192, 132, 252, 0.14)';
      shaft.addColorStop(0, beamCol);
      shaft.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = shaft;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx + 54, gy);
      ctx.lineTo(gx + 108, gy + 230);
      ctx.lineTo(gx + 22, gy + 230);
      ctx.closePath();
      ctx.fill();
    }

    // Illuminated Sacred Circular Floor Pattern (Job Advancement Ritual Circle)
    const groundGlow = ctx.createRadialGradient(sx, sy, 10, sx, sy, rad * 1.15);
    groundGlow.addColorStop(0, 'rgba(254, 240, 138, 0.34)');
    groundGlow.addColorStop(0.55, 'rgba(96, 165, 250, 0.18)');
    groundGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = groundGlow;
    ctx.beginPath();
    ctx.ellipse(sx, sy, rad * 1.15, rad * 0.68, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(sx, sy);
    ctx.scale(1, 0.58);
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.78)';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(0, 0, rad, 0, Math.PI * 2);
    ctx.stroke();

    ctx.rotate(t * 0.32);
    ctx.strokeStyle = 'rgba(147, 197, 253, 0.72)';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([12, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, rad * 0.82, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 8-point sacred star rune inside floor circle
    ctx.rotate(-t * 0.5);
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.72)';
    ctx.lineWidth = 1.6;
    for (let s = 0; s < 2; s++) {
      ctx.beginPath();
      for (let i = 0; i <= 4; i++) {
        const ang = (i * Math.PI) / 2 + s * (Math.PI / 4);
        const px = Math.cos(ang) * rad * 0.74;
        const py = Math.sin(ang) * rad * 0.74;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  public activeInteractableFilter?: (id: string) => boolean;

  private renderInteractables(ctx: CanvasRenderingContext2D, camX: number, camY: number, timeMs: number) {
    const list = this.map.spawns.interactables;
    if (!list?.length) return;
    const pulse = 0.72 + Math.sin(timeMs * 0.005) * 0.22;
    const marker = this.artwork.image(this.artwork.manifest.effects.destination);
    ctx.save();
    for (const it of list) {
      const p = this.tileToWorldCenter(it.tx, it.ty);
      const sx = p.x - camX;
      const sy = p.y - camY;
      const done = this.activeInteractableFilter ? this.activeInteractableFilter(it.id) : false;
      ctx.globalAlpha = done ? 0.4 : pulse;
      ctx.filter = done ? 'grayscale(0.7)' : (it.element === 'fire' ? 'hue-rotate(-40deg) saturate(1.5)' : it.element === 'water' ? 'hue-rotate(155deg)' : it.element === 'earth' ? 'hue-rotate(50deg)' : 'hue-rotate(90deg)');
      ctx.drawImage(marker, sx - 22, sy - 11, 44, 22);
      ctx.filter = 'none';
      ctx.globalAlpha = 0.95;
      ctx.font = '700 10px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#0f172a';
      ctx.fillText(done ? `✓ ${it.name}` : `[E] ${it.name}`, sx + 1, sy - 17);
      ctx.fillStyle = done ? '#86efac' : '#fde047';
      ctx.fillText(done ? `✓ ${it.name}` : `[E] ${it.name}`, sx, sy - 18);
    }
    ctx.restore();
  }

  private resolvePortalColors(ex: MapExitDef): { outer: string; inner: string; core: string; badgeBg: string; icon: string } {
    const kind =
      ex.portalType ||
      ex.vfxProfile ||
      (ex.targetRegion.includes('sanctuary') ? 'sanctuary' : ex.dungeonId || ex.targetRegion.includes('dungeon') ? 'dungeon' : ex.targetRegion.includes('dragon') || ex.targetRegion.includes('shadow') ? 'boss' : ex.targetRegion === 'THON_KHOI_NGUYEN' ? 'village' : 'regional');
    if (kind === 'sanctuary') {
      return { outer: '#facc15', inner: '#fef08a', core: 'rgba(254, 249, 195, 0.62)', badgeBg: 'rgba(69, 26, 3, 0.9)', icon: '⛪' };
    }
    if (kind === 'dungeon') {
      return { outer: '#a855f7', inner: '#e9d5ff', core: 'rgba(192, 132, 252, 0.58)', badgeBg: 'rgba(46, 16, 101, 0.9)', icon: '🌀' };
    }
    if (kind === 'boss') {
      return { outer: '#ef4444', inner: '#fde047', core: 'rgba(249, 115, 22, 0.58)', badgeBg: 'rgba(69, 10, 10, 0.9)', icon: '🔥' };
    }
    if (kind === 'village') {
      return { outer: '#34d399', inner: '#fef08a', core: 'rgba(110, 231, 183, 0.58)', badgeBg: 'rgba(6, 78, 59, 0.9)', icon: '⛩️' };
    }
    return { outer: '#38bdf8', inner: '#fde047', core: 'rgba(125, 211, 252, 0.6)', badgeBg: 'rgba(12, 74, 110, 0.9)', icon: '⛩️' };
  }

  private renderExits(ctx: CanvasRenderingContext2D, camX: number, camY: number, timeMs: number, playerX?: number, playerY?: number) {
    if (!this.map.exits?.length) return;
    const t = timeMs * 0.001;
    const pulse = 0.78 + Math.sin(t * 3.8) * 0.22;
    const marker = this.artwork.image(this.artwork.manifest.effects.destination);

    ctx.save();
    for (const ex of this.map.exits) {
      const p = this.tileToWorldCenter(ex.tx, ex.ty);
      const sx = p.x - camX;
      const sy = p.y - camY;
      const palette = this.resolvePortalColors(ex);
      const rad = Number(ex.interactionRadius || 84);
      const isNear = playerX !== undefined && playerY !== undefined && Math.hypot(playerX - p.x, playerY - p.y) <= rad;

      // 1. Emissive ground illumination directly below Torii/Portal tile (readable day & night without muddying the Torii)
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const glow = ctx.createRadialGradient(sx, sy, 4, sx, sy, isNear ? 44 : 36);
      glow.addColorStop(0, '#ffffff');
      glow.addColorStop(0.32, palette.core);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 0.76 * pulse;
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.ellipse(sx, sy, 40, 22, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Concentric Counter-Rotating Arcane Ground Rings & Runes
      ctx.translate(sx, sy);
      ctx.scale(1, 0.54);
      ctx.rotate(t * 1.4);
      ctx.globalAlpha = 0.92;
      ctx.strokeStyle = palette.outer;
      ctx.lineWidth = isNear ? 3.4 : 2.6;
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, Math.PI * 2);
      ctx.stroke();

      ctx.rotate(-t * 2.7);
      ctx.strokeStyle = palette.inner;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, 21, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Four glowing cardinal rune nodes
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        ctx.fillStyle = palette.inner;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 26, Math.sin(a) * 26, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 3. Destination ground marker + rising floating sparks above ground circle
      ctx.save();
      ctx.globalAlpha = 0.65 * pulse;
      ctx.drawImage(marker, sx - 20, sy - 10, 40, 20);
      ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 5; k++) {
        const phase = (t * 1.1 + k * 0.2) % 1;
        const px = sx + Math.sin(t * 2 + k * 1.7) * 16;
        const py = sy - phase * 34;
        ctx.globalAlpha = (1 - phase) * 0.85;
        ctx.fillStyle = k % 2 === 0 ? palette.inner : palette.outer;
        ctx.beginPath();
        ctx.arc(px, py, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 4. High-contrast readable Portal Label Pill & Interactive Prompt
      const label = `${palette.icon} ${ex.name} (Lv.${ex.requiredLevel}+)`;
      ctx.save();
      ctx.font = '700 10px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      const tw = ctx.measureText(label).width;
      const pw = tw + 14;
      const pyBadge = sy - 26;
      ctx.fillStyle = palette.badgeBg;
      ctx.strokeStyle = isNear ? '#fef08a' : palette.outer;
      ctx.lineWidth = isNear ? 1.8 : 1.1;
      ctx.beginPath();
      ctx.roundRect(sx - pw / 2, pyBadge - 11, pw, 16, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fef9c3';
      ctx.fillText(label, sx, pyBadge + 1);

      if (isNear) {
        const hint = '[E] hoặc Nhấp để Đi Vào';
        ctx.font = '800 10px "Segoe UI", sans-serif';
        ctx.fillStyle = '#0f172a';
        ctx.fillText(hint, sx + 1, pyBadge - 16);
        ctx.fillStyle = '#fde047';
        ctx.fillText(hint, sx, pyBadge - 17);
      }
      ctx.restore();
    }
    ctx.restore();
  }

  public getMinimapBase() { return this.minimap; }
  public getObjectSortY(obj: MapObjectDef) {
    return this.placement(obj).ground ? -1000 : (obj.ty+obj.hTiles)*this.tileSize;
  }
  public renderObject(ctx: CanvasRenderingContext2D, obj: MapObjectDef, camX: number, camY: number, _timeMs: number) {
    const art=this.placement(obj), image=this.artwork.image(art.assetId);
    const w=obj.wTiles*this.tileSize*(art.widthScale??1.15);
    const h=w*image.height/image.width*(art.heightScale??1);
    const x=(obj.tx+obj.wTiles*.5)*this.tileSize-camX;
    const y=(obj.ty+obj.hTiles)*this.tileSize-camY;
    if (!art.ground && this.artwork.has(this.artwork.manifest.effects.shadow)) {
      ctx.save();
      ctx.globalAlpha = 0.42;
      ctx.drawImage(this.artwork.image(this.artwork.manifest.effects.shadow), x - w * 0.38, y - 10, w * 0.76, 18);
      ctx.restore();
    }
    ctx.drawImage(image,x-w*(art.anchorX??.5),y-h*(art.anchorY??.94),w,h);
  }
  private placement(obj: MapObjectDef): ArtworkPlacement {
    const entry=this.artwork.manifest.objectOverrides[obj.id]??this.artwork.manifest.objectTypes[obj.type];
    if (!entry) throw new Error(`Thiếu artwork môi trường ${obj.id}/${obj.type}`);
    return entry;
  }

  private bakeArtwork() {
    const groundCtx = this.ground;
    const ctx = groundCtx.getContext('2d')!;
    const s = this.tileSize;
    const biomeFilter = this.map.biomeTheme?.groundFilter;
    ctx.save();
    if (biomeFilter) ctx.filter = biomeFilter;
    for (let ty = 0; ty < this.rows; ty++) for (let tx = 0; tx < this.cols; tx++) {
      const id = this.map.layers.ground[ty][tx];
      const choices = this.artwork.manifest.terrain[id] ?? this.artwork.manifest.terrain[0];
      if (!choices?.length) throw new Error(`Thiếu tile terrain ${id}`);
      const assetId = choices[(tx * 17 + ty * 31) % choices.length];
      if (id === 1) {
        const grassChoices = this.artwork.manifest.terrain[0];
        ctx.drawImage(this.artwork.image(grassChoices[(tx * 17 + ty * 31) % grassChoices.length]), tx * s, ty * s, s, s);
        ctx.save();
        const adjLit = [
          this.map.layers.ground[ty - 1]?.[tx] === 0,
          this.map.layers.ground[ty]?.[tx + 1] === 0,
          this.map.layers.ground[ty + 1]?.[tx] === 0,
          this.map.layers.ground[ty]?.[tx - 1] === 0,
        ].some(Boolean);
        ctx.globalAlpha = adjLit ? 0.62 : 0.92;
        ctx.drawImage(this.artwork.image(assetId), tx * s, ty * s, s, s);
        ctx.restore();
      } else {
        ctx.drawImage(this.artwork.image(assetId), tx * s, ty * s, s, s);
      }
      if (id === 3) this.waterTiles.push({ x: tx * s, y: ty * s });
      const transKey = id === 3 ? 'water' : id === 5 && this.artwork.manifest.transitions.dirt ? 'dirt' : id === 4 && this.artwork.manifest.transitions.plaza ? 'plaza' : 'road';
      const transitions = this.artwork.manifest.transitions[transKey] ?? this.artwork.manifest.transitions.road;
      if (id === 2 || id === 3 || id === 4 || id === 5) {
        const neighbors = [['north', tx, ty - 1], ['east', tx + 1, ty], ['south', tx, ty + 1], ['west', tx - 1, ty]] as const;
        for (const [direction, nx, ny] of neighbors) {
          const adjacent = this.map.layers.ground[ny]?.[nx];
          if (adjacent !== 0 && adjacent !== 1) continue;
          const edge = transitions[direction];
          ctx.drawImage(this.artwork.image(edge), tx * s, ty * s, s, s);
          if (id === 3) this.shores.push({ assetId: edge, x: tx * s, y: ty * s });
        }
      }
      if ((id === 0 || id === 1) && !this.isTileWalkable(tx, ty) && (tx * 19 + ty * 7) % 11 === 0) {
        const decorations = this.artwork.manifest.decorations;
        const image = this.artwork.image(decorations[(tx + ty) % decorations.length]);
        ctx.drawImage(image, tx * s - 5, ty * s - 8, s + 10, s + 10);
      }
    }
    ctx.restore();
    if (this.map.biomeTheme?.ambientTint && (this.map.biomeTheme.ambientAlpha ?? 0) > 0) {
      ctx.save();
      ctx.fillStyle = this.map.biomeTheme.ambientTint;
      ctx.globalAlpha = this.map.biomeTheme.ambientAlpha!;
      ctx.fillRect(0, 0, this.worldWidth, this.worldHeight);
      ctx.restore();
    }
    const mini=this.minimap.getContext('2d')!;
    mini.drawImage(this.ground,0,0,this.minimap.width,this.minimap.height);
    const objects=[...this.map.layers.objects].sort((a,b)=>this.getObjectSortY(a)-this.getObjectSortY(b));
    mini.save(); mini.scale(this.minimap.width/this.worldWidth,this.minimap.height/this.worldHeight);
    for (const object of objects) this.renderObject(mini,object,0,0,0);
    mini.restore();
  }
}
