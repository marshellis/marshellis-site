'use strict';
// ===== Crime, wanted level, and the Florida police response =====
const Crime = {
  findWitness(x, z, exclude) {
    for (const c of G.cars) if (c.ai.mode === 'police' && dist(c.x, c.z, x, z) < 60) return { cop: true };
    let best = null, bd = 1e9;
    for (const n of G.actives) {
      if (n === exclude || n === P.actor || !n.alive || n.state === 'hostage' || n.state === 'dead') continue; const d = dist(n.x, n.z, x, z);
      if (n.kind === 'cop' && d < 80) return { cop: true };
      if (n.kind === 'npc' && !n.story && d < 38 && n.state !== 'handsup' && n.state !== 'fight' && losClear(n.x, n.z, x, z, 1.5) && d < bd) { bd = d; best = n; }
    }
    return best ? { n: best } : null;
  },
  witnessed(x, z, exclude) { return !!this.findWitness(x, z, exclude); },
  raise(level, x, z, label) {
    const w = this.findWitness(x, z); if (!w) return; if (w.cop) return this.force(level, label);
    const n = w.n; if (n.callCrime) { n.callCrime.level = Math.max(n.callCrime.level, level); return; } if (n.pendingCrime) { n.pendingCrime.level = Math.max(n.pendingCrime.level, level); return; }
    if (n.state === 'flee') { n.pendingCrime = { level, label }; return; }
    n.state = 'call'; n.callT = rr(3.2, 5); n.phoning = true; n.callCrime = { level, label }; n.callFace = { x: P.x, z: P.z }; NPCs.say(n, pick(['Hello? 911? Someone has a gun!', '911? There\'s been an incident!', 'Police! Please, hurry!']), 4);
  },
  report(level, x, z, label, wit) { this.raise(level, x, z, label); },
  force(level, label) {
    if (level > G.wanted) { G.wanted = Math.min(5, level); Snd.star(); UI.msg('WANTED: ' + label, 2200); UI.news('Crime reported: ' + label + ' (' + '★'.repeat(G.wanted) + ')', 'crime'); }
    G.lastSeen = G.time;
  },
};

function nearestNode(x, z) {
  const i0 = Math.round(x / B), j0 = Math.round(z / B); let best = null, bd = 1e12;
  for (let di = -2; di <= 2; di++) for (let dj = -2; dj <= 2; dj++) { const n = World.nodes.get((i0 + di) + ',' + (j0 + dj)); if (!n || !n.links.length) continue; const d = d2(n.x, n.z, x, z); if (d < bd) { bd = d; best = n; } }
  return best;
}
function roadPath(a, b) {
  if (!a || !b) return null; if (a === b) return [a];
  const g = new Map([[a, 0]]), par = new Map(), closed = new Set(); const open = [[0, a]]; let guard = 0;
  while (open.length && guard++ < 1500) {
    open.sort((p, q) => p[0] - q[0]); const [, n] = open.shift(); if (n === b) break; if (closed.has(n)) continue; closed.add(n);
    for (const m of n.links) { const ng = g.get(n) + dist(n.x, n.z, m.x, m.z); if (ng < (g.get(m) ?? 1e12)) { g.set(m, ng); par.set(m, n); open.push([ng + dist(m.x, m.z, b.x, b.z), m]); } }
  }
  if (!par.has(b)) return null; const out = [b]; let c = b; while (par.has(c)) { c = par.get(c); out.push(c); } return out.reverse();
}

