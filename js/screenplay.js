'use strict';
/* ============================================================
   СЦЕНАРИЙ «В мире скуфов. Серия 1: Пиво и честь»
   Каждая сцена: такты (реплики и паузы), звуковые подсказки
   и функция render(R), которая по времени расставляет актёров
   и камеру. Всё — чистая функция от времени, поэтому мультфильм
   можно перематывать в любую сторону.
   ============================================================ */

/* ---------------- помощники блокировки ---------------- */
function mv(t, t0, t1, a, b, e) { return lerp(a, b, tw(t, t0, t1, e)); }
/** ходьба из x0 в x1 за t0..t1 */
function walkTo(t, t0, t1, x0, x1, e) {
  const p = tw(t, t0, t1, e || E.lin);
  const x = lerp(x0, x1, p);
  const on = t > t0 && t < t1;
  const ph = Math.abs(x - x0) * 0.075;
  return {
    x, face: x1 >= x0 ? 1 : -1,
    pose: on ? { legs: 'walk', walk: ph, bob: -Math.abs(Math.sin(ph)) * 4, arms: { L: 'swing', R: 'swing' } } : { legs: 'stand' },
    on
  };
}
function idleBob(t, k) { return Math.sin(t * 2.2 + (k || 0)) * 1.5; }
function camK(R, ks) { const v = keys(R.t, ks); R.cam.x = v.x; R.cam.y = v.y; R.cam.z = v.z; }
function hourKind() {
  const h = new Date().getHours();
  return h < 5 ? 'n' : h < 11 ? 'm' : h < 17 ? 'd' : h < 23 ? 'e' : 'n';
}
const RESOLVE = {
  gTime: () => 'g15' + hourKind(),
  valMods: () => MODS.hair !== 0 ? 'v06h' : MODS.belly < 0.85 ? 'v06t' : MODS.belly > 1.2 ? 'v06f' : 'v06d',
};

/* позиции */
const POS = {
  val: { x: 925, y: 1000 }, zin: { x: 1085, y: 1000 },
  genaBench: { x: 1275, y: 1066 },
  car: { x: 2680, y: 1085 },
  genaCar: { x: 2990, y: 1096 },
  vov: { x: 3170, y: 1074 }, kol: { x: 3300, y: 1068 },
  kiosk: { x: 4010, y: 1042 },
};
/** бабушки на лавочке — используется во многих сценах */
function babkiOnBench(R, opt) {
  opt = opt || {};
  const t = R.t;
  R.add('val', Object.assign({ x: POS.val.x, y: POS.val.y, face: 1, legs: 'sit', seat: 62, swing: 3, arms: { L: 'lap', R: 'lap' }, holdR: 'knitting', turn: 0.3, bob: idleBob(t, 1) * 0.4 }, opt.val || {}));
  R.add('zin', Object.assign({ x: POS.zin.x, y: POS.zin.y, face: 1, legs: 'sit', seat: 62, swing: 2, arms: { L: 'lap', R: 'lap' }, holdL: 'cane', itemAngL: 0.2, turn: 0.3, bob: idleBob(t, 2) * 0.4 }, opt.zin || {}));
}
function pigeonsAt(R, x0, x1, y, n, scatterT, seed) {
  R.add('pigeons', { x: x0, y, x1, n, scatterT, seed: seed || 1, z: y });
}

/* ============================================================
   СЦЕНЫ
   ============================================================ */
