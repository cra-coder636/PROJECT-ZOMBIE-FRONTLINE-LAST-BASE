/* ============================================================
   MAP / ENVIRONMENT DATA — 8 environments
   ============================================================ */
(function (ZF) {
  'use strict';

  var MAPS = [
    {
      id: 'abandoned_base', name: 'ABANDONED MILITARY BASE', short: 'ABANDONED BASE',
      tag: 'Destroyed barracks, burned armor, sandbags and barbed wire.',
      weather: 'rain', pathStyle: 'dirt', difficulty: 1,
      palette: {
        ground: '#3d4534', ground2: '#48513b', ground3: '#343b2c', tuft: '#5b6a42',
        path: '#6b5a3e', path2: '#7d6b4b', edge: '#463a29', wall: '#4a4a42',
        accent: '#e0a03c', car: '#5a4a3a', barrel: '#4a5a3e', tree: '#3f5a30', treeHi: '#527040',
        sandbag: '#7a6a45', tent: '#6b6a4a', building: '#3f4640', crystal: '#8ad8e0'
      },
      waypoints: [[-1, 5], [8, 5], [8, 16], [17, 16], [17, 7], [27, 7], [27, 18], [35, 18]],
      decor: [
        ['ruin', 3, 9], ['sandbag', 5, 3], ['crate', 6, 7], ['barrel', 7, 9], ['wreck', 12, 3],
        ['tank', 20, 2], ['sandbag', 14, 18], ['bones', 16, 14], ['flag', 10, 19], ['barrel_fire', 24, 5],
        ['tower_broken', 31, 3], ['barrel', 29, 20], ['crate', 33, 20], ['ruin', 35, 9], ['sandbag', 21, 11],
        ['wreck', 23, 21], ['bones', 26, 11], ['trash', 30, 15], ['lamp', 12, 12], ['rock', 4, 20],
        ['crate', 9, 20], ['bush', 34, 14], ['sandbag', 18, 9], ['trash', 15, 11]
      ],
      blocked: [[20, 1, 3, 2], [31, 2, 2, 2]],
      mods: [], modData: {}
    },
    {
      id: 'apocalypse_city', name: 'APOCALYPSE CITY', short: 'APOCALYPSE CITY',
      tag: 'Ruined skyscrapers, abandoned cars, cracked urban streets.',
      weather: 'ash', pathStyle: 'asphalt', difficulty: 2,
      palette: {
        ground: '#3a3b36', ground2: '#44453f', ground3: '#31322e', tuft: '#4d5a3a',
        path: '#3e4042', path2: '#484a4c', edge: '#26282a', wall: '#4a4a46',
        accent: '#e0a03c', car: '#5a3a34', barrel: '#4a4a3e', tree: '#3a4a30', treeHi: '#4d6038',
        sandbag: '#6b6248', tent: '#5a5a4a', building: '#3a3f42', crystal: '#8ad8e0'
      },
      waypoints: [[-1, 11], [8, 11], [8, 4], [18, 4], [18, 18], [29, 18], [29, 9], [37, 9]],
      decor: [
        ['building', 2, 3], ['ruin', 6, 7], ['car', 4, 14], ['trash', 12, 6], ['lamp', 10, 12],
        ['building', 14, 1], ['wreck', 15, 10], ['car', 21, 1], ['ruin', 20, 20], ['lamp', 26, 3],
        ['building', 32, 2], ['wreck', 34, 13], ['car', 31, 21], ['trash', 24, 21], ['car', 22, 12],
        ['bones', 26, 15], ['ruin', 35, 18], ['lamp', 30, 16], ['trash', 5, 19], ['wreck', 12, 21],
        ['building', 8, 20], ['car', 17, 7], ['trash', 33, 7], ['bones', 28, 6]
      ],
      blocked: [[2, 2, 3, 3], [14, 0, 3, 3], [32, 1, 3, 3], [8, 19, 3, 3]],
      mods: [{ label: 'CRAMPED STREETS', good: false, desc: 'Fewer open build plots between ruins.' },
             { label: 'SALVAGE +10%', good: true, desc: 'Urban scrap yields more credits.' }],
      modData: { creditsMul: 1.1, buildableBias: .92 }
    },
    {
      id: 'desert_outpost', name: 'DESERT OUTPOST', short: 'DESERT OUTPOST',
      tag: 'Sandy terrain, military tents, bunkers and blinding sandstorms.',
      weather: 'sand', pathStyle: 'sand', difficulty: 2,
      palette: {
        ground: '#8a7448', ground2: '#9a8252', ground3: '#7a643c', tuft: '#a89258',
        path: '#b09a6a', path2: '#c0aa78', edge: '#8a7448', wall: '#8a7a5a',
        accent: '#e0a03c', car: '#6b5a3a', barrel: '#6a5a3a', tree: '#6a7a42', treeHi: '#83944f',
        sandbag: '#a08a58', tent: '#9a8a62', building: '#8a7a5a', crystal: '#8ad8e0'
      },
      waypoints: [[-1, 3], [12, 3], [12, 12], [23, 12], [23, 5], [33, 5], [33, 20], [37, 20]],
      decor: [
        ['tent', 4, 6], ['tent', 7, 20], ['bunker', 16, 6], ['crate', 14, 9], ['barrel', 12, 16],
        ['tank', 27, 3], ['rock', 9, 16], ['bones', 20, 8], ['sandbag', 25, 14], ['flag', 30, 9],
        ['tent', 20, 20], ['crate', 35, 11], ['rock', 33, 16], ['barrel', 24, 18], ['bones', 17, 18],
        ['tank', 5, 12], ['rock', 30, 13], ['sandbag', 11, 7], ['bunker', 35, 3], ['rock', 2, 21]
      ],
      blocked: [[16, 5, 3, 2], [27, 2, 3, 2], [35, 2, 3, 2]],
      mods: [{ label: 'SANDSTORM', good: false, desc: 'Tower range reduced 6% during storms.' },
             { label: 'SALVAGE +10%', good: true, desc: 'Recovered military hardware sells well.' }],
      modData: { towerRange: .94, creditsMul: 1.1 }
    },
    {
      id: 'frozen_facility', name: 'FROZEN MILITARY FACILITY', short: 'FROZEN FACILITY',
      tag: 'Snow-covered bunkers, frozen armor and howling blizzards.',
      weather: 'blizzard', pathStyle: 'snow', difficulty: 3,
      palette: {
        ground: '#c4d2d8', ground2: '#d2e0e4', ground3: '#b0c0c8', tuft: '#dce8ec',
        path: '#9fb2bc', path2: '#b0c2cc', edge: '#7a8e98', wall: '#a8b8c0',
        accent: '#7fd2e6', car: '#6a7a84', barrel: '#5a6a70', tree: '#3a5a4a', treeHi: '#4a6d58',
        sandbag: '#8a9a9a', tent: '#aab8bc', building: '#8a9aa2', crystal: '#c8f6ff'
      },
      waypoints: [[-1, 19], [7, 19], [7, 6], [19, 6], [19, 15], [28, 15], [28, 4], [36, 4]],
      decor: [
        ['pine', 3, 3], ['pine', 5, 12], ['tank', 12, 3], ['bunker', 10, 14], ['snowman', 15, 19],
        ['crate', 17, 10], ['crystal', 22, 3], ['tent', 24, 19], ['pine', 26, 11], ['barrel', 21, 18],
        ['watchfire', 31, 9], ['bunker', 33, 8], ['crate', 34, 18], ['wreck', 13, 21], ['bones', 20, 13],
        ['pine', 36, 21], ['rock', 8, 9], ['sandbag', 29, 20], ['lamp', 25, 6], ['tank', 30, 12]
      ],
      blocked: [[12, 2, 3, 2], [10, 13, 3, 2], [33, 7, 3, 2], [30, 11, 3, 2]],
      mods: [{ label: 'FROSTBITE', good: false, desc: 'All defenses fire 5% slower.' },
             { label: 'SLOW HORDE', good: true, desc: 'Zombies move 8% slower in the cold.' }],
      modData: { towerRate: .95, enemySpeed: .92 }
    },
    {
      id: 'jungle_camp', name: 'JUNGLE MILITARY CAMP', short: 'JUNGLE CAMP',
      tag: 'Dense vegetation, hidden trails and a humid tropical night.',
      weather: 'rain', pathStyle: 'jungle', difficulty: 3,
      palette: {
        ground: '#2f4a2c', ground2: '#375533', ground3: '#284027', tuft: '#4d7a3a',
        path: '#5a4a32', path2: '#6b593c', edge: '#3a2f20', wall: '#4a5244',
        accent: '#d9b44a', car: '#4a4234', barrel: '#3e4a32', tree: '#2f4a2c', treeHi: '#4d7a3a',
        sandbag: '#6b6244', tent: '#5a6a44', building: '#3a4438', crystal: '#8ad8e0'
      },
      waypoints: [[-1, 21], [6, 21], [6, 13], [14, 13], [14, 20], [22, 20], [22, 8], [30, 8], [30, 16], [37, 16]],
      decor: [
        ['tree', 2, 4], ['bush', 4, 9], ['tent', 9, 4], ['pipe', 2, 16], ['tree', 11, 17],
        ['bush', 16, 4], ['ruin', 18, 11], ['tree', 12, 22], ['crate', 20, 16], ['bush', 20, 4],
        ['tree', 26, 4], ['bush', 24, 12], ['tent', 27, 18], ['tree', 33, 3], ['bush', 34, 11],
        ['bones', 32, 19], ['tree', 35, 21], ['pipe', 8, 8], ['bush', 28, 21], ['barrel', 17, 8],
        ['tree', 6, 5], ['bush', 31, 13]
      ],
      blocked: [[17, 10, 3, 2], [2, 3, 2, 2], [26, 3, 2, 2], [34, 20, 2, 2]],
      mods: [{ label: 'DENSE JUNGLE', good: false, desc: 'Zombies are harder to see in foliage.' },
             { label: 'SALVAGE +8%', good: true, desc: 'Abandoned camp supplies recovered.' }],
      modData: { creditsMul: 1.08, enemySpeed: 1.03 }
    },
    {
      id: 'industrial_complex', name: 'INDUSTRIAL COMPLEX', short: 'INDUSTRIAL COMPLEX',
      tag: 'Factories, warehouses, pipes and rusted machinery.',
      weather: 'ash', pathStyle: 'concrete', difficulty: 4,
      palette: {
        ground: '#454742', ground2: '#50524c', ground3: '#3a3c38', tuft: '#5a6048',
        path: '#5c5e58', path2: '#686a64', edge: '#3a3c38', wall: '#5a5c56',
        accent: '#d98a2a', car: '#5a4a3a', barrel: '#4a5a4a', tree: '#3a4a30', treeHi: '#4a5c3a',
        sandbag: '#6b6248', tent: '#5a5a4a', building: '#474a46', crystal: '#8ad8e0'
      },
      waypoints: [[-1, 4], [9, 4], [9, 12], [4, 12], [4, 20], [16, 20], [16, 9], [25, 9], [25, 17], [33, 17], [33, 6], [37, 6]],
      decor: [
        ['pipe', 11, 3], ['crate', 2, 7], ['barrel_fire', 6, 8], ['building', 12, 13], ['pipe', 7, 16],
        ['crane', 19, 2], ['barrel', 21, 14], ['crate', 14, 6], ['building', 26, 3], ['pipe', 28, 13],
        ['tank', 35, 12], ['trash', 23, 20], ['crate', 31, 14], ['barrel_fire', 18, 17], ['pipe', 34, 21],
        ['bunker', 2, 15], ['trash', 13, 21], ['barrel', 27, 19], ['lamp', 22, 11], ['ruin', 36, 2]
      ],
      blocked: [[12, 12, 3, 3], [26, 2, 3, 3], [35, 11, 2, 2], [2, 14, 2, 2]],
      mods: [{ label: 'HEAVY PLATING', good: false, desc: 'All zombies gain +1 armor.' },
             { label: 'CHEAP STEEL', good: true, desc: 'Defenses cost 5% less to build.' }],
      modData: { enemyArmor: 1, costMul: .95 }
    },
    {
      id: 'underground_bunker', name: 'UNDERGROUND BUNKER', short: 'UNDERGROUND BUNKER',
      tag: 'Concrete corridors, failing emergency lights, no way out.',
      weather: 'fog', pathStyle: 'metal', difficulty: 4,
      palette: {
        ground: '#2f3436', ground2: '#383d40', ground3: '#272b2d', tuft: '#3a4442',
        path: '#4a5052', path2: '#545a5c', edge: '#22282a', wall: '#4a504e',
        accent: '#e04a3a', car: '#3a4042', barrel: '#3a4442', tree: '#2f3a32', treeHi: '#3a4a3c',
        sandbag: '#4a4a40', tent: '#404640', building: '#3a4244', crystal: '#7fe0d0'
      },
      waypoints: [[-1, 11], [7, 11], [7, 4], [14, 4], [14, 17], [22, 17], [22, 7], [30, 7], [30, 14], [37, 14]],
      decor: [
        ['pipe', 2, 3], ['lamp', 5, 7], ['crate', 9, 7], ['bunker', 11, 12], ['pipe', 4, 18],
        ['crate', 17, 9], ['lamp', 19, 4], ['bones', 16, 6], ['barrel', 24, 3], ['bunker', 25, 12],
        ['pipe', 27, 20], ['trash', 20, 14], ['lamp', 33, 9], ['crate', 35, 4], ['bones', 31, 18],
        ['barrel', 8, 17], ['trash', 29, 11], ['sandbag', 12, 20]
      ],
      blocked: [[11, 11, 3, 3], [25, 11, 3, 3], [2, 2, 2, 2]],
      mods: [{ label: 'TIGHT CORRIDORS', good: true, desc: 'Towers gain +8% range in close quarters.' },
             { label: 'CLOSE QUARTERS', good: false, desc: 'Zombies move 5% faster.' }],
      modData: { towerRange: 1.08, enemySpeed: 1.05 }
    },
    {
      id: 'nightmare_zone', name: 'NIGHTMARE ZONE', short: 'NIGHTMARE ZONE',
      tag: 'A corrupted wasteland. The dead do not rest here. Extreme danger.',
      weather: 'embers', pathStyle: 'metal', difficulty: 5,
      palette: {
        ground: '#3a2428', ground2: '#472a2e', ground3: '#2f1d20', tuft: '#5a3038',
        path: '#4a2a2a', path2: '#552f2f', edge: '#2a1414', wall: '#4a3030',
        accent: '#ff4a3a', car: '#3a2020', barrel: '#4a2a20', tree: '#3a2a2a', treeHi: '#5a3a34',
        sandbag: '#4a3a30', tent: '#3f2a28', building: '#3a2426', crystal: '#ff6a8a'
      },
      waypoints: [[-1, 12], [7, 12], [7, 3], [15, 3], [15, 19], [24, 19], [24, 5], [32, 5], [32, 15], [37, 15]],
      decor: [
        ['crystal', 3, 6], ['bones', 5, 17], ['ruin', 10, 8], ['watchfire', 13, 22], ['crystal', 18, 8],
        ['wreck', 20, 12], ['bones', 23, 2], ['crystal', 27, 11], ['ruin', 29, 20], ['watchfire', 34, 3],
        ['bones', 35, 18], ['wreck', 8, 8], ['crystal', 33, 10], ['ruin', 14, 15], ['bones', 26, 16],
        ['trash', 17, 5], ['rock', 2, 22], ['watchfire', 21, 22]
      ],
      blocked: [[10, 7, 3, 2], [34, 2, 2, 2]],
      mods: [{ label: 'CORRUPTED', good: false, desc: 'Enemies have +22% health and +15% speed.' },
             { label: 'BLOOD TITHE', good: true, desc: 'Kills yield +30% credits and scrap.' }],
      modData: { enemyHp: 1.22, enemySpeed: 1.15, creditsMul: 1.3, scrapMul: 1.3, bossMul: 1.2 }
    }
  ];

  var byId = {};
  MAPS.forEach(function (m) { byId[m.id] = m; });

  ZF.Data = ZF.Data || {};
  ZF.Data.maps = MAPS;
  ZF.Data.mapsById = byId;
  ZF.Data.mapById = byId;
})(window.ZF);
