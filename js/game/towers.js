/* ============================================================
   TOWERS — placement, stats, targeting, firing, support, traps
   ============================================================ */
(function (ZF) {
  'use strict';
  var U = ZF.Util, TILE = 16;

  var FIRE_SOUND = {
    rifleman: 'shoot_rifle', assault: 'shoot_smg', heavy: 'shoot_rifle', sniper: 'shoot_sniper',
    shotgun: 'shoot_shotgun', flamer: 'flame', rocket: 'shoot_rocket', grenadier: 'shoot_mortar',
    minigun: 'shoot_minigun', mg_turret: 'shoot_rifle', sniper_tower: 'shoot_sniper',
    heavy_cannon: 'shoot_cannon', missile: 'shoot_rocket', mortar: 'shoot_mortar',
    flame_turret: 'flame', tesla: 'tesla', laser: 'laser', sentry: 'shoot_smg'
  };

  function Tower(def, tx, ty) {
    this.id = U.uid('t');
    this.def = def;
    this.tx = tx; this.ty = ty;
    this.x = tx * TILE + TILE / 2;
    this.y = ty * TILE + TILE / 2;
    this.level = 0;
    this.invested = def.cost;
    this.cd = 0;
    this.angle = -Math.PI / 2;
    this.target = null;
    this.targetId = null;
    this.spin = 0;
    this.recoil = 0;
    this.flash = 0;
    this.kills = 0;
    this.damageDone = 0;
    this.support = !!def.support;
    this.isTrap = !!def.trap;
    this.armed = !this.isTrap;
    this.armTimer = .7;
    this.chillMul = 1;
    this.thornsCd = 0;
    this.repairPulse = 0;
    this.hpMax = def.base.hp;
    this.hp = this.hpMax;
    this.s = null;
    this.buffs = { dmg: 0, rate: 0, range: 0, repair: 0, income: 0, reveal: false };
    this.fireSound = FIRE_SOUND[def.id] || 'shoot_rifle';
    this.muzzle = def.cat === 'infantry' ? 13 : 16;
    this.alive = true;
  }

  Tower.prototype.statsFor = function (game) {
    var d = this.def, b = d.base;
    var s = {
      dmg: b.dmg, rate: b.rate, range: b.range, splash: b.splash, pen: b.pen,
      crit: b.crit, hits: b.hits, burn: b.burn, chain: b.chain, chainFall: b.chainFall,
      thorns: b.thorns, taunt: b.taunt, armor: b.armor,
      hpMax: b.hp, auraR: 0, auraDmg: 0, auraRate: 0, auraRange: 0, auraRepair: 0, income: 0,
      exec: 0, stun: d.stun || 0, slow: 0, reveal: false
    };
    for (var i = 0; i < this.level; i++) {
      var u = d.ups[i];
      if (!u) break;
      s.dmg *= u.d; s.rate *= u.r; s.range += u.g;
      if (u.s) s.splash += u.s;
      if (u.p) s.pen += u.p;
      if (u.cr) s.crit += u.cr;
      if (u.hits) s.hits += u.hits;
      if (u.burn) s.burn += u.burn;
      if (u.chain) s.chain += u.chain;
      if (u.chainFall) s.chainFall = Math.min(.95, s.chainFall + u.chainFall);
      if (u.thorns) s.thorns += u.thorns;
      if (u.taunt) s.taunt += u.taunt;
      if (u.hp) s.hpMax += u.hp;
      if (u.armor) s.armor += u.armor;
      if (u.slow) s.slow += u.slow;
      if (u.exec) s.exec += u.exec;
      if (u.stun) s.stun += u.stun;
    }
    // support aura upgrades
    if (d.aura) {
      s.auraR = d.aura.radius;
      s.auraDmg = d.aura.dmg || 0;
      s.auraRate = d.aura.rate || 0;
      s.auraRange = d.aura.range || 0;
      s.auraRepair = d.aura.repair || 0;
      s.income = d.aura.income || 0;
      for (var ai = 0; ai < this.level; ai++) {
        var au = d.ups[ai];
        if (!au) break;
        s.auraR += au.auraR || 0;
        s.auraDmg += au.auraDmg || 0;
        s.auraRate += au.auraRate || 0;
        s.auraRange += au.auraRange || 0;
        s.auraRepair += au.repair || 0;
        s.income += au.income || 0;
      }
      s.reveal = !!d.aura.reveal;
    }
    // research + map modifiers
    if (game) {
      var rf = game.researchFx || {};
      s.dmg *= 1 + (rf.dmg || 0);
      s.rate *= 1 + (rf.rate || 0);
      s.range *= 1 + (rf.range || 0);
      s.crit += rf.crit || 0;
      if (this.def.cat !== 'infantry' && rf.structHp) s.hpMax *= 1 + rf.structHp;
      var md = game.mapMods || {};
      if (md.towerRange) s.range *= md.towerRange;
      if (md.towerRate) s.rate *= md.towerRate;
      var ch = game.challengeFx || {};
      if (ch.towerRate) s.rate *= ch.towerRate;
      if (ch.towerDmg) s.dmg *= ch.towerDmg;
    }
    // aura buffs
    var au = this.buffs;
    s.dmg *= 1 + (au.dmg || 0);
    s.rate *= 1 + (au.rate || 0);
    s.range *= 1 + (au.range || 0);
    s.repair = au.repair || 0;
    s.incomeBuff = au.income || 0;
    s.critDmg = 2 + (game && game.researchFx ? game.researchFx.critDmg || 0 : 0);
    this.hpMax = Math.round(s.hpMax);
    if (this.hp > this.hpMax) this.hp = this.hpMax;
    return s;
  };

  Tower.prototype.recalc = function (game) {
    var prior = this.hpMax;
    this.s = this.statsFor(game);
    if (this.hpMax > prior) this.hp += this.hpMax - prior;
    return this.s;
  };

  Tower.prototype.upgradeCost = function () {
    if (this.level >= 3) return 0;
    var base = this.def.ups[this.level].c;
    var mul = 1;
    if (this.def.cat === 'infantry') mul = 1;
    return Math.round(base);
  };

  Tower.prototype.sellValue = function () {
    return Math.round(this.invested * 0.65);
  };

  Tower.prototype.canUpgrade = function () { return this.level < 3; };

  Tower.prototype.applyUpgrade = function (game) {
    if (this.level >= 3) return false;
    this.level++;
    this.invested += this.upgradeCostBefore();
    return true;
  };
  Tower.prototype.upgradeCostBefore = function () {
    var lvl = this.level - 1;
    if (lvl < 0) return 0;
    return this.def.ups[lvl] ? this.def.ups[lvl].c : 0;
  };

  Tower.prototype.takeDamage = function (amt, game, src) {
    if (!this.alive) return;
    var armor = (this.s && this.s.armor) || 0;
    var dmg = Math.max(1, amt * (1 - Math.min(.6, armor * .035)));
    this.hp -= dmg;
    this.hitFlash = .15;
    ZF.FX.burst(this.x, this.y - 6, 3, ['#8a8a7a', '#5a5a4a'], { spdMax: 50, lifeMax: .35, sizeMax: 2 });
    if (this.hp <= 0) {
      this.alive = false;
      game.onTowerDestroyed(this, src);
    }
  };

  Tower.prototype.repair = function (amt) {
    if (this.hp < this.hpMax) this.hp = Math.min(this.hpMax, this.hp + amt);
  };

  Tower.prototype.rateNow = function () {
    var s = this.s;
    if (!s) return 0;
    var r = s.rate;
    if (this.def.spinup) r *= 0.35 + 0.65 * this.spin;
    r *= this.chillMul;
    if (this.slowUntil && this.slowUntil > 0) r *= .7;
    return r;
  };

  Tower.prototype.findTarget = function (game) {
    var s = this.s, list = game.enemies;
    var best = null, bestScore = -Infinity;
    var range2 = s.range * s.range;
    var min2 = (this.def.minRange || 0) * (this.def.minRange || 0);
    var mode = this.def.targetMode || 'first';
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (!e.alive) continue;
      if (e.stealth && !game.reveal && U.dist2(e.x, e.y, this.x, this.y) > 55 * 55) continue;
      var d2 = U.dist2(e.x, e.y, this.x, this.y);
      if (d2 > range2) continue;
      if (min2 && d2 < min2) continue;
      var score;
      switch (mode) {
        case 'strong': score = e.hp + (e.boss ? 9999 : 0); break;
        case 'close': score = -d2; break;
        case 'last': score = -e.d; break;
        default: score = e.d + (e.boss ? 0 : 0);
      }
      if (e.hp <= 0) continue;
      if (score > bestScore) { bestScore = score; best = e; }
    }
    return best;
  };

  Tower.prototype.update = function (dt, game) {
    if (!this.alive) return;
    this.flash = Math.max(0, this.flash - dt);
    this.hitFlash = Math.max(0, (this.hitFlash || 0) - dt);
    this.recoil = Math.max(0, this.recoil - dt * 6);
    if (this.chillMul < 1) this.chillMul = Math.min(1, this.chillMul + dt * 0.25);
    if (!this.armed) {
      this.armTimer -= dt;
      if (this.armTimer <= 0) this.armed = true;
    }
    var s = this.s;
    if (!s) return;

    if (this.isTrap) { this.updateTrap(dt, game); return; }

    if (this.support) {
      this.repairPulse += dt;
      if (this.repairPulse >= .5) {
        this.repairPulse = 0;
        var rad = s.auraR || s.range;
        if (s.repair > 0) {
          for (var i = 0; i < game.towers.length; i++) {
            var t = game.towers[i];
            if (t === this || !t.alive) continue;
            if (U.dist2(t.x, t.y, this.x, this.y) <= rad * rad) {
              t.repair(s.repair * .5);
              if (t.hp < t.hpMax && Math.random() < .5) {
                ZF.FX.particle(t.x + U.rand(-5, 5), t.y + U.rand(-6, 2), 0, -12, .5, 1, '#8de05a');
              }
            }
          }
          if (this.hp < this.hpMax) this.repair(s.repair * .5);
        }
      }
      return;
    }

    var tgt = this.findTarget(game);
    this.target = tgt;
    this.targetId = tgt ? tgt.id : null;

    if (this.def.spinup) {
      if (tgt) this.spin = Math.min(1, this.spin + dt * 1.1);
      else this.spin = Math.max(0, this.spin - dt * 1.8);
    }

    if (tgt) {
      var want = Math.atan2(tgt.y - this.y, tgt.x - this.x);
      var diff = Math.atan2(Math.sin(want - this.angle), Math.cos(want - this.angle));
      var turn = (this.def.cat === 'infantry' ? 14 : 9) * dt;
      this.angle += U.clamp(diff, -turn, turn);
      if (Math.abs(diff) < 0.55 || this.def.proj === 'flame') {
        if (this.cd <= 0) this.fire(game, tgt);
      }
    }
    this.cd -= dt * this.rateNow();
    if (this.cd < -1) this.cd = -0.01;
  };

  Tower.prototype.updateTrap = function (dt, game) {
    if (!this.armed) return;
    var trigger = this.def.range || 16;
    for (var i = 0; i < game.enemies.length; i++) {
      var e = game.enemies[i];
      if (!e.alive || e.flying) continue;
      if (U.dist2(e.x, e.y, this.x, this.y) <= trigger * trigger) {
        this.detonate(game, e);
        return;
      }
    }
  };

  Tower.prototype.detonate = function (game, e) {
    var s = this.s;
    game.explosion(this.x, this.y, s.splash, s.dmg, {
      pen: s.pen, source: this, color: '#ffb347', big: true, burn: s.burn, stun: s.stun
    });
    ZF.FX.decal(this.x - 4, this.y, 'rgba(20,14,10,0.55)', 12);
    this.alive = false;
    game.onTowerDestroyed(this, null, true);
  };

  Tower.prototype.fire = function (game, tgt) {
    var s = this.s;
    this.cd = 1;
    this.recoil = 1;
    this.flash = .07;
    var ang = this.angle;
    var mx = this.x + Math.cos(ang) * this.muzzle;
    var my = this.y + Math.sin(ang) * this.muzzle - 3;
    var crit = Math.random() < s.crit;
    var dmg = s.dmg * (crit ? s.critDmg : 1);
    var proj = this.def.proj;

    ZF.Audio.play(this.fireSound);
    if (proj !== 'beam' && proj !== 'tesla') {
      ZF.FX.muzzle(mx, my, ang, proj === 'shell' || proj === 'rocket' || proj === 'mortar');
    }

    if (proj === 'beam') {
      game.fireBeam(this, tgt, dmg, crit);
    } else if (proj === 'tesla') {
      game.fireTesla(this, tgt, dmg, crit);
    } else if (proj === 'flame') {
      game.fireFlame(this, dmg, crit);
    } else {
      var hits = s.hits || 1;
      for (var i = 0; i < hits; i++) {
        var spread = this.def.spread || (hits > 1 ? .2 : 0);
        var a = ang + (hits > 1 ? U.rand(-spread, spread) : 0);
        game.addProjectile({
          x: mx, y: my, angle: a, speed: this.def.speed || 500,
          dmg: dmg, crit: crit, pen: s.pen, splash: s.splash,
          type: proj, owner: this, target: tgt, homing: !!this.def.homing,
          arc: !!this.def.arc, burn: s.burn, slow: s.slow, exec: s.exec,
          hits: 1, radius: 2, life: 2.2
        });
      }
    }
  };

  ZF.Tower = Tower;
  ZF.Towers = {
    create: function (def, tx, ty) { return new Tower(def, tx, ty); },
    FIRE_SOUND: FIRE_SOUND
  };
})(window.ZF);
