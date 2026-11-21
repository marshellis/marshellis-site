'use strict';
// ===== Humans: articulated procedural characters (instanced) =====
// Skeleton: pelvis > abdomen > chest > neck > head; shoulder > upper arm > forearm > hand; hip > thigh > shin > foot.
// Gait is solved so the lowest foot always touches the ground (pelvis height comes from leg kinematics).
const PARTS = ['pelvis', 'abdomen', 'chest', 'neck', 'head', 'hairTop', 'hairBack', 'hairExtra', 'hat', 'brim', 'eyeWL', 'eyeWR', 'eyeL', 'eyeR', 'browL', 'browR', 'nose', 'mouth', 'earL', 'earR', 'shades', 'beard',
  'shoulderL', 'shoulderR', 'uArmL', 'uArmR', 'fArmL', 'fArmR', 'handL', 'handR', 'thighL', 'thighR', 'shinL', 'shinR', 'footL', 'footR', 'jacket', 'tie', 'belt', 'skirt', 'bag', 'gun', 'umb', 'pole', 'blob'];
const PHONE = { len: 0.13, col: 0x111118, w: 0.07, d: 0.02 }, CUP = { len: 0.13, col: 0xf4f4f4, w: 0.065, d: 0.065 }, CIG = { len: 0.08, col: 0xf0f0e8, w: 0.012, d: 0.012 }, ROD = { len: 1.7, col: 0x6b4a2b, w: 0.02, d: 0.02 };
const L1 = 0.43, L2 = 0.42, UA = 0.30, FA = 0.27;
function gaitAmp(spd) { return clamp(0.2 + 0.17 * spd, 0.22, 0.95); }
function stepPhase(p, spd, dt) { if (spd < 0.15) return; const A = gaitAmp(spd), f = clamp(spd / (3.4 * A * 0.85), 0.5, 2.3); p.phase += TAU * f * dt; }
const ease = t => t * t * (3 - 2 * t);
const hash1 = n => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };

