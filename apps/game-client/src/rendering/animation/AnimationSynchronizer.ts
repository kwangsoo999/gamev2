import { AnimationClock, animationClock } from './AnimationClock.ts';
import type { EightDirectionName } from '../../assets/AssetManifest.ts';
import type { AnimState } from '../../engine/types.ts';

export interface LayerSyncState {
  layerId: string;
  currentFrame: number;
  totalFrames: number;
  progress: number; // 0.0 to 1.0
  active: boolean;
}

export interface SyncConfig {
  clipId: AnimState | string;
  fps: number;
  totalFrames: number;
  loop: boolean;
  direction: EightDirectionName;
  onFrameChange?: (frame: number) => void;
  onComplete?: () => void;
}

/**
 * AnimationSynchronizer ensures that all equipment layers for a character
 * advance at the exact same millisecond, eliminating visual tearing and frame desync.
 */
export class AnimationSynchronizer {
  private config: SyncConfig;
  private currentFrame = 0;
  private accumulatedMs = 0;
  private frameDurationMs: number;
  private isFinished = false;
  private isPlaying = true;
  private layers: Map<string, LayerSyncState> = new Map();

  constructor(config: SyncConfig) {
    this.config = { ...config };
    this.frameDurationMs = 1000 / Math.max(1, config.fps);
  }

  public registerLayer(layerId: string): void {
    this.layers.set(layerId, {
      layerId,
      currentFrame: this.currentFrame,
      totalFrames: this.config.totalFrames,
      progress: this.config.totalFrames > 1 ? this.currentFrame / (this.config.totalFrames - 1) : 0,
      active: true,
    });
  }

  public unregisterLayer(layerId: string): void {
    this.layers.delete(layerId);
  }

  public setClip(config: SyncConfig): void {
    this.config = { ...config };
    this.frameDurationMs = 1000 / Math.max(1, config.fps);
    this.currentFrame = 0;
    this.accumulatedMs = 0;
    this.isFinished = false;
    this.isPlaying = true;
    this.updateLayerStates();
  }

  public setDirection(direction: EightDirectionName): void {
    this.config.direction = direction;
  }

  public update(deltaMs?: number): number {
    if (!this.isPlaying || this.isFinished) return this.currentFrame;

    const dt = deltaMs !== undefined ? deltaMs : animationClock.getDeltaMs();
    this.accumulatedMs += dt;

    if (this.accumulatedMs >= this.frameDurationMs) {
      const framesToAdvance = Math.floor(this.accumulatedMs / this.frameDurationMs);
      this.accumulatedMs %= this.frameDurationMs;

      const nextFrame = this.currentFrame + framesToAdvance;
      if (nextFrame >= this.config.totalFrames) {
        if (this.config.loop) {
          this.currentFrame = nextFrame % this.config.totalFrames;
          if (this.config.onFrameChange) this.config.onFrameChange(this.currentFrame);
        } else {
          this.currentFrame = this.config.totalFrames - 1;
          this.isFinished = true;
          this.isPlaying = false;
          if (this.config.onComplete) this.config.onComplete();
        }
      } else {
        this.currentFrame = nextFrame;
        if (this.config.onFrameChange) this.config.onFrameChange(this.currentFrame);
      }

      this.updateLayerStates();
    }

    return this.currentFrame;
  }

  private updateLayerStates(): void {
    const progress = this.config.totalFrames > 1 ? this.currentFrame / (this.config.totalFrames - 1) : 0;
    for (const [_, state] of this.layers) {
      state.currentFrame = this.currentFrame;
      state.totalFrames = this.config.totalFrames;
      state.progress = progress;
    }
  }

  public getCurrentFrame(): number {
    return this.currentFrame;
  }

  public getProgress(): number {
    return this.config.totalFrames > 1 ? this.currentFrame / (this.config.totalFrames - 1) : 0;
  }

  public isComplete(): boolean {
    return this.isFinished;
  }

  public getDirection(): EightDirectionName {
    return this.config.direction;
  }

  public getClipId(): AnimState | string {
    return this.config.clipId;
  }

  public reset(): void {
    this.currentFrame = 0;
    this.accumulatedMs = 0;
    this.isFinished = false;
    this.isPlaying = true;
    this.updateLayerStates();
  }
}
