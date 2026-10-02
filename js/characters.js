'use strict';
/* ============================================================
   Персонажи: скелет, позы и детальная отрисовка
   Гена (скуф), баба Валя, баба Зина, Вован, Колян,
   мама Гены (в окне), кот Барсик, голуби
   Все рисуются в локальных координатах: (0,0) — точка между ступнями,
   вверх — отрицательный y, взгляд вправо (+x).
   ============================================================ */

/** глобальные модификаторы, которые меняет зритель в середине мультфильма */
const MODS = { hair: 0, belly: 1, bigHeads: false, giant: false };
const HAIR_NAMES = ['лысина', 'маллет', 'афро', 'ирокез', 'кудри'];

const PAL = {
  skin: '#f2c3a0', skinD: '#d8957a', skinL: '#ffdcc0', blush: '#ee8f86',
  skinOld: '#efc6ab', skinOldD: '#d49d86',
  tank: '#f6f1e2', tankD: '#d8cfb4',
  pants: '#26346b', pantsD: '#18224a', stripe: '#f4f4f4',
  sock: '#f2f2ee', slide: '#1f2d55',
  hairGray: '#5d5650', mustache: '#4a3a30',
  eyeW: '#fffdf6', pupil: '#2a1c18',
  gold: '#f2c232', goldD: '#b98a12',
};

/* ---------------- скелет ---------------- */
function skeleton(P, d, t) {
  const S = {};
  const bob = P.bob || 0;
  const legs = P.legs || 'stand';
  let hipY = d.hipY + bob;
  const ph = P.walk || 0;
  const hw = d.hipW;
  const thigh = d.thigh, shin = d.shin;

  if (legs === 'squat') hipY = d.squatY + bob;
  if (legs === 'sit') hipY = -P.seat + bob;
  S.hipY = hipY;
  S.hips = [[-hw, hipY], [hw, hipY]];
  S.feet = []; S.knees = [];

  for (let i = 0; i < 2; i++) {
    const side = i ? 1 : -1;
    const hx = side * hw, hy = hipY;
    let fx, fy, bend = -1;
    if (legs === 'walk') {
      const p = ph + i * Math.PI;
      fx = hx * 0.55 + Math.sin(p) * (P.stride || 22);
      fy = -Math.max(0, Math.cos(p)) * (P.lift || 12);
    } else if (legs === 'sit') {
      const sw = Math.sin(t * 2.2 + i * 2) * (P.swing || 0);
      fx = hx * 0.8 + 16 + sw;
      fy = Math.min(-2, hy + thigh * 0.25 + shin * 0.95);
      const kx = hx * 0.9 + 18, ky = hy + 4;
      S.knees.push([kx, ky]); S.feet.push([fx, fy]);
      continue;
    } else if (legs === 'squat') {
      const kx = side * (hw + d.squatKnee), ky = hipY - d.squatUp;
      fx = side * (hw + 6); fy = 0;
      S.knees.push([kx, ky]); S.feet.push([fx, fy]);
      continue;
    } else if (legs === 'fly') {
      fx = hx * 1.2 + Math.sin(t * 13 + i * 2) * 18;
      fy = hy + (thigh + shin) * 0.8 + Math.cos(t * 11 + i) * 14;
    } else if (legs === 'dance') {
      const beat = (P.beat !== undefined ? P.beat : t * 2.5);
      const k = Math.floor(beat) % 2 === i ? Math.sin((beat % 1) * Math.PI) : 0;
      fx = hx * 0.7 + k * 34;
      fy = -k * 40;
    } else if (legs === 'tiptoe') {
      fx = hx * 0.8; fy = -6;
    } else {
      fx = hx * 0.95 + (P.stance || 0) * side; fy = 0;
    }
    const kk = ik(hx, hy, fx, fy, thigh, shin, bend);
    S.knees.push([kk.ex, kk.ey]); S.feet.push([kk.hx, kk.hy]);
  }

  // туловище и голова
  const lean = P.lean || 0;
  S.lean = lean;
  S.shY = hipY + (d.shY - d.hipY);
  S.neck = [Math.sin(lean) * (d.hipY - d.neckY) * -1, hipY + (d.neckY - d.hipY)];
  S.sh = [[-d.shW + S.neck[0] * 0.8, S.shY], [d.shW + S.neck[0] * 0.8, S.shY]];

  // руки
  S.hands = []; S.elbows = [];
  const arms = P.arms || {};
  for (let i = 0; i < 2; i++) {
    const side = i ? 1 : -1;
    const key = i ? 'R' : 'L';
    const [sx, sy] = S.sh[i];
    const tg = armTarget(arms[key] || 'down', side, sx, sy, d, S, P, t);
    const r = ik(sx, sy, tg[0], tg[1], d.ua, d.fa, tg[2] !== undefined ? tg[2] : -side);
    S.elbows.push([r.ex, r.ey]); S.hands.push([r.hx, r.hy]);
  }
  return S;
}

function armTarget(a, side, sx, sy, d, S, P, t) {
  const L = d.ua + d.fa;
  if (Array.isArray(a)) return [a[0], a[1], a[2]];
  switch (a) {
    case 'swing': { const s = Math.sin((P.walk || 0) + (side > 0 ? 0 : Math.PI)); return [sx + side * 6 + s * 16, sy + L * 0.9]; }
    case 'hips': return [sx + side * 4, S.hipY - 10, side];
    case 'up': return [sx + side * L * 0.45, sy - L * 0.85];
    case 'flail': return [sx + side * (L * 0.55 + Math.sin(t * 14 + side) * 16), sy - L * 0.5 + Math.cos(t * 12 + side * 2) * 26];
    case 'front': return [sx * 0.2 + 30, sy + L * 0.45];
    case 'frontHigh': return [sx * 0.2 + 34, sy + L * 0.15];
    case 'mouth': return [20, S.neck[1] - 4, 1];
    case 'belly': return [12 + Math.sin(t * 9) * 8, S.hipY - 24 + Math.cos(t * 9) * 4, -1];
    case 'point': return [sx + L * 0.95, sy + 4];
    case 'pointUp': return [sx + L * 0.55, sy - L * 0.7];
    case 'fist': return [sx + side * 10 + 14, sy - L * 0.55 + Math.sin(t * 16) * 7];
    case 'lap': return [sx * 0.35 + 18, S.hipY - 4];
    case 'knee': { const k = S.knees[side > 0 ? 1 : 0]; return [k[0] + side * 4, k[1] + 4, side]; }
    case 'wave': return [sx + side * 26 + Math.sin(t * 10) * 10, sy - L * 0.8];
    case 'cross': return [-side * 10, sy + L * 0.42, side];
    case 'chin': return [12, S.neck[1] - 6, 1];
    case 'scratchHead': return [side * 10 + 4, S.neck[1] - 56 + Math.sin(t * 18) * 3, -side];
    case 'shrug': return [sx + side * 26, sy + L * 0.35, side];
    case 'pump': { const beat = P.beat !== undefined ? P.beat : t * 2.5; const k = Math.abs(Math.sin(beat * Math.PI)); return [sx + side * 8 + 10, sy - L * (0.2 + 0.6 * k)]; }
    case 'drinkHigh': return [20, S.neck[1] - 30, 1];
    case 'raise': return [sx + 18, sy - L * 0.55];
    case 'hit': { const k = Math.abs(Math.sin(t * 7)); return [sx + 30, sy - L * 0.6 + k * L * 1.1]; }
    case 'give': return [sx + L * 0.8, sy + L * 0.3];
    case 'phone': return [sx * 0.3 + 24, sy + L * 0.3];
    case 'spray': return [sx + L * 0.85, sy - 10 + Math.sin(t * 6) * 10];
    case 'eat': return [14, S.neck[1] - 10 + Math.abs(Math.sin(t * 5)) * 8, 1];
    case 'dance': { const beat = P.beat !== undefined ? P.beat : t * 2.5; return [sx + side * 20, sy - L * 0.3 + Math.sin(beat * Math.PI + side) * 30]; }
    default: return [sx + side * 5, sy + L * 0.95];
  }
}

/** авто-моргание по времени и «семени» персонажа */
function blinkAt(t, seed) {
  const p = (t * 0.31 + seed) % 1;
  return p < 0.035 ? 0.08 : 1;
}

