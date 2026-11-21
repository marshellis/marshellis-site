'use strict';
// ===== Detailed weapon models (multi-part, animated slide/bolt/pump/magazine) + muzzle flashes, casings, bullet decals =====
GB.prototype.cylZ = function (cx, cy, z0, z1, r0, r1, col, seg = 10, caps = true) {
  const k = rgb(col);
  for (let s = 0; s < seg; s++) {
    const a0 = s / seg * TAU, a1 = (s + 1) / seg * TAU, c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1), am = (a0 + a1) / 2;
    quadN(this, [[cx + c0 * r0, cy + s0 * r0, z0], [cx + c1 * r0, cy + s1 * r0, z0], [cx + c1 * r1, cy + s1 * r1, z1], [cx + c0 * r1, cy + s0 * r1, z1]], [Math.cos(am), Math.sin(am), (r0 - r1) / Math.max(0.01, Math.abs(z1 - z0))], k);
    if (caps) { if (r1 > 0.001) quadN(this, [[cx, cy, z1], [cx + c0 * r1, cy + s0 * r1, z1], [cx + c1 * r1, cy + s1 * r1, z1], [cx, cy, z1]], [0, 0, 1], k); if (r0 > 0.001) quadN(this, [[cx, cy, z0], [cx + c0 * r0, cy + s0 * r0, z0], [cx + c1 * r0, cy + s1 * r0, z0], [cx, cy, z0]], [0, 0, -1], k); }
  }
};
const GUNMAT = new T.MeshPhongMaterial({ vertexColors: true, shininess: 60, specular: 0x3a3a3a, reflectivity: 0.07, combine: T.MixOperation });
const GM = { dark: 0x17191c, metal: 0x2b2f34, steel: 0x7d848c, poly: 0x1d1f23, wood: 0x6b4426, woodD: 0x4a2f1a, brass: 0xc9a34a, olive: 0x4a5a3a, tan: 0x8a7a5a, glass: 0x6aa8ff, red: 0xb03a2a };

function gunBuild(def) { // def(b, m, bx, cz) builds into GBs b (body), m (mover), g (mag)
  const b = new GB(), m = new GB(), g = new GB();
  const mk = gb => ({ bx: (cx, cy, cz, w, h, d, col) => gb.box(cx - w / 2, cy - h / 2, cz - d / 2, cx + w / 2, cy + h / 2, cz + d / 2, col), cz: (...a) => gb.cylZ(...a) });
  const r = def(mk(b), mk(m), mk(g));
  const geo = gb => gb.p.length ? gb.build(GUNMAT, true).geometry : null;
  return Object.assign({ body: geo(b), mover: geo(m), mag: geo(g) }, r);
}

