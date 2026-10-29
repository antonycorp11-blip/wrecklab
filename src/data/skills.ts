import type { SkillNode, StatKey, SkillCurrency } from '../core/types';

/**
 * The skill tree is generated from declarative family templates, so it can grow
 * to hundreds of nodes by extending the tables below.
 */
interface Family {
  id: string;
  color: string;
  angle: number;
  spine: [string, string, StatKey, number][];
  side: [string, string, StatKey, number][];
}

const FAMILIES: Family[] = [
  {
    id: 'Força', color: '#e74c3c', angle: -90,
    spine: [
      ['Pressão Básica', '💪', 'forceMult', 0.15], ['Força Adicional', '➕', 'forceFlat', 1], ['Multiplicador de Impacto', '✖️', 'forceMult', 0.25],
      ['Compressão Profunda', '⬇️', 'forceMult', 0.3], ['Ruptura Estrutural', '🧨', 'pierce', 0.04], ['Pressão Extrema', '🔥', 'forceMult', 0.5],
      ['Supercompressão', '🗜️', 'forceMult', 0.75], ['Força Titânica', '🦾', 'forceMult', 1], ['Esmagamento Absoluto', '☄️', 'forceMult', 1.5],
      ['Densidade Crítica', '⚫', 'pierce', 0.05], ['Pressão Estelar', '🌟', 'forceMult', 2.5], ['Colapso Total', '🕳️', 'forceMult', 4],
    ],
    side: [
      ['Perfuração', '🔩', 'pierce', 0.03], ['Amassado Profundo', '🥫', 'dentMult', 0.15], ['Golpe Certeiro', '🎯', 'critChance', 0.02],
      ['Impacto Brutal', '💥', 'critMult', 0.25], ['Punho de Aço', '🤜', 'vsMetal', 0.1], ['Músculo Extra', '🏋️', 'forceFlat', 2],
    ],
  },
  {
    id: 'Velocidade', color: '#f1c40f', angle: -30,
    spine: [
      ['Golpes Rápidos', '⚡', 'rateMult', 0.08], ['Recuperação de Ferramenta', '🔁', 'rateMult', 0.1], ['Ciclos de Prensa', '⏬', 'pressSpeed', 0.15],
      ['Pulso Firme', '✋', 'rateMult', 0.12], ['Velocidade Hidráulica', '🛢️', 'pressSpeed', 0.2], ['Compressão Contínua', '♾️', 'forceMult', 0.2],
      ['Ataques Múltiplos', '👊', 'doubleHit', 0.05], ['Reflexo Industrial', '🏎️', 'rateMult', 0.18], ['Pistão Turbo', '🚀', 'pressSpeed', 0.3],
      ['Frenesi', '🌪️', 'rateMult', 0.25], ['Tempo Comprimido', '⌛', 'rateMult', 0.3], ['Instantâneo', '⚡', 'rateMult', 0.4],
    ],
    side: [
      ['Esteira Rápida', '🛤️', 'feedSpeed', 0.15], ['Pegada Leve', '🪶', 'rateMult', 0.05], ['Lubrificação', '🧴', 'pressSpeed', 0.1],
      ['Golpe Duplo Menor', '✌️', 'doubleHit', 0.03], ['Ritmo', '🥁', 'resonance', 0.02], ['Fluxo', '🌊', 'feedSpeed', 0.1],
    ],
  },
  {
    id: 'Área', color: '#2ecc71', angle: 30,
    spine: [
      ['Mandíbulas Maiores', '🦷', 'areaMult', 0.1], ['Cabeça Ampliada', '🔨', 'areaMult', 0.12], ['Pistões Largos', '⬛', 'areaMult', 0.12],
      ['Área Expandida', '⭕', 'areaMult', 0.15], ['Compressão Simultânea', '🔗', 'chain', 0.05], ['Onda de Choque', '〰️', 'shockwave', 0.06],
      ['Alcance Industrial', '📐', 'areaMult', 0.2], ['Impacto Sísmico', '🌋', 'shockwave', 0.08], ['Raio Colossal', '🌐', 'areaMult', 0.25],
      ['Destruição Massiva', '🏚️', 'forceMult', 0.6], ['Varredura', '🧹', 'areaMult', 0.3], ['Horizonte de Eventos', '🌑', 'shockwave', 0.12],
    ],
    side: [
      ['Fragmentação', '🧩', 'fragMult', 0.2], ['Estilhaçador', '🪟', 'vsGlass', 0.2], ['Lascador', '🪵', 'vsWood', 0.2],
      ['Ampla Pegada', '🤲', 'areaMult', 0.06], ['Esmaga-Plástico', '🧴', 'vsPlastic', 0.2], ['Eco', '🔊', 'shockwave', 0.03],
    ],
  },
  {
    id: 'Economia', color: '#3498db', angle: 90,
    spine: [
      ['Valor de Sucata', '⚙️', 'scrapMult', 0.15], ['Recuperação de Metais', '🧲', 'moneyMult', 0.15], ['Bônus por Contrato', '📜', 'contractBonus', 0.2],
      ['Multiplicador de Recompensa', '💰', 'moneyMult', 0.25], ['Eficiência de Reciclagem', '♻️', 'scrapMult', 0.3], ['Negociador', '🤝', 'repMult', 0.15],
      ['Mercado Negro', '🕶️', 'moneyMult', 0.5], ['Garimpo', '💎', 'rareChance', 0.01], ['Fundição Própria', '🏭', 'scrapMult', 0.6],
      ['Monopólio', '🏦', 'moneyMult', 1], ['Bolsa de Metais', '📈', 'contractBonus', 0.6], ['Império da Sucata', '👑', 'moneyMult', 2],
    ],
    side: [
      ['Fornecedor Barato', '🏷️', 'toolDiscount', 0.03], ['Olho Clínico', '🔍', 'rareChance', 0.005], ['Reputação', '⭐', 'repMult', 0.1],
      ['Troco Extra', '🪙', 'moneyMult', 0.08], ['Separação', '🗂️', 'scrapMult', 0.1], ['Mentoria', '🎓', 'spMult', 0.1],
    ],
  },
  {
    id: 'Fôlego', color: '#1abc9c', angle: 120,
    spine: [
      ['Fôlego', '🫁', 'runTime', 2], ['Turno Extra', '⏱️', 'runTime', 2], ['Mesa Cheia', '🧺', 'fieldCap', 2],
      ['Café Forte', '☕', 'runTime', 3], ['Segundo Fôlego', '💨', 'runTime', 3], ['Pilha de Sucata', '🗑️', 'fieldCap', 3],
      ['Hora Extra', '🕰️', 'runTime', 4], ['Resistência', '🛡️', 'runTime', 4], ['Montanha de Tralha', '⛰️', 'fieldCap', 4],
      ['Jornada Dupla', '🌗', 'runTime', 6], ['Tempo Esticado', '🌀', 'runTime', 8], ['Eternidade', '♾️', 'runTime', 5],
    ],
    side: [
      ['Lanche', '🥪', 'runTime', 1], ['Reposição Rápida', '📦', 'feedSpeed', 0.15], ['Mais Bagunça', '🧸', 'fieldCap', 1],
      ['Alongamento', '🧘', 'runTime', 1], ['Organização', '🗂️', 'scrapMult', 0.08], ['Pausa do Café', '☕', 'runTime', 1.5],
    ],
  },
  {
    id: 'Automação', color: '#9b59b6', angle: 150,
    spine: [
      ['Alimentação Automática', '📦', 'feedSpeed', 0.25], ['Retirada Automática', '🧺', 'feedSpeed', 0.25], ['Martelo Auxiliar', '🤖', 'autoHit', 0.4],
      ['Ciclos Programados', '🗓️', 'autoHit', 0.4], ['Pistão Fantasma', '👻', 'phantom', 0.15], ['Prensas Auxiliares', '🏗️', 'autoHit', 0.6],
      ['Operação Simultânea', '⚙️', 'autoHit', 0.8], ['Esmagador Autônomo', '🦿', 'autoHit', 1], ['Linha de Montagem', '🏭', 'autoHit', 1],
      ['IA de Demolição', '🧠', 'autoHit', 1.5], ['Fábrica Escura', '🌘', 'phantom', 0.25], ['Singularidade Fabril', '♾️', 'autoHit', 2.5],
    ],
    side: [
      ['Sensor de Impacto', '📡', 'autoHit', 0.2], ['Calibração', '🎛️', 'forceMult', 0.08], ['Manutenção', '🔧', 'rateMult', 0.05],
      ['Esteira Dupla', '🛤️', 'feedSpeed', 0.1], ['Fantasma Ágil', '👻', 'phantom', 0.05], ['Servo Motor', '🔌', 'autoHit', 0.3],
    ],
  },
  {
    id: 'Especial', color: '#e67e22', angle: 210,
    spine: [
      ['Impacto Crítico', '🎯', 'critChance', 0.04], ['Fúria Crítica', '😡', 'critMult', 0.5], ['Ressonância', '🔔', 'resonance', 0.04],
      ['Compressão Residual', '🌀', 'residual', 0.1], ['Efeito Dominó', '🁢', 'domino', 0.08], ['Compressão em Cadeia', '⛓️', 'chain', 0.08],
      ['Gravidade Instável', '🪐', 'gravity', 0.05], ['Implosão', '💠', 'forceMult', 0.5], ['Reciclagem Explosiva', '♻️', 'recycle', 0.1],
      ['Multiplicação de Pressão', '✴️', 'critMult', 1], ['Campo Gravitacional', '🌌', 'gravity', 0.08], ['Destruição Massiva', '☢️', 'forceMult', 3],
    ],
    side: [
      ['Sorte de Ferreiro', '🍀', 'critChance', 0.015], ['Faísca', '✨', 'critMult', 0.15], ['Vibração', '📳', 'resonance', 0.015],
      ['Rachadura', '⚡', 'domino', 0.03], ['Peso Extra', '⚖️', 'gravity', 0.02], ['Pós-Choque', '💫', 'residual', 0.04],
    ],
  },
];

