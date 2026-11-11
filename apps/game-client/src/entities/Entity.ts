import { TilemapEngine } from '../engine/TilemapEngine';
import {
  AnimState,
  EntityKind,
  FacingDirection,
  PrimaryAttributesState,
  SpriteSheetMeta,
  WorldPoint,
} from '../engine/types';
import { ATTRIBUTE_POINTS_PER_LEVEL, computeExpRequiredForLevel } from '@elysia/game-data-schema';

export interface EntityInit {
  id: string;
  kind: EntityKind;
  name: string;
  spriteId: string;
  visualFilter?: string;
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
  public visualFilter?: string;
  public isBoss = false;

  public x: number;
  public y: number;
  public facing: 1 | -1 = 1;
  public direction: FacingDirection = 'south';
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
  public animationFinished = false;

  constructor(init: EntityInit) {
    this.id = init.id;
    this.kind = init.kind;
    this.name = init.name;
    this.spriteId = init.spriteId;
    this.visualFilter = init.visualFilter;
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
      this.animationFinished = false;
    }
  }

  public faceVector(vx: number, vy: number) {
    if (vx < -.05) this.facing = -1;
    else if (vx > .05) this.facing = 1;
    if (Math.abs(vx) + Math.abs(vy) < .01) return;
    this.direction = Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? 'west' : 'east') : (vy < 0 ? 'north' : 'south');
  }

  public updateAnimation(dtSec: number, meta?: SpriteSheetMeta) {
    if (this.hitFlashMs > 0) {
      this.hitFlashMs = Math.max(0, this.hitFlashMs - dtSec * 1000);
    }
    const clip = meta?.animations[this.state];
    if (!clip || this.animationFinished) return;
    const stepTime = 1 / Math.max(1, clip.fps);
    this.animTimer += dtSec;

    while (this.animTimer >= stepTime) {
      this.animTimer -= stepTime;
      if (this.frameIndex + 1 < clip.frames) {
        this.frameIndex++;
      } else if (clip.loop) {
        this.frameIndex = 0;
      } else {
        this.animationFinished = true;
        if (this.state !== 'death') this.setState('idle');
        break;
      }
    }
  }
}

export function expRequiredForLevel(level: number): number {
  return computeExpRequiredForLevel(level);
}

/**
 * Controlled player character supporting keyboard vectors + A* path queue + attack locking.
 */
export class PlayerEntity extends Entity {
  public speed = 205;
  public pathQueue: WorldPoint[] = [];
  public attackLockMs = 0;
  public dead = false;
  public exp = 0;
  public maxExp = expRequiredForLevel(1);
  public potentialPoints = 3;
  public classId = 'adventurer';
  public jobAdvancementCompleted = false;
  public evolutionTier = 0;
  public sanctumCompleted = false;
  public completedQuests: string[] = [];
  public cosmeticTitleLabel: string | null = null;
  public baseStats: PrimaryAttributesState = { str: 10, dex: 10, agi: 10, int: 10, con: 10 };
  public attributes: PrimaryAttributesState = { str: 10, dex: 10, agi: 10, int: 10, con: 10 };

  constructor(init: Omit<EntityInit, 'kind'>) {
    super({ ...init, kind: 'player', hp: init.hp ?? 320, mp: init.mp ?? 180 });
    this.maxExp = expRequiredForLevel(this.level);
  }

  public gainExp(amount: number): number {
    this.exp += amount;
    let levelsGained = 0;
    while (this.level < 110 && this.exp >= this.maxExp) {
      this.exp -= this.maxExp;
      this.level++;
      this.maxExp = expRequiredForLevel(this.level);
      this.maxHp += 48;
      this.maxMp += 26;
      this.hp = this.maxHp;
      this.mp = this.maxMp;
      this.potentialPoints += ATTRIBUTE_POINTS_PER_LEVEL;
      levelsGained++;
    }
    return levelsGained;
  }

  public assignPath(points: WorldPoint[]) {
    this.pathQueue = points;
  }

  public triggerAttack(): boolean {
    if (this.dead || this.attackLockMs > 0) return false;
    this.attackLockMs = 300;
    this.setState('attack');
    return true;
  }

  public updateMovement(dtSec: number, inputVx: number, inputVy: number, tilemap: TilemapEngine, running = false) {
    if (this.dead) {
      this.setState('death');
      return;
    }
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
      this.faceVector(vx, vy);
      const speed = this.speed * (running ? 1.45 : 1);

      const resolved = tilemap.resolveMove(
        this.x,
        this.y,
        this.x + vx * speed * dtSec,
        this.y + vy * speed * dtSec
      );
      this.x = resolved.x;
      this.y = resolved.y;
      this.setState(running ? 'run' : 'walk');
    } else {
      this.setState('idle');
    }
  }
}

export class NpcEntity extends Entity {
  public role: string;
  public district?: string;
  public serviceType?: string;
  public associatedBuildingId?: string;
  public interactionRadius: number;
  public dialogue: string;

  constructor(
    init: Omit<EntityInit, 'kind'> & {
      role: string;
      district?: string;
      serviceType?: string;
      associatedBuildingId?: string;
      direction?: FacingDirection;
      interactionRadius?: number;
      dialogue: string;
    }
  ) {
    super({ ...init, kind: 'npc' });
    this.role = init.role;
    this.district = init.district;
    this.serviceType = init.serviceType;
    this.associatedBuildingId = init.associatedBuildingId;
    this.interactionRadius = init.interactionRadius ?? 92;
    this.dialogue = init.dialogue;
    if (init.direction) this.direction = init.direction;
  }
}

