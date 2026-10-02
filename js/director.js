'use strict';
/* ============================================================
   РЕЖИССЁР: таймлайн, отрисовка кадра, синхронизация голоса,
   субтитры, главы, звуковые подсказки, перемотка
   ============================================================ */
const SPK = {
  NAR: { name: '', col: '#f6e8c8', actor: null },
  GEN: { name: 'Гена', col: '#ffd23f', actor: 'gen' },
  VAL: { name: 'Баба Валя', col: '#ff8a7a', actor: 'val' },
  ZIN: { name: 'Баба Зина', col: '#8ab4ff', actor: 'zin' },
  VOV: { name: 'Вован', col: '#c8c8d0', actor: 'vov' },
  KOL: { name: 'Колян', col: '#7ab8ff', actor: 'kol' },
  MAM: { name: 'Мама Гены', col: '#ff9ad0', actor: 'mama' },
  SYS: { name: 'Система', col: '#7dffa8', actor: null },
};
const ACTOR_SPK = { gen: 'GEN', val: 'VAL', zin: 'ZIN', vov: 'VOV', kol: 'KOL', mama: 'MAM' };

const DIR = {
  scenes: [], total: 0, T: 0, playing: false, mode: 'idle',   // idle | play | sandbox | restore | end
  featureT: 0, afterT: 0, sceneIdx: -1, lastFrame: null,
  shake: 0, prevT: 0, live: false, stepPh: {}, subKey: '', barkSub: null,
  cv: null, c: null, onEnd: null, onScene: null,

  build() {
    let T = 0;
    this.scenes = SCENES.map((def, idx) => {
      const sc = { def, idx, start: T, at: {}, end: {}, lines: [], cues: [] };
      let t = 0;
      for (const tok of def.beats) {
        if (tok[0] === '~') { t += parseFloat(tok.slice(1)); continue; }
        if (tok[0] === '@') { const p = tok.slice(1).split(':'); sc.at[p[0]] = t; t += parseFloat(p[1]); sc.end[p[0]] = t; continue; }
        const parts = tok.split('/');
        const gap = parts[1] !== undefined ? parseFloat(parts[1]) : 0.32;
        let name = parts[0], id = name.split('#')[0];
        if (id[0] === '?') { name = name.slice(1); id = RESOLVE[name](); }
        const m = window.VOICE_META && VOICE_META[id];
        const dur = m ? m.d : 1.5;
        sc.at[name] = t; sc.end[name] = t + dur;
        sc.lines.push({ id, name, start: t, dur, spk: m ? m.s : 'NAR', text: m ? m.t : '', env: m ? m.e : '' });
        t += dur + gap;
      }
      sc.dur = t;
      for (const cue of def.cues || []) sc.cues.push({ t: resolveRef(sc, cue[0]), fn: cue[1] });
      if (def.feature) this.featureT = T + t;
      if (def.afterFeature) this.afterT = T;
      T += t;
      return sc;
    });
    this.total = T;
  },

  sceneAt(T) {
    for (let i = this.scenes.length - 1; i >= 0; i--) if (T >= this.scenes[i].start) return this.scenes[i];
    return this.scenes[0];
  },

  chapters() { return this.scenes.filter(s => s.def.chapter).map(s => ({ t: s.start, name: s.def.chapter })); },

  /* ---------------- построение кадра ---------------- */
  frameAt(T, dt, forward) {
    const sc = this.sceneAt(T);
    const t = clamp(T - sc.start, 0, sc.dur);
    const prevLocal = forward ? t - dt : t;
    const R = {
      t, T, d: sc.dur, dt: forward ? dt : 0, sc,
      at: n => (sc.at[n] !== undefined ? sc.at[n] : resolveRef(sc, n)),
      end: n => (sc.end[n] !== undefined ? sc.end[n] : resolveRef(sc, n)),
      p(n, e) { return tw(t, this.at(n), this.end(n), e); },
      in(n) { return t >= this.at(n) && t < this.end(n); },
      since(n) { return t - this.at(n); },
      cross(ref) { const x = resolveRef(sc, ref); return forward && dt > 0 && prevLocal < x && t >= x; },
      sfx(name) { if (forward && dt > 0 && FX.S[name]) FX.S[name](); },
      actors: [], cam: { x: 800, y: 700, z: 1 }, fx: {},
      add(kind, P) {
        P = P || {};
        P.kind = kind;
        if (P.z === undefined) P.z = P.y || 0;
        if (P.s === undefined && P.y !== undefined && kind !== 'car' && kind !== 'genaWindow' && kind !== 'mamaBalcony') P.s = 1 + (P.y - 1060) * 0.0012;
        this.actors.push(P);
        return P;
      },
    };
    PART.enabled = forward && dt > 0;
    sc.def.render(R);
    PART.enabled = true;
    // рот говорящих
    for (const a of R.actors) {
      const spk = ACTOR_SPK[a.kind];
      if (!spk) continue;
      const m = mouthFor(sc, t, spk);
      a.mouth = Math.max(a.mouth || 0, m + (a.mouthBoost || 0));
    }
    for (const a of R.actors) if (a.kind === 'genaWindow' && a.gena) a.gena.mouth = Math.max(a.gena.mouth || 0, mouthFor(sc, t, 'GEN') + (a.gena.mouthBoost || 0));
    for (const a of R.actors) if (a.kind === 'mamaBalcony') a.mouth = mouthFor(sc, t, 'MAM');
    R.tod = typeof sc.def.tod === 'function' ? sc.def.tod(t) : (sc.def.tod || 0.4);
    R.set = sc.def.set;
    return R;
  },

  /* ---------------- отрисовка мира ---------------- */
  render(R, now) {
    const c = this.c, W = APPW, H = APPH;
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    const fx = R.fx;
    if (fx.shake) this.shake = Math.max(this.shake, fx.shake);
    if (fx.splashHit) SPLASH.hit(W, H);
    if (fx.splash && !SPLASH.drops.length) SPLASH.hit(W, H);
    if (!fx.splash && SPLASH.drops.length && !this.keepSplash) SPLASH.clear();

    if (fx.black && !fx.bsod) { c.fillStyle = '#000'; c.fillRect(0, 0, W, H); this.drawOverlays(R, now); return; }
    if (R.set === 'wide') this.drawWide(R, now);
    else this.drawYard(R, now, R.actors);
    this.drawOverlays(R, now);
  },

  viewScale() { return Math.min(APPW / 1600, APPH / 900); },

  setCam(c, cam, extraShake) {
    const vs = this.viewScale() * cam.z;
    const sx = (Math.random() - 0.5) * 18 * (this.shake + (extraShake || 0)), sy = (Math.random() - 0.5) * 18 * (this.shake + (extraShake || 0));
    c.setTransform(DPR * vs, 0, 0, DPR * vs, DPR * (APPW / 2 - (cam.x + sx) * vs), DPR * (APPH / 2 - (cam.y + sy) * vs));
    return vs;
  },

  drawWide(R, now) {
    const c = this.c, W = APPW, H = APPH;
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    drawSky(c, W, H, R.tod, now, 0, 0, 1);
    const cam = R.cam;
    const vs = this.setCam(c, cam);
    if (WIDE.cv) c.drawImage(WIDE.cv, 0, 0, WIDE.w, WIDE.h);
    // окно Гены мерцает
    const w = WIDE.genaWin;
    c.fillStyle = 'rgba(255,230,120,' + (0.25 + 0.2 * Math.sin(now * 3)) + ')';
    c.fillRect(w.x - 26, w.y - 22, 52, 46);
    // птицы
    if (R.fx.birds) for (let i = 0; i < 7; i++) {
      const bx = ((now * 40 + i * 230) % 2400) - 200, by = 200 + Math.sin(now + i) * 30 + i * 18;
      const f = Math.sin(now * 8 + i) * 6;
      c.strokeStyle = '#2a2a3a'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(bx - 10, by - f); c.quadraticCurveTo(bx - 4, by - 4, bx, by); c.quadraticCurveTo(bx + 4, by - 4, bx + 10, by - f); c.stroke();
    }
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    const tint = todTint(R.tod);
    if (tint) { c.globalCompositeOperation = 'multiply'; c.fillStyle = rgba(tint[0], tint[1]); c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'source-over'; }
  },

  /** двор: небо, город, кэш, живые объекты, частицы, тонировка */
  drawYard(R, now, actors, opt) {
    const c = this.c, W = APPW, H = APPH, cam = R.cam, fx = R.fx;
    opt = opt || {};
    const wire = !!fx.wire;
    if (wire && !YARD.wireBuilt) { while (!YARD.stepWire()) { /* достроить каркас */ } }
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (wire) { c.fillStyle = '#04130b'; c.fillRect(0, 0, W, H); }
    else drawSky(c, W, H, R.tod, now, cam.x, cam.y, cam.z);
    const vs = this.setCam(c, cam);
    const vx0 = cam.x - W / 2 / vs, vx1 = cam.x + W / 2 / vs;
    if (!wire) FAR.draw(c, cam.x);
    YARD.draw(c, wire, vx0 - 50, vx1 + 50);
    GFX.wire = wire;
    // ночные окна и фонари
    const night = clamp((R.tod - 0.8) / 0.15, 0, 1);
    if (night > 0 && !wire) drawNightLights(c, night, now);
    // живые объекты по глубине
    const list = actors.slice().sort((a, b) => a.z - b.z);
    for (const a of list) {
      if (a.hidden) continue;
      try { drawActor(c, a, now, fx); } catch (e) { console.warn('actor', a.kind, e); }
    }
    if (opt.afterActors) opt.afterActors(c);
    PART.draw(c);
    GFX.wire = false;
    // подписи объектов в режиме кода
    if (fx.labels > 0) drawLabels(c, list, fx.labels, now);
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    // тонировка времени суток
    const tint = todTint(R.tod);
    if (tint && !wire) { c.globalCompositeOperation = 'multiply'; c.fillStyle = rgba(tint[0], tint[1]); c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'source-over'; }
    if (night > 0 && !wire) drawNightGlow(c, R, night, now);
  },

  /** экранные слои поверх мира */
  drawOverlays(R, now) {
    const c = this.c, W = APPW, H = APPH, fx = R.fx;
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (fx.code) drawCodeRain(c, W, H, now);
    if (fx.wireFlash > 0) { c.fillStyle = 'rgba(255,255,255,' + Math.sin(fx.wireFlash * Math.PI) + ')'; c.fillRect(0, 0, W, H); }
    if (fx.sparks && Math.random() < 0.35) drawScreenSparks(c, W, H);
    SPLASH.draw(c, W, H);
    if (fx.glitch > 0) SCREEN.glitch(c, this.cv, W, H, fx.glitch, now);
    if (fx.crt > 0) drawCRTOff(c, W, H, fx.crt);
    if (fx.bsod) drawBSOD(c, W, H, fx, now);
    if (fx.ff) drawFastForward(c, W, H, now);
    if (fx.title > 0) drawTitleCard(c, W, H, fx.title, fx.titleOut || 0, now);
    if (fx.credits) drawCredits(c, W, H, fx.credits, now);
    if (fx.iris > 0) drawIris(c, W, H, fx.iris, R.cam, fx.irisAt);
    if (fx.flash > 0) { c.fillStyle = 'rgba(255,250,230,' + fx.flash + ')'; c.fillRect(0, 0, W, H); }
    if (fx.letter) { const lb = H * 0.07 * fx.letter; c.fillStyle = '#000'; c.fillRect(0, 0, W, lb); c.fillRect(0, H - lb, W, lb); }
    const sc = R.sc;
    if (fx.fadeIn && R.t < fx.fadeIn) { c.fillStyle = 'rgba(0,0,0,' + (1 - R.t / fx.fadeIn) + ')'; c.fillRect(0, 0, W, H); }
    if (fx.fadeOut && R.t > sc.dur - fx.fadeOut) { c.fillStyle = 'rgba(0,0,0,' + clamp((R.t - (sc.dur - fx.fadeOut)) / fx.fadeOut, 0, 1) + ')'; c.fillRect(0, 0, W, H); }
    if (fx.whip && R.t - (this.cutAt || 0) < fx.whip) { /* резкая склейка — без эффекта */ }
    if (!fx.wire && GFX.quality) { SCREEN.vignette(c, W, H, 0.38); SCREEN.filmGrain(c, W, H, now); }
  },

  /* ---------------- воспроизведение ---------------- */
  syncAudio(R, forward) {
    const sc = R.sc;
    const want = new Set();
    if (this.playing && this.mode === 'play' && SAVE.sound) {
      for (let i = 0; i < sc.lines.length; i++) {
        const L = sc.lines[i];
        const off = R.t - L.start;
        if (off >= 0 && off < L.dur - 0.06) {
          const key = sc.idx + ':' + i;
          want.add(key);
          if (!FX.voiceIsPlaying(key) && !this.started.has(key)) {
            FX.voicePlay(key, L.id, off);
            this.started.add(key);
          }
        }
      }
    }
    for (const k of Array.from(this.started)) if (!want.has(k)) { FX.voiceStop(k); this.started.delete(k); }
    FX.duck(want.size > 0 || (this.barkSub && performance.now() < this.barkSub.until));
    // музыка сцены
    if (this.playing && (this.mode === 'play')) MUSIC.want(musicAt(sc, R.t));
  },

  fireCues(sc, t0, t1) {
    for (const cue of sc.cues) if (cue.t > t0 && cue.t <= t1) { try { (FX.S[cue.fn] || (() => {}))(); } catch (e) {} }
  },

  updateSubs(R) {
    let line = null;
    if (this.barkSub && performance.now() < this.barkSub.until) line = this.barkSub;
    else {
      const sc = R.sc;
      for (const L of sc.lines) if (R.t >= L.start && R.t < L.start + L.dur + 0.3) line = L;
    }
    const key = line ? (line.id || '') + line.text : '';
    if (key === this.subKey) return;
    this.subKey = key;
    const box = $('subs');
    if (!line || !SAVE.subs) { box.classList.remove('show'); return; }
    const sp = SPK[line.spk] || SPK.NAR;
    $('subWho').textContent = sp.name;
    $('subWho').style.color = sp.col;
    $('subTxt').textContent = line.text;
    box.classList.toggle('nar', line.spk === 'NAR');
    box.classList.add('show');
  },
  showBark(text, spk, dur) {
    this.barkSub = { text, spk, until: performance.now() + dur * 1000, id: 'bark' + Math.random() };
  },

  checkScene(R) {
    if (R.sc.idx === this.sceneIdx) return;
    this.sceneIdx = R.sc.idx;
    this.cutAt = R.t;
    const ch = R.sc.def.chapter;
    if (ch && this.onScene) this.onScene(ch);
  },

  /* шаги персонажей */
  steps(R) {
    if (!R.dt) return;
    for (const a of R.actors) {
      if (a.legs !== 'walk' || !a.stepSnd) continue;
      const k = Math.floor((a.walk || 0) / Math.PI);
      const key = a.kind;
      if (this.stepPh[key] !== undefined && this.stepPh[key] !== k) {
        if (a.stepSnd === 'flip') FX.S.step(k % 2); else FX.S.shoe();
      }
      this.stepPh[key] = k;
    }
  },

  tick(dt, now) {
    let forward = false;
    if (this.mode === 'play' && this.playing) {
      const T0 = this.T;
      let T1 = T0 + dt;
      // точка фичи: мультфильм останавливается и отдаёт управление зрителю
      if (T0 < this.featureT && T1 >= this.featureT && !this.featureDone) {
        T1 = this.featureT - 0.0001;
        this.T = T1;
        const R = this.frameAt(this.T, dt, true);
        this.lastFrame = R;
        FEATURE.begin(R);
        return R;
      }
      if (T1 >= this.total) { T1 = this.total; }
      // звуковые подсказки
      let sc0 = this.sceneAt(T0), sc1 = this.sceneAt(T1);
      if (sc0 === sc1) this.fireCues(sc0, T0 - sc0.start, T1 - sc0.start);
      else { this.fireCues(sc0, T0 - sc0.start, sc0.dur + 1); this.fireCues(sc1, -1, T1 - sc1.start); }
      this.T = T1;
      forward = true;
      PART.update(dt);
      SPLASH.update(dt);
      if (this.T >= this.total) { this.finish(); }
    }
    this.shake = Math.max(0, this.shake - dt * 2.2);
    const R = this.frameAt(this.T, dt, forward);
    this.lastFrame = R;
    this.checkScene(R);
    if (forward) this.steps(R);
    this.syncAudio(R, forward);
    this.updateSubs(R);
    return R;
  },

  play() {
    if (this.mode === 'end') return;
    this.playing = true;
    if (this.mode === 'idle') this.mode = 'play';
  },
  pause() {
    this.playing = false;
    FX.voiceStopAll(); this.started.clear();
    MUSIC.stop(0.25);
    FX.stopAllLoops();
  },
  seek(T) {
    const wasFeature = this.mode === 'sandbox' || this.mode === 'restore';
    if (wasFeature) FEATURE.abort();
    this.T = clamp(T, 0, this.total - 0.05);
    if (this.T < this.featureT) this.featureDone = false;
    if (this.mode === 'end') this.mode = 'play';
    FX.voiceStopAll(); this.started.clear();
    PART.clear(); SPLASH.clear();
    this.subKey = '#';
    this.sceneIdx = -1;
    if (this.T < this.featureT) { MODS.hair = MODS.hair; }
  },
  restart() {
    this.T = 0; this.featureDone = false; this.mode = 'play'; this.sceneIdx = -1;
    MODS.hair = 0; MODS.belly = 1; MODS.bigHeads = false; MODS.giant = false;
    FEATURE.reset();
    this.build();
    FX.voiceStopAll(); this.started.clear(); PART.clear(); SPLASH.clear();
  },
  finish() {
    this.mode = 'end'; this.playing = false;
    FX.voiceStopAll(); this.started.clear();
    MUSIC.stop(1.2);
    if (this.onEnd) this.onEnd();
  },
  started: new Set(),
};

