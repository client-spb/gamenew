'use strict';
/* ============================================================
   Предметы: пиво, вобла, пирожки, семки, телефон, вязание,
   клюка, баллончик, барсетка, батон, поварёшка
   и главный железный конь — ВАЗ-2107 «Ласточка»
   ============================================================ */

function drawBeerCan(c, x, y, s, open, empty) {
  c.save(); c.translate(x, y); c.scale(s, s);
  const w = 15, h = 30;
  D.path(c, cc => { D.rr(cc, -w / 2, -h / 2, w, h, 3); }, D.lg(c, -w / 2, 0, w / 2, 0, [0, '#a87a1a', 0.3, '#ffe27a', 0.55, '#f2b632', 1, '#8a5a0a']), GFX.OUT, 1.8);
  if (!GFX.wire) {
    c.fillStyle = '#c9352a'; c.fillRect(-w / 2 + 0.8, -4, w - 1.6, 9);
    c.fillStyle = '#fff3d0'; c.font = '700 5px "PT Sans Narrow", Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('ПИВО', 0, 0.6);
    D.ell(c, 0, -10, 3.4, 2.4, 0, '#c9352a', null);
    D.line(c, -w / 2 + 3, -h / 2 + 3, -w / 2 + 3, h / 2 - 3, 'rgba(255,255,255,.7)', 1.6);
    if (empty) { D.line(c, -3, 6, 4, 9, '#8a5a0a', 1); D.line(c, 2, -8, 5, -5, '#8a5a0a', 1); }
  }
  D.ell(c, 0, -h / 2, w / 2, 2.2, 0, '#d8d8d8', GFX.OUT, 1.2);
  if (open && !GFX.wire) { D.ell(c, 2, -h / 2, 2.4, 1.2, 0, '#333', null); D.rect(c, -4, -h / 2 - 1.5, 4, 2, '#bbb', null); }
  c.restore();
}

function drawVobla(c, x, y, s, bite) {
  c.save(); c.translate(x, y); c.scale(s, s);
  D.path(c, cc => {
    cc.moveTo(-26, 0);
    cc.quadraticCurveTo(-10, -11, 12, -8);
    cc.quadraticCurveTo(24, -5, 26, 0);
    cc.quadraticCurveTo(24, 5, 12, 7);
    cc.quadraticCurveTo(-10, 9, -26, 0);
  }, D.lg(c, 0, -10, 0, 8, [0, '#8a6a3a', 0.4, '#d8b070', 1, '#e8d0a0']), GFX.OUT, 1.8);
  D.poly(c, [-24, 0, -36, -9, -32, 0, -36, 9], '#a0804a', GFX.OUT, 1.6);
  D.poly(c, [-4, -8, 2, -15, 8, -8], '#a0804a', GFX.OUT, 1.4);
  if (!GFX.wire) {
    for (let k = 0; k < 6; k++) D.curve(c, -18 + k * 6, -4, -15 + k * 6, 0, -18 + k * 6, 4, 'rgba(110,80,40,.5)', 1);
    D.circ(c, 18, -1.5, 2.4, '#fff', GFX.OUT, 0.8); D.circ(c, 18.5, -1.5, 1, '#111', null);
    D.curve(c, 13, -6, 15, 0, 13, 6, 'rgba(110,80,40,.7)', 1);
    if (bite) { c.globalCompositeOperation = 'destination-out'; D.circ(c, -4, 9, 7 * bite, '#000', null); c.globalCompositeOperation = 'source-over'; }
  }
  c.restore();
}

