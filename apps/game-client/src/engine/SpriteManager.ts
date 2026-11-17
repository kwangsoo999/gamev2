import { Entity } from '../entities/Entity';
import { ArtworkLibrary } from './ArtworkLibrary';
import { AnimState, EquipSlotKey, InventoryItemDef, SpriteRegistryDoc, SpriteSheetMeta } from './types';

const STATES: AnimState[] = ['idle', 'walk', 'run', 'attack', 'skill', 'hurt', 'death'];

/** Raster atlas renderer. There is deliberately no geometric character fallback. */
export class SpriteManager {
  private registry: Record<string, SpriteSheetMeta> = {};
  private equipment: Partial<Record<EquipSlotKey, InventoryItemDef>> = {};

  constructor(private readonly artwork: ArtworkLibrary) {}

  public loadRegistry(doc: SpriteRegistryDoc) {
    if (doc.schemaVersion !== '2.0.0') throw new Error('Sprite registry phải dùng schema artwork 2.0.0.');
    this.registry = doc.sheets;
    for (const [id, meta] of Object.entries(this.registry)) {
      const image = this.artwork.image(meta.assetId);
      for (const state of STATES) {
        const clip = meta.animations[state];
        if (!clip || clip.frames < 1 || clip.fps <= 0) throw new Error(`Thiếu animation ${id}/${state}`);
        for (const direction of ['south', 'west', 'east', 'north'] as const) {
          const column = meta.directionColumns[direction];
          if (column === undefined || (column + clip.frames) * meta.frameWidth > image.width ||
              (clip.row + 1) * meta.frameHeight > image.height) {
            throw new Error(`Atlas không chứa đủ khung hình ${id}/${state}/${direction}`);
          }
        }
      }
      for (const variants of Object.values(meta.equipmentLayers ?? {})) {
        for (const assetId of Object.values(variants ?? {})) {
          const layer = this.artwork.image(assetId);
          if (layer.width !== image.width || layer.height !== image.height) throw new Error(`Mismatched equipment atlas: ${assetId}`);
        }
      }
    }
  }

  public getMeta(spriteId: string): SpriteSheetMeta {
    const meta = this.registry[spriteId] || this.registry.player_adventurer;
    if (!meta) throw new Error(`Thiếu sprite thật cho ${spriteId}`);
    return meta;
  }

  private resolveEffectiveSpriteId(entity: Entity): string {
    if (entity.kind === 'player') {
      const p: any = entity;
      const cls = String(p.advancedJobId || p.classId || p.remoteClassId || '').toLowerCase();
      const jobMap: Record<string, string> = {
        warrior: 'job_warrior',
        fighter: 'job_warrior',
        berserker: 'job_warrior',
        martial_artist: 'job_warrior',
        swordsman: 'job_swordsman',
        sword_saint: 'job_swordsman',
        duelist: 'job_swordsman',
        mage: 'job_mage',
        elementalist: 'job_mage',
        arcanist: 'job_mage',
        assassin: 'job_assassin',
        shadowblade: 'job_assassin',
        phantom: 'job_assassin',
        archer: 'job_archer',
        sniper: 'job_archer',
        ranger: 'job_archer',
        monk: 'job_priest',
        priest: 'job_priest',
        saint: 'job_priest',
        exorcist: 'job_priest',
        knight: 'job_paladin',
        paladin: 'job_paladin',
        guardian: 'job_paladin',
        spearman: 'job_lancer',
        lancer: 'job_lancer',
        dragoon: 'job_lancer',
        warlancer: 'job_lancer',
      };
      const mapped = jobMap[cls];
      if (mapped && this.registry[mapped]) {
        return mapped;
      }
    }
    return this.registry[entity.spriteId] ? entity.spriteId : 'player_adventurer';
  }

  public setEquipment(equipment: Partial<Record<EquipSlotKey, InventoryItemDef>>) {
    this.equipment = equipment;
  }

  public getMissingEquipmentArtwork(): string[] {
    const layers = this.registry.player_adventurer?.equipmentLayers ?? {};
    return Object.entries(this.equipment)
      .filter(([slot, item]) => {
        if (!item) return false;
        const map =
          layers[slot as EquipSlotKey] ||
          (slot === 'head' ? layers.helm : undefined) ||
          (slot === 'cloak' ? layers.offhand : undefined);
        return !map?.[item.iconKey];
      })
      .map(([, item]) => item!.name);
  }