/* ---------------- общие части лица ---------------- */
function drawEye(c, x, y, rx, ry, open, lookX, lookY, lid, pupR) {
  if (open < 0.15) { D.curve(c, x - rx, y, x, y + ry * 0.5, x + rx, y, GFX.OUT, 2.2); return; }
  D.ell(c, x, y, rx, ry * open, 0, PAL.eyeW, GFX.OUT, 1.8);
  if (!GFX.wire) {
    c.save(); c.beginPath(); c.ellipse(x, y, rx, ry * open, 0, 0, TAU); c.clip();
    D.circ(c, x + lookX * rx * 0.45, y + lookY * ry * 0.35, pupR || rx * 0.55, PAL.pupil, null);
    D.circ(c, x + lookX * rx * 0.45 - 1.4, y + lookY * ry * 0.35 - 1.6, 1.3, '#fff', null);
    if (lid > 0) { c.fillStyle = PAL.skinD; c.fillRect(x - rx - 1, y - ry - 1, rx * 2 + 2, ry * 2 * lid * 0.55 + 1); }
    c.restore();
    if (lid > 0) D.line(c, x - rx, y - ry + ry * 2 * lid * 0.55, x + rx, y - ry + ry * 2 * lid * 0.55, GFX.OUT, 2);
  }
}
function drawMouth(c, x, y, w, open, shape, tongueCol, teeth) {
  open = clamp(open || 0, 0, 1);
  if (open > 0.08) {
    const h = 3 + open * 13;
    D.path(c, cc => {
      cc.moveTo(x - w / 2, y);
      cc.quadraticCurveTo(x, y - (shape === 'frown' ? 4 : 1), x + w / 2, y);
      cc.quadraticCurveTo(x + w / 2 - 1, y + h, x, y + h);
      cc.quadraticCurveTo(x - w / 2 + 1, y + h, x - w / 2, y);
    }, '#5a1f1f', GFX.OUT, 2);
    if (!GFX.wire) {
      if (teeth) D.rect(c, x - w * 0.3, y - 0.5, w * 0.6, 3.2, '#fffbe8', null);
      D.ell(c, x + 1, y + h * 0.72, w * 0.28, h * 0.26, 0, tongueCol || '#e0605a', null);
    }
  } else {
    const k = shape === 'smile' ? 5 : shape === 'frown' ? -4 : shape === 'smirk' ? 3 : 0.8;
    if (shape === 'smirk') D.curve(c, x - w / 2, y, x + w * 0.1, y + 2, x + w / 2, y - 4, GFX.OUT, 2.4);
    else D.curve(c, x - w / 2, y, x, y + k, x + w / 2, y, GFX.OUT, 2.4);
  }
}
function browPair(c, x1, x2, y, w, ang, col, lw) {
  // ang > 0 — злые (к центру вниз), < 0 — грустные
  D.line(c, x1 - w / 2, y - ang * 4, x1 + w / 2, y + ang * 4, col, lw);
  D.line(c, x2 - w / 2, y + ang * 4, x2 + w / 2, y - ang * 4, col, lw);
}
function exprBrow(expr) {
  return { angry: 1, shock: -0.8, sad: -1, happy: -0.3, sleepy: 0.2, smug: 0.5, worried: -1.2 }[expr] || 0;
}

/** кисть-рукавица */
function drawHand(c, x, y, r, col, ang) {
  D.circ(c, x, y, r, col, GFX.OUT, 2.2);
  if (!GFX.wire) {
    const a = ang || 0;
    D.ell(c, x + Math.cos(a - 1.2) * r * 0.75, y + Math.sin(a - 1.2) * r * 0.75, r * 0.45, r * 0.3, a, col, GFX.OUT, 1.8);
  }
}

/* ---------------- предметы в руках ---------------- */
function drawHeld(c, item, x, y, ang, P, t) {
  if (!item) return;
  c.save(); c.translate(x, y); c.rotate(ang || 0);
  switch (item) {
    case 'can': drawBeerCan(c, 0, -6, 1, P.canOpen, P.canEmpty); break;
    case 'canTilt': c.rotate(-1.1); drawBeerCan(c, 0, -6, 1, true, P.canEmpty); break;
    case 'vobla': drawVobla(c, 10, 0, 1, P.voblaBite); break;
    case 'pirozhok': drawPirozhok(c, 6, -2, 1, P.bite || 0); break;
    case 'seeds': drawSeedBag(c, 4, 4, 1); break;
    case 'phone': drawPhone(c, 4, -2, t); break;
    case 'knitting': drawKnitting(c, 0, 0, t); break;
    case 'cane': drawCane(c, 0, 0); break;
    case 'spray': drawSprayCan(c, 4, -4); break;
    case 'bag': drawBarsetka(c, 0, 10); break;
    case 'bread': drawBread(c, 6, 0); break;
    case 'ladle': drawLadle(c, 0, 0); break;
  }
  c.restore();
}

/* ============================================================
   ГЕНА — скуф обыкновенный
   ============================================================ */
const GEN_DIM = { hipY: -76, hipW: 19, thigh: 40, shin: 38, shY: -162, shW: 41, neckY: -174, ua: 38, fa: 34, squatY: -40, squatKnee: 20, squatUp: 40 };

