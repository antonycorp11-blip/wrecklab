import { Audio } from '../core/audio';
import { Save, type SaveData, type PlaceState, blankPlace } from '../core/save';
import { clamp, fmt } from '../core/util';
import { GUNKS } from '../data/gunk';
import { PLACE, PLACES, type PlaceDef } from '../data/places';
import { TOOL, TOOLS } from '../data/tools';
import { FIND_SPRITES } from '../data/finds';
import { computeStats, type Stats } from './stats';
import { Surface, type Find } from './surface';
import type { UI } from '../ui/ui';

export type Screen = 'board' | 'place' | 'shift' | 'summary';

export interface ShiftResult {
  place: PlaceDef;
  clean: number;
  best: number;
  jar: number;
  polishBonus: number;
  tips: number;
  finds: Find[];
  stamped: boolean;
  polished: boolean;
  newStamp: boolean;
  newPolish: boolean;
  unlocked: PlaceDef[];
  jarFull: boolean;
}

interface Mote { x: number; y: number; vx: number; vy: number; t: number; c: string }
interface Pop { x: number; y: number; t: number; sprite: string; name: string }

/** Owns the save, the current surface, the shift loop, input and the canvas. */
export class Game {
  save: SaveData;
  stats: Stats;
  audio = new Audio();
  ui!: UI;
  screen: Screen = 'board';
  place: PlaceDef = PLACES[0];
  surface: Surface;

  // shift state
  timeLeft = 0;
  timeMax = 0;
  jar = 0;
  jarFull = false;
  grip = 0;
  heat = 0;
  streak = 0;
  private streakT = 0;
  private anchor = { x: 0, y: 0 };
  private lastDir: [number, number] | null = null;
  private found: Find[] = [];
  private stamped = false;
  private polished = false;
  private newStamp = false;
  private newPolish = false;
  private echoes: { x: number; y: number; r: number; p: number; t: number }[] = [];
  private crab = { x: 10, y: 40, vx: 9, vy: 5, on: false };
  private stampAnim = -1;

  // input (css px)
  px = 0;
  py = 0;
  private lx = 0;
  private ly = 0;
  active = false;
  hover = false;
  touch = false;
  private pid: number | null = null;

