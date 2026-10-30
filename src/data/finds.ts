/** 6x6 sprites for hidden finds, drawn under the dirt. */
export const FIND_SPRITES: Record<string, { rows: string[]; pal: Record<string, string> }> = {
  moeda: { rows: ['.yyyy.', 'yYYYYy', 'yYyyYy', 'yYyyYy', 'yYYYYy', '.yyyy.'], pal: { y: '#a8780f', Y: '#f7d046' } },
  chave: { rows: ['.yy...', 'y..y..', 'y..yYY', '.yy.Y.', '....YY', '......'], pal: { y: '#c99a1c', Y: '#f7d046' } },
  anel: { rows: ['..cc..', '.yccy.', 'y....y', 'y....y', '.y..y.', '..yy..'], pal: { y: '#f7d046', c: '#7fe3ff' } },
  carta: { rows: ['wwwwww', 'wrwwrw', 'wwrrww', 'wwwwww', 'wwwwww', '......'], pal: { w: '#fff4dc', r: '#d63c3c' } },
  dentes: { rows: ['pppppp', 'pwwwwp', 'pwpwpw', 'pwwwwp', '.pppp.', '......'], pal: { p: '#e88aa0', w: '#ffffff' } },
  botao: { rows: ['.bbbb.', 'bBBBBb', 'bBkBkb', 'bBkBkb', 'bBBBBb', '.bbbb.'], pal: { b: '#2e5aa8', B: '#4c86e0', k: '#162a52' } },
  oculos: { rows: ['......', 'kkk.kkk', 'kck.kck', 'kkkkkkk', '......', '......'], pal: { k: '#222222', c: '#9fe0ff' } },
  foto: { rows: ['wwwwww', 'wsssww', 'wsfsww', 'wgggww', 'wwwwww', '......'], pal: { w: '#ffffff', s: '#8fd3ff', f: '#f4c28a', g: '#6abe5b' } },
  concha: { rows: ['..pp..', '.pPPp.', 'pPpPpP', 'pPpPpP', '.pPPp.', '..pp..'], pal: { p: '#e8a07a', P: '#ffd6bd' } },
  bussola: { rows: ['.gggg.', 'gwwrwg', 'gwrwwg', 'gwwwwg', 'gwwwwg', '.gggg.'], pal: { g: '#c99a1c', w: '#fff4dc', r: '#d63c3c' } },
  ingresso: { rows: ['rrrrrr', 'r.rr.r', 'rwwwwr', 'r.rr.r', 'rrrrrr', '......'], pal: { r: '#e04f5f', w: '#fff4dc' } },
  medalha: { rows: ['.b..b.', '..bb..', '.yyyy.', 'yYYYYy', 'yYYYYy', '.yyyy.'], pal: { b: '#3d6bd6', y: '#a8780f', Y: '#f7d046' } },
  garrafa: { rows: ['..kk..', '..gg..', '.gggg.', '.gwwg.', '.gggg.', '.gggg.'], pal: { k: '#8a5a2b', g: '#4fae6b', w: '#fff4dc' } },
  relogio: { rows: ['..yy..', '.yyyy.', 'ywwwwy', 'ywkwwy', 'ywwkwy', '.yyyy.'], pal: { y: '#f7d046', w: '#fff4dc', k: '#222222' } },
  apito: { rows: ['......', 'sssss.', 'sSSSSs', 'sSkSSs', 'sssss.', '......'], pal: { s: '#8e9aa6', S: '#dfe6ec', k: '#222222' } },
  peixe: { rows: ['......', '.oo..o', 'oOOooo', 'oOkOoo', '.oo..o', '......'], pal: { o: '#e8742c', O: '#ffb067', k: '#222222' } },
};
