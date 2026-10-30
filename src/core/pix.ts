import { hex, tone, type RGB } from './util';

/**
 * Tiny pixel painter used to author the scenes in code. Every pixel also carries a
 * mask bit: 1 = part of the object that can get dirty, 0 = backdrop.
 */
export class Pix {
  data: Uint8ClampedArray;
  mask: Uint8Array;
  constructor(public w: number, public h: number) {
    this.data = new Uint8ClampedArray(w * h * 4);
    this.mask = new Uint8Array(w * h);
  }

  px(x: number, y: number, c: RGB | string, m = -1) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const col = typeof c === 'string' ? hex(c) : c;
    const i = (y * this.w + x) * 4;
    this.data[i] = col[0]; this.data[i + 1] = col[1]; this.data[i + 2] = col[2]; this.data[i + 3] = 255;
    if (m >= 0) this.mask[y * this.w + x] = m;
  }

  rect(x: number, y: number, w: number, h: number, c: RGB | string, m = -1) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c, m);
  }

  /** shaded block: light top-left edge, dark bottom-right edge, outline */
  box(x: number, y: number, w: number, h: number, c: string, m = -1, outline = true) {
    const b = hex(c);
    this.rect(x, y, w, h, b, m);
    this.rect(x, y, w, 1, tone(b, 0.25), m);
    this.rect(x, y, 1, h, tone(b, 0.15), m);
    this.rect(x, y + h - 1, w, 1, tone(b, -0.3), m);
    this.rect(x + w - 1, y, 1, h, tone(b, -0.2), m);
    if (outline) this.frame(x - 1, y - 1, w + 2, h + 2, tone(b, -0.6));
  }

  frame(x: number, y: number, w: number, h: number, c: RGB | string, m = -1) {
    this.rect(x, y, w, 1, c, m); this.rect(x, y + h - 1, w, 1, c, m);
    this.rect(x, y, 1, h, c, m); this.rect(x + w - 1, y, 1, h, c, m);
  }

  circle(cx: number, cy: number, r: number, c: RGB | string, m = -1) {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) this.px(cx + x, cy + y, c, m);
  }

  ring(cx: number, cy: number, r: number, c: RGB | string, m = -1) {
    for (let a = 0; a < 6.283; a += 0.5 / r) this.px(cx + Math.cos(a) * r, cy + Math.sin(a) * r, c, m);
  }

  line(x0: number, y0: number, x1: number, y1: number, c: RGB | string, m = -1) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) this.px(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c, m);
  }

  /** checker dither between two colors */
  dither(x: number, y: number, w: number, h: number, a: string, b: string, m = -1) {
    const A = hex(a), B = hex(b);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, (i + j) % 2 ? A : B, m);
  }

  /** vertical gradient, banded like pixel art */
  grad(x: number, y: number, w: number, h: number, top: string, bottom: string, m = -1) {
    const A = hex(top), B = hex(bottom);
    for (let j = 0; j < h; j++) {
      const t = Math.round((j / Math.max(1, h - 1)) * 5) / 5;
      this.rect(x, y + j, w, 1, [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t], m);
    }
  }

  /** stamp a small sprite from strings; '.' = transparent, other chars index the palette */
  sprite(x: number, y: number, rows: string[], pal: Record<string, string>, m = -1) {
    rows.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== '.' && pal[ch]) this.px(x + i, y + j, pal[ch], m); }));
  }
}
