import type { GameEngine, FieldItem } from './GameEngine';
import type { WreckObject, RtPart } from '../systems/DeformationSystem';
import type { SceneDef } from './types';
import { SCENES } from '../data/scenes';
import { shade } from './util';

function rng(seed: number) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }

/**
 * Pixel-art renderer: the world is drawn into a low-resolution buffer (1 art pixel = P css px)
 * and upscaled nearest-neighbour. Floating numbers are drawn crisp on top.
 */
export class Renderer {
  ctx: CanvasRenderingContext2D;
  w = 0;
  h = 0;
  dpr = 1;
  P = 3;
  resized = true;
  private low = document.createElement('canvas');
  private l!: CanvasRenderingContext2D;
  private bg = document.createElement('canvas');
  private bgKey = '';
  private t = 0;

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
    const scene = SCENES[e.scene] ?? SCENES.kitchen;
    const key = `${scene.id}:${this.low.width}x${this.low.height}`;
    if (key !== this.bgKey) this.buildBackground(scene, key);
    e.particles.px = P;
    l.setTransform(1, 0, 0, 1, 0, 0);
    l.imageSmoothingEnabled = false;
    l.drawImage(this.bg, 0, 0);
    l.setTransform(1 / P, 0, 0, 1 / P, Math.round(e.cam.x / P), Math.round(e.cam.y / P));
    for (const it of e.field) this.drawShadow(it);
    for (const it of e.field) this.drawItem(it);
    e.particles.drawDebris(l);
    e.particles.draw(l);
    this.drawAuto();
    this.drawTool();
    if (e.phase === 'lobby') { l.fillStyle = 'rgba(10,8,6,0.35)'; l.fillRect(0, 0, this.w, this.h); }
    const c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.imageSmoothingEnabled = false;
    c.drawImage(this.low, 0, 0, this.low.width, this.low.height, 0, 0, this.low.width * P * this.dpr, this.low.height * P * this.dpr);
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    e.particles.drawTexts(c);
  }

  // ------------------------------------------------------------ scene backdrop
  private buildBackground(sc: SceneDef, key: string) {
    this.bgKey = key;
    const P = this.P;
    this.bg.width = this.low.width; this.bg.height = this.low.height;
    const g = this.bg.getContext('2d')!;
    g.setTransform(1 / P, 0, 0, 1 / P, 0, 0);
    const w = this.w, h = this.h;
    const hz = this.e.view.horizon || h * 0.46;
    const R = rng(777 + sc.id.length * 31);
    const q = (v: number) => Math.round(v / P) * P;
    const px = (x: number, y: number, ww: number, hh: number, c: string) => { g.fillStyle = c; g.fillRect(q(x), q(y), Math.max(P, q(ww)), Math.max(P, q(hh))); };
    const [w0, w1] = sc.wallColors;
    const [f0, f1] = sc.floorColors;

    // ---- wall
    px(0, 0, w, hz, w0);
    switch (sc.wall) {
      case 'tiles': {
        const s = P * 8;
        for (let y = 0; y < hz; y += s) for (let x = 0; x < w; x += s) { px(x, y, s, s, ((x + y) / s) % 2 ? w0 : w1); px(x, y, s, P, shade(w0, 0.25)); px(x, y, P, s, shade(w0, -0.12)); }
        break;
      }
      case 'bricks':
        for (let y = 0, r = 0; y < hz; y += P * 5, r++) for (let x = r % 2 ? -P * 6 : 0; x < w; x += P * 12) {
          px(x, y, P * 11, P * 4, R() < 0.5 ? w0 : w1); px(x, y, P * 11, P, shade(w0, 0.18));
        }
        break;
      case 'planks':
        for (let x = 0, i = 0; x < w; x += P * 10, i++) { px(x, 0, P * 10, hz, i % 2 ? w0 : w1); px(x, 0, P, hz, shade(w0, -0.4)); px(x + P, 0, P, hz, shade(w0, 0.15)); }
        break;
      case 'corrugated':
        for (let x = 0; x < w; x += P * 4) { px(x, 0, P * 2, hz, w1); px(x, 0, P, hz, shade(w0, 0.2)); }
        break;
      case 'concrete':
        for (let i = 0; i < 400; i++) px(R() * w, R() * hz, P, P, R() < 0.5 ? w1 : shade(w0, 0.1));
        for (let x = 0; x < w; x += P * 40) px(x, 0, P, hz, shade(w0, -0.3));
        break;
      case 'vault':
      case 'panels':
        for (let y = 0; y < hz; y += P * 20) for (let x = 0; x < w; x += P * 26) {
          px(x + P, y + P, P * 24, P * 18, w1); px(x + P, y + P, P * 24, P, shade(w1, 0.25));
          for (const [rx, ry] of [[3, 3], [22, 3], [3, 16], [22, 16]]) px(x + rx * P, y + ry * P, P, P, shade(w0, 0.4));
        }
        break;
      case 'sky': {
        const grd = g.createLinearGradient(0, 0, 0, hz);
        grd.addColorStop(0, w0); grd.addColorStop(1, w1);
        g.fillStyle = grd; g.fillRect(0, 0, w, hz);
        for (let i = 0; i < 6; i++) { const cx = R() * w, cy = R() * hz * 0.5; for (let k = 0; k < 4; k++) px(cx + k * P * 5, cy - (k % 2) * P * 2, P * 10, P * 4, 'rgba(255,255,255,0.75)'); }
        break;
      }
      case 'space':
        for (let i = 0; i < 160; i++) px(R() * w, R() * hz, P, P, R() < 0.2 ? '#ffeaa7' : '#ffffff');
        break;
    }
    // ---- props on the wall
    for (const p of sc.props) this.prop(p, g, px, w, hz, R, P);

    // ---- floor (perspective rows)
    px(0, hz, w, h - hz, f0);
    px(0, hz, w, P * 2, shade(f0, -0.45));
    let y = hz + P * 2, row = 0;
    while (y < h) {
      const hh = Math.max(P * 2, q((y - hz) * 0.18 + P * 3));
      switch (sc.floor) {
        case 'tiles': {
          const tw = hh * 2;
          for (let x = (row % 2) * tw * 0.5 - tw; x < w; x += tw) px(x, y, tw, hh, (Math.floor(x / tw) + row) % 2 ? f0 : f1);
          px(0, y, w, P, shade(f0, -0.25));
          break;
        }
        case 'wood':
          px(0, y, w, hh, row % 2 ? f0 : f1); px(0, y, w, P, shade(f0, -0.35));
          for (let x = R() * 200; x < w; x += 120 + R() * 160) px(x, y, P, hh, shade(f0, -0.35));
          break;
        case 'concrete': case 'dirt': case 'asphalt':
          for (let i = 0; i < w / 18; i++) px(R() * w, y + R() * hh, P * (sc.floor === 'dirt' ? 2 : 1), P, R() < 0.5 ? f1 : shade(f0, 0.12));
          break;
        case 'metal':
          for (let x = (row % 2) * P * 4; x < w; x += P * 8) px(x, y + hh / 2, P * 3, P, shade(f0, 0.3));
          px(0, y, w, P, shade(f0, -0.25));
          break;
      }
      y += hh; row++;
    }
    if (sc.floor === 'asphalt') for (let x = w * 0.15; x < w; x += w * 0.28) { px(x, hz + (h - hz) * 0.25, P * 2, (h - hz) * 0.75, '#f1c40f'); }
    if (sc.props.includes('hazard')) for (let x = 0; x < w; x += P * 8) px(x, hz - P * 3, P * 4, P * 3, (x / (P * 8)) % 2 ? '#f1c40f' : '#222');
    // dithered vignette
    g.fillStyle = 'rgba(0,0,0,0.3)';
    for (let yy = 0; yy < h; yy += P) for (let x = 0; x < w; x += P) {
      const dx = (x - w / 2) / (w / 2), dy = (yy - h / 2) / (h / 2);
      const d = dx * dx * 0.55 + dy * dy * 0.5;
      if (d > 0.5 && ((x / P + yy / P) % 2 === 0 || d > 0.8)) g.fillRect(x, yy, P, P);
    }
  }

  private prop(p: string, g: CanvasRenderingContext2D, px: (x: number, y: number, w: number, h: number, c: string) => void, w: number, hz: number, R: () => number, P: number) {
    switch (p) {
      case 'cabinets':
        for (const x0 of [w * 0.03, w * 0.68]) {
          px(x0, hz * 0.12, w * 0.28, hz * 0.32, '#6d4c41'); px(x0, hz * 0.12, w * 0.28, P, '#8d6e63');
          for (let k = 0; k < 3; k++) { px(x0 + P * 2 + (k * w * 0.28) / 3, hz * 0.14, w * 0.28 / 3 - P * 3, hz * 0.28, '#8d6e63'); px(x0 + (k + 0.5) * (w * 0.28) / 3, hz * 0.36, P * 3, P, '#f1c40f'); }
          px(x0, hz * 0.78, w * 0.28, hz * 0.22, '#6d4c41'); px(x0 - P, hz * 0.76, w * 0.28 + P * 2, P * 2, '#bdc3c7');
        }
        break;
      case 'window': {
        const x0 = w * 0.38, y0 = hz * 0.12, ww = w * 0.22, hh = hz * 0.5;
        px(x0 - P * 2, y0 - P * 2, ww + P * 4, hh + P * 4, '#ecf0f1');
        px(x0, y0, ww, hh, '#81d4fa'); px(x0, y0 + hh * 0.7, ww, hh * 0.3, '#66bb6a');
        px(x0 + ww / 2 - P, y0, P * 2, hh, '#ecf0f1'); px(x0, y0 + hh / 2 - P, ww, P * 2, '#ecf0f1');
        px(x0 + ww * 0.15, y0 + hh * 0.15, P * 6, P * 3, '#ffffff');
        break;
      }
      case 'clock':
        px(w * 0.64, hz * 0.2, P * 10, P * 10, '#2d3436'); px(w * 0.64 + P, hz * 0.2 + P, P * 8, P * 8, '#ffffff');
        px(w * 0.64 + P * 5, hz * 0.2 + P * 2, P, P * 4, '#2d3436'); px(w * 0.64 + P * 5, hz * 0.2 + P * 5, P * 3, P, '#e74c3c');
        break;
      case 'plant':
        px(w * 0.33, hz * 0.62, P * 8, P * 8, '#d35400');
        for (let k = 0; k < 7; k++) px(w * 0.33 - P * 3 + k * P * 2, hz * 0.62 - P * (4 + (k % 3) * 3), P * 2, P * (4 + (k % 3) * 3), '#27ae60');
        break;
      case 'shelves':
        for (const x0 of [w * 0.04, w * 0.72]) {
          for (let s = 0; s < 3; s++) {
            const yy = hz * (0.2 + s * 0.27);
            px(x0, yy, w * 0.24, P * 2, '#95a5a6');
            for (let x = x0 + P; x < x0 + w * 0.24 - P * 3; x += P * 4) px(x, yy - P * 6, P * 3, P * 6, ['#e74c3c', '#27ae60', '#f39c12', '#3498db'][Math.floor(R() * 4)]);
          }
          px(x0, hz * 0.1, P, hz * 0.9, '#7f8c8d'); px(x0 + w * 0.24, hz * 0.1, P, hz * 0.9, '#7f8c8d');
        }
        break;
      case 'crates':
      case 'boxes': {
        const c = p === 'crates' ? '#c8a165' : '#c69c6d';
        for (const [fx, n] of [[0.02, 3], [0.86, 2]] as [number, number][]) for (let k = 0; k < n; k++) {
          const bw = w * 0.1, bh = hz * 0.22;
          const x0 = w * fx + (k % 2) * bw * 0.3, y0 = hz - bh * (k + 1);
          px(x0, y0, bw, bh, c); px(x0, y0, bw, P, shade(c, 0.3)); px(x0, y0 + bh - P, bw, P, shade(c, -0.4));
          if (p === 'boxes') px(x0 + bw / 2 - P * 2, y0, P * 4, bh, shade(c, 0.15)); else { px(x0, y0 + bh / 2, bw, P, shade(c, -0.3)); }
        }
        break;
      }
      case 'neon':
      case 'sale': {
        const txt = p === 'neon' ? 'GELADA' : 'QUEIMA!';
        g.font = `${Math.round(P * 9)}px 'Pixelify Sans', monospace`;
        g.textAlign = 'center';
        const x = w * 0.5, y = hz * (p === 'neon' ? 0.25 : 0.62);
        g.fillStyle = p === 'neon' ? 'rgba(255,64,160,0.25)' : '#c0392b';
        if (p === 'sale') px(x - w * 0.12, y - P * 10, w * 0.24, P * 14, '#c0392b');
        else g.fillRect(x - w * 0.13, y - P * 11, w * 0.26, P * 15);
        g.fillStyle = p === 'neon' ? '#ff6ec7' : '#ffffff';
        g.fillText(txt, x, y);
        break;
      }
      case 'fridge':
        px(w * 0.3, hz * 0.3, w * 0.09, hz * 0.7, '#ecf0f1'); px(w * 0.3 + P * 2, hz * 0.34, w * 0.09 - P * 4, hz * 0.6, '#74b9ff');
        for (let s = 0; s < 3; s++) for (let k = 0; k < 4; k++) px(w * 0.3 + P * 3 + k * P * 4, hz * (0.42 + s * 0.17), P * 3, P * 5, ['#e74c3c', '#27ae60', '#f1c40f'][s]);
        break;
      case 'bikes':
        for (const x0 of [w * 0.12, w * 0.7]) {
          const r = hz * 0.12, y0 = hz * 0.35;
          for (const dx of [0, r * 2.4]) { g.strokeStyle = '#2d3436'; g.lineWidth = P * 2; g.beginPath(); g.arc(x0 + dx, y0, r, 0, 7); g.stroke(); }
          px(x0, y0 - P, r * 2.4, P * 2, '#e74c3c'); px(x0 + r * 1.2, y0 - r, P * 2, r, '#e74c3c');
        }
        break;
      case 'posters':
        for (const [x0, c] of [[w * 0.42, '#f1c40f'], [w * 0.55, '#e84393']] as [number, string][]) { px(x0, hz * 0.15, w * 0.08, hz * 0.3, c); px(x0 + P * 2, hz * 0.2, w * 0.08 - P * 4, P * 2, '#2d3436'); }
        break;
      case 'pegboard':
        px(w * 0.04, hz * 0.62, w * 0.2, hz * 0.3, '#a1887f');
        for (let yy = hz * 0.64; yy < hz * 0.9; yy += P * 4) for (let x = w * 0.05; x < w * 0.23; x += P * 4) px(x, yy, P, P, '#5d4037');
        break;
      case 'frames':
        for (const [x0, c] of [[w * 0.12, '#e17055'], [w * 0.7, '#00b894'], [w * 0.82, '#fdcb6e']] as [number, string][]) { px(x0, hz * 0.18, w * 0.07, hz * 0.2, '#6d4c41'); px(x0 + P * 2, hz * 0.18 + P * 2, w * 0.07 - P * 4, hz * 0.2 - P * 4, c); }
        break;
      case 'lamp':
        px(w * 0.9, hz * 0.3, P * 2, hz * 0.7, '#2d3436'); px(w * 0.9 - P * 6, hz * 0.22, P * 14, P * 8, '#fdcb6e');
        break;
      case 'pipes':
        for (const yy of [0.1, 0.18]) { px(0, hz * yy, w, P * 4, '#7f8c8d'); px(0, hz * yy, w, P, '#b2bec3'); for (let x = P * 30; x < w; x += P * 60) px(x, hz * yy - P, P * 4, P * 6, '#636e72'); }
        break;
      case 'bulb':
        px(w * 0.5, 0, P, hz * 0.2, '#111'); px(w * 0.5 - P * 2, hz * 0.2, P * 5, P * 5, '#ffeaa7');
        g.fillStyle = 'rgba(255,234,167,0.08)';
        for (let yy = hz * 0.25; yy < hz; yy += P) { const half = (yy - hz * 0.2) * 0.9; g.fillRect(w * 0.5 - half, yy, half * 2, P); }
        break;
      case 'cobweb':
        g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = P;
        for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(0, k * P * 8); g.lineTo(k * P * 8, 0); g.stroke(); }
        break;
      case 'lamps':
        for (let x = w * 0.15; x < w; x += w * 0.25) { px(x - P * 8, 0, P * 16, P * 3, '#636e72'); px(x - P * 7, P * 3, P * 14, P * 2, '#fffbe6'); g.fillStyle = 'rgba(255,251,230,0.06)'; g.fillRect(x - P * 20, P * 5, P * 40, hz * 0.4); }
        break;
      case 'vaultdoor': {
        const cx = w * 0.5, cy = hz * 0.5, r = hz * 0.38;
        g.fillStyle = '#7f8c8d'; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
        g.fillStyle = '#95a5a6'; g.beginPath(); g.arc(cx, cy, r * 0.8, 0, 7); g.fill();
        for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; px(cx + Math.cos(a) * r * 0.5 - P, cy + Math.sin(a) * r * 0.5 - P, P * 3, P * 3, '#2d3436'); }
        px(cx - P * 3, cy - P * 3, P * 6, P * 6, '#f1c40f');
        break;
      }
      case 'gold':
        for (let k = 0; k < 5; k++) px(w * 0.82 + (k % 3) * P * 8, hz - P * 4 * (1 + Math.floor(k / 3)), P * 7, P * 4, '#f1c40f');
        break;
      case 'junkpiles':
        for (let k = 0; k < 5; k++) {
          const x0 = (k / 5) * w + R() * 40, ww = w * 0.22, hh = hz * (0.2 + R() * 0.15);
          g.fillStyle = ['#6d6d6d', '#5d4e46', '#7a6a5a'][k % 3];
          g.beginPath(); g.moveTo(x0, hz); g.lineTo(x0 + ww * 0.3, hz - hh); g.lineTo(x0 + ww * 0.6, hz - hh * 0.8); g.lineTo(x0 + ww, hz); g.fill();
          for (let i = 0; i < 6; i++) px(x0 + ww * (0.2 + R() * 0.6), hz - hh * R() * 0.8, P * 4, P * 3, ['#c0392b', '#2980b9', '#bdc3c7'][i % 3]);
        }
        break;
      case 'fence':
        for (let x = 0; x < w; x += P * 3) for (let yy = hz - P * 18; yy < hz; yy += P * 3) if (((x + yy) / P) % 2 === 0) px(x, yy, P, P, 'rgba(60,60,60,0.5)');
        px(0, hz - P * 18, w, P, '#555');
        break;
      case 'crane':
        px(w * 0.8, hz * 0.05, P * 3, hz * 0.6, '#f39c12'); px(w * 0.55, hz * 0.05, w * 0.28, P * 3, '#f39c12');
        px(w * 0.6, hz * 0.05, P, hz * 0.3, '#2d3436'); px(w * 0.6 - P * 3, hz * 0.35, P * 7, P * 3, '#636e72');
        break;
      case 'sun':
        g.fillStyle = '#fff3b0'; g.beginPath(); g.arc(w * 0.85, hz * 0.22, hz * 0.09, 0, 7); g.fill();
        break;
      case 'city':
        for (let x = 0; x < w; x += P * 14) { const bh = hz * (0.12 + R() * 0.25); px(x, hz - bh, P * 13, bh, '#5d6d7e'); for (let yy = hz - bh + P * 2; yy < hz - P * 2; yy += P * 4) for (let xx = x + P * 2; xx < x + P * 12; xx += P * 4) if (R() < 0.4) px(xx, yy, P * 2, P * 2, '#ffeaa7'); }
        break;
      case 'cones':
        for (const x0 of [w * 0.05, w * 0.92]) { px(x0, hz - P * 8, P * 4, P * 8, '#e67e22'); px(x0 - P * 2, hz - P, P * 8, P, '#e67e22'); px(x0, hz - P * 5, P * 4, P, '#fff'); }
        break;
      case 'screens':
        for (const x0 of [w * 0.1, w * 0.4, w * 0.7]) { px(x0, hz * 0.2, w * 0.18, hz * 0.3, '#0a3d62'); for (let k = 0; k < 4; k++) px(x0 + P * 2, hz * 0.24 + k * P * 4, w * 0.18 * R(), P * 2, '#48dbfb'); }
        break;
      case 'stars':
        for (let i = 0; i < 40; i++) px(R() * w, R() * hz, P * 2, P * 2, '#dfe6e9');
        break;
      case 'planet': {
        g.fillStyle = '#e17055'; g.beginPath(); g.arc(w * 0.75, hz * 0.4, hz * 0.25, 0, 7); g.fill();
        g.fillStyle = '#fab1a0'; g.beginPath(); g.arc(w * 0.72, hz * 0.35, hz * 0.12, 0, 7); g.fill();
        g.strokeStyle = '#ffeaa7'; g.lineWidth = P * 2; g.beginPath(); g.ellipse(w * 0.75, hz * 0.4, hz * 0.4, hz * 0.08, -0.3, 0, 7); g.stroke();
        break;
      }
    }
  }

  // ------------------------------------------------------------ items
  private drawShadow(it: FieldItem) {
    const l = this.l, o = it.obj, P = this.P;
    const wpx = Math.max(P * 3, (o.rawRight - o.rawLeft) * it.s * (it.state === 'dying' ? Math.max(0, 1 - it.t * 3) : 1));
    const k = Math.max(0.3, 1 - it.off / 200);
    l.fillStyle = `rgba(0,0,0,${0.35 * k})`;
    l.fillRect(Math.round((it.x - wpx * 0.55 * k) / P) * P, Math.round((it.y - P) / P) * P, Math.round((wpx * 1.1 * k) / P) * P, P * 2);
  }

  private path(p: RtPart, closed: boolean) {
    const c = p.cur, pa = new Path2D();
    pa.moveTo(c[0], c[1]);
    for (let i = 1; i < p.n; i++) pa.lineTo(c[i * 2], c[i * 2 + 1]);
    if (closed) pa.closePath();
    return pa;
  }

  private drawItem(it: FieldItem) {
    const l = this.l, P = this.P, o = it.obj;
    let sx = 1 + it.punch * 0.18, sy = 1 - it.punch * 0.22;
    if (it.state === 'dying') {
      // squash flat, then shrink into a scrap cube and vanish
      const k = Math.min(1, it.t / 0.32);
      sx *= 1 + k * 0.25; sy *= Math.max(0.05, 1 - k * 0.9);
    }
    const sh = o.shake * 4 * this.e.view.u;
    const z = it.s;
    l.save();
    l.translate(Math.round((it.x + (Math.random() - 0.5) * sh) / P) * P, Math.round((it.y - it.off) / P) * P);
    l.scale(z * sx, z * sy);
    const lw = P / (z * Math.max(0.3, Math.min(sx, sy)));
    const rim = lw * Math.max(1, Math.min(2, Math.round(z * 1.2 / P)));
    const frac = o.frac;
    const tmp = [0, 0];
    l.lineJoin = 'miter';
    for (const p of o.parts) {
      if (p.detached) continue;
      const fill = p.spec.fill;
      if (p.spec.open) {
        const pa = this.path(p, false);
        const wd = Math.max(lw * 1.5, p.spec.width ?? 2);
        l.strokeStyle = shade(fill, -0.7); l.lineWidth = wd + lw * 2; l.stroke(pa);
        l.strokeStyle = fill; l.lineWidth = wd; l.stroke(pa);
        continue;
      }
      const pa = this.path(p, true);
      l.save();
      l.clip(pa);
      l.fillStyle = shade(fill, -0.42); l.fill(pa);
      l.translate(-rim, -rim); l.fillStyle = shade(fill, 0.35); l.fill(pa); l.translate(rim, rim);
      l.save(); l.translate(rim, rim); l.clip(pa); l.translate(-rim * 2, -rim * 2); l.fillStyle = fill; l.fill(pa); l.restore();
      if (p.mat.id === 'glass') {
        l.fillStyle = 'rgba(255,255,255,0.4)';
        const gw = (p.bx1 - p.bx0), gh = (p.by1 - p.by0);
        l.beginPath(); l.moveTo(p.bx0 + gw * 0.25, p.by0); l.lineTo(p.bx0 + gw * 0.38, p.by0); l.lineTo(p.bx0 + gw * 0.38 - gh * 0.5, p.by1); l.lineTo(p.bx0 + gw * 0.25 - gh * 0.5, p.by1); l.fill();
      }
      if (frac > 0.05) { l.fillStyle = `rgba(30,15,0,${Math.min(0.32, frac * 0.3)})`; l.fill(pa); }
      if (p.mat.crease > 0.3 && o.comp > 0.06) this.drawFolds(o, p, lw);
      if (o.flash > 0.2) { l.fillStyle = `rgba(255,255,255,${o.flash * 0.35})`; l.fill(pa); }
      l.restore();
      l.strokeStyle = shade(fill, -0.75); l.lineWidth = lw; l.stroke(pa);
      if (p.cracks.length) {
        l.strokeStyle = p.mat.id === 'glass' ? 'rgba(255,255,255,0.95)' : 'rgba(40,20,5,0.9)';
        l.lineWidth = lw;
        l.beginPath();
        for (const cr of p.cracks) for (let i = 0; i < cr.length; i += 2) {
          o.crackPoint(p, cr[i], cr[i + 1], tmp);
          i ? l.lineTo(tmp[0], tmp[1]) : l.moveTo(tmp[0], tmp[1]);
        }
        l.stroke();
      }
    }
    l.restore();
  }

  /** zig-zag crease lines across a part, densifying as the item compresses */
  private drawFolds(o: WreckObject, p: RtPart, lw: number) {
    const l = this.l;
    const n = 3 + Math.floor(o.comp * 8);
    const a = Math.min(0.6, o.comp * p.mat.crease * 1.2);
    const x0 = p.bx0 * 1.6, x1 = p.bx1 * 1.6;
    for (let i = 1; i < n; i++) {
      const y = -(o.H * (1 - o.comp)) * (i / n) + Math.sin(i * 3.7 + o.seed) * lw * 2;
      l.beginPath();
      const segs = 7;
      for (let s = 0; s <= segs; s++) { const x = x0 + ((x1 - x0) * s) / segs; const yy = y + (s % 2 ? lw * 2 : -lw); s ? l.lineTo(x, yy) : l.moveTo(x, yy); }
      l.strokeStyle = `rgba(0,0,0,${a})`; l.lineWidth = lw; l.stroke();
      l.translate(0, lw); l.strokeStyle = `rgba(255,255,255,${a * 0.5})`; l.stroke(); l.translate(0, -lw);
    }
  }

  private drawAuto() {
    const l = this.l, P = this.P;
    for (const f of this.e.tools.autoFx) {
      const k = f.t / 0.25;
      const y = f.y - 30 * this.e.view.u * k;
      this.block(f.x - P * 6, y - P * 5, P * 12, P * 5, '#9b59b6');
      l.fillStyle = '#fff'; l.fillRect(f.x - P * 3, y - P * 4, P * 2, P * 2); l.fillRect(f.x + P, y - P * 4, P * 2, P * 2);
    }
    const ph = this.e.tools.phantom;
    if (ph) {
      const fall = ph.t < 0.5 ? (ph.t / 0.5) ** 2 : 1;
      const y = ph.y * fall;
      l.globalAlpha = ph.t < 0.5 ? 0.6 : 0.6 * (1 - (ph.t - 0.5) * 2);
      const w = 70 * this.e.view.u;
      this.block(ph.x - w / 2, y - 18 * this.e.view.u, w, 18 * this.e.view.u, '#a29bfe');
      l.globalAlpha = 1;
    }
  }

  // ------------------------------------------------------------ cartoon tools
  private block(x: number, y: number, w: number, h: number, c: string) {
    const l = this.l, P = this.P;
    x = Math.round(x / P) * P; y = Math.round(y / P) * P; w = Math.round(w / P) * P; h = Math.round(h / P) * P;
    if (w <= 0 || h <= 0) return;
    l.fillStyle = shade(c, -0.75); l.fillRect(x - P, y - P, w + P * 2, h + P * 2);
    l.fillStyle = shade(c, -0.3); l.fillRect(x, y, w, h);
    l.fillStyle = c; l.fillRect(x, y, w - P, h - P);
    l.fillStyle = shade(c, 0.35); l.fillRect(x, y, w - P, P);
  }

  private poly(pts: number[], c: string, k: number) {
    const l = this.l;
    l.beginPath();
    for (let i = 0; i < pts.length; i += 2) i ? l.lineTo(pts[i] * k, pts[i + 1] * k) : l.moveTo(pts[i] * k, pts[i + 1] * k);
    l.closePath();
    l.fillStyle = c; l.fill();
    l.strokeStyle = shade(c, -0.75); l.lineWidth = this.P; l.stroke();
  }

  /** pixel eye: white square + pupil looking at (lx,ly) direction */
  private eye(x: number, y: number, s: number, angry = false) {
    const l = this.l, P = this.P;
    const q = (v: number) => Math.round(v / P) * P;
    l.fillStyle = '#111'; l.fillRect(q(x - s / 2) - P, q(y - s / 2) - P, q(s) + P * 2, q(s) + P * 2);
    l.fillStyle = '#fff'; l.fillRect(q(x - s / 2), q(y - s / 2), q(s), q(s));
    l.fillStyle = '#111'; l.fillRect(q(x), q(y - s * 0.1), Math.max(P, q(s / 2)), Math.max(P, q(s / 2)));
    if (angry) { l.fillStyle = '#111'; l.fillRect(q(x - s / 2) - P, q(y - s / 2) - P * 2, q(s) + P * 2, P * 2); }
  }

  private drawTool() {
    const e = this.e, tool = e.tool, l = this.l, P = this.P, inp = e.input;
    if (e.phase !== 'run' && !inp.hover) return;
    if (inp.touch && !inp.down && e.tools.anim <= 0) return;
    const x = Math.round(e.tools.x / P) * P, y = Math.round(e.tools.y / P) * P;
    const R = e.econ.toolRadius(tool) * e.view.u;
    const a = e.tools.anim;
    if (inp.touch && inp.down) {
      l.fillStyle = 'rgba(255,255,255,0.35)';
      for (let yy = inp.y - P * 4; yy > y + P * 4; yy -= P * 3) l.fillRect(Math.round(inp.x / P) * P, Math.round(yy / P) * P, P, P);
    }
    // reach ring
    l.fillStyle = 'rgba(255,255,255,0.22)';
    for (let i = 0; i < 24; i++) { const an = (i / 24) * Math.PI * 2 + this.t; l.fillRect(Math.round((x + Math.cos(an) * R) / P) * P, Math.round((y + Math.sin(an) * R * 0.6) / P) * P, P, P); }
    l.save();
    l.translate(x, y);
    const k = R / 3; // tool units: the contact area is ~3 units wide
    switch (tool.kind) {
      case 'pinch': this.drawShark(k, a, tool.color); break;
      case 'strike': this.drawHammer(k, a, tool.id === 'sledge', tool.color); break;
      case 'press': this.drawPress(k, a, tool.id, tool.color, y); break;
      case 'implode': this.drawHole(k, a); break;
    }
    l.restore();
  }

  /** Alicate Dentuço: shark-mouth jaws biting around the contact point */
  private drawShark(k: number, a: number, color: string) {
    const l = this.l;
    const open = 1.4 * (1 - a) + 0.15;
    l.rotate(-0.35);
    for (const s of [-1, 1]) {
      const g = open * s;
      const jaw = [-3.4, g + 0.2 * s, -3.6, g + 1.6 * s, 1.5, g + 2.0 * s, 3.6, g * 0.4 + 1.1 * s, 3.6, g * 0.4];
      this.poly(jaw, s < 0 ? '#5d8aa8' : '#4a7391', k);
      // teeth
      for (let x = -3.1; x < 1.4; x += 0.75) this.poly([x, g, x + 0.55, g, x + 0.27, g - 0.55 * s], '#ffffff', k);
    }
    // handles
    const hs = 0.7 + 0.5 * (1 - a);
    this.poly([3.4, -0.6, 9.5, -1.6 - hs, 9.8, -0.6 - hs, 3.6, 0.2], color, k);
    this.poly([3.4, 0.6, 9.5, 1.6 + hs, 9.8, 0.6 + hs, 3.6, -0.2], color, k);
    this.poly([3.0, -0.6, 4.2, -0.6, 4.2, 0.6, 3.0, 0.6], '#dfe6e9', k);
    this.eye(-0.6 * k, (-open - 1.1) * k, k * 0.9, true);
    this.l.fillStyle = 'rgba(255,255,255,0.5)'; l.fillRect(-2.6 * k, (-open - 1.7) * k, 2 * k, this.P);
  }

  /** Martelo Carrancudo / Marreta Trovão */
  private drawHammer(k: number, a: number, big: boolean, color: string) {
    const L = big ? 11 : 9, hw = big ? 4.2 : 3.2, hh = big ? 2.6 : 1.9;
    const pivotX = L * k, pivotY = -hw * 0.5 * k;
    this.l.rotate(-0.25);
    this.l.translate(pivotX, pivotY); this.l.rotate(0.55 * (1 - a)); this.l.translate(-pivotX, -pivotY);
    this.poly([hh / 2, -hw / 2 - 0.35, L, -hw / 2 - 0.45, L, -hw / 2 + 0.45, hh / 2, -hw / 2 + 0.35], '#a0522d', k);
    this.poly([L - 3, -hw / 2 - 0.55, L + 0.3, -hw / 2 - 0.55, L + 0.3, -hw / 2 + 0.55, L - 3, -hw / 2 + 0.55], '#3d2b1f', k);
    this.poly([-hh / 2, 0, hh / 2, 0, hh / 2 + 0.3, -hw, -hh / 2 - 0.3, -hw], big ? '#636e72' : color, k);
    // angry face on the head
    this.eye(-0.35 * k, -hw * 0.62 * k, k * 0.6, true);
    this.l.fillStyle = '#111'; this.l.fillRect(-0.5 * k, -hw * 0.3 * k, k * 0.8, this.P);
    if (big) { this.l.fillStyle = '#f1c40f'; this.poly([0.1, -hw * 0.95, -0.4, -hw * 0.55, 0.15, -hw * 0.55, -0.3, -hw * 0.15, 0.5, -hw * 0.6, 0, -hw * 0.6], '#f1c40f', k); }
  }

  /** Presses: a monster block that drops on the contact point */
  private drawPress(k: number, a: number, id: string, color: string, sy: number) {
    const l = this.l, P = this.P;
    const lift = (1 - a) * 4.5 * k;
    const w = 7 * k, h = 4 * k;
    const top = -h - lift;
    if (id !== 'anvil') this.block(-k * 0.8, -sy - 10, k * 1.6, sy + 10 + top, '#b2bec3'); // piston rod to the ceiling
    if (id === 'anvil') {
      this.poly([-3.5, -1.2, 3.5, -1.2, 2.2, -2.2, 4.2, -3.6, -4.2, -3.6, -2.2, -2.2], '#57606f', k);
      l.translate(0, -lift);
      return;
    }
    if (id === 'gravity') {
      this.block(-w / 2, top, w, h, color);
      for (let i = 0; i < 3; i++) this.block(-w / 2 + i * w / 3 + P, top - k, w / 3 - P * 2, k * 1.2, shade(color, 0.2));
      l.fillStyle = 'rgba(162,155,254,0.25)'; l.fillRect(-w / 2, top + h, w, lift);
      return;
    }
    this.block(-w / 2, top, w, h, color);
    // mouth with teeth
    l.fillStyle = '#2d0b0b'; l.fillRect(Math.round(-w * 0.38 / P) * P, Math.round((top + h * 0.45) / P) * P, Math.round(w * 0.76 / P) * P, Math.round(h * 0.4 / P) * P);
    l.fillStyle = '#fff';
    for (let x = -w * 0.36; x < w * 0.36; x += k * 0.8) l.fillRect(Math.round(x / P) * P, Math.round((top + h * 0.45) / P) * P, Math.max(P, Math.round(k * 0.4 / P) * P), Math.max(P, Math.round(k * 0.45 / P) * P));
    this.eye(-w * 0.22, top + h * 0.22, k * 0.9, true);
    this.eye(w * 0.22, top + h * 0.22, k * 0.9, true);
    if (id === 'dragon') {
      this.poly([-3.4, (top / k), -4.4, top / k - 1.6, -2.6, top / k], '#f6e58d', k);
      this.poly([3.4, (top / k), 4.4, top / k - 1.6, 2.6, top / k], '#f6e58d', k);
    }
    // hazard teeth plate at the bottom edge
    for (let x = -w / 2; x < w / 2; x += P * 4) { l.fillStyle = '#f1c40f'; l.fillRect(Math.round(x / P) * P, Math.round((top + h - P * 2) / P) * P, P * 2, P * 2); }
  }

  private drawHole(k: number, a: number) {
    const l = this.l, P = this.P;
    for (let i = 0; i < 6; i++) {
      const r = (2.8 - ((this.t * 2 + i / 6) % 1) * 2.4) * k;
      l.strokeStyle = `rgba(0,206,201,${0.25 + a * 0.5})`; l.lineWidth = P;
      l.beginPath(); l.ellipse(0, 0, r, r * 0.6, this.t + i, 0, 7); l.stroke();
    }
    l.fillStyle = '#05060a'; l.beginPath(); l.arc(0, 0, k * (0.8 + a * 0.3), 0, 7); l.fill();
    this.eye(-0.3 * k, -0.1 * k, k * 0.35); this.eye(0.3 * k, -0.1 * k, k * 0.35);
  }
}