  public drawEntity(ctx: CanvasRenderingContext2D, entity: Entity, x: number, y: number, _timeMs: number) {
    const effectiveSpriteId = this.resolveEffectiveSpriteId(entity);
    const meta = this.getMeta(effectiveSpriteId);
    const clip = meta.animations[entity.state];
    const column = meta.directionColumns[entity.direction] + Math.min(entity.frameIndex, clip.frames - 1);
    const width = meta.drawHeight * meta.frameWidth / meta.frameHeight;
    const shadow = this.artwork.image(this.artwork.manifest.effects.shadow);
    ctx.save();
    const monCat = (entity as any).category;
    if (entity.kind === 'monster' && entity.alive && (entity.isBoss || monCat === 'ELITE' || monCat === 'MINI_BOSS')) {
      const pulse = 0.28 + Math.sin(Date.now() * 0.005) * 0.1;
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.beginPath();
      ctx.ellipse(x, y - 2, width * 0.34, 12, 0, 0, Math.PI * 2);
      ctx.fillStyle = entity.isBoss ? (monCat === 'MINI_BOSS' ? '#f97316' : '#ef4444') : '#c084fc';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = entity.isBoss ? '#fde047' : '#e9d5ff';
      ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = entity.state === 'death' ? 0.7 : 0.65;
    ctx.drawImage(shadow, x - width * .2, y - 5, width * .4, 13);
    ctx.globalAlpha = 1;
    const filters = [entity.visualFilter, entity.hitFlashMs > 0 ? 'brightness(1.65)' : ''].filter(Boolean);
    if (filters.length) ctx.filter = filters.join(' ');
    this.drawLayer(ctx, meta.assetId, meta, column, clip.row, x, y, width);
    if (entity.kind === 'player') {
      const equipMap =
        (entity as any).remoteEquipment ??
        (entity.id === 'player_main' ? this.equipment : undefined);
      if (equipMap) {
        for (const slot of ['boots', 'armor', 'gloves', 'head', 'shoulder', 'cloak', 'weapon'] as const) {
          const item = equipMap[slot];
          const map =
            meta.equipmentLayers?.[slot] ||
            (slot === 'head' ? meta.equipmentLayers?.helm : undefined) ||
            (slot === 'cloak' ? meta.equipmentLayers?.offhand : undefined);
          const layer = item && map?.[item.iconKey];
          if (layer) this.drawLayer(ctx, layer, meta, column, clip.row, x, y, width);
        }
      }
    }
    ctx.restore();
    this.drawOverlayLabels(ctx, entity, x, y, meta.drawHeight);
  }

  public drawMonsterOrEntity(ctx: CanvasRenderingContext2D, entity: Entity, x: number, y: number, timeMs: number) {
    if (entity.kind === 'monster') {
      const mon: any = entity;
      const rawId =
        mon.monsterId ||
        (mon.id ? String(mon.id).replace(/__x3_\d+$/, '').replace(/_\d+_\d+$/, '') : null);
      const fallbackBySheet: Record<string, string> = {
        monster_slime: 'MONSTER_GREEN_SLIME',
        monster_goblin: 'MONSTER_GOBLIN_SCOUT',
        monster_rabbit: 'mon_forest_rabbit',
        monster_wolf: 'mon_wild_wolf',
        monster_boar: 'mon_wild_boar',
        monster_bee: 'mon_giant_bee',
        boss_dark_dragon: 'BOSS_DARK_DRAGON_STARTER',
      };
      const resolvedId =
        rawId && this.artwork.has(`monsters/${rawId}`)
          ? rawId
          : fallbackBySheet[entity.spriteId] || rawId;
      const uniqueAssetId = resolvedId ? `monsters/${resolvedId}` : null;
      const uniqueImg = uniqueAssetId ? this.artwork.getOptional(uniqueAssetId) : undefined;
      if (uniqueImg && uniqueImg.complete && uniqueImg.naturalWidth > 0) {
        this.drawUniqueMonsterSprite(ctx, entity, uniqueImg, x, y, timeMs);
        return;
      }
    }
    this.drawEntity(ctx, entity, x, y, timeMs);
  }

  private drawUniqueMonsterSprite(
    ctx: CanvasRenderingContext2D,
    entity: Entity,
    img: HTMLImageElement,
    x: number,
    y: number,
    timeMs: number
  ) {
    const mon: any = entity;
    const isBoss = Boolean(entity.isBoss);
    const isElite = Boolean(mon.isElite || mon.isRandomElite || mon.category === 'ELITE');
    const baseSize = isBoss ? 104 : isElite ? 82 : 66;
    const scale = Number(mon.visualScale || 1);
    const drawH = Math.round(baseSize * Math.min(1.55, Math.max(0.85, scale * 0.92)));
    const drawW = drawH;

    // Ground Elite / Boss aura ring before sprite body
    if (entity.alive && (isBoss || isElite)) {
      ctx.save();
      const pulse = 0.72 + Math.sin(timeMs * 0.006) * 0.28;
      ctx.globalAlpha = 0.55 * pulse;
      ctx.strokeStyle = isBoss ? (mon.enraged ? '#ef4444' : '#a855f7') : '#f59e0b';
      ctx.lineWidth = isBoss ? 3 : 2.2;
      ctx.beginPath();
      ctx.ellipse(x, y - 4, drawW * 0.44, drawW * 0.2, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Drop shadow under monster feet
    if (this.artwork.has(this.artwork.manifest.effects.shadow)) {
      ctx.save();
      ctx.globalAlpha = entity.alive ? 0.48 : 0.2;
      ctx.drawImage(this.artwork.image(this.artwork.manifest.effects.shadow), x - drawW * 0.36, y - 9, drawW * 0.72, 16);
      ctx.restore();
    }

    // Procedural multi-state anime motion (idle breathe / walk hop / attack lunge / hurt flash / death fade)
    let offsetX = 0;
    let offsetY = 0;
    let scaleX = entity.direction === 'east' ? -1 : 1;
    let scaleY = 1;
    let rotRad = 0;
    let alpha = 1;

    if (!entity.alive || entity.state === 'death') {
      alpha = 0.28;
      scaleY = 0.38;
      offsetY = 6;
    } else if (entity.state === 'attack' || entity.state === 'skill') {
      const swing = Math.sin((entity.frameIndex + 1) * 1.1);
      offsetX = (entity.direction === 'west' ? -10 : 10) * Math.max(0, swing);
      offsetY = -Math.abs(swing) * 5;
      scaleX *= 1.08;
      scaleY = 0.95;
    } else if (entity.state === 'walk' || entity.state === 'run') {
      const hop = Math.abs(Math.sin(timeMs * 0.014));
      offsetY = -hop * 6;
      rotRad = Math.sin(timeMs * 0.014) * 0.06;
    } else {
      const breath = Math.sin(timeMs * 0.0045 + x * 0.01);
      scaleY = 1 + breath * 0.035;
      scaleX *= 1 - breath * 0.02;
    }

    if (entity.hitFlashMs > 0) {
      offsetX += (Math.random() - 0.5) * 4;
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x + offsetX, y + offsetY);
    if (rotRad !== 0) ctx.rotate(rotRad);
    ctx.scale(scaleX, scaleY);
    if (entity.hitFlashMs > 0) {
      ctx.filter = 'brightness(1.8) saturate(1.4)';
    } else if (mon.isRandomElite) {
      ctx.filter = 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.75))';
    }
    ctx.drawImage(img, -drawW * 0.5, -drawH * 0.92, drawW, drawH);
    ctx.restore();

    this.drawOverlayLabels(ctx, entity, x, y, drawH);
  }

  private drawLayer(ctx: CanvasRenderingContext2D, assetId: string, meta: SpriteSheetMeta,
    column: number, row: number, x: number, y: number, width: number) {
    ctx.drawImage(this.artwork.image(assetId), column * meta.frameWidth, row * meta.frameHeight,
      meta.frameWidth, meta.frameHeight, x - width * meta.anchorX,
      y - meta.drawHeight * meta.anchorY, width, meta.drawHeight);
  }

  private drawOverlayLabels(ctx: CanvasRenderingContext2D, entity: Entity, x: number, y: number, height: number) {
    ctx.save();
    const mon: any = entity;
    const isLocalPlayer = entity.kind === 'player' && entity.id === 'player_main';
    const isRemotePlayer = entity.kind === 'player' && entity.id !== 'player_main';
    const isElite = entity.kind === 'monster' && Boolean(mon.isElite || mon.isRandomElite || mon.category === 'ELITE');
    const isBoss = entity.kind === 'monster' && Boolean(entity.isBoss || entity.spriteId === 'boss_dark_dragon');

    if (entity.kind === 'monster' && entity.alive) {
      // 1. Monster Name & Level above sprite (e.g. "Báo Hoa Lv25" or "Slime Thảo Nguyên Lv.1")
      const monLabel = `${entity.name} Lv.${entity.level || 1}`;
      ctx.font = '700 11px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#000000';
      ctx.strokeText(monLabel, x, y - height - 12);
      ctx.fillStyle = isBoss ? '#f472b6' : isElite ? '#fbbf24' : '#fffdf0';
      ctx.fillText(monLabel, x, y - height - 12);

      // 2. Red Health Bar with dark border
      const barW = isBoss ? 68 : isElite ? 54 : 44;
      const barH = 5;
      const barY = y - height - 8;
      const ratio = Math.max(0, Math.min(1, entity.hp / Math.max(1, entity.maxHp)));
      ctx.fillStyle = '#0f172acc';
      ctx.fillRect(x - barW / 2 - 1, barY - 1, barW + 2, barH + 2);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.strokeRect(x - barW / 2 - 1, barY - 1, barW + 2, barH + 2);
      ctx.fillStyle = isBoss ? '#a855f7' : isElite ? '#f59e0b' : '#dc2626';
      ctx.fillRect(x - barW / 2, barY, barW * ratio, barH);

      // 3. Small circular elemental badge next to health bar (e.g. Thổ / Kim / Hỏa)
      const badgeX = x + barW / 2 + 7;
      const badgeY = barY + barH / 2;
      ctx.beginPath();
      ctx.arc(badgeX, badgeY, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = '#1e293b';
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.font = '700 7px sans-serif';
      ctx.fillStyle = '#fde047';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Thổ', badgeX, badgeY);

      if (isElite && !isBoss) {
        ctx.font = '800 9px "Segoe UI", sans-serif';
        const tag = mon.isRandomElite ? '★ TINH ANH HIẾM' : '★ TINH ANH';
        ctx.strokeText(tag, x, y - height - 26);
        ctx.fillStyle = '#fbbf24';
        ctx.fillText(tag, x, y - height - 26);
      }
    } else {
      ctx.font = '700 11px "Segoe UI", "DM Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(20, 34, 25, 0.85)';
      const displayName = isRemotePlayer ? `${entity.name} · Lv.${entity.level}` : entity.name;
      ctx.strokeText(displayName, x, y + 16);
      ctx.fillStyle = isLocalPlayer
        ? '#fff3bd'
        : isRemotePlayer
        ? '#7dd3fc'
        : entity.kind === 'npc'
        ? '#f5eed8'
        : '#ffd8c2';
      ctx.fillText(displayName, x, y + 16);

      if (isRemotePlayer) {
        const jobLabel = (entity as any).remoteJobLabel || 'Tân Thủ';
        ctx.font = '700 10px "Segoe UI", sans-serif';
        ctx.strokeText(`[${jobLabel}]`, x, y - height - 15);
        ctx.fillStyle = '#fde68a';
        ctx.fillText(`[${jobLabel}]`, x, y - height - 15);
        const barW = 44;
        const ratio = Math.max(0, Math.min(1, entity.hp / Math.max(1, entity.maxHp)));
        ctx.fillStyle = '#0f172add';
        ctx.fillRect(x - barW / 2, y - height - 9, barW, 5);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(x - barW / 2 + 1, y - height - 8, (barW - 2) * ratio, 3);
      } else if (isLocalPlayer && (entity as any).cosmeticTitleLabel) {
        const titleTag = `« ${(entity as any).cosmeticTitleLabel} »`;
        ctx.font = '700 10px "Segoe UI", sans-serif';
        ctx.strokeText(titleTag, x, y - height - 8);
        ctx.fillStyle = '#fde047';
        ctx.fillText(titleTag, x, y - height - 8);
      } else if (entity.kind === 'npc') {
        const marker: '!' | '?' | null | undefined = (entity as any).questMarker;
        if (marker === '?' || marker === '!') {
          ctx.font = '800 18px Georgia, serif';
          ctx.strokeText(marker, x, y - height - 5);
          ctx.fillStyle = marker === '?' ? '#4ade80' : '#ffe18c';
          ctx.fillText(marker, x, y - height - 5);
        }
      }
    }
    ctx.restore();
  }
}
