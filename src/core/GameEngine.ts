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

export type Phase = 'idle' | 'enter' | 'work' | 'collapse' | 'clear' | 'done';

interface Pending { t: number; rx: number; ry: number; p: number; r: number; mode: ImpactMode; sx: number; sy: number }

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

  obj: WreckObject | null = null;
  phase: Phase = 'idle';
  phaseT = 0;
  offX = 0;
  time = 0;
  view = { cx: 0, floorY: 0, zoom: 1, w: 0, h: 0, cpu: 1 };
  private zoomTarget = 1;
  cam = { x: 0, y: 0, mag: 0 };
  lastDamageT = -10;
  hardWarnT = 0;
  private resStacks = 0;
  private resTimer = 0;
  private recycleBoost = 1;
  private pending: Pending[] = [];
  private autoAcc = 0;
  private phantomT = 0;
  private contAcc = 0;
  private contTick = 0;
  private microT = 0;
  private doneT = 0;
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

  applySettings() {
    const st = this.save.settings;
    this.audio.volume = st.volume;
    this.audio.muted = st.muted;
    this.audio.applyVolume();
    const low = st.quality === 'low';
    this.particles.quality = low ? 0.4 : 1;
    this.renderer.setQuality(low ? 1 : Math.min(2, window.devicePixelRatio || 1));
  }

  start() {
    if (this.save.active && CONTRACT_MAP[this.save.active.id]) {
      const a = this.save.active;
      this.contracts.start(a.id, a.idx, a.time);
      this.spawnNext();
    } else if (!this.save.contracts.c001) {
      this.startContract('c001');
    } else {
      this.phase = 'idle';
      setTimeout(() => this.ui.openPanel('contracts'), 300);
    }
    this.last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - this.last) / 1000);
      this.last = t;
      // never let one bad frame freeze the game loop
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
    this.obj = null;
    this.particles.clearAll();
    this.persist();
    if (data.active) { this.contracts.start(data.active.id, data.active.idx, data.active.time); this.spawnNext(); }
    else this.startContract('c001');
    this.ui.refreshAll();
  }

  // ---------------------------------------------------------------- flow
  startContract(id: string) {
    if (!this.contracts.start(id)) return;
    this.prog.startRun();
    this.particles.sweep(1400);
    this.spawnNext();
    this.ui?.refreshAll();
  }

  private spawnNext() {
    const id = this.contracts.current();
    if (!id) { this.phase = 'idle'; return; }
    this.obj = ObjectFactory.create(id);
    this.computeView(true);
    this.tools.reset(this);
    this.phase = 'enter';
    this.phaseT = 0;
    this.offX = -this.view.w * 0.75;
  }

  computeView(snap = false) {
    const w = this.renderer.w, h = this.renderer.h;
    const floorY = h - Math.max(66, h * 0.16);
    const side = Math.max(110, w * 0.13);
    const top = Math.max(92, h * 0.24);
    const o = this.obj;
    const v = this.view;
    v.cx = w / 2; v.floorY = floorY; v.w = w; v.h = h;
    if (!o) return;
    // real-world scale: the frame fits both the object and the hand tool (a clip looks tiny next to pliers)
    const cpu = o.def.cm / o.W;
    const wcm = o.def.cm, hcm = o.H * cpu;
    const tl = this.toolDrawLen();
    const pxcm = Math.min((w - side * 2) / Math.max(wcm * 1.25, tl * 1.05), (floorY - top) / Math.max(hcm * 1.35, tl * 0.75));
    this.zoomTarget = pxcm * cpu;
    if (snap || v.cpu !== cpu) v.zoom = this.zoomTarget;
    v.cpu = cpu;
  }

  /** Drawn hand-tool length in cm: real size, but at most ~2x the object so tiny items stay readable. */
  toolDrawLen() {
    const t = this.tool, o = this.obj;
    if (t.kind !== 'pinch' && t.kind !== 'strike') return 0;
    if (!o) return t.len;
    const cpu = o.def.cm / o.W;
    return Math.min(t.len, Math.max(o.def.cm, o.H * cpu) * 2);
  }

  /** screen px per cm */
  get pxPerCm() { return this.view.zoom / this.view.cpu; }

  equip(id: string) {
    if (!this.save.tools[id]?.owned || this.save.equipped === id) return;
    this.save.equipped = id;
    this.prog.onToolSwitch(id);
    this.computeView();
    this.tools.reset(this);
    this.audio.click();
    this.ui.refreshTools();
  }

  toLocal(sx: number, sy: number): [number, number] {
    const v = this.view;
    return [(sx - v.cx - this.offX) / v.zoom, (sy - v.floorY) / v.zoom];
  }
  toScreen(x: number, y: number): [number, number] {
    const v = this.view;
    return [v.cx + this.offX + x * v.zoom, v.floorY + y * v.zoom];
  }

  // ---------------------------------------------------------------- update
  update(dt: number) {
    this.time += dt;
    this.save.stats.playTime += dt;
    if (this.renderer.resized) { this.renderer.resized = false; this.computeView(true); }
    this.view.zoom += (this.zoomTarget - this.view.zoom) * Math.min(1, dt * 6);
    this.autoQuality(dt);
    const feed = 1 + this.econ.stats.feedSpeed;
    this.phaseT += dt;
    const o = this.obj;

    switch (this.phase) {
      case 'enter': {
        const dur = 0.45 / feed;
        const t = clamp(this.phaseT / dur, 0, 1);
        this.offX = -this.view.w * 0.75 * Math.pow(1 - t, 3);
        if (t >= 1) { this.phase = 'work'; this.phaseT = 0; this.offX = 0; }
        break;
      }
      case 'work':
        this.contracts.time += dt;
        this.updateWork(dt);
        break;
      case 'collapse':
        if (this.phaseT > 0.38) {
          this.phase = 'clear'; this.phaseT = 0;
          this.particles.sweep(this.view.w * 1.3 * feed);
        }
        break;
      case 'clear': {
        const dur = 0.5 / feed;
        const t = clamp(this.phaseT / dur, 0, 1);
        this.offX = this.view.w * 0.8 * t * t;
        if (t >= 1) {
          if (this.contracts.advance()) this.completeContract();
          else this.spawnNext();
        }
        break;
      }
      case 'done':
        this.doneT -= dt;
        if (this.doneT <= 0 && this.doneT > -1) {
          this.doneT = -5;
          const last = this.lastContract;
          if (last && this.save.autoRepeat && !this.lastFirst) this.startContract(last);
          else this.ui.openPanel('contracts');
        }
        break;
    }
    if (o) o.update(dt, this.phase === 'collapse');
    this.tools.update(dt, this);
    const cont = this.tools.contact;
    const kind = this.tool.kind;
    this.audio.setHum(this.tools.active && kind !== 'pinch' && kind !== 'strike' ? (cont ? 1 : 0.6) : 0, cont ? 0.8 - Math.min(0.3, this.tools.strain * 0.1) : 1.2);
    this.particles.update(dt, this.view.floorY, this.view.w);
    this.cam.mag *= Math.exp(-dt * 12);
    const m = this.save.settings.shake ? this.cam.mag : 0;
    this.cam.x = rand(-m, m); this.cam.y = rand(-m, m);
    this.hardWarnT -= dt;
    this.saveT += dt;
    if (this.saveT > 8) { this.saveT = 0; this.persist(); }
    this.ui.update(dt);
  }

  private lastContract: string | null = null;
  private lastFirst = false;

  private updateWork(dt: number) {
    const o = this.obj!;
    const s = this.econ.stats;
    this.resTimer -= dt;
    if (this.resTimer <= 0) this.resStacks = Math.max(0, this.resStacks - dt * 10);
    if (o.residual > 0) {
      const d = Math.max(o.residual * dt * 2.5, Math.min(o.residual, o.maxHp * 0.001));
      o.residual -= d;
      o.extraComp += 0.002;
      this.applyDamage(d);
      if (this.phase !== 'work') return;
    }
    for (const p of this.pending) {
      p.t -= dt;
      if (p.t <= 0) this.hit(p.rx, p.ry, p.p, p.r, p.mode, p.sx, p.sy, true);
    }
    this.pending = this.pending.filter((p) => p.t > 0);
    if (this.phase !== 'work') return;
    // automatic hammer arm
    if (s.autoHit > 0) {
      this.autoAcc += dt * s.autoHit;
      while (this.autoAcc >= 1 && this.phase === 'work') {
        this.autoAcc--;
        const lx = rand(o.rawLeft * 0.8, o.rawRight * 0.8), ly = o.rawTop * rand(0.4, 0.95);
        const [rx, ry] = o.toRest(lx, ly);
        const [sx, sy] = this.toScreen(lx, ly);
        const strike = this.bestStrikeTool();
        this.prog.run.auto = true;
        this.tools.autoFx.push({ x: sx, y: sy, t: 0.25 });
        this.hit(rx, ry, this.econ.toolForce(strike) * 0.6, (this.econ.toolRadius(strike) * 0.7) / this.view.cpu, 'dent', sx, sy, true);
      }
    }
    // phantom piston
    if (s.phantom > 0) {
      this.phantomT += dt;
      const interval = 6 / (1 + s.phantom * 3);
      if (this.phantomT >= interval && this.tools.phantomAnim < 0) { this.phantomT = 0; this.tools.phantomAnim = 0; }
    }
    if (this.tools.phantomAnim >= 0) {
      const before = this.tools.phantomAnim;
      this.tools.phantomAnim += dt * 3;
      if (before < 0.5 && this.tools.phantomAnim >= 0.5) {
        this.prog.run.auto = true;
        const [sx, sy] = this.toScreen(0, o.rawTop);
        const [rx, ry] = o.toRest(0, o.rawTop);
        this.hit(rx, ry, this.econ.capability() * 0.5, o.W * 0.5, 'dent', sx, sy, true);
        this.particles.ring(sx, sy, 160, 'rgba(162,155,254,0.9)');
      }
      if (this.tools.phantomAnim >= 1) this.tools.phantomAnim = -1;
    }
  }

  private bestStrikeTool() {
    let best = TOOLS[0];
    for (const t of TOOLS) if ((t.kind === 'strike' || t.kind === 'pinch') && this.save.tools[t.id].owned && t.force > best.force) best = t;
    return best;
  }

  // ---------------------------------------------------------------- combat
  /** Manual strike/pinch at a screen point. */
  strikeAt(sx: number, sy: number, tool: ToolDef) {
    const o = this.obj!;
    const rL = this.econ.toolRadius(tool) / this.view.cpu;
    const [ax, ay] = this.toLocal(sx, sy);
    // snap to the nearest point of the object's surface
    let best = 1e18, lx = ax, ly = ay;
    for (const p of o.parts) {
      if (p.detached) continue;
      for (let i = 0; i < p.n; i++) {
        const dx = p.cur[i * 2] - ax, dy = p.cur[i * 2 + 1] - ay, d = dx * dx + dy * dy;
        if (d < best) { best = d; lx = p.cur[i * 2]; ly = p.cur[i * 2 + 1]; }
      }
    }
    const inside = ax >= o.rawLeft && ax <= o.rawRight && ay >= o.rawTop && ay <= 0;
    if (inside) { lx = ax; ly = ay; }
    // pliers always bite the closest spot; hammers need to land reasonably close
    const reach = rL + 60 / this.view.zoom;
    if (tool.kind !== 'pinch' && !inside && Math.sqrt(best) > reach) {
      this.particles.burst(PK.Dust, sx, sy, 3, 40, '#aaa', 8, 0.4);
      return;
    }
    const [rx, ry] = o.toRest(lx, ly);
    const [hx, hy] = this.toScreen(lx, ly);
    this.tools.bite = { x: hx, y: hy, t: 0.15 };
    this.hit(rx, ry, this.econ.toolForce(tool), rL, tool.kind === 'pinch' ? 'pinch' : 'dent', hx, hy, false);
  }

  hit(rx: number, ry: number, pressure: number, rL: number, mode: ImpactMode, sx: number, sy: number, secondary: boolean) {
    const o = this.obj;
    if (!o || this.phase !== 'work') return;
    const s = this.econ.stats;
    const mat = MATERIALS[o.def.mat];
    const eff = this.econ.efficiency(pressure, o.def.hardness, o.def.mat);
    let dmg = pressure * eff * this.recycleBoost;
    const crit = !secondary && Math.random() < s.critChance;
    if (crit) dmg *= s.critMult;
    if (s.resonance > 0) { dmg *= 1 + this.resStacks * s.resonance; this.resStacks = Math.min(25, this.resStacks + 1); this.resTimer = 1.2; }
    const grav = s.gravity > 0 && Math.random() < s.gravity;
    if (grav) { dmg *= 2; o.extraComp += 0.05; this.particles.ring(sx, sy, 120, 'rgba(155,89,182,0.9)', 0.5); }

    // deformation
    const share = clamp((dmg / o.maxHp) * 6, 0.15, 1.1);
    const depth = rL * (mode === 'pinch' ? 0.55 : 0.42) * Math.min(1.2, eff) * (0.45 + share) * (1 + s.dentMult);
    let dx = -rx, dy = -o.H * 0.5 - ry;
    const dl = Math.hypot(dx, dy) || 1;
    dx = (dx / dl) * 0.5; dy = (dy / dl) * 0.5 + 0.5;
    const nl = Math.hypot(dx, dy) || 1;
    o.applyImpact(rx, ry, rL, depth, mode, dx / nl, dy / nl);
    o.shake = Math.min(1, o.shake + 0.25 + Math.min(1, eff) * 0.35);
    o.flash = Math.min(1, eff);
    this.cam.mag = Math.min(14, this.cam.mag + (mode === 'pinch' ? 1 : 2 + Math.min(6, rL * this.view.zoom * 0.04)) * Math.min(1, eff + 0.2));

    this.applyDamage(dmg, true);
    if (s.shockwave > 0 && !secondary && this.phase === 'work') {
      o.applyImpact(rx, ry, rL * 2.4, depth * 0.3 * (1 + s.shockwave), 'dent', dx / nl, dy / nl);
      this.particles.ring(sx, sy, rL * this.view.zoom * 2.4, 'rgba(255,255,255,0.7)');
      this.applyDamage(dmg * s.shockwave);
    }
    if (s.chain > 0 && this.phase === 'work') {
      this.applyDamage(dmg * s.chain);
      const p = o.parts[Math.floor(Math.random() * o.parts.length)];
      if (!p.detached) o.applyImpact((p.bx0 + p.bx1) / 2, (p.by0 + p.by1) / 2, rL * 0.7, depth * 0.3, 'dent', 0, 1);
    }
    if (s.residual > 0) o.residual += dmg * s.residual;
    if (!secondary && s.doubleHit > 0 && Math.random() < s.doubleHit) {
      this.pending.push({ t: 0.09, rx: rx + rand(-rL, rL) * 0.5, ry: ry + rand(-rL, rL) * 0.3, p: pressure * 0.7, r: rL, mode, sx: sx + rand(-20, 20), sy: sy + rand(-10, 10) });
    }

    // feedback
    this.impactFx(sx, sy, eff, mode === 'pinch' ? 0.6 : 1, o.def.mat);
    this.audio.impact(mat.sound, eff, this.sizeFactor());
    const big = crit || grav;
    this.particles.text((crit ? 'CRÍTICO ' : '') + fmt(dmg), sx + rand(-14, 14), sy - 24, big ? '#ffa502' : secondary ? '#c8d6e5' : '#fff', big ? 24 : secondary ? 13 : 17);
    if (eff < 0.2 && !secondary && this.hardWarnT <= 0) {
      this.hardWarnT = 1.2;
      this.particles.text('MUITO DURO!', sx, sy - 56, '#ff6b6b', 20, 1.1);
    }
    this.save.stats.hits++;
    if (crit) { this.save.stats.crits++; this.prog.onCrit(this.time); }
  }

  /** Continuous pressure from vise/press/implosion. */
  continuousDamage(tool: ToolDef, dt: number) {
    const o = this.obj;
    if (!o || this.phase !== 'work') return;
    const s = this.econ.stats;
    const P = this.econ.toolForce(tool);
    const eff = this.econ.efficiency(P, o.def.hardness, o.def.mat);
    this.tools.strain = Math.min(2, this.tools.strain + dt * 2);
    this.contAcc += P * eff * dt * this.recycleBoost * (1 + Math.min(10, this.resStacks) * s.resonance);
    this.contTick += dt;
    this.microT += dt;
    const mat = MATERIALS[o.def.mat];
    const crumple = (1 + s.dentMult) * Math.min(1, eff + 0.1);
    if (this.microT > 0.06) {
      this.microT = 0;
      let lx: number, ly: number, dx = 0, dy = 1, sx: number, sy: number;
      if (tool.kind === 'press') {
        lx = rand(o.rawLeft, o.rawRight) * 0.9; ly = o.rawTop;
        const pist = tool.pistons ?? 1;
        if (pist > 1) lx = (Math.floor(Math.random() * pist) - (pist - 1) / 2) * (o.W / pist);
      } else if (tool.kind === 'vise') {
        const side = Math.random() < 0.5 ? -1 : 1;
        lx = side < 0 ? o.rawLeft : o.rawRight; ly = o.rawTop * rand(0.1, 0.9); dx = -side; dy = 0;
      } else {
        const a = Math.random() * Math.PI * 2;
        lx = Math.cos(a) * o.W * 0.4; ly = -o.H * 0.5 * (1 - o.comp) + Math.sin(a) * o.H * 0.4;
        dx = -Math.cos(a); dy = -Math.sin(a);
      }
      const [rx, ry] = o.toRest(lx, ly);
      o.applyImpact(rx, ry, Math.max(o.W, o.H) * 0.16, Math.max(o.W, o.H) * 0.022 * crumple, 'dent', dx, dy);
      o.shake = Math.min(0.5, o.shake + 0.08 * Math.min(1, eff));
      [sx, sy] = this.toScreen(lx, ly);
      if (Math.random() < 0.5) this.particles.burst(PK.Dust, sx, sy, 2, 60, '#bbb', 10, 0.6);
      if (mat.sparks && Math.random() < 0.4) this.particles.burst(PK.Spark, sx, sy, 4, 380, '#ffd166', 2, 0.35, 120);
      if (Math.random() < 0.35) this.audio.crunch(mat.sound, this.sizeFactor());
      this.cam.mag = Math.min(6, this.cam.mag + 0.6 * Math.min(1, eff));
    }
    if (this.contTick >= 0.15) {
      let d = this.contAcc;
      const crit = Math.random() < s.critChance * 0.5;
      if (crit) { d *= s.critMult; this.save.stats.crits++; this.prog.onCrit(this.time); }
      this.contAcc = 0; this.contTick = 0;
      const [sx, sy] = this.toScreen(rand(-0.3, 0.3) * o.W, o.rawTop);
      this.particles.text((crit ? 'CRÍTICO ' : '') + fmt(d), sx, sy - 30, crit ? '#ffa502' : '#ffeaa7', crit ? 22 : 15, 0.7);
      if (eff < 0.2 && this.hardWarnT <= 0) { this.hardWarnT = 1.5; this.particles.text('PRESSÃO INSUFICIENTE!', sx, sy - 60, '#ff6b6b', 18, 1.2); }
      if (s.resonance > 0) { this.resStacks = Math.min(25, this.resStacks + 0.5); this.resTimer = 1.2; }
      this.applyDamage(d, true);
    }
  }

  impactFx(sx: number, sy: number, eff: number, scale: number, matId: keyof typeof MATERIALS) {
    const mat = MATERIALS[matId];
    const fm = (1 + this.econ.stats.fragMult) * scale;
    const e = Math.min(1.3, eff + 0.15);
    if (mat.sparks) this.particles.burst(PK.Spark, sx, sy, (6 + 10 * (eff < 0.3 ? 1.5 : e)) * fm, 520, '#ffd166', 2.2, 0.35, 160);
    this.particles.burst(PK.Chip, sx, sy, 4 * e * fm, 280, mat.chip, 4, 0.8, 250);
    if (matId === 'glass') this.particles.burst(PK.Shard, sx, sy, 6 * fm, 300, '#dff9fb', 5, 0.9, 200);
    this.particles.burst(PK.Dust, sx, sy, 3 * fm, 60, '#c8c2b8', 14, 0.7);
    if (isMetal(matId) && eff > 0.6) this.particles.spawn(PK.Glow, sx, sy, 0, 0, 0.15, 30, 'rgba(255,240,200,0.8)');
  }

  sizeFactor() { return this.obj ? clamp(Math.log10(this.obj.def.mass + 1) / 6, 0, 1) : 0; }

  applyDamage(d: number, primary = false) {
    const o = this.obj;
    if (!o || this.phase !== 'work' || d <= 0) return;
    if (primary) o.hits++;
    o.hp -= d;
    this.lastDamageT = this.time;
    for (const p of o.checkDetach()) this.detachPart(p);
    if (o.hp <= 0) this.destroyObject();
  }

  private detachPart(p: RtPart) {
    const o = this.obj!;
    const s = this.econ.stats;
    const z = this.view.zoom;
    let cx = 0, cy = 0;
    for (let i = 0; i < p.n; i++) { cx += p.cur[i * 2]; cy += p.cur[i * 2 + 1]; }
    cx /= p.n; cy /= p.n;
    const [scx, scy] = this.toScreen(cx, cy);
    const dirX = Math.sign(cx || rand(-1, 1));
    const shards = p.spec.shatter;
    if (shards) {
      const pieces = Math.min(14, Math.max(4, Math.floor(p.n / 4)));
      const step = Math.max(1, Math.floor(p.n / pieces));
      for (let i = 0; i < p.n; i += step) {
        const j = Math.min(p.n - 1, i + step);
        const ax = (p.cur[i * 2] - cx) * z, ay = (p.cur[i * 2 + 1] - cy) * z;
        const bx = (p.cur[j * 2] - cx) * z, by = (p.cur[j * 2 + 1] - cy) * z;
        const mx = (ax + bx) / 3 + rand(-4, 4), my = (ay + by) / 3 + rand(-4, 4);
        this.particles.addDebris([ax - mx, ay - my, bx - mx, by - my, -mx * 0.6, -my * 0.6], scx + mx, scy + my, mx * 6 + rand(-80, 80), my * 6 - rand(100, 350), p.spec.fill);
      }
      if (p.mat.id === 'glass') { this.audio.shatter(); this.save.stats.glass++; this.particles.burst(PK.Shard, scx, scy, 16, 420, '#dff9fb', 6, 1, 200); }
      else { this.audio.snap(p.mat.sound); this.particles.burst(PK.Chip, scx, scy, 14, 360, p.mat.chip, 6, 1, 250); }
    } else {
      const pts: number[] = [];
      const step = Math.max(1, Math.floor(p.n / 40));
      for (let i = 0; i < p.n; i += step) pts.push((p.cur[i * 2] - cx) * z, (p.cur[i * 2 + 1] - cy) * z);
      this.particles.addDebris(pts, scx, scy, dirX * rand(120, 380), -rand(200, 520), p.spec.fill, p.spec.open, (p.spec.width ?? 2) * z);
      this.audio.snap(p.mat.sound);
      if (p.mat.sparks) this.particles.burst(PK.Spark, scx, scy, 10, 400, '#ffd166', 2, 0.4, 100);
    }
    if (p.spec.rare) {
      const amt = Math.max(1, Math.round(Math.log10(o.maxHp)));
      this.save.rare += amt;
      this.save.stats.rare += amt;
      this.prog.onRare();
      this.particles.text(`+${amt} 💎 componente raro!`, scx, scy - 40, '#a29bfe', 20, 1.6);
      this.audio.reward();
    }
    if (s.domino > 0 && Math.random() < s.domino) {
      const n = o.detachNext();
      if (n) { this.particles.text('DOMINÓ!', scx, scy - 70, '#fdcb6e', 18); this.detachPart(n); o.hp -= o.maxHp * 0.03; }
    }
  }

  private destroyObject() {
    const o = this.obj!;
    const s = this.econ.stats;
    this.phase = 'collapse';
    this.phaseT = 0;
    this.pending = [];
    for (const p of o.checkDetach(1)) if (p.spec.rare || p.spec.shatter) this.detachPart(p); else p.detached = false;
    const money = Math.ceil(o.def.value * (1 + s.moneyMult) * this.recycleBoost);
    const scrap = Math.ceil(o.def.scrap * (1 + s.scrapMult));
    this.save.money += money;
    this.save.scrap += scrap;
    this.save.stats.moneyEarned += money;
    let rareTxt = '';
    if (Math.random() < s.rareChance) { this.save.rare++; this.save.stats.rare++; this.prog.onRare(); rareTxt = '  +1💎'; }
    this.save.stats.destroyed++;
    this.save.stats.mass += o.def.mass;
    this.save.stats.byObject[o.def.id] = (this.save.stats.byObject[o.def.id] ?? 0) + 1;
    this.prog.onDestroyed(o.def.id, o.maxHp, o.hits <= 1, this.time, this.save.equipped);
    this.recycleBoost = 1 + s.recycle;
    const [sx, sy] = this.toScreen(0, -o.H * 0.3);
    this.particles.text(`+$${fmt(money)}  +${fmt(scrap)}⚙${rareTxt}`, sx, sy - 70, '#7bed9f', 26, 1.4);
    this.particles.burst(PK.Dust, sx, this.view.floorY - 10, 18, 260, '#bfb8aa', 26, 1);
    this.particles.burst(PK.Chip, sx, sy, 22 * (1 + s.fragMult), 520, MATERIALS[o.def.mat].chip, 6, 1.2, 380);
    if (MATERIALS[o.def.mat].sparks) this.particles.burst(PK.Spark, sx, sy, 30, 700, '#ffd166', 2.5, 0.5, 200);
    this.cam.mag = 16;
    this.audio.collapse(MATERIALS[o.def.mat].sound, this.sizeFactor());
    this.audio.reward();
    this.tools.reset(this);
    this.ui.flashObjectDone();
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
    const time = this.contracts.time;
    this.prog.onContractDone(c.id, this.contracts.queue.length, time);
    this.contracts.finish();
    this.obj = null;
    this.phase = 'done';
    this.lastContract = c.id;
    this.lastFirst = r.first;
    this.doneT = r.first ? 3.2 : 2.4;
    this.audio.fanfare();
    this.ui.showContractDone(c, r, time);
    this.persist();
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
