'use strict';
// ===== Story engine: characters, cinematic cutscenes, mission runner, markers, journal =====
const CHARS = {
  jax: { name: 'Jax', color: '#ff4fa3', pitch: 250 },
  luz: { name: 'Luz Delgado', color: '#27e1d0', pitch: 340, bio: 'Fixer. Runs Delgado\'s Dockside on the pier. Wrote Jax every month for three years.', look: { skin: 0xc68a5a, hair: 0x1b1411, style: 'ponytail', shirt: 0x27e1d0, sleeve: 0xc68a5a, pants: 0x2f4a7a, hat: null, shoe: 0xf4f4f4, belt: 0x4a3320, acc: 'earrings', scale: 0.97, build: 0.95 } },
  dex: { name: 'Dex Okafor', color: '#ffd23f', pitch: 440, bio: 'Nineteen. Hacker, wheelman, energy-drink enthusiast.', look: { skin: 0x6f4a30, hair: 0x0c0c0c, style: 'afro', shirt: 0xffd23f, sleeve: 0xffd23f, longSleeve: true, pants: 0x1a1a1a, hat: null, shoe: 0xf4f4f4, bag: 0x222222, acc: 'headphones', scale: 1.02, build: 0.9 } },
  boone: { name: 'Det. Marcy Boone', color: '#4aa8ff', pitch: 280, bio: 'Florida Highway Patrol. Smart, tired, impossible to read.', look: { skin: 0xf1c9a5, hair: 0xd9c27a, style: 'bun', shirt: 0xe8e4d8, sleeve: 0x1c3a78, jacket: 0x1c3a78, pants: 0x14264f, hat: null, belt: 0x111111, shoe: 0x111111, scale: 1.02, build: 1.0 } },
  vance: { name: 'Rico Vance', color: '#f4f4f4', pitch: 190, bio: '"The Pelican." Owns the bank, the marina, half the council, and a rocket company.', look: { skin: 0xe0ac7e, hair: 0xcfcfcf, style: 'short', shirt: 0xff7ab0, sleeve: 0xf6f6f6, jacket: 0xf6f6f6, tie: 0xff4fa3, pants: 0xf6f6f6, hat: 0xf6f6f6, hatType: 'straw', shades: true, shoe: 0xe8e0d0, belt: 0xd8b040, acc: 'shades', scale: 1.03, build: 1.04 } },
  gus: { name: 'Old Gus', color: '#ff7a5a', pitch: 170, bio: 'Swamp hermit. Has an airboat, a shotgun, and a grudge against Vance.', look: { skin: 0xe0ac7e, hair: 0xdddddd, style: 'buzz', shirt: 0xb03a2a, sleeve: 0xb03a2a, longSleeve: true, pants: 0x2a5a9a, hat: 0xe8d28a, hatType: 'straw', beard: true, shoe: 0x3a2a1c, belt: 0x4a3320, acc: 'beard', scale: 0.98, build: 1.12 } },
  finch: { name: 'Morris Finch', color: '#b5d3f2', pitch: 390, bio: 'Vance\'s accountant. Does taxes. Mostly taxes.', look: { skin: 0xf6d7bd, hair: 0x8a8a8a, style: 'bald', shirt: 0xe8e8e8, sleeve: 0xe8e8e8, longSleeve: true, pants: 0x4a4a52, tie: 0x7a2a8a, hat: null, belt: 0x2a1f16, shoe: 0x15110e, bag: 0x2a1f16, acc: 'glasses', scale: 0.96, build: 0.9 } },
  tito: { name: 'Tito Salazar', color: '#d06a2a', pitch: 210, bio: 'Vance\'s lieutenant. Moves the cash by car.', look: { skin: 0xc68a5a, hair: 0x0c0c0c, style: 'short', shirt: 0xd8b040, sleeve: 0x111111, jacket: 0x111111, pants: 0x111111, hat: null, shades: true, beard: true, belt: 0x111111, shoe: 0x111111, acc: 'shades', scale: 1.04, build: 1.1 } },
  radio: { name: 'Radio', color: '#aaaaaa', pitch: 300 },
};

function drawPortrait(cv, id, talk) {
  const g = cv.getContext('2d'), c = CHARS[id] || CHARS.radio, L = id === 'jax' ? makeLookSafe() : c.look || { skin: 0xdddddd, hair: 0x555555 };
  const hex = n => '#' + (n >>> 0).toString(16).padStart(6, '0'), S = cv.width / 48; g.setTransform(S, 0, 0, S, 0, 0); g.imageSmoothingEnabled = false;
  const gr = g.createLinearGradient(0, 0, 0, 48); gr.addColorStop(0, '#1d2a4a'); gr.addColorStop(1, '#0a0f20'); g.fillStyle = gr; g.fillRect(0, 0, 48, 48);
  const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  R(8, 38, 32, 10, hex(L.shirt || 0x888888)); R(19, 33, 10, 6, hex(L.skin)); // shoulders & neck
  R(13, 10, 22, 24, hex(L.skin)); R(13, 8, 22, 6, hex(L.hair)); R(11, 10, 3, 12, hex(L.hair)); R(34, 10, 3, 12, hex(L.hair));
  if (id === 'finch') R(13, 8, 22, 4, hex(L.skin));
  R(17, 21, 5, 4, '#fff'); R(26, 21, 5, 4, '#fff'); R(19, 22, 2, 3, '#111'); R(28, 22, 2, 3, '#111'); R(16, 19, 7, 1, hex(L.hair)); R(25, 19, 7, 1, hex(L.hair));
  if (L.hat != null) { R(11, 6, 26, 4, hex(L.hat)); if (id === 'gus') R(8, 9, 32, 2, hex(L.hat)); }
  if (L.acc === 'shades') { R(15, 20, 18, 5, '#05050a'); R(23, 21, 2, 1, '#05050a'); }
  if (L.acc === 'glasses') { g.strokeStyle = '#222'; g.lineWidth = 1; g.strokeRect(16.5, 20.5, 7, 6); g.strokeRect(24.5, 20.5, 7, 6); }
  if (L.acc === 'beard') R(14, 28, 20, 8, hex(L.hair));
  if (L.acc === 'headphones') { R(10, 14, 4, 10, '#222'); R(34, 14, 4, 10, '#222'); R(12, 6, 24, 2, '#222'); }
  if (L.acc === 'earrings') { R(12, 26, 2, 3, '#ffd23f'); R(34, 26, 2, 3, '#ffd23f'); }
  if (id === 'jax') { R(11, 6, 26, 4, '#ff4fa3'); R(15, 20, 18, 4, '#101018'); }
  R(21, 28, 6, talk ? 4 : 1, talk ? '#5a1a1a' : '#7a3a3a');
}
function makeLookSafe() { return P.actor ? P.actor.look : { skin: 0xe0ac7e, hair: 0x1b1411, shirt: 0xfff5e0 }; }