const STAT_LABEL: Record<StatKey, (v: number) => string> = {
  forceMult: (v) => `+${Math.round(v * 100)}% força`, forceFlat: (v) => `+${v} força base`, rateMult: (v) => `+${Math.round(v * 100)}% velocidade`,
  areaMult: (v) => `+${Math.round(v * 100)}% área de contato`, critChance: (v) => `+${(v * 100).toFixed(1)}% chance crítica`, critMult: (v) => `+${Math.round(v * 100)}% dano crítico`,
  moneyMult: (v) => `+${Math.round(v * 100)}% dinheiro`, scrapMult: (v) => `+${Math.round(v * 100)}% sucata`, rareChance: (v) => `+${(v * 100).toFixed(1)}% chance de material raro`,
  contractBonus: (v) => `+${Math.round(v * 100)}% bônus de contrato`, repMult: (v) => `+${Math.round(v * 100)}% reputação`, autoHit: (v) => `+${v} golpes automáticos/s`,
  feedSpeed: (v) => `+${Math.round(v * 100)}% velocidade de esteira`, autoPress: () => `ferramentas contínuas operam sozinhas`, dentMult: (v) => `+${Math.round(v * 100)}% deformação visual`,
  fragMult: (v) => `+${Math.round(v * 100)}% fragmentos`, pierce: (v) => `-${Math.round(v * 100)}% dureza efetiva`, vsMetal: (v) => `+${Math.round(v * 100)}% contra metal`,
  vsGlass: (v) => `+${Math.round(v * 100)}% contra vidro`, vsWood: (v) => `+${Math.round(v * 100)}% contra madeira`, vsPlastic: (v) => `+${Math.round(v * 100)}% contra plástico`,
  pressSpeed: (v) => `+${Math.round(v * 100)}% velocidade das prensas`, runTime: (v) => `+${v}s de tempo por run`, fieldCap: (v) => `+${v} itens no cenário`, doubleHit: (v) => `+${Math.round(v * 100)}% chance de golpe duplo`, residual: (v) => `+${Math.round(v * 100)}% compressão residual`,
  domino: (v) => `+${Math.round(v * 100)}% chance de ruptura em cadeia`, phantom: (v) => `pistão fantasma +${Math.round(v * 100)}% frequência`, resonance: (v) => `+${(v * 100).toFixed(1)}% ressonância por golpe`,
  gravity: (v) => `+${Math.round(v * 100)}% chance de compressão gravitacional`, recycle: (v) => `+${Math.round(v * 100)}% bônus ao próximo objeto`, shockwave: (v) => `+${Math.round(v * 100)}% onda de choque`,
  chain: (v) => `+${Math.round(v * 100)}% dano em cadeia`, spMult: (v) => `+${Math.round(v * 100)}% pontos de habilidade`, toolDiscount: (v) => `-${Math.round(v * 100)}% preço de ferramentas`,
};
export const describeEffect = (stat: StatKey, v: number) => STAT_LABEL[stat](v);