function resolveRef(sc, ref) {
  if (typeof ref === 'number') return ref;
  const m = /^([^+\-]+)([+\-][\d.]+)?$/.exec(ref);
  if (!m) return 0;
  const base = sc.at[m[1]] !== undefined ? sc.at[m[1]] : 0;
  return base + (m[2] ? parseFloat(m[2]) : 0);
}
function musicAt(sc, t) {
  const m = sc.def.music;
  if (!Array.isArray(m)) return m || null;
  let cur = null;
  for (const [ref, th] of m) if (t >= resolveRef(sc, ref)) cur = th;
  return cur;
}
function mouthFor(sc, t, spk) {
  for (const L of sc.lines) {
    if (L.spk !== spk) continue;
    const o = t - L.start;
    if (o < 0 || o > L.dur) continue;
    return envAt(L.env, o);
  }
  return 0;
}
function envAt(env, o) {
  if (!env) return 0.4 + 0.4 * Math.abs(Math.sin(o * 14));
  const f = o * 25, i = Math.floor(f), k = f - i;
  const a = (env.charCodeAt(i) - 48) || 0, b = (env.charCodeAt(i + 1) - 48) || 0;
  return clamp(lerp(a, b, k) / 9, 0, 1) * 0.95;
}

/* ============================================================
   Отрисовка актёров
   ============================================================ */
