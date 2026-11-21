'use strict';
// ===== Main: renderer, boot, game loop =====
let renderer, scene, tracerLines, headL, fpsAcc = 0, fpsN = 0, ready = false;

function boot() {
  const canvas = $('c');
  renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6)); renderer.setSize(innerWidth, innerHeight); renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.18;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  scene = new T.Scene(); G.camera = new T.PerspectiveCamera(65, innerWidth / innerHeight, 0.15, 2600); scene.add(G.camera);
  addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); G.camera.aspect = innerWidth / innerHeight; G.camera.updateProjectionMatrix(); if (Post.composer) Post.resize(); });
  Input.init(canvas); UI.init();
  $('loadmsg').textContent = 'Building Florida...';
  setTimeout(() => {
    const t0 = performance.now();
    buildWorld(scene);
    Shops.build();
    Story.build();
    NPCs.init(6500);
    finalizeWorld(scene);
    unseedRng();
    Humans.init(scene); Pickups.init(scene); Story.init(); Weather.init(scene); Proj.init(); Props.build(scene); Skids.init(scene); Guns.init(scene); Extras.init(scene); FX = new Particles(2600); scene.add(FX.mesh); P.init();
    const bl = new T.BufferGeometry(); bl.setAttribute('position', new T.BufferAttribute(new Float32Array(64 * 6), 3)); tracerLines = new T.LineSegments(bl, new T.LineBasicMaterial({ color: 0xffe9a0 })); tracerLines.frustumCulled = false; scene.add(tracerLines);
    headL = new T.SpotLight(0xfff2cc, 0, 70, 0.55, 0.6); scene.add(headL); scene.add(headL.target);
    const S = Shops.safe; P.x = S.x; P.z = S.z; P.camYaw = Math.PI; P.face = 0;
    ready = true; $('loadmsg').textContent = `Ready — built in ${((performance.now() - t0) / 1000).toFixed(1)}s. ${NPCs.list.length} citizens, ${Shops.list.length} businesses.`;
    $('newgame').disabled = false; $('contgame').disabled = !SaveSys.has();
    G.camera.position.set(P.x + 20, 30, P.z + 20); G.camera.lookAt(P.x, 5, P.z);
    try { Post.init(renderer, scene, G.camera); Post.toggle(true); } catch (err) { console.warn('post disabled', err); Post.composer = null; }
    G.time = 0; G.dt = 0.016; updateSky(G.camera.position, { x: P.x, z: P.z }); Post.composer && Post.on ? Post.render() : renderer.render(scene, G.camera);
    requestAnimationFrame(loop);
  }, 60);
  $('newgame').disabled = true; $('contgame').disabled = true;
  $('newgame').onclick = () => start(false); $('contgame').onclick = () => start(true);
  addEventListener('keydown', e => {
    if (G.state !== 'play') return;
    if (e.code === 'Escape' && G.modal) { if (Pawn.shop) Pawn.close(); else if (UI.mapOpen) UI.toggleMap(); }
    if (e.code === 'KeyM' && !e.repeat && !Pawn.shop && !Cut.on) UI.toggleMap();
    if (e.code === 'KeyJ' && !e.repeat) Story.journal();
    if (e.code === 'F1') { e.preventDefault(); document.body.classList.toggle('nohud'); }
    if (e.code === 'KeyB' && !e.repeat && Post.composer) { Post.toggle(); UI.msg('Cinematic effects ' + (Post.on ? 'ON' : 'OFF'), 1200); }
    if (e.code === 'Escape' && document.getElementById('journal').style.display === 'flex') Story.journal(false);
  });
  canvas.addEventListener('click', () => { if (G.state === 'play' && !G.modal && !G.paused && !Input.locked && !P.dead) Input.lock(); });
  $('pause').addEventListener('click', e => { if (e.target.id === 'pause') UI.pause(false); });
}

function start(cont) {
  if (!ready) return; Snd.init(); $('menu').style.display = 'none'; G.state = 'play'; G.paused = false; G.modal = false;
  const S = Shops.safe; P.x = S.x; P.z = S.z; P.hp = 100; P.dead = false;
  Story.reset(); G.robLog = [];
  if (cont && SaveSys.load()) UI.msg('Welcome back to Florida', 2500); else { G.cash = 2500; G.tod = 7 * 60 + 45; UI.statT = 6; try { Weather.pick(chance(0.65) ? 'clear' : 'partly'); Weather.t = rr(160, 260); } catch (e) { } }
  Input.lock(); G.lastNews = G.time;
}

function updateTracers(dt) {
  const arr = tracerLines.geometry.attributes.position.array; let n = 0;
  for (let i = G.bullets.length - 1; i >= 0; i--) { const b = G.bullets[i]; b.t -= dt; if (b.t <= 0) { G.bullets.splice(i, 1); continue; } if (n < 64) { arr.set([b.x0, b.y0, b.z0, b.x1, b.y1, b.z1], n * 6); n++; } }
  tracerLines.geometry.setDrawRange(0, n * 2); tracerLines.geometry.attributes.position.needsUpdate = true;
}

