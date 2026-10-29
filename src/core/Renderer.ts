import type { GameEngine } from './GameEngine';
import type { WreckObject, RtPart } from '../systems/DeformationSystem';
import { shade } from './util';

/** Seeded RNG so the pixel-art backdrops are stable between rebuilds. */
function rng(seed: number) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }

/**
 * Pixel-art renderer: the world is drawn into a low-resolution buffer (1 art pixel = P css px)
 * and upscaled with nearest-neighbour. Damage numbers are drawn crisp on top.
 */
export class Renderer {
  ctx: CanvasRenderingContext2D;
  w = 0;
  h = 0;
  dpr = 1;
  /** css px per art pixel */
  P = 3;
  resized = true;
  private low = document.createElement('canvas');
  private l!: CanvasRenderingContext2D;
  private bg = document.createElement('canvas');
  private bgKey = '';
  private t = 0;
  private belt = 0;
  private touchT = 0;

  constructor(private canvas: HTMLCanvasElement, private e: GameEngine) {
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.l = this.low.getContext('2d', { alpha: false })!;
    window.addEventListener('resize', () => this.resize());
    window.visualViewport?.addEventListener('resize', () => this.resize());
    this.resize();
  }

  setQuality(dpr: number) { this.dpr = dpr; this.resize(); }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.w = Math.max(1, r.width);
    this.h = Math.max(1, r.height);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.P = Math.min(5, Math.max(2, Math.round(this.h / 170)));
    this.low.width = Math.ceil(this.w / this.P);
    this.low.height = Math.ceil(this.h / this.P);
    this.resized = true;
    this.bgKey = '';
  }

  render(dt: number) {
    const e = this.e, l = this.l, P = this.P;
    this.t += dt;
    if (e.phase === 'enter' || e.phase === 'clear') this.belt += dt * 600;
    if (e.input.down && e.input.touch) this.touchT = 0.6; else this.touchT -= dt;
    const stage = e.prog.stage();
    const key = `${stage}:${this.low.width}x${this.low.height}`;
    if (key !== this.bgKey) this.buildBackground(stage, key);
    e.particles.px = P;
    l.setTransform(1, 0, 0, 1, 0, 0);
    l.imageSmoothingEnabled = false;
    l.drawImage(this.bg, 0, 0);
    l.setTransform(1 / P, 0, 0, 1 / P, Math.round(e.cam.x / P), Math.round(e.cam.y / P));
    this.drawConveyor(stage);
    if (stage >= 5) this.drawLabFx();
    const o = e.obj;
    if (o) {
      this.drawShadow(o);
      this.drawMachineBack(o);
      this.drawObject(o);
    }
    e.particles.drawDebris(l);
    if (o) this.drawMachineFront(o);
    e.particles.draw(l);
    this.drawAuto();
    this.drawHandTool();
    // upscale
    const c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.imageSmoothingEnabled = false;
    c.drawImage(this.low, 0, 0, this.low.width, this.low.height, 0, 0, this.low.width * P * this.dpr, this.low.height * P * this.dpr);
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    e.particles.drawTexts(c);
  }

  // ------------------------------------------------------------ backdrop
  private buildBackground(stage: number, key: string) {
    this.bgKey = key;
    const P = this.P;
    this.bg.width = this.low.width; this.bg.height = this.low.height;
    const g = this.bg.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    g.setTransform(1 / P, 0, 0, 1 / P, 0, 0);
    const w = this.w, h = this.h;
    const floor = h - Math.max(66, h * 0.16);
    const R = rng(1234 + stage);
    const px = (x: number, y: number, ww: number, hh: number, c: string) => { g.fillStyle = c; g.fillRect(Math.round(x / P) * P, Math.round(y / P) * P, Math.max(P, Math.round(ww / P) * P), Math.max(P, Math.round(hh / P) * P)); };

    if (stage === 0) {
      // plank wall
      const pw = P * 12;
      for (let x = 0, i = 0; x < w; x += pw, i++) {
        const base = ['#4f3521', '#5a3c25', '#543823'][i % 3];
        px(x, 0, pw, floor, base);
        px(x, 0, P, floor, '#2e1d11');
        px(x + P, 0, P, floor, shade(base, 0.12));
        for (let k = 0; k < 3; k++) { const ky = R() * floor; px(x + pw * 0.3 + R() * pw * 0.3, ky, P * 3, P * 2, '#3a2616'); }
        for (let y = 0; y < floor; y += P * (6 + Math.floor(R() * 10))) px(x + P * 3 + R() * pw * 0.6, y, P, P * 4, shade(base, -0.15));
      }
      // pegboard
      const bx = w * 0.2, by = h * 0.1, bw = w * 0.6, bh = floor * 0.5;
      px(bx - P * 2, by - P * 2, bw + P * 4, bh + P * 4, '#3b2a18');
      px(bx, by, bw, bh, '#9a774c');
      px(bx, by, bw, P, '#b48e5f');
      for (let y = by + P * 4; y < by + bh - P * 2; y += P * 5) for (let x = bx + P * 4; x < bx + bw - P * 2; x += P * 5) px(x, y, P, P, '#5c4329');
      // hanging tools: wrench, saw, coil
      const tc = '#2b2b30', tl = '#6d7178';
      px(bx + bw * 0.1, by + bh * 0.15, P * 3, bh * 0.55, tc); px(bx + bw * 0.1 - P * 2, by + bh * 0.12, P * 7, P * 4, tc); px(bx + bw * 0.1, by + bh * 0.15, P, bh * 0.5, tl);
      px(bx + bw * 0.25, by + bh * 0.18, bw * 0.16, P * 8, '#8d9399'); px(bx + bw * 0.25, by + bh * 0.18 + P * 8, bw * 0.16, P * 2, '#5d6166');
      for (let x = bx + bw * 0.25; x < bx + bw * 0.41; x += P * 2) px(x, by + bh * 0.18 + P * 10, P, P, '#5d6166');
      px(bx + bw * 0.41, by + bh * 0.15, P * 7, P * 12, '#7a3b22');
      for (let k = 0; k < 4; k++) px(bx + bw * 0.62 + k * P * 3, by + bh * 0.2, P * 2, bh * 0.4, k % 2 ? '#c0392b' : '#a93226');
      px(bx + bw * 0.82, by + bh * 0.15, P * 10, P * 10, tc); px(bx + bw * 0.82 + P * 3, by + bh * 0.15 + P * 3, P * 4, P * 4, '#9a774c');
      // lamp + light cone (dithered)
      const lx = w * 0.5;
      px(lx - P / 2, 0, P, h * 0.05, '#1c1c1c');
      px(lx - P * 6, h * 0.05, P * 12, P * 4, '#d35400'); px(lx - P * 6, h * 0.05, P * 12, P, '#e67e22');
      px(lx - P * 2, h * 0.05 + P * 4, P * 4, P * 2, '#fff3b0');
      g.fillStyle = 'rgba(255,220,140,0.10)';
      for (let y = h * 0.05 + P * 6; y < floor; y += P) {
        const k = (y - h * 0.05) / floor;
        const half = P * 4 + k * w * 0.28;
        for (let x = lx - half; x < lx + half; x += P) if (((x / P) + (y / P)) % 2 === 0 || k < 0.5) g.fillRect(Math.round(x / P) * P, y, P, P);
      }
    } else {
      const PAL = [
        [], ['#3a2f2f', '#4d3b38'], ['#283038', '#34404a'], ['#1d242b', '#29323b'], ['#17161c', '#24222b'], ['#0d1023', '#151a38'],
      ][stage];
      const grd = g.createLinearGradient(0, 0, 0, floor);
      grd.addColorStop(0, PAL[0]); grd.addColorStop(1, PAL[1]);
      g.fillStyle = grd; g.fillRect(0, 0, w, floor);
      if (stage === 1) {
        for (let y = 0, r = 0; y < floor; y += P * 7, r++) for (let x = r % 2 ? -P * 8 : 0; x < w; x += P * 16) { px(x + P, y + P, P * 15, P * 6, '#6b3b2e'); px(x + P, y + P, P * 15, P, '#80493a'); }
        for (const yy of [0.22, 0.42]) { px(w * 0.04, h * yy, w * 0.22, P * 3, '#5a4a3a'); px(w * 0.74, h * yy, w * 0.22, P * 3, '#5a4a3a'); }
        for (let i = 0; i < 6; i++) px(w * 0.05 + i * P * 9, h * 0.22 - P * 8, P * 6, P * 8, ['#c0392b', '#2980b9', '#f39c12'][i % 3]);
        for (let i = 0; i < 5; i++) px(w * 0.76 + i * P * 10, h * 0.42 - P * 10, P * 7, P * 10, ['#7f8c8d', '#27ae60'][i % 2]);
      } else if (stage === 2) {
        for (let x = 0; x < w; x += P * 6) { px(x, 0, P * 3, floor, 'rgba(255,255,255,0.05)'); }
        px(0, h * 0.08, w, P * 5, '#2b3036');
        for (let x = P * 10; x < w; x += P * 70) { px(x, 0, P * 7, floor, '#2b3036'); px(x, 0, P, floor, '#3d454d'); }
      } else if (stage === 3) {
        for (const yy of [0.15, 0.24]) { px(0, h * yy, w, P * 5, '#4b5a66'); px(0, h * yy, w, P, '#6b7a86'); }
        px(w * 0.1, h * 0.24, P * 4, floor, '#6b5a2a'); px(w * 0.9, h * 0.24, P * 4, floor, '#6b5a2a');
        for (let x = 0; x < w; x += P * 8) px(x, h * 0.05, P * 4, P * 3, (x / (P * 8)) % 2 ? '#f39c12' : '#222');
      } else if (stage === 4) {
        for (let x = 0; x < w; x += P * 80) { px(x, 0, P * 9, floor, '#2e2b33'); for (let y = 0; y < floor; y += P * 12) px(x + P * 9, y, P * 70, P * 2, 'rgba(46,43,51,0.6)'); }
        for (let x = P * 20; x < w; x += P * 60) { px(x, h * 0.08, P * 4, P * 3, '#ff9f43'); g.fillStyle = 'rgba(255,140,40,0.12)'; g.fillRect(x - P * 10, h * 0.08, P * 24, P * 20); }
      } else {
        for (let x = 0; x < w; x += P * 12) px(x, 0, P, floor, 'rgba(72,219,251,0.12)');
        for (let y = 0; y < floor; y += P * 12) px(0, y, w, P, 'rgba(72,219,251,0.12)');
      }
    }
    // floor / bench
    const top = ['#a8743f', '#7b6a5a', '#596673', '#4a5560', '#3d3a44', '#1e2448'][stage];
    px(0, floor, w, h - floor, shade(top, -0.25));
    px(0, floor, w, P * 4, top);
    px(0, floor, w, P, shade(top, 0.35));
    px(0, floor + P * 4, w, P, shade(top, -0.5));
    if (stage === 0) {
      for (let y = floor + P * 7; y < h; y += P * 4) for (let x = R() * P * 20; x < w; x += P * (20 + R() * 30)) px(x, y, P * (6 + R() * 14), P, '#6b4423');
      px(w * 0.06, floor + P * 5, P * 6, h, '#4a2f18'); px(w * 0.94 - P * 6, floor + P * 5, P * 6, h, '#4a2f18');
    } else if (stage >= 2) {
      for (let x = 0; x < w; x += P * 8) px(x, h - P * 4, P * 4, P * 4, (x / (P * 8)) % 2 ? '#f1c40f' : '#222');
    }
    // dithered vignette
    g.fillStyle = 'rgba(0,0,0,0.35)';
    for (let y = 0; y < h; y += P) for (let x = 0; x < w; x += P) {
      const dx = (x - w / 2) / (w / 2), dy = (y - h / 2) / (h / 2);
      const d = dx * dx * 0.6 + dy * dy * 0.6;
      if (d > 0.55 && ((x / P + y / P) % 2 === 0 || d > 0.85)) g.fillRect(x, y, P, P);
    }
  }

  private drawConveyor(stage: number) {
    if (stage < 1) return;
    const l = this.l, fy = this.e.view.floorY, P = this.P;
    l.fillStyle = 'rgba(255,255,255,0.15)';
    const off = this.belt % (P * 12);
    for (let x = -P * 12 + off; x < this.w; x += P * 12) l.fillRect(x, fy + P, P * 5, P * 2);
  }

  private drawLabFx() {
    const l = this.l, v = this.e.view;
    l.strokeStyle = 'rgba(72,219,251,0.35)'; l.lineWidth = this.P;
    for (let i = 0; i < 3; i++) {
      const r = ((this.t * 40 + i * 60) % 180) + 40;
      l.globalAlpha = 1 - r / 220;
      l.beginPath(); l.ellipse(v.cx, v.floorY, r * 1.8, r * 0.25, 0, 0, 7); l.stroke();
    }
    l.globalAlpha = 1;
  }

  private drawShadow(o: WreckObject) {
    const l = this.l, e = this.e, v = e.view;
    const [sx] = e.toScreen(0, 0);
    const wpx = Math.max(4, (o.rawRight - o.rawLeft) * v.zoom);
    l.fillStyle = 'rgba(0,0,0,0.4)';
    l.fillRect(sx - wpx * 0.55, v.floorY - this.P, wpx * 1.1, this.P * 2);
  }

  // ------------------------------------------------------------ object
  private path(p: RtPart, z: number, closed: boolean) {
    const c = p.cur, pa = new Path2D();
    pa.moveTo(c[0] * z, c[1] * z);
    for (let i = 1; i < p.n; i++) pa.lineTo(c[i * 2] * z, c[i * 2 + 1] * z);
    if (closed) pa.closePath();
    return pa;
  }

  private drawObject(o: WreckObject) {
    const l = this.l, e = this.e, v = e.view, z = v.zoom, P = this.P;
    const sh = o.shake * Math.min(10, 2 + z * 2);
    const ox = Math.round((v.cx + e.offX + (Math.random() - 0.5) * sh) / P) * P;
    const oy = Math.round((v.floorY + (Math.random() - 0.5) * sh * 0.4) / P) * P;
    l.save();
    l.translate(ox, oy);
    l.lineJoin = 'miter';
    l.lineCap = 'square';
    const frac = o.frac;
    const tmp = [0, 0];
    for (const p of o.parts) {
      if (p.detached) continue;
      const fill = p.spec.fill;
      if (p.spec.open) {
        const pa = this.path(p, z, false);
        const wd = Math.max(P * 2, (p.spec.width ?? 2) * z);
        l.strokeStyle = shade(fill, -0.7); l.lineWidth = wd + P * 2; l.stroke(pa);
        l.strokeStyle = fill; l.lineWidth = wd; l.stroke(pa);
        l.save(); l.translate(-P * 0.5, -P * 0.5);
        l.strokeStyle = shade(fill, 0.45); l.lineWidth = Math.max(P * 0.8, wd * 0.3); l.stroke(pa);
        l.restore();
        continue;
      }
      const pa = this.path(p, z, true);
      const rim = Math.max(P, Math.min(P * 3, Math.round(z * 0.8 / P) * P));
      // pixel shading: light rim top-left, dark rim bottom-right
      l.save();
      l.clip(pa);
      l.fillStyle = shade(fill, -0.4);
      l.fill(pa);
      l.translate(-rim, -rim);
      l.fillStyle = shade(fill, 0.32);
      l.fill(pa);
      l.translate(rim, rim);
      l.save();
      l.translate(rim, rim); l.clip(pa); l.translate(-rim * 2, -rim * 2);
      l.fillStyle = fill; l.fill(pa);
      l.restore();
      if (p.mat.id === 'glass') {
        l.fillStyle = 'rgba(255,255,255,0.35)';
        const gx = p.bx0 * z, gy = p.by0 * z, gh = (p.by1 - p.by0) * z;
        for (const off of [0.25, 0.42]) {
          l.beginPath(); l.moveTo(gx + (p.bx1 - p.bx0) * z * off, gy); l.lineTo(gx + (p.bx1 - p.bx0) * z * off + P * 3, gy); l.lineTo(gx + (p.bx1 - p.bx0) * z * off - gh * 0.5 + P * 3, gy + gh); l.lineTo(gx + (p.bx1 - p.bx0) * z * off - gh * 0.5, gy + gh); l.fill();
        }
      }
      if (frac > 0.05) {
        l.fillStyle = `rgba(30,15,0,${Math.min(0.3, frac * 0.28)})`;
        l.fill(pa);
        // rust / scratch pixels
        l.fillStyle = 'rgba(0,0,0,0.25)';
        const n = Math.floor(frac * 14);
        for (let i = 0; i < n; i++) {
          const k = (i * 7919 + Math.floor(o.seed * 100)) % 997 / 997, k2 = (i * 104729) % 991 / 991;
          l.fillRect(Math.round(((p.bx0 + (p.bx1 - p.bx0) * k) * z * (1 + o.comp * 0.3)) / P) * P, Math.round(((p.by0 + (p.by1 - p.by0) * k2) * z * (1 - o.comp)) / P) * P, P * 2, P);
        }
      }
      if (p.mat.crease > 0.3 && o.comp > 0.05) this.drawFolds(o, p.bx0, p.bx1, p.mat.crease);
      l.restore();
      l.strokeStyle = shade(fill, -0.72);
      l.lineWidth = P;
      l.stroke(pa);
      if (p.cracks.length) {
        l.strokeStyle = p.mat.id === 'glass' ? 'rgba(255,255,255,0.9)' : 'rgba(40,20,5,0.9)';
        l.lineWidth = P;
        l.beginPath();
        for (const cr of p.cracks) for (let i = 0; i < cr.length; i += 2) {
          o.crackPoint(p, cr[i], cr[i + 1], tmp);
          i ? l.lineTo(tmp[0] * z, tmp[1] * z) : l.moveTo(tmp[0] * z, tmp[1] * z);
        }
        l.stroke();
      }
    }
    if (o.flash > 0.15) {
      l.globalCompositeOperation = 'lighter';
      l.fillStyle = `rgba(255,255,255,${o.flash * 0.15})`;
      l.fillRect(o.rawLeft * z, o.rawTop * z, (o.rawRight - o.rawLeft) * z, -o.rawTop * z);
      l.globalCompositeOperation = 'source-over';
    }
    l.restore();
  }

  /** Accordion folds (dark crease + light ridge) following the wrinkle field. */
  private drawFolds(o: WreckObject, x0: number, x1: number, crease: number) {
    const l = this.l, z = this.e.view.zoom, P = this.P;
    const n = 7;
    const a = Math.min(0.55, o.comp * crease);
    for (let i = 1; i < n; i++) {
      const y = Math.round((-(o.H * (1 - o.comp)) * (i / n) * z + Math.sin(i * 3.7 + o.seed) * P * 2) / P) * P;
      l.fillStyle = `rgba(0,0,0,${a})`;
      const segs = 8;
      const span = (x1 - x0) * z * 1.6;
      const sx = x0 * z * 1.6;
      for (let s = 0; s < segs; s++) l.fillRect(sx + (span * s) / segs, y + (s % 2 ? P : 0), span / segs + P, P);
      l.fillStyle = `rgba(255,255,255,${a * 0.5})`;
      for (let s = 0; s < segs; s++) l.fillRect(sx + (span * s) / segs, y + P + (s % 2 ? P : 0), span / segs + P, P);
    }
  }

  // ------------------------------------------------------------ machines
  private machineBox() {
    const o = this.e.obj!, v = this.e.view;
    const half = Math.max(o.W * 0.62 * v.zoom, 90);
    const topY = Math.max(40, v.floorY - o.H * 1.55 * v.zoom);
    return { half, topY };
  }

  private block(x: number, y: number, w: number, h: number, c: string) {
    const l = this.l, P = this.P;
    x = Math.round(x / P) * P; y = Math.round(y / P) * P; w = Math.round(w / P) * P; h = Math.round(h / P) * P;
    if (w <= 0 || h <= 0) return;
    l.fillStyle = shade(c, -0.7); l.fillRect(x - P, y - P, w + P * 2, h + P * 2);
    l.fillStyle = shade(c, -0.3); l.fillRect(x, y, w, h);
    l.fillStyle = c; l.fillRect(x, y, w - P, h - P);
    l.fillStyle = shade(c, 0.35); l.fillRect(x, y, w - P, P);
  }

  private drawMachineBack(o: WreckObject) {
    const e = this.e, tool = e.tool;
    if (tool.kind !== 'press') return;
    const v = e.view;
    const { half, topY } = this.machineBox();
    this.block(v.cx - half - 30, topY, 22, v.floorY - topY, shade(tool.color, -0.35));
    this.block(v.cx + half + 8, topY, 22, v.floorY - topY, shade(tool.color, -0.35));
    void o;
  }

  private drawMachineFront(o: WreckObject) {
    const e = this.e, tool = e.tool, l = this.l, v = e.view, z = v.zoom, P = this.P;
    const ts = e.tools;
    if (tool.kind === 'press') {
      const { half, topY } = this.machineBox();
      const py = v.floorY + ts.pressY * z;
      const pist = tool.pistons ?? 1;
      const pw = (half * 2) / pist;
      this.block(v.cx - half - 34, topY - 28, half * 2 + 68, 28, tool.color);
      for (let i = 0; i < pist; i++) {
        const x0 = v.cx - half + i * pw;
        const lag = pist > 1 ? Math.sin(this.t * 6 + i * 2) * 3 : 0;
        const rodW = Math.min(46, pw * 0.25);
        this.block(x0 + pw / 2 - rodW / 2, topY, rodW, py - topY - 20 + lag, '#aab4b8');
        this.block(x0 + 3, py - 22 + lag, pw - 6, 22, shade(tool.color, -0.15));
        for (let s = x0 + 3; s < x0 + pw - 6; s += P * 6) { l.fillStyle = '#f1c40f'; l.fillRect(Math.round(s / P) * P, Math.round((py - P * 3 + lag) / P) * P, P * 3, P * 2); }
      }
      if (tool.id === 'gravity') {
        l.fillStyle = `rgba(155,89,182,${0.18 + 0.08 * Math.sin(this.t * 8)})`;
        for (let y = py; y < v.floorY; y += P * 2) l.fillRect(v.cx - half, y, half * 2, P);
      }
    } else if (tool.kind === 'vise') {
      const jx = ts.jaw * z;
      const h = Math.max(40, -o.rawTop * z * 0.9);
      const y = v.floorY - h - 4;
      for (const side of [-1, 1]) {
        const x = v.cx + side * jx;
        this.block(side < 0 ? x - 160 : x + 46, v.floorY - h * 0.5 - 5, 114, 10, '#95a5a6');
        this.block(side < 0 ? x - 46 : x, y, 46, h, tool.color);
        l.fillStyle = '#2c3e50';
        for (let yy = y + P * 2; yy < y + h - P; yy += P * 3) l.fillRect(side < 0 ? x - P * 2 : x, yy, P * 2, P);
      }
    } else if (tool.kind === 'implode') {
      const [cx, cy] = e.toScreen(0, -o.H * 0.5 * (1 - o.comp));
      const R = Math.max(o.W, o.H) * 0.75 * z;
      l.lineWidth = P;
      for (let i = 0; i < 5; i++) {
        const k = 1 - ((this.t * (ts.active ? 1.4 : 0.3) + i / 5) % 1);
        l.strokeStyle = `rgba(0,206,201,${(1 - k) * (ts.active ? 0.9 : 0.35)})`;
        l.beginPath(); l.arc(cx, cy, R * k, 0, 7); l.stroke();
      }
      if (ts.active) { l.fillStyle = '#fff'; l.fillRect(cx - P * 2, cy - P * 2, P * 4, P * 4); }
    }
    if (ts.phantomAnim >= 0) {
      const k = ts.phantomAnim;
      const fall = k < 0.5 ? (k / 0.5) ** 2 : 1;
      const top = v.floorY + o.rawTop * z;
      const y = 30 + (top - 30) * fall;
      l.globalAlpha = k < 0.5 ? 0.6 : 0.6 * (1 - (k - 0.5) * 2);
      const w = Math.max(80, o.W * z * 0.7);
      this.block(v.cx - 10, 0, 20, y - 22, '#a29bfe');
      this.block(v.cx - w / 2, y - 22, w, 22, '#a29bfe');
      l.globalAlpha = 1;
    }
  }

  private drawAuto() {
    const l = this.l;
    for (const f of this.e.tools.autoFx) {
      const k = f.t / 0.25;
      l.globalAlpha = k;
      l.save();
      l.translate(f.x, f.y);
      l.rotate(-0.6 + (1 - k) * 0.6);
      l.fillStyle = '#9b59b6'; l.fillRect(-3, -50, 6, 46);
      l.fillStyle = '#d6a2e8'; l.fillRect(-12, -8, 24, 12);
      l.restore();
    }
    l.globalAlpha = 1;
  }

  // ------------------------------------------------------------ hand tools (real scale)
  /** polygon in cm-space with outline + highlight, current transform scaled to px */
  private poly(pts: number[], c: string, k: number) {
    const l = this.l;
    l.beginPath();
    for (let i = 0; i < pts.length; i += 2) i ? l.lineTo(pts[i] * k, pts[i + 1] * k) : l.moveTo(pts[i] * k, pts[i + 1] * k);
    l.closePath();
    l.fillStyle = c; l.fill();
    l.strokeStyle = shade(c, -0.7); l.lineWidth = this.P; l.stroke();
  }

  private drawHandTool() {
    const e = this.e, inp = e.input, tool = e.tool, l = this.l, P = this.P;
    if (tool.kind !== 'pinch' && tool.kind !== 'strike') return;
    const visible = inp.touch ? this.touchT > 0 || inp.down : inp.hover || inp.down;
    if (!visible) return;
    // while biting, the tool sits on the snapped contact point
    const ax = e.tools.bite.t > 0 ? e.tools.bite.x : inp.aimX, ay = e.tools.bite.t > 0 ? e.tools.bite.y : inp.aimY;
    if (inp.touch) {
      // finger ring + dotted link up to the aim point
      l.fillStyle = 'rgba(255,255,255,0.35)';
      for (let yy = inp.y - P * 4; yy > ay + P * 4; yy -= P * 3) l.fillRect(Math.round(inp.x / P) * P, Math.round(yy / P) * P, P, P);
      l.strokeStyle = 'rgba(255,255,255,0.4)'; l.lineWidth = P;
      l.strokeRect(Math.round(inp.x / P) * P - P * 5, Math.round(inp.y / P) * P - P * 5, P * 10, P * 10);
    }
    const sw = e.tools.swing;
    // tools are modelled in real cm; scale so the drawn length matches toolDrawLen()
    const k = e.pxPerCm * (e.toolDrawLen() / tool.len);
    const x = Math.round(ax / P) * P, y = Math.round(ay / P) * P;
    // aim marker
    l.fillStyle = 'rgba(255,255,255,0.7)';
    for (const [dx, dy] of [[-3, 0], [2, 0], [0, -3], [0, 2]]) l.fillRect(x + dx * P, y + dy * P, P, P);
    l.save();
    l.translate(x, y);
    l.lineJoin = 'miter';
    if (tool.kind === 'pinch') {
      // toothed pliers: the object sits between the serrated jaws, which bite as you squeeze
      l.rotate(-0.55);
      l.translate(-3 * k, 0);
      const gap = Math.max(0.8, e.econ.toolRadius(tool) * 0.9) * (1 - sw * 0.85);
      for (const s of [-1, 1]) {
        const g = gap * s;
        // jaw with teeth on the inner edge
        const jaw: number[] = [0, g + 0.9 * s, 6, g + 1.2 * s];
        jaw.push(6.5, g * 0.35);
        for (let x = 6; x >= 0.3; x -= 0.7) jaw.push(x, g, x - 0.35, g - 0.4 * s);
        jaw.push(0, g);
        this.poly(jaw, '#a5aeb3', k);
        // handle, closing together with the jaws
        const hs = 0.55 + 0.45 * (1 - sw * 0.85);
        this.poly([6.2, g * 0.3 + 0.5 * s, 20, (1.2 + 1.6 * hs) * s, 20, (2.2 + 1.6 * hs) * s, 6.2, g * 0.3 + 1.4 * s], '#7f8c8d', k);
        this.poly([10, (0.9 + 0.9 * hs) * s, 20.4, (1.1 + 1.6 * hs) * s, 20.4, (2.4 + 1.6 * hs) * s, 10, (1.9 + 0.9 * hs) * s], tool.color, k);
      }
      this.poly([5.7, -0.7, 7, -0.7, 7, 0.7, 5.7, 0.7], '#d0d6d9', k);
    } else {
      const big = tool.id === 'sledge';
      const L = tool.len, hw = big ? 16 : 10, hh = big ? 7 : 3.6;
      // head stands vertical with its face at the pointer; handle runs to the right.
      // The swing rotates around the grip end (swing = 1 at the moment of impact).
      l.rotate(-0.3);
      const px0 = L * k, py0 = (-hw / 2) * k;
      l.translate(px0, py0); l.rotate(0.3 * (1 - sw)); l.translate(-px0, -py0);
      this.poly([hh / 2, -hw / 2 - 0.8, L, -hw / 2 - 0.9, L, -hw / 2 + 0.9, hh / 2, -hw / 2 + 0.8], '#9c6b3c', k);
      this.poly([L - 8, -hw / 2 - 1.1, L, -hw / 2 - 1.1, L, -hw / 2 + 1.1, L - 8, -hw / 2 + 1.1], '#5a3a1e', k);
      this.poly([-hh / 2, 0, hh / 2, 0, hh / 2, -hw, -hh / 2, -hw], big ? '#4b5257' : '#6c757b', k);
      l.fillStyle = 'rgba(255,255,255,0.35)';
      l.fillRect((-hh / 2) * k + P, -hw * k + P, P, hw * k - P * 2);
      l.fillStyle = 'rgba(0,0,0,0.35)';
      l.fillRect((-hh / 2) * k, -P * 2, hh * k, P * 2);
    }
    l.restore();
  }
}
