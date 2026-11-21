'use strict';
// ===== Vehicles: models, arcade physics, traffic AI, parking, damage =====
const CAR_TYPES = {
  compact: { name: 'Coquina Compact', len: 3.8, w: 1.7, bh: .55, ch: .5, maxSpeed: 30, accel: 13, grip: 5, hp: 220, price: 1400, sell: 450, cols: [0xf2f2f2, 0x3a78b8, 0xb83a3a, 0x4a8a5a, 0xe0b030, 0x8a8f95, 0x1a1a1a] },
  sedan: { name: 'Palmetto Sedan', len: 4.5, w: 1.85, bh: .6, ch: .5, maxSpeed: 36, accel: 15, grip: 5, hp: 260, price: 2600, sell: 800, cols: [0xf2f2f2, 0x2a3b5a, 0x8a8f95, 0x9a2a2a, 0x1a1a1a, 0xc7b99a] },
  suv: { name: 'Everglade SUV', len: 4.9, w: 2.0, bh: .8, ch: .6, maxSpeed: 38, accel: 14, grip: 4.6, hp: 340, price: 6800, sell: 2300, cols: [0x1a1a1a, 0xf2f2f2, 0x4a5a3a, 0x7a7f85, 0x6b2a2a] },
  pickup: { name: 'Cracker Pickup', len: 5.2, w: 2.0, bh: .75, ch: .55, maxSpeed: 37, accel: 14, grip: 4.6, hp: 330, price: 5200, sell: 1700, cols: [0xd8d8d8, 0xb83a2a, 0x2a4a7a, 0x3a3a3a, 0xe0b030] },
  van: { name: 'Sunbelt Van', len: 5.2, w: 2.0, bh: 1.2, ch: .7, maxSpeed: 32, accel: 11, grip: 4.2, hp: 320, price: 3300, sell: 1000, cols: [0xffffff, 0xdadada, 0x4a6a9a, 0xb8b8b8] },
  sports: { name: 'Biscayne GT', len: 4.4, w: 1.95, bh: .45, ch: .38, maxSpeed: 56, accel: 28, grip: 6.4, hp: 240, price: 17500, sell: 6200, cols: [0xff2a4a, 0xffd23f, 0x27e1d0, 0xff7a1a, 0x7a6bff, 0xf2f2f2, 0x111111] },
  muscle: { name: 'Gator Muscle', len: 4.8, w: 1.95, bh: .52, ch: .42, maxSpeed: 52, accel: 25, grip: 5.4, hp: 290, price: 11800, sell: 4000, cols: [0x1a1a1a, 0xd02a2a, 0x2a5ad0, 0xf0c020, 0x2a9a4a] },
  taxi: { name: 'Sunshine Taxi', len: 4.5, w: 1.85, bh: .6, ch: .5, maxSpeed: 34, accel: 14, grip: 5, hp: 260, price: 0, sell: 600, cols: [0xffd21f] },
  cop: { name: 'Florida Highway Patrol', len: 4.7, w: 1.9, bh: .6, ch: .5, maxSpeed: 50, accel: 24, grip: 5.8, hp: 300, price: 0, sell: 1500, cols: [0x15171c] },
  bike: { name: 'Conch Cruiser Bike', len: 2.1, w: 0.8, bh: .4, ch: .3, maxSpeed: 46, accel: 26, grip: 7, hp: 120, price: 3200, sell: 1100, cols: [0xd02a2a, 0x1a1a1a, 0x2a6ad0, 0xffd23f, 0xf2f2f2] },
  speedboat: { name: 'Barracuda Speedboat', len: 6.5, w: 2.4, bh: .6, ch: .5, maxSpeed: 34, accel: 14, grip: 1.2, hp: 260, water: true, price: 0, sell: 3500, cols: [0xffffff, 0xff2a4a, 0x2a6ad0, 0xffd23f] },
  jetski: { name: 'Wave Runner Jet Ski', len: 2.8, w: 1.1, bh: .4, ch: .3, maxSpeed: 30, accel: 20, grip: 1.6, hp: 140, water: true, price: 0, sell: 1800, cols: [0xff2a4a, 0x27e1d0, 0xffd23f, 0x7a6bff] },
  swat: { name: 'SWAT Armored Truck', len: 5.6, w: 2.2, bh: 1.1, ch: .8, maxSpeed: 42, accel: 16, grip: 4.8, hp: 700, price: 0, sell: 5000, cols: [0x1c1f26] },
};
const BUYABLE = ['bike', 'compact', 'sedan', 'pickup', 'van', 'suv', 'muscle', 'sports'];
const geoCache = new Map();
const carMat = new T.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.35, clearcoat: 1.0, clearcoatRoughness: 0.05, envMapIntensity: 0.75 });
// derive material response from the baked vertex colour: very dark = rubber/plastic (rough, non-metal), light unsaturated mid-bright = chrome, everything else = clear-coated metallic paint
carMat.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
  { float lc = dot(vColor.rgb, vec3(.299, .587, .114)), sc = max(vColor.r, max(vColor.g, vColor.b)) - min(vColor.r, min(vColor.g, vColor.b));
    float pm = smoothstep(.02, .17, lc); roughnessFactor = mix(.82, roughnessFactor, pm); metalnessFactor = mix(0., metalnessFactor, pm);
    float ch = smoothstep(.62, .72, lc) * (1. - smoothstep(.87, .91, lc)) * (1. - smoothstep(.04, .1, sc)); roughnessFactor = mix(roughnessFactor, .1, ch); metalnessFactor = mix(metalnessFactor, 1., ch); }`); };
const carGlassMat = new T.MeshPhongMaterial({ vertexColors: true, transparent: true, opacity: 0.38, shininess: 140, specular: 0xffffff, depthWrite: false });
const carGlowMat = new T.MeshBasicMaterial({ vertexColors: true });

function carGeos(type, color, wreck) {
  const key = type + '|' + color + (wreck ? 'W' : ''); let c = geoCache.get(key); if (c) return c;
  const t = CAR_TYPES[type], b = new GB(), g = new GB(), gl = new GB(), hw = t.w / 2, hl = t.len / 2, y0 = 0.32, glass = 0x1c2a3a, dark = 0x15151a;
  const bodyCol = wreck ? 0x1a1a1a : color;
  if (type === 'bike') {
    b.box(-.12, 0, hl * .62 - .35, .12, .7, hl * .62 + .35, dark); b.box(-.12, 0, -hl * .62 - .35, .12, .7, -hl * .62 + .35, dark);
    b.box(-.2, .45, -hl * .6, .2, .85, hl * .45, bodyCol); b.box(-.18, .85, -hl * .45, .18, 1.0, hl * .05, 0x222222); b.box(-.5, 1.0, hl * .3, .5, 1.08, hl * .36, 0x333333); b.box(-.08, .7, hl * .45, .08, 1.05, hl * .5, 0x888888);
    g.box(-.1, .8, hl * .5, .1, .95, hl * .52, wreck ? 0x111111 : 0xfff4c0); g.box(-.1, .7, -hl * .62, .1, .8, -hl * .6, wreck ? 0x111111 : 0xd01818);
    c = { body: b.build(carMat, true).geometry, glow: g.build(carGlowMat, false).geometry, glass: gl.p.length ? gl.build(carGlassMat, false).geometry : null }; geoCache.set(key, c); return c;
  }
  if (t.water) {
    b.box(-hw, .1, -hl, hw, .1 + t.bh, hl * .45, bodyCol); b.box(-hw * .7, .1, hl * .45, hw * .7, .1 + t.bh, hl * .8, bodyCol); b.box(-hw * .3, .1, hl * .8, hw * .3, .1 + t.bh * .9, hl, bodyCol);
    b.box(-hw, .1 + t.bh, -hl, hw, .15 + t.bh, hl * .45, 0xf4f4f4);
    if (type === 'speedboat') { b.box(-hw * .8, .15 + t.bh, -hl * .1, hw * .8, .15 + t.bh + t.ch, hl * .1, 0x1c2a3a); b.box(-.3, 0, -hl - .4, .3, .9, -hl, 0x222222); } else { b.box(-.3, .5, -hl * .1, .3, .9, hl * .1, 0x222222); b.box(-.4, .5, hl * .15, .4, .56, hl * .2, 0x333333); }
    g.box(-.15, .1 + t.bh * .7, hl * .8, .15, .1 + t.bh, hl * .83, wreck ? 0x111111 : 0xfff4c0);
    c = { body: b.build(carMat, true).geometry, glow: g.build(carGlowMat, false).geometry, glass: gl.p.length ? gl.build(carGlassMat, false).geometry : null }; geoCache.set(key, c); return c;
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.wheel(sx * (hw - 0.17), 0.33, sz * hl * 0.62, 0.33, 0.26, 0x151518, 0xb8bcc2);
  if (type === 'van' || type === 'swat') {
    b.box(-hw, y0, -hl, hw, y0 + t.bh, hl * 0.35, bodyCol); b.box(-hw, y0, hl * 0.35, hw, y0 + t.bh * 0.7, hl, bodyCol);
    gl.box(-hw + .05, y0 + t.bh * .55, hl * .32, hw - .05, y0 + t.bh + t.ch * .45, hl * .62, glass);
    b.box(-hw, y0 + t.bh, -hl, hw, y0 + t.bh + .1, hl * .35, bodyCol);
  } else if (type === 'pickup') {
    b.box(-hw, y0, -hl, hw, y0 + t.bh * .55, -hl * .1, bodyCol); b.box(-hw, y0 + t.bh * .55, -hl, -hw + .12, y0 + t.bh * .85, -hl * .1, bodyCol); b.box(hw - .12, y0 + t.bh * .55, -hl, hw, y0 + t.bh * .85, -hl * .1, bodyCol);
    b.box(-hw, y0, -hl * .1, hw, y0 + t.bh, hl, bodyCol); gl.box(-hw + .05, y0 + t.bh, -hl * .1, hw - .05, y0 + t.bh + t.ch, hl * .5, glass); b.box(-hw + .1, y0 + t.bh + t.ch, -hl * .08, hw - .1, y0 + t.bh + t.ch + .08, hl * .48, bodyCol);
  } else {
    b.box(-hw, y0, -hl, hw, y0 + t.bh, hl * .25, bodyCol); b.box(-hw, y0, hl * .25, hw, y0 + t.bh * .72, hl, bodyCol);
    gl.box(-hw + .07, y0 + t.bh, -hl * .62, hw - .07, y0 + t.bh + t.ch, hl * .18, glass);
    b.box(-hw + .14, y0 + t.bh + t.ch, -hl * .56, hw - .14, y0 + t.bh + t.ch + .08, hl * .12, bodyCol);
  }
  if (!wreck) { // bumpers, grille, mirrors, door seams, plates, exhaust
    b.box(-hw + .02, y0 - .02, hl - .04, hw - .02, y0 + .28, hl + .1, 0x2a2a2e); b.box(-hw + .02, y0 - .02, -hl - .1, hw - .02, y0 + .28, -hl + .04, 0x2a2a2e);
    b.box(-hw * .45, y0 + .08, hl + .01, hw * .45, y0 + .3, hl + .12, 0x0e0e10); b.box(-.28, y0 + .06, hl + .1, .28, y0 + .2, hl + .13, 0xf4f4f0); b.box(-.28, y0 + .06, -hl - .13, .28, y0 + .2, -hl - .1, 0xf4f4f0);
    b.box(-hw - .1, y0 + t.bh + .05, hl * .12, -hw, y0 + t.bh + .22, hl * .12 + .22, 0x1a1a1e); b.box(hw, y0 + t.bh + .05, hl * .12, hw + .1, y0 + t.bh + .22, hl * .12 + .22, 0x1a1a1e);
    for (const sx of [-1, 1]) { b.box(sx * hw - .01, y0 + .12, -hl * .2, sx * hw + .01, y0 + t.bh, -hl * .2 + .03, 0x15151a); b.box(sx * hw - .01, y0 + .12, hl * .08, sx * hw + .01, y0 + t.bh, hl * .08 + .03, 0x15151a); }
    b.box(-hw + .25, y0 + .05, -hl - .2, -hw + .45, y0 + .14, -hl - .05, 0x555a60);
  }
  if (!wreck && type !== 'van' && type !== 'swat') { // visible interior: seats, wheel, dash
    for (const sx of [-1, 1]) { b.box(sx * hw * .45 - .27, y0 + .12, -hl * .3, sx * hw * .45 + .27, y0 + .42, -hl * .12, 0x24242a); b.box(sx * hw * .45 - .27, y0 + .12, -hl * .36, sx * hw * .45 + .27, y0 + t.bh + .28, -hl * .3, 0x24242a); }
    b.box(hw * .45 - .2, y0 + t.bh * .78, hl * .02, hw * .45 + .2, y0 + t.bh * .78 + .05, hl * .1, 0x101012); b.box(-hw + .1, y0 + t.bh * .6, hl * .1, hw - .1, y0 + t.bh * .92, hl * .2, 0x1a1a1e);
  }
  const hy = y0 + t.bh * .45;
  g.box(-hw + .1, hy, hl - .02, -hw + .55, hy + .2, hl + .02, wreck ? 0x111111 : 0xfff4c0); g.box(hw - .55, hy, hl - .02, hw - .1, hy + .2, hl + .02, wreck ? 0x111111 : 0xfff4c0);
  g.box(-hw + .1, hy, -hl - .02, -hw + .5, hy + .18, -hl + .02, wreck ? 0x111111 : 0xd01818); g.box(hw - .5, hy, -hl - .02, hw - .1, hy + .18, -hl + .02, wreck ? 0x111111 : 0xd01818);
  if (type === 'cop') { b.box(-hw - .01, y0 + .1, -hl * .55, -hw + .02, y0 + t.bh - .05, hl * .1, 0xf2f2f2); b.box(hw - .02, y0 + .1, -hl * .55, hw + .01, y0 + t.bh - .05, hl * .1, 0xf2f2f2); b.box(-hw + .2, y0 + t.bh + t.ch, -hl * .2, hw - .2, y0 + t.bh + t.ch + .16, -hl * .05, 0x222222); }
  if (type === 'taxi') g.box(-.35, y0 + t.bh + t.ch + .08, -.2, .35, y0 + t.bh + t.ch + .32, .2, 0xfff0a0);
  if (type === 'swat') b.box(-hw + .2, y0 + t.bh + t.ch * .9, -hl * .9, hw - .2, y0 + t.bh + t.ch * .9 + .25, -hl * .1, 0x222);
  c = { body: b.build(carMat, true).geometry, glow: g.build(carGlowMat, false).geometry, glass: gl.p.length ? gl.build(carGlassMat, false).geometry : null }; geoCache.set(key, c); return c;
}

const Vehicles = {
  spawnT: 0, nodeList: null,
  create(type, x, z, h, opts = {}) {
    const t = CAR_TYPES[type], color = opts.color != null ? opts.color : pick(t.cols), geos = carGeos(type, color);
    const grp = new T.Group(), bodyMat = carMat.clone(), body = new T.Mesh(geos.body, bodyMat), glow = new T.Mesh(geos.glow || emptyGeo, carGlowMat); body.castShadow = true; body.receiveShadow = true;
    bodyMat.onBeforeCompile = carMat.onBeforeCompile; bodyMat.customProgramCacheKey = carMat.customProgramCacheKey; { const j = () => 0.92 + Math.random() * 0.15; bodyMat.color.setRGB(j(), j(), j()); bodyMat.roughness = 0.26 + Math.random() * 0.22; bodyMat.clearcoat = 0.55 + Math.random() * 0.45; bodyMat.envMapIntensity = 0.65 + Math.random() * 0.2; } // every car gets its own tint and gloss
    grp.add(body); grp.add(glow); glow.geometry = geos.glow || emptyGeo; let gmesh = null; if (geos.glass) { gmesh = new T.Mesh(geos.glass, carGlassMat); gmesh.renderOrder = 4; grp.add(gmesh); }
    const c = { type, color, x, z, y: 0.06, h, vx: 0, vz: 0, fs: 0, hp: t.hp, maxHp: t.hp, driver: null, ai: { mode: opts.mode || 'parked' }, grp, body, glow, glassMesh: gmesh, owned: !!opts.owned, sleep: opts.mode === 'parked' || !opts.mode, dead: false, burnT: 0, wreck: false, steer: 0, sirenOn: false, spot: null, age: 0, stolen: false, lightsOn: false, brake: 0, alarm: 0 };
    if (type === 'cop' || type === 'swat') {
      const mk = col => new T.Mesh(new T.BoxGeometry(.42, .16, .26), new T.MeshBasicMaterial({ color: col })); c.lightL = mk(0xff2020); c.lightR = mk(0x2060ff);
      const yy = (ARCH[type] || ARCH.sedan).roof + .1; c.lightL.position.set(-.45, yy, -t.len * .1); c.lightR.position.set(.45, yy, -t.len * .1); grp.add(c.lightL); grp.add(c.lightR);
    }
    if (!t.water) { const bl = new T.Mesh(blobGeoFor(t), blobMatC); bl.position.set(0, 0.075, 0); bl.renderOrder = 1; grp.add(bl); }
    if (geos.tail) { c.tailMat = new T.MeshBasicMaterial({ vertexColors: true }); c.tailMesh = new T.Mesh(geos.tail, c.tailMat); grp.add(c.tailMesh); }
    if (geos.wheel) c.wheels = geos.wpos.map(([wx, wz, front]) => { const wg = new T.Group(); wg.position.set(wx, geos.wr, wz); const wm = new T.Mesh(geos.wheel, carMat); wm.castShadow = true; wg.add(wm); grp.add(wg); return { wg, wm, front, r: geos.wr }; });
    if (!t.water && type !== 'bike') { const beam = new T.Mesh(Weather.beamGeo, Weather.beamMat); beam.position.set(0, 0.1, t.len / 2 + 5.8); beam.renderOrder = 3; grp.add(beam); c.beam = beam; }
    grp.position.set(x, c.y, z); grp.rotation.y = h; World.scene.add(grp); G.cars.push(c); this.sync(c); return c;
  },
  remove(c) {
    const i = G.cars.indexOf(c); if (i >= 0) G.cars.splice(i, 1); World.scene.remove(c.grp); if (c.body && c.body.material && c.body.material !== carMat) c.body.material.dispose(); if (c.spot) c.spot.car = null;
  },
  skid(c, dt) {
    const t = CAR_TYPES[c.type]; if (t.water || c.wreck || c.dead && false) return; const co = Math.cos(c.h), si = Math.sin(c.h), lat = Math.abs(c.vx * co - c.vz * si), sp = Math.hypot(c.vx, c.vz);
    const slide = (lat > 3.4 && sp > 6) || (c.brake && sp > 15 && c.fs > 10); if (!slide) { c.lastSk = null; return; }
    const W = t.w / 2 * 0.86, zb = -t.len * 0.3, pts = [-1, 1].map(sx => [c.x + sx * W * co + zb * si, c.z - sx * W * si + zb * co]);
    if (c.lastSk) { for (let k = 0; k < 2; k++) Skids.add(c.lastSk[k][0], c.lastSk[k][1], pts[k][0], pts[k][1]); } c.lastSk = pts;
    c.smokeT = (c.smokeT || 0) - dt; if (c.smokeT <= 0) { c.smokeT = 0.06; for (const p of pts) FX.emit(p[0], 0.2, p[1], rr(-0.6, 0.6), rr(0.4, 1.2), rr(-0.6, 0.6), rr(0.7, 1.3), 0.8, 0.82, 0.82, 0.84, 0, 3); }
  },
  animate(c, rz, dt) {
    const acc = (c.fs - (c.pfs || 0)) / Math.max(dt, 0.001); c.pfs = c.fs; c.accS = lerp(c.accS || 0, clamp(acc, -30, 30), 0.12); const rx = c.type === 'bike' ? 0 : clamp(-c.accS * 0.0028, -0.045, 0.05);
    for (const m of [c.body, c.glow, c.glassMesh, c.tailMesh]) if (m) { m.rotation.x = rx; m.rotation.z = rz; }
    if (c.wheels) for (const w of c.wheels) { w.wm.rotation.x += c.fs * dt / w.r; if (w.front) w.wg.rotation.y = -c.steer * 0.5; }
    if (c.tailMat) { const on = c.brake || c.fs < -0.5, lo = Weather.lampOn || 0; if (on) c.tailMat.color.setRGB(2.6, 0.45, 0.45); else c.tailMat.color.setRGB(0.5 + lo * 0.9, 0.12 + lo * 0.12, 0.12 + lo * 0.12); }
  },
  sync(c) { const w = CAR_TYPES[c.type].water; c.grp.position.set(c.x, w ? -0.28 + Math.sin(G.time * 2.2 + c.x * 0.13) * 0.07 : c.y, c.z); c.grp.rotation.y = c.h; },
  stepBoat(c, inp, dt, t) {
    const fx = Math.sin(c.h), fz = Math.cos(c.h); let fs = c.vx * fx + c.vz * fz, lx = c.vx - fx * fs, lz = c.vz - fz * fs; const thr = c.dead ? 0 : (inp.thr || 0);
    if (thr > 0) fs += t.accel * thr * dt * Math.max(0.05, 1 - fs / t.maxSpeed); else if (thr < 0) fs += t.accel * 0.8 * thr * dt * (fs > 0 ? 1.6 : Math.max(0.05, 1 - -fs / (t.maxSpeed * 0.3)));
    fs -= fs * 0.35 * dt; const k = Math.min(1, t.grip * dt); lx -= lx * k; lz -= lz * k; c.steer = lerp(c.steer, inp.steer || 0, Math.min(1, 6 * dt));
    const sf = clamp(fs / 5, -1, 1); c.h -= c.steer * 1.1 * sf * dt; const nfx = Math.sin(c.h), nfz = Math.cos(c.h); c.vx = nfx * fs + lx; c.vz = nfz * fs + lz; c.fs = fs; c.brake = 0;
    const nx = c.x + c.vx * dt, nz = c.z + c.vz * dt; if (landSD(nx, nz) < -2.5) { c.x = nx; c.z = nz; } else { if (Math.hypot(c.vx, c.vz) > 6) { Snd.thud(0.5); this.damage(c, 8, null); } c.vx *= -0.3; c.vz *= -0.3; }
    this.collide(c, dt);
  },
  step(c, inp, dt) {
    const t = CAR_TYPES[c.type]; if (t.water) return this.stepBoat(c, inp, dt, t);
    const fx = Math.sin(c.h), fz = Math.cos(c.h);
    let fs = c.vx * fx + c.vz * fz, lx = c.vx - fx * fs, lz = c.vz - fz * fs;
    const thr = c.dead ? 0 : (inp.thr || 0), accel = t.accel * (c.hp < t.hp * 0.25 ? 0.6 : 1);
    if (thr > 0) fs += accel * thr * dt * Math.max(0.05, 1 - Math.max(0, fs) / t.maxSpeed);
    else if (thr < 0) { if (fs > 0.6) fs -= accel * 1.9 * -thr * dt; else fs += accel * 0.6 * thr * dt * Math.max(0.05, 1 - Math.max(0, -fs) / (t.maxSpeed * 0.35)); }
    c.brake = (thr < 0 && fs > 0.6) || inp.hand ? 1 : 0;
    fs -= fs * (thr === 0 ? 0.45 : 0.15) * dt; if (thr === 0 && Math.abs(fs) < 0.15) fs = 0;
    if (inp.hand) fs *= Math.max(0, 1 - 1.6 * dt);
    const grip = (inp.hand ? 1.3 : t.grip) * (1 - 0.32 * Weather.wet - 0.05 * Weather.s.storm); const k = Math.min(1, grip * dt); lx -= lx * k; lz -= lz * k;
    const steerMax = 0.62 / (1 + Math.abs(fs) / 16); c.steer = lerp(c.steer, (inp.steer || 0), Math.min(1, 9 * dt));
    const rate = (fs / (t.len * 0.55)) * Math.tan(c.steer * steerMax) * (inp.hand ? 1.5 : 1);
    c.h -= rate * dt; const nfx = Math.sin(c.h), nfz = Math.cos(c.h);
    c.vx = nfx * fs + lx; c.vz = nfz * fs + lz; c.fs = fs;
    c.x += c.vx * dt; c.z += c.vz * dt;
    this.collide(c, dt);
    // water barrier
    if (!walkable(c.x, c.z)) { c.x -= c.vx * dt; c.z -= c.vz * dt; c.vx *= -0.3; c.vz *= -0.3; }
  },
  collide(c, dt) {
    const t = CAR_TYPES[c.type], fx = Math.sin(c.h), fz = Math.cos(c.h); let px = 0, pz = 0, nx = 0, nz = 0, hit = false;
    for (const o of [0, t.len * 0.32, -t.len * 0.32]) {
      const p = { x: c.x + fx * o, z: c.z + fz * o }, sx = p.x, sz = p.z; const r = resolveCircle(p, t.w * 0.52, 0.2);
      if (r.hit) { px += p.x - sx; pz += p.z - sz; nx += r.nx; nz += r.nz; hit = true; }
    }
    if (hit) {
      c.x += px / 2; c.z += pz / 2; const l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l; const vn = c.vx * nx + c.vz * nz;
      if (vn < 0) { const imp = -vn; c.vx -= nx * vn * 1.3; c.vz -= nz * vn * 1.3; if (imp > 3.5) { this.damage(c, (imp - 3) * 7, null); Snd.thud(Math.min(1, imp / 15)); fxSpark(c.x + nx * -1, 0.8, c.z + nz * -1, 5); if (imp > 9) G.shake = Math.max(G.shake, Math.min(0.6, imp / 30)); } }
      c.sleep = false;
    }
    for (const o of G.cars) {
      if (o === c || o.wreckGone) continue; const dx = o.x - c.x, dz = o.z - c.z, dd = dx * dx + dz * dz; if (dd > 36) continue;
      const to = CAR_TYPES[o.type], r = (t.w + to.w) * 0.5 * 0.95;
      for (const a of [t.len * 0.25, -t.len * 0.25]) for (const b of [to.len * 0.25, -to.len * 0.25]) {
        const ax = c.x + fx * a, az = c.z + fz * a, bx = o.x + Math.sin(o.h) * b, bz = o.z + Math.cos(o.h) * b, ex = bx - ax, ez = bz - az, ed = Math.hypot(ex, ez);
        if (ed < r && ed > 0.001) {
          const pen = r - ed, nx2 = ex / ed, nz2 = ez / ed, mo = o.sleep ? 0.9 : 0.5;
          o.x += nx2 * pen * mo; o.z += nz2 * pen * mo; c.x -= nx2 * pen * (1 - mo); c.z -= nz2 * pen * (1 - mo);
          const rv = (c.vx - o.vx) * nx2 + (c.vz - o.vz) * nz2;
          if (rv > 0) { const j = rv * (1 + 0.25) * 0.5; c.vx -= nx2 * j; c.vz -= nz2 * j; o.vx += nx2 * j; o.vz += nz2 * j; o.sleep = false; if (rv > 3) { this.damage(c, rv * 4, c.driver === 'player' ? 'player' : null); this.damage(o, rv * 4, c.driver === 'player' ? 'player' : null); Snd.thud(Math.min(1, rv / 14)); fxSpark(ax, 0.8, az, 4); if (o.ai.mode === 'traffic') o.ai.panic = 6; } }
        }
      }
    }
  },
  damage(c, d, src) {
    if (c.dead) return; if (c.driver === 'player') { P.hurt(d * 0.12, 'crash'); }
    c.hp -= d; c.lastSrc = src;
    if (c.hp <= 0) { c.dead = true; c.burnT = 2.8 + Math.random() * 1.2; if (c.driver === 'player') { P.hurt(15, 'fire'); } }
  },
  explode(c) {
    fxExplosion(c.x, 0.8, c.z); c.wreck = true; c.dead = true; c.hp = 0; c.driver && c.driver !== 'player' && (c.driver = null);
    const wg = carGeos(c.type, 0x1a1a1a, true); c.body.geometry = wg.body; c.glow.geometry = wg.glow || emptyGeo; if (c.tailMesh) c.tailMesh.geometry = wg.tail || emptyGeo; if (c.glassMesh) c.glassMesh.visible = false; c.dAct = null; c.ai.mode = 'wreck'; c.wreckT = 45; c.sleep = false; c.vx += rr(-3, 3); c.vz += rr(-3, 3);
    for (const a of G.actives) { const d = dist(a.x, a.z, c.x, c.z); if (d < 11 && a.alive) { const dm = 140 * (1 - d / 11); Combat.hurt(a, dm, c.lastSrc === 'player' ? 'player' : null, 'body', 'explosion'); a.fear = 10; a.threat = { x: c.x, z: c.z }; } }
    if (d2(P.x, P.z, c.x, c.z) < 121 && !P.inCar) P.hurt(70 * (1 - dist(P.x, P.z, c.x, c.z) / 11), 'explosion');
    for (const o of G.cars) if (o !== c) { const d = dist(o.x, o.z, c.x, c.z); if (d < 9) { o.vx += (o.x - c.x) / d * 7; o.vz += (o.z - c.z) / d * 7; o.sleep = false; this.damage(o, 120 * (1 - d / 9), c.lastSrc); } }
    if (c.lastSrc === 'player') { Crime.raise(2, c.x, c.z, 'Explosion'); }
    if (P.car === c) P.ejectFromCar(true);
  },
  nearest(x, z, r) { let best = null, bd = r * r; for (const c of G.cars) { if (c.wreck) continue; const d = Math.sqrt(d2(x, z, c.x, c.z)) - CAR_TYPES[c.type].len * 0.25; if (d * d < bd && d < r) { bd = Math.max(0, d) ** 2; best = c; } } return best; },
  // ---- AI
  aiStep(c, dt) {
    const ai = c.ai, t = CAR_TYPES[c.type];
    if (ai.mode === 'traffic') {
      if (!ai.to) { c.ai.mode = 'parked'; return; }
      const dx = ai.to.x - ai.from.x, dz = ai.to.z - ai.from.z, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L, ox = -uz * 3.6, oz = ux * 3.6;
      const rem = (ai.to.x + ox - c.x) * ux + (ai.to.z + oz - c.z) * uz;
      if (rem < 9) { const opts = ai.to.links.filter(n => n !== ai.from); const nxt = opts.length ? (chance(0.5) && opts.find(n => Math.abs((n.x - ai.to.x) * ux + (n.z - ai.to.z) * uz) > 10) || pick(opts)) : ai.from; ai.from = ai.to; ai.to = nxt; return; }
      const s = (c.x - (ai.from.x + ox)) * ux + (c.z - (ai.from.z + oz)) * uz, look = Math.min(L, Math.max(s, 0) + 9);
      const tx = ai.from.x + ox + ux * look, tz = ai.from.z + oz + uz * look, want = Math.atan2(tx - c.x, tz - c.z);
      const steer = clamp(-angDiff(c.h, want) * 2.2, -1, 1);
      let cruise = (ai.cruise || 12) * (ai.panic > 0 ? 1.6 : 1); if (rem < 20 && Math.abs(steer) > 0.25) cruise = Math.min(cruise, 6);
      // obstacle ahead
      let blocked = 1e9; const fx = Math.sin(c.h), fz = Math.cos(c.h);
      for (const o of G.cars) { if (o === c) continue; const ex = o.x - c.x, ez = o.z - c.z, f = ex * fx + ez * fz; if (f > 0 && f < 16) { const lat = Math.abs(ex * fz - ez * fx); if (lat < 2.3) blocked = Math.min(blocked, f); } }
      for (const a of G.actives) { const ex = a.x - c.x, ez = a.z - c.z, f = ex * fx + ez * fz; if (f > 0 && f < 14 && a.alive) { const lat = Math.abs(ex * fz - ez * fx); if (lat < 2) blocked = Math.min(blocked, f); } }
      if (!P.inCar) { const ex = P.x - c.x, ez = P.z - c.z, f = ex * fx + ez * fz; if (f > 0 && f < 14 && Math.abs(ex * fz - ez * fx) < 2) blocked = Math.min(blocked, f); }
      let thr = c.fs < cruise ? 0.6 : (c.fs > cruise + 3 ? -0.3 : 0); if (blocked < 14) { thr = blocked < 6 ? -1 : (c.fs > 4 ? -0.5 : 0); if (blocked < 3.5 && c.fs < 2) thr = 0; }
      if (ai.to.links.length >= 3 && rem > 9 && !(ai.panic > 0)) { const axis = Math.abs(ux) > Math.abs(uz) ? 'ew' : 'ns', st = Signals.state(ai.to, axis), stopD = c.fs * c.fs / 14 + 5; if ((st === 'red' || (st === 'yellow' && rem > 9 + stopD)) && rem < 9 + stopD + 10) thr = c.fs > 0.8 ? -0.75 : -0.2; }
      if (ai.panic > 0) ai.panic -= dt;
      if (blocked < 7 && c.fs < 0.5) { ai.stuckT = (ai.stuckT || 0) + dt; if (ai.stuckT > 4 && !c.honked) { c.honked = true; Snd.horn(Math.max(0, 1 - dist(c.x, c.z, P.x, P.z) / 80)); } } else { ai.stuckT = 0; c.honked = false; }
      if (ai.stuckT > 9) { ai.stuckT = 0; thr = 0.6; }
      this.step(c, { thr, steer }, dt);
    } else if (ai.mode === 'parked' || ai.mode === 'abandoned') {
      if (c.sleep && Math.abs(c.vx) + Math.abs(c.vz) < 0.05) return;
      this.step(c, { thr: 0, hand: true }, dt); if (Math.abs(c.vx) + Math.abs(c.vz) < 0.05) c.sleep = true;
    } else if (ai.mode === 'wreck') {
      this.step(c, { thr: 0, hand: true }, dt); c.wreckT -= dt; if (c.wreckT <= 0) { c.wreckGone = true; }
    }
  },
  update(dt) {
    carGlowMat.color.setScalar(1.0 + (Weather.lampOn || 0) * 1.8);
    for (let i = G.cars.length - 1; i >= 0; i--) {
      const c = G.cars[i]; c.age += dt;
      if (c.wreckGone) { this.remove(c); continue; }
      if (c.driver !== 'player' && c.ai.mode !== 'police') this.aiStep(c, dt);
      if (c.dead && !c.wreck) { c.burnT -= dt; if (Math.random() < 0.9) fxFire(c.x, 1, c.z); fxSmoke(c.x, 1.2, c.z, 0.1); if (c.burnT <= 0) this.explode(c); }
      else if (c.hp < c.maxHp * 0.3 && !c.wreck && Math.random() < 0.3) fxSmoke(c.x + Math.sin(c.h) * 1.5, 1.1, c.z + Math.cos(c.h) * 1.5, 0.4);
      if (c.wreck && Math.random() < 0.2) fxSmoke(c.x, 1, c.z, 0.12);
      // hit people
      const sp = Math.hypot(c.vx, c.vz);
      if (sp > 3 && !c.wreck) this.runOver(c, sp);
      if (c.beam) c.beam.visible = Weather.lampOn > 0.2 && !c.wreck && !c.dead;
      // lights
      if (c.lightL) { const ph = Math.floor(G.time * 6) % 2; const on = c.sirenOn; c.lightL.material.color.setHex(on && ph ? 0xff2020 : 0x330808); c.lightR.material.color.setHex(on && !ph ? 0x3070ff : 0x081433); }
      this.sync(c);
      // body roll
      const rz0 = c.type === 'bike' ? clamp(c.steer * Math.min(1, Math.abs(c.fs) / 8) * -0.6, -0.6, 0.6) : clamp(-(c.vx * Math.cos(c.h) - c.vz * Math.sin(c.h)) * 0.012, -0.08, 0.08) * (sp > 3 ? 1 : 0); this.animate(c, rz0, dt); this.skid(c, dt);
      if (CAR_TYPES[c.type].water && sp > 3) { const tl = CAR_TYPES[c.type].len / 2, bx = c.x - Math.sin(c.h) * tl, bz = c.z - Math.cos(c.h) * tl; FX.emit(bx, -0.2, bz, rr(-1, 1), 0.4, rr(-1, 1), 0.9, 0.8, 0.95, 0.98, 1, 0, 2); }
    }
    this.manage(dt);
  },
  runOver(c, sp) {
    const t = CAR_TYPES[c.type], fx = Math.sin(c.h), fz = Math.cos(c.h);
    const test = a => {
      if (!a.alive || a.state === 'hostage') return; const dx = a.x - c.x, dz = a.z - c.z; if (dx * dx + dz * dz > 20) return;
      const lf = dx * fx + dz * fz, ls = dx * fz - dz * fx; if (Math.abs(lf) < t.len / 2 + 0.3 && Math.abs(ls) < t.w / 2 + 0.3) {
        if (c.driver === 'player' || sp > 5) { const dmg = sp * 5.5; a.vx = (c.vx * 0.5); a.vz = (c.vz * 0.5); Combat.hurt(a, dmg, c.driver === 'player' ? 'player' : null, 'body', 'car'); fxBlood(a.x, 1, a.z, 4); Snd.thud(0.6); if (c.driver === 'player') { Crime.raise(a.alive ? 1 : 2, a.x, a.z, 'Hit and run'); } c.vx *= 0.93; c.vz *= 0.93; a.fear = 12; a.threat = { x: c.x, z: c.z }; }
      }
    };
    for (const a of G.actives) test(a);
    if (!P.inCar && c.driver === 'player') return;
    if (!P.inCar && !P.dead && sp > 4) { const dx = P.x - c.x, dz = P.z - c.z; const lf = dx * fx + dz * fz, ls = dx * fz - dz * fx; if (Math.abs(lf) < t.len / 2 + .3 && Math.abs(ls) < t.w / 2 + .3) { P.hurt(sp * 2.4, 'car'); P.kx = c.vx * 0.6; P.kz = c.vz * 0.6; } }
  },
  manage(dt) {
    this.spawnT -= dt; if (this.spawnT > 0) return; this.spawnT = 0.35;
    const px = P.x, pz = P.z, cf = G.camFwd || { x: 0, z: -1 };
    // despawn
    for (const c of G.cars) {
      if (c.owned || c.driver === 'player' || c.ai.mode === 'police' || c.keep) continue; const d = dist(c.x, c.z, px, pz);
      if ((c.ai.mode === 'traffic' && d > 280) || (c.ai.mode !== 'traffic' && d > 230 && c.ai.mode !== 'wreck')) { c.wreckGone = true; }
    }
    // traffic
    if (!this.nodeList) this.nodeList = [...World.nodes.values()].filter(n => n.links.length);
    const traffic = G.cars.filter(c => c.ai.mode === 'traffic').length, cap = Math.round(26 * (1 - G.night * 0.45) * G.quality);
    if (traffic < cap && G.cars.length < 110) {
      for (let tries = 0; tries < 6; tries++) {
        const n = pick(this.nodeList), d = dist(n.x, n.z, px, pz); if (d < 105 || d > 200) continue;
        const dx = (n.x - px) / d, dz = (n.z - pz) / d; if (d < 170 && dx * cf.x + dz * cf.z > 0.4) continue;
        const to = pick(n.links), ex = to.x - n.x, ez = to.z - n.z, L = Math.hypot(ex, ez), ux = ex / L, uz = ez / L, sx = n.x + 12 * ux - uz * 3.6, sz = n.z + 12 * uz + ux * 3.6;
        if (G.cars.some(o => d2(o.x, o.z, sx, sz) < 64)) continue;
        const zone = zoneAt(n.x, n.z), type = zone === 'industrial' ? pick(['pickup', 'van', 'van', 'sedan']) : zone === 'deco' ? pick(['sports', 'suv', 'sedan', 'taxi', 'taxi', 'muscle']) : zone === 'downtown' ? pick(['sedan', 'taxi', 'taxi', 'suv', 'compact']) : pick(['sedan', 'compact', 'suv', 'pickup', 'sedan', 'compact', 'muscle', 'van', 'bike', 'bike']);
        const car = this.create(type, sx, sz, Math.atan2(ux, uz), { mode: 'traffic' }); car.ai = { mode: 'traffic', from: n, to, cruise: rr(9, 15) }; car.sleep = false; car.vx = ux * 8; car.vz = uz * 8; break;
      }
    }
    // parked
    const parked = G.cars.filter(c => c.ai.mode === 'parked').length;
    if (parked < 55 * G.quality) {
      for (let tries = 0; tries < 30; tries++) {
        const s = pick(World.parkedSpots); if (s.car) continue; const d = dist(s.x, s.z, px, pz); if (d > 150 || d < 20) continue;
        if (!roadOK(s.x, s.z) && !s.lot) continue; if (!walkable(s.x, s.z)) continue; if (G.cars.some(o => d2(o.x, o.z, s.x, s.z) < 12)) continue;
        const zone = zoneAt(s.x, s.z), type = zone === 'industrial' ? pick(['pickup', 'van', 'pickup', 'sedan']) : zone === 'deco' ? pick(['sports', 'suv', 'sedan', 'muscle', 'sports']) : zone === 'downtown' ? pick(['sedan', 'suv', 'compact', 'sports']) : pick(['sedan', 'compact', 'suv', 'pickup', 'sedan', 'muscle', 'van', 'compact', 'bike', 'bike']);
        const car = this.create(type, s.x, s.z, s.h + (s.lot ? 0 : 0), { mode: 'parked' }); car.spot = s; s.car = car; car.locked = chance(0.35); break;
      }
    }
    // boats moored off the coast
    const boats = G.cars.filter(c => CAR_TYPES[c.type].water).length;
    if (boats < 7) for (let tries = 0; tries < 40; tries++) {
      const a = Math.random() * TAU, d = rr(40, 170), x = px + Math.cos(a) * d, z = pz + Math.sin(a) * d, sd = landSD(x, z); if (sd > -9 || sd < -34) continue;
      if (G.cars.some(o => d2(o.x, o.z, x, z) < 150)) continue; const b = this.create(chance(0.5) ? 'speedboat' : 'jetski', x, z, Math.random() * TAU, { mode: 'abandoned' }); b.sleep = false; break;
    }
  },
};

// ---- visible drivers (seen through the transparent glass)
const Drivers = {
  make(c) { const kind = c.type === 'cop' ? 'cop' : c.type === 'swat' ? 'swat' : c.type === 'armored' ? 'guard' : pick(['casual', 'casual', 'suit', 'hawaiian', 'casual', 'jogger', 'pastel']); return { kind: 'driver', alive: true, id: Math.random() * 1000, x: 0, y: 0, z: 0, yaw: 0, look: makeLook(kind), pose: newPose(), gun: null, drive: 'car', state: 'drive' }; },
  place(a, c) {
    const t = CAR_TYPES[c.type]; let sx = t.w * 0.21, sz = -t.len * 0.1, y = Math.min(0, ((ARCH[c.type] || ARCH.sedan).roof - 1.5)), kind = 'car';
    if (c.type === 'bike') { sx = 0; sz = -0.22; kind = 'bike'; } else if (c.type === 'jetski') { sx = 0; sz = -0.35; y = 0.08; kind = 'bike'; } else if (t.water) { kind = 'boat'; sz = -t.len * 0.05; y = 0.12; }
    const co = Math.cos(c.h), si = Math.sin(c.h); a.x = c.x + sx * co + sz * si; a.z = c.z - sx * si + sz * co; a.y = y + (CAR_TYPES[c.type].water ? -0.15 : 0); a.yaw = c.h; a.drive = kind; a.steer = c.steer; a.gun = null;
    if (a.enterT > 0) { a.enterT = Math.max(0, a.enterT - (G.dt || 0.016) * 2.8); const k = a.enterT * a.enterT * (3 - 2 * a.enterT), ox = 1.5, oz = 0.1; a.x += (c.x + ox * co + (sz + oz) * si - a.x) * k; a.z += (c.z - ox * si + (sz + oz) * co - a.z) * k; a.y += Math.sin(Math.PI * a.enterT) * 0.1; }
    const p = a.pose; p.walk = 0; p.aim = 0; p.speedG = clamp(Math.abs(c.fs) / 20, 0, 1.5); p.throttle = clamp(c.fs / 20, 0, 1); p.act = null; p.actB = 0; p.hands = 0; p.phone = 0; a.lookAt = null; a.sit = false; a.talkGest = false;
  },
};

// ---- skid marks (ring buffer of quads) and soft contact shadows under cars
const Skids = {
  MAX: 700, n: 0, mesh: null,
  init(scene) {
    const M = this.MAX; this.pos = new Float32Array(M * 12); const idx = new Uint32Array(M * 6); for (let i = 0; i < M; i++) { const b = i * 4; idx.set([b, b + 1, b + 2, b, b + 2, b + 3], i * 6); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(this.pos, 3)); g.setIndex(new T.BufferAttribute(idx, 1)); g.setDrawRange(0, 0);
    this.mesh = new T.Mesh(g, new T.MeshBasicMaterial({ color: 0x0c0c0e, transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5 })); this.mesh.frustumCulled = false; this.mesh.renderOrder = 2; scene.add(this.mesh); this.count = 0;
  },
  add(ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz); if (l < 0.05 || l > 6) return; const nx = -dz / l * 0.11, nz = dx / l * 0.11, i = (this.n % this.MAX) * 12, p = this.pos, y = 0.082;
    p[i] = ax + nx; p[i + 1] = y; p[i + 2] = az + nz; p[i + 3] = ax - nx; p[i + 4] = y; p[i + 5] = az - nz; p[i + 6] = bx - nx; p[i + 7] = y; p[i + 8] = bz - nz; p[i + 9] = bx + nx; p[i + 10] = y; p[i + 11] = bz + nz;
    this.n++; this.count = Math.min(this.n, this.MAX); this.mesh.geometry.setDrawRange(0, this.count * 6); this.mesh.geometry.attributes.position.needsUpdate = true;
  },
};
const blobTexC = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 2, 32, 32, 32); r.addColorStop(0, 'rgba(0,0,0,.9)'); r.addColorStop(.55, 'rgba(0,0,0,.45)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new T.CanvasTexture(c); })();
const blobMatC = new T.MeshBasicMaterial({ map: blobTexC, transparent: true, depthWrite: false, opacity: 0.7, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 });
const _blobGeo = {}; function blobGeoFor(t) { const k = t.len + '|' + t.w; return _blobGeo[k] || (_blobGeo[k] = new T.PlaneGeometry(t.w * 1.9, t.len * 1.25).rotateX(-Math.PI / 2)); }
