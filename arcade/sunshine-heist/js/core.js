'use strict';
// ===== Core: constants, math, rng, input, audio, particles, global state =====
const T = THREE;
const PostFlag = { value: 1 }; // 1 when the HDR post pipeline is active (custom shaders output linear)
const B = 80, ROADW = 14, HALFR = 7, SWC = 8.5; // block size, road width, half road, sidewalk centre offset
const TAU = Math.PI * 2;

let rngFn = Math.random;
function seedRng(s) { let a = s; rngFn = function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function unseedRng() { rngFn = Math.random; }
const rnd = () => rngFn();
const rr = (a, b) => a + (b - a) * rngFn();
const ri = (a, b) => Math.floor(a + (b - a + 1) * rngFn());
const pick = a => a[Math.floor(rngFn() * a.length)];
const chance = p => rngFn() < p;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const d2 = (ax, az, bx, bz) => { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; };
const dist = (ax, az, bx, bz) => Math.sqrt(d2(ax, az, bx, bz));
function angDiff(a, b) { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; }
function turnToward(a, b, maxStep) { const d = angDiff(a, b); return Math.abs(d) <= maxStep ? b : a + Math.sign(d) * maxStep; }
function hashN(x, z) { let h = Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263); h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296; }
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  return lerp(lerp(hashN(xi, zi), hashN(xi + 1, zi), u), lerp(hashN(xi, zi + 1), hashN(xi + 1, zi + 1), u), v);
}
const money = n => '$' + Math.round(n).toLocaleString();

// ---------- global game state ----------
const G = {
  state: 'menu', paused: false, time: 0, dt: 0, tod: 9 * 60 + 20, day: 1, lastNewsDay: 0,
  cash: 2500, wanted: 0, heat: 0, lastSeen: 0, stats: { kills: 0, robberies: 0, carsStolen: 0, hostages: 0, earned: 0 },
  inv: [], shootables: [], shake: 0, quality: 1, night: 0, sunE: 1,
  actives: [],   // humans being simulated/rendered
  cars: [], pickups: [], news: [], bullets: [], killedIds: new Set(),
};

// ---------- input ----------
const Input = {
  keys: {}, down: {}, mdx: 0, mdy: 0, m: [false, false, false], mdown: [false, false, false], wheel: 0, locked: false, mx: innerWidth / 2, my: innerHeight / 2, mIn: false,
  init(canvas) {
    addEventListener('keydown', e => {
      if (!e.repeat) { Input.down[e.code] = true; }
      Input.keys[e.code] = true;
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    });
    addEventListener('keyup', e => { Input.keys[e.code] = false; });
    addEventListener('blur', () => { Input.keys = {}; Input.m = [false, false, false]; });
    addEventListener('mousemove', e => { if (Input.locked) { Input.mdx += e.movementX; Input.mdy += e.movementY; } else { Input.mx = e.clientX; Input.my = e.clientY; Input.mIn = true; if (Input.m[1]) { Input.mdx += e.movementX; Input.mdy += e.movementY; } } });
    document.documentElement.addEventListener('mouseleave', () => { Input.mIn = false; });
    addEventListener('mousedown', e => { if (e.button === 1) e.preventDefault(); Input.m[e.button] = true; Input.mdown[e.button] = true; if (!Input.locked) { Input.mx = e.clientX; Input.my = e.clientY; Input.mIn = true; } });
    addEventListener('mouseup', e => { Input.m[e.button] = false; });
    addEventListener('wheel', e => { Input.wheel += Math.sign(e.deltaY); });
    addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('pointerlockchange', () => {
      Input.locked = document.pointerLockElement === canvas;
      if (!Input.locked && G.state === 'play' && !G.modal && !G.paused) UI.pause(true);
    });
  },
  lock() { const c = document.getElementById('c'); try { const p = c.requestPointerLock(); if (p && p.catch) p.catch(() => { }); } catch (e) { } },
  unlock() { try { document.exitPointerLock(); } catch (e) { } },
  endFrame() { this.down = {}; this.mdown = [false, false, false]; this.mdx = 0; this.mdy = 0; this.wheel = 0; },
  pressed(c) { return !!this.down[c]; },
  held(c) { return !!this.keys[c]; },
};

