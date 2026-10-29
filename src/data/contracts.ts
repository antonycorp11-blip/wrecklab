import type { ContractDef } from '../core/types';

/**
 * Contracts come in series (same client and place, growing jobs). Every run starts
 * from zero: a part is only done when its whole stock is crushed inside one run.
 */
interface Series {
  id: string;
  name: string;
  client: string;
  icon: string;
  scene: string;
  story: string;
  quote: string;
  req?: { rep?: number; force?: number };
  parts: { subtitle: string; stock: [string, number][]; field: number; money: number; scrap: number; rep: number; sp: number; force?: number }[];
}

const SERIES: Series[] = [
  {
    id: 'gaveta', name: 'A Gaveta da Dona Zuleide', client: 'Dona Zuleide, 78 anos', icon: '👵', scene: 'drawer',
    story: 'Ela juntou tralha por 40 anos nas gavetas da cozinha. Agora quer tudo esmagado para levar à reciclagem e comprar um bolo.',
    quote: '"Esmaga tudo, meu filho. Menos a minha toalha bordada!"',
    parts: [
      { subtitle: 'A gaveta de cima', stock: [['cap', 8], ['clip', 6]], field: 10, money: 25, scrap: 6, rep: 0.5, sp: 1 },
      { subtitle: 'A gaveta dos talheres', stock: [['cap', 8], ['clip', 8], ['can', 4]], field: 11, money: 50, scrap: 10, rep: 0.5, sp: 0 },
      { subtitle: 'A gaveta que não fecha', stock: [['cap', 10], ['clip', 8], ['can', 6], ['toy', 2]], field: 12, money: 90, scrap: 16, rep: 1, sp: 1 },
      { subtitle: 'A gaveta proibida', stock: [['cap', 10], ['clip', 10], ['can', 8], ['toy', 4], ['bottle', 3]], field: 13, money: 160, scrap: 26, rep: 1, sp: 1 },
    ],
  },
  {
    id: 'gelada', name: 'Distribuidora Gelada & Cia', client: 'Seu Valdemar', icon: '🧔', scene: 'drinks',
    story: 'A distribuidora encalhou um lote inteiro de refrigerante de jiló. Ninguém comprou. Ninguém vai comprar.',
    quote: '"Era pra ser o sabor do verão… Amassa antes que alguém prove."',
    parts: [
      { subtitle: 'O corredor das latas', stock: [['can', 18], ['cap', 12]], field: 14, money: 260, scrap: 40, rep: 1, sp: 1 },
      { subtitle: 'Os engradados', stock: [['can', 20], ['bottle', 15], ['cap', 12]], field: 15, money: 520, scrap: 70, rep: 1, sp: 1 },
      { subtitle: 'A câmara fria', stock: [['can', 25], ['bottle', 22], ['jar', 8]], field: 16, money: 1100, scrap: 130, rep: 2, sp: 1, force: 9 },
    ],
  },
  {
    id: 'pedal', name: 'Bicicletaria Pedal Torto', client: 'Kátia', icon: '🚴‍♀️', scene: 'bikes',
    story: 'A oficina vai virar cafeteria de ciclistas. Peças tortas, rodas empenadas e latinhas de lanche precisam sumir.',
    quote: '"Se rolar, eu conserto. Se não rolar, é com você."',
    req: { force: 9 },
    parts: [
      { subtitle: 'A bancada', stock: [['clip', 20], ['can', 12], ['pan', 4]], field: 14, money: 1800, scrap: 200, rep: 1, sp: 1 },
      { subtitle: 'O estoque de rodas', stock: [['bikewheel', 8], ['clip', 15], ['can', 12]], field: 13, money: 3200, scrap: 330, rep: 1, sp: 1 },
      { subtitle: 'O quintal', stock: [['bikewheel', 12], ['pan', 10], ['toolbox', 4]], field: 12, money: 6000, scrap: 600, rep: 2, sp: 1 },
    ],
  },
  {
    id: 'braganca', name: 'Mudança dos Bragança', client: 'Família Bragança', icon: '👨‍👩‍👧', scene: 'moving',
    story: 'Cinco filhos, três cachorros e uma casa nova menor. O que não coube no caminhão vira bloco de sucata.',
    quote: '"O robô do Juninho também. Ele já tem 30 anos, o Juninho."',
    req: { rep: 4 },
    parts: [
      { subtitle: 'O quarto das crianças', stock: [['toy', 16], ['jar', 10], ['crate', 6]], field: 12, money: 9000, scrap: 800, rep: 1, sp: 1 },
      { subtitle: 'A sala', stock: [['tv', 5], ['crate', 10], ['jar', 12]], field: 11, money: 15000, scrap: 1300, rep: 2, sp: 1, force: 14 },
      { subtitle: 'A garagem', stock: [['tv', 8], ['crate', 14], ['toolbox', 8]], field: 11, money: 26000, scrap: 2200, rep: 2, sp: 2 },
    ],
  },
  {
    id: 'porao', name: 'O Porão Assombrado', client: 'Imobiliária Ferrugem', icon: '👻', scene: 'basement',
    story: 'Ninguém desce nesse porão desde 1987. Dizem que as panelas batem sozinhas à noite. Hoje elas param.',
    quote: '"Não é assombração, é sucata acumulada. Assina aqui."',
    req: { force: 14 },
    parts: [
      { subtitle: 'A escada', stock: [['pan', 14], ['toolbox', 10]], field: 11, money: 40000, scrap: 3500, rep: 2, sp: 1 },
      { subtitle: 'O canto escuro', stock: [['microwave', 8], ['toolbox', 12], ['crate', 8]], field: 10, money: 70000, scrap: 6000, rep: 2, sp: 1 },
      { subtitle: 'A porta trancada', stock: [['microwave', 12], ['tv', 8], ['pan', 12]], field: 10, money: 120000, scrap: 10000, rep: 3, sp: 2, force: 25 },
    ],
  },
  {
    id: 'eletro', name: 'Queima de Estoque', client: 'Zé da Eletro Zé', icon: '🤑', scene: 'store',
    story: 'O Zé comprou 200 micro-ondas que só esquentam metade do prato. A loja precisa de espaço para o próximo encalhe.',
    quote: '"Promoção relâmpago: você esmaga, eu sorrio."',
    req: { force: 40, rep: 10 },
    parts: [
      { subtitle: 'A vitrine', stock: [['microwave', 14], ['tv', 10]], field: 10, money: 200000, scrap: 16000, rep: 2, sp: 1 },
      { subtitle: 'O depósito', stock: [['microwave', 16], ['tv', 12], ['fridge', 3]], field: 9, money: 360000, scrap: 28000, rep: 3, sp: 1 },
      { subtitle: 'A liquidação final', stock: [['tv', 14], ['fridge', 8]], field: 9, money: 650000, scrap: 50000, rep: 3, sp: 2, force: 90 },
    ],
  },
  {
    id: 'ruina', name: 'O Cofre Esquecido', client: 'Banco Ruína S.A.', icon: '🏦', scene: 'vault',
    story: 'O banco faliu, mas os cofres ficaram. Alguns ainda têm barras de ouro esquecidas dentro.',
    quote: '"Achou ouro? Achou nada. Shhh."',
    req: { force: 110 },
    parts: [
      { subtitle: 'Os arquivos', stock: [['toolbox', 16], ['safe', 4]], field: 8, money: 1.2e6, scrap: 90000, rep: 3, sp: 1 },
      { subtitle: 'A caixa-forte', stock: [['safe', 12]], field: 7, money: 2.4e6, scrap: 170000, rep: 4, sp: 2 },
    ],
  },
  {
    id: 'tiao', name: 'Ferro-Velho do Tião', client: 'Tião Sucateiro', icon: '👷', scene: 'junkyard',
    story: 'O Tião quer compactar o ferro-velho inteiro antes que a prefeitura passe. Geladeiras, motos e o Fusca do avô.',
    quote: '"O Fusca não! …Tá, o Fusca também."',
    req: { force: 220, rep: 25 },
    parts: [
      { subtitle: 'A pilha da entrada', stock: [['fridge', 10], ['moto', 4]], field: 7, money: 5e6, scrap: 350000, rep: 3, sp: 1 },
      { subtitle: 'O cemitério de motos', stock: [['moto', 10], ['fridge', 8]], field: 7, money: 9e6, scrap: 650000, rep: 4, sp: 1 },
      { subtitle: 'O Fusca do avô', stock: [['car', 5], ['moto', 6]], field: 6, money: 1.6e7, scrap: 1.1e6, rep: 4, sp: 2, force: 400 },
    ],
  },
  {
    id: 'detran', name: 'Pátio Lotado', client: 'Detran Regional', icon: '👮', scene: 'lot',
    story: 'Mil carros apreendidos e nenhum dono. O pátio não fecha mais o portão.',
    quote: '"Preenche o formulário 27-B depois. Esmaga primeiro."',
    req: { force: 600 },
    parts: [
      { subtitle: 'Fila A', stock: [['car', 10], ['moto', 8]], field: 6, money: 4e7, scrap: 2.5e6, rep: 4, sp: 2 },
      { subtitle: 'Fila B a Z', stock: [['car', 18]], field: 6, money: 8e7, scrap: 5e6, rep: 5, sp: 2 },
    ],
  },
  {
    id: 'viacao', name: 'Aposentadoria da Frota', client: 'Viação Sucata', icon: '🚌', scene: 'depot',
    story: 'A frota de ônibus mais atrasada do país finalmente vai se aposentar. Pela primeira vez, no horário.',
    quote: '"Próxima parada: bloquinho de metal."',
    req: { force: 1500, rep: 60 },
    parts: [
      { subtitle: 'Os micro-ônibus', stock: [['car', 12], ['bus', 4]], field: 5, money: 2.5e8, scrap: 1.4e7, rep: 5, sp: 2 },
      { subtitle: 'A frota inteira', stock: [['bus', 12]], field: 4, money: 5e8, scrap: 2.8e7, rep: 6, sp: 3 },
    ],
  },
  {
    id: 'hangar', name: 'Protótipos Proibidos', client: '???', icon: '🕶️', scene: 'hangar',
    story: 'Homens de óculos escuros, um hangar sem placa e robôs gigantes que "nunca existiram".',
    quote: '"Você não viu nada. E não esmagou nada."',
    req: { force: 8000, rep: 100 },
    parts: [
      { subtitle: 'Projeto Alfa', stock: [['bus', 4], ['mech', 4]], field: 4, money: 3e9, scrap: 1.5e8, rep: 6, sp: 3 },
      { subtitle: 'Projeto Ômega', stock: [['mech', 10]], field: 3, money: 6e9, scrap: 3e8, rep: 8, sp: 3 },
    ],
  },
  {
    id: 'orbita', name: 'Lixo Espacial', client: 'Consórcio Estelar', icon: '👽', scene: 'orbit',
    story: 'A órbita está entupida de naves aposentadas. Alguém precisa fazer a faxina do universo.',
    quote: '"Bem-vindo à primeira cooperativa de reciclagem intergaláctica."',
    req: { force: 60000, rep: 180 },
    parts: [
      { subtitle: 'Satélites mortos', stock: [['mech', 8], ['ship', 3]], field: 3, money: 6e10, scrap: 3e9, rep: 10, sp: 5 },
      { subtitle: 'O cemitério de naves', stock: [['ship', 10]], field: 3, money: 1.5e11, scrap: 8e9, rep: 15, sp: 8 },
    ],
  },
];

export const CONTRACTS: ContractDef[] = [];
let n = 0;
let prev: string | undefined;
for (const s of SERIES) {
  s.parts.forEach((p, i) => {
    const id = `${s.id}-${i + 1}`;
    CONTRACTS.push({
      id, num: String(++n).padStart(3, '0'), series: s.id, part: i + 1, parts: s.parts.length,
      name: s.name, subtitle: p.subtitle, client: s.client, icon: s.icon, story: s.story, quote: s.quote, scene: s.scene,
      stock: p.stock, field: p.field, money: p.money, scrap: p.scrap, rep: p.rep, sp: p.sp,
      req: { contract: prev, ...(i === 0 ? s.req : {}), ...(p.force ? { force: p.force } : {}) },
    });
    prev = id;
  });
}

export const SERIES_LIST = SERIES.map((s) => ({ id: s.id, name: s.name, client: s.client, icon: s.icon, scene: s.scene, story: s.story, quote: s.quote }));
export const CONTRACT_MAP: Record<string, ContractDef> = Object.fromEntries(CONTRACTS.map((c) => [c.id, c]));
export const stockTotal = (c: ContractDef) => c.stock.reduce((a, [, n]) => a + n, 0);
