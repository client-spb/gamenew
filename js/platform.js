'use strict';
/* ============================================================
   Платформа: вёрстка под видимую область, MAX, сохранения, шаринг
   ============================================================ */
const app = $('app');
let APPW = 700, APPH = 372, ROT = false, DPR = 1;
const BASE_W = 700, BASE_H = 372;            // горизонтальный мультфильм
const onLayoutHooks = [];

function visibleSize() {
  const vv = window.visualViewport;
  let w = window.innerWidth, h = window.innerHeight;
  if (vv && vv.width > 50 && vv.height > 50) { w = Math.min(w, vv.width); h = Math.min(h, vv.height); }
  const de = document.documentElement;
  if (de && de.clientHeight > 50) h = Math.min(h, de.clientHeight);
  return { w: Math.round(w), h: Math.round(h) };
}

function layoutApp() {
  const s = visibleSize(), st = app.style;
  ROT = s.h > s.w;
  if (ROT) {
    st.width = s.h + 'px'; st.height = s.w + 'px';
    st.left = '0px'; st.top = '0px';
    st.transform = 'rotate(90deg) translateY(-100%)';
    APPW = s.h; APPH = s.w;
  } else {
    let w = s.w;
    if (w > s.h * 2.4) w = Math.round(s.h * 2.4);
    st.width = w + 'px'; st.height = s.h + 'px';
    st.left = Math.round((s.w - w) / 2) + 'px'; st.top = '0px';
    st.transform = 'none';
    APPW = w; APPH = s.h;
  }
  DPR = Math.min(2, window.devicePixelRatio || 1);
  fitUI();
}

function fitPanel(p) {
  p.style.scale = '1';
  const k = Math.min(1.25, (APPW - 16) / p.offsetWidth, (APPH - 16) / p.offsetHeight);
  p.style.scale = String(k);
}

function fitUI() {
  const kRaw = Math.min(APPW / BASE_W, APPH / BASE_H);
  const k = Math.min(1.6, kRaw);
  const m = $('menuIn');
  if (m) {
    m.style.width = (APPW / k) + 'px';
    m.style.height = (APPH / k) + 'px';
    m.style.transformOrigin = '0 0';
    m.style.transform = 'scale(' + k + ')';
  }
  document.documentElement.style.setProperty('--k', clamp(kRaw, 0.72, 1.9).toFixed(3));
  const ctl = $('controls');
  if (ctl) {
    const kc = clamp(kRaw, 0.7, 1.35);
    ctl.style.width = (APPW / kc) + 'px';
    ctl.style.transformOrigin = '0 100%';
    ctl.style.transform = 'scale(' + kc + ')';
    ctl.style.left = '0px';
  }
  const con = $('console');
  if (con) {
    con.style.scale = '1';
    const ch = con.offsetHeight || 150;
    const kk = Math.min(1.25, (APPW - 16) / 680, (APPH * 0.3) / ch);
    con.style.scale = String(kk);
  }
  document.querySelectorAll('.overlay.show .panel').forEach(fitPanel);
  for (const h of onLayoutHooks) { try { h(); } catch (e) { console.warn(e); } }
}

window.addEventListener('resize', layoutApp);
window.addEventListener('orientationchange', () => setTimeout(layoutApp, 200));
if (window.visualViewport) window.visualViewport.addEventListener('resize', layoutApp);

/** экранные координаты касания → координаты #app */
function toGame(e) {
  const r = app.getBoundingClientRect();
  if (ROT) return {
    x: (e.clientY - r.top) * (APPW / r.height),
    y: (r.right - e.clientX) * (APPH / r.width)
  };
  return {
    x: (e.clientX - r.left) * (APPW / r.width),
    y: (e.clientY - r.top) * (APPH / r.height)
  };
}

