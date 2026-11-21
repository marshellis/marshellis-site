'use strict';
// ===== Extras: achievements & stats (K), car radio (Q), Pay 'n' Spray, ATMs, food carts, street races, armored-truck heists, police roadblocks =====
CAR_TYPES.armored = { name: 'Sunshine Armored Truck', len: 5.4, w: 2.1, bh: 1.2, ch: .7, maxSpeed: 30, accel: 10, grip: 4.2, hp: 650, price: 0, sell: 1800, cols: [0x2b3a55, 0xe8e8e8] };
ARCH.armored = ARCH.van || ARCH.suv || ARCH.swat;
const PAINT = [0xff2a4a, 0x27e1d0, 0xffd23f, 0x7a6bff, 0xf2f2f2, 0x111111, 0xff7a1a, 0x2a6ad0, 0x6bd16b, 0xff4fa3, 0xb87333, 0x7a8a99];
const clock = s => { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

function ringMarker(color, r = 4.5, beamH = 46) {
  const g = new T.Group(), m = new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.3, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide });
  const beam = new T.Mesh(new T.CylinderGeometry(r * 0.8, r * 0.8, beamH, 20, 1, true), m); beam.position.y = beamH / 2; g.add(beam);
  const ring = new T.Mesh(new T.TorusGeometry(r, 0.16, 8, 36), new T.MeshBasicMaterial({ color })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.3; g.add(ring);
  g.userData = { ring, beam }; return g;
}
function textSprite(text, color = '#fff', bg = 'rgba(10,14,26,.78)', w = 512, h = 128, size = 54) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  g.fillStyle = bg; g.beginPath(); g.roundRect ? g.roundRect(6, 6, w - 12, h - 12, 26) : g.rect(6, 6, w - 12, h - 12); g.fill(); g.lineWidth = 5; g.strokeStyle = color; g.stroke();
  g.fillStyle = color; g.font = `800 ${size}px system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 3);
  const sp = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(c), transparent: true, depthWrite: false })); sp.scale.set(w / h * 1.6, 1.6, 1); return sp;
}
const isWater = c => !!(c && CAR_TYPES[c.type].water);

// ---------------------------------------------------------------- achievements & stats
const Ach = {
  list: [
    ['first_blood', 'First Blood', 'Take a life.', s => s.kills >= 1], ['body_count', 'Body Count', '25 kills.', s => s.kills >= 25], ['rampage', 'Florida Man', '100 kills.', s => s.kills >= 100],
    ['stickup', 'Stick-Up Kid', 'Rob your first business.', s => s.robberies >= 1], ['heister', 'Heist Professional', 'Rob 10 businesses.', s => s.robberies >= 10],
    ['gta', 'Grand Theft Auto', 'Steal a car.', s => s.carsStolen >= 1], ['collector', 'Chop-Shop Regular', 'Steal 10 cars.', s => s.carsStolen >= 10], ['fence', 'The Fence', 'Sell 3 stolen cars.', s => (s.carsSold || 0) >= 3],
    ['negotiator', 'Negotiator', 'Take a hostage.', s => s.hostages >= 1],
    ['c10k', 'Pocket Change', 'Earn $10,000.', s => s.earned >= 10000], ['c100k', 'Six Figures', 'Earn $100,000.', s => s.earned >= 100000], ['c500k', 'Florida Mogul', 'Earn $500,000.', s => s.earned >= 500000],
    ['wanted5', 'Most Wanted', 'Reach five stars.', s => (s.maxWanted || 0) >= 5], ['ghost', 'Ghost', 'Shake a 3+ star manhunt.', s => (s.evades || 0) >= 1],
    ['roadtrip', 'Road Tripper', 'Drive 10 km.', s => (s.odo || 0) >= 10000], ['longhaul', 'Long Haul', 'Drive 50 km.', s => (s.odo || 0) >= 50000], ['speed', 'Need for Speed', 'Hit 110 mph.', s => (s.topSpeed || 0) >= 49],
    ['seadog', 'Sea Legs', 'Spend 2 minutes on the water.', s => (s.boatT || 0) >= 120],
    ['race1', 'Pole Position', 'Win a street race.', s => (s.races || 0) >= 1], ['race5', 'Street Legend', 'Win 5 street races.', s => (s.races || 0) >= 5],
    ['spray', 'Fresh Coat', "Visit a Pay 'n' Spray.", s => (s.sprays || 0) >= 1], ['atm', 'Cash Machine', 'Crack 3 ATMs.', s => (s.atms || 0) >= 3],
    ['truck', 'Armored Heist', 'Rob an armored truck.', s => (s.trucks || 0) >= 1], ['spikes', 'Flat Out', 'Hit a police spike strip.', s => (s.spiked || 0) >= 1],
    ['getaway', 'Clean Getaway', 'Slip away before the cops arrive.', s => (s.escaped || 0) >= 1], ['masked', 'Under Cover', 'Pull a job wearing a ski mask.', s => (s.maskedJobs || 0) >= 1], ['dyed', 'Dyed in the Wool', 'Get hit by a bank dye pack.', s => (s.dyed || 0) >= 1],
    ['snack', 'Cuban Sandwich', 'Buy food from a street cart.', s => (s.snacks || 0) >= 1],
    ['story1', 'Off the Beach', 'Finish a story mission.', () => Object.keys(Story.done || {}).length >= 1], ['story6', 'Halfway Home', 'Finish 6 story missions.', () => Object.keys(Story.done || {}).length >= 6], ['story12', 'The Pelican Falls', 'Finish the story.', () => Object.keys(Story.done || {}).length >= 12],
  ],
  q: [], showT: 0, chkT: 0, open: false, prevW: 0, deadAt: -99,
  init() {
    const st = document.createElement('style');
    st.textContent = `
    #ach{position:fixed;top:78px;left:50%;transform:translate(-50%,-30px);opacity:0;transition:all .45s cubic-bezier(.2,.9,.3,1.2);z-index:9;pointer-events:none;display:flex;gap:12px;align-items:center;padding:10px 20px 10px 14px;border-radius:14px;background:linear-gradient(120deg,#1d2440ee,#2a1a40ee);border:2px solid #ffd23f;box-shadow:0 6px 30px #000a;color:#fff;font-family:inherit}
    #ach.on{opacity:1;transform:translate(-50%,0)} #ach .ic{font-size:28px;width:44px;height:44px;border-radius:50%;background:#ffd23f;color:#2a1a40;display:flex;align-items:center;justify-content:center;font-weight:900}
    #ach .t{font-size:11px;letter-spacing:2px;color:#ffd23f;font-weight:800} #ach .n{font-size:19px;font-weight:800} #ach .d{font-size:12px;opacity:.8}
    #xstats{position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:#050912dd;z-index:19;color:#fff}
    #xstats .box{width:min(900px,94vw);max-height:90vh;overflow:auto;padding:22px 26px;border-radius:18px;background:#121a2fee;border:2px solid #ffffff22}
    #xstats h2{margin:0 0 4px;font-size:26px;letter-spacing:1px} #xstats .sub{opacity:.6;font-size:13px;margin-bottom:14px}
    #xstats .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-bottom:16px} #xstats .cell{background:#ffffff10;border-radius:10px;padding:8px 10px} #xstats .cell b{display:block;font-size:20px} #xstats .cell span{font-size:11px;opacity:.65;text-transform:uppercase;letter-spacing:1px}
    #xstats .al{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:8px} #xstats .a{display:flex;gap:10px;align-items:center;background:#ffffff0c;border-radius:10px;padding:8px 10px;opacity:.45} #xstats .a.u{opacity:1;background:#ffd23f1e;border:1px solid #ffd23f66}
    #xstats .a i{font-style:normal;width:30px;height:30px;border-radius:50%;background:#ffffff22;display:flex;align-items:center;justify-content:center;font-weight:900;flex:none} #xstats .a.u i{background:#ffd23f;color:#2a1a40} #xstats .a div{font-size:12px;line-height:1.25} #xstats .a div b{font-size:14px;display:block}
    #raceHud{position:fixed;top:14px;left:14px;padding:8px 14px;border-radius:10px;background:#0b1020cc;border-left:4px solid #ffd23f;color:#fff;font-weight:700;font-size:14px;display:none;z-index:5;pointer-events:none;line-height:1.5} #raceHud small{opacity:.7;font-weight:500}
    #raceBig{position:fixed;left:50%;top:32%;transform:translate(-50%,-50%);font-size:92px;font-weight:900;color:#ffd23f;text-shadow:0 4px 0 #000a,0 0 30px #ff4fa3;display:none;z-index:6;pointer-events:none;font-style:italic}
    #radioHud{position:fixed;bottom:92px;left:50%;transform:translateX(-50%);padding:6px 16px;border-radius:30px;background:#0b1020cc;border:1px solid #ffffff33;color:#fff;font-weight:700;font-size:14px;opacity:0;transition:opacity .4s;z-index:5;pointer-events:none;white-space:nowrap} #radioHud small{opacity:.6;font-weight:500;margin-left:8px}`;
    document.head.appendChild(st);
    const mk = (id, html) => { const d = document.createElement('div'); d.id = id; d.innerHTML = html || ''; document.body.appendChild(d); return d; };
    this.el = mk('ach', '<div class="ic">★</div><div><div class="t">ACHIEVEMENT UNLOCKED</div><div class="n"></div><div class="d"></div></div>');
    this.panel = mk('xstats', '<div class="box"></div>');
    addEventListener('keydown', e => {
      if (e.code === 'KeyK' && !e.repeat) this.toggle(); else if (e.code === 'Escape' && this.open) this.toggle(false);
    });
    this.panel.addEventListener('click', e => { if (e.target === this.panel) this.toggle(false); });
  },
  have() { return G.stats.ach || (G.stats.ach = {}); },
  unlock(a) {
    this.have()[a[0]] = G.day * 1440 + G.tod | 0; this.q.push(a); G.cash += 250; Snd.sting('pass'); UI.news('Achievement: ' + a[1], '');
  },
  track(dt) {
    const s = G.stats, c = P.car;
    if (P.inCar && c) { const sp = Math.abs(c.fs || 0); if (isWater(c)) s.boatT = (s.boatT || 0) + dt; else { s.odo = (s.odo || 0) + Math.hypot(c.vx, c.vz) * dt; if (sp > (s.topSpeed || 0)) s.topSpeed = sp; } }
    if (G.wanted > (s.maxWanted || 0)) s.maxWanted = G.wanted;
    if (P.dead) this.deadAt = G.time;
    if (this.prevW >= 3 && G.wanted === 0 && G.time - this.deadAt > 10) s.evades = (s.evades || 0) + 1;
    this.prevW = G.wanted;
  },
  update(dt) {
    this.track(dt); this.chkT -= dt;
    if (this.chkT <= 0) { this.chkT = 0.6; const s = G.stats, h = this.have(); for (const a of this.list) if (!h[a[0]]) { let ok = false; try { ok = a[3](s); } catch (e) { } if (ok) this.unlock(a); } }
    if (this.showT > 0) { this.showT -= dt; if (this.showT <= 0) this.el.classList.remove('on'); }
    else if (this.q.length) { const a = this.q.shift(); this.el.querySelector('.n').textContent = a[1]; this.el.querySelector('.d').textContent = a[2] + '  (+$250)'; this.el.classList.add('on'); this.showT = 4.2; }
  },
  toggle(on) {
    const want = on === undefined ? !this.open : on; if (want === this.open) return;
    if (want && (G.state !== 'play' || G.modal || Cut.on || P.dead)) return;
    this.open = want; this.panel.style.display = want ? 'flex' : 'none'; G.modal = want;
    if (want) { Input.unlock(); this.render(); } else if (G.state === 'play' && !G.paused) Input.lock();
  },
  render() {
    const s = G.stats, h = this.have(), done = this.list.filter(a => h[a[0]]).length, km = ((s.odo || 0) / 1000).toFixed(1), mi = (km * 0.621).toFixed(1);
    const cell = (v, l) => `<div class="cell"><b>${v}</b><span>${l}</span></div>`;
    const hrs = Math.floor(G.time / 3600), mins = Math.floor(G.time / 60) % 60;
    this.panel.firstChild.innerHTML = `<h2>Stats &amp; Achievements</h2><div class="sub">${done} / ${this.list.length} unlocked · Day ${G.day} · press K or Esc to close</div><div class="grid">`
      + cell(money(G.cash), 'Cash') + cell(money(s.earned || 0), 'Total earned') + cell(s.kills || 0, 'Kills') + cell(s.robberies || 0, 'Robberies') + cell(s.carsStolen || 0, 'Cars stolen') + cell(s.hostages || 0, 'Hostages')
      + cell(mi + ' mi', 'Driven') + cell(Math.round((s.topSpeed || 0) * 2.237) + ' mph', 'Top speed') + cell(clock(s.boatT || 0), 'Time at sea') + cell('★'.repeat(s.maxWanted || 0) || '—', 'Max wanted')
      + cell(s.races || 0, 'Races won') + cell(s.atms || 0, 'ATMs cracked') + cell(s.trucks || 0, 'Trucks robbed') + cell(s.sprays || 0, 'Respray visits') + cell(`${hrs}h ${mins}m`, 'Play time') + `</div><div class="al">`
      + this.list.map(a => `<div class="a ${h[a[0]] ? 'u' : ''}"><i>${h[a[0]] ? '★' : '·'}</i><div><b>${a[1]}</b>${a[2]}</div></div>`).join('') + '</div>';
  },
};