function drawActor(c, a, now, fx) {
  const t = a.tOverride !== undefined ? a.tOverride : now;
  if (a.kind === 'genaWindow') return drawGenaWindow(c, a, t);
  if (a.kind === 'mamaBalcony') return drawMamaBalcony(c, a, t);
  if (a.kind === 'door') return drawDoorLive(c, a);
  if (a.kind === 'kioskHand') return drawKioskHand(c, a);
  if (a.kind === 'pigeons') return drawPigeonFlock(c, a, t);
  if (a.kind === 'graffiti') return drawGraffiti(c, a);
  let s = a.s || 1;
  if (a.kind === 'gen' && MODS.giant && !a.noMods) s *= 1.9;
  const face = a.face || 1;
  c.save();
  c.translate(a.x, a.y);
  if (a.rot) { const pv = a.pivot || pivotOf(a.kind); c.translate(0, -pv * s); c.rotate(a.rot); c.translate(0, pv * s); }
  c.scale(s * face, s);
  switch (a.kind) {
    case 'gen': drawGena(c, a, t); break;
    case 'val': drawBabka(c, a, t, 'val'); break;
    case 'zin': drawBabka(c, a, t, 'zin'); break;
    case 'vov': drawGopnik(c, a, t, 'vov'); break;
    case 'kol': drawGopnik(c, a, t, 'kol'); break;
    case 'cat': drawCat(c, a, t); break;
    case 'car': drawCar(c, a, t); break;
    case 'can': drawBeerCan(c, 0, -15, 1.2, a.open, a.empty); break;
    case 'vobla': drawVobla(c, 0, -6, 1.1, 0); break;
    case 'plate': drawPlate(c, 0, 0, a.n || 4, t); break;
    case 'wheel':
      if (a.fallen) { c.scale(1, 0.4); drawCarWheel(c, 0, -10, t, 0); }
      else drawCarWheel(c, 0, 0, t, a.spin || 0);
      break;
    case 'pigeon': drawPigeon(c, 0, 0, 1.2, 1, t, a.mode || 'peck', a.seed || 0); break;
    case 'snowman': drawSnowman(c); break;
  }
  c.restore();
}
function pivotOf(kind) {
  return { gen: 130, val: 100, zin: 100, vov: 130, kol: 115, cat: 25, car: 80, can: 15, vobla: 6, wheel: 0 }[kind] || 60;
}
function actorBox(a) {
  const s = (a.s || 1) * (a.kind === 'gen' && MODS.giant ? 1.9 : 1);
  const hb = { gen: [-60, -270, 120, 270], val: [-48, -205, 96, 205], zin: [-48, -205, 96, 205], vov: [-40, -265, 80, 265], kol: [-44, -240, 88, 240], cat: [-36, -60, 72, 60], car: [-235, -150, 470, 150], can: [-10, -32, 20, 32], vobla: [-36, -16, 72, 22], plate: [-30, -20, 60, 24], wheel: [-32, -32, 64, 64] }[a.kind];
  if (!hb) return null;
  return [a.x + hb[0] * s, a.y + hb[1] * s, hb[2] * s, hb[3] * s];
}
function drawLabels(c, list, k, now) {
  c.save();
  c.globalAlpha = k;
  for (const a of list) {
    if (!a.label) continue;
    const b = actorBox(a);
    if (!b) continue;
    c.save();
    if (a.rot) { const pv = pivotOf(a.kind) * (a.s || 1); c.translate(a.x, a.y - pv); c.rotate(a.rot); c.translate(-a.x, -(a.y - pv)); }
    c.setLineDash([8, 6]); c.strokeStyle = '#ffe680'; c.lineWidth = 2; c.strokeRect(b[0], b[1], b[2], b[3]);
    c.setLineDash([]);
    const tx = b[0], ty = b[1] - 30;
    c.font = '700 22px Consolas, Menlo, monospace';
    const w = c.measureText(a.label).width + 16;
    c.fillStyle = 'rgba(0,20,10,.85)'; c.fillRect(tx, ty, w, 26);
    c.strokeStyle = '#7dffa8'; c.lineWidth = 1.5; c.strokeRect(tx, ty, w, 26);
    c.fillStyle = '#7dffa8'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(a.label, tx + 8, ty + 13);
    if (a.kind === 'gen') {
      c.font = '700 16px Consolas, Menlo, monospace'; c.fillStyle = '#ffe680';
      c.fillText('belly = ' + MODS.belly.toFixed(2), tx, b[1] + b[3] + 22);
      c.fillText('hair = "' + HAIR_NAMES[MODS.hair] + '"', tx, b[1] + b[3] + 42);
    }
    c.restore();
  }
  c.restore();
}

