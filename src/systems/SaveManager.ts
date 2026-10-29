import type { SaveData } from '../core/types';
import { TOOLS } from '../data/tools';

const KEY = 'wrecklab.save';
export const SAVE_VERSION = 2;

export function defaultSave(): SaveData {
  return {
    v: SAVE_VERSION,
    money: 0, scrap: 0, rare: 0, sp: 0, rep: 0,
    tools: Object.fromEntries(TOOLS.map((t) => [t.id, { owned: t.id === 'pliers', f: 0, s: 0, a: 0 }])),
    equipped: 'pliers',
    skills: { root: 1 },
    contracts: {},
    challenges: {},
    stats: { destroyed: 0, hits: 0, crits: 0, rare: 0, mass: 0, playTime: 0, contracts: 0, moneyEarned: 0, glass: 0, runs: 0, bestRun: 0, byObject: {} },
    settings: { volume: 0.7, muted: false, quality: 'auto', shake: true },
    active: null,
    autoRepeat: true,
    milestone: 0,
    seenIntro: false,
  };
}

const num = (v: unknown, d: number) => (typeof v === 'number' && isFinite(v) ? v : d);

/** Merge an untrusted object onto defaults, keeping only well-typed values. */
function sanitize(raw: any): SaveData {
  const d = defaultSave();
  if (!raw || typeof raw !== 'object') return d;
  for (const k of ['money', 'scrap', 'rare', 'sp', 'rep', 'milestone'] as const) d[k] = Math.max(0, num(raw[k], d[k]));
  if (raw.tools && typeof raw.tools === 'object') for (const t of TOOLS) {
    const r = raw.tools[t.id];
    if (r) d.tools[t.id] = { owned: !!r.owned || t.id === 'pliers', f: num(r.f, 0), s: num(r.s, 0), a: num(r.a, 0) };
  }
  if (typeof raw.equipped === 'string' && d.tools[raw.equipped]?.owned) d.equipped = raw.equipped;
  if (raw.skills && typeof raw.skills === 'object') for (const [k, v] of Object.entries(raw.skills)) if (typeof v === 'number') d.skills[k] = v;
  d.skills.root = 1;
  if (raw.contracts && typeof raw.contracts === 'object') for (const [k, v] of Object.entries<any>(raw.contracts)) d.contracts[k] = { done: num(v?.done, 0), runs: num(v?.runs, 0) };
  if (raw.challenges && typeof raw.challenges === 'object') for (const [k, v] of Object.entries<any>(raw.challenges)) d.challenges[k] = { done: !!v?.done, claimed: !!v?.claimed };
  if (raw.stats) {
    for (const k of Object.keys(d.stats) as (keyof SaveData['stats'])[]) if (k !== 'byObject') (d.stats as any)[k] = num(raw.stats[k], 0);
    if (raw.stats.byObject) for (const [k, v] of Object.entries(raw.stats.byObject)) if (typeof v === 'number') d.stats.byObject[k] = v;
  }
  if (raw.settings) {
    d.settings.volume = Math.min(1, Math.max(0, num(raw.settings.volume, 0.7)));
    d.settings.muted = !!raw.settings.muted;
    d.settings.shake = raw.settings.shake !== false;
    if (['auto', 'high', 'low'].includes(raw.settings.quality)) d.settings.quality = raw.settings.quality;
  }
  if (raw.active && typeof raw.active.id === 'string' && raw.active.left && typeof raw.active.left === 'object') {
    const left: Record<string, number> = {};
    for (const [k, v] of Object.entries(raw.active.left)) if (typeof v === 'number') left[k] = Math.max(0, v);
    d.active = { id: raw.active.id, left, runs: num(raw.active.runs, 0) };
  }
  d.autoRepeat = raw.autoRepeat !== false;
  d.seenIntro = !!raw.seenIntro;
  return d;
}

/** Future format changes go here, keyed by the version being upgraded from. */
const MIGRATIONS: Record<number, (s: any) => any> = {
  // v1 → v2: run-based contracts and new tools. Keep only settings and lifetime stats.
  1: (s) => ({ v: 2, settings: s?.settings, seenIntro: true, stats: s?.stats ? { ...s.stats, byObject: s.stats.byObject } : undefined }),
};

export const SaveManager = {
  load(): SaveData {
    try {
      const txt = localStorage.getItem(KEY);
      if (!txt) return defaultSave();
      let raw = JSON.parse(txt);
      let v = num(raw?.v, 1);
      while (v < SAVE_VERSION && MIGRATIONS[v]) raw = MIGRATIONS[v++](raw);
      return sanitize(raw);
    } catch {
      return defaultSave();
    }
  },
  save(s: SaveData) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage full or blocked */ }
  },
  reset() {
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  },
  export(s: SaveData) { return btoa(unescape(encodeURIComponent(JSON.stringify(s)))); },
  import(code: string): SaveData | null {
    try { return sanitize(JSON.parse(decodeURIComponent(escape(atob(code.trim()))))); } catch { return null; }
  },
};
