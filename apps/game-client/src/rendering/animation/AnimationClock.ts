/**
 * AnimationClock acts as the master heartbeat for synchronized frame animation.
 * Drives all entity layers on a shared, jitter-free timeline.
 */
export class AnimationClock {
  private static instance: AnimationClock | null = null;
  private currentTimeMs = 0;
  private deltaMs = 0;
  private isRunning = true;

  public static getInstance(): AnimationClock {
    if (!AnimationClock.instance) {
      AnimationClock.instance = new AnimationClock();
    }
    return AnimationClock.instance;
  }

  public tick(timeMs?: number): number {
    if (!this.isRunning) return this.deltaMs;
    const now = timeMs !== undefined ? timeMs : (typeof performance !== 'undefined' ? performance.now() : Date.now());
    if (this.currentTimeMs === 0) {
      this.currentTimeMs = now;
      this.deltaMs = 16.67; // default 60fps start
      return this.deltaMs;
    }
    this.deltaMs = Math.min(100, Math.max(1, now - this.currentTimeMs));
    this.currentTimeMs = now;
    return this.deltaMs;
  }

  public getTimeMs(): number {
    return this.currentTimeMs;
  }

  public getDeltaMs(): number {
    return this.deltaMs;
  }

  public pause() {
    this.isRunning = false;
  }

  public resume() {
    this.isRunning = true;
    this.currentTimeMs = 0;
  }
}

export const animationClock = AnimationClock.getInstance();
