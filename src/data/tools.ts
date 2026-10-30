import type { GunkId } from './gunk';

export interface ToolDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  /** multiplier on the contact ring */
  ring: number;
  /** multiplier on bite */
  bite: number;
  /** extra nail toughness */
  tough: number;
  /** extra scrub bonus */
  scrub: number;
  /** cleans while held still (no rubbing needed) */
  steady?: boolean;
  /** per-gunk efficiency */
  vs: Partial<Record<GunkId, number>>;
  /** skill node that unlocks it */
  unlock?: string;
}

export const TOOLS: ToolDef[] = [
  { id: 'dedo', name: 'Dedo', icon: '☝️', desc: 'O bom e velho dedo. Faz de tudo um pouco.', ring: 1, bite: 1, tough: 0, scrub: 0, vs: {} },
  { id: 'esponja', name: 'Esponja', icon: '🧽', desc: 'Área enorme, mão leve. Não espalha fuligem e adora gordura.', ring: 1.6, bite: 0.6, tough: 0, scrub: 0, vs: { gordura: 2, fuligem: 1.8 }, unlock: 'tool_esponja' },
  { id: 'espatula', name: 'Espátula', icon: '🔪', desc: 'Pontinha estreita e afiada. Arranca chiclete e ferrugem.', ring: 0.65, bite: 2.2, tough: 1, scrub: -0.5, vs: { chiclete: 2, ferrugem: 2.2 }, unlock: 'tool_espatula' },
  { id: 'escova', name: 'Escova de Aço', icon: '🪥', desc: 'Feita para o vai e volta. O bônus de esfregar dobra.', ring: 1, bite: 1, tough: 1, scrub: 1, vs: { limo: 2.4, ferrugem: 1.3 }, unlock: 'tool_escova' },
  { id: 'vapor', name: 'Vaporizador', icon: '♨️', desc: 'Limpa só de apontar, sem esfregar. Derrete gordura e chiclete.', ring: 1.2, bite: 0.8, tough: 1, scrub: 0, steady: true, vs: { gordura: 2.5, chiclete: 2, limo: 1.5 }, unlock: 'tool_vapor' },
];
export const TOOL: Record<string, ToolDef> = Object.fromEntries(TOOLS.map((t) => [t.id, t]));
