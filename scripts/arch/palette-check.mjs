// Section 7: the palette checks from the Meridian Palette Check page, so ARCHITECTURE.md's numbers re-run from the repo.
// Contrast: WCAG 2.2 relative luminance (text needs 4.5:1). Colour blindness: Machado, Oliveira and Fernandes (2009) matrices at
// full severity in linear RGB, then OKLab distance (0.10 or more: clear; 0.05 to 0.10: close; below 0.05: the same colour).
const N = { bg: '#f5f6f9', surface: '#ffffff', raised: '#eceff4', fg: '#141922', muted: '#4f5867', line: '#d5dae1', accent: '#2346c8', onAccent: '#ffffff',
  warnFg: '#6b4700', warnBg: '#fff1cc', dangerFg: '#9e1b24', dangerBg: '#fce6e8', okFg: '#17633a', okBg: '#e3f4ea' };
const D = { bg: '#0e1117', surface: '#161a22', raised: '#1f2430', fg: '#e7eaf0', muted: '#a0a8b6', line: '#2c3341', accent: '#8aa8ff', onAccent: '#0e1117',
  warnFg: '#f3ce73', warnBg: '#2d2410', dangerFg: '#ff9aa0', dangerBg: '#3a161a', okFg: '#79d6a0', okBg: '#13291d' };
export const PALETTES = {
  'blue-orange (chosen, D114)': { light: { ...N, bid: '#1d5bb5', ask: '#b04a00' }, dark: { ...D, bid: '#7faeff', ask: '#f0a262' } },
  'teal-magenta': { light: { ...N, bid: '#00775a', ask: '#c0175a' }, dark: { ...D, bid: '#4ed3a8', ask: '#ff7fae' } },
  'classic green-red': { light: { ...N, bid: '#1e9e3a', ask: '#d93025' }, dark: { ...D, bid: '#34c759', ask: '#ff453a' } },
};
const PAIRS = [['fg', 'surface'], ['fg', 'bg'], ['muted', 'surface'], ['accent', 'surface'], ['onAccent', 'accent'], ['bid', 'surface'], ['ask', 'surface'],
  ['warnFg', 'warnBg'], ['dangerFg', 'dangerBg'], ['okFg', 'okBg']];
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = (h) => { const [r, g, b] = hex(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const SIM = { normal: null,
  protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
  tritanopia: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]] };
const sim = (h, m) => { const c = hex(h).map(lin); return m ? m.map((r) => Math.min(1, Math.max(0, r[0] * c[0] + r[1] * c[1] + r[2] * c[2]))) : c; };
const oklab = ([r, g, b]) => { const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s]; };
const dist = (a, b, m) => { const p = oklab(sim(a, m)), q = oklab(sim(b, m)); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };
for (const [name, p] of Object.entries(PALETTES)) {
  const worst = (t) => Math.min(...PAIRS.map(([f, b]) => contrast(t[f], t[b])));
  const cvd = Object.entries(SIM).flatMap(([k, m]) => ['light', 'dark'].map((md) => [`${k}/${md}`, dist(p[md].bid, p[md].ask, m)]));
  const [wk, wv] = cvd.sort((a, b) => a[1] - b[1])[0];
  console.log(`${name}: lowest text contrast ${worst(p.light).toFixed(2)}:1 light, ${worst(p.dark).toFixed(2)}:1 dark; bid vs ask closest ${wv.toFixed(3)} (${wk})`);
}
