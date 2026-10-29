import type { SaveData, ToolDef } from './types';
import { clamp, rand, fmt } from './util';
import { InputManager } from './InputManager';
import { Renderer } from './Renderer';
import { SaveManager } from '../systems/SaveManager';
import { EconomyManager } from '../systems/EconomyManager';
import { SkillTreeManager } from '../systems/SkillTreeManager';
import { ContractManager } from '../systems/ContractManager';
import { ProgressionManager } from '../systems/ProgressionManager';
import { ParticleSystem, PK } from '../systems/ParticleSystem';
import { AudioManager } from '../systems/AudioManager';
import { ObjectFactory } from '../systems/ObjectFactory';
import { ToolSystem } from '../systems/ToolSystem';
import type { WreckObject, RtPart, ImpactMode } from '../systems/DeformationSystem';
import { TOOLS, TOOL_MAP } from '../data/tools';
import { CONTRACT_MAP } from '../data/contracts';
import { MATERIALS, isMetal } from '../data/materials';
import type { UIManager } from '../ui/UIManager';

/** lobby: between runs (upgrades, summary) · run: timer ticking · ending: "TEMPO!" beat */
export type Phase = 'lobby' | 'run' | 'ending';

export interface FieldItem {
  obj: WreckObject;
  id: string;
  /** normalised placement, so layout survives resizes */
  nx: number;
  depth: number;
  x: number;
  y: number;
  /** px per local unit */
  s: number;
  /** height above the floor while dropping in */
  off: number;
  vy: number;
  state: 'idle' | 'dying';
  t: number;
  punch: number;
}

export interface RunStats { crushed: number; money: number; scrap: number; rare: number; auto: boolean }

interface Pending { t: number; it: FieldItem; rx: number; ry: number; p: number; r: number; mode: ImpactMode; sx: number; sy: number }

export class GameEngine {
  save: SaveData;
  econ: EconomyManager;
  tree: SkillTreeManager;
  contracts: ContractManager;
  prog: ProgressionManager;
  particles = new ParticleSystem();
  audio = new AudioManager();
  tools = new ToolSystem();
  input: InputManager;
  renderer: Renderer;
  ui!: UIManager;

  phase: Phase = 'lobby';
  field: FieldItem[] = [];
  timeLeft = 0;
  runLen = 0;
  run: RunStats = { crushed: 0, money: 0, scrap: 0, rare: 0, auto: false };
  time = 0;
  view = { w: 0, h: 0, u: 1, left: 0, right: 0, top: 0, bottom: 0, horizon: 0 };
  cam = { x: 0, y: 0, mag: 0 };
  hardWarnT = 0;
  private hitStop = 0;
  private endT = 0;
  private refillT = 0;
  private resStacks = 0;
  private resTimer = 0;
  private recycleBoost = 1;
  private pending: Pending[] = [];
  private autoAcc = 0;
  private phantomT = 0;
  private saveT = 0;
  private slowT = 0;
  private last = 0;
  private errShown = false;

  constructor(canvas: HTMLCanvasElement) {
    this.save = SaveManager.load();
    this.econ = new EconomyManager(this.save);
    this.tree = new SkillTreeManager(this.save);
    this.contracts = new ContractManager(this.save, this.econ);
    this.prog = new ProgressionManager(this.save, (m, i) => this.ui?.toast(m, i));
    this.input = new InputManager(canvas);
    this.renderer = new Renderer(canvas, this);
    this.input.onFirstGesture = () => this.audio.unlock();
    this.applySettings();
  }

  get tool(): ToolDef { return TOOL_MAP[this.save.equipped] ?? TOOLS[0]; }
  get scene() { return this.contracts.active?.scene ?? 'kitchen'; }

  applySettings() {
    const st = this.save.settings;
    this.audio.volume = st.volume;
    this.audio.muted = st.muted;
    this.audio.applyVolume();
    this.particles.quality = st.quality === 'low' ? 0.4 : 1;
    this.renderer.setQuality(st.quality === 'low' ? 1 : Math.min(2, window.devicePixelRatio || 1));
  }

