'use strict';
/* ============================================================
   Музыка: инструменты на Web Audio и шаговый секвенсор
   Темы: документалка, дворовый вальс на баяне, частушки,
   хардбас, грусть, 8-бит, закат под гитару, финальная полька
   ============================================================ */
const NOTE_IDX = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const _nf = {};
function nf(name) {
  if (typeof name === 'number') return name;
  if (_nf[name]) return _nf[name];
  const m = /^([A-G][#b]?)(-?\d)$/.exec(name);
  if (!m) return 0;
  const midi = (parseInt(m[2], 10) + 1) * 12 + NOTE_IDX[m[1]];
  return (_nf[name] = 440 * Math.pow(2, (midi - 69) / 12));
}
const CHORDS = {
  Am: ['A3', 'C4', 'E4'], Dm: ['D3', 'F3', 'A3'], E7: ['E3', 'G#3', 'B3', 'D4'], E: ['E3', 'G#3', 'B3'],
  F: ['F3', 'A3', 'C4'], C: ['C3', 'E3', 'G3'], G: ['G3', 'B3', 'D4'], D: ['D3', 'F#3', 'A3'],
  A: ['A3', 'C#4', 'E4'], A7: ['A3', 'C#4', 'E4', 'G4'], Bm: ['B3', 'D4', 'F#4'], Fm: ['F3', 'Ab3', 'C4'],
  Db: ['Db3', 'F3', 'Ab3'], Eb: ['Eb3', 'G3', 'Bb3'], Cm: ['C3', 'Eb3', 'G3'], Ab: ['Ab3', 'C4', 'Eb4'],
  Bb: ['Bb2', 'D3', 'F3'], Gm: ['G3', 'Bb3', 'D4'], E7b: ['E3', 'G#3', 'D4'], Em: ['E3', 'G3', 'B3'],
};
const ROOT = { Am: 'A2', Dm: 'D2', E7: 'E2', E: 'E2', F: 'F2', C: 'C2', G: 'G2', D: 'D2', A: 'A2', A7: 'A2', Bm: 'B1', Fm: 'F2', Db: 'Db2', Eb: 'Eb2', Cm: 'C2', Ab: 'Ab1', Bb: 'Bb1', Gm: 'G2', Em: 'E2' };
const FIFTH = { Am: 'E2', Dm: 'A1', E7: 'B1', E: 'B1', F: 'C2', C: 'G1', G: 'D2', D: 'A1', A: 'E2', A7: 'E2', Bm: 'F#2', Fm: 'C2', Cm: 'G1', Gm: 'D2', Em: 'B1' };

/** разбор мелодии: «E5 _ D5 . C5» — нота, «_» тянуть, «.» пауза; unit — шагов на токен */
function parseMel(str, unit) {
  const tk = str.trim().split(/\s+/), ev = [];
  for (let i = 0; i < tk.length; i++) {
    const t = tk[i];
    if (t === '_' || t === '.') continue;
    let len = 1;
    while (tk[i + len] === '_') len++;
    ev.push({ s: i * unit, n: t, l: len * unit });
  }
  return { ev, len: tk.length * unit };
}

const INST = (() => {
  const A = () => FX.ctx();
  function env(g, t, a, peak, dur, rel) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    g.gain.setValueAtTime(Math.max(0.0002, peak), t + Math.max(a, dur - rel));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  function osc(type, f, t, end, dest, detune) {
    const ac = A(); const o = ac.createOscillator();
    o.type = type; o.frequency.setValueAtTime(f, t); if (detune) o.detune.value = detune;
    o.connect(dest); o.start(t); o.stop(end + 0.05);
    return o;
  }
  return {
    accordion(freqs, t, dur, vol, out) {
      const ac = A(); if (!ac) return;
      const g = ac.createGain(); env(g, t, 0.035, vol, dur, 0.07);
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400; lp.Q.value = 1.4;
      const pk = ac.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = 1150; pk.gain.value = 6; pk.Q.value = 1.2;
      lp.connect(pk); pk.connect(g); g.connect(out);
      const lfo = ac.createOscillator(); lfo.frequency.value = 5.6;
      const lg = ac.createGain(); lg.gain.value = vol * 0.18;
      lfo.connect(lg); lg.connect(g.gain); lfo.start(t); lfo.stop(t + dur + 0.05);
      for (const fr of freqs) {
        const f = nf(fr);
        osc('sawtooth', f, t, t + dur, lp, -7);
        osc('sawtooth', f, t, t + dur, lp, 7);
        osc('square', f / 2, t, t + dur, lp, 0);
      }
    },
    pluck(fr, t, vol, decay, out, bright) {
      const ac = A(); if (!ac) return;
      const f = nf(fr), d = decay || 0.6;
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2;
      lp.frequency.setValueAtTime(bright || 3200, t);
      lp.frequency.exponentialRampToValueAtTime(360, t + d * 0.8);
      lp.connect(g); g.connect(out);
      osc('sawtooth', f, t, t + d, lp, 0);
      osc('triangle', f * 2, t, t + d * 0.5, lp, 3);
    },
    bass(fr, t, dur, vol, out, type) {
      const ac = A(); if (!ac) return;
      const g = ac.createGain(); env(g, t, 0.008, vol, dur, 0.05);
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
      lp.connect(g); g.connect(out);
      osc(type || 'triangle', nf(fr), t, t + dur, lp);
      osc('sine', nf(fr), t, t + dur, lp);
    },
    saw(fr, t, dur, vol, out, cutoff, res) {
      const ac = A(); if (!ac) return;
      const g = ac.createGain(); env(g, t, 0.005, vol, dur, 0.04);
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = res || 6;
      lp.frequency.setValueAtTime(cutoff || 2600, t);
      lp.frequency.exponentialRampToValueAtTime((cutoff || 2600) * 0.3, t + dur);
      lp.connect(g); g.connect(out);
      osc('sawtooth', nf(fr), t, t + dur, lp, -9);
      osc('sawtooth', nf(fr), t, t + dur, lp, 9);
    },
    square(fr, t, dur, vol, out, duty) {
      const ac = A(); if (!ac) return;
      const g = ac.createGain(); env(g, t, 0.003, vol, dur, 0.02);
      g.connect(out);
      osc(duty ? 'sawtooth' : 'square', nf(fr), t, t + dur, g);
    },
    flute(fr, t, dur, vol, out) {
      const ac = A(); if (!ac) return;
      const f = nf(fr);
      const g = ac.createGain(); env(g, t, 0.08, vol, dur, 0.15);
      g.connect(out);
      const o = osc('sine', f, t, t + dur, g);
      osc('triangle', f * 2, t, t + dur, g).detune.value = 4;
      const lfo = ac.createOscillator(); lfo.frequency.value = 5.2;
      const lg = ac.createGain(); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.012, t + 0.35);
      lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + dur + 0.05);
      const n = ac.createBufferSource(); n.buffer = FX.noiseBuffer();
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * 2; bp.Q.value = 3;
      const ng = ac.createGain(); env(ng, t, 0.03, vol * 0.18, Math.min(dur, 0.3), 0.1);
      n.connect(bp); bp.connect(ng); ng.connect(out); n.start(t, Math.random()); n.stop(t + dur);
    },
    pad(freqs, t, dur, vol, out, cutoff) {
      const ac = A(); if (!ac) return;
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + Math.min(0.6, dur * 0.4));
      g.gain.setValueAtTime(vol, t + dur * 0.7);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = cutoff || 1100;
      lp.connect(g); g.connect(out);
      for (const fr of freqs) { osc('sawtooth', nf(fr), t, t + dur, lp, -12); osc('sawtooth', nf(fr), t, t + dur, lp, 12); }
    },
    harmonica(fr, t, dur, vol, out) {
      const ac = A(); if (!ac) return;
      const f = nf(fr);
      const g = ac.createGain(); env(g, t, 0.05, vol, dur, 0.1);
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1300; bp.Q.value = 0.9;
      bp.connect(g); g.connect(out);
      const o1 = osc('square', f, t, t + dur, bp), o2 = osc('sawtooth', f, t, t + dur, bp, 8);
      const lfo = ac.createOscillator(); lfo.frequency.value = 6;
      const lg = ac.createGain(); lg.gain.value = f * 0.015;
      lfo.connect(lg); lg.connect(o1.frequency); lg.connect(o2.frequency); lfo.start(t); lfo.stop(t + dur + 0.05);
    },
    bell(fr, t, vol, out) {
      const f = nf(fr);
      [1, 2.76, 5.4].forEach((m, i) => {
        const ac = A(); const g = ac.createGain();
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol / (i + 1), t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4 / (i + 1));
        g.connect(out); osc('sine', f * m, t, t + 1.4, g);
      });
    },
    kick(t, vol, out) {
      const ac = A(); if (!ac) return;
      const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
      g.connect(out);
      const o = osc('sine', 150, t, t + 0.32, g);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
      const c = ac.createGain(); c.gain.setValueAtTime(vol * 0.5, t); c.gain.exponentialRampToValueAtTime(0.0001, t + 0.02);
      c.connect(out); osc('square', 900, t, t + 0.02, c);
    },
    hardKick(t, vol, out) {
      const ac = A(); if (!ac) return;
      const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
      const ws = ac.createWaveShaper();
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.tanh(x * 6); }
      ws.curve = curve;
      ws.connect(g); g.connect(out);
      const o = osc('sine', 190, t, t + 0.38, ws);
      o.frequency.exponentialRampToValueAtTime(48, t + 0.1);
    },
    noiseHit(t, vol, cut, dur, type, out, q) {
      const ac = A(); if (!ac) return;
      const s = ac.createBufferSource(); s.buffer = FX.noiseBuffer();
      const f = ac.createBiquadFilter(); f.type = type || 'highpass'; f.frequency.value = cut; if (q) f.Q.value = q;
      const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.02);
    },
    snare(t, vol, out) { this.noiseHit(t, vol, 1800, 0.18, 'bandpass', out, 0.8); const ac = A(); const g = ac.createGain(); g.gain.setValueAtTime(vol * 0.6, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1); g.connect(out); osc('triangle', 190, t, t + 0.1, g); },
    hat(t, vol, out, open) { this.noiseHit(t, vol, 7500, open ? 0.2 : 0.05, 'highpass', out); },
    clap(t, vol, out) { for (let i = 0; i < 3; i++) this.noiseHit(t + i * 0.012, vol, 1500, 0.09, 'bandpass', out, 1.2); },
    shaker(t, vol, out) { this.noiseHit(t, vol, 5200, 0.06, 'bandpass', out, 2); },
    hey(t, vol, out) {
      // «Хэй!» хардбаса: формантный шум + короткая нота
      const ac = A(); if (!ac) return;
      this.noiseHit(t, vol, 1100, 0.22, 'bandpass', out, 4);
      this.noiseHit(t, vol * 0.6, 2400, 0.18, 'bandpass', out, 5);
      const g = ac.createGain(); g.gain.setValueAtTime(vol * 0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      g.connect(out); const o = osc('sawtooth', 280, t, t + 0.2, g); o.frequency.exponentialRampToValueAtTime(200, t + 0.2);
    },
  };
})();