// ---------------------------------------------------------------- car radio (procedural stations)
const mf = n => 440 * Math.pow(2, (n - 69) / 12);
const Radio = {
  st: 0, bus: null, lp: null, step: 0, nextT: 0, timer: null, hud: null, hudT: 0, wasIn: false,
  stations: [
    { name: 'Neon Palms 101.3', genre: 'Synthwave', bpm: 104,
      play(r, s, t, bar, d) { const root = [45, 41, 48, 43][bar], ch = [[57, 60, 64], [53, 57, 60], [55, 60, 64], [55, 59, 62]][bar];
        if (s % 4 === 0) r.kick(t, .8); if (s === 4 || s === 12) r.snare(t, .42); if (s % 2 === 0) r.hat(t, .1, s === 14);
        if ([1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0][s]) r.osc(mf(root + (s === 6 || s === 14 ? 12 : 0)), t, d * 1.6, 'sawtooth', .2);
        if (s % 2 === 0) r.osc(mf(ch[(s / 2) % 3] + 12 + (bar % 2 ? 12 : 0)), t, d * 1.8, 'square', .045);
        if (s === 0) for (const n of ch) r.osc(mf(n), t, d * 15.5, 'triangle', .06); } },
    { name: 'Calle Ocho 96.7', genre: 'Salsa', bpm: 98,
      play(r, s, t, bar, d) { const root = [45, 50, 40, 45][bar], ch = [[57, 60, 64, 67], [57, 62, 65, 69], [56, 59, 62, 64], [57, 60, 64, 67]][bar];
        if ([0, 3, 6, 10, 12].includes(s)) r.osc(1900, t, .04, 'triangle', .13); if ([4, 12].includes(s)) r.osc(170, t, .12, 'sine', .45, .6); if ([2, 6, 10, 14].includes(s)) r.osc(300, t, .07, 'triangle', .22, .6); if (s % 2) r.hat(t, .05);
        if ([0, 3, 6, 8, 11, 14].includes(s)) r.osc(mf((s === 8 ? root + 7 : root) - (s === 11 ? 0 : 0)), t, d * 2.2, 'triangle', .3);
        if ([2, 5, 7, 10, 13].includes(s)) for (const n of ch) { r.osc(mf(n + 12), t, d * 1.2, 'square', .03); r.osc(mf(n + 12), t, d * 1.4, 'triangle', .05); } } },
    { name: 'WGTR Gator Rock 98.1', genre: 'Swamp rock', bpm: 126,
      play(r, s, t, bar, d) { const root = [40, 43, 45, 40][bar];
        if ([0, 8, 10].includes(s)) r.kick(t, .85); if (s === 4 || s === 12) r.snare(t, .55); if (s % 2 === 0) r.hat(t, .13, s === 14);
        if ([0, 2, 3, 6, 8, 10, 11, 14].includes(s)) for (const o of [0, 7, 12]) { r.osc(mf(root + o + 12), t, d * (s === 0 ? 3 : 1.5), 'sawtooth', .05); r.osc(mf(root + o + 12.1), t, d * (s === 0 ? 3 : 1.5), 'square', .03); }
        if ([0, 3, 6, 8, 11].includes(s)) r.osc(mf([64, 67, 69, 71, 74][(bar * 5 + s) % 5] + 12), t, d * 2.5, 'sawtooth', .04); } },
    { name: 'Palm Reggae 94.3', genre: 'Island reggae', bpm: 78,
      play(r, s, t, bar, d) { const root = [45, 50, 45, 40][bar], ch = [[57, 60, 64], [57, 62, 65], [57, 60, 64], [56, 59, 64]][bar];
        if (s === 8) { r.kick(t, .7); r.noise(t, .05, 1300, 1, .25, 'bandpass'); } if (s % 2 === 0) r.hat(t, .08);
        if ([2, 6, 10, 14].includes(s)) for (const n of ch) r.osc(mf(n + 12), t, d * 1.1, 'square', .035);
        const bp = { 0: 0, 3: 0, 6: 7, 8: 0, 11: 12, 14: 7 }[s]; if (bp !== undefined) r.osc(mf(root + bp - 12 + 12), t, d * 2.2, 'sine', .38); } },
  ],
  ensure() {
    if (this.bus) return true; if (!Snd.ctx) return false; const c = Snd.ctx;
    this.bus = c.createGain(); this.bus.gain.value = 0; this.lp = c.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 4200; this.bus.connect(this.lp); this.lp.connect(Snd.master);
    this.timer = setInterval(() => this.tick(), 40); return true;
  },
  osc(f, t, d, type, v, slide) {
    const c = Snd.ctx, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f * slide), t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(this.bus); o.start(t); o.stop(t + d + 0.05);
  },
  noise(t, d, f, q, v, type) {
    const c = Snd.ctx, s = c.createBufferSource(); s.buffer = Snd.noise; const fl = c.createBiquadFilter(); fl.type = type || 'highpass'; fl.frequency.value = f; fl.Q.value = q || 1; const g = c.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(fl); fl.connect(g); g.connect(this.bus); s.start(t, Math.random() * 1.4, d + 0.02);
  },
  kick(t, v) { this.osc(155, t, .17, 'sine', v, .28); this.noise(t, .015, 2500, 1, .12, 'highpass'); },
  snare(t, v) { this.noise(t, .15, 1800, .8, v, 'bandpass'); this.osc(215, t, .08, 'triangle', v * .5, .6); },
  hat(t, v, open) { this.noise(t, open ? .16 : .035, 7500, 1, v, 'highpass'); },
  tick() {
    if (!Snd.ctx || !this.bus || this.st < 0 || this.bus.gain.value < 0.004 && !(P.inCar)) return; const c = Snd.ctx, S = this.stations[this.st], d = 60 / S.bpm / 4;
    if (this.nextT < c.currentTime - 0.4) this.nextT = c.currentTime + 0.06;
    while (this.nextT < c.currentTime + 0.22) { const i = this.step++, bar = Math.floor(i / 16) % 4; S.play(this, i % 16, this.nextT, bar, d); this.nextT += d; }
  },
  next() { this.st = this.st >= this.stations.length - 1 ? -1 : this.st + 1; this.step = 0; this.nextT = 0; this.show(); },
  show() {
    if (!this.hud) this.hud = document.getElementById('radioHud') || (() => { const d = document.createElement('div'); d.id = 'radioHud'; document.body.appendChild(d); return d; })();
    const S = this.stations[this.st]; this.hud.innerHTML = this.st < 0 ? '📻 Radio off<small>Q — next station</small>' : `📻 ${S.name}<small>${S.genre} · Q — next</small>`; this.hud.style.opacity = 1; this.hudT = 3.6;
  },
  update(dt) {
    if (!this.ensure()) return; const c = Snd.ctx, inCar = !!(P.inCar && P.car) && !P.dead && !Cut.on;
    if (inCar && !this.wasIn) this.show(); this.wasIn = inCar;
    if (inCar && Input.pressed('KeyQ')) this.next();
    const want = inCar && this.st >= 0 ? 0.5 : 0; this.bus.gain.setTargetAtTime(want, c.currentTime, 0.3);
    if (this.hudT > 0) { this.hudT -= dt; if (this.hudT <= 0 && this.hud) this.hud.style.opacity = 0; }
  },
};