// ---------- cutscene director ----------
const Cut = {
  on: false, script: [], i: -1, line: null, t: 0, shown: 0, wait: 0, done: null, cam: null, last: 'jax', shotN: 0, skipping: false, talkT: 0, mouth: false, keep: [], title: 0, choiceOpen: false,
  play(script, done, keep) {
    if (P.inCar) P.ejectFromCar(true); P.releaseHostage(); this.on = true; G.cut = true; this.script = script; this.i = -1; this.done = done; this.keep = keep || []; this.skipping = false; this.shotN = 0; this.last = 'jax'; this.line = null; this.wait = 0;
    document.body.classList.add('cut'); this.prevInvuln = G.invuln; G.invuln = true; Input.m = [false, false, false]; this.next(); Snd.music(true, 'calm');
  },
  actor(id) { return id === 'jax' ? P.actor : Story.cast_[id]; },
  next() {
    for (;;) {
      this.i++; const e = this.script[this.i]; this.line = null; $('dlg').classList.remove('on');
      if (!e) return this.end();
      if (e.if && !e.if()) continue;
      if (e.set) { this.set(e.set); continue; }
      if (e.act) { e.act(); continue; }
      if (e.cast) { for (const c of e.cast) Story.cast(c.id, c.x, c.z, c.yaw || 0); continue; }
      if (e.cam) { this.setCam(e.cam); if (!e.text && !e.wait) continue; }
      if (e.title) { Story.card(e.kicker || '', e.title, e.sub || ''); this.wait = 3.0; return; }
      if (e.wait) { this.wait = e.wait; if (e.cam) { } return; }
      if (e.choice) { this.showChoice(e.choice); return; }
      if (e.text) { if (this.skipping) continue; this.startLine(e); return; }
    }
  },
  set(map) { // {jax:[x,z], luz:[x,z]...} place actors facing each other
    const ids = Object.keys(map); let ax = map.jax ? map.jax[0] : P.x, az = map.jax ? map.jax[1] : P.z;
    for (const id of ids) { const m = map[id]; if (id === 'jax') { P.x = m[0]; P.z = m[1]; P.y = groundY(m[0], m[1]); P.vx = P.vz = 0; } else { const o = { x: m[0], z: m[1] }; resolveCircle(o, 0.7, 0); Story.cast(id, o.x, o.z, 0); } }
    for (const id of ids) { const a = this.actor(id); if (!a) continue; const m = map[id]; let tx, tz; if (m[2] != null) { a.yaw = m[2]; if (id === 'jax') P.face = m[2]; continue; } const other = ids.find(o => o !== id), b = other ? this.actor(other) : null; if (!b) continue; a.yaw = Math.atan2(b.x - a.x, b.z - a.z); if (id === 'jax') P.face = a.yaw; }
    for (const id of ids) { const a = this.actor(id); if (a && id !== 'jax') { a.fixed = { x: a.x, z: a.z, yaw: a.yaw }; } }
    G.camera.position.set(P.x, 2, P.z); // avoid pop
  },
  setCam(c) { this.cam = { p0: c.p, p1: c.to || c.p, l0: c.l, l1: c.lto || c.l, fov: c.fov || 50, T: c.dur || 4, t: 0 }; this.camMode = 'key'; },
  startLine(e) {
    e.listener = this.pickListener(e); this.line = e; this.t = 0; this.shown = 0; this.hold = 0.8 + e.text.length * 0.03; this.lineDone = false;
    const id = e.who, ch = CHARS[id] || CHARS.radio; $('dlg').classList.add('on'); $('dlg').style.setProperty('--c', ch.color); $('spk').textContent = ch.name; $('dtx').textContent = '';
    drawPortrait($('port'), id, false); this.pitch = ch.pitch;
    if (e.shot !== 'cam' && !(e.cam)) this.makeShot(e);
    this.last2 = this.last; this.last = id;
  },
  pickListener(e) {
    if (e.to && this.actor(e.to)) return e.to; const others = Object.keys(Story.cast_).filter(k => k !== e.who);
    if (e.who === 'jax') return (this.last !== 'jax' && this.actor(this.last)) ? this.last : (others[0] || 'jax');
    return (this.last !== e.who && this.actor(this.last)) ? this.last : (e.who === 'jax' ? others[0] : 'jax');
  },
  makeShot(e) {
    const order = ['wide', 'ots', 'close', 'ots', 'close', 'low']; let style = e.shot; if (!style) style = this.shotN === 0 ? 'wide' : (this.last !== e.who ? order[1 + (this.shotN % 2) * 1] : 'close');
    if (e.shot === undefined && Math.random() < 0.12) style = 'low'; this.shotN++;
    const S = this.actor(e.who) || P.actor, Lst = this.actor(e.listener) || P.actor;
    const sx = S.x, sz = S.z, lx = Lst ? Lst.x : sx - Math.sin(S.yaw) * 3, lz = Lst ? Lst.z : sz - Math.cos(S.yaw) * 3;
    let dx = sx - lx, dz = sz - lz; const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
    for (let attempt = 0; attempt < 3; attempt++) {
      const sg = attempt === 1 ? -1 : 1, px = -dz * sg, pz = dx * sg, k = attempt === 2 ? 0.55 : 1; let cam, look = [sx, (S.y || 0) + 1.55, sz], fov;
      if (style === 'ots') { cam = [lx - dx * 1.5 * k + px * 0.6, 1.62, lz - dz * 1.5 * k + pz * 0.6]; fov = 42; }
      else if (style === 'close') { cam = [sx - dx * 2.1 * k + px * 0.35, 1.5, sz - dz * 2.1 * k + pz * 0.35]; fov = 32; }
      else if (style === 'low') { cam = [sx - dx * 2.8 * k + px * 1.0, 0.5, sz - dz * 2.8 * k + pz * 1.0]; look[1] = (S.y || 0) + 1.7; fov = 50; }
      else { const mx = (sx + lx) / 2, mz = (sz + lz) / 2; cam = [mx + px * 7.5 * k, 2.5, mz + pz * 7.5 * k]; look = [mx, 1.4, mz]; fov = 52; }
      const h = rayHitSolid(look[0], look[1], look[2], cam[0], cam[1], cam[2]); if (h < 0 || attempt === 2) { if (h >= 0) { const t = Math.max(0.3, h - 0.06); cam = cam.map((v, i) => look[i] + (v - look[i]) * t); } this.cam = { p0: cam, p1: [cam[0] + (look[0] - cam[0]) * 0.1 + px * 0.2, cam[1] + 0.05, cam[2] + (look[2] - cam[2]) * 0.1 + pz * 0.2], l0: look, l1: look, fov, T: 8, t: 0 }; this.camMode = 'key'; this.snap = true; break; }
    }
  },
  showChoice(ch) {
    this.choiceOpen = true; this.wait = 0; const el = $('choice'); el.innerHTML = `<h2>${ch.prompt}</h2>`; $('dlg').classList.remove('on');
    ch.options.forEach(o => { const b = document.createElement('button'); b.className = 'btn'; b.textContent = o.text; b.onclick = () => { Story.choices[ch.id] = o.id; el.innerHTML = ''; this.choiceOpen = false; Snd.buy(); this.next(); }; el.appendChild(b); });
    document.exitPointerLock && Input.unlock();
  },
  advance() { if (this.choiceOpen) return; if (this.line) { if (this.shown < this.line.text.length) this.shown = this.line.text.length; else this.next(); } else if (this.wait > 0 && !this.script[this.i].title) this.wait = 0; },
  update(dt) {
    if (Input.pressed('Space') || Input.pressed('Enter') || Input.mdown[0]) this.advance();
    if (Input.pressed('Backspace')) { this.skipping = true; this.next(); if (!this.on) return; }
    // typewriter
    if (this.line) {
      this.t += dt; const n = Math.min(this.line.text.length, Math.floor(this.t * 44)); if (n > this.shown) { for (let k = this.shown; k < n; k += 2) Snd.tone(this.pitch * (0.85 + Math.random() * 0.35), 0.035, 0.04, 'square'); this.shown = n; }
      $('dtx').textContent = this.line.text.slice(0, this.shown); const talking = this.shown < this.line.text.length;
      if (talking) { this.talkT += dt; if (this.talkT > 0.12) { this.talkT = 0; this.mouth = !this.mouth; drawPortrait($('port'), this.line.who, this.mouth); } } else if (this.mouth) { this.mouth = false; drawPortrait($('port'), this.line.who, false); }
      if (!talking) { this.lineDone = (this.lineDone || 0) + dt; if (this.lineDone > this.hold && !this.line.hold) this.next(); }
      const S = this.actor(this.line.who); for (const id of Object.keys(Story.cast_)) { const a = Story.cast_[id]; a.talking = (a === S) && talking; }
      P.actor.talking = S === P.actor && talking;
    } else if (this.wait > 0) { this.wait -= dt; if (this.wait <= 0) this.next(); }
    // face each other
    const spk = this.line ? this.actor(this.line.who) : null; const oth = this.actor(this.line ? this.line.listener : 'jax');
    if (spk && oth && spk !== oth) { spk.yaw = turnToward(spk.yaw, Math.atan2(oth.x - spk.x, oth.z - spk.z), 4 * dt); if (spk === P.actor) P.face = spk.yaw; if (oth !== spk) { oth.yaw = turnToward(oth.yaw, Math.atan2(spk.x - oth.x, spk.z - oth.z), 3 * dt); if (oth === P.actor) P.face = oth.yaw; } }
    for (const a of [P.actor, ...Object.values(Story.cast_)]) { const p = a.pose; a.talkGest = !!a.talking; p.walk = lerp(p.walk, 0, 0.15); if (a.talking) { const o = Cut.line && Cut.actor(Cut.line.listener); if (o && o !== a) a.lookAt = { x: o.x, z: o.z }; } else if (!a.lookAt || a === P.actor) a.lookAt = (Cut.line && Cut.actor(Cut.line.who) !== a) ? (() => { const sp = Cut.actor(Cut.line.who); return sp ? { x: sp.x, z: sp.z } : null; })() : null; p.aim = lerp(p.aim, 0, 0.2); p.hands = lerp(p.hands, 0, 0.2); }
    P.actor.x = P.x; P.actor.z = P.z; P.actor.yaw = P.face; P.actor.y = P.y;
    // camera
    const c = this.cam; if (c) {
      c.t = Math.min(c.T, c.t + dt); const k = c.t / c.T, e = k * k * (3 - 2 * k), cam = G.camera, p = [lerp(c.p0[0], c.p1[0], e), lerp(c.p0[1], c.p1[1], e), lerp(c.p0[2], c.p1[2], e)], l = [lerp(c.l0[0], c.l1[0], e), lerp(c.l0[1], c.l1[1], e), lerp(c.l0[2], c.l1[2], e)];
      cam.position.set(p[0], p[1], p[2]); cam.lookAt(l[0], l[1], l[2]); if (Math.abs(cam.fov - c.fov) > 0.05) { cam.fov = lerp(cam.fov, c.fov, this.snap ? 1 : 0.1); cam.updateProjectionMatrix(); } this.snap = false;
    }
  },
  end() {
    this.on = false; G.cut = false; $('dlg').classList.remove('on'); $('choice').innerHTML = ''; document.body.classList.remove('cut'); G.invuln = this.prevInvuln || false; this.choiceOpen = false;
    for (const id of Object.keys(Story.cast_)) { Story.cast_[id].talking = false; if (!this.keep.includes(id)) Story.uncast(id); }
    P.actor.talking = false; P.camYaw = P.face + Math.PI; P.camPitch = 0.15; P.fov = G.camera.fov; P.dist = null; Snd.music(false); Input.lock();
    const d = this.done; this.done = null; d && d();
  },
};

