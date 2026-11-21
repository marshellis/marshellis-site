'use strict';
// ===== Weather & atmosphere: Florida pop-up storms, rain, lightning, fog, wind, wet roads, rainbows,
//       street lamps, headlight beams, seagulls, umbrellas, temperature =====
const KINDS = {
  clear: { cloud: .10, rain: 0, fog: 0, wind: .12, storm: 0, label: 'Clear & sunny', icon: '☀️' },
  partly: { cloud: .42, rain: 0, fog: 0, wind: .22, storm: 0, label: 'Partly cloudy', icon: '⛅' },
  overcast: { cloud: .88, rain: 0, fog: .05, wind: .28, storm: 0, label: 'Overcast', icon: '☁️' },
  fog: { cloud: .5, rain: 0, fog: .55, wind: .05, storm: 0, label: 'Dense morning fog', icon: '🌫️' },
  shower: { cloud: .78, rain: .42, fog: 0, wind: .32, storm: 0, label: 'Passing showers', icon: '🌦️' },
  rain: { cloud: .95, rain: .72, fog: .12, wind: .42, storm: 0, label: 'Steady rain', icon: '🌧️' },
  storm: { cloud: 1, rain: .95, fog: .14, wind: .72, storm: 1, label: 'Thunderstorm', icon: '⛈️' },
  tropical: { cloud: 1, rain: 1, fog: .3, wind: 1, storm: 1.4, label: 'TROPICAL STORM', icon: '🌀' },
};
const Weather = {
  ready: false, kind: 'partly', s: { cloud: .4, rain: 0, fog: 0, wind: .2, storm: 0 }, tgt: KINDS.partly, t: 60, wet: 0, flash: 0, flashQ: [], lt: 8, rainbow: 0, prevRain: 0, shelter: 0, temp: 86, wOff: 0, lampOn: 0, lastWarn: 0,
  uTime: { value: 0 }, uWind: { value: 0.2 },
  get rain() { return this.s.rain; }, get label() { return KINDS[this.kind].label; }, get icon() { return KINDS[this.kind].icon; },
  init(scene) {
    this.scene = scene;
    // glow texture
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(.4, 'rgba(255,230,170,.45)'); gr.addColorStop(1, 'rgba(255,220,150,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    this.glowTex = new T.CanvasTexture(c);
    this.beamMat = new T.MeshBasicMaterial({ map: this.glowTex, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0, fog: true });
    this.beamGeo = new T.PlaneGeometry(3.6, 12); this.beamGeo.rotateX(-Math.PI / 2);
    this.initRain(scene); this.initLamps(scene); this.initBirds(scene); this.initBolt(scene);
    this.pick('partly'); this.s = Object.assign({}, KINDS.partly); this.ready = true;
  },
  sway(mat, k) { // wind sway shader for instanced vegetation
    mat.onBeforeCompile = sh => {
      sh.uniforms.uTime = this.uTime; sh.uniforms.uWind = this.uWind;
      sh.vertexShader = 'uniform float uTime;uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `vec3 transformed=vec3(position);float hh=clamp(position.y/${(k || 8).toFixed(1)},0.,1.);float ph=instanceMatrix[3].x*.11+instanceMatrix[3].z*.07;
        transformed.x+=sin(uTime*1.9+ph)*uWind*hh*hh*(.3+uWind*.9);transformed.z+=cos(uTime*1.5+ph*1.3)*uWind*hh*hh*.55;transformed.y-=uWind*hh*hh*.45;`);
    };
  },
  initRain(scene) {
    const N = 4200, off = new Float32Array(N * 2 * 3), endv = new Float32Array(N * 2), rnd = new Float32Array(N * 2), pos = new Float32Array(N * 2 * 3);
    for (let i = 0; i < N; i++) { const a = Math.random(), b = Math.random(), c = Math.random(), r = Math.random(); for (let v = 0; v < 2; v++) { const k = (i * 2 + v); off[k * 3] = a; off[k * 3 + 1] = b; off[k * 3 + 2] = c; endv[k] = v; rnd[k] = r; } }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('off', new T.BufferAttribute(off, 3)); g.setAttribute('endv', new T.BufferAttribute(endv, 1)); g.setAttribute('rnd', new T.BufferAttribute(rnd, 1));
    this.rainMat = new T.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { time: { value: 0 }, cam: { value: new T.Vector3() }, box: { value: new T.Vector3(70, 45, 70) }, wind: { value: new T.Vector2() }, len: { value: 1.7 }, intensity: { value: 0 }, tint: { value: new T.Color(.78, .84, .92) }, uPost: PostFlag },
      vertexShader: `attribute vec3 off;attribute float endv;attribute float rnd;uniform float time,intensity,len;uniform vec3 cam,box;uniform vec2 wind;varying float a;
        void main(){float spd=20.+rnd*8.;float y=fract(off.y-time*spd/box.y);float x=fract(off.x+time*wind.x*.35/box.x);float z=fract(off.z+time*wind.y*.35/box.z);
        vec3 w=cam+(vec3(x,y,z)-.5)*box;vec3 tail=vec3(wind.x*.06,1.,wind.y*.06)*len*(1.+rnd);w+=tail*endv;a=step(rnd,intensity)*(.85-.5*endv);gl_Position=projectionMatrix*viewMatrix*vec4(w,1.);}`,
      fragmentShader: 'uniform vec3 tint;uniform float uPost;varying float a;void main(){if(a<.01)discard;gl_FragColor=vec4(mix(tint,pow(tint,vec3(2.2)),uPost),a);}',
    });
    this.rainMesh = new T.LineSegments(g, this.rainMat); this.rainMesh.frustumCulled = false; this.rainMesh.renderOrder = 5; scene.add(this.rainMesh);
  },
  initBolt(scene) {
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(new Float32Array(40 * 3), 3));
    this.bolt = new T.Line(g, new T.LineBasicMaterial({ color: 0xeef2ff, fog: false })); this.bolt.frustumCulled = false; this.bolt.visible = false; scene.add(this.bolt);
  },
  strike() {
    const a = Math.random() * TAU, d = rr(180, 700), x = P.x + Math.cos(a) * d, z = P.z + Math.sin(a) * d, p = this.bolt.geometry.attributes.position.array; let px = x, pz = z;
    for (let i = 0; i < 20; i++) { const y = 260 * (1 - i / 19); p[i * 3] = px; p[i * 3 + 1] = y; p[i * 3 + 2] = pz; px += rr(-9, 9); pz += rr(-9, 9); } this.bolt.geometry.setDrawRange(0, 20); this.bolt.geometry.attributes.position.needsUpdate = true;
    this.bolt.visible = true; this.boltT = 0.18; this.flashQ.push(1, 0.55, 0.9); this.flash = 1; this.pending = { d, x, z };
    Snd.thunder(d / 230, clamp(1.2 - d / 900, 0.25, 1)); if (d < 220 && Math.random() < 0.25) { fxSpark(x, 0.5, z, 12); }
  },
  pick(force) {
    const h = (G.tod / 60) % 24, r = Math.random(); let w;
    if (h > 5 && h < 10) w = [['clear', 45], ['partly', 28], ['fog', 14], ['shower', 9], ['overcast', 4]];
    else if (h >= 10 && h < 14) w = [['partly', 38], ['clear', 26], ['overcast', 14], ['shower', 14], ['storm', 8]];
    else if (h >= 14 && h < 19.5) w = [['storm', 32], ['partly', 20], ['shower', 20], ['rain', 10], ['overcast', 10], ['clear', 8]];
    else w = [['clear', 38], ['partly', 24], ['shower', 14], ['rain', 10], ['overcast', 10], ['storm', 4]];
    if (Math.random() < 0.025) w = [['tropical', 100]];
    let kind = force; if (!kind) { let tot = w.reduce((a, b) => a + b[1], 0), q = Math.random() * tot; for (const [k, p] of w) { q -= p; if (q <= 0) { kind = k; break; } } }
    this.kind = kind; this.tgt = KINDS[kind]; this.t = kind === 'tropical' ? rr(200, 320) : rr(80, 230);
    if (kind === 'storm' || kind === 'tropical') { if (G.time - this.lastWarn > 40) { this.lastWarn = G.time; UI.news(kind === 'tropical' ? '⚠ TROPICAL STORM WARNING: seek shelter, expect flooding and 60 mph gusts.' : '⚠ Severe thunderstorm warning for the coast. Lightning and heavy rain expected.', 'crime'); } }
    else if (kind === 'fog') UI.news('Dense fog advisory along the coast until mid-morning.', '');
  },
  indoors(x, z) { for (const s of Shops.list) { for (const r of [s.rect, s.cover]) if (r && x > r[0] && x < r[2] && z > r[1] && z < r[3]) return true; } return false; },
  update(dt) {
    if (!this.ready) return; const s = this.s, t = this.tgt, k = Math.min(1, dt / 24);
    this.t -= dt; if (this.t <= 0) this.pick();
    for (const key of ['cloud', 'rain', 'fog', 'wind', 'storm']) s[key] += (t[key] - s[key]) * k;
    if (s.rain > 0.1) this.wet = Math.min(1, this.wet + dt * s.rain / 22); else this.wet = Math.max(0, this.wet - dt / 150);
    // rainbow after rain
    if (this.prevRain > 0.2 && s.rain < 0.2 && G.sunE > 0.08 && s.cloud < 0.85) this.rainbow = 1; this.prevRain = s.rain; if (this.rainbow > 0) this.rainbow = Math.max(0, this.rainbow - dt / 90); if (s.rain > 0.3 || G.sunE < 0.05) this.rainbow = Math.max(0, this.rainbow - dt);
    // lightning
    if (s.storm > 0.4) { this.lt -= dt; if (this.lt <= 0) { this.strike(); this.lt = rr(3.5, 12) / s.storm; } }
    if (this.flashQ.length) { this.flashT = (this.flashT || 0) + dt; if (this.flashT > 0.09) { this.flashT = 0; this.flash = this.flashQ.shift(); } } else this.flash = Math.max(0, this.flash - dt * 3.5);
    if (this.boltT > 0) { this.boltT -= dt; if (this.boltT <= 0) this.bolt.visible = false; }
    // shelter (inside shop / canopy)
    const cam = G.camera.position, ind = this.indoors(P.x, P.z) || this.indoors(cam.x, cam.z); this.shelter += ((ind ? 1 : 0) - this.shelter) * Math.min(1, dt * 4);
    // temperature (deg F): peaks ~3pm, cooler in rain
    const h = G.tod / 60; this.temp = 80 + 10 * Math.sin((h - 9) / 24 * TAU) - 7 * s.rain - 3 * s.cloud + (this.tgt === KINDS.fog ? -2 : 0);
    // uniforms
    this.uTime.value = G.time; this.uWind.value = s.wind;
    const rm = this.rainMat.uniforms; rm.time.value = G.time; rm.cam.value.copy(cam); rm.intensity.value = clamp(s.rain, 0, 1) * (1 - this.shelter); rm.wind.value.set(s.wind * 7, s.wind * 3); rm.tint.value.setScalar(G.night > 0.5 ? 0.45 : 0.8).lerp(new T.Color(.5, .55, .65), 0.2);
    this.rainMesh.visible = rm.intensity.value > 0.02;
    // splashes
    if (s.rain > 0.25 && !ind) { const n = Math.floor(s.rain * 6); for (let i = 0; i < n; i++) { const a = Math.random() * TAU, d = Math.random() * 14, x = cam.x + Math.cos(a) * d, z = cam.z + Math.sin(a) * d; FX.emit(x, 0.15, z, rr(-.4, .4), rr(1, 2.2), rr(-.4, .4), 0.28, 0.08, .8, .85, .95, 9); } }
    // lamps / beams
    this.lampOn = clamp(Math.max(G.night * 1.2, s.storm * 0.7 + s.rain * 0.25 + s.fog * 0.3), 0, 1);
    this.lampHead.material.color.setHex(0x6a6a60).lerp(new T.Color(1, .92, .6), this.lampOn); this.lampGlow.material.opacity = this.lampOn * 0.75; this.beamMat.opacity = this.lampOn * 0.5;
    this.birds(dt); Snd.weather(s.rain * (1 - this.shelter * 0.65), s.wind * (1 - this.shelter * 0.55), s.storm);
    // gusts push the camera subtly in storms
    if (s.wind > 0.7) G.shake = Math.max(G.shake, (s.wind - 0.7) * 0.12);
  },
  // called at the end of updateSky(): tint sky, light, fog, materials
  apply(U, day) {
    const s = this.s, dark = clamp(s.storm * 0.9 + s.rain * 0.45, 0, 1); U.cloud.value = s.cloud; U.dark.value = dark; U.rainbow.value = this.rainbow; U.flash.value = this.flash;
    const k = clamp(s.cloud * 0.72 + s.fog * 0.45, 0, 0.88), lum = (0.3 + 0.7 * day) * (1 - 0.5 * dark), top = new T.Color(.55, .6, .68).multiplyScalar(lum), hor = new T.Color(.7, .74, .8).multiplyScalar(lum * 1.05);
    U.top.value.lerp(top, k); U.hor.value.lerp(hor, k * 0.9); U.top.value.addScalar(this.flash * 0.25); U.hor.value.addScalar(this.flash * 0.3);
    const cl = clamp(s.cloud * 0.7 + s.storm * 0.3, 0, 0.92); World.sun.intensity *= 1 - 0.82 * cl; World.hemi.intensity = World.hemi.intensity * (1 - 0.22 * cl) + this.flash * 2.2;
    const fg = World.scene.fog, fk = Math.max(s.rain * 0.6, s.fog); fg.far = Math.max(170, fg.far * (1 - 0.62 * fk)); fg.near = lerp(100, 34, clamp(s.fog * 1.1, 0, 1)); fg.color.copy(U.hor.value); World.scene.background = fg.color;
    for (const m of [World.roadMat, World.roadMat2]) if (m) { m.reflectivity = 0.03 + this.wet * 0.55; m.specular.setScalar(0.08 + this.wet * 0.75); m.shininess = 18 + this.wet * 90; }
    const w = 1 - 0.3 * this.wet; for (const m of [World.plainMat, World.winMat, World.roadMat, World.roadMat2, World.terrainMat]) if (m) m.color.setScalar(w);
    if (World.waterMat) { const wu = World.waterMat.uniforms; wu.wind.value = s.wind; wu.cloud.value = Math.max(s.cloud * 0.6, s.storm * 0.5); }
  },
  // ---- lamps
  initLamps(scene) {
    const pts = []; for (const n of World.nodes.values()) { if (zoneAt(n.x, n.z) === 'swamp') continue; for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const x = n.x + sx * 8.7, z = n.z + sz * 8.7; if (landSD(x, z) > 25) pts.push([x, z]); } }
    const pole = new T.BoxGeometry(.2, 6.6, .2); pole.translate(0, 3.3, 0); const head = new T.BoxGeometry(1.0, .25, .5); head.translate(0, 6.7, 0); const glow = new T.PlaneGeometry(17, 17); glow.rotateX(-Math.PI / 2); glow.translate(0, .12, 0);
    const mk = (geo, mat) => { const m = new T.InstancedMesh(geo, mat, pts.length); const d = new T.Object3D(); pts.forEach((p, i) => { d.position.set(p[0], 0, p[1]); d.updateMatrix(); m.setMatrixAt(i, d.matrix); }); m.frustumCulled = false; scene.add(m); return m; };
    mk(pole, new T.MeshLambertMaterial({ color: 0x4a4e55 })); this.lampHead = mk(head, new T.MeshBasicMaterial({ color: 0x6a6a60 })); this.lampGlow = mk(glow, new T.MeshBasicMaterial({ map: this.glowTex, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0, color: 0xffe2a0 })); this.lampGlow.renderOrder = 2;
  },
  // ---- seagulls
  initBirds(scene) {
    const g = new T.BufferGeometry(), v = [0, 0, .35, .95, .12, -.1, 0, 0, -.35, 0, 0, .35, 0, 0, -.35, -.95, .12, -.1, 0, 0, .35, 0, 0, -.35, .95, .12, -.1, 0, 0, -.35, 0, 0, .35, -.95, .12, -.1]; g.setAttribute('position', new T.Float32BufferAttribute(v, 3)); g.computeVertexNormals();
    this.birdMesh = new T.InstancedMesh(g, new T.MeshLambertMaterial({ color: 0xf4f4f4, side: T.DoubleSide }), 40); this.birdMesh.frustumCulled = false; scene.add(this.birdMesh);
    this.flock = Array.from({ length: 40 }, (_, i) => ({ a: Math.random() * TAU, r: rr(14, 48), h: rr(10, 30), sp: rr(.25, .5) * (Math.random() < .5 ? -1 : 1), zo: rr(-260, 260), ph: Math.random() * 6 }));
  },
  birds(dt) {
    const near = P.x > 250 && G.sunE > 0.02 && this.s.wind < 0.65 && this.s.storm < 0.3; const m = this.birdMesh; if (!near) { m.count = 0; return; } m.count = this.flock.length;
    const d = this._d || (this._d = new T.Object3D());
    this.flock.forEach((b, i) => { b.a += b.sp * dt; const z = P.z + b.zo, cx = shoreX(z) - 40, x = cx + Math.cos(b.a) * b.r, zz = z + Math.sin(b.a) * b.r, y = b.h + Math.sin(G.time * .7 + b.ph) * 2; d.position.set(x, y, zz); d.rotation.set(0, Math.atan2(-Math.sin(b.a) * b.sp, Math.cos(b.a) * b.sp), -Math.cos(b.a) * b.sp * 0.4); const fl = .55 + .6 * Math.abs(Math.sin(G.time * 5 + b.ph)); d.scale.set(fl, 1, 1); d.updateMatrix(); m.setMatrixAt(i, d.matrix); });
    m.instanceMatrix.needsUpdate = true;
  },
};