/* окно Гены: Гена высовывается, рама и подоконник поверх */
function drawGenaWindow(c, P, t) {
  const W = GENA_WIN, x0 = W.x - 80, y0 = W.y, y1 = W.y + W.h;
  if (P.lit && !GFX.wire) { c.fillStyle = 'rgba(255,214,120,.9)'; c.fillRect(x0, y0, 160, W.h); }
  if (P.gena) {
    c.save();
    c.beginPath(); c.rect(x0 - 260, y0 - 400, 680, y1 + 3 - (y0 - 400)); c.clip();
    c.translate(W.x, P.gena.y);
    c.scale(0.62, 0.62);
    drawGena(c, Object.assign({ legs: 'stand' }, P.gena), t);
    c.restore();
  }
  // стена под окном и подоконник
  D.rect(c, x0 - 10, y1, 180, 10, '#d8d8d4', GFX.OUT, 1.8);
  // створки
  const op = P.open || 0;
  D.rect(c, x0, y0, 12, W.h, COL.frame, GFX.OUT, 1.6);
  D.rect(c, x0 + 148, y0, 12, W.h, COL.frame, GFX.OUT, 1.6);
  D.rect(c, x0, y0, 160, 12, COL.frame, GFX.OUT, 1.6);
  const sw = 74 * (1 - op * 0.82);
  D.poly(c, [x0 + 6, y0 + 6, x0 + 6 + sw, y0 + 6 + op * 10, x0 + 6 + sw, y1 - 6 - op * 10, x0 + 6, y1 - 6], GFX.wire ? null : 'rgba(150,190,220,.55)', '#f4f2ea', 5);
  D.poly(c, [x0 + 154, y0 + 6, x0 + 154 - sw, y0 + 6 + op * 10, x0 + 154 - sw, y1 - 6 - op * 10, x0 + 154, y1 - 6], GFX.wire ? null : 'rgba(150,190,220,.55)', '#f4f2ea', 5);
}
function drawMamaBalcony(c, P, t) {
  const show = P.show || 0;
  if (show <= 0) return;
  const bx = 1300, slab = 420;
  c.save();
  c.beginPath(); c.rect(bx - 120, slab - 400, 240, 400); c.clip();
  c.translate(bx, 372 + (1 - show) * 120); c.scale(0.86, 0.86);
  drawMama(c, P, t);
  c.restore();
  // перила поверх мамы
  D.rect(c, bx - 98, slab - 70, 196, 70, null, '#5a5a62', 3);
  for (let k = 0; k <= 14; k++) D.line(c, bx - 98 + k * 14, slab - 70, bx - 98 + k * 14, slab, '#5a5a62', 2);
}
function drawDoorLive(c, P) {
  const d = DOOR, op = P.open || 0;
  if (op <= 0.01) return;
  D.rect(c, d.x, d.y, d.w, d.h, '#1a1c20', GFX.OUT, 2);
  if (!GFX.wire) { // лестница в глубине
    for (let k = 0; k < 6; k++) D.rect(c, d.x + 10 + k * 8, d.y + d.h - 30 - k * 28, d.w - 20 - k * 16, 6, '#3a3c44', null);
    D.circ(c, d.x + d.w / 2, d.y + 30, 6, 'rgba(255,240,180,.7)', null);
  }
  const lw = d.w * (1 - op * 0.78);
  D.poly(c, [d.x, d.y, d.x - lw * 0.35, d.y - 8 * op, d.x - lw * 0.35, d.y + d.h + 8 * op, d.x, d.y + d.h], D.lg(c, d.x - lw, 0, d.x, 0, [0, '#2e3a2e', 1, COL.door]), GFX.OUT, 2.4);
}
function drawKioskHand(c, P) {
  const p = P.p;
  const ext = p < 0.7 ? E.out(clamp(p / 0.6, 0, 1)) : 1 - E.in(clamp((p - 1.0) / 0.5, 0, 1));
  const x0 = KIOSK.x + 290, y0 = KIOSK.y - 150;
  const hx = x0 - ext * 120, hy = y0 + 10;
  D.limb(c, [x0 + 20, y0, hx, hy], 18, '#e8b0d0');
  drawHand(c, hx, hy, 10, '#f0c4a8', Math.PI);
  if (p < 1.0) { drawBeerCan(c, hx - 4, hy - 26, 1, false); drawVobla(c, hx + 18, hy + 14, 0.9, 0); }
}
function drawPigeonFlock(c, P, t) {
  const r = rng(P.seed || 1);
  for (let i = 0; i < P.n; i++) {
    const bx = lerp(P.x, P.x1, r()), by = P.y + r() * 18, face = r() > 0.5 ? 1 : -1, sd = r();
    let x = bx + Math.sin(t * 0.6 + sd * 10) * 14, y = by, mode = 'peck', f = face;
    const st = P.scatterT, lt = DIR.lastLocal || 0;
    if (st !== null && st !== undefined && lt > st) {
      const k = lt - st;
      x += k * (260 + sd * 200) * (sd > 0.5 ? 1 : -0.6); y -= k * (240 + sd * 160) - Math.sin(k * 6) * 10; mode = 'fly'; f = sd > 0.5 ? 1 : -1;
    }
    drawPigeon(c, x, y, 1.15, f, t + sd * 3, mode, sd);
  }
}
function drawGraffiti(c, P) {
  const name = (viewerName() || 'ЗРИТЕЛЬ').toUpperCase();
  const p = P.p || 0;
  if (p <= 0) return;
  const x = 3425, y = 812;
  c.save();
  c.beginPath(); c.rect(x - 10, y - 70, 300 * p + 10, 170); c.clip();
  c.translate(x, y); c.rotate(-0.06);
  const size = name.length > 8 ? 30 : 40;
  c.font = '900 ' + size + 'px "Russo One", Impact, Arial Black, sans-serif';
  c.textAlign = 'left'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  if (GFX.wire) { c.strokeStyle = GFX.wireCol; c.lineWidth = 1; c.strokeText(name, 0, 0); c.strokeText('РЕЖИССЁР', 0, 48); c.restore(); return; }
  c.strokeStyle = '#111'; c.lineWidth = 10; c.strokeText(name, 0, 0);
  const g = c.createLinearGradient(0, -20, 0, 20); g.addColorStop(0, '#ff5ab8'); g.addColorStop(1, '#ffe63a');
  c.fillStyle = g; c.fillText(name, 0, 0);
  c.font = '900 26px "Russo One", Impact, Arial Black, sans-serif';
  c.strokeStyle = '#111'; c.lineWidth = 8; c.strokeText('— РЕЖИССЁР', 6, 44);
  c.fillStyle = '#3ac8ff'; c.fillText('— РЕЖИССЁР', 6, 44);
  // потёки краски
  c.fillStyle = '#ff5ab8';
  for (let k = 0; k < 6; k++) c.fillRect(10 + k * 34, 16, 3, 10 + (k * 37 % 22));
  c.restore();
}
function drawSnowman(c) {
  D.circ(c, 0, -30, 34, '#fff', GFX.OUT, 2.4);
  D.circ(c, 0, -86, 26, '#fff', GFX.OUT, 2.4);
  D.circ(c, 0, -128, 19, '#fff', GFX.OUT, 2.4);
  D.poly(c, [0, -128, 26, -124, 0, -120], '#ff8a1a', GFX.OUT, 1.4);
  D.circ(c, -7, -134, 2.4, '#111', null); D.circ(c, 7, -134, 2.4, '#111', null);
  D.rect(c, -16, -164, 32, 22, '#c84a2a', GFX.OUT, 1.6);
}

