import type { SaveData } from '../core/save';
import { SKILL, type StatKey } from '../data/skills';

export type Stats = Record<StatKey, number>;

const BASE: Stats = {
  bite: 0.27, tough: 0, ring: 4.3, gripRate: 0.5, gripMax: 1, quick: 0, scrub: 0.3, time: 10, jar: 25, dust: 0,
  heat: 0, sweep: 0, sense: 0, tip: 0, cards: 0, lucky: 0, echo: 0, helper: 0, calm: 0, slick: 0, overtime: 0, polish: 0,
};

export function computeStats(s: SaveData): Stats {
  const out = { ...BASE };
  for (const [id, lvl] of Object.entries(s.skills)) {
    const n = SKILL[id];
    if (!n || lvl <= 0) continue;
    for (const [k, v] of n.effects) out[k] += v * lvl;
  }
  out.calm = Math.min(0.9, out.calm);
  return out;
}

export const skillLevel = (s: SaveData, id: string) => s.skills[id] ?? 0;
export const skillCost = (s: SaveData, id: string) => { const n = SKILL[id]; return Math.ceil(n.cost * Math.pow(n.growth, skillLevel(s, id))); };
export const skillVisible = (s: SaveData, id: string) => { const n = SKILL[id]; return !n.parent || skillLevel(s, n.parent) > 0; };
export const skillMaxed = (s: SaveData, id: string) => { const n = SKILL[id]; return n.max > 0 && skillLevel(s, id) >= n.max; };
export function canBuySkill(s: SaveData, id: string) {
  const n = SKILL[id];
  if (!skillVisible(s, id) || skillMaxed(s, id)) return false;
  return (n.curr === 'po' ? s.po : s.brilho) >= skillCost(s, id);
}
export function buySkill(s: SaveData, id: string) {
  if (!canBuySkill(s, id)) return false;
  const n = SKILL[id], c = skillCost(s, id);
  if (n.curr === 'po') s.po -= c; else s.brilho -= c;
  s.skills[id] = skillLevel(s, id) + 1;
  return true;
}
