/* ============================================================
   PERMANENT RESEARCH + ACHIEVEMENTS
   ============================================================ */
(function (ZF) {
  'use strict';

  var RESEARCH = [
    { id: 'weapon_training', name: 'WEAPON TRAINING', icon: '\u2694', max: 5, cost: function (l) { return 3 + l * 2; }, desc: '+4% damage for all defenses per level.', fx: function (l) { return { dmg: l * 0.04 }; } },
    { id: 'rapid_drills', name: 'RAPID DRILLS', icon: '\u26A1', max: 5, cost: function (l) { return 3 + l * 2; }, desc: '+3% fire rate for all defenses per level.', fx: function (l) { return { rate: l * 0.03 }; } },
    { id: 'optics', name: 'OPTICS PROGRAM', icon: '\u25CE', max: 5, cost: function (l) { return 4 + l * 2; }, desc: '+3% attack range per level.', fx: function (l) { return { range: l * 0.03 }; } },
    { id: 'fortification', name: 'FORTIFICATION', icon: '\u25A3', max: 5, cost: function (l) { return 4 + l * 2; }, desc: '+10% base integrity per level.', fx: function (l) { return { baseHp: l * 0.10 }; } },
    { id: 'logistics', name: 'LOGISTICS', icon: '\u2699', max: 5, cost: function (l) { return 4 + l * 3; }, desc: '-3% defense build cost per level.', fx: function (l) { return { cost: l * 0.03 }; } },
    { id: 'scavenging', name: 'SCAVENGING', icon: '\u26CF', max: 5, cost: function (l) { return 3 + l * 2; }, desc: '+6% credits and scrap from kills per level.', fx: function (l) { return { income: l * 0.06 }; } },
    { id: 'engineering', name: 'ENGINEERING', icon: '\u2692', max: 4, cost: function (l) { return 5 + l * 3; }, desc: '+12% HP for all structures per level.', fx: function (l) { return { structHp: l * 0.12 }; } },
    { id: 'marksmanship', name: 'MARKSMANSHIP', icon: '\u2609', max: 4, cost: function (l) { return 5 + l * 3; }, desc: '+2% critical chance and +8% crit damage per level.', fx: function (l) { return { crit: l * 0.02, critDmg: l * 0.08 }; } },
    { id: 'salvage', name: 'SALVAGE YIELD', icon: '\u2692', max: 3, cost: function (l) { return 6 + l * 4; }, desc: '+10% scrap from every kill per level.', fx: function (l) { return { scrap: l * 0.10 }; } },
    { id: 'command', name: 'COMMAND NETWORK', icon: '\u2731', max: 3, cost: function (l) { return 8 + l * 5; }, desc: 'Wave clear rewards +12% per level.', fx: function (l) { return { waveBonus: l * 0.12 }; } }
  ];

  var byId = {};
  RESEARCH.forEach(function (r) { byId[r.id] = r; });

  var ACHIEVEMENTS = [
    { id: 'first_blood', name: 'FIRST BLOOD', desc: 'Kill your first zombie.', rp: 1 },
    { id: 'wave_5', name: 'HOLDING THE LINE', desc: 'Survive 5 waves.', rp: 2 },
    { id: 'wave_10', name: 'STAGE ONE CLEAR', desc: 'Defeat the first stage boss.', rp: 4 },
    { id: 'wave_20', name: 'VETERAN COMMANDER', desc: 'Reach wave 20.', rp: 6 },
    { id: 'wave_30', name: 'LAST BASE STANDS', desc: 'Reach wave 30.', rp: 8 },
    { id: 'wave_50', name: 'APOCALYPSE SURVIVOR', desc: 'Reach wave 50.', rp: 12 },
    { id: 'kills_250', name: 'EXTERMINATOR', desc: 'Kill 250 zombies in one run.', rp: 3 },
    { id: 'kills_1000', name: 'CLEAN SWEEP', desc: 'Kill 1000 zombies in one run.', rp: 8 },
    { id: 'boss_3', name: 'TITAN SLAYER', desc: 'Defeat 3 stage bosses in one run.', rp: 6 },
    { id: 'builder', name: 'FORTIFY', desc: 'Deploy 20 defenses in one run.', rp: 2 },
    { id: 'rich', name: 'WAR CHEST', desc: 'Bank 3000 credits.', rp: 3 },
    { id: 'maxed', name: 'FULLY OPERATIONAL', desc: 'Upgrade a defense to max level.', rp: 2 }
  ];

  ZF.Data = ZF.Data || {};
  ZF.Data.research = RESEARCH;
  ZF.Data.researchById = byId;
  ZF.Data.achievements = ACHIEVEMENTS;
})(window.ZF);