export class MonsterEntity extends Entity {
  public readonly originX: number;
  public readonly originY: number;
  public readonly monsterId: string;
  public readonly expReward: number;
  public readonly goldReward: number;
  public category: string;
  public isElite = false;
  public isRandomElite = false;
  public aiState = 'IDLE';
  public serverControlled = false;
  public portraitUrl?: string;
  public spriteAsset?: string;
  public visualScale = 1;
  public respawnSec = 7;
  public aiBehavior = 'passive';
  public aggroRange = 150;
  public activePhase = 1;
  public enraged = false;
  public telegraph: { skillName: string; warningRadiusPx: number; remainingMs: number } | null = null;
  private wanderAngle = Math.random() * Math.PI * 2;
  private wanderWaitSec = 1 + Math.random() * 2;
  private respawnTimerSec = 0;

  constructor(
    init: Omit<EntityInit, 'kind'> & {
      monsterId?: string;
      expReward?: number;
      goldReward?: number;
      isBoss?: boolean;
      isElite?: boolean;
      isRandomElite?: boolean;
      aiState?: string;
      serverControlled?: boolean;
      category?: string;
      portraitUrl?: string;
      spriteAsset?: string;
      visualScale?: number;
      respawnSec?: number;
      aiBehavior?: string;
      aggroRange?: number;
    }
  ) {
    super({ ...init, kind: 'monster' });
    this.originX = init.x;
    this.originY = init.y;
    this.monsterId = init.monsterId || init.spriteId;
    this.expReward = init.expReward ?? 38;
    this.goldReward = init.goldReward ?? 22;
    this.category = init.category || (init.isBoss ? 'FIELD_BOSS' : init.isElite ? 'ELITE' : 'NORMAL');
    this.isElite = Boolean(init.isElite || init.isRandomElite || this.category === 'ELITE');
    this.isRandomElite = Boolean(init.isRandomElite);
    this.aiState = init.aiState || 'IDLE';
    this.serverControlled = Boolean(init.serverControlled);
    this.portraitUrl = init.portraitUrl;
    this.spriteAsset = init.spriteAsset;
    this.visualScale = Number(init.visualScale ?? (init.isBoss ? 1.45 : this.isElite ? 1.25 : 1));
    this.respawnSec = Number(init.respawnSec ?? (this.category === 'ELITE' ? 75 : this.category === 'MINI_BOSS' ? 300 : this.category === 'FIELD_BOSS' ? 900 : 7));
    this.aiBehavior = init.aiBehavior || (this.isBoss ? 'boss' : this.isElite ? 'aggressive' : 'passive');
    this.aggroRange = Number(init.aggroRange ?? 160);
    this.isBoss = Boolean(init.isBoss || init.spriteId === 'boss_dark_dragon' || this.category === 'MINI_BOSS' || this.category === 'FIELD_BOSS' || this.category === 'WORLD_BOSS');
  }

  public applyDamage(amount: number): boolean {
    if (!this.alive) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.hitFlashMs = 160;
    if (this.hp <= 0) {
      this.alive = false;
      this.respawnTimerSec = Math.max(3, this.respawnSec);
      this.setState('death');
      return true; // Defeated
    }
    this.setState('hurt');
    return false;
  }

  public updateAi(dtSec: number, tilemap: TilemapEngine, playerPos?: { x: number; y: number }) {
    if (this.serverControlled) return;
    if (!this.alive) {
      this.respawnTimerSec -= dtSec;
      if (this.respawnTimerSec <= 0) {
        this.alive = true;
        this.hp = this.maxHp;
        this.activePhase = 1;
        this.enraged = false;
        this.telegraph = null;
        this.x = this.originX;
        this.y = this.originY;
        this.setState('idle');
      }
      return;
    }

    if (this.state === 'hurt' && !this.animationFinished) return;

    if (playerPos && (this.aiBehavior === 'aggressive' || this.aiBehavior === 'boss')) {
      const distToPlayer = Math.hypot(playerPos.x - this.x, playerPos.y - this.y);
      const distFromOrigin = Math.hypot(this.x - this.originX, this.y - this.originY);
      if (distToPlayer > 52 && distToPlayer <= this.aggroRange && distFromOrigin <= 210) {
        const vx = (playerPos.x - this.x) / distToPlayer;
        const vy = (playerPos.y - this.y) / distToPlayer;
        const chaseSpeed = this.aiBehavior === 'boss' ? 58 : 48;
        const nx = this.x + vx * chaseSpeed * dtSec;
        const ny = this.y + vy * chaseSpeed * dtSec;
        const res = tilemap.resolveMove(this.x, this.y, nx, ny);
        this.faceVector(res.x - this.x, res.y - this.y);
        this.x = res.x;
        this.y = res.y;
        this.setState('walk');
        return;
      }
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
        this.faceVector(res.x-this.x, res.y-this.y);
        this.x = res.x;
        this.y = res.y;
        this.setState('walk');
        return;
      }
    }
    this.setState('idle');
  }
}
