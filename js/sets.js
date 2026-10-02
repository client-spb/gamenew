'use strict';
/* ============================================================
   Декорации: двор панельки (кэшируется кусками), дальний город,
   небо со временем суток, общий план района на рассвете
   Мир двора: x 0..4400, y -120..1300; низ дома — y 880
   ============================================================ */
const WORLD = { w: 4400, top: -420, bottom: 1300, base: 880 };
const FLOOR_H = 360;
const WIN_COLS = [180, 420, 1060, 1300, 1540, 1780, 2020, 2240];
const GENA_WIN = { x: 1060, y: 520 - 270, w: 160, h: 190 };   // окно Гены, 2 этаж
const DOOR = { x: 630, y: 590, w: 140, h: 290 };
const BENCH = { x: 860, y: 1000, w: 290, seat: 62 };
const KIOSK = { x: 3800, y: 980 };
const CARPOS = { x: 2700, y: 1080 };

const COL = {
  panel: '#d9cdb4', panelD: '#b9ab90', panelL: '#e8dfca', seam: '#8f846f',
  plinth: '#8a8278', asphalt: '#6c6c70', asphaltL: '#7d7d82', curb: '#b8b4ac',
  frame: '#f4f2ea', frameOld: '#c8b48a', glass: '#4f6f8f',
  grass: '#6a9a3a', grassD: '#4a7a2a', door: '#4a5a4a', brick: '#a8553c', garage: '#7a8a8e',
};

/* ---------------- окна ---------------- */
function drawWindow(c, x, y, w, h, r, opts) {
  opts = opts || {};
  const plastic = opts.plastic !== undefined ? opts.plastic : r() > 0.45;
  const fr = plastic ? COL.frame : COL.frameOld;
  // откос
  D.rect(c, x - 6, y - 6, w + 12, h + 12, '#a89c84', null);
  D.rect(c, x, y, w, h, fr, GFX.OUT, 2.4);
  const gx = x + 8, gy = y + 8, gw = w - 16, gh = h - 16;
  // стекло с отражением неба
  D.rect(c, gx, gy, gw, gh, D.lg(c, gx, gy, gx + gw, gy + gh, [0, '#8fb2cc', 0.45, COL.glass, 1, '#2f4a66']), GFX.OUT, 1.6);
  if (!GFX.wire) {
    // занавески
    const cur = pick(['#e8a0a0', '#f2e6b0', '#a0c8e8', '#c8e0a0', '#f0f0f0', '#d8b0e0', '#f6c890'], r());
    const open = 0.25 + r() * 0.35;
    c.globalAlpha = 0.92;
    D.path(c, cc => { cc.moveTo(gx, gy); cc.lineTo(gx + gw * open, gy); cc.quadraticCurveTo(gx + gw * open * 0.6, gy + gh * 0.6, gx + gw * open * 0.9, gy + gh); cc.lineTo(gx, gy + gh); cc.closePath(); }, cur, null);
    D.path(c, cc => { cc.moveTo(gx + gw, gy); cc.lineTo(gx + gw * (1 - open * 0.8), gy); cc.quadraticCurveTo(gx + gw * (1 - open * 0.5), gy + gh * 0.6, gx + gw * (1 - open * 0.7), gy + gh); cc.lineTo(gx + gw, gy + gh); cc.closePath(); }, cur, null);
    c.globalAlpha = 1;
    if (r() > 0.5) { // тюль
      c.globalAlpha = 0.35; c.fillStyle = '#fff'; c.fillRect(gx + gw * open, gy, gw * (1 - open * 1.8), gh); c.globalAlpha = 1;
    }
    // блики
    D.line(c, gx + 6, gy + gh * 0.7, gx + gw * 0.4, gy + 6, 'rgba(255,255,255,.35)', 4);
    // цветы на подоконнике
    if (r() > 0.55) {
      const px = gx + gw * (0.25 + r() * 0.5);
      D.rect(c, px - 9, gy + gh - 14, 18, 14, '#b8603a', GFX.OUT, 1.2);
      for (let k = 0; k < 5; k++) D.ell(c, px - 8 + k * 4, gy + gh - 20 - (k % 2) * 6, 4, 7, (k - 2) * 0.3, '#4a9a3a', null);
      if (r() > 0.5) D.circ(c, px + 2, gy + gh - 30, 4, '#e83a5a', null);
    }
    // кот на подоконнике
    if (opts.cat) { D.ell(c, gx + gw * 0.7, gy + gh - 12, 16, 10, 0, '#3a3a3a', null); D.circ(c, gx + gw * 0.7 + 12, gy + gh - 22, 8, '#3a3a3a', null); D.poly(c, [gx + gw * 0.7 + 6, gy + gh - 26, gx + gw * 0.7 + 9, gy + gh - 34, gx + gw * 0.7 + 13, gy + gh - 28], '#3a3a3a', null); }
  }
  // переплёт
  if (plastic) {
    D.rect(c, gx + gw * 0.5 - 3, gy, 6, gh, fr, GFX.OUT, 1.4);
  } else {
    D.rect(c, gx + gw * 0.5 - 4, gy, 8, gh, fr, GFX.OUT, 1.4);
    D.rect(c, gx, gy + gh * 0.3 - 3, gw, 6, fr, GFX.OUT, 1.4);
    D.rect(c, gx + 6, gy + 6, gw * 0.22, gh * 0.18, fr, GFX.OUT, 1.2); // форточка
  }
  // отлив и подоконник
  D.rect(c, x - 10, y + h, w + 20, 8, '#cfcfcf', GFX.OUT, 1.6);
  if (!GFX.wire) {
    // потёки под окном
    c.globalAlpha = 0.18;
    for (let k = 0; k < 3; k++) { const sx = x + 10 + r() * (w - 20); c.fillStyle = '#5a5040'; c.fillRect(sx, y + h + 8, 3 + r() * 4, 30 + r() * 70); }
    c.globalAlpha = 1;
  }
  if (opts.bars) drawBars(c, x - 4, y - 4, w + 8, h + 8);
  if (opts.ac) drawAC(c, x + w + 16, y + h * 0.35);
}
function drawBars(c, x, y, w, h) {
  const col = '#3a3a40';
  c.save();
  D.rect(c, x, y, w, h, null, col, 3);
  for (let k = 1; k < 5; k++) D.line(c, x + w * k / 5, y, x + w * k / 5, y + h, col, 3);
  // «солнышко» снизу — классика решёток
  const cx = x + w / 2, cy = y + h;
  c.beginPath(); c.arc(cx, cy, w * 0.3, Math.PI, TAU);
  c.strokeStyle = GFX.wire ? GFX.wireCol : col; c.lineWidth = GFX.wire ? 1 : 3; c.stroke();
  for (let k = 1; k < 6; k++) { const a = Math.PI + k * Math.PI / 6; D.line(c, cx, cy, cx + Math.cos(a) * w * 0.48, cy + Math.sin(a) * w * 0.48, col, 2.4); }
  c.restore();
}
function drawAC(c, x, y) {
  D.rect(c, x, y, 70, 46, D.lg(c, x, y, x, y + 46, [0, '#f6f6f2', 1, '#c8c8c2']), GFX.OUT, 2, 4);
  D.circ(c, x + 24, y + 23, 16, '#9a9a96', GFX.OUT, 1.4);
  if (!GFX.wire) for (let k = 0; k < 5; k++) D.line(c, x + 46, y + 8 + k * 7, x + 64, y + 8 + k * 7, '#9a9a96', 1.6);
  if (!GFX.wire) { c.globalAlpha = 0.25; c.fillStyle = '#5a5040'; c.fillRect(x + 30, y + 46, 4, 60); c.globalAlpha = 1; }
}

