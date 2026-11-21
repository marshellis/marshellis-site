'use strict';
// ===== World: terrain, sea, sky, roads, buildings, vegetation, collision, pedestrian routing =====

// ---------- coastline signed distance (positive = land) ----------
function shoreX(z) { return 600 + 60 * Math.sin(z / 210) + 30 * Math.sin(z / 83 + 1.7); }
function westX(z) { return -1500 + 40 * Math.sin(z / 170) + 20 * Math.sin(z / 61); }
function northZ(x) { return -1500 + 30 * Math.sin(x / 190) + 15 * Math.sin(x / 70); }
function southZ(x) { return 500 + 30 * Math.sin(x / 130) + 18 * Math.sin(x / 47); }
const KEYS = [{ x: -10, z: 600, r: 50 }, { x: 40, z: 690, r: 55 }, { x: -30, z: 790, r: 60 }, { x: 10, z: 895, r: 70 }];
const PIER = { x0: 0, z0: 30, z1: 52, y: 0.55 };
function landSD(x, z) {
  let sd = Math.min(shoreX(z) - x, x - westX(z), z - northZ(x), southZ(x) - z);
  for (const k of KEYS) sd = Math.max(sd, k.r - Math.hypot(x - k.x, z - k.z));
  if (z > 470 && z < 960) sd = Math.max(sd, Math.min(16 - Math.abs(x), z - 470));
  return sd;
}
function onPier(x, z) { return z > PIER.z0 && z < PIER.z1 && x > PIER.x0 && x < PIER.x0 + 400; }
function groundY(x, z) { return onPier(x, z) && x > shoreX(z) - 30 ? PIER.y : 0; }
function walkable(x, z) { return landSD(x, z) > -2 || (onPier(x, z) && x > shoreX(z) - 30); }
const DT = { x0: 30, x1: 340, z0: -260, z1: 180 }; // downtown rectangle
const WB = { x0: -1580, z0: -1580, w: 2340, h: 2640 }; // world bounding box (terrain, map)
const GI = [-20, 10], GJ = [-20, 14];
function inTampa(x, z) { return x > -1480 && x < -1030 && z > -470 && z < 430; }
function zoneAt(x, z) {
  const sd = landSD(x, z);
  if (sd < 0) return 'sea';
  if (z > 480) return 'keys';
  if (x < -380) return inTampa(x, z) ? (sd < 70 ? 'beach' : 'tampa') : 'swamp';
  if (sd < 70) return 'beach';
  if (z < -1010) return 'orlando';
  if (x > DT.x0 && x < DT.x1 && z > DT.z0 && z < DT.z1) return 'downtown';
  if (x > shoreX(z) - 330 && z > -520 && z < 440) return 'deco';
  if (z > 300 && z < 480 && x > -300 && x < 230) return 'industrial';
  return 'suburb';
}
function roadOK(x, z) {
  const sd = landSD(x, z);
  if (sd < 9) return false;
  if (x < -392 && !inTampa(x, z)) return Math.abs(z) < 1;
  return true;
}

// ---------- collision: spatial hash of AABBs ----------
const SOL = { map: new Map(), list: [], stamp: 0 };
function solKey(gx, gz) { return (gx + 100) * 1000 + (gz + 100); }
function addSolid(x0, z0, x1, z1, h, tag) {
  const s = { x0, z0, x1, z1, h, tag: tag || '', off: false, v: 0 };
  for (let gx = Math.floor(x0 / 32); gx <= Math.floor(x1 / 32); gx++) for (let gz = Math.floor(z0 / 32); gz <= Math.floor(z1 / 32); gz++) {
    const k = solKey(gx, gz); let a = SOL.map.get(k); if (!a) { a = []; SOL.map.set(k, a); } a.push(s);
  }
  SOL.list.push(s);
  if (h > 8 && /tower|hotel|midrise|warehouse|garage|convention|mall|condo|hospital|police/.test(s.tag) && typeof chunkOf === 'function') {
    const ch = chunkOf((x0 + x1) / 2, (z0 + z1) / 2).plain;
    for (const [wd, col, y] of [[2.6, 0xb7b5ad, 0.165], [1.1, 0x9c9a92, 0.168]]) { ch.flat(x0 - wd, z0 - wd, x1 + wd, z0, y, col); ch.flat(x0 - wd, z1, x1 + wd, z1 + wd, y, col); ch.flat(x0 - wd, z0, x0, z1, y, col); ch.flat(x1, z0, x1 + wd, z1, y, col); }
  }
  return s;
}
function forSolids(x, z, r, fn) {
  const st = ++SOL.stamp;
  for (let gx = Math.floor((x - r) / 32); gx <= Math.floor((x + r) / 32); gx++) for (let gz = Math.floor((z - r) / 32); gz <= Math.floor((z + r) / 32); gz++) {
    const a = SOL.map.get(solKey(gx, gz)); if (!a) continue;
    for (let i = 0; i < a.length; i++) { const s = a[i]; if (s.v === st || s.off) continue; s.v = st; fn(s); }
  }
}
const _rc = { hit: false, nx: 0, nz: 0, depth: 0 };
function resolveCircle(p, r, y = 0, maxPush = 99) {
  _rc.hit = false; _rc.nx = 0; _rc.nz = 0; _rc.depth = 0;
  forSolids(p.x, p.z, r, s => {
    if (y >= s.h) return;
    const cx = clamp(p.x, s.x0, s.x1), cz = clamp(p.z, s.z0, s.z1), dx = p.x - cx, dz = p.z - cz, dd = dx * dx + dz * dz;
    if (dd >= r * r) return;
    let nx, nz, pen;
    if (dd > 1e-8) { const d = Math.sqrt(dd); nx = dx / d; nz = dz / d; pen = r - d; }
    else { const l = p.x - s.x0, rt = s.x1 - p.x, t = p.z - s.z0, b = s.z1 - p.z, m = Math.min(l, rt, t, b); if (m === l) { nx = -1; nz = 0; pen = l + r; } else if (m === rt) { nx = 1; nz = 0; pen = rt + r; } else if (m === t) { nx = 0; nz = -1; pen = t + r; } else { nx = 0; nz = 1; pen = b + r; } }
    pen = Math.min(pen, maxPush);
    p.x += nx * pen; p.z += nz * pen; _rc.hit = true; _rc.nx += nx; _rc.nz += nz; _rc.depth = Math.max(_rc.depth, pen);
  });
  return _rc;
}
// segment blocked by solids? returns t (0..1) of first hit or -1
function rayHitSolid(ax, ay, az, bx, by, bz) {
  const dx = bx - ax, dy = by - ay, dz = bz - az, len = Math.hypot(dx, dy, dz); if (len < 0.01) return -1;
  const steps = Math.ceil(len / 0.8); let hit = -1;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps, x = ax + dx * t, y = ay + dy * t, z = az + dz * t;
    if (y < 0) { return t; }
    forSolids(x, z, 0.05, s => { if (hit < 0 && x >= s.x0 && x <= s.x1 && z >= s.z0 && z <= s.z1 && y < s.h) hit = t; });
    if (hit >= 0) return hit;
  }
  return -1;
}
function losClear(ax, az, bx, bz, h = 1.5) { return rayHitSolid(ax, h, az, bx, h, bz) < 0; }

// ---------- geometry builder (merged, vertex coloured) ----------
const _cc = new T.Color(); const _colCache = new Map();
function rgb(c) { if (typeof c === 'object') return c; let o = _colCache.get(c); if (!o) { _cc.setHex(c); o = { r: _cc.r, g: _cc.g, b: _cc.b }; _colCache.set(c, o); } return o; }
class GB {
  constructor() { this.p = []; this.n = []; this.u = []; this.c = []; this.i = []; }
  vtx(x, y, z, nx, ny, nz, u, v, c) { this.p.push(x, y, z); this.n.push(nx, ny, nz); this.u.push(u, v); this.c.push(c.r, c.g, c.b); }
  quad(a, b, c, d, n, col, uv) { // a,b,c,d [x,y,z] ccw seen from outside, n normal
    const s = this.p.length / 3, k = rgb(col);
    this.vtx(a[0], a[1], a[2], n[0], n[1], n[2], uv[0], uv[1], k); this.vtx(b[0], b[1], b[2], n[0], n[1], n[2], uv[2], uv[3], k);
    this.vtx(c[0], c[1], c[2], n[0], n[1], n[2], uv[4], uv[5], k); this.vtx(d[0], d[1], d[2], n[0], n[1], n[2], uv[6], uv[7], k);
    this.i.push(s, s + 1, s + 2, s, s + 2, s + 3);
  }
  quadC(a, b, c, d, n, cols, uv) { const s = this.p.length / 3, P = [a, b, c, d]; for (let k = 0; k < 4; k++) this.vtx(P[k][0], P[k][1], P[k][2], n[0], n[1], n[2], uv[k * 2], uv[k * 2 + 1], cols[k]); this.i.push(s, s + 1, s + 2, s, s + 2, s + 3); }
  quadAuto(a, b, c, d, col) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1;
    this.quad(a, b, c, d, [nx / l, ny / l, nz / l], col, [.015, .015, .015, .015, .015, .015, .015, .015]);
  }
  tri(a, b, c, col) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const s = this.p.length / 3, k = rgb(col);
    this.vtx(a[0], a[1], a[2], nx, ny, nz, .015, .015, k); this.vtx(b[0], b[1], b[2], nx, ny, nz, .015, .015, k); this.vtx(c[0], c[1], c[2], nx, ny, nz, .015, .015, k);
    this.i.push(s, s + 1, s + 2);
  }
  box(x0, y0, z0, x1, y1, z1, col, win = false, top = null) {
    const U = 8, V = 7, tc = top == null ? col : top, e = .015;
    const su = (a, b) => win ? [a / U, y0 / V, b / U, y0 / V, b / U, y1 / V, a / U, y1 / V] : [e, e, e, e, e, e, e, e];
    const ao = win && (y1 - y0) > 5 && y0 < 1, ym = y0 + 3.8, k = rgb(col), dk = { r: k.r * .5, g: k.g * .5, b: k.b * .5 }, md = { r: k.r * .88, g: k.g * .88, b: k.b * .88 };
    const sideQ = (bx, bz, cx, cz, n, ua, ub) => {
      if (!ao) { this.quad([bx, y0, bz], [cx, y0, cz], [cx, y1, cz], [bx, y1, bz], n, col, su(ua, ub)); return; }
      this.quadC([bx, y0, bz], [cx, y0, cz], [cx, ym, cz], [bx, ym, bz], n, [dk, dk, md, md], [ua / U, y0 / V, ub / U, y0 / V, ub / U, ym / V, ua / U, ym / V]);
      this.quadC([bx, ym, bz], [cx, ym, cz], [cx, y1, cz], [bx, y1, bz], n, [md, md, k, k], [ua / U, ym / V, ub / U, ym / V, ub / U, y1 / V, ua / U, y1 / V]);
    };
    this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], tc, [e, e, e, e, e, e, e, e]);
    sideQ(x0, z1, x1, z1, [0, 0, 1], x0, x1); sideQ(x1, z0, x0, z0, [0, 0, -1], -x1, -x0); sideQ(x1, z1, x1, z0, [1, 0, 0], -z1, -z0); sideQ(x0, z0, x0, z1, [-1, 0, 0], z0, z1);
  }
  ceil(x0, z0, x1, z1, y, col) { this.quad([x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], [0, -1, 0], col, [.015, .015, .015, .015, .015, .015, .015, .015]); }
  flat(x0, z0, x1, z1, y, col) { this.quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], [0, 1, 0], col, [.015, .015, .015, .015, .015, .015, .015, .015]); }
  // arbitrary rotated flat quad (centre, half-sizes, rotation)
  flatRot(cx, cz, hw, hd, rot, y, col) {
    const c = Math.cos(rot), s = Math.sin(rot), P = (lx, lz) => [cx + lx * c + lz * s, y, cz - lx * s + lz * c];
    this.quad(P(-hw, hd), P(hw, hd), P(hw, -hd), P(-hw, -hd), [0, 1, 0], col, [.015, .015, .015, .015, .015, .015, .015, .015]);
  }
  cyl(cx, cz, r0, r1, y0, y1, col, seg = 8, capTop = true) {
    const k = rgb(col), e = .015;
    for (let s = 0; s < seg; s++) {
      const a0 = s / seg * TAU, a1 = (s + 1) / seg * TAU, c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1), base = this.p.length / 3;
      this.vtx(cx + c0 * r0, y0, cz + s0 * r0, c0, 0, s0, e, e, k); this.vtx(cx + c1 * r0, y0, cz + s1 * r0, c1, 0, s1, e, e, k);
      this.vtx(cx + c1 * r1, y1, cz + s1 * r1, c1, 0, s1, e, e, k); this.vtx(cx + c0 * r1, y1, cz + s0 * r1, c0, 0, s0, e, e, k);
      this.i.push(base, base + 2, base + 1, base, base + 3, base + 2);
      if (capTop && r1 > 0.01) { const b2 = this.p.length / 3; this.vtx(cx, y1, cz, 0, 1, 0, e, e, k); this.vtx(cx + c1 * r1, y1, cz + s1 * r1, 0, 1, 0, e, e, k); this.vtx(cx + c0 * r1, y1, cz + s0 * r1, 0, 1, 0, e, e, k); this.i.push(b2, b2 + 1, b2 + 2); }
    }
  }
  wheel(cx, cy, cz, r, wd, col, hub, seg = 12) { // cylinder along x axis
    const k = rgb(col), hk = rgb(hub), e = .015, x0 = cx - wd / 2, x1 = cx + wd / 2;
    for (let s = 0; s < seg; s++) {
      const a0 = s / seg * TAU, a1 = (s + 1) / seg * TAU, y0 = cy + Math.sin(a0) * r, z0 = cz + Math.cos(a0) * r, y1 = cy + Math.sin(a1) * r, z1 = cz + Math.cos(a1) * r, n0y = Math.sin(a0), n0z = Math.cos(a0), n1y = Math.sin(a1), n1z = Math.cos(a1), b = this.p.length / 3;
      this.vtx(x0, y0, z0, 0, n0y, n0z, e, e, k); this.vtx(x1, y0, z0, 0, n0y, n0z, e, e, k); this.vtx(x1, y1, z1, 0, n1y, n1z, e, e, k); this.vtx(x0, y1, z1, 0, n1y, n1z, e, e, k); this.i.push(b, b + 1, b + 2, b, b + 2, b + 3);
      for (const [x, nx, ord] of [[x1 + 0.005, 1, 0], [x0 - 0.005, -1, 1]]) { const c2 = this.p.length / 3, rr2 = r * 0.62; this.vtx(x, cy, cz, nx, 0, 0, e, e, hk); this.vtx(x, cy + Math.sin(a0) * rr2, cz + Math.cos(a0) * rr2, nx, 0, 0, e, e, hk); this.vtx(x, cy + Math.sin(a1) * rr2, cz + Math.cos(a1) * rr2, nx, 0, 0, e, e, hk); if (ord === 0) this.i.push(c2, c2 + 2, c2 + 1); else this.i.push(c2, c2 + 1, c2 + 2); }
    }
  }
  // gable roof: ridge along x if alongX else along z
  gable(x0, z0, x1, z1, y0, rh, col, alongX, over = 0.5) {
    x0 -= over; z0 -= over; x1 += over; z1 += over; const dark = rgb(col);
    if (alongX) {
      const zm = (z0 + z1) / 2;
      this.quadAuto([x0, y0, z1], [x1, y0, z1], [x1, y0 + rh, zm], [x0, y0 + rh, zm], col);
      this.quadAuto([x1, y0, z0], [x0, y0, z0], [x0, y0 + rh, zm], [x1, y0 + rh, zm], col);
      this.tri([x0, y0, z0], [x0, y0, z1], [x0, y0 + rh, zm], dark); this.tri([x1, y0, z1], [x1, y0, z0], [x1, y0 + rh, zm], dark);
    } else {
      const xm = (x0 + x1) / 2;
      this.quadAuto([x1, y0, z1], [x1, y0, z0], [xm, y0 + rh, z0], [xm, y0 + rh, z1], col);
      this.quadAuto([x0, y0, z0], [x0, y0, z1], [xm, y0 + rh, z1], [xm, y0 + rh, z0], col);
      this.tri([x0, y0, z1], [x1, y0, z1], [xm, y0 + rh, z1], dark); this.tri([x1, y0, z0], [x0, y0, z0], [xm, y0 + rh, z0], dark);
    }
  }
  build(mat, shadow = true) {
    if (!this.p.length) return null;
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(this.u, 2)); g.setAttribute('color', new T.Float32BufferAttribute(this.c, 3));
    g.setIndex(new T.BufferAttribute(new Uint32Array(this.i), 1)); g.computeBoundingSphere();
    const m = new T.Mesh(g, mat); m.castShadow = shadow; m.receiveShadow = true; return m;
  }
}