// ---------- audio (all synthesised) ----------
const Snd = {
  ctx: null, master: null, noise: null, eng: null, sir: null, amb: null, on: true,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const C = window.AudioContext || window.webkitAudioContext; this.ctx = new C();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.55; this.master.connect(this.ctx.destination);
      { const c = this.ctx, len = Math.floor(c.sampleRate * 1.8), ir = c.createBuffer(2, len, c.sampleRate); for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); } const conv = c.createConvolver(); conv.buffer = ir; this.send = c.createGain(); this.send.gain.value = 1; const wg = c.createGain(); wg.gain.value = 0.55; this.send.connect(conv); conv.connect(wg); wg.connect(this.master); }
      const n = this.ctx.sampleRate * 2, buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      this.noise = buf;
      // engine
      const o = this.ctx.createOscillator(), o2 = this.ctx.createOscillator(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
      o.type = 'sawtooth'; o2.type = 'square'; f.type = 'lowpass'; f.frequency.value = 500; g.gain.value = 0;
      o.connect(f); o2.connect(f); f.connect(g); g.connect(this.master); o.start(); o2.start();
      this.eng = { o, o2, f, g };
      // siren
      const so = this.ctx.createOscillator(), sg = this.ctx.createGain(); so.type = 'triangle'; sg.gain.value = 0; so.connect(sg); sg.connect(this.master); so.start();
      this.sir = { o: so, g: sg };
      // ocean/ambience
      const ns = this.ctx.createBufferSource(); ns.buffer = buf; ns.loop = true;
      const af = this.ctx.createBiquadFilter(); af.type = 'lowpass'; af.frequency.value = 600; const ag = this.ctx.createGain(); ag.gain.value = 0;
      ns.connect(af); af.connect(ag); ag.connect(this.master); ns.start();
      this.amb = { g: ag, f: af };
    } catch (e) { this.ctx = null; }
  },
  burst(dur, freq, q, vol, type = 'bandpass', slide = 0, wet = 0) {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime;
    const s = c.createBufferSource(); s.buffer = this.noise; s.playbackRate.value = 0.7 + Math.random() * 0.6;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); if (slide) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t + dur); f.Q.value = q;
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master); if (wet && this.send) { const w = c.createGain(); w.gain.value = wet; g.connect(w); w.connect(this.send); } s.start(t, Math.random(), dur + 0.05);
  },
  tone(freq, dur, vol = 0.2, type = 'sine', slide = 0, wet = 0) {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(g); g.connect(this.master); if (wet && this.send) { const w = c.createGain(); w.gain.value = wet; g.connect(w); w.connect(this.send); } o.start(t); o.stop(t + dur + 0.05);
  },
  shot(kind, vol = 1) {
    if (!this.ctx) return;
    const T_ = { pistol: { cr: 3000, cd: 0.06, bf: 900, bd: 0.14, th: 140, tv: 0.35, wet: 0.22, echo: 0 }, revolver: { cr: 2200, cd: 0.08, bf: 600, bd: 0.22, th: 90, tv: 0.5, wet: 0.3, echo: 0.15 }, smg: { cr: 3400, cd: 0.045, bf: 1200, bd: 0.09, th: 170, tv: 0.25, wet: 0.2, echo: 0 },
      shotgun: { cr: 1800, cd: 0.1, bf: 420, bd: 0.34, th: 70, tv: 0.7, wet: 0.4, echo: 0.22 }, rifle: { cr: 2600, cd: 0.07, bf: 700, bd: 0.2, th: 100, tv: 0.45, wet: 0.35, echo: 0.18 }, sniper: { cr: 2200, cd: 0.09, bf: 500, bd: 0.5, th: 60, tv: 0.8, wet: 0.5, echo: 0.3 } }[kind];
    if (!T_) { this.burst(0.08, 300, 1, 0.4 * vol, 'lowpass'); return; }
    this.burst(T_.cd, T_.cr, 0.8, 0.85 * vol, 'bandpass', 0.3, T_.wet); this.burst(T_.bd, T_.bf, 0.7, 0.9 * vol, 'lowpass', 0.25, T_.wet); this.tone(T_.th, 0.16, T_.tv * vol, 'sine', 0.45, T_.wet);
    setTimeout(() => this.burst(0.5, 800, 0.5, 0.1 * vol, 'lowpass', 0.15, 0.7), 70); if (T_.echo) setTimeout(() => this.burst(0.4, 500, 0.6, T_.echo * vol, 'lowpass', 0.2, 0.8), 260);
  },
  click(v = 1, f = 2200) { this.burst(0.025, f, 4, 0.35 * v, 'bandpass', 0.5, 0.1); this.tone(f * 0.6, 0.03, 0.06 * v, 'square', 0.5); },
  clack(v = 1) { this.burst(0.04, 900, 3, 0.5 * v, 'bandpass', 0.4, 0.12); this.tone(400, 0.05, 0.08 * v, 'square', 0.6); },
  pump() { this.click(1, 1500); setTimeout(() => this.clack(1.2), 110); },
  reloadSeq(w, dur) {
    const at = (f, fn) => setTimeout(fn, f * dur * 1000);
    if (w === 'shotgun' || w === 'sawedoff') { for (let k = 0; k < (w === 'shotgun' ? 4 : 2); k++) at(0.12 + k * 0.2, () => this.click(1, 1800)); at(0.9, () => this.clack(1.2)); }
    else if (w === 'rpg') { at(0.3, () => this.clack(1.5)); at(0.7, () => this.clack(1.8)); }
    else { at(0.16, () => this.click()); at(0.6, () => this.clack()); at(0.84, () => { this.click(0.8, 2600); this.clack(0.8); }); }
  },
  boom() { this.burst(1.4, 500, 0.4, 2, 'lowpass', 0.1); this.tone(55, 1.0, 0.7, 'sawtooth', 0.3); },
  hit() { this.burst(0.08, 600, 1, 0.5, 'lowpass'); },
  cash() { this.tone(988, 0.1, 0.18, 'triangle'); setTimeout(() => this.tone(1319, 0.2, 0.18, 'triangle'), 90); },
  buy() { this.tone(660, 0.08, 0.2, 'square'); setTimeout(() => this.tone(880, 0.12, 0.2, 'square'), 80); },
  alarm() { for (let i = 0; i < 6; i++) setTimeout(() => this.tone(i % 2 ? 900 : 1300, 0.15, 0.25, 'square'), i * 160); },
  star() { this.tone(520, 0.12, 0.25, 'sawtooth'); setTimeout(() => this.tone(390, 0.25, 0.25, 'sawtooth'), 120); },
  horn(v = 1) { this.tone(330, 0.3, 0.2 * v, 'sawtooth'); this.tone(415, 0.3, 0.15 * v, 'sawtooth'); },
  thud(v = 1) { this.burst(0.18, 200, 1, 0.8 * v, 'lowpass'); },
  step() { this.burst(0.04, 400, 1, 0.07, 'lowpass'); },
  thunder(delay, vol = 1) { setTimeout(() => { if (!this.ctx) return; this.burst(3.4, 170, 0.4, 1.9 * vol, 'lowpass', 0.25); this.tone(46, 2.4, 0.5 * vol, 'sawtooth', 0.5); }, Math.max(0, delay) * 1000); },
  weather(rain, wind, storm) {
    if (!this.ctx) return; const c = this.ctx;
    if (!this.wx) {
      const mk = (type, f, q) => { const s = c.createBufferSource(); s.buffer = this.noise; s.loop = true; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = c.createGain(); g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(this.master); s.start(); return { g, f: fl }; };
      this.wx = { rain: mk('highpass', 1800, 0.5), wind: mk('bandpass', 320, 0.7) };
    }
    const t = c.currentTime; this.wx.rain.g.gain.setTargetAtTime(rain * 0.16, t, 0.6); this.wx.wind.g.gain.setTargetAtTime(wind * 0.11 * (0.7 + 0.3 * Math.sin(G.time * 0.9)), t, 0.4); this.wx.wind.f.frequency.setTargetAtTime(220 + wind * 380 + Math.sin(G.time * 0.6) * 60, t, 0.5);
  },
  sting(kind) { const S = { start: [[523, 0], [659, 90], [784, 180]], pass: [[523, 0], [659, 120], [784, 240], [1047, 380], [1319, 560]], fail: [[392, 0], [330, 170], [262, 340], [196, 520]] }[kind] || []; S.forEach(([f, t]) => setTimeout(() => this.tone(f, 0.32, 0.18, 'triangle'), t)); },
  music(on) {
    if (!this.ctx) return; const c = this.ctx;
    if (!this.mus) { const g = c.createGain(); g.gain.value = 0; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900; f.connect(g); g.connect(this.master); this.mus = { g, os: [0, 1, 2].map(i => { const o = c.createOscillator(); o.type = i ? 'triangle' : 'sine'; o.detune.value = (i - 1) * 7; o.connect(f); o.start(); return o; }), i: 0 }; }
    const m = this.mus, chords = [[110, 164.8, 261.6], [87.3, 130.8, 220], [98, 146.8, 246.9], [82.4, 123.5, 196]]; clearInterval(m.t);
    const set = () => { const ch = chords[m.i++ % 4]; m.os.forEach((o, k) => o.frequency.setTargetAtTime(ch[k], c.currentTime, 0.6)); };
    if (on) { set(); m.t = setInterval(set, 3600); m.g.gain.setTargetAtTime(0.09, c.currentTime, 0.8); } else m.g.gain.setTargetAtTime(0, c.currentTime, 0.5);
  },
  scream() { this.tone(900 + Math.random() * 400, 0.35, 0.12, 'sawtooth', 1.5); },
  update(speed01, driving, sirenVol, shoreVol, boost) {
    if (!this.ctx) return; const t = this.ctx.currentTime;
    const e = this.eng;
    e.g.gain.setTargetAtTime(driving ? 0.07 + speed01 * 0.07 : 0, t, 0.08);
    e.o.frequency.setTargetAtTime(38 + speed01 * 150 + (boost ? 20 : 0), t, 0.08);
    e.o2.frequency.setTargetAtTime(19 + speed01 * 75, t, 0.08);
    e.f.frequency.setTargetAtTime(260 + speed01 * 900, t, 0.1);
    this.sir.g.gain.setTargetAtTime(sirenVol * 0.07, t, 0.15);
    this.sir.o.frequency.setTargetAtTime(700 + 350 * Math.sin(G.time * 5.5), t, 0.03);
    this.amb.g.gain.setTargetAtTime(shoreVol * 0.22, t, 0.5);
  },
};