// ---------- markers ----------
const Markers = {
  items: new Map(), grp: null, mats: {},
  init(scene) { this.grp = new T.Group(); scene.add(this.grp); },
  make(color) {
    const g = new T.Group(), m = new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.28, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide });
    const beam = new T.Mesh(new T.CylinderGeometry(1.4, 1.4, 90, 16, 1, true), m); beam.position.y = 45; g.add(beam);
    const ring = new T.Mesh(new T.TorusGeometry(2.2, 0.12, 8, 28), new T.MeshBasicMaterial({ color })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.25; g.add(ring);
    const dia = new T.Mesh(new T.OctahedronGeometry(0.8), new T.MeshBasicMaterial({ color })); dia.position.y = 4.5; g.add(dia); g.userData = { ring, dia }; return g;
  },
  set(key, x, z, color) {
    let it = this.items.get(key); if (!it || it.color !== color) { if (it) this.grp.remove(it.g); it = { g: this.make(color), color, seen: true }; this.items.set(key, it); this.grp.add(it.g); }
    it.seen = true; it.g.position.set(x, groundY(x, z), z); it.g.visible = true;
  },
  flush(t) { for (const [k, it] of this.items) { if (!it.seen) it.g.visible = false; it.seen = false; const u = it.g.userData; u.dia.position.y = 4.5 + Math.sin(t * 2.5) * 0.4; u.dia.rotation.y = t * 2; const s = 1 + 0.12 * Math.sin(t * 3); u.ring.scale.set(s, s, s); } },
};

