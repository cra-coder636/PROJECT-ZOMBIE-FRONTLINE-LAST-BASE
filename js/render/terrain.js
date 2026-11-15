/* ============================================================
   TERRAIN RENDERER — static battlefield baking + weather + HQ
   ============================================================ */
(function (ZF) {
  'use strict';
  var U = ZF.Util, Art = ZF.Art, R = Art.R;

  var cache = {};

  function hashStr(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  var DEFAULT_PAL = {
    ground: '#3c4433', ground2: '#454e3a', ground3: '#343b2c',
    path: '#6b5a3e', path2: '#7d6b4b', edge: '#4a3f2c',
    wall: '#4a4a42', accent: '#e0a03c', fog: '#7d9070',
    fire: '#ff7a2a', water: '#3a5a5e'
  };

  function drawGround(g, pal, rnd, pathCells, w, h) {
    var tw = 16, th = 16;
    for (var ty = 0; ty < h; ty++) {
      for (var tx = 0; tx < w; tx++) {
        var n = rnd();
        var col = n < .33 ? pal.ground : (n < .66 ? pal.ground2 : pal.ground3);
        R(g, tx * tw, ty * th, tw, th, col);
        if (rnd() < .28) {
          var px = tx * tw + Math.floor(rnd() * 12), py = ty * th + Math.floor(rnd() * 12);
          R(g, px, py, 2 + (rnd() * 2 | 0), 1, U.shade(col, rnd() < .5 ? .06 : -.06));
        }
        if (rnd() < .07) {
          var gx = tx * tw + 3 + (rnd() * 8 | 0), gy = ty * th + 4 + (rnd() * 8 | 0);
          R(g, gx, gy, 1, 3, pal.tuft || U.shade(pal.ground, .14));
          R(g, gx + 1, gy + 1, 1, 2, pal.tuft || U.shade(pal.ground, .1));
        }
      }
    }
    // large tonal patches for depth
    for (var i = 0; i < 40; i++) {
      var cx = rnd() * 640, cy = rnd() * 384, r = 20 + rnd() * 60;
      var grd = g.createRadialGradient(cx, cy, 0, cx, cy, r);
      grd.addColorStop(0, U.rgba(pal.ground2, .16));
      grd.addColorStop(1, U.rgba(pal.ground2, 0));
      g.fillStyle = grd; g.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
  }

  function drawPathTile(g, pal, style, x, y, edges, rnd) {
    var base = pal.path, base2 = pal.path2, edge = pal.edge;
    R(g, x, y, 16, 16, rnd() < .4 ? base2 : base);
    // texture
    for (var i = 0; i < 4; i++) {
      var px = x + (rnd() * 14 | 0), py = y + (rnd() * 14 | 0);
      R(g, px, py, 1 + (rnd() * 3 | 0), 1, U.shade(base, rnd() < .5 ? .07 : -.07));
    }
    if (style === 'asphalt') {
      if (rnd() < .18) {
        var cx = x + 2 + (rnd() * 10 | 0), cy = y + 2 + (rnd() * 10 | 0);
        R(g, cx, cy, 4, 1, U.shade(base, -.18));
        R(g, cx + 2, cy + 1, 1, 3, U.shade(base, -.18));
      }
    } else if (style === 'snow') {
      R(g, x + 2, y + 3, 6, 3, U.rgba('#ffffff', .1));
      if (rnd() < .12) { R(g, x + 5, y + 8, 2, 1, U.shade(base, -.2)); R(g, x + 7, y + 9, 2, 1, U.shade(base, -.2)); }
    } else if (style === 'metal') {
      if ((x / 16 + y / 16) % 2 === 0) R(g, x, y, 16, 1, U.rgba('#000000', .16));
      var bolt = U.shade(base, .18);
      R(g, x + 2, y + 2, 1, 1, bolt); R(g, x + 13, y + 2, 1, 1, bolt);
      R(g, x + 2, y + 13, 1, 1, bolt); R(g, x + 13, y + 13, 1, 1, bolt);
    } else if (style === 'sand') {
      for (var s = 0; s < 2; s++) {
        var sy = y + 3 + s * 7;
        R(g, x + 1, sy, 14, 1, U.rgba('#000000', .06));
        R(g, x + 1, sy + 1, 14, 1, U.rgba('#ffffff', .06));
      }
    } else if (style === 'jungle') {
      if (rnd() < .2) { R(g, x + 3, y + 4, 3, 2, pal.treeHi || '#4d7038'); }
      if (rnd() < .3) R(g, x + 4, y + 10, 8, 4, U.rgba('#2a3a1a', .25));
    } else if (style === 'concrete') {
      R(g, x, y, 16, 1, U.rgba('#000000', .1));
      if (rnd() < .2) R(g, x + 4, y + 5, 7, 1, U.rgba('#000000', .22));
    }
    // edges
    if (edges.top) R(g, x, y, 16, 1, edge);
    if (edges.bottom) R(g, x, y + 15, 16, 1, edge);
    if (edges.left) R(g, x, y, 1, 16, edge);
    if (edges.right) R(g, x + 15, y, 1, 16, edge);
    if (edges.top) R(g, x, y + 1, 16, 1, U.rgba('#000000', .1));
    if (edges.bottom) R(g, x, y + 14, 16, 1, U.rgba('#000000', .12));
  }

  function drawDecals(g, pal, rnd, pathCells) {
    // blood splatter along the path
    var cells = pathCells;
    for (var i = 0; i < cells.length; i += 3) {
      if (rnd() > .28) continue;
      var c = cells[i];
      var bx = c[0] * 16 + 3 + (rnd() * 8 | 0), by = c[1] * 16 + 3 + (rnd() * 8 | 0);
      g.fillStyle = U.rgba('#5a1410', .35);
      g.fillRect(bx, by, 4, 2); g.fillRect(bx + 3, by + 2, 3, 2); g.fillRect(bx - 2, by + 1, 2, 1);
    }
    // scattered debris
    for (var j = 0; j < 90; j++) {
      var x = rnd() * 636, y = rnd() * 380;
      var t = rnd();
      if (t < .4) { R(g, x, y, 2, 1, U.shade(pal.ground3, .1)); }
      else if (t < .7) { R(g, x, y, 1, 1, '#8a8a7a'); }
      else { R(g, x, y, 3, 2, U.rgba('#2a2a24', .5)); }
    }
  }

  /* =========================================================
     HQ / LAST BASE STRUCTURE
     ========================================================= */
  function drawCore(ctx, cx, cy, t, hpFrac, pal) {
    var x = Math.round(cx), y = Math.round(cy);
    var accent = (pal && pal.accent) || '#e0a03c';
    // ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(x, y + 18, 30, 12, 0, 0, Math.PI * 2); ctx.fill();
    // sandbag ring
    for (var r = 0; r < 2; r++) {
      for (var i = 0; i < 7; i++) {
        var a = (i / 7) * Math.PI * 2 + (r * .22);
        var bx = x + Math.cos(a) * (r ? 22 : 26) - 4;
        var by = y + Math.sin(a) * (r ? 12 : 15) - 2;
        R(ctx, bx, by, 8, 4, r ? '#8a7850' : '#6f5f3f');
        R(ctx, bx, by, 8, 1, r ? '#a08c5e' : '#87744c');
      }
    }
    // main bunker
    R(ctx, x - 20, y - 18, 40, 34, '#3a4238');
    R(ctx, x - 20, y - 18, 40, 2, '#59634f');
    R(ctx, x - 20, y + 12, 40, 4, '#2a3028');
    R(ctx, x - 22, y - 22, 44, 5, '#4c5644');
    R(ctx, x - 22, y - 22, 44, 1, '#6b775c');
    // windows
    for (var w = 0; w < 3; w++) {
      var wx = x - 14 + w * 11;
      R(ctx, wx, y - 10, 7, 5, '#151d18');
      var glow = .5 + .5 * Math.sin(t * 2 + w * 1.7);
      ctx.fillStyle = 'rgba(255,190,90,' + (.25 + glow * .35) + ')';
      ctx.fillRect(wx + 1, y - 9, 5, 3);
    }
    // door
    R(ctx, x - 5, y + 2, 10, 14, '#1c241e');
    R(ctx, x - 4, y + 3, 8, 12, '#26312a');
    R(ctx, x - 4, y + 3, 8, 1, '#3d4a3e');
    R(ctx, x + 3, y + 13, 1, 1, accent);
    // hazard stripes
    for (var s = 0; s < 4; s++) {
      R(ctx, x - 19 + s * 10, y + 7, 5, 3, s % 2 ? '#1f241c' : accent);
    }
    // roof antenna
    R(ctx, x + 10, y - 34, 2, 14, '#5c665a');
    R(ctx, x + 7, y - 38, 8, 2, '#6f7a6a');
    var blink = (Math.sin(t * 3) > .4);
    if (blink) { R(ctx, x + 10, y - 40, 2, 2, '#ff4a3a'); ctx.fillStyle = 'rgba(255,70,50,.25)'; ctx.fillRect(x + 4, y - 46, 14, 14); }
    // flag
    var fx = x - 17, fy = y - 36;
    R(ctx, fx, fy, 1, 18, '#4a4a40');
    for (var f = 0; f < 8; f++) {
      var wob = Math.sin(t * 4 + f * .7) * 1.5;
      R(ctx, fx + 1 + f, fy + wob, 1, 6, f < 4 ? '#a33a30' : '#8a2f28');
      if (f === 2) R(ctx, fx + 3, fy + 2 + wob, 3, 1, '#e0c090');
    }
    // rooftop MG
    R(ctx, x + 8, y - 26, 10, 3, '#3a443c');
    R(ctx, x + 18, y - 25, 5, 1, '#2a3028');
    R(ctx, x + 11, y - 28, 4, 2, '#4a564c');
    // damage overlay
    if (hpFrac < .65) {
      var dmg = 1 - hpFrac;
      ctx.fillStyle = 'rgba(20,10,8,' + (0.25 * dmg) + ')';
      ctx.fillRect(x - 20, y - 24, 40, 40);
      R(ctx, x - 12, y - 14, 3, 6, '#1a1a16');
      R(ctx, x - 9, y - 8, 6, 2, '#1a1a16');
      R(ctx, x + 6, y + 4, 2, 7, '#1a1a16');
      if (hpFrac < .3) {
        R(ctx, x + 2, y - 18, 8, 2, '#1a1a16');
        R(ctx, x - 18, y + 8, 9, 3, '#241a14');
      }
    }
    // guard soldiers silhouettes
    R(ctx, x - 26, y + 8, 4, 6, '#2f3a2f');
    R(ctx, x - 26, y + 5, 4, 3, '#3d4a3a');
    R(ctx, x + 24, y + 6, 4, 8, '#2f3a2f');
    R(ctx, x + 24, y + 3, 4, 3, '#3d4a3a');
  }

  /* =========================================================
     WEATHER
     ========================================================= */
  function hash1(n) {
    n = (n << 13) ^ n;
    return ((n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff) / 0x7fffffff;
  }

  var Weather = {
    draw: function (ctx, kind, t, w, h, scale) {
      if (!kind || kind === 'none') return;
      var dens = Math.round((kind === 'rain' ? 130 : kind === 'snow' ? 90 : kind === 'blizzard' ? 150 : kind === 'sand' ? 110 : 70) * scale);
      if (dens < 4) return;
      ctx.save();
      switch (kind) {
        case 'rain':
          ctx.strokeStyle = 'rgba(160,200,220,0.28)';
          ctx.lineWidth = 1;
          for (var i = 0; i < dens; i++) {
            var h1 = hash1(i * 7 + 3), h2 = hash1(i * 13 + 11);
            var x = (h1 * (w + 100) + t * 260) % (w + 100) - 50;
            var y = (h2 * (h + 100) + t * 620) % (h + 100) - 50;
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 11); ctx.stroke();
          }
          // splashes
          ctx.fillStyle = 'rgba(200,230,240,0.25)';
          for (var s = 0; s < dens * .18; s++) {
            var sx = (hash1(s * 31 + 5) * w + t * 20) % w;
            var sy = (hash1(s * 17 + 9) * h + t * 30) % h;
            var ph = (t * 6 + s) % 1;
            ctx.fillRect(sx | 0, sy | 0, 2, 1);
          }
          break;
        case 'snow':
        case 'blizzard':
          var cnt = kind === 'blizzard' ? dens * 1.6 : dens;
          for (var j = 0; j < cnt; j++) {
            var a = hash1(j * 5 + 1), b = hash1(j * 19 + 7);
            var wind = kind === 'blizzard' ? 120 : 22;
            var px = (a * w + Math.sin(t + j) * 12 + t * wind) % w;
            var py = (b * h + t * (kind === 'blizzard' ? 90 : 26) + Math.sin(t * 1.4 + j) * 6) % h;
            var sz = kind === 'blizzard' ? 2 : (j % 3 === 0 ? 2 : 1);
            ctx.fillStyle = 'rgba(235,245,255,' + (0.3 + (j % 4) * 0.14) + ')';
            ctx.fillRect(px | 0, py | 0, sz, sz);
          }
          break;
        case 'sand':
          for (var k = 0; k < dens; k++) {
            var sx2 = (hash1(k * 9 + 2) * (w + 200) + t * 200) % (w + 200) - 100;
            var sy2 = (hash1(k * 23 + 8) * h + Math.sin(t * .6 + k) * 22) % h;
            ctx.fillStyle = 'rgba(220,190,130,' + (0.08 + (k % 5) * 0.035) + ')';
            ctx.fillRect(sx2 | 0, sy2 | 0, 3 + (k % 4), 1);
          }
          ctx.fillStyle = 'rgba(200,160,90,0.07)';
          ctx.fillRect(0, 0, w, h);
          break;
        case 'ash':
        case 'embers':
          for (var m = 0; m < dens; m++) {
            var ax = (hash1(m * 11 + 4) * w + Math.sin(t * .7 + m) * 18) % w;
            var ay = (h - (hash1(m * 3 + 2) * h + t * 18) % (h + 40));
            if (kind === 'embers') {
              ctx.fillStyle = 'rgba(255,' + (110 + (m % 60)) + ',50,' + (0.3 + (m % 4) * 0.15) + ')';
              ctx.fillRect(ax | 0, ay | 0, 1, 2);
            } else {
              ctx.fillStyle = 'rgba(180,180,170,' + (0.12 + (m % 5) * 0.05) + ')';
              ctx.fillRect(ax | 0, ay | 0, 1, 1);
            }
          }
          break;
        case 'fog':
          ctx.fillStyle = 'rgba(150,170,150,0.06)';
          ctx.fillRect(0, 0, w, h);
          break;
      }
      ctx.restore();
    }
  };

  /* =========================================================
     BUILD STATIC MAP
     ========================================================= */
  var Terrain = ZF.Terrain = {
    drawCore: drawCore,
    weather: Weather,
    get: function (map, pathCells) {
      if (cache[map.id]) return cache[map.id];
      var pal = U.merge(DEFAULT_PAL, map.palette || {});
      var c = Art.cv(640, 384), g = c.g;
      var rnd = U.mulberry(hashStr(map.id));
      drawGround(g, pal, rnd, pathCells, 40, 24);

      // path tiles
      var set = {};
      pathCells.forEach(function (p) { set[p[0] + ',' + p[1]] = 1; });
      function isPath(x, y) { return !!set[x + ',' + y]; }
      pathCells.forEach(function (p) {
        var x = p[0], y = p[1];
        var edges = {
          top: !isPath(x, y - 1), bottom: !isPath(x, y + 1),
          left: !isPath(x - 1, y), right: !isPath(x + 1, y)
        };
        drawPathTile(g, pal, map.pathStyle || 'dirt', x * 16, y * 16, edges, rnd);
      });

      drawDecals(g, pal, rnd, pathCells);

      // blocked decor rectangles are painted as scenery later anyway
      if (map.decor) {
        map.decor.forEach(function (d) {
          var spr = ZF.Sprites.decorSprite(d[0], pal, (hashStr(map.id) + d[1] * 31 + d[2] * 17) | 0);
          var dx = d[1] * 16 - 8, dy = d[2] * 16 - 16;
          if (d[3]) { dx = d[1] * 16 - 16; dy = d[2] * 16 - 24; }
          // soft ground shadow
          g.fillStyle = 'rgba(0,0,0,0.18)';
          g.beginPath(); g.ellipse(dx + 16, dy + 29, 13, 5, 0, 0, Math.PI * 2); g.fill();
          g.drawImage(spr, dx, dy);
        });
      }

      // ambient fire markers
      var fires = [];
      (map.decor || []).forEach(function (d, i) {
        if (d[0] === 'barrel_fire' || d[0] === 'wreck' || d[0] === 'watchfire') {
          fires.push({ x: d[1] * 16 + 4, y: d[2] * 16 - 2, r: d[0] === 'watchfire' ? 46 : 30, kind: d[0] });
        }
      });

      // vignette baked at the edges for depth
      var vg = g.createRadialGradient(320, 192, 120, 320, 192, 360);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,0.45)');
      g.fillStyle = vg; g.fillRect(0, 0, 640, 384);

      var out = { bg: c.c, fires: fires, pal: pal };
      cache[map.id] = out;
      return out;
    },
    clear: function () { cache = {}; }
  };
})(window.ZF);
