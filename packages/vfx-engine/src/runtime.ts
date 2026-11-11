import {
  CLASS_VFX_PROFILES,
  resolveClassVfxProfile,
  type ClassVfxProfileConfig,
} from './profiles.js';
import {
  resolveJobRitualVfxProfile,
  type JobRitualVfxProfile,
} from './jobRituals.js';
import type {
  VFXCombatCallbacks,
  VFXSkillConfig,
  VFXWorldTarget,
} from './index.js';

export interface ActiveJobRitualEffect {
  profile: JobRitualVfxProfile;
  x: number;
  y: number;
  casterX?: number;
  casterY?: number;
  elapsedMs: number;
  durationMs: number;
  reducedEffects: boolean;
  midBurstFired: boolean;
  finaleFired: boolean;
  onComplete?: () => void;
}

export interface PooledParticle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  glowColor: string;
  alpha: number;
  age: number;
  duration: number;
  gravity: number;
  drag: number;
  shape: 'circle' | 'spark' | 'feather' | 'shard' | 'rune';
  rotation: number;
  spin: number;
}

export interface PooledSlashArc {
  active: boolean;
  x: number;
  y: number;
  angle: number;
  arcSpan: number;
  radius: number;
  thickness: number;
  color: string;
  secondaryColor: string;
  trailStyle: ClassVfxProfileConfig['trailStyle'];
  evolutionTier: number;
  isCrit: boolean;
  age: number;
  duration: number;
}

export interface PooledMagicCircle {
  active: boolean;
  x: number;
  y: number;
  radius: number;
  circleStyle: ClassVfxProfileConfig['circleStyle'];
  primaryColor: string;
  accentColor: string;
  evolutionTier: number;
  rotationSpeed: number;
  rotation: number;
  age: number;
  duration: number;
}

export interface PooledProjectileOrb {
  active: boolean;
  startX: number;
  startY: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  radius: number;
  color: string;
  glowColor: string;
  trailStyle: ClassVfxProfileConfig['trailStyle'];
  evolutionTier: number;
  splitFragments: number;
  age: number;
  duration: number;
  onArriveExploded: boolean;
}

export interface PooledShockwaveRing {
  active: boolean;
  x: number;
  y: number;
  startRadius: number;
  endRadius: number;
  color: string;
  lineWidth: number;
  age: number;
  duration: number;
}

export interface PooledAfterimage {
  active: boolean;
  x: number;
  y: number;
  facingAngle: number;
  color: string;
  radius: number;
  age: number;
  duration: number;
}

export interface PooledCombatNumber {
  active: boolean;
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  isCrit: boolean;
  isHeal: boolean;
  scale: number;
  age: number;
  duration: number;
}

export interface LayeredSkillVfxRequest {
  skillKey?: string;
  classOrBranchId?: string;
  skillType?: string;
  element?: string;
  source: VFXWorldTarget;
  target?: VFXWorldTarget;
  areaRadius?: number;
  skillLevel?: number;
  masteryPoints?: number;
  evolutionTier?: number;
  hitCount?: number;
  projectileCount?: number;
  isCrit?: boolean;
  isHeal?: boolean;
  vfxTags?: string[];
  releaseFrame?: number;
  impactFrame?: number;
  animationSpeed?: number;
  weaponOriginOffset?: { offsetX: number; offsetY: number };
  reducedEffects?: boolean;
  callbacks?: VFXCombatCallbacks;
  config?: VFXSkillConfig;
}

export interface VfxPoolStats {
  activeParticles: number;
  activeSlashArcs: number;
  activeCircles: number;
  activeProjectiles: number;
  activeShockwaves: number;
  activeAfterimages: number;
  activeCombatNumbers: number;
  pooledRecycledCount: number;
}

const MAX_PARTICLES = 420;
const MAX_SLASH_ARCS = 48;
const MAX_CIRCLES = 32;
const MAX_PROJECTILES = 64;
const MAX_SHOCKWAVES = 40;
const MAX_AFTERIMAGES = 32;
const MAX_COMBAT_NUMBERS = 48;

export function computeVisualEvolutionTier(
  skillLevel: number = 1,
  masteryPoints: number = 0
): number {
  let tier = 0;
  if (skillLevel >= 3 || masteryPoints >= 20) tier = 1;
  if (skillLevel >= 5 || masteryPoints >= 40) tier = 2;
  if (skillLevel >= 7 || masteryPoints >= 60) tier = 3;
  if (skillLevel >= 10 || masteryPoints >= 80) tier = 4;
  if (skillLevel >= 10 && masteryPoints >= 100) tier = 5;
  return tier;
}

export class LayeredVFXManager {
  private canvas: HTMLCanvasElement | null = null;
  private width: number;
  private height: number;
  private cameraX = 0;
  private cameraY = 0;
  private cameraZoom = 1.0;

  private hitStopMs = 0;
  private shakeIntensity = 0;
  private shakeDurationMs = 0;
  private shakeElapsedMs = 0;
  private totalTimeSec = 0;
  private recycledCount = 0;

  private particles: PooledParticle[] = [];
  private particlePool: PooledParticle[] = [];
  private slashArcs: PooledSlashArc[] = [];
  private slashPool: PooledSlashArc[] = [];
  private circles: PooledMagicCircle[] = [];
  private circlePool: PooledMagicCircle[] = [];
  private projectiles: PooledProjectileOrb[] = [];
  private projectilePool: PooledProjectileOrb[] = [];
  private shockwaves: PooledShockwaveRing[] = [];
  private shockwavePool: PooledShockwaveRing[] = [];
  private afterimages: PooledAfterimage[] = [];
  private afterimagePool: PooledAfterimage[] = [];
  private combatNumbers: PooledCombatNumber[] = [];
  private numberPool: PooledCombatNumber[] = [];

  private pendingTimers: Set<ReturnType<typeof setTimeout>> = new Set();
  private activeJobRitual: ActiveJobRitualEffect | null = null;
  private lowQualityMode = false;

  public setLowQualityMode(enabled: boolean): void {
    this.lowQualityMode = Boolean(enabled);
  }

  public isLowQualityMode(): boolean {
    return this.lowQualityMode;
  }

