/** Kinds of dirt. Each one fights back in its own way (see Surface.scrape). */
export type GunkId = 'poeira' | 'chiclete' | 'fuligem' | 'gordura' | 'limo' | 'ferrugem';

export interface GunkDef {
  id: GunkId;
  idx: number;
  name: string;
  icon: string;
  /** dark / mid / light shades */
  colors: [string, string, string];
  /** nail toughness needed to scrape it properly */
  tough: number;
  /** hit points per unit of thickness */
  hp: number;
  /** Pó earned per hit point removed */
  value: number;
  desc: string;
}

export const GUNKS: GunkDef[] = [
  { id: 'poeira', idx: 0, name: 'Poeira', icon: '🌫️', colors: ['#8a7f73', '#a89c8e', '#c7bcae'], tough: 0, hp: 1, value: 0.016, desc: 'Sai fácil. Paciência e vai e volta.' },
  { id: 'chiclete', idx: 1, name: 'Chiclete', icon: '🍬', colors: ['#c2577f', '#e27ba1', '#f7a8c6'], tough: 1, hp: 2.6, value: 0.032, desc: 'Gruda! Só sai esfregando pra frente e pra trás. Deslizar não adianta.' },
  { id: 'fuligem', idx: 2, name: 'Fuligem', icon: '🔥', colors: ['#1f1a1c', '#3a3236', '#5a5055'], tough: 1, hp: 2, value: 0.03, desc: 'Borra! Esfregar rápido demais espalha a fuligem para os lados.' },
  { id: 'gordura', idx: 3, name: 'Gordura', icon: '🍳', colors: ['#a8781c', '#d6a33a', '#f1cf6e'], tough: 1, hp: 3, value: 0.042, desc: 'Escorrega: a pegada não firma. Mãos quentes derretem.' },
  { id: 'limo', idx: 4, name: 'Limo', icon: '🦠', colors: ['#2f5e33', '#4f8a3c', '#7fbf5a'], tough: 2, hp: 3, value: 0.05, desc: 'Volta a crescer onde você não está esfregando.' },
  { id: 'ferrugem', idx: 5, name: 'Ferrugem', icon: '🔩', colors: ['#6b2e14', '#9c4a1f', '#c7743a'], tough: 3, hp: 6, value: 0.085, desc: 'Duríssima. Precisa de unha forte ou espátula.' },
];
export const GUNK: Record<GunkId, GunkDef> = Object.fromEntries(GUNKS.map((g) => [g.id, g])) as Record<GunkId, GunkDef>;
