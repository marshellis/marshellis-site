'use strict';
// ===== Player: movement, camera, driving, weapons, hostage taking, pickups, combat =====
const WEAPONS = {
  fists: { id: 'fists', name: 'Fists', melee: true, dmg: 16, rate: 0.42, range: 2.1 },
  bat: { id: 'bat', name: 'Baseball Bat', melee: true, dmg: 44, rate: 0.58, range: 2.5, len: 0.9, col: 0x8a5a2b, price: 120, kb: 7 },
  knife: { id: 'knife', name: 'Combat Knife', melee: true, dmg: 30, rate: 0.28, range: 1.9, len: 0.3, col: 0xcfd4da, price: 90, blade: true },
  machete: { id: 'machete', name: 'Machete', melee: true, dmg: 54, rate: 0.5, range: 2.3, len: 0.7, col: 0xcfd4da, price: 260, blade: true, kb: 3 },
  pistol: { id: 'pistol', name: 'M9 Pistol', dmg: 28, rate: 0.24, mag: 15, spread: 0.012, snd: 'pistol', len: 0.3, auto: false, price: 450, ammoPrice: 45, pack: 15, range: 110, firearm: true, noise: 55 },
  revolver: { id: 'revolver', name: '.357 Magnum', dmg: 62, rate: 0.62, mag: 6, spread: 0.008, snd: 'revolver', len: 0.36, auto: false, price: 950, ammoPrice: 70, pack: 12, range: 130, firearm: true, noise: 75 },
  smg: { id: 'smg', name: 'Micro SMG', dmg: 15, rate: 0.07, mag: 30, spread: 0.04, snd: 'smg', len: 0.42, auto: true, price: 1300, ammoPrice: 90, pack: 30, range: 90, firearm: true, noise: 65, two: true },
  shotgun: { id: 'shotgun', name: 'Pump Shotgun', dmg: 11, pellets: 9, rate: 0.85, mag: 6, spread: 0.075, snd: 'shotgun', len: 0.85, auto: false, price: 1000, ammoPrice: 60, pack: 12, range: 40, firearm: true, noise: 80, two: true },
  sawedoff: { id: 'sawedoff', name: 'Sawed-Off Shotgun', dmg: 14, pellets: 10, rate: 0.45, mag: 2, spread: 0.13, snd: 'shotgun', len: 0.5, auto: false, price: 700, ammoPrice: 45, pack: 8, range: 22, firearm: true, noise: 85 },
  rifle: { id: 'rifle', name: 'Assault Rifle', dmg: 31, rate: 0.11, mag: 30, spread: 0.014, snd: 'rifle', len: 0.9, auto: true, price: 2800, ammoPrice: 150, pack: 30, range: 160, firearm: true, noise: 90, two: true },
  ak47: { id: 'ak47', name: 'AK-47', dmg: 37, rate: 0.1, mag: 30, spread: 0.028, snd: 'rifle', len: 0.95, auto: true, price: 3400, ammoPrice: 170, pack: 30, range: 150, firearm: true, noise: 95, two: true, rare: true },
  sniper: { id: 'sniper', name: 'Sniper Rifle', dmg: 150, rate: 1.35, mag: 5, spread: 0.0012, snd: 'sniper', len: 1.15, auto: false, price: 5600, ammoPrice: 140, pack: 5, range: 450, firearm: true, noise: 110, two: true, scope: true, rare: true },
  grenade: { id: 'grenade', name: 'Frag Grenade', throwable: true, rate: 1.0, price: 120, ammoPrice: 120, pack: 1, len: 0.12, col: 0x3d5a2a },
  molotov: { id: 'molotov', name: 'Molotov Cocktail', throwable: true, rate: 1.0, price: 70, ammoPrice: 70, pack: 1, len: 0.2, col: 0x7ec06a },
  rpg: { id: 'rpg', name: 'RPG-7', rocket: true, dmg: 220, rate: 2.2, mag: 1, spread: 0, price: 8500, ammoPrice: 900, pack: 2, len: 1.0, firearm: true, noise: 110, two: true, rare: true, col: 0x3d4a3a },
};
const WORDER = ['fists', 'bat', 'knife', 'machete', 'pistol', 'revolver', 'smg', 'shotgun', 'sawedoff', 'rifle', 'ak47', 'sniper', 'grenade', 'molotov', 'rpg'];
const WGROUPS = [['fists', 'bat', 'knife', 'machete'], ['pistol', 'revolver'], ['smg', 'shotgun', 'sawedoff'], ['rifle', 'ak47', 'sniper'], ['grenade', 'molotov', 'rpg']];
const gunOf = w => (w.firearm || ((w.melee || w.throwable) && w.len)) ? { len: w.len, two: w.two, col: w.col, model: w.id, relax: w.id === 'bat' ? 0.85 : w.id === 'knife' ? 0.5 : w.id === 'machete' ? 0.6 : (w.throwable ? 0.2 : undefined) } : null;

