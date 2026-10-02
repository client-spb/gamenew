'use strict';
/* ============================================================
   Эффекты: частицы (пул), брызги пива на экране, глитч, VHS,
   виньетка, зерно плёнки, вспышки
   ============================================================ */
const PART = (() => {
  const MAX = 420;
  const pool = [];
  for (let i = 0; i < MAX; i++) pool.push({ on: false });
  let next = 0;
  function spawn(o) {
    if (api.enabled === false) return null;
    for (let k = 0; k < MAX; k++) {
      const p = pool[(next + k) % MAX];
      if (!p.on) { next = (next + k + 1) % MAX; Object.assign(p, { on: true, x: 0, y: 0, vx: 0, vy: 0, g: 600, life: 1, age: 0, size: 4, rot: 0, vr: 0, col: '#fff', type: 'dot', drag: 0, floor: 1e9, bounce: 0.3 }, o); return p; }
    }
    return null;
  }
  function update(dt) {
    for (const p of pool) {
      if (!p.on) continue;
      p.age += dt;
      if (p.age >= p.life) { p.on = false; continue; }
      p.vy += p.g * dt;
      if (p.drag) { const k = Math.pow(1 - p.drag, dt * 60); p.vx *= k; p.vy *= k; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      if (p.y > p.floor) { p.y = p.floor; p.vy *= -p.bounce; p.vx *= 0.7; p.vr *= 0.6; if (Math.abs(p.vy) < 20) { p.vy = 0; p.g = 0; p.vx *= 0.8; } }
      if (p.type === 'snow') p.vx = Math.sin(p.age * 2 + p.size) * 30;
    }
  }
  function draw(c) {
    for (const p of pool) {
      if (!p.on) continue;
      const k = p.age / p.life, a = p.fade === false ? 1 : 1 - k * k;
      c.globalAlpha = a;
      switch (p.type) {
        case 'husk':
          c.save(); c.translate(p.x, p.y); c.rotate(p.rot);
          c.fillStyle = '#1a1a1a'; c.beginPath(); c.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, TAU); c.fill();
          c.strokeStyle = '#6a6a6a'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(-p.size, 0); c.lineTo(p.size, 0); c.stroke();
          c.restore(); break;
        case 'foam':
          c.fillStyle = p.col; c.beginPath(); c.arc(p.x, p.y, p.size * (1 + k * 0.6), 0, TAU); c.fill();
          c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.arc(p.x - p.size * 0.3, p.y - p.size * 0.3, p.size * 0.35, 0, TAU); c.fill();
          break;
        case 'smoke':
          c.globalAlpha = a * 0.45; c.fillStyle = p.col; c.beginPath(); c.arc(p.x, p.y, p.size * (1 + k * 2.5), 0, TAU); c.fill(); break;
        case 'spark':
          c.strokeStyle = p.col; c.lineWidth = p.size; c.lineCap = 'round';
          c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); c.stroke(); break;
        case 'confetti':
          c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.scale(1, Math.cos(p.age * 9));
          c.fillStyle = p.col; c.fillRect(-p.size, -p.size * 0.5, p.size * 2, p.size); c.restore(); break;
        case 'snow':
          c.fillStyle = '#fff'; c.beginPath(); c.arc(p.x, p.y, p.size, 0, TAU); c.fill(); break;
        case 'text':
          c.save(); c.translate(p.x, p.y); c.rotate(p.rot);
          D.text(c, p.text, 0, 0, p.size, p.col, 'center', '700 ' + p.size + 'px ', '#1a1a1a'); c.restore(); break;
        case 'crumb':
          c.fillStyle = p.col; c.fillRect(p.x, p.y, p.size, p.size); break;
        case 'paint':
          c.fillStyle = p.col; c.beginPath(); c.arc(p.x, p.y, p.size * (0.6 + k), 0, TAU); c.fill(); break;
        case 'note':
          D.text(c, '♫', p.x, p.y, p.size, p.col, 'center', '700 ' + p.size + 'px ', '#000'); break;
        default:
          c.fillStyle = p.col; c.beginPath(); c.arc(p.x, p.y, p.size, 0, TAU); c.fill();
      }
    }
    c.globalAlpha = 1;
  }
  function clear() { for (const p of pool) p.on = false; }
  function count() { let n = 0; for (const p of pool) if (p.on) n++; return n; }
  const api = { spawn, update, draw, clear, count, enabled: true };
  return api;
})();

