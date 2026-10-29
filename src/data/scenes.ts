import type { SceneDef } from '../core/types';

/** Location backdrops, one per client. Drawn procedurally in pixel art by the Renderer. */
export const SCENES: Record<string, SceneDef> = {
  drawer: { id: 'drawer', name: 'Gavetas da Dona Zuleide', wall: 'drawer', wallColors: ['#b07a46', '#9a6738'], floor: 'liner', floorColors: ['#f6e7c8', '#e9c9c9'], props: ['drawerbits'] },
  kitchen: { id: 'kitchen', name: 'Cozinha da Dona Zuleide', wall: 'tiles', wallColors: ['#f3e3c3', '#e8d2a8'], floor: 'tiles', floorColors: ['#d9c7a3', '#c4ae86'], props: ['cabinets', 'window', 'clock', 'plant'] },
  drinks: { id: 'drinks', name: 'Depósito Gelada & Cia', wall: 'bricks', wallColors: ['#b5523b', '#8e3b2a'], floor: 'concrete', floorColors: ['#8a9394', '#7b8586'], props: ['shelves', 'crates', 'neon', 'fridge'] },
  bikes: { id: 'bikes', name: 'Bicicletaria Pedal Torto', wall: 'planks', wallColors: ['#2e86ab', '#256d8c'], floor: 'wood', floorColors: ['#b07d48', '#9a6a3a'], props: ['bikes', 'posters', 'window', 'pegboard'] },
  moving: { id: 'moving', name: 'Casa dos Bragança', wall: 'planks', wallColors: ['#a29bfe', '#8c84f0'], floor: 'wood', floorColors: ['#c49a6c', '#ab845a'], props: ['boxes', 'window', 'frames', 'lamp'] },
  basement: { id: 'basement', name: 'Porão da Imobiliária Ferrugem', wall: 'concrete', wallColors: ['#4a4f55', '#3b3f44'], floor: 'concrete', floorColors: ['#55595e', '#4a4d52'], props: ['pipes', 'bulb', 'boxes', 'cobweb'] },
  store: { id: 'store', name: 'Eletro Zé', wall: 'tiles', wallColors: ['#dfe6e9', '#cfd8dc'], floor: 'tiles', floorColors: ['#b2bec3', '#dfe6e9'], props: ['shelves', 'sale', 'neon', 'lamps'] },
  vault: { id: 'vault', name: 'Cofre do Banco Ruína', wall: 'vault', wallColors: ['#5d6d7e', '#4a5866'], floor: 'metal', floorColors: ['#626d78', '#55606a'], props: ['vaultdoor', 'lamps', 'gold'] },
  junkyard: { id: 'junkyard', name: 'Ferro-Velho do Tião', wall: 'sky', wallColors: ['#f8b26a', '#f38b5a'], floor: 'dirt', floorColors: ['#8d6e4b', '#7a5e3f'], props: ['junkpiles', 'fence', 'crane', 'sun'] },
  lot: { id: 'lot', name: 'Pátio do Detran', wall: 'sky', wallColors: ['#74b9ff', '#a8d8ff'], floor: 'asphalt', floorColors: ['#4b4f54', '#3f4347'], props: ['city', 'fence', 'cones', 'sun'] },
  depot: { id: 'depot', name: 'Garagem Viação Sucata', wall: 'corrugated', wallColors: ['#5d7a8c', '#4c6577'], floor: 'concrete', floorColors: ['#6b7177', '#5b6167'], props: ['pipes', 'lamps', 'hazard', 'crane'] },
  hangar: { id: 'hangar', name: 'Hangar Secreto', wall: 'panels', wallColors: ['#2d3436', '#24292b'], floor: 'metal', floorColors: ['#3d4447', '#33393c'], props: ['lamps', 'hazard', 'screens', 'pipes'] },
  orbit: { id: 'orbit', name: 'Estação Orbital', wall: 'space', wallColors: ['#0c0f2b', '#1b1f4a'], floor: 'metal', floorColors: ['#4b5d78', '#3e4e66'], props: ['stars', 'planet', 'screens'] },
};
