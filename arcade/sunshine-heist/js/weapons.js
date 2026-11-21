'use strict';
// ===== Projectiles (grenades, molotovs, rockets), explosions and fire =====
const Proj = {
  list: [], fires: [], geos: null,
  init() {
    this.geos = {
      grenade: new T.SphereGeometry(0.11, 8, 6), bottle: new T.CylinderGeometry(0.06, 0.08, 0.3, 8), rocket: new T.CylinderGeometry(0.09, 0.09, 0.9, 8), nose: new T.ConeGeometry(0.09, 0.25, 8),
    };
    this.mats = { grenade: new T.MeshLambertMaterial({ color: 0x3d5a2a }), bottle: new T.MeshLambertMaterial({ color: 0x7ec06a, transparent: true, opacity: 0.8 }), rocket: new T.MeshLambertMaterial({ color: 0x555a60 }), nose: new T.MeshLambertMaterial({ color: 0xc0392b }), wick: new T.MeshBasicMaterial({ color: 0xffa030 }) };
  },
  mesh(kind) {
    const g = new T.Group();
    if (kind === 'grenade') g.add(new T.Mesh(this.geos.grenade, this.mats.grenade));
    else if (kind === 'molotov') { g.add(new T.Mesh(this.geos.bottle, this.mats.bottle)); const w = new T.Mesh(new T.SphereGeometry(0.06, 6, 4), this.mats.wick); w.position.y = 0.2; g.add(w); }
    else { const b = new T.Mesh(this.geos.rocket, this.mats.rocket); b.rotation.x = Math.PI / 2; g.add(b); const n = new T.Mesh(this.geos.nose, this.mats.nose); n.rotation.x = Math.PI / 2; n.position.z = 0.55; g.add(n); }
    World.scene.add(g); return g;
  },
  aimPoint(range) { const cp = P.camPos, cd = P.aimDir, h = castRay(cp.x, cp.y, cp.z, cd.x, cd.y, cd.z, range, P.actor, P.hostage); return { x: cp.x + cd.x * h.t, y: cp.y + cd.y * h.t, z: cp.z + cd.z * h.t }; },
  throwItem(w) {
    const a = P.ammo[P.cur]; if (!a || a.mag <= 0) { UI.msg('Out of ' + w.name + 's — pawn shops sell more', 1500); return; } a.mag--;
    const fx = Math.sin(P.face), fz = Math.cos(P.face), mx = P.x + fx * 0.5, my = P.y + 1.6, mz = P.z + fz * 0.5, t = this.aimPoint(60);
    let dx = t.x - mx, dy = t.y - my, dz = t.z - mz; const d = Math.hypot(dx, dy, dz) || 1; dx /= d; dy /= d; dz /= d; const sp = clamp(10 + d * 0.55, 12, 26);
    this.list.push({ kind: w.id, x: mx, y: my, z: mz, vx: dx * sp, vy: dy * sp + 4.2, vz: dz * sp, t: 0, fuse: 2.4, mesh: this.mesh(w.id), src: 'player' }); P.actor.pose.punch = 0.3; P.actor.pose.swing = 1;
    Snd.burst(0.1, 700, 1, 0.3, 'lowpass'); NPCs.alarm(P.x, P.z, 30, 'player'); if (w.id === 'molotov') Crime.raise(2, P.x, P.z, 'Arson'); else Crime.raise(2, P.x, P.z, 'Explosives');
  },
  fireRocket(w) {
    const a = P.ammo[P.cur]; if (!a || a.mag <= 0) { if (a && a.res > 0) P.reload(); else UI.msg('Out of rockets', 1200); return; } a.mag--;
    const fx = Math.sin(P.face), fz = Math.cos(P.face), mx = P.x + fx * 0.8, my = P.y + 1.4, mz = P.z + fz * 0.8, t = this.aimPoint(300);
    let dx = t.x - mx, dy = t.y - my, dz = t.z - mz; const d = Math.hypot(dx, dy, dz) || 1; dx /= d; dy /= d; dz /= d;
    const m = this.mesh('rocket'); m.rotation.y = Math.atan2(dx, dz); m.rotation.x = -Math.asin(dy);
    this.list.push({ kind: 'rocket', x: mx, y: my, z: mz, vx: dx * 62, vy: dy * 62, vz: dz * 62, t: 0, mesh: m, src: 'player' }); Snd.burst(0.6, 500, 0.6, 1.0, 'bandpass', 0.2); Snd.tone(90, 0.4, 0.4, 'sawtooth', 0.4); G.shake = Math.max(G.shake, 0.35);
    for (let i = 0; i < 14; i++) FX.emit(mx - dx * 0.6, my, mz - dz * 0.6, rr(-1, 1) - dx * 3, rr(-.5, 1), rr(-1, 1) - dz * 3, rr(.4, .9), 0.9, .8, .78, .75, 0, 2);
    NPCs.alarm(P.x, P.z, 110, 'player'); Police.heardShot(P.x, P.z, 110); if (a.mag === 0 && a.res > 0) setTimeout(() => P.reload(), 400);
  },
  hitTest(p, dt) { // sweep from old to new position, report first contact
    const sp = Math.hypot(p.vx, p.vy, p.vz) * dt; if (sp < 1e-4) return null; const ux = p.vx / (sp / dt), uy = p.vy / (sp / dt), uz = p.vz / (sp / dt);
    const h = castRay(p.x, p.y, p.z, ux, uy, uz, sp + 0.15, P.actor, null); return h.type === 'none' ? null : h;
  },
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i]; p.t += dt;
      if (p.kind === 'rocket') {
        const h = this.hitTest(p, dt); p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.mesh.position.set(p.x, p.y, p.z);
        FX.emit(p.x, p.y, p.z, rr(-.3, .3), rr(-.3, .3), rr(-.3, .3), rr(.5, 1), 0.7, .75, .75, .75, 0, 2.5); FX.emit(p.x, p.y, p.z, 0, 0, 0, .12, .5, 1, .7, .2);
        if (h || p.t > 5 || p.y < 0) { Combat.explosion(p.x, Math.max(0.6, p.y), p.z, 13, 220, 'player'); World.scene.remove(p.mesh); this.list.splice(i, 1); }
        continue;
      }
      // ballistic: grenade / molotov
      const ox = p.x, oy = p.y, oz = p.z; p.vy -= 17 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; let hit = false;
      if (p.y < 0.12) { p.y = 0.12; if (Math.abs(p.vy) > 2.5) Snd.tone(900, 0.04, 0.06, 'square'); p.vy *= -0.38; p.vx *= 0.6; p.vz *= 0.6; hit = true; }
      forSolids(p.x, p.z, 0.3, s => { if (p.y < s.h && p.x > s.x0 - 0.1 && p.x < s.x1 + 0.1 && p.z > s.z0 - 0.1 && p.z < s.z1 + 0.1) { if (ox <= s.x0 || ox >= s.x1) p.vx *= -0.4; else p.vz *= -0.4; p.x = ox; p.z = oz; hit = true; } });
      for (const a of G.actives) { if (a === P.actor || !a.alive || a.state === 'dead') continue; if (Math.abs(a.x - p.x) < 0.5 && Math.abs(a.z - p.z) < 0.5 && p.y < 1.9) { hit = true; break; } }
      for (const c of G.cars) { const t = CAR_TYPES[c.type]; if (d2(c.x, c.z, p.x, p.z) < (t.len * 0.5) ** 2 && p.y < 1.6 && !c.wreck) { hit = true; break; } }
      p.mesh.position.set(p.x, p.y, p.z); p.mesh.rotation.x += dt * 9; p.mesh.rotation.z += dt * 6;
      if (p.kind === 'molotov') { fxFire(p.x, p.y, p.z); if (hit) { this.fires.push({ x: p.x, z: p.z, r: 5.5, t: 9, tick: 0 }); fxExplosion(p.x, 0.5, p.z); World.scene.remove(p.mesh); this.list.splice(i, 1); Snd.burst(0.5, 800, 0.5, 0.8, 'lowpass', 0.3); } }
      else if (p.t >= p.fuse) { Combat.explosion(p.x, p.y, p.z, 10, 160, 'player'); World.scene.remove(p.mesh); this.list.splice(i, 1); }
    }
    for (let i = this.fires.length - 1; i >= 0; i--) {
      const f = this.fires[i]; f.t -= dt; f.tick -= dt; for (let k = 0; k < 3; k++) { const a = rr(0, TAU), d = Math.sqrt(Math.random()) * f.r; fxFire(f.x + Math.cos(a) * d, 0.1, f.z + Math.sin(a) * d); if (Math.random() < 0.25) fxSmoke(f.x + Math.cos(a) * d, 1.2, f.z + Math.sin(a) * d, 0.2); }
      if (f.tick <= 0) { f.tick = 0.5; for (const a of G.actives) { if (!a.alive || a.immortal) continue; if (d2(a.x, a.z, f.x, f.z) < f.r * f.r) { Combat.hurt(a, 14, 'player', 'body', 'fire'); a.fear = 10; a.threat = { x: f.x, z: f.z }; fxBlood(a.x, 1, a.z, 2); } }
        for (const c of G.cars) if (d2(c.x, c.z, f.x, f.z) < (f.r + 2) ** 2) Vehicles.damage(c, 18, 'player'); if (!P.inCar && d2(P.x, P.z, f.x, f.z) < f.r * f.r) P.hurt(8, 'fire'); }
      if (f.t <= 0) this.fires.splice(i, 1);
    }
  },
};
Combat.explosion = function (x, y, z, r, dmg, src) {
  fxExplosion(x, y, z); G.shake = Math.max(G.shake, Math.min(1, 14 / (dist(x, z, P.x, P.z) + 6)));
  for (const a of G.actives) { if (!a.alive || a.immortal) continue; const d = dist(a.x, a.z, x, z); if (d < r) { const dm = dmg * (1 - d / r); Combat.hurt(a, dm, src, 'body', 'explosion'); a.vx = (a.x - x) / (d + 0.5) * 6; a.vz = (a.z - z) / (d + 0.5) * 6; fxBlood(a.x, 1, a.z, 4); } else if (d < r * 3 && a.kind === 'npc') { a.fear = 8; a.threat = { x, z }; if (a.state === 'sched') a.state = 'flee'; } }
  for (const c of G.cars) { const d = dist(c.x, c.z, x, z); if (d < r + 2) { c.vx += (c.x - x) / (d + 1) * 8; c.vz += (c.z - z) / (d + 1) * 8; c.sleep = false; Vehicles.damage(c, dmg * (1 - d / (r + 2)) * 1.3, src); } }
  if (!P.inCar && !P.dead) { const d = dist(P.x, P.z, x, z); if (d < r) P.hurt(dmg * 0.7 * (1 - d / r), 'explosion'); } else if (P.inCar && dist(P.x, P.z, x, z) < r * 0.6) P.hurt(dmg * 0.25, 'explosion');
  for (const o of G.shootables) if (dist(o.x, o.z, x, z) < r + 4) o.hurt(dmg * 0.6);
  if (src === 'player') Crime.force(Math.max(2, G.wanted), 'Explosion');
};
