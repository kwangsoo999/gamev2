import type { EightDirectionName } from '../../assets/AssetManifest.ts';

export interface DirectionVector {
  dx: number;
  dy: number;
}

/**
 * DirectionResolver manages the 8-directional coordinate system for ELYSIA NO DENSETSU.
 * Standardizes 8-directional angles, vectors, and cardinal 4-direction fallback mappings.
 */
export class DirectionResolver {
  public static readonly DIRECTIONS_8: EightDirectionName[] = [
    'south',       // 0
    'south_west',  // 1
    'west',        // 2
    'north_west',  // 3
    'north',       // 4
    'north_east',  // 5
    'east',        // 6
    'south_east',  // 7
  ];

  public static readonly CARDINAL_FALLBACK_MAP: Record<EightDirectionName, 'south' | 'west' | 'north' | 'east'> = {
    south: 'south',
    south_west: 'west',
    west: 'west',
    north_west: 'west',
    north: 'north',
    north_east: 'east',
    east: 'east',
    south_east: 'east',
  };

  /**
   * Resolves the 8-directional name from a movement vector (dx, dy).
   */
  public static fromVector(dx: number, dy: number): EightDirectionName {
    if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return 'south';

    // Angle in degrees from 0 to 360, where (0, 1) South is 0 deg
    const rad = Math.atan2(dx, dy); // 0 at South, +PI/2 at East, -PI/2 at West
    let deg = (rad * 180) / Math.PI;
    if (deg < 0) deg += 360;

    // 8 sectors of 45 degrees, offset by 22.5 deg
    const sector = Math.floor((deg + 22.5) / 45) % 8;

    // Angle mapping clockwise:
    // 0 deg: South (0)
    // 45 deg: South-East (7)
    // 90 deg: East (6)
    // 135 deg: North-East (5)
    // 180 deg: North (4)
    // 225 deg: North-West (3)
    // 270 deg: West (2)
    // 315 deg: South-West (1)
    const sectorToDir: EightDirectionName[] = [
      'south',
      'south_east',
      'east',
      'north_east',
      'north',
      'north_west',
      'west',
      'south_west',
    ];

    return sectorToDir[sector] || 'south';
  }

  /**
   * Resolves index 0..7 from 8-directional name.
   */
  public static getIndex(dir: EightDirectionName): number {
    const idx = DirectionResolver.DIRECTIONS_8.indexOf(dir);
    return idx >= 0 ? idx : 0;
  }

  /**
   * Resolves direction name from index 0..7.
   */
  public static fromIndex(index: number): EightDirectionName {
    const norm = ((index % 8) + 8) % 8;
    return DirectionResolver.DIRECTIONS_8[norm];
  }

  /**
   * Resolves 4-direction fallback if asset only supports cardinal directions.
   */
  public static getCardinalFallback(dir: EightDirectionName): 'south' | 'west' | 'north' | 'east' {
    return DirectionResolver.CARDINAL_FALLBACK_MAP[dir] || 'south';
  }
}