const Humans = {
  meshes: {}, max: 320,
  init(scene) {
    const cyl = (a, b, seg = 12) => new T.CylinderGeometry(a, b, 1, seg), sph = (w = 14, h = 10) => new T.SphereGeometry(0.5, w, h), box = () => new T.BoxGeometry(1, 1, 1);
    const top = g => { g.translate(0, -0.5, 0); return g; }; const blob = new T.CircleGeometry(0.5, 14); blob.rotateX(-Math.PI / 2);
    const GEO = {
      pelvis: cyl(0.5, 0.47), abdomen: cyl(0.5, 0.48), chest: cyl(0.5, 0.42), neck: cyl(0.5, 0.5, 8), head: sph(16, 12), hairTop: sph(), hairBack: box(), hairExtra: sph(10, 8), hat: cyl(0.5, 0.5, 14), brim: cyl(0.5, 0.5, 14),
      eyeWL: sph(8, 6), eyeWR: sph(8, 6), eyeL: sph(8, 6), eyeR: sph(8, 6), browL: box(), browR: box(), nose: sph(8, 6), mouth: box(), earL: sph(8, 6), earR: sph(8, 6), shades: box(), beard: sph(12, 8),
      shoulderL: sph(10, 8), shoulderR: sph(10, 8), uArmL: top(cyl(0.5, 0.42, 10)), uArmR: top(cyl(0.5, 0.42, 10)), fArmL: top(cyl(0.5, 0.38, 10)), fArmR: top(cyl(0.5, 0.38, 10)), handL: sph(10, 8), handR: sph(10, 8),
      thighL: top(cyl(0.5, 0.4, 10)), thighR: top(cyl(0.5, 0.4, 10)), shinL: top(cyl(0.5, 0.38, 10)), shinR: top(cyl(0.5, 0.38, 10)), footL: new T.BoxGeometry(1, 1, 1, 1, 4, 1), footR: new T.BoxGeometry(1, 1, 1, 1, 4, 1),
      jacket: cyl(0.5, 0.47), tie: box(), belt: cyl(0.5, 0.5, 12), skirt: cyl(0.5, 0.92, 14), bag: box(), gun: top(box()), umb: new T.CylinderGeometry(0.5, 0.12, 0.4, 12), pole: top(box()), blob,
    };

    // ---- egg-shaped head (narrow jaw) and baked ambient-occlusion shading (vertex colours multiply the per-instance colour)
    const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
    { const p = GEO.head.attributes.position; for (let k = 0; k < p.count; k++) { let x = p.getX(k), y = p.getY(k), z = p.getZ(k); if (y < 0) { const t = sm(0, 0.5, -y); x *= 1 - 0.26 * t; z *= 1 - 0.1 * t; if (z > 0) z += 0.05 * t; } if (z < 0) z *= 0.95; p.setXYZ(k, x, y, z); } GEO.head.computeVertexNormals(); }
    const SH = {
      chest: (x, y, z) => 0.8 + 0.2 * sm(-0.5, 0.4, y) * (z < -0.1 ? 0.94 : 1), abdomen: (x, y, z) => 0.86 + 0.14 * sm(-0.5, 0.4, y), pelvis: (x, y, z) => 0.9 + 0.1 * sm(-0.5, 0.5, y), neck: (x, y, z) => 0.8 + 0.2 * sm(-0.5, 0.5, y),
      head: (x, y, z) => (0.78 + 0.22 * sm(-0.5, 0.2, y)) * (z < -0.05 ? 0.96 : 1), hairTop: (x, y, z) => 0.6 + 0.52 * sm(-0.5, 0.5, y), hairBack: (x, y, z) => 0.68 + 0.32 * sm(-0.5, 0.5, y), hairExtra: (x, y, z) => 0.7 + 0.4 * sm(-0.5, 0.5, y),
      hat: (x, y, z) => 0.84 + 0.2 * sm(-0.5, 0.5, y), beard: (x, y, z) => 0.72 + 0.3 * sm(-0.5, 0.5, y),
      uArmL: (x, y, z) => 0.84 + 0.16 * sm(0, 0.3, -y) - 0.07 * sm(0.75, 1, -y), uArmR: (x, y, z) => 0.84 + 0.16 * sm(0, 0.3, -y) - 0.07 * sm(0.75, 1, -y),
      fArmL: (x, y, z) => 0.9 + 0.1 * sm(0, 0.25, -y) - 0.17 * sm(0.7, 1, -y), fArmR: (x, y, z) => 0.9 + 0.1 * sm(0, 0.25, -y) - 0.17 * sm(0.7, 1, -y),
      handL: (x, y, z) => 0.82 + 0.18 * sm(-0.5, 0.5, y), handR: (x, y, z) => 0.82 + 0.18 * sm(-0.5, 0.5, y),
      thighL: (x, y, z) => 0.82 + 0.18 * sm(0, 0.3, -y) - 0.06 * sm(0.8, 1, -y), thighR: (x, y, z) => 0.82 + 0.18 * sm(0, 0.3, -y) - 0.06 * sm(0.8, 1, -y),
      shinL: (x, y, z) => 0.95 - 0.25 * sm(0.78, 1, -y), shinR: (x, y, z) => 0.95 - 0.25 * sm(0.78, 1, -y),
      footL: (x, y, z) => y < -0.4 ? 0.34 : y < -0.1 ? 0.8 : 1, footR: (x, y, z) => y < -0.4 ? 0.34 : y < -0.1 ? 0.8 : 1,
      jacket: (x, y, z) => 0.76 + 0.24 * sm(-0.5, -0.15, y), skirt: (x, y, z) => 0.78 + 0.22 * sm(-0.5, 0.3, y), bag: (x, y, z) => 0.8 + 0.2 * sm(-0.5, 0.5, y),
    };
    for (const k in GEO) if (k !== 'blob') { const g = GEO[k], f = SH[k], p = g.attributes.position, n = p.count, col = new Float32Array(n * 3); for (let v = 0; v < n; v++) { const m = f ? f(p.getX(v), p.getY(v), p.getZ(v)) : 1; col[v * 3] = col[v * 3 + 1] = col[v * 3 + 2] = m; } g.setAttribute('color', new T.BufferAttribute(col, 3)); }
    PARTS.forEach(p => {
      const mat = p === 'blob' ? new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false }) : new T.MeshLambertMaterial({ color: 0xffffff, vertexColors: true });
      const m = new T.InstancedMesh(GEO[p], mat, this.max); m.frustumCulled = false; m.castShadow = !/^(blob|eye|brow|mouth|nose|ear|shades)/.test(p); m.instanceMatrix.setUsage(T.DynamicDrawUsage);
      m.setColorAt(0, new T.Color(1, 1, 1)); m.instanceColor.setUsage(T.DynamicDrawUsage); m.count = 0; if (p === 'blob') m.renderOrder = 1; scene.add(m); this.meshes[p] = m;
    });
    this.m = new T.Matrix4(); this.l = new T.Matrix4(); this.R = new T.Matrix4(); this.PV = new T.Matrix4(); this.AB = new T.Matrix4(); this.CH = new T.Matrix4(); this.HD = new T.Matrix4();
    this.G1 = new T.Matrix4(); this.FL = new T.Matrix4(); this.HP = new T.Matrix4(); this.KN = new T.Matrix4(); this.FT = new T.Matrix4(); this.TMP = new T.Matrix4(); this.RF = new T.Matrix4();
    this.q = new T.Quaternion(); this.e = new T.Euler(0, 0, 0, 'YXZ'); this.p = new T.Vector3(); this.s = new T.Vector3(); this.s1 = new T.Vector3(1, 1, 1); this.c = new T.Color(); this.c2 = new T.Color();
  },
  // frame = parent * T(x,y,z) * R(rx,ry,rz)   (Euler order YXZ)
  frame(out, parent, x, y, z, rx, ry, rz) { this.l.compose(this.p.set(x, y, z), this.q.setFromEuler(this.e.set(rx, ry, rz)), this.s1); out.multiplyMatrices(parent, this.l); },
  put(name, i, frame, ox, oy, oz, sx, sy, sz, col, rz) { this.l.compose(this.p.set(ox, oy, oz), rz ? this.q.setFromEuler(this.e.set(0, 0, rz)) : this.q.identity(), this.s.set(sx, sy, sz)); this.m.multiplyMatrices(frame, this.l); const M = this.meshes[name]; M.setMatrixAt(i, this.m); M.setColorAt(i, col); },
  hide(name, i) { this.m.makeScale(0, 0, 0); const M = this.meshes[name]; M.setMatrixAt(i, this.m); M.setColorAt(i, this.c.setHex(0)); },
  render(list) {
    const n = Math.min(list.length, this.max), M = this.meshes, T0 = G.time, dtg = G.dt || 0.016; for (const k in M) M[k].count = n;
    const R = this.R, e = this.e, q = this.q, p = this.p, s = this.s, l = this.l, c = this.c, c2 = this.c2, hide = (nm, i) => this.hide(nm, i), put = (...a) => this.put(...a), frame = (...a) => this.frame(...a);
    const wind = (typeof Weather !== 'undefined' && Weather.s) ? Weather.s.wind : 0; if (typeof Guns !== 'undefined' && Guns.initDone) Guns.begin();
    for (let i = 0; i < n; i++) {
      const h = list[i], pz = h.pose, L = h.look, id = (h.id || 0) * 1.0, dead = pz.dead || 0, hs = L.scale || 1, bw = L.build || 1;
      const J = pz.J || (pz.J = {}), sm = (k, t, r) => { const v = J[k] === undefined ? t : J[k]; const nv = v + (t - v) * (1 - Math.exp(-r * dtg)); J[k] = nv; return nv; };
      // ---------- timers / decays
      for (const k of ['hit', 'swing', 'recoil', 'startle', 'draw', 'landT']) pz[k] = Math.max(0, (pz[k] || 0) - dtg * (k === 'hit' ? 3.2 : k === 'swing' ? 3.4 : k === 'recoil' ? 7 : k === 'startle' ? 2.2 : k === 'draw' ? 3.2 : 3.6));
      const hit = pz.hit, swing = pz.swing, sw = 1 - swing, recoil = pz.recoil, startle = pz.startle, draw = pz.draw, panic = pz.panic || 0, struggle = pz.struggle || 0, reloading = pz.reloading ? 1 : 0, reach = pz.reach || 0;
      // ---------- locomotion parameters
      const spd = clamp(pz.walk, 0, 1.7) * 2.6, mv = clamp(spd / 1.1, 0, 1), run = clamp((spd - 2.9) / 3.0, 0, 1), ph = pz.phase;
      const drive = h.drive || null, aimB = pz.aim || 0, idle = 1 - mv, A = gaitAmp(spd) * mv;
      const yd = angDiff(pz.prevYaw === undefined ? h.yaw : pz.prevYaw, h.yaw) / Math.max(dtg, 0.001); pz.prevYaw = h.yaw; pz.yawR = lerp(pz.yawR || 0, clamp(yd, -7, 7), 0.15);
      if (idle > 0.6 && Math.abs(pz.yawR) > 0.9 && !drive) pz.phase += dtg * Math.min(3.5, Math.abs(pz.yawR)) * 1.8; // shuffle feet when turning in place
      const turnStep = idle > 0.6 ? clamp(Math.abs(pz.yawR) / 3, 0, 0.55) : 0;
      const prevSpd = pz.prevSpd === undefined ? spd : pz.prevSpd; pz.accS = lerp(pz.accS || 0, clamp((spd - prevSpd) / Math.max(dtg, 0.001), -12, 12), 0.1); pz.prevSpd = spd;
      pz.exert = lerp(pz.exert || 0, run + (swing > 0 ? 0.3 : 0), run > (pz.exert || 0) ? 0.04 : 0.006);
      const sgnF = (pz.fwd !== undefined && spd > 0.2) ? clamp(pz.fwd / Math.max(spd, 0.01), -1, 1) : 1, dirS = (pz.side !== undefined && spd > 0.2) ? clamp(pz.side / Math.max(spd, 0.01), -1, 1) : 0;
      const act = pz.act || null, actB = pz.actB || 0, dance = act === 'dance' ? actB : 0;
      const sitRaw = (h.sit || drive === 'car' || drive === 'boat') ? 1 : 0, sitK = sm('sitK', sitRaw, 9);
      const crouch = clamp(sm('crouch', Math.max(pz.crouch || 0, sitRaw), 9), 0, 1), lieB = sm('lie', h.lie ? 1 : 0, 7), air = h.air ? 1 : 0;
      const talkB = (h.talking || h.talkGest) ? 1 : 0;
      // ---------- legs
      const leg = side => {
        const f = ph + (side > 0 ? Math.PI : 0), tri = Math.asin(0.88 * Math.sin(f)) / Math.asin(0.88);
        let a = A * (0.85 * tri + 0.15 * Math.sin(f)) * sgnF, b = (lerp(0.8, 1.5, run) * mv) * Math.pow(Math.max(0, Math.cos(f + 0.4)), 1.25) + 0.05 + 0.04 * mv + 0.1 * mv * Math.max(0, Math.sin(f - 1.2)), lat = A * 0.9 * Math.sin(f) * dirS;
        a += idle * side * 0.02 * Math.sin(T0 * 0.45 + id) + turnStep * 0.22 * Math.sin(f) * (1 - mv); b += turnStep * 0.25 * Math.max(0, Math.cos(f + 0.4));
        if (aimB > 0.01) { a += aimB * (side > 0 ? -0.22 : 0.3); b += aimB * 0.18; }
        if (act === 'tap' && side > 0) a += actB * 0.03;
        if (dance > 0.01) { const bt = Math.sin(T0 * 8 + id + side * 1.6); a = lerp(a, bt * 0.3, dance); b = lerp(b, 0.45 + 0.45 * Math.max(0, bt), dance); lat += dance * side * 0.18 * Math.sin(T0 * 4 + id); }
        if (crouch > 0.01) { let ca = lerp(1.25 + side * 0.05, 1.5, sitK), cb = lerp(2.0, 1.55, sitK); if (drive === 'car' || drive === 'boat') { ca = 1.4 + (side > 0 ? 0.1 * (pz.throttle || 0) : 0); cb = 1.75; } lat = lerp(lat, 0, crouch); a = lerp(a, ca, crouch); b = lerp(b, cb, crouch); }
        if (drive === 'bike') { a = 0.95; b = 1.45; lat = side * 0.12; }
        if (air) { a = side > 0 ? 0.75 : 0.2; b = 1.0; }
        if (lieB > 0.01) { a = lerp(a, 0.08, lieB); b = lerp(b, 0.08, lieB); lat = lerp(lat, side * 0.1, lieB); }
        if (dead > 0.001) { const sp = (hash1(id * 5.3 + side * 2.1) - 0.5), k = Math.min(1, dead * 2); a = lerp(a, sp * 0.7 + (dead > 0.5 ? 0 : 0.5), k); b = lerp(b, 0.3 + Math.abs(sp) * 0.8, k); }
        return [sm('a' + side, a, dead > 0.001 ? 12 : 34), sm('b' + side, b, dead > 0.001 ? 12 : 34), f, sm('l' + side, lat, 24)];
      };
      const [aL, bL, fL, latL] = leg(-1), [aR, bR, fR, latR] = leg(1);
      const fyL = L1 * Math.cos(aL) + L2 * Math.cos(aL - bL), fyR = L1 * Math.cos(aR) + L2 * Math.cos(aR - bR);
      let pelvisY = Math.max(fyL, fyR) + 0.075 + run * 0.06 * Math.pow(Math.abs(Math.sin(ph)), 1.5);
      { const rl = pz.roll || 0; if (rl > 0.001) pelvisY = lerp(pelvisY, 0.5, Math.sin(Math.min(1, rl) * Math.PI)); }
      if (dance > 0.01) pelvisY -= dance * 0.04 * (1 + Math.sin(T0 * 16 + id)); if (lieB > 0.01) pelvisY = lerp(pelvisY, 0.2, lieB); if (dead > 0.001) pelvisY = lerp(pelvisY, 0.22, Math.min(1, dead * 1.6));
      // ---------- root (death / lying rotations, settle bounce)
      const dk = h.deathType || 0, df = ease(clamp((dead - 0.25) / 0.75, 0, 1)), sgn = dk === 1 ? 1 : -1, settle = dead > 0.7 ? Math.sin((dead - 0.7) * 38) * 0.07 * (1 - dead) * 3 : 0;
      let rx = (dk === 2 || dk === 3 ? 0 : sgn * Math.PI / 2) * df - Math.PI / 2 * lieB + settle, rz = (dk === 2 ? 1 : dk === 3 ? -1 : 0) * Math.PI / 2 * df, fly = dk === 4 ? 0.9 * Math.sin(Math.PI * clamp(dead * 2.2, 0, 1)) : 0;
      e.set(rx, h.yaw, rz); q.setFromEuler(e);
      p.set(h.x, (h.y || 0) + (dead > 0.5 ? 0.16 * (dead - 0.5) * 2 : 0) + 0.16 * lieB + fly, h.z); s.set(bw, hs, bw); R.compose(p, q, s);
      // ---------- secondary-motion spring (hair, bag, skirt lag behind the body)
      const sec = pz.sec || (pz.sec = { x: 0, vx: 0, z: 0, vz: 0 }); const tx = -pz.yawR * 0.012 + Math.sin(ph) * 0.025 * mv + wind * 0.02 * Math.sin(T0 * 2 + id), tz = -pz.accS * 0.004 - spd * 0.007;
      sec.vx += ((tx - sec.x) * 140 - sec.vx * 9) * Math.min(dtg, 0.03); sec.vz += ((tz - sec.z) * 140 - sec.vz * 9) * Math.min(dtg, 0.03); sec.x += sec.vx * Math.min(dtg, 0.03); sec.z += sec.vz * Math.min(dtg, 0.03);
      // ---------- torso chain
      const bf = (pz.hitF === undefined ? 1 : pz.hitF), bs = pz.hitS || 0;
      let leanT = 0.03 + 0.2 * run + 0.1 * crouch + (aimB > 0 ? 0.05 : 0) + clamp(pz.accS * 0.012, -0.1, 0.18) - recoil * 0.1 - startle * 0.22 + reach * 0.15 + (act === 'stretch' ? -0.15 * actB : 0) + (act === 'watch' || act === 'text' ? 0.08 * actB : 0) - hit * 0.3 * bf * 0.5 + (act === 'laugh' ? -0.1 * actB : 0);
      if (drive === 'bike') leanT = 0.5; else if (drive === 'car' || drive === 'boat') leanT = 0.04;
      const lean = sm('lean', leanT, 11), steerT = h.steer || 0, aimTw = aimB * 0.35, swTw = swing > 0 ? (-0.55 + 1.1 * ease(sw)) * swing : 0, latG = drive === 'car' ? clamp(steerT * (pz.speedG || 0) * 0.5, -0.3, 0.3) : 0;
      const twist = Math.sin(ph) * 0.16 * mv + struggle * Math.sin(T0 * 11) * 0.25 + (drive === 'car' ? -steerT * 0.15 : 0), flinch = hit * 0.28 * bf, breathe = Math.sin(T0 * (1.7 + pz.exert * 2.6) + id) * (0.012 + pz.exert * 0.02);
      const sway = Math.sin(ph) * 0.022 * mv + struggle * Math.sin(T0 * 13) * 0.05 + idle * 0.02 * Math.sin(T0 * 0.45 + id) + hit * bs * 0.05, roll = -pz.yawR * 0.025 * mv * (1 + run) + hit * bs * 0.15 - latG * 0.5 + (act === 'laugh' ? Math.sin(T0 * 18) * 0.03 * actB : 0), lunge = swing > 0 ? Math.sin(Math.PI * ease(sw)) * 0.18 : 0;
      frame(this.PV, R, sway, pelvisY, lunge, lean * 0.25 + (sitK > 0.5 ? -0.05 : 0) + ease(Math.min(1, pz.roll || 0)) * TAU, twist * 0.7, Math.sin(ph) * 0.03 * mv + roll + (dance > 0.01 ? Math.sin(T0 * 8 + id) * 0.1 * dance : 0));
      put('pelvis', i, this.PV, 0, 0, 0, 0.33, 0.2, 0.22, c.setHex(L.pants));
      if (L.belt != null) put('belt', i, this.PV, 0, 0.1, 0, 0.335, 0.045, 0.23, c.setHex(L.belt)); else hide('belt', i);
      frame(this.AB, this.PV, 0, 0.06, 0, lean * 0.4 - flinch * 0.4 + (sitK > 0.5 ? 0.06 : 0), -twist * 0.3 + aimTw * 0.4 + swTw * 0.4 + (dance > 0.01 ? Math.sin(T0 * 4 + id) * 0.25 * dance : 0), roll * 1.4);
      put('abdomen', i, this.AB, 0, 0.12, 0, 0.3, 0.27, 0.205, c.setHex(L.jacket != null ? L.jacket : L.shirt));
      frame(this.CH, this.AB, 0, 0.24, 0, lean * 0.5 - flinch * 0.6 + (dead > 0.05 ? dead * 0.3 : 0) + (act === 'laugh' ? Math.sin(T0 * 18) * 0.03 * actB : 0), -twist * 0.6 + aimTw * 0.6 + swTw * 0.6, roll * 0.6);
      put('chest', i, this.CH, 0, 0.16, 0, 0.39 + breathe, 0.35, 0.245 + breathe, c.setHex(L.jacket != null ? L.jacket : L.shirt));
      if (L.jacket != null) { put('jacket', i, this.CH, 0, -0.08, 0, 0.405, 0.62, 0.262, c.setHex(L.jacket)); if (L.tie != null) put('tie', i, this.CH, sec.x * 0.4, 0.1, 0.128, 0.045, 0.26, 0.02, c.setHex(L.tie)); else hide('tie', i); } else { hide('jacket', i); hide('tie', i); }
      if (L.dress) { frame(this.TMP, this.PV, 0, 0, 0, -(aL + aR) * 0.12 * (1 - crouch), 0, (aL - aR) * 0.05); put('skirt', i, this.TMP, sec.x * 0.6, -0.25 * (1 - crouch * 0.4), sec.z * 0.5, 0.33 + Math.abs(aL - aR) * 0.05, 0.5, 0.26 + Math.abs(aL - aR) * 0.05, c.setHex(L.dressCol != null ? L.dressCol : L.shirt)); } else hide('skirt', i);
      if (L.bag != null) put('bag', i, this.CH, sec.x * 0.8, 0.06 + Math.abs(Math.sin(ph)) * 0.012 * mv, -0.2 + sec.z * 0.6, 0.27, 0.36, 0.13, c.setHex(L.bag)); else hide('bag', i);
      // ---------- head & face
      const MK = L.mask ? 0x141418 : null; // ski mask: head, neck, ears, hair, mouth all go dark; eyes stay visible
      const mood = { anger: pz.anger || 0, fear: Math.max(pz.fear || 0, startle > 0.2 ? 1 : 0, pz.scared ? 0.8 : 0), smile: Math.max(pz.smile || 0, act === 'laugh' ? actB : 0) };
      let hp = -lean * 0.4 + flinch * 0.9 + startle * 0.3 + Math.sin(T0 * 0.5 + id) * 0.02 * idle + talkB * Math.sin(T0 * 4.6 + id) * 0.045 + reloading * 0.15 - panic * 0.2 + ((act === 'watch' || act === 'text') ? 0.35 * actB : 0) - (act === 'stretch' ? 0.25 * actB : 0) + (drive === 'bike' ? -0.45 : 0) + (lieB > 0.5 ? 0.1 : 0) - (act === 'laugh' ? 0.2 * actB : 0) - (act === 'lookup' ? 0.4 * actB : 0) + Math.sin(ph * 2) * 0.03 * mv * (1 + run) + (drive === 'car' ? Math.sin(T0 * 7 + id) * 0.005 * (pz.speedG || 0) : 0);
      let look = pz.look || 0, want = 0;
      if (h.lookAt) { const dxl = h.lookAt.x - h.x, dzl = h.lookAt.z - h.z; want = clamp(angDiff(h.yaw, Math.atan2(dxl, dzl)) - (-twist * 0.6 + aimTw * 0.6 + swTw * 0.6), -1.2, 1.2); look = lerp(look, want, 0.14); } else look = lerp(look, Math.sin(T0 * 0.35 + id * 2) * 0.25 * idle, 0.06);
      if (act === 'look') look = lerp(look, Math.sin(T0 * 1.6 + id) * 0.95, actB * 0.3); if (drive === 'car') look = lerp(look, steerT * 0.35 + (Math.sin(T0 * 0.35 + id) > 0.96 ? 0.7 : 0), 0.2);
      pz.look = look; const gaze = clamp((want - look) * 0.5, -0.6, 0.6) * 0.022 + Math.sin(T0 * 3.1 + id * 5) * 0.004 * (Math.sin(T0 * 0.7 + id) > 0.6 ? 1 : 0);
      frame(this.HD, this.CH, 0, 0.36, 0, hp + (dead > 0.5 ? 0.2 : 0) - hit * bf * 0.3, look + struggle * Math.sin(T0 * 15) * 0.3, (act === 'scratch' ? 0.12 * actB : 0) + struggle * 0.1 + hit * bs * 0.2);
      put('neck', i, this.CH, 0, 0.33, 0, 0.09, 0.1, 0.095, c.setHex(MK != null ? MK : L.skin)); put('head', i, this.HD, 0, 0.11, 0, 0.165 * (L.hw || 1), 0.225, 0.2 * (L.hw || 1), c.setHex(MK != null ? MK : L.skin));
      const st = L.style || (L.long ? 'long' : 'short');
      if (st === 'bald' || (L.hat != null && L.hatType === 'helmet' && st !== 'long')) hide('hairTop', i); else if (st === 'buzz') put('hairTop', i, this.HD, 0, 0.17, -0.01, 0.17, 0.12, 0.2, c.setHex(MK != null ? MK : L.hair));
      else if (st === 'afro') put('hairTop', i, this.HD, sec.x * 0.1, 0.17, -0.02, 0.27, 0.26, 0.28, c.setHex(MK != null ? MK : L.hair)); else put('hairTop', i, this.HD, 0, 0.17, -0.02, 0.18, 0.15, 0.215, c.setHex(MK != null ? MK : L.hair));
      const hw = sec.x * 1.4 + Math.sin(T0 * 2.2 + id) * 0.012 * (0.4 + wind * 2);
      if (st === 'long') put('hairBack', i, this.HD, hw, 0.0, -0.1 + Math.min(0, sec.z * 1.3), 0.19, 0.42 + Math.min(0.06, Math.abs(sec.z) * 0.6), 0.075, c.setHex(MK != null ? MK : L.hair)); else hide('hairBack', i);
      if (st === 'ponytail') put('hairExtra', i, this.HD, hw * 1.5, 0.05 - mv * 0.02, -0.15 + Math.min(0, sec.z * 1.6), 0.06, 0.24, 0.06, c.setHex(MK != null ? MK : L.hair)); else if (st === 'bun') put('hairExtra', i, this.HD, 0, 0.27, -0.07, 0.09, 0.09, 0.09, c.setHex(MK != null ? MK : L.hair)); else hide('hairExtra', i);
      if (L.hat != null) {
        const ht = L.hatType || 'cap';
        if (ht === 'straw') { put('hat', i, this.HD, 0, 0.255, 0, 0.19, 0.08, 0.22, c.setHex(L.hat)); put('brim', i, this.HD, 0, 0.225, 0, 0.5, 0.012, 0.5, c2.setHex(L.hat)); }
        else if (ht === 'helmet') { put('hat', i, this.HD, 0, 0.2, 0, 0.215, 0.17, 0.25, c.setHex(L.hat)); put('brim', i, this.HD, 0, 0.14, 0.09, 0.2, 0.02, 0.1, c2.setHex(L.hat)); }
        else if (ht === 'hard') { put('hat', i, this.HD, 0, 0.245, 0, 0.19, 0.1, 0.225, c.setHex(L.hat)); put('brim', i, this.HD, 0, 0.205, 0.04, 0.24, 0.015, 0.27, c2.setHex(L.hat)); }
        else if (ht === 'pill') { put('hat', i, this.HD, 0, 0.255, 0, 0.17, 0.08, 0.17, c.setHex(L.hat)); hide('brim', i); }
        else { put('hat', i, this.HD, 0, 0.245, -0.005, 0.185, 0.085, 0.215, c.setHex(L.hat)); put('brim', i, this.HD, 0, 0.215, 0.115, 0.17, 0.012, 0.12, c2.setHex(L.hat)); }
      } else { hide('hat', i); hide('brim', i); }
      const sq = dead > 0.4 ? 0.2 : 1, bl = Math.sin(T0 * 0.9 + id * 4), blink = (bl > 0.985 || (bl < -0.992 && Math.sin(T0 * 7 + id) > 0)) ? 0.15 : 1, wide = (startle > 0.2 || pz.scared) ? 1.35 : (1 - mood.anger * 0.25);
      put('eyeWL', i, this.HD, -0.057, 0.14, 0.09, 0.05, 0.034 * sq * blink * wide, 0.02, c.setHex(0xf1ece4)); put('eyeWR', i, this.HD, 0.057, 0.14, 0.09, 0.05, 0.034 * sq * blink * wide, 0.02, c.setHex(0xf1ece4));
      put('eyeL', i, this.HD, -0.057 + gaze, 0.14, 0.098, 0.026, 0.028 * sq * blink * wide, 0.014, c.setHex(L.eye != null ? L.eye : 0x2a1a10)); put('eyeR', i, this.HD, 0.057 + gaze, 0.14, 0.098, 0.026, 0.028 * sq * blink * wide, 0.014, c.setHex(L.eye != null ? L.eye : 0x2a1a10));
      const tilt = mood.anger * 0.42 - mood.fear * 0.35 - mood.smile * 0.05, byo = mood.fear * 0.014 - mood.anger * 0.007 + mood.smile * 0.003;
      put('browL', i, this.HD, -0.057, 0.168 + byo, 0.092, 0.05, 0.011 * (L.brw || 1), 0.014, c.setHex(MK != null ? MK : L.hair), -tilt); put('browR', i, this.HD, 0.057, 0.168 + byo, 0.092, 0.05, 0.011 * (L.brw || 1), 0.014, c.setHex(MK != null ? MK : L.hair), tilt);
      put('nose', i, this.HD, 0, 0.1, 0.104, 0.034 * (L.nz || 1), 0.05 * (L.nz || 1), 0.045 * (L.nz || 1), c.setHex(MK != null ? MK : L.skin).multiplyScalar(0.9));
      const open = talkB ? (0.012 + Math.abs(Math.sin(T0 * 12 + id) * Math.sin(T0 * 7.3 + id * 2)) * 0.034) : (pz.hands > 0.5 || startle > 0.2 || panic > 0.3 ? 0.04 : (act === 'yawn' || act === 'laugh' ? 0.05 * actB : 0.01 + mood.fear * 0.02 + mood.smile * 0.012));
      put('mouth', i, this.HD, 0, 0.045 + mood.smile * 0.004 - mood.anger * 0.003, 0.092, 0.055 * (L.mw || 1) * (1 + mood.smile * 0.35 - mood.anger * 0.12), open, 0.018, c.setHex(MK != null ? MK : (mood.smile > 0.4 ? 0x9a3a3a : 0x7a3a3a)));
      put('earL', i, this.HD, -0.087, 0.12, -0.005, 0.03, 0.06, 0.04, c.setHex(MK != null ? MK : L.skin)); put('earR', i, this.HD, 0.087, 0.12, -0.005, 0.03, 0.06, 0.04, c.setHex(MK != null ? MK : L.skin));
      if (L.shades) put('shades', i, this.HD, 0, 0.14, 0.098, 0.165, 0.04, 0.03, c.setHex(0x07070b)); else hide('shades', i);
      if (L.beard) put('beard', i, this.HD, 0, 0.045, 0.02, 0.15, 0.11, 0.17, c.setHex(MK != null ? MK : L.hair)); else hide('beard', i);
      // ---------- arms
      const gi = Math.floor(T0 / 2.7 + id * 0.37) % 4, swingSide = pz.swingSide || 1;
      const arm = side => {
        const fa = ph + (side > 0 ? 0 : Math.PI), Aa = lerp(0.42, 0.85, run) * mv * sgnF * (0.85 + 0.3 * A); let sa = Aa * Math.sin(fa) + idle * 0.03 * Math.sin(T0 * 0.8 + id + side), e2 = 0.18 + 0.15 * mv + 0.95 * run + 0.25 * mv * Math.max(0, Math.sin(fa)), ab = 0.07 + 0.05 * idle + 0.05 * run, shr = 0;
        if (h.talkGest) {
          if (gi === 0) { sa = 0.55 + 0.4 * Math.sin(T0 * 3.1 + id + side * 1.3); e2 = 1.1 + 0.5 * Math.sin(T0 * 4.3 + id * 2 + side); ab = 0.2; }
          else if (gi === 1) { sa = 0.6 + 0.1 * Math.sin(T0 * 2 + side); e2 = 1.25; ab = 0.55; shr = 0.02; }
          else if (gi === 2) { if (side > 0) { sa = 1.45 + 0.15 * Math.sin(T0 * 4); e2 = 0.25; ab = 0.12; } else { sa = 0.15; e2 = 0.4; ab = 0.1; } }
          else { if (side > 0) { sa = 0.95; e2 = 2.2 + 0.15 * Math.sin(T0 * 3); ab = 0.05; } else { sa = 0.4; e2 = 2.3; ab = -0.15; } }
        }
        if (actB > 0.01 && !h.talkGest) {
          const k = actB;
          switch (act) {
            case 'arms': case 'tap': sa = lerp(sa, 0.45, k); e2 = lerp(e2, 2.4, k); ab = lerp(ab, -0.28, k); break;
            case 'hips': sa = lerp(sa, 0.2, k); e2 = lerp(e2, 1.6, k); ab = lerp(ab, 0.6, k); break;
            case 'watch': if (side > 0) { sa = lerp(sa, 0.9, k); e2 = lerp(e2, 1.9, k); ab = lerp(ab, 0.05, k); } break;
            case 'scratch': if (side > 0) { sa = lerp(sa, 2.4 + 0.15 * Math.sin(T0 * 9), k); e2 = lerp(e2, 2.2, k); ab = lerp(ab, 0.2, k); } break;
            case 'stretch': sa = lerp(sa, 2.9 + 0.1 * Math.sin(T0 * 3), k); e2 = lerp(e2, 0.15, k); ab = lerp(ab, 0.35, k); break;
            case 'text': sa = lerp(sa, 0.55, k); e2 = lerp(e2, 1.7, k); ab = lerp(ab, 0.08, k); break;
            case 'drink': if (side > 0) { const cc = 0.5 + 0.5 * Math.sin(T0 * 0.9 + id); sa = lerp(sa, 0.6 + 0.3 * cc, k); e2 = lerp(e2, 1.5 + 0.9 * cc, k); ab = lerp(ab, 0.1, k); } break;
            case 'smoke': if (side > 0) { const cc = Math.max(0, Math.sin(T0 * 0.7 + id)); sa = lerp(sa, 0.5, k); e2 = lerp(e2, 1.5 + 1.0 * cc, k); } break;
            case 'yawn': if (side > 0) { sa = lerp(sa, 0.7, k); e2 = lerp(e2, 2.4, k); } break;
            case 'shrug': sa = lerp(sa, 0.35, k); e2 = lerp(e2, 1.05, k); ab = lerp(ab, 0.6, k); shr = 0.045 * k; break;
            case 'laugh': if (side > 0) { sa = lerp(sa, 0.45, k); e2 = lerp(e2, 1.7, k); } else { sa = lerp(sa, 0.25, k); e2 = lerp(e2, 0.8, k); ab = lerp(ab, 0.3, k); } break;
            case 'dance': { const w = Math.sin(T0 * 8 + id + side * 1.7); sa = lerp(sa, 1.6 + 0.9 * w, k); e2 = lerp(e2, 1.0 + 0.5 * w, k); ab = lerp(ab, 0.5, k); break; }
            case 'fish': sa = lerp(sa, 0.95, k); e2 = lerp(e2, 1.1, k); ab = lerp(ab, 0.05, k); break;
          }
        }
        if (crouch > 0.01 && sitK > 0.3 && !drive) { sa = lerp(sa, 0.5, crouch); e2 = lerp(e2, 1.3, crouch); }
        if (drive === 'car' || drive === 'boat') { sa = 1.1 + side * steerT * -0.35; e2 = 0.85 + Math.abs(steerT) * 0.2; ab = 0.1; if (side < 0 && Math.sin(T0 * 0.3 + id) > 0.985) { sa = 0.5; e2 = 1.2; } }
        if (drive === 'bike') { sa = 1.05; e2 = 0.4; ab = 0.22; }
        if (air) { sa = 1.2; e2 = 0.6; ab = 0.5; }
        if (aimB > 0.01) { const pitch = (pz.aimPitch || 0), two = h.gun && h.gun.two; if (side > 0) { sa = lerp(sa, 1.5 + pitch - recoil * 0.22 + Math.sin(T0 * 1.7 + id) * 0.009 + Math.sin(T0 * 0.83 + id * 2) * 0.007, aimB); e2 = lerp(e2, (two ? 0.5 : 0.12) + recoil * 0.4, aimB); ab = lerp(ab, 0.02, aimB); } else { sa = lerp(sa, (two ? 1.35 + pitch - recoil * 0.2 + Math.sin(T0 * 1.5 + id * 3) * 0.008 : 0.55), aimB); e2 = lerp(e2, two ? 0.75 : 0.8, aimB); ab = lerp(ab, two ? 0.12 : 0.1, aimB); if (reloading) { sa = lerp(sa, 1.05 + 0.1 * Math.sin(T0 * 10), reloading); e2 = lerp(e2, 1.6, reloading); } } }
        if (draw > 0.01 && side > 0) { sa = lerp(sa, 0.12, draw * 0.85); e2 = lerp(e2, 1.2, draw * 0.85); ab = lerp(ab, 0.3, draw); }
        if (pz.hands > 0.01) { const t = pz.hands; sa = lerp(sa, 2.7, t); e2 = lerp(e2, 0.55 + 0.1 * Math.sin(T0 * 3 + side), t); ab = lerp(ab, 0.38, t); }
        if (side > 0) {
          if (pz.phone > 0.01) { sa = lerp(sa, 0.5, pz.phone); e2 = lerp(e2, 2.45, pz.phone); ab = lerp(ab, 0.1, pz.phone); }
          if (pz.wave > 0.01) { sa = lerp(sa, 2.45, pz.wave); e2 = lerp(e2, 0.55 + Math.sin(T0 * 10) * 0.45, pz.wave); ab = lerp(ab, 0.45, pz.wave); }
          if (pz.hammer > 0.01) { sa = lerp(sa, 0.9 + 0.85 * Math.sin(T0 * 8), pz.hammer); e2 = lerp(e2, 1.0, pz.hammer); }
          if (reach > 0.01) { sa = lerp(sa, 1.0 + Math.sin(T0 * 12) * 0.05, reach); e2 = lerp(e2, 0.55, reach); }
        }
        if (swing > 0 && (side === swingSide)) { const t = ease(sw), k = Math.min(1, swing * 6); sa = lerp(sa, lerp(-1.2, 2.0, t), k); e2 = lerp(e2, lerp(0.3, 0.6, t), k); ab = lerp(ab, 0.2, k); }
        if (panic > 0.01) { sa = lerp(sa, 0.8 + Math.sin(T0 * 14 + side * 2) * 1.2, panic); ab = lerp(ab, 0.9, panic); e2 = lerp(e2, 0.7 + 0.4 * Math.sin(T0 * 11 + side), panic); }
        if (pz.cower > 0.01) { sa = lerp(sa, 2.75, pz.cower); e2 = lerp(e2, 1.9, pz.cower); ab = lerp(ab, 0.15, pz.cower); }
        if (lieB > 0.01) { sa = lerp(sa, 2.9, lieB); e2 = lerp(e2, 1.9, lieB); ab = lerp(ab, 0.8, lieB); }
        if (startle > 0.01) { sa += startle * 0.9; ab += startle * 0.3; }
        if (dead > 0.001) { const r1 = hash1(id * 7.1 + side), r2 = hash1(id * 3.3 + side * 4), k = Math.min(1, dead * 2); sa = lerp(sa, (r1 - 0.3) * 1.6, k); e2 = lerp(e2, 0.2 + r2 * 0.9, k); ab = lerp(ab, 0.5 + r2 * 0.5, k); }
        sa += hit * 0.4; sa = sm('sa' + side, sa, dead > 0.001 ? 10 : 24); e2 = sm('e' + side, e2, dead > 0.001 ? 10 : 24); ab = sm('ab' + side, ab, 18);
        const slv = L.jacket != null ? L.jacket : L.sleeve, skc = L.skin, nm = side < 0 ? 'L' : 'R', sh = sm('shr' + side, shr, 12) + (act === 'laugh' ? Math.sin(T0 * 18) * 0.012 * actB : 0);
        frame(this.HP, this.CH, side * 0.215, 0.28 + sh, 0, -sa, 0, side * ab);
        put('shoulder' + nm, i, this.HP, 0, 0, 0, 0.12, 0.12, 0.12, c.setHex(slv));
        put('uArm' + nm, i, this.HP, 0, 0, 0, 0.1, UA, 0.1, c.setHex(slv));
        frame(this.FL, this.HP, 0, -UA, 0, e2, 0, 0);
        const long = L.longSleeve || L.jacket != null; put('fArm' + nm, i, this.FL, 0, 0, 0, 0.085, FA, 0.085, c.setHex(long ? slv : skc));
        frame(this.TMP, this.FL, 0, -FA, 0, 0, 0, 0); put('hand' + nm, i, this.TMP, 0, -0.035, 0, 0.085, 0.1, 0.065, c.setHex(skc));
        if (side > 0) this.RF.copy(this.FL);
      };
      arm(-1); arm(1);
      const gk = h.gun ? (h.gun.model || (h.gun.len <= 0.35 ? 'pistol' : (h.gun.two ? 'rifle' : 'pistol'))) : null; let placed = false;
      if (gk && typeof Guns !== 'undefined' && Guns.initDone && Guns.models[gk]) {
        const rel = h.gun.relax !== undefined ? h.gun.relax : (h.gun.two ? 0.55 : 0.25), th = lerp(rel, Math.PI / 2, aimB) - recoil * 0.1 + reloading * 0.25; l.makeTranslation(0, -FA - 0.03, 0); this.TMP.multiplyMatrices(this.RF, l); l.makeRotationX(th); this.G1.multiplyMatrices(this.TMP, l);
        placed = Guns.place(h, gk, this.G1, recoil, pz.reloadP === undefined ? null : pz.reloadP, !!pz.empty);
      }
      const item = placed ? null : h.gun || (pz.phone > 0.4 || (act === 'text' && actB > 0.4) ? PHONE : act === 'drink' && actB > 0.4 ? CUP : act === 'smoke' && actB > 0.4 ? CIG : act === 'fish' && actB > 0.4 ? ROD : null);
      if (item) {
        const gr = (item === PHONE || item === CUP || item === CIG) ? 0 : item === ROD ? -0.7 : lerp(item.two ? -0.75 : -1.45, 0, aimB) - reloading * 0.4 + recoil * 0.12, len = item.len || 0.3;
        l.makeRotationX(gr); this.TMP.multiplyMatrices(this.RF, l); l.makeTranslation(0, -FA - 0.02, 0); this.TMP.multiply(l);
        l.makeScale(item.w || 0.055, len, item.d || 0.09); this.m.multiplyMatrices(this.TMP, l); M.gun.setMatrixAt(i, this.m); M.gun.setColorAt(i, c.setHex(item.col || 0x1b1b1f));
      } else hide('gun', i);
      // ---------- legs
      const legFrame = (side, a, b, f, lat) => {
        frame(this.HP, this.PV, side * 0.095, -0.03, 0, -a, 0, side * (0.03 + 0.05 * crouch + (dead > 0.1 ? dead * 0.2 : 0) + (drive === 'bike' ? 0.2 : 0)) + lat);
        const nm = side < 0 ? 'L' : 'R';
        put('thigh' + nm, i, this.HP, 0, 0, 0, 0.19, L1, 0.19, c.setHex(L.dress ? L.skin : L.pants));
        frame(this.KN, this.HP, 0, -L1, 0, b, 0, 0); put('shin' + nm, i, this.KN, 0, 0, 0, 0.14, L2, 0.14, c.setHex(L.shorts || L.dress ? L.skin : L.pants));
        const toe = -0.35 * Math.max(0, -Math.sin(f)) * mv - 0.14 * Math.max(0, Math.cos(f)) * mv + (act === 'tap' && side > 0 ? Math.max(0, Math.sin(T0 * 10)) * 0.35 * actB : 0);
        frame(this.FT, this.KN, 0, -L2, 0, (a - b) + toe, 0, 0);
        put('foot' + nm, i, this.FT, 0, -0.035, 0.075, 0.1, 0.075, 0.27, c.setHex(L.shoe != null ? L.shoe : 0x222222));
      };
      legFrame(-1, aL, bL, fL, latL); legFrame(1, aR, bR, fR, latR);
      if (h.umb && !dead) { put('umb', i, this.CH, 0.05, 0.95, 0, 1.15, 1, 1.15, c.setHex(h.umbCol || 0xff4fa3)); put('pole', i, this.CH, 0.05, 0.7, 0, 0.03, 0.75, 0.03, c.setHex(0x222222)); } else { hide('umb', i); hide('pole', i); }
      l.compose(p.set(h.x, (h.y || 0) + 0.04, h.z), q.identity(), s.set(dead || lieB > 0.5 ? 1.6 : 0.85, 1, dead || lieB > 0.5 ? 0.8 : 0.85)); M.blob.setMatrixAt(i, l); M.blob.setColorAt(i, c.setHex(0));
    }
    for (const k in M) { M[k].instanceMatrix.needsUpdate = true; if (M[k].instanceColor) M[k].instanceColor.needsUpdate = true; }
    if (typeof Guns !== 'undefined' && Guns.initDone) Guns.end();
  },
};

