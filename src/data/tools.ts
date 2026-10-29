import type { ToolDef } from '../core/types';

/** Cartoon-fantasy tools. All work the same way: hold and drag, the tool hits whatever is under it. */
export const TOOLS: ToolDef[] = [
  { id: 'pliers', name: 'Alicate Dentuço', icon: '🦈', kind: 'pinch', force: 4, rate: 5, radius: 36, cost: 0, rep: 0, color: '#e74c3c', stage: 0, desc: 'Um alicate com dentes de tubarão que morde tudo o que encontra.' },
  { id: 'hammer', name: 'Martelo Carrancudo', icon: '🔨', kind: 'strike', force: 10, rate: 2.6, radius: 46, cost: 70, rep: 0, color: '#e67e22', stage: 0, desc: 'Sempre de mau humor. Achata latinhas com prazer.' },
  { id: 'sledge', name: 'Marreta Trovão', icon: '⚡', kind: 'strike', force: 45, rate: 1.5, radius: 64, cost: 1100, rep: 3, color: '#f1c40f', stage: 1, desc: 'Cada golpe solta um trovão que amassa tudo em volta.' },
  { id: 'press', name: 'Prensa Bocuda', icon: '👄', kind: 'press', force: 220, rate: 1.2, radius: 86, cost: 9000, rep: 8, color: '#9b59b6', stage: 2, desc: 'Uma prensa faminta. Desce com a boca aberta e mastiga a sucata.' },
  { id: 'dragon', name: 'Prensa Dragão', icon: '🐲', kind: 'press', force: 1500, rate: 1.4, radius: 104, cost: 150000, rep: 25, color: '#27ae60', stage: 3, desc: 'Um dragão de ferro que esmaga carros e cospe faíscas.' },
  { id: 'anvil', name: 'Bigorna Cadente', icon: '☄️', kind: 'press', force: 9000, rate: 1.5, radius: 124, cost: 3e6, rareCost: 25, rep: 60, color: '#e84393', stage: 4, desc: 'Bigornas caem do céu onde você apontar.' },
  { id: 'gravity', name: 'Punho Gravitacional', icon: '🌀', kind: 'press', force: 60000, rate: 1.7, radius: 146, cost: 1e8, rareCost: 120, rep: 130, color: '#6c5ce7', stage: 5, desc: 'Um punho cósmico que multiplica o próprio peso.' },
  { id: 'blackhole', name: 'Buraco Negro de Bolso', icon: '🕳️', kind: 'implode', force: 450000, rate: 2, radius: 170, cost: 4e9, rareCost: 600, rep: 250, color: '#00cec9', stage: 5, desc: 'Suga tudo para um ponto. Cuidado com os dedos.' },
];

export const TOOL_MAP: Record<string, ToolDef> = Object.fromEntries(TOOLS.map((t) => [t.id, t]));
export const TOOL_INDEX: Record<string, number> = Object.fromEntries(TOOLS.map((t, i) => [t.id, i]));

/** Shop upgrade costs per tool level (money). */
export const upgradeCost = (tool: ToolDef, kind: 'f' | 's' | 'a', lvl: number) => {
  const base = Math.max(15, tool.cost * 0.12) * (kind === 'f' ? 1 : kind === 's' ? 1.3 : 1.15);
  return Math.ceil(base * Math.pow(kind === 'f' ? 1.45 : 1.55, lvl));
};
export const UPGRADE_MAX = 25;