// ---------------------------------------------------------------- sidewalk furniture: ATMs and food carts
const Street = {
  atms: [], carts: [], hold: 0, cur: null, cartCool: 0, truckHold: 0,
  init(scene) {
    const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), p = new T.Vector3(), s = new T.Vector3(1, 1, 1), col = new T.Color();
    const atmL = [], cartL = [];
    for (const b of World.blocks) {
      const urban = ['downtown', 'deco', 'tampa', 'orlando'].includes(b.zone);
      for (let sd = 0; sd < 4; sd++) {
        const side = (t, off) => sd === 0 ? [lerp(b.x0 + 6, b.x1 - 6, t), b.z0 + off] : sd === 2 ? [lerp(b.x0 + 6, b.x1 - 6, t), b.z1 - off] : sd === 3 ? [b.x0 + off, lerp(b.z0 + 6, b.z1 - 6, t)] : [b.x1 - off, lerp(b.z0 + 6, b.z1 - 6, t)];
        const rot = [Math.PI, Math.PI / 2, 0, -Math.PI / 2][sd];
        if (hashN(b.i * 9 + sd + 41, b.j * 5 + 3) < (urban ? 0.3 : 0.07)) { const [x, z] = side(0.3 + hashN(b.i + sd, b.j * 3 + 1) * 0.4, 1.25); atmL.push({ x, z, rot, cash: ri(220, 950), cool: 0 }); }
        if (hashN(b.i * 7 + sd + 77, b.j * 11 + 9) < (urban ? 0.16 : 0.035)) { const [x, z] = side(0.7 + hashN(b.j + sd, b.i * 3 + 5) * 0.2, 2.2); cartL.push({ x, z, rot, hue: hashN(x, z) }); }
      }
    }
    this.atms = atmL; this.carts = cartL;
    const bodyG = new T.BoxGeometry(0.78, 1.55, 0.6); bodyG.translate(0, 0.78, 0); const scrG = new T.BoxGeometry(0.42, 0.3, 0.03); scrG.translate(0, 1.18, 0.31);
    const body = new T.InstancedMesh(bodyG, new T.MeshLambertMaterial({ color: 0x4a5668 }), Math.max(1, atmL.length)), scr = new T.InstancedMesh(scrG, new T.MeshBasicMaterial({ color: 0xffffff }), Math.max(1, atmL.length));
    atmL.forEach((a, i) => { p.set(a.x, groundY(a.x, a.z) + 0.16, a.z); q.setFromEuler(e.set(0, a.rot, 0)); m4.compose(p, q, s); body.setMatrixAt(i, m4); scr.setMatrixAt(i, m4); scr.setColorAt(i, col.setRGB(0.25, 1, 0.55)); });
    body.count = scr.count = atmL.length; for (const mm of [body, scr]) { mm.frustumCulled = false; scene.add(mm); } body.castShadow = true; this.scr = scr;
    // food carts: cart body + striped umbrella
    const parts = [{ geo: new T.BoxGeometry(1.5, 0.12, 0.9).translate(0, 0.95, 0), color: [0.85, 0.85, 0.88] }, { geo: new T.BoxGeometry(1.4, 0.7, 0.8).translate(0, 0.55, 0), color: [0.95, 0.75, 0.2] }, { geo: new T.CylinderGeometry(0.04, 0.04, 1.9, 6).translate(0, 1.9, -0.2), color: [0.3, 0.3, 0.3] }, { geo: new T.ConeGeometry(1.35, 0.5, 10).translate(0, 2.9, -0.2), color: [0.95, 0.25, 0.3] }, { geo: new T.CylinderGeometry(0.2, 0.2, 0.08, 10).rotateX(Math.PI / 2).translate(-0.55, 0.25, 0.4), color: [0.1, 0.1, 0.1] }, { geo: new T.CylinderGeometry(0.2, 0.2, 0.08, 10).rotateX(Math.PI / 2).translate(0.55, 0.25, 0.4), color: [0.1, 0.1, 0.1] }];
    const cm = new T.InstancedMesh(mergeParts(parts), new T.MeshLambertMaterial({ vertexColors: true }), Math.max(1, cartL.length));
    cartL.forEach((a, i) => { p.set(a.x, groundY(a.x, a.z) + 0.16, a.z); q.setFromEuler(e.set(0, a.rot, 0)); m4.compose(p, q, s); cm.setMatrixAt(i, m4); });
    cm.count = cartL.length; cm.frustumCulled = false; cm.castShadow = true; scene.add(cm);
  },
  nearest(list, r) { let best = null, bd = r * r; for (const a of list) { const d = d2(a.x, a.z, P.x, P.z); if (d < bd) { bd = d; best = a; } } return best; },
  atmDim(a, on) { const i = this.atms.indexOf(a); if (i < 0) return; const c = new T.Color(); on ? c.setRGB(0.25, 1, 0.55) : c.setRGB(0.12, 0.12, 0.14); this.scr.setColorAt(i, c); this.scr.instanceColor.needsUpdate = true; },
  update(dt) {
    this.cur = null; this.cartCool -= dt;
    if (!P.inCar && !P.dead && !G.modal) {
      const a = this.nearest(this.atms, 1.9);
      if (a) { if (a.cool > G.time) this.cur = { text: 'ATM out of cash', dur: 0, atm: a, dead: true }; else this.cur = { text: `<kbd>Hold E</kbd> Smash the ATM`, dur: 2.8, label: 'CRACKING ATM', atm: a, done: () => this.crackAtm(a) }; }
      const cart = !this.cur && this.nearest(this.carts, 2.6); this.cartNear = cart || null;
      const tr = Truck.prompt(); if (tr) this.cur = tr;
    } else this.cartNear = null;
    const c = this.cur;
    if (c && !c.dead && c.dur && Input.held('KeyE') && !P.aimingGun) {
      this.hold += dt / c.dur; G.progress = { label: c.label, frac: this.hold }; this.hs = (this.hs || 0) - dt;
      if (this.hs <= 0) { this.hs = 0.22; Snd.burst(0.07, 1800 + Math.random() * 1200, 2, 0.35, 'bandpass'); fxSpark(P.x + Math.sin(P.face) * 0.8, 1.0, P.z + Math.cos(P.face) * 0.8, 2); }
      if (this.hold >= 1) { this.hold = 0; c.done(); }
    } else this.hold = 0;
  },
  crackAtm(a) {
    const amt = a.cash; a.cool = G.time + 600; this.atmDim(a, false); G.stats.atms = (G.stats.atms || 0) + 1; P.addCash(Math.round(amt * 0.6)); for (let k = 0; k < 3; k++) Pickups.add(a.x + rr(-1, 1), a.z + rr(-1, 1), 'cash', Math.round(amt * 0.4 / 3));
    fxSpark(a.x, 1, a.z, 10); Snd.alarm && Snd.alarm(); UI.msg('ATM cracked: ' + money(Math.round(amt * 0.6)) + ' + loose bills', 2200); Crime.raise(2, a.x, a.z, 'ATM robbery');
  },
  prompt() {
    if (this.cur) return { text: this.cur.text };
    const c = this.cartNear; if (c && !P.dead) { const cost = 12; return { text: `<kbd>E</kbd> Cuban sandwich ${money(cost)} (+35 HP)`, act: () => { if (this.cartCool > 0) return; if (G.cash < cost) return UI.msg('Not enough cash'); this.cartCool = 1.2; G.cash -= cost; P.hp = Math.min(100, P.hp + 35); G.stats.snacks = (G.stats.snacks || 0) + 1; Snd.buy(); UI.msg('Mmm. Pressed, grilled, perfect. +35 HP', 1800); } }; }
    return null;
  },
};

