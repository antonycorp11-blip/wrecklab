import type { ContractDef } from '../core/types';

export const CONTRACTS: ContractDef[] = [
  { id: 'c001', num: '001', name: 'Limpeza de Gaveta', client: 'Dona Zuleide', desc: 'Uma gaveta cheia de tralhas minúsculas.', items: [['clip', 4], ['cap', 3], ['can', 2], ['toy', 1]], money: 40, scrap: 4, rep: 1, sp: 1, par: 45, req: {} },
  { id: 'c002', num: '002', name: 'Oficina de Bicicletas', client: 'Pedal & Cia', desc: 'Peças velhas, correias e uma roda empenada.', items: [['clip', 3], ['cap', 2], ['bottle', 2], ['bikewheel', 1]], money: 90, scrap: 8, rep: 1, sp: 1, par: 60, req: { contract: 'c001' } },
  { id: 'c003', num: '003', name: 'Depósito Abandonado', client: 'Imobiliária Ferrugem', desc: 'Latas, panelas e sucata do porão.', items: [['can', 5], ['pan', 3], ['toolbox', 2], ['microwave', 1]], money: 260, scrap: 20, rep: 2, sp: 1, par: 90, req: { contract: 'c002', force: 9 } },
  { id: 'c004', num: '004', name: 'Cozinha Reformada', client: 'Família Bragança', desc: 'Potes, garrafas e um micro-ondas teimoso.', items: [['bottle', 4], ['jar', 3], ['pan', 2], ['microwave', 1]], money: 420, scrap: 26, rep: 2, sp: 1, par: 90, req: { contract: 'c003', rep: 3 } },
  { id: 'c005', num: '005', name: 'Mudança Express', client: 'Leva-e-Traz', desc: 'Caixotes, brinquedos e TVs de tubo.', items: [['crate', 4], ['toy', 3], ['tv', 2]], money: 650, scrap: 40, rep: 3, sp: 2, par: 100, req: { contract: 'c004', force: 14 } },
  { id: 'c006', num: '006', name: 'Loja de Eletro', client: 'Eletro Zé', desc: 'Encalhe de eletrodomésticos e uma geladeira.', items: [['microwave', 3], ['tv', 3], ['fridge', 1]], money: 1900, scrap: 110, rep: 4, sp: 2, par: 120, req: { contract: 'c005', force: 40, rep: 7 } },
  { id: 'c007', num: '007', name: 'Banco Falido', client: 'Banco Ruína S.A.', desc: 'Cofres e caixas reforçadas. Pressão alta necessária.', items: [['toolbox', 3], ['safe', 2]], money: 4200, scrap: 220, rep: 6, sp: 2, par: 120, req: { contract: 'c006', force: 110 } },
  { id: 'c008', num: '008', name: 'Ferro-Velho Municipal', client: 'Prefeitura', desc: 'Geladeiras, motos e o primeiro carro.', items: [['fridge', 2], ['moto', 2], ['car', 1]], money: 16000, scrap: 900, rep: 8, sp: 3, par: 150, req: { contract: 'c007', force: 220, rep: 18 } },
  { id: 'c009', num: '009', name: 'Pátio de Apreensão', client: 'Detran Regional', desc: 'Carros abandonados e motos sem dono.', items: [['car', 3], ['moto', 2]], money: 42000, scrap: 2200, rep: 10, sp: 3, par: 160, req: { contract: 'c008', force: 600 } },
  { id: 'c010', num: '010', name: 'Garagem de Ônibus', client: 'Viação Sucata', desc: 'Frota aposentada. Compacte tudo.', items: [['car', 2], ['bus', 2]], money: 220000, scrap: 9000, rep: 14, sp: 4, par: 180, req: { contract: 'c009', force: 1500, rep: 45 } },
  { id: 'c011', num: '011', name: 'Hangar Secreto', client: '???', desc: 'Protótipos militares que nunca existiram.', items: [['bus', 1], ['mech', 2]], money: 2.5e6, scrap: 70000, rep: 20, sp: 5, par: 200, req: { contract: 'c010', force: 8000, rep: 80 } },
  { id: 'c012', num: '012', name: 'Órbita Baixa', client: 'Consórcio Estelar', desc: 'Naves desativadas. Requer tecnologia absurda.', items: [['mech', 2], ['ship', 2]], money: 4e7, scrap: 600000, rep: 30, sp: 8, par: 240, req: { contract: 'c011', force: 60000, rep: 150 } },
];

export const CONTRACT_MAP: Record<string, ContractDef> = Object.fromEntries(CONTRACTS.map((c) => [c.id, c]));
