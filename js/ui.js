'use strict';
/* ============================================================
   Интерфейс: меню, плеер, пауза, финал, подтверждения
   ============================================================ */
const UI = {
  screen: 'menu', ctlTimer: 0, chapTimer: 0, lastBar: -1, seeking: false,

  init() {
    // меню
    $('btnWatch').addEventListener('click', () => { FX.S.click(); haptic('light'); this.startFilm(SAVE.pos > 8 && SAVE.pos < DIR.total - 8 ? SAVE.pos : 0); });
    $('btnResume').addEventListener('click', () => { FX.S.click(); this.startFilm(0); });
    $('btnMenuSound').addEventListener('click', () => this.toggleSound());
    $('btnMenuSubs').addEventListener('click', () => this.toggleSubs());
    $('btnMenuShare').addEventListener('click', () => { FX.S.click(); shareText('Смотрю мультик «В мире скуфов»: скуф Гена, бабки у подъезда и гопники с хардбасом. А в середине мультик ломается, и ты им управляешь!'); });
    $('btnPrivacy').addEventListener('click', () => { FX.S.click(); openPrivacy(); });

    // плеер
    $('cPlay').addEventListener('click', e => { e.stopPropagation(); this.togglePlay(); });
    $('cBack').addEventListener('click', e => { e.stopPropagation(); FX.S.click(); this.seekBy(-10); });
    $('cFwd').addEventListener('click', e => { e.stopPropagation(); FX.S.click(); this.seekBy(10); });
    $('cSubs').addEventListener('click', e => { e.stopPropagation(); this.toggleSubs(); });
    $('cSound').addEventListener('click', e => { e.stopPropagation(); this.toggleSound(); });
    $('cMenu').addEventListener('click', e => { e.stopPropagation(); FX.S.click(); this.pause(true); });
    const fs = $('cFull');
    if (!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen) || maxUser()) fs.style.display = 'none';
    fs.addEventListener('click', e => { e.stopPropagation(); this.fullscreen(); });

    // касания по кадру
    const tap = $('tapLayer');
    tap.addEventListener('pointerdown', e => {
      if (DIR.mode === 'sandbox' && DIR.playing) {
        if (FEATURE.pointerDown(e)) { try { tap.setPointerCapture(e.pointerId); } catch (er) {} return; }
      }
      this.tapToggle = true;
    });
    tap.addEventListener('pointermove', e => FEATURE.pointerMove(e));
    const up = e => {
      FEATURE.pointerUp(e);
      if (this.tapToggle && DIR.mode !== 'sandbox') this.toggleControls();
      this.tapToggle = false;
    };
    tap.addEventListener('pointerup', up);
    tap.addEventListener('pointercancel', e => { FEATURE.pointerUp(e); this.tapToggle = false; });

    // полоса прогресса
    const bar = $('bar');
    const seekTo = e => {
      const r = rectToGame(bar), p = toGame(e);
      const f = clamp((p.x - r.x0) / (r.x1 - r.x0), 0, 1);
      DIR.seek(f * DIR.total);
      this.showControls();
    };
    bar.addEventListener('pointerdown', e => { e.stopPropagation(); this.seeking = true; try { bar.setPointerCapture(e.pointerId); } catch (er) {} seekTo(e); });
    bar.addEventListener('pointermove', e => { if (this.seeking) seekTo(e); });
    bar.addEventListener('pointerup', () => { this.seeking = false; FX.S.click(); });
    bar.addEventListener('pointercancel', () => { this.seeking = false; });
    $('controls').addEventListener('pointerdown', e => { e.stopPropagation(); this.showControls(); });

    // пауза
    $('pResume').addEventListener('click', () => { FX.S.click(); this.resume(); });
    $('pRestart').addEventListener('click', () => { FX.S.click(); this.confirm('Начать заново?', 'Мультфильм начнётся с самого начала. Бабушки не против.', () => { closeAllOverlays(); this.startFilm(0); }); });
    $('pMenu').addEventListener('click', () => { FX.S.click(); this.toMenu(); });
    $('pSound').addEventListener('click', () => this.toggleSound());
    $('pSubs').addEventListener('click', () => this.toggleSubs());

    // финал
    $('eShare').addEventListener('click', () => {
      FX.S.click();
      const n = viewerName();
      const hair = MODS.hair ? ' Гена теперь с причёской «' + HAIR_NAMES[MODS.hair] + '» — это я ему сделал(а).' : '';
      shareText('Посмотрел(а) мультик «В мире скуфов» и был(а) режиссёром второй половины' + (n ? ', ' + n : '') + '!' + hair + ' Бабушек брошено: ' + FEATURE.throws + '.');
    });
    $('eAgain').addEventListener('click', () => { FX.S.click(); closeAllOverlays(); this.startFilm(0); });
    $('eMenu').addEventListener('click', () => { FX.S.click(); closeAllOverlays(); this.toMenu(); });

    $('cfNo').addEventListener('click', () => { FX.S.click(); closeOverlay('ov-confirm'); });

    // клавиатура
    window.addEventListener('keydown', e => {
      if (this.screen !== 'film') return;
      if (e.code === 'Space' || e.code === 'KeyK') { e.preventDefault(); this.togglePlay(); }
      else if (e.code === 'ArrowLeft') this.seekBy(-10);
      else if (e.code === 'ArrowRight') this.seekBy(10);
      else if (e.code === 'Escape' || e.code === 'KeyP') this.pause(true);
      else if (e.code === 'KeyS') this.toggleSubs();
      else if (e.code === 'KeyM') this.toggleSound();
      else if (e.code === 'KeyF') this.fullscreen();
    });

    DIR.onScene = ch => this.chapter(ch);
    DIR.onEnd = () => this.ending();
    this.syncToggles();
  },

  /* ---------- переходы ---------- */
  startFilm(fromT) {
    FX.unlock();
    closeAllOverlays();
    this.screen = 'film';
    showScreen('film');
    fitUI();
    MUSIC.stop(0.2);
    DIR.restart();
    if (fromT) DIR.seek(fromT);
    DIR.play();
    SAVE.views++; persistSoon();
    metrika('gameStart', { from: Math.round(fromT || 0) });
    this.buildMarks();
    this.showControls();
    if (!FX.voiceReady()) toast('Озвучка ещё загружается — включены субтитры');
  },
  toMenu() {
    if (DIR.T > 1 && DIR.mode !== 'end') SAVE.pos = DIR.T < DIR.featureT ? DIR.T : DIR.featureT + 0.5;
    persist();
    DIR.pause(); FEATURE.abort();
    closeAllOverlays();
    this.screen = 'menu';
    showScreen('menu');
    $('subs').classList.remove('show');
    this.renderMenu();
    MUSIC.want('dvor');
  },
  renderMenu() {
    const canResume = SAVE.pos > 8 && DIR.total && SAVE.pos < DIR.total - 8;
    $('btnWatchTxt').textContent = canResume ? 'Продолжить' : (SAVE.finished ? 'Смотреть снова' : 'Смотреть');
    $('btnResume').style.display = canResume ? '' : 'none';
    this.syncToggles();
  },

  /* ---------- плеер ---------- */
  togglePlay() {
    FX.S.click();
    if (DIR.mode === 'end') { this.startFilm(0); return; }
    if (DIR.playing) this.pause(false); else this.resume();
  },
  pause(withOverlay) {
    if (this.screen !== 'film') return;
    if (DIR.playing) DIR.pause();
    if (DIR.T > 1 && DIR.mode !== 'end') { SAVE.pos = DIR.mode === 'sandbox' || DIR.mode === 'restore' ? DIR.featureT - 1 : DIR.T; persistSoon(); }
    this.syncPlayIcon();
    this.showControls(true);
    if (withOverlay) openOverlay('ov-pause');
  },
  resume() {
    closeOverlay('ov-pause');
    FX.unlock();
    DIR.play();
    if (DIR.mode === 'sandbox') MUSIC.want(FEATURE.disco ? 'disco' : 'chip');
    this.syncPlayIcon();
    this.showControls();
  },
  seekBy(s) {
    if (DIR.mode === 'sandbox' || DIR.mode === 'restore') { if (s > 0) FEATURE.finish(); return; }
    DIR.seek(DIR.T + s);
    this.showControls();
  },
  fullscreen() {
    try {
      const d = document.documentElement;
      if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else (d.requestFullscreen || d.webkitRequestFullscreen).call(d);
    } catch (e) {}
  },
  toggleControls() {
    if ($('controls').classList.contains('show')) this.hideControls(); else this.showControls();
  },
  showControls(stay) {
    if (DIR.mode === 'sandbox' || DIR.mode === 'restore') { $('controls').classList.remove('show'); return; }
    $('controls').classList.add('show');
    clearTimeout(this.ctlTimer);
    if (!stay && DIR.playing) this.ctlTimer = setTimeout(() => this.hideControls(), 3200);
  },
  hideControls() { if (!DIR.playing) return; $('controls').classList.remove('show'); },
  syncPlayIcon() { $('cPlayIco').setAttribute('href', DIR.playing ? '#i-pause' : '#i-play'); },

  buildMarks() {
    const m = $('barMarks');
    m.innerHTML = '';
    for (const ch of DIR.chapters()) {
      const i = document.createElement('i');
      i.style.left = (ch.t / DIR.total * 100) + '%';
      m.appendChild(i);
    }
    const f = document.createElement('i');
    f.className = 'feat';
    f.style.left = (DIR.featureT / DIR.total * 100) + '%';
    m.appendChild(f);
  },
  updateProgress() {
    const T = DIR.T, tot = DIR.total || 1;
    const k = Math.round(T * 4);
    if (k === this.lastBar) return;
    this.lastBar = k;
    const f = clamp(T / tot, 0, 1) * 100;
    $('barFill').style.width = f + '%';
    $('barKnob').style.left = f + '%';
    $('tCur').textContent = fmtTime(T);
    $('tDur').textContent = fmtTime(tot);
  },
  chapter(ch) {
    $('chapNum').textContent = ch[0];
    $('chapName').textContent = ch[1];
    const c = $('chapterCard');
    c.classList.add('show');
    clearTimeout(this.chapTimer);
    this.chapTimer = setTimeout(() => c.classList.remove('show'), 2800);
  },

  /* ---------- настройки ---------- */
  toggleSound() {
    FX.unlock();
    FX.setSound(!SAVE.sound);
    if (SAVE.sound) { FX.S.click(); if (this.screen === 'menu') MUSIC.want('dvor'); }
    else MUSIC.stop(0.1);
    persist();
    this.syncToggles();
    toast(SAVE.sound ? 'Звук включён' : 'Звук выключен');
  },
  toggleSubs() {
    SAVE.subs = !SAVE.subs;
    FX.S.toggle(SAVE.subs);
    DIR.subKey = '#';
    persist();
    this.syncToggles();
    toast(SAVE.subs ? 'Субтитры включены' : 'Субтитры выключены');
  },
  syncToggles() {
    for (const id of ['btnMenuSound', 'pSound']) $(id).classList.toggle('off', !SAVE.sound);
    for (const id of ['btnMenuSubs', 'pSubs']) $(id).classList.toggle('off', !SAVE.subs);
    $('cSoundIco').setAttribute('href', SAVE.sound ? '#i-sound' : '#i-mute');
    $('cSubs').classList.toggle('off', !SAVE.subs);
  },

  confirm(title, text, yes) {
    $('cfTitle').textContent = title;
    $('cfText').textContent = text;
    const b = $('cfYes');
    const nb = b.cloneNode(true);
    b.parentNode.replaceChild(nb, b);
    nb.addEventListener('click', () => { FX.S.click(); closeOverlay('ov-confirm'); yes(); });
    openOverlay('ov-confirm');
  },

  ending() {
    SAVE.finished++; SAVE.pos = 0; persist();
    metrika('gameFinish', { throws: FEATURE.throws, hair: MODS.hair });
    haptic('success');
    $('endDirector').textContent = viewerName() || 'Ты';
    $('endHair').textContent = HAIR_NAMES[MODS.hair];
    $('endThrows').textContent = fmt(FEATURE.throws);
    $('endViews').textContent = fmt(SAVE.views);
    this.syncPlayIcon();
    setTimeout(() => { if (DIR.mode === 'end' && this.screen === 'film') { openOverlay('ov-end'); FX.S.cheer(); } }, 400);
  },
};

function rectToGame(el) {
  const r = el.getBoundingClientRect();
  const a = toGame({ clientX: r.left, clientY: r.top }), b = toGame({ clientX: r.right, clientY: r.bottom });
  return { x0: Math.min(a.x, b.x), x1: Math.max(a.x, b.x), y0: Math.min(a.y, b.y), y1: Math.max(a.y, b.y) };
}