const SKINS = [0xf1c9a5, 0xe0ac7e, 0xc68a5a, 0x9b6a45, 0x6f4a30, 0x4a3223, 0xf6d7bd];
const HAIRS = [0x1b1411, 0x3a2418, 0x6b4423, 0xb8863b, 0xd9c27a, 0x8a8a8a, 0x0c0c0c, 0xa5442b];
const BRIGHTS = [0xff4fa3, 0x27e1d0, 0xffd23f, 0xff7a3a, 0x7a6bff, 0x4ad66d, 0xff5a5a, 0x4aa8ff, 0xffffff];
const MUTED = [0x5b6b7a, 0x8a7b6b, 0x6b8a7b, 0x7a5b6b, 0xb5a98a, 0x3a4a5a, 0x9a9a9a, 0xc8b8a0];
const JEANS = [0x2f4a7a, 0x3a3f4a, 0x1d2b44, 0x6a7a8a, 0x45352a, 0xd8cdb8, 0x1a1a1a];
const STYLES = ['short', 'short', 'short', 'buzz', 'long', 'long', 'ponytail', 'afro', 'bun', 'bald'];
function makeLook(kind) {
  const skin = pick(SKINS), hair = pick(HAIRS), style = pick(STYLES);
  const o = { skin, hair, style, shirt: pick(BRIGHTS), sleeve: 0, pants: pick(JEANS), hat: null, hatType: 'cap', scale: rr(0.93, 1.07), build: rr(0.92, 1.12), shoe: pick([0x222222, 0xf4f4f4, 0x3a2a1c, 0xd02a2a, 0x2a4a8a]),
    beard: style !== 'long' && style !== 'bun' && chance(0.2), shades: chance(0.2), shorts: false, dress: false, jacket: null, tie: null, belt: chance(0.5) ? 0x2a1f16 : null, bag: chance(0.1) ? pick([0x2a4a8a, 0xd02a2a, 0x222222, 0x3a6a3a]) : null, longSleeve: chance(0.3) };
  const hot = () => { o.shorts = chance(0.5); };
  switch (kind) {
    case 'suit': o.shirt = pick([0x2a2f3a, 0x3a3f4a, 0x1d2b44, 0x4a4a52]); o.pants = o.shirt; o.jacket = o.shirt; o.tie = pick([0xc0262d, 0x1d4fa0, 0x7a2a8a, 0xe8c030]); o.belt = 0x111111; o.shoe = 0x15110e; o.bag = chance(0.3) ? 0x2a1f16 : null; break;
    case 'bellhop': o.shirt = 0x8c1d2f; o.pants = 0x22222a; o.jacket = 0x8c1d2f; o.hat = 0x8c1d2f; o.hatType = 'pill'; o.belt = 0xd8b040; break;
    case 'uniformBlue': o.shirt = 0x4aa8ff; o.pants = 0xeeeeee; o.shoe = 0xf4f4f4; break;
    case 'black': o.shirt = 0x1a1a1f; o.pants = 0x1a1a1f; o.longSleeve = true; break;
    case 'apron': o.shirt = pick([0xffffff, 0xffd23f, 0xff5a5a]); o.pants = 0x2a2a30; o.jacket = chance(0.5) ? 0xe8e4d8 : null; break;
    case 'overalls': o.shirt = 0x2a5a9a; o.pants = 0x2a5a9a; o.hat = 0xf5c400; o.hatType = 'hard'; o.longSleeve = true; o.shoe = 0x3a2a1c; break;
    case 'hivis': o.shirt = 0xff9a1a; o.pants = 0x4a3f2a; o.jacket = 0xff9a1a; o.hat = 0xf5d400; o.hatType = 'hard'; o.shoe = 0x3a2a1c; break;
    case 'lifeguard': o.shirt = 0xff3b3b; o.pants = 0xff3b3b; o.shorts = true; o.style = 'short'; o.shades = true; break;
    case 'hawaiian': o.shirt = pick([0xff4fa3, 0x27e1d0, 0xffd23f, 0xff7a3a]); o.pants = pick([0xe8dcc0, 0x4aa8ff, 0xffffff]); hot(); if (chance(.5)) { o.hat = pick([0xffe7a0, 0xffffff, 0xff4fa3]); o.hatType = 'straw'; } o.shades = chance(0.5); o.bag = chance(0.3) ? 0xd02a2a : null; break;
    case 'pastel': o.shirt = pick([0xf6b6c8, 0xa7e3d6, 0xfbe39b, 0xb5d3f2]); o.pants = pick([0xd8cdb8, 0xffffff, 0x9a9a9a]); o.hair = 0xcfcfcf; if (chance(.5)) { o.hat = 0xf5e9c0; o.hatType = 'straw'; } break;
    case 'jogger': o.shirt = pick(BRIGHTS); o.pants = pick([0x1a1a1a, 0x2a2f6a]); o.shorts = true; o.belt = null; o.longSleeve = false; o.shoe = 0xf4f4f4; if (chance(.4)) { o.hat = pick(BRIGHTS); o.hatType = 'cap'; } break;
    case 'scrubs': o.shirt = 0x4ac8c0; o.pants = 0x4ac8c0; o.shoe = 0xf4f4f4; break;
    case 'guard': o.shirt = 0x1a2540; o.pants = 0x14182a; o.jacket = 0x1a2540; o.hat = 0x14182a; o.hatType = 'cap'; o.belt = 0x111111; o.shoe = 0x111111; o.shades = false; break;
    case 'cop': o.shirt = 0x1c3a78; o.pants = 0x14264f; o.jacket = 0x1c3a78; o.hat = 0x0f1a36; o.hatType = 'cap'; o.belt = 0x111111; o.shoe = 0x111111; o.shades = chance(0.5); break;
    case 'swat': o.shirt = 0x1a1a1a; o.pants = 0x1a1a1a; o.jacket = 0x23262b; o.hat = 0x111111; o.hatType = 'helmet'; o.belt = 0x111111; o.shoe = 0x0a0a0a; o.shades = true; break;
    case 'player': o.scale = 1; o.build = 1; o.shirt = 0xfff5e0; o.pants = 0x2a9ad6; o.shorts = true; o.hat = 0xff4fa3; o.hatType = 'cap'; o.hair = 0x1b1411; o.skin = 0xe0ac7e; o.style = 'short'; o.beard = false; o.shades = true; o.belt = null; o.shoe = 0xf4f4f4; o.jacket = null; break;
    case 'partier': o.shirt = pick([0xff4fa3, 0x7a6bff, 0x27e1d0, 0x111111]); o.pants = pick([0x111111, 0x2a2f6a]); o.jacket = chance(0.4) ? 0x111111 : null; o.shades = chance(0.4); break;
    case 'bagman': o.shirt = 0x111111; o.pants = 0x111111; o.jacket = 0x111111; break;
    default: if (chance(.4)) o.shirt = pick(MUTED); if (chance(0.5) && (style === 'long' || style === 'ponytail' || style === 'bun')) { o.dress = true; o.dressCol = pick([...BRIGHTS, ...MUTED]); } else if (chance(0.3)) hot(); if (chance(0.25)) { o.hat = pick(BRIGHTS); o.hatType = 'cap'; } break;
  }
  o.sleeve = (o.jacket != null || o.longSleeve) ? o.shirt : (chance(0.55) ? o.shirt : o.skin);
  if (o.dress) { o.sleeve = chance(0.5) ? o.dressCol : o.skin; }
  return refineLook(o, kind);
}

