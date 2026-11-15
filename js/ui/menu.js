/* ============================================================
   MAIN MENU — animated battlefield backdrop + navigation
   ============================================================ */
(function (ZF) {
  'use strict';
  var U = ZF.Util, $ = U.$;
  var cv, ctx, raf = null, running = false, t = 0, lastT = 0;
  var zombies = [], rain = [], embers = [], smoke = [];
  var muzzle = 0, boom = 0, boomX = 0, searchAngle = 0;
  var continueData = null, feedTimer = 0, feedIdx = 0;

  var FEED = [
    'OUTPOST 7 SILENT. NO SURVIVORS.',
    'AMMUNITION CONVOY LOST IN SECTOR D.',
    'HORDE MOVEMENT DETECTED — NORTH RIDGE.',
    'RADIO TOWER STILL BROADCASTING. UNKNOWN.',
    'EVACUATION FAILED. HOLD THE LINE.',
    'SUPPLY DROP AUTHORIZED AT DAWN.',
    'BASE COMMAND: ALL UNITS TO THE WALL.',
    'REINFORCEMENTS ETA — UNKNOWN.',
    'ZOMBIE ACTIVITY RISING. STAY ALERT.',
    'ARTILLERY GRID 14 IS NOW OFFLINE.',
    'SURVIVOR SIGNAL DETECTED. UNVERIFIED.',
    'NIGHTFALL IN 02:14. LOCK IT DOWN.'
  ];

  function initScene() {
    cv = $('#menu-canvas');
    if (!cv) return;
    cv.width = 640;
    cv.height = 360;
    ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    zombies = [];
    for (var i = 0; i < 14; i++) {
      var types = ['walker', 'walker', 'runner', 'crawler', 'armored', 'mutant'];
      var def = ZF.Data.zombieById[U.pick(types)];
      zombies.push({
        def: def, x: U.rand(-100, 620), y: U.rand(232, 330),
        sp: U.rand(6, 22) * (def.id === 'runner' ? 1.7 : 1),
        ph: U.rand(0, 6.28), scale: U.rand(.8, 1.5)
      });
    }
    rain = [];
    for (var r = 0; r < 120; r++) rain.push({ x: U.rand(0, 640), y: U.rand(0, 360), sp: U.rand(240, 460), len: U.rand(5, 13) });
    embers = [];
    for (var e = 0; e < 40; e++) embers.push({ x: U.rand(0, 640), y: U.rand(0, 360), sp: U.rand(4, 18), ph: U.rand(0, 6.28) });
    smoke = [];
    for (var s = 0; s < 10; s++) smoke.push({ x: U.rand(0, 640), y: U.rand(120, 240), r: U.rand(14, 40), sp: U.rand(2, 8), a: U.rand(.04, .12) });
    loadSaveInfo();
    startLoop();
  }

  function loadSaveInfo() {
    var info = $('#menu-saveinfo');
    var btn = $('.mbtn[data-action="continue"]');
    ZF.Save.latest().then(function (s) {
      continueData = s;
      if (s) {
        var d = new Date(s.savedAt);
        info.textContent = 'SAVE: ' + (s.mode || 'endless').toUpperCase() + ' / WAVE ' + s.wave + ' / ' + U.time(s.time || 0);
        if (btn) btn.removeAttribute('disabled');
      } else {
        info.textContent = 'NO SAVE DATA';
        if (btn) btn.setAttribute('disabled', '');
      }
    }).catch(function () {
      info.textContent = 'NO SAVE DATA';
      if (btn) btn.setAttribute('disabled', '');
    });
  }

  function addFeed() {
    var box = $('#intel-feed');
    if (!box) return;
    var line = U.el('div', 'intel-line');
    var time = new Date();
    var stamp = ('0' + time.getHours()).slice(-2) + ('0' + time.getMinutes()).slice(-2);
    line.innerHTML = '<span style="color:#4a5c4c">' + stamp + '</span><span>' + FEED[feedIdx % FEED.length] + '</span>';
    box.appendChild(line);
    feedIdx++;
    while (box.children.length > 6) box.removeChild(box.firstChild);
  }

  /* ---------------- scene drawing ---------------- */
  function drawScene(dt) {
    t += dt;
    searchAngle += dt * .25;
    var w = 640, h = 360;
    // sky
    var sky = ctx.createLinearGradient(0, 0, 0, 230);
    sky.addColorStop(0, '#0a1418');
    sky.addColorStop(.55, '#122019');
    sky.addColorStop(1, '#1d2a1c');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // moon
    ctx.fillStyle = 'rgba(210,230,200,0.22)';
    ctx.beginPath(); ctx.arc(520, 52, 26, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c8dcc0';
    ctx.beginPath(); ctx.arc(520, 52, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#b0c8a8';
    ctx.fillRect(513, 46, 5, 4); ctx.fillRect(524, 55, 6, 5); ctx.fillRect(517, 58, 3, 3);

    // smoke clouds
    for (var i = 0; i < smoke.length; i++) {
      var s = smoke[i];
      s.x -= s.sp * dt;
      if (s.x < -50) s.x = 690;
      ctx.fillStyle = 'rgba(40,50,44,' + s.a + ')';
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(s.x + s.r * .7, s.y + 6, s.r * .7, 0, Math.PI * 2); ctx.fill();
    }

    // distant ruins
    ctx.fillStyle = '#141d18';
    var buildings = [[20, 120, 50], [80, 96, 34], [126, 138, 26], [166, 110, 44], [220, 150, 30],
      [262, 118, 22], [300, 96, 48], [356, 132, 28], [396, 108, 40], [448, 146, 32]];
    for (var b = 0; b < buildings.length; b++) {
      var bd = buildings[b];
      ctx.fillRect(bd[0], h - 120 - bd[1] + 100, bd[2], bd[1]);
      // windows
      for (var wy = 0; wy < bd[1] - 12; wy += 11) {
        for (var wx = 4; wx < bd[2] - 6; wx += 9) {
          if (Math.random() < 0.06) ctx.fillStyle = '#8a7a3a';
          else ctx.fillStyle = '#0d1512';
          ctx.fillRect(bd[0] + wx, h - 20 - bd[1] + wy, 3, 4);
          ctx.fillStyle = '#141d18';
        }
      }
    }

    // ground
    var gr = ctx.createLinearGradient(0, 220, 0, h);
    gr.addColorStop(0, '#1e271e');
    gr.addColorStop(1, '#111712');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 220, w, h - 220);

    // fog band
    ctx.fillStyle = 'rgba(120,140,120,0.055)';
    ctx.fillRect(0, 200, w, 60);

    // searchlights
    drawSearchlight(120, 214, searchAngle, .7);
    drawSearchlight(170, 214, searchAngle + 2.4, .5);

    // the base (right side)
    drawBase(540, 232);

    // zombies
    zombies.sort(function (a, b) { return a.y - b.y; });
    for (var z = 0; z < zombies.length; z++) drawZombie(zombies[z], dt);

    // barbed wire foreground
    ctx.strokeStyle = 'rgba(30,34,28,0.9)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var x = 0; x < w; x += 8) {
      var yy = 330 + Math.sin(x * .1) * 2;
      if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(20,24,20,0.8)';
    ctx.beginPath();
    for (var x2 = 0; x2 < w; x2 += 8) {
      var y2 = 344 + Math.sin(x2 * .09 + 2) * 2;
      if (x2 === 0) ctx.moveTo(x2, y2); else ctx.lineTo(x2, y2);
    }
    ctx.stroke();

    // muzzle flashes
    muzzle -= dt;
    if (muzzle <= 0) {
      muzzle = U.rand(.25, .9);
      var mx = 556 + U.rand(-16, 6), my = 236;
      ctx.fillStyle = 'rgba(255,230,150,0.9)';
      ctx.fillRect(mx, my, 5, 3);
      ctx.fillStyle = 'rgba(255,200,100,0.25)';
      ctx.fillRect(mx - 6, my - 4, 16, 10);
    }
    // distant explosion
    boom -= dt;
    if (boom <= 0) {
      boom = U.rand(5, 10);
      boomX = U.rand(60, 460);
      ctx.fillStyle = 'rgba(255,150,60,0.5)';
      ctx.beginPath(); ctx.arc(boomX, 190, 18, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,220,120,0.7)';
      ctx.beginPath(); ctx.arc(boomX, 190, 7, 0, Math.PI * 2); ctx.fill();
    }
    if (boom > 4.4) {
      var fa = (boom - 4.4) * .5;
      ctx.fillStyle = 'rgba(255,140,50,' + Math.min(.25, fa) + ')';
      ctx.beginPath(); ctx.arc(boomX, 190, 40, 0, Math.PI * 2); ctx.fill();
    }

    // fire glow near base
    var flick = .6 + Math.sin(t * 5.2) * .2 + Math.sin(t * 11) * .1;
    var fg = ctx.createRadialGradient(468, 292, 0, 468, 292, 70);
    fg.addColorStop(0, 'rgba(255,140,50,' + (.22 * flick) + ')');
    fg.addColorStop(1, 'rgba(255,90,20,0)');
    ctx.fillStyle = fg;
    ctx.fillRect(398, 222, 140, 140);
    // fire
    for (var f = 0; f < 5; f++) {
      var fh = 12 + Math.sin(t * 9 + f) * 5;
      ctx.fillStyle = f % 2 ? '#ff9a3a' : '#ffd06a';
      ctx.fillRect(464 + f * 2, 300 - fh, 4, fh);
    }

    // rain
    ctx.strokeStyle = 'rgba(160,190,200,0.22)';
    ctx.lineWidth = 1;
    for (var r = 0; r < rain.length; r++) {
      var rp = rain[r];
      rp.y += rp.sp * dt;
      rp.x -= rp.sp * dt * .18;
      if (rp.y > 380) { rp.y = -12; rp.x = U.rand(0, 660); }
      ctx.beginPath(); ctx.moveTo(rp.x, rp.y); ctx.lineTo(rp.x - 2, rp.y + rp.len); ctx.stroke();
    }
    // embers
    for (var e = 0; e < embers.length; e++) {
      var ep = embers[e];
      ep.y -= ep.sp * dt;
      ep.x += Math.sin(t + ep.ph) * 6 * dt;
      if (ep.y < -5) { ep.y = 380; ep.x = U.rand(0, 640); }
      ctx.fillStyle = 'rgba(255,' + (120 + (e % 60)) + ',50,' + (.25 + (e % 4) * .12) + ')';
      ctx.fillRect(ep.x | 0, ep.y | 0, 1, 2);
    }

    // vignette
    var vg = ctx.createRadialGradient(320, 190, 100, 320, 190, 380);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.72)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }

  function drawSearchlight(x, y, ang, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(ang) * .5);
    var g = ctx.createLinearGradient(0, 0, 0, -240);
    g.addColorStop(0, 'rgba(200,230,190,' + (.14 * alpha) + ')');
    g.addColorStop(1, 'rgba(200,230,190,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-3, 0); ctx.lineTo(26, -250); ctx.lineTo(-26, -250);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawBase(bx, by) {
    // wall
    ctx.fillStyle = '#313b2f';
    ctx.fillRect(bx - 70, by + 30, 150, 60);
    ctx.fillStyle = '#3f4b3a';
    ctx.fillRect(bx - 70, by + 30, 150, 6);
    for (var i = 0; i < 7; i++) {
      ctx.fillStyle = i % 2 ? '#4a5642' : '#37412f';
      ctx.fillRect(bx - 70 + i * 22, by + 36, 20, 8);
    }
    // sandbags
    for (var s = 0; s < 12; s++) {
      ctx.fillStyle = s % 2 ? '#6b5d3e' : '#7d6d49';
      ctx.fillRect(bx - 60 + s * 10, by + 24 + (s % 2) * 4, 12, 7);
    }
    // tower
    ctx.fillStyle = '#3a4436';
    ctx.fillRect(bx - 10, by - 60, 44, 52);
    ctx.fillStyle = '#4c5845';
    ctx.fillRect(bx - 10, by - 60, 44, 5);
    ctx.fillStyle = '#242c22';
    ctx.fillRect(bx - 2, by - 52, 12, 9);
    ctx.fillStyle = 'rgba(255,190,90,0.65)';
    ctx.fillRect(bx + 1, by - 50, 6, 5);
    // roof gun
    ctx.fillStyle = '#2e362b';
    ctx.fillRect(bx + 4, by - 70, 24, 5);
    ctx.fillRect(bx + 24, by - 69, 10, 3);
    // antenna + flag
    ctx.fillStyle = '#5a6454';
    ctx.fillRect(bx - 16, by - 86, 2, 34);
    ctx.fillStyle = '#8a2f28';
    ctx.fillRect(bx - 14, by - 86, 14, 8);
    ctx.fillStyle = '#c9b080';
    ctx.fillRect(bx - 9, by - 83, 4, 2);
    // soldiers on the wall
    for (var k = 0; k < 4; k++) {
      var sx = bx - 48 + k * 20;
      ctx.fillStyle = '#222c24';
      ctx.fillRect(sx, by + 12, 5, 10);
      ctx.fillStyle = '#2c3a2c';
      ctx.fillRect(sx - 1, by + 8, 7, 4);
      ctx.fillStyle = '#18201a';
      ctx.fillRect(sx - 1, by + 8, 7, 2);
    }
    // base gate light
    ctx.fillStyle = 'rgba(255,190,90,0.5)';
    ctx.fillRect(bx + 44, by + 46, 6, 4);
  }

  function drawZombie(z, dt) {
    z.x += z.sp * dt;
    if (z.x > 660) { z.x = -60 - U.rand(0, 120); z.y = U.rand(232, 330); }
    var spr = ZF.Sprites.zombieSprites(z.def)[Math.floor(t * 3 + z.ph) % 2];
    var sc = z.scale * 1.5;
    ctx.save();
    ctx.globalAlpha = .9;
    ctx.translate(z.x, z.y);
    var bob = Math.sin(t * 5 + z.ph) * 1.5;
    ctx.drawImage(spr, -12 * sc, -12 * sc + bob, 24 * sc, 24 * sc);
    ctx.restore();
  }

  function startLoop() {
    if (running) return;
    running = true;
    lastT = U.now();
    function frame() {
      if (!running) return;
      var now = U.now();
      var dt = Math.min(.06, (now - lastT) / 1000);
      lastT = now;
      drawScene(dt);
      feedTimer -= dt;
      if (feedTimer <= 0) { feedTimer = 7; addFeed(); }
      raf = window.requestAnimationFrame(frame);
    }
    raf = window.requestAnimationFrame(frame);
  }

  function stopLoop() {
    running = false;
    if (raf) window.cancelAnimationFrame(raf);
    raf = null;
  }

  /* ---------------- navigation ---------------- */
  function onMenuClick(e) {
    var btn = e.target.closest('.mbtn');
    if (!btn) return;
    var action = btn.getAttribute('data-action');
    if (!action) return;
    ZF.Audio.unlock();
    ZF.Audio.play('ui_click');
    U.vibrate(8);

    if (action === 'play') {
      if (continueData) ZF.App.continueGame();
      else ZF.Panels.newGame();
    } else if (action === 'continue') {
      if (continueData) ZF.App.continueGame();
      else ZF.Panels.slots('load');
    } else if (action === 'newgame') {
      ZF.Panels.newGame();
    } else if (action === 'maps') {
      ZF.Panels.maps();
    } else if (action === 'modes') {
      ZF.Panels.modes();
    } else if (action === 'settings') {
      ZF.Panels.settings();
    } else if (action === 'credits') {
      ZF.Panels.credits();
    }
  }

  function init() {
    initScene();
    U.on($('#menu-nav'), 'click', onMenuClick);
    U.on(document, 'pointerdown', function () {
      ZF.Audio.unlock();
    }, { once: true });
    U.on(document, 'keydown', function (e) {
      if (!running) return;
      if (e.code === 'Enter') {
        var b = $('.mbtn[data-action="play"]');
        if (b) { b.click(); }
      }
    });
  }

  ZF.Menu = {
    init: init,
    show: function () {
      loadSaveInfo();
      if (!running) startLoop();
      ZF.Audio.music('menu');
    },
    hide: function () { stopLoop(); },
    refreshSave: loadSaveInfo
  };
})(window.ZF);