function drawPirozhok(c, x, y, s, bite) {
  c.save(); c.translate(x, y); c.scale(s || 1, s || 1);
  D.path(c, cc => { cc.moveTo(-14, 3); cc.quadraticCurveTo(-14, -9, 0, -10); cc.quadraticCurveTo(15, -9, 15, 3); cc.quadraticCurveTo(0, 7, -14, 3); }, D.lg(c, 0, -10, 0, 6, [0, '#e8a040', 0.6, '#c87824', 1, '#9a5a14']), GFX.OUT, 1.8);
  if (!GFX.wire) {
    D.curve(c, -10, -3, 0, -8, 11, -3, '#8a4a10', 1.2);
    D.shine(c, -3, -6, 5, 1.6, 0, 0.4);
    if (bite > 0) {
      D.ell(c, 12, -2, 6 * bite, 6 * bite, 0, '#fbe6b0', null);
      D.ell(c, 12, -1, 3.4 * bite, 3 * bite, 0, '#9ab84a', null);
    }
  }
  c.restore();
}

function drawSeedBag(c, x, y, s) {
  c.save(); c.translate(x, y); c.scale(s || 1, s || 1);
  D.path(c, cc => { cc.moveTo(-9, -14); cc.lineTo(9, -14); cc.lineTo(11, 12); cc.lineTo(-11, 12); cc.closePath(); }, '#f6e9c0', GFX.OUT, 1.6);
  if (!GFX.wire) {
    D.circ(c, 0, -2, 6, '#f2c232', '#b98a12', 1);
    for (let k = 0; k < 8; k++) { const a = k * TAU / 8; D.line(c, Math.cos(a) * 6, -2 + Math.sin(a) * 6, Math.cos(a) * 9, -2 + Math.sin(a) * 9, '#f2c232', 1.6); }
    D.circ(c, 0, -2, 3.4, '#5a3a1a', null);
    c.fillStyle = '#c9352a'; c.font = '700 4.4px Arial'; c.textAlign = 'center'; c.fillText('СЕМКИ', 0, 9);
    for (let k = 0; k < 4; k++) D.ell(c, -5 + k * 3.4, -15, 1.4, 2.2, 0.3 * k, '#222', null);
  }
  c.restore();
}

function drawPhone(c, x, y, t) {
  c.save(); c.translate(x, y);
  D.rect(c, -6, -11, 12, 22, '#1a1a1e', GFX.OUT, 1.6, 2.5);
  if (!GFX.wire) {
    const g = (Math.sin(t * 15.7) + 1) / 2;
    D.rect(c, -4.5, -9, 9, 15, mix('#3a2a8a', '#ff3a8a', g), null, 0, 1);
    for (let k = 0; k < 4; k++) D.rect(c, -3.6 + k * 2.2, 4 - (2 + g * 6 * ((k % 2) + 0.5)), 1.4, 2 + g * 6 * ((k % 2) + 0.5), '#7dffa8', null);
    // ноты из динамика
    c.globalAlpha = 0.85;
    for (let k = 0; k < 2; k++) {
      const p = (t * 1.3 + k * 0.5) % 1;
      D.text(c, '♪', 10 + p * 14, -10 - p * 22, 9, '#fff', 'center', '700 9px ', '#000');
    }
    c.globalAlpha = 1;
  }
  c.restore();
}

