import type {
  NpcPlacementRecord,
  WorldLayoutValidationIssue,
  WorldLayoutValidationReport,
} from '@elysia/game-types';

export interface ValidatableMapDoc {
  id: string;
  name?: string;
  cols: number;
  rows: number;
  tileSize?: number;
  isSafeZone?: boolean;
  layers: {
    ground: number[][];
    objects: Array<{
      id: string;
      type: string;
      tx: number;
      ty: number;
      wTiles?: number;
      hTiles?: number;
      collides?: boolean;
    }>;
    collision: number[][];
  };
  spawns?: {
    player?: { tx: number; ty: number };
    npcs?: any[];
    monsters?: any[];
  };
  exits?: Array<{
    id: string;
    name?: string;
    direction?: string;
    targetRegion: string;
    tx: number;
    ty: number;
    targetTx?: number;
    targetTy?: number;
    requiredLevel?: number;
  }>;
}

const REGION_ALIASES: Record<string, string> = {
  VIL_STARTER: 'THON_KHOI_NGUYEN',
  dungeon_sanctum_of_awakening: 'dungeon_sanctum_f1',
};

function computeReachableTiles(map: ValidatableMapDoc): Set<number> {
  const reachable = new Set<number>();
  const cols = Number(map.cols || 0);
  const rows = Number(map.rows || 0);
  const col = map.layers?.collision || [];
  if (!cols || !rows || !col.length) return reachable;

  let startTx = Number(map.spawns?.player?.tx ?? Math.floor(cols / 2));
  let startTy = Number(map.spawns?.player?.ty ?? Math.floor(rows / 2));
  startTx = Math.max(0, Math.min(cols - 1, startTx));
  startTy = Math.max(0, Math.min(rows - 1, startTy));

  // If spawn tile happens to be marked blocked, search nearby 2 tiles for BFS seed
  if (col[startTy]?.[startTx] !== 0) {
    outer: for (let r = 1; r <= 3; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = startTx + dx;
          const ny = startTy + dy;
          if (nx >= 0 && ny >= 0 && nx < cols && ny < rows && col[ny]?.[nx] === 0) {
            startTx = nx;
            startTy = ny;
            break outer;
          }
        }
      }
    }
  }
  if (col[startTy]?.[startTx] !== 0) return reachable;

  const startKey = startTy * cols + startTx;
  reachable.add(startKey);
  const queue: number[] = [startKey];
  let head = 0;
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  while (head < queue.length) {
    const cur = queue[head++];
    const cx = cur % cols;
    const cy = Math.floor(cur / cols);
    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      if (col[ny]?.[nx] !== 0) continue;
      const key = ny * cols + nx;
      if (!reachable.has(key)) {
        reachable.add(key);
        queue.push(key);
      }
    }
  }
  return reachable;
}

function isTileReachableOrAdjacent(reachable: Set<number>, cols: number, tx: number, ty: number): boolean {
  if (reachable.has(ty * cols + tx)) return true;
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    if (reachable.has((ty + dy) * cols + (tx + dx))) return true;
  }
  return false;
}