/* ночные огни: окна, фонари */
function drawNightLights(c, night, now) {
  const r = rng(808);
  c.save();
  c.globalAlpha = night;
  for (let fl = 0; fl < 3; fl++) for (const cx of WIN_COLS) {
    const on = r() > 0.45 || (fl === 1 && cx === GENA_WIN.x);
    if (!on) continue;
    const wy = WORLD.base - fl * FLOOR_H - 300;
    const col = pick(['#ffd878', '#ffe8a8', '#a8d8ff', '#ffc070'], r());
    c.fillStyle = col; c.fillRect(cx - 72, wy + 8, 144, 174);
    if (r() > 0.6) { c.fillStyle = 'rgba(40,20,10,.5)'; c.beginPath(); c.ellipse(cx - 20 + r() * 40, wy + 160, 18, 40, 0, 0, TAU); c.fill(); }
  }
  c.restore();
}
function drawNightGlow(c, R, night, now) {
  // свечение фонаря и подъезда (в координатах экрана)
  const cam = R.cam, vs = DIR.viewScale() * cam.z;
  const toS = (x, y) => [APPW / 2 + (x - cam.x) * vs, APPH / 2 + (y - cam.y) * vs];
  c.save(); c.globalCompositeOperation = 'lighter';
  for (const [x, y, r] of [[1534, 555, 300], [DOOR.x + DOOR.w / 2, DOOR.y, 220]]) {
    const [sx, sy] = toS(x, y), rr = r * vs;
    const g = c.createRadialGradient(sx, sy, 0, sx, sy, rr);
    g.addColorStop(0, 'rgba(255,210,120,' + 0.5 * night + ')'); g.addColorStop(1, 'rgba(255,210,120,0)');
    c.fillStyle = g; c.fillRect(sx - rr, sy - rr, rr * 2, rr * 2);
  }
  c.restore();
}

