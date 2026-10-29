import type { SaveData, Stats, StatKey, ToolDef, MaterialId } from '../core/types';
import { SKILL_MAP } from '../data/skills';
import { TOOLS, TOOL_MAP, upgradeCost, UPGRADE_MAX } from '../data/tools';
import { isMetal } from '../data/materials';

const ZERO: Stats = {
  forceMult: 0, forceFlat: 0, rateMult: 0, areaMult: 0, critChance: 0.03, critMult: 2, moneyMult: 0, scrapMult: 0,
  rareChance: 0.02, contractBonus: 0, repMult: 0, autoHit: 0, feedSpeed: 0, autoPress: 0, dentMult: 0, fragMult: 0, pierce: 0,
  vsMetal: 0, vsGlass: 0, vsWood: 0, vsPlastic: 0, pressSpeed: 0, doubleHit: 0, residual: 0, domino: 0, phantom: 0,
  resonance: 0, gravity: 0, recycle: 0, shockwave: 0, chain: 0, spMult: 0, toolDiscount: 0, runTime: 0, fieldCap: 0,
};

export class EconomyManager {
  stats: Stats = { ...ZERO };
  constructor(private save: SaveData) { this.recompute(); }

  setSave(s: SaveData) { this.save = s; this.recompute(); }

  recompute() {
    const s: Stats = { ...ZERO };
    for (const [id, lvl] of Object.entries(this.save.skills)) {
      const node = SKILL_MAP[id];
      if (!node || lvl <= 0) continue;
      for (const e of node.effects) s[e.stat as StatKey] += e.v * lvl;
    }
    s.pierce = Math.min(0.75, s.pierce);
    s.critChance = Math.min(0.6, s.critChance);
    s.doubleHit = Math.min(0.75, s.doubleHit);
    s.toolDiscount = Math.min(0.5, s.toolDiscount);
    this.stats = s;
  }

  toolForce(t: ToolDef) {
    const st = this.save.tools[t.id];
    return (t.force + this.stats.forceFlat * (t.force / 3)) * (1 + 0.18 * st.f) * (1 + this.stats.forceMult);
  }
  toolRate(t: ToolDef) { return t.rate * (1 + 0.09 * this.save.tools[t.id].s) * (1 + this.stats.rateMult) * (t.kind === 'press' ? 1 + this.stats.pressSpeed : 1); }

  /** seconds per run */
  runTime() { return 12 + this.stats.runTime; }
  toolRadius(t: ToolDef) { return t.radius * (1 + 0.06 * this.save.tools[t.id].a) * (1 + this.stats.areaMult); }

  /** Best pressure the company can deliver — used for contract requirements. */
  capability() {
    let best = 0;
    for (const t of TOOLS) if (this.save.tools[t.id].owned) best = Math.max(best, this.toolForce(t));
    return best;
  }

  materialBonus(m: MaterialId) {
    const s = this.stats;
    if (isMetal(m)) return 1 + s.vsMetal;
    if (m === 'glass') return 1 + s.vsGlass;
    if (m === 'wood') return 1 + s.vsWood;
    if (m === 'plastic' || m === 'rubber') return 1 + s.vsPlastic;
    return 1;
  }

  /** damage efficiency of a pressure against a hardness (resistance feel) */
  efficiency(pressure: number, hardness: number, m: MaterialId) {
    const h = hardness * (1 - this.stats.pierce) / this.materialBonus(m);
    return Math.min(1.5, Math.max(0.015, Math.pow(pressure / h, 1.5)));
  }

  toolPrice(t: ToolDef) { return Math.ceil(t.cost * (1 - this.stats.toolDiscount)); }
  upgradePrice(t: ToolDef, k: 'f' | 's' | 'a') { return Math.ceil(upgradeCost(t, k, this.save.tools[t.id][k]) * (1 - this.stats.toolDiscount)); }

  canBuyTool(id: string): string | null {
    const t = TOOL_MAP[id];
    if (this.save.tools[id].owned) return 'Já possui';
    if (this.save.rep < t.rep) return `Reputação ${t.rep}`;
    if (this.save.money < this.toolPrice(t)) return 'Dinheiro insuficiente';
    if (t.rareCost && this.save.rare < t.rareCost) return `${t.rareCost} raros`;
    return null;
  }
  buyTool(id: string) {
    const t = TOOL_MAP[id];
    if (this.canBuyTool(id)) return false;
    this.save.money -= this.toolPrice(t);
    if (t.rareCost) this.save.rare -= t.rareCost;
    this.save.tools[id].owned = true;
    this.save.equipped = id;
    return true;
  }
  buyUpgrade(id: string, k: 'f' | 's' | 'a') {
    const t = TOOL_MAP[id];
    const st = this.save.tools[id];
    if (!st.owned || st[k] >= UPGRADE_MAX) return false;
    const price = this.upgradePrice(t, k);
    if (this.save.money < price) return false;
    this.save.money -= price;
    st[k]++;
    return true;
  }
}