// ---------- textures & materials ----------
function makeBuildingTex() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  const e = document.createElement('canvas'); e.width = e.height = 256; const ge = e.getContext('2d'); const sc = document.createElement('canvas'); sc.width = sc.height = 256; const sg = sc.getContext('2d'); sg.fillStyle = '#1c1c1c'; sg.fillRect(0, 0, 256, 256);
  g.fillStyle = '#ececec'; g.fillRect(0, 0, 256, 256); ge.fillStyle = '#000'; ge.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 5000; i++) { const v = 200 + Math.random() * 50; g.fillStyle = `rgba(${v},${v},${v},.22)`; g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
  const lit = ['#ffd98a', '#ffe9b8', '#cfe6ff', '#ffc77a'];
  for (let cy = 0; cy < 2; cy++) for (let cx = 0; cx < 2; cx++) {
    const ox = cx * 128, oy = cy * 128;
    g.fillStyle = '#c4c4c0'; g.fillRect(ox, oy + 118, 128, 10); g.fillStyle = '#a8a8a4'; g.fillRect(ox, oy + 126, 128, 2); // floor slab + shadow line
    g.fillStyle = '#7d8691'; g.fillRect(ox + 22, oy + 20, 84, 78); g.fillStyle = '#b9c0c8'; g.fillRect(ox + 22, oy + 96, 84, 5); // frame + sill
    const gr = g.createLinearGradient(ox, oy + 26, ox + 128, oy + 94); gr.addColorStop(0, '#7f9fc4'); gr.addColorStop(.45, '#2b3f5c'); gr.addColorStop(1, '#52739c');
    g.fillStyle = gr; g.fillRect(ox + 27, oy + 25, 74, 68); sg.fillStyle = '#ffffff'; sg.fillRect(ox + 27, oy + 25, 74, 68); sg.fillStyle = '#9a9a9a'; sg.fillRect(ox + 22, oy + 96, 84, 5);
    const curt = Math.random(); if (curt < 0.45) { g.fillStyle = curt < 0.2 ? 'rgba(240,235,220,.85)' : 'rgba(200,120,110,.7)'; g.fillRect(ox + 27, oy + 25, 74, 18 + Math.random() * 20); }
    g.fillStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.moveTo(ox + 27, oy + 25); g.lineTo(ox + 62, oy + 25); g.lineTo(ox + 27, oy + 72); g.fill();
    g.fillStyle = '#7d8691'; g.fillRect(ox + 62, oy + 25, 4, 68); g.fillRect(ox + 27, oy + 58, 74, 3);
    if (Math.random() < 0.28) { g.fillStyle = '#8a8d90'; g.fillRect(ox + 40, oy + 100, 40, 14); g.fillStyle = '#5f6366'; for (let k = 0; k < 4; k++) g.fillRect(ox + 43 + k * 9, oy + 103, 6, 8); } // AC unit
    else if (Math.random() < 0.3) { g.fillStyle = '#d6d6d2'; g.fillRect(ox + 8, oy + 100, 112, 6); g.fillStyle = '#9a9a96'; for (let k = 0; k < 12; k++) g.fillRect(ox + 10 + k * 9.5, oy + 106, 2, 10); } // balcony rail
    if (Math.random() < 0.4) { ge.fillStyle = lit[(Math.random() * lit.length) | 0]; ge.fillRect(ox + 27, oy + 25, 74, 68); }
  }
  const t = new T.CanvasTexture(c), te = new T.CanvasTexture(e), ts = new T.CanvasTexture(sc);
  for (const x of [t, te, ts]) { x.wrapS = x.wrapT = T.RepeatWrapping; x.anisotropy = 8; x.magFilter = T.LinearFilter; }
  t.encoding = T.sRGBEncoding; te.encoding = T.sRGBEncoding;
  return [t, te, ts];
}
function makeRoadTex() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#3c4046'; g.fillRect(0, 0, 64, 256);
  for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(${Math.random() > .5 ? 255 : 0},${Math.random() > .5 ? 255 : 0},${Math.random() > .5 ? 255 : 0},.05)`; g.fillRect(Math.random() * 64, Math.random() * 256, 2, 2); }
  g.fillStyle = '#e8e8e8'; g.fillRect(3, 0, 3, 256); g.fillRect(58, 0, 3, 256);
  g.fillStyle = '#f5c400'; g.fillRect(29, 0, 2.5, 256); g.fillRect(33, 0, 2.5, 256); g.fillStyle = '#3c4046'; for (let k = 0; k < 256; k += 128) g.fillRect(28, k, 9, 70);
  g.fillStyle = '#e8e8e8'; for (let k = 0; k < 256; k += 128) { g.fillRect(14, k + 8, 2, 40); g.fillRect(46, k + 8, 2, 40); }
  const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 8; t.encoding = T.sRGBEncoding; return t;
}
function makeWaterNormal() {
  const N = 256, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'), img = g.createImageData(N, N);
  const h = (x, y) => { x = (x + N) % N; y = (y + N) % N; return Math.sin(x / N * TAU * 3) * Math.cos(y / N * TAU * 2) * 0.5 + Math.sin((x + y * 2) / N * TAU * 5) * 0.3 + Math.sin((x * 3 - y) / N * TAU * 4 + 1) * 0.2; };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = (h(x + 1, y) - h(x - 1, y)) * 3, dy = (h(x, y + 1) - h(x, y - 1)) * 3, l = Math.hypot(dx, dy, 1), i = (y * N + x) * 4;
    img.data[i] = (-dx / l * .5 + .5) * 255; img.data[i + 1] = (-dy / l * .5 + .5) * 255; img.data[i + 2] = (1 / l * .5 + .5) * 255; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0); const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(220, 220); return t;
}

const World = {
  scene: null, blocks: [], blockMap: new Map(), anchors: {}, parkedSpots: [], roadRuns: { v: [], h: [] }, special: {}, palms: [], trees: [],
  nodes: new Map(), neon: [], lamps: [], animated: [], lights: {}, mats: {},
};
const chunkMap = new Map();
function chunkOf(x, z) {
  const cx = Math.floor((x + 1700) / 320), cz = Math.floor((z + 1700) / 320), k = cx * 100 + cz; let c = chunkMap.get(k);
  if (!c) { c = { win: new GB(), plain: new GB(), glow: new GB() }; chunkMap.set(k, c); } return c;
}

// ---------- palette ----------
const PASTELS = [0xf6b6c8, 0xa7e3d6, 0xfbe39b, 0xb5d3f2, 0xf7c59f, 0xd9c2f0, 0xfdf3d0, 0xc6ecb2, 0xf2a9a0];
const STUCCO = [0xf3e5c7, 0xf4d9b5, 0xe9f0e1, 0xd9ecf2, 0xf5d0d0, 0xf8efd0, 0xe8dcc8, 0xcfe6d6];
const ROOFS = [0xb8553a, 0xa0462f, 0x6d747a, 0x8b5a3c, 0x4e5a63];
const GLASS = [0x9fb6c9, 0x7e97ad, 0xb7c7d4, 0x6f8aa3, 0xa8b3b8, 0xc9d3d6, 0x8fa4a8];

// ---------- block generation ----------
function genBlocks() {
  for (let i = GI[0]; i < GI[1]; i++) for (let j = GJ[0]; j < GJ[1]; j++) {
    const x0 = i * B + HALFR, x1 = (i + 1) * B - HALFR, z0 = j * B + HALFR, z1 = (j + 1) * B - HALFR, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const sd = Math.min(landSD(cx, cz), landSD(x0, z0), landSD(x1, z0), landSD(x0, z1), landSD(x1, z1));
    const zn0 = zoneAt(cx, cz); if (sd < 64 || cz > 470 || zn0 === 'swamp' || zn0 === 'keys' || zn0 === 'sea' || (Math.abs(cx - 260) < 100 && Math.abs(cz + 790) < 90)) continue;
    const b = { i, j, x0, x1, z0, z1, cx, cz, zone: zn0, kind: 'auto', tags: [], used: false };
    World.blocks.push(b); World.blockMap.set(i + ',' + j, b);
  }
}
const blockAt = (i, j) => World.blockMap.get(i + ',' + j);
function pickBlocks(filter, n, minSep) {
  const cand = World.blocks.filter(b => !b.used && filter(b)); const out = [];
  while (cand.length && out.length < n) {
    const k = Math.floor(rnd() * cand.length), b = cand.splice(k, 1)[0];
    if (out.every(o => Math.abs(o.i - b.i) + Math.abs(o.j - b.j) >= minSep)) { out.push(b); b.used = true; }
  }
  return out;
}
function assignSpecials() {
  const S = World.special, sub = b => b.zone === 'suburb', ind = b => b.zone === 'industrial';
  S.bank = [...pickBlocks(b => b.zone === 'downtown', 2, 3), ...pickBlocks(sub, 1, 2)];
  S.pawn = [...pickBlocks(sub, 3, 4), ...pickBlocks(ind, 1, 2), ...pickBlocks(b => b.zone === 'deco', 1, 2)];
  S.gas = [...pickBlocks(sub, 6, 3), ...pickBlocks(ind, 2, 2), ...pickBlocks(b => b.zone === 'deco', 1, 2)];
  S.hospital = pickBlocks(b => b.zone === 'downtown' && b.cx < 200, 1, 1);
  S.police = [...pickBlocks(b => b.zone === 'downtown', 1, 1), ...pickBlocks(sub, 1, 1)];
  const deco = World.blocks.filter(b => b.zone === 'deco' && !b.used).sort((a, b) => (b.cx - Math.abs(b.cz) * 0.3) - (a.cx - Math.abs(a.cz) * 0.3));
  S.safe = deco.length ? [deco[0]] : []; if (deco.length) deco[0].used = true;
  const tp = b => b.zone === 'tampa', orl = b => b.zone === 'orlando', near = (px, pz) => World.blocks.filter(b => !b.used && b.zone === (px < 0 ? 'tampa' : 'orlando')).sort((a, c) => dist(a.cx, a.cz, px, pz) - dist(c.cx, c.cz, px, pz))[0];
  const st = near(-1230, -330); if (st) { st.used = true; st.kind = 'stadium'; }
  const cs = near(100, -1290); if (cs) { cs.used = true; cs.kind = 'castle'; const nb = World.blockMap.get((cs.i + 1) + ',' + cs.j); if (nb && !nb.used) { nb.used = true; nb.kind = 'coaster'; } }
  S.bank.push(...pickBlocks(tp, 1, 2), ...pickBlocks(orl, 1, 2)); S.pawn.push(...pickBlocks(tp, 2, 3), ...pickBlocks(orl, 2, 3)); S.gas.push(...pickBlocks(tp, 3, 3), ...pickBlocks(orl, 4, 3));
  S.hospital.push(...pickBlocks(tp, 1, 1), ...pickBlocks(orl, 1, 1)); S.police.push(...pickBlocks(tp, 1, 1), ...pickBlocks(orl, 1, 1));
  for (const k of Object.keys(S)) for (const b of S[k]) b.kind = k;
}

function addAnchor(tag, b, side, t, tx, tz) {
  const x = side === 3 ? b.i * B + SWC : side === 1 ? (b.i + 1) * B - SWC : lerp(b.i * B + SWC, (b.i + 1) * B - SWC, t);
  const z = side === 0 ? b.j * B + SWC : side === 2 ? (b.j + 1) * B - SWC : lerp(b.j * B + SWC, (b.j + 1) * B - SWC, t);
  const a = { tag, i: b.i, j: b.j, side, x, z, tx: tx == null ? x : tx, tz: tz == null ? z : tz };
  (World.anchors[tag] = World.anchors[tag] || []).push(a); return a;
}

function slab(b, grass) {
  const ch = chunkOf(b.cx, b.cz);
  ch.plain.box(b.x0, 0, b.z0, b.x1, 0.16, b.z1, 0xc2c0b8);
  if (grass) ch.plain.flat(b.x0 + 3, b.z0 + 3, b.x1 - 3, b.z1 - 3, 0.17, 0x4d9a3c);
}
function palm(x, z, s = 1) { World.palms.push({ x, z, s: s * rr(0.85, 1.25), lean: rr(-0.12, 0.12), rot: rr(0, TAU) }); }
function tree(x, z, s = 1) { World.trees.push({ x, z, s: s * rr(0.8, 1.4) }); }

function tower(ch, x, z, w, d, h, col) {
  const hw = w / 2, hd = d / 2, t1 = h * 0.6, t2 = h * 0.86;
  ch.win.box(x - hw, 0, z - hd, x + hw, t1, z + hd, col, true, 0x8a8f94);
  ch.win.box(x - hw * .78, t1, z - hd * .78, x + hw * .78, t2, z + hd * .78, col, true, 0x8a8f94);
  ch.win.box(x - hw * .5, t2, z - hd * .5, x + hw * .5, h, z + hd * .5, col, true, 0x9aa0a5);
  ch.plain.cyl(x, z, 0.5, 0.08, h, h + 14, 0x888888, 5);
  ch.plain.box(x - hw - .15, 0.2, z - hd - .15, x + hw + .15, 4.2, z + hd + .15, 0x1c2a38); const aw = pick([0xd23a3a, 0x2a6ad0, 0xe8b030, 0x2aa86a, 0x7a3ac8, 0xf0f0f0]);
  ch.plain.box(x - hw - .5, 4.0, z + hd + .15, x + hw + .5, 4.35, z + hd + 1.4, aw); ch.plain.box(x - hw - .5, 4.0, z - hd - 1.4, x + hw + .5, 4.35, z - hd - .15, aw); ch.plain.box(x + hw + .15, 4.0, z - hd - .5, x + hw + 1.4, 4.35, z + hd + .5, aw); ch.plain.box(x - hw - 1.4, 4.0, z - hd - .5, x - hw - .15, 4.35, z + hd + .5, aw);
  ch.glow.box(x - hw, 3.0, z + hd + .16, x + hw, 3.25, z + hd + .22, pick([0xffd98a, 0x9fe8ff, 0xff9ad0]));
  for (let k = 0, n = ri(2, 4); k < n; k++) { const bx = x + rr(-hw * .6, hw * .6), bz = z + rr(-hd * .6, hd * .6), bs = rr(1, 2.4); ch.plain.box(bx - bs, h + 0.5, bz - bs, bx + bs, h + 0.5 + rr(1, 2.2), bz + bs, 0x7b8087); }
  ch.plain.cyl(x + hw * .35, z - hd * .35, 1.5, 1.5, h + 0.5, h + 3.2, 0x8a7a6a, 10); ch.plain.cyl(x + hw * .35, z - hd * .35, 1.7, 0.2, h + 3.2, h + 4.2, 0x6a5e52, 10);
  ch.plain.box(x - hw * .3, h, z - hd * .3, x + hw * .1, h + 3, z + hd * .2, 0x777b80);
  const nc = pick([0xff3fa4, 0x27e1d0, 0xffd23f, 0x7a6bff]);
  ch.glow.box(x - hw * .5 - .2, h - 3, z - hd * .5 - .2, x + hw * .5 + .2, h - 2, z + hd * .5 + .2, nc);
  addSolid(x - hw, z - hd, x + hw, z + hd, h, 'tower');
}
function decoHotel(ch, x, z, w, d, floors, col, alongX) {
  const h = floors * 3.6, hw = (alongX ? w : d) / 2, hd = (alongX ? d : w) / 2;
  ch.win.box(x - hw, 0, z - hd, x + hw, h, z + hd, col, true, 0xf0f0f0);
  ch.win.box(x - hw * .85, h, z - hd * .85, x + hw * .85, h + 3, z + hd * .85, col, true, 0xf0f0f0);
  ch.plain.box(x - hw - .6, 3.4, z - hd - .6, x + hw + .6, 3.8, z + hd + .6, 0xfafafa); // awning band
  const nc = pick([0xff3fa4, 0x27e1d0, 0xffd23f, 0xff7a3a]);
  ch.glow.box(x - hw - .3, h - .6, z - hd - .3, x + hw + .3, h - .3, z + hd + .3, nc);
  ch.glow.box(x - hw - .3, 3.2, z - hd - .3, x + hw + .3, 3.35, z + hd + .3, nc);
  ch.glow.box(x - 1.2, h + 3, z - .3, x + 1.2, h + 7, z + .3, nc);
  addSolid(x - hw, z - hd, x + hw, z + hd, h + 3, 'hotel');
}
function houseLot(ch, lx0, lz0, lw, ld, front, hasPool) {
  // front: 0 -x, 1 +x. Lot is lw (x) by ld (z).
  const hd = rr(10, 12), hwid = rr(14, 17), h = rr(4.2, 5.2), col = pick(STUCCO);
  const fx = front === 0 ? lx0 + 4 : lx0 + lw - 4 - hd, bz = lz0 + (ld - hwid) / 2;
  ch.win.box(fx, 0, bz, fx + hd, h, bz + hwid, col, true, col);
  ch.plain.gable(fx, bz, fx + hd, bz + hwid, h, rr(2.2, 3), pick(ROOFS), false, 0.6);
  addSolid(fx, bz, fx + hd, bz + hwid, h + 2, 'house');
  const dx = front === 0 ? fx - 0.06 : fx + hd + 0.06;
  ch.plain.box(Math.min(dx, dx + (front === 0 ? -0.1 : 0.1)), 0, bz + hwid / 2 - 1, Math.max(dx, dx + (front === 0 ? -0.1 : 0.1)), 2.4, bz + hwid / 2 + 1, 0x5b3a29);
  ch.plain.box(front === 0 ? fx - .15 : fx + hd, 0, bz + 1.2, front === 0 ? fx : fx + hd + .15, 2.5, bz + 5.2, 0xdedede);
  // driveway & yard
  const dw = front === 0 ? [lx0 - 3, bz + 1.2, fx, bz + 5.2] : [fx + hd, bz + 1.2, lx0 + lw + 3, bz + 5.2];
  ch.plain.flat(dw[0], dw[1], dw[2], dw[3], 0.2, 0xb8b6ae);
  if (hasPool) {
    const px0 = front === 0 ? fx + hd + 2 : lx0 + 2, px1 = front === 0 ? lx0 + lw - 2 : fx - 2;
    if (px1 - px0 > 5) { ch.plain.flat(px0 - .5, bz + 2.5 - .5, px1 + .5, bz + hwid - 2.5 + .5, 0.19, 0xdcdcd0); ch.glow.flat(px0, bz + 2.5, px1, bz + hwid - 2.5, 0.21, 0x3ad0e0); }
  }
  if (chance(0.7)) palm(front === 0 ? lx0 + 1.5 : lx0 + lw - 1.5, bz + hwid - 2, 1);
  if (chance(0.5)) palm(front === 0 ? lx0 + 1.5 : lx0 + lw - 1.5, bz + 2, 1);
  if (chance(0.5)) ch.plain.box(front === 0 ? lx0 + 2.5 : lx0 + lw - 3.5, 0.2, lz0 + 1, front === 0 ? lx0 + 3.5 : lx0 + lw - 2.5, 1.2, lz0 + ld - 1, 0x2d7a33);
  return { x: front === 0 ? lx0 - 1 : lx0 + lw + 1, z: bz + 3.2, h: front === 0 ? 3 * Math.PI / 2 : Math.PI / 2 };
}

// ---------- new cities: Tampa, Orlando (theme park), Key West ----------
const BRICKS = [0xb5651d, 0xa0522d, 0xc2956b, 0xd8c3a5, 0x8a9a9b, 0xc77d5a];
function midrise(ch, x, z, w, d, floors, col) {
  const h = floors * 3.4; ch.win.box(x - w / 2, 0, z - d / 2, x + w / 2, h, z + d / 2, col, true, 0x9a8f84); ch.plain.box(x - w / 2 - .3, h, z - d / 2 - .3, x + w / 2 + .3, h + .5, z + d / 2 + .3, 0xd9d4c8);
  ch.plain.box(x + w / 4 - 1.2, h + .5, z - 1.2, x + w / 4 + 1.2, h + 3, z + 1.2, 0x777b80); ch.glow.box(x - w / 2 + 1, 3.2, z + d / 2 + .01, x + w / 2 - 1, 3.5, z + d / 2 + .2, pick([0xff3fa4, 0x27e1d0, 0xffd23f]));
  addSolid(x - w / 2, z - d / 2, x + w / 2, z + d / 2, h + .5, 'midrise');
}
function craneAt(ch, x, z) {
  const h = 24; for (const dx of [-14, 14]) { ch.plain.box(x + dx - .6, 0, z - .6, x + dx + .6, h, z + .6, 0xe8892a); addSolid(x + dx - .6, z - .6, x + dx + .6, z + .6, h, 'crane'); }
  ch.plain.box(x - 24, h, z - .8, x + 24, h + 1.6, z + .8, 0xe8892a); ch.plain.box(x - 14, h - 6, z - .4, x - 12, h, z + .4, 0x555555); ch.glow.box(x + 23, h + 1.6, z - .3, x + 24, h + 3, z + .3, 0xff3030);
}
function homesBlock(b, ch) {
  ch.plain.flat(b.x0 + 3, b.z0 + 3, b.x1 - 3, b.z1 - 3, 0.17, 0x4d9a3c);
  const lw = (b.x1 - b.x0 - 6) / 2, ld = (b.z1 - b.z0 - 6) / 3;
  for (let c = 0; c < 2; c++) for (let r = 0; r < 3; r++) { const d = houseLot(ch, b.x0 + 3 + c * lw, b.z0 + 3 + r * ld, lw, ld, c, chance(0.55)); if (chance(0.55)) World.parkedSpots.push({ x: d.x + (c ? 1.5 : -1.5), z: d.z, h: d.h, lot: true, drive: true }); }
  for (let s = 0; s < 4; s++) { addAnchor('home', b, s, .25); addAnchor('home', b, s, .5); addAnchor('home', b, s, .75); }
}
// corrugated ribs, roller doors, accent band, roof lip and HVAC units for warehouses (deterministic: no seeded-RNG calls so world layout is unchanged)
function warehouseDetail(ch, x, z, w, d, h) {
  const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2, cols = [0xc0392b, 0x2471a3, 0xd68910, 0x27ae60, 0xeeeeee], band = cols[Math.floor(hashN(x, z) * 5) % 5];
  ch.plain.box(x0 - .2, h, z0 - .2, x1 + .2, h + .5, z1 + .2, 0x555a60); ch.plain.box(x0 - .05, h * .62, z0 - .05, x1 + .05, h * .62 + .9, z1 + .05, band);
  for (let k = 1; k < Math.floor(w / 4); k++) { const rx = x0 + k * 4; ch.plain.box(rx - .1, 0.3, z0 - .12, rx + .1, h * .62, z0 - .02, 0x6f7a84); ch.plain.box(rx - .1, 0.3, z1 + .02, rx + .1, h * .62, z1 + .12, 0x6f7a84); }
  for (const side of [-1, 1]) for (let k = 0; k < 3; k++) { const dx = x0 + (k + .5) * w / 3, zz = side < 0 ? z0 - .1 : z1 + .1; ch.plain.box(dx - 2.2, 0, zz - .09, dx + 2.2, 4.6, zz + .09, 0x3d434a); for (let t = 0; t < 5; t++) ch.plain.box(dx - 2.2, .8 + t * .85, zz - .14, dx + 2.2, .9 + t * .85, zz + .14, 0x596069); }
  for (let k = 0; k < 3; k++) { const ux = x0 + 5 + hashN(x + k, z) * (w - 10), uz = z + (hashN(z + k, x) - .5) * d * .5; ch.plain.box(ux - 1.2, h + .5, uz - 1, ux + 1.2, h + 1.8, uz + 1, 0x8a9099); }
}
function warehouses(b, ch, n) {
  for (let k = 0; k < n; k++) { const w = rr(34, 48), d = rr(20, 26), h = rr(9, 14), x = b.cx + rr(-6, 6), z = k === 0 ? b.z0 + 4 + d / 2 : b.z1 - 4 - d / 2; ch.win.box(x - w / 2, 0, z - d / 2, x + w / 2, h, z + d / 2, pick([0x8aa0b0, 0xb0b8a0, 0xa0a0a8, 0x9db0a4]), false, 0x777); addSolid(x - w / 2, z - d / 2, x + w / 2, z + d / 2, h, 'warehouse'); warehouseDetail(ch, x, z, w, d, h); }
  for (let k = 0; k < 4; k++) { const x = b.cx + rr(-22, 22), z = b.cz + rr(-6, 6), c = pick([0xc0392b, 0x2471a3, 0x27ae60, 0xd68910, 0x7d3c98]), st = ri(1, 3); ch.plain.box(x - 3, 0.2, z - 1.3, x + 3, 0.2 + 2.6 * st, z + 1.3, c); addSolid(x - 3, z - 1.3, x + 3, z + 1.3, 2.6 * st, 'container'); }
}
function cityBlock(b, ch) {
  const zn = b.zone, hh = hashN(b.i * 9 + 4, b.j * 3 + 8);
  if (zn === 'tampa') {
    const dd = dist(b.cx, b.cz, -1230, -40);
    if (b.cx < -1340) { warehouses(b, ch, 2); craneAt(ch, b.cx, b.cz + rr(-4, 4)); ['industrial', 'industrial', 'industrial'].forEach((t, s) => addAnchor(t, b, s, .5)); }
    else if (dd < 210) {
      const cells = [[b.x0 + 3, b.z0 + 3], [b.cx + 1.5, b.z0 + 3], [b.x0 + 3, b.cz + 1.5], [b.cx + 1.5, b.cz + 1.5]];
      for (const [cx0, cz0] of cells) { const w = rr(20, 28), d = rr(20, 28), h = clamp(rr(26, 60) + (1 - dd / 210) * rr(40, 110), 24, 150); tower(ch, cx0 + 14.25 + rr(-1, 1), cz0 + 14.25 + rr(-1, 1), w, d, h, pick(GLASS)); }
      ['office', 'office', 'shop', 'bar'].forEach((t, s) => addAnchor(t, b, s, rr(.25, .75)));
    } else if (hh < 0.3) homesBlock(b, ch);
    else {
      const n = ri(2, 3); for (let k = 0; k < n; k++) { const w = rr(28, 44), d = rr(14, 20), z = b.z0 + 4 + d / 2 + k * ((b.z1 - b.z0 - 8 - d) / Math.max(1, n - 1)), x = b.cx + rr(-4, 4); midrise(ch, x, z, w, d, ri(3, 8), pick(BRICKS)); palm(x - w / 2 - 2, z, 1); palm(x + w / 2 + 2, z, 1); }
      for (let k = 0; k < 6; k++) palm(b.x0 + 5 + k * 11, b.cz, .9); ['home', 'shop', 'bar', 'home'].forEach((t, s) => addAnchor(t, b, s, rr(.25, .75)));
    }
  } else { // orlando
    if (hh < 0.3) {
      for (let k = 0; k < 2; k++) { const w = rr(34, 46), d = rr(18, 24), z = k === 0 ? b.z0 + 4 + d / 2 : b.z1 - 4 - d / 2; decoHotel(ch, b.cx + rr(-4, 4), z, w, d, ri(7, 13), pick(PASTELS), true); }
      ch.plain.flat(b.cx - 14, b.cz - 6, b.cx + 14, b.cz + 6, 0.19, 0xdcdcd0); ch.glow.flat(b.cx - 12, b.cz - 4.5, b.cx + 12, b.cz + 4.5, 0.21, 0x3ad0e0); for (let k = 0; k < 8; k++) palm(b.x0 + 6 + k * 8, b.cz + rr(-9, 9), 1.1);
      ['hotel', 'hotel', 'bar', 'shop'].forEach((t, s) => addAnchor(t, b, s, .5));
    } else if (hh < 0.45) {
      ch.plain.flat(b.x0 + 3, b.z0 + 3, b.x1 - 3, b.z1 - 3, 0.17, 0x4d9a3c); ch.plain.flat(b.x0 + 9, b.z0 + 9, b.x1 - 9, b.z1 - 9, 0.2, 0x3f9bd0); ch.glow.flat(b.x0 + 11, b.z0 + 11, b.x1 - 11, b.z1 - 11, 0.22, 0x2fb8d6);
      for (let k = 0; k < 16; k++) { const a = k / 16 * TAU; palm(b.cx + Math.cos(a) * 25, b.cz + Math.sin(a) * 25, 1); } for (let k = 0; k < 6; k++) tree(rr(b.x0 + 6, b.x1 - 6), rr(b.z0 + 6, b.z1 - 6), 1);
      for (let s = 0; s < 4; s++) addAnchor('park', b, s, rr(.3, .7), b.cx + rr(-26, 26), b.cz + rr(-26, 26));
    } else if (hh < 0.66) {
      ch.plain.flat(b.x0 + 3, b.z0 + 3, b.x1 - 3, b.z1 - 3, 0.18, 0x4a4d52); const w = 56, d = 15, col = pick(PASTELS), z = b.z0 + 3 + d / 2 + .5;
      ch.win.box(b.cx - w / 2, 0, z - d / 2, b.cx + w / 2, 6, z + d / 2, col, true, 0xdddddd); ch.glow.box(b.cx - w / 2, 4.5, z + d / 2, b.cx + w / 2, 5.7, z + d / 2 + .3, pick([0xff3fa4, 0x27e1d0, 0xffd23f])); addSolid(b.cx - w / 2, z - d / 2, b.cx + w / 2, z + d / 2, 6, 'mall');
      const z2 = b.z1 - 3 - 7.5; ch.win.box(b.cx - 22, 0, z2 - 6.5, b.cx + 22, 5, z2 + 6.5, pick(PASTELS), true, 0xdddddd); addSolid(b.cx - 22, z2 - 6.5, b.cx + 22, z2 + 6.5, 5, 'mall');
      for (let r = 0; r < 2; r++) for (let k = 0; k < 8; k++) World.parkedSpots.push({ x: b.x0 + 8 + k * 6.6, z: b.cz - 4 + r * 11, h: r ? 0 : Math.PI, lot: true }); ['shop', 'shop', 'bar', 'shop'].forEach((t, s) => addAnchor(t, b, s, .5));
    } else if (hh < 0.78) {
      ch.win.box(b.cx - 30, 0, b.cz - 20, b.cx + 30, 14, b.cz + 20, 0xc9d3d6, false, 0xaaaaaa); ch.plain.cyl(b.cx, b.cz, 14, 14, 14, 17, 0x7e97ad, 16); addSolid(b.cx - 30, b.cz - 20, b.cx + 30, b.cz + 20, 17, 'convention'); ch.glow.box(b.cx - 8, 11, b.cz + 20, b.cx + 8, 12, b.cz + 20.3, 0xffd23f);
      ['office', 'hotel', 'office', 'shop'].forEach((t, s) => addAnchor(t, b, s, .5));
    } else homesBlock(b, ch);
  }
  if (b.sub !== 'homes') for (let k = 0; k < 4; k++) { palm(b.x0 + 4 + k * 20, b.z0 + 1.2, 1); palm(b.x0 + 4 + k * 20, b.z1 - 1.2, 1); }
}
function landmarkBlock(b, ch) {
  slab(b, false); const cx = b.cx, cz = b.cz;
  if (b.kind === 'stadium') {
    ch.plain.cyl(cx, cz, 31, 29, 0, 17, 0xd9d2c2, 28, false); ch.plain.cyl(cx, cz, 31.5, 31.5, 17, 18.2, 0x2a6ad0, 28, false); ch.plain.box(cx - 20, .2, cz - 12, cx + 20, .3, cz + 12, 0x2f8a3c);
    addSolid(cx - 28, cz - 28, cx + 28, cz + 28, 17, 'stadium');
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { ch.plain.box(cx + sx * 33 - .4, 0, cz + sz * 33 - .4, cx + sx * 33 + .4, 34, cz + sz * 33 + .4, 0x666a70); ch.glow.box(cx + sx * 33 - 2.5, 34, cz + sz * 33 - 1, cx + sx * 33 + 2.5, 36, cz + sz * 33 + 1, 0xffffff); }
    const m = signMesh('SUNSHINE STADIUM', 18, 2.4, '#0b2a6a', '#ffd23f', 'HOME OF THE GATORS'); m.position.set(cx, 21, cz + 31.7); World.scene.add(m);
    for (let s = 0; s < 4; s++) { addAnchor('bar', b, s, .5); addAnchor('shop', b, s, .3); }
  } else if (b.kind === 'castle') {
    const wall = 0xf3e6f0, roof = 0x6a4ad0;
    ch.win.box(cx - 9, 0, cz - 9, cx + 9, 22, cz + 9, wall, true, wall); ch.plain.cyl(cx, cz, 12.5, 0.1, 22, 42, roof, 8); ch.glow.box(cx - .15, 42, cz - .15, cx + .15, 48, cz + .15, 0xffd23f); ch.glow.box(cx + .15, 44, cz - .15, cx + 3.5, 47, cz + .15, 0xff4fa3); addSolid(cx - 9, cz - 9, cx + 9, cz + 9, 42, 'castle');
    const W2 = 29, t = 1.6; for (const [x0, z0, x1, z1] of [[-W2, -W2, W2, -W2 + t], [-W2, -W2, -W2 + t, W2], [W2 - t, -W2, W2, W2], [-W2, W2 - t, -4, W2], [4, W2 - t, W2, W2]]) { ch.plain.box(cx + x0, 0, cz + z0, cx + x1, 9, cz + z1, wall); addSolid(cx + x0, cz + z0, cx + x1, cz + z1, 9, 'castlewall'); }
    ch.plain.box(cx - 4, 7, cz + W2 - t, cx + 4, 11, cz + W2, wall);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const x = cx + sx * W2, z = cz + sz * W2; ch.plain.cyl(x, z, 4, 4, 0, 20, wall, 12); ch.plain.cyl(x, z, 5.2, 0.1, 20, 31, sx * sz > 0 ? 0xd02a6a : roof, 12); ch.glow.box(x - .15, 31, z - .15, x + .15, 35, z + .15, 0xffd23f); addSolid(x - 4, z - 4, x + 4, z + 4, 31, 'tower'); }
    ch.plain.flat(cx - 12, cz + 10, cx + 12, cz + W2, 0.2, 0xe8d8f0); ch.plain.flat(cx - 4, cz + W2 - 20, cx + 4, cz + W2 + 4, 0.21, 0xffd23f);
    const m = signMesh('FANTASY KINGDOM', 12, 1.5, '#4a1a8a', '#ffd23f', 'WHERE DREAMS GET EXPENSIVE'); m.position.set(cx, 13.5, cz + W2 + .1); World.scene.add(m);
    for (let s = 0; s < 4; s++) { addAnchor('park', b, s, .5, cx + rr(-8, 8), cz + rr(12, 26)); addAnchor('park', b, s, .3, cx + rr(-22, 22), cz + rr(12, 27)); } for (let k = 0; k < 8; k++) palm(cx + rr(-26, 26), cz + rr(14, 27), 1);
  } else { // coaster
    const pts = []; const N = 150; for (let i = 0; i < N; i++) { const a = i / N * TAU, r = 24 + 5 * Math.sin(2 * a); pts.push([cx + r * Math.cos(a) * 1.05, 3.5 + 8.5 * (0.5 + 0.5 * Math.sin(3 * a + 0.6)) + 11 * Math.exp(-((a - 0.5) * (a - 0.5)) * 5), cz + r * Math.sin(a)]); }
    pts.forEach((p, i) => { ch.plain.box(p[0] - .45, p[1] - .2, p[2] - .45, p[0] + .45, p[1] + .35, p[2] + .45, 0xd02a2a); if (i % 3 === 0) { ch.plain.box(p[0] - .12, 0, p[2] - .12, p[0] + .12, p[1] - .2, p[2] + .12, 0xeeeeee); } });
    ch.plain.box(cx - 5, 0, cz - 5, cx + 5, 4, cz + 5, 0x2471a3); addSolid(cx - 5, cz - 5, cx + 5, cz + 5, 4, 'station'); ch.glow.box(cx - 5, 4, cz - 5, cx + 5, 4.5, cz + 5, 0xff4fa3);
    const m = signMesh('THUNDER GATOR', 10, 1.4, '#111', '#ff4fa3', 'ALL RIDE. NO REFUNDS.'); m.position.set(cx, 6, cz + 5.1); World.scene.add(m);
    const cars = new T.Group(); for (let k = 0; k < 3; k++) { const c = new T.Mesh(new T.BoxGeometry(1.4, .8, 1.8), new T.MeshLambertMaterial({ color: [0xffd23f, 0xff4fa3, 0x27e1d0][k] })); c.position.z = -k * 2.1; cars.add(c); } cars.visible = true; World.scene.add(cars); let u = 0;
    World.animated.push(dt => { u = (u + dt * 6) % N; const f = Math.floor(u), q = u - f, a = pts[f], c2 = pts[(f + 1) % N]; cars.position.set(lerp(a[0], c2[0], q), lerp(a[1], c2[1], q) + .9, lerp(a[2], c2[2], q)); cars.lookAt(c2[0], c2[1] + .9, c2[2]); });
    for (let s = 0; s < 4; s++) addAnchor('park', b, s, .5, cx + rr(-30, 30), cz + rr(-30, 30));
  }
}
function buildKeyWest() {
  const ch = chunkOf(10, 880); for (const side of [-1, 1]) for (let k = 0; k < 6; k++) {
    const z = 838 + k * 19 + rr(-2, 2), w = rr(14, 20), d = rr(11, 14), x = side * (26 + w / 2 + rr(0, 4)), h = rr(6.5, 10.5), col = pick(PASTELS);
    if (landSD(x - w / 2, z) < 10 || landSD(x + w / 2, z) < 10 || landSD(x, z + d / 2) < 10 || landSD(x, z - d / 2) < 10) continue;
    ch.win.box(x - w / 2, 0, z - d / 2, x + w / 2, h, z + d / 2, col, true, col); ch.plain.gable(x - w / 2, z - d / 2, x + w / 2, z + d / 2, h, 2.2, pick([0xb8553a, 0x6d747a, 0x4e5a63]), true, 0.7);
    ch.plain.box(x - w / 2 - .5, 3.2, side > 0 ? z - d / 2 - 1.8 : z - d / 2 - 1.8, x + w / 2 + .5, 3.5, z - d / 2, 0xffffff); ch.glow.box(x - w / 2, 5.2, z - d / 2 - .05, x + w / 2, 5.5, z - d / 2 + .1, pick([0xff3fa4, 0x27e1d0, 0xffd23f])); addSolid(x - w / 2, z - d / 2, x + w / 2, z + d / 2, h + 2, 'keywest');
    palm(x + rr(-w / 2, w / 2), z - d / 2 - 3, 1.1);
  }
  ch.plain.box(-.2, 0, 940, .2, 4.5, 940.4, 0x555555); const m = signMesh('MILE MARKER 0', 5, 2.4, '#0b6a3a', '#ffffff', 'KEY WEST'); m.position.set(0, 4.5, 941); World.scene.add(m); World.special.keyWest = { x: 0, z: 925 };
}
function buildBlock(b) {
  const ch = chunkOf(b.cx, b.cz), zn = b.zone;
  if (b.kind === 'stadium' || b.kind === 'castle' || b.kind === 'coaster') { landmarkBlock(b, ch); return; }
  const special = b.kind !== 'auto';
  const isPark = !special && zn === 'suburb' && hashN(b.i * 7, b.j * 13) < 0.13;
  const isMall = !special && zn === 'suburb' && !isPark && hashN(b.i * 3 + 1, b.j * 5 + 2) < 0.2;
  b.sub = isPark ? 'park' : isMall ? 'mall' : zn === 'suburb' ? 'homes' : zn;
  slab(b, zn === 'suburb' && !isMall && !special || isPark);
  if (special) { addAnchor('shop', b, 0, .5); addAnchor('shop', b, 2, .5); addAnchor('shop', b, 1, .5); return; }
  if (zn === 'tampa' || zn === 'orlando') { cityBlock(b, ch); return; }
  if (zn === 'downtown') {
    const dcx = 185, dcz = -40, dd = Math.hypot(b.cx - dcx, b.cz - dcz), cells = [[b.x0 + 3, b.z0 + 3], [b.cx + 1.5, b.z0 + 3], [b.x0 + 3, b.cz + 1.5], [b.cx + 1.5, b.cz + 1.5]];
    const cw = 28.5;
    const par = chance(0.18);
    for (let k = 0; k < 4; k++) {
      if (par && k > 0) break;
      const [cx0, cz0] = cells[k];
      const w = par ? 58 : rr(20, cw), d = par ? 58 : rr(20, cw);
      const h = par ? rr(12, 20) : clamp(rr(30, 80) + (1 - dd / 260) * rr(60, 150), 26, 230);
      const x = par ? b.cx : cx0 + cw / 2 + rr(-1, 1), z = par ? b.cz : cz0 + cw / 2 + rr(-1, 1);
      if (par) { ch.win.box(x - 29, 0, z - 29, x + 29, h, z + 29, 0x9aa0a6, true); addSolid(x - 29, z - 29, x + 29, z + 29, h, 'garage'); }
      else tower(ch, x, z, w, d, h, pick(GLASS));
    }
    ['shop', 'office', 'office', 'office'].forEach((t, s) => addAnchor(t, b, s, rr(.25, .75)));
    addAnchor('bar', b, 1, .3);
  } else if (zn === 'deco') {
    const alongX = hashN(b.i, b.j) < 0.5;
    for (let k = 0; k < 2; k++) {
      const w = rr(34, 50), d = rr(16, 22), floors = ri(3, 8);
      const z = k === 0 ? b.z0 + 3 + d / 2 : b.z1 - 3 - d / 2, x = b.cx + rr(-4, 4);
      decoHotel(ch, x, z, w, d, floors, pick(PASTELS), true);
      palm(x - w / 2 - 3, z, 1.1); palm(x + w / 2 + 3, z, 1.1);
    }
    for (let k = 0; k < 6; k++) palm(b.x0 + 6 + k * 11, b.cz + rr(-2, 2), 1);
    addAnchor('hotel', b, 0, .5); addAnchor('hotel', b, 2, .5); addAnchor('bar', b, 1, .5); addAnchor('home', b, 0, .2); addAnchor('home', b, 2, .8);
    if (!World.blockMap.get((b.i + 1) + ',' + b.j)) addAnchor('beach', b, 1, .5, null, null);
  } else if (zn === 'industrial') {
    const n = 2;
    for (let k = 0; k < n; k++) {
      const w = rr(34, 48), d = rr(20, 26), h = rr(9, 14), x = b.cx + rr(-6, 6), z = k === 0 ? b.z0 + 4 + d / 2 : b.z1 - 4 - d / 2;
      ch.win.box(x - w / 2, 0, z - d / 2, x + w / 2, h, z + d / 2, pick([0x8aa0b0, 0xb0b8a0, 0xa0a0a8, 0x9db0a4]), false, 0x777);
      ch.plain.box(x - 4, 0, z + (k === 0 ? d / 2 : -d / 2) - .15, x + 4, 5, z + (k === 0 ? d / 2 : -d / 2) + .15, 0x4a4f55);
      addSolid(x - w / 2, z - d / 2, x + w / 2, z + d / 2, h, 'warehouse'); warehouseDetail(ch, x, z, w, d, h);
    }
    for (let k = 0; k < 4; k++) { const x = b.cx + rr(-22, 22), z = b.cz + rr(-6, 6), c = pick([0xc0392b, 0x2471a3, 0x27ae60, 0xd68910, 0x7d3c98]); const st = ri(1, 3); ch.plain.box(x - 3, 0.2, z - 1.3, x + 3, 0.2 + 2.6 * st, z + 1.3, c); addSolid(x - 3, z - 1.3, x + 3, z + 1.3, 2.6 * st, 'container'); }
    addAnchor('industrial', b, 0, .5); addAnchor('industrial', b, 2, .5); addAnchor('industrial', b, 1, .4);
  } else if (isPark) {
    ch.plain.flat(b.cx - 2, b.z0 + 3, b.cx + 2, b.z1 - 3, 0.19, 0xd6cfb4); ch.plain.flat(b.x0 + 3, b.cz - 2, b.x1 - 3, b.cz + 2, 0.19, 0xd6cfb4);
    ch.plain.flat(b.cx - 9, b.cz - 9, b.cx + 9, b.cz + 9, 0.2, 0x3f9bd0); ch.glow.flat(b.cx - 8, b.cz - 8, b.cx + 8, b.cz + 8, 0.22, 0x2fb8d6);
    for (let k = 0; k < 14; k++) { const x = rr(b.x0 + 6, b.x1 - 6), z = rr(b.z0 + 6, b.z1 - 6); if (Math.abs(x - b.cx) > 12 && Math.abs(z - b.cz) > 12) tree(x, z, 1); else if (Math.abs(x - b.cx) > 12 || Math.abs(z - b.cz) > 12) { if (chance(0.3)) palm(x, z); } }
    for (let k = 0; k < 4; k++) { const x = b.cx + (k % 2 ? 11 : -11), z = b.cz + (k < 2 ? 4 : -4); ch.plain.box(x - 1, 0.2, z - .3, x + 1, 0.9, z + .3, 0x6b4a2b); }
    ch.plain.box(b.cx + 18, 0.2, b.cz - 24, b.cx + 26, 3, b.cz - 22, 0xe84a5f); ch.plain.box(b.cx + 18, 0.2, b.cz - 24, b.cx + 20, 6, b.cz - 22, 0x2471a3); // playground
    for (let s = 0; s < 4; s++) addAnchor('park', b, s, rr(.3, .7), b.cx + rr(-18, 18), b.cz + rr(-18, 18));
  } else if (isMall) {
    ch.plain.flat(b.x0 + 3, b.z0 + 3, b.x1 - 3, b.z1 - 3, 0.18, 0x4a4d52);
    const w = 56, d = 15, z = b.z0 + 3 + d / 2 + 0.5, col = pick(PASTELS);
    ch.win.box(b.cx - w / 2, 0, z - d / 2, b.cx + w / 2, 6, z + d / 2, col, true, 0xdddddd); ch.glow.box(b.cx - w / 2 - .1, 4.5, z + d / 2, b.cx + w / 2 + .1, 5.7, z + d / 2 + .3, pick([0xff3fa4, 0x27e1d0, 0xffd23f]));
    addSolid(b.cx - w / 2, z - d / 2, b.cx + w / 2, z + d / 2, 6, 'mall');
    const w2 = 20, d2 = 13, z2 = b.z1 - 3 - d2 / 2 - 0.5; ch.win.box(b.cx - w2 / 2, 0, z2 - d2 / 2, b.cx + w2 / 2, 5, z2 + d2 / 2, 0xe84a5f, true, 0xdddddd); ch.glow.box(b.cx - 4, 5, z2 - 1, b.cx + 4, 8, z2 + 1, 0xffd23f);
    addSolid(b.cx - w2 / 2, z2 - d2 / 2, b.cx + w2 / 2, z2 + d2 / 2, 5, 'fastfood');
    for (let r = 0; r < 2; r++) for (let k = 0; k < 8; k++) { const x = b.x0 + 8 + k * 6.6, z = b.cz - 4 + r * 11; World.parkedSpots.push({ x, z: z + (r ? 0 : 0), h: r ? 0 : Math.PI, lot: true }); }
    for (let k = 0; k < 6; k++) palm(b.x0 + 5 + k * 11, b.cz + 3.5, 0.9);
    addAnchor('shop', b, 0, .5); addAnchor('shop', b, 2, .5); addAnchor('shop', b, 0, .25); addAnchor('bar', b, 2, .2); addAnchor('shop', b, 2, .8);
  } else if (zn === 'suburb') {
    const lw = (b.x1 - b.x0 - 6) / 2, ld = (b.z1 - b.z0 - 6) / 3;
    for (let c = 0; c < 2; c++) for (let r = 0; r < 3; r++) {
      const d = houseLot(ch, b.x0 + 3 + c * lw, b.z0 + 3 + r * ld, lw, ld, c, chance(0.55));
      if (chance(0.55)) World.parkedSpots.push({ x: d.x + (c ? 1.5 : -1.5), z: d.z, h: d.h, lot: true, drive: true });
    }
    for (let s = 0; s < 4; s++) { addAnchor('home', b, s, .25); addAnchor('home', b, s, .5); addAnchor('home', b, s, .75); }
  }
  // street palms along sidewalks for urban blocks
  if (zn === 'downtown' || zn === 'deco') { for (let k = 0; k < 5; k++) { palm(b.x0 + 4 + k * 14, b.z0 + 1.2, 1); palm(b.x0 + 4 + k * 14, b.z1 - 1.2, 1); } }
  else if (zn === 'suburb') for (let k = 0; k < 4; k++) { if (chance(0.7)) palm(b.x0 + 8 + k * 17, b.z0 + 1.2, 1); if (chance(0.7)) palm(b.x0 + 8 + k * 17, b.z1 - 1.2, 1); }
}

// ---------- roads ----------
function buildRoads(scene) {
  const roadTex = makeRoadTex();
  const mat = new T.MeshPhongMaterial({ map: roadTex, vertexColors: true, specular: 0x222222, shininess: 30, reflectivity: 0, combine: T.MixOperation, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const gb = new GB(), gi = new GB();
  const white = 0xffffff;
  // runs for vertical roads (constant x) and horizontal (constant z)
  for (let i = GI[0]; i <= GI[1]; i++) {
    const x = i * B; let start = null;
    for (let z = -1540; z <= 1040; z += 8) {
      const ok = roadOK(x, z);
      if (ok && start === null) start = z;
      if ((!ok || z === 1040) && start !== null) { const end = ok ? z : z - 8; if (end - start >= 16) World.roadRuns.v.push({ x, a: start, b: end }); start = null; }
    }
  }
  for (let j = GJ[0]; j <= GJ[1]; j++) {
    const z = j * B; let start = null;
    for (let x = -1540; x <= 740; x += 8) {
      const ok = roadOK(x, z);
      if (ok && start === null) start = x;
      if ((!ok || x === 740) && start !== null) { const end = ok ? x : x - 8; if (end - start >= 16) World.roadRuns.h.push({ z, a: start, b: end }); start = null; }
    }
  }
  const V = 0.2;
  for (const r of World.roadRuns.v) { const L = r.b - r.a; gb.quad([r.x - HALFR, 0.06, r.b], [r.x + HALFR, 0.06, r.b], [r.x + HALFR, 0.06, r.a], [r.x - HALFR, 0.06, r.a], [0, 1, 0], 0xffffff, [0, L / 20 * 1, 1, L / 20, 1, 0, 0, 0]); }
  for (const r of World.roadRuns.h) { const L = r.b - r.a; gb.quad([r.a, 0.062, r.z - HALFR], [r.a, 0.062, r.z + HALFR], [r.b, 0.062, r.z + HALFR], [r.b, 0.062, r.z - HALFR], [0, 1, 0], 0xffffff, [0, 0, 1, 0, 1, L / 20, 0, L / 20]); }
  // intersections + crosswalks + graph nodes
  for (let i = GI[0]; i <= GI[1]; i++) for (let j = GJ[0]; j <= GJ[1]; j++) {
    const x = i * B, z = j * B; if (!roadOK(x, z)) continue;
    const vOK = roadOK(x, z - 20) || roadOK(x, z + 20), hOK = roadOK(x - 20, z) || roadOK(x + 20, z);
    if (!vOK && !hOK) continue;
    gi.flat(x - HALFR, z - HALFR, x + HALFR, z + HALFR, 0.068, 0x3c4046);
    const nd = { i, j, x, z, links: [] }; World.nodes.set(i + ',' + j, nd);
    if (roadOK(x, z - 30) && roadOK(x, z + 30) && roadOK(x - 30, z) && roadOK(x + 30, z)) {
      for (let k = 0; k < 5; k++) { const o = -5 + k * 2.5; gi.flat(x + o - .5, z - HALFR - 3.2, x + o + .5, z - HALFR - .8, 0.075, white); gi.flat(x + o - .5, z + HALFR + .8, x + o + .5, z + HALFR + 3.2, 0.075, white); gi.flat(x - HALFR - 3.2, z + o - .5, x - HALFR - .8, z + o + .5, 0.075, white); gi.flat(x + HALFR + .8, z + o - .5, x + HALFR + 3.2, z + o + .5, 0.075, white); }
    }
  }
  for (const [k, n] of World.nodes) {
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const m = World.nodes.get((n.i + di) + ',' + (n.j + dj)); if (!m) continue;
      const mx = (n.x + m.x) / 2, mz = (n.z + m.z) / 2;
      if (roadOK(mx, mz) && roadOK((n.x * 3 + m.x) / 4, (n.z * 3 + m.z) / 4) && roadOK((n.x + m.x * 3) / 4, (n.z + m.z * 3) / 4)) n.links.push(m);
    }
  }
  const gm = new T.MeshPhongMaterial({ vertexColors: true, specular: 0x222222, shininess: 30, reflectivity: 0, combine: T.MixOperation, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  World.roadMat = mat; World.roadMat2 = gm; const m1 = gb.build(mat, false), m2 = gi.build(gm, false); m1.receiveShadow = true; m2.receiveShadow = true; scene.add(m1); scene.add(m2);
  // parked-car spots along kerbs
  for (const r of World.roadRuns.v) for (let z = r.a + 20; z < r.b - 20; z += 12.5) { if (Math.abs(((z % B) + B) % B) < 14 || Math.abs(((z % B) + B) % B - B) < 14) continue; for (const s of [-1, 1]) if (hashN(r.x + s * 7, z) < 0.3) World.parkedSpots.push({ x: r.x + s * 5.6, z, h: s > 0 ? Math.PI : 0 }); }
  for (const r of World.roadRuns.h) for (let x = r.a + 20; x < r.b - 20; x += 12.5) { if (Math.abs(((x % B) + B) % B) < 14 || Math.abs(((x % B) + B) % B - B) < 14) continue; for (const s of [-1, 1]) if (hashN(x, r.z + s * 11) < 0.3) World.parkedSpots.push({ x, z: r.z + s * 5.6, h: s > 0 ? Math.PI / 2 : -Math.PI / 2 }); }
}

// ---------- pedestrian routing over sidewalk graph ----------
function pedPos(id) {
  const c = id & 3, bi = id >> 2, i = Math.floor(bi / 40) - 20, j = (bi % 40) - 20;
  const xL = i * B + SWC, xR = (i + 1) * B - SWC, zT = j * B + SWC, zB = (j + 1) * B - SWC;
  return c === 0 ? [xL, zT] : c === 1 ? [xR, zT] : c === 2 ? [xR, zB] : [xL, zB];
}
const pedId = (i, j, c) => (((i + 20) * 40 + (j + 20)) << 2) | c;
function pedNeigh(id, out) {
  out.length = 0; const c = id & 3, bi = id >> 2, i = Math.floor(bi / 40) - 20, j = (bi % 40) - 20;
  out.push(pedId(i, j, (c + 1) & 3), pedId(i, j, (c + 3) & 3));
  const add = (ii, jj, cc) => { if (blockAt(ii, jj)) out.push(pedId(ii, jj, cc)); };
  if (c === 0) { add(i - 1, j, 1); add(i, j - 1, 3); } else if (c === 1) { add(i + 1, j, 0); add(i, j - 1, 2); }
  else if (c === 2) { add(i + 1, j, 3); add(i, j + 1, 1); } else { add(i - 1, j, 2); add(i, j + 1, 0); }
}
function routePed(a, b) {
  const pts = [{ x: a.x, z: a.z }];
  if (!(a.i === b.i && a.j === b.j && a.side === b.side)) {
    const startC = [a.side, (a.side + 1) & 3].map(c => pedId(a.i, a.j, c)), goalC = [b.side, (b.side + 1) & 3].map(c => pedId(b.i, b.j, c));
    const open = new Map(), g = new Map(), par = new Map(), closed = new Set(), heap = []; const GOAL = -1;
    const push = (id, f) => { heap.push([f, id]); heap.sort((p, q) => p[0] - q[0]); };
    const h = id => { const p = pedPos(id); return Math.hypot(p[0] - b.x, p[1] - b.z); };
    for (const s of startC) { const p = pedPos(s); g.set(s, Math.hypot(p[0] - a.x, p[1] - a.z)); push(s, g.get(s) + h(s)); }
    const nb = []; let found = false, guard = 0;
    while (heap.length && guard++ < 6000) {
      const [, id] = heap.shift(); if (id === GOAL) { found = true; break; } if (closed.has(id)) continue; closed.add(id);
      pedNeigh(id, nb); const pp = pedPos(id), list = nb.slice();
      if (goalC.includes(id)) { const ng = g.get(id) + Math.hypot(pp[0] - b.x, pp[1] - b.z); if (ng < (g.get(GOAL) ?? 1e9)) { g.set(GOAL, ng); par.set(GOAL, id); push(GOAL, ng); } }
      for (const n of list) { if (closed.has(n)) continue; const np = pedPos(n), ng = g.get(id) + Math.hypot(pp[0] - np[0], pp[1] - np[1]); if (ng < (g.get(n) ?? 1e9)) { g.set(n, ng); par.set(n, id); push(n, ng + h(n)); } }
    }
    if (found) { const chain = []; let cur = GOAL; while (par.has(cur)) { cur = par.get(cur); chain.push(cur); } chain.reverse(); for (const id of chain) { const p = pedPos(id); pts.push({ x: p[0], z: p[1] }); } }
  }
  pts.push({ x: b.x, z: b.z }); if (b.tx !== b.x || b.tz !== b.z) pts.push({ x: b.tx, z: b.tz });
  let len = 0; for (let k = 1; k < pts.length; k++) { pts[k].s = len += Math.hypot(pts[k].x - pts[k - 1].x, pts[k].z - pts[k - 1].z); } pts[0].s = 0;
  return { pts, len };
}
function pathAt(path, s) { // position along polyline path at distance s
  const p = path.pts; if (s <= 0) return [p[0].x, p[0].z, 0]; if (s >= path.len) { const l = p[p.length - 1]; return [l.x, l.z, 0]; }
  let k = 1; while (k < p.length - 1 && p[k].s < s) k++;
  const a = p[k - 1], b = p[k], t = (s - a.s) / Math.max(0.001, b.s - a.s); return [lerp(a.x, b.x, t), lerp(a.z, b.z, t), Math.atan2(b.x - a.x, b.z - a.z)];
}

// ---------- vegetation (instanced) ----------
function mergeParts(parts) { // [{geo,color:[r,g,b]}]
  let n = 0; const gs = parts.map(p => { const g = p.geo.index ? p.geo.toNonIndexed() : p.geo; n += g.attributes.position.count; return g; });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3); let o = 0;
  gs.forEach((g, k) => { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); for (let v = 0; v < g.attributes.position.count; v++) { col[(o + v) * 3] = parts[k].color[0]; col[(o + v) * 3 + 1] = parts[k].color[1]; col[(o + v) * 3 + 2] = parts[k].color[2]; } o += g.attributes.position.count; });
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('normal', new T.BufferAttribute(nor, 3)); g.setAttribute('color', new T.BufferAttribute(col, 3)); return g;
}
function frondGeo() {
  const pos = [], idx = []; const nF = 9;
  for (let f = 0; f < nF; f++) {
    const a = f / nF * TAU + (f % 2) * 0.2, ca = Math.cos(a), sa = Math.sin(a), base = pos.length / 3;
    for (let k = 0; k <= 5; k++) { const t = k / 5, L = 3.6 * t, y = 0.9 * Math.sin(t * 2.6) - 2.0 * t * t, w = 0.8 * Math.sin(Math.PI * Math.min(1, t * 1.15 + 0.12)) * (1 - t * 0.35);
      pos.push(ca * L - sa * w, y, sa * L + ca * w, ca * L + sa * w, y, sa * L - ca * w); }
    for (let k = 0; k < 5; k++) { const q = base + k * 2; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
  }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function buildVegetation(scene) {
  const trunk = new T.CylinderGeometry(0.17, 0.3, 7.6, 6); trunk.translate(0, 3.8, 0);
  const fr = frondGeo(); fr.translate(0, 7.6, 0);
  const palmGeo = mergeParts([{ geo: trunk, color: [0.45, 0.33, 0.2] }, { geo: fr, color: [0.22, 0.55, 0.2] }]);
  const mat = new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide }); Weather.sway(mat, 8);
  const im = new T.InstancedMesh(palmGeo, mat, World.palms.length || 1); im.count = World.palms.length; im.frustumCulled = false; im.castShadow = true;
  const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), sc = new T.Vector3(), p = new T.Vector3();
  World.palms.forEach((pl, k) => { e.set(pl.lean, pl.rot, pl.lean * 0.6); q.setFromEuler(e); sc.set(pl.s, pl.s, pl.s); p.set(pl.x, 0, pl.z); m4.compose(p, q, sc); im.setMatrixAt(k, m4); });
  scene.add(im); World.palmMesh = im;
  // broadleaf trees / mangroves
  const tr = new T.CylinderGeometry(0.3, 0.45, 3.4, 6); tr.translate(0, 1.7, 0);
  const bl = new T.IcosahedronGeometry(3, 1); bl.scale(1, 0.85, 1); bl.translate(0, 5.2, 0);
  const treeGeo = mergeParts([{ geo: tr, color: [0.35, 0.25, 0.15] }, { geo: bl, color: [0.2, 0.5, 0.2] }]);
  const treeMat = new T.MeshLambertMaterial({ vertexColors: true }); Weather.sway(treeMat, 9); const tm = new T.InstancedMesh(treeGeo, treeMat, World.trees.length || 1); tm.count = World.trees.length; tm.frustumCulled = false; tm.castShadow = true;
  const col = new T.Color();
  World.trees.forEach((t, k) => { q.setFromEuler(e.set(0, rr(0, TAU), 0)); sc.set(t.s, t.s * rr(.9, 1.2), t.s); p.set(t.x, 0, t.z); m4.compose(p, q, sc); tm.setMatrixAt(k, m4); col.setHSL(rr(.25, .38), rr(.45, .6), rr(.8, 1.2) * 0.9); tm.setColorAt(k, col); });
  if (tm.instanceColor) tm.instanceColor.needsUpdate = true; scene.add(tm);
}

// ---------- terrain, sea, sky ----------
function buildTerrain(scene) {
  const g = new T.PlaneGeometry(WB.w, WB.h, 380, 430); g.rotateX(-Math.PI / 2); g.translate(WB.x0 + WB.w / 2, 0, WB.z0 + WB.h / 2);
  const pos = g.attributes.position, col = new Float32Array(pos.count * 3); const c = new T.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), sd = landSD(x, z), zn = zoneAt(x, z), n = vnoise(x / 18, z / 18), n2 = vnoise(x / 5, z / 5);
    let y = sd > 0 ? 0 : Math.max(-7, sd * 0.07), r, gr, bl;
    if (sd < 0) { const d = clamp(-sd / 60, 0, 1); r = lerp(0.9, 0.08, d); gr = lerp(0.82, 0.38, d); bl = lerp(0.62, 0.5, d); }
    else if (zn === 'swamp') {
      const pond = vnoise(x / 40 + 9, z / 40) < 0.33 && sd > 20; if (pond) y = -0.9;
      r = lerp(.2, .3, n); gr = lerp(.35, .46, n); bl = .18; if (pond) { r = .12; gr = .3; bl = .25; }
    } else if (sd < 55) { r = 0.93 - n2 * .06; gr = 0.86 - n2 * .06; bl = 0.67 - n2 * .08; }
    else if (sd < 80) { const t = (sd - 55) / 25; r = lerp(.93, .36, t); gr = lerp(.86, .62, t); bl = lerp(.67, .28, t); }
    else if (zn === 'downtown' || zn === 'deco' || zn === 'tampa' || zn === 'orlando') { r = gr = bl = 0.6 + n * .08; }
    else if (zn === 'industrial') { r = .5; gr = .5; bl = .47; }
    else if (zn === 'keys') { r = .85; gr = .8; bl = .55; if (sd > 25) { r = .35; gr = .62; bl = .3; } }
    else { r = lerp(.3, .38, n); gr = lerp(.55, .66, n); bl = lerp(.22, .3, n); }
    pos.setY(i, y); col[i * 3] = r; col[i * 3 + 1] = gr; col[i * 3 + 2] = bl;
  }
  g.setAttribute('color', new T.BufferAttribute(col, 3)); g.computeVertexNormals();
  const gc = document.createElement('canvas'); gc.width = gc.height = 256; const gg = gc.getContext('2d'); gg.fillStyle = '#fff'; gg.fillRect(0, 0, 256, 256);
  for (let k = 0; k < 9000; k++) { const v = 150 + Math.random() * 105; gg.fillStyle = `rgba(${v},${v},${v},${0.18 + Math.random() * 0.25})`; gg.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 1 + Math.random() * 3); }
  const gt = new T.CanvasTexture(gc); gt.wrapS = gt.wrapT = T.RepeatWrapping; gt.repeat.set(WB.w / 9, WB.h / 9); gt.anisotropy = 8;
  World.terrainMat = new T.MeshLambertMaterial({ vertexColors: true, map: gt }); const m = new T.Mesh(g, World.terrainMat); m.receiveShadow = true; scene.add(m);
  // sea
  const wn = makeWaterNormal(); wn.repeat.set(1, 1); World.waterNormal = wn;
  const wm = new T.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { tNormal: { value: wn }, tShore: { value: null }, time: { value: 0 }, sunDir: { value: new T.Vector3(0, 1, 0) }, skyHor: { value: new T.Color(0xbfe0ff) }, skyTop: { value: new T.Color(0x3b82e8) }, night: { value: 0 }, wind: { value: 0.2 }, cloud: { value: 0.3 },
      uPost: PostFlag, fogColor: { value: new T.Color(0xbfe0ff) }, fogNear: { value: 100 }, fogFar: { value: 900 }, box: { value: new T.Vector4(WB.x0, WB.z0, WB.w, WB.h) }, shallow: { value: new T.Color(0.1, 0.78, 0.8) }, deep: { value: new T.Color(0.015, 0.22, 0.42) } },
    vertexShader: 'varying vec3 wp;void main(){vec4 w=modelMatrix*vec4(position,1.);wp=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
    fragmentShader: `uniform sampler2D tNormal,tShore;uniform float time,night,wind,cloud,fogNear,fogFar,uPost;uniform vec3 sunDir,fogColor,skyHor,skyTop,shallow,deep;uniform vec4 box;varying vec3 wp;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
