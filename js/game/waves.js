/* ============================================================
   WAVE DIRECTOR — infinite scaling, composition, boss schedule
   ============================================================ */
(function (ZF) {
  'use strict';
  var U = ZF.Util;

  var MODES = {
    endless: {
      id: 'endless', name: 'ENDLESS SURVIVAL', primary: true,
      desc: 'The primary mode. Survive an infinite apocalypse. Every 10 waves births a new stage and a new boss.',
      tags: ['INFINITE', 'PRIMARY'], hp: 1, dmg: 1, speed: 1, startCredits: 420, baseHp: 1,
      rewardMul: 1, bossMul: 1, difficulty: 'STANDARD'
    },
    campaign: {
      id: 'campaign', name: 'NORMAL CAMPAIGN',
      desc: 'Structured stages with reinforcement drops between waves. Slightly more forgiving, same infinite length.',
      tags: ['STORY', 'SUPPLY DROPS'], hp: 0.94, dmg: 0.92, speed: 1, startCredits: 500, baseHp: 1.1,
      rewardMul: 1.06, bossMul: 0.95, difficulty: 'ACCESSIBLE'
    },
    hardcore: {
      id: 'hardcore', name: 'HARDCORE SURVIVAL',
      desc: 'Weaker base, tougher horde, thinner economy. No second chances — one run, one save slot.',
      tags: ['BRUTAL', 'ONE LIFE'], hp: 1.3, dmg: 1.35, speed: 1.06, startCredits: 340, baseHp: 0.7,
      rewardMul: 0.92, bossMul: 1.25, difficulty: 'EXTREME'
    },
    challenge: {
      id: 'challenge', name: 'CHALLENGE MODE',
      desc: 'Randomized war modifiers are applied to every run. Adapt or die. Score and research still count.',
      tags: ['RANDOM MUTATORS', 'SCORE'], hp: 1.12, dmg: 1.12, speed: 1.02, startCredits: 400, baseHp: 0.9,
      rewardMul: 1.12, bossMul: 1.1, difficulty: 'VARIABLE'
    }
  };

  var CHALLENGE_MODS = [
    { id: 'frenzy', name: 'FRENZY', desc: 'Zombies move 15% faster.', fx: { speed: 1.15 } },
    { id: 'plated', name: 'PLATED HORDE', desc: 'All zombies gain +2 armor.', fx: { armor: 2 } },
    { id: 'horde', name: 'ENDLESS HORDE', desc: 'Zombies spawn 25% more numerous.', fx: { count: 1.25 } },
    { id: 'famine', name: 'FAMINE', desc: 'Kills give 20% fewer credits.', fx: { income: 0.8 } },
    { id: 'tough', name: 'HARDENED', desc: 'Zombies have 20% more health.', fx: { hp: 1.2 } },
    { id: 'rich', name: 'WAR PROFITEER', desc: 'Start with +250 credits, but enemies +10% damage.', fx: { credits: 250, dmg: 1.1 } },
    { id: 'swarm', name: 'SWARM TACTICS', desc: 'Many more small zombies spawn.', fx: { swarm: true } }
  ];

  var POOL = [
    { id: 'walker', min: 1, w: 12 },
    { id: 'runner', min: 2, w: 9 },
    { id: 'crawler', min: 3, w: 6 },
    { id: 'armored', min: 4, w: 7 },
    { id: 'mutant', min: 6, w: 6 },
    { id: 'exploder', min: 5, w: 5 },
    { id: 'toxic', min: 7, w: 5 },
    { id: 'screamer', min: 8, w: 3 },
    { id: 'regenerator', min: 9, w: 4 },
    { id: 'shielded', min: 11, w: 4 },
    { id: 'leaper', min: 12, w: 4 },
    { id: 'invisible', min: 13, w: 3 },
    { id: 'giant', min: 14, w: 2.4 },
    { id: 'parasite', min: 15, w: 3 },
    { id: 'fire', min: 16, w: 3.4 },
    { id: 'ice', min: 17, w: 3.4 },
    { id: 'swarm', min: 18, w: 4 },
    { id: 'brute', min: 21, w: 2.8 },
    { id: 'alpha', min: 24, w: 1.6 },
    { id: 'biohazard', min: 27, w: 1.4 },
    { id: 'experiment', min: 29, w: 1.3 },
    { id: 'plague_carrier', min: 31, w: 1.2 },
    { id: 'berserker', min: 33, w: 1.4 }
  ];

  function stageOf(wave) { return Math.floor((wave - 1) / 10) + 1; }
  function isBossWave(wave) { return wave % 10 === 0; }

  function scaling(wave, mode, mapMods, challengeFx) {
    var m = MODES[mode] || MODES.endless;
    var mm = mapMods || {};
    var cf = challengeFx || {};
    var s = stageOf(wave);
    var hp = (1 + (wave - 1) * 0.155 + Math.pow(wave, 1.62) * 0.0035);
    var dmg = (1 + (wave - 1) * 0.055 + Math.pow(wave, 1.25) * 0.0016);
    var speed = Math.min(1.7, 1 + (wave - 1) * 0.0085 + (s - 1) * 0.014);
    return {
      hp: hp * m.hp * (mm.enemyHp || 1) * (cf.hp || 1),
      dmg: dmg * m.dmg * (mm.enemyDmg || 1) * (cf.dmg || 1),
      speed: speed * m.speed * (mm.enemySpeed || 1) * (cf.speed || 1),
      armor: (mm.enemyArmor || 0) + (cf.armor || 0) + Math.floor((wave - 1) / 14),
      reward: (mm.creditsMul || 1) * m.rewardMul,
      scrapMul: (mm.scrapMul || 1) * (cf.scrap || 1),
      count: (mm.count || 1) * (cf.count || 1)
    };
  }

  function poolFor(wave) {
    return POOL.filter(function (p) { return p.min <= wave; });
  }

  function pickType(wave, rnd, biasSwarm) {
    var pool = poolFor(wave), total = 0, i;
    for (i = 0; i < pool.length; i++) total += pool[i].w * (biasSwarm && pool[i].id === 'swarm' ? 4 : 1);
    var r = rnd() * total;
    for (i = 0; i < pool.length; i++) {
      var wgt = pool[i].w * (biasSwarm && pool[i].id === 'swarm' ? 4 : 1);
      if (r < wgt) return pool[i].id;
      r -= wgt;
    }
    return 'walker';
  }

  function compose(wave, mode, mapMods, challengeFx) {
    var m = MODES[mode] || MODES.endless;
    var sc = scaling(wave, mode, mapMods, challengeFx);
    var boss = isBossWave(wave);
    var rnd = U.mulberry(wave * 7919 + 13 + (mode ? mode.length * 31 : 0));
    var count = Math.round((5 + wave * 1.12) * sc.count * (boss ? 0.45 : 1));
    count = Math.min(count, 58); // hard perf cap per wave
    var groups = [];
    var groupCount = Math.min(7, 2 + Math.floor(wave / 4) + (boss ? 0 : 1));
    var remaining = count;
    for (var g = 0; g < groupCount && remaining > 0; g++) {
      var t = pickType(wave, rnd, challengeFx && challengeFx.swarm);
      var n = g === groupCount - 1 ? remaining : Math.max(1, Math.round(count / groupCount * U.rand(.65, 1.35)));
      n = Math.min(n, remaining);
      remaining -= n;
      var id = t;
      groups.push({
        type: id, count: n,
        gap: Math.max(.32, U.lerp(0.95, 0.4, Math.min(1, wave / 90))) * U.rand(.85, 1.15)
      });
    }
    var reward = {
      credits: Math.round((55 + wave * 15) * sc.reward * (boss ? 1.8 : 1)),
      scrap: Math.round((3 + wave * 0.75) * sc.scrapMul * (boss ? 2.4 : 1)),
      research: boss ? 2 + stageOf(wave) : (wave % 5 === 0 ? 1 : 0)
    };
    var bd = ZF.Data.bossFor(stageOf(wave));
    var bossData = null;
    if (boss) {
      bossData = {
        name: bd.name, title: bd.title, abilities: bd.abilities,
        hp: Math.round(7200 * bd.hpMul * (1 + (stageOf(wave) - 1) * 0.28) * m.bossMul * (mapMods && mapMods.bossMul ? mapMods.bossMul : 1)),
        dmg: Math.round(68 * bd.dmgMul * (1 + (stageOf(wave) - 1) * 0.18)),
        armor: bd.armor + Math.floor(wave / 12),
        speed: bd.speed,
        scale: bd.scale,
        stage: stageOf(wave),
        reward: {
          credits: Math.round(bd.reward * (1 + stageOf(wave) * 0.25) * sc.reward),
          scrap: Math.round((30 + stageOf(wave) * 18) * sc.scrapMul),
          research: 3 + stageOf(wave)
        }
      };
    }
    return {
      wave: wave, stage: stageOf(wave), groups: groups, count: count,
      boss: bossData, reward: reward,
      scaling: sc
    };
  }

  function nextWavePreview(wave, mode, mapMods, cf) {
    var w = compose(wave, mode, mapMods, cf);
    var names = w.groups.map(function (g) { return ZF.Data.zombieById[g.type].name; });
    return { names: names, boss: w.boss ? w.boss.name : null, count: w.count };
  }

  ZF.Data.modes = MODES;
  ZF.Data.modeList = ['endless', 'campaign', 'hardcore', 'challenge'];
  ZF.Data.challengeMods = CHALLENGE_MODS;
  ZF.Waves = {
    MODES: MODES, compose: compose, scaling: scaling,
    stageOf: stageOf, isBossWave: isBossWave, nextWavePreview: nextWavePreview,
    poolFor: poolFor
  };
})(window.ZF);