// ---------------------------------------------------------------- Pay 'n' Spray
const Spray = {
  shops: [], act: null,
  init(scene) {
    const S = Shops.safe || { x: 0, z: 0 }, targets = [[S.x - 170, S.z + 20], [S.x + 10, S.z - 170], [185, -40], [0, 400], [-1240, -40], [110, -1300], [10, 880]];
    const sign = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 512, 0); gr.addColorStop(0, '#ff4fa3'); gr.addColorStop(0.5, '#ffd23f'); gr.addColorStop(1, '#27e1d0'); g.fillStyle = '#0d1020'; g.fillRect(0, 0, 512, 128); g.fillStyle = gr; g.fillRect(0, 0, 512, 12); g.fillRect(0, 116, 512, 12); g.fillStyle = '#fff'; g.font = '800 62px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText("PAY 'N' SPRAY", 256, 66); return new T.CanvasTexture(c); })();
    const mat = new T.MeshLambertMaterial({ color: 0x3a3f4c });
    for (const [tx, tz] of targets) {
      const n = nearestNode(tx, tz); if (!n || !n.links.length) continue; const m = n.links.reduce((b, l) => !b || Math.abs(dist(n.x, n.z, l.x, l.z) - 80) < Math.abs(dist(n.x, n.z, b.x, b.z) - 80) ? l : b, null);
      const dx = m.x - n.x, dz = m.z - n.z, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L, x = n.x + dx * 0.5, z = n.z + dz * 0.5, h = Math.atan2(ux, uz), g = new T.Group();
      const post = new T.BoxGeometry(0.6, 6.6, 0.6); for (const sx of [-1, 1]) { const pm = new T.Mesh(post, mat); pm.position.set(sx * 8.6, 3.3, 0); pm.castShadow = true; g.add(pm); }
      const beam = new T.Mesh(new T.BoxGeometry(18.2, 0.8, 0.9), mat); beam.position.set(0, 6.4, 0); beam.castShadow = true; g.add(beam);
      for (const side of [-1, 1]) { const sg = new T.Mesh(new T.PlaneGeometry(9.2, 2.3), new T.MeshBasicMaterial({ map: sign })); sg.position.set(0, 7.9, side * 0.48); if (side < 0) sg.rotation.y = Math.PI; g.add(sg); }
      for (let k = -2; k <= 2; k++) { const nz = new T.Mesh(new T.BoxGeometry(0.4, 0.3, 0.4), new T.MeshBasicMaterial({ color: PAINT[(k + 2) * 2 % PAINT.length] })); nz.position.set(k * 3.2, 5.8, 0); g.add(nz); }
      g.position.set(x, groundY(x, z), z); g.rotation.y = h; scene.add(g);
      const ring = ringMarker(0xff4fa3, 4.2, 36); ring.position.set(x, groundY(x, z), z); scene.add(ring);
      this.shops.push({ x, z, h, ring, cool: 0 });
    }
  },
  blips() { return this.shops.map(s => ({ x: s.x, z: s.z, c: '#ff9a3c', t: 'W' })); },
  nearCop(x, z) { for (const c of G.cars) if (c.ai.mode === 'police' && !c.dead && dist(c.x, c.z, x, z) < 34) return true; for (const c of Police.cops) if (c.alive && dist(c.x, c.z, x, z) < 28) return true; return false; },
  update(dt) {
    for (const s of this.shops) { const d = dist(s.x, s.z, P.x, P.z); s.ring.visible = d < 260; if (s.ring.visible) { const u = s.ring.userData; u.ring.rotation.z += dt * 0.8; const sc = 1 + 0.06 * Math.sin(G.time * 3); u.ring.scale.set(sc, sc, sc); } }
    const a = this.act;
    if (a) {
      const c = a.car; a.t += dt; c.vx = c.vz = 0; c.fs = 0; const col = new T.Color(a.color);
      for (let k = 0; k < 4; k++) FX.emit(c.x + rr(-1.4, 1.4), 0.3 + rr(0, 1.6), c.z + rr(-2.4, 2.4), rr(-1, 1), rr(0.2, 1.2), rr(-1, 1), rr(0.5, 1.0), 0.9, col.r, col.g, col.b, 0, 1);
      if (Math.random() < 0.3) Snd.burst(0.2, 5000, 1, 0.2, 'highpass');
      G.progress = { label: 'RESPRAYING', frac: a.t / 2.6 };
      if (a.t >= 2.6 || P.car !== c || !P.inCar) this.finish(a);
      return;
    }
    if (!P.inCar || !P.car || isWater(P.car) || P.dead || Cut.on) return;
    for (const s of this.shops) if (s.cool <= 0 && dist(s.x, s.z, P.x, P.z) < 5.2 && Math.abs(P.car.fs) < 26) {
      const cost = P.car.type === 'bike' ? 60 : 150; if (G.cash < cost) { s.cool = 6; UI.msg(`Pay 'n' Spray: you need ${money(cost)}`, 2200); continue; }
      let col; do { col = pick(CAR_TYPES[P.car.type].cols.length > 2 ? CAR_TYPES[P.car.type].cols.concat(PAINT) : PAINT); } while (col === P.car.color);
      G.cash -= cost; this.act = { car: P.car, shop: s, t: 0, color: col, cost }; s.cool = 20; UI.msg(`Pay 'n' Spray — ${money(cost)}`, 1800); return;
    }
    for (const s of this.shops) if (s.cool > 0) s.cool -= dt;
  },
  finish(a) {
    const c = a.car, s = a.shop; this.act = null; if (!c || c.wreck) return;
    const g = carGeos(c.type, a.color); c.body.geometry = g.body; c.glow.geometry = g.glow || emptyGeo; if (c.tailMesh && g.tail) c.tailMesh.geometry = g.tail; if (c.glassMesh && g.glass) c.glassMesh.geometry = g.glass; c.color = a.color;
    c.hp = c.maxHp; c.dead = false; c.burnT = 0; Snd.buy(); G.stats.sprays = (G.stats.sprays || 0) + 1;
    if (G.wanted > 0) { if (this.nearCop(s.x, s.z)) UI.msg('Fresh paint! ...but the cops saw you go in.', 3000); else { G.wanted = 0; G.lastSeen = -99; Snd.sting('pass'); UI.msg('New paint, new plates. Wanted level cleared!', 3200); } }
    else UI.msg('Looking good. Car fully repaired.', 2200);
  },
};

