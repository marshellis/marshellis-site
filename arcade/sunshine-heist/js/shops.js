'use strict';
// ===== Shops: gas stations, pawn shops, banks, hospital, police HQ, safehouse + robbery & pawn trading =====
function signMesh(text, w, h, bg, fg, sub) {
  const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w); const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height); g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(6, 6, c.width - 12, c.height - 12);
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; let fs = c.height * (sub ? 0.5 : 0.62); g.font = `900 ${fs}px "Trebuchet MS",Arial,sans-serif`; while (g.measureText(text).width > c.width - 40 && fs > 10) { fs -= 2; g.font = `900 ${fs}px "Trebuchet MS",Arial,sans-serif`; }
  g.fillText(text, c.width / 2, c.height * (sub ? 0.38 : 0.52)); if (sub) { g.font = `700 ${c.height * 0.2}px Arial`; g.fillText(sub, c.width / 2, c.height * 0.78); }
  const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 8; return new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: t, fog: true }));
}
function mkStore(b, k) {
  const ch = chunkOf(b.cx, b.cz), cx = b.cx, cz = b.cz;
  const W = (lx, lz) => k === 0 ? [cx + lx, cz + lz] : k === 1 ? [cx + lz, cz - lx] : k === 2 ? [cx - lx, cz - lz] : [cx - lz, cz + lx];
  const S = {
    ch, W, k, b,
    rect(lx0, lz0, lx1, lz1) { const a = W(lx0, lz0), c = W(lx1, lz1); return [Math.min(a[0], c[0]), Math.min(a[1], c[1]), Math.max(a[0], c[0]), Math.max(a[1], c[1])]; },
    box(lx0, y0, lz0, lx1, y1, lz1, col, o = {}) { const r = this.rect(lx0, lz0, lx1, lz1), g = o.glow ? ch.glow : o.win ? ch.win : ch.plain; g.box(r[0], y0, r[1], r[2], y1, r[3], col, !!o.win, o.top); if (o.solid) return addSolid(r[0], r[1], r[2], r[3], o.h || y1, o.tag || 'shop'); },
    flat(lx0, lz0, lx1, lz1, y, col, glow) { const r = this.rect(lx0, lz0, lx1, lz1); (glow ? ch.glow : ch.plain).flat(r[0], r[1], r[2], r[3], y, col); },
    ceil(lx0, lz0, lx1, lz1, y, col, glow) { const r = this.rect(lx0, lz0, lx1, lz1); (glow ? ch.glow : ch.plain).ceil(r[0], r[1], r[2], r[3], y, col); },
    yaw(lx, lz) { const a = W(0, 0), c = W(lx, lz); return Math.atan2(c[0] - a[0], c[1] - a[1]); },
    sign(text, lx, y, lz, w, h, bg, fg, sub) { const m = signMesh(text, w, h, bg, fg, sub), p = W(lx, lz); m.position.set(p[0], y, p[1]); m.rotation.y = [0, Math.PI / 2, Math.PI, -Math.PI / 2][k]; World.scene.add(m); return m; },
    // walled rectangle with door gap on the +z (front) wall
    shell(x0, z0, x1, z1, h, wallCol, glassCol, door = 1.8, doorH = 3.2, thick = 0.6) {
      this.box(x0, 0, z0, x1, h, z0 + thick, wallCol, { solid: true, win: false }); this.box(x0, 0, z0, x0 + thick, h, z1, wallCol, { solid: true }); this.box(x1 - thick, 0, z0, x1, h, z1, wallCol, { solid: true });
      this.box(x0, 0, z1 - thick, -door, h, z1, glassCol, { solid: true }); this.box(door, 0, z1 - thick, x1, h, z1, glassCol, { solid: true }); this.box(-door, doorH, z1 - thick, door, h, z1, wallCol);
      this.box(x0 - .3, h, z0 - .3, x1 + .3, h + .5, z1 + .3, 0xe6e2d8); this.ceil(x0, z0, x1, z1, h, 0xf0ece0); this.flat(x0 + thick, z0 + thick, x1 - thick, z1 - thick, 0.21, 0xdedacd);
      this.ceil(x0 + 2, z0 + 2, x1 - 2, z1 - 2, h - 0.03, 0xfff4d0, true);
    },
  };
  return S;
}
const _clerks = { gas: ['SUNNY MART', 'GATOR GAS & GO', 'PALM STOP', 'SUNSHINE FUEL', 'KEY LIME MART', 'FLAMINGO FUEL', 'CORAL QUICKSTOP', 'TURNPIKE GAS', 'BAYSIDE MART', 'THEME-PARK FUEL', 'BUCCANEER GAS', 'SUNRAY MART', 'CIGAR CITY GAS', 'I-4 EXPRESS', 'MOUSE-FREE MART', 'GATOR BAIT & GAS'], pawn: ['GOLD COAST PAWN', 'CASH-4-GOLD & GUNS', 'SWAMP TRADERS', 'LUCKY 7 PAWN', 'BISCAYNE PAWN & ARMS', 'DIXIE PAWN', 'YBOR CITY PAWN', 'BAYSHORE LOAN & GUN', 'I-DRIVE PAWN', 'KISSIMMEE CASH'], bank: ['FIRST FLORIDA BANK', 'SUNCOAST TRUST', 'PELICAN NATIONAL BANK', 'TAMPA BAY SAVINGS', 'ORLANDO FIRST UNION'] };