// ---- realism pass applied AFTER makeLook's seeded draws (uses hashes only, so RNG streams / world layout / old saves are unaffected)
const REAL_SHIRTS = [0xf2f2f2, 0xf2f2f2, 0x1a1a1f, 0x2b3a55, 0x2b3a55, 0x7a7f85, 0xcdb99a, 0x5a6b45, 0x8c2f39, 0x3f6e8c, 0xd9c7a0, 0x9a9a9a, 0xb34a3a, 0x4a7a5a, 0xe8d37a, 0xc7d6e8, 0xa05a2c, 0x6a5a8a];
const REAL_PANTS = [0x2f4a7a, 0x3a3f4a, 0x1d2b44, 0x6a7a8a, 0x45352a, 0xd8cdb8, 0x1a1a1a, 0xcbb994, 0x2a2a2a, 0x5a4a3a, 0x3a4a3a, 0xe8e4d8];
const REAL_DRESS = [0xb5465f, 0x2f5d8a, 0x1f1f24, 0xf2f2f2, 0x6a8a5a, 0xd9a0b0, 0xe8c8a0, 0x7a5a9a, 0xc84a3a, 0x3f8a8a];
const EYES = [0x2a1a10, 0x2a1a10, 0x3b2615, 0x4a6a8a, 0x4a7a5a, 0x6a5a3a];
const SPECIAL_KINDS = ['suit', 'bellhop', 'uniformBlue', 'black', 'apron', 'overalls', 'hivis', 'lifeguard', 'scrubs', 'guard', 'cop', 'swat', 'player', 'bagman', 'hawaiian', 'pastel', 'jogger', 'partier'];
function tweakHex(hex, r1, r2, r3) { const c = new T.Color(hex), hsl = {}; c.getHSL(hsl); hsl.l = clamp(hsl.l * (1 + (r1 - 0.5) * 0.24), 0.03, 0.97); hsl.s = clamp(hsl.s * (1 + (r2 - 0.5) * 0.34), 0, 1); hsl.h = (hsl.h + (r3 - 0.5) * 0.02 + 1) % 1; c.setHSL(hsl.h, hsl.s, hsl.l); return c.getHex(); }
function refineLook(o, kind) {
  if (kind === 'player') return o;
  const seed = ((o.skin * 31 + o.shirt * 17 + o.pants * 13 + o.hair * 7 + (o.shoe || 0) * 3) | 0), h = n => hashN(seed + n * 7919, n * 977 + (o.style ? o.style.length * 31 : 0));
  const casual = !SPECIAL_KINDS.includes(kind);
  if (kind === 'hawaiian') { o.shirt = [0x2f7a8a, 0xd9534f, 0xe8b04a, 0x3f7a5a, 0x2b4a7a, 0xf2f2f2, 0xc9715a, 0x6a9a9a][Math.floor(h(30) * 8)]; if (o.sleeve !== o.skin) o.sleeve = o.shirt; o.pants = [0xe8dcc0, 0x2b4a7a, 0xcbb994, 0xf2f2f2, 0x5a6a5a][Math.floor(h(31) * 5)]; if (o.hat != null) o.hat = [0xe8d8a0, 0xf2f2f2, 0xc9a96a][Math.floor(h(32) * 3)]; }
  else if (kind === 'jogger') { o.shirt = [0x1a1a1f, 0xf2f2f2, 0x2b4a7a, 0xd9534f, 0x3f8a5a, 0x7a7f85, 0xe8b04a, 0xff7a3a][Math.floor(h(33) * 8)]; o.sleeve = o.longSleeve ? o.shirt : (h(34) < 0.5 ? o.shirt : o.skin); o.pants = [0x1a1a1a, 0x2a2f4a, 0x4a4f55, 0x1d2b44][Math.floor(h(35) * 4)]; if (o.hat != null) o.hat = [0x1a1a1f, 0xf2f2f2, 0xd9534f, 0x2b4a7a][Math.floor(h(36) * 4)]; }
  if (casual) {
    if (BRIGHTS.includes(o.shirt) && h(1) < 0.82) o.shirt = REAL_SHIRTS[Math.floor(h(2) * REAL_SHIRTS.length)];
    if (h(3) < 0.4) o.pants = REAL_PANTS[Math.floor(h(4) * REAL_PANTS.length)];
    if (o.dress && o.dressCol != null && BRIGHTS.includes(o.dressCol) && h(5) < 0.8) o.dressCol = REAL_DRESS[Math.floor(h(6) * REAL_DRESS.length)];
    o.sleeve = (o.jacket != null || o.longSleeve) ? o.shirt : (o.sleeve === o.skin ? o.skin : o.shirt); if (o.dress) o.sleeve = o.sleeve === o.skin ? o.skin : (o.dressCol != null ? o.dressCol : o.shirt);
    if (h(7) < 0.13) { o.hair = h(8) < 0.5 ? 0x9a9a9a : 0xd8d8d8; o.scale *= 0.985; o.build *= 1.05; }
    if (h(9) < 0.12) o.build *= 1.15; else if (h(10) < 0.1) o.build *= 0.9;
  }
  const fem = o.dress || ['long', 'ponytail', 'bun'].includes(o.style) || (casual && h(11) < 0.05);
  if (kind !== 'cop' && kind !== 'swat') { if (fem) { o.scale *= 0.945; o.build *= 0.94; o.fem = true; o.beard = false; } else o.scale *= 1.015; }
  // subtle natural variation so no two people share exact colours
  const skinOld = o.skin; o.skin = tweakHex(o.skin, h(12), h(13), h(14)); if (o.sleeve === skinOld) o.sleeve = o.skin;
  if (o.dress && o.dressCol != null) o.dressCol = tweakHex(o.dressCol, h(15), h(16), 0.5);
  if (casual) { const oldShirt = o.shirt; o.shirt = tweakHex(o.shirt, h(17), h(18), h(19)); if (o.sleeve === oldShirt) o.sleeve = o.shirt; if (o.jacket === oldShirt) o.jacket = o.shirt; if (o.pants === oldShirt) o.pants = o.shirt; else o.pants = tweakHex(o.pants, h(20), h(21), 0.5); }
  o.hair = tweakHex(o.hair, h(22), h(23), h(24)); o.eye = EYES[Math.floor(h(25) * EYES.length)];
  o.hw = 0.9 + h(40) * 0.2; o.nz = 0.78 + h(41) * 0.55; o.brw = 0.7 + h(42) * 0.9; o.mw = 0.84 + h(43) * 0.34; o.scale *= 0.965 + h(44) * 0.07; // unique face + height
  return o;
}
function newPose() { return { J: {}, sec: { x: 0, vx: 0, z: 0, vz: 0 }, anger: 0, fear: 0, smile: 0, swingSide: 1, hitF: 1, hitS: 0, draw: 0, landT: 0, exert: 0, walk: 0, phase: Math.random() * 6, aim: 0, aimPitch: 0, hands: 0, dead: 0, phone: 0, wave: 0, crouch: 0, cower: 0, hammer: 0, look: 0, hit: 0, swing: 0 }; }