  start() {
    const a = this.save.active;
    if (a && CONTRACT_MAP[a.id]) this.openContract(a.id);
    else if (!this.save.contracts.c001) this.openContract('c001');
    else setTimeout(() => this.ui.openPanel('contracts'), 300);
    this.last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - this.last) / 1000);
      this.last = t;
      try {
        this.update(dt);
        this.renderer.render(dt);
      } catch (err) {
        console.error(err);
        if (!this.errShown) { this.errShown = true; this.ui?.toast(`Erro: ${(err as Error)?.message ?? err}`, '⚠️'); }
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    const persist = () => this.persist();
    document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); });
    window.addEventListener('pagehide', persist);
    window.addEventListener('beforeunload', persist);
  }

  persist() { this.contracts.persist(); SaveManager.save(this.save); }

  resetSave(data: SaveData) {
    this.save = data;
    this.econ.setSave(data);
    this.tree.setSave(data);
    this.contracts = new ContractManager(data, this.econ);
    this.prog.setSave(data);
    this.applySettings();
    this.field = [];
    this.phase = 'lobby';
    this.particles.clearAll();
    this.persist();
    this.openContract(data.active?.id ?? 'c001');
    this.ui.refreshAll();
  }

  // ---------------------------------------------------------------- flow
  /** Select a contract: fills its scene and shows the intro card in the lobby. */
  openContract(id: string) {
    if (!this.contracts.start(id)) return;
    this.prog.startRun();
    this.phase = 'lobby';
    this.field = [];
    this.particles.clearAll();
    this.layout();
    this.fillField(true);
    this.ui?.showLobby('intro');
    this.ui?.refreshAll();
  }

  startRun() {
    if (this.phase === 'run' || !this.contracts.active) return;
    this.audio.unlock();
    this.phase = 'run';
    this.runLen = this.timeLeft = this.econ.runTime();
    this.run = { crushed: 0, money: 0, scrap: 0, rare: 0, auto: false };
    this.contracts.runs++;
    this.save.stats.runs++;
    this.fillField(false);
    this.ui.hideLobby();
    this.particles.text('VAI!', this.view.w / 2, this.view.h * 0.4, '#f2a516', 46, 0.9);
    this.audio.reward();
  }

  private endRun() {
    this.phase = 'ending';
    this.endT = 1.1;
    this.particles.text('TEMPO!', this.view.w / 2, this.view.h * 0.4, '#ff6b6b', 46, 1.1);
    this.audio.collapse('metal', 0.2);
  }

  private toLobby() {
    this.phase = 'lobby';
    this.pending = [];
    this.save.stats.bestRun = Math.max(this.save.stats.bestRun, this.run.crushed);
    this.prog.onRunEnd(this.run.crushed, this.run.auto);
    this.persist();
    this.ui.showLobby('summary');
  }

  private completeContract() {
    const c = this.contracts.active!;
    const r = this.contracts.rewards();
    this.save.money += r.money;
    this.save.scrap += r.scrap;
    this.save.rep += r.rep;
    this.save.sp += r.sp;
    this.save.stats.moneyEarned += r.money;
    this.save.stats.contracts++;
    this.prog.onContractDone();
    this.contracts.finish();
    this.phase = 'lobby';
    this.pending = [];
    this.audio.fanfare();
    this.persist();
    this.ui.showLobby('complete', { contract: c, ...r });
  }

  // ---------------------------------------------------------------- field
  layout() {
    const w = this.renderer.w, h = this.renderer.h;
    const u = h / 400;
    const v = this.view;
    v.w = w; v.h = h; v.u = u;
    v.horizon = h * 0.46;
    v.top = h * 0.56;
    v.bottom = h - Math.max(26, h * 0.08);
    v.left = Math.max(70, w * 0.09);
    v.right = w - Math.max(90, w * 0.11);
  }

  /** Screen size of an item: bigger things are bigger, but tiny things stay readable. */
  private itemPx(o: WreckObject) { return this.view.u * (38 + 24 * Math.log10(Math.max(1, o.def.cm))); }

  private place(it: FieldItem) {
    const v = this.view;
    it.x = v.left + it.nx * (v.right - v.left);
    it.y = v.top + it.depth * (v.bottom - v.top);
    it.s = (this.itemPx(it.obj) * (0.78 + 0.22 * it.depth)) / Math.max(it.obj.W, it.obj.H);
  }

  fieldCap() {
    const c = this.contracts.active;
    return c ? Math.round(c.field + this.econ.stats.fieldCap) : 0;
  }

  private onField() {
    const m: Record<string, number> = {};
    for (const it of this.field) if (it.state === 'idle') m[it.id] = (m[it.id] ?? 0) + 1;
    return m;
  }

  private spawnItem(instant: boolean) {
    const id = this.contracts.draw(this.onField());
    if (!id) return false;
    const obj = ObjectFactory.create(id, 1, 30);
    const it: FieldItem = { obj, id, nx: 0, depth: 0, x: 0, y: 0, s: 1, off: 0, vy: 0, state: 'idle', t: 0, punch: 0 };
    // find a free spot
    let best = { nx: Math.random(), depth: Math.random(), score: -1 };
    for (let k = 0; k < 14; k++) {
      it.nx = Math.random(); it.depth = Math.random();
      this.place(it);
      let minD = 1e9;
      for (const o of this.field) minD = Math.min(minD, Math.hypot(o.x - it.x, (o.y - it.y) * 1.6));
      if (minD > best.score) best = { nx: it.nx, depth: it.depth, score: minD };
    }
    it.nx = best.nx; it.depth = best.depth;
    this.place(it);
    it.off = instant ? 0 : this.view.h * rand(0.5, 0.8);
    this.field.push(it);
    this.field.sort((a, b) => a.depth - b.depth);
    return true;
  }

  private fillField(instant: boolean) {
    let n = this.field.filter((f) => f.state === 'idle').length;
    while (n < this.fieldCap() && this.spawnItem(instant)) n++;
  }

  // ---------------------------------------------------------------- update
  update(dt: number) {
    this.time += dt;
    this.save.stats.playTime += dt;
    if (this.renderer.resized) { this.renderer.resized = false; this.layout(); }
    this.autoQuality(dt);
    if (this.hitStop > 0) { this.hitStop -= dt; dt *= 0.15; }
    const v = this.view;
    for (const it of this.field) {
      this.place(it);
      if (it.off > 0 || it.vy !== 0) {
        it.vy += 2600 * v.u * dt;
        it.off -= it.vy * dt;
        if (it.off <= 0) {
          it.off = 0;
          if (it.vy > 300 * v.u) { it.vy = -it.vy * 0.3; it.punch = 0.6; this.particles.burst(PK.Dust, it.x, it.y, 3, 50, '#bbb', 8, 0.5); }
          else it.vy = 0;
        }
      }
      it.punch *= Math.exp(-dt * 10);
      it.obj.update(dt, it.state === 'dying');
      if (it.state === 'dying') it.t += dt;
    }
    // dying items pop away
    for (const it of this.field) if (it.state === 'dying' && it.t > 0.32) this.popItem(it);
    this.field = this.field.filter((it) => !(it.state === 'dying' && it.t > 0.32));

    if (this.phase === 'run') {
      this.timeLeft -= dt;
      this.updateRun(dt);
      if (this.phase === 'run' && this.timeLeft <= 0) { this.timeLeft = 0; this.endRun(); }
    } else if (this.phase === 'ending') {
      this.endT -= dt;
      if (this.endT <= 0) this.toLobby();
    }
    this.tools.update(dt, this);
    this.particles.update(dt, v.bottom + 10, v.w);
    this.cam.mag *= Math.exp(-dt * 12);
    const m = this.save.settings.shake ? this.cam.mag : 0;
    this.cam.x = rand(-m, m); this.cam.y = rand(-m, m);
    this.hardWarnT -= dt;
    this.saveT += dt;
    if (this.saveT > 8) { this.saveT = 0; this.persist(); }
    this.ui.update(dt);
  }

  private updateRun(dt: number) {
    const s = this.econ.stats;
    this.resTimer -= dt;
    if (this.resTimer <= 0) this.resStacks = Math.max(0, this.resStacks - dt * 10);
    for (const it of this.field) {
      const o = it.obj;
      if (it.state === 'idle' && o.residual > 0) {
        const d = Math.max(o.residual * dt * 2.5, Math.min(o.residual, o.maxHp * 0.002));
        o.residual -= d;
        this.applyDamage(it, d);
      }
    }
    for (const p of this.pending) {
      p.t -= dt;
      if (p.t <= 0 && p.it.state === 'idle') this.hit(p.it, p.rx, p.ry, p.p, p.r, p.mode, p.sx, p.sy, true);
    }
    this.pending = this.pending.filter((p) => p.t > 0);
    // refill the floor from the contract stock
    const idle = this.field.filter((f) => f.state === 'idle').length;
    if (idle < this.fieldCap()) {
      this.refillT -= dt * (1 + s.feedSpeed);
      if (this.refillT <= 0) { this.refillT = 0.45; this.spawnItem(false); }
    }
    // helper robot
    if (s.autoHit > 0) {
      this.autoAcc += dt * s.autoHit;
      while (this.autoAcc >= 1) {
        this.autoAcc--;
        const targets = this.field.filter((f) => f.state === 'idle' && f.off === 0);
        if (!targets.length) break;
        const it = targets[Math.floor(Math.random() * targets.length)];
        const strike = this.bestStrikeTool();
        const lx = rand(it.obj.rawLeft, it.obj.rawRight) * 0.7, ly = it.obj.rawTop * rand(0.3, 0.9);
        const [rx, ry] = it.obj.toRest(lx, ly);
        const sx = it.x + lx * it.s, sy = it.y + ly * it.s;
        this.run.auto = true;
        this.tools.autoFx.push({ x: sx, y: sy, t: 0.25 });
        this.hit(it, rx, ry, this.econ.toolForce(strike) * 0.6, (this.econ.toolRadius(strike) * this.view.u * 0.7) / it.s, 'dent', sx, sy, true);
      }
    }
    // phantom piston slams a random item
    if (s.phantom > 0) {
      this.phantomT += dt;
      if (this.phantomT >= 6 / (1 + s.phantom * 3)) {
        this.phantomT = 0;
        const targets = this.field.filter((f) => f.state === 'idle' && f.off === 0);
        if (targets.length) {
          const it = targets[Math.floor(Math.random() * targets.length)];
          this.tools.phantom = { x: it.x, y: it.y + it.obj.rawTop * it.s, t: 0 };
        }
      }
    }
    const ph = this.tools.phantom;
    if (ph) {
      const before = ph.t;
      ph.t += dt * 3;
      if (before < 0.5 && ph.t >= 0.5) {
        this.run.auto = true;
        this.particles.ring(ph.x, ph.y, 90 * this.view.u, 'rgba(162,155,254,0.9)');
        this.impactAt(ph.x, ph.y, 60 * this.view.u, this.econ.capability() * 0.5, 'dent', true);
      }
      if (ph.t >= 1) this.tools.phantom = null;
    }
  }

  private bestStrikeTool() {
    let best = TOOLS[0];
    for (const t of TOOLS) if (t.kind !== 'implode' && this.save.tools[t.id].owned && t.force > best.force && t.kind !== 'press') best = t;
    return best;
  }

  equip(id: string) {
    if (!this.save.tools[id]?.owned || this.save.equipped === id) return;
    this.save.equipped = id;
    this.prog.onToolSwitch(id);
    this.audio.click();
    this.ui.refreshTools();
  }

  // ---------------------------------------------------------------- combat
  /** Manual impact with the equipped tool at a screen point (hits everything under it). */
  impact(sx: number, sy: number, tool: ToolDef) {
    const R = this.econ.toolRadius(tool) * this.view.u;
    const mode: ImpactMode = tool.kind === 'pinch' || tool.kind === 'implode' ? 'pinch' : 'dent';
    const n = this.impactAt(sx, sy, R, this.econ.toolForce(tool), mode, false);
    const press = tool.kind === 'press' || tool.kind === 'implode';
    if (!n) {
      this.particles.burst(PK.Dust, sx, sy, press ? 8 : 3, press ? 120 : 40, '#c8c2b8', press ? 14 : 8, 0.5);
      if (press) { this.cam.mag = Math.min(8, this.cam.mag + 3); this.audio.impact('metal', 0.3, 0.6); }
      return;
    }
    if (tool.id === 'sledge') this.particles.burst(PK.Spark, sx, sy - R, 10, 500, '#fff59d', 3, 0.3, 300);
    if (press) { this.particles.ring(sx, sy, R * 1.3, 'rgba(255,255,255,0.6)', 0.3); this.cam.mag = Math.min(16, this.cam.mag + 6); }
  }

  /** Damage every idle item touched by a circle; returns how many were hit. */
  private impactAt(sx: number, sy: number, R: number, pressure: number, mode: ImpactMode, secondary: boolean) {
    let n = 0;
    for (const it of this.field) {
      if (it.state !== 'idle' || it.off > 4) continue;
      const o = it.obj;
      const x0 = it.x + o.rawLeft * it.s, x1 = it.x + o.rawRight * it.s;
      const y0 = it.y + o.rawTop * it.s, y1 = it.y;
      const cx = clamp(sx, x0, x1), cy = clamp(sy, y0, y1);
      if (Math.hypot(cx - sx, cy - sy) > R) continue;
      const lx = (cx - it.x) / it.s, ly = (cy - it.y) / it.s;
      const [rx, ry] = o.toRest(lx, ly);
      this.hit(it, rx, ry, pressure, R / it.s, mode, cx, cy, secondary);
      n++;
    }
    return n;
  }

  private hit(it: FieldItem, rx: number, ry: number, pressure: number, rL: number, mode: ImpactMode, sx: number, sy: number, secondary: boolean) {
    const o = it.obj;
    if (it.state !== 'idle') return;
    const s = this.econ.stats;
    const mat = MATERIALS[o.def.mat];
    const eff = this.econ.efficiency(pressure, o.def.hardness, o.def.mat);
    let dmg = pressure * eff * this.recycleBoost;
    const crit = !secondary && Math.random() < s.critChance;
    if (crit) dmg *= s.critMult;
    if (s.resonance > 0) { dmg *= 1 + this.resStacks * s.resonance; this.resStacks = Math.min(25, this.resStacks + 0.5); this.resTimer = 1.2; }
    const grav = s.gravity > 0 && Math.random() < s.gravity;
    if (grav) { dmg *= 2; o.extraComp += 0.05; this.particles.ring(sx, sy, 60 * this.view.u, 'rgba(155,89,182,0.9)', 0.5); }

    // deformation: dents sized by how hard the hit was relative to the item
    const share = clamp((dmg / o.maxHp) * 5, 0.2, 1.2);
    const r = Math.min(rL, Math.max(o.W, o.H) * 0.7);
    const depth = r * (mode === 'pinch' ? 0.38 : 0.32) * Math.min(1.2, eff) * (0.5 + share) * (1 + s.dentMult);
    let dx = -rx * 0.3, dy = 1;
    const nl = Math.hypot(dx, dy);
    dx /= nl; dy /= nl;
    o.applyImpact(rx, ry, r, depth, mode, dx, dy);
    if (this.tool.kind === 'press' && !secondary) o.extraComp += 0.04 * Math.min(1, eff);
    o.shake = Math.min(1, o.shake + 0.3 + Math.min(1, eff) * 0.4);
    o.flash = Math.min(1, eff);
    it.punch = Math.min(1, it.punch + 0.5 * Math.min(1, eff + 0.2));
    this.cam.mag = Math.min(10, this.cam.mag + (secondary ? 0.4 : 1.2) * Math.min(1, eff + 0.2));

    this.applyDamage(it, dmg);
    if (s.shockwave > 0 && !secondary) {
      for (const other of this.field) if (other !== it && other.state === 'idle' && Math.hypot(other.x - it.x, other.y - it.y) < rL * it.s * 2.5) this.applyDamage(other, dmg * s.shockwave);
    }
    if (s.chain > 0) {
      const others = this.field.filter((f) => f !== it && f.state === 'idle');
      if (others.length) this.applyDamage(others[Math.floor(Math.random() * others.length)], dmg * s.chain);
    }
    if (s.residual > 0) o.residual += dmg * s.residual;
    if (!secondary && s.doubleHit > 0 && Math.random() < s.doubleHit) {
      this.pending.push({ t: 0.09, it, rx: rx + rand(-r, r) * 0.4, ry: ry + rand(-r, r) * 0.3, p: pressure * 0.7, r: rL, mode, sx: sx + rand(-12, 12), sy: sy + rand(-8, 8) });
    }

    this.impactFx(sx, sy, eff, mode === 'pinch' ? 0.7 : 1, o.def.mat);
    this.audio.impact(mat.sound, eff, this.sizeFactor(o));
    const big = crit || grav;
    if (!secondary || big) this.particles.text((crit ? 'CRÍTICO ' : '') + fmt(dmg), sx + rand(-10, 10), sy - 18 * this.view.u, big ? '#ffa502' : '#fff', big ? 22 : 15, 0.7);
    if (eff < 0.2 && !secondary && this.hardWarnT <= 0) {
      this.hardWarnT = 1.2;
      this.particles.text('MUITO DURO!', sx, sy - 44 * this.view.u, '#ff6b6b', 18, 1.1);
    }
    this.save.stats.hits++;
    if (crit) { this.save.stats.crits++; this.prog.onCrit(this.time); }
  }

  impactFx(sx: number, sy: number, eff: number, scale: number, matId: keyof typeof MATERIALS) {
    const mat = MATERIALS[matId];
    const fm = (1 + this.econ.stats.fragMult) * scale;
    const e = Math.min(1.3, eff + 0.15);
    if (mat.sparks) this.particles.burst(PK.Spark, sx, sy, (4 + 8 * (eff < 0.3 ? 1.5 : e)) * fm, 480, '#ffd166', 2.2, 0.35, 160);
    this.particles.burst(PK.Chip, sx, sy, 3 * e * fm, 260, mat.chip, 4, 0.8, 240);
    if (matId === 'glass') this.particles.burst(PK.Shard, sx, sy, 5 * fm, 300, '#dff9fb', 5, 0.9, 200);
    this.particles.burst(PK.Dust, sx, sy, 2 * fm, 60, '#c8c2b8', 12, 0.6);
    if (isMetal(matId) && eff > 0.6) this.particles.spawn(PK.Glow, sx, sy, 0, 0, 0.15, 26, 'rgba(255,240,200,0.8)');
  }

  sizeFactor(o: WreckObject) { return clamp(Math.log10(o.def.mass + 1) / 6, 0, 1); }

  private applyDamage(it: FieldItem, d: number) {
    const o = it.obj;
    if (it.state !== 'idle' || d <= 0 || this.phase !== 'run') return;
    o.hits++;
    o.hp -= d;
    for (const p of o.checkDetach()) this.detachPart(it, p);
    if (o.hp <= 0) this.killItem(it);
  }

  private detachPart(it: FieldItem, p: RtPart) {
    const o = it.obj;
    const s = this.econ.stats;
    const z = it.s;
    let cx = 0, cy = 0;
    for (let i = 0; i < p.n; i++) { cx += p.cur[i * 2]; cy += p.cur[i * 2 + 1]; }
    cx /= p.n; cy /= p.n;
    const scx = it.x + cx * z, scy = it.y + cy * z;
    const dirX = Math.sign(cx || rand(-1, 1));
    if (p.spec.shatter) {
      const pieces = Math.min(10, Math.max(4, Math.floor(p.n / 4)));
      const step = Math.max(1, Math.floor(p.n / pieces));
      for (let i = 0; i < p.n; i += step) {
        const j = Math.min(p.n - 1, i + step);
        const ax = (p.cur[i * 2] - cx) * z, ay = (p.cur[i * 2 + 1] - cy) * z;
        const bx = (p.cur[j * 2] - cx) * z, by = (p.cur[j * 2 + 1] - cy) * z;
        const mx = (ax + bx) / 3, my = (ay + by) / 3;
        this.particles.addDebris([ax - mx, ay - my, bx - mx, by - my, -mx * 0.6, -my * 0.6], scx + mx, scy + my, mx * 6 + rand(-60, 60), my * 6 - rand(100, 300), p.spec.fill);
      }
      if (p.mat.id === 'glass') { this.audio.shatter(); this.save.stats.glass++; this.particles.burst(PK.Shard, scx, scy, 12, 380, '#dff9fb', 5, 1, 200); }
      else { this.audio.snap(p.mat.sound); this.particles.burst(PK.Chip, scx, scy, 10, 320, p.mat.chip, 5, 1, 250); }
    } else {
      const pts: number[] = [];
      const step = Math.max(1, Math.floor(p.n / 30));
      for (let i = 0; i < p.n; i += step) pts.push((p.cur[i * 2] - cx) * z, (p.cur[i * 2 + 1] - cy) * z);
      this.particles.addDebris(pts, scx, scy, dirX * rand(100, 300), -rand(200, 450), p.spec.fill, p.spec.open, (p.spec.width ?? 2) * z);
      this.audio.snap(p.mat.sound);
    }
    if (p.spec.rare) {
      const amt = Math.max(1, Math.round(Math.log10(o.maxHp)));
      this.save.rare += amt;
      this.save.stats.rare += amt;
      this.run.rare += amt;
      this.prog.onRare();
      this.particles.text(`+${amt} 💎`, scx, scy - 30, '#a29bfe', 20, 1.4);
      this.audio.reward();
    }
    if (s.domino > 0 && Math.random() < s.domino) {
      const n = o.detachNext();
      if (n) { this.particles.text('DOMINÓ!', scx, scy - 50, '#fdcb6e', 16); this.detachPart(it, n); o.hp -= o.maxHp * 0.03; }
    }
  }

  private killItem(it: FieldItem) {
    const o = it.obj;
    const s = this.econ.stats;
    it.state = 'dying';
    it.t = 0;
    for (const p of o.checkDetach(1)) if (p.spec.rare || p.spec.shatter) this.detachPart(it, p); else p.detached = false;
    const money = Math.ceil(o.def.value * (1 + s.moneyMult) * this.recycleBoost);
    const scrap = Math.ceil(o.def.scrap * (1 + s.scrapMult));
    this.save.money += money;
    this.save.scrap += scrap;
    this.save.stats.moneyEarned += money;
    this.run.crushed++; this.run.money += money; this.run.scrap += scrap;
    if (Math.random() < s.rareChance) { this.save.rare++; this.save.stats.rare++; this.run.rare++; this.prog.onRare(); }
    this.save.stats.destroyed++;
    this.save.stats.mass += o.def.mass;
    this.save.stats.byObject[o.def.id] = (this.save.stats.byObject[o.def.id] ?? 0) + 1;
    this.prog.onDestroyed(o.def.id, o.maxHp, o.hits <= 1, this.time, this.save.equipped);
    this.contracts.onDestroyed(it.id);
    this.recycleBoost = 1 + s.recycle;
    this.hitStop = 0.05;
    this.cam.mag = Math.min(14, this.cam.mag + 5);
    const sy = it.y + o.rawTop * it.s * 0.5;
    this.particles.burst(PK.Chip, it.x, sy, 14 * (1 + s.fragMult), 420, MATERIALS[o.def.mat].chip, 5, 1, 320);
    if (MATERIALS[o.def.mat].sparks) this.particles.burst(PK.Spark, it.x, sy, 16, 600, '#ffd166', 2.5, 0.45, 200);
    this.particles.burst(PK.Dust, it.x, it.y, 6, 140, '#bfb8aa', 16, 0.8);
    this.audio.collapse(MATERIALS[o.def.mat].sound, this.sizeFactor(o));
    if (this.contracts.remaining() === 0) setTimeout(() => { if (this.contracts.active) this.completeContract(); }, 450);
  }

  /** Crushed item turns into a scrap cube that pops with coins. */
  private popItem(it: FieldItem) {
    const sy = it.y - 10 * this.view.u;
    this.particles.text(`+$${fmt(Math.ceil(it.obj.def.value * (1 + this.econ.stats.moneyMult)))}`, it.x, sy - 20 * this.view.u, '#7bed9f', 20, 1);
    for (let i = 0; i < 6; i++) this.particles.spawn(PK.Glow, it.x + rand(-10, 10), sy, rand(-80, 80), rand(-260, -120), 0.6, 6, '#f6e58d');
    this.particles.burst(PK.Chip, it.x, sy, 8, 260, '#ffeaa7', 4, 0.7, 260);
    this.audio.reward();
  }

  private autoQuality(dt: number) {
    if (this.save.settings.quality !== 'auto') return;
    if (dt > 1 / 38) this.slowT += dt; else this.slowT = Math.max(0, this.slowT - dt * 0.5);
    if (this.slowT > 3 && this.particles.quality > 0.4) {
      this.slowT = 0;
      this.particles.quality = 0.4;
      this.renderer.setQuality(1);
    }
  }
}
