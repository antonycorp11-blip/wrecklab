import type { ContractDef, SaveData } from '../core/types';
import { CONTRACTS, CONTRACT_MAP, stockTotal } from '../data/contracts';
import { TOOL_MAP } from '../data/tools';
import type { EconomyManager } from './EconomyManager';
import { fmt } from '../core/util';

/** A contract is a big stock of items worked through over several timed runs. */
export class ContractManager {
  active: ContractDef | null = null;
  left: Record<string, number> = {};
  runs = 0;

  constructor(private save: SaveData, private econ: EconomyManager) {}

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

  start(id: string) {
    const c = CONTRACT_MAP[id];
    if (!c) return false;
    this.active = c;
    const saved = this.save.active?.id === id ? this.save.active : null;
    this.left = saved ? { ...saved.left } : Object.fromEntries(c.stock);
    this.runs = saved ? saved.runs : 0;
    this.persist();
    return true;
  }

  total() { return this.active ? stockTotal(this.active) : 0; }
  remaining() { return Object.values(this.left).reduce((a, n) => a + n, 0); }
  crushed() { return this.total() - this.remaining(); }

  /** Pick the next item for the floor, given how many of each are already lying there. */
  draw(onField: Record<string, number>): string | null {
    const pool: [string, number][] = [];
    let sum = 0;
    for (const [id, n] of Object.entries(this.left)) {
      const avail = n - (onField[id] ?? 0);
      if (avail > 0) { pool.push([id, avail]); sum += avail; }
    }
    if (!sum) return null;
    let r = Math.random() * sum;
    for (const [id, n] of pool) { if ((r -= n) <= 0) return id; }
    return pool[pool.length - 1][0];
  }

  onDestroyed(id: string) { if (this.left[id] > 0) this.left[id]--; }

  persist() { this.save.active = this.active ? { id: this.active.id, left: { ...this.left }, runs: this.runs } : null; }

  rewards() {
    const c = this.active!;
    const first = !this.save.contracts[c.id]?.done;
    const s = this.econ.stats;
    const mult = (1 + s.contractBonus) * (first ? 1 : 0.5);
    return {
      first,
      money: Math.ceil(c.money * mult * (1 + s.moneyMult)),
      scrap: Math.ceil(c.scrap * mult * (1 + s.scrapMult)),
      rep: Math.round(c.rep * (first ? 1 : 0.25) * (1 + s.repMult) * 100) / 100,
      sp: first ? Math.ceil(c.sp * (1 + s.spMult)) : 0,
      runs: this.runs,
    };
  }

  finish() {
    const c = this.active!;
    const rec = this.save.contracts[c.id] ?? { done: 0, runs: 0 };
    rec.done++;
    rec.runs = rec.runs ? Math.min(rec.runs, this.runs) : this.runs;
    this.save.contracts[c.id] = rec;
    this.active = null;
    this.left = {};
    this.persist();
  }
}
