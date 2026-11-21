'use strict';
// ===== Car models: lofted curved bodies, glass greenhouse, real spoked wheels, lights, trim =====
const sgp = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm3 = a => { const l = Math.hypot(a[0], a[1], a[2]); return l > 1e-9 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 1, 0]; };
const emptyGeo = new T.BufferGeometry();
const UV0 = [.015, .015, .015, .015, .015, .015, .015, .015];

function loftGrid(secs, M = 22) {
  const R = secs.length, P = [];
  for (let i = 0; i < R; i++) { const s = secs[i], ym = (s.y0 + s.y1) / 2, hy = (s.y1 - s.y0) / 2, row = []; for (let k = 0; k <= M; k++) { const t = k / M * TAU; row.push([s.w * sgp(Math.cos(t), 2 / s.n), ym + hy * sgp(Math.sin(t), 2 / s.n), s.z]); } P.push(row); }
  const N = P.map((row, i) => row.map((p, k) => {
    const a = P[Math.max(i - 1, 0)][k], b = P[Math.min(i + 1, R - 1)][k], pr = row[k === 0 ? M - 1 : k - 1], nx = row[k === M ? 1 : k + 1];
    let n = norm3(cross3(sub3(nx, pr), sub3(b, a))); const ym = (secs[i].y0 + secs[i].y1) / 2; if (dot3(n, [p[0], p[1] - ym, 0]) < 0) n = [-n[0], -n[1], -n[2]]; return n;
  }));
  return { P, N, R, M };
}
function emitLoft(gr, choose) { // choose(ny) -> {gb,col}
  const { P, N, R, M } = gr;
  for (let i = 0; i < R - 1; i++) for (let k = 0; k < M; k++) {
    const idx = [[i, k], [i, k + 1], [i + 1, k + 1], [i + 1, k]], pts = idx.map(([a, b]) => P[a][b]), ns = idx.map(([a, b]) => N[a][b]);
    const ny = (ns[0][1] + ns[1][1] + ns[2][1] + ns[3][1]) / 4, tg = choose(ny, pts); if (!tg) continue; const { gb, col } = tg, c = rgb(col);
    let order = [0, 1, 2, 3]; const fn = cross3(sub3(pts[1], pts[0]), sub3(pts[2], pts[0])); const vn = [ns[0][0] + ns[2][0], ns[0][1] + ns[2][1], ns[0][2] + ns[2][2]]; if (dot3(fn, vn) < 0) order = [0, 3, 2, 1];
    const base = gb.p.length / 3; for (const o of order) { const hy = pts[o][1], sm = Math.min(1, Math.max(0, (hy - 0.2) / 0.5)), f = 0.66 + 0.34 * sm * sm * (3 - 2 * sm), cf = { r: c.r * f, g: c.g * f, b: c.b * f }; gb.vtx(pts[o][0], pts[o][1], pts[o][2], ns[o][0], ns[o][1], ns[o][2], .015, .015, cf); } gb.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  for (const [ri, nz] of [[0, -1], [R - 1, 1]]) { // end caps
    const ring = P[ri], ctr = [0, 0, ring[0][2]]; for (let k = 0; k < M; k++) { ctr[0] += ring[k][0] / M; ctr[1] += ring[k][1] / M; }
    const tg = choose(0, ring[0], true); if (!tg) continue; const { gb, col } = tg, c = rgb(col);
    for (let k = 0; k < M; k++) { let a = ring[k], b = ring[k + 1]; const fn = cross3(sub3(a, ctr), sub3(b, ctr)); let tri = [ctr, a, b]; if (fn[2] * nz < 0) tri = [ctr, b, a]; const base = gb.p.length / 3; for (const p of tri) gb.vtx(p[0], p[1], p[2], 0, 0, nz, .015, .015, c); gb.i.push(base, base + 1, base + 2); }
  }
}
function quadN(gb, pts, n, col) { const fn = cross3(sub3(pts[1], pts[0]), sub3(pts[2], pts[0])); const o = dot3(fn, n) < 0 ? [0, 3, 2, 1] : [0, 1, 2, 3]; gb.quad(pts[o[0]], pts[o[1]], pts[o[2]], pts[o[3]], n, col, UV0); }

function wheelGeometry(r, w, ns = 5, thick = 1) {
  const gb = new GB(); gb.wheel(0, 0, 0, r, w, 0x131316, 0x2a2a2e, 18);
  for (const sx of [-1, 1]) { const x = sx * (w / 2 + 0.012);
    for (let a = 0; a < ns; a++) { const ang = a / ns * TAU + 0.3, c = Math.cos(ang), s = Math.sin(ang), r0 = r * 0.12, r1 = r * 0.58, hw = r * 0.055 * thick, px = -s, pz = c;
      const q = [[x, s * r0 + (-c) * hw, c * r0 + s * hw], [x, s * r1 + (-c) * hw, c * r1 + s * hw], [x, s * r1 + c * hw, c * r1 - s * hw], [x, s * r0 + c * hw, c * r0 - s * hw]]; quadN(gb, q, [sx, 0, 0], 0xcfd3d8); }
    quadN(gb, [[x, -r * .13, -r * .13], [x, r * .13, -r * .13], [x, r * .13, r * .13], [x, -r * .13, r * .13]], [sx, 0, 0], 0x9aa0a8); // centre cap
    for (let j = 0; j < 20; j++) { const a0 = j / 20 * TAU, a1 = (j + 1) / 20 * TAU, xl = sx * (w / 2 + 0.016); quadN(gb, [[xl, Math.sin(a0) * r * .6, Math.cos(a0) * r * .6], [xl, Math.sin(a1) * r * .6, Math.cos(a1) * r * .6], [xl, Math.sin(a1) * r * .68, Math.cos(a1) * r * .68], [xl, Math.sin(a0) * r * .68, Math.cos(a0) * r * .68]], [sx, 0, 0], 0xe4e8ec); } // polished rim lip
  }
  return gb.build(carMat, true).geometry;
}

const ARCH = {
  sedan: { belt: 1.0, nose: .6, hood: .91, trunk: .9, tail: .72, roof: 1.45, c0: -.46, c1: .36, r0: -.26, r1: .12, wr: .33 },
  compact: { belt: .98, nose: .62, hood: .88, trunk: .98, tail: .86, roof: 1.5, c0: -.62, c1: .34, r0: -.55, r1: .1, wr: .31 },
  sports: { belt: .8, nose: .5, hood: .66, trunk: .8, tail: .64, roof: 1.17, c0: -.32, c1: .24, r0: -.15, r1: .0, wr: .35 },
  muscle: { belt: .98, nose: .64, hood: .97, trunk: .92, tail: .74, roof: 1.4, c0: -.36, c1: .14, r0: -.22, r1: -.04, wr: .35 },
  suv: { belt: 1.22, nose: .82, hood: 1.14, trunk: 1.2, tail: 1.02, roof: 1.8, c0: -.84, c1: .42, r0: -.82, r1: .22, wr: .38 },
  pickup: { belt: 1.2, nose: .8, hood: 1.12, trunk: .98, tail: .98, roof: 1.82, c0: -.18, c1: .4, r0: -.12, r1: .2, wr: .38, bed: true },
  van: { belt: 1.52, nose: .86, hood: 1.4, trunk: 1.6, tail: 1.5, roof: 2.1, c0: -.92, c1: .55, r0: -.9, r1: .42, wr: .36 },
  swat: { belt: 1.7, nose: .95, hood: 1.5, trunk: 1.8, tail: 1.7, roof: 2.3, c0: -.8, c1: .5, r0: -.78, r1: .35, wr: .42 },
};
ARCH.taxi = ARCH.sedan; ARCH.cop = ARCH.sedan;

function carModel(type, color, wreck) {
  const t = CAR_TYPES[type];
  if (t.water) return boatModel(type, color, wreck);
  if (type === 'bike') return bikeModel(color, wreck);
  const A = ARCH[type] || ARCH.sedan, L = t.len / 2, W = t.w / 2, gy = 0.2, wr = A.wr;
  const b = new GB(), g = new GB(), gl = new GB(), tl = new GB(), paint = wreck ? 0x1a1a1a : color, blackC = 0x0e0e11, chrome = wreck ? 0x2a2a2a : 0xcfd4da, glassC = 0x182838;
  const roofCol = type === 'cop' ? 0x101216 : paint, nb = 4.6;
  const vr = Math.floor(hashN(type.charCodeAt(0) * 977 + type.length * 131, color | 0) * 65536), bumpC = (vr & 4) && type !== 'cop' && type !== 'swat' ? paint : 0x1b1b20, plateC = [0xf1f1ec, 0xf1f1ec, 0xf2e08a, 0xe8eef6][(vr >> 5) & 3], stripeC = [0xf1f1ec, 0x14141a, 0xe0b030, 0xd02a2a][(vr >> 7) & 3];
  const sec = (z, y0, y1, w, n) => ({ z, y0, y1, w, n });
  const lowTail = A.bed ? A.trunk : A.trunk;
  const bodySecs = [
    sec(-L, gy + .14, A.tail, W * .84, 3), sec(-L + .1, gy + .03, A.trunk, W * .95, nb), sec(-L * .55, gy, A.belt, W, nb + .4), sec(-L * .05, gy, A.belt + (A.bed ? 0 : .02), W, nb + .4),
    sec(L * .4, gy, A.hood + .06, W, nb), sec(L * .75, gy, A.hood, W * .98, nb - .2), sec(L - .16, gy + .02, A.nose + .12, W * .94, 3.4), sec(L, gy + .1, A.nose - .06, W * .86, 3)];
  if (A.bed) { bodySecs[1] = sec(-L + .1, gy + .03, A.trunk, W * .96, nb); bodySecs[2] = sec(-L * .55, gy, A.trunk, W, nb); bodySecs[3] = sec(-L * .05, gy, A.trunk + .02, W, nb); bodySecs[4] = sec(L * .12, gy, A.belt, W, nb); }
  emitLoft(loftGrid(bodySecs), () => ({ gb: b, col: paint }));
  // greenhouse
  const cs = [sec(L * A.c0, A.belt - .06, A.belt - .02, W * .82, 3), sec(L * A.r0, A.belt - .06, A.roof, W * .74, 3.4), sec(L * A.r1, A.belt - .06, A.roof - .01, W * .74, 3.4), sec(L * A.c1, A.belt - .06, A.belt - .02, W * .85, 3)];
  const hasCab = type !== 'swat'; if (hasCab) emitLoft(loftGrid(cs, 18), (ny, pts, cap) => cap ? { gb: gl, col: glassC } : (ny > 0.62 ? { gb: b, col: roofCol } : { gb: gl, col: glassC }));
  else emitLoft(loftGrid(cs, 18), () => ({ gb: b, col: paint }));
  // pillars (body-colour strips at glass corners)
  if (hasCab) for (const sx of [-1, 1]) { b.box(sx * W * .76 - .03, A.belt - .02, L * A.c1 - .1, sx * W * .76 + .03, A.roof - .02, L * A.c1 + .02, roofCol); b.box(sx * W * .72 - .035, A.belt - .02, L * A.c0 * .75 - .02, sx * W * .72 + .035, A.roof - .03, L * A.c0 * .75 + .12, roofCol); b.box(sx * W * .76 - .02, A.belt - .02, -L * .06, sx * W * .76 + .02, A.roof - .08, -L * .06 + .05, blackC); }
  if (hasCab && !wreck) { // interior: seats, dash, wheel
    for (const sx of [-1, 1]) { b.box(sx * W * .42 - .26, gy + .12, -L * .3, sx * W * .42 + .26, gy + .34, -L * .06, 0x26262c); b.box(sx * W * .42 - .26, gy + .12, -L * .36, sx * W * .42 + .26, A.belt + .22, -L * .3, 0x26262c); }
    b.box(-W * .8, A.belt - .22, L * A.c1 - .42, W * .8, A.belt + .0, L * A.c1 - .12, 0x1a1a1e); b.box(W * .42 - .2, A.belt - .14, L * .02, W * .42 + .2, A.belt - .09, L * .1, 0x101012);
  }
  // undercarriage
  b.box(-W * .8, gy - .05, -L * .86, W * .8, gy + .2, L * .86, 0x0a0a0c);
  // wheel arches + wheels positions
  const wz = [L * .62, -L * .6], wx = W * .86, wpos = [];
  const swY = (A.belt + gy) / 2, swH = (A.belt - gy) / 2, swN = nb + .4, sw = y => W * Math.pow(Math.max(1e-4, 1 - Math.pow(Math.min(1, Math.abs((y - swY) / swH)), swN)), 1 / swN) * 1.012; // body half-width at height y, so arches hug the surface
  for (const z of wz) for (const sx of [-1, 1]) { wpos.push([sx * wx, z, z > 0]);
    const ra = wr * 1.22, px = y => sx * sw(y); for (let j = 0; j < 20; j++) { const a0 = j / 20 * Math.PI, a1 = (j + 1) / 20 * Math.PI, ya = wr + Math.sin(a0) * ra, yb = wr + Math.sin(a1) * ra, yao = wr + Math.sin(a0) * (ra + .06), ybo = wr + Math.sin(a1) * (ra + .06);
      quadN(b, [[px(ya), ya, z + Math.cos(a0) * ra], [px(yb), yb, z + Math.cos(a1) * ra], [px(ybo), ybo, z + Math.cos(a1) * (ra + .06)], [px(yao), yao, z + Math.cos(a0) * (ra + .06)]], [sx, 0, 0], 0x15151a);
      quadN(b, [[px(wr), wr, z], [px(ya), ya, z + Math.cos(a0) * ra], [px(yb), yb, z + Math.cos(a1) * ra], [px(wr), wr, z]], [sx, 0, 0], 0x08080a); } }
  // lights
  const hy = A.nose + .02;
  for (const sx of [-1, 1]) {
    b.box(sx * W * .66 - .26, hy - .08, L - .12, sx * W * .66 + .26, hy + .14, L + .03, chrome);
    g.box(sx * W * .66 - .22, hy - .05, L - .1, sx * W * .66 + .22, hy + .11, L + .05, wreck ? 0x111111 : 0xfff6d8); g.box(sx * W * .66 - .22, hy - .12, L - .1, sx * W * .66 + .22, hy - .08, L + .04, wreck ? 0x111111 : 0xffcf80);
    tl.box(sx * W * .66 - .3, A.tail - .24, -L - .03, sx * W * .66 + .3, A.tail - .06, -L + .12, wreck ? 0x111111 : 0xd01818);
    b.box(sx * W * .66 - .3, A.tail - .26, -L - .015, sx * W * .66 + .3, A.tail - .24, -L + .1, chrome);
  }
  tl.box(-.3, A.tail - .22, -L - .02, .3, A.tail - .1, -L + .1, wreck ? 0x111111 : 0x9a1010);
  // grille, bumpers, plates, trim
  b.box(-W * .55, A.nose - .26, L - .1, W * .55, A.nose - .06, L + .04, blackC); for (let k = 0; k < 4; k++) b.box(-W * .5, A.nose - .24 + k * .045, L + .03, W * .5, A.nose - .21 + k * .045, L + .055, chrome);
  b.box(-W * .86, gy + .06, L - .16, W * .86, gy + .3, L + .03, bumpC); b.box(-W * .86, gy + .06, -L - .03, W * .86, gy + .3, -L + .16, bumpC);
  b.box(-.27, gy + .14, L + .02, .27, gy + .26, L + .045, plateC); b.box(-.27, gy + .18, -L - .045, .27, gy + .3, -L - .02, plateC);
  for (const sx of [-1, 1]) { b.box(sx * W * .99 - .01, gy + .02, -L * .45, sx * W * .99 + .02, gy + .13, L * .42, 0x14141a); // rocker
    b.box(sx * W * .985, gy + .15, -L * .06 - .015, sx * W * .985 + .02 * sx, A.belt - .03, -L * .06 + .015, 0x0b0b0e); b.box(sx * W * .985, gy + .15, L * .3 - .015, sx * W * .985 + .02 * sx, A.belt - .03, L * .3 + .015, 0x0b0b0e); b.box(sx * W * .985, gy + .15, -L * .44 - .015, sx * W * .985 + .02 * sx, A.belt - .03, -L * .44 + .015, 0x0b0b0e);
    b.box(sx * W * .985 - .02, A.belt - .2, L * .02, sx * W * .985 + .03, A.belt - .17, L * .09, chrome); b.box(sx * W * .985 - .02, A.belt - .2, -L * .3, sx * W * .985 + .03, A.belt - .17, -L * .23, chrome);
    b.box(sx * (W + .02) - .035, A.belt - .02, L * A.c1 * .62, sx * (W + .02) + .035, A.belt + .12, L * A.c1 * .62 + .2, paint); b.box(sx * (W + .06) - .03, A.belt + .01, L * A.c1 * .62 + .03, sx * (W + .06) + .03, A.belt + .11, L * A.c1 * .62 + .17, blackC);
    if (type !== 'van') b.box(sx * W * .5 - .03, A.belt + .01, L * A.c1 - .14, sx * W * .5 + .02 * sx, A.belt + .02, L * A.c1 - .04, 0x0b0b0e);
  }
  if (type === 'sedan' || type === 'taxi' || type === 'cop') for (const sx of [-1, 1]) b.box(sx * W * .4 - .05, gy + .02, -L - .12, sx * W * .4 + .05, gy + .12, -L + .03, chrome);
  // type specific
  if (type === 'sports') { b.box(-W * .8, A.tail + .22, -L + .1, W * .8, A.tail + .27, -L + .5, blackC); for (const sx of [-1, 1]) b.box(sx * W * .55 - .03, A.tail, -L + .2, sx * W * .55 + .03, A.tail + .24, -L + .4, blackC); b.box(-W * .85, gy + .02, L - .05, W * .85, gy + .09, L + .15, blackC); for (const sx of [-1, 1]) b.box(sx * W * .985, gy + .3, -L * .12, sx * W * .985 + .03 * sx, gy + .45, L * .1, blackC); }
  if (type === 'muscle') { b.box(-W * .3, A.hood + .02, L * .42, W * .3, A.hood + .16, L * .72, blackC); b.box(-W * .12, A.hood + .06, -L * .05, -W * .06, A.hood + .07, L * .72, 0xf1f1ec); b.box(W * .06, A.hood + .06, -L * .05, W * .12, A.hood + .07, L * .72, 0xf1f1ec); }
  if (type === 'suv') { for (const sx of [-1, 1]) b.box(sx * W * .6 - .04, A.roof + .0, -L * .8, sx * W * .6 + .04, A.roof + .1, L * .18, chrome); for (const z of [-L * .6, -L * .2, L * .1]) b.box(-W * .6, A.roof + .06, z - .03, W * .6, A.roof + .1, z + .03, chrome); for (const sx of [-1, 1]) b.box(sx * W * .985, gy + .13, -L * .35, sx * W * .985 + .1 * sx, gy + .2, L * .35, 0x1a1a1e); }
  if (type === 'pickup') { const bz0 = -L + .05, bz1 = -L * .12; b.box(-W * .93, A.trunk, bz0, W * .93, A.trunk + .02, bz1, 0x0e0e11); for (const sx of [-1, 1]) b.box(sx * W * .93 - .05, A.trunk, bz0, sx * W * .93 + .05, A.trunk + .26, bz1, paint); b.box(-W * .93, A.trunk, bz1 - .05, W * .93, A.trunk + .28, bz1, paint); b.box(-W * .93, A.trunk, bz0, W * .93, A.trunk + .22, bz0 + .06, paint); }
  if (type === 'van') { for (const sx of [-1, 1]) { b.box(sx * W * .985, A.belt - .9, -L * .35 - .015, sx * W * .985 + .02 * sx, A.belt - .1, -L * .35 + .015, 0x0b0b0e); b.box(sx * W * .985, A.belt - .9, -L * .9, sx * W * .985 + .02 * sx, A.belt - .85, -L * .35, 0x0b0b0e); } b.box(-.3, A.roof, -L * .3, .3, A.roof + .1, L * .0, 0x888c92); gl.box(-W * .8, A.belt, -L + .01, W * .8, A.roof - .15, -L + .04, glassC); }
  if (type === 'swat') { for (const sx of [-1, 1]) { gl.box(sx * W * .98 - .01, A.belt + .2, -L * .1, sx * W * .98 + .01, A.belt + .5, L * .3, glassC); b.box(sx * W * .985, 0.5, -L * .8, sx * W * .985 + .04 * sx, 1.4, -L * .6, 0x0a0a0c); } b.box(-W * .7, A.roof, -L * .8, W * .7, A.roof + .22, L * .1, 0x23262b); b.box(-W * .8, gy + .02, L - .05, W * .8, gy + .5, L + .2, 0x0a0a0c); }
  if (type === 'cop') { for (const sx of [-1, 1]) { b.box(sx * W * .995, gy + .12, -L * .47, sx * W * .995 + .015 * sx, A.belt - .04, L * .22, 0xf2f2f2); b.box(sx * W * .995 + .01 * sx, A.belt - .26, -L * .47, sx * W * .995 + .025 * sx, A.belt - .18, L * .22, 0x1d4aa8); }
    b.box(-W * .85, gy + .06, L - .02, W * .85, gy + .62, L + .12, 0x0a0a0c); b.box(-W * .6, A.roof + .02, -L * .22, W * .6, A.roof + .08, -L * .1, 0x1a1a1d); }
  if (type === 'taxi') { b.box(-.4, A.roof, -L * .12, .4, A.roof + .17, L * .02, 0xf6f6e6); g.box(-.34, A.roof + .02, -L * .1, .34, A.roof + .15, L * 0, 0xfff0a0); for (let k = 0; k < 14; k++) for (const sx of [-1, 1]) if (k % 2) b.box(sx * W * .995, gy + .4, -L * .8 + k * L * .12, sx * W * .995 + .015 * sx, gy + .5, -L * .8 + k * L * .12 + L * .12, 0x111111); }
  // per-model variants: side stripe, roof cargo box / bike rack (deterministic from type+colour)
  if (!wreck && (vr & 1) && ['sports', 'muscle', 'compact', 'sedan'].includes(type)) for (const sx of [-1, 1]) b.box(sx * W * .993, gy + .3, -L * .62, sx * W * .993 + .012 * sx, gy + .38, L * .55, stripeC);
  if (!wreck && (vr & 2) && ['suv', 'compact', 'sedan', 'pickup'].includes(type) && hasCab) { b.box(-W * .5, A.roof + .0, -L * .28, W * .5, A.roof + .2, L * .06, (vr & 8) ? 0x2a2c32 : 0x6a7078); b.box(-W * .55, A.roof - .02, -L * .3, -W * .5, A.roof + .02, L * .08, 0x14141a); b.box(W * .5, A.roof - .02, -L * .3, W * .55, A.roof + .02, L * .08, 0x14141a); }
  // wipers + antenna + exhaust
  if (hasCab && type !== 'swat') { for (const sx of [-.45, .1]) b.box(W * sx - .02, A.belt, L * A.c1 - .18, W * sx + .02, A.belt + .02, L * A.c1 - .04, blackC); if (type === 'sedan' || type === 'taxi' || type === 'cop' || type === 'suv') b.box(W * .55, A.roof - .1, -L * .4, W * .55 + .02, A.roof + .5, -L * .4 + .02, 0x111111); }
  for (const sx of [-1, 1]) if (type !== 'swat' && type !== 'van') b.box(sx * W * .55 - .05, gy + .02, -L - .08, sx * W * .55 + .05, gy + .11, -L + .1, wreck ? 0x222 : 0xbfc4ca);
  const wheelR = wr, wheel = wheelGeometry(wr, 0.26, [5, 6, 8, 10][(vr >> 2) & 3], [1.25, 1, 0.75, 0.55][(vr >> 2) & 3]);
  return { body: b.build(carMat, true).geometry, glow: g.p.length ? g.build(carGlowMat, false).geometry : null, glass: gl.p.length ? gl.build(carGlassMat, false).geometry : null, tail: tl.p.length ? tl.build(carGlowMat, false).geometry : null, wheel, wr: wheelR, wpos };
}

function bikeModel(color, wreck) {
  const b = new GB(), g = new GB(), paint = wreck ? 0x1a1a1a : color, dark = 0x131316, chrome = 0xcfd4da;
  const sec = (z, y0, y1, w, n) => ({ z, y0, y1, w, n });
  emitLoft(loftGrid([sec(-.1, .62, .82, .1, 2.4), sec(.1, .62, .98, .18, 2.4), sec(.35, .66, 1.0, .2, 2.4), sec(.55, .7, .98, .12, 2.4), sec(.62, .74, .92, .05, 2)], 14), () => ({ gb: b, col: paint })); // tank
  b.box(-.11, .78, -.62, .11, .9, -.12, 0x1a1a1e); b.box(-.12, .66, -.4, .12, .78, -.05, 0x1a1a1e); b.box(-.1, .88, -.78, .1, .98, -.6, 0x1a1a1e); // seat
  b.box(-.16, .3, -.28, .16, .7, .28, 0x2a2e34); b.box(-.1, .34, -.2, .1, .62, .2, 0x555a62); // engine
  b.box(.14, .28, -.7, .2, .42, .1, chrome); b.box(.18, .3, -.9, .25, .38, -.55, chrome); // exhaust
  b.box(-.04, .4, .62, .04, 1.05, .72, chrome); b.box(-.5, 1.04, .62, .5, 1.1, .7, 0x1b1b20); for (const sx of [-1, 1]) { b.box(sx * .48 - .03, 1.04, .66, sx * .48 + .03, 1.12, .75, 0x222222); b.box(sx * .22 - .02, .95, .55, sx * .22 + .02, 1.05, .62, chrome); } // forks / bars
  b.box(-.14, .96, .66, .14, 1.12, .78, chrome); g.box(-.1, .98, .74, .1, 1.1, .8, wreck ? 0x111111 : 0xfff6d8); b.box(-.12, .8, -.98, .12, .92, -.86, 0x1a1a1a);
  const tl = new GB(); tl.box(-.1, .84, -.96, .1, .92, -.86, wreck ? 0x111111 : 0xd01818);
  return { body: b.build(carMat, true).geometry, glow: g.build(carGlowMat, false).geometry, glass: null, tail: tl.build(carGlowMat, false).geometry, wheel: wheelGeometry(.33, .13), wr: .33, wpos: [[0, .78, true], [0, -.78, false]] };
}

function boatModel(type, color, wreck) {
  const t = CAR_TYPES[type], L = t.len / 2, W = t.w / 2, b = new GB(), g = new GB(), gl = new GB(), paint = wreck ? 0x1a1a1a : color, deck = wreck ? 0x2a2a2a : 0xf2f2f2, glassC = 0x182838, jet = type === 'jetski';
  const sec = (z, y0, y1, w, n) => ({ z, y0, y1, w, n });
  emitLoft(loftGrid([sec(-L, .06, .62, W * .9, 2.6), sec(-L * .55, -.08, .72, W, 2.8), sec(L * .15, -.08, .7, W * .92, 2.8), sec(L * .62, .08, .66, W * .56, 2.3), sec(L * .9, .3, .62, W * .2, 2.1), sec(L, .42, .6, .04, 2)], 20), (ny) => ny > .7 ? { gb: b, col: deck } : { gb: b, col: paint });
  b.box(-W * .86, .66, -L * .96, W * .86, .72, L * .5, deck);
  if (!jet) { gl.box(-W * .7, .72, -L * .05, W * .7, 1.28, L * .02, glassC); for (const sx of [-1, 1]) b.box(sx * W * .7 - .03, .72, -L * .05, sx * W * .7 + .03, 1.28, L * .02, 0xcfd4da); b.box(-W * .5, .72, -L * .5, W * .5, 1.0, -L * .1, 0x222226); b.box(-W * .5, .72, -L * .9, W * .5, .92, -L * .6, 0x2a2a30); b.box(-.25, .3, -L - .5, .25, 1.1, -L, 0x1a1a1e); b.box(-.15, 0, -L - .55, .15, .4, -L - .3, 0x888c92); }
  else { b.box(-.3, .72, -L * .6, .3, .92, L * .1, 0x1a1a1e); b.box(-.35, .8, L * .15, .35, .9, L * .22, 0x222226); gl.box(-.3, .9, L * .22, .3, 1.15, L * .3, glassC); b.box(-.06, .9, L * .15, .06, 1.1, L * .24, 0x888c92); }
  g.box(-.15, .68, L * .88, .15, .78, L * .95, wreck ? 0x111111 : 0xfff6d8);
  return { body: b.build(carMat, true).geometry, glow: g.build(carGlowMat, false).geometry, glass: gl.p.length ? gl.build(carGlassMat, false).geometry : null, tail: null, wheel: null, wr: 0, wpos: [] };
}

// override the earlier simple generator with the new lofted models
function carGeos(type, color, wreck) {
  const key = 'm|' + type + '|' + color + (wreck ? 'W' : ''); let c = geoCache.get(key); if (c) return c;
  c = carModel(type, color, wreck); geoCache.set(key, c); return c;
}
