export type StatKey =
  | 'bite' | 'tough' | 'ring' | 'gripRate' | 'gripMax' | 'quick' | 'scrub' | 'time' | 'jar' | 'dust'
  | 'heat' | 'sweep' | 'sense' | 'tip' | 'cards' | 'lucky' | 'echo' | 'helper' | 'calm' | 'slick' | 'overtime' | 'polish';

export type Currency = 'po' | 'brilho';

export interface SkillNode {
  id: string;
  parent: string | null;
  x: number;
  y: number;
  name: string;
  icon: string;
  desc: string;
  effects: [StatKey, number][];
  cost: number;
  growth: number;
  /** 0 = unlimited */
  max: number;
  curr: Currency;
  /** ring color in the tree */
  color: string;
}

type Spec = [id: string, parent: string | null, angle: number, dist: number, name: string, icon: string, desc: string, effects: [StatKey, number][], cost: number, growth: number, max: number, curr?: Currency];

const C = { press: '#ff7a59', nail: '#f7d046', jar: '#7fd3ff', time: '#7bed9f', grip: '#c792ea', scrub: '#ff9ff3', ring: '#ffc66d', biz: '#a3e4d7', tool: '#ffffff', shine: '#ffe66d' };

// angle in degrees from the parent node, distance in tree units
const SPECS: [string, Spec[]][] = [
  ['root', [['root', null, 0, 0, 'Primeiro Dia', '🧹', 'Toda faxineira começa com um dedo e muita vontade.', [], 0, 1, 1]]],
  [C.press, [
    ['press1', 'root', -90, 110, 'Dedo Firme', '👆', 'Cada esfregada tira mais sujeira.', [['bite', 0.12]], 5, 1.45, 8],
    ['press2', 'press1', -90, 100, 'Pressão Caprichada', '💪', 'Força de quem lava a calçada todo domingo.', [['bite', 0.25]], 60, 1.5, 8],
    ['press3', 'press2', -90, 100, 'Braço de Ferro', '🦾', 'A sujeira treme quando você chega.', [['bite', 0.6]], 900, 1.55, 10],
    ['press4', 'press3', -90, 100, 'Força Bruta', '🏋️', 'Faxina olímpica.', [['bite', 2]], 15000, 1.6, 10],
    ['press5', 'press4', -90, 100, 'Mão de Gigante', '✋', 'Sem limite. Literalmente.', [['bite', 6]], 250000, 1.7, 0],
    ['lucky1', 'press2', -135, 95, 'Esfregada da Sorte', '🍀', 'Chance de cada pedacinho limpo render pó em dobro.', [['lucky', 0.05]], 150, 1.6, 6],
    ['echo1', 'press3', -30, 95, 'Esfrega Fantasma', '👻', 'Onde você passa, a sujeira continua saindo por um instante.', [['echo', 0.2]], 2500, 1.7, 5],
  ]],
  [C.nail, [
    ['nail1', 'press1', -30, 100, 'Unha Lixada', '💅', 'Unha dura o bastante para chiclete, fuligem e gordura.', [['tough', 1]], 45, 1, 1],
    ['nail2', 'nail1', -20, 100, 'Unha de Tartaruga', '🐢', 'Aguenta limo sem quebrar.', [['tough', 1]], 1200, 1, 1],
    ['nail3', 'nail2', -20, 100, 'Unha de Aço', '🔩', 'Finalmente a ferrugem perde a graça.', [['tough', 1]], 9000, 1, 1],
    ['nail4', 'nail3', -20, 100, 'Unha de Diamante', '💎', 'Corta vidro. E sujeira de 50 anos.', [['tough', 1], ['bite', 1]], 180000, 1, 1],
  ]],
  [C.jar, [
    ['jar1', 'root', -20, 110, 'Pote Maior', '🫙', 'Cabe mais pó por turno.', [['jar', 15]], 8, 1.45, 10],
    ['jar2', 'jar1', 0, 100, 'Balde', '🪣', 'Agora sim, dá para trabalhar.', [['jar', 70]], 140, 1.5, 10],
    ['jar3', 'jar2', 0, 100, 'Carrinho de Mão', '🛒', 'Pó a perder de vista.', [['jar', 500]], 2600, 1.55, 10],
    ['jar4', 'jar3', 0, 100, 'Caçamba', '🚛', 'O pote definitivo.', [['jar', 4000]], 50000, 1.6, 0],
    ['dust1', 'jar1', 50, 95, 'Pó Fino', '✨', 'Cada pitada de sujeira vale mais.', [['dust', 0.1]], 30, 1.5, 10],
    ['dust2', 'dust1', -10, 95, 'Peneira de Ouro', '🥇', 'Separa o pó bom do pó ruim.', [['dust', 0.3]], 1500, 1.6, 10],
    ['dust3', 'dust2', 20, 95, 'Alquimia da Faxina', '⚗️', 'Transforma sujeira em fortuna.', [['dust', 1]], 60000, 1.7, 0],
  ]],
  [C.time, [
    ['time1', 'root', 30, 110, 'Fôlego', '🫁', 'Mais segundos por turno.', [['time', 1]], 10, 1.5, 10],
    ['time2', 'time1', 30, 100, 'Café Passado', '☕', 'Energia de padaria.', [['time', 2]], 180, 1.55, 8],
    ['time3', 'time2', 30, 100, 'Marmita Reforçada', '🍱', 'Faxina de barriga cheia rende mais.', [['time', 3]], 3000, 1.6, 8],
    ['time4', 'time3', 30, 100, 'Hora Extra', '🕰️', 'O relógio que se cuide.', [['time', 5]], 45000, 1.7, 0],
  ]],
  [C.grip, [
    ['grip1', 'root', 130, 110, 'Pegada Firme', '🤏', 'A pegada enche mais rápido quando você fica dentro do anel.', [['gripRate', 0.35]], 15, 1.5, 6],
    ['grip2', 'grip1', 130, 100, 'Pegada de Ferro', '✊', 'Pegada cheia multiplica ainda mais.', [['gripMax', 0.25]], 100, 1.55, 8],
    ['quick1', 'grip1', 170, 95, 'Anel Largo', '⭕', 'Com a pegada cheia, o anel cresce.', [['quick', 0.15]], 250, 1.55, 5],
    ['grip3', 'grip2', 130, 100, 'Mão de Polvo', '🐙', 'Ninguém segura como você.', [['gripMax', 0.6]], 6000, 1.65, 6],
    ['slick1', 'grip2', 90, 95, 'Luva de Borracha', '🧤', 'A gordura não derruba mais a sua pegada.', [['slick', 1]], 1800, 1, 1],
  ]],
  [C.scrub, [
    ['scrub1', 'root', 180, 110, 'Vai e Volta', '↔️', 'Esfregar pra frente e pra trás rende mais que deslizar.', [['scrub', 0.25]], 12, 1.5, 8],
    ['scrub2', 'scrub1', 200, 100, 'Ritmo de Samba', '🥁', 'Quanto mais vai e volta seguido, maior o bônus.', [['scrub', 0.5]], 320, 1.55, 8],
    ['heat1', 'scrub1', 160, 95, 'Mãos Quentinhas', '🔥', 'Esfregar esquenta as mãos e derrete gordura.', [['heat', 0.6]], 220, 1.55, 5],
    ['heat2', 'heat1', 130, 95, 'Mãos Fervendo', '🌋', 'As mãos esquentam muito mais rápido.', [['heat', 1.2]], 7000, 1.6, 5],
    ['calm1', 'scrub2', 200, 95, 'Mão Leve', '🪶', 'A fuligem quase não espalha mais.', [['calm', 0.5]], 1400, 1.5, 2],
    ['sweep1', 'scrub2', 150, 95, 'Varredura Geral', '🧹', 'Quando um pedaço fica limpo, a sujeirinha fina em volta vai junto.', [['sweep', 0.2]], 800, 1.6, 5],
  ]],
  [C.ring, [
    ['ring1', 'root', 230, 110, 'Mão Aberta', '🖐️', 'Anel de contato maior.', [['ring', 0.35]], 10, 1.5, 8],
    ['ring2', 'ring1', 230, 100, 'Palma Larga', '🙌', 'Pega um pedação de uma vez.', [['ring', 0.7]], 260, 1.55, 8],
    ['ring3', 'ring2', 230, 100, 'Abraço de Urso', '🐻', 'Área gigantesca.', [['ring', 1.4]], 7000, 1.65, 6],
  ]],
  [C.biz, [
    ['tip1', 'root', 75, 110, 'Simpatia', '😊', 'Donos dão gorjetas maiores pelos achados.', [['tip', 0.5]], 40, 1.6, 5],
    ['sense1', 'tip1', 30, 95, 'Faro de Achados', '👃', 'Achados escondidos brilham por baixo da sujeira.', [['sense', 1]], 90, 1, 1],
    ['card1', 'tip1', 100, 100, 'Cartão de Visita', '📇', 'Um novo cliente aparece no quadro.', [['cards', 1]], 2000, 1, 1],
    ['card2', 'card1', 90, 100, 'Panfletos na Feira', '📰', 'Mais um cliente no quadro.', [['cards', 1]], 20000, 1, 1],
    ['card3', 'card2', 90, 100, 'Anúncio na Rádio', '📻', 'O cliente mais exigente da cidade.', [['cards', 1]], 200000, 1, 1],
  ]],
  [C.tool, [
    ['tool_esponja', 'ring1', 270, 95, 'Esponja', '🧽', 'Nova ferramenta: área enorme, ótima com gordura e fuligem.', [], 1, 1, 1, 'brilho'],
    ['tool_espatula', 'nail1', -100, 95, 'Espátula', '🔪', 'Nova ferramenta: estreita e afiada, arranca chiclete e ferrugem.', [], 2, 1, 1, 'brilho'],
    ['tool_escova', 'scrub2', 250, 95, 'Escova de Aço', '🪥', 'Nova ferramenta: dobra o bônus do vai e volta. Mata limo.', [], 3, 1, 1, 'brilho'],
    ['tool_vapor', 'heat2', 160, 95, 'Vaporizador', '♨️', 'Nova ferramenta: limpa só de apontar, sem esfregar.', [], 5, 1, 1, 'brilho'],
  ]],
  [C.shine, [
    ['helper1', 'time2', 90, 95, 'Siri Ajudante', '🦀', 'Um siri esfrega a superfície sozinho durante o turno.', [['helper', 1]], 2, 1, 1, 'brilho'],
    ['helper2', 'helper1', 70, 95, 'Siri Turbinado', '🦀', 'O siri esfrega mais rápido.', [['helper', 0.6]], 400, 1.6, 8],
    ['over1', 'time3', 90, 95, 'Segundo Fôlego', '🏁', 'Bater a marca dá +3 segundos no turno.', [['overtime', 3]], 2, 1, 1, 'brilho'],
    ['polish1', 'jar2', -90, 95, 'Brilho no Olhar', '🌟', 'Pó extra para cada % acima da marca no fim do turno.', [['polish', 0.04]], 1, 1, 3, 'brilho'],
    ['mega1', 'press3', -90, 0.01, 'Mão Abençoada', '🙏', 'Mordida dobrada. Para sempre.', [['bite', 0.5]], 3, 1, 1, 'brilho'],
  ]],
];

export const SKILLS: SkillNode[] = [];
const pos: Record<string, [number, number]> = {};
for (const [color, list] of SPECS) {
  for (const [id, parent, angle, dist, name, icon, desc, effects, cost, growth, max, curr] of list) {
    const [px, py] = parent ? pos[parent] : [0, 0];
    let x = px + Math.cos((angle * Math.PI) / 180) * dist, y = py + Math.sin((angle * Math.PI) / 180) * dist;
    if (id === 'mega1') { x = px - 85; y = py - 40; }
    pos[id] = [x, y];
    SKILLS.push({ id, parent, x, y, name, icon, desc, effects, cost, growth, max, curr: curr ?? 'po', color: id === 'root' ? '#ffe66d' : color });
  }
}
export const SKILL: Record<string, SkillNode> = Object.fromEntries(SKILLS.map((s) => [s.id, s]));
