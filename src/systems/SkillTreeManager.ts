import type { SaveData, SkillNode } from '../core/types';
import { SKILLS, SKILL_MAP } from '../data/skills';
import { TOOL_MAP } from '../data/tools';

export type NodeState = 'owned' | 'maxed' | 'available' | 'locked' | 'hidden';

export class SkillTreeManager {
  constructor(private save: SaveData) {}
  setSave(s: SaveData) { this.save = s; }

  level(id: string) { return this.save.skills[id] ?? 0; }

  cost(n: SkillNode) { return Math.ceil(n.cost * Math.pow(n.growth, this.level(n.id))); }

  prereqsMet(n: SkillNode) {
    if (!n.prereqs.length) return true;
    return n.all ? n.prereqs.every((p) => this.level(p) > 0) : n.prereqs.some((p) => this.level(p) > 0);
  }

  reqReason(n: SkillNode): string | null {
    if (n.req?.tool && !this.save.tools[n.req.tool]?.owned) return `Requer ${TOOL_MAP[n.req.tool].name}`;
    if (n.req?.rep && this.save.rep < n.req.rep) return `Requer reputação ${n.req.rep}`;
    return null;
  }

  state(n: SkillNode): NodeState {
    const lvl = this.level(n.id);
    if (lvl > 0) return n.max && lvl >= n.max ? 'maxed' : 'owned';
    if (this.prereqsMet(n)) return this.reqReason(n) ? 'locked' : 'available';
    // visible as a silhouette when a prerequisite is at least reachable
    const near = n.prereqs.some((p) => { const pn = SKILL_MAP[p]; return pn && (this.level(p) > 0 || this.prereqsMet(pn)); });
    if (near && !n.hidden) return 'locked';
    if (n.hidden) return n.prereqs.some((p) => this.level(p) > 0) ? 'locked' : 'hidden';
    return 'hidden';
  }

  balance(n: SkillNode) { return n.curr === 'scrap' ? this.save.scrap : n.curr === 'sp' ? this.save.sp : this.save.rare; }

  canBuy(n: SkillNode) {
    const st = this.state(n);
    if (st === 'maxed' || st === 'hidden') return false;
    if (!this.prereqsMet(n) || this.reqReason(n)) return false;
    return this.balance(n) >= this.cost(n);
  }

  buy(id: string) {
    const n = SKILL_MAP[id];
    if (!n || !this.canBuy(n)) return false;
    const c = this.cost(n);
    if (n.curr === 'scrap') this.save.scrap -= c; else if (n.curr === 'sp') this.save.sp -= c; else this.save.rare -= c;
    this.save.skills[id] = this.level(id) + 1;
    return true;
  }

  affordableCount() { return SKILLS.reduce((a, n) => a + (this.canBuy(n) ? 1 : 0), 0); }
  ownedCount() { return SKILLS.reduce((a, n) => a + (this.level(n.id) > 0 ? 1 : 0), 0); }
}