const GUN_DEFS = {
  pistol: () => gunBuild((B, M, G) => {
    const oy = 0.055, oz = 0.045; const bx = (x, y, z, w, h, d, c) => B.bx(x, y + oy, z + oz, w, h, d, c);
    bx(0, 0, 0, .03, .03, .17, GM.poly); bx(0, -.055, -.045, .032, .1, .04, GM.poly); bx(.0165, -.055, -.045, .002, .09, .036, GM.dark); bx(-.0165, -.055, -.045, .002, .09, .036, GM.dark);
    bx(0, -.03, .045, .026, .008, .07, GM.poly); bx(0, -.043, .078, .026, .03, .008, GM.poly); bx(0, -.02, .035, .008, .025, .006, GM.steel);
    B.cz(0, .035 + oy, .1 + oz, .155 + oz, .008, .008, GM.steel, 8); bx(0, .056, .105, .006, .01, .008, GM.steel); bx(0, .056, -.065, .02, .01, .008, GM.dark);
    M.bx(0, .03 + oy, .015 + oz, .03, .034, .19, GM.metal); M.bx(0, .044 + oy, .015 + oz, .012, .006, .17, GM.steel); M.bx(.0155, .032 + oy, -.0 + oz, .002, .02, .04, GM.dark);
    G.bx(0, -.085 + oy, -.045 + oz, .026, .075, .035, GM.dark); G.bx(0, -.125 + oy, -.045 + oz, .03, .008, .04, GM.steel);
    return { muz: [0, .035 + oy, .16 + oz], eject: [.016, .04 + oy, -.02 + oz], mt: 0.032, mdir: -1, magOff: [0, -.085 + oy, -.045 + oz] };
  }),
  revolver: () => gunBuild((B, M, G) => {
    const oy = 0.05, oz = 0.05; const bx = (x, y, z, w, h, d, c) => B.bx(x, y + oy, z + oz, w, h, d, c);
    bx(0, 0, 0, .032, .05, .1, GM.steel); B.cz(0, .014 + oy, -.015 + oz, .045 + oz, .027, .027, GM.steel, 10); B.cz(0, .03 + oy, .05 + oz, .2 + oz, .012, .012, GM.metal, 10); bx(0, .047, .13, .008, .008, .15, GM.steel);
    bx(0, -.05, -.055, .034, .095, .045, GM.wood); bx(0, .043, -.055, .008, .022, .016, GM.steel); bx(0, -.03, .035, .028, .008, .07, GM.steel); bx(0, -.02, .03, .007, .03, .006, GM.dark); bx(0, .055, .17, .006, .01, .008, GM.dark);
    return { muz: [0, .03 + oy, .205 + oz], eject: [0, .0 + oy, .0 + oz], mt: 0, mdir: -1, magOff: [0, 0, 0] };
  }),
  smg: () => gunBuild((B, M, G) => {
    const oy = 0.075, oz = 0.045; const bx = (x, y, z, w, h, d, c) => B.bx(x, y + oy, z + oz, w, h, d, c);
    bx(0, 0, .03, .042, .062, .24, GM.metal); bx(0, .036, .05, .03, .01, .18, GM.dark); B.cz(0, .015 + oy, .15 + oz, .3 + oz, .014, .014, GM.steel, 10); bx(0, .05, .27, .006, .02, .008, GM.dark);
    bx(0, -.065, -.045, .036, .1, .045, GM.poly); bx(0, -.045, .15, .03, .06, .03, GM.poly); B.bx(0, .02 + oy, -.2 + oz, .006, .006, .2, GM.steel); B.bx(0, .0 + oy, -.3 + oz, .03, .07, .01, GM.steel);
    M.bx(0, .033 + oy, .03 + oz, .022, .012, .07, GM.steel);
    G.bx(0, -.1 + oy, .01 + oz, .028, .14, .04, GM.dark); G.bx(0, -.17 + oy, .01 + oz, .032, .008, .044, GM.steel);
    return { muz: [0, .015 + oy, .305 + oz], eject: [.022, .02 + oy, .03 + oz], mt: 0.04, mdir: -1, magOff: [0, -.1 + oy, .01 + oz] };
  }),
  shotgun: () => gunBuild((B, M, G) => {
    const oy = 0.05, oz = 0.04; const bx = (x, y, z, w, h, d, c) => B.bx(x, y + oy, z + oz, w, h, d, c);
    bx(0, .015, 0, .042, .065, .2, GM.metal); B.cz(0, .04 + oy, .1 + oz, .62 + oz, .015, .015, GM.metal, 10); B.cz(0, .012 + oy, .1 + oz, .5 + oz, .013, .013, GM.steel, 10); bx(0, .058, .6, .005, .012, .006, GM.brass);
    bx(0, -.055, -.04, .034, .085, .04, GM.wood); bx(0, -.0, -.22, .044, .1, .32, GM.wood); bx(0, -.0, -.395, .046, .12, .02, GM.dark); bx(0, -.035, .03, .03, .008, .08, GM.metal);
    M.bx(0, .005 + oy, .3 + oz, .05, .045, .14, GM.woodD); for (let k = 0; k < 4; k++) M.bx(0, .005 + oy, .25 + oz + k * .03, .052, .047, .005, GM.dark);
    return { muz: [0, .04 + oy, .625 + oz], eject: [.022, .03 + oy, .02 + oz], mt: 0.11, mdir: -1, magOff: [0, 0, 0] };
  }),
  sawedoff: () => gunBuild((B, M, G) => {
    const oy = 0.05, oz = 0.05; const bx = (x, y, z, w, h, d, c) => B.bx(x, y + oy, z + oz, w, h, d, c);
    B.cz(-.016, .03 + oy, -.0 + oz, .3 + oz, .0145, .0145, GM.metal, 10); B.cz(.016, .03 + oy, -.0 + oz, .3 + oz, .0145, .0145, GM.metal, 10); bx(0, .02, -.02, .062, .06, .1, GM.steel); bx(0, .0, .12, .06, .012, .18, GM.dark);
    bx(0, -.05, -.07, .036, .1, .06, GM.wood); bx(0, -.075, -.1, .036, .06, .05, GM.wood); bx(0, .05, -.06, .01, .02, .02, GM.steel);
    return { muz: [0, .03 + oy, .31 + oz], eject: [0, .03 + oy, -.02 + oz], mt: 0, mdir: -1, magOff: [0, 0, 0] };
  }),
  rifle: () => gunBuild((B, M, G) => {
    const oy = 0.08, oz = 0.05; const bx = (x, y, z, w, h, d, c) => B.bx(x, y + oy, z + oz, w, h, d, c);
    bx(0, .03, .0, .042, .062, .28, GM.metal); bx(0, -.012, -.03, .04, .042, .2, GM.dark); bx(0, .028, .26, .052, .056, .24, GM.metal); for (let k = 0; k < 4; k++) bx(0, .058, .17 + k * .06, .02, .006, .04, GM.dark); bx(0, .065, .0, .02, .012, .24, GM.dark);
    B.cz(0, .027 + oy, .38 + oz, .52 + oz, .009, .009, GM.steel, 8); B.cz(0, .027 + oy, .52 + oz, .6 + oz, .015, .015, GM.dark, 8); bx(0, .075, .02, .03, .03, .1, GM.dark); bx(0, .09, .02, .026, .004, .08, GM.glass);
    bx(0, -.005, -.25, .042, .075, .2, GM.poly); B.cz(0, .02 + oy, -.2 + oz, -.1 + oz, .02, .02, GM.dark, 8); bx(0, -.075, -.075, .034, .1, .04, GM.poly);
    M.bx(0, .045 + oy, -.1 + oz, .018, .018, .045, GM.steel);
    G.bx(0, -.085 + oy, .02 + oz, .032, .12, .046, GM.dark); G.bx(0, -.15 + oy, .015 + oz, .036, .008, .05, GM.steel);
    return { muz: [0, .027 + oy, .6 + oz], eject: [.024, .04 + oy, .04 + oz], mt: 0.0, mdir: -1, magOff: [0, -.085 + oy, .02 + oz] };
  }),
  ak47: () => gunBuild((B, M, G) => {
    const oy = 0.08, oz = 0.05; const bx = (x, y, z, w, h, d, c) => B.bx(x, y + oy, z + oz, w, h, d, c);
    bx(0, .02, .0, .042, .07, .3, GM.metal); bx(0, .06, .0, .044, .012, .28, GM.dark); bx(0, .02, .27, .05, .05, .22, GM.wood); bx(0, .055, .27, .046, .03, .2, GM.woodD); B.cz(0, .068 + oy, .2 + oz, .46 + oz, .011, .011, GM.steel, 8);
    B.cz(0, .026 + oy, .38 + oz, .62 + oz, .009, .009, GM.steel, 8); bx(0, .06, .6, .006, .028, .01, GM.dark); B.cz(0, .026 + oy, .6 + oz, .66 + oz, .013, .013, GM.dark, 8);
    bx(0, .0, -.26, .042, .09, .3, GM.wood); bx(0, -.075, -.075, .034, .1, .04, GM.wood);
    M.bx(.024, .04 + oy, .03 + oz, .01, .014, .05, GM.steel);
    G.bx(0, -.06 + oy, .045 + oz, .03, .07, .05, GM.dark); G.bx(0, -.11 + oy, .065 + oz, .03, .07, .05, GM.dark); G.bx(0, -.165 + oy, .09 + oz, .03, .07, .05, GM.dark); G.bx(0, -.2 + oy, .105 + oz, .032, .008, .05, GM.steel);
    return { muz: [0, .026 + oy, .665 + oz], eject: [.024, .04 + oy, .03 + oz], mt: 0.0, mdir: -1, magOff: [0, -.06 + oy, .045 + oz] };
  }),
  sniper: () => gunBuild((B, M, G) => {
    const oy = 0.08, oz = 0.06; const bx = (x, y, z, w, h, d, c) => B.bx(x, y + oy, z + oz, w, h, d, c);
    bx(0, .02, .0, .044, .062, .26, GM.dark); B.cz(0, .026 + oy, .12 + oz, .8 + oz, .0125, .011, GM.steel, 10); B.cz(0, .026 + oy, .8 + oz, .9 + oz, .02, .02, GM.dark, 8);
    B.cz(0, .09 + oy, -.02 + oz, .28 + oz, .026, .026, GM.dark, 12); B.cz(0, .09 + oy, .28 + oz, .35 + oz, .036, .032, GM.dark, 12); B.cz(0, .09 + oy, .35 + oz, .352 + oz, .03, .03, GM.glass, 12); B.cz(0, .09 + oy, -.06 + oz, -.02 + oz, .02, .026, GM.dark, 10); bx(0, .06, .04, .02, .03, .02, GM.metal); bx(0, .06, .22, .02, .03, .02, GM.metal);
    bx(0, -.0, -.3, .046, .1, .42, GM.poly); bx(0, .045, -.37, .04, .03, .2, GM.poly); bx(0, -.075, -.07, .036, .1, .04, GM.poly); bx(0, -.035, .38, .004, .1, .004, GM.steel); bx(.0, -.07, .3, .06, .004, .004, GM.steel);
    M.bx(.052, .04 + oy, -.04 + oz, .06, .012, .014, GM.steel); M.bx(.085, .04 + oy, -.04 + oz, .014, .014, .014, GM.steel);
    G.bx(0, -.055 + oy, .04 + oz, .03, .07, .05, GM.dark);
    return { muz: [0, .026 + oy, .905 + oz], eject: [.026, .04 + oy, .0 + oz], mt: 0.0, mdir: -1, magOff: [0, -.055 + oy, .04 + oz], boltTravel: 0.06 };
  }),
  rpg: () => gunBuild((B, M, G) => {
    const oy = 0.06, oz = 0.1; const bx = (x, y, z, w, h, d, c) => B.bx(x, y + oy, z + oz, w, h, d, c);
    B.cz(0, .03 + oy, -.4 + oz, .45 + oz, .045, .045, GM.olive, 14); B.cz(0, .03 + oy, -.6 + oz, -.4 + oz, .08, .045, GM.olive, 14); B.cz(0, .03 + oy, .45 + oz, .55 + oz, .05, .05, GM.steel, 12);
    B.cz(0, .03 + oy, .55 + oz, .7 + oz, .07, .07, GM.olive, 14); B.cz(0, .03 + oy, .7 + oz, .86 + oz, .07, .0, GM.red, 14);
    bx(0, -.05, -.05, .036, .1, .04, GM.wood); bx(0, -.05, .22, .034, .09, .04, GM.wood); bx(.055, .08, .05, .02, .04, .1, GM.dark); bx(.055, .1, .05, .014, .006, .08, GM.glass);
    return { muz: [0, .03 + oy, .87 + oz], eject: [0, .03 + oy, -.6 + oz], mt: 0, mdir: -1, magOff: [0, 0, 0], rocket: true };
  }),
  grenade: () => gunBuild((B) => { B.bx(0, 0, 0, .02, .02, .02, GM.olive); B.bx(0, .0, 0, .0, .0, .0, GM.olive); return { muz: [0, 0, 0], eject: [0, 0, 0], mt: 0, mdir: 0, magOff: [0, 0, 0] }; }),
  molotov: () => gunBuild(() => ({ muz: [0, 0, 0], eject: [0, 0, 0], mt: 0, mdir: 0, magOff: [0, 0, 0] })),
  bat: () => gunBuild((B) => { B.cz(0, 0, -.13, -.0, .017, .017, 0x222222, 8); B.cz(0, 0, 0, .35, .017, .03, GM.wood, 10); B.cz(0, 0, .35, .72, .03, .038, GM.wood, 10); B.cz(0, 0, .72, .74, .038, .02, GM.wood, 10); B.cz(0, 0, -.135, -.12, .028, .028, GM.dark, 8); return { muz: [0, 0, .7], eject: [0, 0, 0], mt: 0, mdir: 0, magOff: [0, 0, 0] }; }),
  knife: () => gunBuild((B) => { B.bx(0, 0, -.045, .024, .034, .11, GM.dark); B.bx(0, 0, .018, .008, .05, .012, GM.steel); B.bx(0, .008, .1, .006, .032, .17, 0xd0d6dc); B.bx(0, .004, .19, .006, .02, .03, 0xd0d6dc); return { muz: [0, 0, .2], eject: [0, 0, 0], mt: 0, mdir: 0, magOff: [0, 0, 0] }; }),
  machete: () => gunBuild((B) => { B.bx(0, 0, -.06, .026, .034, .13, GM.dark); B.bx(0, 0, .01, .01, .05, .014, GM.steel); B.bx(0, .005, .32, .005, .07, .6, 0xc2c8ce); B.bx(0, .042, .32, .008, .012, .6, GM.dark); B.bx(0, 0, .64, .005, .06, .05, 0xc2c8ce); return { muz: [0, 0, .65], eject: [0, 0, 0], mt: 0, mdir: 0, magOff: [0, 0, 0] }; }),
};
// grenade and molotov are built with their own shapes (vertical cylinders)
GUN_DEFS.grenade = () => gunBuild((B) => { const gb = B; return { muz: [0, 0, 0], eject: [0, 0, 0], mt: 0, mdir: 0, magOff: [0, 0, 0] }; });