const SPECIAL_DESC: Record<string, string> = {
  'Ataques Múltiplos': 'Golpe Duplo: golpes podem gerar um segundo impacto.',
  'Compressão Residual': 'O objeto continua se deformando após cada impacto.',
  'Efeito Dominó': 'Rupturas podem provocar outras rupturas.',
  'Pistão Fantasma': 'Uma prensa auxiliar atinge o objeto periodicamente.',
  'Ressonância': 'Impactos sucessivos aumentam temporariamente a eficiência.',
  'Gravidade Instável': 'Impactos podem gerar compressão gravitacional extra.',
  'Reciclagem Explosiva': 'Concluir um objeto dá bônus de dano ao próximo.',
  'Onda de Choque': 'Golpes emitem uma onda que deforma a área ao redor.',
  'Compressão em Cadeia': 'Parte do dano se propaga pelos componentes.',
  'Esmagador Autônomo': 'Um robozinho esmaga itens sozinho durante a run.',
  'Martelo Auxiliar': 'Um braço robótico golpeia o objeto automaticamente.',
};

const MILESTONES: Record<number, { tool?: string; rep?: number; label: string }> = {
  3: { rep: 3, label: 'Reputação 3' },
  6: { tool: 'sledge', label: 'Requer Marreta' },
  8: { tool: 'press', label: 'Requer Prensa Bocuda' },
  10: { tool: 'dragon', label: 'Requer Prensa Dragão' },
  11: { tool: 'gravity', label: 'Requer Punho Gravitacional' },
};

