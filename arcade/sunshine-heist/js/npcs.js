'use strict';
// ===== NPCs: every citizen has a name, job, home, daily schedule, and can be affected by the player =====
const WALK = 1.8, ROAM = 2.2;   // path units per game-minute
const JOBS = [
  { id: 'cashier', label: 'Cashier', work: 'shop', w: 6, start: 8, dur: 8, look: 'apron', leis: ['bar', 'beach', 'park'] },
  { id: 'office', label: 'Office worker', work: 'office', w: 11, start: 9, dur: 8, look: 'suit', leis: ['bar', 'beach', 'shop'] },
  { id: 'banker', label: 'Banker', work: 'office', w: 3, start: 8.5, dur: 8.5, look: 'suit', leis: ['bar', 'beach'] },
  { id: 'concierge', label: 'Hotel concierge', work: 'hotel', w: 4, start: 7, dur: 8, look: 'bellhop', leis: ['beach', 'bar'] },
  { id: 'housekeeper', label: 'Hotel housekeeper', work: 'hotel', w: 4, start: 8, dur: 8, look: 'uniformBlue', leis: ['park', 'shop'] },
  { id: 'bartender', label: 'Bartender', work: 'bar', w: 4, start: 17, dur: 8, look: 'black', leis: ['beach', 'park'] },
  { id: 'waiter', label: 'Waiter', work: 'bar', w: 4, start: 11, dur: 8, look: 'apron', leis: ['beach', 'bar'] },
  { id: 'dock', label: 'Dock worker', work: 'industrial', w: 5, start: 6, dur: 8, look: 'overalls', leis: ['bar', 'beach'] },
  { id: 'construction', label: 'Construction worker', work: 'industrial', w: 3, start: 7, dur: 8, look: 'hivis', outdoor: 1, leis: ['bar', 'park'] },
  { id: 'lifeguard', label: 'Lifeguard', work: 'beach', w: 3, start: 9, dur: 8, look: 'lifeguard', outdoor: 1, leis: ['beach', 'bar'] },
  { id: 'vendor', label: 'Beach vendor', work: 'beach', w: 3, start: 10, dur: 7, look: 'apron', outdoor: 1, leis: ['bar', 'park'] },
  { id: 'jogger', label: 'Jogger', work: 'beach', roam: 1, w: 9, start: 6, dur: 4, look: 'jogger', fast: 1, leis: ['beach'] },
  { id: 'tourist', label: 'Tourist', work: 'hotel', roam: 1, w: 18, start: 10, dur: 9, look: 'hawaiian', leis: ['beach', 'bar'] },
  { id: 'retiree', label: 'Retiree', work: 'park', roam: 1, w: 11, start: 8, dur: 8, look: 'pastel', old: 1, leis: ['park'] },
  { id: 'local', label: 'Local resident', work: 'shop', roam: 1, w: 16, start: 9, dur: 10, look: 'casual', leis: ['park', 'shop'] },
  { id: 'nurse', label: 'Nurse', work: 'office', w: 3, start: 7, dur: 9, look: 'scrubs', leis: ['park', 'bar'] },
  { id: 'security', label: 'Security guard', work: 'shop', w: 2, start: 8, dur: 8, look: 'guard', armed: 1, leis: ['bar'] },
  { id: 'partier', label: 'Nightlife regular', work: 'bar', roam: 1, w: 11, start: 20, dur: 7, look: 'partier', leis: ['bar', 'beach'] },
  { id: 'fisher', label: 'Fisherman', work: 'beach', outdoor: 1, w: 2, start: 6, dur: 9, look: 'casual', leis: ['bar'] },
];
const JOB_TOTAL = JOBS.reduce((s, j) => s + j.w, 0);
const FIRSTS = ['Maria', 'Carlos', 'Jasmine', 'Tyrone', 'Luis', 'Ashley', 'Marcus', 'Gloria', 'Dwayne', 'Camila', 'Brandon', 'Yolanda', 'Jean', 'Rosa', 'Kevin', 'Tiffany', 'Hector', 'Brenda', 'Miguel', 'Courtney', 'Andre', 'Sofia', 'Travis', 'Lakeisha', 'Pedro', 'Megan', 'Jamal', 'Valentina', 'Cody', 'Marisol', 'Darnell', 'Heather', 'Raul', 'Destiny', 'Wayne', 'Dolores', 'Emilio', 'Britney', 'Kareem', 'Patricia', 'Jorge', 'Savannah', 'Luther', 'Ana', 'Skip', 'Imani', 'Gus', 'Nadine', 'Frankie', 'Odalys', 'Chad', 'Mirlande', 'Walter', 'Esperanza', 'Hank', 'Lucia', 'Tomas', 'Bethany', 'Rico', 'Delphine'];
const LASTS = ['Rodriguez', 'Johnson', 'Martinez', 'Williams', 'Garcia', 'Brown', 'Hernandez', 'Davis', 'Lopez', 'Gonzalez', 'Pierre', 'Jean-Baptiste', 'Perez', 'Smith', 'Sanchez', 'Ramirez', 'Cruz', 'Jackson', 'Diaz', 'Morales', 'Reyes', 'Thompson', 'Alvarez', 'Castillo', 'Ortiz', 'Mitchell', 'Vega', 'Fontaine', 'Walker', 'Rivera', 'Suarez', 'Hayes', 'Delgado', 'Brooks', 'Mendez', 'Pruitt', 'Cabrera', 'Dubois', 'Acosta', 'Baxter', 'Navarro', 'Tucker', 'Padilla', 'Gallagher', 'Kowalski', 'Santiago', 'Beauchamp', 'Whitaker'];
const SCREAMS = ['AAAH!', 'Call 911!', 'He has a gun!', 'RUN!!', 'Oh my God!', 'Somebody help!', 'Not today, not today!', 'Get down!'];
const PLEAS = ['Please, take it!', "Don't shoot!", 'I have kids!', 'Okay okay okay!', 'I never saw you!', 'Take whatever you want!', 'Easy, easy!'];
const CHAT = ['Beautiful day in Florida.', 'Watch it, pal!', 'Humidity is killing me.', 'Is it hurricane season already?', 'Go Dolphins!', 'Love this sunshine.', 'Cuban coffee, then work.', 'Tourists...', 'Gators in the pond again.', 'Did you see that sunrise?', 'Traffic is brutal.'];
const LOOT_ITEMS = [{ n: 'Gold Chain', v: 260 }, { n: 'Smartphone', v: 160 }, { n: 'Fake Rolex', v: 120 }, { n: 'Diamond Ring', v: 900 }, { n: 'Laptop', v: 420 }, { n: 'Designer Sunglasses', v: 140 }, { n: 'Wallet Watch', v: 210 }, { n: 'Gold Bracelet', v: 340 }];
const GREET = ['Morning!', 'Hey there.', 'How you doing?', 'Nice day, huh?', 'Hola!', 'Bonjour!', 'Sup.', 'Beautiful weather.'];
const WARY = ['Whoa, whoa...', 'Is that a real gun?!', 'Easy, buddy.', 'Put that away!', 'Oh no...', 'Not here, please.'];
const PAIR_CHAT = ['...and then she says "it\'s fine."', 'Did you see the game?', 'We should get Cuban sandwiches.', 'My landlord is a pelican, I swear.', 'It\'s too hot for this.', 'I heard it\'s gonna storm.', 'Ha! No way.', 'Did you lock the car?', 'I need a vacation from my vacation.', 'You won\'t believe my cousin.', 'Let\'s hit the beach after.', 'Traffic was insane.'];
const JOB_LINES = {
  cashier: ['Eight-hour shifts, four-dollar tips. Living the dream.', 'Somebody robbed the gas station on the highway last week. Nobody got hurt, thank God.'], office: ['Another day, another spreadsheet.', 'The AC in my building has two settings: arctic and swamp.'],
  banker: ['The vault is on a time lock. Not that I\'d tell you that.', 'Stay away from the First Florida branch on a Friday. Everyone\'s paranoid.'], concierge: ['The Art Deco hotels have the best sunrise views.', 'Tourists tip in sunscreen, I swear.'],
  bartender: ['Rough crowd tonight. Always is.', 'Pour one out for the guy who tried to dine and dash on a jet ski.'], dock: ['Cranes never stop at the Port. Neither do I.', 'Heard some strange boats leaving at midnight.'],
  lifeguard: ['Rip currents out there today, stay near the pier.', 'I\'ve pulled out eleven people this summer. Ten were wearing socks with sandals.'], tourist: ['We\'re from Ohio! Is it always this humid?!', 'Is it true there are alligators in the swimming pools?'],
  jogger: ['Can\'t talk, doing my miles!', 'Best run is the beach at sunrise.'], retiree: ['Back in my day, this was all orange groves.', 'I\'ve outlived three hurricanes and two husbands.'], local: ['Welcome to Florida. Bring bug spray.', 'If it rains, wait ten minutes. Or two hours.'],
  security: ['Move along, nothing to see.', 'They don\'t pay me enough to be a hero.'], nurse: ['Wash your hands. And mind the sun.', 'The ER has been slammed with sunburns.'], vendor: ['Cold drinks! Two for five!', 'Sunglasses, hats, cold coconuts!'],
  waiter: ['Special today is the grouper. Don\'t ask what it was yesterday.'], construction: ['It\'s a hundred degrees and I\'m wearing a vest. Great.'], partier: ['The night\'s just getting started!'], fisher: ['They\'re not biting. They never are.'],
};
const ACTIVE_R = 170, MAX_ACTIVE = 200;

