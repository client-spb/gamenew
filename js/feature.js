'use strict';
/* ============================================================
   ФИЧА: мультфильм ломается, и зритель становится режиссёром.
   Песочница с физикой: персонажей можно хватать и бросать,
   менять гравитацию (в том числе наклоном телефона), причёску
   и пузо Гены, включать дискотеку, ночь, снег, голубей...
   Потом — перемотка «Ctrl+Z», и мультфильм идёт дальше
   с теми изменениями, которые зритель оставил Гене.
   ============================================================ */
const BODY_DEF = {
  gen: { r: 92, m: 3.0, bark: ['b_gen1', 'b_gen2', 'b_gen3'] },
  val: { r: 74, m: 1.6, bark: ['b_val1', 'b_val2', 'v05'] },
  zin: { r: 74, m: 1.6, bark: ['z01', 'z05', 'z04'] },
  vov: { r: 80, m: 1.8, bark: ['b_vov1', 'b_vov2'] },
  kol: { r: 78, m: 1.8, bark: ['b_kol1', 'b_kol2'] },
  cat: { r: 30, m: 0.5, bark: ['meow'] },
  car: { r: 128, m: 9.0, bark: ['horn'] },
  vobla: { r: 26, m: 0.3, bark: [] },
  snowman: { r: 66, m: 2.0, bark: [] },
};
const CMDS = [
  { id: 'grav', icon: 'i-gravity', label: 'Гравитация' },
  { id: 'tilt', icon: 'i-phone', label: 'Наклон' },
  { id: 'hair', icon: 'i-hair', label: 'Причёска' },
  { id: 'bellyP', icon: 'i-belly', label: 'Пузо +' },
  { id: 'bellyM', icon: 'i-belly', label: 'Пузо −' },
  { id: 'heads', icon: 'i-head', label: 'Головы' },
  { id: 'disco', icon: 'i-disco', label: 'Дискотека' },
  { id: 'night', icon: 'i-moon', label: 'Ночь' },
  { id: 'snow', icon: 'i-snow', label: 'Снег' },
  { id: 'pigeons', icon: 'i-bird', label: 'Голуби ×100' },
  { id: 'giant', icon: 'i-giant', label: 'Гигант' },
  { id: 'wire', icon: 'i-wire', label: 'Каркас' },
];