const Guns = {
  models: {}, pool: {}, used: {}, flashes: [], casings: null, decals: null, initDone: false, scale: 1.3, _sv: new T.Vector3(),
  init(scene) {
    this.scene = scene;
    for (const k of Object.keys(GUN_DEFS)) { if (k === 'grenade' || k === 'molotov') continue; this.models[k] = GUN_DEFS[k](); }
    // grenade & molotov: custom geometry in same convention (z forward)
    const gg = new GB(); gg.cyl(0, 0, 0.034, 0.034, -0.045, 0.045, GM.olive, 10); gg.cyl(0, 0, 0.012, 0.012, 0.045, 0.06, GM.steel, 8); gg.box(0.034, -0.03, -0.012, 0.042, 0.05, 0.012, GM.steel); gg.cyl(0.0, 0.0, 0.037, 0.037, -0.004, 0.004, GM.dark, 10);
    this.models.grenade = { body: gg.build(GUNMAT, true).geometry, mover: null, mag: null, muz: [0, 0, 0], eject: [0, 0, 0], mt: 0, magOff: [0, 0, 0] };
    const mg = new GB(); mg.cyl(0, 0, 0.032, 0.036, -0.07, 0.03, 0x4f8f4a, 10); mg.cyl(0, 0, 0.012, 0.018, 0.03, 0.09, 0x4f8f4a, 8); mg.cyl(0, 0, 0.014, 0.014, 0.09, 0.1, 0x8a5a2b, 6); mg.box(-0.01, 0.1, -0.01, 0.01, 0.13, 0.01, 0xff8a30);
    this.models.molotov = { body: mg.build(GUNMAT, true).geometry, mover: null, mag: null, muz: [0, 0.12, 0], eject: [0, 0, 0], mt: 0, magOff: [0, 0, 0] };
    // flashes
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,230,1)'); gr.addColorStop(0.25, 'rgba(255,210,120,.95)'); gr.addColorStop(1, 'rgba(255,120,30,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    g.strokeStyle = 'rgba(255,230,160,.9)'; g.lineWidth = 3; for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; g.beginPath(); g.moveTo(32, 32); g.lineTo(32 + Math.cos(a) * 31, 32 + Math.sin(a) * 31); g.stroke(); }
    const tex = new T.CanvasTexture(c); this.flashMat = new T.SpriteMaterial({ map: tex, blending: T.AdditiveBlending, transparent: true, depthWrite: false, color: 0xffffff });
    for (let i = 0; i < 12; i++) { const s = new T.Sprite(this.flashMat.clone()); s.visible = false; s.userData.t = 0; scene.add(s); this.flashes.push(s); }
    // casings (instanced)
    const cg = new T.CylinderGeometry(0.0055, 0.0055, 0.04, 6); cg.rotateZ(Math.PI / 2); this.casings = { n: 60, list: [], mesh: new T.InstancedMesh(cg, new T.MeshPhongMaterial({ color: 0xc9a34a, shininess: 90, specular: 0xffffff }), 60), i: 0 };
    this.casings.mesh.count = 0; this.casings.mesh.frustumCulled = false; this.casings.mesh.castShadow = false; scene.add(this.casings.mesh);
    // bullet-hole decals
    const dc = document.createElement('canvas'); dc.width = dc.height = 32; const dg = dc.getContext('2d'), dgr = dg.createRadialGradient(16, 16, 1, 16, 16, 15); dgr.addColorStop(0, 'rgba(0,0,0,.95)'); dgr.addColorStop(.35, 'rgba(10,10,10,.8)'); dgr.addColorStop(1, 'rgba(30,30,30,0)'); dg.fillStyle = dgr; dg.fillRect(0, 0, 32, 32);
    const dmat = new T.MeshBasicMaterial({ map: new T.CanvasTexture(dc), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -8, polygonOffsetUnits: -8 }), dgeo = new T.PlaneGeometry(0.12, 0.12);
    this.decals = { n: 90, i: 0, meshes: [] }; for (let i = 0; i < 90; i++) { const m = new T.Mesh(dgeo, dmat); m.visible = false; scene.add(m); this.decals.meshes.push(m); }
    this.initDone = true;
  },
  acquire(key) {
    const pool = this.pool[key] || (this.pool[key] = []); let u = this.used[key] || 0, g = pool[u];
    if (!g) { const mdl = this.models[key]; g = new T.Group(); g.matrixAutoUpdate = false; g.userData.body = new T.Mesh(mdl.body, GUNMAT); g.userData.body.castShadow = true; g.add(g.userData.body);
      if (mdl.mover) { g.userData.mover = new T.Mesh(mdl.mover, GUNMAT); g.userData.mover.castShadow = true; g.add(g.userData.mover); } if (mdl.mag) { g.userData.mag = new T.Mesh(mdl.mag, GUNMAT); g.userData.mag.castShadow = true; g.add(g.userData.mag); } this.scene.add(g); pool.push(g); }
    this.used[key] = u + 1; g.visible = true; return g;
  },
  begin() { for (const k in this.pool) this.used[k] = 0; },
  end() { for (const k in this.pool) { const pool = this.pool[k], u = this.used[k] || 0; for (let i = u; i < pool.length; i++) pool[i].visible = false; } },
  // place model `key` at matrix m. params: recoil(0..1), reload(0..1|null), empty(bool)
  place(h, key, m, recoil, reload, empty) {
    const mdl = this.models[key]; if (!mdl) return false; const g = this.acquire(key); const S = this.scale; g.matrix.copy(m).scale(this._sv.set(S, S, S)); g.matrixWorldNeedsUpdate = true;
    const mv = g.userData.mover, mg = g.userData.mag, rec = clamp(recoil, 0, 1);
    if (mv) { if (key === 'sniper') { const bolt = reload != null ? Math.sin(clamp(reload * 1.4, 0, 1) * Math.PI) : (rec > 0.15 ? Math.sin(clamp((1 - rec) * 3, 0, 1) * Math.PI) : 0); mv.position.set(0, 0, -(mdl.boltTravel || 0.06) * bolt); }
      else mv.position.set(0, 0, mdl.mdir * (mdl.mt || 0) * (empty ? 0.9 : Math.pow(rec, 0.6))); }
    if (mg) { let off = 0, rot = 0; if (reload != null) { const p = reload; off = p < 0.3 ? -p / 0.3 : p < 0.55 ? -1 : p < 0.8 ? -(0.8 - p) / 0.25 : 0; rot = p < 0.3 ? -p * 0.8 : p < 0.55 ? -0.25 : 0; } mg.position.set(0, off * 0.2, 0); mg.rotation.x = rot; }
    // world-space muzzle / eject points
    if (!h._mz) { h._mz = new T.Vector3(); h._ej = new T.Vector3(); } h._mz.set(mdl.muz[0], mdl.muz[1], mdl.muz[2]).applyMatrix4(g.matrix); h._ej.set(mdl.eject[0], mdl.eject[1], mdl.eject[2]).applyMatrix4(g.matrix); h._mdl = mdl; h._eq = new T.Quaternion().setFromRotationMatrix(m);
    return true;
  },
  flash(h, scale = 1) {
    if (!this.initDone || !h._mz) return; const s = this.flashes.find(f => !f.visible) || this.flashes[0]; s.position.copy(h._mz); s.visible = true; s.userData.t = 0.055; s.userData.sc = 0.38 * scale; s.material.rotation = Math.random() * TAU; s.scale.setScalar(s.userData.sc * rr(0.8, 1.3));
    for (let k = 0; k < 3; k++) FX.emit(h._mz.x, h._mz.y, h._mz.z, rr(-.4, .4), rr(0.1, 0.6), rr(-.4, .4), rr(.5, 1.1), 0.25 * scale, 0.7, 0.7, 0.7, -0.2, 3);
  },
  eject(h) {
    if (!this.initDone || !h._ej || !h._mdl || !(h._mdl.eject[0] || h._mdl.eject[1])) return; const C = this.casings, i = C.i++ % C.n, q = h._eq, side = new T.Vector3(1, 0.4, -0.3).applyQuaternion(q).multiplyScalar(rr(1.6, 2.6)); side.y += rr(1, 1.8);
    C.list[i] = { x: h._ej.x, y: h._ej.y, z: h._ej.z, vx: side.x, vy: side.y, vz: side.z, rx: rr(0, 6), ry: rr(0, 6), sp: rr(8, 22), t: 0, rest: false };
  },
  update(dt) {
    if (!this.initDone) return;
    for (const f of this.flashes) if (f.visible) { f.userData.t -= dt; if (f.userData.t <= 0) f.visible = false; else f.material.opacity = f.userData.t / 0.055; }
    const C = this.casings, d = new T.Object3D(); let n = 0;
    for (let i = 0; i < C.n; i++) { const c = C.list[i]; if (!c) continue; c.t += dt;
      if (!c.rest) { c.vy -= 14 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt; c.rx += c.sp * dt; if (c.y < 0.03) { c.y = 0.03; if (Math.abs(c.vy) > 1) { c.vy *= -0.35; c.vx *= 0.6; c.vz *= 0.6; if (c.t < 2) Snd.tone(3200 + Math.random() * 800, 0.03, 0.025, 'triangle'); } else { c.rest = true; c.vy = 0; } } }
      if (c.t > 25) { C.list[i] = null; continue; } d.position.set(c.x, c.y, c.z); d.rotation.set(c.rx, c.ry, 0); d.updateMatrix(); C.mesh.setMatrixAt(n++, d.matrix); }
    C.mesh.count = n; C.mesh.instanceMatrix.needsUpdate = true;
  },
  decal(x, y, z, nx, ny, nz, size = 1) {
    if (!this.initDone) return; const D = this.decals, m = D.meshes[D.i++ % D.n]; m.visible = true; m.position.set(x + nx * 0.02, y + ny * 0.02, z + nz * 0.02); m.lookAt(x + nx, y + ny, z + nz); m.scale.setScalar(size * rr(0.7, 1.2)); m.rotateZ(rr(0, TAU));
  },
};
// approximate surface normal at a hit point on a solid / ground
function surfaceNormal(x, y, z) {
  if (y < 0.08) return [0, 1, 0]; let best = null, bd = 1e9;
  forSolids(x, z, 0.4, s => { if (y > s.h + 0.2) return; const ds = [[Math.abs(x - s.x0), [-1, 0, 0]], [Math.abs(x - s.x1), [1, 0, 0]], [Math.abs(z - s.z0), [0, 0, -1]], [Math.abs(z - s.z1), [0, 0, 1]], [Math.abs(y - s.h), [0, 1, 0]]]; for (const [d, n] of ds) if (d < bd) { bd = d; best = n; } });
  return best || [0, 1, 0];
}