const NPCs = {
  list: [], pathBudget: 0, scanT: 0,
  init(count) {
    const total = JOB_TOTAL;
    for (let i = 0; i < count; i++) {
      let r = rnd() * total, job = JOBS[0]; for (const j of JOBS) { r -= j.w; if (r <= 0) { job = j; break; } }
      this.list.push(this.make(job, i));
    }
    for (let k = 0; k < this.list.length - 1; k++) {
      if (!chance(0.12)) continue; const a = this.list[k], b = this.list[k + 1]; if (a.fixed || b.fixed || a.partner || b.partner) continue;
      Object.assign(b, { home: a.home, work: a.work, leis: a.leis, leisTag: a.leisTag, job: a.job, jobLabel: a.jobLabel, jit: a.jit }); b.look = makeLook(a.job.look); b.partner = a; a.partner = b; a.sideOff = -0.6; b.sideOff = 0.6; k++;
    }
  },
  pickAnchor(tag, near, k) {
    const arr = World.anchors[tag] && World.anchors[tag].length ? World.anchors[tag] : World.anchors.home;
    const s = arr.map(a => ({ a, d: near ? d2(a.x, a.z, near.x, near.z) : rnd() })).sort((p, q) => p.d - q.d); return s[Math.floor(rnd() * Math.min(k, s.length))].a;
  },
  make(job, id) {
    const first = pick(FIRSTS), last = pick(LASTS), age = job.old ? ri(63, 86) : job.id === 'partier' ? ri(21, 38) : ri(19, 64);
    const home = pick(World.anchors.home), work = this.pickAnchor(job.work, home, 12);
    const lt = pick(job.leis), leis = this.pickAnchor(lt, work, 20);
    const family = age < 25 ? pick(['Lives with roommates.', 'Still lives with their parents.', 'Saving up for a boat.']) : age < 40 ? pick(['Single.', 'Married.', 'Married, one kid.', 'Engaged.', 'Single mom of two.', 'Has a rescue greyhound.']) : age < 62 ? pick(['Married, two kids.', 'Divorced, one daughter.', 'Single.', 'Married, three kids.', 'Coaches little league.']) : pick(['Widowed, five grandkids.', 'Married forty years.', 'Plays dominoes every Sunday.', 'Volunteers at the church.']);
    const n = {
      kind: 'npc', id, first, last, name: first + ' ' + last, age, job, jobLabel: job.label, family, home, work, leis, leisTag: lt,
      armed: job.armed || chance(0.07), cash: ri(15, 220) * (job.id === 'banker' ? 4 : 1), look: makeLook(job.look), pose: newPose(),
      alive: true, active: false, hp: ri(70, 100), state: 'sched', ready: false, x: 0, y: 0, z: 0, yaw: 0, gun: null, removed: false, fear: 0, bubble: null, jit: rr(-25, 25),
    }; n.maxhp = n.hp; return n;
  },
  createFixed(opts) { // clerks, guards, tellers
    const first = pick(FIRSTS), last = pick(LASTS), n = {
      kind: 'npc', id: 100000 + this.list.length, first, last, name: first + ' ' + last, age: ri(24, 58), job: { id: opts.job || 'clerk', label: opts.label, outdoor: 0 }, jobLabel: opts.label,
      family: pick(['Married, two kids.', 'Single.', 'Works double shifts.', 'Putting a kid through college.']), armed: !!opts.armed, cash: ri(40, 300), look: makeLook(opts.look || 'apron'), pose: newPose(), alive: true, active: false, hp: opts.hp || 70, state: 'sched', ready: true,
      fixed: { x: opts.x, z: opts.z, yaw: opts.yaw }, shop: opts.shop, x: opts.x, y: 0, z: opts.z, yaw: opts.yaw, gun: null, removed: false, fear: 0, bubble: null, role: opts.role || 'clerk', hidden: false,
    }; n.maxhp = n.hp; if (opts.armed) n.gun = { len: 0.3 }; this.list.push(n); return n;
  },
  ensure(n) {
    if (n.ready) return true; if (this.pathBudget <= 0) return false; this.pathBudget--;
    const A = n.home, W = n.work, Lz = n.leis, job = n.job;
    n.p1 = routePed(A, W); n.d1 = n.p1.len / WALK; n.W = job.dur * 60;
    n.p2 = null; n.d2 = 0; n.Ldur = 0; n.p3 = null; n.d3 = 0;
    if (job.roam) {
      n.p2 = routePed(W, Lz); const L = Math.max(30, n.p2.len), spd = (job.fast ? ROAM * 1.7 : ROAM * 0.7), per = 2 * L / spd; n.rspd = spd; n.W = Math.max(1, Math.round(job.dur * 60 / per)) * per; n.p3 = routePed(W, A); n.d3 = n.p3.len / WALK;
    } else {
      const p2 = routePed(W, Lz), p3 = routePed(Lz, A), Ld = ri(60, 200); const d2m = p2.len / WALK, d3m = p3.len / WALK;
      if (n.d1 + n.W + d2m + Ld + d3m < 1400) { n.p2 = p2; n.d2 = d2m; n.Ldur = Ld; n.p3 = p3; n.d3 = d3m; } else { n.p3 = routePed(W, A); n.d3 = n.p3.len / WALK; }
    }
    n.leave = ((job.start * 60 + n.jit - n.d1) % 1440 + 1440) % 1440; n.ready = true; n.wx = rr(-1.2, 1.2); n.wz = rr(-1.2, 1.2); return true;
  },
  // schedule: returns mode 'walk' | 'idle' | 'hidden' and sets n.sx,sz,syaw,sspd
  sched(n, tod) {
    const m = this._sched(n, tod); n.mode = m; if (n.partner && n.sideOff && m !== 'hidden') { n.sx += Math.cos(n.syaw) * n.sideOff; n.sz -= Math.sin(n.syaw) * n.sideOff; } return m;
  },
  _sched(n, tod) {
    if (n.fixed) { n.sx = n.fixed.x; n.sz = n.fixed.z; n.syaw = n.fixed.yaw; n.sspd = 0; return n.shop && !n.shop.open() ? 'hidden' : 'idle'; }
    let t = (tod - n.leave + 1440) % 1440, p;
    const out = (path, s, rev) => { const q = pathAt(path, s); n.sx = q[0]; n.sz = q[1]; n.syaw = q[2] + (rev ? Math.PI : 0); };
    if (t < n.d1) { out(n.p1, t * WALK); n.sspd = WALK; return 'walk'; } t -= n.d1;
    if (t < n.W) {
      if (n.job.roam) { const L = n.p2.len, u = (t * n.rspd) % (2 * L), s = u < L ? u : 2 * L - u; out(n.p2, s, u >= L); n.sspd = n.rspd; return 'walk'; }
      if (n.job.outdoor) { const e = n.work; n.sx = e.tx + n.wx; n.sz = e.tz + n.wz; n.syaw = Math.sin(G.time * 0.1 + n.id) * 2; n.sspd = 0; return 'idle'; }
      return 'hidden';
    } t -= n.W;
    if (n.p2 && !n.job.roam) {
      if (t < n.d2) { out(n.p2, t * WALK); n.sspd = WALK; return 'walk'; } t -= n.d2;
      if (t < n.Ldur) { if (n.leisTag === 'beach' || n.leisTag === 'park') { const e = n.leis; n.sx = e.tx + n.wx * 2; n.sz = e.tz + n.wz * 2; n.syaw = n.id; n.sspd = 0; return 'idle'; } return 'hidden'; } t -= n.Ldur;
    }
    if (t < n.d3) { out(n.p3, t * WALK); n.sspd = WALK; return 'walk'; }
    return 'hidden';
  },
  activate(n) {
    n.active = true; n.x = n.sx; n.z = n.sz; n.y = 0; n.yaw = n.syaw; n.state = 'sched'; n.pose.dead = 0; n.pose.hands = 0; n.pose.aim = 0; n.fear = 0; n.hidden = false;
    if (n.armed) n.gun = n.gun || { len: 0.3 }; if (!G.actives.includes(n)) G.actives.push(n);
  },
  deactivate(n) { n.active = false; const i = G.actives.indexOf(n); if (i >= 0) G.actives.splice(i, 1); },
  scan() {
    const px = P.x, pz = P.z; let activeN = 0; for (const a of G.actives) if (a.kind === 'npc') activeN++;
    // release distant
    for (const n of G.actives.slice()) { if (n.kind !== 'npc') continue; if (n.state === 'hostage') continue; const d = dist(n.x, n.z, px, pz); if (d > ACTIVE_R + 50 && !(n.state === 'dead' && d < 80)) { if (n.state === 'sched' || n.state === 'dead' || d > 300) { this.deactivate(n); if (n.state === 'dead') n.removed = true; else if (n.state !== 'sched') n.state = 'sched'; } } }
    this.pathBudget = 160;
    for (const n of this.list) {
      if (n.active || !n.alive || n.removed) continue; if (Weather.rain > 0.65 && !n.fixed && n.id % 3 !== 0) continue;
      if (n.fixed) { if (d2(n.fixed.x, n.fixed.z, px, pz) < ACTIVE_R * ACTIVE_R * 0.5 && activeN < MAX_ACTIVE) { if (this.sched(n, G.tod) !== 'hidden') { this.activate(n); activeN++; } } continue; }
      if (d2(n.home.x, n.home.z, px, pz) > 520 * 520 && d2(n.work.x, n.work.z, px, pz) > 520 * 520) continue;
      if (!this.ensure(n)) continue;
      const m = this.sched(n, G.tod); if (m === 'hidden') continue;
      if (d2(n.sx, n.sz, px, pz) < ACTIVE_R * ACTIVE_R && activeN < MAX_ACTIVE) { this.activate(n); activeN++; }
    }
  },
  say(n, text, dur = 2.4) { n.bubble = { text, t: dur }; },
  scare(n, tx, tz, sec, line = true) {
    if (!n.alive || n.state === 'hostage' || n.state === 'dead') return; if (n.callCrime) { n.pendingCrime = n.callCrime; n.callCrime = null; } n.pose.phone = 0;
    if (n.fear <= 0 && line && chance(0.7)) { this.say(n, pick(SCREAMS)); Snd.scream(); }
    n.fear = Math.max(n.fear, sec); n.threat = { x: tx, z: tz };
    if (n.state !== 'fight') n.state = 'flee';
  },
  // loud event (gunshots etc.). source: 'player' | 'cop' ...
  alarm(x, z, radius, source) {
    for (const n of G.actives) {
      if (n.kind !== 'npc' || !n.alive || n.state === 'hostage' || n.state === 'dead') continue; const d = dist(n.x, n.z, x, z); if (d > radius) continue; n.pose.startle = 1; n.pose.act = null; n.pose.actB = 0;
      if (n.armed && source === 'player' && (n.state === 'sched' || n.state === 'return') && chance(0.35) && !n.fixed) { n.state = 'fight'; n.fightT = 25; n.gun = n.gun || { len: 0.3 }; this.say(n, pick(['Not in my state!', 'Florida says no!', 'Drop it!'])); }
      else if (n.role === 'guard' && source === 'player') { n.state = 'fight'; n.fightT = 40; }
      else if (n.state !== 'handsup' || chance(0.3)) this.scare(n, x, z, rr(8, 16));
    }
  },
  update(dt) {
    this.scanT -= dt; if (this.scanT <= 0) { this.scanT = 0.45; this.scan(); this.socT = (this.socT || 0) + 1; if (this.socT % 2 === 0) this.social(); }
    for (let i = G.actives.length - 1; i >= 0; i--) {
      const n = G.actives[i]; if (n.kind !== 'npc') continue; this.step(n, dt);
    }
  },
  ambient(n, m, dt, dP) {
    const p = n.pose; n.talkGest = false; n.sit = m === 'idle' && (n.job && n.job.id === 'fisher' || (n.leisTag === 'beach' && n.id % 3 === 0 && n.job && !n.job.outdoor));
    if (n.phoneT > 0) { n.phoneT -= dt; p.phone = lerp(p.phone, 1, 6 * dt); } else { p.phone = lerp(p.phone, 0, 6 * dt); if (m === 'walk' && !n.umb && !n.fixed && Math.random() < dt * 0.006) n.phoneT = rr(6, 16); }
    if (n.waveT > 0) { n.waveT -= dt; p.wave = lerp(p.wave, 1, 8 * dt); } else p.wave = lerp(p.wave, 0, 8 * dt);
    n.lie = m === 'idle' && !n.fixed && n.leisTag === 'beach' && n.id % 4 === 0 && n.job && !n.job.outdoor; if (n.lie) n.sit = false;
    // idle acts: pick something human to do while standing around
    if (m === 'idle' && !n.fixed && !n.partner) {
      n.actWait = (n.actWait === undefined ? rr(1, 6) : n.actWait) - dt;
      if (n.actTimer > 0) { n.actTimer -= dt; p.actB = lerp(p.actB || 0, 1, 4 * dt); if (p.act === 'smoke' && p.actB > 0.7 && Math.random() < dt * 0.9) fxSmoke(n.x + Math.sin(n.yaw) * 0.25, 1.65, n.z + Math.cos(n.yaw) * 0.25, 0.6); }
      else { p.actB = lerp(p.actB || 0, 0, 5 * dt); if (p.actB < 0.03) { p.act = null; if (n.actWait <= 0) { n.actWait = rr(3, 9); const night = G.night > 0.3; const opts = n.job && n.job.id === 'fisher' ? ['fish'] : (n.job && n.job.id === 'partier' && night) || (n.leisTag === 'bar' && night && n.id % 2 === 0) ? ['dance', 'dance', 'drink', 'text'] : ['arms', 'hips', 'watch', 'scratch', 'stretch', 'look', 'text', 'drink', 'yawn', 'smoke', 'look', 'tap', 'laugh', 'shrug', 'lookup']; p.act = pick(opts); n.actTimer = rr(4, 9); } } }
    } else { p.actB = lerp(p.actB || 0, 0, 6 * dt); if (p.actB < 0.03) p.act = null; n.actTimer = 0; }
    p.panic = lerp(p.panic || 0, 0, 6 * dt); p.struggle = lerp(p.struggle || 0, 0, 6 * dt);
    n.lookAt = (dP < 10 && !P.inCar && !n.fixed) ? { x: P.x, z: P.z } : null;
    if (dP < 3.4 && !n.fixed && !P.inCar && !n.greeted && !P.armed) { n.greeted = true; if (chance(0.4)) { this.say(n, pick(GREET), 2.2); if (chance(0.5)) n.waveT = 1.6; } }
    if (P.armed && !P.aimingGun && dP < 7 && !n.wary && !n.fixed) { n.wary = true; this.say(n, pick(WARY), 2.4); if (chance(0.3)) this.scare(n, P.x, P.z, 3.5, false); } else if (!P.armed) n.wary = false;
    p.hammer = lerp(p.hammer, n.job && n.job.id === 'construction' && m === 'idle' ? 1 : 0, 6 * dt);
    const pt = (n.partner && n.partner.active && n.partner.alive && n.partner.state === 'sched' && dist(n.x, n.z, n.partner.x, n.partner.z) < 4.5) ? n.partner : (m === 'idle' && n.chatWith && n.chatWith.active && n.chatWith.alive && n.chatWith.state === 'sched' ? n.chatWith : null);
    if (pt) { const spk = Math.floor((G.time + n.id * 1.7) / 4.5) % 2 === 0; n.talkGest = spk; if (m !== 'walk') { n.lookAt = { x: pt.x, z: pt.z }; n.yaw = turnToward(n.yaw, Math.atan2(pt.x - n.x, pt.z - n.z), 3 * dt); } if (spk && !n.bubble && Math.random() < dt * 0.15) this.say(n, pick(PAIR_CHAT), 3.4); }
  },
  social() { // every ~0.7s: pair up idle strangers and react to corpses
    const act = G.actives.filter(a => a.kind === 'npc' && a.alive && a.state === 'sched' && !a.story);
    for (const n of act) { if (n.mode !== 'idle' || (n.chatWith && n.chatWith.active && n.chatWith.alive)) continue; let b = null, bd = 12; for (const o of act) { if (o === n || o.mode !== 'idle' || o.chatWith) continue; const d = d2(n.x, n.z, o.x, o.z); if (d < bd) { bd = d; b = o; } } if (b) { n.chatWith = b; b.chatWith = n; } }
    const bodies = G.actives.filter(a => a.kind === 'npc' && a.state === 'dead' && a.deadT < 70 && !a.fixed);
    if (!bodies.length) return;
    for (const n of act) { if (n.fixed || n.shockSeen) continue; for (const b of bodies) { if (d2(n.x, n.z, b.x, b.z) > 100 || !losClear(n.x, n.z, b.x, b.z, 1.4)) continue; n.shockSeen = b; n.state = 'call'; n.callFace = { x: b.x, z: b.z }; n.phoning = !b.called && chance(0.7); n.callT = rr(4.5, 7);
        if (n.phoning) { b.called = true; n.callCrime = b.killer === 'player' ? { level: 2, label: 'Homicide reported' } : null; this.say(n, pick(['Oh my God... 911!', 'Someone\'s dead! Call the police!', 'Hello?! There\'s a body!']), 4); } else this.say(n, pick(['Oh no...', 'Is he breathing?!', 'Don\'t look!', 'Jesus...']), 3); break; }
    }
  },
  talk(n) {
    n.state = 'call'; n.phoning = false; n.callT = 4.8; n.callFace = { x: P.x, z: P.z }; n.callCrime = null;
    const lines = JOB_LINES[n.job && n.job.id] || ['Nice day, huh?', 'Florida, man.']; let txt = pick(lines);
    if (chance(0.4) && Shops.list.length) { const s = pick(Shops.list); txt = pick([`Word is ${s.name} keeps a lot of cash behind the counter.`, `Stay away from ${s.name} — the cops sit outside.`, `${s.name}? Cheapest in town, and nobody asks questions.`]); }
    UI.msg('You: "Hey, got a minute?"', 1600); setTimeout(() => this.say(n, txt, 5), 700);
  },
  walkAnim(n, spd, dt) { const p = n.pose; p.walk = lerp(p.walk, clamp(spd / 2.6, 0, 1.5), Math.min(1, 10 * dt)); stepPhase(p, spd, dt); p.hit = p.hit || 0; },
  moveTo(n, tx, tz, speed, dt, face = true) {
    const dx = tx - n.x, dz = tz - n.z, d = Math.hypot(dx, dz); if (d < 0.05) return 0;
    const step = Math.min(d, speed * dt); n.x += dx / d * step; n.z += dz / d * step; if (face) n.yaw = turnToward(n.yaw, Math.atan2(dx, dz), 10 * dt);
    const r = resolveCircle(n, 0.4, 0); if (!walkable(n.x, n.z)) { n.x -= dx / d * step; n.z -= dz / d * step; } return step / dt;
  },
  step(n, dt) {
    if (n.story) { Story.charStep(n, dt); return; }
    const p = n.pose; if (n.bubble) { n.bubble.t -= dt; if (n.bubble.t <= 0) n.bubble = null; }
    if (n.state === 'dead') { p.dead = Math.min(1, p.dead + dt * 3.2); p.hands = 0; p.aim = 0; p.walk = 0; n.deadT += dt; if (n.deadT > 90) { this.deactivate(n); n.removed = true; } return; }
    if (n.vx || n.vz) { n.x += n.vx * dt; n.z += n.vz * dt; n.vx *= 0.9; n.vz *= 0.9; if (Math.abs(n.vx) + Math.abs(n.vz) < 0.2) n.vx = n.vz = 0; resolveCircle(n, 0.4, 0); }
    const px = P.x, pz = P.z, dP = dist(n.x, n.z, px, pz);
    // aimed at by the player?
    if (P.aimingGun && n.state !== 'hostage' && !n.fixedFight && dP < 16 && P.canSee(n) && n.state !== 'fight') {
      if (n.role === 'guard') { n.state = 'fight'; n.fightT = 40; } else if (n.state !== 'handsup' && n.state !== 'flee') { if (n.armed && chance(0.3) && !n.fixed) { n.state = 'fight'; n.fightT = 20; n.gun = n.gun || { len: 0.3 }; } else if (chance(0.7) || n.fixed) { n.state = 'handsup'; this.say(n, pick(PLEAS)); n.handsT = 0; } else this.scare(n, px, pz, 10); }
      if (n.state === 'handsup') n.handsT = 0;
    }
    switch (n.state) {
      case 'sched': {
        const m = this.sched(n, G.tod);
        if (m === 'hidden') { if (dP > 25 || !P.canSee(n)) { this.deactivate(n); return; } }
        n.umb = Weather.rain > 0.22 && (n.id % 5) < 3 && m === 'walk'; n.umbCol = BRIGHTS[n.id % BRIGHTS.length];
        const ox = n.x, oz = n.z; n.x = n.sx; n.z = n.sz; n.yaw = n.fixed ? n.yaw : (m === 'walk' ? n.syaw : n.yaw); if (n.fixed) n.yaw = turnToward(n.yaw, Math.atan2(px - n.x, pz - n.z) * (dP < 6 ? 1 : 0) + (dP < 6 ? 0 : n.fixed.yaw), 3 * dt);
        const sp = dist(ox, oz, n.x, n.z) / Math.max(dt, 0.001); this.walkAnim(n, Math.min(sp, 7), dt); p.hands = lerp(p.hands, 0, 8 * dt);
        this.ambient(n, m, dt, dP);
        break;
      }
      case 'handsup': {
        n.handsT += dt; p.hands = lerp(p.hands, 1, 10 * dt); this.walkAnim(n, 0, dt); n.yaw = turnToward(n.yaw, Math.atan2(px - n.x, pz - n.z), 5 * dt);
        if (!P.aimingGun || dP > 20 || n.handsT > 1.5) { if (!(n.shop && n.shop.robbing === n)) { if (n.handsT > 1.5 || !P.aimingGun) { n.state = n.fixed ? 'return' : 'flee'; n.fear = rr(6, 12); n.threat = { x: px, z: pz }; if (n.shop && n.shop.robbedRecently) n.fear = 4; } } }
        if (n.shop && n.shop.robbing === n) n.handsT = 0;
        break;
      }
      case 'flee': {
        p.hands = lerp(p.hands, 0, 8 * dt); p.panic = lerp(p.panic || 0, n.fixed ? 0.5 : 1, 8 * dt); p.act = null; p.actB = 0; n.fear -= dt; const th = n.threat || { x: px, z: pz };
        let ax = n.x - th.x, az = n.z - th.z, l = Math.hypot(ax, az) || 1; ax /= l; az /= l;
        n.fleeAng = (n.fleeAng || 0) + rr(-1, 1) * dt * 2; const c = Math.cos(n.fleeAng), s = Math.sin(n.fleeAng), dx = ax * c - az * s, dz = ax * s + az * c;
        const sp = this.moveTo(n, n.x + dx * 5, n.z + dz * 5, n.fixed ? 5 : 6.2, dt); this.walkAnim(n, 6.2, dt);
        if (_rc.hit) n.fleeAng += 1.2 * (chance(.5) ? 1 : -1);
        if (n.fear <= 0) { n.state = 'return'; if (n.pendingCrime) { Crime.force(n.pendingCrime.level, n.pendingCrime.label); n.pendingCrime = null; } }
        break;
      }
      case 'return': {
        let tx, tz; if (n.fixed) { tx = n.fixed.x; tz = n.fixed.z; } else { const m = this.sched(n, G.tod); if (m === 'hidden') { this.deactivate(n); n.state = 'sched'; return; } tx = n.sx; tz = n.sz; }
        const d = dist(n.x, n.z, tx, tz); if (d > 400) { n.x = tx; n.z = tz; } const sp = this.moveTo(n, tx, tz, 3.2, dt); this.walkAnim(n, sp, dt);
        if (d < 2.5) n.state = 'sched'; p.hands = lerp(p.hands, 0, 8 * dt);
        break;
      }
      case 'fight': {
        n.fightT -= dt; p.hands = 0; const los = dP < 40 && losClear(n.x, n.z, px, pz, 1.5);
        n.yaw = turnToward(n.yaw, Math.atan2(px - n.x, pz - n.z), 8 * dt);
        if (los && dP < 22) { p.aim = lerp(p.aim, 1, 10 * dt); this.walkAnim(n, 0, dt); n.shootT = (n.shootT || 0.8) - dt; if (n.shootT <= 0) { n.shootT = rr(0.7, 1.4); this.npcShoot(n); } if (dP > 14) this.moveTo(n, px, pz, 2.4, dt); else if (dP < 6) this.moveTo(n, n.x + (n.x - px), n.z + (n.z - pz), 2, dt, false); }
        else { p.aim = lerp(p.aim, 0, 10 * dt); const sp = this.moveTo(n, px, pz, 3.4, dt); this.walkAnim(n, sp, dt); }
        if (n.fightT <= 0 || P.dead) { n.state = 'flee'; n.fear = 6; n.threat = { x: px, z: pz }; p.aim = 0; }
        break;
      }
      case 'call': {
        n.callT -= dt; const f = n.callFace || { x: P.x, z: P.z }; n.yaw = turnToward(n.yaw, Math.atan2(f.x - n.x, f.z - n.z), 5 * dt); n.lookAt = f; this.walkAnim(n, 0, dt); p.phone = lerp(p.phone, n.phoning ? 1 : 0, 8 * dt); p.hands = lerp(p.hands, n.phoning ? 0 : 0.0, 8 * dt); p.scared = !n.phoning;
        if (n.callT <= 0) { p.phone = 0; p.scared = false; if (n.callCrime) { Crime.force(n.callCrime.level, n.callCrime.label); n.callCrime = null; } n.state = 'return'; n.phoning = false; }
        break;
      }
      case 'hostage': break; // driven by the player
    }
    if (n.state !== 'fight') p.aim = lerp(p.aim, 0, 10 * dt);
    p.anger = lerp(p.anger || 0, n.state === 'fight' ? 1 : 0, 6 * dt); p.fear = lerp(p.fear || 0, (n.state === 'flee' || n.state === 'handsup' || n.state === 'hostage') ? 1 : 0, 8 * dt); p.smile = lerp(p.smile || 0, ((n.partner || n.chatWith) && n.state === 'sched' && n.talkGest) || n.waveT > 0 ? 0.8 : 0, 3 * dt);
  },
  npcShoot(n) {
    Snd.shot('pistol', Math.max(0.2, 1 - dist(n.x, n.z, P.x, P.z) / 60)); n.pose.recoil = 1; if (typeof Guns !== 'undefined') { Guns.flash(n, 0.8); Guns.eject(n); }
    const acc = P.inCar ? 0.18 : 0.32; if (chance(P.hostage && chance(0.5) ? 0.05 : acc)) { P.hurt(rr(5, 9), 'bullet'); Snd.hit(); }
    this.addTracer(n.x, 1.4, n.z, P.x, 1.2, P.z);
  },
  addTracer(x0, y0, z0, x1, y1, z1) { G.bullets.push({ x0, y0, z0, x1, y1, z1, t: 0.09 }); },
  die(n, src) {
    let dk = 0; if (n.lastHow === 'explosion' || n.lastHow === 'car' || n.lastHow === 'fire') dk = 4; else { const sx = P.x - n.x, sz = P.z - n.z, l = Math.hypot(sx, sz) || 1, fx = Math.sin(n.yaw), fz = Math.cos(n.yaw), d = (fx * sx + fz * sz) / l, cr = (fx * sz - fz * sx) / l; dk = Math.abs(d) > 0.55 ? (d > 0 ? 0 : 1) : (cr > 0 ? 2 : 3); }
    n.deathType = dk; n.lie = false; n.sit = false; n.pose.act = null; n.pose.actB = 0; n.pose.panic = 0; n.pose.phone = 0; n.killer = src; n.alive = false; n.state = 'dead'; n.deadT = 0; n.pose.hands = 0; n.pose.aim = 0; n.gun = n.gun && n.armed ? n.gun : null; if (n.id < 100000) G.killedIds.add(n.id); n.bubble = null;
    if (src === 'player') G.stats.kills++;
    const age = n.age; if (!n.quiet) UI.news(`${n.name}, ${age}, ${n.jobLabel.toLowerCase()} — ${src === 'player' ? 'shot dead' : 'killed'}. ${n.family}`, 'dead');
    Pickups.add(n.x, n.z, 'cash', n.cash, 'Cash'); if (chance(0.45)) { const it = pick(LOOT_ITEMS); Pickups.add(n.x + rr(-.6, .6), n.z + rr(-.6, .6), 'item', it.v, it.n); }
    if (n.shop) { n.shop.onClerkDown && n.shop.onClerkDown(n); }
    if (n.armed && n.gun && !n.fixed && chance(0.5)) Pickups.add(n.x + .5, n.z, 'ammo', 15, 'Pistol ammo');
  },
};
