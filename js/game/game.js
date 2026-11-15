/* ============================================================
   GAME CONTROLLER — state, simulation, rendering, saves
   ============================================================ */
(function (ZF) {
  'use strict';
  var U = ZF.Util, TILE = 16;
  var W = 640, H = 384;

  var G = ZF.Game = {
    state: 'idle',
    speed: 1,
    canvas: null,
    ctx: null,
    bus: new U.Bus(),
    towers: [],
    enemies: [],
    projectiles: [],
    pools: [],
    corpses: [],
    pathBlockers: [],
    boss: null,
    bossIntro: 0,
    hover: { x: -1, y: -1, valid: false },
    buildId: null,
    selected: null,
    reveal: false,
    incomeMul: 1,
    researchFx: {},
    hurtFlash: 0,
    waveState: 'idle',
    prepTimer: 0,
    clearTimer: 0,
    spawnTimer: 0,
    spawnQueue: [],
    waveData: null,
    rageTimer: 0,
    rageMul: 1
  };

  /* ------------------------------------------------------------
     INIT
     ------------------------------------------------------------ */
  G.init = function (canvas) {
    G.canvas = canvas;
    G.ctx = canvas.getContext('2d', { alpha: false });
    G.ctx.imageSmoothingEnabled = false;
    ZF.Input.attach(canvas);
    ZF.Input.on('move', function (p) { G.onPointerMove(p); });
    ZF.Input.on('down', function (p, e) { G.onPointerDown(p, e); });
    ZF.Input.on('keydown', function (code, e) { G.onKey(code, e); });
    G.fit();
    window.addEventListener('resize', G.fit);
    window.addEventListener('orientationchange', function () { window.setTimeout(G.fit, 120); });
    G.addEventListenerVisibility();
    return G;
  };

  G.fit = function () {
    if (!G.canvas) return;
    var wrap = G.canvas.parentElement;
    if (!wrap) return;
    var aw = wrap.clientWidth, ah = wrap.clientHeight;
    if (!aw || !ah) return;
    var s = Math.min(aw / W, ah / H);
    var cw = Math.max(160, Math.floor(W * s)), ch = Math.max(96, Math.floor(H * s));
    G.canvas.style.width = cw + 'px';
    G.canvas.style.height = ch + 'px';
    ZF.Input.measure();
  };

  G.addEventListenerVisibility = function () {
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && G.state === 'playing' && ZF.Settings.data.gameplay.autoPause) {
        G.pause(true);
        G.emit('autopause');
      }
    });
    window.addEventListener('beforeunload', function () {
      if (G.state === 'playing' && G.wave > 0) {
        try { G.autoSave(); } catch (e) {}
      }
    });
  };

  G.emit = function (ev, a, b) { G.bus.emit(ev, a, b); };
  G.on = function (ev, fn) { return G.bus.on(ev, fn); };

  /* ------------------------------------------------------------
     RESEARCH
     ------------------------------------------------------------ */
  G.computeResearch = function (profile) {
    var fx = { dmg: 0, rate: 0, range: 0, baseHp: 0, cost: 0, income: 0, structHp: 0, crit: 0, critDmg: 0, scrap: 0, waveBonus: 0 };
    if (!profile) return fx;
    ZF.Data.research.forEach(function (r) {
      var lvl = profile.research && profile.research[r.id] || 0;
      if (lvl > 0) {
        var f = r.fx(lvl);
        for (var k in f) fx[k] = (fx[k] || 0) + f[k];
      }
    });
    return fx;
  };

  G.refreshResearch = function () {
    var prevBase = G.researchFx.baseHp || 0;
    G.researchFx = G.computeResearch(G.profile);
    if (G.state === 'playing' || G.state === 'paused') {
      if (G.researchFx.baseHp !== prevBase) {
        var oldMax = G.baseMaxHp;
        G.baseMaxHp = Math.round(100 * G.modeDef.baseHp * (1 + G.researchFx.baseHp));
        G.baseHp = Math.min(G.baseMaxHp, G.baseHp + (G.baseMaxHp - oldMax));
      }
      G.recalcAuras();
    }
  };

  /* ------------------------------------------------------------
     NEW GAME
     ------------------------------------------------------------ */
  G.newGame = function (opts) {
    opts = opts || {};
    var map = ZF.Data.mapsById[opts.mapId || ZF.Settings.data.lastMap] || ZF.Data.maps[0];
    var modeDef = ZF.Data.modes[opts.mode || ZF.Settings.data.lastMode] || ZF.Data.modes.endless;
    G.map = map;
    G.modeDef = modeDef;
    G.mode = modeDef.id;
    G.profile = G.profile || ZF.Save.loadProfile();
    G.researchFx = G.computeResearch(G.profile);
    G.mapMods = map.modData || {};

    G.challengeMods = [];
    G.challengeFx = {};
    if (modeDef.id === 'challenge') {
      var pool = ZF.Data.challengeMods.slice();
      U.shuffle(pool);
      G.challengeMods = pool.slice(0, 2);
      G.challengeMods.forEach(function (m) {
        for (var k in m.fx) {
          if (typeof m.fx[k] === 'number') G.challengeFx[k] = (G.challengeFx[k] || 1) * (k === 'armor' || k === 'credits' ? 1 : m.fx[k]);
        }
        if (m.fx.armor) G.challengeFx.armor = (G.challengeFx.armor || 0) + m.fx.armor;
        if (m.fx.credits) G.challengeFx.credits = (G.challengeFx.credits || 0) + m.fx.credits;
        if (m.fx.swarm) G.challengeFx.swarm = true;
      });
    }

    G.path = ZF.Path.build(map);
    G.grid = new ZF.Grid(map, G.path);
    G.terrain = ZF.Terrain.get(map, G.path.cells);
    ZF.FX.clear();

    G.towers = []; G.enemies = []; G.projectiles = []; G.pools = []; G.corpses = [];
    G.pathBlockers = [];
    G.boss = null; G.bossIntro = 0;
    G.wave = 0; G.stage = 1;
    G.baseMaxHp = Math.round(100 * modeDef.baseHp * (1 + G.researchFx.baseHp));
    G.baseHp = G.baseMaxHp;
    G.resources = {
      credits: Math.round(modeDef.startCredits + (G.challengeFx.credits || 0)),
      scrap: 0
    };
    G.stats = {
      kills: 0, time: 0, built: 0, waves: 0, bossKills: 0, earned: 0,
      damage: 0, leaks: 0, score: 0
    };
    G.waveState = 'prep';
    G.prepTimer = 25;
    G.clearTimer = 0;
    G.spawnQueue = [];
    G.waveData = null;
    G.selected = null;
    G.buildId = null;
    G.hurtFlash = 0;
    G.rageTimer = 0; G.rageMul = 1;
    G.state = 'playing';
    G.speed = ZF.Settings.data.gameplay.speed || 1;
    if (G.speed !== 1 && G.speed !== 2 && G.speed !== 4) G.speed = 1;
    G.recalcAuras();
    G.emit('newgame', { map: map, mode: modeDef });
    G.emit('state', G.state);
    G.emit('banner', 'DEFEND THE LAST BASE');
    ZF.Settings.set('lastMap', map.id, true);
    ZF.Settings.set('lastMode', modeDef.id, true);
    ZF.Audio.music(modeDef.id === 'hardcore' ? 'boss' : 'battle');
    ZF.Audio.play('wave_start');
    G.fit();
    return G;
  };

  /* ------------------------------------------------------------
     SAVE / LOAD
     ------------------------------------------------------------ */
  G.snapshot = function () {
    return {
      mapId: G.map.id, mode: G.mode,
      wave: G.wave, stage: G.stage,
      baseHp: G.baseHp, baseMaxHp: G.baseMaxHp,
      resources: U.deepCopy(G.resources),
      researchFx: U.deepCopy(G.researchFx),
      challengeMods: G.challengeMods.map(function (m) { return m.id; }),
      towers: G.towers.filter(function (t) { return t.alive; }).map(function (t) {
        return { id: t.def.id, tx: t.tx, ty: t.ty, level: t.level, hp: Math.round(t.hp), invested: t.invested, kills: t.kills, pathD: t.pathD };
      }),
      stats: U.deepCopy(G.stats),
      speed: G.speed,
      version: ZF.Save.SAVE_VERSION,
      meta: {
        mapName: G.map.name, modeName: G.modeDef.name, wave: G.wave,
        stage: G.stage, kills: G.stats.kills, time: G.stats.time
      }
    };
  };

  G.saveTo = function (slot) {
    if (!G.map) return Promise.resolve(false);
    var snap = { state: G.snapshot() };
    return ZF.Save.write(slot, snap).then(function (ok) {
      G.lastSaveAt = Date.now();
      G.emit('saved', { slot: slot, ok: ok });
      return ok;
    }).catch(function () {
      G.emit('saved', { slot: slot, ok: false });
      return false;
    });
  };

  G.autoSave = function () {
    if (G.state !== 'playing' && G.state !== 'paused') return;
    if (!G.map || G.wave <= 0) return;
    G.saveTo('auto');
  };

  G.loadFrom = function (data) {
    if (!data || !ZF.Save.validate(data)) return false;
    var s = data.state || data;
    G.map = ZF.Data.mapsById[s.mapId];
    if (!G.map) return false;
    G.modeDef = ZF.Data.modes[s.mode] || ZF.Data.modes.endless;
    G.mode = G.modeDef.id;
    G.profile = G.profile || ZF.Save.loadProfile();
    G.researchFx = G.computeResearch(G.profile);
    G.mapMods = G.map.mapData || G.map.modData || {};
    G.challengeMods = (s.challengeMods || []).map(function (id) {
      return ZF.Data.challengeMods.filter(function (m) { return m.id === id; })[0];
    }).filter(Boolean);
    G.challengeFx = {};
    G.challengeMods.forEach(function (m) {
      for (var k in m.fx) {
        if (typeof m.fx[k] === 'number') G.challengeFx[k] = (G.challengeFx[k] || 1) * m.fx[k];
      }
      if (m.fx.armor) G.challengeFx.armor = m.fx.armor;
      if (m.fx.credits) G.challengeFx.credits = m.fx.credits;
      if (m.fx.swarm) G.challengeFx.swarm = true;
    });
    G.path = ZF.Path.build(G.map);
    G.grid = new ZF.Grid(G.map, G.path);
    G.terrain = ZF.Terrain.get(G.map, G.path.cells);
    ZF.FX.clear();
    G.towers = []; G.enemies = []; G.projectiles = []; G.pools = []; G.corpses = [];
    G.boss = null; G.bossIntro = 0;
    G.wave = s.wave || 1;
    G.stage = Math.floor((G.wave - 1) / 10) + 1;
    G.baseMaxHp = s.baseMaxHp || 100;
    G.baseHp = U.clamp(s.baseHp, 1, G.baseMaxHp);
    G.resources = { credits: s.resources.credits || 0, scrap: s.resources.scrap || 0 };
    G.stats = U.deepCopy(s.stats || { kills: 0, time: 0, built: 0, waves: 0, bossKills: 0, earned: 0, damage: 0, leaks: 0, score: 0 });
    (s.towers || []).forEach(function (td) {
      var def = ZF.Data.unitById[td.id];
      if (!def) return;
      var t = ZF.Towers.create(def, td.tx, td.ty);
      t.level = U.clamp(td.level || 0, 0, 3);
      t.invested = td.invested || def.cost;
      t.kills = td.kills || 0;
      for (var i = 0; i < t.level; i++) t.invested += def.ups[i].c;
      t.hp = td.hp || def.base.hp;
      if (def.onPath) t.pathD = td.pathD != null ? td.pathD : ZF.Path.nearestD(G.path, t.x, t.y);
      G.grid.place(t, t.tx, t.ty);
      G.towers.push(t);
    });
    G.recalcAuras();
    G.towers.forEach(function (t) { t.hp = Math.min(t.hp, t.hpMax); });
    G.speed = s.speed || 1;
    G.waveState = 'prep';
    G.prepTimer = 14;
    G.clearTimer = 0;
    G.spawnQueue = [];
    G.waveData = null;
    G.selected = null;
    G.buildId = null;
    G.state = 'playing';
    G.emit('newgame', { map: G.map, mode: G.modeDef });
    G.emit('state', G.state);
    G.emit('banner', 'SIGNAL RESTORED — WAVE ' + G.wave);
    ZF.Audio.music('battle');
    G.fit();
    return true;
  };

  /* ------------------------------------------------------------
     SIMULATION UPDATE
     ------------------------------------------------------------ */
  G.update = function (dt) {
    if (G.state !== 'playing') return;
    G.stats.time += dt;
    G.hurtFlash = Math.max(0, G.hurtFlash - dt * 1.8);
    if (G.rageTimer > 0) { G.rageTimer -= dt; if (G.rageTimer <= 0) G.rageMul = 1; }
    if (G.bossIntro > 0) {
      G.bossIntro -= dt;
      ZF.FX.shake(.02);
    }

    // wave flow
    if (G.waveState === 'prep') {
      G.prepTimer -= dt;
      if (G.prepTimer <= 0) G.startWave();
    } else if (G.waveState === 'clear') {
      G.clearTimer -= dt;
      if (G.clearTimer <= 0) G.startWave();
    } else {
      // spawning
      if (G.spawnQueue.length) {
        G.spawnTimer -= dt;
        if (G.spawnTimer <= 0 && G.enemies.length < 72) {
          var entry = G.spawnQueue.shift();
          G.spawnEnemy(entry.type, {});
          G.spawnTimer = entry.gap;
        }
      }
      if (G.spawnQueue.length === 0 && G.enemies.length === 0 && G.waveState === 'spawning' && G.bossIntro <= 0) {
        G.waveState = 'fighting';
      }
      if (G.waveState === 'fighting') {
        if (G.enemies.length === 0 && !G.boss && G.bossIntro <= 0) G.onWaveCleared();
      }
    }

    // entities
    var i;
    for (i = 0; i < G.towers.length; i++) G.towers[i].update(dt, G);
    G.updateAuras(dt);
    for (i = 0; i < G.enemies.length; i++) G.enemies[i].updateFull(dt, G);
    G.updateProjectiles(dt);
    G.updatePools(dt);
    ZF.FX.update(dt);

    // cleanup
    for (i = G.enemies.length - 1; i >= 0; i--) {
      var e = G.enemies[i];
      if (!e.alive && e.deadT > 0.9) G.enemies.splice(i, 1);
    }
    for (i = G.towers.length - 1; i >= 0; i--) {
      if (!G.towers[i].alive) G.towers.splice(i, 1);
    }
    for (i = G.corpses.length - 1; i >= 0; i--) {
      G.corpses[i].t -= dt;
      if (G.corpses[i].t <= 0) G.corpses.splice(i, 1);
    }
    if (G.selected && (!G.selected.alive || G.towers.indexOf(G.selected) < 0)) {
      G.selected = null;
      G.emit('selecttower', null);
    }

    // base regen from repair stations
    if (G.baseHp < G.baseMaxHp) {
      var rep = 0;
      for (i = 0; i < G.towers.length; i++) {
        if (G.towers[i].def.id === 'repair' && G.towers[i].alive) rep += 0.22;
      }
      if (rep > 0) G.baseHp = Math.min(G.baseMaxHp, G.baseHp + rep * dt);
    }
  };

  G.updateAuras = function (dt) {
    G.auraTick = (G.auraTick || 0) + dt;
    if (G.auraTick < 0.25) return;
    G.auraTick = 0;
    var i, j;
    // enemy buffs
    for (i = 0; i < G.enemies.length; i++) {
      var e = G.enemies[i];
      if (e.boss && e.chargeT > 0) e.chargeT -= .25;
      if (!(e.boss && e.chargeT > 0)) { e.buffSpeed = 1; }
      e.buffDmg = 1;
    }
    for (i = 0; i < G.enemies.length; i++) {
      var src = G.enemies[i];
      if (!src.alive) continue;
      if (src.def.scream) {
        for (j = 0; j < G.enemies.length; j++) {
          var o = G.enemies[j];
          if (o === src || !o.alive) continue;
          if (U.dist2(o.x, o.y, src.x, src.y) < src.def.scream.radius * src.def.scream.radius) {
            o.buffSpeed = Math.max(o.buffSpeed, src.def.scream.speed);
          }
        }
      }
      if (src.def.buff) {
        for (j = 0; j < G.enemies.length; j++) {
          var o2 = G.enemies[j];
          if (o2 === src || !o2.alive) continue;
          if (U.dist2(o2.x, o2.y, src.x, src.y) < src.def.buff.radius * src.def.buff.radius) {
            o2.buffSpeed = Math.max(o2.buffSpeed, src.def.buff.speed);
            o2.buffDmg = Math.max(o2.buffDmg, src.def.buff.dmg);
          }
        }
      }
      if (src.def.chill) {
        for (j = 0; j < G.towers.length; j++) {
          var tw = G.towers[j];
          if (!tw.alive) continue;
          if (U.dist2(tw.x, tw.y, src.x, src.y) < 70 * 70) tw.chillMul = Math.min(tw.chillMul, src.def.chill.rate);
        }
      }
    }
  };

  /* ------------------------------------------------------------
     WAVES
     ------------------------------------------------------------ */
  G.startWave = function () {
    if (G.state !== 'playing') return;
    G.wave++;
    G.stage = ZF.Waves.stageOf(G.wave);
    var data = G.waveData = ZF.Waves.compose(G.wave, G.mode, G.mapMods, G.challengeFx);
    G.spawnQueue = [];
    G.spawnTimer = 0.4;
    G.waveState = 'spawning';
    G.prepTimer = 0;
    var i, g;
    for (i = 0; i < data.groups.length; i++) {
      g = data.groups[i];
      if (g.count <= 0) continue;
      for (var n = 0; n < g.count; n++) G.spawnQueue.push({ type: g.type, gap: g.gap });
    }
    // boss appears at the head of the wave
    if (data.boss) {
      G.spawnBoss(data.boss);
    }
    ZF.Audio.play('wave_start');
    G.emit('banner', (data.boss ? 'STAGE ' + data.stage + ' — BOSS INBOUND' : 'WAVE ' + G.wave));
    G.emit('wave', data);
    G.unlockCheck();
  };

  G.spawnBoss = function (bd) {
    var def = {
      id: 'boss_' + bd.stage, name: bd.name, hp: bd.hp, speed: bd.speed, dmg: bd.dmg,
      armor: bd.armor, reward: 0, scrap: 0, r: 16, scale: bd.scale,
      look: { skin: '#8a9a5a', cloth: '#4a4232', armor: '#5a5a44', eyes: ['#ffe066'] }
    };
    var e = ZF.Enemies.create(def, {
      wave: G.wave, boss: true, bossData: bd, scaling: G.waveData ? G.waveData.scaling : { hp: 1, dmg: 1, speed: 1, armor: 0 },
      d: 0
    });
    e.x = G.path.spawn.x; e.y = G.path.spawn.y;
    e.boss = true;
    G.enemies.push(e);
    G.boss = e;
    G.bossIntro = 2.4;
    ZF.Audio.play('boss_roar');
    ZF.FX.shake(.5);
    G.emit('bossintro', bd);
    G.emit('boss', e);
  };

  G.spawnEnemy = function (typeId, opts) {
    var def = ZF.Data.zombieById[typeId];
    if (!def) return null;
    var sc = G.waveData ? G.waveData.scaling : { hp: 1, dmg: 1, speed: 1, armor: 0, reward: 1, scrapMul: 1 };
    var e = ZF.Enemies.create(def, {
      wave: G.wave, scaling: sc, d: opts.d != null ? opts.d : 0,
      incomeMul: 1 + (G.incomeMul - 1) + (G.researchFx.income || 0)
    });
    e.x = G.path.spawn.x + U.rand(-6, 6);
    e.y = G.path.spawn.y + e.laneOffset;
    G.enemies.push(e);
    ZF.FX.burst(e.x, e.y + 4, 3, ['#3a4a2a', '#2a2a20'], { spdMax: 30, lifeMax: .4 });
    return e;
  };

  G.onWaveCleared = function () {
    G.waveState = 'clear';
    G.clearTimer = 14;
    var r = G.waveData ? G.waveData.reward : { credits: 50, scrap: 3, research: 0 };
    var bonus = 1 + (G.researchFx.waveBonus || 0);
    var cr = Math.round(r.credits * bonus);
    var sc = Math.round(r.scrap);
    G.resources.credits += cr;
    G.resources.scrap += sc;
    G.stats.waves++;
    if (r.research > 0 && G.profile) {
      G.profile.rp = (G.profile.rp || 0) + r.research;
      ZF.Save.saveProfile(G.profile);
      G.emit('rp', r.research);
    }
    G.emit('toast', { msg: 'WAVE ' + G.wave + ' CLEAR  +' + cr + 'C  +' + sc + 'S', type: 'good' });
    G.emit('banner', 'WAVE ' + G.wave + ' CLEARED');
    G.emit('waveclear', { wave: G.wave, credits: cr, scrap: sc });
    ZF.Audio.play('wave_clear');
    G.checkAchievements();
    G.autoSave();
    G.emit('state');
  };

  G.callWave = function () {
    if (G.state !== 'playing') return;
    if (G.waveState === 'prep') {
      G.prepTimer = 0;
      G.startWave();
    } else if (G.waveState === 'clear') {
      var bonus = Math.round(Math.max(0, G.clearTimer) * 2.5);
      if (bonus > 0) {
        G.resources.credits += bonus;
        G.emit('toast', { msg: 'EARLY CALL BONUS +' + bonus + 'C', type: 'info' });
      }
      G.startWave();
    }
  };

  /* ------------------------------------------------------------
     BUILD / UPGRADE / SELL
     ------------------------------------------------------------ */
  G.unitCost = function (def) {
    var mul = 1 - (G.researchFx.cost || 0);
    if (G.modeDef && G.modeDef.costMul) mul *= G.modeDef.costMul;
    return Math.max(1, Math.round(def.cost * mul));
  };

  G.isUnlocked = function (def) {
    if (!def.unlockWave) return true;
    if (G.profile && G.profile.unlocks && G.profile.unlocks.units && G.profile.unlocks.units.indexOf(def.id) >= 0) return true;
    return G.wave >= def.unlockWave;
  };

  G.unlockCheck = function () {
    var unlockedNow = [];
    ZF.Data.units.forEach(function (d) {
      if (d.unlockWave && G.wave >= d.unlockWave && !(G.profile.unlocks.units || []).includes(d.id)) {
        G.profile.unlocks.units = G.profile.unlocks.units || [];
        G.profile.unlocks.units.push(d.id);
        unlockedNow.push(d.name);
      }
    });
    if (unlockedNow.length) {
      ZF.Save.saveProfile(G.profile);
      G.emit('toast', { msg: 'UNLOCKED: ' + unlockedNow.join(', '), type: 'info' });
      G.emit('unlock');
    }
  };

  G.setBuild = function (id) {
    if (!id) { G.buildId = null; G.emit('buildmode', null); return; }
    var def = ZF.Data.unitById[id];
    if (!def) return;
    if (!G.isUnlocked(def)) {
      G.emit('toast', { msg: def.name + ' UNLOCKS AT WAVE ' + def.unlockWave, type: 'warn' });
      ZF.Audio.play('error');
      return;
    }
    if (G.unitCost(def) > G.resources.credits) {
      G.emit('toast', { msg: 'INSUFFICIENT CREDITS — NEED ' + G.unitCost(def), type: 'warn' });
      ZF.Audio.play('error');
      return;
    }
    G.buildId = id;
    G.selected = null;
    G.emit('selecttower', null);
    G.emit('buildmode', def);
    ZF.Audio.play('ui_click');
  };

  G.cancelBuild = function () {
    if (!G.buildId) return false;
    G.buildId = null;
    G.emit('buildmode', null);
    return true;
  };

  G.tryPlace = function (tx, ty) {
    if (!G.buildId) return;
    var def = ZF.Data.unitById[G.buildId];
    if (!def) return;
    var cost = G.unitCost(def);
    if (G.resources.credits < cost) {
      G.emit('toast', { msg: 'INSUFFICIENT CREDITS', type: 'warn' });
      ZF.Audio.play('error');
      return;
    }
    if (!G.grid.canBuild(tx, ty, !!def.onPath)) {
      G.emit('toast', { msg: def.onPath ? 'MUST BE PLACED ON THE ROAD' : 'CANNOT BUILD THERE', type: 'warn' });
      ZF.Audio.play('error');
      return;
    }
    var t = ZF.Towers.create(def, tx, ty);
    if (def.onPath) t.pathD = ZF.Path.nearestD(G.path, t.x, t.y);
    t.recalc(G);
    t.s = t.statsFor(G);
    t.hpMax = Math.round(t.s.hpMax);
    t.hp = t.hpMax;
    G.grid.place(t, tx, ty);
    G.towers.push(t);
    G.resources.credits -= cost;
    G.stats.built++;
    G.recalcAuras();
    ZF.Audio.play('build');
    ZF.FX.burst(t.x, t.y + 6, 8, ['#8a7a5a', '#5a5040', '#3a382c'], { spdMax: 55, lifeMax: .5, sizeMax: 2 });
    ZF.FX.ring(t.x, t.y, 18, '#9ad06a', .25);
    G.emit('built', t);
    if (def.cat === 'infantry' && Math.random() < .7) ZF.Audio.play('ui_click');
    G.checkAchievements();
  };

  G.upgrade = function (t) {
    if (!t || !t.alive) return;
    if (t.level >= 3) { G.emit('toast', { msg: 'ALREADY MAX LEVEL', type: 'warn' }); return; }
    var cost = Math.round(t.upgradeCost() * (1 - (G.researchFx.cost || 0)));
    if (G.resources.credits < cost) {
      G.emit('toast', { msg: 'NEED ' + cost + ' CREDITS TO UPGRADE', type: 'warn' });
      ZF.Audio.play('error');
      return;
    }
    G.resources.credits -= cost;
    t.level++;
    t.invested += cost;
    G.recalcAuras();
    t.hp = t.hpMax;
    ZF.Audio.play('upgrade');
    ZF.FX.ring(t.x, t.y, 26, '#ffe066', .4);
    ZF.FX.burst(t.x, t.y - 4, 10, ['#ffe066', '#ffd479', '#a6ff7a'], { spdMax: 70, sizeMax: 2, add: true });
    ZF.FX.text(t.x, t.y - 18, 'LV ' + (t.level + 1), '#ffe066', { size: 8 });
    G.emit('toast', { msg: t.def.name + ' UPGRADED TO LV ' + (t.level + 1), type: 'good' });
    G.emit('selecttower', t);
    G.checkAchievements();
  };

  G.sell = function (t) {
    if (!t || !t.alive) return;
    var val = t.sellValue();
    G.resources.credits += val;
    t.alive = false;
    G.grid.remove(t.tx, t.ty);
    var idx = G.towers.indexOf(t);
    if (idx >= 0) G.towers.splice(idx, 1);
    if (G.selected === t) { G.selected = null; G.emit('selecttower', null); }
    G.recalcAuras();
    ZF.Audio.play('sell');
    ZF.FX.burst(t.x, t.y, 9, ['#8a8a7a', '#5a5a4a'], { spdMax: 60, lifeMax: .5 });
    G.emit('toast', { msg: 'RECYCLED ' + t.def.name + ' +' + val + 'C', type: 'info' });
  };

  G.selectTower = function (t) {
    G.selected = t || null;
    G.buildId = null;
    G.emit('buildmode', null);
    G.emit('selecttower', t || null);
  };

  G.recalcAuras = function () {
    if (!G.towers) return;
    var i, j;
    var supports = [];
    for (i = 0; i < G.towers.length; i++) {
      var t = G.towers[i];
      t.buffs = { dmg: 0, rate: 0, range: 0, repair: 0, income: 0, reveal: false };
      if (t.alive) t.recalc(G);
      if (t.alive && t.support) supports.push(t);
    }
    var income = 0, reveal = false;
    for (i = 0; i < supports.length; i++) {
      var s = supports[i], ss = s.s;
      if (!ss) continue;
      var rad = ss.auraR || 0;
      if (ss.income) income += ss.income;
      if (ss.reveal) reveal = true;
      if (!rad) continue;
      for (j = 0; j < G.towers.length; j++) {
        var o = G.towers[j];
        if (o === s || !o.alive) continue;
        if (U.dist2(o.x, o.y, s.x, s.y) > rad * rad) continue;
        if (ss.auraDmg) o.buffs.dmg += ss.auraDmg;
        if (ss.auraRate) o.buffs.rate += ss.auraRate;
        if (ss.auraRange) o.buffs.range += ss.auraRange;
        if (ss.repair) o.buffs.repair = Math.max(o.buffs.repair, ss.repair);
        if (ss.income) o.buffs.income += ss.income;
        if (ss.reveal) o.buffs.reveal = true;
      }
    }
    for (i = 0; i < G.towers.length; i++) {
      var t2 = G.towers[i];
      if (t2.alive) t2.recalc(G);
    }
    G.incomeMul = 1 + income;
    G.reveal = reveal;
    G.pathBlockers = G.towers.filter(function (t3) {
      return t3.alive && t3.def.blocker;
    }).sort(function (a, b) { return (a.pathD || 0) - (b.pathD || 0); });
  };

  /* ------------------------------------------------------------
     COMBAT EVENTS
     ------------------------------------------------------------ */
  G.nearestTower = function (x, y, range) {
    var best = null, bd = range * range;
    for (var i = 0; i < G.towers.length; i++) {
      var t = G.towers[i];
      if (!t.alive) continue;
      var d = U.dist2(x, y, t.x, t.y);
      if (d < bd) { bd = d; best = t; }
    }
    return best;
  };
  G.isTowerNear = function (x, y, r) {
    r = r * r;
    for (var i = 0; i < G.towers.length; i++) {
      var t = G.towers[i];
      if (t.alive && U.dist2(x, y, t.x, t.y) < r) return true;
    }
    return false;
  };

  G.addProjectile = function (p) {
    p.trailT = 0;
    p.life = p.life || 1.6;
    p.maxLife = p.life;
    p.radius = p.radius || 2;
    p.hostile = !!p.hostile;
    if (p.target && p.type === 'mortar') {
      p.tx = p.target.x; p.ty = p.target.y; p.arcDur = Math.max(.35, U.dist(p.x, p.y, p.tx, p.ty) / p.speed);
      p.sx = p.x; p.sy = p.y;
      p.life = p.arcDur;
      p.maxLife = p.arcDur;
    }
    G.projectiles.push(p);
    return p;
  };

  G.updateProjectiles = function (dt) {
    for (var i = G.projectiles.length - 1; i >= 0; i--) {
      var p = G.projectiles[i];
      p.life -= dt;
      if (p.type === 'mortar') {
        var t = 1 - Math.max(0, p.life) / p.maxLife;
        p.x = U.lerp(p.sx, p.tx, t);
        p.y = U.lerp(p.sy, p.ty, t);
        if (p.life <= 0) { G.impact(p, null); G.projectiles.splice(i, 1); continue; }
        continue;
      }
      if (p.life <= 0) { G.projectiles.splice(i, 1); continue; }
      if (p.homing && p.target && p.target.alive) {
        var want = Math.atan2(p.target.y - p.y, p.target.x - p.x);
        var diff = Math.atan2(Math.sin(want - p.angle), Math.cos(want - p.angle));
        p.angle += U.clamp(diff, -4.5 * dt, 4.5 * dt);
      }
      p.x += Math.cos(p.angle) * p.speed * dt;
      p.y += Math.sin(p.angle) * p.speed * dt;
      if (p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) { G.projectiles.splice(i, 1); continue; }

      // trails
      p.trailT += dt;
      if (p.trailT > .03) {
        p.trailT = 0;
        if (p.type === 'rocket' || p.type === 'missile') {
          ZF.FX.particle(p.x, p.y, U.rand(-6, 6), U.rand(-6, 6), .35, 2, 'rgba(140,130,120,0.4)', { grav: -8 });
          ZF.FX.particle(p.x, p.y, 0, 0, .12, 2, '#ffb347', { add: true });
        } else if (p.type === 'tracer') {
          ZF.FX.particle(p.x, p.y, 0, 0, .1, 1, '#fff2c0', { add: true });
        } else if (p.type === 'grenade') {
          if (Math.random() < .5) ZF.FX.particle(p.x, p.y, 0, 0, .2, 1, '#8a8a7a');
        }
      }

      var hit = null;
      if (p.hostile) {
        for (var ti = 0; ti < G.towers.length; ti++) {
          var tw = G.towers[ti];
          if (!tw.alive) continue;
          if (U.dist2(p.x, p.y, tw.x, tw.y) < 64) { hit = tw; break; }
        }
      } else {
        for (var ei = 0; ei < G.enemies.length; ei++) {
          var e = G.enemies[ei];
          if (!e.alive) continue;
          var rr = e.r + p.radius + 1;
          if (U.dist2(p.x, p.y, e.x, e.y) < rr * rr) { hit = e; break; }
        }
      }
      if (hit) { G.impact(p, hit); G.projectiles.splice(i, 1); }
    }
  };

  G.impact = function (p, hit) {
    if (p.hostile) {
      var dmg = p.dmg;
      if (hit) {
        hit.takeDamage(dmg, G, null);
        ZF.FX.burst(hit.x, hit.y, 4, '#9ad06a', { spdMax: 40 });
      }
      return;
    }
    var x = p.x, y = p.y;
    if (p.type === 'mortar' && p.tx != null) { x = p.tx; y = p.ty; }
    var pen = p.pen || 0;
    var fromAngle = p.angle;
    if (p.splash > 0) {
      G.explosion(x, y, p.splash, p.dmg, {
        pen: pen, burn: p.burn, slow: p.slow, stun: p.stun, source: p.owner, crit: p.crit, fromAngle: fromAngle
      });
      if (p.type === 'shell' || p.type === 'rocket' || p.type === 'missile' || p.type === 'grenade' || p.type === 'mortar') {
        ZF.FX.shake(p.type === 'shell' ? .2 : .14);
      }
    } else if (hit) {
      hit.damage(p.dmg, G, { pen: pen, crit: p.crit, fromAngle: fromAngle, owner: p.owner });
      if (p.burn) hit.applyBurn(p.burn, 3);
      if (p.slow) hit.applySlow(p.slow, 1.6);
      ZF.FX.burst(x, y, 2, '#d8d0b0', { spdMax: 40, lifeMax: .2 });
      ZF.Audio.play('hit_flesh');
    }
  };

  G.explosion = function (x, y, radius, dmg, opts) {
    opts = opts || {};
    var list = opts.enemy ? G.towers : G.enemies;
    var r2 = radius * radius;
    if (opts.enemy) {
      for (var ti = 0; ti < G.towers.length; ti++) {
        var t = G.towers[ti];
        if (!t.alive) continue;
        if (U.dist2(x, y, t.x, t.y) <= r2) t.takeDamage(dmg, G, null);
      }
      ZF.FX.explosion(x, y, radius, false);
      return;
    }
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (!e.alive) continue;
      var d2 = U.dist2(x, y, e.x, e.y);
      if (d2 > r2) continue;
      var falloff = 1 - Math.min(.55, Math.sqrt(d2) / Math.max(1, radius) * .55);
      e.damage(dmg * falloff, G, {
        pen: opts.pen || 0, crit: opts.crit, owner: opts.source || opts.owner,
        fromAngle: opts.fromAngle, showText: falloff > .65
      });
      if (opts.burn) e.applyBurn(opts.burn, 3);
      if (opts.slow) e.applySlow(opts.slow, 2);
      if (opts.stun) e.applyStun(opts.stun);
    }
    ZF.FX.explosion(x, y, radius, radius > 40);
    if (opts.color) ZF.FX.ring(x, y, radius * .8, opts.color, .3);
  };

  G.fireBeam = function (t, tgt, dmg, crit) {
    var s = t.s;
    var ang = Math.atan2(tgt.y - t.y, tgt.x - t.x);
    var mx = t.x + Math.cos(ang) * t.muzzle, my = t.y + Math.sin(ang) * t.muzzle - 3;
    ZF.FX.beam(mx, my, tgt.x, tgt.y, '#7ff0ff', .12, 2, false);
    ZF.FX.particle(mx, my, 0, 0, .1, 4, '#bdfaff', { add: true });
    tgt.damage(dmg, G, { pen: s.pen, crit: crit, fromAngle: ang, owner: t });
    // pierce extra targets
    var extra = s.hits - 1;
    if (extra > 0) {
      var hitList = [tgt];
      for (var n = 0; n < extra; n++) {
        var best = null, bd = 90 * 90;
        for (var i = 0; i < G.enemies.length; i++) {
          var e = G.enemies[i];
          if (!e.alive || hitList.indexOf(e) >= 0) continue;
          var d2 = U.dist2(e.x, e.y, tgt.x, tgt.y);
          if (d2 < bd) { bd = d2; best = e; }
        }
        if (!best) break;
        ZF.FX.beam(tgt.x, tgt.y, best.x, best.y, '#7ff0ff', .1, 1, false);
        best.damage(dmg * .7, G, { pen: s.pen, crit: false, fromAngle: ang, owner: t });
        hitList.push(best);
      }
    }
  };

  G.fireTesla = function (t, tgt, dmg, crit) {
    var s = t.s;
    var mx = t.x, my = t.y - 6;
    var chain = s.chain || 2;
    var hit = [tgt];
    var dmgNow = dmg;
    ZF.FX.beam(mx, my, tgt.x, tgt.y, '#9ce6ff', .16, 2, true);
    tgt.damage(dmgNow, G, { pen: s.pen, crit: crit, fromAngle: t.angle, owner: t });
    ZF.Audio.play('tesla');
    var prev = tgt;
    for (var c = 1; c < chain; c++) {
      var best = null, bd = 110 * 110;
      for (var i = 0; i < G.enemies.length; i++) {
        var e = G.enemies[i];
        if (!e.alive || hit.indexOf(e) >= 0) continue;
        var d2 = U.dist2(e.x, e.y, prev.x, prev.y);
        if (d2 < bd) { bd = d2; best = e; }
      }
      if (!best) break;
      dmgNow *= s.chainFall;
      ZF.FX.beam(prev.x, prev.y - 4, best.x, best.y - 4, '#9ce6ff', .14, 2, true);
      best.damage(dmgNow, G, { pen: s.pen, crit: false, fromAngle: t.angle, owner: t });
      hit.push(best);
      prev = best;
    }
  };

  G.fireFlame = function (t, dmg, crit) {
    var s = t.s;
    var ang = t.angle;
    var range = s.range;
    var hits = 0;
    for (var i = 0; i < G.enemies.length; i++) {
      var e = G.enemies[i];
      if (!e.alive) continue;
      var d = U.dist(t.x, t.y, e.x, e.y);
      if (d > range + e.r) continue;
      var ea = Math.atan2(e.y - t.y, e.x - t.x);
      var diff = Math.abs(Math.atan2(Math.sin(ea - ang), Math.cos(ea - ang)));
      if (diff > 0.72 && d > 20) continue;
      e.damage(dmg, G, { pen: s.pen, crit: crit, fromAngle: ang, owner: t });
      if (s.burn) e.applyBurn(s.burn, 3);
      hits++;
      if (hits >= (s.hits || 3) + 1) break;
    }
    // flame visual
    for (var f = 0; f < 5; f++) {
      var fa = ang + U.rand(-.45, .45);
      var sp = U.rand(60, 170);
      ZF.FX.particle(t.x + Math.cos(ang) * 12, t.y - 3 + Math.sin(ang) * 6,
        Math.cos(fa) * sp, Math.sin(fa) * sp, U.rand(.16, .34), U.rand(2, 4),
        U.pick(['#ffe08a', '#ffb347', '#ff7a2a']), { add: true, drag: .9, grav: -30 });
    }
    if (s.splash > 0) {
      G.explosion(t.x + Math.cos(ang) * 40, t.y + Math.sin(ang) * 40, s.splash, dmg * .5, { pen: s.pen, fromAngle: ang });
    }
  };

  G.hostileShot = function (src, target, dmg, cfg) {
    var ang = Math.atan2(target.y - src.y, target.x - src.x);
    G.addProjectile({
      x: src.x, y: src.y - 8, angle: ang, speed: 230, dmg: dmg,
      type: (cfg && cfg.fire) ? 'flame' : 'acid', radius: 3, hostile: true,
      life: 1.6, targetTower: target, owner: src
    });
    ZF.FX.burst(src.x, src.y - 8, 2, (cfg && cfg.fire) ? '#ff7a2a' : '#8dff5a', { spdMax: 30, add: true });
  };

  G.spawnPool = function (x, y, cfg) {
    if (G.pools.length > 26) G.pools.shift();
    G.pools.push({
      x: x, y: y + 4, r: cfg.radius || 26, dps: cfg.dps || 6, dur: cfg.dur || 4, t: cfg.dur || 4,
      fire: !!cfg.fire, tick: 0
    });
  };

  G.updatePools = function (dt) {
    for (var i = G.pools.length - 1; i >= 0; i--) {
      var p = G.pools[i];
      p.t -= dt;
      p.tick -= dt;
      if (p.tick <= 0) {
        p.tick = .5;
        for (var j = 0; j < G.towers.length; j++) {
          var t = G.towers[j];
          if (!t.alive) continue;
          if (U.dist2(p.x, p.y, t.x, t.y) < (p.r + 6) * (p.r + 6)) {
            t.takeDamage(p.dps * .5, G, null);
          }
        }
      }
      if (p.t <= 0) G.pools.splice(i, 1);
    }
  };

  G.baseHit = function (dmg, e) {
    var real = dmg * (e && e.boss ? 0.34 : 0.85);
    G.baseHp -= real;
    G.stats.leaks++;
    G.hurtFlash = 1;
    ZF.FX.shake(e && e.boss ? .5 : .25);
    ZF.Audio.play('base_hit');
    ZF.FX.burst(G.path.core.x, G.path.core.y, 6, ['#a82a1a', '#ff7a4a'], { spdMax: 60 });
    if (G.baseHp <= 0) {
      G.baseHp = 0;
      G.gameOver();
    }
  };

  G.onEnemyKilled = function (e, opt) {
    if (opt && opt.owner && typeof opt.owner.kills === 'number') opt.owner.kills++;
    if (e.boss) {
      G.boss = null;
      G.stats.bossKills++;
      var bd = e.bossData;
      G.resources.credits += bd.reward.credits;
      G.resources.scrap += bd.reward.scrap;
      if (G.profile) {
        G.profile.rp = (G.profile.rp || 0) + bd.reward.research;
        ZF.Save.saveProfile(G.profile);
      }
      G.emit('toast', { msg: bd.name + ' DESTROYED  +' + bd.reward.credits + 'C  +' + bd.reward.scrap + 'S  +' + bd.reward.research + 'RP', type: 'good' });
      G.emit('bossdead', bd);
      G.emit('banner', 'BOSS DESTROYED');
      ZF.FX.explosion(e.x, e.y, 60, true);
      ZF.FX.shake(.8);
      ZF.Audio.play('victory');
      G.autoSave();
      G.checkAchievements();
      return;
    }
    var income = (1 + (G.incomeMul - 1)) * (1 + (G.researchFx.income || 0));
    var cred = Math.max(1, Math.round(e.reward * income));
    var scrap = Math.max(0, Math.round(e.scrap * (1 + (G.researchFx.scrap || 0))));
    G.resources.credits += cred;
    G.resources.scrap += scrap;
    G.stats.kills++;
    G.stats.earned += cred;
    e.deathCred = cred;
    if (e.def.split) {
      for (var i = 0; i < e.def.split.count; i++) {
        var nd = ZF.Data.zombieById[e.def.split.type];
        if (!nd) continue;
        var child = ZF.Enemies.create(nd, {
          wave: G.wave, scaling: G.waveData ? G.waveData.scaling : { hp: 1, dmg: 1, speed: 1, armor: 0, reward: 1, scrapMul: 1 },
          d: Math.max(0, e.d - 10 - i * 4), incomeMul: 1
        });
        child.x = e.x + U.rand(-8, 8); child.y = e.y + U.rand(-6, 6);
        G.enemies.push(child);
      }
    }
    if (e.def.explode) {
      G.explosion(e.x, e.y, e.def.explode.radius, e.def.explode.dmg * (1 + (G.wave - 1) * .07), { enemy: true });
    }
    if (e.def.poison && e.boss !== true) G.spawnPool(e.x, e.y, e.def.poison);
    ZF.FX.gib(e.x, e.y - 4, e.def.tier === 'elite' ? 18 : (e.def.tier === 'special' ? 10 : 7),
      ['#8a1f16', '#5a1810', e.def.look && e.def.look.skin || '#7d9a63', '#3a3a2a']);
    ZF.FX.decal(e.x - 4, e.y + 4, 'rgba(70,20,14,0.35)', 8);
    ZF.Audio.play('zombie_die');
    if (Math.random() < .3) ZF.Audio.play('zombie_groan');
    G.corpses.push({ x: e.x, y: e.y, t: 2.5, def: e.def, angle: e.angle });
    if (G.stats.kills === 1) G.emit('achievement', 'FIRST BLOOD');
    if (G.stats.kills % 10 === 0) G.checkAchievements();
  };

  G.onTowerDestroyed = function (t, src, silent) {
    t.alive = false;
    G.grid.remove(t.tx, t.ty);
    var idx = G.towers.indexOf(t);
    if (idx >= 0) G.towers.splice(idx, 1);
    if (G.selected === t) { G.selected = null; G.emit('selecttower', null); }
    G.recalcAuras();
    if (!silent) {
      ZF.FX.explosion(t.x, t.y, 22, false);
      ZF.FX.shake(.2);
      ZF.Audio.play('explode');
    }
    ZF.FX.text(t.x, t.y - 14, 'LOST', '#ff7a5a', { size: 7 });
    G.emit('toast', { msg: t.def.name + ' DESTROYED', type: 'bad' });
  };

  /* ------------------------------------------------------------
     BOSS ABILITIES
     ------------------------------------------------------------ */
  G.bossAbility = function (b, kind) {
    if (!b.alive) return;
    switch (kind) {
      case 'slam':
        G.explosion(b.x, b.y, 56, b.dmg * .5, { enemy: true });
        ZF.FX.ring(b.x, b.y, 60, '#ff9a4a', .45);
        ZF.Audio.play('explode_big');
        break;
      case 'shockwave':
        for (var i = 0; i < G.towers.length; i++) {
          var t = G.towers[i];
          if (t.alive && U.dist2(t.x, t.y, b.x, b.y) < 110 * 110) t.takeDamage(b.dmg * .55, G, null);
        }
        ZF.FX.ring(b.x, b.y, 110, '#ff4a2a', .55);
        ZF.FX.explosion(b.x, b.y, 50, false);
        ZF.FX.shake(.6);
        ZF.Audio.play('explode_big');
        break;
      case 'summon':
        for (var s = 0; s < 4; s++) {
          var def = ZF.Data.zombieById[s % 3 === 0 ? 'husk' : 'walker'];
          var child = ZF.Enemies.create(def, {
            wave: G.wave, scaling: G.waveData ? G.waveData.scaling : { hp: 1, dmg: 1, speed: 1, armor: 0, reward: 1, scrapMul: 1 },
            d: Math.max(0, b.d - 20 - s * 6), incomeMul: 1
          });
          child.x = b.x + U.rand(-18, 18); child.y = b.y + U.rand(-14, 14);
          G.enemies.push(child);
          ZF.FX.burst(child.x, child.y, 5, ['#5a2a20', '#8a4a3a'], { spdMax: 40 });
        }
        ZF.Audio.play('zombie_groan');
        G.emit('toast', { msg: 'BOSS SUMMONS REINFORCEMENTS', type: 'bad' });
        break;
      case 'acid':
        for (var a = 0; a < 3; a++) {
          var tx = G.towers.length ? G.towers[U.randi(0, G.towers.length - 1)] : null;
          if (tx) G.spawnPool(tx.x + U.rand(-14, 14), tx.y + U.rand(-14, 14), { dps: 9, radius: 30, dur: 6 });
        }
        ZF.Audio.play('frost');
        ZF.FX.ring(b.x, b.y, 70, '#8dff5a', .5);
        break;
      case 'scream':
        G.rageTimer = 5;
        G.rageMul = 1.28;
        ZF.FX.ring(b.x, b.y, 90, '#ffd45a', .6);
        ZF.FX.shake(.3);
        ZF.Audio.play('boss_roar');
        G.emit('toast', { msg: 'BOSS SCREAMS — HORDE ENRAGED', type: 'bad' });
        break;
      case 'charge':
        b.buffSpeed = 2.4;
        b.chargeT = 2.2;
        ZF.FX.ring(b.x, b.y, 40, '#ff7a3a', .4);
        ZF.Audio.play('boss_roar');
        break;
      case 'leap':
        b.d = Math.min(G.path.length, b.d + 80);
        ZF.FX.burst(b.x, b.y + 6, 12, ['#6b5a3e', '#3a2f22'], { spdMax: 70 });
        ZF.FX.shake(.25);
        break;
      case 'volley':
        for (var v = 0; v < 3; v++) {
          var tw = G.towers[U.randi(0, Math.max(0, G.towers.length - 1))];
          if (tw && tw.alive) G.hostileShot(b, tw, b.dmg * .35, {});
        }
        ZF.Audio.play('shoot_rocket');
        break;
      case 'cleave':
        var bl = G.pathBlockers[0];
        if (bl) bl.takeDamage(b.dmg * 2.2, G, b);
        ZF.FX.ring(b.x, b.y, 34, '#ff4a2a', .3);
        break;
    }
  };

  G.bossPhase = function (b) {
    G.emit('bossphase', b);
    G.emit('toast', { msg: b.bossName + ' ENTERS PHASE 2', type: 'bad' });
    ZF.FX.ring(b.x, b.y, 80, '#ff4a2a', .6);
    ZF.Audio.play('boss_roar');
    ZF.FX.shake(.5);
  };

  /* ------------------------------------------------------------
     ACHIEVEMENTS / END
     ------------------------------------------------------------ */
  G.checkAchievements = function () {
    if (!G.profile) return;
    var p = G.profile;
    var s = G.stats;
    var defs = ZF.Data.achievements;
    for (var i = 0; i < defs.length; i++) {
      var a = defs[i];
      if (p.achievements.indexOf(a.id) >= 0) continue;
      var ok = false;
      switch (a.id) {
        case 'first_blood': ok = s.kills >= 1; break;
        case 'wave_5': ok = G.wave >= 5; break;
        case 'wave_10': ok = G.wave >= 10; break;
        case 'wave_20': ok = G.wave >= 20; break;
        case 'wave_30': ok = G.wave >= 30; break;
        case 'wave_50': ok = G.wave >= 50; break;
        case 'kills_250': ok = s.kills >= 250; break;
        case 'kills_1000': ok = s.kills >= 1000; break;
        case 'boss_3': ok = s.bossKills >= 3; break;
        case 'builder': ok = s.built >= 20; break;
        case 'rich': ok = G.resources.credits >= 3000; break;
        case 'maxed': ok = G.towers.some(function (t) { return t.level >= 3; }); break;
      }
      if (ok) {
        p.achievements.push(a.id);
        p.rp = (p.rp || 0) + a.rp;
        ZF.Save.saveProfile(p);
        G.emit('achievement', a);
        ZF.Audio.play('levelup');
      }
    }
  };

  G.gameOver = function () {
    if (G.state === 'gameover') return;
    G.state = 'gameover';
    G.stats.score = Math.round(G.wave * 1200 + G.stats.kills * 8 + G.stats.time * 2 + G.stats.bossKills * 2500);
    var p = G.profile;
    if (p) {
      if (G.stats.score > (p.best.score || 0)) {
        p.best.score = G.stats.score;
        p.best.wave = Math.max(p.best.wave || 0, G.wave);
        p.best.kills = Math.max(p.best.kills || 0, G.stats.kills);
        p.best.stage = Math.max(p.best.stage || 1, G.stage);
        p.best.time = Math.max(p.best.time || 0, G.stats.time);
      }
      p.totalKills = (p.totalKills || 0) + G.stats.kills;
      p.runs = (p.runs || 0) + 1;
      ZF.Save.saveProfile(p);
    }
    G.checkAchievements();
    ZF.Audio.play('defeat');
    ZF.Audio.music('menu');
    ZF.FX.shake(.8);
    ZF.FX.explosion(G.path.core.x, G.path.core.y, 60, true);
    G.emit('gameover', {
      wave: G.wave, stage: G.stage, kills: G.stats.kills, time: G.stats.time,
      score: G.stats.score, bossKills: G.stats.bossKills, built: G.stats.built
    });
    G.emit('state', G.state);
    ZF.Save.remove('auto');
  };

  G.pause = function (on) {
    if (G.state === 'playing' && on) {
      G.state = 'paused';
      ZF.Audio.setMusicPaused(true);
      G.emit('state', G.state);
      G.autoSave();
    } else if (G.state === 'paused' && on === false) {
      G.state = 'playing';
      ZF.Audio.setMusicPaused(false);
      G.emit('state', G.state);
    }
  };

  G.setSpeed = function (n) {
    G.speed = n;
    if (n === 0) { G.pause(true); }
    else {
      if (G.state === 'paused') G.pause(false);
      G.emit('speed', n);
      ZF.Settings.set('gameplay.speed', n, true);
    }
  };

  /* ------------------------------------------------------------
     INPUT
     ------------------------------------------------------------ */
  G.onPointerMove = function (p) {
    if (G.state !== 'playing' && G.state !== 'paused') return;
    var tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE);
    G.hover.x = tx; G.hover.y = ty;
    G.hover.px = p.x; G.hover.py = p.y;
    if (G.buildId) {
      var def = ZF.Data.unitById[G.buildId];
      G.hover.valid = !!def && G.grid.canBuild(tx, ty, !!def.onPath) && G.resources.credits >= G.unitCost(def);
    }
  };

  G.onPointerDown = function (p, e) {
    if (G.state !== 'playing') return;
    if (p.x < 0 || p.y < 0 || p.x > W || p.y > H) return;
    ZF.Audio.unlock();
    var tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE);
    G.hover.x = tx; G.hover.y = ty;
    if (G.buildId) {
      var existing = G.grid.towerAt(tx, ty);
      if (existing) { G.selectTower(existing); return; }
      G.tryPlace(tx, ty);
      return;
    }
    var t = G.grid.towerAt(tx, ty);
    if (t) { G.selectTower(t); ZF.Audio.play('ui_click'); }
    else { G.selectTower(null); }
  };

  G.onKey = function (code, e) {
    if (code === 'Escape') {
      if (G.buildId) { G.cancelBuild(); return; }
      if (G.state === 'playing') { G.pause(true); G.emit('pause'); return; }
      if (G.state === 'paused') { G.pause(false); return; }
    }
    if (G.state !== 'playing') return;
    if (code === 'KeyP' || code === 'Space') {
      if (code === 'Space' && G.waveState === 'prep') { G.callWave(); return; }
      G.pause(true); G.emit('pause');
    }
    if (code === 'KeyB') G.cancelBuild();
  };

  /* ------------------------------------------------------------
     RENDER
     ------------------------------------------------------------ */
  G.render = function () {
    var ctx = G.ctx;
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (!G.terrain) { ctx.fillStyle = '#0a0f0c'; ctx.fillRect(0, 0, W, H); return; }
    ctx.drawImage(G.terrain.bg, 0, 0);
    ZF.FX.drawGround(ctx);

    // spawn rift
    G.renderSpawn(ctx);

    var shake = !!ZF.Settings.data.graphics.screenShake;
    ctx.save();
    if (shake) ZF.FX.drawShake(ctx);

    // pools
    for (var i = 0; i < G.pools.length; i++) G.renderPool(ctx, G.pools[i]);

    // corpses
    for (i = 0; i < G.corpses.length; i++) {
      var c = G.corpses[i];
      var spr = ZF.Sprites.zombieSprites(c.def)[0];
      ctx.globalAlpha = Math.min(0.5, c.t / 2.5 * .6);
      ctx.save();
      ctx.translate(c.x, c.y + 2);
      ctx.scale(1, .55);
      ctx.rotate(.4);
      var sc = (c.def.scale || 1);
      ctx.drawImage(spr, -12 * sc, -12 * sc, 24 * sc, 24 * sc);
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // towers
    for (i = 0; i < G.towers.length; i++) G.renderTower(ctx, G.towers[i]);

    // selection ring under enemies? draw enemies sorted by y
    var list = G.enemies.slice().sort(function (a, b) { return a.y - b.y; });
    for (i = 0; i < list.length; i++) G.renderEnemy(ctx, list[i]);

    // core base
    ZF.Terrain.drawCore(ctx, G.path.core.x, G.path.core.y, G.stats.time, G.baseHp / G.baseMaxHp, G.terrain.pal);

    // projectiles
    for (i = 0; i < G.projectiles.length; i++) G.renderProjectile(ctx, G.projectiles[i]);

    ZF.FX.draw(ctx);

    // ambient lighting
    if (ZF.Settings.data.graphics.lights) G.renderLights(ctx);

    // weather
    if (ZF.Settings.data.graphics.weather && G.map.weather) {
      ZF.Terrain.weather.draw(ctx, G.map.weather, G.stats.time + 10, W, H, ZF.Settings.particleScale());
    }

    // build ghost / range
    if (G.buildId) G.renderBuildGhost(ctx);
    if (G.selected) G.renderRange(ctx, G.selected);

    ctx.restore();

    if (G.hurtFlash > 0) {
      ctx.fillStyle = 'rgba(170,30,20,' + (G.hurtFlash * .28) + ')';
      ctx.fillRect(0, 0, W, H);
    }
    if (G.bossIntro > 0) {
      var a = Math.min(1, G.bossIntro) * .35;
      ctx.fillStyle = 'rgba(120,10,0,' + a + ')';
      ctx.fillRect(0, 0, W, H);
    }
  };

  G.renderSpawn = function (ctx) {
    var t = G.stats.time;
    var x = G.path.spawn.x + 8, y = G.path.spawn.y;
    ctx.save();
    ctx.globalAlpha = .6 + Math.sin(t * 2) * .15;
    ctx.fillStyle = '#140a08';
    ctx.beginPath(); ctx.ellipse(x, y, 14, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = .35 + Math.sin(t * 3) * .1;
    ctx.fillStyle = '#a82a1a';
    ctx.beginPath(); ctx.ellipse(x, y, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };

  G.renderPool = function (ctx, p) {
    var a = Math.min(1, p.t / p.dur * 1.4) * .5;
    ctx.globalAlpha = a;
    ctx.fillStyle = p.fire ? '#ff7a2a' : '#5aa02a';
    ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r, p.r * .55, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = a * .6;
    ctx.fillStyle = p.fire ? '#ffd479' : '#8dff5a';
    for (var i = 0; i < 3; i++) {
      var t = (p.t * 1.3 + i) % 1;
      ctx.beginPath(); ctx.arc(p.x + Math.sin(i * 2 + p.t * 3) * p.r * .5, p.y + Math.cos(i * 1.7) * p.r * .3, 1 + t * 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  G.renderTower = function (ctx, t) {
    if (!t.alive) return;
    var sp = ZF.Sprites.get(t.def);
    var bob = t.def.cat === 'infantry' ? (Math.sin(G.stats.time * 2 + t.tx) * .5 | 0) : 0;
    // shadow
    ctx.globalAlpha = .3;
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(t.x, t.y + 8, 11, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    if (t.isTrap) {
      // traps look flat on the road
      ctx.drawImage(sp.base, Math.round(t.x - 12), Math.round(t.y - 12));
      if (!t.armed) {
        ctx.strokeStyle = 'rgba(255,200,80,.7)';
        ctx.strokeRect(t.x - 6, t.y - 6, 12, 12);
      }
      if (t.hitFlash > 0) {
        ctx.fillStyle = 'rgba(255,255,255,.4)';
        ctx.fillRect(t.x - 8, t.y - 8, 16, 16);
      }
      return;
    }

    var facingLeft = Math.cos(t.angle) < 0;
    var frames = sp.frames;
    var frame = t.def.cat === 'infantry' ? (Math.floor(G.stats.time * 2) % 2) : 0;
    ctx.save();
    ctx.translate(Math.round(t.x), Math.round(t.y + bob));
    if (facingLeft) ctx.scale(-1, 1);
    ctx.drawImage(frames[frame], -12, -12);
    ctx.restore();

    // gun
    if (sp.gun && sp.gun.width > 2) {
      var pivotY = t.y - 3;
      ctx.save();
      ctx.translate(t.x, pivotY);
      ctx.rotate(t.angle);
      var rec = t.recoil * 2;
      ctx.drawImage(sp.gun, -3 - rec, -5);
      // muzzle flash
      if (t.flash > 0) {
        ctx.fillStyle = 'rgba(255,230,150,' + (t.flash / .07) + ')';
        ctx.fillRect(t.muzzle - 6, -2, 6, 4);
      }
      ctx.restore();
    }

    // level pips
    for (var i = 0; i < t.level; i++) {
      ctx.fillStyle = '#ffe066';
      ctx.fillRect(t.x - 6 + i * 5, t.y - 15, 3, 2);
    }
    // hp bar
    if (t.hp < t.hpMax - 1) {
      var w = 16, pct = U.clamp(t.hp / t.hpMax, 0, 1);
      ctx.fillStyle = '#12160f';
      ctx.fillRect(t.x - w / 2, t.y + 10, w, 3);
      ctx.fillStyle = pct > .4 ? '#8de05a' : '#ff7a4a';
      ctx.fillRect(t.x - w / 2 + .5, t.y + 10.5, (w - 1) * pct, 2);
    }
    if (t.hitFlash > 0) {
      ctx.globalAlpha = t.hitFlash / .15 * .5;
      ctx.fillStyle = '#ff8a6a';
      ctx.fillRect(t.x - 10, t.y - 10, 20, 20);
      ctx.globalAlpha = 1;
    }
    if (t.def.support && t.s && t.s.auraR) {
      ctx.globalAlpha = .10;
      ctx.strokeStyle = '#7fd44b';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(t.x, t.y, t.s.auraR, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  };

  G.renderEnemy = function (ctx, e) {
    if (!e.alive) {
      if (e.deadT > 0 && e.deadT < .9) {
        var spd = ZF.Sprites.zombieSprites(e.def)[0];
        ctx.save();
        ctx.globalAlpha = 1 - e.deadT / .9;
        ctx.translate(e.x, e.y);
        ctx.rotate(e.angle);
        ctx.drawImage(spd, -12 * e.scale, -12 * e.scale, 24 * e.scale, 24 * e.scale);
        ctx.restore();
        ctx.globalAlpha = 1;
      }
      return;
    }
    var spr, scale = e.scale, w = 24, h = 24;
    if (e.boss) {
      spr = ZF.Sprites.bossSprite(e.stage || 1, e.frame);
      w = 34; h = 34;
      scale = e.scale;
    } else {
      spr = ZF.Sprites.zombieSprites(e.def)[e.frame];
    }
    var flip = Math.cos(e.angle) < 0;

    // shadow
    ctx.globalAlpha = .28;
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(e.x, e.y + 8, (e.boss ? 18 : 6) * scale, (e.boss ? 7 : 2.6) * scale, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.globalAlpha = e.alpha == null ? 1 : e.alpha;
    ctx.translate(e.x, e.y);
    if (flip) ctx.scale(-1, 1);
    var dw = w * scale, dh = h * scale;
    if (e.hitFlash > 0) {
      ctx.drawImage(spr, -dw / 2, -dh / 2, dw, dh);
      ctx.globalAlpha = e.hitFlash / .12 * .55;
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = '#ff9a7a';
      ctx.fillRect(-dw / 2, -dh / 2, dw, dh);
      ctx.globalCompositeOperation = 'source-over';
    } else {
      ctx.drawImage(spr, -dw / 2, -dh / 2, dw, dh);
    }
    // burn overlay
    if (e.burn) {
      ctx.globalAlpha = .35 + Math.sin(G.stats.time * 20) * .15;
      ctx.fillStyle = '#ff7a2a';
      ctx.fillRect(-dw / 2 + 2, -dh / 2 + 2, dw - 4, dh - 4);
    }
    optionalChill(ctx, e, dw, dh);
    ctx.restore();
    ctx.globalAlpha = 1;

    // status fx
    if (e.def.explode) {
      ctx.fillStyle = 'rgba(255,80,30,' + (.3 + Math.sin(G.stats.time * 8 + e.x) * .2) + ')';
      ctx.fillRect(e.x - 2, e.y - 10, 4, 4);
    }
    if (e.def.chill) {
      ctx.fillStyle = 'rgba(140,220,255,.7)';
      ctx.fillRect(e.x - 8, e.y - 12, 2, 2);
    }
    // stealth shimmer
    if (e.stealth && !G.reveal) {
      ctx.globalAlpha = .5;
      ctx.strokeStyle = '#8dffe0';
      ctx.strokeRect(e.x - 6, e.y - 10, 12, 14);
      ctx.globalAlpha = 1;
    }
    // hp bar
    if (ZF.Settings.data.gameplay.healthBars && e.hp < e.maxHp) {
      var bw = e.boss ? 34 : Math.max(12, 10 * scale);
      var pct = U.clamp(e.hp / e.maxHp, 0, 1);
      var by = e.y - (e.boss ? 22 * scale : 13 * scale) - 5;
      ctx.fillStyle = 'rgba(8,12,8,.75)';
      ctx.fillRect(e.x - bw / 2, by, bw, 3);
      ctx.fillStyle = e.def.tier === 'elite' ? '#ffb347' : (e.def.tier === 'special' ? '#d98aff' : '#d94a3a');
      ctx.fillRect(e.x - bw / 2 + .5, by + .5, (bw - 1) * pct, 2);
    }
    // stunned
    if (e.stun > 0) {
      ctx.fillStyle = '#ffe066';
      for (var i = 0; i < 3; i++) {
        var ang = G.stats.time * 4 + i * 2.1;
        ctx.fillRect(e.x + Math.cos(ang) * 7, e.y - 16 + Math.sin(ang) * 3, 2, 2);
      }
    }
  };

  function optionalChill(ctx, e, dw, dh) {
    if (e.slowT > 0) {
      ctx.globalAlpha = .25;
      ctx.fillStyle = '#9ce6ff';
      ctx.fillRect(-dw / 2, -dh / 2, dw, dh);
      ctx.globalAlpha = 1;
    }
  }

  G.renderProjectile = function (ctx, p) {
    if (p.type === 'flame') {
      ctx.fillStyle = p.hostile ? '#aaff6a' : '#ffb347';
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
      return;
    }
    if (p.type === 'beam' || p.type === 'tesla') return;
    if (p.hostile) {
      ctx.fillStyle = p.type === 'flame' ? '#ff7a2a' : '#8dff5a';
      ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(140,255,90,.3)';
      ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI * 2); ctx.fill();
      return;
    }
    var col = '#ffe9a0';
    if (p.type === 'rocket' || p.type === 'missile') col = '#ffb347';
    else if (p.type === 'grenade' || p.type === 'mortar') col = '#8a9a6a';
    else if (p.type === 'shell') col = '#ffd479';
    else if (p.type === 'tracer') col = '#fff6d0';
    // trail line
    var len = p.type === 'tracer' ? 14 : (p.type === 'rocket' || p.type === 'missile' ? 8 : 5);
    ctx.strokeStyle = col;
    ctx.globalAlpha = .8;
    ctx.lineWidth = p.type === 'tracer' ? 1 : 2;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - Math.cos(p.angle) * len, p.y - Math.sin(p.angle) * len);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = col;
    ctx.fillRect(p.x - 1, p.y - 1, 3, 3);
    if (p.type === 'flame') {
      ctx.globalAlpha = .5;
      ctx.fillStyle = '#ff7a2a';
      ctx.fillRect(p.x - 2, p.y - 2, 5, 5);
      ctx.globalAlpha = 1;
    }
  };

  G.renderLights = function (ctx) {
    var fires = G.terrain.fires || [];
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < fires.length; i++) {
      var f = fires[i];
      var flick = .7 + Math.sin(G.stats.time * 6 + i * 2) * .18 + Math.sin(G.stats.time * 13 + i) * .08;
      var g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * flick);
      g.addColorStop(0, 'rgba(255,150,50,0.20)');
      g.addColorStop(.5, 'rgba(255,110,30,0.07)');
      g.addColorStop(1, 'rgba(255,80,20,0)');
      ctx.fillStyle = g;
      ctx.fillRect(f.x - f.r, f.y - f.r, f.r * 2, f.r * 2);
      if (Math.random() < 0.25 && ZF.Settings.particleScale() > 0.4) {
        ZF.FX.particle(f.x + U.rand(-4, 4), f.y + U.rand(-4, 4), U.rand(-4, 4), U.rand(-26, -12), U.rand(.4, .9), U.rand(1, 2), U.pick(['#ffb347', '#ff7a2a']), { add: true, grav: -8 });
      }
    }
    // emergency lights near core
    var cx = G.path.core.x, cy = G.path.core.y;
    var pulse = .5 + Math.sin(G.stats.time * 2.4) * .25;
    var gg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 70);
    gg.addColorStop(0, 'rgba(110,190,255,' + (.10 * pulse) + ')');
    gg.addColorStop(1, 'rgba(80,140,255,0)');
    ctx.fillStyle = gg;
    ctx.fillRect(cx - 70, cy - 70, 140, 140);
    ctx.restore();
  };

  G.renderBuildGhost = function (ctx) {
    var def = ZF.Data.unitById[G.buildId];
    if (!def) return;
    var tx = G.hover.x, ty = G.hover.y;
    if (!G.grid.inBounds(tx, ty)) return;
    var ok = G.grid.canBuild(tx, ty, !!def.onPath) && G.resources.credits >= G.unitCost(def);
    var x = tx * TILE, y = ty * TILE;
    ctx.globalAlpha = .25;
    ctx.fillStyle = ok ? '#7fd44b' : '#d94a3a';
    ctx.fillRect(x, y, TILE, TILE);
    ctx.globalAlpha = .9;
    ctx.strokeStyle = ok ? '#b6f07a' : '#ff8a6a';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + .5, y + .5, TILE - 1, TILE - 1);
    ctx.globalAlpha = 1;
    var sp = ZF.Sprites.get(def);
    ctx.globalAlpha = .55;
    ctx.drawImage(sp.base, x - 4, y - 4);
    ctx.globalAlpha = 1;
    // range
    ctx.globalAlpha = .5;
    ctx.strokeStyle = ok ? 'rgba(140,220,110,.55)' : 'rgba(220,80,60,.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x + 8, y + 8, def.range || (def.aura ? def.aura.radius : 16), 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  };

  G.renderRange = function (ctx, t) {
    var s = t.s;
    if (!s) return;
    var r = t.support ? (s.auraR || 60) : s.range;
    var col = t.support ? 'rgba(127,212,75,.55)' : 'rgba(255,220,120,.5)';
    ctx.save();
    ctx.strokeStyle = col;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.arc(t.x, t.y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = .06;
    ctx.fillStyle = t.support ? '#7fd44b' : '#ffd479';
    ctx.beginPath(); ctx.arc(t.x, t.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#ffe066';
    ctx.strokeRect(t.tx * TILE + .5, t.ty * TILE + .5, TILE - 1, TILE - 1);
    ctx.restore();
  };

  /* ------------------------------------------------------------
     RESET
     ------------------------------------------------------------ */
  G.reset = function () {
    G.state = 'idle';
    G.towers = []; G.enemies = []; G.projectiles = []; G.pools = []; G.corpses = [];
    G.boss = null; G.selected = null; G.buildId = null;
    G.map = null; G.terrain = null;
    ZF.FX.clear();
  };
})(window.ZF);
