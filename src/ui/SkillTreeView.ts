import type { GameEngine } from '../core/GameEngine';
import type { SkillNode } from '../core/types';
import { SKILLS, SKILL_MAP, describeEffect } from '../data/skills';
import { fmt } from '../core/util';
import type { NodeState } from '../systems/SkillTreeManager';

const CUR_ICON = { scrap: '⚙️', sp: '🧠', rare: '💎' } as const;

/** Full-screen, pannable/zoomable skill network (mouse, wheel, touch drag and pinch). */
export class SkillTreeView {
  isOpen = false;
  private ctx: CanvasRenderingContext2D;
  private cam = { x: 0, y: 0, s: 0.8 };
  private selected: SkillNode | null = null;
  private ptrs = new Map<number, { x: number; y: number }>();
  private moved = 0;
  private pinch0 = 0;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private t = 0;
  private raf = 0;
  private states = new Map<string, NodeState>();

  constructor(private e: GameEngine, private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    canvas.addEventListener('pointerdown', (ev) => this.down(ev));
    canvas.addEventListener('pointermove', (ev) => this.move(ev));
    canvas.addEventListener('pointerup', (ev) => this.up(ev));
    canvas.addEventListener('pointercancel', (ev) => this.ptrs.delete(ev.pointerId));
    canvas.addEventListener('wheel', (ev) => { ev.preventDefault(); this.zoomAt(ev.offsetX, ev.offsetY, Math.exp(-ev.deltaY * 0.0015)); }, { passive: false });
    document.querySelector('[data-tree-close]')!.addEventListener('click', () => this.close());
    document.querySelector('[data-tree-center]')!.addEventListener('click', () => { this.cam.x = 0; this.cam.y = 0; this.cam.s = 0.8; });
    document.getElementById('tree-info')!.addEventListener('click', (ev) => {
      const b = (ev.target as HTMLElement).closest<HTMLElement>('[data-buy-skill]');
      if (b) this.buy(b.dataset.buySkill!);
    });
    window.addEventListener('resize', () => this.isOpen && this.resize());
  }

  open() {
    this.isOpen = true;
    document.getElementById('tree')!.classList.remove('hidden');
    this.resize();
    this.renderInfo();
    const loop = (tm: number) => { this.t = tm / 1000; this.draw(); if (this.isOpen) this.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  }
  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    cancelAnimationFrame(this.raf);
    document.getElementById('tree')!.classList.add('hidden');
    this.e.persist();
  }

  private resize() {
    const r = this.canvas.getBoundingClientRect();
    this.w = r.width; this.h = r.height;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = this.w * this.dpr; this.canvas.height = this.h * this.dpr;
  }

  private toWorld(x: number, y: number) { return { x: (x - this.w / 2) / this.cam.s + this.cam.x, y: (y - this.h / 2) / this.cam.s + this.cam.y }; }

  private zoomAt(sx: number, sy: number, k: number) {
    const before = this.toWorld(sx, sy);
    this.cam.s = Math.min(2.5, Math.max(0.2, this.cam.s * k));
    const after = this.toWorld(sx, sy);
    this.cam.x += before.x - after.x; this.cam.y += before.y - after.y;
  }