/* ---------------- темы ---------------- */
const THEMES = {};

/* Документальная заставка: флейта, струнный фон, щипки (D-dur, 82 bpm) */
(function () {
  const clean = parseMel(('F#5 _ A5 _ B5 A5 F#5 _ E5 _ D5 _ F#5 _ E5 _ D5 _ B4 _ D5 E5 F#5 _ E5 _ _ _ A4 _ _ _ ' +
    'F#5 _ A5 _ D6 _ C#6 B5 A5 _ F#5 _ G5 _ E5 _ F#5 _ D5 _ E5 _ C#5 _ D5 _ _ _ _ _ _ _'), 2);
  const ch = ['D', 'Bm', 'G', 'A', 'D', 'Bm', 'G', 'A7'];
  THEMES.doc = {
    bpm: 82, len: 128,
    step(s, t, sd, out) {
      const bar = Math.floor(s / 16) % 8, sb = s % 16;
      const c = ch[bar];
      if (sb === 0) { INST.pad(CHORDS[c].map(n => n.replace(/\d/, d => +d + 1)), t, sd * 16, 0.035, out, 1400); INST.bass(ROOT[c], t, sd * 7, 0.18, out, 'sine'); }
      if (sb === 8) INST.bass(FIFTH[c] || ROOT[c], t, sd * 7, 0.12, out, 'sine');
      if (sb % 4 === 2) { const nts = CHORDS[c]; INST.pluck(nts[(sb / 4 | 0) % nts.length].replace(/\d/, d => +d + 1), t, 0.06, 0.5, out, 2200); }
      for (const e of clean.ev) if (e.s === s % clean.len) INST.flute(e.n, t, e.l * sd * 0.95, 0.1, out);
      if (sb === 0 && bar % 2 === 0) INST.noiseHit(t, 0.03, 3000, 0.6, 'bandpass', out, 0.5);
    }
  };
})();

