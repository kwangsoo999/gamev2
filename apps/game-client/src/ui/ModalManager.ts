export interface ManagedModalEntry {
  id: string;
  backdrop: HTMLElement;
  onClose?: () => void;
  closeOnEsc?: boolean;
  closeOnBackdrop?: boolean;
}

interface InternalModalRecord extends ManagedModalEntry {
  previousFocus: HTMLElement | null;
}

const BASE_MODAL_Z_INDEX = 1000;
const Z_STEP = 10;

/**
 * Centralized Modal Stack Manager:
 * - Maintains single ordered stack of active modals
 * - Prevents duplicate entries and z-index occlusion by canvas / HUD
 * - Handles Escape (topmost modal ONLY, never opens Settings while closing another window)
 * - Guarantees hidden modals have pointer-events: none and aria-hidden="true"
 * - Restores focus back to previous element / #game-canvas when all modals close
 */
export class ModalManager {
  private stack: InternalModalRecord[] = [];
  private attachedKeyListener = false;
  private boundBackdrops = new WeakSet<HTMLElement>();
  public onOpenStateChange?: (anyOpen: boolean, topId: string | null) => void;

  constructor(autoAttachGlobalKeys = true) {
    if (autoAttachGlobalKeys && typeof window !== 'undefined') {
      this.attachGlobalKeyHandler();
    }
  }

  public attachGlobalKeyHandler() {
    if (this.attachedKeyListener || typeof window === 'undefined') return;
    this.attachedKeyListener = true;
    window.addEventListener(
      'keydown',
      (e: KeyboardEvent) => {
        if (e.key !== 'Escape') return;
        if (!this.hasOpenModal()) return;
        const closed = this.closeTop();
        if (closed) {
          e.preventDefault();
          e.stopPropagation();
          if (typeof e.stopImmediatePropagation === 'function') {
            e.stopImmediatePropagation();
          }
        }
      },
      { capture: true }
    );
  }

  public registerBackdrop(backdrop: HTMLElement, getEntry: () => { id: string; onRequestClose: () => void; closeOnBackdrop?: boolean }) {
    if (this.boundBackdrops.has(backdrop)) return;
    this.boundBackdrops.add(backdrop);
    backdrop.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const meta = getEntry();
      if (target === backdrop) {
        if (meta.closeOnBackdrop !== false) {
          e.stopPropagation();
          meta.onRequestClose();
        }
        return;
      }
      e.stopPropagation();
    });
  }

  public open(entry: ManagedModalEntry) {
    const existingIdx = this.stack.findIndex((item) => item.id === entry.id);
    let previousFocus: HTMLElement | null =
      typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;

    if (existingIdx >= 0) {
      previousFocus = this.stack[existingIdx].previousFocus;
      this.stack.splice(existingIdx, 1);
    }

    if (typeof document !== 'undefined' && entry.backdrop.parentElement !== document.body) {
      document.body.appendChild(entry.backdrop);
    }

    this.stack.push({
      ...entry,
      previousFocus,
    });

    this.refreshStackLayout();
    entry.backdrop.classList.remove('hidden');
    entry.backdrop.setAttribute('aria-hidden', 'false');
    entry.backdrop.style.pointerEvents = 'auto';

    const dialog = entry.backdrop.querySelector('[role="dialog"]') as HTMLElement | null;
    if (dialog) {
      if (!dialog.hasAttribute('tabindex')) dialog.setAttribute('tabindex', '-1');
      if (typeof dialog.focus === 'function') {
        try {
          dialog.focus({ preventScroll: true });
        } catch {
          // ignore focus restrictions in non-browser DOM mocks
        }
      }
    }

    this.onOpenStateChange?.(true, entry.id);
  }

  public close(id: string): boolean {
    const idx = this.stack.findIndex((item) => item.id === id);
    if (idx < 0) return false;
    const [removed] = this.stack.splice(idx, 1);

    removed.backdrop.classList.add('hidden');
    removed.backdrop.setAttribute('aria-hidden', 'true');
    removed.backdrop.style.pointerEvents = 'none';
    removed.backdrop.style.zIndex = '';

    try {
      removed.onClose?.();
    } catch {
      // ensure stack state stays clean even if callback throws
    }

    this.refreshStackLayout();

    if (this.stack.length === 0) {
      this.restoreGameFocus(removed.previousFocus);
      this.onOpenStateChange?.(false, null);
    } else {
      this.onOpenStateChange?.(true, this.stack[this.stack.length - 1].id);
    }
    return true;
  }

  public closeTop(): boolean {
    if (this.stack.length === 0) return false;
    const top = this.stack[this.stack.length - 1];
    if (top.closeOnEsc === false) return false;
    return this.close(top.id);
  }

  public closeAll() {
    const copy = [...this.stack].reverse();
    for (const entry of copy) {
      this.close(entry.id);
    }
  }

  public hasOpenModal(): boolean {
    return this.stack.length > 0;
  }

  public isOpen(id: string): boolean {
    return this.stack.some((item) => item.id === id);
  }

  public getTopModalId(): string | null {
    return this.stack.length > 0 ? this.stack[this.stack.length - 1].id : null;
  }

  public getOpenModalIds(): string[] {
    return this.stack.map((item) => item.id);
  }

  private refreshStackLayout() {
    this.stack.forEach((item, index) => {
      item.backdrop.style.zIndex = String(BASE_MODAL_Z_INDEX + index * Z_STEP);
    });
  }

  private restoreGameFocus(previousFocus: HTMLElement | null) {
    if (typeof document === 'undefined') return;
    if (previousFocus && document.contains(previousFocus) && previousFocus !== document.body) {
      try {
        previousFocus.focus({ preventScroll: true });
        return;
      } catch {
        // fallback to canvas
      }
    }
    const canvas = document.getElementById('game-canvas') as HTMLElement | null;
    if (canvas && typeof canvas.focus === 'function') {
      try {
        canvas.focus({ preventScroll: true });
      } catch {
        // ignore
      }
    }
  }
}

export const modalManager = new ModalManager(true);
