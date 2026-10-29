export interface ChallengeDef { id: string; name: string; desc: string; icon: string; money: number; sp: number; scrap: number }

export const CHALLENGES: ChallengeDef[] = [
  { id: 'fast10', name: 'Mãos Rápidas', icon: '⚡', desc: 'Esmague 10 itens em menos de 5 segundos.', money: 150, sp: 2, scrap: 10 },
  { id: 'oneshot', name: 'Golpe Único', icon: '💥', desc: 'Destrua um objeto com 100+ de integridade em um único golpe.', money: 500, sp: 2, scrap: 30 },
  { id: 'crit5', name: 'Sequência Crítica', icon: '🎯', desc: 'Acerte 5 golpes críticos em 4 segundos.', money: 800, sp: 2, scrap: 40 },
  { id: 'rare3', name: 'Garimpeiro', icon: '💎', desc: 'Recupere 3 componentes raros em um único contrato.', money: 1500, sp: 3, scrap: 60 },
  { id: 'loyal', name: 'Fiel à Ferramenta', icon: '🤝', desc: 'Conclua um contrato inteiro sem trocar de ferramenta.', money: 300, sp: 1, scrap: 20 },
  { id: 'manual', name: 'Puro Músculo', icon: '💪', desc: 'Esmague 20 itens em uma run sem nenhuma ajuda automática.', money: 2500, sp: 3, scrap: 100 },
  { id: 'stubborn', name: 'Teimosia', icon: '🐂', desc: 'Esmague um Cofre usando o martelo ou o alicate.', money: 6000, sp: 4, scrap: 300 },
  { id: 'run30', name: 'Relâmpago', icon: '⏱️', desc: 'Esmague 30 itens em uma única run.', money: 1200, sp: 2, scrap: 50 },
  { id: 'glass25', name: 'Vidraceiro do Avesso', icon: '🪟', desc: 'Estilhace 25 peças de vidro.', money: 900, sp: 2, scrap: 40 },
  { id: 'mass10t', name: 'Compactador', icon: '🧱', desc: 'Compacte 10 toneladas de material.', money: 20000, sp: 3, scrap: 1000 },
  { id: 'cars5', name: 'Ferro-Velho Pessoal', icon: '🚗', desc: 'Destrua 5 carros.', money: 50000, sp: 3, scrap: 2000 },
  { id: 'd500', name: 'Demolidor', icon: '🏚️', desc: 'Destrua 500 objetos.', money: 30000, sp: 5, scrap: 1500 },
];