void main(){
 vec2 uv=(wp.xz-box.xy)/box.zw;vec4 sh=(uv.x>0.&&uv.x<1.&&uv.y>0.&&uv.y<1.)?texture2D(tShore,uv):vec4(1.,1.,0.,1.);
 float depth=sh.r,near=sh.g;float tt=time*(.6+wind);
 vec2 p1=wp.xz*.045+vec2(tt*.02,tt*.013),p2=wp.xz*.11-vec2(tt*.03,-tt*.02),p3=wp.xz*.4+vec2(tt*.06,tt*.05);
 vec3 nA=texture2D(tNormal,p1).xyz*2.-1.,nB=texture2D(tNormal,p2).xyz*2.-1.,nC=texture2D(tNormal,p3).xyz*2.-1.;
 float sc=.35+wind*.9;vec3 N=normalize(vec3((nA.x+nB.x*.7+nC.x*.4)*sc,1.,(nA.y+nB.y*.7+nC.y*.4)*sc));
 vec3 V=normalize(cameraPosition-wp);float fr=pow(1.-max(dot(N,V),0.),4.)*.85+.04;
 vec3 base=mix(shallow,deep,smoothstep(.02,.55,depth));base*=mix(1.,.55,cloud*.5);
 vec3 skyc=mix(skyHor,skyTop,clamp(reflect(-V,N).y*1.6,0.,1.));
 vec3 col=mix(base,skyc,fr);
 vec3 R=reflect(-sunDir,N);float sp=pow(max(dot(R,V),0.),260.)*3.+pow(max(dot(R,V),0.),24.)*.15;col+=vec3(1.,.9,.7)*sp*(1.-night)*(1.-cloud*.7);
 float moon=pow(max(dot(reflect(sunDir,N),V),0.),300.)*2.*night;col+=vec3(.7,.8,1.)*moon;
 // foam along the shore
 float fw=n(wp.xz*.5+tt*.4)*.6+n(wp.xz*1.6-tt*.7)*.4;float band=smoothstep(.0,.06,near)*(1.-smoothstep(.06,.16,near+(sin(tt*1.6+wp.x*.05+wp.z*.03)*.02)));
 float foam=band*smoothstep(.35,.7,fw)+smoothstep(.0,.025,.03-near)*.8;col=mix(col,vec3(1.),clamp(foam,0.,1.)*.85);
 col*=mix(1.,.16,night);
 float a=mix(.62,.96,smoothstep(0.,.5,depth));a=max(a,foam);
 float dd=length(cameraPosition-wp);col=mix(col,fogColor,smoothstep(fogNear,fogFar,dd));
 gl_FragColor=vec4(mix(col,pow(col,vec3(2.2)),uPost),a);}`,
  });
  const w = new T.Mesh(new T.PlaneGeometry(6000, 6000), wm); w.rotation.x = -Math.PI / 2; w.position.y = -0.35; scene.add(w); World.water = w; World.waterMat = wm;
}
function buildSky(scene) {
  const mat = new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new T.Color(0x3b82e8) }, hor: { value: new T.Color(0xbfe0ff) }, sunDir: { value: new T.Vector3(0, 1, 0) }, sunCol: { value: new T.Color(0xffeeaa) }, night: { value: 0 }, time: { value: 0 }, cloud: { value: .3 }, dark: { value: 0 }, rainbow: { value: 0 }, flash: { value: 0 }, uPost: PostFlag },
    vertexShader: 'varying vec3 vd;void main(){vd=normalize(position);vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_Position.z=gl_Position.w;}',
    fragmentShader: `varying vec3 vd;uniform vec3 top,hor,sunDir,sunCol;uniform float night,time,cloud,dark,rainbow,flash,uPost;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*n(p);p*=2.03;a*=.5;}return s;}
