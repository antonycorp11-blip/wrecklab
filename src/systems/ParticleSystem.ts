import { rand } from '../core/util';

export enum PK { Spark, Chip, Dust, Shard, Ring, Glow }

interface Debris {
  pts: number[]; x: number; y: number; vx: number; vy: number; rot: number; vr: number;
  fill: string; open: boolean; width: number; life: number; ext: number;
}
interface FloatText { text: string; x: number; y: number; vy: number; life: number; max: number; color: string; size: number }

/** Pooled particle storage (structure of arrays) + debris polygons + floating texts. */
export class ParticleSystem {
  readonly cap: number;
  n = 0;
  private x: Float32Array; private y: Float32Array; private vx: Float32Array; private vy: Float32Array;
  private life: Float32Array; private max: Float32Array; private size: Float32Array; private kind: Uint8Array;
  private color: string[];
  debris: Debris[] = [];
  texts: FloatText[] = [];
  /** 0..1 global multiplier for spawn counts (lowered on slow devices) */
  quality = 1;

  constructor(cap = 1600) {
    this.cap = cap;
    this.x = new Float32Array(cap); this.y = new Float32Array(cap); this.vx = new Float32Array(cap); this.vy = new Float32Array(cap);
    this.life = new Float32Array(cap); this.max = new Float32Array(cap); this.size = new Float32Array(cap); this.kind = new Uint8Array(cap);
    this.color = new Array(cap).fill('#fff');
  }

  spawn(kind: PK, x: number, y: number, vx: number, vy: number, life: number, size: number, color: string) {
    if (this.n >= this.cap) return;
    const i = this.n++;
    this.x[i] = x; this.y[i] = y; this.vx[i] = vx; this.vy[i] = vy; this.life[i] = life; this.max[i] = life;
    this.size[i] = size; this.kind[i] = kind; this.color[i] = color;
  }

  burst(kind: PK, x: number, y: number, count: number, speed: number, color: string, size = 3, life = 0.6, up = 0) {
    const c = Math.ceil(count * this.quality);
    for (let k = 0; k < c; k++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * rand(0.3, 1);
      this.spawn(kind, x, y, Math.cos(a) * s, Math.sin(a) * s - up, life * rand(0.6, 1.2), size * rand(0.6, 1.3), color);
    }
  }

  ring(x: number, y: number, r: number, color: string, life = 0.35) { this.spawn(PK.Ring, x, y, r, 0, life, 3, color); }

  addDebris(pts: number[], x: number, y: number, vx: number, vy: number, fill: string, open = false, width = 2) {
    if (this.debris.length > 70) this.debris.shift();
    let ext = 0;
    for (let i = 0; i < pts.length; i += 2) ext = Math.max(ext, Math.hypot(pts[i], pts[i + 1]));
    this.debris.push({ pts, x, y, vx, vy, rot: 0, vr: rand(-6, 6), fill, open, width, life: 1, ext });
  }

  text(text: string, x: number, y: number, color = '#fff', size = 18, life = 0.9) {
    if (this.texts.length > 40) this.texts.shift();
    this.texts.push({ text, x, y, vy: -60, life, max: life, color, size });
  }

  /** Push all resting debris along the conveyor. */
  sweep(vx: number) { for (const d of this.debris) { d.vx = vx; d.life = Math.min(d.life, 0.9); } }

