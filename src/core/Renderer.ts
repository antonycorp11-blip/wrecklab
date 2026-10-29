import type { GameEngine } from './GameEngine';
import type { WreckObject } from '../systems/DeformationSystem';
import { shade } from './util';

/** Canvas 2D renderer: cached stage backdrop, deformable object, tools, particles. */
export class Renderer {
  ctx: CanvasRenderingContext2D;
  w = 0;
  h = 0;
  dpr = 1;
  resized = true;
  private bg: HTMLCanvasElement = document.createElement('canvas');
  private bgKey = '';
  private t = 0;
  private belt = 0;

  constructor(private canvas: HTMLCanvasElement, private e: GameEngine) {
    this.ctx = canvas.getContext('2d', { alpha: false })!;
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
    this.resized = true;
    this.bgKey = '';
  }

  render(dt: number) {
    const e = this.e;
    const ctx = this.ctx;
    this.t += dt;
    if (e.phase === 'enter' || e.phase === 'clear') this.belt += dt * 600;
    const stage = e.prog.stage();
    const key = `${stage}:${this.w}x${this.h}:${this.dpr}`;
    if (key !== this.bgKey) this.buildBackground(stage, key);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.bg, 0, 0);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, e.cam.x * this.dpr, e.cam.y * this.dpr);
    this.drawConveyor(stage);
    if (stage >= 5) this.drawLabFx();
    const o = e.obj;
    if (o) {
      this.drawShadow(o);
      this.drawPressBack(o);
      this.drawObject(o);
    }
    e.particles.drawDebris(ctx);
    if (o) this.drawToolFront(o);
    e.particles.draw(ctx);
    this.drawAuto();
    this.drawCursor();
    e.particles.drawTexts(ctx);
  }

  // ------------------------------------------------------------ backdrop
  private buildBackground(stage: number, key: string) {
    this.bgKey = key;
    const c = this.bg;
    c.width = this.canvas.width; c.height = this.canvas.height;
    const g = c.getContext('2d')!;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const w = this.w, h = this.h;
    const floor = h - Math.max(66, h * 0.16);
    const PAL = [
      ['#3b2a1e', '#4a3526', '#6b4a2f'], ['#3a2f2f', '#4d3b38', '#7a4b3a'], ['#283038', '#34404a', '#55636e'],
      ['#1d242b', '#29323b', '#3e4a55'], ['#17161c', '#24222b', '#3a3542'], ['#0d1023', '#151a38', '#232a5c'],
    ][stage];
    const grd = g.createLinearGradient(0, 0, 0, floor);
    grd.addColorStop(0, PAL[0]); grd.addColorStop(1, PAL[1]);
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.save();
    switch (stage) {
      case 0: { // improvised bench: plank wall + pegboard
        g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2;
        for (let x = 0; x < w; x += 70) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, floor); g.stroke(); }
        g.fillStyle = '#7d6345'; g.fillRect(w * 0.18, h * 0.12, w * 0.64, h * 0.42);
        g.fillStyle = 'rgba(0,0,0,0.35)';
        for (let y = h * 0.15; y < h * 0.52; y += 18) for (let x = w * 0.2; x < w * 0.8; x += 18) { g.beginPath(); g.arc(x, y, 2, 0, 7); g.fill(); }
        g.fillStyle = 'rgba(30,20,10,0.5)';
        g.fillRect(w * 0.25, h * 0.18, 10, 90); g.fillRect(w * 0.23, h * 0.18, 40, 16);
        g.beginPath(); g.arc(w * 0.72, h * 0.3, 34, 0, 7); g.lineWidth = 8; g.strokeStyle = 'rgba(30,20,10,0.5)'; g.stroke();
        g.fillRect(w * 0.6, h * 0.2, 6, 80);
        break;
      }
      case 1: { // workshop: brick wall, shelves
        g.fillStyle = 'rgba(0,0,0,0.18)';
        for (let y = 0; y < floor; y += 26) for (let x = (y / 26) % 2 ? -30 : 0; x < w; x += 60) g.fillRect(x + 2, y + 2, 56, 22);
        g.fillStyle = '#5a4a3a';
        for (const y of [0.22, 0.4]) g.fillRect(w * 0.06, h * y, w * 0.2, 8), g.fillRect(w * 0.74, h * y, w * 0.2, 8);
        g.fillStyle = 'rgba(200,120,60,0.5)';
        for (let i = 0; i < 5; i++) g.fillRect(w * 0.08 + i * 26, h * 0.22 - 22, 18, 22);
        g.fillStyle = 'rgba(80,120,160,0.5)';
        for (let i = 0; i < 4; i++) g.fillRect(w * 0.76 + i * 30, h * 0.4 - 28, 22, 28);
        break;
      }
      case 2: { // warehouse: corrugated metal, beams, hazard
        g.fillStyle = 'rgba(255,255,255,0.04)';
        for (let x = 0; x < w; x += 16) g.fillRect(x, 0, 8, floor);
        g.fillStyle = '#2b3036';
        g.fillRect(0, h * 0.08, w, 16);
        for (let x = 40; x < w; x += 220) g.fillRect(x, 0, 20, floor);
        g.fillStyle = 'rgba(255,220,120,0.08)';
        g.beginPath(); g.moveTo(w * 0.3, 0); g.lineTo(w * 0.7, 0); g.lineTo(w * 0.85, floor); g.lineTo(w * 0.15, floor); g.fill();
        break;
      }
      case 3: { // industrial center: pipes, crane
        g.strokeStyle = '#4b5a66'; g.lineWidth = 14;
        for (const y of [0.15, 0.24]) { g.beginPath(); g.moveTo(0, h * y); g.lineTo(w, h * y); g.stroke(); }
        g.lineWidth = 10; g.strokeStyle = '#6b5a2a';
        g.beginPath(); g.moveTo(w * 0.1, h * 0.24); g.lineTo(w * 0.1, floor); g.stroke();
        g.beginPath(); g.moveTo(w * 0.9, h * 0.24); g.lineTo(w * 0.9, floor); g.stroke();
        g.fillStyle = '#f39c12'; g.fillRect(0, h * 0.05, w, 10);
        g.fillStyle = 'rgba(255,170,60,0.12)';
        for (let x = w * 0.15; x < w; x += w * 0.25) { g.beginPath(); g.arc(x, h * 0.05, 60, 0, 7); g.fill(); }
        break;
      }
      case 4: { // colossal complex: giant girders, orange lights
        g.strokeStyle = '#2e2b33'; g.lineWidth = 26;
        for (let x = -100; x < w + 100; x += 260) {
          g.beginPath(); g.moveTo(x, 0); g.lineTo(x, floor); g.stroke();
          g.lineWidth = 8; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 260, floor * 0.5); g.lineTo(x, floor); g.stroke(); g.lineWidth = 26;
        }
        for (let x = 60; x < w; x += 180) {
          const gr = g.createRadialGradient(x, h * 0.1, 0, x, h * 0.1, 90);
          gr.addColorStop(0, 'rgba(255,140,40,0.35)'); gr.addColorStop(1, 'rgba(255,140,40,0)');
          g.fillStyle = gr; g.fillRect(x - 90, 0, 180, 200);
        }
        break;
      }
      default: { // futuristic lab: glowing grid
        g.strokeStyle = 'rgba(72,219,251,0.12)'; g.lineWidth = 1;
        for (let x = 0; x < w; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, floor); g.stroke(); }
        for (let y = 0; y < floor; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
        const gr = g.createRadialGradient(w / 2, floor * 0.55, 0, w / 2, floor * 0.55, w * 0.45);
        gr.addColorStop(0, 'rgba(162,155,254,0.22)'); gr.addColorStop(1, 'rgba(162,155,254,0)');
        g.fillStyle = gr; g.fillRect(0, 0, w, floor);
      }
    }
    g.restore();
    // floor / bench
    const top = ['#9c6b3c', '#7b6a5a', '#596673', '#4a5560', '#3d3a44', '#1e2448'][stage];
    g.fillStyle = top; g.fillRect(0, floor, w, h - floor);
    g.fillStyle = shade(top, 0.25); g.fillRect(0, floor, w, 5);
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, floor + 5, w, 4);
    if (stage === 0) {
      g.fillStyle = '#5c3d22';
      g.fillRect(w * 0.06, floor + 14, 22, h - floor); g.fillRect(w * 0.94 - 22, floor + 14, 22, h - floor);
      g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 1;
      for (let y = floor + 14; y < h; y += 9) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    } else if (stage >= 2) {
      for (let x = 0; x < w; x += 40) { g.fillStyle = (x / 40) % 2 ? '#f1c40f' : '#222'; g.beginPath(); g.moveTo(x, h - 10); g.lineTo(x + 20, h - 22); g.lineTo(x + 40, h - 22); g.lineTo(x + 20, h - 10); g.fill(); }
    }
    const vg = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.45)');
    g.fillStyle = vg; g.fillRect(0, 0, w, h);
  }

  private drawConveyor(stage: number) {
    if (stage < 1) return;
    const ctx = this.ctx, fy = this.e.view.floorY;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, fy + 2, this.w, 10);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    const off = this.belt % 40;
    for (let x = -40 + off; x < this.w; x += 40) ctx.fillRect(x, fy + 4, 18, 5);
  }

  private drawLabFx() {
    const ctx = this.ctx, v = this.e.view;
    ctx.strokeStyle = 'rgba(72,219,251,0.25)'; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const r = ((this.t * 40 + i * 60) % 180) + 40;
      ctx.globalAlpha = 1 - r / 220;
      ctx.beginPath(); ctx.ellipse(v.cx, v.floorY, r * 1.8, r * 0.25, 0, 0, 7); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  private drawShadow(o: WreckObject) {
    const ctx = this.ctx, e = this.e, v = e.view;
    const [sx] = e.toScreen(0, 0);
    const wpx = (o.rawRight - o.rawLeft) * v.zoom;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(sx, v.floorY + 2, wpx * 0.55, 8, 0, 0, 7); ctx.fill();
  }

  // ------------------------------------------------------------ object
  private drawObject(o: WreckObject) {
    const ctx = this.ctx, e = this.e, v = e.view;
    const z = v.zoom;
    const sh = o.shake * Math.min(10, 2 + z * 2);
    const ox = v.cx + e.offX + (Math.random() - 0.5) * sh;
    const oy = v.floorY + (Math.random() - 0.5) * sh * 0.4;
    ctx.save();
    ctx.translate(ox, oy);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const frac = o.frac;
    const tmp = [0, 0];
    for (const p of o.parts) {
      if (p.detached) continue;
      const c = p.cur;
      ctx.beginPath();
      ctx.moveTo(c[0] * z, c[1] * z);
      for (let i = 1; i < p.n; i++) ctx.lineTo(c[i * 2] * z, c[i * 2 + 1] * z);
      if (p.spec.open) {
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = (p.spec.width ?? 2) * z + 2;
        ctx.stroke();
        ctx.strokeStyle = p.spec.fill;
        ctx.lineWidth = (p.spec.width ?? 2) * z;
        ctx.stroke();
        continue;
      }
      ctx.closePath();
      ctx.fillStyle = p.spec.fill;
      ctx.fill();
      // damage darkening + folds
      if (frac > 0.05 || o.comp > 0.02) {
        ctx.save();
        ctx.clip();
        ctx.fillStyle = `rgba(20,10,0,${Math.min(0.35, frac * 0.3)})`;
        ctx.fillRect(p.bx0 * z * 1.6 - 20, -o.H * z - 20, (p.bx1 - p.bx0) * z * 1.6 + 40, o.H * z + 40);
        if (p.mat.crease > 0.3 && o.comp > 0.05) this.drawFolds(o, p.bx0, p.bx1, p.mat.crease);
        ctx.restore();
      }
      // highlight on upper-left edge
      ctx.strokeStyle = shade(p.spec.fill, -0.55);
      ctx.lineWidth = Math.max(1.5, Math.min(3, z * 1.2));
      ctx.stroke();
      if (p.cracks.length) {
        ctx.strokeStyle = p.mat.id === 'glass' ? 'rgba(255,255,255,0.85)' : 'rgba(40,20,5,0.8)';
        ctx.lineWidth = p.mat.id === 'glass' ? 1.4 : 2;
        ctx.beginPath();
        for (const cr of p.cracks) {
          for (let i = 0; i < cr.length; i += 2) {
            o.crackPoint(p, cr[i], cr[i + 1], tmp);
            i ? ctx.lineTo(tmp[0] * z, tmp[1] * z) : ctx.moveTo(tmp[0] * z, tmp[1] * z);
          }
        }
        ctx.stroke();
      }
    }
    if (o.flash > 0.05) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(255,255,255,${o.flash * 0.12})`;
      ctx.fillRect(o.rawLeft * z, o.rawTop * z, (o.rawRight - o.rawLeft) * z, -o.rawTop * z);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  }

  /** Accordion folds drawn inside the clipped part, following the wrinkle field. */
  private drawFolds(o: WreckObject, x0: number, x1: number, crease: number) {
    const ctx = this.ctx, z = this.e.view.zoom;
    const n = 7;
    const a = Math.min(0.5, o.comp * crease * 0.9);
    for (let i = 1; i < n; i++) {
      const y = -(o.H * (1 - o.comp)) * (i / n) * z;
      const wob = Math.sin(i * 3.7 + o.seed) * 6;
      ctx.strokeStyle = `rgba(0,0,0,${a})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x0 * z * 1.5, y + wob);
      const segs = 6;
      for (let s = 1; s <= segs; s++) {
        const x = (x0 + ((x1 - x0) * s) / segs) * z * 1.5;
        ctx.lineTo(x, y + wob + (s % 2 ? 1 : -1) * o.comp * 8);
      }
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${a * 0.45})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x0 * z * 1.5, y + wob + 3);
      ctx.lineTo(x1 * z * 1.5, y + wob + 3);
      ctx.stroke();
    }
  }

  // ------------------------------------------------------------ tools
  private drawPressBack(o: WreckObject) {
    const e = this.e, tool = e.tool;
    if (tool.kind !== 'press') return;
    const ctx = this.ctx, v = e.view;
    const half = Math.max(o.W * 0.62 * v.zoom, 90);
    const topY = Math.max(40, v.floorY - o.H * 1.55 * v.zoom);
    ctx.fillStyle = shade(tool.color, -0.45);
    ctx.fillRect(v.cx - half - 26, topY, 22, v.floorY - topY);
    ctx.fillRect(v.cx + half + 4, topY, 22, v.floorY - topY);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(v.cx - half - 22, topY, 4, v.floorY - topY);
    ctx.fillRect(v.cx + half + 8, topY, 4, v.floorY - topY);
  }

  private drawToolFront(o: WreckObject) {
    const e = this.e, tool = e.tool, ctx = this.ctx, v = e.view, z = v.zoom;
    const ts = e.tools;
    if (tool.kind === 'press') {
      const half = Math.max(o.W * 0.62 * z, 90);
      const topY = Math.max(40, v.floorY - o.H * 1.55 * z);
      const py = v.floorY + ts.pressY * z;
      const pist = tool.pistons ?? 1;
      const pw = (half * 2) / pist;
      // beam
      ctx.fillStyle = tool.color; ctx.fillRect(v.cx - half - 30, topY - 26, half * 2 + 60, 30);
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(v.cx - half - 30, topY - 2, half * 2 + 60, 6);
      for (let i = 0; i < pist; i++) {
        const x0 = v.cx - half + i * pw;
        const lag = pist > 1 ? Math.sin(this.t * 6 + i * 2) * 3 : 0;
        const rodW = Math.min(46, pw * 0.25);
        const grd = ctx.createLinearGradient(x0 + pw / 2 - rodW / 2, 0, x0 + pw / 2 + rodW / 2, 0);
        grd.addColorStop(0, '#7f8c8d'); grd.addColorStop(0.5, '#ecf0f1'); grd.addColorStop(1, '#636e72');
        ctx.fillStyle = grd;
        ctx.fillRect(x0 + pw / 2 - rodW / 2, topY, rodW, Math.max(0, py - topY - 20 + lag));
        ctx.fillStyle = shade(tool.color, -0.2);
        ctx.fillRect(x0 + 3, py - 22 + lag, pw - 6, 22);
        ctx.save();
        ctx.beginPath(); ctx.rect(x0 + 3, py - 8 + lag, pw - 6, 8); ctx.clip();
        for (let s = x0 - 20; s < x0 + pw; s += 16) {
          ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.moveTo(s, py + lag); ctx.lineTo(s + 8, py - 8 + lag); ctx.lineTo(s + 16, py - 8 + lag); ctx.lineTo(s + 8, py + lag); ctx.fill();
        }
        ctx.restore();
      }
      if (tool.id === 'gravity') {
        const g = ctx.createLinearGradient(0, py, 0, v.floorY);
        g.addColorStop(0, `rgba(155,89,182,${0.25 + 0.1 * Math.sin(this.t * 8)})`); g.addColorStop(1, 'rgba(155,89,182,0)');
        ctx.fillStyle = g; ctx.fillRect(v.cx - half, py, half * 2, v.floorY - py);
      }
      if (ts.contact) {
        ctx.fillStyle = 'rgba(255,200,80,0.15)';
        ctx.fillRect(v.cx - half, py - 2, half * 2, 4);
      }
    } else if (tool.kind === 'vise') {
      const jx = ts.jaw * z;
      const h = Math.max(40, -o.rawTop * z * 0.9);
      const y = v.floorY - h - 4;
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(v.cx - jx - 160, v.floorY - h * 0.5 - 6, jx * 2 + 320, 12);
      for (const side of [-1, 1]) {
        const x = v.cx + side * jx;
        ctx.fillStyle = tool.color;
        ctx.fillRect(side < 0 ? x - 46 : x, y, 46, h);
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(side < 0 ? x - 8 : x, y, 8, h);
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        for (let yy = y + 6; yy < y + h; yy += 10) ctx.fillRect(side < 0 ? x - 8 : x, yy, 8, 3);
        ctx.fillStyle = '#95a5a6';
        ctx.fillRect(side < 0 ? x - 46 - 120 : x + 46, v.floorY - h * 0.5 - 5, 120, 10);
      }
    } else if (tool.kind === 'implode') {
      const [cx, cy] = e.toScreen(0, -o.H * 0.5 * (1 - o.comp));
      const R = Math.max(o.W, o.H) * 0.75 * z;
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const k = 1 - (((this.t * (ts.active ? 1.4 : 0.3)) + i / 5) % 1);
        ctx.strokeStyle = `rgba(0,206,201,${(1 - k) * (ts.active ? 0.8 : 0.3)})`;
        ctx.beginPath(); ctx.arc(cx, cy, R * k, 0, 7); ctx.stroke();
      }
      if (ts.active) {
        ctx.fillStyle = `rgba(255,255,255,${0.5 + 0.3 * Math.sin(this.t * 30)})`;
        ctx.beginPath(); ctx.arc(cx, cy, 4 + o.frac * 10, 0, 7); ctx.fill();
      }
    }
    // phantom piston
    if (ts.phantomAnim >= 0) {
      const k = ts.phantomAnim;
      const fall = k < 0.5 ? (k / 0.5) ** 2 : 1;
      const top = v.floorY + o.rawTop * z;
      const y = 30 + (top - 30) * fall;
      ctx.globalAlpha = k < 0.5 ? 0.6 : 0.6 * (1 - (k - 0.5) * 2);
      ctx.fillStyle = '#a29bfe';
      const w = Math.max(80, o.W * z * 0.7);
      ctx.fillRect(v.cx - w / 2, y - 22, w, 22);
      ctx.fillRect(v.cx - 10, 0, 20, y - 22);
      ctx.globalAlpha = 1;
    }
  }

  private drawAuto() {
    const ctx = this.ctx;
    for (const f of this.e.tools.autoFx) {
      const k = f.t / 0.25;
      ctx.globalAlpha = k;
      ctx.save();
      ctx.translate(f.x, f.y - 10 - (1 - k) * 0);
      ctx.rotate(-0.6 + (1 - k) * 0.6);
      ctx.fillStyle = '#9b59b6'; ctx.fillRect(-3, -50, 6, 46);
      ctx.fillStyle = '#d6a2e8'; ctx.fillRect(-12, -8, 24, 12);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  private drawCursor() {
    const e = this.e, inp = e.input, tool = e.tool, ctx = this.ctx;
    if (!(inp.hover || inp.down) || inp.y > e.view.floorY + 60) return;
    if (tool.kind !== 'pinch' && tool.kind !== 'strike') return;
    const x = inp.x, y = inp.y;
    const r = e.econ.toolRadius(tool);
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
    ctx.setLineDash([]);
    const sw = e.tools.swing;
    ctx.save();
    ctx.translate(x, y);
    if (tool.kind === 'pinch') {
      const open = 0.35 * (1 - sw) + 0.04;
      ctx.rotate(-0.5);
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.rotate(s * open);
        ctx.fillStyle = '#95a5a6';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(s * 8, 26); ctx.lineTo(s * 3, 34); ctx.lineTo(-s * 3, 4); ctx.fill();
        ctx.fillStyle = tool.color;
        ctx.beginPath(); ctx.moveTo(s * 4, 34); ctx.lineTo(s * 10, 95); ctx.lineTo(s * 2, 96); ctx.lineTo(-s * 1, 36); ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = '#555'; ctx.beginPath(); ctx.arc(0, 34, 4, 0, 7); ctx.fill();
    } else {
      const big = tool.id === 'sledge';
      const L = big ? 120 : 80;
      ctx.rotate(-1.1 * (1 - sw) + 0.2);
      ctx.fillStyle = '#8e6b3e';
      ctx.fillRect(-4, 6, big ? 10 : 7, L);
      ctx.fillStyle = big ? '#4b5257' : '#636e72';
      const hw = big ? 64 : 40, hh = big ? 34 : 20;
      ctx.fillRect(-hw / 2, -hh / 2, hw, hh);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(-hw / 2, -hh / 2, hw, 4);
    }
    ctx.restore();
  }
}