// ---------- mission runner ----------
const Story = {
  cast_: {}, missions: [], byId: {}, done: {}, choices: {}, notes: [], cur: null, refs: {}, tracked: [], pos: {}, gps: null, routeT: 0, route: null, markNow: null, chatQ: [], chatT: 0, completed: false, cpCutDone: 0,
  // ---- setup
  build() { this.setupPositions(); this.buildShack(); },
  setupPositions() {
    const p = this.pos, banks = Shops.list.filter(s => s.type === 'bank'), ind = World.anchors.industrial || [];
    p.pier = { x: PIER.x0 + 34, z: (PIER.z0 + PIER.z1) / 2 }; p.safe = Shops.safe; p.hospital = Shops.hospital;
    const ia = ind.find(q => q.x > -300 && q.z > 250); p.garage = ia ? { x: ia.x, z: ia.z } : { x: 0, z: 400 };
    p.bank = banks[0]; p.shack = { x: -640, z: -2 }; p.lighthouse = { x: World.lighthouse.x - 12, z: World.lighthouse.z + 10 };
    const club = (World.anchors.beach || []).filter(a => a.tx > 380).sort((a, b) => Math.abs(a.tz) - Math.abs(b.tz))[0]; p.club = club ? { x: club.tx, z: club.tz } : { x: 500, z: 0 };
    p.pad = { x: 260, z: -742 }; p.padFar = { x: 260, z: -790 }; p.tito = { x: 160, z: -80 };
  },
  buildShack() {
    const x = this.pos.shack.x - 8, z = this.pos.shack.z - 22, ch = chunkOf(x, z);
    ch.plain.box(x - 7, 0, z - 5, x + 7, 1.3, z + 5, 0x6b4a2b);
    for (const [a, b] of [[-6.5, -4.5], [6.5, -4.5], [-6.5, 4.5], [6.5, 4.5]]) ch.plain.box(x + a - .3, -1.5, z + b - .3, x + a + .3, 1.3, z + b + .3, 0x4a3320);
    ch.win.box(x - 6, 1.3, z - 4.5, x + 6, 4.6, z + 4.5, 0x9a7a52, true, 0x9a7a52); ch.plain.gable(x - 6, z - 4.5, x + 6, z + 4.5, 4.6, 2.2, 0x6d747a, true, 0.8);
    ch.plain.box(x - 9, 1.0, z + 4.6, x + 3, 1.3, z + 6.6, 0x6b4a2b); ch.plain.box(x + 8, 0, z - 1, x + 13, 0.9, z + 1, 0x7a8a8a); ch.plain.cyl(x + 8.5, z, 1.4, 1.4, 1.2, 2.9, 0x333333, 8); // airboat-ish fan housing
    addSolid(x - 7, z - 5, x + 7, z + 5, 4.6, 'shack'); World.special.shackPos = { x, z };
    const m = signMesh("GUS'S BAIT & AMMO", 6, 1, '#3a2a1a', '#ffd23f'); m.position.set(x, 3.6, z + 4.55); World.scene.add(m);
    for (let i = 0; i < 12; i++) { const a = rr(0, TAU), d = rr(10, 28); tree(x + Math.cos(a) * d, z + Math.sin(a) * d, 1.2); }
  },
  init() { Markers.init(World.scene); const c = document.getElementById('jl'); },
  load(list) { for (const m of list) { this.missions.push(m); this.byId[m.id] = m; } },
  // ---- helpers for mission scripts
  nearestShop(type) { let b = null, bd = 1e12; for (const s of Shops.list) if (s.type === type) { const d = d2(s.door.x, s.door.z, P.x, P.z); if (d < bd) { bd = d; b = s; } } return b ? { x: b.door.x, z: b.door.z, shop: b } : this.pos.pier; },
  cast(id, x, z, yaw) {
    let n = this.cast_[id]; const ch = CHARS[id];
    if (!n) { n = NPCs.createFixed({ label: ch.name, look: 'casual', x, z, yaw: yaw || 0, hp: 99999 }); n.look = Object.assign({}, ch.look); n.name = ch.name; n.jobLabel = ''; n.story = true; n.immortal = true; n.charId = id; n.armed = false; this.cast_[id] = n; }
    n.fixed = { x, z, yaw: yaw || 0 }; n.x = x; n.z = z; n.sx = x; n.sz = z; n.syaw = yaw || 0; n.yaw = yaw || 0; n.y = groundY(x, z); n.removed = false; n.alive = true; if (!n.active) NPCs.activate(n); n.state = 'story'; n.pose.dead = 0; n.pose.hands = 0; return n;
  },
  uncast(id) { const n = this.cast_[id]; if (!n) return; NPCs.deactivate(n); n.removed = true; n.alive = false; const i = NPCs.list.indexOf(n); if (i >= 0) NPCs.list.splice(i, 1); delete this.cast_[id]; },
  charStep(n, dt) { const p = n.pose; if (!Cut.on) { n.talking = false; const d = dist(n.x, n.z, P.x, P.z); if (d < 10 && !P.inCar) n.yaw = turnToward(n.yaw, Math.atan2(P.x - n.x, P.z - n.z), 3 * dt); p.walk = lerp(p.walk, 0, 0.2); } n.hidden = false; },
  goon(x, z, o = {}) {
    const n = NPCs.createFixed({ label: 'Pelican crew', look: 'casual', x, z, yaw: 0, hp: o.hp || 85, armed: true, role: 'goon' });
    n.look = Object.assign(makeLook('suit'), { shirt: 0xff7ab0, sleeve: 0xf4f4f4, jacket: 0xf4f4f4, tie: 0xff4fa3, pants: 0xf4f4f4, hat: chance(.3) ? 0xf4f4f4 : null, hatType: 'straw', shades: chance(0.6), shoe: 0xe8e0d0 }); n.quiet = true; n.gun = { len: o.rifle ? 0.85 : 0.3, two: !!o.rifle }; n.jobLabel = 'Pelican crew'; n.goon = true;
    n.sx = x; n.sz = z; n.syaw = 0; NPCs.activate(n); n.state = o.idle ? 'story' : 'fight'; n.fightT = 99999; if (o.idle) { n.story = true; n.immortal = false; } n.y = 0; this.track(n); return n;
  },
  spawnCar(type, x, z, h, o = {}) { const c = Vehicles.create(type, x, z, h, Object.assign({ mode: 'abandoned' }, o)); c.keep = true; c.sleep = false; c.story = true; this.track(c); return c; },
  track(e) { this.tracked.push(e); return e; },
  ref(k) { return this.refs[k]; },
  roadPoint(minD, maxD) { for (let i = 0; i < 60; i++) { const n = pick(Vehicles.nodeList || [...World.nodes.values()]); const d = dist(n.x, n.z, P.x, P.z); if (d > minD && d < maxD) return n; } return pick(Vehicles.nodeList); },
  mark(x, z, color) { this.markNow = { x, z, color: color || '#ffd23f' }; },
  say(who, text, dur = 4.2) { this.chatQ.push({ who, text, dur }); },
  card(k, h, p) { const c = $('card'); c.classList.remove('on'); void c.offsetWidth; $('cardk').textContent = k; $('cardh').textContent = h; $('cardp').textContent = p || ''; c.classList.add('on'); },
  note(t) { if (!this.notes.includes(t)) this.notes.push(t); },
  // ---- availability & flow
  isAvail(m) { return !this.done[m.id] && (m.req || []).every(r => this.done[r]); },
  startMission(m) {
    this.cur = { m, step: 0, cp: 0, t: 0, rt: null, failing: false, delay: 3.0, started: false, chat: [] }; this.refs = {}; this.tracked = []; Snd.sting('start');
    this.card(m.side ? 'SIDE JOB' : (m.kicker || 'MISSION ' + m.num), m.title, m.tagline || '');
    UI.msg('', 1);
  },
  beginStep() {
    const c = this.cur, d = c.m.steps[c.step]; if (!d) return this.pass(); const h = H[d.type]; c.rt = { t: 0, d, chatDone: new Set() }; c.stepStart = G.time; this.gps = null;
    if (d.setTod != null) G.tod = d.setTod; if (d.act) d.act(c.rt); h.begin && h.begin(c.rt, d);
  },
  nextStep() { const c = this.cur, d = c.rt && c.rt.d; if (d && d.checkpoint !== false && d.type === 'cutscene') c.cp = c.step + 1; if (d && d.cp) c.cp = c.step + 1; c.step++; this.beginStep(); },
  fail(reason) {
    const c = this.cur; if (!c || c.failing) return; c.failing = true; this.targetBar = null; c.failT = 3.6; this.chatQ = []; $('chat').classList.remove('on'); Snd.sting('fail');
    const el = $('passed'); el.className = 'on fail'; $('passh').textContent = 'MISSION FAILED'; $('passt').textContent = c.m.title; $('passp').style.color = '#ff9a9a'; $('passp').textContent = reason; void el.offsetWidth;
  },
  cleanup() { for (const e of this.tracked) { if (e.vx !== undefined && e.grp) { if (!e.owned) { e.keep = false; e.wreckGone = true; } } else if (e.kind === 'npc') { NPCs.deactivate(e); e.removed = true; e.alive = false; const i = NPCs.list.indexOf(e); if (i >= 0) NPCs.list.splice(i, 1); } else if (e.dispose) e.dispose(); } this.tracked = []; this.refs = {}; for (const id of Object.keys(this.cast_)) this.uncast(id); },
  retry() { const c = this.cur; this.cleanup(); c.failing = false; c.step = c.cp; c.delay = 0.5; c.started = false; $('passed').className = ''; if (P.dead) return; },
  pass() {
    const c = this.cur, m = c.m; this.done[m.id] = true; this.cleanup(); const r = m.reward || {}; if (r.cash) P.addCash(r.cash);
    if (r.car) { const sp = this.pos.pier, car = Vehicles.create(r.car, sp.x - 30, sp.z + 14, Math.PI / 2, { mode: 'abandoned', owned: true }); car.keep = true; car.sleep = true; }
    if (r.weapon) P.giveWeapon(r.weapon, 2); if (r.armor) P.armor = 100; (m.notes || []).forEach(n => this.note(n));
    const el = $('passed'); el.className = 'on'; $('passh').textContent = m.final ? 'THE END?' : (m.side ? 'JOB DONE' : 'MISSION PASSED'); $('passt').textContent = m.title; $('passp').style.color = '#7dff8a'; $('passp').textContent = r.cash ? '+' + money(r.cash) + (r.car ? '   +  a car waiting at the pier' : '') + (r.weapon ? '   +  ' + WEAPONS[r.weapon].name : '') : ''; Snd.sting('pass');
    this.cur = null; this.needLeave = true; this.targetBar = null; G.prompt = null; $('mission').classList.add('off'); SaveSys.save(); if (m.final) this.completed = true;
    const nx = this.missions.filter(x => this.isAvail(x) && x !== m); if (nx.length) setTimeout(() => UI.msg('New job on your map: <b>' + nx[0].title + '</b>', 5000), 5200);
    if (this.chatQ) this.chatQ = [];
  },
  // ---- per-frame
  update(dt) {
    this.markNow = null; this.gps = null;
    if (Cut.on) { Cut.update(dt); Markers.flush(G.time); return; }
    const c = this.cur;
    if (!c) {
      for (const m of this.missions) {
        if (!this.isAvail(m)) continue; const a = m.at(); if (!a) continue; Markers.set('g' + m.id, a.x, a.z, m.side ? '#27e1d0' : '#ff4fa3');
        if (this.needLeave) continue;
        if (!P.dead && !G.modal && dist(P.x, P.z, a.x, a.z) < 4.8 && !Cut.on) { if (G.wanted > 0) { if (!this.warned || G.time - this.warned > 6) { this.warned = G.time; UI.msg('Lose the cops before starting a job.', 2000); } } else this.startMission(m); }
      }
      if (this.needLeave) { const far = this.missions.filter(m => this.isAvail(m) && m.at && m.at()).every(m => dist(P.x, P.z, m.at().x, m.at().z) > 10); if (far) this.needLeave = false; }
      else for (const m of this.missions) if (m.auto && this.isAvail(m) && !P.dead && !G.modal) { if (G.wanted > 0) { if (!this.warned || G.time - this.warned > 8) { this.warned = G.time; UI.msg('Lose the cops — the story continues once you\'re clear.', 2500); } } else { this.startMission(m); break; } }
      $('mission').classList.add('off'); this.chatTick(dt); Markers.flush(G.time); return;
    }
    // active mission
    if (c.delay > 0) { c.delay -= dt; if (c.delay <= 0) { c.started = true; this.beginStep(); } this.chatTick(dt); Markers.flush(G.time); return; }
    if (c.failing) { c.failT -= dt; if (c.failT <= 0 && !P.dead) this.retry(); Markers.flush(G.time); return; }
    if (P.dead) { this.fail('Wasted'); return; }
    const rt = c.rt, d = rt.d, h = H[d.type]; rt.t += dt;
    if (d.limit) { const left = d.limit - rt.t; rt.timeLeft = left; if (left <= 0) { this.fail(d.limitMsg || 'Out of time'); return; } }
    const done = h.tick(rt, d, dt);
    if (d.chatter) for (let i = 0; i < d.chatter.length; i++) { const ch = d.chatter[i]; if (rt.chatDone.has(i)) continue; const ok = ch.t != null ? rt.t >= ch.t : ch.p != null ? (rt.progress || 0) >= ch.p : false; if (ok) { rt.chatDone.add(i); this.say(ch.who, ch.text, ch.dur); ch.fn && ch.fn(rt); } }
    if (this.cur !== c || c.failing) return;
    if (done) { this.nextStep(); }
    // HUD
    const mp = $('mission'); if (this.cur && !Cut.on && c.rt) { mp.classList.remove('off'); $('mtitle').textContent = (c.m.side ? 'JOB · ' : 'MISSION ' + c.m.num + ' · ') + c.m.title; let tx = typeof d.text === 'function' ? d.text(rt) : d.text; $('mobj').textContent = tx || ''; let sub = rt.sub || ''; if (rt.timeLeft != null) sub = '⏱ ' + Math.max(0, Math.ceil(rt.timeLeft)) + 's ' + sub; if (this.targetBar) sub += ' · ' + this.targetBar.name + ' ' + Math.round(this.targetBar.frac * 100) + '%'; $('msub').textContent = sub; }
    if (this.markNow) Markers.set('obj', this.markNow.x, this.markNow.z, this.markNow.color);
    this.chatTick(dt); Markers.flush(G.time);
    // GPS route
    this.routeT -= dt; if (this.gps && this.routeT <= 0) { this.routeT = 1.6; const a = nearestNode(P.x, P.z), b = nearestNode(this.gps.x, this.gps.z), p = a && b ? roadPath(a, b) : null; this.route = p ? [{ x: P.x, z: P.z }, ...p, { x: this.gps.x, z: this.gps.z }] : null; } if (!this.gps) this.route = null;
  },
  chatTick(dt) {
    const el = $('chat'); if (this.chatT > 0) { this.chatT -= dt; if (this.chatT <= 0) el.classList.remove('on'); }
    if (this.chatT <= 0 && this.chatQ.length && !Cut.on) { const q = this.chatQ.shift(), ch = CHARS[q.who] || CHARS.radio; el.classList.add('on'); el.style.setProperty('--c', ch.color); $('cspk').textContent = ch.name; $('ctx').textContent = q.text; drawPortrait($('cport'), q.who, false); this.chatT = q.dur; Snd.tone(ch.pitch, 0.08, 0.08, 'square'); setTimeout(() => Snd.tone(ch.pitch * 1.25, 0.08, 0.06, 'square'), 90); }
  },
  blips() {
    const b = []; if (!this.cur) for (const m of this.missions) { if (!this.isAvail(m)) continue; const a = m.at(); if (a) b.push({ x: a.x, z: a.z, c: m.side ? '#27e1d0' : '#ff4fa3', t: m.side ? 'S' : 'M' }); }
    if (this.markNow) b.push({ x: this.markNow.x, z: this.markNow.z, c: '#ffd23f', t: '!', obj: true }); return b;
  },
  onBusted() { if (this.cur && !this.cur.failing) this.fail('Busted'); },
  // ---- journal
  journal(on) {
    const el = $('journal'); if (on === undefined) on = el.style.display !== 'flex'; if (on && (G.state !== 'play' || Cut.on || Pawn.shop)) return;
    el.style.display = on ? 'flex' : 'none'; G.modal = on; if (on) { Input.unlock(); this.renderJournal(); } else if (G.state === 'play' && !G.paused) Input.lock();
  },
  renderJournal() {
    const L = $('jl'), R = $('jr'); let h = '<h3>THE STORY SO FAR</h3>';
    this.missions.filter(m => !m.side).forEach(m => { const done = this.done[m.id], now = this.cur && this.cur.m === m, ok = done || now || this.isAvail(m); h += `<div class="ch ${done ? 'done' : now ? 'now' : ''}"><b>${m.num}. ${ok ? m.title : '???'} ${done ? '✓' : now ? '— in progress' : ''}</b>${ok ? m.synopsis : 'Locked.'}</div>`; });
    const side = this.missions.filter(m => m.side); if (side.length) { h += '<h3>SIDE JOBS</h3>'; side.forEach(m => { const done = this.done[m.id]; h += `<div class="ch ${done ? 'done' : ''}"><b>${m.title} ${done ? '✓' : ''}</b>${m.synopsis}</div>`; }); }
    L.innerHTML = h; let r = '<h3>INTEL</h3>' + (this.notes.length ? this.notes.map(n => `<div class="note">${n}</div>`).join('') : '<div class="note">Nothing yet.</div>');
    r += '<h3>PEOPLE</h3>'; const seen = new Set(); for (const m of this.missions) if (this.done[m.id] || (this.cur && this.cur.m === m)) for (const k of (m.people || [])) seen.add(k);
    for (const k of seen) r += `<div class="person"><canvas width="48" height="48" data-c="${k}"></canvas><div><b style="color:${CHARS[k].color}">${CHARS[k].name}</b><br>${CHARS[k].bio}</div></div>`;
    R.innerHTML = r; R.querySelectorAll('canvas').forEach(cv => drawPortrait(cv, cv.dataset.c, false));
  },
  serialize() { return { done: this.done, choices: this.choices, notes: this.notes, completed: this.completed }; },
  restore(d) { if (!d) return; this.done = d.done || {}; this.choices = d.choices || {}; this.notes = d.notes || []; this.completed = !!d.completed; },
  reset() { this.done = {}; this.choices = {}; this.notes = []; this.completed = false; this.cur = null; },
};

