import type { GameEngine } from '../core/GameEngine';

/** Hold-and-drag tool: follows the aim point and fires impacts at the tool's rate while held. */
export class ToolSystem {
  cd = 0;
  /** 1 at the moment of impact, decays to 0 */
  anim = 0;
  x = 0;
  y = 0;
  held = false;
  autoFx: { x: number; y: number; t: number }[] = [];
  phantom: { x: number; y: number; t: number } | null = null;

  update(dt: number, e: GameEngine) {
    const inp = e.input;
    this.cd -= dt;
    this.anim = Math.max(0, this.anim - dt * 5);
    for (const f of this.autoFx) f.t -= dt;
    this.autoFx = this.autoFx.filter((f) => f.t > 0);
    const pressed = inp.consumePress();
    const tx = inp.aimX, ty = inp.aimY;
    // light smoothing so the tool feels weighty but stays under control
    const k = Math.min(1, dt * 30);
    this.x += (tx - this.x) * (pressed ? 1 : k);
    this.y += (ty - this.y) * (pressed ? 1 : k);
    this.held = inp.down || pressed;
    if (e.phase !== 'run') return;
    if (this.held && this.cd <= 0) {
      const tool = e.tool;
      e.impact(this.x, this.y, tool);
      this.cd = 1 / e.econ.toolRate(tool);
      this.anim = 1;
    }
  }
}