  private down(ev: PointerEvent) {
    this.canvas.setPointerCapture(ev.pointerId);
    this.ptrs.set(ev.pointerId, { x: ev.offsetX, y: ev.offsetY });
    this.moved = 0;
    if (this.ptrs.size === 2) { const [a, b] = [...this.ptrs.values()]; this.pinch0 = Math.hypot(a.x - b.x, a.y - b.y); }
  }
  private move(ev: PointerEvent) {
    const p = this.ptrs.get(ev.pointerId);
    if (!p) return;
    const dx = ev.offsetX - p.x, dy = ev.offsetY - p.y;
    if (this.ptrs.size === 1) {
      this.cam.x -= dx / this.cam.s; this.cam.y -= dy / this.cam.s;
      this.moved += Math.abs(dx) + Math.abs(dy);
    }
    p.x = ev.offsetX; p.y = ev.offsetY;
    if (this.ptrs.size === 2) {
      const [a, b] = [...this.ptrs.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (this.pinch0 > 0) this.zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, d / this.pinch0);
      this.pinch0 = d;
      this.moved += 20;
    }
  }
  private up(ev: PointerEvent) {
    const wasSingle = this.ptrs.size === 1;
    this.ptrs.delete(ev.pointerId);
    if (!wasSingle || this.moved > 10) return;
    const w = this.toWorld(ev.offsetX, ev.offsetY);
    let best: SkillNode | null = null, bd = 40 / Math.min(1, this.cam.s);
    for (const n of SKILLS) {
      if (this.state(n) === 'hidden') continue;
      const d = Math.hypot(n.x - w.x, n.y - w.y);
      if (d < bd) { bd = d; best = n; }
    }
    if (best && best === this.selected && this.e.tree.canBuy(best)) this.buy(best.id);
    this.selected = best;
    this.e.audio.click();
    this.renderInfo();
  }

  private buy(id: string) {
    if (this.e.tree.buy(id)) {
      this.e.econ.recompute();
      this.e.audio.buy();
      this.e.persist();
      this.renderInfo();
    }
  }

  private state(n: SkillNode) { return this.states.get(n.id) ?? this.e.tree.state(n); }

  private renderInfo() {
    const el = document.getElementById('tree-info')!;
    const n = this.selected;
    const s = this.e.save;
    document.getElementById('tree-res')!.innerHTML = `<span class="res">⚙️ <b>${fmt(s.scrap)}</b></span><span class="res">🧠 <b>${fmt(s.sp)}</b></span><span class="res">💎 <b>${fmt(s.rare)}</b></span>`;
    document.getElementById('tree-count')!.textContent = `· ${this.e.tree.ownedCount()}/${SKILLS.length}`;
    if (!n) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    const tr = this.e.tree;
    const lvl = tr.level(n.id);
    const st = tr.state(n);
    const cost = tr.cost(n);
    const reason = tr.reqReason(n);
    const prereq = !tr.prereqsMet(n) ? (n.all ? 'Requer todos os nós conectados' : 'Requer um nó conectado') : null;
    const eff = n.effects.map((f) => `<div class="eff">${lvl ? `Atual: ${describeEffect(f.stat, f.v * lvl)} · ` : ''}Próximo: ${describeEffect(f.stat, f.v)}</div>`).join('');
    const maxed = st === 'maxed';
    el.innerHTML = `<div class="fam" style="color:${n.color}">${n.family}${n.kind === 'special' ? ' · ESPECIAL' : n.kind === 'milestone' ? ' · MARCO' : n.kind === 'infinite' ? ' · INFINITO' : n.kind === 'cross' ? ' · CONEXÃO' : ''}</div>
      <h3>${n.icon} ${n.name}</h3><p>${n.desc}</p>${eff}
      <div class="sub">Nível ${lvl}${n.max ? ` / ${n.max}` : ' / ∞'}</div>
      ${maxed ? '<button class="btn" disabled>MÁXIMO</button>' : `<button class="btn" data-buy-skill="${n.id}" ${tr.canBuy(n) ? '' : 'disabled'}>${reason ?? prereq ?? `Comprar · ${CUR_ICON[n.curr]} ${fmt(cost)}`}</button>`}`;
  }

