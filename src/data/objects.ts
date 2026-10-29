import type { ObjectDef, PartSpec, MaterialId } from '../core/types';

// Shape helpers — "up-positive" coordinates, origin at bottom-center.
const R = (x: number, y: number, w: number, h: number) => [x, y, x + w, y, x + w, y + h, x, y + h];
function RR(x: number, y: number, w: number, h: number, r: number): number[] {
  const p: number[] = [];
  const c = [[x + w - r, y + r, -Math.PI / 2], [x + w - r, y + h - r, 0], [x + r, y + h - r, Math.PI / 2], [x + r, y + r, Math.PI]];
  for (const [cx, cy, a0] of c) for (let i = 0; i <= 4; i++) {
    const a = a0 + (i / 4) * (Math.PI / 2);
    p.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  return p;
}
function C(cx: number, cy: number, r: number, n = 22, ry = r): number[] {
  const p: number[] = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; p.push(cx + Math.cos(a) * r, cy + Math.sin(a) * ry); }
  return p;
}
type Opt = Partial<Omit<PartSpec, 'poly' | 'mat' | 'fill'>>;
const P = (poly: number[], mat: MaterialId, fill: string, o: Opt = {}): PartSpec => ({ poly, mat, fill, ...o });
const L = (poly: number[], mat: MaterialId, stroke: string, width: number, o: Opt = {}): PartSpec => ({ poly, mat, fill: stroke, stroke, open: true, width, ...o });

function wheel(cx: number, cy: number, r: number, detach: number, z = 5): PartSpec[] {
  return [
    P(C(cx, cy, r, 24), 'rubber', '#2b2b2e', { detach, z }),
    P(C(cx, cy, r * 0.55, 16), 'steel', '#c8d0d4', { detach: detach + 0.04, z: z + 1 }),
    P(C(cx, cy, r * 0.18, 10), 'steel', '#7f8c8d', { detach: detach + 0.04, z: z + 2 }),
  ];
}

export const OBJECTS: Record<string, ObjectDef> = {};
function def(o: ObjectDef) { OBJECTS[o.id] = o; }

