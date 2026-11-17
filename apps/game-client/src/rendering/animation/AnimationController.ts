import type { EightDirectionName } from '../../assets/AssetManifest.ts';
import type { AnimState } from '../../engine/types.ts';
import { AnimationSynchronizer } from './AnimationSynchronizer.ts';

export interface AnimStateDef {
  clipId: AnimState | string;
  fps: number;
  totalFrames: number;
  loop: boolean;
  priority: number;
  canInterrupt: (nextState: AnimState | string, nextPriority: number) => boolean;
}

export const ANIM_PRIORITIES: Record<string, number> = {
  idle: 0,
  sit: 0,
  walk: 1,
  run: 1,
  jump: 2,
  attack: 3,
  skill: 3,
  hurt: 4,
  death: 5,
};

/**
 * AnimationController implements a deterministic Finite State Machine (FSM)
 * for character animations, enforcing strict interruption rules:
 * - Death cannot be interrupted by anything except revive.
 * - Hurt interrupts Attacks, Walk, and Idle.
 * - Attack/Skill can only be interrupted by Hurt or Death.
 * - Movement and Idle can be interrupted at any time.
 */
export class AnimationController {
  private currentState: AnimState | string = 'idle';
  private currentDirection: EightDirectionName = 'south';
  private synchronizer: AnimationSynchronizer;
  private stateConfigs: Map<string, AnimStateDef> = new Map();
  private queuedState: { state: AnimState | string; dir?: EightDirectionName } | null = null;
  private onStateChangeCb?: (from: string, to: string) => void;

  constructor(defaultDirection: EightDirectionName = 'south') {
    this.currentDirection = defaultDirection;

    // Register standard character animation states
    this.registerState({
      clipId: 'idle',
      fps: 6,
      totalFrames: 4,
      loop: true,
      priority: ANIM_PRIORITIES.idle,
      canInterrupt: () => true,
    });

    this.registerState({
      clipId: 'walk',
      fps: 8,
      totalFrames: 6,
      loop: true,
      priority: ANIM_PRIORITIES.walk,
      canInterrupt: () => true,
    });

    this.registerState({
      clipId: 'run',
      fps: 10,
      totalFrames: 6,
      loop: true,
      priority: ANIM_PRIORITIES.run,
      canInterrupt: () => true,
    });

    this.registerState({
      clipId: 'attack',
      fps: 12,
      totalFrames: 6,
      loop: false,
      priority: ANIM_PRIORITIES.attack,
      canInterrupt: (_, nextPriority) => nextPriority >= ANIM_PRIORITIES.hurt,
    });

    this.registerState({
      clipId: 'skill',
      fps: 14,
      totalFrames: 8,
      loop: false,
      priority: ANIM_PRIORITIES.skill,
      canInterrupt: (_, nextPriority) => nextPriority >= ANIM_PRIORITIES.hurt,
    });

    this.registerState({
      clipId: 'hurt',
      fps: 10,
      totalFrames: 3,
      loop: false,
      priority: ANIM_PRIORITIES.hurt,
      canInterrupt: (_, nextPriority) => nextPriority >= ANIM_PRIORITIES.death,
    });

    this.registerState({
      clipId: 'death',
      fps: 8,
      totalFrames: 6,
      loop: false,
      priority: ANIM_PRIORITIES.death,
      canInterrupt: (nextState) => nextState === 'idle' || nextState === 'revive', // Only revival
    });

    const initialDef = this.stateConfigs.get('idle')!;
    this.synchronizer = new AnimationSynchronizer({
      clipId: 'idle',
      fps: initialDef.fps,
      totalFrames: initialDef.totalFrames,
      loop: initialDef.loop,
      direction: this.currentDirection,
      onComplete: () => this.handleClipComplete(),
    });
  }

  public registerState(def: AnimStateDef): void {
    this.stateConfigs.set(def.clipId, def);
  }

  public setState(nextState: AnimState | string, dir?: EightDirectionName, force = false): boolean {
    const nextDef = this.stateConfigs.get(nextState) || {
      clipId: nextState,
      fps: 8,
      totalFrames: 4,
      loop: true,
      priority: ANIM_PRIORITIES[nextState] ?? 1,
      canInterrupt: () => true,
    };

    if (dir) {
      this.currentDirection = dir;
      this.synchronizer.setDirection(dir);
    }

    if (this.currentState === nextState && !force) {
      return true; // Already playing same state
    }

    const currentDef = this.stateConfigs.get(this.currentState);
    if (!force && currentDef && !currentDef.canInterrupt(nextState, nextDef.priority)) {
      // Cannot interrupt right now; queue state for completion if requested
      if (nextDef.priority >= (ANIM_PRIORITIES[this.currentState] ?? 0)) {
        this.queuedState = { state: nextState, dir };
      }
      return false;
    }

    const prev = this.currentState;
    this.currentState = nextState;
    this.synchronizer.setClip({
      clipId: nextState,
      fps: nextDef.fps,
      totalFrames: nextDef.totalFrames,
      loop: nextDef.loop,
      direction: this.currentDirection,
      onComplete: () => this.handleClipComplete(),
    });

    if (this.onStateChangeCb) {
      this.onStateChangeCb(prev, nextState);
    }

    return true;
  }

  public setDirection(direction: EightDirectionName): void {
    if (this.currentDirection !== direction) {
      this.currentDirection = direction;
      this.synchronizer.setDirection(direction);
    }
  }

  public getDirection(): EightDirectionName {
    return this.currentDirection;
  }

  public getState(): AnimState | string {
    return this.currentState;
  }

  public getSynchronizer(): AnimationSynchronizer {
    return this.synchronizer;
  }

  public update(deltaMs?: number): number {
    return this.synchronizer.update(deltaMs);
  }

  private handleClipComplete(): void {
    if (this.queuedState) {
      const q = this.queuedState;
      this.queuedState = null;
      this.setState(q.state, q.dir, true);
    } else if (!this.stateConfigs.get(this.currentState)?.loop) {
      // Non-looping animations (e.g. attack, hurt) revert to idle unless death
      if (this.currentState !== 'death') {
        this.setState('idle', this.currentDirection, true);
      }
    }
  }

  public onStateChange(cb: (from: string, to: string) => void): void {
    this.onStateChangeCb = cb;
  }
}