function drawGena(c, P, t) {
  const d = GEN_DIM;
  const belly = (P.belly !== undefined ? P.belly : MODS.belly);
  const S = skeleton(P, d, t);
  const hs = P.headScale || (MODS.bigHeads ? 1.75 : 1);
  const seed = 0.13;
  const blink = P.eyes !== undefined ? P.eyes : blinkAt(t, seed);

  D.shadow(c, 0, 2, 58 * Math.max(1, belly * 0.9), 12, 0.3);

  // --- ноги в трениках ---
  for (let i = 0; i < 2; i++) {
    const [hx, hy] = S.hips[i], [kx, ky] = S.knees[i], [fx, fy] = S.feet[i];
    D.limb(c, [hx, hy, kx, ky, fx, fy - 8], 27, PAL.pants);
    if (!GFX.wire) {
      // коленки-пузыри
      D.ell(c, kx + 3, ky + 1, 15, 13, 0, PAL.pants, null);
      D.curve(c, kx - 8, ky + 4, kx + 2, ky + 9, kx + 12, ky + 3, PAL.pantsD, 2);
      // лампасы
      const side = i ? 1 : -1;
      for (let s = 0; s < 3; s++) {
        const o = side * (8 + s * 3.2);
        D.line(c, hx + o, hy + 6, kx + o * 0.9, ky, PAL.stripe, 1.6);
        D.line(c, kx + o * 0.9, ky, fx + o * 0.8, fy - 12, PAL.stripe, 1.6);
      }
    }
    // носок + шлёпанец
    D.ell(c, fx + 6, fy - 5, 16, 8, 0, PAL.sock, GFX.OUT, 2.2);
    D.path(c, cc => { cc.moveTo(fx - 12, fy - 1); cc.lineTo(fx + 25, fy - 1); cc.quadraticCurveTo(fx + 27, fy + 3, fx + 22, fy + 4); cc.lineTo(fx - 12, fy + 4); cc.closePath(); }, PAL.slide, GFX.OUT, 2);
    D.path(c, cc => { cc.moveTo(fx + 2, fy - 2); cc.quadraticCurveTo(fx + 12, fy - 14, fx + 22, fy - 2); }, '#2e4486', GFX.OUT, 2);
    if (!GFX.wire) { D.line(c, fx + 6, fy - 7, fx + 18, fy - 7, '#fff', 1.4); D.line(c, fx + 5, fy - 4, fx + 19, fy - 4, '#fff', 1.4); }
  }

  // --- задняя рука ---
  drawGenaArm(c, S, 0, P, t);

  // --- пояс треников ---
  const hy = S.hipY;
  D.path(c, cc => {
    cc.moveTo(-36, hy - 14); cc.quadraticCurveTo(4, hy - 22 * belly, 40, hy - 14);
    cc.lineTo(36, hy + 18); cc.quadraticCurveTo(0, hy + 26, -34, hy + 18); cc.closePath();
  }, D.lg(c, 0, hy - 20, 0, hy + 20, [0, PAL.pants, 1, PAL.pantsD]), GFX.OUT, 2.6);

  c.save();
  c.translate(S.neck[0] * 0.3, 0);
  c.rotate(S.lean * 0.6);

  // --- пузо ---
  const by = hy - 34, bx = 8;
  const brx = 50 * belly, bry = 47 * Math.sqrt(belly);
  D.ell(c, bx, by, brx, bry, 0, D.rg(c, bx + 6, by - 8, 4, brx * 1.1, [0, PAL.skinL, 0.55, PAL.skin, 1, PAL.skinD]), GFX.OUT, 3);
  if (!GFX.wire) {
    D.circ(c, bx + 10 * belly, by + 14 * Math.sqrt(belly), 3.2, PAL.skinD, null);
    D.curve(c, bx + 8 * belly, by + 13, bx + 11 * belly, by + 17, bx + 13 * belly, by + 13, '#9a5a48', 1.5);
    // дорожка волос
    for (let k = 0; k < 6; k++) D.line(c, bx + 10 * belly + (k % 2 ? 1.5 : -1.5), by + 24 + k * 4, bx + 10 * belly + (k % 2 ? -1 : 1), by + 26 + k * 4, '#7a5040', 1.1);
    D.shine(c, bx + 20 * belly, by - 6, 12 * belly, 7, -0.5, 0.25);
  }

  // --- майка-алкоголичка ---
  const tb = by + 6 * belly; // нижний край
  D.path(c, cc => {
    cc.moveTo(-30, S.shY + 2);
    cc.lineTo(-20, S.shY - 2);
    cc.quadraticCurveTo(-8, S.shY + 26, 8, S.shY + 26);
    cc.quadraticCurveTo(24, S.shY + 24, 32, S.shY - 2);
    cc.lineTo(40, S.shY + 2);
    cc.quadraticCurveTo(46, S.shY + 30, 40, S.shY + 40);
    cc.quadraticCurveTo(bx + brx * 1.02, by - 20, bx + brx * 0.98, tb - 2);
    cc.quadraticCurveTo(bx, tb + 14 * belly, bx - brx * 0.98, tb - 2);
    cc.quadraticCurveTo(-48, S.shY + 40, -36, S.shY + 34);
    cc.quadraticCurveTo(-40, S.shY + 16, -30, S.shY + 2);
    cc.closePath();
  }, D.lg(c, -40, S.shY, 50, tb, [0, '#fffaf0', 0.6, PAL.tank, 1, PAL.tankD]), GFX.OUT, 2.8);
  if (!GFX.wire) {
    // рубчик ткани
    c.save(); c.globalAlpha = 0.18;
    for (let k = -36; k < 46; k += 5) D.line(c, k, S.shY + 30, k + 3, tb - 4, '#a89c7a', 1);
    c.restore();
    // пятно от пива и кетчупа
    D.blob(c, [14, by - 14, 24, by - 18, 30, by - 8, 22, by - 2, 12, by - 6], 'rgba(214,170,70,.45)', null);
    D.circ(c, -14, by - 30, 3.2, 'rgba(200,40,30,.6)', null);
    // складки на пузе
    D.curve(c, -20, tb - 18, 0, tb - 10, 22, tb - 20, PAL.tankD, 1.6);
    // грудь
    D.curve(c, -22, S.shY + 36, -10, S.shY + 44, 0, S.shY + 36, PAL.tankD, 1.6);
    D.curve(c, 10, S.shY + 36, 22, S.shY + 44, 32, S.shY + 36, PAL.tankD, 1.6);
  }
  // --- шея и цепочка ---
  D.path(c, cc => { cc.moveTo(-17, S.shY + 4); cc.lineTo(-14, S.neck[1] - 6); cc.lineTo(18, S.neck[1] - 6); cc.lineTo(22, S.shY + 4); cc.quadraticCurveTo(4, S.shY + 20, -17, S.shY + 4); }, PAL.skin, GFX.OUT, 2.4);
  if (!GFX.wire) {
    c.beginPath(); c.moveTo(-12, S.shY + 2); c.quadraticCurveTo(3, S.shY + 22, 18, S.shY + 2);
    c.strokeStyle = PAL.gold; c.lineWidth = 1.6; c.setLineDash([2, 1.4]); c.stroke(); c.setLineDash([]);
    D.circ(c, 3, S.shY + 13, 2.2, PAL.gold, PAL.goldD, 1);
    // волосы на груди из-под майки
    for (let k = 0; k < 5; k++) D.line(c, -4 + k * 4, S.shY + 16 + (k % 2) * 2, -2 + k * 4, S.shY + 12, '#6a4a3a', 1);
  }

  // --- голова ---
  c.save();
  c.translate(S.neck[0] + 2, S.neck[1]);
  c.rotate(P.tilt || 0);
  c.scale(hs, hs);
  drawGenaHead(c, P, t, blink);
  c.restore();

  c.restore();

  // --- передняя рука ---
  drawGenaArm(c, S, 1, P, t);
  return S;
}

function drawGenaArm(c, S, i, P, t) {
  const [sx, sy] = S.sh[i], [ex, ey] = S.elbows[i], [hx, hy] = S.hands[i];
  D.limb(c, [sx, sy + 4, ex, ey, hx, hy], 19, PAL.skin);
  if (!GFX.wire) {
    // волосатость и плечо
    for (let k = 0; k < 4; k++) {
      const p = 0.3 + k * 0.15;
      const x = lerp(ex, hx, p), y = lerp(ey, hy, p);
      D.line(c, x - 2, y - 2, x + 1, y + 1, '#8a5a44', 1);
    }
    D.ell(c, sx, sy + 6, 13, 11, 0, PAL.skin, null);
    D.shine(c, sx - 3, sy + 2, 5, 3, 0, 0.3);
  }
  const item = i ? (P.holdR) : (P.holdL);
  if (item && P.itemBehind) drawHeld(c, item, hx, hy, P.itemAng || 0, P, t);
  drawHand(c, hx, hy, 9.5, PAL.skin, Math.atan2(hy - ey, hx - ex));
  if (item && !P.itemBehind) drawHeld(c, item, hx, hy, (i ? P.itemAngR : P.itemAngL) || 0, P, t);
}