const Police = {
  cops: [], spawnT: 2, heli: null, decayT: 0, lastShotHeard: 0,
  clear() { for (const c of this.cops.slice()) this.removeCop(c); for (const c of G.cars) if (c.ai.mode === 'police') { c.wreckGone = c.driver !== 'player'; } if (this.heli) { World.scene.remove(this.heli.grp); this.heli = null; } },
  copsNear(x, z, r) { for (const c of this.cops) if (c.alive && dist(c.x, c.z, x, z) < r) return true; return false; },
  heardShot(x, z, noise) { if (G.wanted > 0) return; if (this.copsNear(x, z, noise)) Crime.force(2, 'Shots fired near police'); for (const c of G.cars) if (c.ai.mode === 'police' && dist(c.x, c.z, x, z) < noise) Crime.force(2, 'Shots fired near police'); },
  makeCop(x, z, swat) {
    const c = { kind: 'cop', swat, x, y: 0, z, yaw: 0, hp: swat ? 220 : 100, alive: true, state: 'chase', look: makeLook(swat ? 'swat' : 'cop'), pose: newPose(), gun: { len: swat ? 0.85 : 0.3, two: swat }, shootT: rr(0.3, 1), dead: 0, age: 0, bubble: null, name: swat ? 'SWAT Officer' : 'Highway Patrol Officer', id: Math.random() };
    this.cops.push(c); G.actives.push(c); return c;
  },
  removeCop(c) { const i = this.cops.indexOf(c); if (i >= 0) this.cops.splice(i, 1); const j = G.actives.indexOf(c); if (j >= 0) G.actives.splice(j, 1); },
  hurt(c, dmg, src) {
    if (!c.alive) return; c.hp -= dmg; if (src === 'player') Crime.force(Math.max(G.wanted, 2), 'Shooting at police');
    if (c.hp <= 0) {
      c.deathType = ri(0, 3); c.alive = false; c.state = 'dead'; c.deadT = 0; c.gun = null; if (src === 'player') { G.stats.kills++; Crime.force(Math.min(5, Math.max(G.wanted + 1, 3)), 'Officer down'); UI.news('Officer down! A police officer was killed.', 'dead'); }
      Pickups.add(c.x, c.z, 'ammo', 15, 'Police ammo'); if (chance(0.5)) Pickups.add(c.x + .5, c.z, 'cash', ri(40, 150), 'Cash');
    }
  },
  arrestCheck(dt) {
    if (P.dead || P.inCar || G.wanted === 0 || P.hostage || P.aimingGun || P.shooting > 0 || G.wanted > 3) { this.arrest = Math.max(0, (this.arrest || 0) - dt * 2); return this.arrest; }
    let near = false; for (const c of this.cops) if (c.alive && dist(c.x, c.z, P.x, P.z) < 2.3) near = true;
    this.arrest = near ? (this.arrest || 0) + dt / 1.8 : Math.max(0, (this.arrest || 0) - dt * 1.5);
    if (this.arrest >= 1) { this.arrest = 0; P.respawn('busted'); } return this.arrest;
  },
  spawnCruiser(swat) {
    if (!Vehicles.nodeList) return; const px = P.x, pz = P.z, cf = G.camFwd || { x: 0, z: -1 };
    for (let tries = 0; tries < 20; tries++) {
      const n = pick(Vehicles.nodeList), d = dist(n.x, n.z, px, pz); if (d < 110 || d > 210) continue; const dx = (n.x - px) / d, dz = (n.z - pz) / d; if (d < 160 && dx * cf.x + dz * cf.z > 0.5) continue;
      if (G.cars.some(o => d2(o.x, o.z, n.x, n.z) < 100)) continue; const to = pick(n.links);
      const c = Vehicles.create(swat ? 'swat' : 'cop', n.x + 3.6, n.z, Math.atan2(to.x - n.x, to.z - n.z), { mode: 'police' }); c.ai = { mode: 'police', occ: swat ? 3 : 2, pathT: 0 }; c.sirenOn = true; c.sleep = false; c.keep = true; return c;
    }
  },
  cruiserStep(c, dt) {
    const ai = c.ai, tgt = P.inCar ? { x: P.car.x + P.car.vx * 0.35, z: P.car.z + P.car.vz * 0.35 } : { x: P.x, z: P.z }, d = dist(c.x, c.z, tgt.x, tgt.z), t = CAR_TYPES[c.type];
    if (G.wanted === 0 || c.dead) { c.sirenOn = false; if (!c.dead) { const n = nearestNode(c.x, c.z); if (n && n.links.length) { c.ai = { mode: 'traffic', from: n, to: pick(n.links), cruise: 11 }; c.keep = false; } } return; }
    c.sirenOn = true;
    // eject officers
    if (!ai.ejected && ((!P.inCar && d < 26 && Math.hypot(c.vx, c.vz) < 12) || (P.inCar && d < 10 && Math.hypot(P.car.vx, P.car.vz) < 3 && Math.hypot(c.vx, c.vz) < 3))) {
      ai.ejected = true; for (let k = 0; k < ai.occ; k++) { const sd = k % 2 ? 1 : -1, cop = this.makeCop(c.x + Math.cos(c.h) * 2.4 * sd, c.z - Math.sin(c.h) * 2.4 * sd, c.type === 'swat'); resolveCircle(cop, .4, 0); }
      UI.msg(c.type === 'swat' ? 'SWAT has deployed!' : 'Police on foot!', 1500);
    }
    if (ai.ejected) { this.cruiserDrive(c, { thr: 0, hand: true }, dt); if (d > 70 && !ai.rec) { ai.ejected = false; } return; }
    let wx = tgt.x, wz = tgt.z; const direct = d < 50 && losClear(c.x, c.z, tgt.x, tgt.z, 1.0);
    if (!direct) {
      ai.pathT = (ai.pathT || 0) - dt;
      if (!ai.path || ai.pathT <= 0) { ai.pathT = 2.2; ai.path = roadPath(nearestNode(c.x, c.z), nearestNode(tgt.x, tgt.z)); ai.wp = 0; }
      const p = ai.path; if (p) { while (ai.wp < p.length - 1 && dist(c.x, c.z, p[ai.wp].x, p[ai.wp].z) < 16) ai.wp++; wx = p[ai.wp].x; wz = p[ai.wp].z; if (ai.wp === p.length - 1 && dist(c.x, c.z, wx, wz) < 16) { wx = tgt.x; wz = tgt.z; } }
    }
    const want = Math.atan2(wx - c.x, wz - c.z); let steer = clamp(-angDiff(c.h, want) * 2.6, -1, 1), thr = 1;
    const speedCap = d < 14 && !P.inCar ? 0.35 : 1; thr = speedCap; if (Math.abs(angDiff(c.h, want)) > 1.2 && c.fs > 12) thr = 0;
    if (Math.abs(c.fs) < 1.3 && thr > 0) ai.stuckT = (ai.stuckT || 0) + dt; else if (c.fs > 3) ai.stuckT = 0;
    if (ai.stuckT > 1.4) { ai.rev = 1.1; ai.stuckT = 0; }
    if (ai.rev > 0) { ai.rev -= dt; thr = -1; steer = -steer; }
    this.cruiserDrive(c, { thr, steer }, dt);
  },
  cruiserDrive(c, inp, dt) { Vehicles.step(c, inp, dt); },
  copStep(c, dt) {
    const p = c.pose; c.age += dt; if (c.bubble) { c.bubble.t -= dt; if (c.bubble.t <= 0) c.bubble = null; }
    if (c.state === 'dead') { p.dead = Math.min(1, p.dead + dt * 3); c.deadT += dt; if (c.deadT > 40) this.removeCop(c); return; }
    const d = dist(c.x, c.z, P.x, P.z), los = d < 45 && losClear(c.x, c.z, P.x, P.z, 1.5);
    if (c.vx || c.vz) { c.x += c.vx * dt; c.z += c.vz * dt; c.vx *= .9; c.vz *= .9; }
    if (G.wanted === 0) { c.leaveT = (c.leaveT || 0) + dt; p.aim = lerp(p.aim, 0, 8 * dt); p.walk = lerp(p.walk, 0, 8 * dt); if (c.leaveT > 6 && d > 30) this.removeCop(c); return; }
    c.leaveT = 0;
    if (los) { G.lastSeen = G.time; c.lastKnown = { x: P.x, z: P.z }; }
    const tx = (P.inCar ? P.car.x : P.x), tz = (P.inCar ? P.car.z : P.z);
    c.yaw = turnToward(c.yaw, Math.atan2(tx - c.x, tz - c.z), 8 * dt);
    let sp = 0;
    const want = los ? (d > 16 ? 5.6 : d < 7 ? -2.5 : 0) : (c.lastKnown ? 5.6 : 4);
    if (want !== 0) { const gx = los ? tx : (c.lastKnown ? c.lastKnown.x : tx), gz = los ? tz : (c.lastKnown ? c.lastKnown.z : tz), dx = gx - c.x, dz = gz - c.z, dl = Math.hypot(dx, dz) || 1, s = Math.abs(want) * (want < 0 ? -1 : 1);
      let mx = dx / dl * s, mz = dz / dl * s; if (c.sidestep > 0) { c.sidestep -= dt; const q = mx; mx = -mz * (c.sd || 1) * 0.9 + mx * 0.3; mz = q * (c.sd || 1) * 0.9 + mz * 0.3; }
      const ox = c.x, oz = c.z; c.x += mx * dt; c.z += mz * dt; resolveCircle(c, 0.4, 0); if (!walkable(c.x, c.z)) { c.x = ox; c.z = oz; }
      sp = dist(ox, oz, c.x, c.z) / dt; if (sp < Math.abs(s) * 0.35 && !los) { c.sd = chance(.5) ? 1 : -1; c.sidestep = 1.1; } }
    p.walk = lerp(p.walk, clamp(sp / 2.6, 0, 1.5), Math.min(1, 10 * dt)); stepPhase(p, sp, dt); p.anger = lerp(p.anger || 0, los ? 0.8 : 0.35, 5 * dt);
    // shooting
    if (los && d < 30) {
      p.aim = lerp(p.aim, 1, 10 * dt); c.shootT -= dt;
      if (c.shootT <= 0) {
        c.shootT = c.swat ? rr(0.35, 0.7) : rr(0.9, 1.5);
        const hostageSafe = P.hostage && d > 3 && chance(0.88); if (hostageSafe) { if (!c.bubble && chance(0.5)) { c.bubble = { text: pick(['Let the hostage go!', 'Drop the weapon!', 'Easy... let them go!', 'Nobody has to get hurt!']), t: 2.4 }; } }
        else { Snd.shot(c.swat ? 'rifle' : 'pistol', Math.max(0.2, 1 - d / 70)); NPCs.addTracer(c._mz ? c._mz.x : c.x, c._mz ? c._mz.y : 1.4, c._mz ? c._mz.z : c.z, P.x, 1.2, P.z); c.pose.recoil = 1; Guns.flash(c, c.swat ? 1.1 : 0.8); Guns.eject(c); const acc = (P.inCar ? 0.22 : 0.4) * (1 - d / 45) * (c.swat ? 1.3 : 1); if (chance(acc)) { P.hurt(c.swat ? rr(6, 10) : rr(4, 8), 'bullet'); Snd.hit(); } }
      }
    } else p.aim = lerp(p.aim, 0, 8 * dt);
  },
  update(dt) {
    // wanted decay
    let seen = false;
    for (const c of this.cops) if (c.alive && dist(c.x, c.z, P.x, P.z) < 50 && losClear(c.x, c.z, P.x, P.z, 1.4)) seen = true;
    for (const c of G.cars) if (c.ai.mode === 'police' && dist(c.x, c.z, P.x, P.z) < 42 && !c.dead) seen = true;
    if (this.heli && this.heli.alive && dist(this.heli.x, this.heli.z, P.x, P.z) < 60) seen = true;
    if (seen && G.wanted > 0) G.lastSeen = G.time;
    if (G.wanted > 0 && !P.dead) { if (G.time - G.lastSeen > (P.masked ? 8 : 14)) { this.decayT += dt; if (this.decayT > 6) { this.decayT = 0; G.wanted--; if (G.wanted === 0) { UI.msg('Wanted level cleared — you lost them', 2500); G.lastSeen = 0; } } } else this.decayT = 0; }
    G.copsNearby = seen;
    // spawn
    this.spawnT -= dt;
    if (this.spawnT <= 0 && G.wanted > 0 && !P.dead) {
      this.spawnT = 2.2; const want = [0, 2, 3, 4, 5, 6][G.wanted], cr = G.cars.filter(c => c.ai.mode === 'police' && !c.dead);
      if (cr.filter(c => c.type === 'cop').length < want) this.spawnCruiser(false);
      if (G.wanted >= 4 && cr.filter(c => c.type === 'swat').length < G.wanted - 3) this.spawnCruiser(true);
      if (G.wanted >= 4 && !this.heli) this.spawnHeli();
    }
    // cruisers & cops
    for (const c of G.cars) if (c.ai.mode === 'police') { c.age = c.age || 0; this.cruiserStep(c, dt); }
    for (const c of this.cops.slice()) this.copStep(c, dt);
    // despawn far empty cruisers
    for (const c of G.cars) if (c.ai.mode === 'police' && G.wanted === 0 && dist(c.x, c.z, P.x, P.z) > 150) c.wreckGone = true;
    if (this.heli) this.heliStep(dt);
    // siren audio
    let sv = 0; for (const c of G.cars) if (c.sirenOn && !c.dead) sv = Math.max(sv, 1 - dist(c.x, c.z, P.x, P.z) / 150); G.sirenVol = clamp(sv, 0, 1);
  },
  spawnHeli() {
    const grp = new T.Group(), gb = new GB(); gb.box(-1.2, -.8, -3, 1.2, 1, 2.2, 0x1a2540); gb.box(-.3, -.3, 2.2, .3, .5, 8, 0x1a2540); gb.box(-1, -1, -1, 1, -.8, 1, 0x0e1428);
    const body = gb.build(new T.MeshLambertMaterial({ vertexColors: true }), true), rot = new T.Mesh(new T.BoxGeometry(11, 0.06, 0.35), new T.MeshLambertMaterial({ color: 0x111111 })); rot.position.y = 1.2; grp.add(body); grp.add(rot);
    const spot = new T.SpotLight(0xffffff, 0, 90, 0.18, 0.5); spot.position.set(0, 0, 0); grp.add(spot); grp.add(spot.target); spot.target.position.set(0, -30, 6);
    World.scene.add(grp); this.heli = { grp, rot, x: P.x + 80, y: 38, z: P.z, ang: 0, hp: 260, alive: true, shootT: 2, spot };
  },
  heliStep(dt) {
    const h = this.heli; if (!h.alive) { h.y -= 20 * dt; h.grp.rotation.y += 4 * dt; if (h.y <= 1) { fxExplosion(h.x, 1, h.z); World.scene.remove(h.grp); this.heli = null; } else { h.grp.position.set(h.x, h.y, h.z); } return; }
    if (G.wanted < 3) { h.y += 6 * dt; if (h.y > 140) { World.scene.remove(h.grp); this.heli = null; return; } }
    h.ang += dt * 0.35; const tx = P.x + Math.cos(h.ang) * 24, tz = P.z + Math.sin(h.ang) * 24; h.x += (tx - h.x) * Math.min(1, dt * 1.4); h.z += (tz - h.z) * Math.min(1, dt * 1.4); h.y = lerp(h.y, 34, Math.min(1, dt));
    h.grp.position.set(h.x, h.y, h.z); h.grp.rotation.y = Math.atan2(P.x - h.x, P.z - h.z) + Math.PI; h.rot.rotation.y += dt * 40;
    h.spot.intensity = G.night > 0.3 ? 4 : 0; h.spot.target.position.set(P.x - h.x, -h.y, P.z - h.z); h.grp.updateMatrixWorld();
    h.shootT -= dt; if (h.shootT <= 0 && G.wanted >= 4 && !P.dead) { h.shootT = rr(0.9, 1.6); const clear = rayHitSolid(h.x, h.y, h.z, P.x, 1.2, P.z) < 0; if (clear && !P.hostage) { Snd.shot('rifle', 0.4); NPCs.addTracer(h.x, h.y, h.z, P.x, 1, P.z); if (chance(0.3)) P.hurt(rr(4, 7), 'bullet'); } }
  },
};
