import type {
  EightDirection,
  PaperDollCompositeOptions,
} from '../engine/SpriteAssetManager.ts';
import {
  SpriteAssetManager,
  spriteAssetManager,
} from '../engine/SpriteAssetManager.ts';
import type { EquipSlotKey, InventoryItemDef } from '../engine/types';

export interface CharacterPreviewProps {
  gender: 'male' | 'female';
  jobId: string;
  level: number;
  playerName: string;
  equipment: Partial<Record<EquipSlotKey, InventoryItemDef>>;
  onGenderChange?: (gender: 'male' | 'female') => void;
  onJobPreviewChange?: (jobId: string) => void;
}

/**
 * CharacterPreview Component for Elysia no Densetsu.
 * Renders an interactive 8-directional animated Paper Doll character
 * with real-time equipment layering, rotation controls, zoom, and gender toggle.
 */
export class CharacterPreview {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationFrameId: number | null = null;

  private currentGender: 'male' | 'female' = 'male';
  private currentJobId = 'novice';
  private currentLevel = 1;
  private playerName = 'Lữ Khách';
  private equipment: Partial<Record<EquipSlotKey, InventoryItemDef>> = {};

  private currentDirectionIndex = 0; // index in DIRECTIONS_8
  private currentFrameIndex = 0;
  private lastFrameTime = 0;
  private zoomLevel = 1.0;
  private isDragging = false;
  private lastDragX = 0;

  private onGenderChangeCallback?: (gender: 'male' | 'female') => void;
  private onJobPreviewChangeCallback?: (jobId: string) => void;

  public static readonly JOB_OPTIONS: { id: string; name: string }[] = [
    { id: 'novice', name: 'Tân Thủ (Novice)' },
    { id: 'swordsman', name: 'Kiếm Khách (Swordsman)' },
    { id: 'warrior', name: 'Chiến Binh (Warrior)' },
    { id: 'paladin', name: 'Thánh Kỵ Sĩ (Paladin)' },
    { id: 'mage', name: 'Pháp Sư (Mage)' },
    { id: 'priest', name: 'Mục Sư (Priest)' },
    { id: 'assassin', name: 'Thích Khách (Assassin)' },
    { id: 'archer', name: 'Cung Thủ (Archer)' },
    { id: 'lancer', name: 'Thương Thủ (Lancer)' },
  ];

  constructor(props?: Partial<CharacterPreviewProps>) {
    this.container = document.createElement('div');
    this.container.className = 'tk-character-preview-wrapper';

    this.canvas = document.createElement('canvas');
    this.canvas.width = 240;
    this.canvas.height = 280;
    this.canvas.className = 'tk-character-preview-canvas';
    this.ctx = this.canvas.getContext('2d')!;

    if (props) {
      if (props.gender) this.currentGender = props.gender;
      if (props.jobId) this.currentJobId = props.jobId;
      if (props.level) this.currentLevel = props.level;
      if (props.playerName) this.playerName = props.playerName;
      if (props.equipment) this.equipment = props.equipment;
      this.onGenderChangeCallback = props.onGenderChange;
      this.onJobPreviewChangeCallback = props.onJobPreviewChange;
    }

    this.setupDOM();
    this.setupInteractions();
    void spriteAssetManager.preloadCommonAssets();
  }

  public getElement(): HTMLElement {
    return this.container;
  }

