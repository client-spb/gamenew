'use strict';
/* ============================================================
   Общие помощники: математика, сглаживания, цвета, случайность
   ============================================================ */
const $ = id => document.getElementById(id);
const fmt = n => Math.floor(n).toLocaleString('ru-RU');
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const invLerp = (a, b, v) => clamp((v - a) / (b - a), 0, 1);
const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

const E = {
  lin: t => t,
  in: t => t * t,
  out: t => 1 - (1 - t) * (1 - t),
  io: t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  cubicIO: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  back: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  elastic: t => t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - .75) * (TAU / 3)) + 1,
  bounce: t => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + .75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + .9375;
    return n1 * (t -= 2.625 / d1) * t + .984375;
  }
};

/** прогресс 0..1 между t0 и t1 со сглаживанием */
function tw(t, t0, t1, ease) {
  if (t1 <= t0) return t >= t1 ? 1 : 0;
  const p = clamp((t - t0) / (t1 - t0), 0, 1);
  return ease ? ease(p) : p;
}
/** кусочная интерполяция по ключам [[t, v], ...] */
function keys(t, ks, ease) {
  if (t <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++) {
    if (t <= ks[i][0]) {
      const a = ks[i - 1], b = ks[i];
      const p = (t - a[0]) / (b[0] - a[0] || 1);
      const e = (b[2] || ease || E.io)(p);
      if (typeof a[1] === 'number') return lerp(a[1], b[1], e);
      const o = {};
      for (const k in b[1]) o[k] = lerp(a[1][k] !== undefined ? a[1][k] : b[1][k], b[1][k], e);
      return o;
    }
  }
  return ks[ks.length - 1][1];
}

/** детерминированный ГПСЧ (mulberry32) — фон рисуется одинаково при каждой перерисовке */
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
/** хеш-шум для детерминированных покачиваний */
function hash1(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
function noise1(x) {
  const i = Math.floor(x), f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash1(i), hash1(i + 1), u) * 2 - 1;
}

/* ---------- цвета ---------- */
function hexToRgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex(r, g, b) {
  return '#' + ((1 << 24) + (clamp(Math.round(r), 0, 255) << 16) + (clamp(Math.round(g), 0, 255) << 8) + clamp(Math.round(b), 0, 255)).toString(16).slice(1);
}
const _shadeCache = new Map();
/** осветлить (k>0) или затемнить (k<0) цвет */
function shade(hex, k) {
  const key = hex + k;
  let v = _shadeCache.get(key);
  if (v) return v;
  const [r, g, b] = hexToRgb(hex);
  v = k >= 0 ? rgbToHex(r + (255 - r) * k, g + (255 - g) * k, b + (255 - b) * k)
             : rgbToHex(r * (1 + k), g * (1 + k), b * (1 + k));
  _shadeCache.set(key, v);
  return v;
}
function mix(h1, h2, t) {
  const a = hexToRgb(h1), b = hexToRgb(h2);
  return rgbToHex(lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t));
}
function rgba(hex, a) { const c = hexToRgb(hex); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }

function fmtTime(s) {
  s = Math.max(0, Math.floor(s));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}
function pick(arr, r) { return arr[Math.floor((r === undefined ? Math.random() : r) * arr.length) % arr.length]; }