const FEATURE = {
  phase: 'idle', bodies: [], birds: [], t: 0, cam: { x: 2060, y: 700, z: 0.65 },
  grav: 0, tilt: false, tiltVec: null, disco: false, night: 0, nightOn: false, snow: false, snowAcc: 0,
  wire: false, idle: 0, interacted: false, barkCd: 0, ptr: null, throws: 0, rw: null, built: false,
  sysKey: 0,

  /* ---------- вход ---------- */
  begin(R) {
    this.phase = 'sandbox';
    DIR.mode = 'sandbox';
    this.t = 0; this.idle = 0; this.interacted = false;
    this.grav = 0; this.disco = false; this.nightOn = false; this.night = 0; this.snow = false; this.snowAcc = 0; this.wire = false;
    this.bodies = []; this.birds = [];
    this.buildConsole();
    $('controls').classList.remove('show');
    $('console').classList.add('show');
    fitUI();
    this.fitCam();
    for (const a of R.actors) {
      const def = BODY_DEF[a.kind];
      if (!def) continue;
      const s = a.s || 1;
      const pv = pivotOf(a.kind) * s;
      this.bodies.push({
        kind: a.kind, a: Object.assign({}, a), x: a.x, y: a.y - pv, pv, s,
        vx: (Math.random() - 0.5) * 40, vy: -30 - Math.random() * 30, rot: a.rot || 0, vr: (Math.random() - 0.5) * 0.4,
        r: def.r * s, m: def.m, grab: null, ground: false, lastHit: 0, bark: def.bark, gx: 0, gy: 0,
      });
    }
    this.keepInside(true);
    
    MUSIC.want('chip');
    FX.S.powerUp();
    haptic('medium');
  },

  fitCam() {
    // пол — над пультом, по ширине — весь двор от лавочки до гаражей
    const vs0 = DIR.viewScale();
    const con = $('console');
    const conH = con && con.classList.contains('show') ? con.offsetHeight * (parseFloat(con.style.scale) || 1) + 14 : 0;
    const z = clamp(Math.min(APPW / (1950 * vs0), (APPH - conH) / (820 * vs0)), 0.35, 1.2);
    const vs = vs0 * z;
    const floorS = APPH - conH;
    this.cam = { x: 2040, y: 1112 - (floorS - APPH / 2) / vs, z };
    this.conH = conH;
    $('subs').style.bottom = conH ? (conH + 4) + 'px' : '';
  },
  bounds() {
    const vs = DIR.viewScale() * this.cam.z;
    const hw = APPW / 2 / vs, hh = APPH / 2 / vs;
    return { x0: this.cam.x - hw + 20, x1: this.cam.x + hw - 20, y0: this.cam.y - hh + 20, y1: 1112 };
  },

  /* ---------- пульт ---------- */
  buildConsole() {
    const grid = $('conGrid');
    if (this.built) { this.refreshConsole(); return; }
    grid.innerHTML = '';
    for (const cmd of CMDS) {
      const b = document.createElement('button');
      b.className = 'cmd'; b.dataset.id = cmd.id;
      b.innerHTML = '<svg><use href="#' + cmd.icon + '"/></svg><span>' + cmd.label + '</span><em class="v"></em>';
      b.addEventListener('click', e => { e.stopPropagation(); this.command(cmd.id); });
      grid.appendChild(b);
    }
    $('btnContinue').addEventListener('click', e => { e.stopPropagation(); FX.S.click(); this.finish(); });
    this.built = true;
    this.refreshConsole();
  },
  refreshConsole() {
    const val = {
      grav: ['норм', '0', 'вверх'][this.grav === 1 ? 0 : this.grav === 0 ? 1 : 2],
      tilt: this.tilt ? 'вкл' : '', hair: MODS.hair ? HAIR_NAMES[MODS.hair] : '', bellyP: MODS.belly.toFixed(1), bellyM: '',
      heads: MODS.bigHeads ? 'вкл' : '', disco: this.disco ? 'вкл' : '', night: this.nightOn ? 'вкл' : '', snow: this.snow ? 'вкл' : '',
      pigeons: this.birds.length ? this.birds.length : '', giant: MODS.giant ? 'вкл' : '', wire: this.wire ? 'вкл' : '',
    };
    const on = { tilt: this.tilt, heads: MODS.bigHeads, disco: this.disco, night: this.nightOn, snow: this.snow, pigeons: this.birds.length > 0, giant: MODS.giant, wire: this.wire, hair: MODS.hair > 0, grav: this.grav !== 1 };
    document.querySelectorAll('#conGrid .cmd').forEach(b => {
      const id = b.dataset.id;
      b.classList.toggle('on', !!on[id]);
      b.querySelector('.v').textContent = val[id] || '';
    });
  },
  say(id, spk) {
    const m = window.VOICE_META && VOICE_META[id];
    if (!m) return;
    const key = 'fx' + (this.sysKey++ % 3);
    FX.voicePlay(key, id, 0);
    DIR.showBark(m.t, spk || m.s, m.d + 0.4);
  },
  command(id) {
    this.touch();
    FX.S.toggle(true);
    haptic('light');
    switch (id) {
      case 'grav':
        this.grav = this.grav === 1 ? 0 : this.grav === 0 ? -1 : 1;
        this.tilt = false;
        this.say(this.grav === 1 ? 'c_gravN' : this.grav === 0 ? 'c_grav0' : 'c_gravU');
        if (this.grav !== 1) for (const b of this.bodies) { b.vy -= 160; b.vr += (Math.random() - 0.5) * 2; }
        FX.S.boing();
        break;
      case 'tilt': this.enableTilt(); break;
      case 'hair':
        MODS.hair = (MODS.hair + 1) % HAIR_NAMES.length;
        this.say('c_hair'); FX.S.boing(); this.puff('gen');
        break;
      case 'bellyP': MODS.belly = clamp(+(MODS.belly + 0.2).toFixed(2), 0.6, 1.8); this.say('c_belly'); FX.S.bubble(); this.puff('gen'); break;
      case 'bellyM': MODS.belly = clamp(+(MODS.belly - 0.2).toFixed(2), 0.6, 1.8); this.say('c_belly'); FX.S.bubble(); this.puff('gen'); break;
      case 'heads': MODS.bigHeads = !MODS.bigHeads; if (MODS.bigHeads) this.say('c_heads'); FX.S.boing(); break;
      case 'disco':
        this.disco = !this.disco;
        if (this.disco) { this.say('c_disco'); if (this.grav !== 1) { this.grav = 1; } }
        MUSIC.want(this.disco ? 'disco' : 'chip');
        break;
      case 'night': this.nightOn = !this.nightOn; this.say(this.nightOn ? 'c_night' : 'c_day'); if (this.nightOn) FX.S.owl(); break;
      case 'snow':
        this.snow = !this.snow;
        if (this.snow) {
          this.say('c_snow'); FX.S.chime();
          if (!this.bodies.some(b => b.kind === 'snowman')) {
            const B = this.bounds();
            this.bodies.push({ kind: 'snowman', a: { kind: 'snowman', label: 'snowman.new' }, x: lerp(B.x0, B.x1, 0.45), y: B.y0 + 100, pv: 90, s: 1, vx: 0, vy: 0, rot: 0, vr: 0.5, r: 66, m: 2, grab: null, ground: false, lastHit: 0, bark: [] });
          }
        }
        break;
      case 'pigeons':
        if (this.birds.length) { for (const p of this.birds) { p.leave = true; } }
        else { this.spawnBirds(100); this.say('c_pigeons'); FX.S.flutter(); FX.S.coo(); }
        break;
      case 'giant':
        MODS.giant = !MODS.giant;
        if (MODS.giant) this.say('c_zoom');
        FX.S.giant(); DIR.shake = 1;
        for (const b of this.bodies) if (b.kind === 'gen') { b.s = MODS.giant ? 1.9 : 1; b.r = BODY_DEF.gen.r * (MODS.giant ? 1.9 : 1); b.pv = pivotOf('gen') * (MODS.giant ? 1.9 : 1); b.vy -= 300; }
        break;
      case 'wire':
        if (!YARD.wireBuilt) { while (!YARD.stepWire()) { /* достроить каркас */ } }
        this.wire = !this.wire; FX.S.glitch();
        break;
    }
    this.refreshConsole();
  },
  puff(kind) {
    const b = this.bodies.find(x => x.kind === kind);
    if (!b) return;
    BURST.sparks(b.x, b.y - b.r * 0.5, 16, '#ffe680');
    BURST.confetti(b.x, b.y - b.r, 14);
  },

  /* ---------- наклон телефона ---------- */
  enableTilt() {
    const on = () => {
      if (this.tiltBound) { this.tilt = true; this.say('c_tilt'); this.refreshConsole(); return; }
      this.tiltBound = true;
      window.addEventListener('deviceorientation', e => this.onOrient(e));
      this.tilt = true; this.say('c_tilt'); this.refreshConsole();
      setTimeout(() => { if (!this.tiltVec && this.tilt) { toast('Наклон работает только на телефоне'); this.tilt = false; this.refreshConsole(); } }, 1500);
    };
    if (this.tilt) { this.tilt = false; this.refreshConsole(); return; }
    try {
      if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().then(r => { if (r === 'granted') on(); else toast('Доступ к наклону не разрешён'); }).catch(() => toast('Наклон недоступен'));
      } else if (window.DeviceOrientationEvent) on();
      else toast('Наклон работает только на телефоне');
    } catch (e) { toast('Наклон недоступен'); }
  },
  onOrient(e) {
    if (e.beta === null || e.gamma === null) return;
    const b = e.beta * DEG, g = e.gamma * DEG;
    let x = Math.cos(b) * Math.sin(g), y = Math.sin(b);
    let ang = 0;
    try { ang = (screen.orientation && screen.orientation.angle) || window.orientation || 0; } catch (er) {}
    const a = ang * DEG;
    let sx = x * Math.cos(a) + y * Math.sin(a), sy = -x * Math.sin(a) + y * Math.cos(a);
    if (ROT) { const tx = sy, ty = -sx; sx = tx; sy = ty; }
    this.tiltVec = { x: sx, y: sy };
  },

  /* ---------- голуби ---------- */
  spawnBirds(n) {
    const B = this.bounds();
    for (let i = 0; i < n; i++) {
      const side = Math.random() > 0.5;
      this.birds.push({ x: side ? B.x1 + 100 + Math.random() * 400 : B.x0 - 100 - Math.random() * 400, y: B.y0 + Math.random() * (B.y1 - B.y0) * 0.6, vx: side ? -300 : 300, vy: (Math.random() - 0.5) * 100, seed: Math.random(), leave: false });
    }
  },
  updateBirds(dt) {
    const B = this.bounds();
    let cx = 0, cy = 0;
    for (const p of this.birds) { cx += p.x; cy += p.y; }
    cx /= this.birds.length || 1; cy /= this.birds.length || 1;
    const P = this.ptr;
    for (const p of this.birds) {
      if (p.leave) { p.vy -= 600 * dt; p.vx += (p.vx > 0 ? 1 : -1) * 300 * dt; }
      else {
        p.vx += (cx - p.x) * 0.15 * dt + (Math.random() - 0.5) * 900 * dt;
        p.vy += (cy - p.y) * 0.15 * dt + (Math.random() - 0.5) * 900 * dt + (B.y0 + (B.y1 - B.y0) * 0.35 - p.y) * 0.3 * dt;
        if (p.x < B.x0) p.vx += 800 * dt; if (p.x > B.x1) p.vx -= 800 * dt;
        if (p.y < B.y0) p.vy += 800 * dt; if (p.y > B.y1 - 60) p.vy -= 1400 * dt;
        if (P) { const dx = p.x - P.wx, dy = p.y - P.wy, d = Math.hypot(dx, dy); if (d < 260) { p.vx += dx / (d + 1) * 4000 * dt; p.vy += dy / (d + 1) * 4000 * dt; } }
      }
      const sp = Math.hypot(p.vx, p.vy), mx = p.leave ? 900 : 420;
      if (sp > mx) { p.vx *= mx / sp; p.vy *= mx / sp; }
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
    this.birds = this.birds.filter(p => !(p.leave && (p.y < B.y0 - 600 || p.x < B.x0 - 900 || p.x > B.x1 + 900)));
    if (Math.random() < dt * 2 && this.birds.length) FX.S.coo();
  },

  /* ---------- физика ---------- */
  gravityVec() {
    if (this.tilt && this.tiltVec) return { x: this.tiltVec.x * 2000, y: this.tiltVec.y * 2000 };
    return { x: 0, y: this.grav * 1900 };
  },
  keepInside(hard) {
    const B = this.bounds();
    for (const b of this.bodies) {
      if (b.x < B.x0 + b.r) { b.x = B.x0 + b.r; if (b.vx < 0) b.vx *= hard ? 0 : -0.45; }
      if (b.x > B.x1 - b.r) { b.x = B.x1 - b.r; if (b.vx > 0) b.vx *= hard ? 0 : -0.45; }
      if (b.y < B.y0 + b.r) { b.y = B.y0 + b.r; if (b.vy < 0) b.vy *= hard ? 0 : -0.45; }
    }
  },
  step(dt) {
    const g = this.gravityVec();
    const B = this.bounds();
    const zeroG = Math.hypot(g.x, g.y) < 1;
    for (const b of this.bodies) {
      if (b.grab) continue;
      b.vx += g.x * dt; b.vy += g.y * dt;
      const drag = zeroG ? 0.995 : 0.999;
      b.vx *= Math.pow(drag, dt * 60); b.vy *= Math.pow(drag, dt * 60);
      b.x += b.vx * dt; b.y += b.vy * dt;
      b.rot += b.vr * dt;
      b.vr *= Math.pow(zeroG ? 0.997 : 0.98, dt * 60);
      b.ground = false;
      // пол: опора — ноги персонажа
      const footY = b.y + b.pv;
      if (footY > B.y1) {
        const imp = b.vy;
        b.y = B.y1 - b.pv;
        if (b.vy > 0) b.vy *= -0.32;
        b.vx *= 0.86; b.ground = true;
        if (imp > 500) this.impact(b, imp);
        if (g.y > 0) b.vr += (-angDiff(b.rot) * 10 - b.vr * 3) * dt;
      }
      // стены и потолок
      if (b.x < B.x0 + b.r * 0.6) { b.x = B.x0 + b.r * 0.6; if (b.vx < 0) { if (b.vx < -500) this.impact(b, -b.vx); b.vx *= -0.45; b.vr += 1; } }
      if (b.x > B.x1 - b.r * 0.6) { b.x = B.x1 - b.r * 0.6; if (b.vx > 0) { if (b.vx > 500) this.impact(b, b.vx); b.vx *= -0.45; b.vr -= 1; } }
      if (b.y - b.r < B.y0) { b.y = B.y0 + b.r; if (b.vy < 0) { if (b.vy < -500) this.impact(b, -b.vy); b.vy *= -0.4; } if (g.y < 0) b.vx *= 0.9; }
    }
    // столкновения тел
    for (let i = 0; i < this.bodies.length; i++) for (let j = i + 1; j < this.bodies.length; j++) {
      const a = this.bodies[i], c = this.bodies[j];
      const dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy), min = (a.r + c.r) * 0.82;
      if (d >= min || d < 0.001) continue;
      const nx = dx / d, ny = dy / d, over = min - d;
      const ia = a.grab ? 0 : 1 / a.m, ic = c.grab ? 0 : 1 / c.m;
      if (ia + ic === 0) continue;
      a.x -= nx * over * ia / (ia + ic); a.y -= ny * over * ia / (ia + ic);
      c.x += nx * over * ic / (ia + ic); c.y += ny * over * ic / (ia + ic);
      const rv = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny;
      if (rv < 0) {
        const jj = -(1 + 0.4) * rv / (ia + ic);
        a.vx -= jj * nx * ia; a.vy -= jj * ny * ia; c.vx += jj * nx * ic; c.vy += jj * ny * ic;
        a.vr -= jj * ia * 0.004; c.vr += jj * ic * 0.004;
        if (-rv > 600) { this.impact(a, -rv * 0.6); this.impact(c, -rv * 0.6); }
      }
    }
  },
  impact(b, v) {
    const now = this.t;
    if (now - b.lastHit < 0.35) return;
    b.lastHit = now;
    if (b.kind === 'car') FX.S.clang(); else if (b.kind === 'snowman') FX.S.splat(); else FX.S.bonk();
    BURST.dust(b.x, b.y + b.pv - 10, 6);
    if (v > 800) { DIR.shake = Math.max(DIR.shake, 0.5); haptic('medium'); }
    if (v > 700) this.barkFor(b);
  },
  barkFor(b) {
    if (this.barkCd > 0 || !b.bark || !b.bark.length) return;
    this.barkCd = 1.1;
    const id = pick(b.bark);
    if (id === 'meow' || id === 'horn') { FX.S[id](); return; }
    this.say(id);
  },

  /* ---------- ввод ---------- */
  toWorld(p) {
    const vs = DIR.viewScale() * this.cam.z;
    return { wx: this.cam.x + (p.x - APPW / 2) / vs, wy: this.cam.y + (p.y - APPH / 2) / vs };
  },
  touch() { this.interacted = true; this.idle = 0; },
  pointerDown(e) {
    if (this.phase !== 'sandbox') return false;
    this.touch();
    const p = this.toWorld(toGame(e));
    this.ptr = Object.assign(p, { id: e.pointerId, hist: [[performance.now(), p.wx, p.wy]] });
    let best = null, bd = 1e9;
    for (const b of this.bodies) {
      const d = Math.hypot(b.x - p.wx, b.y - p.wy);
      if (d < b.r * 1.25 && d < bd) { bd = d; best = b; }
    }
    if (best) {
      best.grab = { id: e.pointerId, ox: best.x - p.wx, oy: best.y - p.wy };
      FX.S.pop(); haptic('light');
      if (Math.random() < 0.5) this.barkFor(best);
    }
    return true;
  },
  pointerMove(e) {
    if (this.phase !== 'sandbox' || !this.ptr || this.ptr.id !== e.pointerId) return;
    const p = this.toWorld(toGame(e));
    this.ptr.wx = p.wx; this.ptr.wy = p.wy;
    this.ptr.hist.push([performance.now(), p.wx, p.wy]);
    if (this.ptr.hist.length > 6) this.ptr.hist.shift();
  },
  pointerUp(e) {
    if (!this.ptr || this.ptr.id !== e.pointerId) return;
    const h = this.ptr.hist;
    for (const b of this.bodies) {
      if (!b.grab || b.grab.id !== e.pointerId) continue;
      b.grab = null;
      if (h.length > 1) {
        const a = h[0], z = h[h.length - 1], dt = Math.max(16, z[0] - a[0]) / 1000;
        b.vx = clamp((z[1] - a[1]) / dt, -3200, 3200); b.vy = clamp((z[2] - a[2]) / dt, -3200, 3200);
        b.vr = clamp(b.vx * 0.004, -12, 12);
        const sp = Math.hypot(b.vx, b.vy);
        if (sp > 900) {
          FX.S.whoosh(); this.barkFor(b);
          if (b.kind === 'val' || b.kind === 'zin') { this.throws++; SAVE.throws++; }
        }
      }
    }
    this.ptr = null;
  },

  /* ---------- кадр ---------- */
  update(dt) {
    this.t += dt;
    this.barkCd = Math.max(0, this.barkCd - dt);
    if (this.phase === 'sandbox') {
      // перетаскивание
      if (this.ptr) for (const b of this.bodies) if (b.grab && b.grab.id === this.ptr.id) {
        const tx = this.ptr.wx + b.grab.ox, ty = this.ptr.wy + b.grab.oy;
        b.vx = (tx - b.x) / Math.max(dt, 0.008) * 0.5; b.vy = (ty - b.y) / Math.max(dt, 0.008) * 0.5;
        b.x = lerp(b.x, tx, 0.5); b.y = lerp(b.y, ty, 0.5);
        b.vr = Math.sin(this.t * 9) * 1.5;
      }
      const n = 3;
      for (let i = 0; i < n; i++) this.step(dt / n);
      this.keepInside(false);
      if (this.birds.length) this.updateBirds(dt);
      // ожидание без касаний — мультфильм продолжится сам
      this.idle += dt;
      const limit = this.interacted ? 45 : 26;
      const left = Math.ceil(limit - this.idle);
      $('conTimer').textContent = left <= 10 ? 'дальше через ' + left : '';
      if (this.idle > limit) this.finish();
    }
    if (this.phase === 'restore') this.updateRestore(dt);
    this.night = lerp(this.night, this.nightOn ? 1 : 0, Math.min(1, dt * 2));
    if (this.snow) {
      this.snowAcc = Math.min(1, this.snowAcc + dt * 0.05);
      const B = this.bounds();
      for (let i = 0; i < 3; i++) PART.spawn({ type: 'snow', x: lerp(B.x0 - 200, B.x1 + 200, Math.random()), y: B.y0 - 20, vx: 0, vy: 90 + Math.random() * 80, g: 0, life: 9, size: 3 + Math.random() * 4, floor: B.y1 + Math.random() * 30, bounce: 0, fade: false });
    } else this.snowAcc = Math.max(0, this.snowAcc - dt * 0.2);
    if (this.disco && Math.random() < dt * 3) { const b = pick(this.bodies); if (b) BURST.notes(b.x, b.y - b.r, pick(['#ff7ad8', '#7dffa8', '#ffe680', '#7ac8ff'])); }
    PART.update(dt);
    SPLASH.update(dt);
  },

  actorsNow() {
    const out = [];
    const g = this.gravityVec();
    const beat = this.t * 124 / 60;
    for (const b of this.bodies) {
      const a = Object.assign({}, b.a);
      a.x = b.x; a.y = b.y + b.pv; a.rot = b.rot; a.s = b.s; a.z = b.y; a.tOverride = undefined;
      a.pivot = b.pv / b.s;
      const air = !b.ground || b.grab;
      if (['gen', 'val', 'zin', 'vov', 'kol'].includes(b.kind)) {
        a.holdL = b.kind === 'kol' ? 'phone' : b.kind === 'zin' ? 'cane' : null;
        a.holdR = b.kind === 'gen' ? 'can' : null;
        a.canOpen = true; a.canEmpty = true; a.seat = 62;
        if (b.grab) { a.legs = 'fly'; a.arms = { L: 'up', R: 'up' }; a.expr = 'shock'; a.turn = 0; }
        else if (air) { a.legs = 'fly'; a.arms = { L: 'flail', R: 'flail' }; a.expr = 'shock'; }
        else if (this.disco) { a.legs = 'dance'; a.beat = beat + b.x * 0.001; a.arms = { L: 'dance', R: 'pump' }; a.expr = 'happy'; a.bob = -Math.abs(Math.sin(beat * Math.PI)) * 8; a.turn = 0.2; }
        else { a.legs = 'stand'; a.arms = (b.kind === 'val' || b.kind === 'zin') ? { L: 'hips', R: 'fist' } : { L: 'down', R: 'down' }; a.expr = (b.kind === 'val' || b.kind === 'zin') ? 'angry' : 'n'; a.turn = 0.3; a.bob = 0; }
        if (b.kind === 'gen' && !air && !this.disco) { a.expr = 'smug'; a.arms = { L: 'hips', R: 'hips' }; }
      }
      if (b.kind === 'cat') a.pose = air ? 'fly' : this.disco ? 'walk' : 'sit';
      if (b.kind === 'car') { a.shake = this.disco ? 0.6 : 0; a.lights = this.nightOn; }
      a.label = a.label || b.kind;
      out.push(a);
    }
    return out;
  },

  render(now) {
    const c = DIR.c, W = APPW, H = APPH;
    const tod = lerp(0.55, 1.0, this.night);
    const R = { cam: this.cam, fx: { wire: this.wire, labels: this.wire ? 1 : 0, code: this.wire }, tod, sc: { dur: 1 }, t: 0, set: 'yard' };
    if (this.phase === 'restore' && this.rw) { R.cam = this.rw.cam; }
    const actors = this.phase === 'restore' && this.rw ? this.rw.actors : this.actorsNow();
    DIR.render(Object.assign(R, { actors }), now);
    // поверх мира, в координатах мира
    DIR.setCam(c, R.cam);
    GFX.wire = this.wire;
    if (this.snowAcc > 0) { c.fillStyle = 'rgba(250,252,255,' + 0.85 * this.snowAcc + ')'; c.fillRect(0, 1095, WORLD.w, 30 * this.snowAcc + 10); }
    for (const p of this.birds) drawPigeon(c, p.x, p.y, 1.1, p.vx >= 0 ? 1 : -1, now + p.seed * 3, 'fly', p.seed);
    GFX.wire = false;
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (this.disco) drawDisco(c, W, H, now);
    if (this.phase === 'sandbox' && !this.interacted && this.t > 2.5) this.drawHint(c, now);
    if (this.phase === 'restore' && this.rw) {
      SCREEN.vhs(c, W, H, this.rw.k, now);
      SCREEN.scanlines(c, W, H, 0.15 * this.rw.k);
      if (this.rw.k > 0) drawRewindIcon(c, W, H, now);
    }
  },
  drawHint(c, now) {
    const b = this.bodies.find(x => x.kind === 'gen');
    if (!b) return;
    const vs = DIR.viewScale() * this.cam.z;
    const sx = APPW / 2 + (b.x - this.cam.x) * vs, sy = APPH / 2 + (b.y - this.cam.y) * vs;
    const p = (now * 0.7) % 1;
    const hx = sx + Math.sin(p * Math.PI) * 60, hy = sy - Math.sin(p * Math.PI) * 60;
    c.save();
    c.globalAlpha = 0.9;
    c.strokeStyle = '#ffe680'; c.lineWidth = 3; c.setLineDash([6, 6]);
    c.beginPath(); c.arc(sx, sy, 40 + Math.sin(now * 6) * 5, 0, TAU); c.stroke(); c.setLineDash([]);
    c.translate(hx, hy); c.rotate(-0.3);
    D.ell(c, 0, 0, 14, 18, 0, '#fff', '#1d3d6e', 2.4);
    D.rect(c, -4, -36, 9, 30, '#fff', '#1d3d6e', 2.4, 4);
    c.restore();
  },

  /* ---------- выход: перемотка Ctrl+Z ---------- */
  finish() {
    if (this.phase !== 'sandbox') return;
    this.phase = 'restore';
    DIR.mode = 'restore';
    $('console').classList.remove('show');
    $('subs').style.bottom = '';
    for (const b of this.bodies) b.grab = null;
    this.ptr = null;
    this.say('n20', 'NAR');
    MUSIC.stop(0.4);
    const n20 = (VOICE_META.n20 && VOICE_META.n20.d) || 5;
    this.rw = { t: 0, start: Math.max(1.5, n20 - 2.0), dur: 1.9, k: 0, from: null, cam: Object.assign({}, this.cam), actors: this.actorsNow() };
    SAVE.throws = SAVE.throws | 0; persistSoon();
  },
  updateRestore(dt) {
    const rw = this.rw;
    rw.t += dt;
    if (rw.t < rw.start) {
      // мир ещё живёт, но гравитация возвращается
      this.grav = 1; this.tilt = false;
      for (let i = 0; i < 2; i++) this.step(dt / 2);
      this.keepInside(false);
      rw.actors = this.actorsNow();
      return;
    }
    if (!rw.from) {
      // цель — первый кадр сцены «После бури»
      rw.from = this.actorsNow();
      MODS.bigHeads = false; MODS.giant = false;
      DIR.featureDone = true;
      DIR.build();
      const target = DIR.frameAt(DIR.featureT + 0.01, 0, false);
      rw.target = target;
      rw.camFrom = Object.assign({}, this.cam);
      FX.S.rewind();
      FX.voicePlay('rwv', 'n19', 0, { reverse: true, rate: 2.4, vol: 0.5 });
      for (const p of this.birds) p.leave = true;
      this.snow = false; this.disco = false; this.nightOn = false; this.wire = false;
    }
    const p = clamp((rw.t - rw.start) / rw.dur, 0, 1), e = E.cubicIO(p);
    rw.k = Math.sin(p * Math.PI);
    const tgt = rw.target;
    rw.cam = { x: lerp(rw.camFrom.x, tgt.cam.x, e), y: lerp(rw.camFrom.y, tgt.cam.y, e), z: lerp(rw.camFrom.z, tgt.cam.z, e) };
    const out = [];
    for (const f of rw.from) {
      const to = tgt.actors.find(a => a.kind === f.kind);
      if (!to) { if (p < 0.5) out.push(Object.assign({}, f, { y: f.y - e * 800, rot: f.rot + e * 6 })); continue; }
      const a = Object.assign({}, p < 0.55 ? f : to);
      a.x = lerp(f.x, to.x, e); a.y = lerp(f.y, to.y, e) - Math.sin(p * Math.PI) * 160;
      a.rot = lerp(f.rot || 0, 0, e) - Math.sin(p * Math.PI) * 2.2;
      a.s = lerp(f.s || 1, to.s || 1, e);
      a.z = lerp(f.z, to.z, e);
      out.push(a);
    }
    for (const to of tgt.actors) if (!rw.from.find(f => f.kind === to.kind)) out.push(Object.assign({}, to, { hidden: p < 0.6 }));
    rw.actors = out;
    if (p >= 1) this.done();
  },
  done() {
    this.phase = 'idle';
    this.bodies = []; this.birds = []; this.rw = null;
    MODS.bigHeads = false; MODS.giant = false;
    PART.clear(); SPLASH.clear();
    DIR.T = DIR.featureT + 0.01;
    DIR.mode = 'play';
    DIR.featureDone = true;
    DIR.sceneIdx = -1;
    persist();
  },
  abort() {
    $('console').classList.remove('show');
    $('subs').style.bottom = '';
    this.phase = 'idle'; this.bodies = []; this.birds = []; this.rw = null; this.ptr = null;
    this.snow = false; this.disco = false; this.nightOn = false; this.night = 0; this.wire = false; this.tilt = false;
    MODS.bigHeads = false; MODS.giant = false;
    DIR.mode = 'play';
  },
  reset() { this.abort(); this.throws = 0; },
};