/* Дворовый вальс на баяне (A-moll, 3/4) */
(function () {
  const mel = parseMel(
    'E5 _ _ _ D5 C5  B4 _ A4 _ _ _  A4 _ D5 _ F5 _  E5 _ _ _ . .  ' +
    'E5 _ F5 E5 D5 _  G#4 _ B4 _ D5 _  C5 _ B4 _ A4 _  A4 _ _ _ . .  ' +
    'D5 _ E5 _ F5 _  A5 _ _ _ G5 F5  E5 _ C5 _ A4 _  E5 _ _ _ . .  ' +
    'D5 _ C5 _ B4 _  G#4 _ A4 _ B4 _  C5 _ B4 _ G#4 _  A4 _ _ _ . .', 2);
  const ch = ['Am', 'Am', 'Dm', 'Am', 'Dm', 'E7', 'Am', 'Am', 'Dm', 'Dm', 'Am', 'Am', 'Dm', 'E7', 'E7', 'Am'];
  THEMES.dvor = {
    bpm: 132, stepsPerBeat: 2, len: 16 * 6,
    step(s, t, sd, out) {
      const bar = Math.floor(s / 6) % 16, sb = s % 6, c = ch[bar];
      if (sb === 0) INST.bass(bar % 2 ? (FIFTH[c] || ROOT[c]) : ROOT[c], t, sd * 1.8, 0.24, out);
      if (sb === 2 || sb === 4) INST.accordion(CHORDS[c], t, sd * 1.2, 0.035, out);
      for (const e of mel.ev) if (e.s === s % mel.len) INST.accordion([e.n], t, e.l * sd * 0.92, 0.05, out);
      if (sb === 0) INST.shaker(t, 0.03, out);
    }
  };
  // вариант для титров: мажорная полька
  const pmel = parseMel(
    'A4 C#5 E5 C#5 A5 _ E5 _  F#5 E5 D5 C#5 B4 _ . .  B4 D5 F#5 D5 B5 _ F#5 _  E5 D5 C#5 B4 A4 _ . .  ' +
    'C#5 _ C#5 D5 E5 _ E5 _  F#5 E5 D5 F#5 E5 _ . .  D5 C#5 B4 D5 C#5 B4 A4 C#5  B4 _ E5 _ A4 _ . .', 1);
  const pch = ['A', 'D', 'E7', 'A', 'A', 'D', 'E7', 'A'];
  THEMES.polka = {
    bpm: 150, stepsPerBeat: 2, len: 64,
    step(s, t, sd, out) {
      const bar = Math.floor(s / 8) % 8, sb = s % 8, c = pch[bar];
      if (sb === 0 || sb === 4) INST.bass(sb === 0 ? ROOT[c] : (FIFTH[c] || ROOT[c]), t, sd * 1.5, 0.24, out);
      if (sb === 2 || sb === 6) INST.accordion(CHORDS[c], t, sd * 1.1, 0.032, out);
      for (const e of pmel.ev) if (e.s === s % pmel.len) INST.accordion([e.n], t, e.l * sd * 0.85, 0.05, out);
      if (sb % 2 === 0) INST.hat(t, sb % 4 === 0 ? 0.03 : 0.05, out);
      if (sb === 4) INST.snare(t, 0.08, out);
    }
  };
})();

