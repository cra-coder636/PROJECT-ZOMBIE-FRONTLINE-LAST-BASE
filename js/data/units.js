/* ============================================================
   DEFENSE UNIT DATA
   ============================================================ */
(function (ZF) {
  'use strict';

  var U = ZF.Util;

  /* helper for upgrade entries:
     c = cost, d = damage mult, r = fire-rate mult, g = range add,
     s = splash add, p = penetration add, cr = crit add, h = extra hits,
     slow = slow amount, burn = burn dps, chain = chain count, n = name, x = description */
  function up(c, d, r, g, n, x, extra) {
    var o = { c: c, d: d || 1, r: r || 1, g: g || 0, n: n, x: x };
    if (extra) for (var k in extra) o[k] = extra[k];
    return o;
  }

  var UNITS = [
    /* ---------------- INFANTRY ---------------- */
    {
      id: 'rifleman', name: 'RIFLEMAN', cat: 'infantry', cost: 100, hp: 90,
      dmg: 9, rate: 1.25, range: 120, proj: 'bullet', speed: 520, pen: 0, crit: 0.03,
      targetMode: 'first', role: 'Standard infantry. Cheap, reliable single-target damage.',
      desc: 'Trained rifle infantry. Good all-round opening pick.',
      ups: [
        up(90, 1.35, 1.18, 5, 'RAPID FIRE', 'Faster trigger discipline.'),
        up(180, 1.3, 1.2, 6, 'AP ROUNDS', 'Armor piercing ammunition.', { p: 3 }),
        up(340, 1.45, 1.15, 8, 'ELITE TRAINING', 'Veteran squad, higher crit.', { cr: .07 })
      ]
    },
    {
      id: 'assault', name: 'ASSAULT TROOPER', cat: 'infantry', cost: 150, hp: 100,
      dmg: 6, rate: 2.4, range: 104, proj: 'bullet', speed: 560, pen: 0, crit: 0.02,
      targetMode: 'first', role: 'High rate of fire. Melts unarmored swarms up close.',
      desc: 'Close-quarters burst fire specialist.',
      ups: [
        up(130, 1.3, 1.25, 4, 'BURST MODE', 'Refined trigger group.'),
        up(240, 1.35, 1.15, 6, 'HOLLOW POINT', 'Flesh-shredding rounds.', { cr: .05 }),
        up(420, 1.4, 1.2, 8, 'DRUM MAG', 'Sustained suppression.', { p: 2 })
      ]
    },
    {
      id: 'heavy', name: 'HEAVY GUNNER', cat: 'infantry', cost: 230, hp: 160,
      dmg: 16, rate: 1.45, range: 132, proj: 'bullet', speed: 500, pen: 2, crit: 0.02,
      targetMode: 'strong', role: 'Heavy caliber. Prioritizes the toughest target.',
      desc: 'Belt-fed heavy gunner. Punches through light armor.',
      ups: [
        up(200, 1.35, 1.1, 6, 'SUPPRESSION', 'Bullets slow enemies.', { slow: .14 }),
        up(360, 1.4, 1.15, 8, 'AP BELTS', 'Hardened penetrators.', { p: 4 }),
        up(620, 1.55, 1.1, 10, 'HEADHUNTER', 'Aim for vital organs.', { cr: .1 })
      ]
    },
    {
      id: 'sniper', name: 'SNIPER', cat: 'infantry', cost: 280, hp: 80,
      dmg: 58, rate: 0.42, range: 275, proj: 'tracer', speed: 1400, pen: 8, crit: 0.25,
      targetMode: 'strong', role: 'Extreme range. Deletes armored and elite targets.',
      desc: 'Long-range marksman. Ignores most armor.',
      ups: [
        up(260, 1.35, 1.12, 12, 'MATCH GRADE', 'Precision barrel work.'),
        up(460, 1.4, 1.15, 14, 'ARMOR PIERCE', 'Anti-materiel ammunition.', { p: 12, cr: .05 }),
        up(820, 1.6, 1.2, 18, 'OVERWATCH', 'Targets weakest enemies at low HP.', { exec: .25 })
      ]
    },
    {
      id: 'shotgun', name: 'SHOTGUNNER', cat: 'infantry', cost: 180, hp: 120,
      dmg: 6, rate: 1.05, range: 82, proj: 'pellet', speed: 480, hits: 5, spread: .4,
      pen: 0, crit: 0.06, targetMode: 'close', role: 'Devastating at point-blank. Pellet spread.',
      desc: 'Five pellets per shot. Shreds clustered walkers.',
      ups: [
        up(150, 1.3, 1.15, 5, 'SAWED OFF', 'Tighter spread, brutal damage.', { hits: 2 }),
        up(300, 1.35, 1.2, 6, 'FLECHETTE', 'Armor-shredding flechettes.', { p: 3, hits: 1 }),
        up(520, 1.4, 1.25, 8, 'AUTO LOADER', 'Faster cycling.', { hits: 2 })
      ]
    },
    {
      id: 'flamer', name: 'FLAMETHROWER', cat: 'infantry', cost: 220, hp: 140,
      dmg: 3.4, rate: 7, range: 76, proj: 'flame', speed: 300, hits: 3,
      pen: 0, crit: 0, burn: 6, targetMode: 'close',
      role: 'Short-range area burn. Excellent vs swarms.',
      desc: 'Cone of fire that ignites everything in range.',
      ups: [
        up(210, 1.35, 1, 6, 'PRESSURIZED', 'Hotter, longer flame.', { burn: 6 }),
        up(400, 1.3, 1.15, 8, 'NAPALM', 'Fire sticks and spreads.', { splash: 14, burn: 8 }),
        up(680, 1.5, 1.1, 10, 'THERMITE', 'Melts armor plating.', { p: 6, burn: 10 })
      ]
    },
    {
      id: 'rocket', name: 'ROCKET LAUNCHER', cat: 'infantry', cost: 320, hp: 110,
      dmg: 48, rate: 0.48, range: 178, proj: 'rocket', speed: 300, splash: 30,
      pen: 5, crit: 0.05, targetMode: 'strong', role: 'Anti-armor splash. Slow reload.',
      desc: 'Guided rockets with explosive payload.',
      ups: [
        up(300, 1.35, 1.1, 8, 'HE WARHEAD', 'Bigger blast radius.', { splash: 12 }),
        up(520, 1.4, 1.12, 10, 'TANDEM CHARGE', 'Defeats heavy armor.', { p: 8, splash: 6 }),
        up(900, 1.5, 1.2, 14, 'CLUSTER', 'Fragments hit additional targets.', { hits: 2, splash: 10 })
      ]
    },
    {
      id: 'grenadier', name: 'GRENADIER', cat: 'infantry', cost: 290, hp: 120,
      dmg: 24, rate: 0.72, range: 168, proj: 'grenade', speed: 260, splash: 36,
      pen: 3, crit: 0.02, targetMode: 'first', role: 'Arcing area damage. Great vs crowds.',
      desc: 'Lobs fragmentation grenades over cover.',
      ups: [
        up(260, 1.3, 1.1, 8, 'FRAG PACK', 'More shrapnel.', { splash: 10 }),
        up(460, 1.35, 1.15, 10, 'INCENDIARY', 'Burning shrapnel.', { burn: 5, splash: 6 }),
        up(780, 1.5, 1.2, 12, 'AIRBURST', 'Wider lethal radius.', { splash: 16, p: 4 })
      ]
    },
    {
      id: 'minigun', name: 'MINIGUN OP', cat: 'infantry', cost: 420, hp: 170, unlockWave: 8,
      dmg: 5.5, rate: 7.5, range: 126, proj: 'bullet', speed: 620, spinup: true,
      pen: 1, crit: 0.02, targetMode: 'first', role: 'Spins up to a wall of lead. Needs ramp time.',
      desc: 'Sustained fire monster once spun up.',
      ups: [
        up(380, 1.3, 1.15, 6, 'FEED SYSTEM', 'Faster spin-up and fire rate.', { spin: .4 }),
        up(620, 1.35, 1.1, 8, 'AP DRUMS', 'Larger caliber.', { p: 4 }),
        up(1000, 1.45, 1.2, 10, 'TITANIUM BARRELS', 'No heat penalties.', { cr: .05 })
      ]
    },
    {
      id: 'medic', name: 'FIELD MEDIC', cat: 'infantry', cost: 170, hp: 100, support: true,
      dmg: 0, rate: 0, range: 86, targetMode: 'support',
      aura: { radius: 86, rate: 0.12, repair: 2.5 },
      role: 'Support: repairs nearby defenses and boosts their fire rate.',
      desc: 'Keeps the line alive. No direct damage.',
      ups: [
        up(150, 1, 1, 10, 'TRAUMA KIT', 'Wider support radius.', { auraR: 16, repair: 1.5 }),
        up(280, 1, 1, 14, 'COMBAT STIMS', 'Stronger fire-rate boost.', { auraRate: .07 }),
        up(480, 1, 1, 20, 'FIELD HOSPITAL', 'Rapid structural repair.', { repair: 4, auraR: 20 })
      ]
    },

    /* ---------------- STRUCTURES ---------------- */
    {
      id: 'mg_turret', name: 'MG TURRET', cat: 'structure', cost: 140, hp: 220,
      dmg: 7.5, rate: 2.3, range: 132, proj: 'bullet', speed: 540,
      pen: 1, crit: 0.03, targetMode: 'first',
      role: 'Automated machine gun. Cheap sustained fire.',
      desc: 'Reliable automated suppression platform.',
      ups: [
        up(130, 1.3, 1.2, 6, 'COOLING JACKET', 'Higher cyclic rate.'),
        up(250, 1.35, 1.15, 8, 'DUAL FEED', 'Armor piercing belts.', { p: 3 }),
        up(430, 1.4, 1.2, 10, 'TARGETING SYS', 'Improved tracking.', { cr: .06 })
      ]
    },
    {
      id: 'sniper_tower', name: 'SNIPER TOWER', cat: 'structure', cost: 340, hp: 260,
      dmg: 64, rate: 0.5, range: 310, proj: 'tracer', speed: 1600, pen: 9, crit: 0.2,
      targetMode: 'strong', role: 'Map-wide overwatch. Kills elites before they arrive.',
      desc: 'Elevated marksman nest with heavy optics.',
      ups: [
        up(300, 1.35, 1.1, 14, 'RANGEFINDER', 'Extended optics.'),
        up(520, 1.4, 1.15, 16, 'HEAVY ROUND', 'Devastating single shots.', { cr: .06, p: 4 }),
        up(880, 1.55, 1.15, 20, 'KILL ZONE', 'Bonus damage to distant targets.', { p: 8, cr: .1 })
      ]
    },
    {
      id: 'heavy_cannon', name: 'HEAVY CANNON', cat: 'structure', cost: 360, hp: 380,
      dmg: 42, rate: 0.58, range: 195, proj: 'shell', speed: 420, splash: 30,
      pen: 6, crit: 0.03, targetMode: 'strong',
      role: 'Slow, hard-hitting artillery with splash.',
      desc: 'Anti-vehicle cannon repurposed for undead.',
      ups: [
        up(320, 1.35, 1.1, 8, 'HE SHELLS', 'Larger explosive charge.', { splash: 10 }),
        up(560, 1.4, 1.12, 10, 'SABOT', 'Extreme armor penetration.', { p: 10 }),
        up(940, 1.55, 1.15, 12, 'SIEGE MODE', 'Massive damage, wider blast.', { splash: 18, p: 6 })
      ]
    },
    {
      id: 'missile', name: 'MISSILE BATTERY', cat: 'structure', cost: 460, hp: 300, unlockWave: 12,
      dmg: 58, rate: 0.42, range: 230, proj: 'missile', speed: 340, splash: 42, homing: true,
      pen: 8, crit: 0.04, targetMode: 'strong',
      role: 'Homing rockets. Excellent against fast and elite targets.',
      desc: 'Lock-on missile pod with heavy warheads.',
      ups: [
        up(400, 1.35, 1.1, 10, 'CLUSTER POD', 'Additional splash.', { splash: 12 }),
        up(700, 1.4, 1.15, 12, 'FAST LOCK', 'Quicker reload cycle.'),
        up(1200, 1.55, 1.2, 16, 'SATURATION', 'Fires two missiles.', { hits: 2, splash: 8 })
      ]
    },
    {
      id: 'mortar', name: 'MORTAR', cat: 'structure', cost: 320, hp: 260,
      dmg: 34, rate: 0.5, range: 245, minRange: 70, proj: 'mortar', speed: 240, splash: 44,
      pen: 2, crit: 0.02, targetMode: 'first', arc: true,
      role: 'Indirect fire. Huge splash, cannot hit nearby enemies.',
      desc: 'Lobs shells over the battlefield into packed hordes.',
      ups: [
        up(280, 1.3, 1.1, 10, 'BIGGER TUBE', 'Heavier shells.', { splash: 12 }),
        up(480, 1.35, 1.15, 12, 'CLUSTER SHELL', 'Secondary detonations.', { hits: 2, splash: 6 }),
        up(820, 1.45, 1.15, 16, 'WHITEPHOSPHORUS', 'Burning impact zone.', { burn: 8, splash: 16 })
      ]
    },
    {
      id: 'flame_turret', name: 'FLAME TURRET', cat: 'structure', cost: 300, hp: 300,
      dmg: 4.5, rate: 7, range: 92, proj: 'flame', speed: 280, hits: 3, burn: 8,
      pen: 2, crit: 0, targetMode: 'close',
      role: 'Area denial. Burns everything that gets close.',
      desc: 'Pressurized fuel turret with a wide burn cone.',
      ups: [
        up(260, 1.35, 1, 8, 'FUEL MIX', 'Hotter sustained flame.', { burn: 8 }),
        up(440, 1.3, 1.15, 10, 'WIDE NOZZLE', 'Wider cone of fire.', { splash: 14 }),
        up(740, 1.5, 1.1, 12, 'PLASMA FUEL', 'Ignores armor while burning.', { p: 8, burn: 12 })
      ]
    },
    {
      id: 'tesla', name: 'TESLA TOWER', cat: 'structure', cost: 400, hp: 280, unlockWave: 5,
      dmg: 18, rate: 0.85, range: 120, proj: 'tesla', chain: 3, chainFall: .72,
      pen: 6, crit: 0.02, targetMode: 'first',
      role: 'Chain lightning. Great against tightly packed enemies.',
      desc: 'Arc discharge tower that leaps between targets.',
      ups: [
        up(360, 1.35, 1.1, 8, 'CAPACITORS', 'More arcs per discharge.', { chain: 2 }),
        up(600, 1.4, 1.15, 10, 'OVERCHARGE', 'Stronger arcs, less falloff.', { chainFall: .12, p: 4 }),
        up(1000, 1.5, 1.2, 12, 'STORM CORE', 'Massive chain radius.', { chain: 3 })
      ]
    },
    {
      id: 'laser', name: 'LASER TURRET', cat: 'structure', cost: 480, hp: 260, unlockWave: 15,
      dmg: 13, rate: 4.5, range: 175, proj: 'beam', pen: 9, crit: 0.05,
      targetMode: 'first', role: 'Hitscan beam. Ignores armor, melts single targets.',
      desc: 'Focused energy weapon with pinpoint accuracy.',
      ups: [
        up(420, 1.35, 1.15, 8, 'FOCUS LENS', 'Tighter, hotter beam.'),
        up(700, 1.4, 1.15, 10, 'PENETRATOR', 'Beam pierces a second target.', { hits: 1, p: 6 }),
        up(1200, 1.55, 1.2, 14, 'OVERLOAD', 'Cuts through anything.', { p: 12, cr: .08 })
      ]
    },
    {
      id: 'sentry', name: 'AUTOMATED SENTRY', cat: 'structure', cost: 260, hp: 240,
      dmg: 9, rate: 2.6, range: 148, proj: 'bullet', speed: 580, pen: 2, crit: 0.04,
      targetMode: 'close', role: 'Fast-tracking sentry. Prioritizes closest threats.',
      desc: 'Deployable AI sentry gun on a tripod.',
      ups: [
        up(240, 1.3, 1.2, 6, 'SERVO UPGRADE', 'Faster target acquisition.'),
        up(420, 1.35, 1.15, 8, 'DUAL SENTRY', 'Two barrels, more lead.', { hits: 1, p: 2 }),
        up(700, 1.45, 1.2, 12, 'PREDICTIVE AI', 'Leads targets perfectly.', { cr: .08 })
      ]
    },

    /* ---------------- INSTALLATIONS ---------------- */
    {
      id: 'barricade', name: 'BARRICADE', cat: 'special', cost: 70, hp: 300, armor: 2,
      dmg: 0, rate: 0, range: 0, taunt: 58, targetMode: 'none', support: true, onPath: true, blocker: true,
      role: 'Stalls zombies. They stop to tear it down instead of reaching the base.',
      desc: 'Sandbag wall that draws zombie aggression.',
      ups: [
        up(60, 1, 1, 0, 'REINFORCED SANDBAGS', 'Much tougher.', { hp: 240 }),
        up(120, 1, 1, 0, 'RAZOR WIRE', 'Damages attackers.', { thorns: 6 }),
        up(240, 1, 1, 0, 'CONCRETE CORE', 'Massive HP and wider taunt.', { hp: 500, taunt: 20 })
      ]
    },
    {
      id: 'concrete_wall', name: 'REINFORCED WALL', cat: 'special', cost: 150, hp: 900, armor: 5,
      dmg: 0, rate: 0, range: 0, taunt: 62, targetMode: 'none', support: true, onPath: true, blocker: true,
      role: 'Heavy blocker. Absorbs enormous punishment.',
      desc: 'Poured concrete barrier with rebar reinforcement.',
      ups: [
        up(130, 1, 1, 0, 'STEEL PLATING', 'Armored face.', { hp: 700, armor: 3 }),
        up(240, 1, 1, 0, 'SPIKED FACE', 'Hurts anything attacking it.', { thorns: 12 }),
        up(420, 1, 1, 0, 'BUNKER WALL', 'Virtually indestructible.', { hp: 1400, taunt: 24 })
      ]
    },
    {
      id: 'mine', name: 'LAND MINE', cat: 'special', cost: 80, hp: 30, onPath: true, trap: true,
      dmg: 110, rate: 0, range: 16, splash: 30, pen: 6, trigger: 'proximity', buildable: true,
      role: 'Place directly on the path. Detonates under the first zombie to step on it.',
      desc: 'Single-use proximity mine. Cheap crowd damage.',
      ups: [
        up(70, 1.35, 1, 4, 'MORE C4', 'Bigger blast.', { splash: 8 }),
        up(140, 1.4, 1, 6, 'ANTI-ARMOR', 'Shaped charge.', { p: 8, splash: 6 }),
        up(260, 1.55, 1, 8, 'TRIPLE CHARGE', 'Blast radius and damage up.', { splash: 18, p: 6 })
      ]
    },
    {
      id: 'explosive_trap', name: 'EXPLOSIVE TRAP', cat: 'special', cost: 170, hp: 40, onPath: true, trap: true,
      dmg: 240, rate: 0, range: 18, splash: 48, pen: 8, trigger: 'proximity', stun: .8,
      role: 'Powerful path trap. Stuns survivors of the blast.',
      desc: 'Improvised fuel-air charge buried in the road.',
      ups: [
        up(140, 1.35, 1, 4, 'FUEL AIR', 'Massive blast.', { splash: 12 }),
        up(260, 1.4, 1, 6, 'SHRAPNEL', 'Wider damage and armor pierce.', { p: 8, splash: 10 }),
        up(480, 1.55, 1, 10, 'THERMOBARIC', 'Obliterates hordes.', { splash: 22, stun: .6 })
      ]
    },
    {
      id: 'watchtower', name: 'WATCHTOWER', cat: 'special', cost: 220, hp: 200, support: true,
      dmg: 0, rate: 0, range: 0, targetMode: 'support',
      aura: { radius: 110, range: 0.12, reveal: true },
      role: 'Support: extends the range of nearby defenses and reveals stealth.',
      desc: 'Observation post with optics and radio.',
      ups: [
        up(180, 1, 1, 0, 'RANGE FINDERS', 'Larger support radius.', { auraR: 30, auraRange: .04 }),
        up(320, 1, 1, 0, 'SPOTTERS', 'Extends range further.', { auraRange: .06 }),
        up(560, 1, 1, 0, 'COMMAND POST', 'Also boosts fire rate slightly.', { auraRate: .08, auraR: 20 })
      ]
    },
    {
      id: 'radar', name: 'RADAR STATION', cat: 'special', cost: 280, hp: 240, support: true,
      dmg: 0, rate: 0, range: 0, targetMode: 'support',
      aura: { radius: 150, range: 0.1, income: 0.06 },
      role: 'Support: long-range targeting assist and bonus kill income.',
      desc: 'Early-warning radar synchronized with base logistics.',
      ups: [
        up(240, 1, 1, 0, 'SIGNAL BOOST', 'Wider aura and income.', { auraR: 30, income: .05 }),
        up(420, 1, 1, 0, 'FIRE CONTROL', 'Adds fire-rate coordination.', { auraRate: .07, auraR: 20 }),
        up(700, 1, 1, 0, 'COMMAND NET', 'Massive radius and income.', { auraR: 50, income: .1, auraRange: .04 })
      ]
    },
    {
      id: 'ammo', name: 'AMMO DEPOT', cat: 'special', cost: 320, hp: 280, support: true,
      dmg: 0, rate: 0, range: 0, targetMode: 'support',
      aura: { radius: 120, dmg: 0.18 },
      role: 'Support: nearby defenses deal 18% more damage.',
      desc: 'Stockpiled munitions keep the guns hot.',
      ups: [
        up(280, 1, 1, 0, 'CRATES ON CRATES', 'Larger stockpile radius.', { auraR: 30, auraDmg: .04 }),
        up(480, 1, 1, 0, 'PREMIUM AMMO', 'Damage bonus up.', { auraDmg: .07 }),
        up(820, 1, 1, 0, 'LOGISTICS HUB', 'Huge damage buff, wider aura.', { auraDmg: .1, auraR: 40 })
      ]
    },
    {
      id: 'repair', name: 'REPAIR STATION', cat: 'special', cost: 240, hp: 300, support: true,
      dmg: 0, rate: 0, range: 0, targetMode: 'support',
      aura: { radius: 130, repair: 7 },
      role: 'Support: continuously repairs damaged defenses in range.',
      desc: 'Engineering crew with welding rigs and spare parts.',
      ups: [
        up(200, 1, 1, 0, 'MORE CREWS', 'Faster repairs, wider range.', { repair: 6, auraR: 25 }),
        up(360, 1, 1, 0, 'AUTO WELDERS', 'Repair rate doubled.', { repair: 10 }),
        up(640, 1, 1, 0, 'NANO SEALANT', 'Near-instant structural repair.', { repair: 20, auraR: 40 })
      ]
    }
  ];

  var byId = {};
  UNITS.forEach(function (u) {
    u.base = {
      dmg: u.dmg, rate: u.rate, range: u.range, hp: u.hp, splash: u.splash || 0,
      pen: u.pen || 0, crit: u.crit || 0, hits: u.hits || 1, burn: u.burn || 0,
      chain: u.chain || 0, chainFall: u.chainFall || .8, thorns: u.thorns || 0,
      taunt: u.taunt || 0, armor: u.armor || 0
    };
    u.dps = u.dmg ? Math.round(u.dmg * (u.hits || 1) * u.rate) : 0;
    byId[u.id] = u;
  });

  ZF.Data = ZF.Data || {};
  ZF.Data.units = UNITS;
  ZF.Data.unitById = byId;
})(window.ZF);
