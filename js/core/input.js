/* ============================================================
   INPUT — pointer / touch / keyboard
   ============================================================ */
(function (ZF) {
  'use strict';
  var U = ZF.Util;
  var bus = new U.Bus();

  var canvas = null, rect = null, scale = 1;
  var W = 640, H = 384;
  var down = false, downAt = 0, moved = 0, lastX = 0, lastY = 0;
  var pointer = { x: 0, y: 0, tx: 0, ty: 0, inside: false, type: 'mouse' };
  var keys = {};

  function measure() {
    if (!canvas) return;
    rect = canvas.getBoundingClientRect();
  }

  function toGame(clientX, clientY) {
    if (!rect) measure();
    if (!rect || !rect.width) return { x: 0, y: 0 };
    var x = (clientX - rect.left) / rect.width * W;
    var y = (clientY - rect.top) / rect.height * H;
    return { x: x, y: y };
  }

  function updatePointer(e) {
    var p = toGame(e.clientX, e.clientY);
    pointer.x = p.x; pointer.y = p.y;
    pointer.tx = Math.floor(p.x / 16); pointer.ty = Math.floor(p.y / 16);
    pointer.inside = p.x >= 0 && p.y >= 0 && p.x <= W && p.y <= H;
    pointer.type = (e.pointerType || 'mouse');
  }

  function onDown(e) {
    if (e.button !== undefined && e.button > 0 && e.pointerType === 'mouse') return;
    updatePointer(e);
    down = true; downAt = U.now(); moved = 0; lastX = e.clientX; lastY = e.clientY;
    try { if (canvas.setPointerCapture && e.pointerId != null) canvas.setPointerCapture(e.pointerId); } catch (err) {}
    bus.emit('down', pointer, e);
  }
  function onMove(e) {
    var wasDown = down;
    moved += Math.abs(e.clientX - lastX) + Math.abs(e.clientY - lastY);
    lastX = e.clientX; lastY = e.clientY;
    updatePointer(e);
    if (wasDown) bus.emit('drag', pointer, e);
    bus.emit('move', pointer, e);
  }
  function onUp(e) {
    if (!down) return;
    updatePointer(e);
    down = false;
    var dur = U.now() - downAt;
    var tap = moved < 14 && dur < 700;
    bus.emit('up', pointer, e, tap);
  }
  function onCancel(e) { down = false; bus.emit('up', pointer, e, false); }

  function onKeyDown(e) {
    var code = e.code || e.key;
    // don't hijack typing in inputs
    var tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (code === 'Space') e.preventDefault();
    if (!keys[code]) bus.emit('keydown', code, e);
    keys[code] = true;
  }
  function onKeyUp(e) { keys[e.code || e.key] = false; }
  function onBlur() { keys = {}; down = false; bus.emit('blur'); }

  var Input = ZF.Input = {
    pointer: pointer,
    keys: keys,
    on: function (k, fn) { return bus.on(k, fn); },
    attach: function (cv) {
      canvas = cv; W = cv.width; H = cv.height;
      measure();
      var wrap = cv.parentElement;
      if (wrap) {
        wrap.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });
        wrap.addEventListener('gesturestart', function (e) { e.preventDefault(); });
      }
      cv.addEventListener('pointerdown', onDown);
      cv.addEventListener('pointermove', onMove);
      cv.addEventListener('pointerup', onUp);
      cv.addEventListener('pointercancel', onCancel);
      cv.addEventListener('pointerleave', function () { pointer.inside = false; bus.emit('leave'); });
      cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      window.addEventListener('resize', measure);
      if (window.ResizeObserver) { try { new ResizeObserver(measure).observe(cv); } catch (e) {} }
      document.addEventListener('scroll', measure, true);
    },
    measure: measure,
    toGame: toGame,
    isDown: function () { return down; }
  };

  window.addEventListener('keydown', onKeyDown, false);
  window.addEventListener('keyup', onKeyUp, false);
  window.addEventListener('blur', onBlur, false);
  document.addEventListener('visibilitychange', function () { if (document.hidden) { keys = {}; down = false; } });
  // double-tap zoom suppression on the play area only
  document.addEventListener('dblclick', function (e) {
    if (e.target && e.target.id === 'game-canvas') e.preventDefault();
  }, { passive: false });
})(window.ZF);
