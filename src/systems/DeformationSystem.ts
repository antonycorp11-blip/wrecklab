import type { ObjectDef, PartSpec, MaterialDef } from '../core/types';
import { MATERIALS } from '../data/materials';
import { clamp, rand } from '../core/util';

/**
 * Hybrid deformation model:
 *  - every part is a densified polygon whose vertices carry plastic + elastic offsets (local dents, pinches)
 *  - a global compression field squashes height, bulges width and folds the surface (accordion creases)
 *  - press/vise/implosion constraints clamp vertices geometrically
 *  - brittle parts accumulate procedural cracks; parts detach or shatter at damage thresholds
 */
export interface RtPart {
  spec: PartSpec;
  mat: MaterialDef;
  n: number;
  rest: Float32Array;
  plas: Float32Array;
  elas: Float32Array;
  cur: Float32Array;
  detached: boolean;
  detachAt: number;
  cracks: number[][];
  bx0: number; bx1: number; by0: number; by1: number;
}

export type ImpactMode = 'dent' | 'pinch';

export class WreckObject {
  parts: RtPart[] = [];
  W = 1;
  H = 1;
  hp: number;
  maxHp: number;
  comp = 0;
  extraComp = 0;
  seed = Math.random() * 100;
  shake = 0;
  flash = 0;
  platenY = -1e9;
  viseL = -1e9;
  viseR = 1e9;
  implode = 0;
  rawTop = 0;
  rawLeft = 0;
  rawRight = 0;
  hits = 0;
  residual = 0;
  private maxOff = 1;
  private wrinkleFreq = 8;

  constructor(public def: ObjectDef, hpMult = 1) {
    this.maxHp = this.hp = def.hp * hpMult;
    const specs = def.build().slice().sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
    let x0 = 1e9, x1 = -1e9, y1 = 0;
    for (const s of specs) for (let i = 0; i < s.poly.length; i += 2) {
      x0 = Math.min(x0, s.poly[i]); x1 = Math.max(x1, s.poly[i]); y1 = Math.max(y1, s.poly[i + 1]);
    }
    this.W = x1 - x0;
    this.H = y1;
    const step = Math.max(this.W, this.H) / 46;
    this.maxOff = Math.max(this.W, this.H) * 0.26;
    this.wrinkleFreq = 6 + Math.random() * 5;
    for (const spec of specs) {
      const pts = densify(spec.poly, step, !spec.open);
      const n = pts.length / 2;
      const rest = new Float32Array(pts.length);
      let bx0 = 1e9, bx1 = -1e9, by0 = 1e9, by1 = -1e9;
      for (let i = 0; i < n; i++) {
        rest[i * 2] = pts[i * 2];
        rest[i * 2 + 1] = -pts[i * 2 + 1];
        bx0 = Math.min(bx0, rest[i * 2]); bx1 = Math.max(bx1, rest[i * 2]);
        by0 = Math.min(by0, rest[i * 2 + 1]); by1 = Math.max(by1, rest[i * 2 + 1]);
      }
      this.parts.push({
        spec, mat: MATERIALS[spec.mat], n, rest,
        plas: new Float32Array(pts.length), elas: new Float32Array(pts.length), cur: new Float32Array(pts.length),
        detached: false, detachAt: spec.detach !== undefined ? clamp(spec.detach + rand(-0.04, 0.04), 0.05, 0.97) : 2,
        cracks: [], bx0, bx1, by0, by1,
      });
    }
    this.computePositions();
  }

  get frac() { return clamp(1 - this.hp / this.maxHp, 0, 1); }