  public getActiveRitualCameraHint(): { active: boolean; zoomTarget: number; progress: number; x: number; y: number } | null {
    if (!this.activeJobRitual || this.activeJobRitual.reducedEffects) return null;
    const progress = Math.min(1, this.activeJobRitual.elapsedMs / Math.max(1, this.activeJobRitual.durationMs));
    const envelope = progress < 0.2 ? progress / 0.2 : progress > 0.78 ? Math.max(0, (1 - progress) / 0.22) : 1;
    return {
      active: true,
      zoomTarget: 1 + (this.activeJobRitual.profile.cameraZoomTarget - 1) * envelope,
      progress,
      x: this.activeJobRitual.x,
      y: this.activeJobRitual.y,
    };
  }

  public getActiveJobRitual(): ActiveJobRitualEffect | null {
    return this.activeJobRitual;
  }

  public playJobAdvancementRitual(
    jobId: string,
    x: number,
    y: number,
    options?: {
      casterX?: number;
      casterY?: number;
      reducedEffects?: boolean;
      onComplete?: () => void;
    }
  ): JobRitualVfxProfile {
    const profile = resolveJobRitualVfxProfile(jobId);
    const reduced = Boolean(options?.reducedEffects);
    const durationMs = reduced ? Math.min(950, Math.round(profile.durationMs * 0.35)) : profile.durationMs;

    this.activeJobRitual = {
      profile,
      x,
      y,
      casterX: options?.casterX,
      casterY: options?.casterY,
      elapsedMs: 0,
      durationMs,
      reducedEffects: reduced,
      midBurstFired: false,
      finaleFired: false,
      onComplete: options?.onComplete,
    };

    const classProf = resolveClassVfxProfile(profile.jobId);
    this.spawnMagicCircle(
      x,
      y,
      reduced ? profile.circleRadius * 0.78 : profile.circleRadius,
      classProf.circleStyle,
      profile.palette.primaryColor,
      profile.palette.secondaryColor,
      profile.tier === 'second_job' ? 4 : 2,
      durationMs / 1000
    );
    this.spawnShockwave(x, y, 16, profile.circleRadius * 1.1, profile.palette.primaryColor, 3.2, 0.55);
    if (!reduced) {
      this.triggerScreenShake(profile.tier === 'second_job' ? 5 : 3.2, 0.28);
    }

    const initialCount = reduced ? Math.max(6, Math.round(profile.particleCount * 0.28)) : Math.round(profile.particleCount * 0.55);
    this.burstParticles(x, y - 16, initialCount, {
      color: profile.palette.primaryColor,
      glowColor: profile.palette.glowColor,
      speedMin: 30,
      speedMax: 120,
      duration: reduced ? 0.5 : 1.05,
      size: 3.8,
      shape: profile.particleShape,
    });

    if (options?.casterX !== undefined && options?.casterY !== undefined) {
      this.spawnProjectileOrb(
        options.casterX,
        options.casterY - 18,
        x,
        y - 18,
        9,
        profile.palette.secondaryColor,
        profile.palette.glowColor,
        classProf.trailStyle,
        2,
        4,
        0.48
      );
    }
    return profile;
  }

  constructor(
    canvas: HTMLCanvasElement | null = null,
    width: number = 1280,
    height: number = 720
  ) {
    this.canvas = canvas;
    this.width = width;
    this.height = height;
  }

  public getStats(): VfxPoolStats {
    return {
      activeParticles: this.particles.length,
      activeSlashArcs: this.slashArcs.length,
      activeCircles: this.circles.length,
      activeProjectiles: this.projectiles.length,
      activeShockwaves: this.shockwaves.length,
      activeAfterimages: this.afterimages.length,
      activeCombatNumbers: this.combatNumbers.length,
      pooledRecycledCount: this.recycledCount,
    };
  }

  public isHitStopped(): boolean {
    return this.hitStopMs > 0;
  }

  public getScreenShakeOffset(): { x: number; y: number } {
    if (this.shakeIntensity <= 0.05 || this.shakeDurationMs <= 0) {
      return { x: 0, y: 0 };
    }
    const progress = Math.min(1, this.shakeElapsedMs / this.shakeDurationMs);
    const decay = (1 - progress) * (1 - progress);
    const amp = this.shakeIntensity * decay;
    return {
      x: Math.sin(this.totalTimeSec * 92) * amp,
      y: Math.cos(this.totalTimeSec * 78) * amp * 0.85,
    };
  }

  public triggerHitStop(framesOrMs: number = 3): void {
    const ms = framesOrMs > 12 ? framesOrMs : framesOrMs * 16.67;
    this.hitStopMs = Math.max(this.hitStopMs, Math.min(140, ms));
  }

  public triggerScreenShake(intensity: number = 6, durationSec: number = 0.2): void {
    this.shakeIntensity = Math.max(this.shakeIntensity, Math.min(18, intensity));
    this.shakeDurationMs = Math.max(this.shakeDurationMs, durationSec * 1000);
    this.shakeElapsedMs = 0;
  }

  public playSkill(
    skillKey: string,
    source: VFXWorldTarget,
    target?: VFXWorldTarget,
    callbacks?: VFXCombatCallbacks,
    config?: VFXSkillConfig
  ): void {
    this.spawnLayeredSkillVfx({
      skillKey,
      source,
      target,
      callbacks,
      config,
      skillType: config?.type,
      element: config?.element,
    });
  }