/* ---------------- балконы ---------------- */
function drawBalcony(c, x, y, w, r, kind) {
  // плита
  D.rect(c, x - 20, y, w + 40, 16, D.lg(c, 0, y, 0, y + 16, [0, '#c8c0b0', 1, '#8a8274']), GFX.OUT, 2.2);
  if (kind === 'glazed') {
    D.rect(c, x - 18, y - 120, w + 36, 120, '#c8c0a8', GFX.OUT, 2.2);
    for (let k = 0; k < 4; k++) {
      const wx = x - 14 + k * (w + 28) / 4;
      D.rect(c, wx, y - 112, (w + 28) / 4 - 6, 70, k === 2 ? '#7a9ab4' : D.lg(c, wx, y - 112, wx, y - 42, [0, '#9cc0d8', 1, '#4f6f8f']), GFX.OUT, 1.6);
    }
    if (!GFX.wire) {
      D.rect(c, x - 18, y - 40, w + 36, 40, '#a8783a', GFX.OUT, 1.6);
      for (let k = 0; k < 8; k++) D.line(c, x - 14 + k * (w + 30) / 8, y - 40, x - 14 + k * (w + 30) / 8, y, '#8a5a24', 1.4);
      // банки на подоконнике
      for (let k = 0; k < 3; k++) { D.rect(c, x + 6 + k * 16, y - 58, 12, 16, 'rgba(200,230,200,.8)', GFX.OUT, 1); D.rect(c, x + 6 + k * 16, y - 50, 12, 8, k % 2 ? '#c84a3a' : '#e8a030', null); }
    }
  } else {
    // решётка-ограждение
    D.rect(c, x - 18, y - 70, w + 36, 70, null, '#5a5a62', 3);
    for (let k = 0; k <= 14; k++) D.line(c, x - 18 + k * (w + 36) / 14, y - 70, x - 18 + k * (w + 36) / 14, y, '#5a5a62', 2);
    if (!GFX.wire) {
      // бельё на верёвке
      const lineY = y - 110;
      D.curve(c, x - 18, lineY, x + w / 2, lineY + 14, x + w + 18, lineY, '#ddd', 1.4);
      const items = [['#f6f6f6', 'shirt'], ['#3a6ab8', 'pants'], ['#e84a4a', 'sock'], ['#f2e66a', 'shorts'], ['#fff', 'sock']];
      let px = x - 6;
      for (let k = 0; k < 4; k++) {
        const it = items[Math.floor(r() * items.length)];
        const yy = lineY + 6 + Math.sin((px - x) / w * Math.PI) * 8;
        if (it[1] === 'shirt') D.poly(c, [px, yy, px + 34, yy, px + 40, yy + 12, px + 32, yy + 14, px + 32, yy + 46, px + 2, yy + 46, px + 2, yy + 14, px - 6, yy + 12], it[0], GFX.OUT, 1.4);
        else if (it[1] === 'pants') D.poly(c, [px, yy, px + 26, yy, px + 28, yy + 60, px + 16, yy + 60, px + 13, yy + 18, px + 10, yy + 60, px - 2, yy + 60], it[0], GFX.OUT, 1.4);
        else if (it[1] === 'shorts') D.poly(c, [px, yy, px + 28, yy, px + 30, yy + 24, px + 16, yy + 24, px + 14, yy + 12, px + 12, yy + 24, px - 2, yy + 24], it[0], GFX.OUT, 1.4);
        else D.poly(c, [px, yy, px + 9, yy, px + 9, yy + 22, px + 18, yy + 30, px + 14, yy + 34, px, yy + 26], it[0], GFX.OUT, 1.2);
        px += 42 + r() * 8;
        if (px > x + w - 10) break;
      }
      // лыжи, тазик
      if (r() > 0.4) { D.line(c, x + w + 4, y - 4, x + w - 18, y - 150, '#c8382a', 5); D.line(c, x + w + 12, y - 4, x + w - 8, y - 150, '#c8382a', 5); }
      if (r() > 0.5) D.ell(c, x + 20, y - 76, 26, 8, 0, '#6aa0c8', GFX.OUT, 1.4);
    }
    if (kind === 'dish') {
      D.ell(c, x + w - 10, y - 90, 26, 30, -0.4, D.lg(c, 0, y - 120, 0, y - 60, [0, '#f2f2f2', 1, '#b8b8b8']), GFX.OUT, 2);
      D.line(c, x + w - 10, y - 90, x + w + 14, y - 104, '#666', 2.4);
    }
  }
}

/* ---------------- дом ---------------- */
function drawBuilding(c, x0, x1) {
  const bx0 = 0, bx1 = 2330, base = WORLD.base, top = WORLD.top;
  if (x1 < bx0 || x0 > bx1) return;
  // стена из панелей
  const r = rng(1001);
  for (let px = bx0; px < bx1; px += 240) {
    for (let fl = 0; fl < 4; fl++) {
      const py = base - (fl + 1) * FLOOR_H;
      if (py + FLOOR_H < top) continue;
      const tint = (r() - 0.5) * 0.08;
      D.rect(c, px, py, 240, FLOOR_H, shade(COL.panel, tint), null);
      if (!GFX.wire) {
        // фактура бетона
        c.globalAlpha = 0.07;
        for (let k = 0; k < 40; k++) { c.fillStyle = r() > 0.5 ? '#fff' : '#5a5040'; c.fillRect(px + r() * 236, py + r() * 356, 1 + r() * 4, 1 + r() * 4); }
        c.globalAlpha = 1;
        // заплатки ремонта швов
        if (r() > 0.75) D.rect(c, px + r() * 160, py + r() * 280, 40 + r() * 40, 20 + r() * 40, shade(COL.panel, -0.12), null);
      }
    }
  }
  // швы
  if (!GFX.wire) {
    for (let px = bx0; px <= bx1; px += 240) { D.line(c, px, top, px, base, COL.seam, 3); D.line(c, px + 3, top, px + 3, base, 'rgba(255,255,255,.25)', 1); }
    for (let fl = 0; fl <= 4; fl++) { const y = Math.max(top, base - fl * FLOOR_H); D.line(c, bx0, y, bx1, y, COL.seam, 3); D.line(c, bx0, y + 3, bx1, y + 3, 'rgba(255,255,255,.25)', 1); }
  } else {
    for (let px = bx0; px <= bx1; px += 240) D.line(c, px, top, px, base);
    for (let fl = 0; fl <= 4; fl++) D.line(c, bx0, base - fl * FLOOR_H, bx1, base - fl * FLOOR_H);
  }
  // окна
  const rw = rng(2024);
  const balc2 = { 1300: 'rail', 1780: 'glazed', 2240: 'rail' };
  const balc3 = { 420: 'glazed', 1540: 'dish', 2020: 'rail', 180: 'rail' };
  for (let fl = 0; fl < 4; fl++) {
    const wy = base - fl * FLOOR_H - 300;
    if (wy + 190 < top) continue;
    for (const cx of WIN_COLS) {
      if (cx + 120 < x0 || cx - 120 > x1) { rw(); rw(); rw(); rw(); rw(); rw(); continue; }
      if (fl === 1 && cx === GENA_WIN.x) {
        // окно Гены: отдельная рама рисуется вживую, здесь только откос и тёмный проём
        D.rect(c, GENA_WIN.x - 86, GENA_WIN.y - 6, 172, GENA_WIN.h + 12, '#a89c84', null);
        D.rect(c, GENA_WIN.x - 80, GENA_WIN.y, 160, GENA_WIN.h, '#2a3442', GFX.OUT, 2.4);
        if (!GFX.wire) {
          // ковёр на стене в глубине комнаты — святое
          D.rect(c, GENA_WIN.x - 70, GENA_WIN.y + 14, 140, 120, '#8a1c22', null);
          const rr = rng(5);
          for (let k = 0; k < 18; k++) D.poly(c, [GENA_WIN.x - 60 + (k % 6) * 24, GENA_WIN.y + 30 + Math.floor(k / 6) * 34, GENA_WIN.x - 50 + (k % 6) * 24, GENA_WIN.y + 20 + Math.floor(k / 6) * 34, GENA_WIN.x - 40 + (k % 6) * 24, GENA_WIN.y + 30 + Math.floor(k / 6) * 34, GENA_WIN.x - 50 + (k % 6) * 24, GENA_WIN.y + 40 + Math.floor(k / 6) * 34], rr() > 0.5 ? '#e8b030' : '#2a5a8a', null);
          c.globalAlpha = 0.45; c.fillStyle = '#0a0f18'; c.fillRect(GENA_WIN.x - 80, GENA_WIN.y, 160, GENA_WIN.h); c.globalAlpha = 1;
        }
        D.rect(c, GENA_WIN.x - 90, GENA_WIN.y + GENA_WIN.h, 180, 9, '#cfcfcf', GFX.OUT, 1.6);
        continue;
      }
      drawWindow(c, cx - 80, wy, 160, 190, rw, { bars: fl === 0, ac: fl > 0 && rw() > 0.8, cat: fl === 0 && cx === 1540 });
      const bk = fl === 1 ? balc2[cx] : fl === 2 ? balc3[cx] : null;
      if (bk) drawBalcony(c, cx - 80, wy + 200, 160, rw, bk);
    }
    // окна лестницы над подъездом — между этажами
    if (DOOR.x + 200 > x0 && DOOR.x - 100 < x1) {
      const sy = base - fl * FLOOR_H - 140 - FLOOR_H * 0.5;
      if (fl < 3 && sy > top) drawWindow(c, DOOR.x + 10, sy, 120, 110, rw, { plastic: false });
    }
  }
  // цоколь
  D.rect(c, bx0, base - 60, bx1 - bx0, 60, D.lg(c, 0, base - 60, 0, base, [0, '#9a9288', 1, '#6e665e']), GFX.OUT, 2);
  if (!GFX.wire) {
    for (let px = bx0; px < bx1; px += 40) D.line(c, px, base - 60, px, base, 'rgba(0,0,0,.18)', 1);
    // продухи подвала
    for (const vx of [120, 300, 980, 1220, 1460, 1700, 1940, 2180]) {
      D.rect(c, vx, base - 44, 34, 26, '#1a1a1e', GFX.OUT, 1.6);
      if (vx === 1220) { D.circ(c, vx + 11, base - 32, 2.4, '#e8f04a', null); D.circ(c, vx + 21, base - 32, 2.4, '#e8f04a', null); }
    }
  }
  // граффити
  if (!GFX.wire) {
    c.save(); c.translate(250, base - 120); c.rotate(-0.06);
    D.text(c, 'ЦОЙ ЖИВ', 0, 0, 44, '#2a3a8a', 'center', '700 44px ', null);
    c.restore();
    c.save(); c.translate(1720, base - 110); c.rotate(0.04);
    D.text(c, 'СПАРТАК', 0, 0, 34, '#c8302a', 'center', '700 34px ', null);
    D.text(c, 'ЧЕМПИОН', 10, 34, 26, '#c8302a', 'center', '700 26px ', null);
    c.restore();
    c.save(); c.translate(2120, base - 160); c.rotate(-0.1);
    D.text(c, 'ВОВАН + ЛЕНКА', 0, 0, 24, '#1a1a1a', 'center', '700 24px ', null);
    c.restore();
  }
  // подъезд
  drawPodyezd(c);
  // табличка с номером дома
  D.rect(c, 2140, 520 - 150, 120, 60, '#1f4f98', GFX.OUT, 2, 4);
  D.text(c, 'ул. Мира, 13', 2200, 520 - 132, 16, '#fff', 'center', '700 16px ');
  D.text(c, 'под. 3', 2200, 520 - 110, 14, '#fff', 'center', '700 14px ');
  // торец дома
  D.rect(c, bx1, top, 40, base - top, D.lg(c, bx1, 0, bx1 + 40, 0, [0, '#a89c84', 1, '#8a7e68']), GFX.OUT, 2.4);
}