let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const rawDt = Math.min(0.05, (now - last) / 1000); last = now; let dt = G.dt ? lerp(G.dt, rawDt, 0.6) : rawDt; G.dt = dt; // light smoothing of frame-time jitter
  // adaptive resolution
  fpsAcc += dt; fpsN++; if (fpsAcc > 2) { const fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; const pr = renderer.getPixelRatio(); if (fps < 32 && pr > 0.7) Post.setRes(pr - 0.15); else if (fps > 55 && pr < Math.min(devicePixelRatio, 1.6)) Post.setRes(Math.min(pr + 0.1, 1.6)); G.fps = fps; }
  if (G.state === 'play' && !G.paused && !G.modal) {
    G.time += dt; G.tod += dt * 1.0; if (G.tod >= 1440) { G.tod -= 1440; G.day++; }
    P.update(dt); Vehicles.update(dt); NPCs.update(dt); Police.update(dt); Shops.update(dt); Extras.update(dt); Story.update(dt); Pickups.update(dt); Proj.update(dt); Props.update(dt); Guns.update(dt); FX.update(dt); updateTracers(dt);
    for (const f of World.animated) f(dt);
    // actor lists for rendering
    const hl = G.actives.filter(a => !a.hidden && a.pose);
    for (const c of G.cars) { if (c.wreck || c.dead || d2(c.x, c.z, P.x, P.z) > 8100) continue; let a = null; if (c.driver === 'player') a = P.actor; else if (c.ai.mode === 'traffic' || c.ai.mode === 'police' || c.ai.mode === 'story' || c.ai.mode === 'race') a = c.dAct || (c.dAct = Drivers.make(c)); if (!a) continue; Drivers.place(a, c); hl.push(a); }
    Humans.render(hl);
    G.envT = (G.envT === undefined ? 0 : G.envT) - dt; if (G.envT <= 0) { G.envT = 50; updateCarEnv(); } envFaceStep();
    Weather.update(dt); updateSky(G.camera.position, { x: P.x, z: P.z });
    // headlights
    if (P.inCar && P.car && G.night > 0.25) { const c = P.car, fx = Math.sin(c.h), fz = Math.cos(c.h); headL.intensity = 2.2; headL.position.set(c.x + fx * 2, 1, c.z + fz * 2); headL.target.position.set(c.x + fx * 25, 0, c.z + fz * 25); } else headL.intensity = 0;
    const cs = P.car ? Math.hypot(P.car.vx, P.car.vz) / CAR_TYPES[P.car.type].maxSpeed : 0; const shoreD = clamp(1 - Math.max(0, landSD(P.x, P.z)) / 120, 0, 1) * (P.x > 0 ? 1 : 0.6);
    Snd.update(cs, P.inCar, G.sirenVol || 0, shoreD, 0);
    // autosave
    G.saveT = (G.saveT || 0) + dt; if (G.saveT > 45 && !P.dead) { G.saveT = 0; SaveSys.save(); }
    // random ambient news
    G.newsT = (G.newsT || 40) - dt; if (G.newsT <= 0) { G.newsT = rr(70, 130); UI.news(pick(['Traffic alert: heavy congestion on the Keys causeway.', 'Beach report: lifeguards warn of strong rip currents.', 'Local gator spotted near the Everglades highway.', 'Police urge residents to lock their cars.']), ''); }
  } else if (G.state === 'play') { /* paused / modal: keep camera static */ }
  UI.update(dt);
  if (Post.composer && Post.on) Post.render(); else renderer.render(scene, G.camera);
  Input.endFrame();
}

addEventListener('load', boot);

let carEnvRT = null, carEnvCam = null, envFace = 6;
function updateCarEnv() {
  try {
    if (!carEnvRT) { carEnvRT = new T.WebGLCubeRenderTarget(128, { generateMipmaps: true, minFilter: T.LinearMipmapLinearFilter }); carEnvCam = new T.CubeCamera(1, 3000, carEnvRT); scene.add(carEnvCam);
      carMat.envMap = carEnvRT.texture; carMat.envMapIntensity = 0.75; carMat.needsUpdate = true; carGlassMat.envMap = carEnvRT.texture; carGlassMat.reflectivity = 0.6; carGlassMat.combine = T.MixOperation; carGlassMat.needsUpdate = true; for (const cc of G.cars) if (cc.body && cc.body.material !== carMat) { cc.body.material.envMap = carEnvRT.texture; cc.body.material.needsUpdate = true; } for (const mm of [World.winMat, World.roadMat, World.roadMat2, GUNMAT]) { mm.envMap = carEnvRT.texture; mm.needsUpdate = true; }
      carEnvCam.position.set(P.x, 7, P.z); carEnvCam.update(renderer, scene); return; }
    envFace = 0; // later refreshes are spread over 6 frames (one cube face per frame) so there is no hitch
  } catch (e) { console.warn('env map failed', e); }
}
function envFaceStep() {
  if (envFace > 5 || !carEnvRT) return;
  try {
    if (envFace === 0) { carEnvCam.position.set(P.x, 7, P.z); carEnvCam.updateMatrixWorld(true); }
    const tex = carEnvRT.texture, sa = renderer.shadowMap.autoUpdate; tex.generateMipmaps = envFace === 5; renderer.shadowMap.autoUpdate = false;
    renderer.setRenderTarget(carEnvRT, envFace); renderer.render(scene, carEnvCam.children[envFace]); renderer.setRenderTarget(null); renderer.shadowMap.autoUpdate = sa; tex.generateMipmaps = true; envFace++;
  } catch (e) { envFace = 6; console.warn('env face failed', e); }
}
