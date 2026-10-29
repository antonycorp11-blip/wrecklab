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
  /** real-world width in cm (drives camera scale vs. tool size) */
  cm: number;
  maxCompress: number;
  build: () => PartSpec[];
}

export type ToolKind = 'pinch' | 'strike' | 'press' | 'implode';

export interface ToolDef {
  id: string;
  name: string;
  icon: string;
  kind: ToolKind;
  /** pressure per impact */
  force: number;
  /** impacts per second while held */
  rate: number;
  /** contact radius in screen px (before area upgrades) */
  radius: number;
  cost: number;
  rareCost?: number;
  rep: number;
  desc: string;
  color: string;
  stage: number;
}

export interface SceneDef {
  id: string;
  name: string;
  wall: 'tiles' | 'bricks' | 'planks' | 'corrugated' | 'concrete' | 'vault' | 'panels' | 'sky' | 'space' | 'drawer';
  wallColors: [string, string];
  floor: 'tiles' | 'wood' | 'concrete' | 'dirt' | 'asphalt' | 'metal' | 'liner';
  floorColors: [string, string];
  props: string[];
}

export interface ContractDef {
  id: string;
  num: string;
  /** series id: contracts of a series share client, story and scene */
  series: string;
  part: number;
  parts: number;
  name: string;
  subtitle: string;
  client: string;
  icon: string;
  story: string;
  quote: string;
  scene: string;
  stock: [string, number][];
  /** items on screen at once (before upgrades) */
  field: number;
  money: number;
  scrap: number;
  rep: number;
  sp: number;
  req: { rep?: number; force?: number; contract?: string; tool?: string };
}

export type StatKey =
  | 'forceMult' | 'forceFlat' | 'rateMult' | 'areaMult' | 'critChance' | 'critMult'
  | 'moneyMult' | 'scrapMult' | 'rareChance' | 'contractBonus' | 'repMult'
  | 'autoHit' | 'feedSpeed' | 'autoPress' | 'dentMult' | 'fragMult' | 'pierce'
  | 'vsMetal' | 'vsGlass' | 'vsWood' | 'vsPlastic' | 'pressSpeed'
  | 'doubleHit' | 'residual' | 'domino' | 'phantom' | 'resonance' | 'gravity'
  | 'recycle' | 'shockwave' | 'chain' | 'spMult' | 'toolDiscount' | 'runTime' | 'fieldCap';

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
  /** best = best fraction of the stock crushed in a single run */
  contracts: Record<string, { done: number; best: number; tries: number }>;
  challenges: Record<string, { done: boolean; claimed: boolean }>;
  stats: {
    destroyed: number; hits: number; crits: number; rare: number; mass: number;
    playTime: number; contracts: number; moneyEarned: number; glass: number; runs: number; bestRun: number;
    byObject: Record<string, number>;
  };
  settings: { volume: number; muted: boolean; quality: 'auto' | 'high' | 'low'; shake: boolean };
  /** selected contract */
  active: { id: string } | null;
  autoRepeat: boolean;
  milestone: number;
  seenIntro: boolean;
}