function angDiff(a) { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; }

function drawDisco(c, W, H, now) {
  c.save();
  c.fillStyle = 'rgba(10,0,30,.35)'; c.fillRect(0, 0, W, H);
  c.globalCompositeOperation = 'lighter';
  const cols = ['rgba(255,60,160,.22)', 'rgba(60,200,255,.22)', 'rgba(255,230,60,.2)', 'rgba(120,255,120,.2)'];
  for (let i = 0; i < 4; i++) {
    const a = Math.sin(now * (0.8 + i * 0.3) + i) * 0.8;
    c.save(); c.translate(W / 2, -20); c.rotate(a);
    c.fillStyle = cols[i];
    c.beginPath(); c.moveTo(-10, 0); c.lineTo(10, 0); c.lineTo(H * 0.5, H * 1.4); c.lineTo(-H * 0.5, H * 1.4); c.closePath(); c.fill();
    c.restore();
  }
  c.globalCompositeOperation = 'source-over';
  // зеркальный шар
  const k = Math.min(W / 700, H / 372), r = 26 * k;
  c.strokeStyle = '#aaa'; c.lineWidth = 2; c.beginPath(); c.moveTo(W / 2, 0); c.lineTo(W / 2, 30 * k); c.stroke();
  c.save(); c.translate(W / 2, 30 * k + r);
  c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fillStyle = '#c8ccd8'; c.fill(); c.clip();
  for (let y = -r; y < r; y += 7 * k) for (let x = -r; x < r; x += 7 * k) {
    const f = (Math.sin(now * 5 + x * 0.3 + y * 0.2) + 1) / 2;
    c.fillStyle = f > 0.8 ? '#fff' : f > 0.5 ? '#e8ecf6' : '#8a90a0';
    c.fillRect(x + ((now * 20) % (7 * k)), y, 6 * k, 6 * k);
  }
  c.restore();
  c.restore();
}
function drawRewindIcon(c, W, H, now) {
  const k = Math.min(W / 700, H / 372);
  c.save(); c.translate(36 * k, 40 * k); c.scale(k, k);
  c.fillStyle = '#fff'; c.shadowColor = '#000'; c.shadowBlur = 6;
  c.beginPath(); c.moveTo(40, -14); c.lineTo(20, 0); c.lineTo(40, 14); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(20, -14); c.lineTo(0, 0); c.lineTo(20, 14); c.closePath(); c.fill();
  c.font = '700 18px Consolas, monospace'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText('Ctrl+Z', 50, 0);
  c.restore();
}