function drawPodyezd(c) {
  const d = DOOR;
  // козырёк
  D.rect(c, d.x - 60, d.y - 40, d.w + 120, 24, D.lg(c, 0, d.y - 40, 0, d.y - 16, [0, '#b8b0a0', 1, '#7a7264']), GFX.OUT, 2.4);
  if (!GFX.wire) { c.globalAlpha = 0.5; for (let k = 0; k < 5; k++) { c.fillStyle = '#4a7a2a'; c.fillRect(d.x - 50 + k * 50, d.y - 46, 16, 8); } c.globalAlpha = 1; }
  // фонарь
  D.rect(c, d.x + d.w / 2 - 14, d.y - 16, 28, 14, '#2a2a2e', GFX.OUT, 1.4);
  D.ell(c, d.x + d.w / 2, d.y - 2, 12, 8, 0, '#f2e6b0', GFX.OUT, 1.4);
  // дверной проём
  D.rect(c, d.x - 14, d.y - 10, d.w + 28, d.h + 10, '#5a5a56', GFX.OUT, 2.2);
  // железная дверь
  D.rect(c, d.x, d.y, d.w, d.h, D.lg(c, d.x, 0, d.x + d.w, 0, [0, '#5a6a5a', 0.5, COL.door, 1, '#2e3a2e']), GFX.OUT, 2.6);
  if (!GFX.wire) {
    D.rect(c, d.x + 12, d.y + 16, d.w - 24, d.h * 0.4, null, '#2e3a2e', 2);
    D.rect(c, d.x + 12, d.y + d.h * 0.52, d.w - 24, d.h * 0.4, null, '#2e3a2e', 2);
    for (let k = 0; k < 6; k++) D.circ(c, d.x + 8, d.y + 20 + k * 48, 2.4, '#8a9a8a', null);
    // ручка и домофон
    D.rect(c, d.x + d.w - 26, d.y + d.h * 0.48, 12, 34, '#bcbcbc', GFX.OUT, 1.4, 4);
    D.rect(c, d.x + d.w + 20, d.y + 110, 34, 56, D.lg(c, 0, d.y + 110, 0, d.y + 166, [0, '#4a4a52', 1, '#1a1a22']), GFX.OUT, 1.6, 3);
    for (let k = 0; k < 9; k++) D.circ(c, d.x + d.w + 28 + (k % 3) * 9, d.y + 132 + Math.floor(k / 3) * 9, 2.4, '#c8c8c8', null);
    D.rect(c, d.x + d.w + 26, d.y + 116, 22, 9, '#5aff8a', null);
    // объявления
    const ads = [['Ремонт', 'холодильников'], ['Отдам', 'котят'], ['Куплю', 'гараж'], ['ДОЛГИ', 'за свет!']];
    const r = rng(77);
    ads.forEach((a, i) => {
      const ax = d.x + 18 + (i % 2) * 56, ay = d.y + 30 + Math.floor(i / 2) * 64;
      c.save(); c.translate(ax + 24, ay + 24); c.rotate((r() - 0.5) * 0.2);
      D.rect(c, -24, -26, 48, 54, i === 3 ? '#ffe36a' : '#f6f2e6', null);
      D.text(c, a[0], 0, -14, 9, '#1a2a4a', 'center', '700 9px ');
      D.text(c, a[1], 0, -3, 7, '#1a2a4a', 'center', '700 7px ');
      for (let k = 0; k < 6; k++) D.line(c, -22 + k * 8, 16, -22 + k * 8, 28, '#aaa', 0.8);
      c.restore();
    });
    // ступени
    D.rect(c, d.x - 40, WORLD.base, d.w + 80, 18, '#a8a49c', GFX.OUT, 2);
    D.rect(c, d.x - 56, WORLD.base + 18, d.w + 112, 18, '#9a968e', GFX.OUT, 2);
    // табличка квартир
    D.rect(c, d.x + 24, d.y - 70, 92, 24, '#1f4f98', GFX.OUT, 1.6, 3);
    D.text(c, 'кв. 37 – 54', d.x + 70, d.y - 58, 13, '#fff', 'center', '700 13px ');
  }
}