  private setupDOM() {
    this.container.innerHTML = `
      <div class="tk-preview-header">
        <span class="tk-preview-title" id="preview-player-title">Lv.${this.currentLevel} · ${this.getJobName(this.currentJobId)}</span>
        <div class="tk-preview-gender-toggle">
          <button type="button" class="tk-gender-btn ${this.currentGender === 'male' ? 'active' : ''}" data-gender="male" title="Nam">♂ Nam</button>
          <button type="button" class="tk-gender-btn ${this.currentGender === 'female' ? 'active' : ''}" data-gender="female" title="Nữ">♀ Nữ</button>
        </div>
      </div>

      <div class="tk-preview-stage">
        <div class="tk-preview-pedestal-glow"></div>
        <div class="tk-preview-canvas-holder"></div>
        <div class="tk-preview-compass" title="Xoay 8 hướng">
          <button type="button" class="tk-rotate-btn tk-rotate-left" id="btn-preview-rotate-left" title="Xoay Trái [◀]">◀</button>
          <span class="tk-direction-label" id="preview-direction-label">${this.getDirectionLabel()}</span>
          <button type="button" class="tk-rotate-btn tk-rotate-right" id="btn-preview-rotate-right" title="Xoay Phải [▶]">▶</button>
        </div>
      </div>

      <div class="tk-preview-toolbar">
        <div class="tk-zoom-group">
          <button type="button" class="tk-zoom-btn ${this.zoomLevel === 1.0 ? 'active' : ''}" data-zoom="1.0">1.0x</button>
          <button type="button" class="tk-zoom-btn ${this.zoomLevel === 1.25 ? 'active' : ''}" data-zoom="1.25">1.25x</button>
          <button type="button" class="tk-zoom-btn ${this.zoomLevel === 1.5 ? 'active' : ''}" data-zoom="1.5">1.5x</button>
        </div>
        <select class="tk-job-preview-select" id="preview-job-select" title="Xem trước trang phục nghề">
          ${CharacterPreview.JOB_OPTIONS.map(
            (j) => `<option value="${j.id}" ${j.id === this.currentJobId ? 'selected' : ''}>${j.name}</option>`
          ).join('')}
        </select>
      </div>
    `;

    const holder = this.container.querySelector('.tk-preview-canvas-holder') as HTMLElement;
    if (holder) {
      holder.appendChild(this.canvas);
    }
  }