  // canvas
  private ctx: CanvasRenderingContext2D;
  private art = document.createElement('canvas');
  private actx: CanvasRenderingContext2D;
  w = 0;
  h = 0;
  dpr = 1;
  view = { x: 0, y: 0, s: 1 };
  private motes: Mote[] = [];
  private pops: Pop[] = [];
  private time = 0;
  private saveT = 0;
  private last = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.save = Save.load();
    this.stats = computeStats(this.save);
    this.ctx = canvas.getContext('2d')!;
    this.art.width = 72; this.art.height = 54;
    this.actx = this.art.getContext('2d')!;
    this.place = PLACE[this.save.current] ?? PLACES[0];
    this.surface = new Surface(this.place, this.ps(this.place.id).finds);
    this.applySettings();
    this.bindInput();
    window.addEventListener('resize', () => this.resize());
    window.visualViewport?.addEventListener('resize', () => this.resize());
    this.resize();
  }

  ps(id: string): PlaceState { return (this.save.places[id] ??= blankPlace()); }

  applySettings() {
    this.audio.volume = this.save.settings.volume;
    this.audio.muted = this.save.settings.muted;
    this.audio.apply();
  }

  refreshStats() { this.stats = computeStats(this.save); }

  persist() { Save.store(this.save); }

  start() {
    this.last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - this.last) / 1000);
      this.last = t;
      try { this.update(dt); this.render(); } catch (err) { console.error(err); }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    const p = () => this.persist();
    document.addEventListener('visibilitychange', () => { if (document.hidden) p(); });
    window.addEventListener('pagehide', p);
  }

  // ------------------------------------------------------------ places
  unlocked(p: PlaceDef) {
    if (p.req.cards && this.stats.cards < p.req.cards) return false;
    if (p.req.rec) { const r = this.ps(p.req.rec); return r.stamp || r.finds.every(Boolean); }
    return true;
  }
  lockHint(p: PlaceDef) {
    if (p.req.cards && this.stats.cards < p.req.cards) return `Precisa de ${p.req.cards} cartão(ões) de visita`;
    if (p.req.rec) return `Indicação de ${PLACE[p.req.rec].owner}`;
    return '';
  }

  openPlace(id: string) {
    const p = PLACE[id];
    if (!p || !this.unlocked(p)) return;
    this.place = p;
    this.save.current = id;
    this.surface = new Surface(p, this.ps(id).finds);
    this.screen = 'place';
    this.resize();
    this.ui.showPlace();
  }

  openBoard() { this.screen = 'board'; this.audio.setScrub(0, 500); this.resize(); this.ui.showBoard(); }

  // ------------------------------------------------------------ shift
  startShift() {
    if (this.screen === 'shift') return;
    this.audio.unlock();
    const st = this.stats;
    if (!TOOL[this.save.tool] || (TOOL[this.save.tool].unlock && !this.save.skills[TOOL[this.save.tool].unlock!])) this.save.tool = 'dedo';
    this.surface = new Surface(this.place, this.ps(this.place.id).finds);
    this.screen = 'shift';
    this.timeLeft = this.timeMax = st.time;
    this.jar = 0; this.jarFull = false;
    this.grip = 0; this.heat = 0; this.streak = 0; this.lastDir = null;
    this.found = []; this.stamped = false; this.polished = false; this.newStamp = false; this.newPolish = false;
    this.echoes = []; this.motes = []; this.pops = []; this.stampAnim = -1;
    this.crab = { x: 6, y: 40, vx: 11, vy: 7, on: st.helper > 0 };
    this.active = this.touch ? false : this.active;
    this.resize();
    this.ui.showShift();
    this.audio.bell();
  }

  private endShift() {
    const st = this.stats, ps = this.ps(this.place.id);
    const clean = this.surface.clean();
    const polishBonus = Math.floor(this.jar * st.polish * Math.max(0, (clean - this.place.mark) * 100));
    let tips = 0;
    const before = PLACES.filter((p) => this.unlocked(p)).map((p) => p.id);
    for (const f of this.found) {
      if (ps.finds[f.idx]) continue;
      ps.finds[f.idx] = true;
      tips += Math.ceil(this.tipBase() * (1 + st.tip));
      this.save.stats.finds++;
    }
    const gained = this.jar + polishBonus + tips;
    this.save.po += gained;
    this.save.stats.poTotal += gained;
    this.save.stats.shifts++;
    ps.shifts++;
    ps.best = Math.max(ps.best, clean);
    const unlocked = PLACES.filter((p) => this.unlocked(p) && !before.includes(p.id));
    const res: ShiftResult = {
      place: this.place, clean, best: ps.best, jar: this.jar, polishBonus, tips, finds: this.found,
      stamped: this.stamped, polished: this.polished, newStamp: this.newStamp, newPolish: this.newPolish, unlocked, jarFull: this.jarFull,
    };
    this.screen = 'summary';
    this.active = false;
    this.resize();
    this.audio.setScrub(0, 500);
    this.persist();
    this.ui.showSummary(res);
  }

  private tipBase() { return Math.round(12 * Math.pow(2.6, PLACES.indexOf(this.place))); }

  private update(dt: number) {
    this.time += dt;
    this.save.stats.playTime += dt;
    this.saveT += dt;
    if (this.saveT > 10) { this.saveT = 0; this.persist(); }
    for (const m of this.motes) {
      const tgt = this.ui.jarTarget();
      m.t += dt;
      const k = Math.min(1, m.t * 1.8);
      m.vx += ((tgt.x - m.x) * 18 * k - m.vx * 4 * k) * dt;
      m.vy += ((tgt.y - m.y) * 18 * k - m.vy * 4 * k) * dt + (k < 0.3 ? 200 * dt : 0);
      m.x += m.vx * dt; m.y += m.vy * dt;
    }
    this.motes = this.motes.filter((m) => m.t < 1.1);
    for (const p of this.pops) p.t += dt;
    this.pops = this.pops.filter((p) => p.t < 1.6);
    if (this.stampAnim >= 0) this.stampAnim += dt;
    if (this.screen === 'shift') this.updateShift(dt);
    this.surface.update(this.screen === 'shift' ? dt : 0);
    this.lx = this.px; this.ly = this.py;
    this.ui.updateHud(dt);
  }

  private updateShift(dt: number) {
    const st = this.stats, tool = TOOL[this.save.tool] ?? TOOLS[0];
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) { this.timeLeft = 0; this.endShift(); return; }
    const s = this.view.s;
    const cx = (this.px - this.view.x) / s, cy = (this.py - this.view.y) / s;
    const dx = (this.px - this.lx) / s, dy = (this.py - this.ly) / s;
    const md = Math.min(3, Math.hypot(dx, dy));
    const R = this.ringRadius();
    const under = this.surface.typeAt(cx, cy);
    const greasy = under >= 0 && GUNKS[under].id === 'gordura' && !st.slick;
    if (this.active) {
      if (Math.hypot(cx - this.anchor.x, cy - this.anchor.y) > R * 1.15) { this.anchor = { x: cx, y: cy }; this.grip = Math.max(0, this.grip - 0.5); }
      else if (greasy) this.grip = Math.max(0, this.grip - dt * 0.8);
      else if (md > 0.02 || tool.steady) this.grip = Math.min(1, this.grip + dt * st.gripRate);
    } else this.grip = Math.max(0, this.grip - dt * 2);
    if (md > 0.12) {
      const dir: [number, number] = [dx / md, dy / md];
      if (this.lastDir && dir[0] * this.lastDir[0] + dir[1] * this.lastDir[1] < -0.3) {
        this.streak = Math.min(12, this.streak + 1); this.streakT = 0.45;
        if (this.active && this.streak > 3 && Math.random() < 0.3) this.audio.squeak();
      }
      this.lastDir = dir;
    }
    this.streakT -= dt;
    if (this.streakT <= 0) this.streak = Math.max(0, this.streak - dt * 8);
    if (this.active && md > 0.05) this.heat = Math.min(1, this.heat + dt * st.heat * 0.35);
    else this.heat = Math.max(0, this.heat - dt * 0.25);

    const scrubMult = 1 + this.streak * 0.05 * (1 + st.scrub + tool.scrub);
    const opts = {
      tough: st.tough + tool.tough, vs: tool.vs, scrubMult, heat: this.heat,
      fast: md / Math.max(dt, 0.001) > 40, calm: tool.id === 'esponja' ? 1 : st.calm, sweep: st.sweep, lucky: st.lucky,
    };
    let value = 0;
    if (this.active) {
      const rub = tool.steady ? dt * 14 : md;
      if (rub > 0) {
        const power = st.bite * tool.bite * rub * (1 + this.grip * st.gripMax) * (1 + this.heat * 0.3);
        const r = this.surface.scrape(cx, cy, R, power, opts);
        value += r.value;
        if (r.cleared && Math.random() < 0.25) this.audio.sparkle();
        if (st.echo > 0) this.echoes.push({ x: cx, y: cy, r: R, p: power * st.echo, t: 0.35 });
      }
      this.audio.setScrub(Math.min(1, (tool.steady ? 0.5 : md * 0.7)), under >= 0 ? [700, 1500, 500, 380, 300, 900][under] : 600);
    } else this.audio.setScrub(0, 600);
    for (const e of this.echoes) { e.t -= dt; value += this.surface.scrape(e.x, e.y, e.r, e.p * dt * 3, { ...opts, scrubMult: 1, fast: false }).value; }
    this.echoes = this.echoes.filter((e) => e.t > 0);
    if (this.crab.on) {
      const c = this.crab;
      c.x += c.vx * dt * (1 + st.helper * 0.3); c.y += c.vy * dt * (1 + st.helper * 0.3);
      if (c.x < 3 || c.x > 69) c.vx *= -1;
      if (c.y < 3 || c.y > 51) c.vy *= -1;
      if (Math.random() < dt * 0.6) { c.vx += (Math.random() - 0.5) * 10; c.vy += (Math.random() - 0.5) * 10; }
      value += this.surface.scrape(c.x, c.y, 2.4, st.bite * 0.22 * st.helper * dt * 10, { ...opts, scrubMult: 1.2, fast: false, heat: 0.5 }).value;
    }

    // collect into the jar
    if (value > 0) {
      const v = value * (1 + st.dust);
      const room = st.jar - this.jar;
      if (room > 0) this.jar += Math.min(room, v);
      else if (!this.jarFull) { this.jarFull = true; this.audio.full(); this.ui.toast('Pote cheio! O resto vira só faxina.', '🫙'); }
      if (this.jar >= st.jar && !this.jarFull) { this.jarFull = true; this.audio.full(); this.ui.toast('Pote cheio! O resto vira só faxina.', '🫙'); }
      const n = Math.min(4, Math.ceil(v * 6));
      for (let i = 0; i < n && this.motes.length < 120; i++) {
        const g = under >= 0 ? GUNKS[under] : GUNKS[0];
        this.motes.push({ x: this.px + (Math.random() - 0.5) * 20, y: this.py + (Math.random() - 0.5) * 20, vx: (Math.random() - 0.5) * 200, vy: -100 - Math.random() * 150, t: 0, c: g.colors[1] });
      }
    }
    // stamp, polish, finds
    const clean = this.surface.clean();
    const ps = this.ps(this.place.id);
    if (!this.stamped && clean >= this.place.mark) {
      this.stamped = true;
      this.stampAnim = 0;
      this.audio.stamp();
      this.vibrate([30, 40, 60]);
      if (st.overtime) { this.timeLeft += st.overtime; this.ui.toast(`Segundo fôlego! +${st.overtime}s`, '🏁'); }
      if (!ps.stamp) { ps.stamp = true; this.newStamp = true; this.save.brilho += 1; this.save.stats.stamps++; this.ui.toast('CARIMBADO! +1 Brilho', '🌟'); }
    }
    if (!this.polished && clean >= 0.985) {
      this.polished = true;
      this.audio.stamp();
      if (!ps.polish) { ps.polish = true; this.newPolish = true; this.save.brilho += 1; this.ui.toast('Brilhando de novo! +1 Brilho', '✨'); }
    }
    for (const f of this.surface.checkFinds()) {
      this.found.push(f);
      this.audio.pop();
      this.vibrate(25);
      const [x, y] = this.toScreen(f.def.x + 3, f.def.y + 3);
      this.pops.push({ x, y, t: 0, sprite: f.def.sprite, name: f.def.name });
    }
  }

  ringRadius() {
    const tool = TOOL[this.save.tool] ?? TOOLS[0];
    return this.stats.ring * tool.ring * (1 + this.stats.quick * this.grip);
  }

  foundCount() { return this.found.length; }

  // ------------------------------------------------------------ input
  private bindInput() {
    const c = this.canvas;
    const pos = (e: PointerEvent) => { const r = c.getBoundingClientRect(); this.px = e.clientX - r.left; this.py = e.clientY - r.top; };
    c.addEventListener('pointerdown', (e) => {
      this.audio.unlock();
      if (this.pid !== null && this.pid !== e.pointerId) return;
      this.touch = e.pointerType !== 'mouse';
      pos(e); this.lx = this.px; this.ly = this.py;
      const s = this.view.s;
      this.anchor = { x: (this.px - this.view.x) / s, y: (this.py - this.view.y) / s };
      if (!this.touch && this.save.settings.latch) { this.active = !this.active; e.preventDefault(); return; }
      this.pid = e.pointerId;
      this.active = true;
      c.setPointerCapture?.(e.pointerId);
      e.preventDefault();
    });
    c.addEventListener('pointermove', (e) => { if (this.pid !== null && e.pointerId !== this.pid) return; pos(e); this.hover = true; });
    const up = (e: PointerEvent) => {
      if (e.pointerId !== this.pid) return;
      this.pid = null;
      if (this.touch || !this.save.settings.latch) this.active = false;
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    c.addEventListener('pointerleave', () => { this.hover = false; });
    c.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private vibrate(p: number | number[]) { if (this.save.settings.haptics && navigator.vibrate) try { navigator.vibrate(p); } catch { /* ignore */ } }

  // ------------------------------------------------------------ view / render
  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.w = Math.max(1, r.width); this.h = Math.max(1, r.height);
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    // landscape layout: HUD column on the left during a shift, info panel on the right otherwise
    const top = this.h < 430 ? 46 : 54;
    let ax = 8, ay = top, aw = this.w - 16, ah = this.h - top - 8;
    if (this.screen === 'shift') { ax = (this.h < 430 ? 148 : 166); aw = this.w - ax - 10; ay = 8; ah = this.h - 16; }
    else if (this.screen === 'place' || this.screen === 'summary') { aw = this.w - Math.min(this.w * 0.45, 440) - 24; }
    let s = Math.min(aw / 72, ah / 54);
    if (s >= 3) s = Math.floor(s);
    this.view = { s, x: Math.round(ax + (aw - 72 * s) / 2), y: Math.round(ay + (ah - 54 * s) / 2) };
  }

  toScreen(x: number, y: number): [number, number] { return [this.view.x + x * this.view.s, this.view.y + y * this.view.s]; }

  private render() {
    const c = this.ctx, d = this.dpr;
    c.setTransform(d, 0, 0, d, 0, 0);
    c.imageSmoothingEnabled = false;
    // cozy backdrop with a soft pixel pattern
    const [b0, b1] = this.place.bg;
    const g = c.createLinearGradient(0, 0, 0, this.h);
    g.addColorStop(0, b0); g.addColorStop(1, b1);
    c.fillStyle = g; c.fillRect(0, 0, this.w, this.h);
    c.fillStyle = 'rgba(255,255,255,0.035)';
    for (let y = 0; y < this.h; y += 16) for (let x = (y / 16) % 2 ? 8 : 0; x < this.w; x += 16) c.fillRect(x, y, 8, 8);
    if (this.screen === 'board') return;
    const { x, y, s } = this.view;
    // frame + shadow
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(x - s * 2 + 6, y - s * 2 + 8, 72 * s + s * 4, 54 * s + s * 4);
    c.fillStyle = '#2a1a12'; c.fillRect(x - s * 2, y - s * 2, 72 * s + s * 4, 54 * s + s * 4);
    c.fillStyle = '#5a3a24'; c.fillRect(x - s, y - s, 72 * s + s * 2, 54 * s + s * 2);
    this.surface.composite(this.time, this.stats.sense > 0 && this.screen === 'shift');
    this.actx.putImageData(this.surface.img, 0, 0);
    c.drawImage(this.art, x, y, 72 * s, 54 * s);
    if (this.screen === 'shift') this.renderShift(c);
    for (const m of this.motes) {
      c.globalAlpha = Math.min(1, (1.1 - m.t) * 3);
      c.fillStyle = m.c; c.fillRect(Math.round(m.x), Math.round(m.y), 4, 4);
    }
    c.globalAlpha = 1;
    for (const p of this.pops) this.drawPop(c, p);
  }

  private renderShift(c: CanvasRenderingContext2D) {
    const s = this.view.s;
    if (this.crab.on) {
      const [cx, cy] = this.toScreen(this.crab.x, this.crab.y);
      const u = Math.max(2, Math.round(s / 2));
      const legs = Math.floor(this.time * 10) % 2;
      c.fillStyle = '#e8572c'; c.fillRect(cx - u * 3, cy - u * 2, u * 6, u * 3);
      c.fillStyle = '#ff8a5c'; c.fillRect(cx - u * 3, cy - u * 2, u * 6, u);
      c.fillStyle = '#e8572c'; c.fillRect(cx - u * 5, cy - u * 4 + legs * u, u * 2, u * 2); c.fillRect(cx + u * 3, cy - u * 4 + (1 - legs) * u, u * 2, u * 2);
      c.fillStyle = '#fff'; c.fillRect(cx - u * 2, cy - u * 3, u, u); c.fillRect(cx + u, cy - u * 3, u, u);
      c.fillStyle = '#b8401e'; for (let i = -2; i <= 2; i += 2) c.fillRect(cx + i * u, cy + u, u, u + legs * u);
    }
    // contact ring: dashed, with the grip filling around it
    if (this.active || this.hover || this.touch) {
      const R = this.ringRadius() * s;
      const x = this.px, y = this.py;
      c.lineWidth = 3;
      c.setLineDash([6, 6]);
      c.lineDashOffset = -this.time * 20;
      c.strokeStyle = this.active ? 'rgba(255,170,60,0.95)' : 'rgba(255,170,60,0.5)';
      c.beginPath(); c.arc(x, y, R, 0, Math.PI * 2); c.stroke();
      c.setLineDash([]);
      if (this.grip > 0.01) {
        c.lineWidth = 5;
        c.strokeStyle = this.grip >= 0.999 ? '#fff6c2' : '#ffb347';
        c.beginPath(); c.arc(x, y, R + 6, -Math.PI / 2, -Math.PI / 2 + this.grip * Math.PI * 2); c.stroke();
      }
      if (this.heat > 0.05) { c.fillStyle = `rgba(255,90,40,${this.heat * 0.18})`; c.beginPath(); c.arc(x, y, R, 0, Math.PI * 2); c.fill(); }
      if (this.streak >= 2) {
        c.font = "12px 'Press Start 2P', monospace"; c.textAlign = 'center';
        const t = `x${(1 + this.streak * 0.05 * (1 + this.stats.scrub)).toFixed(1)}`;
        c.fillStyle = '#000'; c.fillText(t, x + 2, y - R - 12);
        c.fillStyle = '#ff9ff3'; c.fillText(t, x, y - R - 14);
      }
    }
    if (this.stampAnim >= 0) {
      const t = this.stampAnim;
      const k = t < 0.25 ? 2.2 - (t / 0.25) * 1.2 : 1;
      const a = t < 1.6 ? 1 : Math.max(0.35, 1 - (t - 1.6));
      const [sx, sy] = this.toScreen(t < 1.6 ? 36 : 62, t < 1.6 ? 27 : 8);
      c.save(); c.globalAlpha = a; c.translate(sx, sy); c.rotate(-0.18); c.scale(k * (t < 1.6 ? 1 : 0.5), k * (t < 1.6 ? 1 : 0.5));
      c.strokeStyle = '#d63c3c'; c.lineWidth = 6; c.strokeRect(-110, -32, 220, 64);
      c.font = "20px 'Press Start 2P', monospace"; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = '#d63c3c'; c.fillText('CARIMBADO!', 0, 2);
      c.restore();
    }
  }

  private drawPop(c: CanvasRenderingContext2D, p: Pop) {
    const sp = FIND_SPRITES[p.sprite];
    const k = Math.min(1, p.t * 4), u = 5 + k * 3;
    const y = p.y - p.t * 40;
    c.globalAlpha = p.t > 1.2 ? 1 - (p.t - 1.2) / 0.4 : 1;
    c.fillStyle = 'rgba(255,240,180,0.35)'; c.beginPath(); c.arc(p.x, y, 34 * k, 0, Math.PI * 2); c.fill();
    sp.rows.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== '.' && sp.pal[ch]) { c.fillStyle = sp.pal[ch]; c.fillRect(p.x - 3 * u + i * u, y - 3 * u + j * u, u, u); } }));
    c.font = "10px 'Press Start 2P', monospace"; c.textAlign = 'center';
    c.fillStyle = '#000'; c.fillText(p.name, p.x + 1, y + 4 * u + 9);
    c.fillStyle = '#ffe66d'; c.fillText(p.name, p.x, y + 4 * u + 8);
    c.globalAlpha = 1;
  }

  fmtJar() { return `${fmt(this.jar)}/${fmt(this.stats.jar)}`; }
  cleanPct() { return clamp(this.surface.clean(), 0, 1); }
}