/* ---------------- земля, двор ---------------- */
function drawGround(c, x0, x1) {
  const base = WORLD.base;
  // отмостка
  D.rect(c, 0, base, WORLD.w, 30, D.lg(c, 0, base, 0, base + 30, [0, '#a8a49a', 1, '#8a867c']), null);
  // асфальт
  D.rect(c, 0, base + 30, WORLD.w, WORLD.bottom - base - 30, D.lg(c, 0, base + 30, 0, WORLD.bottom, [0, '#76767a', 0.6, COL.asphalt, 1, '#555558']), null);
  if (GFX.wire) {
    for (let x = 0; x <= WORLD.w; x += 200) D.line(c, x, base + 30, x + (x - 2200) * 0.15, WORLD.bottom);
    for (let y = base + 30; y <= WORLD.bottom; y += 60) D.line(c, 0, y, WORLD.w, y);
    return;
  }
  const r = rng(555);
  // крошка асфальта
  c.globalAlpha = 0.16;
  for (let k = 0; k < 2600; k++) {
    const x = r() * WORLD.w; if (x < x0 - 10 || x > x1 + 10) { r(); r(); continue; }
    c.fillStyle = r() > 0.5 ? '#e8e8e8' : '#2a2a2e';
    c.fillRect(x, base + 30 + r() * (WORLD.bottom - base - 30), 2, 2);
  }
  c.globalAlpha = 1;
  // заплатки и трещины
  for (let k = 0; k < 16; k++) {
    const x = r() * WORLD.w, y = base + 60 + r() * 330, w = 60 + r() * 160, h = 20 + r() * 40;
    D.blob(c, [x, y, x + w * 0.5, y - h * 0.3, x + w, y, x + w * 0.8, y + h, x + w * 0.2, y + h * 0.8], 'rgba(40,40,44,.35)', null);
  }
  for (let k = 0; k < 26; k++) {
    let x = r() * WORLD.w, y = base + 50 + r() * 360;
    c.beginPath(); c.moveTo(x, y);
    for (let s = 0; s < 5; s++) { x += 10 + r() * 30; y += (r() - 0.5) * 24; c.lineTo(x, y); }
    c.strokeStyle = 'rgba(30,30,34,.55)'; c.lineWidth = 1.6; c.stroke();
  }
  // бордюр дороги
  D.rect(c, 0, 1118, WORLD.w, 14, D.lg(c, 0, 1118, 0, 1132, [0, '#d8d4cc', 1, '#a8a49c']), GFX.OUT, 1.6);
  for (let x = 0; x < WORLD.w; x += 90) D.line(c, x, 1118, x, 1132, '#8a867e', 1.4);
  // лужа
  D.blob(c, [2180, 1098, 2260, 1088, 2380, 1092, 2420, 1104, 2340, 1112, 2220, 1110], D.lg(c, 0, 1088, 0, 1112, [0, '#8fb2d4', 1, '#5a7a9a']), null);
  D.line(c, 2230, 1096, 2290, 1094, 'rgba(255,255,255,.6)', 2);
  // разметка «парковка» и окурки, крышки
  for (let k = 0; k < 40; k++) {
    const x = r() * WORLD.w, y = base + 40 + r() * 300;
    if (k % 3 === 0) D.circ(c, x, y, 2.4, '#c8a020', null);
    else { D.line(c, x, y, x + 6, y + 1, '#f2efe6', 2); D.line(c, x + 6, y + 1, x + 8, y + 1.4, '#d8903a', 2); }
  }
  // газон спереди
  D.rect(c, 0, 1132, WORLD.w, WORLD.bottom - 1132, D.lg(c, 0, 1132, 0, WORLD.bottom, [0, '#5a8a32', 1, '#3e6a22']), null);
  for (let k = 0; k < 900; k++) {
    const x = r() * WORLD.w; if (x < x0 - 10 || x > x1 + 10) { r(); r(); continue; }
    const y = 1136 + r() * 160, h = 6 + r() * 14;
    D.line(c, x, y, x + (r() - 0.5) * 6, y - h, r() > 0.5 ? '#7aaa42' : '#4a7a2a', 1.6);
  }
  for (let k = 0; k < 60; k++) {
    const x = r() * WORLD.w, y = 1150 + r() * 140;
    if (k % 4 === 0) { D.circ(c, x, y, 5, '#ffe14a', null); D.circ(c, x, y, 2, '#e8a020', null); }
    else if (k % 4 === 1) { D.circ(c, x, y, 5, '#fff', null); D.circ(c, x, y, 1.6, '#ffe14a', null); }
  }
}

/* ---------------- лавочка ---------------- */
function drawBench(c, x, y, w) {
  const seatY = y - BENCH.seat;
  // бетонные ножки
  for (const lx of [x + 20, x + w - 50]) {
    D.poly(c, [lx, y, lx + 30, y, lx + 26, seatY, lx + 4, seatY], D.lg(c, lx, 0, lx + 30, 0, [0, '#b8b4ac', 1, '#8a867e']), GFX.OUT, 2);
    D.poly(c, [lx + 2, seatY - 70, lx + 10, seatY - 70, lx + 14, seatY, lx + 6, seatY], '#9a968e', GFX.OUT, 1.8);
  }
  // спинка и сиденье — зелёные рейки
  for (let k = 0; k < 3; k++) D.rect(c, x - 6, seatY - 72 + k * 20, w + 12, 13, D.lg(c, 0, seatY - 72 + k * 20, 0, seatY - 59 + k * 20, [0, '#4caa5a', 1, '#2a7a3a']), GFX.OUT, 1.8, 2);
  for (let k = 0; k < 2; k++) D.rect(c, x - 10, seatY - 4 + k * 10, w + 20, 10, D.lg(c, 0, seatY - 4 + k * 10, 0, seatY + 6 + k * 10, [0, '#56b864', 1, '#2a7a3a']), GFX.OUT, 1.8, 2);
  if (!GFX.wire) {
    // облупленная краска и надписи
    const r = rng(31);
    for (let k = 0; k < 14; k++) D.rect(c, x + r() * w, seatY - 70 + r() * 70, 6 + r() * 10, 3 + r() * 4, '#8a6a4a', null);
    D.text(c, 'ДИМОН', x + w * 0.6, seatY - 44, 10, '#1a3a1a', 'center', '700 10px ');
  }
  // урна
  const ux = x + w + 30;
  D.poly(c, [ux, y, ux + 40, y, ux + 46, y - 56, ux - 6, y - 56], D.lg(c, ux, 0, ux + 40, 0, [0, '#b8b4ac', 1, '#7a766e']), GFX.OUT, 2);
  D.ell(c, ux + 20, y - 56, 26, 6, 0, '#4a4a4a', GFX.OUT, 1.6);
  if (!GFX.wire) { D.rect(c, ux + 8, y - 66, 10, 12, '#f2efe6', null); D.circ(c, ux + 28, y - 62, 5, '#c84a2a', null); }
}

/* ---------------- клумба с лебедями из шин ---------------- */
function drawFlowerbed(c, x, y) {
  const cols = ['#f2f2f2', '#3a7ad8', '#e84a3a', '#f2d03a', '#f2f2f2', '#3a7ad8'];
  // земля
  D.ell(c, x + 110, y - 6, 120, 22, 0, '#5a3a24', GFX.OUT, 2);
  // полузакопанные шины по краю
  for (let k = 0; k < 9; k++) {
    const tx = x + k * 26;
    D.path(c, cc => { cc.arc(tx, y + 6, 15, Math.PI, TAU); cc.lineTo(tx + 8, y + 6); cc.arc(tx, y + 6, 8, 0, Math.PI, true); cc.closePath(); }, cols[k % cols.length], GFX.OUT, 1.8);
  }
  // цветы-бархатцы
  const r = rng(91);
  for (let k = 0; k < 16; k++) {
    const fx = x + 20 + r() * 180, fy = y - 10 - r() * 18;
    D.line(c, fx, fy + 12, fx, fy, '#3a7a2a', 2);
    D.circ(c, fx, fy, 5, r() > 0.5 ? '#ff9a1a' : '#ffd21a', GFX.OUT, 1);
  }
  // лебедь из шины
  const sx = x + 70, sy = y - 10;
  D.path(c, cc => { cc.moveTo(sx - 40, sy); cc.quadraticCurveTo(sx - 46, sy - 30, sx - 10, sy - 32); cc.lineTo(sx + 30, sy - 30); cc.quadraticCurveTo(sx + 50, sy - 20, sx + 40, sy); cc.closePath(); }, '#f6f6f2', GFX.OUT, 2.2);
  D.path(c, cc => { cc.moveTo(sx + 22, sy - 28); cc.quadraticCurveTo(sx + 16, sy - 70, sx + 34, sy - 86); cc.quadraticCurveTo(sx + 52, sy - 92, sx + 54, sy - 76); cc.lineTo(sx + 40, sy - 74); cc.quadraticCurveTo(sx + 30, sy - 60, sx + 36, sy - 30); cc.closePath(); }, '#f6f6f2', GFX.OUT, 2.2);
  D.poly(c, [sx + 54, sy - 80, sx + 70, sy - 76, sx + 54, sy - 72], '#e8402a', GFX.OUT, 1.6);
  D.circ(c, sx + 44, sy - 80, 2.4, '#111', null);
  if (!GFX.wire) for (let k = 0; k < 5; k++) D.curve(c, sx - 34 + k * 14, sy - 26, sx - 30 + k * 14, sy - 14, sx - 34 + k * 14, sy - 4, '#c8c8c2', 1.4);
}

