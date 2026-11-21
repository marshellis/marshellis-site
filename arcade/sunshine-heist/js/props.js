'use strict';
// ===== Street life: working traffic signals, hydrants, bins, benches, shrubs =====
const Signals = {
  period: 26,
  state(node, axis) { const t = (G.time + ((node.i * 7 + node.j * 13) % 26 + 26) % 26) % 26; if (axis === 'ns') return t < 11 ? 'green' : t < 13 ? 'yellow' : 'red'; return t < 13 ? 'red' : t < 24 ? 'green' : 'yellow'; },
};
const Props = {
  nodes: [], lamps: null, lastT: 0,
  build(scene) {
    const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), p = new T.Vector3(), s = new T.Vector3(1, 1, 1), col = new T.Color();
    const nodes = [...World.nodes.values()].filter(n => n.links.length >= 3 && zoneAt(n.x, n.z) !== 'keys'); this.nodes = nodes;
    const poles = new T.InstancedMesh(new T.BoxGeometry(0.2, 6.2, 0.2), new T.MeshLambertMaterial({ color: 0x3a3e44 }), nodes.length * 4), heads = new T.InstancedMesh(new T.BoxGeometry(0.4, 1.25, 0.32), new T.MeshLambertMaterial({ color: 0x15161a }), nodes.length * 8);
    const lampG = new T.BoxGeometry(0.24, 0.24, 0.08); this.lamps = new T.InstancedMesh(lampG, new T.MeshBasicMaterial({ color: 0xffffff }), nodes.length * 24); this.lamps.setColorAt(0, col.setRGB(0.1, 0.1, 0.1));
    let pi = 0, hi = 0, li = 0;
    nodes.forEach(n => {
      n.lampBase = li; n.sigNS = null; n.sigEW = null;
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const px = n.x + sx * 8.9, pz = n.z + sz * 8.9; p.set(px, 3.1, pz); q.identity(); m4.compose(p, q, s); poles.setMatrixAt(pi++, m4);
        // head facing along z (serves north/south traffic) and head facing along x (east/west traffic)
        for (const axis of [0, 1]) {
          const fx = axis ? sx : 0, fz = axis ? 0 : sz; p.set(px + fx * 0.28, 5.4, pz + fz * 0.28); q.setFromEuler(e.set(0, axis ? Math.PI / 2 : 0, 0)); m4.compose(p, q, s); heads.setMatrixAt(hi++, m4);
          for (let k = 0; k < 3; k++) { p.set(px + fx * 0.46, 5.82 - k * 0.38, pz + fz * 0.46); m4.compose(p, q, s); this.lamps.setMatrixAt(li, m4); this.lamps.setColorAt(li, col.setRGB(0.1, 0.1, 0.1)); li++; }
        }
      }
    });
    for (const m of [poles, heads, this.lamps]) { m.frustumCulled = false; scene.add(m); } poles.castShadow = true; this.lamps.instanceColor.setUsage(T.DynamicDrawUsage);
    // furniture & shrubs along sidewalks
    const bushes = [], hyd = [], bins = [], benches = [];
    for (const b of World.blocks) {
      const edge = (side, t, off) => side === 0 ? [lerp(b.x0 + 4, b.x1 - 4, t), b.z0 + off] : side === 2 ? [lerp(b.x0 + 4, b.x1 - 4, t), b.z1 - off] : side === 3 ? [b.x0 + off, lerp(b.z0 + 4, b.z1 - 4, t)] : [b.x1 - off, lerp(b.z0 + 4, b.z1 - 4, t)];
      const urban = b.zone === 'downtown' || b.zone === 'deco' || b.zone === 'tampa' || b.zone === 'orlando';
      for (let sd = 0; sd < 4; sd++) {
        if (hashN(b.i * 31 + sd, b.j * 17) < 0.55) hyd.push(edge(sd, 0.12 + hashN(b.i, b.j + sd) * 0.2, 0.7)); if (hashN(b.i * 5 + sd, b.j * 3) < 0.5) bins.push(edge(sd, 0.6 + hashN(b.j, sd) * 0.3, 0.9));
        if (b.sub === 'park' || urban) if (hashN(b.i + sd, b.j * 9) < 0.35) benches.push([...edge(sd, 0.45, 1.4), sd]);
        if (!urban || hashN(b.i * 2, b.j * 7 + sd) < 0.3) for (let k = 0; k < 3; k++) if (hashN(b.i * 13 + k, b.j * 11 + sd) < 0.7) bushes.push([...edge(sd, 0.18 + k * 0.32 + hashN(k, sd) * 0.1, 4.6)]);
      }
    }
    const mk = (geo, mat, list, f) => { const im = new T.InstancedMesh(geo, mat, Math.max(1, list.length)); list.forEach((a, i) => { f(a, i, im); }); im.count = list.length; im.frustumCulled = false; im.castShadow = true; scene.add(im); return im; };
    const bg = new T.IcosahedronGeometry(0.9, 1); bg.scale(1, 0.75, 1); bg.translate(0, 0.65, 0);
    const bm = mk(bg, new T.MeshLambertMaterial({ color: 0xffffff }), bushes, (a, i, im) => { const sc = 0.7 + hashN(a[0], a[1]) * 0.9; p.set(a[0], 0.16, a[1]); q.setFromEuler(e.set(0, hashN(a[1], a[0]) * 6, 0)); s.set(sc * 1.2, sc, sc * 1.2); m4.compose(p, q, s); im.setMatrixAt(i, m4); im.setColorAt(i, col.setHSL(0.27 + hashN(a[0] + 3, a[1]) * 0.1, 0.5, 0.2 + hashN(a[1] + 9, a[0]) * 0.12)); }); s.set(1, 1, 1);
    const hg = new T.CylinderGeometry(0.18, 0.22, 0.75, 8); hg.translate(0, 0.52, 0);
    mk(hg, new T.MeshLambertMaterial({ color: 0xd22a22 }), hyd, (a, i, im) => { p.set(a[0], 0.16, a[1]); q.identity(); m4.compose(p, q, s); im.setMatrixAt(i, m4); });
    const tg = new T.CylinderGeometry(0.32, 0.28, 0.95, 10); tg.translate(0, 0.64, 0);
    mk(tg, new T.MeshLambertMaterial({ color: 0x2f4a3a }), bins, (a, i, im) => { p.set(a[0], 0.16, a[1]); q.identity(); m4.compose(p, q, s); im.setMatrixAt(i, m4); });
    const bgm = new T.BoxGeometry(1.8, 0.1, 0.5); bgm.translate(0, 0.5, 0); const bb = new T.BoxGeometry(1.8, 0.45, 0.08); bb.translate(0, 0.78, -0.24); const bgg = new T.BufferGeometry(); // bench = seat + back merged
    const merged = mergeParts([{ geo: bgm, color: [0.45, 0.3, 0.17] }, { geo: bb, color: [0.45, 0.3, 0.17] }]);
    mk(merged, new T.MeshLambertMaterial({ vertexColors: true }), benches, (a, i, im) => { p.set(a[0], 0.16, a[1]); q.setFromEuler(e.set(0, a[2] === 0 ? Math.PI : a[2] === 2 ? 0 : a[2] === 3 ? Math.PI / 2 : -Math.PI / 2, 0)); m4.compose(p, q, s); im.setMatrixAt(i, m4); });
    this.nodeStates = new Map(); this.updateSignals(true);
  },
  setLamps(n, axis, st) {
    const off = { red: [3, 0.18, 0.18], yellow: [3, 2.2, 0.2], green: [0.2, 3, 0.45] }, dim = { red: [0.22, 0.03, 0.03], yellow: [0.2, 0.15, 0.02], green: [0.02, 0.2, 0.05] }, col = new T.Color();
    for (let c = 0; c < 4; c++) for (let k = 0; k < 3; k++) { const idx = n.lampBase + c * 6 + axis * 3 + k, name = ['red', 'yellow', 'green'][k], lit = name === st; const v = (lit ? off : dim)[name]; this.lamps.setColorAt(idx, col.setRGB(v[0], v[1], v[2])); }
  },
  updateSignals(force) {
    if (!this.lamps) return; let ch = false;
    for (const n of this.nodes) { const ns = Signals.state(n, 'ns'), ew = Signals.state(n, 'ew'); if (force || ns !== n.sigNS) { n.sigNS = ns; this.setLamps(n, 0, ns); ch = true; } if (force || ew !== n.sigEW) { n.sigEW = ew; this.setLamps(n, 1, ew); ch = true; } }
    if (ch) this.lamps.instanceColor.needsUpdate = true;
  },
  update(dt) { this.lastT += dt; if (this.lastT > 0.5) { this.lastT = 0; this.updateSignals(false); } },
};
