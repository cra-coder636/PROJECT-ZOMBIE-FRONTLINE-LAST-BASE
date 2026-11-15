/* ============================================================
   ZOMBIE ENEMY + BOSS DATA
   ============================================================ */
(function (ZF) {
  'use strict';
  var U = ZF.Util;

  var ZOMBIES = [
    {
      id: 'walker', name: 'WALKER', tier: 'basic',
      hp: 42, speed: 25, dmg: 6, armor: 0, reward: 9, scrap: 1, r: 7, scale: 1,
      look: { skin: '#7d9a63', skin2: '#5f7a4a', cloth: '#5a4a3a', cloth2: '#3f3328', hair: '#2e2a20', eyes: ['#ff6a3a'], jaw: true }
    },
    {
      id: 'runner', name: 'RUNNER', tier: 'basic',
      hp: 27, speed: 56, dmg: 5, armor: 0, reward: 8, scrap: 1, r: 6, scale: .98,
      look: { skin: '#8a9a86', skin2: '#6c7a68', cloth: '#4a4a44', cloth2: '#333330', hair: '#201e1a', eyes: ['#ffd45a'], lean: true }
    },
    {
      id: 'crawler', name: 'CRAWLER', tier: 'basic',
      hp: 32, speed: 18, dmg: 4, armor: 0, reward: 7, scrap: 1, r: 6, scale: .9,
      look: { skin: '#87956a', skin2: '#66744f', cloth: '#4a3f30', cloth2: '#332a20', crawler: true, eyes: ['#ff4a3a'] }
    },
    {
      id: 'armored', name: 'ARMORED WALKER', tier: 'basic',
      hp: 120, speed: 21, dmg: 10, armor: 6, reward: 17, scrap: 2, r: 8, scale: 1.02,
      look: { skin: '#6d8a5a', skin2: '#54704a', cloth: '#3f4a36', cloth2: '#2c3328', armor: '#58604e', helmet: '#454d40', eyes: ['#ffb04a'] }
    },
    {
      id: 'mutant', name: 'MUTATED', tier: 'basic',
      hp: 165, speed: 30, dmg: 12, armor: 2, reward: 21, scrap: 2, r: 9, scale: 1.1,
      look: { skin: '#8a9a55', skin2: '#6a7a42', cloth: '#4a4432', cloth2: '#332f22', fat: true, spikes: '#c9c09a', eyes: ['#ffe066'], ribs: true }
    },

    {
      id: 'exploder', name: 'EXPLODER', tier: 'special', explode: { radius: 44, dmg: 55 },
      hp: 80, speed: 33, dmg: 0, armor: 0, reward: 15, scrap: 2, r: 8, scale: 1.05,
      look: { skin: '#a8b05a', skin2: '#84903f', cloth: '#4a3f2a', cloth2: '#332a1c', fat: true, glow: '#ff5a2a', eyes: ['#ff7a3a'], jaw: true }
    },
    {
      id: 'toxic', name: 'TOXIC SPITTER', tier: 'special', poison: { dps: 6, radius: 26, dur: 4 }, ranged: { range: 120, cd: 3.2, dmg: 9 },
      hp: 95, speed: 23, dmg: 8, armor: 1, reward: 17, scrap: 2, r: 8,
      look: { skin: '#7aa05a', skin2: '#5c7d40', cloth: '#37402a', cloth2: '#262d1e', glow: '#8dff5a', eyes: ['#b6ff6a'], jaw: true }
    },
    {
      id: 'screamer', name: 'SCREAMER', tier: 'special', scream: { radius: 90, speed: 1.3, rate: 1.15 },
      hp: 100, speed: 29, dmg: 6, armor: 1, reward: 19, scrap: 2, r: 8,
      look: { skin: '#c8c2ae', skin2: '#a8a28e', cloth: '#4a4438', cloth2: '#33302a', hair: '#8a8070', eyes: ['#ffffff'], jaw: true }
    },
    {
      id: 'regenerator', name: 'REGENERATOR', tier: 'special', regen: 7,
      hp: 145, speed: 22, dmg: 9, armor: 2, reward: 19, scrap: 2, r: 8,
      look: { skin: '#c88a7a', skin2: '#a86a5c', cloth: '#5a3a34', cloth2: '#3f2824', ribs: true, eyes: ['#ffd0a0'] }
    },
    {
      id: 'shielded', name: 'SHIELDED', tier: 'special', shield: { front: 0.6 },
      hp: 140, speed: 20, dmg: 10, armor: 3, reward: 21, scrap: 2, r: 8,
      look: { skin: '#8a9480', skin2: '#6a7460', cloth: '#3f4a3a', cloth2: '#2c3428', shield: '#6a7468', eyes: ['#ffb347'] }
    },
    {
      id: 'invisible', name: 'PHANTOM', tier: 'special', stealth: true,
      hp: 85, speed: 42, dmg: 8, armor: 1, reward: 22, scrap: 2, r: 7, ghost: true,
      look: { skin: '#7a9a9a', skin2: '#5c7a7a', cloth: '#3a4a4a', cloth2: '#283333', eyes: ['#8dffe0'], lean: true }
    },
    {
      id: 'leaper', name: 'LEAPER', tier: 'special', leap: { cd: 3.4, dist: 54 },
      hp: 70, speed: 45, dmg: 9, armor: 1, reward: 16, scrap: 2, r: 7,
      look: { skin: '#9a8a6a', skin2: '#7a6c50', cloth: '#4a3f30', cloth2: '#332a20', lean: true, eyes: ['#ff8a3a'] }
    },
    {
      id: 'giant', name: 'GIANT', tier: 'special', heavy: true,
      hp: 620, speed: 15, dmg: 32, armor: 4, reward: 48, scrap: 5, r: 13, scale: 1.75,
      look: { skin: '#6d7d4f', skin2: '#52613a', cloth: '#433a28', cloth2: '#2f2a1c', fat: true, spikes: '#b8b090', eyes: ['#ffd45a'], jaw: true }
    },
    {
      id: 'parasite', name: 'PARASITE', tier: 'special', split: { type: 'swarm', count: 2 },
      hp: 58, speed: 38, dmg: 6, armor: 0, reward: 15, scrap: 2, r: 6,
      look: { skin: '#c07a8a', skin2: '#9a5a6a', cloth: '#4a3040', cloth2: '#33202a', tentacles: true, glow: '#ff8ab0', eyes: ['#ffb0d0'] }
    },
    {
      id: 'fire', name: 'BURNING ONE', tier: 'special', fireTrail: true, immBurn: true,
      hp: 120, speed: 28, dmg: 11, armor: 2, reward: 19, scrap: 2, r: 8,
      look: { skin: '#5a4a42', skin2: '#3f332c', cloth: '#3a2a20', cloth2: '#261a14', glow: '#ff7a2a', eyes: ['#ffe066'], jaw: true }
    },
    {
      id: 'ice', name: 'FROZEN HUSK', tier: 'special', chill: { dur: 2.5, rate: .6 },
      hp: 135, speed: 24, dmg: 8, armor: 3, reward: 19, scrap: 2, r: 8,
      look: { skin: '#8fb6c8', skin2: '#6a94a8', cloth: '#3f5560', cloth2: '#2a3d46', crystals: '#cdf6ff', eyes: ['#bdf4ff'], armor: '#7a9aa8' }
    },
    {
      id: 'swarm', name: 'SWARMLING', tier: 'special', small: true,
      hp: 15, speed: 60, dmg: 3, armor: 0, reward: 4, scrap: 0, r: 4, scale: .68,
      look: { skin: '#8aa05a', skin2: '#6a7d42', cloth: '#4a4a30', cloth2: '#333322', eyes: ['#ffe066'], crawler: true }
    },

    {
      id: 'brute', name: 'ARMORED BRUTE', tier: 'elite',
      hp: 780, speed: 19, dmg: 36, armor: 9, reward: 62, scrap: 7, r: 12, scale: 1.5, heavy: true,
      look: { skin: '#6a7a4a', skin2: '#4f5c36', cloth: '#3a4030', cloth2: '#282d20', armor: '#4a5040', helmet: '#3a4034', fat: true, eyes: ['#ff5a3a'] }
    },
    {
      id: 'alpha', name: 'ALPHA MUTANT', tier: 'elite', regen: 12, buff: { radius: 100, speed: 1.2, dmg: 1.2 },
      hp: 1500, speed: 26, dmg: 52, armor: 7, reward: 125, scrap: 12, r: 14, scale: 1.7, heavy: true,
      look: { skin: '#a06a4a', skin2: '#7d4f36', cloth: '#4a2a20', cloth2: '#331c14', spikes: '#e0d0b0', crown: true, eyes: ['#ff7a2a'], fat: true }
    },
    {
      id: 'biohazard', name: 'BIOHAZARD MONSTER', tier: 'elite', poison: { dps: 12, radius: 34, dur: 6 }, regen: 18,
      hp: 2200, speed: 16, dmg: 60, armor: 11, reward: 190, scrap: 18, r: 15, scale: 1.9, heavy: true,
      look: { skin: '#8aa04a', skin2: '#687d33', cloth: '#2f3a22', cloth2: '#1f2716', fat: true, glow: '#c6ff4a', tentacles: true, eyes: ['#e6ff6a'] }
    },
    {
      id: 'experiment', name: 'MILITARY EXPERIMENT', tier: 'elite', ranged: { range: 150, cd: 2.4, dmg: 22 }, leap: { cd: 5, dist: 40 },
      hp: 1750, speed: 30, dmg: 46, armor: 13, reward: 175, scrap: 16, r: 14, scale: 1.65, heavy: true,
      look: { skin: '#8a9a8a', skin2: '#6a7a6a', cloth: '#3a443a', cloth2: '#283028', armor: '#5a6a5a', helmet: '#4a5a4a', spikes: '#a8b8a0', eyes: ['#7affb0'], ribs: true }
    },
    {
      id: 'plague_carrier', name: 'PLAGUE CARRIER', tier: 'elite', poison: { dps: 9, radius: 30, dur: 7 }, split: { type: 'swarm', count: 4 }, summonToxic: true,
      hp: 1400, speed: 23, dmg: 42, armor: 5, reward: 160, scrap: 15, r: 13, scale: 1.6, heavy: true,
      look: { skin: '#7a8a5a', skin2: '#5a6a3f', cloth: '#37402a', cloth2: '#242c1c', fat: true, glow: '#8dff5a', tentacles: true, eyes: ['#9affc0'] }
    },
    {
      id: 'berserker', name: 'BERSERKER', tier: 'elite', enrage: { at: .45, speed: 1.8, dmg: 1.5 },
      hp: 980, speed: 44, dmg: 40, armor: 3, reward: 120, scrap: 11, r: 11, scale: 1.35,
      look: { skin: '#a05a4a', skin2: '#7d4236', cloth: '#4a221a', cloth2: '#331610', spikes: '#d8c0a0', ribs: true, eyes: ['#ffd23a'], jaw: true }
    },

    /* --- summoned fodder variants --- */
    {
      id: 'husk', name: 'HUSK', tier: 'basic', summoned: true,
      hp: 55, speed: 34, dmg: 5, armor: 0, reward: 3, scrap: 0, r: 6,
      look: { skin: '#7a7a6a', skin2: '#5c5c4f', cloth: '#3f3a2e', cloth2: '#2a2820', eyes: ['#ffe066'], jaw: true }
    }
  ];

  var byId = {};
  ZOMBIES.forEach(function (z) { byId[z.id] = z; });

  /* ---------------- BOSSES ---------------- */
  var BOSSES = [
    { name: 'THE ABOMINATION', title: 'STAGE I', abilities: ['slam', 'summon'], hpMul: 1, dmgMul: 1, armor: 12, speed: 15, scale: 2.6, reward: 320 },
    { name: 'THE GIANT BUTCHER', title: 'STAGE II', abilities: ['charge', 'cleave'], hpMul: 1.15, dmgMul: 1.15, armor: 14, speed: 18, scale: 2.8, reward: 400 },
    { name: 'THE BIOHAZARD TITAN', title: 'STAGE III', abilities: ['acid', 'summon'], hpMul: 1.35, dmgMul: 1.3, armor: 16, speed: 14, scale: 3, reward: 480 },
    { name: 'THE UNDEAD COMMANDER', title: 'STAGE IV', abilities: ['summon', 'scream', 'volley'], hpMul: 1.55, dmgMul: 1.45, armor: 15, speed: 17, scale: 2.7, reward: 560 },
    { name: 'THE COLOSSAL MUTANT', title: 'STAGE V', abilities: ['shockwave', 'leap', 'acid'], hpMul: 1.8, dmgMul: 1.6, armor: 18, speed: 16, scale: 3.2, reward: 660 },
    { name: 'THE PLAGUE QUEEN', title: 'STAGE VI', abilities: ['summon', 'acid', 'scream'], hpMul: 2.1, dmgMul: 1.75, armor: 14, speed: 19, scale: 2.9, reward: 780 },
    { name: 'THE APOCALYPSE BEAST', title: 'STAGE VII', abilities: ['shockwave', 'charge', 'summon', 'scream'], hpMul: 2.5, dmgMul: 2, armor: 22, speed: 18, scale: 3.4, reward: 950 }
  ];
  var EXTRA_NAMES = ['THE HOLLOW KING', 'TITAN OF ROT', 'THE OMEGA STRAIN', 'NIGHTMARE SOVEREIGN', 'THE LAST HUNGER', 'GRAVE TYRANT', 'THE PALE COLOSSUS'];

  function bossFor(stage) {
    if (stage <= BOSSES.length) {
      var b = BOSSES[stage - 1];
      return {
        name: b.name, title: b.title, abilities: b.abilities, armor: b.armor, speed: b.speed,
        scale: b.scale, reward: b.reward,
        hpMul: b.hpMul, dmgMul: b.dmgMul
      };
    }
    var loop = Math.floor((stage - 1) / BOSSES.length);
    var idx = (stage - 1) % BOSSES.length;
    var base = BOSSES[idx];
    var extra = Math.floor((stage - 1) / BOSSES.length);
    return {
      name: (EXTRA_NAMES[(stage + loop) % EXTRA_NAMES.length]) + (extra > 1 ? ' ' + U.roman(extra) : ''),
      title: 'STAGE ' + U.roman(stage),
      abilities: base.abilities.concat(stage % 2 ? ['shockwave'] : ['acid']),
      armor: base.armor + stage * 0.6,
      speed: Math.min(26, base.speed + stage * 0.3),
      scale: Math.min(3.8, base.scale + extra * 0.1),
      reward: Math.round(base.reward * (1 + extra * 0.6)),
      hpMul: base.hpMul * (1 + extra * 0.5),
      dmgMul: base.dmgMul * (1 + extra * 0.35)
    };
  }

  ZF.Data = ZF.Data || {};
  ZF.Data.zombies = ZOMBIES;
  ZF.Data.zombieById = byId;
  ZF.Data.bossFor = bossFor;
})(window.ZF);