function drawGenaHead(c, P, t, blink) {
  const turn = P.turn !== undefined ? P.turn : 0.6;
  const fo = turn * 7;
  const expr = P.expr || 'n';
  const mouth = P.mouth || 0;
  const lookX = P.lookX !== undefined ? P.lookX : turn * 0.8, lookY = P.lookY || 0;

  // волосы сзади (маллет/кудри)
  if (MODS.hair === 1 && !P.noMods) {
    D.path(c, cc => { cc.moveTo(-30, -44); cc.quadraticCurveTo(-48, 0, -36, 34); cc.lineTo(-20, 18); cc.lineTo(-10, 34); cc.lineTo(0, 14); cc.quadraticCurveTo(10, -30, -30, -44); }, '#6b4426', GFX.OUT, 2.4);
  }
  if (MODS.hair === 2 && !P.noMods) {
    D.blob(c, [-60, -40, -54, -86, -20, -112, 22, -114, 58, -88, 64, -44, 46, -16, -40, -14], D.rg(c, 0, -60, 10, 70, [0, '#4a2c1c', 1, '#24140c']), GFX.OUT, 2.6);
  }
  if (MODS.hair === 4 && !P.noMods) {
    for (let k = 0; k < 9; k++) { const a = Math.PI + k * 0.38; D.circ(c, Math.cos(a) * 34, -40 + Math.sin(a) * 38, 13, '#c9a227', GFX.OUT, 2); }
  }

  // уши
  D.ell(c, -32 + fo * 0.3, -32, 8, 11, -0.2, PAL.skin, GFX.OUT, 2.4);
  if (!GFX.wire) D.curve(c, -34 + fo * 0.3, -38, -30 + fo * 0.3, -32, -33 + fo * 0.3, -26, PAL.skinD, 1.6);
  if (turn < 0.9) {
    D.ell(c, 33 + fo * 0.3, -32, 7, 11, 0.2, PAL.skin, GFX.OUT, 2.4);
  }

  // череп и щёки (яйцо, расширяющееся книзу)
  D.path(c, cc => {
    cc.moveTo(0 + fo * 0.2, -82);
    cc.bezierCurveTo(26 + fo * 0.4, -82, 34, -60, 34, -38);
    cc.bezierCurveTo(36, -12, 26, 2, 4 + fo * 0.4, 4);
    cc.bezierCurveTo(-20, 4, -34, -10, -33, -36);
    cc.bezierCurveTo(-32, -62, -24, -82, 0 + fo * 0.2, -82);
  }, D.rg(c, 6 + fo, -56, 4, 60, [0, PAL.skinL, 0.6, PAL.skin, 1, PAL.skinD]), GFX.OUT, 3);

  if (!GFX.wire) {
    // лысина блестит
    D.shine(c, -4 + fo * 0.5, -70, 15, 6, -0.25, 0.6);
    D.shine(c, 12 + fo * 0.5, -74, 4, 2.4, -0.2, 0.7);
    // щетина
    c.save(); c.globalAlpha = 0.5;
    const r = rng(77);
    for (let k = 0; k < 60; k++) {
      const a = 0.15 + r() * 2.8, rr = 22 + r() * 9;
      const x = Math.cos(a) * rr * 1.05 + fo * 0.5, y = -18 + Math.sin(a) * rr * 0.7;
      if (y > -24) D.circ(c, x, y, 0.9, '#6e5a4e', null);
    }
    c.restore();
    // двойной подбородок
    D.curve(c, -10 + fo, 0, 4 + fo, 7, 18 + fo, -1, PAL.skinD, 1.8);
    // румянец
    D.ell(c, -18 + fo, -24, 7, 4, 0, 'rgba(238,120,110,.35)', null);
    D.ell(c, 26 + fo, -24, 6, 4, 0, 'rgba(238,120,110,.35)', null);
    // морщины на лбу
    if (expr === 'shock' || expr === 'worried' || expr === 'sad') {
      D.curve(c, -12 + fo, -58, 2 + fo, -61, 16 + fo, -58, PAL.skinD, 1.4);
      D.curve(c, -9 + fo, -64, 2 + fo, -66, 13 + fo, -64, PAL.skinD, 1.4);
    }
  }

  // венчик волос (если не изменена причёска)
  if (MODS.hair === 0 || P.noMods || MODS.hair === 2) {
    if (MODS.hair !== 2 || P.noMods) {
      D.path(c, cc => { cc.moveTo(-33, -48); cc.quadraticCurveTo(-37, -34, -31, -20); cc.lineTo(-27, -26); cc.quadraticCurveTo(-29, -38, -24, -50); cc.closePath(); }, PAL.hairGray, GFX.OUT, 1.8);
      if (turn < 0.9) D.path(c, cc => { cc.moveTo(33, -48); cc.quadraticCurveTo(37, -34, 32, -22); cc.lineTo(28, -28); cc.quadraticCurveTo(30, -40, 26, -50); cc.closePath(); }, PAL.hairGray, GFX.OUT, 1.8);
    }
  }
  if (MODS.hair === 1 && !P.noMods) {
    D.path(c, cc => { cc.moveTo(-30, -56); cc.quadraticCurveTo(-8, -96, 30, -64); cc.lineTo(26, -54); cc.lineTo(18, -64); cc.lineTo(10, -54); cc.lineTo(2, -66); cc.lineTo(-8, -56); cc.lineTo(-16, -64); cc.closePath(); }, '#7a5030', GFX.OUT, 2.2);
  }
  if (MODS.hair === 3 && !P.noMods) {
    for (let k = 0; k < 7; k++) {
      const x = -24 + k * 8;
      D.poly(c, [x - 5, -74 + Math.abs(k - 3) * 3, x, -118 + Math.abs(k - 3) * 6 + Math.sin(t * 6 + k) * 2, x + 5, -74 + Math.abs(k - 3) * 3], k % 2 ? '#e8322a' : '#ff6a2a', GFX.OUT, 2);
    }
  }
  if (MODS.hair === 2 && !P.noMods) {
    // пушистый край афро поверх лба
    D.blob(c, [-40, -54, -30, -84, 0, -96, 30, -86, 42, -56, 24, -66, 0, -72, -20, -66], '#3a2214', GFX.OUT, 2);
  }

  // брови
  const bA = exprBrow(expr);
  browPair(c, -9 + fo, 15 + fo, -50, 15, bA, '#3e3028', 4.2);

  // глаза: тяжёлые веки, мешки
  const sleepy = expr === 'sleepy' ? 0.75 : expr === 'smug' ? 0.45 : 0.22;
  const op = expr === 'shock' ? 1.25 * blink : blink;
  drawEye(c, -9 + fo, -40, 6.6, 5.6, op, lookX, lookY, sleepy, 3);
  drawEye(c, 15 + fo, -40, 6.6, 5.6, op, lookX, lookY, sleepy, 3);
  if (!GFX.wire) {
    D.curve(c, -15 + fo, -33, -9 + fo, -30, -3 + fo, -33, PAL.skinD, 1.4);
    D.curve(c, 9 + fo, -33, 15 + fo, -30, 21 + fo, -33, PAL.skinD, 1.4);
  }

  // нос-картошка
  D.ell(c, 4 + fo * 1.4, -27, 9.5, 8.5, 0, D.rg(c, 6 + fo * 1.4, -30, 1, 11, [0, '#ffb3a0', 0.6, '#e98a78', 1, '#c96a5a']), GFX.OUT, 2.2);
  if (!GFX.wire) {
    D.circ(c, 1 + fo * 1.4, -23, 1.8, '#8a3a32', null);
    D.circ(c, 8 + fo * 1.4, -23, 1.8, '#8a3a32', null);
    D.shine(c, 7 + fo * 1.4, -31, 3, 2, 0, 0.6);
  }

  // рот под усами
  const shape = expr === 'happy' ? 'smile' : expr === 'sad' ? 'frown' : expr === 'smug' ? 'smirk' : expr === 'angry' ? 'frown' : 'n';
  drawMouth(c, 4 + fo * 1.3, -10, 15, mouth + (expr === 'shock' ? 0.6 : 0), shape, null, true);

  // усы
  D.path(c, cc => {
    const x = 4 + fo * 1.3;
    cc.moveTo(x - 1, -19);
    cc.quadraticCurveTo(x - 10, -22, x - 17, -14);
    cc.quadraticCurveTo(x - 19, -9, x - 14, -10);
    cc.quadraticCurveTo(x - 8, -14, x, -13);
    cc.quadraticCurveTo(x + 8, -14, x + 14, -10);
    cc.quadraticCurveTo(x + 19, -9, x + 17, -14);
    cc.quadraticCurveTo(x + 10, -22, x + 1, -19);
    cc.closePath();
  }, PAL.mustache, GFX.OUT, 1.8);
  if (!GFX.wire) for (let k = 0; k < 6; k++) D.line(c, 4 + fo * 1.3 - 12 + k * 5, -17, 4 + fo * 1.3 - 13 + k * 5, -12, '#6a5444', 1);

  // мокрый от пива
  if (P.wet && !GFX.wire) {
    c.save(); c.globalAlpha = 0.85;
    for (let k = 0; k < 7; k++) {
      const x = -24 + k * 8 + fo, y = -60 + (k % 3) * 14 + ((t * 30 + k * 13) % 30);
      D.ell(c, x, y, 2.4, 3.6, 0, 'rgba(200,225,255,.85)', null);
    }
    D.blob(c, [-20 + fo, -80, 0 + fo, -90, 24 + fo, -80, 14 + fo, -72, -8 + fo, -72], 'rgba(255,255,240,.9)', null);
    c.restore();
  }
}

/* ============================================================
   БАБУШКИ: Валентина Петровна и Зинаида Павловна
   ============================================================ */
const BAB_DIM = { hipY: -66, hipW: 17, thigh: 30, shin: 34, shY: -128, shW: 33, neckY: -138, ua: 30, fa: 28, squatY: -36, squatKnee: 16, squatUp: 30 };
const BABKA_STYLE = {
  val: { coat: '#8a5a3c', coatD: '#5e3a24', dress: '#3d5f8a', scarf: '#d3352b', scarfD: '#952018', dots: '#fff4e0', stock: '#8a6448', boot: '#3a2a22', glasses: true, seed: 0.41, knit: '#3fa0d8' },
  zin: { coat: '#3f6b4a', coatD: '#284631', dress: '#7a3c5a', scarf: '#3b5fb8', scarfD: '#243c80', dots: '#ffd84a', stock: '#6e5444', boot: '#2a2a2e', glasses: false, seed: 0.77, goldTooth: true },
};

