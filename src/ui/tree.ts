import type { Game } from '../game/game';
import { SKILLS, SKILL, type SkillNode } from '../data/skills';
import { buySkill, canBuySkill, skillCost, skillLevel, skillMaxed, skillVisible } from '../game/stats';
import { fmt } from '../core/util';

/** Pannable, zoomable skill tree (drag, pinch, wheel). Tap a node to inspect, tap again to buy. */
export class TreeView {
  isOpen = false;
  private ctx: CanvasRenderingContext2D;
  private cam = { x: 0, y: 0, s: 1 };
  private sel: SkillNode | null = null;
  private ptrs = new Map<number, { x: number; y: number }>();
  private moved = 0;
  private pinch0 = 0;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private raf = 0;
  private t = 0;

  constructor(private g: Game, private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    canvas.addEventListener('pointerdown', (e) => { canvas.setPointerCapture(e.pointerId); this.ptrs.set(e.pointerId, { x: e.offsetX, y: e.offsetY }); this.moved = 0; if (this.ptrs.size === 2) this.pinch0 = this.pdist(); });
    canvas.addEventListener('pointermove', (e) => this.move(e));
    canvas.addEventListener('pointerup', (e) => this.up(e));
    canvas.addEventListener('pointercancel', (e) => this.ptrs.delete(e.pointerId));
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); this.zoom(e.offsetX, e.offsetY, Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
    document.getElementById('tree-close')!.addEventListener('click', () => this.close());
    document.getElementById('tree-info')!.addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest<HTMLElement>('[data-buy]'); if (b) this.buy(b.dataset.buy!); });
    window.addEventListener('resize', () => this.isOpen && this.resize());
  }

  open() {
    this.isOpen = true;
    document.getElementById('tree')!.classList.remove('hidden');
    this.resize();
    if (!this.sel) { this.cam.s = Math.min(1.1, Math.max(0.55, Math.min(this.w, this.h) / 520)); this.cam.x = 0; this.cam.y = 0; }
    this.info();
    const loop = (tm: number) => { this.t = tm / 1000; this.draw(); if (this.isOpen) this.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    cancelAnimationFrame(this.raf);
    document.getElementById('tree')!.classList.add('hidden');
    this.g.persist();
    this.g.ui.afterUpgrade();
  }

  private resize() {
    const r = this.canvas.getBoundingClientRect();
    this.w = r.width; this.h = r.height; this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = this.w * this.dpr; this.canvas.height = this.h * this.dpr;
  }

  private pdist() { const [a, b] = [...this.ptrs.values()]; return Math.hypot(a.x - b.x, a.y - b.y); }
  private world(x: number, y: number) { return { x: (x - this.w / 2) / this.cam.s + this.cam.x, y: (y - this.h / 2) / this.cam.s + this.cam.y }; }
  private zoom(sx: number, sy: number, k: number) {
    const a = this.world(sx, sy);
    this.cam.s = Math.min(2.4, Math.max(0.3, this.cam.s * k));
    const b = this.world(sx, sy);
    this.cam.x += a.x - b.x; this.cam.y += a.y - b.y;
  }
  private move(e: PointerEvent) {
    const p = this.ptrs.get(e.pointerId);
    if (!p) return;
    const dx = e.offsetX - p.x, dy = e.offsetY - p.y;
    p.x = e.offsetX; p.y = e.offsetY;
    if (this.ptrs.size === 1) { this.cam.x -= dx / this.cam.s; this.cam.y -= dy / this.cam.s; this.moved += Math.abs(dx) + Math.abs(dy); }
    else if (this.ptrs.size === 2) {
      const [a, b] = [...this.ptrs.values()];
      const d = this.pdist();
      if (this.pinch0) this.zoom((a.x + b.x) / 2, (a.y + b.y) / 2, d / this.pinch0);
      this.pinch0 = d; this.moved += 20;
    }
  }
  private up(e: PointerEvent) {
    const single = this.ptrs.size === 1;
    this.ptrs.delete(e.pointerId);
    if (!single || this.moved > 10) return;
    const w = this.world(e.offsetX, e.offsetY);
    let best: SkillNode | null = null, bd = 34 / Math.min(1, this.cam.s);
    for (const n of SKILLS) {
      if (!skillVisible(this.g.save, n.id)) continue;
      const d = Math.hypot(n.x - w.x, n.y - w.y);
      if (d < bd) { bd = d; best = n; }
    }
    if (best && best === this.sel && canBuySkill(this.g.save, best.id)) this.buy(best.id);
    else { this.sel = best; this.g.audio.click(); }
    this.info();
  }

  private buy(id: string) {
    if (!buySkill(this.g.save, id)) return;
    this.g.refreshStats();
    this.g.audio.buy();
    this.g.persist();
    this.info();
  }

  private info() {
    const s = this.g.save;
    document.getElementById('tree-res')!.innerHTML = `<span>🧹 <b>${fmt(s.po)}</b></span><span>🌟 <b>${fmt(s.brilho)}</b></span>`;
    const el = document.getElementById('tree-info')!;
    const n = this.sel;
    if (!n) { el.innerHTML = '<p class="hint">Toque num nó para ver. Toque de novo para comprar.</p>'; return; }
    const lvl = skillLevel(s, n.id), maxed = skillMaxed(s, n.id), cost = skillCost(s, n.id);
    const cur = n.curr === 'po' ? '🧹' : '🌟';
    el.innerHTML = `<div class="ti-head"><span class="ti-ico">${n.icon}</span><div><b>${n.name}</b><small>Nível ${lvl}${n.max ? '/' + n.max : ''}</small></div></div>
      <p>${n.desc}</p>
      ${maxed ? '<button class="btn" disabled>COMPLETO</button>' : `<button class="btn go" data-buy="${n.id}" ${canBuySkill(s, n.id) ? '' : 'disabled'}>Comprar · ${cur} ${fmt(cost)}</button>`}`;
  }

  private draw() {
    const c = this.ctx, s = this.g.save;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.fillStyle = '#1d1427'; c.fillRect(0, 0, this.w, this.h);
    c.fillStyle = 'rgba(255,255,255,0.04)';
    const off = { x: (-this.cam.x * this.cam.s) % 24, y: (-this.cam.y * this.cam.s) % 24 };
    for (let y = off.y - 24; y < this.h; y += 24) for (let x = off.x - 24; x < this.w; x += 24) c.fillRect(x, y, 2, 2);
    c.translate(this.w / 2, this.h / 2); c.scale(this.cam.s, this.cam.s); c.translate(-this.cam.x, -this.cam.y);
    // links
    for (const n of SKILLS) {
      if (!n.parent || !skillVisible(s, n.id)) continue;
      const p = SKILL[n.parent];
      const own = skillLevel(s, n.id) > 0;
      c.strokeStyle = own ? n.color : 'rgba(255,255,255,0.22)';
      c.lineWidth = own ? 6 : 4;
      c.setLineDash(own ? [] : [8, 8]);
      c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(n.x, n.y); c.stroke();
    }
    c.setLineDash([]);
    // silhouettes of the next layer
    for (const n of SKILLS) {
      if (skillVisible(s, n.id) || !n.parent || !skillVisible(s, n.parent)) continue;
      c.fillStyle = 'rgba(255,255,255,0.06)'; this.box(c, n.x, n.y, 22);
      c.font = '18px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillText('?', n.x, n.y);
    }
    const pulse = 0.5 + 0.5 * Math.sin(this.t * 5);
    for (const n of SKILLS) {
      if (!skillVisible(s, n.id)) continue;
      const lvl = skillLevel(s, n.id), can = canBuySkill(s, n.id), maxed = skillMaxed(s, n.id);
      const r = n.id === 'root' ? 34 : n.curr === 'brilho' ? 30 : 28;
      if (can) { c.fillStyle = `rgba(123,237,159,${0.15 + pulse * 0.25})`; this.box(c, n.x, n.y, r + 9); }
      c.fillStyle = '#000'; this.box(c, n.x + 3, n.y + 4, r);
      c.fillStyle = lvl > 0 ? '#3b2f4a' : '#261d31'; this.box(c, n.x, n.y, r);
      c.strokeStyle = n === this.sel ? '#ffffff' : maxed ? '#ffe66d' : can ? '#7bed9f' : lvl > 0 ? n.color : '#4d3f5c';
      c.lineWidth = n === this.sel ? 5 : 4; this.box(c, n.x, n.y, r, true);
      if (n.curr === 'brilho') { c.fillStyle = '#ffe66d'; c.fillRect(n.x - r + 4, n.y - r + 4, 6, 6); }
      c.globalAlpha = lvl > 0 || can ? 1 : 0.55;
      c.font = `${r}px system-ui, "Apple Color Emoji", "Segoe UI Emoji"`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(n.icon, n.x, n.y + 2);
      c.globalAlpha = 1;
      if (lvl > 0 && n.id !== 'root') {
        c.font = "10px 'Press Start 2P', monospace"; c.fillStyle = '#000'; c.fillRect(n.x + r - 22, n.y + r - 12, 26, 16);
        c.fillStyle = maxed ? '#ffe66d' : '#fff'; c.fillText(n.max === 1 ? '✔' : String(lvl), n.x + r - 9, n.y + r - 3);
      }
      if (this.cam.s > 0.6) { c.font = '700 12px Nunito, system-ui'; c.fillStyle = 'rgba(255,255,255,0.85)'; c.fillText(n.name, n.x, n.y + r + 14); }
    }
  }

  private box(c: CanvasRenderingContext2D, x: number, y: number, r: number, stroke = false) {
    const k = 6;
    c.beginPath();
    c.moveTo(x - r + k, y - r); c.lineTo(x + r - k, y - r); c.lineTo(x + r, y - r + k); c.lineTo(x + r, y + r - k);
    c.lineTo(x + r - k, y + r); c.lineTo(x - r + k, y + r); c.lineTo(x - r, y + r - k); c.lineTo(x - r, y - r + k); c.closePath();
    stroke ? c.stroke() : c.fill();
  }
}