/* ============================================================
   Экранные эффекты сцен
   ============================================================ */
const CODE_LINES = [
  'skuf.belly = 1.00;', 'if (pivo.shaken) boom();', 'gravity = 9.81;', 'babka.zlost++;', 'while (dvor) semki.crack();',
  'gena.hair = null; // давно', 'car.start(); // ошибка 2014', 'hardbass.volume = MAX;', 'const pirozhok = new Pirozhok("капуста");',
  'zina.vocabulary = ["алкаш"];', 'mama.yell("хлеба!");', 'render(dvor, 60fps);', 'barsik.steal(vobla);', 'if (zritel.watching) wave();',
];
function drawCodeRain(c, W, H, now) {
  c.save();
  c.font = '700 ' + Math.round(12 * Math.max(0.8, Math.min(W / 700, H / 372))) + 'px Consolas, Menlo, monospace';
  c.textAlign = 'left'; c.textBaseline = 'top';
  for (let i = 0; i < 10; i++) {
    const y = ((now * 26 + i * H / 10) % (H + 40)) - 20;
    const x = (i % 2 ? W * 0.72 : W * 0.02) + Math.sin(i * 7) * 20;
    c.fillStyle = 'rgba(125,255,168,' + (0.18 + (i % 3) * 0.06) + ')';
    c.fillText(CODE_LINES[(i + Math.floor(now / 3)) % CODE_LINES.length], x, y);
  }
  c.restore();
}
function drawScreenSparks(c, W, H) {
  const x = Math.random() * W, y = Math.random() * H;
  c.save(); c.strokeStyle = Math.random() > 0.5 ? '#bff4ff' : '#fff6a0'; c.lineWidth = 2.5; c.shadowColor = '#8ae8ff'; c.shadowBlur = 12;
  c.beginPath(); c.moveTo(x, y);
  let px = x, py = y;
  for (let i = 0; i < 6; i++) { px += (Math.random() - 0.5) * 70; py += (Math.random() - 0.5) * 70; c.lineTo(px, py); }
  c.stroke(); c.restore();
}
function drawCRTOff(c, W, H, k) {
  const h = H * (1 - E.in(Math.min(1, k * 1.15)));
  c.fillStyle = '#000';
  c.fillRect(0, 0, W, (H - h) / 2);
  c.fillRect(0, (H + h) / 2, W, (H - h) / 2);
  if (k > 0.75) {
    c.fillRect(0, 0, W, H);
    const lw = W * (1 - (k - 0.75) / 0.25);
    const g = c.createLinearGradient(W / 2 - lw / 2, 0, W / 2 + lw / 2, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, '#fff'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(W / 2 - lw / 2, H / 2 - 2, lw, 4);
  }
}
/** окно ошибки в стиле старой системы */
function drawBSOD(c, W, H, fx, now) {
  const k = Math.min(W / 700, H / 372);
  const pw = 440 * k, ph = 196 * k;
  const g = fx.grab || 0;
  let px = W / 2 - pw / 2, py = H / 2 - ph / 2;
  if (g > 0.5) { const q = E.in((g - 0.5) / 0.5); px -= q * (W + pw); py += q * 60 * k; }
  const sc = fx.bsodIn;
  c.save();
  c.translate(px + pw / 2, py + ph / 2); c.scale(sc, sc); if (g > 0.5) c.rotate(-E.in((g - 0.5) / 0.5) * 0.5); c.translate(-pw / 2, -ph / 2);
  c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(6 * k, 6 * k, pw, ph);
  c.fillStyle = '#c0c0c0'; c.fillRect(0, 0, pw, ph);
  c.fillStyle = '#fff'; c.fillRect(0, 0, pw, 2 * k); c.fillRect(0, 0, 2 * k, ph);
  c.fillStyle = '#404040'; c.fillRect(pw - 2 * k, 0, 2 * k, ph); c.fillRect(0, ph - 2 * k, pw, 2 * k);
  const tg = c.createLinearGradient(0, 0, pw, 0); tg.addColorStop(0, '#000080'); tg.addColorStop(1, '#1084d0');
  c.fillStyle = tg; c.fillRect(4 * k, 4 * k, pw - 8 * k, 22 * k);
  c.fillStyle = '#fff'; c.font = '700 ' + 13 * k + 'px Tahoma, Arial, sans-serif'; c.textAlign = 'left'; c.textBaseline = 'middle';
  c.fillText('Мультфильм.exe', 10 * k, 15 * k);
  // крестик
  c.fillStyle = '#c0c0c0'; c.fillRect(pw - 26 * k, 7 * k, 18 * k, 16 * k);
  c.fillStyle = '#000'; c.font = '700 ' + 12 * k + 'px Tahoma, Arial'; c.textAlign = 'center'; c.fillText('x', pw - 17 * k, 15 * k);
  // иконка ошибки
  c.fillStyle = '#d01010'; c.beginPath(); c.arc(40 * k, 70 * k, 18 * k, 0, TAU); c.fill();
  c.strokeStyle = '#fff'; c.lineWidth = 4 * k; c.beginPath(); c.moveTo(32 * k, 62 * k); c.lineTo(48 * k, 78 * k); c.moveTo(48 * k, 62 * k); c.lineTo(32 * k, 78 * k); c.stroke();
  c.fillStyle = '#000'; c.textAlign = 'left'; c.font = 14 * k + 'px Tahoma, Arial, sans-serif';
  c.fillText('Мультфильм выполнил недопустимую операцию', 72 * k, 56 * k);
  c.fillText('и будет закрыт.', 72 * k, 74 * k);
  c.font = 12 * k + 'px Tahoma, Arial, sans-serif'; c.fillStyle = '#303030';
  c.fillText('Причина: пиво попало на материнскую плату.', 72 * k, 100 * k);
  c.fillText('Код ошибки: 0xЖИГУЛИ_2107 (скуф.dll)', 72 * k, 118 * k);
  // кнопки
  const btn = (bx, label, active) => {
    c.fillStyle = '#c0c0c0'; c.fillRect(bx, 146 * k, 120 * k, 30 * k);
    c.fillStyle = '#fff'; c.fillRect(bx, 146 * k, 120 * k, 2 * k); c.fillRect(bx, 146 * k, 2 * k, 30 * k);
    c.fillStyle = '#404040'; c.fillRect(bx + 118 * k, 146 * k, 2 * k, 30 * k); c.fillRect(bx, 174 * k, 120 * k, 2 * k);
    if (active) { c.strokeStyle = '#000'; c.setLineDash([2, 2]); c.lineWidth = 1; c.strokeRect(bx + 6 * k, 151 * k, 108 * k, 20 * k); c.setLineDash([]); }
    c.fillStyle = '#000'; c.font = 13 * k + 'px Tahoma, Arial'; c.textAlign = 'center'; c.fillText(label, bx + 60 * k, 161 * k);
  };
  btn(pw - 270 * k, 'Закрыть', fx.cursor > 0.8);
  btn(pw - 140 * k, 'Подробнее >>', false);
  c.restore();
  // курсор мыши
  if (fx.cursor > 0 && g < 0.5) {
    const cx = lerp(W * 0.9, px + pw - 210 * k, fx.cursor), cy = lerp(H * 0.95, py + 164 * k, fx.cursor);
    c.save(); c.translate(cx, cy); c.scale(k * 1.2, k * 1.2);
    c.fillStyle = '#fff'; c.strokeStyle = '#000'; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 17); c.lineTo(4, 13); c.lineTo(7, 20); c.lineTo(10, 19); c.lineTo(7, 12); c.lineTo(12, 12); c.closePath(); c.fill(); c.stroke();
    c.restore();
  }
  // рука Гены хватает окно
  if (g > 0) {
    const reach = E.out(Math.min(1, g / 0.4));
    const hx = (g < 0.5 ? W / 2 - 30 * k : px + pw / 2 - 30 * k), hy = g < 0.5 ? lerp(H + 120 * k, py + ph - 10 * k, reach) : py + ph - 10 * k;
    c.save(); c.translate(hx, hy); c.scale(k * 2.2, k * 2.2);
    D.limb(c, [0, 80, 0, 10], 30, PAL.skin);
    for (let i = 0; i < 4; i++) D.limb(c, [-12 + i * 8, 4, -12 + i * 8, -14 - (i === 1 || i === 2 ? 4 : 0)], 7, PAL.skin);
    D.ell(c, 0, 4, 18, 14, 0, PAL.skin, GFX.OUT, 2.4);
    D.limb(c, [16, 8, 24, -4], 8, PAL.skin);
    for (let i = 0; i < 6; i++) D.line(c, -10 + i * 4, 30 + (i % 2) * 8, -8 + i * 4, 26 + (i % 2) * 8, '#6a4a3a', 1);
    c.restore();
  }
}
function drawFastForward(c, W, H, now) {
  SCREEN.vhs(c, W, H, 0.7, now);
  const k = Math.min(W / 700, H / 372);
  c.save(); c.translate(W - 90 * k, 40 * k); c.scale(k, k);
  c.fillStyle = '#fff'; c.shadowColor = '#000'; c.shadowBlur = 6;
  c.beginPath(); c.moveTo(0, -14); c.lineTo(20, 0); c.lineTo(0, 14); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(20, -14); c.lineTo(40, 0); c.lineTo(20, 14); c.closePath(); c.fill();
  c.font = '700 18px Consolas, monospace'; c.textAlign = 'right'; c.textBaseline = 'middle'; c.fillText('x4', -10, 0);
  c.restore();
}
function drawTitleCard(c, W, H, p, out, now) {
  const k = Math.min(W / 700, H / 372);
  c.save();
  c.globalAlpha = 1 - out;
  c.fillStyle = 'rgba(10,8,20,' + 0.45 * p + ')'; c.fillRect(0, 0, W, H);
  c.translate(W / 2, H * 0.46);
  c.rotate(-0.05);
  c.scale(lerp(2.6, 1, p) * k, lerp(2.6, 1, p) * k);
  c.globalAlpha = p * (1 - out);
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = '400 26px "Russo One", Impact, Arial Black, sans-serif';
  c.fillStyle = '#9a2a1f'; c.fillText('В МИРЕ', 3, -46 + 3);
  c.fillStyle = '#fff'; c.fillText('В МИРЕ', 0, -46);
  c.font = '400 76px "Russo One", Impact, Arial Black, sans-serif';
  c.fillStyle = '#5a1810'; c.fillText('СКУФОВ', 5, 14 + 5);
  const g = c.createLinearGradient(0, -24, 0, 50); g.addColorStop(0, '#fff3b0'); g.addColorStop(0.5, '#ffd23f'); g.addColorStop(1, '#f08a1c');
  c.fillStyle = g; c.fillText('СКУФОВ', 0, 14);
  c.font = '700 16px "PT Sans Narrow", Arial, sans-serif';
  c.fillStyle = '#f5efdc'; c.fillRect(-120, 54, 240, 26);
  c.fillStyle = '#1b2433'; c.fillText('серия первая: «Пиво и честь»', 0, 67);
  c.restore();
}
function drawIris(c, W, H, k, cam, at) {
  const vs = DIR.viewScale() * cam.z;
  const x = APPW / 2 + (at.x - cam.x) * vs, y = APPH / 2 + (at.y - cam.y) * vs;
  const r = Math.hypot(W, H) * (1 - k);
  c.save(); c.fillStyle = '#000';
  c.beginPath(); c.rect(0, 0, W, H); c.arc(x, y, Math.max(0, r), 0, TAU, true); c.fill('evenodd');
  c.restore();
}