  public spawnLayeredSkillVfx(req: LayeredSkillVfxRequest): void {
    const profile = resolveClassVfxProfile(req.classOrBranchId || 'adventurer');
    const target = req.target || { x: req.source.x + 64, y: req.source.y };
    const dx = target.x - req.source.x;
    const dy = target.y - req.source.y;
    const facing = Math.atan2(dy || 0.0001, dx || 1);
    const tier =
      req.evolutionTier ??
      computeVisualEvolutionTier(req.skillLevel ?? 1, req.masteryPoints ?? 0);
    const isCrit = Boolean(req.isCrit);
    const baseRadius = Math.max(46, req.areaRadius ?? (req.config?.scale ?? 1) * 72);
    const radiusScale = 1 + tier * 0.08 + (isCrit ? 0.14 : 0);
    const radius = baseRadius * radiusScale;

    const primary = req.config?.palette?.primaryColor || profile.primaryColor;
    const secondary = req.config?.palette?.secondaryColor || profile.secondaryColor;
    const accent = isCrit ? '#ffffff' : profile.accentColor;
    const glow = req.config?.palette?.glowColor || profile.glowColor;
    const kind = (req.skillType || req.config?.type || 'slash').toLowerCase();

    // Layer 1: Cast Effect halo & radial caster sparks
    this.spawnShockwave(req.source.x, req.source.y, 14, 38 + tier * 6, accent, 2.5, 0.26);
    this.burstParticles(req.source.x, req.source.y, 6 + tier * 2, {
      color: primary,
      glowColor: glow,
      speedMin: 25,
      speedMax: 75,
      duration: 0.35,
      size: 3.2,
      shape: kind === 'healing' || req.isHeal ? 'feather' : 'rune',
    });

    // Layer 2: AoE / Ground Magic Circle when AoE, cast buff, healing, summon, or evolved Lv.5+
    if (
      kind === 'aoe' ||
      kind === 'healing' ||
      kind === 'buff' ||
      kind === 'shield' ||
      kind === 'ultimate' ||
      kind === 'summon' ||
      tier >= 2
    ) {
      const circleX =
        kind === 'buff' || kind === 'shield' || kind === 'healing'
          ? target.x || req.source.x
          : target.x;
      const circleY =
        kind === 'buff' || kind === 'shield' || kind === 'healing'
          ? target.y || req.source.y
          : target.y;
      this.spawnMagicCircle(
        circleX,
        circleY,
        Math.min(165, radius),
        profile.circleStyle,
        primary,
        accent,
        tier,
        kind === 'ultimate' ? 0.95 : 0.65
      );
    }

    // Layer 3: Directional Attack Trails / Slashes / Dash Afterimages
    const hits = Math.max(1, Math.min(6, req.hitCount ?? 1));
    if (
      kind === 'slash' ||
      kind === 'single_target' ||
      kind === 'multi_hit' ||
      kind === 'dash' ||
      kind === 'ultimate'
    ) {
      for (let i = 0; i < Math.min(hits + (tier >= 4 ? 1 : 0), 5); i++) {
        const angleOffset = (i - (hits - 1) / 2) * 0.26;
        this.spawnSlashArc(
          target.x,
          target.y,
          facing + angleOffset,
          kind === 'ultimate' ? Math.PI * 1.35 : Math.PI * 0.85,
          radius * (0.72 + i * 0.08),
          isCrit ? 11 : 7 + tier * 0.8,
          i % 2 === 0 ? primary : secondary,
          accent,
          profile.trailStyle,
          tier,
          isCrit,
          0.28 + i * 0.04
        );
      }
      if (kind === 'dash' || profile.trailStyle === 'phantom_afterimage' || profile.trailStyle === 'shadow_streak') {
        const steps = 3 + Math.min(2, tier);
        for (let s = 1; s <= steps; s++) {
          const t = s / (steps + 1);
          this.spawnAfterimage(
            req.source.x + dx * t,
            req.source.y + dy * t,
            facing,
            primary,
            18 + tier * 2,
            0.35 + s * 0.05
          );
        }
      }
    }

    // Layer 4: Multi-Projectile & Evolved Shrapnel / Fragments
    if (
      kind === 'projectile' ||
      kind === 'beam' ||
      (req.projectileCount ?? 0) > 1 ||
      req.vfxTags?.includes('shrapnel_fragments')
    ) {
      const count = Math.max(1, Math.min(7, req.projectileCount ?? (tier >= 3 ? 2 : 1)));
      const spreadAngle = count > 1 ? 0.24 : 0;
      const dist = Math.max(90, Math.hypot(dx, dy));
      for (let p = 0; p < count; p++) {
        const offset = (p - (count - 1) / 2) * spreadAngle;
        const projAngle = facing + offset;
        this.spawnProjectileOrb(
          req.source.x,
          req.source.y,
          req.source.x + Math.cos(projAngle) * dist,
          req.source.y + Math.sin(projAngle) * dist,
          8 + tier * 1.4,
          primary,
          glow,
          profile.trailStyle,
          tier,
          req.vfxTags?.includes('shrapnel_fragments') ? 5 + tier : 0,
          kind === 'beam' ? 0.16 : 0.28
        );
      }
    }

    // Layer 5 & 6 & 8: Impact Shockwave + Particle Burst + Crit Variance
    const impactParticles = Math.round(
      (14 + tier * 5 + (isCrit ? 12 : 0)) * profile.particleDensityMultiplier
    );
    this.burstParticles(target.x, target.y, impactParticles, {
      color: primary,
      glowColor: isCrit ? '#ffffff' : secondary,
      speedMin: 60,
      speedMax: 190 + tier * 18,
      duration: 0.45 + tier * 0.04,
      size: isCrit ? 4.8 : 3.5,
      shape:
        kind === 'healing' || req.isHeal
          ? 'feather'
          : isCrit
            ? 'spark'
            : profile.trailStyle === 'cosmic_rune' || profile.trailStyle === 'exorcism_sigil'
              ? 'rune'
              : 'shard',
    });
    this.spawnShockwave(
      target.x,
      target.y,
      10,
      radius * 0.95,
      isCrit ? '#fef08a' : primary,
      isCrit ? 4 : 2.5,
      0.34
    );
    if (isCrit) {
      this.spawnShockwave(target.x, target.y, 4, radius * 1.25, '#ffffff', 2, 0.24);
    }

    // Layer 7: Hit-Stop & Screen Shake
    if (!req.isHeal && kind !== 'buff') {
      const hitStopMs =
        (req.config?.hitStopFrames ? req.config.hitStopFrames * 16.67 : profile.defaultHitStopMs) +
        (isCrit ? 18 : 0);
      const shake =
        (req.config?.screenShakeIntensity ?? profile.defaultShakeIntensity) +
        (isCrit ? 2.5 : 0) +
        (kind === 'ultimate' ? 2.5 : 0);
      this.triggerHitStop(hitStopMs);
      this.triggerScreenShake(shake, kind === 'ultimate' ? 0.35 : 0.2);
    }

    // Trigger combat lifecycle callbacks synchronized with releaseFrame & impactFrame
    if (req.callbacks) {
      const frameMs = Math.round(90 / Math.max(0.5, Number(req.animationSpeed || 1)));
      const releaseDelayMs = req.releaseFrame !== undefined ? Math.max(30, req.releaseFrame * frameMs) : 90;
      const impactDelayMs = req.impactFrame !== undefined ? Math.max(releaseDelayMs + 30, req.impactFrame * frameMs) : 160;
      const schedule = (fn: (() => void) | undefined, delayMs: number) => {
        if (!fn) return;
        const timer = setTimeout(() => {
          this.pendingTimers.delete(timer);
          fn();
        }, delayMs);
        this.pendingTimers.add(timer);
      };
      schedule(() => req.callbacks?.onHit?.(target), releaseDelayMs);
      schedule(() => req.callbacks?.onImpact?.(target), impactDelayMs);
      schedule(() => req.callbacks?.onDamageFrame?.(target), impactDelayMs);
      schedule(() => req.callbacks?.onComplete?.(), impactDelayMs + 160);
    }
  }

