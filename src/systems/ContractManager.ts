import type { ContractDef, SaveData } from '../core/types';
import { CONTRACTS, CONTRACT_MAP, stockTotal } from '../data/contracts';
import { TOOL_MAP } from '../data/tools';
import type { EconomyManager } from './EconomyManager';
import { fmt } from '../core/util';

/**
 * The selected contract. Every run starts from the full stock: the job only counts
 * as done when everything is crushed within a single run.
 */
export class ContractManager {
  active: ContractDef | null = null;
  left: Record<string, number> = {};

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

  select(id: string) {
    const c = CONTRACT_MAP[id];
    if (!c) return false;
    this.active = c;
    this.reset();
    this.save.active = { id };
    return true;
  }

  /** refill the whole stock (start of every run) */
  reset() { this.left = this.active ? Object.fromEntries(this.active.stock) : {}; }

  total() { return this.active ? stockTotal(this.active) : 0; }
  remaining() { return Object.values(this.left).reduce((a, n) => a + n, 0); }
  crushed() { return this.total() - this.remaining(); }
  record() { return this.active ? this.save.contracts[this.active.id] : undefined; }

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

  /** store the result of a run (fraction of the stock crushed) */
  recordRun(done: boolean) {
    const c = this.active!;
    const rec = this.save.contracts[c.id] ?? { done: 0, best: 0, tries: 0 };
    rec.tries++;
    rec.best = Math.max(rec.best, this.crushed() / this.total());
    if (done) rec.done++;
    this.save.contracts[c.id] = rec;
  }

  rewards() {
    const c = this.active!;
    const first = !this.save.contracts[c.id]?.done;
    const s = this.econ.stats;
    const mult = (1 + s.contractBonus) * (first ? 1 : 0.4);
    return {
      first,
      money: Math.ceil(c.money * mult * (1 + s.moneyMult)),
      scrap: Math.ceil(c.scrap * mult * (1 + s.scrapMult)),
      rep: Math.round(c.rep * (first ? 1 : 0.2) * (1 + s.repMult) * 100) / 100,
      sp: first ? Math.ceil(c.sp * (1 + s.spMult)) : 0,
    };
  }

  /** next contract after the active one, if unlocked */
  next(): ContractDef | null {
    const i = CONTRACTS.findIndex((c) => c.id === this.active?.id);
    const n = CONTRACTS[i + 1];
    return n && !this.lockReasons(n).length ? n : null;
  }
}
