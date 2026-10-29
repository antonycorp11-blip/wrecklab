export type MaterialId = 'plastic' | 'aluminum' | 'glass' | 'wood' | 'steel' | 'rubber' | 'alloy' | 'quantum';
export type SoundKind = 'metal' | 'plastic' | 'glass' | 'wood' | 'rubber' | 'exotic';

export interface MaterialDef {
  id: MaterialId;
  name: string;
  /** fraction of each deformation that springs back */
  elasticity: number;
  /** strength of accordion folds when compressed */
  crease: number;
  /** tendency to crack / splinter */
  brittle: number;
  /** lateral bulge when squashed */
  bulge: number;
  sound: SoundKind;
  sparks: boolean;
  chip: string;
}

/** Polygon in "up-positive" local units, origin at bottom-center of the object. */
export interface PartSpec {
  poly: number[];
  mat: MaterialId;
  fill: string;
  stroke?: string;
  /** open polyline (wire, spoke, antenna) drawn with `width` */
  open?: boolean;
  width?: number;
  /** damage fraction (0..1) at which the part falls off */
  detach?: number;
  /** breaks into shards when detaching */
  shatter?: boolean;
  /** recoverable rare component */
  rare?: boolean;
  z?: number;
}

export interface ObjectDef {
  id: string;
  name: string;
  size: string;
  mat: MaterialId;
  hp: number;
  hardness: number;
  value: number;
  scrap: number;
  /** kg, used for compaction stats */
  mass: number;
  maxCompress: number;
  build: () => PartSpec[];
}

export type ToolKind = 'pinch' | 'strike' | 'vise' | 'press' | 'implode';

export interface ToolDef {
  id: string;
  name: string;
  icon: string;
  kind: ToolKind;
  /** pressure per hit (pinch/strike) or per second (continuous) */
  force: number;
  /** hits per second (pinch/strike) */
  rate: number;
  /** contact radius in screen px */
  radius: number;
  cost: number;
  rareCost?: number;
  rep: number;
  desc: string;
  pistons?: number;
  color: string;
  stage: number;
}

export interface ContractDef {
  id: string;
  num: string;
  name: string;
  client: string;
  desc: string;
  items: [string, number][];
  money: number;
  scrap: number;
  rep: number;
  sp: number;
  par: number;
  req: { rep?: number; force?: number; contract?: string; tool?: string };
}

export type StatKey =
  | 'forceMult' | 'forceFlat' | 'rateMult' | 'areaMult' | 'critChance' | 'critMult'
  | 'moneyMult' | 'scrapMult' | 'rareChance' | 'contractBonus' | 'repMult'
  | 'autoHit' | 'feedSpeed' | 'autoPress' | 'dentMult' | 'fragMult' | 'pierce'
  | 'vsMetal' | 'vsGlass' | 'vsWood' | 'vsPlastic' | 'pressSpeed'
  | 'doubleHit' | 'residual' | 'domino' | 'phantom' | 'resonance' | 'gravity'
  | 'recycle' | 'shockwave' | 'chain' | 'spMult' | 'toolDiscount';

export type Stats = Record<StatKey, number>;

export type SkillCurrency = 'scrap' | 'sp' | 'rare';

export interface SkillNode {
  id: string;
  name: string;
  desc: string;
  icon: string;
  x: number;
  y: number;
  cost: number;
  curr: SkillCurrency;
  growth: number;
  /** 0 = unlimited */
  max: number;
  prereqs: string[];
  all?: boolean;
  effects: { stat: StatKey; v: number }[];
  hidden?: boolean;
  kind: 'root' | 'spine' | 'side' | 'cross' | 'special' | 'milestone' | 'infinite';
  req?: { tool?: string; rep?: number };
  family: string;
  color: string;
}

export interface ToolState { owned: boolean; f: number; s: number; a: number }

export interface SaveData {
  v: number;
  money: number;
  scrap: number;
  rare: number;
  sp: number;
  rep: number;
  tools: Record<string, ToolState>;
  equipped: string;
  skills: Record<string, number>;
  contracts: Record<string, { done: number; best: number }>;
  challenges: Record<string, { done: boolean; claimed: boolean }>;
  stats: {
    destroyed: number; hits: number; crits: number; rare: number; mass: number;
    playTime: number; contracts: number; moneyEarned: number; glass: number;
    byObject: Record<string, number>;
  };
  settings: { volume: number; muted: boolean; quality: 'auto' | 'high' | 'low'; shake: boolean };
  active: { id: string; idx: number; time: number } | null;
  autoRepeat: boolean;
  milestone: number;
  seenIntro: boolean;
}
