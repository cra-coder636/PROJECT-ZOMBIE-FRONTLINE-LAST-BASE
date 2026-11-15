/* ============================================================
   AUDIO ENGINE — fully procedural (WebAudio synthesis)
   No external assets, works offline and on file://
   ============================================================ */
(function (ZF) {
  'use strict';
  var U = ZF.Util;

  var ctx = null, master, musicBus, sfxBus, uiBus, noiseBuf;
  var last = {};           // throttle per sfx
  var musicName = null, musicTimer = null;
  var step = 0, nextStepAt = 0, curTrack = null, musicToken = 0;
  var vol = { master: .8, music: .5, sfx: .8, ui: .65 };
  var muted = false, started = false;

  function vols() {
    if (!ZF.Settings) return vol;
    var a = ZF.Settings.data.audio;
    return { master: a.master, music: a.music, sfx: a.sfx, ui: a.ui };
  }
  function isMuted() { return ZF.Settings ? !!ZF.Settings.data.audio.muted : false; }

  function init() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { return null; }
    master = ctx.createGain();
    musicBus = ctx.createGain();
    sfxBus = ctx.createGain();
    uiBus = ctx.createGain();
    musicBus.connect(master); sfxBus.connect(master); uiBus.connect(master);
    master.connect(ctx.destination);
    // gentle limiter
    var comp = ctx.createDynamicsCompressor ? ctx.createDynamicsCompressor() : null;
    if (comp) {
      comp.threshold.value = -14; comp.knee.value = 12; comp.ratio.value = 6;
      comp.attack.value = 0.003; comp.release.value = 0.22;
      master.disconnect(); master.connect(comp); comp.connect(ctx.destination);
    }
    // noise buffer
    var len = ctx.sampleRate * 2;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    syncVolumes();
    return ctx;
  }

  function unlock() {
    var c = init();
    if (!c) return;
    if (c.state === 'suspended') { c.resume().catch(function () {}); }
    if (!started) {
      started = true;
      if (!musicName) music('menu');
    }
  }

  function syncVolumes() {
    if (!ctx) return;
    var v = vols();
    muted = isMuted();
    var t = ctx.currentTime;
    master.gain.setTargetAtTime(muted ? 0 : v.master, t, 0.05);
    musicBus.gain.setTargetAtTime(muted ? 0 : v.music * 0.85, t, 0.05);
    sfxBus.gain.setTargetAtTime(muted ? 0 : v.sfx, t, 0.05);
    uiBus.gain.setTargetAtTime(muted ? 0 : v.ui, t, 0.05);
  }

  /* ---------- primitives ---------- */
  function env(node, t, a, d, peak, sus) {
    var g = node.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(0.0001, t);
    g.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    if (sus != null) {
      g.exponentialRampToValueAtTime(Math.max(0.0002, sus), t + a + d * 0.5);
      g.exponentialRampToValueAtTime(0.0001, t + d);
    } else {
      g.exponentialRampToValueAtTime(0.0001, t + a + d);
    }
  }

  function tone(o) {
    if (!ctx) return;
    var t = (o.when || ctx.currentTime) + (o.delay || 0);
    var osc = ctx.createOscillator();
    osc.type = o.type || 'square';
    var g = ctx.createGain();
    var f0 = o.f0 || 220, f1 = o.f1 || f0;
    osc.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + (o.slide || o.dur || .1));
    if (o.detune) osc.detune.value = o.detune;
    var node = osc;
    if (o.filter) {
      var fl = ctx.createBiquadFilter();
      fl.type = o.filter; fl.frequency.setValueAtTime(o.ff || 1200, t);
      if (o.ff1) fl.frequency.exponentialRampToValueAtTime(o.ff1, t + (o.dur || .1));
      fl.Q.value = o.q || 1;
      node.connect(fl); node = fl;
    }
    node.connect(g);
    g.connect(o.bus || sfxBus);
    env(g, t, o.a || 0.004, o.dur || 0.12, o.gain == null ? 0.2 : o.gain);
    osc.start(t);
    osc.stop(t + (o.dur || .12) + (o.a || .004) + 0.02);
  }

  function noise(o) {
    if (!ctx) return;
    var t = (o.when || ctx.currentTime) + (o.delay || 0);
    var src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    var fl = ctx.createBiquadFilter();
    fl.type = o.filter || 'bandpass';
    fl.frequency.setValueAtTime(o.freq || 1200, t);
    if (o.freq1) fl.frequency.exponentialRampToValueAtTime(Math.max(40, o.freq1), t + (o.dur || .12));
    fl.Q.value = o.q == null ? 1 : o.q;
    var g = ctx.createGain();
    src.connect(fl); fl.connect(g); g.connect(o.bus || sfxBus);
    env(g, t, o.a || 0.002, o.dur || 0.1, o.gain == null ? .18 : o.gain);
    src.start(t);
    src.stop(t + (o.dur || .1) + (o.a || .002) + 0.03);
  }

  function throttle(name, ms) {
    var n = U.now();
    if (last[name] && n - last[name] < ms) return false;
    last[name] = n;
    return true;
  }

  /* ---------- SFX ---------- */
  var SFX = {
    ui_hover: function () { tone({ type: 'square', f0: 620, f1: 700, dur: .035, gain: .045, bus: uiBus }); },
    ui_click: function () {
      tone({ type: 'square', f0: 340, f1: 520, dur: .05, gain: .09, bus: uiBus });
      noise({ filter: 'highpass', freq: 2600, dur: .03, gain: .05, bus: uiBus });
    },
    ui_back: function () { tone({ type: 'square', f0: 420, f1: 240, dur: .08, gain: .08, bus: uiBus }); },
    build: function () {
      tone({ type: 'square', f0: 180, f1: 90, dur: .12, gain: .18 });
      noise({ filter: 'bandpass', freq: 900, freq1: 300, dur: .16, gain: .12, q: .7 });
      tone({ type: 'triangle', f0: 520, f1: 780, dur: .1, gain: .08, delay: .05 });
    },
    upgrade: function () {
      [523, 659, 784, 1046].forEach(function (f, i) { tone({ type: 'square', f0: f, dur: .1, gain: .075, delay: i * .055 }); });
    },
    sell: function () { tone({ type: 'sawtooth', f0: 500, f1: 120, dur: .18, gain: .14 }); noise({ filter: 'bandpass', freq: 1400, freq1: 400, dur: .16, gain: .08 }); },
    error: function () { tone({ type: 'square', f0: 160, f1: 120, dur: .13, gain: .12 }); tone({ type: 'square', f0: 120, f1: 90, dur: .13, gain: .1, delay: .12 }); },
    cash: function () { tone({ type: 'triangle', f0: 1200, dur: .05, gain: .06 }); tone({ type: 'triangle', f0: 1700, dur: .07, gain: .05, delay: .05 }); },
    shoot_rifle: function () {
      if (!throttle('rifle', 38)) return;
      noise({ filter: 'highpass', freq: 900, freq1: 300, dur: .07, gain: .13, q: .7 });
      tone({ type: 'square', f0: 260, f1: 90, dur: .05, gain: .1 });
    },
    shoot_smg: function () {
      if (!throttle('smg', 30)) return;
      noise({ filter: 'highpass', freq: 1400, freq1: 500, dur: .045, gain: .09, q: .6 });
      tone({ type: 'square', f0: 380, f1: 140, dur: .035, gain: .07 });
    },
    shoot_shotgun: function () {
      if (!throttle('shotgun', 70)) return;
      noise({ filter: 'lowpass', freq: 2400, freq1: 320, dur: .18, gain: .2, q: .6 });
      tone({ type: 'sawtooth', f0: 150, f1: 60, dur: .12, gain: .12 });
    },
    shoot_sniper: function () {
      if (!throttle('sniper', 110)) return;
      noise({ filter: 'bandpass', freq: 2200, freq1: 420, dur: .22, gain: .22, q: .7 });
      tone({ type: 'sawtooth', f0: 420, f1: 90, dur: .15, gain: .12 });
      noise({ filter: 'highpass', freq: 500, dur: .3, gain: .05, delay: .1 });
    },
    shoot_minigun: function () {
      if (!throttle('minigun', 32)) return;
      noise({ filter: 'bandpass', freq: 1100, freq1: 420, dur: .05, gain: .1, q: .8 });
      tone({ type: 'square', f0: 200, f1: 80, dur: .04, gain: .07 });
    },
    shoot_cannon: function () {
      if (!throttle('cannon', 90)) return;
      tone({ type: 'sawtooth', f0: 130, f1: 42, dur: .24, gain: .24 });
      noise({ filter: 'lowpass', freq: 1200, freq1: 180, dur: .3, gain: .2 });
    },
    shoot_rocket: function () {
      if (!throttle('rocket', 90)) return;
      noise({ filter: 'bandpass', freq: 700, freq1: 1900, dur: .3, gain: .14, q: .6 });
      tone({ type: 'sawtooth', f0: 190, f1: 480, dur: .25, gain: .07 });
    },
    shoot_mortar: function () {
      if (!throttle('mortar', 140)) return;
      tone({ type: 'sine', f0: 90, f1: 50, dur: .3, gain: .22 });
      noise({ filter: 'lowpass', freq: 700, freq1: 140, dur: .3, gain: .14 });
    },
    flame: function () {
      if (!throttle('flame', 90)) return;
      noise({ filter: 'bandpass', freq: 900, freq1: 1500, dur: .3, gain: .12, q: .5 });
    },
    laser: function () {
      if (!throttle('laser', 55)) return;
      tone({ type: 'sawtooth', f0: 1500, f1: 380, dur: .11, gain: .07 });
      tone({ type: 'sine', f0: 2200, f1: 700, dur: .09, gain: .05 });
    },
    tesla: function () {
      if (!throttle('tesla', 70)) return;
      tone({ type: 'sawtooth', f0: 1300, f1: 240, dur: .12, gain: .08 });
      noise({ filter: 'highpass', freq: 2800, dur: .1, gain: .09 });
    },
    explode: function () {
      if (!throttle('explode', 55)) return;
      noise({ filter: 'lowpass', freq: 1500, freq1: 90, dur: .5, gain: .3 });
      tone({ type: 'sine', f0: 110, f1: 32, dur: .45, gain: .25 });
    },
    explode_big: function () {
      noise({ filter: 'lowpass', freq: 1100, freq1: 60, dur: .9, gain: .4 });
      tone({ type: 'sine', f0: 80, f1: 24, dur: .8, gain: .35 });
      tone({ type: 'sawtooth', f0: 160, f1: 30, dur: .5, gain: .14 });
    },
    hit_flesh: function () {
      if (!throttle('flesh', 45)) return;
      noise({ filter: 'bandpass', freq: 420, freq1: 180, dur: .06, gain: .08, q: 1.4 });
    },
    zombie_die: function () {
      if (!throttle('zdie', 55)) return;
      noise({ filter: 'bandpass', freq: 320, freq1: 90, dur: .22, gain: .12, q: .8 });
      tone({ type: 'sawtooth', f0: 160, f1: 60, dur: .2, gain: .06 });
    },
    zombie_groan: function () {
      if (!throttle('groan', 900)) return;
      var f = U.rand(70, 130);
      tone({ type: 'sawtooth', f0: f, f1: f * .7, dur: .75, gain: .05, filter: 'lowpass', ff: 700 });
      tone({ type: 'square', f0: f * 1.5, f1: f, dur: .6, gain: .025, filter: 'lowpass', ff: 900 });
    },
    boss_roar: function () {
      tone({ type: 'sawtooth', f0: 90, f1: 34, dur: 1.4, gain: .3, filter: 'lowpass', ff: 800, ff1: 200 });
      tone({ type: 'square', f0: 62, f1: 28, dur: 1.5, gain: .18, filter: 'lowpass', ff: 500 });
      noise({ filter: 'bandpass', freq: 380, freq1: 120, dur: 1.3, gain: .16, q: .5 });
    },
    base_hit: function () {
      tone({ type: 'sine', f0: 90, f1: 40, dur: .4, gain: .3 });
      noise({ filter: 'lowpass', freq: 600, freq1: 100, dur: .35, gain: .2 });
    },
    wave_start: function () {
      tone({ type: 'sawtooth', f0: 220, f1: 330, dur: .5, gain: .14, filter: 'lowpass', ff: 1400 });
      tone({ type: 'square', f0: 110, dur: .55, gain: .08 });
      noise({ filter: 'highpass', freq: 1200, dur: .4, gain: .04, delay: .05 });
    },
    wave_clear: function () {
      [523, 659, 784].forEach(function (f, i) { tone({ type: 'triangle', f0: f, dur: .3, gain: .1, delay: i * .1 }); });
    },
    victory: function () {
      [523, 659, 784, 1046, 1318].forEach(function (f, i) { tone({ type: 'square', f0: f, dur: .35, gain: .1, delay: i * .12 }); });
    },
    defeat: function () {
      [392, 330, 262, 196].forEach(function (f, i) { tone({ type: 'sawtooth', f0: f, f1: f * .85, dur: .55, gain: .12, delay: i * .2, filter: 'lowpass', ff: 900 }); });
    },
    mine: function () {
      noise({ filter: 'bandpass', freq: 600, freq1: 200, dur: .2, gain: .16 });
      tone({ type: 'square', f0: 900, f1: 200, dur: .08, gain: .08 });
    },
    frost: function () {
      tone({ type: 'sine', f0: 1800, f1: 1200, dur: .2, gain: .05 });
      noise({ filter: 'highpass', freq: 3000, dur: .25, gain: .05 });
    },
    levelup: function () {
      [660, 880, 1100, 1320].forEach(function (f, i) { tone({ type: 'square', f0: f, dur: .18, gain: .08, delay: i * .08 }); });
    }
  };

  function play(name, opts) {
    if (!ctx || isMuted()) return;
    var fn = SFX[name];
    if (!fn) return;
    try { fn(opts || {}); } catch (e) {}
  }

  /* ---------- MUSIC ---------- */
  var SCALE = [0, 2, 3, 5, 7, 8, 10]; // natural minor
  function f(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

  var TRACKS = {
    menu: {
      bpm: 76, eighth: true,
      step: function (s, t) {
        var bar = Math.floor(s / 8) % 4;
        var chordRoots = [38, 34, 41, 36]; // D2, Bb1, F2, C2
        var root = chordRoots[bar];
        if (s % 8 === 0) {
          tone({ type: 'triangle', f0: f(root + 12), dur: 2.6, gain: .05, when: t, bus: musicBus, filter: 'lowpass', ff: 900 });
          tone({ type: 'sine', f0: f(root), dur: 3.2, gain: .05, when: t, bus: musicBus });
          tone({ type: 'sawtooth', f0: f(root + 19), dur: 2.6, gain: .018, when: t, bus: musicBus, filter: 'lowpass', ff: 700 });
        }
        if (s % 16 === 6) {
          var n = [62, 65, 69, 72, 74, 77][(Math.random() * 6) | 0];
          tone({ type: 'sine', f0: f(n), dur: 1.1, gain: .035, when: t, bus: musicBus });
        }
        if (s % 16 === 12) {
          tone({ type: 'sine', f0: f(root + 24), dur: 1.6, gain: .022, when: t, bus: musicBus });
        }
        if (s % 8 === 4) noise({ filter: 'lowpass', freq: 500, dur: 2.2, gain: .012, when: t, bus: musicBus });
      }
    },
    battle: {
      bpm: 102, eighth: true,
      step: function (s, t) {
        var bar = Math.floor(s / 8) % 4;
        var roots = [38, 38, 36, 41];
        var root = roots[bar];
        var b = s % 8;
        // driving bass
        if (b === 0 || b === 3 || b === 6) tone({ type: 'sawtooth', f0: f(root), dur: .22, gain: .085, when: t, bus: musicBus, filter: 'lowpass', ff: 420 });
        // kick
        if (b === 0 || b === 4) { tone({ type: 'sine', f0: 110, f1: 40, dur: .18, gain: .18, when: t, bus: musicBus }); }
        // snare / hat
        if (b === 2 || b === 6) noise({ filter: 'bandpass', freq: 1800, freq1: 900, dur: .1, gain: .05, when: t, bus: musicBus, q: .8 });
        if (b % 2 === 1) noise({ filter: 'highpass', freq: 6500, dur: .03, gain: .022, when: t, bus: musicBus });
        // tense stabs
        if (b === 0 && bar % 2 === 0) {
          tone({ type: 'square', f0: f(root + 12), dur: .5, gain: .03, when: t, bus: musicBus, filter: 'lowpass', ff: 1200 });
          tone({ type: 'square', f0: f(root + 19), dur: .5, gain: .022, when: t, bus: musicBus, filter: 'lowpass', ff: 1200 });
        }
        if (bar === 3 && b >= 6) {
          tone({ type: 'sawtooth', f0: f(root + 24 + (b === 7 ? 12 : 0)), dur: .16, gain: .035, when: t, bus: musicBus, filter: 'lowpass', ff: 2000 });
        }
      }
    },
    boss: {
      bpm: 126, eighth: true,
      step: function (s, t) {
        var b = s % 8, bar = Math.floor(s / 8) % 2;
        var root = bar === 0 ? 36 : 37;
        if (b === 0 || b === 2 || b === 4 || b === 6) {
          tone({ type: 'sawtooth', f0: f(root), dur: .18, gain: .1, when: t, bus: musicBus, filter: 'lowpass', ff: 380 });
          tone({ type: 'square', f0: f(root + 12), dur: .16, gain: .03, when: t, bus: musicBus, filter: 'lowpass', ff: 900 });
        }
        if (b === 0 || b === 3 || b === 6) tone({ type: 'sine', f0: 100, f1: 38, dur: .22, gain: .2, when: t, bus: musicBus });
        if (b === 4) noise({ filter: 'bandpass', freq: 2200, freq1: 700, dur: .16, gain: .07, when: t, bus: musicBus });
        if (b % 2 === 1) noise({ filter: 'highpass', freq: 7000, dur: .035, gain: .025, when: t, bus: musicBus });
        if (b === 0 && bar === 1) {
          tone({ type: 'sawtooth', f0: f(root + 18), f1: f(root + 24), dur: .7, gain: .05, when: t, bus: musicBus, filter: 'lowpass', ff: 2600 });
        }
      }
    }
  };

  function scheduleMusic() {
    if (!ctx || isMuted() || !curTrack) return;
    var stepDur = 60 / curTrack.bpm / 2;
    if (nextStepAt < ctx.currentTime - 1) nextStepAt = ctx.currentTime + .05;
    var guard = 0;
    while (nextStepAt < ctx.currentTime + .22 && guard++ < 20) {
      try { curTrack.step(step, nextStepAt); } catch (e) {}
      step++;
      nextStepAt += stepDur;
    }
  }

  function music(name) {
    if (name === musicName && musicTimer) return;
    musicName = name;
    if (!ctx) { init(); }
    if (!ctx) return;
    curTrack = TRACKS[name] || null;
    step = 0;
    nextStepAt = ctx.currentTime + .08;
    musicToken++;
    if (musicTimer) window.clearInterval(musicTimer);
    musicTimer = window.setInterval(scheduleMusic, 45);
    scheduleMusic();
  }

  function stopMusic() {
    musicName = null; curTrack = null;
    if (musicTimer) { window.clearInterval(musicTimer); musicTimer = null; }
  }

  ZF.Audio = {
    init: init, unlock: unlock, play: play,
    music: music, stopMusic: stopMusic,
    syncVolumes: syncVolumes,
    get context() { return ctx; },
    get enabled() { return !!ctx && !isMuted(); },
    current: function () { return musicName; },
    suspend: function () { if (ctx && ctx.state === 'running') ctx.suspend().catch(function () {}); },
    resume: function () { if (ctx && ctx.state === 'suspended') ctx.resume().catch(function () {}); },
    setMusicPaused: function (p) { if (!ctx) return; musicBus.gain.setTargetAtTime(isMuted() || p ? 0 : vols().music * .85, ctx.currentTime, .1); }
  };
})(window.ZF);
