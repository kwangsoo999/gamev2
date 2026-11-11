import test from 'node:test';
import assert from 'node:assert/strict';
import { ModalManager } from '../src/ui/ModalManager.ts';

function createMockDom() {
  const windowListeners = new Map();
  const canvas = {
    id: 'game-canvas',
    focused: false,
    focus() {
      this.focused = true;
    },
  };
  const body = {
    children: [],
    appendChild(el) {
      if (!this.children.includes(el)) this.children.push(el);
      el.parentElement = this;
      return el;
    },
    contains(el) {
      return this.children.includes(el) || el === canvas;
    },
  };

  function makeElement(id) {
    const classes = new Set(['tk-modal-backdrop', 'hidden']);
    const attrs = new Map([['aria-hidden', 'true']]);
    const listeners = new Map();
    const dialog = {
      id: `${id}-dialog`,
      focused: false,
      hasAttribute: (k) => attrs.has(`dialog-${k}`),
      setAttribute: (k, v) => attrs.set(`dialog-${k}`, String(v)),
      focus: () => { dialog.focused = true; },
      closest: (sel) => (sel.includes('tk-window') ? dialog : null),
    };
    const el = {
      id,
      parentElement: null,
      style: { zIndex: '', pointerEvents: 'none' },
      classList: {
        add: (...c) => c.forEach((x) => classes.add(x)),
        remove: (...c) => c.forEach((x) => classes.delete(x)),
        contains: (c) => classes.has(c),
      },
      setAttribute: (k, v) => attrs.set(k, String(v)),
      getAttribute: (k) => attrs.get(k) ?? null,
      querySelector: (sel) => (sel.includes('dialog') ? dialog : null),
      addEventListener: (ev, fn) => {
        if (!listeners.has(ev)) listeners.set(ev, []);
        listeners.get(ev).push(fn);
      },
      dispatch(ev, eventObj) {
        for (const fn of listeners.get(ev) || []) fn(eventObj);
      },
      dialog,
    };
    return el;
  }

  globalThis.document = {
    body,
    activeElement: canvas,
    getElementById: (id) => (id === 'game-canvas' ? canvas : null),
    contains: () => true,
  };
  globalThis.window = {
    addEventListener(ev, fn) {
      if (!windowListeners.has(ev)) windowListeners.set(ev, []);
      windowListeners.get(ev).push(fn);
    },
    dispatchKeydown(key) {
      let stopped = false;
      let prevented = false;
      const evt = {
        key,
        preventDefault() { prevented = true; },
        stopPropagation() { stopped = true; },
        stopImmediatePropagation() { stopped = true; },
      };
      for (const fn of windowListeners.get('keydown') || []) {
        if (stopped) break;
        fn(evt);
      }
      return { prevented, stopped };
    },
  };

  return { makeElement, canvas };
}

test('ModalManager: Stack Priority, Dedupe, ESC Closes Top Only, Backdrop vs Inner Click & Zero Mouse Blockers', () => {
  const { makeElement, canvas } = createMockDom();
  const manager = new ModalManager(true);

  const settingsEl = makeElement('modal-settings');
  const baloEl = makeElement('modal-balo-equip');
  const worldEl = makeElement('modal-world-panels');

  let settingsOpenedCount = 0;
  let baloClosedCount = 0;
  let worldClosedCount = 0;

  // Bind backdrops once
  manager.registerBackdrop(baloEl, () => ({ id: 'balo-equip', onRequestClose: () => manager.close('balo-equip'), closeOnBackdrop: true }));
  manager.registerBackdrop(worldEl, () => ({ id: 'world-panels', onRequestClose: () => manager.close('world-panels'), closeOnBackdrop: true }));

  // 1. Open Balo & verify z-index, visible, pointer-events auto, aria-hidden false
  manager.open({ id: 'balo-equip', backdrop: baloEl, onClose: () => { baloClosedCount++; } });
  assert.equal(manager.hasOpenModal(), true);
  assert.equal(manager.getTopModalId(), 'balo-equip');
  assert.equal(baloEl.classList.contains('hidden'), false);
  assert.equal(baloEl.style.pointerEvents, 'auto');
  assert.equal(baloEl.style.zIndex, '1000');

  // 2. Duplicate open keeps single stack entry
  manager.open({ id: 'balo-equip', backdrop: baloEl, onClose: () => { baloClosedCount++; } });
  assert.deepEqual(manager.getOpenModalIds(), ['balo-equip']);

  // 3. Stack WorldMap on top -> higher z-index (1010 > 1000)
  manager.open({ id: 'world-panels', backdrop: worldEl, onClose: () => { worldClosedCount++; } });
  assert.deepEqual(manager.getOpenModalIds(), ['balo-equip', 'world-panels']);
  assert.equal(Number(worldEl.style.zIndex) > Number(baloEl.style.zIndex), true);

  // 4. Inner click inside World dialog does NOT trigger backdrop close and calls stopPropagation
  let innerStopped = false;
  worldEl.dispatch('click', {
    target: worldEl.dialog,
    stopPropagation() { innerStopped = true; },
  });
  assert.equal(innerStopped, true);
  assert.equal(manager.isOpen('world-panels'), true);

  // 5. Escape closes ONLY topmost modal (world-panels), does NOT close balo-equip or open settings
  canvas.focused = false;
  globalThis.window.dispatchKeydown('Escape');
  assert.equal(worldClosedCount, 1);
  assert.equal(manager.getTopModalId(), 'balo-equip');
  assert.equal(worldEl.classList.contains('hidden'), true);
  assert.equal(worldEl.style.pointerEvents, 'none');
  assert.equal(worldEl.getAttribute('aria-hidden'), 'true');
  assert.equal(settingsOpenedCount, 0);

  // 6. Backdrop click outside window closes balo-equip and restores canvas focus
  baloEl.dispatch('click', {
    target: baloEl,
    stopPropagation() {},
  });
  assert.equal(baloClosedCount, 1);
  assert.equal(manager.hasOpenModal(), false);
  assert.equal(baloEl.classList.contains('hidden'), true);
  assert.equal(baloEl.style.pointerEvents, 'none');
  assert.equal(canvas.focused, true);

  // 7. Subsequent Escape when stack empty does NOT auto-open Settings
  const afterEsc = globalThis.window.dispatchKeydown('Escape');
  assert.equal(afterEsc.prevented, false);
  assert.equal(settingsEl.classList.contains('hidden'), true);
});
