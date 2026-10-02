'use strict';
/* ============================================================
   Запуск: холсты, сборка декораций, загрузка озвучки, цикл кадров
   ============================================================ */
const cv = $('cv'), mcv = $('menuCanvas');
const ctxFilm = cv.getContext('2d'), ctxMenu = mcv.getContext('2d');
DIR.cv = cv; DIR.c = ctxFilm;

function resizeCanvas() {
  for (const c of [cv, mcv]) {
    c.style.width = APPW + 'px'; c.style.height = APPH + 'px';
    c.width = Math.round(APPW * DPR); c.height = Math.round(APPH * DPR);
  }
  if (YARD.built) scheduleRebuild();
  if (DIR.mode === 'sandbox') FEATURE.fitCam();
}
onLayoutHooks.push(resizeCanvas);

let rebuildTimer = 0;
function scheduleRebuild() {
  clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(() => {
    const old = YARD.res;
    YARD.plan(DIR.viewScale());
    if (Math.abs(YARD.res - old) / old > 0.25) { YARD.build(); FAR.build(); WIDE.build(); }
  }, 400);
}

/* слабое устройство — упрощаем зерно и виньетку */
(function detectQuality() {
  const mem = navigator.deviceMemory || 4, cores = navigator.hardwareConcurrency || 4;
  GFX.quality = (mem <= 2 || cores <= 2) ? 0 : 1;
  let coarse = false;
  try { coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches; } catch (e) {}
  GFX.grain = GFX.quality && !coarse;
})();

function buildSets() {
  YARD.plan(DIR.viewScale());
  YARD.build();
  FAR.build();
  WIDE.build();
}

/* ---------------- озвучка ---------------- */
function loadVoices() {
  const fill = $('loadfill'), txt = $('loadtxt'), bar = $('loadbar');
  const done = ok => {
    bar.classList.add('done');
    txt.textContent = ok ? 'Озвучка готова' : 'Без озвучки — с субтитрами';
    if (!ok) { SAVE.subs = true; UI.syncToggles(); }
  };
  window.onVoiceData = async () => {
    fill.style.width = '35%';
    txt.textContent = 'Подготовка голосов…';
    try {
      const ok = await FX.decodeVoices(p => { fill.style.width = (35 + p * 65) + '%'; });
      done(ok);
    } catch (e) { done(false); }
  };
  const s = document.createElement('script');
  s.src = 'audio/voices.js';
  s.onerror = () => done(false);
  fill.style.width = '10%';
  document.body.appendChild(s);
}

/* ---------------- меню: живая сцена ---------------- */
function renderMenuScene(now) {
  const prevC = DIR.c, prevCv = DIR.cv;
  DIR.c = ctxMenu; DIR.cv = mcv;
  const R = { cam: { x: 840 + Math.sin(now * 0.07) * 40, y: 800, z: 1.28 }, fx: {}, tod: 0.42, sc: { dur: 1 }, t: 0, set: 'yard', actors: [] };
  const add = (kind, P) => { P.kind = kind; if (P.z === undefined) P.z = P.y; if (P.s === undefined) P.s = 1 + (P.y - 1060) * 0.0012; R.actors.push(P); };
  const talk = Math.max(0, Math.sin(now * 1.3)) > 0.6;
  add('val', { x: POS.val.x, y: POS.val.y, legs: 'sit', seat: 62, swing: 3, arms: { L: 'lap', R: talk ? 'point' : 'lap' }, holdR: talk ? null : 'knitting', turn: 0.8, lookX: 1, expr: 'smug', mouth: talk ? Math.abs(Math.sin(now * 12)) * 0.8 : 0 });
  add('zin', { x: POS.zin.x, y: POS.zin.y, legs: 'sit', seat: 62, swing: 2, arms: { L: !talk && Math.sin(now * 0.9) > 0.7 ? 'fist' : 'lap', R: 'lap' }, holdL: 'cane', turn: 0.8, lookX: 1, expr: 'angry', mouth: !talk && Math.sin(now * 0.9) > 0.7 ? 0.7 : 0 });
  add('gen', { x: 1290, y: 1068, face: -1, legs: 'stand', arms: { L: 'down', R: Math.sin(now * 0.5) > 0.3 ? 'mouth' : 'front' }, holdR: 'can', canOpen: true, expr: 'smug', turn: 0.4, bob: Math.sin(now * 2) * 1.5 });
  add('cat', { x: 1470, y: 1100, face: -1, pose: 'sit' });
  add('pigeons', { x: 1360, y: 1110, x1: 1520, n: 4, scatterT: null, seed: 8 });
  add('vov', { x: 1650, y: 1080, face: -1, legs: 'squat', arms: { L: 'knee', R: Math.sin(now * 1.1) > 0.4 ? 'mouth' : 'knee' }, turn: 0.6 });
  DIR.lastLocal = 0;
  DIR.drawYard(R, now, R.actors);
  ctxMenu.setTransform(DPR, 0, 0, DPR, 0, 0);
  // затемнение слева под заголовок
  const g = ctxMenu.createLinearGradient(0, 0, APPW * 0.6, 0);
  g.addColorStop(0, 'rgba(10,12,22,.78)'); g.addColorStop(1, 'rgba(10,12,22,0)');
  ctxMenu.fillStyle = g; ctxMenu.fillRect(0, 0, APPW, APPH);
  if (GFX.quality) { SCREEN.vignette(ctxMenu, APPW, APPH, 0.5); SCREEN.filmGrain(ctxMenu, APPW, APPH, now); }
  DIR.c = prevC; DIR.cv = prevCv;
}

