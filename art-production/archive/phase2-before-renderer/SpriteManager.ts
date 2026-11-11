import { Entity } from '../entities/Entity';
import { SpriteRegistryDoc, SpriteSheetMeta } from './types';

/**
 * SpriteManager loads JSON frame metadata and renders either:
 * 1) Real raster sprite sheets when `spriteSheetUrl` is defined & loaded, OR
 * 2) Clean-slate vector character/monster rigs keyed to anim state + frame index (no external images required yet).
 */
export class SpriteManager {
  private registry: Record<string, SpriteSheetMeta> = {};
  private loadedImages: Map<string, HTMLImageElement> = new Map();

  public loadRegistry(doc: SpriteRegistryDoc) {
    this.registry = doc.sheets || {};
    for (const [id, meta] of Object.entries(this.registry)) {
      if (meta.spriteSheetUrl && !this.loadedImages.has(id)) {
        const img = new Image();
        img.src = meta.spriteSheetUrl;
        img.onload = () => this.loadedImages.set(id, img);
      }
    }
  }

  public getMeta(spriteId: string): SpriteSheetMeta | undefined {
    return this.registry[spriteId];
  }

  public drawEntity(ctx: CanvasRenderingContext2D, entity: Entity, screenX: number, screenY: number, timeMs: number) {
    const meta = this.getMeta(entity.spriteId);
    const img = this.loadedImages.get(entity.spriteId);

    ctx.save();
    // Contact shadow
    ctx.fillStyle = 'rgba(18, 28, 16, 0.28)';
    ctx.beginPath();
    ctx.ellipse(screenX, screenY + 2, entity.kind === 'monster' ? 16 : 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    if (entity.hitFlashMs > 0) {
      ctx.filter = 'brightness(1.85)';
    }

    if (meta && img && img.complete) {
      const clip = meta.animations[entity.state] || meta.animations.idle;
      const sx = (entity.frameIndex % clip.frames) * meta.frameWidth;
      const sy = clip.row * meta.frameHeight;
      const drawW = meta.frameWidth;
      const drawH = meta.frameHeight;

      ctx.translate(screenX, screenY);
      ctx.scale(entity.facing, 1);
      ctx.drawImage(
        img,
        sx,
        sy,
        meta.frameWidth,
        meta.frameHeight,
        -drawW * meta.anchorX,
        -drawH * meta.anchorY,
        drawW,
        drawH
      );
    } else {
      this.drawCleanProceduralEntity(ctx, entity, screenX, screenY, timeMs);
    }
    ctx.restore();

    // Nameplate & Monster HP Bar
    this.drawOverlayLabels(ctx, entity, screenX, screenY);
  }

  private drawCleanProceduralEntity(
    ctx: CanvasRenderingContext2D,
    entity: Entity,
    x: number,
    y: number,
    timeMs: number
  ) {
    const bob =
      entity.state === 'walk'
        ? Math.abs(Math.sin(entity.frameIndex * 1.1)) * 4
        : Math.sin(timeMs * 0.004 + x * 0.05) * 1.6;
    const isAttack = entity.state === 'attack';

    ctx.save();
    ctx.translate(x, y - bob);
    ctx.scale(entity.facing, 1);

    if (entity.spriteId === 'monster_slime') {
      const squash = isAttack ? 1.25 : 1 + Math.sin(timeMs * 0.006 + entity.frameIndex) * 0.08;
      ctx.fillStyle = '#4ade80';
      ctx.strokeStyle = '#14532d';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, -13, 17 * squash, 14 / squash, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Cute slime highlight & eyes
      ctx.fillStyle = '#dcfce7';
      ctx.beginPath();
      ctx.ellipse(-5, -18, 4, 2.5, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(2, -15, 3, 4);
      ctx.fillRect(8, -15, 3, 4);
    } else if (entity.spriteId === 'monster_goblin') {
      // Goblin chibi scout
      ctx.fillStyle = '#65a30d';
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 2;
      ctx.fillRect(-10, -24, 20, 18); // Tunic/torso
      ctx.strokeRect(-10, -24, 20, 18);
      // Ears + head
      ctx.beginPath();
      ctx.moveTo(-12, -32);
      ctx.lineTo(-20, -37);
      ctx.lineTo(-10, -27);
      ctx.moveTo(12, -32);
      ctx.lineTo(20, -37);
      ctx.lineTo(10, -27);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -31, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(2, -33, 3, 3);
      ctx.fillRect(-5, -33, 3, 3);
      // Wooden club swing on attack
      ctx.save();
      ctx.translate(10, -16);
      ctx.rotate(isAttack ? 0.9 : -0.35);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(0, -16, 5, 18);
      ctx.restore();
    } else {
      // Player or NPC Humanoid Chibi Rig
      const tunicColor =
        entity.kind === 'player'
          ? '#2f6f44'
          : entity.spriteId === 'npc_merchant'
          ? '#be185d'
          : '#3b82f6';
      const hairColor =
        entity.kind === 'player' ? '#7c3f1d' : entity.spriteId === 'npc_merchant' ? '#451a03' : '#e2e8f0';

      // Walking legs
      const legSwing = entity.state === 'walk' ? Math.sin(entity.frameIndex * 1.2) * 5 : 0;
      ctx.fillStyle = '#4a2c16';
      ctx.fillRect(-7 + legSwing * 0.4, -10, 5, 10);
      ctx.fillRect(2 - legSwing * 0.4, -10, 5, 10);

      // Cloak / Body
      ctx.fillStyle = tunicColor;
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-10, -28, 20, 20, 4);
      ctx.fill();
      ctx.stroke();

      // Head + Anime Eyes
      ctx.fillStyle = '#fde2c4';
      ctx.beginPath();
      ctx.arc(0, -38, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Hair crown
      ctx.fillStyle = hairColor;
      ctx.beginPath();
      ctx.arc(0, -41, 12.5, Math.PI, 0);
      ctx.fill();

      // Eyes
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(2, -39, 2.5, 4);
      ctx.fillRect(-4.5, -39, 2.5, 4);

      // Player sword & wooden shield
      if (entity.kind === 'player') {
        ctx.save();
        ctx.translate(10, -18);
        ctx.rotate(isAttack ? 1.25 - entity.frameIndex * 0.35 : -0.35);
        ctx.fillStyle = '#cbd5e1';
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.5;
        ctx.fillRect(0, -18, 4, 20);
        ctx.strokeRect(0, -18, 4, 20);
        ctx.restore();

        // Slash trail arc during attack state
        if (isAttack) {
          ctx.strokeStyle = 'rgba(253, 224, 71, 0.85)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(8, -20, 26, -0.9, 0.9);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  private drawOverlayLabels(ctx: CanvasRenderingContext2D, entity: Entity, x: number, y: number) {
    ctx.save();
    ctx.font = '600 11px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';

    if (entity.kind === 'monster') {
      // Compact HP Bar
      const bw = 38;
      const pct = Math.max(0, entity.hp / Math.max(1, entity.maxHp));
      ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
      ctx.fillRect(x - bw / 2 - 1, y - 54, bw + 2, 6);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(x - bw / 2, y - 53, bw * pct, 4);
    } else if (entity.kind === 'npc') {
      // Floating Golden Exclamation/Dialog Marker
      ctx.fillStyle = '#fbbf24';
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y - 68, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#451a03';
      ctx.font = '800 11px "Segoe UI", sans-serif';
      ctx.fillText('!', x, y - 64);
    }

    ctx.fillStyle = 'rgba(20, 26, 18, 0.72)';
    const w = ctx.measureText(entity.name).width + 10;
    ctx.fillRect(x - w / 2, y + 6, w, 15);
    ctx.fillStyle = entity.kind === 'player' ? '#fef08a' : entity.kind === 'npc' ? '#93c5fd' : '#fca5a5';
    ctx.fillText(entity.name, x, y + 17);
    ctx.restore();
  }
}