// ---------------------------------------------------------------- street races
const Race = {
  defs: [], act: null, hud: null, big: null, m1: null, m2: null,
  init(scene) {
    const S = Shops.safe || { x: 0, z: 0 }, starts = [[S.x - 70, S.z - 100, 'Ocean Drive Dash'], [185, -130, 'Downtown Sprint'], [-1240, 90, 'Bay Bridge Run'], [110, -1250, 'Kingdom Circuit'], [-30, 330, 'Port Hustle']];
    for (const [sx, sz, name] of starts) {
      const a = nearestNode(sx, sz); if (!a || !a.links.length) continue;
      for (let attempt = 0; attempt < 8; attempt++) { // random non-backtracking walk along real roads
        const path = [a]; let prev = null, cur = a;
        while (path.length < 10) { const opts = cur.links.filter(n => n !== prev && !path.includes(n)); if (!opts.length) break; const straight = prev ? opts.filter(n => Math.abs((n.x - cur.x) * (cur.x - prev.x) + (n.z - cur.z) * (cur.z - prev.z)) > 1) : []; const nx = straight.length && chance(0.55) ? pick(straight) : pick(opts); prev = cur; cur = nx; path.push(cur); }
        if (path.length >= 8) { let len = 0; for (let i = 1; i < path.length; i++) len += dist(path[i - 1].x, path[i - 1].z, path[i].x, path[i].z); this.defs.push({ name, x: a.x, z: a.z, path, len, cool: 0, ring: null, sign: null }); break; }
      }
    }
    for (const d of this.defs) { d.ring = ringMarker(0xffd23f, 5, 40); d.ring.position.set(d.x, groundY(d.x, d.z), d.z); scene.add(d.ring); d.sign = textSprite('STREET RACE', '#ffd23f'); d.sign.position.set(d.x, groundY(d.x, d.z) + 7.5, d.z); scene.add(d.sign); }
    this.m1 = ringMarker(0xffffff, 6, 50); this.m2 = ringMarker(0x88b4ff, 4.5, 26); this.m1.visible = this.m2.visible = false; scene.add(this.m1); scene.add(this.m2);
    this.hud = document.createElement('div'); this.hud.id = 'raceHud'; document.body.appendChild(this.hud); this.big = document.createElement('div'); this.big.id = 'raceBig'; document.body.appendChild(this.big);
  },
  blips() { const b = this.defs.filter(d => !this.act && d.cool <= 0).map(d => ({ x: d.x, z: d.z, c: '#ffd23f', t: 'R' })); if (this.act) { const cp = this.act.cps[this.act.i]; if (cp) b.push({ x: cp.x, z: cp.z, c: '#ffffff', t: '>', obj: true }); } return b; },
  begin(def) {
    const car = P.car, cps = def.path.slice(1), A = def.path[0], B = cps[0], dx = B.x - A.x, dz = B.z - A.z, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L, h = Math.atan2(ux, uz);
    const time = def.len / 15 + 14, reward = Math.round(def.len * 4.2 / 100) * 100;
    car.x = A.x + ux * 2; car.z = A.z + uz * 2; car.h = h; car.vx = car.vz = 0; car.fs = 0; car.sleep = false;
    const rivals = [], types = ['sports', 'muscle', 'sedan', 'sports', 'suv']; for (let k = 0; k < 2; k++) { const side = k ? 1 : -1, c = Vehicles.create(pick(types), A.x + ux * -4 - uz * side * 3.6 * 1, A.z + uz * -4 + ux * side * 3.6, h, { mode: 'race' }); c.ai = { mode: 'race' }; c.keep = true; c.sleep = false; rivals.push({ car: c, i: 0, stuck: 0, cruise: rr(21, 27), fin: 0 }); }
    this.act = { def, cps, i: 0, car, state: 'count', t: 3.99, time: 0, limit: time, reward, rivals, finished: 0, left: 0, endT: 0, big: -1 };
    UI.msg(`${def.name} — ${cps.length} checkpoints. Beat 2 rivals!`, 3200); G.stats.raceStarts = (G.stats.raceStarts || 0) + 1;
  },
  bigText(txt) { this.big.textContent = txt; this.big.style.display = txt ? 'block' : 'none'; },
  end(ok, msg) {
    const a = this.act; if (!a) return; this.act = null; a.def.cool = 150; this.hud.style.display = 'none'; this.bigText(''); this.m1.visible = this.m2.visible = false;
    for (const r of a.rivals) { r.car.ai = { mode: 'abandoned' }; r.car.keep = false; setTimeout(() => { r.car.wreckGone = true; }, 7000); }
    UI.msg(msg, 3600); Snd.sting(ok ? 'pass' : 'fail'); if (Story.gps && Story.gps.race) Story.gps = null;
  },
  rival(r, a, dt) {
    const c = r.car, cps = a.cps, cp = cps[r.i]; if (!cp) { c.vx *= 0.97; c.vz *= 0.97; Vehicles.step(c, { thr: 0, hand: true }, dt); return; }
    const prev = r.i ? cps[r.i - 1] : a.def.path[0], nxt = cps[r.i + 1]; let dx = cp.x - c.x, dz = cp.z - c.z, d = Math.hypot(dx, dz), turn = 0;
    if (nxt) { const a1 = Math.atan2(cp.x - prev.x, cp.z - prev.z), a2 = Math.atan2(nxt.x - cp.x, nxt.z - cp.z); turn = Math.abs(angDiff(a1, a2)); }
    if (d < (turn > 0.6 ? 6 : 13)) { r.i++; if (r.i >= cps.length) { r.fin = ++a.finished; r.time = a.time; if (!a.playerFin) UI.msg('A rival finished the race!', 1500); } return; }
    const want = Math.atan2(dx, dz), ad = angDiff(c.h, want), steer = clamp(-ad * 2.4, -1, 1); let cruise = r.cruise;
    const pc = a.car, pd = pc ? (dist(c.x, c.z, pc.x, pc.z)) : 0; const ahead = pc && ((cp.x - c.x) * (pc.x - c.x) + (cp.z - c.z) * (pc.z - c.z) > 0 ? 0 : 1); if (pc && pd > 55) cruise *= ahead ? 0.78 : 1.12;
    if (Math.abs(ad) > 0.5) cruise = Math.min(cruise, 9); else if (turn > 0.6 && d < 38) cruise = Math.min(cruise, 11 + d * 0.15);
    const thr = c.fs < cruise ? 0.95 : (c.fs > cruise + 2 ? -0.5 : 0.1); Vehicles.step(c, { thr, steer }, dt);
    if (Math.abs(c.fs) < 1.2) { r.stuck += dt; if (r.stuck > 2.6) { r.stuck = 0; c.x = c.x + Math.sin(want) * 9; c.z = c.z + Math.cos(want) * 9; c.h = want; c.vx = Math.sin(want) * 6; c.vz = Math.cos(want) * 6; c.fs = 6; } } else r.stuck = 0;
  },
  update(dt) {
    for (const d of this.defs) { if (d.cool > 0) d.cool -= dt; const near = dist(d.x, d.z, P.x, P.z) < 300; d.ring.visible = d.sign.visible = near && d.cool <= 0 && !this.act; if (d.ring.visible) { const u = d.ring.userData; u.ring.rotation.z += dt; } }
    const a = this.act;
    if (!a) {
      const ok = P.inCar && P.car && !isWater(P.car) && !P.dead && !Cut.on && !Spray.act;
      for (const d of this.defs) {
        const inR = ok && d.cool <= 0 && dist(d.x, d.z, P.x, P.z) < 6.5;
        if (!inR) { d.dwell = 0; d.told = false; continue; }
        if (G.wanted > 0) { if (!d.told) { d.told = true; UI.msg('Lose the cops before you race.', 2000); } continue; }
        if (!d.told) { d.told = true; UI.msg(`${d.name}: stop in the ring to start the race`, 2600); }
        if (Math.abs(P.car.fs) < 5) { d.dwell = (d.dwell || 0) + dt; if (d.dwell > 0.9) { d.dwell = 0; this.begin(d); return; } } else d.dwell = 0;
      }
      return;
    }
    // player validity
    if (P.dead) return this.end(false, 'Race over.'); if (G.wanted > 0) return this.end(false, 'The cops crashed the race.');
    if (!P.inCar || P.car !== a.car) { a.left += dt; if (a.left > 5) return this.end(false, 'You left your ride — race cancelled.'); } else a.left = 0;
    if (a.state === 'count') {
      a.t -= dt; const n = Math.ceil(a.t); if (n !== a.big) { a.big = n; this.bigText(n > 0 ? String(n) : 'GO!'); Snd.tone(n > 0 ? 520 : 880, n > 0 ? 0.2 : 0.5, 0.22, 'square'); }
      if (P.car === a.car) { a.car.vx = a.car.vz = 0; a.car.fs = 0; } for (const r of a.rivals) { r.car.vx = r.car.vz = 0; r.car.fs = 0; }
      if (a.t <= 0) { a.state = 'run'; setTimeout(() => { if (this.act === a) this.bigText(''); }, 900); }
    } else {
      a.time += dt; for (const r of a.rivals) this.rival(r, a, dt);
      const cp = a.cps[a.i];
      if (cp && P.car === a.car && dist(cp.x, cp.z, P.x, P.z) < 12) { a.i++; Snd.tone(a.i >= a.cps.length ? 1100 : 760, 0.18, 0.2, 'triangle'); if (a.i >= a.cps.length) { a.playerFin = true; const pos = 1 + a.rivals.filter(r => r.fin).length; const pay = [0, a.reward, Math.round(a.reward * 0.45), Math.round(a.reward * 0.15)][pos] || 0; if (pay) P.addCash(pay); if (pos === 1) G.stats.races = (G.stats.races || 0) + 1; return this.end(true, `${['', '1st', '2nd', '3rd'][pos]} place! ${pay ? '+' + money(pay) : ''}`); } }
      if (a.time > a.limit) return this.end(false, 'Out of time — race failed.');
    }
    // HUD + markers
    const cp = a.cps[a.i], nx = a.cps[a.i + 1]; if (cp) { this.m1.visible = true; this.m1.position.set(cp.x, groundY(cp.x, cp.z), cp.z); this.m1.userData.ring.rotation.z += dt * 2; } else this.m1.visible = false;
    if (nx) { this.m2.visible = true; this.m2.position.set(nx.x, groundY(nx.x, nx.z), nx.z); } else this.m2.visible = false;
    if (!Story.cur && cp) { Story.gps = { x: cp.x, z: cp.z, race: true }; }
    const rank = 1 + a.rivals.filter(r => r.fin || r.i > a.i || (r.i === a.i && cp && dist(r.car.x, r.car.z, cp.x, cp.z) < dist(P.x, P.z, cp.x, cp.z))).length;
    this.hud.style.display = 'block'; this.hud.innerHTML = `${a.def.name}<br><small>Checkpoint</small> ${Math.min(a.i + 1, a.cps.length)}/${a.cps.length} &nbsp; <small>Position</small> ${rank}/3<br><small>Time left</small> ${clock(a.limit - a.time)}`;
  },
};