function drawBabka(c, P, t, who) {
  const st = BABKA_STYLE[who];
  const d = BAB_DIM;
  const S = skeleton(P, d, t);
  const hs = P.headScale || (MODS.bigHeads ? 1.8 : 1);
  const blink = P.eyes !== undefined ? P.eyes : blinkAt(t, st.seed);
  if (P.legs !== 'sit') D.shadow(c, 0, 2, 44, 10, 0.28);

  // ноги: толстые чулки и боты
  for (let i = 0; i < 2; i++) {
    const [hx, hy] = S.hips[i], [kx, ky] = S.knees[i], [fx, fy] = S.feet[i];
    D.limb(c, [hx, hy + 8, kx, ky, fx, fy - 8], 17, st.stock);
    D.path(c, cc => { cc.moveTo(fx - 9, fy - 14); cc.lineTo(fx + 8, fy - 14); cc.quadraticCurveTo(fx + 20, fy - 10, fx + 20, fy); cc.lineTo(fx - 10, fy); cc.closePath(); }, st.boot, GFX.OUT, 2.2);
    if (!GFX.wire) D.line(c, fx - 6, fy - 2, fx + 16, fy - 2, '#5a4a40', 1.6);
  }

  // задняя рука
  drawBabkaArm(c, S, 0, P, t, st);

  const hy = S.hipY;
  c.save();
  c.rotate(S.lean * 0.6);
  // платье (подол)
  const sitK = P.legs === 'sit' ? 1 : 0;
  D.path(c, cc => {
    cc.moveTo(-34, hy - 10);
    cc.quadraticCurveTo(-44, hy + 22, -40 + sitK * 4, hy + 34 - sitK * 12);
    cc.lineTo(44 + sitK * 18, hy + 34 - sitK * 14);
    cc.quadraticCurveTo(44, hy + 10, 34, hy - 10);
    cc.closePath();
  }, st.dress, GFX.OUT, 2.4);
  if (!GFX.wire) {
    const r = rng(who === 'val' ? 5 : 9);
    for (let k = 0; k < 14; k++) {
      const x = -36 + r() * 76, y = hy - 4 + r() * 32;
      D.circ(c, x, y, 2.2, k % 2 ? '#f6d36a' : '#ffffff', null);
      D.circ(c, x, y, 0.9, '#d0503a', null);
    }
  }
  // кофта/пальто: широкое тело
  D.path(c, cc => {
    cc.moveTo(-26, S.shY - 4);
    cc.quadraticCurveTo(0, S.shY - 12, 28, S.shY - 4);
    cc.quadraticCurveTo(48, S.shY + 30, 42, hy + 6);
    cc.quadraticCurveTo(0, hy + 16, -42, hy + 6);
    cc.quadraticCurveTo(-48, S.shY + 30, -26, S.shY - 4);
    cc.closePath();
  }, D.lg(c, -40, S.shY, 40, hy, [0, shade(st.coat, 0.15), 1, st.coatD]), GFX.OUT, 2.8);
  if (!GFX.wire) {
    // вязка/текстура
    c.save(); c.globalAlpha = 0.25;
    for (let y = S.shY + 8; y < hy; y += 7) for (let x = -36; x < 38; x += 7) D.curve(c, x, y, x + 2, y + 3, x + 4, y, st.coatD, 1);
    c.restore();
    // пуговицы
    for (let k = 0; k < 4; k++) D.circ(c, 4, S.shY + 14 + k * 13, 3, '#e8d8b0', GFX.OUT, 1.2);
    // карман с платочком
    D.rect(c, 16, hy - 24, 18, 14, st.coatD, GFX.OUT, 1.6, 2);
    D.poly(c, [20, hy - 24, 26, hy - 32, 30, hy - 24], '#fff', GFX.OUT, 1.2);
  }

  // голова
  c.save();
  c.translate(S.neck[0] + 2, S.neck[1] + 4);
  c.rotate(P.tilt || 0);
  c.scale(hs, hs);
  drawBabkaHead(c, P, t, blink, st, who);
  c.restore();
  c.restore();

  drawBabkaArm(c, S, 1, P, t, st);
  return S;
}

function drawBabkaArm(c, S, i, P, t, st) {
  const [sx, sy] = S.sh[i], [ex, ey] = S.elbows[i], [hx, hy] = S.hands[i];
  D.limb(c, [sx, sy + 4, ex, ey, hx, hy], 16, st.coat);
  if (!GFX.wire) D.line(c, lerp(ex, hx, 0.82) - 5, lerp(ey, hy, 0.82), lerp(ex, hx, 0.82) + 5, lerp(ey, hy, 0.82), st.coatD, 2);
  const item = i ? P.holdR : P.holdL;
  drawHand(c, hx, hy, 7.5, PAL.skinOld, Math.atan2(hy - ey, hx - ex));
  if (item) drawHeld(c, item, hx, hy, (i ? P.itemAngR : P.itemAngL) || 0, P, t);
}

function drawBabkaHead(c, P, t, blink, st, who) {
  const turn = P.turn !== undefined ? P.turn : 0.6;
  const fo = turn * 6;
  const expr = P.expr || 'n';
  const lookX = P.lookX !== undefined ? P.lookX : turn * 0.8, lookY = P.lookY || 0;

  // платок сзади
  D.path(c, cc => {
    cc.moveTo(-34, -40); cc.quadraticCurveTo(-46, -6, -30, 12); cc.lineTo(-10, 4); cc.lineTo(-24, -20); cc.closePath();
  }, st.scarfD, GFX.OUT, 2.2);
  // лицо
  D.ell(c, 2 + fo * 0.4, -30, 27, 29, 0, D.rg(c, 6 + fo, -36, 3, 34, [0, '#ffe2cc', 0.6, PAL.skinOld, 1, PAL.skinOldD]), GFX.OUT, 2.8);
  if (!GFX.wire) {
    // морщины
    D.curve(c, -16 + fo, -46, -4 + fo, -49, 8 + fo, -46, PAL.skinOldD, 1.3);
    D.curve(c, -12 + fo, -42, 0 + fo, -44, 12 + fo, -42, PAL.skinOldD, 1.3);
    D.curve(c, -18 + fo, -24, -15 + fo, -16, -10 + fo, -12, PAL.skinOldD, 1.3);
    D.curve(c, 22 + fo, -24, 20 + fo, -16, 14 + fo, -12, PAL.skinOldD, 1.3);
    D.ell(c, -14 + fo, -24, 6, 4, 0, 'rgba(240,110,100,.4)', null);
    D.ell(c, 20 + fo, -24, 6, 4, 0, 'rgba(240,110,100,.4)', null);
  }
  // глаза
  const bA = exprBrow(expr === 'n' ? 'angry' : expr) * 0.8;
  const op = expr === 'shock' ? 1.3 * blink : blink * (who === 'zin' ? 0.7 : 0.9);
  drawEye(c, -7 + fo, -34, 5, 4.4, op, lookX, lookY, who === 'zin' ? 0.35 : 0.1, 2.6);
  drawEye(c, 12 + fo, -34, 5, 4.4, op, lookX, lookY, who === 'zin' ? 0.35 : 0.1, 2.6);
  browPair(c, -7 + fo, 12 + fo, -42, 10, bA, '#b8aca0', 2.6);
  if (st.glasses) {
    c.save();
    D.circ(c, -7 + fo, -34, 9.5, GFX.wire ? null : 'rgba(200,230,255,.18)', '#5a3a2a', 2.2);
    D.circ(c, 12 + fo, -34, 9.5, GFX.wire ? null : 'rgba(200,230,255,.18)', '#5a3a2a', 2.2);
    D.line(c, 2.5 + fo, -35, 2.5 + fo, -35, '#5a3a2a', 2);
    D.curve(c, 2 + fo, -35, 2.5 + fo, -38, 3 + fo, -35, '#5a3a2a', 2);
    D.line(c, -16 + fo, -35, -24 + fo * 0.4, -38, '#5a3a2a', 2);
    if (!GFX.wire) { D.line(c, -11 + fo, -38, -6 + fo, -40, 'rgba(255,255,255,.8)', 1.5); D.line(c, 8 + fo, -38, 13 + fo, -40, 'rgba(255,255,255,.8)', 1.5); }
    c.restore();
  }
  // нос
  D.ell(c, 3 + fo * 1.4, -24, 5.5, 6.5, 0, '#e8a690', GFX.OUT, 1.8);
  if (who === 'zin' && !GFX.wire) { D.circ(c, 10 + fo * 1.3, -21, 2.6, '#8a5a44', null); D.line(c, 11 + fo * 1.3, -23, 14 + fo * 1.3, -27, '#3a2a22', 0.8); }
  // рот
  const mouth = P.mouth || 0;
  const shape = expr === 'happy' ? 'smile' : (expr === 'n' || expr === 'angry') ? 'frown' : 'n';
  drawMouth(c, 3 + fo * 1.2, -11, 12, mouth, shape, '#d86a6a', false);
  if (st.goldTooth && mouth > 0.2 && !GFX.wire) {
    D.rect(c, 4 + fo * 1.2, -11, 3.6, 4, PAL.gold, PAL.goldD, 0.8);
    D.shine(c, 5 + fo * 1.2, -10, 1, 1, 0, 0.9);
  }
  // платок: вокруг лица, узел под подбородком
  D.path(c, cc => {
    cc.moveTo(-30, -18);
    cc.quadraticCurveTo(-36, -66, 2, -68);
    cc.quadraticCurveTo(40, -66, 34, -18);
    cc.quadraticCurveTo(30, -46, 2, -52);
    cc.quadraticCurveTo(-26, -46, -30, -18);
    cc.closePath();
  }, st.scarf, GFX.OUT, 2.4);
  if (!GFX.wire) {
    const r = rng(who === 'val' ? 21 : 33);
    for (let k = 0; k < 16; k++) {
      const a = Math.PI * (1.05 + r() * 0.9), rr = 32 + r() * 4;
      D.circ(c, 2 + Math.cos(a) * rr, -26 + Math.sin(a) * rr * 1.1, 2.2, st.dots, null);
    }
    D.shine(c, -8, -60, 10, 3, -0.2, 0.25);
  }
  D.path(c, cc => { cc.moveTo(-6, 0); cc.lineTo(-18, 14); cc.lineTo(-6, 12); cc.lineTo(2, 3); cc.lineTo(10, 14); cc.lineTo(16, 4); cc.lineTo(4, -2); cc.closePath(); }, st.scarf, GFX.OUT, 2);
  D.circ(c, 0, 1, 4.5, st.scarfD, GFX.OUT, 1.8);
}