/* готовые выбросы частиц */
const BURST = {
  husks(x, y, dir) { for (let i = 0; i < 2; i++) PART.spawn({ type: 'husk', x, y, vx: dir * (60 + Math.random() * 90), vy: -80 - Math.random() * 80, g: 900, life: 2.5, size: 3, vr: 10, floor: y + 70 + Math.random() * 20, bounce: 0.2 }); },
  foam(x, y, n, dirX, dirY, spread) {
    for (let i = 0; i < n; i++) {
      const a = Math.atan2(dirY, dirX) + (Math.random() - 0.5) * (spread || 0.8), v = 300 + Math.random() * 600;
      PART.spawn({ type: 'foam', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 900, life: 1.2 + Math.random() * 0.6, size: 4 + Math.random() * 8, col: Math.random() > 0.4 ? 'rgba(255,250,235,.95)' : 'rgba(242,190,60,.85)', floor: 1080 + Math.random() * 40, bounce: 0.1 });
    }
  },
  smoke(x, y, n, col) { for (let i = 0; i < n; i++) PART.spawn({ type: 'smoke', x: x + (Math.random() - 0.5) * 20, y, vx: -40 - Math.random() * 60, vy: -20 - Math.random() * 40, g: -20, life: 1.6 + Math.random(), size: 10 + Math.random() * 12, col: col || '#5a5a5e' }); },
  sparks(x, y, n, col) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = 200 + Math.random() * 500; PART.spawn({ type: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 800, life: 0.4 + Math.random() * 0.4, size: 2.4, col: col || (Math.random() > 0.5 ? '#ffe680' : '#8ae8ff') }); } },
  dust(x, y, n) { for (let i = 0; i < n; i++) PART.spawn({ type: 'smoke', x: x + (Math.random() - 0.5) * 40, y, vx: (Math.random() - 0.5) * 160, vy: -30 - Math.random() * 40, g: 30, life: 0.8 + Math.random() * 0.6, size: 8 + Math.random() * 8, col: '#b8b0a0' }); },
  confetti(x, y, n) { const cols = ['#ff4a4a', '#ffd23a', '#4ac8ff', '#7dff8a', '#ff7ad8', '#fff']; for (let i = 0; i < n; i++) PART.spawn({ type: 'confetti', x: x + (Math.random() - 0.5) * 300, y: y - Math.random() * 100, vx: (Math.random() - 0.5) * 200, vy: -200 - Math.random() * 300, g: 260, drag: 0.02, life: 3 + Math.random() * 2, size: 5 + Math.random() * 4, vr: (Math.random() - 0.5) * 10, col: pick(cols) }); },
  crumbs(x, y, n) { for (let i = 0; i < n; i++) PART.spawn({ type: 'crumb', x, y, vx: (Math.random() - 0.5) * 140, vy: -60 - Math.random() * 100, g: 700, life: 1, size: 2 + Math.random() * 2, col: '#d89a40', floor: y + 60 }); },
  paint(x, y, n, col) { for (let i = 0; i < n; i++) PART.spawn({ type: 'paint', x: x + (Math.random() - 0.5) * 10, y: y + (Math.random() - 0.5) * 10, vx: 40 + Math.random() * 60, vy: (Math.random() - 0.5) * 40, g: 0, drag: 0.08, life: 0.5, size: 3 + Math.random() * 3, col: col }); },
  notes(x, y, col) { PART.spawn({ type: 'note', x, y, vx: (Math.random() - 0.5) * 40, vy: -60, g: -10, life: 1.6, size: 18 + Math.random() * 8, col: col || '#ffe680' }); },
  word(x, y, text, col, size) { PART.spawn({ type: 'text', x, y, vx: 0, vy: -50, g: 0, life: 1.4, size: size || 30, col: col || '#ffe680', text, rot: (Math.random() - 0.5) * 0.3 }); },
};

