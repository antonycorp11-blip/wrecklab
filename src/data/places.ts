import { Pix } from '../core/pix';
import type { GunkId } from './gunk';

export interface FindDef { name: string; sprite: string; x: number; y: number }
export interface GunkLayer { type: GunkId; cover: number; thick: [number, number]; scale?: number }

export interface PlaceDef {
  id: string;
  name: string;
  owner: string;
  icon: string;
  story: string;
  /** what the owner says when you arrive */
  hello: string;
  /** what the owner says when you return a find */
  thanks: string;
  /** recommendation to the next client, said when the 3 finds are back */
  recommend: string;
  /** fraction that must be clean in one shift for the stamp */
  mark: number;
  gunk: GunkLayer[];
  finds: [FindDef, FindDef, FindDef];
  /** unlocked by a recommendation (all finds returned or stamped) or by business cards */
  req: { rec?: string; cards?: number };
  bg: [string, string];
  paint: (p: Pix) => void;
}

export const ART_W = 72;
export const ART_H = 54;

const wood = (p: Pix, x: number, y: number, w: number, h: number, c: string, m: number) => {
  p.box(x, y, w, h, c, m, false);
  for (let j = y + 2; j < y + h - 1; j += 3) for (let i = x + 2 + (j % 5); i < x + w - 2; i += 9) p.rect(i, j, 4, 1, '#00000022' === c ? c : shadeHex(c, -0.12), m);
};
function shadeHex(c: string, k: number) {
  const n = parseInt(c.slice(1), 16);
  const f = (v: number) => Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k).toString(16).padStart(2, '0');
  return `#${f(n >> 16)}${f((n >> 8) & 255)}${f(n & 255)}`;
}
const sky = (p: Pix, x: number, y: number, w: number, h: number, m: number) => {
  p.grad(x, y, w, h, '#7cc8f2', '#d9f4ff', m);
};