function drawKnitting(c, x, y, t) {
  c.save(); c.translate(x, y);
  const k = Math.sin(t * 8) * 3;
  D.line(c, -16, -6 + k, 14, 6 - k, '#c8c8c8', 2.4);
  D.line(c, -14, 6 - k, 16, -6 + k, '#c8c8c8', 2.4);
  D.path(c, cc => { cc.moveTo(-8, 0); cc.quadraticCurveTo(0, 14, 10, 2); cc.lineTo(8, 14); cc.lineTo(-8, 14); cc.closePath(); }, '#3fa0d8', GFX.OUT, 1.4);
  if (!GFX.wire) for (let i = 0; i < 4; i++) D.curve(c, -6 + i * 4, 6, -4 + i * 4, 9, -2 + i * 4, 6, '#2a7ab0', 1);
  c.restore();
}
function drawYarnBall(c, x, y, r) {
  D.circ(c, x, y, r, D.rg(c, x - 2, y - 2, 1, r, [0, '#7ac8f0', 1, '#2a7ab0']), GFX.OUT, 1.6);
  if (!GFX.wire) for (let k = 0; k < 4; k++) D.curve(c, x - r + 2, y - r * 0.4 + k * 3, x, y - r * 0.8 + k * 4, x + r - 2, y - r * 0.2 + k * 3, '#1a5a90', 1);
}
function drawCane(c, x, y) {
  c.save(); c.translate(x, y);
  D.limb(c, [0, -10, 0, 50], 5, '#7a4a24');
  D.path(c, cc => { cc.moveTo(0, -10); cc.quadraticCurveTo(0, -24, 12, -22); }, null, '#5a3414', 5);
  c.restore();
}
function drawSprayCan(c, x, y) {
  c.save(); c.translate(x, y);
  D.rect(c, -6, -12, 12, 26, D.lg(c, -6, 0, 6, 0, [0, '#a01818', 0.4, '#ff4a3a', 1, '#801010']), GFX.OUT, 1.6, 3);
  D.rect(c, -3, -17, 6, 5, '#dcdcdc', GFX.OUT, 1.2);
  if (!GFX.wire) { D.rect(c, -6, -2, 12, 6, '#ffe36a', null); D.line(c, -3, -9, -3, 10, 'rgba(255,255,255,.6)', 1.4); }
  c.restore();
}
function drawBarsetka(c, x, y) {
  c.save(); c.translate(x, y);
  D.line(c, -2, -14, 2, -2, '#3a2416', 2);
  D.rect(c, -12, -4, 24, 18, D.lg(c, 0, -4, 0, 14, [0, '#7a4a2a', 1, '#4a2a16']), GFX.OUT, 1.8, 3);
  if (!GFX.wire) { D.line(c, -10, 2, 10, 2, '#c8a060', 1.2); D.circ(c, 0, 2, 1.6, '#e8c070', null); }
  c.restore();
}
function drawBread(c, x, y) {
  c.save(); c.translate(x, y);
  D.ell(c, 0, 0, 22, 9, 0, D.lg(c, 0, -9, 0, 9, [0, '#e8b060', 1, '#9a5a20']), GFX.OUT, 1.8);
  if (!GFX.wire) for (let k = -1; k <= 1; k++) D.line(c, k * 10 - 3, -6, k * 10 + 3, 4, '#f6d8a0', 2);
  c.restore();
}
function drawLadle(c, x, y) {
  c.save(); c.translate(x, y);
  D.line(c, 0, 0, 0, -34, '#c8c8c8', 3.4);
  D.path(c, cc => { cc.arc(0, -40, 9, Math.PI * 0.95, Math.PI * 2.05, true); cc.closePath(); }, '#d8d8d8', GFX.OUT, 1.6);
  c.restore();
}
function drawPlate(c, x, y, n, t) {
  c.save(); c.translate(x, y);
  D.ell(c, 0, 0, 30, 7, 0, '#f6f6f0', GFX.OUT, 1.8);
  if (!GFX.wire) D.ell(c, 0, -1, 20, 4, 0, '#e2e2da', null);
  for (let k = 0; k < n; k++) drawPirozhok(c, -16 + (k % 3) * 15, -6 - Math.floor(k / 3) * 7, 0.9, 0);
  if (!GFX.wire) for (let k = 0; k < 3; k++) {
    const p = (t * 0.6 + k * 0.33) % 1;
    c.globalAlpha = (1 - p) * 0.5;
    D.curve(c, -8 + k * 8, -14 - p * 30, -4 + k * 8 + Math.sin(p * 6) * 4, -20 - p * 30, -8 + k * 8, -26 - p * 30, '#fff', 2);
    c.globalAlpha = 1;
  }
  c.restore();
}

/* ============================================================
   ВАЗ-2107 «Ласточка» (вид сбоку, морда вправо)
   P: shake, hood (0..1), noWheel, smoke, dents, wire-labels
   ============================================================ */