def({
  id: 'cap', name: 'Tampinha', size: '3 cm', mat: 'aluminum', hp: 18, hardness: 2, value: 3, scrap: 1, mass: 0.002, cm: 3, maxCompress: 0.7,
  build: () => {
    const flutes: PartSpec[] = [];
    for (let x = -24; x <= 24; x += 8) flutes.push(L([x, 3, x, 15], 'aluminum', '#8e1b12', 2.5, { z: 2 }));
    return [P(RR(-30, 0, 60, 22, 5), 'aluminum', '#d63031', { z: 1 }), P(R(-30, 17, 60, 5), 'aluminum', '#ff7675', { z: 3 }), ...flutes];
  },
});
def({
  id: 'clip', name: 'Clipe', size: '4 cm', mat: 'steel', hp: 14, hardness: 4, value: 2, scrap: 1, mass: 0.001, cm: 4, maxCompress: 0.6,
  build: () => [L([-30, 4, 30, 4, 34, 13, 30, 22, -26, 22, -30, 13, -26, 8, 22, 8, 25, 13, 22, 17, -18, 17], 'steel', '#c8d2d8', 2.6)],
});
def({
  id: 'can', name: 'Latinha', size: '12 cm', mat: 'aluminum', hp: 32, hardness: 2.5, value: 5, scrap: 2, mass: 0.015, cm: 7, maxCompress: 0.82,
  build: () => [
    P(RR(-25, 4, 50, 82, 5), 'aluminum', '#e74c3c', { z: 1 }),
    P(R(-25, 32, 50, 24), 'aluminum', '#f5f6fa', { z: 2 }),
    L([-20, 44, -10, 50, 0, 40, 10, 50, 20, 44], 'aluminum', '#c0392b', 3, { z: 3 }),
    P(R(-21, 86, 42, 5), 'aluminum', '#bdc3c7', { z: 2 }),
    P(R(-22, 0, 44, 6), 'aluminum', '#95a5a6', { z: 2 }),
    P(R(-6, 91, 12, 3), 'aluminum', '#dfe6e9', { z: 3, detach: 0.45 }),
  ],
});
def({
  id: 'bottle', name: 'Garrafa PET', size: '25 cm', mat: 'plastic', hp: 28, hardness: 1.5, value: 4, scrap: 1, mass: 0.03, cm: 8, maxCompress: 0.8,
  build: () => [
    P([-20, 0, 20, 0, 23, 8, 23, 70, 14, 88, 8, 100, -8, 100, -14, 88, -23, 70, -23, 8], 'plastic', 'rgba(130,205,255,0.7)', { z: 1 }),
    P(R(-23, 30, 46, 22), 'plastic', '#27ae60', { z: 2 }),
    L([-15, 41, 15, 41], 'plastic', '#f1f2f6', 3, { z: 3 }),
    P(R(-8, 100, 16, 12), 'plastic', '#2980b9', { z: 3, detach: 0.45 }),
  ],
});
def({
  id: 'toy', name: 'Robô de Brinquedo', size: '20 cm', mat: 'plastic', hp: 48, hardness: 3, value: 8, scrap: 2, mass: 0.2, cm: 12, maxCompress: 0.72,
  build: () => [
    P(R(-18, 0, 14, 30), 'plastic', '#0984e3', { z: 1 }),
    P(R(4, 0, 14, 30), 'plastic', '#0984e3', { z: 1 }),
    P(RR(-24, 30, 48, 40, 6), 'plastic', '#fdcb6e', { z: 2 }),
    P(C(0, 50, 7, 10), 'plastic', '#d63031', { z: 3 }),
    P(R(-38, 38, 14, 28), 'plastic', '#e17055', { z: 1, detach: 0.35 }),
    P(R(24, 38, 14, 28), 'plastic', '#e17055', { z: 1, detach: 0.5 }),
    P(RR(-16, 72, 32, 26, 5), 'plastic', '#dfe6e9', { z: 2, detach: 0.65 }),
    P(C(-7, 86, 4, 8), 'plastic', '#2d3436', { z: 3, detach: 0.65 }),
    P(C(7, 86, 4, 8), 'plastic', '#2d3436', { z: 3, detach: 0.65 }),
    L([0, 98, 0, 110, 6, 114], 'plastic', '#636e72', 2.5, { z: 3, detach: 0.25 }),
  ],
});
def({
  id: 'jar', name: 'Pote de Vidro', size: '15 cm', mat: 'glass', hp: 42, hardness: 5, value: 10, scrap: 2, mass: 0.4, cm: 10, maxCompress: 0.75,
  build: () => [
    P(RR(-26, 4, 52, 46, 8), 'plastic', '#b33939', { z: 1 }),
    P(RR(-32, 0, 64, 76, 10), 'glass', 'rgba(175,230,240,0.45)', { z: 2, detach: 0.5, shatter: true }),
    P(R(-30, 76, 60, 14), 'aluminum', '#d4ac0d', { z: 3, detach: 0.75 }),
  ],
});
def({
  id: 'pan', name: 'Panela', size: '30 cm', mat: 'aluminum', hp: 85, hardness: 8, value: 18, scrap: 4, mass: 1.2, cm: 45, maxCompress: 0.7,
  build: () => [
    P([-50, 0, 50, 0, 56, 50, -56, 50], 'aluminum', '#95a5a6', { z: 1 }),
    P(R(-60, 48, 120, 6), 'aluminum', '#bdc3c7', { z: 2 }),
    L([-45, 15, 45, 15], 'aluminum', '#7f8c8d', 2, { z: 2 }),
    P(RR(56, 40, 62, 9, 4), 'plastic', '#2d3436', { z: 0, detach: 0.5 }),
  ],
});
def({
  id: 'crate', name: 'Caixote', size: '50 cm', mat: 'wood', hp: 115, hardness: 6, value: 20, scrap: 4, mass: 6, cm: 50, maxCompress: 0.65,
  build: () => {
    const p: PartSpec[] = [];
    for (let i = 0; i < 4; i++) p.push(P(R(-55, i * 20, 110, 18), 'wood', i % 2 ? '#c8a165' : '#d4ad72', { z: 1, detach: 0.55 + i * 0.08, shatter: true }));
    p.push(L([-50, 4, 50, 74], 'wood', '#8e6b3e', 7, { z: 2, detach: 0.5 }));
    p.push(P(R(-55, 0, 110, 78), 'wood', '#5a4026', { z: 0 }));
    return p;
  },
});
def({
  id: 'toolbox', name: 'Caixa Metálica', size: '45 cm', mat: 'steel', hp: 210, hardness: 14, value: 40, scrap: 8, mass: 4, cm: 45, maxCompress: 0.72,
  build: () => [
    P(R(-70, 0, 140, 56), 'steel', '#c0392b', { z: 1 }),
    P([-70, 56, 70, 56, 60, 72, -60, 72], 'steel', '#e74c3c', { z: 2 }),
    L([-25, 72, -25, 84, 25, 84, 25, 72], 'steel', '#2d3436', 5, { z: 3, detach: 0.5 }),
    P(R(-8, 48, 16, 12), 'steel', '#f1c40f', { z: 3, detach: 0.4 }),
    L([-62, 28, 62, 28], 'steel', '#922b21', 2, { z: 2 }),
  ],
});
def({
  id: 'bikewheel', name: 'Roda de Bicicleta', size: '66 cm', mat: 'steel', hp: 150, hardness: 10, value: 30, scrap: 6, mass: 2, cm: 66, maxCompress: 0.7,
  build: () => {
    const p: PartSpec[] = [P(C(0, 70, 70, 32), 'rubber', '#2d3436', { z: 1 }), P(C(0, 70, 60, 32), 'steel', '#95a5a6', { z: 2 }), P(C(0, 70, 55, 32), 'steel', '#4b5257', { z: 3 })];
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; p.push(L([0, 70, Math.cos(a) * 55, 70 + Math.sin(a) * 55], 'steel', '#ecf0f1', 1.6, { z: 4, detach: 0.3 + (i % 4) * 0.12 })); }
    p.push(P(C(0, 70, 9, 10), 'steel', '#7f8c8d', { z: 5 }));
    return p;
  },
});
def({
  id: 'microwave', name: 'Micro-ondas', size: '50 cm', mat: 'steel', hp: 380, hardness: 18, value: 70, scrap: 14, mass: 12, cm: 50, maxCompress: 0.75,
  build: () => [
    P(R(40, 20, 38, 22), 'plastic', '#27ae60', { z: 0, rare: true, detach: 0.75 }),
    P(RR(-90, 0, 180, 110, 6), 'steel', '#dfe6e9', { z: 1 }),
    P(RR(-82, 10, 112, 90, 5), 'steel', '#b2bec3', { z: 2 }),
    P(RR(-74, 18, 96, 74, 4), 'glass', 'rgba(40,62,72,0.88)', { z: 3, detach: 0.4, shatter: true }),
    P(R(38, 12, 44, 86), 'steel', '#95a5a6', { z: 2, detach: 0.6 }),
    P(C(60, 74, 7, 10), 'plastic', '#2d3436', { z: 3, detach: 0.35 }),
    P(C(60, 52, 7, 10), 'plastic', '#2d3436', { z: 3, detach: 0.45 }),
    P(R(46, 86, 28, 6), 'plastic', '#00b894', { z: 3, detach: 0.5 }),
  ],
});
def({
  id: 'tv', name: 'TV de Tubo', size: '60 cm', mat: 'plastic', hp: 340, hardness: 15, value: 65, scrap: 12, mass: 25, cm: 60, maxCompress: 0.72,
  build: () => [
    P(C(-10, 75, 32, 16), 'glass', '#8e44ad', { z: 0, rare: true, detach: 0.8 }),
    P(RR(-85, 10, 170, 130, 12), 'plastic', '#6d4c41', { z: 1 }),
    P(RR(-70, 25, 120, 100, 16), 'plastic', '#3e2723', { z: 2 }),
    P(RR(-65, 30, 110, 90, 16), 'glass', 'rgba(35,60,50,0.92)', { z: 3, detach: 0.45, shatter: true }),
    P(C(66, 100, 8, 10), 'plastic', '#bcaaa4', { z: 3, detach: 0.4 }),
    P(C(66, 72, 8, 10), 'plastic', '#bcaaa4', { z: 3, detach: 0.55 }),
    P(R(-60, 0, 12, 12), 'plastic', '#3e2723', { z: 1 }),
    P(R(48, 0, 12, 12), 'plastic', '#3e2723', { z: 1 }),
    L([-10, 140, -45, 185], 'steel', '#b2bec3', 2.5, { z: 1, detach: 0.25 }),
    L([10, 140, 45, 185], 'steel', '#b2bec3', 2.5, { z: 1, detach: 0.3 }),
  ],
});
def({
  id: 'fridge', name: 'Geladeira', size: '1,8 m', mat: 'steel', hp: 1400, hardness: 40, value: 250, scrap: 45, mass: 70, cm: 70, maxCompress: 0.8,
  build: () => [
    P(R(-30, 8, 60, 30), 'steel', '#2c3e50', { z: 0, rare: true, detach: 0.85 }),
    P(RR(-60, 0, 120, 220, 8), 'steel', '#dfe6e9', { z: 1 }),
    P(RR(-56, 142, 112, 74, 4), 'steel', '#f5f6fa', { z: 2, detach: 0.6 }),
    P(RR(-56, 4, 112, 134, 4), 'steel', '#f5f6fa', { z: 2, detach: 0.75 }),
    P(RR(38, 152, 7, 42, 3), 'steel', '#95a5a6', { z: 3, detach: 0.35 }),
    P(RR(38, 88, 7, 42, 3), 'steel', '#95a5a6', { z: 3, detach: 0.45 }),
    P(R(-40, 170, 30, 20), 'plastic', '#74b9ff', { z: 3, detach: 0.3 }),
  ],
});
def({
  id: 'safe', name: 'Cofre', size: '80 cm', mat: 'steel', hp: 2800, hardness: 120, value: 600, scrap: 90, mass: 300, cm: 80, maxCompress: 0.6,
  build: () => [
    P(R(-34, 16, 68, 22), 'steel', '#f1c40f', { z: 0, rare: true, detach: 0.82 }),
    P(R(-70, 0, 140, 150), 'steel', '#34495e', { z: 1 }),
    P(R(-58, 12, 116, 126), 'steel', '#2c3e50', { z: 2, detach: 0.72 }),
    P(C(0, 78, 22, 18), 'steel', '#bdc3c7', { z: 3, detach: 0.55 }),
    P(C(0, 78, 8, 10), 'steel', '#7f8c8d', { z: 4, detach: 0.55 }),
    P(R(30, 70, 22, 8), 'steel', '#95a5a6', { z: 3, detach: 0.4 }),
  ],
});
def({
  id: 'moto', name: 'Motocicleta', size: '2 m', mat: 'steel', hp: 3800, hardness: 80, value: 900, scrap: 120, mass: 180, cm: 210, maxCompress: 0.7,
  build: () => [
    P(R(-22, 28, 54, 34), 'steel', '#636e72', { z: 1, rare: true, detach: 0.85 }),
    L([-85, 38, -20, 62, 40, 64, 85, 38], 'steel', '#c0392b', 9, { z: 2 }),
    L([40, 64, 62, 108, 80, 120], 'steel', '#2d3436', 5, { z: 2, detach: 0.4 }),
    P(RR(-32, 66, 74, 32, 14), 'steel', '#e74c3c', { z: 3 }),
    P(RR(-84, 74, 62, 14, 6), 'rubber', '#2d3436', { z: 3, detach: 0.45 }),
    P(C(66, 98, 10, 12), 'glass', 'rgba(255,240,170,0.95)', { z: 3, detach: 0.3, shatter: true }),
    ...wheel(-85, 38, 38, 0.55),
    ...wheel(85, 38, 38, 0.65),
  ],
});
def({
  id: 'car', name: 'Carro', size: '4 m', mat: 'steel', hp: 11000, hardness: 200, value: 3000, scrap: 400, mass: 1200, cm: 420, maxCompress: 0.78,
  build: () => [
    P(R(105, 30, 72, 32), 'steel', '#4b4b4b', { z: 0, rare: true, detach: 0.88 }),
    P([-120, 74, 100, 74, 62, 136, -82, 139], 'steel', '#1f6fa8', { z: 1 }),
    P([-196, 20, 196, 20, 202, 58, 184, 76, -184, 78, -202, 56], 'steel', '#2980b9', { z: 2 }),
    P([-108, 82, -14, 82, -14, 129, -76, 131], 'glass', 'rgba(170,215,240,0.8)', { z: 3, detach: 0.3, shatter: true }),
    P([-4, 82, 90, 82, 56, 129, -4, 129], 'glass', 'rgba(170,215,240,0.8)', { z: 3, detach: 0.4, shatter: true }),
    L([-10, 76, -10, 26], 'steel', '#1a5276', 2, { z: 3 }),
    L([-130, 76, -130, 28], 'steel', '#1a5276', 2, { z: 3 }),
    P(R(-28, 60, 16, 5), 'steel', '#bdc3c7', { z: 3, detach: 0.35 }),
    P(RR(-208, 20, 22, 16, 4), 'steel', '#bdc3c7', { z: 3, detach: 0.5 }),
    P(RR(186, 20, 22, 16, 4), 'steel', '#bdc3c7', { z: 3, detach: 0.58 }),
    P(C(190, 56, 9, 10), 'glass', 'rgba(255,245,190,0.95)', { z: 3, detach: 0.25, shatter: true }),
    P(R(-200, 48, 10, 14), 'glass', 'rgba(255,80,80,0.95)', { z: 3, detach: 0.28, shatter: true }),
    ...wheel(-120, 30, 32, 0.66),
    ...wheel(120, 30, 32, 0.74),
  ],
});
def({
  id: 'bus', name: 'Ônibus', size: '12 m', mat: 'steel', hp: 48000, hardness: 600, value: 14000, scrap: 1500, mass: 11000, cm: 1200, maxCompress: 0.8,
  build: () => {
    const p: PartSpec[] = [
      P(R(160, 40, 110, 50), 'steel', '#4b4b4b', { z: 0, rare: true, detach: 0.88 }),
      P(RR(-300, 25, 600, 190, 16), 'steel', '#f1c40f', { z: 1 }),
      P(R(-300, 60, 600, 14), 'steel', '#e67e22', { z: 2 }),
      P(R(250, 85, 40, 115), 'glass', 'rgba(170,215,240,0.85)', { z: 3, detach: 0.22, shatter: true }),
      P(R(-30, 30, 44, 140), 'steel', '#d4a017', { z: 2, detach: 0.6 }),
    ];
    for (let i = 0; i < 6; i++) p.push(P(R(i < 3 ? -285 + i * 80 : 30 + (i - 3) * 72, 120, 60, 70), 'glass', 'rgba(170,215,240,0.85)', { z: 3, detach: 0.2 + i * 0.06, shatter: true }));
    p.push(P(RR(-312, 25, 22, 26, 4), 'steel', '#bdc3c7', { z: 3, detach: 0.5 }), P(RR(290, 25, 22, 26, 4), 'steel', '#bdc3c7', { z: 3, detach: 0.55 }));
    p.push(...wheel(-200, 36, 38, 0.64), ...wheel(190, 36, 38, 0.7));
    return p;
  },
});
def({
  id: 'mech', name: 'Robô Gigante', size: '20 m', mat: 'alloy', hp: 280000, hardness: 2500, value: 90000, scrap: 8000, mass: 90000, cm: 1600, maxCompress: 0.7,
  build: () => [
    P(R(-46, 0, 36, 110), 'alloy', '#576574', { z: 1 }),
    P(R(10, 0, 36, 110), 'alloy', '#576574', { z: 1 }),
    P(R(-60, 0, 54, 18), 'alloy', '#222f3e', { z: 2, detach: 0.6 }),
    P(R(6, 0, 54, 18), 'alloy', '#222f3e', { z: 2, detach: 0.65 }),
    P(RR(-70, 105, 140, 120, 14), 'alloy', '#8395a7', { z: 2 }),
    P(C(0, 165, 22, 16), 'quantum', '#48dbfb', { z: 3, rare: true, detach: 0.8 }),
    P(RR(-120, 120, 46, 120, 10), 'alloy', '#c8d6e5', { z: 1, detach: 0.4 }),
    P(RR(74, 120, 46, 120, 10), 'alloy', '#c8d6e5', { z: 1, detach: 0.48 }),
    P(RR(-92, 205, 60, 36, 8), 'alloy', '#ee5253', { z: 3, detach: 0.33 }),
    P(RR(32, 205, 60, 36, 8), 'alloy', '#ee5253', { z: 3, detach: 0.38 }),
    P(RR(-34, 228, 68, 50, 10), 'alloy', '#8395a7', { z: 2, detach: 0.68 }),
    P(R(-24, 246, 48, 12), 'glass', 'rgba(255,90,90,0.95)', { z: 3, detach: 0.5, shatter: true }),
    L([20, 278, 30, 310], 'alloy', '#feca57', 4, { z: 2, detach: 0.25 }),
  ],
});
def({
  id: 'ship', name: 'Nave Estelar', size: '60 m', mat: 'quantum', hp: 1.9e6, hardness: 12000, value: 700000, scrap: 50000, mass: 600000, cm: 6000, maxCompress: 0.75,
  build: () => [
    P([-60, 40, 60, 40, 30, 150, -30, 150], 'quantum', '#5f27cd', { z: 0, detach: 0.42 }),
    P([-210, 20, 160, 20, 210, 60, 160, 100, -210, 100, -190, 60], 'quantum', '#c8d6e5', { z: 1 }),
    P([-200, 30, -120, 30, -120, 90, -200, 90], 'alloy', '#576574', { z: 2 }),
    P(C(0, 60, 26, 16), 'quantum', '#ff9ff3', { z: 3, rare: true, detach: 0.82 }),
    P([90, 64, 160, 64, 190, 80, 150, 96, 90, 96], 'glass', 'rgba(72,219,251,0.85)', { z: 3, detach: 0.3, shatter: true }),
    P([-150, 0, -60, 0, -40, 22, -170, 22], 'alloy', '#8395a7', { z: 2, detach: 0.5 }),
    P(C(-212, 60, 14, 12, 26), 'quantum', '#ff9f43', { z: 3, detach: 0.35 }),
    L([-100, 100, -80, 140, -20, 150], 'alloy', '#feca57', 4, { z: 1, detach: 0.25 }),
  ],
});

export const OBJECT_LIST = Object.values(OBJECTS);
