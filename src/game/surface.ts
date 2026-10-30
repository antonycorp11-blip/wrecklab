import { Pix } from '../core/pix';
import { clamp, fbm, hex, mix, rng, type RGB } from '../core/util';
import { GUNKS, type GunkId } from '../data/gunk';
import { ART_H, ART_W, type FindDef, type PlaceDef } from '../data/places';
import { FIND_SPRITES } from '../data/finds';

export interface ScrapeOpts {
  tough: number;
  vs: Partial<Record<GunkId, number>>;
  scrubMult: number;
  heat: number;
  fast: boolean;
  calm: number;
  sweep: number;
  lucky: number;
}

export interface Find { def: FindDef; idx: number; cells: number[]; hp0: number; had: boolean; revealed: boolean }

const GCOL: RGB[][] = GUNKS.map((g) => g.colors.map(hex));
const hash = (s: string) => [...s].reduce((a, c) => (Math.imul(a, 31) + c.charCodeAt(0)) | 0, 7);

/**
 * The thing being cleaned: a pixel-art picture under a grid of dirt cells.
 * Rebuilt from the same seed at the start of every shift, so each place is learnable.
 */
export class Surface {
  readonly w = ART_W;
  readonly h = ART_H;
  base: Uint8ClampedArray;
  mask: Uint8Array;
  type: Int8Array;
  hp: Float32Array;
  hp0: Float32Array;
  shade: Uint8Array;
  flash: Float32Array;
  idle: Float32Array;
  total = 0;
  left = 0;
  finds: Find[] = [];
  img: ImageData;
  private limo: number[] = [];

  constructor(public place: PlaceDef, had: boolean[]) {
    const n = this.w * this.h;
    const p = new Pix(this.w, this.h);
    place.paint(p);
    place.finds.forEach((f, i) => {
      if (had[i]) return;
      const s = FIND_SPRITES[f.sprite];
      p.sprite(f.x, f.y, s.rows, s.pal, 1);
    });
    this.base = p.data;
    this.mask = p.mask;
    this.type = new Int8Array(n).fill(-1);
    this.hp = new Float32Array(n);
    this.hp0 = new Float32Array(n);
    this.shade = new Uint8Array(n);
    this.flash = new Float32Array(n);
    this.idle = new Float32Array(n);
    this.img = new ImageData(this.w, this.h);
    this.generate();
    place.finds.forEach((def, idx) => {
      const cells: number[] = [];
      let hp0 = 0;
      for (let y = def.y; y < def.y + 6; y++) for (let x = def.x; x < def.x + 6; x++) {
        const i = y * this.w + x;
        if (x < this.w && y < this.h && this.mask[i]) { cells.push(i); hp0 += this.hp[i]; }
      }
      this.finds.push({ def, idx, cells, hp0, had: had[idx], revealed: had[idx] });
    });
  }

