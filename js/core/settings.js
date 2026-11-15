/* ============================================================
   SETTINGS  (persisted in localStorage)
   ============================================================ */
(function (ZF) {
  'use strict';
  var U = ZF.Util, KEY = 'zf_settings_v2';

  var DEFAULTS = {
    version: 2,
    graphics: {
      preset: 'high',
      particles: 1,
      screenShake: true,
      damageNumbers: true,
      shadows: true,
      weather: true,
      lights: true,
      vfx: 'high',
      fpsCounter: false
    },
    performance: {
      targetFps: 60,
      perfMode: false,
      reduceEffects: false
    },
    audio: { master: 0.8, music: 0.5, sfx: 0.8, ui: 0.65, muted: false },
    gameplay: {
      autoPause: true,
      healthBars: true,
      tutorial: true,
      speed: 1,
      autoNext: false
    },
    controls: { sensitivity: 1, haptics: true, grid: true },
    lastMap: 'abandoned_base',
    lastMode: 'endless'
  };

  var PRESETS = {
    low:    { particles: 0.3, shadows: false, weather: false, lights: false, vfx: 'low' },
    medium: { particles: 0.65, shadows: true, weather: true, lights: false, vfx: 'medium' },
    high:   { particles: 1, shadows: true, weather: true, lights: true, vfx: 'high' },
    ultra:  { particles: 1.45, shadows: true, weather: true, lights: true, vfx: 'ultra' }
  };

  var bus = new U.Bus();
  var data = U.merge(DEFAULTS, (U.store.get(KEY, {}) || {}));
  if (!data.graphics) data.graphics = U.deepCopy(DEFAULTS.graphics);

  var saveTimer = null;
  function scheduleSave() {
    if (saveTimer) return;
    saveTimer = window.setTimeout(function () { saveTimer = null; S.save(); }, 220);
  }

  var S = ZF.Settings = {
    data: data,
    DEFAULTS: DEFAULTS,
    PRESETS: PRESETS,
    onChange: function (fn) { return bus.on('change', fn); },

    get: function (path, def) {
      var parts = path.split('.'), o = data;
      for (var i = 0; i < parts.length; i++) { if (o == null) return def; o = o[parts[i]]; }
      return o === undefined ? def : o;
    },

    set: function (path, value, silent) {
      var parts = path.split('.'), o = data;
      for (var i = 0; i < parts.length - 1; i++) { if (typeof o[parts[i]] !== 'object' || o[parts[i]] === null) o[parts[i]] = {}; o = o[parts[i]]; }
      o[parts[parts.length - 1]] = value;
      scheduleSave();
      if (!silent) bus.emit('change', path, value);
      S.apply();
      return value;
    },

    applyPreset: function (name) {
      var p = PRESETS[name];
      if (!p) return;
      data.graphics.preset = name;
      data.graphics.particles = p.particles;
      data.graphics.shadows = p.shadows;
      data.graphics.weather = p.weather;
      data.graphics.lights = p.lights;
      data.graphics.vfx = p.vfx;
      if (name === 'low') { data.performance.reduceEffects = true; }
      else { data.performance.reduceEffects = false; }
      if (data.audio) { /* untouched */ }
      S.save();
      bus.emit('change', 'graphics.preset', name);
      S.apply();
      return S;
    },

    resetAudio: function () {
      data.audio = U.deepCopy(DEFAULTS.audio);
      S.save(); bus.emit('change', 'audio', data.audio); S.apply();
    },

    save: function () {
      U.store.set(KEY, data);
      if (ZF.Audio) ZF.Audio.syncVolumes();
    },

    apply: function () {
      if (ZF.Audio) ZF.Audio.syncVolumes();
      if (ZF.Render && ZF.Render.refreshQuality) ZF.Render.refreshQuality();
      bus.emit('applied');
    },

    // effective particle multiplier
    particleScale: function () {
      var g = data.graphics, p = data.performance;
      var s = g.particles;
      if (p.perfMode) s *= 0.45;
      if (p.reduceEffects) s *= 0.6;
      if (U.isMobile) s *= 0.8;
      return Math.max(0, s);
    },
    quality: function () { return data.performance.perfMode ? 'low' : data.graphics.preset; },
    vfx: function () {
      if (data.performance.perfMode) return 'low';
      return data.graphics.vfx || data.graphics.preset;
    }
  };

  // deep-merge new default keys into stored data
  data = U.merge(DEFAULTS, data);
  S.data = data;
  S.apply();
})(window.ZF);