const P = {
  x: 0, y: 0, z: 0, vx: 0, vz: 0, vy: 0, kx: 0, kz: 0, camYaw: 0, camPitch: 0.15, face: 0, hp: 100, armor: 0, dead: false, deadT: 0, inCar: false, car: null, hostage: null,
  weapons: { fists: true, pistol: true }, ammo: { pistol: { mag: 15, res: 45 } }, cur: 'pistol', lastShot: -9, reloadT: 0, aiming: false, aimingGun: false, shooting: 0, onGround: true,
  actor: null, camPos: new T.Vector3(), camDir: new T.Vector3(0, 0, -1), aimDir: new T.Vector3(0, 0, -1), aimPt: new T.Vector3(), _av: new T.Vector3(), mouseT: 0, lastHurt: -9, armed: false, arrestT: 0, stepT: 0, targetNPC: null, flash: null, fov: 65, walkAmt: 0, hold: 0, dmgFlash: 0,
  init() {
    this.actor = { kind: 'player', alive: true, x: 0, y: 0, z: 0, yaw: 0, look: makeLook('player'), pose: newPose(), gun: null, state: 'player', hp: 100 };
    G.actives.push(this.actor);
    this.flash = new T.PointLight(0xffc060, 0, 14); World.scene.add(this.flash);
  },
  get weapon() { return WEAPONS[this.cur]; },
  eye() { return this.y + 1.55; },
  aimMiss(n) { const dx = n.x - this.camPos.x, dy = (n.y || 0) + 1.2 - this.camPos.y, dz = n.z - this.camPos.z, f = dx * this.aimDir.x + dy * this.aimDir.y + dz * this.aimDir.z; if (f < 0) return 99; const d2_ = dx * dx + dy * dy + dz * dz; return Math.sqrt(Math.max(0, d2_ - f * f)); },
  canSee(n) { return this.aimMiss(n) < 2.6 && losClear(this.x, this.z, n.x, n.z, 1.4); },
  hurt(d, how) { if (this.rollT > 0.08 && how !== 'fire' && how !== 'crash') d *= 0.3;
    if (this.dead || G.invuln) return; if (this.armor > 0) { const a = Math.min(this.armor, d * 0.6); this.armor -= a; d -= a; }
    this.hp -= d; this.lastHurt = G.time; this.dmgFlash = Math.min(1, this.dmgFlash + d / 30);
    if (this.hp <= 0) this.die(how);
  },
  addCash(n) { G.cash += n; if (n > 0) { G.stats.earned += n; Snd.cash(); try { Extras.cashPop(n); } catch (e) { } } },
  die(how) {
    if (this.dead) return; this.dead = true; this.deadT = 0; this.hp = 0; if (this.inCar) this.ejectFromCar(true); this.releaseHostage(); UI.over('WASTED', how === 'explosion' ? 'Blown up.' : how === 'fire' ? 'Burned alive.' : 'The Florida sun sets on another criminal.');
    this.actor.pose.dead = 0;
  },
  respawn(kind) {
    this.scoped = false; this.actor.hidden = false;
    const nearest = l => l.length ? l.slice().sort((a, b) => d2(a.x, a.z, this.x, this.z) - d2(b.x, b.z, this.x, this.z))[0] : Shops.hospital, pos = kind === 'busted' ? nearest(Shops.polices) : nearest(Shops.hospitals);
    this.dead = false; this.hp = 100; this.armor = 0; this.x = pos.x; this.z = pos.z; this.y = 0; this.vx = this.vz = 0; this.actor.pose.dead = 0; G.wanted = 0; UI.over(null);
    const loss = kind === 'busted' ? Math.round(G.cash * 0.2) : Math.min(Math.round(G.cash * 0.1), 1500); G.cash -= loss; if (kind === 'busted') Story.onBusted(); UI.msg(kind === 'busted' ? `Busted! Fined ${money(loss)} and weapons confiscated.` : `Hospital bill: ${money(loss)}.`);
    if (kind === 'busted') { for (const k of WORDER) if (k !== 'fists') { delete this.weapons[k]; delete this.ammo[k]; } this.cur = 'fists'; this.actor.gun = null; }
    G.tod = (G.tod + (kind === 'busted' ? 180 : 360)) % 1440; for (const c of G.cars) if (c.ai.mode === 'police') c.keep = false; Police.clear(); this.camYaw = Math.PI;
  },
  // ---- vehicles
  tryEnter() {
    const c = Vehicles.nearest(this.x, this.z, 4.2); if (!c || c.wreck || c.dead) return false;
    if (c.driver && c.driver !== 'player') return false;
    const wasTraffic = c.ai.mode === 'traffic';
    if (wasTraffic) { // carjack
      const n = NPCs.make(pick(JOBS.filter(j => !j.armed)), 90000 + ((Math.random() * 9000) | 0)); n.ready = true; n.x = c.x + Math.cos(c.h) * 1.6; n.z = c.z - Math.sin(c.h) * 1.6; n.sx = n.x; n.sz = n.z; n.syaw = c.h; NPCs.activate(n); n.state = 'flee'; n.fear = 12; n.threat = { x: this.x, z: this.z }; n.pose.hands = 1; NPCs.say(n, pick(['Take it, take it!', 'My car!', 'Please don\'t hurt me!'])); NPCs.list.push(n);
      Crime.raise(1, c.x, c.z, 'Carjacking'); UI.msg('Carjacked a ' + CAR_TYPES[c.type].name); G.stats.carsStolen++;
    } else if (c.locked && !c.owned && !c.unlocked) { c.unlocked = true; Snd.burst(0.3, 3000, 2, 0.8, 'highpass'); c.alarm = chance(0.5) ? 8 : 0; if (c.alarm) { Snd.alarm(); Crime.raise(1, c.x, c.z, 'Car theft'); } UI.msg('Smashed the window'); G.stats.carsStolen++; c.stolen = true; }
    else if (!c.owned && !c.stolen) { c.stolen = true; G.stats.carsStolen++; if (chance(0.5)) Crime.raise(1, c.x, c.z, 'Car theft'); }
    c.stolen = c.stolen || !c.owned;
    this.releaseHostage(); this.actor.enterT = 1; this.inCar = true; this.car = c; c.driver = 'player'; c.ai = { mode: 'player' }; c.sleep = false; c.keep = true;
    if (c.spot) { c.spot.car = null; c.spot = null; } const i = G.actives.indexOf(this.actor); if (i >= 0) G.actives.splice(i, 1);
    UI.msg(`[${CAR_TYPES[c.type].name}] ` + (c.owned ? 'Your ride' : c.stolen ? 'Stolen — keep an eye out for cops' : '')); return true;
  },
  ejectFromCar(silent) {
    const c = this.car; if (!c) return; const side = 2.4; this.x = c.x + Math.cos(c.h) * side; this.z = c.z - Math.sin(c.h) * side; resolveCircle(this, 0.5, 0);
    if (!walkable(this.x, this.z) || landSD(this.x, this.z) < 0.5) {
      let found = false; for (let r = 3; r <= 22 && !found; r += 2) for (let k = 0; k < 16; k++) { const a = k / 16 * TAU, x = c.x + Math.cos(a) * r, z = c.z + Math.sin(a) * r; if (landSD(x, z) > 0.8 || (onPier(x, z) && walkable(x, z))) { this.x = x; this.z = z; found = true; break; } }
      if (!found) { if (CAR_TYPES[c.type].water && !silent) { UI.msg('No dock nearby — stay aboard', 1500); return; } this.x = c.x; this.z = c.z; }
    }
    this.actor.drive = null; this.actor.y = 0; this.actor.pose.walk = 0; this.actor.pose.crouch = 0; this.inCar = false; this.car = null; c.driver = null; c.ai = { mode: 'abandoned' }; c.sleep = false; this.vx = c.vx * 0.5; this.vz = c.vz * 0.5; this.y = 0; c.keep = !!c.owned; c.sirenOn = false;
    if (!G.actives.includes(this.actor)) G.actives.push(this.actor); Pawn.checkSellPrompt = null;
  },
  // ---- hostage
  grab() {
    if (this.hostage) { this.releaseHostage(); UI.msg('You let the hostage go'); return; }
    let best = null, bd = 2.9 * 2.9; for (const n of G.actives) { if (n.kind !== 'npc' || !n.alive || n.state === 'hostage') continue; const dd = d2(n.x, n.z, this.x, this.z); if (dd < bd) { bd = dd; best = n; } }
    if (!best) { UI.msg('Get close to someone to grab them'); return; }
    this.hostage = best; best.state = 'hostage'; best.fear = 0; best.pose.hands = 0.6; best.shop && (best.shop.robbing === best && (best.shop.robbing = null)); NPCs.say(best, pick(['Please let me go!', 'Oh God, oh God...', 'I have a family!']), 3);
    G.stats.hostages++; Crime.raise(3, best.x, best.z, 'Kidnapping'); UI.msg('Hostage taken. Cops will hesitate to shoot.', 3000);
  },
  releaseHostage() {
    const h = this.hostage; if (!h) return; this.hostage = null; if (h.story) { h.state = 'story'; h.pose.hands = 0; return; } if (h.alive) { h.state = 'flee'; h.fear = 10; h.threat = { x: this.x, z: this.z }; h.pose.hands = 0; NPCs.say(h, pick(['Thank you, thank you!', 'RUN!!'])); }
  },
  // ---- weapons
  giveWeapon(id, ammoMags = 2) { this.weapons[id] = true; const w = WEAPONS[id]; if (w.throwable) { const a = this.ammo[id] = this.ammo[id] || { mag: 0, res: 0 }; a.mag += w.pack * ammoMags; } else if (w.firearm) { const a = this.ammo[id] = this.ammo[id] || { mag: 0, res: 0 }; if (a.mag === 0) { a.mag = w.mag; a.res += w.pack * (ammoMags - 1); } else a.res += w.pack * ammoMags; } },
  select(id) { if (!this.weapons[id] || this.cur === id) return; this.cur = id; this.reloadT = 0; this.actor.pose.draw = 1; const w = WEAPONS[id]; this.actor.gun = gunOf(w); Snd.tone(300, 0.05, 0.1, 'square'); UI.msg(w.name, 900); },
  reload() { const w = this.weapon; if (!w.firearm || this.reloadT > 0) return; const a = this.ammo[this.cur]; if (!a || a.mag >= w.mag || a.res <= 0) return; this.reloadT = this.reloadDur = this.cur === 'shotgun' ? 1.7 : w.rocket ? 2.4 : w.scope ? 1.8 : this.cur === 'sawedoff' ? 1.2 : 1.15; Snd.reloadSeq(this.cur, this.reloadDur); },
  fire() {
    const w = this.weapon, now = G.time; if (now - this.lastShot < w.rate || this.reloadT > 0) return; this.lastShot = now; this.shooting = 0.35; this.computeAim();
    if (w.melee) return this.punch();
    if (w.throwable) return Proj.throwItem(w);
    if (w.rocket) return Proj.fireRocket(w);
    const a = this.ammo[this.cur]; if (!a || a.mag <= 0) { if (a && a.res > 0) this.reload(); else { Snd.tone(150, 0.04, 0.1, 'square'); UI.msg('Out of ammo — visit a pawn shop', 1200); } return; }
    a.mag--;
    const cp = this.camPos, cd = this.aimDir; const aim = castRay(cp.x, cp.y, cp.z, cd.x, cd.y, cd.z, 250, this.actor, this.hostage);
    const tx = cp.x + cd.x * aim.t, ty = cp.y + cd.y * aim.t, tz = cp.z + cd.z * aim.t;
    const fx = Math.sin(this.face), fz = Math.cos(this.face), mzv = this.actor._mz; let mx = this.x + fx * 0.55, my = this.y + 1.38, mz = this.z + fz * 0.55; if (mzv && this.actor.gun) { mx = mzv.x; my = mzv.y; mz = mzv.z; }
    let dx = tx - mx, dy = ty - my, dz = tz - mz; const dl = Math.hypot(dx, dy, dz) || 1; dx /= dl; dy /= dl; dz /= dl;
    const pellets = w.pellets || 1, spread = w.spread * (this.aiming ? 0.5 : 1) * (1 + Math.hypot(this.vx, this.vz) * 0.08);
    let hitHuman = false;
    for (let k = 0; k < pellets; k++) {
      const sx = dx + rr(-spread, spread), sy = dy + rr(-spread, spread), sz = dz + rr(-spread, spread), sl = Math.hypot(sx, sy, sz), ux = sx / sl, uy = sy / sl, uz = sz / sl;
      const hit = castRay(mx, my, mz, ux, uy, uz, w.range, this.actor, this.hostage), ex = mx + ux * hit.t, ey = my + uy * hit.t, ez = mz + uz * hit.t;
      if (k < 3 || pellets === 1) NPCs.addTracer(mx, my, mz, ex, ey, ez);
      if (hit.type === 'human') { const part = hit.part, mult = part === 'head' ? 3 : part === 'legs' ? 0.7 : 1; Combat.hurt(hit.actor, w.dmg * mult * (hit.t > w.range * 0.6 ? 0.7 : 1), 'player', part, 'bullet'); fxBlood(ex, ey, ez, 5); hitHuman = true; Extras.hit(!hit.actor.alive); }
      else if (hit.type === 'obj') { hit.obj.hurt(w.dmg); fxSpark(ex, ey, ez, 4); Extras.hit(false, true); }
      else if (hit.type === 'car') { Extras.hit(false, true); Vehicles.damage(hit.car, w.dmg * 0.7, 'player'); fxSpark(ex, ey, ez, 5); if (hit.car.ai.mode === 'traffic') hit.car.ai.panic = 8; }
      else { fxSpark(ex, ey, ez, 3); fxDust(ex, ey, ez, 2); if (k < 3) { const nm = surfaceNormal(ex, ey, ez); Guns.decal(ex, ey, ez, nm[0], nm[1], nm[2], pellets > 1 ? 0.7 : 1); } }
    }
    Guns.flash(this.actor, pellets > 1 ? 1.6 : w.id === 'sniper' ? 1.8 : w.id === 'pistol' ? 0.8 : 1.1); if (w.id !== 'sniper' && w.id !== 'shotgun') Guns.eject(this.actor); else setTimeout(() => Guns.eject(this.actor), w.id === 'sniper' ? 650 : 350);
    if (w.id === 'shotgun' || w.id === 'sniper') setTimeout(() => Snd.pump(w.id), w.id === 'sniper' ? 550 : 330);
    this.actor.pose.recoil = 1; Snd.shot(w.snd); this.flash.position.set(mx, my, mz); this.flash.intensity = 3; this.camPitch += 0.006 * (pellets > 1 ? 3 : 1); G.shake = Math.max(G.shake, w.id === 'shotgun' ? 0.25 : 0.06);
    FX.emit(mx + dx * 0.4, my, mz + dz * 0.4, 0, 0.3, 0, 0.06, 0.5, 1, 0.8, 0.4);
    NPCs.alarm(this.x, this.z, w.noise, 'player'); Police.heardShot(this.x, this.z, w.noise);
    if (this.hostage && Police.copsNear(this.x, this.z, 30)) { /* shooting near cops with a hostage escalates */ }
    if (a.mag === 0 && a.res > 0) setTimeout(() => this.reload(), 250);
  },
  punch() {
    this.shooting = 0.3; let best = null, bd = 1e9; const w0 = this.weapon, fx = Math.sin(this.face), fz = Math.cos(this.face);
    for (const n of G.actives) { if (n === this.actor || !n.alive || n === this.hostage) continue; const dx = n.x - this.x, dz = n.z - this.z, d = Math.hypot(dx, dz); if (d < (w0.range || 2.1) + 0.2 && (dx * fx + dz * fz) / d > 0.4 && d < bd) { bd = d; best = n; } }
    Snd.burst(0.08, 500, 1, 0.3, 'lowpass'); this.actor.pose.punch = 0.25; this.actor.pose.swing = 1; this.actor.pose.swingSide = this.cur === 'fists' ? -(this.actor.pose.swingSide || 1) : 1;
    if (best) { Combat.hurt(best, w0.dmg, 'player', 'body', 'fist'); best.vx = fx * (w0.kb || 4); best.vz = fz * (w0.kb || 4); Snd.thud(0.6); fxBlood(best.x, 1.4, best.z, w0.blade ? 7 : 3); if (best.kind === 'npc' && best.alive) { best.fear = 14; best.threat = { x: this.x, z: this.z }; if (best.armed) { best.state = 'fight'; best.fightT = 20; best.gun = best.gun || { len: .3 }; } else best.state = 'flee'; } }
  },
  // ---- main update
  update(dt) {
    const I = Input;
    if (Cut.on) { this.actor.x = this.x; this.actor.z = this.z; this.actor.y = this.y; this.actor.yaw = this.face; return; }
    if (this.dead) { this.deadT += dt; this.actor.pose.dead = Math.min(1, this.actor.pose.dead + dt * 3); if (this.deadT > 3.6 && (I.pressed('Space') || I.pressed('Enter') || this.deadT > 5.5)) this.respawn('hospital'); this.cameraUpdate(dt); return; }
    // look
    const sens = 0.0024; if (I.mdx || I.mdy) { this.mouseT = G.time; }
    this.camYaw -= I.mdx * sens; this.camPitch = clamp(this.camPitch - I.mdy * sens, -0.85, 1.1);
    if (I.held('ArrowLeft')) this.camYaw += 1.8 * dt; if (I.held('ArrowRight')) this.camYaw -= 1.8 * dt; if (I.held('ArrowUp')) this.camPitch = clamp(this.camPitch + dt, -.85, 1.1); if (I.held('ArrowDown')) this.camPitch = clamp(this.camPitch - dt, -.85, 1.1);
    if (!I.locked && I.mIn && !G.modal && !G.paused && !this.inCar) { const e0 = 0.05, pan = v => v < e0 ? -(1 - v / e0) : v > 1 - e0 ? (v - (1 - e0)) / e0 : 0, ex = pan(I.mx / innerWidth), ey = pan(I.my / innerHeight); if (ex || ey) { this.camYaw -= ex * 1.9 * dt; this.camPitch = clamp(this.camPitch - ey * 1.2 * dt, -0.85, 1.1); this.mouseT = G.time; } } // free cursor: push the pointer to a screen edge to turn the camera
    if (this.dmgFlash > 0) this.dmgFlash -= dt * 1.5;
    if (G.time - this.lastHurt > 10 && this.hp < 60) this.hp = Math.min(60, this.hp + dt * 1.5);
    if (this.flash.intensity > 0) this.flash.intensity = Math.max(0, this.flash.intensity - dt * 40);
    if (this.shooting > 0) this.shooting -= dt; if (this.reloadT > 0) { this.reloadT -= dt; if (this.reloadT <= 0) { const w = this.weapon, a = this.ammo[this.cur]; if (a) { const need = w.mag - a.mag, take = Math.min(need, a.res); a.mag += take; a.res -= take; } } }
    // weapon select
    ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'].forEach((k, i) => { if (I.pressed(k)) { const g = WGROUPS[i].filter(x => this.weapons[x]); if (g.length) { const at = g.indexOf(this.cur); this.select(g[(at + 1) % g.length]); } } });
    if (I.wheel && !this.inCar) { const own = WORDER.filter(k => this.weapons[k]), i = own.indexOf(this.cur); this.select(own[(i + I.wheel + own.length * 4) % own.length]); }
    if (I.pressed('KeyQ') && !this.inCar) { const own = WORDER.filter(k => this.weapons[k]), i = own.indexOf(this.cur); this.select(own[(i + 1) % own.length]); }
    if (I.pressed('KeyR')) this.reload();
    if (this.inCar) this.driveUpdate(dt); else this.footUpdate(dt);
    // sound & misc
    this.cameraUpdate(dt);
    this.actor.x = this.x; this.actor.y = this.y; this.actor.z = this.z; this.actor.yaw = this.face;
  },
  footUpdate(dt) {
    this.computeAim();
    const I = I_(), w = this.weapon; const f = { x: -Math.sin(this.camYaw), z: -Math.cos(this.camYaw) }, r = { x: Math.cos(this.camYaw), z: -Math.sin(this.camYaw) };
    const fi = (I.held('KeyW') ? 1 : 0) - (I.held('KeyS') ? 1 : 0), si = (I.held('KeyD') ? 1 : 0) - (I.held('KeyA') ? 1 : 0);
    let dx = f.x * fi + r.x * si, dz = f.z * fi + r.z * si; const dl = Math.hypot(dx, dz); if (dl > 0) { dx /= dl; dz /= dl; }
    this.aiming = I.m[2] && true; const wantShoot = I.m[0] || I.mdown[0]; this.armed = !!(w.firearm || w.throwable); this.aimingGun = (this.aiming || this.shooting > 0) && this.armed;
    let spd = I.held('ShiftLeft') || I.held('ShiftRight') ? 6.4 : 3.4; if (this.aiming) spd = 2.2; if (this.hostage) spd *= 0.72;
    const wantV = Math.hypot(dx * spd, dz * spd), curV = Math.hypot(this.vx, this.vz), k = Math.min(1, (wantV > curV + 0.1 ? 10 : (dl > 0 ? 13 : 17)) * dt); this.vx = lerp(this.vx, dx * spd, k); this.vz = lerp(this.vz, dz * spd, k); // weighty start, snappy stop
    // dive roll (C) — also triggered automatically by hard landings while moving
    this.rollCool = Math.max(0, (this.rollCool || 0) - dt); const pzr = this.actor.pose;
    if (!(this.rollT > 0) && I.pressed('KeyC') && this.y <= groundY(this.x, this.z) + 0.06 && !this.hostage && this.rollCool <= 0 && !G.modal) { this.rollDir = dl > 0 ? { x: dx, z: dz } : { x: Math.sin(this.face), z: Math.cos(this.face) }; this.rollT = 0.62; this.rollCool = 0.9; Snd.burst(0.14, 700, 1, 0.3, 'bandpass'); }
    if (this.rollT > 0) { this.rollT -= dt; const rp = clamp(1 - this.rollT / 0.62, 0, 1), rs = 7.8 * (1 - 0.38 * rp); this.vx = this.rollDir.x * rs; this.vz = this.rollDir.z * rs; this.face = Math.atan2(this.rollDir.x, this.rollDir.z); pzr.roll = rp; pzr.crouch = Math.sin(rp * Math.PI) * 1.0; this.aiming = false; this.aimingGun = false; if (this.rollT <= 0) { pzr.roll = 0; pzr.crouch = 0; } } else if (pzr.roll) pzr.roll = 0;
    this.x += (this.vx + this.kx) * dt; this.z += (this.vz + this.kz) * dt; this.kx *= 0.9; this.kz *= 0.9;
    const res = resolveCircle(this, 0.42, this.y); if (!walkable(this.x, this.z)) { this.x -= this.vx * dt; this.z -= this.vz * dt; }
    const gy = groundY(this.x, this.z); this.coy = this.y <= gy + 0.06 ? 0.1 : Math.max(0, (this.coy || 0) - dt); this.jb = I.pressed('Space') ? 0.13 : Math.max(0, (this.jb || 0) - dt); if (this.jb > 0 && this.coy > 0 && !(this.rollT > 0)) { this.vy = 6.2; this.jb = 0; this.coy = 0; } // jump buffer + coyote time
    this.vy -= 18 * dt; this.y += this.vy * dt; if (this.y <= gy) { { const lv = Math.hypot(this.vx, this.vz); if (this.vy < -9.5 && lv > 2.2 && !(this.rollT > 0)) { this.rollDir = { x: this.vx / lv, z: this.vz / lv }; this.rollT = 0.62; this.rollCool = 0.5; } else if (this.vy < -3) this._land = clamp(-this.vy / 9, 0.3, 1); } this.y = gy; this.vy = 0; }
    const sp = Math.hypot(this.vx, this.vz); this.walkAmt = sp;
    // face
    if (this.aiming || this.shooting > 0 || (wantShoot && this.armed)) { let ty = this.camYaw + Math.PI; if (!I.locked && !this.scoped && (this.armed || this.aiming)) { const ax = this.aimPt.x - this.x, az = this.aimPt.z - this.z; ty = Math.hypot(ax, az) > 1.2 ? Math.atan2(ax, az) : Math.atan2(this.aimDir.x, this.aimDir.z); } this.face = turnToward(this.face, ty, 14 * dt); }
    else if (sp > 0.4) this.face = turnToward(this.face, Math.atan2(this.vx, this.vz), 12 * dt);
    const pz = this.actor.pose; pz.reloadP = this.reloadT > 0 ? clamp(1 - this.reloadT / (this.reloadDur || 1.2), 0, 1) : undefined; pz.empty = !!(this.ammo[this.cur] && this.ammo[this.cur].mag === 0 && w.firearm); if (this._land) { pz.landT = this._land; this._land = 0; } pz.crouch = Math.max(0, pz.landT || 0) * 0.55; pz.anger = lerp(pz.anger || 0, this.aimingGun ? 0.35 : 0, 0.1); pz.walk = lerp(pz.walk, clamp(sp / 2.6, 0, 1.6), Math.min(1, 10 * dt)); pz.fwd = this.vx * Math.sin(this.face) + this.vz * Math.cos(this.face); pz.side = this.vx * Math.cos(this.face) - this.vz * Math.sin(this.face); pz.reloading = this.reloadT > 0; pz.reach = lerp(pz.reach || 0, (this.pickT || 0) > 0.02 ? 1 : 0, 0.2); stepPhase(pz, sp, dt);
    pz.aim = lerp(pz.aim, this.aimingGun ? 1 : 0, Math.min(1, 12 * dt)); pz.aimPitch = (!I.locked && !this.scoped && (this.armed || this.aiming)) ? clamp(Math.atan2(this.aimPt.y - (this.y + 1.4), Math.max(1.5, Math.hypot(this.aimPt.x - this.x, this.aimPt.z - this.z))), -0.9, 1.1) * 0.95 : this.camPitch * 0.9; pz.hands = 0;
    if (pz.punch > 0) { pz.punch -= dt; pz.aim = 1; }
    this.actor.gun = gunOf(w); this.actor.air = this.y > gy + 0.15;
    if (sp > 1 && this.y <= gy + 0.05) { this.stepT -= dt * sp * 0.4; if (this.stepT <= 0) { this.stepT = 1; Snd.step(); } }
    // shoot
    if (wantShoot && !(this.rollT > 0)) { if (w.melee || w.auto || I.mdown[0]) this.fire(); }
    // hostage follow
    if (this.hostage) { const h = this.hostage; if (!h.alive) this.hostage = null; else { const hx = Math.sin(this.face), hz = Math.cos(this.face); h.x = lerp(h.x, this.x + hx * 0.6 + hz * 0.1, 0.5); h.z = lerp(h.z, this.z + hz * 0.6 - hx * 0.1, 0.5); h.yaw = this.face; h.pose.hands = 0.55; h.pose.walk = pz.walk * 0.8; h.pose.struggle = lerp(h.pose.struggle || 0, 1, 0.1); h.pose.act = null; h.pose.actB = 0; h.pose.phase = pz.phase; resolveCircle(h, 0.35, 0); } }
    // interactions
    if (I.pressed('KeyF')) { if (!this.tryEnter()) UI.msg('No vehicle nearby', 900); }
    if (I.pressed('KeyG')) this.grab();
    this.prompt();
    // target info
    this.targetNPC = null; if (this.armed || this.aiming) { const h = castRay(this.camPos.x, this.camPos.y, this.camPos.z, this.aimDir.x, this.aimDir.y, this.aimDir.z, 40, this.actor, this.hostage); this.aimPt.set(this.camPos.x + this.aimDir.x * h.t, this.camPos.y + this.aimDir.y * h.t, this.camPos.z + this.aimDir.z * h.t); if (h.type === 'human' && h.actor.kind === 'npc') this.targetNPC = h.actor; this.crossHot = h.type === 'human'; }
    // arrest
    this.arrestT = Police.arrestCheck(dt);
  },
  driveUpdate(dt) {
    const I = Input, c = this.car; if (!c) return;
    const thr = (I.held('KeyW') ? 1 : 0) - (I.held('KeyS') ? 1 : 0), steer = (I.held('KeyD') ? 1 : 0) - (I.held('KeyA') ? 1 : 0);
    Vehicles.step(c, { thr, steer, hand: I.held('Space') }, dt);
    this.x = c.x; this.z = c.z; this.y = 0; this.vx = c.vx; this.vz = c.vz;
    if (I.pressed('KeyH')) { Snd.horn(); for (const n of G.actives) if (n.kind === 'npc' && n.state === 'sched' && dist(n.x, n.z, c.x, c.z) < 8) { NPCs.say(n, 'HEY!'); } }
    if (I.pressed('KeyF')) { this.ejectFromCar(); UI.msg('Exited vehicle', 800); }
    // drive-by: shoot from window with LMB (pistol/smg only)
    if (I.m[0] && this.weapon.firearm && (this.weapon.id === 'pistol' || this.weapon.id === 'smg')) this.fire();
    c.lightsOn = G.night > 0.4; this.aimingGun = false; this.prompt();
    if (c.alarm > 0) { c.alarm -= dt; }
    this.actor.pose.aim = 0; this.walkAmt = 0;
  },
  prompt() {
    let text = null;
    if (!this.inCar) {
      const c = Vehicles.nearest(this.x, this.z, 3.6); if (c && !c.wreck && !c.dead && !this.hostage) { text = `<kbd>F</kbd> ${c.ai.mode === 'traffic' ? 'Carjack' : c.owned ? 'Enter your' : c.locked ? 'Break into' : 'Enter'} ${CAR_TYPES[c.type].name}`; }
      if (!this.hostage) { let near = false; for (const n of G.actives) { if (n.kind === 'npc' && n.alive && n.state !== 'hostage' && d2(n.x, n.z, this.x, this.z) < 7) { near = true; break; } } if (near && !text) text = '<kbd>G</kbd> Grab hostage'; }
      else text = '<kbd>G</kbd> Release hostage';
    }
    this.pickTarget = null;
    if (!this.inCar && !this.hostage && !this.aimingGun) {
      let best = null, bd = 2.6 * 2.6; for (const n of G.actives) { if (n.kind !== 'npc' || !n.alive || n.story || n.fixed || (n.state !== 'sched' && n.state !== 'return')) continue; const dd = d2(n.x, n.z, this.x, this.z); if (dd < bd) { bd = dd; best = n; } }
      if (best) { const fx = Math.sin(best.yaw), fz = Math.cos(best.yaw), tx = this.x - best.x, tz = this.z - best.z, l = Math.hypot(tx, tz) || 1; best._behind = (fx * tx + fz * tz) / l < -0.2; this.pickTarget = best; const ex = best._behind && !best.picked ? '<kbd>Hold E</kbd> Pickpocket · <kbd>T</kbd> Talk' : '<kbd>T</kbd> Talk'; text = text ? text + ' · <kbd>T</kbd> Talk' : ex; }
    }
    const sp = Shops.prompt() || Extras.prompt(); if (sp) { text = sp.text; if (Input.pressed('KeyE') && sp.act) sp.act(); }
    G.prompt = text;
    const n = this.pickTarget;
    if (Input.held('KeyE') && n && !n.picked && !sp && !G.modal && !this.dead) {
      this.pickT = (this.pickT || 0) + G.dt / 1.1; G.progress = { label: 'PICKPOCKETING', frac: this.pickT };
      if (this.pickT >= 1) { this.pickT = 0; n.picked = true; if (Math.random() < (n._behind ? 0.82 : 0.28)) { const c = n.cash; n.cash = 0; this.addCash(c); UI.msg('Lifted ' + money(c) + ' from ' + n.name, 2000); if (chance(0.2)) { const it = pick(LOOT_ITEMS); G.inv.push({ n: it.n, v: it.v }); UI.msg('Also lifted: ' + it.n); } } else { NPCs.say(n, 'HEY! THIEF!', 3); NPCs.scare(n, this.x, this.z, 10); Crime.raise(1, n.x, n.z, 'Pickpocketing'); } }
    } else this.pickT = 0;
    if (Input.pressed('KeyT') && n && !this.inCar) NPCs.talk(n);
  },
  // aim ray: through the mouse cursor when the pointer isn't locked, else straight down the crosshair (screen centre)
  computeAim() {
    const cam = G.camera; this.aimDir.copy(this.camDir);
    if (!Input.locked && !this.scoped && !G.modal && (this.armed || this.aiming)) { const rc = (this._cv || (this._cv = document.getElementById('c'))).getBoundingClientRect(); if (rc.width > 0) { cam.updateMatrixWorld(); this._av.set(((Input.mx - rc.left) / rc.width) * 2 - 1, -(((Input.my - rc.top) / rc.height) * 2 - 1), 0.5).unproject(cam).sub(cam.position).normalize(); this.aimDir.copy(this._av); } }
  },
  cameraUpdate(dt) {
    const cam = G.camera, I = Input; let dist_, off, fov, ty, tx = this.x, tz = this.z;
    if (this.inCar && this.car) {
      const c = this.car, sp = Math.hypot(c.vx, c.vz); dist_ = 7.6 + sp * 0.07; off = 0; fov = 62 + sp * 0.25; ty = 1.5;
      if (G.time - this.mouseT > 1.4 && sp > 3) { const target = c.h + Math.PI; this.camYaw += angDiff(this.camYaw, target) * Math.min(1, 2.2 * dt); }
      tx = c.x; tz = c.z;
    } else { const ad = this.aiming && this.armed, sc = ad && this.weapon.scope; dist_ = sc ? 0.3 : ad ? 2.3 : 4.3; off = sc ? -0.1 : ad ? -0.62 : -0.3; /* camera sits over the gun-hand shoulder so the weapon stays in frame */ fov = sc ? 13 : ad ? 50 : 65 + (!ad && Math.hypot(this.vx, this.vz) > 5.2 ? 7 : 0); ty = this.y + 1.55; this.scoped = !!sc; this.actor.hidden = !!sc; }
    { const kf = 1 - Math.exp(-(this.inCar ? 15 : 24) * dt), cf = this._cf; if (!cf || Math.hypot(tx - cf.x, tz - cf.z) > 7) this._cf = { x: tx, y: ty, z: tz }; else { cf.x += (tx - cf.x) * kf; cf.z += (tz - cf.z) * kf; cf.y += (ty - cf.y) * (1 - Math.exp(-9 * dt)); } tx = this._cf.x; tz = this._cf.z; ty = this._cf.y; } // damped follow (snaps on teleports)
    this.fov = lerp(this.fov, fov, Math.min(1, 6 * dt)); this.dist = lerp(this.dist || dist_, dist_, Math.min(1, 8 * dt)); this.off = lerp(this.off == null ? off : this.off, off, Math.min(1, 8 * dt));
    const cp = Math.cos(this.camPitch), sp_ = Math.sin(this.camPitch), fx = -Math.sin(this.camYaw) * cp, fz = -Math.cos(this.camYaw) * cp, fy = sp_;
    const rx = Math.cos(this.camYaw), rz = -Math.sin(this.camYaw);
    const sx = tx + rx * this.off, sz = tz + rz * this.off, sy = ty;
    let wx = sx - fx * this.dist, wy = sy - fy * this.dist + 0.2, wz = sz - fz * this.dist; if (wy < 0.4) wy = 0.4; if (!this.inCar && !this.aiming) wy += Math.sin((this.actor.pose.phase || 0) * 2) * 0.016 * clamp((this.walkAmt || 0) / 6, 0, 1);
    const hit = rayHitSolid(sx, sy, sz, wx, wy, wz); if (hit >= 0) { const t = Math.max(0.12, hit - 0.08); wx = sx + (wx - sx) * t; wy = sy + (wy - sy) * t; wz = sz + (wz - sz) * t; }
    if (G.shake > 0) { wx += rr(-1, 1) * G.shake * 0.25; wy += rr(-1, 1) * G.shake * 0.25; G.shake = Math.max(0, G.shake - dt * 1.4); }
    cam.position.set(wx, wy, wz); this.camPos.set(wx, wy, wz); const l = Math.hypot(fx, fy, fz); this.camDir.set(fx / l, fy / l, fz / l);
    cam.lookAt(wx + fx, wy + fy, wz + fz); { let rt = 0; if (this.inCar && this.car) { const c = this.car, sp2 = Math.hypot(c.vx, c.vz); rt = sp2 > 3 ? clamp(-(c.vx * Math.cos(c.h) - c.vz * Math.sin(c.h)) * 0.007, -0.05, 0.05) : 0; } this.camRoll = lerp(this.camRoll || 0, rt, Math.min(1, 5 * dt)); if (Math.abs(this.camRoll) > 0.0005) cam.rotateZ(this.camRoll); } if (Math.abs(cam.fov - this.fov) > 0.05) { cam.fov = this.fov; cam.updateProjectionMatrix(); }
    this.computeAim();
    G.camFwd = { x: Math.sin(this.camYaw + Math.PI), z: Math.cos(this.camYaw + Math.PI) };
  },
};
function I_() { return Input; }