const CAR = { red: '#a3202a', redL: '#d6404a', redD: '#6a1018', chrome: '#e6e9ee', chromeD: '#9aa0aa', glass: '#9ccbe8' };

function drawCar(c, P, t) {
  const sh = P.shake ? Math.sin(t * 60) * 1.6 * P.shake : 0;
  const sink = P.sink || 0;
  D.shadow(c, 0, 4, 240, 18, 0.4);
  // колёса
  drawCarWheel(c, -132, -32, t, P.spin || 0);
  if (!P.noWheel) drawCarWheel(c, 136, -32, t, P.spin || 0);
  c.save(); c.translate(0, sh + sink);
  if (P.noWheel) c.rotate(0.06);
  // нижняя часть кузова
  D.path(c, cc => {
    cc.moveTo(-222, -46);
    cc.lineTo(-222, -84);
    cc.lineTo(-206, -92);
    cc.lineTo(-104, -96);
    cc.lineTo(-84, -146);
    cc.lineTo(62, -146);
    cc.lineTo(94, -98);
    cc.lineTo(214, -92);
    cc.lineTo(224, -84);
    cc.lineTo(224, -46);
    cc.lineTo(172, -46);
    cc.arc(136, -40, 36, -0.15, Math.PI + 0.15, true);
    cc.lineTo(-96, -46);
    cc.arc(-132, -40, 36, -0.15, Math.PI + 0.15, true);
    cc.closePath();
  }, D.lg(c, 0, -146, 0, -46, [0, CAR.redL, 0.35, CAR.red, 0.75, CAR.red, 1, CAR.redD]), GFX.OUT, 3.2);
  if (!GFX.wire) {
    // окна
    D.poly(c, [-74, -138, -94, -100, -12, -100, -12, -138], D.lg(c, -90, -138, -20, -100, [0, '#d8f0ff', 0.4, CAR.glass, 1, '#5a8ab0']), GFX.OUT, 2.2);
    D.poly(c, [-2, -138, -2, -100, 84, -100, 56, -138], D.lg(c, 0, -138, 80, -100, [0, '#d8f0ff', 0.4, CAR.glass, 1, '#5a8ab0']), GFX.OUT, 2.2);
    // подголовники и игрушка на заднем стекле
    D.rect(c, -60, -128, 12, 16, '#3a3a3a', null, 0, 3);
    D.rect(c, 16, -128, 12, 16, '#3a3a3a', null, 0, 3);
    D.line(c, -84, -138, -64, -100, 'rgba(255,255,255,.5)', 3);
    D.line(c, 8, -138, 24, -100, 'rgba(255,255,255,.4)', 3);
    // собачка-кивалка
    const nod = Math.sin(t * 6) * 3;
    D.ell(c, -82, -104, 6, 4, 0, '#c8a070', GFX.OUT, 1);
    D.circ(c, -80, -112 + nod, 4.4, '#c8a070', GFX.OUT, 1);
    // двери, ручки, молдинг
    D.line(c, -10, -100, -10, -50, CAR.redD, 2.2);
    D.line(c, -96, -96, -96, -54, CAR.redD, 2.2);
    D.line(c, 88, -96, 88, -54, CAR.redD, 2.2);
    D.rect(c, -84, -88, 16, 4, CAR.chrome, GFX.OUT, 1, 2);
    D.rect(c, 2, -88, 16, 4, CAR.chrome, GFX.OUT, 1, 2);
    D.rect(c, -220, -72, 444, 6, '#2a2a2e', null);
    D.line(c, -220, -71, 224, -71, 'rgba(255,255,255,.25)', 1);
    // хром бамперов
    D.rect(c, 206, -66, 26, 12, D.lg(c, 0, -66, 0, -54, [0, '#fff', 0.5, CAR.chrome, 1, CAR.chromeD]), GFX.OUT, 1.8, 4);
    D.rect(c, -232, -66, 26, 12, D.lg(c, 0, -66, 0, -54, [0, '#fff', 0.5, CAR.chrome, 1, CAR.chromeD]), GFX.OUT, 1.8, 4);
    // фары и фонари
    D.rect(c, 212, -90, 12, 16, P.lights ? '#fff6a0' : '#f2e6c0', GFX.OUT, 1.6, 2);
    D.rect(c, -224, -90, 10, 18, '#e83a2a', GFX.OUT, 1.6, 2);
    D.rect(c, -224, -78, 10, 6, '#f2a030', null);
    // зеркало
    D.path(c, cc => { cc.moveTo(78, -104); cc.lineTo(92, -114); cc.lineTo(100, -106); cc.lineTo(88, -100); cc.closePath(); }, '#2a2a2e', GFX.OUT, 1.6);
    // антенна
    D.line(c, -150, -94, -176, -168 + Math.sin(t * 3) * 3, '#666', 1.6);
    // ржавчина
    const r = rng(404);
    for (let k = 0; k < 18; k++) {
      const side = k % 2 ? 1 : -1, cx = side > 0 ? 136 : -132;
      const a = Math.PI + 0.3 + r() * 2.5, rr = 40 + r() * 8;
      D.circ(c, cx + Math.cos(a) * rr, -40 + Math.sin(a) * rr * 0.9, 2 + r() * 3.4, k % 3 ? 'rgba(140,70,30,.75)' : 'rgba(90,40,20,.8)', null);
    }
    D.blob(c, [-30, -60, -18, -64, -8, -58, -14, -52, -26, -54], 'rgba(140,70,30,.6)', null);
    // вмятина от воблы на капоте
    if (P.dents) for (let k = 0; k < P.dents; k++) D.curve(c, 120 + k * 22, -96, 128 + k * 22, -90, 136 + k * 22, -96, CAR.redD, 2.4);
    // наклейка «Ласточка»
    c.save(); c.translate(-150, -84); c.rotate(-0.05);
    D.text(c, 'Ласточка', 0, 0, 13, '#fff6d0', 'center', 'italic 700 13px ', CAR.redD);
    c.restore();
    // блики
    D.line(c, -200, -88, 200, -92, 'rgba(255,255,255,.35)', 3);
    D.shine(c, 160, -94, 30, 3, -0.02, 0.4);
  }
  // открытый капот
  if (P.hood) {
    c.save(); c.translate(96, -98); c.rotate(-P.hood * 1.15);
    D.poly(c, [0, 0, 118, 4, 120, -4, 2, -8], D.lg(c, 0, -8, 0, 4, [0, CAR.redL, 1, CAR.red]), GFX.OUT, 2.4);
    c.restore();
    if (P.hood > 0.3 && !GFX.wire) {
      D.rect(c, 108, -104, 90, 8, '#3a3a3a', null);
      D.circ(c, 150, -104, 10, '#5a5a5a', GFX.OUT, 1.6);
    }
  }
  c.restore();
}

function drawCarWheel(c, x, y, t, spin) {
  c.save(); c.translate(x, y); c.rotate(spin);
  D.circ(c, 0, 0, 31, '#1e1e22', GFX.OUT, 2.4);
  if (!GFX.wire) for (let k = 0; k < 16; k++) { const a = k * TAU / 16; D.line(c, Math.cos(a) * 26, Math.sin(a) * 26, Math.cos(a) * 30, Math.sin(a) * 30, '#3a3a40', 2); }
  D.circ(c, 0, 0, 18, D.rg(c, -4, -4, 1, 18, [0, '#ffffff', 0.4, CAR.chrome, 1, CAR.chromeD]), GFX.OUT, 1.8);
  for (let k = 0; k < 4; k++) { const a = k * TAU / 4 + 0.4; D.circ(c, Math.cos(a) * 9, Math.sin(a) * 9, 2.2, '#8a8a90', null); }
  D.circ(c, 0, 0, 4, '#6a6a70', GFX.OUT, 1);
  c.restore();
}