  private draw() {
    const ctx = this.ctx, tr = this.e.tree;
    this.states.clear();
    for (const n of SKILLS) this.states.set(n.id, tr.state(n));
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = '#07080c';
    ctx.fillRect(0, 0, this.w, this.h);
    // parallax star dust
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    for (let i = 0; i < 90; i++) {
      const x = ((i * 137.5 - this.cam.x * 0.15) % this.w + this.w) % this.w;
      const y = ((i * 91.3 - this.cam.y * 0.15) % this.h + this.h) % this.h;
      ctx.fillRect(x, y, 1.5, 1.5);
    }
    const s = this.cam.s;
    ctx.translate(this.w / 2, this.h / 2);
    ctx.scale(s, s);
    ctx.translate(-this.cam.x, -this.cam.y);
    // region rings
    ctx.strokeStyle = 'rgba(242,165,22,0.06)'; ctx.lineWidth = 2 / s;
    for (let r = 1; r <= 14; r += 3) { ctx.beginPath(); ctx.arc(0, 0, r * 120 + 60, 0, 7); ctx.stroke(); }
    const vx0 = this.cam.x - this.w / 2 / s - 60, vx1 = this.cam.x + this.w / 2 / s + 60;
    const vy0 = this.cam.y - this.h / 2 / s - 60, vy1 = this.cam.y + this.h / 2 / s + 60;
    // edges
    for (const n of SKILLS) {
      const sn = this.state(n);
      if (sn === 'hidden') continue;
      for (const pid of n.prereqs) {
        const p = SKILL_MAP[pid];
        const sp = this.state(p);
        if (sp === 'hidden') continue;
        const lit = (sn === 'owned' || sn === 'maxed') && (sp === 'owned' || sp === 'maxed');
        ctx.strokeStyle = lit ? n.color : sn === 'available' ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.1)';
        ctx.lineWidth = (lit ? 4 : 2) / Math.max(0.6, s);
        if (n.all && !lit) ctx.setLineDash([8, 6]);
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(n.x, n.y); ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    // nodes
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const pulse = 0.5 + 0.5 * Math.sin(this.t * 4);
    for (const n of SKILLS) {
      if (n.x < vx0 || n.x > vx1 || n.y < vy0 || n.y > vy1) continue;
      const st = this.state(n);
      if (st === 'hidden') continue;
      const r = n.kind === 'root' ? 36 : n.kind === 'special' || n.kind === 'infinite' || n.kind === 'milestone' ? 30 : n.kind === 'side' ? 22 : 26;
      const can = st === 'available' && tr.canBuy(n);
      if (can) { ctx.fillStyle = `rgba(46,204,113,${0.15 + pulse * 0.25})`; ctx.beginPath(); ctx.arc(n.x, n.y, r + 10, 0, 7); ctx.fill(); }
      ctx.fillStyle = st === 'owned' || st === 'maxed' ? n.color : st === 'available' ? '#2a2f3a' : '#16181f';
      ctx.beginPath();
      if (n.kind === 'special' || n.kind === 'milestone') {
        for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; ctx.lineTo(n.x + Math.cos(a) * r, n.y + Math.sin(a) * r); }
        ctx.closePath();
      } else ctx.arc(n.x, n.y, r, 0, 7);
      ctx.fill();
      ctx.lineWidth = n === this.selected ? 4 : 2.5;
      ctx.strokeStyle = n === this.selected ? '#fff' : st === 'maxed' ? '#ffd700' : st === 'locked' ? '#333845' : can ? '#2ecc71' : n.color;
      ctx.stroke();
      ctx.globalAlpha = st === 'locked' ? 0.35 : 1;
      ctx.font = `${r * 0.95}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      ctx.fillText(st === 'locked' && n.hidden ? '?' : n.icon, n.x, n.y + 1);
      ctx.globalAlpha = 1;
      const lvl = tr.level(n.id);
      if (lvl > 0 || n.kind === 'infinite') {
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.fillStyle = '#000c';
        ctx.beginPath(); ctx.arc(n.x + r * 0.75, n.y + r * 0.75, 11, 0, 7); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillText(n.kind === 'infinite' && !lvl ? '∞' : String(lvl), n.x + r * 0.75, n.y + r * 0.75 + 1);
      }
      if (s > 0.55 && st !== 'locked') {
        ctx.font = '600 11px system-ui, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.fillText(n.name, n.x, n.y + r + 12);
      }
    }
  }
}