/* ============================================================
   ГОПНИКИ: Вован (длинный, кепка) и Колян (с чёлкой и цепью)
   ============================================================ */
const GOP_DIM = {
  vov: { hipY: -86, hipW: 15, thigh: 46, shin: 44, shY: -170, shW: 30, neckY: -180, ua: 38, fa: 36, squatY: -40, squatKnee: 24, squatUp: 44 },
  kol: { hipY: -74, hipW: 17, thigh: 40, shin: 37, shY: -150, shW: 33, neckY: -160, ua: 34, fa: 31, squatY: -36, squatKnee: 22, squatUp: 40 },
};
const GOP_STYLE = {
  vov: { suit: '#1d1f26', suitL: '#3a3e4a', stripe: '#f2f2f2', skin: '#efc0a0', skinD: '#c98f72', seed: 0.58 },
  kol: { suit: '#2b56b8', suitL: '#4a78d8', stripe: '#ffffff', skin: '#f5c9a8', skinD: '#d39a7c', seed: 0.92 },
};

function drawGopnik(c, P, t, who) {
  const d = GOP_DIM[who], st = GOP_STYLE[who];
  const S = skeleton(P, d, t);
  const hs = P.headScale || (MODS.bigHeads ? 1.8 : 1);
  const blink = P.eyes !== undefined ? P.eyes : blinkAt(t, st.seed);
  D.shadow(c, 0, 2, P.legs === 'squat' ? 52 : 40, 10, 0.3);

  // ноги в спортивных штанах
  for (let i = 0; i < 2; i++) {
    const [hx, hy] = S.hips[i], [kx, ky] = S.knees[i], [fx, fy] = S.feet[i];
    D.limb(c, [hx, hy, kx, ky, fx, fy - 10], 20, st.suit);
    if (!GFX.wire) {
      const side = i ? 1 : -1;
      for (let s = 0; s < 3; s++) {
        const o = side * (6 + s * 2.6);
        D.line(c, hx + o, hy + 4, kx + o, ky, st.stripe, 1.4);
        D.line(c, kx + o, ky, fx + o * 0.8, fy - 14, st.stripe, 1.4);
      }
    }
    // белые кроссовки
    D.path(c, cc => { cc.moveTo(fx - 12, fy - 14); cc.quadraticCurveTo(fx + 4, fy - 20, fx + 14, fy - 10); cc.quadraticCurveTo(fx + 26, fy - 8, fx + 26, fy); cc.lineTo(fx - 13, fy); cc.closePath(); }, '#f6f6f2', GFX.OUT, 2.2);
    if (!GFX.wire) {
      D.line(c, fx - 12, fy - 2, fx + 25, fy - 2, '#c8c8c8', 2.2);
      D.line(c, fx - 2, fy - 12, fx + 8, fy - 8, '#2b56b8', 1.6);
      D.line(c, fx + 1, fy - 13, fx + 11, fy - 9, '#2b56b8', 1.6);
    }
  }

  drawGopArm(c, S, 0, P, t, st);

  c.save();
  c.rotate(S.lean * 0.6);
  // олимпийка
  const hy = S.hipY;
  const w = who === 'kol' ? 1.12 : 1;
  D.path(c, cc => {
    cc.moveTo(-26 * w, S.shY - 4);
    cc.quadraticCurveTo(0, S.shY - 10, 26 * w, S.shY - 4);
    cc.quadraticCurveTo(34 * w, (S.shY + hy) / 2, 28 * w, hy + 8);
    cc.lineTo(-28 * w, hy + 8);
    cc.quadraticCurveTo(-34 * w, (S.shY + hy) / 2, -26 * w, S.shY - 4);
    cc.closePath();
  }, D.lg(c, -30, S.shY, 30, hy, [0, st.suitL, 0.5, st.suit, 1, shade(st.suit, -0.3)]), GFX.OUT, 2.6);
  if (!GFX.wire) {
    // молния и надпись
    D.line(c, 3, S.shY + 4, 3, hy + 6, '#c8c8c8', 1.6);
    D.rect(c, -28 * w, hy + 2, 56 * w, 8, shade(st.suit, -0.25), GFX.OUT, 1.6);
    c.save(); c.translate(-12, S.shY + 26); c.rotate(-0.05);
    D.text(c, 'ABIBAS', 6, 0, 9, '#ffffff', 'center', '700 9px ');
    c.restore();
    for (let s = 0; s < 3; s++) D.line(c, -7 + s * 5, S.shY + 16, -9 + s * 5, S.shY + 10, '#fff', 1.5);
  }
  // голова
  c.save();
  c.translate(S.neck[0] + 2, S.neck[1]);
  c.rotate(P.tilt || 0);
  c.scale(hs, hs);
  if (who === 'vov') drawVovHead(c, P, t, blink, st); else drawKolHead(c, P, t, blink, st);
  c.restore();
  c.restore();

  drawGopArm(c, S, 1, P, t, st);
  return S;
}
function drawGopArm(c, S, i, P, t, st) {
  const [sx, sy] = S.sh[i], [ex, ey] = S.elbows[i], [hx, hy] = S.hands[i];
  D.limb(c, [sx, sy + 4, ex, ey, hx, hy], 15, st.suit);
  if (!GFX.wire) {
    const side = i ? 1 : -1;
    for (let s = 0; s < 3; s++) { const o = side * (3 + s * 2.4); D.line(c, sx + o, sy + 6, ex + o * 0.7, ey, st.stripe, 1.2); }
    D.line(c, lerp(ex, hx, 0.85) - 5, lerp(ey, hy, 0.85) - 2, lerp(ex, hx, 0.85) + 5, lerp(ey, hy, 0.85) + 2, '#c8c8c8', 3);
  }
  drawHand(c, hx, hy, 7.5, st.skin, Math.atan2(hy - ey, hx - ex));
  const item = i ? P.holdR : P.holdL;
  if (item) drawHeld(c, item, hx, hy, (i ? P.itemAngR : P.itemAngL) || 0, P, t);
}
function drawVovHead(c, P, t, blink, st) {
  const turn = P.turn !== undefined ? P.turn : 0.6, fo = turn * 6, expr = P.expr || 'n';
  const lookX = P.lookX !== undefined ? P.lookX : turn * 0.8, lookY = P.lookY || 0;
  // шея
  D.rect(c, -8, -12, 18, 16, st.skin, GFX.OUT, 2);
  // уши-локаторы
  D.ell(c, -24 + fo * 0.3, -32, 9, 12, -0.3, st.skin, GFX.OUT, 2.2);
  if (turn < 0.9) D.ell(c, 28 + fo * 0.3, -32, 9, 12, 0.3, st.skin, GFX.OUT, 2.2);
  // вытянутая голова
  D.path(c, cc => {
    cc.moveTo(2, -66); cc.bezierCurveTo(26, -66, 26, -38, 24, -18); cc.bezierCurveTo(22, -2, 12, 2, 2 + fo * 0.3, 2);
    cc.bezierCurveTo(-12, 2, -22, -4, -22, -20); cc.bezierCurveTo(-24, -40, -20, -66, 2, -66);
  }, D.rg(c, 6 + fo, -40, 3, 40, [0, '#ffd8bc', 0.6, st.skin, 1, st.skinD]), GFX.OUT, 2.8);
  if (!GFX.wire) { D.ell(c, -10 + fo, -20, 5, 3, 0, 'rgba(240,120,110,.3)', null); D.ell(c, 18 + fo, -20, 5, 3, 0, 'rgba(240,120,110,.3)', null); }
  // прищур
  const op = expr === 'shock' ? 1.2 * blink : 0.55 * blink;
  drawEye(c, -5 + fo, -34, 5, 4.4, op, lookX, lookY, 0.45, 2.4);
  drawEye(c, 13 + fo, -34, 5, 4.4, op, lookX, lookY, 0.45, 2.4);
  browPair(c, -5 + fo, 13 + fo, -41, 10, exprBrow(expr) + 0.3, '#3a2a20', 3);
  // нос
  D.path(c, cc => { cc.moveTo(4 + fo, -32); cc.lineTo(12 + fo * 1.3, -20); cc.lineTo(4 + fo, -19); }, st.skin, GFX.OUT, 2);
  // ухмылка с щербиной
  const mouth = P.mouth || 0;
  if (mouth > 0.1 || expr === 'happy') {
    drawMouth(c, 4 + fo * 1.2, -10, 16, Math.max(mouth, 0.35), 'smile', '#d86a6a', true);
    if (!GFX.wire) D.rect(c, 3 + fo * 1.2, -10.5, 2, 3.4, '#5a1f1f', null);
  } else {
    D.curve(c, -4 + fo * 1.2, -10, 4 + fo, -6, 12 + fo * 1.2, -12, GFX.OUT, 2.2);
  }
  // шелуха на губе
  if (!GFX.wire && !P.noHusk) D.ell(c, 12 + fo * 1.2, -9, 2.6, 1.4, 0.4, '#222', '#555', 0.6);
  // кепка-восьмиклинка
  D.path(c, cc => {
    cc.moveTo(-24, -48); cc.quadraticCurveTo(-26, -76, 4, -76); cc.quadraticCurveTo(30, -76, 30, -50);
    cc.quadraticCurveTo(46 + fo, -50, 44 + fo, -44); cc.lineTo(-22, -44); cc.closePath();
  }, D.lg(c, 0, -76, 0, -44, [0, '#8a8a8e', 1, '#55555a']), GFX.OUT, 2.4);
  if (!GFX.wire) {
    for (let k = -2; k <= 2; k++) D.line(c, 4 + k * 10, -74, 4 + k * 13, -48, '#4a4a4e', 1);
    D.circ(c, 4, -75, 3, '#6a6a6e', GFX.OUT, 1);
    c.save(); c.globalAlpha = 0.3;
    for (let k = 0; k < 20; k++) D.line(c, -20 + k * 2.6, -70 + (k % 3) * 6, -18 + k * 2.6, -66 + (k % 3) * 6, '#ccc', 0.8);
    c.restore();
  }
}
function drawKolHead(c, P, t, blink, st) {
  const turn = P.turn !== undefined ? P.turn : 0.6, fo = turn * 6, expr = P.expr || 'n';
  const lookX = P.lookX !== undefined ? P.lookX : turn * 0.8, lookY = P.lookY || 0;
  D.rect(c, -10, -10, 22, 14, st.skin, GFX.OUT, 2);
  // золотая цепь
  if (!GFX.wire) {
    c.beginPath(); c.moveTo(-14, 2); c.quadraticCurveTo(2, 18, 18, 2);
    c.strokeStyle = PAL.goldD; c.lineWidth = 4.4; c.stroke();
    c.strokeStyle = PAL.gold; c.lineWidth = 3; c.setLineDash([3, 2]); c.stroke(); c.setLineDash([]);
  }
  D.ell(c, -27 + fo * 0.3, -28, 7, 9, -0.2, st.skin, GFX.OUT, 2.2);
  if (turn < 0.9) D.ell(c, 31 + fo * 0.3, -28, 7, 9, 0.2, st.skin, GFX.OUT, 2.2);
  // круглая голова, щёки
  D.ell(c, 2 + fo * 0.3, -30, 29, 31, 0, D.rg(c, 6 + fo, -36, 3, 36, [0, '#ffdcc4', 0.6, st.skin, 1, st.skinD]), GFX.OUT, 2.8);
  if (!GFX.wire) {
    // бритый затылок
    c.save(); c.globalAlpha = 0.35;
    D.path(c, cc => { cc.moveTo(-26, -40); cc.quadraticCurveTo(-20, -62, 4, -61); cc.quadraticCurveTo(26, -60, 30, -40); cc.quadraticCurveTo(4, -50, -26, -40); }, '#8a7a70', null);
    c.restore();
    D.ell(c, -12 + fo, -20, 7, 4.5, 0, 'rgba(240,110,100,.45)', null);
    D.ell(c, 20 + fo, -20, 7, 4.5, 0, 'rgba(240,110,100,.45)', null);
  }
  // знаменитая чёлка
  D.path(c, cc => { cc.moveTo(-14 + fo, -58); cc.quadraticCurveTo(4 + fo, -66, 22 + fo, -56); cc.lineTo(20 + fo, -48); cc.lineTo(14 + fo, -52); cc.lineTo(8 + fo, -45); cc.lineTo(3 + fo, -51); cc.lineTo(-4 + fo, -46); cc.lineTo(-8 + fo, -52); cc.closePath(); }, '#5a3a24', GFX.OUT, 2);
  const op = expr === 'shock' ? 1.25 * blink : 0.8 * blink;
  drawEye(c, -6 + fo, -32, 5.2, 4.8, op, lookX, lookY, 0.2, 2.6);
  drawEye(c, 12 + fo, -32, 5.2, 4.8, op, lookX, lookY, 0.2, 2.6);
  browPair(c, -6 + fo, 12 + fo, -40, 10, exprBrow(expr), '#5a3a24', 2.8);
  D.ell(c, 4 + fo * 1.3, -23, 5, 4.5, 0, '#e9a68c', GFX.OUT, 1.8);
  const mouth = P.mouth || 0;
  drawMouth(c, 4 + fo * 1.2, -11, 13, mouth, expr === 'happy' ? 'smile' : expr === 'sad' ? 'frown' : 'n', '#d86a6a', true);
}