  update(dt: number, floorY: number, width: number) {
    let j = 0;
    for (let i = 0; i < this.n; i++) {
      const l = this.life[i] - dt;
      if (l <= 0) continue;
      const k = this.kind[i];
      let vx = this.vx[i], vy = this.vy[i];
      if (k === PK.Spark || k === PK.Chip || k === PK.Shard) vy += 1300 * dt;
      else if (k === PK.Dust) { vx *= 0.94; vy = vy * 0.94 - 20 * dt; }
      let x = this.x[i] + (k === PK.Ring ? 0 : vx * dt), y = this.y[i] + (k === PK.Ring ? 0 : vy * dt);
      if (y > floorY && (k === PK.Chip || k === PK.Shard)) { y = floorY; vy *= -0.3; vx *= 0.6; }
      this.x[j] = x; this.y[j] = y; this.vx[j] = vx; this.vy[j] = vy; this.life[j] = l; this.max[j] = this.max[i];
      this.size[j] = this.size[i]; this.kind[j] = k; this.color[j] = this.color[i];
      j++;
    }
    this.n = j;
    for (const d of this.debris) {
      d.vy += 1500 * dt;
      d.x += d.vx * dt; d.y += d.vy * dt; d.rot += d.vr * dt;
      const floor = floorY - d.ext * 0.45;
      if (d.y > floor) { d.y = floor; d.vy *= -0.3; d.vx *= 0.75; d.vr *= 0.6; if (Math.abs(d.vy) < 40) d.vy = 0; }
      if (d.life < 1) d.life -= dt * 0.9;
    }
    this.debris = this.debris.filter((d) => d.life > 0 && d.x < width + 300);
    for (const t of this.texts) { t.y += t.vy * dt; t.vy *= 0.95; t.life -= dt; }
    this.texts = this.texts.filter((t) => t.life > 0);
  }

  drawDebris(ctx: CanvasRenderingContext2D) {
    for (const d of this.debris) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, d.life * 1.5));
      ctx.translate(d.x, d.y); ctx.rotate(d.rot);
      ctx.beginPath();
      for (let i = 0; i < d.pts.length; i += 2) i ? ctx.lineTo(d.pts[i], d.pts[i + 1]) : ctx.moveTo(d.pts[i], d.pts[i + 1]);
      if (d.open) { ctx.strokeStyle = d.fill; ctx.lineWidth = d.width; ctx.lineCap = 'round'; ctx.stroke(); }
      else { ctx.closePath(); ctx.fillStyle = d.fill; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 1.5; ctx.stroke(); }
      ctx.restore();
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (let i = 0; i < this.n; i++) {
      const t = this.life[i] / this.max[i];
      const x = this.x[i], y = this.y[i], s = this.size[i];
      ctx.globalAlpha = Math.min(1, t * 1.6);
      switch (this.kind[i]) {
        case PK.Spark:
          ctx.strokeStyle = this.color[i]; ctx.lineWidth = s * 0.6;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - this.vx[i] * 0.025, y - this.vy[i] * 0.025); ctx.stroke();
          break;
        case PK.Chip:
          ctx.fillStyle = this.color[i]; ctx.fillRect(x - s / 2, y - s / 2, s, s * 0.7);
          break;
        case PK.Shard:
          ctx.fillStyle = this.color[i];
          ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.7, y + s * 0.5); ctx.lineTo(x - s * 0.6, y + s * 0.3); ctx.fill();
          break;
        case PK.Dust: {
          const r = s * (1.6 - t);
          ctx.globalAlpha = t * 0.35; ctx.fillStyle = this.color[i];
          ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
          break;
        }
        case PK.Ring: {
          const r = this.vx[i] * (1 - t * t);
          ctx.globalAlpha = t * 0.8; ctx.strokeStyle = this.color[i]; ctx.lineWidth = 2 + 4 * t;
          ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.stroke();
          break;
        }
        case PK.Glow:
          ctx.globalAlpha = t * 0.8; ctx.fillStyle = this.color[i];
          ctx.beginPath(); ctx.arc(x, y, s * t, 0, 6.283); ctx.fill();
          break;
      }
    }
    ctx.globalAlpha = 1;
  }

  drawTexts(ctx: CanvasRenderingContext2D) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of this.texts) {
      const a = Math.min(1, (t.life / t.max) * 2);
      const pop = 1 + Math.max(0, (t.life / t.max - 0.8)) * 2;
      ctx.globalAlpha = a;
      ctx.font = `900 ${Math.round(t.size * pop)}px system-ui, sans-serif`;
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color; ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }

  clearAll() { this.n = 0; this.debris = []; this.texts = []; }
}
