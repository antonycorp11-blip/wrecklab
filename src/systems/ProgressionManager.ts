import type { SaveData } from '../core/types';
import { CHALLENGES } from '../data/challenges';
import { TOOLS, TOOL_INDEX } from '../data/tools';

export const STAGES = [
  { name: 'Bancada Improvisada' }, { name: 'Oficina' }, { name: 'Galpão' },
  { name: 'Centro Industrial' }, { name: 'Complexo Colossal' }, { name: 'Laboratório Futurista' },
];

const MILESTONES = [10, 25, 50, 100, 175, 250, 400, 600, 900, 1300, 2000, 3000, 5000, 8000, 12000];

/** Tracks challenges, milestones and the workshop stage. */
export class ProgressionManager {
  private recentKills: number[] = [];
  private recentCrits: number[] = [];
  run = { rare: 0, auto: false, switched: false, tools: new Set<string>() };

  constructor(private save: SaveData, private notify: (msg: string, icon?: string) => void) {}
  setSave(s: SaveData) { this.save = s; }

  stage() {
    let s = 0;
    for (const t of TOOLS) if (this.save.tools[t.id].owned) s = Math.max(s, t.stage);
    return s;
  }

  startRun() { this.run = { rare: 0, auto: false, switched: false, tools: new Set([this.save.equipped]) }; }

  complete(id: string) {
    const c = this.save.challenges[id] ?? { done: false, claimed: false };
    if (c.done) return;
    c.done = true;
    this.save.challenges[id] = c;
    const def = CHALLENGES.find((x) => x.id === id);
    if (def) this.notify(`Desafio concluído: ${def.name}! Resgate a recompensa.`, def.icon);
  }

  onDestroyed(objId: string, maxHp: number, oneHit: boolean, now: number, toolId: string) {
    this.recentKills.push(now);
    this.recentKills = this.recentKills.filter((t) => now - t < 5);
    if (this.recentKills.length >= 10) this.complete('fast10');
    if (oneHit && maxHp >= 100) this.complete('oneshot');
    if (objId === 'safe' && TOOL_INDEX[toolId] <= 1) this.complete('stubborn');
    if ((this.save.stats.byObject.car ?? 0) >= 5) this.complete('cars5');
    if (this.save.stats.destroyed >= 500) this.complete('d500');
    if (this.save.stats.mass >= 10000) this.complete('mass10t');
    if (this.save.stats.glass >= 25) this.complete('glass25');
    // milestone skill points
    const next = MILESTONES[this.save.milestone] ?? (MILESTONES[MILESTONES.length - 1] * Math.pow(1.5, this.save.milestone - MILESTONES.length + 1));
    if (this.save.stats.destroyed >= next) {
      this.save.milestone++;
      this.save.sp += 1;
      this.notify(`Marco: ${Math.floor(next)} objetos destruídos! +1 ponto de habilidade`, '🏅');
    }
  }

  onCrit(now: number) {
    this.recentCrits.push(now);
    this.recentCrits = this.recentCrits.filter((t) => now - t < 4);
    if (this.recentCrits.length >= 5) this.complete('crit5');
  }

  onRare() { this.run.rare++; if (this.run.rare >= 3) this.complete('rare3'); }

  onToolSwitch(id: string) { if (!this.run.tools.has(id)) { this.run.tools.add(id); this.run.switched = true; } }

  onRunEnd(crushed: number, auto: boolean) {
    if (crushed >= 30) this.complete('run30');
    if (crushed >= 20 && !auto) this.complete('manual');
  }

  onContractDone() {
    if (!this.run.switched) this.complete('loyal');
  }
}