// ---- ray casting against everything
function castRay(ox, oy, oz, dx, dy, dz, range, skip, skip2) {
  let best = { t: range, type: 'none' };
  if (dy < -1e-4) { const t = (0.05 - oy) / dy; if (t > 0 && t < best.t) best = { t, type: 'ground' }; }
  const th = rayHitSolid(ox, oy, oz, ox + dx * range, oy + dy * range, oz + dz * range); if (th >= 0 && th * range < best.t) best = { t: th * range, type: 'solid' };
  const hh = rayHumans(ox, oy, oz, dx, dy, dz, best.t, skip); if (hh && hh.actor !== skip2 && hh.t < best.t) best = { t: hh.t, type: 'human', actor: hh.actor, part: hh.part };
  for (const o of G.shootables) { const lx = o.x - ox, ly = o.y - oy, lz = o.z - oz, tc = lx * dx + ly * dy + lz * dz; if (tc < 0 || tc > best.t) continue; const dd = lx * lx + ly * ly + lz * lz - tc * tc; if (dd > o.r * o.r) continue; const t = tc - Math.sqrt(o.r * o.r - dd); if (t >= 0 && t < best.t) best = { t, type: 'obj', obj: o }; }
  for (const c of G.cars) {
    if (c === P.car) continue; const tp = CAR_TYPES[c.type], ex = ox - c.x, ez = oz - c.z; if (ex * ex + ez * ez > (range + 8) * (range + 8)) continue;
    const s = Math.sin(c.h), co = Math.cos(c.h), lx = ex * co - ez * s, lz = ex * s + ez * co, ldx = dx * co - dz * s, ldz = dx * s + dz * co;
    let t0 = 0, t1 = best.t; const slab = (o, d, mn, mx) => { if (Math.abs(d) < 1e-7) return o >= mn && o <= mx; let a = (mn - o) / d, b = (mx - o) / d; if (a > b) { const q = a; a = b; b = q; } t0 = Math.max(t0, a); t1 = Math.min(t1, b); return t0 <= t1; };
    if (slab(lx, ldx, -tp.w / 2, tp.w / 2) && slab(oy - 0.06, dy, 0.3, 1.55) && slab(lz, ldz, -tp.len / 2, tp.len / 2) && t0 < best.t) best = { t: t0, type: 'car', car: c };
  }
  return best;
}