function tierCost(ring: number): { cost: number; curr: SkillCurrency } {
  return { cost: Math.round(4 * Math.pow(3, ring)), curr: 'scrap' };
}

export function buildSkillTree(): SkillNode[] {
  const nodes: SkillNode[] = [];
  nodes.push({ id: 'root', name: 'Bancada Improvisada', desc: 'Onde tudo começa.', icon: '🪚', x: 0, y: 0, cost: 0, curr: 'scrap', growth: 1, max: 1, prereqs: [], effects: [], kind: 'root', family: 'Origem', color: '#f2a516' });
  const STEP = 120;
  const spineIds: string[][] = [];
  FAMILIES.forEach((fam, fi) => {
    const ids: string[] = [];
    fam.angle = -90 + (360 / FAMILIES.length) * fi;
    const a = (fam.angle * Math.PI) / 180;
    const dx = Math.cos(a), dy = Math.sin(a);
    const px = -dy, py = dx;
    fam.spine.forEach(([name, icon, stat, v], i) => {
      const ring = i + 1;
      const wobble = Math.sin(i * 1.7 + fi) * 26;
      const id = `${fi}s${i}`;
      const { cost, curr } = tierCost(ring);
      const special = SPECIAL_DESC[name];
      const ms = MILESTONES[i];
      const isLast = i === fam.spine.length - 1;
      nodes.push({
        id, name, icon, family: fam.id, color: fam.color,
        desc: special ?? `Ramo de ${fam.id}.`,
        x: dx * STEP * (ring + 0.6) + px * wobble, y: dy * STEP * (ring + 0.6) + py * wobble,
        cost: special ? Math.max(1, Math.ceil(ring / 2)) : cost, curr: special ? 'sp' : curr,
        growth: special ? 1.6 : 1.75,
        max: isLast ? 0 : special ? 3 : ring < 4 ? 10 : 8,
        prereqs: [i === 0 ? 'root' : ids[i - 1]],
        effects: [{ stat, v }],
        kind: isLast ? 'infinite' : special ? 'special' : ms ? 'milestone' : 'spine',
        req: ms ? { tool: ms.tool, rep: ms.rep } : undefined,
        hidden: ring >= 7,
      });
      ids.push(id);
      // side branches every other spine node, alternating side
      if (i % 2 === 1 || i === 0) {
        const sgn = i % 4 === 1 ? 1 : -1;
        const len = i < 4 ? 2 : 3;
        let prev = id;
        for (let k = 0; k < len; k++) {
          const [sn, si, ss, sv] = fam.side[(i + k) % fam.side.length];
          const sid = `${fi}b${i}_${k}`;
          const sc = tierCost(ring + k * 0.5);
          nodes.push({
            id: sid, name: `${sn} ${['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][Math.floor(i / 2)]}`, icon: si, family: fam.id, color: fam.color,
            desc: `Especialização de ${fam.id}.`,
            x: dx * STEP * (ring + 0.6 + k * 0.35) + px * sgn * STEP * (0.75 + k * 0.7) + px * wobble,
            y: dy * STEP * (ring + 0.6 + k * 0.35) + py * sgn * STEP * (0.75 + k * 0.7) + py * wobble,
            cost: sc.cost, curr: sc.curr, growth: 1.7, max: k === len - 1 && i >= 5 ? 0 : 6,
            prereqs: [prev], effects: [{ stat: ss, v: sv * (1 + i * 0.25) }], kind: 'side', hidden: ring >= 5 || k === 2,
          });
          prev = sid;
        }
      }
    });
    spineIds.push(ids);
  });
  // cross links between neighbouring families
  const CROSS: [string, string, StatKey, number][] = [
    ['Golpe Pesado', '🔨', 'forceMult', 0.2], ['Martelada Elástica', '🎾', 'areaMult', 0.1], ['Rendimento Industrial', '📦', 'moneyMult', 0.2],
    ['Fôlego de Ouro', '🪙', 'moneyMult', 0.2], ['Lucro Automático', '🤖', 'autoHit', 0.5], ['Sorte Programada', '🎲', 'critChance', 0.03], ['Fúria Bruta', '😤', 'critMult', 0.4],
  ];
  FAMILIES.forEach((_fam, fi) => {
    const fj = (fi + 1) % FAMILIES.length;
    for (const ring of [3, 6, 9]) {
      const a = spineIds[fi][ring - 1], b = spineIds[fj][ring - 1];
      const na = nodes.find((n) => n.id === a)!, nb = nodes.find((n) => n.id === b)!;
      const [cn, ci, cs, cv] = CROSS[fi];
      const tc = tierCost(ring + 1);
      nodes.push({
        id: `x${fi}_${ring}`, name: `${cn} ${ring === 3 ? 'I' : ring === 6 ? 'II' : 'III'}`, icon: ci, family: 'Conexão', color: '#ecf0f1',
        desc: 'Nó de conexão: exige os dois caminhos adjacentes.',
        x: (na.x + nb.x) / 2 * 1.08, y: (na.y + nb.y) / 2 * 1.08, cost: tc.cost, curr: 'scrap', growth: 1.8, max: 5,
        prereqs: [a, b], all: true, effects: [{ stat: cs, v: cv * ring / 3 }], kind: 'cross', hidden: ring >= 6,
      });
    }
  });
  // deep hidden region: rare-material relics beyond the outer ring
  FAMILIES.forEach((fam, fi) => {
    const last = spineIds[fi][spineIds[fi].length - 1];
    const ln = nodes.find((n) => n.id === last)!;
    const a = (fam.angle * Math.PI) / 180;
    nodes.push({
      id: `relic${fi}`, name: `Relíquia: ${fam.id}`, icon: '🔮', family: fam.id, color: '#a29bfe', desc: 'Tecnologia proibida, paga com materiais raros.',
      x: ln.x + Math.cos(a) * STEP * 1.4, y: ln.y + Math.sin(a) * STEP * 1.4, cost: 50, curr: 'rare', growth: 2, max: 0,
      prereqs: [last], effects: [{ stat: fam.spine[0][2], v: fam.spine[0][3] * 4 }], kind: 'special', hidden: true,
    });
  });
  return nodes;
}

export const SKILLS = buildSkillTree();
export const SKILL_MAP: Record<string, SkillNode> = Object.fromEntries(SKILLS.map((s) => [s.id, s]));
