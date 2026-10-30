import { PLACES } from '../data/places';

export interface PlaceState { best: number; stamp: boolean; polish: boolean; finds: boolean[]; shifts: number }

export interface SaveData {
  v: number;
  po: number;
  brilho: number;
  skills: Record<string, number>;
  places: Record<string, PlaceState>;
  tool: string;
  current: string;
  settings: { volume: number; muted: boolean; latch: boolean; haptics: boolean };
  stats: { shifts: number; poTotal: number; finds: number; stamps: number; playTime: number };
  intro: boolean;
}

const KEY = 'esfrega.save';
export const SAVE_VERSION = 1;

export const blankPlace = (): PlaceState => ({ best: 0, stamp: false, polish: false, finds: [false, false, false], shifts: 0 });

export function defaultSave(): SaveData {
  return {
    v: SAVE_VERSION, po: 0, brilho: 0, skills: { root: 1 },
    places: Object.fromEntries(PLACES.map((p) => [p.id, blankPlace()])),
    tool: 'dedo', current: 'janela',
    settings: { volume: 0.7, muted: false, latch: false, haptics: true },
    stats: { shifts: 0, poTotal: 0, finds: 0, stamps: 0, playTime: 0 },
    intro: false,
  };
}

const num = (v: unknown, d: number) => (typeof v === 'number' && isFinite(v) ? v : d);

function sanitize(raw: any): SaveData {
  const d = defaultSave();
  if (!raw || typeof raw !== 'object') return d;
  d.po = Math.max(0, num(raw.po, 0));
  d.brilho = Math.max(0, num(raw.brilho, 0));
  if (raw.skills && typeof raw.skills === 'object') for (const [k, v] of Object.entries(raw.skills)) if (typeof v === 'number') d.skills[k] = v;
  d.skills.root = 1;
  if (raw.places) for (const p of PLACES) {
    const r = raw.places[p.id];
    if (!r) continue;
    d.places[p.id] = {
      best: Math.min(1, num(r.best, 0)), stamp: !!r.stamp, polish: !!r.polish, shifts: num(r.shifts, 0),
      finds: [0, 1, 2].map((i) => !!(Array.isArray(r.finds) && r.finds[i])),
    };
  }
  if (typeof raw.tool === 'string') d.tool = raw.tool;
  if (typeof raw.current === 'string' && d.places[raw.current]) d.current = raw.current;
  if (raw.settings) {
    d.settings.volume = Math.min(1, Math.max(0, num(raw.settings.volume, 0.7)));
    d.settings.muted = !!raw.settings.muted;
    d.settings.latch = !!raw.settings.latch;
    d.settings.haptics = raw.settings.haptics !== false;
  }
  if (raw.stats) for (const k of Object.keys(d.stats) as (keyof SaveData['stats'])[]) d.stats[k] = num(raw.stats[k], 0);
  d.intro = !!raw.intro;
  return d;
}

/** Future format changes go here, keyed by the version being upgraded from. */
const MIGRATIONS: Record<number, (s: any) => any> = {};

export const Save = {
  load(): SaveData {
    try {
      const txt = localStorage.getItem(KEY);
      if (!txt) return defaultSave();
      let raw = JSON.parse(txt);
      let v = num(raw?.v, 1);
      while (v < SAVE_VERSION && MIGRATIONS[v]) raw = MIGRATIONS[v++](raw);
      return sanitize(raw);
    } catch { return defaultSave(); }
  },
  store(s: SaveData) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* blocked */ } },
  wipe() { try { localStorage.removeItem(KEY); } catch { /* blocked */ } },
  export(s: SaveData) { return btoa(unescape(encodeURIComponent(JSON.stringify(s)))); },
  import(code: string): SaveData | null { try { return sanitize(JSON.parse(decodeURIComponent(escape(atob(code.trim()))))); } catch { return null; } },
};
