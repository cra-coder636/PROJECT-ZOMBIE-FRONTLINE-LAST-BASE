/* ============================================================
   HUD — top bar, build dock, inspector, banners, overlays
   ============================================================ */
(function (ZF) {
  'use strict';
  var U = ZF.Util, $ = U.$, G = ZF.Game;

  var el = {};
  var tab = 'infantry';
  var cards = [];
  var lastRes = { credits: -1, scrap: -1, research: -1 };
  var lastHud = {};
  var overlayAction = null;
  var bossEl = null;

  function cache() {
    ['base-hp-fill', 'base-hp-text', 'res-credits', 'res-scrap', 'res-research', 'hud-stage', 'hud-wave',
      'hud-left', 'hud-kills', 'hud-time', 'dock', 'dock-tabs', 'dock-scroll', 'btn-nextwave',
      'wave-btn-label', 'wave-bonus-label', 'inspector', 'ins-name', 'ins-cat', 'ins-role', 'ins-stats',
      'ins-upgrades', 'ins-upgrade', 'ins-sell', 'ins-icon', 'ins-close', 'wave-banner', 'toast',
      'boss-bar', 'boss-name', 'boss-fill', 'event-callout', 'build-hint', 'game-overlay', 'go-panel',
      'fps-counter', 'btn-sound', 'btn-menu', 'canvas-wrap'].forEach(function (id) {
      el[id] = document.getElementById(id);
    });
    el.speedBtns = U.$$('.sbtn');
  }

  function drawCardIcon(canvas, def) {
    var g = canvas.getContext('2d');
    ZF.Sprites.drawIcon(g, def, canvas.width, canvas.height);
  }

  function buildDock() {
    el.dock.innerHTML = '';
    cards = [];
    var list = ZF.Data.units.filter(function (u) { return u.cat === tab; });
    list.forEach(function (def) {
      var c = U.el('button', 'card');
      c.setAttribute('data-unit', def.id);
      var cv = document.createElement('canvas');
      cv.width = 40; cv.height = 40;
      c.appendChild(cv);
      var nm = U.el('div', 'cname', def.name.replace(' ', '<br>'));
      c.appendChild(nm);
      var cost = U.el('div', 'ccost', G.unitCost(def) + 'C');
      c.appendChild(cost);
      var lock = U.el('div', 'lock hidden', '\u25A0');
      c.appendChild(lock);
      drawCardIcon(cv, def);
      if (G.wave > 0 && G.isUnlocked(def) && def.unlockWave) {
        var b = U.el('div', 'lvlbadge', 'NEW');
        c.appendChild(b);
      }
      U.on(c, 'click', function (e) {
        e.preventDefault();
        if (G.buildId === def.id) G.cancelBuild();
        else G.setBuild(def.id);
      });
      U.on(c, 'mouseenter', function () { showTip(def, c, cost); });
      U.on(c, 'mouseleave', hideTip);
      U.on(c, 'touchstart', function () { showTip(def, c, cost); window.setTimeout(hideTip, 2200); }, { passive: true });
      el.dock.appendChild(c);
      cards.push({ el: c, def: def, costEl: cost, lockEl: lock });
    });
    updateCards();
  }

  function updateCards() {
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      var locked = !G.isUnlocked(c.def);
      var affordable = G.resources && G.resources.credits >= G.unitCost(c.def);
      c.el.classList.toggle('locked', locked);
      c.el.classList.toggle('unaffordable', !locked && !affordable);
      c.el.classList.toggle('selected', G.buildId === c.def.id);
      c.lockEl.classList.toggle('hidden', !locked);
      if (locked) c.lockEl.textContent = 'W' + c.def.unlockWave;
      c.costEl.textContent = G.unitCost(c.def) + 'C';
    }
  }

  /* ---------------- tooltip ---------------- */
  var tip = null, tipTimer = 0;
  function showTip(def, card, costEl) {
    if (!tip) tip = document.getElementById('tooltip');
    if (!tip) return;
    if (!G.isUnlocked(def)) {
      tip.innerHTML = '<div class="tt-name">' + def.name + '</div><div class="tt-sub">UNLOCKS AT WAVE ' + def.unlockWave + '</div>';
      tip.classList.remove('hidden');
      placeTip(card);
      return;
    }
    var rows = '';
    if (def.dmg) rows += row('DAMAGE', def.dmg);
    if (def.rate) rows += row('FIRE RATE', def.rate.toFixed(2) + '/s');
    if (def.range) rows += row(def.aura ? 'AURA' : 'RANGE', Math.round(def.range) + 'px');
    if (def.dps) rows += row('DPS', '~' + def.dps);
    if (def.splash) rows += row('BLAST', def.splash);
    if (def.hits) rows += row('TARGETS', def.hits);
    if (def.hp) rows += row('HP', def.hp);
    if (def.support) rows += row('SUPPORT', 'YES');
    if (def.onPath) rows += row('PLACEMENT', 'ON ROAD');
    tip.innerHTML = '<div class="tt-name">' + def.name + ' — ' + costEl.textContent + '</div>' +
      '<div class="tt-sub" style="margin-bottom:6px">' + def.role + '</div>' + rows;
    tip.classList.remove('hidden');
    placeTip(card);
  }
  function row(a, b) { return '<div class="tt-row"><span>' + a + '</span><b>' + b + '</b></div>'; }
  function placeTip(card) {
    var r = card.getBoundingClientRect();
    var tw = tip.offsetWidth || 240, th = tip.offsetHeight || 100;
    var x = Math.min(window.innerWidth - tw - 8, Math.max(8, r.left + r.width / 2 - tw / 2));
    var y = r.top - th - 10;
    if (y < 8) y = r.bottom + 10;
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
  }
  function hideTip() { if (tip) tip.classList.add('hidden'); }

  /* ---------------- inspector ---------------- */
  function statLine(k, v) { return '<div><span>' + k + '</span><b>' + v + '</b></div>'; }

  function updateInspector() {
    var t = G.selected;
    if (!t || !t.alive) {
      el.inspector.classList.add('hidden');
      return;
    }
    el.inspector.classList.remove('hidden');
    var s = t.s || t.statsFor(G);
    el['ins-name'].textContent = t.def.name;
    el['ins-cat'].textContent = t.def.cat.toUpperCase() + ' // LV ' + (t.level + 1);
    el['ins-role'].textContent = t.def.role;
    var html = '';
    if (t.def.support) {
      html += statLine('AURA RADIUS', Math.round(s.auraR || 0));
      if (s.auraDmg) html += statLine('DMG BUFF', '+' + Math.round(s.auraDmg * 100) + '%');
      if (s.auraRate) html += statLine('RATE BUFF', '+' + Math.round(s.auraRate * 100) + '%');
      if (s.auraRange) html += statLine('RANGE BUFF', '+' + Math.round(s.auraRange * 100) + '%');
      if (s.auraRepair) html += statLine('REPAIR', s.auraRepair.toFixed(1) + '/s');
      if (s.income) html += statLine('INCOME', '+' + Math.round(s.income * 100) + '%');
      if (s.reveal) html += statLine('DETECTION', 'REVEAL');
    } else if (t.isTrap) {
      html += statLine('DAMAGE', Math.round(s.dmg));
      html += statLine('BLAST', Math.round(s.splash));
      html += statLine('ARMOR PEN', Math.round(s.pen));
      if (s.stun) html += statLine('STUN', s.stun + 's');
    } else {
      html += statLine('DAMAGE', (s.dmg).toFixed(1));
      html += statLine('RATE', s.rate.toFixed(2) + '/s');
      html += statLine('RANGE', Math.round(s.range));
      html += statLine('DPS', Math.round(s.dmg * s.rate * (s.hits || 1)));
      if (s.splash) html += statLine('BLAST', Math.round(s.splash));
      if (s.pen) html += statLine('ARMOR PEN', Math.round(s.pen));
      if (s.crit) html += statLine('CRIT', Math.round(s.crit * 100) + '%');
      if (s.hits > 1) html += statLine('TARGETS', s.hits);
      if (s.burn) html += statLine('BURN', Math.round(s.burn) + '/s');
      if (s.chain > 1) html += statLine('CHAIN', s.chain);
    }
    html += statLine('INTEGRITY', Math.round(t.hp) + '/' + Math.round(t.hpMax));
    html += statLine('KILLS', t.kills || 0);
    el['ins-stats'].innerHTML = html;

    var pips = '';
    for (var i = 0; i < 3; i++) pips += '<div class="pip' + (i < t.level ? ' on' : '') + '"></div>';
    el['ins-upgrades'].innerHTML = pips;

    if (t.level >= 3) {
      el['ins-upgrade'].textContent = 'MAX LEVEL';
      el['ins-upgrade'].setAttribute('disabled', '');
    } else {
      var cost = Math.round(t.upgradeCost() * (1 - (G.researchFx.cost || 0)));
      el['ins-upgrade'].textContent = 'UPGRADE  ' + cost + 'C';
      if (G.resources.credits < cost) el['ins-upgrade'].setAttribute('disabled', '');
      else el['ins-upgrade'].removeAttribute('disabled');
    }
    el['ins-sell'].textContent = 'RECYCLE +' + t.sellValue() + 'C';
    var iconCanvas = el['ins-icon'];
    ZF.Sprites.drawIcon(iconCanvas.getContext('2d'), t.def, iconCanvas.width, iconCanvas.height);
  }

  /* ---------------- overlays ---------------- */
  function showGameOverlay(html, actions) {
    overlayAction = actions || null;
    el['go-panel'].innerHTML = html;
    el['game-overlay'].classList.remove('hidden');
  }
  function hideGameOverlay() {
    el['game-overlay'].classList.add('hidden');
    overlayAction = null;
  }

  function pausePanel() {
    var html = '<div class="go-title">PAUSED</div>' +
      '<div class="go-sub">THE HORDE IS HOLDING ITS BREATH</div>' +
      '<div class="go-stats">' +
      '<div><span>WAVE</span><b>' + Math.max(1, G.wave) + '</b></div>' +
      '<div><span>STAGE</span><b>' + G.stage + '</b></div>' +
      '<div><span>KILLS</span><b>' + G.stats.kills + '</b></div>' +
      '<div><span>TIME</span><b>' + U.time(G.stats.time) + '</b></div>' +
      '</div><div class="go-btns">' +
      '<button class="mbtn" data-go="resume"><span class="idx">&#9654;</span>RESUME</button>' +
      '<button class="mbtn" data-go="save"><span class="idx">&#128190;</span>SAVE GAME</button>' +
      '<button class="mbtn" data-go="load"><span class="idx">&#128194;</span>LOAD GAME</button>' +
      '<button class="mbtn" data-go="settings"><span class="idx">&#9881;</span>SETTINGS</button>' +
      '<button class="mbtn" data-go="restart"><span class="idx">&#8635;</span>RESTART RUN</button>' +
      '<button class="mbtn" data-go="quit"><span class="idx">&#10005;</span>ABANDON RUN</button>' +
      '</div>';
    showGameOverlay(html);
  }

  function gameOverPanel(data) {
    var html = '<div class="go-title red">BASE OVERRUN</div>' +
      '<div class="go-sub">THE LAST BASE HAS FALLEN</div>' +
      '<div class="go-stats">' +
      '<div><span>WAVE REACHED</span><b>' + data.wave + '</b></div>' +
      '<div><span>STAGE</span><b>' + data.stage + '</b></div>' +
      '<div><span>ZOMBIES KILLED</span><b>' + data.kills + '</b></div>' +
      '<div><span>BOSSES SLAIN</span><b>' + data.bossKills + '</b></div>' +
      '<div><span>SURVIVED</span><b>' + U.time(data.time) + '</b></div>' +
      '<div><span>SCORE</span><b>' + U.fmt(data.score) + '</b></div>' +
      '</div><div class="go-btns">' +
      '<button class="mbtn" data-go="restart"><span class="idx">&#8635;</span>NEW RUN</button>' +
      '<button class="mbtn" data-go="quit"><span class="idx">&#9776;</span>MAIN MENU</button>' +
      '</div>';
    showGameOverlay(html);
    ZF.Audio.play('defeat');
  }

  function onOverlayClick(e) {
    var btn = e.target.closest('[data-go]');
    if (!btn) return;
    var a = btn.getAttribute('data-go');
    ZF.Audio.play('ui_click');
    if (a === 'resume') { hideGameOverlay(); G.pause(false); }
    else if (a === 'save') {
      ZF.Panels.slots('save');
    } else if (a === 'load') {
      ZF.Panels.slots('load');
    } else if (a === 'settings') {
      ZF.Panels.settings();
    } else if (a === 'restart') {
      hideGameOverlay();
      G.newGame({ mapId: G.map.id, mode: G.mode });
      refreshAll();
    } else if (a === 'quit') {
      hideGameOverlay();
      ZF.App.toMenu();
    }
  }

  /* ---------------- transient UI ---------------- */
  function banner(text) {
    el['wave-banner'].textContent = text;
    el['wave-banner'].classList.remove('show');
    void el['wave-banner'].offsetWidth;
    el['wave-banner'].classList.add('show');
  }
  function toast(msg, type) {
    var t = U.el('div', 'toast ' + (type || ''), msg);
    el.toast.appendChild(t);
    while (el.toast.children.length > 5) el.toast.removeChild(el.toast.firstChild);
    window.setTimeout(function () {
      t.classList.add('fade');
      window.setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 420);
    }, 2600);
  }
  function callout(text) {
    el['event-callout'].textContent = text;
    el['event-callout'].classList.remove('show');
    void el['event-callout'].offsetWidth;
    el['event-callout'].classList.add('show');
  }

  /* ---------------- HUD update ---------------- */
  function setText(key, node, val) {
    if (!node) return;
    if (lastHud[key] === val) return;
    lastHud[key] = val;
    node.textContent = val;
  }

  function update() {
    if (!G.map) return;
    // base
    var pct = U.clamp(G.baseHp / G.baseMaxHp, 0, 1);
    el['base-hp-fill'].style.width = (pct * 100) + '%';
    el['base-hp-fill'].className = 'hpfill' + (pct < .3 ? ' low' : (pct < .6 ? ' mid' : ''));
    setText('hp', el['base-hp-text'], Math.ceil(G.baseHp) + '/' + Math.round(G.baseMaxHp) + '  (' + Math.round(pct * 100) + '%)');

    // resources
    var credits = Math.floor(G.resources.credits);
    if (lastRes.credits !== credits) {
      el['res-credits'].textContent = U.fmt(credits);
      if (lastRes.credits >= 0 && credits > lastRes.credits) flashRes('credits');
      lastRes.credits = credits;
      updateCards();
      if (G.selected) updateInspector();
    }
    var scrap = Math.floor(G.resources.scrap);
    if (lastRes.scrap !== scrap) {
      el['res-scrap'].textContent = U.fmt(scrap);
      if (lastRes.scrap >= 0 && scrap > lastRes.scrap) flashRes('scrap');
      lastRes.scrap = scrap;
    }
    var rp = G.profile ? G.profile.rp || 0 : 0;
    if (lastRes.research !== rp) {
      el['res-research'].textContent = U.fmt(rp);
      lastRes.research = rp;
    }

    var wv = G.waveState === 'prep' ? G.wave + 1 : G.wave;
    setText('stage', el['hud-stage'], String(G.stage));
    setText('wave', el['hud-wave'], String(wv));
    setText('left', el['hud-left'], String(G.enemies.length + G.spawnQueue.length + (G.boss ? 1 : 0)));
    setText('kills', el['hud-kills'], U.fmt(G.stats.kills));
    setText('time', el['hud-time'], U.time(G.stats.time));

    // wave button
    var btn = el['btn-nextwave'];
    var lbl = el['wave-btn-label'], sub = el['wave-bonus-label'];
    if (G.waveState === 'prep') {
      btn.classList.remove('urgent');
      setText('wb', lbl, 'WAVE ' + (G.wave + 1));
      setText('wbs', sub, 'START IN ' + Math.ceil(G.prepTimer) + 's');
      btn.disabled = false;
      el['wave-bonus-label'].classList.remove('hidden');
    } else if (G.waveState === 'clear') {
      btn.classList.toggle('urgent', G.clearTimer < 5);
      setText('wb', lbl, 'NEXT: WAVE ' + (G.wave + 1));
      setText('wbs', sub, '+' + Math.round(Math.max(0, G.clearTimer) * 2.5) + 'C EARLY BONUS');
      btn.disabled = false;
    } else {
      btn.classList.remove('urgent');
      setText('wb', lbl, 'WAVE ' + G.wave + ' ACTIVE');
      setText('wbs', sub, G.boss ? 'BOSS ENGAGED' : 'HOSTILES: ' + (G.enemies.length + G.spawnQueue.length));
      btn.disabled = true;
    }

    // build mode hint
    if (G.buildId) {
      var def = ZF.Data.unitById[G.buildId];
      el['build-hint'].classList.remove('hidden');
      el['build-hint'].textContent = 'DEPLOY ' + def.name + ' — ' + G.unitCost(def) + 'C (ESC TO CANCEL)';
    } else {
      el['build-hint'].classList.add('hidden');
    }

    // boss bar
    if (G.boss && G.boss.alive) {
      el['boss-bar'].classList.remove('hidden');
      if (bossEl !== G.boss) {
        bossEl = G.boss;
        el['boss-name'].textContent = G.boss.bossName + ' — PHASE ' + G.boss.phase;
      }
      setText('bossphase', el['boss-name'], G.boss.bossName + ' — PHASE ' + G.boss.phase);
      el['boss-fill'].style.width = U.clamp(G.boss.hp / G.boss.maxHp * 100, 0, 100) + '%';
    } else {
      el['boss-bar'].classList.add('hidden');
      bossEl = null;
    }

    // speed buttons
    for (var i = 0; i < el.speedBtns.length; i++) {
      var b = el.speedBtns[i];
      var sp = parseInt(b.getAttribute('data-speed'), 10);
      b.classList.toggle('active', G.state === 'paused' ? sp === 0 : sp === G.speed);
    }

    // sound icon
    var muted = ZF.Settings.data.audio.muted;
    el['btn-sound'].classList.toggle('off', muted);
    el['btn-sound'].textContent = muted ? '\u2715' : '\u266B';
  }

  function flashRes(name) {
    var node = U.$('.res[data-res="' + name + '"]');
    if (!node) return;
    node.classList.add('flash');
    window.setTimeout(function () { node.classList.remove('flash'); }, 160);
  }

  /* ---------------- events ---------------- */
  function refreshAll() {
    if (!G.map) return;
    lastRes = { credits: -1, scrap: -1, research: -1 };
    lastHud = {};
    buildDock();
    hideGameOverlay();
    update();
    updateInspector();
  }

  function init() {
    cache();
    buildDock();

    U.on(el['dock-tabs'], 'click', function (e) {
      var b = e.target.closest('.tab');
      if (!b) return;
      var cat = b.getAttribute('data-cat');
      ZF.Audio.play('ui_click');
      if (cat === 'tech') {
        ZF.Panels.research();
        return;
      }
      U.$$('.tab', el['dock-tabs']).forEach(function (t) { t.classList.toggle('active', t === b); });
      tab = cat;
      buildDock();
    });

    U.on(el['btn-nextwave'], 'click', function () {
      if (G.state !== 'playing') return;
      ZF.Audio.play('ui_click');
      G.callWave();
    });

    U.on(el['btn-menu'], 'click', function () {
      ZF.Audio.play('ui_click');
      if (G.state === 'playing') { G.pause(true); pausePanel(); }
      else if (G.state === 'paused') { hideGameOverlay(); G.pause(false); }
    });
    U.on(el['btn-sound'], 'click', function () {
      ZF.Settings.set('audio.muted', !ZF.Settings.data.audio.muted);
      ZF.Audio.unlock();
      ZF.Settings.apply();
      update();
    });
    el.speedBtns.forEach(function (b) {
      U.on(b, 'click', function () {
        var sp = parseInt(b.getAttribute('data-speed'), 10);
        ZF.Audio.play('ui_click');
        if (sp === 0) { G.pause(true); pausePanel(); }
        else { hideGameOverlay(); G.setSpeed(sp); }
      });
    });
    U.on(el['ins-upgrade'], 'click', function () { G.upgrade(G.selected); updateInspector(); });
    U.on(el['ins-sell'], 'click', function () { G.sell(G.selected); });
    U.on(el['ins-close'], 'click', function () { G.selectTower(null); });
    U.on(el['game-overlay'], 'click', onOverlayClick);

    // game events
    G.on('banner', banner);
    G.on('toast', function (o) { if (o && o.msg) toast(o.msg, o.type); });
    G.on('bossintro', function (b) { callout('WARNING: ' + b.name + ' — ' + b.title); bossEl = null; });
    G.on('bossdead', function () { el['boss-bar'].classList.add('hidden'); bossEl = null; callout('BOSS DESTROYED — SECTOR SECURE'); });
    G.on('bossphase', function () { callout('BOSS PHASE 2 — IT IS ENRAGED'); });
    G.on('selecttower', function () { updateInspector(); });
    G.on('buildmode', function (def) {
      updateCards();
      if (!def) el['build-hint'].classList.add('hidden');
    });
    G.on('newgame', function () { refreshAll(); });
    G.on('state', function (s) {
      if (s === 'playing') hideGameOverlay();
    });
    G.on('pause', function () { pausePanel(); });
    G.on('autopause', function () { pausePanel(); });
    G.on('gameover', function (data) { gameOverPanel(data); });
    G.on('achievement', function (a) {
      if (typeof a === 'string') toast('ACHIEVEMENT: ' + a, 'info');
      else toast('ACHIEVEMENT: ' + a.name + ' (+' + a.rp + ' RP)', 'info');
    });
    G.on('saved', function (o) { if (o && o.slot !== 'auto') toast('GAME SAVED — ' + o.slot.toUpperCase(), 'good'); });
    G.on('unlock', function () { buildDock(); });
    G.on('waveclear', function () { });

    // keep inspector fresh for buffs / hp
    window.setInterval(function () {
      if (G.state !== 'playing' && G.state !== 'paused') return;
      if (G.selected) updateInspector();
    }, 500);
  }

  /* keyboard 1-3 for dock tabs */
  ZF.Input.on('keydown', function (code) {
    if (!G.map || G.state !== 'playing') return;
    if (code === 'Digit1') { tab = 'infantry'; U.$$('.tab', el['dock-tabs']).forEach(function (t, i) { t.classList.toggle('active', i === 0); }); buildDock(); }
    if (code === 'Digit2') { tab = 'structure'; U.$$('.tab', el['dock-tabs']).forEach(function (t, i) { t.classList.toggle('active', i === 1); }); buildDock(); }
    if (code === 'Digit3') { tab = 'special'; U.$$('.tab', el['dock-tabs']).forEach(function (t, i) { t.classList.toggle('active', i === 2); }); buildDock(); }
    if (code === 'KeyE' && G.selected) G.upgrade(G.selected);
    if (code === 'KeyX' && G.selected) G.sell(G.selected);
  });

  ZF.HUD = {
    init: init,
    update: update,
    refresh: refreshAll,
    buildDock: buildDock,
    toast: toast,
    banner: banner,
    pausePanel: pausePanel,
    hideOverlay: hideGameOverlay,
    updateInspector: updateInspector,
    setTab: function (t) { tab = t; buildDock(); }
  };
})(window.ZF);