/* ---------------- экраны, оверлеи, тосты ---------------- */
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === 'scr-' + name));
}
function openOverlay(id) {
  const o = $(id); o.classList.add('show');
  const p = o.querySelector('.panel'); if (p) fitPanel(p);
}
function closeOverlay(id) { $(id).classList.remove('show'); }
function closeAllOverlays() { document.querySelectorAll('.overlay').forEach(o => o.classList.remove('show')); }
let toastTimer = 0;
function toast(text) {
  const t = $('toast'); t.textContent = text; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

/* ---------------- MAX ---------------- */
const GAME_NAME = 'skuf_cartoon_dvor';
function maxW() { return window.WebApp || null; }
function maxInit() {
  try {
    const w = maxW(); if (!w) return;
    if (w.ready) w.ready();
    if (w.disableVerticalSwipes) w.disableVerticalSwipes();
  } catch (e) {}
}
function maxUser() {
  try { const w = maxW(); return (w && w.initDataUnsafe && w.initDataUnsafe.user) || null; }
  catch (e) { return null; }
}
let lastHaptic = 0;
function haptic(kind) {
  const now = performance.now();
  if (now - lastHaptic < 180) return;
  lastHaptic = now;
  try {
    const w = maxW();
    if (!w || !w.HapticFeedback) return;
    if (kind === 'success' || kind === 'warning' || kind === 'error') w.HapticFeedback.notificationOccurred(kind);
    else w.HapticFeedback.impactOccurred(kind || 'light');
  } catch (e) {}
}
function metrika(fn, extra) {
  try { if (window.GameMetrika && window.GameMetrika[fn]) window.GameMetrika[fn](extra || {}); } catch (e) {}
}
/** имя зрителя для граффити и титров: из MAX, иначе «Зритель» */
function viewerName() {
  const u = maxUser();
  let n = u && (u.first_name || u.username) ? String(u.first_name || u.username) : '';
  n = n.replace(/[^\p{L}\p{N} \-]/gu, '').trim().slice(0, 14);
  return n || '';
}

/* ---------------- сохранения ---------------- */
const SAVE_KEY = 'skuf_cartoon_save_v1';
const SAVE = { v: 1, sound: true, subs: true, views: 0, pos: 0, throws: 0, finished: 0 };
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (!d || typeof d !== 'object') return;
    if (typeof d.sound === 'boolean') SAVE.sound = d.sound;
    if (typeof d.subs === 'boolean') SAVE.subs = d.subs;
    SAVE.views = clamp(d.views | 0, 0, 1e6);
    SAVE.throws = clamp(d.throws | 0, 0, 1e7);
    SAVE.finished = clamp(d.finished | 0, 0, 1e6);
    SAVE.pos = clamp(+d.pos || 0, 0, 3600);
  } catch (e) {}
}
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) {} }
let persistTimer = 0;
function persistSoon() { clearTimeout(persistTimer); persistTimer = setTimeout(persist, 600); }

/* ---------------- шаринг и политика ---------------- */
const SHARE_LINK = 'https://max.ru/channel_igroteka_max';
function fullShareText(text) {
  return text.includes(SHARE_LINK) ? text : text + '\nиграй прямо в Максе без скачиваний ' + SHARE_LINK;
}
function shareText(text) {
  const fullText = fullShareText(text);
  metrika('shareClick');
  try {
    if (window.WebApp && window.WebApp.shareContent) { window.WebApp.shareContent({ text: fullText }); return; }
  } catch (e) {}
  try {
    if (navigator.share) { navigator.share({ text: fullText }).catch(() => {}); return; }
  } catch (e) {}
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(fullText).then(() => toast('Ссылка скопирована')).catch(() => toast('Поделись с друзьями!'));
      return;
    }
  } catch (e) {}
  toast('Поделись с друзьями!');
}
function openPrivacy() {
  try {
    if (window.GameSDK && GameSDK.openConsentSettings) { GameSDK.openConsentSettings(); return; }
  } catch (e) {}
  toast('Настройки доступны в Максе');
}
