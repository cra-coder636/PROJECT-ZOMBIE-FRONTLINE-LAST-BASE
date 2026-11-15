/* ============================================================
   PATHFINDING (waypoint spline) + BUILD GRID
   ============================================================ */
(function (ZF) {
  'use strict';
  var U = ZF.Util, TILE = 16;

  function build(map) {
    var wps = map.waypoints;
    var pts = wps.map(function (w) { return { x: w[0] * TILE + TILE / 2, y: w[1] * TILE + TILE / 2, tx: w[0], ty: w[1] }; });
    var segs = [], total = 0;
    for (var i = 0; i < pts.length - 1; i++) {
      var a = pts[i], b = pts[i + 1];
      var len = Math.hypot(b.x - a.x, b.y - a.y);
      segs.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, len: len, cum: total, angle: Math.atan2(b.y - a.y, b.x - a.x) });
      total += len;
    }
    // rasterize path cells from waypoints (axis aligned L segments)
    var cells = {}, list = [];
    for (var j = 0; j < pts.length - 1; j++) {
      var p = pts[j], q = pts[j + 1];
      var x0 = Math.floor(p.x / TILE), y0 = Math.floor(p.y / TILE);
      var x1 = Math.floor(q.x / TILE), y1 = Math.floor(q.y / TILE);
      var dx = Math.sign(x1 - x0), dy = Math.sign(y1 - y0);
      var cx = x0, cy = y0;
      var guard = 0;
      while (guard++ < 400) {
        var key = cx + ',' + cy;
        if (!cells[key]) { cells[key] = 1; list.push([cx, cy]); }
        if (cx === x1 && cy === y1) break;
        if (cx !== x1) cx += dx; else if (cy !== y1) cy += dy;
      }
    }
    var path = {
      mapId: map.id,
      points: pts,
      segments: segs,
      length: total,
      cellMap: cells,
      cells: list,
      spawn: { x: pts[0].x, y: pts[0].y },
      core: { x: pts[pts.length - 1].x, y: pts[pts.length - 1].y },
      isPath: function (tx, ty) { return !!cells[tx + ',' + ty]; },
      posAt: function (d) {
        if (d <= 0) return { x: segs[0].x1, y: segs[0].y1, angle: segs[0].angle, done: false };
        if (d >= total) {
          var ls = segs[segs.length - 1];
          return { x: ls.x2, y: ls.y2, angle: ls.angle, done: true };
        }
        var lo = 0, hi = segs.length - 1, s = segs[0];
        while (lo <= hi) {
          var mid = (lo + hi) >> 1;
          var sg = segs[mid];
          if (d < sg.cum) hi = mid - 1;
          else if (d >= sg.cum + sg.len) lo = mid + 1;
          else { s = sg; break; }
        }
        var t = (d - s.cum) / s.len;
        return { x: U.lerp(s.x1, s.x2, t), y: U.lerp(s.y1, s.y2, t), angle: s.angle, done: false };
      },
      angleAt: function (d) {
        for (var i = segs.length - 1; i >= 0; i--) { if (d >= segs[i].cum) return segs[i].angle; }
        return segs[0].angle;
      }
    };
    return path;
  }

  function Grid(map, path) {
    this.w = 40; this.h = 24;
    this.path = path;
    this.blocked = new Uint8Array(this.w * this.h);
    this.towers = new Array(this.w * this.h).fill(null);
    var self = this;
    path.cells.forEach(function (c) {
      if (c[0] >= 0 && c[0] < 40 && c[1] >= 0 && c[1] < 24) self.blocked[c[1] * 40 + c[0]] = 1;
    });
    (map.blocked || []).forEach(function (r) {
      for (var y = r[1]; y < r[1] + r[3]; y++) for (var x = r[0]; x < r[0] + r[2]; x++) {
        if (x >= 0 && x < 40 && y >= 0 && y < 24) self.blocked[y * 40 + x] = 2;
      }
    });
    // border tiles are rubble
    for (var x2 = 0; x2 < 40; x2++) { this.blocked[x2] = this.blocked[x2] || 0; }
  }
  Grid.prototype.idx = function (tx, ty) { return ty * 40 + tx; };
  Grid.prototype.inBounds = function (tx, ty) { return tx >= 0 && ty >= 0 && tx < 40 && ty < 24; };
  Grid.prototype.isPath = function (tx, ty) { return this.inBounds(tx, ty) && this.blocked[ty * 40 + tx] === 1; };
  Grid.prototype.isBlocked = function (tx, ty) { return !this.inBounds(tx, ty) || this.blocked[ty * 40 + tx] > 0; };
  Grid.prototype.towerAt = function (tx, ty) { return this.inBounds(tx, ty) ? this.towers[ty * 40 + tx] : null; };
  Grid.prototype.canBuild = function (tx, ty, onPath) {
    if (!this.inBounds(tx, ty)) return false;
    var i = ty * 40 + tx;
    if (this.towers[i]) return false;
    if (onPath) return this.blocked[i] === 1;
    return this.blocked[i] === 0;
  };
  Grid.prototype.place = function (tower, tx, ty) {
    if (!this.inBounds(tx, ty)) return;
    this.towers[ty * 40 + tx] = tower;
  };
  Grid.prototype.remove = function (tx, ty) {
    if (this.inBounds(tx, ty)) this.towers[ty * 40 + tx] = null;
  };

  // distance along path of the closest point to (px,py)
  function nearestD(path, px, py) {
    var best = 0, bestD = Infinity;
    for (var i = 0; i < path.segments.length; i++) {
      var s = path.segments[i];
      var dx = s.x2 - s.x1, dy = s.y2 - s.y1;
      var l2 = dx * dx + dy * dy;
      var t = l2 ? U.clamp(((px - s.x1) * dx + (py - s.y1) * dy) / l2, 0, 1) : 0;
      var qx = s.x1 + dx * t, qy = s.y1 + dy * t;
      var dd = U.dist2(px, py, qx, qy);
      if (dd < bestD) { bestD = dd; best = s.cum + s.len * t; }
    }
    return best;
  }

  ZF.Path = { build: build, TILE: TILE, nearestD: nearestD };
  ZF.Grid = Grid;
})(window.ZF);