  /** Global compression transform applied to a rest-space point (without local offsets). */
  private xf(x: number, y: number, rx: number, crease: number, bulge: number, out: number[]) {
    const c = this.comp, H = this.H, W = this.W;
    const t = clamp(-y / H, 0, 1.2);
    let ny = y * (1 - c);
    let nx = x * (1 + c * bulge * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(t, 1))));
    nx += (Math.sin(t * this.wrinkleFreq * 3.1 + this.seed) * 0.035 + Math.sin(t * this.wrinkleFreq * 7.3 + this.seed * 2) * 0.014) * c * W * crease;
    ny += Math.sin((rx / W) * 11 + this.seed) * c * H * 0.025 * crease * (t > 0.02 ? 1 : 0);
    if (this.implode > 0) {
      const k = 1 - this.implode;
      const cy = -H * 0.5 * (1 - c);
      nx *= k;
      ny = cy + (ny - cy) * k;
      // swirl
      const sw = this.implode * 0.6 * (1 - Math.min(1, Math.hypot(nx, ny - cy) / (W * 0.6)));
      const s = Math.sin(sw), co = Math.cos(sw);
      const ox = nx, oy = ny - cy;
      nx = ox * co - oy * s; ny = cy + ox * s + oy * co;
      if (ny > 0) ny = 0;
    }
    out[0] = nx; out[1] = ny;
  }

  computePositions() {
    const out = [0, 0];
    let top = 0, left = 1e9, right = -1e9;
    for (const p of this.parts) {
      if (p.detached) continue;
      const { rest, plas, elas, cur, mat } = p;
      for (let i = 0; i < p.n; i++) {
        const ix = i * 2, iy = ix + 1;
        const x = rest[ix] + plas[ix] + elas[ix];
        const y = Math.min(0, rest[iy] + plas[iy] + elas[iy]);
        this.xf(x, y, rest[ix], mat.crease, mat.bulge, out);
        let nx = out[0], ny = out[1];
        if (ny < top) top = ny;
        if (nx < left) left = nx;
        if (nx > right) right = nx;
        if (ny < this.platenY) ny = this.platenY + Math.sin(nx * 0.3 + i) * 0.4;
        if (nx < this.viseL) nx = this.viseL;
        if (nx > this.viseR) nx = this.viseR;
        cur[ix] = nx; cur[iy] = ny;
      }
    }
    this.rawTop = top; this.rawLeft = left; this.rawRight = right;
  }

  /** Transform a crack point. */
  crackPoint(p: RtPart, x: number, y: number, out: number[]) {
    this.xf(x, y, x, p.mat.crease, p.mat.bulge, out);
    if (out[1] < this.platenY) out[1] = this.platenY;
    out[0] = clamp(out[0], this.viseL, this.viseR);
  }

  /** Convert a deformed-space local point to approximate rest space. */
  toRest(x: number, y: number): [number, number] {
    const c = this.comp;
    return [x / (1 + c * 0.4), y / Math.max(0.1, 1 - c)];
  }

  applyImpact(hx: number, hy: number, r: number, depth: number, mode: ImpactMode, dirX = 0, dirY = 1) {
    const r2 = r * r;
    const mo = this.maxOff;
    for (const p of this.parts) {
      if (p.detached) continue;
      const e = p.mat.elasticity;
      const { rest, plas, elas } = p;
      for (let i = 0; i < p.n; i++) {
        const ix = i * 2, iy = ix + 1;
        const dx = rest[ix] + plas[ix] - hx, dy = rest[iy] + plas[iy] - hy;
        const d2 = dx * dx + dy * dy;
        if (d2 >= r2) continue;
        const d = Math.sqrt(d2);
        let f = 1 - d / r;
        f *= f;
        let mx: number, my: number;
        if (mode === 'pinch') {
          const k = Math.min(0.45, depth / r) * f;
          mx = -dx * k; my = -dy * k + depth * 0.15 * f;
        } else {
          const nd = d > 0.001 ? 1 / d : 0;
          mx = dirX * depth * f + dx * nd * depth * f * 0.3;
          my = dirY * depth * f + dy * nd * depth * f * 0.3;
        }
        const jitter = 1 + Math.sin(i * 12.9898 + this.seed) * 0.25;
        mx *= jitter; my *= jitter;
        plas[ix] = clamp(plas[ix] + mx * (1 - e), -mo, mo);
        plas[iy] = clamp(plas[iy] + my * (1 - e), -mo, mo);
        elas[ix] += mx * e * 1.4;
        elas[iy] += my * e * 1.4;
      }
      if (p.mat.brittle > 0.3 && p.cracks.length < 14 && hx > p.bx0 - r * 0.3 && hx < p.bx1 + r * 0.3 && hy > p.by0 - r * 0.3 && hy < p.by1 + r * 0.3) {
        if (Math.random() < p.mat.brittle) this.addCrack(p, clamp(hx, p.bx0, p.bx1), clamp(hy, p.by0, p.by1), r);
      }
    }
  }

  private addCrack(p: RtPart, x: number, y: number, r: number) {
    const branches = 1 + Math.floor(Math.random() * 3);
    for (let b = 0; b < branches; b++) {
      const pts = [x, y];
      let a = Math.random() * Math.PI * 2, cx = x, cy = y;
      const segs = 3 + Math.floor(Math.random() * 4);
      for (let s = 0; s < segs; s++) {
        a += rand(-0.7, 0.7);
        cx = clamp(cx + Math.cos(a) * r * 0.22, p.bx0, p.bx1);
        cy = clamp(cy + Math.sin(a) * r * 0.22, p.by0, p.by1);
        pts.push(cx, cy);
      }
      p.cracks.push(pts);
    }
  }

  /** Returns parts that crossed their detach threshold. */
  checkDetach(force = 0): RtPart[] {
    const f = this.frac + force;
    const out: RtPart[] = [];
    for (const p of this.parts) if (!p.detached && f >= p.detachAt) { p.detached = true; out.push(p); }
    return out;
  }

  /** Force-detach the next attachable part (domino effect). */
  detachNext(): RtPart | null {
    let best: RtPart | null = null;
    for (const p of this.parts) if (!p.detached && p.detachAt <= 1 && (!best || p.detachAt < best.detachAt)) best = p;
    if (best) best.detached = true;
    return best;
  }

  update(dt: number, collapsing: boolean) {
    const target = collapsing ? this.def.maxCompress + 0.06 : this.def.maxCompress * Math.pow(this.frac, 0.8) + this.extraComp;
    this.comp += (Math.min(0.92, target) - this.comp) * Math.min(1, dt * (collapsing ? 14 : 9));
    this.extraComp *= Math.exp(-dt * 3);
    const decay = Math.exp(-dt * 7);
    for (const p of this.parts) {
      if (p.detached || p.mat.elasticity === 0) continue;
      const el = p.elas;
      for (let i = 0; i < el.length; i++) el[i] *= decay;
    }
    this.shake *= Math.exp(-dt * 18);
    this.flash *= Math.exp(-dt * 10);
    this.computePositions();
  }
}

function densify(poly: number[], step: number, closed: boolean): number[] {
  const out: number[] = [];
  const n = poly.length / 2;
  const edges = closed ? n : n - 1;
  for (let i = 0; i < edges; i++) {
    const x0 = poly[i * 2], y0 = poly[i * 2 + 1];
    const j = (i + 1) % n;
    const x1 = poly[j * 2], y1 = poly[j * 2 + 1];
    const segs = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / step));
    for (let s = 0; s < segs; s++) { const t = s / segs; out.push(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t); }
  }
  if (!closed) out.push(poly[(n - 1) * 2], poly[(n - 1) * 2 + 1]);
  return out;
}
