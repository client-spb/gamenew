'use strict';
/* ============================================================
   Звук: Web Audio движок, шумы и эффекты, реплики персонажей
   ============================================================ */
const FX = (() => {
  let ctx = null, master = null, comp = null, noiseBuf = null;
  const bus = { music: null, voice: null, sfx: null };
  let duckLevel = 1;

  function audio() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch (e) { return null; }
      comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 4;
      comp.attack.value = 0.004; comp.release.value = 0.2;
      master = ctx.createGain(); master.gain.value = SAVE.sound ? 0.95 : 0;
      master.connect(comp); comp.connect(ctx.destination);
      for (const k of ['music', 'voice', 'sfx']) { bus[k] = ctx.createGain(); bus[k].connect(master); }
      bus.music.gain.value = 0.55; bus.voice.gain.value = 1.0; bus.sfx.gain.value = 0.8;
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return ctx;
  }
  let userUnlocked = false;

  function out(dest) { return dest === 'music' ? bus.music : dest === 'voice' ? bus.voice : bus.sfx; }

  /** простой тон с огибающей; slide — конечная частота */
  function tone(freq, dur, type, vol, delay, slide, dest, attack) {
    const ac = audio();
    if (!ac || !SAVE.sound) return;
    try {
      const t = ac.currentTime + (delay || 0);
      const osc = ac.createOscillator(), g = ac.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t);
      if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
      const a = attack || 0.005;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g); g.connect(out(dest));
      osc.start(t); osc.stop(t + dur + 0.05);
    } catch (e) {}
  }
  /** шум через фильтр: type — lowpass/highpass/bandpass */
  function noise(dur, vol, cutoff, delay, ftype, q, endCut, dest) {
    const ac = audio();
    if (!ac || !SAVE.sound) return;
    try {
      const t = ac.currentTime + (delay || 0);
      const s = ac.createBufferSource(); s.buffer = noiseBuf;
      const f = ac.createBiquadFilter(); f.type = ftype || 'lowpass';
      f.frequency.setValueAtTime(cutoff, t);
      if (q) f.Q.value = q;
      f.frequency.exponentialRampToValueAtTime(Math.max(40, endCut || cutoff * 0.25), t + dur);
      const g = ac.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(out(dest));
      s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
    } catch (e) {}
  }
  /** металлический удар: набор негармоничных частот */
  function metal(base, dur, vol, delay) {
    [1, 1.47, 2.09, 2.76, 3.9].forEach((m, i) => tone(base * m, dur * (1 - i * 0.12), i % 2 ? 'triangle' : 'sine', vol / (i + 1.2), delay));
  }

  /* ---------------- длительные звуки (останавливаются при скрытии) ---------------- */
  const loops = new Map();
  function loopStart(name, build) {
    const ac = audio();
    if (!ac || !SAVE.sound || loops.has(name)) return;
    try { loops.set(name, build(ac)); } catch (e) {}
  }
  function loopStop(name, fade) {
    const l = loops.get(name);
    if (!l) return;
    loops.delete(name);
    try {
      const t = ctx.currentTime;
      l.gain.gain.cancelScheduledValues(t);
      l.gain.gain.setValueAtTime(l.gain.gain.value, t);
      l.gain.gain.linearRampToValueAtTime(0, t + (fade || 0.15));
      l.nodes.forEach(n => { try { n.stop(t + (fade || 0.15) + 0.05); } catch (e) {} });
    } catch (e) {}
  }
  function stopAllLoops() { for (const k of Array.from(loops.keys())) loopStop(k, 0.05); }

  function engineLoop(ac) {
    const g = ac.createGain(); g.gain.value = 0; g.connect(bus.sfx);
    const o1 = ac.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 42;
    const o2 = ac.createOscillator(); o2.type = 'square'; o2.frequency.value = 21;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380;
    const trem = ac.createOscillator(); trem.frequency.value = 9;
    const tg = ac.createGain(); tg.gain.value = 0.08;
    const vg = ac.createGain(); vg.gain.value = 0.12;
    trem.connect(tg); tg.connect(vg.gain);
    o1.connect(lp); o2.connect(lp); lp.connect(vg); vg.connect(g);
    o1.start(); o2.start(); trem.start();
    g.gain.linearRampToValueAtTime(0.9, ac.currentTime + 0.2);
    return { gain: g, nodes: [o1, o2, trem] };
  }
  function hissLoop(ac) {
    const g = ac.createGain(); g.gain.value = 0; g.connect(bus.sfx);
    const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 4200;
    s.connect(f); f.connect(g); s.start();
    g.gain.linearRampToValueAtTime(0.18, ac.currentTime + 0.05);
    return { gain: g, nodes: [s] };
  }
  function staticLoop(ac) {
    const g = ac.createGain(); g.gain.value = 0; g.connect(bus.sfx);
    const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = 0.6;
    s.connect(f); f.connect(g); s.start();
    g.gain.linearRampToValueAtTime(0.12, ac.currentTime + 0.05);
    return { gain: g, nodes: [s] };
  }

  /* ---------------- библиотека эффектов ---------------- */
  const S = {
    click() { tone(900, 0.05, 'sine', 0.08); tone(1800, 0.03, 'sine', 0.03, 0.01); },
    pop() { tone(500, 0.12, 'sine', 0.14, 0, 1300); },
    toggle(on) { tone(on ? 700 : 500, 0.06, 'square', 0.05); tone(on ? 1050 : 380, 0.08, 'square', 0.04, 0.06); },
    domofon() {
      // «пи-ли-пи-ли» старого домофона
      for (let i = 0; i < 6; i++) tone(i % 2 ? 1046 : 1318, 0.11, 'square', 0.06, i * 0.13);
      tone(784, 0.25, 'square', 0.05, 0.8);
    },
    doorOpen() { noise(0.12, 0.35, 3000, 0, 'bandpass', 2); tone(140, 0.2, 'triangle', 0.25, 0.02, 70); metal(260, 0.4, 0.05, 0.04); },
    doorSlam() { noise(0.35, 0.6, 900); tone(90, 0.45, 'sine', 0.5, 0, 40); metal(190, 0.9, 0.09, 0.02); },
    step(alt) { noise(0.06, 0.22, alt ? 1700 : 1300, 0, 'bandpass', 1.4); tone(alt ? 220 : 180, 0.05, 'sine', 0.08); },
    shoe() { noise(0.05, 0.12, 2400, 0, 'bandpass', 2); },
    windowCreak() { tone(320, 0.5, 'sawtooth', 0.04, 0, 520); tone(330, 0.45, 'sawtooth', 0.03, 0.05, 260); noise(0.4, 0.05, 1800, 0, 'bandpass', 6); },
    windowSlam() { noise(0.2, 0.35, 1600); metal(420, 0.3, 0.05); },
    coin() { tone(1567, 0.12, 'triangle', 0.12); tone(2093, 0.25, 'triangle', 0.1, 0.07); },
    clink() { metal(1200, 0.25, 0.06); },
    canOpen() { noise(0.05, 0.4, 5000, 0, 'highpass'); noise(0.35, 0.35, 6000, 0.03, 'highpass', 0, 2500); },
    gush() {
      noise(2.4, 0.55, 2400, 0, 'bandpass', 0.8, 700);
      noise(1.6, 0.3, 6000, 0.1, 'highpass', 0, 3000);
      for (let i = 0; i < 14; i++) tone(300 + Math.random() * 900, 0.08, 'sine', 0.05, 0.1 + i * 0.12, 200);
    },
    splat() { noise(0.4, 0.6, 1200, 0, 'lowpass', 0, 200); tone(160, 0.25, 'sine', 0.3, 0, 60); },
    starter() {
      for (let i = 0; i < 7; i++) {
        noise(0.12, 0.35, 700, i * 0.2, 'lowpass', 0, 200);
        tone(70 + (i % 2) * 8, 0.14, 'sawtooth', 0.14, i * 0.2, 45);
      }
      noise(0.6, 0.3, 500, 1.45, 'lowpass', 0, 120);
    },
    backfire() { noise(0.25, 0.9, 1800, 0, 'lowpass', 0, 200); tone(70, 0.4, 'sine', 0.6, 0, 30); },
    voblaHit() { tone(130, 0.18, 'sine', 0.5, 0, 60); noise(0.12, 0.5, 900); metal(150, 0.35, 0.05); },
    seed() { noise(0.025, 0.12, 4000 + Math.random() * 2000, 0, 'bandpass', 4); },
    spit() { noise(0.12, 0.2, 2600, 0, 'bandpass', 1.5); tone(600, 0.08, 'sine', 0.04, 0.02, 300); },
    coo() { const v = 280 + Math.random() * 40; for (let i = 0; i < 3; i++) tone(v - i * 18, 0.14, 'sine', 0.06, i * 0.16, v - 50); },
    flutter() { for (let i = 0; i < 10; i++) noise(0.04, 0.12, 1400, i * 0.045, 'bandpass', 1.2); },
    caw() { tone(620, 0.22, 'sawtooth', 0.06, 0, 470); tone(600, 0.22, 'sawtooth', 0.05, 0.3, 450); noise(0.2, 0.04, 1200, 0, 'bandpass', 3); },
    meow() { tone(520, 0.45, 'triangle', 0.11, 0, 760); tone(760, 0.3, 'sine', 0.06, 0.25, 480); tone(1040, 0.4, 'sine', 0.03, 0.05, 1500); },
    hiss() { noise(0.5, 0.25, 5000, 0, 'highpass'); },
    sprayShake() { for (let i = 0; i < 6; i++) metal(2400, 0.06, 0.05, i * 0.09); },
    glitch() {
      for (let i = 0; i < 18; i++) tone(80 + Math.random() * 1600, 0.035, 'square', 0.06, i * 0.045);
      noise(0.8, 0.15, 3000, 0, 'bandpass', 3);
    },
    zap() { noise(0.4, 0.4, 7000, 0, 'highpass', 0, 1500); tone(2400, 0.35, 'sawtooth', 0.08, 0, 90); tone(60, 0.5, 'square', 0.12, 0, 30); },
    bsod() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.9, 'sine', 0.09, i * 0.03)); tone(261, 1.1, 'triangle', 0.08); },
    errorDing() { tone(880, 0.35, 'sine', 0.13); tone(1320, 0.35, 'sine', 0.07); tone(660, 0.5, 'sine', 0.1, 0.18); },
    powerDown() { tone(900, 1.2, 'sawtooth', 0.08, 0, 40); noise(0.9, 0.2, 2000, 0, 'lowpass', 0, 60); },
    powerUp() { tone(60, 0.9, 'sawtooth', 0.07, 0, 900); tone(120, 0.9, 'square', 0.04, 0.1, 1800); },
    rewind() {
      tone(200, 2.2, 'sawtooth', 0.06, 0, 2600); tone(203, 2.2, 'square', 0.03, 0, 2650);
      noise(2.2, 0.15, 3000, 0, 'bandpass', 2, 6000);
    },
    whoosh() { noise(0.35, 0.3, 600, 0, 'bandpass', 1.2, 3200); },
    bonk() { tone(190, 0.25, 'sine', 0.35, 0, 55); noise(0.12, 0.3, 700); },
    boing() { const ac = audio(); if (!ac) return; tone(220, 0.5, 'sine', 0.2, 0, 660); tone(440, 0.4, 'triangle', 0.05, 0.05, 220); },
    bubble() { tone(300, 0.12, 'sine', 0.2, 0, 900); tone(500, 0.1, 'sine', 0.12, 0.09, 1200); },
    giant() { tone(140, 0.9, 'sine', 0.45, 0, 38); noise(0.7, 0.3, 300); },
    owl() { tone(420, 0.3, 'sine', 0.12, 0, 380); tone(400, 0.5, 'sine', 0.12, 0.45, 360); },
    chime() { [1318, 1567, 2093, 2637].forEach((f, i) => tone(f, 0.7, 'sine', 0.05, i * 0.07)); },
    stamp() { tone(70, 0.5, 'sine', 0.55, 0, 35); noise(0.25, 0.5, 900); },
    tvOn() { noise(0.6, 0.18, 6000, 0, 'highpass', 0, 2000); tone(15600, 0.6, 'sine', 0.01); },
    swish() { noise(0.2, 0.2, 2200, 0, 'bandpass', 1.5, 900); },
    clang() { metal(330, 1.2, 0.16); noise(0.3, 0.4, 2000); tone(80, 0.5, 'sine', 0.3, 0, 40); },
    roll() { for (let i = 0; i < 8; i++) { noise(0.1, 0.1, 400, i * 0.16); metal(500, 0.08, 0.02, i * 0.16); } },
    horn() { tone(392, 0.4, 'sawtooth', 0.1); tone(494, 0.4, 'sawtooth', 0.08); },
    gulp() { for (let i = 0; i < 3; i++) tone(240, 0.12, 'sine', 0.2, i * 0.28, 120); },
    yawnStretch() { noise(0.5, 0.05, 900, 0, 'bandpass', 2); },
    chew() { for (let i = 0; i < 4; i++) noise(0.06, 0.12, 900, i * 0.18, 'bandpass', 3); },
    cheer() {
      for (let i = 0; i < 26; i++) noise(0.04, 0.1 + Math.random() * 0.1, 2000 + Math.random() * 1500, Math.random() * 1.4, 'bandpass', 2);
    },
    kiosk() { noise(0.3, 0.2, 1500, 0, 'bandpass', 3, 900); },
    paper() { noise(0.18, 0.12, 3500, 0, 'bandpass', 1); },
    scratch() { noise(0.2, 0.08, 2500, 0, 'bandpass', 4); noise(0.2, 0.08, 2200, 0.25, 'bandpass', 4); },
    applause() { this.cheer(); },
  };

  /* ---------------- реплики ---------------- */
  const buffers = {};
  const reversed = {};
  let voiceLoaded = 0, voiceTotal = 0, voiceReady = false;
  const playing = new Map();     // ключ → {src, g}

  function b64ToBuf(b64) {
    const bin = atob(b64);
    const len = bin.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }
  function decode(ab) {
    const ac = audio();
    return new Promise((res, rej) => {
      try {
        const p = ac.decodeAudioData(ab, res, rej);
        if (p && p.then) p.then(res, rej);
      } catch (e) { rej(e); }
    });
  }
  async function decodeVoices(onProgress) {
    const data = window.VOICE_DATA;
    if (!data || !audio()) return false;
    const ids = Object.keys(data);
    voiceTotal = ids.length;
    // небольшими пачками, чтобы не подвесить слабый телефон
    for (let i = 0; i < ids.length; i += 6) {
      await Promise.all(ids.slice(i, i + 6).map(async id => {
        try { buffers[id] = await decode(b64ToBuf(data[id])); } catch (e) { /* реплика останется без звука, субтитры покажутся */ }
        voiceLoaded++;
      }));
      if (onProgress) onProgress(voiceLoaded / voiceTotal);
      await new Promise(r => setTimeout(r, 0));
    }
    voiceReady = true;
    return true;
  }
  function getReversed(id) {
    if (reversed[id]) return reversed[id];
    const b = buffers[id]; if (!b) return null;
    const ac = audio();
    const r = ac.createBuffer(b.numberOfChannels, b.length, b.sampleRate);
    for (let c = 0; c < b.numberOfChannels; c++) {
      const s = b.getChannelData(c), d = r.getChannelData(c);
      for (let i = 0, n = s.length; i < n; i++) d[i] = s[n - 1 - i];
    }
    reversed[id] = r;
    return r;
  }
  /** запустить реплику с позиции offset; key — уникальный ключ экземпляра */
  function voicePlay(key, id, offset, opts) {
    const ac = audio();
    if (!ac || !SAVE.sound) return false;
    const rev = opts && opts.reverse;
    const buf = rev ? getReversed(id) : buffers[id];
    if (!buf) return false;
    voiceStop(key);
    try {
      const src = ac.createBufferSource(); src.buffer = buf;
      if (opts && opts.rate) src.playbackRate.value = opts.rate;
      const g = ac.createGain(); g.gain.value = (opts && opts.vol) || 1;
      src.connect(g); g.connect(bus.voice);
      src.start(ac.currentTime + 0.01, clamp(offset || 0, 0, Math.max(0, buf.duration - 0.02)));
      const rec = { src, g, id };
      src.onended = () => { if (playing.get(key) === rec) playing.delete(key); };
      playing.set(key, rec);
      return true;
    } catch (e) { return false; }
  }
  function voiceStop(key) {
    const r = playing.get(key);
    if (!r) return;
    playing.delete(key);
    try { r.g.gain.setTargetAtTime(0, ctx.currentTime, 0.015); r.src.stop(ctx.currentTime + 0.08); } catch (e) {}
  }
  function voiceStopAll() { for (const k of Array.from(playing.keys())) voiceStop(k); }
  function voiceIsPlaying(key) { return playing.has(key); }

  /** приглушить музыку, пока звучит голос */
  function duck(on) {
    const target = on ? 0.38 : 1;
    if (!ctx || target === duckLevel) return;
    duckLevel = target;
    try { bus.music.gain.setTargetAtTime(0.55 * target, ctx.currentTime, 0.12); } catch (e) {}
  }

  function setSound(on) {
    SAVE.sound = on;
    if (!ctx) return;
    try { master.gain.setTargetAtTime(on ? 0.95 : 0, ctx.currentTime, 0.03); } catch (e) {}
    if (!on) { stopAllLoops(); voiceStopAll(); }
  }

  return {
    ctx: audio, tone, noise, metal, S, bus: () => bus, out,
    unlock() {
      userUnlocked = true;
      const ac = audio();
      if (ac && ac.state === 'suspended') { try { ac.resume(); } catch (e) {} }
    },
    suspend() { try { if (ctx && ctx.state === 'running') ctx.suspend(); } catch (e) {} },
    resume() { try { if (ctx && ctx.state === 'suspended' && userUnlocked) ctx.resume(); } catch (e) {} },
    loopStart, loopStop, stopAllLoops, engineLoop, hissLoop, staticLoop,
    decodeVoices, voicePlay, voiceStop, voiceStopAll, voiceIsPlaying, duck, setSound,
    hasVoice: id => !!buffers[id],
    voiceReady: () => voiceReady,
    now: () => (ctx ? ctx.currentTime : 0),
    noiseBuffer: () => noiseBuf,
  };
})();
document.addEventListener('pointerdown', () => FX.unlock(), true);
document.addEventListener('keydown', () => FX.unlock(), true);
