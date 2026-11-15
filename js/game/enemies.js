/* ============================================================
   ENEMIES — path movement, statuses, behaviors, bosses
   ============================================================ */
(function (ZF) {
  'use strict';
  var U = ZF.Util;

  function Enemy(def, opts) {
    this.id = U.uid('z');
    this.def = def;
    this.boss = !!opts.boss;
    this.bossData = opts.bossData || null;
    this.wave = opts.wave;
    var sc = opts.scaling || { hp: 1, dmg: 1, speed: 1, armor: 0, reward: 1, scrapMul: 1 };
    this.maxHp = Math.max(4, def.hp * sc.hp);
    this.hp = this.maxHp;
    this.armor = def.armor + (sc.armor || 0);
    this.dmg = def.dmg * sc.dmg;
    this.baseSpeed = def.speed * sc.speed;
    this.speed = this.baseSpeed;
    this.reward = Math.round(def.reward * sc.reward * (opts.incomeMul || 1));
    this.scrap = Math.max(0, Math.round(def.scrap * (sc.scrapMul || 1)));
    this.r = def.r || 7;
    this.scale = def.scale || 1;
    this.d = opts.d || 0;
    this.x = 0; this.y = 0; this.angle = 0;
    this.alive = true;
    this.age = 0;
    this.frame = 0;
    this.hitFlash = 0;
    this.state = 'walk';
    this.attackCd = 0;
    this.targetTower = null;
    this.stealth = !!def.stealth;
    this.revealT = 0;
    this.burn = null; this.slow = 0; this.slowT = 0; this.stun = 0;
    this.buffSpeed = 1; this.buffDmg = 1;
    this.regenCd = 0;
    this.poisonCd = 0;
    this.leapCd = (def.leap ? def.leap.cd : 0);
    this.rangedCd = def.ranged ? def.ranged.cd * .6 : 0;
    this.enraged = false;
    this.summonCd = 6;
    this.abilCd = {};
    this.phase = 1;
    this.deadT = 0;
    this.slowFx = 0;
    if (this.boss) {
      var b = opts.bossData;
      this.maxHp = b.hp;
      this.hp = b.hp;
      this.dmg = b.dmg;
      this.armor = b.armor;
      this.baseSpeed = b.speed;
      this.speed = b.speed;
      this.scale = b.scale;
      this.r = 14;
      this.reward = b.reward.credits;
      this.scrap = b.reward.scrap;
      this.stage = b.stage;
      this.name = b.name;
      this.abilities = b.abilities.slice();
      this.abilities.forEach(function (a, i) { this.abilCd[a] = 4 + i * 3 + U.rand(0, 2); }, this);
      this.bossName = b.name;
    }
    this.moveDist = 0;
  }

  Enemy.prototype.speedNow = function () {
    var s = this.baseSpeed * this.buffSpeed;
    if (this.slowT > 0) s *= (1 - this.slow);
    if (this.enraged) s *= this.def.enrage.speed;
    return s;
  };

  Enemy.prototype.damage = function (amount, game, opt) {
    if (!this.alive) return 0;
    opt = opt || {};
    var effArmor = Math.max(0, this.armor - (opt.pen || 0));
    var mul = 1 - Math.min(.65, effArmor * .07);
    var dmg = amount * mul;
    // shielded front reduction
    if (this.def.shield && opt.fromAngle != null) {
      var diff = Math.abs(Math.atan2(Math.sin(this.angle - opt.fromAngle), Math.cos(this.angle - opt.fromAngle)));
      if (diff < 1.1) dmg *= (1 - this.def.shield.front);
    }
    this.hp -= dmg;
    if (game && game.stats) game.stats.damage += dmg;
    this.hitFlash = .12;
    if (opt.showText !== false) ZF.FX.damage(this.x, this.y - this.r - 4, dmg, opt.crit, opt.crit ? '#ffe066' : '#f2f6e8');
    if (this.hp <= 0) { this.die(game, opt); return dmg; }
    if (Math.random() < .6) ZF.FX.blood(this.x, this.y - 6, Math.random() * 6.28, opt.crit ? 5 : 3);
    return dmg;
  };

  Enemy.prototype.applyBurn = function (dps, dur) {
    if (this.def.immBurn) return;
    if (!this.burn || this.burn.dps < dps) this.burn = { dps: dps, t: dur || 3 };
    else this.burn.t = Math.max(this.burn.t, dur || 3);
  };
  Enemy.prototype.applySlow = function (amt, dur) {
    if (amt >= this.slow) { this.slow = Math.min(.75, amt); }
    this.slowT = Math.max(this.slowT, dur || 1.5);
  };
  Enemy.prototype.applyStun = function (dur) {
    if (this.boss) dur *= .4;
    this.stun = Math.max(this.stun, dur);
  };

  Enemy.prototype.die = function (game, opt) {
    if (!this.alive) return;
    this.alive = false;
    this.deadT = 0.001;
    game.onEnemyKilled(this, opt);
  };

  Enemy.prototype.blockerAhead = function (game) {
    var blockers = game.pathBlockers;
    for (var i = 0; i < blockers.length; i++) {
      var t = blockers[i];
      if (!t.alive) continue;
      var gap = t.pathD - this.d;
      if (gap > -6 && gap < 20) return t;
    }
    return null;
  };

  Enemy.prototype.update = function (dt, game) {
    if (!this.alive) { this.deadT += dt; return; }
    this.age += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.slowT = Math.max(0, this.slowT - dt);
    this.frame = Math.floor(this.age * (this.def.speed > 40 ? 7 : 4)) % 2;

    // statuses
    if (this.burn) {
      this.burn.t -= dt;
      this.hp -= this.burn.dps * dt;
      if (Math.random() < dt * 9) ZF.FX.particle(this.x + U.rand(-4, 4), this.y - U.rand(2, 12), U.rand(-8, 8), U.rand(-30, -10), .3, 1, U.pick(['#ffb347', '#ff7a2a']), { add: true });
      if (this.hp <= 0) { this.die(game, { burn: true }); return; }
      if (this.burn.t <= 0) this.burn = null;
    }
    if (this.slowT > 0 && Math.random() < dt * 4) {
      ZF.FX.particle(this.x + U.rand(-4, 4), this.y + 2, 0, -8, .4, 1, '#8fd4e0');
    }
    if (this.def.regen && this.hp < this.maxHp && this.age > 1) {
      this.hp = Math.min(this.maxHp, this.hp + this.def.regen * dt * (1 + (game.wave - 1) * 0.02));
      if (Math.random() < dt * 1.5) ZF.FX.text(this.x + U.rand(-6, 6), this.y - 14, '+' + Math.round(this.def.regen), '#7aff9a', { size: 6, life: .5 });
    }
    if (this.def.enrage && !this.enraged && this.hp / this.maxHp <= this.def.enrage.at) {
      this.enraged = true;
      this.buffSpeed *= 1.15;
      ZF.FX.ring(this.x, this.y, 28, '#ff4a2a', .4);
      ZF.Audio.play('zombie_groan');
    }
    if (this.stealth && !game.reveal) { this.alpha = .42; } else { this.alpha = 1; }

    if (this.stun > 0) {
      this.stun -= dt;
      this.state = 'stunned';
      return;
    }

    // ranged special zombies attack towers
    if (this.def.ranged) {
      this.rangedCd -= dt;
      if (this.rangedCd <= 0) {
        var tw = game.nearestTower(this.x, this.y, this.def.ranged.range + 40);
        if (tw) {
          this.rangedCd = this.def.ranged.cd;
          game.hostileShot(this, tw, this.def.ranged.dmg * (1 + (game.wave - 1) * .04), this.def.ranged);
        }
      }
    }

    // poison trail
    if (this.def.poison) {
      this.poisonCd -= dt;
      if (this.poisonCd <= 0) {
        this.poisonCd = 2.4;
        game.spawnPool(this.x, this.y, this.def.poison);
      }
    }
    // fire trail
    if (this.def.fireTrail) {
      this.poisonCd -= dt;
      if (this.poisonCd <= 0) {
        this.poisonCd = 1.4;
        game.spawnPool(this.x, this.y, { dps: 5, radius: 14, dur: 3, fire: true });
      }
    }
    // leaper
    if (this.def.leap) {
      this.leapCd -= dt;
      if (this.leapCd <= 0 && this.d > 20) {
        this.leapCd = this.def.leap.cd;
        this.d = Math.min(game.path.length + 4, this.d + this.def.leap.dist);
        ZF.FX.burst(this.x, this.y + 4, 6, ['#6b5a3e', '#8a7850'], { spdMax: 45, lifeMax: .4 });
        ZF.FX.text(this.x, this.y - 16, 'LEAP', '#ffb347', { size: 6, life: .5 });
      }
    }

    // path blockers (barricades / walls placed on the road)
    var blocker = this.blockerAhead(game);
    if (blocker) {
      this.state = 'attack';
      this.targetTower = blocker;
      this.attackCd -= dt;
      if (this.attackCd <= 0) {
        this.attackCd = this.boss ? 1.1 : .85;
        blocker.takeDamage(this.dmg * (this.boss ? 3.4 : 2.6) * (game.wave > 1 ? 1 + (game.wave - 1) * .01 : 1), game, this);
        if (this.def.thorns) this.damage(this.def.thorns, game, { showText: false });
        if (blocker.s && blocker.s.thorns > 0) {
          this.damage(blocker.s.thorns, game, { showText: false });
          ZF.FX.burst(this.x, this.y - 4, 2, '#a82a1a', { spdMax: 40 });
        }
        ZF.FX.burst(blocker.x + U.rand(-5, 5), blocker.y, 2, ['#a89a78', '#7a6a50'], { spdMax: 40, lifeMax: .3 });
        if (this.def.explode) { this.explodeNow(game); return; }
      }
      // exploder detonates when it reaches a defense
      return;
    }

    // movement
    this.state = 'walk';
    var sp = this.speedNow() * (game.rageMul || 1);
    var prevD = this.d;
    this.d += sp * dt;
    this.moveDist += sp * dt;

    var pos = game.path.posAt(this.d);
    this.x = pos.x; this.y = pos.y;
    this.angle = pos.angle;
    // slight lane offset for visual variety
    this.y += this.laneOffset || 0;

    if (this.def.explode && game.isTowerNear(this.x, this.y, 18)) {
      this.explodeNow(game);
      return;
    }

    if (this.d >= game.path.length) {
      this.reachBase(game);
    }
  };

  Enemy.prototype.reachBase = function (game) {
    if (!this.alive) return;
    game.baseHit(this.dmg, this);
    if (!this.boss) {
      this.alive = false;
      this.hp = 0;
      this.deadT = 0.001;
      ZF.FX.burst(this.x, this.y, 6, ['#8a1f16', '#5a1410'], { spdMax: 60 });
    } else {
      // boss parks at the base and keeps attacking
      this.state = 'attackBase';
      this.d = game.path.length;
      if (!this.attackCd || this.attackCd <= 0) this.attackCd = 1.2;
    }
  };

  Enemy.prototype.explodeNow = function (game) {
    if (!this.alive) return;
    var ex = this.def.explode || { radius: 34, dmg: 40 };
    game.explosion(this.x, this.y, ex.radius, ex.dmg * (1 + (game.wave - 1) * .09), { enemy: true, big: false });
    this.alive = false;
    this.hp = 0;
    this.deadT = 0.001;
    ZF.Audio.play('explode');
  };

  /* ------------------- BOSS ------------------- */
  Enemy.prototype.updateBoss = function (dt, game) {
    this.frame = Math.floor(this.age * 3.4) % 2;
    if (this.phase === 1 && this.hp / this.maxHp <= .5) {
      this.phase = 2;
      this.buffSpeed *= 1.18;
      this.abilCd.slam = Math.min(this.abilCd.slam || 3, 1.5);
      game.bossPhase(this);
    }
    for (var k in this.abilCd) {
      this.abilCd[k] -= dt;
      if (this.abilCd[k] <= 0) {
        this.abilCd[k] = this.abilityInterval(k);
        game.bossAbility(this, k);
      }
    }
    if (this.d >= game.path.length) {
      this.state = 'attackBase';
      this.attackCd -= dt;
      if (this.attackCd <= 0) {
        this.attackCd = 1.6;
        game.baseHit(this.dmg, this);
      }
      return;
    }
    var blocker = this.blockerAhead(game);
    if (blocker) {
      this.state = 'attack';
      this.attackCd -= dt;
      if (this.attackCd <= 0) {
        this.attackCd = 1.1;
        blocker.takeDamage(this.dmg * 3.4, game, this);
      }
      return;
    }
    this.state = 'walk';
    this.d += this.speedNow() * (game.rageMul || 1) * dt;
    var p = game.path.posAt(this.d);
    this.x = p.x; this.y = p.y; this.angle = p.angle;
  };

  Enemy.prototype.abilityInterval = function (k) {
    var quick = this.phase === 2 ? .7 : 1;
    switch (k) {
      case 'slam': return 6.5 * quick;
      case 'shockwave': return 8 * quick;
      case 'summon': return 9 * quick;
      case 'acid': return 7 * quick;
      case 'charge': return 11 * quick;
      case 'scream': return 10 * quick;
      case 'leap': return 7 * quick;
      case 'cleave': return 6 * quick;
      case 'volley': return 5.5 * quick;
      default: return 8;
    }
  };

  Enemy.prototype.updateFull = function (dt, game) {
    if (!this.alive) { this.deadT += dt; return; }
    if (this.boss) this.updateBoss(dt, game);
    else this.update(dt, game);
  };

  ZF.Enemy = Enemy;
  ZF.Enemies = {
    create: function (def, opts) {
      var e = new Enemy(def, opts);
      e.laneOffset = U.rand(-3, 3);
      e.spriteOffset = e.laneOffset;
      return e;
    }
  };
})(window.ZF);