// ---- combat resolution
const Combat = {
  hurt(a, dmg, src, part, how) {
    if (!a.alive || a.immortal) return; if (a.kind === 'player') { P.hurt(dmg, how); return; }
    a.hp -= dmg; a.lastHow = how; a.hurtT = G.time; if (a.pose && dmg > 3) { a.pose.hit = 1; const dx = a.x - P.x, dz = a.z - P.z, l = Math.hypot(dx, dz) || 1, fx = Math.sin(a.yaw), fz = Math.cos(a.yaw); a.pose.hitF = -(dx * fx + dz * fz) / l; a.pose.hitS = (dx * fz - dz * fx) / l * -1; }
    if (a.kind === 'npc') {
      if (a.state === 'hostage') { /* hostage hit */ }
      if (src === 'player' && a.alive && a.hp > 0 && a.state !== 'hostage') { if (a.armed && !a.shop || a.role === 'guard') { a.state = 'fight'; a.fightT = 30; a.gun = a.gun || { len: .3 }; if (!a.fixed) NPCs.say(a, 'You picked the wrong state!'); } else NPCs.scare(a, P.x, P.z, 14); }
      if (a.hp <= 0) { const witnessed = Crime.witnessed(a.x, a.z, a); NPCs.die(a, src); if (src === 'player') { if (a === P.hostage) P.hostage = null; Crime.report(a.role === 'guard' ? 3 : 2, a.x, a.z, 'Murder', witnessed); } }
      else if (src === 'player' && how === 'bullet') Crime.raise(1, a.x, a.z, 'Assault with a deadly weapon');
    } else if (a.kind === 'cop') { Police.hurt(a, dmg, src); }
  },
};

