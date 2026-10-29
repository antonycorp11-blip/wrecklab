import type { ContractDef, SaveData } from '../core/types';
import { CONTRACTS, CONTRACT_MAP } from '../data/contracts';
import { TOOL_MAP } from '../data/tools';
import type { EconomyManager } from './EconomyManager';
import { fmt } from '../core/util';

export class ContractManager {
  active: ContractDef | null = null;
  queue: string[] = [];
  idx = 0;
  time = 0;

  constructor(private save: SaveData, private econ: EconomyManager) {}
  setSave(s: SaveData) { this.save = s; }

  lockReasons(c: ContractDef): string[] {
    const r: string[] = [];
    const q = c.req;
    if (q.contract && !this.save.contracts[q.contract]?.done) r.push(`Concluir ${CONTRACT_MAP[q.contract].num}`);
    if (q.rep && this.save.rep < q.rep) r.push(`Reputação ${q.rep}`);
    if (q.force && this.econ.capability() < q.force) r.push(`Pressão ${fmt(q.force)}`);
    if (q.tool && !this.save.tools[q.tool]?.owned) r.push(TOOL_MAP[q.tool].name);
    return r;
  }

  available() { return CONTRACTS.filter((c) => this.lockReasons(c).length === 0); }

  start(id: string, idx = 0, time = 0) {
    const c = CONTRACT_MAP[id];
    if (!c) return false;
    this.active = c;
    this.queue = c.items.flatMap(([o, n]) => Array(n).fill(o));
    this.idx = Math.min(idx, this.queue.length - 1);
    this.time = time;
    this.persist();
    return true;
  }

  current() { return this.active ? this.queue[this.idx] : null; }
  remaining() { return this.active ? this.queue.length - this.idx : 0; }

  /** Advance after an object is destroyed. Returns true when the contract is finished. */
  advance() {
    this.idx++;
    const done = this.idx >= this.queue.length;
    this.persist();
    return done;
  }

  persist() { this.save.active = this.active ? { id: this.active.id, idx: this.idx, time: this.time } : null; }

  /** Rewards for completing the active contract. */
  rewards() {
    const c = this.active!;
    const first = !this.save.contracts[c.id]?.done;
    const s = this.econ.stats;
    const fast = this.time <= c.par;
    const mult = (1 + s.contractBonus) * (first ? 1.5 : 1) * (fast ? 1.5 : 1);
    return {
      first, fast,
      money: Math.ceil(c.money * mult * (1 + s.moneyMult)),
      scrap: Math.ceil(c.scrap * (1 + s.scrapMult) * (fast ? 1.25 : 1)),
      rep: Math.round(c.rep * (first ? 1 : 0.25) * (1 + s.repMult) * 100) / 100,
      sp: first ? Math.ceil(c.sp * (1 + s.spMult)) : 0,
    };
  }

  finish() {
    const c = this.active!;
    const rec = this.save.contracts[c.id] ?? { done: 0, best: 0 };
    rec.done++;
    rec.best = rec.best ? Math.min(rec.best, this.time) : this.time;
    this.save.contracts[c.id] = rec;
    this.active = null;
    this.persist();
  }
}
