'use strict';
/* ============================================================
   Графика: обёртки над canvas с «каркасным» режимом.
   Когда мультфильм «ломается», те же самые функции рисуют
   мир неоновыми линиями, как в редакторе кода.
   ============================================================ */
const GFX = {
  wire: false,            // каркасный режим
  wireCol: '#7dffa8',
  wireFill: 'rgba(125,255,168,0.06)',
  OUT: '#2a1c18',         // цвет контура
  LW: 3.2,                // толщина контура в единицах мира
  quality: 1,             // 0 — упрощённо (слабые устройства)
  grain: true,            // зерно плёнки (на телефонах выключено)
};

const D = {
  /** закончить контур: залить и обвести (или каркас) */
  finish(c, fill, stroke, lw) {
    if (GFX.wire) {
      c.fillStyle = GFX.wireFill; c.fill();
      c.strokeStyle = GFX.wireCol; c.lineWidth = 1.4; c.stroke();
      return;
    }
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke !== null && stroke !== false) {
      c.strokeStyle = stroke || GFX.OUT; c.lineWidth = lw || GFX.LW; c.stroke();
    }
  },
  path(c, build, fill, stroke, lw) { c.beginPath(); build(c); D.finish(c, fill, stroke, lw); },
  poly(c, pts, fill, stroke, lw, open) {
    c.beginPath();
    c.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
    if (!open) c.closePath();
    D.finish(c, open ? null : fill, stroke, lw);
  },
  /** сглаженный замкнутый контур через середины отрезков */
  blob(c, pts, fill, stroke, lw) {
    const n = pts.length / 2;
    c.beginPath();
    const mx = (pts[0] + pts[(n - 1) * 2]) / 2, my = (pts[1] + pts[(n - 1) * 2 + 1]) / 2;
    c.moveTo(mx, my);
    for (let i = 0; i < n; i++) {
      const x = pts[i * 2], y = pts[i * 2 + 1];
      const nx = pts[((i + 1) % n) * 2], ny = pts[((i + 1) % n) * 2 + 1];
      c.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2);
    }
    c.closePath();
    D.finish(c, fill, stroke, lw);
  },
  ell(c, x, y, rx, ry, rot, fill, stroke, lw) {
    c.beginPath(); c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, TAU);
    D.finish(c, fill, stroke, lw);
  },
  circ(c, x, y, r, fill, stroke, lw) { D.ell(c, x, y, r, r, 0, fill, stroke, lw); },
  rect(c, x, y, w, h, fill, stroke, lw, r) {
    c.beginPath();
    if (r) D.rr(c, x, y, w, h, r); else c.rect(x, y, w, h);
    D.finish(c, fill, stroke, lw);
  },
  rr(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y);
  },
  /** линия-деталь (морщина, шов) */
  line(c, x0, y0, x1, y1, col, lw, cap) {
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1);
    c.strokeStyle = GFX.wire ? GFX.wireCol : (col || GFX.OUT);
    c.lineWidth = GFX.wire ? 1 : (lw || 2);
    c.lineCap = cap || 'round';
    c.stroke();
  },
  curve(c, x0, y0, cx, cy, x1, y1, col, lw) {
    c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(cx, cy, x1, y1);
    c.strokeStyle = GFX.wire ? GFX.wireCol : (col || GFX.OUT);
    c.lineWidth = GFX.wire ? 1 : (lw || 2);
    c.lineCap = 'round';
    c.stroke();
  },
  /** толстая конечность с контуром: точки [x0,y0,x1,y1,...] */
  limb(c, pts, w, col, outline, w2) {
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
    if (GFX.wire) {
      c.strokeStyle = GFX.wireCol; c.lineWidth = 1.4; c.stroke();
      for (let i = 0; i < pts.length; i += 2) { c.beginPath(); c.arc(pts[i], pts[i + 1], 3, 0, TAU); c.fillStyle = GFX.wireCol; c.fill(); }
      return;
    }
    c.strokeStyle = outline || GFX.OUT; c.lineWidth = w + GFX.LW * 2; c.stroke();
    c.strokeStyle = col; c.lineWidth = w; c.stroke();
    if (w2) { // сужение к концу: дорисовываем последний сегмент тоньше
      c.beginPath(); const n = pts.length;
      c.moveTo(pts[n - 4], pts[n - 3]); c.lineTo(pts[n - 2], pts[n - 1]);
      c.strokeStyle = col; c.lineWidth = w2; c.stroke();
    }
  },
  lg(c, x0, y0, x1, y1, stops) {
    if (GFX.wire) return null;
    const g = c.createLinearGradient(x0, y0, x1, y1);
    for (let i = 0; i < stops.length; i += 2) g.addColorStop(stops[i], stops[i + 1]);
    return g;
  },
  rg(c, x, y, r0, r1, stops, fx, fy) {
    if (GFX.wire) return null;
    const g = c.createRadialGradient(fx === undefined ? x : fx, fy === undefined ? y : fy, r0, x, y, r1);
    for (let i = 0; i < stops.length; i += 2) g.addColorStop(stops[i], stops[i + 1]);
    return g;
  },
  /** мягкая тень на земле */
  shadow(c, x, y, rx, ry, a) {
    if (GFX.wire) {
      c.save(); c.setLineDash([6, 6]); c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU);
      c.strokeStyle = GFX.wireCol; c.globalAlpha *= 0.5; c.lineWidth = 1; c.stroke(); c.restore();
      return;
    }
    c.save();
    const g = c.createRadialGradient(x, y, 0, x, y, rx);
    g.addColorStop(0, 'rgba(20,14,30,' + (a || 0.32) + ')');
    g.addColorStop(1, 'rgba(20,14,30,0)');
    c.fillStyle = g;
    c.translate(x, y); c.scale(1, ry / rx); c.translate(-x, -y);
    c.beginPath(); c.arc(x, y, rx, 0, TAU); c.fill();
    c.restore();
  },
  /** блик */
  shine(c, x, y, rx, ry, rot, a) {
    if (GFX.wire) return;
    c.beginPath(); c.ellipse(x, y, rx, ry, rot || 0, 0, TAU);
    c.fillStyle = 'rgba(255,255,255,' + (a || 0.5) + ')'; c.fill();
  },
  text(c, s, x, y, size, col, align, font, outline) {
    const w = font ? font.replace(/\d+(\.\d+)?px/g, '').trim() : '700';
    c.font = (w || '700') + ' ' + size + 'px "PT Sans Narrow", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
    c.textAlign = align || 'center'; c.textBaseline = 'middle';
    if (GFX.wire) { c.strokeStyle = GFX.wireCol; c.lineWidth = 1; c.strokeText(s, x, y); return; }
    if (outline) { c.strokeStyle = outline; c.lineWidth = size * 0.18; c.lineJoin = 'round'; c.strokeText(s, x, y); }
    c.fillStyle = col; c.fillText(s, x, y);
  },
};

/** двухзвенная инверсная кинематика: возвращает локоть/колено */
function ik(sx, sy, tx, ty, a, b, bend) {
  let dx = tx - sx, dy = ty - sy;
  let d = Math.hypot(dx, dy);
  const maxD = (a + b) * 0.999;
  if (d > maxD) { dx *= maxD / d; dy *= maxD / d; d = maxD; tx = sx + dx; ty = sy + dy; }
  if (d < 1e-3) d = 1e-3;
  const cosA = clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1);
  const ang = Math.atan2(dy, dx) + Math.acos(cosA) * (bend || 1);
  return { ex: sx + Math.cos(ang) * a, ey: sy + Math.sin(ang) * a, hx: tx, hy: ty };
}

/** кэш картинок, нарисованных один раз во внеэкранный canvas */
const SPR = {
  cache: new Map(),
  get(key, w, h, draw) {
    let s = this.cache.get(key);
    if (s) return s;
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.ceil(w)); cv.height = Math.max(1, Math.ceil(h));
    const c = cv.getContext('2d');
    draw(c, w, h);
    this.cache.set(key, cv);
    return cv;
  },
  clear() { this.cache.clear(); }
};