// ---------- step handlers ----------
function targetCarAI(c, dt, rt, cruise, tgt) {
  const ai = c.ai; if (c.dead || c.wreck) return; const d = tgt ? dist(c.x, c.z, tgt.x, tgt.z) : 999;
  if (!rt.path || rt.pathT <= 0 || rt.wp >= rt.path.length) { const dest = Story.roadPoint(150, 520); rt.path = roadPath(nearestNode(c.x, c.z), dest) || [dest]; rt.wp = 0; rt.pathT = 6; }
  rt.pathT -= dt; const p = rt.path; while (rt.wp < p.length - 1 && dist(c.x, c.z, p[rt.wp].x, p[rt.wp].z) < 14) rt.wp++;
  const w = p[rt.wp], want = Math.atan2(w.x - c.x, w.z - c.z); let steer = clamp(-angDiff(c.h, want) * 2.6, -1, 1), thr = c.fs < cruise ? 1 : 0; if (Math.abs(angDiff(c.h, want)) > 1.1 && c.fs > 10) thr = -0.3;
  if (Math.abs(c.fs) < 1.2) rt.stuck = (rt.stuck || 0) + dt; else rt.stuck = 0; if (rt.stuck > 1.3) { rt.rev = 1.0; rt.stuck = 0; } if (rt.rev > 0) { rt.rev -= dt; thr = -1; steer = -steer; }
  Vehicles.step(c, { thr, steer }, dt);
}
function boatAI(c, dt, rt, cruise) {
  if (c.dead || c.wreck) return; if (!rt.wpt || dist(c.x, c.z, rt.wpt.x, rt.wpt.z) < 25) { for (let i = 0; i < 20; i++) { const z = c.z + rr(-200, 200), x = shoreX(z) + rr(50, 260); if (landSD(x, z) < -25) { rt.wpt = { x, z }; break; } } if (!rt.wpt) rt.wpt = { x: c.x + 50, z: c.z }; }
  const want = Math.atan2(rt.wpt.x - c.x, rt.wpt.z - c.z); Vehicles.step(c, { thr: c.fs < cruise ? 1 : 0, steer: clamp(-angDiff(c.h, want) * 2, -1, 1) }, dt);
}
const H = {
  cutscene: { begin(rt, d) { rt.done = false; Cut.play(d.script(), () => { rt.done = true; }, d.keep); }, tick(rt) { return rt.done; } },
  act: { begin(rt, d) { d.run && d.run(rt); }, tick() { return true; } },
  goto: {
    begin(rt, d) { rt.p = d.pos(); rt.start = dist(P.x, P.z, rt.p.x, rt.p.z); },
    tick(rt, d) {
      const p = rt.p = d.pos(); Story.gps = p; rt.progress = 1 - clamp(dist(P.x, P.z, p.x, p.z) / Math.max(1, rt.start), 0, 1); rt.sub = '';
      if (d.car) { const c = Story.ref(d.car); if (!c || c.wreck) { Story.fail('The vehicle was destroyed'); return false; } if (P.car !== c) { rt.sub = 'Get in the ' + CAR_TYPES[c.type].name; Story.mark(c.x, c.z, '#4aa8ff'); Story.gps = c; return false; } if (d.hp && c.hp < c.maxHp * d.hp) { rt.sub = 'The car is too beat up — find another!'; return false; } }
      if (d.hostage) { const n = Story.ref(d.hostage); if (!n || !n.alive) { Story.fail(n ? n.name + ' is dead' : 'Hostage lost'); return false; } if (P.hostage !== n) { rt.sub = 'Grab ' + n.name + ' again'; Story.mark(n.x, n.z, '#ff4fa3'); Story.gps = n; return false; } }
      if (d.noWanted && G.wanted > 0) { rt.sub = 'Lose the cops first'; Story.gps = null; return false; }
      if (d.veh && !P.inCar) { rt.sub = 'Get in a vehicle'; return false; }
      Story.mark(p.x, p.z, d.color); return dist(P.x, P.z, p.x, p.z) < (d.r || 9);
    },
  },
  wait: {
    begin(rt, d) { rt.base = { rob: G.robLog.length, earned: G.stats.earned, sold: G.stats.carsSold || 0, kills: G.stats.kills, hostages: G.stats.hostages }; d.init && d.init(rt); },
    tick(rt, d, dt) { d.update && d.update(rt, dt); rt.sub = d.sub ? d.sub(rt) : ''; const m = d.mark && d.mark(rt); if (m) { Story.mark(m.x, m.z, d.color || m.color); if (d.gps) Story.gps = m; } return d.cond(rt, dt); },
  },
  kill: {
    begin(rt, d) { rt.list = d.spawn(rt) || []; rt.total = rt.list.length; },
    tick(rt, d) { const alive = rt.list.filter(n => n.alive); rt.sub = `${alive.length} / ${rt.total} left`; if (alive[0]) { let b = alive[0], bd = 1e9; for (const n of alive) { const dd = d2(n.x, n.z, P.x, P.z); if (dd < bd) { bd = dd; b = n; } } Story.mark(b.x, b.z, '#ff3b5c'); if (d.gps && !b.active) Story.gps = b; } return alive.length === 0; },
  },
  survive: {
    begin(rt, d) { rt.list = []; rt.fired = new Set(); },
    tick(rt, d) { d.waves.forEach((w, i) => { if (!rt.fired.has(i) && rt.t >= w.t) { rt.fired.add(i); const g = w.spawn(rt) || []; rt.list.push(...g); if (w.say) Story.say(w.say[0], w.say[1], 3.5); } }); const alive = rt.list.filter(n => n.alive).length; rt.sub = rt.t < d.dur ? `Hold out: ${Math.ceil(d.dur - rt.t)}s · ${alive} hostiles` : `${alive} hostiles left`; rt.progress = rt.t / d.dur; const a = rt.list.find(n => n.alive); if (a) Story.mark(a.x, a.z, '#ff3b5c'); return rt.t >= d.dur && alive === 0 && rt.fired.size === d.waves.length; },
  },
  chase: {
    begin(rt, d) { const c = d.spawn(rt); rt.car = c; Story.refs[d.key || 'target'] = c; rt.armed = false; rt.loot = false; rt.driveRt = {}; },
    tick(rt, d, dt) {
      const c = rt.car; Story.mark(c.x, c.z, '#ff3b5c'); const dd = dist(c.x, c.z, P.x, P.z); Story.targetBar = { name: d.name || 'Target', frac: clamp(c.hp / c.maxHp, 0, 1) }; rt.sub = dd > 60 ? 'Get closer!' : 'Wreck it!';
      if (!rt.armed && dd < (d.wake || 45)) { rt.armed = true; if (d.say) Story.say(d.say[0], d.say[1], 3.5); }
      if (c.wreck || c.dead) { Story.targetBar = null; if (d.onDown) d.onDown(c); return true; }
      if (CAR_TYPES[c.type].water) boatAI(c, dt, rt.driveRt, rt.armed ? (d.cruise || 26) : 6); else targetCarAI(c, dt, rt.driveRt, rt.armed ? (d.cruise || 22) : (d.idle || 0), P);
      if (rt.armed && dd > (d.lose || 260)) { Story.fail(d.loseMsg || 'You lost the target'); Story.targetBar = null; }
      if (G.wanted > 0 && false) return false; return false;
    },
  },
  escape: { begin(rt, d) { if (d.wanted) Crime.force(d.wanted, d.label || 'Wanted'); }, tick(rt) { rt.sub = G.wanted > 0 ? (G.copsNearby ? 'Break line of sight!' : 'Stay hidden...') : ''; return G.wanted === 0; } },
};
G.robLog = [];