/* ---------------- детская площадка ---------------- */
function drawPlayground(c) {
  const g = 1000;
  // горка-ракета
  const rx = 1650;
  for (const lx of [rx - 50, rx + 50]) D.line(c, lx, g, lx, g - 250, '#3a6ab8', 6);
  for (let k = 0; k < 7; k++) D.line(c, rx - 50, g - 30 - k * 32, rx + 50, g - 30 - k * 32, '#e8c03a', 4);
  D.path(c, cc => { cc.moveTo(rx - 60, g - 250); cc.quadraticCurveTo(rx, g - 380, rx + 60, g - 250); cc.closePath(); }, D.lg(c, rx - 60, 0, rx + 60, 0, [0, '#e84a3a', 0.5, '#ff7a5a', 1, '#a82a1a']), GFX.OUT, 2.6);
  D.rect(c, rx - 62, g - 262, 124, 14, '#f2f2f2', GFX.OUT, 2);
  D.circ(c, rx, g - 300, 14, '#8fd0f0', GFX.OUT, 2.4);
  D.line(c, rx, g - 380, rx, g - 410, '#c8c8c8', 3);
  D.circ(c, rx, g - 414, 5, '#ffd23a', GFX.OUT, 1.4);
  // скат
  D.path(c, cc => { cc.moveTo(rx + 50, g - 160); cc.quadraticCurveTo(rx + 120, g - 120, rx + 170, g - 4); cc.lineTo(rx + 190, g - 4); cc.quadraticCurveTo(rx + 140, g - 136, rx + 54, g - 182); cc.closePath(); }, D.lg(c, rx, g - 180, rx + 190, g, [0, '#e8e8f0', 1, '#a8a8b8']), GFX.OUT, 2.2);
  // качели
  const kx = 1950;
  D.line(c, kx - 90, g, kx - 60, g - 230, '#3a8a4a', 7);
  D.line(c, kx - 30, g, kx - 60, g - 230, '#3a8a4a', 7);
  D.line(c, kx + 90, g, kx + 60, g - 230, '#3a8a4a', 7);
  D.line(c, kx + 30, g, kx + 60, g - 230, '#3a8a4a', 7);
  D.line(c, kx - 66, g - 228, kx + 66, g - 228, '#2a6a3a', 8);
  // ковровыбивалка с ковром
  const bx = 2200;
  D.line(c, bx - 70, g, bx - 70, g - 200, '#5a5a62', 6);
  D.line(c, bx + 70, g, bx + 70, g - 200, '#5a5a62', 6);
  D.line(c, bx - 74, g - 196, bx + 74, g - 196, '#5a5a62', 6);
  D.path(c, cc => { cc.moveTo(bx - 60, g - 196); cc.lineTo(bx + 60, g - 196); cc.lineTo(bx + 56, g - 70); cc.lineTo(bx - 58, g - 76); cc.closePath(); }, '#9a1c24', GFX.OUT, 2);
  if (!GFX.wire) {
    D.rect(c, bx - 50, g - 186, 100, 104, null, '#e8b030', 3);
    for (let k = 0; k < 6; k++) D.poly(c, [bx - 30 + (k % 3) * 30, g - 160 + Math.floor(k / 3) * 44, bx - 20 + (k % 3) * 30, g - 172 + Math.floor(k / 3) * 44, bx - 10 + (k % 3) * 30, g - 160 + Math.floor(k / 3) * 44, bx - 20 + (k % 3) * 30, g - 148 + Math.floor(k / 3) * 44], k % 2 ? '#2a5a8a' : '#e8b030', null);
    for (let k = 0; k < 10; k++) D.line(c, bx - 58 + k * 12, g - 76, bx - 58 + k * 12, g - 66, '#e8d8a0', 2);
  }
}

/* ---------------- мусорка ---------------- */
function drawTrash(c) {
  const g = 990, x = 40;
  D.poly(c, [x, g, x + 150, g, x + 160, g - 110, x - 10, g - 110], D.lg(c, x, 0, x + 150, 0, [0, '#3a7a4a', 1, '#2a5a34']), GFX.OUT, 2.4);
  D.poly(c, [x - 14, g - 110, x + 164, g - 110, x + 150, g - 128, x, g - 128], '#2e6a3c', GFX.OUT, 2.2);
  if (!GFX.wire) {
    D.text(c, 'ЖКХ', x + 75, g - 60, 22, '#e8e8d0', 'center', '700 22px ');
    D.circ(c, x + 20, g + 2, 8, '#222', null); D.circ(c, x + 130, g + 2, 8, '#222', null);
    // пакеты
    D.blob(c, [x + 170, g, x + 176, g - 40, x + 210, g - 46, x + 230, g - 10, x + 214, g], '#1a1a1e', GFX.OUT, 1.6);
    D.blob(c, [x + 220, g + 4, x + 230, g - 26, x + 258, g - 30, x + 272, g], '#4a6ab8', GFX.OUT, 1.6);
    // сломанный стул
    D.rect(c, x - 60, g - 60, 46, 8, '#8a5a2a', GFX.OUT, 1.6);
    D.line(c, x - 56, g - 52, x - 60, g, '#6a4a1a', 4); D.line(c, x - 20, g - 52, x - 10, g - 20, '#6a4a1a', 4);
    D.line(c, x - 56, g - 60, x - 58, g - 120, '#6a4a1a', 4);
  }
}

/* ---------------- фонарный столб ---------------- */
function drawLamp(c, x) {
  const g = 1000;
  D.poly(c, [x - 9, g, x + 9, g, x + 6, g - 420, x - 6, g - 420], D.lg(c, x - 9, 0, x + 9, 0, [0, '#b8b4ac', 1, '#7a766e']), GFX.OUT, 2);
  D.path(c, cc => { cc.moveTo(x, g - 410); cc.quadraticCurveTo(x + 10, g - 470, x + 70, g - 460); }, null, '#6a6a6e', 6);
  D.path(c, cc => { cc.moveTo(x + 52, g - 466); cc.lineTo(x + 96, g - 462); cc.lineTo(x + 88, g - 448); cc.lineTo(x + 58, g - 450); cc.closePath(); }, '#4a4a4e', GFX.OUT, 1.8);
  D.ell(c, x + 74, g - 447, 14, 4, 0, '#f2e6b0', GFX.OUT, 1.2);
  if (!GFX.wire) { // объявления на столбе
    D.rect(c, x - 8, g - 200, 16, 30, '#f6f2e6', null);
    D.rect(c, x - 7, g - 160, 14, 22, '#ffe36a', null);
  }
}

