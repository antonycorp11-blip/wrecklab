import type { MaterialDef, MaterialId } from '../core/types';

export const MATERIALS: Record<MaterialId, MaterialDef> = {
  plastic: { id: 'plastic', name: 'Plástico', elasticity: 0.35, crease: 0.35, brittle: 0.2, bulge: 0.75, sound: 'plastic', sparks: false, chip: '#f5f5f5' },
  aluminum: { id: 'aluminum', name: 'Alumínio', elasticity: 0.06, crease: 1, brittle: 0.05, bulge: 0.55, sound: 'metal', sparks: true, chip: '#dfe6e9' },
  glass: { id: 'glass', name: 'Vidro', elasticity: 0, crease: 0, brittle: 1, bulge: 0.08, sound: 'glass', sparks: false, chip: '#c7ecee' },
  wood: { id: 'wood', name: 'Madeira', elasticity: 0.04, crease: 0.15, brittle: 0.75, bulge: 0.25, sound: 'wood', sparks: false, chip: '#c8a165' },
  steel: { id: 'steel', name: 'Aço', elasticity: 0.12, crease: 0.7, brittle: 0.05, bulge: 0.35, sound: 'metal', sparks: true, chip: '#b2bec3' },
  rubber: { id: 'rubber', name: 'Borracha', elasticity: 0.7, crease: 0.1, brittle: 0, bulge: 0.95, sound: 'rubber', sparks: false, chip: '#2d3436' },
  alloy: { id: 'alloy', name: 'Liga Titânica', elasticity: 0.15, crease: 0.6, brittle: 0.1, bulge: 0.3, sound: 'exotic', sparks: true, chip: '#81ecec' },
  quantum: { id: 'quantum', name: 'Matéria Quântica', elasticity: 0.3, crease: 0.45, brittle: 0.25, bulge: 0.2, sound: 'exotic', sparks: true, chip: '#a29bfe' },
};

export const isMetal = (m: MaterialId) => m === 'aluminum' || m === 'steel' || m === 'alloy' || m === 'quantum';
