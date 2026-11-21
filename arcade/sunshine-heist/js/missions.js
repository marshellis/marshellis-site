'use strict';
// ===== The story of Sunshine Heist: 12 main missions + side jobs =====
(function () {
  const Q = (who, text, o) => Object.assign({ who, text }, o || {});
  const J = (t, o) => Q('jax', t, o), LZ = (t, o) => Q('luz', t, o), DX = (t, o) => Q('dex', t, o), BN = (t, o) => Q('boone', t, o), VN = (t, o) => Q('vance', t, o), GS = (t, o) => Q('gus', t, o), FN = (t, o) => Q('finch', t, o);
  const pier = () => Story.pos.pier, garage = () => Story.pos.garage, lh = () => Story.pos.lighthouse, pad = () => Story.pos.pad;
  const pierSet = (more) => Object.assign({ jax: [pier().x, pier().z - 2], luz: [pier().x + 2.6, pier().z - 1] }, more || {});
  const garSet = () => ({ jax: [garage().x, garage().z], dex: [garage().x + 2.4, garage().z + 1] });
  const bank = () => Shops.list.filter(s => s.type === 'bank')[0];
  const hasItem = n => G.inv.some(i => i.n === n);
  const robs = (rt, type) => G.robLog.slice(rt.base.rob).filter(r => !type || r.type === type).length;
  const earned = rt => G.stats.earned - rt.base.earned;
  const luzSpot = dx => () => ({ x: pier().x - 6 + (dx || 0), z: pier().z });
  const dexSpot = dx => () => ({ x: garage().x + (dx || 0), z: garage().z });

  function spawnPeople(n, cx, cz, spread, o) { const out = []; for (let i = 0; i < n; i++) { const a = rr(0, TAU), d = rr(spread * 0.5, spread); let x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d; const t = { x, z }; resolveCircle(t, 0.5, 0); const g = Story.goon(t.x, t.z, Object.assign({ rifle: false }, typeof o === 'function' ? o(i) : o)); out.push(g); } return out; }

  Story.spawnHeli = function (x, z) {
    const grp = new T.Group(), gb = new GB(); gb.box(-1.4, -1, -3.2, 1.4, 1.3, 2.6, 0xf4f4f4); gb.box(-.35, -.1, 2.6, .35, .7, 9, 0xf4f4f4); gb.box(-1.0, .4, -2.2, 1.0, 1.3, .6, 0x1c2a3a); gb.box(-1.5, -1.2, -1.2, 1.5, -.9, 1.2, 0xd02a2a); gb.box(-.1, .6, 8.2, .1, 2.4, 9.2, 0xd02a2a); gb.box(-.6, 1.3, -.5, .6, 1.8, .5, 0x333333);
    const body = gb.build(new T.MeshLambertMaterial({ vertexColors: true }), true), rotor = new T.Mesh(new T.BoxGeometry(13, 0.07, 0.4), new T.MeshLambertMaterial({ color: 0x111111 })); rotor.position.y = 2; grp.add(body); grp.add(rotor);
    const h = { x, y: 1.5, z, hp: 900, max: 900, r: 4.4, t: 0, dead: false, grp, rotor, crashed: false, spd: 0, yaw: 0, hurt(d) { if (!this.dead) { this.hp -= d; fxSpark(this.x, this.y, this.z, 3); } if (this.hp <= 0) this.dead = true; }, dispose() { World.scene.remove(this.grp); const i = G.shootables.indexOf(this); if (i >= 0) G.shootables.splice(i, 1); } };
    World.scene.add(grp); G.shootables.push(h); Story.track(h); return h;
  };
  Story.heliStep = function (h, dt, dir) {
    h.t += dt; h.rotor.rotation.y += dt * 38; const d = h.hp / h.max;
    if (!h.dead) { const go = h.t > 7; h.spd = go ? Math.min(26, h.spd + 2.2 * dt) : 0; h.y = lerp(h.y, go ? 34 : 6 + h.t * 0.5, Math.min(1, dt * 0.6)); h.x += dir.x * h.spd * dt; h.z += dir.z * h.spd * dt; h.yaw = Math.atan2(dir.x, dir.z) + Math.PI; if (d < 0.5) fxSmoke(h.x, h.y, h.z, 0.15); if (d < 0.25) fxFire(h.x, h.y, h.z); }
    else if (!h.crashed) { h.y -= 16 * dt; h.yaw += 6 * dt; h.x += dir.x * h.spd * 0.4 * dt; h.z += dir.z * h.spd * 0.4 * dt; fxFire(h.x, h.y, h.z); fxSmoke(h.x, h.y, h.z, 0.1); if (h.y <= 0.8) { h.crashed = true; fxExplosion(h.x, 1, h.z); h.grp.visible = false; const i = G.shootables.indexOf(h); if (i >= 0) G.shootables.splice(i, 1); } }
    h.grp.position.set(h.x, h.y, h.z); h.grp.rotation.y = h.yaw;
  };
  function openSpot(x, z) { const o = { x, z }; for (let i = 0; i < 4; i++) { resolveCircle(o, 1.2, 0); } if (!walkable(o.x, o.z) || landSD(o.x, o.z) < 5) { return { x: pad().x, z: pad().z - 6 }; } return o; }

  const M = [];
  // ================= 1. SUNBURN =================
  M.push({
    id: 'm1', num: 1, title: 'SUNBURN', kicker: 'PROLOGUE', tagline: 'Home sweet Florida', auto: true, req: [], people: ['luz'], at: () => null, reward: { cash: 750, car: 'sedan' },
    synopsis: 'Out of Raiford after three years. Luz has a plan, a pier, and a job that starts at a gas station.',
    notes: ['Rico "The Pelican" Vance framed Jax for the Port job and kept $4,000,000.', 'Vance\'s money is scattered: a bank, boats, a safe, and something about a rocket.'],
    steps: [
      { type: 'cutscene', text: '', script: () => { const S = Story.pos.safe; return [
        { set: { jax: [S.x, S.z], luz: [S.x + 3.4, S.z + 1.2] } },
        J('Three years, two months, eleven days. Raiford doesn\'t have a beach. Turns out I forgot how loud the sun is down here.', { shot: 'cam', cam: { p: [S.x + 70, 15, S.z - 44], to: [S.x + 40, 8, S.z - 22], l: [S.x + 300, 3, S.z - 60], fov: 55, dur: 10 } }),
        J('Sunset Towers. Same crooked sign. Somehow that makes it worse.', { shot: 'cam' }),
        LZ('Look at you. Three years of prison food and you still came out taller.', { shot: 'wide' }),
        J('Luz. You were the only one who ever wrote.'),
        LZ('Somebody had to. The condo\'s my cousin\'s — he moved to Tampa. Permanently. Don\'t ask.'),
        J('Who put me away, Luz?'),
        LZ('You know who. Rico Vance. They call him the Pelican, because he swoops in, takes everything, and leaves everyone wondering what just happened.'),
        LZ('The Port job — you took the fall, he kept four million dollars and a very good lawyer. Now he owns the bank on Ocean Drive, the marina, half the city council, and I swear to God, a rocket company.'),
        J('A rocket company.'),
        LZ('Florida, baby. So. You want it back?'),
        J('Every dollar. And the three years.'),
        LZ('The years I can\'t get you. The dollars, maybe. Meet me at the pier — Delgado\'s Dockside, end of the boardwalk.'),
        LZ('And Jax? Try not to get shot before lunch.'),
      ]; } },
      { type: 'goto', text: 'Meet Luz at the pier', pos: () => pier(), r: 8, chatter: [{ t: 3, who: 'jax', text: 'Open map: M. The pier is east, past the beach. Ferris wheel — you can\'t miss it.', dur: 5 }] },
      { type: 'cutscene', script: () => [
        { set: pierSet() },
        LZ('There he is. Already sunburnt. Welcome to the Dockside — bait, boats, and bad decisions.'),
        J('Where do we start?'),
        LZ('Vance\'s money isn\'t in one place. It\'s spread out like sunscreen: a bank, a few boats, a safe I\'m not allowed to talk about, and the rocket thing.'),
        LZ('To get close, I need three things from you. Wheels. Cash. And proof you didn\'t leave your nerve in Raiford.'),
        J('My nerve is fine.'),
        LZ('Prove it. Take a car — I don\'t care whose — and rob a gas station. Not for the twenty bucks. I want to see your hands stay steady.'),
        J('Aim at the clerk. Stay calm. Wait for the bag.'),
        LZ('Look at that. Someone\'s been reading in the library. Bring me five hundred, minimum.'),
      ] },
      { type: 'wait', text: 'Steal a vehicle', sub: () => 'Walk up to any car and press F', cond: () => P.inCar },
      { type: 'wait', text: 'Rob a gas station', sub: rt => 'Equip your pistol, aim (RMB) at the clerk, hold E', mark: () => { const s = Story.nearestShop('gas'); return s; }, gps: true, color: '#4ad66d', cond: rt => robs(rt, 'gas') >= 1 && earned(rt) >= 400,
        chatter: [{ t: 4, who: 'jax', text: 'Don\'t think about the face. Think about the sandwich I\'ll buy afterwards.', dur: 5 }] },
      { type: 'goto', text: 'Return to Luz at the pier', pos: () => pier(), r: 9, noWanted: true },
      { type: 'cutscene', script: () => [
        { set: pierSet() },
        LZ('Five hundred and change. Not bad for someone who\'s been free six hours.'),
        J('Seven, if you count the car.'),
        LZ('I don\'t count the car. The car doesn\'t exist. But if it did, it would look a lot like the Palmetto Sedan I\'m leaving behind the bait freezer. Old, loyal, and not stolen. Mostly.'),
        J('Where do we go from here?'),
        LZ('Tomorrow you meet a kid who can break into anything with a plug. Tonight, you sleep. The beds at Sunset Towers are terrible, but they\'re free.'),
      ] },
    ],
  });
  // ================= 2. FRESH PAINT =================
  M.push({
    id: 'm2', num: 2, title: 'FRESH PAINT', tagline: 'Everybody needs a getaway car', req: ['m1'], giver: 'luz', people: ['luz', 'dex'], at: luzSpot(0), reward: { cash: 2000 },
    synopsis: 'Luz introduces Dex, a nineteen-year-old hacker with very specific taste in stolen cars.',
    notes: ['Dex got into Pelican National\'s network. The real books are kept in a gold ledger inside a time-locked vault.'],
    steps: [
      { type: 'cutscene', script: () => [
        { set: pierSet({ dex: [pier().x + 4.6, pier().z + 1.6] }) },
        LZ('Jax, meet Dex Okafor. Nineteen, hacker, wheelman, and the only person I know arrested for crimes that hadn\'t been invented yet.'),
        DX('Technically they had been invented. I just invented them harder. Hi! Do you want a Monster? I have nine Monsters.'),
        J('I\'m good.'),
        DX('Nobody\'s good. Okay! Business. I need a ride that can outrun the Highway Patrol, and I\'m picky. Biscayne GT. Red, yellow, I\'m not racist about colors.'),
        DX('South Beach. Rich people park there like they want it stolen. Bring it to my garage at the Port and don\'t scratch it. I\'d feel it. Like a disturbance in the Force.'),
        LZ('He\'s talking about the car. Mostly.'),
      ] },
      { type: 'wait', text: 'Steal a Biscayne GT (sports car)', sub: () => 'Check the Art Deco hotels along the beach', color: '#ffd23f',
        init: rt => { const sp = World.parkedSpots.filter(s => zoneAt(s.x, s.z) === 'deco' && roadOK(s.x, s.z) && !s.car).sort((a, b) => d2(a.x, a.z, P.x, P.z) - d2(b.x, b.z, P.x, P.z))[0] || World.parkedSpots[0]; const c = Story.spawnCar('sports', sp.x, sp.z, sp.h, { color: 0xff2a4a }); c.ai = { mode: 'parked' }; c.sleep = true; Story.refs.gt = c; },
        mark: () => { const c = Story.ref('gt'); return c && !c.wreck ? { x: c.x, z: c.z } : null; }, gps: true, cond: () => P.inCar && P.car.type === 'sports',
        chatter: [{ t: 10, who: 'dex', text: 'Red one, yellow one, whichever. Just— not a blue one. Blue ones are bad luck. I don\'t make the rules.', dur: 5.5 }] },
      { type: 'goto', text: 'Bring the car to Dex\'s garage at the Port', pos: () => garage(), r: 11, car: 'gt', hp: 0.65, noWanted: true,
        chatter: [{ p: 0.4, who: 'dex', text: 'Heads up: if you scratch her, I will know. I can feel it in my teeth.', dur: 5 }, { p: 0.8, who: 'dex', text: 'I\'m watching the street cams. You\'re doing great. Whoa — okay, careful on that corner!', dur: 5 }] },
      { type: 'cutscene', script: () => [
        { set: garSet() },
        DX('She\'s beautiful. I\'m naming her Kevin.'),
        J('You named the car Kevin.'),
        DX('Kevin is a strong, trustworthy getaway name. Look — while you were out there stealing her, I got into Pelican National\'s network. It has the same password as a Wi-Fi network called PelicanGuest.'),
        J('That\'s not a password.'),
        DX('That\'s what I said! Anyway: there\'s a vault in the First Florida branch downtown with a gold ledger. Vance\'s real books. Time-locked. Only the branch manager can open it.'),
        J('So we ask him nicely.'),
        DX('Sure. With a gun. Politely, with a gun — that\'s basically Florida customer service.'),
      ] },
    ],
  });
  // ================= 3. INSIDE MAN =================
  M.push({
    id: 'm3', num: 3, title: 'INSIDE MAN', tagline: 'The vault at First Florida', req: ['m2'], giver: 'dex', people: ['dex'], at: dexSpot(0), reward: { cash: 8000 },
    synopsis: 'Take the branch manager hostage, make him open the vault, grab the ledger and the cash, and lose the police.',
    notes: ['The Gold Ledger lists Pelican Holdings and Pelican Orbital, with a private launch pad on the Space Coast.', 'A lieutenant, Tito Salazar, moves cash by car. A payroll line reads: "B. — retainer — $12,000/month."'],
    steps: [
      { type: 'cutscene', script: () => [
        { set: garSet() },
        DX('Whiteboard time! The bank opens at eight, closes at six. The vault is time-locked; the only man who can override it is the branch manager. He has the code, the key, and a very nice parking spot.'),
        J('So: get the manager.'),
        DX('Get the manager, walk him to the vault, and say please. Hostage etiquette matters. Eye contact. Don\'t call him "bro."'),
        J('And the guards?'),
        DX('Two guards, both armed, both paid less than they should be — which makes them either very loyal or very open to conversation.'),
        DX('Grab the ledger. Grab the cash — we\'ll need it. Get out before the police arrive. Or after. No — before. Definitely before.'),
      ] },
      { type: 'act', setTod: 10 * 60 + 30, text: '' },
      { type: 'goto', text: () => 'Go to ' + bank().name, pos: () => bank().door, r: 14, chatter: [{ t: 2, who: 'dex', text: 'It\'s 10:30. Bank\'s open. People are depositing things. Adorable.', dur: 4 }] },
      { type: 'wait', text: 'Grab the branch manager (G)', sub: rt => { const m = bank().manager; return m && m.alive ? 'He keeps to the office in the back, right side' : 'The manager is dead'; }, color: '#ff4fa3',
        mark: () => { const m = bank().manager; return { x: m.x, z: m.z }; }, cond: () => { const m = bank().manager; if (!m.alive) { Story.fail('The manager died — nobody can open the vault'); return false; } return P.hostage === m; } },
      { type: 'wait', text: 'Walk the manager to the vault and hold E', color: '#ffd23f', sub: () => bank().vault.open ? '' : (P.hostage === bank().manager ? 'Vault door is in the back-left room' : 'Grab the manager again (G)'),
        mark: () => bank().vaultPos, cond: () => { const m = bank().manager; if (!m.alive) { Story.fail('The manager died — nobody can open the vault'); return false; } return bank().vault.open; },
        chatter: [{ t: 8, who: 'dex', text: 'Remember: say please! He\'s a person. He has a family. Probably a cat.', dur: 5 }] },
      { type: 'wait', text: 'Grab the Gold Ledger from the vault', color: '#ffd23f', init: rt => { const b = bank().vault.bags[0]; Pickups.add(b[0] + .8, b[1] + 1.2, 'item', 1, 'Gold Ledger'); }, mark: () => ({ x: bank().vault.bags[0][0], z: bank().vault.bags[0][1] }), cond: () => hasItem('Gold Ledger') },
      { type: 'wait', text: 'Grab the cash bags', sub: rt => `${money(earned(rt))} / ${money(15000)}`, color: '#4ad66d', mark: () => { const p = G.pickups.find(p => p.type === 'bag'); return p ? { x: p.x, z: p.z } : null; }, cond: rt => earned(rt) >= 15000 || !G.pickups.some(p => p.type === 'bag') },
      { type: 'escape', text: 'Lose the police', },
      { type: 'goto', text: 'Bring the ledger to Dex', pos: () => garage(), r: 10, noWanted: true },
      { type: 'cutscene', script: () => [
        { set: garSet() },
        DX('Oh. Oh, this is delicious. Pelican Holdings. Pelican Orbital — wait. He actually has a rocket company? There\'s a launch pad on the Space Coast. That\'s real. That\'s so real.'),
        DX('And a lieutenant named Tito Salazar who moves cash by car every Thursday. Black SUV. And — look at this line.'),
        DX('"B. — retainer — twelve thousand a month."'),
        J('B?'),
        DX('Could be anyone. Brenda. Bob. A very expensive bagel shop.'),
        J('Or someone with a badge.'),
        DX('Let\'s not jump to conclusions. Let\'s jump to the cash. Tito\'s next.'),
      ] },
    ],
  });
  // ================= 4. TAIL THE TAIL =================
  M.push({
    id: 'm4', num: 4, title: 'TAIL THE TAIL', tagline: 'Thursday\'s cash run', req: ['m3'], giver: 'dex', people: ['dex', 'boone', 'tito'], at: dexSpot(0), reward: { cash: 4000 },
    synopsis: 'Run down Tito Salazar\'s money car — and meet Detective Boone.',
    notes: ['Detective Marcy Boone of the Highway Patrol offers help: "I can\'t touch Vance. You can."', 'Tito\'s burner phone names someone in the Everglades: Gus.'],
    steps: [
      { type: 'cutscene', script: () => [
        { set: garSet() },
        DX('Tito Salazar. Thursday run. Black Everglade SUV, plate LOLBIRD — I\'m not making that up.'),
        DX('He circles downtown before he drops the cash. Wreck the car, and the money\'s yours.'),
        J('And Tito?'),
        DX('Tito can send a thank-you card.'),
      ] },
      { type: 'act', setTod: 14 * 60, text: '' },
      { type: 'goto', text: 'Head downtown — Tito is circling the block', pos: () => Story.pos.tito, r: 55 },
      { type: 'chase', key: 'tito', name: 'Tito\'s SUV', text: 'Run down Tito\'s SUV', cruise: 23, wake: 55, lose: 300, loseMsg: 'Tito got away',
        spawn: rt => { const t = Story.pos.tito, c = Story.spawnCar('suv', t.x + 3.6, t.z + 40, Math.PI, { color: 0x111111, mode: 'abandoned' }); c.maxHp = c.hp = 520; c.ai = { mode: 'story' }; return c; },
        say: ['dex', 'He made you! GO GO GO!'], onDown: c => { Story.refs.loot = { x: c.x, z: c.z }; for (let i = 0; i < 3; i++) Pickups.add(c.x + rr(-3, 3), c.z + rr(-3, 3), 'bag', ri(2500, 4500), 'Cash bag'); Pickups.add(c.x + 1.5, c.z + 1.5, 'item', 1, 'Burner Phone'); Story.say('dex', 'Is he dead? Is the car dead? Is the cash alive?', 4); },
        chatter: [{ t: 9, who: 'dex', text: 'Left! LEFT! The other left!', dur: 3.5 }, { t: 22, who: 'dex', text: 'Keep it on him. Every turn takes him closer to a nice neighborhood and farther from my nerves.', dur: 5.5 }, { t: 38, who: 'dex', text: 'That SUV is armored. Do not shoot the windows. Shoot... car things. The car parts.', dur: 5.5 }] },
      { type: 'cutscene', script: () => [
        { set: { jax: [P.x, P.z], boone: [P.x + 4, P.z + 1.5] } },
        BN('Walk away from the fire, Mr. Moreno.'),
        J('Detective.'),
        BN('Marcy Boone, Highway Patrol. You\'ve been out nine days and I\'ve counted a bank, three gas stations, a stolen Biscayne, and now Tito Salazar\'s car. Do you ever take a day off?'),
        J('Sundays.'),
        BN('Funny. Here\'s what I know. Vance launders through people far above my pay grade. I can\'t touch him. You can — and I\'d rather your name stay off the paperwork until it\'s over.'),
        J('That\'s generous.'),
        BN('It\'s strategic. There\'s a burner phone in that wreck. Take it. It\'ll tell you where he keeps his boats.'),
        J('And what do I owe you?'),
        BN('A long, boring life. Go on.'),
        J('The ledger says B gets twelve grand a month. Boone starts with B. I tell myself it\'s a coincidence. Florida\'s full of Bs.', { shot: 'wide' }),
      ] },
      { type: 'wait', text: 'Grab the burner phone and the cash', sub: rt => `${money(earned(rt))} collected`, color: '#4ad66d', mark: () => { const p = G.pickups.find(p => p.name === 'Burner Phone') || G.pickups.find(p => p.type === 'bag'); return p ? { x: p.x, z: p.z } : null; }, cond: () => hasItem('Burner Phone') },
      { type: 'escape', text: 'Lose the police' },
    ],
  });
  // ================= 5. GATOR ALLEY =================
  M.push({
    id: 'm5', num: 5, title: 'GATOR ALLEY', tagline: 'Everglades, population: Gus', req: ['m4'], giver: 'luz', people: ['luz', 'dex', 'gus'], at: luzSpot(0), reward: { cash: 3500, weapon: 'shotgun' },
    synopsis: 'The burner phone points to Old Gus, a swamp hermit who knows where Vance\'s boats run.',
    notes: ['Vance\'s boats leave the Port at midnight, three of them, heading up the coast past the Keys.', 'Gus got a shotgun named Betsy.'],
    steps: [
      { type: 'cutscene', script: () => [
        { set: pierSet({ dex: [pier().x + 4.6, pier().z + 1.6] }) },
        LZ('That burner has one name on it that isn\'t Vance\'s. Gus. August Treadwell. Lives in the Everglades. Hasn\'t paid taxes since Reagan. Owns an airboat and a grudge.'),
        DX('I tried to hack him. He doesn\'t have internet. He has a landline. With a cord.'),
        LZ('Vance\'s people burned down his brother\'s fish camp last spring. Gus knows where the Pelican\'s boats run. He may also shoot you. Compliment his boat.'),
        J('Which boat?'),
        LZ('Any boat. Trust me.'),
      ] },
      { type: 'goto', text: 'Drive west into the Everglades to find Gus', pos: () => Story.pos.shack, r: 18, veh: false,
        chatter: [{ p: 0.35, who: 'dex', text: 'Take the Alligator Alley road — it\'s the only one. It\'s also the only road for the alligators.', dur: 6 }, { p: 0.7, who: 'dex', text: 'Fun fact: there\'s no cell service out there. So if you scream, it\'s mostly for yourself.', dur: 6 }] },
      { type: 'cutscene', script: () => { const s = World.special.shackPos || Story.pos.shack; return [
        { set: { jax: [s.x + 2, s.z + 16], gus: [s.x + 1, s.z + 11] } },
        GS('Name\'s Gus. Short for August. Long for "get off my property."'),
        J('Luz sent me.'),
        GS('Luz sent me good bait last Christmas. Come closer. Not that close.'),
        GS('Rico Vance. The Pelican. Burned my brother\'s fish camp and called it a "development opportunity." That man doesn\'t walk. He floats.'),
        GS('His boats move cargo at midnight out of the Port, up the coast, past the Keys. Three of \'em. Fast ones.'),
        GS('I\'d tell you more, but — hold on. You hear that?'),
        J('Engines.'),
        GS('That\'d be his boys. You got followed, genius. Grab something loud.'),
      ]; }, keep: [] },
      { type: 'kill', text: 'Kill the Pelican crew', color: '#ff3b5c', spawn: rt => { const s = World.special.shackPos || Story.pos.shack; const list = spawnPeople(7, s.x + 6, s.z + 18, 22, i => ({ rifle: i === 0, hp: 70 })); return list; },
        chatter: [{ t: 2, who: 'gus', text: 'That\'s my WIFE\'s bass boat you\'re bleeding on!', dur: 4 }, { t: 14, who: 'gus', text: 'Aim for the ones in white! Easier to see in the dark. Also, rude.', dur: 4.5 }] },
      { type: 'cutscene', script: () => { const s = World.special.shackPos || Story.pos.shack; return [
        { set: { jax: [s.x + 2, s.z + 16], gus: [s.x + 1, s.z + 11] } },
        GS('Well, I\'ll be a gator\'s brunch. You\'re not completely useless.'),
        GS('Three boats. Midnight. Out of the Port. Sink \'em, and Vance loses his cargo, his cash flow, and most of his sense of humor.'),
        GS('Take this. It was my wife\'s. Hey — it was mine, it was hers, it\'s a shotgun, we shared. Her name is Betsy.'),
        GS('Betsy\'s loud, and she doesn\'t negotiate.'),
        J('Thanks, Gus.'),
        GS('Don\'t thank me. Just bring back a boat. Any boat. I\'m not picky.'),
      ]; } },
    ],
  });
  // ================= 6. PIER PRESSURE =================
  M.push({
    id: 'm6', num: 6, title: 'PIER PRESSURE', tagline: 'Vance hits back', req: ['m5'], giver: 'luz', people: ['luz', 'dex'], at: luzSpot(0), reward: { cash: 3000, armor: true },
    synopsis: 'Dusk. Vance\'s crew storms the Dockside. Hold the pier.',
    notes: ['Vance knows Jax is coming. The crew now carries rifles.'],
    steps: [
      { type: 'act', setTod: 20 * 60 + 40, text: '' },
      { type: 'cutscene', script: () => [
        { set: pierSet({ dex: [pier().x + 4.6, pier().z + 1.6] }) },
        DX('Uh. Uh uh uh. Luz? Four vehicles are headed for the Dockside, and none of them are fishermen.'),
        LZ('He knows. Of course he knows. Jax — you\'re up. I\'ll be in the shop with the really big wrench.'),
        DX('And I\'ll be in the van with the really big laptop.'),
        J('Great. Everyone\'s armed with office supplies.'),
      ] },
      { type: 'survive', text: 'Defend the Dockside', dur: 75, waves: [
        { t: 1, say: ['dex', 'Wave one! Four on foot from the boardwalk!'], spawn: () => spawnPeople(4, pier().x - 28, pier().z, 8, { hp: 70 }) },
        { t: 24, say: ['luz', 'More of them! Don\'t let them near the shop!'], spawn: () => spawnPeople(5, pier().x - 30, pier().z, 10, i => ({ hp: 75, rifle: i === 0 })) },
        { t: 48, say: ['dex', 'Rifles! They brought rifles! Why do they all have rifles?!'], spawn: () => spawnPeople(5, pier().x - 32, pier().z, 10, i => ({ hp: 90, rifle: i < 3 })) },
      ] },
      { type: 'cutscene', script: () => [
        { set: pierSet({ dex: [pier().x + 4.6, pier().z + 1.6] }) },
        LZ('They broke my window and my best fishing rod. That rod was a gift.'),
        DX('I counted twelve. We got twelve. They did not account for a hacker with a wrench. Okay — it was technically a stapler.'),
        LZ('Vance knows we\'re coming. Fine. Gus said it: three boats, midnight. We sink them tonight.'),
        J('Tonight.'),
        LZ('Tonight. Take the armor from the shop. It\'s on the house. It\'s also on the wall. Take it off the wall.'),
      ] },
    ],
  });
  // ================= 7. SINK THE PELICAN =================
  M.push({
    id: 'm7', num: 7, title: 'SINK THE PELICAN', tagline: 'Midnight on the Atlantic', req: ['m6'], giver: 'luz', people: ['luz', 'dex', 'vance'], at: luzSpot(0), reward: { cash: 3500 },
    synopsis: 'Hunt down the smuggling boats at sea. Then Vance calls.',
    notes: ['Vance\'s final move is a private launch from the Space Coast pad on Friday evening.'],
    steps: [
      { type: 'act', setTod: 20, text: '' },
      { type: 'cutscene', script: () => [
        { set: pierSet({ dex: [pier().x + 4.6, pier().z + 1.6] }) },
        LZ('Jet ski\'s gassed up. Speedboat\'s tied off at the end of the pier. Pick your poison.'),
        DX('I\'ve marked the boats on your radar — I mean map. Sorry, I get excited. It\'s a thing.'),
        LZ('And please don\'t ram your own boat. They\'re expensive. And mine.'),
      ] },
      { type: 'wait', text: 'Take a boat from the end of the pier', color: '#4aa8ff', init: rt => { const b = Story.spawnCar('speedboat', PIER.x1 + 10, 41, Math.PI / 2, { mode: 'abandoned' }); Story.refs.boat = b; },
        mark: () => { const b = Story.ref('boat'); return b && !b.wreck ? { x: b.x, z: b.z } : { x: PIER.x1, z: 41 }; }, cond: () => P.inCar && CAR_TYPES[P.car.type].water },
      { type: 'wait', text: 'Sink the smuggling boats', color: '#ff3b5c', sub: rt => `${rt.boats.filter(b => !(b.dead || b.wreck)).length} / 3 afloat`,
        init: rt => { rt.boats = []; rt.drv = []; for (let i = 0; i < 3; i++) { const z = 41 + (i - 1) * 90, x = shoreX(z) + 170 + i * 25, b = Story.spawnCar('speedboat', x, z, rr(0, TAU), { color: 0x111111, mode: 'abandoned' }); b.maxHp = b.hp = 420; b.ai = { mode: 'story' }; rt.boats.push(b); rt.drv.push({}); } },
        update: (rt, dt) => { rt.boats.forEach((b, i) => { if (b.dead || b.wreck) return; const near = dist(b.x, b.z, P.x, P.z) < 90; boatAI(b, dt, rt.drv[i], near ? 24 : 9); }); },
        mark: rt => { let b = null, bd = 1e9; for (const x of rt.boats) { if (x.dead || x.wreck) continue; const d = d2(x.x, x.z, P.x, P.z); if (d < bd) { bd = d; b = x; } } return b ? { x: b.x, z: b.z } : null; },
        cond: rt => { const alive = rt.boats.filter(b => !(b.dead || b.wreck)); if (alive.length && alive.every(b => dist(b.x, b.z, P.x, P.z) > 420)) { Story.fail('The boats got away'); return false; } return alive.length === 0; },
        chatter: [{ t: 6, who: 'luz', text: 'Speed boats are fast. You\'re fast-er. That\'s not a word but I\'m a fisherwoman, not a poet.', dur: 5.5 }, { t: 30, who: 'dex', text: 'They\'re carrying cash, guns, and what I believe is a bag of mangoes. Sink everything.', dur: 5.5 }] },
      { type: 'wait', text: 'Answer the call', sub: () => '', cond: rt => rt.t > 25, chatter: [
        { t: 0.5, who: 'vance', text: 'Mr. Moreno. Welcome home.', dur: 3.5 }, { t: 0.5, who: 'vance', text: 'You\'ve been busy. A bank, a convoy, a swamp... and now my boats. I\'m touched. Truly.', dur: 5 },
        { t: 0.5, who: 'vance', text: 'Here is my generosity: walk away, and I\'ll only send you to the bottom of the nicest part of the Gulf.', dur: 5.5 }, { t: 0.5, who: 'jax', text: 'That\'s kind. Let me think... no.', dur: 3.5 },
        { t: 0.5, who: 'vance', text: 'Then I\'ll see you at the launch. Dress warmly. It gets cold in space.', dur: 5 }] },
      { type: 'goto', text: 'Return to the end of the pier', pos: () => ({ x: PIER.x1 - 4, z: 41 }), r: 22 },
    ],
  });
  // ================= 8. BOOKS DON'T COOK THEMSELVES =================
  M.push({
    id: 'm8', num: 8, title: 'CHEAP SUITS', tagline: 'Meet Vance\'s accountant', req: ['m7'], giver: 'luz', people: ['luz', 'dex', 'finch'], at: luzSpot(0), reward: { cash: 5000 },
    synopsis: 'Kidnap Morris Finch from a beach club and march him — on foot — to the lighthouse.',
    notes: ['Finch: Vance leaves Friday evening from Pelican Orbital\'s pad with the cash. Detective Boone is on Vance\'s payroll — $12,000 on the first of every month.'],
    steps: [
      { type: 'cutscene', script: () => [
        { set: pierSet({ dex: [pier().x + 4.6, pier().z + 1.6] }) },
        LZ('Dex decoded the ledger. Nine accounts, one man who keeps them: Morris Finch. Accountant. Terrified of everything, including Vance.'),
        DX('He eats lunch at the Casa Flamingo beach club every day at three. Three guards. Alive, he\'s a library. Dead, he\'s a PDF of nothing.'),
        J('Alive it is.'),
        LZ('Walk him to the lighthouse. Quietly. And Jax? Don\'t let him near a pen.'),
      ] },
      { type: 'act', setTod: 14 * 60 + 50, text: '' },
      { type: 'goto', text: 'Head to the Casa Flamingo beach club', pos: () => Story.pos.club, r: 30 },
      { type: 'wait', text: 'Grab Morris Finch (G)', sub: () => 'The guards will notice. Be ready.', color: '#ff4fa3',
        init: rt => { const c = Story.pos.club; const f = Story.cast('finch', c.x, c.z, 0); Story.refs.finch = f; Story.track({ dispose() { Story.uncast('finch'); } }); rt.guards = spawnPeople(3, c.x, c.z, 9, { idle: true, hp: 100 }); rt.hot = false; },
        update: rt => { const f = Story.ref('finch'); if (!rt.hot && (dist(P.x, P.z, f.x, f.z) < 11 || P.hostage === f || G.wanted > 0)) { rt.hot = true; for (const g of rt.guards) { g.story = false; g.state = 'fight'; g.fightT = 99999; } Story.say('finch', 'Rico\'s men! He\'s here for me! HELP!', 3.5); } },
        mark: () => { const f = Story.ref('finch'); return { x: f.x, z: f.z }; }, cond: () => P.hostage === Story.ref('finch') },
      { type: 'goto', text: 'Walk Finch to the lighthouse — on foot!', pos: () => lh(), r: 12, hostage: 'finch', gps: true,
        chatter: [{ t: 3, who: 'finch', text: 'I do taxes! Not crimes! ...Mostly taxes.', dur: 4 }, { t: 14, who: 'finch', text: 'My wife thinks I\'m at a conference. She cannot find out about the boat.', dur: 5 }, { t: 28, who: 'finch', text: 'Is that gun loaded? Don\'t answer that.', dur: 4 }, { t: 45, who: 'finch', text: 'The lighthouse? The one with the stairs? Oh, God, I have knees.', dur: 5 }, { t: 65, who: 'finch', text: 'Rico told us if anyone grabbed us we should scream. I\'m screaming. Internally.', dur: 5 }] },
      { type: 'cutscene', script: () => { const l = lh(); return [
        { set: { jax: [l.x, l.z], finch: [l.x + 2.6, l.z + 1.2], dex: [l.x - 3, l.z + .6] } },
        FN('Okay. Okay okay okay. I\'ll talk. I\'ll talk so much.'),
        J('Start with Vance.'),
        FN('He moves everything through Pelican Orbital. It\'s a real company — it just also happens to be a laundromat. Friday evening there\'s a "private tourism launch" off the Space Coast. Rico boards with the cash. After that he\'s beyond extradition and, frankly, gravity.'),
        DX('He\'s leaving the planet. That\'s... rude.'),
        J('And the people on his payroll?'),
        FN('The council. Two judges. And a detective named Boone — first of every month, twelve thousand in an envelope.'),
        J('I knew it.'),
        FN('You knew? Wait. You didn\'t know?'),
        DX('Jax. Behind you. Headlights.'),
      ]; } },
    ],
  });
  // ================= 9. DOUBLE CROSS =================
  M.push({
    id: 'm9', num: 9, title: 'DOUBLE CROSS', tagline: 'The lighthouse', req: ['m8'], auto: true, people: ['boone', 'finch'], at: () => null, reward: { cash: 1500 },
    synopsis: 'Boone shows up at the lighthouse. Not as a friend.',
    notes: ['Boone chose Vance. Friday is the launch. The team needs guns, armor, and cash — and a very fast drive north.'],
    steps: [
      { type: 'cutscene', script: () => { const l = lh(); return [
        { set: { jax: [l.x, l.z], boone: [l.x + 10, l.z + 3], dex: [l.x - 3, l.z + .6], finch: [l.x + 2.6, l.z + 1.2] } },
        BN('Jax. I wanted to like you. It\'s a bad habit. I take after my mother.'),
        J('Twelve thousand a month. That\'s what a friend costs now?'),
        BN('A friend costs more than that. A mortgage. A boat. A daughter at Duke. Rico\'s not the worst man I\'ve worked for. He\'s just the most reliable.'),
        DX('Okay! Great! Everyone is having a lovely time! Can we discuss that she\'s holding a gun?'),
        BN('Morris, step away from them.'),
        FN('I\'m not part of this! I never was! I just do taxes!'),
        BN('Last chance, Jax. Walk away from Friday and I lose the paperwork.'),
        J('I\'ve walked away from enough things.'),
        BN('Then I\'m sorry.'),
        DX('RUN!', { shot: 'low' }),
      ]; } },
      { type: 'escape', text: 'ESCAPE the Highway Patrol', wanted: 4, label: 'Shooting at police' },
      { type: 'cutscene', script: () => [
        { set: pierSet({ dex: [pier().x + 4.6, pier().z + 1.6] }) },
        LZ('Dex told me. Boone. I\'ve known her since she was a rookie writing parking tickets on this pier. I never saw it.'),
        DX('Nobody did. She\'s very good at being tired.'),
        LZ('Friday. The launch. Vance, the money, the rocket, Boone, probably a small marching band.'),
        J('We need guns, armor, and a way up the coast.'),
        LZ('And cash. Dex found an armored truck that does the Vance run. Hit it, buy the gear, then we drive north.'),
        DX('I\'ll... make a playlist.'),
      ] },
    ],
  });
  // ================= 10. ARSENAL =================
  M.push({
    id: 'm10', num: 10, title: 'ARSENAL', tagline: 'Rifles, armor, and a very heavy truck', req: ['m9'], giver: 'luz', people: ['luz', 'dex'], at: luzSpot(0), reward: { cash: 5000 },
    synopsis: 'Rob Vance\'s armored truck, buy rifles and armor at a pawn shop, and get ready.',
    notes: ['The assault rifle and body armor are available at pawn shops.'],
    steps: [
      { type: 'cutscene', script: () => [
        { set: pierSet({ dex: [pier().x + 4.6, pier().z + 1.6] }) },
        DX('The armored truck is downtown. Heavy. Slow. Furious. Just like my aunt.'),
        LZ('Hit it, take the cash, and then buy an assault rifle and armor. Pawn shop. Cash only. No questions.'),
        J('I\'ll bring back receipts.'),
      ] },
      { type: 'act', setTod: 13 * 60, text: '' },
      { type: 'chase', key: 'truck', name: 'Armored truck', text: 'Stop the armored truck', cruise: 14, idle: 11, wake: 25, lose: 300, loseMsg: 'The truck got away',
        spawn: rt => { const t = Story.pos.tito, c = Story.spawnCar('swat', t.x + 3.6, t.z + 40, Math.PI, { color: 0x1c1f26, mode: 'abandoned' }); c.maxHp = c.hp = 900; c.ai = { mode: 'story' }; return c; },
        onDown: c => { Story.refs.loot = { x: c.x, z: c.z }; for (let i = 0; i < 5; i++) Pickups.add(c.x + rr(-3, 3), c.z + rr(-3, 3), 'bag', ri(5000, 8000), 'Cash bag'); }, say: ['dex', 'It\'s armored! Aim for the tires! Do trucks have tires? They do. I think.'],
        chatter: [{ t: 12, who: 'dex', text: 'Don\'t bring a pistol to an armored truck. That\'s a pistol to a truck fight.', dur: 5 }] },
      { type: 'wait', text: 'Grab the cash', sub: rt => `${money(earned(rt))} / ${money(20000)}`, color: '#4ad66d', mark: () => { const p = G.pickups.find(p => p.type === 'bag'); return p ? { x: p.x, z: p.z } : Story.refs.loot; }, cond: rt => earned(rt) >= 20000 || !G.pickups.some(p => p.type === 'bag') },
      { type: 'escape', text: 'Lose the police' },
      { type: 'wait', text: 'Buy an assault rifle and body armor at a pawn shop', color: '#c88a2a', sub: () => `${P.weapons.rifle ? '✓' : '✗'} Rifle   ${P.armor >= 50 ? '✓' : '✗'} Armor` + (!P.weapons.rifle && G.cash < 2800 ? `   (need ${money(2800)})` : ''),
        mark: () => { let b = null, bd = 1e12; for (const s of Shops.list) if (s.type === 'pawn' && s.stock.rifle) { const d = d2(s.door.x, s.door.z, P.x, P.z); if (d < bd) { bd = d; b = s; } } return b ? { x: b.door.x, z: b.door.z } : Story.nearestShop('pawn'); }, gps: true, cond: () => P.weapons.rifle && P.armor >= 50 },
    ],
  });
  // ================= 11. THE LONG DRIVE =================
  M.push({
    id: 'm11', num: 11, title: 'THE LONG DRIVE', tagline: 'North, fast', req: ['m10'], giver: 'luz', people: ['luz', 'dex', 'boone'], at: luzSpot(0), reward: { cash: 0 },
    synopsis: 'The launch is at six. The Space Coast is a long way north, and Boone has friends.',
    notes: [],
    steps: [
      { type: 'act', setTod: 17 * 60 + 5, text: '' },
      { type: 'cutscene', script: () => [
        { set: pierSet({ dex: [pier().x + 4.6, pier().z + 1.6] }) },
        DX('Launch is at six. It\'s five-oh-five. The Space Coast is... a lot of map away.'),
        LZ('Take the fastest thing you own. Dex rides shotgun in spirit.'),
        DX('In spirit and on the radio! I made the playlist. It\'s ninety minutes of the same sixty seconds of a song.'),
        J('Luz?'),
        LZ('Go. Bring back the sun.'),
      ] },
      { type: 'wait', text: 'Get a fast car', sub: () => 'Any land vehicle. Faster is better.', cond: () => P.inCar && !CAR_TYPES[P.car.type].water },
      { type: 'goto', text: () => 'Reach the Space Coast launch pad', pos: () => pad(), r: 28, veh: false, limit: 400, limitMsg: 'The rocket left without you',
        chatter: [
          { p: 0.12, who: 'dex', text: 'Is this a good time to mention I\'ve never been north of Orlando?', dur: 4.5 },
          { p: 0.34, who: 'luz', text: 'Boone\'s friends have a roadblock ahead. Don\'t slow down.', dur: 4.5, fn: () => { Crime.force(2, 'Fleeing police'); for (let i = 0; i < 3; i++) Police.spawnCruiser(false); } },
          { p: 0.55, who: 'dex', text: 'T-minus four minutes. Nobody panic. I\'m panicking. Nobody else.', dur: 4.5 },
          { p: 0.75, who: 'boone', text: 'Jax. Last chance. Turn around. I mean it. I really, truly, genuinely don\'t want to do this.', dur: 6 },
          { p: 0.88, who: 'luz', text: 'You can do this. Also, if you die, I\'m taking the Sunbeam.', dur: 5 }] },
    ],
  });
  // ================= 12. PELICAN DOWN =================
  M.push({
    id: 'm12', num: 12, title: 'PELICAN DOWN', kicker: 'FINAL MISSION', tagline: 'Pad 39-X', req: ['m11'], auto: true, final: true, people: ['vance', 'boone', 'luz', 'dex'], at: () => null, reward: { cash: 50000 },
    synopsis: 'Pad 39-X. Vance, the money, the rocket, and Boone. Four million dollars, three years, one sky.',
    notes: ['Vance is finished. The end, for now.'],
    steps: [
      { type: 'act', setTod: 17 * 60 + 52, text: '' },
      { type: 'cutscene', script: () => { const p = pad(); return [
        { set: { jax: [p.x, p.z], vance: [p.x + 1.5, p.z - 14], boone: [p.x + 5, p.z - 13] } },
        VN('Mr. Moreno. Punctual. I do admire that in a man who is about to be extremely late.', { shot: 'cam', cam: { p: [p.x - 14, 3.2, p.z + 12], to: [p.x - 6, 2.2, p.z + 4], l: [p.x + 1, 2.8, p.z - 14], fov: 46, dur: 9 } }),
        J('You have my four million.'),
        VN('I have everyone\'s four million. That\'s what a bank is. You were a rounding error who turned into a very expensive hobby.'),
        VN('Marcy, darling. Tell him how this ends.'),
        BN('...It doesn\'t have to.'),
        VN('Yes. It does.'),
        VN('Boys. Be dramatic.'),
      ]; } },
      { type: 'kill', text: 'Fight through the Pelican crew', color: '#ff3b5c', spawn: rt => { const p = pad(); const l = spawnPeople(11, p.x, p.z - 10, 26, i => ({ rifle: i % 3 === 0, hp: 90 })); return l; },
        chatter: [{ t: 3, who: 'luz', text: 'Jax! The rifle! Use the rifle!', dur: 3.5 }, { t: 18, who: 'dex', text: 'There\'s a helicopter on the pad! Heat signature: smug.', dur: 4.5 }, { t: 36, who: 'luz', text: 'Armor up. You\'re doing great. This is the part where I scream encouragement.', dur: 5 }] },
      { type: 'wait', text: 'SHOOT DOWN Vance\'s helicopter!', sub: rt => rt.h ? `Hull ${Math.max(0, Math.round(rt.h.hp / rt.h.max * 100))}%` : '', color: '#ff3b5c', limit: 90, limitMsg: 'Vance escaped',
        init: rt => { const p = pad(); rt.h = Story.spawnHeli(p.x + 1, p.z - 18); rt.dir = { x: -0.55, z: 0.83 }; Story.refs.heli = rt.h; Story.say('luz', 'He\'s taking off with the money! SHOOT IT DOWN!', 4); },
        update: (rt, dt) => { Story.heliStep(rt.h, dt, rt.dir); Story.targetBar = { name: 'Vance\'s helicopter', frac: clamp(rt.h.hp / rt.h.max, 0, 1) }; },
        mark: rt => ({ x: rt.h.x, z: rt.h.z }), cond: rt => { if (rt.h.crashed) { Story.targetBar = null; Story.refs.crash = { x: rt.h.x, z: rt.h.z }; return true; } if (dist(rt.h.x, rt.h.z, pad().x, pad().z) > 450) { Story.fail('Vance escaped'); Story.targetBar = null; } return false; },
        chatter: [{ t: 10, who: 'dex', text: 'Aim for the tail! Or the rotor! Or— anywhere! Just hit it!', dur: 4.5 }, { t: 25, who: 'luz', text: 'He\'s getting away! Keep firing!', dur: 3.5 }] },
      { type: 'cutscene', script: () => { const c = openSpot((Story.refs.crash || pad()).x, (Story.refs.crash || pad()).z); return [
        { set: { jax: [c.x, c.z], vance: [c.x + 3.2, c.z + 2], boone: [c.x - 3.4, c.z + 4.2] } },
        VN('(coughing) Ah. That\'s... new. I\'ve never been shot out of the sky before. Mixed review.', { shot: 'low' }),
        J('Where\'s my money?'),
        VN('Gone, Jax. Burning in the weeds. Four million dollars of sunshine.'),
        BN('Rico. It\'s over. Whatever happens next, I\'m testifying.'),
        VN('Marcy. You\'re a coward, and I love you for it.'),
        { choice: { id: 'vance', prompt: 'Vance is at your mercy.', options: [{ id: 'kill', text: 'End it.' }, { id: 'arrest', text: 'Let Boone take him in.' }] } },
        J('You took three years.', { if: () => Story.choices.vance === 'kill' }),
        VN('You\'re just like me.', { if: () => Story.choices.vance === 'kill' }),
        J('No. I\'m in a much better mood.', { if: () => Story.choices.vance === 'kill' }),
        { if: () => Story.choices.vance === 'kill', act: () => { Snd.shot('pistol'); const v = Story.cast_.vance; if (v) { v.pose.dead = 1; v.pose.hands = 0; fxBlood(v.x, 1, v.z, 8); } } },
        BN('I didn\'t see a thing. I\'ll even lose the paperwork. All of it.', { if: () => Story.choices.vance === 'kill' }),
        J('Do me a favor. Lose yours too.', { if: () => Story.choices.vance === 'kill' }),
        J('Cuff him, Marcy. Make it stick.', { if: () => Story.choices.vance === 'arrest' }),
        VN('Forty years? They\'ll let me out for good behavior by Tuesday.', { if: () => Story.choices.vance === 'arrest' }),
        BN('Not in my county. I have the ledger, the accountant, and twelve thousand a month of my own guilt. You\'re done, Rico.', { if: () => Story.choices.vance === 'arrest' }),
        J('She\'s got everything. Including a conscience.', { if: () => Story.choices.vance === 'arrest' }),
      ]; } },
      { type: 'cutscene', keep: [], script: () => [
        { act: () => { G.tod = 7 * 60 + 20; } },
        { set: pierSet({ dex: [pier().x + 4.6, pier().z + 1.6] }) },
        LZ('Look at that sunrise. The same one that burned you the first day.'),
        J('I\'ve decided I like it.'),
        DX('So... what happens to the four million?'),
        LZ('What four million? Pelican Holdings\' accounts got seized by the state. Most of it goes to the people Vance ruined. Gus got a boat.'),
        DX('Gus got a boat?'),
        LZ('He\'s calling it Betsy Two.'),
        J('Three years, two months, eleven days. Then three weeks of sun, crime, and terrible ideas. I\'ve got a boat, two friends, and a city that still thinks it owns me.', { shot: 'wide' }),
        J('It\'s a good start.'),
        { title: 'SUNSHINE HEIST', kicker: 'THE END... FOR NOW', sub: 'Florida is yours. Keep playing.' },
      ] },
    ],
  });
  // ================= SIDE JOBS =================
  M.push({
    id: 's1', side: true, title: 'GAS & DASH', tagline: 'Luz needs a float', req: ['m1'], giver: 'luz', people: ['luz'], at: luzSpot(12), reward: { cash: 2500 },
    synopsis: 'Rob three gas stations within seven minutes.', notes: [],
    steps: [
      { type: 'cutscene', script: () => [{ set: pierSet() }, LZ('The Dockside runs on cash, and the cash runs on gas stations. Hit three of them. Seven minutes. Don\'t be sentimental.'), J('Three gas stations. Seven minutes. Got it.')] },
      { type: 'wait', text: 'Rob 3 gas stations', limit: 420, limitMsg: 'Out of time', sub: rt => `${robs(rt, 'gas')} / 3`, mark: () => Story.nearestShop('gas'), gps: true, color: '#4ad66d', cond: rt => robs(rt, 'gas') >= 3 },
      { type: 'escape', text: 'Lose the police' },
    ],
  });
  M.push({
    id: 's2', side: true, title: 'WHEELS FOR DEX', tagline: 'Chop-shop economics', req: ['m2'], giver: 'dex', people: ['dex'], at: dexSpot(12), reward: { cash: 3000 },
    synopsis: 'Steal three cars and sell them at a pawn shop yard.', notes: [],
    steps: [
      { type: 'cutscene', script: () => [{ set: garSet() }, DX('Kevin is lonely. Kevin needs friends. Steal three cars and fence them at a pawn shop — the sell zone out front. Dex gets a cut, you get a cut, everyone gets a car-shaped hole in their heart.'), J('I\'ll bring cars.')] },
      { type: 'wait', text: 'Sell 3 stolen cars at a pawn shop yard', sub: rt => `${(G.stats.carsSold || 0) - rt.base.sold} / 3`, mark: () => Story.nearestShop('pawn'), gps: true, color: '#c88a2a', cond: rt => (G.stats.carsSold || 0) - rt.base.sold >= 3 },
    ],
  });
  Story.load(M);
})();