// ---------------------------------------------------------------- armored truck heists
const Truck = {
  c: null, nextT: 70, hp0: 0, hold: 0, spawned: 0,
  blips() { return this.c && !this.c.looted ? [{ x: this.c.x, z: this.c.z, c: '#ffd23f', t: '$', obj: true }] : []; },
  spawn() {
    const nodes = Vehicles.nodeList || [...World.nodes.values()].filter(n => n.links.length);
    for (let k = 0; k < 40; k++) {
      const n = pick(nodes), d = dist(n.x, n.z, P.x, P.z); if (d < 140 || d > 260) continue; const to = pick(n.links), ex = to.x - n.x, ez = to.z - n.z, L = Math.hypot(ex, ez), ux = ex / L, uz = ez / L, sx = n.x + 12 * ux - uz * 3.6, sz = n.z + 12 * uz + ux * 3.6;
      if (G.cars.some(o => d2(o.x, o.z, sx, sz) < 64)) continue;
      const c = Vehicles.create('armored', sx, sz, Math.atan2(ux, uz), { mode: 'traffic', color: pick([0x2b3a55, 0xe8e8e8]) }); c.ai = { mode: 'traffic', from: n, to, cruise: 10 }; c.sleep = false; c.keep = true; c.vx = ux * 6; c.vz = uz * 6; c.armored = true;
      this.c = c; this.hp0 = c.hp; this.hold = 0; this.spawned++; UI.msg('Armored cash truck spotted nearby — marked on your map. Shoot it up, then breach the rear doors.', 4800); return;
    }
  },
  end(msg) { const c = this.c; this.c = null; this.nextT = rr(260, 460); if (msg) UI.msg(msg, 3000); if (c) { c.keep = false; } },
  prompt() {
    const c = this.c; if (!c || !c.disabled || c.looted || P.inCar) return null;
    const fx = Math.sin(c.h), fz = Math.cos(c.h), rx = c.x - fx * (CAR_TYPES.armored.len / 2 + 0.9), rz = c.z - fz * (CAR_TYPES.armored.len / 2 + 0.9); if (dist(rx, rz, P.x, P.z) > 2.8) return null;
    return { text: '<kbd>Hold E</kbd> Blow the rear doors', dur: 3.4, label: 'BREACHING TRUCK', done: () => this.loot(c, rx, rz) };
  },
  loot(c, rx, rz) {
    c.looted = true; G.stats.trucks = (G.stats.trucks || 0) + 1; for (let k = 0; k < 7; k++) Pickups.add(rx + rr(-2, 2) - Math.sin(c.h) * rr(0.5, 2.5), rz + rr(-2, 2) - Math.cos(c.h) * rr(0.5, 2.5), 'bag', ri(900, 1900), 'Cash bag');
    fxExplosion(rx, 0.8, rz); G.shake = Math.max(G.shake, 0.5); Snd.alarm && Snd.alarm(); Crime.force(3, 'Armored truck robbery'); UI.msg('Doors blown! Grab the cash bags!', 3000);
    setTimeout(() => { if (this.c === c) this.end(); }, 45000);
  },
  update(dt) {
    const c = this.c;
    if (!c) { this.nextT -= dt; if (this.nextT <= 0 && !Cut.on && !P.dead && !Story.cur) { this.nextT = 30; this.spawn(); } return; }
    if (c.wreckGone || c.wreck || c.dead) { if (!c.looted) this.end('The armored truck went up in flames — the cash is gone.'); else this.end(); return; }
    if (dist(c.x, c.z, P.x, P.z) > 560 && !c.looted) return this.end('The armored truck got away.');
    if (c.hp < this.hp0 - 2) { if (c.lastSrc === 'player' && !c.hit) { c.hit = true; Crime.raise(2, c.x, c.z, 'Attacking an armored truck'); } if (c.ai.mode === 'traffic') c.ai.panic = 99; this.hp0 = c.hp; }
    if (!c.disabled && c.hp < c.maxHp * 0.55) { c.disabled = true; c.ai.mode = 'parked'; c.sleep = false; UI.msg('Truck disabled! Get to the back and blow the doors.', 3200); }
  },
};

// ---------------------------------------------------------------- police roadblocks + spike strips
const Block = {
  items: [], t: 8, flatT: 0,
  spawn() {
    const c = P.car; if (!c || Math.hypot(c.vx, c.vz) < 8) return; const sp = Math.hypot(c.vx, c.vz), dx = c.vx / sp, dz = c.vz / sp; let pick_ = null;
    for (const dd of [200, 235, 175, 260]) { const n = nearestNode(P.x + dx * dd, P.z + dz * dd); if (!n || dist(n.x, n.z, P.x, P.z) < 125 || !n.links.length) continue;
      let best = null, ba = 0.8; for (const l of n.links) { const lx = l.x - n.x, lz = l.z - n.z, ll = Math.hypot(lx, lz), al = (lx * -dx + lz * -dz) / ll; if (al > ba) { ba = al; best = l; } } if (best) { pick_ = [n, best]; break; } }
    if (!pick_) { this.t = 3; return; }
    const [n, m] = pick_, ex = m.x - n.x, ez = m.z - n.z, L = Math.hypot(ex, ez), ux = ex / L, uz = ez / L, x = n.x + ux * 22, z = n.z + uz * 22, vx = -uz, vz = ux, h = Math.atan2(ux, uz) + Math.PI / 2;
    for (const o of G.cars) if (d2(o.x, o.z, x, z) < 100 && !o.roadblock) { o.wreckGone = true; }
    const cars = [3.6, -3.6].map(s => { const k = Vehicles.create('cop', x + vx * s, z + vz * s, h + (s > 0 ? 0.25 : -0.25), { mode: 'parked' }); k.sirenOn = true; k.keep = true; k.sleep = true; k.roadblock = true; return k; });
    const strip = new T.Group(); const sm = new T.Mesh(new T.BoxGeometry(12.5, 0.05, 0.55), new T.MeshLambertMaterial({ color: 0x1b1d22 })); strip.add(sm); for (let k = -5.5; k <= 5.5; k += 0.5) { const sp2 = new T.Mesh(new T.ConeGeometry(0.06, 0.18, 4), new T.MeshBasicMaterial({ color: 0xc8ccd4 })); sp2.position.set(k, 0.12, 0); strip.add(sp2); }
    const sx = x + ux * 9, sz = z + uz * 9; strip.position.set(sx, groundY(sx, sz) + 0.04, sz); strip.rotation.y = h; World.scene.add(strip);
    this.items.push({ cars, strip, x: sx, z: sz, ux, uz, hit: false, born: G.time }); UI.msg('Roadblock ahead! Cops have laid down spikes.', 2800);
  },
  remove(it) { for (const k of it.cars) { k.keep = false; k.wreckGone = true; } World.scene.remove(it.strip); },
  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) { const it = this.items[i], far = dist(it.x, it.z, P.x, P.z); if ((G.wanted === 0 && G.time - it.born > 8) || far > 340 || (G.time - it.born > 6 && (P.x - it.x) * it.ux + (P.z - it.z) * it.uz < -75)) { this.remove(it); this.items.splice(i, 1); } }
    const c = P.car; if (P.inCar && c && !isWater(c)) {
      for (const it of this.items) { if (it.hit) continue; const a = (c.x - it.x) * it.ux + (c.z - it.z) * it.uz, l = Math.abs((c.x - it.x) * -it.uz + (c.z - it.z) * it.ux); if (Math.abs(a) < 1.8 && l < 6.5) { it.hit = true; this.flatT = 7; c.hp -= 25; G.stats.spiked = (G.stats.spiked || 0) + 1; Snd.burst(0.5, 1400, 1, 0.7, 'bandpass', 0.3, 0.2); UI.msg('SPIKE STRIP! Tires shredded!', 2400); G.shake = Math.max(G.shake, 0.4); } }
      if (this.flatT > 0) { this.flatT -= dt; const k = Math.max(0, 1 - 1.1 * dt); c.vx *= k; c.vz *= k; c.fs *= k; c.h += Math.sin(G.time * 5) * 0.5 * dt * Math.min(1, Math.abs(c.fs) / 10); if (Math.random() < 0.5) fxSpark(c.x, 0.2, c.z, 1); }
    } else this.flatT = 0;
    if (G.wanted < 3 || !P.inCar || P.dead || isWater(c)) return; this.t -= dt;
    if (this.t <= 0) { this.t = rr(26, 42); if (this.items.length < 1) this.spawn(); }
  },
};