const SCENES = [

/* ---------- 0. Пролог: район на рассвете ---------- */
{
  id: 'intro', set: 'wide', music: 'doc', tod: t => mv(t, 0, 12, 0.0, 0.12),
  beats: ['~1.6', 'n01', 'n02', '~0.4'],
  cues: [[0.2, 'tvOn'], [3, 'caw'], [7.5, 'caw']],
  render(R) {
    const d = R.d, w = WIDE.genaWin;
    R.cam.x = mv(R.t, 0, d, 1000, w.x, E.io);
    R.cam.y = mv(R.t, 0, d, 560, w.y - 30, E.io);
    R.cam.z = mv(R.t, 0, d, 0.92, 2.2, E.in);
    R.fx.fadeIn = 1.2;
    R.fx.birds = true;
    R.fx.letter = 1;
  }
},

/* ---------- 1. Титр ---------- */
{
  id: 'title', set: 'wide', music: 'doc', tod: 0.13,
  beats: ['~0.5', '@stamp:0.4', 'n03', '~1.8'],
  cues: [['stamp', 'stamp']],
  render(R) {
    const w = WIDE.genaWin;
    R.cam.x = w.x; R.cam.y = w.y - 30; R.cam.z = mv(R.t, 0, R.d, 2.2, 2.6);
    R.fx.title = tw(R.t, R.at('stamp') - 0.1, R.at('stamp') + 0.35, E.back);
    R.fx.titleOut = tw(R.t, R.d - 0.7, R.d);
    R.fx.letter = 1;
    R.fx.fadeOut = 0.5;
  }
},

/* ---------- 2. Окно: пробуждение ---------- */
{
  id: 'window', set: 'yard', music: 'lazy', tod: 0.22, chapter: ['Глава 1', 'Пробуждение'],
  beats: ['@open:1.8', 'n04', '@yawn:0.5', 'g01', 'n05', 'm01/0.1', 'g02/0.1', 'm02', '@slam:0.9', 'n06', '~0.5'],
  cues: [[0.4, 'windowCreak'], ['yawn', 'yawnStretch'], ['m01-0.2', 'windowCreak'], ['slam+0.2', 'doorSlam'], [1.2, 'coo']],
  render(R) {
    const t = R.t;
    R.fx.fadeIn = 0.6;
    camK(R, [
      [0, { x: 1060, y: 400, z: 2.2 }],
      [R.at('n05'), { x: 1060, y: 420, z: 2.0 }],
      [R.end('n05'), { x: 1080, y: 440, z: 1.75 }],
      [R.at('m01') + 0.3, { x: 1185, y: 450, z: 1.55 }],
      [R.end('m02') + 0.4, { x: 1185, y: 450, z: 1.55 }],
      [R.at('n06') + 0.6, { x: 1070, y: 440, z: 1.95 }],
      [R.d, { x: 1070, y: 450, z: 2.05 }],
    ]);
    const rise = tw(t, 0.5, 1.4, E.back);
    const mamaOn = t > R.at('m01') - 0.3 && t < R.at('slam') + 0.4;
    let expr = 'sleepy', turn = 0.1, arms = { L: 'down', R: 'down' }, lookX = 0;
    if (R.in('yawn') || R.in('g01')) { arms = { L: 'up', R: 'up' }; expr = 'sleepy'; }
    if (R.in('g01') && R.since('g01') > 1.2) arms = { L: 'down', R: 'belly' };
    if (R.in('n05')) { arms = { L: 'down', R: R.since('n05') < 4 ? 'belly' : 'scratchHead' }; expr = 'smug'; turn = 0.3; }
    if (t > R.at('m01')) { turn = 0.9; lookX = 1; expr = 'shock'; }
    if (R.in('g02')) { expr = 'angry'; arms = { L: 'shrug', R: 'shrug' }; }
    if (R.in('m02')) { expr = 'sad'; }
    if (t > R.at('slam')) { turn = 0.2; lookX = 0; expr = 'sad'; }
    if (R.in('n06')) arms = { L: 'down', R: 'chin' };
    const sink = tw(t, R.d - 0.6, R.d, E.in);
    R.add('genaWindow', {
      open: tw(t, 0.2, 0.9, E.out), z: 0,
      gena: rise > 0.01 ? { y: 486 - rise * 6 + sink * 70, lean: 0.12, expr, turn, lookX, arms, mouth: R.in('yawn') ? 1 : undefined, mouthBoost: R.in('g01') && R.since('g01') < 1 ? 0.7 : 0 } : null
    });
    R.add('mamaBalcony', { show: mamaOn ? tw(t, R.at('m01') - 0.3, R.at('m01'), E.back) * (1 - tw(t, R.at('slam'), R.at('slam') + 0.3)) : 0, z: 1 });
    pigeonsAt(R, 950, 1150, 1080, 4, null, 3);
  }
},

/* ---------- 3. Подъезд и лавочка ---------- */
{
  id: 'podyezd', set: 'yard', music: [[0, null], ['n08', 'babki']], tod: 0.3, chapter: ['Глава 2', 'Лавочка'],
  beats: ['@domofon:1.7', '@exit:2.6', 'n07', 'n08', 'v01', 'z01/0.3', 'g03', 'v02', 'z01#2/0.3', 'g04', 'z03', '~0.4', 'n09', '@leave:2.0'],
  cues: [[0.15, 'domofon'], ['exit', 'doorOpen'], ['exit+1.8', 'doorSlam'], ['leave+0.7', 'flutter'], ['leave+0.9', 'coo']],
  render(R) {
    const t = R.t;
    camK(R, [
      [0, { x: 760, y: 760, z: 1.45 }],
      [R.at('exit') + 1.6, { x: 900, y: 790, z: 1.3 }],
      [R.at('n08'), { x: 1000, y: 820, z: 1.35 }],
      [R.end('n08'), { x: 1060, y: 830, z: 1.4 }],
      [R.at('n09'), { x: 1060, y: 830, z: 1.4 }],
      [R.at('n09') + 1.4, { x: 1085, y: 880, z: 2.3 }],
      [R.end('n09'), { x: 1085, y: 880, z: 2.4 }],
      [R.d, { x: 1250, y: 820, z: 1.3 }],
    ]);
    // дверь
    const ex = R.at('exit');
    R.add('door', { open: tw(t, ex, ex + 0.4, E.out) * (1 - tw(t, ex + 1.6, ex + 1.85, E.in)), z: -1 });
    // Гена выходит из подъезда и подходит к лавочке
    let gx, gy, face = 1, pose = { legs: 'stand' };
    const tExit0 = ex + 0.2, tExit1 = ex + 1.3, tWalk1 = R.at('n07') + 3.2;
    if (t < tExit0) { gx = -1000; gy = 900; }
    else if (t < tExit1) { const p = tw(t, tExit0, tExit1); gx = lerp(700, 760, p); gy = lerp(902, 1010, p); const ph = p * 9; pose = { legs: 'walk', walk: ph, bob: -Math.abs(Math.sin(ph)) * 4, arms: { L: 'swing', R: 'swing' } }; }
    else { const w = walkTo(t, tExit1, tWalk1, 760, POS.genaBench.x); gx = w.x; gy = lerp(1010, POS.genaBench.y, tw(t, tExit1, tWalk1)); face = w.face; pose = w.pose; }
    const leave = walkTo(t, R.at('leave') + 0.2, R.at('leave') + 2.2, POS.genaBench.x, 1800);
    let expr = 'n', turn = 0.5, arms = pose.arms || { L: 'down', R: 'down' };
    if (t >= tWalk1) { face = -1; turn = 0.6; }
    if (R.in('v01') || R.in('z01')) { expr = 'smug'; }
    if (R.in('g03')) { expr = 'happy'; arms = { L: 'down', R: 'wave' }; }
    if (R.in('v02')) { expr = 'sad'; }
    if (R.in('z01#2')) { expr = 'shock'; }
    if (R.in('g04')) { expr = 'smug'; arms = { L: 'hips', R: 'hips' }; }
    if (R.in('z03')) { expr = 'shock'; }
    if (t > R.at('n09')) { expr = 'sad'; turn = 0.1; }
    if (t > R.at('leave') + 0.2) { gx = leave.x; face = leave.face; pose = leave.pose; arms = pose.arms; expr = 'n'; }
    if (gx > -500) R.add('gen', Object.assign({ x: gx, y: gy, face, expr, turn, holdL: 'bag', stepSnd: 'flip', s: 1 + (gy - 1060) * 0.0016 }, pose, { arms }));
    // бабушки: синхронно поворачивают головы
    const look = gx > -500 ? (gx > 1000 ? 0.8 : -0.7) : (t > 0.4 ? -0.8 : 0.3);
    const zinAngry = R.in('z01') || R.in('z01#2') || R.in('z03');
    babkiOnBench(R, {
      val: { turn: look, lookX: look, expr: R.in('v01') || R.in('v02') ? 'smug' : 'n', arms: R.in('v02') ? { L: 'lap', R: 'point' } : { L: 'lap', R: 'lap' }, holdR: R.in('v02') ? null : 'knitting' },
      zin: { turn: look, lookX: look, expr: zinAngry ? 'angry' : t > R.at('n09') && t < R.end('n09') ? 'angry' : 'n', arms: zinAngry ? { L: 'fist', R: 'lap' } : { L: 'lap', R: 'lap' }, bob: zinAngry ? -Math.abs(Math.sin(t * 12)) * 5 : 0, itemAngL: zinAngry ? -0.6 : 0.2, eyes: t > R.at('n09') + 2 && t < R.at('n09') + 2.15 ? 0.05 : undefined },
    });
    pigeonsAt(R, 1340, 1520, 1088, 6, R.at('leave') + 0.7, 5);
    R.add('cat', { x: 120, y: 878, face: 1, pose: 'sleep', z: 870 });
  }
},

/* ---------- 4. Ларёк ---------- */
{
  id: 'kiosk', set: 'yard', music: 'dvor', tod: 0.38, chapter: ['Глава 3', 'Водопой'],
  beats: ['@walk:0.6', 'n10', '@arrive:1.0', 'g05', '@buy:1.8', 'g06', 'n11', '~0.4'],
  cues: [['buy+0.2', 'kiosk'], ['buy+0.6', 'coin'], ['buy+1.0', 'clink'], ['buy+1.3', 'paper']],
  render(R) {
    const t = R.t;
    const w = walkTo(t, 0, R.at('arrive') + 0.4, 2350, POS.kiosk.x);
    const back = walkTo(t, R.at('n11') + 2.0, R.d + 0.6, POS.kiosk.x, 3650);
    let gx = w.x, face = w.face, pose = w.pose;
    const fast = t < R.at('arrive');
    if (t > R.at('n11') + 2.0) { gx = back.x; face = back.face; pose = back.pose; }
    R.fx.ff = fast ? 1 : 0;
    camK(R, [
      [0, { x: 2450, y: 820, z: 1.25 }],
      [R.at('arrive') + 0.4, { x: 3990, y: 830, z: 1.35 }],
      [R.at('g05') + 0.4, { x: 4060, y: 860, z: 1.7 }],
      [R.end('g06'), { x: 4040, y: 850, z: 1.6 }],
      [R.d, { x: 3780, y: 830, z: 1.4 }],
    ]);
    if (fast) R.cam.x = gx + 120;
    let expr = 'n', arms = pose.arms || { L: 'down', R: 'down' }, turn = 0.6, lookY = 0;
    const has = t > R.at('buy') + 1.0;
    if (R.in('g05')) { expr = 'n'; arms = { L: 'down', R: 'chin' }; lookY = -0.6; }
    if (R.in('buy')) { arms = { L: 'down', R: R.since('buy') < 1.2 ? 'give' : 'front' }; }
    if (R.in('g06')) { expr = 'happy'; arms = { L: 'shrug', R: 'shrug' }; }
    if (R.in('n11')) { expr = 'happy'; turn = 0.2; arms = { L: 'front', R: 'frontHigh' }; }
    R.add('gen', Object.assign({ x: gx, y: POS.kiosk.y, face, expr, turn, lookY, stepSnd: 'flip', walkRate: fast ? 3 : 1 }, pose, {
      arms, holdR: has ? 'can' : null, holdL: has ? 'vobla' : 'bag', itemAngL: has ? -0.4 : 0,
    }));
    // рука продавщицы из окошка
    if (R.in('buy')) R.add('kioskHand', { p: R.since('buy'), z: 900 });
  }
},

/* ---------- 5. Машина ---------- */
{
  id: 'car', set: 'yard', music: 'dvor', tod: 0.44, chapter: ['Глава 4', 'Ласточка'],
  beats: ['~0.3', 'n12', 'g07', '@starter:2.3', '@backfire:1.3', 'g08', '~0.6'],
  cues: [['starter+0.1', 'starter'], ['backfire', 'backfire'], ['g08', 'doorOpen']],
  render(R) {
    const t = R.t;
    const w = walkTo(t, 0, 3.4, 3400, POS.genaCar.x);
    camK(R, [
      [0, { x: 3050, y: 830, z: 1.2 }],
      [R.at('g07'), { x: 2900, y: 870, z: 1.55 }],
      [R.at('starter'), { x: 2780, y: 850, z: 1.25 }],
      [R.at('g08'), { x: 2930, y: 880, z: 1.65 }],
      [R.d, { x: 2930, y: 880, z: 1.7 }],
    ]);
    let pose = w.pose, arms = pose.arms || { L: 'down', R: 'down' }, expr = 'n', turn = 0.6, face = w.on ? -1 : -1;
    if (R.in('g07')) { expr = 'happy'; arms = { L: 'down', R: [-38, -150 + Math.sin(t * 8) * 6] }; }
    if (R.in('starter')) { arms = { L: 'down', R: 'point' }; expr = 'n'; }
    if (R.in('backfire')) { expr = 'shock'; arms = { L: 'up', R: 'up' }; }
    if (R.in('g08')) { arms = { L: 'down', R: 'scratchHead' }; expr = 'sad'; }
    const hop = R.in('backfire') ? -Math.max(0, Math.sin(R.since('backfire') * 8)) * 26 * (1 - R.p('backfire')) : 0;
    const onHood = t > R.at('g07') - 0.6;
    R.add('gen', Object.assign({ x: w.x, y: POS.genaCar.y, face, expr, turn, stepSnd: 'flip' }, pose, { arms, bob: (pose.bob || 0) + hop, holdR: onHood ? null : 'can', holdL: onHood ? null : 'vobla' }));
    const shake = R.in('starter') ? 1 : R.in('backfire') ? 0.5 * (1 - R.p('backfire')) : 0;
    R.add('car', { x: POS.car.x, y: POS.car.y, shake, hood: tw(t, R.at('g08'), R.at('g08') + 0.6, E.back), z: POS.car.y });
    if (onHood) { R.add('can', { x: 2830, y: 984, z: POS.car.y + 1 }); R.add('vobla', { x: 2770, y: 980, z: POS.car.y + 1 }); }
    if (R.in('starter') && Math.floor(t * 6) !== Math.floor((t - R.dt) * 6)) BURST.smoke(POS.car.x - 240, POS.car.y - 50, 2);
    if (R.cross('backfire')) { BURST.smoke(POS.car.x - 250, POS.car.y - 50, 18, '#3a3a3e'); R.fx.shake = 1; }
  }
},

/* ---------- 6. Гопники ---------- */
{
  id: 'gopniki', set: 'yard', music: [[0, 'dvor'], ['bass', 'hardbass']], tod: 0.5, chapter: ['Глава 5', 'Брачный зов'],
  beats: ['@bass:1.4', 'n13', 'n14', 'o01', 'g09', 'k01', 'g10', '@recog:0.7', 'k02', 'o02', 'g11', '@cutA:0.15', 'v03', '~0.2', '@cutB:0.15', 'o03', '@cutC:0.15', 'z04', '~0.3', '@cutD:0.15', 'k03', '~0.5'],
  cues: [],
  render(R) {
    const t = R.t;
    const inBabki = (t >= R.at('cutA') && t < R.at('cutB')) || (t >= R.at('cutC') && t < R.at('cutD'));
    if (inBabki) {
      R.cam.x = 1000; R.cam.y = 880; R.cam.z = 1.9;
      const v = t < R.at('cutB');
      babkiOnBench(R, {
        val: { turn: 0.9, lookX: 1, expr: 'angry', arms: v ? { L: 'lap', R: 'fist' } : { L: 'lap', R: 'lap' }, holdR: v ? null : 'knitting', bob: v ? -Math.abs(Math.sin(t * 12)) * 4 : 0 },
        zin: { turn: 0.9, lookX: 1, expr: 'angry', arms: !v ? { L: 'fist', R: 'lap' } : { L: 'lap', R: 'lap' }, itemAngL: !v ? -0.6 : 0.2, bob: !v ? -Math.abs(Math.sin(t * 12)) * 5 : 0 },
      });
      R.fx.whip = 0.15;
      return;
    }
    camK(R, [
      [0, { x: 3050, y: 860, z: 1.45 }],
      [R.at('n13') + 1.2, { x: 3200, y: 850, z: 1.3 }],
      [R.at('n14'), { x: 3240, y: 900, z: 1.75 }],
      [R.end('n14'), { x: 3240, y: 900, z: 1.85 }],
      [R.at('o01') + 0.2, { x: 3110, y: 860, z: 1.35 }],
      [R.at('recog'), { x: 3110, y: 860, z: 1.4 }],
      [R.at('k02') + 0.2, { x: 3200, y: 900, z: 1.85 }],
      [R.at('o02') + 0.2, { x: 3110, y: 860, z: 1.35 }],
      [R.d, { x: 3110, y: 860, z: 1.4 }],
    ]);
    // Гена у машины, держит пиво
    let gArms = { L: 'front', R: 'front' }, gExpr = 'n', gTurn = 0.7;
    const picked = t > 0.7;
    if (!picked) gArms = { L: 'down', R: 'scratchHead' };
    if (t > R.at('n13') && t < R.at('o01')) { gExpr = 'shock'; gTurn = 0.9; }
    if (R.in('g09')) { gExpr = 'smug'; gArms = { L: 'cross', R: 'frontHigh' }; }
    if (R.in('g10')) { gExpr = 'smug'; gArms = { L: 'front', R: 'point' }; }
    if (R.in('k02') || R.in('recog')) gExpr = 'happy';
    if (R.in('g11')) { gExpr = 'smug'; gArms = { L: 'cross', R: 'frontHigh' }; }
    if (t > R.at('cutB')) { gExpr = 'sad'; gTurn = 0.2; }
    R.add('gen', { x: POS.genaCar.x, y: POS.genaCar.y, face: 1, expr: gExpr, turn: gTurn, arms: gArms, holdR: picked ? 'can' : null, holdL: picked ? 'vobla' : null, itemAngL: -0.5, bob: idleBob(t) });
    R.add('car', { x: POS.car.x, y: POS.car.y, hood: 1 - tw(t, 0.2, 0.6), z: POS.car.y });
    if (!picked) { R.add('can', { x: 2830, y: 984, z: POS.car.y + 1 }); R.add('vobla', { x: 2770, y: 980, z: POS.car.y + 1 }); }
    // гопники: приходят под хардбас, садятся на корточки
    const beat = (t - R.at('bass')) * 2.5;
    const arrive = R.at('n13') + 3.4;
    const stand = t > R.at('k02') - 0.1;
    const gop = (who, x1, dly, extra) => {
      const w = walkTo(t, R.at('bass') + dly, arrive + dly, 3800 + dly * 200, x1);
      let pose;
      if (w.on) pose = { legs: 'walk', walk: w.pose.walk, bob: -Math.abs(Math.sin(beat * Math.PI)) * 9, arms: { L: 'pump', R: 'swing' }, beat };
      else if (stand) pose = { legs: 'stand', arms: { L: 'down', R: 'down' }, bob: idleBob(t, x1) };
      else {
        const sq = tw(t, arrive + dly, arrive + dly + 0.4, E.out);
        pose = sq < 1 ? { legs: 'stand', bob: sq * 40 } : { legs: 'squat', arms: { L: 'knee', R: Math.sin(t * 1.3 + dly * 5) > 0.3 ? 'mouth' : 'knee' } };
      }
      R.add(who, Object.assign({ x: w.x, y: who === 'vov' ? POS.vov.y : POS.kol.y, face: w.on ? -1 : -1, turn: 0.7, stepSnd: 'shoe' }, pose, extra(pose)));
    };
    gop('vov', POS.vov.x, 0, p => {
      const o = { holdR: null, expr: 'n' };
      if (R.in('o01')) { o.expr = 'smug'; o.arms = p.legs === 'squat' ? { L: 'knee', R: 'point' } : o.arms; }
      if (R.in('o02')) { o.expr = 'happy'; o.arms = { L: 'down', R: 'wave' }; }
      if (R.in('o03')) { o.expr = 'happy'; o.arms = { L: 'down', R: [-10, -140] }; o.turn = -0.6; o.lookX = -1; }
      if (t > R.at('cutB') && t < R.at('o03')) { o.turn = -0.8; o.lookX = -1; }
      return o;
    });
    gop('kol', POS.kol.x, 0.35, p => {
      const o = { holdL: 'phone', holdR: p.legs === 'squat' ? 'seeds' : null, expr: 'n' };
      if (R.in('k01')) o.expr = 'smug';
      if (R.in('recog')) { o.expr = 'shock'; o.eyes = 1.3; }
      if (R.in('k02')) { o.expr = 'shock'; o.arms = { L: 'down', R: 'up' }; }
      if (R.in('k03')) { o.expr = 'sad'; o.turn = -0.4; }
      return o;
    });
    // семечки: шелуха летит
    if (t > arrive + 0.5 && !stand && Math.floor(t * 1.7) !== Math.floor((t - R.dt) * 1.7)) { BURST.husks(POS.vov.x - 20, POS.vov.y - 110, -1); R.sfx('seed'); }
    if (t > arrive + 0.5 && !stand && Math.floor(t * 1.3 + 0.5) !== Math.floor((t - R.dt) * 1.3 + 0.5)) { BURST.husks(POS.kol.x - 20, POS.kol.y - 100, -1); R.sfx('seed'); }
    if (t > R.at('bass') && t < arrive && Math.floor(beat) !== Math.floor(beat - R.dt * 2.5)) BURST.notes(3800 - (t - R.at('bass')) * 120, 900, '#ff7ad8');
  }
},

/* ---------- 7. Ритуал воблы и роковая банка ---------- */
{
  id: 'vobla', set: 'yard', music: 'tension', tod: 0.53, chapter: ['Глава 6', 'Ритуал'],
  beats: ['~0.3', 'n15', '@hit:2.8', 'k04', 'n16', '@turn:0.9', 'g12', '@open:0.7', '@gush:1.7'],
  cues: [['hit+0.2', 'voblaHit'], ['hit+0.85', 'voblaHit'], ['hit+1.5', 'voblaHit'], ['hit+2.15', 'voblaHit'], ['open', 'canOpen'], ['gush', 'gush'], ['gush+0.9', 'splat']],
  render(R) {
    const t = R.t;
    camK(R, [
      [0, { x: 3080, y: 860, z: 1.35 }],
      [R.at('hit'), { x: 2950, y: 880, z: 1.6 }],
      [R.at('k04'), { x: 3060, y: 870, z: 1.45 }],
      [R.at('n16'), { x: 3150, y: 900, z: 1.6 }],
      [R.end('n16') - 1, { x: 3020, y: 930, z: 2.2 }],
      [R.at('turn') + 0.5, { x: POS.genaCar.x, y: 900, z: 2.0 }],
      [R.at('gush'), { x: POS.genaCar.x + 18, y: 940, z: 2.4 }],
      [R.at('gush') + 0.5, { x: POS.genaCar.x + 18, y: 940, z: 4.2 }],
      [R.d, { x: POS.genaCar.x + 18, y: 940, z: 4.4 }],
    ]);
    const gave = t > R.at('n15') + 1.2 && t < R.at('k04') + 1.4;
    let gArms = { L: 'down', R: 'front' }, gExpr = 'n', gTurn = 0.6, face = -1;
    if (R.in('n15') && R.since('n15') < 1.5) { gArms = { L: 'down', R: 'give' }; face = 1; }
    if (R.in('hit')) { gArms = { L: 'down', R: 'hit' }; gExpr = 'angry'; face = -1; }
    if (R.in('k04')) { face = 1; gArms = { L: 'down', R: 'give' }; }
    if (R.in('n16')) { face = 1; gArms = { L: 'down', R: 'front' }; gExpr = 'happy'; gTurn = 0.4; }
    if (t > R.at('turn')) { face = 1; gTurn = 0; gArms = { L: 'down', R: 'raise' }; gExpr = 'happy'; }
    if (t > R.at('open')) { gExpr = 'shock'; gArms = { L: 'up', R: 'raise' }; }
    const hitPh = R.in('hit') ? R.since('hit') : 0;
    R.add('gen', {
      x: POS.genaCar.x, y: POS.genaCar.y, face, expr: gExpr, turn: gTurn, arms: gArms, bob: idleBob(t),
      holdR: R.in('hit') ? 'vobla' : gave ? null : 'can', holdL: R.in('hit') ? null : 'vobla', itemAngL: -0.5,
      canOpen: t > R.at('open'), wet: t > R.at('gush') + 0.3,
    });
    const dents = (t > R.at('hit') + 0.2) + (t > R.at('hit') + 0.85) + (t > R.at('hit') + 1.5) + (t > R.at('hit') + 2.15);
    const hitShake = R.in('hit') ? Math.max(0, 1 - ((hitPh - 0.2) % 0.65) * 4) : 0;
    R.add('car', { x: POS.car.x, y: POS.car.y, shake: hitShake * 0.6, dents, sink: dents * 1.5, z: POS.car.y });
    // Вован на корточках, Колян трясёт банку в хардбасе
    R.add('vov', { x: POS.vov.x, y: POS.vov.y, face: -1, legs: 'squat', arms: { L: 'knee', R: 'mouth' }, expr: R.in('n16') ? 'shock' : 'n', turn: 0.7 });
    const dancing = gave && !R.in('k04');
    R.add('kol', {
      x: POS.kol.x - (R.in('k04') ? 60 : 0), y: POS.kol.y, face: -1,
      legs: dancing ? 'dance' : 'stand', beat: t * 2.5, bob: dancing ? -Math.abs(Math.sin(t * 2.5 * Math.PI)) * 10 : 0,
      arms: dancing ? { L: 'pump', R: 'pump' } : R.in('k04') ? { L: 'down', R: 'give' } : { L: 'down', R: 'down' },
      holdR: gave ? 'can' : null, itemAngR: dancing ? Math.sin(t * 30) * 0.5 : 0, expr: dancing ? 'happy' : 'n', turn: 0.6,
    });
    if (dancing && Math.floor(t * 2.5) !== Math.floor((t - R.dt) * 2.5)) { BURST.notes(POS.kol.x, POS.kol.y - 260, '#7dffa8'); }
    if (R.cross('hit+0.2') || R.cross('hit+0.85') || R.cross('hit+1.5') || R.cross('hit+2.15')) { R.fx.shake = 0.6; BURST.dust(2850, 990, 5); }
    // фонтан пива
    if (t > R.at('open') && t < R.at('gush') + 1.2) {
      const k = t < R.at('gush') ? 0.3 : 1;
      if (Math.random() < 0.9) BURST.foam(POS.genaCar.x + 30, POS.genaCar.y - 230, Math.ceil(6 * k), 0.3, -1, 1.6);
    }
    if (R.cross('gush')) R.fx.splashHit = true;
    R.fx.flash = R.in('gush') ? Math.max(0, 1 - R.since('gush') * 3) * 0.7 : 0;
    R.fx.splash = t > R.at('gush');
  }
},

/* ---------- 8. ФИЧА: мультфильм ломается ---------- */
{
  id: 'crash', set: 'yard', feature: true, tod: 0.55,
  music: [[0, null], ['reveal', 'chip']],
  beats: ['@short:1.4', '@freeze:1.1', '@black:0.5', '@bsod:0.5', 's01', '@cursor:1.7', '@grab:1.5', 'g13', '@reveal:1.6', 'n17', 'g14', 'v04', 'o04', 'n18', '?gTime', '@gravity:0.5', 's02', 'v05/0.05', 'z05', 'n19', '~0.4'],
  cues: [[0.05, 'zap'], [0.5, 'glitch'], [0.9, 'zap'], ['freeze', 'glitch'], ['freeze+0.5', 'powerDown'], ['bsod', 'errorDing'], ['grab+0.2', 'swish'], ['grab+0.8', 'whoosh'], ['reveal', 'powerUp'], ['gravity', 'boing']],
  render(R) {
    const t = R.t;
    const wireOn = t > R.at('grab') + 0.7;
    R.fx.wire = wireOn && t < R.at('n19') + 4.6;
    R.fx.wireFlash = R.in('n19') ? tw(t, R.at('n19') + 4.4, R.at('n19') + 4.9) : 0;
    R.fx.splash = t < R.at('black');
    R.fx.glitch = t < R.at('black') ? 0.3 + tw(t, 0, R.at('black')) * 0.9 : wireOn ? 0.08 * Math.max(0, Math.sin(t * 7)) : 0;
    R.fx.sparks = t < R.at('freeze') + 0.6;
    R.fx.crt = R.in('freeze') ? tw(t, R.at('freeze') + 0.4, R.end('freeze'), E.in) : 0;
    R.fx.black = t >= R.at('black') && t < R.at('grab') + 0.7;
    R.fx.bsod = t >= R.at('bsod') && t < R.end('grab');
    R.fx.bsodIn = tw(t, R.at('bsod'), R.at('bsod') + 0.3, E.back);
    R.fx.cursor = R.in('cursor') ? R.p('cursor', E.io) : t >= R.end('cursor') ? 1 : 0;
    R.fx.grab = R.in('grab') ? R.p('grab') : t >= R.end('grab') ? 1 : 0;
    R.fx.labels = wireOn ? tw(t, R.at('reveal'), R.at('reveal') + 1.2) : 0;
    R.fx.code = wireOn;
    // камера
    const W = POS.genaCar;
    if (t < R.at('black')) {
      R.cam.x = W.x + 18; R.cam.y = 940; R.cam.z = 4.4;
    } else {
      camK(R, [
        [R.at('grab'), { x: W.x, y: 860, z: 2.4 }],
        [R.at('reveal'), { x: W.x, y: 860, z: 2.4 }],
        [R.at('reveal') + 1.5, { x: 2060, y: 760, z: 0.6 }],
        [R.end('n18'), { x: 2060, y: 760, z: 0.6 }],
        [R.at('gTime') + 0.6, { x: W.x, y: 870, z: 2.2 }],
        [R.end('gTime'), { x: W.x, y: 870, z: 2.2 }],
        [R.at('s02') + 0.5, { x: 2060, y: 690, z: 0.6 }],
        [R.d, { x: 2060, y: 690, z: 0.6 }],
      ]);
    }
    // невесомость: всё медленно всплывает
    const fl = tw(t, R.at('gravity'), R.d, E.lin) * (R.d - R.at('gravity'));
    const lift = (base, k, ph) => base - (1 - Math.exp(-fl * 0.22)) * 380 * k - (fl > 0 ? Math.sin(t * 1.3 + ph) * 10 : 0);
    const rot = (k, ph) => fl > 0 ? Math.sin(t * 0.7 + ph) * 0.25 * Math.min(1, fl) + fl * 0.06 * k : 0;
    const flying = fl > 0;
    let gExpr = 'shock', gTurn = 0, gArms = { L: 'down', R: 'down' };
    if (R.in('g14')) { gArms = { L: 'front', R: 'front' }; gTurn = 0.3; }
    if (R.in('gTime')) { gExpr = 'smug'; gTurn = 0; gArms = { L: 'hips', R: 'point' }; }
    if (R.in('n17') || R.in('n18')) gTurn = 0.5;
    if (flying) { gArms = { L: 'flail', R: 'flail' }; gExpr = 'shock'; }
    const frozen = t < R.at('black');
    const ft = frozen ? Math.min(t, R.at('freeze')) : t;
    R.add('gen', { x: W.x, y: lift(W.y, 1.0, 0), rot: rot(1, 0), face: frozen ? 1 : 1, expr: frozen ? 'shock' : gExpr, turn: frozen ? 0 : gTurn, arms: frozen ? { L: 'up', R: 'raise' } : gArms, legs: flying ? 'fly' : 'stand', holdR: 'can', canOpen: true, canEmpty: !frozen, wet: true, label: 'skuf.exe', tOverride: ft });
    R.add('car', { x: POS.car.x, y: lift(POS.car.y, 0.45, 2), rot: rot(-0.4, 2), dents: 4, sink: 6, z: POS.car.y, label: 'vaz2107.obj' });
    R.add('vov', { x: POS.vov.x, y: lift(POS.vov.y, 1.2, 1), rot: rot(1.4, 1), face: -1, legs: flying ? 'fly' : 'squat', arms: flying ? { L: 'flail', R: 'flail' } : R.in('o04') ? { L: 'up', R: 'up' } : { L: 'knee', R: 'knee' }, expr: 'shock', turn: R.in('o04') ? 0 : 0.6, label: 'gopnik_01', tOverride: ft });
    R.add('kol', { x: POS.kol.x, y: lift(POS.kol.y, 1.1, 3), rot: rot(-1.2, 3), face: -1, legs: flying ? 'fly' : 'stand', arms: flying ? { L: 'flail', R: 'flail' } : { L: 'down', R: 'down' }, holdL: 'phone', expr: 'shock', turn: 0.6, label: 'gopnik_02', tOverride: ft });
    babkiOnBench(R, {
      val: { y: lift(POS.val.y, 0.9, 4), rot: rot(0.8, 4), legs: flying ? 'fly' : 'sit', arms: flying ? { L: 'flail', R: 'flail' } : R.in('v04') ? { L: 'lap', R: 'point' } : { L: 'lap', R: 'lap' }, expr: R.in('v04') ? 'smug' : 'shock', turn: 0.8, label: 'babka_valya', holdR: flying || R.in('v04') ? null : 'knitting' },
      zin: { y: lift(POS.zin.y, 0.95, 5), rot: rot(-0.9, 5), legs: flying ? 'fly' : 'sit', arms: flying ? { L: 'flail', R: 'flail' } : { L: 'lap', R: 'lap' }, expr: 'angry', turn: 0.8, label: 'babka_zina' },
    });
    R.add('cat', { x: 130, y: lift(878, 0.8, 6), rot: rot(2, 6), face: 1, pose: flying ? 'fly' : 'sleep', z: 870, label: 'barsik.cat' });
    R.add('vobla', { x: 2770, y: lift(980, 1.6, 7), rot: rot(3, 7), z: 990, label: 'vobla.fish' });
  }
},

/* ---------- 9. После бури ---------- */
{
  id: 'after', set: 'yard', music: 'sad', tod: 0.6, chapter: ['Глава 7', 'После бури'], afterFeature: true,
  beats: ['~0.6', 'g16', 'n21', '@catRun:1.6', 'g17', '~0.2', '@cutV:0.15', '?valMods', '@cutBack:0.15', 'k05', 'o05', 'g18', 'o06', '@cutV2:0.15', 'v07', 'z06/0.15', 'n22', '~0.6'],
  cues: [['catRun', 'meow'], ['catRun+0.3', 'flutter'], ['z06', 'chime']],
  render(R) {
    const t = R.t;
    const atBench = (t >= R.at('cutV') && t < R.at('cutBack')) || t >= R.at('cutV2');
    if (atBench) {
      const stand = t > R.at('v07') + 1.4;
      camK(R, [
        [R.at('cutV'), { x: 1000, y: 870, z: 1.9 }],
        [R.at('cutV2'), { x: 1000, y: 870, z: 1.9 }],
        [R.at('v07') + 1, { x: 1000, y: 860, z: 1.7 }],
        [R.at('z06'), { x: 1085, y: 900, z: 2.5 }],
        [R.end('z06') + 0.3, { x: 1085, y: 900, z: 2.6 }],
        [R.at('n22') + 0.8, { x: 1010, y: 860, z: 1.7 }],
        [R.d, { x: 1010, y: 860, z: 1.6 }],
      ]);
      const valLine = R.in('valMods');
      babkiOnBench(R, {
        val: stand ? { legs: 'stand', y: POS.val.y + 20, arms: { L: 'front', R: 'wave' }, expr: 'happy', turn: 0.8, holdR: null, holdL: null } :
          { turn: 0.9, lookX: 1, expr: valLine ? 'shock' : R.in('v07') ? 'n' : 'n', arms: valLine ? { L: 'lap', R: 'point' } : { L: 'lap', R: 'lap' }, holdR: valLine ? null : 'knitting' },
        zin: { turn: R.in('z06') ? 0 : 0.8, lookX: R.in('z06') ? 0 : 1, expr: t > R.at('z06') ? 'happy' : 'n', bob: R.in('z06') ? -Math.abs(Math.sin(t * 10)) * 6 : 0 },
      });
      if (stand) R.add('plate', { x: POS.val.x + 36, y: POS.val.y - 150, n: 5, z: 1100 });
      if (R.cross('z06')) { BURST.confetti(1085, 760, 40); }
      R.fx.whip = 0.12;
      return;
    }
    camK(R, [
      [0, { x: 3010, y: 880, z: 1.7 }],
      [R.at('n21'), { x: 3010, y: 880, z: 1.6 }],
      [R.at('catRun'), { x: 2850, y: 860, z: 1.2 }],
      [R.at('g17') + 0.5, { x: 2900, y: 860, z: 1.25 }],
      [R.at('cutBack'), { x: 3110, y: 860, z: 1.35 }],
      [R.at('k05'), { x: 3180, y: 880, z: 1.6 }],
      [R.at('g18'), { x: 3010, y: 890, z: 1.8 }],
      [R.at('o06'), { x: 3110, y: 860, z: 1.35 }],
      [R.d, { x: 3110, y: 860, z: 1.35 }],
    ]);
    let gExpr = 'sad', gArms = { L: 'down', R: 'front' }, gTurn = 0.3, face = 1;
    if (R.in('catRun') || R.in('g17')) { gExpr = 'angry'; face = -1; gArms = { L: 'down', R: 'point' }; gTurn = 0.6; }
    if (R.in('g18')) { gExpr = 'sad'; gArms = { L: 'hips', R: 'hips' }; gTurn = 0.2; }
    if (R.in('o06')) { gExpr = 'happy'; }
    R.add('gen', { x: POS.genaCar.x, y: POS.genaCar.y, face, expr: gExpr, turn: gTurn, arms: gArms, holdR: 'can', canOpen: true, canEmpty: true, wet: t < R.at('k05'), bob: idleBob(t) });
    R.add('car', { x: POS.car.x, y: POS.car.y, dents: 4, sink: 6, z: POS.car.y });
    // Вован рисует граффити на гараже
    const sprayOn = t > R.at('g17') && t < R.at('o06');
    R.add('graffiti', { p: tw(t, R.at('g17') + 0.5, R.at('g18'), E.lin), z: 700 });
    R.add('vov', {
      x: sprayOn ? 3335 : POS.vov.x, y: sprayOn ? 1010 : POS.vov.y, face: sprayOn ? 1 : -1, legs: 'stand',
      arms: sprayOn ? { L: 'down', R: 'spray' } : R.in('o06') ? { L: 'down', R: 'give' } : { L: 'down', R: 'down' },
      holdR: sprayOn ? 'spray' : R.in('o06') ? 'seeds' : null, expr: R.in('o05') || R.in('o06') ? 'happy' : 'n', turn: sprayOn ? -0.5 : 0.6,
      lookX: sprayOn ? -0.6 : undefined, noHusk: true,
    });
    if (sprayOn && Math.random() < 0.5) BURST.paint(3395 + tw(t, R.at('g17') + 0.5, R.at('g18')) * 280, 830 + Math.sin(t * 6) * 20, 2, pick(['#ff3a5a', '#3ac8ff', '#ffe63a']));
    R.add('kol', { x: 3170, y: POS.kol.y, face: -1, legs: R.in('k05') ? 'stand' : 'squat', arms: R.in('k05') ? { L: 'down', R: 'scratchHead' } : { L: 'knee', R: 'knee' }, expr: 'sad', turn: 0.6, holdL: 'phone' });
    // кот убегает с воблой
    if (R.in('catRun') || (R.in('g17'))) {
      const cx = mv(t, R.at('catRun'), R.end('g17'), 3400, 2200);
      R.add('cat', { x: cx, y: 1110, face: -1, pose: 'run', fish: true, z: 1110 });
    }
    if (sprayOn && Math.floor(t * 3) !== Math.floor((t - R.dt) * 3)) R.sfx('hiss');
  }
},

/* ---------- 10. Финал на лавочке ---------- */
{
  id: 'finale', set: 'yard', music: 'sunset', tod: t => mv(t, 0, 40, 0.72, 0.84), chapter: ['Глава 8', 'Пирожки'],
  beats: ['~1.0', 'n23', '@eat:1.4', 'n24', 'n25', '@chew:0.6', 'g19', '~0.6', '@carStart:1.6', 'n26', '@wheel:2.6', 'm03/0.1', '@freeze:0.4', 'g20', '@iris:1.8'],
  cues: [['eat+0.2', 'chew'], ['chew', 'chew'], ['carStart', 'backfire'], ['wheel+0.2', 'clang'], ['wheel+0.4', 'roll'], ['wheel+2.2', 'bonk'], ['m03-0.3', 'windowCreak'], ['iris+0.2', 'stamp']],
  render(R) {
    const t = R.t;
    camK(R, [
      [0, { x: 1050, y: 820, z: 1.2 }],
      [R.at('n24'), { x: 1040, y: 840, z: 1.35 }],
      [R.end('n25'), { x: 1005, y: 860, z: 2.0 }],
      [R.end('g19'), { x: 1005, y: 860, z: 2.05 }],
      [R.at('carStart') + 0.4, { x: 1850, y: 820, z: 0.8 }],
      [R.end('wheel'), { x: 1700, y: 820, z: 0.85 }],
      [R.at('m03') + 0.1, { x: 1150, y: 650, z: 1.0 }],
      [R.at('g20'), { x: 1150, y: 650, z: 1.0 }],
      [R.at('g20') + 0.3, { x: 1000, y: 860, z: 2.0 }],
      [R.d, { x: 1000, y: 860, z: 2.1 }],
    ]);
    const lookCar = t > R.at('carStart') && t < R.at('m03');
    const lookMama = t > R.at('m03') && t < R.at('g20');
    const lookGena = t > R.at('freeze');
    const eat = !lookCar && !lookMama && !lookGena;
    const turnTo = (x) => lookCar ? 0.9 : lookMama ? (x < 1300 ? 0.7 : -0.6) : lookGena ? (x < 1000 ? 0.7 : -0.7) : 0.2;
    babkiOnBench(R, {
      val: { x: 880, turn: turnTo(880), lookY: lookMama ? -1 : 0, arms: eat ? { L: 'lap', R: 'eat' } : { L: 'lap', R: 'lap' }, holdR: eat ? 'pirozhok' : null, expr: 'happy', bite: tw(t, 0, R.d) },
      zin: { x: 1115, turn: turnTo(1115), lookY: lookMama ? -1 : 0, arms: eat ? { L: 'lap', R: 'eat' } : { L: 'lap', R: 'lap' }, holdR: eat ? 'pirozhok' : null, holdL: 'cane', expr: 'happy', bite: tw(t, 0, R.d) },
    });
    let gExpr = 'happy', gTurn = 0.2, gArms = eat ? { L: 'lap', R: 'eat' } : { L: 'lap', R: 'lap' };
    if (lookCar) { gExpr = 'shock'; gTurn = 0.9; }
    if (lookMama) { gExpr = 'shock'; gTurn = 0.6; }
    if (lookGena) { gExpr = 'shock'; gTurn = 0; }
    R.add('gen', { x: 998, y: 1002, face: 1, legs: 'sit', seat: 62, swing: 2, expr: gExpr, turn: gTurn, lookY: lookMama ? -1 : 0, arms: gArms, holdR: eat ? 'pirozhok' : null, bite: tw(t, 0, R.d), z: 1001 });
    R.add('plate', { x: 945, y: 936, n: Math.max(1, 5 - Math.floor(t / 8)), z: 1003 });
    // гопники на корточках перед лавочкой
    R.add('vov', { x: 1250, y: 1070, face: -1, legs: 'squat', arms: eat ? { L: 'knee', R: 'eat' } : { L: 'knee', R: 'knee' }, holdR: eat ? 'pirozhok' : null, expr: 'happy', turn: lookCar ? -0.9 : 0.4, noHusk: true, bite: tw(t, 0, R.d) });
    R.add('kol', { x: 1365, y: 1076, face: -1, legs: 'squat', arms: eat ? { L: 'knee', R: 'eat' } : { L: 'knee', R: 'knee' }, holdR: eat ? 'pirozhok' : null, expr: 'happy', turn: lookCar ? -0.9 : 0.4, bite: tw(t, 0, R.d) });
    R.add('cat', { x: 800, y: 1040, face: 1, pose: 'sit', z: 1040 });
    R.add('vobla', { x: 830, y: 1046, z: 1041, rot: 0.1 });
    // машина заводится сама, колесо отваливается и катится
    const running = t > R.at('carStart') && t < R.at('wheel') + 0.3;
    const wheelGone = t > R.at('wheel') + 0.2;
    R.add('car', { x: POS.car.x, y: POS.car.y, shake: running ? 0.8 : 0, noWheel: wheelGone, z: POS.car.y });
    if (running && Math.random() < 0.3) BURST.smoke(POS.car.x - 240, POS.car.y - 50, 1);
    if (wheelGone) {
      const p = tw(t, R.at('wheel') + 0.2, R.at('wheel') + 2.2, E.out);
      const wx = lerp(POS.car.x + 136, 1520, p), wy = POS.car.y - 32 - Math.abs(Math.sin(p * 9)) * 30 * (1 - p);
      R.add('wheel', { x: wx, y: wy, spin: -p * 30, z: 1100, fallen: t > R.at('wheel') + 2.2 });
    }
    R.add('mamaBalcony', { show: t > R.at('m03') - 0.3 ? tw(t, R.at('m03') - 0.3, R.at('m03'), E.back) : 0, z: 1 });
    R.fx.iris = tw(t, R.at('iris') + 0.2, R.at('iris') + 1.3, E.in);
    R.fx.irisAt = { x: 1004, y: 800 };
    R.fx.freezeFrame = t > R.at('freeze') && t < R.at('iris');
  }
},

/* ---------- 11. Титры ---------- */
{
  id: 'credits', set: 'yard', music: 'polka', tod: 1.0,
  beats: ['@c0:2.4', '@c1:3', '@c2:3', '@c3:3', '@c4:3', '@c5:3', '@c6:3', '@c7:3', '@c8:3.4', '@c9:3', '@c10:3.4'],
  cues: [],
  render(R) {
    const t = R.t;
    R.cam.x = mv(t, 0, R.d, 600, 3600); R.cam.y = 760; R.cam.z = 0.95;
    R.fx.credits = { t, card: ['c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10'].reduce((a, n, i) => t >= R.at(n) ? i : a, 0), local: 0 };
    const cur = 'c' + R.fx.credits.card;
    R.fx.credits.local = R.since(cur);
    R.fx.credits.dur = R.end(cur) - R.at(cur);
    R.fx.fadeIn = 0.8;
    babkiOnBench(R, { val: { holdR: 'knitting' }, zin: {} });
    R.add('cat', { x: 800, y: 1040, face: 1, pose: 'sleep', z: 1040 });
    R.add('car', { x: POS.car.x, y: POS.car.y, noWheel: true, z: POS.car.y });
    R.add('wheel', { x: 1520, y: 1100, spin: 0.3, z: 1100, fallen: true });
    R.add('graffiti', { p: 1, z: 700 });
    R.add('genaWindow', { open: 0, gena: null, z: 0, lit: true });
  }
},

/* ---------- 12. После титров ---------- */
{
  id: 'post', set: 'yard', music: null, tod: 1.0,
  beats: ['~0.6', '@pop:0.5', 'z07', '~0.5', '@out:0.8'],
  cues: [['pop', 'swish'], ['out', 'swish']],
  render(R) {
    const t = R.t;
    R.cam.x = 1085; R.cam.y = 860; R.cam.z = 2.6;
    const up = tw(t, R.at('pop'), R.at('pop') + 0.4, E.back) * (1 - tw(t, R.at('out'), R.at('out') + 0.4, E.in));
    babkiOnBench(R, { val: { holdR: 'knitting', turn: 0.4 }, zin: { y: POS.zin.y + 400 - up * 400, turn: 0, lookX: 0, expr: R.in('z07') && R.since('z07') > 2.4 ? 'angry' : 'n', legs: 'stand', arms: R.in('z07') ? { L: 'lap', R: 'point' } : { L: 'down', R: 'down' }, s: 1.15, z: 1200 } });
    R.fx.fadeOut = 0.6;
  }
},
];
