import type { ToolDef } from '../core/types';

export const TOOLS: ToolDef[] = [
  { id: 'pliers', name: 'Alicate Velho', icon: '🗜️', kind: 'pinch', force: 3, rate: 3.2, radius: 34, cost: 0, rep: 0, color: '#c0392b', stage: 0, desc: 'Segure sobre o objeto para mordiscar e amassar pequenas regiões.' },
  { id: 'hammer', name: 'Martelo', icon: '🔨', kind: 'strike', force: 10, rate: 2.1, radius: 52, cost: 70, rep: 0, color: '#8e6b3e', stage: 0, desc: 'Toque onde quer bater. Cada golpe deixa um amassado localizado.' },
  { id: 'sledge', name: 'Marreta', icon: '⚒️', kind: 'strike', force: 46, rate: 0.85, radius: 95, cost: 1100, rep: 3, color: '#636e72', stage: 1, desc: 'Golpes lentos e devastadores, com onda de impacto.' },
  { id: 'vise', name: 'Torno Mecânico', icon: '🧰', kind: 'vise', force: 70, rate: 0, radius: 0, cost: 6500, rep: 8, color: '#2980b9', stage: 1, desc: 'Segure para comprimir o objeto pelas laterais, sem parar.' },
  { id: 'press', name: 'Prensa Mecânica', icon: '🏗️', kind: 'press', force: 260, rate: 0, radius: 0, cost: 32000, rep: 15, color: '#f39c12', stage: 2, desc: 'A primeira prensa. Segure para descer o pistão e esmagar tudo.' },
  { id: 'hydro', name: 'Prensa Hidráulica', icon: '🛢️', kind: 'press', force: 1600, rate: 0, radius: 0, cost: 420000, rep: 35, color: '#16a085', stage: 3, desc: 'Pressão hidráulica constante. Carros viram sanduíche.' },
  { id: 'multi', name: 'Prensa Multipistão', icon: '🏭', kind: 'press', force: 9000, rate: 0, radius: 0, pistons: 3, cost: 6.5e6, rareCost: 25, rep: 70, color: '#d35400', stage: 4, desc: 'Três pistões industriais descendo em sincronia.' },
  { id: 'gravity', name: 'Compactador Gravitacional', icon: '🌀', kind: 'press', force: 60000, rate: 0, radius: 0, cost: 1.2e8, rareCost: 120, rep: 140, color: '#8e44ad', stage: 5, desc: 'Gravidade artificial multiplica a força do pistão.' },
  { id: 'implode', name: 'Campo de Implosão', icon: '💠', kind: 'implode', force: 450000, rate: 0, radius: 0, cost: 4e9, rareCost: 600, rep: 260, color: '#00cec9', stage: 5, desc: 'Concentra toda a estrutura em um ponto central.' },
];

export const TOOL_MAP: Record<string, ToolDef> = Object.fromEntries(TOOLS.map((t) => [t.id, t]));
export const TOOL_INDEX: Record<string, number> = Object.fromEntries(TOOLS.map((t, i) => [t.id, i]));

/** Shop upgrade costs per tool level (money). */
export const upgradeCost = (tool: ToolDef, kind: 'f' | 's' | 'a', lvl: number) => {
  const base = Math.max(15, tool.cost * 0.12) * (kind === 'f' ? 1 : kind === 's' ? 1.3 : 1.15);
  return Math.ceil(base * Math.pow(kind === 'f' ? 1.45 : 1.55, lvl));
};
export const UPGRADE_MAX = 25;