/* Частушки на балалайке (D-dur, 2/4) */
(function () {
  const mel = parseMel(
    'A4 A4 F#4 A4  D5 _ C#5 B4  A4 G4 F#4 E4  E4 _ . .  ' +
    'E4 E4 C#4 E4  A4 _ G4 F#4  E4 F#4 G4 E4  D4 _ . .', 2);
  const ch = ['D', 'D', 'A', 'A', 'A', 'A', 'A', 'D'];
  THEMES.babki = {
    bpm: 128, stepsPerBeat: 4, len: 64,
    step(s, t, sd, out) {
      const bar = Math.floor(s / 8) % 8, sb = s % 8, c = ch[bar];
      if (sb === 0) INST.bass(ROOT[c], t, sd * 3, 0.22, out);
      if (sb === 4) INST.bass(FIFTH[c] || ROOT[c], t, sd * 3, 0.18, out);
      if (sb === 2 || sb === 6) for (const n of CHORDS[c]) INST.pluck(n, t, 0.035, 0.25, out, 2600);
      // тремоло балалайки: повтор ноты мелодии каждые 16-е
      for (const e of mel.ev) {
        const st = s % mel.len;
        if (st >= e.s && st < e.s + e.l) INST.pluck(e.n.replace(/\d/, d => +d + 1), t, st === e.s ? 0.085 : 0.05, 0.22, out, 4200);
      }
      if (sb === 4) INST.noiseHit(t, 0.05, 2600, 0.08, 'bandpass', out, 2);
    }
  };
})();

