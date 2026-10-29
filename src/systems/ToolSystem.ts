import type { GameEngine } from '../core/GameEngine';

/** Per-frame behaviour of the equipped tool: strike timing, piston travel, vise jaws, implosion field. */
export class ToolSystem {
  cd = 0;
  swing = 0;
  pressY = -1e9;
  jaw = -1e9;
  contact = false;
  held = false;
  active = false;
  strain = 0;
  autoFx: { x: number; y: number; t: number }[] = [];
  phantomAnim = -1;
  /** last snapped contact point (screen px), so the tool visibly bites the object */
  bite = { x: 0, y: 0, t: 0 };

  reset(e: GameEngine) {
    const o = e.obj;
    this.contact = false;
    this.pressY = o ? -o.H * 1.35 : -1e9;
    this.jaw = o ? o.W * 0.95 : 1e9;
    if (o) { o.platenY = -1e9; o.viseL = -1e9; o.viseR = 1e9; o.implode = 0; }
  }

  update(dt: number, e: GameEngine) {
    const tool = e.tool;
    const obj = e.obj;
    const inp = e.input;
    const working = e.phase === 'work' && !!obj;
    this.cd -= dt;
    this.swing = Math.max(0, this.swing - dt * 7);
    this.bite.t -= dt;
    for (const f of this.autoFx) f.t -= dt;
    this.autoFx = this.autoFx.filter((f) => f.t > 0);
    // DOM buttons capture their own touches, so anywhere on the canvas counts (incl. the bench below the object)
    const inPlay = true;
    const pressed = inp.consumePress() && inPlay;
    this.held = inp.down && inPlay;

    if (tool.kind === 'pinch' || tool.kind === 'strike') {
      this.active = false;
      if (working && (this.held || pressed) && this.cd <= 0) {
        e.strikeAt(inp.aimX, inp.aimY, tool);
        this.cd = 1 / e.econ.toolRate(tool);
        this.swing = 1;
      } else if (pressed && !working) this.swing = 1;
      if (obj) { obj.platenY = -1e9; obj.viseL = -1e9; obj.viseR = 1e9; }
      return;
    }

    const auto = e.econ.stats.autoPress > 0;
    this.active = working && (this.held || auto);
    const factor = this.held ? 1 : 0.4;
    if (!obj) { this.contact = false; return; }
    const H = obj.H, W = obj.W;
    const speed = e.econ.pistonSpeed(tool);
    this.contact = false;
    if (tool.kind === 'press') {
      const start = -H * 1.35;
      if (this.active) {
        this.pressY += H * 1.4 * speed * dt * factor;
        const pen = H * (1 - obj.comp) * 0.07 * Math.min(1, this.strain);
        if (this.pressY >= obj.rawTop) { this.contact = true; this.pressY = Math.min(this.pressY, obj.rawTop + pen); }
      } else this.pressY = Math.max(start, this.pressY - H * 2.2 * dt);
      if (this.pressY < start) this.pressY = start;
      obj.platenY = this.pressY;
    } else if (tool.kind === 'vise') {
      const open = W * 0.95;
      if (this.active) {
        this.jaw -= W * 0.9 * speed * dt * factor;
        const reach = Math.max(-obj.rawLeft, obj.rawRight);
        const pen = W * 0.05 * Math.min(1, this.strain);
        if (this.jaw <= reach) { this.contact = true; this.jaw = Math.max(this.jaw, reach - pen); }
      } else this.jaw = Math.min(open, this.jaw + W * 1.5 * dt);
      obj.viseL = -this.jaw; obj.viseR = this.jaw;
    } else if (tool.kind === 'implode') {
      const target = this.active ? 0.12 + obj.frac * 0.5 : obj.frac * 0.25;
      obj.implode += (target - obj.implode) * Math.min(1, dt * 4);
      this.contact = this.active;
    }
    if (this.contact) e.continuousDamage(tool, dt * factor);
    else this.strain = Math.max(0, this.strain - dt * 3);
  }
}