/* ============================================================
   МАМА ГЕНЫ — в окне, в бигуди и халате
   ============================================================ */
function drawMama(c, P, t) {
  const hs = MODS.bigHeads ? 1.5 : 1;
  const mouth = P.mouth || 0;
  // халат
  D.path(c, cc => { cc.moveTo(-46, 40); cc.quadraticCurveTo(-44, -6, -24, -16); cc.lineTo(26, -16); cc.quadraticCurveTo(46, -6, 48, 40); cc.closePath(); }, '#d86aa0', GFX.OUT, 2.6);
  if (!GFX.wire) {
    const r = rng(11);
    for (let k = 0; k < 10; k++) { const x = -38 + r() * 76, y = -8 + r() * 44; D.circ(c, x, y, 3.4, '#ffe36a', null); D.circ(c, x, y, 1.4, '#e8503a', null); }
    D.path(c, cc => { cc.moveTo(-12, -16); cc.lineTo(2, 10); cc.lineTo(16, -16); }, '#f4b6d4', GFX.OUT, 1.8);
  }
  // рука с поварёшкой
  const wave = Math.sin(t * 9) * 0.5;
  c.save(); c.translate(38, -4); c.rotate(-0.9 + wave);
  D.limb(c, [0, 0, 26, -18], 13, '#d86aa0');
  drawHand(c, 28, -20, 7, PAL.skinOld, 0);
  drawLadle(c, 28, -20);
  c.restore();
  c.save(); c.translate(0, -30); c.scale(hs, hs);
  D.ell(c, 0, -14, 25, 27, 0, D.rg(c, 4, -20, 2, 30, [0, '#ffe2cc', 1, PAL.skinOldD]), GFX.OUT, 2.6);
  // бигуди
  const cols = ['#ff7aa8', '#7ad0ff', '#ffe36a', '#9cf08a', '#ff7aa8', '#7ad0ff'];
  for (let k = 0; k < 6; k++) {
    const a = Math.PI * (1.08 + k * 0.17);
    const x = Math.cos(a) * 26, y = -16 + Math.sin(a) * 28;
    D.rect(c, x - 8, y - 5, 16, 10, cols[k], GFX.OUT, 1.6, 4);
  }
  drawEye(c, -8, -18, 4.6, 4, 1, 0, 0.2, 0, 2.4);
  drawEye(c, 9, -18, 4.6, 4, 1, 0, 0.2, 0, 2.4);
  browPair(c, -8, 9, -26, 10, 1.2, '#7a5a4a', 2.6);
  D.ell(c, 0, -10, 4.5, 5, 0, '#e8a690', GFX.OUT, 1.6);
  drawMouth(c, 0, 0, 13, mouth, 'frown', '#d86a6a', false);
  c.restore();
}

/* ============================================================
   КОТ БАРСИК
   ============================================================ */
