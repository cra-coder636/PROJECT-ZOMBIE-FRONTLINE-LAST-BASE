/* ============================================================
   FX — particles, damage numbers, beams, shockwaves, shake
   ============================================================ */
(function (ZF) {
  'use strict';
  var U = ZF.Util;

  var parts = [], free = [], texts = [], beams = [], rings = [], decals = [];
  var MAX_PARTS = 1300, trauma = 0;
  var settings = ZF.Settings;

  function mkPart() {
    return { x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 2, col: '#fff', grav: 0, drag: .98, add: false, shrink: true, glow: 0 };
  }
  for (var i = 0; i < 240; i++) free.push(mkPart());

  function budget() {
    var cap = MAX_PARTS * settings.particleScale();
    return cap;
  }

  function spawn(x, y, vx, vy, life, size, col, opt) {
    if (parts.length >= budget()) return null;
    var p = free.pop() || mkPart();
    p.x = x; p.y = y; p.vx = vx; p.vy = vy;
    p.life = p.max = life; p.size = size; p.col = col;
    p.grav = 0; p.drag = .96; p.add = false; p.shrink = true;
    if (opt) {
      p.grav = opt.grav || 0; p.drag = opt.drag == null ? .96 : opt.drag;
      p.add = !!opt.add; p.shrink = opt.shrink !== false;
      if (opt.size2 != null) p.size2 = opt.size2;
    }
    parts.push(p);
    return p;
  }

  var FX = ZF.FX = {
    get count() { return parts.length; },
    clear: function () {
      while (parts.length) free.push(parts.pop());
      texts.length = 0; beams.length = 0; rings.length = 0; decals.length = 0; trauma = 0;
    },

    shake: function (amt) {
      if (!settings.data.graphics.screenShake) return;
      trauma = Math.min(1, trauma + amt);
    },
    get trauma() { return trauma; },

    particle: spawn,

    burst: function (x, y, n, col, opt) {
      opt = opt || {};
      n = Math.round(n * settings.particleScale() * (opt.scale || 1));
      if (n < 1) n = 1;
      for (var i = 0; i < n; i++) {
        var a = U.rand(0, U.TAU), sp = U.rand(opt.spdMin || 20, opt.spdMax || 80);
        spawn(x + U.rand(-2, 2), y + U.rand(-2, 2), Math.cos(a) * sp, Math.sin(a) * sp,
          U.rand(opt.lifeMin || .25, opt.lifeMax || .6), U.rand(opt.sizeMin || 1, opt.sizeMax || 3),
          Array.isArray(col) ? U.pick(col) : col, opt);
      }
    },

    muzzle: function (x, y, ang, big) {
      if (settings.particleScale() <= 0) return;
      var n = big ? 4 : 2;
      for (var i = 0; i < n; i++) {
        var a = ang + U.rand(-.35, .35);
        spawn(x, y, Math.cos(a) * U.rand(30, 90), Math.sin(a) * U.rand(30, 90),
          U.rand(.05, .14), U.rand(1, big ? 3 : 2), U.pick(['#ffe9a0', '#ffc44a', '#fff6d0']), { add: true, drag: .8 });
      }
      spawn(x, y, 0, 0, .06, big ? 6 : 4, 'rgba(255,220,140,0.85)', { add: true, shrink: false });
      spawn(x, y, Math.cos(ang) * 12, Math.sin(ang) * 12, .35, 2, 'rgba(120,120,110,0.35)', { grav: -6, drag: .93 });
    },

    blood: function (x, y, dir, n) {
      n = n || 6;
      var cnt = Math.round(n * Math.min(1, settings.particleScale()));
      for (var i = 0; i < cnt; i++) {
        var a = (dir || 0) + U.rand(-.9, .9);
        var sp = U.rand(20, 90);
        spawn(x, y - 4, Math.cos(a) * sp, Math.sin(a) * sp - 20, U.rand(.25, .6), U.rand(1, 2), U.pick(['#8a1f16', '#6b1410', '#a82a1a']), { grav: 200, drag: .97 });
      }
    },

    gib: function (x, y, n, colors) {
      var cols = colors || ['#8a1f16', '#5a1810', '#4a5a34', '#3a4430'];
      var cnt = Math.round((n || 10) * settings.particleScale());
      for (var i = 0; i < cnt; i++) {
        var a = U.rand(0, U.TAU), sp = U.rand(30, 130);
        spawn(x, y, Math.cos(a) * sp, Math.sin(a) * sp - 30, U.rand(.35, .8), U.rand(1, 3), U.pick(cols), { grav: 260, drag: .98 });
      }
    },

    explosion: function (x, y, r, big) {
      var sc = settings.particleScale();
      var n = Math.round((big ? 26 : 14) * sc);
      for (var i = 0; i < n; i++) {
        var a = U.rand(0, U.TAU), sp = U.rand(20, big ? 190 : 120) * (1 - (i / n) * .3);
        spawn(x, y, Math.cos(a) * sp, Math.sin(a) * sp, U.rand(.2, big ? .9 : .6), U.rand(2, big ? 6 : 4),
          U.pick(['#fff2b0', '#ffc44a', '#ff8a30', '#e0521c']), { add: true, drag: .9, grav: -20 });
      }
      for (var j = 0; j < n * .6; j++) {
        var b = U.rand(0, U.TAU), s2 = U.rand(8, 55);
        spawn(x + U.rand(-4, 4), y + U.rand(-4, 4), Math.cos(b) * s2, Math.sin(b) * s2 - 10,
          U.rand(.5, 1.6), U.rand(3, big ? 9 : 6), U.pick(['rgba(60,56,50,0.55)', 'rgba(90,84,74,0.42)', 'rgba(40,38,34,0.6)']),
          { grav: -22, drag: .95 });
      }
      FX.ring(x, y, big ? r * 1.5 : r, big ? '#ffb347' : '#ffd479', big ? .45 : .28);
      FX.shake(big ? .55 : .22);
      ZF.Audio.play(big ? 'explode_big' : 'explode');
    },

    ring: function (x, y, r, col, life) {
      if (rings.length > 40) rings.shift();
      rings.push({ x: x, y: y, r: 4, max: r, col: col || '#ffd479', life: life || .3, maxLife: life || .3 });
    },

    beam: function (x1, y1, x2, y2, col, life, width, jagged) {
      if (beams.length > 60) beams.shift();
      beams.push({ x1: x1, y1: y1, x2: x2, y2: y2, col: col || '#9ce6ff', life: life || .12, maxLife: life || .12, width: width || 2, jagged: !!jagged, seed: Math.random() * 99 });
    },

    text: function (x, y, str, col, opt) {
      if (texts.length > 70) texts.shift();
      opt = opt || {};
      texts.push({
        x: x, y: y, str: str, col: col || '#ffe9a0', life: opt.life || .8, maxLife: opt.life || .8,
        vy: opt.vy == null ? -24 : opt.vy, size: opt.size || 7, crit: !!opt.crit, vx: opt.vx || 0
      });
    },

    damage: function (x, y, amount, crit, col) {
      if (!settings.data.graphics.damageNumbers) return;
      FX.text(x + U.rand(-4, 4), y - 10, Math.round(amount), col || (crit ? '#ffe066' : '#f0f4e8'),
        { size: crit ? 9 : 7, crit: crit, life: crit ? 1 : .7 });
    },

    decal: function (x, y, col, size) {
      if (decals.length > 90) decals.shift();
      decals.push({ x: x, y: y, col: col || 'rgba(80,20,14,0.4)', size: size || 6 });
    },

    update: function (dt) {
      var i, p;
      for (i = parts.length - 1; i >= 0; i--) {
        p = parts[i];
        p.life -= dt;
        if (p.life <= 0) {
          parts[i] = parts[parts.length - 1]; parts.pop(); free.push(p);
          continue;
        }
        p.vy += p.grav * dt;
        p.vx *= p.drag; p.vy *= p.drag;
        p.x += p.vx * dt; p.y += p.vy * dt;
      }
      for (i = texts.length - 1; i >= 0; i--) {
        var t = texts[i];
        t.life -= dt;
        t.y += t.vy * dt; t.x += t.vx * dt;
        t.vy *= .96;
        if (t.life <= 0) texts.splice(i, 1);
      }
      for (i = beams.length - 1; i >= 0; i--) {
        beams[i].life -= dt;
        if (beams[i].life <= 0) beams.splice(i, 1);
      }
      for (i = rings.length - 1; i >= 0; i--) {
        var r = rings[i];
        r.life -= dt;
        r.r = U.lerp(4, r.max, 1 - r.life / r.maxLife);
        if (r.life <= 0) rings.splice(i, 1);
      }
      if (trauma > 0) trauma = Math.max(0, trauma - dt * 2.4);
    },

    drawGround: function (ctx) {
      for (var i = 0; i < decals.length; i++) {
        var d = decals[i];
        ctx.fillStyle = d.col;
        ctx.fillRect(d.x | 0, d.y | 0, d.size, Math.max(1, d.size * .5));
      }
    },

    draw: function (ctx) {
      var i, p;
      // non-additive pass (smoke, blood, debris)
      for (i = 0; i < parts.length; i++) {
        p = parts[i];
        if (p.add) continue;
        var a = Math.min(1, p.life / p.max * 1.6);
        ctx.globalAlpha = a;
        ctx.fillStyle = p.col;
        var s = p.size;
        if (p.shrink) s = Math.max(1, p.size * (0.35 + 0.65 * p.life / p.max));
        ctx.fillRect(p.x | 0, p.y | 0, Math.round(s), Math.round(s));
      }
      // additive pass
      ctx.globalCompositeOperation = 'lighter';
      for (i = 0; i < parts.length; i++) {
        p = parts[i];
        if (!p.add) continue;
        ctx.globalAlpha = Math.min(1, p.life / p.max * 1.4);
        ctx.fillStyle = p.col;
        ctx.fillRect(p.x | 0, p.y | 0, Math.round(p.size), Math.round(p.size));
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;

      // rings
      for (i = 0; i < rings.length; i++) {
        var r = rings[i], al = r.life / r.maxLife;
        ctx.globalAlpha = al * .8;
        ctx.strokeStyle = r.col;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = al * .25;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(r.x, r.y, Math.max(0, r.r - 2), 0, Math.PI * 2); ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // beams
      for (i = 0; i < beams.length; i++) {
        var b = beams[i], la = b.life / b.maxLife;
        ctx.globalAlpha = la;
        ctx.strokeStyle = b.col;
        ctx.lineWidth = b.width;
        ctx.beginPath();
        ctx.moveTo(b.x1, b.y1);
        if (b.jagged) {
          var dx = b.x2 - b.x1, dy = b.y2 - b.y1;
          var segs = 5;
          for (var s = 1; s <= segs; s++) {
            var tt = s / segs;
            var jx = b.x1 + dx * tt + (s < segs ? Math.sin(b.seed + s * 2 + i) * 7 : 0);
            var jy = b.y1 + dy * tt + (s < segs ? Math.cos(b.seed + s * 3) * 7 : 0);
            ctx.lineTo(jx, jy);
          }
        } else {
          ctx.lineTo(b.x2, b.y2);
        }
        ctx.stroke();
        ctx.globalAlpha = la * .5;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1, b.width - 1);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // floating text
      for (i = 0; i < texts.length; i++) {
        var t = texts[i], ta = Math.min(1, t.life / t.maxLife * 2);
        ctx.globalAlpha = ta;
        ctx.font = (t.crit ? 'bold ' : '') + t.size + 'px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#12160f';
        ctx.fillText(t.str, (t.x | 0) + 1, (t.y | 0) + 1);
        ctx.fillStyle = t.col;
        ctx.fillText(t.str, t.x | 0, t.y | 0);
      }
      ctx.globalAlpha = 1;
      ctx.textAlign = 'left';
    },

    drawShake: function (ctx) {
      if (trauma <= 0.001) return false;
      var amp = trauma * trauma * 7;
      ctx.translate(Math.round(U.rand(-amp, amp)), Math.round(U.rand(-amp, amp)));
      return true;
    }
  };
})(window.ZF);
