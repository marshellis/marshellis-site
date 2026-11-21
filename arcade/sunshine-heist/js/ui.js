'use strict';
// ===== UI: HUD, minimap, messages, news log, overlays =====
const $ = id => document.getElementById(id);
const UI = {
  el: {}, mapOpen: false, bubbleEls: [], lastWanted: 0,
  init() {
    for (const id of ['money', 'clock', 'stars', 'hp', 'ar', 'wname', 'wammo', 'speedo', 'spd', 'cross', 'target', 'prompt', 'prog', 'progt', 'msg', 'log', 'over', 'overh', 'overp', 'mini', 'fullmap', 'fm', 'shop', 'pause', 'bubbles', 'flash', 'rob']) this.el[id] = $(id);
    this.mctx = this.el.mini.getContext('2d'); this.fctx = this.el.fm.getContext('2d');
    for (let i = 0; i < 8; i++) { const d = document.createElement('div'); this.el.bubbles.appendChild(d); this.bubbleEls.push(d); }
    $('shopclose').onclick = () => Pawn.close(); $('resume').onclick = () => this.pause(false); $('savebtn').onclick = () => { UI.msg(SaveSys.save() ? 'Game saved' : 'Could not save'); };
  },
  msg(text, ms = 2200) { const d = document.createElement('div'); d.innerHTML = text; this.el.msg.appendChild(d); while (this.el.msg.children.length > 2) this.el.msg.removeChild(this.el.msg.firstChild); setTimeout(() => d.remove(), ms); },
  news(text, cls = '') {
    G.news.push({ text, t: G.time }); if (cls === '' && !/^⚠/.test(text)) return; const d = document.createElement('div'); d.className = cls; d.textContent = text; this.el.log.appendChild(d); while (this.el.log.children.length > 3) this.el.log.removeChild(this.el.log.firstChild);
    setTimeout(() => { d.style.opacity = 0; setTimeout(() => d.remove(), 1000); }, cls === 'dead' ? 8000 : 5500);
  },
  over(title, sub) { if (!title) { this.el.over.style.display = 'none'; return; } this.el.over.style.display = 'flex'; this.el.overh.textContent = title; this.el.overp.textContent = sub || ''; this.el.overh.style.color = title === 'BUSTED' ? '#4aa8ff' : '#ff4c5c'; },
  pause(on) { if (on && (G.state !== 'play')) return; G.paused = on; this.el.pause.style.display = on ? 'flex' : 'none'; if (on) Input.unlock(); else if (G.state === 'play') Input.lock(); },
  showPawn(on) { this.el.shop.style.display = on ? 'flex' : 'none'; },
  toggleMap() { this.mapOpen = !this.mapOpen; this.el.fullmap.style.display = this.mapOpen ? 'flex' : 'none'; if (this.mapOpen) Input.unlock(); else if (G.state === 'play' && !G.paused) Input.lock(); G.modal = this.mapOpen; },
  clockStr() { const m = Math.floor(G.tod), h = Math.floor(m / 60) % 24, mm = m % 60; return `${Weather.icon} ${Math.round(Weather.temp)}°F · ${Weather.label}<br>Day ${G.day} · ${(h % 12) || 12}:${String(mm).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; },
  update(dt) {
    const e = this.el; e.money.textContent = money(G.cash); const cs = this.clockStr(); if (e.clock._s !== cs) { e.clock.innerHTML = cs; e.clock._s = cs; }
    if (G.cash !== this.lastCash) { if (this.lastCash !== undefined) this.statT = 4.5; this.lastCash = G.cash; } this.statT = Math.max(0, (this.statT || 0) - dt); const tab = Input.held('Tab'), showInfo = this.statT > 0 || tab;
    e.money.style.display = e.clock.style.display = showInfo ? 'block' : 'none'; e.stars.style.display = G.wanted > 0 ? 'block' : 'none';
    const hurt = P.hp < 99.5 || P.armor > 0 || G.time - P.lastHurt < 5; e.hp.parentNode.style.opacity = hurt ? 1 : 0;
    if (P.cur !== this.lastWpn) { this.lastWpn = P.cur; this.wpnT = 3.5; } if (P.shooting > 0 || P.reloadT > 0 || P.aiming) this.wpnT = 3.5; this.wpnT = Math.max(0, (this.wpnT || 0) - dt);
    e.wname.parentNode.style.opacity = (!P.inCar && P.cur !== 'fists' && this.wpnT > 0) || tab ? 1 : 0;
    let st = ''; for (let i = 0; i < 5; i++) st += `<span class="${i < G.wanted ? 'on' : ''}">★</span>`; if (e.stars.innerHTML !== st) e.stars.innerHTML = st; e.stars.className = G.wanted > 0 && G.copsNearby ? 'flash' : '';
    e.hp.firstChild.style.width = clamp(P.hp, 0, 100) + '%'; e.ar.firstChild.style.width = clamp(P.armor, 0, 100) + '%'; e.ar.style.display = P.armor > 0 ? 'block' : 'none';
    const w = P.weapon, a = P.ammo[P.cur]; e.wname.textContent = P.inCar ? (CAR_TYPES[P.car.type].name) : w.name + (P.reloadT > 0 ? ' (reloading)' : ''); e.wammo.innerHTML = P.inCar ? '' : (w.throwable && a ? `${a.mag}` : w.firearm && a ? `${a.mag}<small> / ${a.res}</small>` : '');
    if (P.inCar && P.car) { e.speedo.style.display = 'block'; e.spd.textContent = Math.round(Math.abs(P.car.fs) * 2.237); } else e.speedo.style.display = 'none';
    const free = !Input.locked && Input.mIn && P.armed && !P.inCar && !P.scoped && !G.modal && !G.paused, showX = !P.inCar && (P.aiming || (P.armed && P.aimingGun) || free) && !P.dead; e.cross.style.display = showX ? 'block' : 'none'; e.cross.classList.toggle('hot', !!P.crossHot);
    if (showX && !Input.locked && !P.scoped) { e.cross.style.left = Input.mx + 'px'; e.cross.style.top = Input.my + 'px'; } else { e.cross.style.left = ''; e.cross.style.top = ''; }
    document.body.style.cursor = showX && !Input.locked && !P.scoped ? 'none' : '';
    if (G.prompt && !G.modal && !P.dead) { e.prompt.style.display = 'block'; if (e.prompt._t !== G.prompt) { e.prompt.innerHTML = G.prompt; e.prompt._t = G.prompt; } } else e.prompt.style.display = 'none';
    if (G.progress) { e.prog.style.display = 'block'; e.progt.textContent = G.progress.label; e.prog.querySelector('i').style.width = Math.round(clamp(G.progress.frac, 0, 1) * 100) + '%'; } else e.prog.style.display = 'none';
    if (Police.arrest > 0.02) { e.prog.style.display = 'block'; e.progt.textContent = 'BEING ARRESTED...'; e.prog.querySelector('i').style.width = Math.round(Police.arrest * 100) + '%'; }
    const t = P.targetNPC; if (t && t.alive) { e.target.style.display = 'block'; e.target.innerHTML = `<b>${t.name}</b> · ${t.jobLabel}`; } else e.target.style.display = 'none';
    $('scope').style.display = P.scoped && !P.dead ? 'block' : 'none';
    e.flash.style.opacity = clamp(P.dmgFlash * 0.45, 0, 0.5); e.rob.style.opacity = G.wanted > 0 && G.copsNearby ? 0.25 + 0.25 * Math.sin(G.time * 8) : 0;
    this.bubbles(); this.drawMini(); if (this.mapOpen) this.drawFull();
  },
  bubbles() {
    let k = 0; const cam = G.camera, v = new T.Vector3();
    for (const a of G.actives) {
      if (!a.bubble || k >= this.bubbleEls.length || a.hidden) continue; if (d2(a.x, a.z, P.x, P.z) > 900) continue;
      v.set(a.x, (a.y || 0) + 2.15, a.z).project(cam); if (v.z > 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1) continue;
      const el = this.bubbleEls[k++]; el.style.display = 'block'; el.textContent = a.bubble.text; el.style.left = (v.x * 0.5 + 0.5) * innerWidth + 'px'; el.style.top = (-v.y * 0.5 + 0.5) * innerHeight + 'px';
    }
    for (; k < this.bubbleEls.length; k++) this.bubbleEls[k].style.display = 'none';
  },
  markers() {
    const m = []; for (const s of Shops.list) m.push({ x: s.x, z: s.z, c: s.type === 'bank' ? '#ffd23f' : s.type === 'pawn' ? '#c88a2a' : '#4ad66d', t: s.type === 'bank' ? 'B' : s.type === 'pawn' ? 'P' : '$' });
    if (Shops.safe) m.push({ x: Shops.safe.x, z: Shops.safe.z, c: '#ff4fa3', t: 'H' }); if (Shops.hospital) m.push({ x: Shops.hospital.x, z: Shops.hospital.z, c: '#ffffff', t: '+' });
    for (const c of G.cars) if (c.owned) m.push({ x: c.x, z: c.z, c: '#4aa8ff', t: '' });
    for (const b of Story.blips()) m.push(b);
    for (const b of Extras.blips()) m.push(b);
    return m;
  },
  drawMini() {
    const g = this.mctx, S = 380, R = 190, sc = 1.35; g.clearRect(0, 0, S, S); g.save(); g.beginPath(); g.arc(R, R, R - 2, 0, TAU); g.clip();
    g.fillStyle = '#1a3550'; g.fillRect(0, 0, S, S); g.translate(R, R); g.rotate(P.camYaw); g.scale(sc, sc); g.translate(-P.x, -P.z);
    if (World.mapCanvas) g.drawImage(World.mapCanvas, WB.x0, WB.z0, WB.w, WB.h);
    const inv = 1 / sc;
    if (Story.route && Story.route.length > 1) { g.strokeStyle = '#ff4fa3'; g.lineWidth = 5 * inv; g.lineJoin = 'round'; g.beginPath(); Story.route.forEach((p, i) => i ? g.lineTo(p.x, p.z) : g.moveTo(p.x, p.z)); g.stroke(); }
    for (const m of this.markers()) { let mx = m.x, mz = m.z; const dd = Math.hypot(mx - P.x, mz - P.z), lim = (R - 16) / sc; if (dd > lim) { if (!m.obj && m.t !== 'M' && m.t !== 'S') continue; mx = P.x + (mx - P.x) / dd * lim; mz = P.z + (mz - P.z) / dd * lim; } g.fillStyle = m.c; g.beginPath(); g.arc(mx, mz, (m.obj || m.t === 'M' ? 8 : 6) * inv * 1.6, 0, TAU); g.fill(); if (m.t) { g.fillStyle = '#000'; g.font = `bold ${9 * inv * 1.6}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(m.t, mx, mz + 0.5 * inv); } }
    const ph = Math.floor(G.time * 4) % 2;
    for (const c of G.cars) if (c.ai.mode === 'police' && !c.dead) { g.fillStyle = ph ? '#ff2a2a' : '#2a6aff'; g.beginPath(); g.arc(c.x, c.z, 5 * inv * 1.5, 0, TAU); g.fill(); }
    for (const c of Police.cops) if (c.alive) { g.fillStyle = ph ? '#ff2a2a' : '#2a6aff'; g.beginPath(); g.arc(c.x, c.z, 3.5 * inv * 1.5, 0, TAU); g.fill(); }
    if (P.hostage) { g.fillStyle = '#fff'; g.beginPath(); g.arc(P.hostage.x, P.hostage.z, 3 * inv * 1.5, 0, TAU); g.fill(); }
    g.restore(); g.save(); g.translate(R, R); g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -12); g.lineTo(8, 10); g.lineTo(0, 5); g.lineTo(-8, 10); g.closePath(); g.fill(); g.stroke(); g.restore();
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 3; g.beginPath(); g.arc(R, R, R - 2, 0, TAU); g.stroke();
    g.fillStyle = '#fff'; g.font = 'bold 20px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('N', R + Math.sin(P.camYaw) * (R - 16), R - Math.cos(P.camYaw) * (R - 16));
  },
  drawFull() {
    const g = this.fctx, SW = this.el.fm.width, k = SW / WB.w; g.clearRect(0, 0, SW, this.el.fm.height); if (World.mapCanvas) g.drawImage(World.mapCanvas, 0, 0, SW, WB.h * k);
    const X = x => (x - WB.x0) * k, Z = z => (z - WB.z0) * k;
    if (Story.route) { g.strokeStyle = '#ff4fa3'; g.lineWidth = 3; g.beginPath(); Story.route.forEach((p, i) => i ? g.lineTo(X(p.x), Z(p.z)) : g.moveTo(X(p.x), Z(p.z))); g.stroke(); }
    for (const m of this.markers()) { g.fillStyle = m.c; g.beginPath(); g.arc(X(m.x), Z(m.z), 7, 0, TAU); g.fill(); g.fillStyle = '#000'; g.font = 'bold 11px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(m.t, X(m.x), Z(m.z) + 1); }
    for (const c of G.cars) if (c.ai.mode === 'police') { g.fillStyle = '#f33'; g.fillRect(X(c.x) - 3, Z(c.z) - 3, 6, 6); }
    g.save(); g.translate(X(P.x), Z(P.z)); g.rotate(-P.camYaw + Math.PI); g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.beginPath(); g.moveTo(0, -11); g.lineTo(8, 9); g.lineTo(0, 4); g.lineTo(-8, 9); g.closePath(); g.fill(); g.stroke(); g.restore();
    g.fillStyle = '#fff'; g.font = 'bold 16px sans-serif'; g.textAlign = 'left'; g.fillText('B bank · P pawn · $ gas · H safehouse · + hospital · W respray · R race', 12, 22);
    const labels = [['MIAMI', 185, -40], ['SOUTH BEACH', 480, 60], ['ATLANTIC OCEAN', 760, -200], ['EVERGLADES', -700, 200], ['SPACE COAST', 260, -840], ['KEY WEST', 10, 900], ['GULF OF MEXICO', -1560, 0], ['TAMPA', -1240, -40], ['ORLANDO', 110, -1300], ['THE PORT', 0, 400], ['FANTASY KINGDOM', 150, -1300]];
    g.font = 'bold 13px sans-serif'; g.textAlign = 'center'; g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 3; for (const [t, x, z] of labels) { g.strokeText(t, X(x), Z(z)); g.fillText(t, X(x), Z(z)); }
  },
};
