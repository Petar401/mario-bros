// Keyboard + touch input, merged into one per-frame state.
const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowDown: 'down', KeyS: 'down',
  ArrowUp: 'jump,up', KeyW: 'jump,up',
  KeyZ: 'jump', Space: 'jump', KeyK: 'jump',
  KeyX: 'run', ShiftLeft: 'run', ShiftRight: 'run', KeyJ: 'run',
  Enter: 'start', KeyP: 'start', Escape: 'start',
  KeyM: 'mute',
};
const ACTIONS = ['left', 'right', 'up', 'down', 'jump', 'run', 'start', 'mute', 'tap'];

export class Input {
  constructor() {
    this.kb = new Set();
    this.touch = new Set();
    this.taps = new Set();
    this.prev = {};
    this.pressed = {};
    for (const a of ACTIONS) { this[a] = false; this.pressed[a] = false; }
    this.onGesture = null;
  }

  attach() {
    window.addEventListener('keydown', (e) => {
      if (this.onGesture) this.onGesture();
      const a = KEYMAP[e.code];
      if (!a) return;
      e.preventDefault();
      for (const k of a.split(',')) {
        if (!e.repeat) this.taps.add(k);
        this.kb.add(k);
      }
    });
    window.addEventListener('keyup', (e) => {
      const a = KEYMAP[e.code];
      if (a) { for (const k of a.split(',')) this.kb.delete(k); e.preventDefault(); }
    });
    window.addEventListener('blur', () => { this.kb.clear(); this.touch.clear(); });
  }

  // On-screen controls. Every active pointer maps to the control under it, so
  // sliding a thumb from B to A (or around the D-pad) works.
  attachTouch(root) {
    const pointers = new Map();
    const dpad = root.querySelector('#dpad');
    const actionsAt = (x, y) => {
      const acts = new Set();
      const el = document.elementFromPoint(x, y);
      if (!el) return acts;
      const btn = el.closest('[data-k]');
      if (btn) { for (const k of btn.dataset.k.split(',')) acts.add(k); return acts; }
      if (el.closest('#dpad')) {
        const r = dpad.getBoundingClientRect();
        const dx = x - (r.left + r.width / 2), dy = y - (r.top + r.height / 2);
        const dz = r.width * 0.14;
        if (dx < -dz) acts.add('left');
        if (dx > dz) acts.add('right');
        if (dy > dz && Math.abs(dy) > Math.abs(dx) * 0.55) acts.add('down');
        if (dy < -dz && Math.abs(dy) > Math.abs(dx) * 0.55) acts.add('up');
        return acts;
      }
      acts.add('tap');
      return acts;
    };
    const refresh = () => {
      const all = new Set();
      for (const s of pointers.values()) for (const a of s) all.add(a);
      for (const a of all) if (!this.touch.has(a)) this.taps.add(a);
      this.touch = all;
      for (const b of root.querySelectorAll('[data-k]')) b.classList.toggle('on', b.dataset.k.split(',').some(k => all.has(k)));
      for (const d of ['left', 'right', 'up', 'down']) dpad.classList.toggle('on-' + d, all.has(d));
    };
    const down = (e) => {
      if (this.onGesture) this.onGesture();
      e.preventDefault();
      pointers.set(e.pointerId, actionsAt(e.clientX, e.clientY));
      refresh();
    };
    const move = (e) => {
      if (!pointers.has(e.pointerId)) return;
      e.preventDefault();
      pointers.set(e.pointerId, actionsAt(e.clientX, e.clientY));
      refresh();
    };
    const up = (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);
      refresh();
    };
    root.addEventListener('pointerdown', down, { passive: false });
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    root.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // call once per fixed update step
  poll() {
    for (const a of ACTIONS) {
      const held = this.kb.has(a) || this.touch.has(a);
      this.pressed[a] = (held && !this.prev[a]) || this.taps.has(a);
      this[a] = held || this.taps.has(a);
      this.prev[a] = held;
    }
    this.taps.clear();
  }
}
