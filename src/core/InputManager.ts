/** Unified pointer input (mouse + touch) for the game canvas. */
export class InputManager {
  x = 0;
  y = 0;
  down = false;
  hover = false;
  justPressed = false;
  touch = false;
  private pid: number | null = null;
  onFirstGesture: (() => void) | null = null;

  constructor(private el: HTMLElement) {
    el.addEventListener('pointerdown', (e) => {
      if (this.pid !== null && this.pid !== e.pointerId) return;
      this.pid = e.pointerId;
      this.touch = e.pointerType !== 'mouse';
      this.set(e);
      this.down = true;
      this.justPressed = true;
      this.hover = true;
      el.setPointerCapture?.(e.pointerId);
      this.onFirstGesture?.();
      e.preventDefault();
    });
    el.addEventListener('pointermove', (e) => {
      if (this.pid !== null && e.pointerId !== this.pid) return;
      this.set(e);
      this.hover = true;
      this.touch = e.pointerType !== 'mouse';
    });
    const up = (e: PointerEvent) => {
      if (e.pointerId !== this.pid) return;
      this.pid = null;
      this.down = false;
      if (this.touch) this.hover = false;
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', () => { if (!this.down) this.hover = false; });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('blur', () => { this.down = false; this.pid = null; });
  }

  private set(e: PointerEvent) {
    const r = this.el.getBoundingClientRect();
    this.x = e.clientX - r.left;
    this.y = e.clientY - r.top;
  }

  consumePress() { const p = this.justPressed; this.justPressed = false; return p; }
}