// ray vs humans: returns {t,actor,part} nearest, ignoring `skip`
function rayHumans(ox, oy, oz, dx, dy, dz, maxT, skip) {
  let best = null;
  const test = (a, cx, cy, cz, rad, part) => {
    const lx = cx - ox, ly = cy - oy, lz = cz - oz, tc = lx * dx + ly * dy + lz * dz; if (tc < 0 || tc > maxT) return;
    const d2c = lx * lx + ly * ly + lz * lz - tc * tc; if (d2c > rad * rad) return;
    const t = tc - Math.sqrt(rad * rad - d2c); if (t >= 0 && (!best || t < best.t)) best = { t, actor: a, part };
  };
  for (const a of G.actives) {
    if (a === skip || a.state === 'dead' || !a.alive || a.hidden) continue;
    if (Math.abs(a.x - ox) > maxT + 2 || Math.abs(a.z - oz) > maxT + 2) continue;
    const y = a.y || 0, hs = (a.look && a.look.scale) || 1, crouch = (a.pose && a.pose.crouch) || 0, dy2 = crouch * 0.5;
    test(a, a.x, y + (1.72 - dy2) * hs, a.z, 0.17, 'head'); test(a, a.x, y + (1.38 - dy2) * hs, a.z, 0.28, 'body'); test(a, a.x, y + (0.98 - dy2 * 0.6) * hs, a.z, 0.26, 'body'); test(a, a.x, y + 0.45 * hs, a.z, 0.2, 'legs');
  }
  return best;
}