export const PLACES: PlaceDef[] = [
  {
    id: 'janela', name: 'Janela do Sótão', owner: 'Vó Cida', icon: '👵',
    story: 'A janela do sótão da Vó Cida não vê a luz do sol desde a Copa de 82. Ela jura que dá para ver o mar lá de cima.',
    hello: 'Ai, que bom que você veio, filha! Dizem que tem uma vista linda atrás dessa poeira toda.',
    thanks: 'Minha nossa! Eu procurava isso fazia anos!',
    recommend: 'Vou falar de você pro Jurandir da padaria. O ventilador dele é uma tristeza.',
    mark: 0.6, req: {}, bg: ['#4a2f3a', '#2b1d26'],
    gunk: [{ type: 'poeira', cover: 1, thick: [1, 2.6], scale: 0.13 }],
    finds: [{ name: 'Dentadura da Vó', sprite: 'dentes', x: 18, y: 38 }, { name: 'Moeda de 1950', sprite: 'moeda', x: 46, y: 12 }, { name: 'Carta de amor', sprite: 'carta', x: 52, y: 36 }],
    paint: (p) => {
      p.rect(0, 0, ART_W, ART_H, '#e3ad9b', 0);
      for (let x = 0; x < ART_W; x += 4) p.rect(x, 0, 1, ART_H, '#d69886', 0);
      for (let y = 3; y < ART_H; y += 8) for (let x = 2; x < ART_W; x += 8) p.px(x, y, '#f2cbbd', 0);
      p.box(11, 4, 50, 44, '#8f5e36', 1);
      sky(p, 14, 7, 44, 38, 1);
      p.rect(14, 33, 44, 12, '#3a8fc4', 1);
      p.rect(14, 33, 44, 1, '#8fd3ff', 1);
      for (let x = 16; x < 56; x += 7) p.rect(x, 36 + (x % 3), 3, 1, '#7cc8f2', 1);
      p.circle(48, 16, 4, '#ffe08a', 1);
      p.rect(22, 30, 6, 3, '#ffffff', 1); p.line(25, 24, 25, 30, '#6b4a2b', 1); p.rect(25, 24, 4, 5, '#fff4dc', 1);
      p.rect(14, 12, 6, 2, '#ffffff', 1); p.rect(17, 11, 5, 1, '#ffffff', 1); p.rect(32, 9, 8, 2, '#ffffff', 1);
      p.rect(35, 7, 2, 38, '#8f5e36', 1); p.rect(14, 25, 44, 2, '#8f5e36', 1);
      p.rect(36, 7, 1, 38, '#b07a48', 1); p.rect(14, 25, 44, 1, '#b07a48', 1);
      p.box(8, 48, 56, 4, '#b07a48', 1);
      for (const x0 of [0, 62]) { p.rect(x0, 0, 10, 50, '#b33a3a', 0); for (let x = x0 + 2; x < x0 + 10; x += 3) p.rect(x, 0, 1, 50, '#8c2a2a', 0); p.rect(x0, 0, 10, 2, '#e0b04a', 0); }
      p.rect(2, 50, 6, 4, '#c96a3a', 0); p.rect(1, 46, 3, 4, '#4f8a3c', 0); p.rect(5, 45, 3, 5, '#6abe5b', 0);
    },
  },
  {
    id: 'ventilador', name: 'Ventilador de Teto', owner: 'Seu Jurandir', icon: '👨‍🍳',
    story: 'O ventilador da Padaria Pão Nosso gira desde 1979 espalhando farinha, poeira e um pouco da gordura do salgado.',
    hello: 'Cuidado com a gordura, hein! Escorrega que é uma beleza.',
    thanks: 'Olha só! Isso caiu aí em cima quando eu era aprendiz!',
    recommend: 'O Dr. Valter, o contador, precisa de você. A persiana dele é puro pó.',
    mark: 0.62, req: { rec: 'janela' }, bg: ['#4a3a2a', '#2a2018'],
    gunk: [{ type: 'poeira', cover: 1, thick: [1, 2.4], scale: 0.15 }, { type: 'gordura', cover: 0.22, thick: [1, 2], scale: 0.2 }],
    finds: [{ name: 'Botão do avental', sprite: 'botao', x: 10, y: 24 }, { name: 'Chave do cofre', sprite: 'chave', x: 34, y: 44 }, { name: 'Moedinha da sorte', sprite: 'moeda', x: 58, y: 24 }],
    paint: (p) => {
      p.rect(0, 0, ART_W, ART_H, '#f1dfba', 0);
      for (let y = 0; y < ART_H; y += 6) p.rect(0, y, ART_W, 1, '#dcc59a', 0);
      p.rect(35, 0, 3, 22, '#9aa4ab', 1); p.rect(35, 0, 1, 22, '#cfd8dc', 1);
      wood(p, 4, 23, 28, 8, '#8b5a2b', 1);
      wood(p, 41, 23, 28, 8, '#8b5a2b', 1);
      wood(p, 32, 30, 9, 22, '#7a4e25', 1);
      p.circle(36, 27, 7, '#c9a26b', 1); p.circle(36, 27, 5, '#e0bd85', 1); p.circle(36, 27, 2, '#8b6a3b', 1);
      p.rect(31, 33, 11, 3, '#e8e2d0', 1); p.rect(33, 36, 7, 2, '#fff8e0', 1);
      p.rect(4, 31, 28, 1, '#5a3a1a', 0); p.rect(41, 31, 28, 1, '#5a3a1a', 0);
    },
  },
  {
    id: 'persiana', name: 'Persiana do Escritório', owner: 'Dr. Valter', icon: '🧑‍💼',
    story: 'O contador Valter nunca abriu a persiana. Diz que o sol atrapalha a planilha. A poeira agradece.',
    hello: 'Seja rápida. Tempo é dinheiro e poeira é prejuízo.',
    thanks: 'Hm. Estava no balanço como perdido. Corrigindo.',
    recommend: 'A prefeitura procura alguém para o banco da praça. Chiclete até dizer chega.',
    mark: 0.66, req: { rec: 'ventilador' }, bg: ['#2f3a44', '#1c242b'],
    gunk: [{ type: 'poeira', cover: 1, thick: [1.4, 3.2], scale: 0.2 }],
    finds: [{ name: 'Óculos de leitura', sprite: 'oculos', x: 14, y: 9 }, { name: 'Foto da formatura', sprite: 'foto', x: 40, y: 24 }, { name: 'Moeda rara', sprite: 'moeda', x: 56, y: 39 }],
    paint: (p) => {
      p.rect(0, 0, ART_W, ART_H, '#b9c4ca', 0);
      p.box(5, 2, 62, 50, '#6d7a82', 0);
      p.grad(7, 4, 58, 46, '#9fd6f0', '#e6f6ff', 0);
      for (let x = 10; x < 64; x += 9) { const h = 8 + (x * 7) % 14; p.rect(x, 50 - h, 7, h, '#8aa0ad', 0); }
      for (let i = 0; i < 9; i++) { const y = 4 + i * 5; p.rect(7, y, 58, 4, '#ece6d6', 1); p.rect(7, y, 58, 1, '#fffaf0', 1); p.rect(7, y + 3, 58, 1, '#c9c1ac', 1); }
      p.rect(20, 2, 1, 48, '#d8d0bc', 1); p.rect(52, 2, 1, 48, '#d8d0bc', 1);
      p.box(6, 1, 60, 3, '#d8d0bc', 1);
      p.line(62, 4, 62, 50, '#8a7f6a', 0); p.rect(61, 50, 3, 3, '#c9a26b', 0);
    },
  },
  {
    id: 'banco', name: 'Banco da Praça', owner: 'Prefeita Rosa', icon: '👩‍⚖️',
    story: 'O banco mais disputado de Vila Maresia, onde gerações namoraram e grudaram chiclete embaixo do assento.',
    hello: 'Esse banco é patrimônio histórico! Esfrega com carinho e com força.',
    thanks: 'Isso vai para o museu da cidade. Ou para a minha gaveta.',
    recommend: 'A Dona Fátima, da pousada, não aguenta mais a fuligem do fogão a lenha.',
    mark: 0.62, req: { rec: 'persiana' }, bg: ['#2e4a33', '#1a2c1e'],
    gunk: [{ type: 'poeira', cover: 1, thick: [1, 2], scale: 0.15 }, { type: 'chiclete', cover: 0.36, thick: [1, 2], scale: 0.38 }],
    finds: [{ name: 'Aliança perdida', sprite: 'anel', x: 20, y: 11 }, { name: 'Figurinha rara', sprite: 'foto', x: 48, y: 29 }, { name: 'Dente de leite', sprite: 'dentes', x: 60, y: 12 }],
    paint: (p) => {
      sky(p, 0, 0, ART_W, 30, 0);
      p.circle(62, 8, 9, '#4f8a3c', 0); p.circle(56, 12, 7, '#6abe5b', 0); p.rect(60, 16, 3, 18, '#7a4e25', 0);
      p.rect(0, 30, ART_W, 24, '#6abe5b', 0); for (let x = 0; x < ART_W; x += 3) p.px(x, 31 + (x % 4), '#4f9a43', 0);
      p.rect(0, 46, ART_W, 8, '#d8c39a', 0);
      for (let i = 0; i < 3; i++) wood(p, 6, 6 + i * 6, 60, 5, '#b5764a', 1);
      for (let i = 0; i < 2; i++) wood(p, 4, 28 + i * 5, 64, 4, '#a8693f', 1);
      for (const x of [8, 62]) { p.rect(x, 4, 3, 46, '#3d3d46', 1); p.rect(x, 4, 1, 46, '#5c5c68', 1); }
      p.rect(6, 25, 7, 2, '#3d3d46', 1); p.rect(59, 25, 7, 2, '#3d3d46', 1);
    },
  },
  {
    id: 'fogao', name: 'Fogão a Lenha', owner: 'Dona Fátima', icon: '👩‍🦳',
    story: 'O fogão da Pousada Maré Mansa faz o melhor feijão da costa e a pior fuligem do mundo.',
    hello: 'Devagar com a fuligem, querida. Se esfregar com pressa ela espalha toda!',
    thanks: 'Ah, isso aqui! Tava sumido desde o casamento da minha filha.',
    recommend: 'O Bigode da lanchonete tá precisando. A chapa dele... nem te conto.',
    mark: 0.6, req: { rec: 'banco' }, bg: ['#4a3324', '#2a1d14'],
    gunk: [{ type: 'poeira', cover: 1, thick: [0.6, 1.4], scale: 0.15 }, { type: 'fuligem', cover: 0.75, thick: [1, 2.4], scale: 0.18 }],
    finds: [{ name: 'Medalha de São Bento', sprite: 'medalha', x: 14, y: 30 }, { name: 'Receita da avó', sprite: 'carta', x: 30, y: 36 }, { name: 'Chave do quarto 7', sprite: 'chave', x: 54, y: 4 }],
    paint: (p) => {
      p.rect(0, 0, ART_W, ART_H, '#e8d6ac', 0);
      for (let y = 0; y < 46; y += 6) for (let x = (y / 6) % 2 ? 3 : 0; x < ART_W; x += 6) p.frame(x, y, 6, 6, '#d6c08f', 0);
      p.rect(0, 46, ART_W, 8, '#8a5a3a', 0);
      p.box(50, 0, 7, 12, '#2f3236', 1);
      p.box(6, 10, 60, 5, '#2b2e32', 1);
      p.box(8, 15, 56, 33, '#3c3f44', 1);
      for (const x of [18, 36]) { p.ring(x, 12, 4, '#5a5f66', 1); p.ring(x, 12, 2, '#5a5f66', 1); }
      p.box(12, 20, 22, 18, '#2f3236', 1); p.rect(15, 24, 16, 9, '#e8742c', 1); p.rect(15, 24, 16, 3, '#ffb067', 1);
      p.box(40, 20, 20, 10, '#2f3236', 1); p.box(40, 33, 20, 10, '#2f3236', 1);
      p.rect(46, 24, 8, 2, '#c99a3c', 1); p.rect(46, 37, 8, 2, '#c99a3c', 1);
    },
  },
  {
    id: 'chapa', name: 'Chapa da Lanchonete', owner: 'Bigode', icon: '🧔',
    story: 'Trinta anos de X-tudo na mesma chapa. A camada de gordura já tem CEP.',
    hello: 'Gordura de primeira, hein? Esquenta essa mão antes, senão escorrega!',
    thanks: 'Rapaz! Isso aí eu derrubei na chapa em 2003!',
    recommend: 'Seu Tonho, o pescador, precisa limpar o barco antes da regata.',
    mark: 0.58, req: { rec: 'fogao' }, bg: ['#4a2424', '#2a1414'],
    gunk: [{ type: 'gordura', cover: 0.85, thick: [1, 2.6], scale: 0.16 }, { type: 'fuligem', cover: 0.3, thick: [1, 2], scale: 0.3 }, { type: 'poeira', cover: 1, thick: [0.5, 1], scale: 0.2 }],
    finds: [{ name: 'Ficha do fliperama', sprite: 'moeda', x: 12, y: 26 }, { name: 'Brinco da esposa', sprite: 'anel', x: 36, y: 33 }, { name: 'Anel de formatura', sprite: 'anel', x: 58, y: 24 }],
    paint: (p) => {
      for (let y = 0; y < ART_H; y += 4) for (let x = 0; x < ART_W; x += 4) p.rect(x, y, 4, 4, ((x + y) / 4) % 2 ? '#f4efe6' : '#d63c3c', 0);
      p.box(18, 2, 36, 12, '#2b2b2b', 0); for (let j = 0; j < 3; j++) p.rect(21, 5 + j * 3, 18 + (j * 5) % 10, 1, '#fff4dc', 0);
      p.box(4, 18, 64, 6, '#9aa4ab', 1);
      p.box(6, 24, 60, 18, '#7d838a', 1);
      p.rect(8, 26, 56, 14, '#4d5257', 1);
      p.box(6, 42, 60, 7, '#5c6168', 1);
      for (const x of [14, 28, 42, 56]) { p.circle(x, 45, 2, '#2b2b2b', 1); p.px(x, 44, '#d63c3c', 1); }
    },
  },
  {
    id: 'barco', name: 'Barco Pé de Moleque', owner: 'Seu Tonho', icon: '🎣',
    story: 'O barco do Seu Tonho ficou um verão inteiro parado no cais. O limo tomou conta e a âncora enferrujou.',
    hello: 'O limo é teimoso: se você vira as costas, ele cresce de novo!',
    thanks: 'Eita! Isso aí foi o mar que me tirou e você que me devolveu.',
    recommend: 'O Cine Maresia vai reabrir! O letreiro tá um horror.',
    mark: 0.58, req: { rec: 'chapa' }, bg: ['#1f3d55', '#122434'],
    gunk: [{ type: 'poeira', cover: 0.5, thick: [0.6, 1.2], scale: 0.2 }, { type: 'limo', cover: 0.62, thick: [1, 2.6], scale: 0.17 }, { type: 'ferrugem', cover: 0.16, thick: [1, 2], scale: 0.4 }],
    finds: [{ name: 'Concha da sorte', sprite: 'concha', x: 22, y: 34 }, { name: 'Bússola do avô', sprite: 'bussola', x: 44, y: 12 }, { name: 'Garrafa com bilhete', sprite: 'garrafa', x: 58, y: 32 }],
    paint: (p) => {
      sky(p, 0, 0, ART_W, 30, 0);
      p.rect(0, 40, ART_W, 14, '#2b6f9e', 0); for (let x = 0; x < ART_W; x += 5) p.rect(x, 41 + (x % 3), 3, 1, '#7cc8f2', 0);
      p.box(38, 6, 18, 16, '#f4efe6', 1); p.rect(42, 10, 5, 4, '#7cc8f2', 1); p.rect(49, 10, 5, 4, '#7cc8f2', 1);
      for (let j = 0; j < 4; j++) { const y = 22 + j * 5, inset = j * 3; p.rect(4 + inset, y, 64 - inset * 2, 5, j % 2 ? '#2e5aa8' : '#f4efe6', 1); p.rect(4 + inset, y, 64 - inset * 2, 1, j % 2 ? '#4c86e0' : '#ffffff', 1); }
      p.rect(8, 23, 40, 3, '#d63c3c', 1);
      p.rect(12, 24, 2, 12, '#7a4a2a', 1); p.ring(13, 36, 3, '#6b6f75', 1); p.rect(9, 34, 9, 2, '#6b6f75', 1);
      p.rect(60, 0, 2, 22, '#8b5a2b', 1);
    },
  },
  {
    id: 'placa', name: 'Letreiro do Cine Maresia', owner: 'Dona Glória', icon: '🎬',
    story: 'O cinema vai reabrir depois de vinte anos. O letreiro tem fuligem, chiclete e um ninho de pombo.',
    hello: 'Quero esse letreiro brilhando para a sessão de estreia!',
    thanks: 'Que lindo! Parece cena de filme.',
    recommend: 'O faroleiro Bené vai adorar te conhecer. O sino do farol tá todo enferrujado.',
    mark: 0.64, req: { rec: 'barco' }, bg: ['#2a1f44', '#160f26'],
    gunk: [{ type: 'poeira', cover: 0.7, thick: [1, 1.6], scale: 0.2 }, { type: 'fuligem', cover: 0.55, thick: [1, 2.2], scale: 0.18 }, { type: 'chiclete', cover: 0.38, thick: [1, 2], scale: 0.35 }],
    finds: [{ name: 'Ingresso de 1968', sprite: 'ingresso', x: 10, y: 14 }, { name: 'Óculos 3D', sprite: 'oculos', x: 33, y: 28 }, { name: 'Medalha do festival', sprite: 'medalha', x: 56, y: 16 }],
    paint: (p) => {
      p.rect(0, 0, ART_W, ART_H, '#1e1838', 0);
      for (let i = 0; i < 40; i++) p.px((i * 37) % ART_W, (i * 23) % 40, i % 3 ? '#8f86c7' : '#ffffff', 0);
      p.rect(14, 38, 4, 16, '#3d3d46', 1); p.rect(54, 38, 4, 16, '#3d3d46', 1);
      p.box(4, 6, 64, 32, '#c23a3a', 1);
      for (let x = 6; x < 66; x += 3) { p.px(x, 7, '#ffd56b', 1); p.px(x, 36, '#ffd56b', 1); }
      for (let y = 9; y < 36; y += 3) { p.px(5, y, '#ffd56b', 1); p.px(66, y, '#ffd56b', 1); }
      const L: Record<string, string[]> = { C: ['xxx', 'x..', 'x..', 'x..', 'xxx'], I: ['xxx', '.x.', '.x.', '.x.', 'xxx'], N: ['x.x', 'xxx', 'xxx', 'x.x', 'x.x'], E: ['xxx', 'x..', 'xx.', 'x..', 'xxx'] };
      ['C', 'I', 'N', 'E'].forEach((ch, k) => L[ch].forEach((row, j) => [...row].forEach((c, i) => { if (c === 'x') p.rect(15 + k * 12 + i * 3, 12 + j * 3, 2, 2, '#fff4dc', 1); })));
      p.rect(8, 30, 56, 4, '#8f2626', 1);
    },
  },
  {
    id: 'sino', name: 'Sino do Farol', owner: 'Faroleiro Bené', icon: '🧑‍✈️',
    story: 'O sino do farol avisava os barcos na neblina. Hoje só avisa que a ferrugem venceu.',
    hello: 'Ferrugem é coisa séria. Sem unha forte, nem tenta.',
    thanks: 'Isso estava preso na ferrugem? Meu Deus do céu.',
    recommend: 'O museu da ferrovia quer restaurar a locomotiva. É o trabalho da sua vida!',
    mark: 0.6, req: { rec: 'placa' }, bg: ['#24343f', '#141e25'],
    gunk: [{ type: 'poeira', cover: 0.8, thick: [0.8, 1.4], scale: 0.2 }, { type: 'ferrugem', cover: 0.6, thick: [1, 2.4], scale: 0.17 }, { type: 'fuligem', cover: 0.3, thick: [1, 2], scale: 0.3 }],
    finds: [{ name: 'Apito do faroleiro', sprite: 'apito', x: 26, y: 18 }, { name: 'Bússola de bronze', sprite: 'bussola', x: 40, y: 32 }, { name: 'Relógio parado', sprite: 'relogio', x: 33, y: 42 }],
    paint: (p) => {
      p.grad(0, 0, ART_W, ART_H, '#5f7d8f', '#9fc0cf', 0);
      p.rect(0, 46, ART_W, 8, '#3a4a55', 0);
      p.box(10, 2, 52, 5, '#6b4a2b', 1);
      p.rect(34, 7, 4, 4, '#3d3d46', 1);
      for (let j = 0; j < 34; j++) { const half = Math.round(8 + Math.pow(j / 34, 1.6) * 16); p.rect(36 - half, 11 + j, half * 2, 1, j % 6 === 5 ? '#a8782c' : '#c99a3c', 1); p.px(36 - half, 11 + j, '#e6c06a', 1); }
      p.rect(12, 44, 48, 3, '#a8782c', 1);
      p.circle(36, 47, 3, '#6b4a2b', 1);
    },
  },
  {
    id: 'locomotiva', name: 'Locomotiva do Museu', owner: 'Professor Aurélio', icon: '🧑‍🏫',
    story: 'A Maria-Fumaça nº 7 trouxe os primeiros veranistas a Vila Maresia. Agora ela volta a brilhar, se você der conta.',
    hello: 'Tem de tudo aqui: fuligem, graxa, ferrugem... e história!',
    thanks: 'Uma peça histórica! Vai direto para a vitrine.',
    recommend: 'Vila Maresia inteira já fala de você. Distribua cartões de visita e mais clientes vão aparecer!',
    mark: 0.6, req: { rec: 'sino' }, bg: ['#3a2f2a', '#201a17'],
    gunk: [{ type: 'poeira', cover: 1, thick: [0.8, 1.6], scale: 0.18 }, { type: 'fuligem', cover: 0.5, thick: [1, 2.4], scale: 0.2 }, { type: 'ferrugem', cover: 0.3, thick: [1, 2.2], scale: 0.3 }, { type: 'gordura', cover: 0.3, thick: [1, 2], scale: 0.3 }, { type: 'limo', cover: 0.14, thick: [1, 2], scale: 0.4 }],
    finds: [{ name: 'Apito de prata', sprite: 'apito', x: 20, y: 20 }, { name: 'Bilhete de 1922', sprite: 'ingresso', x: 50, y: 14 }, { name: 'Relógio de bolso', sprite: 'relogio', x: 30, y: 36 }],
    paint: (p) => {
      p.rect(0, 0, ART_W, ART_H, '#c9b58f', 0);
      for (let x = 0; x < ART_W; x += 12) p.rect(x, 0, 1, 44, '#b39d75', 0);
      p.rect(0, 44, ART_W, 10, '#6b5a4a', 0); p.rect(0, 47, ART_W, 1, '#4a3d32', 0);
      p.box(12, 2, 6, 12, '#2b2e32', 1);
      p.box(6, 14, 42, 18, '#2f5e3f', 1); for (let x = 12; x < 46; x += 8) p.rect(x, 14, 1, 18, '#c99a3c', 1);
      p.box(46, 6, 20, 26, '#2f5e3f', 1); p.rect(50, 10, 12, 8, '#7cc8f2', 1);
      p.circle(4, 22, 3, '#ffe08a', 1);
      p.box(4, 32, 64, 4, '#2b2e32', 1);
      for (const x of [14, 30, 46, 60]) { p.circle(x, 41, 6, '#b52e2e', 1); p.circle(x, 41, 2, '#2b2e32', 1); }
      p.rect(14, 40, 46, 2, '#9aa4ab', 1);
    },
  },
  {
    id: 'geladeira', name: 'Geladeira da República', owner: 'Turma da Rep. Maresia', icon: '🧑‍🎓',
    story: 'Cinco estudantes, uma geladeira e nenhuma faxina desde o primeiro semestre.',
    hello: 'Ninguém sabe o que tem na prateleira de baixo. Ninguém quer saber.',
    thanks: 'Valeu demais! A gente nem lembrava que tinha perdido isso.',
    recommend: 'Conta pros outros que a gente pagou em dia, tá?',
    mark: 0.62, req: { cards: 1 }, bg: ['#2b3a4f', '#18212e'],
    gunk: [{ type: 'poeira', cover: 0.7, thick: [0.8, 1.4], scale: 0.2 }, { type: 'gordura', cover: 0.5, thick: [1, 2.4], scale: 0.22 }, { type: 'limo', cover: 0.38, thick: [1, 2.2], scale: 0.25 }, { type: 'chiclete', cover: 0.18, thick: [1, 2], scale: 0.4 }],
    finds: [{ name: 'Chave do bicicletário', sprite: 'chave', x: 26, y: 10 }, { name: 'Ímã raríssimo', sprite: 'medalha', x: 44, y: 30 }, { name: 'Foto da calourada', sprite: 'foto', x: 30, y: 42 }],
    paint: (p) => {
      p.rect(0, 0, ART_W, ART_H, '#7a9cc6', 0); for (let y = 0; y < ART_H; y += 9) p.rect(0, y, ART_W, 1, '#6a8ab3', 0);
      p.box(18, 2, 36, 50, '#eef2f4', 1);
      p.rect(18, 18, 36, 1, '#b9c4ca', 1);
      p.rect(48, 7, 2, 8, '#9aa4ab', 1); p.rect(48, 23, 2, 14, '#9aa4ab', 1);
      for (const [x, y, c] of [[24, 6, '#d63c3c'], [34, 24, '#f1c40f'], [26, 30, '#3d6bd6'], [40, 40, '#4fae6b']] as [number, number, string][]) p.box(x, y, 4, 4, c, 1, false);
    },
  },
  {
    id: 'aquario', name: 'Aquário do Petshop', owner: 'Lia do Petshop', icon: '🐠',
    story: 'O aquário gigante do Petshop Bicho Feliz virou uma sopa verde. Os peixes pedem socorro.',
    hello: 'Tadinhos dos peixinhos! O limo volta rápido, então nada de parar.',
    thanks: 'Ai que fofo! Isso tava no fundo de pedrinhas?',
    recommend: 'Vou espalhar seu cartão no balcão!',
    mark: 0.6, req: { cards: 2 }, bg: ['#1d4040', '#102424'],
    gunk: [{ type: 'limo', cover: 0.92, thick: [1, 3], scale: 0.14 }, { type: 'poeira', cover: 0.4, thick: [0.6, 1], scale: 0.2 }],
    finds: [{ name: 'Peixinho de brinquedo', sprite: 'peixe', x: 20, y: 20 }, { name: 'Baú do tesouro', sprite: 'moeda', x: 46, y: 38 }, { name: 'Anel de noivado', sprite: 'anel', x: 56, y: 14 }],
    paint: (p) => {
      p.rect(0, 0, ART_W, ART_H, '#d9c7a3', 0); p.rect(0, 46, ART_W, 8, '#8a5a3a', 0);
      p.box(4, 4, 64, 42, '#2b2e32', 1);
      p.grad(6, 6, 60, 38, '#5fc6d6', '#2b7f9e', 1);
      for (let x = 8; x < 64; x += 3) p.rect(x, 40 + (x % 2), 2, 3, ['#e8a07a', '#c9b58f', '#7fbf5a'][x % 3], 1);
      p.rect(14, 28, 2, 12, '#4f8a3c', 1); p.rect(16, 24, 2, 16, '#6abe5b', 1); p.rect(52, 22, 2, 18, '#4f8a3c', 1);
      p.sprite(30, 16, ['.oo..o', 'oOOooo', 'oOkOoo', '.oo..o'], { o: '#e8742c', O: '#ffb067', k: '#222222' }, 1);
      for (const [x, y] of [[40, 10], [42, 14], [41, 20]]) p.px(x, y, '#e6fbff', 1);
    },
  },
  {
    id: 'trofeu', name: 'Troféu do Clube de Bocha', owner: 'Seu Nonô', icon: '👴',
    story: 'O troféu do campeonato de 1974 está tão enferrujado que ninguém lembra quem ganhou. O Seu Nonô lembra. Foi ele.',
    hello: 'Quero ver meu nome brilhando de novo nessa taça!',
    thanks: 'Isso aqui... eu ganhei junto com a taça! Que memória!',
    recommend: 'Você é a melhor faxineira que Vila Maresia já teve.',
    mark: 0.62, req: { cards: 3 }, bg: ['#3a2a44', '#21182a'],
    gunk: [{ type: 'ferrugem', cover: 0.72, thick: [1, 2.6], scale: 0.16 }, { type: 'poeira', cover: 0.9, thick: [0.8, 1.6], scale: 0.2 }, { type: 'fuligem', cover: 0.2, thick: [1, 2], scale: 0.35 }],
    finds: [{ name: 'Medalha de 1974', sprite: 'medalha', x: 32, y: 12 }, { name: 'Foto do time', sprite: 'foto', x: 22, y: 22 }, { name: 'Bola de gude', sprite: 'botao', x: 44, y: 22 }],
    paint: (p) => {
      p.rect(0, 0, ART_W, ART_H, '#6d4c41', 0); for (let x = 0; x < ART_W; x += 6) p.rect(x, 0, 1, ART_H, '#5d4037', 0);
      p.box(8, 46, 56, 6, '#8d6e63', 0);
      for (let j = 0; j < 26; j++) { const half = Math.round(18 - Math.pow(j / 26, 0.7) * 12); p.rect(36 - half, 4 + j, half * 2, 1, j % 5 === 4 ? '#c99a1c' : '#e6b631', 1); p.px(36 - half, 4 + j, '#f7d97a', 1); }
      p.ring(13, 12, 5, '#e6b631', 1); p.ring(59, 12, 5, '#e6b631', 1);
      p.rect(33, 30, 6, 8, '#c99a1c', 1);
      p.box(24, 38, 24, 8, '#3d2b1f', 1); p.rect(28, 40, 16, 3, '#e6b631', 1);
    },
  },
];

export const PLACE: Record<string, PlaceDef> = Object.fromEntries(PLACES.map((p) => [p.id, p]));