void main(){vec3 d=normalize(vd);float y=max(d.y,0.);vec3 c=mix(hor,top,pow(y,.5));
float s=max(dot(d,sunDir),0.);c+=sunCol*(pow(s,900.)*4.+pow(s,10.)*.22);
float m=max(dot(d,-sunDir),0.);c+=vec3(.8,.85,1.)*(pow(m,1500.)*3.)*night;
vec3 q=floor(d*220.);float r=fract(sin(dot(q,vec3(12.9,78.2,37.7)))*43758.5);c+=vec3(1.)*step(.9965,r)*night*smoothstep(0.,.25,d.y);
if(d.y>0.){vec2 uv=d.xz/(d.y+.28)*1.4+vec2(time*.012*(1.+cloud*2.),0.);float f=fbm(uv);float cov=mix(.66,.2,cloud);float cl=smoothstep(cov,cov+.22,f);float f2=fbm(uv+sunDir.xz*.07/(d.y+.3)),lit=clamp((f-f2)*5.+.55,0.,1.);vec3 cc=mix(vec3(1.),hor*.9+.1,.25);cc*=mix(.74,1.14,lit)*mix(1.,.8,cl*cloud*.4);cc*=mix(1.,.15,night);cc*=mix(1.,.3,dark);cc+=flash*vec3(.8,.85,1.);c=mix(c,cc,cl*smoothstep(0.,.14,d.y)*mix(.85,1.,cloud));
float ang=acos(clamp(dot(d,-sunDir),-1.,1.));float rb=smoothstep(.70,.72,ang)*(1.-smoothstep(.77,.79,ang))*rainbow*(1.-cl*.85)*smoothstep(0.,.08,d.y);vec3 rc=.5+.5*cos(6.2831*(vec3(0.,.33,.66)+(ang-.70)/.09*.85));c+=rb*rc*.55;c+=flash*.18;}
else c=mix(hor,hor*.6,clamp(-d.y*3.,0.,1.));
gl_FragColor=vec4(mix(c,pow(c,vec3(2.2)),uPost),1.);}`,
  });
  const m = new T.Mesh(new T.SphereGeometry(1800, 32, 16), mat); m.frustumCulled = false; m.renderOrder = -10; scene.add(m); World.sky = m;
}

// ---------- landmarks ----------
function buildLandmarks(scene) {
  const ch = chunkOf(300, -800), cl = chunkOf(0, 0);
  // rocket gantry (Space Coast)
  const rx = 260, rz = -790;
  ch.plain.box(rx - 22, 0, rz - 22, rx + 22, 1.2, rz + 22, 0xaaaaaa); addSolid(rx - 8, rz - 8, rx + 8, rz + 8, 60, 'rocket');
  ch.plain.cyl(rx, rz, 5, 5, 1.2, 80, 0xf4f4f4, 14); ch.plain.cyl(rx, rz, 5.02, 5.02, 30, 36, 0x222222, 14, false); ch.plain.cyl(rx, rz, 5.02, 5.02, 60, 64, 0xd22, 14, false); ch.plain.cyl(rx, rz, 5, 0.3, 80, 100, 0xf4f4f4, 14);
  ch.plain.box(rx + 8, 0, rz - 2, rx + 11, 110, rz + 2, 0xb03a2e); ch.plain.box(rx + 8, 0, rz - 12, rx + 11, 110, rz - 8, 0xb03a2e); ch.plain.box(rx + 8, 105, rz - 12, rx + 11, 108, rz + 2, 0xb03a2e);
  for (let y = 12; y < 100; y += 14) ch.plain.box(rx + 5, y, rz - 1, rx + 11, y + 1, rz + 1, 0x8a8a8a);
  ch.glow.box(rx - .5, 101, rz - .5, rx + .5, 106, rz + .5, 0xff3030);
  // lighthouse
  const lz = -300, lx = shoreX(lz) - 85;
  for (let k = 0; k < 6; k++) ch.plain.cyl(lx, lz, 5 - k * .45, 5 - (k + 1) * .45, k * 6, (k + 1) * 6, k % 2 ? 0xf4f4f4 : 0xd22, 12, k === 5);
  ch.plain.cyl(lx, lz, 3.2, 3.2, 36, 40, 0x222222, 10); ch.glow.cyl(lx, lz, 2.3, 2.3, 40, 44, 0xfff1a0, 10); ch.plain.cyl(lx, lz, 3.4, 0.2, 44, 48, 0x222222, 10);
  addSolid(lx - 4.5, lz - 4.5, lx + 4.5, lz + 4.5, 48, 'lighthouse'); World.lighthouse = { x: lx, z: lz };
  // pier + ferris wheel
  const px0 = shoreX(40) - 30, px1 = shoreX(40) + 120;
  cl.plain.box(px0, 0.35, PIER.z0, px1, 0.55, PIER.z1, 0x9c7a52); PIER.x0 = px0; PIER.x1 = px1;
  for (let x = px0; x < px1; x += 10) for (const z of [PIER.z0 + 1, PIER.z1 - 1]) cl.plain.box(x - .3, -2.5, z - .3, x + .3, .35, z + .3, 0x5a4330);
  cl.plain.box(px0, 0.55, PIER.z0, px1, 1.5, PIER.z0 + .3, 0x7a5c3a); cl.plain.box(px0, 0.55, PIER.z1 - .3, px1, 1.5, PIER.z1, 0x7a5c3a);
  addSolid(px0, PIER.z0 - 0.5, px1, PIER.z0 + .2, 2, 'rail'); addSolid(px0, PIER.z1 - .2, px1, PIER.z1 + .5, 2, 'rail'); addSolid(px1, PIER.z0, px1 + 1, PIER.z1, 2, 'rail');
  for (let k = 0; k < 4; k++) { const sx = px0 + 20 + k * 25; cl.plain.box(sx, 0.55, PIER.z0 + 3, sx + 6, 4, PIER.z0 + 8, pick([0xff7a8a, 0x5ad0e0, 0xffd23f])); cl.glow.box(sx, 4, PIER.z0 + 3, sx + 6, 4.5, PIER.z0 + 8, 0xff3fa4); addSolid(sx, PIER.z0 + 3, sx + 6, PIER.z0 + 8, 4, 'stall'); World.special.pierStall = World.special.pierStall || []; World.special.pierStall.push({ x: sx + 3, z: PIER.z0 + 11 }); }
  const fw = new T.Group(); const fx = px1 - 28, fz = (PIER.z0 + PIER.z1) / 2, wheel = new GB();
  for (let k = 0; k < 16; k++) { const a = k / 16 * TAU, nx = Math.cos(a), ny = Math.sin(a); wheel.box(nx * 9 - .15, ny * 9 - .15, -.3, nx * 9 + .15, ny * 9 + .15, .3, 0xffffff); wheel.box(Math.min(0, nx * 9) - .08, Math.min(0, ny * 9) - .08, -.1, Math.max(0, nx * 9) + .08, Math.max(0, ny * 9) + .08, .1, 0xeeeeee); wheel.box(nx * 9 - .8, ny * 9 - 1.4, -.9, nx * 9 + .8, ny * 9 - .2, .9, pick([0xff3fa4, 0x27e1d0, 0xffd23f, 0x7a6bff])); }
  for (let k = 0; k < 24; k++) { const a = k / 24 * TAU, a2 = (k + 1) / 24 * TAU; wheel.box(Math.min(Math.cos(a), Math.cos(a2)) * 9 - .1, Math.min(Math.sin(a), Math.sin(a2)) * 9 - .1, -.1, Math.max(Math.cos(a), Math.cos(a2)) * 9 + .1, Math.max(Math.sin(a), Math.sin(a2)) * 9 + .1, .1, 0xeeeeee); }
  const wm = wheel.build(new T.MeshLambertMaterial({ vertexColors: true, emissive: 0x222222 }), true); fw.add(wm); fw.position.set(fx, 11, fz); scene.add(fw); World.animated.push(dt => { wm.rotation.z += dt * 0.15; });
  ch.plain.box(fx - 1, 0.55, fz - 6, fx + 1, 11, fz - 4, 0x777777); ch.plain.box(fx - 1, 0.55, fz + 4, fx + 1, 11, fz + 6, 0x777777);
  // causeway rails
  for (let z = 480; z < 940; z += 16) { for (const s of [-1, 1]) cl.plain.box(s * 7.6 - .15, 0, z, s * 7.6 + .15, 1, z + 15.5, 0xdddddd); }
}

// ---------- keys houses ----------
function buildKeys() {
  for (const k of KEYS) {
    const ch = chunkOf(k.x, k.z);
    for (let n = 0; n < 5; n++) {
      const a = rr(0, TAU), d = rr(15, k.r - 16), x = k.x + Math.cos(a) * d, z = k.z + Math.sin(a) * d;
      if (Math.abs(x) < 24 || landSD(x, z) < 18) continue;
      const col = pick(PASTELS); ch.win.box(x - 6, 2.2, z - 5, x + 6, 6.5, z + 5, col, true, col); ch.plain.gable(x - 6, z - 5, x + 6, z + 5, 6.5, 2.2, 0xb8553a, true, 0.7);
      for (const [px, pz] of [[-5.5, -4.5], [5.5, -4.5], [-5.5, 4.5], [5.5, 4.5]]) ch.plain.box(x + px - .25, 0, z + pz - .25, x + px + .25, 2.2, z + pz + .25, 0xdddddd);
      addSolid(x - 6, z - 5, x + 6, z + 5, 6.5, 'keyhouse'); palm(x + rr(-9, 9), z + rr(-9, 9), 1); palm(x + rr(-9, 9), z + rr(-9, 9), 1);
    }
    for (let n = 0; n < 10; n++) { const a = rr(0, TAU), d = rr(5, k.r - 8), x = k.x + Math.cos(a) * d, z = k.z + Math.sin(a) * d; if (Math.abs(x) > 12 && landSD(x, z) > 8) palm(x, z, 1); }
  }
}
function buildBeachProps() {
  // umbrellas, towels, lifeguard towers along the east beach, palms behind
  for (let z = -840; z < 440; z += 14) {
    const sx = shoreX(z), ch = chunkOf(sx, z);
    if (z > 20 && z < 60) continue;
    if (hashN(z, 3) < 0.45) { const x = sx - rr(12, 40), c = pick([0xff3fa4, 0x27e1d0, 0xffd23f, 0xff7a3a, 0x7a6bff, 0xffffff]); ch.plain.cyl(x, z, 0.06, 0.06, 0, 2.4, 0xeeeeee, 4); ch.plain.cyl(x, z, 1.9, 0.1, 2.2, 3.1, c, 8); ch.plain.flat(x - 1, z + 1.2, x + 1, z + 3, 0.05, pick([0xffffff, 0xff9fb0, 0x9fe0ff])); }
    if (hashN(z, 9) < 0.18) palm(sx - rr(52, 62), z, 1);
    if (hashN(z, 11) < 0.04) { const x = sx - 20; ch.plain.box(x - 1.5, 1.8, z - 1.5, x + 1.5, 3.2, z + 1.5, 0xe84a5f); ch.plain.box(x - 1.8, 3.2, z - 1.8, x + 1.8, 3.5, z + 1.8, 0xffffff); for (const [a, b] of [[-1.2, -1.2], [1.2, 1.2], [-1.2, 1.2], [1.2, -1.2]]) ch.plain.box(x + a - .1, 0, z + b - .1, x + a + .1, 1.8, z + b + .1, 0x7a5c3a); addSolid(x - 1.5, z - 1.5, x + 1.5, z + 1.5, 3, 'tower'); World.special.lifeguard = World.special.lifeguard || []; World.special.lifeguard.push({ x: x - 4, z }); }
  }
  // gulf/south shores palms
  for (let k = 0; k < 900; k++) { const x = rr(-1500, 700), z = rr(-1500, 480); const sd = landSD(x, z); if (sd > 58 && sd < 78 && zoneAt(x, z) === 'beach') palm(x, z, 1); }
}
function buildSwamp() {
  for (let k = 0; k < 3400; k++) {
    const x = rr(-1500, -390), z = rr(-1500, 480), sd = landSD(x, z); if (sd < 14 || zoneAt(x, z) !== 'swamp') continue;
    if (Math.abs(z) < 12) continue; if (vnoise(x / 40 + 9, z / 40) < 0.33 && sd > 20) continue;
    if (chance(0.55)) tree(x, z, 1.1); else palm(x, z, 0.9);
  }
}

// ---------- minimap texture ----------
function buildMapTexture() {
  const k = 0.42, W = Math.round(WB.w * k), Hh = Math.round(WB.h * k), c = document.createElement('canvas'); c.width = W; c.height = Hh; const g = c.getContext('2d');
  const img = g.createImageData(W, Hh); const sc2 = document.createElement('canvas'); sc2.width = W; sc2.height = Hh; const sg = sc2.getContext('2d'), simg = sg.createImageData(W, Hh);
  for (let py = 0; py < Hh; py++) for (let px = 0; px < W; px++) {
    const x = px / k + WB.x0, z = py / k + WB.z0, sd = landSD(x, z); let r, gr, b;
    if (sd < 0) { r = 40; gr = 110; b = 150; } else if (sd < 60) { r = 232; gr = 218; b = 168; } else { const zn = zoneAt(x, z); if (zn === 'swamp') { r = 70; gr = 100; b = 60; } else if (zn === 'downtown' || zn === 'deco' || zn === 'tampa' || zn === 'orlando') { r = 150; gr = 150; b = 150; } else if (zn === 'industrial') { r = 130; gr = 130; b = 120; } else { r = 100; gr = 150; b = 80; } }
    const i = (py * W + px) * 4; img.data[i] = r; img.data[i + 1] = gr; img.data[i + 2] = b; img.data[i + 3] = 255;
    const dp = sd >= 0 ? 0 : clamp(-sd / 140, 0, 1), nr = sd >= 0 ? 0 : clamp(-sd / 40, 0, 1); simg.data[i] = dp * 255; simg.data[i + 1] = nr * 255; simg.data[i + 2] = 0; simg.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0); sg.putImageData(simg, 0, 0); { const tx = new T.CanvasTexture(sc2); tx.minFilter = T.LinearFilter; tx.magFilter = T.LinearFilter; tx.generateMipmaps = false; World.shoreTex = tx; World.waterMat.uniforms.tShore.value = tx; } const X = x => (x - WB.x0) * k, Z = z => (z - WB.z0) * k;
  g.fillStyle = '#6f6f78'; for (const s of SOL.list) if (s.h > 4 && s.tag !== 'rail') g.fillRect(X(s.x0), Z(s.z0), Math.max(1, (s.x1 - s.x0) * k), Math.max(1, (s.z1 - s.z0) * k));
  g.fillStyle = '#e8d6a0'; for (const r of World.roadRuns.v) g.fillRect(X(r.x - 5), Z(r.a), 10 * k, (r.b - r.a) * k);
  for (const r of World.roadRuns.h) g.fillRect(X(r.a), Z(r.z - 5), (r.b - r.a) * k, 10 * k);
  g.fillStyle = '#7a5c3a'; g.fillRect(X(PIER.x0), Z(PIER.z0), (PIER.x1 - PIER.x0) * k, (PIER.z1 - PIER.z0) * k);
  World.mapCanvas = c; World.mapK = k;
}

// ---------- lighting & sky state ----------
function setupLights(scene) {
  World.hemi = new T.HemisphereLight(0xcfe6ff, 0x7a6a50, 0.7); scene.add(World.hemi);
  World.sun = new T.DirectionalLight(0xfff2d0, 1.0); World.sun.castShadow = true; World.sun.shadow.mapSize.set(3072, 3072);
  const sc = World.sun.shadow.camera; sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70; sc.near = 1; sc.far = 400; World.sun.shadow.bias = -0.0006; World.sun.shadow.normalBias = 0.5;
  scene.add(World.sun); scene.add(World.sun.target);
  scene.fog = new T.Fog(0xbfe0ff, 120, 1000);
}
const SKY_KEYS = [ // elevation, top, horizon
  { e: -0.25, top: 0x050a1a, hor: 0x0b1530 }, { e: -0.04, top: 0x1b2450, hor: 0xb8527a }, { e: 0.06, top: 0x4a74c8, hor: 0xffa56b },
  { e: 0.28, top: 0x3b86ea, hor: 0xcfe6ff }, { e: 1, top: 0x2f7ae6, hor: 0xb8dcff }];
function updateSky(camPos, focus) {
  const a = (G.tod / 1440) * TAU - Math.PI / 2, e = Math.sin(a), sd = new T.Vector3(Math.cos(a), e, 0.35).normalize();
  let k0 = SKY_KEYS[0], k1 = SKY_KEYS[SKY_KEYS.length - 1];
  for (let i = 0; i < SKY_KEYS.length - 1; i++) if (e >= SKY_KEYS[i].e && e <= SKY_KEYS[i + 1].e) { k0 = SKY_KEYS[i]; k1 = SKY_KEYS[i + 1]; break; }
  const t = clamp((e - k0.e) / (k1.e - k0.e), 0, 1), U = World.sky.material.uniforms;
  U.top.value.set(k0.top).lerp(new T.Color(k1.top), t); U.hor.value.set(k0.hor).lerp(new T.Color(k1.hor), t);
  U.sunDir.value.copy(sd); const nightK = clamp(1 - (e + 0.12) / 0.2, 0, 1); U.night.value = nightK; U.time.value = G.time;
  U.sunCol.value.set(e < 0.25 ? 0xffa060 : 0xffeeaa).multiplyScalar(e > -0.05 ? 1 : 0);
  G.night = nightK; G.sunE = e;
  World.sky.position.copy(camPos);
  const day = clamp((e + 0.05) / 0.3, 0, 1);
  World.sun.color.set(e < 0.2 ? 0xffb070 : 0xfff2d8).lerp(new T.Color(0x5a70c0), 1 - day).multiplyScalar(1);
  World.sun.intensity = lerp(0.18, 1.05, day);
  const L = sd.clone(); if (e < 0) { L.set(-Math.cos(a), -e + 0.2, -0.3).normalize(); }
  World.sun.position.set(focus.x + L.x * 150, L.y * 150 + 20, focus.z + L.z * 150); World.sun.target.position.set(focus.x, 0, focus.z); World.sun.target.updateMatrixWorld();
  World.hemi.intensity = lerp(0.28, 0.72, day); World.hemi.color.set(0xcfe6ff).lerp(new T.Color(0x3a4a80), 1 - day); World.hemi.groundColor.set(0x8a7a60).lerp(new T.Color(0x151a2a), 1 - day);
  World.scene.fog.color.copy(U.hor.value).lerp(new T.Color(0x0b1530), nightK * 0.4); World.scene.fog.near = 100; World.scene.fog.far = lerp(520, 1000, day);
  World.scene.background = World.scene.fog.color;
  if (World.winMat) { World.winMat.emissiveIntensity = clamp(nightK * 1.6, 0, 1.2); }
  if (World.glowMat) World.glowMat.color.setScalar(lerp(0.75, 1.15, nightK));
  { const wu = World.waterMat.uniforms; wu.time.value = G.time; wu.sunDir.value.copy(sd); wu.skyHor.value.copy(U.hor.value); wu.skyTop.value.copy(U.top.value); wu.night.value = nightK; wu.fogColor.value.copy(World.scene.fog.color); wu.fogNear.value = World.scene.fog.near; wu.fogFar.value = World.scene.fog.far; }
  if (typeof Weather !== 'undefined' && Weather.ready) Weather.apply(U, day);
}

// ---------- master build ----------
function buildWorld(scene, onProgress) {
  World.scene = scene; seedRng(20260);
  const [bt, et, st] = makeBuildingTex();
  World.winMat = new T.MeshPhongMaterial({ map: bt, emissiveMap: et, emissive: 0xffffff, emissiveIntensity: 0, vertexColors: true, specularMap: st, specular: 0xffffff, shininess: 90, reflectivity: 0.5, combine: T.MixOperation });
  World.plainMat = new T.MeshLambertMaterial({ vertexColors: true });
  World.glowMat = new T.MeshBasicMaterial({ vertexColors: true });
  setupLights(scene); buildSky(scene); buildTerrain(scene);
  genBlocks(); assignSpecials();
  for (const b of World.blocks) buildBlock(b);
  buildRoads(scene); buildLandmarks(scene); buildKeys(); buildKeyWest(); buildBeachProps(); buildSwamp();
  // beach anchors for blocks on the east edge
  for (const b of World.blocks) { if (b.zone !== 'deco' && b.zone !== 'suburb') continue; if (!World.blockMap.get((b.i + 1) + ',' + b.j) && b.cx > 200) { const zz = b.cz + rr(-15, 15); let x = b.x1; while (landSD(x + 4, zz) > rr(10, 40)) x += 4; addAnchor('beach', b, 1, .5, x, zz); addAnchor('beach', b, 1, .5, x - rr(0, 10), zz + rr(-10, 10)); } }
  World.hooks = { chunkOf, palm, tree, addSolid };
  return World;
}
function finalizeWorld(scene) { // call after shops add their geometry
  buildVegetation(scene);
  for (const c of chunkMap.values()) {
    const a = c.win.build(World.winMat), b = c.plain.build(World.plainMat), g = c.glow.build(World.glowMat, false);
    for (const m of [a, b, g]) if (m) scene.add(m);
  }
  buildMapTexture();
}