/* титры с портретами */
const CREDIT_CARDS = [
  { head: 'В РОЛЯХ', who: null },
  { head: 'Геннадий', sub: 'скуф обыкновенный', who: 'gen' },
  { head: 'Валентина Петровна', sub: 'высший хищник двора', who: 'val' },
  { head: 'Зинаида Павловна', sub: 'знает одно слово (теперь два)', who: 'zin' },
  { head: 'Вован и Колян', sub: 'спортсмены. Три полоски', who: 'gop' },
  { head: 'Барсик', sub: 'играл самого себя', who: 'cat' },
  { head: 'ВАЗ-2107 «Ласточка»', sub: 'не заводилась', who: 'car' },
  { head: 'Мама Гены', sub: 'голос за кадром', who: 'mama' },
  { head: 'Режиссёр второй половины', sub: '', who: 'you' },
  { head: 'Ни одна бабушка', sub: 'не пострадала. Почти.', who: null },
  { head: 'Мультфильм нарисован кодом', sub: 'Озвучка — синтез речи. Музыка — Web Audio.', who: null },
];
function drawCredits(c, W, H, cr, now) {
  const k = Math.min(W / 700, H / 372);
  const card = CREDIT_CARDS[cr.card];
  const a = Math.min(1, cr.local / 0.35) * Math.min(1, (cr.dur - cr.local) / 0.35);
  c.save();
  c.fillStyle = 'rgba(6,8,16,.55)'; c.fillRect(0, 0, W, H);
  c.globalAlpha = clamp(a, 0, 1);
  const cx = W / 2, cy = H / 2;
  const hasPic = !!card.who;
  const tx = hasPic ? cx + 40 * k : cx;
  if (hasPic) {
    // круглый портрет
    const pr = 74 * k, px = cx - 130 * k, py = cy;
    c.save();
    c.beginPath(); c.arc(px, py, pr, 0, TAU);
    const g = c.createRadialGradient(px, py - pr * 0.3, 4, px, py, pr); g.addColorStop(0, '#3a5a9a'); g.addColorStop(1, '#14203a');
    c.fillStyle = g; c.fill();
    c.lineWidth = 5 * k; c.strokeStyle = '#ffd23f'; c.stroke();
    c.clip();
    c.translate(px, py);
    const s = k * 0.62;
    const P = { legs: 'stand', expr: 'happy', turn: 0.2, mouth: 0.15 + 0.15 * Math.abs(Math.sin(now * 6)), noMods: false };
    if (card.who === 'gen') { c.translate(0, 150 * s); c.scale(s, s); drawGena(c, Object.assign(P, { arms: { L: 'down', R: 'wave' }, holdR: null }), now); }
    else if (card.who === 'val' || card.who === 'zin') { c.translate(0, 125 * s); c.scale(s * 1.15, s * 1.15); drawBabka(c, Object.assign(P, { arms: { L: 'hips', R: 'hips' } }), now, card.who); }
    else if (card.who === 'gop') { c.translate(0, 190 * s); c.scale(s * 0.95, s * 0.95); c.save(); c.translate(-40, 0); drawGopnik(c, Object.assign({}, P, { arms: { L: 'down', R: 'pump' }, beat: now * 2.5 }), now, 'vov'); c.restore(); c.translate(48, 10); drawGopnik(c, Object.assign({}, P, { arms: { L: 'pump', R: 'down' }, beat: now * 2.5 + 0.5 }), now, 'kol'); }
    else if (card.who === 'cat') { c.translate(0, 50 * s); c.scale(s * 2.2, s * 2.2); drawCat(c, { pose: 'sit' }, now); }
    else if (card.who === 'car') { c.translate(0, 40 * s); c.scale(s * 0.6, s * 0.6); drawCar(c, { noWheel: true }, now); }
    else if (card.who === 'mama') { c.translate(0, 40 * s); c.scale(s * 1.5, s * 1.5); drawMama(c, { mouth: 0.4 }, now); }
    else if (card.who === 'you') {
      // хлопушка режиссёра
      c.scale(k, k);
      D.rect(c, -46, -10, 92, 56, '#1a1a1a', '#fff', 3, 4);
      c.save(); c.translate(-46, -10); c.rotate(-0.3 - 0.2 * Math.abs(Math.sin(now * 3)));
      D.rect(c, 0, -16, 92, 16, '#1a1a1a', '#fff', 3, 2);
      for (let i = 0; i < 5; i++) D.poly(c, [6 + i * 18, -16, 16 + i * 18, -16, 10 + i * 18, 0, 0 + i * 18, 0], '#fff', null);
      c.restore();
      c.fillStyle = '#fff'; c.font = '700 14px Consolas, monospace'; c.textAlign = 'center'; c.fillText('СЦЕНА 8', 0, 14); c.fillText('ДУБЛЬ 1', 0, 32);
    }
    c.restore();
  }
  c.textAlign = hasPic ? 'left' : 'center'; c.textBaseline = 'middle';
  const hx = hasPic ? tx - 40 * k : cx;
  c.font = '400 ' + (card.who ? 26 : 34) * k + 'px "Russo One", Impact, Arial Black, sans-serif';
  c.fillStyle = '#ffd23f';
  let head = card.head;
  c.fillText(head, hx, cy - 14 * k);
  c.font = '700 ' + 20 * k + 'px "PT Sans Narrow", Arial, sans-serif';
  c.fillStyle = '#f5efdc';
  let sub = card.sub || '';
  if (card.who === 'you') { const n = viewerName(); sub = n ? n : 'ТЫ. Да-да, именно ты.'; }
  c.fillText(sub, hx, cy + 20 * k);
  c.restore();
}