/* Хардбас (F-moll, 150 bpm) — брачный зов гопника */
(function () {
  const bassLine = ['F2', 'F2', 'F2', 'Ab2', 'Db2', 'Db2', 'Eb2', 'Eb2'];
  const lead = parseMel('F4 . F4 . Ab4 . C5 . Bb4 . Ab4 . G4 . Eb4 .  F4 . F4 . Ab4 . C5 . Eb5 . Db5 . C5 . Ab4 .', 1);
  THEMES.hardbass = {
    bpm: 150, stepsPerBeat: 4, len: 128,
    step(s, t, sd, out) {
      const sb = s % 16, bar = Math.floor(s / 16) % 8;
      if (sb % 4 === 0) INST.hardKick(t, 0.5, out);
      if (sb % 4 === 2) { INST.saw(bassLine[(Math.floor(s / 8)) % 8], t, sd * 1.7, 0.16, out, 900, 8); INST.hat(t, 0.08, out, true); }
      if (sb === 4 || sb === 12) INST.clap(t, 0.12, out);
      if (sb % 2 === 1) INST.hat(t, 0.03, out);
      if (bar >= 2) for (const e of lead.ev) if (e.s === (s % 32)) INST.saw(e.n, t, sd * 0.9, 0.07, out, 3600, 3);
      if (sb === 0 && bar % 2 === 0) INST.hey(t + sd * 14, 0.22, out);
    }
  };
})();

/* Грусть: губная гармошка (A-moll) */
(function () {
  const mel = parseMel('E5 _ _ D5 C5 _ _ _ B4 _ C5 _ A4 _ _ _  F4 _ A4 _ C5 _ B4 A4 G#4 _ _ _ _ _ . .', 2);
  const ch = ['Am', 'F', 'Dm', 'E'];
  THEMES.sad = {
    bpm: 66, stepsPerBeat: 4, len: 64,
    step(s, t, sd, out) {
      const bar = Math.floor(s / 16) % 4, sb = s % 16, c = ch[bar];
      if (sb === 0) { INST.pad(CHORDS[c], t, sd * 16, 0.04, out, 900); INST.bass(ROOT[c], t, sd * 14, 0.16, out, 'sine'); }
      if (sb % 4 === 0) INST.pluck(CHORDS[c][(sb / 4) % CHORDS[c].length], t, 0.04, 0.9, out, 1600);
      for (const e of mel.ev) if (e.s === s % mel.len) INST.harmonica(e.n, t, e.l * sd * 0.95, 0.06, out);
    }
  };
})();

