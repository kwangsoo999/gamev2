import { TilemapEngine } from '../engine/TilemapEngine';
import { AnimState, EntityKind, SpriteSheetMeta, WorldPoint } from '../engine/types';

export interface EntityInit {
  id: string;
  kind: EntityKind;
  name: string;
  spriteId: string;
  x: number;
  y: number;
  level?: number;
  hp?: number;
  mp?: number;
}

/**
 * Base Entity driving position, state-machine sprite animation, and orthographic Y-sorting.
 */
export class Entity {
  public readonly id: string;
  public readonly kind: EntityKind;
  public name: string;
  public spriteId: string;

  public x: number;
  public y: number;
  public facing: 1 | -1 = 1;
  public state: AnimState = 'idle';
  public frameIndex = 0;
  public animTimer = 0;

  public level: number;
  public hp: number;
  public maxHp: number;
  public mp: number;
  public maxMp: number;
  public zBias = 0;
  public hitFlashMs = 0;
  public alive = true;

  constructor(init: EntityInit) {
    this.id = init.id;
    this.kind = init.kind;
    this.name = init.name;
    this.spriteId = init.spriteId;
    this.x = init.x;
    this.y = init.y;
    this.level = init.level ?? 1;
    this.maxHp = init.hp ?? 100;
    this.hp = this.maxHp;
    this.maxMp = init.mp ?? 100;
    this.mp = this.maxMp;
  }

  public getSortY(): number {
    return this.y + this.zBias;
  }

  public setState(next: AnimState) {
    if (this.state !== next) {
      this.state = next;
      this.frameIndex = 0;
      this.animTimer = 0;
    }
  }

  public updateAnimation(dtSec: number, meta?: SpriteSheetMeta) {
    if (this.hitFlashMs > 0) {
      this.hitFlashMs = Math.max(0, this.hitFlashMs - dtSec * 1000);
    }
    const clip = meta?.animations[this.state] ?? { row: 0, frames: 4, fps: 8, loop: true };
    const stepTime = 1 / Math.max(1, clip.fps);
    this.animTimer += dtSec;

    while (this.animTimer >= stepTime) {
      this.animTimer -= stepTime;
      if (this.frameIndex + 1 < clip.frames) {
        this.frameIndex++;
      } else if (clip.loop) {
        this.frameIndex = 0;
      } else if (this.state === 'attack') {
        this.setState('idle');
        break;
      }
    }
  }
}

/**
 * Controlled player character supporting keyboard vectors + A* path queue + attack locking.
 */
export class PlayerEntity extends Entity {
  public speed = 195;
  public pathQueue: WorldPoint[] = [];
  public attackLockMs = 0;

  constructor(init: Omit<EntityInit, 'kind'>) {
    super({ ...init, kind: 'player', hp: init.hp ?? 320, mp: init.mp ?? 180 });
  }

  public assignPath(points: WorldPoint[]) {
    this.pathQueue = points;
  }

  public triggerAttack(): boolean {
    if (this.attackLockMs > 0) return false;
    this.attackLockMs = 300;
    this.setState('attack');
    return true;
  }

  public updateMovement(dtSec: number, inputVx: number, inputVy: number, tilemap: TilemapEngine) {
    // Passive MP regeneration
    if (this.mp < this.maxMp) {
      this.mp = Math.min(this.maxMp, this.mp + dtSec * 3.5);
    }

    if (this.attackLockMs > 0) {
      this.attackLockMs = Math.max(0, this.attackLockMs - dtSec * 1000);
      return;
    }

    let vx = inputVx;
    let vy = inputVy;

    if (vx !== 0 || vy !== 0) {
      this.pathQueue = [];
      const mag = Math.hypot(vx, vy);
      vx /= mag;
      vy /= mag;
    } else if (this.pathQueue.length > 0) {
      const target = this.pathQueue[0];
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= 6) {
        this.x = target.x;
        this.y = target.y;
        this.pathQueue.shift();
      } else {
        vx = dx / dist;
        vy = dy / dist;
      }
    }

    if (Math.abs(vx) > 0.01 || Math.abs(vy) > 0.01) {
      if (vx < -0.05) this.facing = -1;
      else if (vx > 0.05) this.facing = 1;

      const resolved = tilemap.resolveMove(
        this.x,
        this.y,
        this.x + vx * this.speed * dtSec,
        this.y + vy * this.speed * dtSec
      );
      this.x = resolved.x;
      this.y = resolved.y;
      this.setState('walk');
    } else {
      this.setState('idle');
    }
  }
}

export class NpcEntity extends Entity {
  public role: string;
  public dialogue: string;

  constructor(init: Omit<EntityInit, 'kind'> & { role: string; dialogue: string }) {
    super({ ...init, kind: 'npc' });
    this.role = init.role;
    this.dialogue = init.dialogue;
  }
}

export class MonsterEntity extends Entity {
  public readonly originX: number;
  public readonly originY: number;
  private wanderAngle = Math.random() * Math.PI * 2;
  private wanderWaitSec = 1 + Math.random() * 2;
  private respawnTimerSec = 0;

  constructor(init: Omit<EntityInit, 'kind'>) {
    super({ ...init, kind: 'monster' });
    this.originX = init.x;
    this.originY = init.y;
  }

  public applyDamage(amount: number): boolean {
    if (!this.alive) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.hitFlashMs = 160;
    if (this.hp <= 0) {
      this.alive = false;
      this.respawnTimerSec = 6.5;
      return true; // Defeated
    }
    return false;
  }

  public updateAi(dtSec: number, tilemap: TilemapEngine) {
    if (!this.alive) {
      this.respawnTimerSec -= dtSec;
      if (this.respawnTimerSec <= 0) {
        this.alive = true;
        this.hp = this.maxHp;
        this.x = this.originX;
        this.y = this.originY;
      }
      return;
    }

    this.wanderWaitSec -= dtSec;
    if (this.wanderWaitSec <= 0) {
      this.wanderAngle = Math.random() * Math.PI * 2;
      this.wanderWaitSec = 2 + Math.random() * 2.5;
    }

    if (this.wanderWaitSec > 1.2) {
      const speed = 36;
      const nx = this.x + Math.cos(this.wanderAngle) * speed * dtSec;
      const ny = this.y + Math.sin(this.wanderAngle) * speed * dtSec;
      if (Math.hypot(nx - this.originX, ny - this.originY) <= 85) {
        const res = tilemap.resolveMove(this.x, this.y, nx, ny);
        this.facing = res.x < this.x ? -1 : res.x > this.x ? 1 : this.facing;
        this.x = res.x;
        this.y = res.y;
        this.setState('walk');
        return;
      }
    }
    this.setState('idle');
  }
}
