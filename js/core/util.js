/* ============================================================
   CORE UTILITIES
   ============================================================ */
window.ZF = window.ZF || {};
(function (ZF) {
  'use strict';

  var U = ZF.Util = {};
  U.TAU = Math.PI * 2;

  U.clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
  U.lerp = function (a, b, t) { return a + (b - a) * t; };
  U.rand = function (a, b) {
    if (a === undefined) return Math.random();
    if (b === undefined) { b = a; a = 0; }
    return a + Math.random() * (b - a);
  };
  U.randi = function (a, b) { return Math.floor(U.rand(a, b + 1)); };
  U.pick = function (arr) { return arr[(Math.random() * arr.length) | 0]; };
  U.chance = function (p) { return Math.random() < p; };
  U.dist = function (x1, y1, x2, y2) { return Math.hypot(x2 - x1, y2 - y1); };
  U.dist2 = function (x1, y1, x2, y2) { var dx = x2 - x1, dy = y2 - y1; return dx * dx + dy * dy; };
  U.sign = function (v) { return v < 0 ? -1 : 1; };
  U.round = Math.round;
  U.easeOut = function (t) { return 1 - (1 - t) * (1 - t); };
  U.easeInOut = function (t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
  U.sum = function (a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return s; };
  U.shuffle = function (a) {
    for (var i = a.length - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0; var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  };
  U.deepCopy = function (o) { return o == null ? o : JSON.parse(JSON.stringify(o)); };
  U.merge = function (a, b) {
    var out = {};
    for (var k in a) out[k] = a[k];
    for (var j in b) {
      if (b[j] && typeof b[j] === 'object' && !Array.isArray(b[j]) && a[j] && typeof a[j] === 'object') out[j] = U.merge(a[j], b[j]);
      else out[j] = b[j];
    }
    return out;
  };
  U.fmt = function (n) {
    n = Math.round(n);
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 10000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
  };
  U.time = function (sec) {
    var m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  };
  U.pct = function (v) { return Math.max(0, Math.min(100, v)) + '%'; };
  U.now = function () { return (window.performance && performance.now) ? performance.now() : Date.now(); };
  U.id = 0;
  U.uid = function (p) { return (p || 'e') + (++U.id) + '_' + ((Math.random() * 1e6) | 0).toString(36); };
  U.pointSegDist = function (px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    if (l2 === 0) return Math.hypot(px - ax, py - ay);
    var t = U.clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1);
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  };

  /* ---------- object pool ---------- */
  function Pool(factory, size) {
    this.factory = factory;
    this.free = [];
    this.active = [];
    for (var i = 0; i < (size || 0); i++) this.free.push(factory());
  }
  Pool.prototype.get = function () {
    var o = this.free.pop() || this.factory();
    this.active.push(o);
    return o;
  };
  Pool.prototype.sweep = function (isDead) {
    var a = this.active, n = 0;
    for (var i = 0; i < a.length; i++) {
      var o = a[i];
      if (isDead(o)) { this.free.push(o); } else { a[n++] = o; }
    }
    a.length = n;
  };
  U.Pool = Pool;

  /* ---------- dom ---------- */
  U.$ = function (sel, root) { return (root || document).querySelector(sel); };
  U.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  U.el = function (tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  };
  U.on = function (el, ev, fn, opts) {
    if (!el) return function () {};
    el.addEventListener(ev, fn, opts || false);
    return function () { el.removeEventListener(ev, fn, opts || false); };
  };

  /* ---------- tiny event bus ---------- */
  function Bus() { this._m = {}; }
  Bus.prototype.on = function (k, fn) { (this._m[k] = this._m[k] || []).push(fn); var s = this; return function () { s.off(k, fn); }; };
  Bus.prototype.off = function (k, fn) { var a = this._m[k]; if (a) { var i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); } };
  Bus.prototype.emit = function (k, a, b, c) {
    var l = this._m[k]; if (!l) return;
    for (var i = 0; i < l.length; i++) { try { l[i](a, b, c); } catch (e) { console.error(e); } }
  };
  U.Bus = Bus;

  /* ---------- storage (safe) ---------- */
  var mem = {};
  U.store = {
    get: function (k, def) {
      try {
        var v = window.localStorage.getItem(k);
        return v == null ? (k in mem ? mem[k] : def) : JSON.parse(v);
      } catch (e) { return k in mem ? mem[k] : def; }
    },
    set: function (k, v) {
      mem[k] = v;
      try { window.localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; }
    },
    del: function (k) { delete mem[k]; try { window.localStorage.removeItem(k); } catch (e) {} }
  };

  U.isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  U.isMobile = /Android|iPhone|iPad|iPod|Mobile|Silk/i.test(navigator.userAgent) || (U.isTouch && Math.min(screen.width, screen.height) < 820);
  U.prefersReducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  U.vibrate = function (ms) {
    if (!ZF.Settings || !ZF.Settings.data.controls.haptics) return;
    if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} }
  };

  /* ---------- colour helpers ---------- */
  U.hexToRgb = function (h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  };
  U.rgba = function (h, a) {
    var c = U.hexToRgb(h);
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')';
  };
  U.shade = function (hex, amt) {
    var c = U.hexToRgb(hex);
    var f = function (v) { return U.clamp(Math.round(v + amt * 255), 0, 255); };
    return 'rgb(' + f(c.r) + ',' + f(c.g) + ',' + f(c.b) + ')';
  };

  U.roman = function (n) {
    var map = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']], out = '';
    for (var i = 0; i < map.length; i++) { while (n >= map[i][0]) { out += map[i][1]; n -= map[i][0]; } }
    return out || 'I';
  };

  /* ---------- seeded random for consistent decoration ---------- */
  U.mulberry = function (seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
})(window.ZF);