// ---------------------------------------------------------------- interaction polish: hit markers, cash pop-ups, prompt styling, floating E hints, footstep dust
const Polish = {
  hm: null, hints: [], dustT: 0,
  init(scene) {
    const st = document.createElement('style');
    st.textContent = `
    #prompt{background:linear-gradient(180deg,#141c30ee,#0b1020ee)!important;border:1px solid #ffd23f88!important;box-shadow:0 6px 26px #000a,0 0 18px #ffd23f33;backdrop-filter:blur(6px);animation:pIn .22s cubic-bezier(.2,.9,.3,1.3)}
    @keyframes pIn{from{opacity:0;transform:translateX(-50%) translateY(10px) scale(.92)}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}
    #prompt kbd{box-shadow:0 2px 0 #b8860b,0 0 10px #ffd23f88;animation:kpulse 1.4s ease-in-out infinite;display:inline-block}
    @keyframes kpulse{50%{box-shadow:0 2px 0 #b8860b,0 0 16px #ffd23fcc;transform:translateY(-1px)}}
    #msg div{background:linear-gradient(90deg,#141c30ee,#0b1020dd)!important;border-left:3px solid #ff4fa3;box-shadow:0 4px 16px #0008;backdrop-filter:blur(4px);border-radius:6px!important}
    #hitm{position:fixed;width:34px;height:34px;margin:-17px 0 0 -17px;pointer-events:none;z-index:4;opacity:0;left:50%;top:50%}
    #hitm i{position:absolute;width:10px;height:2px;background:#fff;box-shadow:0 0 4px #000}
    #hitm i:nth-child(1){left:3px;top:6px;transform:rotate(45deg)} #hitm i:nth-child(2){left:21px;top:6px;transform:rotate(-45deg)} #hitm i:nth-child(3){left:3px;top:26px;transform:rotate(-45deg)} #hitm i:nth-child(4){left:21px;top:26px;transform:rotate(45deg)}
    #hitm.on{animation:hm .24s ease-out} #hitm.kill i{background:#ff3b3b;width:13px;height:3px} #hitm.soft i{opacity:.65}
    @keyframes hm{0%{opacity:1;transform:scale(.7)}100%{opacity:0;transform:scale(1.55)}}
    .cashpop{position:fixed;top:58px;font-size:22px;font-weight:900;color:#6dff9a;text-shadow:0 2px 0 #000,0 0 14px #1fbf5c;pointer-events:none;z-index:7;animation:cp 1.6s ease-out forwards}
    @keyframes cp{0%{opacity:0;transform:translateY(0) scale(.7)}12%{opacity:1;transform:translateY(8px) scale(1.15)}100%{opacity:0;transform:translateY(46px) scale(1)}}`;
    document.head.appendChild(st);
    this.hm = document.createElement('div'); this.hm.id = 'hitm'; this.hm.innerHTML = '<i></i><i></i><i></i><i></i>'; document.body.appendChild(this.hm);
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    g.fillStyle = '#0b1020'; g.beginPath(); g.arc(64, 64, 58, 0, TAU); g.fill(); g.lineWidth = 7; g.strokeStyle = '#ffd23f'; g.stroke(); g.fillStyle = '#ffd23f'; g.font = '900 74px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('E', 64, 70);
    const tex = new T.CanvasTexture(c);
    for (let i = 0; i < 5; i++) { const sp = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 })); sp.scale.set(0.62, 0.62, 1); sp.renderOrder = 12; sp.visible = false; scene.add(sp); this.hints.push(sp); }
  },
  hit(kill, soft) {
    if (!this.hm) return; const cr = document.getElementById('cross'); this.hm.style.left = (cr && cr.style.left) || '50%'; this.hm.style.top = (cr && cr.style.top) || '50%';
    this.hm.className = ''; void this.hm.offsetWidth; this.hm.className = 'on' + (kill ? ' kill' : soft ? ' soft' : '');
  },
  cashPop(n) { const d = document.createElement('div'); d.className = 'cashpop'; d.textContent = '+' + money(n); d.style.right = (22 + Math.random() * 40) + 'px'; document.body.appendChild(d); setTimeout(() => d.remove(), 1700); },
  update(dt) {
    // floating "E" hints above nearby interactables
    const list = [];
    if (!P.inCar && !P.dead && !G.modal) {
      for (const a of Street.atms) { const d = dist(a.x, a.z, P.x, P.z); if (d < 15 && a.cool <= G.time) list.push({ x: a.x, z: a.z, h: 2.1, d }); }
      for (const a of Street.carts) { const d = dist(a.x, a.z, P.x, P.z); if (d < 15) list.push({ x: a.x, z: a.z, h: 3.6, d }); }
      const t = Truck.c; if (t && t.disabled && !t.looted) { const d = dist(t.x, t.z, P.x, P.z); if (d < 30) list.push({ x: t.x, z: t.z, h: 3.2, d }); }
      list.sort((a, b) => a.d - b.d);
    }
    for (let i = 0; i < this.hints.length; i++) {
      const sp = this.hints[i], it = list[i]; if (!it) { sp.visible = false; continue; }
      const fade = clamp((15 - it.d) / 6, 0, 1) * (it.d < 2.6 ? 0 : 1); sp.visible = fade > 0.02; sp.material.opacity = fade * 0.95; sp.position.set(it.x, groundY(it.x, it.z) + it.h + Math.sin(G.time * 3 + i) * 0.08, it.z); const s = 0.55 + 0.04 * Math.sin(G.time * 4 + i); sp.scale.set(s, s, 1);
    }
    // sprint dust
    if (!P.inCar && !P.dead) { const sp = Math.hypot(P.vx, P.vz); if (sp > 5 && P.y <= groundY(P.x, P.z) + 0.1) { this.dustT -= dt; if (this.dustT <= 0) { this.dustT = 0.17; fxDust(P.x - Math.sin(P.face) * 0.25, 0.08, P.z - Math.cos(P.face) * 0.25, 1); } } }
  },
};