// ---- pickups
const Pickups = {
  max: 260, mesh: null, dummy: new T.Object3D(), col: new T.Color(),
  init(scene) {
    this.mesh = new T.InstancedMesh(new T.BoxGeometry(0.5, 0.16, 0.3), new T.MeshLambertMaterial({ color: 0xffffff, emissive: 0x333333 }), this.max); this.mesh.frustumCulled = false; this.mesh.setColorAt(0, new T.Color()); this.mesh.count = 0; scene.add(this.mesh);
    this.light = new T.PointLight(0xfff0a0, 0, 12); scene.add(this.light);
  },
  add(x, z, type, value, name) { if (G.pickups.length >= this.max - 1) G.pickups.shift(); G.pickups.push({ x, z, type, value, name, t: 0, born: G.time }); },
  update(dt) {
    const cols = { cash: 0x4cd964, item: 0xffd23f, bag: 0xa0743a, ammo: 0xff9a2a, health: 0xff5a8a, armor: 0x4aa8ff };
    for (let i = G.pickups.length - 1; i >= 0; i--) {
      const p = G.pickups[i]; p.t += dt; const d = dist(p.x, p.z, P.x, P.z);
      if (!P.dead && d < (P.inCar ? 3 : 1.7) && (P.inCar ? p.type === 'cash' || p.type === 'bag' : true)) {
        if (p.type === 'cash' || p.type === 'bag') { P.addCash(p.value); UI.msg('+' + money(p.value), 1100); G.pickups.splice(i, 1); continue; }
        if (p.type === 'item') { G.inv.push({ n: p.name, v: p.value, story: p.name === 'Gold Ledger' || p.name === 'Burner Phone' }); UI.msg('Picked up: ' + p.name + ' (worth ~' + money(p.value) + ')'); Snd.buy(); G.pickups.splice(i, 1); continue; }
        if (p.type === 'ammo') { const k = P.weapon.firearm ? P.cur : 'pistol'; if (P.ammo[k]) { P.ammo[k].res += p.value; UI.msg('+' + p.value + ' ammo'); G.pickups.splice(i, 1); Snd.buy(); continue; } }
        if (p.type === 'health') { P.hp = Math.min(100, P.hp + p.value); G.pickups.splice(i, 1); Snd.buy(); continue; }
        if (p.type === 'armor') { P.armor = Math.min(100, P.armor + p.value); G.pickups.splice(i, 1); Snd.buy(); continue; }
      }
    }
    const n = G.pickups.length; this.mesh.count = n; let nearest = 1e9;
    for (let i = 0; i < n; i++) {
      const p = G.pickups[i]; const big = p.type === 'bag' ? 1.6 : 1; this.dummy.position.set(p.x, 0.5 + Math.sin(p.t * 3 + i) * 0.08, p.z); this.dummy.rotation.set(0, p.t * 1.6, 0); this.dummy.scale.set(big, big, big); this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix); this.mesh.setColorAt(i, this.col.setHex(cols[p.type] || 0xffffff));
    }
    this.mesh.instanceMatrix.needsUpdate = true; if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  },
};

