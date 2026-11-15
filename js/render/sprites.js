/* ============================================================
   PIXEL ART ENGINE — all sprites are generated procedurally.
   Cached offscreen canvases, crisply aligned to the pixel grid.
   ============================================================ */
(function (ZF) {
  'use strict';
  var U = ZF.Util;

  var cache = {};
  function cv(w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    return { c: c, g: g, w: w, h: h };
  }
  function R(g, x, y, w, h, col) {
    g.fillStyle = col;
    g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }
  function P(g, x, y, col) { R(g, x, y, 1, 1, col); }
  function hline(g, x, y, w, col) { R(g, x, y, w, 1, col); }
  function vline(g, x, y, h, col) { R(g, x, y, 1, h, col); }

  var Art = ZF.Art = { cv: cv, R: R, P: P, hline: hline, vline: vline };

  /* =========================================================
     PALETTES
     ========================================================= */
  var SKIN = { light: '#c98d63', mid: '#a9714d', dark: '#7b4b34' };

  /* =========================================================
     INFANTRY — base body (24x24, feet at y=21, faces right)
     ========================================================= */
  var INFANTRY_STYLE = {
    rifleman:    { helmet: '#43543a', helmet2: '#5d7248', vest: '#3e4f36', vest2: '#586c47', pants: '#2c3829', accent: '#8a9a6a', pack: '#2b3527' },
    assault:     { helmet: '#2f3d47', helmet2: '#435862', vest: '#37464c', vest2: '#4d626a', pants: '#263138', accent: '#c8663c', pack: '#22313a' },
    heavy:       { helmet: '#3b3b33', helmet2: '#565244', vest: '#42402f', vest2: '#5d5943', pants: '#2c2b22', accent: '#b9a15c', pack: '#33301f' },
    sniper:      { helmet: '#3a4a30', helmet2: '#4d6138', vest: '#39492f', vest2: '#52683e', pants: '#2a3524', accent: '#6f8a4a', pack: '#2b3524' },
    shotgun:     { helmet: '#47392c', helmet2: '#5f4c38', vest: '#4a3d2c', vest2: '#655238', pants: '#312a20', accent: '#c58a4a', pack: '#3a3022' },
    flamer:      { helmet: '#3d3630', helmet2: '#554a3e', vest: '#433a2c', vest2: '#5c5039', pants: '#2e2820', accent: '#cc5a2a', pack: '#6b2a18' },
    rocket:      { helmet: '#3b4433', helmet2: '#54603f', vest: '#414a32', vest2: '#586443', pants: '#2d3424', accent: '#a6b25a', pack: '#4a3a22' },
    medic:       { helmet: '#d5d8cf', helmet2: '#eef1e8', vest: '#cfd5c8', vest2: '#ecefe6', pants: '#8e968c', accent: '#cc3b32', pack: '#aeb5a9' },
    grenadier:   { helmet: '#3e4430', helmet2: '#57603f', vest: '#454a31', vest2: '#5d6540', pants: '#2f3422', accent: '#9aa64f', pack: '#3b4027' },
    minigun:     { helmet: '#3a3a3c', helmet2: '#525254', vest: '#414244', vest2: '#5a5b5e', pants: '#2b2c2e', accent: '#c3a34a', pack: '#33343a' }
  };

  function soldierBody(g, st, frame, opts) {
    opts = opts || {};
    var bob = frame === 1 ? 1 : 0;
    var legA = frame === 1 ? 1 : 0;
    var cx = 12;
    // shadow
    R(g, 7, 21, 11, 2, 'rgba(0,0,0,0.25)');
    // legs
    R(g, cx - 3, 16 + bob, 3, 4, st.pants);
    R(g, cx + 1, 16 + bob, 3, 4, U.shade(st.pants, -0.03));
    R(g, cx - 4 + legA, 20 + bob, 3, 2, '#20241d');
    R(g, cx + 2 - legA, 20 + bob, 3, 2, '#20241d');
    // backpack
    R(g, cx - 6, 10 + bob, 3, 6, st.pack || st.vest);
    R(g, cx - 6, 10 + bob, 1, 6, U.shade(st.pack || st.vest, 0.07));
    // torso
    R(g, cx - 3, 10 + bob, 7, 7, st.vest);
    R(g, cx - 3, 10 + bob, 7, 2, st.vest2);
    R(g, cx - 3, 16 + bob, 7, 1, U.shade(st.vest, -0.07));
    // chest rig
    R(g, cx - 2, 12 + bob, 5, 1, U.shade(st.vest, -0.12));
    R(g, cx - 1, 14 + bob, 2, 2, st.accent);
    // shoulder pads
    R(g, cx - 4, 10 + bob, 2, 3, st.vest2);
    R(g, cx + 4, 10 + bob, 2, 3, st.vest2);
    if (opts.bulk) { R(g, cx - 5, 11 + bob, 2, 4, st.vest2); R(g, cx + 5, 11 + bob, 2, 4, st.vest2); }
    // head
    R(g, cx - 2, 6 + bob, 5, 4, SKIN.mid);
    R(g, cx + 2, 7 + bob, 1, 2, SKIN.light);
    // helmet
    R(g, cx - 3, 4 + bob, 7, 3, st.helmet);
    R(g, cx - 3, 4 + bob, 7, 1, st.helmet2);
    R(g, cx - 3, 7 + bob, 2, 1, st.helmet);
    R(g, cx + 2, 7 + bob, 2, 1, st.helmet);
    // goggles / visor
    R(g, cx - 1, 8 + bob, 4, 1, '#1b2220');
    R(g, cx + 1, 8 + bob, 2, 1, opts.visor || '#7fd2c8');
    // arms forward
    R(g, cx + 3, 12 + bob, 4, 2, st.vest2);
    R(g, cx + 6, 12 + bob, 2, 2, SKIN.mid);
    R(g, cx + 1, 13 + bob, 2, 3, st.vest2);
    R(g, cx + 1, 16 + bob, 2, 1, SKIN.mid);
    if (opts.cross) {
      R(g, cx - 2, 11 + bob, 3, 1, '#ffffff');
      R(g, cx - 1, 10 + bob, 1, 3, '#ffffff');
      R(g, cx - 4, 4 + bob, 2, 1, '#d63b32');
    }
    if (opts.belt) {
      for (var i = 0; i < 4; i++) P(g, cx - 2 + i * 1.5, 13 + bob, '#c9a24a');
    }
    if (opts.tank) {
      R(g, cx - 7, 10 + bob, 3, 6, '#8a2f1c');
      R(g, cx - 7, 10 + bob, 1, 6, '#b84428');
      R(g, cx - 6, 9 + bob, 1, 1, '#c9a24a');
    }
    if (opts.pack2) {
      R(g, cx - 5, 9 + bob, 2, 3, U.shade(st.vest, 0.12));
    }
  }

  var GUNS = {
    rifle: { len: 15, pivotY: 5, visor: '#7fd2c8' },
    assault: { len: 14, pivotY: 5 },
    heavy: { len: 16, pivotY: 5 },
    sniper: { len: 19, pivotY: 5 },
    shotgun: { len: 14, pivotY: 5 },
    flamer: { len: 13, pivotY: 5 },
    rocket: { len: 18, pivotY: 4 },
    medic: { len: 12, pivotY: 5 },
    grenadier: { len: 13, pivotY: 5 },
    minigun: { len: 16, pivotY: 5 }
  };

  function drawGun(g, kind, st) {
    var W = 22, H = 12, y = 5;
    g.clearRect(0, 0, W, H);
    var metal = '#4a4f4c', metal2 = '#6b726c', dark = '#23282a';
    switch (kind) {
      case 'rifle':
        R(g, 2, y, 8, 2, metal); R(g, 2, y + 2, 5, 2, '#3a3f3a');
        R(g, 10, y, 9, 1, dark); R(g, 16, y - 1, 1, 1, metal2);
        R(g, 4, y + 2, 2, 3, '#2d3230'); // magazine
        R(g, 6, y - 1, 3, 1, '#3d423c'); // sight
        break;
      case 'assault':
        R(g, 2, y, 7, 2, metal); R(g, 8, y, 6, 2, dark);
        R(g, 3, y + 2, 2, 3, '#2d3230'); R(g, 10, y - 1, 2, 1, metal2);
        R(g, 13, y, 2, 1, metal2);
        break;
      case 'heavy':
        R(g, 1, y - 1, 10, 4, metal); R(g, 11, y, 8, 2, dark);
        R(g, 4, y + 3, 3, 3, '#2c302d'); R(g, 15, y - 1, 3, 1, metal2);
        for (var i = 0; i < 3; i++) P(g, 16 + i, y + 1, metal2);
        break;
      case 'sniper':
        R(g, 1, y, 6, 2, '#5a4a34'); R(g, 6, y, 13, 1, dark);
        R(g, 6, y - 2, 6, 2, '#2b3234'); R(g, 9, y - 1, 2, 1, '#8fd4e0');
        R(g, 8, y + 1, 2, 2, '#333a34'); R(g, 17, y, 3, 1, '#3d4440');
        break;
      case 'shotgun':
        R(g, 1, y - 1, 8, 3, '#5a4230'); R(g, 8, y - 1, 8, 2, metal);
        R(g, 8, y + 1, 8, 1, '#3a3f3a'); R(g, 5, y + 2, 4, 1, '#3a2e22');
        R(g, 14, y - 1, 2, 1, metal2);
        break;
      case 'flamer':
        R(g, 1, y - 1, 8, 4, '#5c4a34'); R(g, 8, y, 7, 2, metal);
        R(g, 3, y + 3, 3, 2, '#6b2a18'); R(g, 14, y - 1, 2, 4, '#3a3f3a');
        R(g, 15, y, 1, 2, '#ffb347');
        break;
      case 'rocket':
        R(g, 0, y - 2, 16, 4, '#4a5340'); R(g, 0, y - 2, 16, 1, '#66705a');
        R(g, 15, y - 1, 3, 2, '#8a2f1c'); R(g, 3, y + 2, 2, 2, '#2f3529');
        R(g, 6, y - 3, 2, 1, '#2c3226');
        break;
      case 'medic':
        R(g, 1, y, 7, 2, '#cfd5c8'); R(g, 8, y, 5, 1, '#8a968c');
        R(g, 2, y + 1, 3, 3, '#aeb5a9'); R(g, 3, y + 2, 1, 1, '#cc3b32');
        break;
      case 'grenadier':
        R(g, 1, y, 7, 3, '#4b5338'); R(g, 7, y - 1, 6, 4, '#3c4331');
        R(g, 5, y + 1, 3, 3, '#2c3224'); R(g, 12, y, 3, 2, '#2b3127');
        break;
      case 'minigun':
        R(g, 1, y - 1, 7, 4, '#3b3f42'); R(g, 7, y - 2, 3, 6, '#4a5054');
        R(g, 10, y - 2, 5, 1, '#2a2e30'); R(g, 10, y + 2, 5, 1, '#2a2e30');
        R(g, 10, y, 5, 2, '#5a6166'); R(g, 2, y + 3, 3, 2, '#2a2e30');
        break;
      default:
        R(g, 2, y, 8, 2, metal);
    }
  }

  // returns {base, gun}
  function makeInfantry(id) {
    var st = INFANTRY_STYLE[id] || INFANTRY_STYLE.rifleman;
    var opts = {
      bulk: id === 'heavy' || id === 'minigun',
      cross: id === 'medic',
      belt: id === 'shotgun' || id === 'assault',
      tank: id === 'flamer',
      pack2: id === 'rocket' || id === 'minigun',
      visor: id === 'sniper' ? '#bde37a' : (id === 'flamer' ? '#ff9a4a' : '#7fd2c8')
    };
    var frames = [];
    for (var f = 0; f < 2; f++) {
      var c = cv(24, 24);
      soldierBody(c.g, st, f, opts);
      frames.push(c.c);
    }
    var gunC = cv(22, 12);
    drawGun(gunC.g, id, st);
    return { frames: frames, gun: gunC.c };
  }

  /* =========================================================
     STRUCTURES — base + rotating gun
     ========================================================= */
  function platform(g, metal, dark, light) {
    R(g, 2, 17, 20, 5, 'rgba(0,0,0,0.25)');
    R(g, 3, 14, 18, 6, dark);
    R(g, 3, 14, 18, 1, metal);
    R(g, 4, 19, 16, 1, '#1a1f1c');
    for (var i = 0; i < 4; i++) P(g, 5 + i * 4, 16, light);
    R(g, 8, 11, 8, 5, metal);
    R(g, 8, 11, 8, 1, light);
  }

  function sandbags(g) {
    for (var row = 0; row < 2; row++) {
      for (var i = 0; i < 3; i++) {
        var x = 2 + i * 7 + (row % 2 ? 3 : 0), y = 15 + row * 4;
        R(g, x, y, 7, 4, '#7a6a45');
        R(g, x, y, 7, 1, '#96845a');
        R(g, x, y + 3, 7, 1, '#5c4f33');
        P(g, x + 3, y + 2, '#6b5d3c');
      }
    }
  }

  function makeStructure(id) {
    var c = cv(24, 24), g = c.g;
    var gunC = cv(24, 12), gg = gunC.g;
    var steel = '#4a5450', steel2 = '#69756e', dark = '#2a322e', light = '#8b9a90';
    var amber = '#e0a03c';
    switch (id) {
      case 'mg_turret':
        sandbags(g);
        platform(g, steel, dark, light);
        R(g, 10, 8, 4, 5, '#3d4742');
        R(g, 9, 9, 6, 3, steel2);
        break;
      case 'sniper_tower':
        R(g, 4, 20, 16, 2, '#2b322c');
        R(g, 7, 9, 2, 12, '#4c4232'); R(g, 15, 9, 2, 12, '#4c4232');
        R(g, 9, 9, 8, 2, '#5c5340');
        R(g, 5, 5, 14, 5, '#574c37');
        R(g, 5, 5, 14, 1, '#6d6046');
        R(g, 6, 10, 12, 1, '#3a3226');
        // sandbag base
        R(g, 4, 19, 16, 3, '#6b5d3c');
        break;
      case 'heavy_cannon':
        platform(g, steel, dark, light);
        R(g, 6, 12, 12, 6, '#4e5852');
        R(g, 6, 12, 12, 1, steel2);
        R(g, 12, 6, 2, 7, '#39423d');
        R(g, 15, 12, 3, 3, '#39423d');
        break;
      case 'missile':
        platform(g, '#5a5240', '#332f24', '#7d7257');
        R(g, 5, 9, 14, 6, '#4b4a35');
        R(g, 5, 9, 14, 1, '#676548');
        R(g, 6, 11, 2, 2, amber); R(g, 10, 11, 2, 2, amber); R(g, 14, 11, 2, 2, amber);
        break;
      case 'mortar':
        sandbags(g);
        R(g, 8, 12, 8, 5, '#46503f');
        R(g, 6, 18, 12, 2, '#38412f');
        // angled tube drawn in gun
        break;
      case 'flame_turret':
        platform(g, '#4b4034', '#2c261e', '#6d5c48');
        R(g, 3, 12, 4, 6, '#7a2c18'); R(g, 3, 12, 1, 6, '#a8442a');
        R(g, 17, 12, 4, 6, '#7a2c18'); R(g, 17, 12, 1, 6, '#a8442a');
        R(g, 8, 10, 8, 3, '#3a4238');
        break;
      case 'tesla':
        platform(g, '#3f4a4e', '#232c30', '#5e6e74');
        R(g, 10, 4, 4, 9, '#3e4a52');
        R(g, 9, 8, 6, 2, '#5c7078');
        R(g, 8, 10, 8, 2, '#4a5a62');
        R(g, 11, 1, 2, 4, '#6f8890');
        P(g, 11, 0, '#9ce6ff'); P(g, 12, 1, '#9ce6ff');
        break;
      case 'laser':
        platform(g, '#3c4448', '#222a2e', '#5a666c');
        R(g, 8, 7, 8, 7, '#3a444a');
        R(g, 9, 8, 6, 5, '#2c363c');
        R(g, 11, 9, 2, 2, '#3ce0ff');
        P(g, 12, 10, '#bdfaff');
        break;
      case 'sentry':
        R(g, 4, 19, 16, 2, '#2b322c');
        R(g, 11, 13, 2, 7, '#3f4a42');
        R(g, 5, 17, 14, 2, '#333d36');
        R(g, 7, 12, 10, 5, '#4a564c');
        R(g, 7, 12, 10, 1, '#63705f');
        R(g, 13, 9, 4, 3, '#39423c');
        P(g, 15, 10, '#ff7a4a');
        break;
      case 'barricade':
        R(g, 1, 17, 22, 5, 'rgba(0,0,0,0.28)');
        for (var r = 0; r < 3; r++) for (var i = 0; i < 4; i++) {
          var x = 1 + i * 5 + (r % 2 ? 2 : 0), y = 12 + r * 3;
          R(g, x, y, 5, 3, '#7d6d47');
          R(g, x, y, 5, 1, '#9a885c');
          R(g, x, y + 2, 5, 1, '#5d5033');
          P(g, x + 2, y + 1, '#6b5d3c');
        }
        // posts
        R(g, 2, 10, 1, 7, '#4a3f2b'); R(g, 21, 10, 1, 7, '#4a3f2b');
        break;
      case 'wall':
        R(g, 1, 17, 22, 5, 'rgba(0,0,0,0.28)');
        R(g, 1, 8, 22, 11, '#5a6058');
        R(g, 1, 8, 22, 2, '#737a70');
        R(g, 1, 17, 22, 2, '#43483f');
        for (var yy = 11; yy < 18; yy += 4) {
          hline(g, 1, yy, 22, '#4a5048');
          var off = yy % 8 === 3 ? 0 : 6;
          for (var xx = 2 + off; xx < 22; xx += 11) vline(g, xx, yy + 1, 3, '#4a5048');
        }
        R(g, 1, 8, 22, 1, '#8a9184');
        break;
      case 'mine':
        R(g, 5, 16, 14, 3, 'rgba(0,0,0,0.3)');
        R(g, 6, 12, 12, 5, '#3d433a');
        R(g, 8, 10, 8, 3, '#4d5447');
        R(g, 10, 9, 4, 2, '#5d6555');
        P(g, 11, 8, '#d94a3a'); P(g, 12, 9, '#d94a3a');
        R(g, 7, 15, 2, 1, '#8a9184'); R(g, 15, 15, 2, 1, '#8a9184');
        break;
      case 'radar':
        R(g, 9, 12, 2, 8, '#4a5450');
        R(g, 4, 19, 16, 2, '#333b36');
        R(g, 7, 17, 10, 2, '#3d4640');
        R(g, 5, 3, 14, 4, '#5a6660');
        R(g, 5, 3, 14, 1, '#7d8a82');
        R(g, 11, 7, 2, 5, '#46504a');
        R(g, 6, 5, 3, 1, '#8fd4e0');
        P(g, 11, 4, '#d94a3a');
        break;
      case 'ammo':
        R(g, 3, 17, 18, 4, 'rgba(0,0,0,0.28)');
        R(g, 3, 10, 9, 9, '#5c5238');
        R(g, 3, 10, 9, 1, '#7d7050');
        R(g, 12, 12, 9, 7, '#4e5a3e');
        R(g, 12, 12, 9, 1, '#6d7d54');
        R(g, 5, 13, 5, 1, '#8a7d56'); R(g, 14, 15, 5, 1, '#8a7d56');
        R(g, 6, 7, 3, 4, '#c9a24a'); R(g, 11, 8, 3, 3, '#c9a24a');
        R(g, 16, 8, 2, 4, '#8a6a2a');
        break;
      case 'repair':
        R(g, 3, 17, 18, 4, 'rgba(0,0,0,0.28)');
        R(g, 4, 11, 16, 8, '#4a4f42');
        R(g, 4, 11, 16, 1, '#666c58');
        R(g, 7, 4, 3, 8, '#5c6350');
        R(g, 6, 2, 5, 3, '#6d7560');
        R(g, 13, 9, 6, 2, '#3a4036');
        R(g, 9, 14, 4, 1, '#e8f0e0'); R(g, 10, 13, 2, 3, '#e8f0e0');
        R(g, 9, 13, 1, 1, '#d94a3a'); R(g, 12, 13, 1, 1, '#d94a3a');
        break;
      case 'watchtower':
        R(g, 2, 20, 20, 2, '#3a3426');
        R(g, 5, 8, 2, 12, '#6b5d40'); R(g, 17, 8, 2, 12, '#6b5d40');
        R(g, 5, 12, 14, 1, '#574c34');
        R(g, 3, 4, 18, 5, '#5c5038');
        R(g, 3, 4, 18, 1, '#7a6c4c');
        R(g, 4, 8, 16, 1, '#3f3828');
        R(g, 6, 2, 12, 2, '#4a4f3c');
        R(g, 7, 6, 3, 1, '#2c3026'); R(g, 14, 6, 3, 1, '#2c3026');
        break;
      default:
        platform(g, steel, dark, light);
    }
    // guns
    var metal = '#414b45', darkM = '#232a26', lite = '#69766d';
    switch (id) {
      case 'mg_turret':
        R(gg, 0, 4, 12, 3, metal); R(gg, 12, 4, 10, 2, '#2b3230');
        R(gg, 2, 2, 5, 2, '#3a443e'); R(gg, 18, 3, 2, 1, lite);
        break;
      case 'sniper_tower':
        R(gg, 1, 4, 8, 3, '#4a5a3e'); R(gg, 9, 5, 14, 1, '#26302a');
        R(gg, 3, 2, 5, 2, '#37432f'); R(gg, 6, 2, 2, 1, '#8fd4e0');
        break;
      case 'heavy_cannon':
        R(gg, 0, 2, 10, 6, '#39423d'); R(gg, 8, 3, 14, 4, '#4a544d');
        R(gg, 8, 3, 14, 1, '#6d7a71'); R(gg, 20, 3, 3, 4, '#2c3430');
        break;
      case 'missile':
        R(gg, 0, 1, 10, 8, '#4b4a35'); R(gg, 9, 1, 12, 2, '#6b6a4a');
        R(gg, 9, 4, 12, 2, '#6b6a4a'); R(gg, 9, 7, 12, 2, '#6b6a4a');
        P(gg, 20, 2, '#e0a03c'); P(gg, 20, 5, '#e0a03c'); P(gg, 20, 8, '#e0a03c');
        break;
      case 'mortar':
        R(gg, 0, 1, 12, 5, '#46503f'); R(gg, 0, 1, 12, 1, '#5d6b52');
        R(gg, 11, 2, 8, 3, '#333b2e'); R(gg, 18, 3, 4, 1, '#20261e');
        break;
      case 'flame_turret':
        R(gg, 0, 2, 10, 5, '#4a3d2e'); R(gg, 9, 3, 8, 3, '#5a4a38');
        R(gg, 16, 2, 4, 4, '#3a3f3a'); R(gg, 19, 3, 2, 2, '#ffb347');
        break;
      case 'tesla':
        R(gg, 0, 3, 8, 4, '#3e4a52'); R(gg, 6, 2, 4, 6, '#5c7078');
        P(gg, 10, 4, '#9ce6ff'); P(gg, 12, 3, '#d4f6ff'); P(gg, 14, 5, '#9ce6ff');
        break;
      case 'laser':
        R(gg, 0, 3, 10, 4, '#3a444a'); R(gg, 9, 2, 6, 6, '#2c363c');
        R(gg, 14, 4, 3, 2, '#3ce0ff'); P(gg, 15, 4, '#e0fdff');
        break;
      case 'sentry':
        R(gg, 0, 3, 9, 3, '#4a564c'); R(gg, 8, 4, 9, 1, '#26302a');
        R(gg, 1, 1, 4, 2, '#39423c'); P(gg, 16, 4, '#ff9a4a');
        break;
      case 'watchtower':
        R(gg, 0, 4, 8, 2, '#3f4636'); R(gg, 8, 4, 8, 1, '#2b3128');
        P(gg, 15, 4, '#ffd479');
        break;
      case 'barricade': case 'wall': case 'mine': case 'radar': case 'ammo': case 'repair':
        gunC.c.width = 1; gunC.c.height = 1; // no gun
        break;
      default:
        R(gg, 0, 4, 10, 3, metal);
    }
    return { base: c.c, gun: gunC.c };
  }

  /* =========================================================
     ZOMBIES
     ========================================================= */
  function zombieBody(g, look, frame, size) {
    var s = size || 1;
    var bob = frame % 2 === 1 ? 1 : 0;
    var lean = look.lean ? 1 : 0;
    var skin = look.skin, skin2 = look.skin2 || U.shade(look.skin, -0.08);
    var cloth = look.cloth, cloth2 = look.cloth2 || U.shade(look.cloth, -0.1);
    var cx = 12;
    var top = look.crawler ? 12 : 6;
    // shadow
    R(g, 6, 21, 12, 2, 'rgba(0,0,0,0.28)');
    if (look.crawler) {
      // crawling body
      R(g, 5, 17, 11, 4, cloth);
      R(g, 5, 17, 11, 1, cloth2);
      R(g, 3, 18, 3, 3, skin);      // head
      P(g, 3, 19, '#ffe27a'); P(g, 4, 19, '#ff6a3a');
      R(g, 13, 19, 6, 2, skin);     // dragging arm
      R(g, 8, 20, 2, 1, skin);
      R(g, 4, 21, 2, 1, '#2a1f1c');
      return;
    }
    // legs
    R(g, cx - 3, 16 + bob, 3, 4, cloth2);
    R(g, cx + 1, 16 + bob, 3, 4, cloth);
    R(g, cx - 4, 20 + bob, 3, 2, look.shoe || '#2a2520');
    R(g, cx + 2, 20 + bob, 3, 2, look.shoe || '#2a2520');
    // torso
    R(g, cx - 4, 10 + bob, 9, 7, cloth);
    R(g, cx - 4, 10 + bob, 9, 1, cloth2);
    R(g, cx - 4 + 2, 13 + bob, 5, 1, cloth2);
    R(g, cx - 4, 15 + bob, 3, 2, U.shade(look.cloth, 0.06)); // torn patch
    // exposed ribs
    if (look.ribs) { R(g, cx + 1, 12 + bob, 4, 3, skin); R(g, cx + 1, 13 + bob, 4, 1, '#c9c2a8'); }
    // arms reaching forward
    R(g, cx + 4, 11 + bob + lean, 6, 2, skin);
    R(g, cx + 9, 11 + bob + lean, 2, 2, skin2);
    R(g, cx - 3, 12 + bob, 2, 5, skin2);
    R(g, cx - 3, 16 + bob, 2, 2, skin);
    // head
    R(g, cx - 2, top + bob, 6, 5, skin);
    R(g, cx - 2, top + bob, 6, 1, skin2);
    P(g, cx + 2, top + 2 + bob, '#1a1410');
    P(g, cx + 3, top + 2 + bob, (look.eyes && look.eyes[0]) || '#ff5a3a');
    P(g, cx + 1, top + 3 + bob, '#1a1410');
    // jaw / mouth
    R(g, cx + 1, top + 5 + bob, 3, 1, '#2a1414');
    if (look.jaw) { R(g, cx + 1, top + 6 + bob, 4, 2, '#5a2a28'); R(g, cx + 1, top + 6 + bob, 1, 2, '#e0d8c0'); }
    // hair patch
    if (look.hair) { R(g, cx - 2, top + bob, 5, 1, look.hair); P(g, cx - 2, top + 1 + bob, look.hair); }

    /* ---- features ---- */
    if (look.armor) {
      R(g, cx - 4, 11 + bob, 9, 4, look.armor);
      R(g, cx - 4, 11 + bob, 9, 1, U.shade(look.armor, 0.15));
      R(g, cx - 4, 14 + bob, 9, 1, U.shade(look.armor, -0.14));
      R(g, cx - 5, 9 + bob, 2, 4, look.armor);
      R(g, cx + 5, 9 + bob, 2, 4, look.armor);
    }
    if (look.spikes) {
      for (var i = 0; i < 3; i++) { P(g, cx - 3 + i * 3, 9 + bob, look.spikes); P(g, cx - 3 + i * 3, 8 + bob, look.spikes); }
      P(g, cx + 6, 10 + bob, look.spikes);
    }
    if (look.shield) {
      R(g, cx + 8, 7 + bob, 4, 12, look.shield);
      R(g, cx + 8, 7 + bob, 4, 1, U.shade(look.shield, 0.2));
      R(g, cx + 9, 10 + bob, 2, 2, '#3a2a20');
      R(g, cx + 11, 9 + bob, 1, 8, U.shade(look.shield, -0.2));
    }
    if (look.fat) {
      R(g, cx - 6, 12 + bob, 4, 4, skin2);
      R(g, cx + 5, 13 + bob, 4, 3, skin2);
    }
    if (look.glow) {
      R(g, cx - 2, 11 + bob, 2, 2, look.glow);
      R(g, cx + 3, 13 + bob, 2, 1, look.glow);
      P(g, cx + 4, 10 + bob, look.glow);
    }
    if (look.helmet) {
      R(g, cx - 3, top - 1 + bob, 7, 2, look.helmet);
      R(g, cx - 3, top - 1 + bob, 7, 1, U.shade(look.helmet, 0.15));
      R(g, cx - 3, top + 1 + bob, 1, 1, look.helmet);
    }
    if (look.tentacles) {
      for (var t = 0; t < 3; t++) {
        var tx = cx - 4 + t * 4;
        R(g, tx, 9 + bob, 1, 3, skin2);
        P(g, tx + (t % 2 ? 1 : -1), 8 + bob, look.glow || skin2);
      }
    }
    if (look.crystals) {
      P(g, cx - 3, 8 + bob, look.crystals); P(g, cx, 7 + bob, look.crystals); P(g, cx + 4, 9 + bob, look.crystals);
      P(g, cx + 1, 6 + bob, '#cdf6ff');
    }
    if (look.horns) {
      P(g, cx - 3, top - 2 + bob, look.horns); P(g, cx - 4, top - 3 + bob, look.horns);
      P(g, cx + 3, top - 2 + bob, look.horns); P(g, cx + 4, top - 3 + bob, look.horns);
    }
    if (look.crown) {
      R(g, cx - 3, top - 3 + bob, 7, 2, '#d9b44a');
      P(g, cx - 3, top - 4 + bob, '#ffd97a'); P(g, cx, top - 4 + bob, '#ffd97a'); P(g, cx + 3, top - 4 + bob, '#ffd97a');
    }
  }

  /* =========================================================
     BOSSES — bigger canvas, scaled up at render time
     ========================================================= */
  var BOSS_LOOKS = [
    { skin: '#8a9a5a', cloth: '#4a4232', armor: '#5a5a44', horns: '#d8cba0', eyes: ['#ffe066'], fat: true, glow: '#b8d04a' },
    { skin: '#b06a4a', cloth: '#5a2a20', armor: '#7a4a3a', horns: '#e0c090', eyes: ['#ff7a3a'], spikes: '#d8d0c0', ribs: true },
    { skin: '#6a9a7a', cloth: '#2f4a3a', glow: '#7affb0', eyes: ['#9affc0'], tentacles: true, fat: true },
    { skin: '#9a8a7a', cloth: '#2e3a2a', helmet: '#5a6a4a', armor: '#4a5a3a', eyes: ['#ff4a3a'], crown: true },
    { skin: '#7a6a8a', cloth: '#3a2a4a', glow: '#c27aff', eyes: ['#e0a0ff'], spikes: '#c0a0e0', tentacles: true },
    { skin: '#a0b05a', cloth: '#3a4a2a', glow: '#e6ff6a', eyes: ['#e6ff6a'], crown: true, fat: true, tentacles: true },
    { skin: '#8a3a2a', cloth: '#2a1414', glow: '#ff5a2a', eyes: ['#ffd23a'], horns: '#2a1a14', spikes: '#3a2018', ribs: true, fat: true }
  ];

  function makeBoss(idx, frame) {
    var look = BOSS_LOOKS[idx % BOSS_LOOKS.length];
    var c = cv(34, 34), g = c.g;
    // scale the zombie body drawing by 1.4 by manual coordinates
    g.save();
    g.translate(-4, -3);
    g.scale(1.45, 1.45);
    zombieBody(g, look, frame, 1.2);
    g.restore();
    // extra bulk details
    R(g, 24, 8, 3, 3, look.glow || '#ff8a5a');
    R(g, 7, 4, 4, 2, look.armor || '#5a5a44');
    if (idx === 5 || idx === 2) {
      R(g, 3, 12, 3, 3, look.glow || '#b0ff7a');
      R(g, 29, 14, 3, 3, look.glow || '#b0ff7a');
    }
    return c.c;
  }

  /* =========================================================
     SCENERY / DECOR
     ========================================================= */
  function makeDecor(name, pal, seed) {
    var rnd = U.mulberry(seed || 1);
    var size = 32;
    var c = cv(size, size), g = c.g;
    var i, x, y;
    switch (name) {
      case 'sandbag':
        for (var row = 0; row < 3; row++) for (i = 0; i < 3; i++) {
          x = 6 + i * 8 + (row % 2 ? 4 : 0); y = 14 + row * 5;
          R(g, x, y, 8, 5, pal.sandbag || '#7a6a45');
          R(g, x, y, 8, 1, pal.sandbagHi || '#96845a');
          R(g, x, y + 4, 8, 1, pal.sandbagLo || '#5c4f33');
        }
        break;
      case 'barrel':
        R(g, 9, 11, 14, 16, pal.barrel || '#4a5a3e');
        R(g, 9, 11, 14, 2, U.shade(pal.barrel || '#4a5a3e', 0.14));
        R(g, 9, 11, 2, 16, U.shade(pal.barrel || '#4a5a3e', 0.08));
        R(g, 10, 15, 12, 1, '#2a3028');
        R(g, 10, 21, 12, 1, '#2a3028');
        R(g, 13, 8, 6, 3, '#333b30');
        break;
      case 'barrel_fire':
        R(g, 9, 13, 14, 14, '#3a2a20');
        R(g, 9, 13, 14, 2, '#5a4432');
        R(g, 10, 16, 12, 1, '#241a14');
        R(g, 11, 5, 3, 5, '#ff7a2a'); R(g, 14, 3, 3, 7, '#ffb347'); P(g, 12, 6, '#ffe08a');
        break;
      case 'car':
        R(g, 3, 13, 26, 11, pal.car || '#5a4a3a');
        R(g, 6, 8, 20, 7, pal.car || '#5a4a3a');
        R(g, 7, 9, 8, 5, '#2a3438'); R(g, 17, 9, 8, 5, '#2a3438');
        R(g, 7, 9, 8, 1, '#4a5a60'); R(g, 17, 9, 8, 1, '#4a5a60');
        R(g, 3, 22, 5, 4, '#1c1c1a'); R(g, 24, 22, 5, 4, '#1c1c1a');
        R(g, 3, 17, 26, 1, '#3a3028');
        P(g, 27, 15, '#d9c47a');
        break;
      case 'wreck':
        R(g, 2, 15, 28, 9, pal.car || '#4a3a30');
        R(g, 8, 10, 14, 6, pal.car || '#4a3a30');
        R(g, 9, 11, 5, 4, '#1e2622'); R(g, 16, 11, 5, 4, '#1e2622');
        R(g, 4, 24, 6, 3, '#1a1a18'); R(g, 22, 24, 6, 3, '#1a1a18');
        R(g, 2, 15, 28, 2, '#ff7a2a');
        P(g, 9, 14, '#ffd479'); P(g, 20, 17, '#ff9a4a');
        break;
      case 'tree':
        R(g, 14, 18, 4, 12, '#4a3626');
        R(g, 14, 18, 1, 12, '#5c4531');
        R(g, 9, 4, 14, 12, pal.tree || '#3d5a2e');
        R(g, 5, 9, 22, 8, pal.tree || '#3d5a2e');
        R(g, 11, 2, 10, 5, U.shade(pal.tree || '#3d5a2e', 0.1));
        R(g, 9, 4, 5, 4, pal.treeHi || '#547a3c');
        R(g, 20, 12, 5, 3, U.shade(pal.tree || '#3d5a2e', -0.12));
        break;
      case 'pine':
        for (i = 0; i < 3; i++) {
          R(g, 16 - 6 + i * 2, 6 + i * 6, 12 - i * 4, 6, pal.tree || '#2f4a30');
          R(g, 16 - 6 + i * 2, 6 + i * 6, 12 - i * 4, 1, pal.treeHi || '#41643c');
        }
        R(g, 14, 22, 4, 8, '#4a3626');
        break;
      case 'bush':
        R(g, 8, 16, 16, 8, pal.tree || '#3d5a2e');
        R(g, 6, 18, 20, 5, pal.tree || '#3d5a2e');
        R(g, 10, 14, 10, 5, pal.treeHi || '#4d7038');
        P(g, 12, 18, '#7a9a4a'); P(g, 18, 20, '#7a9a4a');
        break;
      case 'rock':
        R(g, 8, 16, 16, 8, '#5a5a54');
        R(g, 10, 12, 12, 6, '#6a6a62');
        R(g, 10, 12, 6, 2, '#7d7d72');
        R(g, 8, 22, 16, 2, '#3a3a36');
        break;
      case 'crate':
        R(g, 7, 11, 18, 16, '#6b5638');
        R(g, 7, 11, 18, 2, '#87704a');
        R(g, 7, 11, 2, 16, '#57452c');
        R(g, 7, 19, 18, 2, '#57452c');
        R(g, 9, 13, 14, 1, '#8a7350');
        P(g, 10, 15, '#3a2e1e'); P(g, 21, 22, '#3a2e1e');
        break;
      case 'tent':
        R(g, 3, 16, 26, 10, pal.tent || '#6b6a4a');
        R(g, 3, 16, 26, 2, U.shade(pal.tent || '#6b6a4a', 0.12));
        R(g, 6, 8, 20, 9, pal.tent || '#6b6a4a');
        R(g, 6, 8, 20, 2, U.shade(pal.tent || '#6b6a4a', 0.16));
        R(g, 14, 12, 6, 14, '#2a2a20');
        R(g, 14, 18, 5, 8, '#2a2a20');
        R(g, 16, 20, 1, 6, '#4a4a38');
        break;
      case 'ruin':
        R(g, 2, 6, 28, 22, pal.wall || '#4a4a42');
        R(g, 2, 6, 28, 2, U.shade(pal.wall || '#4a4a42', 0.15));
        R(g, 5, 10, 6, 8, '#1a1e1a'); R(g, 17, 12, 7, 6, '#1a1e1a');
        R(g, 20, 6, 10, 8, 'rgba(0,0,0,0)');
        g.clearRect(0, 0, 0, 0);
        R(g, 6, 14, 8, 10, pal.wall || '#4a4a42');
        R(g, 8, 6, 3, 4, U.shade(pal.wall || '#4a4a42', -0.1));
        break;
      case 'building':
        R(g, 1, 2, 30, 26, pal.building || '#3f4640');
        R(g, 1, 2, 30, 2, U.shade(pal.building || '#3f4640', 0.12));
        for (y = 6; y < 24; y += 5) for (x = 4; x < 28; x += 6) {
          R(g, x, y, 4, 3, (x + y) % 9 === 0 ? '#ffcc66' : '#1c2422');
        }
        R(g, 12, 20, 8, 8, '#1a1f1a');
        break;
      case 'tower_broken':
        R(g, 4, 2, 24, 26, '#4a4a44');
        R(g, 4, 2, 24, 2, '#6a6a60');
        R(g, 6, 5, 20, 3, '#2a2e2a');
        for (y = 10; y < 26; y += 5) for (x = 6; x < 26; x += 5) R(g, x, y, 3, 3, '#2a2e2a');
        R(g, 18, 0, 10, 10, 'rgba(0,0,0,0)');
        R(g, 20, 4, 3, 2, '#e0a03c');
        break;
      case 'lamp':
        R(g, 15, 8, 2, 18, '#3a3a36');
        R(g, 12, 24, 8, 2, '#2a2a26');
        R(g, 11, 4, 10, 4, '#4a4a42');
        R(g, 13, 6, 6, 2, '#ffe6a0');
        P(g, 15, 8, 'rgba(255,220,150,0.35)');
        break;
      case 'bunker':
        R(g, 1, 10, 30, 18, '#4a4f44');
        R(g, 1, 10, 30, 2, '#636a58');
        R(g, 9, 6, 14, 6, '#565c4c');
        R(g, 12, 15, 9, 4, '#1c221e');
        R(g, 13, 16, 7, 2, '#0e1210');
        R(g, 3, 26, 26, 2, '#333a30');
        break;
      case 'crystal':
        R(g, 12, 8, 8, 16, pal.crystal || '#8ad8e0');
        R(g, 14, 4, 4, 8, pal.crystal || '#8ad8e0');
        R(g, 14, 4, 2, 8, '#c8f6ff');
        R(g, 8, 14, 5, 10, U.shade(pal.crystal || '#8ad8e0', -0.1));
        R(g, 12, 8, 2, 16, '#d8fbff');
        break;
      case 'snowman':
        R(g, 11, 16, 12, 10, '#d8e4e6');
        R(g, 12, 9, 10, 8, '#e4eef0');
        R(g, 14, 5, 6, 5, '#eef6f8');
        P(g, 15, 7, '#20282a'); P(g, 18, 7, '#20282a');
        P(g, 17, 9, '#e0a03c');
        R(g, 12, 4, 10, 1, '#3a4a50');
        break;
      case 'bones':
        R(g, 10, 22, 12, 2, '#cfc6a8');
        R(g, 14, 18, 2, 5, '#cfc6a8');
        R(g, 8, 20, 3, 2, '#bdb494');
        P(g, 20, 23, '#cfc6a8'); P(g, 22, 21, '#cfc6a8');
        break;
      case 'trash':
        R(g, 8, 18, 16, 8, '#4a4a42');
        R(g, 10, 14, 12, 5, '#565650');
        R(g, 12, 12, 8, 3, '#3a3a34');
        P(g, 14, 16, '#7a7a70');
        break;
      case 'pipe':
        R(g, 2, 20, 28, 6, '#4a5048');
        R(g, 2, 20, 28, 2, '#6a7268');
        R(g, 2, 24, 28, 2, '#333a34');
        R(g, 10, 16, 4, 10, '#565e54');
        R(g, 20, 16, 4, 10, '#565e54');
        break;
      case 'crane':
        R(g, 2, 24, 12, 4, '#3a3a32');
        R(g, 4, 6, 4, 20, '#5a5a4a');
        R(g, 4, 6, 24, 3, '#5a5a4a');
        R(g, 24, 9, 2, 10, '#4a4a3a');
        R(g, 22, 18, 6, 2, '#3a3a32');
        break;
      case 'tank':
        R(g, 2, 20, 28, 6, '#3a3f34');
        for (i = 0; i < 5; i++) R(g, 4 + i * 5, 21, 3, 4, '#2a2e26');
        R(g, 6, 14, 20, 7, '#4a5340');
        R(g, 8, 10, 10, 5, '#545e46');
        R(g, 16, 12, 12, 2, '#3a4232');
        P(g, 26, 13, '#2a3026');
        break;
      case 'flag':
        R(g, 15, 6, 2, 22, '#4a4a40');
        R(g, 17, 6, 9, 6, '#8a2f28');
        R(g, 17, 6, 9, 1, '#b04038');
        R(g, 19, 8, 5, 1, '#e0c090');
        break;
      case 'watchfire':
        R(g, 8, 20, 16, 6, '#4a4a42');
        R(g, 10, 14, 12, 7, '#333a32');
        R(g, 12, 4, 4, 10, '#ff7a2a'); R(g, 16, 2, 3, 12, '#ffb347');
        P(g, 13, 7, '#ffe08a'); P(g, 17, 8, '#ffe08a');
        break;
      default:
        R(g, 8, 16, 16, 10, '#4a4a42');
    }
    return c.c;
  }

  /* =========================================================
     PUBLIC CACHE API
     ========================================================= */
  var Sprites = ZF.Sprites = {
    infantry: {},
    structure: {},
    zombie: {},
    boss: {},
    decor: {},
    get: function (unit) {
      if (!unit) return null;
      if (unit.cat === 'infantry') {
        if (!Sprites.infantry[unit.id]) Sprites.infantry[unit.id] = makeInfantry(unit.id);
        return Sprites.infantry[unit.id];
      }
      if (!Sprites.structure[unit.id]) Sprites.structure[unit.id] = makeStructure(unit.id);
      return Sprites.structure[unit.id];
    },
    zombieSprites: function (def) {
      var k = def.id;
      if (!Sprites.zombie[k]) {
        var frames = [];
        for (var f = 0; f < 2; f++) {
          var c = cv(24, 24);
          zombieBody(c.g, def.look || {}, f, 1);
          frames.push(c.c);
        }
        Sprites.zombie[k] = frames;
      }
      return Sprites.zombie[k];
    },
    bossSprite: function (stage, frame) {
      var k = (stage % 7) + '_' + frame;
      if (!Sprites.boss[k]) Sprites.boss[k] = makeBoss(stage, frame);
      return Sprites.boss[k];
    },
    decorSprite: function (name, pal, seed) {
      var key = name + '_' + (seed || 0);
      if (!Sprites.decor[key]) Sprites.decor[key] = makeDecor(name, pal || {}, seed);
      return Sprites.decor[key];
    },
    makeInfantry: makeInfantry,
    makeStructure: makeStructure,
    makeDecor: makeDecor,
    drawIcon: function (ctx, unit, w, h) {
      var sp = Sprites.get(unit);
      if (!sp) return;
      w = w || 32; h = h || 32;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, w, h);
      var s = sp.base || sp.frames[0];
      var sc = Math.min(w / 24, h / 24);
      var dw = Math.round(24 * sc), dh = Math.round(24 * sc);
      ctx.drawImage(s, Math.round((w - dw) / 2), Math.round((h - dh) / 2), dw, dh);
      return sp;
    }
  };
})(window.ZF);