function drawCat(c, P, t) {
  const pose = P.pose || 'sit';
  const col = '#e8913a', colD = '#b8621c', stripe = '#c46a1e';
  const tail = Math.sin(t * 3) * 0.3;
  D.shadow(c, 0, 1, 36, 7, 0.25);
  if (pose === 'sit') {
    D.path(c, cc => { cc.moveTo(-18, 0); cc.quadraticCurveTo(-30, -30, -10, -46); cc.quadraticCurveTo(14, -52, 20, -26); cc.quadraticCurveTo(24, -6, 16, 0); cc.closePath(); }, D.rg(c, 0, -30, 4, 40, [0, '#ffb060', 1, colD]), GFX.OUT, 2.4);
    // хвост
    c.save(); c.translate(-16, -4); c.rotate(tail);
    D.limb(c, [0, 0, -20, 2, -30, -14], 8, col);
    c.restore();
    if (!GFX.wire) for (let k = 0; k < 3; k++) D.curve(c, -14, -30 + k * 9, -4, -34 + k * 9, 6, -30 + k * 9, stripe, 2);
    D.ell(c, 6, 0, 7, 4, 0, col, GFX.OUT, 1.8);
    D.ell(c, -6, 0, 7, 4, 0, col, GFX.OUT, 1.8);
    drawCatHead(c, 8, -52, P, t);
  } else if (pose === 'walk' || pose === 'run' || pose === 'fly') {
    const sp = pose === 'run' ? 18 : pose === 'fly' ? 10 : 8;
    const ph = t * sp;
    for (let i = 0; i < 4; i++) {
      const x = i < 2 ? 18 : -18, o = i % 2 ? Math.PI : 0;
      const k = Math.sin(ph + o + (i < 2 ? 0 : 1.6));
      D.limb(c, [x + (i % 2 ? 3 : -3), -18, x + k * 10, -2 + Math.min(0, Math.cos(ph + o)) * 5], 6.5, i % 2 ? col : colD);
    }
    D.ell(c, 0, -24, 32, 15, 0, D.lg(c, 0, -40, 0, -10, [0, '#ffb060', 1, colD]), GFX.OUT, 2.4);
    if (!GFX.wire) for (let k = 0; k < 4; k++) D.curve(c, -20 + k * 10, -38, -16 + k * 10, -28, -20 + k * 10, -16, stripe, 2);
    c.save(); c.translate(-30, -28); c.rotate(-0.6 + tail * (pose === 'run' ? 0.3 : 1));
    D.limb(c, [0, 0, -18, -10, -22, -28], 7, col);
    c.restore();
    drawCatHead(c, 32, -36, P, t);
    if (P.fish) drawVobla(c, 46, -24, 0.7, 0);
  } else if (pose === 'sleep') {
    D.ell(c, 0, -12, 30, 14, 0, D.lg(c, 0, -26, 0, 0, [0, '#ffb060', 1, colD]), GFX.OUT, 2.4);
    D.limb(c, [-26, -6, -12, 2, 14, 0], 7, col);
    D.ell(c, 22, -16, 13, 11, 0, col, GFX.OUT, 2.2);
    D.poly(c, [14, -24, 17, -34, 22, -26], col, GFX.OUT, 1.8);
    D.poly(c, [24, -26, 30, -34, 32, -22], col, GFX.OUT, 1.8);
    D.curve(c, 18, -16, 21, -14, 24, -16, GFX.OUT, 1.6);
    D.curve(c, 26, -16, 29, -14, 31, -16, GFX.OUT, 1.6);
    if (!GFX.wire) D.text(c, 'z', 40 + Math.sin(t * 2) * 3, -40 - (t * 10 % 16), 12, '#fff', 'center', '700 12px ', '#335');
  }
}
function drawCatHead(c, x, y, P, t) {
  const col = '#e8913a';
  c.save(); c.translate(x, y);
  D.poly(c, [-14, -6, -12, -24, -2, -12], col, GFX.OUT, 2);
  D.poly(c, [4, -12, 14, -24, 16, -4], col, GFX.OUT, 2);
  if (!GFX.wire) D.poly(c, [-12, -10, -11, -20, -5, -12], '#ffb0a0', null);
  D.ell(c, 0, 0, 17, 14, 0, D.rg(c, 2, -4, 2, 18, [0, '#ffb466', 1, '#c9701e']), GFX.OUT, 2.2);
  // порванное ухо
  if (!GFX.wire) D.poly(c, [9, -18, 12, -15, 10, -14], '#3a2a20', null);
  const open = P.eyes !== undefined ? P.eyes : blinkAt(t, 0.33);
  if (open > 0.3) {
    D.ell(c, -6, -2, 4, 4.5 * open, 0, '#d9f05a', GFX.OUT, 1.4);
    D.ell(c, 7, -2, 4, 4.5 * open, 0, '#d9f05a', GFX.OUT, 1.4);
    if (!GFX.wire) { D.ell(c, -5, -2, 1, 3.6 * open, 0, '#111', null); D.ell(c, 8, -2, 1, 3.6 * open, 0, '#111', null); }
  } else {
    D.curve(c, -9, -2, -6, 0, -3, -2, GFX.OUT, 1.5); D.curve(c, 4, -2, 7, 0, 10, -2, GFX.OUT, 1.5);
  }
  D.poly(c, [-1, 4, 3, 4, 1, 7], '#e86a7a', GFX.OUT, 1);
  if (!GFX.wire) {
    for (let k = -1; k <= 1; k++) { D.line(c, -6, 7 + k * 2, -20, 5 + k * 4, '#fff', 0.8); D.line(c, 8, 7 + k * 2, 22, 5 + k * 4, '#fff', 0.8); }
  }
  if (P.mouth > 0.2) D.ell(c, 1, 10, 4, 3 * P.mouth, 0, '#7a2a2a', GFX.OUT, 1.2);
  c.restore();
}

/* ============================================================
   ГОЛУБИ
   ============================================================ */
function drawPigeon(c, x, y, s, face, t, mode, seed) {
  c.save(); c.translate(x, y); c.scale(s * face, s);
  const peck = mode === 'peck' ? Math.max(0, Math.sin(t * 7 + seed * 10)) : 0;
  if (mode === 'fly') {
    const w = Math.sin(t * 22 + seed * 6);
    D.ell(c, 0, -10, 14, 8, -0.15, '#9aa2b2', GFX.OUT, 1.8);
    D.path(c, cc => { cc.moveTo(-4, -12); cc.quadraticCurveTo(-8, -22 - w * 16, 6, -26 - w * 18); cc.quadraticCurveTo(6, -16, 4, -10); cc.closePath(); }, '#7d8696', GFX.OUT, 1.6);
    D.circ(c, 14, -14, 6, '#8a92a2', GFX.OUT, 1.6);
    if (!GFX.wire) { D.circ(c, 16, -15, 1.4, '#e86a2a', null); D.poly(c, [19, -14, 24, -13, 19, -12], '#e8c0a0', null); }
    D.poly(c, [-14, -10, -24, -14, -22, -6], '#6d7686', GFX.OUT, 1.4);
    c.restore(); return;
  }
  D.line(c, -2, -4, -3, 0, '#d0607a', 1.8); D.line(c, 3, -4, 4, 0, '#d0607a', 1.8);
  D.ell(c, 0, -10, 13, 8, 0, D.lg(c, 0, -18, 0, -2, [0, '#b2bac8', 1, '#7d8696']), GFX.OUT, 1.8);
  if (!GFX.wire) { D.curve(c, -8, -12, -2, -8, 6, -12, '#5d6676', 1.4); D.curve(c, -6, -9, 0, -6, 6, -9, '#5d6676', 1.2); }
  D.poly(c, [-12, -10, -22, -12, -20, -6], '#6d7686', GFX.OUT, 1.4);
  c.save(); c.translate(9, -14); c.rotate(peck * 1.1);
  // переливающаяся шея
  D.ell(c, 2, -4, 6, 7, 0, D.lg(c, 0, -10, 0, 2, [0, '#7a8494', 0.5, '#5aa88a', 1, '#8a5aa8']), GFX.OUT, 1.6);
  D.circ(c, 4, -9, 5, '#8a92a2', GFX.OUT, 1.6);
  if (!GFX.wire) { D.circ(c, 5.5, -10, 1.4, '#e86a2a', null); D.circ(c, 5.5, -10, 0.6, '#111', null); }
  D.poly(c, [8, -9, 13, -8, 8, -7], '#e8c0a0', GFX.OUT, 0.8);
  c.restore();
  c.restore();
}