export function validateWorldPlacement(
  mapsById: Record<string, ValidatableMapDoc>,
  masterNpcs: NpcPlacementRecord[],
  professionNpcs: Array<{ id: string; mapId: string; tx: number; ty: number; nameVi?: string }> = []
): WorldLayoutValidationReport {
  const issues: WorldLayoutValidationIssue[] = [];
  const reachabilityCache = new Map<string, Set<number>>();

  const getReachable = (mapId: string) => {
    if (!reachabilityCache.has(mapId)) {
      const m = mapsById[mapId];
      reachabilityCache.set(mapId, m ? computeReachableTiles(m) : new Set());
    }
    return reachabilityCache.get(mapId)!;
  };

  // Deduplicate combined NPC records by id while preserving source list accuracy
  const seenNpcPerMapTile = new Map<string, string>();
  let checkedNpcs = 0;

  const checkNpc = (npc: {
    id: string;
    name?: string;
    regionId: string;
    tx: number;
    ty: number;
    associatedBuildingId?: string;
    district?: string;
    serviceType?: string;
    interactionRadius?: number;
  }) => {
    checkedNpcs += 1;
    const normRegion = REGION_ALIASES[npc.regionId] || npc.regionId;
    const map = mapsById[normRegion];
    if (!map) {
      issues.push({
        severity: 'error',
        code: 'NPC_MAP_MISSING',
        entityType: 'npc',
        entityId: npc.id,
        regionId: normRegion,
        message: `NPC ${npc.id} tham chiếu bản đồ không tồn tại (${normRegion}).`,
      });
      return;
    }

    const tx = Number(npc.tx);
    const ty = Number(npc.ty);
    if (!Number.isFinite(tx) || !Number.isFinite(ty) || tx < 0 || ty < 0 || tx >= map.cols || ty >= map.rows) {
      issues.push({
        severity: 'error',
        code: 'NPC_OUT_OF_BOUNDS',
        entityType: 'npc',
        entityId: npc.id,
        regionId: map.id,
        message: `NPC ${npc.id} nằm ngoài phạm vi bản đồ (${tx}, ${ty}) / (${map.cols}x${map.rows}).`,
      });
      return;
    }

    const colVal = map.layers?.collision?.[ty]?.[tx];
    if (colVal !== 0) {
      issues.push({
        severity: 'error',
        code: 'NPC_ON_BLOCKED_TILE',
        entityType: 'npc',
        entityId: npc.id,
        regionId: map.id,
        message: `NPC ${npc.id} (${npc.name || npc.id}) đứng trên ô va chạm bị chặn tại (${tx}, ${ty}).`,
      });
    }

    const tileKey = `${map.id}:${tx},${ty}`;
    const existingNpc = seenNpcPerMapTile.get(tileKey);
    if (existingNpc && existingNpc !== npc.id) {
      issues.push({
        severity: 'error',
        code: 'NPC_OVERLAP_NPC',
        entityType: 'npc',
        entityId: npc.id,
        regionId: map.id,
        message: `NPC ${npc.id} trùng tọa độ (${tx}, ${ty}) với ${existingNpc}.`,
      });
    } else {
      seenNpcPerMapTile.set(tileKey, npc.id);
    }

    for (const obj of map.layers?.objects || []) {
      if (!obj.collides) continue;
      const w = Math.max(1, Number(obj.wTiles || 1));
      const h = Math.max(1, Number(obj.hTiles || 1));
      if (tx >= obj.tx && tx < obj.tx + w && ty >= obj.ty && ty < obj.ty + h) {
        issues.push({
          severity: 'error',
          code: 'NPC_OVERLAP_BUILDING',
          entityType: 'npc',
          entityId: npc.id,
          regionId: map.id,
          message: `NPC ${npc.id} nằm chồng bên trong vật thể/công trình "${obj.id}" (${obj.type}) tại (${tx}, ${ty}).`,
        });
      }
    }

    if (npc.associatedBuildingId) {
      const bExists = (map.layers?.objects || []).some((o) => o.id === npc.associatedBuildingId);
      if (!bExists) {
        issues.push({
          severity: 'error',
          code: 'NPC_BUILDING_MISSING',
          entityType: 'npc',
          entityId: npc.id,
          regionId: map.id,
          message: `NPC ${npc.id} liên kết công trình "${npc.associatedBuildingId}" không tồn tại trên bản đồ ${map.id}.`,
        });
      }
    }

    const reachable = getReachable(map.id);
    if (reachable.size > 0 && !isTileReachableOrAdjacent(reachable, map.cols, tx, ty)) {
      issues.push({
        severity: 'error',
        code: 'NPC_UNREACHABLE',
        entityType: 'npc',
        entityId: npc.id,
        regionId: map.id,
        message: `Khu vực tương tác của NPC ${npc.id} tại (${tx}, ${ty}) không thể đi tới từ điểm xuất phát của ${map.id}.`,
      });
    }
  };

  for (const n of masterNpcs) {
    checkNpc(n);
  }
  for (const pn of professionNpcs) {
    if (!masterNpcs.some((m) => m.id === pn.id)) {
      checkNpc({
        id: pn.id,
        name: pn.nameVi || pn.id,
        regionId: pn.mapId,
        tx: pn.tx,
        ty: pn.ty,
      });
    }
  }

  let checkedPortals = 0;
  for (const map of Object.values(mapsById)) {
    // Validate Beginner Village safety rule: no Black Dragon or Boss monsters
    if (map.id === 'THON_KHOI_NGUYEN') {
      for (const badBoss of (map.spawns?.monsters || []).filter(
        (m: any) =>
          m.isBoss ||
          String(m.id || '').includes('boss_dragon') ||
          String(m.monsterId || '').includes('DARK_DRAGON') ||
          String(m.spriteId || '') === 'boss_dark_dragon'
      )) {
        issues.push({
          severity: 'error',
          code: 'BEGINNER_VILLAGE_BOSS_FORBIDDEN',
          entityType: 'map',
          entityId: String(badBoss.id || 'boss'),
          regionId: map.id,
          message: `Làng Khởi Nguyên không được phép chứa Boss/Black Dragon (${badBoss.id}).`,
        });
      }
    }
    const reachable = getReachable(map.id);
    for (const ex of map.exits || []) {
      checkedPortals += 1;
      const destId = REGION_ALIASES[ex.targetRegion] || ex.targetRegion;
      const destMap = mapsById[destId];
      if (!destMap) {
        issues.push({
          severity: 'error',
          code: 'PORTAL_DEST_MISSING',
          entityType: 'portal',
          entityId: ex.id,
          regionId: map.id,
          message: `Cổng ${ex.id} trỏ đến bản đồ đích không tồn tại: ${ex.targetRegion}.`,
        });
        continue;
      }

      if (ex.tx < 0 || ex.ty < 0 || ex.tx >= map.cols || ex.ty >= map.rows) {
        issues.push({
          severity: 'error',
          code: 'PORTAL_OUT_OF_BOUNDS',
          entityType: 'portal',
          entityId: ex.id,
          regionId: map.id,
          message: `Cổng ${ex.id} nằm ngoài bản đồ ${map.id} (${ex.tx}, ${ex.ty}).`,
        });
        continue;
      }

      if (map.layers?.collision?.[ex.ty]?.[ex.tx] !== 0) {
        issues.push({
          severity: 'error',
          code: 'PORTAL_BLOCKED',
          entityType: 'portal',
          entityId: ex.id,
          regionId: map.id,
          message: `Ô cổng ${ex.id} tại (${ex.tx}, ${ex.ty}) trên ${map.id} bị khóa va chạm.`,
        });
      } else if (reachable.size > 0 && !isTileReachableOrAdjacent(reachable, map.cols, ex.tx, ex.ty)) {
        issues.push({
          severity: 'error',
          code: 'PORTAL_UNREACHABLE',
          entityType: 'portal',
          entityId: ex.id,
          regionId: map.id,
          message: `Cổng ${ex.id} tại (${ex.tx}, ${ex.ty}) trên ${map.id} không thể tiếp cận từ điểm spawn.`,
        });
      }

      if (ex.targetTx !== undefined && ex.targetTy !== undefined) {
        if (
          ex.targetTx < 0 ||
          ex.targetTy < 0 ||
          ex.targetTx >= destMap.cols ||
          ex.targetTy >= destMap.rows ||
          destMap.layers?.collision?.[ex.targetTy]?.[ex.targetTx] !== 0
        ) {
          issues.push({
            severity: 'error',
            code: 'PORTAL_DEST_SPAWN_BLOCKED',
            entityType: 'portal',
            entityId: ex.id,
            regionId: map.id,
            message: `Điểm đến (${ex.targetTx}, ${ex.targetTy}) trên ${destMap.id} từ cổng ${ex.id} bị kẹt tường hoặc ngoài ranh giới.`,
          });
        }
      }
    }
  }

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  return {
    valid: errorCount === 0,
    checkedMaps: Object.keys(mapsById).length,
    checkedNpcs,
    checkedPortals,
    errorCount,
    warningCount,
    issues,
  };
}