const Shops = {
  list: [], safe: null, hospital: null, police: null, hospitals: [], polices: [], bankNames: 0,
  build() {
    const S = World.special; let gi = 0, pi = 0, bi = 0;
    S.gas.forEach(b => this.gas(b, _clerks.gas[gi++ % _clerks.gas.length])); S.pawn.forEach(b => this.pawn(b, _clerks.pawn[pi++ % _clerks.pawn.length])); S.bank.forEach(b => this.bank(b, _clerks.bank[bi++ % _clerks.bank.length]));
    S.hospital.forEach(b => this.civic(b, 'hospital')); S.police.forEach((b, i) => this.civic(b, 'police', i)); S.safe.forEach(b => this.condo(b));
    if (!this.hospital) this.hospital = { x: 0, z: 0 }; if (!this.police) this.police = this.hospital; if (!this.safe) this.safe = this.hospital;
  },
  frontK(b) { // door faces the road nearest the world's busier side: pick random but deterministic
    return Math.floor(hashN(b.i * 11, b.j * 17) * 4);
  },
  asphalt(b, col = 0x4a4d52) { b.slabAsphalt = true; chunkOf(b.cx, b.cz).plain.flat(b.x0 + 3, b.z0 + 3, b.x1 - 3, b.z1 - 3, 0.18, col); },
  register(shop) { this.list.push(shop); return shop; },
  gas(b, name) {
    const k = this.frontK(b), S = mkStore(b, k); this.asphalt(b);
    S.shell(-9, -28, 9, -17, 4.2, pick(STUCCO), 0x9fd8ee, 1.8);
    S.box(-9, 3.4, -17.1, 9, 4.2, -16.6, 0xe8452c, {}); S.box(-9, 3.3, -16.9, 9, 3.4, -16.5, 0xffffff, { glow: true });
    S.sign(name, 0, 3.8, -16.55, 11, 1.1, '#e8452c', '#ffffff');
    S.box(-7, 0.2, -24.6, -1.4, 1.15, -23.6, 0x6b4a2b, { solid: true }); S.box(-4.2, 1.15, -24.4, -3.2, 1.55, -23.9, 0x222222, { glow: false });
    S.box(2, 0.2, -25.5, 7.5, 1.9, -24.5, 0xc0392b, { solid: true }); S.box(2, 0.2, -22, 7.5, 1.9, -21, 0x2471a3, { solid: true }); S.box(2, 0.2, -19.5, 7.5, 1.9, -18.5, 0xd68910, { solid: true });
    S.box(-8.3, 0.4, -27.4, 8.3, 2.6, -27.2, 0x9fe8ff, { glow: true }); S.box(-8.6, 0.2, -23, -8.2, 1.5, -18, 0x2ecc71, {});
    // canopy + pumps
    S.box(-15, 5.2, 0, 15, 5.8, 15, 0xf2f2f2, { top: 0xf2f2f2 }); S.ceil(-15, 0, 15, 15, 5.2, 0xfff0c0, true); S.box(-15, 5.0, 14.9, 15, 6.0, 15.1, 0xe8452c, {});
    for (const [x, z] of [[-13, 2], [13, 2], [-13, 13], [13, 13]]) S.box(x - .4, 0.2, z - .4, x + .4, 5.2, z + .4, 0xdddddd, { solid: true });
    for (const x of [-8, -2.5, 3, 8.5]) { S.box(x - .5, 0.2, 7, x + .5, 1.7, 8.4, 0xf4f4f4, { solid: true }); S.box(x - .35, 1.0, 6.95, x + .35, 1.5, 7, 0x1d6bd8, { glow: true }); S.box(x - .5, 1.7, 7, x + .5, 1.85, 8.4, 0xe8452c); }
    S.sign('REGULAR $3.89  PREMIUM $4.39', 0, 4.7, 15.2, 12, 1, '#111', '#ffd23f');
    // price pole
    S.box(19, 0, 22, 19.6, 9, 22.6, 0x555555, { solid: true }); S.sign('GAS', 19.3, 9.8, 23.1, 4.4, 3, '#e8452c', '#ffffff', '$3.89');
    const c1 = S.W(-4.2, -25.7), reg = S.W(-4.2, -24.1), door = S.W(0, -14), counterPlayer = S.W(-4.2, -21.5);
    const shop = this.register({ id: 'gas' + this.list.length, type: 'gas', name, x: b.cx, z: b.cz, k, door: { x: door[0], z: door[1] }, reg: { x: reg[0], z: reg[1] }, clerks: [], cash: ri(450, 1400), cooldown: 0, prog: 0, alarmT: 0, open: () => true, dur: 5.5, radius: 24 });
    shop.rect = S.rect(-9, -28, 9, -17); shop.cover = S.rect(-15, 0, 15, 15);
    const clerk = NPCs.createFixed({ label: 'Clerk at ' + name, look: 'apron', x: c1[0], z: c1[1], yaw: S.yaw(0, 1), shop, armed: chance(0.35), hp: 70 }); shop.clerks.push(clerk);
    if (chance(0.4)) { const c2 = S.W(5, -16), gd = NPCs.createFixed({ label: 'Customer at ' + name, look: 'casual', x: c2[0], z: c2[1], yaw: S.yaw(1, 0), shop, hp: 80 }); shop.clerks.push(gd); gd.role = 'customer'; }
    for (const [x, z] of [[-6, 20], [6, 22]]) if (chance(0.6)) World.parkedSpots.push({ x: S.W(x, z)[0], z: S.W(x, z)[1], h: S.yaw(0, 1) + Math.PI, lot: true });
    for (const x of [-8, -2.5, 3, 8.5]) if (chance(0.5)) World.parkedSpots.push({ x: S.W(x, 10.5)[0], z: S.W(x, 10.5)[1], h: S.yaw(1, 0), lot: true });
    for (const side of [0, 1, 2, 3]) addAnchor('shop', b, side, .5);
    shop.loot = [];
  },
  pawn(b, name) {
    const k = this.frontK(b), S = mkStore(b, k); this.asphalt(b, 0x55585c);
    S.shell(-12, -28, 12, -14, 4.6, 0x7a6a55, 0xf0c050, 1.8); S.box(-12, 3.6, -14.1, 12, 4.6, -13.6, 0x2a2a30, {});
    S.sign(name, 0, 4.1, -13.55, 14, 1.0, '#222', '#ffd23f'); S.sign('GUNS • GOLD • CARS • CASH', 0, 2.95 + 0.0, -13.52, 7, 0.55, '#8a1c1c', '#ffffff');
    S.box(-10, 0.2, -20.8, 1.5, 1.15, -19.7, 0x3a2a1c, { solid: true }); S.box(-10, 1.15, -20.8, 1.5, 1.6, -19.7, 0x7ec8e3, { glow: false });
    S.box(-11.4, 0.2, -27, -10.3, 1.2, -17, 0x7ec8e3, { solid: true }); for (let z = -26; z < -17; z += 1.6) S.box(-11.2, 1.2, z, -10.5, 1.4, z + .8, 0xffd23f, { glow: true });
    for (let i = 0; i < 6; i++) { S.box(-9 + i * 3.5, 2.0, -27.45, -7.6 + i * 3.5, 2.5, -27.2, 0x15151a, {}); S.box(-9 + i * 3.5, 1.9, -27.3, -7.6 + i * 3.5, 1.95, -27.1, 0xff3030, { glow: true }); }
    for (let i = 0; i < 3; i++) { S.box(5 + i * 2.3, 0.2, -26, 6.9 + i * 2.3, 1.6, -24.4, 0x111111, { solid: true }); S.box(5.2 + i * 2.3, 0.5, -24.4, 6.7 + i * 2.3, 1.5, -24.3, 0x4aa8ff, { glow: true }); }
    S.box(5, 0.2, -20, 11.5, 1.3, -18.5, 0x8a5a2b, { solid: true });
    // yard & sell zone marker
    const z0 = 4, z1 = 24; for (const [a, c] of [[-20, 20]]) { S.flat(a, z0, c, z0 + .4, 0.22, 0xffd23f, true); S.flat(a, z1 - .4, c, z1, 0.22, 0xffd23f, true); S.flat(a, z0, a + .4, z1, 0.22, 0xffd23f, true); S.flat(c - .4, z0, c, z1, 0.22, 0xffd23f, true); }
    S.sign('SELL YOUR RIDE', 0, 3.2, 3.8, 8, 0.9, '#111', '#ffd23f'); S.box(-.15, 0, 3.7, .15, 3.2, 3.9, 0x555555, {});
    const door = S.W(0, -11), cp = S.W(-4, -18), sell = S.W(0, 14), deliver = S.W(14, 15), cars = shuffle(BUYABLE.slice()).slice(0, 4);
    const shop = this.register({ id: 'pawn' + this.list.length, type: 'pawn', name, x: b.cx, z: b.cz, k, door: { x: door[0], z: door[1] }, counter: { x: cp[0], z: cp[1] }, reg: { x: cp[0], z: cp[1] - 1 }, sell: { x: sell[0], z: sell[1], hw: 20, hd: 10, k }, deliver: { x: deliver[0], z: deliver[1], h: S.yaw(1, 0) + Math.PI / 2 }, clerks: [], cash: ri(900, 2400), cooldown: 0, prog: 0, alarmT: 0, open: () => true, dur: 7, stock: { cars, rifle: chance(0.6), rare: chance(0.5) }, radius: 24 });
    shop.rect = S.rect(-12, -28, 12, -14);
    const c1 = S.W(-5, -22), cl = NPCs.createFixed({ label: 'Pawn broker at ' + name, look: 'black', x: c1[0], z: c1[1], yaw: S.yaw(0, 1), shop, armed: true, hp: 90 }); shop.clerks.push(cl);
    for (const side of [0, 1, 2, 3]) addAnchor('shop', b, side, .5);
  },
  bank(b, name) {
    const k = this.frontK(b), S = mkStore(b, k); this.asphalt(b, 0x9a968c);
    S.shell(-16, -30, 16, -8, 7, 0xe9e1cf, 0xcfd9dd, 2.2, 4.2, 0.8);
    for (const x of [-13, -8, 8, 13]) S.box(x - .6, 0, -7.4, x + .6, 7.4, -6.8, 0xf4efe2, {}); S.box(-16.5, 7.4, -7.5, 16.5, 8.2, -6.6, 0xf4efe2, {}); S.box(-16, 8.2, -30, 16, 8.5, -8, 0xcfc7b4, {});
    S.sign(name, 0, 6.2, -7.1, 16, 1.6, '#12301f', '#e6c35c', 'MEMBER FDIC');
    S.box(-14, 0.2, -16.4, -1.5, 1.25, -15.5, 0xd8d0c0, { solid: true }); S.box(-14, 1.25, -16.1, -1.5, 2.6, -16, 0x9fd8ee, { glow: false });
    S.box(1.5, 0.2, -16.4, 3.8, 1.25, -15.5, 0xd8d0c0, { solid: true });
    // vault
    S.box(-14.6, 0, -29.4, -14, 5, -21, 0x9a9fa6, { solid: true }); S.box(-4, 0, -29.4, -3.4, 5, -21, 0x9a9fa6, { solid: true }); S.box(-14, 0, -21.6, -10.3, 5, -21, 0x9a9fa6, { solid: true }); S.box(-7.7, 0, -21.6, -4, 5, -21, 0x9a9fa6, { solid: true }); S.box(-10.3, 3.2, -21.6, -7.7, 5, -21, 0x9a9fa6, {});
    for (let i = 0; i < 6; i++) S.box(-13.2 + i * 1.6, 0.2, -29, -12.2 + i * 1.6, 1.2, -27.5, 0x2e9a4a, { glow: true });
    // office
    S.box(4.4, 0, -29.4, 5, 4.5, -20.4, 0xd8d0c0, { solid: true }); S.box(4.4, 0, -20.6, 8.8, 4.5, -20, 0xd8d0c0, { solid: true }); S.box(11.2, 0, -20.6, 16, 4.5, -20, 0xd8d0c0, { solid: true }); S.box(8.8, 3.4, -20.6, 11.2, 4.5, -20, 0xd8d0c0, {});
    S.box(8, 0.2, -27.6, 12.5, 1.1, -26.4, 0x5a3a22, { solid: true });
    const vd = S.W(-9, -21.3), door = S.W(0, -4), c1 = S.W(-10, -18.3), c2 = S.W(-5.5, -18.3), g1 = S.W(-12, -11), g2 = S.W(12, -11), mg = S.W(10, -24.5), reg = S.W(-8, -16);
    const shop = this.register({ id: 'bank' + this.list.length, type: 'bank', name, x: b.cx, z: b.cz, k, door: { x: door[0], z: door[1] }, reg: { x: reg[0], z: reg[1] }, vaultPos: { x: vd[0], z: vd[1] }, clerks: [], cash: ri(5000, 9000), cooldown: 0, prog: 0, alarmT: 0, dur: 9, radius: 30, open: () => G.tod > 480 && G.tod < 1080 });
    for (const c of [c1, c2]) { const t = NPCs.createFixed({ label: 'Teller at ' + name, look: 'suit', x: c[0], z: c[1], yaw: S.yaw(0, 1), shop, hp: 60, role: 'teller' }); t.role = 'teller'; shop.clerks.push(t); }
    for (const g of [g1, g2]) { const t = NPCs.createFixed({ label: 'Security guard at ' + name, look: 'guard', x: g[0], z: g[1], yaw: S.yaw(0, 1), shop, hp: 120, armed: true, role: 'guard' }); t.role = 'guard'; shop.clerks.push(t); }
    const m = NPCs.createFixed({ label: 'Branch manager at ' + name, look: 'suit', x: mg[0], z: mg[1], yaw: S.yaw(0, 1), shop, hp: 70, role: 'manager' }); m.role = 'manager'; shop.clerks.push(m); shop.manager = m;
    shop.rect = S.rect(-16, -30, 16, -8);
    const dr = S.rect(-10.3, -21.9, -7.7, -20.9); const dm = new T.Mesh(new T.BoxGeometry(dr[2] - dr[0], 3.2, dr[3] - dr[1]), new T.MeshLambertMaterial({ color: 0x6d7277 })); dm.position.set((dr[0] + dr[2]) / 2, 1.8, (dr[1] + dr[3]) / 2); dm.castShadow = true; World.scene.add(dm);
    shop.vault = { open: false, prog: 0, door: addSolid(dr[0], dr[1], dr[2], dr[3], 3.2, 'vault'), mesh: dm, bags: [S.W(-12.5, -27.5), S.W(-11.2, -28), S.W(-9.8, -27.6), S.W(-8.4, -28), S.W(-7, -27.6), S.W(-5.6, -27.8)] };
    for (const side of [0, 1, 2, 3]) addAnchor('office', b, side, .5);
    shop.onClerkDown = n => { if (n.role === 'manager') UI.msg('The manager is dead — nobody can open the vault now.', 2500); };
  },
  civic(b, kind, idx) {
    const k = this.frontK(b), S = mkStore(b, k); this.asphalt(b, kind === 'hospital' ? 0x6d7075 : 0x55585c);
    const front = S.W(0, 32);
    if (kind === 'hospital') {
      S.box(-18, 0, -28, 18, 24, -6, 0xf2f2f2, { win: true, solid: true, tag: 'hospital', top: 0xdddddd }); S.box(-6, 0, -6.2, 6, 4, -5, 0x9fd8ee, {}); S.box(-2, 12, -5.9, 2, 20, -5.6, 0xe53535, { glow: true }); S.box(-5, 15.5, -5.9, 5, 16.5, -5.6, 0xe53535, { glow: true });
      S.sign('MERCY GENERAL HOSPITAL', 0, 22, -5.55, 18, 1.8, '#fff', '#c0392b', 'EMERGENCY'); const hp = { x: front[0], z: front[1] }; this.hospitals.push(hp); if (!this.hospital) { this.hospital = hp; World.special.hospitalPos = hp; }
      for (const x of [-12, 12]) { S.box(x - 2, 0.2, 1, x + 2, 2.2, 3, 0xf2f2f2, {}); }
      addAnchor('office', b, 0, .5); addAnchor('office', b, 2, .5);
    } else {
      S.box(-16, 0, -28, 16, 12, -8, 0xcdd6e2, { win: true, solid: true, tag: 'police', top: 0xaab4c4 }); S.box(-16, 5, -7.9, 16, 6.2, -7.7, 0x1d3a8a, {}); S.sign('POLICE', 0, 9.5, -7.6, 12, 2.4, '#1d3a8a', '#ffffff', 'FLORIDA HIGHWAY PATROL');
      S.box(-3, 0, -8, 3, 3.5, -7.8, 0x7a8aa0, {}); for (let i = 0; i < 4; i++) { const p = S.W(-12 + i * 8, 6); World.parkedSpots.push({ x: p[0], z: p[1], h: S.yaw(1, 0), lot: true }); }
      const pp = { x: front[0], z: front[1] }; this.polices.push(pp); if (!this.police) this.police = pp;
      addAnchor('office', b, 0, .5); addAnchor('office', b, 2, .5);
    }
  },
  condo(b) {
    const k = this.frontK(b), S = mkStore(b, k); this.asphalt(b, 0x888377);
    S.box(-16, 0, -26, 16, 52, -8, 0xf6b6c8, { win: true, solid: true, tag: 'condo', top: 0xf0f0f0 }); S.box(-12, 52, -22, 12, 58, -12, 0xa7e3d6, { win: true });
    S.box(-16.4, 51.5, -26.4, 16.4, 52, -7.6, 0xff3fa4, { glow: true }); S.box(-16.2, 3.8, -8.4, 16.2, 4.2, -7.6, 0x27e1d0, { glow: true });
    S.sign('SUNSET TOWERS', 0, 46, -7.55, 22, 3, '#2a0f3a', '#ffd23f', 'YOUR SAFEHOUSE'); S.box(-5, 0, -8.2, 5, 4, -7.6, 0x9fd8ee, {});
    const p = S.W(0, -3), front = S.W(0, 12); this.safe = { x: front[0], z: front[1], px: p[0], pz: p[1] }; World.special.safePos = this.safe;
    for (const x of [-10, -5, 5, 10]) { const q = S.W(x, -1.5); palm(q[0], q[1], 1.1); }
    addAnchor('home', b, 0, .3); addAnchor('home', b, 2, .6);
  },
  // ----- gameplay
  nearShop() { let best = null, bd = 1e9; for (const s of this.list) { const d = dist(s.x, s.z, P.x, P.z); if (d < s.radius + 20 && d < bd) { bd = d; best = s; } } return best; },
  prompt() {
    if (P.dead) return null; const s = this.nearShop();
    // safehouse
    if (this.safe && dist(P.x, P.z, this.safe.px, this.safe.pz) < 7 && !P.inCar) return { text: '<kbd>E</kbd> Save game & sleep until morning', act: () => this.sleep() };
    if (!s) return null;
    if (s.type === 'bank' && s.vault && !s.vault.open && P.hostage && P.hostage === s.manager && dist(P.x, P.z, s.vaultPos.x, s.vaultPos.z) < 5) return { text: `Hold <kbd>E</kbd> — force the manager to open the vault ${Math.round(s.vault.prog * 100)}%`, act: null };
    if (s.threat && s.cash > 0 && s.cooldown <= 0) return { text: `Hold <kbd>E</kbd> — rob the register ${Math.round(s.prog * 100)}%`, act: null };
    if (s.type === 'pawn' && !P.inCar) { if (dist(P.x, P.z, s.counter.x, s.counter.z) < 4.5 && !P.aimingGun) return { text: '<kbd>E</kbd> Browse pawn shop (guns, cars, sell loot)', act: () => Pawn.open(s) }; }
    if (s.type === 'pawn' && P.inCar && this.inSellZone(s, P.car)) { const v = Pawn.carValue(P.car); return { text: G.wanted > 0 ? 'Pawn broker won\'t deal while you\'re wanted' : `<kbd>E</kbd> Sell this ${CAR_TYPES[P.car.type].name} for ${money(v)}`, act: () => { if (G.wanted === 0) Pawn.sellCar(s, P.car); } }; }
    return null;
  },
  inSellZone(s, c) { const dx = c.x - s.sell.x, dz = c.z - s.sell.z; const horiz = (s.k % 2 === 0); return Math.abs(horiz ? dx : dz) < s.sell.hw && Math.abs(horiz ? dz : dx) < s.sell.hd; },
  sleep() {
    G.tod = 6 * 60 + 30; G.day++; P.hp = 100; if (G.wanted === 0) { SaveSys.save(); UI.msg('Slept until morning. Game saved.', 2200); } else UI.msg('Not now — the cops are looking for you!');
    if (G.wanted > 0) G.tod = (G.tod + 0) % 1440;
  },
  update(dt) {
    G.progress = null;
    for (const s of this.list) {
      if (s.cooldown > 0) s.cooldown -= dt; const d = dist(s.x, s.z, P.x, P.z); if (d > 60) { s.threat = null; if (s.prog > 0) s.prog = Math.max(0, s.prog - dt); continue; }
      // who is threatened?
      s.threat = null; let anyThreat = false;
      for (const c of s.clerks) {
        if (!c.alive || !c.active || c.state !== 'handsup') continue; anyThreat = true;
        if (c.role !== 'guard' && c.role !== 'manager' && c.role !== 'customer' && dist(c.x, c.z, P.x, P.z) < 12 && P.aimingGun) s.threat = c;
      }
      if (s.type === 'bank' && P.aimingGun && d < 24) { for (const c of s.clerks) if (c.alive && c.active && P.canSee(c) && dist(c.x, c.z, P.x, P.z) < 18) anyThreat = true; }
      // alarms
      if (anyThreat && !s.alarmed && s.cooldown <= 0) { s.alarmT += dt; const lim = s.type === 'bank' ? 1.2 : (s.silent === undefined ? (s.silent = chance(0.55) ? 7 : 1e9) : s.silent); if (s.alarmT > lim) { s.alarmed = true; Crime.force(s.type === 'bank' ? 3 : 2, s.type === 'bank' ? 'Bank robbery in progress' : 'Armed robbery'); if (s.type === 'bank') { Snd.alarm(); for (const c of s.clerks) if (c.role === 'guard' && c.alive) { c.state = 'fight'; c.fightT = 60; c.gun = { len: 0.3 }; } UI.msg('ALARM! Guards are shooting!', 2500); } } }
      else if (!anyThreat) s.alarmT = Math.max(0, s.alarmT - dt);
      // robbing
      if (s.threat && s.cash > 0 && s.cooldown <= 0 && Input.held('KeyE')) {
        s.robbing = s.threat; s.prog += dt / s.dur; G.progress = { label: 'ROBBING ' + s.name, frac: s.prog };
        if (!s.threat.bubble) NPCs.say(s.threat, pick(['Okay, okay, filling the bag!', 'Just don\'t shoot!', 'Taking it out now...']), 2);
        if (s.type === 'gas' && s.prog > 0.45 && !s.drew && s.threat.armed && chance(dt * 0.35)) { s.drew = true; s.threat.state = 'fight'; s.threat.fightT = 30; s.threat.gun = { len: 0.8 }; NPCs.say(s.threat, 'NOT TODAY!', 2); s.robbing = null; }
        if (s.prog >= 1) { this.payout(s); }
      } else { s.robbing = null; s.prog = Math.max(0, s.prog - dt * 0.6); }
      // vault
      if (s.vault && !s.vault.open && P.hostage && P.hostage === s.manager && dist(P.x, P.z, s.vaultPos.x, s.vaultPos.z) < 5 && Input.held('KeyE')) {
        s.vault.prog += dt / 5; G.progress = { label: 'OPENING VAULT', frac: s.vault.prog }; if (s.vault.prog >= 1) { s.vault.open = true; s.vault.door.off = true; s.vault.mesh.visible = false; for (const p of s.vault.bags) Pickups.add(p[0], p[1], 'bag', ri(4500, 9500), 'Cash bag'); Snd.alarm(); Crime.force(4, 'Vault breach'); UI.msg('Vault open! Grab the cash bags and run!', 3500); }
      }
    }
  },
  payout(s) {
    s.prog = 0; const amount = s.cash; G.robLog.push({ type: s.type, cash: amount, name: s.name }); s.cash = 0; s.cooldown = 600; G.stats.robberies++; P.addCash(amount); UI.msg(`Robbed ${s.name}: ${money(amount)}`, 3000);
    UI.news(`${s.name} was robbed of ${money(amount)} at gunpoint.`, 'crime'); Crime.force(s.type === 'bank' ? 3 : 2, 'Armed robbery'); s.alarmed = true;
    if (s.type === 'pawn') { const it = pick(LOOT_ITEMS); G.inv.push({ n: it.n, v: it.v }); UI.msg('Also grabbed: ' + it.n); }
    for (const c of s.clerks) if (c.alive && c.state === 'handsup') { c.handsT = -3; }
    if (s.type === 'pawn' && chance(0.6)) { P.giveWeapon('pistol', 1); UI.msg('Grabbed a pistol & ammo from under the counter'); }
  },
};
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// ---- pawn shop trading
const Pawn = {
  tab: 'guns', shop: null, checkSellPrompt: null,
  carValue(c) { const t = CAR_TYPES[c.type]; return Math.round(t.sell * (0.35 + 0.65 * clamp(c.hp / c.maxHp, 0, 1)) * (c.owned ? 1 : 0.8) / 10) * 10; },
  open(s) { this.shop = s; G.modal = true; Input.unlock(); this.tab = 'guns'; UI.showPawn(true); this.render(); Snd.buy(); },
  close() { G.modal = false; UI.showPawn(false); this.shop = null; if (G.state === 'play') Input.lock(); },
  sellCar(s, c) { const v = this.carValue(c); G.stats.carsSold = (G.stats.carsSold || 0) + 1; P.ejectFromCar(true); c.owned = false; c.wreckGone = true; c.keep = false; P.addCash(v); UI.msg(`Sold ${CAR_TYPES[c.type].name} for ${money(v)}`, 2500); Snd.cash(); if (c.stolen) UI.news('A stolen ' + CAR_TYPES[c.type].name + ' was fenced at ' + s.name + '.', 'crime'); },
  buy(fn, price) { if (G.cash < price) { UI.msg('Not enough cash', 1200); Snd.tone(150, 0.2, 0.2, 'square'); return; } G.cash -= price; fn(); Snd.buy(); this.render(); },
  render() {
    const s = this.shop; if (!s) return; const el = document.getElementById('shoplist'), tabs = document.getElementById('shoptabs'); document.getElementById('shopname').textContent = s.name; document.getElementById('shopcash').innerHTML = `Your cash: <b style="color:#7dff8a">${money(G.cash)}</b> &nbsp;·&nbsp; Loot items: ${G.inv.length}`;
    tabs.innerHTML = ['guns', 'gear', 'cars', 'sell'].map(t => `<button class="btn small ${this.tab === t ? 'on' : ''}" data-tab="${t}">${{ guns: 'Firearms', gear: 'Ammo & Gear', cars: 'Vehicles', sell: 'Sell' }[t]}</button>`).join('');
    tabs.querySelectorAll('button').forEach(b => b.onclick = () => { this.tab = b.dataset.tab; this.render(); });
    let rows = [];
    const row = (title, sub, price, label, fn, disabled) => rows.push({ title, sub, price, label, fn, disabled });
    const BUY = Object.keys(WEAPONS).filter(id => WEAPONS[id].price), gunOK = (id, s) => !(WEAPONS[id].rare && !s.stock.rare) && !(id === 'rifle' && !s.stock.rifle);
    if (this.tab === 'guns') for (const id of BUY) { if (!gunOK(id, s)) continue; const w = WEAPONS[id], info = w.melee ? `${w.dmg} dmg · melee` : w.throwable ? 'Thrown explosive' : w.rocket ? 'Explosive rocket launcher' : `${w.dmg}${w.pellets ? 'x' + w.pellets : ''} dmg · ${w.mag} rounds/mag${w.auto ? ' · full auto' : ''}${w.scope ? ' · scoped' : ''}`; const owned = !!P.weapons[id] && !w.throwable; row(w.name, info, w.price, owned ? 'Owned' : 'Buy', () => this.buy(() => { P.giveWeapon(id, w.throwable ? 2 : 2); P.select(id); UI.msg('Bought ' + w.name); }, w.price), owned); }
    if (this.tab === 'gear') { for (const id of BUY) { if (!P.weapons[id] || WEAPONS[id].melee) continue; const w = WEAPONS[id], a = P.ammo[id] || { mag: 0, res: 0 }; row(w.name + (w.throwable ? 's' : ' ammo'), `+${w.pack} ${w.throwable ? '' : 'rounds '}(have ${a.mag + a.res})`, w.ammoPrice, 'Buy', () => this.buy(() => { if (w.throwable) a.mag += w.pack; else P.ammo[id].res += w.pack; }, w.ammoPrice)); } row('Body Armor', 'Absorbs 60% of damage', 350, 'Buy', () => this.buy(() => { P.armor = 100; }, 350), P.armor >= 100); row('First Aid Kit', 'Restore full health', 140, 'Buy', () => this.buy(() => { P.hp = 100; }, 140), P.hp >= 100); }
    if (this.tab === 'cars') for (const id of s.stock.cars) { const t = CAR_TYPES[id]; row(t.name, `Top speed ${Math.round(t.maxSpeed * 2.237)} mph · delivered to the lot`, t.price, 'Buy', () => this.buy(() => { const c = Vehicles.create(id, s.deliver.x, s.deliver.z, s.deliver.h, { mode: 'abandoned', owned: true }); c.keep = true; c.sleep = true; UI.msg(t.name + ' is waiting in the lot — it\'s yours!', 3000); }, t.price)); }
    if (this.tab === 'sell') {
      const sellable = G.inv.filter(i => !i.story), total = sellable.reduce((a, i) => a + Math.round(i.v * 0.55), 0); if (sellable.length) row('Sell ALL loot', `${sellable.length} items`, total, 'Sell all', () => { P.addCash(total); G.inv = G.inv.filter(i => i.story); Snd.cash(); this.render(); });
      G.inv.forEach((it, idx) => it.story ? 0 : row(it.n, 'Pawn value 55%', Math.round(it.v * 0.55), 'Sell', () => { P.addCash(Math.round(it.v * 0.55)); G.inv.splice(idx, 1); Snd.cash(); this.render(); }));
      for (const id of BUY) if (P.weapons[id] && id !== 'fists') { const w = WEAPONS[id], v = Math.round(w.price * 0.35); row('Sell ' + w.name, 'Pawn value 35%', v, 'Sell', () => { P.addCash(v); delete P.weapons[id]; delete P.ammo[id]; if (P.cur === id) { P.cur = 'x'; P.select('fists'); } this.render(); }); }
      if (!rows.length) rows.push({ title: 'Nothing to sell', sub: 'Rob people and shops, grab loot, then come back. To sell a car, drive it into the yard out front.', price: 0, label: '', fn: null });
    }
    el.innerHTML = ''; rows.forEach(r => { const d = document.createElement('div'); d.className = 'row'; d.innerHTML = `<div><b>${r.title}</b><span>${r.sub}</span></div><div>${r.price ? `<span class="price" style="display:inline">${money(r.price)}</span>` : ''}${r.label ? `<button class="btn small" ${r.disabled ? 'disabled' : ''}>${r.label}</button>` : ''}</div>`; const b = d.querySelector('button'); if (b && r.fn) b.onclick = r.fn; el.appendChild(d); });
  },
};