// ---- save / load
const SaveSys = {
  key: 'sunshine-heist-save-v1',
  has() { try { return !!localStorage.getItem(this.key); } catch (e) { return false; } },
  save() {
    try {
      const d = { cash: G.cash, inv: G.inv, tod: G.tod, day: G.day, stats: G.stats, weapons: P.weapons, ammo: P.ammo, cur: P.cur, hp: P.hp, armor: P.armor, killed: [...G.killedIds], owned: G.cars.filter(c => c.owned && !c.wreck).map(c => ({ type: c.type, color: c.color, x: c.x, z: c.z, h: c.h })), shops: Shops.list.map(s => ({ id: s.id, cd: s.cooldown, vault: s.vault && s.vault.open })), story: Story.serialize(), x: P.x, z: P.z };
      localStorage.setItem(this.key, JSON.stringify(d)); return true;
    } catch (e) { return false; }
  },
  load() {
    try {
      const d = JSON.parse(localStorage.getItem(this.key)); if (!d) return false;
      G.cash = d.cash; G.inv = d.inv || []; G.tod = d.tod; G.day = d.day || 1; G.stats = Object.assign(G.stats, d.stats || {}); P.weapons = d.weapons; P.ammo = d.ammo; P.cur = d.cur; P.hp = d.hp || 100; P.armor = d.armor || 0; G.killedIds = new Set(d.killed || []);
      for (const n of NPCs.list) if (G.killedIds.has(n.id)) { n.alive = false; n.removed = true; }
      for (const o of d.owned || []) { const c = Vehicles.create(o.type, o.x, o.z, o.h, { mode: 'abandoned', owned: true, color: o.color }); c.sleep = true; c.keep = true; }
      Story.restore(d.story); P.x = d.x; P.z = d.z; P.select(P.cur); P.actor.gun = gunOf(P.weapon); return true;
    } catch (e) { return false; }
  },
};