/* 8-бит: мультфильм сломался, режим разработчика */
(function () {
  const prog = ['Cm', 'Ab', 'Eb', 'Bb'];
  const arp = [0, 1, 2, 1, 2, 3, 2, 1];
  THEMES.chip = {
    bpm: 136, stepsPerBeat: 4, len: 64,
    step(s, t, sd, out) {
      const bar = Math.floor(s / 16) % 4, sb = s % 16, c = prog[bar];
      const notes = CHORDS[c].concat([CHORDS[c][0].replace(/\d/, d => +d + 1)]);
      INST.square(notes[arp[sb % 8]].replace(/\d/, d => +d + 2), t, sd * 0.8, 0.035, out);
      if (sb % 4 === 0) INST.square(ROOT[c].replace(/\d/, d => +d + 1), t, sd * 1.8, 0.06, out, true);
      if (sb % 8 === 0) INST.kick(t, 0.35, out);
      if (sb % 8 === 4) INST.noiseHit(t, 0.1, 3000, 0.08, 'bandpass', out, 1);
      if (sb % 2 === 1) INST.hat(t, 0.025, out);
      if (sb === 0 && bar === 3) INST.square('G5', t, sd * 4, 0.04, out);
    }
  };
})();

/* Напряжение: ритуал воблы (барабанная дробь, бас) */
THEMES.tension = {
  bpm: 100, stepsPerBeat: 4, len: 64,
  step(s, t, sd, out) {
    const sb = s % 16;
    if (sb === 0) { INST.pad(['D3', 'A3', 'Eb4'], t, sd * 16, 0.03, out, 700); INST.bass('D2', t, sd * 15, 0.2, out, 'sine'); }
    INST.snare(t, 0.015 + 0.04 * ((s % 64) / 64), out);
    if (sb === 0 || sb === 10) INST.kick(t, 0.3, out);
    if (sb === 6) INST.pluck('D4', t, 0.05, 0.3, out, 1200);
  }
};

/* Закат: гитара и баян (Am F C G) */
(function () {
  const ch = ['Am', 'F', 'C', 'G', 'Am', 'F', 'C', 'E'];
  const mel = parseMel(
    'C5 _ _ _ B4 A4 _ _  A4 _ _ _ C5 _ _ _  E5 _ _ _ D5 C5 _ _  B4 _ _ _ D5 _ _ _ ' +
    'E5 _ _ _ D5 C5 _ _  A4 _ _ _ C5 _ _ _  G4 _ _ _ A4 _ C5 _  B4 _ _ _ _ _ _ _', 2);
  const pat = [0, 2, 1, 2, 0, 2, 1, 2];
  THEMES.sunset = {
    bpm: 84, stepsPerBeat: 4, len: 128,
    step(s, t, sd, out) {
      const bar = Math.floor(s / 16) % 8, sb = s % 16, c = ch[bar];
      if (sb === 0) INST.bass(ROOT[c], t, sd * 7, 0.2, out);
      if (sb === 8) INST.bass(FIFTH[c] || ROOT[c], t, sd * 7, 0.15, out);
      if (sb % 2 === 0) { const nts = CHORDS[c]; INST.pluck(nts[pat[(sb / 2) % 8] % nts.length].replace(/\d/, d => +d + 1), t, 0.07, 0.9, out, 2600); }
      for (const e of mel.ev) if (e.s === s % mel.len) INST.accordion([e.n], t, e.l * sd * 0.95, 0.04, out);
      if (sb === 0) INST.pad(CHORDS[c], t, sd * 16, 0.02, out, 800);
    }
  };
})();