/* ---------------- деревья ---------------- */
function drawBirch(c, x, g, h, seed) {
  const r = rng(seed);
  D.poly(c, [x - 12, g, x + 12, g, x + 6, g - h, x - 4, g - h], D.lg(c, x - 12, 0, x + 12, 0, [0, '#f2f0ea', 1, '#c8c4bc']), GFX.OUT, 2);
  if (!GFX.wire) for (let k = 0; k < 12; k++) { const y = g - 20 - r() * (h - 30); D.rect(c, x - 10 + r() * 8, y, 6 + r() * 8, 3, '#2a2a2a', null); }
  for (let k = 0; k < 7; k++) {
    const by = g - h * (0.45 + k * 0.08), dir = k % 2 ? 1 : -1;
    D.line(c, x, by, x + dir * (40 + r() * 40), by - 40 - r() * 30, '#5a5048', 3);
  }
  const blobs = [];
  for (let k = 0; k < 9; k++) blobs.push([x + (r() - 0.5) * 160, g - h * 0.55 - r() * h * 0.55, 40 + r() * 34]);
  for (const b of blobs) D.circ(c, b[0], b[1], b[2], D.rg(c, b[0] - 10, b[1] - 10, 4, b[2], [0, '#9acc5a', 1, '#5a8a2a']), GFX.wire ? GFX.OUT : null);
  if (!GFX.wire) for (let k = 0; k < 40; k++) { const b = blobs[k % blobs.length]; D.circ(c, b[0] + (r() - 0.5) * b[2], b[1] + (r() - 0.5) * b[2], 4, r() > 0.5 ? '#b8e07a' : '#4a7a22', null); }
}
function drawPoplar(c, x, g, h, seed) {
  const r = rng(seed);
  D.poly(c, [x - 10, g, x + 10, g, x + 4, g - h * 0.5, x - 4, g - h * 0.5], '#6a5a4a', GFX.OUT, 2);
  D.ell(c, x, g - h * 0.62, 60, h * 0.42, 0, D.lg(c, 0, g - h, 0, g - h * 0.2, [0, '#7aaa4a', 1, '#3a6a2a']), GFX.wire ? GFX.OUT : null);
  if (!GFX.wire) for (let k = 0; k < 30; k++) D.circ(c, x + (r() - 0.5) * 100, g - h * (0.3 + r() * 0.6), 5, r() > 0.5 ? '#9acc5a' : '#3a6a2a', null);
}

/* ---------------- гаражи ---------------- */
function drawGarages(c) {
  const g = 960, x0 = 3000;
  const cols = ['#7a8a8e', '#6a7a5a', '#8a6a5a', '#5a6a8a', '#8a8a7a'];
  for (let k = 0; k < 5; k++) {
    const x = x0 + k * 150;
    D.rect(c, x, g - 230, 150, 230, D.lg(c, 0, g - 230, 0, g, [0, '#b8a890', 1, '#8a7a62']), GFX.OUT, 2.2);
    if (!GFX.wire) {
      // кирпичная кладка
      for (let y = g - 226; y < g; y += 14) for (let bx = x + ((y / 14) % 2 ? 0 : 14); bx < x + 150; bx += 28) D.rect(c, bx + 1, y + 1, 26, 12, (bx * 7 + y) % 5 === 0 ? '#b8603a' : COL.brick, null);
      c.globalAlpha = 0.25; c.fillStyle = '#000'; c.fillRect(x, g - 230, 150, 230); c.globalAlpha = 1;
    }
    // ворота
    D.rect(c, x + 14, g - 190, 122, 190, D.lg(c, x + 14, 0, x + 136, 0, [0, shade(cols[k], 0.15), 1, shade(cols[k], -0.2)]), GFX.OUT, 2.2);
    D.line(c, x + 75, g - 190, x + 75, g, GFX.OUT, 2);
    if (!GFX.wire) {
      for (let s = 0; s < 6; s++) D.line(c, x + 18, g - 180 + s * 32, x + 132, g - 180 + s * 32, shade(cols[k], -0.3), 1.2);
      D.text(c, String(14 + k), x + 40, g - 160, 20, '#f2f2e6', 'center', '700 20px ');
      // ржавчина
      const r = rng(70 + k);
      for (let s = 0; s < 8; s++) D.circ(c, x + 20 + r() * 110, g - 20 - r() * 60, 4 + r() * 8, 'rgba(140,70,30,.5)', null);
      D.rect(c, x + 66, g - 104, 18, 10, '#5a5a5a', GFX.OUT, 1);
    }
    // крыша
    D.rect(c, x - 6, g - 244, 162, 16, '#4a4a4e', GFX.OUT, 2);
  }
  if (!GFX.wire) {
    c.save(); c.translate(x0 + 380, g - 60); c.rotate(-0.03);
    D.text(c, 'НЕ ПАРКОВАТЬСЯ!', 0, 0, 24, '#f2f2e6', 'center', '700 24px ', '#3a3a3a');
    c.restore();
    c.save(); c.translate(x0 + 610, g - 120);
    D.text(c, 'ЗАЕЗД', 0, 0, 22, '#ffe36a', 'center', '700 22px ', '#3a3a3a');
    c.restore();
  }
}

/* ---------------- ларёк ---------------- */
function drawKiosk(c) {
  const x = KIOSK.x, g = KIOSK.y;
  D.rect(c, x, g - 250, 360, 250, D.lg(c, 0, g - 250, 0, g, [0, '#f2f0e8', 1, '#c8c4b8']), GFX.OUT, 2.6);
  // вывеска
  D.rect(c, x - 10, g - 300, 380, 60, D.lg(c, 0, g - 300, 0, g - 240, [0, '#2a6ac8', 1, '#1a3a8a']), GFX.OUT, 2.6, 4);
  D.text(c, 'ПРОДУКТЫ 24', x + 180, g - 270, 34, '#ffe36a', 'center', '700 34px ', '#0a1a4a');
  // витрина
  D.rect(c, x + 20, g - 228, 220, 130, D.lg(c, x, g - 228, x + 220, g - 98, [0, '#a8d0e8', 1, '#4a7090']), GFX.OUT, 2.2);
  if (!GFX.wire) {
    // товары на полках
    for (let s = 0; s < 3; s++) {
      D.line(c, x + 24, g - 190 + s * 38, x + 236, g - 190 + s * 38, '#e8e8e8', 2);
      for (let k = 0; k < 12; k++) {
        const px = x + 30 + k * 17, col = pick(['#f2b632', '#c8302a', '#3a8a3a', '#2a5ab8', '#e8e8d8'], ((k * 7 + s * 3) % 10) / 10);
        D.rect(c, px, g - 214 + s * 38, 12, 22, col, GFX.OUT, 0.8, 2);
      }
    }
    D.line(c, x + 40, g - 220, x + 120, g - 110, 'rgba(255,255,255,.4)', 5);
  }
  // окошко
  D.rect(c, x + 260, g - 190, 80, 70, '#2a3442', GFX.OUT, 2.2);
  D.rect(c, x + 250, g - 120, 100, 10, '#9a9a96', GFX.OUT, 1.6);
  // табличка «ХЛЕБА НЕТ»
  c.save(); c.translate(x + 300, g - 70); c.rotate(0.05);
  D.rect(c, -46, -26, 92, 52, '#e8d8b0', GFX.OUT, 1.6);
  D.text(c, 'ХЛЕБА НЕТ', 0, -10, 15, '#c8302a', 'center', '700 15px ');
  D.text(c, 'ПИВО ЕСТЬ', 0, 12, 15, '#1a5a2a', 'center', '700 15px ');
  c.restore();
  // плакат
  D.rect(c, x + 30, g - 84, 90, 70, '#ffe36a', GFX.OUT, 1.6);
  D.text(c, 'СКИДКА', x + 75, g - 66, 15, '#c8302a', 'center', '700 15px ');
  D.text(c, 'НА СЕМКИ', x + 75, g - 48, 13, '#1a2a4a', 'center', '700 13px ');
  D.text(c, '-5%', x + 75, g - 28, 17, '#c8302a', 'center', '700 17px ');
  // ступенька
  D.rect(c, x + 240, g, 120, 14, '#9a968e', GFX.OUT, 1.6);
}

/* ---------------- столбы ЛЭП с проводами (в основном слое) ---------------- */
function drawWires(c) {
  const poles = [2500, 3350, 4250];
  for (const p of poles) {
    D.poly(c, [p - 8, 960, p + 8, 960, p + 5, 300, p - 5, 300], '#8a7a6a', GFX.OUT, 2);
    D.line(c, p - 50, 330, p + 50, 330, '#6a5a4a', 6);
    for (const o of [-40, 0, 40]) D.circ(c, p + o, 322, 5, '#d8e8f0', GFX.OUT, 1);
  }
  for (const o of [-40, 0, 40]) {
    for (let i = 0; i < poles.length - 1; i++) D.curve(c, poles[i] + o, 322, (poles[i] + poles[i + 1]) / 2 + o, 380, poles[i + 1] + o, 322, '#2a2a2e', 1.6);
    D.curve(c, 2330, 280 + o * 0.4, 2420 + o, 320, poles[0] + o, 322, '#2a2a2e', 1.6);
  }
}