/* ---------------- главный цикл ---------------- */
let lastTs = 0, filmClock = 0, menuFrame = 0;
function loop(ts) {
  requestAnimationFrame(loop);
  const now = ts / 1000;
  const dt = Math.min(0.25, Math.max(0, (ts - lastTs) / 1000 || 0.016));
  lastTs = ts;
  if (document.hidden) return;
  if (UI.screen === 'menu') {
    // меню рисуем через кадр — экономим батарею
    if ((menuFrame++ & 1) === 0) renderMenuScene(now);
    else if (menuFrame % 24 === 1 && YARD.built && !YARD.wireBuilt) YARD.stepWire();
    return;
  }
  if (DIR.playing) filmClock += dt;
  if (!YARD.wireBuilt && DIR.T > DIR.featureT - 60 && (menuFrame++ % 12) === 0) YARD.stepWire();
  const mode = DIR.mode;
  if (mode === 'sandbox' || mode === 'restore') {
    if (DIR.playing) FEATURE.update(Math.min(dt, 0.05));
    FEATURE.render(filmClock);
    if (DIR.lastFrame) { DIR.syncAudio(DIR.lastFrame, false); DIR.updateSubs(DIR.lastFrame); }
  } else {
    const R = DIR.tick(DIR.playing ? dt : 0, filmClock);
    DIR.lastLocal = R.t;
    DIR.render(R, filmClock);
  }
  UI.updateProgress();
  UI.syncPlayIcon();
}

/* ---------------- скрытие вкладки ---------------- */
function onHide() {
  if (UI.screen === 'film' && DIR.playing) UI.pause(true);
  MUSIC.stop(0.05);
  FX.stopAllLoops();
  FX.voiceStopAll();
  FX.suspend();
  persist();
}
function onShow() {
  if (document.hidden) return;
  FX.resume();
  lastTs = performance.now();
  if (UI.screen === 'menu' && SAVE.sound) MUSIC.want('dvor');
}
document.addEventListener('visibilitychange', () => { if (document.hidden) onHide(); else onShow(); });
window.addEventListener('pagehide', onHide);
window.addEventListener('blur', onHide);
window.addEventListener('focus', onShow);

/* ---------------- старт ---------------- */
function boot() {
  loadSave();
  layoutApp();
  DIR.build();
  UI.init();
  buildSets();
  UI.renderMenu();
  showScreen('menu');
  maxInit();
  if (window.GameSDK && GameSDK.init) {
    try { GameSDK.init(GAME_NAME, function () { console.log('[Мульт] GameSDK инициализирован:', GAME_NAME); }); }
    catch (e) { console.warn('[Мульт] GameSDK init error:', e); }
  }
  loadVoices();
  // первая музыка меню — после первого касания
  const firstTouch = () => {
    document.removeEventListener('pointerdown', firstTouch, true);
    if (UI.screen === 'menu' && SAVE.sound) setTimeout(() => { if (UI.screen === 'menu') MUSIC.want('dvor'); }, 50);
  };
  document.addEventListener('pointerdown', firstTouch, true);
  // отладка: ?t=секунды — сразу открыть мультфильм на нужном месте
  const qs = new URLSearchParams(location.search);
  if (qs.has('t')) { UI.startFilm(parseFloat(qs.get('t')) || 0); if (qs.has('pause')) UI.pause(false); }
  requestAnimationFrame(t => { lastTs = t; requestAnimationFrame(loop); });
}

// шрифты влияют на надписи в декорациях — ждём их, но не дольше 1,5 с
(function waitFonts() {
  let started = false;
  const go = () => { if (started) return; started = true; boot(); };
  try { if (document.fonts && document.fonts.ready) document.fonts.ready.then(go); } catch (e) {}
  setTimeout(go, 1500);
})();
