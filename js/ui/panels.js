/* ============================================================
   PANELS — settings, map select, modes, credits, research, saves
   ============================================================ */
(function (ZF) {
  'use strict';
  var U = ZF.Util, $ = U.$;

  var root = null, titleEl = null, bodyEl = null, closeBtn = null, backDrop = null;
  var panel = null;
  var viewToken = 0;
  var ctx = {};

  /* ------------------------------------------------------------
     HELPERS
     ------------------------------------------------------------ */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function sec(t) { return '<div class="sec-title">' + esc(t) + '</div>'; }
  function click() { if (ZF.Audio) ZF.Audio.play('ui_click'); }
  function toast(msg, type) { if (ZF.HUD && ZF.HUD.toast) ZF.HUD.toast(msg, type || 'info'); }
  function get(path) { return ZF.Settings.get(path); }
  function pct(v) { return Math.round(v * 100) + '%'; }
  function modeLabel(id) {
    var m = ZF.Data.modes[id];
    if (!m) return 'ENDLESS';
    return { endless: 'ENDLESS', campaign: 'CAMPAIGN', hardcore: 'HARDCORE', challenge: 'CHALLENGE' }[id] || m.name;
  }
  function mapName(id) {
    var m = ZF.Data.mapsById[id];
    return m ? (m.short || m.name) : 'UNKNOWN SECTOR';
  }
  function fmtDate(ts) {
    if (!ts) return '—';
    try {
      var d = new Date(ts);
      return d.toLocaleDateString() + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    } catch (e) { return '—'; }
  }

  /* ------------------------------------------------------------
     MODAL SHELL
     ------------------------------------------------------------ */
  function open(name, ttl, sub, html) {
    panel = name;
    viewToken++;
    titleEl.innerHTML = esc(ttl) + (sub ? '<small>' + esc(sub) + '</small>' : '');
    bodyEl.innerHTML = html || '';
    bodyEl.scrollTop = 0;
    root.classList.remove('hidden');
    root.setAttribute('aria-hidden', 'false');
  }

  function close() {
    panel = null;
    ctx = {};
    viewToken++;
    var conf = root && root.querySelector('.confirm-modal');
    if (conf) conf.parentNode.removeChild(conf);
    if (root) {
      if (document.activeElement && root.contains(document.activeElement)) document.activeElement.blur();
      root.classList.add('hidden');
      root.setAttribute('aria-hidden', 'true');
    }
    if (bodyEl) bodyEl.innerHTML = '';
  }

  function closeTop() {
    var conf = root && root.querySelector('.confirm-modal');
    if (conf) { conf.parentNode.removeChild(conf); return; }
    close();
  }

  function ask(opts) {
    opts = opts || {};
    var box = U.el('div', 'modal confirm-modal');
    box.style.width = 'min(440px,92vw)';
    box.style.zIndex = '5';
    box.style.position = 'relative';
    box.innerHTML =
      '<div class="modal-head"><div class="modal-title">' + esc(opts.title || 'CONFIRM ORDER') + '</div></div>' +
      '<div class="modal-body">' +
      '<div class="muted" style="line-height:1.6;margin-bottom:16px">' + esc(opts.message || '') + '</div>' +
      '<div class="row" style="justify-content:flex-end">' +
      '<button class="btn ghost" data-ask="no">' + esc(opts.cancel || 'CANCEL') + '</button>' +
      '<button class="btn ' + (opts.danger ? 'danger' : 'primary') + '" data-ask="yes">' + esc(opts.yes || 'CONFIRM') + '</button>' +
      '</div></div>';
    root.appendChild(box);
    U.on(box, 'click', function (e) {
      var b = e.target.closest('[data-ask]');
      if (!b) return;
      var yes = b.getAttribute('data-ask') === 'yes';
      if (box.parentNode) box.parentNode.removeChild(box);
      click();
      if (yes && opts.onYes) opts.onYes();
    });
    return box;
  }

  /* ------------------------------------------------------------
     SETTINGS
     ------------------------------------------------------------ */
  function toggleRow(label, sub, path) {
    var on = !!get(path);
    return '<div class="setting"><div class="setting-label">' + esc(label) +
      (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div>' +
      '<button class="toggle ' + (on ? 'on' : '') + '" data-kind="bool" data-path="' + path +
      '" role="switch" aria-checked="' + on + '"><span class="knob"></span></button></div>';
  }

  function rangeRow(label, sub, path, min, max, step, format) {
    var v = Number(get(path));
    if (!isFinite(v)) v = min;
    var txt = format === 'pct' ? pct(v) : String(v);
    return '<div class="setting"><div class="setting-label">' + esc(label) +
      (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div>' +
      '<input type="range" data-kind="range" data-path="' + path + '" data-format="' + (format || '') +
      '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + v + '">' +
      '<span class="val" data-val="' + path + '">' + txt + '</span></div>';
  }

  function segRow(label, sub, path, options, type) {
    var cur = String(get(path));
    var btns = options.map(function (o) {
      return '<button type="button" data-value="' + o[0] + '" class="' + (String(o[0]) === cur ? 'on' : '') + '">' + esc(o[1]) + '</button>';
    }).join('');
    return '<div class="setting"><div class="setting-label">' + esc(label) +
      (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div>' +
      '<div class="seg" data-kind="seg" data-path="' + path + '" data-type="' + (type || 'num') + '">' + btns + '</div></div>';
  }

  function presetRow() {
    var cur = get('graphics.preset');
    var names = [['low', 'LOW'], ['medium', 'MED'], ['high', 'HIGH'], ['ultra', 'ULTRA']];
    return '<div class="setting"><div class="setting-label">QUALITY PRESET<small>Particle density, weather, lighting and screen effects.</small></div>' +
      '<div class="seg" data-kind="preset">' +
      names.map(function (n) {
        return '<button type="button" data-value="' + n[0] + '" class="' + (cur === n[0] ? 'on' : '') + '">' + n[1] + '</button>';
      }).join('') + '</div></div>';
  }

  function settingsHtml() {
    var S = ZF.Settings;
    var h = '';

    h += sec('AUDIO');
    h += rangeRow('MASTER VOLUME', 'Overall output level.', 'audio.master', 0, 1, .05, 'pct');
    h += rangeRow('MUSIC', 'Procedural battlefield score.', 'audio.music', 0, 1, .05, 'pct');
    h += rangeRow('SOUND EFFECTS', 'Weapons, impacts and explosions.', 'audio.sfx', 0, 1, .05, 'pct');
    h += rangeRow('INTERFACE', 'Button clicks and menu feedback.', 'audio.ui', 0, 1, .05, 'pct');
    h += toggleRow('MUTE ALL AUDIO', 'Silence everything without losing your volumes.', 'audio.muted');

    h += sec('GRAPHICS');
    h += presetRow();
    h += rangeRow('PARTICLE DENSITY', 'Blood, sparks, smoke and debris.', 'graphics.particles', 0, 1.5, .05, 'pct');
    h += toggleRow('SCREEN SHAKE', 'Camera kick on explosions and boss impacts.', 'graphics.screenShake');
    h += toggleRow('DAMAGE NUMBERS', 'Floating hit values over enemies.', 'graphics.damageNumbers');
    h += toggleRow('WEATHER EFFECTS', 'Rain, snow, sand, ash and embers.', 'graphics.weather');
    h += toggleRow('DYNAMIC LIGHTING', 'Muzzle flashes, fires and boss glow.', 'graphics.lights');
    h += toggleRow('SHOW FPS COUNTER', 'Display live frame rate in the top bar.', 'graphics.fpsCounter');

    h += sec('PERFORMANCE');
    h += toggleRow('PERFORMANCE MODE', 'Further reduces particles and effect density.', 'performance.perfMode');
    h += toggleRow('REDUCED EFFECTS', 'Cuts secondary effects for weaker hardware.', 'performance.reduceEffects');
    h += segRow('FRAME RATE TARGET', 'Caps rendering to keep devices cool.', 'performance.targetFps', [[30, '30'], [60, '60'], [120, '120']], 'num');

    h += sec('GAMEPLAY');
    h += toggleRow('AUTO-PAUSE', 'Pause when the tab loses focus.', 'gameplay.autoPause');
    h += toggleRow('HEALTH BARS', 'Show enemy health above damaged targets.', 'gameplay.healthBars');
    h += segRow('DEFAULT GAME SPEED', 'Starting speed for every new operation.', 'gameplay.speed', [[1, '1x'], [2, '2x'], [4, '4x']], 'num');

    h += sec('CONTROLS');
    h += toggleRow('HAPTIC FEEDBACK', 'Vibration on supported mobile devices.', 'controls.haptics');

    h += sec('DATA & STORAGE');
    var backend = ZF.Save ? ZF.Save.backend : 'local';
    h += '<div class="setting"><div class="setting-label">SAVE BACKEND<small>IndexedDB is used when available, with a localStorage fallback.</small></div>' +
      '<div class="val" style="color:var(--cyan)">' + (backend === 'indexeddb' ? 'INDEXEDDB' : 'LOCAL') + '</div></div>';
    h += '<div class="row" style="gap:8px;margin-top:14px;flex-wrap:wrap">' +
      '<button class="btn ghost" data-act="reset-settings">RESET SETTINGS</button>' +
      '<button class="btn danger" data-act="wipe-saves">WIPE SAVE SLOTS</button></div>';
    h += '<div class="muted" style="margin-top:12px;line-height:1.6">Settings save automatically. Wiping save slots does not erase permanent research or achievements.</div>';
    return h;
  }

  function applyDefaults() {
    var S = ZF.Settings, d = S.DEFAULTS;
    Object.keys(d).forEach(function (k) {
      var v = d[k];
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        Object.keys(v).forEach(function (kk) { S.set(k + '.' + kk, U.deepCopy(v[kk]), true); });
      } else {
        S.set(k, U.deepCopy(v), true);
      }
    });
    S.apply();
    S.save();
  }

  function settings() {
    open('settings', 'SETTINGS', 'AUDIO · GRAPHICS · PERFORMANCE · GAMEPLAY', settingsHtml());
  }

  function rerenderSettings() {
    if (panel !== 'settings') return;
    var top = bodyEl.scrollTop;
    bodyEl.innerHTML = settingsHtml();
    bodyEl.scrollTop = top;
  }

  /* ------------------------------------------------------------
     MAP SELECTION / NEW OPERATION
     ------------------------------------------------------------ */
  function mapChips(m) {
    var out = '<span class="chip">THREAT ' + m.difficulty + '/5</span>' +
      '<span class="chip">' + esc((m.weather || 'clear').toUpperCase()) + '</span>';
    (m.mods || []).forEach(function (mo) {
      out += '<span class="chip ' + (mo.good ? 'good' : 'bad') + '">' + esc(mo.label) + '</span>';
    });
    return out;
  }

  function mapBody() {
    var maps = ZF.Data.maps;
    var cards = maps.map(function (m) {
      return '<button type="button" class="map-card' + (m.id === ctx.mapId ? ' selected' : '') + '" data-map="' + m.id + '">' +
        '<canvas class="map-thumb" width="320" height="192" data-thumb="' + m.id + '"></canvas>' +
        '<div class="map-info"><div class="map-name">' + esc(m.short || m.name) + '</div>' +
        '<div class="map-tag">' + esc(m.tag) + '</div>' +
        '<div class="map-mods">' + mapChips(m) + '</div></div></button>';
    }).join('');

    var modeBtns = ZF.Data.modeList.map(function (id) {
      return '<button type="button" data-value="' + id + '" class="' + (id === ctx.mode ? 'on' : '') + '">' + modeLabel(id) + '</button>';
    }).join('');

    return '<div class="muted" style="margin-bottom:12px">Select a battlefield, choose an operation mode, then deploy. Every map supports every mode and infinite waves.</div>' +
      '<div class="map-grid">' + cards + '</div>' +
      sec('OPERATION MODE') +
      '<div class="seg" data-kind="mapmode">' + modeBtns + '</div>' +
      '<div class="muted" id="map-mode-brief" style="margin-top:10px;line-height:1.5"></div>' +
      '<div class="row" style="margin-top:16px">' +
      '<button class="btn ghost" data-act="back">BACK</button>' +
      '<button class="btn primary" data-act="deploy" id="map-deploy" style="flex:1"></button></div>';
  }

  function updateMapUI() {
    if (!bodyEl) return;
    var deploy = bodyEl.querySelector('#map-deploy');
    if (deploy) deploy.textContent = 'DEPLOY TO ' + mapName(ctx.mapId).toUpperCase();
    var brief = bodyEl.querySelector('#map-mode-brief');
    var md = ZF.Data.modes[ctx.mode] || ZF.Data.modes.endless;
    if (brief) {
      brief.innerHTML = '<b style="color:var(--amber-2)">' + esc(md.name) + '</b> — ' + esc(md.desc) +
        '<br><span style="color:#6f8274">HOSTILE HP ×' + md.hp + ' · DAMAGE ×' + md.dmg + ' · BASE ×' + md.baseHp + '</span>';
    }
    U.$$('.map-card', bodyEl).forEach(function (c) {
      c.classList.toggle('selected', c.getAttribute('data-map') === ctx.mapId);
    });
    U.$$('[data-kind="mapmode"] button', bodyEl).forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-value') === ctx.mode);
    });
  }

  function drawThumbs() {
    U.$$('canvas[data-thumb]', bodyEl).forEach(function (cv) {
      var m = ZF.Data.mapsById[cv.getAttribute('data-thumb')];
      if (!m) return;
      try {
        var path = ZF.Path.build(m);
        var ter = ZF.Terrain.get(m, path.cells);
        var g = cv.getContext('2d');
        g.imageSmoothingEnabled = false;
        g.clearRect(0, 0, cv.width, cv.height);
        g.drawImage(ter.bg, 0, 0, 640, 384, 0, 0, cv.width, cv.height);
        // spawn + core markers so each layout reads at a glance
        var sx = path.spawn.x * cv.width / 640, sy = path.spawn.y * cv.height / 384;
        var cx = path.core.x * cv.width / 640, cy = path.core.y * cv.height / 384;
        g.fillStyle = 'rgba(0,0,0,.55)';
        g.fillRect(sx - 4, sy - 4, 8, 8);
        g.fillRect(cx - 5, cy - 5, 10, 10);
        g.fillStyle = '#ff5a42';
        g.fillRect(sx - 3, sy - 3, 6, 6);
        g.fillStyle = '#ffd479';
        g.fillRect(cx - 4, cy - 4, 8, 8);
        g.fillStyle = 'rgba(255,255,255,.35)';
        g.fillRect(cx - 4, cy - 4, 8, 2);
      } catch (e) {
        var gg = cv.getContext('2d');
        gg.fillStyle = '#0b1410';
        gg.fillRect(0, 0, cv.width, cv.height);
      }
    });
  }

  function maps(opts) {
    opts = opts || {};
    var lastMap = ZF.Settings.data.lastMap || ZF.Data.maps[0].id;
    ctx = {
      mapId: opts.mapId || lastMap,
      mode: opts.mode || ZF.Settings.data.lastMode || 'endless'
    };
    if (!ZF.Data.mapsById[ctx.mapId]) ctx.mapId = ZF.Data.maps[0].id;
    if (!ZF.Data.modes[ctx.mode]) ctx.mode = 'endless';
    open('maps', opts.title || 'MAP SELECTION', '8 BATTLEFIELDS · ONE LAST BASE', mapBody());
    drawThumbs();
    updateMapUI();
  }

  function deploy() {
    ZF.Settings.set('lastMap', ctx.mapId, true);
    ZF.Settings.set('lastMode', ctx.mode, true);
    var mapId = ctx.mapId, mode = ctx.mode;
    close();
    ZF.App.startGame(mapId, mode);
  }

  function newGame() { maps({ title: 'NEW OPERATION' }); }

  /* ------------------------------------------------------------
     GAME MODES
     ------------------------------------------------------------ */
  function modesBody() {
    var cards = ZF.Data.modeList.map(function (id) {
      var m = ZF.Data.modes[id];
      return '<div class="mode-card' + (id === ctx.mode ? ' selected' : '') + '" data-mode="' + id + '">' +
        '<div class="mode-name">' + esc(m.name) + '</div>' +
        '<div class="mode-desc">' + esc(m.desc) + '</div>' +
        '<div class="mode-meta">' +
        '<span class="chip">' + esc(m.difficulty) + '</span>' +
        m.tags.map(function (t) { return '<span class="chip good">' + esc(t) + '</span>'; }).join('') +
        '</div>' +
        '<div class="muted" style="font-size:10px">ENEMY HP ×' + m.hp + ' · DAMAGE ×' + m.dmg +
        ' · BASE INTEGRITY ×' + m.baseHp + ' · START ' + m.startCredits + 'C</div>' +
        '</div>';
    }).join('');

    var ch = ZF.Data.challengeMods.map(function (m) {
      return '<span class="chip ' + (m.id === 'rich' ? 'good' : 'bad') + '">' + esc(m.name) + '</span>';
    }).join('');

    return '<div class="muted" style="margin-bottom:12px">Pick a doctrine. Challenge Mode rolls two random war modifiers on every new run.</div>' +
      '<div class="grid2">' + cards + '</div>' +
      sec('CHALLENGE MODIFIERS') +
      '<div class="map-mods" style="margin-bottom:2px">' + ch + '</div>' +
      '<div class="row" style="margin-top:16px">' +
      '<button class="btn ghost" data-act="back">BACK</button>' +
      '<button class="btn primary" data-act="open-maps" style="flex:1">SELECT BATTLEFIELD</button></div>';
  }

  function modes() {
    ctx = { mode: ZF.Settings.data.lastMode || 'endless' };
    if (!ZF.Data.modes[ctx.mode]) ctx.mode = 'endless';
    open('modes', 'GAME MODES', 'CHOOSE YOUR DOCTRINE', modesBody());
  }

  function selectModeTile(id) {
    ctx.mode = id;
    if (bodyEl) {
      U.$$('.mode-card', bodyEl).forEach(function (c) {
        c.classList.toggle('selected', c.getAttribute('data-mode') === id);
      });
    }
  }

  /* ------------------------------------------------------------
     CREDITS
     ------------------------------------------------------------ */
  function credits() {
    var h = '<div class="credits">' +
      '<div class="cred-line" style="animation-delay:0s">' +
      '<div class="kicker">ZOMBIE FRONTLINE: LAST BASE</div>' +
      '<h2>CREDITS</h2></div>' +

      '<div class="grp cred-line" style="animation-delay:.08s">' +
      '<div class="grp-title">GAME CREATED BY</div>' +
      '<div class="name">SATYA</div></div>' +

      '<div class="grp cred-line" style="animation-delay:.16s">' +
      '<div class="grp-title">AI &amp; DEVELOPMENT TOOLS</div>' +
      '<div class="tool">ChatGPT</div>' +
      '<div class="tool">OpenCode</div>' +
      '<div class="tool">DeepSeek V4.1 Flash</div></div>' +

      '<div class="grp cred-line" style="animation-delay:.24s">' +
      '<div class="grp-title">ENGINE &amp; TECHNOLOGY</div>' +
      '<div class="muted">Custom HTML5 Canvas engine · Vanilla JavaScript · Procedural pixel art · WebAudio synthesis<br>' +
      'No external art, music or sound assets. Every sprite and every sound is generated at runtime.</div></div>' +

      '<div class="grp cred-line" style="animation-delay:.32s">' +
      '<div class="grp-title">SPECIAL THANKS</div>' +
      '<div class="muted">Every survivor still holding the line.</div></div>' +

      '<div class="note cred-line" style="animation-delay:.4s">' +
      'Built as a complete, offline-capable browser game. Save data stays on this device.<br>' +
      'Survive the night. Rebuild the wall. Last base stands.</div>' +
      '</div>';
    open('credits', 'CREDITS', 'THE PEOPLE AND TOOLS BEHIND THE LAST BASE', h);
  }

  /* ------------------------------------------------------------
     RESEARCH & ACHIEVEMENTS
     ------------------------------------------------------------ */
  function profile() {
    if (!ZF.Game.profile) ZF.Game.profile = ZF.Save.loadProfile();
    return ZF.Game.profile;
  }

  function researchBody(p) {
    var rp = p.rp || 0;
    var total = 0, spent = 0;
    ZF.Data.research.forEach(function (r) {
      total += r.max;
      spent += (p.research && p.research[r.id]) || 0;
    });

    var h = '<div class="row" style="justify-content:space-between;margin-bottom:12px">' +
      '<div class="muted">Permanent upgrades. Research survives every run and every map.</div>' +
      '<div class="chip good" style="font-size:8px;padding:5px 8px">' + rp + ' RP AVAILABLE</div></div>';

    h += '<div class="grid3" style="margin-bottom:14px">' +
      '<div class="tech"><div class="tech-icon">\u2691</div><div><div class="tech-name">BEST WAVE</div><div class="tech-desc">' + (p.best && p.best.wave || 0) + '</div></div></div>' +
      '<div class="tech"><div class="tech-icon">\u2620</div><div><div class="tech-name">TOTAL KILLS</div><div class="tech-desc">' + U.fmt(p.totalKills || 0) + '</div></div></div>' +
      '<div class="tech"><div class="tech-icon">\u2694</div><div><div class="tech-name">RESEARCH PROGRESS</div><div class="tech-desc">' + spent + ' / ' + total + ' LEVELS</div></div></div>' +
      '</div>';

    h += sec('RESEARCH TREE');
    h += '<div class="tech-grid">';
    ZF.Data.research.forEach(function (r) {
      var lvl = (p.research && p.research[r.id]) || 0;
      var maxed = lvl >= r.max;
      var cost = maxed ? 0 : r.cost(lvl);
      var can = !maxed && rp >= cost;
      h += '<div class="tech' + (maxed ? ' done' : '') + '">' +
        '<div class="tech-icon">' + r.icon + '</div>' +
        '<div style="flex:1;min-width:0">' +
        '<div class="tech-name">' + esc(r.name) + ' — LV ' + lvl + '/' + r.max + '</div>' +
        '<div class="tech-desc">' + esc(r.desc) + '</div>' +
        '<div class="tech-cost">' + (maxed ? 'FULLY RESEARCHED' : 'COST ' + cost + ' RP') + '</div>' +
        '<button class="btn ' + (can ? 'primary' : 'ghost') + '" data-research="' + r.id + '"' + (can ? '' : ' disabled') + '>' +
        (maxed ? 'MAXED' : (can ? 'RESEARCH' : 'NEED ' + cost + ' RP')) + '</button>' +
        '</div></div>';
    });
    h += '</div>';

    var unlocked = (p.achievements || []).length;
    h += sec('ACHIEVEMENTS — ' + unlocked + ' / ' + ZF.Data.achievements.length);
    h += '<div class="tech-grid">';
    ZF.Data.achievements.forEach(function (a) {
      var done = (p.achievements || []).indexOf(a.id) >= 0;
      h += '<div class="tech' + (done ? ' done' : '') + '">' +
        '<div class="tech-icon" style="color:' + (done ? 'var(--green-2)' : '#4c6152') + '">' + (done ? '\u2605' : '\u2606') + '</div>' +
        '<div style="flex:1;min-width:0">' +
        '<div class="tech-name">' + esc(a.name) + '</div>' +
        '<div class="tech-desc">' + esc(a.desc) + '</div>' +
        '<div class="tech-cost" style="color:' + (done ? 'var(--green)' : 'var(--cyan)') + '">' +
        (done ? 'UNLOCKED' : '+' + a.rp + ' RP') + '</div></div></div>';
    });
    h += '</div>';
    h += '<div class="muted" style="margin-top:14px;line-height:1.6">Earn RP from wave clears, bosses and achievements. Research is permanent and applies to all future runs.</div>';
    return h;
  }

  function research() {
    var p = profile();
    ctx = { profile: p };
    open('research', 'RESEARCH & ACHIEVEMENTS', 'PERMANENT UPGRADES · ' + (p.rp || 0) + ' RP AVAILABLE', researchBody(p));
  }

  function buyResearch(id) {
    var p = ctx.profile;
    var r = ZF.Data.researchById[id];
    if (!p || !r) return;
    var lvl = (p.research && p.research[id]) || 0;
    if (lvl >= r.max) return;
    var cost = r.cost(lvl);
    if ((p.rp || 0) < cost) {
      click();
      toast('NEED ' + cost + ' RP FOR ' + r.name, 'warn');
      return;
    }
    p.rp = (p.rp || 0) - cost;
    p.research = p.research || {};
    p.research[id] = lvl + 1;
    ZF.Save.saveProfile(p);
    ZF.Game.profile = p;
    ZF.Game.refreshResearch();
    if (ZF.Audio) ZF.Audio.play('levelup');
    if (ZF.HUD) {
      ZF.HUD.toast('RESEARCH COMPLETE — ' + r.name + ' LV ' + (lvl + 1), 'good');
      ZF.HUD.update();
    }
    var top = bodyEl.scrollTop;
    titleEl.innerHTML = 'RESEARCH &amp; ACHIEVEMENTS<small>PERMANENT UPGRADES · ' + (p.rp || 0) + ' RP AVAILABLE</small>';
    bodyEl.innerHTML = researchBody(p);
    bodyEl.scrollTop = top;
  }

  /* ------------------------------------------------------------
     SAVE SLOTS
     ------------------------------------------------------------ */
  function slotLabel(slot) {
    if (slot === 'auto') return 'AUTO SAVE';
    return 'SLOT ' + slot.replace('slot', '');
  }

  function slotsBody(list, mode) {
    var h = '<div class="muted" style="margin-bottom:12px">' +
      (mode === 'save' ? 'Write the current run to a manual slot. Auto saves are created at every wave clear and on pause.'
        : 'Restore a run from any slot. Corrupted saves automatically fall back to the previous backup.') +
      '</div>';

    list.forEach(function (s) {
      var empty = s.empty;
      var meta, meta2 = '';
      if (empty) {
        meta = 'EMPTY SLOT';
      } else {
        meta = mapName(s.mapId) + ' · ' + String(s.mode || 'endless').toUpperCase() + ' · WAVE ' + s.wave;
        meta2 = 'KILLS ' + U.fmt(s.kills || 0) + ' · SURVIVED ' + U.time(s.time || 0) +
          ' · BASE ' + Math.max(0, Math.round(s.baseHp || 0)) + '/' + Math.round(s.baseMaxHp || 100) +
          ' · ' + fmtDate(s.savedAt);
      }

      var actions = '';
      if (mode === 'save') {
        if (s.slot === 'auto') {
          actions += '<span class="muted" style="font-size:9px;align-self:center">SYSTEM MANAGED</span>';
        } else {
          actions += '<button class="btn primary" data-slot-act="save" data-slot="' + s.slot + '">' +
            (empty ? 'SAVE' : 'OVERWRITE') + '</button>';
          if (!empty) actions += '<button class="btn danger" data-slot-act="delete" data-slot="' + s.slot + '">DELETE</button>';
        }
      } else {
        actions += '<button class="btn primary" data-slot-act="load" data-slot="' + s.slot + '"' + (empty ? ' disabled' : '') + '>LOAD</button>';
        if (!empty) actions += '<button class="btn danger" data-slot-act="delete" data-slot="' + s.slot + '">DELETE</button>';
      }

      h += '<div class="slot' + (empty ? ' empty' : '') + '">' +
        '<div class="slot-info"><div class="slot-name">' + esc(slotLabel(s.slot)) +
        (s.slot === 'auto' ? ' <span class="chip good" style="font-size:6px">AUTO</span>' : '') + '</div>' +
        '<div class="slot-meta" style="color:' + (empty ? '#5e7163' : '#b9cdb2') + '">' + esc(meta) + '</div>' +
        (meta2 ? '<div class="slot-meta">' + esc(meta2) + '</div>' : '') +
        '</div><div class="slot-actions">' + actions + '</div></div>';
    });

    h += '<div class="row" style="margin-top:14px"><button class="btn ghost" data-act="back" style="flex:1">CLOSE</button></div>';
    return h;
  }

  function slots(mode) {
    mode = mode === 'save' ? 'save' : 'load';
    ctx = { slotMode: mode };
    open('slots', mode === 'save' ? 'SAVE GAME' : 'LOAD GAME', 'SELECT A SAVE SLOT', '<div class="muted">SCANNING SAVE DATA...</div>');
    var token = viewToken;
    ZF.Save.list().then(function (list) {
      if (token !== viewToken || panel !== 'slots') return;
      bodyEl.innerHTML = slotsBody(list, mode);
    }).catch(function () {
      if (token !== viewToken || panel !== 'slots') return;
      bodyEl.innerHTML = '<div class="muted">SAVE DATA COULD NOT BE READ.</div>' +
        '<div class="row" style="margin-top:12px"><button class="btn ghost" data-act="slots-retry">RETRY</button></div>';
    });
  }

  function performSave(slot) {
    ZF.Game.saveTo(slot).then(function (ok) {
      if (ok) {
        if (ZF.Menu) ZF.Menu.refreshSave();
        close();
      } else {
        toast('SAVE FAILED — STORAGE UNAVAILABLE', 'bad');
      }
    });
  }

  function doSlotAction(act, slot) {
    if (!slot) return;
    click();
    if (act === 'load') {
      ZF.Save.read(slot).then(function (data) {
        if (!data) { toast('SAVE SLOT EMPTY OR CORRUPTED', 'warn'); return; }
        close();
        ZF.App.loadSave(data);
      }).catch(function () { toast('COULD NOT READ SAVE SLOT', 'bad'); });
      return;
    }
    if (act === 'save') {
      ZF.Save.read(slot).then(function (existing) {
        if (existing) {
          ask({
            title: 'OVERWRITE SAVE',
            message: 'This will replace the existing run in ' + slotLabel(slot) + '. The previous save is kept as a one-step backup.',
            yes: 'OVERWRITE', danger: true,
            onYes: function () { performSave(slot); }
          });
        } else {
          performSave(slot);
        }
      }).catch(function () { performSave(slot); });
      return;
    }
    if (act === 'delete') {
      ask({
        title: 'DELETE SAVE',
        message: 'Permanently delete the save in ' + slotLabel(slot) + '? This cannot be undone.',
        yes: 'DELETE', danger: true,
        onYes: function () {
          ZF.Save.remove(slot).then(function () {
            if (ZF.Menu) ZF.Menu.refreshSave();
            slots(ctx.slotMode);
          });
        }
      });
    }
  }

  function wipeSaves() {
    ZF.Save.list().then(function (list) {
      var occupied = list.filter(function (s) { return !s.empty; }).length;
      ask({
        title: 'WIPE SAVE SLOTS',
        message: 'Delete all ' + occupied + ' save slot(s)? Research, achievements and settings are not affected.',
        yes: 'WIPE ALL', danger: true,
        onYes: function () {
          Promise.all(ZF.Save.SLOTS.map(function (s) { return ZF.Save.remove(s); })).then(function () {
            if (ZF.Menu) ZF.Menu.refreshSave();
            toast('ALL SAVE SLOTS CLEARED', 'info');
            rerenderSettings();
          });
        }
      });
    });
  }

  /* ------------------------------------------------------------
     EVENT DELEGATION
     ------------------------------------------------------------ */
  function onInput(e) {
    var inp = e.target.closest ? e.target.closest('input[type=range][data-kind="range"]') : null;
    if (!inp) return;
    var path = inp.getAttribute('data-path');
    var v = parseFloat(inp.value);
    if (!isFinite(v)) return;
    ZF.Settings.set(path, v);
    var out = bodyEl.querySelector('[data-val="' + path + '"]');
    if (out) out.textContent = inp.getAttribute('data-format') === 'pct' ? pct(v) : String(v);
  }

  function onBodyClick(e) {
    var b;

    b = e.target.closest ? e.target.closest('[data-kind="bool"]') : null;
    if (b) {
      var path = b.getAttribute('data-path');
      var val = !ZF.Settings.get(path);
      ZF.Settings.set(path, val);
      b.classList.toggle('on', val);
      b.setAttribute('aria-checked', String(val));
      click();
      if (path === 'graphics.fpsCounter' && ZF.App) ZF.App.syncFps();
      return;
    }

    b = e.target.closest ? e.target.closest('[data-kind="seg"] button') : null;
    if (b) {
      var group = b.parentNode;
      var gpath = group.getAttribute('data-path');
      var gtype = group.getAttribute('data-type') || 'num';
      var raw = b.getAttribute('data-value');
      var value = gtype === 'num' ? parseFloat(raw) : raw;
      if (gpath) ZF.Settings.set(gpath, value);
      U.$$('button', group).forEach(function (x) { x.classList.toggle('on', x === b); });
      click();
      return;
    }

    b = e.target.closest ? e.target.closest('[data-kind="preset"] button') : null;
    if (b) {
      ZF.Settings.applyPreset(b.getAttribute('data-value'));
      click();
      rerenderSettings();
      return;
    }

    b = e.target.closest ? e.target.closest('[data-kind="mapmode"] button') : null;
    if (b) {
      ctx.mode = b.getAttribute('data-value');
      updateMapUI();
      click();
      return;
    }

    b = e.target.closest ? e.target.closest('.map-card[data-map]') : null;
    if (b && panel === 'maps') {
      ctx.mapId = b.getAttribute('data-map');
      updateMapUI();
      click();
      return;
    }

    b = e.target.closest ? e.target.closest('.mode-card[data-mode]') : null;
    if (b && panel === 'modes') {
      selectModeTile(b.getAttribute('data-mode'));
      click();
      return;
    }

    b = e.target.closest ? e.target.closest('[data-research]') : null;
    if (b) {
      buyResearch(b.getAttribute('data-research'));
      return;
    }

    b = e.target.closest ? e.target.closest('[data-slot-act]') : null;
    if (b) {
      doSlotAction(b.getAttribute('data-slot-act'), b.getAttribute('data-slot'));
      return;
    }

    b = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!b) return;
    var act = b.getAttribute('data-act');
    if (act === 'back') { click(); close(); return; }
    if (act === 'deploy') { click(); deploy(); return; }
    if (act === 'open-maps') {
      click();
      maps({ mode: ctx.mode, title: 'SELECT BATTLEFIELD' });
      return;
    }
    if (act === 'reset-settings') {
      click();
      ask({
        title: 'RESET SETTINGS',
        message: 'Restore audio, graphics, performance, gameplay and control settings to their defaults?',
        yes: 'RESET', danger: true,
        onYes: function () { applyDefaults(); rerenderSettings(); toast('SETTINGS RESTORED TO DEFAULTS', 'info'); }
      });
      return;
    }
    if (act === 'wipe-saves') { click(); wipeSaves(); return; }
    if (act === 'slots-retry') { click(); slots(ctx.slotMode); return; }
  }

  /* ------------------------------------------------------------
     INIT / API
     ------------------------------------------------------------ */
  function init() {
    root = $('#modal-root');
    if (!root) return;
    titleEl = $('#modal-title');
    bodyEl = $('#modal-body');
    closeBtn = $('#modal-close');
    backDrop = $('.modal-backdrop', root);

    U.on(closeBtn, 'click', function () { click(); close(); });
    U.on(backDrop, 'click', function () { closeTop(); });
    U.on(bodyEl, 'input', onInput);
    U.on(bodyEl, 'change', onInput);
    U.on(bodyEl, 'click', onBodyClick);

    // capture so Escape closes the modal instead of reaching the game controller
    document.addEventListener('keydown', function (e) {
      if (!panel) return;
      if (e.key === 'Escape' || e.code === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeTop();
      }
    }, true);
  }

  ZF.Panels = {
    init: init,
    open: open,
    close: close,
    settings: settings,
    maps: maps,
    modes: modes,
    credits: credits,
    research: research,
    slots: slots,
    newGame: newGame,
    ask: ask,
    isOpen: function () { return !!panel; }
  };
})(window.ZF);