/* ---------------- статичный двор целиком ---------------- */
function drawYardStatic(c, x0, x1) {
  drawGround(c, x0, x1);
  if (x1 > 2280) {
    drawWires(c);
    drawPoplar(c, 2420, 950, 520, 7);
    drawBirch(c, 2980, 960, 470, 12);
    drawBirch(c, 3760, 965, 430, 19);
    drawPoplar(c, 4300, 950, 560, 23);
  }
  drawBuilding(c, x0, x1);
  if (x1 > 2900) drawGarages(c);
  if (x1 > 3700) drawKiosk(c);
  if (x0 < 400) drawTrash(c);
  if (x0 < 1500 && x1 > 800) { drawBench(c, BENCH.x, BENCH.y, BENCH.w); drawFlowerbed(c, 1210, 1040); }
  if (x0 < 2400 && x1 > 1400) { drawPlayground(c); drawLamp(c, 1460); }
}

/* ============================================================
   Кэш слоя двора: куски по ~1000 пикселей
   ============================================================ */
const YARD = {
  res: 1, chunks: [], wireChunks: [], cw: 1000, built: false, wireBuilt: false, wireJob: null,
  plan(viewScale) {
    const need = viewScale * DPR * 1.35;
    const area = WORLD.w * (WORLD.bottom - WORLD.top);
    const maxPx = !GFX.quality ? 6e6 : GFX.grain ? 12e6 : 8e6;
    this.res = clamp(Math.min(need, 1.45, Math.sqrt(maxPx / area)), 0.35, 1.45);
    this.cw = Math.floor(1000 / this.res);
  },
  buildChunk(i, wire) {
    const x0 = i * this.cw, x1 = Math.min(WORLD.w, x0 + this.cw);
    const h = WORLD.bottom - WORLD.top;
    const cv = document.createElement('canvas');
    cv.width = Math.ceil((x1 - x0) * this.res); cv.height = Math.ceil(h * this.res);
    const c = cv.getContext('2d');
    c.setTransform(this.res, 0, 0, this.res, -x0 * this.res, -WORLD.top * this.res);
    const prev = GFX.wire;
    GFX.wire = !!wire;
    if (wire) {
      c.fillStyle = '#04130b'; c.fillRect(x0, WORLD.top, x1 - x0, h);
      c.strokeStyle = 'rgba(125,255,168,.08)'; c.lineWidth = 1;
      for (let gx = Math.floor(x0 / 50) * 50; gx <= x1; gx += 50) { c.beginPath(); c.moveTo(gx, WORLD.top); c.lineTo(gx, WORLD.bottom); c.stroke(); }
      for (let gy = Math.floor(WORLD.top / 50) * 50; gy <= WORLD.bottom; gy += 50) { c.beginPath(); c.moveTo(x0, gy); c.lineTo(x1, gy); c.stroke(); }
      c.globalAlpha = 0.85;
    }
    try { drawYardStatic(c, x0, x1); } catch (e) { console.warn('yard draw', e); }
    GFX.wire = prev;
    return { cv, x0, x1 };
  },
  build() {
    this.chunks = [];
    const n = Math.ceil(WORLD.w / this.cw);
    for (let i = 0; i < n; i++) this.chunks.push(this.buildChunk(i, false));
    this.built = true;
    this.wireChunks = []; this.wireBuilt = false;
  },
  /** каркасная версия строится по кусочку за кадр, чтобы не было рывка */
  stepWire() {
    if (this.wireBuilt) return true;
    const n = Math.ceil(WORLD.w / this.cw);
    if (this.wireChunks.length < n) this.wireChunks.push(this.buildChunk(this.wireChunks.length, true));
    if (this.wireChunks.length >= n) this.wireBuilt = true;
    return this.wireBuilt;
  },
  draw(c, wire, vx0, vx1) {
    const list = wire && this.wireBuilt ? this.wireChunks : this.chunks;
    for (const ch of list) {
      if (ch.x1 < vx0 || ch.x0 > vx1) continue;
      c.drawImage(ch.cv, ch.x0, WORLD.top, ch.x1 - ch.x0, WORLD.bottom - WORLD.top);
    }
  }
};

/* ============================================================
   Дальний город (параллакс) — кэшируется одним холстом
   ============================================================ */
const FAR = {
  cv: null, res: 0.5, x0: -600, w: 3600, top: -300, h: 1300, par: 0.35,
  build() {
    this.res = clamp(YARD.res * 0.7, 0.3, 0.9);
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(this.w * this.res); cv.height = Math.ceil(this.h * this.res);
    const c = cv.getContext('2d');
    c.setTransform(this.res, 0, 0, this.res, -this.x0 * this.res, -this.top * this.res);
    const r = rng(4242);
    // дальние многоэтажки в дымке
    for (let k = 0; k < 16; k++) {
      const x = this.x0 + k * 230 + r() * 60, w = 150 + r() * 140, h = 240 + r() * 280, g = 900;
      const col = mix('#aebbd2', '#98a8c4', r());
      D.rect(c, x, g - h, w, h, col, null);
      c.fillStyle = 'rgba(70,84,120,.22)';
      for (let wy = g - h + 18; wy < g - 30; wy += 30) for (let wx = x + 12; wx < x + w - 14; wx += 22) c.fillRect(wx, wy, 10, 13);
      c.fillStyle = 'rgba(255,255,255,.14)'; c.fillRect(x, g - h, 5, h);
    }
    // дымка у земли
    const hz = c.createLinearGradient(0, 560, 0, 900);
    hz.addColorStop(0, 'rgba(220,230,245,0)'); hz.addColorStop(1, 'rgba(220,230,245,.55)');
    c.fillStyle = hz; c.fillRect(this.x0, 560, this.w, 340);
    // труба ТЭЦ
    const tx = this.x0 + 2300;
    for (let s = 0; s < 8; s++) D.poly(c, [tx - 24 + s * 2, 900 - s * 70, tx + 24 - s * 2, 900 - s * 70, tx + 24 - (s + 1) * 2, 900 - (s + 1) * 70, tx - 24 + (s + 1) * 2, 900 - (s + 1) * 70], s % 2 ? '#e8ecf2' : '#d87a6a', null);
    // телебашня
    const vx = this.x0 + 900;
    D.poly(c, [vx - 30, 900, vx + 30, 900, vx + 6, 160, vx - 6, 160], '#a8b0c0', null);
    D.ell(c, vx, 360, 34, 14, 0, '#98a0b0', null);
    D.line(c, vx, 160, vx, 40, '#a8b0c0', 4);
    // кроны деревьев перед ними
    for (let k = 0; k < 40; k++) D.circ(c, this.x0 + r() * this.w, 880 + r() * 30, 30 + r() * 30, mix('#6a8a5a', '#4a6a4a', r()), null);
    this.cv = cv;
  },
  draw(c, camX) {
    if (!this.cv) return;
    const ox = camX * (1 - this.par);
    c.drawImage(this.cv, this.x0 + ox, this.top + 60, this.w, this.h);
  }
};

/* ============================================================
   Небо и время суток
   tod: 0 рассвет, 0.35 утро, 0.55 день, 0.8 закат, 1 ночь
   ============================================================ */
