import type { ContractDef } from '../core/types';

/**
 * Long jobs with personality. Each one takes several timed runs; what you leave
 * on the floor stays there for the next run.
 */
export const CONTRACTS: ContractDef[] = [
  {
    id: 'c001', num: '001', name: 'A Gaveta da Dona Zuleide', client: 'Dona Zuleide, 78 anos', scene: 'kitchen',
    story: 'Ela juntou tralha por 40 anos numa gaveta só. Agora quer tudo esmagado para levar à reciclagem e comprar um bolo.',
    quote: '"Esmaga tudo, meu filho. Menos a minha toalha bordada!"',
    stock: [['cap', 14], ['clip', 14], ['can', 8], ['toy', 4]], field: 12, money: 60, scrap: 10, rep: 1, sp: 1, req: {},
  },
  {
    id: 'c002', num: '002', name: 'Validade Vencida', client: 'Seu Valdemar — Gelada & Cia', scene: 'drinks',
    story: 'A distribuidora de bebidas encalhou um lote inteiro de refrigerante de jiló. Ninguém comprou. Ninguém vai comprar.',
    quote: '"Era pra ser o sabor do verão… Amassa antes que alguém prove."',
    stock: [['can', 60], ['bottle', 45], ['cap', 45]], field: 16, money: 400, scrap: 40, rep: 2, sp: 1, req: { contract: 'c001' },
  },
  {
    id: 'c003', num: '003', name: 'Faxina do Pedal Torto', client: 'Kátia — Bicicletaria Pedal Torto', scene: 'bikes',
    story: 'A oficina vai virar cafeteria de ciclistas. Peças tortas, rodas empenadas e latinhas de lanche precisam sumir.',
    quote: '"Se rolar, eu conserto. Se não rolar, é com você."',
    stock: [['clip', 40], ['can', 30], ['bikewheel', 14], ['pan', 10]], field: 14, money: 1500, scrap: 120, rep: 2, sp: 1, req: { contract: 'c002', force: 9 },
  },
  {
    id: 'c004', num: '004', name: 'Mudança dos Bragança', client: 'Família Bragança', scene: 'moving',
    story: 'Cinco filhos, três cachorros e uma casa nova menor. O que não coube no caminhão vira bloco de sucata.',
    quote: '"O robô do Juninho também. Ele já tem 30 anos, o Juninho."',
    stock: [['toy', 30], ['crate', 24], ['jar', 24], ['tv', 8]], field: 12, money: 5200, scrap: 380, rep: 3, sp: 2, req: { contract: 'c003', rep: 4 },
  },
  {
    id: 'c005', num: '005', name: 'O Porão Assombrado', client: 'Imobiliária Ferrugem', scene: 'basement',
    story: 'Ninguém desce nesse porão desde 1987. Dizem que as panelas batem sozinhas à noite. Hoje elas param.',
    quote: '"Não é assombração, é sucata acumulada. Assina aqui."',
    stock: [['pan', 30], ['toolbox', 24], ['microwave', 14], ['crate', 16]], field: 11, money: 16000, scrap: 1100, rep: 4, sp: 2, req: { contract: 'c004', force: 14 },
  },
  {
    id: 'c006', num: '006', name: 'Queima de Estoque', client: 'Zé da Eletro Zé', scene: 'store',
    story: 'O Zé comprou 200 micro-ondas que só esquentam metade do prato. A loja precisa de espaço para o novo encalhe.',
    quote: '"Promoção relâmpago: você esmaga, eu sorrio."',
    stock: [['microwave', 30], ['tv', 30], ['fridge', 10]], field: 9, money: 70000, scrap: 4000, rep: 6, sp: 2, req: { contract: 'c005', force: 40, rep: 10 },
  },
  {
    id: 'c007', num: '007', name: 'O Cofre Esquecido', client: 'Banco Ruína S.A.', scene: 'vault',
    story: 'O banco faliu, mas os cofres ficaram. Alguns ainda têm barras de ouro esquecidas dentro.',
    quote: '"Achou ouro? Achou nada. Shhh."',
    stock: [['toolbox', 20], ['safe', 16]], field: 7, money: 260000, scrap: 14000, rep: 8, sp: 3, req: { contract: 'c006', force: 110 },
  },
  {
    id: 'c008', num: '008', name: 'Ferro-Velho do Tião', client: 'Tião Sucateiro', scene: 'junkyard',
    story: 'O Tião quer compactar o ferro-velho inteiro antes que a prefeitura passe. Geladeiras, motos e o Fusca do avô.',
    quote: '"O Fusca não! …Tá, o Fusca também."',
    stock: [['fridge', 20], ['moto', 12], ['car', 6]], field: 6, money: 1.2e6, scrap: 60000, rep: 10, sp: 3, req: { contract: 'c007', force: 220, rep: 25 },
  },
  {
    id: 'c009', num: '009', name: 'Pátio Lotado', client: 'Detran Regional', scene: 'lot',
    story: 'Mil carros apreendidos e nenhum dono. O pátio não fecha mais o portão.',
    quote: '"Preenche o formulário 27-B depois. Esmaga primeiro."',
    stock: [['car', 24], ['moto', 20]], field: 6, money: 5e6, scrap: 250000, rep: 14, sp: 4, req: { contract: 'c008', force: 600 },
  },
  {
    id: 'c010', num: '010', name: 'Aposentadoria da Frota', client: 'Viação Sucata', scene: 'depot',
    story: 'A frota de ônibus mais atrasada do país finalmente vai se aposentar. Pela primeira vez, no horário.',
    quote: '"Próxima parada: bloquinho de metal."',
    stock: [['bus', 14], ['car', 16]], field: 4, money: 3e7, scrap: 1.2e6, rep: 18, sp: 5, req: { contract: 'c009', force: 1500, rep: 60 },
  },
  {
    id: 'c011', num: '011', name: 'Protótipos Proibidos', client: '???', scene: 'hangar',
    story: 'Homens de óculos escuros, um hangar sem placa e robôs gigantes que "nunca existiram".',
    quote: '"Você não viu nada. E não esmagou nada."',
    stock: [['bus', 6], ['mech', 12]], field: 3, money: 4e8, scrap: 1.5e7, rep: 25, sp: 6, req: { contract: 'c010', force: 8000, rep: 100 },
  },
  {
    id: 'c012', num: '012', name: 'Lixo Espacial', client: 'Consórcio Estelar', scene: 'orbit',
    story: 'A órbita está entupida de naves aposentadas. Alguém precisa fazer a faxina do universo.',
    quote: '"Bem-vindo à primeira cooperativa de reciclagem intergaláctica."',
    stock: [['mech', 12], ['ship', 10]], field: 3, money: 8e9, scrap: 3e8, rep: 40, sp: 10, req: { contract: 'c011', force: 60000, rep: 180 },
  },
];

export const CONTRACT_MAP: Record<string, ContractDef> = Object.fromEntries(CONTRACTS.map((c) => [c.id, c]));
export const stockTotal = (c: ContractDef) => c.stock.reduce((a, [, n]) => a + n, 0);