  public spawnCombatNumber(
    worldPos: VFXWorldTarget,
    amount: number,
    isCrit: boolean = false,
    isHeal: boolean = false,
    color?: string
  ): void {
    const resolvedColor =
      color || (isHeal ? '#4ade80' : isCrit ? '#facc15' : '#f8fafc');
    const item = this.acquire(
      this.combatNumbers,
      this.numberPool,
      MAX_COMBAT_NUMBERS,
      () => ({
        active: true,
        x: 0,
        y: 0,
        vy: -54,
        text: '',
        color: '#ffffff',
        isCrit: false,
        isHeal: false,
        scale: 1,
        age: 0,
        duration: 0.9,
      })
    );
    item.x = worldPos.x + (Math.random() - 0.5) * 14;
    item.y = worldPos.y - 28;
    item.vy = isCrit ? -72 : -52;
    item.text = isHeal ? `+${Math.round(amount)}` : `${Math.round(amount)}${isCrit ? '!' : ''}`;
    item.color = resolvedColor;
    item.isCrit = isCrit;
    item.isHeal = isHeal;
    item.scale = isCrit ? 1.38 : 1.0;
    item.age = 0;
    item.duration = isCrit ? 1.05 : 0.85;
  }

  public spawnMonsterDeath(worldPos: VFXWorldTarget): void {
    this.burstParticles(worldPos.x, worldPos.y, 26, {
      color: '#a855f7',
      glowColor: '#fde047',
      speedMin: 45,
      speedMax: 165,
      duration: 0.65,
      size: 4.5,
      shape: 'spark',
    });
    this.spawnShockwave(worldPos.x, worldPos.y, 12, 68, '#f43f5e', 3, 0.42);
  }

  public setCameraPosition(cameraX: number, cameraY: number, zoom: number = 1.0): void {
    this.cameraX = cameraX;
    this.cameraY = cameraY;
    this.cameraZoom = zoom;
  }

  public update(deltaSeconds: number): void {
    const dt = Math.max(0, Math.min(0.1, deltaSeconds));
    this.totalTimeSec += dt;

    if (this.hitStopMs > 0) {
      this.hitStopMs = Math.max(0, this.hitStopMs - dt * 1000);
    }
    if (this.shakeDurationMs > 0 && this.shakeElapsedMs < this.shakeDurationMs) {
      this.shakeElapsedMs += dt * 1000;
      if (this.shakeElapsedMs >= this.shakeDurationMs) {
        this.shakeIntensity = 0;
        this.shakeDurationMs = 0;
        this.shakeElapsedMs = 0;
      }
    }

    this.advanceList(this.particles, this.particlePool, dt, (p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= p.drag;
      p.vy = p.vy * p.drag + p.gravity * dt;
      p.rotation += p.spin * dt;
    });

    this.advanceList(this.slashArcs, this.slashPool, dt);
    this.advanceList(this.circles, this.circlePool, dt, (c) => {
      c.rotation += c.rotationSpeed * dt;
    });

    this.advanceList(this.projectiles, this.projectilePool, dt, (orb) => {
      const progress = Math.min(1, orb.age / orb.duration);
      orb.x = orb.startX + (orb.targetX - orb.startX) * progress;
      orb.y = orb.startY + (orb.targetY - orb.startY) * progress;
      if (progress >= 0.96 && !orb.onArriveExploded && orb.splitFragments > 0) {
        orb.onArriveExploded = true;
        this.burstParticles(orb.targetX, orb.targetY, orb.splitFragments * 2, {
          color: orb.color,
          glowColor: orb.glowColor,
          speedMin: 70,
          speedMax: 210,
          duration: 0.42,
          size: 3.6,
          shape: 'shard',
        });
      }
    });

    this.advanceList(this.shockwaves, this.shockwavePool, dt);
    this.advanceList(this.afterimages, this.afterimagePool, dt);
    this.advanceList(this.combatNumbers, this.numberPool, dt, (n) => {
      n.y += n.vy * dt;
      n.vy *= 0.94;
    });

    if (this.activeJobRitual) {
      const rit = this.activeJobRitual;
      rit.elapsedMs += dt * 1000;
      const t = Math.min(1, rit.elapsedMs / Math.max(1, rit.durationMs));
      if (!rit.midBurstFired && t >= 0.48) {
        rit.midBurstFired = true;
        const midCount = rit.reducedEffects ? 8 : Math.round(rit.profile.particleCount * 0.6);
        this.burstParticles(rit.x, rit.y - 26, midCount, {
          color: rit.profile.palette.secondaryColor,
          glowColor: rit.profile.palette.glowColor,
          speedMin: 45,
          speedMax: 165,
          duration: rit.reducedEffects ? 0.45 : 0.9,
          size: 4.1,
          shape: rit.profile.particleShape,
        });
        this.spawnShockwave(rit.x, rit.y, 18, rit.profile.circleRadius * 1.25, rit.profile.palette.secondaryColor, 3.6, 0.48);
        if (rit.profile.cloneCount > 0 && !rit.reducedEffects) {
          for (let c = 0; c < rit.profile.cloneCount; c++) {
            const ang = (c * Math.PI * 2) / rit.profile.cloneCount;
            this.spawnAfterimage(
              rit.x + Math.cos(ang) * 58,
              rit.y + Math.sin(ang) * 32,
              ang,
              rit.profile.palette.primaryColor,
              19,
              0.75
            );
          }
        }
      }
      if (!rit.finaleFired && t >= 0.78) {
        rit.finaleFired = true;
        this.spawnShockwave(rit.x, rit.y, 24, rit.profile.circleRadius * 1.45, rit.profile.palette.glowColor, 4.2, 0.56);
        if (!rit.reducedEffects) {
          this.triggerScreenShake(rit.profile.tier === 'second_job' ? 7 : 4.5, 0.25);
        }
      }
      if (rit.elapsedMs >= rit.durationMs) {
        const doneCb = rit.onComplete;
        this.activeJobRitual = null;
        doneCb?.();
      }
    }
  }

