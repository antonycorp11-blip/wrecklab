export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const rand = (a: number, b: number) => a + Math.random() * (b - a);

const SUFFIX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
export function fmt(n: number): string {
  if (!isFinite(n)) return '∞';
  const neg = n < 0;
  n = Math.abs(n);
  let s: string;
  if (n < 1000) s = n < 10 && n % 1 !== 0 ? n.toFixed(1) : Math.floor(n).toString();
  else {
    const e = Math.min(Math.floor(Math.log10(n) / 3), SUFFIX.length - 1);
    const v = n / Math.pow(1000, e);
    s = (v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : v.toFixed(0)) + SUFFIX[e];
    if (n >= 1e36) s = n.toExponential(2);
  }
  return (neg ? '-' : '') + s;
}

export function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Darken/lighten a #rrggbb or rgba() color. */
export function shade(color: string, amt: number): string {
  let r = 0, g = 0, b = 0, a = 1;
  if (color[0] === '#') {
    const h = color.length === 4 ? color.replace(/./g, (c, i) => (i ? c + c : c)) : color;
    r = parseInt(h.slice(1, 3), 16); g = parseInt(h.slice(3, 5), 16); b = parseInt(h.slice(5, 7), 16);
  } else {
    const m = color.match(/[\d.]+/g);
    if (m) { r = +m[0]; g = +m[1]; b = +m[2]; a = m[3] !== undefined ? +m[3] : 1; }
  }
  const f = (c: number) => Math.round(clamp(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt, 0, 255));
  return `rgba(${f(r)},${f(g)},${f(b)},${a})`;
}