const SKY_KEYS = [
  [0.00, '#3a3a6a', '#e88a7a', '#ffd0a0'],
  [0.25, '#5a8ad0', '#a8c8f0', '#f6e6d0'],
  [0.55, '#3a7ad8', '#8ac0f0', '#d8ecfa'],
  [0.80, '#4a3a7a', '#e8705a', '#ffc070'],
  [1.00, '#060a1e', '#141e44', '#2a3460'],
];
function skyCols(tod) {
  for (let i = 1; i < SKY_KEYS.length; i++) {
    if (tod <= SKY_KEYS[i][0]) {
      const a = SKY_KEYS[i - 1], b = SKY_KEYS[i];
      const p = (tod - a[0]) / (b[0] - a[0]);
      return [mix(a[1], b[1], p), mix(a[2], b[2], p), mix(a[3], b[3], p)];
    }
  }
  const l = SKY_KEYS[SKY_KEYS.length - 1]; return [l[1], l[2], l[3]];
}
const CLOUDS = [];
(function () { const r = rng(9); for (let i = 0; i < 9; i++) CLOUDS.push({ x: r() * 3000, y: -40 + r() * 340, s: 0.6 + r() * 0.9, v: 4 + r() * 8, seed: i }); })();
function cloudSprite(seed) {
  return SPR.get('cloud' + seed, 360, 160, c => {
    const r = rng(seed * 31 + 3);
    for (let k = 0; k < 9; k++) {
      const x = 60 + r() * 240, y = 70 + r() * 40, rr = 30 + r() * 36;
      const g = c.createRadialGradient(x, y - rr * 0.3, 2, x, y, rr);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0.0)');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, rr, 0, TAU); c.fill();
    }
    for (let k = 0; k < 7; k++) { c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.arc(70 + k * 36, 100 - Math.sin(k) * 16, 30, 0, TAU); c.fill(); }
  });
}
/** небо в координатах экрана (W×H) с учётом камеры */
function drawSky(c, W, H, tod, t, camX, camY, zoom) {
  const [top, mid, bot] = skyCols(tod);
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, top); g.addColorStop(0.55, mid); g.addColorStop(1, bot);
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  // звёзды
  const night = clamp((tod - 0.82) / 0.18, 0, 1);
  if (night > 0) {
    const r = rng(77);
    c.fillStyle = '#fff';
    for (let k = 0; k < 120; k++) {
      const x = r() * W, y = r() * H * 0.7, tw2 = 0.5 + 0.5 * Math.sin(t * 2 + k);
      c.globalAlpha = night * tw2 * 0.9; c.fillRect(x, y, 2, 2);
    }
    c.globalAlpha = 1;
  }
  // солнце/луна
  const sunA = tod < 0.85 ? tod / 0.85 : 0;
  const sx = W * (0.15 + sunA * 0.7), sy = H * (0.75 - Math.sin(sunA * Math.PI) * 0.6) - camY * 0.05;
  if (tod < 0.88) {
    const sc = tod < 0.2 || tod > 0.7 ? '#ffb070' : '#fff8d0';
    const gg = c.createRadialGradient(sx, sy, 0, sx, sy, H * 0.35);
    gg.addColorStop(0, rgba(sc, 0.55)); gg.addColorStop(1, rgba(sc, 0));
    c.fillStyle = gg; c.fillRect(sx - H * 0.35, sy - H * 0.35, H * 0.7, H * 0.7);
    c.fillStyle = sc; c.beginPath(); c.arc(sx, sy, H * 0.06, 0, TAU); c.fill();
  } else {
    const mx = W * 0.8, my = H * 0.18;
    c.fillStyle = 'rgba(255,250,220,.15)'; c.beginPath(); c.arc(mx, my, H * 0.11, 0, TAU); c.fill();
    c.fillStyle = '#fff6d8'; c.beginPath(); c.arc(mx, my, H * 0.055, 0, TAU); c.fill();
    c.fillStyle = 'rgba(200,190,160,.6)'; c.beginPath(); c.arc(mx - H * 0.015, my + H * 0.01, H * 0.012, 0, TAU); c.fill();
  }
  // облака
  const cloudA = 1 - night * 0.7;
  for (const cl of CLOUDS) {
    const spr = cloudSprite(cl.seed);
    const px = ((cl.x + t * cl.v - camX * 0.15) % 3400 + 3400) % 3400 - 400;
    const s = cl.s * H / 900;
    c.globalAlpha = cloudA * 0.9;
    c.drawImage(spr, px * W / 1600, cl.y * H / 900 - camY * 0.08 * zoom, 360 * s, 160 * s);
  }
  c.globalAlpha = 1;
}
/** тонировка мира под время суток (поверх всего, кроме интерфейса) */
function todTint(tod) {
  if (tod < 0.15) return ['#ff9a8a', 0.22 * (1 - tod / 0.15)];
  if (tod < 0.65) return null;
  if (tod < 0.85) return ['#ff8a40', 0.3 * (tod - 0.65) / 0.2];
  return ['#2a3a8a', 0.3 + 0.35 * (tod - 0.85) / 0.15];
}

/* ============================================================
   Общий план района на рассвете (пролог)
   ============================================================ */
const WIDE = {
  cv: null, w: 2000, h: 1100, res: 0.8,
  build() {
    this.res = clamp(YARD.res, 0.4, 1.2);
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(this.w * this.res); cv.height = Math.ceil(this.h * this.res);
    const c = cv.getContext('2d');
    c.scale(this.res, this.res);
    const r = rng(1984);
    // дальний ряд
    for (let k = 0; k < 14; k++) {
      const x = -60 + k * 160 + r() * 40, w = 120 + r() * 80, h = 260 + r() * 260, g = 800;
      D.rect(c, x, g - h, w, h, mix('#5a5a8a', '#7a6a9a', r()), null);
      for (let wy = g - h + 14; wy < g - 20; wy += 22) for (let wx = x + 8; wx < x + w - 8; wx += 16) {
        c.fillStyle = r() > 0.88 ? 'rgba(255,220,130,.85)' : 'rgba(30,30,60,.35)'; c.fillRect(wx, wy, 8, 11);
      }
    }
    // труба ТЭЦ с дымом
    D.poly(c, [1600, 800, 1640, 800, 1630, 300, 1610, 300], '#d8d0d8', null);
    for (let s = 0; s < 5; s++) D.rect(c, 1606 + s, 300 + s * 100, 28 - s * 2, 30, '#c84a4a', null);
    // главный дом крупно
    const hx = 520, hw = 980, hg = 900, hh = 620;
    D.rect(c, hx, hg - hh, hw, hh, D.lg(c, hx, 0, hx + hw, 0, [0, '#d8c8b8', 1, '#a89888']), GFX.OUT, 3);
    for (let fl = 0; fl < 9; fl++) {
      for (let col = 0; col < 12; col++) {
        const wx = hx + 22 + col * 80, wy = hg - hh + 20 + fl * 66;
        const lit = (fl === 7 && col === 3) ? 2 : r() > 0.8 ? 1 : 0;
        D.rect(c, wx, wy, 46, 40, lit === 2 ? '#ffe680' : lit ? '#f2c860' : D.lg(c, wx, wy, wx + 46, wy + 40, [0, '#7a8aa8', 1, '#3a4a68']), GFX.OUT, 1.4);
        D.line(c, wx + 23, wy, wx + 23, wy + 40, '#f2f0ea', 2);
      }
      D.line(c, hx, hg - hh + 70 + fl * 66, hx + hw, hg - hh + 70 + fl * 66, 'rgba(0,0,0,.18)', 2);
    }
    for (let col = 0; col <= 12; col++) D.line(c, hx + col * 80 + 6, hg - hh, hx + col * 80 + 6, hg, 'rgba(0,0,0,.12)', 2);
    // крыша с антеннами
    D.rect(c, hx - 10, hg - hh - 14, hw + 20, 16, '#6a6a72', GFX.OUT, 2);
    for (let k = 0; k < 6; k++) { const ax = hx + 60 + k * 160; D.line(c, ax, hg - hh - 14, ax, hg - hh - 70, '#3a3a40', 3); D.line(c, ax - 24, hg - hh - 60, ax + 24, hg - hh - 60, '#3a3a40', 3); D.line(c, ax - 16, hg - hh - 46, ax + 16, hg - hh - 46, '#3a3a40', 3); }
    // деревья и гаражи перед домом
    for (let k = 0; k < 26; k++) D.circ(c, r() * 2000, 880 + r() * 40, 40 + r() * 40, mix('#4a6a3a', '#6a8a4a', r()), null);
    D.rect(c, 0, 900, 2000, 200, D.lg(c, 0, 900, 0, 1100, [0, '#4a5a3a', 1, '#2a3a24']), null);
    // провода ЛЭП
    for (let k = 0; k < 3; k++) D.curve(c, -20, 160 + k * 18, 1000, 260 + k * 18, 2020, 140 + k * 18, '#2a2a3a', 2);
    this.cv = cv;
  },
  /** окно Гены на общем плане (центр, для наезда камеры) */
  genaWin: { x: 520 + 22 + 3 * 80 + 23, y: 900 - 620 + 20 + 7 * 66 + 20 },
};