  public render(
    ctx: CanvasRenderingContext2D,
    viewOffsetX: number = this.cameraX,
    viewOffsetY: number = this.cameraY
  ): void {
    ctx.save();

    // 1. Ground Magic Circles (backplate under entities)
    for (const c of this.circles) {
      const progress = c.age / c.duration;
      const alpha = progress < 0.2 ? progress / 0.2 : Math.max(0, 1 - (progress - 0.2) / 0.8);
      const sx = c.x - viewOffsetX;
      const sy = c.y - viewOffsetY;
      this.drawMagicCircle(ctx, sx, sy, c, alpha * 0.85);
    }

    // 2. Afterimages
    for (const img of this.afterimages) {
      const alpha = Math.max(0, 1 - img.age / img.duration) * 0.55;
      const sx = img.x - viewOffsetX;
      const sy = img.y - viewOffsetY;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = img.color;
      ctx.beginPath();
      ctx.ellipse(sx, sy - 10, img.radius * 0.65, img.radius, img.facingAngle * 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Additive blend block for glowing trails, projectiles, shockwaves, particles
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // 3. Shockwave Rings
    for (const ring of this.shockwaves) {
      const t = Math.min(1, ring.age / ring.duration);
      const r = ring.startRadius + (ring.endRadius - ring.startRadius) * (1 - (1 - t) * (1 - t));
      const alpha = Math.max(0, 1 - t) * 0.85;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = Math.max(1, ring.lineWidth * (1 - t * 0.5));
      ctx.beginPath();
      ctx.ellipse(ring.x - viewOffsetX, ring.y - viewOffsetY, r, r * 0.62, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 4. Directional Slash Trails & Signature Arcs
    for (const arc of this.slashArcs) {
      const t = Math.min(1, arc.age / arc.duration);
      const alpha = t < 0.15 ? t / 0.15 : Math.max(0, 1 - (t - 0.15) / 0.85);
      this.drawSlashTrail(ctx, arc.x - viewOffsetX, arc.y - viewOffsetY, arc, alpha, t);
    }

    // 5. Projectiles + Motion Tails
    for (const orb of this.projectiles) {
      const sx = orb.x - viewOffsetX;
      const sy = orb.y - viewOffsetY;
      const tailX = orb.startX + (orb.x - orb.startX) * 0.68 - viewOffsetX;
      const tailY = orb.startY + (orb.y - orb.startY) * 0.68 - viewOffsetY;
      ctx.save();
      const grad = ctx.createLinearGradient(tailX, tailY, sx, sy);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(1, orb.color);
      ctx.strokeStyle = grad;
      ctx.lineWidth = orb.radius * 1.1;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(sx, sy);
      ctx.stroke();

      ctx.fillStyle = orb.glowColor;
      ctx.beginPath();
      ctx.arc(sx, sy, orb.radius * 1.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(sx, sy, orb.radius * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 6. Particles
    for (const p of this.particles) {
      const t = Math.min(1, p.age / p.duration);
      const alpha = Math.max(0, (1 - t) * p.alpha);
      const sx = p.x - viewOffsetX;
      const sy = p.y - viewOffsetY;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(sx, sy);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      if (p.shape === 'spark' || p.shape === 'shard') {
        ctx.beginPath();
        ctx.moveTo(0, -p.size * 1.6);
        ctx.lineTo(p.size * 0.65, 0);
        ctx.lineTo(0, p.size * 1.6);
        ctx.lineTo(-p.size * 0.65, 0);
        ctx.closePath();
        ctx.fill();
      } else if (p.shape === 'feather') {
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 1.7, p.size * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'rune') {
        ctx.strokeStyle = p.glowColor;
        ctx.lineWidth = 1.4;
        ctx.strokeRect(-p.size, -p.size, p.size * 2, p.size * 2);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.restore(); // end additive

    // 7. Floating Combat Numbers
    for (const num of this.combatNumbers) {
      const t = Math.min(1, num.age / num.duration);
      const alpha = t < 0.7 ? 1 : Math.max(0, 1 - (t - 0.7) / 0.3);
      const sx = num.x - viewOffsetX;
      const sy = num.y - viewOffsetY;
      ctx.save();
      ctx.globalAlpha = alpha;
      const fontSize = Math.round((num.isCrit ? 19 : 14) * num.scale);
      ctx.font = `bold ${fontSize}px 'Cinzel', 'Trebuchet MS', sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeText(num.text, sx, sy);
      ctx.fillStyle = num.color;
      ctx.fillText(num.text, sx, sy);
      ctx.restore();
    }

    if (this.activeJobRitual) {
      this.drawActiveJobRitual(ctx, this.activeJobRitual, viewOffsetX, viewOffsetY);
    }

    ctx.restore();
  }

  private drawActiveJobRitual(
    ctx: CanvasRenderingContext2D,
    rit: ActiveJobRitualEffect,
    viewOffsetX: number,
    viewOffsetY: number
  ): void {
    const t = Math.min(1, rit.elapsedMs / Math.max(1, rit.durationMs));
    const envelope = t < 0.16 ? t / 0.16 : t > 0.82 ? Math.max(0, (1 - t) / 0.18) : 1;
    const sx = rit.x - viewOffsetX;
    const sy = rit.y - viewOffsetY;
    const prof = rit.profile;
    const spin = this.totalTimeSec * (prof.tier === 'second_job' ? 2.4 : 1.7);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // Vertical Sky Beam / Ascension Pillar
    if (prof.hasSkyBeam) {
      const beamW = (prof.tier === 'second_job' ? 54 : 40) * (0.75 + Math.sin(t * Math.PI) * 0.45);
      const grad = ctx.createLinearGradient(sx, sy - 260, sx, sy + 12);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(0.45, prof.palette.beamColor);
      grad.addColorStop(1, prof.palette.primaryColor);
      ctx.globalAlpha = 0.34 * envelope;
      ctx.fillStyle = grad;
      ctx.fillRect(sx - beamW * 0.5, sy - 260, beamW, 272);
    }

    // Seraphic Wing Arcs & Golden Halo (Priest / Saint / Paladin)
    if (prof.hasWingHalo) {
      ctx.save();
      ctx.globalAlpha = 0.65 * envelope;
      ctx.strokeStyle = prof.palette.secondaryColor;
      ctx.lineWidth = 2.6;
      const spread = 32 + Math.sin(t * Math.PI) * 26;
      for (const side of [-1, 1]) {
        for (let f = 0; f < 3; f++) {
          ctx.beginPath();
          ctx.ellipse(sx + side * (22 + f * 9), sy - 28 - f * 6, spread * (0.78 - f * 0.14), 11, side * (0.35 + f * 0.12), 0, Math.PI * 1.4);
          ctx.stroke();
        }
      }
      ctx.beginPath();
      ctx.ellipse(sx, sy - 64, 18, 6, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Motif-Specific Orbiting Constellations (Swords, Spears, Shields, Element Triad, Arrows, Seals, Reticle)
    const count = rit.reducedEffects ? Math.min(3, prof.sigilCount) : prof.sigilCount;
    const rad = prof.circleRadius * 0.72;
    for (let i = 0; i < count; i++) {
      const a = spin + (i * Math.PI * 2) / Math.max(1, count);
      const ox = sx + Math.cos(a) * rad;
      const oy = sy - 22 + Math.sin(a) * (rad * 0.45) - t * 14;
      ctx.save();
      ctx.translate(ox, oy);
      ctx.globalAlpha = 0.88 * envelope;
      if (prof.motif === 'elemental_triad') {
        const triCols = ['#ef4444', '#38bdf8', '#facc15'];
        ctx.fillStyle = triCols[i % 3];
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fill();
      } else if (prof.motif === 'sword_constellation' || prof.motif === 'duelist_rapiers') {
        ctx.rotate(-Math.PI * 0.5);
        ctx.strokeStyle = i % 2 === 0 ? prof.palette.primaryColor : prof.palette.secondaryColor;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(-12, 0);
        ctx.lineTo(14, 0);
        ctx.moveTo(-6, -5);
        ctx.lineTo(-6, 5);
        ctx.stroke();
      } else if (prof.motif === 'spear_vortex' || prof.motif === 'dragon_coil') {
        ctx.rotate(a + Math.PI * 0.5);
        ctx.strokeStyle = prof.palette.secondaryColor;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(0, 14);
        ctx.lineTo(0, -16);
        ctx.lineTo(4, -8);
        ctx.moveTo(0, -16);
        ctx.lineTo(-4, -8);
        ctx.stroke();
      } else if (prof.motif === 'arrow_volleys' || prof.motif === 'sniper_reticle') {
        ctx.rotate(-Math.PI * 0.5);
        ctx.strokeStyle = prof.palette.primaryColor;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(12, 0);
        ctx.lineTo(7, -4);
        ctx.moveTo(12, 0);
        ctx.lineTo(7, 4);
        ctx.stroke();
      } else if (prof.motif === 'shield_barrier') {
        ctx.strokeStyle = prof.palette.secondaryColor;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(0, -9);
        ctx.lineTo(8, -4);
        ctx.lineTo(6, 7);
        ctx.lineTo(0, 11);
        ctx.lineTo(-6, 7);
        ctx.lineTo(-8, -4);
        ctx.closePath();
        ctx.stroke();
      } else {
        ctx.rotate(spin * 1.4);
        ctx.strokeStyle = i % 2 === 0 ? prof.palette.primaryColor : prof.palette.secondaryColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(-6, -6, 12, 12);
      }
      ctx.restore();
    }

    // Sniper crosshair or Martial shock ring extras
    if (prof.motif === 'sniper_reticle') {
      ctx.globalAlpha = 0.72 * envelope;
      ctx.strokeStyle = prof.palette.secondaryColor;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(sx, sy - 20, 44, 0, Math.PI * 2);
      ctx.moveTo(sx - 56, sy - 20);
      ctx.lineTo(sx + 56, sy - 20);
      ctx.moveTo(sx, sy - 76);
      ctx.lineTo(sx, sy + 36);
      ctx.stroke();
    }

    ctx.restore();

    // Non-obstructive Advancement Ritual Title Banner just above circle
    ctx.save();
    ctx.globalAlpha = envelope;
    ctx.font = '800 13px "Cinzel", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.92)';
    const label = `✦ ${prof.titleVi} ✦`;
    ctx.strokeText(label, sx, sy - 86);
    ctx.fillStyle = prof.palette.glowColor;
    ctx.fillText(label, sx, sy - 86);
    ctx.restore();
  }

  public renderCasterWeaponAura(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number,
    classOrBranchId: string | undefined,
    evolutionTier: number,
    timeSec: number = this.totalTimeSec
  ): void {
    const profile = CLASS_VFX_PROFILES[(classOrBranchId || '').toLowerCase()];
    if (!profile) return;
    if (evolutionTier <= 0 && profile.styleCategory === 'base_class') return;

    const orbitCount = Math.min(5, 1 + evolutionTier);
    const orbitRadius = 18 + evolutionTier * 3;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = profile.glowColor;
    ctx.lineWidth = 1.4;
    ctx.globalAlpha = 0.28 + evolutionTier * 0.06;
    ctx.beginPath();
    ctx.ellipse(screenX, screenY + 4, orbitRadius, orbitRadius * 0.45, 0, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < orbitCount; i++) {
      const theta = timeSec * 2.8 + (i * Math.PI * 2) / orbitCount;
      const mx = screenX + Math.cos(theta) * orbitRadius;
      const my = screenY - 8 + Math.sin(theta) * (orbitRadius * 0.42);
      ctx.fillStyle = i % 2 === 0 ? profile.primaryColor : profile.accentColor;
      ctx.globalAlpha = 0.72;
      ctx.beginPath();
      ctx.arc(mx, my, 2.2 + evolutionTier * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    if (this.canvas) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  public dispose(): void {
    for (const t of this.pendingTimers) {
      clearTimeout(t);
    }
    this.pendingTimers.clear();
    this.particles.length = 0;
    this.particlePool.length = 0;
    this.slashArcs.length = 0;
    this.slashPool.length = 0;
    this.circles.length = 0;
    this.circlePool.length = 0;
    this.projectiles.length = 0;
    this.projectilePool.length = 0;
    this.shockwaves.length = 0;
    this.shockwavePool.length = 0;
    this.afterimages.length = 0;
    this.afterimagePool.length = 0;
    this.combatNumbers.length = 0;
    this.numberPool.length = 0;
    this.hitStopMs = 0;
    this.shakeIntensity = 0;
    this.activeJobRitual = null;
  }

  private drawMagicCircle(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    c: PooledMagicCircle,
    alpha: number
  ): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.56); // Isometric ground projection
    ctx.rotate(c.rotation);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = c.primaryColor;
    ctx.lineWidth = 2.2;

    // Outer boundary ring
    ctx.beginPath();
    ctx.arc(0, 0, c.radius, 0, Math.PI * 2);
    ctx.stroke();

    // Inner evolved glyph ring
    if (c.evolutionTier >= 1) {
      ctx.strokeStyle = c.accentColor;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, 0, c.radius * 0.78, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Inscribed branch geometry
    const sides =
      c.circleStyle === 'paladin_cross' || c.circleStyle === 'elemental_triad'
        ? 4
        : c.circleStyle === 'aegis_octagon' || c.circleStyle === 'celestial_astrolabe'
          ? 8
          : 6;
    ctx.beginPath();
    for (let i = 0; i <= sides; i++) {
      const a = (i * Math.PI * 2) / sides;
      const px = Math.cos(a) * c.radius * 0.92;
      const py = Math.sin(a) * c.radius * 0.92;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    if (c.evolutionTier >= 4) {
      ctx.rotate(-c.rotation * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, c.radius * 1.12, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawSlashTrail(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    arc: PooledSlashArc,
    alpha: number,
    t: number
  ): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(arc.angle);
    ctx.globalAlpha = alpha;

    if (
      arc.trailStyle === 'piercing_lance' ||
      arc.trailStyle === 'snipe_laser'
    ) {
      const len = arc.radius * 1.9;
      ctx.strokeStyle = arc.color;
      ctx.lineWidth = arc.thickness * (1 - t * 0.35);
      ctx.beginPath();
      ctx.moveTo(-len * 0.3, 0);
      ctx.lineTo(len, 0);
      ctx.stroke();
      ctx.strokeStyle = arc.secondaryColor;
      ctx.lineWidth = arc.thickness * 0.45;
      ctx.beginPath();
      ctx.moveTo(-len * 0.15, 0);
      ctx.lineTo(len * 1.1, 0);
      ctx.stroke();
    } else {
      const sweepOffset = (t - 0.5) * 0.35;
      const startA = -arc.arcSpan * 0.5 + sweepOffset;
      const endA = arc.arcSpan * 0.5 + sweepOffset;
      ctx.strokeStyle = arc.color;
      ctx.lineWidth = arc.thickness;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, arc.radius, startA, endA);
      ctx.stroke();

      ctx.strokeStyle = arc.secondaryColor;
      ctx.lineWidth = Math.max(1.5, arc.thickness * 0.42);
      ctx.beginPath();
      ctx.arc(0, 0, arc.radius * 0.9, startA + 0.08, endA - 0.08);
      ctx.stroke();

      if (arc.evolutionTier >= 3 || arc.isCrit) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, arc.radius * 1.12, startA, endA);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  private burstParticles(
    x: number,
    y: number,
    count: number,
    opts: {
      color: string;
      glowColor: string;
      speedMin: number;
      speedMax: number;
      duration: number;
      size: number;
      shape: PooledParticle['shape'];
    }
  ): void {
    for (let i = 0; i < count; i++) {
      const p = this.acquire(this.particles, this.particlePool, MAX_PARTICLES, () => ({
        active: true,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 3,
        color: '#ffffff',
        glowColor: '#ffffff',
        alpha: 1,
        age: 0,
        duration: 0.4,
        gravity: 40,
        drag: 0.95,
        shape: 'circle' as PooledParticle['shape'],
        rotation: 0,
        spin: 0,
      }));
      const angle = Math.random() * Math.PI * 2;
      const speed = opts.speedMin + Math.random() * (opts.speedMax - opts.speedMin);
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed * 0.72 - 18;
      p.size = opts.size * (0.75 + Math.random() * 0.55);
      p.color = opts.color;
      p.glowColor = opts.glowColor;
      p.alpha = 0.95;
      p.age = 0;
      p.duration = opts.duration * (0.8 + Math.random() * 0.4);
      p.gravity = opts.shape === 'feather' ? -22 : 45;
      p.drag = 0.94;
      p.shape = opts.shape;
      p.rotation = angle;
      p.spin = (Math.random() - 0.5) * 8;
    }
  }

  private spawnSlashArc(
    x: number,
    y: number,
    angle: number,
    arcSpan: number,
    radius: number,
    thickness: number,
    color: string,
    secondaryColor: string,
    trailStyle: ClassVfxProfileConfig['trailStyle'],
    evolutionTier: number,
    isCrit: boolean,
    duration: number
  ): void {
    const item = this.acquire(this.slashArcs, this.slashPool, MAX_SLASH_ARCS, () => ({
      active: true,
      x: 0,
      y: 0,
      angle: 0,
      arcSpan: Math.PI,
      radius: 50,
      thickness: 6,
      color: '#ffffff',
      secondaryColor: '#ffffff',
      trailStyle: 'crescent_arc' as ClassVfxProfileConfig['trailStyle'],
      evolutionTier: 0,
      isCrit: false,
      age: 0,
      duration: 0.3,
    }));
    item.x = x;
    item.y = y;
    item.angle = angle;
    item.arcSpan = arcSpan;
    item.radius = radius;
    item.thickness = thickness;
    item.color = color;
    item.secondaryColor = secondaryColor;
    item.trailStyle = trailStyle;
    item.evolutionTier = evolutionTier;
    item.isCrit = isCrit;
    item.age = 0;
    item.duration = duration;
  }

  private spawnMagicCircle(
    x: number,
    y: number,
    radius: number,
    circleStyle: ClassVfxProfileConfig['circleStyle'],
    primaryColor: string,
    accentColor: string,
    evolutionTier: number,
    duration: number
  ): void {
    const item = this.acquire(this.circles, this.circlePool, MAX_CIRCLES, () => ({
      active: true,
      x: 0,
      y: 0,
      radius: 64,
      circleStyle: 'runic_halo' as ClassVfxProfileConfig['circleStyle'],
      primaryColor: '#ffffff',
      accentColor: '#ffffff',
      evolutionTier: 0,
      rotationSpeed: 1.4,
      rotation: 0,
      age: 0,
      duration: 0.65,
    }));
    item.x = x;
    item.y = y;
    item.radius = radius;
    item.circleStyle = circleStyle;
    item.primaryColor = primaryColor;
    item.accentColor = accentColor;
    item.evolutionTier = evolutionTier;
    item.rotationSpeed = circleStyle === 'celestial_astrolabe' ? 2.2 : 1.3;
    item.rotation = 0;
    item.age = 0;
    item.duration = duration;
  }

  private spawnProjectileOrb(
    startX: number,
    startY: number,
    targetX: number,
    targetY: number,
    radius: number,
    color: string,
    glowColor: string,
    trailStyle: ClassVfxProfileConfig['trailStyle'],
    evolutionTier: number,
    splitFragments: number,
    duration: number
  ): void {
    const item = this.acquire(this.projectiles, this.projectilePool, MAX_PROJECTILES, () => ({
      active: true,
      startX: 0,
      startY: 0,
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      radius: 8,
      color: '#ffffff',
      glowColor: '#ffffff',
      trailStyle: 'elemental_orb' as ClassVfxProfileConfig['trailStyle'],
      evolutionTier: 0,
      splitFragments: 0,
      age: 0,
      duration: 0.25,
      onArriveExploded: false,
    }));
    item.startX = startX;
    item.startY = startY;
    item.x = startX;
    item.y = startY;
    item.targetX = targetX;
    item.targetY = targetY;
    item.radius = radius;
    item.color = color;
    item.glowColor = glowColor;
    item.trailStyle = trailStyle;
    item.evolutionTier = evolutionTier;
    item.splitFragments = splitFragments;
    item.age = 0;
    item.duration = duration;
    item.onArriveExploded = false;
  }

  private spawnShockwave(
    x: number,
    y: number,
    startRadius: number,
    endRadius: number,
    color: string,
    lineWidth: number,
    duration: number
  ): void {
    const item = this.acquire(this.shockwaves, this.shockwavePool, MAX_SHOCKWAVES, () => ({
      active: true,
      x: 0,
      y: 0,
      startRadius: 10,
      endRadius: 60,
      color: '#ffffff',
      lineWidth: 2,
      age: 0,
      duration: 0.3,
    }));
    item.x = x;
    item.y = y;
    item.startRadius = startRadius;
    item.endRadius = endRadius;
    item.color = color;
    item.lineWidth = lineWidth;
    item.age = 0;
    item.duration = duration;
  }

  private spawnAfterimage(
    x: number,
    y: number,
    facingAngle: number,
    color: string,
    radius: number,
    duration: number
  ): void {
    const item = this.acquire(this.afterimages, this.afterimagePool, MAX_AFTERIMAGES, () => ({
      active: true,
      x: 0,
      y: 0,
      facingAngle: 0,
      color: '#ffffff',
      radius: 18,
      age: 0,
      duration: 0.3,
    }));
    item.x = x;
    item.y = y;
    item.facingAngle = facingAngle;
    item.color = color;
    item.radius = radius;
    item.age = 0;
    item.duration = duration;
  }

  private acquire<T extends { active: boolean }>(
    activeList: T[],
    freePool: T[],
    maxActive: number,
    factory: () => T
  ): T {
    if (activeList.length >= maxActive) {
      const evicted = activeList.shift()!;
      evicted.active = true;
      this.recycledCount += 1;
      activeList.push(evicted);
      return evicted;
    }
    const pooled = freePool.pop();
    if (pooled) {
      pooled.active = true;
      this.recycledCount += 1;
      activeList.push(pooled);
      return pooled;
    }
    const fresh = factory();
    activeList.push(fresh);
    return fresh;
  }

  private advanceList<T extends { active: boolean; age: number; duration: number }>(
    activeList: T[],
    freePool: T[],
    dt: number,
    step?: (item: T) => void
  ): void {
    for (let i = activeList.length - 1; i >= 0; i--) {
      const item = activeList[i];
      item.age += dt;
      if (item.age >= item.duration) {
        item.active = false;
        activeList.splice(i, 1);
        freePool.push(item);
        this.recycledCount += 1;
      } else if (step) {
        step(item);
      }
    }
  }

  public clearAll(): void {
    for (const timer of this.pendingTimers) {
      clearTimeout(timer);
    }
    this.pendingTimers.clear();
    this.particles.length = 0;
    this.slashArcs.length = 0;
    this.circles.length = 0;
    this.projectiles.length = 0;
    this.shockwaves.length = 0;
    this.afterimages.length = 0;
    this.combatNumbers.length = 0;
    this.activeJobRitual = null;
  }
}