// ---------- particles (one draw call) ----------
class Particles {
  constructor(max) {
    this.max = max; this.n = 0; this.i = 0;
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 3); this.size = new Float32Array(max); this.alpha = new Float32Array(max);
    this.vel = new Float32Array(max * 3); this.life = new Float32Array(max); this.max_life = new Float32Array(max); this.grav = new Float32Array(max); this.grow = new Float32Array(max); this.s0 = new Float32Array(max);
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(this.pos, 3)); g.setAttribute('color', new T.BufferAttribute(this.col, 3));
    g.setAttribute('size', new T.BufferAttribute(this.size, 1)); g.setAttribute('alpha', new T.BufferAttribute(this.alpha, 1));
    const m = new T.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { scale: { value: 600 }, uPost: PostFlag },
      vertexShader: 'attribute float size;attribute float alpha;varying vec3 vc;varying float va;uniform float scale;void main(){vc=color;va=alpha;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=size*scale/max(1.,-mv.z);gl_Position=projectionMatrix*mv;}',
      fragmentShader: 'uniform float uPost;varying vec3 vc;varying float va;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(mix(vc,pow(vc,vec3(2.2)),uPost),va*(1.-d*d));}',
      vertexColors: true,
    });
    this.mesh = new T.Points(g, m); this.mesh.frustumCulled = false; this.geo = g; this.mat = m;
  }
  emit(x, y, z, vx, vy, vz, life, size, r, g, b, grav = 0, grow = 0) {
    const i = this.i = (this.i + 1) % this.max, p = i * 3;
    this.pos[p] = x; this.pos[p + 1] = y; this.pos[p + 2] = z; this.vel[p] = vx; this.vel[p + 1] = vy; this.vel[p + 2] = vz;
    this.col[p] = r; this.col[p + 1] = g; this.col[p + 2] = b; this.life[i] = life; this.max_life[i] = life; this.s0[i] = size; this.size[i] = size; this.alpha[i] = 1; this.grav[i] = grav; this.grow[i] = grow;
  }
  update(dt) {
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) { this.alpha[i] = 0; continue; }
      this.life[i] -= dt; const p = i * 3;
      this.vel[p + 1] -= this.grav[i] * dt;
      this.pos[p] += this.vel[p] * dt; this.pos[p + 1] += this.vel[p + 1] * dt; this.pos[p + 2] += this.vel[p + 2] * dt;
      if (this.pos[p + 1] < 0.05 && this.grav[i] > 0) { this.pos[p + 1] = 0.05; this.vel[p] *= 0.6; this.vel[p + 2] *= 0.6; this.vel[p + 1] = 0; }
      const k = Math.max(0, this.life[i] / this.max_life[i]);
      this.alpha[i] = Math.min(1, k * 1.6); this.size[i] = this.s0[i] * (1 + this.grow[i] * (1 - k));
    }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.color.needsUpdate = true;
    this.geo.attributes.size.needsUpdate = true; this.geo.attributes.alpha.needsUpdate = true;
  }
}
let FX = null; // set in main
function fxSpark(x, y, z, n = 6) { for (let i = 0; i < n; i++) FX.emit(x, y, z, rr(-3, 3), rr(0, 4), rr(-3, 3), rr(0.15, 0.35), 0.12, 1, 0.8, 0.3, 9); }
function fxDust(x, y, z, n = 5) { for (let i = 0; i < n; i++) FX.emit(x, y, z, rr(-1.5, 1.5), rr(0.2, 1.5), rr(-1.5, 1.5), rr(0.4, 0.9), 0.5, 0.75, 0.72, 0.65, 0, 2); }
function fxBlood(x, y, z, n = 8) { for (let i = 0; i < n; i++) FX.emit(x, y, z, rr(-2.5, 2.5), rr(0.5, 3.5), rr(-2.5, 2.5), rr(0.3, 0.7), 0.16, 0.65, 0.04, 0.06, 9); }
function fxSmoke(x, y, z, dark = 0.2) { FX.emit(x + rr(-.3, .3), y, z + rr(-.3, .3), rr(-.4, .4), rr(1.5, 3), rr(-.4, .4), rr(.8, 1.6), 0.9, dark, dark, dark, -0.2, 2.5); }
function fxFire(x, y, z) { FX.emit(x + rr(-.4, .4), y, z + rr(-.4, .4), rr(-.4, .4), rr(1.5, 3.5), rr(-.4, .4), rr(.3, .6), 0.9, 1, rr(0.35, 0.7), 0.1, -0.5, 1); }
function fxExplosion(x, y, z) {
  for (let i = 0; i < 40; i++) FX.emit(x, y + 0.5, z, rr(-9, 9), rr(2, 12), rr(-9, 9), rr(0.5, 1.2), 1.6, 1, rr(0.3, 0.8), 0.1, 6, 1.5);
  for (let i = 0; i < 25; i++) FX.emit(x, y + 1, z, rr(-4, 4), rr(2, 7), rr(-4, 4), rr(1.2, 2.5), 2, 0.15, 0.15, 0.15, -0.5, 3);
  Snd.boom(); G.shake = Math.max(G.shake, 1);
}