/* ---------------- экранные эффекты ---------------- */
const SCREEN = {
  grain: null,
  makeGrain() {
    if (this.grain) return this.grain;
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256;
    const c = cv.getContext('2d'); const id = c.createImageData(256, 256);
    for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 22; }
    c.putImageData(id, 0, 0);
    this.grain = cv; return cv;
  },
  vigCache: null, vigKey: '',
  vignette(c, W, H, a) {
    const key = W + 'x' + H + ':' + a;
    if (this.vigKey !== key) {
      const cv = document.createElement('canvas');
      cv.width = Math.max(2, Math.round(W / 2)); cv.height = Math.max(2, Math.round(H / 2));
      const x = cv.getContext('2d'), w = cv.width, h = cv.height;
      const g = x.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,' + (a || 0.45) + ')');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      this.vigCache = cv; this.vigKey = key;
    }
    c.drawImage(this.vigCache, 0, 0, W, H);
  },
  filmGrain(c, W, H, t) {
    if (!GFX.grain) return;
    const g = this.makeGrain();
    const ox = (t * 977) % 256, oy = (t * 613) % 256;
    c.save(); c.globalAlpha = 0.5;
    if (!this.grainPat || this.grainCtx !== c) { this.grainPat = c.createPattern(g, 'repeat'); this.grainCtx = c; }
    c.fillStyle = this.grainPat;
    c.translate(-ox, -oy); c.fillRect(ox, oy, W, H);
    c.restore();
  },
  scanlines(c, W, H, a) {
    c.fillStyle = 'rgba(0,0,0,' + (a || 0.18) + ')';
    for (let y = 0; y < H; y += 3) c.fillRect(0, y, W, 1);
  },
  /** глитч: сдвиг полос изображения и цветные блоки */
  glitch(c, cv, W, H, k, t) {
    if (k <= 0) return;
    const n = Math.floor(3 + k * 10);
    const r = rng(Math.floor(t * 24) * 13 + 1);
    for (let i = 0; i < n; i++) {
      const y = r() * H, h = 4 + r() * 40 * k, dx = (r() - 0.5) * 120 * k;
      try { c.drawImage(cv, 0, y * cv.height / H, cv.width, h * cv.height / H, dx, y, W, h); } catch (e) {}
    }
    c.globalCompositeOperation = 'screen';
    for (let i = 0; i < n * 0.6; i++) {
      c.fillStyle = pick(['rgba(255,0,80,.35)', 'rgba(0,255,200,.3)', 'rgba(80,120,255,.35)'], r());
      c.fillRect(r() * W, r() * H, 20 + r() * 200 * k, 3 + r() * 14);
    }
    c.globalCompositeOperation = 'source-over';
  },
  /** помехи VHS: полосы шума */
  vhs(c, W, H, k, t) {
    if (k <= 0) return;
    const r = rng(Math.floor(t * 30) + 7);
    c.save();
    for (let i = 0; i < 3; i++) {
      const y = ((t * 220 * (i + 1) + i * 200) % (H + 80)) - 40;
      c.globalAlpha = 0.25 * k; c.fillStyle = '#fff';
      for (let x = 0; x < W; x += 6) if (r() > 0.5) c.fillRect(x, y + r() * 14, 5, 2);
    }
    c.globalAlpha = 0.12 * k; c.fillStyle = '#fff'; c.fillRect(0, (t * 90 % H), W, 6);
    c.restore();
  },
};

/** капли пива на «стекле» экрана */
const SPLASH = {
  drops: [], foam: 0, t0: 0,
  hit(W, H) {
    this.drops = [];
    const r = rng(Math.floor(Math.random() * 1e6));
    for (let i = 0; i < 46; i++) this.drops.push({ x: r(), y: r() * 0.9, r: 0.01 + r() * 0.05, v: 0.02 + r() * 0.08, trail: 0, foam: r() > 0.55 });
    this.foam = 1;
  },
  clear() { this.drops = []; this.foam = 0; },
  update(dt) {
    for (const d of this.drops) { d.y += d.v * dt * (d.r * 12); d.trail = Math.min(0.3, d.trail + d.v * dt); }
    this.foam = Math.max(0, this.foam - dt * 0.12);
  },
  draw(c, W, H) {
    if (!this.drops.length && this.foam <= 0) return;
    const m = Math.min(W, H);
    // мутная пена по краям
    if (this.foam > 0) {
      const g = c.createRadialGradient(W / 2, H / 2, m * 0.2, W / 2, H / 2, Math.max(W, H) * 0.7);
      g.addColorStop(0, 'rgba(255,240,200,0)'); g.addColorStop(1, 'rgba(250,236,190,' + 0.75 * this.foam + ')');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
    }
    for (const d of this.drops) {
      const x = d.x * W, y = d.y * H, r = d.r * m;
      // след
      const tg = c.createLinearGradient(x, y - d.trail * H, x, y);
      tg.addColorStop(0, 'rgba(255,230,160,0)'); tg.addColorStop(1, 'rgba(255,230,160,.35)');
      c.fillStyle = tg; c.fillRect(x - r * 0.35, y - d.trail * H, r * 0.7, d.trail * H);
      const g = c.createRadialGradient(x - r * 0.3, y - r * 0.4, r * 0.1, x, y, r);
      if (d.foam) { g.addColorStop(0, 'rgba(255,255,250,.95)'); g.addColorStop(1, 'rgba(240,230,200,.75)'); }
      else { g.addColorStop(0, 'rgba(255,245,200,.7)'); g.addColorStop(0.7, 'rgba(230,170,50,.45)'); g.addColorStop(1, 'rgba(160,100,20,.6)'); }
      c.fillStyle = g; c.beginPath(); c.ellipse(x, y, r, r * 1.15, 0, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.arc(x - r * 0.35, y - r * 0.4, r * 0.22, 0, TAU); c.fill();
    }
  }
};