// ---------------------------------------------------------------- realistic robberies: police response time, ski mask, dye packs, dialogue, tension
const Heist = {
  pending: [], dye: null, hbT: 0, tip: false, stage: new Map(), tense: 0, el: null, bypass: false, lastMsg: 0,
  init() {
    const st = document.createElement('style'); st.textContent = `#eta{position:fixed;top:92px;left:50%;transform:translateX(-50%);padding:6px 16px;border-radius:30px;background:#2a0b12ee;border:1px solid #ff4a5e;color:#ffd7dc;font-weight:800;font-size:14px;letter-spacing:.5px;display:none;z-index:6;pointer-events:none;animation:etap 1s ease-in-out infinite}@keyframes etap{50%{box-shadow:0 0 18px #ff4a5e99}}`; document.head.appendChild(st);
    this.el = document.createElement('div'); this.el.id = 'eta'; document.body.appendChild(this.el);
    const of = Crime.force.bind(Crime), or = Crime.raise.bind(Crime), self = this;
    Crime.force = (level, label) => {
      if (self.bypass || G.wanted >= level || !/robbery|vault/i.test(label || '') || /ATM/i.test(label || '')) return of(level, label);
      const lv = P.masked ? Math.max(1, level - 1) : level, ex = self.pending[0];
      if (ex) { ex.level = Math.max(ex.level, lv); return; }
      const eta = self.eta(); self.pending.push({ level: lv, label, t: eta, eta, x: P.x, z: P.z, masked: !!P.masked });
      if (P.masked) G.stats.maskedJobs = (G.stats.maskedJobs || 0) + 1;
      UI.msg(P.masked ? 'Silent alarm tripped — the mask will hide your face. Get out before the cops arrive!' : 'Silent alarm tripped — you were caught on camera. Get out before the cops arrive!', 3600); Snd.sting && Snd.sting('start');
    };
    Crime.raise = (level, x, z, label) => { if (P.masked && Math.random() < 0.4) return; return or(level, x, z, label); };
    const op = Shops.payout.bind(Shops); Shops.payout = s => { const amt = s.cash, who = s.robbing; op(s); self.onPayout(s, amt, who); };
  },
  eta() { let best = 1e9; for (const p of (Shops.polices || [])) best = Math.min(best, dist(p.x, p.z, P.x, P.z)); if (best > 1e8) best = 400; return clamp(12 + best / 20, 16, 75); },
  onPayout(s, amt, who) {
    const cx = who ? who.x : s.x, cz = who ? who.z : s.z;
    for (let k = 0; k < 14; k++) FX.emit(cx + rr(-.3, .3), 1.25, cz + rr(-.3, .3), rr(-2.2, 2.2), rr(1.5, 3.6), rr(-2.2, 2.2), rr(.9, 1.5), 0.2, 0.5, 0.88, 0.5, 0.9, 1);
    for (let k = 0; k < 2; k++) Pickups.add(cx + rr(-1, 1), cz + rr(-1, 1), 'cash', ri(20, 90));
    if (who) NPCs.say(who, pick(['That\'s everything, I swear.', 'Please, just go!', 'Take it. Take it all.']), 2.5);
    if (s.type === 'bank' && chance(0.45)) { this.dye = { t: rr(8, 14), amt: Math.round(amt * 0.35), from: s, told: false, beep: 0 }; }
  },
  update(dt) {
    // ski mask toggle
    if (Input.pressed('KeyX') && !P.inCar && !P.dead && !G.modal) { P.masked = !P.masked; P.actor.look.mask = P.masked; Snd.burst(0.12, 800, 1, 0.25, 'bandpass'); UI.msg(P.masked ? 'Ski mask on.' : 'Mask off.', 1300); }
    if (P.dead) { P.masked = false; P.actor.look.mask = false; }
    // hint once when drawing a gun near a business
    if (!this.tip && P.aimingGun && !P.masked) for (const s of Shops.list) if (s.type !== 'pawn' || true) { if (dist(s.x, s.z, P.x, P.z) < 16) { this.tip = true; UI.msg('Tip: press X to pull on your ski mask before a job.', 4200); break; } }
    // delayed police response
    let minT = 1e9;
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const p = this.pending[i]; p.t -= dt; minT = Math.min(minT, p.t);
      if (p.t <= 0) {
        this.pending.splice(i, 1); const d = dist(p.x, p.z, P.x, P.z);
        this.bypass = true; try {
          if (d > 170 && G.wanted === 0) { UI.news('Police arrived at the robbery — the suspect is long gone.', 'crime'); UI.msg('You got away clean. The cops found an empty scene.', 3600); G.stats.escaped = (G.stats.escaped || 0) + 1; Snd.sting('pass'); }
          else Crime.force(d > 70 ? Math.max(1, p.level - 1) : p.level, p.masked ? 'Masked robbery suspect' : 'Armed robbery suspect');
        } finally { this.bypass = false; }
      }
    }
    if (this.pending.length && G.wanted === 0) { this.el.style.display = 'block'; this.el.textContent = '🚓 POLICE ETA ' + clock(minT); } else this.el.style.display = 'none';
    // staged dialogue while the register is emptied + heartbeat tension
    let robbing = false;
    for (const s of Shops.list) if (s.robbing && s.prog > 0 && s.prog < 1) {
      robbing = true; const key = s, st = this.stage.get(key) || 0, c = s.robbing;
      const lines = [[0.12, ['Please don\'t hurt me!', 'Oh god... oh god...', 'Okay, okay, I\'m opening it!']], [0.5, ['It\'s all we have, I swear!', 'The drawer\'s stuck— okay, got it!', 'Just take it and go!']], [0.82, ['Almost there, almost...', 'That\'s all of it.', 'Please, I have a family.']]];
      for (let k = st; k < lines.length; k++) if (s.prog >= lines[k][0]) { this.stage.set(key, k + 1); NPCs.say(c, pick(lines[k][1]), 2.4); if (k === 1) Snd.cash(); break; }
    } else if (this.stage.has(s) && (!s.robbing || s.prog <= 0)) this.stage.delete(s);
    const tTarget = (robbing || (G.progress && /VAULT|ROBBING|BREACH/.test(G.progress.label))) ? 1 : 0; this.tense = lerp(this.tense, tTarget, Math.min(1, 3 * dt)); G.tense = this.tense;
    if (this.tense > 0.5) { this.hbT -= dt; if (this.hbT <= 0) { this.hbT = 0.78; Snd.tone(58, 0.16, 0.34, 'sine'); setTimeout(() => Snd.tone(52, 0.14, 0.24, 'sine'), 190); } }
    // dye pack in the bank bag
    const d = this.dye;
    if (d) {
      d.t -= dt; if (d.t < 6 && !d.told) { d.told = true; UI.msg('Something in the bag is... beeping?', 2600); }
      if (d.told) { d.beep -= dt; if (d.beep <= 0) { d.beep = 0.7; Snd.tone(2100, 0.05, 0.12, 'square'); } }
      if (d.t <= 0 && dist(d.from.x, d.from.z, P.x, P.z) > 24 && !P.dead) {
        this.dye = null; for (let k = 0; k < 36; k++) FX.emit(P.x + rr(-.3, .3), 1.1, P.z + rr(-.3, .3), rr(-2.5, 2.5), rr(.5, 3), rr(-2.5, 2.5), rr(1.2, 2.6), rr(.6, 1.3), 1, 0.12, 0.35, -0.1, 1);
        Snd.burst(0.35, 900, 1, 0.8, 'lowpass', 0.4, 0.2); G.shake = Math.max(G.shake, 0.5); G.cash = Math.max(0, G.cash - d.amt); G.stats.dyed = (G.stats.dyed || 0) + 1; P.hurt(6, 'dye');
        const L = P.actor.look; L.shirt = 0xc2243f; if (L.sleeve !== L.skin) L.sleeve = 0xc2243f; UI.msg(`DYE PACK! ${money(d.amt)} of the cash is ruined.`, 3800);
      }
    }
  },
};

// ---------------------------------------------------------------- glue
const Extras = {
  init(scene) {
    try { Ach.init(); } catch (e) { console.warn('ach', e); } try { Street.init(scene); } catch (e) { console.warn('street', e); } try { Spray.init(scene); } catch (e) { console.warn('spray', e); } try { Race.init(scene); } catch (e) { console.warn('race', e); } try { Polish.init(scene); } catch (e) { console.warn('polish', e); } try { Heist.init(); } catch (e) { console.warn('heist', e); }
    try { const used = new Set(), ini = 'ABCDEFGHJKLMNPRSTW'; for (const n of NPCs.list) { if (used.has(n.name)) { const p = n.name.split(' '), s0 = Math.floor(hashN(n.id || 0, 7) * 18); let nm = null; for (let k = 0; k < 18 && !nm; k++) { const t = p[0] + ' ' + ini[(s0 + k) % 18] + '. ' + p.slice(1).join(' '); if (!used.has(t)) nm = t; } for (let k = 2; !nm; k++) { const t = p[0] + ' ' + p.slice(1).join(' ') + ' ' + ['Jr.', 'Sr.', 'II', 'III', 'IV'][k % 5] + (k > 6 ? ' ' + k : ''); if (!used.has(t)) nm = t; } n.name = nm; } used.add(n.name); } } catch (e) { console.warn('names', e); }
  },
  update(dt) { Ach.update(dt); Radio.update(dt); Street.update(dt); Spray.update(dt); Race.update(dt); Truck.update(dt); Block.update(dt); Polish.update(dt); Heist.update(dt); },
  hit(kill, soft) { Polish.hit(kill, soft); }, cashPop(n) { Polish.cashPop(n); },
  prompt() { return Street.prompt(); },
  blips() { return [...Spray.blips(), ...Race.blips(), ...Truck.blips()]; },
};