  private generate() {
    const seed = hash(this.place.id);
    const R = rng(seed);
    const layers = this.place.gunk;
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const i = y * this.w + x;
      if (!this.mask[i]) continue;
      let best = -1, bestV = 0, bestP = -1;
      layers.forEach((L, li) => {
        const n = fbm(x * (L.scale ?? 0.15), y * (L.scale ?? 0.15), seed + li * 31);
        // full-cover layers are the base coat; partial layers sit on top where they appear
        const v = L.cover >= 1 ? 0.25 + (1 - n) * 0.5 : L.cover - n;
        // dust is the base coat; every other gunk sits on top of it where it appears
        const pri = L.type === 'poeira' ? v * 0.5 : v + 0.3;
        if (v > 0 && pri > bestP) { best = li; bestV = v; bestP = pri; }
      });
      if (best < 0) {
        // keep finds hidden even where no layer reaches
        const near = this.place.finds.some((f) => x >= f.x - 1 && x < f.x + 7 && y >= f.y - 1 && y < f.y + 7);
        if (!near) continue;
        best = 0; bestV = 0.5;
      }
      const L = layers[best];
      const g = GUNKS.find((k) => k.id === L.type)!;
      const t = clamp(bestV / Math.max(0.2, Math.min(1, L.cover)), 0.15, 1);
      const thick = (L.thick[0] + (L.thick[1] - L.thick[0]) * t) * (0.8 + R() * 0.4);
      this.type[i] = g.idx;
      this.hp[i] = this.hp0[i] = thick * g.hp;
      this.shade[i] = R() < 0.5 ? 1 : R() < 0.5 ? 0 : 2;
      this.total += this.hp[i];
      if (g.id === 'limo') this.limo.push(i);
    }
    this.left = this.total;
  }

  clean() { return this.total ? clamp(1 - this.left / this.total, 0, 1) : 1; }

  /** dominant gunk under a point (for sound) */
  typeAt(x: number, y: number) {
    const i = Math.floor(y) * this.w + Math.floor(x);
    return i >= 0 && i < this.type.length && this.hp[i] > 0 ? this.type[i] : -1;
  }

  /** Rub a circle of the surface. Returns Pó value removed and cells cleared. */
  scrape(cx: number, cy: number, r: number, power: number, o: ScrapeOpts) {
    let value = 0, cleared = 0, removed = 0;
    const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(this.w - 1, Math.ceil(cx + r));
    const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(this.h - 1, Math.ceil(cy + r));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d > r) continue;
      const i = y * this.w + x;
      if (this.hp[i] <= 0) continue;
      const g = GUNKS[this.type[i]];
      const f = 1 - (d / r) * (d / r);
      let k = f * power * (o.vs[g.id] ?? 1);
      if (o.tough < g.tough) k *= 0.1;
      if (g.id === 'chiclete') k *= o.scrubMult > 1.08 ? o.scrubMult * o.scrubMult : 0.28;
      else if (g.id === 'gordura') k *= (0.3 + o.heat) * o.scrubMult;
      else k *= o.scrubMult;
      const dmg = Math.min(this.hp[i], k);
      this.hp[i] -= dmg;
      this.left -= dmg;
      removed += dmg;
      value += dmg * g.value;
      this.idle[i] = 0;
      // soot smears sideways when rubbed too fast
      if (g.id === 'fuligem' && o.fast && Math.random() < 0.3 * (1 - o.calm)) {
        const j = i + [1, -1, this.w, -this.w][Math.floor(Math.random() * 4)];
        if (j >= 0 && j < this.hp.length && this.mask[j] && (this.type[j] < 0 || GUNKS[this.type[j]].id === 'fuligem' || this.hp[j] <= 0)) {
          const back = dmg * 0.6;
          if (this.type[j] < 0) { this.type[j] = g.idx; this.shade[j] = 1; }
          if (this.hp[j] <= 0) this.type[j] = g.idx;
          this.hp[j] += back; this.hp0[j] = Math.max(this.hp0[j], this.hp[j]); this.left += back; this.total += Math.max(0, this.hp[j] - this.hp0[j]);
          value -= back * g.value;
        }
      }
      if (this.hp[i] <= 0.0001) {
        this.hp[i] = 0;
        this.flash[i] = 1;
        cleared++;
        if (o.lucky && Math.random() < o.lucky) value += this.hp0[i] * g.value;
        if (o.sweep > 0) for (const j of [i + 1, i - 1, i + this.w, i - this.w]) {
          if (j < 0 || j >= this.hp.length || this.hp[j] <= 0 || this.hp[j] > o.sweep * 3) continue;
          value += this.hp[j] * GUNKS[this.type[j]].value; this.left -= this.hp[j]; this.hp[j] = 0; this.flash[j] = 1; cleared++;
        }
      }
    }
    return { value: Math.max(0, value), cleared, removed };
  }

  update(dt: number) {
    for (let i = 0; i < this.flash.length; i++) if (this.flash[i] > 0) this.flash[i] = Math.max(0, this.flash[i] - dt * 2.5);
    // moss creeps back where you are not scrubbing
    for (const i of this.limo) {
      this.idle[i] += dt;
      if (this.idle[i] < 1.2 || this.hp[i] >= this.hp0[i]) continue;
      if (this.hp[i] <= 0) {
        const nb = [i + 1, i - 1, i + this.w, i - this.w].some((j) => j >= 0 && j < this.hp.length && this.hp[j] > 0 && GUNKS[this.type[j]]?.id === 'limo');
        if (!nb || Math.random() > dt * 2) continue;
      }
      const add = Math.min(this.hp0[i] - this.hp[i], this.hp0[i] * 0.12 * dt);
      this.hp[i] += add; this.left += add;
    }
  }

  /** newly uncovered finds */
  checkFinds(): Find[] {
    const out: Find[] = [];
    for (const f of this.finds) {
      if (f.revealed) continue;
      let left = 0;
      for (const i of f.cells) left += this.hp[i];
      if (left <= f.hp0 * 0.18) { f.revealed = true; out.push(f); }
    }
    return out;
  }

  composite(time: number, sense: boolean) {
    const d = this.img.data, b = this.base;
    for (let i = 0, n = this.w * this.h; i < n; i++) {
      const o = i * 4;
      let r = b[o], g = b[o + 1], bl = b[o + 2];
      const hp = this.hp[i];
      if (hp > 0) {
        const gk = GUNKS[this.type[i]];
        const vis = clamp(hp / (gk.hp * 0.9), 0, 1);
        const c = GCOL[gk.idx][this.shade[i]];
        const x = i % this.w, y = (i / this.w) | 0;
        if (vis > 0.55) {
          const e = hp / this.hp0[i] > 0.85 ? 0 : (x + y) % 3 === 0 ? -14 : 0;
          r = c[0] + e; g = c[1] + e; bl = c[2] + e;
        } else if (vis > 0.25 || (x + y) % 2 === 0) {
          const m = mix([r, g, bl], c, 0.35 + vis);
          r = m[0]; g = m[1]; bl = m[2];
        }
      }
      const fl = this.flash[i];
      if (fl > 0) { r += (255 - r) * fl * 0.7; g += (255 - g) * fl * 0.7; bl += (255 - bl) * fl * 0.7; }
      d[o] = r; d[o + 1] = g; d[o + 2] = bl; d[o + 3] = 255;
    }
    if (sense) for (const f of this.finds) {
      if (f.revealed) continue;
      const k = f.cells[Math.floor((time * 7 + f.idx * 5) % f.cells.length)];
      if (k === undefined) continue;
      const o = k * 4;
      d[o] = 255; d[o + 1] = 236; d[o + 2] = 140;
    }
  }
}
