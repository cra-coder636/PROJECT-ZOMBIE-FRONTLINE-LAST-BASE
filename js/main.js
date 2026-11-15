/* ============================================================
   MAIN — bootstrap, screen flow, fixed-timestep game loop
   ============================================================ */
(function (ZF) {
  'use strict';
  var U = ZF.Util, G = ZF.Game, $ = U.$;

  var activeScreen = 'menu';
  var rafId = null;
  var lastFrame = 0;
  var accumulator = 0;
  var hudAccum = 0;
  var fpsFrames = 0;
  var fpsAccum = 0;
  var fpsEl = null;
  var fpsVisible = null;
  var booted = false;
  var STEP = 1 / 60;

  /* ------------------------------------------------------------
     SCREENS
     ------------------------------------------------------------ */
  function showScreen(name) {
    activeScreen = name;
    U.$$('.screen').forEach(function (s) {
      s.classList.toggle('active', s.id === 'screen-' + name);
    });
    if (name === 'game') {
      if (ZF.Menu) ZF.Menu.hide();
    } else if (name === 'menu') {
      if (ZF.Menu) ZF.Menu.show();
    }
    checkOrientation();
  }

  function syncFps() {
    if (!fpsEl) fpsEl = $('#fps-counter');
    if (!fpsEl) return;
    var show = !!ZF.Settings.get('graphics.fpsCounter');
    if (show !== fpsVisible) {
      fpsVisible = show;
      fpsEl.classList.toggle('hidden', !show);
    }
  }

  function checkOrientation() {
    var hint = $('#orientation-hint');
    if (!hint) return;
    var portrait = window.innerHeight > window.innerWidth;
    var show = U.isMobile && portrait && activeScreen === 'game';
    hint.classList.toggle('hidden', !show);
  }

  /* ------------------------------------------------------------
     APP FLOW
     ------------------------------------------------------------ */
  function startGame(mapId, mode) {
    if (!G.profile) G.profile = ZF.Save.loadProfile();
    showScreen('game');
    if (ZF.HUD) ZF.HUD.hideOverlay();
    G.newGame({ mapId: mapId, mode: mode });
    if (ZF.HUD) ZF.HUD.refresh();
    accumulator = 0;
    hudAccum = 0;
    lastFrame = U.now();
    window.requestAnimationFrame(function () {
      G.fit();
      G.render();
    });
  }

  function loadSave(data) {
    if (!data || !ZF.Save.validate(data)) {
      if (ZF.HUD) ZF.HUD.toast('SAVE DATA IS INVALID', 'bad');
      return false;
    }
    if (!G.profile) G.profile = ZF.Save.loadProfile();
    showScreen('game');
    if (ZF.HUD) ZF.HUD.hideOverlay();
    var ok = G.loadFrom(data);
    if (!ok) {
      showScreen('menu');
      if (ZF.Panels) ZF.Panels.slots('load');
      return false;
    }
    if (ZF.HUD) ZF.HUD.refresh();
    accumulator = 0;
    hudAccum = 0;
    lastFrame = U.now();
    window.requestAnimationFrame(function () {
      G.fit();
      G.render();
    });
    return true;
  }

  function continueGame() {
    ZF.Save.latest().then(function (meta) {
      if (!meta) {
        if (ZF.Panels) ZF.Panels.slots('load');
        return;
      }
      return ZF.Save.read(meta.slot).then(function (data) {
        if (!data) {
          if (ZF.Panels) ZF.Panels.slots('load');
          return;
        }
        loadSave(data);
      });
    }).catch(function () {
      if (ZF.Panels) ZF.Panels.slots('load');
    });
  }

  function toMenu() {
    if (G.state === 'playing' || G.state === 'paused') {
      try { G.autoSave(); } catch (e) {}
    }
    G.state = 'idle';
    if (ZF.Panels) ZF.Panels.close();
    if (ZF.HUD) ZF.HUD.hideOverlay();
    showScreen('menu');
    if (ZF.Menu) ZF.Menu.refreshSave();
  }

  ZF.App = {
    startGame: startGame,
    continueGame: continueGame,
    loadSave: loadSave,
    toMenu: toMenu,
    syncFps: syncFps,
    screen: function () { return activeScreen; }
  };

  /* ------------------------------------------------------------
     GAME LOOP
     ------------------------------------------------------------ */
  function frame(now) {
    rafId = window.requestAnimationFrame(frame);

    var raw = (now - lastFrame) / 1000;
    var target = Number(ZF.Settings.get('performance.targetFps', 60)) || 60;
    var minDt = 1 / target;
    if (raw < minDt - 0.002) return;
    lastFrame = now;
    var dt = Math.min(0.12, Math.max(0, raw));

    if (activeScreen === 'game') {
      if (G.state === 'playing') {
        accumulator += dt * (G.speed || 1);
        var steps = 0;
        while (accumulator >= STEP && steps < 12) {
          G.update(STEP);
          accumulator -= STEP;
          steps++;
        }
        // never build up a huge backlog after a long stall
        if (steps >= 12) accumulator = 0;
      } else {
        accumulator = 0;
      }

      G.render();

      hudAccum += dt;
      if (hudAccum >= 0.1) {
        hudAccum = 0;
        if (G.map && ZF.HUD) ZF.HUD.update();
      }
    } else {
      accumulator = 0;
      hudAccum = 0;
    }

    // fps readout
    fpsFrames++;
    fpsAccum += dt;
    if (fpsAccum >= 0.5) {
      var fps = Math.round(fpsFrames / fpsAccum);
      fpsFrames = 0;
      fpsAccum = 0;
      if (!fpsEl) fpsEl = $('#fps-counter');
      if (fpsEl) {
        fpsEl.textContent = fps + ' FPS';
        fpsEl.classList.toggle('warn', fps < 50 && fps >= 30);
        fpsEl.classList.toggle('bad', fps < 30);
      }
      syncFps();
    }
  }

  /* ------------------------------------------------------------
     GLOBAL INPUT / SYSTEM
     ------------------------------------------------------------ */
  function bindGlobal() {
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', function () { window.setTimeout(checkOrientation, 120); });

    ZF.Settings.onChange(function (path) {
      if (path === 'graphics.fpsCounter') syncFps();
    });

    // M toggles mute anywhere except inside the modal / text fields
    window.addEventListener('keydown', function (e) {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) return;
      if (ZF.Panels && ZF.Panels.isOpen && ZF.Panels.isOpen()) return;
      if (e.code === 'KeyM') {
        ZF.Settings.set('audio.muted', !ZF.Settings.data.audio.muted);
        if (ZF.Audio) { ZF.Audio.unlock(); ZF.Audio.syncVolumes(); }
        if (ZF.HUD) ZF.HUD.update();
      }
    });

    // periodic auto-save safety net (game also autosaves on pause / clear)
    window.setInterval(function () {
      if (activeScreen === 'game' && G.state === 'playing' && G.map && G.wave > 0) {
        G.autoSave();
      }
    }, 45000);
  }

  /* ------------------------------------------------------------
     BOOT
     ------------------------------------------------------------ */
  function hideBoot() {
    var boot = $('#boot');
    if (!boot) return;
    boot.classList.add('done');
    window.setTimeout(function () {
      if (boot.parentNode) boot.parentNode.removeChild(boot);
    }, 600);
  }

  function bootError(err) {
    var t = $('.boot-text');
    if (t) t.textContent = 'BOOT FAILED — SEE CONSOLE';
    // eslint-disable-next-line no-console
    console.error('[ZF] boot failed', err);
  }

  function boot() {
    if (booted) return;
    booted = true;

    var canvas = $('#game-canvas');
    if (!canvas) { bootError(new Error('game canvas missing')); return; }

    // load meta progression before any UI asks for it
    G.profile = ZF.Save.loadProfile();

    ZF.Save.init().then(function () {
      try {
        G.init(canvas);
        ZF.HUD.init();
        ZF.Panels.init();
        ZF.Menu.init();
        bindGlobal();

        fpsEl = $('#fps-counter');
        syncFps();
        showScreen('menu');
        checkOrientation();

        lastFrame = U.now();
        rafId = window.requestAnimationFrame(frame);

        window.setTimeout(hideBoot, 520);
        // eslint-disable-next-line no-console
        console.log('[ZF] Last Base online · saves: ' + ZF.Save.backend);
      } catch (err) {
        bootError(err);
      }
    }).catch(function (err) {
      // Save.init already falls back to localStorage, so this is unexpected
      bootError(err);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.addEventListener('error', function (e) {
    if (!booted) return;
    // Keep the console honest during development; never interrupt the game UI.
    // eslint-disable-next-line no-console
    console.error('[ZF] runtime error:', e.message, e.filename + ':' + e.lineno);
  });
})(window.ZF);