  private setupInteractions() {
    // Rotation Buttons
    const btnLeft = this.container.querySelector('#btn-preview-rotate-left');
    btnLeft?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.rotateLeft();
    });

    const btnRight = this.container.querySelector('#btn-preview-rotate-right');
    btnRight?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.rotateRight();
    });

    // Drag to rotate on canvas
    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.lastDragX = e.clientX;
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', (e) => {
        if (!this.isDragging) return;
        const dx = e.clientX - this.lastDragX;
        if (Math.abs(dx) > 18) {
          if (dx > 0) this.rotateRight();
          else this.rotateLeft();
          this.lastDragX = e.clientX;
        }
      });

      window.addEventListener('mouseup', () => {
        this.isDragging = false;
      });
    }

    // Touch support for mobile
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.lastDragX = e.touches[0].clientX;
      }
    });

    this.canvas.addEventListener('touchmove', (e) => {
      if (!this.isDragging || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - this.lastDragX;
      if (Math.abs(dx) > 18) {
        if (dx > 0) this.rotateRight();
        else this.rotateLeft();
        this.lastDragX = e.touches[0].clientX;
      }
    });

    this.canvas.addEventListener('touchend', () => {
      this.isDragging = false;
    });

    // Zoom buttons
    this.container.querySelectorAll('[data-zoom]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const zoom = parseFloat(btn.getAttribute('data-zoom') || '1.0');
        this.setZoom(zoom);
      });
    });

    // Gender buttons
    this.container.querySelectorAll('[data-gender]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const g = btn.getAttribute('data-gender') as 'male' | 'female';
        this.setGender(g);
      });
    });

    // Job selector
    const jobSelect = this.container.querySelector('#preview-job-select') as HTMLSelectElement | null;
    jobSelect?.addEventListener('change', (e) => {
      e.stopPropagation();
      this.setJobId(jobSelect.value);
    });
  }

  public rotateLeft() {
    const total = SpriteAssetManager.DIRECTIONS_8.length;
    this.currentDirectionIndex = (this.currentDirectionIndex - 1 + total) % total;
    this.updateDirectionLabel();
  }

  public rotateRight() {
    const total = SpriteAssetManager.DIRECTIONS_8.length;
    this.currentDirectionIndex = (this.currentDirectionIndex + 1) % total;
    this.updateDirectionLabel();
  }

  public setZoom(zoom: number) {
    this.zoomLevel = zoom;
    this.container.querySelectorAll('[data-zoom]').forEach((b) => {
      b.classList.toggle('active', parseFloat(b.getAttribute('data-zoom') || '1') === zoom);
    });
  }

  public setGender(gender: 'male' | 'female') {
    if (this.currentGender === gender) return;
    this.currentGender = gender;
    this.container.querySelectorAll('[data-gender]').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-gender') === gender);
    });
    this.onGenderChangeCallback?.(gender);
  }

  public setJobId(jobId: string) {
    this.currentJobId = jobId;
    const title = this.container.querySelector('#preview-player-title');
    if (title) {
      title.textContent = `Lv.${this.currentLevel} · ${this.getJobName(jobId)}`;
    }
    const sel = this.container.querySelector('#preview-job-select') as HTMLSelectElement | null;
    if (sel && sel.value !== jobId) sel.value = jobId;
    this.onJobPreviewChangeCallback?.(jobId);
  }

  public updateData(props: Partial<CharacterPreviewProps>) {
    if (props.level !== undefined) this.currentLevel = props.level;
    if (props.jobId !== undefined) this.currentJobId = props.jobId;
    if (props.gender !== undefined) this.currentGender = props.gender;
    if (props.playerName !== undefined) this.playerName = props.playerName;
    if (props.equipment !== undefined) this.equipment = props.equipment;

    const title = this.container.querySelector('#preview-player-title');
    if (title) {
      title.textContent = `Lv.${this.currentLevel} · ${this.getJobName(this.currentJobId)}`;
    }
  }

  public startAnimation() {
    if (this.animationFrameId !== null) return;
    this.lastFrameTime = performance.now();

    const loop = (time: number) => {
      const dt = time - this.lastFrameTime;
      // Idle animation at ~8 FPS = 125ms per frame
      if (dt >= 125) {
        this.currentFrameIndex = (this.currentFrameIndex + 1) % 6;
        this.lastFrameTime = time;
      }

      this.render();
      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  public stopAnimation() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private render() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.ctx.clearRect(0, 0, w, h);

    const dir = SpriteAssetManager.DIRECTIONS_8[this.currentDirectionIndex];

    const options: PaperDollCompositeOptions = {
      gender: this.currentGender,
      jobId: this.currentJobId,
      animState: 'idle',
      direction: dir,
      frameIndex: this.currentFrameIndex,
      equipment: this.equipment,
      zoom: this.zoomLevel,
      scale: 2.2, // Crisp 2.2x pixel art magnification for portrait inspection
    };

    spriteAssetManager.renderPaperDoll(
      this.ctx,
      options,
      w * 0.5,
      h * 0.72,
      64,
      64
    );
  }

  private getJobName(jobId: string): string {
    const hit = CharacterPreview.JOB_OPTIONS.find((j) => j.id === jobId.toLowerCase());
    return hit ? hit.name.split(' ')[0] : 'Tân Thủ';
  }

  private getDirectionLabel(): string {
    const dir = SpriteAssetManager.DIRECTIONS_8[this.currentDirectionIndex];
    const labels: Record<EightDirection, string> = {
      south: 'Chính Nam [S]',
      south_west: 'Tây Nam [SW]',
      west: 'Chính Tây [W]',
      north_west: 'Tây Bắc [NW]',
      north: 'Chính Bắc [N]',
      north_east: 'Đông Bắc [NE]',
      east: 'Chính Đông [E]',
      south_east: 'Đông Nam [SE]',
    };
    return labels[dir] || dir;
  }

  private updateDirectionLabel() {
    const label = this.container.querySelector('#preview-direction-label');
    if (label) label.textContent = this.getDirectionLabel();
  }
}