/* Утренняя тема окна: ленивый свинг (C-dur) */
(function () {
  const ch = ['C', 'Am', 'Dm', 'G'];
  const mel = parseMel('E5 _ G5 _ E5 D5 C5 _  A4 _ C5 _ A4 G4 E4 _  F4 _ A4 _ D5 _ C5 _  B4 _ G4 _ _ _ . .', 2);
  THEMES.lazy = {
    bpm: 96, stepsPerBeat: 4, len: 64,
    step(s, t, sd, out) {
      const bar = Math.floor(s / 16) % 4, sb = s % 16, c = ch[bar];
      if (sb === 0 || sb === 8) INST.bass(sb === 0 ? ROOT[c] : (FIFTH[c] || ROOT[c]), t, sd * 6, 0.22, out);
      if (sb === 4 || sb === 12) { for (const n of CHORDS[c]) INST.pluck(n.replace(/\d/, d => +d + 1), t, 0.03, 0.4, out, 1800); INST.noiseHit(t, 0.04, 2500, 0.12, 'bandpass', out, 1); }
      for (const e of mel.ev) if (e.s === s % mel.len) INST.harmonica(e.n, t, e.l * sd * 0.9, 0.04, out);
      if (sb % 4 === 0) INST.shaker(t, 0.02, out);
    }
  };
})();

/* Дискотека в режиме разработчика */
THEMES.disco = {
  bpm: 124, stepsPerBeat: 4, len: 64,
  step(s, t, sd, out) {
    const sb = s % 16, bar = Math.floor(s / 16) % 4;
    const roots = ['A2', 'A2', 'F2', 'G2'];
    if (sb % 4 === 0) INST.kick(t, 0.45, out);
    if (sb % 4 === 2) INST.hat(t, 0.07, out, true);
    if (sb === 4 || sb === 12) INST.clap(t, 0.1, out);
    if (sb % 2 === 0) INST.bass(sb % 4 === 0 ? roots[bar] : roots[bar].replace(/\d/, d => +d + 1), t, sd * 1.6, 0.2, out, 'sawtooth');
    if (sb === 0) INST.pad(bar === 2 ? CHORDS.F : bar === 3 ? CHORDS.G : CHORDS.Am, t, sd * 16, 0.03, out, 1800);
    if (sb === 6 || sb === 14) INST.square(bar % 2 ? 'E5' : 'C5', t, sd * 1.5, 0.03, out);
  }
};

/* ---------------- секвенсор ---------------- */
const MUSIC = (() => {
  let cur = null;          // {name, theme, gain, step, next, timer}
  let wanted = null;

  function startTheme(name) {
    const ac = FX.ctx();
    const th = THEMES[name];
    if (!ac || !th) return;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(1, ac.currentTime + 0.5);
    g.connect(FX.bus().music);
    const inst = { name, th, g, step: 0, next: ac.currentTime + 0.08, timer: 0 };
    inst.timer = setInterval(() => tick(inst), 80);
    cur = inst;
    tick(inst);
  }
  function tick(inst) {
    const ac = FX.ctx();
    if (!ac || document.hidden || inst !== cur) return;
    inst.next = Math.max(inst.next, ac.currentTime - 0.05);
    const sd = 60 / inst.th.bpm / (inst.th.stepsPerBeat || 4);
    while (inst.next < ac.currentTime + 0.28) {
      if (SAVE.sound) { try { inst.th.step(inst.step % inst.th.len, inst.next, sd, inst.g); } catch (e) {} }
      inst.step++;
      inst.next += sd;
    }
  }
  function stopInst(inst, fade) {
    if (!inst) return;
    clearInterval(inst.timer);
    try {
      const ac = FX.ctx(), t = ac.currentTime;
      inst.g.gain.cancelScheduledValues(t);
      inst.g.gain.setValueAtTime(Math.max(0.0001, inst.g.gain.value), t);
      inst.g.gain.exponentialRampToValueAtTime(0.0001, t + (fade || 0.6));
      setTimeout(() => { try { inst.g.disconnect(); } catch (e) {} }, (fade || 0.6) * 1000 + 600);
    } catch (e) {}
  }
  return {
    want(name, fade) {
      wanted = name || null;
      if (cur && cur.name === name) return;
      const old = cur; cur = null;
      stopInst(old, fade);
      if (name && SAVE.sound) startTheme(name);
    },
    stop(fade) { const old = cur; cur = null; wanted = null; stopInst(old, fade || 0.3); },
    current: () => (cur ? cur.name : null),
    resync() { if (wanted && (!cur || cur.name !== wanted)) { const w = wanted; wanted = null; this.want(w); } }
  };
})();
